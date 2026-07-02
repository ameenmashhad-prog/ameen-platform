/* Academic Pro — النظام الأكاديمي */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { students: [], grades: [], subjects: [], classes: [], schedule: [], exams: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الملخص', icon: 'academic' },
    grades: { title: 'الدرجات', icon: 'reports' },
    schedule: { title: 'الجدول', icon: 'calendar' },
    exams: { title: 'الاختبارات', icon: 'forms' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    if (!['admin', 'academic', 'teacher', 'super_admin'].includes(ME.role) && !ME.is_super_admin) {
      AminCore.toast('غير مصرح', 'هذه الصفحة للأكاديمي فقط', 'error');
      AminCore.logout();
      return;
    }
    $('#userName').textContent = ME.name || ME.email || 'مسؤول أكاديمي';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="AcademicApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'grades', 'schedule', 'exams'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="AcademicApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [students, grades, subjects, classes, schedule, exams] = await Promise.all([
      AminCore.q('students', { order: 'name', limit: 200 }).catch(() => []),
      AminCore.q('grades', { limit: 500 }).catch(() => []),
      AminCore.q('subjects', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('classes', { order: 'name', limit: 100 }).catch(() => []),
      AminCore.q('weekly_schedule', { order: 'day', ascending: true, limit: 300 }).catch(() => []),
      AminCore.q('online_exams', { order: 'starts_at', ascending: true, limit: 50 }).catch(() => [])
    ]);
    DATA = { students, grades, subjects, classes, schedule, exams };
  }

  function studentName(id) { const s = DATA.students.find(x => String(x.id) === String(id)); return s ? (s.name || '—') : '—'; }
  function subjectName(id) { const s = DATA.subjects.find(x => String(x.id) === String(id)); return s ? s.name : '—'; }
  function className(id) { const c = DATA.classes.find(x => String(x.id) === String(id)); return c ? c.name : '—'; }
  function dayName(d) { const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']; return days[AminCore.num(d) - 1] || d || '—'; }
  function gradeAverage() { return DATA.grades.length ? Math.round(DATA.grades.reduce((s, g) => s + AminCore.num(g.score || g.grade || g.mark), 0) / DATA.grades.length) : 0; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.academic-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'grades': renderGrades(container); break;
        case 'schedule': renderSchedule(container); break;
        case 'exams': renderExams(container); break;
      }
    }
  }

  function renderOverview(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>النظام الأكاديمي</h1><p>ملخص الدرجات والجداول والاختبارات</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">الطلاب</div><div class="amin-kpi-value">${AminCore.ar(DATA.students.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المعدل العام</div><div class="amin-kpi-value">${gradeAverage()}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المواد</div><div class="amin-kpi-value">${AminCore.ar(DATA.subjects.length)}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">حصص الجدول</div><div class="amin-kpi-value">${AminCore.ar(DATA.schedule.length)}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">آخر الدرجات</div></div><div id="overview-grades"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">جدول اليوم</div></div><div id="overview-schedule"></div></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#overview-grades'), DATA.grades.slice(0, 8), [
      { key: 'student_id', title: 'الطالب' },
      { key: 'subject_id', title: 'المادة' },
      { key: 'score', title: 'الدرجة' }
    ], { primaryFields: ['student_id', 'score'], mobileExpandable: ['subject_id'] });

    const today = new Date().getDay() + 1;
    const todaySchedule = DATA.schedule.filter(s => s.day === today).map(s => ({
      id: s.id, label: subjectName(s.subject_id) + ' · ' + className(s.class_id),
      date: 'الحصة ' + (s.period_number || s.period_no || '—'),
      status: 'upcoming'
    }));
    AminRender.renderTimeline($('#overview-schedule'), todaySchedule);
  }

  function renderGrades(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>إدارة الدرجات</h1></div>
      <div class="amin-filter-bar" style="margin-bottom:var(--space-5);">
        <div class="filter-field"><label>الصف</label><select class="amin-select" id="gradeClassFilter"><option value="">كل الصفوف</option>${DATA.classes.map(c => `<option value="${c.id}">${AminCore.esc(c.name)}</option>`).join('')}</select></div>
        <div class="filter-field"><label>المادة</label><select class="amin-select" id="gradeSubjectFilter"><option value="">كل المواد</option>${DATA.subjects.map(s => `<option value="${s.id}">${AminCore.esc(s.name)}</option>`).join('')}</select></div>
      </div>
      <div id="grades-table"></div>
    `;
    renderGradesTable();
    $('#gradeClassFilter')?.addEventListener('change', renderGradesTable);
    $('#gradeSubjectFilter')?.addEventListener('change', renderGradesTable);
  }

  function renderGradesTable() {
    const classFilter = $('#gradeClassFilter')?.value;
    const subjectFilter = $('#gradeSubjectFilter')?.value;
    let rows = DATA.grades;
    if (classFilter) rows = rows.filter(g => DATA.students.find(s => String(s.id) === String(g.student_id) && String(s.class_id) === classFilter));
    if (subjectFilter) rows = rows.filter(g => String(g.subject_id) === subjectFilter);
    rows = rows.slice(0, 100);
    AminRender.renderResponsiveTable($('#grades-table'), rows, [
      { key: 'student_id', title: 'الطالب' },
      { key: 'subject_id', title: 'المادة' },
      { key: 'score', title: 'الدرجة' },
      { key: 'notes', title: 'ملاحظة' }
    ], {
      primaryFields: ['student_id', 'score'],
      mobileExpandable: ['subject_id', 'notes'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'تعديل';
        return btn;
      }
    });
  }

  function renderSchedule(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الجدول الأسبوعي</h1></div>
      <div id="schedule-table"></div>
    `;
    AminRender.renderResponsiveTable($('#schedule-table'), DATA.schedule, [
      { key: 'day', title: 'اليوم' },
      { key: 'period_number', title: 'الحصة' },
      { key: 'class_id', title: 'الصف' },
      { key: 'subject_id', title: 'المادة' }
    ], {
      primaryFields: ['day', 'subject_id'],
      mobileExpandable: ['period_number', 'class_id']
    });
  }

  function renderExams(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>الاختبارات</h1></div>
      <div id="exams-table"></div>
    `;
    AminRender.renderResponsiveTable($('#exams-table'), DATA.exams, [
      { key: 'title', title: 'العنوان' },
      { key: 'subject_id', title: 'المادة' },
      { key: 'starts_at', title: 'التاريخ' },
      { key: 'duration_minutes', title: 'المدة' }
    ], {
      primaryFields: ['title', 'starts_at'],
      mobileExpandable: ['subject_id', 'duration_minutes'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'إدارة';
        return btn;
      }
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.AcademicApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
