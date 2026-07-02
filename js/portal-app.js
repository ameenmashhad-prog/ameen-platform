/* Amin Unified Portal — البوابة الموحدة */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let PERMS = [];
  let CURRENT_SECTION = 'dashboard';

  const SECTIONS = {
    dashboard: { title: 'لوحة القيادة', icon: 'home', render: renderDashboard },
    modules: { title: 'الوحدات', icon: 'academic', render: renderModules },
    tasks: { title: 'المهام', icon: 'forms', render: renderTasks },
    timeline: { title: 'الإنجازات', icon: 'reports', render: renderTimeline },
    profile: { title: 'الحساب', icon: 'users', render: renderProfile }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    PERMS = await loadPermissions();
    setupSidebar();
    setupBottomNav();
    setupBell();
    navigate('dashboard');
    updateClock();
    setInterval(updateClock, 60000);
    setInterval(refreshBell, 60000);
  }

  function setupBell() {
    const bellIcon = $('#bellIcon');
    if (bellIcon) bellIcon.innerHTML = AminPlatform.icons.bell || '';
    refreshBell();
  }

  async function refreshBell() {
    if (!ME) return;
    const count = await loadUnreadCount();
    const badge = $('#bellBadge');
    if (badge) {
      if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
      else { badge.style.display = 'none'; }
    }
  }

  async function loadUnreadCount() {
    try {
      const data = await AminCore.q('school_notifications', {
        columns: 'id',
        filters: [{ op: 'eq', col: 'recipient_user_id', val: ME.id }, { op: 'is', col: 'read_at', val: null }],
        limit: 100
      });
      return data.length;
    } catch (e) { return 0; }
  }

  function openNotifications() { location.href = 'pages/notifications.html'; }

  async function loadPermissions() {
    try {
      const token = await AminCore.client().auth.getSession().then(r => r.data.session?.access_token);
      if (!token) return [];
      const res = await fetch(AminCore.client().supabaseUrl + '/rest/v1/rpc/get_my_permissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'apikey': window.AMIN_CONFIG.supabaseAnonKey, 'authorization': 'Bearer ' + token },
        body: '{}'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  function setupSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(SECTIONS).map(([key, sec]) => `
      <button class="sidebar-nav-item ${key === CURRENT_SECTION ? 'active' : ''}" data-section="${key}" onclick="AminPortal.navigate('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[sec.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${esc(sec.title)}</span>
      </button>
    `).join('');

    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userRole').textContent = AminCore.roleLabel(ME.role) + (ME.is_super_admin ? ' · مسؤول أعلى' : '');
    const avatar = $('#userAvatar');
    if (avatar) avatar.textContent = (ME.name || 'م').charAt(0);
  }

  function setupBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['dashboard', 'modules', 'tasks', 'timeline', 'profile'];
    nav.innerHTML = visible.map(key => {
      const sec = SECTIONS[key];
      return `<button class="bottom-nav-item ${key === CURRENT_SECTION ? 'active' : ''}" onclick="AminPortal.navigate('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[sec.icon] || AminPlatform.icons.home}</span>
        <span>${esc(sec.title)}</span>
      </button>`;
    }).join('');
  }

  function navigate(section) {
    CURRENT_SECTION = section;
    $('#pageTitle').textContent = SECTIONS[section].title;
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === section));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(SECTIONS[section].title)));
    const content = $('#main-content');
    if (content) {
      content.innerHTML = '<div class="amin-loading-state"><div id="pageLoader"></div><div class="amin-loading-text">جاري التحميل...</div></div>';
      AminStar.renderLoader($('#pageLoader'));
      SECTIONS[section].render(content);
    }
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
  }

  function renderDashboard(container) {
    const tasks = getSampleTasks();
    const timeline = getSampleTimeline();

    container.innerHTML = `
      <div class="section-page-head">
        <h1>لوحة القيادة</h1>
        <p>ملخص يومك الدراسي والمهام المطلوبة</p>
      </div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">الطلاب</div><div class="amin-kpi-value">1,240</div><div class="amin-kpi-trend">↑ 4% هذا الشهر</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">نسبة الحضور</div><div class="amin-kpi-value">94%</div><div class="amin-kpi-trend">↑ 1%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المستحقات</div><div class="amin-kpi-value">12,500</div><div class="amin-kpi-trend down">↑ 2% متأخر</div></div>
      </div>
      <div class="amin-grid amin-grid-2" style="margin-bottom:var(--space-6);">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">أهم المهام</div></div><div id="dash-tasks"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">الإنجازات</div></div><div id="dash-timeline"></div></div>
      </div>
    `;
    AminRender.renderTaskList($('#dash-tasks'), tasks);
    AminRender.renderTimeline($('#dash-timeline'), timeline);
  }

  function renderModules(container) {
    const modules = AminPlatform.allowedModules(PERMS);
    container.innerHTML = `
      <div class="section-page-head"><h1>الوحدات المتاحة</h1></div>
      <div class="amin-grid amin-grid-3">
        ${modules.map(m => `
          <div class="amin-card amin-card-hover" style="cursor:pointer;" onclick="location.href='${esc(m.href)}'">
            <div style="color:var(--primary);margin-bottom:var(--space-3);">${AminPlatform.iconHtml(m)}</div>
            <div class="amin-card-title">${esc(AminPlatform.text(m.title, m.key))}</div>
            <div class="amin-card-subtitle">${esc(AminPlatform.text(m.desc, ''))}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTasks(container) {
    container.innerHTML = `<div class="section-page-head"><h1>المهام</h1></div><div id="tasks-list"></div>`;
    AminRender.renderTaskList($('#tasks-list'), getSampleTasks());
  }

  function renderTimeline(container) {
    container.innerHTML = `<div class="section-page-head"><h1>الإنجازات</h1></div><div id="timeline-list"></div>`;
    AminRender.renderTimeline($('#timeline-list'), getSampleTimeline());
  }

  function renderProfile(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الحساب</h1></div>
      <div class="amin-card" style="max-width:500px;">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5);">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;">${esc((ME.name || 'م').charAt(0))}</div>
          <div>
            <div style="font-weight:700;font-size:var(--text-lg);">${esc(ME.name || ME.email || 'مستخدم')}</div>
            <div style="color:var(--text-secondary);">${esc(AminCore.roleLabel(ME.role))}</div>
          </div>
        </div>
        <button class="amin-btn amin-btn-danger" onclick="AminCore.logout()">تسجيل الخروج</button>
      </div>
    `;
  }

  function getSampleTasks() {
    return [
      { id: 1, title: 'إثبات حضور اليوم', due_date: 'اليوم 08:00', priority: 'urgent', done: false },
      { id: 2, title: 'تصحيح واجب الرياضيات', due_date: 'غداً', priority: 'normal', done: false },
      { id: 3, title: 'مراجعة طلب تسجيل', due_date: 'بعد غد', priority: 'low', done: true }
    ];
  }

  function getSampleTimeline() {
    return [
      { id: 1, label: 'اختبار نصف الفصل', date: '١٥ رمضان ١٤٤٧', status: 'done', progress: 100 },
      { id: 2, label: 'الاختبار النهائي', date: '٥ شوال ١٤٤٧', status: 'upcoming', progress: 45 },
      { id: 3, label: 'حفل التخرج', date: '٢٥ شوال ١٤٤٧', status: 'upcoming', progress: 0 }
    ];
  }

  function updateClock() {
    const el = document.getElementById('clockWidget');
    if (!el) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = now.toLocaleDateString('ar-IQ-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
    el.innerHTML = `<div class="clock-hour">${time}</div><div class="clock-period">${now.getHours() < 12 ? 'صباحاً' : 'مساءً'}</div><div class="clock-date">${date}</div>`;
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  function toggleDarkMode() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('amin-theme', next);
  }

  global.AminPortal = {
    init, navigate, toggleSidebar, toggleDarkMode, CURRENT_SECTION: () => CURRENT_SECTION
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
