# Deployment Guide — Sonix

This guide covers deploying the Laravel backend to the cloud and building a standalone APK.

---

## Option A: Deploy Backend to Railway (Recommended)

Railway is the easiest option for Laravel + PostgreSQL.

### Steps:

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Push your code to GitHub:**
   ```bash
   cd social-platform
   git init
   git add .
   git commit -m "Initial commit"
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/sonix.git
   git push -u origin main
   ```

3. **Create a new Railway project:**
   - Go to railway.app → New Project → Deploy from GitHub
   - Select your repository

4. **Add PostgreSQL:**
   - In Railway dashboard → New → PostgreSQL
   - Railway will auto-generate database credentials

5. **Set Environment Variables:**
   Click on your service → Variables tab → Add:
   ```
   APP_KEY=base64:your-generated-key
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-app.up.railway.app
   DB_CONNECTION=pgsql
   DB_HOST=postgres.railway.internal
   DB_PORT=5432
   DB_DATABASE=railway
   DB_USERNAME=postgres
   DB_PASSWORD=your-db-password
   CACHE_STORE=redis
   BROADCAST_CONNECTION=reverb
   REVERB_APP_KEY=any-random-string
   REVERB_APP_SECRET=any-random-secret
   REVERB_APP_ID=any-random-id
   ```

6. **Add a Start Command:**
   - Settings → Start Command:
   ```
   php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT
   ```

7. **Add a Volume for Storage:**
   - Settings → Volumes → Mount Path: `/var/www/html/storage/app/public`

8. **Deploy!** Railway will automatically deploy your app.

---

## Option B: Deploy Backend to Render (Free Tier)

Render offers a free tier that's great for testing.

### Steps:

1. **Create a Render account** at [render.com](https://render.com)

2. **Push code to GitHub** (same as Railway steps above)

3. **Create a new Web Service:**
   - New → Web Service → Connect GitHub repo
   - Runtime: PHP
   - Build Command:
     ```
     composer install --no-dev
     cp .env.example .env
     php artisan key:generate
     php artisan migrate --force
     php artisan config:cache
     php artisan route:cache
     ```
   - Start Command:
     ```
     php artisan serve --host=0.0.0.0 --port=$PORT
     ```

4. **Add PostgreSQL:**
   - New → PostgreSQL
   - Copy the Internal Database URL

5. **Set Environment Variables:**
   - Same as Railway (see above)
   - Use Render's PostgreSQL URL for DB settings

6. **Deploy**

---

## Build APK (Standalone App)

This creates an APK that works without Expo Go.

### Steps:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS Build:**
   ```bash
   cd expo-app
   eas build:configure
   ```
   Choose "Preview" when prompted.

4. **Update API URL in `src/api/client.js`:**
   ```javascript
   const API = "https://your-backend-url.railway.app/api";
   ```

5. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```

6. **Download APK:**
   - After build completes, Expo gives you a download link
   - Send this link to anyone to install the app

---

## Important Notes

1. **Update API URL:** After deploying the backend, update `expo-app/src/api/client.js` with the new URL

2. **WebSocket URL:** Update `expo-app/src/api/websocket.js` with your deployed server URL

3. **Storage:** Make sure `php artisan storage:link` is run on the server, or configure a cloud storage (S3)

4. **Environment:** Never commit `.env` file with real credentials to GitHub

5. **HTTPS:** For production, always use HTTPS (Railway and Render provide this automatically)
