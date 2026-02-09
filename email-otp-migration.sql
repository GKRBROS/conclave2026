-- Add email column to verification table for email-based OTP
ALTER TABLE verification ADD COLUMN IF NOT EXISTS email TEXT;

-- For email-based OTP, phone_no should be optional
ALTER TABLE verification ALTER COLUMN phone_no DROP NOT NULL;

-- Add index on email for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification(email);
