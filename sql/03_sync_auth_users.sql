-- Amin School — Sync auth.users to public.users
-- هذا الملف يعرض كشفاً بالحسابات الموجودة ويُزامن الحسابات الناقصة فقط
-- لا يحذف أو يعدّل أي حساب في auth.users

-- 1. عرض كشف الحسابات
SELECT 
  au.id,
  au.email,
  COALESCE(pu.name, au.raw_user_meta_data->>'name', 'بدون اسم') as name,
  COALESCE(pu.role, 'غير مربوط') as role_in_public_users,
  CASE WHEN pu.id IS NULL THEN 'ناقص من public.users' ELSE 'موجود' END as status,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
ORDER BY au.created_at DESC;

-- 2. تزامن الحسابات الناقصة بأمان
INSERT INTO public.users (id, email, name, role, is_super_admin, phone, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  CASE 
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('admin', 'super_admin') THEN 'admin'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('finance', 'financial') THEN 'finance'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('academic', 'academics') THEN 'academic'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('teacher', 'professor', 'teacher', 'أستاذ', 'معلم') THEN 'teacher'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('student', 'طالب') THEN 'student'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('parent', 'guardian', 'ولي', 'ولي أمر') THEN 'parent'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('counselor', 'psychologist', 'مرشد', 'نفسي') THEN 'psychologist'
    WHEN lower(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('discipline', 'انضباط') THEN 'discipline'
    ELSE 'teacher'
  END as role,
  COALESCE((au.raw_user_meta_data->>'is_super_admin')::boolean, false) as is_super_admin,
  au.raw_user_meta_data->>'phone' as phone,
  now()
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. التحقق بعد التزامن
SELECT 'عدد الحسابات في auth.users' as label, count(*) as count FROM auth.users
UNION ALL
SELECT 'عدد الحسابات في public.users' as label, count(*) as count FROM public.users;
