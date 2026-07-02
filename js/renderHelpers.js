/* ───────────────────────────────────────────────────────────
   renderHelpers.js — Amin UI Rendering Helpers
   Functions: renderProgressRing, renderTaskList, renderTimeline, renderResponsiveTable
   ─────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  function createElement(tag, classes, attrs, text) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  /* 1. Progress Ring */
  function renderProgressRing(container, {
    value = 0,
    max = 100,
    size = 120,
    strokeWidth = 10,
    color = 'var(--primary)',
    bgColor = 'var(--border-subtle)',
    label = null,
    showPercent = true
  } = {}) {
    if (!container) return null;
    container.innerHTML = '';

    const percent = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.style.transform = 'rotate(-90deg)';

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', size / 2);
    bg.setAttribute('cy', size / 2);
    bg.setAttribute('r', radius);
    bg.setAttribute('stroke', bgColor);
    bg.setAttribute('stroke-width', strokeWidth);
    bg.setAttribute('fill', 'none');

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('cx', size / 2);
    fg.setAttribute('cy', size / 2);
    fg.setAttribute('r', radius);
    fg.setAttribute('stroke', color);
    fg.setAttribute('stroke-width', strokeWidth);
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke-linecap', 'round');
    fg.setAttribute('stroke-dasharray', circumference);
    fg.setAttribute('stroke-dashoffset', offset);
    fg.style.transition = 'stroke-dashoffset var(--transition-standard)';

    svg.appendChild(bg);
    svg.appendChild(fg);

    const wrap = createElement('div', 'amin-progress-ring', { style: `position:relative;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;` });
    const labelWrap = createElement('div', '', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' });

    if (showPercent) {
      const pct = createElement('span', '', { style: 'font-size:var(--text-xl);font-weight:700;color:var(--text-primary);' }, `${Math.round(percent)}%`);
      labelWrap.appendChild(pct);
    }
    if (label) {
      const lbl = createElement('span', '', { style: 'font-size:var(--text-xs);color:var(--text-secondary);' }, label);
      labelWrap.appendChild(lbl);
    }

    wrap.appendChild(svg);
    wrap.appendChild(labelWrap);
    container.appendChild(wrap);
    return wrap;
  }

  /* 2. Task List */
  function renderTaskList(container, tasks = [], { onToggle, onClick } = {}) {
    if (!container) return null;
    container.innerHTML = '';
    const list = createElement('div', 'amin-task-list');

    if (tasks.length === 0) {
      const empty = createElement('div', 'amin-text-muted', { style: 'text-align:center;padding:var(--space-8);' }, 'لا توجد مهام حالياً');
      container.appendChild(empty);
      return list;
    }

    tasks.forEach(task => {
      const row = createElement('div', `amin-task ${task.done ? 'amin-task-done' : ''}`);
      row.dataset.id = task.id;

      const priority = createElement('div', `amin-task-priority ${task.priority || 'normal'}`);

      const checkbox = createElement('input', '', { type: 'checkbox', checked: !!task.done });
      checkbox.style.width = '20px';
      checkbox.style.height = '20px';
      checkbox.style.accentColor = 'var(--primary)';
      checkbox.style.flexShrink = '0';
      checkbox.addEventListener('change', () => {
        if (onToggle) onToggle(task.id, checkbox.checked);
      });

      const content = createElement('div', 'amin-task-content');
      const title = createElement('div', 'amin-task-title', {}, task.title);
      const meta = createElement('div', 'amin-task-meta', {}, task.due_date ? `حتى ${task.due_date}` : '');
      content.appendChild(title);
      content.appendChild(meta);

      row.appendChild(priority);
      row.appendChild(checkbox);
      row.appendChild(content);

      if (onClick) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          if (e.target !== checkbox) onClick(task);
        });
      }

      list.appendChild(row);
    });

    container.appendChild(list);
    return list;
  }

  /* 3. Timeline */
  function renderTimeline(container, items = [], { onItemClick } = {}) {
    if (!container) return null;
    container.innerHTML = '';
    const timeline = createElement('div', 'amin-timeline');

    items.forEach((item, index) => {
      const isDone = item.status === 'done';
      const dot = window.AminStar
        ? (isDone
          ? AminStar.timelineDone({ size: 20 })
          : AminStar.timelineUpcoming({ size: 20 }))
        : createElement('span', '', {}, isDone ? '✦' : '✧');
      dot.style.flexShrink = '0';
      dot.style.cursor = onItemClick ? 'pointer' : 'default';

      const label = createElement('div', 'amin-timeline-label', {}, item.label || '');
      const date = createElement('div', 'amin-timeline-date', {}, item.date || '');

      const wrapper = createElement('div', 'amin-timeline-item');
      wrapper.appendChild(dot);
      wrapper.appendChild(label);
      wrapper.appendChild(date);

      if (item.progress !== undefined && item.progress !== null) {
        const bar = createElement('div', '', { style: 'width:100%;height:4px;background:var(--border-subtle);border-radius:2px;margin-top:4px;overflow:hidden;' });
        const fill = createElement('div', '', { style: `width:${item.progress}%;height:100%;background:${isDone ? 'var(--secondary)' : 'var(--primary)'};transition:width var(--transition-standard);` });
        bar.appendChild(fill);
        wrapper.appendChild(bar);
      }

      if (onItemClick) {
        wrapper.style.cursor = 'pointer';
        wrapper.addEventListener('click', () => onItemClick(item));
      }

      timeline.appendChild(wrapper);
    });

    container.appendChild(timeline);
    return timeline;
  }

  /* 4. Responsive Table */
  function renderResponsiveTable(container, data = [], columns = [], options = {}) {
    if (!container) return null;
    container.innerHTML = '';

    const {
      primaryFields = [columns[0]?.key, columns[1]?.key].filter(Boolean),
      mobileExpandable = columns.slice(2).map(c => c.key),
      onRowClick,
      rowActions
    } = options;

    const isMobile = window.innerWidth < 640;

    if (!isMobile) {
      // Desktop/tablet traditional table
      const wrap = createElement('div', 'amin-table-wrap');
      const table = createElement('table', 'amin-table');
      const thead = createElement('thead');
      const trHead = createElement('tr');
      columns.forEach(col => {
        trHead.appendChild(createElement('th', '', {}, col.title || col.key));
      });
      if (rowActions) trHead.appendChild(createElement('th', '', {}, 'إجراءات'));
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = createElement('tbody');
      data.forEach(row => {
        const tr = createElement('tr');
        tr.style.cursor = onRowClick ? 'pointer' : '';
        if (onRowClick) tr.addEventListener('click', () => onRowClick(row));

        columns.forEach(col => {
          const td = createElement('td', '', {}, formatCell(row[col.key], col.format));
          tr.appendChild(td);
        });

        if (rowActions) {
          const td = createElement('td');
          const actions = rowActions(row);
          if (actions) td.appendChild(actions);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      container.appendChild(wrap);
      return wrap;
    }

    // Mobile card view
    const wrap = createElement('div', 'amin-table-mobile');
    data.forEach(row => {
      const card = createElement('div', 'amin-table-row');
      const main = createElement('div', 'amin-row-main');

      const left = createElement('div');
      primaryFields.forEach((key, idx) => {
        const col = columns.find(c => c.key === key);
        const val = formatCell(row[key], col?.format);
        if (idx === 0) {
          const strong = createElement('strong', '', { style: 'display:block;color:var(--text-primary);font-size:var(--text-base);' }, val);
          left.appendChild(strong);
        } else {
          const span = createElement('span', '', { style: 'font-size:var(--text-sm);color:var(--text-secondary);' }, val);
          left.appendChild(span);
        }
      });

      const right = createElement('div', '', { style: 'display:flex;align-items:center;gap:var(--space-2);' });

      const expandBtn = createElement('button', 'amin-btn amin-btn-ghost amin-btn-icon', { type: 'button', 'aria-label': 'التفاصيل' }, '⌄');
      const expandable = createElement('div', 'amin-row-expand');
      mobileExpandable.forEach(key => {
        const col = columns.find(c => c.key === key);
        const field = createElement('div', 'amin-row-field');
        field.appendChild(createElement('span', '', {}, col?.title || key));
        field.appendChild(createElement('span', '', {}, formatCell(row[key], col?.format)));
        expandable.appendChild(field);
      });

      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        expandable.classList.toggle('open');
        expandBtn.textContent = expandable.classList.contains('open') ? '⌃' : '⌄';
      });

      right.appendChild(expandBtn);
      if (rowActions) right.appendChild(rowActions(row));

      main.appendChild(left);
      main.appendChild(right);
      card.appendChild(main);
      card.appendChild(expandable);

      if (onRowClick) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => onRowClick(row));
      }

      wrap.appendChild(card);
    });

    container.appendChild(wrap);
    return wrap;
  }

  function formatCell(value, format) {
    if (value === null || value === undefined) return '—';
    if (format === 'date') {
      try { return new Date(value).toLocaleDateString(); } catch { return value; }
    }
    if (format === 'currency') return `${value} ريال`;
    if (format === 'badge') return value; // caller should render HTML
    return String(value);
  }

  // Expose
  global.AminRender = {
    renderProgressRing,
    renderTaskList,
    renderTimeline,
    renderResponsiveTable,
    createElement,
    formatCell
  };
})(typeof window !== 'undefined' ? window : this);
