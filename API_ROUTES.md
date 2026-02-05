# Conclave 2026 - API Routes Documentation

## Overview
Complete API routing guide for avatar generation, OTP verification, and user management.

---

## 1. Avatar Generation Endpoints

### Standard Route
**POST** `/api/generate`
- **Timeout:** 300s (5 minutes)
- **Storage:** AWS S3 (frameforge bucket)
- **AI Model:** sourceful/riverflow-v2-fast-preview

**Request:**
```
Content-Type: multipart/form-data

Fields:
- photo (File) - JPEG/PNG, max 2MB
- name (string) - Required
- email (string) - Valid email required
- phone_no (string) - 10-15 digits with optional +
- district (string) - Required
- category (string) - One of: Startups, Working Professionals, Students, Business Owners, NRI / Gulf Retunees, Government Officials
- organization (string) - Required
- prompt_type (string) - One of: prompt1, prompt2, prompt3
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "name": "John Doe",
  "organization": "TechCorp",
  "aws_key": "uploads/timestamp/filename",
  "photo_url": "s3-url",
  "generated_image_url": "s3-url",
  "final_image_url": "s3-url"
}
```

### Conclave 2026 Route (Superhero)
**POST** `/scaleup2026/generate`
- **Timeout:** 600s (10 minutes)
- **Storage:** AWS S3 (frameforge bucket)
- **AI Model:** sourceful/riverflow-v2-fast-preview
- **Specialization:** Superhero/Professional style avatars

**Same request/response as `/api/generate`**

---

## 2. OTP Generation Endpoints

### Standard Route
**POST** `/api/otp/generate`

**Request:**
```json
{
  "phone_no": "+919876543210"
}
```

**Response (Development):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone_no": "+919876543210",
  "expires_in_minutes": 10,
  "otp": "123456"
}
```

**Response (Production):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone_no": "+919876543210",
  "expires_in_minutes": 10
}
```

**Error Responses:**
```json
// Phone number not registered
{
  "error": "Phone number not registered. Please generate an avatar first.",
  "status": 404
}

// Invalid format
{
  "error": "Invalid phone number format. Must be 10-15 digits."
}

// S3/SMS failure
{
  "error": "Failed to send OTP"
}
```

### Conclave 2026 Route
**POST** `/scaleup2026/otp/generate`

**Same request/response as `/api/otp/generate`**

---

## 3. OTP Verification Endpoints

### Standard Route
**POST** `/api/otp/verify`

**Request:**
```json
{
  "phone_no": "+919876543210",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "verified_at": "2026-02-05T10:30:45.123Z",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "+919876543210",
    "generated_image_url": "s3-url"
  }
}
```

**Error Responses:**
```json
// Already verified
{
  "success": true,
  "message": "Phone number already verified",
  "verified_at": "2026-02-05T10:30:45.123Z"
}

// OTP expired
{
  "error": "OTP has expired. Please request a new OTP.",
  "expired_at": "2026-02-05T10:40:45.123Z",
  "status": 400
}

// Too many attempts
{
  "error": "Too many failed attempts. Please request a new OTP.",
  "max_attempts": 5,
  "status": 429
}

// Invalid OTP
{
  "error": "Invalid OTP",
  "attempts_remaining": 3,
  "status": 400
}
```

### Conclave 2026 Route
**POST** `/scaleup2026/otp/verify`

**Same request/response as `/api/otp/verify`**

---

## 4. User Update Endpoints

### Standard Route
**PUT** `/api/user/[userId]/update`

**Request:**
```json
{
  "name": "Updated Name",
  "organization": "Updated Company"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User details updated successfully",
  "user": {
    "id": "user-uuid",
    "name": "Updated Name",
    "organization": "Updated Company",
    "updated_at": "2026-02-05T10:30:45.123Z"
  }
}
```

**Error Responses:**
```json
// Invalid input
{
  "error": "Valid name is required"
}

// User not found
{
  "error": "User not found",
  "status": 404
}
```

### Conclave 2026 Route
**PUT** `/scaleup2026/user/[userId]/update`

**Same request/response as `/api/user/[userId]/update`**

---

## 5. Prompt Types for Avatar Generation

### prompt1 - Superhero Style
- DC-style realism
- Deep blue superhero suit
- Red/yellow geometric emblem
- Dramatic cinematic lighting
- Best for: Bold, heroic avatars

### prompt2 - Professional Style
- Corporate aesthetic
- Executive suit attire
- Arms-crossed positioning
- Refined and confident
- Best for: Professional headshots

### prompt3 - Medieval Warrior Style
- Historical realism
- Leather/chainmail/plate armor
- Torch-like lighting
- Noble and grounded
- Best for: Epic/historical styled avatars

---

## 6. Database Tables

