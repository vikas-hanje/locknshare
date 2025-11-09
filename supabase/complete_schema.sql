-- ============================================================================
-- LockNShare Complete Database Schema
-- Run this in Supabase SQL Editor to set up the entire database
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: users
-- Stores user account information and encryption keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  username TEXT UNIQUE,
  public_key TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- TABLE: user_keys
-- Cloud storage for cross-device key synchronization
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, public_key)
);

-- ============================================================================
-- TABLE: file_metadata
-- Stores file information and encryption metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  ipfs_hash TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT true,
  encrypted_key TEXT,
  iv TEXT,
  shared_with TEXT[] DEFAULT ARRAY[]::TEXT[],
  shared_keys JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding_vector FLOAT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

-- ============================================================================
-- TABLE: access_logs
-- Audit trail for user activities and file access
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('login', 'upload', 'download', 'view', 'share', 'delete')),
  ip_address TEXT,
  user_agent TEXT,
  geolocation JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- TABLE: anomaly_records
-- Security alerts and suspicious activity tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS anomaly_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- INDEXES for Performance Optimization
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- User Keys
CREATE INDEX IF NOT EXISTS idx_user_keys_user_id ON user_keys(user_id);

-- File Metadata
CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_created_at ON file_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_metadata_ipfs_hash ON file_metadata(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_file_metadata_shared_with ON file_metadata USING GIN (shared_with);
CREATE INDEX IF NOT EXISTS idx_file_metadata_tags ON file_metadata USING GIN (tags);

-- Access Logs
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_type ON access_logs(access_type);

-- Anomaly Records
CREATE INDEX IF NOT EXISTS idx_anomaly_records_user_id ON anomaly_records(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_records_detected_at ON anomaly_records(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_records_resolved ON anomaly_records(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_anomaly_records_severity ON anomaly_records(severity);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_records ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
CREATE POLICY "Users can view all users (for sharing)" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- User Keys Table Policies
CREATE POLICY "Users can view their own keys" ON user_keys
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own keys" ON user_keys
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own keys" ON user_keys
  FOR UPDATE USING (true);

-- File Metadata Table Policies
CREATE POLICY "Users can view their own and shared files" ON file_metadata
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own files" ON file_metadata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own files" ON file_metadata
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own files" ON file_metadata
  FOR DELETE USING (true);

-- Access Logs Table Policies
CREATE POLICY "Users can view their own logs" ON access_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert logs" ON access_logs
  FOR INSERT WITH CHECK (true);

-- Anomaly Records Table Policies
CREATE POLICY "Users can view their own anomalies" ON anomaly_records
  FOR SELECT USING (true);

CREATE POLICY "System can insert anomalies" ON anomaly_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update anomalies" ON anomaly_records
  FOR UPDATE USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_keys_updated_at 
  BEFORE UPDATE ON user_keys
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at 
  BEFORE UPDATE ON file_metadata
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- You can add sample data here for testing
-- Example:
-- INSERT INTO users (wallet_address, username) VALUES
--   ('0x1234...', 'testuser1'),
--   ('0x5678...', 'testuser2');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after setup to verify everything is working:

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- Check all indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY indexname;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public';

-- ============================================================================
-- COMPLETE! Database schema setup finished
-- ============================================================================
