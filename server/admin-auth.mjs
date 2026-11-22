import { randomBytes, createHash, timingSafeEqual, scrypt as callbackScrypt } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(callbackScrypt);
const PARAMS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const MAX_ADMIN_SESSION = 12 * 60 * 60;
const GENERIC_LOGIN_ERROR = 'credenciais_invalidas';

function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function safeEqual(a,b) {
  const x=Buffer.from(a,'utf8'), y=Buffer.from(b,'utf8');
  return x.length===y.length && timingSafeEqual(x,y);
}
function normalizeEmail(value) {
  if(typeof value!=='string') return null;
  const email=value.trim().toLowerCase();
  if(email.length>254||email.length<5||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
function validPassword(value) {
  return typeof value==='string' && value.length>=12 && value.length<=128 && Buffer.byteLength(value,'utf8')<=256;
}
function validName(value) {
  return typeof value==='string' && value.trim().length>=2 && value.trim().length<=160;
}
async function hashPassword(password) {
  const salt=randomBytes(16).toString('hex');
  const hash=await scrypt(password,Buffer.from(salt,'hex'),64,PARAMS);
  return 'scrypt$131072$8$1$'+salt+'$'+hash.toString('hex');
}
async function verifyPassword(password,stored) {
  const parts=typeof stored==='string'?stored.split('$'):[];
  const valid=parts.length===6 && parts[0]==='scrypt' && parts[1]==='131072' && parts[2]==='8' && parts[3]==='1' && /^[0-9a-f]{32}$/.test(parts[4]) && /^[0-9a-f]{128}$/.test(parts[5]);
  // Comparação de custo semelhante para e-mails inexistentes.
  const salt=valid?parts[4]:'00000000000000000000000000000000';
  const actual=await scrypt(password,Buffer.from(salt,'hex'),64,PARAMS);
  return valid && timingSafeEqual(actual,Buffer.from(parts[5],'hex'));
}
async function audit(db,actor,action,subject,ip) {
  await db.pool.query('INSERT INTO portal_admin_audit(actor_id,action,subject,requester_ip) VALUES($1,$2,$3,$4)',[actor,action,subject,String(ip||'').slice(0,100)]);
}
export async function handleAdminAuth({req,context,db,route,user,helpers}) {
  const {response,jsonBody,cookieToken,sessionCookie,clearCookie,sha,env} = helpers;
  const ip=String(context.ip||'unknown').slice(0,100);
  const method=req.method.toUpperCase();
  const data=method==='POST'?await jsonBody(req):{};
  if(route==='admin-auth/status' && method==='GET') {
    const r=await db.pool.query('SELECT EXISTS(SELECT 1 FROM portal_admin_users) AS initialized');
    return response({initialized:r.rows[0].initialized});
  }
  if(route==='admin-auth/bootstrap' && method==='POST') {
    const expected=env('PORTAL_ADMIN_SETUP_TOKEN');
    if(expected.length<32) return response({error:'ativacao_nao_configurada'},503);
    const email=normalizeEmail(data.email),name=String(data.name||'').trim(),password=data.password;
    if(!email||!validName(name)||!validPassword(password))return response({error:'dados_invalidos'},400);
    const client=await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(47231918)');
      const existing=await client.query('SELECT EXISTS(SELECT 1 FROM portal_admin_users) AS initialized');
      if(existing.rows[0].initialized){await client.query('ROLLBACK');return response({error:'configuracao_ja_concluida'},409);}
      if(typeof data.setupToken!=='string'||!safeEqual(digest(data.setupToken),digest(expected))) {
        await client.query('ROLLBACK');return response({error:'ativacao_invalida'},403);
      }
      const hash=await hashPassword(password);
      const inserted=await client.query("INSERT INTO portal_admin_users(name,email,password_hash,role) VALUES($1,$2,$3,'owner') RETURNING id",[name,email,hash]);
      await client.query('INSERT INTO portal_admin_audit(actor_id,action,subject,requester_ip) VALUES($1,$2,$3,$4)',[inserted.rows[0].id,'bootstrap_owner',email,ip]);
      await client.query('COMMIT');
      return response({ok:true},201);
    } catch(err){await client.query('ROLLBACK');throw err;}
    finally{client.release();}
  }
  if(route==='admin-auth/login' && method==='POST') {
    const email=normalizeEmail(data.email);
    const password=typeof data.password==='string'?data.password:'';
    if(!email||!password||Buffer.byteLength(password,'utf8')>256) return response({error:GENERIC_LOGIN_ERROR},401);
    const lock=await db.pool.query(
      "SELECT (SELECT COUNT(*) FROM portal_admin_login_attempts WHERE email=$1 AND NOT success AND created_at>now()-interval '15 minutes') AS by_email,(SELECT COUNT(*) FROM portal_admin_login_attempts WHERE requester_ip=$2 AND NOT success AND created_at>now()-interval '15 minutes') AS by_ip",[email,ip]);
    if(Number(lock.rows[0].by_email)>=5||Number(lock.rows[0].by_ip)>=20)return response({error:'acesso_temporariamente_bloqueado'},429);
    const result=await db.pool.query('SELECT id,name,email,password_hash,active,role FROM portal_admin_users WHERE email=$1 LIMIT 1',[email]);
    const admin=result.rows[0];
    const valid=await verifyPassword(password,admin?.password_hash);
    if(!admin||!admin.active||!valid) {
      await db.pool.query('INSERT INTO portal_admin_login_attempts(email,requester_ip,success) VALUES($1,$2,false)',[email,ip]);
      return response({error:GENERIC_LOGIN_ERROR},401);
    }
    await db.pool.query('INSERT INTO portal_admin_login_attempts(email,requester_ip,success) VALUES($1,$2,true)',[email,ip]);
    const token=randomBytes(32).toString('hex');
    await db.pool.query("INSERT INTO portal_sessions(token_hash,phone,client_id,is_admin,admin_id,expires_at) VALUES($1,NULL,NULL,true,$2,now()+interval '12 hours')",[sha(token),admin.id]);
    await audit(db,admin.id,'login',email,ip);
    return response({ok:true,admin:true,name:admin.name,role:admin.role},200,{'Set-Cookie':sessionCookie(token,req,MAX_ADMIN_SESSION)});
  }
  if(route==='admin-auth/accept' && method==='POST') {
    const email=normalizeEmail(data.email);
    const token=typeof data.token==='string'?data.token:'';
    if(!email||!validPassword(data.password)||!/^[0-9a-f]{64}$/.test(token))return response({error:'convite_invalido'},400);
    const client=await db.pool.connect();
    try {
      await client.query('BEGIN');
      const invitation=await client.query("SELECT id,name,email FROM portal_admin_invitations WHERE token_hash=$1 AND email=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE",[digest(token),email]);
      if(!invitation.rowCount){await client.query('ROLLBACK');return response({error:'convite_invalido_ou_expirado'},400);}
      const existing=await client.query('SELECT id,active FROM portal_admin_users WHERE email=$1 FOR UPDATE',[email]);
      if(existing.rowCount&&!existing.rows[0].active){await client.query('ROLLBACK');return response({error:'conta_desativada'},403);}
      const hashed=await hashPassword(data.password);
      let id;
      if(existing.rowCount){
        id=existing.rows[0].id;
        await client.query('UPDATE portal_admin_users SET password_hash=$1,password_changed_at=now() WHERE id=$2',[hashed,id]);
        await client.query('DELETE FROM portal_sessions WHERE admin_id=$1',[id]);
      }else {
        const created=await client.query("INSERT INTO portal_admin_users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id",[invitation.rows[0].name,email,hashed]);
        id=created.rows[0].id;
      }
      await client.query('UPDATE portal_admin_invitations SET used_at=now() WHERE id=$1',[invitation.rows[0].id]);
      await client.query('INSERT INTO portal_admin_audit(actor_id,action,subject,requester_ip) VALUES($1,$2,$3,$4)',[id,'invitation_accepted',email,ip]);
      await client.query('COMMIT');
      return response({ok:true});
    }catch(err){await client.query('ROLLBACK');throw err;}
    finally{client.release();}
  }
  if(!user?.admin)return response({error:'acesso_negado'},403);
  if(route==='admin-auth/change-password' && method==='POST') {
    if(!validPassword(data.newPassword))return response({error:'senha_fraca'},400);
    const admin=await db.pool.query('SELECT password_hash FROM portal_admin_users WHERE id=$1',[user.adminId]);
    if(!admin.rowCount||!(await verifyPassword(String(data.currentPassword||''),admin.rows[0].password_hash)))return response({error:'senha_atual_invalida'},403);
    const hashed=await hashPassword(data.newPassword);
    await db.pool.query('UPDATE portal_admin_users SET password_hash=$1,password_changed_at=now() WHERE id=$2',[hashed,user.adminId]);
    await db.pool.query('DELETE FROM portal_sessions WHERE admin_id=$1',[user.adminId]);
    await audit(db,user.adminId,'change_password',user.email,ip);
    return response({ok:true},200,{'Set-Cookie':clearCookie(req)});
  }
  if(user.role!=='owner') return response({error:'somente_responsavel_principal'},403);
  if(route==='admin-auth/users' && method==='GET') {
    const r=await db.pool.query('SELECT id,name,email,role,active,created_at FROM portal_admin_users ORDER BY created_at ASC');
    return response({users:r.rows});
  }
  if(route==='admin-auth/invite' && method==='POST') {
    const name=String(data.name||'').trim(),email=normalizeEmail(data.email);
    if(!email||!validName(name))return response({error:'dados_invalidos'},400);
    const existing=await db.pool.query('SELECT id,active,role FROM portal_admin_users WHERE email=$1',[email]);
    if(existing.rows[0]&&!existing.rows[0].active) return response({error:'conta_desativada'},409);
    if(existing.rows[0]?.role==='owner')return response({error:'convite_nao_permitido'},409);
    const token=randomBytes(32).toString('hex');
    await db.pool.query("INSERT INTO portal_admin_invitations(created_by,email,name,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours')",[user.adminId,email,name,digest(token)]);
    await audit(db,user.adminId,'invitation_created',email,ip);
    return response({ok:true,invitationToken:token,expiresHours:24});
  }
  if(route==='admin-auth/user-status' && method==='POST') {
    const id=typeof data.id==='string'?data.id:'';
    if(!/^[0-9a-f-]{36}$/i.test(id)||typeof data.active!=='boolean'||id===user.adminId)return response({error:'dados_invalidos'},400);
    const result=await db.pool.query("UPDATE portal_admin_users SET active=$1 WHERE id=$2 AND role='admin' RETURNING id,email",[data.active,id]);
    if(!result.rowCount)return response({error:'nao_encontrado'},404);
    if(!data.active)await db.pool.query('DELETE FROM portal_sessions WHERE admin_id=$1',[id]);
    await audit(db,user.adminId,'user_status_changed',result.rows[0].email+':'+data.active,ip);
    return response({ok:true});
  }
  return response({error:'nao_encontrado'},404);
}
