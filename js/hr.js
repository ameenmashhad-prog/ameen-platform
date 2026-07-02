/* HR Portal — الموارد البشرية */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { employees: [], departments: [], leaves: [], payrolls: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'users' },
    employees: { title: 'الموظفون', icon: 'users' },
    leaves: { title: 'الإجازات', icon: 'calendar' },
    payroll: { title: 'الرواتب', icon: 'finance' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!['admin', 'hr', 'super_admin'].includes(ME.role) && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للموارد البشرية', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'موارد بشرية';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="HRApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'employees', 'leaves', 'payroll'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="HRApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [employees, departments, leaves, payrolls] = await Promise.all([
      AminCore.q('employees', { order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('departments', { order: 'name', limit: 50 }).catch(() => []),
      AminCore.q('leave_requests', { order: 'start_date', ascending: false, limit: 100 }).catch(() => []),
      AminCore.q('payrolls', { order: 'month', ascending: false, limit: 50 }).catch(() => [])
    ]);
    DATA = { employees, departments, leaves, payrolls };
  }

  function deptName(id) { const d = DATA.departments.find(x => String(x.id) === String(id)); return d ? d.name : '—'; }
  function empName(id) { const e = DATA.employees.find(x => String(x.id) === String(id)); return e ? e.name : '—'; }
  function totalPayroll() { return DATA.payrolls.reduce((s, p) => s + AminCore.num(p.net_salary), 0); }
  function pendingLeaves() { return DATA.leaves.filter(l => l.status === 'pending').length; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.hr-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'employees': renderEmployees(container); break;
        case 'leaves': renderLeaves(container); break;
        case 'payroll': renderPayroll(container); break;
      }
    }
  }

  function renderOverview(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الموارد البشرية</h1><p>ملخص الموظفين والإجازات والرواتب</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">الموظفون</div><div class="amin-kpi-value">${AminCore.ar(DATA.employees.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">إجازات قيد الانتظار</div><div class="amin-kpi-value">${AminCore.ar(pendingLeaves())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">مجموع الرواتب</div><div class="amin-kpi-value">${AminCore.money(totalPayroll())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">الأقسام</div><div class="amin-kpi-value">${AminCore.ar(DATA.departments.length)}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الإجازات</div></div><div id="overview-leaves"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">رواتب الشهر الحالي</div></div><div id="overview-payroll"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-leaves'), DATA.leaves.slice(0, 8), [
      { key: 'employee_id', title: 'الموظف' },
      { key: 'start_date', title: 'من' },
      { key: 'status', title: 'الحالة' }
    ], { primaryFields: ['employee_id', 'status'], mobileExpandable: ['start_date'] });
    AminRender.renderResponsiveTable($('#overview-payroll'), DATA.payrolls.slice(0, 8), [
      { key: 'employee_id', title: 'الموظف' },
      { key: 'month', title: 'الشهر' },
      { key: 'net_salary', title: 'الصافي' }
    ], { primaryFields: ['employee_id', 'net_salary'], mobileExpandable: ['month'] });
  }

  function renderEmployees(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الموظفون</h1></div>
      <div id="employees-table"></div>
    `;
    AminRender.renderResponsiveTable($('#employees-table'), DATA.employees, [
      { key: 'name', title: 'الاسم' },
      { key: 'department_id', title: 'القسم' },
      { key: 'position', title: 'المسمى' },
      { key: 'phone', title: 'الهاتف' }
    ], {
      primaryFields: ['name', 'department_id'],
      mobileExpandable: ['position', 'phone'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'عرض';
        return btn;
      }
    });
  }

  function renderLeaves(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>طلبات الإجازة</h1></div>
      <div id="leaves-table"></div>
    `;
    AminRender.renderResponsiveTable($('#leaves-table'), DATA.leaves, [
      { key: 'employee_id', title: 'الموظف' },
      { key: 'start_date', title: 'من' },
      { key: 'end_date', title: 'إلى' },
      { key: 'status', title: 'الحالة' }
    ], {
      primaryFields: ['employee_id', 'status'],
      mobileExpandable: ['start_date', 'end_date'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'إجراء';
        return btn;
      }
    });
  }

  function renderPayroll(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الرواتب</h1></div>
      <div id="payroll-table"></div>
    `;
    AminRender.renderResponsiveTable($('#payroll-table'), DATA.payrolls, [
      { key: 'employee_id', title: 'الموظف' },
      { key: 'month', title: 'الشهر' },
      { key: 'base_salary', title: 'الأساسي' },
      { key: 'net_salary', title: 'الصافي' }
    ], {
      primaryFields: ['employee_id', 'net_salary'],
      mobileExpandable: ['month', 'base_salary'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'كشف';
        return btn;
      }
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.HRApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
