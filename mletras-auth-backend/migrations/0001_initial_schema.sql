-- MLetras Auth System Database Schema
-- Production-ready tables for user authentication and metering

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSON DEFAULT '{}'
);

-- OTP (One-Time Password) table for email verification
CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signup', 'login', 'password_reset')),
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, endpoint, date)
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE
);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_type);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_endpoint ON usage_logs(endpoint);

-- Insert default system configuration
INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
  ('free_daily_limit', '100', 'Daily request limit for free users'),
  ('free_burst_limit', '5', 'Per-minute burst limit for free users'),
  ('pro_daily_limit', '1000', 'Daily request limit for pro users'),
  ('pro_burst_limit', '20', 'Per-minute burst limit for pro users'),
  ('burst_window_seconds', '60', 'Burst window in seconds'),
  ('otp_expiry_minutes', '10', 'OTP expiry time in minutes'),
  ('session_expiry_hours', '24', 'Session expiry time in hours');

-- Insert default admin user (change email as needed)
INSERT OR IGNORE INTO admin_users (id, email, name, role) VALUES 
  ('admin-001', 'admin@mletras.com', 'System Administrator', 'super_admin');

