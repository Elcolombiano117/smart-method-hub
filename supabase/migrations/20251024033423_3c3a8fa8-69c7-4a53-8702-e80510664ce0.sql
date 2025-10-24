-- Update profiles table to add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company') THEN
    ALTER TABLE public.profiles ADD COLUMN company TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'position') THEN
    ALTER TABLE public.profiles ADD COLUMN position TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Create studies table
CREATE TABLE IF NOT EXISTS public.studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  process_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  cycles_count INTEGER DEFAULT 0,
  performance_rating DECIMAL(5,2),
  supplement_percentage DECIMAL(5,2),
  observed_times JSONB DEFAULT '[]'::jsonb,
  average_time DECIMAL(10,2),
  normal_time DECIMAL(10,2),
  standard_time DECIMAL(10,2),
  conclusions TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on studies
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

-- Studies policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studies' AND policyname = 'Users can view their own studies') THEN
    CREATE POLICY "Users can view their own studies"
      ON public.studies FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studies' AND policyname = 'Users can create their own studies') THEN
    CREATE POLICY "Users can create their own studies"
      ON public.studies FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studies' AND policyname = 'Users can update their own studies') THEN
    CREATE POLICY "Users can update their own studies"
      ON public.studies FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studies' AND policyname = 'Users can delete their own studies') THEN
    CREATE POLICY "Users can delete their own studies"
      ON public.studies FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for studies updated_at
DROP TRIGGER IF EXISTS update_studies_updated_at ON public.studies;
CREATE TRIGGER update_studies_updated_at
  BEFORE UPDATE ON public.studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();