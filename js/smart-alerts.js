/* Smart Alerts — التنبيهات الذكية */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let ALERTS = [];
  let RULES = [];
  let FILTER = 'all';

  const STATUS_LABELS = { open: 'مفتوح', acknowledged: 'مُقرّ', resolved: 'محلول', dismissed: 'متجاهل' };
  const SEVERITY_LABELS = { low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await Promise.all([loadAlerts(), loadRules()]);
    render();
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='notifications.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.bell || ''}</span>
        <span class="sidebar-nav-label">الإشعارات</span>
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
      <button class="bottom-nav-item active" onclick="SmartAlertsApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.alert || ''}</span>
        <span>التنبيهات</span>
      </button>
    `;
  }

  async function loadAlerts() {
    try {
      ALERTS = await AminCore.q('smart_alerts', {
        order: 'created_at', ascending: false, limit: 200
      });
    } catch (e) { ALERTS = []; }
  }

  async function loadRules() {
    try {
      RULES = await AminCore.q('smart_alert_rules', {
        order: 'created_at', ascending: true, limit: 100
      });
    } catch (e) { RULES = []; }
  }

  function setFilter(filter) {
    FILTER = filter;
    $('#filterAll').classList.toggle('active', filter === 'all');
    $('#filterOpen').classList.toggle('active', filter === 'open');
    $('#filterResolved').classList.toggle('active', filter === 'resolved');
    renderAlerts();
  }

  function filteredAlerts() {
    if (FILTER === 'open') return ALERTS.filter(a => a.status === 'open');
    if (FILTER === 'resolved') return ALERTS.filter(a => a.status === 'resolved' || a.status === 'dismissed');
    return ALERTS;
  }

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleString('ar-IQ', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return d; }
  }

  function render() {
    renderKpis();
    renderAlerts();
    renderRules();
  }

  function renderKpis() {
    $('#kpiOpen').textContent = ALERTS.filter(a => a.status === 'open').length;
    $('#kpiMedium').textContent = ALERTS.filter(a => a.severity === 'medium' && a.status === 'open').length;
    $('#kpiHigh').textContent = ALERTS.filter(a => a.severity === 'high' && a.status === 'open').length;
  }

  function renderAlerts() {
    const list = $('#alerts-list');
    if (!list) return;
    const items = filteredAlerts();
    if (items.length === 0) {
      list.innerHTML = '<div class="amin-card" style="text-align:center;padding:var(--space-8);color:var(--text-secondary);">لا توجد تنبيهات</div>';
      return;
    }
    list.innerHTML = '<div class="amin-grid amin-grid-2">' + items.map(a => `
      <div class="amin-alert-card severity-${esc(a.severity)}">
        <div class="amin-alert-header">
          <div class="amin-alert-title"><span class="severity-dot ${esc(a.severity)}"></span>${esc(a.title)}</div>
          <span class="amin-badge ${a.status === 'open' ? 'amin-badge-danger' : a.status === 'resolved' ? 'amin-badge-success' : 'amin-badge-neutral'}">${STATUS_LABELS[a.status] || a.status}</span>
        </div>
        ${a.body ? `<div class="amin-alert-body">${esc(a.body)}</div>` : ''}
        <div class="amin-alert-meta">
          <span>${formatDate(a.created_at)}</span>
          <span>${SEVERITY_LABELS[a.severity] || a.severity}</span>
        </div>
        <div class="amin-alert-actions">
          ${a.status === 'open' ? `<button class="amin-btn amin-btn-sm amin-btn-primary" onclick="SmartAlertsApp.resolve('${esc(a.id)}')">حل</button>` : ''}
          ${a.status === 'open' ? `<button class="amin-btn amin-btn-sm amin-btn-ghost" onclick="SmartAlertsApp.acknowledge('${esc(a.id)}')">إقرار</button>` : ''}
          <button class="amin-btn amin-btn-sm amin-btn-ghost" onclick="SmartAlertsApp.dismiss('${esc(a.id)}')">تجاهل</button>
        </div>
      </div>
    `).join('') + '</div>';
  }

  function renderRules() {
    const list = $('#rules-list');
    if (!list) return;
    if (RULES.length === 0) {
      list.innerHTML = '<div class="amin-card" style="text-align:center;padding:var(--space-6);color:var(--text-secondary);">لا توجد قواعد مفعلة</div>';
      return;
    }
    list.innerHTML = '<div class="amin-grid">' + RULES.map(r => `
      <div class="amin-alert-rule">
        <div>
          <div style="font-weight:700;color:var(--text-primary);">${esc(r.name)}</div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-1);">${esc(r.description || '')}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">النوع: ${esc(r.entity_type)} · الخطورة: ${SEVERITY_LABELS[r.severity] || r.severity}</div>
        </div>
        <span class="amin-rule-status ${r.is_active ? 'active' : 'paused'}">${r.is_active ? 'نشط' : 'موقوف'}</span>
      </div>
    `).join('') + '</div>';
  }

  async function updateStatus(id, status) {
    try {
      const updates = { status };
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
      if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
      const { error } = await AminCore.client().from('smart_alerts').update(updates).eq('id', id);
      if (error) throw error;
      const a = ALERTS.find(x => x.id === id);
      if (a) Object.assign(a, updates);
      render();
      toast('تم', `تم تحديث حالة التنبيه إلى ${STATUS_LABELS[status] || status}`, 'success');
    } catch (e) {
      toast('خطأ', e.message || 'تعذر تحديث التنبيه', 'error');
    }
  }

  function resolve(id) { updateStatus(id, 'resolved'); }
  function acknowledge(id) { updateStatus(id, 'acknowledged'); }
  function dismiss(id) { if (confirm('تجاهل هذا التنبيه؟')) updateStatus(id, 'dismissed'); }

  async function refresh() {
    await Promise.all([loadAlerts(), loadRules()]);
    render();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.SmartAlertsApp = { init, setFilter, resolve, acknowledge, dismiss, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
