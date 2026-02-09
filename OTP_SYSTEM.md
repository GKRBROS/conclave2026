# Email OTP Verification System Documentation

## Overview
Secure Email-based OTP (One-Time Password) verification system. The backend generates the OTP and returns it in the API response, allowing the frontend to send the email via SMTP.

## Features
- ✅ Generate 6-digit random OTP
- ✅ Verify email exists in `generations` table
- ✅ Store OTP in `verification` table with 10-minute expiration
- ✅ Replace existing OTP when requested again
- ✅ Return OTP in API response for frontend SMTP handling
- ✅ Verify OTP with rate limiting (max 5 attempts)
- ✅ Auto-expire OTPs after 10 minutes

## Database Schema (Updated)

### Verification Table
```sql
ALTER TABLE verification ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE verification ALTER COLUMN phone_no DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification(email);
```

## API Endpoints

### 1. Generate OTP
**POST** `/scaleup2026/otp/generate`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "email": "user@example.com",
  "otp": "123456",
  "expires_in_minutes": 10
}
```

### 2. Verify OTP
**POST** `/scaleup2026/otp/verify`

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verified_at": "2026-02-09T14:30:00Z",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "phone_no": "917736526607",
    "generated_image_url": "https://..."
  }
}
```

## Postman Testing Guide

### 1. Setup Environment
- Set `base_url` to `http://localhost:3000` (or your deployed URL)
- Set `Content-Type` header to `application/json`

### 2. Request OTP
- **Method**: `POST`
- **URL**: `{{base_url}}/scaleup2026/otp/generate`
- **Body** (raw JSON):
  ```json
  {
    "email": "your-email@example.com"
  }
  ```
- **Goal**: Copy the `otp` from the response.

### 3. Verify OTP
- **Method**: `POST`
- **URL**: `{{base_url}}/scaleup2026/otp/verify`
- **Body** (raw JSON):
  ```json
  {
    "email": "your-email@example.com",
    "otp": "123456"
  }
  ```

## Security Features
- **Rate Limiting**: Max 5 verification attempts per email.
- **Expiration**: OTPs expire after 10 minutes.
- **Replacement**: Requesting a new OTP invalidates the old one.
