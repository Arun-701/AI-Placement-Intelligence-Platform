# AI Placement Intelligence Platform

A full-stack AI-powered campus placement readiness platform with three roles: **Student**, **Faculty**, and **Admin**. It includes resume analysis (AI), assessments, coding profile tracking, personalized learning roadmaps, career recommendations, and an AI career assistant chat.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 19 + Vite 8 (JavaScript, `react-router-dom`) |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| AI | Multi-provider with automatic fallback: NVIDIA → Kimi (TokenRouter) → Gemini |

## Project Structure

```
AI-Placement-Intelligence-Platform/
├── server/          # Express API backend
│   ├── config/      # DB, env validation, AI providers, rate limits
│   ├── controllers/ # Route handlers
│   ├── middleware/  # Auth, roles, uploads, error handling
│   ├── models/      # Mongoose schemas
│   ├── routes/      # Express routers (mounted under /api)
│   ├── services/    # Business logic (AI, resume, readiness, roadmap...)
│   └── server.js    # Entry point
├── client/          # React frontend
│   └── src/
│       ├── api.js           # API client (token + localStorage)
│       ├── AuthContext.jsx  # Auth provider
│       └── pages/           # Student / Faculty / Admin pages
└── package.json     # Root scripts
```

## Prerequisites

- **Node.js** v18+ (tested on v24)
- **MongoDB** (Atlas or local)
- **npm** (comes with Node.js)

## 1. Backend Setup

```bash
cd server
npm install
```

### Environment variables

Create `server/.env` (or edit the existing one) with the following:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret
UPLOAD_DIR=uploads

# Primary AI provider (NVIDIA)
NVIDIA_API_KEY=nvapi-your-nvidia-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=riva-translate-4b-instruct-v2

# Fallback AI provider (Kimi via TokenRouter)
TOKENROUTER_API_KEY=sk-your-tokenrouter-key
TOKENROUTER_BASE_URL=https://api.tokenrouter.com/v1
TOKENROUTER_MODEL=moonshotai/kimi-k3-free

# Optional last-resort AI provider (Gemini)
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

> **Note on the AI providers:** The service tries **NVIDIA first**; if it fails or times out, it automatically falls back to **Kimi (TokenRouter)**, then **Gemini**. At least one provider key is required for AI features (chat, resume analysis, career recommendations). AI calls to Kimi can take ~20–60 seconds on the free model.

### Run the backend

```bash
npm run dev      # starts with nodemon (auto-restart on file changes)
# or
node server.js
```

Backend runs at: **http://localhost:5000**

## 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173** (Vite auto-picks **5174** if 5173 is busy).

The Vite dev server proxies all `/api` requests to `http://localhost:5000` (configured in `client/vite.config.js`), so you only need to open the frontend URL in the browser.

## 3. Verify it works

- Open the frontend URL (e.g. `http://localhost:5174`)
- Register a **Student** account → enter the 6-digit email verification code → login
- The student dashboard loads; `GET /api/student/dashboard` should return 200
- Try AI: `POST /api/ai/chat` with `{ "prompt": "..." }` (auth required)

### Key API routes (all under `/api`)

| Area | Routes |
| ---- | ------ |
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-email-otp`, `/api/auth/resend-verification`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Student | `/api/student/dashboard`, `/api/student/profile`, `/api/student/coding-profile`, `/api/student/assessments` |
| Assessment | `/api/assessment` (list/take/submit), `/api/assessment-result` |
| Roadmap | `/api/roadmap/generate`, `/api/roadmap/me`, `/api/roadmap/progress`, `/api/roadmap/milestone/:id` |
| AI | `/api/ai/chat`, `/api/ai/resume-analysis/*`, `/api/ai/career-recommendation/*` |
| Faculty | `/api/faculty/*`, `/api/question-bank`, `/api/assessment` (faculty) |
| Admin | `/api/admin/*` (students, faculties, reports) |
| Notification | `/api/notification/*` |

## Useful scripts

```bash
# Backend
cd server
npm run dev          # nodemon
npm start            # plain node

# Frontend
cd client
npm run dev          # vite dev server
npm run build        # production build (dist/)
npm run lint         # eslint check
```

## Notes

- **Never commit `server/.env`** — it contains real credentials. It is listed in `.gitignore`.
- Collections (students, faculties, admins, assessments, etc.) are created automatically by Mongoose on first use.
- Uploaded resume files go to `server/uploads/` (git-ignored).
