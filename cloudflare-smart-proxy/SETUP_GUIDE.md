# MLetras Smart Proxy Setup Guide

This guide will help you set up the MLetras Smart Proxy with KV caching for the Musixmatch API.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Musixmatch API key
- Access to Cloudflare dashboard

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd cloudflare-smart-proxy
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespaces

Create the production KV namespace:
```bash
wrangler kv:namespace create "MUSIXMATCH_CACHE"
```

Create the preview KV namespace for development:
```bash
wrangler kv:namespace create "MUSIXMATCH_CACHE" --preview
```

**Important**: Copy the namespace IDs from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "MUSIXMATCH_CACHE"
id = "your-production-namespace-id-here"
preview_id = "your-preview-namespace-id-here"
```

### 4. Set API Key Secret

```bash
wrangler secret put MUSIXMATCH_API_KEY
```

Enter your Musixmatch API key when prompted.

### 5. Test the Worker (Optional)

```bash
wrangler dev
```

This will start a local development server. Test with:
```bash
curl "http://localhost:8787/track.search?q_track=test&page_size=3"
```

### 6. Deploy to Production

```bash
wrangler deploy
```

Or use the provided scripts:
- Windows: `deploy-smart-proxy.bat`
- Linux/Mac: `./deploy-smart-proxy.sh`

## Configuration

### Environment Variables

The worker uses these environment variables:

- `MUSIXMATCH_API_KEY`: Your Musixmatch API key (set as secret)
- `MUSIXMATCH_CACHE`: KV namespace binding for caching

### CORS Domains

The following domains are pre-configured for CORS:

- `https://mletras.vercel.app` (production)
- `http://localhost:*` (local development)
- `http://127.0.0.1:*` (local development)
- `http://10.0.2.2:*` (Android emulator)

### Supported Endpoints

- `track.search` - Search for tracks
- `track.lyrics.get` - Get track lyrics

## Usage

### API Endpoints

```
GET https://mletras-smart-proxy.belicongroup.workers.dev/track.search?q_track=artist:song&page_size=3
GET https://mletras-smart-proxy.belicongroup.workers.dev/track.lyrics.get?track_id=123456789
```

### Response Headers

Monitor cache performance using these headers:

- `X-Cache`: `HIT` (cached) or `MISS` (fetched from API)
- `X-Cache-Timestamp`: Unix timestamp when cached (HIT only)
- `X-Cache-Endpoint`: Endpoint name (HIT only)
- `X-Cache-Key`: Cache key used (MISS only)

### Example Response

```json
{
  "message": {
    "header": {
      "status_code": 200,
      "execute_time": 0.123,
      "available": 1
    },
    "body": {
      "track_list": [
        {
          "track": {
            "track_id": 123456789,
            "track_name": "Song Title",
            "artist_name": "Artist Name",
            // ... other track data
          }
        }
      ]
    }
  }
}
```

## Monitoring and Maintenance

### Cache Performance

Monitor cache hit rates by checking the `X-Cache` header:

```bash
# Check if request was cached
curl -I "https://mletras-smart-proxy.belicongroup.workers.dev/track.search?q_track=test"
```

### View Logs

```bash
wrangler tail
```

### Clear Cache (if needed)

To clear the cache, you can delete all keys in the KV namespace via the Cloudflare dashboard or using the KV API.

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check if the endpoint is in the allowed list
2. **500 Internal Server Error**: Verify API key is set correctly
3. **CORS errors**: Ensure your domain is in the allowed origins list

### Debug Mode

Enable debug logging by checking the worker logs:

```bash
wrangler tail --format=pretty
```

### Testing CORS

Test CORS from your frontend:

```javascript
fetch('https://mletras-smart-proxy.belicongroup.workers.dev/track.search?q_track=test')
  .then(response => {
    console.log('CORS headers:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('Cache status:', response.headers.get('X-Cache'));
  });
```

## Performance Benefits

- **Cache HIT**: ~5-10ms response time
- **Cache MISS**: ~200-500ms response time
- **API Call Reduction**: 90%+ reduction for repeated requests
- **Cost Savings**: Reduced Musixmatch API usage

## Security

- API key is never exposed to clients
- CORS is properly configured
- Only allowed endpoints are accessible
- Input validation and sanitization

## Next Steps

1. Deploy the worker using the deployment scripts
2. Update your frontend to use the new proxy URL
3. Test the endpoints to ensure caching is working
4. Monitor cache hit rates and performance
5. Consider setting up alerts for cache miss rates

## Support

If you encounter issues:

1. Check the worker logs: `wrangler tail`
2. Verify KV namespace configuration
3. Ensure API key is set correctly
4. Test with curl to isolate frontend vs backend issues
