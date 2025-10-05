# 🚀 Quick Deployment Guide

## ✅ Project Successfully Uploaded to GitHub!

**Repository:** https://github.com/Hitesh-Jangid/HelpDesk

---

## 🎯 Deploy to Free Hosting (Render + Vercel)

### Step 1: Deploy Backend to Render (FREE)

1. **Go to [render.com](https://render.com)** and sign up/login with GitHub

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository:**
   - Select `Hitesh-Jangid/HelpDesk`
   - Click "Connect"

4. **Configure the service:**
   - **Name:** `helpdesk-backend`
   - **Root Directory:** `helpdesk`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn helpdesk_project.wsgi:application --bind 0.0.0.0:$PORT`

5. **Add Environment Variables** (Click "Advanced" → "Add Environment Variable"):

   ```
   DEBUG=False
   SECRET_KEY=django-insecure-ej)$t5yy9p3@4x$-=j=7%2rj7ftm@p&apy7#zkfo!*42u8x^n+
   ALLOWED_HOSTS=.onrender.com
   PYTHON_VERSION=3.13.0
   ```

   **⚠️ Important: Add your Firebase credentials** (from `serviceAccountKey.json`):
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes)
   - Your backend will be live at: `https://helpdesk-backend.onrender.com`

---

### Step 2: Deploy Frontend to Vercel (FREE)

1. **Go to [vercel.com](https://vercel.com)** and sign up/login with GitHub

2. **Click "Add New" → "Project"**

3. **Import your repository:**
   - Select `Hitesh-Jangid/HelpDesk`
   - Click "Import"

4. **Configure the project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Add Environment Variables:**

   Click "Environment Variables" and add:

   ```
   VITE_API_URL=https://helpdesk-backend.onrender.com
   ```

   **Firebase Web Config** (from Firebase Console → Project Settings → Your Apps):
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

6. **Click "Deploy"**

7. **Wait for deployment** (2-3 minutes)
   - Your frontend will be live at: `https://your-app.vercel.app`

---

### Step 3: Update Backend CORS Settings

After deploying frontend, update backend environment variables on Render:

1. Go to Render Dashboard → Your Service → Environment
2. Update `ALLOWED_HOSTS`:
   ```
   ALLOWED_HOSTS=.onrender.com,.vercel.app,your-app.vercel.app
   ```
3. Click "Save Changes" (backend will auto-redeploy)

---

## 🧪 Test Your Deployed Application

1. **Open your Vercel URL:** `https://your-app.vercel.app`

2. **Test with default credentials:**
   - **Admin:** admin@helpdesk.com / admin123
   - **Agent:** agent@helpdesk.com / agent123
   - **User:** user@helpdesk.com / user123

3. **Verify features:**
   - ✅ Login works
   - ✅ Create ticket works
   - ✅ Assign ticket works (Agent)
   - ✅ Real-time updates work
   - ✅ SLA tracking works
   - ✅ Comments work

---

## 🎉 Alternative: Deploy Everything to Render

If you prefer to host both on Render:

### Backend (same as above)

### Frontend on Render:

1. **Click "New +" → "Static Site"**
2. **Connect repository:** `Hitesh-Jangid/HelpDesk`
3. **Configure:**
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Add same environment variables as Vercel**
5. **Click "Create Static Site"**

---

## 📋 Post-Deployment Checklist

- [ ] Backend deployed and running on Render
- [ ] Frontend deployed on Vercel
- [ ] CORS configured properly
- [ ] Firebase credentials added
- [ ] Login tested successfully
- [ ] Ticket creation works
- [ ] Real-time updates work
- [ ] Rate limiting works (100 req/min)

---

## 🔧 Troubleshooting

### Issue: CORS Errors

**Solution:**
- Ensure `ALLOWED_HOSTS` in backend includes your Vercel domain
- Check Django CORS settings include frontend URL

### Issue: Firebase Connection Failed

**Solution:**
- Verify Firebase credentials are correct in environment variables
- Check Firebase project ID matches
- Ensure Firestore is enabled in Firebase Console

### Issue: 500 Internal Server Error

**Solution:**
- Check Render logs: Dashboard → Logs
- Verify all environment variables are set
- Make sure `DEBUG=False` for security

---

## 📱 Share Your Project

Your live URLs:
- **Frontend:** https://your-app.vercel.app
- **Backend API:** https://helpdesk-backend.onrender.com/api/
- **GitHub:** https://github.com/Hitesh-Jangid/HelpDesk

---

## ⚠️ Important Notes

1. **Free Tier Limitations:**
   - Render: May sleep after 15 mins of inactivity (first request takes ~30 seconds)
   - Vercel: 100 GB bandwidth/month
   - Both: Perfect for hackathons and demos!

2. **Security:**
   - Change default test passwords in production
   - Keep your `serviceAccountKey.json` file SECRET
   - Never commit sensitive credentials to GitHub

3. **Firebase Costs:**
   - Free tier: 50K reads + 20K writes per day
   - Monitor usage in Firebase Console

---

## 🎯 Quick Commands Reference

```bash
# View deployment logs (Render)
# Go to Dashboard → Your Service → Logs

# Redeploy (push to GitHub)
git add .
git commit -m "Update: description"
git push origin main

# Local development
# Backend:
cd helpdesk && python manage.py runserver

# Frontend:
npm run dev
```

---

## 🏆 Success!

Your HelpDesk application is now deployed and accessible worldwide! 🌍

**Next Steps:**
1. Share the link with your team/hackathon judges
2. Monitor usage in Firebase Console
3. Check deployment logs if issues occur
4. Update documentation with your live URLs

**Enjoy your deployed application!** 🚀
