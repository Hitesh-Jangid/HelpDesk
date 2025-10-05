# HelpDesk Mini - System Architecture

## System Overview

HelpDesk Mini is a full-stack ticketing system built with **Django REST Framework** (backend), **React** (frontend), and **Firebase** (database + authentication). The system implements SLA tracking, role-based access control, threaded comments, and real-time updates for a complete helpdesk solution.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React 18 + Vite (Port 5173)                  │   │
│  │  - Dashboard, TicketForm, TicketDetail, UserManage   │   │
│  │  - Real-time Firestore listeners (onSnapshot)        │   │
│  │  - Role-based UI rendering                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    Django REST Framework 4.2.7 (Port 8000)           │   │
│  │                                                       │   │
│  │  Middleware Stack:                                    │   │
│  │  ├─ CorsMiddleware (CORS handling)                   │   │
│  │  ├─ RateLimitMiddleware (100 req/min per IP)        │   │
│  │  ├─ CommonMiddleware                                 │   │
│  │  └─ SecurityMiddleware                               │   │
│  │                                                       │   │
│  │  Views (api/views.py):                               │   │
│  │  ├─ RegisterView                                     │   │
│  │  ├─ LoginView (with verification check)              │   │
│  │  ├─ TicketsView (pagination, search, filters)        │   │
│  │  ├─ TicketDetailView (optimistic locking)            │   │
│  │  ├─ TransferView, AdminTransferView                  │   │
│  │  ├─ FeedbackView                                     │   │
│  │  ├─ SLAReportView                                    │   │
│  │  └─ UsersView, VerifyView, UpdateRoleView            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Firebase Admin SDK
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Firebase Authentication                              │   │
│  │  - Email/password authentication                      │   │
│  │  - ID token generation & verification                 │   │
│  │  - Custom UID assignment                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Firestore Database (NoSQL)                          │   │
│  │                                                       │   │
│  │  Collections:                                         │   │
│  │  ├─ users/         (user profiles, roles, status)    │   │
│  │  ├─ tickets/       (ticket data, SLA, assignments)   │   │
│  │  ├─ comments/      (threaded comments, replies)      │   │
│  │  ├─ timeline/      (audit logs, actions)             │   │
│  │  └─ counters/      (auto-increment IDs)              │   │
│  │                                                       │   │
│  │  Indexes:                                             │   │
│  │  - tickets: (assigned_to, status, priority)          │   │
│  │  - comments: (ticket_id, timestamp)                  │   │
│  │  - timeline: (ticket_id, timestamp)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Django 5.1.2** - Web framework
- **Django REST Framework 4.2.7** - RESTful API toolkit
- **Firebase Admin SDK 6.5.0** - Firebase integration
- **Python 3.13** - Programming language

### Frontend
- **React 18.3.1** - UI library
- **Vite 5.4.8** - Build tool & dev server
- **Firebase JS SDK 11.0.1** - Client-side Firebase
- **Axios** - HTTP client
- **React Router** - Client-side routing

### Database & Auth
- **Firebase Firestore** - NoSQL document database
- **Firebase Authentication** - User authentication

### Caching
- **Django LocMemCache** - In-memory cache for rate limiting

---

## Key Design Decisions

### 1. Firestore as Database
**Why NoSQL?**
- Real-time listeners for live updates without polling
- Flexible schema for evolving requirements
- Scalable cloud infrastructure
- Built-in indexing and querying

