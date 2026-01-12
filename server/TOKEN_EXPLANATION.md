# Access Token & Refresh Token - Complete Explanation

## 🎯 The Problem We're Solving

**Question:** Why do we need TWO tokens instead of just one?

**Answer:** Security + User Experience

- **Short-lived token** (Access Token) = More secure
- **Long-lived token** (Refresh Token) = Better user experience
- Together = Secure AND convenient!

---

## 🔑 What Are These Tokens?

### Access Token (Short-lived)
- **Purpose:** Prove you're authenticated for API requests
- **Lifespan:** 15 minutes
- **Where:** Sent with EVERY API request
- **Storage:** Frontend (localStorage/memory)
- **Security:** If stolen, expires quickly

### Refresh Token (Long-lived)
- **Purpose:** Get new access tokens without re-login
- **Lifespan:** 7 days
- **Where:** Stored in database + frontend
- **Storage:** Database (User.refreshToken field) + Frontend
- **Security:** Can be invalidated server-side (logout)

---

## 📦 What's Inside a Token?

### JWT (JSON Web Token) Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1RVREVOVCJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Part 1: Header          Part 2: Payload              Part 3: Signature
(Algorithm info)        (User data)                  (Verification)
```

### Decoded Payload (What's inside):
```json
{
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "email": "john@example.com",
  "role": "STUDENT",
  "iat": 1704801600,  // Issued at timestamp
  "exp": 1704802500   // Expiration timestamp
}
```

---

## 🛠️ Implementation in Your Project

### 1. Environment Variables (.env)

```env
# Access Token (15 minutes)
ACCESS_TOKEN_SECRET=your-super-secret-access-key-here
ACCESS_TOKEN_EXPIRY=15m

# Refresh Token (7 days)
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-here
REFRESH_TOKEN_EXPIRY=7d
```

**Important:** These secrets MUST be different for security!

---

### 2. User Model (Database)

**File:** `src/models/User.ts`

```typescript
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Department;
  refreshToken?: string | null;  // ← Stores refresh token
  createdAt: Date;
  updatedAt: Date;
}
```

**Database Schema:**
```javascript
{
  refreshToken: {
    type: String,
    default: null,  // ← null when logged out
  }
}
```

---

### 3. JWT Utilities

**File:** `src/utils/jwt.ts`

#### Generate Tokens Function:
```typescript
export const generateTokens = (payload: JWTPayload): TokenPair => {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

  // Create Access Token (15 minutes)
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: '15m'
  });

  // Create Refresh Token (7 days)
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};
```

**What it does:**
- Takes user data (userId, email, role)
- Creates 2 separate tokens with different secrets
- Access token expires in 15 minutes
- Refresh token expires in 7 days

#### Verify Access Token:
```typescript
export const verifyAccessToken = (token: string): JWTPayload => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  return jwt.verify(token, secret) as JWTPayload;
};
```

#### Verify Refresh Token:
```typescript
export const verifyRefreshToken = (token: string): JWTPayload => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  return jwt.verify(token, secret) as JWTPayload;
};
```

---

## 🔄 Complete Authentication Flow

### Step 1: Login/Register

**Code:** `src/controllers/authController.ts`

```typescript
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 1. Verify user credentials
  const user = await User.findOne({ email });
  const isPasswordValid = await comparePassword(password, user.password);

  // 2. Generate BOTH tokens
  const { accessToken, refreshToken } = generateTokens({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  // 3. Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // 4. Send both tokens to frontend
  res.json({
    success: true,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,    // ← Frontend uses this for API calls
      refreshToken    // ← Frontend saves this for later
    }
  });
};
```

**What happens:**
```
User Login
    ↓
Generate 2 tokens
    ↓
Save refreshToken in database
    ↓
Send both tokens to frontend
```

---

### Step 2: Making API Requests

**Frontend sends access token:**
```javascript
fetch('/api/v1/tickets', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            ↑ Access Token
  }
});
```

**Backend verifies (when middleware is implemented):**
```typescript
// Future: src/middleware/auth.ts
export const authenticate = async (req, res, next) => {
  // 1. Extract token from header
  const token = req.headers.authorization?.split(' ')[1];

  // 2. Verify access token
  const decoded = verifyAccessToken(token);

  // 3. Attach user info to request
  req.user = decoded;
  next();
};
```

---

### Step 3: Access Token Expires (After 15 minutes)

**What happens:**
```
Frontend makes API call
    ↓
Access token expired
    ↓
Backend returns 401 Unauthorized
    ↓
Frontend detects 401
    ↓
