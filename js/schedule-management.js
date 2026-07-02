/* Schedule Management — إدارة الجدول الأسبوعي */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let DATA = { classes: [], subjects: [], teachers: [], schedule: [] };
  let EDIT_ID = null;
  const DAY_NAMES = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const PERIODS = [1,2,3,4,5,6,7,8];

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
    renderGrid();
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='academic-pro.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.academic || ''}</span>
        <span class="sidebar-nav-label">الأكاديمي</span>
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
      <button class="bottom-nav-item active" onclick="ScheduleApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.calendar || ''}</span>
        <span>الجدول</span>
      </button>
    `;
  }

  async function loadData() {
    const [classes, subjects, teachers, schedule] = await Promise.all([
      AminCore.q('classes', { order: 'name', ascending: true, limit: 100 }).catch(() => []),
      AminCore.q('subjects', { order: 'name', ascending: true, limit: 100 }).catch(() => []),
      AminCore.q('users', { filters: [{ op: 'in', col: 'role', val: ['teacher','admin','super_admin'] }], order: 'name', ascending: true, limit: 200 }).catch(() => []),
      AminCore.q('weekly_schedule', { order: 'day', ascending: true, limit: 500 }).catch(() => [])
    ]);
    DATA = { classes, subjects, teachers, schedule };
  }

  function populateSelects() {
    const fill = (sel, items, labelKey) => {
      sel.innerHTML = `<option value="">اختر...</option>` + items.map(i => `<option value="${esc(i.id)}">${esc(i[labelKey] || i.name || i.email)}</option>`).join('');
    };
    fill($('#classSelect'), DATA.classes, 'name');
    fill($('#subjectSelect'), DATA.subjects, 'name');
    fill($('#teacherSelect'), DATA.teachers, 'name');

    const daySel = $('#daySelect');
    daySel.innerHTML = DAY_NAMES.map((d, i) => `<option value="${i + 1}">${d}</option>`).join('');
  }

  function renderGrid() {
    const grid = $('#scheduleGrid');
    if (!grid) return;
    let html = '<div class="schedule-grid">';
    html += '<div class="schedule-cell header">الحصة</div>';
    DAY_NAMES.forEach(d => { html += `<div class="schedule-cell header">${d}</div>`; });

    PERIODS.forEach(p => {
      html += `<div class="schedule-cell time">${p}</div>`;
      DAY_NAMES.forEach((d, i) => {
        const day = i + 1;
        const slots = DATA.schedule.filter(s => s.day === day && s.period_number === p);
        html += `<div class="schedule-cell" data-day="${day}" data-period="${p}">`;
        slots.forEach(s => {
          const cls = DATA.classes.find(c => String(c.id) === String(s.class_id));
          const sub = DATA.subjects.find(x => String(x.id) === String(s.subject_id));
          const t = DATA.teachers.find(x => String(x.id) === String(s.teacher_id));
          html += `<div class="schedule-slot" onclick="ScheduleApp.editSlot('${esc(s.id)}')">
            <div>${esc((cls?.name || ''))}</div>
            <div>${esc((sub?.name || ''))} · ${esc((t?.name || '').split(' ')[0])}</div>
          </div>`;
        });
        html += '</div>';
      });
    });
    html += '</div>';
    grid.innerHTML = html;
  }

  async function saveSlot(ev) {
    ev.preventDefault();
    const payload = {
      class_id: $('#classSelect').value,
      subject_id: $('#subjectSelect').value,
      teacher_id: $('#teacherSelect').value,
      day: Number($('#daySelect').value),
      day_name: DAY_NAMES[Number($('#daySelect').value) - 1],
      period_number: Number($('#periodInput').value),
      period_no: $('#periodNameInput').value || null
    };
    try {
      if (EDIT_ID) {
        const { error } = await AminCore.client().from('weekly_schedule').update(payload).eq('id', EDIT_ID);
        if (error) throw error;
        toast('تم', 'تم تحديث الحصة', 'success');
      } else {
        const { error } = await AminCore.client().from('weekly_schedule').insert(payload);
        if (error) throw error;
        toast('تم', 'تمت إضافة الحصة', 'success');
      }
      resetForm();
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل حفظ الحصة', 'error');
    }
  }

  function editSlot(id) {
    const s = DATA.schedule.find(x => x.id === id);
    if (!s) return;
    EDIT_ID = id;
    $('#classSelect').value = s.class_id || '';
    $('#subjectSelect').value = s.subject_id || '';
    $('#teacherSelect').value = s.teacher_id || '';
    $('#daySelect').value = String(s.day || 1);
    $('#periodInput').value = s.period_number || '';
    $('#periodNameInput').value = s.period_no || '';
  }

  function resetForm() {
    EDIT_ID = null;
    $('#scheduleForm').reset();
  }

  async function refresh() {
    await loadData();
    renderGrid();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.ScheduleApp = { init, saveSlot, editSlot, resetForm, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
