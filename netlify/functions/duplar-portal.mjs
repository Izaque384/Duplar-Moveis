import { randomBytes, randomInt, randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 8000 });
const getDatabase = () => ({ pool });
import { getStore } from '@netlify/blobs';
import { handleAdminAuth } from '../../server/admin-auth.mjs';

const COOKIE = 'duplar_sid';
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SESSION_SECONDS = 3 * 24 * 60 * 60;

function env(key) {
  return (typeof Netlify !== 'undefined' ? Netlify.env.get(key) : undefined) || process.env[key] || '';
}
function response(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra
    }
  });
}
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return /^55[0-9]{10,11}$/.test(digits) ? digits : null;
}

/* Diagnóstico sem valores sensíveis, visível somente ao responsável principal. */
function clientAccessReadiness() {
  const otpSecret = env('PORTAL_OTP_SECRET');
  const accessToken = env('META_WHATSAPP_TOKEN');
  const phoneNumberId = env('META_PHONE_NUMBER_ID');
  const templateName = env('META_AUTH_TEMPLATE') || 'duplar_codigo_acesso';
  const supportPhone = normalizePhone(env('PORTAL_SUPPORT_WHATSAPP'));
  const checks = {
    otpSecret: otpSecret.length >= 32,
    metaToken: Boolean(accessToken.trim()),
    phoneNumberId: /^[0-9]{5,25}$/.test(phoneNumberId),
    supportPhone: Boolean(supportPhone)
  };
  return {
    checks,
    templateName: /^[a-z0-9_]{1,512}$/.test(templateName) ? templateName : 'Nome inválido',
    configurationComplete: checks.otpSecret && checks.metaToken && checks.phoneNumberId,
    templateApprovalVerified: false,
    deliveryTested: false
  };
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}
function codeHash(id, phone, code) {
  return createHmac('sha256', env('PORTAL_OTP_SECRET')).update(id + ':' + phone + ':' + code).digest('hex');
}
function equalHex(a, b) {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
function cookieToken(req) {
  const match = (req.headers.get('cookie') || '').match(/(?:^|;\s*)duplar_sid=([0-9a-f]{64})(?:;|$)/);
  return match ? match[1] : null;
}
function sessionCookie(token, req, maxAge = MAX_SESSION_SECONDS) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + secure;
}
function clearCookie(req) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return COOKIE + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + secure;
}
function noCrossOriginWrite(req) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return false;
  return req.headers.get('x-duplar-request') === '1';
}
async function jsonBody(req, maximum = 5000) {
  if (Number(req.headers.get('content-length') || '0') > maximum) throw new Error('body-too-large');
  const str = await req.text();
  if (str.length > maximum) throw new Error('body-too-large');
  try {
    const data = JSON.parse(str);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('json_invalido');
    return data;
  } catch {
    throw new Error('json_invalido');
  }
}
function errorMessage(code) {
  return response({ error: code }, 400);
}
async function currentUser(db, req) {
  const token=cookieToken(req);
  if(!token)return null;
  const { rows }=await db.pool.query(
    "SELECT s.client_id,s.admin_id,c.name AS client_name,c.active AS client_active,a.name AS admin_name,a.email AS admin_email,a.role AS admin_role,a.active AS admin_active FROM portal_sessions s LEFT JOIN portal_clients c ON c.id=s.client_id LEFT JOIN portal_admin_users a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1",
    [sha(token)]
  );
  const s=rows[0];
  if(!s)return null;
  const admin=Boolean(s.admin_id && s.admin_active);
  const clientId=s.client_id && s.client_active ? s.client_id : null;
  if(!admin && !clientId)return null;
  return { clientId, admin, adminId:admin?s.admin_id:null, name:admin?s.admin_name:s.client_name, email:admin?s.admin_email:null, role:admin?s.admin_role:null };
}
async function sendOtp(phone, code) {
  const token = env('META_WHATSAPP_TOKEN');
  const phoneId = env('META_PHONE_NUMBER_ID');
  if (!token || !phoneId) throw new Error('meta-not-configured');
  const version = env('META_GRAPH_VERSION') || 'v27.0';
  if (!/^v[0-9]{1,2}\.[0-9]$/.test(version)) throw new Error('invalid-graph-version');
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: env('META_AUTH_TEMPLATE') || 'duplar_codigo_acesso',
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
      ]
    }
  };
  const meta = await fetch('https://graph.facebook.com/' + version + '/' + encodeURIComponent(phoneId) + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  if (!meta.ok) throw new Error('meta-send-failed');
}
async function requestCode(db, req, context) {
  if (env('PORTAL_OTP_SECRET').length < 32 || !env('META_WHATSAPP_TOKEN') || !env('META_PHONE_NUMBER_ID')) {
    return response({ error: 'servico_indisponivel' }, 503);
  }
  const data = await jsonBody(req);
  const phone = normalizePhone(data.phone);
  if (!phone) return errorMessage('telefone_invalido');
  const ip = String(context.ip || 'unknown').slice(0, 100);
  // Registro inclui telefones não cadastrados para impedir abuso e não revelar cadastros.
  const limits = await db.pool.query(
    "SELECT (SELECT count(*) FROM portal_otp_requests WHERE phone = $1 AND created_at > now() - interval '15 minutes') AS phone_total, (SELECT count(*) FROM portal_otp_requests WHERE requester_ip = $2 AND created_at > now() - interval '15 minutes') AS ip_total",
    [phone, ip]
  );
  if (Number(limits.rows[0].phone_total) >= 3 || Number(limits.rows[0].ip_total) >= 12) {
    return response({ error: 'muitas_tentativas' }, 429);
  }
  await db.pool.query('INSERT INTO portal_otp_requests (phone, requester_ip) VALUES ($1, $2)', [phone, ip]);
  const client = await db.pool.query('SELECT id FROM portal_clients WHERE phone = $1 AND active = true LIMIT 1', [phone]);
  if (!client.rowCount) {
    return response({ ok: true, message: 'Se o número estiver cadastrado, o código será enviado.' });
  }
  const id = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  await db.pool.query(
    "INSERT INTO portal_otps (id, phone, code_hash, requester_ip, expires_at) VALUES ($1, $2, $3, $4, now() + interval '5 minutes')",
    [id, phone, codeHash(id, phone, code), ip]
  );
  try {
    await sendOtp(phone, code);
  } catch (err) {
    await db.pool.query('DELETE FROM portal_otps WHERE id = $1', [id]);
    console.error('Duplar: falha no provedor de autenticação:', err?.message?.replace(/[^a-z-]/g, '') || 'unknown');
    return response({ error: 'envio_indisponivel' }, 503);
  }
  return response({ ok: true, message: 'Se o número estiver cadastrado, o código será enviado.' });
}
async function verifyCode(db, req) {
  if (env('PORTAL_OTP_SECRET').length < 32) return response({ error: 'servico_indisponivel' }, 503);
  const data = await jsonBody(req);
  const phone = normalizePhone(data.phone);
  const code = typeof data.code === 'string' ? data.code.trim() : '';
  if (!phone || !/^[0-9]{6}$/.test(code)) return errorMessage('codigo_invalido');
  const client = await db.pool.connect();
  let session = null;
  try {
    await client.query('BEGIN');
    const selected = await client.query(
      "SELECT id, code_hash, attempts FROM portal_otps WHERE phone = $1 AND expires_at > now() AND used_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [phone]
    );
    const attempt = selected.rows[0];
    if (!attempt || attempt.attempts >= 5) {
      await client.query('COMMIT');
      return response({ error: 'codigo_invalido_ou_expirado' }, 401);
    }
    await client.query('UPDATE portal_otps SET attempts = attempts + 1 WHERE id = $1', [attempt.id]);
    const valid = equalHex(codeHash(attempt.id, phone, code), attempt.code_hash);
    if (!valid) {
      await client.query('COMMIT');
      return response({ error: 'codigo_invalido_ou_expirado' }, 401);
    }
    const customer = await client.query('SELECT id FROM portal_clients WHERE phone = $1 AND active = true LIMIT 1', [phone]);
    if (!customer.rowCount) {
      await client.query('COMMIT');
      return response({ error: 'acesso_indisponivel' }, 403);
    }
    await client.query('UPDATE portal_otps SET used_at = now() WHERE id = $1', [attempt.id]);
    const token = randomBytes(32).toString('hex');
    await client.query(
      "INSERT INTO portal_sessions (token_hash, phone, client_id, is_admin, expires_at) VALUES ($1, $2, $3, $4, now() + interval '3 days')",
      [sha(token), phone, customer.rows[0]?.id || null, false]
    );
    await client.query('COMMIT');
    session = { token, admin: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return response({ ok: true, admin: session.admin }, 200, { 'Set-Cookie': sessionCookie(session.token, req) });
}
async function logout(db, req) {
  const token = cookieToken(req);
  if (token) await db.pool.query('DELETE FROM portal_sessions WHERE token_hash = $1', [sha(token)]);
  return response({ ok: true }, 200, { 'Set-Cookie': clearCookie(req) });
}
async function clientData(db, user) {
  if (!user.clientId) return response({ projects: [], documents: [], supportWhatsapp: normalizePhone(env('PORTAL_SUPPORT_WHATSAPP')) });
  const projects = await db.pool.query(
    "SELECT id, title, description, services, budget_cents::text, status, created_at, updated_at FROM portal_projects WHERE client_id = $1 ORDER BY created_at DESC LIMIT 150",
    [user.clientId]
  );
  const documents = await db.pool.query(
    "SELECT d.id, d.project_id, d.kind, d.filename, d.created_at FROM portal_documents d JOIN portal_projects p ON p.id = d.project_id WHERE p.client_id = $1 ORDER BY d.created_at DESC LIMIT 300",
    [user.clientId]
  );
  return response({ name: user.name, projects: projects.rows, documents: documents.rows, supportWhatsapp: normalizePhone(env('PORTAL_SUPPORT_WHATSAPP')) });
}
function storeFor(context) {
  const production = context.deploy?.context === 'production' || process.env.CONTEXT === 'production';
  const branch = (process.env.BRANCH || 'develop').replace(/[^a-z0-9-]/gi, '-').slice(0, 32).toLowerCase();
  return getStore(production ? 'duplar-private-production' : 'duplar-private-' + branch);
}
async function documentDownload(db, user, documentId, context) {
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return response({ error: 'nao_encontrado' }, 404);
  const result = await db.pool.query(
    'SELECT d.filename, d.storage_key FROM portal_documents d JOIN portal_projects p ON p.id = d.project_id WHERE d.id = $1 AND ($2::boolean OR p.client_id = $3::uuid) LIMIT 1',
    [documentId, user.admin, user.clientId]
  );
  if (!result.rowCount) return response({ error: 'nao_encontrado' }, 404);
  const document = result.rows[0];
  const file = await storeFor(context).get(document.storage_key, { type: 'arrayBuffer' });
  if (file === null) return response({ error: 'arquivo_indisponivel' }, 404);
  const safeName = document.filename.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120) || 'documento.pdf';
  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + safeName + '"',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
async function adminClients(db) {
  const { rows } = await db.pool.query(
    'SELECT c.id, c.name, c.phone, c.active, c.created_at, count(p.id)::integer AS project_count FROM portal_clients c LEFT JOIN portal_projects p ON p.client_id = c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 150'
  );
  return response({ clients: rows });
}
async function adminProjects(db, req) {
  const clientId = new URL(req.url).searchParams.get('client');
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return errorMessage('cliente_invalido');
  const { rows } = await db.pool.query(
    "SELECT id, title, description, services, budget_cents::text, status, created_at FROM portal_projects WHERE client_id = $1 ORDER BY created_at DESC LIMIT 100",
    [clientId]
  );
  return response({ projects: rows });
}
async function createClient(db, req) {
  const data = await jsonBody(req);
  const name = String(data.name || '').trim().slice(0, 160);
  const phone = normalizePhone(data.phone);
  if (name.length < 2 || !phone) return errorMessage('dados_invalidos');
  const { rows } = await db.pool.query(
    'INSERT INTO portal_clients (name, phone) VALUES ($1, $2) ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, active = true RETURNING id, name, phone',
    [name, phone]
  );
  return response({ client: rows[0] }, 201);
}
async function createProject(db, req) {
  const data = await jsonBody(req, 24000);
  const clientId = String(data.clientId || '');
  const title = String(data.title || '').trim().slice(0, 160);
  const description = String(data.description || '').trim().slice(0, 4000);
  const services = String(data.services || '').trim().slice(0, 4000);
  const status = String(data.status || 'Em planejamento').trim().slice(0, 80);
  const budget = data.budgetCents === null || data.budgetCents === '' ? null : Number(data.budgetCents);
  if (!/^[0-9a-f-]{36}$/i.test(clientId) || title.length < 2 || !status ||
      (budget !== null && (!Number.isSafeInteger(budget) || budget < 0))) return errorMessage('dados_invalidos');
  const client = await db.pool.query('SELECT id FROM portal_clients WHERE id = $1 AND active = true LIMIT 1', [clientId]);
  if (!client.rowCount) return response({ error: 'cliente_nao_encontrado' }, 404);
  const { rows } = await db.pool.query(
    'INSERT INTO portal_projects (client_id, title, description, services, status, budget_cents) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title',
    [clientId, title, description, services, status, budget]
  );
  return response({ project: rows[0] }, 201);
}
async function uploadDocument(db, req, context) {
  const length = Number(req.headers.get('content-length') || '0');
  if (length > MAX_FILE_BYTES + 1024 * 100) return response({ error: 'arquivo_muito_grande' }, 413);
  const form = await req.formData();
  const file = form.get('file');
  const clientId = String(form.get('clientId') || '');
  const projectId = String(form.get('projectId') || '');
  const kind = String(form.get('kind') || '');
  if (!(file instanceof File) || !/^[0-9a-f-]{36}$/i.test(clientId) ||
      !/^[0-9a-f-]{36}$/i.test(projectId) || !['contract', 'invoice'].includes(kind)) {
    return errorMessage('dados_invalidos');
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) return response({ error: 'arquivo_invalido_ou_grande' }, 413);
  // O nome deve ser PDF também; não entregar conteúdo com extensão executável ao cliente.
  if (!/\.pdf$/i.test(file.name || '')) return errorMessage('somente_pdf');
  const bytes = await file.arrayBuffer();
  const magic = new TextDecoder().decode(bytes.slice(0, 5));
  if (magic !== '%PDF-') return errorMessage('somente_pdf');
  // Confirma no servidor a associação cliente/projeto antes de armazenar um arquivo privado.
  const project = await db.pool.query(
    'SELECT id FROM portal_projects WHERE id = $1 AND client_id = $2 LIMIT 1',
    [projectId, clientId]
  );
  if (!project.rowCount) return response({ error: 'projeto_nao_encontrado' }, 404);
  const key = randomUUID() + '.pdf';
  const store = storeFor(context);
  await store.set(key, bytes);
  try {
    const filename = String(file.name || 'documento.pdf').trim().slice(0, 120) || 'documento.pdf';
    const { rows } = await db.pool.query(
      'INSERT INTO portal_documents (project_id, kind, filename, storage_key) VALUES ($1, $2, $3, $4) RETURNING id, filename',
      [projectId, kind, filename, key]
    );
    return response({ document: rows[0] }, 201);
  } catch (error) {
    await store.delete(key);
    throw error;
  }
}

export default async function handler(req, context) {
  const path = new URL(req.url).pathname.replace(/^\/api\/duplar\/?/, '');
  const route = path.replace(/\/$/, '');
  const method = req.method.toUpperCase();
  try {
    if (!['GET', 'POST'].includes(method)) return response({ error: 'metodo_nao_permitido' }, 405);
    if (method === 'POST' && !noCrossOriginWrite(req)) return response({ error: 'origem_nao_permitida' }, 403);
    const db = getDatabase();
    if (method === 'POST' && route === 'auth/request') return await requestCode(db, req, context);
    if (method === 'POST' && route === 'auth/verify') return await verifyCode(db, req);
    if (method === 'POST' && route === 'auth/logout') return await logout(db, req);
    const user = await currentUser(db, req);
    if (route.startsWith('admin-auth/')) return await handleAdminAuth({req,context,db,route,user,helpers:{response,jsonBody,cookieToken,sessionCookie,clearCookie,sha,env}});
    if (method === 'GET' && route === 'session') return user ?
      response({ authenticated: true, name: user.name, admin: user.admin, email: user.email, role: user.role }) :
      response({ authenticated: false }, 401);
    if (!user) return response({ error: 'nao_autorizado' }, 401);
    if (method === 'GET' && route === 'projects') return await clientData(db, user);
    if (method === 'GET' && route.startsWith('document/')) return await documentDownload(db, user, route.slice(9), context);
    if (!user.admin) return response({ error: 'acesso_negado' }, 403);
    if (method === 'GET' && route === 'admin/client-access-status') {
      if (user.role !== 'owner') return response({ error: 'acesso_negado' }, 403);
      return response(clientAccessReadiness());
    }
    if (method === 'GET' && route === 'admin/clients') return await adminClients(db);
    if (method === 'GET' && route === 'admin/projects') return await adminProjects(db, req);
    if (method === 'POST' && route === 'admin/clients') return await createClient(db, req);
    if (method === 'POST' && route === 'admin/projects') return await createProject(db, req);
    if (method === 'POST' && route === 'admin/documents') return await uploadDocument(db, req, context);
    return response({ error: 'nao_encontrado' }, 404);
  } catch (error) {
    if (error?.message === 'body-too-large') return response({ error: 'requisicao_muito_grande' }, 413);
    if (error?.message === 'json_invalido') return errorMessage('json_invalido');
    console.error('Duplar portal: falha interna', error?.name || 'unknown');
    return response({ error: 'erro_interno' }, 500);
  }
}
export const config = {
  path: '/api/duplar/*',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 60 }
};
