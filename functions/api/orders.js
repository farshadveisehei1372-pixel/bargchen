import { json, fail } from './admin/_utils.js';

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const digits = v => String(v || '')
  .replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))
  .replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));

// دریافت سفارش فروشگاه (POST /api/orders). عمومی است، پس همه‌ی ورودی‌ها اعتبارسنجی و کوتاه می‌شوند.
// قیمت‌ها از سمت مرورگر می‌آیند؛ مدیر هنگام تأیید سفارش باید مبلغ را با قیمت واقعی کالا تطبیق دهد.
export async function onRequestPost({ request, env }) {
  if (!env.bargchen_db) return fail('Database is not configured', 503);
  if (Number(request.headers.get('content-length') || 0) > 20000) return fail('Payload too large', 413);
  let body;
  try { body = JSON.parse((await request.text()).slice(0, 20000)); } catch { return fail('Invalid JSON'); }
  const o = body && body.order;
  if (!o || typeof o !== 'object') return fail('Invalid order');

  const a = o.addr || {};
  const name = clean(a.rcv, 60);
  const phone = digits(clean(a.mob, 20));
  const zip = digits(clean(a.zip, 12));
  const street = clean(a.addr, 300);
  if (name.length < 2 || !/^09\d{9}$/.test(phone) || !/^\d{10}$/.test(zip) || street.length < 10) return fail('Invalid address data');
  const address = [clean(a.prov, 40), clean(a.city, 40), street].filter(Boolean).join('، ') + ' — کدپستی ' + zip;

  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 30).map(i => ({
    id: Number(i.id) | 0,
    n: clean(i.n, 120),
    q: Math.min(99, Math.max(1, Number(i.q) | 0)),
    p: Math.max(0, Math.min(1e10, Math.round(Number(i.p) || 0)))
  })).filter(i => i.n && i.id > 0);
  if (!items.length) return fail('Empty order');

  const total = items.reduce((s, i) => s + i.p * i.q, 0);
  const code = clean(o.code, 20);
  const stored = JSON.stringify({ code, pay: clean(o.pay, 80), date: clean(o.date, 20), items });
  try {
    const r = await env.bargchen_db
      .prepare('INSERT INTO orders (customer_name,phone,address,items_json,total_price,status) VALUES (?,?,?,?,?,?)')
      .bind(name, phone, address, stored, total, 'pending').run();
    return json({ ok: true, id: r.meta?.last_row_id, code }, 201);
  } catch (e) {
    return fail('Could not save order', 500);
  }
}
