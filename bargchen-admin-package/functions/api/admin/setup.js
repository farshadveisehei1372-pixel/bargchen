import { json, fail, hashPassword } from './_utils.js';
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SETUP_TOKEN) return fail('ADMIN_SETUP_TOKEN is not configured', 503);
  const supplied = request.headers.get('x-setup-token') || '';
  if (supplied.length < 20 || supplied !== env.ADMIN_SETUP_TOKEN) return fail('Setup authorization failed', 403);
  let body; try { body = await request.json(); } catch { return fail('Invalid JSON'); }
  const username = String(body.username || '').trim(); const password = String(body.password || '');
  if (!/^[a-zA-Z0-9_.-]{4,40}$/.test(username)) return fail('Username must be 4-40 characters (letters, numbers, dot, underscore, hyphen)');
  if (password.length < 14 || password.length > 200) return fail('Password must be at least 14 characters');
  const existing = await env.bargchen_db.prepare('SELECT id FROM admins LIMIT 1').first();
  if (existing) return fail('An administrator already exists. Setup is closed.', 409);
  const hash = await hashPassword(password);
  await env.bargchen_db.prepare('INSERT INTO admins (username,password_hash) VALUES (?,?)').bind(username, hash).run();
  return json({ ok:true, message:'Administrator created. Remove ADMIN_SETUP_TOKEN from Cloudflare secrets now.' }, 201);
}
