# DocAnalyzer — AI-Powered Document Analyzer

A full-stack, production-ready document analysis platform. Upload PDFs, DOCX, TXT, or images,
extract text (with OCR for images), and run AI-powered summary, rewrite, translation, keyword
extraction, sentiment analysis, and document Q&A chat — all behind JWT-secured REST APIs.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, lucide-react |
| Backend    | Node.js, Express.js (MVC), JWT auth, Multer, Winston |
| Database   | PostgreSQL + Prisma ORM |
| Text/OCR   | pdf-parse, mammoth (DOCX), tesseract.js (image OCR) |
| AI         | Google AI Studio (Gemini API) — summarize, rewrite, translate, keywords, sentiment, chat |

## Features

- **Auth**: JWT access + rotating refresh tokens, bcrypt password hashing, role-based access (USER/ADMIN)
- **File upload**: PDF, DOCX, TXT, PNG/JPEG/WEBP, drag-and-drop, 20MB limit, type/size validation
- **Text extraction & OCR**: automatic text extraction per file type, OCR for images via Tesseract
- **AI analysis**: summary, tone rewrite, translation, keyword/entity extraction, sentiment analysis
- **Chat with documents**: ask questions grounded in the uploaded document's content
- **Search & history**: full-text search across filenames/content, paginated history
- **Dashboard**: per-user stats, recent activity
- **Admin panel**: platform-wide stats, user management (role/status/delete), all-documents view
- **Profile**: update name, change password
- **Security**: Helmet, CORS allow-list, rate limiting, input validation (express-validator),
  centralized error handling, parameterized queries via Prisma (no raw SQL injection surface)

## Project Structure

```
document-analyzer/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (User, Document, AnalysisResult, ChatMessage, RefreshToken)
│   │   └── seed.js              # Seeds a default admin user
│   └── src/
│       ├── config/              # env, prisma client, logger
│       ├── controllers/         # route handlers (MVC "controller" layer)
│       ├── middleware/          # auth, validation, upload, rate limit, error handler
│       ├── routes/              # Express routers
│       ├── services/            # ai.service.js (Gemini API), fileParser.service.js (PDF/DOCX/OCR)
│       ├── validators/          # express-validator rule sets
│       ├── utils/               # JWT helpers, response formatter, text chunking
│       ├── app.js               # Express app wiring
│       └── server.js            # entry point
└── frontend/
    └── src/
        ├── components/          # common/, layout/, dashboard/, documents/, admin/
        ├── context/AuthContext.jsx
        ├── pages/                # Login, Register, Dashboard, Upload, History, DocumentDetail, Profile, Admin
        ├── services/             # axios API clients (mirrors backend routes)
        └── App.jsx
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A Google AI Studio (Gemini) API key (for AI features, free tier available) — get one at https://aistudio.google.com/apikey

## Setup

### 1. Database

Create a PostgreSQL database:

```bash
createdb document_analyzer
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GEMINI_API_KEY

npm install
npx prisma migrate dev --name init   # creates tables
npm run prisma:seed                  # creates default admin (admin@example.com / Admin@12345)
npm run dev                          # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit VITE_API_BASE_URL if backend isn't on localhost:5000

npm install
npm run dev                          # starts on http://localhost:5173
```

Open http://localhost:5173, register a new account (or log in with the seeded admin), and start
uploading documents.

### 4. Production build

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build   # outputs static assets to frontend/dist, serve with any static host/CDN or nginx
```

## Environment Variables

**Backend (`backend/.env`)** — see `backend/.env.example` for the full list. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random secrets — **must** be changed from defaults |
| `GEMINI_API_KEY` | Required for all AI features (get one free at aistudio.google.com/apikey) |
| `MAX_FILE_SIZE_MB` | Upload size limit (default 20) |

**Frontend (`frontend/.env`)**:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API, e.g. `http://localhost:5000/api` |

## API Documentation

Base URL: `http://localhost:5000/api`

All authenticated endpoints require header: `Authorization: Bearer <accessToken>`

### Auth

