-- Amin School — Seed Data for testing
-- بيانات تجريبية للاختبار

INSERT INTO classes (id, name, stage, section, capacity) VALUES
('11111111-1111-1111-1111-111111111111', 'الأول ثانوي - أ', 'ثانوي', 'أ', 30),
('22222222-2222-2222-2222-222222222222', 'الثاني ثانوي - ب', 'ثانوي', 'ب', 28),
('33333333-3333-3333-3333-333333333333', 'الثالث متوسط - أ', 'متوسط', 'أ', 32)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, name, code) VALUES
('44444444-4444-4444-4444-444444444444', 'الرياضيات', 'MATH'),
('55555555-5555-5555-5555-555555555555', 'اللغة العربية', 'AR'),
('66666666-6666-6666-6666-666666666666', 'العلوم', 'SCI'),
('77777777-7777-7777-7777-777777777777', 'الإنجليزي', 'EN')
ON CONFLICT (id) DO NOTHING;

-- يجب إنشاء المستخدمين عبر Supabase Auth أولاً، ثم ربطهم بجدول users
-- هذا مثال فقط للاستعلامات بعد إنشاء الحسابات:

-- INSERT INTO users (id, email, name, role, is_super_admin) VALUES
-- ('uuid-مدير', 'admin@ameen.iq', 'مدير النظام', 'admin', true),
-- ('uuid-معلم', 'teacher@ameen.iq', 'أستاذ أحمد', 'teacher', false),
-- ('uuid-طالب', 'student@ameen.iq', 'علي أحمد', 'student', false),
-- ('uuid-ولي', 'parent@ameen.iq', 'أحمد علي', 'parent', false);

-- INSERT INTO students (id, user_id, parent_id, name, class_id, gender) VALUES
-- ('uuid-طالب-1', 'uuid-طالب', 'uuid-ولي', 'علي أحمد', '11111111-1111-1111-1111-111111111111', 'male');

-- فعاليات التقويم
INSERT INTO calendar_events (id, title, description, event_type, event_date, is_all_day) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'بداية الفصل الدراسي', 'افتتاح الفصل الدراسي الأول', 'event', '2025-09-01', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'عطلة عيد الأضحى', 'عطلة رسمية', 'holiday', '2025-06-07', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'اختبار الرياضيات النهائي', 'الاختبار النهائي لمادة الرياضيات', 'exam', '2025-12-15', true)
ON CONFLICT (id) DO NOTHING;

-- قواعد التنبيهات الذكية
INSERT INTO smart_alert_rules (id, key, name, description, severity, entity_type, condition_json, notify_roles) VALUES
('11111111-1111-1111-1111-111111111111', 'attendance_drop', 'تراجع الحضور', 'نسبة حضور الطالب أقل من 80% لمدة أسبوع', 'medium', 'attendance', '{"threshold":80,"window_days":7}', '{"admin","discipline"}'),
('22222222-2222-2222-2222-222222222222', 'fee_overdue', 'قسط متأخر', 'قسط دراسي متأخر أكثر من 15 يوم', 'high', 'fee', '{"overdue_days":15}', '{"admin","finance"}'),
('33333333-3333-3333-3333-333333333333', 'grade_low', 'درجة ضعيفة', 'درجة الطالب أقل من 50% في أي مادة', 'high', 'grade', '{"threshold":50}', '{"admin","academic","teacher"}')
ON CONFLICT (id) DO NOTHING;
