/*! vanilla-ui-kit/number v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit NumberInput v1.0.0
 * A single-file, zero-dependency formatted numeric/currency input for
 * vanilla JS. Thousands grouping while you type (caret preserved), commit
 * on blur/Enter with clamp + precision rounding, prefix/suffix adornments,
 * hold-to-repeat steppers. Part of the Vanilla UI Kit family — standalone,
 * or converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="number.js"></script>
 *   <input id="price" value="1234.5">
 *   <script>new NumberInput('#price', { prefix: '$', precision: 2 })</script>
 *
 * Or zero-JS:
 *   <input data-vnum data-prefix="$" data-precision="2">
 *
 * Headless:
 *   NumberInput.defaults.styles = false  // no CSS injected; style .vnum-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NumberInput = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-number-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `NumberInput.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when NumberInput.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vnum{--vnum-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vnum{' +
      '--vnum-accent:#5b5bd6;' +
      '--vnum-bg:#ffffff;' +
      '--vnum-text:#1c1d21;' +
      '--vnum-muted:#72747e;' +
      '--vnum-faint:#e7e7ec;' +
      '--vnum-danger:#e5484d;' +
      '--vnum-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vnum-radius:10px;' +
      '--vnum-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vnum[data-theme=dark]{' +
      '--vnum-accent:#7b7bea;' +
      '--vnum-bg:#1b1d24;' +
      '--vnum-text:#e9eaf0;' +
      '--vnum-muted:#989aa6;' +
      '--vnum-faint:#31343f;' +
      '--vnum-danger:#f2555a;' +
      '--vnum-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    /* field — consistent with the phone/datepicker input look */
    '.vnum.SALT{display:inline-flex;align-items:stretch;position:relative;box-sizing:border-box;' +
      'min-width:150px;background:var(--vnum-bg);color:var(--vnum-text);' +
      'font-family:var(--vnum-font);font-size:14px;line-height:1.3;' +
      'border:1px solid var(--vnum-faint);border-radius:var(--vnum-radius);' +
      'transition:border-color .12s ease,box-shadow .12s ease;}' +
    '.vnum.SALT *,.vnum.SALT *::before,.vnum.SALT *::after{box-sizing:border-box;}' +
    '.vnum.SALT:focus-within{border-color:var(--vnum-accent);box-shadow:0 0 0 3px rgba(91,91,214,.16);}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){' +
      '.vnum.SALT:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--vnum-accent) 18%,transparent);}}' +
    /* live out-of-range warning while typing (commit clamps it away) */
    '.vnum.SALT.vnum-invalid{border-color:var(--vnum-danger);}' +
    '.vnum.SALT.vnum-invalid:focus-within{box-shadow:0 0 0 3px rgba(229,72,77,.16);}' +
    '.vnum.SALT.vnum-disabled{opacity:.55;pointer-events:none;}' +
    /* non-editable adornments */
    '.vnum.SALT .vnum-affix{display:flex;align-items:center;flex:none;color:var(--vnum-muted);' +
      'white-space:pre;-webkit-user-select:none;user-select:none;}' +
    '.vnum.SALT .vnum-prefix{padding-left:10px;}' +
    '.vnum.SALT .vnum-suffix{padding-right:10px;}' +
    /* the text input itself — right-aligned, tabular digits */
    '.vnum.SALT .vnum-input{flex:1;min-width:0;width:100%;font:inherit;color:inherit;' +
      'background:none;border:0;padding:9px 10px;text-align:right;' +
      'font-variant-numeric:tabular-nums;border-radius:var(--vnum-radius);}' +
    '.vnum.SALT .vnum-input:focus{outline:none;}' +
    '.vnum.SALT .vnum-input::placeholder{color:var(--vnum-muted);opacity:.75;}' +
    /* stepper column */
    '.vnum.SALT .vnum-steps{display:flex;flex-direction:column;flex:none;align-self:stretch;' +
      'border-left:1px solid var(--vnum-faint);overflow:hidden;' +
      'border-radius:0 var(--vnum-radius) var(--vnum-radius) 0;}' +
    '.vnum.SALT .vnum-btn{flex:1 1 50%;display:grid;place-items:center;width:26px;min-height:0;' +
      'font:inherit;color:var(--vnum-muted);background:none;border:0;padding:0;margin:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;touch-action:none;}' +
    '.vnum.SALT .vnum-btn:hover{background:var(--vnum-faint);color:var(--vnum-text);}' +
    '.vnum.SALT .vnum-btn:active{color:var(--vnum-accent);}' +
    '.vnum.SALT .vnum-btn svg{display:block;}' +
    '.vnum.SALT .vnum-down{border-top:1px solid var(--vnum-faint);}' +
    '.vnum.SALT .vnum-btn:focus{outline:none;}' +
    '.vnum.SALT .vnum-btn:focus-visible{outline:2px solid var(--vnum-accent);outline-offset:-2px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vnum.SALT,.vnum.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set NumberInput.salt to your own token / false
  // BEFORE the first input is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = NumberInput.salt;
    if (s === false) return '';
    s = s == null ? DEFAULT_SALT : String(s).replace(/[^\w-]/g, '');
    return s || DEFAULT_SALT;
  }

  function saltClass() {
    var s = saltToken();
    return s ? ' ' + s : '';
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
    // Insert before the page's own CSS so `.vnum { --vnum-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICON_UP = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
    '<path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_DOWN = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
    '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var autoThemed = [];

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
    if (core) {
      core.theme.unwatch(refreshAutoThemes);
      return;
    }
    if (ownMql) {
      if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
      else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
    }
    if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Numeric core — pure, Node-safe. These power both the statics
   * (NumberInput.parse/format) and the live instance.
   * ------------------------------------------------------------------ */

  function numOrNull(v) {
    return (v == null || v === '' || isNaN(+v)) ? null : +v;
  }

  // Decimal places of a number, exponent-safe ('5e-7' → 7).
  function decimalsOf(n) {
    var s = String(n), e = s.indexOf('e');
    if (e !== -1) {
      var m = /(?:\.(\d+))?e([+-]?\d+)$/.exec(s);
      return m ? Math.max(0, (m[1] ? m[1].length : 0) - (+m[2])) : 0;
    }
    var d = s.indexOf('.');
    return d === -1 ? 0 : s.length - d - 1;
  }

  // Normalize the formatting-relevant options once; idempotent.
  //   precision: explicit → inferred from step's decimals → null (natural).
  //   decimal:   '.' (default) or ',' — nothing else.
  //   thousands: ','(default) | '.' | ' ' | false; silently swapped to the
  //              other separator when it would collide with `decimal`.
  function normOpts(opts) {
    opts = opts || {};
    var o = {};
    o.min = numOrNull(opts.min);
    o.max = numOrNull(opts.max);
    if (o.min != null && o.max != null && o.min > o.max) {
      var t = o.min; o.min = o.max; o.max = t;
    }
    var st = numOrNull(opts.step);
    o.step = (st != null && st > 0) ? st : (opts.step != null ? 1 : null);
    if (opts.precision != null && !isNaN(+opts.precision)) {
      o.precision = Math.max(0, Math.min(20, Math.floor(+opts.precision)));
    } else {
      o.precision = o.step != null ? Math.min(20, decimalsOf(o.step)) : null;
    }
    o.decimal = opts.decimal === ',' ? ',' : '.';
    var th = opts.thousands;
    if (th === false || th === '') o.thousands = '';
    else if (th == null) o.thousands = ',';
    else o.thousands = String(th).charAt(0);
    if (o.thousands === o.decimal) o.thousands = o.decimal === '.' ? ',' : '.';
    o.prefix = opts.prefix == null ? '' : String(opts.prefix);
    o.suffix = opts.suffix == null ? '' : String(opts.suffix);
    o.allowNegative = opts.allowNegative !== false;
    // A floor at/above zero makes the minus sign pointless — block it early.
    if (o.min != null && o.min >= 0) o.allowNegative = false;
    return o;
  }

  function clampVal(v, o) {
    if (o.min != null && v < o.min) v = o.min;
    if (o.max != null && v > o.max) v = o.max;
    return v;
  }

  function roundTo(v, p) {
    return p == null ? v : Number(v.toFixed(p));
  }

  // Lenient extraction: '$ 1,234.50 kg' → 1234.5 (with matching opts) or
  // null when there is no digit at all. Never clamps, never rounds.
  function parseNum(str, o) {
    var s = String(str == null ? '' : str);
    if (o.thousands) s = s.split(o.thousands).join('');
    var out = '', neg = false, seenDec = false, seenDigit = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch >= '0' && ch <= '9') { out += ch; seenDigit = true; }
      else if (ch === o.decimal && !seenDec) { out += '.'; seenDec = true; }
      else if (ch === '-' && o.allowNegative && !seenDigit && !seenDec && !neg) neg = true;
      // anything else ($ € letters spaces stray signs) is ignored
    }
    if (!seenDigit) return null;
    var n = parseFloat(out);
    if (isNaN(n) || !isFinite(n)) return null;
    return neg ? -n : n;
  }

  // Core display text WITHOUT prefix/suffix (the widget renders those as
  // separate adornments). precision null = the number's natural decimals.
  function formatCore(num, o) {
    if (num == null || typeof num !== 'number' || !isFinite(num)) return '';
    var neg = num < 0;
    var abs = Math.abs(num);
    var s = o.precision != null ? abs.toFixed(o.precision) : String(abs);
    if (s.indexOf('e') !== -1 || s.indexOf('E') !== -1) return (neg ? '-' : '') + s;
    var di = s.indexOf('.');
    var int = di === -1 ? s : s.slice(0, di);
    var frac = di === -1 ? '' : s.slice(di + 1);
    if (o.thousands) int = int.replace(/\B(?=(\d{3})+$)/g, o.thousands);
    return (neg ? '-' : '') + int + (frac ? o.decimal + frac : '');
  }

  /* ---- editing-time text plumbing (still pure) ---- */

  // Keep only what could be part of a number: digits, ONE decimal separator,
  // a LEADING minus. Thousands separators and pasted junk ('$', '€', spaces)
  // fall away here — this is the whole paste-sanitizing story.
  function sanitizeText(raw, o) {
    var out = '', seenDec = false;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (ch >= '0' && ch <= '9') out += ch;
      else if (ch === o.decimal && !seenDec) { out += ch; seenDec = true; }
      else if (ch === '-' && o.allowNegative && out === '') out = '-';
    }
    return out;
  }

  // Light editing format: regroup the integer part, leave the fraction and
  // any trailing decimal separator exactly as typed.
  function editText(clean, o) {
    if (!clean) return '';
    var neg = clean.charAt(0) === '-';
    var body = neg ? clean.slice(1) : clean;
    var di = body.indexOf(o.decimal);
    var int = di === -1 ? body : body.slice(0, di);
    var rest = di === -1 ? '' : body.slice(di);
    if (o.thousands && int) int = int.replace(/\B(?=(\d{3})+$)/g, o.thousands);
    return (neg ? '-' : '') + int + rest;
  }

  // Caret math: a char "counts" if it survives sanitizing — digits, the
  // decimal separator, a minus at position 0. Separators never count, so
  // caret positions map cleanly across reformatting.
  function keptChar(s, i, o) {
    var ch = s.charAt(i);
    return (ch >= '0' && ch <= '9') || ch === o.decimal || (i === 0 && ch === '-');
  }

  /* ------------------------------------------------------------------ *
   * Small DOM helpers.
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
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  function restoreAttr(el, name, val) {
    if (val == null) el.removeAttribute(name);
    else el.setAttribute(name, val);
  }

  var DEFAULTS = {
    min: null,                // lower clamp bound
    max: null,                // upper clamp bound
    step: 1,                  // arrow/stepper increment
    precision: null,          // decimals; null = inferred from step
    thousands: ',',           // ',' | '.' | ' ' | false
    decimal: '.',             // '.' | ','
    prefix: '',               // non-editable adornment, e.g. '$'
    suffix: '',               // non-editable adornment, e.g. ' kg'
    steppers: true,           // +/− buttons with hold-to-repeat
    allowNegative: true,
    placeholder: null,
    ariaLabel: null,          // accessible name (container mode has no label)
    value: null,              // initial value (container mode)
    name: null,               // hidden input carrying the RAW value (forms)
    disabled: false,
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    styles: true,             // false = headless: no CSS injected
    labels: {
      increment: 'Increase value',
      decrement: 'Decrease value'
    },
    onChange: null,           // fn(value|null) — committed: blur/step/Enter
    onInput: null             // fn(value|null) — live while typing
  };

  // SSR: every public entry point degrades to this inert handle.
  var dummyHandle = {
    el: null, root: null, input: null,
    getValue: function () { return null; },
    setValue: function () { return dummyHandle; },
    stepUp: function () { return dummyHandle; },
    stepDown: function () { return dummyHandle; },
    enable: function () { return dummyHandle; },
    disable: function () { return dummyHandle; },
    focus: function () { return dummyHandle; },
    destroy: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * NumberInput.
   * ------------------------------------------------------------------ */

  function NumberInput(target, options) {
    if (!HAS_DOM) return dummyHandle;
    var el = resolveElement(target);
    if (!el) throw new Error('NumberInput: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.isInput = el.tagName === 'INPUT';
    this.opts = assignOptions({}, DEFAULTS, options || {});

    // Enhancing a former <input type=number>? Adopt its min/max/step.
    if (this.isInput) {
      if (this.opts.min == null && el.getAttribute('min')) this.opts.min = +el.getAttribute('min');
      if (this.opts.max == null && el.getAttribute('max')) this.opts.max = +el.getAttribute('max');
      if ((!options || options.step === undefined) && el.getAttribute('step') &&
          !isNaN(+el.getAttribute('step'))) {
        this.opts.step = +el.getAttribute('step');
      }
    }
    this._o = normOpts(this.opts);
    this._value = null;
    this._holdTimer = null;

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    // Initial value: pre-filled input text wins, then opts.value.
    var initial = this.isInput && this.input.value !== ''
      ? parseNum(this.input.value, this._o)
      : null;
    if (initial == null && this.opts.value != null) {
      initial = typeof this.opts.value === 'number'
        ? this.opts.value
        : parseNum(this.opts.value, this._o);
    }
    if (initial != null) initial = roundTo(clampVal(initial, this._o), this._o.precision);
    this._setCommitted(initial, true); // silent — no onChange on construction
  }

  NumberInput.prototype = {
    constructor: NumberInput,

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      var opts = this.opts;
      var root = document.createElement('div');
      root.className = 'vnum' + saltClass();

      var input;
      if (this.isInput) {
        // Anchor mode: adopt the given <input>; original attrs are backed up
        // and restored on destroy().
        input = this.el;
        this._backup = {
          className: input.className,
          type: input.getAttribute('type'),
          inputmode: input.getAttribute('inputmode'),
          autocomplete: input.getAttribute('autocomplete'),
          placeholder: input.getAttribute('placeholder'),
          name: input.getAttribute('name')
        };
        this.el.parentNode.insertBefore(root, this.el);
        input.className = (input.className ? input.className + ' ' : '') + 'vnum-input';
      } else {
        // Container mode: build the control inside.
        input = document.createElement('input');
        input.className = 'vnum-input';
        this._backup = null;
      }
      try { if (input.type !== 'text') input.type = 'text'; } catch (err) { /* old IE */ }
      input.setAttribute('inputmode', 'decimal');
      if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
      input.setAttribute('role', 'spinbutton');
      // Accessible name: explicit option wins; an adopted input keeps its own
      // label/aria-label since it IS the original element. Container-mode
      // instances must pass ariaLabel (or be wrapped in a <label>).
      if (opts.ariaLabel) input.setAttribute('aria-label', String(opts.ariaLabel));
      if (opts.placeholder != null && opts.placeholder !== false) {
        input.placeholder = String(opts.placeholder);
      }

      if (this._o.prefix) {
        var pre = document.createElement('span');
        pre.className = 'vnum-affix vnum-prefix';
        pre.setAttribute('aria-hidden', 'true');
        pre.textContent = this._o.prefix;
        root.appendChild(pre);
      }
      root.appendChild(input);
      if (this._o.suffix) {
        var suf = document.createElement('span');
        suf.className = 'vnum-affix vnum-suffix';
        suf.setAttribute('aria-hidden', 'true');
        suf.textContent = this._o.suffix;
        root.appendChild(suf);
      }

      // Steppers: redundant with ArrowUp/Down, so hidden from the a11y tree
      // and out of the tab order — but fully clickable, with hold-to-repeat.
      this._upBtn = this._downBtn = null;
      if (opts.steppers !== false) {
        var steps = document.createElement('span');
        steps.className = 'vnum-steps';
        steps.setAttribute('aria-hidden', 'true');
        this._upBtn = this._makeBtn('vnum-up', ICON_UP, opts.labels.increment);
        this._downBtn = this._makeBtn('vnum-down', ICON_DOWN, opts.labels.decrement);
        steps.appendChild(this._upBtn);
        steps.appendChild(this._downBtn);
        root.appendChild(steps);
      }

      // Hidden raw-value carrier for forms. In anchor mode the visible text
      // is FORMATTED, so a name on the original input migrates here — the
      // form then submits '1234.5', never '1,234.50'.
      var hiddenName = opts.name ||
        (this.isInput && this.el.getAttribute('name')) || null;
      this._hidden = null;
      if (hiddenName) {
        if (this.isInput && this.el.getAttribute('name')) this.el.removeAttribute('name');
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = hiddenName;
        root.appendChild(hidden);
        this._hidden = hidden;
      }

      if (!this.isInput) this.el.appendChild(root);
      this.root = root;
      this.input = input;
      if (opts.disabled) this.disable();
    },

    _makeBtn: function (cls, icon, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vnum-btn ' + cls;
      b.tabIndex = -1;
      b.setAttribute('aria-label', label);
      b.innerHTML = icon;
      return b;
    },

    /* ---------------- events ---------------- */

    _bind: function () {
      var self = this;
      this._fns = {
        input: function () { self._handleInput(); },
        keydown: function (e) { self._handleKeydown(e); },
        blur: function () { self._commit(true); },
        upDown: function (e) { self._startHold(1, e); },
        downDown: function (e) { self._startHold(-1, e); },
        holdEnd: function () { self._endHold(); }
      };
      this.input.addEventListener('input', this._fns.input);
      this.input.addEventListener('keydown', this._fns.keydown);
      this.input.addEventListener('blur', this._fns.blur);
      this._pressEvt = window.PointerEvent ? 'pointerdown' : 'mousedown';
      this._releaseEvt = window.PointerEvent ? 'pointerup' : 'mouseup';
      if (this._upBtn) {
        this._upBtn.addEventListener(this._pressEvt, this._fns.upDown);
        this._downBtn.addEventListener(this._pressEvt, this._fns.downDown);
      }
    },

    /* ---------------- typing / formatting ---------------- */

    // input event (typing AND paste): sanitize → regroup thousands → put the
    // caret back after the same COUNTED character (digits/decimal/minus —
    // separators don't count, so inserting/removing them can't drift it).
    _handleInput: function () {
      var o = this._o, inp = this.input;
      var raw = inp.value, caret = null, i;
      try {
        if (document.activeElement === inp) caret = inp.selectionStart;
      } catch (err) { caret = null; }
      var before = 0;
      if (caret != null) {
        for (i = 0; i < caret && i < raw.length; i++) if (keptChar(raw, i, o)) before++;
      }
      var text = editText(sanitizeText(raw, o), o);
      if (inp.value !== text) {
        inp.value = text;
        if (caret != null) {
          var pos = 0;
          if (before > 0) {
            pos = text.length;
            for (var j = 0, seen = 0; j < text.length; j++) {
              if (keptChar(text, j, o) && ++seen >= before) { pos = j + 1; break; }
            }
          }
          try { inp.setSelectionRange(pos, pos); } catch (err2) { /* detached */ }
        }
      }
      var v = parseNum(text, o);
      // Live out-of-range warning; the commit will clamp it away.
      this.root.classList.toggle('vnum-invalid',
        v != null && ((o.min != null && v < o.min) || (o.max != null && v > o.max)));
      if (this.opts.onInput) this.opts.onInput(v);
    },

    _handleKeydown: function (e) {
      var o = this._o, inp = this.input, key = e.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        this._stepBy((key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
        return;
      }
      if (key === 'Enter') { this._commit(true); return; } // then let forms submit
      if (key === 'Escape') { this._setCommitted(this._value, true); return; } // revert
      // Backspace/Delete against a thousands separator: hop over it so the
      // key eats the DIGIT beyond — otherwise regrouping puts the separator
      // right back and the key appears dead.
      if (o.thousands && (key === 'Backspace' || key === 'Delete')) {
        try {
          var s0 = inp.selectionStart, e0 = inp.selectionEnd;
          if (s0 === e0) {
            if (key === 'Backspace' && s0 > 0 && inp.value.charAt(s0 - 1) === o.thousands) {
              inp.setSelectionRange(s0 - 1, s0 - 1);
            } else if (key === 'Delete' && inp.value.charAt(s0) === o.thousands) {
              inp.setSelectionRange(s0 + 1, s0 + 1);
            }
          }
        } catch (err) { /* ignore */ }
        return;
      }
      // Reject printable keys that could never lead to a valid number.
      if (!key || key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (key >= '0' && key <= '9') return;
      if (key === '.' || key === ',') {
        // Both separator keys mean "decimal point" — insert the configured one.
        e.preventDefault();
        this._insertDecimal();
        return;
      }
      if (key === '-') {
        if (!o.allowNegative) e.preventDefault(); // else the sanitizer places it
        return;
      }
      e.preventDefault();
    },

    _insertDecimal: function () {
      var o = this._o, inp = this.input;
      if (o.precision === 0) return; // integer field — no decimals, ever
      var v = inp.value;
      var s = inp.selectionStart == null ? v.length : inp.selectionStart;
      var e = inp.selectionEnd == null ? s : inp.selectionEnd;
      var next = v.slice(0, s) + o.decimal + v.slice(e);
      if (next.indexOf(o.decimal) !== next.lastIndexOf(o.decimal)) return; // already has one
      inp.value = next;
      try { inp.setSelectionRange(s + 1, s + 1); } catch (err) { /* ignore */ }
      this._handleInput();
    },

    /* ---------------- committing ---------------- */

    // parse → clamp → round → display. Empty input commits to null (not 0).
    _commit: function (fire) {
      var v = parseNum(this.input.value, this._o);
      if (v != null) v = roundTo(clampVal(v, this._o), this._o.precision);
      this._setCommitted(v, !fire);
    },

    _setCommitted: function (v, silent) {
      var changed = v !== this._value;
      this._value = v;
      this.input.value = v == null ? '' : formatCore(v, this._o);
      this.root.classList.remove('vnum-invalid');
      if (this._hidden) this._hidden.value = v == null ? '' : String(v);
      this._syncAria();
      if (changed && !silent && this.opts.onChange) this.opts.onChange(v);
    },

    _syncAria: function () {
      var inp = this.input, o = this._o, v = this._value;
      if (o.min != null) inp.setAttribute('aria-valuemin', String(o.min));
      else inp.removeAttribute('aria-valuemin');
      if (o.max != null) inp.setAttribute('aria-valuemax', String(o.max));
      else inp.removeAttribute('aria-valuemax');
      if (v != null) {
        inp.setAttribute('aria-valuenow', String(v));
        inp.setAttribute('aria-valuetext', o.prefix + formatCore(v, o) + o.suffix);
      } else {
        inp.removeAttribute('aria-valuenow');
        inp.removeAttribute('aria-valuetext');
      }
    },

    /* ---------------- stepping ---------------- */

    // ±step from the committed value (0 when empty); steps COMMIT.
    _stepBy: function (mult) {
      if (this.opts.disabled) return this;
      var o = this._o;
      var base = this._value == null ? 0 : this._value;
      var v = roundTo(clampVal(base + o.step * mult, o), o.precision);
      this._setCommitted(v, false);
      return this;
    },

    // Hold-to-repeat: step once now, wait 500 ms, then every 60 ms;
    // after 2 s of holding each tick jumps ×10.
    _startHold: function (dir, e) {
      if (this.opts.disabled) return;
      if (e && e.preventDefault) e.preventDefault(); // keep focus on the input
      this._endHold();
      try { this.input.focus(); } catch (err) { /* ignore */ }
      this._stepBy(dir);
      var self = this, t0 = Date.now();
      this._holdTimer = setTimeout(function tick() {
        self._stepBy(dir * (Date.now() - t0 > 2000 ? 10 : 1));
        self._holdTimer = setTimeout(tick, 60);
      }, 500);
      window.addEventListener(this._releaseEvt, this._fns.holdEnd);
      if (window.PointerEvent) window.addEventListener('pointercancel', this._fns.holdEnd);
    },

    _endHold: function () {
      if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
      window.removeEventListener(this._releaseEvt, this._fns.holdEnd);
      if (window.PointerEvent) window.removeEventListener('pointercancel', this._fns.holdEnd);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.root.setAttribute('data-theme', resolved);
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this._value;
    },

    // setValue(1234.5) | setValue('1.234,5') | setValue(null) — clamped and
    // rounded like a blur commit. { silent: true } skips onChange.
    setValue: function (v, opts) {
      var n = (v == null || v === '') ? null
        : (typeof v === 'number' ? v : parseNum(v, this._o));
      if (n != null && !isFinite(n)) n = null;
      if (n != null) n = roundTo(clampVal(n, this._o), this._o.precision);
      this._setCommitted(n, !!(opts && opts.silent));
      return this;
    },

    stepUp: function () { return this._stepBy(1); },
    stepDown: function () { return this._stepBy(-1); },

    enable: function () {
      this.opts.disabled = false;
      this.root.classList.remove('vnum-disabled');
      this.input.disabled = false;
      if (this._upBtn) { this._upBtn.disabled = false; this._downBtn.disabled = false; }
      return this;
    },

    disable: function () {
      this.opts.disabled = true;
      this._endHold();
      this.root.classList.add('vnum-disabled');
      this.input.disabled = true;
      if (this._upBtn) { this._upBtn.disabled = true; this._downBtn.disabled = true; }
      return this;
    },

    focus: function () {
      this.input.focus();
      return this;
    },

    destroy: function () {
      this._endHold();
      unwatchAutoTheme(this);
      this.input.removeEventListener('input', this._fns.input);
      this.input.removeEventListener('keydown', this._fns.keydown);
      this.input.removeEventListener('blur', this._fns.blur);
      if (this._upBtn) {
        this._upBtn.removeEventListener(this._pressEvt, this._fns.upDown);
        this._downBtn.removeEventListener(this._pressEvt, this._fns.downDown);
      }
      if (this.isInput) {
        // Give the input back to the page exactly as we found it, carrying
        // the RAW committed value.
        var b = this._backup, inp = this.input;
        inp.className = b.className;
        restoreAttr(inp, 'type', b.type);
        restoreAttr(inp, 'inputmode', b.inputmode);
        restoreAttr(inp, 'autocomplete', b.autocomplete);
        restoreAttr(inp, 'placeholder', b.placeholder);
        restoreAttr(inp, 'name', b.name);
        inp.removeAttribute('role');
        inp.removeAttribute('aria-valuemin');
        inp.removeAttribute('aria-valuemax');
        inp.removeAttribute('aria-valuenow');
        inp.removeAttribute('aria-valuetext');
        inp.disabled = false;
        inp.value = this._value == null ? '' : String(this._value);
        this.root.parentNode.insertBefore(inp, this.root);
      }
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics: pure helpers, auto-init, convergence contract.
   * ------------------------------------------------------------------ */

  NumberInput.version = VERSION;
  NumberInput.defaults = DEFAULTS;

  NumberInput.create = function (target, options) {
    return new NumberInput(target, options);
  };

  NumberInput.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  // Pure helpers — work without a DOM (Node-friendly).
  //   NumberInput.parse('$1,234.50')            → 1234.5
  //   NumberInput.format(1234.5, {precision:2}) → '1,234.50'
  NumberInput.parse = function (str, opts) {
    return parseNum(str, normOpts(opts));
  };

  NumberInput.format = function (num, opts) {
    var o = normOpts(opts);
    if (typeof num === 'string') num = parseNum(num, o);
    var core = formatCore(num, o);
    return core === '' ? '' : o.prefix + core + o.suffix;
  };

  /* ---- auto-init: <input data-vnum data-prefix="$" data-precision="2"> ---- */

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    function num(v) { return (v === '' || isNaN(+v)) ? undefined : +v; }
    if (d.vnum) o.value = num(d.vnum);              // data-vnum="42" shorthand
    if (d.value != null) o.value = num(d.value);
    if (d.min != null) o.min = num(d.min);
    if (d.max != null) o.max = num(d.max);
    if (d.step != null) o.step = num(d.step);
    if (d.precision != null) o.precision = num(d.precision);
    if (d.thousands != null) {
      o.thousands = (d.thousands === 'false' || d.thousands === 'none') ? false
        : (d.thousands === 'space' ? ' ' : d.thousands);
    }
    if (d.decimal) o.decimal = d.decimal;
    if (d.prefix != null) o.prefix = d.prefix;
    if (d.suffix != null) o.suffix = d.suffix;
    if (d.steppers != null) o.steppers = parseBool(d.steppers);
    if (d.allowNegative != null) o.allowNegative = parseBool(d.allowNegative);
    if (d.name) o.name = d.name;
    if (d.placeholder != null) o.placeholder = d.placeholder;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    return o;
  }

  NumberInput.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vnum]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new NumberInput(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('NumberInput auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { NumberInput.autoInit(); });
    } else {
      NumberInput.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  NumberInput.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(NumberInput, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    NumberInput.css = renderCss();
  }
  NumberInput.displayName = 'NumberInput';
  NumberInput.rootClass = 'vnum';
  NumberInput.themeVars = {
    accent: '--vnum-accent',
    radius: '--vnum-radius',
    font: '--vnum-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  NumberInput.varScopes = ['.vnum', '.vnum[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('number', NumberInput);
  }

  return NumberInput;
});

}).call(__root);
var NumberInput = __root.NumberInput;
export { NumberInput };
export default NumberInput;
