/* Analytics Center — مركز التحليلات */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let DATA = { students: [], attendance: [], grades: [], subjects: [], classes: [], fees: [], installments: [] };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'مستخدم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await loadData();
    renderKpis();
    renderAttendanceChart();
    renderGradesChart();
    renderClassAttendance();
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
      <button class="bottom-nav-item active" onclick="AnalyticsApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.reports || ''}</span>
        <span>التحليلات</span>
      </button>
    `;
  }

  async function loadData() {
    const [students, attendance, grades, subjects, classes, fees, installments] = await Promise.all([
      AminCore.q('students', { limit: 1000 }).catch(() => []),
      AminCore.q('attendance', { limit: 1000 }).catch(() => []),
      AminCore.q('grades', { limit: 1000 }).catch(() => []),
      AminCore.q('subjects', { limit: 100 }).catch(() => []),
      AminCore.q('classes', { limit: 100 }).catch(() => []),
      AminCore.q('student_fees', { limit: 1000 }).catch(() => []),
      AminCore.q('student_installments', { limit: 1000 }).catch(() => [])
    ]);
    DATA = { students, attendance, grades, subjects, classes, fees, installments };
  }

  function subjectName(id) { const s = DATA.subjects.find(x => String(x.id) === String(id)); return s ? s.name : '—'; }
  function className(id) { const c = DATA.classes.find(x => String(x.id) === String(id)); return c ? c.name : '—'; }

  function renderKpis() {
    $('#kpiStudents').textContent = DATA.students.length;
    const present = DATA.attendance.filter(a => a.status === 'present').length;
    const total = DATA.attendance.length;
    $('#kpiAttendance').textContent = total ? Math.round((present / total) * 100) + '%' : '0%';
    const avg = DATA.grades.length ? Math.round(DATA.grades.reduce((s, g) => s + AminCore.num(g.score || g.mark), 0) / DATA.grades.length) : 0;
    $('#kpiAvgGrade').textContent = avg + '%';
    const today = new Date().toISOString().slice(0, 10);
    const overdue = DATA.installments.filter(i => !i.is_paid && i.due_date && i.due_date < today).length;
    $('#kpiOverdueFees').textContent = overdue;
  }

  function renderAttendanceChart() {
    const days = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
    const counts = days.map((d, i) => {
      const dayRecords = DATA.attendance.filter(a => a.day === i + 1 || (a.date && new Date(a.date).getDay() === i + 1 % 7));
      const present = dayRecords.filter(a => a.status === 'present').length;
      return { label: d, value: dayRecords.length ? Math.round((present / dayRecords.length) * 100) : 0 };
    });
    renderBarChart($('#attendanceChart'), counts, 'var(--primary)');
  }

  function renderGradesChart() {
    const bySubject = {};
    DATA.grades.forEach(g => {
      const sid = g.subject_id || 'unknown';
      if (!bySubject[sid]) bySubject[sid] = { sum: 0, count: 0 };
      bySubject[sid].sum += AminCore.num(g.score || g.mark);
      bySubject[sid].count += 1;
    });
    const data = Object.entries(bySubject).map(([sid, o]) => ({
      label: subjectName(sid),
      value: o.count ? Math.round(o.sum / o.count) : 0
    })).slice(0, 8);
    renderBarChart($('#gradesChart'), data, 'var(--secondary)');
  }

  function renderBarChart(container, data, color) {
    if (!container) return;
    container.innerHTML = '';
    if (data.length === 0) { container.innerHTML = '<div class="amin-text-muted" style="text-align:center;width:100%;">لا توجد بيانات</div>'; return; }
    const max = Math.max(...data.map(d => d.value), 1);
    data.forEach(d => {
      const bar = document.createElement('div');
      bar.className = 'amin-bar';
      bar.style.height = Math.max((d.value / max) * 100, 4) + '%';
      bar.style.background = color;
      bar.innerHTML = `<div class="amin-bar-value">${d.value}</div><div class="amin-bar-label">${esc(d.label)}</div>`;
      container.appendChild(bar);
    });
  }

  function renderClassAttendance() {
    const byClass = {};
    DATA.attendance.forEach(a => {
      const st = DATA.students.find(s => String(s.id) === String(a.student_id));
      const cid = st ? st.class_id : 'unknown';
      if (!byClass[cid]) byClass[cid] = { total: 0, present: 0 };
      byClass[cid].total += 1;
      if (a.status === 'present') byClass[cid].present += 1;
    });
    const rows = Object.entries(byClass).map(([cid, o]) => ({
      class_id: className(cid), rate: o.total ? Math.round((o.present / o.total) * 100) : 0, total: o.total, present: o.present
    })).sort((a, b) => b.rate - a.rate);

    AminRender.renderResponsiveTable($('#class-attendance-table'), rows, [
      { key: 'class_id', title: 'الصف' },
      { key: 'rate', title: 'نسبة الحضور' },
      { key: 'present', title: 'حاضر' },
      { key: 'total', title: 'الكلي' }
    ], {
      primaryFields: ['class_id', 'rate'],
      mobileExpandable: ['present', 'total']
    });
  }

  async function refresh() {
    await loadData();
    renderKpis();
    renderAttendanceChart();
    renderGradesChart();
    renderClassAttendance();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.AnalyticsApp = { init, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
