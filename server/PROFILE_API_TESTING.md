# Profile APIs - Testing Guide

## ✅ Implemented Profile Endpoints

### 1. **Get Profile** - `GET /api/v1/profile`
View authenticated user's profile information.

### 2. **Update Profile** - `PUT /api/v1/profile`
Update name and/or email.

### 3. **Change Password** - `PATCH /api/v1/profile/password`
Change password with current password verification.

---

## 🧪 Testing Profile APIs

### Prerequisites
1. Register and verify a user (complete OTP flow)
2. Login to get access token
3. Use access token in Authorization header

---

### Test 1: Get Profile

```bash
GET http://localhost:5000/api/v1/profile
Authorization: Bearer <your_access_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "department": null,
      "isVerified": true,
      "createdAt": "2026-01-09T06:00:00.000Z",
      "updatedAt": "2026-01-09T06:00:00.000Z"
    }
  }
}
```

**Error (No Token):**
```json
{
  "success": false,
  "message": "No token provided. Please login."
}
```

---

### Test 2: Update Profile (Name Only)

```bash
PUT http://localhost:5000/api/v1/profile
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "name": "John Updated"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Updated",
      "email": "john@example.com",
      "role": "STUDENT",
      "department": null
    }
  }
}
```

**Error (No Name Provided):**
```json
{
  "success": false,
  "message": "Please provide name to update"
}
```

**Note:** Email cannot be changed for security reasons. Only name updates are allowed.

---

### Test 3: Change Password

```bash
PATCH http://localhost:5000/api/v1/profile/password
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error (Wrong Current Password):**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**Error (New Password Too Short):**
```json
{
  "success": false,
  "message": "New password must be at least 6 characters long"
}
```

---

## 📋 Postman/Thunder Client Collection

### Setup
1. Create environment variable: `accessToken`
2. After login, save token automatically

### Collection Structure

**Folder: Profile Management**

1. **Get Profile**
   - Method: GET
   - URL: `{{baseUrl}}/profile`
   - Headers: `Authorization: Bearer {{accessToken}}`

2. **Update Profile (Name)**
   - Method: PUT
   - URL: `{{baseUrl}}/profile`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Body:
     ```json
     {
       "name": "Updated Name"
     }
     ```

3. **Update Profile (Email)**
   - Method: PUT
   - URL: `{{baseUrl}}/profile`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Body:
     ```json
     {
       "email": "newemail@example.com"
     }
     ```

4. **Change Password**
   - Method: PATCH
   - URL: `{{baseUrl}}/profile/password`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Body:
     ```json
     {
       "currentPassword": "oldpass",
       "newPassword": "newpass"
     }
     ```

---

## ✅ Success Criteria

- ✅ Get profile returns user data without sensitive fields
- ✅ Update profile validates email uniqueness
- ✅ Update profile allows partial updates (name only or email only)
- ✅ Change password verifies current password
- ✅ Change password validates new password length
- ✅ All endpoints require authentication
- ✅ Proper error messages for all scenarios

---

## 🔒 Security Features

1. **Authentication Required** - All endpoints protected
2. **Self-Only Access** - Users can only view/update their own profile
3. **Password Verification** - Current password required to change
4. **Email Uniqueness** - Prevents duplicate emails
5. **Sensitive Data Excluded** - Password, tokens, OTP not returned

---

**Status:** Profile APIs Fully Implemented! 🎉
