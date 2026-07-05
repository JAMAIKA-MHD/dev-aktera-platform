INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-media',
  'campaign-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "campaign_media_org_select" ON storage.objects;
CREATE POLICY "campaign_media_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_insert" ON storage.objects;
CREATE POLICY "campaign_media_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_update" ON storage.objects;
CREATE POLICY "campaign_media_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_delete" ON storage.objects;
CREATE POLICY "campaign_media_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);
