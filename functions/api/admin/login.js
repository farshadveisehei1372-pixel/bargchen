import { json, fail, cookie, hashPassword, verifyPassword, sha256 } from './_utils.js';
const MAX_ATTEMPTS = 8; // در هر ۱۵ دقیقه برای هر IP
export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return fail('Invalid JSON'); }
  const username = String(body.username || '').trim(); const password = String(body.password || '');
  if (!username || !password || password.length > 200) return fail('نام کاربری یا رمز عبور نامعتبر است', 400);

  // محدودیت تلاش ناموفق (جدول login_attempts از migration 0003؛ اگر هنوز ساخته نشده، بدون محدودیت ادامه می‌دهد)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const r = await env.bargchen_db.prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE ip=? AND created_at > datetime('now','-15 minutes')").bind(ip).first();
    if ((r?.c || 0) >= MAX_ATTEMPTS) return fail('تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه بعد دوباره امتحان کنید', 429);
  } catch {}

  const admin = await env.bargchen_db.prepare('SELECT id,username,password_hash FROM admins WHERE username=?').bind(username).first();
  if (!admin) await hashPassword(password); // زمان پاسخ برای نام کاربری نامعتبر هم یکسان بماند
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    try { await env.bargchen_db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip).run(); } catch {}
    return fail('نام کاربری یا رمز عبور اشتباه است', 401);
  }

  try {
    await env.bargchen_db.prepare('DELETE FROM login_attempts WHERE ip=? OR created_at < datetime(\'now\',\'-1 day\')').bind(ip).run();
  } catch {}
  await env.bargchen_db.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')").run();
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const tokenHash = await sha256(token); const expires = new Date(Date.now()+8*60*60*1000).toISOString().replace('T',' ').slice(0,19);
  await env.bargchen_db.prepare('INSERT INTO admin_sessions (token_hash,admin_id,expires_at) VALUES (?,?,?)').bind(tokenHash,admin.id,expires).run();
  return json({ok:true,username:admin.username},200,{'set-cookie':cookie('bargchen_admin',token,8*60*60)});
}
