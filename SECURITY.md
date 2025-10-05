# 🔒 Security Best Practices

This project follows security best practices to protect sensitive information and ensure safe deployment.

---

## ✅ What We Do Right

### 1. Environment Variables for Secrets

**All sensitive data is stored in environment variables:**

- ✅ Firebase credentials (backend & frontend)
- ✅ Django SECRET_KEY
- ✅ API keys
- ✅ Database connections

**Never in code:**
- ❌ No hardcoded API keys
- ❌ No committed credentials
- ❌ No service account keys in repository

### 2. Secure File Management

**Protected files (in `.gitignore`):**
```
.env
.env.local
.env.*.local
serviceAccountKey.json
**/serviceAccountKey.json
firebase-adminsdk-*.json
```

**Safe to share:**
```
.env.example (placeholder values only)
README.md
DEPLOY.md
```

### 3. Secure Deployment

**Backend (Django):**
- Uses `FIREBASE_CREDENTIALS` environment variable (JSON string)
- Falls back to local file only in development
- Production never uses committed files

**Frontend (React):**
- All Firebase config from `VITE_*` environment variables
- Build-time injection (secure)
- No secrets in client code

---

## 🎯 For Developers

### Setting Up Locally

1. **Copy example files:**
   ```bash
   cp .env.example .env
   cp helpdesk/.env.example helpdesk/.env
   ```

2. **Fill in your credentials:**
   - Get Firebase service account key from Firebase Console
   - Place `serviceAccountKey.json` in `helpdesk/api/` (local only!)
   - Add Firebase web config to `.env`

3. **Never commit:**
   ```bash
   # These files are already in .gitignore
   .env
   helpdesk/.env
   helpdesk/api/serviceAccountKey.json
   ```

### For Production Deployment

1. **Render (Backend):**
   - Add `FIREBASE_CREDENTIALS` as single JSON string
   - Add `SECRET_KEY` (use Django's generator)
   - Set `DEBUG=False`
   - Configure `ALLOWED_HOSTS`

2. **Vercel (Frontend):**
   - Add all `VITE_FIREBASE_*` variables
   - Add `VITE_API_URL` pointing to Render backend

3. **Never:**
   - Upload service account key files
   - Use default SECRET_KEY in production
   - Enable DEBUG in production
   - Commit .env files

---

## 🛡️ Firebase Security

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tickets - role-based access
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.assignedTo == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Comments - authenticated users only
    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### Firebase Authentication

- ✅ Email/Password authentication enabled
- ✅ ID tokens verified on backend
- ✅ Tokens expire and refresh automatically
- ✅ User roles stored in Firestore (not in token claims)

---

## 🚨 Common Security Mistakes to Avoid

### ❌ DON'T:

1. **Commit credentials to git:**
   ```bash
   # BAD - Never do this!
   git add serviceAccountKey.json
   git add .env
   ```

2. **Hardcode secrets:**
   ```javascript
   // BAD!
   const apiKey = "AIzaSy..."
   ```

3. **Share service account keys:**
   - Don't email them
   - Don't post in Slack/Discord
   - Don't include in screenshots

4. **Use DEBUG=True in production:**
   ```python
   # BAD in production!
   DEBUG = True
   ```

### ✅ DO:

1. **Use environment variables:**
   ```javascript
   // GOOD!
   const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
   ```

2. **Use .gitignore:**
   ```bash
   # Add sensitive files
   echo ".env" >> .gitignore
   echo "serviceAccountKey.json" >> .gitignore
   ```

3. **Rotate compromised keys:**
   - If you accidentally commit a key, rotate it immediately
   - Generate new service account key
   - Update environment variables
   - Delete old key

4. **Use example files for sharing:**
   ```bash
   # Share template, not actual credentials
   cp .env .env.example
   # Edit .env.example to remove real values
   ```

---

## 🔐 Secret Management Checklist

Before deploying:

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded credentials in code
- [ ] Service account key is NOT in repository
- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` is unique and strong
- [ ] Firebase security rules are configured
- [ ] `ALLOWED_HOSTS` is properly set
- [ ] CORS settings are correct
- [ ] Rate limiting is enabled
- [ ] All environment variables are set in hosting platforms

---

## 📊 What's Safe to Share

### ✅ Safe (Public):

- GitHub repository (no credentials committed)
- README.md
- DEPLOY.md
- .env.example files
- Source code
- Documentation
- Screenshots

### ⚠️ Keep Private:

- .env files (actual values)
- serviceAccountKey.json
- Firebase private keys
- Django SECRET_KEY
- Production URLs with admin access
- Database credentials
- API keys

### 🔒 Never Share:

- Private keys from service account
- Django SECRET_KEY used in production
- Admin passwords
- OAuth tokens
- Session secrets

---

## 🆘 If You Accidentally Commit Secrets

### Immediate Actions:

1. **Rotate the compromised secret:**
   - Firebase: Generate new service account key
   - Django: Generate new SECRET_KEY
   - Delete the old one

2. **Update environment variables:**
   - Render/Vercel dashboard
   - Local .env files

3. **Remove from git history:**
   ```bash
   # Remove file from all commits
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push
   git push origin --force --all
   ```

4. **Verify:**
   - Check GitHub repository
   - Search for leaked credentials
   - Confirm old keys are revoked

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/4.2/topics/security/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Git Secrets Prevention](https://docs.github.com/en/code-security/secret-scanning)

---

## ✅ This Project is Secure

**We follow industry best practices:**

- 🔒 No secrets committed
- 🔐 Environment-based configuration
- 🛡️ Firebase security rules
- ⚡ Rate limiting enabled
- 🔑 Strong authentication
- 📝 Comprehensive .gitignore
- 📖 Clear documentation

**Safe to:**
- Share on GitHub (public)
- Submit for hackathons
- Include in portfolio
- Deploy to production

**Remember:** Security is everyone's responsibility. Review code before committing!
