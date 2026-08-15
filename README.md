# 🚀 Intra-College Startup Pitching Competition 2026

Organized by the **Entrepreneurship Development Cell (E-Cell)**.

A full-stack, enterprise-grade web application featuring a **Student Portal** (team registration, Eureka referral verification, form auto-save, dark/light theme switcher, pitch deck template download, status check) and a JWT-secured **Admin Portal** (real-time SSE dashboard sync, 2-column file lightbox previewer, auditorium QR scanner, email delivery tracking, CSV exporter, registration toggle, rate limiting, and binary signature security).
b
---

## 🌟 Key Features & Capabilities

### 🎓 Student Portal (`index.html`)
* **Eureka Pre-Registration Mandate Alert**: Step-by-step guidance instructing students to register for the Eureka Competition using NEC ID `NEC2621509` under *"Where did you hear about Eureka!"*. Includes visual screenshot modals and 1-click portal navigation.
* **Flexible Team Management**: Supports **1 to 3 members** per team (1 mandatory Team Leader + up to 2 optional members with dynamic add/remove forms).
* **Eligibility & Word Count Constraints**: Enforces **2nd Year & 3rd Year** academic eligibility filter and a **300-word limit** for the pitch abstract.
* **Form Auto-Save & Draft Recovery (`localStorage`)**:
  * Saves form inputs automatically to `localStorage` (`ecell_pitch_registration_draft_v1`).
  * Auto-restores input fields on page load with abstract word counter synchronization and a 1-click **Discard Draft** banner.
* **Cloudinary CDN Team-Named File Upload Engine**:
  * **Presentation Pitch Deck**: `.ppt`, `.pptx` (Max **10 MB**).
  * **Eureka Proof Screenshot**: `.png`, `.jpg`, `.jpeg`, `.pdf` (Max **5 MB**).
  * **Cloud Storage Naming**: Files stream to Cloudinary structured cleanly using the team name (`pitch_competition/ppt/<Team_Name>_Pitch_<Timestamp>.pptx`).
* **Dark / Light Theme Switcher**:
  * Animated theme switcher button in header nav.
  * Auto-detects system preferences and persists selection in `localStorage`.
* **Originality & Duplicate Checks**: Requires mandatory originality confirmation and rejects duplicate registrations based on Leader Register Number or Email.
* **Application Status Tracker**: Instant status lookup by Leader Email or Register Number with printable official registration slips.

---

### 🛡️ Admin Portal (`ecell-portal.html`)
* **JWT Authentication & Security**: Secure login with bcrypt hashed credentials, 24h JWT tokens, and live credential update modal.
* **Real-Time SSE Dashboard Sync (`utils/sseHub.js`)**:
  * Powered by **Server-Sent Events (SSE)** (`GET /api/admin/events?token=...`).
  * Admin counters and team tables update automatically in real-time without page refreshes whenever a student registers or gets scanned at the auditorium door.
  * Displays visual toast alerts and counter pulse animations (`@keyframes pulseStatHighlight`).
* **Touch-Optimized Mobile UI Overhaul**:
  * **Responsive Mobile Cards (`< 768px`)**: Replaces heavy desktop tables on small screens with clean, touch-friendly mobile cards.
  * **2-Column Mobile Stat Grid**: Compact 2-column mobile counter grid.
  * **Touch Modal Sheets**: Transforms modals into touch-friendly slide-up bottom sheets.
* **In-Browser Document & Lightbox Previewer (`#doc-preview-modal`)**:
  * Clean 2-column file verification layout inside team details modal.
  * Inspects screenshots (`.png`, `.jpg`, `.pdf`) and pitch deck presentations (`.ppt`, `.pptx` via Google Docs Viewer iframe) directly inside the admin portal.
* **Live Auditorium QR Ticket Scanner**:
  * Integrated camera QR Scanner & manual ticket verifier for instant event check-in at the auditorium door.
  * Rejects duplicate ticket scans with checked-in timestamp alerts.
* **Email Delivery Tracking Badges & Timeline**:
  * Displays live 🟢 **Sent (Brevo)** / 🔴 **Failed** table badges.
  * Full Email Dispatch Timeline inside team details modal showing provider, recipient, error logs, and timestamps.
