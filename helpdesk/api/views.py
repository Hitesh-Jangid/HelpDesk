from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth, firestore
from .firebase_config import db
import json
import re
from datetime import datetime, timedelta
from rest_framework.pagination import PageNumberPagination

class TicketPagination(PageNumberPagination):
    page_size = 10

def serialize_firestore_doc(doc_dict):
    """Convert Firestore Timestamps to Unix timestamps for JSON serialization"""
    serialized = {}
    for key, value in doc_dict.items():
        if hasattr(value, 'timestamp'):  # Firestore Timestamp
            serialized[key] = int(value.timestamp())  # Unix timestamp in seconds
        elif isinstance(value, list):
            # Handle lists (like timeline) that might contain timestamps
            serialized[key] = [
                {k: int(v.timestamp()) if hasattr(v, 'timestamp') else v for k, v in item.items()}
                if isinstance(item, dict) else item
                for item in value
            ]
        else:
            serialized[key] = value
    return serialized

def generate_uid(role):
    """Generate unique UID based on role: U+6digits, AG+5digits, AD+3digits"""
    prefix_map = {'user': 'U', 'agent': 'AG', 'admin': 'AD'}
    digit_map = {'user': 6, 'agent': 5, 'admin': 3}
    
    prefix = prefix_map.get(role, 'U')
    digits = digit_map.get(role, 6)
    
    # Get all users with this role and find the highest number
    users_ref = db.collection('users').where('role', '==', role).stream()
    last_num = 0
    
    for user in users_ref:
        user_data = user.to_dict()
        custom_uid = user_data.get('custom_uid', '')
        if custom_uid and custom_uid.startswith(prefix):
            try:
                num = int(custom_uid.replace(prefix, ''))
                if num > last_num:
                    last_num = num
            except ValueError:
                pass
    
    new_num = last_num + 1
    return f"{prefix}{str(new_num).zfill(digits)}"

def generate_username(name, email):
    """Generate username from name: remove spaces/special chars + check uniqueness + add 2 digit number if needed"""
    # Clean name: remove spaces and special characters
    base_username = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
    
    # If empty, use email prefix
    if not base_username:
        base_username = email.split('@')[0]
        base_username = re.sub(r'[^a-zA-Z0-9]', '', base_username.lower())
    
    # Check if username exists
    username = base_username
    counter = 1
    
    while True:
        existing = db.collection('users').where('username', '==', username).limit(1).stream()
        exists = False
        for _ in existing:
            exists = True
            break
        
        if not exists:
            return username
        
        # Add 2-digit number
        username = f"{base_username}{str(counter).zfill(2)}"
        counter += 1
        
        if counter > 99:
            # Fallback: add random suffix
            import random
            username = f"{base_username}{random.randint(100, 999)}"
            break
    
    return username

def generate_ticket_id():
    """Generate unique ticket ID: T000000001 to T999999999"""
    # Get all tickets and find the highest ticket number
    tickets_ref = db.collection('tickets').stream()
    last_num = 0
    
    for ticket_doc in tickets_ref:
        ticket_data = ticket_doc.to_dict()
        ticket_id = ticket_data.get('ticket_id', '')
        if ticket_id and ticket_id.startswith('T'):
            try:
                num = int(ticket_id.replace('T', ''))
                if num > last_num:
                    last_num = num
            except ValueError:
                pass
    
    new_num = last_num + 1
    return f"T{str(new_num).zfill(9)}"

