# 🔍 Debugging Refresh Token Issue

## Problem:
Getting "Invalid refresh token" when calling `/auth/refresh`

## Possible Causes:

### 1. **Token Mismatch in Database**
The refresh token in the database doesn't match the one you're sending.

**Why this happens:**
- You logged in multiple times
- Each login generates a NEW refresh token
- Only the LATEST refresh token is saved in database
- Old refresh tokens become invalid

**Solution:** Use the LATEST refresh token from your most recent login

---

### 2. **Token Expired**
The refresh token has expired (after 7 days).

**Check token expiry:**
```javascript
// Decode the token (without verification)
const jwt = require('jsonwebtoken');
const decoded = jwt.decode('YOUR_REFRESH_TOKEN');
console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Current time:', new Date());
```

---

### 3. **Wrong Token Being Sent**
You might be sending the access token instead of refresh token.

**Check:**
- Access tokens are shorter (expire in 15 min)
- Refresh tokens are longer (expire in 7 days)

---

## 🔧 **How to Fix:**

### **Option 1: Login Again and Save New Tokens**
```bash
POST /api/v1/auth/login
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "accessToken": "...",
  "refreshToken": "..."  // ← Save THIS one!
}
```

### **Option 2: Check Database**
Look at the `refreshToken` field in your user document in MongoDB.
It should match the token you're sending.

---

## 🎯 **Testing Steps:**

### Step 1: Fresh Login
```bash
POST /api/v1/auth/login
{
  "email": "pubgsoloking420@gmail.com",
  "password": "your_password"
}
```

### Step 2: Save BOTH Tokens
```json
{
  "accessToken": "eyJhbGc...",     // ← For API calls
  "refreshToken": "eyJhbGc..."     // ← For refresh
}
```

### Step 3: Use Access Token
```bash
GET /api/v1/dashboard/student
Authorization: Bearer <accessToken>
```

### Step 4: When Access Token Expires
```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "<the_refresh_token_from_step_2>"
}
```

### Step 5: Update Tokens
```json
{
  "accessToken": "NEW_ACCESS",     // ← Use this now
  "refreshToken": "NEW_REFRESH"    // ← Save this for next refresh
}
```

---

## ⚠️ **Important:**

1. **Always use the LATEST refresh token**
   - Each refresh gives you a NEW refresh token
   - Old refresh tokens become invalid

2. **Don't login multiple times**
   - Each login invalidates previous refresh tokens
   - Only the latest login's refresh token works

3. **Save tokens properly**
   - Save both access and refresh tokens after login
   - Update both after each refresh

---

## 🐛 **Debug Your Current Token:**

Run this to check your token:
```javascript
const jwt = require('jsonwebtoken');
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTYwYTQ1ZDRiZjU3NzliMTU2MzJhMzYiLCJlbWFpbCI6InB1Ymdzb2xva2luZzQyMEBnbWFpbC5jb20iLCJyb2xlIjoiU1RVREVOVCIsImlhdCI6MTc2Nzk1MTYyMCwiZXhwIjoxNzY4NTU2NDIwfQ.0oQMme5K3vrOp-ckohB9fGjHZNbvvMMGO9_O2eg91JQ";

const decoded = jwt.decode(token);
console.log('User ID:', decoded.userId);
console.log('Issued at:', new Date(decoded.iat * 1000));
console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Is expired?', Date.now() > decoded.exp * 1000);
```

---

## ✅ **Solution:**

**Do a fresh login and use the NEW tokens!**

The old refresh token you're using is no longer valid in the database.
