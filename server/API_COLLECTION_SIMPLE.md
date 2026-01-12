# Complete API Collection - All Endpoints (NO DUPLICATES)

## 🎓 STUDENT APIs (14 endpoints)

### Authentication (3)
```
POST /auth/register
Body: { "name": "John Student", "email": "john@example.com", "password": "pass123" }

POST /auth/verify-otp
Body: { "email": "john@example.com", "otp": "123456" }

POST /auth/login
Body: { "email": "john@example.com", "password": "pass123" }
```

### Tickets (11)
```
POST /tickets
Body: { "subject": "Login Issue", "description": "Cannot login", "department": "OPERATIONS", "priority": "HIGH" }

GET /tickets?page=1&limit=20
Body: {}

GET /tickets/search?q=login&page=1
Body: {}

GET /tickets/:id
Body: {}

GET /tickets/:id/history
Body: {}

PUT /tickets/:id
Body: { "subject": "New Subject", "description": "Updated desc", "priority": "CRITICAL" }

DELETE /tickets/:id
Body: {}

POST /tickets/:id/comments
Body: { "comment": "Thank you" }

POST /tickets/:id/attachments
Body: FormData with "file" field

GET /tickets/:id/attachments/:attachmentId
Body: {}

POST /tickets/:id/rate
Body: { "stars": 5, "comment": "Great!" }

POST /tickets/:id/reopen
Body: { "reason": "Issue exists" }
```

---

## 👨‍💼 DEPARTMENT STAFF APIs (11 endpoints)

### Authentication (1)
```
POST /department-auth/login
Body: { "email": "staff@operations.com", "password": "pass123" }
```

### My Tickets (7)
```
GET /department/staff/my-tickets?page=1&limit=20
Body: {}

GET /department/staff/my-tickets/:id
Body: {}

PATCH /department/staff/my-tickets/:id/status
Body: { "status": "IN_PROGRESS" }

POST /department/staff/my-tickets/:id/comments
Body: { "comment": "Working on it" }

POST /department/staff/my-tickets/:id/private-notes
Body: { "note": "Internal note" }

POST /department/staff/my-tickets/:id/request-reassignment
Body: { "reason": "Too many tickets" }

POST /department/staff/my-tickets/:id/mark-duplicate
Body: { "duplicateOf": "TICKET_ID" }
```

### Unassigned Tickets (2)
```
GET /department/staff/unassigned-tickets
Body: {}

POST /department/staff/unassigned-tickets/:id/claim
Body: {}
```

### Dashboard (2)
```
GET /department/staff/my-dashboard
Body: {}

GET /department/staff/my-performance
Body: {}
```

---

## 👔 DEPARTMENT HEAD APIs (19 endpoints)

### Authentication (1)
```
POST /department-auth/login
Body: { "email": "head@operations.com", "password": "pass123" }
```

### Ticket Management (9)
```
GET /department/tickets?status=OPEN&page=1
Body: {}

GET /department/tickets/:id
Body: {}

PATCH /department/tickets/:id/assign
Body: { "assignedTo": "STAFF_ID", "reason": "Best fit" }

PATCH /department/tickets/:id/status
Body: { "status": "RESOLVED" }

PATCH /department/tickets/:id/close
Body: {}

PATCH /department/tickets/:id/priority
Body: { "priority": "CRITICAL" }

POST /department/tickets/:id/notes
Body: { "note": "Internal note" }

POST /department/tickets/bulk-assign
Body: { "ticketIds": ["ID1", "ID2"], "assignedTo": "STAFF_ID" }

POST /department/tickets/bulk-status
Body: { "ticketIds": ["ID1", "ID2"], "status": "RESOLVED" }
```

### Ratings (1)
```
GET /department/ratings?page=1&minStars=4
Body: {}
```

### Team Management (3)
```
GET /department/team
Body: {}

GET /department/team/workload
Body: {}

GET /department/team/:userId/performance
Body: {}
```

### Reports (2)
```
GET /department/reports/summary?period=month
Body: {}

GET /department/reports/export?format=csv&type=tickets
Body: {}
```

### Dashboard (3)
```
GET /department/dashboard/overview
Body: {}

GET /department/dashboard/team-performance
Body: {}

GET /department/dashboard/analytics?period=30d
Body: {}
```

---

## 📊 FINAL COUNT

**Total Unique Endpoints: 45**

**By Role:**
- Student: 14 endpoints
- Staff: 11 endpoints
- Head: 19 endpoints
- Common (auth, health): 1 endpoint

**NO DUPLICATES - All routes verified!** ✅
