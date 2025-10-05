# 🚀 Secure Deployment Guide

## ✅ Project Repository
**GitHub:** https://github.com/Hitesh-Jangid/HelpDesk

---

## 🔒 Security Notice

**This project is configured with security best practices:**
- ✅ All sensitive data uses environment variables
- ✅ No credentials are committed to the repository
- ✅ `.env` and `serviceAccountKey.json` are in `.gitignore`
- ✅ Example files (`.env.example`) provided for reference

**Never commit:**
- Firebase service account keys
- API keys or secrets
- `.env` files with real credentials

---

## 📋 Prerequisites

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project or create new one
3. Enable **Firestore Database**
4. Get your credentials:
   - **For Backend:** Project Settings → Service Accounts → Generate Private Key (saves JSON file)
   - **For Frontend:** Project Settings → Your Apps → Web App Config

### 2. Create Free Hosting Accounts

- **Backend:** [Render.com](https://render.com) (sign up with GitHub)
- **Frontend:** [Vercel.com](https://vercel.com) (sign up with GitHub)

---

## 🎯 Step 1: Deploy Backend to Render

### Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `Hitesh-Jangid/HelpDesk`
4. Configure:
   ```
   Name: helpdesk-backend
   Root Directory: helpdesk
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn helpdesk_project.wsgi:application --bind 0.0.0.0:$PORT
   Plan: Free
   ```

### Add Environment Variables

Click **"Advanced"** then add these variables:

#### Basic Django Settings
```
DEBUG = False
SECRET_KEY = [generate a secure random key]
ALLOWED_HOSTS = .onrender.com,.vercel.app
PYTHON_VERSION = 3.13.0
```

**To generate a secure SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Firebase Credentials

Open your downloaded `serviceAccountKey.json` and add as ONE environment variable:

```
FIREBASE_CREDENTIALS = [paste entire JSON content as single line]
```

**Example format:**
```
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

### Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. **Save your backend URL:** `https://helpdesk-backend-XXXX.onrender.com`

---

## 🎨 Step 2: Deploy Frontend to Vercel

### Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import `Hitesh-Jangid/HelpDesk` repository
4. Configure:
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   ```

### Add Environment Variables

Click **"Environment Variables"** tab and add:

#### Backend URL
```
VITE_API_URL = https://your-backend-url.onrender.com
```
*(Replace with your actual Render backend URL from Step 1)*

#### Firebase Web Config

Get these from Firebase Console → Project Settings → Your Apps → Web App:

```
VITE_FIREBASE_API_KEY = AIza...
VITE_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = your-project-id
VITE_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID = 1:123:web:abc...
```

### Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. **Save your frontend URL:** `https://your-app.vercel.app`

---

## ✅ Step 3: Update CORS Settings

After frontend deploys, update backend to allow requests:

1. Go to Render Dashboard → Your Backend Service
2. Click **"Environment"** tab
3. Find `ALLOWED_HOSTS` variable
4. Update value to include your Vercel domain:
   ```
   .onrender.com,.vercel.app,your-app.vercel.app
   ```
5. Click **"Save Changes"** (backend will auto-redeploy in ~30 seconds)

---

## 🧪 Test Your Deployed Application

### 1. Open Your Live Site

Visit your Vercel URL: `https://your-app.vercel.app`

### 2. Login with Test Credentials

- **Admin:** `admin@helpdesk.com` / `admin123`
- **Agent:** `agent@helpdesk.com` / `agent123`
- **User:** `user@helpdesk.com` / `user123`

### 3. Verify Features

- ✅ User registration works
- ✅ Login authentication
- ✅ Create a new ticket
- ✅ Assign tickets (as Agent)
- ✅ Add comments
- ✅ SLA tracking updates
- ✅ Real-time updates (open in 2 tabs)
- ✅ Search and filters
- ✅ Admin reports

---

## 🔧 Troubleshooting

### Backend Won't Start

**Check Render Logs:**
1. Render Dashboard → Your Service → "Logs" tab
2. Look for error messages

**Common Issues:**
- Missing environment variables
- Incorrect `FIREBASE_CREDENTIALS` format (must be valid JSON)
- Wrong start command

### Frontend Shows CORS Error

**Solution:**
1. Verify `ALLOWED_HOSTS` includes your Vercel domain
2. Check backend is running (visit backend URL directly)
3. Ensure `VITE_API_URL` in Vercel matches your Render URL exactly

### Firebase Connection Failed

**Check:**
- All Firebase environment variables are correct
- Firebase project is active
- Firestore database is enabled in Firebase Console
- Service account key has proper permissions

### 401 Unauthorized Errors

**Verify:**
- Firebase credentials are correctly set
- Frontend Firebase config matches your project
- User exists in Firestore `users` collection

---

## 🎯 Local Development Setup

### Backend (Django)

1. Create `helpdesk/.env` file (copy from `.env.example`)
2. Place your `serviceAccountKey.json` in `helpdesk/api/` directory
3. Run:
   ```bash
   cd helpdesk
   pip install -r requirements.txt
   python manage.py runserver
   ```

### Frontend (React + Vite)

1. Create `.env` file (copy from `.env.example`)
2. Add your Firebase web config
3. Run:
   ```bash
   npm install
   npm run dev
   ```

---

## 📊 Free Tier Limits

### Render (Backend)
- ✅ Free tier includes 750 hours/month
- ⚠️ Service sleeps after 15 minutes of inactivity
- ⏱️ First request after sleep takes ~30 seconds
- 💡 Perfect for demos and hackathons!

### Vercel (Frontend)
- ✅ Unlimited projects
- ✅ 100 GB bandwidth per month
- ✅ Instant deployments
- ✅ Custom domains supported

### Firebase
- ✅ 50,000 reads per day
- ✅ 20,000 writes per day
- ✅ 1 GB storage
- 💡 Sufficient for testing and small projects

---

## 🎉 Success!

Your HelpDesk application is now securely deployed and accessible worldwide! 🌍

**Share your project:**
- **Live Demo:** https://your-app.vercel.app
- **GitHub:** https://github.com/Hitesh-Jangid/HelpDesk
- **Backend API:** https://helpdesk-backend-XXXX.onrender.com/api/

**⚠️ Security Reminders:**
- Change default test passwords in production
- Monitor Firebase usage in console
- Never share your service account key
- Keep environment variables secure

---

## 📚 Additional Resources

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment guide
- [README.md](./README.md) - Project documentation
- [docs/FEATURES.md](./docs/FEATURES.md) - Feature documentation
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture

---

**Need help?** Check the logs in Render/Vercel dashboards or review the detailed guides.
