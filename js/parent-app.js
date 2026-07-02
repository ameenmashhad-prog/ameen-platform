/* Parent Portal — بوابة ولي الأمر */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let STUDENTS = [];
  let CURRENT_STUDENT_ID = null;
  let DATA = { attendance: [], grades: [], homeworks: [], exams: [], fees: [], subjects: {} };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'الرئيسية', icon: 'home' },
    grades: { title: 'الدرجات', icon: 'reports' },
    attendance: { title: 'الحضور', icon: 'academic' },
    homework: { title: 'الواجبات', icon: 'forms' },
    finance: { title: 'المالية', icon: 'finance' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'ولي أمر';
    $('#userAvatar').textContent = (ME.name || 'و').charAt(0);
    buildSidebar();
    buildBottomNav();
    await loadStudents();
    if (STUDENTS.length) {
      CURRENT_STUDENT_ID = STUDENTS[0].id;
      await loadData();
    }
    showView('overview');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="ParentApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'grades', 'homework', 'finance', 'attendance'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="ParentApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadStudents() {
    const res = await AminCore.client().from('students').select('*').eq('parent_id', ME.id);
    STUDENTS = res.data || [];
    const selector = $('#studentSelector');
    if (selector) {
      selector.innerHTML = STUDENTS.map(s => `<option value="${s.id}" ${s.id === CURRENT_STUDENT_ID ? 'selected' : ''}>${AminCore.esc(s.name)}</option>`).join('');
      selector.style.display = STUDENTS.length > 1 ? 'block' : 'none';
    }
  }

  async function loadData() {
    if (!CURRENT_STUDENT_ID) return;
    const c = AminCore.client();
    const sid = CURRENT_STUDENT_ID;
    const [attendance, grades, homeworks, exams, fees, subjects] = await Promise.all([
      AminCore.q('attendance', { filters: [{ op: 'eq', col: 'student_id', val: sid }], order: 'date', ascending: false, limit: 100 }).catch(() => []),
      AminCore.q('grades', { filters: [{ op: 'eq', col: 'student_id', val: sid }], limit: 100 }).catch(() => []),
      AminCore.q('v_student_homeworks', { order: 'due_date', ascending: true, limit: 50 }).catch(() => []),
      AminCore.q('online_exams', { order: 'starts_at', ascending: true, limit: 20 }).catch(() => []),
      AminCore.q('student_fees', { filters: [{ op: 'eq', col: 'student_id', val: sid }], limit: 10 }).catch(() => []),
      AminCore.q('subjects').then(list => { const m = {}; list.forEach(s => m[s.id] = s.name); return m; }).catch(() => ({}))
    ]);
    DATA = { attendance, grades, homeworks, exams, fees, subjects };
  }

  function subjectName(id) { return DATA.subjects[id] || 'مادة'; }
  function studentName() {
    const s = STUDENTS.find(x => String(x.id) === String(CURRENT_STUDENT_ID));
    return s ? s.name : '—';
  }
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
    $$('.parent-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
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
        case 'finance': renderFinance(container); break;
      }
    }
  }

  async function switchStudent(id) {
    CURRENT_STUDENT_ID = id;
    await loadData();
    showView(ACTIVE_VIEW);
  }

  function renderOverview(container) {
    if (!STUDENTS.length) {
      container.innerHTML = '<div class="amin-empty-state" style="padding:var(--space-8);text-align:center;"><h3 class="amin-empty-title">لا يوجد طلاب مرتبطون بهذا الحساب</h3></div>';
      return;
    }
    const present = DATA.attendance.filter(a => a.status === 'present').length;
    const total = DATA.attendance.length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    const avg = DATA.grades.length ? Math.round(DATA.grades.reduce((s, g) => s + AminCore.num(g.score || g.grade || g.mark), 0) / DATA.grades.length) : 0;
    const remaining = DATA.fees.reduce((s, f) => s + AminCore.num(f.net_amount || f.base_amount) - AminCore.num(f.total_paid), 0);

    container.innerHTML = `
      <div class="section-page-head">
        <div><h1>أهلاً بك، ${AminCore.esc(ME.name)}</h1><p>متابعة ${AminCore.esc(studentName())}</p></div>
        <select id="studentSelector" class="amin-select" style="max-width:200px;" onchange="ParentApp.switchStudent(this.value)"></select>
      </div>
      <div class="kpi-grid">
        <div class="amin-kpi"><div class="amin-kpi-label">نسبة الحضور</div><div class="amin-kpi-value">${rate}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المعدل العام</div><div class="amin-kpi-value">${avg}%</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">المستحقات</div><div class="amin-kpi-value">${AminCore.ar(remaining)}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">واجبات ${AminCore.esc(studentName())}</div></div><div id="overview-homework"></div></div>
        <div class="amin-card"><div class="amin-card-header"><div class="amin-card-title">الاختبارات القادمة</div></div><div id="overview-exams"></div></div>
      </div>
    `;

    const tasks = DATA.homeworks.slice(0, 5).map(h => ({
      id: h.id, title: h.title || h.homework_title || 'واجب',
      due_date: dueText(h.due_date || h.due_at) + ' · ' + subjectName(h.subject_id),
      priority: (dueText(h.due_date || h.due_at).includes('متأخر') || dueText(h.due_date || h.due_at) === 'اليوم') ? 'urgent' : 'normal',
      done: h.status === 'submitted'
    }));
    AminRender.renderTaskList($('#overview-homework'), tasks);

    const exams = DATA.exams.slice(0, 5).map(e => ({
      id: e.id, label: e.title || e.exam_title || 'اختبار',
      date: dueText(e.starts_at || e.start_at),
      status: new Date(e.starts_at || e.start_at) < new Date() ? 'done' : 'upcoming'
    }));
    AminRender.renderTimeline($('#overview-exams'), exams);

    const selector = $('#studentSelector');
    if (selector) {
      selector.innerHTML = STUDENTS.map(s => `<option value="${s.id}" ${s.id === CURRENT_STUDENT_ID ? 'selected' : ''}>${AminCore.esc(s.name)}</option>`).join('');
      selector.style.display = STUDENTS.length > 1 ? 'block' : 'none';
    }
  }

  function renderGrades(container) {
    container.innerHTML = `<div class="section-page-head"><h1>درجات ${AminCore.esc(studentName())}</h1></div><div id="grades-table"></div>`;
    AminRender.renderResponsiveTable($('#grades-table'), DATA.grades, [
      { key: 'subject_id', title: 'المادة' },
      { key: 'score', title: 'الدرجة' },
      { key: 'grade', title: 'التقدير' },
      { key: 'notes', title: 'ملاحظة' }
    ], {
      primaryFields: ['subject_id', 'score'],
      mobileExpandable: ['grade', 'notes']
    });
  }

  function renderAttendance(container) {
    container.innerHTML = `<div class="section-page-head"><h1>حضور ${AminCore.esc(studentName())}</h1></div><div id="attendance-table"></div>`;
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
    container.innerHTML = `<div class="section-page-head"><h1>واجبات ${AminCore.esc(studentName())}</h1></div><div id="homework-list"></div>`;
    const tasks = DATA.homeworks.map(h => ({
      id: h.id, title: h.title || h.homework_title || 'واجب',
      due_date: dueText(h.due_date || h.due_at) + ' · ' + subjectName(h.subject_id),
      priority: (dueText(h.due_date || h.due_at).includes('متأخر') || dueText(h.due_date || h.due_at) === 'اليوم') ? 'urgent' : 'normal',
      done: h.status === 'submitted'
    }));
    AminRender.renderTaskList($('#homework-list'), tasks);
  }

  function renderFinance(container) {
    container.innerHTML = `<div class="section-page-head"><h1>المالية — ${AminCore.esc(studentName())}</h1></div><div id="finance-table"></div>`;
    AminRender.renderResponsiveTable($('#finance-table'), DATA.fees, [
      { key: 'year_label', title: 'السنة' },
      { key: 'net_amount', title: 'المبلغ' },
      { key: 'total_paid', title: 'المدفوع' },
      { key: 'balance', title: 'المتبقي' }
    ], {
      primaryFields: ['year_label', 'balance'],
      mobileExpandable: ['net_amount', 'total_paid']
    });
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.ParentApp = { init, showView, toggleSidebar, switchStudent };
  document.addEventListener('DOMContentLoaded', init);
})(window);
