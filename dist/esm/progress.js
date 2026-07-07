/*! vanilla-ui-kit/progress v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Progress v1.0.0
 * A single-file, zero-dependency set of loading primitives — progress bars,
 * spinners and skeletons — for vanilla JS. Part of the Vanilla UI Kit
 * family — standalone, or converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="progress.js"></script>
 *   <script>
 *     var bar = Progress.bar('#slot', { label: 'Uploading…', showValue: true });
 *     bar.set(42); bar.done();
 *   </script>
 *
 * Headless:
 *   Progress.defaults.styles = false   // no CSS injected; style .vpg-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Progress = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-progress-styles';

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Progress.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Progress.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widgets; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vpg{--vpg-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vpg{' +
      '--vpg-accent:#5b5bd6;' +
      '--vpg-success:#1f9d5b;' +
      '--vpg-bg:#ffffff;' +
      '--vpg-text:#1c1d21;' +
      '--vpg-muted:#72747e;' +
      '--vpg-faint:#e7e7ec;' +
      '--vpg-shimmer:#f4f4f7;' +
      '--vpg-radius:12px;' +
      '--vpg-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vpg[data-theme=dark]{' +
      '--vpg-accent:#7b7bea;' +
      '--vpg-success:#4ccb8f;' +
      '--vpg-bg:#1b1d24;' +
      '--vpg-text:#e9eaf0;' +
      '--vpg-muted:#989aa6;' +
      '--vpg-faint:#31343f;' +
      '--vpg-shimmer:#3d4250;}' +
    '.vpg.SALT{box-sizing:border-box;font-family:var(--vpg-font);color:var(--vpg-text);}' +
    '.vpg.SALT *,.vpg.SALT *::before,.vpg.SALT *::after{box-sizing:border-box;}' +
    // Visually-hidden utility — accessible text for spinners (role=status).
    '.vpg.SALT .vpg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}' +
    /* ---- bar ---- */
    '.vpg.SALT.vpg-bar{display:block;width:100%;}' +
    '.vpg.SALT .vpg-top{display:flex;align-items:baseline;justify-content:space-between;' +
      'gap:12px;margin:0 0 6px;font-size:13px;line-height:1.4;}' +
    '.vpg.SALT .vpg-labeltext{font-weight:500;color:var(--vpg-text);min-width:0;' +
      'overflow-wrap:break-word;}' +
    '.vpg.SALT .vpg-value{flex:none;color:var(--vpg-muted);font-variant-numeric:tabular-nums;}' +
    '.vpg.SALT .vpg-track{position:relative;height:8px;border-radius:999px;' +
      'background:var(--vpg-faint);overflow:hidden;}' +
    '.vpg.SALT.vpg-sm .vpg-track{height:5px;}' +
    '.vpg.SALT .vpg-fill{position:absolute;top:0;left:0;bottom:0;width:0;' +
      'border-radius:inherit;background:var(--vpg-accent);' +
      'transition:width .25s ease,background-color .2s ease;}' +
    '.vpg.SALT.vpg-success .vpg-fill{background:var(--vpg-success);}' +
    // Indeterminate: a 38%-wide segment sweeps left → right forever.
    '.vpg.SALT.vpg-ind .vpg-fill{width:38%;animation:vpg-sweep 1.1s ease-in-out infinite;}' +
    '@keyframes vpg-sweep{0%{transform:translateX(-110%);}100%{transform:translateX(290%);}}' +
    /* ---- spinner ---- */
    '.vpg.SALT.vpg-spinner{display:inline-flex;align-items:center;justify-content:center;' +
      'vertical-align:-.15em;line-height:0;color:var(--vpg-accent);}' +
    '.vpg.SALT.vpg-spinner.vpg-block{display:flex;}' +
    '.vpg.SALT.vpg-spinner svg{display:block;}' +
    '.vpg.SALT .vpg-spin{animation:vpg-spin .8s linear infinite;}' +
    '@keyframes vpg-spin{to{transform:rotate(360deg);}}' +
    /* ---- skeleton ---- */
    '.vpg.SALT.vpg-skeleton{display:flex;align-items:flex-start;gap:14px;width:100%;}' +
    '.vpg.SALT .vpg-avatar{flex:none;width:40px;height:40px;border-radius:50%;}' +
    '.vpg.SALT .vpg-lines{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;}' +
    '.vpg.SALT .vpg-line{border-radius:6px;}' +
    '.vpg.SALT .vpg-line,.vpg.SALT .vpg-avatar{' +
      'background:linear-gradient(90deg,var(--vpg-faint) 25%,var(--vpg-shimmer) 37%,' +
      'var(--vpg-faint) 63%);background-size:400% 100%;' +
      'animation:vpg-shimmer 1.4s ease infinite;}' +
    '@keyframes vpg-shimmer{0%{background-position:100% 50%;}100%{background-position:0 50%;}}' +
    // Reduced motion: every animation (shimmer, sweep, spin) is swapped for a
    // calm state — the indeterminate segment becomes a full-width bar, and
    // "activity" is conveyed by a slow opacity pulse instead of movement.
    '@media (prefers-reduced-motion:reduce){' +
      '.vpg.SALT .vpg-fill{transition:none;}' +
      '.vpg.SALT.vpg-ind .vpg-fill{width:100%;animation:vpg-fade 2.4s ease-in-out infinite;}' +
      '.vpg.SALT .vpg-spin{animation:vpg-fade 2.4s ease-in-out infinite;}' +
      '.vpg.SALT .vpg-line,.vpg.SALT .vpg-avatar{background:var(--vpg-faint);' +
        'animation:vpg-fade 2.4s ease-in-out infinite;}' +
    '}' +
    '@keyframes vpg-fade{0%,100%{opacity:1;}50%{opacity:.55;}}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set Progress.salt to your own token / false
  // BEFORE the first render.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Progress.salt;
    if (s === false) return '';
    s = s == null ? DEFAULT_SALT : String(s).replace(/[^\w-]/g, '');
    return s || DEFAULT_SALT;
  }

  function saltClass() {
    var s = saltToken();
    return s ? ' ' + s : '';
  }

  function renderCss() {
    return CSS.split('.SALT').join(saltToken() ? '.' + saltToken() : '');
  }

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var watching = false;
  var liveRoots = []; // every mounted .vpg root; re-stamped on theme flips

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveTheme() {
    var t = Progress.defaults.theme;
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
    for (var i = 0; i < liveRoots.length; i++) liveRoots[i].setAttribute('data-theme', t);
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

  function mountRoot(el) {
    el.setAttribute('data-theme', resolveTheme());
    liveRoots.push(el);
    ensureThemeWatch();
  }

  function unmountRoot(el) {
    var i = liveRoots.indexOf(el);
    if (i !== -1) liveRoots.splice(i, 1);
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  /* ------------------------------------------------------------------ *
   * Shared plumbing.
   * ------------------------------------------------------------------ */

  function ensureStyles(opts) {
    if (opts.styles === false) return;
    if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
    else injectOwnStyles();
  }

  function injectOwnStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  function resolveTarget(t) {
    if (!HAS_DOM || t == null) return null;
    if (typeof t === 'string') return document.querySelector(t);
    return t.appendChild ? t : null;
  }

  function mergedOpts(opts) {
    var out = {}, k;
    for (k in Progress.defaults) if (k !== 'labels') out[k] = Progress.defaults[k];
    if (opts) for (k in opts) if (opts[k] !== undefined) out[k] = opts[k];
    return out;
  }

  // The SVG arc spinner (same arc as Toast's loading icon), sized per call.
  function spinnerSvg(size) {
    return '<svg class="vpg-spin" width="' + size + '" height="' + size + '"' +
      ' viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M14.25 8A6.25 6.25 0 1 1 8 1.75" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round"/></svg>';
  }

  /* ---- SSR / bad-target no-op handles — every method is safe to call ---- */

  var dummyBar = {
    el: null,
    set: function () { return dummyBar; },
    done: function () { return dummyBar; },
    setLabel: function () { return dummyBar; },
    remove: function () {}
  };
  var dummySpinner = { el: null, remove: function () {} };
  var dummySkeleton = { el: null, release: function () {} };

  /* ------------------------------------------------------------------ *
   * Public API.
   * ------------------------------------------------------------------ */

  var Progress = {};

  Progress.version = '1.0.0';
  Progress.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Progress, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Progress.css = renderCss();
  }

  Progress.defaults = {
    // bar
    value: 0,
    max: 100,
    indeterminate: false,
    label: '',              // visible text above the bar (textContent — never HTML)
    showValue: false,       // '42%' at the right of the label row
    size: 'md',             // 'sm' | 'md'
    color: 'accent',        // 'accent' | 'success'
    autoRemove: false,      // done(): true → remove after 800ms; number → custom ms
    // spinner
    spinnerSize: 20,        // px
    inline: true,           // false renders as a block
    // skeleton
    lines: 3,
    avatar: false,          // leading 40px circle
    header: false,          // taller first line
    widths: null,           // array of CSS widths per line; default staggered
    height: 12,             // px per line
    // shared
    styles: true,           // false = headless, no CSS ever injected
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    labels: { loading: 'Loading…' }
  };

  /* ---- Progress.bar(target, opts) ---- */

  Progress.bar = function (target, opts) {
    var host = resolveTarget(target);
    if (!HAS_DOM || !host) return dummyBar;
    opts = mergedOpts(opts);
    ensureStyles(opts);

    var max = +opts.max > 0 ? +opts.max : 100;
    var root = document.createElement('div');
    root.className = 'vpg vpg-bar' +
      (opts.size === 'sm' ? ' vpg-sm' : '') +
      (opts.color === 'success' ? ' vpg-success' : '') +
      (opts.indeterminate ? ' vpg-ind' : '') + saltClass();

    var top = null, labelEl = null, valueEl = null;
    function ensureTop() {
      if (top) return;
      top = document.createElement('div');
      top.className = 'vpg-top';
      root.insertBefore(top, root.firstChild);
      labelEl = document.createElement('span');
      labelEl.className = 'vpg-labeltext';
      top.appendChild(labelEl);
    }

    var track = document.createElement('div');
    track.className = 'vpg-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(max));
    track.setAttribute('aria-label',
      opts.label ? String(opts.label) : Progress.defaults.labels.loading);
    var fill = document.createElement('div');
    fill.className = 'vpg-fill';
    track.appendChild(fill);
    root.appendChild(track);

    if (opts.label) { ensureTop(); labelEl.textContent = String(opts.label); }
    if (opts.showValue) {
      ensureTop();
      valueEl = document.createElement('span');
      valueEl.className = 'vpg-value';
      top.appendChild(valueEl);
    }

    var removed = false;
    var indeterminate = !!opts.indeterminate;

    function render(v) {
      v = +v || 0;
      if (v < 0) v = 0;
      if (v > max) v = max;
      var pct = (v / max) * 100;
      fill.style.width = pct + '%';
      // aria-valuenow is OMITTED while indeterminate (per the ARIA spec).
      track.setAttribute('aria-valuenow', String(v));
      if (valueEl) valueEl.textContent = Math.round(pct) + '%';
      return v;
    }

    if (!indeterminate) render(opts.value);

    var handle = {
      el: root,
      set: function (v) {
        if (removed) return handle;
        if (indeterminate) { // set() promotes to determinate
          indeterminate = false;
          root.classList.remove('vpg-ind');
        }
        render(v);
        return handle;
      },
      done: function () {
        if (removed) return handle;
        indeterminate = false;
        root.classList.remove('vpg-ind');
        root.classList.add('vpg-success');
        render(max);
        if (opts.autoRemove) {
          var delay = typeof opts.autoRemove === 'number' ? opts.autoRemove : 800;
          setTimeout(handle.remove, delay);
        }
        return handle;
      },
      setLabel: function (text) {
        if (removed) return handle;
        ensureTop();
        labelEl.textContent = text == null ? '' : String(text);
        track.setAttribute('aria-label',
          labelEl.textContent || Progress.defaults.labels.loading);
        return handle;
      },
      remove: function () {
        if (removed) return;
        removed = true;
        unmountRoot(root);
      }
    };

    mountRoot(root);
    host.appendChild(root);
    return handle;
  };

  /* ---- Progress.spinner(target, opts) ---- */

  Progress.spinner = function (target, opts) {
    var host = resolveTarget(target);
    if (!HAS_DOM || !host) return dummySpinner;
    opts = mergedOpts(opts);
    ensureStyles(opts);

    // `size` doubles as the bar's 'sm'|'md' in shared defaults — for the
    // spinner it means pixels, so only a numeric value applies here.
    var size = parseInt(+opts.size > 0 ? opts.size : opts.spinnerSize, 10);
    if (!(size > 0)) size = 20;

    var root = document.createElement('span');
    root.className = 'vpg vpg-spinner' +
      (opts.inline === false ? ' vpg-block' : '') + saltClass();
    root.setAttribute('role', 'status'); // polite live region
    root.innerHTML = spinnerSvg(size);   // static, trusted markup

    // Screen readers get text; sighted users get the arc.
    var sr = document.createElement('span');
    sr.className = 'vpg-sr';
    sr.textContent = String(opts.label || Progress.defaults.labels.loading);
    root.appendChild(sr);

    var removed = false;
    var handle = {
      el: root,
      remove: function () {
        if (removed) return;
        removed = true;
        unmountRoot(root);
      }
    };

    mountRoot(root);
    host.appendChild(root);
    return handle;
  };

  /* ---- Progress.skeleton(target, opts) ---- */

  // Live skeletons, keyed by target — so release() can restore, and a second
  // skeleton() call on the same target is idempotent.
  var skeletons = [];

  function findSkeleton(target) {
    for (var i = 0; i < skeletons.length; i++) {
      if (skeletons[i].target === target) return skeletons[i];
    }
    return null;
  }

  function defaultWidth(i, n) {
    if (n > 1 && i === n - 1) return '60%'; // short last line reads "paragraph"
    return i % 2 === 1 ? '85%' : '100%';
  }

  Progress.skeleton = function (target, opts) {
    var host = resolveTarget(target);
    if (!HAS_DOM || !host) return dummySkeleton;
    var existing = findSkeleton(host);
    if (existing) return existing.handle;
    opts = mergedOpts(opts);
    ensureStyles(opts);

    // Hide (don't remove) the target's element children so release() can
    // restore them exactly — each prior inline display value is recorded.
    var hidden = [];
    for (var c = 0; c < host.children.length; c++) {
      var kid = host.children[c];
      hidden.push({ el: kid, display: kid.style.display || '' });
      kid.style.display = 'none';
    }
    var prevBusy = host.getAttribute('aria-busy');
    host.setAttribute('aria-busy', 'true');

    var root = document.createElement('div');
    root.className = 'vpg vpg-skeleton' + saltClass();
    root.setAttribute('aria-hidden', 'true'); // decorative; aria-busy speaks

    if (opts.avatar) {
      var av = document.createElement('div');
      av.className = 'vpg-avatar';
      root.appendChild(av);
    }
    var lines = parseInt(opts.lines, 10);
    if (!(lines > 0)) lines = 3;
    var h = parseInt(opts.height, 10);
    if (!(h > 0)) h = 12;
    var col = document.createElement('div');
    col.className = 'vpg-lines';
    for (var i = 0; i < lines; i++) {
      var line = document.createElement('div');
      line.className = 'vpg-line' + (opts.header && i === 0 ? ' vpg-head' : '');
      line.style.height = (opts.header && i === 0 ? Math.round(h * 1.5) : h) + 'px';
      line.style.width = (opts.widths && opts.widths[i]) || defaultWidth(i, lines);
      col.appendChild(line);
    }
    root.appendChild(col);

    var record = { target: host, handle: null };
    record.handle = {
      el: root,
      release: function () {
        var idx = skeletons.indexOf(record);
        if (idx === -1) return; // already released
        skeletons.splice(idx, 1);
        unmountRoot(root);
        for (var j = 0; j < hidden.length; j++) {
          hidden[j].el.style.display = hidden[j].display;
        }
        if (prevBusy == null) host.removeAttribute('aria-busy');
        else host.setAttribute('aria-busy', prevBusy);
      }
    };
    skeletons.push(record);

    mountRoot(root);
    host.appendChild(root);
    return record.handle;
  };

  // Static form: Progress.skeleton.release(target) — release without a handle.
  Progress.skeleton.release = function (target) {
    var host = resolveTarget(target);
    var record = host && findSkeleton(host);
    if (record) record.handle.release();
  };

  /* ------------------------------------------------------------------ *
   * Declarative init — [data-vpg="bar"|"spinner"|"skeleton"] with
   * data-vpg-* modifiers; the element is the target container.
   * ------------------------------------------------------------------ */

  function attr(el, name) { return el.getAttribute('data-vpg-' + name); }
  function boolAttr(el, name) {
    var v = attr(el, name);
    return v != null && v !== 'false';
  }

  function dataOptions(el, kind) {
    var o = {}, v;
    if ((v = attr(el, 'label')) != null) o.label = v;
    if ((v = attr(el, 'theme'))) o.theme = v;
    if (kind === 'bar') {
      if ((v = attr(el, 'value')) != null && v !== '') o.value = +v;
      if ((v = attr(el, 'max')) != null && v !== '') o.max = +v;
      if ((v = attr(el, 'size'))) o.size = v;
      if ((v = attr(el, 'color'))) o.color = v;
      if (attr(el, 'indeterminate') != null) o.indeterminate = boolAttr(el, 'indeterminate');
      if (attr(el, 'show-value') != null) o.showValue = boolAttr(el, 'show-value');
    } else if (kind === 'spinner') {
      if ((v = attr(el, 'size')) != null && v !== '') o.spinnerSize = +v;
      if (attr(el, 'inline') != null) o.inline = boolAttr(el, 'inline');
    } else if (kind === 'skeleton') {
      if ((v = attr(el, 'lines')) != null && v !== '') o.lines = +v;
      if ((v = attr(el, 'height')) != null && v !== '') o.height = +v;
      if (attr(el, 'avatar') != null) o.avatar = boolAttr(el, 'avatar');
      if (attr(el, 'header') != null) o.header = boolAttr(el, 'header');
      if ((v = attr(el, 'widths'))) o.widths = v.split(',');
    }
    return o;
  }

  Progress.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vpg]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-vpg-ready')) continue;
      var kind = el.getAttribute('data-vpg');
      try {
        var handle = null;
        if (kind === 'bar') handle = Progress.bar(el, dataOptions(el, 'bar'));
        else if (kind === 'spinner') handle = Progress.spinner(el, dataOptions(el, 'spinner'));
        else if (kind === 'skeleton') handle = Progress.skeleton(el, dataOptions(el, 'skeleton'));
        if (handle) {
          el.setAttribute('data-vpg-ready', 'true');
          created.push(handle);
        }
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Progress auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Progress.autoInit(); });
    } else {
      Progress.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Progress.displayName = 'Progress';
  Progress.rootClass = 'vpg';
  Progress.themeVars = {
    accent: '--vpg-accent',
    radius: '--vpg-radius',
    font: '--vpg-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Progress.varScopes = ['.vpg', '.vpg[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('progress', Progress);
  }

  return Progress;
});

}).call(__root);
var Progress = __root.Progress;
export { Progress };
export default Progress;
