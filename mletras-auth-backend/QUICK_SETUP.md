# Quick Setup Guide - MLetras Auth Backend

This guide will get your MLetras authentication system up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Resend account with verified domain

## Step 1: Install Dependencies

```bash
cd mletras-auth-backend
npm install
```

## Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Setup Secrets

Run the automated setup script:

```bash
setup-secrets.bat
```

This will:
- Configure your Resend API key (EMAIL_API_KEY)
- Generate and set a secure JWT secret (JWT_SECRET)
- Verify both secrets are properly configured

## Step 4: Initialize Database

```bash
npx wrangler d1 execute mletras-auth-db --file=migrations/0001_initial_schema.sql
```

This creates all necessary database tables.

## Step 5: Deploy Worker

For development:
```bash
npm run deploy:dev
```

For production:
```bash
npm run deploy
```

## Step 6: Verify Setup

Run the verification script:
```bash
verify-secrets.bat
```

Enter your email when prompted to test email sending.

## Step 7: Test Locally (Optional)

Start local development server:
```bash
npm run dev
```

The worker will be available at: `http://localhost:8787`

## Troubleshooting

If you encounter any issues:

1. **Email not sending?**
   - See [OTP_TROUBLESHOOTING.md](./OTP_TROUBLESHOOTING.md)

2. **Database errors?**
   - Verify D1 database exists: `npx wrangler d1 list`
   - Re-run migrations if needed

3. **Deployment fails?**
   - Check `wrangler.toml` configuration
   - Verify you're logged in: `npx wrangler whoami`

4. **Secrets not working?**
   - List secrets: `npx wrangler secret list`
   - Re-run: `setup-secrets.bat`

## Environment Configuration

### Development
- Worker URL: `https://mletras-auth-api-dev.belicongroup.workers.dev`
- Database: Same as production (shared)
- Environment variable: `ENVIRONMENT=development`

### Production
- Worker URL: Configured via routes in `wrangler.toml`
  - `https://auth.mletras.com`
  - `https://api.mletras.com`
- Database: `mletras-auth-db`
- Environment variable: `ENVIRONMENT=production`

## API Endpoints

Once deployed, your API will have these endpoints:

### Authentication
- `POST /auth/signup` - Start signup flow (sends OTP)
- `POST /auth/login` - Start login flow (sends OTP)
- `POST /auth/verify` - Verify OTP code
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

### Testing
- `POST /test-email` - Test email sending

### User Data (requires authentication)
- `GET /api/user/folders` - Get user folders
- `POST /api/user/folders` - Create folder
- `GET /api/user/bookmarks` - Get bookmarks
- `POST /api/user/bookmarks` - Create bookmark
- `GET /api/user/notes` - Get notes
- `POST /api/user/notes` - Create note

## Next Steps

1. Configure your frontend to use the deployed worker URL
2. Update `VITE_API_BASE_URL` in frontend environment
3. Test the full authentication flow
4. Monitor logs in Cloudflare Dashboard

## Support

For issues and questions:
- See [OTP_TROUBLESHOOTING.md](./OTP_TROUBLESHOOTING.md) for email issues
- Check Cloudflare Worker logs for errors
- Review [Resend documentation](https://resend.com/docs) for email issues

