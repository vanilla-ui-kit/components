/*! vanilla-ui-kit/modal v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Modal v1.0.0
 * A single-file, zero-dependency modal dialog layer for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="modal.js"></script>
 *   <script>Modal.confirm('Delete this file?').then(function (ok) { … })</script>
 *
 * Headless:
 *   Modal.defaults.styles = false   // no CSS injected; style .vmd-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Modal = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-modal-styles';
  var OUT_MS = 180; // keep in sync with the .vmd-out transition
  var SIZES = ['sm', 'md', 'lg', 'full'];
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Modal.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Modal.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the dialogs; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vmd{--vmd-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vmd{' +
      '--vmd-accent:#5b5bd6;' +
      '--vmd-on-accent:#ffffff;' +
      '--vmd-danger:#e5484d;' +
      '--vmd-bg:#ffffff;' +
      '--vmd-surface:#f2f2f5;' +
      '--vmd-text:#1c1d21;' +
      '--vmd-muted:#72747e;' +
      '--vmd-faint:#e7e7ec;' +
      '--vmd-backdrop:rgba(20,21,26,.45);' +
      '--vmd-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vmd-radius:14px;' +
      '--vmd-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vmd[data-theme=dark]{' +
      '--vmd-accent:#7b7bea;' +
      '--vmd-on-accent:#131418;' +
      '--vmd-danger:#f2555a;' +
      '--vmd-bg:#1b1d24;' +
      '--vmd-surface:#272a33;' +
      '--vmd-text:#e9eaf0;' +
      '--vmd-muted:#989aa6;' +
      '--vmd-faint:#31343f;' +
      '--vmd-backdrop:rgba(0,0,0,.6);' +
      '--vmd-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    // The root is the scrim: full-viewport for the fallback <div>, and the
    // same for the native <dialog> (its ::backdrop goes transparent below),
    // so both paths dim and animate identically.
    '.vmd.SALT{position:fixed;top:0;left:0;z-index:99990;box-sizing:border-box;' +
      'display:grid;place-items:center;width:100%;height:100%;' +
      'max-width:none;max-height:none;border:0;margin:0;padding:24px;' +
      'background:var(--vmd-backdrop);opacity:0;transition:opacity .16s ease;}' +
    '.vmd.SALT::backdrop{background:transparent;}' +
    '.vmd.SALT *,.vmd.SALT *::before,.vmd.SALT *::after{box-sizing:border-box;}' +
    '.vmd.SALT.vmd-in{opacity:1;}' +
    '.vmd.SALT.vmd-out{opacity:0;transition-duration:.14s;}' +
    '.vmd.SALT .vmd-panel{display:flex;flex-direction:column;width:100%;max-width:480px;' +
      'max-height:100%;background:var(--vmd-bg);color:var(--vmd-text);' +
      'font-family:var(--vmd-font);font-size:14px;line-height:1.55;' +
      'border:1px solid var(--vmd-faint);border-radius:var(--vmd-radius);' +
      'box-shadow:var(--vmd-shadow);outline:none;' +
      'transform:translateY(8px) scale(.97);' +
      'transition:transform .16s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vmd.SALT.vmd-in .vmd-panel{transform:none;}' +
    '.vmd.SALT.vmd-out .vmd-panel{transform:scale(.97);transition-duration:.14s;}' +
    '.vmd.SALT.vmd-sm .vmd-panel{max-width:360px;}' +
    '.vmd.SALT.vmd-lg .vmd-panel{max-width:720px;}' +
    '.vmd.SALT.vmd-full{padding:16px;}' +
    '.vmd.SALT.vmd-full .vmd-panel{max-width:none;height:100%;}' +
    '.vmd.SALT .vmd-head{display:flex;align-items:flex-start;gap:12px;padding:16px 20px 0;}' +
    '.vmd.SALT .vmd-title{flex:1;min-width:0;margin:0;font-size:17px;font-weight:650;' +
      'line-height:1.35;overflow-wrap:break-word;}' +
    '.vmd.SALT .vmd-head-spacer{flex:1;}' +
    '.vmd.SALT .vmd-x{flex:none;width:26px;height:26px;display:grid;place-items:center;' +
      'color:var(--vmd-muted);background:none;border:0;border-radius:8px;padding:0;' +
      'margin:-2px -6px 0 0;cursor:pointer;transition:background .12s ease,' +
      'color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vmd.SALT .vmd-x:hover{background:var(--vmd-faint);color:var(--vmd-text);}' +
    '.vmd.SALT .vmd-x svg{display:block;}' +
    '.vmd.SALT .vmd-body{flex:1;min-height:0;overflow:auto;padding:10px 20px 4px;' +
      'overflow-wrap:break-word;}' +
    '.vmd.SALT .vmd-body:first-child{padding-top:18px;}' +
    '.vmd.SALT .vmd-body:last-child{padding-bottom:18px;}' +
    '.vmd.SALT.vmd-has-title .vmd-msg{color:var(--vmd-muted);}' +
    '.vmd.SALT .vmd-input{width:100%;font:inherit;font-size:14px;color:var(--vmd-text);' +
      'background:var(--vmd-bg);border:1px solid var(--vmd-faint);border-radius:10px;' +
      'padding:9px 12px;margin-top:10px;}' +
    '.vmd.SALT .vmd-input::placeholder{color:var(--vmd-muted);opacity:1;}' +
    '.vmd.SALT .vmd-input:focus{outline:2px solid var(--vmd-accent);outline-offset:1px;}' +
    '.vmd.SALT .vmd-foot{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;' +
      'padding:16px 20px 18px;}' +
    '.vmd.SALT .vmd-btn{font:inherit;font-size:14px;font-weight:600;color:var(--vmd-text);' +
      'background:var(--vmd-surface);border:1px solid var(--vmd-faint);border-radius:10px;' +
      'padding:8px 16px;cursor:pointer;transition:background .12s ease,opacity .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vmd.SALT .vmd-btn:hover{background:var(--vmd-faint);}' +
    '.vmd.SALT .vmd-btn-primary{color:var(--vmd-on-accent);background:var(--vmd-accent);' +
      'border-color:transparent;}' +
    '.vmd.SALT .vmd-btn-primary:hover{background:var(--vmd-accent);opacity:.9;}' +
    '.vmd.SALT .vmd-btn-danger{color:var(--vmd-on-accent);background:var(--vmd-danger);' +
      'border-color:transparent;}' +
    '.vmd.SALT .vmd-btn-danger:hover{background:var(--vmd-danger);opacity:.9;}' +
    '.vmd.SALT .vmd-btn:focus,.vmd.SALT .vmd-x:focus{outline:none;}' +
    '.vmd.SALT .vmd-btn:focus-visible,.vmd.SALT .vmd-x:focus-visible{' +
      'outline:2px solid var(--vmd-accent);outline-offset:2px;}' +
    '@media (max-width:479px){' +
      '.vmd.SALT{padding:16px;}' +
      '.vmd.SALT .vmd-foot{flex-direction:column-reverse;}' +
      '.vmd.SALT .vmd-btn{width:100%;}' +
    '}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vmd.SALT,.vmd.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/modal.css), or set Modal.salt to your
  // own token / false BEFORE the first modal is opened.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Modal.salt;
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

  var ICON_CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
    '<path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var watching = false;

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveTheme() {
    var t = Modal.defaults.theme;
    if (t === 'light' || t === 'dark') return t;
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

  function itemTheme(item) {
    var t = item.opts.theme;
    return (t === 'light' || t === 'dark') ? t : resolveTheme();
  }

  function refreshTheme() {
    for (var i = 0; i < openModals.length; i++) {
      openModals[i].root.setAttribute('data-theme', itemTheme(openModals[i]));
    }
  }

  function ensureThemeWatch() {
    if (watching || !HAS_DOM) return;
    watching = true;
    var core = vcCore();
    if (core) {
      core.theme.watch(refreshTheme);
      return;
    }
    if (window.matchMedia) {
      ownMql = ownMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (ownMql.addEventListener) ownMql.addEventListener('change', refreshTheme);
      else if (ownMql.addListener) ownMql.addListener(refreshTheme);
    }
    if (typeof MutationObserver !== 'undefined') {
      ownObserver = new MutationObserver(refreshTheme);
      ownObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-bs-theme']
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Small helpers.
   * ------------------------------------------------------------------ */

  var dialogSupport = null;

  function supportsDialog() {
    if (dialogSupport === null) {
      dialogSupport = typeof document.createElement('dialog').showModal === 'function';
    }
    return dialogSupport;
  }

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function closestAttr(el, attr, stop) {
    while (el && el !== stop) {
      if (el.nodeType === 1 && el.hasAttribute(attr)) return el;
      el = el.parentNode;
    }
    return null;
  }

  var FOCUS_SEL = 'a[href],area[href],button:not([disabled]),input:not([disabled]),' +
    'select:not([disabled]),textarea:not([disabled]),[tabindex]';

  function focusables(container) {
    var nodes = container.querySelectorAll(FOCUS_SEL);
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.tabIndex < 0 || el.type === 'hidden') continue;
      if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) continue;
      out.push(el);
    }
    return out;
  }

  function settled(value) {
    return typeof Promise !== 'undefined' ? Promise.resolve(value) : null;
  }

  function deferred() {
    if (typeof Promise === 'undefined') {
      // No Promise, no polyfill: callbacks (onClose) still work; sugar
      // returns null instead of a promise.
      return { promise: null, resolve: function () {} };
    }
    var res;
    var p = new Promise(function (r) { res = r; });
    return { promise: p, resolve: res };
  }

  /* ------------------------------------------------------------------ *
   * Body scroll lock — engaged while ANY modal is open, released when the
   * last one closes; the padding compensation avoids the layout shift of
   * the disappearing scrollbar.
   * ------------------------------------------------------------------ */

  var openModals = []; // stack: last = top-most
  var scrollLocked = false;
  var savedOverflow = '';
  var savedPaddingRight = '';

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    var body = document.body;
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) body.style.paddingRight = gap + 'px';
    body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }

  /* ------------------------------------------------------------------ *
   * Building and closing. Title/message strings are TEXT (rendered with
   * textContent); `html: true` is an explicit opt-in for trusted markup.
   * A DOM element passed as `content` is adopted into the dialog and put
   * back where it came from on close.
   * ------------------------------------------------------------------ */

  function adoptContent(item, node, body) {
    if (node.parentNode) {
      item.placeholder = document.createComment('vmd');
      node.parentNode.insertBefore(item.placeholder, node);
    }
    item.reHide = !!(node.hasAttribute && node.hasAttribute('hidden'));
    if (item.reHide) node.removeAttribute('hidden');
    item.reDisplayNone = node.style && node.style.display === 'none';
    if (item.reDisplayNone) node.style.display = '';
    body.appendChild(node);
    item.contentEl = node;
  }

  function restoreAdopted(item) {
    var node = item.contentEl;
    if (!node) return;
    if (item.reHide) node.setAttribute('hidden', '');
    if (item.reDisplayNone) node.style.display = 'none';
    if (item.placeholder && item.placeholder.parentNode) {
      item.placeholder.parentNode.insertBefore(node, item.placeholder);
      item.placeholder.parentNode.removeChild(item.placeholder);
    } else if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    item.contentEl = null;
    item.placeholder = null;
  }

  function applyChrome(item) {
    var opts = item.opts;
    var size = SIZES.indexOf(opts.size) !== -1 ? opts.size : 'md';
    item.root.className = 'vmd' + saltClass() + ' vmd-' + size +
      (opts.title ? ' vmd-has-title' : '') + (item.entered ? ' vmd-in' : '');
    item.root.setAttribute('data-theme', itemTheme(item));
    if (opts.title) {
      item.root.setAttribute('aria-labelledby', item.titleId);
      item.root.removeAttribute('aria-label');
    } else {
      item.root.setAttribute('aria-label', String(opts.ariaLabel || opts.labels.dialog));
      item.root.removeAttribute('aria-labelledby');
    }
  }

  function setContent(item) {
    var opts = item.opts;
    var panel = item.panel;
    restoreAdopted(item); // an update() must not orphan a previously adopted node
    panel.innerHTML = '';

    if (opts.title || opts.dismissible !== false) {
      var head = document.createElement('div');
      head.className = 'vmd-head';
      if (opts.title) {
        var title = document.createElement('h2');
        title.className = 'vmd-title';
        title.id = item.titleId;
        title.textContent = String(opts.title);
        head.appendChild(title);
      } else {
        var spacer = document.createElement('div');
        spacer.className = 'vmd-head-spacer';
        head.appendChild(spacer);
      }
      if (opts.dismissible !== false) {
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'vmd-x';
        x.setAttribute('aria-label', opts.labels.close);
        x.innerHTML = ICON_CLOSE;
        x.addEventListener('click', function () { closeItem(item); });
        head.appendChild(x);
      }
      panel.appendChild(head);
    }

    var body = document.createElement('div');
    body.className = 'vmd-body';
    item.bodyEl = body;
    var c = opts.content;
    if (c && c.nodeType === 1) {
      adoptContent(item, c, body);
    } else if (c != null) {
      var msg = document.createElement('div');
      msg.className = 'vmd-msg';
      if (opts.html) msg.innerHTML = String(c);
      else msg.textContent = String(c);
      body.appendChild(msg);
    }
    panel.appendChild(body);

    item.footEl = null;
    if (opts.buttons && opts.buttons.length) {
      var foot = document.createElement('div');
      foot.className = 'vmd-foot';
      for (var i = 0; i < opts.buttons.length; i++) {
        foot.appendChild(buildButton(item, opts.buttons[i]));
      }
      item.footEl = foot;
      panel.appendChild(foot);
    }
  }

  function buildButton(item, b) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vmd-btn' +
      (b.variant === 'primary' || b.variant === 'danger' ? ' vmd-btn-' + b.variant : '');
    btn.textContent = String(b.label);
    btn.addEventListener('click', function () {
      // Return false from onClick to keep the modal open (validation etc.).
      if (b.onClick && b.onClick(item.handle) === false) return;
      closeItem(item, b.close);
    });
    return btn;
  }

  function firstFocusable(container) {
    if (!container) return null;
    var f = focusables(container);
    return f.length ? f[0] : null;
  }

  // Preference order: [autofocus] → first focusable in the body (a prompt's
  // input, a form field) → primary button → any button → the panel itself.
  function initialFocus(item) {
    var t = item.panel.querySelector('[autofocus]') ||
      firstFocusable(item.bodyEl) ||
      (item.footEl && item.footEl.querySelector('.vmd-btn-primary')) ||
      firstFocusable(item.footEl) ||
      firstFocusable(item.panel);
    try { (t || item.panel).focus(); } catch (err) { /* detached mid-flight */ }
  }

  // Manual Tab cycle — fallback path only; a native modal <dialog> makes the
  // rest of the page inert, so the platform traps for us.
  function trapTab(item, e) {
    var f = focusables(item.panel);
    if (!f.length) {
      e.preventDefault();
      item.panel.focus();
      return;
    }
    var active = document.activeElement;
    if (e.shiftKey && (active === f[0] || active === item.panel)) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && active === f[f.length - 1]) {
      e.preventDefault();
      f[0].focus();
    }
  }

  function closeItem(item, result) {
    if (item.closed) return;
    item.closed = true;
    var i = openModals.indexOf(item);
    if (i !== -1) openModals.splice(i, 1);
    item.root.classList.remove('vmd-in');
    item.root.classList.add('vmd-out');
    setTimeout(function () {
      restoreAdopted(item);
      if (item.native) { try { item.root.close(); } catch (err) { /* already closed */ } }
      if (item.root.parentNode) item.root.parentNode.removeChild(item.root);
      if (openModals.length === 0) unlockScroll();
      // Focus returns to the opener once the (possibly native, top-layer)
      // dialog is really gone.
      if (item.opener && item.opener.focus &&
          document.documentElement.contains(item.opener)) {
        try { item.opener.focus(); } catch (err) { /* not focusable anymore */ }
      }
    }, OUT_MS);
    if (item.opts.onClose) item.opts.onClose(result);
  }

  function mergedOpts(base, opts) {
    var out = {}, k;
    for (k in base) if (k !== 'labels') out[k] = base[k];
    out.labels = {};
    for (k in base.labels) out.labels[k] = base.labels[k];
    if (opts) {
      for (k in opts) {
        if (opts[k] === undefined) continue;
        if (k === 'labels') {
          for (var lk in opts.labels) out.labels[lk] = opts.labels[lk];
        } else {
          out[k] = opts[k];
        }
      }
    }
    return out;
  }

  var dummyHandle = {
    el: null,
    close: function () {},
    update: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * Public API. `Modal` doubles as a constructor — `new Modal(el)` turns
   * existing (hidden) markup into a dialog; the statics build from opts.
   * ------------------------------------------------------------------ */

  function Modal(target, options) {
    if (!(this instanceof Modal)) return new Modal(target, options);
    this.opts = options || {};
    this.handle = null;
    this.el = HAS_DOM ? resolveElement(target) : null; // SSR: inert instance
    if (HAS_DOM && !this.el) throw new Error('Modal: target element not found: ' + target);
    if (this.el && instances) {
      var prev = instances.get(this.el);
      if (prev) prev.close();
      instances.set(this.el, this);
    }
  }

  Modal.prototype = {
    constructor: Modal,

    open: function (extra) {
      if (!this.el || this.handle) return this;
      var o = {}, k;
      for (k in this.opts) o[k] = this.opts[k];
      if (extra) for (k in extra) if (extra[k] !== undefined) o[k] = extra[k];
      if (o.title === undefined) {
        var t = this.el.getAttribute('data-vmd-title');
        if (t) o.title = t;
      }
      o.content = this.el;
      var self = this;
      var userClose = o.onClose;
      o.onClose = function (result) {
        self.handle = null;
        if (userClose) userClose(result);
      };
      this.handle = Modal.open(o);
      return this;
    },

    close: function (result) {
      if (this.handle) this.handle.close(result);
      return this;
    },

    isOpen: function () {
      return !!this.handle;
    }
  };

  Modal.version = '1.0.0';
  Modal.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Modal, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Modal.css = renderCss();
  }

  Modal.defaults = {
    size: 'md',          // 'sm' | 'md' | 'lg' | 'full'
    dismissible: true,   // Esc, backdrop click, and the ✕ button
    styles: true,        // false = headless, no CSS ever injected
    theme: 'auto',       // 'auto' | 'light' | 'dark'
    labels: { ok: 'OK', cancel: 'Cancel', close: 'Close', dialog: 'Dialog' }
  };

  // Modal.open(opts) → handle { el, close(result), update(opts) }.
  // opts: title, content (string | element | html-string with {html:true}),
  // buttons [{label, variant, onClick(handle), close}], size, dismissible,
  // onOpen(handle), onClose(result), theme, ariaLabel, opener.
  Modal.open = function (opts) {
    if (!HAS_DOM) return dummyHandle;
    opts = mergedOpts(Modal.defaults, opts);
    if (opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    ensureThemeWatch();

    var native = supportsDialog();
    var root = document.createElement(native ? 'dialog' : 'div');
    var panel = document.createElement('div');
    panel.className = 'vmd-panel';
    panel.setAttribute('tabindex', '-1'); // focus target of last resort
    root.appendChild(panel);

    var item = {
      root: root,
      panel: panel,
      native: native,
      opts: opts,
      opener: (opts.opener && opts.opener.nodeType === 1)
        ? opts.opener : document.activeElement,
      titleId: 'vmd-title-' + (++uid),
      entered: false,
      closed: false,
      contentEl: null,
      placeholder: null,
      bodyEl: null,
      footEl: null
    };

    item.handle = {
      el: root,
      close: function (result) { closeItem(item, result); },
      update: function (newOpts) {
        if (item.closed) return item.handle;
        item.opts = mergedOpts(item.opts, newOpts);
        applyChrome(item);
        setContent(item);
        // Re-seat focus only if the rebuild dropped it out of the dialog.
        if (!item.panel.contains(document.activeElement)) initialFocus(item);
        return item.handle;
      }
    };

    if (!native) root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    applyChrome(item);
    setContent(item);

    openModals.push(item);
    lockScroll();
    document.body.appendChild(root);

    if (native) {
      try { root.showModal(); } catch (err) { root.setAttribute('open', ''); }
      root.addEventListener('cancel', function (e) {
        e.preventDefault(); // always ours — keep the exit animation
        if (item.opts.dismissible !== false) closeItem(item);
      });
      root.addEventListener('close', function () {
        if (!item.closed) closeItem(item); // closed behind our back (method=dialog)
      });
    }

    // Backdrop click = mousedown that STARTED on the scrim, so a text-select
    // drag that ends outside the panel never dismisses the dialog.
    root.addEventListener('mousedown', function (e) {
      if (e.target === root && item.opts.dismissible !== false) closeItem(item);
    });
    root.addEventListener('click', function (e) {
      if (closestAttr(e.target, 'data-vmd-close', root)) closeItem(item);
    });
    root.addEventListener('keydown', function (e) {
      if (native) return; // Esc arrives as `cancel`; the top layer traps Tab
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();
        if (item.opts.dismissible !== false) closeItem(item);
      } else if (e.key === 'Tab') {
        trapTab(item, e);
      }
    });

    initialFocus(item);
    // Double rAF so the initial (hidden) styles are committed first.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        item.entered = true;
        root.classList.add('vmd-in');
      });
    });
    if (opts.onOpen) opts.onOpen(item.handle);
    return item.handle;
  };

  function injectOwnStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  Modal.get = function (target) {
    var el = HAS_DOM ? resolveElement(target) : null;
    return (el && instances && instances.get(el)) || null;
  };

  /* ------------------------------------------------------------------ *
   * Promise sugar — alert / confirm / prompt. Each accepts a message
   * string or a full options object. Without a DOM they resolve
   * immediately (undefined / false / null); without Promise they still
   * run via onClose but return null.
   * ------------------------------------------------------------------ */

  function toOpts(arg) {
    var o = {}, k;
    if (arg && typeof arg === 'object') { for (k in arg) o[k] = arg[k]; }
    else if (arg !== undefined) o.message = arg;
    if (o.content === undefined && o.message !== undefined) o.content = o.message;
    return o;
  }

  function sugarLabels(o) {
    var out = {}, k;
    for (k in Modal.defaults.labels) out[k] = Modal.defaults.labels[k];
    if (o.labels) for (k in o.labels) out[k] = o.labels[k];
    return out;
  }

  // Modal.alert(message | opts) → Promise<void>.
  Modal.alert = function (arg) {
    var o = toOpts(arg);
    if (!HAS_DOM) return settled(undefined);
    var d = deferred();
    var L = sugarLabels(o);
    if (!o.buttons) o.buttons = [{ label: L.ok, variant: 'primary', close: true }];
    var userClose = o.onClose;
    o.onClose = function (result) {
      if (userClose) userClose(result);
      d.resolve(undefined);
    };
    Modal.open(o);
    return d.promise;
  };

  // Modal.confirm(message | opts) → Promise<boolean>; true ONLY on the
  // explicit confirm button — Esc / backdrop / ✕ all resolve false.
  Modal.confirm = function (arg) {
    var o = toOpts(arg);
    if (!HAS_DOM) return settled(false);
    var d = deferred();
    var L = sugarLabels(o);
    if (!o.buttons) {
      o.buttons = [
        { label: L.cancel, close: false },
        { label: o.okLabel || L.ok, variant: o.danger ? 'danger' : 'primary', close: true }
      ];
    }
    var userClose = o.onClose;
    o.onClose = function (result) {
      if (userClose) userClose(result);
      d.resolve(result === true);
    };
    Modal.open(o);
    return d.promise;
  };

  // Modal.prompt(message | opts {value, placeholder, required}) →
  // Promise<string|null>; null on cancel/Esc/backdrop; Enter submits.
  Modal.prompt = function (arg) {
    var o = toOpts(arg);
    if (!HAS_DOM) return settled(null);
    var d = deferred();
    var L = sugarLabels(o);

    var wrap = document.createElement('div');
    if (o.message != null && o.message !== '') {
      var msg = document.createElement('div');
      msg.className = 'vmd-msg';
      msg.textContent = String(o.message);
      wrap.appendChild(msg);
    }
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'vmd-input';
    if (o.value != null) input.value = String(o.value);
    if (o.placeholder != null) input.placeholder = String(o.placeholder);
    input.setAttribute('autofocus', ''); // initialFocus targets [autofocus]
    wrap.appendChild(input);
    o.content = wrap;

    function submit(h) {
      if (o.required && input.value === '') {
        input.focus();
        return false; // keep open until there is something to submit
      }
      h.close(input.value);
      return false; // we closed with the value; skip the default close
    }

    o.buttons = [
      { label: L.cancel },
      { label: L.ok, variant: 'primary', onClick: submit }
    ];
    var userClose = o.onClose;
    o.onClose = function (result) {
      if (userClose) userClose(result);
      d.resolve(typeof result === 'string' ? result : null);
    };

    var h = Modal.open(o);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit(h);
      }
    });
    if (input.value) input.select(); // like window.prompt with a default
    return d.promise;
  };

  /* ------------------------------------------------------------------ *
   * Declarative wiring — [data-vmd-open="#selector"] triggers open the
   * referenced element as a modal; [data-vmd-close] inside any modal
   * closes it (handled by the per-modal click listener above).
   * ------------------------------------------------------------------ */

  function dataOptions(el) {
    var o = {};
    var t = el.getAttribute('data-vmd-title');
    var s = el.getAttribute('data-vmd-size');
    var dis = el.getAttribute('data-vmd-dismissible');
    if (t) o.title = t;
    if (s) o.size = s;
    if (dis != null) o.dismissible = dis !== 'false' && dis !== '0';
    return o;
  }

  function bindTrigger(trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var target = resolveElement(trigger.getAttribute('data-vmd-open'));
      if (!target) return;
      var inst = Modal.get(target) || new Modal(target, dataOptions(target));
      // Explicit opener: Safari doesn't focus clicked buttons, and focus
      // must land back on the trigger after close either way.
      inst.open({ opener: trigger });
    });
  }

  Modal.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vmd-open]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      var trigger = els[i];
      if (trigger.__vmdBound) continue;
      trigger.__vmdBound = true;
      bindTrigger(trigger);
      var target = resolveElement(trigger.getAttribute('data-vmd-open'));
      if (target && !Modal.get(target)) {
        try {
          created.push(new Modal(target, dataOptions(target)));
        } catch (err) {
          // One bad element must not abort init for the rest of the page.
          if (typeof console !== 'undefined') console.error('Modal auto-init:', err);
        }
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Modal.autoInit(); });
    } else {
      Modal.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Modal.displayName = 'Modal';
  Modal.rootClass = 'vmd';
  Modal.themeVars = {
    accent: '--vmd-accent',
    radius: '--vmd-radius',
    font: '--vmd-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Modal.varScopes = ['.vmd', '.vmd[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('modal', Modal);
  }

  return Modal;
});

}).call(__root);
var Modal = __root.Modal;
export { Modal };
export default Modal;
