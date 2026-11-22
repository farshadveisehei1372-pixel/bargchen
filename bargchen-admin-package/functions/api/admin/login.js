import { json, fail, cookie, hashPassword, verifyPassword, sha256 } from './_utils.js';
export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return fail('Invalid JSON'); }
  const username = String(body.username || '').trim(); const password = String(body.password || '');
  if (!username || !password || password.length > 200) return fail('نام کاربری یا رمز عبور نامعتبر است', 400);
  const admin = await env.bargchen_db.prepare('SELECT id,username,password_hash FROM admins WHERE username=?').bind(username).first();
  if (!admin || !(await verifyPassword(password, admin.password_hash))) return fail('نام کاربری یا رمز عبور اشتباه است', 401);
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const tokenHash = await sha256(token); const expires = new Date(Date.now()+8*60*60*1000).toISOString().replace('T',' ').slice(0,19);
  await env.bargchen_db.prepare('INSERT INTO admin_sessions (token_hash,admin_id,expires_at) VALUES (?,?,?)').bind(tokenHash,admin.id,expires).run();
  return json({ok:true,username:admin.username},200,{'set-cookie':cookie('bargchen_admin',token,8*60*60)});
}
