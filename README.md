# Content Factory

> AI-powered content generation and management platform that automates the creation, review, and optimization of marketing content across multiple channels.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

Content creation is time-consuming and requires expertise across research, copywriting, and quality assurance. Marketing teams struggle to produce consistent, high-quality content for multiple channels at scale.

Content Factory solves this with a multi-agent AI pipeline:

| Agent | Responsibility |
|---|---|
| **Researcher** | Extracts key facts and insights from text or URLs |
| **Copywriter** | Generates tailored content for social posts, emails, and blog articles |
| **Editor** | Reviews content against quality standards and drives iterative refinement |
| **Campaign Tracker** | Monitors pipeline progress and maintains campaign history |

---

## Features

- **Google OAuth Authentication** — Secure login with JWT session tokens
- **Multi-Agent Pipeline** — End-to-end AI workflow from research to editorial review
- **Campaign Management** — Create, track, and browse full campaign history
- **Real-Time Processing** — Streamed content generation with live feedback
- **Export & Download** — Download completed campaigns as ZIP archives
- **Database Flexibility** — SQLite for development, MongoDB Atlas for production
- **Responsive Design** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16.2, TypeScript, Tailwind CSS v4.2, Radix UI, NextAuth.js v4, Axios |
| **Backend** | FastAPI, Python 3.8+, Uvicorn, PyJWT, Bcrypt, SQLAlchemy, MongoEngine |
| **AI / APIs** | OpenAI API, Google OAuth 2.0 |
| **Database** | SQLite (dev), MongoDB Atlas (production) |
| **Deployment** | Vercel (frontend), Railway / Render (backend) |

---

## Project Structure

```
content-factory/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── auth.py                  # JWT & OAuth authentication
│   ├── agents/
│   │   ├── researcher.py
│   │   ├── copywriter.py
│   │   ├── editor.py
│   │   └── campaign_tracker.py
│   ├── models/                  # Database models
│   ├── config/database.py
│   └── campaigns/               # Campaign data storage
│
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   ├── login/
    │   ├── campaign/
    │   └── analytics/
    ├── components/              # Reusable React components
    ├── lib/                     # API client, auth config, utilities
    └── auth.ts                  # NextAuth configuration
```

---

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- Git
- Google OAuth 2.0 credentials

---

### Backend Setup

**1. Create and activate a virtual environment**

```bash
cd backend

# macOS / Linux
python3 -m venv venv && source venv/bin/activate

# Windows
python -m venv venv && .\venv\Scripts\activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

**3. Configure environment variables**

Create a `.env` file in the `backend/` directory:

```env
# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS
FRONTEND_URL=http://localhost:3000

# Database
USE_MONGODB=false
# USE_MONGODB=true
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/content-factory
```

**4. Start the server**

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API available at `http://localhost:8000` · Interactive docs at `http://localhost:8000/docs`

---

### Frontend Setup

**1. Install dependencies**

```bash
cd frontend
npm install
```

**2. Configure environment variables**

Create a `.env.local` file in the `frontend/` directory:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_API_URL=http://localhost:8000
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
# macOS / Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

**3. Start the development server**

```bash
npm run dev
```

Frontend available at `http://localhost:3000`

---

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a new project.
2. Navigate to **APIs & Services → Library** and enable the **Google+ API**.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Set Application type to **Web application**.
5. Add `http://localhost:3000` to **Authorized JavaScript origins**.
6. Add `http://localhost:3000/api/auth/callback/google` to **Authorized redirect URIs**.
7. Copy the **Client ID** and **Client Secret** into both `.env` files.

---

### Database Setup

**Local development (SQLite — default)**

No additional setup required. The database is created automatically on first run.

**Production (MongoDB Atlas)**

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a cluster and a database user with read/write permissions.
3. Whitelist your IP address under **Network Access**.
4. Copy the connection string from **Database → Connect → Drivers**.
5. Update your backend `.env`:

```env
USE_MONGODB=true
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/content-factory?retryWrites=true&w=majority
```

---

### Verify Installation

```bash
# Backend health check
curl http://localhost:8000/api/health
# Expected: {"status":"ok","message":"Content Factory API is running"}
```

Then open `http://localhost:3000`, sign in with Google, and confirm you are redirected to the dashboard.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT |
| `POST` | `/api/auth/google-callback` | Handle Google OAuth callback |
| `GET` | `/api/auth/user/{user_id}` | Retrieve a user profile |
| `GET` | `/api/auth/verify` | Verify token validity |

### Content Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research` | Research content from raw text |
| `POST` | `/api/research-url` | Research content from a URL |
| `POST` | `/api/copywrite` | Generate copy from research output |
| `POST` | `/api/run-pipeline` | Execute the full content pipeline |
| `GET` | `/api/campaigns/{id}` | Retrieve a specific campaign |
| `GET` | `/api/campaigns` | List all campaigns for the user |
| `GET` | `/api/health` | API health check |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for signing JWTs — use a strong random value in production |
| `JWT_ALGORITHM` | Signing algorithm (default: `HS256`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `FRONTEND_URL` | Frontend origin URL used for CORS |
| `USE_MONGODB` | Set to `true` to use MongoDB instead of SQLite |
| `MONGODB_URI` | MongoDB Atlas connection string |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js session encryption |
| `NEXTAUTH_URL` | Canonical frontend URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL, exposed to the browser |

---

## Deployment

### Frontend → Vercel

1. Push the repository to GitHub.
2. Import the project in the [Vercel dashboard](https://vercel.com) and set `frontend` as the root directory.
3. Add all required environment variables in the project settings.
4. Deploy.

### Backend → Railway or Render

1. Connect your GitHub repository to [Railway](https://railway.app) or [Render](https://render.com).
2. Set `backend` as the root directory and configure the start command.
3. Add all required environment variables, including `MONGODB_URI`.
4. Deploy and update `NEXT_PUBLIC_API_URL` in the frontend to point to the new backend URL.

---

## Troubleshooting

**Backend won't start**

Check if port 8000 is already in use:

```bash
# macOS / Linux
lsof -i :8000

# Windows
netstat -ano | findstr :8000

# Use an alternate port if needed
python -m uvicorn main:app --port 8001
```

**Frontend build errors**

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Google OAuth not working**

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly in both `.env` files.
- Confirm the redirect URI in Google Cloud Console matches exactly: `http://localhost:3000/api/auth/callback/google`
- Ensure `NEXTAUTH_URL` matches the URL you are accessing in the browser.

**MongoDB connection fails**

- Verify the `MONGODB_URI` format and credentials are correct.
- Confirm your IP address is added to the allowlist in MongoDB Atlas.
- Ensure the database user has read/write permissions on the target database.

---

## License

This project is private and proprietary.#   V e r c e l   d e p l o y m e n t  
 