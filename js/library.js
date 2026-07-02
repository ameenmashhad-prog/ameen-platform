/* Library Portal — المكتبة */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { books: [], borrowings: [], members: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'links' },
    books: { title: 'الكتب', icon: 'forms' },
    borrowings: { title: 'الإعارات', icon: 'users' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!['admin', 'library', 'super_admin'].includes(ME.role) && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للمكتبة', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'المكتبة';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="LibraryApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'books', 'borrowings'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="LibraryApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [books, borrowings, members] = await Promise.all([
      AminCore.q('books', { order: 'title', limit: 300 }).catch(() => []),
      AminCore.q('borrowings', { order: 'borrowed_at', ascending: false, limit: 200 }).catch(() => []),
      AminCore.q('library_members', { order: 'name', limit: 200 }).catch(() => [])
    ]);
    DATA = { books, borrowings, members };
  }

  function memberName(id) { const m = DATA.members.find(x => String(x.id) === String(id)); return m ? m.name : '—'; }
  function bookTitle(id) { const b = DATA.books.find(x => String(x.id) === String(id)); return b ? b.title : '—'; }
  function overdueCount() { return DATA.borrowings.filter(b => b.returned_at === null && new Date(b.due_date) < new Date()).length; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.library-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'books': renderBooks(container); break;
        case 'borrowings': renderBorrowings(container); break;
      }
    }
  }

  function renderOverview(container) {
    const available = DATA.books.filter(b => b.available > 0).length;
    container.innerHTML = `
      <div class="section-page-head"><h1>المكتبة</h1><p>ملخص الكتب والإعارات</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">إجمالي الكتب</div><div class="amin-kpi-value">${AminCore.ar(DATA.books.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">متاح</div><div class="amin-kpi-value">${AminCore.ar(available)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">إعارات نشطة</div><div class="amin-kpi-value">${AminCore.ar(DATA.borrowings.filter(b => !b.returned_at).length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">متأخر</div><div class="amin-kpi-value">${AminCore.ar(overdueCount())}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الإعارات</div></div><div id="overview-borrowings"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">كتب نفدت</div></div><div id="overview-low-stock"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-borrowings'), DATA.borrowings.slice(0, 8), [
      { key: 'book_id', title: 'الكتاب' },
      { key: 'member_id', title: 'العضو' },
      { key: 'due_date', title: 'تاريخ الإرجاع' }
    ], { primaryFields: ['book_id', 'due_date'], mobileExpandable: ['member_id'] });
    AminRender.renderResponsiveTable($('#overview-low-stock'), DATA.books.filter(b => (b.available || 0) <= 2).slice(0, 8), [
      { key: 'title', title: 'العنوان' },
      { key: 'available', title: 'متاح' },
      { key: 'total', title: 'الإجمالي' }
    ], { primaryFields: ['title', 'available'], mobileExpandable: ['total'] });
  }

  function renderBooks(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>فهرس الكتب</h1></div>
      <div id="books-table"></div>
    `;
    AminRender.renderResponsiveTable($('#books-table'), DATA.books, [
      { key: 'title', title: 'العنوان' },
      { key: 'author', title: 'المؤلف' },
      { key: 'category', title: 'التصنيف' },
      { key: 'available', title: 'متاح' }
    ], {
      primaryFields: ['title', 'available'],
      mobileExpandable: ['author', 'category'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'إعارة';
        return btn;
      }
    });
  }

  function renderBorrowings(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>سجل الإعارات</h1></div>
      <div id="borrowings-table"></div>
    `;
    AminRender.renderResponsiveTable($('#borrowings-table'), DATA.borrowings, [
      { key: 'book_id', title: 'الكتاب' },
      { key: 'member_id', title: 'العضو' },
      { key: 'borrowed_at', title: 'تاريخ الإعارة' },
      { key: 'returned_at', title: 'تاريخ الإرجاع' }
    ], {
      primaryFields: ['book_id', 'member_id'],
      mobileExpandable: ['borrowed_at', 'returned_at'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm ' + (row.returned_at ? 'amin-btn-ghost' : 'amin-btn-primary');
        btn.textContent = row.returned_at ? 'تم' : 'إرجاع';
        return btn;
      }
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.LibraryApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
