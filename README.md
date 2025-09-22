# MLetras - Lyrics & Music App

A modern lyrics and music application with email-based authentication.

## Features

- 🔐 **Email Authentication** - OTP-based login/signup via Resend
- 🎵 **Lyrics Search** - Search for songs and view lyrics
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Modern UI** - Built with React and Tailwind CSS

## Quick Start

### Option 1: Test with Real Emails
```bash
.\test-email.bat
```
This will:
- Start the backend with email support
- Start the frontend
- Send real emails via Resend to test OTP authentication

### Option 2: Test with Console OTPs
```bash
.\test-otp.bat
```
This will:
- Start the backend with console OTP display
- Start the frontend
- Display OTP codes in the backend console (no emails sent)

## Manual Setup

### Backend
```bash
npm install
npm start
```
Backend runs on: `http://localhost:8787`

### Frontend
```bash
cd mletras-auth-frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:3000`

## Email Configuration

The backend uses Resend for email delivery:
- **Sender**: `noreply@mail.mletras.com`
- **API Key**: Configured in `backend.js`
- **Domain**: `mail.mletras.com` (verified in Resend)

## Project Structure

```
├── backend.js              # Main backend server
├── test-email.bat          # Start with real email testing
├── test-otp.bat            # Start with console OTP testing
├── mletras-auth-frontend/  # React frontend
├── src/                    # Main app source code
└── package.json           # Backend dependencies
```

## Authentication Flow

1. User enters email address
2. Backend generates OTP and sends email via Resend
3. User receives email with OTP code
4. User enters OTP in frontend
5. Backend verifies OTP and creates session
6. User is authenticated and redirected to dashboard

## Development

- **Backend**: Express.js with CORS support
- **Frontend**: React with TypeScript and Tailwind CSS
- **Email**: Resend API integration
- **Authentication**: Session-based with JWT-style tokens

## License

Private project - All rights reserved.