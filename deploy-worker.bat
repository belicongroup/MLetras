@echo off
REM MLetras Cloudflare Worker Deployment Script for Windows

echo 🚀 Deploying MLetras API Proxy to Cloudflare...

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Wrangler CLI not found. Installing...
    npm install -g wrangler
)

REM Login to Cloudflare (if not already logged in)
echo 🔐 Logging into Cloudflare...
wrangler login

REM Deploy the worker
echo 📦 Deploying worker...
cd cloudflare-worker
wrangler deploy

echo ✅ Worker deployed successfully!
echo.
echo 📋 Next steps:
echo 1. Go to Cloudflare Dashboard → Workers ^& Pages → mletras-api-proxy
echo 2. Go to Settings → Variables
echo 3. Add environment variable: MUSIXMATCH_API_KEY = 4d54e92614bedfaaffcab9fdbf56cdf3
echo 4. Go to Settings → Triggers → Custom Domains
echo 5. Add custom domain: api.mletras.com
echo.
echo 🧪 Test your proxy:
echo https://api.mletras.com/musixmatch/track.search?q_track=test^&page_size=10