**Collections Design:**
- **users/**: Flat structure with uid as document ID
- **tickets/**: Nested comments and timeline as subcollections
- **counters/**: Atomic increment for ticket IDs

### 2. Django Backend with Firebase
**Why not Firebase Functions?**
- Django provides robust ORM-like patterns
- Better error handling and validation
- Easier testing and debugging
- Familiar Python ecosystem

**Firebase Admin SDK Benefits:**
- Server-side authentication verification
- Secure Firestore access with admin privileges
- No CORS issues with direct database access

### 3. Optimistic Locking Implementation
**Version Field Approach:**
```python
# views.py (line 365-375)
current_version = ticket_data.get('version', 0)
if version != current_version:
    return Response({
        'error': {
            'code': 'CONFLICT',
            'message': f'Version mismatch. Expected {current_version}, got {version}'
        }
    }, status=409)
```

- Every ticket has a `version` field (starts at 0)
- PATCH requests must include current version
- Server increments version on successful update
- Prevents lost updates in concurrent scenarios

### 4. Idempotency with Header Keys
**Implementation:**
```python
# views.py (line 308-320)
idempotency_key = request.headers.get('Idempotency-Key')
if idempotency_key:
    existing = tickets_ref.where('idempotency_key', '==', idempotency_key).get()
    if existing:
        return Response(existing[0].to_dict(), status=200)
```

- Client sends `Idempotency-Key` header
- Server checks if key exists in database
- Returns existing ticket if found (200 OK)
- Creates new ticket if not found (201 Created)

### 5. Rate Limiting Middleware
**In-Memory Cache Strategy:**
```python
# middleware.py (line 25-40)
cache_key = f'rate_limit_{client_ip}'
rate_data = cache.get(cache_key, {'count': 0, 'start_time': now})

if now - rate_data['start_time'] > self.window:
    rate_data = {'count': 1, 'start_time': now}
else:
    rate_data['count'] += 1

if rate_data['count'] > self.rate_limit:
    return JsonResponse({'error': {...}}, status=429)
```

- 100 requests per minute per IP address
- Uses Django LocMemCache for fast lookups
- Returns 429 with `retry_after` seconds
- Handles X-Forwarded-For for proxy scenarios

### 6. SLA Calculation
**Priority-Based Deadlines:**
```python
# views.py (line 290-294)
sla_hours = {
    'Critical': 4, 'High': 12, 'Medium': 24, 'Low': 48
}
sla_deadline = (datetime.now() + timedelta(hours=sla_hours[priority])).isoformat()
```

- Auto-calculated on ticket creation
- Stored in ISO 8601 format
- Breach detection compares current time with deadline
- Admin reports show all breached tickets

### 7. Verification System
**Login-Level Blocking:**
```python
# views.py (line 249-280)
if role in ['agent', 'admin'] and not verified:
    return Response({'error': {
        'code': 'VERIFICATION_PENDING',
        'message': 'Contact admin to verify your account'
    }}, status=403)
```

- Agents and admins require verification before login
- First admin is auto-verified
- Simplified approach (no in-app verification screens)
- Clean separation: unverified users can't login at all

---

## Data Flow Examples

### 1. Create Ticket Flow
```
User (React) → POST /api/tickets/
               ├─ Headers: Idempotency-Key
               ├─ Body: {title, description, priority, category}
               │
Django View  → Idempotency Check
               ├─ Key exists? Return existing ticket (200)
               ├─ Key new? Continue...
               │
               → Auto-assign to best agent
               ├─ Query agents with fewest tickets
               ├─ Exclude unverified agents
               │
               → Calculate SLA deadline
               ├─ Priority → Hours mapping
               │
               → Generate ticket ID (TKT-XXX)
               ├─ Atomic counter increment
               │
Firestore    → Create ticket document
               ├─ tickets/{doc_id}
               ├─ timeline subcollection entry
               │
Response     ← 201 Created with ticket data
```

### 2. Update Ticket with Optimistic Locking
```
Agent (React) → GET /api/tickets/{id}/
                ├─ Get current version: 2
                │
User Interface → User edits ticket
                 ├─ Change status to "Resolved"
                 │
Agent (React) → PATCH /api/tickets/{id}/
                ├─ Body: {status: "Resolved", version: 2}
                │
Django View   → Version Check
                ├─ Current version in DB: 2
                ├─ Requested version: 2
                ├─ Match! Continue...
                │
                → Update ticket
                ├─ Set status = "Resolved"
                ├─ Increment version to 3
                ├─ Set resolved_by = agent_uid
                │
Firestore     → Update document
                ├─ tickets/{id} (version: 3)
                ├─ timeline entry (action: resolved)
                │
Response      ← 200 OK with updated ticket
```

**Conflict Scenario:**
```
Agent A reads ticket (version: 2)
Agent B reads ticket (version: 2)
Agent A updates → version becomes 3
Agent B updates with version: 2 → 409 CONFLICT (expected 3, got 2)
```

### 3. Real-time Updates Flow
```
Frontend      → Firestore onSnapshot listener
                ├─ tickets/{id}
                │
Firestore     → Detects document change
                ├─ Another agent updated ticket
                │
Frontend      → Callback triggered
                ├─ Update React state
                ├─ Re-render UI with new data
                │
User sees live update (no refresh needed)
```

---

## Security Considerations

### 1. Authentication
- All API requests require valid Firebase ID token (except register/login)
- Token verification via Firebase Admin SDK
- Custom UID stored in Firestore for internal use

### 2. Authorization (RBAC)
- **Users**: Can only view/edit their own tickets
- **Agents**: Can view assigned tickets, cannot delete
- **Admins**: Full access to all resources

### 3. Input Validation
- Required field validation
- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, digit, special)
- Priority/status enum validation

### 4. Rate Limiting
- 100 requests per minute per IP
- Prevents brute force attacks
- Protects against DoS attempts

### 5. CORS Configuration
```python
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
```
- Restricts frontend origin
- Prevents unauthorized cross-origin requests

---

## Performance Optimizations

### 1. Pagination
- Default 10 items per page
- Reduces data transfer
- Improves frontend rendering speed

### 2. Firestore Indexes
- Compound indexes for common queries
- Faster filtering by status, priority, assigned_to
- Timeline queries sorted by timestamp

### 3. Caching
- Rate limit data cached in-memory
- Reduces database lookups for rate limit checks

### 4. Real-time Listeners
- Only subscribe to needed documents
- Unsubscribe on component unmount
- Prevents memory leaks

---

## Testing Strategy

### 1. API Testing
- Test all endpoints with curl/Postman
- Verify error responses (400, 403, 404, 409, 429)
- Check pagination, search, filters

### 2. Robustness Testing
- **Idempotency**: Send duplicate requests with same key
- **Optimistic Locking**: Concurrent updates with stale versions
- **Rate Limiting**: Send 101 requests in 1 minute
- **SLA Breach**: Create tickets and verify deadline calculations

### 3. RBAC Testing
- Verify user can't access other users' tickets
- Agent can't access admin endpoints
- Unverified agents blocked at login

---

## Deployment Considerations

### Production Checklist
- [ ] Change Django SECRET_KEY
- [ ] Set DEBUG = False
- [ ] Configure production ALLOWED_HOSTS
- [ ] Use production Firebase project
- [ ] Set up environment variables for secrets
- [ ] Enable HTTPS
- [ ] Configure production CORS origins
- [ ] Set up database backups
- [ ] Monitor rate limit effectiveness
- [ ] Set up error logging (Sentry, Rollbar)

### Environment Variables
```bash
# .env
DJANGO_SECRET_KEY=<production-secret>
FIREBASE_PROJECT_ID=<prod-project-id>
ALLOWED_HOSTS=yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

---

## Maintenance & Monitoring

### Logs to Monitor
- Authentication failures
- Rate limit hits (429 responses)
- SLA breaches
- Optimistic locking conflicts (409 responses)
- Error rates by endpoint

### Database Maintenance
- Archive old tickets (>1 year)
- Clean up unused idempotency keys
- Monitor Firestore quota usage
- Review and optimize indexes

---

## Future Enhancements

### Potential Features
- **Email Notifications**: Notify users on ticket updates
- **File Attachments**: Allow users to upload screenshots
- **Bulk Actions**: Assign multiple tickets at once
- **Analytics Dashboard**: Ticket trends, agent performance
- **Webhook Support**: Integrate with external systems
- **Multi-language Support**: i18n for global teams
- **Mobile App**: React Native or Flutter app

### Scalability
- **Redis Cache**: Replace LocMemCache for multi-server deployments
- **Message Queue**: Use Celery for async tasks (emails, reports)
- **CDN**: Serve static files from CDN
- **Load Balancer**: Distribute traffic across multiple Django instances

---

## Conclusion

HelpDesk Mini demonstrates a production-ready ticketing system with enterprise-grade features:
- **Robustness**: Pagination, idempotency, optimistic locking, rate limiting
- **Real-time**: Firestore listeners for live updates
- **Security**: RBAC, token verification, input validation
- **Scalability**: NoSQL database, efficient indexing, caching

The architecture balances simplicity (Django + React) with advanced features (SLA tracking, threaded comments, searchable timeline), making it suitable for both learning and real-world deployment.
