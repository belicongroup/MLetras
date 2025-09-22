const express = require('express');
const cors = require('cors');
const app = express();
const port = 8787;

// Enable CORS for all origins
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Mock user data
let users = {};
let otps = {};
let activeSessions = {}; // Track active sessions

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send email via Resend
async function sendEmail(to, subject, html) {
  const resendApiKey = 're_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6';
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MLetras <noreply@mail.mletras.com>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Email sent successfully to ${to}:`, result.id);
      return { success: true, id: result.id };
    } else {
      console.error(`❌ Failed to send email to ${to}:`, result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error(`❌ Email sending error for ${to}:`, error);
    return { success: false, error: error.message };
  }
}

// Auth endpoints
app.post('/auth/signup', async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  
  otps[email] = {
    code: otp,
    expires: Date.now() + (10 * 60 * 1000), // 10 minutes
    used: false
  };
  
  console.log(`[DEV] OTP for ${email}: ${otp}`);
  
  // Send real email
  const emailResult = await sendEmail(
    email,
    'Your MLetras Verification Code',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to MLetras!</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">MLetras - Your Music Companion</p>
    </div>
    `
  );
  
  res.json({
    success: true,
    message: `OTP sent to ${email}`,
    isNewUser: !users[email],
    expiresIn: 600,
    emailSent: emailResult.success,
    emailId: emailResult.id || null
  });
});

app.post('/auth/login', async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  
  otps[email] = {
    code: otp,
    expires: Date.now() + (10 * 60 * 1000), // 10 minutes
    used: false
  };
  
  console.log(`[DEV] OTP for ${email}: ${otp}`);
  
  // Send real email
  const emailResult = await sendEmail(
    email,
    'Your MLetras Login Code',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Login to MLetras</h2>
      <p>Your login code is:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">MLetras - Your Music Companion</p>
    </div>
    `
  );
  
  res.json({
    success: true,
    message: `OTP sent to ${email}`,
    isNewUser: false,
    expiresIn: 600,
    emailSent: emailResult.success,
    emailId: emailResult.id || null
  });
});

app.post('/auth/verify', (req, res) => {
  const { email, code } = req.body;
  const storedOTP = otps[email];
  
  if (!storedOTP || storedOTP.code !== code || storedOTP.used || storedOTP.expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  
  // Mark OTP as used
  storedOTP.used = true;
  
  // Create or update user
  if (!users[email]) {
    users[email] = {
      id: `user-${Date.now()}`,
      email,
      subscription_type: 'free',
      email_verified: true,
      created_at: new Date().toISOString()
    };
  }
  
  users[email].last_login_at = new Date().toISOString();
  
  // Create session token (simplified)
  const sessionToken = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store session
  activeSessions[sessionToken] = {
    userId: users[email].id,
    email: email,
    createdAt: Date.now()
  };
  
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: users[email].id,
      email: users[email].email,
      subscription_type: users[email].subscription_type,
      email_verified: users[email].email_verified
    },
    sessionToken
  });
});

app.get('/auth/me', (req, res) => {
  // Check for session token in Authorization header
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  if (!sessionToken || !activeSessions[sessionToken]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const session = activeSessions[sessionToken];
  const user = users[session.email];
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  res.json({ user: {
    id: user.id,
    email: user.email,
    subscription_type: user.subscription_type,
    email_verified: user.email_verified,
    created_at: user.created_at
  }});
});

app.post('/auth/logout', (req, res) => {
  // Check for session token in Authorization header
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  if (sessionToken && activeSessions[sessionToken]) {
    delete activeSessions[sessionToken];
    console.log(`[DEV] User logged out, session cleared: ${sessionToken}`);
  }
  
  res.json({ success: true });
});

// Lyrics API endpoints (mock)
app.get('/api/track.search', (req, res) => {
  const { q_lyrics } = req.query;
  
  // Mock search results
  const mockResults = [
    {
      track: {
        track_id: 123456,
        track_name: `${q_lyrics} - Song 1`,
        artist_name: 'Test Artist 1',
        album_name: 'Test Album'
      }
    },
    {
      track: {
        track_id: 123457,
        track_name: `${q_lyrics} - Song 2`,
        artist_name: 'Test Artist 2',
        album_name: 'Test Album 2'
      }
    },
    {
      track: {
        track_id: 123458,
        track_name: `${q_lyrics} - Song 3`,
        artist_name: 'Test Artist 3',
        album_name: 'Test Album 3'
      }
    }
  ];
  
  res.json({
    message: {
      header: {
        status_code: 200,
        execute_time: 0.1
      },
      body: {
        track_list: mockResults
      }
    }
  });
});

app.get('/api/track.lyrics.get', (req, res) => {
  const { track_id } = req.query;
  
  // Mock lyrics
  const mockLyrics = `This is mock lyrics for track ${track_id}

Verse 1:
Lorem ipsum dolor sit amet,
Consectetur adipiscing elit.
Sed do eiusmod tempor incididunt,
Ut labore et dolore magna aliqua.

Chorus:
Duis aute irure dolor in reprehenderit,
In voluptate velit esse cillum dolore,
Eu fugiat nulla pariatur.

Verse 2:
Excepteur sint occaecat cupidatat,
Non proident sunt in culpa,
Qui officia deserunt mollit anim,
Id est laborum.`;

  res.json({
    message: {
      header: {
        status_code: 200,
        execute_time: 0.1
      },
      body: {
        lyrics: {
          lyrics_id: parseInt(track_id),
          lyrics_body: mockLyrics,
          lyrics_language: 'en',
          lyrics_copyright: 'Mock lyrics for testing',
          updated_time: new Date().toISOString()
        }
      }
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Email-enabled backend running on http://localhost:${port}`);
  console.log(`📧 Real emails will be sent via Resend`);
  console.log(`🎵 Mock lyrics and search results available`);
});
