/*! vanilla-ui-kit/pagination v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Pagination v1.0.0
 * A single-file, zero-dependency pagination control for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="pagination.js"></script>
 *   <div id="pager"></div>
 *   <script>new Pagination('#pager', { total: 97, onChange: p => load(p) })</script>
 *
 * Or zero-JS:
 *   <div data-vpn data-total="97" data-per-page="10"></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Pagination = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-pagination-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Pagination.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Pagination.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the pager; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vpn{--vpn-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vpn{' +
      '--vpn-accent:#5b5bd6;' +
      '--vpn-text:#1c1d21;' +
      '--vpn-muted:#72747e;' +
      '--vpn-faint:#e7e7ec;' +
      '--vpn-bg:#ffffff;' +
      '--vpn-on-accent:#ffffff;' +
      '--vpn-radius:8px;' +
      '--vpn-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vpn[data-theme=dark]{' +
      '--vpn-accent:#7b7bea;' +
      '--vpn-text:#e9eaf0;' +
      '--vpn-muted:#989aa6;' +
      '--vpn-faint:#31343f;' +
      '--vpn-bg:#1b1d24;' +
      '--vpn-on-accent:#16171c;}' +
    '.vpn.SALT{display:flex;align-items:center;flex-wrap:wrap;gap:4px;box-sizing:border-box;' +
      'font-family:var(--vpn-font);font-size:14px;line-height:1.4;color:var(--vpn-text);}' +
    '.vpn.SALT *,.vpn.SALT *::before,.vpn.SALT *::after{box-sizing:border-box;}' +
    '.vpn.SALT .vpn-pages{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px;}' +
    '.vpn.SALT .vpn-btn{font:inherit;font-family:var(--vpn-font);font-size:14px;font-weight:500;' +
      'line-height:1;min-width:32px;height:32px;padding:0 8px;margin:0;' +
      'display:inline-flex;align-items:center;justify-content:center;gap:6px;' +
      'color:var(--vpn-text);background:none;border:0;border-radius:var(--vpn-radius);' +
      'cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums;' +
      'transition:background .12s ease,color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vpn.SALT .vpn-btn:hover{background:var(--vpn-faint);}' +
    '.vpn.SALT .vpn-btn[aria-current=page]{background:var(--vpn-accent);' +
      'color:var(--vpn-on-accent);font-weight:600;cursor:default;}' +
    '.vpn.SALT .vpn-btn[disabled]{color:var(--vpn-muted);opacity:.45;cursor:not-allowed;' +
      'background:none;}' +
    '.vpn.SALT .vpn-btn:focus{outline:none;}' +
    '.vpn.SALT .vpn-btn:focus-visible{outline:2px solid var(--vpn-accent);outline-offset:1px;}' +
    '.vpn.SALT .vpn-prev,.vpn.SALT .vpn-next{color:var(--vpn-muted);padding:0 10px;}' +
    '.vpn.SALT .vpn-prev:hover,.vpn.SALT .vpn-next:hover{color:var(--vpn-text);}' +
    '.vpn.SALT .vpn-gap{min-width:32px;text-align:center;color:var(--vpn-muted);' +
      '-webkit-user-select:none;user-select:none;}' +
    '.vpn.SALT .vpn-status{padding:0 6px;font-variant-numeric:tabular-nums;}' +
    '.vpn.SALT .vpn-total{color:var(--vpn-muted);margin-right:6px;' +
      'font-variant-numeric:tabular-nums;}' +
    '.vpn.SALT .vpn-jump{display:inline-flex;align-items:center;gap:6px;margin-left:6px;' +
      'color:var(--vpn-muted);}' +
    '.vpn.SALT .vpn-jump input{font:inherit;font-family:var(--vpn-font);font-size:14px;' +
      'width:56px;height:32px;padding:0 8px;margin:0;text-align:center;' +
      'color:var(--vpn-text);background:var(--vpn-bg);border:1px solid var(--vpn-faint);' +
      'border-radius:var(--vpn-radius);-moz-appearance:textfield;appearance:textfield;}' +
    '.vpn.SALT .vpn-jump input::-webkit-outer-spin-button,' +
    '.vpn.SALT .vpn-jump input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}' +
    '.vpn.SALT .vpn-jump input:focus{outline:none;border-color:var(--vpn-accent);}' +
    '.vpn.SALT .vpn-jump input:focus-visible{outline:2px solid var(--vpn-accent);' +
      'outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vpn.SALT .vpn-btn{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set Pagination.salt to your own token / false
  // BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Pagination.salt;
    if (s === false) return '';
    s = s == null ? DEFAULT_SALT : String(s).replace(/[^\w-]/g, '');
    return s || DEFAULT_SALT;
  }

  function renderCss() {
    var s = saltToken();
    return CSS.split('.SALT').join(s ? '.' + s : '');
  }

  function injectStyles() {
    if (!HAS_DOM) return;
    if (window.VC && window.VC.injectStyles) {
      window.VC.injectStyles(STYLE_ID, renderCss());
      return;
    }
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    // Insert before the page's own CSS so `.vpn { --vpn-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var autoThemed = [];
  var ownMql = null;
  var ownObserver = null;

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveAutoTheme() {
    var core = vcCore();
    if (core) return core.theme.resolve();
    if (!HAS_DOM) return 'light';
    var de = document.documentElement;
    var attr = de.getAttribute('data-theme') || de.getAttribute('data-bs-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    if (de.classList.contains('dark')) return 'dark';
    if (de.classList.contains('light')) return 'light';
    if (!ownMql && window.matchMedia) {
      ownMql = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return ownMql && ownMql.matches ? 'dark' : 'light';
  }

  function refreshAutoThemes() {
    for (var i = 0; i < autoThemed.length; i++) autoThemed[i]._applyTheme();
  }

  function watchAutoTheme(inst) {
    if (autoThemed.indexOf(inst) !== -1) return;
    autoThemed.push(inst);
    if (autoThemed.length !== 1 || !HAS_DOM) return;
    var core = vcCore();
    if (core) {
      core.theme.watch(refreshAutoThemes);
      return;
    }
    if (window.matchMedia) {
      ownMql = ownMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (ownMql.addEventListener) ownMql.addEventListener('change', refreshAutoThemes);
      else if (ownMql.addListener) ownMql.addListener(refreshAutoThemes);
    }
    if (typeof MutationObserver !== 'undefined') {
      ownObserver = new MutationObserver(refreshAutoThemes);
      ownObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-bs-theme']
      });
    }
  }

  function unwatchAutoTheme(inst) {
    var i = autoThemed.indexOf(inst);
    if (i !== -1) autoThemed.splice(i, 1);
    if (autoThemed.length !== 0) return;
    var core = vcCore();
    if (core) core.theme.unwatch(refreshAutoThemes);
    if (ownMql) {
      if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
      else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
    }
    if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Small helpers.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function toInt(v, fallback) {
    v = Math.floor(+v);
    return isFinite(v) ? v : fallback;
  }

  function range(from, to) {
    var out = [];
    for (var i = from; i <= to; i++) out.push(i);
    return out;
  }

  // The ellipsis model: `boundaries` pages pinned at each end, `siblings`
  // pages around the current one, '…' gaps in between. The sibling window
  // is pushed inward near the edges so the item COUNT stays constant while
  // paging (no layout jumps), and a gap is only rendered when it would hide
  // at least one page — a gap standing in for a single page becomes that
  // page instead.
  function pageItems(page, count, siblings, boundaries) {
    siblings = Math.max(0, toInt(siblings, 1));
    boundaries = Math.max(0, toInt(boundaries, 1));

    // Everything fits without hiding anything: 2×boundaries + 2×siblings
    // + current + the two would-be gap slots.
    if (count <= boundaries * 2 + siblings * 2 + 3) return range(1, count);

    var startPages = range(1, Math.min(boundaries, count));
    var endPages = range(Math.max(count - boundaries + 1, boundaries + 1), count);

    var siblingsStart = Math.max(
      Math.min(page - siblings, count - boundaries - siblings * 2 - 1),
      boundaries + 2
    );
    var siblingsEnd = Math.min(
      Math.max(page + siblings, boundaries + siblings * 2 + 2),
      count - boundaries - 1
    );

    return startPages
      .concat(siblingsStart > boundaries + 2 ? ['gap']
        : boundaries + 1 < count - boundaries ? [boundaries + 1] : [])
      .concat(range(siblingsStart, siblingsEnd))
      .concat(siblingsEnd < count - boundaries - 1 ? ['gap']
        : count - boundaries > boundaries ? [count - boundaries] : [])
      .concat(endPages);
  }

  var DEFAULTS = {
    total: null,        // item count (pairs with perPage) …
    perPage: 10,        // … items per page
    pages: null,        // OR the page count directly (takes precedence)
    page: 1,            // initial page (1-based, clamped)
    siblings: 1,        // pages shown on each side of the current one
    boundaries: 1,      // pages pinned at each end
    compact: false,     // just  prev  3 / 12  next
    showTotal: false,   // true = built-in "1–10 of 97" | fn(total, [from, to]) → string
    showJump: false,    // "Go to" number input; Enter jumps, clamped
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vpn-* yourself
    onChange: null,     // fn(page, pagination)
    labels: {
      pagination: 'Pagination',   // aria-label on the <nav>
      prev: 'Prev',               // visible prev text ('' = glyph only)
      next: 'Next',               // visible next text ('' = glyph only)
      prevAria: 'Previous page',
      nextAria: 'Next page',
      page: 'Page',               // aria-label prefix on page buttons
      jump: 'Go to'               // visible jump-field label
    }
  };

  function mergeOptions(options) {
    var out = {}, labels = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    for (k in DEFAULTS.labels) labels[k] = DEFAULTS.labels[k];
    out.labels = labels;
    if (options) {
      for (k in options) {
        if (options[k] === undefined) continue;
        if (k === 'labels') {
          for (var l in options.labels) labels[l] = options.labels[l];
        } else out[k] = options[k];
      }
    }
    return out;
  }

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    nav: null,
    page: 1,
    setPage: function () { return dummyInstance; },
    getPage: function () { return 1; },
    update: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Pagination.
   * ------------------------------------------------------------------ */

  function Pagination(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Pagination: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = mergeOptions(options);
    this.page = 1;

    if (this.opts.styles !== false) injectStyles();

    this._build();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    // Initial page is clamped and never fires onChange.
    this.page = this._clamp(this.opts.page);
    this._render();
  }

  Pagination.prototype = {
    constructor: Pagination,

    /* ---------------- derived state ---------------- */

    _count: function () {
      var o = this.opts;
      if (o.pages != null) return Math.max(1, toInt(o.pages, 1));
      var total = Math.max(0, toInt(o.total, 0));
      var per = Math.max(1, toInt(o.perPage, 1));
      return Math.max(1, Math.ceil(total / per));
    },

    _clamp: function (p) {
      p = toInt(p, 1);
      var count = this._count();
      return p < 1 ? 1 : p > count ? count : p;
    },

    /* ---------------- setup ---------------- */

    _build: function () {
      var self = this;
      var s = saltToken();
      var labels = this.opts.labels;

      var nav = document.createElement('nav');
      nav.className = 'vpn' + (s ? ' ' + s : '');
      nav.setAttribute('aria-label', labels.pagination);
      this.nav = nav;

      // Side text — only meaningful in total/perPage mode.
      this._totalEl = null;
      if (this.opts.showTotal && this.opts.pages == null && this.opts.total != null) {
        this._totalEl = document.createElement('span');
        this._totalEl.className = 'vpn-total';
        nav.appendChild(this._totalEl);
      }

      this._prev = this._navButton('prev', '←', labels.prev, labels.prevAria);
      nav.appendChild(this._prev);

      // Page area: real page buttons, or a plain "3 / 12" readout in compact.
      this._pages = document.createElement('span');
      if (this.opts.compact) {
        this._pages.className = 'vpn-status';
        this._pages.setAttribute('aria-live', 'polite'); // announce page flips
      } else {
        this._pages.className = 'vpn-pages';
      }
      nav.appendChild(this._pages);

      this._next = this._navButton('next', '→', labels.next, labels.nextAria);
      nav.appendChild(this._next);

      this._jump = null;
      if (this.opts.showJump) {
        // <label> wraps the input — implicit labelling, no ids needed.
        var jump = document.createElement('label');
        jump.className = 'vpn-jump';
        jump.appendChild(document.createTextNode(labels.jump));
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        jump.appendChild(input);
        nav.appendChild(jump);
        this._jump = input;
        this._onJumpKeydown = function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault(); // never submit a surrounding form
          var v = parseInt(input.value, 10);
          if (isNaN(v)) return;
          self.setPage(v);    // clamped inside setPage
          input.value = '';
        };
        input.addEventListener('keydown', this._onJumpKeydown);
      }

      this._onPrevClick = function () { self._stepPage(-1); };
      this._onNextClick = function () { self._stepPage(1); };
      this._onPagesClick = function (e) { self._handlePagesClick(e); };
      this._prev.addEventListener('click', this._onPrevClick);
      this._next.addEventListener('click', this._onNextClick);
      this._pages.addEventListener('click', this._onPagesClick);

      this.el.appendChild(nav);
    },

    // Prev/next: glyph is decorative (aria-hidden), the button carries a
    // full aria-label; visible text is optional via labels.prev/next.
    _navButton: function (kind, glyph, text, ariaLabel) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vpn-btn vpn-' + kind;
      btn.setAttribute('aria-label', ariaLabel);
      var g = document.createElement('span');
      g.setAttribute('aria-hidden', 'true');
      g.textContent = glyph;
      if (kind === 'prev') {
        btn.appendChild(g);
        if (text) btn.appendChild(document.createTextNode(String(text)));
      } else {
        if (text) btn.appendChild(document.createTextNode(String(text)));
        btn.appendChild(g);
      }
      return btn;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.nav.setAttribute('data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _stepPage: function (dir) {
      this.setPage(this.page + dir);
      // The button under focus may have just become disabled — keep the
      // keyboard user parked somewhere sensible.
      var btn = dir < 0 ? this._prev : this._next;
      if (btn.disabled) (this._current || (dir < 0 ? this._next : this._prev)).focus();
    },

    _handlePagesClick: function (e) {
      var node = e.target;
      while (node && node !== this._pages) {
        if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-page')) {
          var p = +node.getAttribute('data-page');
          if (p !== this.page) this.setPage(p); // current page is inert
          return;
        }
        node = node.parentNode;
      }
    },

    /* ---------------- rendering ---------------- */

    _render: function () {
      var count = this._count();
      var labels = this.opts.labels;

      this._prev.disabled = this.page <= 1;
      this._next.disabled = this.page >= count;

      if (this.opts.compact) {
        this._pages.textContent = this.page + ' / ' + count;
        this._current = null;
      } else {
        // Rebuild the page strip; if focus was inside it, hand focus to the
        // new current-page button so keyboard flow isn't dropped on <body>.
        var hadFocus = this._pages.contains(document.activeElement);
        this._pages.innerHTML = '';
        var items = pageItems(this.page, count, this.opts.siblings, this.opts.boundaries);
        this._current = null;
        for (var i = 0; i < items.length; i++) {
          if (items[i] === 'gap') {
            var gap = document.createElement('span');
            gap.className = 'vpn-gap';
            gap.setAttribute('aria-hidden', 'true'); // inert separator
            gap.textContent = '…';
            this._pages.appendChild(gap);
          } else {
            var n = items[i];
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vpn-btn';
            btn.setAttribute('data-page', n);
            btn.setAttribute('aria-label', labels.page + ' ' + n);
            btn.textContent = String(n);
            if (n === this.page) {
              btn.setAttribute('aria-current', 'page');
              this._current = btn;
            }
            this._pages.appendChild(btn);
          }
        }
        if (hadFocus && this._current) this._current.focus();
      }

      if (this._totalEl) {
        var total = Math.max(0, toInt(this.opts.total, 0));
        var per = Math.max(1, toInt(this.opts.perPage, 1));
        var from = total === 0 ? 0 : (this.page - 1) * per + 1;
        var to = Math.min(this.page * per, total);
        var fn = this.opts.showTotal;
        this._totalEl.textContent = typeof fn === 'function'
          ? String(fn(total, [from, to]))
          : from + '–' + to + ' of ' + total;
      }

      if (this._jump) this._jump.max = String(count);
    },

    /* ---------------- public API ---------------- */

    getPage: function () {
      return this.page;
    },

    // setPage(5) — clamped to [1, pageCount]; fires onChange (and the
    // 'pagination:change' DOM event) only on an actual move, and never
    // with `{silent: true}`.
    setPage: function (p, o) {
      p = this._clamp(p);
      var prev = this.page;
      this.page = p;
      this._render();
      if (p !== prev && !(o && o.silent)) {
        if (this.opts.onChange) this.opts.onChange(p, this);
        this.el.dispatchEvent(new CustomEvent('pagination:change', {
          bubbles: true,
          detail: { page: p, pagination: this }
        }));
      }
      return this;
    },

    // update({total, perPage, pages}) — swap the data shape in place; the
    // current page is re-clamped silently (no onChange for the clamp).
    update: function (o) {
      o = o || {};
      if (o.total !== undefined) this.opts.total = o.total;
      if (o.perPage !== undefined) this.opts.perPage = o.perPage;
      if (o.pages !== undefined) this.opts.pages = o.pages;
      this.page = this._clamp(this.page);
      this._render();
      return this;
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      this._prev.removeEventListener('click', this._onPrevClick);
      this._next.removeEventListener('click', this._onNextClick);
      this._pages.removeEventListener('click', this._onPagesClick);
      if (this._jump) this._jump.removeEventListener('keydown', this._onJumpKeydown);
      if (this.nav.parentNode) this.nav.parentNode.removeChild(this.nav);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Pagination.version = VERSION;
  Pagination.defaults = DEFAULTS;

  Pagination.create = function (target, options) {
    return new Pagination(target, options);
  };

  Pagination.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.pages != null && d.pages !== '') o.pages = +d.pages;
    if (d.total != null && d.total !== '') o.total = +d.total;
    if (d.perPage != null && d.perPage !== '') o.perPage = +d.perPage;
    if (d.page != null && d.page !== '') o.page = +d.page;
    if (d.siblings != null && d.siblings !== '') o.siblings = +d.siblings;
    if (d.boundaries != null && d.boundaries !== '') o.boundaries = +d.boundaries;
    if (d.compact != null) o.compact = parseBool(d.compact);
    if (d.showTotal != null) o.showTotal = parseBool(d.showTotal);
    if (d.showJump != null) o.showJump = parseBool(d.showJump);
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Pagination.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vpn]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Pagination(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Pagination auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Pagination.autoInit(); });
    } else {
      Pagination.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Pagination.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Pagination, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Pagination.css = renderCss();
  }
  Pagination.displayName = 'Pagination';
  Pagination.rootClass = 'vpn';
  Pagination.themeVars = {
    accent: '--vpn-accent',
    radius: '--vpn-radius',
    font: '--vpn-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Pagination.varScopes = ['.vpn', '.vpn[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('pagination', Pagination);
  }

  return Pagination;
});

}).call(__root);
var Pagination = __root.Pagination;
export { Pagination };
export default Pagination;
