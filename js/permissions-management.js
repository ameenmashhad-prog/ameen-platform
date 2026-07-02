/* Permissions Management — إدارة الصلاحيات */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let DATA = { users: [], extraPermissions: [] };
  const ROLES = ['admin','super_admin','finance','academic','teacher','student','parent','counselor','discipline','psychologist'];

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await loadData();
    populateSelects();
    renderUsers();
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='super-admin.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.settings || ''}</span>
        <span class="sidebar-nav-label">الإدارة</span>
      </button>
    `;
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="bottom-nav-item" onclick="location.href='../portal.html'">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.home || ''}</span>
        <span>البوابة</span>
      </button>
      <button class="bottom-nav-item active" onclick="PermissionsApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.settings || ''}</span>
        <span>الإعدادات</span>
      </button>
    `;
  }

  async function loadData() {
    const [users, extraPermissions] = await Promise.all([
      AminCore.q('users', { order: 'name', ascending: true, limit: 500 }).catch(() => []),
      AminCore.q('user_extra_permissions', { limit: 1000 }).catch(() => [])
    ]);
    DATA = { users, extraPermissions };
  }

  function populateSelects() {
    const fillUser = (sel) => {
      sel.innerHTML = `<option value="">اختر المستخدم...</option>` + DATA.users.map(u => `<option value="${esc(u.id)}">${esc(u.name || u.email || '—')}</option>`).join('');
    };
    fillUser($('#userSelect'));
    fillUser($('#moduleUserSelect'));

    $('#roleSelect').innerHTML = ROLES.map(r => `<option value="${esc(r)}">${esc(AminCore.roleLabel(r))}</option>`).join('');

    $('#moduleSelect').innerHTML = `<option value="">اختر الوحدة...</option>` + AminPlatform.modules.map(m => `<option value="${esc(m.key)}">${esc(AminPlatform.text(m.title, m.key))}</option>`).join('');
  }

  function renderUsers() {
    const table = $('#users-table');
    if (!table) return;
    table.innerHTML = '<div class="section-page-head"><h2>المستخدمون</h2></div><div id="users-list"></div>';
    AminRender.renderResponsiveTable($('#users-list'), DATA.users, [
      { key: 'name', title: 'الاسم' },
      { key: 'email', title: 'البريد' },
      { key: 'role', title: 'الدور' },
      { key: 'is_super_admin', title: 'مسؤول أعلى' }
    ], {
      primaryFields: ['name', 'role'],
      mobileExpandable: ['email', 'is_super_admin'],
      rowActions: (row) => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.gap = 'var(--space-2)';
        const toggle = document.createElement('button');
        toggle.className = 'amin-btn amin-btn-sm amin-btn-ghost';
        toggle.textContent = row.is_super_admin ? 'إلغاء أعلى' : 'تعيين أعلى';
        toggle.onclick = () => PermissionsApp.toggleSuper(row.id, !row.is_super_admin);
        wrap.appendChild(toggle);
        return wrap;
      }
    });
  }

  async function updateRole(ev) {
    ev.preventDefault();
    const userId = $('#userSelect').value;
    const role = $('#roleSelect').value;
    try {
      const { error } = await AminCore.client().from('users').update({ role }).eq('id', userId);
      if (error) throw error;
      toast('تم', 'تم تحديث الدور', 'success');
      $('#roleForm').reset();
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل التحديث', 'error');
    }
  }

  async function toggleSuper(userId, value) {
    try {
      const { error } = await AminCore.client().from('users').update({ is_super_admin: value }).eq('id', userId);
      if (error) throw error;
      toast('تم', 'تم تحديث حالة المسؤول', 'success');
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل التحديث', 'error');
    }
  }

  async function addModulePermission(ev) {
    ev.preventDefault();
    const payload = {
      user_id: $('#moduleUserSelect').value,
      module_key: $('#moduleSelect').value,
      can_read: true,
      can_write: $('#moduleWrite').checked
    };
    try {
      const { error } = await AminCore.client().from('user_extra_permissions').upsert(payload, { onConflict: 'user_id,module_key' });
      if (error) throw error;
      toast('تم', 'تمت إضافة الصلاحية', 'success');
      $('#moduleForm').reset();
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل إضافة الصلاحية', 'error');
    }
  }

  async function refresh() {
    await loadData();
    populateSelects();
    renderUsers();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.PermissionsApp = { init, updateRole, toggleSuper, addModulePermission, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
