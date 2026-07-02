/* Family Registration — تسجيل ولي أمر وطالب */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let CLASSES = [];

  async function init() {
    await loadClasses();
    populateClasses();
    $('#registerForm').addEventListener('submit', register);
  }

  async function loadClasses() {
    try {
      CLASSES = await AminCore.q('classes', { order: 'name', ascending: true, limit: 100 });
    } catch (e) { CLASSES = []; }
  }

  function populateClasses() {
    const sel = $('#studentClass');
    if (!sel) return;
    sel.innerHTML = `<option value="">اختر الصف...</option>` + CLASSES.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  }

  function setError(msg) {
    const el = $('#formError');
    if (el) el.textContent = msg || '';
  }

  async function register(ev) {
    ev.preventDefault();
    setError('');

    const parentName = $('#parentName').value.trim();
    const parentEmail = $('#parentEmail').value.trim();
    const parentPhone = $('#parentPhone').value.trim();
    const studentName = $('#studentName').value.trim();
    const studentClass = $('#studentClass').value;
    const studentGender = $('#studentGender').value;
    const password = $('#password').value;
    const confirmPassword = $('#confirmPassword').value;

    if (!parentName || !parentEmail || !studentName || !studentClass || !password) {
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
        email: parentEmail,
        password: password,
        options: { data: { name: parentName, role: 'parent', phone: parentPhone } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('لم يتم إنشاء المستخدم');

      const parentId = data.user.id;
      const { error: userError } = await AminCore.client().from('users').insert({
        id: parentId,
        email: parentEmail,
        name: parentName,
        role: 'parent',
        phone: parentPhone
      });
      if (userError) throw userError;

      const { error: studentError } = await AminCore.client().from('students').insert({
        parent_id: parentId,
        name: studentName,
        class_id: studentClass,
        gender: studentGender,
        phone: parentPhone
      });
      if (studentError) throw studentError;

      $('#registerForm').style.display = 'none';
      $('#successBox').classList.add('show');
      toast('تم', 'تم إنشاء حساب ولي الأمر وربط الطالب', 'success');
    } catch (e) {
      setError(e.message || 'فشل إنشاء الحساب');
      toast('خطأ', e.message || 'فشل إنشاء الحساب', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  global.FamilyRegistrationApp = { init, register };
})(window);
