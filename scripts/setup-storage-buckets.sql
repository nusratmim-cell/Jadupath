-- ============================================================================
-- Supabase Storage Buckets Setup
-- Description: Create storage buckets for textbook pages, PDFs, videos
-- ============================================================================

-- Note: Run this in Supabase SQL Editor
-- Go to: https://rkcpdwzogxbspsdazxqf.supabase.co/project/rkcpdwzogxbspsdazxqf/sql

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Create textbook-pages bucket for PNG/JPG images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'textbook-pages',
  'textbook-pages',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg'];

-- Create textbook-pdfs bucket for full PDF textbooks
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'textbook-pdfs',
  'textbook-pdfs',
  true,
  52428800, -- 50 MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Create videos bucket for MP4 videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  524288000, -- 500 MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'];

-- Create thumbnails bucket for preview images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  2097152, -- 2 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg'];

-- ============================================================================
-- STORAGE POLICIES (RLS for Storage)
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Read Access - textbook-pages" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access - textbook-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access - videos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access - thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload - textbook-pages" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload - textbook-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload - videos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload - thumbnails" ON storage.objects;

-- Allow public read access for all buckets
CREATE POLICY "Public Read Access - textbook-pages"
ON storage.objects FOR SELECT
USING (bucket_id = 'textbook-pages');

CREATE POLICY "Public Read Access - textbook-pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'textbook-pdfs');

CREATE POLICY "Public Read Access - videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Public Read Access - thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Allow public upload (for now - can restrict to authenticated users later)
CREATE POLICY "Public Upload - textbook-pages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'textbook-pages');

CREATE POLICY "Public Upload - textbook-pdfs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'textbook-pdfs');

CREATE POLICY "Public Upload - videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Public Upload - thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that buckets were created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('textbook-pages', 'textbook-pdfs', 'videos', 'thumbnails');

-- Expected output:
-- textbook-pages   | true | 5242880   | {image/png,image/jpeg,image/jpg}
-- textbook-pdfs    | true | 52428800  | {application/pdf}
-- videos           | true | 524288000 | {video/mp4,video/webm,video/quicktime}
-- thumbnails       | true | 2097152   | {image/png,image/jpeg,image/jpg}

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Storage buckets created successfully!';
  RAISE NOTICE '📦 Buckets:';
  RAISE NOTICE '   - textbook-pages (5 MB limit, PNG/JPG)';
  RAISE NOTICE '   - textbook-pdfs (50 MB limit, PDF)';
  RAISE NOTICE '   - videos (500 MB limit, MP4/WebM)';
  RAISE NOTICE '   - thumbnails (2 MB limit, PNG/JPG)';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 All buckets are PUBLIC for read access';
  RAISE NOTICE '📤 Upload is enabled for all buckets';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: node scripts/organize-content.js';
  RAISE NOTICE '2. Run: node scripts/upload-images-to-storage.js';
  RAISE NOTICE '3. Run: node scripts/upload-pdfs-to-storage.js';
  RAISE NOTICE '4. Run: node scripts/upload-videos-to-storage.js';
END $$;
