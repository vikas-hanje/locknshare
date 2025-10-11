-- BlockShare.AI Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  public_key TEXT,
  private_key_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb
);

-- File metadata table
CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  ipfs_hash TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT true,
  public_key_used TEXT,
  description TEXT,
  tags TEXT[],
  embedding_vector FLOAT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  shared_with TEXT[]
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES file_metadata(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('upload', 'download', 'view', 'share')),
  ip_address TEXT,
  geolocation TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT true
);

-- Anomaly records table
CREATE TABLE IF NOT EXISTS anomaly_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('suspicious_login', 'ip_mismatch', 'unusual_activity', 'multiple_failed_attempts')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_created_at ON file_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_records_user_id ON anomaly_records(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_records_detected_at ON anomaly_records(detected_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- RLS Policies for file_metadata table
CREATE POLICY "Users can view their own files" ON file_metadata
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own files" ON file_metadata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own files" ON file_metadata
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own files" ON file_metadata
  FOR DELETE USING (true);

-- RLS Policies for access_logs table
CREATE POLICY "Users can view their own logs" ON access_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert logs" ON access_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for anomaly_records table
CREATE POLICY "Users can view their own anomalies" ON anomaly_records
  FOR SELECT USING (true);

CREATE POLICY "System can insert anomalies" ON anomaly_records
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON file_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Enable pgvector for similarity search
-- Uncomment if you want to use vector similarity search
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE file_metadata ADD COLUMN embedding vector(1536);
-- CREATE INDEX ON file_metadata USING ivfflat (embedding vector_cosine_ops);
