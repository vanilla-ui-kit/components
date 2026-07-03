/*!
 * vanilla-ui-kit v1.0.0 — single-file, zero-dependency UI components
 * Bundle of: core/core.js, datepicker/datepicker.js, toast/toast.js
 * https://github.com/abdallahk/vanilla-components
 * License: MIT
 */
(function (global, cjsModule) {
var define, module, exports;
/* ==== core/core.js ==== */
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

/* ==== datepicker/datepicker.js ==== */
/*!
 * Vanilla UI Kit DatePicker v1.0.0
 * A single-file, zero-dependency date picker for vanilla JS.
 * https://github.com/abdallahk/vanilla-components
 *
 * Quick start:
 *   <script src="datepicker.js"></script>
 *   <input id="date">
 *   <script>new DatePicker('#date')</script>
 *
 * Or zero-JS:
 *   <input data-datepicker data-format="DD/MM/YYYY" data-min="today">
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DatePicker = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-datepicker-styles';
  var TOKEN_RE = /YYYY|YY|MMMM|MMM|MM|M|DD|D/g;
  var ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Date utilities — all date-only, local time at midnight.
   * ------------------------------------------------------------------ */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function today() {
    return stripTime(new Date());
  }

  function sameDay(a, b) {
    return !!a && !!b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function addMonths(d, n) {
    var y = d.getFullYear();
    var m = d.getMonth() + n;
    var day = Math.min(d.getDate(), daysInMonth(y, m));
    return new Date(y, m, day);
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function keyToDate(key) {
    var m = ISO_RE.exec(key);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  // ISO-8601 week number (week containing the year's first Thursday is week 1).
  function isoWeek(date) {
    var d = stripTime(date);
    var day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day + 3); // Thursday of this week
    var firstThu = new Date(d.getFullYear(), 0, 4);
    var fday = (firstThu.getDay() + 6) % 7;
    firstThu.setDate(firstThu.getDate() - fday + 3);
    return 1 + Math.round((d - firstThu) / 604800000);
  }

  /* ------------------------------------------------------------------ *
   * Locale data via Intl, memoized per locale tag.
   * ------------------------------------------------------------------ */

  var localeCache = {};

  function getLocaleData(locale) {
    var tag = locale || (HAS_DOM && navigator.language) || 'en';
    if (localeCache[tag]) return localeCache[tag];

    var months = [], monthsShort = [], weekdaysShort = [], weekdaysLong = [];
    var mLong, mShort, wShort, wLong;
    try {
      mLong = new Intl.DateTimeFormat(tag, { month: 'long' });
      mShort = new Intl.DateTimeFormat(tag, { month: 'short' });
      wShort = new Intl.DateTimeFormat(tag, { weekday: 'short' });
      wLong = new Intl.DateTimeFormat(tag, { weekday: 'long' });
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('DatePicker: invalid locale "' + tag + '", falling back to the browser locale');
      }
      return getLocaleData(locale ? null : 'en');
    }
    var i, d;
    for (i = 0; i < 12; i++) {
      d = new Date(2024, i, 1);
      months.push(mLong.format(d));
      monthsShort.push(mShort.format(d));
    }
    // 2024-01-07 is a Sunday; index 0 = Sunday … 6 = Saturday.
    for (i = 0; i < 7; i++) {
      d = new Date(2024, 0, 7 + i);
      weekdaysShort.push(wShort.format(d));
      weekdaysLong.push(wLong.format(d));
    }

    var firstDay = 0;
    try {
      var lo = new Intl.Locale(tag);
      var wi = typeof lo.getWeekInfo === 'function' ? lo.getWeekInfo() : lo.weekInfo;
      if (wi && wi.firstDay != null) firstDay = wi.firstDay % 7; // spec: 1=Mon … 7=Sun
    } catch (e) { /* invalid tag or no weekInfo support — keep Sunday */ }

    var data = {
      tag: tag,
      months: months,
      monthsShort: monthsShort,
      weekdaysShort: weekdaysShort,
      weekdaysLong: weekdaysLong,
      firstDay: firstDay,
      full: new Intl.DateTimeFormat(tag, { dateStyle: 'full' })
    };
    localeCache[tag] = data;
    return data;
  }

  /* ------------------------------------------------------------------ *
   * Formatting and parsing.
   * ------------------------------------------------------------------ */

  function formatDate(date, format, L) {
    if (!isValidDate(date)) return '';
    var y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    return format.replace(TOKEN_RE, function (t) {
      switch (t) {
        case 'YYYY': return String(y);
        case 'YY': return pad2(y % 100);
        case 'MMMM': return L.months[m];
        case 'MMM': return L.monthsShort[m];
        case 'MM': return pad2(m + 1);
        case 'M': return String(m + 1);
        case 'DD': return pad2(d);
        case 'D': return String(d);
      }
    });
  }

  function reEscape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function nameIndex(names, value) {
    var v = value.toLowerCase();
    for (var i = 0; i < names.length; i++) {
      if (names[i].toLowerCase() === v) return i;
    }
    return -1;
  }

  // Split "start<sep>end" at the FIRST occurrence of the full separator only —
  // trimming the separator would split inside dates ('2026-01-05', 'October').
  function splitRange(text, separator) {
    var i = text.indexOf(separator);
    if (i === -1) return [text.trim(), null];
    return [text.slice(0, i).trim(), text.slice(i + separator.length).trim() || null];
  }

  function nameAlternation(names) {
    return names.slice()
      .sort(function (a, b) { return b.length - a.length; })
      .map(reEscape)
      .join('|');
  }

  function parseDate(str, format, L) {
    if (str == null || str === '') return null;
    str = String(str).trim();
    var tokens = [];
    // Adjacent numeric tokens (e.g. 'MMDDYYYY') are ambiguous with flexible
    // widths, so such formats parse with exact token widths instead.
    var strict = /(?:YYYY|YY|MMMM|MMM|MM|M|DD|D){2}/.test(format);
    var pattern = reEscape(format).replace(TOKEN_RE, function (t) {
      tokens.push(t);
      switch (t) {
        case 'YYYY': return '(\\d{4})';
        case 'YY': return '(\\d{2})';
        case 'MMMM': return '(' + nameAlternation(L.months) + ')';
        case 'MMM': return '(' + nameAlternation(L.monthsShort) + ')';
        case 'MM': case 'DD': return strict ? '(\\d{2})' : '(\\d{1,2})';
        default: return strict ? '(\\d{1})' : '(\\d{1,2})'; // M D
      }
    });
    var m = new RegExp('^' + pattern + '$', 'i').exec(str);
    if (!m) return null;

    var y = today().getFullYear(), mo = 0, d = 1;
    for (var i = 0; i < tokens.length; i++) {
      var v = m[i + 1];
      switch (tokens[i]) {
        case 'YYYY': y = +v; break;
        case 'YY': y = +v >= 69 ? 1900 + +v : 2000 + +v; break;
        case 'MMMM': mo = nameIndex(L.months, v); break;
        case 'MMM': mo = nameIndex(L.monthsShort, v); break;
        case 'MM': case 'M': mo = +v - 1; break;
        case 'DD': case 'D': d = +v; break;
      }
    }
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    var out = new Date(y, mo, d);
    // Reject rollovers like Feb 30 → Mar 2.
    if (out.getFullYear() !== y || out.getMonth() !== mo || out.getDate() !== d) return null;
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet, injected once.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when DatePicker.salt === false).
  // Structural rules carry the salt so selectors from other design systems
  // (global `button{}`, `.is-disabled{}`, …) cannot override the widget.
  // Custom-property DEFINITIONS stay unsalted at their documented specificity
  // so page overrides like `.vdp{--vdp-accent:…}` keep working — var names
  // are already namespaced, so they need no armor.
  var CSS = '' +
    '.vdp{' +
      '--vdp-accent:#5b5bd6;' +
      '--vdp-on-accent:#ffffff;' +
      '--vdp-bg:#ffffff;' +
      '--vdp-surface:#f2f2f5;' +
      '--vdp-text:#1c1d21;' +
      '--vdp-muted:#72747e;' +
      '--vdp-faint:#e7e7ec;' +
      '--vdp-accent-soft:rgba(91,91,214,.13);' +
      '--vdp-accent-mist:rgba(91,91,214,.07);' +
      '--vdp-shadow:0 14px 36px rgba(24,25,32,.16),0 3px 10px rgba(24,25,32,.08);' +
      '--vdp-radius:16px;' +
      '--vdp-cell:40px;' +
      '--vdp-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
      '--vdp-display-font:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;' +
    '}' +
    '.vdp.SALT{' +
      'position:absolute;z-index:99999;box-sizing:border-box;' +
      'display:flex;align-items:stretch;' +
      'background:var(--vdp-bg);color:var(--vdp-text);' +
      'font-family:var(--vdp-font);font-size:14px;line-height:1.15;' +
      'border:1px solid var(--vdp-faint);border-radius:var(--vdp-radius);' +
      'box-shadow:var(--vdp-shadow);padding:14px;width:max-content;' +
      '-webkit-user-select:none;user-select:none;' +
      'opacity:0;transform:scale(.96);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.2);' +
    '}' +
    '.vdp.SALT *,.vdp.SALT *::before,.vdp.SALT *::after{box-sizing:border-box;}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vdp{' +
      '--vdp-accent-soft:color-mix(in srgb,var(--vdp-accent) 14%,transparent);' +
      '--vdp-accent-mist:color-mix(in srgb,var(--vdp-accent) 7%,transparent);' +
    '}}' +
    '.vdp[data-theme=dark]{' +
      '--vdp-accent:#7b7bea;' +
      '--vdp-on-accent:#131418;' +
      '--vdp-bg:#1b1d24;' +
      '--vdp-surface:#272a33;' +
      '--vdp-text:#e9eaf0;' +
      '--vdp-muted:#989aa6;' +
      '--vdp-faint:#31343f;' +
      '--vdp-shadow:0 14px 36px rgba(0,0,0,.5),0 3px 10px rgba(0,0,0,.35);' +
    '}' +
    '.vdp.SALT.vdp-open{opacity:1;transform:none;}' +
    '.vdp.SALT.vdp-inline{position:static;display:inline-flex;opacity:1;transform:none;' +
      'box-shadow:none;transition:none;}' +
    /* :where() keeps the reset at minimal specificity within the component, and
       it must precede every component rule so those win on source order */
    '.vdp.SALT :where(button){font:inherit;color:inherit;background:none;border:0;margin:0;' +
      'padding:0;cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent;}' +
    '.vdp.SALT :where(button):focus{outline:none;}' +
    '.vdp.SALT :where(button):focus-visible{outline:2px solid var(--vdp-accent);outline-offset:2px;}' +
    '.vdp.SALT .vdp-main{min-width:0;}' +
    /* presets: full-height sidebar tied to the panel by a hairline, not a floating card */
    '.vdp.SALT .vdp-presets{display:flex;flex-direction:column;align-items:stretch;gap:2px;' +
      'padding:2px 14px 2px 2px;margin-right:16px;min-width:132px;align-self:stretch;' +
      'border-right:1px solid var(--vdp-faint);}' +
    '.vdp.SALT .vdp-presets-label{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vdp-muted);padding:8px 10px 10px;}' +
    '.vdp.SALT .vdp-preset{font-size:13px;text-align:left;padding:8px 10px;border-radius:8px;' +
      'white-space:nowrap;transition:background .1s ease;}' +
    '.vdp.SALT .vdp-preset:hover{background:var(--vdp-surface);}' +
    '.vdp.SALT .vdp-preset.is-active{color:var(--vdp-accent);font-weight:600;' +
      'background:var(--vdp-accent-soft);}' +
    '.vdp.SALT .vdp-body{display:flex;gap:18px;align-items:flex-start;}' +
    '.vdp.SALT .vdp-day.is-empty{pointer-events:none;}' +
    /* multi-pane: the masthead is a label, not a control — center it, drop affordance */
    '.vdp.SALT.vdp-multi .vdp-title{justify-content:center;cursor:default;}' +
    '.vdp.SALT.vdp-multi .vdp-title:hover{background:none;}' +
    /* header */
    '.vdp.SALT .vdp-header{display:flex;align-items:center;gap:4px;padding:2px 2px 10px;}' +
    '.vdp.SALT .vdp-title{flex:1;display:flex;align-items:baseline;gap:8px;padding:6px 8px;' +
      'text-align:left;min-width:0;transition:background .12s ease;}' +
    '.vdp.SALT .vdp-title:hover{background:var(--vdp-surface);}' +
    '.vdp.SALT .vdp-title-month{font-family:var(--vdp-display-font);font-size:22px;font-weight:600;' +
      'letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.vdp.SALT .vdp-title-year{font-size:14px;color:var(--vdp-muted);font-variant-numeric:tabular-nums;}' +
    '.vdp.SALT .vdp-nav{flex:none;width:34px;height:34px;display:grid;place-items:center;' +
      'color:var(--vdp-muted);transition:background .12s ease,color .12s ease;}' +
    '.vdp.SALT .vdp-nav:hover{background:var(--vdp-surface);color:var(--vdp-text);}' +
    '.vdp.SALT .vdp-nav[disabled]{opacity:.3;cursor:default;background:none;}' +
    '.vdp.SALT .vdp-nav svg{display:block;}' +
    /* day grid */
    /* rows are real grid containers (display:contents can drop row semantics from the a11y tree) */
    '.vdp.SALT .vdp-grid{display:block;}' +
    '.vdp.SALT .vdp-row{display:grid;grid-template-columns:repeat(7,var(--vdp-cell));column-gap:0;}' +
    '.vdp.SALT .vdp-row+.vdp-row{margin-top:2px;}' +
    '.vdp.SALT .vdp-grid.vdp-has-wn .vdp-row{grid-template-columns:32px repeat(7,var(--vdp-cell));}' +
    '.vdp.SALT .vdp-head{height:28px;display:grid;place-items:center;font-size:10.5px;' +
      'font-weight:650;letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--vdp-muted);}' +
    '.vdp.SALT .vdp-wn{display:grid;place-items:center;font-size:11px;color:var(--vdp-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vdp.SALT .vdp-day{position:relative;width:var(--vdp-cell);height:var(--vdp-cell);' +
      'display:grid;place-items:center;font-variant-numeric:tabular-nums;' +
      'transition:background .1s ease;}' +
    '.vdp.SALT .vdp-day:hover{background:var(--vdp-surface);}' +
    '.vdp.SALT .vdp-day.is-outside{color:var(--vdp-muted);}' +
    '.vdp.SALT .vdp-day.is-today{color:var(--vdp-accent);font-weight:650;}' +
    '.vdp.SALT .vdp-day.is-today::after{content:"";position:absolute;left:50%;bottom:6px;' +
      'width:4px;height:4px;border-radius:50%;background:var(--vdp-accent);' +
      'transform:translateX(-50%);}' +
    '.vdp.SALT .vdp-day.is-disabled{opacity:.28;cursor:not-allowed;background:none;}' +
    '.vdp.SALT .vdp-day.in-preview{background:var(--vdp-accent-mist);border-radius:0;}' +
    '.vdp.SALT .vdp-day.in-range{background:var(--vdp-accent-soft);border-radius:0;}' +
    '.vdp.SALT .vdp-day.is-selected{background:var(--vdp-accent);color:var(--vdp-on-accent);' +
      'font-weight:650;}' +
    '.vdp.SALT .vdp-day.is-selected.is-today{color:var(--vdp-on-accent);}' +
    '.vdp.SALT .vdp-day.is-selected.is-today::after{background:var(--vdp-on-accent);}' +
    '.vdp.SALT .vdp-day.is-range-start{border-radius:10px 0 0 10px;}' +
    '.vdp.SALT .vdp-day.is-range-end{border-radius:0 10px 10px 0;}' +
    '.vdp.SALT .vdp-day.is-range-start.is-range-end{border-radius:10px;}' +
    '.vdp.SALT .vdp-stamp{animation:vdp-stamp .3s cubic-bezier(.34,1.56,.64,1);}' +
    '@keyframes vdp-stamp{0%{transform:scale(.7);}100%{transform:scale(1);}}' +
    /* month / year grids */
    '.vdp.SALT .vdp-months,.vdp.SALT .vdp-years{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;' +
      'width:calc(7*var(--vdp-cell));padding:2px 0;}' +
    '.vdp.SALT .vdp-month,.vdp.SALT .vdp-year{height:46px;font-size:14px;font-variant-numeric:tabular-nums;' +
      'transition:background .1s ease;}' +
    '.vdp.SALT .vdp-month:hover,.vdp.SALT .vdp-year:hover{background:var(--vdp-surface);}' +
    '.vdp.SALT .vdp-month.is-now,.vdp.SALT .vdp-year.is-now{color:var(--vdp-accent);font-weight:650;}' +
    '.vdp.SALT .vdp-month.is-selected,.vdp.SALT .vdp-year.is-selected{background:var(--vdp-accent);' +
      'color:var(--vdp-on-accent);font-weight:650;}' +
    '.vdp.SALT .vdp-month.is-disabled,.vdp.SALT .vdp-year.is-disabled{opacity:.28;cursor:not-allowed;' +
      'background:none;}' +
    /* footer */
    '.vdp.SALT .vdp-footer{display:flex;justify-content:space-between;gap:8px;' +
      'margin-top:8px;padding:10px 2px 0;border-top:1px solid var(--vdp-faint);}' +
    '.vdp.SALT .vdp-btn{color:var(--vdp-accent);font-weight:600;font-size:13px;' +
      'padding:7px 10px;border-radius:8px;transition:background .12s ease;}' +
    '.vdp.SALT .vdp-btn:hover{background:var(--vdp-accent-soft);}' +
    '@media (max-width:719px){' +
      '.vdp.SALT{flex-direction:column;}' +
      '.vdp.SALT .vdp-body{flex-direction:column;gap:8px;}' +
      '.vdp.SALT .vdp-presets{flex-direction:row;flex-wrap:wrap;align-items:center;min-width:0;' +
        'align-self:auto;border-right:0;border-bottom:1px solid var(--vdp-faint);' +
        'margin:0 0 12px;padding:0 0 10px;}' +
      '.vdp.SALT .vdp-presets-label{width:100%;padding:2px 10px 6px;}' +
    '}' +
    /* --vdp-cell stays a low-specificity var definition here; only the
       structural padding gets the salt */
    '@media (max-width:359px){.vdp{--vdp-cell:36px;}.vdp.SALT{padding:10px;}}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vdp.SALT,.vdp.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // The salt namespace: a class stamped on every panel root and baked into
  // every structural selector, so host-page CSS (other design systems,
  // generic `.is-selected`/`.is-disabled` rules, `button{}` resets) cannot
  // accidentally override the widget. Deterministic by default so the
  // extracted dist/datepicker.css always matches the DOM; teams can set
  // their own token (DatePicker.salt = 'acme') or disable it entirely
  // (DatePicker.salt = false) BEFORE the first picker is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = DatePicker.salt;
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
    if (!HAS_DOM || document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    // Insert before the page's own CSS so `.vdp { --vdp-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   * Shared auto-theme watcher.
   * ------------------------------------------------------------------ */

  var autoThemed = [];
  var themeMql = null;
  var themeObserver = null;

  function resolveAutoTheme() {
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
    if (autoThemed.length === 1 && HAS_DOM) {
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
  }

  function unwatchAutoTheme(inst) {
    var i = autoThemed.indexOf(inst);
    if (i !== -1) autoThemed.splice(i, 1);
    if (autoThemed.length === 0) {
      if (themeMql) {
        if (themeMql.removeEventListener) themeMql.removeEventListener('change', refreshAutoThemes);
        else if (themeMql.removeListener) themeMql.removeListener(refreshAutoThemes);
      }
      if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
    }
  }

  /* ------------------------------------------------------------------ *
   * Small helpers.
   * ------------------------------------------------------------------ */

  // Resolve any CSS color to [r,g,b] via the browser's own parser.
  function parseColorToRgb(color) {
    if (!HAS_DOM) return null;
    var probe = document.createElement('div');
    probe.style.color = String(color);
    if (!probe.style.color) return null; // browser rejected the value
    probe.style.display = 'none';
    document.documentElement.appendChild(probe);
    var resolved = getComputedStyle(probe).color;
    probe.parentNode.removeChild(probe);
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(resolved);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }

  function relativeLuminance(rgb) {
    var c = rgb.map(function (v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function isInputEl(el) {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  }

  var CHEVRON_LEFT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"' +
    ' aria-hidden="true"><path d="M10 3L5.5 8L10 13" stroke="currentColor"' +
    ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHEVRON_RIGHT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"' +
    ' aria-hidden="true"><path d="M6 3L10.5 8L6 13" stroke="currentColor"' +
    ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Built-in presets, addressable by key for data-presets="last7,thisMonth,…".
  // Values are functions so 'today' is resolved at click time, not init time.
  var BUILTIN_PRESETS = {
    today: { label: 'Today', range: function () { var t = today(); return [t, t]; },
      date: function () { return today(); } },
    yesterday: { label: 'Yesterday', range: function () { var d = addDays(today(), -1); return [d, d]; },
      date: function () { return addDays(today(), -1); } },
    tomorrow: { label: 'Tomorrow', range: function () { var d = addDays(today(), 1); return [d, d]; },
      date: function () { return addDays(today(), 1); } },
    last7: { label: 'Last 7 days', range: function () { return [addDays(today(), -6), today()]; } },
    last30: { label: 'Last 30 days', range: function () { return [addDays(today(), -29), today()]; } },
    thisMonth: { label: 'This month', range: function () {
      var t = today();
      return [startOfMonth(t), new Date(t.getFullYear(), t.getMonth() + 1, 0)];
    } },
    lastMonth: { label: 'Last month', range: function () {
      var m = addMonths(startOfMonth(today()), -1);
      return [m, new Date(m.getFullYear(), m.getMonth() + 1, 0)];
    } },
    thisYear: { label: 'This year', range: function () {
      var y = today().getFullYear();
      return [new Date(y, 0, 1), new Date(y, 11, 31)];
    } }
  };

  function builtinPresets(range, keys) {
    var defaults = range
      ? ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']
      : ['today', 'yesterday', 'tomorrow'];
    var use = keys && keys.length ? keys : defaults;
    var out = [];
    for (var i = 0; i < use.length; i++) {
      var key = String(use[i]).trim();
      var b = BUILTIN_PRESETS[key];
      if (!b) continue;
      var fn = range ? (b.range || b.date) : (b.date || b.range);
      if (fn) out.push({ label: b.label, value: fn });
    }
    return out;
  }

  var DEFAULTS = {
    value: null,            // Date | 'today' | string in `format` or ISO
    format: 'YYYY-MM-DD',   // tokens: YYYY YY MMMM MMM MM M DD D
    min: null,              // Date | 'today' | string
    max: null,              // Date | 'today' | string
    disabledDates: [],      // array of Date/string, or fn(date) -> bool
    disabledDays: [],       // weekday numbers, 0 = Sunday … 6 = Saturday
    range: false,           // range selection
    rangeSeparator: ' – ',
    panes: 1,               // months shown side by side (1-3), great with range
    presets: null,          // [{label, value|range}] or true for built-ins
    inline: false,          // render an always-visible calendar
    locale: null,           // BCP-47 tag; defaults to the browser locale
    firstDay: null,         // 0-6; defaults to the locale's first weekday
    weekNumbers: false,     // ISO week number column
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vdp-* yourself
    accent: null,           // any CSS color
    todayButton: true,
    clearButton: true,
    autoClose: true,
    position: 'auto',       // 'auto' | 'below' | 'above'
    labels: {
      previous: 'Previous',
      next: 'Next',
      today: 'Today',
      clear: 'Clear',
      dialog: 'Choose date',
      switchView: 'Switch calendar view',
      presets: 'Quick select',
      weekAbbr: 'Wk'
    },
    onSelect: null,         // fn(value, formatted, picker)
    onOpen: null,
    onClose: null,
    onClear: null,
    onMonthChange: null     // fn(viewDate, picker)
  };

  /* ------------------------------------------------------------------ *
   * DatePicker.
   * ------------------------------------------------------------------ */

  function DatePicker(target, options) {
    if (!HAS_DOM) throw new Error('DatePicker requires a DOM environment');
    var el = resolveElement(target);
    if (!el) throw new Error('DatePicker: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options);
    this.isInput = isInputEl(el);
    this.input = this.isInput ? el : null;
    this.inline = !!this.opts.inline || !this.isInput;

    if (this.input && this.input.type === 'date') {
      // Native date inputs only accept ISO values and bring their own picker UI.
      this.opts.format = 'YYYY-MM-DD';
      if (typeof console !== 'undefined') {
        console.warn('DatePicker: <input type="date"> forces the ISO format and shows ' +
          'the native picker on some platforms; prefer type="text".');
      }
    }
    this.isOpen = false;
    this.view = 'days';
    this.selected = null;      // Date (single mode)
    this.rangeStart = null;    // Date (range mode)
    this.rangeEnd = null;

    this.L = getLocaleData(this.opts.locale);
    this.firstDay = this.opts.firstDay == null ? this.L.firstDay : (+this.opts.firstDay % 7 + 7) % 7;

    this._min = this._coerce(this.opts.min);
    this._max = this._coerce(this.opts.max);
    this._normalizeDisabled();
    this._normalizePresets();

    // Initial value: explicit option wins, then whatever is typed in the input.
    var initial = this.opts.value != null ? this.opts.value
      : (this.input && this.input.value ? this.input.value : null);
    this._assignValue(initial);

    this.viewDate = startOfMonth(this._anchorDate());
    this._focusKey = dateKey(this._anchorDate());
    this._closeTimer = null;
    this._selectTimer = null;
    this._squelchFocusUntil = 0;
    this._suppressChange = false;

    if (this.opts.styles !== false) injectStyles();
    this._buildPanel();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);

    if (instances) instances.set(el, this);

    if (this.inline) {
      (this.isInput ? el.parentNode : el).appendChild(this.panel);
      this.panel.classList.add('vdp-inline');
      this.render();
    } else {
      this.panel.style.display = 'none';
      document.body.appendChild(this.panel);
    }

    this._syncInput(false);
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

  DatePicker.prototype = {
    constructor: DatePicker,

    /* ---------------- value plumbing ---------------- */

    _coerce: function (v) {
      if (v == null || v === '') return null;
      if (v === 'today') return today();
      if (isValidDate(v)) return stripTime(v);
      if (typeof v === 'string') {
        var d = parseDate(v, this.opts.format, this.L);
        if (!d) {
          var m = ISO_RE.exec(v.trim());
          if (m) {
            d = new Date(+m[1], +m[2] - 1, +m[3]);
            // Reject rollovers ('2026-02-30' must not become Mar 2).
            if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 ||
                d.getDate() !== +m[3]) d = null;
          }
        }
        return d && isValidDate(d) ? d : null;
      }
      return null;
    },

    _normalizeDisabled: function () {
      var dd = this.opts.disabledDates;
      this._disabledFn = typeof dd === 'function' ? dd : null;
      this._disabledSet = {};
      if (Array.isArray(dd)) {
        for (var i = 0; i < dd.length; i++) {
          var d = this._coerce(dd[i]);
          if (d) this._disabledSet[dateKey(d)] = true;
        }
      }
      this._disabledDays = (this.opts.disabledDays || []).map(Number);
    },

    _paneCount: function () {
      return Math.max(1, Math.min(3, Math.floor(+this.opts.panes) || 1));
    },

    _normalizePresets: function () {
      var ps = this.opts.presets;
      if (ps === true) ps = builtinPresets(!!this.opts.range);
      else if (typeof ps === 'string') {
        var keys = (ps === 'true' || ps === 'default' || ps === '') ? null : ps.split(',');
        ps = builtinPresets(!!this.opts.range, keys);
      }
      this._presets = [];
      if (Array.isArray(ps)) {
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          if (!p || p.label == null) continue;
          var v = p.value !== undefined ? p.value :
            (p.range !== undefined ? p.range : p.date);
          if (v === undefined) continue;
          this._presets.push({ label: String(p.label), value: v });
        }
      }
    },

    _resolvePreset: function (p) {
      var v = typeof p.value === 'function' ? p.value() : p.value;
      if (this.opts.range) {
        var pair = Array.isArray(v) ? v : (v && typeof v === 'object' && !isValidDate(v))
          ? [v.start, v.end] : [v, v];
        return [this._coerce(pair[0]), this._coerce(pair[1])];
      }
      return this._coerce(Array.isArray(v) ? v[0] : v);
    },

    _applyPreset: function (i) {
      var p = this._presets[i];
      if (!p) return;
      var v = this._resolvePreset(p);
      if (this.opts.range ? !v[0] : !v) return;
      this.setDate(v);
      if (this.opts.autoClose && !this.inline) this._scheduleClose();
    },

    _renderPresetsState: function () {
      if (!this._presetBtns || !this._presetBtns.length) return;
      var curS = this.opts.range ? this.rangeStart : this.selected;
      var curE = this.opts.range ? this.rangeEnd : null;
      for (var i = 0; i < this._presetBtns.length; i++) {
        var v = this._resolvePreset(this._presets[i]);
        var active = this.opts.range
          ? !!(curS && v[0] && sameDay(curS, v[0]) &&
               ((curE && v[1] && sameDay(curE, v[1])) || (!curE && !v[1])))
          : !!(curS && v && sameDay(curS, v));
        this._presetBtns[i].classList.toggle('is-active', active);
        this._presetBtns[i].setAttribute('aria-pressed', String(active));
      }
    },

    _assignValue: function (v) {
      if (this.opts.range) {
        var pair = null;
        if (v && typeof v === 'object' && !isValidDate(v)) {
          pair = Array.isArray(v) ? v : [v.start, v.end];
        } else if (typeof v === 'string' && v.indexOf(this.opts.rangeSeparator) !== -1) {
          pair = splitRange(v, this.opts.rangeSeparator);
        } else if (v != null) {
          pair = [v, null];
        }
        this.rangeStart = pair ? this._coerce(pair[0]) : null;
        this.rangeEnd = pair ? this._coerce(pair[1]) : null;
        if (this.rangeStart && this.rangeEnd && this.rangeStart > this.rangeEnd) {
          var tmp = this.rangeStart; this.rangeStart = this.rangeEnd; this.rangeEnd = tmp;
        }
      } else {
        this.selected = this._coerce(v);
      }
    },

    _anchorDate: function () {
      return (this.opts.range ? this.rangeStart : this.selected) || this._clampToRange(today());
    },

    _clampToRange: function (d) {
      if (this._min && d < this._min) return new Date(this._min);
      if (this._max && d > this._max) return new Date(this._max);
      return d;
    },

    _isDisabled: function (d) {
      if (this._min && d < this._min) return true;
      if (this._max && d > this._max) return true;
      if (this._disabledDays.indexOf(d.getDay()) !== -1) return true;
      if (this._disabledSet[dateKey(d)]) return true;
      if (this._disabledFn && this._disabledFn(new Date(d))) return true;
      return false;
    },

    _formatted: function () {
      var f = this.opts.format;
      if (this.opts.range) {
        if (!this.rangeStart) return '';
        var s = formatDate(this.rangeStart, f, this.L);
        return this.rangeEnd
          ? s + this.opts.rangeSeparator + formatDate(this.rangeEnd, f, this.L)
          : s;
      }
      return this.selected ? formatDate(this.selected, f, this.L) : '';
    },

    _value: function () {
      if (this.opts.range) {
        return (this.rangeStart || this.rangeEnd) ? {
          start: this.rangeStart ? new Date(this.rangeStart) : null,
          end: this.rangeEnd ? new Date(this.rangeEnd) : null
        } : null;
      }
      return this.selected ? new Date(this.selected) : null;
    },

    _syncInput: function (fireEvents) {
      if (!this.input) return;
      var text = this._formatted();
      if (this.input.value !== text) {
        this._suppressChange = true;
        this.input.value = text;
        if (fireEvents) {
          this.input.dispatchEvent(new Event('input', { bubbles: true }));
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this._suppressChange = false;
      }
    },

    _emit: function (name, detail) {
      var target = this.input || this.el;
      target.dispatchEvent(new CustomEvent('datepicker:' + name, {
        bubbles: true,
        detail: detail || { picker: this }
      }));
    },

    /* ---------------- DOM construction ---------------- */

    _buildPanel: function () {
      var L = this.opts.labels;
      var multi = this._paneCount() > 1;
      var p = document.createElement('div');
      p.className = 'vdp' + saltClass() + (multi ? ' vdp-multi' : '');
      p.setAttribute('role', this.inline ? 'group' : 'dialog');
      p.setAttribute('aria-label', L.dialog);
      var presetsHtml = '';
      if (this._presets.length) {
        presetsHtml = '<div class="vdp-presets" role="group" aria-label="' +
          escapeHtml(L.presets) + '">' +
          '<span class="vdp-presets-label" aria-hidden="true">' +
          escapeHtml(L.presets) + '</span>';
        for (var i = 0; i < this._presets.length; i++) {
          presetsHtml += '<button type="button" class="vdp-preset" data-preset="' + i +
            '" aria-pressed="false">' + escapeHtml(this._presets[i].label) + '</button>';
        }
        presetsHtml += '</div>';
      }
      p.innerHTML = presetsHtml + '<div class="vdp-main">' +
        '<div class="vdp-header">' +
          '<button type="button" class="vdp-nav" data-vdp="prev" aria-label="' +
            escapeHtml(L.previous) + '">' + CHEVRON_LEFT + '</button>' +
          '<button type="button" class="vdp-title" data-vdp="title" aria-live="polite"' +
            (multi ? '' : ' title="' + escapeHtml(L.switchView) + '"') + '>' +
            '<span class="vdp-title-month"></span><span class="vdp-title-year"></span>' +
          '</button>' +
          '<button type="button" class="vdp-nav" data-vdp="next" aria-label="' +
            escapeHtml(L.next) + '">' + CHEVRON_RIGHT + '</button>' +
        '</div>' +
        '<div class="vdp-body"></div>' +
        (function (self) {
          // "Today" makes no sense while picking a span across months; the
          // presets rail owns quick jumps in multi-pane mode.
          var showToday = self.opts.todayButton && self._paneCount() === 1;
          var showClear = self.opts.clearButton;
          if (!showToday && !showClear) return '';
          return '<div class="vdp-footer">' +
            (showToday ? '<button type="button" class="vdp-btn"' +
              ' data-vdp="today">' + escapeHtml(L.today) + '</button>' : '<span></span>') +
            (showClear ? '<button type="button" class="vdp-btn"' +
              ' data-vdp="clear">' + escapeHtml(L.clear) + '</button>' : '<span></span>') +
          '</div>';
        })(this) +
        '</div>';
      this.panel = p;
      this._presetBtns = p.querySelectorAll('.vdp-preset');
      this._titleBtn = p.querySelector('[data-vdp=title]');
      this._titleMonth = p.querySelector('.vdp-title-month');
      this._titleYear = p.querySelector('.vdp-title-year');
      this._body = p.querySelector('.vdp-body');
      this._prevBtn = p.querySelector('[data-vdp=prev]');
      this._nextBtn = p.querySelector('[data-vdp=next]');
    },

    // Update the masthead only when the text actually changes, so the
    // aria-live region doesn't re-announce on every re-render.
    _setTitle: function (main, year) {
      main = String(main); year = year == null ? '' : String(year);
      if (this._titleMonth.textContent !== main) this._titleMonth.textContent = main;
      if (this._titleYear.textContent !== year) this._titleYear.textContent = year;
    },

    _bind: function () {
      var self = this;

      this._onPanelClick = function (e) { self._handlePanelClick(e); };
      this._onPanelKeydown = function (e) { self._handlePanelKeydown(e); };
      this._onPanelOver = function (e) { self._handleHover(e); };
      this._onPanelLeave = function () { self._clearPreview(); };
      this._onFocusOut = function (e) {
        // Close when keyboard focus moves somewhere outside the widget.
        // relatedTarget is null for clicks on non-focusables and window blur —
        // the outside-pointerdown handler owns those cases.
        if (!self.isOpen || !e.relatedTarget) return;
        if (self.panel.contains(e.relatedTarget) || e.relatedTarget === self.input) return;
        self.close(false);
      };
      this._bindPanel();

      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1) return;
        if (self.input && path.indexOf(self.input) !== -1) return;
        self.close();
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
      this._onDocKeydown = function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); self.close(true); }
      };

      if (this.input) {
        this._onFocus = function () {
          if (Date.now() < self._squelchFocusUntil) return;
          self.open();
        };
        this._onClick = function () { self.open(); };
        this._onChange = function () {
          if (self._suppressChange) return;
          self._readInput();
        };
        this._onInputKeydown = function (e) {
          if (e.key === 'ArrowDown' || (e.altKey && e.key === 'Down')) {
            e.preventDefault();
            self.open();
            self._focusGrid();
          } else if (e.key === 'Escape' && self.isOpen) {
            e.stopPropagation();
            self.close();
          } else if (e.key === 'Enter' && self.isOpen) {
            // Let the typed value win: parse, then close — and don't submit
            // the surrounding form while the picker is open.
            e.preventDefault();
            self._readInput();
            self.close();
          }
        };
        this.input.addEventListener('focus', this._onFocus);
        this.input.addEventListener('click', this._onClick);
        this.input.addEventListener('change', this._onChange);
        this.input.addEventListener('keydown', this._onInputKeydown);
        this.input.addEventListener('focusout', this._onFocusOut);
        if (!this.input.getAttribute('autocomplete')) {
          this.input.setAttribute('autocomplete', 'off');
        }
        if (!this.inline) {
          this.input.setAttribute('aria-haspopup', 'dialog');
          this.input.setAttribute('aria-expanded', 'false');
        }
      }
    },

    _bindPanel: function () {
      this.panel.addEventListener('click', this._onPanelClick);
      this.panel.addEventListener('keydown', this._onPanelKeydown);
      this.panel.addEventListener('mouseover', this._onPanelOver);
      this.panel.addEventListener('mouseleave', this._onPanelLeave);
      this.panel.addEventListener('focusin', this._onPanelOver);
      this.panel.addEventListener('focusout', this._onFocusOut);
    },

    _readInput: function () {
      var text = this.input.value.trim();
      if (text === '') {
        this.clear();
        return;
      }
      var ok = false;
      if (this.opts.range) {
        var pair = splitRange(text, this.opts.rangeSeparator);
        var s = this._coerce(pair[0]);
        var e = pair[1] != null ? this._coerce(pair[1]) : null;
        if (s && (pair[1] == null || e) &&
            !this._isDisabled(s) && (!e || !this._isDisabled(e))) {
          this.setDate(e ? [s, e] : [s, null]);
          ok = true;
        }
      } else {
        var d = this._coerce(text);
        if (d && !this._isDisabled(d)) {
          this.setDate(d);
          ok = true;
        }
      }
      if (!ok) this._syncInput(false); // revert to last valid value
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.panel.setAttribute('data-theme', resolved);
      var style = this.panel.style;
      if (this.opts.accent) {
        style.setProperty('--vdp-accent', this.opts.accent);
        var rgb = parseColorToRgb(this.opts.accent);
        if (rgb) {
          // Pick whichever of white/near-black reads better on the accent,
          // and derive the soft tints from the real accent (the stylesheet
          // fallbacks are tuned to the default iris).
          var lum = relativeLuminance(rgb);
          var onWhite = 1.05 / (lum + 0.05);
          var onInk = (lum + 0.05) / 0.055;
          style.setProperty('--vdp-on-accent', onWhite >= onInk ? '#ffffff' : '#131418');
          var base = rgb[0] + ',' + rgb[1] + ',' + rgb[2];
          style.setProperty('--vdp-accent-soft', 'rgba(' + base + ',.14)');
          style.setProperty('--vdp-accent-mist', 'rgba(' + base + ',.07)');
        }
      } else {
        style.removeProperty('--vdp-accent');
        style.removeProperty('--vdp-on-accent');
        style.removeProperty('--vdp-accent-soft');
        style.removeProperty('--vdp-accent-mist');
      }
    },

    /* ---------------- rendering ---------------- */

    render: function () {
      if (this.view === 'days') this._renderDays();
      else if (this.view === 'months') this._renderMonths();
      else this._renderYears();
      this._renderPresetsState();
    },

    _renderDays: function () {
      var L = this.L, opts = this.opts;
      var panes = this._paneCount();
      var vy = this.viewDate.getFullYear(), vm = this.viewDate.getMonth();

      if (panes === 1) {
        this._setTitle(L.months[vm], vy);
      } else {
        var lastPane = addMonths(this.viewDate, panes - 1);
        this._setTitle(
          L.months[vm] + ' – ' + L.months[lastPane.getMonth()],
          lastPane.getFullYear() === vy ? vy : vy + '–' + lastPane.getFullYear()
        );
      }

      var tKey = dateKey(today());
      var selKey = this.selected ? dateKey(this.selected) : null;
      var rs = this.rangeStart, re = this.rangeEnd;
      var rsKey = rs ? dateKey(rs) : null, reKey = re ? dateKey(re) : null;
      var focusKey = this._resolveFocusKey(panes);

      var html = '';
      for (var pi = 0; pi < panes; pi++) {
        var paneDate = addMonths(this.viewDate, pi);
        var py = paneDate.getFullYear(), pm = paneDate.getMonth();
        var som = startOfMonth(paneDate);
        var lead = (som.getDay() - this.firstDay + 7) % 7;
        var cursor = addDays(som, -lead);

        html += '<div class="vdp-pane"><div class="vdp-grid' +
          (opts.weekNumbers ? ' vdp-has-wn' : '') +
          '" role="grid" aria-label="' + escapeHtml(L.months[pm] + ' ' + py) + '">';

        html += '<div class="vdp-row" role="row">';
        if (opts.weekNumbers) {
          html += '<span class="vdp-head" role="columnheader" aria-label="Week number">' +
            escapeHtml(opts.labels.weekAbbr) + '</span>';
        }
        for (var i = 0; i < 7; i++) {
          var wd = (this.firstDay + i) % 7;
          html += '<span class="vdp-head" role="columnheader" aria-label="' +
            escapeHtml(L.weekdaysLong[wd]) + '">' + escapeHtml(L.weekdaysShort[wd]) + '</span>';
        }
        html += '</div>';

        for (var w = 0; w < 6; w++) {
          html += '<div class="vdp-row" role="row">';
          if (opts.weekNumbers) {
            // Label with the ISO week of the row's Thursday — correct for any firstDay.
            html += '<span class="vdp-wn" role="rowheader">' +
              isoWeek(addDays(cursor, (11 - cursor.getDay()) % 7)) + '</span>';
          }
          for (var c = 0; c < 7; c++) {
            var outside = cursor.getMonth() !== pm;
            if (outside && panes > 1) {
              // Spacer, not a button — the date is (or will be) shown in its own pane.
              html += '<span class="vdp-day is-empty" role="gridcell"></span>';
            } else {
              var key = dateKey(cursor);
              var disabled = this._isDisabled(cursor);
              var selected = opts.range ? (key === rsKey || key === reKey) : key === selKey;
              var inRange = rs && re && cursor > rs && cursor < re;
              var cls = 'vdp-day' +
                (outside ? ' is-outside' : '') +
                (key === tKey ? ' is-today' : '') +
                (disabled ? ' is-disabled' : '') +
                (selected ? ' is-selected' : '') +
                (inRange ? ' in-range' : '') +
                (opts.range && key === rsKey && re ? ' is-range-start' : '') +
                (opts.range && key === reKey ? ' is-range-end' : '');
              html += '<button type="button" class="' + cls + '" role="gridcell"' +
                ' data-date="' + key + '"' +
                ' tabindex="' + (key === focusKey ? '0' : '-1') + '"' +
                ' aria-selected="' + (selected ? 'true' : 'false') + '"' +
                (disabled ? ' aria-disabled="true"' : '') +
                (key === tKey ? ' aria-current="date"' : '') +
                ' aria-label="' + escapeHtml(L.full.format(cursor)) + '">' +
                cursor.getDate() + '</button>';
            }
            cursor = addDays(cursor, 1);
          }
          html += '</div>';
        }
        html += '</div></div>';
      }
      this._body.innerHTML = html;

      var firstSom = startOfMonth(this.viewDate);
      var lastSom = startOfMonth(addMonths(this.viewDate, panes - 1));
      this._setNavDisabled(
        this._min && addMonths(firstSom, -1) < startOfMonth(this._min),
        this._max && startOfMonth(addMonths(lastSom, 1)) > this._max
      );
    },

    _resolveFocusKey: function (panes) {
      // Roving-tabindex target: last focused date if visible, else selection,
      // else today, else the 1st of the first shown month.
      var first = startOfMonth(this.viewDate);
      var afterLast = addMonths(first, panes);
      var candidates = [
        this._focusKey ? keyToDate(this._focusKey) : null,
        this.opts.range ? this.rangeStart : this.selected,
        today()
      ];
      for (var i = 0; i < candidates.length; i++) {
        var d = candidates[i];
        if (d && d >= first && d < afterLast) {
          var k = dateKey(d);
          this._focusKey = k;
          return k;
        }
      }
      var k1 = dateKey(first);
      this._focusKey = k1;
      return k1;
    },

    _renderMonths: function () {
      var L = this.L;
      var vy = this.viewDate.getFullYear();
      var now = today();
      var sel = this.opts.range ? this.rangeStart : this.selected;
      this._setTitle(vy, '');

      var html = '<div class="vdp-months">';
      for (var m = 0; m < 12; m++) {
        var first = new Date(vy, m, 1);
        var last = new Date(vy, m + 1, 0);
        var disabled = (this._min && last < this._min) || (this._max && first > this._max);
        var isSel = !!(sel && sel.getFullYear() === vy && sel.getMonth() === m);
        var cls = 'vdp-month' +
          (now.getFullYear() === vy && now.getMonth() === m ? ' is-now' : '') +
          (isSel ? ' is-selected' : '') +
          (disabled ? ' is-disabled' : '');
        html += '<button type="button" class="' + cls + '" data-month="' + m + '"' +
          (disabled ? ' aria-disabled="true"' : '') +
          ' aria-pressed="' + isSel + '"' +
          ' aria-label="' + escapeHtml(L.months[m] + ' ' + vy) + '">' +
          escapeHtml(L.monthsShort[m]) + '</button>';
      }
      html += '</div>';
      this._body.innerHTML = html;

      this._setNavDisabled(
        this._min && vy - 1 < this._min.getFullYear(),
        this._max && vy + 1 > this._max.getFullYear()
      );
    },

    _renderYears: function () {
      var vy = this.viewDate.getFullYear();
      var base = vy - (vy % 12);
      var now = today().getFullYear();
      var sel = this.opts.range ? this.rangeStart : this.selected;
      var selY = sel ? sel.getFullYear() : null;
      this._setTitle(base + '–' + (base + 11), '');

      var html = '<div class="vdp-years">';
      for (var y = base; y < base + 12; y++) {
        var disabled = (this._min && y < this._min.getFullYear()) ||
          (this._max && y > this._max.getFullYear());
        var cls = 'vdp-year' +
          (y === now ? ' is-now' : '') +
          (y === selY ? ' is-selected' : '') +
          (disabled ? ' is-disabled' : '');
        html += '<button type="button" class="' + cls + '" data-year="' + y + '"' +
          (disabled ? ' aria-disabled="true"' : '') +
          ' aria-pressed="' + (y === selY) + '"' + '>' + y + '</button>';
      }
      html += '</div>';
      this._body.innerHTML = html;

      this._setNavDisabled(
        this._min && base - 1 < this._min.getFullYear(),
        this._max && base + 12 > this._max.getFullYear()
      );
    },

    _setNavDisabled: function (prev, next) {
      // Don't strand keyboard focus on a button that is about to be disabled.
      var active = document.activeElement;
      if ((prev && active === this._prevBtn) || (next && active === this._nextBtn)) {
        this._titleBtn.focus();
      }
      this._prevBtn.disabled = !!prev;
      this._nextBtn.disabled = !!next;
    },

    /* ---------------- interaction ---------------- */

    _handlePanelClick: function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn || !this.panel.contains(btn)) return;

      var action = btn.getAttribute('data-vdp');
      if (action === 'prev') return this._navigate(-1);
      if (action === 'next') return this._navigate(1);
      if (action === 'title') return this._cycleView();
      if (action === 'today') return this._pickToday();
      if (action === 'clear') { this.clear(); if (!this.inline) this.close(true); return; }

      if (btn.classList.contains('vdp-preset')) {
        this._applyPreset(+btn.getAttribute('data-preset'));
        return;
      }
      if (btn.classList.contains('vdp-day')) {
        if (btn.classList.contains('is-disabled')) return;
        var d = keyToDate(btn.getAttribute('data-date'));
        if (d) this._select(d);
        return;
      }
      var hadFocus = this._body.contains(document.activeElement);
      if (btn.hasAttribute('data-month')) {
        if (btn.classList.contains('is-disabled')) return;
        this.viewDate = new Date(this.viewDate.getFullYear(), +btn.getAttribute('data-month'), 1);
        this.view = 'days';
        this.render();
        if (this.isOpen) this._position();
        if (hadFocus) this._focusGrid();
        return;
      }
      if (btn.hasAttribute('data-year')) {
        if (btn.classList.contains('is-disabled')) return;
        this.viewDate = new Date(+btn.getAttribute('data-year'), this.viewDate.getMonth(), 1);
        this.view = 'months';
        this.render();
        if (this.isOpen) this._position();
        if (hadFocus) this._focusViewDefault();
      }
    },

    // First sensible focus target in the months/years views.
    _focusViewDefault: function () {
      var b = this._body.querySelector('.is-selected:not(.is-disabled)') ||
        this._body.querySelector('.is-now:not(.is-disabled)') ||
        this._body.querySelector('.vdp-month:not(.is-disabled),.vdp-year:not(.is-disabled)');
      if (b) b.focus();
    },

    _navigate: function (dir) {
      var months = this.view === 'days' ? 1 : this.view === 'months' ? 12 : 144;
      this.viewDate = startOfMonth(addMonths(this.viewDate, dir * months));
      this.render();
      if (this.view === 'days' && this.opts.onMonthChange) {
        this.opts.onMonthChange(new Date(this.viewDate), this);
      }
      if (this.isOpen) this._position();
    },

    _cycleView: function () {
      // Month/year quick views don't compose with multiple panes.
      if (this._paneCount() > 1) return;
      this.view = this.view === 'days' ? 'months' : 'years';
      this.render();
      if (this.isOpen) this._position();
      this._focusViewDefault();
    },

    _pickToday: function () {
      var t = today();
      this._snapViewTo(t);
      this.view = 'days';
      if (this._isDisabled(t)) {
        this.render();
      } else if (this.opts.range) {
        this._select(t);
      } else {
        this.setDate(t);
        if (this.opts.autoClose && !this.inline) this._scheduleClose();
      }
    },

    _select: function (d) {
      var complete = true;
      if (this.opts.range) {
        if (!this.rangeStart || this.rangeEnd) {
          this.rangeStart = d;
          this.rangeEnd = null;
          complete = false;
        } else {
          if (d < this.rangeStart) {
            this.rangeEnd = this.rangeStart;
            this.rangeStart = d;
          } else {
            this.rangeEnd = d;
          }
        }
      } else {
        this.selected = d;
      }
      var hadFocus = this.panel.contains(document.activeElement);
      this._focusKey = dateKey(d);
      this._snapViewTo(d);
      this.render();
      this._stamp(d);
      if (hadFocus) {
        // render() replaced the grid and dropped focus on <body>; put it back
        // on the newly selected cell (close(true) may hand it to the input later).
        var cell = this._body.querySelector('[data-date="' + this._focusKey + '"]');
        if (cell) cell.focus();
      }
      this._syncInput(true);
      if (complete) {
        if (this.opts.onSelect) this.opts.onSelect(this._value(), this._formatted(), this);
        this._emit('select', { value: this._value(), formatted: this._formatted(), picker: this });
        if (this.opts.autoClose && !this.inline) this._scheduleClose();
      }
    },

    _stamp: function (d) {
      var cell = this._body.querySelector('[data-date="' + dateKey(d) + '"]');
      if (cell) cell.classList.add('vdp-stamp');
    },

    _scheduleClose: function () {
      var self = this;
      clearTimeout(this._selectTimer);
      this._selectTimer = setTimeout(function () { self.close(true); }, 150);
    },

    /* range hover / focus preview */
    _handleHover: function (e) {
      if (!this.opts.range || !this.rangeStart || this.rangeEnd) return;
      var cell = e.target.closest ? e.target.closest('.vdp-day') : null;
      if (!cell || cell.classList.contains('is-disabled')) return;
      var hover = keyToDate(cell.getAttribute('data-date'));
      if (!hover) return;
      var lo = hover < this.rangeStart ? hover : this.rangeStart;
      var hi = hover < this.rangeStart ? this.rangeStart : hover;
      var cells = this._body.querySelectorAll('.vdp-day');
      for (var i = 0; i < cells.length; i++) {
        var d = keyToDate(cells[i].getAttribute('data-date'));
        cells[i].classList.toggle('in-preview', d > lo && d < hi);
      }
    },

    _clearPreview: function () {
      var cells = this._body.querySelectorAll('.vdp-day.in-preview');
      for (var i = 0; i < cells.length; i++) cells[i].classList.remove('in-preview');
    },

    /* ---------------- keyboard ---------------- */

    _handlePanelKeydown: function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
        return;
      }
      var cell = e.target.classList && e.target.classList.contains('vdp-day') ? e.target : null;
      if (!cell) return;
      var d = keyToDate(cell.getAttribute('data-date'));
      if (!d) return;

      var next = null;
      switch (e.key) {
        case 'ArrowLeft': next = addDays(d, -1); break;
        case 'ArrowRight': next = addDays(d, 1); break;
        case 'ArrowUp': next = addDays(d, -7); break;
        case 'ArrowDown': next = addDays(d, 7); break;
        case 'Home': next = addDays(d, -((d.getDay() - this.firstDay + 7) % 7)); break;
        case 'End': next = addDays(d, 6 - ((d.getDay() - this.firstDay + 7) % 7)); break;
        case 'PageUp': next = addMonths(d, e.shiftKey ? -12 : -1); break;
        case 'PageDown': next = addMonths(d, e.shiftKey ? 12 : 1); break;
        case 'Enter': case ' ':
          e.preventDefault();
          if (!cell.classList.contains('is-disabled')) this._select(d);
          return;
        default: return;
      }
      e.preventDefault();
      this._focusDay(this._clampToRange(next));
    },

    // Bring `d` into the visible pane window, moving as little as possible:
    // dates after the window land in the last pane, dates before in the first.
    _snapViewTo: function (d) {
      var panes = this._paneCount();
      var first = startOfMonth(this.viewDate);
      var afterLast = addMonths(first, panes);
      if (d < first) this.viewDate = startOfMonth(d);
      else if (d >= afterLast) this.viewDate = startOfMonth(addMonths(d, -(panes - 1)));
    },

    _focusDay: function (d) {
      var panes = this._paneCount();
      var first = startOfMonth(this.viewDate);
      var afterLast = addMonths(first, panes);
      this._focusKey = dateKey(d);
      if (d < first || d >= afterLast) {
        this._snapViewTo(d);
        this.render();
        if (this.opts.onMonthChange) this.opts.onMonthChange(new Date(this.viewDate), this);
        if (this.isOpen) this._position();
      } else {
        // Just move the roving tabindex without a re-render.
        var prev = this._body.querySelector('.vdp-day[tabindex="0"]');
        if (prev) prev.setAttribute('tabindex', '-1');
      }
      var cell = this._body.querySelector('[data-date="' + this._focusKey + '"]');
      if (cell) {
        cell.setAttribute('tabindex', '0');
        cell.focus();
      }
    },

    _focusGrid: function () {
      var cell = this._body.querySelector('.vdp-day[tabindex="0"]') ||
        this._body.querySelector('.vdp-day');
      if (cell) cell.focus();
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      if (this.inline) return;
      var anchor = this.input || this.el;
      var r = anchor.getBoundingClientRect();
      this._anchorRect = r;
      var panel = this.panel;
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = 6, pad = 8;

      var below = this.opts.position === 'below' ||
        (this.opts.position !== 'above' && (vh - r.bottom >= ph + gap || r.top < ph + gap));
      var top = below ? r.bottom + gap : r.top - ph - gap;
      var left = Math.min(Math.max(pad, r.left), Math.max(pad, vw - pw - pad));

      // Inside a native <dialog> the panel rides in the top layer with the
      // dialog, positioned fixed in viewport coordinates; otherwise it is
      // absolute in the page.
      var fixed = this._inTopLayer;
      panel.style.position = fixed ? 'fixed' : 'absolute';
      panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
      panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
      panel.style.transformOrigin =
        Math.round(Math.min(Math.max(0, r.left - left), pw)) + 'px ' +
        (below ? '0%' : '100%');
    },

    /* ---------------- public API ---------------- */

    open: function () {
      if (this.inline || this.isOpen) return this;
      clearTimeout(this._closeTimer);
      clearTimeout(this._selectTimer); // a pending autoClose must not kill the reopen
      this.view = 'days';
      this.viewDate = startOfMonth(this.viewDate);
      this._snapViewTo(this._anchorDate());

      // If the anchor lives inside an open <dialog>, the panel must join it in
      // the top layer, otherwise a modal dialog renders above the popup.
      var anchor = this.input || this.el;
      var host = anchor.closest ? anchor.closest('dialog') : null;
      this._inTopLayer = !!host;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this.render();
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vdp-open'); });
      this.isOpen = true;
      if (this.input) this.input.setAttribute('aria-expanded', 'true');

      document.addEventListener('pointerdown', this._onDocPointer, true);
      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);

      // Layout shifts move the anchor without firing scroll/resize; track it.
      var self = this;
      clearInterval(this._anchorWatch);
      this._anchorWatch = setInterval(function () {
        if (!self.isOpen) return;
        var r = (self.input || self.el).getBoundingClientRect();
        var last = self._anchorRect;
        if (last && (r.top !== last.top || r.left !== last.left ||
            r.width !== last.width || r.height !== last.height)) {
          self._position();
        }
      }, 250);

      if (this.opts.onOpen) this.opts.onOpen(this);
      this._emit('open');
      return this;
    },

    close: function (refocus) {
      if (this.inline || !this.isOpen) return this;
      this.isOpen = false;
      if (this.input) this.input.setAttribute('aria-expanded', 'false');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      clearInterval(this._anchorWatch);

      var focusInside = this.panel.contains(document.activeElement);
      this.panel.classList.remove('vdp-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);

      // refocus === false means "focus is moving elsewhere, leave it alone".
      if (refocus !== false && (refocus || focusInside) && this.input) {
        this._squelchFocusUntil = Date.now() + 250;
        this.input.focus();
      }
      if (this.opts.onClose) this.opts.onClose(this);
      this._emit('close');
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close() : this.open();
    },

    getDate: function () {
      return this._value();
    },

    setDate: function (v, config) {
      var silent = config && config.silent;
      this._assignValue(v);
      var anchor = this._anchorDate();
      this._snapViewTo(anchor);
      this._focusKey = dateKey(anchor);
      this.render();
      this._syncInput(!silent);
      if (!silent && this._value()) {
        if (this.opts.onSelect) this.opts.onSelect(this._value(), this._formatted(), this);
        this._emit('select', { value: this._value(), formatted: this._formatted(), picker: this });
      }
      return this;
    },

    clear: function () {
      this.selected = null;
      this.rangeStart = null;
      this.rangeEnd = null;
      this._syncInput(true);
      this.render();
      if (this.opts.onClear) this.opts.onClear(this);
      this._emit('clear');
      return this;
    },

    setOptions: function (partial) {
      partial = partial || {};
      var wasRange = !!this.opts.range;
      this.opts = assignOptions({}, this.opts, partial);
      this.L = getLocaleData(this.opts.locale);
      this.firstDay = this.opts.firstDay == null ? this.L.firstDay : (+this.opts.firstDay % 7 + 7) % 7;
      this._min = this._coerce(this.opts.min);
      this._max = this._coerce(this.opts.max);
      this._normalizeDisabled();
      this._normalizePresets();

      // Carry the current value across a range-mode switch instead of wiping it.
      if (partial.range !== undefined && !!partial.range !== wasRange) {
        if (partial.range) {
          this.rangeStart = this.selected;
          this.rangeEnd = null;
          this.selected = null;
        } else {
          this.selected = this.rangeStart;
          this.rangeStart = this.rangeEnd = null;
        }
      }
      if (partial.value !== undefined) this._assignValue(partial.value);

      // Options that change the panel chrome need a rebuild, not just a render.
      if (partial.inline !== undefined || partial.todayButton !== undefined ||
          partial.clearButton !== undefined || partial.labels !== undefined ||
          partial.presets !== undefined || partial.panes !== undefined) {
        this._rebuildPanel();
      }

      if (this.opts.theme === 'auto') watchAutoTheme(this); else unwatchAutoTheme(this);
      this._applyTheme();
      this.render();
      this._syncInput(false);
      if (this.isOpen) this._position();
      return this;
    },

    _rebuildPanel: function () {
      var wasOpen = this.isOpen;
      if (wasOpen) this.close(false);
      clearTimeout(this._closeTimer);
      this.panel.remove();
      this.inline = !!this.opts.inline || !this.isInput;
      this._buildPanel();
      this._bindPanel();
      if (this.inline) {
        this.panel.classList.add('vdp-inline');
        (this.isInput ? this.el.parentNode : this.el).appendChild(this.panel);
        if (this.input) {
          this.input.removeAttribute('aria-haspopup');
          this.input.removeAttribute('aria-expanded');
        }
      } else {
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);
        if (this.input) {
          this.input.setAttribute('aria-haspopup', 'dialog');
          this.input.setAttribute('aria-expanded', 'false');
        }
      }
      if (wasOpen && !this.inline) this.open();
    },

    destroy: function () {
      if (!this.inline) this.close(false);
      clearTimeout(this._closeTimer);
      clearTimeout(this._selectTimer);
      clearInterval(this._anchorWatch);
      unwatchAutoTheme(this);
      this.panel.remove();
      if (this.input) {
        this.input.removeEventListener('focus', this._onFocus);
        this.input.removeEventListener('click', this._onClick);
        this.input.removeEventListener('change', this._onChange);
        this.input.removeEventListener('keydown', this._onInputKeydown);
        this.input.removeEventListener('focusout', this._onFocusOut);
        this.input.removeAttribute('aria-haspopup');
        this.input.removeAttribute('aria-expanded');
      }
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  DatePicker.version = VERSION;
  DatePicker.defaults = DEFAULTS;

  DatePicker.create = function (target, options) {
    return new DatePicker(target, options);
  };

  DatePicker.get = function (target) {
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  DatePicker.formatDate = function (date, format, locale) {
    return formatDate(date, format || DEFAULTS.format, getLocaleData(locale));
  };

  DatePicker.parseDate = function (str, format, locale) {
    return parseDate(str, format || DEFAULTS.format, getLocaleData(locale));
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.format) o.format = d.format;
    if (d.value) o.value = d.value;
    if (d.min) o.min = d.min;
    if (d.max) o.max = d.max;
    if (d.locale) o.locale = d.locale;
    if (d.theme) o.theme = d.theme;
    if (d.accent) o.accent = d.accent;
    if (d.rangeSeparator) o.rangeSeparator = d.rangeSeparator;
    if (d.position) o.position = d.position;
    if (d.panes != null && d.panes !== '') o.panes = +d.panes;
    if (d.presets != null) o.presets = d.presets === '' ? true : d.presets;
    if (d.firstDay != null && d.firstDay !== '') o.firstDay = +d.firstDay;
    if (d.range != null) o.range = parseBool(d.range);
    if (d.inline != null) o.inline = parseBool(d.inline);
    if (d.weekNumbers != null) o.weekNumbers = parseBool(d.weekNumbers);
    if (d.autoClose != null) o.autoClose = parseBool(d.autoClose);
    if (d.styles != null) o.styles = parseBool(d.styles);
    if (d.todayButton != null) o.todayButton = parseBool(d.todayButton);
    if (d.clearButton != null) o.clearButton = parseBool(d.clearButton);
    if (d.disabledDays) o.disabledDays = d.disabledDays.split(',').map(Number);
    if (d.disabledDates) o.disabledDates = d.disabledDates.split(',');
    return o;
  }

  DatePicker.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-datepicker]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new DatePicker(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('DatePicker auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { DatePicker.autoInit(); });
    } else {
      DatePicker.autoInit();
    }
  }

  /* ---- convergence contract (see docs/specs/2026-07-03-core-design.md) ---- */
  DatePicker.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(DatePicker, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    DatePicker.css = renderCss();
  }
  DatePicker.rootClass = 'vdp';
  DatePicker.themeVars = {
    accent: '--vdp-accent',
    radius: '--vdp-radius',
    font: '--vdp-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  DatePicker.varScopes = ['.vdp', '.vdp[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('datepicker', DatePicker);
  }

  return DatePicker;
});

/* ==== toast/toast.js ==== */
/*!
 * Vanilla UI Kit Toast v1.0.0
 * A single-file, zero-dependency toast/notification stack for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
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

if (cjsModule) {
  cjsModule.exports = {
    VC: global.VC,
    VanillaUI: global.VanillaUI,
    DatePicker: global.DatePicker,
    Toast: global.Toast
  };
}
})(typeof globalThis !== 'undefined' ? globalThis :
   typeof self !== 'undefined' ? self : this,
   typeof module === 'object' && module.exports ? module : null);
