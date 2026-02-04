-- CRITICAL FIX: Drop edit_name column that's causing schema cache error
-- Run this in Supabase SQL Editor immediately

-- Drop the column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name='generations' 
    AND column_name='edit_name'
  ) THEN
    ALTER TABLE public.generations DROP COLUMN edit_name;
    RAISE NOTICE 'Successfully dropped edit_name column';
  ELSE
    RAISE NOTICE 'Column edit_name does not exist - schema is clean';
  END IF;
END $$;

-- Verify the column is gone
SELECT column_name FROM information_schema.columns 
WHERE table_schema='public' 
AND table_name='generations' 
ORDER BY ordinal_position;
