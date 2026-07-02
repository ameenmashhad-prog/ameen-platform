/* Online Exams — الاختبارات الإلكترونية */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let STUDENT = null;
  let DATA = { exams: [], subjects: [], submissions: [] };
  let ACTIVE_VIEW = 'available';
  let CURRENT_EXAM = null;

  const VIEWS = {
    available: { title: 'متاح', icon: 'calendar' },
    active: { title: 'قيد التنفيذ', icon: 'forms' },
    history: { title: 'السجل', icon: 'reports' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'طالب';
    $('#userAvatar').textContent = (ME.name || 'ط').charAt(0);
    buildSidebar();
    buildBottomNav();
    const studentRes = await AminCore.client().from('students').select('*').eq('user_id', ME.id).maybeSingle();
    if (studentRes.data) STUDENT = studentRes.data;
    await loadData();
    showView('available');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="ExamsApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['available', 'active', 'history'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="ExamsApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [exams, subjects, submissions] = await Promise.all([
      AminCore.q('online_exams', { order: 'starts_at', ascending: true, limit: 50 }).catch(() => []),
      AminCore.q('subjects').then(list => { const m = {}; list.forEach(s => m[s.id] = s.name); return m; }).catch(() => ({})),
      AminCore.q('exam_submissions', { filters: STUDENT ? [{ op: 'eq', col: 'student_id', val: STUDENT.id }] : [], order: 'submitted_at', ascending: false, limit: 50 }).catch(() => [])
    ]);
    DATA = { exams, subjects, submissions };
  }

  function subjectName(id) { return DATA.subjects[id] || 'مادة'; }
  function dueText(d) {
    if (!d) return 'بدون موعد';
    const x = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((x - today) / 86400000);
    if (diff < 0) return 'انتهى';
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'غداً';
    return x.toLocaleDateString('ar-IQ');
  }
  function isSubmitted(examId) { return DATA.submissions.some(s => String(s.exam_id) === String(examId)); }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.exams-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'available': renderAvailable(container); break;
        case 'active': renderActive(container); break;
        case 'history': renderHistory(container); break;
      }
    }
  }

  function renderAvailable(container) {
    const now = new Date();
    const available = DATA.exams.filter(e => new Date(e.starts_at) > now && !isSubmitted(e.id));
    container.innerHTML = `
      <div class="section-page-head"><h1>اختبارات متاحة</h1></div>
      <div id="exams-table"></div>
    `;
    AminRender.renderResponsiveTable($('#exams-table'), available, [
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
        btn.textContent = 'بدء';
        btn.onclick = () => ExamsApp.startExam(row.id);
        return btn;
      }
    });
  }

  function renderActive(container) {
    if (!CURRENT_EXAM) {
      container.innerHTML = `
        <div class="section-page-head"><h1>قيد التنفيذ</h1></div>
        <div class="amin-empty-state" style="padding:var(--space-8);text-align:center;">
          <h3 class="amin-empty-title">لا يوجد اختبار نشط</h3>
          <p class="amin-text-secondary">اختر اختباراً من المتاح</p>
        </div>
      `;
      return;
    }
    container.innerHTML = `
      <div class="section-page-head"><h1>${AminCore.esc(CURRENT_EXAM.title || CURRENT_EXAM.exam_title)}</h1></div>
      <div class="amin-card">
        <div id="exam-questions"></div>
        <button class="amin-btn amin-btn-primary" onclick="ExamsApp.finishExam()" style="margin-top:var(--space-4);">إنهاء الاختبار</button>
      </div>
    `;
    $('#exam-questions').innerHTML = `
      <div class="amin-field">
        <label class="amin-label">سؤال تجريبي</label>
        <p class="amin-text-secondary">ما هو 2 + 2؟</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          <label class="amin-check"><input type="radio" name="q1" value="3"> 3</label>
          <label class="amin-check"><input type="radio" name="q1" value="4"> 4</label>
          <label class="amin-check"><input type="radio" name="q1" value="5"> 5</label>
        </div>
      </div>
    `;
  }

  function renderHistory(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>سجل الاختبارات</h1></div>
      <div id="history-table"></div>
    `;
    AminRender.renderResponsiveTable($('#history-table'), DATA.submissions, [
      { key: 'exam_id', title: 'الاختبار' },
      { key: 'submitted_at', title: 'تاريخ التسليم' },
      { key: 'score', title: 'الدرجة' },
      { key: 'status', title: 'الحالة' }
    ], {
      primaryFields: ['exam_id', 'score'],
      mobileExpandable: ['submitted_at', 'status']
    });
  }

  function startExam(examId) {
    CURRENT_EXAM = DATA.exams.find(e => String(e.id) === String(examId));
    showView('active');
  }

  async function finishExam() {
    if (!CURRENT_EXAM || !STUDENT) return;
    try {
      const { error } = await AminCore.client().from('exam_submissions').insert({
        exam_id: CURRENT_EXAM.id,
        student_id: STUDENT.id,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      });
      if (error) throw error;
      AminCore.toast('تم', 'تم إرسال الاختبار', 'success');
      CURRENT_EXAM = null;
      await loadData();
      showView('history');
    } catch (e) {
      AminCore.toast('خطأ', e.message || 'فشل الإرسال', 'error');
    }
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.ExamsApp = { init, showView, toggleSidebar, startExam, finishExam };
  document.addEventListener('DOMContentLoaded', init);
})(window);
