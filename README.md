# LockNShare 🔐

> **Secure Decentralized File Sharing Platform**  
> End-to-end encrypted file storage with Web3 authentication, IPFS hosting, AI-powered search, and intelligent security monitoring.

---

## 🌟 Overview

LockNShare is a next-generation file sharing platform that combines blockchain technology, decentralized storage, and AI to provide unparalleled security and privacy. Files are encrypted client-side before upload, stored on IPFS, and accessible only by authorized users with proper encryption keys.

### Key Highlights
- 🔐 **Military-grade Encryption**: RSA-2048 + AES-256-GCM hybrid encryption
- 🌐 **Truly Decentralized**: IPFS storage via Pinata ensures data permanence
- 👛 **Web3 Native**: MetaMask authentication with signature verification
- 🤖 **AI-Enhanced**: Semantic search and anomaly detection
- 🎨 **Modern UX**: Responsive design with smooth animations
- 🔄 **Cross-Device Sync**: Cloud-synced encryption keys for seamless access
- 👥 **File Sharing**: Username-based access control with multi-user support

---

## 🚀 Features

### Core Functionality
- **End-to-End Encryption**: All files encrypted client-side before transmission
- **Decentralized Storage**: IPFS-based storage ensures censorship resistance
- **Web3 Authentication**: Passwordless login via MetaMask wallet
- **File Sharing**: Share files securely with multiple users by username
- **Semantic Search**: AI-powered search finds files by meaning, not just keywords
- **Access Control**: Granular permissions for file owners and recipients

### Security Features
- **Anomaly Detection**: AI monitors for suspicious activity patterns
- **Trust Scoring**: Real-time security score based on user behavior
- **Activity Logging**: Complete audit trail of file access
- **Geolocation Tracking**: IP-based location monitoring for logins
- **Failed Login Alerts**: Automatic detection of brute-force attempts

### User Experience
- **Dark/Light Mode**: System-aware theme switching
- **Responsive Design**: Mobile-first approach works on all devices
- **Image Cropping**: Professional profile picture editor
- **Drag & Drop**: Intuitive file upload interface
- **Real-time Feedback**: Instant UI updates with toast notifications
- **Animated Transitions**: Smooth page transitions and micro-interactions

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript for type safety
- **Styling**: TailwindCSS + ShadCN/UI component library
- **State**: Zustand for global state management
- **Animations**: Framer Motion for smooth transitions
- **Crypto**: Web Crypto API for client-side encryption

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Storage**: Pinata (IPFS pinning service)
- **Web3**: Ethers.js for wallet integration
- **API**: Next.js API routes

### AI & Machine Learning
- **Embeddings**: HuggingFace sentence transformers for semantic search
- **Anomaly Detection**: Rule-based + AI hybrid system
- **Geolocation**: IP-based location services

## 📦 Installation

### Prerequisites
- **Node.js** 18+ and npm
- **MetaMask** browser extension installed
- **Supabase** account (free tier available)
- **Pinata** IPFS account (free tier available)
- **Git** for cloning the repository

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/locknshare.git
cd locknshare
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# HuggingFace API (Optional - for embeddings)
NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_huggingface_key
```

4. **Set up Supabase database**

Run the SQL migrations in your Supabase SQL editor:
```bash
# Navigate to Supabase Dashboard > SQL Editor
# Run the migration file: supabase/migrations/APPLY_MIGRATIONS.sql
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open in browser**

