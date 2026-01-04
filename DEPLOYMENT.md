# Deployment Guide

This guide provides step-by-step instructions for deploying the Gemini ChatBot application to production.

## Architecture Overview

- **Frontend**: Next.js 14 application deployed on Vercel
- **Backend**: FastAPI Python application deployed on Render
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account**: Repository should be connected to your deployment platforms
2. **Vercel Account**: For frontend deployment
3. **Render Account**: For backend deployment
4. **Firebase Project**: With Firestore and Storage enabled
5. **API Keys**:
   - Gemini API Key (from Google AI Studio)
   - Nano Banana API Key (for image generation)
   - Veo API Key (for video generation)
   - Tavily API Key (for grounding/search)

---

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enable Firestore Database:
   - Navigate to "Firestore Database" in left sidebar
   - Click "Create database"
   - Start in production mode
   - Choose your preferred location
4. Enable Firebase Storage:
   - Navigate to "Storage" in left sidebar
   - Click "Get started"
   - Follow the setup wizard

### 1.2 Get Firebase Credentials

1. Navigate to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely - you'll need these values:
   - `project_id`
   - `client_email`
   - `private_key`
4. Get Storage Bucket name from Storage settings (format: `your-project.appspot.com`)

### 1.3 Configure Firebase for Web

1. Go to Project Settings → General
2. Under "Your apps", click the web icon (</>) to add a web app
3. Register your app
4. Copy the Firebase configuration object - you'll need these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## Part 2: Backend Deployment (Render)

### 2.1 Connect Repository to Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `Gemini-ChatBot` repository

### 2.2 Configure Web Service

**Basic Settings:**
- **Name**: `gemini-chatbot-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`

### 2.3 Set Environment Variables

In Render dashboard, add the following environment variables:

**Firebase Configuration:**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**API Keys:**
```
GEMINI_API_KEY=your-gemini-api-key
NANO_BANANA_API_KEY=your-nano-banana-key
VEO_API_KEY=your-veo-api-key
TAVILY_API_KEY=your-tavily-api-key
```

**Optional Configuration:**
```
DEFAULT_MODEL=gemini-2.0-flash
STREAM_UPDATE_INTERVAL_MS=500
GUNICORN_WORKERS=4
MAX_ATTACHMENT_SIZE_BYTES=10485760
```

**CORS Configuration (Important!):**
```
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

> **Note**: You'll update `FRONTEND_ORIGIN` after deploying the frontend in Part 3.

### 2.4 Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment to complete (usually 2-5 minutes)
3. Once deployed, note your backend URL (e.g., `https://gemini-chatbot-backend.onrender.com`)

### 2.5 Verify Backend Deployment

Test the health endpoint:
```bash
curl https://your-backend-url.onrender.com/health
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

If any service shows `false`, check the corresponding environment variables.

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Connect Repository to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select the `Gemini-ChatBot` repository

### 3.2 Configure Project Settings

**Framework Preset**: Vercel should auto-detect Next.js

**Build & Development Settings:**
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/.next`
- **Install Command**: `cd frontend && npm install`

**Root Directory**: Leave empty (the `vercel.json` in the root handles this)

### 3.3 Set Environment Variables

Add the following environment variables in Vercel:

**Firebase Configuration (from Part 1.3):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Backend Configuration:**
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com
```

### 3.4 Deploy Frontend

1. Click "Deploy"
2. Wait for build and deployment (usually 1-3 minutes)
3. Once deployed, note your frontend URL (e.g., `https://your-app.vercel.app`)

### 3.5 Update Backend CORS Settings

**Important**: Now that you have the frontend URL, update your backend:

1. Go back to Render dashboard
2. Navigate to your backend service
3. Update these environment variables:
   ```
   FRONTEND_ORIGIN=https://your-app.vercel.app
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
4. Save changes (this will trigger a redeployment)

---

## Part 4: Post-Deployment Verification

### 4.1 Test Frontend

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. You should see the application load without errors
3. Click "Login" to test Firebase Authentication
4. Try sending a chat message to test backend connectivity

### 4.2 Test Backend API

**Health Check:**
```bash
curl https://your-backend-url.onrender.com/health
```

**Test Chat (requires Firebase auth token):**
```bash
curl -X POST https://your-backend-url.onrender.com/chat/stream \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?","request_id":"test-123"}' \
  -N
