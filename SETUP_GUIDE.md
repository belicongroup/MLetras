# 🚀 MLetras Complete Setup Guide

## What's Been Created

### ✅ Cloudflare Worker Proxy
- **Location**: `cloudflare-worker/` folder
- **Purpose**: Secure API proxy hiding your Musixmatch API key
- **Domain**: `api.mletras.com`

### ✅ Updated App Code
- **File**: `src/services/musixmatchApi.ts`
- **Changes**: Removed client-side API key, now uses proxy
- **Security**: API key never exposed to browsers

### ✅ Deployment Scripts
- **Linux/Mac**: `deploy-worker.sh`
- **Windows**: `deploy-worker.bat`

## Step-by-Step Setup

### 1. 🏗️ Deploy Cloudflare Worker

**Option A: Using Scripts (Recommended)**
```bash
# Windows
deploy-worker.bat

# Linux/Mac
chmod +x deploy-worker.sh
./deploy-worker.sh
```

**Option B: Manual Deployment**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
cd cloudflare-worker
wrangler deploy
```

### 2. ⚙️ Configure Cloudflare Dashboard

1. **Go to**: Cloudflare Dashboard → Workers & Pages → `mletras-api-proxy`

2. **Set Environment Variables**:
   - Go to Settings → Variables
   - Add: `MUSIXMATCH_API_KEY` = `4d54e92614bedfaaffcab9fdbf56cdf3`

3. **Configure Custom Domain**:
   - Go to Settings → Triggers → Custom Domains
   - Add: `api.mletras.com`

### 3. 🧪 Test Your Proxy

Test URL:
```
https://api.mletras.com/musixmatch/track.search?q_track=test&page_size=10
```

Expected Response: JSON with track search results

### 4. 📱 GitHub Repository Setup

**Create New Repository**:
1. Go to your new GitHub account
2. Create new repository: `mletras`
3. Make it private (recommended)

**Push Code**:
```bash
# Remove current remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR-NEW-USERNAME/mletras.git

# Push to new repository
git push -u origin main
```

### 5. 🌐 Deploy Your App

**Option A: Vercel (Recommended)**
1. Connect GitHub repository to Vercel
2. Deploy automatically
3. Set custom domain: `mletras.com`

**Option B: Netlify**
1. Connect GitHub repository to Netlify
2. Deploy automatically
3. Set custom domain: `mletras.com`

**Option C: GitHub Pages**
1. Enable GitHub Pages in repository settings
2. Set source to main branch
3. Set custom domain: `mletras.com`

## 🔒 Security Benefits

- ✅ **API Key Hidden**: Never exposed to client-side code
- ✅ **CORS Handled**: Proper cross-origin headers
- ✅ **Professional Domain**: `api.mletras.com`
- ✅ **Rate Limiting**: Can be added to worker
- ✅ **Caching**: Can be implemented server-side

## 📊 Current Status

- ✅ **Worker Script**: Created and ready to deploy
- ✅ **App Code**: Updated to use proxy
- ✅ **Build**: Successful (497.59 kB)
- ✅ **Security**: API key removed from client
- ✅ **Domain**: Ready for `mletras.com`

## 🚨 Important Notes

1. **API Key**: Only set in Cloudflare Worker environment variables
2. **Domain**: Must configure `api.mletras.com` in Cloudflare
3. **Testing**: Test proxy before deploying app
4. **Backup**: Keep your current working version until proxy is tested

## 🆘 Troubleshooting

**Worker Not Working**:
- Check environment variables in Cloudflare
- Verify custom domain is configured
- Test with curl or browser

**CORS Errors**:
- Ensure `api.mletras.com` is properly configured
- Check worker CORS headers

**Build Errors**:
- Run `npm run build` to check for issues
- Ensure all imports are correct

## 🎉 Next Steps

1. Deploy Cloudflare Worker
2. Test proxy endpoint
3. Set up GitHub repository
4. Deploy your app
5. Configure `mletras.com` domain
6. Test everything works end-to-end

Your MLetras app is now ready for professional deployment! 🚀
