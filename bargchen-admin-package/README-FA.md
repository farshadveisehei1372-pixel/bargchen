# بسته پنل مدیریت بارچین — Cloudflare Pages Functions + D1

این بسته شامل پنل `/admin/` و APIهای مدیریت است. فایل‌های موجود سایت را جایگزین نکنید؛ پوشه‌ها را با حفظ ساختار به ریشه مخزن GitHub اضافه کنید.

## پیش‌نیازهای مهم
- در Cloudflare Pages > Settings > Bindings، binding دیتابیس باید دقیقاً `bargchen_db` و متصل به دیتابیس `bargchen_db` باشد.
- متغیرهای محیطی/Secrets را برای Production و Preview جداگانه تنظیم کنید.
- قبل از انتشار، migration `migrations/0002_admin_sessions.sql` را روی دیتابیس اجرا کنید.
- جدول‌های `admins`, `products`, `orders` باید مطابق migration قبلی وجود داشته باشند.

## راه‌اندازی
1. تمام فایل‌ها و پوشه‌های این بسته را به ریشه مخزن اضافه و commit کنید. هیچ فایل سایت فعلی را حذف یا جایگزین نکنید.
2. در Cloudflare Pages یک secret با نام `ADMIN_SETUP_TOKEN` و مقدار تصادفی طولانی (حداقل 32 کاراکتر) بسازید.
3. migration را با D1 Console اجرا کنید:

```sql
CREATE TABLE IF NOT EXISTS admin_sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 token_hash TEXT NOT NULL UNIQUE,
 admin_id INTEGER NOT NULL,
 expires_at TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
```

4. پس از Deploy موفق، مدیر اولیه را یک بار از ترمینال امن خود ایجاد کنید (توکن را در چت یا مرورگر عمومی وارد نکنید):

```bash
curl -X POST https://bargchen.ir/api/admin/setup \
  -H 'content-type: application/json' \
  -H 'x-setup-token: YOUR_LONG_SETUP_TOKEN' \
  --data '{"username":"YOUR_ADMIN_USERNAME","password":"A-VERY-LONG-UNIQUE-PASSWORD"}'
```

5. پس از پاسخ موفق، فوراً Secret `ADMIN_SETUP_TOKEN` را از Cloudflare حذف کنید. صفحه ورود: `https://bargchen.ir/admin/`.

## محدودیت‌ها و احتیاط
- API سفارش‌ها در این بسته می‌خواند و وضعیت را تغییر می‌دهد؛ فرم checkout فعلی سایت هنوز باید جداگانه به `POST /api/orders` متصل شود. این بسته به‌تنهایی سفارش‌های ذخیره‌شده در localStorage را به D1 منتقل نمی‌کند.
- مدیریت محصولات اینجا یک فهرست مدیریتی در D1 است؛ کاتالوگ فعلی سایت خودکار از آن تغذیه نمی‌شود تا زمانی که فرانت‌اند فروشگاه به API محصولات متصل شود.
- endpoint setup فقط وقتی جدول admins خالی باشد کار می‌کند. توکن setup باید پس از ایجاد مدیر حذف شود.
- قبل از استفاده عملی، تست کامل روی Preview انجام دهید و نسخه پشتیبان بگیرید. پرداخت اینترنتی در این بسته وجود ندارد.
