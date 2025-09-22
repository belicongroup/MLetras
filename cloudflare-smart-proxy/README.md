# MLetras Smart Proxy

A high-performance caching proxy for the Musixmatch API built with Cloudflare Workers and KV storage.

## Features

- 🚀 **Intelligent Caching**: Forever cache for `track.search` and `track.lyrics.get` endpoints
- 🔒 **Secure**: API key never exposed to clients
- 🌐 **CORS Ready**: Pre-configured for all development and production domains
- ⚡ **Fast**: KV storage provides sub-10ms response times for cached requests
- 📊 **Observable**: Cache hit/miss headers for monitoring

## Supported Endpoints

- `track.search` - Search for tracks
- `track.lyrics.get` - Get track lyrics

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create KV Namespace

```bash
# Create KV namespace
wrangler kv:namespace create "MUSIXMATCH_CACHE"

# Create preview namespace for development
wrangler kv:namespace create "MUSIXMATCH_CACHE" --preview
```

### 3. Update wrangler.toml

Update the KV namespace IDs in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "MUSIXMATCH_CACHE"
id = "your-production-namespace-id"
preview_id = "your-preview-namespace-id"
```

### 4. Set API Key

```bash
wrangler secret put MUSIXMATCH_API_KEY
```

### 5. Deploy

```bash
# Development
wrangler dev

# Production
wrangler deploy
```

## Usage

### API Endpoints

```
GET /track.search?q=artist:song&page_size=3
GET /track.lyrics.get?track_id=123456789
```

### Response Headers

- `X-Cache`: `HIT` or `MISS`
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
      // Musixmatch API response
    }
  }
}
```

## CORS Domains

The following domains are whitelisted:

- `https://mletras.vercel.app`
- `http://localhost:*`
- `http://127.0.0.1:*`
- `http://10.0.2.2:*` (Android emulator)

## Cache Strategy

- **Forever Cache**: Data is cached indefinitely until manually cleared
- **Cache Key**: Stable hash based on endpoint and sorted parameters
- **No TTL**: No expiration, cache persists until KV namespace is cleared

## Monitoring

Monitor cache performance using the `X-Cache` header:

```bash
# Check cache hit rate
curl -I "https://mletras-smart-proxy.belicongroup.workers.dev/track.search?q=test"
```

## Development

```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail
```

## Architecture

```
Client Request → Smart Proxy → KV Cache Check
                     ↓
                Cache HIT? → Return Cached Data
                     ↓
                Cache MISS → Musixmatch API → Cache Data → Return Response
```

## Performance Benefits

- **Cache HIT**: ~5-10ms response time
- **Cache MISS**: ~200-500ms response time (depends on Musixmatch API)
- **API Call Reduction**: 90%+ reduction in upstream API calls for repeated requests
- **Cost Savings**: Reduced Musixmatch API usage costs
