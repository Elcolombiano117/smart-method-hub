-- Add deleted_at column for soft delete and index it
ALTER TABLE public.studies
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_studies_deleted_at ON public.studies (deleted_at);
