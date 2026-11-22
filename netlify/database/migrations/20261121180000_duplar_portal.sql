-- Duplar Móveis: cadastro, projetos, documentos privados e autenticação por WhatsApp.
-- Não adicionar dados de clientes reais a este arquivo ou ao repositório.
CREATE TABLE IF NOT EXISTS portal_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^55[0-9]{10,11}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES portal_clients(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 160),
  description text NOT NULL DEFAULT '',
  services text NOT NULL DEFAULT '',
  budget_cents bigint CHECK (budget_cents IS NULL OR budget_cents >= 0),
  status text NOT NULL DEFAULT 'Em planejamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_projects_client_idx ON portal_projects(client_id);

CREATE TABLE IF NOT EXISTS portal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES portal_projects(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('contract','invoice')),
  filename text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_documents_project_idx ON portal_documents(project_id);

CREATE TABLE IF NOT EXISTS portal_otps (
  id uuid PRIMARY KEY,
  phone text NOT NULL,
  code_hash text NOT NULL,
  requester_ip text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CHECK (attempts BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS portal_otps_phone_idx ON portal_otps(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS portal_otps_ip_idx ON portal_otps(requester_ip, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_otp_requests (
  id bigserial PRIMARY KEY,
  phone text NOT NULL,
  requester_ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_otp_requests_phone_idx ON portal_otp_requests(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS portal_otp_requests_ip_idx ON portal_otp_requests(requester_ip, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash text PRIMARY KEY,
  phone text NOT NULL,
  client_id uuid REFERENCES portal_clients(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS portal_sessions_expires_idx ON portal_sessions(expires_at);

-- Limpeza periódica recomendada (não necessária para a validade dos códigos):
-- DELETE FROM portal_otps WHERE created_at < now() - interval '7 days';
-- DELETE FROM portal_otp_requests WHERE created_at < now() - interval '7 days';
-- DELETE FROM portal_sessions WHERE expires_at < now();
