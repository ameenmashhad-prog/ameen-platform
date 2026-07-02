/* Homework Portal — الواجبات */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let ME = null;
  let STUDENT = null;
  let DATA = { homeworks: [], subjects: [], submissions: [] };
  let ACTIVE_VIEW = 'overview';

  const VIEWS = {
    overview: { title: 'واجباتي', icon: 'forms' },
    submit: { title: 'تسليم', icon: 'forms' },
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
    showView('overview');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = Object.entries(VIEWS).map(([key, view]) => `
      <button class="sidebar-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" data-view="${key}" onclick="HomeworkApp.showView('${key}')">
        <span class="amin-nav-icon">${AminPlatform.icons[view.icon] || AminPlatform.icons.home}</span>
        <span class="sidebar-nav-label">${AminCore.esc(view.title)}</span>
      </button>
    `).join('');
  }

  function buildBottomNav() {
    const nav = $('#bottomNav');
    if (!nav) return;
    const visible = ['overview', 'submit', 'history'];
    nav.innerHTML = visible.map(key => {
      const v = VIEWS[key];
      return `<button class="bottom-nav-item ${key === ACTIVE_VIEW ? 'active' : ''}" onclick="HomeworkApp.showView('${key}')">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons[v.icon] || AminPlatform.icons.home}</span>
        <span>${AminCore.esc(v.title)}</span>
      </button>`;
    }).join('');
  }

  async function loadData() {
    const [homeworks, subjects, submissions] = await Promise.all([
      AminCore.q('v_student_homeworks', { order: 'due_date', ascending: true, limit: 100 }).catch(() => []),
      AminCore.q('subjects').then(list => { const m = {}; list.forEach(s => m[s.id] = s.name); return m; }).catch(() => ({})),
      AminCore.q('homework_submissions', { filters: STUDENT ? [{ op: 'eq', col: 'student_id', val: STUDENT.id }] : [], order: 'submitted_at', ascending: false, limit: 50 }).catch(() => [])
    ]);
    DATA = { homeworks, subjects, submissions };
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
    return x.toLocaleDateString('ar-IQ');
  }
  function isSubmitted(homeworkId) { return DATA.submissions.some(s => String(s.homework_id) === String(homeworkId)); }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.homework-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $$('.sidebar-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    $$('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.textContent.includes(VIEWS[viewId].title)));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'overview': renderOverview(container); break;
        case 'submit': renderSubmit(container); break;
        case 'history': renderHistory(container); break;
      }
    }
  }

  function renderOverview(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>واجباتي</h1><p>قائمة الواجبات المطلوبة</p></div>
      <div id="homework-list"></div>
    `;
    const tasks = DATA.homeworks.map(h => ({
      id: h.id, title: h.title || h.homework_title || 'واجب',
      due_date: dueText(h.due_date || h.due_at) + ' · ' + subjectName(h.subject_id),
      priority: (dueText(h.due_date || h.due_at).includes('متأخر') || dueText(h.due_date || h.due_at) === 'اليوم') ? 'urgent' : 'normal',
      done: isSubmitted(h.id)
    }));
    AminRender.renderTaskList($('#homework-list'), tasks);
  }

  function renderSubmit(container) {
    const pending = DATA.homeworks.filter(h => !isSubmitted(h.id));
    container.innerHTML = `
      <div class="section-page-head"><h1>تسليم واجب</h1></div>
      <div class="amin-card" style="max-width:600px;">
        <div class="amin-field">
          <label class="amin-label">اختر الواجب</label>
          <select class="amin-select" id="submitHomework">
            <option value="">اختر...</option>
            ${pending.map(h => `<option value="${h.id}">${AminCore.esc(h.title || h.homework_title)} — ${AminCore.esc(subjectName(h.subject_id))}</option>`).join('')}
          </select>
        </div>
        <div class="amin-field">
          <label class="amin-label">الحل</label>
          <textarea class="amin-textarea" id="submitAnswer" placeholder="اكتب حلك هنا..."></textarea>
        </div>
        <div class="amin-field">
          <label class="amin-label">ملف مرفق</label>
          <input type="file" class="amin-input" id="submitFile">
        </div>
        <button class="amin-btn amin-btn-primary" onclick="HomeworkApp.submitHomework()">تسليم</button>
      </div>
    `;
  }

  function renderHistory(container) {
    container.innerHTML = `
      <div class="section-page-head"><h1>سجل التسليمات</h1></div>
      <div id="history-table"></div>
    `;
    AminRender.renderResponsiveTable($('#history-table'), DATA.submissions, [
      { key: 'homework_id', title: 'الواجب' },
      { key: 'submitted_at', title: 'تاريخ التسليم' },
      { key: 'status', title: 'الحالة' }
    ], {
      primaryFields: ['homework_id', 'status'],
      mobileExpandable: ['submitted_at']
    });
  }

  async function submitHomework() {
    const homeworkId = $('#submitHomework')?.value;
    const answer = $('#submitAnswer')?.value;
    if (!homeworkId) { AminCore.toast('تنبيه', 'اختر الواجب أولاً', 'warning'); return; }
    if (!STUDENT) { AminCore.toast('خطأ', 'لا يوجد طالب مرتبط', 'error'); return; }
    try {
      const { error } = await AminCore.client().from('homework_submissions').insert({
        homework_id: homeworkId,
        student_id: STUDENT.id,
        answer_text: answer,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      });
      if (error) throw error;
      AminCore.toast('تم', 'تم تسليم الواجب بنجاح', 'success');
      await loadData();
      showView('history');
    } catch (e) {
      AminCore.toast('خطأ', e.message || 'فشل التسليم', 'error');
    }
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.HomeworkApp = { init, showView, toggleSidebar, submitHomework };
  document.addEventListener('DOMContentLoaded', init);
})(window);
