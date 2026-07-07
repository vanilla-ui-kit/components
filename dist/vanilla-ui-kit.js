/*!
 * vanilla-ui-kit v1.0.0 — single-file, zero-dependency UI components
 * Bundle of: core/core.js, datepicker/datepicker.js, toast/toast.js, tooltip/tooltip.js, menu/menu.js, modal/modal.js, tabs/tabs.js, select/select.js
 * https://github.com/vanilla-ui-kit/components
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
 * https://github.com/vanilla-ui-kit/components
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

/* ==== tooltip/tooltip.js ==== */
/*!
 * Vanilla UI Kit Tooltip v1.0.0
 * A single-file, zero-dependency tooltip/popover for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="tooltip.js"></script>
 *   <button data-vtt="Saves your work">Save</button>
 *
 * Headless:
 *   Tooltip.defaults.styles = false   // no CSS injected; style .vtt-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Tooltip = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-tooltip-styles';
  var OUT_MS = 150; // keep in sync with the .vtt transition
  var PLACEMENTS = ['top', 'bottom', 'left', 'right'];
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Tooltip.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Tooltip.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the panels; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vtt{--vtt-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vtt{' +
      '--vtt-accent:#5b5bd6;' +
      '--vtt-bg:#ffffff;' +
      '--vtt-text:#1c1d21;' +
      '--vtt-muted:#72747e;' +
      '--vtt-faint:#e7e7ec;' +
      '--vtt-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vtt-radius:10px;' +
      '--vtt-max-width:280px;' +
      '--vtt-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vtt[data-theme=dark]{' +
      '--vtt-accent:#7b7bea;' +
      '--vtt-bg:#1b1d24;' +
      '--vtt-text:#e9eaf0;' +
      '--vtt-muted:#989aa6;' +
      '--vtt-faint:#31343f;' +
      '--vtt-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vtt.SALT{position:absolute;z-index:100000;box-sizing:border-box;' +
      'background:var(--vtt-bg);color:var(--vtt-text);' +
      'font-family:var(--vtt-font);font-size:13px;line-height:1.45;font-weight:400;' +
      'border:1px solid var(--vtt-faint);border-radius:var(--vtt-radius);' +
      'box-shadow:var(--vtt-shadow);padding:7px 10px;' +
      'max-width:var(--vtt-max-width);width:max-content;pointer-events:none;' +
      'opacity:0;transform:scale(.96);' +
      'transition:opacity .12s ease,transform .15s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vtt.SALT *,.vtt.SALT *::before,.vtt.SALT *::after{box-sizing:border-box;}' +
    '.vtt.SALT.vtt-open{opacity:1;transform:none;}' +
    '.vtt.SALT.vtt-interactive{pointer-events:auto;}' +
    '.vtt.SALT[data-placement=top]{transform-origin:50% 100%;}' +
    '.vtt.SALT[data-placement=bottom]{transform-origin:50% 0%;}' +
    '.vtt.SALT[data-placement=left]{transform-origin:100% 50%;}' +
    '.vtt.SALT[data-placement=right]{transform-origin:0% 50%;}' +
    '.vtt.SALT .vtt-content{overflow-wrap:break-word;}' +
    '.vtt.SALT .vtt-content :where(a){color:var(--vtt-accent);}' +
    '.vtt.SALT .vtt-content :where(small,.vtt-muted){color:var(--vtt-muted);font-size:12px;}' +
    /* the arrow is a rotated square; each placement shows the two borders
       that face away from the panel, so the outline stays continuous */
    '.vtt.SALT .vtt-arrow{position:absolute;width:8px;height:8px;background:var(--vtt-bg);' +
      'border:0 solid var(--vtt-faint);transform:rotate(45deg);}' +
    '.vtt.SALT[data-placement=top] .vtt-arrow{bottom:-4.5px;' +
      'border-right-width:1px;border-bottom-width:1px;}' +
    '.vtt.SALT[data-placement=bottom] .vtt-arrow{top:-4.5px;' +
      'border-left-width:1px;border-top-width:1px;}' +
    '.vtt.SALT[data-placement=left] .vtt-arrow{right:-4.5px;' +
      'border-top-width:1px;border-right-width:1px;}' +
    '.vtt.SALT[data-placement=right] .vtt-arrow{left:-4.5px;' +
      'border-bottom-width:1px;border-left-width:1px;}' +
    '.vtt.SALT :where(a,button,input,select,textarea):focus{outline:none;}' +
    '.vtt.SALT :where(a,button,input,select,textarea):focus-visible{' +
      'outline:2px solid var(--vtt-accent);outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vtt.SALT,.vtt.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/tooltip.css), or set Tooltip.salt to
  // your own token / false BEFORE the first tooltip is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Tooltip.salt;
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
    // Insert before the page's own CSS so `.vtt { --vtt-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
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

  function unwatchAutoTheme(inst) {
    var i = autoThemed.indexOf(inst);
    if (i !== -1) autoThemed.splice(i, 1);
    if (autoThemed.length === 0) {
      var core = vcCore();
      if (core) core.theme.unwatch(refreshAutoThemes);
      if (ownMql) {
        if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
        else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
      }
      if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
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

  // SSR: `new Tooltip(…)` hands back one shared inert instance whose whole
  // API is a harmless no-op (same idea as the toast dummyHandle).
  var dummyInstance = null;

  function makeDummy() {
    if (dummyInstance) return dummyInstance;
    var d = { el: null, panel: null, isOpen: false, opts: {} };
    d.show = d.hide = d.toggle = d.update = d.destroy = function () { return d; };
    dummyInstance = d;
    return d;
  }

  /* ------------------------------------------------------------------ *
   * Tooltip.
   * ------------------------------------------------------------------ */

  function Tooltip(target, options) {
    if (!HAS_DOM) return makeDummy();
    var el = resolveElement(target);
    if (!el) throw new Error('Tooltip: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, Tooltip.defaults, options || {});
    this.isOpen = false;
    this._timer = null;     // pending delayed show/hide
    this._outTimer = null;  // pending display:none after the out transition
    this._destroyed = false;

    if (this.opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    this._buildPanel();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  Tooltip.prototype = {
    constructor: Tooltip,

    /* ---------------- DOM construction ---------------- */

    _buildPanel: function () {
      var p = document.createElement('div');
      p.className = 'vtt' + saltClass() +
        (this.opts.interactive ? ' vtt-interactive' : '');
      p.id = 'vtt-' + (++uid);
      p.style.display = 'none';
      if (this.opts.trigger === 'click') {
        // Click popovers are disclosure-style content, not descriptions.
        p.setAttribute('role', 'group');
        p.setAttribute('aria-label', this.opts.labels.popover);
      } else {
        p.setAttribute('role', 'tooltip');
      }
      if (this.opts.arrow !== false) {
        var arrow = document.createElement('span');
        arrow.className = 'vtt-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        p.appendChild(arrow);
        this._arrow = arrow;
      } else {
        this._arrow = null;
      }
      var body = document.createElement('div');
      body.className = 'vtt-content';
      p.appendChild(body);
      this.panel = p;
      this._body = body;
    },

    // Content is TEXT by default (rendered with textContent); `html: true`
    // is an explicit opt-in for trusted markup. Function content is
    // re-resolved on every show.
    _renderContent: function () {
      var c = this.opts.content;
      if (typeof c === 'function') c = c(this.el);
      if (c && c.nodeType === 1) {
        this._body.innerHTML = '';
        this._body.appendChild(c);
      } else if (this.opts.html) {
        this._body.innerHTML = c == null ? '' : String(c);
      } else {
        this._body.textContent = c == null ? '' : String(c);
      }
    },

    /* ---------------- event wiring ---------------- */

    _bind: function () {
      var self = this;
      var el = this.el;
      var trig = this.opts.trigger;

      this._onEnter = function () { self._scheduleShow(); };
      this._onLeave = function (e) {
        // Moving into an interactive panel keeps it open.
        if (self.opts.interactive && e.relatedTarget &&
            self.panel.contains(e.relatedTarget)) return;
        self._scheduleHide();
      };
      this._onFocusIn = function () { self.show(); }; // no delay for keyboard users
      this._onFocusOut = function (e) {
        var to = e.relatedTarget;
        if (to && (el.contains(to) || self.panel.contains(to))) return;
        self.hide();
      };
      this._onClick = function () { self.toggle(); };
      this._onPanelEnter = function () { clearTimeout(self._timer); };
      this._onPanelLeave = function (e) {
        if (e.relatedTarget && el.contains(e.relatedTarget)) return;
        self._scheduleHide();
      };
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(el) !== -1) return;
        self.hide();
      };
      this._onDocKeydown = function (e) {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        e.stopPropagation();
        var refocus = self.opts.trigger === 'click';
        self.hide();
        if (refocus && el.focus) el.focus();
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };

      if (trig === 'hover') {
        el.addEventListener('mouseenter', this._onEnter);
        el.addEventListener('mouseleave', this._onLeave);
        el.addEventListener('focusin', this._onFocusIn); // hover also shows on focus
        el.addEventListener('focusout', this._onFocusOut);
      } else if (trig === 'focus') {
        el.addEventListener('focusin', this._onFocusIn);
        el.addEventListener('focusout', this._onFocusOut);
      } else if (trig === 'click') {
        el.addEventListener('click', this._onClick);
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('aria-controls', this.panel.id);
      }
      // 'manual': nothing bound — show()/hide() only.

      if (this.opts.interactive) {
        this.panel.addEventListener('mouseenter', this._onPanelEnter);
        this.panel.addEventListener('mouseleave', this._onPanelLeave);
        if (trig === 'hover' || trig === 'focus') {
          this.panel.addEventListener('focusout', this._onFocusOut);
        }
      }
    },

    _delays: function () {
      var d = this.opts.delay;
      var base = this.opts.trigger === 'hover'
        ? { show: 80, hide: 120 } : { show: 0, hide: 0 };
      if (typeof d === 'number') return { show: d, hide: d };
      if (d && typeof d === 'object') {
        return {
          show: d.show != null ? +d.show : base.show,
          hide: d.hide != null ? +d.hide : base.hide
        };
      }
      return base;
    },

    _scheduleShow: function () {
      clearTimeout(this._timer);
      var self = this;
      var ms = this._delays().show;
      if (!ms) { this.show(); return; }
      this._timer = setTimeout(function () { self.show(); }, ms);
    },

    _scheduleHide: function () {
      clearTimeout(this._timer);
      var self = this;
      var ms = this._delays().hide;
      if (!ms) { this.hide(); return; }
      this._timer = setTimeout(function () { self.hide(); }, ms);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      this.panel.setAttribute('data-theme',
        (t === 'light' || t === 'dark') ? t : resolveAutoTheme());
    },

    /* ---------------- positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this.el;
      var r = anchor.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = this.opts.offset == null ? 8 : +this.opts.offset;
      var pad = 8;
      var place = PLACEMENTS.indexOf(this.opts.placement) !== -1
        ? this.opts.placement : 'top';

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
          // Core owns the vertical decision (clamp, <dialog> detection); a
          // tooltip centers on its anchor, so the cross axis is set below.
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
      if (this._arrow) {
        if (place === 'top' || place === 'bottom') {
          var ax = Math.min(Math.max(10, r.left + r.width / 2 - left), pw - 10);
          this._arrow.style.left = Math.round(ax - 4) + 'px';
          this._arrow.style.top = '';
        } else {
          var ay = Math.min(Math.max(10, r.top + r.height / 2 - top), ph - 10);
          this._arrow.style.top = Math.round(ay - 4) + 'px';
          this._arrow.style.left = '';
        }
      }
    },

    /* ---------------- ARIA plumbing ---------------- */

    // Append our id to any aria-describedby the page already set, and put
    // the original value back on hide.
    _addDescribedBy: function () {
      var cur = this.el.getAttribute('aria-describedby');
      this._prevDescribedBy = cur;
      var id = this.panel.id;
      if (!cur) this.el.setAttribute('aria-describedby', id);
      else if ((' ' + cur + ' ').indexOf(' ' + id + ' ') === -1) {
        this.el.setAttribute('aria-describedby', cur + ' ' + id);
      }
    },

    _removeDescribedBy: function () {
      if (this._prevDescribedBy) this.el.setAttribute('aria-describedby', this._prevDescribedBy);
      else this.el.removeAttribute('aria-describedby');
    },

    /* ---------------- public API ---------------- */

    show: function () {
      if (this._destroyed) return this;
      clearTimeout(this._timer);
      if (this.isOpen) return this;

      // If the anchor lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this.el.closest ? this.el.closest('dialog') : null;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this._renderContent();
      this._applyTheme();
      clearTimeout(this._outTimer);
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vtt-open'); });
      this.isOpen = true;

      if (this.opts.trigger === 'click') this.el.setAttribute('aria-expanded', 'true');
      else this._addDescribedBy();

      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);
      if (this.opts.trigger === 'click') {
        document.addEventListener('pointerdown', this._onDocPointer, true);
      }
      if (this.opts.onShow) this.opts.onShow(this);
      return this;
    },

    hide: function () {
      clearTimeout(this._timer);
      if (!this.isOpen) return this;
      this.isOpen = false;

      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      document.removeEventListener('pointerdown', this._onDocPointer, true);

      if (this.opts.trigger === 'click') this.el.setAttribute('aria-expanded', 'false');
      else this._removeDescribedBy();

      this.panel.classList.remove('vtt-open');
      var panel = this.panel;
      clearTimeout(this._outTimer);
      this._outTimer = setTimeout(function () { panel.style.display = 'none'; }, OUT_MS);
      if (this.opts.onHide) this.opts.onHide(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.hide() : this.show();
    },

    update: function (content) {
      if (content !== undefined) this.opts.content = content;
      if (this.isOpen) {
        this._renderContent();
        this._position();
      }
      return this;
    },

    destroy: function () {
      if (this._destroyed) return this;
      this.hide();
      this._destroyed = true;
      clearTimeout(this._timer);
      clearTimeout(this._outTimer);
      unwatchAutoTheme(this);

      var el = this.el;
      el.removeEventListener('mouseenter', this._onEnter);
      el.removeEventListener('mouseleave', this._onLeave);
      el.removeEventListener('focusin', this._onFocusIn);
      el.removeEventListener('focusout', this._onFocusOut);
      el.removeEventListener('click', this._onClick);
      if (this.opts.trigger === 'click') {
        el.removeAttribute('aria-expanded');
        el.removeAttribute('aria-controls');
      }
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      if (instances) instances.delete(el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Tooltip.version = VERSION;

  Tooltip.defaults = {
    content: '',          // string | fn(triggerEl) | DOM element
    placement: 'top',     // 'top' | 'bottom' | 'left' | 'right' (auto-flips)
    trigger: 'hover',     // 'hover' | 'click' | 'focus' | 'manual'
    delay: null,          // ms or {show, hide}; hover defaults to {show:80, hide:120}
    offset: 8,            // px gap between anchor and panel
    arrow: true,
    interactive: false,   // popover mode: stays open while hovered/focused
    html: false,          // content is TEXT by default; opt in for markup
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    styles: true,         // false = headless, no CSS ever injected
    labels: { popover: 'Popover' },
    onShow: null,
    onHide: null
  };

  Tooltip.create = function (target, options) {
    return new Tooltip(target, options);
  };

  Tooltip.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    o.content = el.getAttribute('data-vtt') || '';
    if (d.vttPlacement) o.placement = d.vttPlacement;
    if (d.vttTrigger) o.trigger = d.vttTrigger;
    if (d.vttInteractive != null) o.interactive = parseBool(d.vttInteractive);
    if (d.vttTheme) o.theme = d.vttTheme;
    if (d.vttDelay != null && d.vttDelay !== '') o.delay = +d.vttDelay;
    return o;
  }

  Tooltip.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vtt]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Tooltip(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Tooltip auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Tooltip.autoInit(); });
    } else {
      Tooltip.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Tooltip.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Tooltip, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Tooltip.css = renderCss();
  }
  Tooltip.displayName = 'Tooltip';
  Tooltip.rootClass = 'vtt';
  Tooltip.themeVars = {
    accent: '--vtt-accent',
    radius: '--vtt-radius',
    font: '--vtt-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Tooltip.varScopes = ['.vtt', '.vtt[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('tooltip', Tooltip);
  }

  return Tooltip;
});

/* ==== menu/menu.js ==== */
/*!
 * Vanilla UI Kit Menu v1.0.0
 * A single-file, zero-dependency dropdown action menu for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="menu.js"></script>
 *   <button id="more">More</button>
 *   <script>new Menu('#more', { items: [{ label: 'Rename', onSelect: fn }] })</script>
 *
 * Headless:
 *   Menu.defaults.styles = false   // no CSS injected; style .vmn-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Menu = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-menu-styles';
  var OUT_MS = 130; // keep in sync with the .vmn closing transition
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Menu.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Menu.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the menu; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vmn{--vmn-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vmn{' +
      '--vmn-accent:#5b5bd6;' +
      '--vmn-danger:#e5484d;' +
      '--vmn-bg:#ffffff;' +
      '--vmn-surface:#f2f2f5;' +
      '--vmn-text:#1c1d21;' +
      '--vmn-muted:#72747e;' +
      '--vmn-faint:#e7e7ec;' +
      '--vmn-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vmn-radius:12px;' +
      '--vmn-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vmn[data-theme=dark]{' +
      '--vmn-accent:#7b7bea;' +
      '--vmn-danger:#f2555a;' +
      '--vmn-bg:#1b1d24;' +
      '--vmn-surface:#272a33;' +
      '--vmn-text:#e9eaf0;' +
      '--vmn-muted:#989aa6;' +
      '--vmn-faint:#31343f;' +
      '--vmn-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vmn.SALT{' +
      'position:absolute;z-index:99999;box-sizing:border-box;' +
      'min-width:180px;max-width:320px;padding:6px;' +
      'background:var(--vmn-bg);color:var(--vmn-text);' +
      'font-family:var(--vmn-font);font-size:14px;line-height:1.4;' +
      'border:1px solid var(--vmn-faint);border-radius:var(--vmn-radius);' +
      'box-shadow:var(--vmn-shadow);' +
      '-webkit-user-select:none;user-select:none;' +
      'opacity:0;transform:scale(.97);' +
      'transition:opacity .11s ease,transform .13s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vmn.SALT *,.vmn.SALT *::before,.vmn.SALT *::after{box-sizing:border-box;}' +
    '.vmn.SALT.vmn-open{opacity:1;transform:none;}' +
    '.vmn.SALT .vmn-item{display:flex;align-items:center;gap:9px;width:100%;' +
      'font:inherit;color:inherit;text-align:left;background:none;border:0;' +
      'border-radius:8px;padding:7px 10px;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vmn.SALT .vmn-item:hover{background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item:focus{outline:none;background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item:focus-visible{outline:2px solid var(--vmn-accent);outline-offset:-2px;}' +
    '.vmn.SALT .vmn-item[aria-expanded=true]{background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item[aria-disabled=true]{opacity:.45;cursor:default;}' +
    '.vmn.SALT .vmn-item[aria-disabled=true]:hover,' +
    '.vmn.SALT .vmn-item[aria-disabled=true]:focus{background:none;}' +
    '.vmn.SALT .vmn-item.vmn-danger{color:var(--vmn-danger);}' +
    '.vmn.SALT .vmn-item.vmn-danger .vmn-icon{color:var(--vmn-danger);}' +
    '.vmn.SALT .vmn-icon{flex:none;width:16px;height:16px;display:grid;place-items:center;' +
      'color:var(--vmn-muted);}' +
    '.vmn.SALT .vmn-icon svg{display:block;}' +
    '.vmn.SALT .vmn-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;}' +
    '.vmn.SALT .vmn-hint{flex:none;font-size:12px;color:var(--vmn-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vmn.SALT .vmn-caret{flex:none;display:grid;place-items:center;color:var(--vmn-muted);}' +
    '.vmn.SALT .vmn-caret svg{display:block;}' +
    '.vmn.SALT .vmn-sep{height:1px;margin:6px 4px;background:var(--vmn-faint);}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vmn.SALT,.vmn.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/menu.css), or set Menu.salt to your
  // own token / false BEFORE the first menu is opened.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Menu.salt;
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
    // Insert before the page's own CSS so `.vmn { --vmn-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var CARET = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var allInstances = [];
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
    for (var i = 0; i < allInstances.length; i++) allInstances[i]._applyTheme();
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
   * Popup positioning — VC.position when core is present, else a private
   * fallback with the same approach (flip when no room, clamp, <dialog>).
   * ------------------------------------------------------------------ */

  function fallbackPosition(panel, anchor, placement) {
    placement = String(placement || 'bottom-start');
    var r = anchor.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var gap = 6, pad = 8;

    var below = placement.indexOf('top') === 0 ? false :
      (vh - r.bottom >= ph + gap || r.top < ph + gap);
    var top = below ? r.bottom + gap : r.top - ph - gap;
    var x = /-end$/.test(placement) ? r.right - pw : r.left;
    var left = Math.min(Math.max(pad, x), Math.max(pad, vw - pw - pad));

    // Inside an open <dialog> the panel must ride in the top layer with the
    // dialog (fixed, viewport coordinates); otherwise absolute in the page.
    var fixed = !!(anchor.closest && anchor.closest('dialog'));
    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
  }

  // Context menus open at pointer coordinates and flip inward at the edges.
  function positionAtPoint(panel, x, y) {
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var pad = 8;
    if (x + pw > vw - pad) x = Math.max(pad, x - pw);
    if (y + ph > vh - pad) y = Math.max(pad, y - ph);
    panel.style.position = 'absolute';
    panel.style.top = Math.round(y + window.scrollY) + 'px';
    panel.style.left = Math.round(x + window.scrollX) + 'px';
  }

  // Flyouts sit beside their parent item; -7 lines the first sub item up
  // with the parent (6px panel padding + 1px border).
  function positionSub(panel, parentBtn) {
    var r = parentBtn.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var pad = 8;
    var left = r.right + 2;
    if (left + pw > vw - pad) left = Math.max(pad, r.left - pw - 2);
    var top = Math.min(Math.max(pad, r.top - 7), Math.max(pad, vh - ph - pad));
    var fixed = !!(parentBtn.closest && parentBtn.closest('dialog'));
    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
  }

  /* ------------------------------------------------------------------ *
   * Panel building. Labels and hints are TEXT (rendered with textContent);
   * `icon` is trusted SVG markup, same contract as Toast's icons.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function hasSubmenu(rec, it) {
    // One level of nesting only — `items` inside a flyout render as plain items.
    return !rec.isSub && Array.isArray(it.items) && it.items.length > 0;
  }

  function buildPanel(inst, items, isSub) {
    var el = document.createElement('div');
    el.className = 'vmn' + saltClass() + (isSub ? ' vmn-sub' : '');
    el.setAttribute('role', 'menu');
    el.tabIndex = -1;
    var rec = { el: el, items: [], buttons: [], isSub: !!isSub };

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.type === 'separator') {
        var sep = document.createElement('div');
        sep.className = 'vmn-sep';
        sep.setAttribute('role', 'separator');
        el.appendChild(sep);
        continue;
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vmn-item' + (it.danger ? ' vmn-danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-idx', String(rec.items.length));
      btn.tabIndex = -1;
      if (it.disabled) btn.setAttribute('aria-disabled', 'true');
      if (it.icon) {
        var icon = document.createElement('span');
        icon.className = 'vmn-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = String(it.icon); // trusted markup by contract
        btn.appendChild(icon);
      }
      var label = document.createElement('span');
      label.className = 'vmn-label';
      label.textContent = it.label == null ? '' : String(it.label);
      btn.appendChild(label);
      if (hasSubmenu(rec, it)) {
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        var caret = document.createElement('span');
        caret.className = 'vmn-caret';
        caret.innerHTML = CARET;
        btn.appendChild(caret);
      } else if (it.hint) {
        var hint = document.createElement('span');
        hint.className = 'vmn-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = String(it.hint);
        btn.appendChild(hint);
      }
      rec.items.push(it);
      rec.buttons.push(btn);
      el.appendChild(btn);
    }

    el.addEventListener('click', function (e) { inst._handleClick(rec, e); });
    el.addEventListener('keydown', function (e) { inst._handleKeydown(rec, e); });
    el.addEventListener('mouseover', function (e) { inst._handleOver(rec, e); });
    return rec;
  }

  // Next enabled index from `from` in direction `dir`, wrapping; -1 if none.
  function step(rec, from, dir) {
    var n = rec.buttons.length;
    var i = from;
    for (var k = 0; k < n; k++) {
      i = ((i + dir) % n + n) % n;
      if (!rec.items[i].disabled) return i;
    }
    return -1;
  }

  var openInst = null; // the single open root menu

  var dummyMenu = {
    el: null,
    trigger: null,
    isOpen: false,
    open: function () { return dummyMenu; },
    close: function () { return dummyMenu; },
    toggle: function () { return dummyMenu; },
    update: function () { return dummyMenu; },
    destroy: function () { return dummyMenu; }
  };

  /* ------------------------------------------------------------------ *
   * Menu.
   * ------------------------------------------------------------------ */

  function Menu(trigger, options) {
    if (!HAS_DOM) return dummyMenu;
    var el = null;
    if (trigger != null) { // null trigger = detached (Menu.open at coordinates)
      el = resolveElement(trigger);
      if (!el) throw new Error('Menu: trigger element not found: ' + trigger);
      var existing = instances && instances.get(el);
      if (existing) existing.destroy();
    }
    options = options || {};
    this.trigger = el;
    this.el = null; // the panel, once first opened
    this.opts = {};
    for (var k in Menu.defaults) this.opts[k] = Menu.defaults[k];
    for (k in options) if (options[k] !== undefined) this.opts[k] = options[k];
    this._items = Array.isArray(this.opts.items) ? this.opts.items : [];
    this.isOpen = false;
    this._root = null;      // {el, items, buttons, isSub}
    this._sub = null;       // open flyout record
    this._subBtn = null;    // the flyout's parent item
    this._at = null;        // {x,y} viewport coords for detached menus
    this._transient = false;
    this._typeBuf = '';
    this._typeTimer = null;
    this._closeTimer = null;
    this._bind();
    if (el) {
      el.setAttribute('aria-haspopup', 'menu');
      el.setAttribute('aria-expanded', 'false');
      if (instances) instances.set(el, this);
    }
    allInstances.push(this);
  }

  Menu.prototype = {
    constructor: Menu,

    /* ---------------- wiring ---------------- */

    _bind: function () {
      var self = this;
      this._onTriggerClick = function (e) {
        var wasOpen = self.isOpen;
        self.toggle();
        // e.detail === 0 → the click came from Enter/Space on the trigger;
        // keyboard opens land focus on the first item.
        if (!wasOpen && self.isOpen && e.detail === 0) self._focusEdge(self._root, 1);
      };
      this._onTriggerKeydown = function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          self.open();
          self._focusEdge(self._root, e.key === 'ArrowDown' ? 1 : -1);
        }
      };
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (self._root && path.indexOf(self._root.el) !== -1) return;
        if (self._sub && path.indexOf(self._sub.el) !== -1) return;
        if (self.trigger && path.indexOf(self.trigger) !== -1) return;
        self.close(false);
      };
      this._onDocKeydown = function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); self.close(true); }
      };
      this._onWinScroll = function () {
        // Detached menus keep their page coordinates; anchored ones track.
        if (self.isOpen && self.trigger) self._position();
      };
      if (this.trigger) {
        this.trigger.addEventListener('click', this._onTriggerClick);
        this.trigger.addEventListener('keydown', this._onTriggerKeydown);
      }
    },

    /* ---------------- theming ---------------- */

    _resolvedTheme: function () {
      var t = this.opts.theme;
      return (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    },

    _applyTheme: function () {
      var t = this._resolvedTheme();
      if (this._root) this._root.el.setAttribute('data-theme', t);
      if (this._sub) this._sub.el.setAttribute('data-theme', t);
    },

    /* ---------------- positioning ---------------- */

    _position: function () {
      if (!this._root) return;
      var panel = this._root.el;
      if (!this.trigger) {
        positionAtPoint(panel, this._at ? this._at.x : 0, this._at ? this._at.y : 0);
      } else if (window.VC && window.VC.position) {
        var placement = String(this.opts.placement || 'bottom-start');
        var res = window.VC.position(panel, this.trigger, {
          prefer: placement.indexOf('top') === 0 ? 'above' : undefined
        });
        if (res && /-end$/.test(placement)) {
          // VC.position is start-aligned; shift for the -end placements.
          var r = res.anchorRect, pw = panel.offsetWidth;
          var vw = document.documentElement.clientWidth;
          var left = Math.min(Math.max(8, r.right - pw), Math.max(8, vw - pw - 8));
          panel.style.left = Math.round(left + (res.fixed ? 0 : window.scrollX)) + 'px';
        }
      } else {
        fallbackPosition(panel, this.trigger, this.opts.placement);
      }
      if (this._sub) positionSub(this._sub.el, this._subBtn);
    },

    /* ---------------- focus / keyboard ---------------- */

    _focusIdx: function (rec, i) {
      if (rec && i >= 0 && rec.buttons[i]) rec.buttons[i].focus();
    },

    _focusEdge: function (rec, dir) {
      if (!rec) return;
      this._focusIdx(rec, dir > 0 ? step(rec, -1, 1) : step(rec, 0, -1));
    },

    _handleKeydown: function (rec, e) {
      var key = e.key;
      if (key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
        return;
      }
      if (key === 'Tab') { this.close(false); return; } // let focus move on
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      var cur = btn && rec.el.contains(btn) ? +btn.getAttribute('data-idx') : -1;
      var it = cur >= 0 ? rec.items[cur] : null;

      if (key === 'ArrowDown') {
        e.preventDefault();
        this._focusIdx(rec, step(rec, cur, 1));
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        this._focusIdx(rec, cur === -1 ? step(rec, 0, -1) : step(rec, cur, -1));
      } else if (key === 'Home') {
        e.preventDefault();
        this._focusEdge(rec, 1);
      } else if (key === 'End') {
        e.preventDefault();
        this._focusEdge(rec, -1);
      } else if (key === 'ArrowRight') {
        if (it && hasSubmenu(rec, it) && !it.disabled) {
          e.preventDefault();
          this._openSub(btn, it, true);
        }
      } else if (key === 'ArrowLeft') {
        if (rec.isSub) {
          e.preventDefault();
          var pb = this._subBtn;
          this._closeSub();
          if (pb) pb.focus();
        }
      } else if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (cur >= 0) this._activate(rec, cur);
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this._typeahead(rec, cur, key);
      }
    },

    // First-letter typeahead; a repeated single letter cycles its matches.
    _typeahead: function (rec, cur, ch) {
      var self = this;
      clearTimeout(this._typeTimer);
      this._typeTimer = setTimeout(function () { self._typeBuf = ''; }, 500);
      this._typeBuf += ch.toLowerCase();
      var buf = this._typeBuf;
      var repeated = buf.length > 1 && /^(.)\1+$/.test(buf);
      var needle = repeated ? buf.charAt(0) : buf;
      var start = (repeated || buf.length === 1) ? cur + 1 : cur;
      var n = rec.buttons.length;
      for (var k = 0; k < n; k++) {
        var i = ((start + k) % n + n) % n;
        var itm = rec.items[i];
        if (itm.disabled) continue;
        if (String(itm.label || '').toLowerCase().indexOf(needle) === 0) {
          this._focusIdx(rec, i);
          return;
        }
      }
    },

    /* ---------------- pointer ---------------- */

    _handleClick: function (rec, e) {
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      if (!btn || !rec.el.contains(btn)) return;
      this._activate(rec, +btn.getAttribute('data-idx'));
    },

    _handleOver: function (rec, e) {
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      if (!btn || !rec.el.contains(btn)) return;
      var it = rec.items[+btn.getAttribute('data-idx')];
      if (!it) return;
      if (!it.disabled) btn.focus(); // hover moves the roving focus
      if (!rec.isSub) {
        if (hasSubmenu(rec, it) && !it.disabled) {
          if (this._subBtn !== btn) this._openSub(btn, it, false);
        } else {
          this._closeSub();
        }
      }
    },

    _activate: function (rec, idx) {
      var it = rec.items[idx];
      if (!it || it.disabled) return;
      if (hasSubmenu(rec, it)) {
        // Click / Enter / Space on a flyout parent toggles the flyout.
        if (this._subBtn === rec.buttons[idx]) this._closeSub();
        else this._openSub(rec.buttons[idx], it, true);
        return;
      }
      if (it.onSelect) it.onSelect(it, this);
      if (this.trigger) {
        this.trigger.dispatchEvent(new CustomEvent('menu:select', {
          bubbles: true,
          detail: { item: it, menu: this }
        }));
      }
      if (this.opts.closeOnSelect !== false) this.close(true);
    },

    /* ---------------- submenu ---------------- */

    _openSub: function (parentBtn, item, focusFirst) {
      this._closeSub();
      var rec = buildPanel(this, item.items, true);
      rec.el.setAttribute('data-theme', this._resolvedTheme());
      // Class added before insertion — flyouts appear instantly, only the
      // root panel plays the entry transition.
      rec.el.classList.add('vmn-open');
      this._root.el.parentNode.appendChild(rec.el);
      this._sub = rec;
      this._subBtn = parentBtn;
      parentBtn.setAttribute('aria-expanded', 'true');
      positionSub(rec.el, parentBtn);
      if (focusFirst) this._focusEdge(rec, 1);
    },

    _closeSub: function () {
      if (!this._sub) return;
      if (this._subBtn) this._subBtn.setAttribute('aria-expanded', 'false');
      if (this._sub.el.parentNode) this._sub.el.parentNode.removeChild(this._sub.el);
      this._sub = null;
      this._subBtn = null;
    },

    /* ---------------- public API ---------------- */

    open: function () {
      if (this.isOpen) return this;
      if (openInst && openInst !== this) openInst.close(false); // one root menu at a time
      if (this.opts.styles !== false) {
        if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
        else injectOwnStyles();
      }
      ensureThemeWatch();
      clearTimeout(this._closeTimer);

      if (!this._root) this._root = buildPanel(this, this._items, false);
      var panel = this._root.el;
      this.el = panel;
      panel.setAttribute('data-theme', this._resolvedTheme());

      // If the trigger lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the menu.
      var host = this.trigger && this.trigger.closest ? this.trigger.closest('dialog') : null;
      var parent = host || document.body;
      if (panel.parentNode !== parent) parent.appendChild(panel);
      panel.style.display = '';
      this._position();
      requestAnimationFrame(function () { panel.classList.add('vmn-open'); });

      this.isOpen = true;
      openInst = this;
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', this._onDocPointer, true);
      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);
      if (this.opts.onOpen) this.opts.onOpen(this);
      return this;
    },

    close: function (refocus) {
      if (!this.isOpen) return this;
      this.isOpen = false;
      if (openInst === this) openInst = null;
      this._closeSub();
      clearTimeout(this._typeTimer);
      this._typeBuf = '';
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      var panel = this._root && this._root.el;
      var focusInside = !!(panel && panel.contains(document.activeElement));
      if (panel) {
        panel.classList.remove('vmn-open');
        var self = this;
        clearTimeout(this._closeTimer);
        this._closeTimer = setTimeout(function () {
          panel.style.display = 'none';
          if (self._transient) self.destroy(); // Menu.open() menus are one-shot
        }, OUT_MS);
      }
      // refocus === false means "focus is moving elsewhere, leave it alone".
      if (this.trigger && refocus !== false && (refocus || focusInside)) this.trigger.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close() : this.open();
    },

    update: function (items) {
      this._items = Array.isArray(items) ? items : [];
      this.opts.items = this._items;
      var wasOpen = this.isOpen;
      var hadFocus = wasOpen && this._root && this._root.el.contains(document.activeElement);
      if (wasOpen) this.close(false);
      clearTimeout(this._closeTimer);
      if (this._root && this._root.el.parentNode) {
        this._root.el.parentNode.removeChild(this._root.el);
      }
      this._root = null;
      this.el = null;
      if (wasOpen) {
        this.open();
        if (hadFocus) this._focusEdge(this._root, 1);
      }
      return this;
    },

    destroy: function () {
      this._transient = false; // the pending close timer must not re-enter
      this.close(false);
      clearTimeout(this._closeTimer);
      clearTimeout(this._typeTimer);
      if (this._root && this._root.el.parentNode) {
        this._root.el.parentNode.removeChild(this._root.el);
      }
      this._root = null;
      this.el = null;
      if (this.trigger) {
        this.trigger.removeEventListener('click', this._onTriggerClick);
        this.trigger.removeEventListener('keydown', this._onTriggerKeydown);
        this.trigger.removeAttribute('aria-haspopup');
        this.trigger.removeAttribute('aria-expanded');
        if (instances) instances.delete(this.trigger);
      }
      var i = allInstances.indexOf(this);
      if (i !== -1) allInstances.splice(i, 1);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Menu.version = '1.0.0';
  Menu.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Menu, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Menu.css = renderCss();
  }

  Menu.defaults = {
    items: [],                // [{label, icon, hint, danger, disabled, onSelect, items} | {type:'separator'}]
    placement: 'bottom-start', // bottom|top - start|end; flips when out of room
    closeOnSelect: true,
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    styles: true,             // false = headless, no CSS ever injected
    onOpen: null,
    onClose: null
  };

  Menu.create = function (trigger, options) {
    return new Menu(trigger, options);
  };

  Menu.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  // Menu.open(x, y, items | opts) — a one-shot menu at viewport coordinates
  // (pair with `contextmenu` events: e.clientX / e.clientY). Destroys itself
  // on close; returns the instance.
  Menu.open = function (x, y, itemsOrOpts) {
    if (!HAS_DOM) return dummyMenu;
    var opts = Array.isArray(itemsOrOpts) ? { items: itemsOrOpts } : (itemsOrOpts || {});
    var m = new Menu(null, opts);
    m._transient = true;
    m._at = { x: +x || 0, y: +y || 0 };
    m.open();
    m._focusEdge(m._root, 1); // so Esc / arrows / typeahead work immediately
    return m;
  };

  Menu.closeAll = function () {
    if (openInst) openInst.close(false);
    return Menu;
  };

  // Declarative form for autoInit: `<button data-vmn="#file-menu">` where the
  // value selects a <template> (or any element) holding the items — <hr> is a
  // separator, every other child is an item. `data-label` (or the child's own
  // text) is the label; data-hint / data-value map through; data-danger and
  // data-disabled are flags; a nested <ul>/<menu> makes it a submenu of its
  // children. Selection dispatches a bubbling 'menu:select' CustomEvent on
  // the trigger with { item, menu } in `detail`.
  function parseChildren(children, isSub) {
    var items = [];
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.tagName === 'HR') {
        items.push({ type: 'separator' });
        continue;
      }
      var list = null;
      if (!isSub) {
        for (var j = 0; j < el.children.length; j++) {
          if (el.children[j].tagName === 'UL' || el.children[j].tagName === 'MENU') {
            list = el.children[j];
            break;
          }
        }
      }
      var label = el.getAttribute('data-label');
      if (label == null) {
        // The element's own text, minus any nested list markup.
        var clone = el.cloneNode(true);
        var l2 = clone.querySelector('ul,menu');
        if (l2 && l2.parentNode) l2.parentNode.removeChild(l2);
        label = clone.textContent.replace(/\s+/g, ' ').trim();
      }
      var item = {
        label: label,
        hint: el.getAttribute('data-hint') || undefined,
        value: el.getAttribute('data-value') || undefined,
        danger: el.hasAttribute('data-danger'),
        disabled: el.hasAttribute('data-disabled') || el.disabled === true
      };
      if (list) item.items = parseChildren(list.children, true);
      items.push(item);
    }
    return items;
  }

  Menu.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vmn]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        var src = document.querySelector(els[i].getAttribute('data-vmn'));
        if (!src) continue;
        created.push(new Menu(els[i], {
          items: parseChildren((src.content || src).children, false),
          placement: els[i].getAttribute('data-placement') || Menu.defaults.placement
        }));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Menu auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Menu.autoInit(); });
    } else {
      Menu.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Menu.displayName = 'Menu';
  Menu.rootClass = 'vmn';
  Menu.themeVars = {
    accent: '--vmn-accent',
    radius: '--vmn-radius',
    font: '--vmn-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Menu.varScopes = ['.vmn', '.vmn[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('menu', Menu);
  }

  return Menu;
});

