# Google Gemini-Pro Chat Application

A full-stack chat application that allows users to interact with Google's Gemini AI, with support for text, image, and video generation.

## About The Project

The Google Gemini-Pro Chat Application is a modern web interface that facilitates interactive conversations with Google's GenerativeAI. The application features:
- Real-time chat with Gemini AI models
- Image generation capabilities
- Video generation support
- Web search grounding for factual responses
- Firebase authentication and storage

## Architecture

- **Frontend**: Next.js 14 application with TypeScript and Tailwind CSS
- **Backend**: FastAPI Python application with async support
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Firebase Project
- API Keys (see Environment Variables section)

## Environment Variables

### 🎯 Graceful Degradation Support

**Important**: The application is designed to build and deploy successfully even without API keys configured. Features that require API keys will be gracefully disabled with helpful user messages. You can add API keys at any time after deployment.

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for detailed configuration guide.

### Required vs Optional Configuration

The application uses **graceful degradation** - it will start and run with minimal configuration, but some features will be unavailable without their corresponding API keys.

**Build Status Without API Keys**: ✅ Succeeds (both frontend and backend)

### Backend Environment Variables

#### Firebase Configuration (Recommended for full functionality)
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Note on FIREBASE_PRIVATE_KEY**: The private key must include the newline characters. When setting this in Render or other platforms:
- Keep the quotes around the entire value
- Ensure `\n` characters are preserved (they will be converted to actual newlines by the application)
- Example: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"`

#### AI Service API Keys (Optional - features unavailable without keys)
```bash
GEMINI_API_KEY=your-gemini-api-key          # Required for chat functionality
NANO_BANANA_API_KEY=your-nano-banana-key    # Required for image generation
VEO_API_KEY=your-veo-api-key                # Required for video generation
TAVILY_API_KEY=your-tavily-api-key          # Required for web search grounding
```

**What happens without these keys?**
- ❌ Missing `GEMINI_API_KEY`: Chat endpoints return error, but server starts normally
- ❌ Missing `NANO_BANANA_API_KEY`: Image generation unavailable
- ❌ Missing `VEO_API_KEY`: Video generation unavailable
- ❌ Missing `TAVILY_API_KEY`: Web search/grounding disabled
- ✅ Application deploys and runs successfully in all cases

#### Optional Configuration
```bash
DEFAULT_MODEL=gemini-2.0-flash              # Default: gemini-2.0-flash
STREAM_UPDATE_INTERVAL_MS=500               # Default: 500ms
MAX_ATTACHMENT_SIZE_BYTES=10485760          # Default: 10MB
FRONTEND_ORIGIN=https://your-app.vercel.app # For CORS
```

### Frontend Environment Variables

#### Firebase Configuration (Optional - auth disabled without these)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**What happens without Firebase keys?**
- ❌ Authentication features disabled with user-friendly message
- ✅ App builds and deploys successfully
- ✅ UI remains functional (just shows "auth not configured" in login modal)

#### Backend Connection
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com
```

## Local Development

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables (create a .env file or export them)
export GEMINI_API_KEY=your-key-here
# ... set other env vars as needed

# Run the development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at http://localhost:8000
- Health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

## Production Deployment

### Deploying to Render (Backend)

1. **Create a new Web Service** on [Render](https://render.com)

2. **Configure build settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`

3. **Set environment variables** in the Render dashboard:
   - Add all backend environment variables listed above
   - For `FIREBASE_PRIVATE_KEY`, paste the entire key including `\n` characters
   - Set `FRONTEND_ORIGIN` to your Vercel URL (you'll update this after deploying frontend)

4. **Deploy** - Render will automatically deploy when you push to your main branch

5. **Verify deployment**:
   ```bash
   curl https://your-backend.onrender.com/health
   ```
   
   The health endpoint will show which services are available:
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
   
   If any service shows `false`, check the corresponding environment variable.

### Deploying to Vercel (Frontend)

1. **Import your repository** to [Vercel](https://vercel.com)

2. **Configure project settings** (CRITICAL):
   - **Root Directory**: `frontend` ⚠️ **MUST BE SET** - This tells Vercel where package.json is located
   - **Framework Preset**: Next.js (will be auto-detected once Root Directory is set)
   - **Build Command**: Leave as default (`npm run build`)
   - **Install Command**: Leave as default (`npm install`)
   - **Output Directory**: Leave as default (`.next`)
   
   > **Important**: If you see "No Next.js version detected" error, verify that Root Directory is set to `frontend` in your Vercel project settings.

3. **Set environment variables** in Vercel project settings:
   - Add all frontend environment variables listed above
   - Set `NEXT_PUBLIC_API_BASE_URL` to your Render backend URL

4. **Deploy** - Vercel will automatically build and deploy

5. **Update backend CORS**: Go back to Render and update `FRONTEND_ORIGIN` to your Vercel URL

## Troubleshooting

### Backend won't start / Worker boot failures

**Symptom**: Gunicorn workers repeatedly fail to boot, logs show SystemExit errors

**Solution**: The latest version handles missing environment variables gracefully. Check the health endpoint to see which services are unavailable and add the corresponding API keys.

### Health endpoint shows services as `false`

This is **normal** if you haven't configured all services. The application will work with reduced functionality:
- `firestore: false` - Check Firebase credentials
- `storage: false` - Check FIREBASE_STORAGE_BUCKET
- `gemini: false` - Chat won't work without GEMINI_API_KEY
- `nano_banana: false` - Image generation unavailable
- `veo: false` - Video generation unavailable
- `tavily: false` - Web search grounding unavailable

### Frontend build fails with "No Next.js version detected"

**Symptom**: Vercel build fails with error "No Next.js version detected. Make sure your package.json has 'next' in either 'dependencies' or 'devDependencies'"

**Root Cause**: Vercel is looking for package.json in the wrong directory (repository root instead of frontend subdirectory)

**Solution**: 
1. In Vercel Dashboard → Project Settings → General → "Root Directory"
2. Set to: `frontend` ⚠️ **This is required**
3. Click "Save"
4. Redeploy your project

The vercel.json in the repository root is configured for this setup. Next.js (^14.2.35) is properly listed in `frontend/package.json` dependencies.

### Firebase initialization errors

**Symptom**: "The default Firebase app does not exist"

**Solutions**:
1. Check that all three Firebase credentials are set: PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY
2. Verify FIREBASE_PRIVATE_KEY includes the header, footer, and `\n` characters
3. Check backend logs for specific initialization errors

### CORS errors in browser

**Solution**: Ensure `FRONTEND_ORIGIN` in Render backend matches your exact Vercel URL (including https://)

## API Documentation

Once the backend is running, visit `/docs` for interactive API documentation (Swagger UI).

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Support

- **Documentation**: See DEPLOYMENT.md for detailed deployment guide
- **Issues**: Open an issue on GitHub
- **Firebase**: [Firebase Documentation](https://firebase.google.com/docs)

## Contact

-   Hema Kalyan - [kalyanmurapaka274@gmail.com](mailto:kalyanmurapaka274@gmail.com)