* **Filtering & Search System**: Search by Team Name, Leader Name, Register Number, or Email, with filters for Status, Department, and Academic Year.
* **Approval & Rejection Workflow**:
  * **Approve**: Marks status as `Approved` and dispatches an official **Approval Email containing an Embedded High-Res Entry QR Pass**.
  * **Reject**: Opens a reason modal, marks status as `Rejected`, and emails the detailed rejection reason to the team leader.
* **Dynamic Registration Control**: Global toggle to open or close competition registrations in real time.
* **CSV Export & Backup Dispatcher**: Export all registration records to `.csv` or trigger bulk backup emails to event organizers.

---

## 🔒 Security & Performance Engineering

1. **Brute-Force & Rate-Limiting Defense (`middleware/rateLimiter.js`)**:
   * **Admin Login Limiter**: Max 5 login attempts per 15 minutes.
   * **Student Registration Limiter**: Max 5 registration submissions per hour per IP.
   * **Status Check Limiter**: Max 30 status checks per 15 minutes per IP.
2. **Binary Magic Byte File Signature Verification (`middleware/uploadMiddleware.js`)**:
   * Inspects binary header magic bytes (`89 50 4E 47` PNG, `50 4B 03 04` PPTX, `%PDF` PDF, `D0 CF 11 E0` legacy PPT).
   * Immediately rejects executable files or malicious scripts disguised with a `.png` or `.pptx` extension.
3. **MongoDB Performance Indexing (`models/Team.js`)**:
   * Single and compound indexes on `leader.registerNumber`, `leader.email`, `{ status: 1, submittedAt: -1 }`, `checkedIn`, and `teamName` for sub-millisecond query performance across 10,000+ records.
4. **Dual-Mode Database Failover**:
   * Connected to **MongoDB Atlas**. If database connectivity drops, the server seamlessly activates a fast **in-memory backup array** (`inMemoryTeams`) persisted to `uploads/in_memory_teams_backup.json`.
5. **Multi-Provider Email Fallback Engine (`utils/sendEmail.js`)**:
   * Multi-stage email engine supporting **Brevo REST API**, **Resend**, **SendGrid**, and **Nodemailer SMTP**.

---

## ⚡ Tech Stack

* **Backend**: Node.js, Express.js, Mongoose (MongoDB ORM), Express Rate Limit, Multer, JWT, BcryptJS, Cloudinary SDK, QRCode
* **Frontend**: Vanilla HTML5, Modern CSS3 (Glassmorphic Design System, Light & Dark Mode Theme Switcher), JavaScript (ES6+), FontAwesome Icons, HTML5 QR Scanner
* **Real-Time Stream**: Server-Sent Events (SSE) native HTTP `text/event-stream`
* **Cloud Storage**: Cloudinary CDN (25 GB Free Tier) with local disk fallback

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v16.0.0 or higher)
* MongoDB (Local instance or MongoDB Atlas cluster)
* Cloudinary Account (Free Tier)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/ranjithjayakumar2005/Event.git
cd Event

# Install dependencies
npm install
```

### 2. Environment Configuration (`.env`)

Create or update the `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/pitch_competition?retryWrites=true&w=majority
JWT_SECRET=ecell_pitch_comp_secret_key_2026_secure
JWT_EXPIRE=24h

# Email Engine Configuration ('brevo' | 'resend' | 'sendgrid' | 'smtp')
EMAIL_SERVICE=brevo
BREVO_API_KEY=your_brevo_api_key_here

# SMTP Configuration (Optional Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME="E-Cell Startup Competition"

# Cloudinary Cloud Object Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Start the Server

```bash
# Start production server
npm start

# Or start development server with Nodemon
npm run dev
```

### 4. Access Portals

