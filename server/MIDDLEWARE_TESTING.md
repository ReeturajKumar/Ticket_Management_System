# Middleware Implementation - Testing Guide

## ✅ What Was Implemented

### 1. **AppError Class** (`src/utils/AppError.ts`)
Custom error class for consistent error handling with HTTP status codes.

### 2. **Error Handler Middleware** (`src/middleware/errorHandler.ts`)
Global error handler that catches all errors and returns consistent JSON responses.

### 3. **Authentication Middleware** (`src/middleware/auth.ts`)
JWT verification middleware that protects routes and attaches user data to requests.

### 4. **Test Routes** (`src/routes/testRoutes.ts`)
Routes to test authentication middleware.

---

## 🧪 How to Test

### Test 1: Public Route (No Auth Required)
```bash
GET http://localhost:5000/api/v1/test/public
```

**Expected Response:**
```json
{
  "success": true,
  "message": "This is a public route - no authentication needed"
}
```

---

### Test 2: Protected Route WITHOUT Token (Should Fail)
```bash
GET http://localhost:5000/api/v1/test/protected
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "No token provided. Please login."
}
```

---

### Test 3: Protected Route WITH Valid Token (Should Work)

**Step 1: Login first**
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Step 2: Copy the accessToken from response**

**Step 3: Use token to access protected route**
```bash
GET http://localhost:5000/api/v1/test/protected
Authorization: Bearer <paste_your_access_token_here>
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "You are authenticated!",
  "user": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "john@example.com",
    "role": "STUDENT"
  }
}
```

---

### Test 4: Protected Route WITH Invalid Token (Should Fail)
```bash
GET http://localhost:5000/api/v1/test/protected
Authorization: Bearer invalid_token_123
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

### Test 5: Protected Route WITH Expired Token (Should Fail)
After 15 minutes, the access token expires.

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Token expired. Please login again."
}
```

---

## 📋 Using Postman/Thunder Client

### Setup Collection:

1. **Create Environment Variable**
   - Variable: `accessToken`
   - Initial Value: (leave empty)

2. **Login Request**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/auth/login`
   - Body:
     ```json
     {
       "email": "john@example.com",
       "password": "password123"
     }
     ```
   - **Tests** (to auto-save token):
     ```javascript
     const response = pm.response.json();
     pm.environment.set("accessToken", response.data.accessToken);
     ```

3. **Protected Route Request**
   - Method: GET
   - URL: `http://localhost:5000/api/v1/test/protected`
   - Headers:
     - Key: `Authorization`
     - Value: `Bearer {{accessToken}}`

---

## 🎯 What This Enables

Now you can protect ANY route by adding `authenticate` middleware:

```typescript
import { authenticate } from '../middleware/auth';

// Protected route
router.get('/profile', authenticate, getProfile);

// Public route
router.get('/departments', getDepartments);
```

The `req.user` object will be available in all protected routes:
```typescript
export const getProfile = (req: Request, res: Response) => {
  const userId = req.user!.userId;  // ✅ Available!
  const role = req.user!.role;      // ✅ Available!
  // ... your logic
};
```

---

## ✅ Success Criteria

- ✅ Public routes work without token
- ✅ Protected routes reject requests without token
- ✅ Protected routes accept valid tokens
- ✅ Protected routes reject invalid/expired tokens
- ✅ `req.user` is populated in protected routes
- ✅ Error responses are consistent JSON format

---

**Status:** Ready to build Profile, Ticket, Department APIs! 🚀
