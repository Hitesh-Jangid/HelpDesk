# Problem Statement 3: HelpDesk Mini

## Overview
Build a **Ticketing System** with SLA tracking, role-based access control, threaded comments, searchable timeline, and real-time updates.

---

## Core Requirements

### 1. Ticket Management
- **Create Tickets**: Users submit tickets with title, description, priority, and category
- **Assign Tickets**: Auto-assign to agents or allow manual assignment by admins
- **Update Status**: Track ticket lifecycle (Open → In Progress → Resolved → Closed)
- **Priority Levels**: Critical, High, Medium, Low

### 2. SLA (Service Level Agreement) Tracking
- **Deadline Calculation**: Auto-calculate SLA deadlines based on priority
  - **Critical**: 4 hours
  - **High**: 12 hours
  - **Medium**: 24 hours
  - **Low**: 48 hours
- **Breach Detection**: Flag tickets exceeding SLA deadlines
- **Breach Reports**: Generate reports of SLA breaches for admins

### 3. Role-Based Access Control (RBAC)
- **User**: Submit tickets, view own tickets, add comments, provide feedback
- **Agent**: View assigned tickets, update status, add comments, transfer to admin
- **Admin**: Full access, assign tickets, view all tickets, manage users, view reports

### 4. Threaded Comments
- **Comments**: Add comments to tickets
- **Replies**: Support reply-to functionality for threaded discussions
- **Timeline**: Display all comments in chronological order

### 5. Searchable Timeline
- **Universal Search**: Search across ticket title, description, and comments
- **Filters**: Filter by priority, status, category, assigned agent, date range
- **Ticket ID Search**: Quick lookup by ticket ID

---

## Robustness Features (Required)

### 1. Pagination
- All list endpoints must support pagination
- Default: 10 items per page
- Response format: `{results: [], count: N, next: page_num, previous: page_num}`

### 2. Idempotency
- **POST** requests must support idempotency keys
- Duplicate requests with same key return existing resource (200 OK)
- Prevents accidental duplicate ticket creation

### 3. Optimistic Locking
- Use version field for concurrent update protection
- **PATCH** requests must include current version number
- Stale updates return **409 CONFLICT** with error message
- Version increments on successful update

### 4. Rate Limiting
- Implement rate limiting on API endpoints
- Return **429 Too Many Requests** when limit exceeded
- Include `Retry-After` header with seconds to wait

### 5. Error Handling
- Uniform error response format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message",
      "field": "field_name" // optional
    }
  }
  ```

---

## Technical Constraints

### Database
- Use **Firestore** (NoSQL document database)
- Real-time listeners for live updates
- Efficient querying with compound indexes

### Authentication
- **Firebase Authentication** with ID token verification
- Secure backend API with token validation
- Custom UID generation for users/agents/admins

### Backend
- **Django REST Framework** for API
- Token-based authentication middleware
- Query parameter filtering (role, uid, page, search)

### Frontend
- **React** with real-time updates
- Responsive design
- Role-based UI rendering

---

## Deliverables

### 1. API Endpoints
- `POST /api/register/` - User registration
- `POST /api/login/` - User login
- `GET /api/tickets/` - List tickets (with pagination, search, filters)
- `POST /api/tickets/` - Create ticket (with idempotency)
- `GET /api/tickets/{id}/` - Get ticket detail
- `PATCH /api/tickets/{id}/` - Update ticket (with optimistic locking)
- `POST /api/tickets/{id}/transfer/` - Transfer to admin
- `POST /api/tickets/{id}/admin-transfer/` - Admin reassignment
- `POST /api/tickets/{id}/feedback/` - User feedback
- `GET /api/reports/sla/` - SLA breach report
- `GET /api/users/` - List users (admin/agent only)
- `PATCH /api/users/{uid}/verify/` - Verify agent/admin
- `PATCH /api/users/{uid}/role/` - Update user role
- `PATCH /api/users/{uid}/status/` - Block/activate user

### 2. Documentation
- **README.md**: API documentation with examples
- **Architecture documentation**: System design and technical decisions
- **Test credentials**: Provide demo accounts for judges

### 3. Testing
- Test all robustness features (pagination, idempotency, locking, rate limiting)
- Verify SLA calculations and breach detection
- Validate RBAC permissions across all endpoints

---

## Success Criteria

| Feature | Requirement | Status |
|---------|-------------|--------|
| **Tickets** | CRUD operations with auto-assignment | ✅ |
| **SLA Tracking** | Priority-based deadlines, breach detection | ✅ |
| **RBAC** | User/Agent/Admin roles with permissions | ✅ |
| **Comments** | Threaded comments with reply-to | ✅ |
| **Search** | Universal search with filters | ✅ |
| **Pagination** | Page-based with count/next/previous | ✅ |
| **Idempotency** | Idempotency-Key header support | ✅ |
| **Optimistic Locking** | Version field with 409 conflicts | ✅ |
| **Rate Limiting** | 429 responses with retry_after | ✅ |
| **Error Format** | Uniform error structure | ✅ |

---

## Scoring Breakdown (Estimated)

- **Core Features** (60 points): Tickets, SLA, RBAC, Comments, Search
- **Robustness** (20 points): Pagination, Idempotency, Locking, Rate Limiting
- **Code Quality** (10 points): Clean code, proper structure, documentation
- **Real-time Updates** (5 points): Firestore listeners
- **UI/UX** (5 points): Responsive design, user experience

**Total**: 100 points  