/* ==== modal/modal.js ==== */
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

/* ==== tabs/tabs.js ==== */
/*!
 * Vanilla UI Kit Tabs v1.0.0
 * A single-file, zero-dependency tabs widget for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="tabs.js"></script>
 *   <div id="tabs"><nav><button>A</button><button>B</button></nav>
 *     <section>Panel A</section><section>Panel B</section></div>
 *   <script>new Tabs('#tabs')</script>
 *
 * Or zero-JS:
 *   <div data-vtb>…same markup…</div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Tabs = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-tabs-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Tabs.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Tabs.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the tabs; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vtb{--vtb-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vtb{' +
      '--vtb-accent:#5b5bd6;' +
      '--vtb-text:#1c1d21;' +
      '--vtb-muted:#72747e;' +
      '--vtb-faint:#e7e7ec;' +
      '--vtb-radius:8px;' +
      '--vtb-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vtb[data-theme=dark]{' +
      '--vtb-accent:#7b7bea;' +
      '--vtb-text:#e9eaf0;' +
      '--vtb-muted:#989aa6;' +
      '--vtb-faint:#31343f;}' +
    '.vtb.SALT{font-family:var(--vtb-font);color:var(--vtb-text);}' +
    '.vtb.SALT .vtb-list{position:relative;display:flex;align-items:stretch;gap:2px;' +
      'margin:0;padding:0;list-style:none;box-sizing:border-box;' +
      'border-bottom:1px solid var(--vtb-faint);}' +
    '.vtb.SALT .vtb-tab{font:inherit;font-family:var(--vtb-font);font-size:14px;' +
      'font-weight:500;line-height:1.3;color:var(--vtb-muted);background:none;' +
      'border:0;border-radius:var(--vtb-radius) var(--vtb-radius) 0 0;' +
      'padding:10px 14px;margin:0;cursor:pointer;white-space:nowrap;' +
      'text-decoration:none;box-sizing:border-box;' +
      'transition:color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vtb.SALT .vtb-tab:hover{color:var(--vtb-text);}' +
    '.vtb.SALT .vtb-tab[aria-selected=true]{color:var(--vtb-accent);font-weight:600;}' +
    '.vtb.SALT .vtb-tab[disabled]{color:var(--vtb-muted);opacity:.4;cursor:not-allowed;}' +
    '.vtb.SALT .vtb-tab:focus{outline:none;}' +
    '.vtb.SALT .vtb-tab:focus-visible{outline:2px solid var(--vtb-accent);outline-offset:-2px;}' +
    /* the ink bar — one element that slides between tabs (JS sets transform/size) */
    '.vtb.SALT .vtb-ink{position:absolute;left:0;bottom:-1px;width:0;height:2px;' +
      'background:var(--vtb-accent);border-radius:1px;pointer-events:none;' +
      'transition:transform .22s cubic-bezier(.4,0,.2,1),width .22s cubic-bezier(.4,0,.2,1),' +
      'height .22s cubic-bezier(.4,0,.2,1);}' +
    '.vtb.SALT .vtb-panel{padding-top:14px;}' +
    '.vtb.SALT .vtb-panel:focus{outline:none;}' +
    '.vtb.SALT .vtb-panel:focus-visible{outline:2px solid var(--vtb-accent);' +
      'outline-offset:2px;border-radius:2px;}' +
    /* vertical: rail on the left, ink rides the right edge of the rail */
    '.vtb.SALT.vtb-vertical{display:flex;align-items:flex-start;gap:24px;}' +
    '.vtb.SALT.vtb-vertical .vtb-list{flex:none;flex-direction:column;align-items:stretch;' +
      'border-bottom:0;border-right:1px solid var(--vtb-faint);}' +
    '.vtb.SALT.vtb-vertical .vtb-tab{text-align:left;' +
      'border-radius:var(--vtb-radius) 0 0 var(--vtb-radius);}' +
    '.vtb.SALT.vtb-vertical .vtb-ink{left:auto;right:-1px;bottom:auto;top:0;' +
      'width:2px;height:0;}' +
    '.vtb.SALT.vtb-vertical .vtb-panel{flex:1;min-width:0;padding-top:0;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vtb.SALT .vtb-tab,.vtb.SALT .vtb-ink{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/tabs.css), or set Tabs.salt to your
  // own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Tabs.salt;
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
    // Insert before the page's own CSS so `.vtb { --vtb-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
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

  function unwatchAutoTheme(inst) {
    var i = autoThemed.indexOf(inst);
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

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    return out;
  }

  function containsAll(node, els) {
    for (var i = 0; i < els.length; i++) {
      if (!node.contains(els[i])) return false;
    }
    return true;
  }

  // Canonical markup: first element child = the tab strip (its buttons/links
  // in order), following siblings = the panels in the same order. Authors
  // with custom structure pair explicitly via data-vtb-tab / data-vtb-panel
  // (matching values, or valueless attributes paired by document order).
  function parseMarkup(container) {
    var tabs = [], panels = [], list = null, i, j;
    var expl = container.querySelectorAll('[data-vtb-tab]');
    if (expl.length) {
      var pool = container.querySelectorAll('[data-vtb-panel]');
      for (i = 0; i < expl.length; i++) {
        var key = expl[i].getAttribute('data-vtb-tab');
        var panel = null;
        if (key) {
          for (j = 0; j < pool.length; j++) {
            if (pool[j].getAttribute('data-vtb-panel') === key) { panel = pool[j]; break; }
          }
        } else {
          panel = pool[i] || null;
        }
        if (!panel) continue;
        tabs.push(expl[i]);
        panels.push(panel);
      }
      // The tablist is the nearest ancestor holding ALL the tabs, so
      // per-tab wrappers (<li>, <span>) don't get mistaken for the strip.
      list = tabs.length ? tabs[0].parentNode : null;
      while (list && list !== container && !containsAll(list, tabs)) {
        list = list.parentNode;
      }
    } else {
      var kids = container.children;
      if (kids.length >= 2) {
        list = kids[0];
        var btns = list.querySelectorAll('button,a,[role=tab]');
        for (i = 0; i < btns.length && i + 1 < kids.length; i++) {
          tabs.push(btns[i]);
          panels.push(kids[i + 1]);
        }
      }
    }
    return { list: list, tabs: tabs, panels: panels };
  }

  // Builder mode: labels/content are TEXT by default (rendered with
  // textContent); `html: true` is an explicit opt-in for trusted markup.
  function buildDom(container, items) {
    var list = document.createElement('nav');
    var tabs = [], panels = [], i;
    for (i = 0; i < items.length; i++) {
      var item = items[i] || {};
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.label == null ? 'Tab ' + (i + 1) : String(item.label);
      if (item.disabled) btn.disabled = true;
      if (item.active) btn.setAttribute('data-vtb-active', '');
      list.appendChild(btn);
      tabs.push(btn);

      var panel = document.createElement('section');
      var c = item.content;
      if (c && c.nodeType === 1) panel.appendChild(c);
      else if (item.html) panel.innerHTML = c == null ? '' : String(c);
      else panel.textContent = c == null ? '' : String(c);
      panels.push(panel);
    }
    container.appendChild(list);
    for (i = 0; i < panels.length; i++) container.appendChild(panels[i]);
    return { list: list, tabs: tabs, panels: panels };
  }

  var DEFAULTS = {
    tabs: null,          // [{label, content, html?, disabled?, active?}] = builder mode
    active: null,        // initial index; null → the [data-vtb-active] tab, else 0
    vertical: false,     // vertical rail + ArrowUp/ArrowDown
    activation: 'auto',  // 'auto' (focus selects) | 'manual' (Enter/Space selects)
    theme: 'auto',       // 'auto' | 'light' | 'dark'
    styles: true,        // false = headless: no CSS injected, style .vtb-* yourself
    onChange: null       // fn(index, tabs)
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    list: null,
    tabs: [],
    panels: [],
    active: -1,
    select: function () { return dummyInstance; },
    getActive: function () { return -1; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Tabs.
   * ------------------------------------------------------------------ */

  function Tabs(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Tabs: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this.active = -1;
    this._uid = ++uid;
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._built = null;

    if (this.opts.styles !== false) injectStyles();

    var builder = this.opts.tabs && this.opts.tabs.length;
    var parts = builder ? buildDom(el, this.opts.tabs) : parseMarkup(el);
    if (!parts.list || !parts.tabs.length) {
      throw new Error('Tabs: no tabs found in container');
    }
    this.list = parts.list;
    this.tabs = parts.tabs;
    this.panels = parts.panels;
    if (builder) this._built = [this.list].concat(this.panels);

    this._wire();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._select(this._initialIndex(), false);
  }

  Tabs.prototype = {
    constructor: Tabs,

    /* ---------------- attribute bookkeeping ---------------- */

    _record: function (el, name) {
      var s = this._saved;
      for (var i = 0; i < s.length; i++) {
        if (s[i].el === el && s[i].name === name) return;
      }
      s.push({ el: el, name: name, value: el.getAttribute(name) });
    },

    _setAttr: function (el, name, value) {
      this._record(el, name);
      el.setAttribute(name, value);
    },

    _addClass: function (el, cls) {
      el.classList.add(cls);
      this._classes.push([el, cls]);
    },

    _ensureId: function (el, suffix) {
      if (!el.id) this._setAttr(el, 'id', 'vtb-' + this._uid + '-' + suffix);
      return el.id;
    },

    /* ---------------- setup ---------------- */

    _wire: function () {
      var s = saltToken(), i;
      this._addClass(this.el, 'vtb');
      if (s) this._addClass(this.el, s);
      if (this.opts.vertical) this._addClass(this.el, 'vtb-vertical');

      this._addClass(this.list, 'vtb-list');
      this._setAttr(this.list, 'role', 'tablist');
      if (this.opts.vertical) this._setAttr(this.list, 'aria-orientation', 'vertical');

      for (i = 0; i < this.tabs.length; i++) {
        var tab = this.tabs[i], panel = this.panels[i];
        this._addClass(tab, 'vtb-tab');
        this._addClass(panel, 'vtb-panel');
        var pid = this._ensureId(panel, 'panel-' + i);
        var tid = this._ensureId(tab, 'tab-' + i);
        this._setAttr(tab, 'role', 'tab');
        this._setAttr(tab, 'aria-selected', 'false');
        this._setAttr(tab, 'aria-controls', pid);
        this._setAttr(tab, 'tabindex', '-1');
        // Enhanced <button>s must not submit a surrounding form.
        if (tab.tagName === 'BUTTON' && !tab.getAttribute('type')) {
          this._setAttr(tab, 'type', 'button');
        }
        this._setAttr(panel, 'role', 'tabpanel');
        this._setAttr(panel, 'aria-labelledby', tid);
        this._setAttr(panel, 'tabindex', '0');
        this._record(panel, 'hidden');
        panel.hidden = true;
      }

      this._ink = document.createElement('span');
      this._ink.className = 'vtb-ink';
      this._ink.setAttribute('aria-hidden', 'true');
      this.list.appendChild(this._ink);
    },

    _bind: function () {
      var self = this;
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this._onResize = function () { self._moveInk(); };
      this.list.addEventListener('click', this._onClick);
      this.list.addEventListener('keydown', this._onKeydown);
      window.addEventListener('resize', this._onResize);
    },

    _initialIndex: function () {
      var i = this.opts.active, n = this.tabs.length, j;
      if (i == null) {
        for (j = 0; j < n; j++) {
          if (this.tabs[j].hasAttribute('data-vtb-active')) { i = j; break; }
        }
      }
      i = Math.floor(+i) || 0;
      if (i < 0 || i >= n) i = 0;
      if (this._isDisabled(this.tabs[i])) i = this._step(i, 1);
      return i;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _isDisabled: function (tab) {
      return tab.disabled === true || tab.hasAttribute('disabled') ||
        tab.getAttribute('aria-disabled') === 'true';
    },

    // Next enabled index from `from` in `dir`, wrapping; `from` if none.
    _step: function (from, dir) {
      var n = this.tabs.length;
      for (var k = 1; k <= n; k++) {
        var j = ((from + dir * k) % n + n) % n;
        if (!this._isDisabled(this.tabs[j])) return j;
      }
      return from;
    },

    _tabFromEvent: function (e) {
      var node = e.target;
      while (node && node !== this.list) {
        if (this.tabs.indexOf(node) !== -1) return node;
        node = node.parentNode;
      }
      return null;
    },

    _handleClick: function (e) {
      var tab = this._tabFromEvent(e);
      if (!tab) return;
      if (tab.tagName === 'A') e.preventDefault(); // tabs, not navigation
      if (this._isDisabled(tab)) return;
      this._select(this.tabs.indexOf(tab), true);
    },

    _handleKeydown: function (e) {
      var tab = this._tabFromEvent(e);
      if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
      var i = this.tabs.indexOf(tab);
      var nextKey = this.opts.vertical ? 'ArrowDown' : 'ArrowRight';
      var prevKey = this.opts.vertical ? 'ArrowUp' : 'ArrowLeft';
      var j = -1;
      if (e.key === nextKey) j = this._step(i, 1);
      else if (e.key === prevKey) j = this._step(i, -1);
      else if (e.key === 'Home') j = this._step(this.tabs.length - 1, 1); // first enabled
      else if (e.key === 'End') j = this._step(0, -1);                    // last enabled
      else if (e.key === 'Enter' || e.key === ' ') {
        // 'auto' already selected on focus; buttons also fire click natively.
        if (this.opts.activation === 'manual') {
          e.preventDefault();
          this._select(i, true);
        }
        return;
      } else return;
      e.preventDefault();
      this.tabs[j].focus();
      if (this.opts.activation !== 'manual') this._select(j, true);
    },

    _moveInk: function () {
      var tab = this.tabs[this.active];
      if (!tab || !this._ink) return;
      var s = this._ink.style;
      if (this.opts.vertical) {
        s.height = tab.offsetHeight + 'px';
        s.transform = 'translateY(' + tab.offsetTop + 'px)';
      } else {
        s.width = tab.offsetWidth + 'px';
        s.transform = 'translateX(' + tab.offsetLeft + 'px)';
      }
    },

    /* ---------------- public API ---------------- */

    _select: function (i, fire) {
      i = Math.floor(+i);
      var tab = this.tabs[i];
      if (!tab || this._isDisabled(tab)) return this;
      var prev = this.active;
      this.active = i;
      for (var j = 0; j < this.tabs.length; j++) {
        var sel = j === i;
        this.tabs[j].setAttribute('aria-selected', sel ? 'true' : 'false');
        this.tabs[j].setAttribute('tabindex', sel ? '0' : '-1'); // roving tabindex
        this.panels[j].hidden = !sel;
      }
      this._moveInk();
      if (fire && prev !== i) {
        if (this.opts.onChange) this.opts.onChange(i, this);
        this.el.dispatchEvent(new CustomEvent('tabs:change', {
          bubbles: true,
          detail: { index: i, tabs: this }
        }));
      }
      return this;
    },

    select: function (i) {
      return this._select(i, true);
    },

    getActive: function () {
      return this.active;
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      this.list.removeEventListener('click', this._onClick);
      this.list.removeEventListener('keydown', this._onKeydown);
      window.removeEventListener('resize', this._onResize);
      if (this._ink.parentNode) this._ink.parentNode.removeChild(this._ink);
      var i;
      if (this._built) {
        for (i = 0; i < this._built.length; i++) {
          var n = this._built[i];
          if (n.parentNode) n.parentNode.removeChild(n);
        }
      }
      // Put back every attribute we touched, then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Tabs.version = VERSION;
  Tabs.defaults = DEFAULTS;

  Tabs.create = function (target, options) {
    return new Tabs(target, options);
  };

  Tabs.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.active != null && d.active !== '') o.active = +d.active;
    if (d.vertical != null) o.vertical = parseBool(d.vertical);
    if (d.activation) o.activation = d.activation;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Tabs.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vtb]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Tabs(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Tabs auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Tabs.autoInit(); });
    } else {
      Tabs.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Tabs.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Tabs, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Tabs.css = renderCss();
  }
  Tabs.displayName = 'Tabs';
  Tabs.rootClass = 'vtb';
  Tabs.themeVars = {
    accent: '--vtb-accent',
    radius: '--vtb-radius',
    font: '--vtb-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Tabs.varScopes = ['.vtb', '.vtb[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('tabs', Tabs);
  }

  return Tabs;
});

