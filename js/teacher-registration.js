/* Teacher Registration — تسجيل معلم */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  function init() {
    $('#registerForm').addEventListener('submit', register);
  }

  function setError(msg) {
    const el = $('#formError');
    if (el) el.textContent = msg || '';
  }

  async function register(ev) {
    ev.preventDefault();
    setError('');

    const name = $('#teacherName').value.trim();
    const email = $('#teacherEmail').value.trim();
    const phone = $('#teacherPhone').value.trim();
    const subject = $('#teacherSubject').value.trim();
    const password = $('#password').value;
    const confirmPassword = $('#confirmPassword').value;

    if (!name || !email || !password) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    const btn = $('#registerBtn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    try {
      const { data, error } = await AminCore.client().auth.signUp({
        email: email,
        password: password,
        options: { data: { name, role: 'teacher', phone, subject } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('لم يتم إنشاء المستخدم');

      const { error: userError } = await AminCore.client().from('users').insert({
        id: data.user.id,
        email: email,
        name: name,
        role: 'teacher',
        phone: phone
      });
      if (userError) throw userError;

      $('#registerForm').style.display = 'none';
      $('#successBox').classList.add('show');
      toast('تم', 'تم إنشاء حساب المعلم', 'success');
    } catch (e) {
      setError(e.message || 'فشل إنشاء الحساب');
      toast('خطأ', e.message || 'فشل إنشاء الحساب', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  global.TeacherRegistrationApp = { init, register };
})(window);