```

### 4.3 Monitor Logs

**Render (Backend):**
- Navigate to your service in Render dashboard
- Click "Logs" tab to view real-time logs
- Look for any errors or warnings

**Vercel (Frontend):**
- Navigate to your project in Vercel dashboard
- Click on a deployment → "Functions" tab
- Check for any runtime errors

---

## Part 5: Troubleshooting

### Common Issues and Solutions

#### Frontend shows 404 error

**Cause**: Incorrect vercel.json configuration or build settings

**Solution**:
1. Verify `vercel.json` in root contains:
   ```json
   {
     "buildCommand": "cd frontend && npm run build",
     "outputDirectory": "frontend/.next",
     "framework": "nextjs",
     "installCommand": "cd frontend && npm install"
   }
   ```
2. Redeploy from Vercel dashboard

#### Backend Worker Failed to Boot (IndentationError)

**Cause**: Python syntax error in `backend/app/main.py`

**Solution**: This has been fixed in the latest commit. Pull latest changes and redeploy.

#### Backend shows "Firebase: Error (auth/invalid-api-key)"

**Cause**: Missing or incorrect Firebase configuration

**Solution**:
1. Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set correctly in Vercel
2. Check that the API key matches your Firebase project
3. Ensure Firebase Authentication is enabled in Firebase Console

#### CORS errors in browser console

**Cause**: Backend CORS not configured for frontend domain

**Solution**:
1. In Render, set `FRONTEND_ORIGIN` to your exact Vercel URL
2. Set `CORS_ALLOWED_ORIGINS` to the same value
3. Redeploy backend service

#### Health endpoint shows service as `false`

**Cause**: Missing or incorrect API keys/credentials

**Solution**:
- `firestore: false` → Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `storage: false` → Check `FIREBASE_STORAGE_BUCKET`
- `gemini: false` → Check `GEMINI_API_KEY`
- `nano_banana: false` → Check `NANO_BANANA_API_KEY`
- `veo: false` → Check `VEO_API_KEY`
- `tavily: false` → Check `TAVILY_API_KEY`

#### Build succeeds but deployment shows blank page

**Cause**: JavaScript runtime errors, usually related to environment variables

**Solution**:
1. Check browser console for errors
2. Verify all `NEXT_PUBLIC_*` environment variables are set
3. Check Vercel function logs for server-side errors

---

## Part 6: Monitoring and Maintenance

### 6.1 Set Up Monitoring

**Render:**
- Enable "Health Check Path": `/health`
- Set up email/Slack notifications for service failures

**Vercel:**
- Enable "Deployment Protection" for production
- Set up GitHub integration for automatic deployments

### 6.2 Regular Maintenance

1. **Update Dependencies**: Regularly check for security updates
   ```bash
   # Frontend
   cd frontend && npm audit
   
   # Backend
   cd backend && pip list --outdated
   ```

2. **Monitor Costs**:
   - Check Firebase Storage usage
   - Review Render usage/billing
   - Monitor Vercel bandwidth

3. **Backup Data**: Regularly export Firestore data

4. **Rotate API Keys**: Follow the key rotation procedure in RUNBOOK.md

---

## Part 7: Development Workflow

### 7.1 Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export FIREBASE_PROJECT_ID=...  # Set all env vars
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### 7.2 Staging Environment (Optional)

Create separate staging deployments:
- Backend: Deploy a separate Render service with `-staging` suffix
- Frontend: Use Vercel preview deployments (automatic for non-main branches)

### 7.3 CI/CD

Both Vercel and Render automatically deploy when you push to `main`:
- Vercel: Deploys frontend on every push
- Render: Deploys backend on every push

---

## Part 8: Scaling Considerations

### When to Scale

Monitor these metrics:
- Response time > 2 seconds consistently
- CPU usage > 80%
- Memory usage > 80%
- Error rate > 1%

### Scaling Options

**Render (Backend):**
1. Increase instance size (more CPU/RAM)
2. Add more Gunicorn workers: Update `GUNICORN_WORKERS` env var
3. Enable horizontal scaling (requires paid plan)

**Vercel (Frontend):**
- Vercel automatically scales
- Consider upgrading plan for higher bandwidth limits

**Firebase:**
- Firestore scales automatically
- Consider Firestore pricing tiers if usage increases

---

## Support

For issues specific to:
- **Firebase**: [Firebase Support](https://firebase.google.com/support)
- **Render**: [Render Documentation](https://render.com/docs)
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Application Issues**: Open an issue on GitHub

---

## Quick Reference

### Environment Variables Checklist

**Backend (Render):**
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_CLIENT_EMAIL  
- [ ] FIREBASE_PRIVATE_KEY
- [ ] FIREBASE_STORAGE_BUCKET
- [ ] GEMINI_API_KEY
- [ ] NANO_BANANA_API_KEY
- [ ] VEO_API_KEY
- [ ] TAVILY_API_KEY
- [ ] FRONTEND_ORIGIN
- [ ] CORS_ALLOWED_ORIGINS

**Frontend (Vercel):**
- [ ] NEXT_PUBLIC_FIREBASE_API_KEY
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID
- [ ] NEXT_PUBLIC_API_BASE_URL

### Important URLs

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.onrender.com
- **Health Check**: https://your-backend.onrender.com/health
- **Firebase Console**: https://console.firebase.google.com
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Last Updated**: January 2026
**Version**: 1.0