### generations table
```
id (UUID)
name (string)
email (string)
phone_no (string)
district (string)
category (string)
organization (string)
photo_url (string)
generated_image_url (string)
aws_key (string)
prompt_type (string)
created_at (timestamp)
updated_at (timestamp)
```

### verification table
```
id (UUID)
phone_no (string) - UNIQUE
otp (string)
generation_id (UUID) - FOREIGN KEY
created_at (timestamp)
expires_at (timestamp)
verified (boolean)
verified_at (timestamp)
attempts (integer)
```

---

## 7. Environment Variables Required

```env
# AWS S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# Node Environment
NODE_ENV=production
```

---

## 8. Complete API Workflow Example

### Step 1: Generate Avatar
```bash
POST /scaleup2026/generate
Content-Type: multipart/form-data

name=John Doe
email=john@example.com
phone_no=+919876543210
district=Maharashtra
category=Startups
organization=TechCorp
prompt_type=prompt1
photo=<image_file>
```

**Response includes:** user_id, final_image_url

### Step 2: Request OTP
```bash
POST /scaleup2026/otp/generate
Content-Type: application/json

{
  "phone_no": "+919876543210"
}
```

**Response includes:** otp (in dev mode), expires_in_minutes

### Step 3: Verify OTP
```bash
POST /scaleup2026/otp/verify
Content-Type: application/json

{
  "phone_no": "+919876543210",
  "otp": "123456"
}
```

**Response includes:** verified_at, user details

### Step 4: Update User (Optional)
```bash
PUT /scaleup2026/user/{user_id}/update
Content-Type: application/json

{
  "name": "Updated Name",
  "organization": "Updated Company"
}
```

**Response includes:** updated user object

---

## 9. Error Handling

All endpoints return standard error format:
```json
{
  "error": "Error message",
  "details": "Additional context (dev only)",
  "status": 400
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad request / Validation error
- 404: Resource not found
- 429: Too many attempts (rate limiting)
- 500: Server error
- 504: Gateway timeout

---

## 10. Rate Limiting & Timeouts

| Endpoint | Timeout | Rate Limit |
|----------|---------|-----------|
| `/api/generate` | 300s | None |
| `/scaleup2026/generate` | 600s | None |
| `/api/otp/generate` | 30s | None |
| `/scaleup2026/otp/generate` | 30s | None |
| `/api/otp/verify` | 30s | 5 attempts max |
| `/scaleup2026/otp/verify` | 30s | 5 attempts max |
| OTP Expiration | - | 10 minutes |

---

## 11. Testing with Postman

### Import Collection
```json
{
  "info": {
    "name": "Conclave 2026 APIs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate Avatar",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/scaleup2026/generate"
      }
    },
    {
      "name": "Generate OTP",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/scaleup2026/otp/generate",
        "body": {
          "mode": "raw",
          "raw": "{\"phone_no\": \"+919876543210\"}"
        }
      }
    },
    {
      "name": "Verify OTP",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/scaleup2026/otp/verify",
        "body": {
          "mode": "raw",
          "raw": "{\"phone_no\": \"+919876543210\", \"otp\": \"123456\"}"
        }
      }
    },
    {
      "name": "Update User",
      "request": {
        "method": "PUT",
        "url": "http://localhost:3000/scaleup2026/user/USER_ID/update",
        "body": {
          "mode": "raw",
          "raw": "{\"name\": \"Updated Name\", \"organization\": \"Updated Org\"}"
        }
      }
    }
  ]
}
```

---

## 12. Storage & Infrastructure

### AWS S3 (frameforge bucket)
- **Region:** ap-south-1
- **Folders:**
  - `uploads/` - Original user photos
  - `generated/` - AI-generated images
  - `final/` - Final merged images with background
- **Access:** Public read for generated images

### Supabase PostgreSQL
- **Database:** generations, verification tables
- **Row Level Security (RLS):** Enabled
- **Backups:** Automatic daily backups

---

## 13. SMS Integration (AWS SNS)

**SMS Format:**
```
Your Conclave 2026 verification code is: {OTP}. Valid for 10 minutes. Do not share this code.
```

**Configuration:**
- Service: AWS SNS
- Region: ap-south-1
- Phone formatting: Auto-adds +91 prefix if missing
- SMS Type: Transactional

---

## 14. Security Features

✅ **Implemented:**
- Phone number validation (10-15 digits)
- Email format validation
- OTP expiration (10 minutes)
- Attempt limiting (max 5 verification attempts)
- AWS SNS encryption for SMS
- S3 signed URLs for secure access
- Database RLS policies
- Service role authentication
- Rate limiting on OTP routes

⚠️ **Best Practices:**
- Never expose OTP in production responses
- Use HTTPS only in production
- Rotate AWS credentials regularly
- Monitor SMS delivery failures
- Clean up expired OTPs (daily cron job recommended)
