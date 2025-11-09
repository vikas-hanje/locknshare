# LockNShare Database Schema

## Visual Directory Tree

```
LockNShare Database (PostgreSQL via Supabase)
│
├── 👥 users
│   ├── id (UUID, PK)
│   ├── wallet_address (TEXT, UNIQUE) ← MetaMask address
│   ├── ens_name (TEXT, NULLABLE)
│   ├── username (TEXT, UNIQUE) ← For sharing
│   ├── public_key (TEXT) ← RSA public key
│   ├── profile_image_url (TEXT) ← IPFS URL
│   ├── created_at (TIMESTAMPTZ)
│   ├── updated_at (TIMESTAMPTZ)
│   ├── last_login (TIMESTAMPTZ)
│   └── settings (JSONB)
│
├── 🔑 user_keys (Cross-device sync)
│   ├── id (UUID, PK)
│   ├── user_id (UUID, FK → users.id)
│   ├── encrypted_private_key (TEXT) ← Encrypted with signature
│   ├── public_key (TEXT)
│   ├── created_at (TIMESTAMPTZ)
│   └── updated_at (TIMESTAMPTZ)
│
├── 📁 file_metadata
│   ├── id (UUID, PK)
│   ├── user_id (UUID, FK → users.id)
│   ├── file_name (TEXT)
│   ├── file_size (BIGINT)
│   ├── file_type (TEXT) ← MIME type
│   ├── ipfs_hash (TEXT) ← IPFS CID
│   ├── encrypted (BOOLEAN) ← Always true
│   ├── encrypted_key (TEXT) ← Owner's encrypted AES key
│   ├── iv (TEXT) ← Initialization vector
│   ├── shared_with (TEXT[]) ← Usernames with access
│   ├── shared_keys (JSONB) ← Per-user encrypted keys
│   │   └── Structure: [{"username": "alice", "encrypted_aes_key": "..."}]
│   ├── description (TEXT)
│   ├── tags (TEXT[])
│   ├── embedding_vector (FLOAT[]) ← For semantic search
│   ├── created_at (TIMESTAMPTZ)
│   ├── updated_at (TIMESTAMPTZ)
│   └── access_count (INTEGER)
│
├── 📊 access_logs (Audit trail)
│   ├── id (UUID, PK)
│   ├── user_id (UUID, FK → users.id)
│   ├── access_type (TEXT) ← login, upload, download, view, share, delete
│   ├── ip_address (TEXT)
│   ├── user_agent (TEXT)
│   ├── geolocation (JSONB) ← {city, country, lat, lng}
│   ├── timestamp (TIMESTAMPTZ)
│   ├── success (BOOLEAN)
│   └── metadata (JSONB) ← Additional context
│
└── 🛡️ anomaly_records (Security alerts)
    ├── id (UUID, PK)
    ├── user_id (UUID, FK → users.id)
    ├── anomaly_type (TEXT) ← failed_logins, unusual_download, etc.
    ├── severity (TEXT) ← low, medium, high, critical
    ├── description (TEXT)
    ├── detected_at (TIMESTAMPTZ)
    ├── resolved (BOOLEAN)
    └── resolved_at (TIMESTAMPTZ, NULLABLE)
```

---

## Relationships

```
users (1) ──────────── (∞) file_metadata
  │                          │
  │                          │
  ├─────────── (∞) access_logs
  │                          
  ├─────────── (∞) anomaly_records
  │
  └─────────── (∞) user_keys
```

---

## Data Flow

### File Upload
```
1. User connects wallet (MetaMask)
2. Generate/retrieve RSA key pair
3. Encrypt file with AES-256
4. Encrypt AES key with owner's public RSA key
5. Upload encrypted file to IPFS → get CID
6. If sharing:
   - Fetch recipient public keys from users table
   - Re-encrypt AES key for each recipient
   - Store in shared_keys JSONB
7. Save metadata to file_metadata table
```

### File Download (Owner)
```
1. Fetch file_metadata by ID
2. Download encrypted file from IPFS using ipfs_hash
3. Decrypt AES key using owner's private RSA key (from encrypted_key field)
4. Decrypt file content using AES key
5. Download decrypted file
6. Log activity in access_logs
```

### File Download (Recipient)
```
1. Fetch file_metadata by ID
2. Check if user's username in shared_with array
3. Find matching entry in shared_keys JSONB
4. Download encrypted file from IPFS
5. Decrypt AES key using recipient's private RSA key
6. Decrypt file content using AES key
7. Download decrypted file
8. Log activity in access_logs
```

### Anomaly Detection
```
1. Background job monitors access_logs
2. Rule-based checks:
   - Failed login attempts
   - Unusual download patterns
   - Geolocation changes
   - Rapid consecutive activities
3. Create record in anomaly_records table
4. Update trust score
5. Display alert on dashboard
```

---

## Indexes (Performance Optimization)

```sql
-- File queries by owner
CREATE INDEX idx_file_metadata_user_id ON file_metadata(user_id);

-- Recent files
CREATE INDEX idx_file_metadata_created_at ON file_metadata(created_at DESC);

-- Shared files lookup
CREATE INDEX idx_file_metadata_shared_with ON file_metadata USING GIN (shared_with);

-- User activity logs
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp DESC);

-- Security monitoring
CREATE INDEX idx_anomaly_records_user_id ON anomaly_records(user_id);
CREATE INDEX idx_anomaly_records_detected_at ON anomaly_records(detected_at DESC);
CREATE INDEX idx_anomaly_records_resolved ON anomaly_records(resolved) WHERE resolved = false;
```

---

## Security (Row Level Security)

All tables have RLS enabled with policies:

- **users**: Users can view/update their own data
- **file_metadata**: 
  - Owners: Full CRUD access
  - Recipients: Read-only (via shared_with)
- **access_logs**: Insert and view own logs
- **anomaly_records**: Read-only for users, insert for system
- **user_keys**: Users can only access their own keys

---

## Sample Queries

### Get User's Files (Owned + Shared)
```sql
SELECT * FROM file_metadata
WHERE user_id = $1  -- Owned files
   OR $2 = ANY(shared_with);  -- Shared files (username match)
```

### Find Files by Tags
```sql
SELECT * FROM file_metadata
WHERE tags && ARRAY['work', 'project']::TEXT[];
```

### Recent Activity for User
```sql
SELECT * FROM access_logs
WHERE user_id = $1
ORDER BY timestamp DESC
LIMIT 20;
```

### Unresolved Security Alerts
```sql
SELECT * FROM anomaly_records
WHERE user_id = $1 AND resolved = false
ORDER BY detected_at DESC;
```

---

## Storage Requirements

| Data Type | Estimated Size | Notes |
|-----------|---------------|-------|
| User record | ~500 bytes | Including keys |
| File metadata | ~1-2 KB | With tags and sharing |
| Access log | ~300 bytes | Per activity |
| Anomaly record | ~400 bytes | Per alert |
| IPFS file | Variable | Not in Supabase |

---

## Backup & Migration

- **Automatic Backups**: Supabase provides daily backups
- **Point-in-Time Recovery**: Available on Pro tier
- **Export**: Use `pg_dump` for manual backups
- **Import**: Use provided `schema.sql` for fresh setup

---

**Last Updated**: January 2025  
**Database**: PostgreSQL 15 (Supabase)
