# GitHub Repository Setup for MLetras

## Moving to a Different GitHub Account

### Option 1: Create New Repository (Recommended)

1. **Create New Repository**:
   - Go to your new GitHub account
   - Click "New repository"
   - Name: `mletras` or `mletras-app`
   - Make it private (recommended for API keys)

2. **Push Current Code**:
   ```bash
   # Remove current remote
   git remote remove origin
   
   # Add new remote
   git remote add origin https://github.com/YOUR-NEW-USERNAME/mletras.git
   
   # Push to new repository
   git push -u origin main
   ```

### Option 2: Transfer Repository

1. **Transfer Ownership**:
   - Go to current repository Settings
   - Scroll to "Transfer ownership"
   - Enter new username
   - Confirm transfer

## Repository Structure

Your repository will now include:

```
mletras/
├── src/                    # React app source code
├── cloudflare-worker/      # Cloudflare Worker proxy
│   ├── index.js           # Worker script
│   ├── wrangler.toml      # Worker configuration
│   └── README.md          # Worker setup instructions
├── deploy-worker.sh       # Linux/Mac deployment script
├── deploy-worker.bat      # Windows deployment script
├── GITHUB_SETUP.md        # This file
└── ... (other project files)
```

## Security Notes

- ✅ **API key removed** from client-side code
- ✅ **Cloudflare Worker** handles API key server-side
- ✅ **Professional domain** (api.mletras.com)
- ✅ **CORS properly configured**

## Next Steps After GitHub Setup

1. **Deploy Cloudflare Worker**:
   ```bash
   # Run deployment script
   ./deploy-worker.sh    # Linux/Mac
   # or
   deploy-worker.bat     # Windows
   ```

2. **Configure Environment Variables**:
   - Cloudflare Dashboard → Workers → Variables
   - Add: `MUSIXMATCH_API_KEY`

3. **Set Custom Domain**:
   - Cloudflare Dashboard → Workers → Triggers
   - Add: `api.mletras.com`

4. **Deploy Your App**:
   - Use Vercel, Netlify, or GitHub Pages
   - Point domain to `mletras.com`

## Benefits of This Setup

- 🔒 **Secure**: API key never exposed to clients
- 🚀 **Fast**: Cloudflare edge network
- 💰 **Cost-effective**: Free tier available
- 🌐 **Professional**: Custom domain
- 📱 **Mobile-ready**: Works with Capacitor
