# LockNShare System Flowcharts - Simplified

Clear and concise flowcharts showing the core workflows of LockNShare.

---

## 1. System Overview - Main User Flows

```mermaid
flowchart TD
    Start([User Opens LockNShare]) --> Auth{Logged In?}
    
    Auth -->|No| Login[Connect MetaMask<br/>& Sign Message]
    Auth -->|Yes| Dashboard[/Dashboard/]
    Login --> Dashboard
    
    Dashboard --> Action{Select Action}
    
    %% Upload Flow
    Action -->|Upload| UploadFlow[1️⃣ Select & Encrypt File<br/>2️⃣ Upload to IPFS<br/>3️⃣ Generate AI Embeddings]
    UploadFlow --> SaveFile[(Save to Database:<br/>Metadata + Embeddings)]
    SaveFile --> CheckSecurity[Run Security Check]
    
    %% Search Flow
    Action -->|Search| SearchFlow[1️⃣ Enter Search Query<br/>2️⃣ Generate Query Embedding<br/>3️⃣ Vector Similarity Search]
    SearchFlow --> Results[/Display Ranked Results/]
    
    %% Access Flow
    Action -->|Access| AccessFlow[1️⃣ Check Permissions<br/>2️⃣ Download from IPFS<br/>3️⃣ Decrypt File]
    AccessFlow --> Deliver[/Deliver File to User/]
    Deliver --> CheckSecurity
    
    %% Share Flow
    Action -->|Share| ShareFlow[1️⃣ Select File<br/>2️⃣ Enter Recipient<br/>3️⃣ Grant Access & Share Key]
    ShareFlow --> ShareDB[(Update Database<br/>with Permissions)]
    
    %% Security Flow
    Action -->|Security| SecurityFlow[(Fetch Activity Logs<br/>& Anomaly Alerts)]
    SecurityFlow --> SecurityView[/Display Security Dashboard/]
    
    CheckSecurity --> Dashboard
    Results --> Dashboard
    ShareDB --> Dashboard
    SecurityView --> Dashboard
    
    Dashboard --> Logout{Logout?}
    Logout -->|Yes| End([Exit])
    Logout -->|No| Action
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style SaveFile fill:#87CEEB
    style ShareDB fill:#87CEEB
    style SecurityFlow fill:#87CEEB
    style UploadFlow fill:#FFE4B5
    style SearchFlow fill:#FFE4B5
    style AccessFlow fill:#FFE4B5
    style ShareFlow fill:#FFE4B5
```

---

## 2. AI Anomaly Detection - Simplified

```mermaid
flowchart TD
    Trigger([User Activity:<br/>Upload/Download/Share]) --> Log[Log Activity to Database]
    
    Log --> Collect{Enough Data?<br/>≥5 activities}
    Collect -->|No| Wait[Wait for More]
    Collect -->|Yes| Analyze[Analyze Recent Activities]
    
    Wait --> End1([Continue])
    
    Analyze --> Rules{Rule-Based Check:<br/>• High frequency?<br/>• Odd hours?<br/>• New location?<br/>• Suspicious pattern?}
    
    Rules -->|Critical| Alert1[🔴 Immediate Alert<br/>Block Action]
    Rules -->|Issues Found| AICheck[Run AI Analysis]
    Rules -->|Normal| NoIssue[✅ No Issues]
    
    AICheck --> TryAI{Local AI<br/>Available?}
    
    TryAI -->|Yes| LocalAI[Local AI Classification<br/>sentence-transformers]
    TryAI -->|No| CloudAI[Cloud API Fallback<br/>HuggingFace]
    
    LocalAI --> Timeout{Success?}
    Timeout -->|No| CloudAI
    Timeout -->|Yes| Classify[Classify Activity:<br/>• Normal<br/>• Suspicious<br/>• Threat<br/>• Data Breach]
    CloudAI --> Classify
    
    Classify --> Severity{AI Result +<br/>Confidence}
    
    Severity -->|Normal<br/>>80%| NoIssue
    Severity -->|Suspicious<br/>>50%| Alert2[🟡 Medium Alert<br/>Notify User]
    Severity -->|Threat<br/>>50%| Alert3[🟠 High Alert<br/>Notify Admin]
    Severity -->|Breach<br/>>50%| Alert1
    
    NoIssue --> Trust1[Trust Score +5]
    Alert2 --> Trust2[Trust Score -25]
    Alert3 --> Trust3[Trust Score -50]
    Alert1 --> Trust4[Trust Score -100]
    
    Trust1 --> Save[(Update Database)]
    Trust2 --> Save
    Trust3 --> Save
    Trust4 --> Save
    
    Save --> End2([Monitoring Continues])
    
    style Trigger fill:#90EE90
    style End1 fill:#90EE90
    style End2 fill:#90EE90
    style Log fill:#87CEEB
    style Save fill:#87CEEB
    style LocalAI fill:#FFD700
    style CloudAI fill:#FFA500
    style NoIssue fill:#90EE90
    style Alert2 fill:#FFFF99
    style Alert3 fill:#FFA500
    style Alert1 fill:#FF6B6B
```

