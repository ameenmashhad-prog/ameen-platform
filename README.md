# مدارس أمين الرضا (ع) — النظام المدرسي الموحد

A clean, local-first rebuild of the Ameen Al-Ridha Schools educational platform.

## الميزات

- **هوية بصرية موحدة**: أخضر زمردي (#0B6E4F)، ذهبي نحاسي (#B8860B)، كحلي نيلي (#3A3565)، مع نجمة ثمانية كتوقيع بصري.
- **لا CDN**: كل الموارد محلية (Supabase library محلية، SVG محلي، PWA كامل).
- **RTL/LTR آمن**: التصميم يعتمد على خصائص CSS المنطقية.
- **Mobile-first**: sidebar قابل للطي، bottom navigation للهاتف.
- **وحدات متعددة**: الطالب، المعلم، ولي الأمر، المشرف العام، المالية، الأكاديمي، الموارد البشرية، المكتبة، المخزون، النقل، الواجبات، الاختبارات الإلكترونية، التقويم، الإشعارات، التنبيهات الذكية.
- **PWA**: manifest + service worker + offline page.

## الهيكل

```
ameen-school/
├── index.html            # صفحة تسجيل الدخول
├── portal.html           # البوابة الموحدة
├── offline.html          # صفحة عدم الاتصال
├── css/
│   ├── design-tokens.css # متغيرات التصميم
│   └── components.css    # المكونات المشتركة
├── js/
│   ├── config.js         # إعدادات Supabase والمشروع
│   ├── i18n.js           # الترجمة
│   ├── core.js           # Supabase + auth + helpers
│   ├── platform-modules.js # قائمة الوحدات والأيقونات
│   ├── signature-star.js   # نجمة التوقيع الثمانية
│   ├── renderHelpers.js  # أدوات رسم واجهة المستخدم
│   ├── portal-app.js     # تطبيق البوابة
│   ├── student-app.js    # بوابة الطالب
│   ├── teacher-app.js    # بوابة المعلم
│   ├── parent-app.js     # بوابة ولي الأمر
│   ├── super-admin-app.js
│   ├── finance-pro.js
│   ├── academic-pro.js
│   ├── hr.js
│   ├── library.js
│   ├── inventory.js
│   ├── transportation.js
│   ├── homework.js
│   ├── online-exams.js
│   ├── notifications.js  # نظام الإشعارات
│   ├── calendar.js       # التقويم المدرسي
│   └── smart-alerts.js   # التنبيهات الذكية
├── pages/                # صفحات الوحدات
├── libs/
│   └── supabase.min.js   # Supabase محلي
├── sql/                  # مخطط قاعدة البيانات والبيانات الأولية
├── manifest.webmanifest
├── sw.js
└── vercel.json
```

## التشغيل محلياً

1. نسخ المستودع.
2. تفعيل Supabase proxy في `vercel.json` أو تغيير `supabaseUrl` في `js/config.js`.
3. تطبيق ملفات SQL في `sql/` على مشروع Supabase.
4. تشغيل خادم محلي أو نشر على Vercel.

## Supabase

- Project ref: `ovcjzsrqqgjsbqswtkro`
- Proxy URL: `window.location.origin + '/api'`
- Auth storage key: `amin-ovcjzsrqqgjsbqswtkro-auth-v2`

## التطوير

يجب التحقق من كل ملفات JavaScript باستخدام:

```bash
for f in $(find . -name '*.js' | sort); do node --check "$f"; done
```

## الترخيص

خاص بمدارس أمين الرضا (ع).
