-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);