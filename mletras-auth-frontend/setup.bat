@echo off
echo Setting up MLetras Auth Frontend...

echo.
echo 1. Installing dependencies...
call npm install

echo.
echo 2. Creating environment file...
if not exist .env (
    copy env.example .env
    echo Created .env file from template
    echo Please edit .env and set your API URL
) else (
    echo .env file already exists
)

echo.
echo 3. Building the application...
call npm run build

echo.
echo 4. Starting development server...
echo Your frontend will be available at http://localhost:3000
echo.
call npm run dev






