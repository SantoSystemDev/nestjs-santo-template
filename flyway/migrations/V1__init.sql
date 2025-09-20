-- Extensions (safe to run many times)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users and auth tables. No triggers. updated_at must be set by application.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR NOT NULL,
  avatar_url VARCHAR,
  phone_number VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Free-text role model (no Prisma enum)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_name ON user_roles(user_id, name);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti VARCHAR NOT NULL UNIQUE,
  token_hash VARCHAR NOT NULL,             -- SHA-256 of RT + pepper
  device_id VARCHAR,
  ip INET,
  user_agent VARCHAR,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_jti VARCHAR,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Optional: enforce rotation chain integrity
  CONSTRAINT fk_refresh_replaced_by
    FOREIGN KEY (replaced_by_jti) REFERENCES refresh_tokens (jti) DEFERRABLE INITIALLY DEFERRED
);
-- Queries aceleradas
CREATE INDEX IF NOT EXISTS idx_refresh_user_expires ON refresh_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_user_revoked ON refresh_tokens(user_id, revoked_at);
-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_replaced_by ON refresh_tokens(replaced_by_jti);
-- Tokens "ativos" (mais rápido para validar RT)
CREATE INDEX IF NOT EXISTS idx_refresh_active
ON refresh_tokens (user_id, expires_at) WHERE revoked_at IS NULL;