Navigate to [http://localhost:3000](http://localhost:3000)

7. **Connect your MetaMask wallet**

Click "Connect Wallet" and approve the connection request in MetaMask.

## 🗄️ Database Architecture

### Core Tables

#### `users`
Stores user account information and encryption keys.
```sql
- id (uuid, primary key)
- wallet_address (text, unique) -- Ethereum wallet address
- ens_name (text, nullable) -- ENS domain if available
- username (text, unique) -- User-chosen display name
- public_key (text) -- RSA public key for encryption
- profile_image_url (text) -- IPFS URL for avatar
- created_at (timestamp)
- updated_at (timestamp)
- last_login (timestamp)
```

#### `user_keys`
Cloud storage for encrypted private keys (cross-device sync).
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- encrypted_private_key (text) -- Private key encrypted with wallet signature
- public_key (text) -- Corresponding public key
- created_at (timestamp)
- updated_at (timestamp)
```

#### `file_metadata`
File information and encryption metadata.
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key) -- File owner
- file_name (text)
- file_size (bigint)
- file_type (text) -- MIME type
- ipfs_hash (text) -- IPFS CID
- encrypted (boolean) -- Always true
- encrypted_key (text) -- Encrypted AES key (owner)
- iv (text) -- Initialization vector
- shared_with (text[]) -- Array of usernames with access
- shared_keys (jsonb) -- Encrypted keys for shared users
- description (text)
- tags (text[])
- embedding_vector (float[]) -- For semantic search
- created_at (timestamp)
- access_count (integer)
```

#### `access_logs`
Audit trail for file access and user activities.
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- access_type (text) -- login, upload, download, delete, view, share
- ip_address (text)
- user_agent (text)
- geolocation (jsonb) -- City, country, coordinates
- timestamp (timestamp)
- success (boolean)
- metadata (jsonb) -- Additional context
```

#### `anomaly_records`
Security alerts and suspicious activity logs.
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- anomaly_type (text) -- failed_logins, unusual_download, etc.
- severity (text) -- low, medium, high, critical
- description (text)
- detected_at (timestamp)
- resolved (boolean)
- resolved_at (timestamp, nullable)
```

## 🎯 Usage Guide

### Getting Started

**1. Connect Your Wallet**
- Click "Connect Wallet" in the header
- Approve MetaMask connection request
- Sign message to authenticate (no gas fees)
- Encryption keys are automatically generated

**2. Upload Files**
- Navigate to `/upload`
- Drag & drop files or click to browse
- Add description and tags (optional)
- **Share with users**: Enter `@username` to grant access
- Files are encrypted client-side before upload
- Stored on IPFS with encrypted metadata

**3. Manage Files**
- View all your files at `/files`
- See files shared with you (marked with badge)
- Download, preview, edit, or delete files
- Edit tags and sharing permissions

**4. Search Files**
- Use semantic search at `/search`
- Find files by meaning, not just keywords
- AI understands context and synonyms

**5. Monitor Security**
- Check `/security` for anomaly alerts
- View trust score and activity logs
- Review suspicious access patterns

**6. Customize Profile**
- Update username at `/profile`
- Upload and crop profile picture
- View wallet address and ENS name

---

## 🔒 Security Architecture

### Encryption Model
**Hybrid Encryption**: AES-256-GCM + RSA-2048

1. **File Encryption**: Random AES-256 key encrypts file content
2. **Key Encryption**: AES key encrypted with RSA-2048 public key
3. **Storage**: Encrypted file on IPFS, encrypted key in database
4. **Decryption**: Private key decrypts AES key, AES key decrypts file

### Key Management
- **Generation**: Keys generated in browser using Web Crypto API
- **Storage**: Private keys stored in localStorage (never transmitted)
- **Backup**: Encrypted keys synced to cloud with wallet signature
- **Cross-Device**: Keys retrievable on new devices via signature

### Access Control
- **Owner**: Full control (read, write, delete, share)
- **Recipients**: Read-only access to shared files
- **Validation**: Username-based sharing with key re-encryption

### Threat Protection
- **Failed Login Detection**: Alerts after 5 failed attempts
- **Geolocation Tracking**: IP-based location monitoring
- **Rate Limiting**: Prevents brute-force and DDoS attacks
- **Activity Logging**: Complete audit trail

---

## 📱 Application Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Introduction, features, animated hero |
| **Dashboard** | `/dashboard` | File overview, security status, recent activity |
| **Upload** | `/upload` | File upload with encryption and sharing |
| **My Files** | `/files` | Browse owned and shared files |
| **Search** | `/search` | AI-powered semantic file search |
| **Security** | `/security` | Anomaly alerts and trust score |
| **Profile** | `/profile` | Account settings and profile picture |

---

## 🎨 Design System

### Color Palette
- **Primary**: Purple gradient (#667eea to #764ba2)
- **Light Mode**: Off-white background, dark text
- **Dark Mode**: Slate/charcoal background, white text
- **Accent**: Primary color for CTAs and highlights

### Typography
- **Font Family**: Inter (optimized with next/font)
- **Headings**: Bold, gradient text for emphasis
- **Body**: Regular weight, optimal line height

### UI Components
- Based on **ShadCN/UI** with custom styling
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React for consistent iconography
- **Responsive**: Mobile-first design approach

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Environment Variables
Set in Vercel dashboard or `.env.production`:
- All variables from `.env.local`
- Add `NEXT_PUBLIC_APP_URL` with production URL

### Build
```bash
npm run build
npm run start
```

---

## 📄 License

MIT License - Free for personal and commercial use.

---

## 🙏 Acknowledgments

- **Framework**: [Next.js](https://nextjs.org/)
- **UI Library**: [ShadCN/UI](https://ui.shadcn.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Storage**: [Pinata](https://pinata.cloud/)
- **Database**: [Supabase](https://supabase.com/)
- **Web3**: [Ethers.js](https://docs.ethers.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation in `CHANGELOG.md`

---

**Built with ❤️ for secure, decentralized file sharing**  
*Academic Year 2024-25*
