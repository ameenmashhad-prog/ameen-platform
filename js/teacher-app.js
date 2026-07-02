/* Teacher Portal — بوابة المعلم */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let DATA = { students: [], schedule: [], subjects: [], classes: [], attendance: [], grades: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الرئيسية', icon: 'home' },
    schedule: { title: 'جدولي', icon: 'calendar' },
    students: { title: 'طلابي', icon: 'users' },
    attendance: { title: 'الحضور', icon: 'academic' },
    grades: { title: 'الدرجات', icon: 'reports' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'معلم';
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
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="TeacherApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'schedule', 'students', 'attendance', 'grades'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="TeacherApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const c = AminCore.client();
    const [schedule, classes, subjects, students] = await Promise.all([
      AminCore.q('weekly_schedule', { filters: [{ op: 'eq', col: 'teacher_id', val: ME.id }], order: 'day', ascending: true, limit: 200 }),
      AminCore.q('classes'),
      AminCore.q('subjects'),
      AminCore.q('students')
    ]);

    const classIds = [...new Set(schedule.map(s => String(s.class_id)).filter(Boolean))];
    const myStudents = students.filter(s => classIds.includes(String(s.class_id)));

    const studentIds = myStudents.map(s => s.id);
    const [attendance, grades] = await Promise.all([
      AminCore.q('attendance', { filters: [{ op: 'in', col: 'student_id', val: studentIds }], order: 'date', ascending: false, limit: 200 }).catch(() => []),
      AminCore.q('grades', { filters: [{ op: 'in', col: 'student_id', val: studentIds }], limit: 200 }).catch(() => [])
    ]);

    DATA = { schedule, classes, subjects, students: myStudents, attendance, grades };
  }

  function className(id) {
    const c = DATA.classes.find(x => String(x.id) === String(id));
    return c ? c.name : '—';
  }
  function subjectName(id) {
    const s = DATA.subjects.find(x => String(x.id) === String(id));
    return s ? s.name : '—';
  }
  function studentName(id) {
    const s = DATA.students.find(x => String(x.id) === String(id));
    return s ? (s.name || s.email || '—') : '—';
  }
  function dayName(d) {
    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return days[AminCore.num(d) - 1] || d || '—';
  }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.teacher-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'schedule': renderSchedule(container); break;
        case 'students': renderStudents(container); break;
        case 'attendance': renderAttendance(container); break;
        case 'grades': renderGrades(container); break;
      }
    }
  }

  function renderOverview(container) {
    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = DATA.schedule.filter(s => s.day === new Date().getDay() + 1 || s.day_name === 'اليوم').length;
    const todayAtt = DATA.attendance.filter(a => String(a.date).slice(0, 10) === today);
    const todayStudents = new Set(todayAtt.map(a => a.student_id)).size;

    container.innerHTML = `
      <div class="section-page-head"><h1>أهلاً بك، ${AminCore.esc(ME.name)}</h1><p>ملخص يومك وطلابك</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">طلابي</div><div class="amin-kpi-value">${DATA.students.length}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">حصصي الأسبوعية</div><div class="amin-kpi-value">${DATA.schedule.length}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">حصص اليوم</div><div class="amin-kpi-value">${todaySessions}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">تحضير اليوم</div><div class="amin-kpi-value">${todayStudents}/${DATA.students.length}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">جدولي اليوم</div></div><div id="overview-schedule"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">مهام سريعة</div></div><div id="overview-tasks"></div></div>
      </div>
    `;

    const todaySchedule = DATA.schedule.filter(s => s.day === new Date().getDay() + 1);
    AminRender.renderTimeline($('#overview-schedule'), todaySchedule.map(s => ({
      id: s.id, label: subjectName(s.subject_id) + ' · ' + className(s.class_id),
      date: 'الحصة ' + (s.period_number || s.period_no || '—'),
      status: 'upcoming'
    })));

    AminRender.renderTaskList($('#overview-tasks'), [
      { id: 1, title: 'تحضير طلاب اليوم', due_date: 'اليوم', priority: 'urgent', done: false },
      { id: 2, title: 'تصحيح واجب', due_date: 'غداً', priority: 'normal', done: false }
    ]);
  }

  function renderSchedule(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>جدولي الأسبوعي</h1></div>
      <div id="schedule-table"></div>
    `;
    AminRender.renderResponsiveTable($('#schedule-table'), DATA.schedule, [
      { key: 'day', title: 'اليوم' },
      { key: 'period_number', title: 'الحصة' },
      { key: 'class_id', title: 'الصف' },
      { key: 'subject_id', title: 'المادة' }
    ], {
      primaryFields: ['day', 'subject_id'],
      mobileExpandable: ['period_number', 'class_id'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'فتح';
        return btn;
      }
    });
  }

  function renderStudents(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>طلابي</h1></div>
      <div id="students-table"></div>
    `;
    AminRender.renderResponsiveTable($('#students-table'), DATA.students, [
      { key: 'name', title: 'الاسم' },
      { key: 'class_id', title: 'الصف' },
      { key: 'gender', title: 'الجنس' },
      { key: 'email', title: 'البريد' }
    ], {
      primaryFields: ['name', 'class_id'],
      mobileExpandable: ['gender', 'email'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'عرض';
        return btn;
      }
    });
  }

  function renderAttendance(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>تحضير الطلاب</h1></div>
      <div class="amin-filter-bar" style="margin-bottom:var(--space-5);">
        <div class="filter-field">
          <label>التاريخ</label>
          <input type="date" id="attDate" class="amin-input" value="${AminCore.iso()}">
        </div>
      </div>
      <div id="attendance-table"></div>
    `;

    const date = AminCore.iso();
    const rows = DATA.students.map(s => {
      const rec = DATA.attendance.find(a => String(a.student_id) === String(s.id) && String(a.date).slice(0, 10) === date);
      return { student_id: s.id, name: studentName(s.id), class_id: className(s.class_id), status: rec ? rec.status : '—' };
    });
    AminRender.renderResponsiveTable($('#attendance-table'), rows, [
      { key: 'name', title: 'الطالب' },
      { key: 'class_id', title: 'الصف' },
      { key: 'status', title: 'الحالة' }
    ], {
      primaryFields: ['name', 'status'],
      mobileExpandable: ['class_id']
    });
  }

  function renderGrades(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>درجات الطلاب</h1></div>
      <div id="grades-table"></div>
    `;
    AminRender.renderResponsiveTable($('#grades-table'), DATA.grades, [
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

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.TeacherApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
