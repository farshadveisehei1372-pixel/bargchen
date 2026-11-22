import { json, getCookie, sha256, cookie } from './_utils.js';
export async function onRequestPost({ request, env }) { const token=getCookie(request,'bargchen_admin'); if(token) await env.bargchen_db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha256(token)).run(); return json({ok:true},200,{'set-cookie':cookie('bargchen_admin','',0)}); }
