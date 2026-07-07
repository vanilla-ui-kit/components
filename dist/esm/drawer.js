/*! vanilla-ui-kit/drawer v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Drawer v1.0.0
 * A single-file, zero-dependency side-sheet / drawer layer for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="drawer.js"></script>
 *   <script>Drawer.open({ title: 'Filters', content: 'Hello' })</script>
 *
 * Headless:
 *   Drawer.defaults.styles = false   // no CSS injected; style .vdr-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Drawer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-drawer-styles';
  var OUT_MS = 190; // keep in sync with the .vdr-out transition
  var SIDES = ['right', 'left', 'top', 'bottom'];
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Drawer.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Drawer.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the drawers; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vdr{--vdr-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vdr{' +
      '--vdr-accent:#5b5bd6;' +
      '--vdr-on-accent:#ffffff;' +
      '--vdr-danger:#e5484d;' +
      '--vdr-bg:#ffffff;' +
      '--vdr-surface:#f2f2f5;' +
      '--vdr-text:#1c1d21;' +
      '--vdr-muted:#72747e;' +
      '--vdr-faint:#e7e7ec;' +
      '--vdr-backdrop:rgba(20,21,26,.45);' +
      '--vdr-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vdr-radius:14px;' +
      '--vdr-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vdr[data-theme=dark]{' +
      '--vdr-accent:#7b7bea;' +
      '--vdr-on-accent:#131418;' +
      '--vdr-danger:#f2555a;' +
      '--vdr-bg:#1b1d24;' +
      '--vdr-surface:#272a33;' +
      '--vdr-text:#e9eaf0;' +
      '--vdr-muted:#989aa6;' +
      '--vdr-faint:#31343f;' +
      '--vdr-backdrop:rgba(0,0,0,.6);' +
      '--vdr-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    // The root is the scrim: full-viewport for the fallback <div>, and the
    // same for the native <dialog> (its ::backdrop goes transparent below),
    // so both paths dim and animate identically. The panel slides within it.
    '.vdr.SALT{position:fixed;top:0;left:0;z-index:99990;box-sizing:border-box;' +
      'width:100%;height:100%;max-width:none;max-height:none;' +
      'border:0;margin:0;padding:0;overflow:hidden;' +
      'background:var(--vdr-backdrop);opacity:0;transition:opacity .16s ease;}' +
    '.vdr.SALT::backdrop{background:transparent;}' +
    '.vdr.SALT *,.vdr.SALT *::before,.vdr.SALT *::after{box-sizing:border-box;}' +
    '.vdr.SALT.vdr-in{opacity:1;}' +
    '.vdr.SALT.vdr-out{opacity:0;transition-duration:.16s;}' +
    '.vdr.SALT .vdr-panel{position:absolute;display:flex;flex-direction:column;' +
      'max-width:100%;max-height:100%;background:var(--vdr-bg);color:var(--vdr-text);' +
      'font-family:var(--vdr-font);font-size:14px;line-height:1.55;' +
      'border:1px solid var(--vdr-faint);box-shadow:var(--vdr-shadow);outline:none;' +
      'transition:transform .2s cubic-bezier(.2,.8,.25,1);}' +
    // Per-side anchoring: flush against one edge, rounded on the inner edge
    // only, borderless on the attached edge; hidden state slides past 100%
    // (105%) so the box-shadow can't peek in from off-screen.
    '.vdr.SALT.vdr-right .vdr-panel{top:0;right:0;height:100%;border-right:0;' +
      'border-radius:var(--vdr-radius) 0 0 var(--vdr-radius);transform:translateX(105%);}' +
    '.vdr.SALT.vdr-left .vdr-panel{top:0;left:0;height:100%;border-left:0;' +
      'border-radius:0 var(--vdr-radius) var(--vdr-radius) 0;transform:translateX(-105%);}' +
    '.vdr.SALT.vdr-top .vdr-panel{top:0;left:0;width:100%;border-top:0;' +
      'border-radius:0 0 var(--vdr-radius) var(--vdr-radius);transform:translateY(-105%);}' +
    '.vdr.SALT.vdr-bottom .vdr-panel{bottom:0;left:0;width:100%;border-bottom:0;' +
      'border-radius:var(--vdr-radius) var(--vdr-radius) 0 0;transform:translateY(105%);}' +
    '.vdr.SALT.vdr-in .vdr-panel{transform:none;}' +
    '.vdr.SALT.vdr-out .vdr-panel{transition-duration:.16s;}' +
    '.vdr.SALT .vdr-head{flex:none;display:flex;align-items:flex-start;gap:12px;' +
      'padding:16px 20px 0;}' +
    '.vdr.SALT .vdr-title{flex:1;min-width:0;margin:0;font-size:17px;font-weight:650;' +
      'line-height:1.35;overflow-wrap:break-word;}' +
    '.vdr.SALT .vdr-head-spacer{flex:1;}' +
    '.vdr.SALT .vdr-x{flex:none;width:26px;height:26px;display:grid;place-items:center;' +
      'color:var(--vdr-muted);background:none;border:0;border-radius:8px;padding:0;' +
      'margin:-2px -6px 0 0;cursor:pointer;transition:background .12s ease,' +
      'color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vdr.SALT .vdr-x:hover{background:var(--vdr-faint);color:var(--vdr-text);}' +
    '.vdr.SALT .vdr-x svg{display:block;}' +
    '.vdr.SALT .vdr-body{flex:1;min-height:0;overflow:auto;padding:10px 20px 4px;' +
      'overflow-wrap:break-word;}' +
    '.vdr.SALT .vdr-body:first-child{padding-top:18px;}' +
    '.vdr.SALT .vdr-body:last-child{padding-bottom:18px;}' +
    '.vdr.SALT.vdr-has-title .vdr-msg{color:var(--vdr-muted);}' +
    '.vdr.SALT .vdr-foot{flex:none;display:flex;justify-content:flex-end;flex-wrap:wrap;' +
      'gap:8px;padding:16px 20px 18px;border-top:1px solid var(--vdr-faint);margin-top:10px;}' +
    '.vdr.SALT .vdr-btn{font:inherit;font-size:14px;font-weight:600;color:var(--vdr-text);' +
      'background:var(--vdr-surface);border:1px solid var(--vdr-faint);border-radius:10px;' +
      'padding:8px 16px;cursor:pointer;transition:background .12s ease,opacity .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vdr.SALT .vdr-btn:hover{background:var(--vdr-faint);}' +
    '.vdr.SALT .vdr-btn-primary{color:var(--vdr-on-accent);background:var(--vdr-accent);' +
      'border-color:transparent;}' +
    '.vdr.SALT .vdr-btn-primary:hover{background:var(--vdr-accent);opacity:.9;}' +
    '.vdr.SALT .vdr-btn-danger{color:var(--vdr-on-accent);background:var(--vdr-danger);' +
      'border-color:transparent;}' +
    '.vdr.SALT .vdr-btn-danger:hover{background:var(--vdr-danger);opacity:.9;}' +
    '.vdr.SALT .vdr-btn:focus,.vdr.SALT .vdr-x:focus{outline:none;}' +
    '.vdr.SALT .vdr-btn:focus-visible,.vdr.SALT .vdr-x:focus-visible{' +
      'outline:2px solid var(--vdr-accent);outline-offset:2px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vdr.SALT,.vdr.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/drawer.css), or set Drawer.salt to
  // your own token / false BEFORE the first drawer is opened.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Drawer.salt;
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
    var t = Drawer.defaults.theme;
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
    for (var i = 0; i < openDrawers.length; i++) {
      openDrawers[i].root.setAttribute('data-theme', itemTheme(openDrawers[i]));
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

  /* ------------------------------------------------------------------ *
   * Body scroll lock — engaged while ANY drawer is open, released when
   * the last one closes; the padding compensation avoids the layout
   * shift of the disappearing scrollbar.
   * ------------------------------------------------------------------ */

  var openDrawers = []; // stack: last = top-most
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
   * Building and closing. Title/content strings are TEXT (rendered with
   * textContent); `html: true` is an explicit opt-in for trusted markup.
   * A DOM element passed as `content` is adopted into the drawer and put
   * back where it came from on close.
   * ------------------------------------------------------------------ */

  function adoptContent(item, node, body) {
    if (node.parentNode) {
      item.placeholder = document.createComment('vdr');
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
    var side = SIDES.indexOf(opts.side) !== -1 ? opts.side : 'right';
    item.root.className = 'vdr' + saltClass() + ' vdr-' + side +
      (opts.title ? ' vdr-has-title' : '') + (item.entered ? ' vdr-in' : '');
    item.root.setAttribute('data-theme', itemTheme(item));
    // `size` is the drawer's one dimension: width when it hangs off a
    // vertical edge, height off a horizontal one (the other axis is 100%).
    var size = opts.size != null && opts.size !== '' ? String(opts.size) : '360px';
    if (side === 'left' || side === 'right') {
      item.panel.style.width = size;
      item.panel.style.height = '';
    } else {
      item.panel.style.height = size;
      item.panel.style.width = '';
    }
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
      head.className = 'vdr-head';
      if (opts.title) {
        var title = document.createElement('h2');
        title.className = 'vdr-title';
        title.id = item.titleId;
        title.textContent = String(opts.title);
        head.appendChild(title);
      } else {
        var spacer = document.createElement('div');
        spacer.className = 'vdr-head-spacer';
        head.appendChild(spacer);
      }
      if (opts.dismissible !== false) {
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'vdr-x';
        x.setAttribute('aria-label', opts.labels.close);
        x.innerHTML = ICON_CLOSE;
        x.addEventListener('click', function () { closeItem(item); });
        head.appendChild(x);
      }
      panel.appendChild(head);
    }

    var body = document.createElement('div');
    body.className = 'vdr-body';
    item.bodyEl = body;
    var c = opts.content;
    if (c && c.nodeType === 1) {
      adoptContent(item, c, body);
    } else if (c != null) {
      var msg = document.createElement('div');
      msg.className = 'vdr-msg';
      if (opts.html) msg.innerHTML = String(c);
      else msg.textContent = String(c);
      body.appendChild(msg);
    }
    panel.appendChild(body);

    item.footEl = null;
    if (opts.buttons && opts.buttons.length) {
      var foot = document.createElement('div');
      foot.className = 'vdr-foot';
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
    btn.className = 'vdr-btn' +
      (b.variant === 'primary' || b.variant === 'danger' ? ' vdr-btn-' + b.variant : '');
    btn.textContent = String(b.label);
    btn.addEventListener('click', function () {
      // Return false from onClick to keep the drawer open (validation etc.).
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

  // Preference order: [autofocus] → first focusable in the body (a filter
  // field, a nav link) → primary button → any button → the panel itself.
  function initialFocus(item) {
    var t = item.panel.querySelector('[autofocus]') ||
      firstFocusable(item.bodyEl) ||
      (item.footEl && item.footEl.querySelector('.vdr-btn-primary')) ||
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
    var i = openDrawers.indexOf(item);
    if (i !== -1) openDrawers.splice(i, 1);
    item.root.classList.remove('vdr-in');
    item.root.classList.add('vdr-out');
    setTimeout(function () {
      restoreAdopted(item);
      if (item.native) { try { item.root.close(); } catch (err) { /* already closed */ } }
      if (item.root.parentNode) item.root.parentNode.removeChild(item.root);
      if (openDrawers.length === 0) unlockScroll();
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
   * Public API. `Drawer` doubles as a constructor — `new Drawer(el)`
   * turns existing (hidden) markup into a drawer; `Drawer.open(opts)`
   * builds one from options.
   * ------------------------------------------------------------------ */

  function Drawer(target, options) {
    if (!(this instanceof Drawer)) return new Drawer(target, options);
    this.opts = options || {};
    this.handle = null;
    this.el = HAS_DOM ? resolveElement(target) : null; // SSR: inert instance
    if (HAS_DOM && !this.el) throw new Error('Drawer: target element not found: ' + target);
    if (this.el && instances) {
      var prev = instances.get(this.el);
      if (prev) prev.close();
      instances.set(this.el, this);
    }
  }

  Drawer.prototype = {
    constructor: Drawer,

    open: function (extra) {
      if (!this.el || this.handle) return this;
      var o = {}, k;
      for (k in this.opts) o[k] = this.opts[k];
      if (extra) for (k in extra) if (extra[k] !== undefined) o[k] = extra[k];
      if (o.title === undefined) {
        var t = this.el.getAttribute('data-vdr-title');
        if (t) o.title = t;
      }
      o.content = this.el;
      var self = this;
      var userClose = o.onClose;
      o.onClose = function (result) {
        self.handle = null;
        if (userClose) userClose(result);
      };
      this.handle = Drawer.open(o);
      return this;
    },

    close: function (result) {
      if (this.handle) this.handle.close(result);
      return this;
    },

    isOpen: function () {
      return !!this.handle;
    },

    // Close (restoring the adopted element to where it came from) and drop
    // the instance registration so the element can be re-enhanced.
    destroy: function () {
      this.close();
      if (this.el && instances && instances.get(this.el) === this) {
        instances['delete'](this.el);
      }
      this.el = null;
      return this;
    }
  };

  Drawer.version = '1.0.0';
  Drawer.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Drawer, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Drawer.css = renderCss();
  }

  Drawer.defaults = {
    side: 'right',       // 'right' | 'left' | 'top' | 'bottom'
    size: '360px',       // width for left/right, height for top/bottom
    dismissible: true,   // Esc, backdrop click, and the ✕ button
    styles: true,        // false = headless, no CSS ever injected
    theme: 'auto',       // 'auto' | 'light' | 'dark'
    labels: { close: 'Close', dialog: 'Drawer' }
  };

  // Drawer.open(opts) → handle { el, close(result), update(opts) }.
  // opts: side, title, content (string | element | html-string with
  // {html:true}), size, buttons [{label, variant, onClick(handle), close}],
  // dismissible, onOpen(handle), onClose(result), theme, ariaLabel, opener.
  Drawer.open = function (opts) {
    if (!HAS_DOM) return dummyHandle;
    opts = mergedOpts(Drawer.defaults, opts);
    if (opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    ensureThemeWatch();

    var native = supportsDialog();
    var root = document.createElement(native ? 'dialog' : 'div');
    var panel = document.createElement('div');
    panel.className = 'vdr-panel';
    panel.setAttribute('tabindex', '-1'); // focus target of last resort
    root.appendChild(panel);

    var item = {
      root: root,
      panel: panel,
      native: native,
      opts: opts,
      opener: (opts.opener && opts.opener.nodeType === 1)
        ? opts.opener : document.activeElement,
      titleId: 'vdr-title-' + (++uid),
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
        // Re-seat focus only if the rebuild dropped it out of the drawer.
        if (!item.panel.contains(document.activeElement)) initialFocus(item);
        return item.handle;
      }
    };

    if (!native) root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    applyChrome(item);
    setContent(item);

    openDrawers.push(item);
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
    // drag that ends outside the panel never dismisses the drawer.
    root.addEventListener('mousedown', function (e) {
      if (e.target === root && item.opts.dismissible !== false) closeItem(item);
    });
    root.addEventListener('click', function (e) {
      if (closestAttr(e.target, 'data-vdr-close', root)) closeItem(item);
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
    // Double rAF so the initial (off-screen) styles are committed first.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        item.entered = true;
        root.classList.add('vdr-in');
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

  // Drawer.create(target, opts) — constructor sugar that mirrors the rest
  // of the family; returns the enhanced instance.
  Drawer.create = function (target, options) {
    return new Drawer(target, options);
  };

  Drawer.get = function (target) {
    var el = HAS_DOM ? resolveElement(target) : null;
    return (el && instances && instances.get(el)) || null;
  };

  /* ------------------------------------------------------------------ *
   * Declarative wiring — [data-vdr-open="#selector"] triggers open the
   * referenced element as a drawer; [data-vdr-close] inside any drawer
   * closes it (handled by the per-drawer click listener above).
   * ------------------------------------------------------------------ */

  function dataOptions(el) {
    var o = {};
    var t = el.getAttribute('data-vdr-title');
    var s = el.getAttribute('data-vdr-side');
    var z = el.getAttribute('data-vdr-size');
    var dis = el.getAttribute('data-vdr-dismissible');
    if (t) o.title = t;
    if (s) o.side = s;
    if (z) o.size = z;
    if (dis != null) o.dismissible = dis !== 'false' && dis !== '0';
    return o;
  }

  function bindTrigger(trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var target = resolveElement(trigger.getAttribute('data-vdr-open'));
      if (!target) return;
      var inst = Drawer.get(target) || new Drawer(target, dataOptions(target));
      // Explicit opener: Safari doesn't focus clicked buttons, and focus
      // must land back on the trigger after close either way.
      inst.open({ opener: trigger });
    });
  }

  Drawer.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vdr-open]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      var trigger = els[i];
      if (trigger.__vdrBound) continue;
      trigger.__vdrBound = true;
      bindTrigger(trigger);
      var target = resolveElement(trigger.getAttribute('data-vdr-open'));
      if (target && !Drawer.get(target)) {
        try {
          created.push(new Drawer(target, dataOptions(target)));
        } catch (err) {
          // One bad element must not abort init for the rest of the page.
          if (typeof console !== 'undefined') console.error('Drawer auto-init:', err);
        }
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Drawer.autoInit(); });
    } else {
      Drawer.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Drawer.displayName = 'Drawer';
  Drawer.rootClass = 'vdr';
  Drawer.themeVars = {
    accent: '--vdr-accent',
    radius: '--vdr-radius',
    font: '--vdr-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Drawer.varScopes = ['.vdr', '.vdr[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('drawer', Drawer);
  }

  return Drawer;
});

}).call(__root);
var Drawer = __root.Drawer;
export { Drawer };
export default Drawer;
