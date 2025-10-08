# OTP Email Troubleshooting Guide

This guide will help you troubleshoot and fix issues with OTP email delivery in the MLetras authentication system.

## Quick Diagnosis

### Symptom: Users can enter email but never receive OTP
**Most likely cause:** EMAIL_API_KEY is not properly configured in Cloudflare Workers

### Symptom: OTP screen appears but shows "Failed to send verification email"
**Most likely cause:** Email service is down or Resend API key is invalid

## Step-by-Step Fix

### 1. Verify Cloudflare Secrets Configuration

Run the verification script:
```bash
cd mletras-auth-backend
verify-secrets.bat
```

This will:
- List all configured secrets in Cloudflare Workers
- Allow you to test email sending

**What to look for:**
- Both `EMAIL_API_KEY` and `JWT_SECRET` should be listed
- If either is missing, proceed to Step 2

### 2. Configure Missing Secrets

Run the setup script:
```bash
cd mletras-auth-backend
setup-secrets.bat
```

This will automatically:
- Set the EMAIL_API_KEY (Resend API key)
- Generate and set a secure JWT_SECRET
- Verify both secrets are configured

**If the script fails:**
```bash
# Login to Cloudflare
npx wrangler login

# Manually set EMAIL_API_KEY
npx wrangler secret put EMAIL_API_KEY
# When prompted, paste: re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6

# Manually set JWT_SECRET (use a random 32+ character string)
npx wrangler secret put JWT_SECRET
# When prompted, paste a secure random string
```

### 3. Deploy the Updated Worker

After fixing the secrets, deploy the worker:
```bash
cd mletras-auth-backend
npm run deploy
```

Or for development environment:
```bash
npx wrangler deploy --env development
```

### 4. Test Email Sending

Test the email service directly:
```bash
curl -X POST https://mletras-auth-api-dev.belicongroup.workers.dev/test-email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"your-email@example.com\"}"
```

**Expected response (success):**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "...",
  "email": "your-email@example.com"
}
```

**Error response (failure):**
```json
{
  "error": "Failed to send test email",
  "status": 401,
  "details": "..."
}
```

### 5. Check Cloudflare Logs

If emails are still not being sent:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to Workers & Pages
4. Click on `mletras-auth-api-dev` (or `mletras-auth-api` for production)
5. Go to "Logs" tab
6. Look for error messages related to email sending

**Common error messages:**

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `EMAIL_API_KEY is not configured!` | Secret not set | Run `setup-secrets.bat` |
| `Resend API error: 401` | Invalid API key | Update EMAIL_API_KEY with correct Resend key |
| `Resend API error: 403` | Domain not verified | Verify domain in Resend dashboard |
| `Resend API error: 422` | Invalid email format | Check email address format |

## Environment-Specific Behavior

### Development Environment
- OTP is always logged to console (visible in Cloudflare logs)
- If email fails, the OTP is still valid (fallback mode)
- Error messages include technical details

### Production Environment
- OTP is logged to console (visible in Cloudflare logs)
- If email fails, the request fails and user sees an error
- Error messages are user-friendly

## Resend API Key Information

Current Resend API Key: `re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6`

**To verify this key is valid:**
1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to API Keys
3. Check if the key exists and is active
4. Verify the sending domain `mail.mletras.com` is configured

**If you need a new key:**
1. Create a new API key in Resend dashboard
2. Update the key in Cloudflare:
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```
3. Update `setup-secrets.bat` with the new key

## Testing the Full Auth Flow

### Local Development Test
```bash
# Terminal 1: Start local worker
cd mletras-auth-backend
npm run dev

# Terminal 2: Start frontend
cd mletras-auth-frontend
npm run dev

# Open http://localhost:3000
# Enter an email
# Check Terminal 1 for the OTP code
# Use the OTP to complete authentication
```

### Production Test
1. Go to https://mletras.com (or your production URL)
2. Enter your email
3. Check your email inbox for the OTP
4. Enter the OTP to complete authentication

## Emergency Fallback: Getting OTP from Logs

If emails are not working but you need to test:

1. Enter your email in the auth form
2. Go to Cloudflare Dashboard → Workers → Logs
3. Look for a log message like:
   ```
   [development] OTP for user@example.com: 123456
   ```
4. Use that OTP code to complete authentication

## Contact Support

If none of these steps work:

1. Check the Cloudflare Worker status
2. Verify Resend service status at [Resend Status](https://resend.com/status)
3. Contact Cloudflare support if the worker deployment fails
4. Contact Resend support if API key issues persist

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

