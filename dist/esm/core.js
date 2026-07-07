/*! vanilla-ui-kit/core v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Core v1.0.0
 * The optional convergence layer for the Vanilla UI Kit family.
 * Browser globals: `VanillaUI`, with `VC` as the short alias.
 *
 * Every component in the family works standalone — load this file (or the
 * dist bundle) when you use several of them and want shared services:
 *
 *   VC.register(name, ctor)      component registry (VC.DatePicker, VC.Toast, …)
 *   VC.autoInit(root?)           run every component's data-attribute init
 *   VC.theme                     one theme engine for the whole page
 *   VC.position(panel, anchor)   shared popup placement (flip, clamp, <dialog>)
 *   VC.injectStyles(id, css)     deduped style injection, before page CSS
 *   VC.config({...})             one call to theme every registered component
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VanillaUI = root.VC = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';

  var VC = {
    version: '1.0.0',
    components: {}
  };

  /* ------------------------------------------------------------------ *
   * Styles — deduped by id, inserted before the page's own CSS so that
   * page rules of equal specificity win the cascade.
   * ------------------------------------------------------------------ */

  VC.injectStyles = function (id, css) {
    if (!HAS_DOM || document.getElementById(id)) return null;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
    return style;
  };

  /* ------------------------------------------------------------------ *
   * Theme engine — one matchMedia + one MutationObserver for the page,
   * shared by every component that watches for light/dark flips.
   * Resolution order: <html data-theme|data-bs-theme> → .dark/.light
   * class → prefers-color-scheme.
   * ------------------------------------------------------------------ */

  var themeMql = null;
  var themeObserver = null;
  var themeFns = [];

  function resolveTheme() {
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

  function notifyTheme() {
    var t = resolveTheme();
    for (var i = 0; i < themeFns.length; i++) themeFns[i](t);
  }

  VC.theme = {
    resolve: resolveTheme,

    watch: function (fn) {
      if (typeof fn !== 'function' || themeFns.indexOf(fn) !== -1) return VC.theme;
      themeFns.push(fn);
      if (themeFns.length === 1 && HAS_DOM) {
        if (window.matchMedia) {
          themeMql = themeMql || window.matchMedia('(prefers-color-scheme: dark)');
          if (themeMql.addEventListener) themeMql.addEventListener('change', notifyTheme);
          else if (themeMql.addListener) themeMql.addListener(notifyTheme);
        }
        if (typeof MutationObserver !== 'undefined') {
          themeObserver = new MutationObserver(notifyTheme);
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'data-bs-theme']
          });
        }
      }
      return VC.theme;
    },

    unwatch: function (fn) {
      var i = themeFns.indexOf(fn);
      if (i !== -1) themeFns.splice(i, 1);
      if (themeFns.length === 0) {
        if (themeMql) {
          if (themeMql.removeEventListener) themeMql.removeEventListener('change', notifyTheme);
          else if (themeMql.removeListener) themeMql.removeListener(notifyTheme);
        }
        if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
      }
      return VC.theme;
    },

    // Pin the page theme ('light'|'dark') or return to detection ('auto').
    // Components watch <html data-theme>, so this flips the whole family.
    set: function (t) {
      if (!HAS_DOM) return VC.theme;
      var de = document.documentElement;
      if (t === 'light' || t === 'dark') de.setAttribute('data-theme', t);
      else de.removeAttribute('data-theme');
      return VC.theme;
    }
  };

  /* ------------------------------------------------------------------ *
   * Popup positioning — below/above flip, viewport clamp, and native
   * <dialog> top-layer detection. Applies inline position styles and
   * returns what it decided so callers can set transform origins etc.
   * ------------------------------------------------------------------ */

  VC.position = function (panel, anchor, opts) {
    if (!HAS_DOM) return null;
    opts = opts || {};
    var r = anchor.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var gap = opts.gap != null ? opts.gap : 6;
    var pad = opts.pad != null ? opts.pad : 8;

    var below = opts.prefer === 'below' ||
      (opts.prefer !== 'above' && (vh - r.bottom >= ph + gap || r.top < ph + gap));
    var top = below ? r.bottom + gap : r.top - ph - gap;
    var left = Math.min(Math.max(pad, r.left), Math.max(pad, vw - pw - pad));

    // Inside an open <dialog> the panel must ride in the top layer with the
    // dialog (fixed, viewport coordinates); otherwise absolute in the page.
    var fixed = !!(anchor.closest && anchor.closest('dialog'));
    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';

    return { below: below, fixed: fixed, anchorRect: r, left: left, top: top };
  };

  /* ------------------------------------------------------------------ *
   * Registry + unified theming bridge.
   *
   * The convergence contract: a component exposes
   *   Ctor.rootClass  — its CSS scope class ('vdp', 'vt', …)
   *   Ctor.themeVars  — { accent: '--vdp-accent', radius: …, font: … }
   *   Ctor.autoInit   — optional fn(root) for data-attribute init
   *   Ctor.css        — its stylesheet string (for headless / extraction)
   * and self-registers when VC is present. Core also adopts known globals
   * that loaded before it, so load order never matters.
   * ------------------------------------------------------------------ */

  var configState = {};

  function pascal(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  VC.register = function (name, ctor) {
    if (!name || !ctor) return VC;
    VC.components[name] = ctor;
    VC[ctor.displayName || (typeof ctor === 'function' && ctor.name) || pascal(name)] = ctor;
    // A family-wide salt set before this component loaded still applies to it.
    if (configState.salt !== undefined) ctor.salt = configState.salt;
    applyBridge();
    return VC;
  };

  VC.autoInit = function (rootEl) {
    var created = [];
    for (var name in VC.components) {
      var c = VC.components[name];
      if (typeof c.autoInit === 'function') {
        created = created.concat(c.autoInit(rootEl) || []);
      }
    }
    return created;
  };

  // VC.config({ theme, accent, radius, font, salt }) — one call, every
  // component. `theme` stamps <html data-theme>; `salt` sets every
  // component's CSS isolation namespace (set it BEFORE first render — styles
  // inject once); the visual keys are mapped onto each registered component's
  // own CSS variables via a single bridge stylesheet appended to the END of
  // <head> so it outranks the components' defaults (same specificity, later
  // source order). Per-instance options still win — they are inline styles.
  VC.config = function (opts) {
    if (!opts) return configState;
    for (var k in opts) configState[k] = opts[k];
    if ('theme' in opts) VC.theme.set(opts.theme);
    if ('salt' in opts) {
      for (var name in VC.components) VC.components[name].salt = opts.salt;
    }
    applyBridge();
    return VC;
  };

  function applyBridge() {
    if (!HAS_DOM) return;
    var css = '';
    for (var name in VC.components) {
      var c = VC.components[name];
      if (!c.rootClass || !c.themeVars) continue;
      var decl = '';
      for (var key in c.themeVars) {
        if (configState[key] != null) decl += c.themeVars[key] + ':' + configState[key] + ';';
      }
      // Write to every scope where the component defines its vars (light AND
      // dark), so a bridge accent isn't shadowed by the dark-theme defaults.
      var scopes = (c.varScopes && c.varScopes.length) ? c.varScopes : ['.' + c.rootClass];
      if (decl) css += scopes.join(',') + '{' + decl + '}';
    }
    var el = document.getElementById('vc-bridge-styles');
    if (!css) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = 'vc-bridge-styles';
      document.head.appendChild(el);
    } else if (el !== document.head.lastElementChild) {
      document.head.appendChild(el); // keep it last so it keeps winning
    }
    el.textContent = css;
  }

  // Adopt family globals that loaded before core did.
  if (HAS_DOM) {
    var KNOWN = {
      datepicker: 'DatePicker',
      toast: 'Toast',
      select: 'Select',
      modal: 'Modal',
      tooltip: 'Tooltip',
      autocomplete: 'Autocomplete'
    };
    for (var key in KNOWN) {
      if (window[KNOWN[key]] && !VC.components[key]) VC.register(key, window[KNOWN[key]]);
    }
  }

  return VC;
});

}).call(__root);
var VC = __root.VC;
var VanillaUI = __root.VanillaUI;
export { VC, VanillaUI };
export default VC;
