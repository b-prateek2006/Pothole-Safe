# 🚀 Deployment Guide for PotholeSafe

## Step 1: Push to GitHub

Run these commands in your project directory:

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/b-prateek2006/Pothole-Safe.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** You need to create the repository on GitHub first:
1. Go to https://github.com/new
2. Create a new repository named `Pothole-Safe`
3. Do NOT initialize with README (your code is ready)
4. Click "Create repository"
5. Then run the commands above

---

## Step 2: Deploy to Railway.app

### Option A: Deploy Backend to Railway

1. Go to https://railway.app
2. Sign up with GitHub (easier)
3. Click "New Project" → "Deploy from GitHub"
4. Select your `Pothole-Safe` repository
5. Railway will auto-detect it's a Node.js project
6. Add these environment variables:
   ```
   PORT=3000
   NODE_ENV=production
   DB_HOST=mysql.railway.internal
   DB_PORT=3306
   DB_NAME=potholesafe
   DB_USER=root
   DB_PASSWORD=manager
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=10485760
   VERIFICATION_MODE=mock
   CONFIDENCE_THRESHOLD=0.6
   SESSION_SECRET=railway-prod-secret-change-this-64-chars
   ALLOWED_ORIGINS=https://YOUR_FRONTEND_URL,http://localhost:5500
   ```

7. Click "Deploy"
8. Wait 2-3 minutes, your backend will get a public URL like: `https://potholesafe-prod-xxx.railway.app`

### Add MySQL Database to Railway:

1. In your Railway project, click "New Service"
2. Select "MySQL"
3. Railway creates it automatically
4. Use the connection details in your environment variables above

### Option B: Deploy Frontend to Vercel (Faster CDN)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. For "Root Directory" select: `./frontend`
6. Add environment variable:
   ```
   VITE_API_BASE=https://YOUR_BACKEND_URL/api
   ```
7. Click "Deploy"
8. Get your frontend URL: `https://pothole-safe-xxx.vercel.app`

---

## Step 3: Update CORS

After deployment, update ALLOWED_ORIGINS in Railway backend:

```
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,https://your-backend-url.railway.app
```

---

## Architecture After Deployment:

```
Frontend (Vercel/Railway) → Backend API (Railway, port 3000) → MySQL (Railway)
```

All accessible globally with live URLs! 🌍

---

## Quick Reference:

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://pothole-safe-xxx.vercel.app |
| Backend API | Railway | https://potholesafe-prod-xxx.railway.app/api |
| Database | Railway MySQL | (attached to backend) |
| Admin Login | Frontend App | Same as frontend URL, then /admin.html |
| Default Credentials | - | admin / admin123 |

---

## Support:

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- If you face issues, check Railway/Vercel dashboards for logs

Ready to deploy? Start with Step 1! 🚀
