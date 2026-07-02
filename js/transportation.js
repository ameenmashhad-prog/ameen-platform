/* Transportation Portal — النقل المدرسي */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { vehicles: [], routes: [], drivers: [], trips: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'transport' },
    vehicles: { title: 'المركبات', icon: 'transport' },
    routes: { title: 'المسارات', icon: 'calendar' },
    trips: { title: 'الرحلات', icon: 'users' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!['admin', 'transport', 'super_admin'].includes(ME.role) && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للنقل', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'النقل';
    $('#userAvatar').textContent = (ME.name || 'ن').charAt(0);
    buildSidebar();
    buildBottomNav();
    await loadData();
    showView('overview');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="TransportApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'vehicles', 'routes', 'trips'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="TransportApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [vehicles, routes, drivers, trips] = await Promise.all([
      AminCore.q('vehicles', { order: 'plate_number', limit: 100 }).catch(() => []),
      AminCore.q('routes', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('drivers', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('transport_trips', { order: 'trip_date', ascending: false, limit: 100 }).catch(() => [])
    ]);
    DATA = { vehicles, routes, drivers, trips };
  }

  function driverName(id) { const d = DATA.drivers.find(x => String(x.id) === String(id)); return d ? d.name : '—'; }
  function routeName(id) { const r = DATA.routes.find(x => String(x.id) === String(id)); return r ? r.name : '—'; }
  function vehiclePlate(id) { const v = DATA.vehicles.find(x => String(x.id) === String(id)); return v ? v.plate_number : '—'; }
  function todayTrips() { return DATA.trips.filter(t => String(t.trip_date).slice(0, 10) === AminCore.iso()).length; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.transport-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'vehicles': renderVehicles(container); break;
        case 'routes': renderRoutes(container); break;
        case 'trips': renderTrips(container); break;
      }
    }
  }

  function renderOverview(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>النقل المدرسي</h1><p>ملخص المركبات والمسارات والرحلات</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">المركبات</div><div class="amin-kpi-value">${AminCore.ar(DATA.vehicles.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المسارات</div><div class="amin-kpi-value">${AminCore.ar(DATA.routes.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">السائقون</div><div class="amin-kpi-value">${AminCore.ar(DATA.drivers.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">رحلات اليوم</div><div class="amin-kpi-value">${AminCore.ar(todayTrips())}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الرحلات</div></div><div id="overview-trips"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">مركبات تتطلب صيانة</div></div><div id="overview-maintenance"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-trips'), DATA.trips.slice(0, 8), [
      { key: 'vehicle_id', title: 'المركبة' },
      { key: 'route_id', title: 'المسار' },
      { key: 'trip_date', title: 'التاريخ' }
    ], { primaryFields: ['vehicle_id', 'trip_date'], mobileExpandable: ['route_id'] });
    AminRender.renderResponsiveTable($('#overview-maintenance'), DATA.vehicles.filter(v => v.maintenance_due && v.maintenance_due <= AminCore.iso()).slice(0, 8), [
      { key: 'plate_number', title: 'اللوحة' },
      { key: 'model', title: 'الموديل' },
      { key: 'maintenance_due', title: 'الصيانة القادمة' }
    ], { primaryFields: ['plate_number', 'maintenance_due'], mobileExpandable: ['model'] });
  }

  function renderVehicles(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>المركبات</h1></div>
      <div id="vehicles-table"></div>
    `;
    AminRender.renderResponsiveTable($('#vehicles-table'), DATA.vehicles, [
      { key: 'plate_number', title: 'اللوحة' },
      { key: 'model', title: 'الموديل' },
      { key: 'capacity', title: 'السعة' },
      { key: 'maintenance_due', title: 'الصيانة' }
    ], {
      primaryFields: ['plate_number', 'capacity'],
      mobileExpandable: ['model', 'maintenance_due'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'تفاصيل';
        return btn;
      }
    });
  }

  function renderRoutes(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>المسارات</h1></div>
      <div id="routes-table"></div>
    `;
    AminRender.renderResponsiveTable($('#routes-table'), DATA.routes, [
      { key: 'name', title: 'المسار' },
      { key: 'start_point', title: 'نقطة البداية' },
      { key: 'end_point', title: 'نقطة النهاية' },
      { key: 'stops_count', title: 'النقاط' }
    ], {
      primaryFields: ['name', 'stops_count'],
      mobileExpandable: ['start_point', 'end_point']
    });
  }

  function renderTrips(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الرحلات</h1></div>
      <div id="trips-table"></div>
    `;
    AminRender.renderResponsiveTable($('#trips-table'), DATA.trips, [
      { key: 'vehicle_id', title: 'المركبة' },
      { key: 'route_id', title: 'المسار' },
      { key: 'trip_date', title: 'التاريخ' },
      { key: 'passenger_count', title: 'الركاب' }
    ], {
      primaryFields: ['vehicle_id', 'trip_date'],
      mobileExpandable: ['route_id', 'passenger_count'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'حضور';
        return btn;
      }
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.TransportApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
