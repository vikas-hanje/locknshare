-- Migration: User Encryption Keys Storage
-- Purpose: Store encrypted user encryption keys for cross-device access
-- Encrypted with wallet signature - only wallet owner can decrypt

CREATE TABLE IF NOT EXISTS user_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  encrypted_keys TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_keys_user_id ON user_keys(user_id);
CREATE INDEX idx_user_keys_wallet ON user_keys(wallet_address);

-- Comments
COMMENT ON TABLE user_keys IS 'Stores encrypted RSA key pairs for users, encrypted with wallet signature for cross-device access';
COMMENT ON COLUMN user_keys.encrypted_keys IS 'RSA key pair encrypted with wallet signature (AES-GCM)';
COMMENT ON COLUMN user_keys.wallet_address IS 'Wallet address for verification';

-- Row Level Security (RLS)
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own keys
CREATE POLICY "Users can view their own keys"
  ON user_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keys"
  ON user_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keys"
  ON user_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keys"
  ON user_keys
  FOR DELETE
  USING (auth.uid() = user_id);
