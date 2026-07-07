/*!
 * Vanilla UI Kit EmptyState v1.0.0
 * A single-file, zero-dependency empty-state / placeholder block for
 * vanilla JS. Part of the Vanilla UI Kit family — standalone, or
 * converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="empty.js"></script>
 *   <script>
 *     EmptyState.render('#list', {
 *       icon: 'inbox', title: 'No messages',
 *       description: 'Anything sent to you lands here.',
 *       action: { label: 'Compose', onClick: compose }
 *     })
 *   </script>
 *
 * Or zero-JS:
 *   <div data-ves data-ves-icon="search" data-ves-title="No results"></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EmptyState = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-empty-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `EmptyState.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when EmptyState.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the block; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.ves{--ves-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.ves{' +
      '--ves-accent:#5b5bd6;' +
      '--ves-text:#1c1d21;' +
      '--ves-muted:#72747e;' +
      '--ves-faint:#e7e7ec;' +
      '--ves-circle:#f2f2f5;' +
      '--ves-on-accent:#ffffff;' +
      '--ves-radius:10px;' +
      '--ves-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.ves[data-theme=dark]{' +
      '--ves-accent:#7b7bea;' +
      '--ves-text:#e9eaf0;' +
      '--ves-muted:#989aa6;' +
      '--ves-faint:#31343f;' +
      '--ves-circle:#272a33;' +
      '--ves-on-accent:#16171c;}' +
    '.ves.SALT{display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'text-align:center;padding:56px 24px;box-sizing:border-box;' +
      'font-family:var(--ves-font);color:var(--ves-text);}' +
    '.ves.SALT *,.ves.SALT *::before,.ves.SALT *::after{box-sizing:border-box;}' +
    /* muted illustration circle behind the icon */
    '.ves.SALT .ves-art{flex:none;width:72px;height:72px;border-radius:50%;' +
      'background:var(--ves-circle);color:var(--ves-muted);' +
      'display:flex;align-items:center;justify-content:center;}' +
    '.ves.SALT .ves-art svg{display:block;width:32px;height:32px;}' +
    '.ves.SALT .ves-title{font-size:16px;font-weight:650;line-height:1.4;margin:20px 0 0;' +
      'overflow-wrap:break-word;max-width:100%;}' +
    '.ves.SALT .ves-desc{font-size:14px;line-height:1.55;color:var(--ves-muted);' +
      'margin:6px 0 0;max-width:46ch;overflow-wrap:break-word;}' +
    '.ves.SALT .ves-actions{display:flex;flex-wrap:wrap;align-items:center;' +
      'justify-content:center;gap:10px;margin-top:22px;}' +
    '.ves.SALT .ves-action{font:inherit;font-family:var(--ves-font);font-size:14px;' +
      'font-weight:600;line-height:1;color:var(--ves-on-accent);background:var(--ves-accent);' +
      'border:0;border-radius:var(--ves-radius);padding:10px 18px;margin:0;cursor:pointer;' +
      'transition:opacity .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.ves.SALT .ves-action:hover{opacity:.88;}' +
    '.ves.SALT .ves-action-quiet{font:inherit;font-family:var(--ves-font);font-size:14px;' +
      'font-weight:600;line-height:1;color:var(--ves-accent);background:none;border:0;' +
      'border-radius:var(--ves-radius);padding:10px 12px;margin:0;cursor:pointer;' +
      'transition:background .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.ves.SALT .ves-action-quiet:hover{background:var(--ves-faint);}' +
    '.ves.SALT .ves-action:focus,.ves.SALT .ves-action-quiet:focus{outline:none;}' +
    '.ves.SALT .ves-action:focus-visible,.ves.SALT .ves-action-quiet:focus-visible{' +
      'outline:2px solid var(--ves-accent);outline-offset:2px;}' +
    /* sm — tighter paddings for cards, table bodies, sidebars */
    '.ves.SALT.ves-sm{padding:32px 16px;}' +
    '.ves.SALT.ves-sm .ves-art{width:56px;height:56px;}' +
    '.ves.SALT.ves-sm .ves-art svg{width:26px;height:26px;}' +
    '.ves.SALT.ves-sm .ves-title{font-size:15px;margin-top:14px;}' +
    '.ves.SALT.ves-sm .ves-desc{font-size:13.5px;}' +
    '.ves.SALT.ves-sm .ves-actions{margin-top:16px;}' +
    '.ves.SALT.ves-sm .ves-action{padding:8px 14px;}' +
    '.ves.SALT.ves-sm .ves-action-quiet{padding:8px 10px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.ves.SALT .ves-action,.ves.SALT .ves-action-quiet{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set EmptyState.salt to your own token / false
  // BEFORE the first render.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = EmptyState.salt;
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
    // Insert before the page's own CSS so `.ves { --ves-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  // Built-in illustrations — the family's 1.5px-stroke line style (same
  // hand as the Toast icons), drawn on a 24 grid, sized by CSS.
  var ICONS = {
    inbox: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M3.75 13.25 5.8 6.1a1.5 1.5 0 0 1 1.44-1.1h9.52a1.5 1.5 0 0 1 1.44 1.1' +
      'l2.05 7.15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"' +
      ' stroke-linejoin="round"/>' +
      '<path d="M3.75 13.25h4.9l1.1 2.25h4.5l1.1-2.25h4.9v4.25a1.5 1.5 0 0 1-1.5 1.5' +
      'H5.25a1.5 1.5 0 0 1-1.5-1.5v-4.25Z" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linejoin="round"/></svg>',
    search: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="6.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="m15.7 15.7 4.55 4.55" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/>' +
      '<path d="M8.4 11a2.6 2.6 0 0 1 2.6-2.6" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>',
    error: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M12 8v4.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="12" cy="15.9" r=".95" fill="currentColor"/></svg>',
    folder: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M3.75 6.75A1.5 1.5 0 0 1 5.25 5.25h4l2 2.5h7.5a1.5 1.5 0 0 1 1.5 1.5v8' +
      'a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-10.5Z" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M3.75 10.25h16.5" stroke="currentColor" stroke-width="1.5"/></svg>'
  };

  // 'inbox' | 'search' | 'error' | 'folder', or a TRUSTED inline-SVG string
  // (anything starting with '<' is used verbatim — never pass user input).
  function iconMarkup(icon) {
    if (typeof icon === 'string' && icon.charAt(0) === '<') return icon;
    return ICONS[icon] || ICONS.inbox;
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

  function watchAutoTheme(state) {
    if (autoThemed.indexOf(state) !== -1) return;
    autoThemed.push(state);
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

  function unwatchAutoTheme(state) {
    var i = autoThemed.indexOf(state);
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

  var DEFAULTS = {
    icon: 'inbox',         // 'inbox' | 'search' | 'error' | 'folder' | trusted SVG string
    title: '',             // TEXT (rendered with textContent)
    description: '',       // TEXT by default; `html: true` opts in to markup
    html: false,           // applies to `description` only
    action: null,          // {label, onClick} → accent button (or an adopted element)
    secondaryAction: null, // {label, onClick} → quiet link-button
    size: 'md',            // 'sm' | 'md'
    theme: 'auto',         // 'auto' | 'light' | 'dark'
    styles: true           // false = headless: no CSS injected, style .ves-* yourself
  };

  function mergeOptions(base, options) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    if (options) for (k in options) if (options[k] !== undefined) out[k] = options[k];
    return out;
  }

  // SSR: rendering without a DOM yields an inert handle.
  var dummyHandle = {
    el: null,
    update: function () { return dummyHandle; },
    remove: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * Rendering. The handle owns one .ves root; update() rebuilds its
   * content in place, remove() takes it back out (returning any adopted
   * declarative action button to the host element).
   * ------------------------------------------------------------------ */

  function buildContent(state) {
    var opts = state.opts;
    var el = state.el;
    var s = saltToken();
    el.className = 'ves ves-' + (opts.size === 'sm' ? 'sm' : 'md') + (s ? ' ' + s : '');
    el.innerHTML = '';

    var art = document.createElement('div');
    art.className = 'ves-art';
    art.setAttribute('aria-hidden', 'true'); // decorative — title carries meaning
    art.innerHTML = iconMarkup(opts.icon);
    el.appendChild(art);

    if (opts.title) {
      var title = document.createElement('div');
      title.className = 'ves-title';
      title.textContent = String(opts.title);
      el.appendChild(title);
    }

    if (opts.description) {
      var desc = document.createElement('div');
      desc.className = 'ves-desc';
      if (opts.html) desc.innerHTML = String(opts.description);
      else desc.textContent = String(opts.description);
      el.appendChild(desc);
    }

    var act = opts.action, sec = opts.secondaryAction;
    var adopted = act && act.nodeType === 1 ? act : null;
    if (adopted || (act && act.label) || (sec && sec.label)) {
      var row = document.createElement('div');
      row.className = 'ves-actions';
      if (adopted) {
        // Declarative <button data-ves-action> keeps its own listeners.
        adopted.classList.add('ves-action');
        if (adopted.tagName === 'BUTTON' && !adopted.getAttribute('type')) {
          adopted.setAttribute('type', 'button'); // never submit a surrounding form
        }
        row.appendChild(adopted);
      } else if (act && act.label) {
        row.appendChild(actionButton('ves-action', act, state));
      }
      if (sec && sec.label) {
        row.appendChild(actionButton('ves-action-quiet', sec, state));
      }
      el.appendChild(row);
    }
  }

  function actionButton(cls, spec, state) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.textContent = String(spec.label);
    btn.addEventListener('click', function () {
      if (spec.onClick) spec.onClick(state.handle);
    });
    return btn;
  }

  function applyTheme(state) {
    var t = state.opts.theme;
    var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    state.el.setAttribute('data-theme', resolved);
  }

  /* ------------------------------------------------------------------ *
   * EmptyState. `new EmptyState(target, opts)` is an alias of
   * EmptyState.render — both return the same plain handle, so the family
   * create/get contract holds.
   * ------------------------------------------------------------------ */

  function EmptyState(target, options) {
    return EmptyState.render(target, options);
  }

  EmptyState.render = function (target, options) {
    if (!HAS_DOM) return dummyHandle;
    var host = resolveElement(target);
    if (!host) throw new Error('EmptyState: target element not found: ' + target);

    var existing = instances && instances.get(host);
    if (existing) existing.remove();

    var opts = mergeOptions(DEFAULTS, options);
    if (opts.styles !== false) injectStyles();

    var state = {
      host: host,
      el: document.createElement('div'),
      opts: opts,
      _applyTheme: function () { applyTheme(state); }
    };

    var handle = {
      el: state.el,

      // update({description: '…'}) — merge and re-render in place.
      update: function (next) {
        state.opts = mergeOptions(state.opts, next);
        buildContent(state);
        applyTheme(state);
        return handle;
      },

      remove: function () {
        unwatchAutoTheme(state);
        // Give an adopted declarative button back to the host element.
        var act = state.opts.action;
        if (act && act.nodeType === 1) {
          act.classList.remove('ves-action');
          host.appendChild(act);
        }
        if (state.el.parentNode) state.el.parentNode.removeChild(state.el);
        if (instances) {
          instances.delete(host);
          instances.delete(state.el);
        }
        return handle;
      }
    };
    state.handle = handle;

    buildContent(state);
    applyTheme(state);
    if (opts.theme === 'auto') watchAutoTheme(state);
    host.appendChild(state.el);
    if (instances) {
      instances.set(host, handle);     // get(target) …
      instances.set(state.el, handle); // … and get(handle.el) both work
    }
    return handle;
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  EmptyState.version = VERSION;
  EmptyState.defaults = DEFAULTS;

  EmptyState.create = function (target, options) {
    return EmptyState.render(target, options);
  };

  EmptyState.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  // Declarative form:
  //   <div data-ves data-ves-icon="search" data-ves-title="No results"
  //        data-ves-description="Try another term.">
  //     <button data-ves-action onclick="reset()">Clear filters</button>
  //   </div>
  function dataOptions(el) {
    var o = {};
    var v = el.getAttribute('data-ves-icon');
    if (v) o.icon = v;
    v = el.getAttribute('data-ves-title');
    if (v != null) o.title = v;
    v = el.getAttribute('data-ves-description');
    if (v != null) o.description = v;
    v = el.getAttribute('data-ves-size');
    if (v) o.size = v;
    if (el.dataset) {
      if (el.dataset.theme) o.theme = el.dataset.theme;
      if (el.dataset.styles != null) o.styles = parseBool(el.dataset.styles);
    }
    var btn = el.querySelector('[data-ves-action]');
    if (btn) o.action = btn; // adopted as the accent button, listeners intact
    return o;
  }

  EmptyState.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-ves]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(EmptyState.render(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('EmptyState auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { EmptyState.autoInit(); });
    } else {
      EmptyState.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  EmptyState.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(EmptyState, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    EmptyState.css = renderCss();
  }
  EmptyState.displayName = 'EmptyState';
  EmptyState.rootClass = 'ves';
  EmptyState.themeVars = {
    accent: '--ves-accent',
    radius: '--ves-radius',
    font: '--ves-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  EmptyState.varScopes = ['.ves', '.ves[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('empty', EmptyState);
  }

  return EmptyState;
});
