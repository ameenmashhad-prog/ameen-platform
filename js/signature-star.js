/* ───────────────────────────────────────────────────────────
   signature-star.js — النجمة الثمانية المبسّطة (Amin Signature)
   مدارس أمين الرضا (ع)
   ─────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  const PATH = 'M 50 0 L 58.5 30.5 L 88 22 L 69.5 45.5 L 88 69 L 58.5 60.5 L 50 91 L 41.5 60.5 L 12 69 L 30.5 45.5 L 12 22 L 41.5 30.5 Z';
  const VIEWBOX = '0 0 100 100';

  function makeSvg({
    size = 48,
    filled = false,
    spinning = false,
    color = null,
    strokeWidth = 1.5,
    opacity = 1,
    className = '',
    ariaLabel = 'Amin star',
    attrs = {}
  } = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', VIEWBOX);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', ariaLabel);
    svg.setAttribute('fill', 'none');
    svg.style.opacity = opacity;

    if (className) svg.classList.add(...className.split(' ').filter(Boolean));
    if (spinning) svg.classList.add('amin-star-spin');

    const stroke = color || (filled ? 'currentColor' : 'currentColor');
    const fill = filled ? (color || 'currentColor') : 'none';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', PATH);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', fill);

    svg.appendChild(path);

    Object.entries(attrs).forEach(([k, v]) => svg.setAttribute(k, v));
    return svg;
  }

  const AminStar = {
    outline: (opts) => makeSvg({ filled: false, spinning: false, ...opts }),
    filled: (opts) => makeSvg({ filled: true, ...opts }),
    spinner: (opts) => makeSvg({ filled: false, spinning: true, strokeWidth: 2.5, size: 40, ...opts }),
    watermark: (opts) => makeSvg({ filled: false, spinning: false, opacity: 0.03, size: 160, strokeWidth: 1, ...opts }),
    logo: (opts) => makeSvg({ filled: true, size: 64, ...opts }),
    splash: (opts) => makeSvg({ filled: true, size: 1024, strokeWidth: 0, ...opts }),
    timelineDone: (opts) => makeSvg({ filled: true, size: 18, color: 'var(--secondary)', ...opts }),
    timelineUpcoming: (opts) => makeSvg({ filled: false, size: 18, color: 'var(--text-secondary)', strokeWidth: 1.5, ...opts }),
    progressStep: (filled, opts) => filled
      ? AminStar.filled({ size: 14, color: 'var(--primary)', ...opts })
      : AminStar.outline({ size: 14, color: 'var(--border-strong)', strokeWidth: 1.5, ...opts })
  };

  // Animated SVG spinner container
  AminStar.renderLoader = function (container, opts = {}) {
    if (!container) return null;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'amin-loader';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.color = opts.color || 'var(--primary)';
    wrap.appendChild(AminStar.spinner(opts));
    container.appendChild(wrap);
    return wrap;
  };

  AminStar.renderEmpty = function (container, opts = {}) {
    if (!container) return null;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'amin-empty-state';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.padding = 'var(--space-8)';
    wrap.style.position = 'relative';
    wrap.style.overflow = 'hidden';
    wrap.style.color = 'var(--text-secondary)';

    const watermark = AminStar.watermark({ size: 180, opacity: 0.03, ...opts });
    watermark.style.position = 'absolute';
    watermark.style.top = '50%';
    watermark.style.left = '50%';
    watermark.style.transform = 'translate(-50%, -50%)';
    watermark.style.animation = 'pulse-soft 6s ease-in-out infinite';

    wrap.appendChild(watermark);
    return wrap;
  };

  // Required CSS animation class (add to components.css if needed)
  if (typeof document !== 'undefined') {
    if (!document.getElementById('amin-star-style')) {
      const style = document.createElement('style');
      style.id = 'amin-star-style';
      style.textContent = `
        .amin-star-spin { animation: spin-slow 2.8s linear infinite; }
        .amin-loader { color: var(--primary); }
      `;
      document.head.appendChild(style);
    }
  }

  global.AminStar = AminStar;
})(typeof window !== 'undefined' ? window : this);
