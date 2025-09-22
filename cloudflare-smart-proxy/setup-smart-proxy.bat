@echo off
echo Setting up MLetras Smart Proxy...

REM Navigate to the smart proxy directory
cd /d "%~dp0"

echo.
echo Step 1: Installing dependencies...
if not exist "node_modules" (
    npm install
) else (
    echo Dependencies already installed.
)

echo.
echo Step 2: Creating KV namespace...
echo Creating production KV namespace...
wrangler kv:namespace create "MUSIXMATCH_CACHE"

echo.
echo Creating preview KV namespace...
wrangler kv:namespace create "MUSIXMATCH_CACHE" --preview

echo.
echo Step 3: Setting up API key...
echo Please enter your Musixmatch API key:
wrangler secret put MUSIXMATCH_API_KEY

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update the KV namespace IDs in wrangler.toml
echo 2. Run deploy-smart-proxy.bat to deploy the worker
echo 3. Update your frontend configuration
echo.

pause
