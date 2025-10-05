# 🚀 DEPLOYMENT INSTRUCTIONS

## Quick Start - Deploy in 10 Minutes!

### ✅ Already Done
- ✅ Code uploaded to GitHub: https://github.com/Hitesh-Jangid/HelpDesk
- ✅ Backend prepared with requirements.txt and Procfile
- ✅ Settings configured for production

### 📦 What You Need
1. GitHub account (already have it!)
2. Render account (free) - https://render.com
3. Vercel account (free) - https://vercel.com
4. Your Firebase credentials from `serviceAccountKey.json`

---

## 🎯 Deploy Backend (Render - 5 minutes)

### Option A: One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

1. Click the button above
2. Select "Web Service"
3. Connect repository: `Hitesh-Jangid/HelpDesk`
4. Settings:
   - **Root Directory:** `helpdesk`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn helpdesk_project.wsgi:application --bind 0.0.0.0:$PORT`
5. Add environment variables (see below)
6. Click "Create Web Service"

### Option B: Manual Setup

1. Go to https://render.com → Sign up with GitHub
2. Click "New +" → "Web Service"
3. Connect `Hitesh-Jangid/HelpDesk` repository
4. Configure as shown in Option A
5. Deploy!

### Environment Variables for Render:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=.onrender.com,.vercel.app
PYTHON_VERSION=3.13.0

# From your serviceAccountKey.json:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

**Your backend URL:** `https://helpdesk-backend-xxxx.onrender.com`

---

## 🎨 Deploy Frontend (Vercel - 3 minutes)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Hitesh-Jangid/HelpDesk)

1. Click button → Login with GitHub
2. Import `Hitesh-Jangid/HelpDesk`
3. Add environment variables (see below)
4. Click "Deploy"

### Environment Variables for Vercel:

```env
VITE_API_URL=https://your-backend-url.onrender.com

# From Firebase Console → Project Settings → Web App:
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Your frontend URL:** `https://your-app.vercel.app`

---

## ✅ Final Step - Update CORS

After deploying frontend:

1. Go to Render Dashboard → Your Backend Service
2. Environment → Edit `ALLOWED_HOSTS`
3. Add your Vercel URL: `.onrender.com,.vercel.app,your-app.vercel.app`
4. Save (auto-redeploys)

---

## 🧪 Test Your Deployment

Visit your Vercel URL and login with:

- **Admin:** admin@helpdesk.com / admin123
- **Agent:** agent@helpdesk.com / agent123  
- **User:** user@helpdesk.com / user123

---

## 📱 Your Live URLs

After deployment, you'll have:

- **Frontend:** https://your-app.vercel.app
- **Backend API:** https://helpdesk-backend-xxxx.onrender.com/api/
- **GitHub:** https://github.com/Hitesh-Jangid/HelpDesk

---

## 🆘 Need Help?

See detailed guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Common Issues:**

- **CORS Error:** Add Vercel URL to `ALLOWED_HOSTS` in Render
- **Firebase Error:** Check environment variables match your `serviceAccountKey.json`
- **500 Error:** Check Render logs for details

---

## 🎉 That's It!

Your HelpDesk is now live and accessible worldwide! 🌍

**Free tier includes:**
- Render: Unlimited projects, may sleep after inactivity
- Vercel: 100GB bandwidth/month
- Perfect for hackathons and portfolios!
