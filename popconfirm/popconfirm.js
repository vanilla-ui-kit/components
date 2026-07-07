/*!
 * Vanilla UI Kit Popconfirm v1.0.0
 * A single-file, zero-dependency inline confirmation popover for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="popconfirm.js"></script>
 *   <button data-vpc="Delete this file?">Delete</button>
 *   // or: const ok = await Popconfirm.ask('#btn', 'Are you sure?')
 *
 * Headless:
 *   Popconfirm.defaults.styles = false  // no CSS injected; style .vpc-* yourself
 *
 * Needs a `Promise` global (native everywhere modern; polyfill for antiques).
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Popconfirm = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-popconfirm-styles';
  var OUT_MS = 150; // keep in sync with the .vpc transition
  var PLACEMENTS = ['top', 'bottom', 'left', 'right'];
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Popconfirm.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Popconfirm.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the panels; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vpc{--vpc-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vpc{' +
      '--vpc-accent:#5b5bd6;' +
      '--vpc-danger:#e5484d;' +
      '--vpc-warning:#b45309;' +
      '--vpc-bg:#ffffff;' +
      '--vpc-text:#1c1d21;' +
      '--vpc-muted:#72747e;' +
      '--vpc-faint:#e7e7ec;' +
      '--vpc-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vpc-radius:12px;' +
      '--vpc-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vpc[data-theme=dark]{' +
      '--vpc-accent:#7b7bea;' +
      '--vpc-danger:#f2555a;' +
      '--vpc-warning:#f5a623;' +
      '--vpc-bg:#1b1d24;' +
      '--vpc-text:#e9eaf0;' +
      '--vpc-muted:#989aa6;' +
      '--vpc-faint:#31343f;' +
      '--vpc-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vpc.SALT{position:absolute;z-index:100000;box-sizing:border-box;' +
      'background:var(--vpc-bg);color:var(--vpc-text);' +
      'font-family:var(--vpc-font);font-size:14px;line-height:1.45;font-weight:400;' +
      'border:1px solid var(--vpc-faint);border-radius:var(--vpc-radius);' +
      'box-shadow:var(--vpc-shadow);padding:12px 14px;' +
      'width:max-content;max-width:min(320px,calc(100vw - 16px));text-align:left;' +
      'opacity:0;transform:scale(.96);' +
      'transition:opacity .12s ease,transform .15s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vpc.SALT *,.vpc.SALT *::before,.vpc.SALT *::after{box-sizing:border-box;}' +
    '.vpc.SALT.vpc-open{opacity:1;transform:none;}' +
    '.vpc.SALT[data-placement=top]{transform-origin:50% 100%;}' +
    '.vpc.SALT[data-placement=bottom]{transform-origin:50% 0%;}' +
    '.vpc.SALT[data-placement=left]{transform-origin:100% 50%;}' +
    '.vpc.SALT[data-placement=right]{transform-origin:0% 50%;}' +
    '.vpc.SALT .vpc-body{display:flex;align-items:flex-start;gap:10px;}' +
    '.vpc.SALT .vpc-icon{flex:none;width:18px;height:18px;display:grid;place-items:center;' +
      'margin-top:1px;color:var(--vpc-warning);}' +
    '.vpc.SALT.vpc-danger .vpc-icon{color:var(--vpc-danger);}' +
    '.vpc.SALT .vpc-icon svg{display:block;}' +
    '.vpc.SALT .vpc-content{flex:1;min-width:0;overflow-wrap:break-word;}' +
    '.vpc.SALT .vpc-title{font-weight:650;}' +
    '.vpc.SALT .vpc-title~.vpc-msg{color:var(--vpc-muted);margin-top:1px;}' +
    '.vpc.SALT .vpc-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;}' +
    '.vpc.SALT .vpc-btn{font:inherit;font-size:13px;font-weight:600;line-height:1.3;' +
      'border-radius:8px;padding:5px 12px;cursor:pointer;border:1px solid transparent;' +
      'transition:background .12s ease,border-color .12s ease,filter .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vpc.SALT .vpc-cancel{color:var(--vpc-text);background:none;border-color:var(--vpc-faint);}' +
    '.vpc.SALT .vpc-cancel:hover{background:var(--vpc-faint);}' +
    '.vpc.SALT .vpc-ok{color:#fff;background:var(--vpc-accent);border-color:var(--vpc-accent);}' +
    '.vpc.SALT.vpc-danger .vpc-ok{background:var(--vpc-danger);border-color:var(--vpc-danger);}' +
    '.vpc.SALT .vpc-ok:hover{filter:brightness(1.08);}' +
    '.vpc.SALT .vpc-btn:focus{outline:none;}' +
    '.vpc.SALT .vpc-btn:focus-visible{outline:2px solid var(--vpc-accent);outline-offset:1px;}' +
    '.vpc.SALT.vpc-danger .vpc-ok:focus-visible{outline-color:var(--vpc-danger);}' +
    /* the arrow is a rotated square; each placement shows the two borders
       that face away from the panel, so the outline stays continuous */
    '.vpc.SALT .vpc-arrow{position:absolute;width:8px;height:8px;background:var(--vpc-bg);' +
      'border:0 solid var(--vpc-faint);transform:rotate(45deg);}' +
    '.vpc.SALT[data-placement=top] .vpc-arrow{bottom:-4.5px;' +
      'border-right-width:1px;border-bottom-width:1px;}' +
    '.vpc.SALT[data-placement=bottom] .vpc-arrow{top:-4.5px;' +
      'border-left-width:1px;border-top-width:1px;}' +
    '.vpc.SALT[data-placement=left] .vpc-arrow{right:-4.5px;' +
      'border-top-width:1px;border-right-width:1px;}' +
    '.vpc.SALT[data-placement=right] .vpc-arrow{left:-4.5px;' +
      'border-bottom-width:1px;border-left-width:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vpc.SALT,.vpc.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/popconfirm.css), or set Popconfirm.salt
  // to your own token / false BEFORE the first popconfirm is shown.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Popconfirm.salt;
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

  function injectOwnStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    // Insert before the page's own CSS so `.vpc { --vpc-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  // Same warning triangle as the family's toast, colored --vpc-warning
  // (or --vpc-danger when the confirm is destructive).
  var WARN_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M8 2.4 14.5 13.5H1.5L8 2.4Z" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linejoin="round"/>' +
    '<path d="M8 6.6v2.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<circle cx="8" cy="11.6" r=".9" fill="currentColor"/></svg>';

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

  function refreshTheme() {
    if (!active) return;
    var t = active.opts.theme;
    active.panel.setAttribute('data-theme',
      (t === 'light' || t === 'dark') ? t : resolveAutoTheme());
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

  // Promise.resolve(false) with a last-ditch thenable so a bare ES5
  // environment without Promise still `await`s to false instead of crashing.
  function resolvedFalse() {
    if (typeof Promise !== 'undefined') return Promise.resolve(false);
    var t = { then: function (fn) { if (fn) fn(false); return t; } };
    return t;
  }

  function getInst(el) { return instances ? instances.get(el) : el._vpc; }
  function setInst(el, inst) { if (instances) instances.set(el, inst); else el._vpc = inst; }
  function delInst(el) {
    if (instances) instances.delete(el);
    else try { delete el._vpc; } catch (err) { el._vpc = null; }
  }

  // Does the event's path include `node`? (composedPath when available,
  // otherwise a parentNode walk from the target.)
  function eventWithin(e, node) {
    if (!node) return false;
    if (e.composedPath) return e.composedPath().indexOf(node) !== -1;
    var t = e.target;
    while (t) { if (t === node) return true; t = t.parentNode; }
    return false;
  }

  function isSubmitControl(el) {
    if (!el || !el.form) return false;
    if (el.tagName === 'BUTTON') {
      return (el.getAttribute('type') || 'submit').toLowerCase() === 'submit';
    }
    if (el.tagName === 'INPUT') return el.type === 'submit' || el.type === 'image';
    return false;
  }

  // SSR / missing target: `new Popconfirm(…)` hands back one shared inert
  // instance whose whole API is a harmless no-op.
  var dummyInstance = null;

  function makeDummy() {
    if (dummyInstance) return dummyInstance;
    var d = { el: null, isOpen: false, opts: {} };
    d.show = d.hide = d.destroy = function () { return d; };
    dummyInstance = d;
    return d;
  }

  /* ------------------------------------------------------------------ *
   * The active view — at most ONE popconfirm is open at any time, so all
   * open-state (panel, listeners, resolver) lives in a single module-level
   * `active` record. Opening a new one settles the previous as a cancel.
   * ------------------------------------------------------------------ */

  var active = null;

  function buildPanel(opts) {
    var p = document.createElement('div');
    p.className = 'vpc' + saltClass() + (opts.danger ? ' vpc-danger' : '');
    p.id = 'vpc-' + (++uid);
    p.setAttribute('role', 'alertdialog');
    if (opts.width != null && opts.width !== false) {
      p.style.width = typeof opts.width === 'number' ? opts.width + 'px' : String(opts.width);
    }

    var arrow = document.createElement('span');
    arrow.className = 'vpc-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    p.appendChild(arrow);

    var body = document.createElement('div');
    body.className = 'vpc-body';
    if (opts.icon !== false) {
      var icon = document.createElement('span');
      icon.className = 'vpc-icon';
      // A custom icon string is trusted markup by definition (author-supplied).
      icon.innerHTML = typeof opts.icon === 'string' ? opts.icon : WARN_ICON;
      body.appendChild(icon);
    }
    var content = document.createElement('div');
    content.className = 'vpc-content';
    if (opts.title) {
      var title = document.createElement('div');
      title.className = 'vpc-title';
      title.id = p.id + '-title';
      title.textContent = String(opts.title);
      content.appendChild(title);
    }
    var msg = document.createElement('div');
    msg.className = 'vpc-msg';
    msg.id = p.id + '-msg';
    // Message is TEXT by default; `html: true` is an explicit opt-in.
    if (opts.html) msg.innerHTML = opts.message == null ? '' : String(opts.message);
    else msg.textContent = opts.message == null ? '' : String(opts.message);
    content.appendChild(msg);
    body.appendChild(content);
    p.appendChild(body);

    p.setAttribute('aria-labelledby', opts.title ? p.id + '-title' : p.id + '-msg');
    if (opts.title) p.setAttribute('aria-describedby', p.id + '-msg');

    var actions = document.createElement('div');
    actions.className = 'vpc-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'vpc-btn vpc-cancel';
    cancel.textContent = String(opts.cancelLabel != null ? opts.cancelLabel : opts.labels.cancel);
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'vpc-btn vpc-ok';
    ok.textContent = String(opts.okLabel != null ? opts.okLabel : opts.labels.ok);
    actions.appendChild(cancel);
    actions.appendChild(ok);
    p.appendChild(actions);

    return { panel: p, arrow: arrow, ok: ok, cancel: cancel };
  }

  // Tooltip-style positioning: preferred side, flip when there is no room,
  // clamp to the viewport, arrow kept pointed at the anchor. VC.position
  // owns the vertical decision when the core is loaded.
  function positionView(view) {
    var panel = view.panel, anchor = view.anchor;
    var r = anchor.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var gap = view.opts.offset == null ? 8 : +view.opts.offset;
    var pad = 8;
    var place = PLACEMENTS.indexOf(view.opts.placement) !== -1
      ? view.opts.placement : 'top';

    // Flip to the opposite side when there is no room but the other has it.
    if (place === 'top' && r.top < ph + gap && vh - r.bottom >= ph + gap) place = 'bottom';
    else if (place === 'bottom' && vh - r.bottom < ph + gap && r.top >= ph + gap) place = 'top';
    else if (place === 'left' && r.left < pw + gap && vw - r.right >= pw + gap) place = 'right';
    else if (place === 'right' && vw - r.right < pw + gap && r.left >= pw + gap) place = 'left';

    // Inside an open <dialog> the panel must ride in the top layer with the
    // dialog (fixed, viewport coordinates); otherwise absolute in the page.
    var fixed = !!(anchor.closest && anchor.closest('dialog'));
    var core = window.VC && typeof window.VC.position === 'function' ? window.VC : null;
    var top, left;

    if (place === 'top' || place === 'bottom') {
      if (core) {
        var res = core.position(panel, anchor, {
          prefer: place === 'bottom' ? 'below' : 'above', gap: gap, pad: pad
        });
        place = res.below ? 'bottom' : 'top';
        fixed = res.fixed;
        top = res.top;
      } else {
        top = place === 'bottom' ? r.bottom + gap : r.top - ph - gap;
      }
      left = Math.min(Math.max(pad, r.left + (r.width - pw) / 2),
        Math.max(pad, vw - pw - pad));
    } else {
      left = place === 'left' ? r.left - pw - gap : r.right + gap;
      top = Math.min(Math.max(pad, r.top + (r.height - ph) / 2),
        Math.max(pad, vh - ph - pad));
    }

    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
    panel.setAttribute('data-placement', place);

    // Keep the arrow pointed at the anchor even when the panel is clamped.
    if (place === 'top' || place === 'bottom') {
      var ax = Math.min(Math.max(10, r.left + r.width / 2 - left), pw - 10);
      view.arrow.style.left = Math.round(ax - 4) + 'px';
      view.arrow.style.top = '';
    } else {
      var ay = Math.min(Math.max(10, r.top + r.height / 2 - top), ph - 10);
      view.arrow.style.top = Math.round(ay - 4) + 'px';
      view.arrow.style.left = '';
    }
  }

  function openView(anchor, opts, done, inst) {
    if (active) settleActive(false); // only one popconfirm at a time

    if (opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    ensureThemeWatch();

    var built = buildPanel(opts);
    var view = {
      anchor: anchor, opts: opts, done: done, inst: inst,
      panel: built.panel, arrow: built.arrow, ok: built.ok, cancel: built.cancel,
      settled: false
    };

    view.onOk = function () { settleActive(true); };
    view.onCancel = function () { settleActive(false); };
    // Escape anywhere = cancel; Tab is trapped inside the two buttons
    // (Enter/Space activate the focused button natively).
    view.onKeydown = function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        // Consume the key entirely: stopPropagation for page listeners,
        // preventDefault so a host <dialog> doesn't also cancel itself.
        e.stopPropagation();
        e.preventDefault();
        settleActive(false);
        return;
      }
      if (e.key !== 'Tab') return;
      e.preventDefault();
      var btns = [view.cancel, view.ok];
      var i = btns.indexOf(document.activeElement);
      if (i === -1) view.cancel.focus();
      else btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
    };
    // Pointer-down outside the panel = cancel. The anchor itself is exempt
    // so a click on it becomes a clean toggle in the click interceptor
    // instead of close-then-immediately-reopen.
    view.onDocPointer = function (e) {
      if (eventWithin(e, view.panel) || eventWithin(e, view.anchor)) return;
      settleActive(false);
    };
    view.onWinScroll = function () { positionView(view); };

    active = view;
    // Inside an open <dialog> the panel must join it in the top layer.
    var host = anchor.closest ? anchor.closest('dialog') : null;
    (host || document.body).appendChild(view.panel);
    refreshTheme();
    positionView(view);
    requestAnimationFrame(function () { view.panel.classList.add('vpc-open'); });

    if (inst) {
      anchor.setAttribute('aria-expanded', 'true');
      anchor.setAttribute('aria-controls', view.panel.id);
    }
    view.ok.addEventListener('click', view.onOk);
    view.cancel.addEventListener('click', view.onCancel);
    document.addEventListener('keydown', view.onKeydown, true);
    document.addEventListener('pointerdown', view.onDocPointer, true);
    window.addEventListener('scroll', view.onWinScroll, true);
    window.addEventListener('resize', view.onWinScroll);

    // Focus lands on CANCEL — the safe default for a destructive prompt:
    // a reflexive Enter dismisses instead of confirming.
    view.cancel.focus();
  }

  function settleActive(result) {
    var view = active;
    if (!view || view.settled) return;
    view.settled = true;
    active = null;

    document.removeEventListener('keydown', view.onKeydown, true);
    document.removeEventListener('pointerdown', view.onDocPointer, true);
    window.removeEventListener('scroll', view.onWinScroll, true);
    window.removeEventListener('resize', view.onWinScroll);

    if (view.inst) {
      view.anchor.setAttribute('aria-expanded', 'false');
      view.anchor.removeAttribute('aria-controls');
    }

    // Refocus the trigger, but only when focus is actually inside the panel
    // (or already lost) — never steal it from whatever the user clicked.
    var af = document.activeElement;
    if ((!af || af === document.body || view.panel.contains(af)) &&
        view.anchor && view.anchor.focus) {
      try { view.anchor.focus(); } catch (err) { /* detached anchor */ }
    }

    var panel = view.panel;
    panel.classList.remove('vpc-open');
    setTimeout(function () {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    }, OUT_MS);

    if (result) {
      if (view.opts.onConfirm) view.opts.onConfirm(view.anchor);
      // Bound triggers (constructor / data-vpc): the intercepted click now
      // proceeds — re-dispatched with the one-shot guard below.
      if (view.inst && !view.inst._destroyed) passthrough(view.inst);
    } else if (view.opts.onCancel) {
      view.opts.onCancel();
    }
    if (view.done) view.done(!!result);
  }

  /* ------------------------------------------------------------------ *
   * Interception + passthrough.
   *
   * Bound triggers are intercepted by ONE document-level CAPTURE listener
   * (not a listener on the element): capture at the document runs before
   * any listener on the trigger itself — including inline onclick="…" and
   * handlers registered before Popconfirm — so preventDefault +
   * stopImmediatePropagation here reliably freezes the original click
   * (form submits, link navigation, app handlers) until confirmed.
   *
   * On confirm the original click "proceeds": we re-dispatch a synthetic
   * click on the trigger. Re-entrancy guard design:
   *
   *   - `inst._allow` is set to true ONLY for the synchronous duration of
   *     that one dispatchEvent() call, and unconditionally reset in a
   *     `finally` — so the guard window cannot leak. Even if some other
   *     capture listener kills the event before it reaches anything, the
   *     next REAL click is intercepted again. No loops: while _allow is
   *     true the interceptor returns without opening a panel, and the
   *     re-dispatched event can never re-enter passthrough() because
   *     passthrough only runs from a confirm, which needs an open panel.
   *
   *   - Submit buttons: activation behaviour of synthetic clicks is not a
   *     reliable way to submit a form (and where it does run it would race
   *     our own submit). So during the guarded pass we preventDefault the
   *     synthetic click's native default, let every page listener see the
   *     event, and then submit explicitly, exactly once, via
   *     form.requestSubmit(trigger) (validation + submit event + the
   *     button's name/value) with form.submit() as the legacy fallback.
   * ------------------------------------------------------------------ */

  var boundCount = 0;

  function onDocClickCapture(e) {
    // Find a bound trigger on the event path (click may land on a <span>
    // inside the button).
    var node = e.target, inst = null;
    while (node && node.nodeType === 1) {
      inst = getInst(node);
      if (inst && !inst._destroyed) break;
      inst = null;
      node = node.parentNode;
    }
    if (!inst) return;

    if (inst._allow) {
      // Our own guarded re-dispatch: let it through exactly once. Take over
      // the submit default so the explicit requestSubmit below is the only
      // submission (see passthrough()).
      if (isSubmitControl(inst.el)) e.preventDefault();
      return;
    }

    e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    else e.stopPropagation();

    // Clicking the trigger of the already-open popconfirm toggles it shut.
    if (active && active.inst === inst) { settleActive(false); return; }
    inst.show();
  }

  function retainInterceptor() {
    if (++boundCount === 1) document.addEventListener('click', onDocClickCapture, true);
  }

  function releaseInterceptor() {
    if (boundCount > 0 && --boundCount === 0) {
      document.removeEventListener('click', onDocClickCapture, true);
    }
  }

  function passthrough(inst) {
    var el = inst.el;
    var ev;
    try {
      ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    } catch (err) { // legacy engines without the MouseEvent constructor
      ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('click', true, true, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null);
    }
    inst._allow = true;                    // guard OPENS
    try { el.dispatchEvent(ev); }          // synchronous — listeners run now
    finally { inst._allow = false; }       // guard CLOSES, no matter what
    // Re-dispatched synthetic clicks don't submit forms — do it explicitly.
    if (isSubmitControl(el)) {
      var form = el.form;
      if (form.requestSubmit) form.requestSubmit(el);
      else form.submit();
    }
  }

  /* ------------------------------------------------------------------ *
   * Popconfirm — persistent binding on a trigger element.
   * ------------------------------------------------------------------ */

  function Popconfirm(target, options) {
    if (!HAS_DOM) return makeDummy();
    var el = resolveElement(target);
    if (!el) return makeDummy(); // contract: create(null).destroy() is a no-op

    var existing = getInst(el);
    if (existing && existing.destroy) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, Popconfirm.defaults, options || {});
    this._allow = false;      // one-shot passthrough guard (see above)
    this._destroyed = false;

    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-expanded', 'false');
    setInst(el, this);
    retainInterceptor();
  }

  Popconfirm.prototype = {
    constructor: Popconfirm,

    // Open the panel programmatically (the interceptor calls this too).
    show: function () {
      if (this._destroyed) return this;
      if (active && active.inst === this) return this;
      openView(this.el, this.opts, null, this);
      return this;
    },

    // Programmatic close counts as a cancel (resolves/announces false).
    hide: function () {
      if (active && active.inst === this) settleActive(false);
      return this;
    },

    destroy: function () {
      if (this._destroyed) return this;
      this.hide();
      this._destroyed = true;
      this.el.removeAttribute('aria-haspopup');
      this.el.removeAttribute('aria-expanded');
      delInst(this.el);
      releaseInterceptor();
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics.
   * ------------------------------------------------------------------ */

  Popconfirm.version = VERSION;

  Popconfirm.defaults = {
    message: 'Are you sure?',
    title: '',            // optional bold first line above the message
    okLabel: null,        // falls back to labels.ok
    cancelLabel: null,    // falls back to labels.cancel
    danger: false,        // true = red OK button + red icon
    placement: 'top',     // 'top' | 'bottom' | 'left' | 'right' (auto-flips)
    icon: true,           // default warning triangle; false = none; string = custom markup
    width: null,          // px number or CSS length; default: fit content
    offset: 8,            // px gap between anchor and panel
    html: false,          // message is TEXT by default; opt in for markup
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    styles: true,         // false = headless, no CSS ever injected
    labels: { ok: 'OK', cancel: 'Cancel' },
    onConfirm: null,      // fn(triggerEl) — bound instances only
    onCancel: null
  };

  // One-shot: anchor a confirm to any element, get a Promise<boolean>.
  // `opts` may be just the message string. SSR (or a missing anchor)
  // resolves false — the safe answer to "are you sure?".
  Popconfirm.ask = function (target, opts) {
    if (typeof opts === 'string') opts = { message: opts };
    var merged = assignOptions({}, Popconfirm.defaults, opts || {});
    if (!HAS_DOM) return resolvedFalse();
    var el = resolveElement(target);
    if (!el) return resolvedFalse();
    return new Promise(function (resolve) {
      openView(el, merged, resolve, null);
    });
  };

  Popconfirm.create = function (target, options) {
    return new Popconfirm(target, options);
  };

  Popconfirm.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && getInst(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    o.message = el.getAttribute('data-vpc') || Popconfirm.defaults.message;
    if (d.vpcTitle) o.title = d.vpcTitle;
    if (d.vpcOk) o.okLabel = d.vpcOk;
    if (d.vpcCancel) o.cancelLabel = d.vpcCancel;
    if (d.vpcDanger != null) o.danger = parseBool(d.vpcDanger);
    if (d.vpcPlacement) o.placement = d.vpcPlacement;
    if (d.vpcIcon != null) o.icon = parseBool(d.vpcIcon);
    if (d.vpcTheme) o.theme = d.vpcTheme;
    return o;
  }

  Popconfirm.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vpc]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (getInst(els[i])) continue;
      try {
        created.push(new Popconfirm(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Popconfirm auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Popconfirm.autoInit(); });
    } else {
      Popconfirm.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Popconfirm.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Popconfirm, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Popconfirm.css = renderCss();
  }
  Popconfirm.displayName = 'Popconfirm';
  Popconfirm.rootClass = 'vpc';
  Popconfirm.themeVars = {
    accent: '--vpc-accent',
    radius: '--vpc-radius',
    font: '--vpc-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Popconfirm.varScopes = ['.vpc', '.vpc[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('popconfirm', Popconfirm);
  }

  return Popconfirm;
});
