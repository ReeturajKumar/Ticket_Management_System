# Password Reset Feature - Complete Guide

## 🔐 Two Ways to Change Password

### **Option 1: Change Password (Logged In)**
For users who know their current password.

**Endpoint:** `PATCH /api/v1/profile/password`  
**Authentication:** Required  
**Use Case:** User wants to update password while logged in

**Request:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### **Option 2: Forgot Password (Not Logged In)**
For users who forgot their password.

**Flow:** Request Reset → Receive Email → Click Link → Set New Password

---

## 📧 Forgot Password Flow

### Step 1: Request Password Reset

**Endpoint:** `POST /api/v1/auth/forgot-password`  
**Authentication:** Not Required

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email"
}
```

**What Happens:**
1. System generates secure reset token
2. Token hashed and stored in database with 1-hour expiry
3. Email sent with reset link containing plain token
4. User receives email with clickable link

---

### Step 2: User Clicks Email Link

**Email Contains:**
```
Reset Link: http://localhost:3000/reset-password?token=abc123xyz789...
```

**Frontend should:**
1. Extract token from URL query parameter
2. Show "Reset Password" form
3. Submit new password with token to backend

---

### Step 3: Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`  
**Authentication:** Not Required

**Request:**
```json
{
  "token": "abc123xyz789...",
  "newPassword": "mynewpassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

**Response (Invalid/Expired Token):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

---

## 🧪 Testing Password Reset

### Test 1: Forgot Password (Send Email)

```bash
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Check your email for reset link!**

---

### Test 2: Reset Password (Use Token from Email)

```bash
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "your-token-from-email",
  "newPassword": "newpassword123"
}
```

---

### Test 3: Change Password (While Logged In)

```bash
PATCH http://localhost:5000/api/v1/profile/password
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "currentPassword": "currentpass123",
  "newPassword": "newpass456"
}
```

---

## 🔒 Security Features

### Forgot Password:
1. **Token Security**
   - 32-byte random token (crypto.randomBytes)
   - Hashed before storing in database (SHA-256)
   - Plain token only in email link

2. **Time Limit**
   - Token expires in 1 hour
   - Automatically invalidated after use

3. **Email Privacy**
   - Doesn't reveal if email exists in system
   - Always returns success message

4. **Verification Check**
   - Only verified users can reset password
   - Prevents abuse of unverified accounts

### Change Password:
1. **Current Password Verification**
   - Must provide correct current password
   - Prevents unauthorized changes

2. **Authentication Required**
   - Must be logged in
   - JWT token validation

---

## 📋 Database Fields

**User Model:**
```typescript
{
  resetPasswordToken: string | null,      // Hashed token
  resetPasswordExpiry: Date | null        // 1 hour from request
}
```

**Token cleared after:**
- Successful password reset
- Token expiry (1 hour)

---

## 🎯 Complete User Journey

### Scenario 1: User Forgot Password
```
1. User clicks "Forgot Password" on login page
2. Enters email → POST /auth/forgot-password
3. Receives email with reset link
4. Clicks link → Frontend shows reset form
5. Enters new password → POST /auth/reset-password
6. Success! → Redirected to login
7. Logs in with new password
```

### Scenario 2: User Wants to Change Password
```
1. User logged in → Goes to profile settings
2. Enters current + new password → PATCH /profile/password
3. Success! → Password updated
4. Can continue using app with new password
```

---

## ⚙️ Environment Configuration

Add to `.env`:
```env
# Frontend URL for reset password link
CLIENT_URL=http://localhost:3000
```

---

## 🚨 Error Scenarios

### Forgot Password Errors:
- ❌ Email not provided → 400 Bad Request
- ❌ User not verified → 403 Forbidden
- ✅ Email doesn't exist → 200 OK (security: don't reveal)

### Reset Password Errors:
- ❌ Token missing → 400 Bad Request
- ❌ Password too short → 400 Bad Request
- ❌ Invalid token → 400 Bad Request
- ❌ Expired token → 400 Bad Request

### Change Password Errors:
- ❌ Not authenticated → 401 Unauthorized
- ❌ Current password wrong → 401 Unauthorized
- ❌ New password too short → 400 Bad Request

---

## 📧 Email Template

**Subject:** Password Reset Request

**Content:**
- Clear "Reset Password" button
- Plain text link as backup
- 1-hour expiry warning
- Security notice if not requested

---

## ✅ Success Criteria

- ✅ Forgot password sends email with reset link
- ✅ Reset token expires after 1 hour
- ✅ Reset token invalidated after use
- ✅ Change password requires current password
- ✅ Both methods update password successfully
- ✅ User can login with new password

---

**Status:** Password Reset Feature Fully Implemented! 🎉
