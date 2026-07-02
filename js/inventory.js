/* Inventory Portal — المخزون */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { items: [], movements: [], suppliers: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'inventory' },
    items: { title: 'الأصناف', icon: 'forms' },
    movements: { title: 'الحركات', icon: 'reports' },
    suppliers: { title: 'الموردون', icon: 'users' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!['admin', 'inventory', 'super_admin'].includes(ME.role) && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للمخزون', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'المخزون';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="InventoryApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'items', 'movements', 'suppliers'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="InventoryApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [items, movements, suppliers] = await Promise.all([
      AminCore.q('inventory_items', { order: 'name', limit: 300 }).catch(() => []),
      AminCore.q('inventory_movements', { order: 'created_at', ascending: false, limit: 200 }).catch(() => []),
      AminCore.q('suppliers', { order: 'name', limit: 100 }).catch(() => [])
    ]);
    DATA = { items, movements, suppliers };
  }

  function supplierName(id) { const s = DATA.suppliers.find(x => String(x.id) === String(id)); return s ? s.name : '—'; }
  function itemName(id) { const i = DATA.items.find(x => String(x.id) === String(id)); return i ? i.name : '—'; }
  function lowStock() { return DATA.items.filter(i => AminCore.num(i.current_quantity) <= AminCore.num(i.min_quantity)).length; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.inventory-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'items': renderItems(container); break;
        case 'movements': renderMovements(container); break;
        case 'suppliers': renderSuppliers(container); break;
      }
    }
  }

  function renderOverview(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>المخزون</h1><p>ملخص الأصناف والحركات والموردين</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">الأصناف</div><div class="amin-kpi-value">${AminCore.ar(DATA.items.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">منخفض المخزون</div><div class="amin-kpi-value">${AminCore.ar(lowStock())}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">حركات اليوم</div><div class="amin-kpi-value">${AminCore.ar(DATA.movements.filter(m => String(m.created_at).slice(0, 10) === AminCore.iso()).length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">الموردون</div><div class="amin-kpi-value">${AminCore.ar(DATA.suppliers.length)}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الحركات</div></div><div id="overview-movements"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">أصناف منخفضة</div></div><div id="overview-low"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-movements'), DATA.movements.slice(0, 8), [
      { key: 'item_id', title: 'الصنف' },
      { key: 'type', title: 'نوع' },
      { key: 'quantity', title: 'الكمية' },
      { key: 'created_at', title: 'التاريخ' }
    ], { primaryFields: ['item_id', 'quantity'], mobileExpandable: ['type', 'created_at'] });
    AminRender.renderResponsiveTable($('#overview-low'), DATA.items.filter(i => AminCore.num(i.current_quantity) <= AminCore.num(i.min_quantity)).slice(0, 8), [
      { key: 'name', title: 'الصنف' },
      { key: 'current_quantity', title: 'الكمية' },
      { key: 'min_quantity', title: 'الحد الأدنى' }
    ], { primaryFields: ['name', 'current_quantity'], mobileExpandable: ['min_quantity'] });
  }

  function renderItems(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الأصناف</h1></div>
      <div id="items-table"></div>
    `;
    AminRender.renderResponsiveTable($('#items-table'), DATA.items, [
      { key: 'name', title: 'الصنف' },
      { key: 'category', title: 'التصنيف' },
      { key: 'current_quantity', title: 'الكمية' },
      { key: 'unit', title: 'الوحدة' }
    ], {
      primaryFields: ['name', 'current_quantity'],
      mobileExpandable: ['category', 'unit'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'حركة';
        return btn;
      }
    });
  }

  function renderMovements(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>حركات المخزون</h1></div>
      <div id="movements-table"></div>
    `;
    AminRender.renderResponsiveTable($('#movements-table'), DATA.movements, [
      { key: 'item_id', title: 'الصنف' },
      { key: 'type', title: 'نوع' },
      { key: 'quantity', title: 'الكمية' },
      { key: 'created_at', title: 'التاريخ' }
    ], {
      primaryFields: ['item_id', 'quantity'],
      mobileExpandable: ['type', 'created_at'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'تفاصيل';
        return btn;
      }
    });
  }

  function renderSuppliers(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الموردون</h1></div>
      <div id="suppliers-table"></div>
    `;
    AminRender.renderResponsiveTable($('#suppliers-table'), DATA.suppliers, [
      { key: 'name', title: 'المورد' },
      { key: 'phone', title: 'الهاتف' },
      { key: 'email', title: 'البريد' }
    ], {
      primaryFields: ['name', 'phone'],
      mobileExpandable: ['email']
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.InventoryApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
