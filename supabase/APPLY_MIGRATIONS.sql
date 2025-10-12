-- =====================================================
-- FILE SHARING FIX - Apply All Required Migrations
-- =====================================================
-- Run this entire file in your Supabase SQL Editor
-- This will add all columns needed for file sharing to work
-- =====================================================

-- 1. Add encryption data columns to file_metadata (if not exists)
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS encrypted_key TEXT,
ADD COLUMN IF NOT EXISTS iv TEXT;

COMMENT ON COLUMN file_metadata.encrypted_key IS 'Encrypted AES key (encrypted with owner RSA public key)';
COMMENT ON COLUMN file_metadata.iv IS 'Initialization vector for AES encryption';

-- 2. Add shared_keys column for multiple recipients (if not exists)
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS shared_keys JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN file_metadata.shared_keys IS 'Array of {username, encrypted_aes_key} for shared access';

-- Create index for faster queries on shared_keys
CREATE INDEX IF NOT EXISTS idx_file_metadata_shared_keys ON file_metadata USING GIN (shared_keys);

-- 3. Ensure public_key column exists in users table (should already exist in schema)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS public_key TEXT;

CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;

COMMENT ON COLUMN users.public_key IS 'RSA public key (SPKI format, base64) for encrypting shared file keys';

-- 4. Add username column if it doesn't exist (for file sharing)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

COMMENT ON COLUMN users.username IS 'Unique username for file sharing (without @ prefix)';

-- 5. Add profile_image_url if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

COMMENT ON COLUMN users.profile_image_url IS 'URL to user profile image';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify migrations were applied successfully

-- Check file_metadata columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'file_metadata' 
  AND column_name IN ('encrypted_key', 'iv', 'shared_keys', 'shared_with')
ORDER BY column_name;

-- Check users columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('public_key', 'username', 'profile_image_url')
ORDER BY column_name;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- If you see all the columns listed above, migrations were successful
-- File sharing should now work properly
-- =====================================================
