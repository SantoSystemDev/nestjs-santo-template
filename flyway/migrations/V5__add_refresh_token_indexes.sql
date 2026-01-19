-- Add missing indexes for refresh_tokens cleanup job
-- These indexes already exist in V1 but we add them conditionally for safety
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Index for efficient cleanup queries (expired and not already revoked)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup
ON refresh_tokens(expires_at)
WHERE revoked_at IS NULL;
