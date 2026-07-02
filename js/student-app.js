/* Student Portal — بوابة الطالب */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let STUDENT = null;
  let DATA = { attendance: [], grades: [], homeworks: [], exams: [], subjects: {}, notifications: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الرئيسية', icon: 'home' },
    grades: { title: 'درجاتي', icon: 'reports' },
    attendance: { title: 'حضوري', icon: 'academic' },
    homework: { title: 'واجباتي', icon: 'forms' },
    exams: { title: 'اختباراتي', icon: 'calendar' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'طالب';
    $('#userAvatar').textContent = (ME.name || 'ط').charAt(0);
    buildSidebar();
    buildBottomNav();
    await loadStudent();
    await loadData();
    showView('overview');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="StudentApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'grades', 'homework', 'exams', 'attendance'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="StudentApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadStudent() {
    const res = await AminCore.client().from('students').select('*').eq('user_id', ME.id).maybeSingle();
    if (res.error || !res.data) {
      toast('تعذر تحميل بيانات الطالب', 'يرجى مراجعة الإدارة', 'error');
      return;
    }
    STUDENT = res.data;
  }

  async function loadData() {
    if (!STUDENT) return;
    const c = AminCore.client();
    const sid = STUDENT.id;
    const [attendance, grades, homeworks, exams, subjects, notifications] = await Promise.all([
      AminCore.q('attendance', { filters: [{ op: 'eq', col: 'student_id', val: sid }], order: 'date', ascending: false, limit: 100 }),
      AminCore.q('grades', { filters: [{ op: 'eq', col: 'student_id', val: sid }] }),
      AminCore.q('v_student_homeworks', { order: 'due_date', ascending: true, limit: 50 }).catch(() => []),
      AminCore.q('online_exams', { order: 'starts_at', ascending: true, limit: 20 }).catch(() => []),
      AminCore.q('subjects').then(list => { const m = {}; list.forEach(s => m[s.id] = s.name); return m; }).catch(() => {}),
      AminCore.q('school_notifications', { filters: [{ op: 'eq', col: 'recipient_user_id', val: ME.id }], order: 'created_at', ascending: false, limit: 10 }).catch(() => [])
    ]);
    DATA = { attendance, grades, homeworks, exams, subjects, notifications };
  }

  function subjectName(id) { return DATA.subjects[id] || 'مادة'; }
  function dueText(d) {
    if (!d) return 'بدون موعد';
    const x = new Date(String(d).slice(0, 10) + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((x - today) / 86400000);
    if (diff < 0) return 'متأخر ' + Math.abs(diff) + ' يوم';
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'غداً';
    if (diff <= 7) return 'بعد ' + diff + ' يوم';
    return x.toLocaleDateString('ar-IQ');
  }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.student-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'grades': renderGrades(container); break;
        case 'attendance': renderAttendance(container); break;
        case 'homework': renderHomework(container); break;
        case 'exams': renderExams(container); break;
      }
    }
  }

  function renderOverview(container) {
    const present = DATA.attendance.filter(a => a.status === 'present').length;
    const total = DATA.attendance.length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    const avg = DATA.grades.length ? Math.round(DATA.grades.reduce((s, g) => s + AminCore.num(g.score || g.grade || g.mark), 0) / DATA.grades.length) : 0;
    const pending = DATA.homeworks.filter(h => h.status !== 'submitted').length;

    container.innerHTML = `
      <div class="section-page-head"><h1>أهلاً بك، ${esc(ME.name)}</h1><p>ملخص يومك الدراسي ومتابعة أدائك</p></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">نسبة الحضور</div><div class="amin-kpi-value">${rate}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المعدل العام</div><div class="amin-kpi-value">${avg}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">واجبات قريبة</div><div class="amin-kpi-value">${pending}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">أهم المهام</div></div><div id="overview-tasks"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">الاختبارات القادمة</div></div><div id="overview-exams"></div></div>
      </div>
    `;

    const tasks = DATA.homeworks.slice(0, 5).map(h => ({
      id: h.id, title: h.title || h.homework_title || 'واجب',
      due_date: dueText(h.due_date || h.due_at),
      priority: (dueText(h.due_date || h.due_at).includes('متأخر') || dueText(h.due_date || h.due_at) === 'اليوم') ? 'urgent' : 'normal',
      done: h.status === 'submitted'
    }));
    AminRender.renderTaskList($('#overview-tasks'), tasks);

    const exams = DATA.exams.slice(0, 5).map(e => ({
      id: e.id, label: e.title || e.exam_title || 'اختبار',
      date: dueText(e.starts_at || e.start_at),
      status: new Date(e.starts_at || e.start_at) < new Date() ? 'done' : 'upcoming'
    }));
    AminRender.renderTimeline($('#overview-exams'), exams);
  }

  function renderGrades(container) {
    const avg = DATA.grades.length ? Math.round(DATA.grades.reduce((s, g) => s + AminCore.num(g.score || g.grade || g.mark), 0) / DATA.grades.length) : 0;
    container.innerHTML = `
      <div class="section-page-head"><h1>درجاتي</h1></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">المعدل العام</div><div class="amin-kpi-value">${avg}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">عدد المواد</div><div class="amin-kpi-value">${DATA.grades.length}</div></div>
      </div>
      <div id="grades-table"></div>
    `;
    AminRender.renderResponsiveTable($('#grades-table'), DATA.grades, [
      { key: 'subject_id', title: 'المادة' },
      { key: 'score', title: 'الدرجة' },
      { key: 'grade', title: 'التقدير' },
      { key: 'notes', title: 'ملاحظة' }
    ], {
      primaryFields: ['subject_id', 'score'],
      mobileExpandable: ['grade', 'notes'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        btn.textContent = 'عرض';
        return btn;
      }
    });
  }

  function renderAttendance(container) {
    const present = DATA.attendance.filter(a => a.status === 'present').length;
    const absent = DATA.attendance.filter(a => a.status === 'absent').length;
    const late = DATA.attendance.filter(a => a.status === 'late').length;
    container.innerHTML = `
      <div class="section-page-head"><h1>حضوري</h1></div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">حاضر</div><div class="amin-kpi-value">${present}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">غائب</div><div class="amin-kpi-value">${absent}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">متأخر</div><div class="amin-kpi-value">${late}</div></div>
      </div>
      <div id="attendance-table"></div>
    `;
    AminRender.renderResponsiveTable($('#attendance-table'), DATA.attendance.slice(0, 60), [
      { key: 'date', title: 'التاريخ' },
      { key: 'status', title: 'الحالة' },
      { key: 'note', title: 'ملاحظة' }
    ], {
      primaryFields: ['date', 'status'],
      mobileExpandable: ['note']
    });
  }

  function renderHomework(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>واجباتي</h1></div>
      <div id="homework-list"></div>
    `;
    const tasks = DATA.homeworks.map(h => ({
      id: h.id, title: h.title || h.homework_title || 'واجب',
      due_date: dueText(h.due_date || h.due_at) + ' · ' + subjectName(h.subject_id),
      priority: (dueText(h.due_date || h.due_at).includes('متأخر') || dueText(h.due_date || h.due_at) === 'اليوم') ? 'urgent' : 'normal',
      done: h.status === 'submitted'
    }));
    AminRender.renderTaskList($('#homework-list'), tasks);
  }

  function renderExams(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>اختباراتي</h1></div>
      <div id="exams-timeline"></div>
    `;
    const exams = DATA.exams.map(e => ({
      id: e.id, label: e.title || e.exam_title || 'اختبار',
      date: dueText(e.starts_at || e.start_at),
      status: new Date(e.starts_at || e.start_at) < new Date() ? 'done' : 'upcoming'
    }));
    AminRender.renderTimeline($('#exams-timeline'), exams);
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.StudentApp = { init, showView, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
