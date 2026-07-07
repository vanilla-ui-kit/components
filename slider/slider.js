/*!
 * Vanilla UI Kit Slider v1.0.0
 * A single-file, zero-dependency range slider for vanilla JS — single or
 * dual thumb. Part of the Vanilla UI Kit family — standalone, or converges
 * with the VC core when it is present.
 *
 * Quick start:
 *   <script src="slider.js"></script>
 *   <div id="volume"></div>
 *   <script>new Slider('#volume', { value: 40 })</script>
 *
 * Dual thumb:
 *   new Slider('#price', { value: [20, 80], prefix: '$' })
 *
 * Or replace a native input (hidden, kept synced for forms):
 *   new Slider(document.querySelector('input[type=range]'))
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Slider = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-slider-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Slider.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Slider.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the slider; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vsld{--vsld-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsld{' +
      '--vsld-accent:#5b5bd6;' +
      '--vsld-bg:#ffffff;' +
      '--vsld-text:#1c1d21;' +
      '--vsld-muted:#72747e;' +
      '--vsld-faint:#e7e7ec;' +
      '--vsld-shadow:0 1px 4px rgba(24,25,32,.14),0 1px 2px rgba(24,25,32,.08);' +
      '--vsld-radius:8px;' +
      '--vsld-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsld[data-theme=dark]{' +
      '--vsld-accent:#7b7bea;' +
      '--vsld-bg:#1b1d24;' +
      '--vsld-text:#e9eaf0;' +
      '--vsld-muted:#989aa6;' +
      '--vsld-faint:#31343f;' +
      '--vsld-shadow:0 1px 4px rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.35);}' +
    '.vsld.SALT{position:relative;box-sizing:border-box;' +
      'font-family:var(--vsld-font);font-size:13px;color:var(--vsld-text);' +
      'padding:12px 0;-webkit-tap-highlight-color:transparent;}' +
    '.vsld.SALT *,.vsld.SALT *::before,.vsld.SALT *::after{box-sizing:border-box;}' +
    /* room for the value bubble / mark labels when they are always present */
    '.vsld.SALT.vsld-tip-always{padding-top:36px;}' +
    '.vsld.SALT.vsld-has-labels{padding-bottom:26px;}' +
    /* the rail — percent-positioned children, fat invisible hit area */
    '.vsld.SALT .vsld-track{position:relative;height:5px;margin:0 9px;' +
      'border-radius:999px;background:var(--vsld-faint);cursor:pointer;' +
      'touch-action:none;-webkit-user-select:none;user-select:none;}' +
    '.vsld.SALT .vsld-track::before{content:"";position:absolute;' +
      'left:-9px;right:-9px;top:-12px;bottom:-12px;}' +
    '.vsld.SALT .vsld-fill{position:absolute;left:0;top:0;bottom:0;' +
      'border-radius:999px;background:var(--vsld-accent);' +
      'transition:left .1s ease,width .1s ease,bottom .1s ease,height .1s ease;}' +
    /* thumbs — centered on their percent via negative margins so transform
       stays free for the press scale */
    '.vsld.SALT .vsld-thumb{position:absolute;top:50%;left:0;width:18px;height:18px;' +
      'margin:-9px 0 0 -9px;border-radius:50%;background:var(--vsld-bg);' +
      'border:2px solid var(--vsld-accent);box-shadow:var(--vsld-shadow);' +
      'cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;' +
      'transition:left .1s ease,bottom .1s ease,transform .12s ease,box-shadow .12s ease;}' +
    '.vsld.SALT .vsld-thumb.vsld-active{cursor:grabbing;transform:scale(1.15);}' +
    '.vsld.SALT .vsld-thumb:focus{outline:none;}' +
    '.vsld.SALT .vsld-thumb:focus-visible{outline:2px solid var(--vsld-accent);' +
      'outline-offset:2px;}' +
    '.vsld.SALT.vsld-dragging .vsld-thumb,.vsld.SALT.vsld-dragging .vsld-fill{' +
      'transition:none;}' +
    /* step / labeled marks — a zero-size anchor point; the dot rides a
       ::before so its opacity never dims the label */
    '.vsld.SALT .vsld-mark{position:absolute;top:50%;left:0;width:0;height:0;' +
      'pointer-events:none;}' +
    '.vsld.SALT .vsld-mark::before{content:"";position:absolute;' +
      'left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:50%;' +
      'background:var(--vsld-muted);opacity:.55;}' +
    '.vsld.SALT .vsld-mark-label{position:absolute;top:10px;left:0;' +
      'transform:translateX(-50%);font-size:12px;line-height:1.2;' +
      'color:var(--vsld-muted);white-space:nowrap;}' +
    /* the value bubble above the thumb (beside it when vertical) */
    '.vsld.SALT .vsld-tip{position:absolute;left:50%;bottom:100%;' +
      'transform:translate(-50%,-7px);background:var(--vsld-text);' +
      'color:var(--vsld-bg);font-size:12px;font-weight:600;line-height:1;' +
      'padding:5px 8px;border-radius:var(--vsld-radius);white-space:nowrap;' +
      'pointer-events:none;opacity:0;transition:opacity .12s ease;}' +
    '.vsld.SALT .vsld-tip::after{content:"";position:absolute;top:100%;left:50%;' +
      'margin-left:-4px;border:4px solid transparent;' +
      'border-top-color:var(--vsld-text);}' +
    '.vsld.SALT .vsld-thumb.vsld-active .vsld-tip,' +
    '.vsld.SALT .vsld-thumb:focus-visible .vsld-tip,' +
    '.vsld.SALT.vsld-tip-always .vsld-tip{opacity:1;}' +
    /* vertical — rail runs bottom → top, bubble rides the right side */
    '.vsld.SALT.vsld-vertical{display:inline-block;height:200px;width:42px;' +
      'padding:0;vertical-align:top;}' +
    '.vsld.SALT.vsld-vertical .vsld-track{width:5px;height:calc(100% - 18px);' +
      'margin:9px auto;}' +
    '.vsld.SALT.vsld-vertical .vsld-fill{left:0;right:0;top:auto;}' +
    '.vsld.SALT.vsld-vertical .vsld-thumb{top:auto;left:50%;bottom:0;' +
      'margin:0 0 -9px -9px;}' +
    '.vsld.SALT.vsld-vertical .vsld-mark{top:auto;left:50%;}' +
    '.vsld.SALT.vsld-vertical .vsld-mark-label{top:0;left:12px;' +
      'transform:translateY(-50%);}' +
    '.vsld.SALT.vsld-vertical .vsld-tip{left:100%;bottom:50%;' +
      'transform:translate(9px,50%);}' +
    '.vsld.SALT.vsld-vertical .vsld-tip::after{top:50%;left:auto;right:100%;' +
      'margin:-4px 0 0;border-color:transparent;' +
      'border-right-color:var(--vsld-text);}' +
    /* disabled */
    '.vsld.SALT.vsld-disabled{opacity:.5;}' +
    '.vsld.SALT.vsld-disabled .vsld-track,' +
    '.vsld.SALT.vsld-disabled .vsld-thumb{cursor:not-allowed;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsld.SALT .vsld-thumb,.vsld.SALT .vsld-fill,.vsld.SALT .vsld-tip{' +
        'transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/slider.css), or set Slider.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Slider.salt;
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
    // Insert before the page's own CSS so `.vsld { --vsld-* }` overrides win the cascade.
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

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function decimals(n) {
    var s = String(n), i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }

  function roundTo(v, dec) {
    var p = Math.pow(10, dec);
    return Math.round(v * p) / p;
  }

  // Dispatch a plain DOM event ('input'/'change') on a synced form control.
  function fireNative(input, type) {
    var ev;
    try {
      ev = new Event(type, { bubbles: true });
    } catch (err) {
      ev = document.createEvent('HTMLEvents');
      ev.initEvent(type, true, false);
    }
    input.dispatchEvent(ev);
  }

  // Normalize IE/legacy key names to the modern ones we switch on.
  function keyName(e) {
    var k = e.key;
    if (k === 'Left') return 'ArrowLeft';
    if (k === 'Right') return 'ArrowRight';
    if (k === 'Up') return 'ArrowUp';
    if (k === 'Down') return 'ArrowDown';
    return k;
  }

  var DEFAULTS = {
    min: 0,
    max: 100,
    step: 1,
    value: null,        // number = single thumb; [a, b] = dual; null → min
    marks: false,       // true = one per step (when ≤ 20 steps) | {value: 'label'}
    tooltip: 'drag',    // 'drag' (while dragging/focused) | 'always' | false
    format: null,       // fn(value) → string, used in tooltip + aria-valuetext
    prefix: '',         // shorthand when no `format` given: prefix + v + suffix
    suffix: '',
    vertical: false,    // bottom → top rail; ArrowUp still increases
    disabled: false,
    name: null,         // hidden input(s): '<name>' single, '<name>[]' dual
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vsld-* yourself
    onInput: null,      // fn(value, slider) — every move
    onChange: null,     // fn(value, slider) — on release / commit
    labels: { value: 'Value', min: 'Minimum value', max: 'Maximum value' }
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    track: null,
    thumbs: [],
    values: [],
    getValue: function () { return null; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Slider.
   * ------------------------------------------------------------------ */

  function Slider(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Slider: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.opts = assignOptions({}, DEFAULTS, options);
    this.opts.labels = assignOptions({}, DEFAULTS.labels, options.labels || {});
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._built = [];   // elements we created — removed on destroy
    this._hiddens = []; // hidden form inputs we own
    this._active = -1;  // thumb index during a drag
    this._target = el;

    // Replace mode: an <input> target is hidden and kept synced for forms;
    // its min/max/step/value/disabled attributes seed any omitted options.
    if (el.tagName === 'INPUT') {
      this.input = el;
      this._adoptInput(options);
      this.el = document.createElement('div');
      if (el.parentNode) el.parentNode.insertBefore(this.el, el.nextSibling);
      this._built.push(this.el);
      this._record(el, 'hidden');
      this._record(el, 'disabled');
      el.setAttribute('hidden', '');
    } else {
      this.input = null;
      this.el = el;
    }

    this._normalize();
    if (this.opts.styles !== false) injectStyles();

    this._wire();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) {
      instances.set(el, this);
      if (this.el !== el) instances.set(this.el, this);
    }

    this._paint();
    this._syncInputs();
    this._syncAria();
    if (this.opts.disabled) this.disable();
  }

  Slider.prototype = {
    constructor: Slider,

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
      if (el.classList.contains(cls)) return;
      el.classList.add(cls);
      this._classes.push([el, cls]);
    },

    /* ---------------- option normalization ---------------- */

    // Seed omitted options from the replaced input's own attributes.
    _adoptInput: function (options) {
      var input = this.input, o = this.opts;
      if (options.min === undefined && input.getAttribute('min') != null) {
        o.min = parseFloat(input.getAttribute('min'));
      }
      if (options.max === undefined && input.getAttribute('max') != null) {
        o.max = parseFloat(input.getAttribute('max'));
      }
      if (options.step === undefined && input.getAttribute('step') != null) {
        o.step = parseFloat(input.getAttribute('step'));
      }
      if (options.disabled === undefined && input.disabled) o.disabled = true;
      if (options.value === undefined && input.value !== '') {
        o.value = input.value.indexOf(',') !== -1
          ? [parseFloat(input.value.split(',')[0]), parseFloat(input.value.split(',')[1])]
          : parseFloat(input.value);
      }
    },

    _normalize: function () {
      var o = this.opts;
      o.min = isFinite(+o.min) ? +o.min : 0;
      o.max = isFinite(+o.max) ? +o.max : 100;
      if (o.max < o.min) { var t = o.min; o.min = o.max; o.max = t; }
      o.step = +o.step;
      if (!(o.step > 0)) o.step = 1;
      // Enough decimals to represent any snapped value exactly.
      this._dec = Math.max(decimals(o.step), decimals(o.min));

      var v = o.value;
      this.dual = isArray(v);
      if (this.dual) {
        var a = isFinite(+v[0]) ? +v[0] : o.min;
        var b = isFinite(+v[1]) ? +v[1] : o.max;
        if (a > b) { var s = a; a = b; b = s; }
        this.values = [this._snap(a), this._snap(b)];
        if (this.values[0] > this.values[1]) this.values[1] = this.values[0];
      } else {
        this.values = [this._snap(v == null || !isFinite(+v) ? o.min : +v)];
      }

      this._format = typeof o.format === 'function' ? o.format : null;
    },

    // Snap to the step grid (anchored at min), then clamp to [min, max].
    _snap: function (v) {
      var o = this.opts;
      v = o.min + Math.round((v - o.min) / o.step) * o.step;
      v = roundTo(v, this._dec);
      return Math.min(o.max, Math.max(o.min, v));
    },

    _pct: function (v) {
      var o = this.opts, span = o.max - o.min;
      var p = span > 0 ? (v - o.min) / span * 100 : 0;
      return Math.round(p * 10000) / 10000;
    },

    _fmt: function (v) {
      if (this._format) return String(this._format(v));
      return this.opts.prefix + v + this.opts.suffix;
    },

    /* ---------------- setup ---------------- */

    _wire: function () {
      var o = this.opts, s = saltToken(), i;
      this._addClass(this.el, 'vsld');
      if (s) this._addClass(this.el, s);
      if (o.vertical) this._addClass(this.el, 'vsld-vertical');
      if (o.tooltip === 'always') this._addClass(this.el, 'vsld-tip-always');

      this.track = document.createElement('div');
      this.track.className = 'vsld-track';

      this.fill = document.createElement('div');
      this.fill.className = 'vsld-fill';
      this.track.appendChild(this.fill);

      this._buildMarks();

      this.thumbs = [];
      this.tips = [];
      for (i = 0; i < this.values.length; i++) this._buildThumb(i);

      this.el.appendChild(this.track);
      if (this.el === this._target) this._built.push(this.track);

      // Hidden input(s) for plain form posts when we didn't replace one:
      // '<name>' for a single value, '<name>[]' twice for a range.
      if (!this.input && o.name) {
        var n = this.dual
          ? (/\[\]$/.test(o.name) ? o.name : o.name + '[]')
          : o.name;
        for (i = 0; i < this.values.length; i++) {
          var hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = n;
          this.el.appendChild(hidden);
          if (this.el === this._target) this._built.push(hidden);
          this._hiddens.push(hidden);
        }
      }
    },

    _buildThumb: function (i) {
      var o = this.opts;
      var th = document.createElement('div');
      th.className = 'vsld-thumb';
      th.setAttribute('role', 'slider');
      th.setAttribute('tabindex', '0');
      th.setAttribute('aria-label', this.dual
        ? (i === 0 ? o.labels.min : o.labels.max)
        : o.labels.value);
      if (o.vertical) th.setAttribute('aria-orientation', 'vertical');
      if (o.tooltip !== false && o.tooltip !== 'false') {
        var tip = document.createElement('div');
        tip.className = 'vsld-tip';
        tip.setAttribute('aria-hidden', 'true');
        th.appendChild(tip);
        this.tips[i] = tip;
      }
      this.track.appendChild(th);
      this.thumbs[i] = th;
    },

    // marks: true → a tick per step when the grid stays readable (≤ 20
    // steps); object → {value: label} ticks with text below/beside the rail.
    _buildMarks: function () {
      var o = this.opts, marks = o.marks, list = [], i, v;
      if (!marks) return;
      if (marks === true) {
        var n = (o.max - o.min) / o.step;
        if (n < 1 || n > 20) return;
        for (i = 0; i <= Math.floor(n + 1e-9); i++) {
          list.push({ value: roundTo(o.min + i * o.step, this._dec), label: null });
        }
      } else if (typeof marks === 'object') {
        for (var key in marks) {
          v = parseFloat(key);
          if (isFinite(v) && v >= o.min && v <= o.max) {
            list.push({ value: v, label: marks[key] });
          }
        }
      }
      var hasLabels = false;
      for (i = 0; i < list.length; i++) {
        var mark = document.createElement('span');
        mark.className = 'vsld-mark';
        mark.style[o.vertical ? 'bottom' : 'left'] = this._pct(list[i].value) + '%';
        if (list[i].label != null) {
          hasLabels = true;
          var label = document.createElement('span');
          label.className = 'vsld-mark-label';
          label.textContent = String(list[i].label);
          mark.appendChild(label);
        }
        this.track.appendChild(mark);
      }
      if (hasLabels && !o.vertical) this._addClass(this.el, 'vsld-has-labels');
    },

    _bind: function () {
      var self = this, i;
      this._onDown = function (e) { self._pointerDown(e); };
      this._onMove = function (e) { self._pointerMove(e); };
      this._onUp = function (e) { self._pointerUp(e); };

      if (window.PointerEvent) {
        this.track.addEventListener('pointerdown', this._onDown);
      } else {
        // Legacy fallback — same handlers, document-level move/up.
        this.track.addEventListener('mousedown', this._onDown);
        this.track.addEventListener('touchstart', this._onDown);
      }

      for (i = 0; i < this.thumbs.length; i++) {
        (function (idx) {
          self.thumbs[idx].addEventListener('keydown', function (e) {
            self._handleKeydown(e, idx);
          });
        })(i);
      }
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- pointer interaction ---------------- */

    _point: function (e) {
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e.changedTouches && e.changedTouches.length) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    },

    _valueFromPoint: function (pt) {
      var o = this.opts, r = this.track.getBoundingClientRect(), ratio;
      if (o.vertical) ratio = r.height ? (r.bottom - pt.y) / r.height : 0;
      else ratio = r.width ? (pt.x - r.left) / r.width : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      return o.min + ratio * (o.max - o.min);
    },

    // The thumb a press should drive: a directly-hit thumb wins; otherwise
    // the one whose value is nearest (ties break outward so overlapping
    // thumbs can still be pulled apart).
    _thumbFor: function (v, target) {
      for (var i = 0; i < this.thumbs.length; i++) {
        if (this.thumbs[i] === target || this.thumbs[i].contains(target)) return i;
      }
      if (!this.dual) return 0;
      var d0 = Math.abs(v - this.values[0]);
      var d1 = Math.abs(v - this.values[1]);
      if (d0 < d1) return 0;
      if (d1 < d0) return 1;
      return v < this.values[0] ? 0 : 1;
    },

    _pointerDown: function (e) {
      if (this._disabled || this._active !== -1) return;
      if (e.type !== 'touchstart' && e.button != null && e.button !== 0) return;
      var pt = this._point(e);
      var v = this._valueFromPoint(pt);
      var onThumb = false, i;
      for (i = 0; i < this.thumbs.length; i++) {
        if (this.thumbs[i] === e.target || this.thumbs[i].contains(e.target)) onThumb = true;
      }
      i = this._thumbFor(v, e.target);
      this._active = i;
      this._startValues = this.values.slice();
      this.el.classList.add('vsld-dragging');
      this.thumbs[i].classList.add('vsld-active');
      try { this.thumbs[i].focus(); } catch (err) {}

      // Track press: the NEAREST thumb jumps to the pointer, then drags.
      if (!onThumb) this._setThumb(i, v, true);

      if (e.type === 'pointerdown') {
        if (this.track.setPointerCapture) {
          try { this.track.setPointerCapture(e.pointerId); } catch (err) {}
        }
        this.track.addEventListener('pointermove', this._onMove);
        this.track.addEventListener('pointerup', this._onUp);
        this.track.addEventListener('pointercancel', this._onUp);
      } else if (e.type === 'touchstart') {
        document.addEventListener('touchmove', this._onMove);
        document.addEventListener('touchend', this._onUp);
        document.addEventListener('touchcancel', this._onUp);
      } else {
        document.addEventListener('mousemove', this._onMove);
        document.addEventListener('mouseup', this._onUp);
      }
      e.preventDefault(); // no text selection / page scroll from a drag
    },

    _pointerMove: function (e) {
      if (this._active === -1) return;
      this._setThumb(this._active, this._valueFromPoint(this._point(e)), true);
      if (e.type === 'touchmove') e.preventDefault();
    },

    _pointerUp: function (e) {
      if (this._active === -1) return;
      var i = this._active;
      this._active = -1;
      this.el.classList.remove('vsld-dragging');
      this.thumbs[i].classList.remove('vsld-active');
      if (e && e.type === 'pointerup' && this.track.releasePointerCapture) {
        try { this.track.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      this._unbindDrag();
      // Commit: onChange only when the release leaves a different value.
      var start = this._startValues || [];
      for (var j = 0; j < this.values.length; j++) {
        if (this.values[j] !== start[j]) { this._fireChange(); break; }
      }
    },

    _unbindDrag: function () {
      this.track.removeEventListener('pointermove', this._onMove);
      this.track.removeEventListener('pointerup', this._onUp);
      this.track.removeEventListener('pointercancel', this._onUp);
      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup', this._onUp);
      document.removeEventListener('touchmove', this._onMove);
      document.removeEventListener('touchend', this._onUp);
      document.removeEventListener('touchcancel', this._onUp);
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e, i) {
      if (this._disabled || e.altKey || e.ctrlKey || e.metaKey) return;
      var o = this.opts, v = this.values[i], next = null;
      switch (keyName(e)) {
        case 'ArrowLeft': case 'ArrowDown': next = v - o.step; break;
        case 'ArrowRight': case 'ArrowUp': next = v + o.step; break;
        case 'PageUp': next = v + o.step * 10; break;
        case 'PageDown': next = v - o.step * 10; break;
        case 'Home': next = o.min; break;
        case 'End': next = o.max; break;
        default: return;
      }
      e.preventDefault();
      // A key press is both a move and a commit.
      if (this._setThumb(i, next, true)) this._fireChange();
    },

    /* ---------------- state ---------------- */

    // Snap + clamp at the sibling thumb (thumbs cannot cross), then paint
    // and (optionally) announce. Returns whether the value changed.
    _setThumb: function (i, v, fire) {
      v = this._snap(v);
      if (this.dual) {
        if (i === 0 && v > this.values[1]) v = this.values[1];
        if (i === 1 && v < this.values[0]) v = this.values[0];
      }
      if (v === this.values[i]) return false;
      this.values[i] = v;
      this._paint();
      this._syncInputs();
      this._syncAria();
      if (fire) this._fireInput();
      return true;
    },

    _paint: function () {
      var o = this.opts, pos = o.vertical ? 'bottom' : 'left', i;
      var lo = this._pct(this.dual ? this.values[0] : o.min);
      var hi = this._pct(this.values[this.values.length - 1]);
      for (i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].style[pos] = this._pct(this.values[i]) + '%';
        if (this.tips[i]) this.tips[i].textContent = this._fmt(this.values[i]);
      }
      this.fill.style[pos] = lo + '%';
      this.fill.style[o.vertical ? 'height' : 'width'] = (hi - lo) + '%';
    },

    _syncInputs: function () {
      var i;
      if (this.input) {
        this.input.value = this.dual ? this.values.join(',') : String(this.values[0]);
      }
      for (i = 0; i < this._hiddens.length; i++) {
        this._hiddens[i].value = String(this.values[i]);
      }
    },

    _syncAria: function () {
      var o = this.opts;
      for (var i = 0; i < this.thumbs.length; i++) {
        var th = this.thumbs[i];
        // Dual thumbs advertise the sibling as their live limit (APG pattern).
        var lo = this.dual && i === 1 ? this.values[0] : o.min;
        var hi = this.dual && i === 0 ? this.values[1] : o.max;
        th.setAttribute('aria-valuemin', String(lo));
        th.setAttribute('aria-valuemax', String(hi));
        th.setAttribute('aria-valuenow', String(this.values[i]));
        th.setAttribute('aria-valuetext', this._fmt(this.values[i]));
      }
    },

    _fireInput: function () {
      if (this.input) fireNative(this.input, 'input');
      if (this.opts.onInput) this.opts.onInput(this.getValue(), this);
      this.el.dispatchEvent(new CustomEvent('slider:input', {
        bubbles: true,
        detail: { value: this.getValue(), slider: this }
      }));
    },

    _fireChange: function () {
      if (this.input) fireNative(this.input, 'change');
      if (this.opts.onChange) this.opts.onChange(this.getValue(), this);
      this.el.dispatchEvent(new CustomEvent('slider:change', {
        bubbles: true,
        detail: { value: this.getValue(), slider: this }
      }));
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.dual ? this.values.slice() : this.values[0];
    },

    setValue: function (v, opts) {
      var changed = false, a, b;
      if (this.dual) {
        if (!isArray(v)) v = [v, v];
        a = this._snap(+v[0]);
        b = this._snap(+v[1]);
        if (a > b) { var t = a; a = b; b = t; }
        changed = a !== this.values[0] || b !== this.values[1];
        this.values[0] = a;
        this.values[1] = b;
      } else {
        a = this._snap(isArray(v) ? +v[0] : +v);
        changed = a !== this.values[0];
        this.values[0] = a;
      }
      this._paint();
      this._syncInputs();
      this._syncAria();
      if (changed && !(opts && opts.silent)) {
        this._fireInput();
        this._fireChange();
      }
      return this;
    },

    enable: function () {
      this._disabled = false;
      this.el.classList.remove('vsld-disabled');
      for (var i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].setAttribute('tabindex', '0');
        this.thumbs[i].removeAttribute('aria-disabled');
      }
      this._syncDisabledInputs(false);
      return this;
    },

    disable: function () {
      this._disabled = true;
      if (this._active !== -1) this._pointerUp(null);
      this._addClass(this.el, 'vsld-disabled');
      for (var i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].setAttribute('tabindex', '-1');
        this.thumbs[i].setAttribute('aria-disabled', 'true');
      }
      this._syncDisabledInputs(true);
      return this;
    },

    // Disabled sliders should not submit — mirror onto the form control(s),
    // exactly like a disabled native <input type=range>.
    _syncDisabledInputs: function (disabled) {
      var all = this._hiddens.concat(this.input ? [this.input] : []);
      for (var i = 0; i < all.length; i++) {
        if (disabled) all[i].setAttribute('disabled', '');
        else all[i].removeAttribute('disabled');
      }
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      if (this._active !== -1) {
        this._active = -1;
        this.el.classList.remove('vsld-dragging');
      }
      this._unbindDrag();
      this.track.removeEventListener('pointerdown', this._onDown);
      this.track.removeEventListener('mousedown', this._onDown);
      this.track.removeEventListener('touchstart', this._onDown);
      var i;
      for (i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      // Put back every attribute we touched (un-hides a replaced input),
      // then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      if (instances) {
        instances.delete(this._target);
        instances.delete(this.el);
      }
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Slider.version = VERSION;
  Slider.defaults = DEFAULTS;

  Slider.create = function (target, options) {
    return new Slider(target, options);
  };

  Slider.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.min != null && d.min !== '') o.min = +d.min;
    if (d.max != null && d.max !== '') o.max = +d.max;
    if (d.step != null && d.step !== '') o.step = +d.step;
    if (d.value != null && d.value !== '') {
      o.value = d.value.indexOf(',') !== -1
        ? [+d.value.split(',')[0], +d.value.split(',')[1]]
        : +d.value;
    }
    if (d.tooltip != null) {
      o.tooltip = (d.tooltip === 'false' || d.tooltip === '0') ? false : d.tooltip;
    }
    if (d.marks != null) {
      if (d.marks === '' || d.marks === 'true') o.marks = true;
      else {
        try { o.marks = JSON.parse(d.marks); } catch (err) { o.marks = true; }
      }
    }
    if (d.vertical != null) o.vertical = parseBool(d.vertical);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    if (d.prefix) o.prefix = d.prefix;
    if (d.suffix) o.suffix = d.suffix;
    if (d.name) o.name = d.name;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Slider.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsld]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Slider(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Slider auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Slider.autoInit(); });
    } else {
      Slider.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Slider.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Slider, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Slider.css = renderCss();
  }
  Slider.displayName = 'Slider';
  Slider.rootClass = 'vsld';
  Slider.themeVars = {
    accent: '--vsld-accent',
    radius: '--vsld-radius',
    font: '--vsld-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Slider.varScopes = ['.vsld', '.vsld[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('slider', Slider);
  }

  return Slider;
});