class RegisterView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'user')
        name = request.data.get('name', '')
        
        print(f"Registration attempt - Email: {email}, Name: {name}, Role: {role}")
        
        if not email or not password:
            print("Error: Missing email or password")
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'email', 'message': 'Email and password required'}}, status=status.HTTP_400_BAD_REQUEST)
        
        if not name or not name.strip():
            print("Error: Missing name")
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'name', 'message': 'Name is required'}}, status=status.HTTP_400_BAD_REQUEST)
        
        if role not in ['user', 'agent', 'admin']:
            print(f"Error: Invalid role - {role}")
            return Response({'error': {'code': 'INVALID_ROLE', 'message': 'Role must be user, agent, or admin'}}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print("Creating Firebase Auth user...")
            # Create Firebase Auth user
            user = auth.create_user(email=email, password=password)
            print(f"Firebase user created: {user.uid}")
            
            # Generate UID and username
            custom_uid = generate_uid(role)
            username = generate_username(name, email)
            print(f"Generated custom_uid: {custom_uid}, username: {username}")
            
            # Check if this is the first admin (auto-verify first admin)
            is_verified = False
            verified_at = None
            if role == 'admin':
                # Check if any other admins exist
                existing_admins = list(db.collection('users').where('role', '==', 'admin').limit(1).stream())
                if not existing_admins:
                    # This is the first admin - auto verify
                    is_verified = True
                    verified_at = datetime.now()
                    print("First admin detected - auto-verifying")
            elif role == 'agent':
                # Agents need manual verification
                is_verified = False
            
            # Create Firestore user document
            user_data = {
                'email': email, 
                'role': role,
                'name': name.strip(),
                'custom_uid': custom_uid,
                'username': username,
                'created_at': datetime.now(),
                'active_tickets': 0,
                'total_resolved': 0,
                'is_active': True
            }
            
            # Add verification fields for admin and agent roles
            if role in ['admin', 'agent']:
                user_data['verified'] = is_verified
                if verified_at:
                    user_data['verified_at'] = verified_at
            
            db.collection('users').document(user.uid).set(user_data)
            print(f"Firestore document created successfully (verified: {is_verified})")
            
            return Response({
                'uid': user.uid, 
                'role': role,
                'custom_uid': custom_uid,
                'username': username,
                'name': name.strip(),
                'verified': is_verified if role in ['admin', 'agent'] else None,
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
            
        except auth.EmailAlreadyExistsError:
            print(f"Error: Email already exists - {email}")
            return Response({'error': {'code': 'EMAIL_EXISTS', 'message': 'Email already registered'}}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error during registration: {str(e)}")
            # If Firestore fails but Auth succeeded, clean up Auth user
            try:
                if 'user' in locals():
                    auth.delete_user(user.uid)
                    print(f"Cleaned up Firebase user: {user.uid}")
            except:
                pass
            return Response({'error': {'code': 'AUTH_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class SetRoleView(APIView):
    def post(self, request):
        id_token = request.data.get('id_token')
        role = request.data.get('role', 'user')
        name = request.data.get('name')
        
        if not id_token:
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'id_token', 'message': 'ID token required'}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token['email']
            
            # Check if user already has custom_uid
            user_doc = db.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                custom_uid = user_data.get('custom_uid')
                username = user_data.get('username')
            else:
                custom_uid = generate_uid(role)
                username = generate_username(name or email.split('@')[0], email)
            
            db.collection('users').document(uid).set({
                'email': email, 
                'role': role,
                'name': name or email.split('@')[0],
                'custom_uid': custom_uid,
                'username': username,
                'active_tickets': 0,
                'total_resolved': 0
            }, merge=True)
            
            return Response({
                'uid': uid, 
                'role': role,
                'custom_uid': custom_uid,
                'username': username
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': {'code': 'AUTH_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'id_token', 'message': 'ID token required'}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            user_doc = db.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                role = user_data.get('role', 'user')
                verified = user_data.get('verified', True)
                
                print(f"Login attempt - UID: {uid}, Role: {role}, Verified: {verified}")
                
                # Block unverified agents/admins from logging in
                if role in ['agent', 'admin'] and not verified:
                    print(f"Blocking unverified {role} from login")
                    return Response({
                        'error': {
                            'code': 'VERIFICATION_PENDING',
                            'message': f'Your {role} account is pending verification. Please wait for an admin to verify your account before logging in.'
                        }
                    }, status=status.HTTP_403_FORBIDDEN)
                
                return Response({
                    'uid': uid, 
                    'role': role,
                    'username': user_data.get('username', ''),
                    'custom_uid': user_data.get('custom_uid', ''),
                    'name': user_data.get('name', ''),
                    'verified': verified
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not registered through the app'}}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': {'code': 'AUTH_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class TicketListView(APIView):
    pagination_class = TicketPagination

    def get(self, request):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', 'user1')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))

        query = db.collection('tickets')
        if user_role == 'user':
            query = query.where('created_by', '==', user_uid)

        tickets_ref = query.stream()
        tickets = []
        for doc in tickets_ref:
            ticket = doc.to_dict()
            ticket['id'] = doc.id
            if search:
                if search.lower() not in ticket['title'].lower() and search.lower() not in ticket['description'].lower() and not any(search.lower() in entry.get('comment', '') for entry in ticket.get('timeline', [])):
                    continue
            # Serialize Firestore Timestamps
            ticket = serialize_firestore_doc(ticket)
            tickets.append(ticket)

        # Simple pagination
        start = (page - 1) * 10
        end = start + 10
        paginated_tickets = tickets[start:end]

        return Response({
            'results': paginated_tickets,
            'count': len(tickets),
            'next': page + 1 if end < len(tickets) else None,
            'previous': page - 1 if page > 1 else None
        })

    def post(self, request):
        title = request.data.get('title')
        description = request.data.get('description')
        priority = request.data.get('priority', 'Medium')
        category = request.data.get('category', 'General')
        user_uid = request.query_params.get('uid', 'user1')
        user_role = request.query_params.get('role', 'user')

        if not title or not description:
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'title', 'message': 'Title and description required'}}, status=status.HTTP_400_BAD_REQUEST)

        idempotency_key = request.headers.get('Idempotency-Key')
        if idempotency_key:
            existing = db.collection('tickets').where('idempotency_key', '==', idempotency_key).limit(1).stream()
            for doc in existing:
                return Response(doc.to_dict(), status=status.HTTP_200_OK)

        sla_hours = {'Low': 48, 'Medium': 24, 'High': 12, 'Critical': 4}[priority]
        sla_deadline = datetime.now() + timedelta(hours=sla_hours)
        
        # Generate unique ticket ID
        ticket_id = generate_ticket_id()
        
        # Smart agent assignment algorithm
        assigned_agent = self.assign_to_best_agent(priority)

        ticket_data = {
            'ticket_id': ticket_id,
            'title': title,
            'description': description,
            'priority': priority,
            'category': category,
            'status': 'Open',
            'assigned_to': assigned_agent,
            'created_by': user_uid,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'version': 1,
            'sla_deadline': sla_deadline,
            'timeline': [{'action': 'created', 'timestamp': datetime.now(), 'user': user_uid}],
            'idempotency_key': idempotency_key,
            'transfer_history': [],
            'feedback': None,
            'rating': None,
            'contact': None,
            'github': None,
            'reopen_count': 0
        }
        
        # Add assignment to timeline
        if assigned_agent:
            # Get agent username for display
            agent_doc = db.collection('users').document(assigned_agent).get()
            agent_name = 'Agent'
            if agent_doc.exists:
                agent_data = agent_doc.to_dict()
                agent_name = agent_data.get('username') or agent_data.get('custom_uid') or agent_data.get('email', '').split('@')[0]
            
            ticket_data['timeline'].append({
                'action': 'auto_assigned',
                'timestamp': datetime.now(),
                'user': assigned_agent,
                'comment': f'Automatically assigned to {agent_name}'
            })
            # Update agent workload
            agent_ref = db.collection('users').document(assigned_agent)
            agent_ref.update({'active_tickets': firestore.Increment(1)})
        
        doc_ref = db.collection('tickets').add(ticket_data)
        ticket_data['id'] = doc_ref[1].id
        
        # Serialize before returning
        ticket_data = serialize_firestore_doc(ticket_data)
        return Response(ticket_data, status=status.HTTP_201_CREATED)
    
    def assign_to_best_agent(self, priority):
        """Smart assignment: distribute based on workload"""
        # Get all active and verified agents
        agents_ref = db.collection('users').where('role', '==', 'agent').stream()
        agents = []
        for agent in agents_ref:
            agent_data = agent.to_dict()
            agent_data['uid'] = agent.id
            # Only include verified agents
            if agent_data.get('verified', True):
                agents.append(agent_data)
        
        if not agents:
            return None  # No verified agents available
        
        if len(agents) == 1:
            return agents[0]['uid']  # Only one agent, assign to them
        
        # For Critical priority, assign to agent with least workload
        if priority == 'Critical':
            agents.sort(key=lambda x: x.get('active_tickets', 0))
            return agents[0]['uid']
        
        # For other priorities, round-robin based on workload
        agents.sort(key=lambda x: x.get('active_tickets', 0))
        return agents[0]['uid']

class TicketDetailView(APIView):
    def get(self, request, ticket_id):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', 'user1')

        # Check if agent/admin is verified
        if user_role in ['agent', 'admin']:
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': f'Your {user_role} account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")

        doc = db.collection('tickets').document(ticket_id).get()
        if not doc.exists:
            return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)

        ticket = doc.to_dict()
        ticket['id'] = doc.id

        # Security: users can only view their own tickets, agents can only view assigned tickets
        if user_role == 'user' and ticket['created_by'] != user_uid:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, status=status.HTTP_403_FORBIDDEN)
        
        if user_role == 'agent' and ticket.get('assigned_to') != user_uid:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'You can only view assigned tickets'}}, status=status.HTTP_403_FORBIDDEN)

        # Serialize Firestore Timestamps
        ticket = serialize_firestore_doc(ticket)
        return Response(ticket)

    def patch(self, request, ticket_id):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', 'user1')
        version = request.data.get('version')

        # Check if agent/admin is verified
        if user_role in ['agent', 'admin']:
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': f'Your {user_role} account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")

        doc_ref = db.collection('tickets').document(ticket_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)

        ticket = doc.to_dict()

        # Security validation: users can only update own tickets, agents can only update assigned tickets
        if user_role == 'user' and ticket['created_by'] != user_uid:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, status=status.HTTP_403_FORBIDDEN)
        
        if user_role == 'agent' and ticket.get('assigned_to') != user_uid:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'You can only update assigned tickets'}}, status=status.HTTP_403_FORBIDDEN)

        if version and int(version) != ticket['version']:
            return Response({'error': {'code': 'CONFLICT', 'message': 'Version mismatch'}}, status=status.HTTP_409_CONFLICT)

        updates = {}
        timeline = ticket.get('timeline', [])
        
        # Workflow validation: only agents and admins can update status
        if 'status' in request.data:
            new_status = request.data['status']
            old_status = ticket.get('status')
            
            # Get username for display
            user_doc = db.collection('users').document(user_uid).get()
            username = 'Unknown'
            if user_doc.exists:
                userData = user_doc.to_dict()
                username = userData.get('username', userData.get('email', 'Unknown').split('@')[0])
            
            # Allow users to reopen Closed tickets one time only
            if user_role == 'user' and old_status == 'Closed' and new_status == 'Open':
                reopen_count = ticket.get('reopen_count', 0)
                if reopen_count >= 1:
                    return Response({'error': {'code': 'FORBIDDEN', 'message': 'Ticket can only be reopened once'}}, status=status.HTTP_403_FORBIDDEN)
                updates['status'] = new_status
                updates['reopen_count'] = reopen_count + 1
                timeline.append({
                    'action': 'reopened',
                    'timestamp': datetime.now(),
                    'user': user_uid,
                    'username': username,
                    'comment': f'Ticket reopened by user'
                })
                updates['timeline'] = timeline
            # Only admin can close tickets
            elif new_status == 'Closed' and user_role != 'admin':
                return Response({'error': {'code': 'FORBIDDEN', 'message': 'Only admin can close tickets'}}, status=status.HTTP_403_FORBIDDEN)
            # Agents can move to In Progress or Resolved
            elif user_role == 'agent' and new_status in ['Open', 'In Progress', 'Resolved']:
                updates['status'] = new_status
                # Save resolved_at timestamp when ticket is resolved (first time only)
                if new_status == 'Resolved' and old_status != 'Resolved':
                    updates['resolved_at'] = datetime.now()
                    updates['completed_at'] = datetime.now()  # Add completed_at field
                    updates['resolved_by'] = user_uid  # Track who resolved it
                # Add timeline entry for status change
                timeline.append({
                    'action': 'status_changed',
                    'timestamp': datetime.now(),
                    'user': user_uid,
                    'username': username,
                    'comment': f'Status changed from {old_status} to {new_status}'
                })
                updates['timeline'] = timeline  # CRITICAL: Save timeline
            elif user_role == 'admin':
                updates['status'] = new_status
                # Save resolved_at timestamp when ticket is resolved (first time only)
                if new_status == 'Resolved' and old_status != 'Resolved':
                    updates['resolved_at'] = datetime.now()
                    updates['completed_at'] = datetime.now()  # Add completed_at field
                    updates['resolved_by'] = user_uid  # Track who resolved it
                # Save closed_at timestamp when ticket is closed (first time only)
                if new_status == 'Closed' and old_status != 'Closed':
                    updates['closed_at'] = datetime.now()
                    # If not yet resolved, mark as completed now
                    if 'resolved_at' not in ticket:
                        updates['completed_at'] = datetime.now()
                        updates['resolved_by'] = user_uid  # Track who closed it
                timeline.append({
                    'action': 'status_changed',
                    'timestamp': datetime.now(),
                    'user': user_uid,
                    'username': username,
                    'comment': f'Status changed from {old_status} to {new_status}'
                })
                updates['timeline'] = timeline  # CRITICAL: Save timeline
        
        # Only admin can reassign tickets
        if 'assigned_to' in request.data and user_role == 'admin':
            # Get username for display
            user_doc = db.collection('users').document(user_uid).get()
            username = 'Unknown'
            if user_doc.exists:
                userData = user_doc.to_dict()
                username = userData.get('username', userData.get('email', 'Unknown').split('@')[0])
            
            old_agent = ticket.get('assigned_to')
            new_agent = request.data['assigned_to']
            updates['assigned_to'] = new_agent
            timeline.append({
                'action': 'reassigned',
                'timestamp': datetime.now(),
                'user': user_uid,
                'username': username,
                'comment': f'Ticket reassigned from {old_agent} to {new_agent}'
            })
            updates['timeline'] = timeline  # CRITICAL: Save timeline
        
        # Handle contact and github updates (for users only) - NO timeline entries
        if 'contact' in request.data:
            updates['contact'] = request.data['contact']
        
        if 'github' in request.data:
            updates['github'] = request.data['github']

        if 'comment' in request.data:
            # Get username for display
            user_doc = db.collection('users').document(user_uid).get()
            username = 'Unknown'
            if user_doc.exists:
                user_data = user_doc.to_dict()
                username = user_data.get('username', user_data.get('email', 'Unknown').split('@')[0])
            
            new_entry = {
                'action': 'commented', 
                'timestamp': datetime.now(), 
                'user': user_uid,
                'username': username,
                'comment': request.data['comment']
            }
            
            # Handle reply threading - add reply_to field if present
            if 'reply_to' in request.data:
                new_entry['reply_to'] = request.data['reply_to']
            
            timeline.append(new_entry)
            # Always update timeline when we add an entry
            updates['timeline'] = timeline

        updates['updated_at'] = datetime.now()
        updates['version'] = ticket['version'] + 1

        if datetime.now() > ticket['sla_deadline'].replace(tzinfo=None):
            updates['status'] = 'Breached'

        doc_ref.update(updates)
        updated_doc = doc_ref.get()
        updated_ticket = updated_doc.to_dict()
        updated_ticket['id'] = updated_doc.id
        
        # Serialize Firestore Timestamps
        updated_ticket = serialize_firestore_doc(updated_ticket)
        return Response(updated_ticket)
    
    def delete(self, request, ticket_id):
        """Delete a comment/reply from timeline - only by the person who created it"""
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', '')
        comment_index = request.data.get('comment_index')
        
        if comment_index is None:
            return Response({'error': {'code': 'MISSING_INDEX', 'message': 'Comment index required'}}, status=status.HTTP_400_BAD_REQUEST)
        
        doc_ref = db.collection('tickets').document(ticket_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)
        
        ticket = doc.to_dict()
        timeline = ticket.get('timeline', [])
        
        # Validate comment index
        if comment_index < 0 or comment_index >= len(timeline):
            return Response({'error': {'code': 'INVALID_INDEX', 'message': 'Invalid comment index'}}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = timeline[comment_index]
        
        # Security: creator OR admin OR agent can delete
        if comment.get('user') != user_uid and user_role not in ['admin', 'agent']:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Only creator, admin, or agent can delete comments'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Allow deleting comments (regular or replies), but not system actions
        is_comment_or_reply = comment.get('action') == 'commented' or comment.get('reply_to') is not None
        if not is_comment_or_reply:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Cannot delete system actions'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Remove the comment
        del timeline[comment_index]
        
        # Update all reply_to indices that reference indices after the deleted one
        for entry in timeline:
            if 'reply_to' in entry and entry['reply_to'] > comment_index:
                entry['reply_to'] -= 1
        
        doc_ref.update({
            'timeline': timeline,
            'updated_at': datetime.now()
        })
        
        return Response({'message': 'Comment deleted successfully'})

class SLAReportView(APIView):
    def get(self, request):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', '')
        
        if user_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)

        # Check if admin is verified
        if user_role == 'admin' and user_uid:
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your admin account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")

        # Get all tickets and check SLA breach dynamically
        tickets_ref = db.collection('tickets').stream()
        breached = []
        for doc in tickets_ref:
            ticket = doc.to_dict()
            ticket['id'] = doc.id
            
            # Check if ticket has breached SLA (only for open/in-progress tickets)
            if ticket.get('status') in ['Open', 'In Progress', 'Escalated'] and 'sla_deadline' in ticket:
                try:
                    if datetime.now() > ticket['sla_deadline'].replace(tzinfo=None):
                        ticket['sla_breached'] = True
                        breached.append(ticket)
                except (AttributeError, TypeError):
                    # Handle timezone issues gracefully
                    pass
            # Also include tickets that are already marked as Breached
            elif ticket.get('status') == 'Breached':
                ticket['sla_breached'] = True
                breached.append(ticket)

        return Response({'breached_tickets': breached, 'count': len(breached)})

