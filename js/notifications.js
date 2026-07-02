/* Notifications — نظام الإشعارات */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let NOTIFICATIONS = [];
  let FILTER = 'all';

  const VIEWS = {
    notifications: { title: 'الإشعارات', icon: 'bell' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await loadNotifications();
    render();
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item active" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='calendar.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.calendar || ''}</span>
        <span class="sidebar-nav-label">التقويم</span>
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
      <button class="bottom-nav-item active" onclick="NotificationsApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.bell || ''}</span>
        <span>الإشعارات</span>
      </button>
    `;
  }

  async function loadNotifications() {
    try {
      NOTIFICATIONS = await AminCore.q('school_notifications', {
        filters: [{ op: 'eq', col: 'recipient_user_id', val: ME.id }],
        order: 'created_at', ascending: false, limit: 100
      });
    } catch (e) {
      NOTIFICATIONS = [];
    }
  }

  function setFilter(filter) {
    FILTER = filter;
    $('#filterAll').classList.toggle('active', filter === 'all');
    $('#filterUnread').classList.toggle('active', filter === 'unread');
    render();
  }

  function filtered() {
    if (FILTER === 'unread') return NOTIFICATIONS.filter(n => !n.read_at);
    return NOTIFICATIONS;
  }

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleString('ar-IQ', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return d; }
  }

  function render() {
    const list = $('#notifications-list');
    if (!list) return;
    const items = filtered();
    if (items.length === 0) {
      list.innerHTML = '<div class="amin-card" style="text-align:center;padding:var(--space-8);color:var(--text-secondary);">لا توجد إشعارات</div>';
      return;
    }

    list.innerHTML = '<div class="amin-notification-list">' + items.map(n => `
      <div class="amin-notification ${n.read_at ? '' : 'unread'}" data-id="${esc(n.id)}">
        <div class="amin-notification-dot ${n.read_at ? 'read' : 'unread'}"></div>
        <div class="amin-notification-content">
          <div class="amin-notification-title">${esc(n.title)}</div>
          ${n.body ? `<div class="amin-notification-body">${esc(n.body)}</div>` : ''}
          <div class="amin-notification-meta">
            <span>${formatDate(n.created_at)}</span>
            ${n.read_at ? '<span class="amin-badge amin-badge-neutral">مقروء</span>' : '<span class="amin-badge amin-badge-info">جديد</span>'}
          </div>
        </div>
        <div class="amin-alert-actions">
          ${n.read_at ? '' : `<button class="amin-btn amin-btn-sm amin-btn-ghost" onclick="NotificationsApp.markRead('${esc(n.id)}')">تعليم مقروء</button>`}
          <button class="amin-btn amin-btn-sm amin-btn-ghost" onclick="NotificationsApp.delete('${esc(n.id)}')">حذف</button>
        </div>
      </div>
    `).join('') + '</div>';
  }

  async function markRead(id) {
    try {
      const { error } = await AminCore.client().from('school_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      const n = NOTIFICATIONS.find(x => x.id === id);
      if (n) n.read_at = new Date().toISOString();
      render();
      toast('تم', 'تعليم الإشعار مقروء', 'success');
    } catch (e) {
      toast('خطأ', e.message || 'تعذر تحديث الإشعار', 'error');
    }
  }

  async function deleteNotification(id) {
    if (!confirm('هل تريد حذف هذا الإشعار؟')) return;
    try {
      const { error } = await AminCore.client().from('school_notifications').delete().eq('id', id);
      if (error) throw error;
      NOTIFICATIONS = NOTIFICATIONS.filter(x => x.id !== id);
      render();
      toast('تم', 'تم حذف الإشعار', 'success');
    } catch (e) {
      toast('خطأ', e.message || 'تعذر حذف الإشعار', 'error');
    }
  }

  async function refresh() {
    await loadNotifications();
    render();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.NotificationsApp = {
    init, setFilter, markRead, delete: deleteNotification, refresh, toggleSidebar
  };
  document.addEventListener('DOMContentLoaded', init);
})(window);
