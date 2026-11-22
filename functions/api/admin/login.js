import { json, fail, cookie, hashPassword, verifyPassword, sha256 } from './_utils.js';
const MAX_ATTEMPTS = 8; // حداکثر تلاش ناموفق برای هر IP در بازه ۱۵ دقیقه

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON'); }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password || password.length > 200) {
    return fail('نام کاربری یا رمز عبور نامعتبر است', 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  let attempts;
  try {
    attempts = await env.bargchen_db
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE ip=? AND created_at > datetime('now','-15 minutes')")
      .bind(ip).first();
  } catch {
    // اگر جدول/دیتابیس محافظت در دسترس نباشد، ورود را باز نمی‌گذاریم.
    return fail('سامانه محافظت ورود آماده نیست؛ migration شماره 0003 و اتصال D1 را بررسی کنید', 503);
  }

  if ((attempts?.c || 0) >= MAX_ATTEMPTS) {
    return fail('تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه بعد دوباره امتحان کنید', 429);
  }

  const admin = await env.bargchen_db
    .prepare('SELECT id,username,password_hash FROM admins WHERE username=?')
    .bind(username).first();

  if (!admin) await hashPassword(password); // کاهش تفاوت زمان پاسخ برای نام کاربری نامعتبر
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    try {
      await env.bargchen_db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip).run();
    } catch {
      return fail('ثبت تلاش ورود ناموفق نشد؛ ورود موقتاً غیرفعال شد', 503);
    }
    return fail('نام کاربری یا رمز عبور اشتباه است', 401);
  }

  try {
    await env.bargchen_db
      .prepare("DELETE FROM login_attempts WHERE ip=? OR created_at < datetime('now','-1 day')")
      .bind(ip).run();
  } catch {
    // پاک‌سازی قدیمی‌ها روی اعتبار نشست اثر ندارد؛ شمارنده همچنان محدودکننده است.
  }

  await env.bargchen_db.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')").run();
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map(x => x.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await env.bargchen_db
    .prepare('INSERT INTO admin_sessions (token_hash,admin_id,expires_at) VALUES (?,?,?)')
    .bind(tokenHash, admin.id, expires).run();

  return json({ ok: true, username: admin.username }, 200, {
    'set-cookie': cookie('bargchen_admin', token, 8 * 60 * 60)
  });
}
