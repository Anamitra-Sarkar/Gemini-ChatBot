# Environment Variables Configuration

This guide explains how to configure environment variables for both frontend and backend deployments. **The application is designed to gracefully handle missing API keys** - the build and deployment will succeed even if some or all API keys are not provided. Features requiring those keys will simply be disabled until you add them.

## 🎯 Key Features

- ✅ **Build succeeds with missing API keys** - no deployment failures
- ✅ **Graceful degradation** - features disable when keys are missing
- ✅ **Add keys anytime** - configure API keys after deployment
- ✅ **Clear user feedback** - users see helpful messages when features are unavailable

---

## Frontend Environment Variables (Vercel)

### Required for Authentication Features
If these are not provided, authentication will be disabled but the app will still build and run:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### Backend Connection
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

### Setting in Vercel

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Variable Name: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: (your actual key)
   - Environments: Select Production, Preview, Development as needed
4. Click **Save**
5. Redeploy your application to apply changes

**Note**: You can deploy first without any environment variables, then add them later and redeploy.

---

## Backend Environment Variables (Render)

### Firebase Admin SDK (Optional - Auth Verification)
If not provided, Firebase authentication verification will be skipped:

```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
```

### AI/ML API Keys (Optional - Feature-specific)

**Gemini API** (for chat functionality):
```bash
GEMINI_API_KEY=your_gemini_api_key
```

**Nano Banana API** (for image generation):
```bash
NANO_BANANA_API_KEY=your_nano_api_key
```

**Veo API** (for video generation):
```bash
VEO_API_KEY=your_veo_api_key
```

**Tavily API** (for web search/grounding):
```bash
TAVILY_API_KEY=your_tavily_api_key
```

### CORS Configuration
```bash
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

### Setting in Render

1. Go to your service on Render
2. Navigate to **Environment** tab
3. Add each variable:
   - Key: `GEMINI_API_KEY`
   - Value: (your actual key)
4. Click **Save Changes**
5. Render will automatically redeploy with new environment variables

**Note**: You can deploy first without any API keys. The service will start successfully and you can add keys later.

---

## 🚀 Deployment Without API Keys

### Initial Deployment

1. **Frontend (Vercel)**:
   - Deploy without any environment variables
   - App will build successfully
   - Authentication features will show "not configured" message
   - Users can still interact with the UI

2. **Backend (Render)**:
   - Deploy without any API keys
   - Service starts successfully
   - Check `/health` endpoint to see which features are available
   - Missing features will log warnings but won't crash

### Adding Keys Later

You can add API keys at any time:

1. Add environment variables in Vercel/Render dashboard
2. Trigger a new deployment (or it may auto-deploy)
3. Features will become available automatically

---

## 🔍 Checking Feature Availability

### Backend Health Check

Visit: `https://your-backend.onrender.com/health`

Response example:
```json
{
  "status": "ok",
  "checks": {
    "firestore": true,
    "storage": false,
    "gemini": true,
    "nano_banana": false,
    "veo": false,
    "tavily": true
  }
}
```

### Frontend

- If Firebase is not configured, auth modal will show: "Authentication is currently unavailable"
- Console will log: "Firebase config is incomplete"

---

## 📋 Feature Dependencies

| Feature | Required Environment Variables |
|---------|-------------------------------|
| User Authentication | `NEXT_PUBLIC_FIREBASE_*` (frontend) + `FIREBASE_*` (backend) |
| Chat/Conversations | `GEMINI_API_KEY` (backend) |
| Image Generation | `NANO_BANANA_API_KEY` (backend) |
| Video Generation | `VEO_API_KEY` (backend) |
| Web Search | `TAVILY_API_KEY` (backend) |

---

## 🐛 Troubleshooting

### "Firebase Error: auth/invalid-api-key"

**Cause**: Firebase API key is invalid or not set.

**Solution**: 
1. Check that `NEXT_PUBLIC_FIREBASE_API_KEY` is correctly set in Vercel
2. Verify the key is correct in Firebase Console
3. Or remove the key to disable auth features (app will still work)

### Backend Features Not Working

**Check**:
1. Visit `/health` endpoint to see which APIs are configured
2. Check Render logs for warnings about missing keys
3. Add the required API key in Render environment variables

### Deployment Fails

**This should NOT happen with missing API keys**. If it does:
1. Check for syntax errors in your code
2. Check build logs for the actual error
3. Ensure environment variable format is correct (no extra quotes, spaces)

---

## 🔐 Security Best Practices

1. **Never commit API keys** to git
2. **Use `.env.example`** files to document required variables
3. **Rotate keys regularly** if they're exposed
4. **Use different keys** for development and production
5. **Restrict API keys** with appropriate permissions in their respective consoles

---

## 📝 Example Files

See:
- `frontend/.env.example` - Frontend environment variables template
- `backend/.env.example` - Backend environment variables template

Copy these files to `.env.local` (frontend) or `.env` (backend) for local development.
