-- ============================================
-- Supabase Storage Policies for Service Role
-- ============================================
-- This script grants service_role permissions to upload/manage files
-- in the generated-images bucket for server-side operations

-- Drop existing policies if they exist (optional - uncomment if needed)
-- DROP POLICY IF EXISTS "Service role can insert objects" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role can update objects" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role can select objects" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role can delete objects" ON storage.objects;

-- ============================================
-- 1. Allow service_role to INSERT (upload) files
-- ============================================
CREATE POLICY "Service role can insert objects"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'generated-images');

-- ============================================
-- 2. Allow service_role to SELECT (read) files
-- ============================================
CREATE POLICY "Service role can select objects"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'generated-images');

-- ============================================
-- 3. Allow service_role to UPDATE files
-- ============================================
CREATE POLICY "Service role can update objects"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'generated-images')
WITH CHECK (bucket_id = 'generated-images');

-- ============================================
-- 4. Allow service_role to DELETE files
-- ============================================
CREATE POLICY "Service role can delete objects"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'generated-images');

-- ============================================
-- 5. Ensure bucket exists and is configured
-- ============================================
-- Check if bucket exists (query only - run this to verify)
-- SELECT * FROM storage.buckets WHERE id = 'generated-images';

-- If bucket doesn't exist, create it (uncomment if needed):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('generated-images', 'generated-images', true);

-- ============================================
-- 6. Allow PUBLIC read access to files (for URL sharing)
-- ============================================
CREATE POLICY "Public can view generated images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-images');

-- ============================================
-- 7. Verify policies are created
-- ============================================
-- Run this to see all policies on storage.objects:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================
-- USAGE INSTRUCTIONS:
-- ============================================
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire script
-- 3. Click "Run" to execute
-- 4. Verify in Dashboard → Storage → Policies that new policies appear
-- 5. Test upload from your app with service_role key
-- ============================================
