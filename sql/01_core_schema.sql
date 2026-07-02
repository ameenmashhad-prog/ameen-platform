-- Amin School — Core Schema (clean rebuild)
-- الإعدادات الأساسية: المستخدمين، الطلاب، الصفوف، المواد، الجدول، الحضور، الدرجات

-- المستخدمون
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','super_admin','finance','academic','teacher','student','parent','counselor','discipline','psychologist')),
  is_super_admin BOOLEAN DEFAULT FALSE,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- الصفوف الدراسية
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage TEXT,
  section TEXT,
  capacity INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- المواد الدراسية
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الطلاب
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  father_name TEXT,
  last_name TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  gender TEXT CHECK (gender IN ('male','female')),
  birth_date DATE,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الجدول الأسبوعي
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 7),
  day_name TEXT,
  period_number INTEGER NOT NULL,
  period_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الحضور
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  attendance_type TEXT DEFAULT 'daily',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date, attendance_type)
);

-- الدرجات
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  exam_id UUID,
  score NUMERIC(5,2),
  grade TEXT,
  mark NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- أنواع السلوك
CREATE TABLE IF NOT EXISTS behavior_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- سجلات السلوك
CREATE TABLE IF NOT EXISTS behavior_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  behavior_type_id UUID REFERENCES behavior_types(id) ON DELETE SET NULL,
  points INTEGER DEFAULT 0,
  note TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الرسوم الدراسية
CREATE TABLE IF NOT EXISTS student_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  year_label TEXT,
  base_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) GENERATED ALWAYS AS (base_amount - discount_amount) STORED,
  total_paid NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'IQD',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الأقساط
CREATE TABLE IF NOT EXISTS student_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id UUID NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_month TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- المدفوعات
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_id UUID REFERENCES student_fees(id) ON DELETE SET NULL,
  student_installment_id UUID REFERENCES student_installments(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'IQD',
  payment_method TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الاختبارات الإلكترونية
CREATE TABLE IF NOT EXISTS online_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- أسئلة الاختبار
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice','true_false','text')),
  options JSONB,
  correct_answer TEXT,
  marks NUMERIC(5,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إجابات الطلاب
CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers JSONB,
  score NUMERIC(5,2),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','graded')),
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  UNIQUE(exam_id, student_id)
);

-- الإشعارات المدرسية
CREATE TABLE IF NOT EXISTS school_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- الصلاحيات الإضافية
CREATE TABLE IF NOT EXISTS user_extra_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  can_read BOOLEAN DEFAULT TRUE,
  can_write BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_key)
);

-- سياسات RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الاختبارات
CREATE POLICY exams_read_all ON online_exams FOR SELECT USING (true);
CREATE POLICY exams_write_teachers ON online_exams FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','teacher','academic')));
CREATE POLICY questions_read_all ON exam_questions FOR SELECT USING (true);
CREATE POLICY questions_write_teachers ON exam_questions FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','teacher','academic')));
CREATE POLICY submissions_read_students ON exam_submissions FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()) OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','teacher','academic')));
CREATE POLICY submissions_write_students ON exam_submissions FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY submissions_update_teachers ON exam_submissions FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','teacher','academic')));

-- تقويم الفعاليات والاختبارات والعطل
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday','exam','event','deadline','meeting')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- التنبيهات الذكية
CREATE TABLE IF NOT EXISTS smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  title TEXT NOT NULL,
  body TEXT,
  related_type TEXT, -- student, class, fee, grade, attendance, behavior
  related_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- قواعد التنبيهات الذكية
CREATE TABLE IF NOT EXISTS smart_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('attendance','fee','grade','behavior','academic','finance')),
  condition_json JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  notify_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alert_rules ENABLE ROW LEVEL SECURITY;

-- سياسات RLS بسيطة
CREATE POLICY calendar_read_all ON calendar_events FOR SELECT USING (true);
CREATE POLICY calendar_write_admin ON calendar_events FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','academic')));

CREATE POLICY alerts_read_all ON smart_alerts FOR SELECT USING (true);
CREATE POLICY alerts_write_admin ON smart_alerts FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin','discipline','finance','academic')));

CREATE POLICY alert_rules_read_all ON smart_alert_rules FOR SELECT USING (true);
CREATE POLICY alert_rules_write_admin ON smart_alert_rules FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin','super_admin')));

-- استدعاء الصلاحيات
CREATE OR REPLACE FUNCTION get_my_permissions()
RETURNS TABLE(permission TEXT) AS $$
BEGIN
  RETURN QUERY SELECT DISTINCT role FROM users WHERE id = auth.uid();
  RETURN QUERY SELECT module_key FROM user_extra_permissions WHERE user_id = auth.uid() AND can_read = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
