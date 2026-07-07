/*! vanilla-ui-kit/segmented v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Segmented v1.0.0
 * A single-file, zero-dependency segmented control (the modern radio
 * group) for vanilla JS. Part of the Vanilla UI Kit family — standalone,
 * or converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="segmented.js"></script>
 *   <div id="view"></div>
 *   <script>new Segmented('#view', { options: ['List', 'Board', 'Calendar'] })</script>
 *
 * Or enhance existing buttons / zero-JS:
 *   <div data-vsg><button data-value="list">List</button><button>Board</button></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Segmented = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-segmented-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Segmented.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Segmented.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the control; custom-property DEFINITIONS stay unsalted at
  // their documented specificity so `.vsg{--vsg-accent:…}` page overrides
  // keep working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsg{' +
      '--vsg-accent:#5b5bd6;' +
      '--vsg-bg:#ffffff;' +
      '--vsg-text:#1c1d21;' +
      '--vsg-muted:#72747e;' +
      '--vsg-faint:#e7e7ec;' +
      '--vsg-shadow:0 1px 3px rgba(24,25,32,.12),0 1px 2px rgba(24,25,32,.06);' +
      '--vsg-radius:10px;' +
      '--vsg-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsg[data-theme=dark]{' +
      '--vsg-accent:#7b7bea;' +
      '--vsg-bg:#1b1d24;' +
      '--vsg-text:#e9eaf0;' +
      '--vsg-muted:#989aa6;' +
      '--vsg-faint:#31343f;' +
      '--vsg-shadow:0 1px 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3);}' +
    /* the pill track */
    '.vsg.SALT{position:relative;display:inline-flex;align-items:stretch;gap:2px;' +
      'box-sizing:border-box;padding:3px;background:var(--vsg-faint);' +
      'border-radius:var(--vsg-radius);font-family:var(--vsg-font);' +
      'color:var(--vsg-text);vertical-align:middle;}' +
    '.vsg.SALT *,.vsg.SALT *::before,.vsg.SALT *::after{box-sizing:border-box;}' +
    '.vsg.SALT.vsg-full{display:flex;width:100%;}' +
    /* segments sit above the thumb (z-index 1 vs 0) */
    '.vsg.SALT .vsg-seg{position:relative;z-index:1;flex:none;display:inline-flex;' +
      'align-items:center;justify-content:center;gap:7px;' +
      'font:inherit;font-family:var(--vsg-font);font-size:14px;font-weight:500;' +
      'line-height:1.3;color:var(--vsg-muted);background:none;border:0;' +
      'border-radius:calc(var(--vsg-radius) - 3px);padding:6px 14px;margin:0;' +
      'cursor:pointer;white-space:nowrap;min-width:0;' +
      'transition:color .15s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vsg.SALT.vsg-full .vsg-seg{flex:1;}' +
    '.vsg.SALT .vsg-seg:hover{color:var(--vsg-text);}' +
    '.vsg.SALT .vsg-seg[aria-checked=true]{color:var(--vsg-accent);font-weight:600;}' +
    '.vsg.SALT .vsg-seg[disabled]{opacity:.45;cursor:not-allowed;}' +
    '.vsg.SALT .vsg-seg[disabled]:hover{color:var(--vsg-muted);}' +
    '.vsg.SALT .vsg-seg:focus{outline:none;}' +
    '.vsg.SALT .vsg-seg:focus-visible{outline:2px solid var(--vsg-accent);' +
      'outline-offset:-2px;}' +
    '.vsg.SALT .vsg-icon{flex:none;display:grid;place-items:center;}' +
    '.vsg.SALT .vsg-icon svg{display:block;}' +
    '.vsg.SALT .vsg-label{overflow:hidden;text-overflow:ellipsis;}' +
    /* the thumb — one element that slides behind the checked segment
       (JS sets transform/width/height; hidden until first measure) */
    '.vsg.SALT .vsg-thumb{position:absolute;top:0;left:0;z-index:0;width:0;height:0;' +
      'background:var(--vsg-bg);border-radius:calc(var(--vsg-radius) - 3px);' +
      'box-shadow:var(--vsg-shadow);opacity:0;pointer-events:none;}' +
    '.vsg.SALT .vsg-thumb.vsg-thumb-on{opacity:1;}' +
    /* transitions only after the first placement, so init never animates */
    '.vsg.SALT.vsg-ready .vsg-thumb{transition:transform .18s cubic-bezier(.4,0,.2,1),' +
      'width .18s cubic-bezier(.4,0,.2,1),height .18s cubic-bezier(.4,0,.2,1);}' +
    /* small size */
    '.vsg.SALT.vsg-sm{padding:2px;}' +
    '.vsg.SALT.vsg-sm .vsg-seg{font-size:13px;padding:4px 10px;gap:6px;' +
      'border-radius:calc(var(--vsg-radius) - 2px);}' +
    '.vsg.SALT.vsg-sm .vsg-thumb{border-radius:calc(var(--vsg-radius) - 2px);}' +
    /* whole-control disabled */
    '.vsg.SALT.vsg-disabled{opacity:.55;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsg.SALT .vsg-seg,.vsg.SALT .vsg-thumb{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set Segmented.salt to your own token / false
  // BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Segmented.salt;
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
    // Insert before the page's own CSS so `.vsg { --vsg-* }` overrides win the cascade.
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

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    return out;
  }

  // Options → [{value, label, icon, iconOnly, disabled}]. Labels are TEXT
  // (rendered with textContent); `icon` is a TRUSTED SVG string — same
  // trust model as Toast's built-in icons. An option with an icon and no
  // label (or `iconOnly: true`) renders icon-only; its label/value becomes
  // the segment's aria-label.
  function normalizeOptions(list) {
    var out = [], i;
    for (i = 0; i < (list ? list.length : 0); i++) {
      var it = list[i];
      if (it == null) continue;
      if (typeof it !== 'object') {
        out.push({ value: it, label: String(it), icon: null, iconOnly: false, disabled: false });
        continue;
      }
      var value = it.value !== undefined ? it.value : it.label;
      var label = it.label != null ? String(it.label) : String(value);
      out.push({
        value: value,
        label: label,
        icon: it.icon || null,
        iconOnly: !!it.icon && (it.iconOnly === true || it.label == null),
        disabled: !!it.disabled
      });
    }
    return out;
  }

  // Enhance mode: each direct <button> child becomes an option — label
  // from its textContent, value from data-value || text, disabled respected.
  function parseButtons(container) {
    var out = [], kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName !== 'BUTTON') continue;
      var label = (kids[i].textContent || '').replace(/^\s+|\s+$/g, '');
      out.push({
        value: kids[i].getAttribute('data-value') || label,
        label: label,
        icon: null,
        iconOnly: false,
        disabled: kids[i].disabled || kids[i].hasAttribute('disabled')
      });
    }
    return out;
  }

  var DEFAULTS = {
    options: null,        // [{value, label, icon?, iconOnly?, disabled?}] | ['a','b'] shorthand
    value: undefined,     // initial value; default = first enabled option
    name: null,           // hidden <input name> carrying the value for forms
    size: 'md',           // 'sm' | 'md'
    fullWidth: false,     // stretch segments evenly across the container
    label: null,          // aria-label for the radiogroup
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    styles: true,         // false = headless: no CSS injected, style .vsg-* yourself
    onChange: null,       // fn(value, instance)
    labels: { group: 'Options' } // fallback group name when none is provided
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    options: [],
    index: -1,
    getValue: function () { return null; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    update: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Segmented.
   * ------------------------------------------------------------------ */

  function Segmented(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Segmented: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this.index = -1;
    this.segs = [];
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._orig = [];    // original child nodes, put back on destroy
    this._built = [];   // nodes we created, removed on destroy/update
    this._disabledAll = false;
    this._destroyed = false;

    // Enhance mode: no options given → read them from the existing buttons.
    var given = this.opts.options && this.opts.options.length;
    this.options = given ? normalizeOptions(this.opts.options) : parseButtons(el);
    if (!this.options.length) {
      throw new Error('Segmented: no options given and no <button> children found');
    }

    if (this.opts.styles !== false) injectStyles();

    // Stash whatever was inside (the enhanced buttons, stray whitespace);
    // destroy() puts it all back exactly as it was.
    while (el.firstChild) this._orig.push(el.removeChild(el.firstChild));

    this._wire();
    this._renderDom();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._setIndex(this._initialIndex(this.opts.value), false);

    // Re-measure once styles/layout have settled, then arm the thumb
    // transition — the first placement itself must never animate.
    var self = this;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (self._destroyed) return;
        self._moveThumb();
        self._addClass(self.el, 'vsg-ready');
      });
    });
  }

  Segmented.prototype = {
    constructor: Segmented,

    /* ---------------- attribute bookkeeping ---------------- */

    _record: function (el, name) {
      var s = this._saved;
      for (var i = 0; i < s.length; i++) {
        if (s[i].el === el && s[i].name === name) return;
      }
      s.push({ el: el, name: name, value: el.getAttribute(name) });
    },

    _setAttr: function (el, name, value) {
      this._record(el, name);
      el.setAttribute(name, value);
    },

    _addClass: function (el, cls) {
      el.classList.add(cls);
      this._classes.push([el, cls]);
    },

    /* ---------------- setup ---------------- */

    _wire: function () {
      var s = saltToken();
      this._addClass(this.el, 'vsg');
      if (s) this._addClass(this.el, s);
      if (this.opts.size === 'sm') this._addClass(this.el, 'vsg-sm');
      if (this.opts.fullWidth) this._addClass(this.el, 'vsg-full');
      this._setAttr(this.el, 'role', 'radiogroup');
      // A radiogroup needs an accessible name; never clobber one the
      // author already provided.
      if (this.opts.label) {
        this._setAttr(this.el, 'aria-label', String(this.opts.label));
      } else if (!this.el.getAttribute('aria-label') &&
                 !this.el.getAttribute('aria-labelledby')) {
        this._setAttr(this.el, 'aria-label', DEFAULTS.labels.group);
      }
    },

    // Build thumb + segments + optional hidden input into the container.
    _renderDom: function () {
      var el = this.el, i;
      this.segs = [];

      this._thumb = document.createElement('span');
      this._thumb.className = 'vsg-thumb';
      this._thumb.setAttribute('aria-hidden', 'true');
      el.appendChild(this._thumb);
      this._built.push(this._thumb);

      for (i = 0; i < this.options.length; i++) {
        var opt = this.options[i];
        var btn = document.createElement('button');
        btn.type = 'button'; // never submits a surrounding form
        btn.className = 'vsg-seg';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('data-value', String(opt.value));
        if (opt.disabled) btn.disabled = true;
        if (opt.icon) {
          var ic = document.createElement('span');
          ic.className = 'vsg-icon';
          ic.setAttribute('aria-hidden', 'true');
          ic.innerHTML = opt.icon; // trusted SVG string, like Toast's icons
          btn.appendChild(ic);
        }
        if (opt.iconOnly) {
          btn.setAttribute('aria-label', opt.label);
        } else {
          var lb = document.createElement('span');
          lb.className = 'vsg-label';
          lb.textContent = opt.label; // labels are TEXT, always
          btn.appendChild(lb);
        }
        el.appendChild(btn);
        this._built.push(btn);
        this.segs.push(btn);
      }

      this.input = null;
      if (this.opts.name) {
        this.input = document.createElement('input');
        this.input.type = 'hidden';
        this.input.name = String(this.opts.name);
        el.appendChild(this.input);
        this._built.push(this.input);
      }
    },

    // Remove everything _renderDom built (used by update() and destroy()).
    _teardownDom: function () {
      for (var i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      this._built = [];
      this.segs = [];
      this._thumb = null;
      this.input = null;
    },

    _bind: function () {
      var self = this;
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this._onResize = function () { self._moveThumb(); };
      this.el.addEventListener('click', this._onClick);
      this.el.addEventListener('keydown', this._onKeydown);
      window.addEventListener('resize', this._onResize);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _indexOfValue: function (v) {
      for (var i = 0; i < this.options.length; i++) {
        if (this.options[i].value === v) return i;
      }
      // Forgiving second pass: '2' matches 2, etc. (data-attribute init
      // and hidden-input round-trips are string-typed).
      for (i = 0; i < this.options.length; i++) {
        if (String(this.options[i].value) === String(v)) return i;
      }
      return -1;
    },

    _firstEnabled: function () {
      for (var i = 0; i < this.options.length; i++) {
        if (!this.options[i].disabled) return i;
      }
      return -1;
    },

    _initialIndex: function (value) {
      var i = value !== undefined ? this._indexOfValue(value) : -1;
      if (i === -1 || this.options[i].disabled) i = this._firstEnabled();
      return i;
    },

    // Next enabled index from `from` in `dir`, wrapping; `from` if none.
    _step: function (from, dir) {
      var n = this.options.length;
      for (var k = 1; k <= n; k++) {
        var j = ((from + dir * k) % n + n) % n;
        if (!this.options[j].disabled) return j;
      }
      return from;
    },

    _segFromEvent: function (e) {
      var node = e.target;
      while (node && node !== this.el) {
        if (this.segs.indexOf(node) !== -1) return node;
        node = node.parentNode;
      }
      return null;
    },

    _handleClick: function (e) {
      if (this._disabledAll) return;
      var seg = this._segFromEvent(e);
      if (!seg) return;
      var i = this.segs.indexOf(seg);
      if (this.options[i].disabled) return;
      this._setIndex(i, true);
    },

    // Radio semantics: arrows MOVE FOCUS AND SELECT (all four arrows work,
    // so the control behaves in any layout); Home/End jump to the first/
    // last enabled segment; disabled segments are skipped.
    _handleKeydown: function (e) {
      if (this._disabledAll || e.altKey || e.ctrlKey || e.metaKey) return;
      var seg = this._segFromEvent(e);
      if (!seg) return;
      var i = this.segs.indexOf(seg);
      var j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = this._step(i, 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = this._step(i, -1);
      else if (e.key === 'Home') j = this._step(this.options.length - 1, 1); // first enabled
      else if (e.key === 'End') j = this._step(0, -1);                       // last enabled
      else return; // Space/Enter → native button click → _handleClick
      e.preventDefault();
      this.segs[j].focus();
      this._setIndex(j, true);
    },

    // Slide the thumb behind the checked segment. Called on select, on
    // window resize, and once post-init after layout settles.
    _moveThumb: function () {
      if (!this._thumb) return;
      var seg = this.segs[this.index];
      if (!seg) {
        this._thumb.classList.remove('vsg-thumb-on');
        return;
      }
      var s = this._thumb.style;
      s.width = seg.offsetWidth + 'px';
      s.height = seg.offsetHeight + 'px';
      s.transform = 'translate(' + seg.offsetLeft + 'px,' + seg.offsetTop + 'px)';
      this._thumb.classList.add('vsg-thumb-on');
    },

    _setIndex: function (i, fire) {
      if (i == null || i < 0 || i >= this.options.length) return this;
      if (this.options[i].disabled) return this;
      var prev = this.index;
      this.index = i;
      for (var j = 0; j < this.segs.length; j++) {
        var on = j === i;
        this.segs[j].setAttribute('aria-checked', on ? 'true' : 'false');
        this.segs[j].setAttribute('tabindex', on ? '0' : '-1'); // roving tabindex
      }
      if (this.input) this.input.value = String(this.options[i].value);
      this._moveThumb();
      if (fire && prev !== i) {
        var value = this.options[i].value;
        if (this.opts.onChange) this.opts.onChange(value, this);
        this.el.dispatchEvent(new CustomEvent('segmented:change', {
          bubbles: true,
          detail: { value: value, segmented: this }
        }));
      }
      return this;
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.index >= 0 ? this.options[this.index].value : null;
    },

    setValue: function (v, o) {
      var i = this._indexOfValue(v);
      if (i === -1) return this;
      return this._setIndex(i, !(o && o.silent));
    },

    enable: function () {
      if (!this._disabledAll) return this;
      this._disabledAll = false;
      this.el.classList.remove('vsg-disabled');
      this.el.removeAttribute('aria-disabled');
      for (var i = 0; i < this.segs.length; i++) {
        this.segs[i].disabled = this.options[i].disabled; // per-option state survives
      }
      if (this.input) this.input.disabled = false;
      return this;
    },

    disable: function () {
      if (this._disabledAll) return this;
      this._disabledAll = true;
      this.el.classList.add('vsg-disabled');
      this.el.setAttribute('aria-disabled', 'true');
      for (var i = 0; i < this.segs.length; i++) this.segs[i].disabled = true;
      if (this.input) this.input.disabled = true; // disabled controls don't submit
      return this;
    },

    // Replace the option set; the current value is kept when it still
    // exists and is enabled, otherwise selection falls back to the first
    // enabled option. Never fires onChange.
    update: function (options) {
      if (!this.el) return this;
      var prevValue = this.index >= 0 ? this.options[this.index].value : undefined;
      this.options = normalizeOptions(options);
      this.index = -1;
      this._teardownDom();
      this._renderDom();
      this._setIndex(this._initialIndex(prevValue), false);
      if (this._disabledAll) { this._disabledAll = false; this.disable(); }
      return this;
    },

    destroy: function () {
      if (!this.el || this._destroyed) return this;
      this._destroyed = true;
      unwatchAutoTheme(this);
      this.el.removeEventListener('click', this._onClick);
      this.el.removeEventListener('keydown', this._onKeydown);
      window.removeEventListener('resize', this._onResize);
      this._teardownDom();
      // Put the original children back (enhance mode restores its buttons) …
      for (var i = 0; i < this._orig.length; i++) this.el.appendChild(this._orig[i]);
      this._orig = [];
      // … then every attribute we touched, then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      this.el.classList.remove('vsg-disabled'); // in case disable() was on
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Segmented.version = VERSION;
  Segmented.defaults = DEFAULTS;

  Segmented.create = function (target, options) {
    return new Segmented(target, options);
  };

  Segmented.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.value != null && d.value !== '') o.value = d.value;
    if (d.name) o.name = d.name;
    if (d.size) o.size = d.size;
    if (d.fullWidth != null) o.fullWidth = parseBool(d.fullWidth);
    if (d.label) o.label = d.label;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Segmented.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsg]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Segmented(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Segmented auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Segmented.autoInit(); });
    } else {
      Segmented.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Segmented.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Segmented, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Segmented.css = renderCss();
  }
  Segmented.displayName = 'Segmented';
  Segmented.rootClass = 'vsg';
  Segmented.themeVars = {
    accent: '--vsg-accent',
    radius: '--vsg-radius',
    font: '--vsg-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Segmented.varScopes = ['.vsg', '.vsg[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('segmented', Segmented);
  }

  return Segmented;
});

}).call(__root);
var Segmented = __root.Segmented;
export { Segmented };
export default Segmented;
