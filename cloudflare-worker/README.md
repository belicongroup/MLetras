# MLetras API Proxy - Cloudflare Worker

This Cloudflare Worker acts as a secure proxy for the Musixmatch API, hiding your API key from client-side code.

## Setup Instructions

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Deploy the Worker
```bash
wrangler deploy
```

### 4. Set Environment Variables
In Cloudflare Dashboard:
- Go to Workers & Pages → mletras-api-proxy
- Go to Settings → Variables
- Add: `MUSIXMATCH_API_KEY` = `4d54e92614bedfaaffcab9fdbf56cdf3`

### 5. Configure Custom Domain
In Cloudflare Dashboard:
- Go to Workers & Pages → mletras-api-proxy
- Go to Settings → Triggers → Custom Domains
- Add: `api.mletras.com`

## Testing

Test the proxy with:
```
https://api.mletras.com/musixmatch/track.search?q_track=test&page_size=10
```

## Security Benefits

- ✅ API key hidden from client-side
- ✅ CORS properly handled
- ✅ Professional API endpoint
- ✅ Rate limiting capabilities
- ✅ Server-side caching options