---

## 3. AI Integration - Local & Cloud Fallback

```mermaid
flowchart LR
    Request([AI Request:<br/>Embeddings or<br/>Anomaly Detection]) --> Try[Try Local AI Server<br/>localhost:8000]
    
    Try --> Check{Response<br/>in 30s?}
    
    Check -->|✅ Yes| Local[Use Local Result<br/>Fast & Private]
    Check -->|❌ No| Cloud[Fallback to Cloud API<br/>HuggingFace]
    
    Local --> Success([Return Result])
    Cloud --> Success
    
    style Request fill:#90EE90
    style Success fill:#90EE90
    style Local fill:#FFD700
    style Cloud fill:#FFA500
```

---

## Quick Reference

### System Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Authentication** | Secure login | MetaMask Wallet |
| **Storage** | Decentralized files | IPFS (Pinata) |
| **Database** | Metadata & embeddings | Supabase (PostgreSQL + pgvector) |
| **Encryption** | File security | AES-256-GCM |
| **AI Search** | Semantic search | sentence-transformers |
| **AI Security** | Anomaly detection | BART-large-mnli |

### AI Model Flow

```
User Query/Activity
        ↓
Try: Local AI Server (localhost:8000)
   ├─ Fast (50-300ms)
   ├─ Private (data stays local)
   └─ Free (no API costs)
        ↓ (if fails)
Fallback: HuggingFace Cloud API
   ├─ Reliable (always available)
   ├─ Slower (500-2000ms)
   └─ Requires API key
        ↓
Return Result to User
```

### Security Levels

| Level | Trigger | Action | Trust Impact |
|-------|---------|--------|--------------|
| ✅ **Normal** | AI: >80% normal | Log only | +5 |
| 🟡 **Medium** | AI: >50% suspicious | Notify user | -25 |
| 🟠 **High** | AI: >50% threat | Notify admin | -50 |
| 🔴 **Critical** | Rules + AI: breach | Block action | -100 |

### Shape Legend

- ⬭ **Rounded** = Start/End
- ▭ **Rectangle** = Process (can contain multiple steps)
- ◇ **Diamond** = Decision point
- ▱ **Parallelogram** = User input/output
- ⬮ **Cylinder** = Database operation

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           User Browser                  │
│  ┌──────────────────────────────────┐   │
│  │     Next.js Frontend             │   │
│  │  (React + TypeScript)            │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
   ┌────▼───┐ ┌──▼───┐ ┌──▼─────┐
   │Supabase│ │Pinata│ │AI Server│
   │  DB +  │ │(IPFS)│ │  Local  │
   │ Vector │ └──────┘ │   OR    │
   └────────┘          │ Cloud   │
                       └────┬────┘
                            │ (fallback)
                       ┌────▼────┐
                       │HuggingFace│
                       │Cloud API│
                       └─────────┘
```

---

*Simplified flowcharts showing core LockNShare workflows - November 2025*
