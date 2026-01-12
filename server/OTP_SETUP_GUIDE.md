# OTP Email Verification - Setup Guide

## ✅ What Was Implemented

### 1. **User Model Updates**
- Added `isVerified` field (default: false)
- Added `verificationOTP` field (stores 4-digit code)
- Added `otpExpiry` field (OTP valid for 10 minutes)

### 2. **Email Service** (`src/utils/email.ts`)
- Nodemailer configuration
- `generateOTP()` - Creates 4-digit random code
- `sendOTPEmail()` - Sends verification email with OTP
- `sendWelcomeEmail()` - Sends welcome email after verification

### 3. **New API Endpoints**
- `POST /api/v1/auth/register` - Sends OTP (doesn't create verified user)
- `POST /api/v1/auth/verify-otp` - Verifies OTP and completes registration
- `POST /api/v1/auth/resend-otp` - Resends OTP if expired

### 4. **Updated Login**
- Now checks if email is verified before allowing login

---

## 🔧 Email Configuration Required

### Step 1: Add to `.env` file

```env
# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Student Ticketing System
```

### Step 2: Gmail Setup (If using Gmail)

1. **Enable 2-Factor Authentication**
   - Go to Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to Google Account → Security → App passwords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `EMAIL_PASSWORD` in .env

3. **Alternative: Use "Less Secure Apps"** (Not Recommended)
   - Not recommended for production
   - Only for testing

### Step 3: Other Email Providers

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-smtp-username
EMAIL_PASSWORD=your-mailgun-smtp-password
```

---

## 📋 New Registration Flow

### Old Flow (Before OTP):
```
Register → User Created → Login
```

### New Flow (With OTP):
```
Register → OTP Sent → Verify OTP → User Verified → Login
```

---

## 🧪 Testing the OTP System

### Test 1: Register (Send OTP)
```bash
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification OTP sent to your email. Please check your inbox.",
  "data": {
    "email": "john@example.com",
    "otpExpiresIn": "10 minutes"
  }
}
```

**Check your email for 4-digit OTP!**

---

### Test 2: Verify OTP
```bash
POST http://localhost:5000/api/v1/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "1234"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully! You are now registered.",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### Test 3: Resend OTP (if expired)
```bash
POST http://localhost:5000/api/v1/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "New OTP sent to your email",
  "data": {
    "email": "john@example.com",
    "otpExpiresIn": "10 minutes"
  }
}
```

---

### Test 4: Login (Only works after verification)
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**If NOT verified:**
```json
{
  "success": false,
  "message": "Please verify your email before logging in. Check your inbox for the OTP."
}
```

**If verified:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": { ... }
}
```

---

## 📧 Email Templates

### OTP Email
- Professional HTML design
- 4-digit code prominently displayed
- 10-minute expiry warning
- Security reminders

### Welcome Email
- Sent automatically after verification
- Confirms successful registration
- Encourages user to start using the system

---

## ⚠️ Important Notes

1. **OTP Expiry**: 10 minutes
2. **OTP Length**: 4 digits (1000-9999)
3. **Unverified Users**: Cannot login until verified
4. **Re-registration**: If user registers again before verifying, OTP is updated
5. **Email Required**: Make sure to configure email settings in `.env`

---

## 🔒 Security Features

- ✅ OTP expires after 10 minutes
- ✅ OTP cleared from database after verification
- ✅ Users cannot login without verification
- ✅ Prevents spam registrations
- ✅ Validates email ownership

---

## 🎯 Next Steps

1. **Configure Email** - Add email credentials to `.env`
2. **Test Registration** - Try the complete flow
3. **Check Spam Folder** - Emails might go to spam initially
4. **Production**: Use professional email service (SendGrid, Mailgun, AWS SES)

---

**Status:** OTP Email Verification Fully Implemented! 🎉
