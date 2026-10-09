
-- Storage bucket for emergency report photos/videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-media',
  'report-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload their own files
CREATE POLICY "Users can upload report media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'report-media');

CREATE POLICY "Anyone can view report media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'report-media');

CREATE POLICY "Users can delete own report media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'report-media' AND auth.uid()::text = (storage.foldername(name))[1]);
