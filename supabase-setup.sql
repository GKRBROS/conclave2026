-- ============================================
-- SUPABASE SETUP FOR AI IMAGE GENERATOR
-- ============================================

-- 1. Create Storage Bucket for Generated Images (if not exists)
-- Run this in Supabase Dashboard > Storage > Create Bucket
-- OR use the Supabase Dashboard UI to create a bucket named 'generated-images'
-- Make sure to set it as PUBLIC so images can be accessed via URL

-- Create bucket only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-images') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('generated-images', 'generated-images', true);
    RAISE NOTICE 'Created storage bucket: generated-images';
  ELSE
    RAISE NOTICE 'Storage bucket already exists: generated-images';
  END IF;
END $$;

-- 2. Set up Storage Policy (Allow public read access)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access'
  ) THEN
    EXECUTE 'CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = ''generated-images'')';
    RAISE NOTICE 'Created policy: Public Access';
  ELSE
    RAISE NOTICE 'Policy already exists: Public Access';
  END IF;
END $$;

-- 3. Allow authenticated uploads (if you add auth later)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''generated-images'')';
    RAISE NOTICE 'Created policy: Authenticated users can upload';
  ELSE
    RAISE NOTICE 'Policy already exists: Authenticated users can upload';
  END IF;
END $$;

-- ============================================
-- 4. ALTER EXISTING TABLE (for existing databases)
-- ============================================
-- If table already exists, use these ALTER commands to add new columns:

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='email') THEN
    ALTER TABLE public.generations ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add edit_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='edit_name') THEN
    ALTER TABLE public.generations ADD COLUMN edit_name TEXT;
  END IF;
END $$;

-- Add phone_no column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='phone_no') THEN
    ALTER TABLE public.generations ADD COLUMN phone_no TEXT;
  END IF;
END $$;

-- Add photo_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='photo_url') THEN
    ALTER TABLE public.generations ADD COLUMN photo_url TEXT;
  END IF;
END $$;

-- Add generated_image_url column if it doesn't exist (rename from image_url if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='generated_image_url') THEN
    -- Check if old column exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema='public' AND table_name='generations' AND column_name='image_url') THEN
      ALTER TABLE public.generations RENAME COLUMN image_url TO generated_image_url;
    ELSE
      ALTER TABLE public.generations ADD COLUMN generated_image_url TEXT;
    END IF;
  END IF;
END $$;

-- Add aws_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='aws_key') THEN
    ALTER TABLE public.generations ADD COLUMN aws_key TEXT;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='updated_at') THEN
    ALTER TABLE public.generations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Update NOT NULL constraints
ALTER TABLE public.generations ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.generations ALTER COLUMN designation SET NOT NULL;

-- Make new required columns NOT NULL (only if they have data or set defaults)
-- Uncomment these after adding data or setting defaults:
-- ALTER TABLE public.generations ALTER COLUMN email SET NOT NULL;
-- ALTER TABLE public.generations ALTER COLUMN phone_no SET NOT NULL;
-- ALTER TABLE public.generations ALTER COLUMN photo_url SET NOT NULL;
-- ALTER TABLE public.generations ALTER COLUMN generated_image_url SET NOT NULL;

-- Add or replace constraints
DO $$ 
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format') THEN
    ALTER TABLE public.generations DROP CONSTRAINT email_format;
  END IF;
  -- Add new constraint
  ALTER TABLE public.generations ADD CONSTRAINT email_format 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
END $$;

DO $$ 
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_format') THEN
    ALTER TABLE public.generations DROP CONSTRAINT phone_format;
  END IF;
  -- Add new constraint
  ALTER TABLE public.generations ADD CONSTRAINT phone_format 
    CHECK (phone_no IS NULL OR phone_no ~* '^\+?[0-9]{10,15}$');
END $$;

-- ============================================
-- OR CREATE NEW TABLE (for fresh databases)
-- ============================================
-- If table doesn't exist, create it with full schema:
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  edit_name TEXT,
  email TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  designation TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  aws_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone_no ~* '^\+?[0-9]{10,15}$')
);

-- 5. Enable Row Level Security (RLS)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'generations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on generations table';
  ELSE
    RAISE NOTICE 'RLS already enabled on generations table';
  END IF;
END $$;

-- 6. Create Policy for Public Read Access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'generations' 
    AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.generations FOR SELECT USING (true)';
    RAISE NOTICE 'Created policy: Allow public read access';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public read access';
  END IF;
END $$;

-- 7. Create Policy for Insert (Allow anyone to insert for now)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'generations' 
    AND policyname = 'Allow public insert'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public insert" ON public.generations FOR INSERT WITH CHECK (true)';
    RAISE NOTICE 'Created policy: Allow public insert';
  ELSE
    RAISE NOTICE 'Policy already exists: Allow public insert';
  END IF;
END $$;

-- ============================================
-- INDEXES for better performance
-- ============================================
-- Create indexes (will skip if already exist)
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_name ON public.generations(name);
CREATE INDEX IF NOT EXISTS idx_generations_email ON public.generations(email);
CREATE INDEX IF NOT EXISTS idx_generations_phone ON public.generations(phone_no);

-- ============================================
-- TRIGGER for updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_generations_updated_at ON public.generations;

CREATE TRIGGER update_generations_updated_at 
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. Copy your Supabase URL and ANON KEY from Supabase Dashboard > Settings > API
-- 2. Add them to your .env.local file
-- 3. Install Supabase client: npm install @supabase/supabase-js
