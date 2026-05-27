# 🎫 HelpDesk - Ticketing System

> Enterprise-grade helpdesk with SLA tracking, RBAC, threaded comments, and real-time updates

[![Django](https://img.shields.io/badge/Django-5.1.2-green.svg)](https://www.djangoproject.com/) [![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/) [![Firebase](https://img.shields.io/badge/Firebase-11.0.1-orange.svg)](https://firebase.google.com/) [![Deploy](https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-00C7B7.svg)](#-deployment) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**🚀 [Live Demo](#) | 📖 [Documentation](./docs/) | 🎯 [Quick Deploy](./DEPLOY.md)**

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🎯 Core Features
- **SLA Tracking** - Auto-calculated deadlines
- **RBAC** - User, Agent, Admin roles
- **Real-time Updates** - Live Firestore sync
- **Threaded Comments** - Full conversations
- **Advanced Search** - Universal search

</td>
<td width="50%">

### 🛡️ Robustness
- **Optimistic Locking** - Conflict resolution
- **Idempotency** - Duplicate prevention
- **Rate Limiting** - 100 req/min per IP
- **Pagination** - Efficient data loading
- **Audit Trail** - Complete history

</td>
</tr>
</table>

---

## 🚀 Quick Start

<table>
<tr>
<td width="50%">

### 📦 Backend Setup
```bash
cd helpdesk
pip install -r requirements.txt
python manage.py runserver
```
**Runs on:** http://localhost:8000

</td>
<td width="50%">

### ⚛️ Frontend Setup
```bash
npm install
npm run dev
```
**Runs on:** http://localhost:5173

</td>
</tr>
</table>

### Prerequisites
- **Python 3.13+** - Backend runtime
- **Node.js 18+** - Frontend runtime  
- **Firebase Project** - Firestore + Authentication enabled

---

## 🔑 Test Credentials

<table>
<thead>
<tr>
<th>Role</th>
<th>Email</th>
<th>Password</th>
<th>Custom UID</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>👨‍💼 Admin</strong></td>
<td><code>admin@helpdesk.com</code></td>
<td><code>Admin@123</code></td>
<td><code>AD00001</code></td>
<td>✅ Verified</td>
</tr>
<tr>
<td><strong>🎧 Agent</strong></td>
<td><code>agent@helpdesk.com</code></td>
<td><code>Agent@123</code></td>
<td><code>AG00001</code></td>
<td>⚠️ Needs Verification</td>
</tr>
<tr>
<td><strong>👤 User</strong></td>
<td><code>user@helpdesk.com</code></td>
<td><code>User@123</code></td>
<td><code>User-U000001</code></td>
<td>✅ Active</td>
</tr>
</tbody>
</table>

> **💡 Note:** First admin is auto-verified. New agents/admins require admin verification before login.

---

## 📸 Screenshots

<table>
<tr>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-33-20.png" alt="Dashboard"/>
<p align="center"><strong>Dashboard</strong> - Ticket overview with filters</p>
</td>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-33-38.png" alt="Create Ticket"/>
<p align="center"><strong>Create Ticket</strong> - Form with auto-assignment</p>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-34-41.png" alt="Ticket Detail"/>
<p align="center"><strong>Ticket Detail</strong> - Comments & timeline</p>
</td>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-35-21.png" alt="User Management"/>
<p align="center"><strong>User Management</strong> - Admin panel</p>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-35-46.png" alt="SLA Report"/>
<p align="center"><strong>SLA Report</strong> - Breach tracking</p>
</td>
<td width="50%">
<img src="docs/workflow%20Image/Screenshot%20From%202025-10-05%2018-36-01.png" alt="Search"/>
<p align="center"><strong>Search & Filters</strong> - Advanced filtering</p>
</td>
</tr>
</table>

---

## 📡 API Endpoints

| Category | Endpoints |
|----------|-----------|
| **🔐 Auth** | `POST /api/register/` • `POST /api/login/` |
| **🎫 Tickets** | `GET /api/tickets/` • `POST /api/tickets/` • `PATCH /api/tickets/{id}/` • `POST /api/tickets/{id}/transfer/` |
| **👨‍💼 Admin** | `GET /api/reports/sla/` • `GET /api/users/` • `PATCH /api/users/{uid}/verify/` • `PATCH /api/users/{uid}/role/` |

**Example:** Create ticket with idempotency
```bash
curl -X POST 'http://localhost:8000/api/tickets/?uid=User-U000001' \
  -H "Idempotency-Key: unique-123" \
  -d '{"title": "Login issue", "priority": "High", "category": "Technical"}'
```

---

## 🔒 Key Features

| Feature | Description |
|---------|-------------|
| **🔐 Optimistic Locking** | Version-based conflict resolution • Returns 409 on version mismatch |
| **🔁 Idempotency** | Duplicate requests with same key return existing resource (200 OK) |
| **⚡ Rate Limiting** | 100 requests/min per IP • Returns 429 with Retry-After header |
| **📄 Pagination** | All lists support `?page=1` • Response: `{results, count, next, previous}` |
| **👥 RBAC** | **User:** Own tickets • **Agent:** Assigned tickets • **Admin:** Full access |

---

## 📊 SLA Tracking

<table>
<thead>
<tr>
<th>Priority</th>
<th>⏰ Deadline</th>
<th>📋 Typical Use Case</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>🔴 Critical</strong></td>
<td>4 hours</td>
<td>System down, security breach</td>
</tr>
<tr>
<td><strong>🟠 High</strong></td>
<td>12 hours</td>
<td>Important features broken</td>
</tr>
<tr>
<td><strong>🟡 Medium</strong></td>
<td>24 hours</td>
<td>Non-critical bugs</td>
</tr>
<tr>
<td><strong>🟢 Low</strong></td>
<td>48 hours</td>
<td>Feature requests, minor issues</td>
</tr>
</tbody>
</table>

**Breach Detection:** Deadlines are auto-calculated from ticket creation. Admins can view breached tickets via `/api/reports/sla/`

---

## 🎯 Feature Checklist

<table>
<tr>
<td width="50%">

**Core Features**
- ✅ Ticket CRUD Operations
- ✅ Auto-assignment to Agents
- ✅ SLA Tracking & Deadlines
- ✅ SLA Breach Reports
- ✅ RBAC (User/Agent/Admin)
- ✅ Agent Verification System
- ✅ Threaded Comments
- ✅ Universal Search

</td>
<td width="50%">

**Advanced Features**
- ✅ Real-time Updates
- ✅ Pagination (10 items/page)
- ✅ Idempotency Keys
- ✅ Optimistic Locking
- ✅ Rate Limiting (100/min)
- ✅ Uniform Error Format
- ✅ Complete Audit Trail
- ✅ Firebase Integration

</td>
</tr>
</table>

**Status: 100% Complete** 🎉

---

## 🏗️ Tech Stack

<table>
<tr>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django"/>
<br><strong>Django REST</strong>
<br>Backend API
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
<br><strong>React 18</strong>
<br>Frontend UI
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
<br><strong>Firebase</strong>
<br>Database & Auth
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
<br><strong>Python 3.13</strong>
<br>Runtime
</td>
</tr>
</table>

**Additional:** Vite (Build Tool), Firestore (NoSQL DB), Firebase Auth, Django LocMemCache

---

## � Deployment

### Quick Deploy (10 minutes)

**Free Hosting:** Backend on [Render](https://render.com) + Frontend on [Vercel](https://vercel.com)

📖 **[Full Deployment Guide](./DEPLOY.md)** - Step-by-step secure deployment

#### Quick Steps:

1. **Backend to Render:**
   - Connect GitHub repository
   - Set environment variables (see `.env.example` files)
   - Deploy in 5 minutes

2. **Frontend to Vercel:**
   - Import repository
   - Add Firebase config as env vars
   - Deploy in 3 minutes

3. **Configure CORS:**
   - Update `ALLOWED_HOSTS` with your Vercel domain
   - Test your live application!

**🔒 Security:** All credentials use environment variables. No sensitive data is committed to the repository.

---

## �📚 Documentation

- **[Deployment Guide](DEPLOY.md)** - Secure deployment instructions
- **[Features Guide](docs/FEATURES.md)** - Complete feature documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design & decisions
- **[Problem Statement](docs/PROBLEM_STATEMENT.md)** - Hackathon requirements

---

## 👨‍💻 Author

**Hitesh Jangid** | HelpDesk System 

**License:** Educational Purpose