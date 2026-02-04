-- ============================================
-- ADD NEW COLUMNS TO EXISTING GENERATIONS TABLE
-- ============================================
-- Run this if you already have a generations table and need to add new columns
-- This script is SAFE to run multiple times - it checks before making changes

-- 0. Ensure storage bucket exists
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

-- 1. Add email column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='email') THEN
    ALTER TABLE public.generations ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column';
  ELSE
    RAISE NOTICE 'email column already exists';
  END IF;
END $$;

-- 2. Drop edit_name column (no longer used)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='generations' AND column_name='edit_name') THEN
    ALTER TABLE public.generations DROP COLUMN edit_name;
    RAISE NOTICE 'Dropped edit_name column';
  ELSE
    RAISE NOTICE 'edit_name column not found';
  END IF;
END $$;

-- 3. Add phone_no column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='phone_no') THEN
    ALTER TABLE public.generations ADD COLUMN phone_no TEXT;
    RAISE NOTICE 'Added phone_no column';
  ELSE
    RAISE NOTICE 'phone_no column already exists';
  END IF;
END $$;

-- 4. Add photo_url column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='photo_url') THEN
    ALTER TABLE public.generations ADD COLUMN photo_url TEXT;
    RAISE NOTICE 'Added photo_url column';
  ELSE
    RAISE NOTICE 'photo_url column already exists';
  END IF;
END $$;

-- 5. Rename image_url to generated_image_url OR create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='generated_image_url') THEN
    -- Check if old column exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema='public' AND table_name='generations' AND column_name='image_url') THEN
      ALTER TABLE public.generations RENAME COLUMN image_url TO generated_image_url;
      RAISE NOTICE 'Renamed image_url to generated_image_url';
    ELSE
      ALTER TABLE public.generations ADD COLUMN generated_image_url TEXT;
      RAISE NOTICE 'Added generated_image_url column';
    END IF;
  ELSE
    RAISE NOTICE 'generated_image_url column already exists';
  END IF;
END $$;

-- 6. Add aws_key column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='aws_key') THEN
    ALTER TABLE public.generations ADD COLUMN aws_key TEXT;
    RAISE NOTICE 'Added aws_key column';
  ELSE
    RAISE NOTICE 'aws_key column already exists';
  END IF;
END $$;

-- 7. Add updated_at column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='generations' AND column_name='updated_at') THEN
    ALTER TABLE public.generations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- 8. Add email format constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format') THEN
    ALTER TABLE public.generations ADD CONSTRAINT email_format 
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added email_format constraint';
  ELSE
    RAISE NOTICE 'email_format constraint already exists';
  END IF;
END $$;

-- 9. Add phone format constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_format') THEN
    ALTER TABLE public.generations ADD CONSTRAINT phone_format 
      CHECK (phone_no IS NULL OR phone_no ~* '^\+?[0-9]{10,15}$');
    RAISE NOTICE 'Added phone_format constraint';
  ELSE
    RAISE NOTICE 'phone_format constraint already exists';
  END IF;
END $$;

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_generations_email ON public.generations(email);
CREATE INDEX IF NOT EXISTS idx_generations_phone ON public.generations(phone_no);

-- 11. Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_generations_updated_at ON public.generations;

CREATE TRIGGER update_generations_updated_at 
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE!
-- ============================================
-- All new columns have been added to your existing table.
-- The API will now work with the updated schema.
