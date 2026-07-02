:'=========================================
-- Amin School — RLS Policies for Registration
-- سياسات الوصول اللازمة لتسجيل الحسابات الجديدة
-- =========================================

-- users table: read own record, insert own record
CREATE POLICY IF NOT EXISTS users_read_own ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS users_insert_own ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS users_update_own ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- admins can manage all users
CREATE POLICY IF NOT EXISTS users_admin_all ON public.users FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin','super_admin')));

-- students table: parents can insert students linked to them
CREATE POLICY IF NOT EXISTS students_parent_insert ON public.students FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY IF NOT EXISTS students_parent_read ON public.students FOR SELECT
  USING (parent_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY IF NOT EXISTS students_admin_all ON public.students FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin','super_admin','teacher','academic')));
