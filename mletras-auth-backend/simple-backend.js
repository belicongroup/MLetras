const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8787;

// Resend configuration
const RESEND_API_KEY = 're_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6';
const FROM_EMAIL = 'noreply@mail.mletras.com';

app.use(cors({
    origin: [
        'https://mletras.com',
        'https://mletras.vercel.app',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        'http://10.0.2.2:8080',
        'http://10.0.2.2:3000'
    ],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Mock database
const users = {};
const otps = {};

// Helper to generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper to send OTP email via Resend
async function sendOTPEmail(email, code, type) {
    try {
        const emailType = type === 'signup' ? 'sign up' : 'log in';
        const subject = `Your MLetras ${emailType} code`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>MLetras ${emailType} Code</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎵 MLetras</h1>
                        <p>Your ${emailType} verification code</p>
                    </div>
                    <div class="content">
                        <p>Hello!</p>
                        <p>You requested a verification code to ${emailType} to MLetras. Use the code below to complete your ${emailType}:</p>
                        <div class="otp-code">${code}</div>
                        <p><strong>This code will expire in 10 minutes.</strong></p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>MLetras - Your Lyrics Companion</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
            MLetras ${emailType} Verification
            
            Hello!
            
            You requested a verification code to ${emailType} to MLetras. Use the code below to complete your ${emailType}:
            
            ${code}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            MLetras - Your Lyrics Companion
        `;
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `MLetras <${FROM_EMAIL}>`,
                to: [email],
                subject: subject,
                html: htmlContent,
                text: textContent,
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Resend API error:', response.status, errorData);
            return false;
        }
        
        const result = await response.json();
        console.log(`✅ OTP email sent successfully to ${email}, message ID: ${result.id}`);
        return true;
        
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return false;
    }
}

// /auth/signup endpoint with real email sending
app.post('/auth/signup', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const otp = generateOTP();
    otps[email] = { code: otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 minutes
    
    // Send real email via Resend
    const emailSent = await sendOTPEmail(email, otp, 'signup');
    
    if (!emailSent) {
        console.log(`❌ Failed to send email, showing OTP in console: ${otp}`);
        console.log(`[FALLBACK] OTP for signup (${email}): ${otp}`);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to send email. Please try again.' 
        });
    }
    
    res.json({ 
        success: true, 
        message: 'OTP sent to your email', 
        isNewUser: !users[email],
        expiresIn: 600 // 10 minutes
    });
});

// /auth/login endpoint with real email sending
app.post('/auth/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const otp = generateOTP();
    otps[email] = { code: otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 minutes
    
    // Send real email via Resend
    const emailSent = await sendOTPEmail(email, otp, 'login');
    
    if (!emailSent) {
        console.log(`❌ Failed to send email, showing OTP in console: ${otp}`);
        console.log(`[FALLBACK] OTP for login (${email}): ${otp}`);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to send email. Please try again.' 
        });
    }
    
    res.json({ 
        success: true, 
        message: 'OTP sent to your email',
        expiresIn: 600 // 10 minutes
    });
});

// Mock /auth/verify-otp endpoint
app.post('/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

    const storedOtp = otps[email];
    if (storedOtp && storedOtp.code === otp && storedOtp.expires > Date.now()) {
        delete otps[email]; // OTP consumed
        
        if (!users[email]) {
            users[email] = { 
                id: `user-${Date.now()}`, 
                email, 
                subscription_type: 'free', 
                email_verified: true, 
                created_at: new Date().toISOString() 
            };
        }
        
        const user = users[email];
        
        // Mock JWT token (simple string for local testing)
        const sessionToken = `mock-jwt-${user.id}-${Date.now()}`;
        
        res.cookie('sessionToken', sessionToken, { 
            httpOnly: true, 
            secure: false, 
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        return res.json({ 
            success: true, 
            message: 'OTP verified, logged in!', 
            user, 
            sessionToken 
        });
    }
    
    res.status(401).json({ success: false, error: 'Invalid or expired OTP' });
});

// Mock /auth/me endpoint - FIXED: Only return user if valid session
app.get('/auth/me', (req, res) => {
    const sessionToken = req.cookies.sessionToken;
    
    if (!sessionToken || !sessionToken.startsWith('mock-jwt-')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = sessionToken.split('-')[2]; // Extract mock user ID
    const user = Object.values(users).find(u => u.id === `user-${userId}`);
    
    if (user) {
        return res.json({ success: true, user });
    }
    
    res.status(401).json({ success: false, error: 'Unauthorized' });
});

// /auth/logout endpoint
app.post('/auth/logout', (req, res) => {
    res.clearCookie('sessionToken');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Clear all sessions endpoint for testing
app.post('/auth/clear-sessions', (req, res) => {
    // Clear all users and OTPs for testing
    Object.keys(users).forEach(key => delete users[key]);
    Object.keys(otps).forEach(key => delete otps[key]);
    res.json({ success: true, message: 'All sessions cleared' });
});

// Mock /api/musixmatch/track.search endpoint
app.get('/api/musixmatch/track.search', (req, res) => {
    const { q_track, q_artist } = req.query;
    console.log(`[MOCK BACKEND] Searching for: ${q_track || ''} by ${q_artist || ''}`);
    
    const mockResults = [
        { track_id: 1, track_name: 'Mock Song 1', artist_name: 'Mock Artist A' },
        { track_id: 2, track_name: 'Mock Song 2', artist_name: 'Mock Artist B' },
        { track_id: 3, track_name: 'Mock Song 3', artist_name: 'Mock Artist C' },
    ];
    
    res.json({ 
        message: { 
            header: { status_code: 200 }, 
            body: { 
                track_list: mockResults.map(t => ({ track: t })) 
            } 
        } 
    });
});

// Mock /api/musixmatch/track.lyrics.get endpoint
app.get('/api/musixmatch/track.lyrics.get', (req, res) => {
    const { track_id } = req.query;
    console.log(`[MOCK BACKEND] Getting lyrics for track_id: ${track_id}`);
    
    const mockLyrics = `Mock lyrics for track ${track_id}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
    
    res.json({ 
        message: { 
            header: { status_code: 200 }, 
            body: { 
                lyrics: { lyrics_body: mockLyrics } 
            } 
        } 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Simple backend running on http://localhost:${PORT}`);
    console.log(`📧 OTP codes will be displayed in this console`);
    console.log(`🎵 Mock lyrics and search results available`);
});
