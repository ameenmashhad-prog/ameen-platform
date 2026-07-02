/* Finance Pro — النظام المالي */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { fees: [], installments: [], payments: [], students: [], classes: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'finance' },
    payments: { title: 'المدفوعات', icon: 'forms' },
    installments: { title: 'الأقساط', icon: 'calendar' },
    collections: { title: 'التحصيل', icon: 'reports' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (ME.role !== 'admin' && ME.role !== 'finance' && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للمالية فقط', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'مسؤول مالي';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="FinanceApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'payments', 'installments', 'collections'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="FinanceApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [fees, installments, payments, students, classes] = await Promise.all([
      AminCore.q('student_fees', { limit: 500 }).catch(() => []),
      AminCore.q('student_installments', { order: 'installment_month', limit: 500 }).catch(() => []),
      AminCore.q('fee_payments', { order: 'created_at', ascending: false, limit: 200 }).catch(() => []),
      AminCore.q('students', { order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('classes', { order: 'name', limit: 100 }).catch(() => [])
    ]);
    DATA = { fees, installments, payments, students, classes };
  }

  function studentName(id) { const s = DATA.students.find(x => String(x.id) === String(id)); return s ? (s.name || '—') : '—'; }
  function className(id) { const c = DATA.classes.find(x => String(x.id) === String(id)); return c ? c.name : '—'; }
  function totalFees() { return DATA.fees.reduce((s, f) => s + AminCore.num(f.net_amount || f.base_amount), 0); }
  function totalPaid() { return DATA.fees.reduce((s, f) => s + AminCore.num(f.total_paid), 0); }
  function overdueInstallments() {
    const today = AminCore.iso();
    return DATA.installments.filter(i => i.due_date < today && AminCore.num(i.paid_amount) < AminCore.num(i.amount));
  }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.finance-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'payments': renderPayments(container); break;
        case 'installments': renderInstallments(container); break;
        case 'collections': renderCollections(container); break;
      }
    }
  }

  function renderOverview(container) {
    const remaining = totalFees() - totalPaid();
    const overdue = overdueInstallments().length;
    container.innerHTML = `
      <div class="section-page-head"><h1>النظام المالي</h1><p>ملخص الرسوم والمدفوعات</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">إجمالي الرسوم</div><div class="amin-kpi-value">${AminCore.money(totalFees())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المحصل</div><div class="amin-kpi-value">${AminCore.money(totalPaid())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المتبقي</div><div class="amin-kpi-value">${AminCore.money(remaining)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">أقساط متأخرة</div><div class="amin-kpi-value">${AminCore.ar(overdue)}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر المدفوعات</div></div><div id="overview-payments"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">أقساط مستحقة قريباً</div></div><div id="overview-overdue"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-payments'), DATA.payments.slice(0, 8), [
      { key: 'created_at', title: 'التاريخ' },
      { key: 'amount', title: 'المبلغ' },
      { key: 'currency', title: 'العملة' }
    ], { primaryFields: ['amount', 'currency'], mobileExpandable: ['created_at'] });

    const upcoming = DATA.installments.filter(i => i.due_date >= AminCore.iso()).slice(0, 8).map(i => ({
      id: i.id, title: 'قسط ' + i.installment_month,
      due_date: i.due_date,
      priority: i.due_date <= AminCore.iso() ? 'urgent' : 'normal',
      done: false
    }));
    AminRender.renderTaskList($('#overview-overdue'), upcoming);
  }

  function renderPayments(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>سجل المدفوعات</h1></div>
      <div class="amin-filter-bar" style="margin-bottom:var(--space-5);">
        <div class="filter-field"><label>من</label><input type="date" class="amin-input" id="payFrom"></div>
        <div class="filter-field"><label>إلى</label><input type="date" class="amin-input" id="payTo"></div>
      </div>
      <div id="payments-table"></div>
    `;
    AminRender.renderResponsiveTable($('#payments-table'), DATA.payments, [
      { key: 'created_at', title: 'التاريخ' },
      { key: 'amount', title: 'المبلغ' },
      { key: 'currency', title: 'العملة' },
      { key: 'payment_method', title: 'الطريقة' }
    ], {
      primaryFields: ['amount', 'currency'],
      mobileExpandable: ['created_at', 'payment_method'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'إيصال';
        return btn;
      }
    });
  }

  function renderInstallments(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الأقساط</h1></div>
      <div id="installments-table"></div>
    `;
    AminRender.renderResponsiveTable($('#installments-table'), DATA.installments.slice(0, 100), [
      { key: 'installment_month', title: 'الشهر' },
      { key: 'amount', title: 'المبلغ' },
      { key: 'paid_amount', title: 'المدفوع' },
      { key: 'due_date', title: 'الاستحقاق' }
    ], {
      primaryFields: ['installment_month', 'amount'],
      mobileExpandable: ['paid_amount', 'due_date']
    });
  }

  function renderCollections(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>حالة التحصيل</h1></div>
      <div id="collections-table"></div>
    `;
    const rows = DATA.fees.map(f => ({
      student_id: studentName(f.student_id),
      year_label: f.year_label || '—',
      net_amount: AminCore.money(AminCore.num(f.net_amount || f.base_amount)),
      total_paid: AminCore.money(AminCore.num(f.total_paid)),
      remaining: AminCore.money(AminCore.num(f.net_amount || f.base_amount) - AminCore.num(f.total_paid))
    }));
    AminRender.renderResponsiveTable($('#collections-table'), rows, [
      { key: 'student_id', title: 'الطالب' },
      { key: 'year_label', title: 'السنة' },
      { key: 'remaining', title: 'المتبقي' }
    ], {
      primaryFields: ['student_id', 'remaining'],
      mobileExpandable: ['year_label', 'net_amount', 'total_paid']
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.FinanceApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
