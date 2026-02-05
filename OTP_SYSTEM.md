# OTP Verification System Documentation

## Overview
Complete OTP (One-Time Password) verification system with SMS delivery via AWS SNS.

## Features
- ✅ Generate 6-digit random OTP
- ✅ Verify phone number exists in `generations` table
- ✅ Store OTP in `verification` table with 10-minute expiration
- ✅ Replace existing OTP when requested again
- ✅ Send OTP via AWS SNS SMS
- ✅ Verify OTP with rate limiting (max 5 attempts)
- ✅ Auto-expire OTPs after 10 minutes

## Database Schema

### Verification Table
```sql
CREATE TABLE verification (
  id UUID PRIMARY KEY,
  phone_no TEXT UNIQUE NOT NULL,
  otp TEXT NOT NULL,
  generation_id UUID REFERENCES generations(id),
  created_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  attempts INTEGER DEFAULT 0
);
```

## Setup Instructions

### 1. Create Verification Table
```bash
# Run this SQL in Supabase SQL Editor
supabase-verification-table.sql
```

### 2. Configure AWS SNS
1. Go to AWS Console → IAM
2. Create new user with `AmazonSNSFullAccess` policy
3. Generate Access Key ID and Secret Access Key
4. Add to `.env.local`:
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Enable AWS SNS for SMS
1. Go to AWS Console → SNS → Text messaging (SMS)
2. Request production access (optional, for high volume)
3. Set default sender ID and message type

## API Endpoints

### 1. Generate OTP
**POST** `/api/otp/generate`

**Request:**
```json
{
  "phone_no": "+919876543210"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone_no": "+919876543210",
  "expires_in_minutes": 10,
  "otp": "123456"  // Only in development
}
```

**Response (Error - Phone Not Found):**
```json
{
  "error": "Phone number not registered. Please generate an avatar first."
}
```

**Flow:**
1. Validates phone number format
2. Checks if phone exists in `generations` table
3. Generates random 6-digit OTP
4. Checks if OTP already exists for phone
5. If exists: **replaces old OTP** with new one
6. If not exists: creates new entry
7. Sets expiry to 10 minutes from now
8. Sends OTP via AWS SNS SMS
9. Returns success response

### 2. Verify OTP
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
  "verified_at": "2026-02-05T10:30:00Z",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "+919876543210",
    "generated_image_url": "https://..."
  }
}
```

**Response (Error - Invalid OTP):**
```json
{
  "error": "Invalid OTP",
  "attempts_remaining": 3
}
```

**Response (Error - Expired):**
```json
{
  "error": "OTP has expired. Please request a new OTP.",
  "expired_at": "2026-02-05T10:20:00Z"
}
```

**Response (Error - Too Many Attempts):**
```json
{
  "error": "Too many failed attempts. Please request a new OTP.",
  "max_attempts": 5
}
```

**Flow:**
1. Validates phone number and OTP format
2. Fetches verification record from database
3. Checks if already verified (returns success)
4. Checks if OTP expired
5. Checks attempt count (max 5 attempts)
6. Compares OTP with stored value
7. If incorrect: increments attempts, returns error
8. If correct: marks as verified, returns user data

## Security Features

### Rate Limiting
- Maximum 5 OTP verification attempts per phone number
- After 5 failed attempts, user must request new OTP

### OTP Expiration
- OTPs expire after **10 minutes**
- Expired OTPs cannot be verified
- Auto-cleanup function removes expired OTPs

### OTP Replacement
- Requesting new OTP **replaces existing OTP**
- Prevents multiple active OTPs for same phone
- Resets attempt counter

## SMS Message Template
```
Your Conclave 2026 verification code is: {OTP}. Valid for 10 minutes. Do not share this code.
```

## Testing

### Development Mode
In development, OTP is returned in API response for easy testing:
```bash
curl -X POST http://localhost:3000/api/otp/generate \
  -H "Content-Type: application/json" \
  -d '{"phone_no": "+919876543210"}'
```

### Production Mode
In production, OTP is only sent via SMS (not in response).

## Error Handling

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| Phone number not registered | 404 | Phone not in generations table | Generate avatar first |
| Invalid phone format | 400 | Wrong phone number format | Use +[country][number] format |
| Invalid OTP format | 400 | OTP not 6 digits | Enter valid 6-digit OTP |
| OTP expired | 400 | More than 10 minutes passed | Request new OTP |
| Too many attempts | 429 | Failed 5+ times | Request new OTP |
| Invalid OTP | 400 | Wrong OTP entered | Try again (attempts remaining) |
| SMS sending failed | 500 | AWS SNS error | Check AWS credentials |

## Database Cleanup

### Manual Cleanup
```sql
-- Delete expired OTPs
DELETE FROM verification 
WHERE expires_at < NOW() AND verified = FALSE;
```

### Automatic Cleanup (Optional)
Schedule cleanup every hour:
```sql
SELECT cron.schedule(
  'cleanup-expired-otps', 
  '0 * * * *', 
  'SELECT delete_expired_otps()'
);
```

## AWS SNS Pricing
- India (ap-south-1): ~$0.00445 per SMS
- First 100 SMS/month may be free (check AWS Free Tier)
- Monitor costs in AWS Cost Explorer

## Troubleshooting

### SMS Not Sending
1. Check AWS credentials in `.env.local`
2. Verify AWS SNS permissions (AmazonSNSFullAccess)
3. Check phone number format (+country code required)
4. Check AWS SNS sandbox mode (may need production access)

### OTP Not Expiring
1. Check `expires_at` timestamp in database
2. Run manual cleanup query
3. Verify server timezone matches database timezone

### "Phone number not registered" Error
1. User must generate avatar first via `/api/generate`
2. Phone number must exist in `generations` table
3. Phone number format must match exactly

## Integration Example

### Frontend Integration
```typescript
// Generate OTP
async function requestOTP(phoneNo: string) {
  const response = await fetch('/api/otp/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_no: phoneNo })
  });
  
  const data = await response.json();
  if (data.success) {
    alert('OTP sent to your phone!');
  }
}

// Verify OTP
async function verifyOTP(phoneNo: string, otp: string) {
  const response = await fetch('/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_no: phoneNo, otp })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('Verified user:', data.user);
    // Proceed to download image or next step
  }
}
```

## Security Best Practices
- ✅ Use HTTPS only
- ✅ Never log OTP in production
- ✅ Rate limit OTP generation (prevent spam)
- ✅ Monitor SMS costs
- ✅ Implement CAPTCHA for OTP generation
- ✅ Use country-specific phone validation
- ✅ Mask phone number in responses
