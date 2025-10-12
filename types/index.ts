// Core Entity Types for BlockShare.AI

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  ens_name?: string;
  profile_image_url?: string;
  public_key?: string;
  private_key_encrypted?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications_enabled: boolean;
  privacy_mode: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface FileMetadata {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  ipfs_hash: string;
  encrypted: boolean;
  public_key_used?: string;
  encrypted_key?: string;
  iv?: string;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  access_count: number;
  shared_with?: string[];
  embedding_vector?: number[];
}

export interface AccessLog {
  id: string;
  file_id: string;
  user_id: string;
  access_type: 'upload' | 'download' | 'view' | 'share';
  ip_address?: string;
  geolocation?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
}

export interface AnomalyRecord {
  id: string;
  user_id: string;
  anomaly_type: 'suspicious_login' | 'ip_mismatch' | 'unusual_activity' | 'multiple_failed_attempts';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  file_id: string;
  file_metadata: FileMetadata;
  similarity_score: number;
  matched_text?: string;
}

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptionResult {
  encryptedData: string;
  encryptedKey: string;
  iv: string;
}

export interface DecryptionResult {
  data: ArrayBuffer;
  fileName: string;
}

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface SearchQuery {
  query: string;
  filters?: {
    file_type?: string;
    date_range?: {
      start: string;
      end: string;
    };
    tags?: string[];
  };
  limit?: number;
}

export interface UserStats {
  total_uploads: number;
  total_storage_used: number;
  total_downloads: number;
  account_age_days: number;
  trust_score: number;
  recent_ips: string[];
  anomaly_count: number;
}

export interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'saving' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}
