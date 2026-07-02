/* Amin Core — Vanilla JS + Supabase (clean rebuild) */
(function(global){
  'use strict';

  const cfg = () => window.AMIN_CONFIG || {};
  let sb = null;
  let ME = null;
  let SESSION = null;

  const ROLE_LABELS = {
    admin: 'مدير', super_admin: 'مسؤول أعلى', finance: 'مسؤول مالي',
    discipline: 'مسؤول انضباط', counselor: 'مرشد نفسي', psychologist: 'مرشد نفسي',
    teacher: 'معلم', parent: 'ولي أمر', student: 'طالب', academic: 'مسؤول علمي'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function money(v) { return num(v).toLocaleString('ar-IQ') + ' د.ع'; }
  function ar(v) { return num(v).toLocaleString('ar-IQ'); }
  function iso() { return new Date().toISOString().slice(0, 10); }
  function roleLabel(role) { return ROLE_LABELS[role] || role || 'مستخدم'; }

  function toast(title, msg, type) {
    let container = $('#amin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'amin-toast-container';
      container.className = 'amin-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'amin-toast ' + (type || 'info');
    toast.innerHTML = '<div><div class="toast-title">' + esc(title) + '</div>' + (msg ? '<div class="toast-msg">' + esc(msg) + '</div>' : '') + '</div>';
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('amin-toast-out'); setTimeout(() => toast.remove(), 350); }, 4000);
  }

  function client() {
    if (sb) return sb;
    if (!window.supabase) throw new Error('مكتبة Supabase غير محملة');
    sb = window.supabase.createClient(
      cfg().supabaseUrl,
      cfg().supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: cfg().authStorageKey || 'amin-ovcjzsrqqgjsbqswtkro-auth-v2'
        }
      }
    );
    return sb;
  }

  async function recover(error) {
    const m = String(error && (error.message || error.code) || '').toLowerCase();
    if (!m.includes('jwt expired') && !m.includes('pgrst303')) return false;
    try { const r = await client().auth.refreshSession(); return !!(r.data && r.data.session); } catch (e) { return false; }
  }

  async function q(table, options = {}) {
    const { _retry = false, columns = '*', limit = 1000, order = null, ascending = true, filters = [] } = options;
    try {
      let query = client().from(table).select(columns);
      filters.forEach(f => { if (f && query[f.op]) query = query[f.op](f.col, f.val); });
      if (order) query = query.order(order, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) {
        if (!_retry && await recover(error)) return q(table, Object.assign({}, options, { _retry: true }));
        console.warn('[select]', table, error); return [];
      }
      return data || [];
    } catch (e) {
      if (!_retry && await recover(e)) return q(table, Object.assign({}, options, { _retry: true }));
      console.warn('[select failed]', table, e); return [];
    }
  }

  async function authProfile() {
    const { data: { session } } = await client().auth.getSession();
    if (!session) { location.href = 'index.html'; return null; }
    SESSION = session;
    const { data: user, error } = await client().from('users').select('*').eq('id', session.user.id).maybeSingle();
    if (error || !user) { toast('تعذر تحميل الحساب', 'سجّل دخول من جديد', 'error'); return null; }
    ME = user;
    return user;
  }

  function routeFor(profile) {
    if (!profile) return 'index.html';
    if (profile.is_super_admin || profile.role === 'admin') return 'pages/super-admin.html';
    if (profile.role === 'parent') return 'pages/parent.html';
    if (profile.role === 'teacher') return 'pages/teacher.html';
    if (profile.role === 'student') return 'pages/student.html';
    if (['counselor', 'psychologist'].includes(profile.role)) return 'pages/counselor.html';
    return 'portal.html';
  }

  function setFieldError(id, msg) {
    const input = $('#' + id);
    const err = $('#' + id + 'Error');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  }

  function clearLoginErrors() { setFieldError('username', ''); setFieldError('password', ''); }
  function failedAttempts() { return Number(localStorage.getItem('amin_login_failed_attempts') || 0); }
  function setFailedAttempts(n) {
    localStorage.setItem('amin_login_failed_attempts', String(n));
    const box = $('#attemptsBox');
    if (box) {
      if (n >= 3) { box.classList.add('show'); box.textContent = `تم تسجيل ${n} محاولات غير ناجحة. تأكد من البيانات أو استخدم استعادة كلمة المرور.`; }
      else { box.classList.remove('show'); box.textContent = ''; }
    }
  }

  async function login(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    clearLoginErrors();
    const u = ($('#username')?.value || '').trim();
    const p = $('#password')?.value || '';
    let ok = true;
    if (!u) { setFieldError('username', 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني'); ok = false; }
    if (!p) { setFieldError('password', 'يرجى إدخال كلمة المرور'); ok = false; }
    if (!ok) return;
    const btn = $('#loginBtn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try {
      const email = u.includes('@') ? u : `${u}@ameen.iq`;
      const { data, error } = await client().auth.signInWithPassword({ email, password: p });
      if (error) throw error;
      const { data: profile, error: pe } = await client().from('users').select('*').eq('id', data.user.id).maybeSingle();
      if (pe || !profile) throw new Error('الحساب غير موجود في جدول users');
      setFailedAttempts(0);
      location.href = routeFor(profile);
    } catch (e) {
      const n = failedAttempts() + 1;
      setFailedAttempts(n);
      toast('فشل الدخول', e.message || 'تحقق من البيانات', 'error');
      setFieldError('password', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }

  async function logout() { await client().auth.signOut({ scope: 'local' }).catch(() => {}); location.href = 'index.html'; }

  async function bootLogin() {
    client();
    $('#loginForm')?.addEventListener('submit', login);
    $('#loginBtn')?.addEventListener('click', login);
    $('#password')?.addEventListener('keydown', e => { if (e.key === 'Enter') login(e); });
    ['username', 'password'].forEach(id => $('#' + id)?.addEventListener('input', () => setFieldError(id, '')));
    $('#togglePassword')?.addEventListener('click', () => {
      const input = $('#password');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('#togglePassword')?.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    });
    $('#forgotPassword')?.addEventListener('click', e => { e.preventDefault(); toast('استعادة كلمة المرور', 'يرجى مراجعة إدارة المدرسة لإعادة تعيين كلمة المرور.', 'info'); });
    setFailedAttempts(failedAttempts());
    const { data: { session } } = await client().auth.getSession();
    if (session) {
      const { data: p } = await client().from('users').select('*').eq('id', session.user.id).maybeSingle();
      if (p) {
        const hint = $('#sessionHint');
        if (hint) hint.innerHTML = `توجد جلسة نشطة · <a href="${routeFor(p)}">دخول مباشر إلى الواجهة المناسبة</a>`;
      }
    }
  }

  function toggleDarkMode() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('amin-theme', next);
  }

  function initTheme() {
    const saved = localStorage.getItem('amin-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next);
  }
  initTheme();

  global.AminCore = {
    $, $$, esc, num, money, ar, iso, roleLabel,
    toast, client, q, authProfile, routeFor, login, logout, bootLogin, toggleDarkMode, initTheme, ME, SESSION
  };
  global.$ = $;
  global.$$ = $$;
  global.esc = esc;
  global.num = num;
  global.money = money;
  global.ar = ar;
  global.iso = iso;
  global.roleLabel = roleLabel;
  global.toast = toast;
  global.toggleDarkMode = toggleDarkMode;
})(window);