/* ==== select/select.js ==== */
/*!
 * Vanilla UI Kit Select v1.0.0
 * A single-file, zero-dependency styleable <select> replacement for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="select.js"></script>
 *   <select id="fruit">…</select>
 *   <script>new Select('#fruit', { searchable: true })</script>
 *
 * Or zero-JS:
 *   <select data-vsel data-vsel-searchable>…</select>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Select = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-select-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Select.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Select.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vsel{--vsel-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsel{' +
      '--vsel-accent:#5b5bd6;' +
      '--vsel-on-accent:#ffffff;' +
      '--vsel-bg:#ffffff;' +
      '--vsel-surface:#f2f2f5;' +
      '--vsel-text:#1c1d21;' +
      '--vsel-muted:#72747e;' +
      '--vsel-faint:#e7e7ec;' +
      '--vsel-accent-soft:rgba(91,91,214,.13);' +
      '--vsel-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vsel-radius:12px;' +
      '--vsel-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsel[data-theme=dark]{' +
      '--vsel-accent:#7b7bea;' +
      '--vsel-on-accent:#131418;' +
      '--vsel-bg:#1b1d24;' +
      '--vsel-surface:#272a33;' +
      '--vsel-text:#e9eaf0;' +
      '--vsel-muted:#989aa6;' +
      '--vsel-faint:#31343f;' +
      '--vsel-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vsel{' +
      '--vsel-accent-soft:color-mix(in srgb,var(--vsel-accent) 14%,transparent);}}' +
    '.vsel.SALT{position:relative;display:inline-block;box-sizing:border-box;min-width:220px;' +
      'color:var(--vsel-text);font-family:var(--vsel-font);font-size:14px;line-height:1.35;' +
      'text-align:left;}' +
    '.vsel.SALT *,.vsel.SALT *::before,.vsel.SALT *::after{box-sizing:border-box;}' +
    /* control */
    '.vsel.SALT .vsel-control{display:flex;align-items:center;gap:6px;min-height:38px;' +
      'padding:5px 8px 5px 12px;background:var(--vsel-bg);border:1px solid var(--vsel-faint);' +
      'border-radius:10px;cursor:pointer;-webkit-user-select:none;user-select:none;' +
      'transition:border-color .12s ease,box-shadow .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-control:focus{outline:none;}' +
    '.vsel.SALT .vsel-control:focus-visible{border-color:var(--vsel-accent);' +
      'box-shadow:0 0 0 3px var(--vsel-accent-soft);}' +
    '.vsel.SALT.is-open .vsel-control{border-color:var(--vsel-accent);' +
      'box-shadow:0 0 0 3px var(--vsel-accent-soft);}' +
    '.vsel.SALT.is-disabled .vsel-control{opacity:.55;cursor:not-allowed;' +
      'background:var(--vsel-surface);}' +
    '.vsel.SALT .vsel-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
      'white-space:nowrap;}' +
    '.vsel.SALT .vsel-value.is-placeholder{color:var(--vsel-muted);}' +
    /* tags (multiple) */
    '.vsel.SALT .vsel-tags{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0;}' +
    '.vsel.SALT .vsel-tag{display:inline-flex;align-items:center;gap:2px;max-width:100%;' +
      'background:var(--vsel-accent-soft);border-radius:7px;padding:2px 3px 2px 8px;' +
      'font-size:13px;line-height:1.4;}' +
    '.vsel.SALT .vsel-tag-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.vsel.SALT .vsel-tag-x{flex:none;width:18px;height:18px;display:grid;place-items:center;' +
      'color:var(--vsel-muted);background:none;border:0;border-radius:5px;padding:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-tag-x:hover{background:var(--vsel-accent);color:var(--vsel-on-accent);}' +
    /* clear + arrow */
    '.vsel.SALT .vsel-clear{flex:none;width:22px;height:22px;display:grid;place-items:center;' +
      'color:var(--vsel-muted);background:none;border:0;border-radius:6px;padding:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-clear:hover{background:var(--vsel-surface);color:var(--vsel-text);}' +
    '.vsel.SALT .vsel-clear:focus,.vsel.SALT .vsel-tag-x:focus{outline:none;}' +
    '.vsel.SALT .vsel-clear:focus-visible,.vsel.SALT .vsel-tag-x:focus-visible{' +
      'outline:2px solid var(--vsel-accent);outline-offset:1px;}' +
    '.vsel.SALT .vsel-arrow{flex:none;display:grid;place-items:center;' +
      'color:var(--vsel-muted);transition:transform .15s ease;}' +
    '.vsel.SALT.is-open .vsel-arrow{transform:rotate(180deg);}' +
    '.vsel.SALT .vsel-arrow svg,.vsel.SALT .vsel-clear svg,.vsel.SALT .vsel-tag-x svg,' +
      '.vsel.SALT .vsel-check svg{display:block;}' +
    /* panel */
    '.vsel.SALT.vsel-panel{position:absolute;z-index:99999;display:block;min-width:0;' +
      'background:var(--vsel-bg);border:1px solid var(--vsel-faint);' +
      'border-radius:var(--vsel-radius);box-shadow:var(--vsel-shadow);padding:6px;' +
      'opacity:0;transform:translateY(4px) scale(.98);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vsel.SALT.vsel-panel.vsel-open{opacity:1;transform:none;}' +
    '.vsel.SALT .vsel-search{padding:2px 2px 8px;}' +
    '.vsel.SALT .vsel-search input{width:100%;font:inherit;color:var(--vsel-text);' +
      'background:var(--vsel-surface);border:1px solid var(--vsel-faint);border-radius:8px;' +
      'padding:7px 10px;margin:0;}' +
    '.vsel.SALT .vsel-search input:focus{outline:none;border-color:var(--vsel-accent);}' +
    '.vsel.SALT .vsel-search input::placeholder{color:var(--vsel-muted);}' +
    /* offsetTop of options must resolve against the list for scroll math */
    '.vsel.SALT .vsel-list{position:relative;max-height:264px;overflow-y:auto;' +
      'overscroll-behavior:contain;}' +
    '.vsel.SALT .vsel-group-label{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vsel-muted);padding:8px 10px 4px;}' +
    '.vsel.SALT .vsel-option{display:flex;align-items:center;gap:8px;padding:8px 10px;' +
      'border-radius:8px;cursor:pointer;transition:background .1s ease;}' +
    '.vsel.SALT .vsel-option.is-active{background:var(--vsel-surface);}' +
    '.vsel.SALT .vsel-option.is-selected{color:var(--vsel-accent);font-weight:600;}' +
    '.vsel.SALT .vsel-option.is-disabled{opacity:.4;cursor:not-allowed;background:none;}' +
    '.vsel.SALT .vsel-check{flex:none;width:16px;height:16px;display:grid;place-items:center;' +
      'color:var(--vsel-accent);visibility:hidden;}' +
    '.vsel.SALT .vsel-option.is-selected .vsel-check{visibility:visible;}' +
    '.vsel.SALT .vsel-option-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
      'white-space:nowrap;}' +
    '.vsel.SALT .vsel-empty{display:none;padding:10px 12px;color:var(--vsel-muted);' +
      'font-size:13px;}' +
    '.vsel.SALT.is-empty .vsel-empty{display:block;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsel.SALT,.vsel.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/select.css), or set Select.salt to
  // your own token / false BEFORE the first select is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Select.salt;
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
    // Insert before the page's own CSS so `.vsel { --vsel-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    chevron: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3 8.4 6.4 12 13 4.6" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>'
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

  // Case- and diacritic-insensitive fold for searching and typeahead.
  function fold(s) {
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s;
  }

  // Accepts [{value, label, disabled, group, html}] or ['a', 'b'] shorthand.
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
          disabled: !!o.disabled,
          group: o.group != null ? String(o.group) : null,
          html: !!o.html
        });
      } else {
        out.push({ value: String(o), label: String(o), disabled: false, group: null, html: false });
      }
    }
    return out;
  }

  function toValueArray(v) {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) if (v[i] != null) out.push(String(v[i]));
      return out;
    }
    return [String(v)];
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

  var DEFAULTS = {
    options: null,          // [{value, label, disabled, group, html}] or ['a','b'] (container mode)
    value: null,            // initial value; string or array (multiple)
    multiple: false,        // defaults to the native select's `multiple` in select mode
    searchable: false,      // filter input at the top of the panel
    clearable: false,       // ✕ button that resets the selection
    placeholder: 'Select…',
    name: null,             // form field name (container mode)
    maxItems: null,         // cap for multiple selection
    noResultsText: 'No results',
    disabled: false,
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vsel-* yourself
    position: 'auto',       // 'auto' | 'below' | 'above'
    labels: {
      remove: 'Remove',
      clear: 'Clear selection',
      search: 'Search',
      options: 'Options'
    },
    onChange: null,         // fn(value, select)
    onOpen: null,
    onClose: null
  };

  /* ------------------------------------------------------------------ *
   * Select.
   * ------------------------------------------------------------------ */

  function Select(target, options) {
    // SSR: an inert instance — every public method below no-ops without a DOM.
    if (!HAS_DOM) return;
    var el = resolveElement(target);
    if (!el) throw new Error('Select: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this.native = el.tagName === 'SELECT' ? el : null;
    this.opts = assignOptions({}, DEFAULTS, options);
    if (this.native) {
      if (options.multiple === undefined) this.opts.multiple = this.native.multiple;
      if (options.disabled === undefined) this.opts.disabled = this.native.disabled;
    }

    this.isOpen = false;
    this.options = [];         // [{value, label, disabled, group, html}]
    this.selectedValues = [];
    this._uid = 'vsel-' + (++uid);
    this._activeIdx = -1;
    this._visible = [];        // indexes into this.options after filtering
    this._normQuery = '';
    this._typeBuf = '';
    this._typeAt = 0;
    this._closeTimer = null;

    if (this.opts.styles !== false) injectStyles();
    this._readOptions();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._renderControl();
    this._syncForm(true);
  }

  Select.prototype = {
    constructor: Select,

    /* ---------------- option + value plumbing ---------------- */

    _readOptions: function () {
      if (this.native) this._readNative();
      else {
        this.options = normalizeOptions(this.opts.options);
        this.selectedValues = this._prune(toValueArray(this.opts.value));
      }
    },

    _readNative: function () {
      var out = [], selected = [];
      var kids = this.native.children;
      for (var i = 0; i < kids.length; i++) this._readNativeNode(kids[i], null, out, selected);
      // A leading empty-value option is the conventional native placeholder —
      // adopt its label and keep it out of the list (clear() re-selects it).
      this._placeholderOpt = null;
      if (out.length && out[0].value === '' && !this.opts.multiple) {
        this._placeholderOpt = out.shift();
        if (this.opts.placeholder === DEFAULTS.placeholder && this._placeholderOpt.label) {
          this.opts.placeholder = this._placeholderOpt.label;
        }
        if (selected.length && selected[0] === '' ) selected.shift();
      }
      this.options = out;
      this.selectedValues = this._prune(selected);
    },

    _readNativeNode: function (node, group, out, selected) {
      if (node.tagName === 'OPTGROUP') {
        var g = node.label || '';
        for (var i = 0; i < node.children.length; i++) {
          this._readNativeNode(node.children[i], g, out, selected);
        }
      } else if (node.tagName === 'OPTION') {
        out.push({
          value: node.value,
          label: node.text,
          disabled: node.disabled || (node.parentNode.tagName === 'OPTGROUP' &&
            node.parentNode.disabled),
          group: group,
          html: false
        });
        if (node.selected) selected.push(node.value);
      }
    },

    // Keep only values that exist as options, deduped, capped by maxItems.
    _prune: function (vals) {
      var out = [], i, j;
      for (i = 0; i < vals.length; i++) {
        for (j = 0; j < this.options.length; j++) {
          if (this.options[j].value === vals[i]) {
            if (out.indexOf(vals[i]) === -1) out.push(vals[i]);
            break;
          }
        }
      }
      if (!this.opts.multiple && out.length > 1) out = [out[0]];
      var max = +this.opts.maxItems;
      if (this.opts.multiple && max > 0 && out.length > max) out = out.slice(0, max);
      return out;
    },

    _optionByValue: function (v) {
      for (var i = 0; i < this.options.length; i++) {
        if (this.options[i].value === v) return this.options[i];
      }
      return null;
    },

    _syncForm: function (silent) {
      if (this.native) {
        // Mirror the selection onto the hidden native select so form
        // submission and external `change` listeners keep working.
        var opts = this.native.options;
        var any = false;
        for (var i = 0; i < opts.length; i++) {
          var on = this.selectedValues.indexOf(opts[i].value) !== -1 &&
            !(this._placeholderOpt && opts[i].value === '');
          opts[i].selected = on;
          if (on) any = true;
        }
        if (!any) {
          // Represent "nothing chosen": placeholder option if there is one.
          this.native.selectedIndex = this._placeholderOpt ? 0 : -1;
        }
        if (!silent) this.native.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (this._hiddenSelect) {
        this._hiddenSelect.innerHTML = '';
        for (var j = 0; j < this.selectedValues.length; j++) {
          var o = document.createElement('option');
          o.value = this.selectedValues[j];
          o.selected = true;
          this._hiddenSelect.appendChild(o);
        }
      } else if (this._hiddenInput) {
        this._hiddenInput.value = this.selectedValues.length ? this.selectedValues[0] : '';
      }
    },

    _afterChange: function (silent) {
      this._syncForm(silent);
      if (silent) return;
      var v = this.getValue();
      if (this.opts.onChange) this.opts.onChange(v, this);
      this._emit('change', { value: v, select: this });
    },

    _emit: function (name, detail) {
      this.el.dispatchEvent(new CustomEvent('select:' + name, {
        bubbles: true,
        detail: detail || { select: this }
      }));
    },

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      var L = this.opts.labels;
      var listId = this._uid + '-list';

      var wrap = document.createElement('div');
      wrap.className = 'vsel' + saltClass();
      this.wrapper = wrap;

      var control = document.createElement('div');
      control.className = 'vsel-control';
      control.setAttribute('role', 'combobox');
      control.setAttribute('aria-haspopup', 'listbox');
      control.setAttribute('aria-expanded', 'false');
      control.setAttribute('aria-controls', listId);
      if (!this.opts.disabled) control.setAttribute('tabindex', '0');
      this._control = control;

      // Borrow the accessible name from an associated <label for=…>.
      if (this.native && this.native.id) {
        var lab = document.querySelector('label[for="' + this.native.id + '"]');
        if (lab) control.setAttribute('aria-label', lab.textContent.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''));
      }

      if (this.opts.multiple) {
        this._tagsEl = document.createElement('span');
        this._tagsEl.className = 'vsel-tags';
        control.appendChild(this._tagsEl);
      }
      this._valueEl = document.createElement('span');
      this._valueEl.className = 'vsel-value';
      control.appendChild(this._valueEl);

      if (this.opts.clearable) {
        this._clearBtn = document.createElement('button');
        this._clearBtn.type = 'button';
        this._clearBtn.className = 'vsel-clear';
        this._clearBtn.setAttribute('aria-label', L.clear);
        this._clearBtn.innerHTML = ICONS.close;
        control.appendChild(this._clearBtn);
      }

      var arrow = document.createElement('span');
      arrow.className = 'vsel-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = ICONS.chevron;
      control.appendChild(arrow);
      wrap.appendChild(control);

      if (this.opts.disabled) wrap.classList.add('is-disabled');

      if (this.native) {
        this.native.parentNode.insertBefore(wrap, this.native.nextSibling);
        this._nativeDisplay = this.native.style.display;
        this.native.style.display = 'none';
        this.native.setAttribute('aria-hidden', 'true');
        this.native.setAttribute('data-vsel-bound', '');
      } else {
        this.el.appendChild(wrap);
        if (this.opts.name) {
          // Form carrier: hidden input (single) or hidden multi-select.
          if (this.opts.multiple) {
            this._hiddenSelect = document.createElement('select');
            this._hiddenSelect.multiple = true;
            this._hiddenSelect.name = this.opts.name;
            this._hiddenSelect.style.display = 'none';
            this._hiddenSelect.setAttribute('aria-hidden', 'true');
            this._hiddenSelect.tabIndex = -1;
            wrap.appendChild(this._hiddenSelect);
          } else {
            this._hiddenInput = document.createElement('input');
            this._hiddenInput.type = 'hidden';
            this._hiddenInput.name = this.opts.name;
            wrap.appendChild(this._hiddenInput);
          }
        }
      }

      /* panel */
      var panel = document.createElement('div');
      panel.className = 'vsel vsel-panel' + saltClass();
      this.panel = panel;

      if (this.opts.searchable) {
        var search = document.createElement('div');
        search.className = 'vsel-search';
        var input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', listId);
        input.setAttribute('aria-label', L.search);
        input.placeholder = L.search;
        search.appendChild(input);
        panel.appendChild(search);
        this._searchInput = input;
      }

      var list = document.createElement('div');
      list.className = 'vsel-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.options);
      if (this.opts.multiple) list.setAttribute('aria-multiselectable', 'true');
      panel.appendChild(list);
      this._list = list;

      var empty = document.createElement('div');
      empty.className = 'vsel-empty';
      empty.textContent = this.opts.noResultsText;
      panel.appendChild(empty);

      panel.style.display = 'none';
      document.body.appendChild(panel);
    },

    _bind: function () {
      var self = this;

      this._onControlClick = function (e) {
        if (self.opts.disabled) return;
        var t = e.target;
        var tagX = t.closest ? t.closest('.vsel-tag-x') : null;
        if (tagX) {
          self._removeTag(+tagX.getAttribute('data-i'));
          return;
        }
        if (self._clearBtn && (t === self._clearBtn || self._clearBtn.contains(t))) {
          self.setValue(self.opts.multiple ? [] : null);
          self._control.focus();
          return;
        }
        self.toggle();
      };
      this._onControlKeydown = function (e) { self._handleKeydown(e, false); };
      this._control.addEventListener('click', this._onControlClick);
      this._control.addEventListener('keydown', this._onControlKeydown);

      // Selecting an option must not steal focus from the control/search.
      this._onPanelMousedown = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (opt || e.target === self._list) e.preventDefault();
      };
      this._onPanelClick = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (!opt || opt.classList.contains('is-disabled')) return;
        self._choose(+opt.getAttribute('data-i'));
      };
      this._onPanelOver = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (opt && !opt.classList.contains('is-disabled')) {
          self._setActive(+opt.getAttribute('data-i'), false);
        }
      };
      this.panel.addEventListener('mousedown', this._onPanelMousedown);
      this.panel.addEventListener('click', this._onPanelClick);
      this.panel.addEventListener('mouseover', this._onPanelOver);

      if (this._searchInput) {
        this._onSearchInput = function () {
          self._normQuery = fold(self._searchInput.value.replace(/^\s+|\s+$/g, ''));
          self._renderList();
          self._initActive();
          if (self.isOpen) self._position();
        };
        this._onSearchKeydown = function (e) { self._handleKeydown(e, true); };
        this._searchInput.addEventListener('input', this._onSearchInput);
        this._searchInput.addEventListener('keydown', this._onSearchKeydown);
      }

      // Close when keyboard focus moves somewhere outside the widget.
      // relatedTarget is null for clicks on non-focusables and window blur —
      // the outside-pointerdown handler owns those cases.
      this._onFocusOut = function (e) {
        if (!self.isOpen || !e.relatedTarget) return;
        if (self.panel.contains(e.relatedTarget) ||
            self.wrapper.contains(e.relatedTarget)) return;
        self.close(false);
      };
      this.wrapper.addEventListener('focusout', this._onFocusOut);
      this.panel.addEventListener('focusout', this._onFocusOut);

      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(self.wrapper) !== -1) return;
        self.close(false);
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.wrapper.setAttribute('data-theme', resolved);
      this.panel.setAttribute('data-theme', resolved);
    },

    /* ---------------- rendering ---------------- */

    _renderControl: function () {
      var L = this.opts.labels;
      if (this.opts.multiple) {
        this._tagsEl.innerHTML = '';
        for (var i = 0; i < this.selectedValues.length; i++) {
          var o = this._optionByValue(this.selectedValues[i]);
          if (!o) continue;
          var tag = document.createElement('span');
          tag.className = 'vsel-tag';
          var lbl = document.createElement('span');
          lbl.className = 'vsel-tag-label';
          lbl.textContent = o.label;
          tag.appendChild(lbl);
          var x = document.createElement('button');
          x.type = 'button';
          x.className = 'vsel-tag-x';
          x.setAttribute('data-i', String(i));
          x.setAttribute('aria-label', L.remove + ' ' + o.label);
          x.tabIndex = -1; // one tab stop: the control; Backspace removes tags
          x.innerHTML = ICONS.close;
          tag.appendChild(x);
          this._tagsEl.appendChild(tag);
        }
        var has = this.selectedValues.length > 0;
        this._valueEl.style.display = has ? 'none' : '';
        this._valueEl.className = 'vsel-value is-placeholder';
        this._valueEl.textContent = this.opts.placeholder;
      } else {
        var sel = this.selectedValues.length
          ? this._optionByValue(this.selectedValues[0]) : null;
        this._valueEl.className = 'vsel-value' + (sel ? '' : ' is-placeholder');
        if (sel && sel.html) this._valueEl.innerHTML = sel.label;
        else this._valueEl.textContent = sel ? sel.label : this.opts.placeholder;
      }
      if (this._clearBtn) {
        this._clearBtn.style.display =
          (this.selectedValues.length && !this.opts.disabled) ? '' : 'none';
      }
    },

    _renderList: function () {
      var list = this._list;
      list.innerHTML = '';
      var q = this._normQuery;
      var groups = {};
      var visible = [];
      for (var i = 0; i < this.options.length; i++) {
        var o = this.options[i];
        if (q && fold(o.label).indexOf(q) === -1) continue;
        visible.push(i);
        var parent = list;
        if (o.group) {
          if (!groups[o.group]) {
            var g = document.createElement('div');
            g.setAttribute('role', 'group');
            g.setAttribute('aria-label', o.group);
            var gl = document.createElement('div');
            gl.className = 'vsel-group-label';
            gl.setAttribute('aria-hidden', 'true');
            gl.textContent = o.group;
            g.appendChild(gl);
            list.appendChild(g);
            groups[o.group] = g;
          }
          parent = groups[o.group];
        }
        var selected = this.selectedValues.indexOf(o.value) !== -1;
        var opt = document.createElement('div');
        opt.className = 'vsel-option' +
          (selected ? ' is-selected' : '') +
          (o.disabled ? ' is-disabled' : '');
        opt.id = this._uid + '-opt-' + i;
        opt.setAttribute('role', 'option');
        opt.setAttribute('data-i', String(i));
        opt.setAttribute('aria-selected', String(selected));
        if (o.disabled) opt.setAttribute('aria-disabled', 'true');
        var check = document.createElement('span');
        check.className = 'vsel-check';
        check.innerHTML = ICONS.check;
        opt.appendChild(check);
        var lbl = document.createElement('span');
        lbl.className = 'vsel-option-label';
        // Labels are TEXT by default; `html: true` is an explicit opt-in.
        if (o.html) lbl.innerHTML = o.label;
        else lbl.textContent = o.label;
        opt.appendChild(lbl);
        parent.appendChild(opt);
      }
      this._visible = visible;
      this.panel.classList.toggle('is-empty', visible.length === 0);
    },

    // In-place state refresh — cheaper than a re-render, keeps hover intact.
    _refreshListState: function () {
      var opts = this._list.querySelectorAll('.vsel-option');
      for (var i = 0; i < opts.length; i++) {
        var selected = this.selectedValues.indexOf(
          this.options[+opts[i].getAttribute('data-i')].value) !== -1;
        opts[i].classList.toggle('is-selected', selected);
        opts[i].setAttribute('aria-selected', String(selected));
      }
    },

    /* ---------------- active option ---------------- */

    _enabledVisible: function () {
      var out = [];
      for (var i = 0; i < this._visible.length; i++) {
        if (!this.options[this._visible[i]].disabled) out.push(this._visible[i]);
      }
      return out;
    },

    _initActive: function () {
      var vis = this._enabledVisible();
      var idx = -1;
      for (var i = 0; i < vis.length; i++) {
        if (this.selectedValues.indexOf(this.options[vis[i]].value) !== -1) {
          idx = vis[i];
          break;
        }
      }
      if (idx === -1 && vis.length) idx = vis[0];
      if (idx !== -1) this._setActive(idx, true);
      else {
        this._activeIdx = -1;
        this._setActiveDescendant('');
      }
    },

    _setActive: function (idx, scroll) {
      this._activeIdx = idx;
      var prev = this._list.querySelector('.vsel-option.is-active');
      if (prev) prev.classList.remove('is-active');
      var el = this._list.querySelector('[data-i="' + idx + '"]');
      if (!el) return;
      el.classList.add('is-active');
      this._setActiveDescendant(el.id);
      if (scroll) {
        var lt = this._list.scrollTop, lh = this._list.clientHeight;
        if (el.offsetTop < lt) this._list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > lt + lh) {
          this._list.scrollTop = el.offsetTop + el.offsetHeight - lh;
        }
      }
    },

    _setActiveDescendant: function (id) {
      if (id) this._control.setAttribute('aria-activedescendant', id);
      else this._control.removeAttribute('aria-activedescendant');
      if (this._searchInput) {
        if (id) this._searchInput.setAttribute('aria-activedescendant', id);
        else this._searchInput.removeAttribute('aria-activedescendant');
      }
    },

    _moveActive: function (dir) {
      var vis = this._enabledVisible();
      if (!vis.length) return;
      var cur = vis.indexOf(this._activeIdx);
      var next = cur === -1
        ? (dir > 0 ? 0 : vis.length - 1)
        : (cur + dir + vis.length) % vis.length; // skips disabled, wraps
      this._setActive(vis[next], true);
    },

    /* ---------------- selection ---------------- */

    _choose: function (idx) {
      var o = this.options[idx];
      if (!o || o.disabled) return;
      if (this.opts.multiple) {
        var pos = this.selectedValues.indexOf(o.value);
        if (pos !== -1) this.selectedValues.splice(pos, 1);
        else {
          var max = +this.opts.maxItems;
          if (max > 0 && this.selectedValues.length >= max) return;
          this.selectedValues.push(o.value);
        }
        this._refreshListState();
        this._renderControl();
        this._afterChange(false);
        if (this.isOpen) this._position(); // tags can change the control height
      } else {
        var same = this.selectedValues.length === 1 && this.selectedValues[0] === o.value;
        this.selectedValues = [o.value];
        this._renderControl();
        if (!same) this._afterChange(false);
        this.close(true);
      }
    },

    _removeTag: function (i) {
      if (this.opts.disabled || i < 0 || i >= this.selectedValues.length) return;
      this.selectedValues.splice(i, 1);
      this._renderControl();
      this._afterChange(false);
      if (this.isOpen) {
        this._refreshListState();
        this._position();
      }
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e, fromSearch) {
      if (this.opts.disabled) return;
      var key = e.key;
      var searchText = fromSearch ? this._searchInput.value : '';

      if (!this.isOpen) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
          e.preventDefault();
          this.open();
          return;
        }
        if (key === 'Backspace' && this.opts.multiple && this.selectedValues.length) {
          this._removeTag(this.selectedValues.length - 1);
          return;
        }
        if (!this.opts.searchable && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.open();
          this._typeahead(key);
        }
        return;
      }

      switch (key) {
        case 'ArrowDown':
          e.preventDefault();
          this._moveActive(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          this._moveActive(-1);
          return;
        case 'Home':
        case 'End':
          // In the search field these keys move the caret, as usual.
          if (fromSearch && searchText) return;
          e.preventDefault();
          var vis = this._enabledVisible();
          if (vis.length) this._setActive(vis[key === 'Home' ? 0 : vis.length - 1], true);
          return;
        case 'Enter':
          e.preventDefault();
          if (this._activeIdx !== -1) this._choose(this._activeIdx);
          return;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          this.close(true);
          return;
        case 'Tab':
          this.close(false); // let Tab move on naturally
          return;
        case 'Backspace':
          if (this.opts.multiple && !searchText && this.selectedValues.length) {
            this._removeTag(this.selectedValues.length - 1);
          }
          return;
        case ' ':
          if (!fromSearch) {
            e.preventDefault();
            if (this._typeBuf && Date.now() - this._typeAt <= 500) this._typeahead(' ');
            else if (this._activeIdx !== -1) this._choose(this._activeIdx);
          }
          return;
        default:
          if (!this.opts.searchable && key.length === 1 &&
              !e.ctrlKey && !e.metaKey && !e.altKey) {
            this._typeahead(key);
          }
      }
    },

    _typeahead: function (ch) {
      var now = Date.now();
      if (now - this._typeAt > 500) this._typeBuf = '';
      this._typeAt = now;
      this._typeBuf += fold(ch);
      var vis = this._enabledVisible();
      if (!vis.length) return;
      var from = vis.indexOf(this._activeIdx);
      // A growing buffer re-checks the current option; a fresh keypress
      // starts at the next one, so repeated letters cycle through matches.
      var start = this._typeBuf.length > 1 ? 0 : 1;
      for (var n = start; n <= vis.length; n++) {
        var idx = vis[((from === -1 ? 0 : from) + n) % vis.length];
        if (fold(this.options[idx].label).indexOf(this._typeBuf) === 0) {
          this._setActive(idx, true);
          return;
        }
      }
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this._control;
      panel.style.minWidth = anchor.offsetWidth + 'px';
      var prefer = this.opts.position === 'below' ? 'below'
        : this.opts.position === 'above' ? 'above' : null;
      if (window.VC && typeof window.VC.position === 'function') {
        var res = window.VC.position(panel, anchor, { gap: 6, pad: 8, prefer: prefer });
        if (res) panel.style.transformOrigin = res.below ? '50% 0' : '50% 100%';
        return;
      }
      // Private fallback: flip above when there is no room below, clamp to
      // the viewport horizontally (same approach as the datepicker).
      var r = anchor.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = 6, pad = 8;

      var below = prefer === 'below' ||
        (prefer !== 'above' && (vh - r.bottom >= ph + gap || r.top < ph + gap));
      var top = below ? r.bottom + gap : r.top - ph - gap;
      var left = Math.min(Math.max(pad, r.left), Math.max(pad, vw - pw - pad));

      // Inside a native <dialog> the panel rides in the top layer with the
      // dialog, positioned fixed in viewport coordinates; otherwise absolute.
      var fixed = this._inTopLayer;
      panel.style.position = fixed ? 'fixed' : 'absolute';
      panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
      panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
      panel.style.transformOrigin = below ? '50% 0' : '50% 100%';
    },

    /* ---------------- public API ---------------- */

    open: function () {
      if (!this.wrapper || this.isOpen || this.opts.disabled) return this;
      clearTimeout(this._closeTimer);
      if (this._searchInput) this._searchInput.value = '';
      this._normQuery = '';

      // If the control lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this._control.closest ? this._control.closest('dialog') : null;
      this._inTopLayer = !!host;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this._renderList();
      this._initActive();
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vsel-open'); });
      this.isOpen = true;
      this.wrapper.classList.add('is-open');
      this._control.setAttribute('aria-expanded', 'true');
      if (this._searchInput) {
        this._searchInput.setAttribute('aria-expanded', 'true');
        this._searchInput.focus();
      }

      document.addEventListener('pointerdown', this._onDocPointer, true);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);

      if (this.opts.onOpen) this.opts.onOpen(this);
      this._emit('open');
      return this;
    },

    close: function (refocus) {
      if (!this.wrapper || !this.isOpen) return this;
      this.isOpen = false;
      this.wrapper.classList.remove('is-open');
      this._control.setAttribute('aria-expanded', 'false');
      this._setActiveDescendant('');
      if (this._searchInput) this._searchInput.setAttribute('aria-expanded', 'false');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      var focusInside = this.panel.contains(document.activeElement);
      this.panel.classList.remove('vsel-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);

      // refocus === false means "focus is moving elsewhere, leave it alone".
      if (refocus !== false && (refocus || focusInside)) this._control.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      this._emit('close');
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close(true) : this.open();
    },

    getValue: function () {
      if (!this.wrapper) return this.opts && this.opts.multiple ? [] : null;
      if (this.opts.multiple) return this.selectedValues.slice();
      return this.selectedValues.length ? this.selectedValues[0] : null;
    },

    setValue: function (v, config) {
      if (!this.wrapper) return this;
      var silent = config && config.silent;
      this.selectedValues = this._prune(toValueArray(v));
      this._renderControl();
      if (this.isOpen) this._refreshListState();
      this._afterChange(silent);
      return this;
    },

    enable: function () {
      if (!this.wrapper) return this;
      this.opts.disabled = false;
      this.wrapper.classList.remove('is-disabled');
      this._control.setAttribute('tabindex', '0');
      this._control.removeAttribute('aria-disabled');
      if (this.native) this.native.disabled = false;
      this._renderControl();
      return this;
    },

    disable: function () {
      if (!this.wrapper) return this;
      this.close(false);
      this.opts.disabled = true;
      this.wrapper.classList.add('is-disabled');
      this._control.removeAttribute('tabindex');
      this._control.setAttribute('aria-disabled', 'true');
      if (this.native) this.native.disabled = true;
      this._renderControl();
      return this;
    },

    // Re-read the options: from the native <select> (its markup is the
    // source of truth) or from a fresh look at opts.options.
    refresh: function () {
      if (!this.wrapper) return this;
      if (this.native) this._readNative();
      else {
        this.options = normalizeOptions(this.opts.options);
        this.selectedValues = this._prune(this.selectedValues);
      }
      this._renderControl();
      this._syncForm(true);
      if (this.isOpen) {
        this._renderList();
        this._initActive();
        this._position();
      }
      return this;
    },

    // Tear down and restore the native select untouched.
    destroy: function () {
      if (!this.wrapper) return this;
      this.close(false);
      clearTimeout(this._closeTimer);
      unwatchAutoTheme(this);
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
      if (this.native) {
        this.native.style.display = this._nativeDisplay || '';
        this.native.removeAttribute('aria-hidden');
        this.native.removeAttribute('data-vsel-bound');
      }
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Select.version = VERSION;
  Select.defaults = DEFAULTS;

  Select.create = function (target, options) {
    return new Select(target, options);
  };

  Select.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vselPlaceholder) o.placeholder = d.vselPlaceholder;
    if (d.vselName) o.name = d.vselName;
    if (d.vselTheme) o.theme = d.vselTheme;
    if (d.vselPosition) o.position = d.vselPosition;
    if (d.vselNoResults) o.noResultsText = d.vselNoResults;
    if (d.vselValue != null && d.vselValue !== '') {
      o.value = d.vselValue.indexOf(',') !== -1 ? d.vselValue.split(',') : d.vselValue;
    }
    if (d.vselMaxItems != null && d.vselMaxItems !== '') o.maxItems = +d.vselMaxItems;
    if (d.vselSearchable != null) o.searchable = parseBool(d.vselSearchable);
    if (d.vselClearable != null) o.clearable = parseBool(d.vselClearable);
    if (d.vselMultiple != null) o.multiple = parseBool(d.vselMultiple);
    if (d.vselStyles != null) o.styles = parseBool(d.vselStyles);
    if (d.vselOptions) {
      // JSON array, or a plain comma list as shorthand.
      try { o.options = JSON.parse(d.vselOptions); }
      catch (err) { o.options = d.vselOptions.split(','); }
    }
    return o;
  }

  Select.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsel]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Select(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Select auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Select.autoInit(); });
    } else {
      Select.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Select.displayName = 'Select';
  Select.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Select, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Select.css = renderCss();
  }
  Select.rootClass = 'vsel';
  Select.themeVars = {
    accent: '--vsel-accent',
    radius: '--vsel-radius',
    font: '--vsel-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Select.varScopes = ['.vsel', '.vsel[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('select', Select);
  }

  return Select;
});

if (cjsModule) {
  cjsModule.exports = {
    VC: global.VC,
    VanillaUI: global.VanillaUI,
    DatePicker: global.DatePicker,
    Toast: global.Toast,
    Tooltip: global.Tooltip,
    Menu: global.Menu,
    Modal: global.Modal,
    Tabs: global.Tabs,
    Select: global.Select
  };
}
})(typeof globalThis !== 'undefined' ? globalThis :
   typeof self !== 'undefined' ? self : this,
   typeof module === 'object' && module.exports ? module : null);