class UsersView(APIView):
    def get(self, request):
        user_role = request.query_params.get('user_role', 'user')
        user_uid = request.query_params.get('uid', '')
        filter_role = request.query_params.get('role', None)
        
        # Allow agents to fetch agent list only (for filtering), admins can fetch all
        if user_role == 'agent':
            # Agents can only fetch agent list
            if filter_role != 'agent':
                return Response({'error': {'code': 'FORBIDDEN', 'message': 'Agents can only fetch agent list'}}, status=status.HTTP_403_FORBIDDEN)
            
            # Check if agent is verified
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    verified = user_data.get('verified', True)  # Default True for backward compatibility
                    print(f"Agent {user_uid} verified status: {verified}")
                    if not verified:
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your agent account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
                else:
                    print(f"Agent {user_uid} not found in database")
            except Exception as e:
                print(f"Verification check error: {e}")
        elif user_role == 'admin':
            # Check if admin is verified
            if user_uid:
                try:
                    user_ref = db.collection('users').document(user_uid)
                    user_doc = user_ref.get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        if not user_data.get('verified', True):
                            return Response({
                                'error': {
                                    'code': 'VERIFICATION_REQUIRED',
                                    'message': 'Your admin account is pending verification. Please contact an administrator to verify your account.'
                                }
                            }, status=status.HTTP_403_FORBIDDEN)
                except Exception as e:
                    print(f"Verification check error: {e}")
        else:
            # Regular users can't access this endpoint
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin or agent only'}}, status=status.HTTP_403_FORBIDDEN)

        # Apply role filter if specified
        if filter_role and filter_role in ['user', 'agent', 'admin']:
            users_ref = db.collection('users').where('role', '==', filter_role).stream()
        else:
            users_ref = db.collection('users').stream()
            
        users = []
        for doc in users_ref:
            user = doc.to_dict()
            user['uid'] = doc.id
            users.append(user)

        return Response({'users': users})
    
    def post(self, request):
        user_role = request.query_params.get('role', 'user')
        if user_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        role = request.data.get('role', 'user')
        
        if not email:
            return Response({'error': {'code': 'FIELD_REQUIRED', 'field': 'email', 'message': 'Email required'}}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user with a default password (they can reset it later)
            user = auth.create_user(email=email, password='ChangeMe123!')
            name = request.data.get('name', email.split('@')[0])
            custom_uid = generate_uid(role)
            username = generate_username(name, email)
            
            # Check if this is the first admin (auto-verify)
            verified = True  # Default for users
            if role in ['admin', 'agent']:
                # Check if any verified admin exists
                existing_admins = db.collection('users').where('role', '==', 'admin').where('verified', '==', True).stream()
                admin_count = sum(1 for _ in existing_admins)
                # First admin is auto-verified, rest need verification
                verified = (role == 'admin' and admin_count == 0)
            
            db.collection('users').document(user.uid).set({
                'email': email, 
                'role': role,
                'name': name,
                'custom_uid': custom_uid,
                'username': username,
                'active_tickets': 0,
                'total_resolved': 0,
                'verified': verified
            })
            return Response({
                'uid': user.uid, 
                'email': email, 
                'role': role,
                'custom_uid': custom_uid,
                'username': username,
                'verified': verified
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': {'code': 'CREATE_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class TransferTicketView(APIView):
    """Transfer ticket from agent to admin when agent can't solve it"""
    def post(self, request, ticket_id):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', 'user1')
        reason = request.data.get('reason', 'Escalation required')
        
        if user_role != 'agent':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Only agents can transfer tickets'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if agent is verified
        if user_role == 'agent':
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your agent account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")
        
        doc_ref = db.collection('tickets').document(ticket_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)
        
        ticket = doc.to_dict()
        
        # Find an available verified admin
        admins_ref = db.collection('users').where('role', '==', 'admin').stream()
        admins = []
        for admin in admins_ref:
            admin_data = admin.to_dict()
            admin_data['uid'] = admin.id
            # Only include verified admins
            if admin_data.get('verified', True):
                admins.append(admin_data)
        
        if not admins:
            return Response({'error': {'code': 'NO_ADMIN', 'message': 'No verified admin available'}}, status=status.HTTP_400_BAD_REQUEST)
        
        # Assign to admin with least workload
        admins.sort(key=lambda x: x.get('active_tickets', 0))
        target_admin = admins[0]['uid']
        
        # Update transfer history
        transfer_history = ticket.get('transfer_history', [])
        transfer_history.append({
            'from': user_uid,
            'to': target_admin,
            'timestamp': datetime.now(),
            'reason': reason,
            'from_role': 'agent',
            'to_role': 'admin'
        })
        
        # Update timeline
        timeline = ticket.get('timeline', [])
        timeline.append({
            'action': 'transferred',
            'timestamp': datetime.now(),
            'user': user_uid,
            'comment': f'Transferred to admin: {reason}'
        })
        
        # Update workload counters
        db.collection('users').document(user_uid).update({'active_tickets': firestore.Increment(-1)})
        db.collection('users').document(target_admin).update({'active_tickets': firestore.Increment(1)})
        
        # Update ticket
        doc_ref.update({
            'assigned_to': target_admin,
            'transfer_history': transfer_history,
            'timeline': timeline,
            'status': 'Escalated',
            'updated_at': datetime.now()
        })
        
        return Response({'message': 'Ticket transferred to admin', 'assigned_to': target_admin})

class SubmitFeedbackView(APIView):
    """User submits feedback after ticket resolution"""
    def post(self, request, ticket_id):
        user_uid = request.query_params.get('uid', 'user1')
        rating = request.data.get('rating')  # 1-5 stars
        feedback_text = request.data.get('feedback', '')
        
        if not rating or rating < 1 or rating > 5:
            return Response({'error': {'code': 'INVALID_RATING', 'message': 'Rating must be 1-5'}}, status=status.HTTP_400_BAD_REQUEST)
        
        doc_ref = db.collection('tickets').document(ticket_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)
        
        ticket = doc.to_dict()
        
        # Only ticket creator can submit feedback
        if ticket['created_by'] != user_uid:
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Only ticket creator can submit feedback'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow feedback on resolved/closed tickets
        if ticket['status'] not in ['Resolved', 'Closed']:
            return Response({'error': {'code': 'INVALID_STATUS', 'message': 'Ticket must be resolved or closed'}}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update ticket - NO timeline entry for feedback
        doc_ref.update({
            'rating': rating,
            'feedback': feedback_text,
            'feedback_submitted_at': datetime.now()
        })
        
        # Update agent/admin stats
        if ticket.get('assigned_to'):
            assignee_ref = db.collection('users').document(ticket['assigned_to'])
            assignee_ref.update({
                'total_resolved': firestore.Increment(1),
                'active_tickets': firestore.Increment(-1)
            })
        
        return Response({'message': 'Feedback submitted successfully'})

class UserRoleUpdateView(APIView):
    """Admin can update user roles"""
    def patch(self, request, user_uid):
        admin_role = request.query_params.get('role', 'user')
        admin_uid = request.query_params.get('uid', '')
        
        if admin_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if admin is verified
        if admin_role == 'admin' and admin_uid:
            try:
                user_ref = db.collection('users').document(admin_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your admin account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")
        
        new_role = request.data.get('role')
        if new_role not in ['user', 'agent', 'admin']:
            return Response({'error': {'code': 'INVALID_ROLE', 'message': 'Invalid role'}}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_ref = db.collection('users').document(user_uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return Response({'error': {'code': 'NOT_FOUND', 'message': 'User not found'}}, status=status.HTTP_404_NOT_FOUND)
            
            user_data = user_doc.to_dict()
            old_role = user_data.get('role')
            
            # Update role and regenerate custom_uid based on new role
            new_custom_uid = generate_uid(new_role)
            
            user_ref.update({
                'role': new_role,
                'custom_uid': new_custom_uid,
                'updated_at': datetime.now()
            })
            
            return Response({
                'message': 'User role updated successfully',
                'uid': user_uid,
                'old_role': old_role,
                'new_role': new_role,
                'custom_uid': new_custom_uid
            })
        except Exception as e:
            return Response({'error': {'code': 'UPDATE_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class UserStatusUpdateView(APIView):
    """Admin can block/activate user accounts"""
    def patch(self, request, user_uid):
        admin_role = request.query_params.get('role', 'user')
        admin_uid = request.query_params.get('uid', '')
        
        if admin_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if admin is verified
        if admin_role == 'admin' and admin_uid:
            try:
                user_ref = db.collection('users').document(admin_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your admin account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")
        
        new_status = request.data.get('status')
        if new_status not in ['active', 'blocked']:
            return Response({'error': {'code': 'INVALID_STATUS', 'message': 'Invalid status'}}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_ref = db.collection('users').document(user_uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return Response({'error': {'code': 'NOT_FOUND', 'message': 'User not found'}}, status=status.HTTP_404_NOT_FOUND)
            
            user_ref.update({
                'account_status': new_status,
                'updated_at': datetime.now()
            })
            
            return Response({
                'message': f'User account {new_status}',
                'uid': user_uid,
                'status': new_status
            })
        except Exception as e:
            return Response({'error': {'code': 'UPDATE_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class AgentVerificationView(APIView):
    """Admin can verify agents and other admins"""
    def patch(self, request, user_uid):
        admin_role = request.query_params.get('role', 'user')
        
        if admin_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user_ref = db.collection('users').document(user_uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return Response({'error': {'code': 'NOT_FOUND', 'message': 'User not found'}}, status=status.HTTP_404_NOT_FOUND)
            
            user_data = user_doc.to_dict()
            user_role = user_data.get('role')
            
            # Allow verification for both agents and admins
            if user_role not in ['agent', 'admin']:
                return Response({'error': {'code': 'INVALID_ROLE', 'message': 'User must be an agent or admin'}}, status=status.HTTP_400_BAD_REQUEST)
            
            user_ref.update({
                'verified': True,
                'verified_at': datetime.now(),
                'updated_at': datetime.now()
            })
            
            return Response({
                'message': f'{user_role.capitalize()} verified successfully',
                'uid': user_uid,
                'role': user_role
            })
        except Exception as e:
            return Response({'error': {'code': 'UPDATE_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

class AdminTransferView(APIView):
    """Admin can transfer tickets to specific agents (bidirectional transfer)"""
    def post(self, request, ticket_id):
        user_role = request.query_params.get('role', 'user')
        user_uid = request.query_params.get('uid', '')
        target_uid = request.data.get('target_uid')
        reason = request.data.get('reason', 'Admin reassignment')
        
        if user_role != 'admin':
            return Response({'error': {'code': 'FORBIDDEN', 'message': 'Admin only'}}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if admin is verified
        if user_role == 'admin' and user_uid:
            try:
                user_ref = db.collection('users').document(user_uid)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    if not user_data.get('verified', True):
                        return Response({
                            'error': {
                                'code': 'VERIFICATION_REQUIRED',
                                'message': 'Your admin account is pending verification. Please contact an administrator to verify your account.'
                            }
                        }, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                print(f"Verification check error: {e}")
        
        if not target_uid:
            return Response({'error': {'code': 'MISSING_TARGET', 'message': 'Target user UID required'}}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get ticket
            doc_ref = db.collection('tickets').document(ticket_id)
            doc = doc_ref.get()
            if not doc.exists:
                return Response({'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}}, status=status.HTTP_404_NOT_FOUND)
            
            ticket = doc.to_dict()
            old_assignee = ticket.get('assigned_to', '')
            
            # Get target user info
            target_ref = db.collection('users').document(target_uid)
            target_doc = target_ref.get()
            if not target_doc.exists:
                return Response({'error': {'code': 'TARGET_NOT_FOUND', 'message': 'Target user not found'}}, status=status.HTTP_404_NOT_FOUND)
            
            target_user = target_doc.to_dict()
            target_role = target_user.get('role', 'user')
            target_username = target_user.get('username', 'Unknown')
            
            # Get admin username
            admin_ref = db.collection('users').document(user_uid)
            admin_doc = admin_ref.get()
            admin_username = admin_doc.to_dict().get('username', 'Admin') if admin_doc.exists else 'Admin'
            
            # Update transfer history
            transfer_history = ticket.get('transfer_history', [])
            transfer_history.append({
                'from': user_uid,
                'to': target_uid,
                'timestamp': datetime.now(),
                'reason': reason,
                'from_role': 'admin',
                'to_role': target_role
            })
            
            # Update timeline with username
            timeline = ticket.get('timeline', [])
            timeline.append({
                'action': 'admin_transfer',
                'timestamp': datetime.now(),
                'user': user_uid,
                'username': admin_username,
                'comment': f'Transferred to {target_username} ({target_role}): {reason}'
            })
            
            # Update workload counters (only if old assignee exists)
            if old_assignee:
                db.collection('users').document(old_assignee).update({
                    'active_tickets': firestore.Increment(-1)
                })
            
            db.collection('users').document(target_uid).update({
                'active_tickets': firestore.Increment(1)
            })
            
            # Update ticket
            doc_ref.update({
                'assigned_to': target_uid,
                'transfer_history': transfer_history,
                'timeline': timeline,
                'status': 'In Progress',
                'updated_at': datetime.now()
            })
            
            return Response({
                'message': f'Ticket transferred to {target_username}',
                'assigned_to': target_uid,
                'target_role': target_role
            })
        except Exception as e:
            return Response({'error': {'code': 'TRANSFER_ERROR', 'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)


