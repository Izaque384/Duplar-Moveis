-- Autenticação administrativa individual, separada do OTP dos clientes.
CREATE TABLE IF NOT EXISTS portal_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner','admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  password_changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES portal_admin_users(id) ON DELETE CASCADE;
ALTER TABLE portal_sessions ALTER COLUMN phone DROP NOT NULL;
CREATE INDEX IF NOT EXISTS portal_sessions_admin_idx ON portal_sessions(admin_id);

CREATE TABLE IF NOT EXISTS portal_admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES portal_admin_users(id),
  email text NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS portal_admin_invitations_email_idx ON portal_admin_invitations(email,created_at DESC);

CREATE TABLE IF NOT EXISTS portal_admin_login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  requester_ip text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_admin_attempts_email_idx ON portal_admin_login_attempts(email,created_at DESC) WHERE success = false;
CREATE INDEX IF NOT EXISTS portal_admin_attempts_ip_idx ON portal_admin_login_attempts(requester_ip,created_at DESC) WHERE success = false;

CREATE TABLE IF NOT EXISTS portal_admin_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES portal_admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  subject text,
  requester_ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_admin_audit_recent_idx ON portal_admin_audit(created_at DESC);