Frontend calls /auth/refresh with refresh token
```

**Refresh Token API:**
```typescript
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // 1. Verify refresh token is valid (not expired)
  const decoded = verifyRefreshToken(refreshToken);

  // 2. Find user and check if token matches database
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid refresh token' 
    });
  }

  // 3. Generate NEW tokens
  const tokens = generateTokens({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  // 4. Update refresh token in database
  user.refreshToken = tokens.refreshToken;
  await user.save();

  // 5. Send new tokens to frontend
  res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  });
};
```

**Security Check:**
- Verifies refresh token signature (not tampered)
- Checks if token is expired
- Verifies token matches what's in database
- If all pass → Generate new tokens

---

### Step 4: Logout

```typescript
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // Find user and clear refresh token
  const user = await User.findOne({ refreshToken });
  if (user) {
    user.refreshToken = null;  // ← Invalidate token
    await user.save();
  }

  res.json({ success: true, message: 'Logged out successfully' });
};
```

**What happens:**
- Refresh token set to `null` in database
- Even if someone has the old refresh token, it won't work
- Must login again to get new tokens

---

## 🔐 Security Features

### 1. Different Secrets
```
Access Token  → Signed with ACCESS_TOKEN_SECRET
Refresh Token → Signed with REFRESH_TOKEN_SECRET
```
If one secret is compromised, the other is still safe.

### 2. Short Access Token Lifespan
- Expires in 15 minutes
- If stolen, attacker has limited time
- Automatically becomes invalid

### 3. Database Verification
```typescript
// Not just checking if token is valid
// Also checking if it matches database
if (user.refreshToken !== refreshToken) {
  throw new Error('Invalid refresh token');
}
```

### 4. Token Rotation
- Every refresh generates NEW tokens
- Old refresh token is replaced
- Prevents token reuse attacks

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    1. LOGIN/REGISTER                        │
│                                                             │
│  User sends credentials                                     │
│         ↓                                                   │
│  Server verifies                                            │
│         ↓                                                   │
│  Generate 2 tokens:                                         │
│    • accessToken (15m) → Frontend                           │
│    • refreshToken (7d) → Database + Frontend                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                2. USING THE APP (0-15 min)                  │
│                                                             │
│  Every API request:                                         │
│    Authorization: Bearer <accessToken>                      │
│         ↓                                                   │
│  Server verifies accessToken                                │
│         ↓                                                   │
│  Request processed ✅                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            3. ACCESS TOKEN EXPIRES (After 15 min)           │
│                                                             │
│  API request with expired accessToken                       │
│         ↓                                                   │
│  Server returns 401 Unauthorized                            │
│         ↓                                                   │
│  Frontend detects 401                                       │
│         ↓                                                   │
│  Frontend calls /auth/refresh                               │
│    Body: { refreshToken }                                   │
│         ↓                                                   │
│  Server verifies refreshToken:                              │
│    1. Check signature                                       │
│    2. Check expiration (7 days)                             │
│    3. Check database match                                  │
│         ↓                                                   │
│  Generate NEW tokens                                        │
│    • New accessToken (15m)                                  │
│    • New refreshToken (7d)                                  │
│         ↓                                                   │
│  Update database with new refreshToken                      │
│         ↓                                                   │
│  Send new tokens to frontend                                │
│         ↓                                                   │
│  Frontend retries original request ✅                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    4. LOGOUT                                │
│                                                             │
│  User clicks logout                                         │
│         ↓                                                   │
│  Frontend sends refreshToken to /auth/logout                │
│         ↓                                                   │
│  Server sets user.refreshToken = null in database           │
│         ↓                                                   │
│  Frontend clears tokens from storage                        │
│         ↓                                                   │
│  User logged out ✅                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Frontend Implementation Example

```javascript
// Store tokens after login
const handleLogin = async (email, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { accessToken, refreshToken } = response.data;

  // Store in localStorage
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

// API call with automatic token refresh
const apiCall = async (url, options = {}) => {
  let accessToken = localStorage.getItem('accessToken');

  // Try request with current access token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // If 401, refresh token and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Get new tokens
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
        await refreshResponse.json();

      // Update stored tokens
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response;
};

// Logout
const handleLogout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // Redirect to login
  window.location.href = '/login';
};
```

---

## ❓ Common Questions

### Q1: Why not just use one long-lived token?
**A:** If stolen, attacker has access for a long time. Short-lived access tokens limit damage.

### Q2: Why not just use short-lived tokens and make user login often?
**A:** Bad user experience. Refresh tokens let users stay logged in without constant re-authentication.

### Q3: Why store refresh token in database?
**A:** So we can invalidate it on logout. Without database storage, we can't revoke tokens.

### Q4: What if refresh token is stolen?
**A:** 
- It expires in 7 days
- User can logout to invalidate it
- Token rotation means old tokens become invalid
- Can implement IP/device tracking for extra security

### Q5: Can I have multiple devices logged in?
**A:** Currently, no. Each login replaces the refresh token. To support multiple devices, you'd need to store an array of refresh tokens.

---

## 🎯 Summary

**Access Token:**
- Short-lived (15 minutes)
- Used for API requests
- Not stored in database
- If stolen, expires quickly

**Refresh Token:**
- Long-lived (7 days)
- Used to get new access tokens
- Stored in database
- Can be invalidated (logout)

**Together:**
- Secure (short access token lifespan)
- Convenient (don't need to login every 15 minutes)
- Controllable (can logout/invalidate from server)

**The Magic:**
```
Short-lived security + Long-lived convenience = Perfect balance! ⚖️
```
