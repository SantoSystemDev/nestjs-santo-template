-- Create organizations table for multi-tenancy support
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for active organizations queries
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Create default organization for existing users
INSERT INTO organizations (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Organization', 'default', true)
ON CONFLICT (slug) DO NOTHING;
