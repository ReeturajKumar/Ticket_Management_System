# Currently Implemented APIs - Student Ticketing System

## Overview
This document lists all APIs that have been **implemented** in the project so far. As of now, only the **Authentication APIs** are implemented.

---

## ✅ Implemented APIs

### Base URL
```
http://localhost:5000/api/v1
```

### 1. Authentication APIs (Public - No Role Required)

All authentication endpoints are **public** and can be accessed without authentication. These are available to all users regardless of role.

#### 1.1 Register New User
```http
POST /api/v1/auth/register
```

**Description:** Register a new user in the system

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT",           // Optional, defaults to STUDENT
  "department": "PLACEMENT"    // Required only if role is DEPARTMENT_USER
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "department": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Available to:** Everyone (Public)

---

#### 1.2 Login User
```http
POST /api/v1/auth/login
```

**Description:** Authenticate user and receive access/refresh tokens

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "department": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Available to:** Everyone (Public)

---

#### 1.3 Refresh Access Token
```http
POST /api/v1/auth/refresh
```

**Description:** Get a new access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Available to:** Everyone (Public)

---

#### 1.4 Logout User
```http
POST /api/v1/auth/logout
```

**Description:** Logout user and invalidate refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Available to:** Everyone (Public)

---

### 2. Health Check API

#### 2.1 API Health Check
```http
GET /api/v1/health
```

**Description:** Check if API is running

**Response (200 OK):**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-09T10:50:23.000Z"
}
```

**Available to:** Everyone (Public)

---

## ❌ Not Yet Implemented (Planned for Student Role)

Based on the `USER_ROLE_SCOPE.md` specification, the following APIs are **planned** but **not yet implemented**:

### Profile Management (Protected - Student)
```http
GET    /api/v1/profile              # View own profile
PUT    /api/v1/profile              # Update own profile
PATCH  /api/v1/profile/password     # Change password
```

### Ticket Management (Protected - Student)
```http
POST   /api/v1/tickets                    # Create own ticket
GET    /api/v1/tickets                    # List own tickets
GET    /api/v1/tickets/:id                # View own ticket details
PUT    /api/v1/tickets/:id                # Update own ticket
POST   /api/v1/tickets/:id/comments       # Add comment to own ticket
PATCH  /api/v1/tickets/:id/reopen         # Reopen own closed ticket
```

### Department (Protected - Student)
```http
GET    /api/v1/departments                # List all departments (read-only)
```

### Dashboard (Protected - Student)
```http
GET    /api/v1/dashboard/student          # Student dashboard with stats
```

---

## Implementation Status Summary

| Category | Status | Count |
|----------|--------|-------|
| **Authentication APIs** | ✅ Implemented | 4 endpoints |
| **Health Check** | ✅ Implemented | 1 endpoint |
| **Profile Management** | ❌ Not Implemented | 0 endpoints |
| **Ticket Management** | ❌ Not Implemented | 0 endpoints |
| **Department APIs** | ❌ Not Implemented | 0 endpoints |
| **Dashboard APIs** | ❌ Not Implemented | 0 endpoints |
| **RBAC Middleware** | ❌ Not Implemented | - |

---

## What's Missing for Student Role

To fully support the Student role as per the specification, we need to implement:

### 1. **Middleware Layer** (Critical - Required First)
- ✅ JWT utilities (already implemented in `src/utils/jwt.ts`)
- ❌ Authentication middleware (`src/middleware/auth.ts`)
- ❌ Error handling middleware (`src/middleware/errorHandler.ts`)
- ❌ Role check middleware (`src/middleware/roleCheck.ts`)
- ❌ Ownership verification middleware

### 2. **Database Models** (Required for Ticket APIs)
- ✅ User model (already implemented)
- ❌ Ticket model
- ❌ Department model

### 3. **Controllers** (Business Logic)
- ✅ Auth controller (already implemented)
- ❌ Profile controller
- ❌ Ticket controller
- ❌ Department controller
- ❌ Dashboard controller

### 4. **Routes** (API Endpoints)
- ✅ Auth routes (already implemented)
- ❌ Profile routes
- ❌ Ticket routes
- ❌ Department routes
- ❌ Dashboard routes

---

## Testing the Implemented APIs

### Using cURL

#### Register a Student
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "STUDENT"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Refresh Token
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

#### Logout
```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

#### Health Check
```bash
curl http://localhost:5000/api/v1/health
```

---

### Using Postman/Thunder Client

1. **Create a new request collection**
2. **Set base URL:** `http://localhost:5000/api/v1`
3. **Import the following requests:**

**Register:**
- Method: POST
- URL: `{{baseUrl}}/auth/register`
- Body (JSON):
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "STUDENT"
  }
  ```

**Login:**
- Method: POST
- URL: `{{baseUrl}}/auth/login`
- Body (JSON):
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

**Save the `accessToken` from the response for protected routes (when implemented)**

---

## Current Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.ts                    ✅ Database connection
│   ├── constants/
│   │   └── index.ts                 ✅ Roles, Departments, Status, Priority
│   ├── controllers/
│   │   └── authController.ts        ✅ Auth logic (register, login, refresh, logout)
│   ├── middleware/                  ❌ Empty (needs implementation)
│   ├── models/
│   │   └── User.ts                  ✅ User model with refresh token
│   ├── routes/
│   │   ├── authRoutes.ts            ✅ Auth endpoints
│   │   └── index.ts                 ✅ Route aggregator
│   ├── utils/
│   │   ├── jwt.ts                   ✅ JWT utilities
│   │   └── password.ts              ✅ Password hashing
│   └── index.ts                     ✅ Main server file
├── .env                             ✅ Environment variables
├── package.json                     ✅ Dependencies
├── tsconfig.json                    ✅ TypeScript config
└── RBAC_PERMISSIONS.md              ✅ Permissions documentation
```

---

## Next Steps to Support Student Role

### Phase 1: RBAC Foundation (Highest Priority)
1. Create `AppError` class for error handling
2. Create global error handler middleware
3. Create authentication middleware
4. Create role check middleware
5. Integrate middleware into server

### Phase 2: Database Models
1. Create Ticket model
2. Create Department model
3. Add indexes for performance

### Phase 3: Student APIs
1. **Profile Management:**
   - GET /profile (view own profile)
   - PUT /profile (update own profile)
   - PATCH /profile/password (change password)

2. **Ticket Management:**
   - POST /tickets (create ticket)
   - GET /tickets (list own tickets)
   - GET /tickets/:id (view ticket)
   - PUT /tickets/:id (update ticket)
   - POST /tickets/:id/comments (add comment)
   - PATCH /tickets/:id/reopen (reopen ticket)

3. **Department APIs:**
   - GET /departments (list departments)

4. **Dashboard:**
   - GET /dashboard/student (student stats)

---

## Summary

**Currently Implemented for Student Role:**
- ✅ User registration (can create Student account)
- ✅ Login/Logout (authentication)
- ✅ Token refresh (session management)

**Not Yet Implemented:**
- ❌ Profile management
- ❌ Ticket creation and management
- ❌ Department viewing
- ❌ Dashboard
- ❌ RBAC middleware (authentication, role checks, ownership verification)

**Total Implemented APIs:** 5 (4 auth + 1 health check)  
**Total Planned APIs for Student:** ~15 endpoints

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-09  
**Server Status:** Running on port 5000  
**Database:** MongoDB (Connected)
