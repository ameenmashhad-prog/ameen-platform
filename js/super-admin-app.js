/* Super Admin Portal — لوحة المدير الأعلى */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { students: [], teachers: [], users: [], classes: [], subjects: [], fees: [], payments: [], attendance: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'لوحة القيادة', icon: 'home' },
    students: { title: 'الطلاب', icon: 'users' },
    staff: { title: 'الموظفون', icon: 'users' },
    finance: { title: 'المالية', icon: 'finance' },
    academic: { title: 'الأكاديمي', icon: 'academic' },
    settings: { title: 'الإعدادات', icon: 'settings' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!ME.is_super_admin && ME.role !== 'admin') { AminCore.toast('غير مصرح', 'هذه الصفحة للمدير فقط', 'error'); AminCore.logout(); return; }
    $('#userName').textContent = ME.name || ME.email || 'مدير';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    buildSidebar();
    buildBottomNav();
    await loadData();
    showView('overview');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="SuperAdminApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'students', 'finance', 'academic', 'settings'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="SuperAdminApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [students, teachers, users, classes, subjects, fees, payments, attendance] = await Promise.all([
      AminCore.q('students', { order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('users', { filters: [{ op: 'eq', col: 'role', val: 'teacher' }], order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('users', { columns: 'id,name,email,role,is_super_admin', order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('classes', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('subjects', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('student_fees', { limit: 500 }).catch(() => []),
      AminCore.q('fee_payments', { order: 'created_at', ascending: false, limit: 100 }).catch(() => []),
      AminCore.q('attendance', { order: 'date', ascending: false, limit: 100 }).catch(() => [])
    ]);
    DATA = { students, teachers, users, classes, subjects, fees, payments, attendance };
  }

  function className(id) { const c = DATA.classes.find(x => String(x.id) === String(id)); return c ? c.name : '—'; }
  function subjectName(id) { const s = DATA.subjects.find(x => String(x.id) === String(id)); return s ? s.name : '—'; }
  function totalFees() { return DATA.fees.reduce((s, f) => s + AminCore.num(f.net_amount || f.base_amount), 0); }
  function totalPaid() { return DATA.fees.reduce((s, f) => s + AminCore.num(f.total_paid), 0); }
  function todayAttendance() {
    const today = AminCore.iso();
    const list = DATA.attendance.filter(a => String(a.date).slice(0, 10) === today);
    const present = list.filter(a => a.status === 'present').length;
    return list.length ? Math.round((present / list.length) * 100) : 0;
  }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.admin-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'students': renderStudents(container); break;
        case 'staff': renderStaff(container); break;
        case 'finance': renderFinance(container); break;
        case 'academic': renderAcademic(container); break;
        case 'settings': renderSettings(container); break;
      }
    }
  }

  function renderOverview(container) {
    const avg = DATA.students.length && DATA.fees.length ? Math.round((totalPaid() / totalFees()) * 100) : 0;
    container.innerHTML = `
      <div class="section-page-head"><h1>لوحة المدير الأعلى</h1><p>رؤية شاملة لكل أقسام المدرسة</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">الطلاب</div><div class="amin-kpi-value">${AminCore.ar(DATA.students.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المعلمون</div><div class="amin-kpi-value">${AminCore.ar(DATA.teachers.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المحصل</div><div class="amin-kpi-value">${AminCore.money(totalPaid())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المتبقي</div><div class="amin-kpi-value">${AminCore.money(totalFees() - totalPaid())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">حضور اليوم</div><div class="amin-kpi-value">${todayAttendance()}%</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر المدفوعات</div></div><div id="overview-payments"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الغيابات</div></div><div id="overview-absent"></div></div>
      </div>
    `;

    AminRender.renderResponsiveTable($('#overview-payments'), DATA.payments.slice(0, 8), [
      { key: 'created_at', title: 'التاريخ' },
      { key: 'amount', title: 'المبلغ' },
      { key: 'currency', title: 'العملة' }
    ], { primaryFields: ['amount', 'currency'], mobileExpandable: ['created_at'] });

    const absent = DATA.attendance.filter(a => a.status === 'absent').slice(0, 8).map(a => ({ id: a.id, title: 'غياب', due_date: String(a.date).slice(0, 10), priority: 'urgent', done: false }));
    AminRender.renderTaskList($('#overview-absent'), absent);
  }

  function renderStudents(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>إدارة الطلاب</h1></div>
      <div class="amin-filter-bar" style="margin-bottom:var(--space-5);">
        <div class="filter-field">
          <label>بحث</label>
          <input type="search" id="studentSearch" class="amin-input" placeholder="اسم الطالب...">
        </div>
      </div>
      <div id="students-table"></div>
    `;
    AminRender.renderResponsiveTable($('#students-table'), DATA.students, [
      { key: 'name', title: 'الاسم' },
      { key: 'class_id', title: 'الصف' },
      { key: 'gender', title: 'الجنس' },
      { key: 'email', title: 'البريد' }
    ], {
      primaryFields: ['name', 'class_id'],
      mobileExpandable: ['gender', 'email'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'عرض';
        return btn;
      }
    });
    $('#studentSearch')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = DATA.students.filter(s => (s.name || '').toLowerCase().includes(q));
      AminRender.renderResponsiveTable($('#students-table'), filtered, [
        { key: 'name', title: 'الاسم' },
        { key: 'class_id', title: 'الصف' },
        { key: 'gender', title: 'الجنس' },
        { key: 'email', title: 'البريد' }
      ], {
        primaryFields: ['name', 'class_id'],
        mobileExpandable: ['gender', 'email'],
        rowActions: (row) => {
          const btn = document.createElement('button');
          btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
          btn.textContent = 'عرض';
          return btn;
        }
      });
    });
  }

  function renderStaff(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الموظفون والمستخدمون</h1></div>
      <div id="staff-table"></div>
    `;
    AminRender.renderResponsiveTable($('#staff-table'), DATA.users, [
      { key: 'name', title: 'الاسم' },
      { key: 'email', title: 'البريد' },
      { key: 'role', title: 'الدور' },
      { key: 'is_super_admin', title: 'أعلى' }
    ], {
      primaryFields: ['name', 'role'],
      mobileExpandable: ['email', 'is_super_admin']
    });
  }

  function renderFinance(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>المالية</h1></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">إجمالي الرسوم</div><div class="amin-kpi-value">${AminCore.money(totalFees())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المحصل</div><div class="amin-kpi-value">${AminCore.money(totalPaid())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المتبقي</div><div class="amin-kpi-value">${AminCore.money(totalFees() - totalPaid())}</div></div>
      </div>
      <div id="finance-table"></div>
    `;
    AminRender.renderResponsiveTable($('#finance-table'), DATA.fees.slice(0, 50), [
      { key: 'student_id', title: 'الطالب' },
      { key: 'year_label', title: 'السنة' },
      { key: 'net_amount', title: 'الصافي' },
      { key: 'total_paid', title: 'المدفوع' }
    ], {
      primaryFields: ['student_id', 'net_amount'],
      mobileExpandable: ['year_label', 'total_paid']
    });
  }

  function renderAcademic(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الأكاديمي</h1></div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">الصفوف</div></div><div id="classes-table"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">المواد</div></div><div id="subjects-table"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#classes-table'), DATA.classes, [
      { key: 'name', title: 'الاسم' },
      { key: 'stage', title: 'المرحلة' },
      { key: 'students_count', title: 'عدد الطلاب' }
    ], { primaryFields: ['name', 'students_count'], mobileExpandable: ['stage'] });
    AminRender.renderResponsiveTable($('#subjects-table'), DATA.subjects, [
      { key: 'name', title: 'المادة' },
      { key: 'code', title: 'الرمز' }
    ], { primaryFields: ['name', 'code'] });
  }

  function renderSettings(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>إعدادات النظام</h1></div>
      <div class="amin-card" style="max-width:500px;">
        <div class="amin-card-header"><div class="amin-card-title">الوضع الليلي</div></div>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span>الوضع الحالي:</span>
          <button class="amin-btn amin-btn-primary" onclick="AminCore.toggleDarkMode()">تبديل</button>
        </div>
      </div>
    `;
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.SuperAdminApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
