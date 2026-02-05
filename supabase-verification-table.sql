-- ============================================
-- OTP Verification Table
-- ============================================
-- Create verification table for storing OTPs

CREATE TABLE IF NOT EXISTS public.verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_no TEXT NOT NULL UNIQUE,
  otp TEXT NOT NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0
);

-- Index for fast phone number lookup
CREATE INDEX IF NOT EXISTS idx_verification_phone ON public.verification(phone_no);

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_verification_expires ON public.verification(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

-- Allow service_role to do everything
CREATE POLICY "Service role has full access to verification"
ON public.verification
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own verification
CREATE POLICY "Users can read own verification"
ON public.verification
FOR SELECT
TO authenticated
USING (phone_no = current_setting('request.jwt.claims', true)::json->>'phone');

-- ============================================
-- Automatic Cleanup Function (delete expired OTPs)
-- ============================================
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification
  WHERE expires_at < NOW() AND verified = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Optional: Schedule cleanup every hour
-- ============================================
-- Run this in Supabase SQL Editor to schedule automatic cleanup:
-- SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT delete_expired_otps()');

-- ============================================
-- USAGE:
-- ============================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. The verification table will be created
-- 3. OTPs will auto-expire after 10 minutes
-- 4. Use the /api/otp/generate and /api/otp/verify endpoints
-- ============================================
