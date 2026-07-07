/*! vanilla-ui-kit/upload v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Upload v1.0.0
 * A single-file, zero-dependency file-upload dropzone + managed file list
 * for vanilla JS. Part of the Vanilla UI Kit family — standalone, or
 * converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="upload.js"></script>
 *   <script>
 *     new Upload('#avatar', {
 *       accept: 'image/*',
 *       upload: { action: '/api/upload' },
 *       autoUpload: true
 *     })
 *   </script>
 *
 * Or enhance an existing <input type=file> (kept functional for the form):
 *   new Upload(document.querySelector('input[type=file]'))
 *
 * Headless:
 *   Upload.defaults.styles = false   // no CSS injected; style .vup-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Upload = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-upload-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Upload.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Upload.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the dropzone; custom-property DEFINITIONS stay unsalted at
  // their documented specificity so `.vup{--vup-accent:…}` page overrides
  // keep working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vup{' +
      '--vup-accent:#5b5bd6;' +
      '--vup-danger:#e5484d;' +
      '--vup-success:#1f9d5b;' +
      '--vup-bg:#ffffff;' +
      '--vup-surface:#f2f2f5;' +
      '--vup-text:#1c1d21;' +
      '--vup-muted:#72747e;' +
      '--vup-faint:#e7e7ec;' +
      '--vup-accent-soft:rgba(91,91,214,.13);' +
      '--vup-danger-soft:rgba(229,72,77,.12);' +
      '--vup-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vup-radius:12px;' +
      '--vup-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vup[data-theme=dark]{' +
      '--vup-accent:#7b7bea;' +
      '--vup-danger:#f2555a;' +
      '--vup-success:#4ccb8f;' +
      '--vup-bg:#1b1d24;' +
      '--vup-surface:#272a33;' +
      '--vup-text:#e9eaf0;' +
      '--vup-muted:#989aa6;' +
      '--vup-faint:#31343f;' +
      '--vup-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vup{' +
      '--vup-accent-soft:color-mix(in srgb,var(--vup-accent) 14%,transparent);' +
      '--vup-danger-soft:color-mix(in srgb,var(--vup-danger) 13%,transparent);}}' +
    '.vup.SALT{display:block;color:var(--vup-text);font-family:var(--vup-font);' +
      'font-size:14px;line-height:1.5;text-align:left;}' +
    '.vup.SALT *,.vup.SALT *::before,.vup.SALT *::after{box-sizing:border-box;}' +
    /* dropzone */
    '.vup.SALT .vup-zone{display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:6px;text-align:center;padding:26px 18px;' +
      'background:var(--vup-bg);border:1.5px dashed var(--vup-faint);' +
      'border-radius:var(--vup-radius);cursor:pointer;-webkit-user-select:none;' +
      'user-select:none;-webkit-tap-highlight-color:transparent;' +
      'transition:border-color .12s ease,background .12s ease,box-shadow .12s ease;}' +
    '.vup.SALT .vup-zone:hover{border-color:var(--vup-accent);}' +
    '.vup.SALT .vup-zone:focus{outline:none;}' +
    '.vup.SALT .vup-zone:focus-visible{border-color:var(--vup-accent);' +
      'box-shadow:0 0 0 3px var(--vup-accent-soft);}' +
    '.vup.SALT.is-drag .vup-zone{border-color:var(--vup-accent);' +
      'background:var(--vup-accent-soft);}' +
    '.vup.SALT.is-disabled .vup-zone{opacity:.55;cursor:not-allowed;}' +
    '.vup.SALT .vup-zone-icon{color:var(--vup-muted);}' +
    '.vup.SALT.is-drag .vup-zone-icon{color:var(--vup-accent);}' +
    '.vup.SALT .vup-zone-icon svg{display:block;}' +
    '.vup.SALT .vup-prompt{color:var(--vup-muted);margin:0;}' +
    '.vup.SALT .vup-browse{color:var(--vup-accent);font-weight:600;' +
      'text-decoration:underline;text-underline-offset:2px;}' +
    /* the real <input type=file> and the live region — visually hidden but
       NOT display:none, so the input keeps submitting with a parent form */
    '.vup.SALT .vup-native,.vup.SALT .vup-live{position:absolute!important;' +
      'width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;' +
      'clip:rect(0 0 0 0);white-space:nowrap;}' +
    /* file list */
    '.vup.SALT .vup-list{list-style:none;margin:10px 0 0;padding:0;display:flex;' +
      'flex-direction:column;gap:8px;}' +
    '.vup.SALT .vup-item{display:flex;align-items:center;gap:10px;' +
      'padding:8px 10px;background:var(--vup-bg);border:1px solid var(--vup-faint);' +
      'border-radius:10px;}' +
    '.vup.SALT .vup-item[data-status=error]{border-color:var(--vup-danger);' +
      'background:var(--vup-danger-soft);}' +
    '.vup.SALT .vup-thumb{flex:none;width:38px;height:38px;border-radius:8px;' +
      'background:var(--vup-surface);display:grid;place-items:center;' +
      'color:var(--vup-muted);overflow:hidden;}' +
    '.vup.SALT .vup-thumb svg{display:block;}' +
    '.vup.SALT .vup-thumb img{width:100%;height:100%;object-fit:cover;display:block;}' +
    '.vup.SALT .vup-meta{flex:1;min-width:0;}' +
    '.vup.SALT .vup-name{font-weight:600;font-size:13.5px;white-space:nowrap;' +
      'overflow:hidden;text-overflow:ellipsis;}' +
    '.vup.SALT .vup-sub{color:var(--vup-muted);font-size:12.5px;}' +
    '.vup.SALT .vup-item[data-status=done] .vup-sub{color:var(--vup-success);}' +
    '.vup.SALT .vup-errmsg{color:var(--vup-danger);font-size:12.5px;}' +
    /* progress bar */
    '.vup.SALT .vup-bar{height:4px;background:var(--vup-faint);border-radius:999px;' +
      'margin-top:6px;overflow:hidden;}' +
    '.vup.SALT .vup-fill{height:100%;width:0;background:var(--vup-accent);' +
      'border-radius:999px;transition:width .15s ease;}' +
    /* row buttons */
    '.vup.SALT .vup-retry,.vup.SALT .vup-remove{flex:none;width:26px;height:26px;' +
      'display:grid;place-items:center;color:var(--vup-muted);background:none;' +
      'border:0;border-radius:6px;padding:0;cursor:pointer;' +
      'transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vup.SALT .vup-remove:hover{background:var(--vup-surface);color:var(--vup-danger);}' +
    '.vup.SALT .vup-retry:hover{background:var(--vup-surface);color:var(--vup-accent);}' +
    '.vup.SALT .vup-retry svg,.vup.SALT .vup-remove svg{display:block;}' +
    '.vup.SALT .vup-retry:focus,.vup.SALT .vup-remove:focus{outline:none;}' +
    '.vup.SALT .vup-retry:focus-visible,.vup.SALT .vup-remove:focus-visible{' +
      'outline:2px solid var(--vup-accent);outline-offset:1px;}' +
    '.vup.SALT.is-disabled .vup-retry,.vup.SALT.is-disabled .vup-remove{' +
      'opacity:.55;cursor:not-allowed;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vup.SALT,.vup.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/upload.css), or set Upload.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Upload.salt;
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
    // Insert before the page's own CSS so `.vup { --vup-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    cloud: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
      '<path d="M9 20.5H7.75a4.75 4.75 0 0 1-.63-9.46 6.5 6.5 0 0 1 12.76 0 4.75 4.75 0 0 1' +
      ' -.63 9.46H19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"' +
      ' stroke-linejoin="round"/>' +
      '<path d="M14 22.5v-8m0 0-3.2 3.2M14 14.5l3.2 3.2" stroke="currentColor"' +
      ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    file: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M4 1.75h5L12.25 5v9.25h-8.5V1.75Z" stroke="currentColor"' +
      ' stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M9 1.75V5h3.25" stroke="currentColor" stroke-width="1.4"' +
      ' stroke-linejoin="round"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>',
    retry: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M13.65 8A5.65 5.65 0 1 1 8 2.35c2.1 0 3.9 1.1 4.9 2.75" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M13.3 1.9v3.3H10" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>'
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

  // '{name}' style message interpolation.
  function msgFmt(tpl, repl) {
    var out = String(tpl);
    for (var k in repl) out = out.split('{' + k + '}').join(String(repl[k]));
    return out;
  }

  // Human-readable byte counts: 1536 → '1.5 KB'. Also exposed as a static.
  function formatBytes(n) {
    n = +n;
    if (!isFinite(n) || n < 0) return '';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n = n / 1024; i++; }
    // One decimal below 10 (except plain bytes), so '1.5 KB' but '512 KB'.
    var s = (i > 0 && n < 10) ? (Math.round(n * 10) / 10).toFixed(1) : String(Math.round(n));
    return s.replace(/\.0$/, '') + ' ' + units[i];
  }

  // Does `file` match an accept string ('image/*,.pdf,application/zip')?
  // Mirrors the browser's own picker filter; empty accept accepts anything.
  function matchesAccept(file, accept) {
    if (!accept) return true;
    var parts = String(accept).split(',');
    var type = (file.type || '').toLowerCase();
    var name = (file.name || '').toLowerCase();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/^\s+|\s+$/g, '').toLowerCase();
      if (!p) continue;
      if (p.charAt(0) === '.') {
        if (name.length >= p.length &&
            name.indexOf(p) === name.length - p.length) return true;
      } else if (p.slice(-2) === '/*') {
        if (type.indexOf(p.slice(0, -1)) === 0) return true;
      } else if (type === p) {
        return true;
      }
    }
    return false;
  }

  function isThenable(x) {
    return x && typeof x.then === 'function';
  }

  /* ------------------------------------------------------------------ *
   * Built-in XMLHttpRequest uploader — used when `upload` is a config
   * object ({action, method, fieldName, headers, withCredentials}).
   * Callback-style so it works even where Promise is absent.
   * ------------------------------------------------------------------ */

  function xhrUpload(file, cfg, onProgress, done) {
    var x = new XMLHttpRequest();
    x.open(String(cfg.method || 'POST').toUpperCase(), cfg.action, true);
    if (cfg.withCredentials) x.withCredentials = true;
    if (cfg.headers) {
      for (var h in cfg.headers) x.setRequestHeader(h, cfg.headers[h]);
    }
    if (x.upload) {
      x.upload.onprogress = function (e) {
        if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
      };
    }
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var body = null;
      try { body = JSON.parse(x.responseText); } catch (err) { body = x.responseText; }
      if (x.status >= 200 && x.status < 300) {
        done(null, body);
      } else {
        var e = new Error((body && body.message) ||
          'Upload failed (' + (x.status || 'network error') + ')');
        e.status = x.status;
        e.response = body;
        done(e);
      }
    };
    var fd = new FormData();
    fd.append(cfg.fieldName || 'file', file, file.name);
    x.send(fd);
    return x; // kept on the item so remove()/destroy() can abort
  }

  /* ------------------------------------------------------------------ *
   * Defaults.
   * ------------------------------------------------------------------ */

  var DEFAULTS = {
    multiple: false,        // false = a new pick REPLACES the current file
    accept: null,           // 'image/*,.pdf' — set on the input AND validated
    maxSize: null,          // bytes; larger files get an inline error row
    maxFiles: null,         // cap on managed files (multiple mode)
    text: null,             // full dropzone prompt; overrides labels.drop/browse
    listPosition: 'below',  // 'below' | 'none' (render your own via callbacks)
    autoUpload: false,      // true = upload immediately on add
    upload: null,           // fn(file, onProgress) → Promise, or
                            // {action, method:'POST', fieldName:'file', headers, withCredentials}
    name: null,             // created input's name= (form fallback); null = none
    onAdd: null,            // fn(file, instance)
    onRemove: null,         // fn(file, instance)
    onProgress: null,       // fn(file, pct 0..100, instance)
    onDone: null,           // fn(file, response, instance)
    onError: null,          // fn(file, error, instance) — validation & upload
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vup-* yourself
    labels: {
      zone: 'Choose files',
      drop: 'Drop files here or',
      browse: 'browse',
      files: 'Selected files',
      remove: 'Remove {name}',
      retry: 'Retry uploading {name}',
      progress: 'Uploading {name}',
      added: '{name} added',
      removed: '{name} removed',
      uploaded: '{name} uploaded',
      failed: '{name} failed: {error}',
      done: 'Uploaded',
      tooLarge: 'File is larger than {size}',
      badType: 'File type not accepted',
      tooMany: 'No more than {max} files',
      uploadError: 'Upload failed'
    }
  };

  /* ------------------------------------------------------------------ *
   * SSR / null-target: an inert handle whose whole API is a harmless no-op.
   * ------------------------------------------------------------------ */

  function inertHandle() {
    var h = {
      el: null, root: null, input: null,
      addFiles: function () { return h; },
      removeFile: function () { return h; },
      uploadAll: function () {
        return typeof Promise !== 'undefined' ? Promise.resolve([]) : null;
      },
      getFiles: function () { return []; },
      clear: function () { return h; },
      enable: function () { return h; },
      disable: function () { return h; },
      destroy: function () { return h; }
    };
    return h;
  }

  /* ------------------------------------------------------------------ *
   * Upload.
   * ------------------------------------------------------------------ */

  function Upload(target, options) {
    // SSR / no target: return an inert handle so calling code never branches.
    if (!HAS_DOM || target == null) return inertHandle();
    var el = resolveElement(target);
    if (!el) throw new Error('Upload: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this._enhance = el.tagName === 'INPUT' && (el.type || '').toLowerCase() === 'file';

    // Enhance mode adopts the input's own multiple/accept attributes when
    // the option is not given — classic progressive enhancement.
    if (this._enhance) {
      if (options.multiple === undefined && el.multiple) options = shallow(options, 'multiple', true);
      if (options.accept === undefined && el.getAttribute('accept')) {
        options = shallow(options, 'accept', el.getAttribute('accept'));
      }
    }
    this.opts = assignOptions({}, DEFAULTS, options);

    this._uid = 'vup-' + (++uid);
    this._items = [];        // ordered file records
    this._itemUid = 0;
    this._dragDepth = 0;     // dragenter/leave counting — no flicker on children
    this._disabled = false;

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  // Tiny copy-with-one-extra-key helper for the enhance-mode adoption above
  // (the caller's options object must never be mutated).
  function shallow(obj, key, value) {
    var out = {}, k;
    for (k in obj) out[k] = obj[k];
    out[key] = value;
    return out;
  }

  /* ---------------- DOM construction ---------------- */

  Upload.prototype._build = function () {
    var opts = this.opts;
    var L = opts.labels;

    var root = document.createElement('div');
    root.className = 'vup' + saltClass();
    this.root = root;

    // The REAL file input: created in container mode (form/no-JS fallback),
    // adopted in enhance mode. Visually hidden either way, never disabled by
    // us alone, and always functional inside a parent <form>.
    var input;
    if (this._enhance) {
      input = this.el;
      this._prevInput = {
        className: input.className,
        tabIndex: input.getAttribute('tabindex'),
        ariaHidden: input.getAttribute('aria-hidden'),
        disabled: input.disabled
      };
      // The dropzone is the interactive control; the input stays in the
      // DOM (and the form) but leaves the tab order and the a11y tree.
      if (input.parentNode) input.parentNode.insertBefore(root, input);
      input.classList.add('vup-native');
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
    } else {
      input = document.createElement('input');
      input.type = 'file';
      input.className = 'vup-native';
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      if (opts.name) input.name = String(opts.name);
    }
    if (opts.multiple) input.multiple = true;
    if (opts.accept) input.setAttribute('accept', String(opts.accept));
    this.input = input;

    // Dropzone — a labelled button in ARIA terms; Enter/Space activate it.
    var zone = document.createElement('div');
    zone.className = 'vup-zone';
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.id = this._uid + '-zone';

    var icon = document.createElement('span');
    icon.className = 'vup-zone-icon';
    icon.innerHTML = ICONS.cloud;
    zone.appendChild(icon);

    var prompt = document.createElement('p');
    prompt.className = 'vup-prompt';
    prompt.id = this._uid + '-prompt';
    if (opts.text != null) {
      prompt.textContent = String(opts.text);
    } else {
      prompt.appendChild(document.createTextNode(String(L.drop) + ' '));
      var browse = document.createElement('span');
      browse.className = 'vup-browse';
      browse.textContent = String(L.browse);
      prompt.appendChild(browse);
    }
    zone.appendChild(prompt);
    // The button's NAME is the short verb; the visible prompt DESCRIBES it.
    zone.setAttribute('aria-label', String(L.zone));
    zone.setAttribute('aria-describedby', prompt.id);
    this._zone = zone;

    // Polite live region — announces added/removed/finished files to SRs.
    var live = document.createElement('div');
    live.className = 'vup-live';
    live.setAttribute('aria-live', 'polite');
    this._live = live;

    root.appendChild(zone);
    root.appendChild(live);
    root.appendChild(input); // enhance mode: this MOVES the input inside root

    // Managed file list — a labelled list below the zone (or none at all).
    this._list = null;
    if (opts.listPosition !== 'none') {
      var list = document.createElement('ul');
      list.className = 'vup-list';
      list.setAttribute('aria-label', String(L.files));
      root.appendChild(list);
      this._list = list;
    }

    if (!this._enhance) this.el.appendChild(root);
  };

  /* ---------------- events ---------------- */

  Upload.prototype._bind = function () {
    var self = this;

    this._onZoneClick = function () {
      if (self._disabled) return;
      self.input.click();
    };
    this._onZoneKey = function (e) {
      var k = e.key || e.keyCode;
      if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k === 13 || k === 32) {
        e.preventDefault(); // Space must not scroll the page
        self._onZoneClick();
      }
    };
    this._onChange = function () {
      if (self.input.files && self.input.files.length) {
        self.addFiles(self.input.files);
      }
      // When files are managed by the uploader (autoUpload) the input must
      // not ALSO submit them with a parent form; otherwise _syncNative()
      // below keeps input.files mirroring the managed list where possible.
      if (self.opts.autoUpload) self.input.value = '';
    };

    // dragenter/leave COUNTING: children fire leave/enter pairs as the
    // pointer crosses them; only depth 0→1 / 1→0 toggles the highlight.
    this._onDragEnter = function (e) {
      e.preventDefault();
      if (self._disabled) return;
      self._dragDepth++;
      self.root.classList.add('is-drag');
    };
    this._onDragOver = function (e) {
      e.preventDefault(); // required, or the browser navigates to the file
      if (e.dataTransfer) e.dataTransfer.dropEffect = self._disabled ? 'none' : 'copy';
    };
    this._onDragLeave = function () {
      if (self._dragDepth > 0) self._dragDepth--;
      if (self._dragDepth === 0) self.root.classList.remove('is-drag');
    };
    this._onDrop = function (e) {
      e.preventDefault();
      self._dragDepth = 0;
      self.root.classList.remove('is-drag');
      if (self._disabled) return;
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        self.addFiles(e.dataTransfer.files);
      }
    };

    // Paste-to-attach: document-level, but only while the dropzone owns
    // focus, so it never hijacks paste from the rest of the page.
    this._onPaste = function (e) {
      if (self._disabled || document.activeElement !== self._zone) return;
      var cd = e.clipboardData;
      if (cd && cd.files && cd.files.length) {
        e.preventDefault();
        self.addFiles(cd.files);
      }
    };

    this._zone.addEventListener('click', this._onZoneClick);
    this._zone.addEventListener('keydown', this._onZoneKey);
    this.input.addEventListener('change', this._onChange);
    this._zone.addEventListener('dragenter', this._onDragEnter);
    this._zone.addEventListener('dragover', this._onDragOver);
    this._zone.addEventListener('dragleave', this._onDragLeave);
    this._zone.addEventListener('drop', this._onDrop);
    document.addEventListener('paste', this._onPaste);
  };

  /* ---------------- adding files & validation ---------------- */

  Upload.prototype.addFiles = function (files) {
    if (!this.root || this._disabled || !files) return this;
    var L = this.opts.labels;
    var incoming = [];
    var i;
    // FileList or File[] or a single File.
    if (typeof files.length === 'number') {
      for (i = 0; i < files.length; i++) if (files[i]) incoming.push(files[i]);
    } else {
      incoming.push(files);
    }
    if (!incoming.length) return this;

    // Single-file mode: a new pick replaces whatever is managed now.
    // (Rows only — the input keeps its value: on engines without
    // DataTransfer, wiping it here would lose a fresh native pick.)
    if (!this.opts.multiple) {
      this._removeAllItems();
      incoming = [incoming[0]];
    }

    for (i = 0; i < incoming.length; i++) {
      var file = incoming[i];
      var error = null;

      if (this.opts.maxFiles != null && this._countValid() >= +this.opts.maxFiles) {
        error = msgFmt(L.tooMany, { max: this.opts.maxFiles });
      } else if (!matchesAccept(file, this.opts.accept)) {
        error = L.badType;
      } else if (this.opts.maxSize != null && file.size > +this.opts.maxSize) {
        error = msgFmt(L.tooLarge, { size: formatBytes(this.opts.maxSize) });
      }

      var item = {
        id: this._uid + '-f' + (++this._itemUid),
        file: file,
        status: error ? 'error' : 'pending',
        error: error,
        canRetry: false,     // validation failures are final; upload errors retry
        response: null,
        progress: 0,
        url: null,           // object URL for the image thumbnail
        xhr: null,           // in-flight built-in upload (abortable)
        _token: 0,           // discards stale async upload verdicts
        el: null
      };
      this._items.push(item);
      this._renderItem(item);

      if (error) {
        this._announce(msgFmt(L.failed, { name: file.name, error: error }));
        this._emit('onError', [file, new Error(error)]);
      } else {
        this._announce(msgFmt(L.added, { name: file.name }));
        this._emit('onAdd', [file]);
        if (this.opts.autoUpload) this._startUpload(item);
      }
    }

    this._syncNative();
    return this;
  };

  // Files that count toward maxFiles: everything except validation rejects.
  Upload.prototype._countValid = function () {
    var n = 0;
    for (var i = 0; i < this._items.length; i++) {
      var it = this._items[i];
      if (!(it.status === 'error' && !it.canRetry)) n++;
    }
    return n;
  };

  /* ---------------- per-file rows ---------------- */

  Upload.prototype._renderItem = function (item) {
    if (!this._list) return;
    var self = this;
    var L = this.opts.labels;
    var file = item.file;

    var li = document.createElement('li');
    li.className = 'vup-item';
    li.setAttribute('data-status', item.status);
    item.el = li;

    // Thumbnail: images preview via an object URL (revoked on remove);
    // everything else gets a file glyph. FileReader is the fallback for
    // engines without URL.createObjectURL.
    var thumb = document.createElement('span');
    thumb.className = 'vup-thumb';
    thumb.innerHTML = ICONS.file;
    li.appendChild(thumb);
    if (file.type && file.type.indexOf('image/') === 0) this._thumb(item, thumb);

    var meta = document.createElement('div');
    meta.className = 'vup-meta';
    var name = document.createElement('div');
    name.className = 'vup-name';
    name.textContent = String(file.name); // textContent — never markup
    name.title = String(file.name);
    meta.appendChild(name);

    var sub = document.createElement('div');
    sub.className = item.error ? 'vup-errmsg' : 'vup-sub';
    sub.textContent = item.error ? String(item.error) : formatBytes(file.size);
    meta.appendChild(sub);
    item._subEl = sub;

    // Progress bar — hidden until an upload starts.
    var bar = document.createElement('div');
    bar.className = 'vup-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    bar.setAttribute('aria-label', msgFmt(L.progress, { name: file.name }));
    bar.hidden = true;
    var fill = document.createElement('div');
    fill.className = 'vup-fill';
    bar.appendChild(fill);
    meta.appendChild(bar);
    item._barEl = bar;
    item._fillEl = fill;
    li.appendChild(meta);

    // Retry — only rendered after an UPLOAD error (validation is final).
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'vup-retry';
    retry.setAttribute('aria-label', msgFmt(L.retry, { name: file.name }));
    retry.innerHTML = ICONS.retry;
    retry.hidden = true;
    retry.addEventListener('click', function () {
      if (!self._disabled && item.status === 'error' && item.canRetry) {
        self._startUpload(item);
      }
    });
    li.appendChild(retry);
    item._retryEl = retry;

    // Remove — always available.
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'vup-remove';
    remove.setAttribute('aria-label', msgFmt(L.remove, { name: file.name }));
    remove.innerHTML = ICONS.close;
    remove.addEventListener('click', function () {
      if (!self._disabled) self.removeFile(item.file);
    });
    li.appendChild(remove);

    this._list.appendChild(li);
  };

  Upload.prototype._thumb = function (item, thumbEl) {
    var setSrc = function (src) {
      if (!item.el) return; // row already removed
      var img = document.createElement('img');
      img.alt = '';        // decorative — the name is announced next to it
      img.src = src;
      thumbEl.innerHTML = '';
      thumbEl.appendChild(img);
    };
    try {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        item.url = URL.createObjectURL(item.file);
        setSrc(item.url);
      } else if (typeof FileReader !== 'undefined') {
        var reader = new FileReader();
        reader.onload = function () { setSrc(reader.result); };
        reader.readAsDataURL(item.file);
      }
    } catch (err) { /* a broken preview must never break the list */ }
  };

  Upload.prototype._setItemStatus = function (item, status) {
    item.status = status;
    if (item.el) item.el.setAttribute('data-status', status);
    if (item._retryEl) item._retryEl.hidden = !(status === 'error' && item.canRetry);
  };

  Upload.prototype._setItemNote = function (item, text, isError) {
    if (!item._subEl) return;
    item._subEl.className = isError ? 'vup-errmsg' : 'vup-sub';
    item._subEl.textContent = String(text);
  };

  Upload.prototype._setProgress = function (item, ratio) {
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    item.progress = ratio;
    var pct = Math.round(ratio * 100);
    if (item._barEl) {
      item._barEl.hidden = false;
      item._barEl.setAttribute('aria-valuenow', String(pct));
      item._fillEl.style.width = pct + '%';
    }
    this._emit('onProgress', [item.file, pct]);
  };

  /* ---------------- uploading ---------------- */

  // Kicks off one file. Custom `upload` fn gets (file, onProgress(0..1)) and
  // must return a Promise/thenable; the {action,…} config uses the built-in
  // XHR uploader with REAL progress events. A token guards against stale
  // completions after retry/remove.
  Upload.prototype._startUpload = function (item) {
    var self = this;
    var L = this.opts.labels;
    var up = this.opts.upload;
    if (!up || item.status === 'uploading' || item.status === 'done') return;

    var token = ++item._token;
    item.error = null;
    item.canRetry = false;
    this._setItemStatus(item, 'uploading');
    this._setItemNote(item, formatBytes(item.file.size), false);
    this._setProgress(item, 0);

    function settle(err, response) {
      if (token !== item._token || !self.root) return; // stale or destroyed
      item.xhr = null;
      if (err) {
        item.error = (err && err.message) ? String(err.message) : String(L.uploadError);
        item.canRetry = true;
        self._setItemStatus(item, 'error');
        self._setItemNote(item, item.error, true);
        if (item._barEl) item._barEl.hidden = true;
        self._announce(msgFmt(L.failed, { name: item.file.name, error: item.error }));
        self._emit('onError', [item.file, err]);
      } else {
        item.response = response;
        self._setProgress(item, 1);
        self._setItemStatus(item, 'done');
        self._setItemNote(item, formatBytes(item.file.size) + ' · ' + L.done, false);
        self._announce(msgFmt(L.uploaded, { name: item.file.name }));
        self._emit('onDone', [item.file, response]);
      }
      self._syncNative();
      if (item._notify) { var n = item._notify; item._notify = null; n(); }
    }

    function onProgress(ratio) {
      if (token === item._token && self.root) self._setProgress(item, ratio);
    }

    try {
      if (typeof up === 'function') {
        var p = up(item.file, onProgress);
        if (isThenable(p)) {
          p.then(
            function (res) { settle(null, res); },
            function (err) { settle(err || new Error(String(L.uploadError))); }
          );
        } else {
          settle(null, p); // a sync uploader counts as instantly done
        }
      } else if (up.action) {
        item.xhr = xhrUpload(item.file, up, onProgress, settle);
      } else {
        settle(new Error('Upload: no `upload.action` configured'));
      }
    } catch (err) {
      settle(err);
    }
  };

  // Starts every pending file (and nothing else). Resolves — when Promise
  // exists — with getFiles() once every started upload has settled (removal
  // mid-flight also counts as settled; see _disposeItem).
  Upload.prototype.uploadAll = function () {
    var self = this;
    var hasP = typeof Promise !== 'undefined';
    if (!this.root || !this.opts.upload) {
      return hasP ? Promise.resolve(this.getFiles()) : null;
    }
    var started = [], i;
    for (i = 0; i < this._items.length; i++) {
      if (this._items[i].status === 'pending') started.push(this._items[i]);
    }
    if (!hasP) {
      for (i = 0; i < started.length; i++) this._startUpload(started[i]);
      return null;
    }
    var waits = [];
    for (i = 0; i < started.length; i++) {
      (function (item) {
        waits.push(new Promise(function (resolve) { item._notify = resolve; }));
        self._startUpload(item);
      })(started[i]);
    }
    return Promise.all(waits).then(function () { return self.getFiles(); });
  };

  /* ---------------- managed list API ---------------- */

  Upload.prototype.getFiles = function () {
    var out = [];
    for (var i = 0; i < this._items.length; i++) {
      var it = this._items[i];
      out.push({ file: it.file, status: it.status, response: it.response, error: it.error });
    }
    return out;
  };

  Upload.prototype.removeFile = function (file) {
    if (!this.root) return this;
    for (var i = 0; i < this._items.length; i++) {
      if (this._items[i].file === file) {
        var item = this._items[i];
        this._items.splice(i, 1);
        this._disposeItem(item);
        this._announce(msgFmt(this.opts.labels.removed, { name: file.name }));
        this._emit('onRemove', [file]);
        this._syncNative();
        return this;
      }
    }
    return this;
  };

  Upload.prototype.clear = function () {
    if (!this.root) return this;
    this._removeAllItems();
    try { this.input.value = ''; } catch (err) { /* old IE throws */ }
    this._syncNative();
    return this;
  };

  Upload.prototype._removeAllItems = function () {
    var items = this._items;
    this._items = [];
    for (var i = 0; i < items.length; i++) this._disposeItem(items[i]);
  };

  // Abort in-flight work, revoke the preview URL, drop the row.
  Upload.prototype._disposeItem = function (item) {
    item._token++; // any in-flight settle() becomes a no-op
    if (item._notify) { var n = item._notify; item._notify = null; n(); }
    if (item.xhr) {
      try { item.xhr.abort(); } catch (err) { /* ignore */ }
      item.xhr = null;
    }
    if (item.url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      try { URL.revokeObjectURL(item.url); } catch (err) { /* ignore */ }
      item.url = null;
    }
    if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    item.el = null;
  };

  // Best-effort mirror of the managed list back onto the real input, so a
  // plain form submit sends dragged/pasted files too. Needs DataTransfer;
  // skipped under autoUpload (files are already on the server by then).
  Upload.prototype._syncNative = function () {
    if (this.opts.autoUpload || typeof DataTransfer === 'undefined') return;
    try {
      var dt = new DataTransfer();
      for (var i = 0; i < this._items.length; i++) {
        var it = this._items[i];
        if (it.status === 'error' && !it.canRetry) continue; // rejects never submit
        dt.items.add(it.file);
      }
      this.input.files = dt.files;
    } catch (err) { /* older engines: the input keeps its last native pick */ }
  };

  /* ---------------- enable / disable / destroy ---------------- */

  Upload.prototype.enable = function () {
    if (!this.root) return this;
    this._disabled = false;
    this.root.classList.remove('is-disabled');
    this._zone.removeAttribute('aria-disabled');
    this._zone.setAttribute('tabindex', '0');
    this.input.disabled = false;
    return this;
  };

  Upload.prototype.disable = function () {
    if (!this.root) return this;
    this._disabled = true;
    this.root.classList.add('is-disabled');
    this._zone.setAttribute('aria-disabled', 'true');
    this._zone.setAttribute('tabindex', '-1');
    this.input.disabled = true;
    return this;
  };

  // Tear down: abort uploads, revoke URLs, unbind, and in enhance mode put
  // the original input back exactly where (and how) it was.
  Upload.prototype.destroy = function () {
    if (!this.root) return this;
    unwatchAutoTheme(this);

    for (var i = 0; i < this._items.length; i++) this._disposeItem(this._items[i]);
    this._items = [];

    this._zone.removeEventListener('click', this._onZoneClick);
    this._zone.removeEventListener('keydown', this._onZoneKey);
    this.input.removeEventListener('change', this._onChange);
    this._zone.removeEventListener('dragenter', this._onDragEnter);
    this._zone.removeEventListener('dragover', this._onDragOver);
    this._zone.removeEventListener('dragleave', this._onDragLeave);
    this._zone.removeEventListener('drop', this._onDrop);
    document.removeEventListener('paste', this._onPaste);

    if (this._enhance) {
      // Restore the input to its original spot and attributes.
      var input = this.input, prev = this._prevInput;
      if (this.root.parentNode) {
        this.root.parentNode.insertBefore(input, this.root);
        this.root.parentNode.removeChild(this.root);
      }
      input.className = prev.className;
      if (prev.tabIndex == null) input.removeAttribute('tabindex');
      else input.setAttribute('tabindex', prev.tabIndex);
      if (prev.ariaHidden == null) input.removeAttribute('aria-hidden');
      else input.setAttribute('aria-hidden', prev.ariaHidden);
      input.disabled = !!prev.disabled;
    } else if (this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }

    if (instances) instances.delete(this.el);
    this.root = null;
    this._zone = null;
    this._list = null;
    this._live = null;
    return this;
  };

  /* ---------------- theming, announcements, callbacks ---------------- */

  Upload.prototype._applyTheme = function () {
    if (!this.root) return;
    var t = this.opts.theme;
    var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    this.root.setAttribute('data-theme', resolved);
  };

  Upload.prototype._announce = function (text) {
    if (!this._live) return;
    // Clearing first makes repeat messages ('x removed' twice) re-announce.
    this._live.textContent = '';
    this._live.textContent = String(text);
  };

  // Calls opts[name](…args, instance); exceptions are contained.
  Upload.prototype._emit = function (name, args) {
    var fn = this.opts[name];
    if (typeof fn !== 'function') return;
    try { fn.apply(null, args.concat([this])); }
    catch (err) {
      // A host callback throwing must never break the upload pipeline.
      if (typeof console !== 'undefined') console.error('Upload ' + name + ':', err);
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Upload.version = VERSION;
  Upload.defaults = DEFAULTS;
  Upload.formatBytes = formatBytes;

  Upload.create = function (target, options) {
    return new Upload(target, options);
  };

  Upload.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vupMultiple != null) o.multiple = parseBool(d.vupMultiple);
    if (d.vupAccept) o.accept = d.vupAccept;
    if (d.vupMaxSize != null && d.vupMaxSize !== '') o.maxSize = +d.vupMaxSize;
    if (d.vupMaxFiles != null && d.vupMaxFiles !== '') o.maxFiles = +d.vupMaxFiles;
    if (d.vupText) o.text = d.vupText;
    if (d.vupName) o.name = d.vupName;
    if (d.vupListPosition) o.listPosition = d.vupListPosition;
    if (d.vupAutoUpload != null) o.autoUpload = parseBool(d.vupAutoUpload);
    if (d.vupTheme) o.theme = d.vupTheme;
    if (d.vupStyles != null) o.styles = parseBool(d.vupStyles);
    if (d.vupAction) {
      o.upload = { action: d.vupAction };
      if (d.vupMethod) o.upload.method = d.vupMethod;
      if (d.vupFieldName) o.upload.fieldName = d.vupFieldName;
    }
    return o;
  }

  // <div data-vup> = container mode; <input type=file data-vup> = enhance.
  Upload.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vup]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Upload(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Upload auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Upload.autoInit(); });
    } else {
      Upload.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Upload.displayName = 'Upload';
  Upload.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Upload, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Upload.css = renderCss();
  }
  Upload.rootClass = 'vup';
  Upload.themeVars = {
    accent: '--vup-accent',
    radius: '--vup-radius',
    font: '--vup-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Upload.varScopes = ['.vup', '.vup[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('upload', Upload);
  }

  return Upload;
});

}).call(__root);
var Upload = __root.Upload;
export { Upload };
export default Upload;
