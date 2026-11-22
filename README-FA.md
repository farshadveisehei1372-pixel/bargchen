# بارچین — سایت، پنل مدیریت و دریافت سفارش (Cloudflare Pages + D1)

## ساختار (همه در ریشه‌ی مخزن)
- `index.html` — فروشگاه (نسخه‌ی اصلاح‌شده؛ تصاویر بهینه شده‌اند)
- `admin/` — پنل مدیریت (`/admin/`)
- `functions/api/orders.js` — دریافت سفارش مشتری (`POST /api/orders`)
- `functions/api/admin/*` — API پنل مدیریت
- `migrations/` — ساخت جدول‌ها
- `_headers`، `robots.txt`، `sitemap.xml` — هدرهای امنیتی و سئو

## راه‌اندازی
1. در Cloudflare Pages > Settings > Bindings، دیتابیس D1 را با نام دقیق `bargchen_db` وصل کنید (Production و Preview).
2. در D1 Console به ترتیب اجرا کنید: `migrations/0002_admin_sessions.sql` و `migrations/0003_login_attempts.sql`. جدول‌های `admins`, `products`, `orders` از migration قبلی باید وجود داشته باشند.
3. یک Secret با نام `ADMIN_SETUP_TOKEN` (حداقل ۳۲ نویسه‌ی تصادفی) بسازید و Deploy کنید.
4. مدیر اولیه را یک بار از ترمینال خودتان بسازید (توکن را در چت یا مرورگر عمومی وارد نکنید):

```bash
curl -X POST https://bargchen.ir/api/admin/setup \
  -H 'content-type: application/json' \
  -H 'x-setup-token: YOUR_LONG_SETUP_TOKEN' \
  --data '{"username":"YOUR_ADMIN_USERNAME","password":"A-VERY-LONG-UNIQUE-PASSWORD"}'
```

5. بلافاصله Secret `ADMIN_SETUP_TOKEN` را حذف کنید. ورود: `https://bargchen.ir/admin/`.
6. یک سفارش آزمایشی از خود سایت ثبت کنید و در پنل، بخش «سفارش‌ها» ببینید. در هر سفارش دکمه‌ی «جزئیات» آدرس و کالاها را نشان می‌دهد.

## نکته‌های مهم
- اگر `POST /api/orders` در دسترس نباشد (مثلاً دیتابیس هنوز وصل نشده)، سایت سفارش را در همان مرورگر نگه می‌دارد و به مشتری می‌گوید متن سفارش را برای فروشگاه بفرستد.
- قیمت‌ها از مرورگر مشتری می‌آیند و سرور کاتالوگ ندارد؛ هنگام تأیید سفارش، مبلغ را با قیمت واقعی کالا تطبیق دهید.
- در Cloudflare یک Rate Limiting Rule برای `/api/orders` بگذارید تا اسپم نشود.
- مدیریت محصولات پنل هنوز کاتالوگ سایت را تغذیه نمی‌کند؛ محصولات سایت در `index.html` (آرایه‌ی `products`) هستند.
- صفحه‌های قوانین، حریم خصوصی و مرجوعی هنوز «پیش‌نویس» و دارای جای‌خالی زردرنگ‌اند؛ پیش از انتشار پر شوند.
- قبل از استفاده‌ی عملی روی Preview تست کنید و پشتیبان بگیرید. پرداخت اینترنتی وجود ندارد.