* 🎓 **Student Portal**: [http://localhost:5000](http://localhost:5000)
* 🔐 **Admin Portal**: [http://localhost:5000/ecell-portal](http://localhost:5000/ecell-portal)

---

## 🔑 Default Admin Credentials

Upon server startup, a default admin account is automatically seeded if none exists:

* **Username**: `admin` *(or `admin@ecell.edu`)*
* **Password**: `admin123`

---

## 📡 API Endpoints Summary

### Public Student Endpoints (`/api/teams`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/teams/register` | Submit team registration (Rate limited, magic byte verified) |
| `GET` | `/api/teams/status` | Check submission status by Email or Register Number |
| `GET` | `/api/teams/template` | Download official Pitch Deck PPT Template |

### Admin Endpoints (`/api/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Authenticate admin & receive JWT token (Brute-force protected) |
| `GET` | `/api/admin/events` | Real-Time Server-Sent Events (SSE) stream connection |
| `GET` | `/api/admin/stats` | Fetch real-time dashboard statistics |
| `GET` | `/api/admin/teams` | Get teams with search, department, year & status filters |
| `GET` | `/api/admin/teams/:id` | Get full verification details & email logs for a single team |
| `PATCH` | `/api/admin/teams/:id/approve` | Approve team & email entry QR Pass |
| `PATCH` | `/api/admin/teams/:id/reject` | Reject team with reason & notify leader via email |
| `POST` | `/api/admin/verify-ticket` | Verify QR Ticket scan for auditorium check-in |
| `GET` | `/api/admin/export-csv` | Export all team registrations as `.csv` file |
| `GET` | `/api/admin/registration-status` | Get global registration open/closed status |
| `POST` | `/api/admin/toggle-registration` | Open or close competition registration dynamically |

---

## 📁 Project Architecture

```
EVent/
├── client/
│   ├── index.html                  # Student Portal (Registration, Eureka Guide, Auto-Save & Status Tracker)
│   ├── ecell-portal.html           # Admin Portal (Dashboard, Real-Time SSE, Mobile Cards & QR Scanner)
│   ├── css/
│   │   └── style.css               # Glassmorphic UI design system, Dark/Light mode & Mobile CSS
│   ├── js/
│   │   ├── app.js                  # Student portal client logic, auto-save & theme engine
│   │   └── admin.js                # Admin dashboard, SSE stream, mobile cards & QR scanner camera
│   └── assets/
│       └── Startup_Pitch_Template.pptx  # Pitch deck template asset
├── config/
│   └── db.js                       # Mongoose connection setup with in-memory fallback
├── models/
│   ├── Team.js                     # Schema for Teams, Members, EmailLogs, Indexes & Status
│   └── Admin.js                    # Schema for Admin credentials & Bcrypt password hashing
├── middleware/
│   ├── authMiddleware.js           # JWT protection middleware for Admin endpoints
│   ├── rateLimiter.js              # Dedicated rate limiters for login, registration & status lookup
│   ├── uploadMiddleware.js         # Multer, Cloudinary & binary magic byte signature verification
│   └── errorMiddleware.js          # Global error handler with auto temp-file cleanup
├── controllers/
│   ├── teamController.js           # Student registration handler & status query controller
│   └── adminController.js          # Admin dashboard, stats, approval/rejection & QR ticket verifier
├── routes/
│   ├── teamRoutes.js               # Public API routes for student portal
│   └── adminRoutes.js              # Protected API routes & SSE stream for admin dashboard
├── utils/
│   ├── sendEmail.js                # Multi-provider email engine (Brevo, Resend, SendGrid, SMTP)
│   └── sseHub.js                   # Server-Sent Events (SSE) connection manager & broadcast engine
├── tests/
│   └── full_audit_suite.js         # Automated 20/20 End-to-End System Audit Test Suite
├── uploads/                        # Local file storage fallback directory
│   ├── ppt/
│   └── screenshots/
├── server.js                       # Express app entry point & keep-alive ping setup
├── seedAdmin.js                    # Default admin account seeder
├── package.json                    # Project dependencies & scripts
└── README.md                       # Full End-to-End System Documentation
```

---

## 🧪 Automated System Testing

Run the full end-to-end audit test suite verifying all 20 system checkpoints:

```bash
node tests/full_audit_suite.js
```

---

## 🛡️ License

Organized and managed by **Entrepreneurship Development Cell (E-Cell)**. All Rights Reserved 2026.
