#!/bin/bash

echo "Deploying MLetras Smart Proxy to Cloudflare Workers..."

# Navigate to the smart proxy directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Deploy the worker
echo "Deploying worker..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Smart Proxy deployed successfully!"
    echo ""
    echo "Your smart proxy is now available at:"
    echo "https://mletras-smart-proxy.belicongroup.workers.dev"
    echo ""
    echo "Next steps:"
    echo "1. Update your frontend to use the new proxy URL"
    echo "2. Test the endpoints to ensure caching is working"
    echo "3. Monitor cache hit rates using the X-Cache header"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above."
    echo ""
fi