| Method | Endpoint | Description | Body |
|---|---|---|---|
| POST | `/auth/register` | Create account | `{ name, email, password }` |
| POST | `/auth/login` | Login | `{ email, password }` |
| POST | `/auth/refresh` | Rotate access token | `{ refreshToken }` |
| POST | `/auth/logout` | Revoke refresh token | `{ refreshToken }` |

### Users

| Method | Endpoint | Description | Body |
|---|---|---|---|
| GET | `/users/me` | Get own profile | — |
| PUT | `/users/me` | Update name/avatar | `{ name?, avatarUrl? }` |
| PUT | `/users/me/password` | Change password | `{ currentPassword, newPassword }` |

### Documents

| Method | Endpoint | Description | Body / Query |
|---|---|---|---|
| POST | `/documents/upload` | Upload + auto-extract text | multipart `file` |
| GET | `/documents` | List/search/paginate own docs | `?search=&status=&page=&limit=` |
| GET | `/documents/:id` | Get one document + analyses | — |
| DELETE | `/documents/:id` | Delete a document | — |
| GET | `/documents/stats/dashboard` | Dashboard summary stats | — |

### AI Analysis (per document)

| Method | Endpoint | Description | Body |
|---|---|---|---|
| GET | `/documents/:id/analyses` | List saved analysis results | — |
| POST | `/documents/:id/summarize` | Generate summary + key points | — |
| POST | `/documents/:id/rewrite` | Rewrite in a given style | `{ style }` |
| POST | `/documents/:id/translate` | Translate document text | `{ targetLanguage }` |
| POST | `/documents/:id/keywords` | Extract keywords + entities | — |
| POST | `/documents/:id/sentiment` | Sentiment analysis | — |

### Chat

| Method | Endpoint | Description | Body |
|---|---|---|---|
| GET | `/documents/:id/chat` | Get chat history | — |
| POST | `/documents/:id/chat` | Ask a question | `{ message }` |

### Admin (role: ADMIN only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Platform-wide stats |
| GET | `/admin/users` | List/search/paginate all users |
| PUT | `/admin/users/:id/role` | Change a user's role |
| PUT | `/admin/users/:id/status` | Activate/deactivate a user |
| DELETE | `/admin/users/:id` | Delete a user |
| GET | `/admin/documents` | List all documents across users |

### Response format

All endpoints return:
```json
{ "success": true, "message": "...", "data": { }, "meta": { "page": 1, "total": 10 } }
```
Errors:
```json
{ "success": false, "message": "...", "details": [ { "field": "email", "message": "..." } ] }
```

## Architecture Notes

- **MVC**: Routes → Controllers (request/response + orchestration) → Services (business logic:
  AI calls, file parsing) → Prisma (data access). Validators run as middleware before controllers.
- **Security**: Helmet security headers, strict CORS origin, express-rate-limit (tighter on
  `/auth/*`), express-validator on all mutating routes, bcrypt (cost 12), short-lived JWT access
  tokens (15m) with rotating opaque refresh tokens stored server-side (revocable).
- **File processing**: done synchronously on upload for simplicity. For high-volume production
  use, move `extractText` into a background job queue (e.g. BullMQ + Redis) and mark documents
  `PROCESSING` until a worker completes them.
- **AI service**: a single `ai.service.js` wraps Google AI Studio's Gemini `generateContent` API;
  all analysis functions request strict JSON output (`responseMimeType: application/json`) for
  reliable parsing, with graceful error handling and automatic retry-on-rate-limit.

## Default Seeded Admin

```
email: admin@example.com
password: Admin@12345
```

**Change this password immediately in any real deployment.**

## Notes & Next Steps for Hardening

- Add virus scanning (e.g. ClamAV) on uploaded files before processing.
- Move file storage to S3/GCS instead of local disk for horizontal scaling.
- Move text extraction + AI calls to a job queue for large files / high concurrency.
- Add automated tests (Jest + Supertest for backend, Vitest + React Testing Library for frontend).
- Add HTTPS/TLS termination (reverse proxy) and a production-grade process manager (PM2 or a
  container orchestrator).
