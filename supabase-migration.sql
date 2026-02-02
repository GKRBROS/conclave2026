-- ============================================
-- MIGRATION SCRIPT - UPDATE EXISTING DATABASE
-- ============================================
-- Run this ONLY if you already have a database with generations table
-- This script adds new columns and updates the schema

-- ============================================
-- STEP 1: Add new columns to existing table
-- ============================================

-- Add email column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS email TEXT;

-- Add edit_name column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS edit_name TEXT;

-- Add phone_no column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS phone_no TEXT;

-- Add photo_url column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add aws_key column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS aws_key TEXT;

-- Add updated_at column
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- STEP 2: Rename old column (if exists)
-- ============================================

-- Rename image_url to generated_image_url if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name='generations' 
    AND column_name='image_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name='generations' 
    AND column_name='generated_image_url'
  ) THEN
    ALTER TABLE public.generations RENAME COLUMN image_url TO generated_image_url;
    RAISE NOTICE 'Renamed image_url to generated_image_url';
  END IF;
END $$;

-- Or add generated_image_url if neither exists
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS generated_image_url TEXT;

-- ============================================
-- STEP 3: Add validation constraints
-- ============================================

-- Add email format constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format') THEN
    ALTER TABLE public.generations ADD CONSTRAINT email_format 
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added email_format constraint';
  END IF;
END $$;

-- Add phone format constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_format') THEN
    ALTER TABLE public.generations ADD CONSTRAINT phone_format 
      CHECK (phone_no IS NULL OR phone_no ~* '^\+?[0-9]{10,15}$');
    RAISE NOTICE 'Added phone_format constraint';
  END IF;
END $$;

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_generations_email ON public.generations(email);
CREATE INDEX IF NOT EXISTS idx_generations_phone ON public.generations(phone_no);

-- ============================================
-- STEP 5: Create/Update trigger for updated_at
-- ============================================

-- Create function for updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_generations_updated_at ON public.generations;

-- Create new trigger
CREATE TRIGGER update_generations_updated_at 
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Update existing rows (optional)
-- ============================================

-- Set default values for existing rows if needed
-- Uncomment these lines if you want to set defaults:

-- UPDATE public.generations 
-- SET updated_at = created_at 
-- WHERE updated_at IS NULL;

-- UPDATE public.generations 
-- SET email = 'unknown@example.com' 
-- WHERE email IS NULL;

-- UPDATE public.generations 
-- SET phone_no = '0000000000' 
-- WHERE phone_no IS NULL;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify all columns exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'generations'
ORDER BY ordinal_position;

-- ============================================
-- DONE!
-- ============================================
-- Your database schema is now updated.
-- The API should work correctly now.
