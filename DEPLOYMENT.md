# Production Deployment Configuration

## Overview

This document provides the environment variable configuration required for deploying the Gemini ChatBot to production environments (Vercel for frontend, Render for backend).

## Deployment URLs

- **Frontend (Vercel):** `https://gemini-chat-9u50w3c0o-anamitra-sarkars-projects.vercel.app/`
- **Backend (Render):** `https://gemini-backend-g9id.onrender.com`

## Frontend Environment Variables (Vercel)

Configure these in your Vercel project settings under Environment Variables:

### Required

```
NEXT_PUBLIC_BACKEND_URL=https://gemini-backend-g9id.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
```

### Optional

```
NEXT_PUBLIC_VERCEL_URL=<auto-set-by-vercel>
NODE_ENV=production
```

## Backend Environment Variables (Render)

Configure these in your Render service settings under Environment Variables:

### Required - Firebase

```
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account>@<project-id>.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=<your-bucket-name>
```

### Required - API Keys

```
GEMINI_API_KEY=<your-gemini-api-key>
NANO_BANANA_API_KEY=<your-nano-banana-key>
VEO_API_KEY=<your-veo-api-key>
TAVILY_API_KEY=<your-tavily-api-key>
```

### Required - CORS

```
FRONTEND_ORIGIN=https://gemini-chat-9u50w3c0o-anamitra-sarkars-projects.vercel.app
```

### Optional Configuration

```
# Model Configuration
DEFAULT_MODEL=gemini-2.0-flash

# API Endpoints (use defaults if not provided)
NANO_BANANA_ENDPOINT=https://api.nanobanana.example/generate
VEO_ENDPOINT=https://api.veo.example/jobs
TAVILY_ENDPOINT=https://api.tavily.example/search

# Tavily Search Configuration
TAVILY_SEARCH_DEPTH=advanced
TAVILY_MAX_RESULTS=5
TAVILY_MAX_QUERIES_PER_HOUR=20

# Performance Configuration
GUNICORN_WORKERS=<auto-calculated if not set>
GUNICORN_TIMEOUT=120
GUNICORN_GRACEFUL_TIMEOUT=30
GUNICORN_KEEPALIVE=5

# Resource Limits
MAX_ATTACHMENT_SIZE_BYTES=10485760
STREAM_UPDATE_INTERVAL_MS=500
MEDIA_RETENTION_DAYS=30

# Allowed file upload prefixes
ALLOWED_ATTACHMENT_PREFIXES=image/,application/pdf,text/

# Environment
PYTHON_ENV=production
ENV=production
```

## Verification Steps

### 1. Backend Health Check

After deploying the backend, verify all services are running:

```bash
curl https://gemini-backend-g9id.onrender.com/health
```

Expected response:
```json
{
  "ok": true,
  "services": {
    "firestore": true,
    "storage": true,
    "gemini": true,
    "nano_banana": true,
    "veo": true,
    "tavily": true
  }
}
```

### 2. Frontend Connectivity

1. Open the Vercel URL in a browser
2. Check browser console for errors
3. Verify the frontend can connect to the backend
4. Test authentication (anonymous sign-in should work automatically)
5. Test chat functionality with a simple message

### 3. CORS Verification

Ensure cross-origin requests work:

```bash
curl -i -H "Origin: https://gemini-chat-9u50w3c0o-anamitra-sarkars-projects.vercel.app" \
  https://gemini-backend-g9id.onrender.com/health
```

Should include: `Access-Control-Allow-Origin: https://gemini-chat-9u50w3c0o-anamitra-sarkars-projects.vercel.app`

## Troubleshooting

### Frontend Issues

**Build fails on Vercel:**
- Check build logs for the specific error
- Verify all `NEXT_PUBLIC_*` environment variables are set
- Ensure Firebase config values are correct

**Frontend can't reach backend:**
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Check browser console for CORS errors
- Verify backend is running and accessible

### Backend Issues

**Backend won't start:**
- Check Render logs for startup errors
- Verify all required environment variables are set
- Check `/health` endpoint returns all services as `true`

**CORS errors:**
- Ensure `FRONTEND_ORIGIN` matches your Vercel deployment URL exactly
- No trailing slash in the URL
- Use https:// (not http://)

**Authentication failures:**
- Verify Firebase credentials are correct
- Check service account has proper IAM permissions
- Ensure `FIREBASE_PRIVATE_KEY` has proper newline escaping (`\n`)

## Security Notes

1. **Never commit secrets** to the repository
2. Use environment variables for all sensitive data
3. Rotate API keys regularly
4. Monitor usage to detect anomalies
5. Review Firebase security rules regularly

## Additional Resources

- See `RUNBOOK.md` for detailed operational procedures
- See `.env.example` for environment variable templates
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Render Environment Variables: https://render.com/docs/environment-variables
