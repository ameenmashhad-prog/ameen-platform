/* Calendar — التقويم المدرسي */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let EVENTS = [];
  let CURRENT = new Date();
  const DAY_NAMES = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await loadEvents();
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
      <button class="bottom-nav-item active" onclick="CalendarApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.calendar || ''}</span>
        <span>التقويم</span>
      </button>
    `;
  }

  async function loadEvents() {
    try {
      EVENTS = await AminCore.q('calendar_events', {
        order: 'event_date', ascending: true, limit: 500
      });
    } catch (e) {
      EVENTS = [];
    }
  }

  function prevMonth() { CURRENT.setMonth(CURRENT.getMonth() - 1); render(); }
  function nextMonth() { CURRENT.setMonth(CURRENT.getMonth() + 1); render(); }
  function today() { CURRENT = new Date(); render(); }

  function render() {
    $('#calendarTitle').textContent = `${MONTH_NAMES[CURRENT.getMonth()]} ${CURRENT.getFullYear()}`;
    const grid = $('#calendarGrid');
    if (!grid) return;

    const year = CURRENT.getFullYear();
    const month = CURRENT.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    let html = '<div class="amin-calendar-grid">';
    DAY_NAMES.forEach(d => { html += `<div class="amin-calendar-day-header">${d}</div>`; });

    for (let i = 0; i < firstDay; i++) {
      const day = prevDays - firstDay + i + 1;
      html += `<div class="amin-calendar-day other-month"><span class="amin-calendar-day-number">${day}</span></div>`;
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const dayEvents = EVENTS.filter(e => e.event_date === dateStr);
      html += `<div class="amin-calendar-day ${isToday ? 'today' : ''}">
        <span class="amin-calendar-day-number">${d}</span>
        ${dayEvents.map(e => `<div class="amin-calendar-event ${esc(e.event_type)}" title="${esc(e.title)}">${esc(e.title)}</div>`).join('')}
      </div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const nextMonthDays = 42 - totalCells;
    for (let d = 1; d <= nextMonthDays; d++) {
      html += `<div class="amin-calendar-day other-month"><span class="amin-calendar-day-number">${d}</span></div>`;
    }

    html += '</div>';
    grid.innerHTML = html;
  }

  async function refresh() {
    await loadEvents();
    render();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.CalendarApp = { init, prevMonth, nextMonth, today, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
