-- Migration: Add support for multiple encrypted keys (file sharing)
-- Purpose: Store encrypted AES key for each user who has access to a file

-- Add column to store array of encrypted keys (JSON format)
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS shared_keys JSONB DEFAULT '[]'::jsonb;

-- Comment
COMMENT ON COLUMN file_metadata.shared_keys IS 'Array of {username, encrypted_aes_key} for shared access';

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_metadata_shared_keys ON file_metadata USING GIN (shared_keys);

-- Example structure of shared_keys:
-- [
--   {"username": "alice", "encrypted_aes_key": "base64..."},
--   {"username": "bob", "encrypted_aes_key": "base64..."}
-- ]
