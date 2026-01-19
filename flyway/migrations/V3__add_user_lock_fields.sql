-- Add multi-tenancy and account locking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Compound index for common queries (email within organization)
CREATE INDEX IF NOT EXISTS idx_users_email_organization ON users(email, organization_id);

-- Index for account lock queries
CREATE INDEX IF NOT EXISTS idx_users_lock_status ON users(is_locked, locked_until);

-- Backfill existing users to default organization (exclude SUPER_ADMIN which has NULL organizationId)
-- This will be adjusted after SUPER_ADMIN is created
UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;
