# LockNShare 🔐

A decentralized file-sharing platform with end-to-end encryption, IPFS storage, MetaMask authentication, and AI-powered features.

## 🚀 Features

- **🔐 End-to-End Encryption**: Client-side RSA-2048 encryption before upload
- **🌐 Decentralized Storage**: Files stored on IPFS via Pinata
- **👛 Web3 Authentication**: MetaMask wallet login with signature verification
- **🤖 AI Semantic Search**: Find files by meaning using embeddings
- **🛡️ Anomaly Detection**: AI-powered security monitoring
- **🎨 Modern UI**: Beautiful, responsive design with dark/light mode
- **⚡ Real-time Updates**: Optimistic UI with instant feedback

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** + **ShadCN/UI**
- **Framer Motion** (animations)
- **Zustand** (state management)

### Backend & Services
- **Supabase** (database & auth)
- **Pinata** (IPFS storage)
- **Ethers.js** (Web3 integration)
- **Web Crypto API** (encryption)

### AI Integration
- Embeddings API (semantic search)
- Anomaly detection API

## 📦 Installation

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Supabase account
- Pinata account

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/blockshare-ai.git
cd blockshare-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt

# AI Services
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=https://your-embeddings-api.com/embed
NEXT_PUBLIC_AI_ANOMALY_ENDPOINT=https://your-anomaly-api.com/detect
```

4. **Set up Supabase database**

Run the SQL schema in your Supabase project (see `supabase/schema.sql`).

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

### Users Table
```sql
- id (uuid, primary key)
- wallet_address (text, unique)
- ens_name (text, nullable)
- public_key (text)
- private_key_encrypted (text)
- created_at (timestamp)
- updated_at (timestamp)
- last_login (timestamp)
```

### File Metadata Table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- file_name (text)
- file_size (bigint)
- file_type (text)
- ipfs_hash (text)
- encrypted (boolean)
- public_key_used (text)
- description (text)
- tags (text[])
- embedding_vector (float[])
- created_at (timestamp)
- access_count (integer)
```

### Access Logs Table
```sql
- id (uuid, primary key)
- file_id (uuid, foreign key)
- user_id (uuid, foreign key)
- access_type (text)
- ip_address (text)
- timestamp (timestamp)
- success (boolean)
```

### Anomaly Records Table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- anomaly_type (text)
- severity (text)
- description (text)
- detected_at (timestamp)
- resolved (boolean)
```

## 🎯 Usage

### 1. Connect Wallet
Click "Connect Wallet" and approve the MetaMask connection.

### 2. Upload Files
- Navigate to Upload page
- Drag & drop or select a file
- Add description and tags (optional)
- File is encrypted client-side and uploaded to IPFS

### 3. Search Files
- Use AI semantic search to find files by meaning
- Search by description, tags, or content

### 4. Download Files
- Files are automatically decrypted when downloaded
- Only accessible with your private key

### 5. Monitor Security
- View anomaly alerts on dashboard
- Check trust score and recent activity

## 🔒 Security

- **Private keys never leave your device**
- **Hybrid encryption** (AES-256-GCM + RSA-2048)
- **Client-side encryption** before network transmission
- **MetaMask signature verification**
- **AI-powered anomaly detection**

## 📱 Pages

- **Landing** (`/`) - Introduction and features
- **Dashboard** (`/dashboard`) - Overview, recent files, security status
- **Upload** (`/upload`) - File upload with encryption
- **My Files** (`/files`) - Browse and manage files
- **Search** (`/search`) - AI semantic search
- **Security** (`/security`) - Anomaly monitoring
- **Profile** (`/profile`) - Account settings

## 🎨 Design System

### Colors
- **Light Mode**: Off-white background, blue accents
- **Dark Mode**: Charcoal/slate background, cyan accents

### Typography
- **Font**: Inter (via next/font/google)

### Components
All components follow ShadCN/UI design patterns with custom extensions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [ShadCN/UI](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Storage via [Pinata](https://pinata.cloud/)
- Database via [Supabase](https://supabase.com/)

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Web3, and AI for the academic year 2024-25
