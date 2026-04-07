# Content Factory - AI-Powered Content Generation Platform

A multi-agent content creation platform that transforms product descriptions into coordinated, high-quality content across Blog, Social Media, and Email channels using AI agents.

![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)

## 🎯 Features

- **Multi-Agent Content Generation**: Specialized AI agents for research, copywriting, and editing
- **Coordinated Output**: Blog posts, social media threads, and email teasers work together seamlessly
- **Real-time Streaming**: Watch content generation progress via Server-Sent Events (SSE)
- **Dual Authentication**: Google OAuth + Email/Password authentication
- **User Isolation**: Complete data separation between users
- **Campaign Management**: Track campaign history and analytics
- **Content Export**: Download or copy generated content in multiple formats
- **Feedback & Regeneration**: Request revisions to specific content pieces

## 🏗️ Architecture

### Frontend (Next.js 16 + TypeScript)
- **Framework**: Next.js with Turbopack for fast builds
- **UI**: React 19 with Radix UI components and TailwindCSS
- **Auth**: NextAuth.js 4 with Google OAuth and local auth
- **HTTP Client**: Axios with request interceptors for automatic token management
- **State Management**: React hooks + Context API

### Backend (FastAPI + Python 3.13)
- **Framework**: FastAPI with Uvicorn server
- **Database**: MongoDB (production) / SQLite (local development)
- **ODM**: MongoEngine for MongoDB integration
- **AI Engine**: Groq API for LLM calls
- **Auth**: PyJWT for token generation and verification

### Deployment
- **Frontend**: Vercel (https://content-factory-chi.vercel.app)
- **Backend**: Railway (https://content-factory-production-fa72.up.railway.app)
- **Database**: MongoDB Atlas (production)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.13 (for backend)
- MongoDB Atlas account (for production)
- Google OAuth credentials (for authentication)

### Local Development

#### 1. Clone Repository
```bash
git clone https://github.com/bipaulr/content-factory.git
cd content-factory
```

#### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials:
# - GROQ_API_KEY
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - JWT_SECRET
# - MongoDB URI (if using MongoDB)

# Run development server
python -m uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env.local
# Edit .env.local:
# - NEXT_PUBLIC_API_URL=http://localhost:8000
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET

# Run development server
npm run dev
```

Frontend runs on `http://localhost:3000`

### Environment Variables

#### Backend (.env)
```bash
# LLM API Keys
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Authentication
JWT_SECRET=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
USE_MONGODB=true (for production) / false (for local)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database

# Optional
FRONTEND_URL=https://your-frontend-domain.com
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=generated-secret-key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📂 Project Structure

```
content-factory/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx         # Dashboard
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── campaign/        # Campaign pages
│   │   │   ├── new/         # Create campaign
│   │   │   └── [id]/        # Campaign details
│   │   ├── history/         # Campaign history
│   │   └── analytics/       # Analytics dashboard
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and API client
│   └── providers/           # Context providers
│
├── backend/                 # FastAPI backend application
│   ├── main.py             # Application entry point
│   ├── auth.py             # Authentication logic
│   ├── models/             # Data models
│   │   ├── user.py         # User model
│   │   └── mongodb_user.py # MongoDB user model
│   ├── agents/             # AI agent implementations
│   │   ├── researcher.py   # Research agent
│   │   ├── copywriter.py   # Copywriting agent
│   │   ├── editor.py       # Editing agent
│   │   └── campaign_tracker.py
│   ├── config/             # Configuration
│   └── campaigns/          # Campaign data storage
│
└── README.md               # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google-callback` - Google OAuth callback

### Campaigns
- `POST /api/run-pipeline-async` - Create campaign from text
- `POST /api/run-pipeline-async-file` - Create campaign from file
- `POST /api/run-pipeline-async-url` - Create campaign from URL
- `GET /api/campaigns` - List user's campaigns
- `GET /api/campaigns/{id}` - Get campaign details
- `GET /api/campaigns/{id}/feedback-history` - Get feedback history

### Content Regeneration
- `POST /api/campaigns/{id}/regenerate-blog` - Regenerate blog content
- `POST /api/campaigns/{id}/regenerate-social` - Regenerate social content
- `POST /api/campaigns/{id}/regenerate-email` - Regenerate email content

### Export
- `GET /api/campaigns/{id}/export-clipboard` - Export as HTML
- `GET /api/campaigns/{id}/export-zip` - Export as ZIP

### Streaming
- `GET /api/pipeline/stream/{campaign_id}` - SSE stream for campaign progress

### System
- `GET /api/health` - Health check
- `GET /api/analytics` - User analytics
- `GET /api/analytics/{campaign_id}` - Campaign-specific analytics

## 🛠️ Development Commands

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend
```bash
python -m uvicorn main:app --reload              # Development server
python -m uvicorn main:app --host 0.0.0.0        # Production server
```

## 📦 Build & Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Automatic deployment on push to `main` branch

```bash
# Manual build
npm run build
npm run start
```

### Backend (Railway)
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `USE_MONGODB=true`
   - `MONGODB_URI=your-mongodb-connection-string`
   - All API keys and secrets

3. Automatic deployment on push to `main` branch

## 🔐 Security Considerations

- ✅ JWT tokens for authentication
- ✅ CORS configured for specific domains
- ✅ Environment variables for sensitive data
- ⚠️ TODO: Migrate from localStorage to httpOnly cookies
- ⚠️ TODO: Implement rate limiting
- ⚠️ TODO: Add request validation/sanitization

## 🤝 AI Agents

### Researcher Agent
- Analyzes product information
- Extracts key features and benefits
- Identifies target audience insights

### Copywriter Agent
- Generates blog posts (500+ words)
- Creates social media threads (3-5 tweets)
- Writes email teasers (compelling CTAs)

### Editor Agent
- Reviews all generated content
- Provides feedback and suggestions
- Ensures brand consistency

## 📊 Analytics

Track campaign performance with:
- Total campaigns created
- Completion rates
- Success rate percentage
- Average completion time
- Content regeneration usage
- Revision rates

## 🐛 Troubleshooting

### CORS Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS configuration includes your domain
- Ensure backend is running and accessible

### Authentication Issues
- Clear browser cookies and localStorage
- Verify environment variables are set
- Check Google OAuth credentials are valid

### Database Errors
- Local: Ensure `.venv/campaigns/` directory exists and is writable
- Production: Verify MongoDB URI is correct and cluster allows access

### Campaign Creation Fails
- Check backend logs for specific error
- Verify API keys (Groq, Gemini) are valid
- Ensure sufficient API quota remains

## 🚦 Status

- ✅ Google OAuth integration
- ✅ Email/password authentication
- ✅ Campaign creation and management
- ✅ Multi-agent content generation
- ✅ Real-time progress streaming
- ✅ Analytics dashboard
- ✅ Vercel deployment
- ✅ Railway deployment
- ⏳ MongoDB production database
- 🔄 Content feedback system (in development)

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**Bipaulr**
- GitHub: [@bipaulr](https://github.com/bipaulr)

## 🙏 Acknowledgments

- [Groq API](https://www.groq.com/) - LLM inference
- [Google AI](https://ai.google/) - Gemini API
- [Hugging Face](https://huggingface.co/) - ML models
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database
- [Vercel](https://vercel.com/) - Frontend hosting
- [Railway](https://railway.app/) - Backend hosting

---

**Built with ❤️ using Next.js, FastAPI, and AI agents**

