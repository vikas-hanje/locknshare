-- Add username field to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Comment for clarity
COMMENT ON COLUMN users.username IS 'Optional username for easier identification';
