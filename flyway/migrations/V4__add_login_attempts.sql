-- Create login_attempts table for audit and security tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for counting recent failures by email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_timestamp ON login_attempts(email, timestamp);

-- Index for user audit queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_timestamp ON login_attempts(user_id, timestamp);

-- Index for IP-based attack detection
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_timestamp ON login_attempts(ip_address, timestamp);

-- Index for cleanup job (remove old records)
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp);
