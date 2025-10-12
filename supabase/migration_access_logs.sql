-- Migration: Create/Update access_logs table for anomaly detection
-- This table tracks all user activities for security monitoring

-- Check if access_logs table exists and create/update accordingly
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'access_logs') THEN
    -- Table doesn't exist, create it
    CREATE TABLE public.access_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      file_id UUID REFERENCES public.file_metadata(id) ON DELETE SET NULL,
      access_type VARCHAR(20) NOT NULL,
      ip_address TEXT,
      geolocation JSONB,
      user_agent TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      success BOOLEAN DEFAULT TRUE NOT NULL,
      metadata JSONB,
      CONSTRAINT valid_access_type CHECK (access_type IN ('login', 'upload', 'download', 'view', 'share', 'delete'))
    );
    RAISE NOTICE 'access_logs table created';
  ELSE
    -- Table exists, add missing columns if needed
    RAISE NOTICE 'access_logs table already exists, checking for missing columns...';
    
    -- Add metadata column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'access_logs' 
      AND column_name = 'metadata'
    ) THEN
      ALTER TABLE public.access_logs ADD COLUMN metadata JSONB;
      RAISE NOTICE 'Added metadata column';
    END IF;
    
    -- Ensure success column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'access_logs' 
      AND column_name = 'success'
    ) THEN
      ALTER TABLE public.access_logs ADD COLUMN success BOOLEAN DEFAULT TRUE NOT NULL;
      RAISE NOTICE 'Added success column';
    END IF;
    
    -- Ensure geolocation is JSONB type
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'access_logs' 
      AND column_name = 'geolocation'
      AND data_type != 'jsonb'
    ) THEN
      ALTER TABLE public.access_logs ALTER COLUMN geolocation TYPE JSONB USING geolocation::jsonb;
      RAISE NOTICE 'Updated geolocation column to JSONB';
    END IF;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.access_logs IS 'Tracks all user activities for anomaly detection and security monitoring';
COMMENT ON COLUMN public.access_logs.access_type IS 'Type of activity: login, upload, download, view, share, or delete';
COMMENT ON COLUMN public.access_logs.geolocation IS 'JSON object containing country, city, latitude, longitude from IP geolocation';
COMMENT ON COLUMN public.access_logs.metadata IS 'Additional context data specific to the activity type';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_access_logs_user_time ON public.access_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_type ON public.access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON public.access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip ON public.access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_logs_success ON public.access_logs(success);

-- Enable Row Level Security (RLS)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own access logs
CREATE POLICY "Users can view own access logs"
  ON public.access_logs
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can insert access logs
CREATE POLICY "Service role can insert access logs"
  ON public.access_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.access_logs TO authenticated;
GRANT INSERT ON public.access_logs TO anon, authenticated;

-- Verify anomaly_records table exists (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'anomaly_records') THEN
    -- Create anomaly_records table if it doesn't exist
    CREATE TABLE public.anomaly_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN ('suspicious_login', 'ip_mismatch', 'unusual_activity', 'multiple_failed_attempts')),
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      description TEXT NOT NULL,
      detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      resolved BOOLEAN DEFAULT FALSE NOT NULL,
      metadata JSONB
    );

    -- Add indexes
    CREATE INDEX idx_anomaly_records_user ON public.anomaly_records(user_id);
    CREATE INDEX idx_anomaly_records_resolved ON public.anomaly_records(resolved);
    CREATE INDEX idx_anomaly_records_severity ON public.anomaly_records(severity);
    CREATE INDEX idx_anomaly_records_detected_at ON public.anomaly_records(detected_at DESC);

    -- Enable RLS
    ALTER TABLE public.anomaly_records ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own anomalies
    CREATE POLICY "Users can view own anomalies"
      ON public.anomaly_records
      FOR SELECT
      USING (auth.uid()::text = user_id::text);

    -- Policy: Service role can insert/update anomalies
    CREATE POLICY "Service role can manage anomalies"
      ON public.anomaly_records
      FOR ALL
      USING (true)
      WITH CHECK (true);

    -- Grant permissions
    GRANT SELECT ON public.anomaly_records TO authenticated;
    GRANT INSERT, UPDATE ON public.anomaly_records TO anon, authenticated;

    RAISE NOTICE 'anomaly_records table created';
  ELSE
    RAISE NOTICE 'anomaly_records table already exists';
  END IF;
END $$;

-- Add helpful functions

-- Function to get recent user activities
CREATE OR REPLACE FUNCTION get_user_recent_activities(
  p_user_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  activity_count BIGINT,
  login_count BIGINT,
  upload_count BIGINT,
  download_count BIGINT,
  unique_ips BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as activity_count,
    COUNT(*) FILTER (WHERE access_type = 'login')::BIGINT as login_count,
    COUNT(*) FILTER (WHERE access_type = 'upload')::BIGINT as upload_count,
    COUNT(*) FILTER (WHERE access_type = 'download')::BIGINT as download_count,
    COUNT(DISTINCT ip_address)::BIGINT as unique_ips
  FROM public.access_logs
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user anomaly summary
CREATE OR REPLACE FUNCTION get_user_anomaly_summary(p_user_id UUID)
RETURNS TABLE (
  total_anomalies BIGINT,
  unresolved_anomalies BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  medium_count BIGINT,
  low_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_anomalies,
    COUNT(*) FILTER (WHERE NOT resolved)::BIGINT as unresolved_anomalies,
    COUNT(*) FILTER (WHERE severity = 'critical' AND NOT resolved)::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high' AND NOT resolved)::BIGINT as high_count,
    COUNT(*) FILTER (WHERE severity = 'medium' AND NOT resolved)::BIGINT as medium_count,
    COUNT(*) FILTER (WHERE severity = 'low' AND NOT resolved)::BIGINT as low_count
  FROM public.anomaly_records
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Access logs migration completed successfully!';
  RAISE NOTICE 'Tables: access_logs, anomaly_records';
  RAISE NOTICE 'Functions: get_user_recent_activities, get_user_anomaly_summary';
END $$;
