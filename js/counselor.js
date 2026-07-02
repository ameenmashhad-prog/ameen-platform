/* Counselor — الإرشاد والسلوك */
(function(global){
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = window.esc || (v => String(v || ''));
  const toast = window.toast || (() => {});

  let ME = null;
  let DATA = { students: [], behaviorTypes: [], records: [] };

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
    renderKpis();
    renderRecords();
  }

  function buildSidebar() {
    const nav = $('#sidebarNav');
    if (!nav) return;
    nav.innerHTML = `
      <button class="sidebar-nav-item" onclick="location.href='../portal.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.home || ''}</span>
        <span class="sidebar-nav-label">البوابة</span>
      </button>
      <button class="sidebar-nav-item" onclick="location.href='student.html'">
        <span class="amin-nav-icon">${AminPlatform.icons.users || ''}</span>
        <span class="sidebar-nav-label">الطلاب</span>
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
      <button class="bottom-nav-item active" onclick="CounselorApp.refresh()">
        <span style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${AminPlatform.icons.counseling || ''}</span>
        <span>الإرشاد</span>
      </button>
    `;
  }

  async function loadData() {
    const [students, behaviorTypes, records] = await Promise.all([
      AminCore.q('students', { order: 'name', ascending: true, limit: 500 }).catch(() => []),
      AminCore.q('behavior_types', { order: 'name', ascending: true, limit: 100 }).catch(() => []),
      AminCore.q('behavior_records', { order: 'created_at', ascending: false, limit: 200 }).catch(() => [])
    ]);
    DATA = { students, behaviorTypes, records };
  }

  function populateSelects() {
    const studentSel = $('#studentSelect');
    studentSel.innerHTML = `<option value="">اختر الطالب...</option>` + DATA.students.map(s => `<option value="${esc(s.id)}">${esc(s.name || '—')}</option>`).join('');

    const typeSel = $('#behaviorTypeSelect');
    typeSel.innerHTML = `<option value="">اختر النوع...</option>` + DATA.behaviorTypes.map(t => `<option value="${esc(t.id)}" data-points="${t.points}">${esc(t.name)} (${t.points > 0 ? '+' : ''}${t.points})</option>`).join('');
    typeSel.addEventListener('change', () => {
      const opt = typeSel.options[typeSel.selectedIndex];
      $('#pointsInput').value = opt.dataset.points || 0;
    });
  }

  function studentName(id) { const s = DATA.students.find(x => String(x.id) === String(id)); return s ? (s.name || '—') : '—'; }
  function typeName(id) { const t = DATA.behaviorTypes.find(x => String(x.id) === String(id)); return t ? (t.name || '—') : '—'; }

  function renderKpis() {
    const positive = DATA.records.filter(r => AminCore.num(r.points) > 0).reduce((s, r) => s + AminCore.num(r.points), 0);
    const negative = DATA.records.filter(r => AminCore.num(r.points) < 0).reduce((s, r) => s + Math.abs(AminCore.num(r.points)), 0);
    $('#kpiPositive').textContent = positive;
    $('#kpiNegative').textContent = negative;
    $('#kpiBalance').textContent = positive - negative;
  }

  function renderRecords() {
    const table = $('#records-table');
    if (!table) return;
    table.innerHTML = '<div class="section-page-head"><h2>سجل السلوك</h2></div><div id="records-list"></div>';
    AminRender.renderResponsiveTable($('#records-list'), DATA.records, [
      { key: 'student_id', title: 'الطالب' },
      { key: 'behavior_type_id', title: 'النوع' },
      { key: 'points', title: 'النقاط' },
      { key: 'note', title: 'ملاحظة' },
      { key: 'created_at', title: 'التاريخ' }
    ], {
      primaryFields: ['student_id', 'points'],
      mobileExpandable: ['behavior_type_id', 'note', 'created_at'],
      rowActions: (row) => {
        const btn = document.createElement('button');
        btn.className = 'amin-btn amin-btn-sm amin-btn-ghost';
        btn.textContent = 'حذف';
        btn.onclick = () => CounselorApp.deleteRecord(row.id);
        return btn;
      }
    });
  }

  async function saveBehavior(ev) {
    ev.preventDefault();
    const payload = {
      student_id: $('#studentSelect').value,
      behavior_type_id: $('#behaviorTypeSelect').value,
      points: Number($('#pointsInput').value),
      note: $('#noteInput').value,
      description: $('#noteInput').value,
      recorded_by: ME.id
    };
    try {
      const { error } = await AminCore.client().from('behavior_records').insert(payload);
      if (error) throw error;
      toast('تم', 'تم تسجيل السلوك', 'success');
      $('#behaviorForm').reset();
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل التسجيل', 'error');
    }
  }

  async function deleteRecord(id) {
    if (!confirm('حذف هذا السجل؟')) return;
    try {
      const { error } = await AminCore.client().from('behavior_records').delete().eq('id', id);
      if (error) throw error;
      toast('تم', 'تم حذف السجل', 'success');
      await refresh();
    } catch (e) {
      toast('خطأ', e.message || 'فشل الحذف', 'error');
    }
  }

  async function refresh() {
    await loadData();
    renderKpis();
    renderRecords();
  }

  function toggleSidebar() {
    $('#sidebar')?.classList.toggle('open');
    $('#sidebarBackdrop')?.classList.toggle('show', $('#sidebar')?.classList.contains('open'));
  }

  global.CounselorApp = { init, saveBehavior, deleteRecord, refresh, toggleSidebar };
  document.addEventListener('DOMContentLoaded', init);
})(window);
