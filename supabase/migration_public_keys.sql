-- Migration: Add public_key to users table
-- Purpose: Store user's RSA public key for file sharing encryption

-- Add public_key column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.public_key IS 'RSA public key (SPKI format, base64) for encrypting shared file keys';

-- Note: This allows multiple users to decrypt the same file
-- Each user's public key is used to encrypt the file's AES key
