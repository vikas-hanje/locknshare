-- Add profile_image_url column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.users.profile_image_url IS 'URL to user profile image stored in Supabase Storage or IPFS';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON public.users(profile_image_url);
