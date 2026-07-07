/*! vanilla-ui-kit/form v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Form v1.0.0
 * A single-file, zero-dependency reactive form primitive for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="form.js"></script>
 *   <script>
 *     new Form('#signup', {
 *       fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
 *       onSubmit: function (values) { return api.save(values); }
 *     })
 *   </script>
 *
 * Or enhance an existing <form>:
 *   new Form(document.querySelector('form'))
 *
 * Headless:
 *   Form.defaults.styles = false   // no CSS injected; style .vfm-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Form = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-form-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Form.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Form.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the fields; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vfm{--vfm-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vfm{' +
      '--vfm-accent:#5b5bd6;' +
      '--vfm-danger:#e5484d;' +
      '--vfm-success:#1f9d5b;' +
      '--vfm-bg:#ffffff;' +
      '--vfm-surface:#f2f2f5;' +
      '--vfm-text:#1c1d21;' +
      '--vfm-muted:#72747e;' +
      '--vfm-faint:#e7e7ec;' +
      '--vfm-accent-soft:rgba(91,91,214,.13);' +
      '--vfm-danger-soft:rgba(229,72,77,.12);' +
      '--vfm-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vfm-radius:12px;' +
      '--vfm-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vfm[data-theme=dark]{' +
      '--vfm-accent:#7b7bea;' +
      '--vfm-danger:#f2555a;' +
      '--vfm-success:#4ccb8f;' +
      '--vfm-bg:#1b1d24;' +
      '--vfm-surface:#272a33;' +
      '--vfm-text:#e9eaf0;' +
      '--vfm-muted:#989aa6;' +
      '--vfm-faint:#31343f;' +
      '--vfm-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vfm{' +
      '--vfm-accent-soft:color-mix(in srgb,var(--vfm-accent) 14%,transparent);' +
      '--vfm-danger-soft:color-mix(in srgb,var(--vfm-danger) 13%,transparent);}}' +
    '.vfm.SALT{display:block;color:var(--vfm-text);font-family:var(--vfm-font);' +
      'font-size:14px;line-height:1.5;text-align:left;}' +
    '.vfm.SALT *,.vfm.SALT *::before,.vfm.SALT *::after{box-sizing:border-box;}' +
    /* field scaffolding */
    '.vfm.SALT .vfm-field{margin:0 0 18px;}' +
    '.vfm.SALT .vfm-label{display:block;font-weight:600;font-size:13.5px;margin:0 0 6px;}' +
    '.vfm.SALT .vfm-req{color:var(--vfm-danger);}' +
    '.vfm.SALT .vfm-hint{color:var(--vfm-muted);font-size:12.5px;margin:-3px 0 6px;}' +
    '.vfm.SALT .vfm-error{color:var(--vfm-danger);font-size:13px;margin:5px 0 0;}' +
    '.vfm.SALT .vfm-error:empty{margin:0;}' +
    /* inputs — same look as the family's datepicker/select controls */
    '.vfm.SALT .vfm-input{width:100%;font:inherit;color:var(--vfm-text);' +
      'background:var(--vfm-bg);border:1px solid var(--vfm-faint);border-radius:10px;' +
      'padding:9px 12px;margin:0;transition:border-color .12s ease,box-shadow .12s ease;}' +
    '.vfm.SALT .vfm-input::placeholder{color:var(--vfm-muted);}' +
    '.vfm.SALT .vfm-input:focus{outline:none;}' +
    '.vfm.SALT .vfm-input:focus-visible{border-color:var(--vfm-accent);' +
      'box-shadow:0 0 0 3px var(--vfm-accent-soft);}' +
    '.vfm.SALT .vfm-input:disabled{opacity:.55;background:var(--vfm-surface);' +
      'cursor:not-allowed;}' +
    '.vfm.SALT .vfm-input.is-invalid,.vfm.SALT .is-invalid .vfm-input{' +
      'border-color:var(--vfm-danger);}' +
    '.vfm.SALT .vfm-input.is-invalid:focus-visible,' +
      '.vfm.SALT .is-invalid .vfm-input:focus-visible{' +
      'box-shadow:0 0 0 3px var(--vfm-danger-soft);}' +
    '.vfm.SALT textarea.vfm-input{resize:vertical;min-height:38px;}' +
    '.vfm.SALT textarea.vfm-grow{resize:none;overflow:hidden;}' +
    '.vfm.SALT select.vfm-input{-webkit-appearance:none;appearance:none;' +
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'none\'%3E%3Cpath d=\'M3.5 6l4.5 4.5L12.5 6\' stroke=\'%2372747e\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");' +
      'background-repeat:no-repeat;background-position:right 10px center;' +
      'padding-right:34px;cursor:pointer;}' +
    /* password field with show/hide toggle */
    '.vfm.SALT .vfm-inputwrap{position:relative;}' +
    '.vfm.SALT .vfm-inputwrap .vfm-input{padding-right:42px;}' +
    '.vfm.SALT .vfm-eye{position:absolute;top:50%;right:6px;transform:translateY(-50%);' +
      'width:28px;height:28px;display:grid;place-items:center;color:var(--vfm-muted);' +
      'background:none;border:0;border-radius:6px;padding:0;cursor:pointer;' +
      'transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vfm.SALT .vfm-eye:hover{background:var(--vfm-surface);color:var(--vfm-text);}' +
    '.vfm.SALT .vfm-eye svg{display:block;}' +
    /* checkbox, switch, radio */
    '.vfm.SALT .vfm-check{display:flex;align-items:flex-start;gap:10px;}' +
    '.vfm.SALT .vfm-check .vfm-label{margin:0;font-weight:500;cursor:pointer;}' +
    '.vfm.SALT .vfm-check input{flex:none;width:16px;height:16px;margin:2px 0 0;' +
      'accent-color:var(--vfm-accent);cursor:pointer;}' +
    '.vfm.SALT .vfm-switch input{-webkit-appearance:none;appearance:none;width:36px;' +
      'height:20px;margin:0;border:0;border-radius:999px;background:var(--vfm-faint);' +
      'position:relative;transition:background .15s ease;}' +
    '.vfm.SALT .vfm-switch input::after{content:"";position:absolute;top:2px;left:2px;' +
      'width:16px;height:16px;border-radius:50%;background:#fff;' +
      'box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s ease;}' +
    '.vfm.SALT .vfm-switch input:checked{background:var(--vfm-accent);}' +
    '.vfm.SALT .vfm-switch input:checked::after{transform:translateX(16px);}' +
    '.vfm.SALT .vfm-fieldset{border:0;padding:0;margin:0;min-width:0;}' +
    '.vfm.SALT .vfm-fieldset legend.vfm-label{padding:0;}' +
    '.vfm.SALT .vfm-option{display:flex;align-items:center;gap:8px;margin:0 0 6px;' +
      'font-weight:400;cursor:pointer;}' +
    '.vfm.SALT .vfm-option input{flex:none;width:15px;height:15px;margin:0;' +
      'accent-color:var(--vfm-accent);cursor:pointer;}' +
    '.vfm.SALT .vfm-check input:focus,.vfm.SALT .vfm-option input:focus{outline:none;}' +
    '.vfm.SALT .vfm-check input:focus-visible,.vfm.SALT .vfm-option input:focus-visible,' +
      '.vfm.SALT .vfm-eye:focus-visible{' +
      'outline:2px solid var(--vfm-accent);outline-offset:1px;}' +
    /* form-level banner (errors) + status live region (success) */
    '.vfm.SALT .vfm-banner{background:var(--vfm-danger-soft);' +
      'border:1px solid var(--vfm-danger);color:var(--vfm-danger);' +
      'border-radius:var(--vfm-radius);padding:10px 14px;margin:0 0 16px;' +
      'font-size:13.5px;}' +
    '.vfm.SALT .vfm-banner:focus{outline:none;}' +
    '.vfm.SALT .vfm-banner:focus-visible{outline:2px solid var(--vfm-danger);' +
      'outline-offset:2px;}' +
    '.vfm.SALT .vfm-status{color:var(--vfm-success);font-size:13.5px;margin:10px 0 0;}' +
    '.vfm.SALT .vfm-status:empty{margin:0;}' +
    /* submit button + loading spinner */
    '.vfm.SALT .vfm-actions{margin:6px 0 0;}' +
    '.vfm.SALT .vfm-submit{position:relative;font:inherit;font-weight:600;font-size:14px;' +
      'color:#fff;background:var(--vfm-accent);border:0;border-radius:10px;' +
      'padding:10px 18px;cursor:pointer;transition:filter .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vfm.SALT .vfm-submit:hover{filter:brightness(1.08);}' +
    '.vfm.SALT .vfm-submit:disabled{opacity:.6;cursor:not-allowed;}' +
    '.vfm.SALT .vfm-submit:focus{outline:none;}' +
    '.vfm.SALT .vfm-submit:focus-visible{outline:2px solid var(--vfm-accent);' +
      'outline-offset:2px;}' +
    '.vfm.SALT .is-loading{position:relative;color:transparent!important;' +
      'pointer-events:none;}' +
    '.vfm.SALT .is-loading::after{content:"";position:absolute;width:16px;height:16px;' +
      'top:50%;left:50%;margin:-8px 0 0 -8px;border:2px solid var(--vfm-accent-soft);' +
      'border-top-color:currentColor;border-top-color:var(--vfm-accent);' +
      'border-radius:50%;animation:vfm-spin .7s linear infinite;}' +
    '.vfm.SALT .vfm-submit.is-loading::after{border-color:rgba(255,255,255,.35);' +
      'border-top-color:#fff;}' +
    '@keyframes vfm-spin{to{transform:rotate(360deg);}}' +
    /* honeypot — off-viewport, NOT display:none (bots check for that) */
    '.vfm.SALT .vfm-hp{position:absolute!important;left:-9999px!important;' +
      'top:auto!important;width:1px;height:1px;overflow:hidden;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vfm.SALT,.vfm.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/form.css), or set Form.salt to your
  // own token / false BEFORE the first form is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Form.salt;
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
    // Insert before the page's own CSS so `.vfm { --vfm-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    eye: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M1.7 8S4 3.8 8 3.8 14.3 8 14.3 8 12 12.2 8 12.2 1.7 8 1.7 8Z"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
    eyeOff: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/>' +
      '<path d="M6.4 4.1C6.9 4 7.4 3.8 8 3.8c4 0 6.3 4.2 6.3 4.2a12.6 12.6 0 0 1-2 2.4' +
      'M4.2 4.9A12 12 0 0 0 1.7 8S4 12.2 8 12.2c1 0 1.9-.3 2.7-.7"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"' +
      ' stroke-linejoin="round"/></svg>'
  };

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var autoThemed = [];
  var themeMql = null;
  var themeObserver = null;

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
    if (!themeMql && window.matchMedia) {
      themeMql = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return themeMql && themeMql.matches ? 'dark' : 'light';
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
      themeMql = themeMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (themeMql.addEventListener) themeMql.addEventListener('change', refreshAutoThemes);
      else if (themeMql.addListener) themeMql.addListener(refreshAutoThemes);
    }
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(refreshAutoThemes);
      themeObserver.observe(document.documentElement, {
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
    if (themeMql) {
      if (themeMql.removeEventListener) themeMql.removeEventListener('change', refreshAutoThemes);
      else if (themeMql.removeListener) themeMql.removeListener(refreshAutoThemes);
    }
    if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
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
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  // '{min}' style message interpolation.
  function msgFmt(tpl, repl) {
    var out = String(tpl);
    for (var k in repl) out = out.split('{' + k + '}').join(String(repl[k]));
    return out;
  }

  // Value equality good enough for form state: scalars strictly, arrays by item.
  function eqValues(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    return false;
  }

  function isEmptyValue(v) {
    if (v == null || v === false) return true;
    if (Array.isArray(v)) return v.length === 0;
    return String(v).replace(/^\s+|\s+$/g, '') === '';
  }

  function isThenable(x) {
    return x && typeof x.then === 'function';
  }

  // Accepts [{value, label, disabled}] or ['a', 'b'] shorthand.
  function normalizeOptions(list) {
    var out = [];
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o == null) continue;
      if (typeof o === 'object') {
        out.push({
          value: String(o.value != null ? o.value : (o.label != null ? o.label : '')),
          label: String(o.label != null ? o.label : (o.value != null ? o.value : '')),
          disabled: !!o.disabled
        });
      } else {
        out.push({ value: String(o), label: String(o), disabled: false });
      }
    }
    return out;
  }

  // Family lookup: standalone global first, then the VC registry.
  function familyComponent(globalName, vcKey) {
    if (!HAS_DOM) return null;
    if (typeof window[globalName] === 'function') return window[globalName];
    var reg = window.VC && window.VC.components;
    if (reg && typeof reg[vcKey] === 'function') return reg[vcKey];
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Validators — PURE functions, usable in Node with no DOM.
   * Contract: return null when valid, a message string when invalid.
   * Format validators pass on empty values; pair them with `required`.
   * ------------------------------------------------------------------ */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

  var validators = {
    required: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      return isEmptyValue(v) ? labels.required : null;
    },
    email: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      return EMAIL_RE.test(String(v)) ? null : labels.email;
    },
    url: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      return URL_RE.test(String(v)) ? null : labels.url;
    },
    number: function (v, min, max, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      var n = +v;
      if (isNaN(n)) return labels.number;
      if (min != null && min !== '' && n < +min) return msgFmt(labels.min, { min: min });
      if (max != null && max !== '' && n > +max) return msgFmt(labels.max, { max: max });
      return null;
    },
    length: function (v, min, max, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      var len = String(v).length;
      if (min != null && min !== '' && len < +min) return msgFmt(labels.minlength, { min: min });
      if (max != null && max !== '' && len > +max) return msgFmt(labels.maxlength, { max: max });
      return null;
    },
    pattern: function (v, pattern, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v) || !pattern) return null;
      var re;
      try {
        re = pattern instanceof RegExp ? pattern : new RegExp('^(?:' + pattern + ')$');
      } catch (err) {
        return null; // a broken pattern must not brick the form
      }
      return re.test(String(v)) ? null : labels.pattern;
    }
  };

  /* ------------------------------------------------------------------ *
   * Defaults.
   * ------------------------------------------------------------------ */

  var DEFAULTS = {
    fields: null,           // [{name, type, label, …}] — schema mode
    validateOn: 'blur',     // 'blur' | 'change' | 'submit'; erroring fields go live
    onSubmit: null,         // fn(values, form) → any | Promise; resolve = success
    onError: null,          // fn(err, form) after error handling has rendered
    onChange: null,         // fn(values, form) on any value change
    onSpam: null,           // fn(values) when the honeypot / time gate trips
    action: null,           // URL — the form fetches for you (see `encoding`)
    method: null,           // defaults to the form's method attr, else POST
    encoding: 'json',       // 'json' | 'form' (FormData); enhance+action attr → 'form'
    headers: null,          // extra request headers ({'X-CSRF-Token': …})
    honeypot: true,         // decoy field + minimum-fill-time gate
    honeypotName: null,     // decoy field name; auto-generated when null
    minFillTime: 1500,      // ms; faster submits are treated as bots
    resetOnSuccess: false,
    successMessage: null,   // rendered in the status live region (Toast if present)
    submitLabel: null,      // schema mode button text; false = no button
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vfm-* yourself
    labels: {
      required: 'This field is required',
      email: 'Enter a valid email address',
      url: 'Enter a valid URL',
      number: 'Enter a number',
      min: 'Must be at least {min}',
      max: 'Must be at most {max}',
      minlength: 'Must be at least {min} characters',
      maxlength: 'Must be at most {max} characters',
      pattern: 'Does not match the expected format',
      phone: 'Enter a valid phone number',
      submit: 'Submit',
      submitError: 'Something went wrong. Please try again.',
      showPassword: 'Show password',
      hidePassword: 'Hide password'
    }
  };

  // Realistic decoy names — bots auto-fill fields that look like real ones.
  var HP_NAMES = ['website_url', 'company_website', 'homepage_url', 'contact_website'];

  /* ------------------------------------------------------------------ *
   * SSR / null-target: an inert handle whose whole API is a harmless no-op.
   * ------------------------------------------------------------------ */

  function inertHandle() {
    var h = {
      el: null, form: null, values: {}, errors: {},
      getValue: function () { return undefined; },
      setValue: function () { return h; },
      setValues: function () { return h; },
      setError: function () { return h; },
      clearErrors: function () { return h; },
      isDirty: function () { return false; },
      isValid: function () { return true; },
      watch: function () { return function () {}; },
      validate: function () {
        return typeof Promise !== 'undefined' ? Promise.resolve(true) : true;
      },
      submit: function () {
        return typeof Promise !== 'undefined' ? Promise.resolve(false) : false;
      },
      reset: function () { return h; },
      enable: function () { return h; },
      disable: function () { return h; },
      destroy: function () { return h; }
    };
    return h;
  }

  /* ------------------------------------------------------------------ *
   * Form.
   * ------------------------------------------------------------------ */

  function Form(target, options) {
    // SSR / no target: return an inert handle so calling code never branches.
    if (!HAS_DOM || target == null) return inertHandle();
    var el = resolveElement(target);
    if (!el) throw new Error('Form: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options);
    this._enhance = el.tagName === 'FORM';
    this._uid = 'vfm-' + (++uid);
    this._fields = [];        // ordered field records
    this._byName = {};        // name → field record
    this._errors = {};        // name → message
    this._watchers = [];
    this._submitting = false;
    this._disabled = false;

    // Enhance mode adopts the form's own action/method attributes when no
    // submission option is given — classic progressive enhancement.
    if (this._enhance && this.opts.action == null && el.getAttribute('action')) {
      this.opts.action = el.getAttribute('action');
      if (options.encoding === undefined) this.opts.encoding = 'form';
    }

    if (this.opts.styles !== false) injectStyles();

    if (this._enhance) this._adopt();
    else this._build();
    this._addChrome();
    this._upgradeFields();

    // Capture initial values AFTER upgrades so snapshots agree with the DOM.
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      f.initial = this._read(f);
      f._last = f.initial;
    }

    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
    this._renderedAt = new Date().getTime(); // honeypot time gate anchor
  }

  // Live snapshots: `form.values` / `form.errors` are plain-object copies.
  try {
    Object.defineProperty(Form.prototype, 'values', {
      get: function () { return this._snapshotValues(); },
      enumerable: false, configurable: true
    });
    Object.defineProperty(Form.prototype, 'errors', {
      get: function () {
        var out = {};
        for (var k in this._errors) out[k] = this._errors[k];
        return out;
      },
      enumerable: false, configurable: true
    });
  } catch (err) { /* pre-ES5 engines get method access only */ }

  Form.prototype._snapshotValues = function () {
    var out = {};
    if (!this.form) return out;
    for (var i = 0; i < this._fields.length; i++) {
      out[this._fields[i].name] = this._read(this._fields[i]);
    }
    return out;
  };

  /* ---------------- schema mode: DOM construction ---------------- */

  Form.prototype._build = function () {
    var form = document.createElement('form');
    form.className = 'vfm' + saltClass();
    form.setAttribute('novalidate', '');
    this.form = form;

    var specs = this.opts.fields || [];
    for (var i = 0; i < specs.length; i++) {
      if (specs[i] && specs[i].name) this._buildField(specs[i]);
    }

    if (this.opts.submitLabel !== false) {
      var actions = document.createElement('div');
      actions.className = 'vfm-actions';
      var btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'vfm-submit';
      btn.textContent = this.opts.submitLabel != null
        ? String(this.opts.submitLabel) : this.opts.labels.submit;
      actions.appendChild(btn);
      form.appendChild(actions);
      this._submitBtn = btn;
    }

    this.el.appendChild(form);
  };

  Form.prototype._buildField = function (spec) {
    var type = spec.type || 'text';
    var name = String(spec.name);
    var id = this._uid + '-' + name;

    // Hidden fields need no wrapper, label, or validation UI.
    if (type === 'hidden') {
      var hi = document.createElement('input');
      hi.type = 'hidden';
      hi.name = name;
      hi.value = spec.value != null ? String(spec.value) : '';
      this.form.appendChild(hi);
      this._register({ name: name, kind: 'text', spec: spec, inputs: [hi],
        el: null, errorEl: null });
      return;
    }

    var field = document.createElement('div');
    field.className = 'vfm-field';
    field.setAttribute('data-name', name);

    var errorEl = document.createElement('div');
    errorEl.className = 'vfm-error';
    errorEl.id = id + '-err';
    errorEl.setAttribute('aria-live', 'polite');

    var hintEl = null;
    if (spec.hint) {
      hintEl = document.createElement('div');
      hintEl.className = 'vfm-hint';
      hintEl.id = id + '-hint';
      // Hints are TEXT by default; `html: true` is an opt-in for TRUSTED markup.
      if (spec.html) hintEl.innerHTML = String(spec.hint);
      else hintEl.textContent = String(spec.hint);
    }
    var describedBy = (hintEl ? hintEl.id + ' ' : '') + errorEl.id;

    var record = { name: name, spec: spec, el: field, errorEl: errorEl,
      hintEl: hintEl, inputs: [], kind: 'text' };
    var i, input, label;

    if (type === 'checkbox' || type === 'switch') {
      record.kind = 'checkbox';
      var row = document.createElement('div');
      row.className = 'vfm-check' + (type === 'switch' ? ' vfm-switch' : '');
      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.name = name;
      input.checked = !!spec.value;
      if (spec.required) input.required = true;
      if (spec.disabled) input.disabled = true;
      input.setAttribute('aria-describedby', describedBy);
      row.appendChild(input);
      label = document.createElement('label');
      label.className = 'vfm-label';
      label.htmlFor = id;
      label.textContent = spec.label != null ? String(spec.label) : name;
      this._appendReq(label, spec);
      row.appendChild(label);
      field.appendChild(row);
      record.inputs.push(input);
    } else if (type === 'radio') {
      record.kind = 'radio';
      // Radio groups get a fieldset/legend so the group itself is labelled.
      var fs = document.createElement('fieldset');
      fs.className = 'vfm-fieldset';
      fs.setAttribute('aria-describedby', describedBy);
      var legend = document.createElement('legend');
      legend.className = 'vfm-label';
      legend.textContent = spec.label != null ? String(spec.label) : name;
      this._appendReq(legend, spec);
      fs.appendChild(legend);
      if (hintEl) { fs.appendChild(hintEl); hintEl = null; }
      var opts = normalizeOptions(spec.options);
      for (i = 0; i < opts.length; i++) {
        var optLabel = document.createElement('label');
        optLabel.className = 'vfm-option';
        input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.id = id + '-' + i;
        input.value = opts[i].value;
        if (opts[i].value === String(spec.value != null ? spec.value : '')) {
          input.checked = true;
        }
        if (spec.disabled || opts[i].disabled) input.disabled = true;
        optLabel.htmlFor = input.id;
        optLabel.appendChild(input);
        var optText = document.createElement('span');
        optText.textContent = opts[i].label;
        optLabel.appendChild(optText);
        fs.appendChild(optLabel);
        record.inputs.push(input);
      }
      fs.appendChild(errorEl);
      field.appendChild(fs);
      this.form.appendChild(field);
      this._register(record);
      return; // error/hint already placed inside the fieldset
    } else if (type === 'select') {
      record.kind = 'select';
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('select');
      input.className = 'vfm-input';
      input.id = id;
      input.name = name;
      input.setAttribute('aria-describedby', describedBy);
      if (spec.required) input.required = true;
      if (spec.disabled) input.disabled = true;
      if (spec.placeholder) {
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = String(spec.placeholder);
        input.appendChild(ph);
      }
      var sopts = normalizeOptions(spec.options);
      for (i = 0; i < sopts.length; i++) {
        var op = document.createElement('option');
        op.value = sopts[i].value;
        op.textContent = sopts[i].label;
        if (sopts[i].disabled) op.disabled = true;
        if (spec.value != null && String(spec.value) === sopts[i].value) op.selected = true;
        input.appendChild(op);
      }
      field.appendChild(input);
      record.inputs.push(input);
    } else if (type === 'textarea') {
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('textarea');
      input.className = 'vfm-input' + (spec.autoGrow ? ' vfm-grow' : '');
      input.id = id;
      input.name = name;
      input.rows = spec.rows || 3;
      if (spec.value != null) input.value = String(spec.value);
      this._commonAttrs(input, spec, describedBy);
      field.appendChild(input);
      record.inputs.push(input);
    } else {
      // text, email, password, number, url, tel, date, phone.
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('input');
      input.className = 'vfm-input';
      input.id = id;
      input.name = name;
      // Family-upgradeable types render native by default; the upgrade pass
      // below swaps in DatePicker/PhoneInput when those globals exist.
      if (type === 'date') {
        record.kind = 'date';
        input.type = familyComponent('DatePicker', 'datepicker') ? 'text' : 'date';
      } else if (type === 'phone') {
        record.kind = 'phone';
        input.type = 'tel';
      } else {
        input.type = type;
      }
      if (spec.value != null) input.value = String(spec.value);
      this._commonAttrs(input, spec, describedBy);
      record.inputs.push(input);

      if (type === 'password') {
        // Show/hide toggle — a real button, announced via aria-pressed.
        var wrap = document.createElement('div');
        wrap.className = 'vfm-inputwrap';
        wrap.appendChild(input);
        var eye = document.createElement('button');
        eye.type = 'button';
        eye.className = 'vfm-eye';
        eye.setAttribute('aria-label', this.opts.labels.showPassword);
        eye.setAttribute('aria-pressed', 'false');
        eye.innerHTML = ICONS.eye;
        wrap.appendChild(eye);
        field.appendChild(wrap);
        this._bindEye(eye, input);
      } else {
        field.appendChild(input);
      }
    }

    field.appendChild(errorEl);
    this.form.appendChild(field);
    this._register(record);
  };

  Form.prototype._appendLabel = function (field, spec, id) {
    var label = document.createElement('label');
    label.className = 'vfm-label';
    label.htmlFor = id;
    label.textContent = spec.label != null ? String(spec.label) : String(spec.name);
    this._appendReq(label, spec);
    field.appendChild(label);
  };

  Form.prototype._appendReq = function (label, spec) {
    if (!spec.required) return;
    var req = document.createElement('span');
    req.className = 'vfm-req';
    req.setAttribute('aria-hidden', 'true');
    req.textContent = ' *';
    label.appendChild(req);
  };

  Form.prototype._commonAttrs = function (input, spec, describedBy) {
    if (spec.placeholder) input.placeholder = String(spec.placeholder);
    if (spec.required) input.required = true;
    if (spec.disabled) input.disabled = true;
    if (spec.min != null) input.setAttribute('min', spec.min);
    if (spec.max != null) input.setAttribute('max', spec.max);
    if (spec.minlength != null) input.setAttribute('minlength', spec.minlength);
    if (spec.maxlength != null) input.setAttribute('maxlength', spec.maxlength);
    if (spec.pattern != null && !(spec.pattern instanceof RegExp)) {
      input.setAttribute('pattern', spec.pattern);
    }
    input.setAttribute('aria-describedby', describedBy);
  };

  Form.prototype._bindEye = function (eye, input) {
    var L = this.opts.labels;
    eye.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? L.hidePassword : L.showPassword);
      input.focus();
    });
  };

  /* ---------------- enhance mode: adopt an existing <form> ---------------- */

  Form.prototype._adopt = function () {
    var form = this.el;
    this.form = form;
    this._added = [];          // nodes we created (removed on destroy)
    this._addedClasses = [];   // classes we stamped on adopted controls
    form.classList.add('vfm');
    var s = saltToken();
    if (s) form.classList.add(s);
    this._hadNovalidate = form.hasAttribute('novalidate');
    form.setAttribute('novalidate', ''); // the kit renders constraint UX itself

    // Group named controls; same-name radios/checkboxes become one field.
    var groups = {}, order = [], i, c;
    for (i = 0; i < form.elements.length; i++) {
      c = form.elements[i];
      if (!c.name) continue;
      var tag = c.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') continue;
      var t = (c.type || '').toLowerCase();
      if (t === 'submit' || t === 'button' || t === 'reset' || t === 'image') continue;
      if (!groups[c.name]) { groups[c.name] = []; order.push(c.name); }
      groups[c.name].push(c);
    }

    for (i = 0; i < order.length; i++) {
      var name = order[i];
      var els = groups[name];
      var first = els[0];
      var type = (first.type || '').toLowerCase();
      var kind = 'text';
      if (first.tagName === 'SELECT') kind = 'select';
      else if (type === 'radio') kind = 'radio';
      else if (type === 'checkbox') kind = els.length > 1 ? 'checkboxes' : 'checkbox';
      else if (type === 'hidden') kind = 'text';

      var record = { name: name, kind: kind, inputs: els, el: null,
        errorEl: null, hintEl: null,
        // Attribute-derived spec so the same validator builder applies.
        spec: {
          name: name,
          type: type === 'email' || type === 'url' || type === 'number' ? type : kind,
          required: this._anyRequired(els),
          pattern: first.getAttribute('pattern') || null,
          min: first.getAttribute('min'),
          max: first.getAttribute('max'),
          minlength: first.getAttribute('minlength'),
          maxlength: first.getAttribute('maxlength')
        } };

      if (type !== 'hidden') {
        // The family input skin + a per-field error live region.
        for (var j = 0; j < els.length; j++) {
          var t2 = (els[j].type || '').toLowerCase();
          if (t2 !== 'checkbox' && t2 !== 'radio' && !els[j].classList.contains('vfm-input')) {
            els[j].classList.add('vfm-input');
            this._addedClasses.push(els[j]);
          }
        }
        var errorEl = document.createElement('div');
        errorEl.className = 'vfm-error';
        errorEl.id = this._uid + '-' + order.indexOf(name) + '-err';
        errorEl.setAttribute('aria-live', 'polite');
        var last = els[els.length - 1];
        var anchor = (last.closest && last.closest('label')) || last;
        if (anchor.parentNode) {
          anchor.parentNode.insertBefore(errorEl, anchor.nextSibling);
        } else {
          form.appendChild(errorEl);
        }
        this._added.push(errorEl);
        record.errorEl = errorEl;
        for (j = 0; j < els.length; j++) this._linkDescribedBy(els[j], errorEl.id);
      }

      this._register(record);
    }
  };

  Form.prototype._anyRequired = function (els) {
    for (var i = 0; i < els.length; i++) if (els[i].required) return true;
    return false;
  };

  Form.prototype._linkDescribedBy = function (el, id) {
    var cur = el.getAttribute('aria-describedby');
    el.setAttribute('aria-describedby', cur ? cur + ' ' + id : id);
  };

  Form.prototype._unlinkDescribedBy = function (el, id) {
    var cur = el.getAttribute('aria-describedby');
    if (!cur) return;
    var parts = cur.split(/\s+/), out = [];
    for (var i = 0; i < parts.length; i++) if (parts[i] && parts[i] !== id) out.push(parts[i]);
    if (out.length) el.setAttribute('aria-describedby', out.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  Form.prototype._register = function (record) {
    record.dirty = false;
    record.touched = false;
    record.upgrade = null;
    record.upgradeKind = null;
    record._phoneValid = null;
    record._vtoken = 0;
    record._wasDisabled = record.inputs.length ? !!record.inputs[0].disabled : false;
    record.validators = this._buildValidators(record);
    this._fields.push(record);
    this._byName[record.name] = record;
  };

  /* ---------------- shared chrome: banner, status, honeypot ---------------- */

  Form.prototype._addChrome = function () {
    var form = this.form;

    // Form-level error banner: focusable summary, announced assertively.
    var banner = document.createElement('div');
    banner.className = 'vfm-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('tabindex', '-1');
    banner.hidden = true;
    form.insertBefore(banner, form.firstChild);
    this._banner = banner;

    // Success/status live region — present up-front so SRs announce updates.
    var status = document.createElement('div');
    status.className = 'vfm-status';
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
    this._status = status;

    if (this._enhance) { this._added.push(banner); this._added.push(status); }

    if (!this.opts.honeypot) return;

    // Honeypot: an off-viewport decoy. NOT display:none — cheap bots skip
    // hidden fields; the wrapper is invisible to humans and assistive tech
    // (aria-hidden + tabindex=-1) but present in layout terms.
    var hpName = this.opts.honeypotName;
    if (!hpName) {
      hpName = HP_NAMES[Math.floor(Math.random() * HP_NAMES.length)];
      while (this._byName[hpName]) hpName += '_2'; // never shadow a real field
    }
    var hp = document.createElement('div');
    hp.className = 'vfm-hp';
    hp.setAttribute('aria-hidden', 'true');
    // Inline styles so the trap works headless (styles: false) too.
    hp.style.position = 'absolute';
    hp.style.left = '-9999px';
    hp.style.top = 'auto';
    hp.style.width = '1px';
    hp.style.height = '1px';
    hp.style.overflow = 'hidden';
    var hpLabel = document.createElement('label');
    hpLabel.htmlFor = this._uid + '-hp';
    hpLabel.textContent = 'Website';
    hp.appendChild(hpLabel);
    var hpInput = document.createElement('input');
    hpInput.type = 'text';
    hpInput.id = this._uid + '-hp';
    hpInput.name = hpName;
    hpInput.tabIndex = -1;
    hpInput.setAttribute('autocomplete', 'off');
    hp.appendChild(hpInput);
    form.appendChild(hp);
    this._hpInput = hpInput;

    // Elapsed-ms carrier so the SERVER can double-check the time gate.
    var hpt = document.createElement('input');
    hpt.type = 'hidden';
    hpt.name = '_hp_t';
    form.appendChild(hpt);
    this._hptInput = hpt;

    if (this._enhance) { this._added.push(hp); this._added.push(hpt); }
  };

  /* ---------------- family upgrades (schema mode) ---------------- */

  // select / date / phone fields render native controls; when the matching
  // family component is on the page it takes over the same element and is
  // wired into the form's value + validation state. Never required — a page
  // without those globals keeps fully working native fields.
  Form.prototype._upgradeFields = function () {
    if (this._enhance) return; // enhance mode leaves adopted controls alone
    var self = this;
    for (var i = 0; i < this._fields.length; i++) {
      (function (field) {
        var input = field.inputs[0];
        if (!input) return;
        var Ctor;
        try {
          if (field.kind === 'select' && (Ctor = familyComponent('Select', 'select'))) {
            field.upgrade = new Ctor(input, {
              onChange: function () { self._fieldChanged(field); }
            });
            field.upgradeKind = 'select';
          } else if (field.kind === 'date' && input.type === 'text' &&
              (Ctor = familyComponent('DatePicker', 'datepicker'))) {
            var dpOpts = { onSelect: function () { self._fieldChanged(field); } };
            if (field.spec.min != null) dpOpts.min = field.spec.min;
            if (field.spec.max != null) dpOpts.max = field.spec.max;
            field.upgrade = new Ctor(input, dpOpts);
            field.upgradeKind = 'date';
          } else if (field.kind === 'phone' &&
              (Ctor = familyComponent('PhoneInput', 'phoneinput'))) {
            field.upgrade = new Ctor(input, {
              onChange: function (val, inst) {
                // The phone component's own `.valid` flag feeds validation.
                var src = inst || field.upgrade;
                if (val && typeof val === 'object' && typeof val.valid === 'boolean') {
                  field._phoneValid = val.valid;
                } else if (src && typeof src.valid === 'boolean') {
                  field._phoneValid = src.valid;
                }
                self._fieldChanged(field);
              }
            });
            field.upgradeKind = 'phone';
          }
        } catch (err) {
          // An upgrade failure degrades to the native control — never fatal.
          field.upgrade = null;
          field.upgradeKind = null;
          if (typeof console !== 'undefined') console.error('Form upgrade:', err);
        }
      })(this._fields[i]);
    }
  };

  /* ---------------- events ---------------- */

  Form.prototype._bind = function () {
    var self = this;
    this._onSubmitEvt = function (e) {
      e.preventDefault();
      self.submit();
    };
    this._onInputEvt = function (e) { self._handleFieldEvent(e); };
    this._onFocusOutEvt = function (e) {
      var field = self._fieldFromTarget(e.target);
      if (!field) return;
      field.touched = true;
      if (self.opts.validateOn === 'blur' || self._errors[field.name] != null) {
        self._validateField(field, false);
      }
    };
    this.form.addEventListener('submit', this._onSubmitEvt);
    this.form.addEventListener('input', this._onInputEvt);
    this.form.addEventListener('change', this._onInputEvt);
    this.form.addEventListener('focusout', this._onFocusOutEvt);
  };

  Form.prototype._fieldFromTarget = function (t) {
    return (t && t.name && this._byName[t.name]) || null;
  };

  Form.prototype._handleFieldEvent = function (e) {
    var field = this._fieldFromTarget(e.target);
    if (!field) return;
    if (field.spec.autoGrow && e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
    this._fieldChanged(field);
  };

  // Central change funnel — every path (typing, upgrades, setValue) lands
  // here; equality-checking dedupes double-fired input/change pairs.
  Form.prototype._fieldChanged = function (field) {
    if (!this.form) return;
    var v = this._read(field);
    if (eqValues(v, field._last)) return;
    field._last = v;
    field.dirty = !eqValues(v, field.initial);
    if (this._errors[field.name] != null || this.opts.validateOn === 'change') {
      this._validateField(field, false); // live re-validate erroring fields
    }
    this._notifyChange(field, v);
  };

  Form.prototype._notifyChange = function (field, value) {
    var meta = {
      dirty: field.dirty,
      touched: field.touched,
      error: this._errors[field.name] || null
    };
    var ws = this._watchers.slice();
    var values = null;
    for (var i = 0; i < ws.length; i++) {
      if (ws[i].name === field.name) ws[i].fn(value, meta);
      else if (ws[i].name == null) {
        if (!values) values = this._snapshotValues();
        ws[i].fn(values, field.name, meta);
      }
    }
    if (this.opts.onChange) {
      this.opts.onChange(values || this._snapshotValues(), this);
    }
  };

  /* ---------------- reading & writing control values ---------------- */

  Form.prototype._read = function (field) {
    var k = field.kind, inputs = field.inputs, i;
    if (k === 'checkbox') return !!inputs[0].checked;
    if (k === 'checkboxes') {
      var arr = [];
      for (i = 0; i < inputs.length; i++) if (inputs[i].checked) arr.push(inputs[i].value);
      return arr;
    }
    if (k === 'radio') {
      for (i = 0; i < inputs.length; i++) if (inputs[i].checked) return inputs[i].value;
      return '';
    }
    if (k === 'select') {
      if (field.upgrade && typeof field.upgrade.getValue === 'function') {
        var v = field.upgrade.getValue();
        return v == null ? '' : v;
      }
      if (inputs[0].multiple) {
        var out = [];
        for (i = 0; i < inputs[0].options.length; i++) {
          if (inputs[0].options[i].selected) out.push(inputs[0].options[i].value);
        }
        return out;
      }
      return inputs[0].value;
    }
    if (k === 'phone' && field.upgrade && typeof field.upgrade.getValue === 'function') {
      var pv = field.upgrade.getValue();
      if (pv && typeof pv === 'object' && pv.value != null) return String(pv.value);
      if (typeof pv === 'string') return pv;
    }
    return inputs[0].value;
  };

  Form.prototype._write = function (field, v) {
    var k = field.kind, inputs = field.inputs, i;
    try {
      if (k === 'checkbox') { inputs[0].checked = !!v; return; }
      if (k === 'checkboxes') {
        var vals = Array.isArray(v) ? v : (v == null || v === '' ? [] : [String(v)]);
        for (i = 0; i < inputs.length; i++) {
          inputs[i].checked = vals.indexOf(inputs[i].value) !== -1;
        }
        return;
      }
      if (k === 'radio') {
        for (i = 0; i < inputs.length; i++) {
          inputs[i].checked = inputs[i].value === String(v == null ? '' : v);
        }
        return;
      }
      if (field.upgrade) {
        if (field.upgradeKind === 'select') {
          field.upgrade.setValue(v == null || v === '' ? null : v, { silent: true });
          return;
        }
        if (field.upgradeKind === 'date' && typeof field.upgrade.setDate === 'function') {
          field.upgrade.setDate(v == null || v === '' ? null : v, { silent: true });
          return;
        }
        if (field.upgradeKind === 'phone' && typeof field.upgrade.setValue === 'function') {
          field.upgrade.setValue(v == null ? '' : v, { silent: true });
          return;
        }
      }
      if (k === 'select' && inputs[0].multiple) {
        var mv = Array.isArray(v) ? v : (v == null || v === '' ? [] : [String(v)]);
        for (i = 0; i < inputs[0].options.length; i++) {
          inputs[0].options[i].selected = mv.indexOf(inputs[0].options[i].value) !== -1;
        }
        return;
      }
      inputs[0].value = v == null ? '' : String(v);
    } catch (err) { /* e.g. file inputs — value is read-only */ }
  };

  /* ---------------- validation ---------------- */

  Form.prototype._buildValidators = function (record) {
    var spec = record.spec || {};
    var L = this.opts.labels;
    var fns = [];
    var t = spec.type;

    if (spec.required) {
      fns.push(function (v) { return validators.required(v, null, L); });
    }
    if (t === 'email') {
      fns.push(function (v) { return validators.email(v, null, L); });
    }
    if (t === 'url') {
      fns.push(function (v) { return validators.url(v, null, L); });
    }
    if (t === 'number') {
      fns.push(function (v) { return validators.number(v, spec.min, spec.max, L); });
    }
    if (spec.minlength != null || spec.maxlength != null) {
      fns.push(function (v) {
        return validators.length(v, spec.minlength, spec.maxlength, L);
      });
    }
    if (spec.pattern) {
      fns.push(function (v) { return validators.pattern(v, spec.pattern, L); });
    }
    if (t === 'phone' || record.kind === 'phone') {
      // Only meaningful once a PhoneInput upgrade reports a verdict.
      fns.push(function (v) {
        return (!isEmptyValue(v) && record._phoneValid === false) ? L.phone : null;
      });
    }
    var custom = spec.validate;
    if (typeof custom === 'function') fns.push(custom);
    else if (Array.isArray(custom)) {
      for (var i = 0; i < custom.length; i++) {
        if (typeof custom[i] === 'function') fns.push(custom[i]);
      }
    }
    return fns;
  };

  // Runs a field's chain; returns message | null, or a thenable when an
  // async validator (username-taken checks etc.) is in play.
  Form.prototype._runValidators = function (field) {
    var values = this._snapshotValues();
    var v = values[field.name];
    var fns = field.validators;
    var i = 0;
    function step() {
      while (i < fns.length) {
        var res;
        try { res = fns[i++](v, values); }
        catch (err) { res = (err && err.message) || 'Invalid value'; }
        if (isThenable(res)) {
          return res.then(
            function (m) { return m ? m : step(); },
            function (err) { return (err && err.message) || 'Invalid value'; }
          );
        }
        if (res) return res;
      }
      return null;
    }
    return step();
  };

  Form.prototype._validateField = function (field, silent) {
    var self = this;
    var token = ++field._vtoken;
    var r = this._runValidators(field);
    if (isThenable(r)) {
      return r.then(function (m) {
        // A newer validation superseded this one — its verdict is stale.
        if (token !== field._vtoken) return self._errors[field.name] || null;
        return self._applyValidity(field, m, silent);
      });
    }
    return this._applyValidity(field, r, silent);
  };

  Form.prototype._applyValidity = function (field, msg, silent) {
    if (!silent) {
      if (msg) this._errors[field.name] = msg;
      else delete this._errors[field.name];
      this._renderError(field, msg);
    }
    return msg || null;
  };

  Form.prototype._renderError = function (field, msg) {
    if (field.errorEl) field.errorEl.textContent = msg ? String(msg) : '';
    for (var i = 0; i < field.inputs.length; i++) {
      var input = field.inputs[i];
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (input.classList) input.classList.toggle('is-invalid', !!msg);
    }
    if (field.el && field.el.classList) field.el.classList.toggle('is-invalid', !!msg);
  };

  // Full validation pass; resolves true when everything is clean.
  Form.prototype.validate = function (config) {
    if (!this.form) return Promise.resolve(true);
    var silent = !!(config && config.silent);
    var pending = [];
    var bad = false;
    for (var i = 0; i < this._fields.length; i++) {
      var r = this._validateField(this._fields[i], silent);
      if (isThenable(r)) pending.push(r);
      else if (r) bad = true;
    }
    if (!pending.length) return Promise.resolve(!bad);
    return Promise.all(pending).then(function (msgs) {
      for (var j = 0; j < msgs.length; j++) if (msgs[j]) bad = true;
      return !bad;
    });
  };

  // Synchronous verdict: async validators still in flight count as valid.
  Form.prototype.isValid = function () {
    if (!this.form) return true;
    for (var i = 0; i < this._fields.length; i++) {
      var r = this._runValidators(this._fields[i]);
      if (r && !isThenable(r)) return false;
    }
    return true;
  };

  Form.prototype._focusFirstInvalid = function () {
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      if (this._errors[f.name] == null) continue;
      this._focusField(f);
      return;
    }
  };

  Form.prototype._focusField = function (field) {
    try {
      if (field.upgradeKind === 'select' && field.upgrade &&
          field.upgrade._control && field.upgrade._control.focus) {
        field.upgrade._control.focus();
      } else if (field.inputs[0] && field.inputs[0].focus) {
        field.inputs[0].focus();
      }
    } catch (err) { /* focusing must never throw */ }
  };

  /* ---------------- banner / status / loading ---------------- */

  Form.prototype._showBanner = function (msg) {
    if (!this._banner) return;
    this._banner.textContent = String(msg);
    this._banner.hidden = false;
    try { this._banner.focus(); } catch (err) { /* ignore */ }
  };

  Form.prototype._clearBanner = function () {
    if (!this._banner) return;
    this._banner.textContent = '';
    this._banner.hidden = true;
  };

  Form.prototype._setStatus = function (msg) {
    if (this._status) this._status.textContent = msg ? String(msg) : '';
  };

  Form.prototype._submitButton = function () {
    if (this._submitBtn) return this._submitBtn;
    return this.form.querySelector(
      'button[type=submit],input[type=submit],button:not([type])');
  };

  Form.prototype._setLoading = function (on) {
    var btn = this._submitButton();
    if (!btn) return;
    if (on) {
      this._btnWasDisabled = btn.disabled;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.disabled = !!this._btnWasDisabled || this._disabled;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
    }
  };

  /* ---------------- submission ---------------- */

  Form.prototype.submit = function () {
    var self = this;
    if (!this.form || this._submitting || this._disabled) return Promise.resolve(false);
    this._submitting = true;
    this._clearBanner();
    this._setStatus('');

    // Honeypot + time gate: pretend everything worked. The bot learns
    // nothing; onSpam gives the host page a logging hook.
    var elapsed = new Date().getTime() - this._renderedAt;
    var trapped = (this._hpInput && this._hpInput.value !== '') ||
      (this.opts.honeypot && elapsed < this.opts.minFillTime);
    if (trapped) {
      if (this.opts.onSpam) {
        try { this.opts.onSpam(this._snapshotValues()); } catch (err) { /* ignore */ }
      }
      this._submitting = false;
      this._succeed();
      return Promise.resolve(true);
    }
    if (this._hptInput) this._hptInput.value = String(elapsed);

    return this.validate().then(function (ok) {
      if (!self.form) { self._submitting = false; return false; }
      if (!ok) {
        self._submitting = false;
        self._focusFirstInvalid();
        return false;
      }
      var values = self._snapshotValues();
      self._setLoading(true);
      var p;
      try {
        if (self.opts.onSubmit) p = self.opts.onSubmit(values, self);
        else if (self.opts.action) p = self._send(values, elapsed);
        else p = null; // client-only form: valid = success
      } catch (err) {
        p = Promise.reject(err);
      }
      return Promise.resolve(p).then(
        function () {
          self._submitting = false;
          if (!self.form) return true;
          self._setLoading(false);
          self._succeed();
          return true;
        },
        function (err) {
          self._submitting = false;
          if (!self.form) return false;
          self._handleSubmitError(err);
          return false;
        }
      );
    });
  };

  Form.prototype._succeed = function () {
    this._setLoading(false);
    this._errors = {};
    for (var i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    if (this.opts.resetOnSuccess) this.reset();
    var msg = this.opts.successMessage;
    if (msg) {
      // Converge with the family: a Toast on the page beats an inline note.
      if (window.Toast && typeof window.Toast.success === 'function') {
        window.Toast.success(msg);
      } else {
        this._setStatus(msg);
      }
    }
  };

  // Error contract: Error → focused form-level banner; {field: msg} or
  // {errors: {field: msg}} (e.g. a server 422 body) → distributed to fields
  // with the first one focused; anything else → generic banner.
  Form.prototype._handleSubmitError = function (err) {
    this._setLoading(false);
    var L = this.opts.labels;
    var map = null;
    if (err && typeof err === 'object' && !(err instanceof Error)) {
      if (err.errors && typeof err.errors === 'object') map = err.errors;
      else map = err;
    }
    if (map) {
      var first = null;
      for (var name in map) {
        var f = this._byName[name];
        if (!f) continue;
        this._errors[name] = String(map[name]);
        this._renderError(f, String(map[name]));
        if (!first) first = f;
      }
      if (first) this._focusField(first);
      else this._showBanner(L.submitError); // unknown shape → generic
    } else {
      this._showBanner((err && err.message) ? String(err.message) : L.submitError);
    }
    if (this.opts.onError) this.opts.onError(err, this);
  };

  Form.prototype._send = function (values, elapsed) {
    var opts = this.opts;
    var L = opts.labels;
    var url = opts.action;
    var method = String(opts.method ||
      (this._enhance && this.form.getAttribute('method')) || 'POST').toUpperCase();

    // Shallow copy + the elapsed-ms carrier for server-side spam checks.
    var payload = {}, k;
    for (k in values) payload[k] = values[k];
    payload._hp_t = elapsed;

    var headers = {};
    if (opts.headers) for (k in opts.headers) headers[k] = opts.headers[k];

    var body;
    if (method === 'GET' || method === 'HEAD') {
      var qs = [];
      for (k in payload) {
        var qv = payload[k];
        if (Array.isArray(qv)) {
          for (var qi = 0; qi < qv.length; qi++) {
            qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(qv[qi]));
          }
        } else {
          qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(qv == null ? '' : qv));
        }
      }
      url += (url.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
      body = undefined;
    } else if (opts.encoding === 'form' && typeof FormData !== 'undefined') {
      body = new FormData();
      for (k in payload) {
        var fv = payload[k];
        if (Array.isArray(fv)) {
          for (var fi = 0; fi < fv.length; fi++) body.append(k, fv[fi]);
        } else if (typeof fv === 'boolean') {
          if (fv) body.append(k, '1');
        } else {
          body.append(k, fv == null ? '' : fv);
        }
      }
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    function conclude(ok, status, text) {
      var data = null;
      try { data = JSON.parse(text); } catch (err) { /* non-JSON body */ }
      if (ok) return data;
      // 422-style { errors: {field: message} } is handled out of the box.
      if (data && data.errors && typeof data.errors === 'object') {
        var fieldErr = { errors: data.errors, status: status };
        throw fieldErr;
      }
      var e = new Error((data && (data.message || data.error)) || L.submitError);
      e.status = status;
      throw e;
    }

    if (typeof fetch === 'function') {
      return fetch(url, {
        method: method,
        headers: headers,
        body: body,
        credentials: 'same-origin'
      }).then(function (res) {
        return res.text().then(function (text) {
          return conclude(res.ok, res.status, text);
        });
      });
    }

    // XMLHttpRequest fallback for fetch-less browsers.
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url, true);
      for (var h in headers) x.setRequestHeader(h, headers[h]);
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        if (x.status === 0) { reject(new Error(L.submitError)); return; }
        try {
          resolve(conclude(x.status >= 200 && x.status < 300, x.status, x.responseText));
        } catch (err) {
          reject(err);
        }
      };
      x.send(body === undefined ? null : body);
    });
  };

  /* ---------------- public reactive API ---------------- */

  Form.prototype.getValue = function (name) {
    if (!this.form) return undefined;
    var f = this._byName[name];
    return f ? this._read(f) : undefined;
  };

  Form.prototype.setValue = function (name, v, config) {
    if (!this.form) return this;
    var f = this._byName[name];
    if (!f) return this;
    this._write(f, v);
    if (config && config.silent) {
      f._last = this._read(f);
      f.dirty = !eqValues(f._last, f.initial);
    } else {
      this._fieldChanged(f);
    }
    return this;
  };

  Form.prototype.setValues = function (obj, config) {
    if (!this.form || !obj) return this;
    for (var name in obj) this.setValue(name, obj[name], config);
    return this;
  };

  Form.prototype.setError = function (name, msg) {
    if (!this.form) return this;
    var f = this._byName[name];
    if (!f) return this;
    if (msg) this._errors[name] = String(msg);
    else delete this._errors[name];
    this._renderError(f, msg);
    return this;
  };

  Form.prototype.clearErrors = function () {
    if (!this.form) return this;
    this._errors = {};
    for (var i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    this._clearBanner();
    return this;
  };

  Form.prototype.isDirty = function () {
    if (!this.form) return false;
    for (var i = 0; i < this._fields.length; i++) if (this._fields[i].dirty) return true;
    return false;
  };

  // watch('email', fn(value, meta)) — one field.
  // watch(fn(values, changedName, meta)) — any change.
  // Both return an unsubscribe function.
  Form.prototype.watch = function (name, fn) {
    if (typeof name === 'function') { fn = name; name = null; }
    if (typeof fn !== 'function' || !this.form) return function () {};
    var entry = { name: name, fn: fn };
    var watchers = this._watchers;
    watchers.push(entry);
    return function () {
      var i = watchers.indexOf(entry);
      if (i !== -1) watchers.splice(i, 1);
    };
  };

  Form.prototype.reset = function () {
    if (!this.form) return this;
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      f._vtoken++; // discard in-flight async verdicts
      this._write(f, f.initial);
      f._last = f.initial;
      f.dirty = false;
      f.touched = false;
      f._phoneValid = null;
    }
    this._errors = {};
    for (i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    this._clearBanner();
    this._setStatus('');
    return this;
  };

  Form.prototype.enable = function () {
    if (!this.form) return this;
    this._disabled = false;
    this.form.classList.remove('is-disabled');
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      for (var j = 0; j < f.inputs.length; j++) f.inputs[j].disabled = f._wasDisabled;
      if (f.upgrade && !f._wasDisabled && typeof f.upgrade.enable === 'function') {
        f.upgrade.enable();
      }
    }
    var btn = this._submitButton();
    if (btn) btn.disabled = false;
    return this;
  };

  Form.prototype.disable = function () {
    if (!this.form) return this;
    this._disabled = true;
    this.form.classList.add('is-disabled');
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      for (var j = 0; j < f.inputs.length; j++) f.inputs[j].disabled = true;
      if (f.upgrade && typeof f.upgrade.disable === 'function') f.upgrade.disable();
    }
    var btn = this._submitButton();
    if (btn) btn.disabled = true;
    return this;
  };

  // Tear down: schema mode removes the built DOM; enhance mode restores the
  // original form (listeners, classes, attributes, added nodes).
  Form.prototype.destroy = function () {
    if (!this.form) return this;
    unwatchAutoTheme(this);
    this.form.removeEventListener('submit', this._onSubmitEvt);
    this.form.removeEventListener('input', this._onInputEvt);
    this.form.removeEventListener('change', this._onInputEvt);
    this.form.removeEventListener('focusout', this._onFocusOutEvt);

    var i, f;
    for (i = 0; i < this._fields.length; i++) {
      f = this._fields[i];
      if (f.upgrade && typeof f.upgrade.destroy === 'function') {
        try { f.upgrade.destroy(); } catch (err) { /* ignore */ }
      }
    }

    if (this._enhance) {
      for (i = 0; i < this._added.length; i++) {
        if (this._added[i].parentNode) {
          this._added[i].parentNode.removeChild(this._added[i]);
        }
      }
      for (i = 0; i < this._addedClasses.length; i++) {
        this._addedClasses[i].classList.remove('vfm-input');
      }
      for (i = 0; i < this._fields.length; i++) {
        f = this._fields[i];
        for (var j = 0; j < f.inputs.length; j++) {
          f.inputs[j].removeAttribute('aria-invalid');
          f.inputs[j].classList.remove('is-invalid');
          if (f.errorEl) this._unlinkDescribedBy(f.inputs[j], f.errorEl.id);
        }
      }
      this.form.classList.remove('vfm');
      var s = saltToken();
      if (s) this.form.classList.remove(s);
      this.form.removeAttribute('data-theme');
      if (!this._hadNovalidate) this.form.removeAttribute('novalidate');
    } else if (this.form.parentNode) {
      this.form.parentNode.removeChild(this.form);
    }

    if (instances) instances.delete(this.el);
    this._fields = [];
    this._byName = {};
    this._watchers = [];
    this.form = null;
    return this;
  };

  /* ---------------- theming ---------------- */

  Form.prototype._applyTheme = function () {
    if (!this.form) return;
    var t = this.opts.theme;
    var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    this.form.setAttribute('data-theme', resolved);
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Form.version = VERSION;
  Form.defaults = DEFAULTS;
  Form.validators = validators;

  Form.create = function (target, options) {
    return new Form(target, options);
  };

  Form.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vfmValidateOn) o.validateOn = d.vfmValidateOn;
    if (d.vfmEncoding) o.encoding = d.vfmEncoding;
    if (d.vfmAction) o.action = d.vfmAction;
    if (d.vfmMethod) o.method = d.vfmMethod;
    if (d.vfmSuccess) o.successMessage = d.vfmSuccess;
    if (d.vfmTheme) o.theme = d.vfmTheme;
    if (d.vfmHoneypotName) o.honeypotName = d.vfmHoneypotName;
    if (d.vfmMinFillTime != null && d.vfmMinFillTime !== '') {
      o.minFillTime = +d.vfmMinFillTime;
    }
    if (d.vfmHoneypot != null) o.honeypot = parseBool(d.vfmHoneypot);
    if (d.vfmStyles != null) o.styles = parseBool(d.vfmStyles);
    if (d.vfmReset != null) o.resetOnSuccess = parseBool(d.vfmReset);
    return o;
  }

  // <form data-vfm> = enhance with attribute-derived options.
  Form.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('form[data-vfm]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Form(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad form must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Form auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Form.autoInit(); });
    } else {
      Form.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Form.displayName = 'Form';
  Form.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Form, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Form.css = renderCss();
  }
  Form.rootClass = 'vfm';
  Form.themeVars = {
    accent: '--vfm-accent',
    radius: '--vfm-radius',
    font: '--vfm-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Form.varScopes = ['.vfm', '.vfm[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('form', Form);
  }

  return Form;
});

}).call(__root);
var Form = __root.Form;
export { Form };
export default Form;
