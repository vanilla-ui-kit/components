/*!
 * VanillaToast v1.0.0
 * A single-file, zero-dependency toast/notification stack for vanilla JS.
 * Part of the vanilla-components family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="toast.js"></script>
 *   <script>Toast.success('Saved')</script>
 *
 * Headless:
 *   Toast.defaults.styles = false   // no CSS injected; style .vt-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Toast = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-toast-styles';
  var OUT_MS = 190; // keep in sync with the .vt-out transition

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Toast.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Toast.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the toasts; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vt{--vt-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vt{' +
      '--vt-accent:#5b5bd6;' +
      '--vt-success:#1f9d5b;' +
      '--vt-error:#e5484d;' +
      '--vt-warning:#b45309;' +
      '--vt-bg:#ffffff;' +
      '--vt-text:#1c1d21;' +
      '--vt-muted:#72747e;' +
      '--vt-faint:#e7e7ec;' +
      '--vt-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vt-radius:12px;' +
      '--vt-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vt-stack[data-theme=dark] .vt{' +
      '--vt-accent:#7b7bea;' +
      '--vt-success:#4ccb8f;' +
      '--vt-error:#f2555a;' +
      '--vt-warning:#f5a623;' +
      '--vt-bg:#1b1d24;' +
      '--vt-text:#e9eaf0;' +
      '--vt-muted:#989aa6;' +
      '--vt-faint:#31343f;' +
      '--vt-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vt-stack.SALT{position:fixed;z-index:100000;display:flex;flex-direction:column;' +
      'gap:10px;padding:16px;pointer-events:none;box-sizing:border-box;' +
      'max-height:100vh;overflow:hidden;}' +
    '.vt-stack.SALT[data-pos^=top]{top:0;}' +
    '.vt-stack.SALT[data-pos^=bottom]{bottom:0;justify-content:flex-end;}' +
    '.vt-stack.SALT[data-pos$=right]{right:0;align-items:flex-end;}' +
    '.vt-stack.SALT[data-pos$=left]{left:0;align-items:flex-start;}' +
    '.vt-stack.SALT[data-pos$=center]{left:50%;transform:translateX(-50%);align-items:center;}' +
    '.vt-stack.SALT .vt{' +
      'pointer-events:auto;display:flex;align-items:flex-start;gap:10px;' +
      'box-sizing:border-box;min-width:240px;max-width:min(420px,calc(100vw - 32px));' +
      'background:var(--vt-bg);color:var(--vt-text);' +
      'font-family:var(--vt-font);font-size:14px;line-height:1.45;' +
      'border:1px solid var(--vt-faint);border-radius:var(--vt-radius);' +
      'box-shadow:var(--vt-shadow);padding:12px 14px;' +
      'opacity:0;transform:translateY(8px) scale(.98);' +
      'transition:opacity .16s ease,transform .18s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vt-stack.SALT .vt *,.vt-stack.SALT .vt *::before,.vt-stack.SALT .vt *::after{' +
      'box-sizing:border-box;}' +
    '.vt-stack.SALT[data-pos^=top] .vt{transform:translateY(-8px) scale(.98);}' +
    '.vt-stack.SALT .vt.vt-in{opacity:1;transform:none;}' +
    '.vt-stack.SALT .vt.vt-out{opacity:0;transform:scale(.97);transition-duration:.14s,.14s;}' +
    '.vt-stack.SALT .vt-icon{flex:none;width:18px;height:18px;display:grid;place-items:center;' +
      'margin-top:1px;color:var(--vt-accent);}' +
    '.vt-stack.SALT .vt-success .vt-icon{color:var(--vt-success);}' +
    '.vt-stack.SALT .vt-error .vt-icon{color:var(--vt-error);}' +
    '.vt-stack.SALT .vt-warning .vt-icon{color:var(--vt-warning);}' +
    '.vt-stack.SALT .vt-icon svg{display:block;}' +
    '.vt-stack.SALT .vt-spin{animation:vt-spin .8s linear infinite;}' +
    '@keyframes vt-spin{to{transform:rotate(360deg);}}' +
    '.vt-stack.SALT .vt-body{flex:1;min-width:0;overflow-wrap:break-word;}' +
    '.vt-stack.SALT .vt-title{font-weight:650;}' +
    '.vt-stack.SALT .vt-title~.vt-msg{color:var(--vt-muted);margin-top:1px;}' +
    '.vt-stack.SALT .vt-action{flex:none;font:inherit;font-weight:600;font-size:13px;' +
      'color:var(--vt-accent);background:none;border:0;border-radius:8px;' +
      'padding:4px 8px;margin:-3px -4px -3px 0;cursor:pointer;' +
      'transition:background .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vt-stack.SALT .vt-action:hover{background:var(--vt-faint);}' +
    '.vt-stack.SALT .vt-close{flex:none;width:22px;height:22px;display:grid;place-items:center;' +
      'color:var(--vt-muted);background:none;border:0;border-radius:6px;padding:0;' +
      'margin:-2px -6px -2px 0;cursor:pointer;transition:background .12s ease,' +
      'color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vt-stack.SALT .vt-close:hover{background:var(--vt-faint);color:var(--vt-text);}' +
    '.vt-stack.SALT .vt-close svg{display:block;}' +
    '.vt-stack.SALT .vt-action:focus,.vt-stack.SALT .vt-close:focus{outline:none;}' +
    '.vt-stack.SALT .vt-action:focus-visible,.vt-stack.SALT .vt-close:focus-visible{' +
      'outline:2px solid var(--vt-accent);outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vt-stack.SALT .vt,.vt-stack.SALT .vt *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the datepicker: 'vc1'
  // (deterministic, matches dist/toast.css), or set Toast.salt to your own
  // token / false BEFORE the first toast is shown.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Toast.salt;
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

  var ICONS = {
    info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8 7.2v3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="8" cy="5.1" r=".9" fill="currentColor"/></svg>',
    success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M5.4 8.2 7.2 10l3.4-4" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M8 2.4 14.5 13.5H1.5L8 2.4Z" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linejoin="round"/>' +
      '<path d="M8 6.6v2.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="8" cy="11.6" r=".9" fill="currentColor"/></svg>',
    loading: '<svg class="vt-spin" width="16" height="16" viewBox="0 0 16 16" fill="none"' +
      ' aria-hidden="true"><path d="M14.25 8A6.25 6.25 0 1 1 8 1.75" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>'
  };

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
    var t = Toast.defaults.theme;
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

  function refreshTheme() {
    var t = resolveTheme();
    for (var pos in stacks) stacks[pos].el.setAttribute('data-theme', t);
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
   * Stacks — one fixed container per position; newest toast sits nearest
   * the screen edge; hovering a stack pauses every timer in it.
   * ------------------------------------------------------------------ */

  var POSITIONS = ['top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right'];
  var stacks = {};

  function getStack(pos) {
    if (stacks[pos]) return stacks[pos];
    var el = document.createElement('div');
    el.className = 'vt-stack' + saltClass();
    el.setAttribute('data-pos', pos);
    el.setAttribute('data-theme', resolveTheme());
    var stack = { el: el, items: [] };
    el.addEventListener('mouseenter', function () { pauseStack(stack); });
    el.addEventListener('mouseleave', function () { resumeStack(stack); });
    document.body.appendChild(el);
    stacks[pos] = stack;
    return stack;
  }

  function removeIfEmpty(stack, pos) {
    if (stack.items.length === 0 && stacks[pos] === stack) {
      if (stack.el.parentNode) stack.el.parentNode.removeChild(stack.el);
      delete stacks[pos];
    }
  }

  function pauseStack(stack) {
    for (var i = 0; i < stack.items.length; i++) {
      var it = stack.items[i];
      if (it.timer) {
        clearTimeout(it.timer);
        it.timer = null;
        it.remaining -= Date.now() - it.startedAt;
        if (it.remaining < 400) it.remaining = 400; // grace so it never vanishes mid-read
      }
    }
  }

  function resumeStack(stack) {
    for (var i = 0; i < stack.items.length; i++) startTimer(stack.items[i]);
  }

  function startTimer(item) {
    if (item.dismissed || !item.duration || item.timer) return;
    item.startedAt = Date.now();
    item.timer = setTimeout(function () { dismissItem(item); }, item.remaining);
  }

  function dismissItem(item) {
    if (item.dismissed) return;
    item.dismissed = true;
    if (item.timer) { clearTimeout(item.timer); item.timer = null; }
    var stack = item.stack;
    var i = stack.items.indexOf(item);
    if (i !== -1) stack.items.splice(i, 1);
    item.el.classList.remove('vt-in');
    item.el.classList.add('vt-out');
    setTimeout(function () {
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
      removeIfEmpty(stack, item.pos);
    }, OUT_MS);
    if (item.opts.onDismiss) item.opts.onDismiss(item.handle);
  }

  /* ------------------------------------------------------------------ *
   * Toast building. Messages are TEXT by default (rendered with
   * textContent); `html: true` is an explicit opt-in for trusted markup.
   * ------------------------------------------------------------------ */

  function setContent(item, message, opts) {
    var el = item.el;
    var type = opts.type || 'info';
    el.className = 'vt vt-' + type + ' vt-in';
    var alertish = type === 'error' || type === 'warning';
    el.setAttribute('role', alertish ? 'alert' : 'status');
    el.setAttribute('aria-live', alertish ? 'assertive' : 'polite');
    el.innerHTML = '';

    var icon = document.createElement('span');
    icon.className = 'vt-icon';
    icon.innerHTML = ICONS[type] || ICONS.info;
    el.appendChild(icon);

    var body = document.createElement('div');
    body.className = 'vt-body';
    if (opts.title) {
      var title = document.createElement('div');
      title.className = 'vt-title';
      title.textContent = String(opts.title);
      body.appendChild(title);
    }
    var msg = document.createElement('div');
    msg.className = 'vt-msg';
    if (opts.html) msg.innerHTML = String(message);
    else msg.textContent = String(message);
    body.appendChild(msg);
    el.appendChild(body);

    if (opts.action && opts.action.label) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'vt-action';
      action.textContent = String(opts.action.label);
      action.addEventListener('click', function () {
        if (opts.action.onClick) opts.action.onClick(item.handle);
        dismissItem(item);
      });
      el.appendChild(action);
    }

    if (opts.dismissible !== false) {
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'vt-close';
      close.setAttribute('aria-label', Toast.defaults.labels.dismiss);
      close.innerHTML = ICONS.close;
      close.addEventListener('click', function () { dismissItem(item); });
      el.appendChild(close);
    }
  }

  function mergedOpts(opts) {
    var out = {}, k;
    for (k in Toast.defaults) if (k !== 'labels') out[k] = Toast.defaults[k];
    if (opts) for (k in opts) if (opts[k] !== undefined) out[k] = opts[k];
    return out;
  }

  var dummyHandle = {
    el: null,
    dismiss: function () {},
    update: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * Public API.
   * ------------------------------------------------------------------ */

  var Toast = {};

  Toast.version = '1.0.0';
  Toast.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Toast, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Toast.css = renderCss();
  }

  Toast.defaults = {
    position: 'bottom-right', // top|bottom - left|center|right
    duration: 4000,           // ms; 0 = sticky until dismissed
    type: 'info',
    dismissible: true,
    max: 5,                   // per stack; oldest is evicted beyond this
    styles: true,             // false = headless, no CSS ever injected
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    labels: { dismiss: 'Dismiss' }
  };

  Toast.show = function (message, opts) {
    if (!HAS_DOM) return dummyHandle;
    opts = mergedOpts(opts);
    if (opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    ensureThemeWatch();

    var pos = POSITIONS.indexOf(opts.position) !== -1 ? opts.position : 'bottom-right';
    var stack = getStack(pos);
    var el = document.createElement('div');

    var item = {
      el: el,
      pos: pos,
      stack: stack,
      opts: opts,
      duration: +opts.duration || 0,
      remaining: +opts.duration || 0,
      startedAt: 0,
      timer: null,
      dismissed: false
    };

    item.handle = {
      el: el,
      dismiss: function () { dismissItem(item); },
      update: function (newMessage, newOpts) {
        if (item.dismissed) return item.handle;
        var next = mergedOpts(newOpts);
        // An update() during hover-pause must not resurrect a stale timer.
        if (item.timer) { clearTimeout(item.timer); item.timer = null; }
        item.opts = next;
        item.duration = +next.duration || 0;
        item.remaining = item.duration;
        setContent(item, newMessage != null ? newMessage : '', next);
        startTimer(item);
        return item.handle;
      }
    };

    setContent(item, message == null ? '' : message, opts);
    el.classList.remove('vt-in'); // start hidden, then animate in

    // Newest nearest the screen edge: prepend for top stacks, append for bottom.
    if (pos.indexOf('top') === 0) stack.el.insertBefore(el, stack.el.firstChild);
    else stack.el.appendChild(el);
    stack.items.push(item);

    // Evict beyond the cap, oldest first.
    var max = +opts.max || Toast.defaults.max;
    while (stack.items.length > max) dismissItem(stack.items[0]);

    // Double rAF so the initial (hidden) styles are committed first.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('vt-in'); });
    });
    startTimer(item);
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

  Toast.info = function (m, o) { return Toast.show(m, withType(o, 'info')); };
  Toast.success = function (m, o) { return Toast.show(m, withType(o, 'success')); };
  Toast.error = function (m, o) { return Toast.show(m, withType(o, 'error')); };
  Toast.warning = function (m, o) { return Toast.show(m, withType(o, 'warning')); };
  Toast.loading = function (m, o) {
    o = withType(o, 'loading');
    if (o.duration === undefined) o.duration = 0; // sticky until updated/dismissed
    return Toast.show(m, o);
  };

  function withType(opts, type) {
    var out = {}, k;
    if (opts) for (k in opts) out[k] = opts[k];
    out.type = type;
    return out;
  }

  // Toast.promise(promise, {loading, success, error}) — success/error may be
  // strings or fn(result|reason) → string. Returns the original promise.
  Toast.promise = function (promise, msgs, opts) {
    msgs = msgs || {};
    var h = Toast.loading(msgs.loading || 'Working…', opts);
    promise.then(function (res) {
      h.update(
        typeof msgs.success === 'function' ? msgs.success(res) : (msgs.success || 'Done'),
        withType(opts, 'success')
      );
    }, function (err) {
      h.update(
        typeof msgs.error === 'function' ? msgs.error(err) : (msgs.error || 'Something went wrong'),
        withType(opts, 'error')
      );
    });
    return promise;
  };

  Toast.dismissAll = function () {
    for (var pos in stacks) {
      // dismissItem splices stack.items — iterate over a copy.
      var items = stacks[pos].items.slice();
      for (var i = 0; i < items.length; i++) dismissItem(items[i]);
    }
  };

  /* ---- convergence contract ---- */
  Toast.displayName = 'Toast';
  Toast.rootClass = 'vt';
  Toast.themeVars = {
    accent: '--vt-accent',
    radius: '--vt-radius',
    font: '--vt-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Toast.varScopes = ['.vt', '.vt-stack[data-theme=dark] .vt'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('toast', Toast);
  }

  return Toast;
});
