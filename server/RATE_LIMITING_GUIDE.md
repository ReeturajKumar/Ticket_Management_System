# Rate Limiting & Resilience - Implementation Guide

## 🎯 **What Was Implemented:**

### **1. Rate Limiting (Prevent Abuse)**
Protects your APIs from brute force attacks, spam, and DDoS.

### **2. Resilience & Fault Isolation**
Prevents one failing API from crashing your entire server.

---

## 🛡️ **Rate Limiting Configuration:**

### **Endpoint-Specific Limits:**

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| **Login** | 5 attempts | 15 min | Prevent brute force attacks |
| **Register** | 3 attempts | 10 min | Prevent spam registrations |
| **Verify OTP** | 5 attempts | 5 min | Prevent OTP guessing |
| **Resend OTP** | 3 attempts | 10 min | Prevent OTP flooding |
| **Forgot Password** | 3 attempts | 1 hour | Prevent email bombing |
| **Reset Password** | 5 attempts | 15 min | Prevent token guessing |
| **Profile APIs** | 10 requests | 1 min | Normal usage protection |
| **Global** | 100 requests | 15 min | Overall server protection |

---

## 📊 **How It Works:**

### **Rate Limiting:**
```
User makes request → Check rate limit → 
  ✅ Within limit → Process request
  ❌ Exceeded limit → Return 429 error
```

### **Response When Limited:**
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again after 15 minutes."
}
```

### **Rate Limit Headers:**
Every response includes:
```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 1704801234
```

---

## 🔧 **Resilience Features:**

### **1. Async Error Handler**
Catches errors in async functions, prevents unhandled rejections.

```typescript
// Wraps async route handlers
asyncHandler(async (req, res) => {
  // Your code here
  // Any error will be caught and handled gracefully
});
```

### **2. Route Isolation**
Errors in one route don't crash the server.

```typescript
// Each route is isolated
routeIsolation('auth/login')
// If login fails, other routes keep working
```

### **3. Health Monitoring**
Automatically disables failing endpoints.

**How it works:**
- Tracks errors per endpoint
- If 10 errors occur → Endpoint disabled for 5 minutes
- Auto-recovery after 5 minutes
- Other endpoints continue working normally

**Example:**
```
Login endpoint fails 10 times → 
  Disabled for 5 minutes → 
    Returns 503 "Service Unavailable" → 
      Auto-recovers after 5 minutes
```

---

## 🧪 **Testing Rate Limiting:**

### **Test 1: Hit Login 6 Times**
```bash
# Request 1-5: Success
POST /api/v1/auth/login (works)
POST /api/v1/auth/login (works)
POST /api/v1/auth/login (works)
POST /api/v1/auth/login (works)
POST /api/v1/auth/login (works)

# Request 6: Rate limited
POST /api/v1/auth/login
Response: 429 Too Many Requests
{
  "success": false,
  "message": "Too many authentication attempts, please try again after 15 minutes."
}
```

### **Test 2: Check Rate Limit Headers**
```bash
curl -I http://localhost:5000/api/v1/auth/login

Response Headers:
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1704801234
```

### **Test 3: Global Rate Limit**
```bash
# Make 101 requests to ANY endpoint
# Request 101 will be blocked:
Response: 429 Too Many Requests
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## 🔒 **Security Benefits:**

### **Prevents:**
- ✅ Brute force login attacks
- ✅ OTP guessing attacks
- ✅ Email bombing (password reset spam)
- ✅ Spam account creation
- ✅ DDoS attacks
- ✅ API abuse

### **Protects:**
- ✅ Server resources
- ✅ Database from overload
- ✅ Email service from spam
- ✅ User accounts from unauthorized access

---

## 🚀 **Resilience Benefits:**

### **Fault Isolation:**
- ✅ One failing API doesn't crash server
- ✅ Automatic endpoint recovery
- ✅ Graceful degradation
- ✅ Service continues for other endpoints

### **Example Scenario:**
```
Ticket API has a bug and crashes →
  Health monitor detects 10 errors →
    Disables Ticket API for 5 minutes →
      Returns 503 to users →
        Auth, Profile APIs continue working normally ✅
          Ticket API auto-recovers after 5 minutes ✅
```

---

## ⚙️ **Configuration:**

### **Adjust Limits (if needed):**
Edit `src/middleware/rateLimiter.ts`:

```typescript
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Change time window
  max: 5,                    // Change max requests
  message: {                 // Customize message
    success: false,
    message: 'Your custom message',
  },
});
```

### **Disable Rate Limiting (Development):**
Comment out in `src/index.ts`:
```typescript
// app.use(globalLimiter); // Disabled for testing
```

---

## 📋 **Files Created:**

1. **`src/middleware/rateLimiter.ts`**
   - Global limiter
   - Auth limiter
   - OTP limiters
   - Password reset limiter
   - Profile limiter
   - Ticket creation limiter

2. **`src/middleware/resilience.ts`**
   - Async error handler
   - Route isolation
   - Health monitoring
   - Error tracking

---

## 🎯 **Production Recommendations:**

### **When Deploying:**

1. **Add Redis** (for multi-server setups):
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const client = new Redis();

export const authLimiter = rateLimit({
  store: new RedisStore({ client }),
  // ... other options
});
```

2. **Monitor Rate Limits:**
   - Track 429 responses
   - Adjust limits based on usage
   - Alert on excessive rate limiting

3. **Whitelist IPs** (if needed):
```typescript
skip: (req) => {
  return req.ip === 'trusted-ip-address';
}
```

---

## ✅ **Success Criteria:**

- ✅ Rate limiting active on all auth endpoints
- ✅ Global rate limit protecting entire API
- ✅ Error isolation preventing server crashes
- ✅ Health monitoring auto-recovering endpoints
- ✅ Proper error messages returned
- ✅ Rate limit headers in responses

---

## 🎉 **Status:**

**Rate Limiting: FULLY IMPLEMENTED** ✅  
**Resilience: FULLY IMPLEMENTED** ✅  
**Server Protection: ACTIVE** ✅

Your server is now protected from abuse and resilient to failures! 🚀
