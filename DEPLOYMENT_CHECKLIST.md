# Deployment Checklist

## ✅ Pre-Deployment (Optional - can deploy without these!)

### Frontend (Vercel)
- [ ] Push code to GitHub repository
- [ ] Connect repository to Vercel
- [ ] **Deploy without environment variables** - build will succeed!

### Backend (Render)
- [ ] Push code to GitHub repository
- [ ] Create new Web Service on Render
- [ ] Set build command: `pip install -r requirements.txt`
- [ ] Set start command: `gunicorn app.main:app -c gunicorn_conf.py`
- [ ] **Deploy without environment variables** - service will start!

## 🔧 Post-Deployment - Add API Keys Anytime

### Step 1: Test Deployment (No Keys Required)
1. Visit your frontend URL - should load without errors
2. Check backend health: `https://your-backend.onrender.com/health`
3. Expected response:
   ```json
   {
     "status": "ok",
     "checks": {
       "firestore": false,
       "storage": false,
       "gemini": false,
       "nano_banana": false,
       "veo": false,
       "tavily": false
     }
   }
   ```

### Step 2: Add Firebase Authentication (When Ready)

#### Frontend (Vercel)
1. Go to Project Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
   ```
3. Redeploy (Vercel auto-deploys on save)

#### Backend (Render)
1. Go to Environment tab
2. Add:
   ```
   FIREBASE_PROJECT_ID=your_project
   FIREBASE_CLIENT_EMAIL=your_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_STORAGE_BUCKET=your_bucket
   ```
3. Save (Render auto-deploys)

### Step 3: Add AI Features (When Ready)

#### Backend (Render) - Add any/all:
```bash
# For Chat
GEMINI_API_KEY=your_gemini_key

# For Image Generation
NANO_BANANA_API_KEY=your_nano_key

# For Video Generation
VEO_API_KEY=your_veo_key

# For Web Search
TAVILY_API_KEY=your_tavily_key
```

### Step 4: Configure CORS

#### Backend (Render)
```bash
FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

#### Frontend (Vercel)
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

## 🧪 Verification After Adding Keys

### Check Frontend
1. Open browser console
2. Should see: "Firebase initialized successfully"
3. Login button should work

### Check Backend
1. Visit: `https://your-backend.onrender.com/health`
2. Should see `true` for configured services:
   ```json
   {
     "status": "ok",
     "checks": {
       "firestore": true,    ← Now true
       "gemini": true,       ← Now true
       ...
     }
   }
   ```

## 🚨 Troubleshooting

### Build Fails
- Check build logs for syntax errors
- Verify code compiles locally
- **API keys should NOT cause build failures**

### Features Not Working After Adding Keys
1. Check environment variable names (exact match required)
2. Verify values are correct (no extra spaces/quotes)
3. Ensure service redeployed after adding variables
4. Check service logs for specific errors

### Firebase Auth Issues
1. Verify API key is valid in Firebase Console
2. Check auth domain matches Firebase project
3. Ensure frontend and backend use same project
4. Check browser console for specific error messages

## 📚 Additional Resources

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Detailed configuration guide
- [FIX_SUMMARY.md](./FIX_SUMMARY.md) - Technical details of the fix
- [README.md](./README.md) - General project documentation

## 🎉 Success Criteria

- ✅ Frontend builds on Vercel (with or without keys)
- ✅ Backend starts on Render (with or without keys)
- ✅ Health endpoint returns 200 OK
- ✅ Frontend loads without console errors
- ✅ Auth modal shows appropriate message (enabled/disabled)
- ✅ Can add API keys later without redeploying code
