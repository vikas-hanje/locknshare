-- Add encryption metadata columns to file_metadata table
-- Run this in Supabase SQL Editor

ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS encrypted_key TEXT,
ADD COLUMN IF NOT EXISTS iv TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_metadata_ipfs_hash ON file_metadata(ipfs_hash);

-- Comment for clarity
COMMENT ON COLUMN file_metadata.encrypted_key IS 'RSA-encrypted AES key for file decryption';
COMMENT ON COLUMN file_metadata.iv IS 'Initialization vector for AES decryption';
