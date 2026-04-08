# Nestlé HR·EOS — Deployment Guide

## Folder Structure Required
```
nestle-eos/                  ← root (Railway deploys this)
├── server.js
├── database.js
├── auth.js
├── seed_employees.js
├── package.json             ← use server_package.json (rename it)
├── railway.json
├── .gitignore
├── .env.example
└── client/                  ← put your React app here
    ├── package.json         ← your existing React package.json
    ├── public/
    └── src/
        └── App.js           ← nestle_hr_ai_demo.jsx
```

## Step-by-Step Railway Deployment

### 1. Prepare your project folder

```bash
# Create the deployment folder
mkdir nestle-eos
cd nestle-eos

# Copy backend files
copy server.js .
copy database.js .
copy auth.js .
copy seed_employees.js .
copy server_package.json package.json   ← RENAME this
copy railway.json .
copy .gitignore .

# Move your React app into a "client" subfolder
mkdir client
# Copy your entire React project into client/
# (the folder containing package.json, src/, public/)
```

### 2. Update client/package.json — add proxy

Open `client/package.json` and add this line:
```json
{
  "proxy": "http://localhost:3001"
}
```
This makes dev work. In production Railway serves everything from one URL.

### 3. Initialise Git and push to GitHub

```bash
cd nestle-eos
git init
git add .
git commit -m "Initial deployment"

# Create a new GitHub repo at github.com and push:
git remote add origin https://github.com/YOUR_USERNAME/nestle-eos.git
git push -u origin main
```

### 4. Deploy on Railway

1. Go to **railway.app** → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `nestle-eos` repo
4. Railway auto-detects Node.js and starts building

### 5. Set Environment Variables

In Railway dashboard → your project → **Variables** tab:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-YOUR_REAL_KEY` |

Railway sets `PORT` automatically — don't add it manually.

### 6. Seed the database after first deploy

In Railway dashboard → your project → **Shell** tab:
```bash
node seed_employees.js
```

### 7. Done! 🎉

Railway gives you a URL like: `https://nestle-eos-production.up.railway.app`

---

## Estimated Cost
- Railway **Hobby plan**: $5/month
- Includes: 512MB RAM, 1GB disk, always-on service
- Perfect for demo purposes

## Notes
- SQLite database is stored on Railway's disk — persists between deploys
- If you redeploy, the DB survives (it's on the filesystem, not in git)
- To reset the DB: Railway Shell → `rm nestle_eos.db` → `node server.js` (auto-seeds)
