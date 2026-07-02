/* Teacher Exams — إدارة الاختبارات */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let DATA = { exams: [], subjects: [], classes: [], questions: [], submissions: [], students: [] };
  let ACTIVE_VIEW = 'list';
  let EDIT_ID = null;
  let DETAIL_ID = null;

  const VIEWS = {
    list: { title: 'قائمة الاختبارات', icon: 'reports' },
    form: { title: 'اختبار جديد', icon: 'forms' },
    detail: { title: 'تفاصيل الاختبار', icon: 'calendar' }
  };

  async function init() {
    ME = await AminCore.authProfile();
    if (!ME) return;
    $('#userName').textContent = ME.name || ME.email || 'معلم';
    $('#userAvatar').textContent = (ME.name || 'م').charAt(0);
    $('#userRole').textContent = AminCore.roleLabel(ME.role);
    buildSidebar();
    buildBottomNav();
    await loadData();
    showView('list');
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='schedule-management.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.calendar || ''}</span>
        <span class="sidebar-nav-label">الجدول</span>
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
      <button class="bottom-nav-item active" onclick="TeacherExamsApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.reports || ''}</span>
        <span>الاختبارات</span>
      </button>
    `;
  }

  async function loadData() {
    const [exams, subjects, classes, questions, submissions, students] = await Promise.all([
      AminCore.q('online_exams', { order: 'starts_at', ascending: false, limit: 100 }).catch(() => []),
      AminCore.q('subjects').then(list => { const m = {}; list.forEach(s => m[s.id] = s.name); return m; }).catch(() => ({})),
      AminCore.q('classes').then(list => { const m = {}; list.forEach(c => m[c.id] = c.name); return m; }).catch(() => ({})),
      AminCore.q('exam_questions').catch(() => []),
      AminCore.q('exam_submissions').catch(() => []),
      AminCore.q('students').catch(() => [])
    ]);
    DATA = { exams, subjects, classes, questions, submissions, students };
  }

  function subjectName(id) { return DATA.subjects[id] || '—'; }
  function className(id) { return DATA.classes[id] || '—'; }
  function studentName(id) { const s = DATA.students.find(x => String(x.id) === String(id)); return s ? (s.name || '—') : '—'; }

  function showView(viewId) {
    ACTIVE_VIEW = viewId;
    $('#pageTitle').textContent = VIEWS[viewId].title;
    $$('.exams-view').forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    $('#sidebar')?.classList.remove('open');
    $('#sidebarBackdrop')?.classList.remove('show');
    const container = $('#view-' + viewId);
    if (container) {
      switch (viewId) {
        case 'list': renderList(container); break;
        case 'form': renderForm(container); break;
        case 'detail': renderDetail(container); break;
      }
    }
  }

  function renderList(container) {
    container.innerHTML = `
      <div class="section-page-head">
        <h1>قائمة الاختبارات</h1>
        <p>إدارة الاختبارات الإلكترونية والأسئلة</p>
      </div>
      <button class="amin-btn amin-btn-primary" style="margin-bottom:var(--space-4);" onclick="TeacherExamsApp.newExam()">+ اختبار جديد</button>
      <div id="exams-list"></div>
    `;
    AminRender.renderResponsiveTable($('#exams-list'), DATA.exams, [
      { key: 'title', title: 'العنوان' },
      { key: 'subject_id', title: 'المادة' },
      { key: 'class_id', title: 'الصف' },
      { key: 'starts_at', title: 'التاريخ' },
      { key: 'duration_minutes', title: 'المدة' }
    ], {
      primaryFields: ['title', 'subject_id'],
      mobileExpandable: ['class_id', 'starts_at', 'duration_minutes'],
      rowActions: (row) => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.gap = 'var(--space-2)';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'amin-btn amin-btn-sm amin-btn-primary';
        viewBtn.textContent = 'تفاصيل';
        viewBtn.onclick = () => { DETAIL_ID = row.id; showView('detail'); };
        const editBtn = document.createElement('button');
        editBtn.className = 'amin-btn amin-btn-sm amin-btn-ghost';
        editBtn.textContent = 'تعديل';
        editBtn.onclick = () => { EDIT_ID = row.id; showView('form'); };
        wrap.appendChild(viewBtn);
        wrap.appendChild(editBtn);
        return wrap;
      }
    });
  }

  function renderForm(container) {
    const exam = EDIT_ID ? DATA.exams.find(e => e.id === EDIT_ID) : null;
    container.innerHTML = `
      <div class="section-page-head"><h1>${exam ? 'تعديل اختبار' : 'اختبار جديد'}</h1></div>
      <div class="amin-card">
        <form id="examForm" onsubmit="TeacherExamsApp.saveExam(event)">
          <div class="amin-grid amin-grid-2">
            <div class="amin-field"><label class="amin-label">العنوان</label><input type="text" id="examTitle" class="amin-input" value="${esc(exam?.title || '')}" required></div>
            <div class="amin-field"><label class="amin-label">الصف</label><select id="examClass" class="amin-select" required></select></div>
            <div class="amin-field"><label class="amin-label">المادة</label><select id="examSubject" class="amin-select" required></select></div>
            <div class="amin-field"><label class="amin-label">تاريخ البدء</label><input type="datetime-local" id="examStarts" class="amin-input" value="${esc(exam?.starts_at ? exam.starts_at.slice(0, 16) : '')}" required></div>
            <div class="amin-field"><label class="amin-label">المدة (دقيقة)</label><input type="number" id="examDuration" class="amin-input" value="${esc(exam?.duration_minutes || '')}" required></div>
          </div>
          <button type="submit" class="amin-btn amin-btn-primary">حفظ</button>
          <button type="button" class="amin-btn amin-btn-ghost" onclick="TeacherExamsApp.cancel()">إلغاء</button>
        </form>
      </div>
    `;
    const fill = (sel, map, selected) => {
      sel.innerHTML = `<option value="">اختر...</option>` + Object.entries(map).map(([id, name]) => `<option value="${esc(id)}" ${selected === id ? 'selected' : ''}>${esc(name)}</option>`).join('');
    };
    fill($('#examClass'), DATA.classes, exam?.class_id);
    fill($('#examSubject'), DATA.subjects, exam?.subject_id);
  }

  async function saveExam(ev) {
    ev.preventDefault();
    const payload = {
      title: $('#examTitle').value,
      class_id: $('#examClass').value,
      subject_id: $('#examSubject').value,
      starts_at: new Date($('#examStarts').value).toISOString(),
      duration_minutes: Number($('#examDuration').value),
      created_by: ME.id
    };
    try {
      if (EDIT_ID) {
        const { error } = await AminCore.client().from('online_exams').update(payload).eq('id', EDIT_ID);
        if (error) throw error;
        toast('تم', 'تم تحديث الاختبار', 'success');
      } else {
        const { data, error } = await AminCore.client().from('online_exams').insert(payload).select('id').single();
        if (error) throw error;
        EDIT_ID = data.id;
        toast('تم', 'تم إنشاء الاختبار', 'success');
      }
      await refresh();
      DETAIL_ID = EDIT_ID;
      showView('detail');
    } catch (e) {
      toast('خطأ', e.message || 'فشل حفظ الاختبار', 'error');
    }
  }

  function renderDetail(container) {
    const exam = DATA.exams.find(e => e.id === DETAIL_ID);
    if (!exam) { container.innerHTML = '<div class="amin-card">اختر اختباراً من القائمة</div>'; return; }
    const questions = DATA.questions.filter(q => String(q.exam_id) === String(exam.id));
    const submissions = DATA.submissions.filter(s => String(s.exam_id) === String(exam.id));
    const qCount = questions.length;
    const totalMarks = questions.reduce((sum, q) => sum + AminCore.num(q.marks), 0);

    container.innerHTML = `
      <div class="section-page-head">
        <h1>${esc(exam.title)}</h1>
        <p>${subjectName(exam.subject_id)} · ${className(exam.class_id)} · ${new Date(exam.starts_at).toLocaleString('ar-IQ')}</p>
      </div>
      <button class="amin-btn amin-btn-ghost" style="margin-bottom:var(--space-4);" onclick="TeacherExamsApp.showView('list')">← العودة للقائمة</button>
      <div class="kpi-grid" style="margin-bottom:var(--space-4);">
        <div class="amin-kpi"><div class="amin-kpi-label">عدد الأسئلة</div><div class="amin-kpi-value">${qCount}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">الدرجة الكلية</div><div class="amin-kpi-value">${totalMarks}</div></div>
        <div class="amin-kpi"><div class="amin-kpi-label">عدد المشاركين</div><div class="amin-kpi-value">${submissions.length}</div></div>
      </div>
      <div class="amin-grid amin-grid-2">
        <div class="amin-card">
          <div class="amin-card-header"><div class="amin-card-title">إضافة سؤال</div></div>
          <form id="questionForm" onsubmit="TeacherExamsApp.saveQuestion(event)">
            <div class="amin-field"><label class="amin-label">نص السؤال</label><textarea id="qText" class="amin-textarea" required></textarea></div>
            <div class="amin-field"><label class="amin-label">النوع</label>
              <select id="qType" class="amin-select">
                <option value="multiple_choice">اختيار من متعدد</option>
                <option value="true_false">صح/خطأ</option>
                <option value="text">نص</option>
              </select>
            </div>
            <div class="amin-field"><label class="amin-label">الخيارات (مفصولة بفاصلة)</label><input type="text" id="qOptions" class="amin-input" placeholder="3,4,5"></div>
            <div class="amin-field"><label class="amin-label">الإجابة الصحيحة</label><input type="text" id="qCorrect" class="amin-input" required></div>
            <div class="amin-field"><label class="amin-label">الدرجة</label><input type="number" id="qMarks" class="amin-input" value="1" step="0.25" required></div>
            <button type="submit" class="amin-btn amin-btn-primary">إضافة سؤال</button>
          </form>
        </div>
        <div class="amin-card">
          <div class="amin-card-header"><div class="amin-card-title">الأسئلة (${qCount})</div></div>
          <div id="questions-list">${questions.map(q => `
            <div class="question-card">
              <div style="font-weight:700;">${esc(q.question_text)}</div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-2);">النوع: ${esc(q.question_type)} · الدرجة: ${q.marks}</div>
            </div>
          `).join('') || '<div class="amin-text-muted">لا توجد أسئلة</div>'}</div>
        </div>
      </div>
      <div class="amin-card" style="margin-top:var(--space-4);">
        <div class="amin-card-header"><div class="amin-card-title">تسليمات الطلاب</div></div>
        <div id="submissions-list"></div>
      </div>
    `;
    AminRender.renderResponsiveTable($('#submissions-list'), submissions, [
      { key: 'student_id', title: 'الطالب' },
      { key: 'submitted_at', title: 'تاريخ التسليم' },
      { key: 'score', title: 'الدرجة' },
      { key: 'status', title: 'الحالة' }
    ], {
      primaryFields: ['student_id', 'score'],
      mobileExpandable: ['submitted_at', 'status']
    });
  }

  async function saveQuestion(ev) {
    ev.preventDefault();
    const options = $('#qOptions').value.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      exam_id: DETAIL_ID,
      question_text: $('#qText').value,
      question_type: $('#qType').value,
      options: options.length ? options : null,
      correct_answer: $('#qCorrect').value,
      marks: Number($('#qMarks').value)
    };
    try {
      const { error } = await AminCore.client().from('exam_questions').insert(payload);
      if (error) throw error;
      toast('تم', 'تمت إضافة السؤال', 'success');
      $('#questionForm').reset();
      await refresh();
      showView('detail');
    } catch (e) {
      toast('خطأ', e.message || 'فشل إضافة السؤال', 'error');
    }
  }

  function newExam() { EDIT_ID = null; DETAIL_ID = null; showView('form'); }
  function cancel() { EDIT_ID = null; DETAIL_ID = null; showView('list'); }

  async function refresh() {
    await loadData();
    showView(ACTIVE_VIEW);
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.TeacherExamsApp = { init, showView, newExam, saveExam, cancel, saveQuestion, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
