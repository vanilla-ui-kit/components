/*!
 * vanilla-ui-kit v1.0.0 — single-file, zero-dependency UI components
 * Bundle of: core/core.js, datepicker/datepicker.js, toast/toast.js, tooltip/tooltip.js, menu/menu.js, modal/modal.js, tabs/tabs.js, select/select.js, command/command.js, form/form.js, phone/phone.js, drawer/drawer.js, segmented/segmented.js, progress/progress.js, popconfirm/popconfirm.js, rating/rating.js, autocomplete/autocomplete.js, upload/upload.js, slider/slider.js, number/number.js, pagination/pagination.js, empty/empty.js
 * https://github.com/vanilla-ui-kit/components
 * License: MIT
 */
(function (global, cjsModule) {
var define, module, exports, self = global;
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
  var panelSeq = 0; // ids for panels so inputs can reference them via aria-controls
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
      if (!p.id) p.id = 'vdp-dialog-' + (++panelSeq);
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
          // APG date-picker-combobox pattern: a plain textbox may not carry
          // aria-haspopup/aria-expanded, a combobox may.
          if (!this.input.getAttribute('role')) this.input.setAttribute('role', 'combobox');
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
      if (this.input) {
        this.input.setAttribute('aria-expanded', 'true');
        if (this.panel.id) this.input.setAttribute('aria-controls', this.panel.id);
      }

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
          if (!this.input.getAttribute('role')) this.input.setAttribute('role', 'combobox');
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

/* ==== command/command.js ==== */
/*!
 * Vanilla UI Kit Command Palette v1.0.0
 * A single-file, zero-dependency Ctrl/Cmd+K command palette for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="command.js"></script>
 *   <script>CommandPalette.register({ id: 'save', label: 'Save', action: save })</script>
 *   (then press Ctrl/Cmd+K)
 *
 * Headless:
 *   CommandPalette.defaults.styles = false   // no CSS injected; style .vcmd-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CommandPalette = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-command-styles';
  var OUT_MS = 160; // keep in sync with the .vcmd-out transition
  var MAX_RECENT = 5;
  var IS_MAC = HAS_DOM &&
    /Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''));
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `CommandPalette.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when CommandPalette.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the palette; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vcmd{--vcmd-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vcmd{' +
      '--vcmd-accent:#5b5bd6;' +
      '--vcmd-bg:#ffffff;' +
      '--vcmd-surface:#f2f2f5;' +
      '--vcmd-text:#1c1d21;' +
      '--vcmd-muted:#72747e;' +
      '--vcmd-faint:#e7e7ec;' +
      '--vcmd-shadow:0 24px 64px rgba(24,25,32,.22),0 4px 16px rgba(24,25,32,.1);' +
      '--vcmd-backdrop:rgba(24,25,32,.42);' +
      '--vcmd-radius:14px;' +
      '--vcmd-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vcmd[data-theme=dark]{' +
      '--vcmd-accent:#7b7bea;' +
      '--vcmd-bg:#1b1d24;' +
      '--vcmd-surface:#272a33;' +
      '--vcmd-text:#e9eaf0;' +
      '--vcmd-muted:#989aa6;' +
      '--vcmd-faint:#31343f;' +
      '--vcmd-shadow:0 24px 64px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.4);' +
      '--vcmd-backdrop:rgba(0,0,0,.55);}' +
    '.vcmd.SALT{position:fixed;top:0;right:0;bottom:0;left:0;z-index:100000;' +
      'display:flex;align-items:flex-start;justify-content:center;' +
      'padding:15vh 16px 16px;box-sizing:border-box;' +
      'color:var(--vcmd-text);font-family:var(--vcmd-font);font-size:14px;line-height:1.45;}' +
    '.vcmd.SALT *,.vcmd.SALT *::before,.vcmd.SALT *::after{box-sizing:border-box;}' +
    '.vcmd.SALT .vcmd-backdrop{position:absolute;top:0;right:0;bottom:0;left:0;' +
      'background:var(--vcmd-backdrop);opacity:0;transition:opacity .16s ease;}' +
    '.vcmd.SALT .vcmd-panel{position:relative;width:100%;max-width:560px;max-height:70vh;' +
      'display:flex;flex-direction:column;overflow:hidden;' +
      'background:var(--vcmd-bg);border:1px solid var(--vcmd-faint);' +
      'border-radius:var(--vcmd-radius);box-shadow:var(--vcmd-shadow);' +
      'opacity:0;transform:translateY(-6px) scale(.98);' +
      'transition:opacity .16s ease,transform .18s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vcmd.SALT.vcmd-open .vcmd-backdrop{opacity:1;}' +
    '.vcmd.SALT.vcmd-open .vcmd-panel{opacity:1;transform:none;}' +
    '.vcmd.SALT.vcmd-out .vcmd-backdrop{opacity:0;}' +
    '.vcmd.SALT.vcmd-out .vcmd-panel{opacity:0;transform:scale(.97);' +
      'transition-duration:.14s,.14s;}' +
    '.vcmd.SALT .vcmd-search{display:flex;align-items:center;gap:10px;padding:0 16px;' +
      'border-bottom:1px solid var(--vcmd-faint);}' +
    '.vcmd.SALT .vcmd-search:focus-within{box-shadow:inset 0 -1px 0 var(--vcmd-accent);}' +
    '.vcmd.SALT .vcmd-glass{flex:none;display:grid;place-items:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-glass svg{display:block;}' +
    '.vcmd.SALT .vcmd-input{flex:1;min-width:0;font:inherit;font-size:15px;' +
      'color:var(--vcmd-text);background:none;border:0;padding:14px 0;outline:none;}' +
    '.vcmd.SALT .vcmd-input::placeholder{color:var(--vcmd-muted);opacity:1;}' +
    '.vcmd.SALT .vcmd-list{position:relative;flex:1;overflow-y:auto;' +
      'overscroll-behavior:contain;padding:6px;}' +
    '.vcmd.SALT .vcmd-group{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vcmd-muted);padding:10px 10px 4px;}' +
    '.vcmd.SALT .vcmd-option{display:flex;align-items:center;gap:10px;' +
      'padding:9px 10px;border-radius:8px;cursor:pointer;}' +
    '.vcmd.SALT .vcmd-option.is-active{background:var(--vcmd-surface);}' +
    '.vcmd.SALT .vcmd-option.is-disabled{opacity:.4;cursor:default;}' +
    '.vcmd.SALT .vcmd-option:focus-visible{outline:2px solid var(--vcmd-accent);' +
      'outline-offset:-2px;}' +
    '.vcmd.SALT .vcmd-icon{flex:none;width:18px;height:18px;display:grid;' +
      'place-items:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-option.is-active .vcmd-icon{color:var(--vcmd-accent);}' +
    '.vcmd.SALT .vcmd-icon svg{display:block;}' +
    '.vcmd.SALT .vcmd-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;}' +
    '.vcmd.SALT .vcmd-mark{color:var(--vcmd-accent);font-weight:650;}' +
    '.vcmd.SALT .vcmd-hint{flex:none;font-size:12px;color:var(--vcmd-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vcmd.SALT .vcmd-empty{padding:24px 16px;text-align:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-footer{display:flex;gap:14px;padding:9px 14px;' +
      'border-top:1px solid var(--vcmd-faint);color:var(--vcmd-muted);font-size:11.5px;}' +
    '.vcmd.SALT .vcmd-key{display:inline-block;min-width:16px;text-align:center;' +
      'background:var(--vcmd-surface);border:1px solid var(--vcmd-faint);border-radius:4px;' +
      'padding:0 4px;margin-right:5px;font-size:11px;line-height:1.6;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vcmd.SALT,.vcmd.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/command.css), or set CommandPalette.salt
  // to your own token / false BEFORE the palette first opens.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = CommandPalette.salt;
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

  var MAGNIFIER = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var watching = false;
  var instances = [];

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveTheme(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
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
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].root) instances[i]._applyTheme();
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
   * Hotkey parsing — simple 'mod+k' / 'ctrl+shift+p' forms.
   * 'mod' means Cmd on macOS, Ctrl everywhere else.
   * ------------------------------------------------------------------ */

  function parseHotkey(spec) {
    if (spec === false || spec == null || spec === '') return null;
    var parts = String(spec).toLowerCase().split('+');
    var hk = { key: '', mod: false, ctrl: false, shift: false, alt: false, meta: false };
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/\s+/g, '');
      if (p === 'mod') hk.mod = true;
      else if (p === 'ctrl' || p === 'control') hk.ctrl = true;
      else if (p === 'shift') hk.shift = true;
      else if (p === 'alt' || p === 'option') hk.alt = true;
      else if (p === 'meta' || p === 'cmd' || p === 'command' || p === 'win') hk.meta = true;
      else hk.key = p;
    }
    return hk.key ? hk : null;
  }

  function matchesHotkey(e, hk) {
    var key = e.key ? String(e.key).toLowerCase() : '';
    if (key === 'esc') key = 'escape';
    if (key !== hk.key) return false;
    var ctrl = hk.ctrl || (hk.mod && !IS_MAC);
    var meta = hk.meta || (hk.mod && IS_MAC);
    return e.ctrlKey === ctrl && e.metaKey === meta &&
      e.shiftKey === hk.shift && e.altKey === hk.alt;
  }

  /* ------------------------------------------------------------------ *
   * Fuzzy matching — case/diacritic-insensitive subsequence over
   * label + keywords. Scoring: consecutive-run bonus, word-start bonus,
   * earlier-first-match bonus.
   * ------------------------------------------------------------------ */

  // Fold to lowercase and strip diacritics ONE CHAR AT A TIME so the folded
  // string stays index-aligned with the original — highlight positions map
  // straight back onto the raw label.
  function fold(s) {
    s = String(s).toLowerCase();
    if (!s.normalize) return s;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      var f = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += f.length === 1 ? f : c;
    }
    return out;
  }

  var WORD_BREAK = /[\s\-_./:]/;

  // q must already be folded and whitespace-free. Returns null on no match,
  // else { score, positions } with positions into the ORIGINAL text.
  function fuzzyMatch(q, text) {
    var t = fold(text);
    var qi = 0, score = 0, run = 0, first = -1;
    var positions = [];
    for (var i = 0; i < t.length && qi < q.length; i++) {
      if (t.charAt(i) === q.charAt(qi)) {
        if (first < 0) first = i;
        var pts = 1;
        if (run > 0) pts += 5;                                     // consecutive run
        if (i === 0 || WORD_BREAK.test(t.charAt(i - 1))) pts += 8; // word start
        score += pts;
        run++;
        positions.push(i);
        qi++;
      } else {
        run = 0;
      }
    }
    if (qi < q.length) return null;
    score += Math.max(0, 12 - first); // earlier first hit ranks higher
    return { score: score, positions: positions };
  }

  /* ------------------------------------------------------------------ *
   * Option plumbing.
   * ------------------------------------------------------------------ */

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  function normalizeCommand(c) {
    if (!c || c.id == null) return null;
    var keywords = c.keywords;
    if (typeof keywords === 'string') keywords = keywords.split(/\s+/);
    if (!Array.isArray(keywords)) keywords = [];
    return {
      id: String(c.id),
      label: c.label == null ? String(c.id) : String(c.label),
      hint: c.hint == null ? '' : String(c.hint),
      group: c.group == null ? '' : String(c.group),
      icon: c.icon == null ? '' : String(c.icon), // TRUSTED svg markup
      keywords: keywords.map(String),
      action: typeof c.action === 'function' ? c.action : null,
      disabled: !!c.disabled
    };
  }

  /* ------------------------------------------------------------------ *
   * CommandPalette.
   * ------------------------------------------------------------------ */

  function CommandPalette(options) {
    options = options || {};
    this.opts = assignOptions({}, CommandPalette.defaults, options);
    this.commands = [];
    this.isOpen = false;
    this.root = null;      // built lazily on first open (SSR: never)
    this.panel = null;
    this.input = null;
    this.list = null;
    this._recent = [];     // command ids, most recent first, session-only
    this._rows = [];       // current result rows: { cmd, positions }
    this._optEls = [];
    this._active = -1;
    this._query = '';
    this._prevFocus = null;
    this._closeTimer = null;
    this._idBase = 'vcmd-' + (++uid);

    if (options.commands) this.register(options.commands);

    this._hotkey = parseHotkey(this.opts.hotkey);
    if (HAS_DOM && this._hotkey) {
      var self = this;
      // Deliberately fires from inputs/textareas/contenteditable too — the
      // hotkey is the ONLY global binding, so plain typing is never touched.
      this._onHotkey = function (e) {
        if (matchesHotkey(e, self._hotkey)) {
          e.preventDefault();
          self.toggle();
        }
      };
      window.addEventListener('keydown', this._onHotkey);
    }
    if (HAS_DOM) instances.push(this);
  }

  CommandPalette.prototype = {
    constructor: CommandPalette,

    /* ---------------- command registry ---------------- */

    // register(command | commands[]) — appends; a command with an already
    // registered id replaces the old one IN PLACE (order is stable).
    register: function (input) {
      var list = Array.isArray(input) ? input : [input];
      for (var i = 0; i < list.length; i++) {
        var cmd = normalizeCommand(list[i]);
        if (!cmd) continue;
        var at = this._indexOf(cmd.id);
        if (at === -1) this.commands.push(cmd);
        else this.commands[at] = cmd;
      }
      if (this.isOpen) this._render(this._query);
      return this;
    },

    unregister: function (id) {
      var at = this._indexOf(String(id));
      if (at !== -1) this.commands.splice(at, 1);
      var r = this._recent.indexOf(String(id));
      if (r !== -1) this._recent.splice(r, 1);
      if (this.isOpen) this._render(this._query);
      return this;
    },

    _indexOf: function (id) {
      for (var i = 0; i < this.commands.length; i++) {
        if (this.commands[i].id === id) return i;
      }
      return -1;
    },

    _remember: function (id) {
      if (!this.opts.recent) return;
      var at = this._recent.indexOf(id);
      if (at !== -1) this._recent.splice(at, 1);
      this._recent.unshift(id);
      if (this._recent.length > MAX_RECENT) this._recent.pop();
    },

    /* ---------------- open / close ---------------- */

    open: function () {
      if (!HAS_DOM || this.isOpen) return this;
      if (this.opts.styles !== false) {
        if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
        else injectOwnStyles();
      }
      ensureThemeWatch();
      this._build();
      this._applyTheme();

      this._prevFocus = document.activeElement;
      this.isOpen = true;
      clearTimeout(this._closeTimer);
      this.root.classList.remove('vcmd-out');
      this.root.style.display = '';
      this.input.value = '';
      this._render('');
      this.input.setAttribute('aria-expanded', 'true');

      // Double rAF so the initial (hidden) styles are committed first.
      var root = this.root;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.add('vcmd-open'); });
      });
      this.input.focus();
      if (this.opts.onOpen) this.opts.onOpen(this);
      return this;
    },

    close: function () {
      if (!HAS_DOM || !this.isOpen) return this;
      this.isOpen = false;
      this.root.classList.remove('vcmd-open');
      this.root.classList.add('vcmd-out');
      this.input.setAttribute('aria-expanded', 'false');
      var root = this.root;
      this._closeTimer = setTimeout(function () {
        root.style.display = 'none';
        root.classList.remove('vcmd-out');
      }, OUT_MS);
      // Give focus back to wherever the user was before the palette opened.
      var prev = this._prevFocus;
      this._prevFocus = null;
      if (prev && prev.focus && document.documentElement.contains(prev)) prev.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close() : this.open();
    },

    destroy: function () {
      if (this._onHotkey && HAS_DOM) window.removeEventListener('keydown', this._onHotkey);
      clearTimeout(this._closeTimer);
      if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
      this.root = this.panel = this.input = this.list = null;
      this.isOpen = false;
      var at = instances.indexOf(this);
      if (at !== -1) instances.splice(at, 1);
      return this;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      if (this.root) this.root.setAttribute('data-theme', resolveTheme(this.opts.theme));
    },

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      if (this.root) return;
      var self = this;
      var L = this.opts.labels;
      var listId = this._idBase + '-list';

      var root = document.createElement('div');
      root.className = 'vcmd' + saltClass();
      root.style.display = 'none';

      var backdrop = document.createElement('div');
      backdrop.className = 'vcmd-backdrop';
      backdrop.addEventListener('click', function () { self.close(); });
      root.appendChild(backdrop);

      var panel = document.createElement('div');
      panel.className = 'vcmd-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', L.title);
      // Focus lives in the input for the whole session (ARIA combobox
      // pattern); swallow mousedown elsewhere so clicks can't steal it.
      panel.addEventListener('mousedown', function (e) {
        if (e.target !== self.input) e.preventDefault();
      });
      root.appendChild(panel);

      var search = document.createElement('div');
      search.className = 'vcmd-search';
      var glass = document.createElement('span');
      glass.className = 'vcmd-glass';
      glass.innerHTML = MAGNIFIER;
      search.appendChild(glass);

      var input = document.createElement('input');
      input.className = 'vcmd-input';
      input.type = 'text';
      input.placeholder = this.opts.placeholder;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', listId);
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-label', L.search);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      input.addEventListener('input', function () { self._render(input.value); });
      input.addEventListener('keydown', function (e) { self._onKeydown(e); });
      search.appendChild(input);
      panel.appendChild(search);

      var list = document.createElement('div');
      list.className = 'vcmd-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.commands);
      list.addEventListener('mouseover', function (e) {
        var at = self._optionIndex(e.target);
        if (at !== -1 && !self._rows[at].cmd.disabled) self._setActive(at, false);
      });
      list.addEventListener('click', function (e) {
        var at = self._optionIndex(e.target);
        if (at !== -1) self._run(at);
      });
      panel.appendChild(list);

      var footer = document.createElement('div');
      footer.className = 'vcmd-footer';
      footer.setAttribute('aria-hidden', 'true');
      footer.appendChild(footItem(['↑', '↓'], L.navigate));
      footer.appendChild(footItem(['↵'], L.run));
      footer.appendChild(footItem(['esc'], L.close));
      panel.appendChild(footer);

      document.body.appendChild(root);
      this.root = root;
      this.panel = panel;
      this.input = input;
      this.list = list;
    },

    _optionIndex: function (target) {
      var el = target;
      while (el && el !== this.list) {
        if (el.getAttribute && el.getAttribute('data-index') != null) {
          return +el.getAttribute('data-index');
        }
        el = el.parentNode;
      }
      return -1;
    },

    /* ---------------- results + rendering ---------------- */

    // Empty query → every command, grouped in registration order (Recent
    // first when enabled). Non-empty → flat list sorted by fuzzy score,
    // capped at maxResults.
    _results: function (query) {
      var q = fold(query).replace(/\s+/g, '');
      var rows = [];
      var i, cmd;

      if (!q) {
        if (this.opts.recent && this._recent.length) {
          rows.push({ group: this.opts.labels.recent });
          for (i = 0; i < this._recent.length; i++) {
            var at = this._indexOf(this._recent[i]);
            if (at !== -1) rows.push({ cmd: this.commands[at], positions: null });
          }
        }
        // Groups in first-registration order; ungrouped commands lead with
        // no header of their own.
        var order = [], seen = {};
        for (i = 0; i < this.commands.length; i++) {
          var g = this.commands[i].group;
          if (!seen[g]) { seen[g] = true; order.push(g); }
        }
        for (var gi = 0; gi < order.length; gi++) {
          if (order[gi]) rows.push({ group: order[gi] });
          for (i = 0; i < this.commands.length; i++) {
            cmd = this.commands[i];
            if (cmd.group === order[gi]) rows.push({ cmd: cmd, positions: null });
          }
        }
        return rows;
      }

      var scored = [];
      for (i = 0; i < this.commands.length; i++) {
        cmd = this.commands[i];
        var best = fuzzyMatch(q, cmd.label);
        var positions = best ? best.positions : null;
        for (var k = 0; k < cmd.keywords.length; k++) {
          var m = fuzzyMatch(q, cmd.keywords[k]);
          // Keyword hits rank a shade below equal label hits and never
          // highlight (the matched text isn't on screen).
          if (m && (!best || m.score - 1 > best.score)) {
            best = m;
            positions = null;
          }
        }
        if (best) scored.push({ cmd: cmd, positions: positions, score: best.score, idx: i });
      }
      scored.sort(function (a, b) {
        return b.score - a.score || a.idx - b.idx; // stable: registration order breaks ties
      });
      var max = +this.opts.maxResults || 12;
      if (scored.length > max) scored.length = max;
      for (i = 0; i < scored.length; i++) {
        rows.push({ cmd: scored[i].cmd, positions: scored[i].positions });
      }
      return rows;
    },

    _render: function (query) {
      this._query = String(query == null ? '' : query);
      var rows = this._results(this._query);
      var list = this.list;
      list.textContent = '';
      this._rows = [];
      this._optEls = [];
      this._active = -1;

      if (!rows.length) {
        var empty = document.createElement('div');
        empty.className = 'vcmd-empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = this.opts.emptyText;
        list.appendChild(empty);
        this._setActive(-1, false);
        return;
      }

      var firstEnabled = -1;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.group != null) {
          var head = document.createElement('div');
          head.className = 'vcmd-group';
          head.setAttribute('role', 'presentation');
          head.textContent = row.group;
          list.appendChild(head);
          continue;
        }
        var n = this._rows.length;
        this._rows.push(row);
        var opt = this._buildOption(row.cmd, row.positions, n);
        this._optEls.push(opt);
        list.appendChild(opt);
        if (firstEnabled === -1 && !row.cmd.disabled) firstEnabled = n;
      }
      list.scrollTop = 0;
      this._setActive(firstEnabled, false);
    },

    _buildOption: function (cmd, positions, n) {
      var opt = document.createElement('div');
      opt.className = 'vcmd-option' + (cmd.disabled ? ' is-disabled' : '');
      opt.id = this._idBase + '-opt-' + n;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', 'false');
      opt.setAttribute('data-index', String(n));
      if (cmd.disabled) opt.setAttribute('aria-disabled', 'true');

      if (cmd.icon) {
        var icon = document.createElement('span');
        icon.className = 'vcmd-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = cmd.icon; // documented as TRUSTED markup
        opt.appendChild(icon);
      }
      opt.appendChild(buildLabel(cmd.label, positions));
      if (cmd.hint) {
        var hint = document.createElement('span');
        hint.className = 'vcmd-hint';
        hint.textContent = cmd.hint;
        opt.appendChild(hint);
      }
      return opt;
    },

    _setActive: function (n, scroll) {
      this._active = n;
      for (var i = 0; i < this._optEls.length; i++) {
        var on = i === n;
        this._optEls[i].classList.toggle('is-active', on);
        this._optEls[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      if (n === -1) this.input.removeAttribute('aria-activedescendant');
      else this.input.setAttribute('aria-activedescendant', this._optEls[n].id);
      if (scroll && n !== -1) {
        // Manual "nearest" scrolling; .vcmd-list is the offset parent.
        var el = this._optEls[n], list = this.list;
        if (el.offsetTop < list.scrollTop) {
          list.scrollTop = el.offsetTop;
        } else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
    },

    _move: function (dir) {
      var n = this._rows.length;
      if (!n) return;
      var i = this._active;
      for (var step = 0; step < n; step++) {
        i = (i + dir + n) % n; // wrap both ways
        if (!this._rows[i].cmd.disabled) {
          this._setActive(i, true);
          return;
        }
      }
    },

    /* ---------------- keyboard ---------------- */

    _onKeydown: function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'Down') {
        e.preventDefault();
        this._move(1);
      } else if (k === 'ArrowUp' || k === 'Up') {
        e.preventDefault();
        this._move(-1);
      } else if (k === 'Enter') {
        if (e.isComposing) return;
        e.preventDefault();
        this._run(this._active);
      } else if (k === 'Escape' || k === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        // First Esc clears a non-empty query; the second closes.
        if (this.input.value) {
          this.input.value = '';
          this._render('');
        } else {
          this.close();
        }
      } else if (k === 'Tab') {
        e.preventDefault(); // focus stays trapped in the combobox
      }
    },

    _run: function (n) {
      var row = this._rows[n];
      if (!row || row.cmd.disabled) return;
      var cmd = row.cmd;
      this.close(); // close FIRST so the action can open dialogs / move focus
      this._remember(cmd.id);
      if (cmd.action) cmd.action(cmd, this);
      if (this.opts.onRun) this.opts.onRun(cmd, this);
    }
  };

  function buildLabel(text, positions) {
    // Matched characters are wrapped with DOM methods — user strings never
    // pass through innerHTML.
    var label = document.createElement('span');
    label.className = 'vcmd-label';
    text = String(text);
    if (!positions || !positions.length) {
      label.textContent = text;
      return label;
    }
    var last = 0, i = 0;
    while (i < positions.length) {
      var start = positions[i], end = start + 1;
      while (i + 1 < positions.length && positions[i + 1] === end) { i++; end++; }
      if (start > last) label.appendChild(document.createTextNode(text.slice(last, start)));
      var mark = document.createElement('span');
      mark.className = 'vcmd-mark';
      mark.textContent = text.slice(start, end);
      label.appendChild(mark);
      last = end;
      i++;
    }
    if (last < text.length) label.appendChild(document.createTextNode(text.slice(last)));
    return label;
  }

  function footItem(keys, text) {
    var item = document.createElement('span');
    for (var i = 0; i < keys.length; i++) {
      var key = document.createElement('span');
      key.className = 'vcmd-key';
      key.textContent = keys[i];
      item.appendChild(key);
    }
    item.appendChild(document.createTextNode(text));
    return item;
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

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  CommandPalette.version = '1.0.0';
  CommandPalette.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(CommandPalette, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    CommandPalette.css = renderCss();
  }

  CommandPalette.defaults = {
    hotkey: 'mod+k',        // 'mod' = Cmd on macOS, Ctrl elsewhere; false disables
    placeholder: 'Type a command…',
    maxResults: 12,         // cap on FILTERED results (empty query shows all)
    emptyText: 'No matching commands',
    recent: false,          // true = in-memory "Recent" group (last 5 run, no storage)
    styles: true,           // false = headless, no CSS ever injected
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    labels: {
      title: 'Command palette',
      search: 'Search commands',
      commands: 'Commands',
      recent: 'Recent',
      navigate: 'navigate',
      run: 'run',
      close: 'close'
    },
    onOpen: null,           // fn(palette)
    onClose: null,          // fn(palette)
    onRun: null             // fn(command, palette)
  };

  // Zero-setup surface: the statics below proxy a lazily created default
  // instance, so `CommandPalette.register({...})` is all a page needs.
  var defaultInstance = null;

  function getDefault() {
    if (!defaultInstance) defaultInstance = new CommandPalette();
    return defaultInstance;
  }

  CommandPalette.register = function (commands) {
    getDefault().register(commands);
    return CommandPalette;
  };
  CommandPalette.unregister = function (id) {
    getDefault().unregister(id);
    return CommandPalette;
  };
  CommandPalette.open = function () { getDefault().open(); return CommandPalette; };
  CommandPalette.close = function () { getDefault().close(); return CommandPalette; };
  CommandPalette.toggle = function () { getDefault().toggle(); return CommandPalette; };

  // Declarative opener: any [data-command-open] element opens the default
  // palette on click.
  CommandPalette.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-command-open]');
    var wired = [];
    for (var i = 0; i < els.length; i++) {
      if (els[i]._vcmdWired) continue;
      els[i]._vcmdWired = true;
      els[i].addEventListener('click', function () { CommandPalette.open(); });
      wired.push(els[i]);
    }
    return wired;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { CommandPalette.autoInit(); });
    } else {
      CommandPalette.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  CommandPalette.displayName = 'CommandPalette';
  CommandPalette.rootClass = 'vcmd';
  CommandPalette.themeVars = {
    accent: '--vcmd-accent',
    radius: '--vcmd-radius',
    font: '--vcmd-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  CommandPalette.varScopes = ['.vcmd', '.vcmd[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('command', CommandPalette);
  }

  return CommandPalette;
});

/* ==== form/form.js ==== */
/*!
 * Vanilla UI Kit Form v1.0.0
 * A single-file, zero-dependency reactive form primitive for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="form.js"></script>
 *   <script>
 *     new Form('#signup', {
 *       fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
 *       onSubmit: function (values) { return api.save(values); }
 *     })
 *   </script>
 *
 * Or enhance an existing <form>:
 *   new Form(document.querySelector('form'))
 *
 * Headless:
 *   Form.defaults.styles = false   // no CSS injected; style .vfm-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Form = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-form-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Form.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Form.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the fields; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vfm{--vfm-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vfm{' +
      '--vfm-accent:#5b5bd6;' +
      '--vfm-danger:#e5484d;' +
      '--vfm-success:#1f9d5b;' +
      '--vfm-bg:#ffffff;' +
      '--vfm-surface:#f2f2f5;' +
      '--vfm-text:#1c1d21;' +
      '--vfm-muted:#72747e;' +
      '--vfm-faint:#e7e7ec;' +
      '--vfm-accent-soft:rgba(91,91,214,.13);' +
      '--vfm-danger-soft:rgba(229,72,77,.12);' +
      '--vfm-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vfm-radius:12px;' +
      '--vfm-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vfm[data-theme=dark]{' +
      '--vfm-accent:#7b7bea;' +
      '--vfm-danger:#f2555a;' +
      '--vfm-success:#4ccb8f;' +
      '--vfm-bg:#1b1d24;' +
      '--vfm-surface:#272a33;' +
      '--vfm-text:#e9eaf0;' +
      '--vfm-muted:#989aa6;' +
      '--vfm-faint:#31343f;' +
      '--vfm-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vfm{' +
      '--vfm-accent-soft:color-mix(in srgb,var(--vfm-accent) 14%,transparent);' +
      '--vfm-danger-soft:color-mix(in srgb,var(--vfm-danger) 13%,transparent);}}' +
    '.vfm.SALT{display:block;color:var(--vfm-text);font-family:var(--vfm-font);' +
      'font-size:14px;line-height:1.5;text-align:left;}' +
    '.vfm.SALT *,.vfm.SALT *::before,.vfm.SALT *::after{box-sizing:border-box;}' +
    /* field scaffolding */
    '.vfm.SALT .vfm-field{margin:0 0 18px;}' +
    '.vfm.SALT .vfm-label{display:block;font-weight:600;font-size:13.5px;margin:0 0 6px;}' +
    '.vfm.SALT .vfm-req{color:var(--vfm-danger);}' +
    '.vfm.SALT .vfm-hint{color:var(--vfm-muted);font-size:12.5px;margin:-3px 0 6px;}' +
    '.vfm.SALT .vfm-error{color:var(--vfm-danger);font-size:13px;margin:5px 0 0;}' +
    '.vfm.SALT .vfm-error:empty{margin:0;}' +
    /* inputs — same look as the family's datepicker/select controls */
    '.vfm.SALT .vfm-input{width:100%;font:inherit;color:var(--vfm-text);' +
      'background:var(--vfm-bg);border:1px solid var(--vfm-faint);border-radius:10px;' +
      'padding:9px 12px;margin:0;transition:border-color .12s ease,box-shadow .12s ease;}' +
    '.vfm.SALT .vfm-input::placeholder{color:var(--vfm-muted);}' +
    '.vfm.SALT .vfm-input:focus{outline:none;}' +
    '.vfm.SALT .vfm-input:focus-visible{border-color:var(--vfm-accent);' +
      'box-shadow:0 0 0 3px var(--vfm-accent-soft);}' +
    '.vfm.SALT .vfm-input:disabled{opacity:.55;background:var(--vfm-surface);' +
      'cursor:not-allowed;}' +
    '.vfm.SALT .vfm-input.is-invalid,.vfm.SALT .is-invalid .vfm-input{' +
      'border-color:var(--vfm-danger);}' +
    '.vfm.SALT .vfm-input.is-invalid:focus-visible,' +
      '.vfm.SALT .is-invalid .vfm-input:focus-visible{' +
      'box-shadow:0 0 0 3px var(--vfm-danger-soft);}' +
    '.vfm.SALT textarea.vfm-input{resize:vertical;min-height:38px;}' +
    '.vfm.SALT textarea.vfm-grow{resize:none;overflow:hidden;}' +
    '.vfm.SALT select.vfm-input{-webkit-appearance:none;appearance:none;' +
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'none\'%3E%3Cpath d=\'M3.5 6l4.5 4.5L12.5 6\' stroke=\'%2372747e\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");' +
      'background-repeat:no-repeat;background-position:right 10px center;' +
      'padding-right:34px;cursor:pointer;}' +
    /* password field with show/hide toggle */
    '.vfm.SALT .vfm-inputwrap{position:relative;}' +
    '.vfm.SALT .vfm-inputwrap .vfm-input{padding-right:42px;}' +
    '.vfm.SALT .vfm-eye{position:absolute;top:50%;right:6px;transform:translateY(-50%);' +
      'width:28px;height:28px;display:grid;place-items:center;color:var(--vfm-muted);' +
      'background:none;border:0;border-radius:6px;padding:0;cursor:pointer;' +
      'transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vfm.SALT .vfm-eye:hover{background:var(--vfm-surface);color:var(--vfm-text);}' +
    '.vfm.SALT .vfm-eye svg{display:block;}' +
    /* checkbox, switch, radio */
    '.vfm.SALT .vfm-check{display:flex;align-items:flex-start;gap:10px;}' +
    '.vfm.SALT .vfm-check .vfm-label{margin:0;font-weight:500;cursor:pointer;}' +
    '.vfm.SALT .vfm-check input{flex:none;width:16px;height:16px;margin:2px 0 0;' +
      'accent-color:var(--vfm-accent);cursor:pointer;}' +
    '.vfm.SALT .vfm-switch input{-webkit-appearance:none;appearance:none;width:36px;' +
      'height:20px;margin:0;border:0;border-radius:999px;background:var(--vfm-faint);' +
      'position:relative;transition:background .15s ease;}' +
    '.vfm.SALT .vfm-switch input::after{content:"";position:absolute;top:2px;left:2px;' +
      'width:16px;height:16px;border-radius:50%;background:#fff;' +
      'box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s ease;}' +
    '.vfm.SALT .vfm-switch input:checked{background:var(--vfm-accent);}' +
    '.vfm.SALT .vfm-switch input:checked::after{transform:translateX(16px);}' +
    '.vfm.SALT .vfm-fieldset{border:0;padding:0;margin:0;min-width:0;}' +
    '.vfm.SALT .vfm-fieldset legend.vfm-label{padding:0;}' +
    '.vfm.SALT .vfm-option{display:flex;align-items:center;gap:8px;margin:0 0 6px;' +
      'font-weight:400;cursor:pointer;}' +
    '.vfm.SALT .vfm-option input{flex:none;width:15px;height:15px;margin:0;' +
      'accent-color:var(--vfm-accent);cursor:pointer;}' +
    '.vfm.SALT .vfm-check input:focus,.vfm.SALT .vfm-option input:focus{outline:none;}' +
    '.vfm.SALT .vfm-check input:focus-visible,.vfm.SALT .vfm-option input:focus-visible,' +
      '.vfm.SALT .vfm-eye:focus-visible{' +
      'outline:2px solid var(--vfm-accent);outline-offset:1px;}' +
    /* form-level banner (errors) + status live region (success) */
    '.vfm.SALT .vfm-banner{background:var(--vfm-danger-soft);' +
      'border:1px solid var(--vfm-danger);color:var(--vfm-danger);' +
      'border-radius:var(--vfm-radius);padding:10px 14px;margin:0 0 16px;' +
      'font-size:13.5px;}' +
    '.vfm.SALT .vfm-banner:focus{outline:none;}' +
    '.vfm.SALT .vfm-banner:focus-visible{outline:2px solid var(--vfm-danger);' +
      'outline-offset:2px;}' +
    '.vfm.SALT .vfm-status{color:var(--vfm-success);font-size:13.5px;margin:10px 0 0;}' +
    '.vfm.SALT .vfm-status:empty{margin:0;}' +
    /* submit button + loading spinner */
    '.vfm.SALT .vfm-actions{margin:6px 0 0;}' +
    '.vfm.SALT .vfm-submit{position:relative;font:inherit;font-weight:600;font-size:14px;' +
      'color:#fff;background:var(--vfm-accent);border:0;border-radius:10px;' +
      'padding:10px 18px;cursor:pointer;transition:filter .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vfm.SALT .vfm-submit:hover{filter:brightness(1.08);}' +
    '.vfm.SALT .vfm-submit:disabled{opacity:.6;cursor:not-allowed;}' +
    '.vfm.SALT .vfm-submit:focus{outline:none;}' +
    '.vfm.SALT .vfm-submit:focus-visible{outline:2px solid var(--vfm-accent);' +
      'outline-offset:2px;}' +
    '.vfm.SALT .is-loading{position:relative;color:transparent!important;' +
      'pointer-events:none;}' +
    '.vfm.SALT .is-loading::after{content:"";position:absolute;width:16px;height:16px;' +
      'top:50%;left:50%;margin:-8px 0 0 -8px;border:2px solid var(--vfm-accent-soft);' +
      'border-top-color:currentColor;border-top-color:var(--vfm-accent);' +
      'border-radius:50%;animation:vfm-spin .7s linear infinite;}' +
    '.vfm.SALT .vfm-submit.is-loading::after{border-color:rgba(255,255,255,.35);' +
      'border-top-color:#fff;}' +
    '@keyframes vfm-spin{to{transform:rotate(360deg);}}' +
    /* honeypot — off-viewport, NOT display:none (bots check for that) */
    '.vfm.SALT .vfm-hp{position:absolute!important;left:-9999px!important;' +
      'top:auto!important;width:1px;height:1px;overflow:hidden;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vfm.SALT,.vfm.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/form.css), or set Form.salt to your
  // own token / false BEFORE the first form is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Form.salt;
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
    // Insert before the page's own CSS so `.vfm { --vfm-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    eye: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M1.7 8S4 3.8 8 3.8 14.3 8 14.3 8 12 12.2 8 12.2 1.7 8 1.7 8Z"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
    eyeOff: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/>' +
      '<path d="M6.4 4.1C6.9 4 7.4 3.8 8 3.8c4 0 6.3 4.2 6.3 4.2a12.6 12.6 0 0 1-2 2.4' +
      'M4.2 4.9A12 12 0 0 0 1.7 8S4 12.2 8 12.2c1 0 1.9-.3 2.7-.7"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"' +
      ' stroke-linejoin="round"/></svg>'
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

  // '{min}' style message interpolation.
  function msgFmt(tpl, repl) {
    var out = String(tpl);
    for (var k in repl) out = out.split('{' + k + '}').join(String(repl[k]));
    return out;
  }

  // Value equality good enough for form state: scalars strictly, arrays by item.
  function eqValues(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    return false;
  }

  function isEmptyValue(v) {
    if (v == null || v === false) return true;
    if (Array.isArray(v)) return v.length === 0;
    return String(v).replace(/^\s+|\s+$/g, '') === '';
  }

  function isThenable(x) {
    return x && typeof x.then === 'function';
  }

  // Accepts [{value, label, disabled}] or ['a', 'b'] shorthand.
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
          disabled: !!o.disabled
        });
      } else {
        out.push({ value: String(o), label: String(o), disabled: false });
      }
    }
    return out;
  }

  // Family lookup: standalone global first, then the VC registry.
  function familyComponent(globalName, vcKey) {
    if (!HAS_DOM) return null;
    if (typeof window[globalName] === 'function') return window[globalName];
    var reg = window.VC && window.VC.components;
    if (reg && typeof reg[vcKey] === 'function') return reg[vcKey];
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Validators — PURE functions, usable in Node with no DOM.
   * Contract: return null when valid, a message string when invalid.
   * Format validators pass on empty values; pair them with `required`.
   * ------------------------------------------------------------------ */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

  var validators = {
    required: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      return isEmptyValue(v) ? labels.required : null;
    },
    email: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      return EMAIL_RE.test(String(v)) ? null : labels.email;
    },
    url: function (v, _values, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      return URL_RE.test(String(v)) ? null : labels.url;
    },
    number: function (v, min, max, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      var n = +v;
      if (isNaN(n)) return labels.number;
      if (min != null && min !== '' && n < +min) return msgFmt(labels.min, { min: min });
      if (max != null && max !== '' && n > +max) return msgFmt(labels.max, { max: max });
      return null;
    },
    length: function (v, min, max, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v)) return null;
      var len = String(v).length;
      if (min != null && min !== '' && len < +min) return msgFmt(labels.minlength, { min: min });
      if (max != null && max !== '' && len > +max) return msgFmt(labels.maxlength, { max: max });
      return null;
    },
    pattern: function (v, pattern, labels) {
      labels = labels || Form.defaults.labels;
      if (isEmptyValue(v) || !pattern) return null;
      var re;
      try {
        re = pattern instanceof RegExp ? pattern : new RegExp('^(?:' + pattern + ')$');
      } catch (err) {
        return null; // a broken pattern must not brick the form
      }
      return re.test(String(v)) ? null : labels.pattern;
    }
  };

  /* ------------------------------------------------------------------ *
   * Defaults.
   * ------------------------------------------------------------------ */

  var DEFAULTS = {
    fields: null,           // [{name, type, label, …}] — schema mode
    validateOn: 'blur',     // 'blur' | 'change' | 'submit'; erroring fields go live
    onSubmit: null,         // fn(values, form) → any | Promise; resolve = success
    onError: null,          // fn(err, form) after error handling has rendered
    onChange: null,         // fn(values, form) on any value change
    onSpam: null,           // fn(values) when the honeypot / time gate trips
    action: null,           // URL — the form fetches for you (see `encoding`)
    method: null,           // defaults to the form's method attr, else POST
    encoding: 'json',       // 'json' | 'form' (FormData); enhance+action attr → 'form'
    headers: null,          // extra request headers ({'X-CSRF-Token': …})
    honeypot: true,         // decoy field + minimum-fill-time gate
    honeypotName: null,     // decoy field name; auto-generated when null
    minFillTime: 1500,      // ms; faster submits are treated as bots
    resetOnSuccess: false,
    successMessage: null,   // rendered in the status live region (Toast if present)
    submitLabel: null,      // schema mode button text; false = no button
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vfm-* yourself
    labels: {
      required: 'This field is required',
      email: 'Enter a valid email address',
      url: 'Enter a valid URL',
      number: 'Enter a number',
      min: 'Must be at least {min}',
      max: 'Must be at most {max}',
      minlength: 'Must be at least {min} characters',
      maxlength: 'Must be at most {max} characters',
      pattern: 'Does not match the expected format',
      phone: 'Enter a valid phone number',
      submit: 'Submit',
      submitError: 'Something went wrong. Please try again.',
      showPassword: 'Show password',
      hidePassword: 'Hide password'
    }
  };

  // Realistic decoy names — bots auto-fill fields that look like real ones.
  var HP_NAMES = ['website_url', 'company_website', 'homepage_url', 'contact_website'];

  /* ------------------------------------------------------------------ *
   * SSR / null-target: an inert handle whose whole API is a harmless no-op.
   * ------------------------------------------------------------------ */

  function inertHandle() {
    var h = {
      el: null, form: null, values: {}, errors: {},
      getValue: function () { return undefined; },
      setValue: function () { return h; },
      setValues: function () { return h; },
      setError: function () { return h; },
      clearErrors: function () { return h; },
      isDirty: function () { return false; },
      isValid: function () { return true; },
      watch: function () { return function () {}; },
      validate: function () {
        return typeof Promise !== 'undefined' ? Promise.resolve(true) : true;
      },
      submit: function () {
        return typeof Promise !== 'undefined' ? Promise.resolve(false) : false;
      },
      reset: function () { return h; },
      enable: function () { return h; },
      disable: function () { return h; },
      destroy: function () { return h; }
    };
    return h;
  }

  /* ------------------------------------------------------------------ *
   * Form.
   * ------------------------------------------------------------------ */

  function Form(target, options) {
    // SSR / no target: return an inert handle so calling code never branches.
    if (!HAS_DOM || target == null) return inertHandle();
    var el = resolveElement(target);
    if (!el) throw new Error('Form: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options);
    this._enhance = el.tagName === 'FORM';
    this._uid = 'vfm-' + (++uid);
    this._fields = [];        // ordered field records
    this._byName = {};        // name → field record
    this._errors = {};        // name → message
    this._watchers = [];
    this._submitting = false;
    this._disabled = false;

    // Enhance mode adopts the form's own action/method attributes when no
    // submission option is given — classic progressive enhancement.
    if (this._enhance && this.opts.action == null && el.getAttribute('action')) {
      this.opts.action = el.getAttribute('action');
      if (options.encoding === undefined) this.opts.encoding = 'form';
    }

    if (this.opts.styles !== false) injectStyles();

    if (this._enhance) this._adopt();
    else this._build();
    this._addChrome();
    this._upgradeFields();

    // Capture initial values AFTER upgrades so snapshots agree with the DOM.
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      f.initial = this._read(f);
      f._last = f.initial;
    }

    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
    this._renderedAt = new Date().getTime(); // honeypot time gate anchor
  }

  // Live snapshots: `form.values` / `form.errors` are plain-object copies.
  try {
    Object.defineProperty(Form.prototype, 'values', {
      get: function () { return this._snapshotValues(); },
      enumerable: false, configurable: true
    });
    Object.defineProperty(Form.prototype, 'errors', {
      get: function () {
        var out = {};
        for (var k in this._errors) out[k] = this._errors[k];
        return out;
      },
      enumerable: false, configurable: true
    });
  } catch (err) { /* pre-ES5 engines get method access only */ }

  Form.prototype._snapshotValues = function () {
    var out = {};
    if (!this.form) return out;
    for (var i = 0; i < this._fields.length; i++) {
      out[this._fields[i].name] = this._read(this._fields[i]);
    }
    return out;
  };

  /* ---------------- schema mode: DOM construction ---------------- */

  Form.prototype._build = function () {
    var form = document.createElement('form');
    form.className = 'vfm' + saltClass();
    form.setAttribute('novalidate', '');
    this.form = form;

    var specs = this.opts.fields || [];
    for (var i = 0; i < specs.length; i++) {
      if (specs[i] && specs[i].name) this._buildField(specs[i]);
    }

    if (this.opts.submitLabel !== false) {
      var actions = document.createElement('div');
      actions.className = 'vfm-actions';
      var btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'vfm-submit';
      btn.textContent = this.opts.submitLabel != null
        ? String(this.opts.submitLabel) : this.opts.labels.submit;
      actions.appendChild(btn);
      form.appendChild(actions);
      this._submitBtn = btn;
    }

    this.el.appendChild(form);
  };

  Form.prototype._buildField = function (spec) {
    var type = spec.type || 'text';
    var name = String(spec.name);
    var id = this._uid + '-' + name;

    // Hidden fields need no wrapper, label, or validation UI.
    if (type === 'hidden') {
      var hi = document.createElement('input');
      hi.type = 'hidden';
      hi.name = name;
      hi.value = spec.value != null ? String(spec.value) : '';
      this.form.appendChild(hi);
      this._register({ name: name, kind: 'text', spec: spec, inputs: [hi],
        el: null, errorEl: null });
      return;
    }

    var field = document.createElement('div');
    field.className = 'vfm-field';
    field.setAttribute('data-name', name);

    var errorEl = document.createElement('div');
    errorEl.className = 'vfm-error';
    errorEl.id = id + '-err';
    errorEl.setAttribute('aria-live', 'polite');

    var hintEl = null;
    if (spec.hint) {
      hintEl = document.createElement('div');
      hintEl.className = 'vfm-hint';
      hintEl.id = id + '-hint';
      // Hints are TEXT by default; `html: true` is an opt-in for TRUSTED markup.
      if (spec.html) hintEl.innerHTML = String(spec.hint);
      else hintEl.textContent = String(spec.hint);
    }
    var describedBy = (hintEl ? hintEl.id + ' ' : '') + errorEl.id;

    var record = { name: name, spec: spec, el: field, errorEl: errorEl,
      hintEl: hintEl, inputs: [], kind: 'text' };
    var i, input, label;

    if (type === 'checkbox' || type === 'switch') {
      record.kind = 'checkbox';
      var row = document.createElement('div');
      row.className = 'vfm-check' + (type === 'switch' ? ' vfm-switch' : '');
      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.name = name;
      input.checked = !!spec.value;
      if (spec.required) input.required = true;
      if (spec.disabled) input.disabled = true;
      input.setAttribute('aria-describedby', describedBy);
      row.appendChild(input);
      label = document.createElement('label');
      label.className = 'vfm-label';
      label.htmlFor = id;
      label.textContent = spec.label != null ? String(spec.label) : name;
      this._appendReq(label, spec);
      row.appendChild(label);
      field.appendChild(row);
      record.inputs.push(input);
    } else if (type === 'radio') {
      record.kind = 'radio';
      // Radio groups get a fieldset/legend so the group itself is labelled.
      var fs = document.createElement('fieldset');
      fs.className = 'vfm-fieldset';
      fs.setAttribute('aria-describedby', describedBy);
      var legend = document.createElement('legend');
      legend.className = 'vfm-label';
      legend.textContent = spec.label != null ? String(spec.label) : name;
      this._appendReq(legend, spec);
      fs.appendChild(legend);
      if (hintEl) { fs.appendChild(hintEl); hintEl = null; }
      var opts = normalizeOptions(spec.options);
      for (i = 0; i < opts.length; i++) {
        var optLabel = document.createElement('label');
        optLabel.className = 'vfm-option';
        input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.id = id + '-' + i;
        input.value = opts[i].value;
        if (opts[i].value === String(spec.value != null ? spec.value : '')) {
          input.checked = true;
        }
        if (spec.disabled || opts[i].disabled) input.disabled = true;
        optLabel.htmlFor = input.id;
        optLabel.appendChild(input);
        var optText = document.createElement('span');
        optText.textContent = opts[i].label;
        optLabel.appendChild(optText);
        fs.appendChild(optLabel);
        record.inputs.push(input);
      }
      fs.appendChild(errorEl);
      field.appendChild(fs);
      this.form.appendChild(field);
      this._register(record);
      return; // error/hint already placed inside the fieldset
    } else if (type === 'select') {
      record.kind = 'select';
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('select');
      input.className = 'vfm-input';
      input.id = id;
      input.name = name;
      input.setAttribute('aria-describedby', describedBy);
      if (spec.required) input.required = true;
      if (spec.disabled) input.disabled = true;
      if (spec.placeholder) {
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = String(spec.placeholder);
        input.appendChild(ph);
      }
      var sopts = normalizeOptions(spec.options);
      for (i = 0; i < sopts.length; i++) {
        var op = document.createElement('option');
        op.value = sopts[i].value;
        op.textContent = sopts[i].label;
        if (sopts[i].disabled) op.disabled = true;
        if (spec.value != null && String(spec.value) === sopts[i].value) op.selected = true;
        input.appendChild(op);
      }
      field.appendChild(input);
      record.inputs.push(input);
    } else if (type === 'textarea') {
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('textarea');
      input.className = 'vfm-input' + (spec.autoGrow ? ' vfm-grow' : '');
      input.id = id;
      input.name = name;
      input.rows = spec.rows || 3;
      if (spec.value != null) input.value = String(spec.value);
      this._commonAttrs(input, spec, describedBy);
      field.appendChild(input);
      record.inputs.push(input);
    } else {
      // text, email, password, number, url, tel, date, phone.
      this._appendLabel(field, spec, id);
      if (hintEl) field.appendChild(hintEl);
      input = document.createElement('input');
      input.className = 'vfm-input';
      input.id = id;
      input.name = name;
      // Family-upgradeable types render native by default; the upgrade pass
      // below swaps in DatePicker/PhoneInput when those globals exist.
      if (type === 'date') {
        record.kind = 'date';
        input.type = familyComponent('DatePicker', 'datepicker') ? 'text' : 'date';
      } else if (type === 'phone') {
        record.kind = 'phone';
        input.type = 'tel';
      } else {
        input.type = type;
      }
      if (spec.value != null) input.value = String(spec.value);
      this._commonAttrs(input, spec, describedBy);
      record.inputs.push(input);

      if (type === 'password') {
        // Show/hide toggle — a real button, announced via aria-pressed.
        var wrap = document.createElement('div');
        wrap.className = 'vfm-inputwrap';
        wrap.appendChild(input);
        var eye = document.createElement('button');
        eye.type = 'button';
        eye.className = 'vfm-eye';
        eye.setAttribute('aria-label', this.opts.labels.showPassword);
        eye.setAttribute('aria-pressed', 'false');
        eye.innerHTML = ICONS.eye;
        wrap.appendChild(eye);
        field.appendChild(wrap);
        this._bindEye(eye, input);
      } else {
        field.appendChild(input);
      }
    }

    field.appendChild(errorEl);
    this.form.appendChild(field);
    this._register(record);
  };

  Form.prototype._appendLabel = function (field, spec, id) {
    var label = document.createElement('label');
    label.className = 'vfm-label';
    label.htmlFor = id;
    label.textContent = spec.label != null ? String(spec.label) : String(spec.name);
    this._appendReq(label, spec);
    field.appendChild(label);
  };

  Form.prototype._appendReq = function (label, spec) {
    if (!spec.required) return;
    var req = document.createElement('span');
    req.className = 'vfm-req';
    req.setAttribute('aria-hidden', 'true');
    req.textContent = ' *';
    label.appendChild(req);
  };

  Form.prototype._commonAttrs = function (input, spec, describedBy) {
    if (spec.placeholder) input.placeholder = String(spec.placeholder);
    if (spec.required) input.required = true;
    if (spec.disabled) input.disabled = true;
    if (spec.min != null) input.setAttribute('min', spec.min);
    if (spec.max != null) input.setAttribute('max', spec.max);
    if (spec.minlength != null) input.setAttribute('minlength', spec.minlength);
    if (spec.maxlength != null) input.setAttribute('maxlength', spec.maxlength);
    if (spec.pattern != null && !(spec.pattern instanceof RegExp)) {
      input.setAttribute('pattern', spec.pattern);
    }
    input.setAttribute('aria-describedby', describedBy);
  };

  Form.prototype._bindEye = function (eye, input) {
    var L = this.opts.labels;
    eye.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? L.hidePassword : L.showPassword);
      input.focus();
    });
  };

  /* ---------------- enhance mode: adopt an existing <form> ---------------- */

  Form.prototype._adopt = function () {
    var form = this.el;
    this.form = form;
    this._added = [];          // nodes we created (removed on destroy)
    this._addedClasses = [];   // classes we stamped on adopted controls
    form.classList.add('vfm');
    var s = saltToken();
    if (s) form.classList.add(s);
    this._hadNovalidate = form.hasAttribute('novalidate');
    form.setAttribute('novalidate', ''); // the kit renders constraint UX itself

    // Group named controls; same-name radios/checkboxes become one field.
    var groups = {}, order = [], i, c;
    for (i = 0; i < form.elements.length; i++) {
      c = form.elements[i];
      if (!c.name) continue;
      var tag = c.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') continue;
      var t = (c.type || '').toLowerCase();
      if (t === 'submit' || t === 'button' || t === 'reset' || t === 'image') continue;
      if (!groups[c.name]) { groups[c.name] = []; order.push(c.name); }
      groups[c.name].push(c);
    }

    for (i = 0; i < order.length; i++) {
      var name = order[i];
      var els = groups[name];
      var first = els[0];
      var type = (first.type || '').toLowerCase();
      var kind = 'text';
      if (first.tagName === 'SELECT') kind = 'select';
      else if (type === 'radio') kind = 'radio';
      else if (type === 'checkbox') kind = els.length > 1 ? 'checkboxes' : 'checkbox';
      else if (type === 'hidden') kind = 'text';

      var record = { name: name, kind: kind, inputs: els, el: null,
        errorEl: null, hintEl: null,
        // Attribute-derived spec so the same validator builder applies.
        spec: {
          name: name,
          type: type === 'email' || type === 'url' || type === 'number' ? type : kind,
          required: this._anyRequired(els),
          pattern: first.getAttribute('pattern') || null,
          min: first.getAttribute('min'),
          max: first.getAttribute('max'),
          minlength: first.getAttribute('minlength'),
          maxlength: first.getAttribute('maxlength')
        } };

      if (type !== 'hidden') {
        // The family input skin + a per-field error live region.
        for (var j = 0; j < els.length; j++) {
          var t2 = (els[j].type || '').toLowerCase();
          if (t2 !== 'checkbox' && t2 !== 'radio' && !els[j].classList.contains('vfm-input')) {
            els[j].classList.add('vfm-input');
            this._addedClasses.push(els[j]);
          }
        }
        var errorEl = document.createElement('div');
        errorEl.className = 'vfm-error';
        errorEl.id = this._uid + '-' + order.indexOf(name) + '-err';
        errorEl.setAttribute('aria-live', 'polite');
        var last = els[els.length - 1];
        var anchor = (last.closest && last.closest('label')) || last;
        if (anchor.parentNode) {
          anchor.parentNode.insertBefore(errorEl, anchor.nextSibling);
        } else {
          form.appendChild(errorEl);
        }
        this._added.push(errorEl);
        record.errorEl = errorEl;
        for (j = 0; j < els.length; j++) this._linkDescribedBy(els[j], errorEl.id);
      }

      this._register(record);
    }
  };

  Form.prototype._anyRequired = function (els) {
    for (var i = 0; i < els.length; i++) if (els[i].required) return true;
    return false;
  };

  Form.prototype._linkDescribedBy = function (el, id) {
    var cur = el.getAttribute('aria-describedby');
    el.setAttribute('aria-describedby', cur ? cur + ' ' + id : id);
  };

  Form.prototype._unlinkDescribedBy = function (el, id) {
    var cur = el.getAttribute('aria-describedby');
    if (!cur) return;
    var parts = cur.split(/\s+/), out = [];
    for (var i = 0; i < parts.length; i++) if (parts[i] && parts[i] !== id) out.push(parts[i]);
    if (out.length) el.setAttribute('aria-describedby', out.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  Form.prototype._register = function (record) {
    record.dirty = false;
    record.touched = false;
    record.upgrade = null;
    record.upgradeKind = null;
    record._phoneValid = null;
    record._vtoken = 0;
    record._wasDisabled = record.inputs.length ? !!record.inputs[0].disabled : false;
    record.validators = this._buildValidators(record);
    this._fields.push(record);
    this._byName[record.name] = record;
  };

  /* ---------------- shared chrome: banner, status, honeypot ---------------- */

  Form.prototype._addChrome = function () {
    var form = this.form;

    // Form-level error banner: focusable summary, announced assertively.
    var banner = document.createElement('div');
    banner.className = 'vfm-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('tabindex', '-1');
    banner.hidden = true;
    form.insertBefore(banner, form.firstChild);
    this._banner = banner;

    // Success/status live region — present up-front so SRs announce updates.
    var status = document.createElement('div');
    status.className = 'vfm-status';
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
    this._status = status;

    if (this._enhance) { this._added.push(banner); this._added.push(status); }

    if (!this.opts.honeypot) return;

    // Honeypot: an off-viewport decoy. NOT display:none — cheap bots skip
    // hidden fields; the wrapper is invisible to humans and assistive tech
    // (aria-hidden + tabindex=-1) but present in layout terms.
    var hpName = this.opts.honeypotName;
    if (!hpName) {
      hpName = HP_NAMES[Math.floor(Math.random() * HP_NAMES.length)];
      while (this._byName[hpName]) hpName += '_2'; // never shadow a real field
    }
    var hp = document.createElement('div');
    hp.className = 'vfm-hp';
    hp.setAttribute('aria-hidden', 'true');
    // Inline styles so the trap works headless (styles: false) too.
    hp.style.position = 'absolute';
    hp.style.left = '-9999px';
    hp.style.top = 'auto';
    hp.style.width = '1px';
    hp.style.height = '1px';
    hp.style.overflow = 'hidden';
    var hpLabel = document.createElement('label');
    hpLabel.htmlFor = this._uid + '-hp';
    hpLabel.textContent = 'Website';
    hp.appendChild(hpLabel);
    var hpInput = document.createElement('input');
    hpInput.type = 'text';
    hpInput.id = this._uid + '-hp';
    hpInput.name = hpName;
    hpInput.tabIndex = -1;
    hpInput.setAttribute('autocomplete', 'off');
    hp.appendChild(hpInput);
    form.appendChild(hp);
    this._hpInput = hpInput;

    // Elapsed-ms carrier so the SERVER can double-check the time gate.
    var hpt = document.createElement('input');
    hpt.type = 'hidden';
    hpt.name = '_hp_t';
    form.appendChild(hpt);
    this._hptInput = hpt;

    if (this._enhance) { this._added.push(hp); this._added.push(hpt); }
  };

  /* ---------------- family upgrades (schema mode) ---------------- */

  // select / date / phone fields render native controls; when the matching
  // family component is on the page it takes over the same element and is
  // wired into the form's value + validation state. Never required — a page
  // without those globals keeps fully working native fields.
  Form.prototype._upgradeFields = function () {
    if (this._enhance) return; // enhance mode leaves adopted controls alone
    var self = this;
    for (var i = 0; i < this._fields.length; i++) {
      (function (field) {
        var input = field.inputs[0];
        if (!input) return;
        var Ctor;
        try {
          if (field.kind === 'select' && (Ctor = familyComponent('Select', 'select'))) {
            field.upgrade = new Ctor(input, {
              onChange: function () { self._fieldChanged(field); }
            });
            field.upgradeKind = 'select';
          } else if (field.kind === 'date' && input.type === 'text' &&
              (Ctor = familyComponent('DatePicker', 'datepicker'))) {
            var dpOpts = { onSelect: function () { self._fieldChanged(field); } };
            if (field.spec.min != null) dpOpts.min = field.spec.min;
            if (field.spec.max != null) dpOpts.max = field.spec.max;
            field.upgrade = new Ctor(input, dpOpts);
            field.upgradeKind = 'date';
          } else if (field.kind === 'phone' &&
              (Ctor = familyComponent('PhoneInput', 'phoneinput'))) {
            field.upgrade = new Ctor(input, {
              onChange: function (val, inst) {
                // The phone component's own `.valid` flag feeds validation.
                var src = inst || field.upgrade;
                if (val && typeof val === 'object' && typeof val.valid === 'boolean') {
                  field._phoneValid = val.valid;
                } else if (src && typeof src.valid === 'boolean') {
                  field._phoneValid = src.valid;
                }
                self._fieldChanged(field);
              }
            });
            field.upgradeKind = 'phone';
          }
        } catch (err) {
          // An upgrade failure degrades to the native control — never fatal.
          field.upgrade = null;
          field.upgradeKind = null;
          if (typeof console !== 'undefined') console.error('Form upgrade:', err);
        }
      })(this._fields[i]);
    }
  };

  /* ---------------- events ---------------- */

  Form.prototype._bind = function () {
    var self = this;
    this._onSubmitEvt = function (e) {
      e.preventDefault();
      self.submit();
    };
    this._onInputEvt = function (e) { self._handleFieldEvent(e); };
    this._onFocusOutEvt = function (e) {
      var field = self._fieldFromTarget(e.target);
      if (!field) return;
      field.touched = true;
      if (self.opts.validateOn === 'blur' || self._errors[field.name] != null) {
        self._validateField(field, false);
      }
    };
    this.form.addEventListener('submit', this._onSubmitEvt);
    this.form.addEventListener('input', this._onInputEvt);
    this.form.addEventListener('change', this._onInputEvt);
    this.form.addEventListener('focusout', this._onFocusOutEvt);
  };

  Form.prototype._fieldFromTarget = function (t) {
    return (t && t.name && this._byName[t.name]) || null;
  };

  Form.prototype._handleFieldEvent = function (e) {
    var field = this._fieldFromTarget(e.target);
    if (!field) return;
    if (field.spec.autoGrow && e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
    this._fieldChanged(field);
  };

  // Central change funnel — every path (typing, upgrades, setValue) lands
  // here; equality-checking dedupes double-fired input/change pairs.
  Form.prototype._fieldChanged = function (field) {
    if (!this.form) return;
    var v = this._read(field);
    if (eqValues(v, field._last)) return;
    field._last = v;
    field.dirty = !eqValues(v, field.initial);
    if (this._errors[field.name] != null || this.opts.validateOn === 'change') {
      this._validateField(field, false); // live re-validate erroring fields
    }
    this._notifyChange(field, v);
  };

  Form.prototype._notifyChange = function (field, value) {
    var meta = {
      dirty: field.dirty,
      touched: field.touched,
      error: this._errors[field.name] || null
    };
    var ws = this._watchers.slice();
    var values = null;
    for (var i = 0; i < ws.length; i++) {
      if (ws[i].name === field.name) ws[i].fn(value, meta);
      else if (ws[i].name == null) {
        if (!values) values = this._snapshotValues();
        ws[i].fn(values, field.name, meta);
      }
    }
    if (this.opts.onChange) {
      this.opts.onChange(values || this._snapshotValues(), this);
    }
  };

  /* ---------------- reading & writing control values ---------------- */

  Form.prototype._read = function (field) {
    var k = field.kind, inputs = field.inputs, i;
    if (k === 'checkbox') return !!inputs[0].checked;
    if (k === 'checkboxes') {
      var arr = [];
      for (i = 0; i < inputs.length; i++) if (inputs[i].checked) arr.push(inputs[i].value);
      return arr;
    }
    if (k === 'radio') {
      for (i = 0; i < inputs.length; i++) if (inputs[i].checked) return inputs[i].value;
      return '';
    }
    if (k === 'select') {
      if (field.upgrade && typeof field.upgrade.getValue === 'function') {
        var v = field.upgrade.getValue();
        return v == null ? '' : v;
      }
      if (inputs[0].multiple) {
        var out = [];
        for (i = 0; i < inputs[0].options.length; i++) {
          if (inputs[0].options[i].selected) out.push(inputs[0].options[i].value);
        }
        return out;
      }
      return inputs[0].value;
    }
    if (k === 'phone' && field.upgrade && typeof field.upgrade.getValue === 'function') {
      var pv = field.upgrade.getValue();
      if (pv && typeof pv === 'object' && pv.value != null) return String(pv.value);
      if (typeof pv === 'string') return pv;
    }
    return inputs[0].value;
  };

  Form.prototype._write = function (field, v) {
    var k = field.kind, inputs = field.inputs, i;
    try {
      if (k === 'checkbox') { inputs[0].checked = !!v; return; }
      if (k === 'checkboxes') {
        var vals = Array.isArray(v) ? v : (v == null || v === '' ? [] : [String(v)]);
        for (i = 0; i < inputs.length; i++) {
          inputs[i].checked = vals.indexOf(inputs[i].value) !== -1;
        }
        return;
      }
      if (k === 'radio') {
        for (i = 0; i < inputs.length; i++) {
          inputs[i].checked = inputs[i].value === String(v == null ? '' : v);
        }
        return;
      }
      if (field.upgrade) {
        if (field.upgradeKind === 'select') {
          field.upgrade.setValue(v == null || v === '' ? null : v, { silent: true });
          return;
        }
        if (field.upgradeKind === 'date' && typeof field.upgrade.setDate === 'function') {
          field.upgrade.setDate(v == null || v === '' ? null : v, { silent: true });
          return;
        }
        if (field.upgradeKind === 'phone' && typeof field.upgrade.setValue === 'function') {
          field.upgrade.setValue(v == null ? '' : v, { silent: true });
          return;
        }
      }
      if (k === 'select' && inputs[0].multiple) {
        var mv = Array.isArray(v) ? v : (v == null || v === '' ? [] : [String(v)]);
        for (i = 0; i < inputs[0].options.length; i++) {
          inputs[0].options[i].selected = mv.indexOf(inputs[0].options[i].value) !== -1;
        }
        return;
      }
      inputs[0].value = v == null ? '' : String(v);
    } catch (err) { /* e.g. file inputs — value is read-only */ }
  };

  /* ---------------- validation ---------------- */

  Form.prototype._buildValidators = function (record) {
    var spec = record.spec || {};
    var L = this.opts.labels;
    var fns = [];
    var t = spec.type;

    if (spec.required) {
      fns.push(function (v) { return validators.required(v, null, L); });
    }
    if (t === 'email') {
      fns.push(function (v) { return validators.email(v, null, L); });
    }
    if (t === 'url') {
      fns.push(function (v) { return validators.url(v, null, L); });
    }
    if (t === 'number') {
      fns.push(function (v) { return validators.number(v, spec.min, spec.max, L); });
    }
    if (spec.minlength != null || spec.maxlength != null) {
      fns.push(function (v) {
        return validators.length(v, spec.minlength, spec.maxlength, L);
      });
    }
    if (spec.pattern) {
      fns.push(function (v) { return validators.pattern(v, spec.pattern, L); });
    }
    if (t === 'phone' || record.kind === 'phone') {
      // Only meaningful once a PhoneInput upgrade reports a verdict.
      fns.push(function (v) {
        return (!isEmptyValue(v) && record._phoneValid === false) ? L.phone : null;
      });
    }
    var custom = spec.validate;
    if (typeof custom === 'function') fns.push(custom);
    else if (Array.isArray(custom)) {
      for (var i = 0; i < custom.length; i++) {
        if (typeof custom[i] === 'function') fns.push(custom[i]);
      }
    }
    return fns;
  };

  // Runs a field's chain; returns message | null, or a thenable when an
  // async validator (username-taken checks etc.) is in play.
  Form.prototype._runValidators = function (field) {
    var values = this._snapshotValues();
    var v = values[field.name];
    var fns = field.validators;
    var i = 0;
    function step() {
      while (i < fns.length) {
        var res;
        try { res = fns[i++](v, values); }
        catch (err) { res = (err && err.message) || 'Invalid value'; }
        if (isThenable(res)) {
          return res.then(
            function (m) { return m ? m : step(); },
            function (err) { return (err && err.message) || 'Invalid value'; }
          );
        }
        if (res) return res;
      }
      return null;
    }
    return step();
  };

  Form.prototype._validateField = function (field, silent) {
    var self = this;
    var token = ++field._vtoken;
    var r = this._runValidators(field);
    if (isThenable(r)) {
      return r.then(function (m) {
        // A newer validation superseded this one — its verdict is stale.
        if (token !== field._vtoken) return self._errors[field.name] || null;
        return self._applyValidity(field, m, silent);
      });
    }
    return this._applyValidity(field, r, silent);
  };

  Form.prototype._applyValidity = function (field, msg, silent) {
    if (!silent) {
      if (msg) this._errors[field.name] = msg;
      else delete this._errors[field.name];
      this._renderError(field, msg);
    }
    return msg || null;
  };

  Form.prototype._renderError = function (field, msg) {
    if (field.errorEl) field.errorEl.textContent = msg ? String(msg) : '';
    for (var i = 0; i < field.inputs.length; i++) {
      var input = field.inputs[i];
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (input.classList) input.classList.toggle('is-invalid', !!msg);
    }
    if (field.el && field.el.classList) field.el.classList.toggle('is-invalid', !!msg);
  };

  // Full validation pass; resolves true when everything is clean.
  Form.prototype.validate = function (config) {
    if (!this.form) return Promise.resolve(true);
    var silent = !!(config && config.silent);
    var pending = [];
    var bad = false;
    for (var i = 0; i < this._fields.length; i++) {
      var r = this._validateField(this._fields[i], silent);
      if (isThenable(r)) pending.push(r);
      else if (r) bad = true;
    }
    if (!pending.length) return Promise.resolve(!bad);
    return Promise.all(pending).then(function (msgs) {
      for (var j = 0; j < msgs.length; j++) if (msgs[j]) bad = true;
      return !bad;
    });
  };

  // Synchronous verdict: async validators still in flight count as valid.
  Form.prototype.isValid = function () {
    if (!this.form) return true;
    for (var i = 0; i < this._fields.length; i++) {
      var r = this._runValidators(this._fields[i]);
      if (r && !isThenable(r)) return false;
    }
    return true;
  };

  Form.prototype._focusFirstInvalid = function () {
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      if (this._errors[f.name] == null) continue;
      this._focusField(f);
      return;
    }
  };

  Form.prototype._focusField = function (field) {
    try {
      if (field.upgradeKind === 'select' && field.upgrade &&
          field.upgrade._control && field.upgrade._control.focus) {
        field.upgrade._control.focus();
      } else if (field.inputs[0] && field.inputs[0].focus) {
        field.inputs[0].focus();
      }
    } catch (err) { /* focusing must never throw */ }
  };

  /* ---------------- banner / status / loading ---------------- */

  Form.prototype._showBanner = function (msg) {
    if (!this._banner) return;
    this._banner.textContent = String(msg);
    this._banner.hidden = false;
    try { this._banner.focus(); } catch (err) { /* ignore */ }
  };

  Form.prototype._clearBanner = function () {
    if (!this._banner) return;
    this._banner.textContent = '';
    this._banner.hidden = true;
  };

  Form.prototype._setStatus = function (msg) {
    if (this._status) this._status.textContent = msg ? String(msg) : '';
  };

  Form.prototype._submitButton = function () {
    if (this._submitBtn) return this._submitBtn;
    return this.form.querySelector(
      'button[type=submit],input[type=submit],button:not([type])');
  };

  Form.prototype._setLoading = function (on) {
    var btn = this._submitButton();
    if (!btn) return;
    if (on) {
      this._btnWasDisabled = btn.disabled;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.disabled = !!this._btnWasDisabled || this._disabled;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
    }
  };

  /* ---------------- submission ---------------- */

  Form.prototype.submit = function () {
    var self = this;
    if (!this.form || this._submitting || this._disabled) return Promise.resolve(false);
    this._submitting = true;
    this._clearBanner();
    this._setStatus('');

    // Honeypot + time gate: pretend everything worked. The bot learns
    // nothing; onSpam gives the host page a logging hook.
    var elapsed = new Date().getTime() - this._renderedAt;
    var trapped = (this._hpInput && this._hpInput.value !== '') ||
      (this.opts.honeypot && elapsed < this.opts.minFillTime);
    if (trapped) {
      if (this.opts.onSpam) {
        try { this.opts.onSpam(this._snapshotValues()); } catch (err) { /* ignore */ }
      }
      this._submitting = false;
      this._succeed();
      return Promise.resolve(true);
    }
    if (this._hptInput) this._hptInput.value = String(elapsed);

    return this.validate().then(function (ok) {
      if (!self.form) { self._submitting = false; return false; }
      if (!ok) {
        self._submitting = false;
        self._focusFirstInvalid();
        return false;
      }
      var values = self._snapshotValues();
      self._setLoading(true);
      var p;
      try {
        if (self.opts.onSubmit) p = self.opts.onSubmit(values, self);
        else if (self.opts.action) p = self._send(values, elapsed);
        else p = null; // client-only form: valid = success
      } catch (err) {
        p = Promise.reject(err);
      }
      return Promise.resolve(p).then(
        function () {
          self._submitting = false;
          if (!self.form) return true;
          self._setLoading(false);
          self._succeed();
          return true;
        },
        function (err) {
          self._submitting = false;
          if (!self.form) return false;
          self._handleSubmitError(err);
          return false;
        }
      );
    });
  };

  Form.prototype._succeed = function () {
    this._setLoading(false);
    this._errors = {};
    for (var i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    if (this.opts.resetOnSuccess) this.reset();
    var msg = this.opts.successMessage;
    if (msg) {
      // Converge with the family: a Toast on the page beats an inline note.
      if (window.Toast && typeof window.Toast.success === 'function') {
        window.Toast.success(msg);
      } else {
        this._setStatus(msg);
      }
    }
  };

  // Error contract: Error → focused form-level banner; {field: msg} or
  // {errors: {field: msg}} (e.g. a server 422 body) → distributed to fields
  // with the first one focused; anything else → generic banner.
  Form.prototype._handleSubmitError = function (err) {
    this._setLoading(false);
    var L = this.opts.labels;
    var map = null;
    if (err && typeof err === 'object' && !(err instanceof Error)) {
      if (err.errors && typeof err.errors === 'object') map = err.errors;
      else map = err;
    }
    if (map) {
      var first = null;
      for (var name in map) {
        var f = this._byName[name];
        if (!f) continue;
        this._errors[name] = String(map[name]);
        this._renderError(f, String(map[name]));
        if (!first) first = f;
      }
      if (first) this._focusField(first);
      else this._showBanner(L.submitError); // unknown shape → generic
    } else {
      this._showBanner((err && err.message) ? String(err.message) : L.submitError);
    }
    if (this.opts.onError) this.opts.onError(err, this);
  };

  Form.prototype._send = function (values, elapsed) {
    var opts = this.opts;
    var L = opts.labels;
    var url = opts.action;
    var method = String(opts.method ||
      (this._enhance && this.form.getAttribute('method')) || 'POST').toUpperCase();

    // Shallow copy + the elapsed-ms carrier for server-side spam checks.
    var payload = {}, k;
    for (k in values) payload[k] = values[k];
    payload._hp_t = elapsed;

    var headers = {};
    if (opts.headers) for (k in opts.headers) headers[k] = opts.headers[k];

    var body;
    if (method === 'GET' || method === 'HEAD') {
      var qs = [];
      for (k in payload) {
        var qv = payload[k];
        if (Array.isArray(qv)) {
          for (var qi = 0; qi < qv.length; qi++) {
            qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(qv[qi]));
          }
        } else {
          qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(qv == null ? '' : qv));
        }
      }
      url += (url.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
      body = undefined;
    } else if (opts.encoding === 'form' && typeof FormData !== 'undefined') {
      body = new FormData();
      for (k in payload) {
        var fv = payload[k];
        if (Array.isArray(fv)) {
          for (var fi = 0; fi < fv.length; fi++) body.append(k, fv[fi]);
        } else if (typeof fv === 'boolean') {
          if (fv) body.append(k, '1');
        } else {
          body.append(k, fv == null ? '' : fv);
        }
      }
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    function conclude(ok, status, text) {
      var data = null;
      try { data = JSON.parse(text); } catch (err) { /* non-JSON body */ }
      if (ok) return data;
      // 422-style { errors: {field: message} } is handled out of the box.
      if (data && data.errors && typeof data.errors === 'object') {
        var fieldErr = { errors: data.errors, status: status };
        throw fieldErr;
      }
      var e = new Error((data && (data.message || data.error)) || L.submitError);
      e.status = status;
      throw e;
    }

    if (typeof fetch === 'function') {
      return fetch(url, {
        method: method,
        headers: headers,
        body: body,
        credentials: 'same-origin'
      }).then(function (res) {
        return res.text().then(function (text) {
          return conclude(res.ok, res.status, text);
        });
      });
    }

    // XMLHttpRequest fallback for fetch-less browsers.
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url, true);
      for (var h in headers) x.setRequestHeader(h, headers[h]);
      x.onreadystatechange = function () {
        if (x.readyState !== 4) return;
        if (x.status === 0) { reject(new Error(L.submitError)); return; }
        try {
          resolve(conclude(x.status >= 200 && x.status < 300, x.status, x.responseText));
        } catch (err) {
          reject(err);
        }
      };
      x.send(body === undefined ? null : body);
    });
  };

  /* ---------------- public reactive API ---------------- */

  Form.prototype.getValue = function (name) {
    if (!this.form) return undefined;
    var f = this._byName[name];
    return f ? this._read(f) : undefined;
  };

  Form.prototype.setValue = function (name, v, config) {
    if (!this.form) return this;
    var f = this._byName[name];
    if (!f) return this;
    this._write(f, v);
    if (config && config.silent) {
      f._last = this._read(f);
      f.dirty = !eqValues(f._last, f.initial);
    } else {
      this._fieldChanged(f);
    }
    return this;
  };

  Form.prototype.setValues = function (obj, config) {
    if (!this.form || !obj) return this;
    for (var name in obj) this.setValue(name, obj[name], config);
    return this;
  };

  Form.prototype.setError = function (name, msg) {
    if (!this.form) return this;
    var f = this._byName[name];
    if (!f) return this;
    if (msg) this._errors[name] = String(msg);
    else delete this._errors[name];
    this._renderError(f, msg);
    return this;
  };

  Form.prototype.clearErrors = function () {
    if (!this.form) return this;
    this._errors = {};
    for (var i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    this._clearBanner();
    return this;
  };

  Form.prototype.isDirty = function () {
    if (!this.form) return false;
    for (var i = 0; i < this._fields.length; i++) if (this._fields[i].dirty) return true;
    return false;
  };

  // watch('email', fn(value, meta)) — one field.
  // watch(fn(values, changedName, meta)) — any change.
  // Both return an unsubscribe function.
  Form.prototype.watch = function (name, fn) {
    if (typeof name === 'function') { fn = name; name = null; }
    if (typeof fn !== 'function' || !this.form) return function () {};
    var entry = { name: name, fn: fn };
    var watchers = this._watchers;
    watchers.push(entry);
    return function () {
      var i = watchers.indexOf(entry);
      if (i !== -1) watchers.splice(i, 1);
    };
  };

  Form.prototype.reset = function () {
    if (!this.form) return this;
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      f._vtoken++; // discard in-flight async verdicts
      this._write(f, f.initial);
      f._last = f.initial;
      f.dirty = false;
      f.touched = false;
      f._phoneValid = null;
    }
    this._errors = {};
    for (i = 0; i < this._fields.length; i++) this._renderError(this._fields[i], null);
    this._clearBanner();
    this._setStatus('');
    return this;
  };

  Form.prototype.enable = function () {
    if (!this.form) return this;
    this._disabled = false;
    this.form.classList.remove('is-disabled');
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      for (var j = 0; j < f.inputs.length; j++) f.inputs[j].disabled = f._wasDisabled;
      if (f.upgrade && !f._wasDisabled && typeof f.upgrade.enable === 'function') {
        f.upgrade.enable();
      }
    }
    var btn = this._submitButton();
    if (btn) btn.disabled = false;
    return this;
  };

  Form.prototype.disable = function () {
    if (!this.form) return this;
    this._disabled = true;
    this.form.classList.add('is-disabled');
    for (var i = 0; i < this._fields.length; i++) {
      var f = this._fields[i];
      for (var j = 0; j < f.inputs.length; j++) f.inputs[j].disabled = true;
      if (f.upgrade && typeof f.upgrade.disable === 'function') f.upgrade.disable();
    }
    var btn = this._submitButton();
    if (btn) btn.disabled = true;
    return this;
  };

  // Tear down: schema mode removes the built DOM; enhance mode restores the
  // original form (listeners, classes, attributes, added nodes).
  Form.prototype.destroy = function () {
    if (!this.form) return this;
    unwatchAutoTheme(this);
    this.form.removeEventListener('submit', this._onSubmitEvt);
    this.form.removeEventListener('input', this._onInputEvt);
    this.form.removeEventListener('change', this._onInputEvt);
    this.form.removeEventListener('focusout', this._onFocusOutEvt);

    var i, f;
    for (i = 0; i < this._fields.length; i++) {
      f = this._fields[i];
      if (f.upgrade && typeof f.upgrade.destroy === 'function') {
        try { f.upgrade.destroy(); } catch (err) { /* ignore */ }
      }
    }

    if (this._enhance) {
      for (i = 0; i < this._added.length; i++) {
        if (this._added[i].parentNode) {
          this._added[i].parentNode.removeChild(this._added[i]);
        }
      }
      for (i = 0; i < this._addedClasses.length; i++) {
        this._addedClasses[i].classList.remove('vfm-input');
      }
      for (i = 0; i < this._fields.length; i++) {
        f = this._fields[i];
        for (var j = 0; j < f.inputs.length; j++) {
          f.inputs[j].removeAttribute('aria-invalid');
          f.inputs[j].classList.remove('is-invalid');
          if (f.errorEl) this._unlinkDescribedBy(f.inputs[j], f.errorEl.id);
        }
      }
      this.form.classList.remove('vfm');
      var s = saltToken();
      if (s) this.form.classList.remove(s);
      this.form.removeAttribute('data-theme');
      if (!this._hadNovalidate) this.form.removeAttribute('novalidate');
    } else if (this.form.parentNode) {
      this.form.parentNode.removeChild(this.form);
    }

    if (instances) instances.delete(this.el);
    this._fields = [];
    this._byName = {};
    this._watchers = [];
    this.form = null;
    return this;
  };

  /* ---------------- theming ---------------- */

  Form.prototype._applyTheme = function () {
    if (!this.form) return;
    var t = this.opts.theme;
    var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    this.form.setAttribute('data-theme', resolved);
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Form.version = VERSION;
  Form.defaults = DEFAULTS;
  Form.validators = validators;

  Form.create = function (target, options) {
    return new Form(target, options);
  };

  Form.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vfmValidateOn) o.validateOn = d.vfmValidateOn;
    if (d.vfmEncoding) o.encoding = d.vfmEncoding;
    if (d.vfmAction) o.action = d.vfmAction;
    if (d.vfmMethod) o.method = d.vfmMethod;
    if (d.vfmSuccess) o.successMessage = d.vfmSuccess;
    if (d.vfmTheme) o.theme = d.vfmTheme;
    if (d.vfmHoneypotName) o.honeypotName = d.vfmHoneypotName;
    if (d.vfmMinFillTime != null && d.vfmMinFillTime !== '') {
      o.minFillTime = +d.vfmMinFillTime;
    }
    if (d.vfmHoneypot != null) o.honeypot = parseBool(d.vfmHoneypot);
    if (d.vfmStyles != null) o.styles = parseBool(d.vfmStyles);
    if (d.vfmReset != null) o.resetOnSuccess = parseBool(d.vfmReset);
    return o;
  }

  // <form data-vfm> = enhance with attribute-derived options.
  Form.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('form[data-vfm]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Form(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad form must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Form auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Form.autoInit(); });
    } else {
      Form.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Form.displayName = 'Form';
  Form.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Form, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Form.css = renderCss();
  }
  Form.rootClass = 'vfm';
  Form.themeVars = {
    accent: '--vfm-accent',
    radius: '--vfm-radius',
    font: '--vfm-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Form.varScopes = ['.vfm', '.vfm[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('form', Form);
  }

  return Form;
});

/* ==== phone/phone.js ==== */
/*!
 * Vanilla UI Kit Phone Input v1.0.0
 * A single-file, zero-dependency international phone input for vanilla JS.
 * Country button with SVG flag + dial code, searchable country dropdown,
 * as-you-type national formatting, pragmatic validation, E.164 output.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="phone.js"></script>
 *   <input id="phone">
 *   <script>new PhoneInput('#phone', { country: 'us' })</script>
 *
 * Or zero-JS:
 *   <input data-vph data-country="ae">
 *
 * Headless:
 *   PhoneInput.defaults.styles = false   // no CSS injected; style .vph-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PhoneInput = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-phone-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `PhoneInput.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when PhoneInput.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vph{--vph-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vph,.vph-panel{' +
      '--vph-accent:#5b5bd6;' +
      '--vph-bg:#ffffff;' +
      '--vph-surface:#f2f2f5;' +
      '--vph-text:#1c1d21;' +
      '--vph-muted:#72747e;' +
      '--vph-faint:#e7e7ec;' +
      '--vph-danger:#e5484d;' +
      '--vph-success:#1f9d5b;' +
      '--vph-ring:rgba(91,91,214,.16);' +
      '--vph-shadow:0 14px 36px rgba(24,25,32,.16),0 3px 10px rgba(24,25,32,.08);' +
      '--vph-radius:10px;' +
      '--vph-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vph,.vph-panel{' +
      '--vph-ring:color-mix(in srgb,var(--vph-accent) 18%,transparent);' +
    '}}' +
    '.vph[data-theme=dark],.vph-panel[data-theme=dark]{' +
      '--vph-accent:#7b7bea;' +
      '--vph-bg:#1b1d24;' +
      '--vph-surface:#272a33;' +
      '--vph-text:#e9eaf0;' +
      '--vph-muted:#989aa6;' +
      '--vph-faint:#31343f;' +
      '--vph-danger:#f2555a;' +
      '--vph-success:#4ccb8f;' +
      '--vph-ring:rgba(123,123,234,.24);' +
      '--vph-shadow:0 14px 36px rgba(0,0,0,.5),0 3px 10px rgba(0,0,0,.35);}' +
    /* field — input styling consistent with the datepicker's input/panel look */
    '.vph.SALT{display:inline-flex;align-items:stretch;position:relative;box-sizing:border-box;' +
      'min-width:230px;background:var(--vph-bg);color:var(--vph-text);' +
      'font-family:var(--vph-font);font-size:14px;line-height:1.3;' +
      'border:1px solid var(--vph-faint);border-radius:var(--vph-radius);' +
      'transition:border-color .12s ease,box-shadow .12s ease;}' +
    '.vph.SALT *,.vph.SALT *::before,.vph.SALT *::after{box-sizing:border-box;}' +
    '.vph.SALT:focus-within{border-color:var(--vph-accent);box-shadow:0 0 0 3px var(--vph-ring);}' +
    '.vph.SALT.vph-invalid{border-color:var(--vph-danger);}' +
    '.vph.SALT.vph-invalid:focus-within{box-shadow:0 0 0 3px rgba(229,72,77,.16);}' +
    '.vph.SALT.vph-valid{border-color:var(--vph-success);}' +
    '.vph.SALT.vph-valid:focus-within{box-shadow:0 0 0 3px rgba(31,157,91,.16);}' +
    '.vph.SALT.vph-disabled{opacity:.55;pointer-events:none;}' +
    /* country button */
    '.vph.SALT .vph-country{display:flex;align-items:center;gap:6px;flex:none;' +
      'font:inherit;color:inherit;background:none;border:0;cursor:pointer;' +
      'border-right:1px solid var(--vph-faint);padding:0 8px 0 10px;' +
      'border-radius:var(--vph-radius) 0 0 var(--vph-radius);' +
      'transition:background .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vph.SALT .vph-country:hover{background:var(--vph-surface);}' +
    '.vph.SALT .vph-country:focus{outline:none;}' +
    '.vph.SALT .vph-country:focus-visible{outline:2px solid var(--vph-accent);outline-offset:-2px;}' +
    '.vph.SALT .vph-flag,.vph-panel.SALT .vph-flag{display:block;flex:none;width:20px;height:15px;' +
      'border-radius:2.5px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.09);}' +
    '.vph.SALT .vph-flag svg,.vph-panel.SALT .vph-flag svg{display:block;width:100%;height:100%;}' +
    '.vph.SALT .vph-dial{color:var(--vph-muted);font-size:13px;font-variant-numeric:tabular-nums;}' +
    '.vph.SALT .vph-caret{display:grid;place-items:center;color:var(--vph-muted);}' +
    '.vph.SALT .vph-caret svg{display:block;transition:transform .15s ease;}' +
    '.vph.SALT .vph-country[aria-expanded=true] .vph-caret svg{transform:rotate(180deg);}' +
    /* the tel input itself */
    '.vph.SALT .vph-input{flex:1;min-width:0;font:inherit;color:inherit;background:none;' +
      'border:0;padding:9px 12px;border-radius:0 var(--vph-radius) var(--vph-radius) 0;}' +
    '.vph.SALT .vph-input:focus{outline:none;}' +
    '.vph.SALT .vph-input::placeholder{color:var(--vph-muted);opacity:.75;}' +
    /* visually hidden live region */
    '.vph.SALT .vph-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}' +
    /* dropdown panel */
    '.vph-panel.SALT{position:absolute;z-index:99999;box-sizing:border-box;width:286px;' +
      'background:var(--vph-bg);color:var(--vph-text);font-family:var(--vph-font);font-size:14px;' +
      'line-height:1.3;border:1px solid var(--vph-faint);border-radius:12px;' +
      'box-shadow:var(--vph-shadow);overflow:hidden;opacity:0;transform:scale(.96);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.2);}' +
    '.vph-panel.SALT *,.vph-panel.SALT *::before,.vph-panel.SALT *::after{box-sizing:border-box;}' +
    '.vph-panel.SALT.vph-open{opacity:1;transform:none;}' +
    '.vph-panel.SALT .vph-search{padding:8px;border-bottom:1px solid var(--vph-faint);}' +
    '.vph-panel.SALT .vph-search input{width:100%;font:inherit;font-size:13px;color:inherit;' +
      'background:var(--vph-surface);border:1px solid transparent;border-radius:8px;' +
      'padding:7px 10px;}' +
    '.vph-panel.SALT .vph-search input:focus{outline:none;border-color:var(--vph-accent);}' +
    '.vph-panel.SALT .vph-search input::placeholder{color:var(--vph-muted);opacity:.8;}' +
    '.vph-panel.SALT .vph-list{list-style:none;margin:0;padding:6px;max-height:264px;' +
      'overflow-y:auto;overscroll-behavior:contain;}' +
    '.vph-panel.SALT .vph-opt{display:flex;align-items:center;gap:9px;padding:7px 9px;' +
      'border-radius:8px;cursor:pointer;}' +
    '.vph-panel.SALT .vph-opt-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;}' +
    '.vph-panel.SALT .vph-opt-dial{color:var(--vph-muted);font-size:12.5px;' +
      'font-variant-numeric:tabular-nums;}' +
    '.vph-panel.SALT .vph-opt:hover,.vph-panel.SALT .vph-opt.is-active{' +
      'background:var(--vph-surface);}' +
    '.vph-panel.SALT .vph-opt.is-selected{color:var(--vph-accent);font-weight:600;}' +
    '.vph-panel.SALT .vph-opt.is-selected .vph-opt-dial{color:var(--vph-accent);}' +
    '.vph-panel.SALT .vph-sep{height:1px;margin:5px 2px;background:var(--vph-faint);}' +
    '.vph-panel.SALT .vph-empty{padding:14px 10px;color:var(--vph-muted);font-size:13px;' +
      'text-align:center;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vph.SALT,.vph.SALT *,.vph-panel.SALT,.vph-panel.SALT *{' +
        'transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set PhoneInput.salt to your own token / false
  // BEFORE the first input is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = PhoneInput.salt;
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
    // Insert before the page's own CSS so `.vph { --vph-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var CARET = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
    '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var autoThemed = [];

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
    if (core) {
      core.theme.unwatch(refreshAutoThemes);
      return;
    }
    if (ownMql) {
      if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
      else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
    }
    if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Country data — one line per entry:
   *   'iso2|Name|dial|order|lengths|pattern|areaCodes'
   * order  — tiebreak for shared dial codes (0 = primary owner: +1 → US).
   * lengths — allowed NATIONAL digit counts (no trunk 0): '8', '8-9', '7,9'.
   * pattern — grouping template, '#' per digit ('(###) ###-####').
   * areaCodes — optional CSV of national prefixes used only to tell shared-
   *   code territories apart when parsing '+…' input (e.g. +1 242 → BS).
   * Dial codes are ITU-accurate; lengths are PRAGMATIC ranges, not a full
   * numbering plan (see opts.validator for stricter needs).
   * ------------------------------------------------------------------ */

  var DATA = [
    'ad|Andorra|376|0|6,9|### ###',
    'ae|United Arab Emirates|971|0|8-9|## ### ####',
    'af|Afghanistan|93|0|9|## ### ####',
    'ag|Antigua and Barbuda|1|2|10|(###) ###-####|268',
    'ai|Anguilla|1|2|10|(###) ###-####|264',
    'al|Albania|355|0|9|## ### ####',
    'am|Armenia|374|0|8|## ######',
    'ao|Angola|244|0|9|### ### ###',
    'ar|Argentina|54|0|10|## #### ####',
    'as|American Samoa|1|2|10|(###) ###-####|684',
    'at|Austria|43|0|4-13|### ######',
    'au|Australia|61|0|9|### ### ###',
    'aw|Aruba|297|0|7|### ####',
    'ax|Åland Islands|358|1|5-12|## ### ## ##|18',
    'az|Azerbaijan|994|0|9|## ### ## ##',
    'ba|Bosnia and Herzegovina|387|0|8-9|## ### ###',
    'bb|Barbados|1|2|10|(###) ###-####|246',
    'bd|Bangladesh|880|0|8-10|#### ######',
    'be|Belgium|32|0|8-9|### ## ## ##',
    'bf|Burkina Faso|226|0|8|## ## ## ##',
    'bg|Bulgaria|359|0|8-9|### ### ###',
    'bh|Bahrain|973|0|8|#### ####',
    'bi|Burundi|257|0|8|## ## ## ##',
    'bj|Benin|229|0|8-10|## ## ## ##',
    'bl|Saint Barthélemy|590|1|9|### ## ## ##',
    'bm|Bermuda|1|2|10|(###) ###-####|441',
    'bn|Brunei|673|0|7|### ####',
    'bo|Bolivia|591|0|8|# ### ####',
    'bq|Caribbean Netherlands|599|1|7|### ####|3,4,7',
    'br|Brazil|55|0|10-11|(##) #####-####',
    'bs|Bahamas|1|2|10|(###) ###-####|242',
    'bt|Bhutan|975|0|8|## ## ## ##',
    'bw|Botswana|267|0|7-8|## ### ###',
    'by|Belarus|375|0|9|## ### ## ##',
    'bz|Belize|501|0|7|### ####',
    'ca|Canada|1|1|10|(###) ###-####|204,226,236,249,250,263,289,306,343,354,365,367,368,382,387,403,416,418,428,431,437,438,450,456,468,474,506,514,519,548,579,581,584,587,600,604,613,639,647,672,683,705,709,742,753,778,780,782,807,819,825,867,873,879,902,905',
    'cc|Cocos (Keeling) Islands|61|1|9|### ### ###|89162',
    'cd|Congo (DRC)|243|0|9|## ### ####',
    'cf|Central African Republic|236|0|8|## ## ## ##',
    'cg|Congo (Republic)|242|0|9|## ### ####',
    'ch|Switzerland|41|0|9|## ### ## ##',
    'ci|Côte d’Ivoire|225|0|10|## ## ## ## ##',
    'ck|Cook Islands|682|0|5|## ###',
    'cl|Chile|56|0|9|# #### ####',
    'cm|Cameroon|237|0|9|# ## ## ## ##',
    'cn|China|86|0|11|### #### ####',
    'co|Colombia|57|0|10|### ### ####',
    'cr|Costa Rica|506|0|8|#### ####',
    'cu|Cuba|53|0|8|# ### ####',
    'cv|Cape Verde|238|0|7|### ## ##',
    'cw|Curaçao|599|0|7-8|# ### ####',
    'cx|Christmas Island|61|2|9|### ### ###|89164',
    'cy|Cyprus|357|0|8|## ######',
    'cz|Czech Republic|420|0|9|### ### ###',
    'de|Germany|49|0|6-11|#### #######',
    'dj|Djibouti|253|0|8|## ## ## ##',
    'dk|Denmark|45|0|8|## ## ## ##',
    'dm|Dominica|1|2|10|(###) ###-####|767',
    'do|Dominican Republic|1|2|10|(###) ###-####|809,829,849',
    'dz|Algeria|213|0|9|### ## ## ##',
    'ec|Ecuador|593|0|9|## ### ####',
    'ee|Estonia|372|0|7-8|#### ####',
    'eg|Egypt|20|0|10|### ### ####',
    'eh|Western Sahara|212|1|9|### ### ###|528',
    'er|Eritrea|291|0|7|# ### ###',
    'es|Spain|34|0|9|### ### ###',
    'et|Ethiopia|251|0|9|## ### ####',
    'fi|Finland|358|0|5-12|## ### ## ##',
    'fj|Fiji|679|0|7|### ####',
    'fk|Falkland Islands|500|0|5|#####',
    'fm|Micronesia|691|0|7|### ####',
    'fo|Faroe Islands|298|0|6|######',
    'fr|France|33|0|9|# ## ## ## ##',
    'ga|Gabon|241|0|7-8|# ## ## ##',
    'gb|United Kingdom|44|0|9-10|#### ######',
    'gd|Grenada|1|2|10|(###) ###-####|473',
    'ge|Georgia|995|0|9|### ### ###',
    'gf|French Guiana|594|0|9|### ## ## ##',
    'gg|Guernsey|44|1|10|#### ######|1481,7781,7839,7911',
    'gh|Ghana|233|0|9|## ### ####',
    'gi|Gibraltar|350|0|8|### #####',
    'gl|Greenland|299|0|6|## ## ##',
    'gm|Gambia|220|0|7|### ####',
    'gn|Guinea|224|0|9|### ### ###',
    'gp|Guadeloupe|590|0|9|### ## ## ##',
    'gq|Equatorial Guinea|240|0|9|### ### ###',
    'gr|Greece|30|0|10|### ### ####',
    'gt|Guatemala|502|0|8|#### ####',
    'gu|Guam|1|2|10|(###) ###-####|671',
    'gw|Guinea-Bissau|245|0|7-9|### ####',
    'gy|Guyana|592|0|7|### ####',
    'hk|Hong Kong|852|0|8|#### ####',
    'hn|Honduras|504|0|8|#### ####',
    'hr|Croatia|385|0|8-9|## ### ####',
    'ht|Haiti|509|0|8|## ## ####',
    'hu|Hungary|36|0|8-9|## ### ####',
    'id|Indonesia|62|0|8-12|### ### ####',
    'ie|Ireland|353|0|7-9|## ### ####',
    'il|Israel|972|0|8-9|## ### ####',
    'im|Isle of Man|44|2|10|#### ######|1624,7524,7624,7924',
    'in|India|91|0|10|##### #####',
    'io|British Indian Ocean Territory|246|0|7|### ####',
    'iq|Iraq|964|0|10|### ### ####',
    'ir|Iran|98|0|10|### ### ####',
    'is|Iceland|354|0|7|### ####',
    'it|Italy|39|0|6-11|### ### ####',
    'je|Jersey|44|3|10|#### ######|1534,7509,7700,7797,7829,7937',
    'jm|Jamaica|1|2|10|(###) ###-####|876,658',
    'jo|Jordan|962|0|8-9|# #### ####',
    'jp|Japan|81|0|10|## #### ####',
    'ke|Kenya|254|0|9|### ######',
    'kg|Kyrgyzstan|996|0|9|### ### ###',
    'kh|Cambodia|855|0|8-9|## ### ###',
    'ki|Kiribati|686|0|5-8|#####',
    'km|Comoros|269|0|7|### ## ##',
    'kn|Saint Kitts and Nevis|1|2|10|(###) ###-####|869',
    'kp|North Korea|850|0|8-10|### ### ####',
    'kr|South Korea|82|0|9-10|## #### ####',
    'kw|Kuwait|965|0|8|#### ####',
    'ky|Cayman Islands|1|2|10|(###) ###-####|345',
    'kz|Kazakhstan|7|1|10|### ### ## ##|6,7',
    'la|Laos|856|0|8-10|## ### ###',
    'lb|Lebanon|961|0|7-8|## ### ###',
    'lc|Saint Lucia|1|2|10|(###) ###-####|758',
    'li|Liechtenstein|423|0|7|### ####',
    'lk|Sri Lanka|94|0|9|## ### ####',
    'lr|Liberia|231|0|7-9|## ### ####',
    'ls|Lesotho|266|0|8|#### ####',
    'lt|Lithuania|370|0|8|### #####',
    'lu|Luxembourg|352|0|6-9|## ## ## ###',
    'lv|Latvia|371|0|8|## ### ###',
    'ly|Libya|218|0|9|## #######',
    'ma|Morocco|212|0|9|### ### ###',
    'mc|Monaco|377|0|8-9|## ## ## ##',
    'md|Moldova|373|0|8|## ### ###',
    'me|Montenegro|382|0|8|## ### ###',
    'mf|Saint Martin|590|2|9|### ## ## ##',
    'mg|Madagascar|261|0|9|## ## ### ##',
    'mh|Marshall Islands|692|0|7|### ####',
    'mk|North Macedonia|389|0|8|## ### ###',
    'ml|Mali|223|0|8|## ## ## ##',
    'mm|Myanmar|95|0|7-10|# ### ####',
    'mn|Mongolia|976|0|8|## ## ####',
    'mo|Macau|853|0|8|#### ####',
    'mp|Northern Mariana Islands|1|2|10|(###) ###-####|670',
    'mq|Martinique|596|0|9|### ## ## ##',
    'mr|Mauritania|222|0|8|## ## ## ##',
    'ms|Montserrat|1|2|10|(###) ###-####|664',
    'mt|Malta|356|0|8|#### ####',
    'mu|Mauritius|230|0|7-8|#### ####',
    'mv|Maldives|960|0|7|### ####',
    'mw|Malawi|265|0|7-9|### ### ###',
    'mx|Mexico|52|0|10|### ### ####',
    'my|Malaysia|60|0|9-10|## ### ####',
    'mz|Mozambique|258|0|8-9|## ### ####',
    'na|Namibia|264|0|9|## ### ####',
    'nc|New Caledonia|687|0|6|## ## ##',
    'ne|Niger|227|0|8|## ## ## ##',
    'nf|Norfolk Island|672|0|6|### ###',
    'ng|Nigeria|234|0|8-10|### ### ####',
    'ni|Nicaragua|505|0|8|#### ####',
    'nl|Netherlands|31|0|9|# ## ## ## ##',
    'no|Norway|47|0|8|### ## ###',
    'np|Nepal|977|0|10|### #######',
    'nr|Nauru|674|0|7|### ####',
    'nu|Niue|683|0|4-7|####',
    'nz|New Zealand|64|0|8-10|## ### ####',
    'om|Oman|968|0|8|#### ####',
    'pa|Panama|507|0|7-8|#### ####',
    'pe|Peru|51|0|9|### ### ###',
    'pf|French Polynesia|689|0|6-8|## ## ##',
    'pg|Papua New Guinea|675|0|7-8|### ####',
    'ph|Philippines|63|0|10|### ### ####',
    'pk|Pakistan|92|0|10|### #######',
    'pl|Poland|48|0|9|### ### ###',
    'pm|Saint Pierre and Miquelon|508|0|6|## ## ##',
    'pr|Puerto Rico|1|2|10|(###) ###-####|787,939',
    'ps|Palestine|970|0|9|### ### ###',
    'pt|Portugal|351|0|9|### ### ###',
    'pw|Palau|680|0|7|### ####',
    'py|Paraguay|595|0|9|### ######',
    'qa|Qatar|974|0|8|#### ####',
    're|Réunion|262|0|9|### ## ## ##',
    'ro|Romania|40|0|9|### ### ###',
    'rs|Serbia|381|0|8-9|## #######',
    'ru|Russia|7|0|10|### ### ## ##',
    'rw|Rwanda|250|0|9|### ### ###',
    'sa|Saudi Arabia|966|0|9|## ### ####',
    'sb|Solomon Islands|677|0|5-7|#####',
    'sc|Seychelles|248|0|7|# ### ###',
    'sd|Sudan|249|0|9|## ### ####',
    'se|Sweden|46|0|7-9|## ### ## ##',
    'sg|Singapore|65|0|8|#### ####',
    'sh|Saint Helena|290|0|4-5|#####',
    'si|Slovenia|386|0|8|## ### ###',
    'sj|Svalbard and Jan Mayen|47|1|8|### ## ###|79',
    'sk|Slovakia|421|0|9|### ### ###',
    'sl|Sierra Leone|232|0|8|## ######',
    'sm|San Marino|378|0|6-10|## ## ## ##',
    'sn|Senegal|221|0|9|## ### ## ##',
    'so|Somalia|252|0|7-9|## #######',
    'sr|Suriname|597|0|6-7|### ####',
    'ss|South Sudan|211|0|9|## ### ####',
    'st|São Tomé and Príncipe|239|0|7|### ####',
    'sv|El Salvador|503|0|8|#### ####',
    'sx|Sint Maarten|1|2|10|(###) ###-####|721',
    'sy|Syria|963|0|9|### ### ###',
    'sz|Eswatini|268|0|8|#### ####',
    'tc|Turks and Caicos Islands|1|2|10|(###) ###-####|649',
    'td|Chad|235|0|8|## ## ## ##',
    'tg|Togo|228|0|8|## ## ## ##',
    'th|Thailand|66|0|9|## ### ####',
    'tj|Tajikistan|992|0|9|## ### ####',
    'tk|Tokelau|690|0|4-7|####',
    'tl|Timor-Leste|670|0|7-8|### ####',
    'tm|Turkmenistan|993|0|8|## ######',
    'tn|Tunisia|216|0|8|## ### ###',
    'to|Tonga|676|0|5-7|#####',
    'tr|Turkey|90|0|10|### ### ## ##',
    'tt|Trinidad and Tobago|1|2|10|(###) ###-####|868',
    'tv|Tuvalu|688|0|5-6|#####',
    'tw|Taiwan|886|0|9|### ### ###',
    'tz|Tanzania|255|0|9|### ### ###',
    'ua|Ukraine|380|0|9|## ### ####',
    'ug|Uganda|256|0|9|### ######',
    'us|United States|1|0|10|(###) ###-####',
    'uy|Uruguay|598|0|8|#### ####',
    'uz|Uzbekistan|998|0|9|## ### ## ##',
    'va|Vatican City|39|1|10|### ### ####|06698',
    'vc|Saint Vincent and the Grenadines|1|2|10|(###) ###-####|784',
    've|Venezuela|58|0|10|### ### ####',
    'vg|British Virgin Islands|1|2|10|(###) ###-####|284',
    'vi|U.S. Virgin Islands|1|2|10|(###) ###-####|340',
    'vn|Vietnam|84|0|9-10|## ### ## ##',
    'vu|Vanuatu|678|0|5-7|#####',
    'wf|Wallis and Futuna|681|0|6|## ## ##',
    'ws|Samoa|685|0|5-7|## ####',
    'xk|Kosovo|383|0|8-9|## ### ###',
    'ye|Yemen|967|0|7-9|### ### ###',
    'za|South Africa|27|0|9|## ### ####',
    'zm|Zambia|260|0|9|## #######',
    'zw|Zimbabwe|263|0|8-10|## ### ####'
  ];

  // Parse the table once into records + lookup maps.
  var COUNTRIES = [];
  var BY_ISO = {};
  var BY_DIAL = {};   // dial → [records], sorted by `order`
  var DIAL_MAX = 1;

  function parseLens(spec) {
    var out = [], parts = spec.split(','), i, j, m;
    for (i = 0; i < parts.length; i++) {
      m = /^(\d+)-(\d+)$/.exec(parts[i]);
      if (m) { for (j = +m[1]; j <= +m[2]; j++) out.push(j); }
      else out.push(+parts[i]);
    }
    return out;
  }

  (function buildData() {
    var i, f, rec;
    for (i = 0; i < DATA.length; i++) {
      f = DATA[i].split('|');
      rec = {
        iso2: f[0],
        name: f[1],
        dialCode: f[2],
        order: +f[3],
        lengths: parseLens(f[4]),
        pattern: f[5] || '',
        areaCodes: f[6] ? f[6].split(',') : null
      };
      COUNTRIES.push(rec);
      BY_ISO[rec.iso2] = rec;
      (BY_DIAL[rec.dialCode] = BY_DIAL[rec.dialCode] || []).push(rec);
      if (rec.dialCode.length > DIAL_MAX) DIAL_MAX = rec.dialCode.length;
    }
    for (var d in BY_DIAL) {
      BY_DIAL[d].sort(function (a, b) { return a.order - b.order; });
    }
  })();

  /* ------------------------------------------------------------------ *
   * Flag engine — flagpack-style SIMPLIFIED flags, optimized for the
   * 20×15 button size. A declarative spec per country drives a tiny
   * renderer; ~15 famous flags with geometry the DSL can't approximate
   * (Union Jack, stars-and-stripes, …) are hand-written fragments.
   *
   * DSL: layers separated by ';', painted in order on a 20×15 canvas.
   * Colors are bare hex (no '#'); numeric params follow '@', CSV.
   *   f:C               full-field fill
   *   h:C1-C2[-…]       horizontal stripes top→bottom ('C*2' = double weight)
   *   v:C1-C2[-…]       vertical stripes left→right (same weights)
   *   r:C@x,y,w,h       rectangle (cantons, bands, fimbriations)
   *   c:C@x,y,r         disc            o:C@x,y,r,sw   ring (stroke sw)
   *   s:C@x,y,r         5-point star    m:C@x,y,r      crescent (opens right)
   *   t:C@w             hoist triangle (left edge → point at x=w)
   *   q:C@w             fly triangle (right edge → point at x=20-w)
   *   d:C@w  g:C@w      diagonal band ↗ (d) or ↘ (g), stroke width w
   *   w:C  e:C          upper-left / lower-right half along the ↗ diagonal
   *   u:C  l:C          upper-right / lower-left half along the ↘ diagonal
   *   y:C@w,cx          Nordic cross (vertical arm at cx, default 7.5)
   *   x:C@w,len         free-standing centered cross (Switzerland)
   *   p:C@x1,y1,x2,y2…  arbitrary polygon
   *   j[:C]             Union Jack canton (10×7.5), optionally filling C first
   * Anything not covered falls back to a neutral rounded ISO-code badge.
   * ------------------------------------------------------------------ */

  function fnum(v, dflt) {
    return (v == null || v === '' || isNaN(+v)) ? dflt : +v;
  }

  function svgRect(c, x, y, w, h) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="#' + c + '"/>';
  }

  function svgCircle(c, x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#' + c + '"/>';
  }

  function svgRing(c, x, y, r, sw) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="#' +
      c + '" stroke-width="' + sw + '"/>';
  }

  function svgLine(c, x1, y1, x2, y2, sw) {
    return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="#' + c +
      '" stroke-width="' + sw + '"/>';
  }

  function svgPoly(c, pts) {
    var d = 'M' + pts[0] + ' ' + pts[1];
    for (var i = 2; i < pts.length; i += 2) d += 'L' + pts[i] + ' ' + pts[i + 1];
    return '<path d="' + d + 'Z" fill="#' + c + '"/>';
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  // 5-point star, point up; inner radius fixed at .42r.
  function svgStar(c, x, y, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = (-90 + i * 36) * Math.PI / 180;
      var rad = (i % 2) ? r * 0.42 : r;
      pts.push(round2(x + rad * Math.cos(a)), round2(y + rad * Math.sin(a)));
    }
    return svgPoly(c, pts);
  }

  // Crescent opening right: outer arc bulges left, shallow inner arc returns.
  function svgCrescent(c, x, y, r) {
    var ri = round2(r * 1.2);
    return '<path d="M' + x + ' ' + round2(y - r) +
      'A' + r + ' ' + r + ' 0 1 0 ' + x + ' ' + round2(y + r) +
      'A' + ri + ' ' + ri + ' 0 0 1 ' + x + ' ' + round2(y - r) +
      'Z" fill="#' + c + '"/>';
  }

  function stripes(colors, horizontal) {
    var parts = colors.split('-'), items = [], total = 0, i, m;
    for (i = 0; i < parts.length; i++) {
      m = /^([0-9a-fA-F]+)(?:\*([\d.]+))?$/.exec(parts[i]);
      if (!m) continue;
      items.push({ c: m[1], w: m[2] ? +m[2] : 1 });
      total += m[2] ? +m[2] : 1;
    }
    var out = '', pos = 0, size = (horizontal ? 15 : 20) / total;
    for (i = 0; i < items.length; i++) {
      var span = round2(size * items[i].w);
      out += horizontal
        ? svgRect(items[i].c, 0, round2(pos), 20, span + 0.02)
        : svgRect(items[i].c, round2(pos), 0, span + 0.02, 15);
      pos += size * items[i].w;
    }
    return out;
  }

  function renderLayer(tok) {
    var ci = tok.indexOf(':');
    var type = ci === -1 ? tok : tok.slice(0, ci);
    var rest = ci === -1 ? '' : tok.slice(ci + 1);
    var at = rest.indexOf('@');
    var color = at === -1 ? rest : rest.slice(0, at);
    var P = at === -1 ? [] : rest.slice(at + 1).split(',');
    switch (type) {
      case 'f': return svgRect(color, 0, 0, 20, 15);
      case 'h': return stripes(color, true);
      case 'v': return stripes(color, false);
      case 'r': return svgRect(color, fnum(P[0], 0), fnum(P[1], 0), fnum(P[2], 20), fnum(P[3], 15));
      case 'c': return svgCircle(color, fnum(P[0], 10), fnum(P[1], 7.5), fnum(P[2], 3.5));
      case 'o': return svgRing(color, fnum(P[0], 10), fnum(P[1], 7.5), fnum(P[2], 3), fnum(P[3], 0.8));
      case 's': return svgStar(color, fnum(P[0], 10), fnum(P[1], 7.5), fnum(P[2], 3));
      case 'm': return svgCrescent(color, fnum(P[0], 10), fnum(P[1], 7.5), fnum(P[2], 3));
      case 't': return svgPoly(color, [0, 0, fnum(P[0], 8), 7.5, 0, 15]);
      case 'q': return svgPoly(color, [20, 0, round2(20 - fnum(P[0], 8)), 7.5, 20, 15]);
      case 'd': return svgLine(color, 0, 15, 20, 0, fnum(P[0], 4));
      case 'g': return svgLine(color, 0, 0, 20, 15, fnum(P[0], 4));
      case 'w': return svgPoly(color, [0, 0, 20, 0, 0, 15]);
      case 'e': return svgPoly(color, [20, 0, 20, 15, 0, 15]);
      case 'u': return svgPoly(color, [0, 0, 20, 0, 20, 15]);
      case 'l': return svgPoly(color, [0, 0, 20, 15, 0, 15]);
      case 'y': {
        var yw = fnum(P[0], 3), ycx = fnum(P[1], 7.5);
        return svgRect(color, round2(ycx - yw / 2), 0, yw, 15) +
          svgRect(color, 0, round2(7.5 - yw / 2), 20, yw);
      }
      case 'x': {
        var xw = fnum(P[0], 3), xl = fnum(P[1], 9);
        return svgRect(color, round2(10 - xw / 2), round2(7.5 - xl / 2), xw, xl) +
          svgRect(color, round2(10 - xl / 2), round2(7.5 - xw / 2), xl, xw);
      }
      case 'p': {
        var pts = [];
        for (var i = 0; i < P.length; i++) pts.push(fnum(P[i], 0));
        return svgPoly(color, pts);
      }
      case 'j':
        return (color ? svgRect(color, 0, 0, 20, 15) : '') +
          '<g transform="scale(.5)">' + HAND.gb + '</g>';
    }
    return '';
  }

  function renderSpec(spec) {
    var toks = spec.split(';'), out = '';
    for (var i = 0; i < toks.length; i++) out += renderLayer(toks[i]);
    return out;
  }

  // Hand-written fragments for the famous flags the DSL can't do justice.
  // Built once at load; svgStar keeps the star geometry consistent.
  var HAND = {};

  (function buildHand() {
    HAND.gb = '<rect width="20" height="15" fill="#012169"/>' +
      '<path d="M0 0L20 15M20 0L0 15" stroke="#fff" stroke-width="3"/>' +
      '<path d="M0 0L20 15M20 0L0 15" stroke="#c8102e" stroke-width="1.2"/>' +
      '<path d="M10 0V15M0 7.5H20" stroke="#fff" stroke-width="5"/>' +
      '<path d="M10 0V15M0 7.5H20" stroke="#c8102e" stroke-width="3"/>';

    var i, usStripes = '<rect width="20" height="15" fill="#fff"/>';
    for (i = 0; i < 7; i++) {
      usStripes += svgRect('b22234', 0, round2(i * 2.31), 20, 1.16);
    }
    HAND.us = usStripes + svgRect('3c3b6e', 0, 0, 8, 8.08) +
      svgCircle('fff', 2, 2, 0.55) + svgCircle('fff', 4.7, 2, 0.55) +
      svgCircle('fff', 3.3, 4, 0.55) + svgCircle('fff', 6, 4, 0.55) +
      svgCircle('fff', 2, 6, 0.55) + svgCircle('fff', 4.7, 6, 0.55);

    HAND.br = '<rect width="20" height="15" fill="#009739"/>' +
      '<path d="M10 1.8L18.4 7.5L10 13.2L1.6 7.5Z" fill="#fedd00"/>' +
      svgCircle('012169', 10, 7.5, 3.3) +
      '<path d="M7 6.7a3.3 3.3 0 0 1 6.2 1.5" stroke="#fff" stroke-width=".7" fill="none"/>';

    HAND['in'] = svgRect('ff9933', 0, 0, 20, 5) + svgRect('fff', 0, 5, 20, 5) +
      svgRect('138808', 0, 10, 20, 5) +
      svgRing('000080', 10, 7.5, 1.9, 0.5) + svgCircle('000080', 10, 7.5, 0.5) +
      '<path d="M10 5.6V9.4M8.1 7.5H11.9M8.7 6.2L11.3 8.8M11.3 6.2L8.7 8.8"' +
      ' stroke="#000080" stroke-width=".3"/>';

    HAND.mx = svgRect('006341', 0, 0, 6.67, 15) + svgRect('fff', 6.67, 0, 6.66, 15) +
      svgRect('ce1126', 13.33, 0, 6.67, 15) +
      svgCircle('8c6a3f', 10, 7.5, 1.7) + svgCircle('6b512f', 10, 8.1, 0.9);

    HAND.es = svgRect('aa151b', 0, 0, 20, 15) + svgRect('f1bf00', 0, 3.75, 20, 7.5) +
      '<rect x="4.6" y="5.9" width="2.2" height="3.2" rx=".4" fill="#aa151b"/>' +
      svgRect('f1bf00', 5.2, 6.5, 1, 1.2);

    HAND.pt = svgRect('da291c', 0, 0, 20, 15) + svgRect('046a38', 0, 0, 8, 15) +
      svgCircle('fbe122', 8, 7.5, 2.4) + svgCircle('fff', 8, 7.5, 1.4) +
      '<rect x="7.2" y="6.3" width="1.6" height="2.4" rx=".3" fill="#da291c"/>';

    HAND.ar = svgRect('74acdf', 0, 0, 20, 15) + svgRect('fff', 0, 5, 20, 5) +
      svgCircle('f6b40e', 10, 7.5, 1.5) +
      '<path d="M10 5.2V9.8M7.7 7.5H12.3M8.4 5.9L11.6 9.1M11.6 5.9L8.4 9.1"' +
      ' stroke="#f6b40e" stroke-width=".45"/>';

    HAND.za = svgRect('e03c31', 0, 0, 20, 7.5) + svgRect('001489', 0, 7.5, 20, 7.5) +
      '<path d="M0 0l10 7.5L0 15M9 7.5H20" stroke="#fff" stroke-width="5.6" fill="none"/>' +
      '<path d="M0 0l10 7.5L0 15M9 7.5H20" stroke="#007749" stroke-width="3.4" fill="none"/>' +
      '<path d="M0 3l6 4.5L0 12z" fill="#000" stroke="#ffb81c" stroke-width="1"/>';

    HAND.kr = svgRect('fff', 0, 0, 20, 15) + svgCircle('cd2e3a', 10, 7.5, 3) +
      '<path d="M13 7.5a3 3 0 0 1-6 0a1.5 1.5 0 0 1 3 0a1.5 1.5 0 0 0 3 0z" fill="#0047a0"/>' +
      '<path d="M3 3.8l2.4-1.8M3.7 4.7l2.4-1.8M14 12.1l2.4 1.8M14.7 11.2l2.4 1.8"' +
      ' stroke="#000" stroke-width=".7"/>';

    HAND.ca = svgRect('fff', 0, 0, 20, 15) + svgRect('d80621', 0, 0, 5, 15) +
      svgRect('d80621', 15, 0, 5, 15) +
      '<path d="M10 3l.8 1.8 1.5-.6-.5 1.8 1.8.4-1.4 1.2.7 1.6-1.9-.4-.2 1.9h-1.6' +
      'l-.2-1.9-1.9.4.7-1.6-1.4-1.2 1.8-.4-.5-1.8 1.5.6z" fill="#d80621"/>';

    HAND.au = '<rect width="20" height="15" fill="#012169"/>' +
      '<g transform="scale(.5)">' + HAND.gb + '</g>' +
      svgStar('fff', 5, 11.2, 1.7) + svgStar('fff', 15, 3, 1) +
      svgStar('fff', 17.5, 6.5, 1) + svgStar('fff', 15, 11.5, 1) +
      svgStar('fff', 12.5, 6, 1) + svgStar('fff', 16.2, 8.6, 0.6);

    HAND.nz = '<rect width="20" height="15" fill="#012169"/>' +
      '<g transform="scale(.5)">' + HAND.gb + '</g>' +
      svgStar('cc142b', 15, 3.2, 1.1) + svgStar('cc142b', 17.4, 6.8, 1.1) +
      svgStar('cc142b', 15, 11.4, 1.1) + svgStar('cc142b', 12.6, 7.2, 1.1);

    HAND.il = svgRect('fff', 0, 0, 20, 15) + svgRect('0038b8', 0, 1.8, 20, 1.8) +
      svgRect('0038b8', 0, 11.4, 20, 1.8) +
      '<path d="M10 4.9l2.3 4H7.7zM10 10.1l2.3-4H7.7z" fill="none"' +
      ' stroke="#0038b8" stroke-width=".7"/>';

    HAND.np = svgRect('fff', 0, 0, 20, 15) +
      '<path d="M4 1l8 5.6H6.6L12 14H4z" fill="#dc143c" stroke="#003893" stroke-width=".8"/>' +
      svgCircle('fff', 6.6, 4.4, 0.9) + svgCircle('fff', 7, 10.6, 1.2);
  })();

  // Declarative flag specs — everything not in HAND. Kept dense on purpose.
  var FLAGS = {
    ad: 'v:1036a2-fedf00-d0103a;r:c7b37f@8.6,5.6,2.8,3.8',
    ae: 'h:00732f-fff-000;r:ef3340@0,0,5,15',
    af: 'v:000-bf0000-009900;c:fff@10,7.5,1.7',
    ag: 'h:000*2-0072c6-fff*2;s:fcd116@10,2.6,2',
    ai: 'j:012169;c:fff@14.5,9.5,2.8;c:f68f37@14.5,9.5,1.2',
    al: 'f:da291c;s:000@10,7.5,3',
    am: 'h:d90012-0033a0-f2a800',
    ao: 'h:cc092f-000;s:f9d616@10,7.5,2',
    as: 'f:002b7f;q:bf0a30@17;q:fff@15.5;c:6b4a2b@13.5,7.5,1.3',
    at: 'h:ed2939-fff-ed2939',
    aw: 'f:418fde;r:f9d616@0,10,20,1.2;r:f9d616@0,12.4,20,1.2;s:e8112d@4,3.8,2.2',
    ax: 'f:0053a5;y:ffce00@4;y:d21034@2',
    az: 'h:00b5e2-ef3340-509e2f;m:fff@9.5,7.5,1.7;s:fff@11.8,7.5,1',
    ba: 'f:002395;u:fecb00;s:fff@3,2.5,.9;s:fff@6.5,6,.9;s:fff@10,9.5,.9;s:fff@13.5,13,.9',
    bb: 'v:00267f-ffc726-00267f;r:000@9.3,4.5,1.4,6',
    bd: 'f:006a4e;c:f42a41@9,7.5,3.2',
    be: 'v:000-fdda24-ef3340',
    bf: 'h:ef2b2d-009e49;s:fcd116@10,7.5,2',
    bg: 'h:fff-00966e-d62612',
    bh: 'f:ce1126;t:fff@6',
    bi: 'f:ce1126;t:1eb53a@8;q:1eb53a@8;d:fff@2;g:fff@2;c:fff@10,7.5,3.2;s:ce1126@10,7.5,1.2',
    bj: 'h:fcd116-e8112d;r:008751@0,0,8,15',
    bl: 'v:0055a4-fff-ef4135',
    bm: 'j:cf142b;c:fff@14.5,9.5,2.8;c:cf142b@14.5,9.5,1.3',
    bn: 'f:f7e017;g:fff@4.5;g:000@2.8;c:cf1126@10,7.5,1.8',
    bo: 'h:d52b1e-f9e300-007934',
    bq: 'h:ae1c28-fff-21468b',
    bs: 'h:00778b-ffc72c-00778b;t:000@7',
    bt: 'f:ffd520;e:ff4e12;c:fff@10,7.5,1.7',
    bw: 'f:6da9d2;r:fff@0,5.5,20,4;r:000@0,6.3,20,2.4',
    by: 'h:ce1720*2-007c30;r:fff@0,0,2.2,15;r:ce1720@.5,3,1.2,2;r:ce1720@.5,10,1.2,2',
    bz: 'f:003f87;r:ce1126@0,0,20,1.6;r:ce1126@0,13.4,20,1.6;c:fff@10,7.5,3.2;c:6b9f4a@10,7.5,1.6',
    cc: 'f:008000;m:ffe000@12,7.5,2.8;s:ffe000@16,4.5,1.3;c:cc7722@5.5,7.5,1.5',
    cd: 'f:007fff;d:f7d618@4.6;d:ce1021@3;s:f7d618@4,3.2,1.8',
    cf: 'h:003082-fff-289728-ffce00;r:d21034@8.6,0,2.8,15;s:ffce00@3,2,1.2',
    cg: 'f:fff;w:009543;e:dc241f;d:fbde4a@4',
    ch: 'f:da291c;x:fff',
    ci: 'v:f77f00-fff-009e60',
    ck: 'j:012169;o:fff@14.5,9.5,2.8,.9',
    cl: 'h:fff-d52b1e;r:0039a6@0,0,6.7,7.5;s:fff@3.3,3.7,1.8',
    cm: 'v:007a5e-ce1126-fcd116;s:fcd116@10,7.5,1.8',
    cn: 'f:de2910;s:ffde00@4,4,2.2;s:ffde00@8,1.7,.7;s:ffde00@9.5,3.5,.7;s:ffde00@9.5,6,.7;s:ffde00@8,7.8,.7',
    co: 'h:fcd116*2-003893-ce1126',
    cr: 'h:002b7f-fff-ce1126*2-fff-002b7f',
    cu: 'h:002a8f-fff-002a8f-fff-002a8f;t:cf142b@8;s:fff@3,7.5,1.6',
    cv: 'f:003893;r:fff@0,9,20,1.5;r:cf2027@0,10.5,20,1.5;r:fff@0,12,20,1.5;o:f7d116@7,10.5,2.2,.6',
    cw: 'f:002b7f;r:f9e814@0,9.4,20,1.9;s:fff@3.5,3,1.5;s:fff@6.5,6,1',
    cx: 'f:0021ad;w:1c8a42;c:ffc639@10,7.5,2',
    cy: 'f:fff;c:d57800@10,6.5,2.2;r:4e5b31@8,10.2,4,.8',
    cz: 'h:fff-d7141a;t:11457e@8',
    de: 'h:000-dd0000-ffce00',
    dj: 'h:6ab2e7-12ad2b;t:fff@8;s:d7141a@3,7.5,1.4',
    dk: 'f:c8102e;y:fff@3',
    dm: 'f:006b3f;y:fcd116@3.3,10;y:000@2.2,10;y:fff@1.1,10;c:d41c30@10,7.5,2.6;s:2f7a3a@10,7.5,1',
    'do': 'f:fff;r:002d62@0,0,8.6,6.2;r:ce1126@11.4,0,8.6,6.2;r:ce1126@0,8.8,8.6,6.2;r:002d62@11.4,8.8,8.6,6.2',
    dz: 'v:006233-fff;m:d21034@9.4,7.5,2.6;s:d21034@11.6,7.5,1.1',
    ec: 'h:ffdd00*2-034ea2-ed1c24;c:8c6239@10,6,1.8',
    ee: 'h:0072ce-000-fff',
    eg: 'h:ce1126-fff-000;c:c09300@10,7.5,1.6',
    eh: 'h:000-fff-007a3d;t:c4111b@7;m:c4111b@10,7.5,1.8;s:c4111b@12,7.5,.9',
    er: 'h:12ad2b-4189dd;t:ea0437@20;c:f3c02c@5,7.5,1.4',
    et: 'h:078930-fcdd09-da121a;c:0f47af@10,7.5,2.6;s:fcdd09@10,7.5,1.8',
    fi: 'f:fff;y:002f6c@3.4',
    fj: 'j:68bfe5;r:fff@13.5,8,3,4;r:d21034@13.5,8,3,1',
    fk: 'j:012169;c:fff@14.5,9.5,2.8;c:005f9e@14.5,9.5,1.3',
    fm: 'f:75b2dd;s:fff@10,3.5,1.2;s:fff@10,11.5,1.2;s:fff@6,7.5,1.2;s:fff@14,7.5,1.2',
    fo: 'f:fff;y:0065bd@4.4;y:ef303e@2.4',
    fr: 'v:0055a4-fff-ef4135',
    ga: 'h:009e60-fcd116-3a75c4',
    gd: 'f:ce1126;r:fcd116@2,2,16,11;s:ce1126@10,7.5,2;c:fcd116@10,7.5,.8',
    ge: 'f:fff;y:f00@2.6,10;c:f00@5,3.7,.8;c:f00@15,3.7,.8;c:f00@5,11.3,.8;c:f00@15,11.3,.8',
    gf: 'v:0055a4-fff-ef4135',
    gg: 'f:fff;y:e8112d@4,10;y:f9dd16@1.6,10',
    gh: 'h:ce1126-fcd116-006b3f;s:000@10,7.5,1.8',
    gi: 'h:fff*2-da000c;r:da000c@8.3,4,3.4,3;r:fcd116@9.6,7,.8,2',
    gl: 'h:fff-d00c33;c:d00c33@7,5.4,2.6',
    gm: 'h:ce1126*2-fff-0c1c8c*2-fff-3a7728*2',
    gn: 'v:ce1126-fcd116-009460',
    gp: 'v:0055a4-fff-ef4135',
    gq: 'h:3e9a00-fff-e32118;t:0073ce@6;c:9ca69c@10,7.5,1.2',
    gr: 'h:0d5eaf-fff-0d5eaf-fff-0d5eaf-fff-0d5eaf-fff-0d5eaf;r:0d5eaf@0,0,7.4,6.7;r:fff@3.1,0,1.2,6.7;r:fff@0,2.75,7.4,1.2',
    gt: 'v:4997d0-fff-4997d0;c:6ca439@10,7.5,1.5',
    gu: 'f:c62139;r:00297b@.8,.8,18.4,13.4;c:3b7d23@10,7.5,2',
    gw: 'h:fcd116-009e49;r:ce1126@0,0,7,15;s:000@3.5,7.5,1.8',
    gy: 'f:009e49;t:fff@20;t:fcd116@19;t:000@10;t:ce1126@9',
    hk: 'f:de2910;c:fff@10,7.5,2.4;c:de2910@10,7.5,.7',
    hn: 'h:0073cf-fff-0073cf;s:0073cf@10,7.5,.8;s:0073cf@7.5,6.5,.7;s:0073cf@12.5,6.5,.7;s:0073cf@7.5,8.5,.7;s:0073cf@12.5,8.5,.7',
    hr: 'h:f00-fff-171796;r:f00@8.6,5.4,2.8,4;r:fff@8.6,5.4,1.4,1;r:fff@10,6.4,1.4,1',
    ht: 'h:00209f-d21034;r:fff@7.5,5.3,5,4.4;c:1c7b3b@10,7.5,1.2',
    hu: 'h:cd2a3e-fff-436f4d',
    id: 'h:f00-fff',
    ie: 'v:169b62-fff-ff883e',
    im: 'f:cf142b;s:fff@10,7.5,2.4',
    io: 'h:fff-0053a5-fff-0053a5-fff-0053a5;j',
    iq: 'h:ce1126-fff-000;c:007a3d@7,7.5,.9;c:007a3d@10,7.5,.9;c:007a3d@13,7.5,.9',
    ir: 'h:239f40-fff-da0000;c:da0000@10,7.5,1.6',
    is: 'f:02529c;y:fff@4.4;y:dc1e35@2.4',
    it: 'v:009246-fff-ce2b37',
    je: 'f:fff;d:df112d@2.6;g:df112d@2.6;r:e8112d@9,1.5,2,2.4',
    jm: 'f:009b3a;t:000@10;q:000@10;d:fed100@2.6;g:fed100@2.6',
    jo: 'h:000-fff-007a3d;t:ce1126@8;s:fff@3,7.5,1',
    jp: 'f:fff;c:bc002d@10,7.5,4',
    ke: 'h:000*4-fff-b11e29*4-fff-006600*4;c:b11e29@10,7.5,2.2;o:fff@10,7.5,2.2,.6',
    kg: 'f:e8112d;c:ffef00@10,7.5,2.8;o:e8112d@10,7.5,1.5,.7',
    kh: 'h:032ea1-e00025*2-032ea1;r:fff@7.6,5.4,4.8,4.2',
    ki: 'h:ce1126*4-fff-003f87-fff-003f87;c:fcd116@10,5,2.2',
    km: 'h:ffc61e-fff-ce1126-3a75c4;t:3d8e33@8;m:fff@4,7.5,1.8',
    kn: 'w:009e49;e:ce1126;d:fcd116@5;d:000@3.4;s:fff@7.5,9.5,1.1;s:fff@12.5,5.5,1.1',
    kp: 'h:024fa2*2-fff-c60c30*6-fff-024fa2*2;c:fff@6.5,7.5,2.2;s:c60c30@6.5,7.5,1.9',
    kw: 'h:007a3d-fff-ce1126;t:000@6',
    ky: 'j:012169;c:fff@14.5,9.5,2.8;c:cf142b@14.5,9.5,1.3',
    kz: 'f:00abc2;r:fec50c@.5,0,1.6,15;c:fec50c@11,7,2.6',
    la: 'h:ce1126-002868*2-ce1126;c:fff@10,7.5,2.4',
    lb: 'h:ed1c24-fff*2-ed1c24;s:007a3d@10,7.5,2',
    lc: 'f:65cfff;p:fff@10,2.5,15,12.5,5,12.5;p:000@10,4,13.8,12.5,6.2,12.5;p:fcd116@10,7.5,15,12.5,5,12.5',
    li: 'h:002b7f-ce1126;c:ffd83d@4,3.7,1.2',
    lk: 'f:f7b718;r:006a44@1.5,1.5,3.5,12;r:ee7f2d@5,1.5,3.5,12;r:8d153a@10,1.5,8.5,12;s:f7b718@14.2,7.5,2',
    lr: 'h:bf0a30-fff-bf0a30-fff-bf0a30-fff-bf0a30-fff-bf0a30-fff-bf0a30;r:002868@0,0,7,7;s:fff@3.5,3.5,2',
    ls: 'h:00209f-fff*2-009543;s:000@10,7.5,1.6',
    lt: 'h:fdb913-006a44-c1272d',
    lu: 'h:ed2939-fff-00a1de',
    lv: 'h:9e3039*2-fff-9e3039*2',
    ly: 'h:e70013-000*2-239e46;m:fff@9.5,7.5,1.7;s:fff@11.7,7.5,.9',
    ma: 'f:c1272d;s:006233@10,7.5,2.6',
    mc: 'h:ce1126-fff',
    md: 'v:0046ae-ffd200-cc092f;c:a77b3b@10,7.5,1.6',
    me: 'f:d3ae3b;r:c40308@1.2,.9,17.6,13.2;c:d3ae3b@10,7.5,2',
    mf: 'v:0055a4-fff-ef4135',
    mg: 'h:fc3d32-007e3a;r:fff@0,0,7,15',
    mh: 'f:003893;d:ff8a00@4;d:fff@2;s:fff@5,3.5,2',
    mk: 'f:d20000;d:ffe600@2.2;g:ffe600@2.2;r:ffe600@9,0,2,15;r:ffe600@0,6.5,20,2;c:ffe600@10,7.5,3;o:d20000@10,7.5,3.4,.8',
    ml: 'v:14b53a-fcd116-ce1126',
    mm: 'h:fecb00-34b233-ea2839;s:fff@10,7.5,3',
    mn: 'v:c4272f-015197-c4272f;r:f9cf02@2.2,4.5,2.2,6;c:f9cf02@3.3,3.5,1',
    mo: 'f:00785e;c:fff@10,8.5,2.4;s:fcd116@10,3.5,1;s:fcd116@7.5,4.5,.7;s:fcd116@12.5,4.5,.7',
    mp: 'f:0071bc;c:8c8c8c@10,7.5,2.2;s:fff@10,7.5,2.4',
    mq: 'v:0055a4-fff-ef4135',
    mr: 'f:006233;r:d01c1f@0,0,20,2.2;r:d01c1f@0,12.8,20,2.2;m:ffc400@10,8,2.4;s:ffc400@10,6,1.2',
    ms: 'j:012169;c:fff@14.5,9.5,2.8;c:00a2bd@14.5,9.5,1.4',
    mt: 'v:fff-cf142b;r:a0a0a0@2.2,1.4,1,2.6;r:a0a0a0@1.4,2.2,2.6,1',
    mu: 'h:ea2839-1a206d-ffd500-00a551',
    mv: 'f:d21034;r:007e3a@4,3.5,12,8;m:fff@10.5,7.5,2.2',
    mw: 'h:000-ce1126-339e35;c:ce1126@10,2.5,1.8',
    my: 'h:cc0001-fff-cc0001-fff-cc0001-fff-cc0001-fff;r:010066@0,0,10,8;m:ffcc00@4,4,2;s:ffcc00@7,4,1.2',
    mz: 'h:009639*3-fff-000*3-fff-fcd116*3;t:d21034@8;s:fcd116@3,7.5,1.6',
    na: 'w:003580;e:009543;d:fff@5;d:d21034@3.4;c:ffce00@4,3.5,1.6',
    nc: 'h:0035ad-ce1126-009543;c:fcd116@7,7.5,2.6;o:000@7,7.5,2.6,.5',
    ne: 'h:e05206-fff-0db02b;c:e05206@10,7.5,1.7',
    nf: 'v:007b46-fff*1.4-007b46;p:007b46@10,3,12.5,11,7.5,11',
    ng: 'v:008751-fff-008751',
    ni: 'h:0067c6-fff-0067c6;o:0067c6@10,7.5,1.2,.5',
    nl: 'h:ae1c28-fff-21468b',
    no: 'f:ef2b2d;y:fff@4.4;y:002868@2.4',
    nr: 'f:002b7f;r:ffc61e@0,7,20,1;s:fff@5,10.5,1.6',
    nu: 'j:fed100',
    om: 'h:fff-db161b-008000;r:db161b@0,0,5,15;c:fff@2.5,2.7,1.3',
    pa: 'f:fff;r:da121a@10,0,10,7.5;r:072357@0,7.5,10,7.5;s:072357@5,3.7,1.6;s:da121a@15,11.2,1.6',
    pe: 'v:d91023-fff-d91023',
    pf: 'h:ce1126-fff*2-ce1126;c:fcd116@10,7.5,2.2;c:083d9c@10,8.6,1',
    pg: 'u:ce1126;l:000;s:ffd100@14,4,1.8;s:fff@5,8,.8;s:fff@7,10.5,.8;s:fff@5,12.5,.8;s:fff@3,10.5,.8',
    ph: 'h:0038a8-ce1126;t:fff@9;c:fcd116@3,7.5,1.4;s:fcd116@1,1.5,.7;s:fcd116@1,13.5,.7;s:fcd116@7.5,7.5,.7',
    pk: 'f:01411c;r:fff@0,0,5,15;m:fff@11.5,7.5,3;s:fff@14.2,5.2,1.2',
    pl: 'h:fff-dc143c',
    pm: 'v:0055a4-fff-ef4135',
    pr: 'h:ed0000-fff-ed0000-fff-ed0000;t:0050f0@8;s:fff@3,7.5,1.5',
    ps: 'h:000-fff-007a3d;t:ce1126@7',
    pw: 'f:4aadd6;c:ffde00@8.5,7.5,3.5',
    py: 'h:d52b1e-fff-0038a8;o:000@10,7.5,1.4,.4;s:fcd116@10,7.5,.9',
    qa: 'v:fff-8d1b3d*2',
    re: 'v:0055a4-fff-ef4135',
    ro: 'v:002b7f-fcd116-ce1126',
    rs: 'h:c6363c-0c4076-fff;r:c6363c@6.2,4.8,3.2,4;c:fff@7.8,6.8,1',
    ru: 'h:fff-0039a6-d52b1e',
    rw: 'h:00a1de*2-fad201-20603d;c:fad201@16,2.8,1.6',
    sa: 'f:165d31;r:fff@4.5,5.5,11,1.2;r:fff@4.5,8.5,11,.8',
    sb: 'w:0051ba;e:215b33;d:fcd116@2.4;s:fff@3,2.5,.8;s:fff@6.5,2.5,.8;s:fff@3,5.5,.8;s:fff@6.5,5.5,.8;s:fff@4.75,4,.8',
    sc: 'f:003f87;p:fcd856@0,15,5.3,0,13.3,0;p:d62828@0,15,13.3,0,20,0,20,5;p:fff@0,15,20,5,20,10;p:007a3d@0,15,20,10,20,15',
    sd: 'h:d21034-fff-000;t:007229@7',
    se: 'f:005293;y:fecb00@3',
    sg: 'h:ed2939-fff;m:fff@4.5,3.75,1.9;c:fff@7.5,3,.45;c:fff@8.6,3.9,.45;c:fff@7.9,5,.45',
    sh: 'j:012169;c:fff@14.5,9.5,2.8;c:004a99@14.5,9.5,1.4',
    si: 'h:fff-005da4-ed1c24;p:fff@5,3.2,6.8,6.8,3.2,6.8',
    sj: 'f:ef2b2d;y:fff@4.4;y:002868@2.4',
    sk: 'h:fff-0b4ea2-ee1c25;r:ee1c25@3.6,5.2,3,3.8;r:fff@4.8,5.6,.6,2.6;r:fff@4,6.3,2.2,.6',
    sl: 'h:1eb53a-fff-0072c6',
    sm: 'h:fff-5eb6e4;c:fcd116@10,7.5,1.4',
    sn: 'v:00853f-fdef42-e31b23;s:00853f@10,7.5,2',
    so: 'f:4189dd;s:fff@10,7.5,3',
    sr: 'h:377e3f*2-fff-b40a2d*4-fff-377e3f*2;s:ecc81d@10,7.5,2',
    ss: 'h:000*6-fff-da121a*6-fff-078930*6;t:0f47af@7;s:fcdd09@3,7.5,1.3',
    st: 'h:12ad2b-ffce00*2-12ad2b;t:d21034@5;s:000@9,7.5,1.2;s:000@14,7.5,1.2',
    sv: 'h:0f47af-fff-0f47af;o:6b8e23@10,7.5,1.4,.6',
    sx: 'h:ea2839-00266b;t:fff@8;c:f0a30a@3,7.5,1.4',
    sy: 'h:ce1126-fff-000;s:007a3d@7,7.5,1;s:007a3d@13,7.5,1',
    sz: 'h:3e5eb9*3-ffd900-b10c0c*4-ffd900-3e5eb9*3;c:fff@10,7.5,2.2;c:000@11,7.5,1.4',
    tc: 'j:012169;c:fff@14.5,9.5,2.8;c:fcd116@14.5,9.5,1.4',
    td: 'v:002664-fecb00-c60c30',
    tg: 'h:006a4e-ffce00-006a4e-ffce00-006a4e;r:d21034@0,0,7,9;s:fff@3.5,4.5,1.8',
    th: 'h:a51931-f4f5f8-2d2a4a*2-f4f5f8-a51931',
    tj: 'h:c00*2-fff*3-006600*2;c:f8c300@10,7,1.1',
    tk: 'f:00247d;p:fed100@4,11.5,16,11.5,12,9.5;s:fff@4,3,.8;s:fff@6,5,.8;s:fff@4,7,.8;s:fff@8,3.5,.8',
    tl: 'f:dc241f;t:ffc726@9;t:000@6;s:fff@2.5,7.5,1.4',
    tm: 'f:00843d;r:d22630@1.5,0,3.5,15;m:fff@10,4,1.6;s:fff@12.5,3,.7;c:fff@3.2,3,.6;c:fff@3.2,6,.6;c:fff@3.2,9,.6;c:fff@3.2,12,.6',
    tn: 'f:e70013;c:fff@10,7.5,3.4;m:e70013@10.3,7.5,2.4;s:e70013@11,7.5,1.1',
    to: 'f:c10000;r:fff@0,0,8,6;r:c10000@3.2,1.2,1.6,3.6;r:c10000@2.2,2.2,3.6,1.6',
    tr: 'f:e30a17;c:fff@8,7.5,3.2;c:e30a17@8.8,7.5,2.6;s:fff@12.5,7.5,1.4',
    tt: 'f:da1a35;g:fff@5.5;g:000@3.5',
    tv: 'j:418fde;s:ffd100@13,10,.9;s:ffd100@15.5,8,.9;s:ffd100@17.5,10.5,.9;s:ffd100@14,12.5,.9;s:ffd100@16.5,5.5,.9',
    tw: 'f:fe0000;r:000095@0,0,10,7.5;c:fff@5,3.75,1.7',
    tz: 'w:1eb53a;e:00a3dd;d:fcd116@5.6;d:000@3.4',
    ua: 'h:005bbb-ffd500',
    ug: 'h:000-fcdc04-d90000-000-fcdc04-d90000;c:fff@10,7.5,2.3;c:d90000@10,7.5,.9',
    uy: 'h:fff-0038a8-fff-0038a8-fff-0038a8-fff-0038a8-fff;r:fff@0,0,7,6.7;c:fcd116@3.5,3.3,2',
    uz: 'h:0099b5*6-ce1126-fff*6-ce1126-1eb53a*6;m:fff@4,2.8,1.5;c:fff@7,1.8,.5;c:fff@8.5,1.8,.5;c:fff@10,1.8,.5',
    va: 'v:ffe000-fff;o:b8860b@15,7.5,1.5,.7',
    vc: 'v:0072c6-fcd116*2-009e60;p:009e60@8,5,9.5,7.5,8,10,6.5,7.5;p:009e60@13.5,5,15,7.5,13.5,10,12,7.5;p:009e60@10.75,8,12.25,10.5,10.75,13,9.25,10.5',
    ve: 'h:ffcc00-00247d-cf142b;s:fff@6,6,.7;s:fff@8,5.3,.7;s:fff@10,5,.7;s:fff@12,5.3,.7;s:fff@14,6,.7',
    vg: 'j:012169;c:fff@14.5,9.5,2.8;c:006129@14.5,9.5,1.4',
    vi: 'f:fff;s:f2c500@10,7.5,2.2',
    vn: 'f:da251d;s:ff0@10,7.5,3',
    vu: 'h:d21034-009543;r:000@0,6.3,20,2.4;r:fdce12@0,7,20,1;t:000@8;c:fdce12@2.5,7.5,1.2',
    wf: 'v:0055a4-fff-ef4135',
    ws: 'f:ce1126;r:002b7f@0,0,10,7.5;s:fff@5,3.7,1.3;s:fff@3,2.3,.8;s:fff@7,2.5,.8;s:fff@6,5.5,.8',
    xk: 'f:244aa5;c:d0a650@10,8,2;s:fff@6,4,.7;s:fff@8,3.5,.7;s:fff@10,3.3,.7;s:fff@12,3.5,.7;s:fff@14,4,.7',
    ye: 'h:ce1126-fff-000',
    yt: 'v:0055a4-fff-ef4135',
    zm: 'f:198a00;r:de2010@11,6,3,9;r:000@14,6,3,9;r:ef7d00@17,6,3,9;s:ef7d00@15.5,3,1.5',
    zw: 'h:319208-ffd200-de2010-000-de2010-ffd200-319208;t:fff@7;s:de2010@3,7.5,1.5'
  };

  function badgeBody(iso2) {
    return '<rect width="20" height="15" rx="2" fill="#e7e7ec"/>' +
      '<text x="10" y="10.4" text-anchor="middle" font-family="system-ui,sans-serif"' +
      ' font-size="6.5" font-weight="600" fill="#72747e">' + iso2.toUpperCase() + '</text>';
  }

  // Pure — works in Node too. All output is generated by our own code
  // (trusted); country names never pass through here.
  function flagSvg(iso2) {
    iso2 = String(iso2 == null ? '' : iso2).toLowerCase().replace(/[^a-z]/g, '');
    var body;
    if (HAND[iso2]) body = HAND[iso2];
    else if (FLAGS[iso2]) body = renderSpec(FLAGS[iso2]);
    else body = badgeBody(iso2);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 15"' +
      ' aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ------------------------------------------------------------------ *
   * Pure phone helpers — no DOM, usable in Node.
   * ------------------------------------------------------------------ */

  // Countries that keep the leading 0 in E.164 (no trunk prefix to strip).
  var KEEP_ZERO = { it: 1, va: 1 };

  function digitsOf(s) {
    return String(s == null ? '' : s).replace(/\D/g, '');
  }

  // Longest-prefix dial-code match; shared codes are disambiguated by the
  // territories' area codes first, then by `order` (US wins +1, RU +7, …).
  function detectCountry(digits) {
    for (var len = Math.min(DIAL_MAX, digits.length); len >= 1; len--) {
      var list = BY_DIAL[digits.slice(0, len)];
      if (!list) continue;
      var rest = digits.slice(len);
      for (var i = 0; i < list.length; i++) {
        var areas = list[i].areaCodes;
        if (!areas) continue;
        for (var j = 0; j < areas.length; j++) {
          if (rest.indexOf(areas[j]) === 0) return list[i];
        }
      }
      return list[0];
    }
    return null;
  }

  // Fill a country's grouping pattern with digits; overflow is appended raw.
  function formatDigits(digits, country) {
    if (!country || !country.pattern || !digits) return digits;
    var p = country.pattern, out = '', di = 0;
    for (var i = 0; i < p.length && di < digits.length; i++) {
      var ch = p.charAt(i);
      if (ch === '#') out += digits.charAt(di++);
      else out += ch;
    }
    if (di < digits.length) out += (out ? ' ' : '') + digits.slice(di);
    return out;
  }

  // National significant digits: strip ONE trunk '0' (except IT/VA and NANP).
  function significant(country, digits) {
    if (country && digits.charAt(0) === '0' &&
        country.dialCode !== '1' && !KEEP_ZERO[country.iso2]) {
      return digits.slice(1);
    }
    return digits;
  }

  function lengthValid(country, nsd) {
    return !!country && !!nsd && country.lengths.indexOf(nsd.length) !== -1;
  }

  function coerceCountry(iso2) {
    return BY_ISO[String(iso2 == null ? '' : iso2).toLowerCase()] || null;
  }

  // parse('+971 50 123 4567') / parse('0501234567', 'ae')
  //   → { country, dialCode, national, e164, valid }
  function parseNumber(str, iso2) {
    var s = String(str == null ? '' : str).replace(/^\s+/, '');
    var c, nsd;
    if (s.charAt(0) === '+') {
      var d = digitsOf(s);
      c = detectCountry(d);
      if (!c) {
        return { country: null, dialCode: null, national: '',
          e164: d ? '+' + d : '', valid: false };
      }
      nsd = d.slice(c.dialCode.length);
    } else {
      c = coerceCountry(iso2) || BY_ISO[PhoneInput.defaults.country] || BY_ISO.us;
      nsd = significant(c, digitsOf(s));
    }
    return {
      country: c.iso2,
      dialCode: '+' + c.dialCode,
      national: formatDigits(nsd, c),
      e164: nsd ? '+' + c.dialCode + nsd : '',
      valid: lengthValid(c, nsd)
    };
  }

  // Example number for placeholders: the pattern filled with 1-9 cycling.
  function exampleNumber(country) {
    if (!country) return '';
    var p = country.pattern, out = '', n = 0, i;
    if (!p) {
      var len = country.lengths[country.lengths.length - 1];
      p = new Array(len + 1).join('#');
    }
    for (i = 0; i < p.length; i++) {
      if (p.charAt(i) === '#') out += String((n++ % 9) + 1);
      else out += p.charAt(i);
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Small DOM helpers.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function isInputEl(el) {
    return el.tagName === 'INPUT';
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
    country: 'us',            // initial iso2
    preferredCountries: [],   // iso2s pinned to the top of the dropdown
    onlyCountries: null,      // whitelist of iso2s
    excludeCountries: null,   // blacklist of iso2s
    nationalMode: true,       // display national formatting; output stays E.164
    placeholder: 'auto',      // 'auto' = example number | string | false
    showDialCode: true,       // '+971' next to the flag
    searchable: true,         // search box in the dropdown
    validate: 'blur',         // 'blur' | 'live' — when the red/green state shows
    validator: null,          // fn({country, digits, e164}) → bool, overrides lengths
    name: null,               // adds a hidden input carrying the E.164 (forms)
    disabled: false,
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    styles: true,             // false = headless: no CSS injected
    labels: {
      country: 'Choose country',
      search: 'Search countries',
      noResults: 'No matches',
      invalid: 'Invalid phone number'
    },
    onChange: null,           // fn({e164, national, country, valid})
    onCountryChange: null,    // fn(iso2)
    onValidityChange: null    // fn(valid)
  };

  // SSR: every public entry point degrades to this inert handle.
  function noop() {}
  var dummyHandle = {
    el: null, input: null, country: null,
    getValue: function () {
      return { e164: '', national: '', country: null, valid: false };
    },
    setValue: function () { return dummyHandle; },
    setCountry: function () { return dummyHandle; },
    getCountry: function () { return null; },
    setDisabled: function () { return dummyHandle; },
    open: noop, close: noop, focus: noop,
    destroy: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * PhoneInput.
   * ------------------------------------------------------------------ */

  function PhoneInput(target, options) {
    if (!HAS_DOM) return dummyHandle;
    var el = resolveElement(target);
    if (!el) throw new Error('PhoneInput: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this.isInput = isInputEl(el);
    this._uid = 'vph-' + (++uid);
    this._touched = false;
    this._lastValid = null;
    this._digits = '';        // national digits as typed (may keep trunk 0)
    this.isOpen = false;

    this._buildCountryList();
    this.country = coerceCountry(this.opts.country);
    if (!this.country || !this._allowed[this.country.iso2]) {
      this.country = this._list[0] || BY_ISO.us;
    }

    if (this.opts.styles !== false) injectStyles();
    this._buildField();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    // Adopt a pre-filled value ('+9715…' switches the country too).
    var initial = this.input.value;
    if (initial) this.setValue(initial);
    else this._refresh(false);
  }

  PhoneInput.prototype = {
    constructor: PhoneInput,

    /* ---------------- data plumbing ---------------- */

    _buildCountryList: function () {
      var only = this.opts.onlyCountries, excl = this.opts.excludeCountries;
      var onlySet = null, exclSet = {}, i;
      if (only && only.length) {
        onlySet = {};
        for (i = 0; i < only.length; i++) onlySet[String(only[i]).toLowerCase()] = 1;
      }
      if (excl && excl.length) {
        for (i = 0; i < excl.length; i++) exclSet[String(excl[i]).toLowerCase()] = 1;
      }
      this._allowed = {};
      this._list = [];
      for (i = 0; i < COUNTRIES.length; i++) {
        var c = COUNTRIES[i];
        if (onlySet && !onlySet[c.iso2]) continue;
        if (exclSet[c.iso2]) continue;
        this._allowed[c.iso2] = 1;
        this._list.push(c);
      }
      this._preferred = [];
      var pref = this.opts.preferredCountries || [];
      for (i = 0; i < pref.length; i++) {
        var p = coerceCountry(pref[i]);
        if (p && this._allowed[p.iso2]) this._preferred.push(p);
      }
    },

    /* ---------------- DOM construction ---------------- */

    _buildField: function () {
      var root = document.createElement('div');
      root.className = 'vph' + saltClass();

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vph-country';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      var flag = document.createElement('span');
      flag.className = 'vph-flag';
      btn.appendChild(flag);

      var dial = null;
      if (this.opts.showDialCode) {
        dial = document.createElement('span');
        dial.className = 'vph-dial';
        btn.appendChild(dial);
      }

      var caret = document.createElement('span');
      caret.className = 'vph-caret';
      caret.innerHTML = CARET;
      btn.appendChild(caret);
      root.appendChild(btn);

      var input;
      if (this.isInput) {
        // Anchor mode: adopt the given <input>, coerce it to type=tel.
        input = this.el;
        this.el.parentNode.insertBefore(root, this.el);
        root.appendChild(input);
        this._inputClassBackup = input.className;
        input.className = (input.className ? input.className + ' ' : '') + 'vph-input';
        try { if (input.type !== 'tel') input.type = 'tel'; } catch (err) { /* IE */ }
      } else {
        // Container mode: build the control inside, hidden input for forms.
        input = document.createElement('input');
        input.type = 'tel';
        input.className = 'vph-input';
        root.appendChild(input);
        this.el.appendChild(root);
      }
      if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'tel');

      if (this.opts.name && (!this.isInput || this.el.name !== this.opts.name)) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = this.opts.name;
        root.appendChild(hidden);
        this._hidden = hidden;
      } else {
        this._hidden = null;
      }

      // Polite live region for validation announcements.
      var live = document.createElement('span');
      live.className = 'vph-sr';
      live.setAttribute('aria-live', 'polite');
      root.appendChild(live);

      this.root = root;
      this.button = btn;
      this._flagEl = flag;
      this._dialEl = dial;
      this.input = input;
      this._liveEl = live;
      this.panel = null;      // dropdown is built lazily on first open

      if (this.opts.disabled) this.setDisabled(true);
      this._renderCountry();
    },

    _renderCountry: function () {
      var c = this.country, L = this.opts.labels;
      this._flagEl.innerHTML = flagSvg(c.iso2); // own generated SVG — trusted
      if (this._dialEl) this._dialEl.textContent = '+' + c.dialCode;
      this.button.setAttribute('aria-label', L.country + ': ' + c.name + ' +' + c.dialCode);
      var ph = this.opts.placeholder;
      if (ph === 'auto' || ph == null) this.input.placeholder = exampleNumber(c);
      else if (ph === false) this.input.removeAttribute('placeholder');
      else this.input.placeholder = String(ph);
    },

    _buildPanel: function () {
      if (this.panel) return;
      var L = this.opts.labels;
      var p = document.createElement('div');
      p.className = 'vph-panel' + saltClass();
      p.style.display = 'none';

      this._searchEl = null;
      if (this.opts.searchable !== false) {
        var wrap = document.createElement('div');
        wrap.className = 'vph-search';
        var s = document.createElement('input');
        s.type = 'text';
        s.setAttribute('role', 'combobox');
        s.setAttribute('aria-expanded', 'true');
        s.setAttribute('aria-autocomplete', 'list');
        s.setAttribute('aria-controls', this._uid + '-list');
        s.setAttribute('aria-label', L.search);
        s.placeholder = L.search;
        s.autocomplete = 'off';
        wrap.appendChild(s);
        p.appendChild(wrap);
        this._searchEl = s;
      }

      var list = document.createElement('ul');
      list.className = 'vph-list';
      list.id = this._uid + '-list';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.country);
      if (!this._searchEl) list.tabIndex = 0;
      p.appendChild(list);

      this.panel = p;
      this._listEl = list;
      this._bindPanel();
    },

    // Rebuild the option list, `filter` = lowercase needle. All names go
    // through textContent — never innerHTML.
    _renderList: function (filter) {
      var list = this._listEl, self = this;
      list.innerHTML = '';
      this._visible = [];
      this._activeIdx = -1;

      function matches(c) {
        if (!filter) return true;
        return c.name.toLowerCase().indexOf(filter) !== -1 ||
          c.iso2.indexOf(filter) === 0 ||
          ('+' + c.dialCode).indexOf(filter) === 0 ||
          c.dialCode.indexOf(filter.replace(/^\+/, '')) === 0;
      }

      function addOption(c) {
        var li = document.createElement('li');
        li.className = 'vph-opt' + (c === self.country ? ' is-selected' : '');
        li.id = self._uid + '-' + c.iso2 + '-' + self._visible.length;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', c === self.country ? 'true' : 'false');
        li.setAttribute('data-iso2', c.iso2);
        var flag = document.createElement('span');
        flag.className = 'vph-flag';
        flag.innerHTML = flagSvg(c.iso2); // trusted, own renderer
        li.appendChild(flag);
        var name = document.createElement('span');
        name.className = 'vph-opt-name';
        name.textContent = c.name;
        li.appendChild(name);
        var dial = document.createElement('span');
        dial.className = 'vph-opt-dial';
        dial.textContent = '+' + c.dialCode;
        li.appendChild(dial);
        list.appendChild(li);
        self._visible.push({ country: c, el: li });
      }

      var i, shown = 0;
      for (i = 0; i < this._preferred.length; i++) {
        if (matches(this._preferred[i])) { addOption(this._preferred[i]); shown++; }
      }
      if (shown && !filter) {
        var sep = document.createElement('li');
        sep.className = 'vph-sep';
        sep.setAttribute('role', 'presentation');
        list.appendChild(sep);
      }
      for (i = 0; i < this._list.length; i++) {
        // Preferred entries are pinned above; don't repeat them in a
        // filtered view either (they matched already).
        if (this._preferred.indexOf(this._list[i]) !== -1) continue;
        if (matches(this._list[i])) addOption(this._list[i]);
      }

      if (!this._visible.length) {
        var empty = document.createElement('li');
        empty.className = 'vph-empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = this.opts.labels.noResults;
        list.appendChild(empty);
      }

      // Land the highlight on the current country when it is visible.
      for (i = 0; i < this._visible.length; i++) {
        if (this._visible[i].country === this.country) { this._setActive(i, false); break; }
      }
      if (this._activeIdx === -1 && this._visible.length) this._setActive(0, false);
    },

    _setActive: function (idx, scroll) {
      if (this._activeIdx >= 0 && this._visible[this._activeIdx]) {
        this._visible[this._activeIdx].el.classList.remove('is-active');
      }
      this._activeIdx = idx;
      var item = this._visible[idx];
      var focusEl = this._searchEl || this._listEl;
      if (!item) {
        focusEl.removeAttribute('aria-activedescendant');
        return;
      }
      item.el.classList.add('is-active');
      focusEl.setAttribute('aria-activedescendant', item.el.id);
      if (scroll !== false) {
        var el = item.el, list = this._listEl;
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
    },

    /* ---------------- events ---------------- */

    _bind: function () {
      var self = this;
      this._onBtnClick = function () { self.isOpen ? self.close() : self.open(); };
      this._onBtnKeydown = function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          self.open();
        }
      };
      this._onInput = function () { self._handleInput(); };
      this._onBlur = function () {
        self._touched = true;
        self._refresh(false);
      };
      this._onKeydown = function (e) {
        // Keep the tel input digit-friendly without blocking shortcuts/nav.
        if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
        if (!/[\d+()\-\s.]/.test(e.key)) e.preventDefault();
      };
      this.button.addEventListener('click', this._onBtnClick);
      this.button.addEventListener('keydown', this._onBtnKeydown);
      this.input.addEventListener('input', this._onInput);
      this.input.addEventListener('blur', this._onBlur);
      this.input.addEventListener('keydown', this._onKeydown);

      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(self.button) !== -1) return;
        self.close(false);
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
      this._onDocKeydown = function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); self.close(true); }
      };
    },

    _bindPanel: function () {
      var self = this;
      this._onListClick = function (e) {
        var opt = e.target.closest ? e.target.closest('.vph-opt') : null;
        if (!opt || !self._listEl.contains(opt)) return;
        self._chooseCountry(opt.getAttribute('data-iso2'));
      };
      this._onListHover = function (e) {
        var opt = e.target.closest ? e.target.closest('.vph-opt') : null;
        if (!opt) return;
        for (var i = 0; i < self._visible.length; i++) {
          if (self._visible[i].el === opt) { self._setActive(i, false); break; }
        }
      };
      this._onPanelKeydown = function (e) { self._handlePanelKeydown(e); };
      this.panel.addEventListener('click', this._onListClick);
      this.panel.addEventListener('mousemove', this._onListHover);
      this.panel.addEventListener('keydown', this._onPanelKeydown);
      if (this._searchEl) {
        this._onSearch = function () {
          self._renderList(self._searchEl.value.trim().toLowerCase());
        };
        this._searchEl.addEventListener('input', this._onSearch);
      }
    },

    _handlePanelKeydown: function (e) {
      var n = this._visible.length;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (n) this._setActive(Math.min(this._activeIdx + 1, n - 1));
          return;
        case 'ArrowUp':
          e.preventDefault();
          if (n) this._setActive(Math.max(this._activeIdx - 1, 0));
          return;
        case 'Home':
          if (this._searchEl && e.target === this._searchEl) return; // caret nav
          e.preventDefault();
          if (n) this._setActive(0);
          return;
        case 'End':
          if (this._searchEl && e.target === this._searchEl) return;
          e.preventDefault();
          if (n) this._setActive(n - 1);
          return;
        case 'Enter':
          e.preventDefault();
          if (this._activeIdx >= 0 && this._visible[this._activeIdx]) {
            this._chooseCountry(this._visible[this._activeIdx].country.iso2);
          }
          return;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          this.close(true);
          return;
        case 'Tab':
          this.close(false);
          return;
      }
      // Typeahead over country names when typing lands on the list itself
      // (with the search box, typing already filters).
      if (!this._searchEl && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var self = this;
        var now = Date.now();
        if (now - (this._typeAt || 0) > 700) this._typeBuf = '';
        this._typeAt = now;
        this._typeBuf = (this._typeBuf || '') + e.key.toLowerCase();
        for (var i = 0; i < this._visible.length; i++) {
          if (this._visible[i].country.name.toLowerCase().indexOf(this._typeBuf) === 0) {
            this._setActive(i);
            break;
          }
        }
      }
    },

    /* ---------------- typing / formatting ---------------- */

    _handleInput: function () {
      var v = this.input.value;
      // Restrict to digits / + / space / ( ) - . ; '+' only leads.
      var cleaned = v.replace(/[^\d+()\-\s.]/g, '');
      cleaned = cleaned.charAt(0) === '+'
        ? '+' + cleaned.slice(1).replace(/\+/g, '')
        : cleaned.replace(/\+/g, '');

      if (cleaned.charAt(0) === '+') {
        // '+' entry (typed or pasted): auto-detect from the dial code —
        // longest prefix wins — then fold into national editing.
        var d = digitsOf(cleaned);
        var c = detectCountry(d);
        if (c && this._allowed[c.iso2] && d.length > c.dialCode.length) {
          if (c !== this.country) this._switchCountry(c);
          this._digits = d.slice(c.dialCode.length);
          this._render(true);
          return;
        }
        // Incomplete dial code: leave the raw '+…' visible, nothing to format.
        if (this.input.value !== cleaned) this.input.value = cleaned;
        this._digits = '';
        this._refresh(true);
        return;
      }

      this._digits = digitsOf(cleaned);
      this._render(true);
    },

    // Write the formatted value back, preserving the caret by digit count.
    _render: function (fireChange) {
      var text = this.opts.nationalMode === false
        ? (this._digits ? '+' + this.country.dialCode + ' ' +
            formatDigits(significant(this.country, this._digits), this.country) : '')
        : formatDigits(this._digits, this.country);

      var input = this.input;
      if (input.value !== text) {
        var pos = null;
        try {
          if (document.activeElement === input && input.selectionStart != null) {
            var before = digitsOf(input.value.slice(0, input.selectionStart)).length;
            pos = text.length;
            var seen = 0;
            for (var i = 0; i < text.length; i++) {
              if (/\d/.test(text.charAt(i))) {
                seen++;
                if (seen >= before) { pos = i + 1; break; }
              }
            }
            if (before === 0) pos = 0;
          }
        } catch (err) { pos = null; }
        input.value = text;
        if (pos != null) {
          try { input.setSelectionRange(pos, pos); } catch (err2) { /* detached */ }
        }
      }
      this._refresh(fireChange);
    },

    _isValid: function () {
      var nsd = significant(this.country, this._digits);
      if (typeof this.opts.validator === 'function') {
        return !!this.opts.validator({
          country: this.country.iso2,
          digits: nsd,
          e164: nsd ? '+' + this.country.dialCode + nsd : ''
        });
      }
      return lengthValid(this.country, nsd);
    },

    // Recompute value/validity, update classes, ARIA and callbacks.
    _refresh: function (fireChange) {
      var valid = this._isValid();
      var hasDigits = this._digits.length > 0;
      var show = (this.opts.validate === 'live' || this._touched) && hasDigits;

      this.root.classList.toggle('vph-valid', show && valid);
      this.root.classList.toggle('vph-invalid', show && !valid);
      if (show && !valid) this.input.setAttribute('aria-invalid', 'true');
      else this.input.removeAttribute('aria-invalid');
      var msg = (show && !valid) ? this.opts.labels.invalid : '';
      if (this._liveEl.textContent !== msg) this._liveEl.textContent = msg;

      var value = this.getValue();
      if (this._hidden) this._hidden.value = value.e164;

      if (valid !== this._lastValid) {
        this._lastValid = valid;
        if (this.opts.onValidityChange) this.opts.onValidityChange(valid);
      }
      if (fireChange && this.opts.onChange) this.opts.onChange(value);
    },

    _switchCountry: function (c) {
      this.country = c;
      this._renderCountry();
      if (this.opts.onCountryChange) this.opts.onCountryChange(c.iso2);
    },

    _chooseCountry: function (iso2) {
      var c = coerceCountry(iso2);
      if (c && c !== this.country) {
        this._switchCountry(c);
        this._render(true);
      }
      this.close(true);
      this.input.focus();
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.root.setAttribute('data-theme', resolved);
      if (this.panel) this.panel.setAttribute('data-theme', resolved);
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this.root;
      if (window.VC && typeof window.VC.position === 'function') {
        var res = window.VC.position(panel, anchor, { gap: 6 });
        if (res) panel.style.transformOrigin = res.below ? '18px 0%' : '18px 100%';
        return;
      }
      // Private fallback — flip below/above, clamp into the viewport,
      // ride the top layer inside an open <dialog> (same as datepicker.js).
      var r = anchor.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = 6, pad = 8;

      var below = vh - r.bottom >= ph + gap || r.top < ph + gap;
      var top = below ? r.bottom + gap : r.top - ph - gap;
      var left = Math.min(Math.max(pad, r.left), Math.max(pad, vw - pw - pad));

      var fixed = !!(anchor.closest && anchor.closest('dialog'));
      panel.style.position = fixed ? 'fixed' : 'absolute';
      panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
      panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
      panel.style.transformOrigin = below ? '18px 0%' : '18px 100%';
    },

    /* ---------------- public API ---------------- */

    open: function () {
      if (this.isOpen || this.opts.disabled) return this;
      this._buildPanel();
      this._applyTheme();

      // Join an open <dialog>'s top layer, otherwise portal to <body>.
      var host = (this.root.closest && this.root.closest('dialog')) || document.body;
      if (this.panel.parentNode !== host) host.appendChild(this.panel);

      if (this._searchEl) this._searchEl.value = '';
      this._renderList('');
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vph-open'); });
      this.isOpen = true;
      this.button.setAttribute('aria-expanded', 'true');
      (this._searchEl || this._listEl).focus();
      this._setActive(this._activeIdx, true); // scroll the selection into view

      document.addEventListener('pointerdown', this._onDocPointer, true);
      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);
      return this;
    },

    close: function (refocus) {
      if (!this.isOpen) return this;
      this.isOpen = false;
      this.button.setAttribute('aria-expanded', 'false');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      var focusInside = this.panel.contains(document.activeElement);
      this.panel.classList.remove('vph-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);
      if (refocus !== false && focusInside) this.button.focus();
      return this;
    },

    // → { e164, national, country, valid } — E.164 regardless of display mode.
    getValue: function () {
      var nsd = significant(this.country, this._digits);
      return {
        e164: nsd ? '+' + this.country.dialCode + nsd : '',
        national: formatDigits(this._digits, this.country),
        country: this.country.iso2,
        valid: this._isValid()
      };
    },

    // setValue('+97150…') switches the country from the dial code;
    // setValue('050…') keeps the current country.
    setValue: function (str) {
      var s = String(str == null ? '' : str);
      if (s.charAt(0) === '+') {
        var d = digitsOf(s);
        var c = detectCountry(d);
        if (c && this._allowed[c.iso2]) {
          if (c !== this.country) this._switchCountry(c);
          this._digits = d.slice(c.dialCode.length);
          this._render(true);
          return this;
        }
      }
      this._digits = digitsOf(s);
      this._render(true);
      return this;
    },

    setCountry: function (iso2) {
      var c = coerceCountry(iso2);
      if (c && this._allowed[c.iso2] && c !== this.country) {
        this._switchCountry(c);
        this._render(true);
      }
      return this;
    },

    getCountry: function () {
      return this.country.iso2;
    },

    setDisabled: function (disabled) {
      this.opts.disabled = !!disabled;
      this.root.classList.toggle('vph-disabled', !!disabled);
      this.input.disabled = !!disabled;
      this.button.disabled = !!disabled;
      if (disabled) this.close(false);
      return this;
    },

    focus: function () {
      this.input.focus();
      return this;
    },

    destroy: function () {
      this.close(false);
      clearTimeout(this._closeTimer);
      unwatchAutoTheme(this);
      this.button.removeEventListener('click', this._onBtnClick);
      this.button.removeEventListener('keydown', this._onBtnKeydown);
      this.input.removeEventListener('input', this._onInput);
      this.input.removeEventListener('blur', this._onBlur);
      this.input.removeEventListener('keydown', this._onKeydown);
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      if (this.panel && this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      if (this.isInput) {
        // Give the input back to the page where the wrapper stood.
        this.input.className = this._inputClassBackup;
        this.input.removeAttribute('aria-invalid');
        this.root.parentNode.insertBefore(this.input, this.root);
      }
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics: pure helpers, auto-init, convergence contract.
   * ------------------------------------------------------------------ */

  PhoneInput.version = VERSION;
  PhoneInput.defaults = DEFAULTS;
  PhoneInput.countries = COUNTRIES;

  PhoneInput.create = function (target, options) {
    return new PhoneInput(target, options);
  };

  PhoneInput.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  // Pure helpers — work without a DOM (Node-friendly).
  PhoneInput.parse = function (str, iso2) {
    return parseNumber(str, iso2);
  };

  PhoneInput.format = function (str, iso2) {
    var s = String(str == null ? '' : str);
    if (s.replace(/^\s+/, '').charAt(0) === '+') return parseNumber(s).national;
    return formatDigits(digitsOf(s), coerceCountry(iso2) || BY_ISO[DEFAULTS.country]);
  };

  PhoneInput.isValid = function (str, iso2) {
    var p = parseNumber(str, iso2);
    if (!p.valid) return false;
    var c = coerceCountry(iso2);
    // For '+…' input the detected country must at least share the dial code
    // with the asked-about one (+1 numbers satisfy both 'us' and 'ca').
    return !c || BY_ISO[p.country].dialCode === c.dialCode;
  };

  PhoneInput.flag = flagSvg;

  PhoneInput.exampleNumber = function (iso2) {
    return exampleNumber(coerceCountry(iso2));
  };

  /* ---- auto-init: <input data-vph data-country="ae" …> ---- */

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function parseList(v) {
    return String(v).split(',').map(function (s) { return s.trim(); });
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.vph) o.country = d.vph;                    // data-vph="ae" shorthand
    if (d.country) o.country = d.country;
    if (d.preferred) o.preferredCountries = parseList(d.preferred);
    if (d.only) o.onlyCountries = parseList(d.only);
    if (d.exclude) o.excludeCountries = parseList(d.exclude);
    if (d.name) o.name = d.name;
    if (d.placeholder != null) o.placeholder = d.placeholder === 'false' ? false : d.placeholder;
    if (d.validate) o.validate = d.validate;
    if (d.theme) o.theme = d.theme;
    if (d.nationalMode != null) o.nationalMode = parseBool(d.nationalMode);
    if (d.showDialCode != null) o.showDialCode = parseBool(d.showDialCode);
    if (d.searchable != null) o.searchable = parseBool(d.searchable);
    if (d.styles != null) o.styles = parseBool(d.styles);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    return o;
  }

  PhoneInput.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vph]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new PhoneInput(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('PhoneInput auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { PhoneInput.autoInit(); });
    } else {
      PhoneInput.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  PhoneInput.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(PhoneInput, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    PhoneInput.css = renderCss();
  }
  PhoneInput.displayName = 'PhoneInput';
  PhoneInput.rootClass = 'vph';
  PhoneInput.themeVars = {
    accent: '--vph-accent',
    radius: '--vph-radius',
    font: '--vph-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  PhoneInput.varScopes = [
    '.vph,.vph-panel',
    '.vph[data-theme=dark],.vph-panel[data-theme=dark]'
  ];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('phone', PhoneInput);
  }

  return PhoneInput;
});

/* ==== drawer/drawer.js ==== */
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
    // overflow:clip (not just hidden): hidden containers can still be
    // scrolled programmatically, and moving focus into the off-screen panel
    // scroll-reveals it — which cancels the right/bottom slide-in transform
    // before it ever animates. clip forbids scrolling entirely.
    '.vdr.SALT{position:fixed;top:0;left:0;z-index:99990;box-sizing:border-box;' +
      'width:100%;height:100%;max-width:none;max-height:none;' +
      'border:0;margin:0;padding:0;overflow:hidden;overflow:clip;' +
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

/* ==== segmented/segmented.js ==== */
/*!
 * Vanilla UI Kit Segmented v1.0.0
 * A single-file, zero-dependency segmented control (the modern radio
 * group) for vanilla JS. Part of the Vanilla UI Kit family — standalone,
 * or converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="segmented.js"></script>
 *   <div id="view"></div>
 *   <script>new Segmented('#view', { options: ['List', 'Board', 'Calendar'] })</script>
 *
 * Or enhance existing buttons / zero-JS:
 *   <div data-vsg><button data-value="list">List</button><button>Board</button></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Segmented = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-segmented-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Segmented.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Segmented.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the control; custom-property DEFINITIONS stay unsalted at
  // their documented specificity so `.vsg{--vsg-accent:…}` page overrides
  // keep working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsg{' +
      '--vsg-accent:#5b5bd6;' +
      '--vsg-bg:#ffffff;' +
      '--vsg-text:#1c1d21;' +
      '--vsg-muted:#72747e;' +
      '--vsg-faint:#e7e7ec;' +
      '--vsg-shadow:0 1px 3px rgba(24,25,32,.12),0 1px 2px rgba(24,25,32,.06);' +
      '--vsg-radius:10px;' +
      '--vsg-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsg[data-theme=dark]{' +
      '--vsg-accent:#7b7bea;' +
      '--vsg-bg:#1b1d24;' +
      '--vsg-text:#e9eaf0;' +
      '--vsg-muted:#989aa6;' +
      '--vsg-faint:#31343f;' +
      '--vsg-shadow:0 1px 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3);}' +
    /* the pill track */
    '.vsg.SALT{position:relative;display:inline-flex;align-items:stretch;gap:2px;' +
      'box-sizing:border-box;padding:3px;background:var(--vsg-faint);' +
      'border-radius:var(--vsg-radius);font-family:var(--vsg-font);' +
      'color:var(--vsg-text);vertical-align:middle;}' +
    '.vsg.SALT *,.vsg.SALT *::before,.vsg.SALT *::after{box-sizing:border-box;}' +
    '.vsg.SALT.vsg-full{display:flex;width:100%;}' +
    /* segments sit above the thumb (z-index 1 vs 0) */
    '.vsg.SALT .vsg-seg{position:relative;z-index:1;flex:none;display:inline-flex;' +
      'align-items:center;justify-content:center;gap:7px;' +
      'font:inherit;font-family:var(--vsg-font);font-size:14px;font-weight:500;' +
      'line-height:1.3;color:var(--vsg-muted);background:none;border:0;' +
      'border-radius:calc(var(--vsg-radius) - 3px);padding:6px 14px;margin:0;' +
      'cursor:pointer;white-space:nowrap;min-width:0;' +
      'transition:color .15s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vsg.SALT.vsg-full .vsg-seg{flex:1;}' +
    '.vsg.SALT .vsg-seg:hover{color:var(--vsg-text);}' +
    '.vsg.SALT .vsg-seg[aria-checked=true]{color:var(--vsg-accent);font-weight:600;}' +
    '.vsg.SALT .vsg-seg[disabled]{opacity:.45;cursor:not-allowed;}' +
    '.vsg.SALT .vsg-seg[disabled]:hover{color:var(--vsg-muted);}' +
    '.vsg.SALT .vsg-seg:focus{outline:none;}' +
    '.vsg.SALT .vsg-seg:focus-visible{outline:2px solid var(--vsg-accent);' +
      'outline-offset:-2px;}' +
    '.vsg.SALT .vsg-icon{flex:none;display:grid;place-items:center;}' +
    '.vsg.SALT .vsg-icon svg{display:block;}' +
    '.vsg.SALT .vsg-label{overflow:hidden;text-overflow:ellipsis;}' +
    /* the thumb — one element that slides behind the checked segment
       (JS sets transform/width/height; hidden until first measure) */
    '.vsg.SALT .vsg-thumb{position:absolute;top:0;left:0;z-index:0;width:0;height:0;' +
      'background:var(--vsg-bg);border-radius:calc(var(--vsg-radius) - 3px);' +
      'box-shadow:var(--vsg-shadow);opacity:0;pointer-events:none;}' +
    '.vsg.SALT .vsg-thumb.vsg-thumb-on{opacity:1;}' +
    /* transitions only after the first placement, so init never animates */
    '.vsg.SALT.vsg-ready .vsg-thumb{transition:transform .18s cubic-bezier(.4,0,.2,1),' +
      'width .18s cubic-bezier(.4,0,.2,1),height .18s cubic-bezier(.4,0,.2,1);}' +
    /* small size */
    '.vsg.SALT.vsg-sm{padding:2px;}' +
    '.vsg.SALT.vsg-sm .vsg-seg{font-size:13px;padding:4px 10px;gap:6px;' +
      'border-radius:calc(var(--vsg-radius) - 2px);}' +
    '.vsg.SALT.vsg-sm .vsg-thumb{border-radius:calc(var(--vsg-radius) - 2px);}' +
    /* whole-control disabled */
    '.vsg.SALT.vsg-disabled{opacity:.55;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsg.SALT .vsg-seg,.vsg.SALT .vsg-thumb{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set Segmented.salt to your own token / false
  // BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Segmented.salt;
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
    // Insert before the page's own CSS so `.vsg { --vsg-* }` overrides win the cascade.
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

  // Options → [{value, label, icon, iconOnly, disabled}]. Labels are TEXT
  // (rendered with textContent); `icon` is a TRUSTED SVG string — same
  // trust model as Toast's built-in icons. An option with an icon and no
  // label (or `iconOnly: true`) renders icon-only; its label/value becomes
  // the segment's aria-label.
  function normalizeOptions(list) {
    var out = [], i;
    for (i = 0; i < (list ? list.length : 0); i++) {
      var it = list[i];
      if (it == null) continue;
      if (typeof it !== 'object') {
        out.push({ value: it, label: String(it), icon: null, iconOnly: false, disabled: false });
        continue;
      }
      var value = it.value !== undefined ? it.value : it.label;
      var label = it.label != null ? String(it.label) : String(value);
      out.push({
        value: value,
        label: label,
        icon: it.icon || null,
        iconOnly: !!it.icon && (it.iconOnly === true || it.label == null),
        disabled: !!it.disabled
      });
    }
    return out;
  }

  // Enhance mode: each direct <button> child becomes an option — label
  // from its textContent, value from data-value || text, disabled respected.
  function parseButtons(container) {
    var out = [], kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName !== 'BUTTON') continue;
      var label = (kids[i].textContent || '').replace(/^\s+|\s+$/g, '');
      out.push({
        value: kids[i].getAttribute('data-value') || label,
        label: label,
        icon: null,
        iconOnly: false,
        disabled: kids[i].disabled || kids[i].hasAttribute('disabled')
      });
    }
    return out;
  }

  var DEFAULTS = {
    options: null,        // [{value, label, icon?, iconOnly?, disabled?}] | ['a','b'] shorthand
    value: undefined,     // initial value; default = first enabled option
    name: null,           // hidden <input name> carrying the value for forms
    size: 'md',           // 'sm' | 'md'
    fullWidth: false,     // stretch segments evenly across the container
    label: null,          // aria-label for the radiogroup
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    styles: true,         // false = headless: no CSS injected, style .vsg-* yourself
    onChange: null,       // fn(value, instance)
    labels: { group: 'Options' } // fallback group name when none is provided
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    options: [],
    index: -1,
    getValue: function () { return null; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    update: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Segmented.
   * ------------------------------------------------------------------ */

  function Segmented(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Segmented: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this.index = -1;
    this.segs = [];
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._orig = [];    // original child nodes, put back on destroy
    this._built = [];   // nodes we created, removed on destroy/update
    this._disabledAll = false;
    this._destroyed = false;

    // Enhance mode: no options given → read them from the existing buttons.
    var given = this.opts.options && this.opts.options.length;
    this.options = given ? normalizeOptions(this.opts.options) : parseButtons(el);
    if (!this.options.length) {
      throw new Error('Segmented: no options given and no <button> children found');
    }

    if (this.opts.styles !== false) injectStyles();

    // Stash whatever was inside (the enhanced buttons, stray whitespace);
    // destroy() puts it all back exactly as it was.
    while (el.firstChild) this._orig.push(el.removeChild(el.firstChild));

    this._wire();
    this._renderDom();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._setIndex(this._initialIndex(this.opts.value), false);

    // Re-measure once styles/layout have settled, then arm the thumb
    // transition — the first placement itself must never animate.
    var self = this;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (self._destroyed) return;
        self._moveThumb();
        self._addClass(self.el, 'vsg-ready');
      });
    });
  }

  Segmented.prototype = {
    constructor: Segmented,

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

    /* ---------------- setup ---------------- */

    _wire: function () {
      var s = saltToken();
      this._addClass(this.el, 'vsg');
      if (s) this._addClass(this.el, s);
      if (this.opts.size === 'sm') this._addClass(this.el, 'vsg-sm');
      if (this.opts.fullWidth) this._addClass(this.el, 'vsg-full');
      this._setAttr(this.el, 'role', 'radiogroup');
      // A radiogroup needs an accessible name; never clobber one the
      // author already provided.
      if (this.opts.label) {
        this._setAttr(this.el, 'aria-label', String(this.opts.label));
      } else if (!this.el.getAttribute('aria-label') &&
                 !this.el.getAttribute('aria-labelledby')) {
        this._setAttr(this.el, 'aria-label', DEFAULTS.labels.group);
      }
    },

    // Build thumb + segments + optional hidden input into the container.
    _renderDom: function () {
      var el = this.el, i;
      this.segs = [];

      this._thumb = document.createElement('span');
      this._thumb.className = 'vsg-thumb';
      this._thumb.setAttribute('aria-hidden', 'true');
      el.appendChild(this._thumb);
      this._built.push(this._thumb);

      for (i = 0; i < this.options.length; i++) {
        var opt = this.options[i];
        var btn = document.createElement('button');
        btn.type = 'button'; // never submits a surrounding form
        btn.className = 'vsg-seg';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('data-value', String(opt.value));
        if (opt.disabled) btn.disabled = true;
        if (opt.icon) {
          var ic = document.createElement('span');
          ic.className = 'vsg-icon';
          ic.setAttribute('aria-hidden', 'true');
          ic.innerHTML = opt.icon; // trusted SVG string, like Toast's icons
          btn.appendChild(ic);
        }
        if (opt.iconOnly) {
          btn.setAttribute('aria-label', opt.label);
        } else {
          var lb = document.createElement('span');
          lb.className = 'vsg-label';
          lb.textContent = opt.label; // labels are TEXT, always
          btn.appendChild(lb);
        }
        el.appendChild(btn);
        this._built.push(btn);
        this.segs.push(btn);
      }

      this.input = null;
      if (this.opts.name) {
        this.input = document.createElement('input');
        this.input.type = 'hidden';
        this.input.name = String(this.opts.name);
        el.appendChild(this.input);
        this._built.push(this.input);
      }
    },

    // Remove everything _renderDom built (used by update() and destroy()).
    _teardownDom: function () {
      for (var i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      this._built = [];
      this.segs = [];
      this._thumb = null;
      this.input = null;
    },

    _bind: function () {
      var self = this;
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this._onResize = function () { self._moveThumb(); };
      this.el.addEventListener('click', this._onClick);
      this.el.addEventListener('keydown', this._onKeydown);
      window.addEventListener('resize', this._onResize);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _indexOfValue: function (v) {
      for (var i = 0; i < this.options.length; i++) {
        if (this.options[i].value === v) return i;
      }
      // Forgiving second pass: '2' matches 2, etc. (data-attribute init
      // and hidden-input round-trips are string-typed).
      for (i = 0; i < this.options.length; i++) {
        if (String(this.options[i].value) === String(v)) return i;
      }
      return -1;
    },

    _firstEnabled: function () {
      for (var i = 0; i < this.options.length; i++) {
        if (!this.options[i].disabled) return i;
      }
      return -1;
    },

    _initialIndex: function (value) {
      var i = value !== undefined ? this._indexOfValue(value) : -1;
      if (i === -1 || this.options[i].disabled) i = this._firstEnabled();
      return i;
    },

    // Next enabled index from `from` in `dir`, wrapping; `from` if none.
    _step: function (from, dir) {
      var n = this.options.length;
      for (var k = 1; k <= n; k++) {
        var j = ((from + dir * k) % n + n) % n;
        if (!this.options[j].disabled) return j;
      }
      return from;
    },

    _segFromEvent: function (e) {
      var node = e.target;
      while (node && node !== this.el) {
        if (this.segs.indexOf(node) !== -1) return node;
        node = node.parentNode;
      }
      return null;
    },

    _handleClick: function (e) {
      if (this._disabledAll) return;
      var seg = this._segFromEvent(e);
      if (!seg) return;
      var i = this.segs.indexOf(seg);
      if (this.options[i].disabled) return;
      this._setIndex(i, true);
    },

    // Radio semantics: arrows MOVE FOCUS AND SELECT (all four arrows work,
    // so the control behaves in any layout); Home/End jump to the first/
    // last enabled segment; disabled segments are skipped.
    _handleKeydown: function (e) {
      if (this._disabledAll || e.altKey || e.ctrlKey || e.metaKey) return;
      var seg = this._segFromEvent(e);
      if (!seg) return;
      var i = this.segs.indexOf(seg);
      var j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = this._step(i, 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = this._step(i, -1);
      else if (e.key === 'Home') j = this._step(this.options.length - 1, 1); // first enabled
      else if (e.key === 'End') j = this._step(0, -1);                       // last enabled
      else return; // Space/Enter → native button click → _handleClick
      e.preventDefault();
      this.segs[j].focus();
      this._setIndex(j, true);
    },

    // Slide the thumb behind the checked segment. Called on select, on
    // window resize, and once post-init after layout settles.
    _moveThumb: function () {
      if (!this._thumb) return;
      var seg = this.segs[this.index];
      if (!seg) {
        this._thumb.classList.remove('vsg-thumb-on');
        return;
      }
      var s = this._thumb.style;
      s.width = seg.offsetWidth + 'px';
      s.height = seg.offsetHeight + 'px';
      s.transform = 'translate(' + seg.offsetLeft + 'px,' + seg.offsetTop + 'px)';
      this._thumb.classList.add('vsg-thumb-on');
    },

    _setIndex: function (i, fire) {
      if (i == null || i < 0 || i >= this.options.length) return this;
      if (this.options[i].disabled) return this;
      var prev = this.index;
      this.index = i;
      for (var j = 0; j < this.segs.length; j++) {
        var on = j === i;
        this.segs[j].setAttribute('aria-checked', on ? 'true' : 'false');
        this.segs[j].setAttribute('tabindex', on ? '0' : '-1'); // roving tabindex
      }
      if (this.input) this.input.value = String(this.options[i].value);
      this._moveThumb();
      if (fire && prev !== i) {
        var value = this.options[i].value;
        if (this.opts.onChange) this.opts.onChange(value, this);
        this.el.dispatchEvent(new CustomEvent('segmented:change', {
          bubbles: true,
          detail: { value: value, segmented: this }
        }));
      }
      return this;
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.index >= 0 ? this.options[this.index].value : null;
    },

    setValue: function (v, o) {
      var i = this._indexOfValue(v);
      if (i === -1) return this;
      return this._setIndex(i, !(o && o.silent));
    },

    enable: function () {
      if (!this._disabledAll) return this;
      this._disabledAll = false;
      this.el.classList.remove('vsg-disabled');
      this.el.removeAttribute('aria-disabled');
      for (var i = 0; i < this.segs.length; i++) {
        this.segs[i].disabled = this.options[i].disabled; // per-option state survives
      }
      if (this.input) this.input.disabled = false;
      return this;
    },

    disable: function () {
      if (this._disabledAll) return this;
      this._disabledAll = true;
      this.el.classList.add('vsg-disabled');
      this.el.setAttribute('aria-disabled', 'true');
      for (var i = 0; i < this.segs.length; i++) this.segs[i].disabled = true;
      if (this.input) this.input.disabled = true; // disabled controls don't submit
      return this;
    },

    // Replace the option set; the current value is kept when it still
    // exists and is enabled, otherwise selection falls back to the first
    // enabled option. Never fires onChange.
    update: function (options) {
      if (!this.el) return this;
      var prevValue = this.index >= 0 ? this.options[this.index].value : undefined;
      this.options = normalizeOptions(options);
      this.index = -1;
      this._teardownDom();
      this._renderDom();
      this._setIndex(this._initialIndex(prevValue), false);
      if (this._disabledAll) { this._disabledAll = false; this.disable(); }
      return this;
    },

    destroy: function () {
      if (!this.el || this._destroyed) return this;
      this._destroyed = true;
      unwatchAutoTheme(this);
      this.el.removeEventListener('click', this._onClick);
      this.el.removeEventListener('keydown', this._onKeydown);
      window.removeEventListener('resize', this._onResize);
      this._teardownDom();
      // Put the original children back (enhance mode restores its buttons) …
      for (var i = 0; i < this._orig.length; i++) this.el.appendChild(this._orig[i]);
      this._orig = [];
      // … then every attribute we touched, then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      this.el.classList.remove('vsg-disabled'); // in case disable() was on
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Segmented.version = VERSION;
  Segmented.defaults = DEFAULTS;

  Segmented.create = function (target, options) {
    return new Segmented(target, options);
  };

  Segmented.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.value != null && d.value !== '') o.value = d.value;
    if (d.name) o.name = d.name;
    if (d.size) o.size = d.size;
    if (d.fullWidth != null) o.fullWidth = parseBool(d.fullWidth);
    if (d.label) o.label = d.label;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Segmented.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsg]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Segmented(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Segmented auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Segmented.autoInit(); });
    } else {
      Segmented.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Segmented.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Segmented, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Segmented.css = renderCss();
  }
  Segmented.displayName = 'Segmented';
  Segmented.rootClass = 'vsg';
  Segmented.themeVars = {
    accent: '--vsg-accent',
    radius: '--vsg-radius',
    font: '--vsg-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Segmented.varScopes = ['.vsg', '.vsg[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('segmented', Segmented);
  }

  return Segmented;
});

/* ==== progress/progress.js ==== */
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

/* ==== popconfirm/popconfirm.js ==== */
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

/* ==== rating/rating.js ==== */
/*!
 * Vanilla UI Kit Rating v1.0.0
 * A single-file, zero-dependency star rating input/display for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="rating.js"></script>
 *   <div id="stars"></div>
 *   <script>new Rating('#stars', { onChange: function (v) {} })</script>
 *
 * Or zero-JS:
 *   <div data-vrt data-value="3.5"></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rating = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-rating-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Rating.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Rating.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vrt{--vrt-fill:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vrt{' +
      '--vrt-accent:#5b5bd6;' +
      '--vrt-fill:#f5a623;' + // the one non-accent fill in the family: warm star gold
      '--vrt-bg:#ffffff;' +
      '--vrt-text:#1c1d21;' +
      '--vrt-muted:#72747e;' +
      '--vrt-faint:#e7e7ec;' +
      '--vrt-radius:8px;' +
      '--vrt-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vrt[data-theme=dark]{' +
      '--vrt-accent:#7b7bea;' +
      '--vrt-fill:#f7b84d;' +
      '--vrt-bg:#1b1d24;' +
      '--vrt-text:#e9eaf0;' +
      '--vrt-muted:#989aa6;' +
      '--vrt-faint:#31343f;}' +
    '.vrt.SALT{display:inline-flex;align-items:center;gap:8px;' +
      'font-family:var(--vrt-font);color:var(--vrt-text);box-sizing:border-box;}' +
    '.vrt.SALT *,.vrt.SALT *::before,.vrt.SALT *::after{box-sizing:border-box;}' +
    '.vrt.SALT .vrt-stars{display:inline-flex;gap:3px;padding:2px;margin:-2px;' +
      'cursor:pointer;border-radius:var(--vrt-radius);touch-action:manipulation;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vrt.SALT .vrt-stars:focus{outline:none;}' +
    '.vrt.SALT .vrt-stars:focus-visible{outline:2px solid var(--vrt-accent);outline-offset:1px;}' +
    '.vrt.SALT .vrt-star{position:relative;flex:none;transition:transform .12s ease;}' +
    '.vrt.SALT .vrt-star svg{display:block;width:100%;height:100%;}' +
    '.vrt.SALT .vrt-star-empty{display:block;width:100%;height:100%;color:var(--vrt-muted);}' +
    /* the fractional overlay — full icon clipped to N% of the star's width */
    '.vrt.SALT .vrt-star-fill{position:absolute;top:0;left:0;width:0;height:100%;' +
      'overflow:hidden;color:var(--vrt-fill);pointer-events:none;}' +
    '.vrt.SALT .vrt-star-full{display:block;height:100%;}' +
    '.vrt.SALT .vrt-stars:not(.vrt-static) .vrt-star:hover{transform:scale(1.1);}' +
    '.vrt.SALT .vrt-value{font-size:13px;font-weight:600;color:var(--vrt-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vrt.SALT.vrt-readonly .vrt-stars{cursor:default;}' +
    '.vrt.SALT.vrt-disabled{opacity:.55;}' +
    '.vrt.SALT.vrt-disabled .vrt-stars{cursor:not-allowed;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vrt.SALT .vrt-star{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/rating.css), or set Rating.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Rating.salt;
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
    // Insert before the page's own CSS so `.vrt { --vrt-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  // Built-in icons, drawn in the family 1.5px-stroke style; the full variant
  // keeps the same stroke so its silhouette matches the empty one exactly
  // (important — the clipped overlay sits pixel-perfect on top of it).
  var STAR_PATH = 'M12 3.1 L14.7 8.9 L21 9.7 L16.4 14.1 L17.6 20.4 ' +
    'L12 17.3 L6.4 20.4 L7.6 14.1 L3 9.7 L9.3 8.9 Z';
  var HEART_PATH = 'M12 20.3 C7.4 17 3.5 13.7 3.5 9.8 C3.5 7.2 5.5 5.2 8 5.2 ' +
    'C9.6 5.2 11.1 6 12 7.3 C12.9 6 14.4 5.2 16 5.2 C18.5 5.2 20.5 7.2 20.5 9.8 ' +
    'C20.5 13.7 16.6 17 12 20.3 Z';

  function svgPair(path) {
    var open = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="';
    var attrs = '" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    return {
      empty: open + 'none"><path d="' + path + attrs,
      full: open + 'currentColor"><path d="' + path + attrs
    };
  }

  var ICONS = { star: svgPair(STAR_PATH), heart: svgPair(HEART_PATH) };

  // 'star' | 'heart' | {empty, full} pair of TRUSTED SVG strings.
  function resolveIcon(icon) {
    if (icon && typeof icon === 'object' && icon.empty && icon.full) return icon;
    return ICONS[icon] || ICONS.star;
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

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // '3.5' not '3.500000001', '3' not '3.0' — for the value text and the form.
  function fmt(v) {
    return String(Math.round(v * 100) / 100);
  }

  function defaultLabel(value, max) {
    return fmt(value) + ' of ' + max;
  }

  var DEFAULTS = {
    max: 5,             // number of stars
    value: 0,           // initial value (input mode reads the input instead)
    half: true,         // half-star steps on hover/click/keyboard
    icon: 'star',       // 'star' | 'heart' | {empty, full} trusted SVG strings
    size: 22,           // icon size in px
    readOnly: false,    // display only: no interaction, no focus stop
    clearable: true,    // clicking the current value clears to 0
    name: null,         // adds a hidden input for forms (container mode)
    showValue: false,   // '3.5' text after the stars
    disabled: false,    // starts disabled (input mode inherits the input's)
    labels: defaultLabel, // fn(value, max) → aria-valuetext / read-only label
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vrt-* yourself
    onChange: null,     // fn(value)
    onHover: null       // fn(value) previewing, fn(null) on leave
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    root: null,
    input: null,
    stars: null,
    value: 0,
    max: DEFAULTS.max,
    getValue: function () { return 0; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Rating.
   * ------------------------------------------------------------------ */

  function Rating(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Rating: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this._isInput = el.tagName === 'INPUT';
    this.opts = assignOptions({}, DEFAULTS, options);
    this.max = Math.max(1, Math.floor(+this.opts.max) || DEFAULTS.max);
    this._disabled = !!this.opts.disabled;
    if (this._isInput && options.disabled === undefined) this._disabled = el.disabled;

    // Input mode: the input's own value wins unless opts.value is explicit.
    var v = this.opts.value;
    if (this._isInput && options.value === undefined && el.value !== '') v = el.value;
    this.value = clamp(+v || 0, 0, this.max);

    this._preview = null; // hover value currently painted, or null
    this._saved = [];     // [{el, name, value}] — attributes to restore on destroy
    this._classes = [];   // [[el, className]] — classes to remove on destroy
    this._built = [];     // nodes we created — removed on destroy

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._render(this.value);
    this._syncAria();
    this._syncInput(false);
    this._refreshState();
  }

  Rating.prototype = {
    constructor: Rating,

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

    /* ---------------- setup ---------------- */

    _build: function () {
      var s = saltToken(), i;

      if (this._isInput) {
        // Enhance mode: hide the input (it keeps submitting), render after it.
        this.input = this.el;
        this._record(this.input, 'hidden');
        this.input.hidden = true;
        this.root = document.createElement('div');
        this.root.className = 'vrt' + (s ? ' ' + s : '');
        if (this.input.parentNode) {
          this.input.parentNode.insertBefore(this.root, this.input.nextSibling);
        }
        this._built.push(this.root);
      } else {
        this.root = this.el;
        this.input = null;
        this._addClass(this.root, 'vrt');
        if (s) this._addClass(this.root, s);
      }
      if (this.opts.readOnly) this._addClass(this.root, 'vrt-readonly');

      var pair = resolveIcon(this.opts.icon);
      var size = Math.max(8, Math.floor(+this.opts.size) || DEFAULTS.size);
      this.stars = document.createElement('span');
      this.stars.className = 'vrt-stars';
      this._starEls = [];
      this._fillEls = [];
      for (i = 0; i < this.max; i++) {
        var star = document.createElement('span');
        star.className = 'vrt-star';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        var empty = document.createElement('span');
        empty.className = 'vrt-star-empty';
        empty.innerHTML = pair.empty;
        // The overlay clips by width%, so the full icon inside needs its own
        // fixed width — otherwise it would shrink with the clip instead.
        var fill = document.createElement('span');
        fill.className = 'vrt-star-fill';
        var full = document.createElement('span');
        full.className = 'vrt-star-full';
        full.style.width = size + 'px';
        full.innerHTML = pair.full;
        fill.appendChild(full);
        star.appendChild(empty);
        star.appendChild(fill);
        this.stars.appendChild(star);
        this._starEls.push(star);
        this._fillEls.push(fill);
      }
      this.root.appendChild(this.stars);
      this._built.push(this.stars);

      if (this.opts.showValue) {
        this.valueEl = document.createElement('span');
        this.valueEl.className = 'vrt-value';
        this.root.appendChild(this.valueEl);
        this._built.push(this.valueEl);
      }

      if (!this._isInput && this.opts.name) {
        this.input = document.createElement('input');
        this.input.type = 'hidden';
        this.input.name = this.opts.name;
        this.root.appendChild(this.input);
        this._built.push(this.input);
      }

      if (this.opts.readOnly) {
        // Display mode: an image with a label, no focus stop.
        this.stars.className += ' vrt-static';
        this.stars.setAttribute('role', 'img');
      } else {
        // Input mode: one slider = one tab stop for the whole group.
        this.stars.setAttribute('role', 'slider');
        this.stars.setAttribute('aria-orientation', 'horizontal');
        this.stars.setAttribute('aria-valuemin', '0');
        this.stars.setAttribute('aria-valuemax', String(this.max));
        var name = this.el.getAttribute('aria-label');
        if (!name && this._isInput && this.el.id) {
          try { // adopt the input's <label for> text as the slider's name
            var lab = document.querySelector('label[for="' + this.el.id + '"]');
            if (lab) name = lab.textContent.replace(/^\s+|\s+$/g, '');
          } catch (err) { /* exotic id characters — skip */ }
        }
        if (name) this.stars.setAttribute('aria-label', name);
      }
    },

    _bind: function () {
      var self = this;
      this._onMove = function (e) { self._handleMove(e); };
      this._onLeave = function () { self._handleLeave(); };
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this.stars.addEventListener('mousemove', this._onMove);
      this.stars.addEventListener('mouseleave', this._onLeave);
      this.stars.addEventListener('click', this._onClick);
      this.stars.addEventListener('keydown', this._onKeydown);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.root, 'data-theme', resolved);
    },

    /* ---------------- rendering ---------------- */

    // Paint any value 0..max: per star the overlay is clamp(v−i, 0, 1)·100%,
    // so fractions render exactly (4.3 → four full stars + a 30% fifth).
    _render: function (v) {
      for (var i = 0; i < this._fillEls.length; i++) {
        var pct = clamp(v - i, 0, 1) * 100;
        this._fillEls[i].style.width = pct + '%';
      }
      if (this.valueEl) this.valueEl.textContent = fmt(v);
    },

    _syncAria: function () {
      var lab = typeof this.opts.labels === 'function' ? this.opts.labels : defaultLabel;
      var text = String(lab(this.value, this.max));
      if (this.opts.readOnly) {
        this.stars.setAttribute('aria-label', text);
      } else {
        this.stars.setAttribute('aria-valuenow', String(this.value));
        this.stars.setAttribute('aria-valuetext', text);
      }
    },

    _syncInput: function (fireNative) {
      if (!this.input) return;
      this.input.value = this.value > 0 ? fmt(this.value) : '';
      // Enhanced native inputs announce commits like a user edit would.
      if (fireNative && this._isInput) {
        this.input.dispatchEvent(new CustomEvent('change', { bubbles: true }));
      }
    },

    _refreshState: function () {
      var cl = this.root.classList;
      if (this._disabled) cl.add('vrt-disabled');
      else cl.remove('vrt-disabled');
      if (this.opts.readOnly) return; // static forever; no focus, no ARIA state
      if (this._disabled) {
        this.stars.classList.add('vrt-static');
        this.stars.setAttribute('aria-disabled', 'true');
        this.stars.setAttribute('tabindex', '-1');
      } else {
        this.stars.classList.remove('vrt-static');
        this.stars.removeAttribute('aria-disabled');
        this.stars.setAttribute('tabindex', '0');
      }
    },

    /* ---------------- interaction ---------------- */

    _interactive: function () {
      return !this.opts.readOnly && !this._disabled;
    },

    // Pointer → value: which star, and its left half → .5 when `half`.
    _valueFromEvent: function (e) {
      var node = e.target, i = -1;
      while (node && node !== this.stars) {
        var idx = this._starEls.indexOf(node);
        if (idx !== -1) { i = idx; break; }
        node = node.parentNode;
      }
      if (i === -1) return null;
      var v = i + 1;
      if (this.opts.half) {
        var rect = this._starEls[i].getBoundingClientRect();
        if (rect.width && e.clientX - rect.left < rect.width / 2) v = i + 0.5;
      }
      return v;
    },

    _handleMove: function (e) {
      if (!this._interactive()) return;
      var v = this._valueFromEvent(e);
      if (v == null || v === this._preview) return;
      this._preview = v;
      this._render(v);
      if (this.opts.onHover) this.opts.onHover(v);
    },

    _handleLeave: function () {
      if (this._preview == null) return;
      this._preview = null;
      this._render(this.value);
      if (this.opts.onHover) this.opts.onHover(null);
    },

    _handleClick: function (e) {
      if (!this._interactive()) return;
      var v = this._valueFromEvent(e);
      if (v == null) return;
      if (this.opts.clearable && v === this.value) v = 0; // toggle-off
      this._preview = null;
      this.setValue(v);
    },

    _handleKeydown: function (e) {
      if (!this._interactive() || e.altKey || e.ctrlKey || e.metaKey) return;
      var step = this.opts.half ? 0.5 : 1;
      var v = null;
      // ± steps land on the NEAREST grid mark in that direction, so 4.3
      // (set programmatically) becomes 4.5 on ArrowRight and 4 on ArrowLeft.
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        v = Math.floor((this.value + step) / step) * step;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        v = Math.ceil((this.value - step) / step) * step;
      } else if (e.key === 'Home') {
        v = 0;
      } else if (e.key === 'End') {
        v = this.max;
      } else if (/^[1-9]$/.test(e.key)) {
        v = Math.min(+e.key, this.max);
      } else {
        return;
      }
      e.preventDefault();
      this._preview = null;
      this.setValue(clamp(v, 0, this.max));
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.value;
    },

    // Any number 0..max — fractions are fine and render via the overlay.
    setValue: function (v, o) {
      v = +v;
      if (isNaN(v)) v = 0;
      v = clamp(v, 0, this.max);
      var changed = v !== this.value;
      var silent = !!(o && o.silent);
      this.value = v;
      this._render(v);
      this._syncAria();
      this._syncInput(changed && !silent);
      if (changed && !silent) {
        if (this.opts.onChange) this.opts.onChange(v);
        this.root.dispatchEvent(new CustomEvent('rating:change', {
          bubbles: true,
          detail: { value: v, rating: this }
        }));
      }
      return this;
    },

    enable: function () {
      this._disabled = false;
      if (this._isInput && this.input) {
        this._record(this.input, 'disabled');
        this.input.disabled = false;
      }
      this._refreshState();
      return this;
    },

    disable: function () {
      this._disabled = true;
      if (this._isInput && this.input) {
        // A disabled control must not submit — mirror onto the native input.
        this._record(this.input, 'disabled');
        this.input.disabled = true;
      }
      this._refreshState();
      return this;
    },

    destroy: function () {
      if (!this.el || this._destroyed) return this;
      this._destroyed = true;
      unwatchAutoTheme(this);
      this.stars.removeEventListener('mousemove', this._onMove);
      this.stars.removeEventListener('mouseleave', this._onLeave);
      this.stars.removeEventListener('click', this._onClick);
      this.stars.removeEventListener('keydown', this._onKeydown);
      var i;
      for (i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      // Put back every attribute we touched, then drop our classes.
      // (Enhanced inputs reappear un-hidden and keep their synced value.)
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      this.root.classList.remove('vrt-disabled');
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Rating.version = VERSION;
  Rating.defaults = DEFAULTS;

  Rating.create = function (target, options) {
    return new Rating(target, options);
  };

  Rating.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.max) o.max = +d.max;
    if (d.value != null && d.value !== '') o.value = parseFloat(d.value);
    if (d.half != null) o.half = parseBool(d.half);
    if (d.icon) o.icon = d.icon;
    if (d.size) o.size = +d.size;
    var ro = d.readOnly != null ? d.readOnly : d.readonly; // data-read-only | data-readonly
    if (ro != null) o.readOnly = parseBool(ro);
    if (d.clearable != null) o.clearable = parseBool(d.clearable);
    if (d.name) o.name = d.name;
    if (d.showValue != null) o.showValue = parseBool(d.showValue);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Rating.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vrt]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Rating(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Rating auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Rating.autoInit(); });
    } else {
      Rating.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Rating.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Rating, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Rating.css = renderCss();
  }
  Rating.displayName = 'Rating';
  Rating.rootClass = 'vrt';
  Rating.themeVars = {
    accent: '--vrt-accent',
    radius: '--vrt-radius',
    font: '--vrt-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Rating.varScopes = ['.vrt', '.vrt[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('rating', Rating);
  }

  return Rating;
});

/* ==== autocomplete/autocomplete.js ==== */
/*!
 * Vanilla UI Kit Autocomplete v1.0.0
 * A single-file, zero-dependency free-text typeahead for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Unlike Select, the input stays free text: suggestions assist, they
 * never constrain (search boxes, mention pickers, tag fields).
 *
 * Quick start:
 *   <script src="autocomplete.js"></script>
 *   <input id="q">
 *   <script>new Autocomplete('#q', { source: ['One', 'Two'] })</script>
 *
 * Or zero-JS:
 *   <input data-vac data-vac-source='["One","Two"]'>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Autocomplete = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-autocomplete-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Autocomplete.css`.
   * The host input is deliberately NOT styled — it belongs to the page;
   * only the suggestion panel is ours.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Autocomplete.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the panel; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vac{--vac-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vac{' +
      '--vac-accent:#5b5bd6;' +
      '--vac-bg:#ffffff;' +
      '--vac-surface:#f2f2f5;' +
      '--vac-text:#1c1d21;' +
      '--vac-muted:#72747e;' +
      '--vac-faint:#e7e7ec;' +
      '--vac-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vac-radius:12px;' +
      '--vac-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vac[data-theme=dark]{' +
      '--vac-accent:#7b7bea;' +
      '--vac-bg:#1b1d24;' +
      '--vac-surface:#272a33;' +
      '--vac-text:#e9eaf0;' +
      '--vac-muted:#989aa6;' +
      '--vac-faint:#31343f;' +
      '--vac-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    /* panel */
    '.vac.SALT.vac-panel{position:absolute;z-index:99999;box-sizing:border-box;' +
      'background:var(--vac-bg);color:var(--vac-text);border:1px solid var(--vac-faint);' +
      'border-radius:var(--vac-radius);box-shadow:var(--vac-shadow);padding:6px;' +
      'font-family:var(--vac-font);font-size:14px;line-height:1.35;text-align:left;' +
      'opacity:0;transform:translateY(4px) scale(.98);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vac.SALT.vac-panel.vac-open{opacity:1;transform:none;}' +
    '.vac.SALT *,.vac.SALT *::before,.vac.SALT *::after{box-sizing:border-box;}' +
    /* offsetTop of options must resolve against the list for scroll math */
    '.vac.SALT .vac-list{position:relative;max-height:264px;overflow-y:auto;' +
      'overscroll-behavior:contain;}' +
    '.vac.SALT .vac-group-label{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vac-muted);padding:8px 10px 4px;}' +
    '.vac.SALT .vac-option{display:block;padding:8px 10px;border-radius:8px;' +
      'cursor:pointer;transition:background .1s ease;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;}' +
    '.vac.SALT .vac-option.is-active{background:var(--vac-surface);}' +
    '.vac.SALT .vac-option.is-disabled{opacity:.4;cursor:not-allowed;background:none;}' +
    '.vac.SALT .vac-match{color:var(--vac-accent);font-weight:650;}' +
    /* status rows — hidden by default, toggled via panel state classes */
    '.vac.SALT .vac-empty,.vac.SALT .vac-loading{display:none;padding:10px 12px;' +
      'color:var(--vac-muted);font-size:13px;}' +
    '.vac.SALT.is-empty .vac-empty{display:block;}' +
    '.vac.SALT.is-loading .vac-loading{display:flex;align-items:center;gap:8px;}' +
    '.vac.SALT.is-loading .vac-empty{display:none;}' +
    '.vac.SALT .vac-loading svg{display:block;flex:none;}' +
    '.vac.SALT .vac-spin{animation:vac-spin .8s linear infinite;}' +
    '@keyframes vac-spin{to{transform:rotate(360deg);}}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vac.SALT,.vac.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/autocomplete.css), or set
  // Autocomplete.salt to your own token / false BEFORE the first instance.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Autocomplete.salt;
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
    // Insert before the page's own CSS so `.vac { --vac-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    spinner: '<svg class="vac-spin" width="14" height="14" viewBox="0 0 16 16" fill="none"' +
      ' aria-hidden="true"><path d="M14.25 8A6.25 6.25 0 1 1 8 1.75" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round"/></svg>'
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

  // Case- and diacritic-insensitive fold. Folds CHARACTER BY CHARACTER so
  // the folded string keeps a 1:1 index mapping onto the original — that is
  // what lets the highlighter wrap the matched substring of the real label.
  function fold(s) {
    s = String(s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i).toLowerCase();
      if (c.normalize) c = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += c.length === 1 ? c : (c.charAt(0) || s.charAt(i));
    }
    return out;
  }

  // Accepts [{value, label, group, disabled, html}] or ['a', 'b'] shorthand.
  function normalizeItems(list) {
    var out = [];
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o == null) continue;
      if (typeof o === 'object') {
        out.push({
          value: String(o.value != null ? o.value : (o.label != null ? o.label : '')),
          label: String(o.label != null ? o.label : (o.value != null ? o.value : '')),
          group: o.group != null ? String(o.group) : null,
          disabled: !!o.disabled,
          html: !!o.html
        });
      } else {
        out.push({ value: String(o), label: String(o), group: null, disabled: false, html: false });
      }
    }
    return out;
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
    source: null,           // array | fn(query, done) | fn(query) → Promise
    minChars: 1,            // fewer typed chars than this = closed panel
    debounce: 150,          // ms between last keystroke and the lookup
    maxResults: 10,         // cap applied after the source answers
    highlight: true,        // wrap the matched substring in a DOM span
    openOnFocus: false,     // lookup on focus, ignoring minChars (recents)
    allowNew: true,         // free text stays valid; false reverts on blur
    emptyText: null,        // defaults to labels.noResults
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vac-* yourself
    position: 'auto',       // 'auto' | 'below' | 'above'
    labels: {
      noResults: 'No results',
      loading: 'Loading…',
      suggestions: 'Suggestions'
    },
    onSelect: null,         // fn(item, autocomplete)
    onInput: null,          // fn(query, autocomplete)
    onError: null,          // fn(error, autocomplete) — source failures
    onOpen: null,
    onClose: null
  };

  /* ------------------------------------------------------------------ *
   * Autocomplete.
   * ------------------------------------------------------------------ */

  function Autocomplete(target, options) {
    // SSR: an inert instance — every public method below no-ops without a DOM.
    if (!HAS_DOM) return;
    var el = resolveElement(target);
    if (!el) throw new Error('Autocomplete: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.input = el;
    this.opts = assignOptions({}, DEFAULTS, options);

    this.isOpen = false;
    this.items = [];           // last DELIVERED results (normalized)
    this._uid = 'vac-' + (++uid);
    this._activeIdx = -1;
    this._seq = 0;             // async race guard: only the latest seq lands
    this._pending = false;
    this._query = '';
    this._committed = el.value || ''; // last selected/accepted value (allowNew:false)
    this._debounceTimer = null;
    this._closeTimer = null;
    this._prevAttrs = {};

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  Autocomplete.prototype = {
    constructor: Autocomplete,

    /* ---------------- DOM construction ---------------- */

    _setInputAttr: function (name, value) {
      if (!(name in this._prevAttrs)) this._prevAttrs[name] = this.input.getAttribute(name);
      this.input.setAttribute(name, value);
    },

    _build: function () {
      var L = this.opts.labels;
      var listId = this._uid + '-list';

      // The input is the combobox; we decorate it and leave its styling alone.
      this._setInputAttr('role', 'combobox');
      this._setInputAttr('aria-autocomplete', 'list');
      this._setInputAttr('aria-expanded', 'false');
      this._setInputAttr('aria-controls', listId);
      this._setInputAttr('autocomplete', 'off');
      this.input.setAttribute('data-vac-bound', '');

      var panel = document.createElement('div');
      panel.className = 'vac vac-panel' + saltClass();
      this.panel = panel;

      var list = document.createElement('div');
      list.className = 'vac-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.suggestions);
      panel.appendChild(list);
      this._list = list;

      var loading = document.createElement('div');
      loading.className = 'vac-loading';
      loading.innerHTML = ICONS.spinner;
      var loadText = document.createElement('span');
      loadText.textContent = L.loading;
      loading.appendChild(loadText);
      panel.appendChild(loading);

      var empty = document.createElement('div');
      empty.className = 'vac-empty';
      empty.textContent = this.opts.emptyText != null
        ? String(this.opts.emptyText) : L.noResults;
      panel.appendChild(empty);

      panel.style.display = 'none';
      document.body.appendChild(panel);
    },

    _bind: function () {
      var self = this;

      this._onInput = function () {
        var v = self.input.value;
        if (self.opts.onInput) self.opts.onInput(v, self);
        self._lookup(v, false, false); // typing reopens (debounced)
      };
      this._onFocus = function () {
        if (self.opts.openOnFocus && !self.isOpen) {
          self._lookup(self.input.value, true, true);
        }
      };
      // Options aren't focusable and panel mousedowns are prevented, so any
      // real blur means focus genuinely left the widget.
      this._onBlur = function () {
        if (!self.opts.allowNew) self._enforceMatch();
        self.close();
      };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this.input.addEventListener('input', this._onInput);
      this.input.addEventListener('focus', this._onFocus);
      this.input.addEventListener('blur', this._onBlur);
      this.input.addEventListener('keydown', this._onKeydown);

      // Choosing a suggestion must not steal focus from the input.
      this._onPanelMousedown = function (e) { e.preventDefault(); };
      this._onPanelClick = function (e) {
        var opt = e.target.closest ? e.target.closest('.vac-option') : null;
        if (!opt || opt.classList.contains('is-disabled')) return;
        self._choose(+opt.getAttribute('data-i'));
      };
      this._onPanelOver = function (e) {
        var opt = e.target.closest ? e.target.closest('.vac-option') : null;
        if (opt && !opt.classList.contains('is-disabled')) {
          self._setActive(+opt.getAttribute('data-i'), false);
        }
      };
      this.panel.addEventListener('mousedown', this._onPanelMousedown);
      this.panel.addEventListener('click', this._onPanelClick);
      this.panel.addEventListener('mouseover', this._onPanelOver);

      // Backup for pointer interactions that never move focus (blur owns
      // the common path since the input is the only focusable piece).
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(self.input) !== -1) return;
        self.close();
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.panel.setAttribute('data-theme', resolved);
    },

    /* ---------------- lookups (async-safe) ---------------- */

    // force=true ignores minChars (focus/open with an empty query → recents).
    _lookup: function (query, immediate, force) {
      var self = this;
      clearTimeout(this._debounceTimer);
      var q = String(query == null ? '' : query).replace(/^\s+|\s+$/g, '');
      this._query = q;
      var min = +this.opts.minChars || 0;
      if (!force && q.length < min) {
        this._seq++; // a shorter query also supersedes any in-flight lookup
        this._pending = false;
        this.close();
        return;
      }
      if (immediate) this._run(q);
      else {
        this._debounceTimer = setTimeout(function () {
          self._run(q);
        }, +this.opts.debounce || 0);
      }
    },

    _run: function (query) {
      var self = this;
      var seq = ++this._seq; // this lookup supersedes everything before it
      var src = this.opts.source;

      if (typeof src === 'function') {
        var settled = false; // a source may call done() AND return a promise
        var ok = function (results) {
          if (settled) return;
          settled = true;
          self._deliver(seq, query, results);
        };
        var fail = function (err) {
          if (settled) return;
          settled = true;
          self._fail(seq, err);
        };
        this._pending = true;
        this._showLoading();
        var ret;
        try {
          ret = src(query, ok);
        } catch (err) {
          fail(err);
          return;
        }
        if (ret && typeof ret.then === 'function') ret.then(ok, fail);
        return;
      }

      // Array source: filter locally. An empty query matches everything —
      // that is what openOnFocus uses for "recent searches" lists.
      var items = normalizeItems(src);
      var fq = fold(query);
      var out = [];
      for (var i = 0; i < items.length; i++) {
        if (!fq || fold(items[i].label).indexOf(fq) !== -1) out.push(items[i]);
      }
      this._deliver(seq, query, out);
    },

    // Results land here from every source shape. Anything from a superseded
    // query (seq mismatch) is DISCARDED — late responses can never clobber
    // the list the user is currently looking at.
    _deliver: function (seq, query, results) {
      if (!this.input || seq !== this._seq) return; // stale or destroyed
      this._pending = false;
      var items = normalizeItems(results);
      var max = +this.opts.maxResults;
      if (max > 0 && items.length > max) items = items.slice(0, max);
      this.items = items;
      this._activeIdx = -1; // browsing starts fresh; Enter stays free-text
      this._setActiveDescendant('');
      this._renderList(query);
      this.panel.classList.remove('is-loading');

      var min = +this.opts.minChars || 0;
      if (items.length) {
        this.panel.classList.remove('is-empty');
        this._openPanel();
      } else if (query.length >= min) {
        // Empty state only once the query is long enough to have searched;
        // a forced lookup with a shorter query just closes quietly.
        this.panel.classList.add('is-empty');
        this._openPanel();
      } else {
        this.close();
      }
      if (this.isOpen) this._position();
    },

    // Source errors close the panel silently; opts.onError gets the details.
    _fail: function (seq, err) {
      if (!this.input || seq !== this._seq) return;
      this._pending = false;
      this.close();
      if (this.opts.onError) this.opts.onError(err, this);
    },

    // Subtle loading row while a lookup is in flight — previous results stay
    // visible underneath so the list doesn't flicker between keystrokes.
    _showLoading: function () {
      this.panel.classList.add('is-loading');
      this.panel.classList.remove('is-empty');
      this._openPanel();
      this._position();
    },

    /* ---------------- rendering ---------------- */

    _renderList: function (query) {
      var list = this._list;
      list.innerHTML = '';
      var groups = {};
      for (var i = 0; i < this.items.length; i++) {
        var o = this.items[i];
        var parent = list;
        if (o.group) {
          if (!groups[o.group]) {
            var g = document.createElement('div');
            g.setAttribute('role', 'group');
            g.setAttribute('aria-label', o.group);
            var gl = document.createElement('div');
            gl.className = 'vac-group-label';
            gl.setAttribute('aria-hidden', 'true');
            gl.textContent = o.group;
            g.appendChild(gl);
            list.appendChild(g);
            groups[o.group] = g;
          }
          parent = groups[o.group];
        }
        var opt = document.createElement('div');
        opt.className = 'vac-option' + (o.disabled ? ' is-disabled' : '');
        opt.id = this._uid + '-opt-' + i;
        opt.setAttribute('role', 'option');
        opt.setAttribute('data-i', String(i));
        opt.setAttribute('aria-selected', 'false');
        if (o.disabled) opt.setAttribute('aria-disabled', 'true');
        this._renderLabel(opt, o, query);
        parent.appendChild(opt);
      }
    },

    // Labels are TEXT by default; `html: true` is an explicit per-item
    // opt-in (and skips highlighting — the markup is taken as-is). The
    // highlight itself is built from DOM spans, never innerHTML.
    _renderLabel: function (el, item, query) {
      if (item.html) {
        el.innerHTML = item.label;
        return;
      }
      var label = item.label;
      var q = query ? fold(query) : '';
      var idx = (this.opts.highlight && q) ? fold(label).indexOf(q) : -1;
      if (idx === -1) {
        el.textContent = label;
        return;
      }
      if (idx > 0) el.appendChild(document.createTextNode(label.slice(0, idx)));
      var mark = document.createElement('span');
      mark.className = 'vac-match';
      mark.textContent = label.slice(idx, idx + q.length);
      el.appendChild(mark);
      if (idx + q.length < label.length) {
        el.appendChild(document.createTextNode(label.slice(idx + q.length)));
      }
    },

    /* ---------------- active option ---------------- */

    _enabled: function () {
      var out = [];
      for (var i = 0; i < this.items.length; i++) {
        if (!this.items[i].disabled) out.push(i);
      }
      return out;
    },

    _setActive: function (idx, scroll) {
      this._activeIdx = idx;
      var prev = this._list.querySelector('.vac-option.is-active');
      if (prev) {
        prev.classList.remove('is-active');
        prev.setAttribute('aria-selected', 'false');
      }
      var el = this._list.querySelector('[data-i="' + idx + '"]');
      if (!el) {
        this._setActiveDescendant('');
        return;
      }
      el.classList.add('is-active');
      el.setAttribute('aria-selected', 'true');
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
      if (id) this.input.setAttribute('aria-activedescendant', id);
      else this.input.removeAttribute('aria-activedescendant');
    },

    // Browsing moves aria-activedescendant only — the typed text is never
    // overwritten until the user actually commits with Enter or a click.
    _moveActive: function (dir) {
      var vis = this._enabled();
      if (!vis.length) return;
      var cur = vis.indexOf(this._activeIdx);
      var next = cur === -1
        ? (dir > 0 ? 0 : vis.length - 1)
        : (cur + dir + vis.length) % vis.length; // skips disabled, wraps
      this._setActive(vis[next], true);
    },

    /* ---------------- selection ---------------- */

    _choose: function (idx) {
      var item = this.items[idx];
      if (!item || item.disabled) return;
      this.input.value = item.value;
      this._committed = item.value;
      this._query = item.value;
      this.close();
      if (this.opts.onSelect) this.opts.onSelect(item, this);
      this._emit('select', { item: item, autocomplete: this });
    },

    // allowNew: false — on leave, text that isn't a suggestion (by value or
    // label, case/diacritic-insensitive) reverts to the last accepted value.
    _enforceMatch: function () {
      var v = this.input.value.replace(/^\s+|\s+$/g, '');
      if (v === '') { this._committed = ''; return; } // clearing is always allowed
      var fv = fold(v);
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        if (it.disabled) continue;
        if (fold(it.value) === fv || fold(it.label) === fv) {
          this.input.value = it.value;
          this._committed = it.value;
          return;
        }
      }
      if (fold(this._committed) !== fv) this.input.value = this._committed;
    },

    _emit: function (name, detail) {
      this.input.dispatchEvent(new CustomEvent('autocomplete:' + name, {
        bubbles: true,
        detail: detail || { autocomplete: this }
      }));
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e) {
      var key = e.key;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        if (!this.isOpen) {
          this.open(); // reopen with suggestions for the current text
          return;
        }
        this._moveActive(key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (!this.isOpen) return;
      switch (key) {
        case 'Enter':
          if (this._activeIdx !== -1) {
            e.preventDefault(); // commit the browsed suggestion, not the form
            this._choose(this._activeIdx);
          } else {
            this.close(); // free text stands; let the form see the Enter
          }
          return;
        case 'Escape':
          // Single Esc: close only — the typed text is deliberately kept.
          e.preventDefault();
          e.stopPropagation();
          this.close();
          return;
        case 'Tab':
          this.close(); // let Tab move on naturally
          return;
      }
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this.input;
      panel.style.minWidth = anchor.offsetWidth + 'px';
      var prefer = this.opts.position === 'below' ? 'below'
        : this.opts.position === 'above' ? 'above' : null;
      if (window.VC && typeof window.VC.position === 'function') {
        var res = window.VC.position(panel, anchor, { gap: 6, pad: 8, prefer: prefer });
        if (res) panel.style.transformOrigin = res.below ? '50% 0' : '50% 100%';
        return;
      }
      // Private fallback: flip above when there is no room below, clamp to
      // the viewport horizontally (same approach as the rest of the family).
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

    _openPanel: function () {
      if (this.isOpen) return;
      clearTimeout(this._closeTimer);

      // If the input lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this.input.closest ? this.input.closest('dialog') : null;
      this._inTopLayer = !!host;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vac-open'); });
      this.isOpen = true;
      this.input.setAttribute('aria-expanded', 'true');

      document.addEventListener('pointerdown', this._onDocPointer, true);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);

      if (this.opts.onOpen) this.opts.onOpen(this);
      this._emit('open');
    },

    /* ---------------- public API ---------------- */

    // Look up suggestions for the current text right now (no debounce) and
    // show them — minChars is ignored, like openOnFocus.
    open: function () {
      if (!this.input) return this;
      this._lookup(this.input.value, true, true);
      return this;
    },

    close: function () {
      if (!this.input) return this;
      // Always cancel whatever is in flight — even when the panel never got
      // to open (blur during the debounce window must not reopen it later).
      clearTimeout(this._debounceTimer);
      this._seq++;
      this._pending = false;
      if (!this.isOpen) return this;

      this.isOpen = false;
      this.input.setAttribute('aria-expanded', 'false');
      this._activeIdx = -1;
      this._setActiveDescendant('');
      this.panel.classList.remove('is-loading');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      this.panel.classList.remove('vac-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);

      if (this.opts.onClose) this.opts.onClose(this);
      this._emit('close');
      return this;
    },

    // Swap the source (array or function); an open panel refreshes in place.
    setSource: function (src) {
      if (!this.input) return this;
      this.opts.source = src;
      if (this.isOpen) this._lookup(this.input.value, true, true);
      return this;
    },

    getInput: function () {
      return this.input || null;
    },

    // Tear down and give the input back exactly as we found it.
    destroy: function () {
      if (!this.input) return this;
      this.close();
      clearTimeout(this._debounceTimer);
      clearTimeout(this._closeTimer);
      this._seq++; // orphan any in-flight lookup for good
      unwatchAutoTheme(this);
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      this.input.removeEventListener('input', this._onInput);
      this.input.removeEventListener('focus', this._onFocus);
      this.input.removeEventListener('blur', this._onBlur);
      this.input.removeEventListener('keydown', this._onKeydown);
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      for (var name in this._prevAttrs) {
        if (this._prevAttrs[name] == null) this.input.removeAttribute(name);
        else this.input.setAttribute(name, this._prevAttrs[name]);
      }
      this.input.removeAttribute('aria-activedescendant');
      this.input.removeAttribute('data-vac-bound');
      if (instances) instances.delete(this.input);
      this.input = null;
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Autocomplete.version = VERSION;
  Autocomplete.defaults = DEFAULTS;

  Autocomplete.create = function (target, options) {
    return new Autocomplete(target, options);
  };

  Autocomplete.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vacMinChars != null && d.vacMinChars !== '') o.minChars = +d.vacMinChars;
    if (d.vacDebounce != null && d.vacDebounce !== '') o.debounce = +d.vacDebounce;
    if (d.vacMaxResults != null && d.vacMaxResults !== '') o.maxResults = +d.vacMaxResults;
    if (d.vacHighlight != null) o.highlight = parseBool(d.vacHighlight);
    if (d.vacOpenOnFocus != null) o.openOnFocus = parseBool(d.vacOpenOnFocus);
    if (d.vacAllowNew != null) o.allowNew = parseBool(d.vacAllowNew);
    if (d.vacStyles != null) o.styles = parseBool(d.vacStyles);
    if (d.vacEmptyText) o.emptyText = d.vacEmptyText;
    if (d.vacTheme) o.theme = d.vacTheme;
    if (d.vacPosition) o.position = d.vacPosition;
    if (d.vacSource) {
      // JSON array, or a plain comma list as shorthand.
      try { o.source = JSON.parse(d.vacSource); }
      catch (err) { o.source = d.vacSource.split(','); }
    }
    return o;
  }

  Autocomplete.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vac]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Autocomplete(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Autocomplete auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Autocomplete.autoInit(); });
    } else {
      Autocomplete.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Autocomplete.displayName = 'Autocomplete';
  Autocomplete.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Autocomplete, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Autocomplete.css = renderCss();
  }
  Autocomplete.rootClass = 'vac';
  Autocomplete.themeVars = {
    accent: '--vac-accent',
    radius: '--vac-radius',
    font: '--vac-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Autocomplete.varScopes = ['.vac', '.vac[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('autocomplete', Autocomplete);
  }

  return Autocomplete;
});

/* ==== upload/upload.js ==== */
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

/* ==== slider/slider.js ==== */
/*!
 * Vanilla UI Kit Slider v1.0.0
 * A single-file, zero-dependency range slider for vanilla JS — single or
 * dual thumb. Part of the Vanilla UI Kit family — standalone, or converges
 * with the VC core when it is present.
 *
 * Quick start:
 *   <script src="slider.js"></script>
 *   <div id="volume"></div>
 *   <script>new Slider('#volume', { value: 40 })</script>
 *
 * Dual thumb:
 *   new Slider('#price', { value: [20, 80], prefix: '$' })
 *
 * Or replace a native input (hidden, kept synced for forms):
 *   new Slider(document.querySelector('input[type=range]'))
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Slider = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-slider-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Slider.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Slider.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the slider; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vsld{--vsld-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsld{' +
      '--vsld-accent:#5b5bd6;' +
      '--vsld-bg:#ffffff;' +
      '--vsld-text:#1c1d21;' +
      '--vsld-muted:#72747e;' +
      '--vsld-faint:#e7e7ec;' +
      '--vsld-shadow:0 1px 4px rgba(24,25,32,.14),0 1px 2px rgba(24,25,32,.08);' +
      '--vsld-radius:8px;' +
      '--vsld-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsld[data-theme=dark]{' +
      '--vsld-accent:#7b7bea;' +
      '--vsld-bg:#1b1d24;' +
      '--vsld-text:#e9eaf0;' +
      '--vsld-muted:#989aa6;' +
      '--vsld-faint:#31343f;' +
      '--vsld-shadow:0 1px 4px rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.35);}' +
    '.vsld.SALT{position:relative;box-sizing:border-box;' +
      'font-family:var(--vsld-font);font-size:13px;color:var(--vsld-text);' +
      'padding:12px 0;-webkit-tap-highlight-color:transparent;}' +
    '.vsld.SALT *,.vsld.SALT *::before,.vsld.SALT *::after{box-sizing:border-box;}' +
    /* room for the value bubble / mark labels when they are always present */
    '.vsld.SALT.vsld-tip-always{padding-top:36px;}' +
    '.vsld.SALT.vsld-has-labels{padding-bottom:26px;}' +
    /* the rail — percent-positioned children, fat invisible hit area */
    '.vsld.SALT .vsld-track{position:relative;height:5px;margin:0 9px;' +
      'border-radius:999px;background:var(--vsld-faint);cursor:pointer;' +
      'touch-action:none;-webkit-user-select:none;user-select:none;}' +
    '.vsld.SALT .vsld-track::before{content:"";position:absolute;' +
      'left:-9px;right:-9px;top:-12px;bottom:-12px;}' +
    '.vsld.SALT .vsld-fill{position:absolute;left:0;top:0;bottom:0;' +
      'border-radius:999px;background:var(--vsld-accent);' +
      'transition:left .1s ease,width .1s ease,bottom .1s ease,height .1s ease;}' +
    /* thumbs — centered on their percent via negative margins so transform
       stays free for the press scale */
    '.vsld.SALT .vsld-thumb{position:absolute;top:50%;left:0;width:18px;height:18px;' +
      'margin:-9px 0 0 -9px;border-radius:50%;background:var(--vsld-bg);' +
      'border:2px solid var(--vsld-accent);box-shadow:var(--vsld-shadow);' +
      'cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;' +
      'transition:left .1s ease,bottom .1s ease,transform .12s ease,box-shadow .12s ease;}' +
    '.vsld.SALT .vsld-thumb.vsld-active{cursor:grabbing;transform:scale(1.15);}' +
    '.vsld.SALT .vsld-thumb:focus{outline:none;}' +
    '.vsld.SALT .vsld-thumb:focus-visible{outline:2px solid var(--vsld-accent);' +
      'outline-offset:2px;}' +
    '.vsld.SALT.vsld-dragging .vsld-thumb,.vsld.SALT.vsld-dragging .vsld-fill{' +
      'transition:none;}' +
    /* step / labeled marks — a zero-size anchor point; the dot rides a
       ::before so its opacity never dims the label */
    '.vsld.SALT .vsld-mark{position:absolute;top:50%;left:0;width:0;height:0;' +
      'pointer-events:none;}' +
    '.vsld.SALT .vsld-mark::before{content:"";position:absolute;' +
      'left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:50%;' +
      'background:var(--vsld-muted);opacity:.55;}' +
    '.vsld.SALT .vsld-mark-label{position:absolute;top:10px;left:0;' +
      'transform:translateX(-50%);font-size:12px;line-height:1.2;' +
      'color:var(--vsld-muted);white-space:nowrap;}' +
    /* the value bubble above the thumb (beside it when vertical) */
    '.vsld.SALT .vsld-tip{position:absolute;left:50%;bottom:100%;' +
      'transform:translate(-50%,-7px);background:var(--vsld-text);' +
      'color:var(--vsld-bg);font-size:12px;font-weight:600;line-height:1;' +
      'padding:5px 8px;border-radius:var(--vsld-radius);white-space:nowrap;' +
      'pointer-events:none;opacity:0;transition:opacity .12s ease;}' +
    '.vsld.SALT .vsld-tip::after{content:"";position:absolute;top:100%;left:50%;' +
      'margin-left:-4px;border:4px solid transparent;' +
      'border-top-color:var(--vsld-text);}' +
    '.vsld.SALT .vsld-thumb.vsld-active .vsld-tip,' +
    '.vsld.SALT .vsld-thumb:focus-visible .vsld-tip,' +
    '.vsld.SALT.vsld-tip-always .vsld-tip{opacity:1;}' +
    /* vertical — rail runs bottom → top, bubble rides the right side */
    '.vsld.SALT.vsld-vertical{display:inline-block;height:200px;width:42px;' +
      'padding:0;vertical-align:top;}' +
    '.vsld.SALT.vsld-vertical .vsld-track{width:5px;height:calc(100% - 18px);' +
      'margin:9px auto;}' +
    '.vsld.SALT.vsld-vertical .vsld-fill{left:0;right:0;top:auto;}' +
    '.vsld.SALT.vsld-vertical .vsld-thumb{top:auto;left:50%;bottom:0;' +
      'margin:0 0 -9px -9px;}' +
    '.vsld.SALT.vsld-vertical .vsld-mark{top:auto;left:50%;}' +
    '.vsld.SALT.vsld-vertical .vsld-mark-label{top:0;left:12px;' +
      'transform:translateY(-50%);}' +
    '.vsld.SALT.vsld-vertical .vsld-tip{left:100%;bottom:50%;' +
      'transform:translate(9px,50%);}' +
    '.vsld.SALT.vsld-vertical .vsld-tip::after{top:50%;left:auto;right:100%;' +
      'margin:-4px 0 0;border-color:transparent;' +
      'border-right-color:var(--vsld-text);}' +
    /* disabled */
    '.vsld.SALT.vsld-disabled{opacity:.5;}' +
    '.vsld.SALT.vsld-disabled .vsld-track,' +
    '.vsld.SALT.vsld-disabled .vsld-thumb{cursor:not-allowed;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsld.SALT .vsld-thumb,.vsld.SALT .vsld-fill,.vsld.SALT .vsld-tip{' +
        'transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/slider.css), or set Slider.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Slider.salt;
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
    // Insert before the page's own CSS so `.vsld { --vsld-* }` overrides win the cascade.
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

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function decimals(n) {
    var s = String(n), i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }

  function roundTo(v, dec) {
    var p = Math.pow(10, dec);
    return Math.round(v * p) / p;
  }

  // Dispatch a plain DOM event ('input'/'change') on a synced form control.
  function fireNative(input, type) {
    var ev;
    try {
      ev = new Event(type, { bubbles: true });
    } catch (err) {
      ev = document.createEvent('HTMLEvents');
      ev.initEvent(type, true, false);
    }
    input.dispatchEvent(ev);
  }

  // Normalize IE/legacy key names to the modern ones we switch on.
  function keyName(e) {
    var k = e.key;
    if (k === 'Left') return 'ArrowLeft';
    if (k === 'Right') return 'ArrowRight';
    if (k === 'Up') return 'ArrowUp';
    if (k === 'Down') return 'ArrowDown';
    return k;
  }

  var DEFAULTS = {
    min: 0,
    max: 100,
    step: 1,
    value: null,        // number = single thumb; [a, b] = dual; null → min
    marks: false,       // true = one per step (when ≤ 20 steps) | {value: 'label'}
    tooltip: 'drag',    // 'drag' (while dragging/focused) | 'always' | false
    format: null,       // fn(value) → string, used in tooltip + aria-valuetext
    prefix: '',         // shorthand when no `format` given: prefix + v + suffix
    suffix: '',
    vertical: false,    // bottom → top rail; ArrowUp still increases
    disabled: false,
    name: null,         // hidden input(s): '<name>' single, '<name>[]' dual
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vsld-* yourself
    onInput: null,      // fn(value, slider) — every move
    onChange: null,     // fn(value, slider) — on release / commit
    labels: { value: 'Value', min: 'Minimum value', max: 'Maximum value' }
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    track: null,
    thumbs: [],
    values: [],
    getValue: function () { return null; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Slider.
   * ------------------------------------------------------------------ */

  function Slider(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Slider: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.opts = assignOptions({}, DEFAULTS, options);
    this.opts.labels = assignOptions({}, DEFAULTS.labels, options.labels || {});
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._built = [];   // elements we created — removed on destroy
    this._hiddens = []; // hidden form inputs we own
    this._active = -1;  // thumb index during a drag
    this._target = el;

    // Replace mode: an <input> target is hidden and kept synced for forms;
    // its min/max/step/value/disabled attributes seed any omitted options.
    if (el.tagName === 'INPUT') {
      this.input = el;
      this._adoptInput(options);
      this.el = document.createElement('div');
      if (el.parentNode) el.parentNode.insertBefore(this.el, el.nextSibling);
      this._built.push(this.el);
      this._record(el, 'hidden');
      this._record(el, 'disabled');
      el.setAttribute('hidden', '');
    } else {
      this.input = null;
      this.el = el;
    }

    this._normalize();
    if (this.opts.styles !== false) injectStyles();

    this._wire();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) {
      instances.set(el, this);
      if (this.el !== el) instances.set(this.el, this);
    }

    this._paint();
    this._syncInputs();
    this._syncAria();
    if (this.opts.disabled) this.disable();
  }

  Slider.prototype = {
    constructor: Slider,

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
      if (el.classList.contains(cls)) return;
      el.classList.add(cls);
      this._classes.push([el, cls]);
    },

    /* ---------------- option normalization ---------------- */

    // Seed omitted options from the replaced input's own attributes.
    _adoptInput: function (options) {
      var input = this.input, o = this.opts;
      if (options.min === undefined && input.getAttribute('min') != null) {
        o.min = parseFloat(input.getAttribute('min'));
      }
      if (options.max === undefined && input.getAttribute('max') != null) {
        o.max = parseFloat(input.getAttribute('max'));
      }
      if (options.step === undefined && input.getAttribute('step') != null) {
        o.step = parseFloat(input.getAttribute('step'));
      }
      if (options.disabled === undefined && input.disabled) o.disabled = true;
      if (options.value === undefined && input.value !== '') {
        o.value = input.value.indexOf(',') !== -1
          ? [parseFloat(input.value.split(',')[0]), parseFloat(input.value.split(',')[1])]
          : parseFloat(input.value);
      }
    },

    _normalize: function () {
      var o = this.opts;
      o.min = isFinite(+o.min) ? +o.min : 0;
      o.max = isFinite(+o.max) ? +o.max : 100;
      if (o.max < o.min) { var t = o.min; o.min = o.max; o.max = t; }
      o.step = +o.step;
      if (!(o.step > 0)) o.step = 1;
      // Enough decimals to represent any snapped value exactly.
      this._dec = Math.max(decimals(o.step), decimals(o.min));

      var v = o.value;
      this.dual = isArray(v);
      if (this.dual) {
        var a = isFinite(+v[0]) ? +v[0] : o.min;
        var b = isFinite(+v[1]) ? +v[1] : o.max;
        if (a > b) { var s = a; a = b; b = s; }
        this.values = [this._snap(a), this._snap(b)];
        if (this.values[0] > this.values[1]) this.values[1] = this.values[0];
      } else {
        this.values = [this._snap(v == null || !isFinite(+v) ? o.min : +v)];
      }

      this._format = typeof o.format === 'function' ? o.format : null;
    },

    // Snap to the step grid (anchored at min), then clamp to [min, max].
    _snap: function (v) {
      var o = this.opts;
      v = o.min + Math.round((v - o.min) / o.step) * o.step;
      v = roundTo(v, this._dec);
      return Math.min(o.max, Math.max(o.min, v));
    },

    _pct: function (v) {
      var o = this.opts, span = o.max - o.min;
      var p = span > 0 ? (v - o.min) / span * 100 : 0;
      return Math.round(p * 10000) / 10000;
    },

    _fmt: function (v) {
      if (this._format) return String(this._format(v));
      return this.opts.prefix + v + this.opts.suffix;
    },

    /* ---------------- setup ---------------- */

    _wire: function () {
      var o = this.opts, s = saltToken(), i;
      this._addClass(this.el, 'vsld');
      if (s) this._addClass(this.el, s);
      if (o.vertical) this._addClass(this.el, 'vsld-vertical');
      if (o.tooltip === 'always') this._addClass(this.el, 'vsld-tip-always');

      this.track = document.createElement('div');
      this.track.className = 'vsld-track';

      this.fill = document.createElement('div');
      this.fill.className = 'vsld-fill';
      this.track.appendChild(this.fill);

      this._buildMarks();

      this.thumbs = [];
      this.tips = [];
      for (i = 0; i < this.values.length; i++) this._buildThumb(i);

      this.el.appendChild(this.track);
      if (this.el === this._target) this._built.push(this.track);

      // Hidden input(s) for plain form posts when we didn't replace one:
      // '<name>' for a single value, '<name>[]' twice for a range.
      if (!this.input && o.name) {
        var n = this.dual
          ? (/\[\]$/.test(o.name) ? o.name : o.name + '[]')
          : o.name;
        for (i = 0; i < this.values.length; i++) {
          var hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = n;
          this.el.appendChild(hidden);
          if (this.el === this._target) this._built.push(hidden);
          this._hiddens.push(hidden);
        }
      }
    },

    _buildThumb: function (i) {
      var o = this.opts;
      var th = document.createElement('div');
      th.className = 'vsld-thumb';
      th.setAttribute('role', 'slider');
      th.setAttribute('tabindex', '0');
      th.setAttribute('aria-label', this.dual
        ? (i === 0 ? o.labels.min : o.labels.max)
        : o.labels.value);
      if (o.vertical) th.setAttribute('aria-orientation', 'vertical');
      if (o.tooltip !== false && o.tooltip !== 'false') {
        var tip = document.createElement('div');
        tip.className = 'vsld-tip';
        tip.setAttribute('aria-hidden', 'true');
        th.appendChild(tip);
        this.tips[i] = tip;
      }
      this.track.appendChild(th);
      this.thumbs[i] = th;
    },

    // marks: true → a tick per step when the grid stays readable (≤ 20
    // steps); object → {value: label} ticks with text below/beside the rail.
    _buildMarks: function () {
      var o = this.opts, marks = o.marks, list = [], i, v;
      if (!marks) return;
      if (marks === true) {
        var n = (o.max - o.min) / o.step;
        if (n < 1 || n > 20) return;
        for (i = 0; i <= Math.floor(n + 1e-9); i++) {
          list.push({ value: roundTo(o.min + i * o.step, this._dec), label: null });
        }
      } else if (typeof marks === 'object') {
        for (var key in marks) {
          v = parseFloat(key);
          if (isFinite(v) && v >= o.min && v <= o.max) {
            list.push({ value: v, label: marks[key] });
          }
        }
      }
      var hasLabels = false;
      for (i = 0; i < list.length; i++) {
        var mark = document.createElement('span');
        mark.className = 'vsld-mark';
        mark.style[o.vertical ? 'bottom' : 'left'] = this._pct(list[i].value) + '%';
        if (list[i].label != null) {
          hasLabels = true;
          var label = document.createElement('span');
          label.className = 'vsld-mark-label';
          label.textContent = String(list[i].label);
          mark.appendChild(label);
        }
        this.track.appendChild(mark);
      }
      if (hasLabels && !o.vertical) this._addClass(this.el, 'vsld-has-labels');
    },

    _bind: function () {
      var self = this, i;
      this._onDown = function (e) { self._pointerDown(e); };
      this._onMove = function (e) { self._pointerMove(e); };
      this._onUp = function (e) { self._pointerUp(e); };

      if (window.PointerEvent) {
        this.track.addEventListener('pointerdown', this._onDown);
      } else {
        // Legacy fallback — same handlers, document-level move/up.
        this.track.addEventListener('mousedown', this._onDown);
        this.track.addEventListener('touchstart', this._onDown);
      }

      for (i = 0; i < this.thumbs.length; i++) {
        (function (idx) {
          self.thumbs[idx].addEventListener('keydown', function (e) {
            self._handleKeydown(e, idx);
          });
        })(i);
      }
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- pointer interaction ---------------- */

    _point: function (e) {
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e.changedTouches && e.changedTouches.length) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    },

    _valueFromPoint: function (pt) {
      var o = this.opts, r = this.track.getBoundingClientRect(), ratio;
      if (o.vertical) ratio = r.height ? (r.bottom - pt.y) / r.height : 0;
      else ratio = r.width ? (pt.x - r.left) / r.width : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      return o.min + ratio * (o.max - o.min);
    },

    // The thumb a press should drive: a directly-hit thumb wins; otherwise
    // the one whose value is nearest (ties break outward so overlapping
    // thumbs can still be pulled apart).
    _thumbFor: function (v, target) {
      for (var i = 0; i < this.thumbs.length; i++) {
        if (this.thumbs[i] === target || this.thumbs[i].contains(target)) return i;
      }
      if (!this.dual) return 0;
      var d0 = Math.abs(v - this.values[0]);
      var d1 = Math.abs(v - this.values[1]);
      if (d0 < d1) return 0;
      if (d1 < d0) return 1;
      return v < this.values[0] ? 0 : 1;
    },

    _pointerDown: function (e) {
      if (this._disabled || this._active !== -1) return;
      if (e.type !== 'touchstart' && e.button != null && e.button !== 0) return;
      var pt = this._point(e);
      var v = this._valueFromPoint(pt);
      var onThumb = false, i;
      for (i = 0; i < this.thumbs.length; i++) {
        if (this.thumbs[i] === e.target || this.thumbs[i].contains(e.target)) onThumb = true;
      }
      i = this._thumbFor(v, e.target);
      this._active = i;
      this._startValues = this.values.slice();
      this.el.classList.add('vsld-dragging');
      this.thumbs[i].classList.add('vsld-active');
      try { this.thumbs[i].focus(); } catch (err) {}

      // Track press: the NEAREST thumb jumps to the pointer, then drags.
      if (!onThumb) this._setThumb(i, v, true);

      if (e.type === 'pointerdown') {
        if (this.track.setPointerCapture) {
          try { this.track.setPointerCapture(e.pointerId); } catch (err) {}
        }
        this.track.addEventListener('pointermove', this._onMove);
        this.track.addEventListener('pointerup', this._onUp);
        this.track.addEventListener('pointercancel', this._onUp);
      } else if (e.type === 'touchstart') {
        document.addEventListener('touchmove', this._onMove);
        document.addEventListener('touchend', this._onUp);
        document.addEventListener('touchcancel', this._onUp);
      } else {
        document.addEventListener('mousemove', this._onMove);
        document.addEventListener('mouseup', this._onUp);
      }
      e.preventDefault(); // no text selection / page scroll from a drag
    },

    _pointerMove: function (e) {
      if (this._active === -1) return;
      this._setThumb(this._active, this._valueFromPoint(this._point(e)), true);
      if (e.type === 'touchmove') e.preventDefault();
    },

    _pointerUp: function (e) {
      if (this._active === -1) return;
      var i = this._active;
      this._active = -1;
      this.el.classList.remove('vsld-dragging');
      this.thumbs[i].classList.remove('vsld-active');
      if (e && e.type === 'pointerup' && this.track.releasePointerCapture) {
        try { this.track.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      this._unbindDrag();
      // Commit: onChange only when the release leaves a different value.
      var start = this._startValues || [];
      for (var j = 0; j < this.values.length; j++) {
        if (this.values[j] !== start[j]) { this._fireChange(); break; }
      }
    },

    _unbindDrag: function () {
      this.track.removeEventListener('pointermove', this._onMove);
      this.track.removeEventListener('pointerup', this._onUp);
      this.track.removeEventListener('pointercancel', this._onUp);
      document.removeEventListener('mousemove', this._onMove);
      document.removeEventListener('mouseup', this._onUp);
      document.removeEventListener('touchmove', this._onMove);
      document.removeEventListener('touchend', this._onUp);
      document.removeEventListener('touchcancel', this._onUp);
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e, i) {
      if (this._disabled || e.altKey || e.ctrlKey || e.metaKey) return;
      var o = this.opts, v = this.values[i], next = null;
      switch (keyName(e)) {
        case 'ArrowLeft': case 'ArrowDown': next = v - o.step; break;
        case 'ArrowRight': case 'ArrowUp': next = v + o.step; break;
        case 'PageUp': next = v + o.step * 10; break;
        case 'PageDown': next = v - o.step * 10; break;
        case 'Home': next = o.min; break;
        case 'End': next = o.max; break;
        default: return;
      }
      e.preventDefault();
      // A key press is both a move and a commit.
      if (this._setThumb(i, next, true)) this._fireChange();
    },

    /* ---------------- state ---------------- */

    // Snap + clamp at the sibling thumb (thumbs cannot cross), then paint
    // and (optionally) announce. Returns whether the value changed.
    _setThumb: function (i, v, fire) {
      v = this._snap(v);
      if (this.dual) {
        if (i === 0 && v > this.values[1]) v = this.values[1];
        if (i === 1 && v < this.values[0]) v = this.values[0];
      }
      if (v === this.values[i]) return false;
      this.values[i] = v;
      this._paint();
      this._syncInputs();
      this._syncAria();
      if (fire) this._fireInput();
      return true;
    },

    _paint: function () {
      var o = this.opts, pos = o.vertical ? 'bottom' : 'left', i;
      var lo = this._pct(this.dual ? this.values[0] : o.min);
      var hi = this._pct(this.values[this.values.length - 1]);
      for (i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].style[pos] = this._pct(this.values[i]) + '%';
        if (this.tips[i]) this.tips[i].textContent = this._fmt(this.values[i]);
      }
      this.fill.style[pos] = lo + '%';
      this.fill.style[o.vertical ? 'height' : 'width'] = (hi - lo) + '%';
    },

    _syncInputs: function () {
      var i;
      if (this.input) {
        this.input.value = this.dual ? this.values.join(',') : String(this.values[0]);
      }
      for (i = 0; i < this._hiddens.length; i++) {
        this._hiddens[i].value = String(this.values[i]);
      }
    },

    _syncAria: function () {
      var o = this.opts;
      for (var i = 0; i < this.thumbs.length; i++) {
        var th = this.thumbs[i];
        // Dual thumbs advertise the sibling as their live limit (APG pattern).
        var lo = this.dual && i === 1 ? this.values[0] : o.min;
        var hi = this.dual && i === 0 ? this.values[1] : o.max;
        th.setAttribute('aria-valuemin', String(lo));
        th.setAttribute('aria-valuemax', String(hi));
        th.setAttribute('aria-valuenow', String(this.values[i]));
        th.setAttribute('aria-valuetext', this._fmt(this.values[i]));
      }
    },

    _fireInput: function () {
      if (this.input) fireNative(this.input, 'input');
      if (this.opts.onInput) this.opts.onInput(this.getValue(), this);
      this.el.dispatchEvent(new CustomEvent('slider:input', {
        bubbles: true,
        detail: { value: this.getValue(), slider: this }
      }));
    },

    _fireChange: function () {
      if (this.input) fireNative(this.input, 'change');
      if (this.opts.onChange) this.opts.onChange(this.getValue(), this);
      this.el.dispatchEvent(new CustomEvent('slider:change', {
        bubbles: true,
        detail: { value: this.getValue(), slider: this }
      }));
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.dual ? this.values.slice() : this.values[0];
    },

    setValue: function (v, opts) {
      var changed = false, a, b;
      if (this.dual) {
        if (!isArray(v)) v = [v, v];
        a = this._snap(+v[0]);
        b = this._snap(+v[1]);
        if (a > b) { var t = a; a = b; b = t; }
        changed = a !== this.values[0] || b !== this.values[1];
        this.values[0] = a;
        this.values[1] = b;
      } else {
        a = this._snap(isArray(v) ? +v[0] : +v);
        changed = a !== this.values[0];
        this.values[0] = a;
      }
      this._paint();
      this._syncInputs();
      this._syncAria();
      if (changed && !(opts && opts.silent)) {
        this._fireInput();
        this._fireChange();
      }
      return this;
    },

    enable: function () {
      this._disabled = false;
      this.el.classList.remove('vsld-disabled');
      for (var i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].setAttribute('tabindex', '0');
        this.thumbs[i].removeAttribute('aria-disabled');
      }
      this._syncDisabledInputs(false);
      return this;
    },

    disable: function () {
      this._disabled = true;
      if (this._active !== -1) this._pointerUp(null);
      this._addClass(this.el, 'vsld-disabled');
      for (var i = 0; i < this.thumbs.length; i++) {
        this.thumbs[i].setAttribute('tabindex', '-1');
        this.thumbs[i].setAttribute('aria-disabled', 'true');
      }
      this._syncDisabledInputs(true);
      return this;
    },

    // Disabled sliders should not submit — mirror onto the form control(s),
    // exactly like a disabled native <input type=range>.
    _syncDisabledInputs: function (disabled) {
      var all = this._hiddens.concat(this.input ? [this.input] : []);
      for (var i = 0; i < all.length; i++) {
        if (disabled) all[i].setAttribute('disabled', '');
        else all[i].removeAttribute('disabled');
      }
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      if (this._active !== -1) {
        this._active = -1;
        this.el.classList.remove('vsld-dragging');
      }
      this._unbindDrag();
      this.track.removeEventListener('pointerdown', this._onDown);
      this.track.removeEventListener('mousedown', this._onDown);
      this.track.removeEventListener('touchstart', this._onDown);
      var i;
      for (i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      // Put back every attribute we touched (un-hides a replaced input),
      // then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      if (instances) {
        instances.delete(this._target);
        instances.delete(this.el);
      }
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Slider.version = VERSION;
  Slider.defaults = DEFAULTS;

  Slider.create = function (target, options) {
    return new Slider(target, options);
  };

  Slider.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.min != null && d.min !== '') o.min = +d.min;
    if (d.max != null && d.max !== '') o.max = +d.max;
    if (d.step != null && d.step !== '') o.step = +d.step;
    if (d.value != null && d.value !== '') {
      o.value = d.value.indexOf(',') !== -1
        ? [+d.value.split(',')[0], +d.value.split(',')[1]]
        : +d.value;
    }
    if (d.tooltip != null) {
      o.tooltip = (d.tooltip === 'false' || d.tooltip === '0') ? false : d.tooltip;
    }
    if (d.marks != null) {
      if (d.marks === '' || d.marks === 'true') o.marks = true;
      else {
        try { o.marks = JSON.parse(d.marks); } catch (err) { o.marks = true; }
      }
    }
    if (d.vertical != null) o.vertical = parseBool(d.vertical);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    if (d.prefix) o.prefix = d.prefix;
    if (d.suffix) o.suffix = d.suffix;
    if (d.name) o.name = d.name;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Slider.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsld]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Slider(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Slider auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Slider.autoInit(); });
    } else {
      Slider.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Slider.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Slider, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Slider.css = renderCss();
  }
  Slider.displayName = 'Slider';
  Slider.rootClass = 'vsld';
  Slider.themeVars = {
    accent: '--vsld-accent',
    radius: '--vsld-radius',
    font: '--vsld-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Slider.varScopes = ['.vsld', '.vsld[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('slider', Slider);
  }

  return Slider;
});

/* ==== number/number.js ==== */
/*!
 * Vanilla UI Kit NumberInput v1.0.0
 * A single-file, zero-dependency formatted numeric/currency input for
 * vanilla JS. Thousands grouping while you type (caret preserved), commit
 * on blur/Enter with clamp + precision rounding, prefix/suffix adornments,
 * hold-to-repeat steppers. Part of the Vanilla UI Kit family — standalone,
 * or converges with the VC core when it is present.
 *
 * Quick start:
 *   <script src="number.js"></script>
 *   <input id="price" value="1234.5">
 *   <script>new NumberInput('#price', { prefix: '$', precision: 2 })</script>
 *
 * Or zero-JS:
 *   <input data-vnum data-prefix="$" data-precision="2">
 *
 * Headless:
 *   NumberInput.defaults.styles = false  // no CSS injected; style .vnum-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NumberInput = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-number-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `NumberInput.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when NumberInput.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vnum{--vnum-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vnum{' +
      '--vnum-accent:#5b5bd6;' +
      '--vnum-bg:#ffffff;' +
      '--vnum-text:#1c1d21;' +
      '--vnum-muted:#72747e;' +
      '--vnum-faint:#e7e7ec;' +
      '--vnum-danger:#e5484d;' +
      '--vnum-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vnum-radius:10px;' +
      '--vnum-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vnum[data-theme=dark]{' +
      '--vnum-accent:#7b7bea;' +
      '--vnum-bg:#1b1d24;' +
      '--vnum-text:#e9eaf0;' +
      '--vnum-muted:#989aa6;' +
      '--vnum-faint:#31343f;' +
      '--vnum-danger:#f2555a;' +
      '--vnum-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    /* field — consistent with the phone/datepicker input look */
    '.vnum.SALT{display:inline-flex;align-items:stretch;position:relative;box-sizing:border-box;' +
      'min-width:150px;background:var(--vnum-bg);color:var(--vnum-text);' +
      'font-family:var(--vnum-font);font-size:14px;line-height:1.3;' +
      'border:1px solid var(--vnum-faint);border-radius:var(--vnum-radius);' +
      'transition:border-color .12s ease,box-shadow .12s ease;}' +
    '.vnum.SALT *,.vnum.SALT *::before,.vnum.SALT *::after{box-sizing:border-box;}' +
    '.vnum.SALT:focus-within{border-color:var(--vnum-accent);box-shadow:0 0 0 3px rgba(91,91,214,.16);}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){' +
      '.vnum.SALT:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--vnum-accent) 18%,transparent);}}' +
    /* live out-of-range warning while typing (commit clamps it away) */
    '.vnum.SALT.vnum-invalid{border-color:var(--vnum-danger);}' +
    '.vnum.SALT.vnum-invalid:focus-within{box-shadow:0 0 0 3px rgba(229,72,77,.16);}' +
    '.vnum.SALT.vnum-disabled{opacity:.55;pointer-events:none;}' +
    /* non-editable adornments */
    '.vnum.SALT .vnum-affix{display:flex;align-items:center;flex:none;color:var(--vnum-muted);' +
      'white-space:pre;-webkit-user-select:none;user-select:none;}' +
    '.vnum.SALT .vnum-prefix{padding-left:10px;}' +
    '.vnum.SALT .vnum-suffix{padding-right:10px;}' +
    /* the text input itself — right-aligned, tabular digits */
    '.vnum.SALT .vnum-input{flex:1;min-width:0;width:100%;font:inherit;color:inherit;' +
      'background:none;border:0;padding:9px 10px;text-align:right;' +
      'font-variant-numeric:tabular-nums;border-radius:var(--vnum-radius);}' +
    '.vnum.SALT .vnum-input:focus{outline:none;}' +
    '.vnum.SALT .vnum-input::placeholder{color:var(--vnum-muted);opacity:.75;}' +
    /* stepper column */
    '.vnum.SALT .vnum-steps{display:flex;flex-direction:column;flex:none;align-self:stretch;' +
      'border-left:1px solid var(--vnum-faint);overflow:hidden;' +
      'border-radius:0 var(--vnum-radius) var(--vnum-radius) 0;}' +
    '.vnum.SALT .vnum-btn{flex:1 1 50%;display:grid;place-items:center;width:26px;min-height:0;' +
      'font:inherit;color:var(--vnum-muted);background:none;border:0;padding:0;margin:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;touch-action:none;}' +
    '.vnum.SALT .vnum-btn:hover{background:var(--vnum-faint);color:var(--vnum-text);}' +
    '.vnum.SALT .vnum-btn:active{color:var(--vnum-accent);}' +
    '.vnum.SALT .vnum-btn svg{display:block;}' +
    '.vnum.SALT .vnum-down{border-top:1px solid var(--vnum-faint);}' +
    '.vnum.SALT .vnum-btn:focus{outline:none;}' +
    '.vnum.SALT .vnum-btn:focus-visible{outline:2px solid var(--vnum-accent);outline-offset:-2px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vnum.SALT,.vnum.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set NumberInput.salt to your own token / false
  // BEFORE the first input is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = NumberInput.salt;
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
    // Insert before the page's own CSS so `.vnum { --vnum-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICON_UP = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
    '<path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_DOWN = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
    '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var autoThemed = [];

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
    if (core) {
      core.theme.unwatch(refreshAutoThemes);
      return;
    }
    if (ownMql) {
      if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
      else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
    }
    if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Numeric core — pure, Node-safe. These power both the statics
   * (NumberInput.parse/format) and the live instance.
   * ------------------------------------------------------------------ */

  function numOrNull(v) {
    return (v == null || v === '' || isNaN(+v)) ? null : +v;
  }

  // Decimal places of a number, exponent-safe ('5e-7' → 7).
  function decimalsOf(n) {
    var s = String(n), e = s.indexOf('e');
    if (e !== -1) {
      var m = /(?:\.(\d+))?e([+-]?\d+)$/.exec(s);
      return m ? Math.max(0, (m[1] ? m[1].length : 0) - (+m[2])) : 0;
    }
    var d = s.indexOf('.');
    return d === -1 ? 0 : s.length - d - 1;
  }

  // Normalize the formatting-relevant options once; idempotent.
  //   precision: explicit → inferred from step's decimals → null (natural).
  //   decimal:   '.' (default) or ',' — nothing else.
  //   thousands: ','(default) | '.' | ' ' | false; silently swapped to the
  //              other separator when it would collide with `decimal`.
  function normOpts(opts) {
    opts = opts || {};
    var o = {};
    o.min = numOrNull(opts.min);
    o.max = numOrNull(opts.max);
    if (o.min != null && o.max != null && o.min > o.max) {
      var t = o.min; o.min = o.max; o.max = t;
    }
    var st = numOrNull(opts.step);
    o.step = (st != null && st > 0) ? st : (opts.step != null ? 1 : null);
    if (opts.precision != null && !isNaN(+opts.precision)) {
      o.precision = Math.max(0, Math.min(20, Math.floor(+opts.precision)));
    } else {
      o.precision = o.step != null ? Math.min(20, decimalsOf(o.step)) : null;
    }
    o.decimal = opts.decimal === ',' ? ',' : '.';
    var th = opts.thousands;
    if (th === false || th === '') o.thousands = '';
    else if (th == null) o.thousands = ',';
    else o.thousands = String(th).charAt(0);
    if (o.thousands === o.decimal) o.thousands = o.decimal === '.' ? ',' : '.';
    o.prefix = opts.prefix == null ? '' : String(opts.prefix);
    o.suffix = opts.suffix == null ? '' : String(opts.suffix);
    o.allowNegative = opts.allowNegative !== false;
    // A floor at/above zero makes the minus sign pointless — block it early.
    if (o.min != null && o.min >= 0) o.allowNegative = false;
    return o;
  }

  function clampVal(v, o) {
    if (o.min != null && v < o.min) v = o.min;
    if (o.max != null && v > o.max) v = o.max;
    return v;
  }

  function roundTo(v, p) {
    return p == null ? v : Number(v.toFixed(p));
  }

  // Lenient extraction: '$ 1,234.50 kg' → 1234.5 (with matching opts) or
  // null when there is no digit at all. Never clamps, never rounds.
  function parseNum(str, o) {
    var s = String(str == null ? '' : str);
    if (o.thousands) s = s.split(o.thousands).join('');
    var out = '', neg = false, seenDec = false, seenDigit = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch >= '0' && ch <= '9') { out += ch; seenDigit = true; }
      else if (ch === o.decimal && !seenDec) { out += '.'; seenDec = true; }
      else if (ch === '-' && o.allowNegative && !seenDigit && !seenDec && !neg) neg = true;
      // anything else ($ € letters spaces stray signs) is ignored
    }
    if (!seenDigit) return null;
    var n = parseFloat(out);
    if (isNaN(n) || !isFinite(n)) return null;
    return neg ? -n : n;
  }

  // Core display text WITHOUT prefix/suffix (the widget renders those as
  // separate adornments). precision null = the number's natural decimals.
  function formatCore(num, o) {
    if (num == null || typeof num !== 'number' || !isFinite(num)) return '';
    var neg = num < 0;
    var abs = Math.abs(num);
    var s = o.precision != null ? abs.toFixed(o.precision) : String(abs);
    if (s.indexOf('e') !== -1 || s.indexOf('E') !== -1) return (neg ? '-' : '') + s;
    var di = s.indexOf('.');
    var int = di === -1 ? s : s.slice(0, di);
    var frac = di === -1 ? '' : s.slice(di + 1);
    if (o.thousands) int = int.replace(/\B(?=(\d{3})+$)/g, o.thousands);
    return (neg ? '-' : '') + int + (frac ? o.decimal + frac : '');
  }

  /* ---- editing-time text plumbing (still pure) ---- */

  // Keep only what could be part of a number: digits, ONE decimal separator,
  // a LEADING minus. Thousands separators and pasted junk ('$', '€', spaces)
  // fall away here — this is the whole paste-sanitizing story.
  function sanitizeText(raw, o) {
    var out = '', seenDec = false;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (ch >= '0' && ch <= '9') out += ch;
      else if (ch === o.decimal && !seenDec) { out += ch; seenDec = true; }
      else if (ch === '-' && o.allowNegative && out === '') out = '-';
    }
    return out;
  }

  // Light editing format: regroup the integer part, leave the fraction and
  // any trailing decimal separator exactly as typed.
  function editText(clean, o) {
    if (!clean) return '';
    var neg = clean.charAt(0) === '-';
    var body = neg ? clean.slice(1) : clean;
    var di = body.indexOf(o.decimal);
    var int = di === -1 ? body : body.slice(0, di);
    var rest = di === -1 ? '' : body.slice(di);
    if (o.thousands && int) int = int.replace(/\B(?=(\d{3})+$)/g, o.thousands);
    return (neg ? '-' : '') + int + rest;
  }

  // Caret math: a char "counts" if it survives sanitizing — digits, the
  // decimal separator, a minus at position 0. Separators never count, so
  // caret positions map cleanly across reformatting.
  function keptChar(s, i, o) {
    var ch = s.charAt(i);
    return (ch >= '0' && ch <= '9') || ch === o.decimal || (i === 0 && ch === '-');
  }

  /* ------------------------------------------------------------------ *
   * Small DOM helpers.
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

  function restoreAttr(el, name, val) {
    if (val == null) el.removeAttribute(name);
    else el.setAttribute(name, val);
  }

  var DEFAULTS = {
    min: null,                // lower clamp bound
    max: null,                // upper clamp bound
    step: 1,                  // arrow/stepper increment
    precision: null,          // decimals; null = inferred from step
    thousands: ',',           // ',' | '.' | ' ' | false
    decimal: '.',             // '.' | ','
    prefix: '',               // non-editable adornment, e.g. '$'
    suffix: '',               // non-editable adornment, e.g. ' kg'
    steppers: true,           // +/− buttons with hold-to-repeat
    allowNegative: true,
    placeholder: null,
    ariaLabel: null,          // accessible name (container mode has no label)
    value: null,              // initial value (container mode)
    name: null,               // hidden input carrying the RAW value (forms)
    disabled: false,
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    styles: true,             // false = headless: no CSS injected
    labels: {
      increment: 'Increase value',
      decrement: 'Decrease value'
    },
    onChange: null,           // fn(value|null) — committed: blur/step/Enter
    onInput: null             // fn(value|null) — live while typing
  };

  // SSR: every public entry point degrades to this inert handle.
  var dummyHandle = {
    el: null, root: null, input: null,
    getValue: function () { return null; },
    setValue: function () { return dummyHandle; },
    stepUp: function () { return dummyHandle; },
    stepDown: function () { return dummyHandle; },
    enable: function () { return dummyHandle; },
    disable: function () { return dummyHandle; },
    focus: function () { return dummyHandle; },
    destroy: function () { return dummyHandle; }
  };

  /* ------------------------------------------------------------------ *
   * NumberInput.
   * ------------------------------------------------------------------ */

  function NumberInput(target, options) {
    if (!HAS_DOM) return dummyHandle;
    var el = resolveElement(target);
    if (!el) throw new Error('NumberInput: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.isInput = el.tagName === 'INPUT';
    this.opts = assignOptions({}, DEFAULTS, options || {});

    // Enhancing a former <input type=number>? Adopt its min/max/step.
    if (this.isInput) {
      if (this.opts.min == null && el.getAttribute('min')) this.opts.min = +el.getAttribute('min');
      if (this.opts.max == null && el.getAttribute('max')) this.opts.max = +el.getAttribute('max');
      if ((!options || options.step === undefined) && el.getAttribute('step') &&
          !isNaN(+el.getAttribute('step'))) {
        this.opts.step = +el.getAttribute('step');
      }
    }
    this._o = normOpts(this.opts);
    this._value = null;
    this._holdTimer = null;

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    // Initial value: pre-filled input text wins, then opts.value.
    var initial = this.isInput && this.input.value !== ''
      ? parseNum(this.input.value, this._o)
      : null;
    if (initial == null && this.opts.value != null) {
      initial = typeof this.opts.value === 'number'
        ? this.opts.value
        : parseNum(this.opts.value, this._o);
    }
    if (initial != null) initial = roundTo(clampVal(initial, this._o), this._o.precision);
    this._setCommitted(initial, true); // silent — no onChange on construction
  }

  NumberInput.prototype = {
    constructor: NumberInput,

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      var opts = this.opts;
      var root = document.createElement('div');
      root.className = 'vnum' + saltClass();

      var input;
      if (this.isInput) {
        // Anchor mode: adopt the given <input>; original attrs are backed up
        // and restored on destroy().
        input = this.el;
        this._backup = {
          className: input.className,
          type: input.getAttribute('type'),
          inputmode: input.getAttribute('inputmode'),
          autocomplete: input.getAttribute('autocomplete'),
          placeholder: input.getAttribute('placeholder'),
          name: input.getAttribute('name')
        };
        this.el.parentNode.insertBefore(root, this.el);
        input.className = (input.className ? input.className + ' ' : '') + 'vnum-input';
      } else {
        // Container mode: build the control inside.
        input = document.createElement('input');
        input.className = 'vnum-input';
        this._backup = null;
      }
      try { if (input.type !== 'text') input.type = 'text'; } catch (err) { /* old IE */ }
      input.setAttribute('inputmode', 'decimal');
      if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
      input.setAttribute('role', 'spinbutton');
      // Accessible name: explicit option wins; an adopted input keeps its own
      // label/aria-label since it IS the original element. Container-mode
      // instances must pass ariaLabel (or be wrapped in a <label>).
      if (opts.ariaLabel) input.setAttribute('aria-label', String(opts.ariaLabel));
      if (opts.placeholder != null && opts.placeholder !== false) {
        input.placeholder = String(opts.placeholder);
      }

      if (this._o.prefix) {
        var pre = document.createElement('span');
        pre.className = 'vnum-affix vnum-prefix';
        pre.setAttribute('aria-hidden', 'true');
        pre.textContent = this._o.prefix;
        root.appendChild(pre);
      }
      root.appendChild(input);
      if (this._o.suffix) {
        var suf = document.createElement('span');
        suf.className = 'vnum-affix vnum-suffix';
        suf.setAttribute('aria-hidden', 'true');
        suf.textContent = this._o.suffix;
        root.appendChild(suf);
      }

      // Steppers: redundant with ArrowUp/Down, so hidden from the a11y tree
      // and out of the tab order — but fully clickable, with hold-to-repeat.
      this._upBtn = this._downBtn = null;
      if (opts.steppers !== false) {
        var steps = document.createElement('span');
        steps.className = 'vnum-steps';
        steps.setAttribute('aria-hidden', 'true');
        this._upBtn = this._makeBtn('vnum-up', ICON_UP, opts.labels.increment);
        this._downBtn = this._makeBtn('vnum-down', ICON_DOWN, opts.labels.decrement);
        steps.appendChild(this._upBtn);
        steps.appendChild(this._downBtn);
        root.appendChild(steps);
      }

      // Hidden raw-value carrier for forms. In anchor mode the visible text
      // is FORMATTED, so a name on the original input migrates here — the
      // form then submits '1234.5', never '1,234.50'.
      var hiddenName = opts.name ||
        (this.isInput && this.el.getAttribute('name')) || null;
      this._hidden = null;
      if (hiddenName) {
        if (this.isInput && this.el.getAttribute('name')) this.el.removeAttribute('name');
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = hiddenName;
        root.appendChild(hidden);
        this._hidden = hidden;
      }

      if (!this.isInput) this.el.appendChild(root);
      this.root = root;
      this.input = input;
      if (opts.disabled) this.disable();
    },

    _makeBtn: function (cls, icon, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vnum-btn ' + cls;
      b.tabIndex = -1;
      b.setAttribute('aria-label', label);
      b.innerHTML = icon;
      return b;
    },

    /* ---------------- events ---------------- */

    _bind: function () {
      var self = this;
      this._fns = {
        input: function () { self._handleInput(); },
        keydown: function (e) { self._handleKeydown(e); },
        blur: function () { self._commit(true); },
        upDown: function (e) { self._startHold(1, e); },
        downDown: function (e) { self._startHold(-1, e); },
        holdEnd: function () { self._endHold(); }
      };
      this.input.addEventListener('input', this._fns.input);
      this.input.addEventListener('keydown', this._fns.keydown);
      this.input.addEventListener('blur', this._fns.blur);
      this._pressEvt = window.PointerEvent ? 'pointerdown' : 'mousedown';
      this._releaseEvt = window.PointerEvent ? 'pointerup' : 'mouseup';
      if (this._upBtn) {
        this._upBtn.addEventListener(this._pressEvt, this._fns.upDown);
        this._downBtn.addEventListener(this._pressEvt, this._fns.downDown);
      }
    },

    /* ---------------- typing / formatting ---------------- */

    // input event (typing AND paste): sanitize → regroup thousands → put the
    // caret back after the same COUNTED character (digits/decimal/minus —
    // separators don't count, so inserting/removing them can't drift it).
    _handleInput: function () {
      var o = this._o, inp = this.input;
      var raw = inp.value, caret = null, i;
      try {
        if (document.activeElement === inp) caret = inp.selectionStart;
      } catch (err) { caret = null; }
      var before = 0;
      if (caret != null) {
        for (i = 0; i < caret && i < raw.length; i++) if (keptChar(raw, i, o)) before++;
      }
      var text = editText(sanitizeText(raw, o), o);
      if (inp.value !== text) {
        inp.value = text;
        if (caret != null) {
          var pos = 0;
          if (before > 0) {
            pos = text.length;
            for (var j = 0, seen = 0; j < text.length; j++) {
              if (keptChar(text, j, o) && ++seen >= before) { pos = j + 1; break; }
            }
          }
          try { inp.setSelectionRange(pos, pos); } catch (err2) { /* detached */ }
        }
      }
      var v = parseNum(text, o);
      // Live out-of-range warning; the commit will clamp it away.
      this.root.classList.toggle('vnum-invalid',
        v != null && ((o.min != null && v < o.min) || (o.max != null && v > o.max)));
      if (this.opts.onInput) this.opts.onInput(v);
    },

    _handleKeydown: function (e) {
      var o = this._o, inp = this.input, key = e.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        this._stepBy((key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
        return;
      }
      if (key === 'Enter') { this._commit(true); return; } // then let forms submit
      if (key === 'Escape') { this._setCommitted(this._value, true); return; } // revert
      // Backspace/Delete against a thousands separator: hop over it so the
      // key eats the DIGIT beyond — otherwise regrouping puts the separator
      // right back and the key appears dead.
      if (o.thousands && (key === 'Backspace' || key === 'Delete')) {
        try {
          var s0 = inp.selectionStart, e0 = inp.selectionEnd;
          if (s0 === e0) {
            if (key === 'Backspace' && s0 > 0 && inp.value.charAt(s0 - 1) === o.thousands) {
              inp.setSelectionRange(s0 - 1, s0 - 1);
            } else if (key === 'Delete' && inp.value.charAt(s0) === o.thousands) {
              inp.setSelectionRange(s0 + 1, s0 + 1);
            }
          }
        } catch (err) { /* ignore */ }
        return;
      }
      // Reject printable keys that could never lead to a valid number.
      if (!key || key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (key >= '0' && key <= '9') return;
      if (key === '.' || key === ',') {
        // Both separator keys mean "decimal point" — insert the configured one.
        e.preventDefault();
        this._insertDecimal();
        return;
      }
      if (key === '-') {
        if (!o.allowNegative) e.preventDefault(); // else the sanitizer places it
        return;
      }
      e.preventDefault();
    },

    _insertDecimal: function () {
      var o = this._o, inp = this.input;
      if (o.precision === 0) return; // integer field — no decimals, ever
      var v = inp.value;
      var s = inp.selectionStart == null ? v.length : inp.selectionStart;
      var e = inp.selectionEnd == null ? s : inp.selectionEnd;
      var next = v.slice(0, s) + o.decimal + v.slice(e);
      if (next.indexOf(o.decimal) !== next.lastIndexOf(o.decimal)) return; // already has one
      inp.value = next;
      try { inp.setSelectionRange(s + 1, s + 1); } catch (err) { /* ignore */ }
      this._handleInput();
    },

    /* ---------------- committing ---------------- */

    // parse → clamp → round → display. Empty input commits to null (not 0).
    _commit: function (fire) {
      var v = parseNum(this.input.value, this._o);
      if (v != null) v = roundTo(clampVal(v, this._o), this._o.precision);
      this._setCommitted(v, !fire);
    },

    _setCommitted: function (v, silent) {
      var changed = v !== this._value;
      this._value = v;
      this.input.value = v == null ? '' : formatCore(v, this._o);
      this.root.classList.remove('vnum-invalid');
      if (this._hidden) this._hidden.value = v == null ? '' : String(v);
      this._syncAria();
      if (changed && !silent && this.opts.onChange) this.opts.onChange(v);
    },

    _syncAria: function () {
      var inp = this.input, o = this._o, v = this._value;
      if (o.min != null) inp.setAttribute('aria-valuemin', String(o.min));
      else inp.removeAttribute('aria-valuemin');
      if (o.max != null) inp.setAttribute('aria-valuemax', String(o.max));
      else inp.removeAttribute('aria-valuemax');
      if (v != null) {
        inp.setAttribute('aria-valuenow', String(v));
        inp.setAttribute('aria-valuetext', o.prefix + formatCore(v, o) + o.suffix);
      } else {
        inp.removeAttribute('aria-valuenow');
        inp.removeAttribute('aria-valuetext');
      }
    },

    /* ---------------- stepping ---------------- */

    // ±step from the committed value (0 when empty); steps COMMIT.
    _stepBy: function (mult) {
      if (this.opts.disabled) return this;
      var o = this._o;
      var base = this._value == null ? 0 : this._value;
      var v = roundTo(clampVal(base + o.step * mult, o), o.precision);
      this._setCommitted(v, false);
      return this;
    },

    // Hold-to-repeat: step once now, wait 500 ms, then every 60 ms;
    // after 2 s of holding each tick jumps ×10.
    _startHold: function (dir, e) {
      if (this.opts.disabled) return;
      if (e && e.preventDefault) e.preventDefault(); // keep focus on the input
      this._endHold();
      try { this.input.focus(); } catch (err) { /* ignore */ }
      this._stepBy(dir);
      var self = this, t0 = Date.now();
      this._holdTimer = setTimeout(function tick() {
        self._stepBy(dir * (Date.now() - t0 > 2000 ? 10 : 1));
        self._holdTimer = setTimeout(tick, 60);
      }, 500);
      window.addEventListener(this._releaseEvt, this._fns.holdEnd);
      if (window.PointerEvent) window.addEventListener('pointercancel', this._fns.holdEnd);
    },

    _endHold: function () {
      if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
      window.removeEventListener(this._releaseEvt, this._fns.holdEnd);
      if (window.PointerEvent) window.removeEventListener('pointercancel', this._fns.holdEnd);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.root.setAttribute('data-theme', resolved);
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this._value;
    },

    // setValue(1234.5) | setValue('1.234,5') | setValue(null) — clamped and
    // rounded like a blur commit. { silent: true } skips onChange.
    setValue: function (v, opts) {
      var n = (v == null || v === '') ? null
        : (typeof v === 'number' ? v : parseNum(v, this._o));
      if (n != null && !isFinite(n)) n = null;
      if (n != null) n = roundTo(clampVal(n, this._o), this._o.precision);
      this._setCommitted(n, !!(opts && opts.silent));
      return this;
    },

    stepUp: function () { return this._stepBy(1); },
    stepDown: function () { return this._stepBy(-1); },

    enable: function () {
      this.opts.disabled = false;
      this.root.classList.remove('vnum-disabled');
      this.input.disabled = false;
      if (this._upBtn) { this._upBtn.disabled = false; this._downBtn.disabled = false; }
      return this;
    },

    disable: function () {
      this.opts.disabled = true;
      this._endHold();
      this.root.classList.add('vnum-disabled');
      this.input.disabled = true;
      if (this._upBtn) { this._upBtn.disabled = true; this._downBtn.disabled = true; }
      return this;
    },

    focus: function () {
      this.input.focus();
      return this;
    },

    destroy: function () {
      this._endHold();
      unwatchAutoTheme(this);
      this.input.removeEventListener('input', this._fns.input);
      this.input.removeEventListener('keydown', this._fns.keydown);
      this.input.removeEventListener('blur', this._fns.blur);
      if (this._upBtn) {
        this._upBtn.removeEventListener(this._pressEvt, this._fns.upDown);
        this._downBtn.removeEventListener(this._pressEvt, this._fns.downDown);
      }
      if (this.isInput) {
        // Give the input back to the page exactly as we found it, carrying
        // the RAW committed value.
        var b = this._backup, inp = this.input;
        inp.className = b.className;
        restoreAttr(inp, 'type', b.type);
        restoreAttr(inp, 'inputmode', b.inputmode);
        restoreAttr(inp, 'autocomplete', b.autocomplete);
        restoreAttr(inp, 'placeholder', b.placeholder);
        restoreAttr(inp, 'name', b.name);
        inp.removeAttribute('role');
        inp.removeAttribute('aria-valuemin');
        inp.removeAttribute('aria-valuemax');
        inp.removeAttribute('aria-valuenow');
        inp.removeAttribute('aria-valuetext');
        inp.disabled = false;
        inp.value = this._value == null ? '' : String(this._value);
        this.root.parentNode.insertBefore(inp, this.root);
      }
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics: pure helpers, auto-init, convergence contract.
   * ------------------------------------------------------------------ */

  NumberInput.version = VERSION;
  NumberInput.defaults = DEFAULTS;

  NumberInput.create = function (target, options) {
    return new NumberInput(target, options);
  };

  NumberInput.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  // Pure helpers — work without a DOM (Node-friendly).
  //   NumberInput.parse('$1,234.50')            → 1234.5
  //   NumberInput.format(1234.5, {precision:2}) → '1,234.50'
  NumberInput.parse = function (str, opts) {
    return parseNum(str, normOpts(opts));
  };

  NumberInput.format = function (num, opts) {
    var o = normOpts(opts);
    if (typeof num === 'string') num = parseNum(num, o);
    var core = formatCore(num, o);
    return core === '' ? '' : o.prefix + core + o.suffix;
  };

  /* ---- auto-init: <input data-vnum data-prefix="$" data-precision="2"> ---- */

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    function num(v) { return (v === '' || isNaN(+v)) ? undefined : +v; }
    if (d.vnum) o.value = num(d.vnum);              // data-vnum="42" shorthand
    if (d.value != null) o.value = num(d.value);
    if (d.min != null) o.min = num(d.min);
    if (d.max != null) o.max = num(d.max);
    if (d.step != null) o.step = num(d.step);
    if (d.precision != null) o.precision = num(d.precision);
    if (d.thousands != null) {
      o.thousands = (d.thousands === 'false' || d.thousands === 'none') ? false
        : (d.thousands === 'space' ? ' ' : d.thousands);
    }
    if (d.decimal) o.decimal = d.decimal;
    if (d.prefix != null) o.prefix = d.prefix;
    if (d.suffix != null) o.suffix = d.suffix;
    if (d.steppers != null) o.steppers = parseBool(d.steppers);
    if (d.allowNegative != null) o.allowNegative = parseBool(d.allowNegative);
    if (d.name) o.name = d.name;
    if (d.placeholder != null) o.placeholder = d.placeholder;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    return o;
  }

  NumberInput.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vnum]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new NumberInput(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('NumberInput auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { NumberInput.autoInit(); });
    } else {
      NumberInput.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  NumberInput.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(NumberInput, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    NumberInput.css = renderCss();
  }
  NumberInput.displayName = 'NumberInput';
  NumberInput.rootClass = 'vnum';
  NumberInput.themeVars = {
    accent: '--vnum-accent',
    radius: '--vnum-radius',
    font: '--vnum-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  NumberInput.varScopes = ['.vnum', '.vnum[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('number', NumberInput);
  }

  return NumberInput;
});

/* ==== pagination/pagination.js ==== */
/*!
 * Vanilla UI Kit Pagination v1.0.0
 * A single-file, zero-dependency pagination control for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="pagination.js"></script>
 *   <div id="pager"></div>
 *   <script>new Pagination('#pager', { total: 97, onChange: p => load(p) })</script>
 *
 * Or zero-JS:
 *   <div data-vpn data-total="97" data-per-page="10"></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Pagination = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-pagination-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Pagination.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Pagination.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the pager; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vpn{--vpn-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vpn{' +
      '--vpn-accent:#5b5bd6;' +
      '--vpn-text:#1c1d21;' +
      '--vpn-muted:#72747e;' +
      '--vpn-faint:#e7e7ec;' +
      '--vpn-bg:#ffffff;' +
      '--vpn-on-accent:#ffffff;' +
      '--vpn-radius:8px;' +
      '--vpn-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vpn[data-theme=dark]{' +
      '--vpn-accent:#7b7bea;' +
      '--vpn-text:#e9eaf0;' +
      '--vpn-muted:#989aa6;' +
      '--vpn-faint:#31343f;' +
      '--vpn-bg:#1b1d24;' +
      '--vpn-on-accent:#16171c;}' +
    '.vpn.SALT{display:flex;align-items:center;flex-wrap:wrap;gap:4px;box-sizing:border-box;' +
      'font-family:var(--vpn-font);font-size:14px;line-height:1.4;color:var(--vpn-text);}' +
    '.vpn.SALT *,.vpn.SALT *::before,.vpn.SALT *::after{box-sizing:border-box;}' +
    '.vpn.SALT .vpn-pages{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px;}' +
    '.vpn.SALT .vpn-btn{font:inherit;font-family:var(--vpn-font);font-size:14px;font-weight:500;' +
      'line-height:1;min-width:32px;height:32px;padding:0 8px;margin:0;' +
      'display:inline-flex;align-items:center;justify-content:center;gap:6px;' +
      'color:var(--vpn-text);background:none;border:0;border-radius:var(--vpn-radius);' +
      'cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums;' +
      'transition:background .12s ease,color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vpn.SALT .vpn-btn:hover{background:var(--vpn-faint);}' +
    '.vpn.SALT .vpn-btn[aria-current=page]{background:var(--vpn-accent);' +
      'color:var(--vpn-on-accent);font-weight:600;cursor:default;}' +
    '.vpn.SALT .vpn-btn[disabled]{color:var(--vpn-muted);opacity:.45;cursor:not-allowed;' +
      'background:none;}' +
    '.vpn.SALT .vpn-btn:focus{outline:none;}' +
    '.vpn.SALT .vpn-btn:focus-visible{outline:2px solid var(--vpn-accent);outline-offset:1px;}' +
    '.vpn.SALT .vpn-prev,.vpn.SALT .vpn-next{color:var(--vpn-muted);padding:0 10px;}' +
    '.vpn.SALT .vpn-prev:hover,.vpn.SALT .vpn-next:hover{color:var(--vpn-text);}' +
    '.vpn.SALT .vpn-gap{min-width:32px;text-align:center;color:var(--vpn-muted);' +
      '-webkit-user-select:none;user-select:none;}' +
    '.vpn.SALT .vpn-status{padding:0 6px;font-variant-numeric:tabular-nums;}' +
    '.vpn.SALT .vpn-total{color:var(--vpn-muted);margin-right:6px;' +
      'font-variant-numeric:tabular-nums;}' +
    '.vpn.SALT .vpn-jump{display:inline-flex;align-items:center;gap:6px;margin-left:6px;' +
      'color:var(--vpn-muted);}' +
    '.vpn.SALT .vpn-jump input{font:inherit;font-family:var(--vpn-font);font-size:14px;' +
      'width:56px;height:32px;padding:0 8px;margin:0;text-align:center;' +
      'color:var(--vpn-text);background:var(--vpn-bg);border:1px solid var(--vpn-faint);' +
      'border-radius:var(--vpn-radius);-moz-appearance:textfield;appearance:textfield;}' +
    '.vpn.SALT .vpn-jump input::-webkit-outer-spin-button,' +
    '.vpn.SALT .vpn-jump input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}' +
    '.vpn.SALT .vpn-jump input:focus{outline:none;border-color:var(--vpn-accent);}' +
    '.vpn.SALT .vpn-jump input:focus-visible{outline:2px solid var(--vpn-accent);' +
      'outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vpn.SALT .vpn-btn{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic), or set Pagination.salt to your own token / false
  // BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Pagination.salt;
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
    // Insert before the page's own CSS so `.vpn { --vpn-* }` overrides win the cascade.
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

  function toInt(v, fallback) {
    v = Math.floor(+v);
    return isFinite(v) ? v : fallback;
  }

  function range(from, to) {
    var out = [];
    for (var i = from; i <= to; i++) out.push(i);
    return out;
  }

  // The ellipsis model: `boundaries` pages pinned at each end, `siblings`
  // pages around the current one, '…' gaps in between. The sibling window
  // is pushed inward near the edges so the item COUNT stays constant while
  // paging (no layout jumps), and a gap is only rendered when it would hide
  // at least one page — a gap standing in for a single page becomes that
  // page instead.
  function pageItems(page, count, siblings, boundaries) {
    siblings = Math.max(0, toInt(siblings, 1));
    boundaries = Math.max(0, toInt(boundaries, 1));

    // Everything fits without hiding anything: 2×boundaries + 2×siblings
    // + current + the two would-be gap slots.
    if (count <= boundaries * 2 + siblings * 2 + 3) return range(1, count);

    var startPages = range(1, Math.min(boundaries, count));
    var endPages = range(Math.max(count - boundaries + 1, boundaries + 1), count);

    var siblingsStart = Math.max(
      Math.min(page - siblings, count - boundaries - siblings * 2 - 1),
      boundaries + 2
    );
    var siblingsEnd = Math.min(
      Math.max(page + siblings, boundaries + siblings * 2 + 2),
      count - boundaries - 1
    );

    return startPages
      .concat(siblingsStart > boundaries + 2 ? ['gap']
        : boundaries + 1 < count - boundaries ? [boundaries + 1] : [])
      .concat(range(siblingsStart, siblingsEnd))
      .concat(siblingsEnd < count - boundaries - 1 ? ['gap']
        : count - boundaries > boundaries ? [count - boundaries] : [])
      .concat(endPages);
  }

  var DEFAULTS = {
    total: null,        // item count (pairs with perPage) …
    perPage: 10,        // … items per page
    pages: null,        // OR the page count directly (takes precedence)
    page: 1,            // initial page (1-based, clamped)
    siblings: 1,        // pages shown on each side of the current one
    boundaries: 1,      // pages pinned at each end
    compact: false,     // just  prev  3 / 12  next
    showTotal: false,   // true = built-in "1–10 of 97" | fn(total, [from, to]) → string
    showJump: false,    // "Go to" number input; Enter jumps, clamped
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vpn-* yourself
    onChange: null,     // fn(page, pagination)
    labels: {
      pagination: 'Pagination',   // aria-label on the <nav>
      prev: 'Prev',               // visible prev text ('' = glyph only)
      next: 'Next',               // visible next text ('' = glyph only)
      prevAria: 'Previous page',
      nextAria: 'Next page',
      page: 'Page',               // aria-label prefix on page buttons
      jump: 'Go to'               // visible jump-field label
    }
  };

  function mergeOptions(options) {
    var out = {}, labels = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    for (k in DEFAULTS.labels) labels[k] = DEFAULTS.labels[k];
    out.labels = labels;
    if (options) {
      for (k in options) {
        if (options[k] === undefined) continue;
        if (k === 'labels') {
          for (var l in options.labels) labels[l] = options.labels[l];
        } else out[k] = options[k];
      }
    }
    return out;
  }

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    nav: null,
    page: 1,
    setPage: function () { return dummyInstance; },
    getPage: function () { return 1; },
    update: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Pagination.
   * ------------------------------------------------------------------ */

  function Pagination(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Pagination: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = mergeOptions(options);
    this.page = 1;

    if (this.opts.styles !== false) injectStyles();

    this._build();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    // Initial page is clamped and never fires onChange.
    this.page = this._clamp(this.opts.page);
    this._render();
  }

  Pagination.prototype = {
    constructor: Pagination,

    /* ---------------- derived state ---------------- */

    _count: function () {
      var o = this.opts;
      if (o.pages != null) return Math.max(1, toInt(o.pages, 1));
      var total = Math.max(0, toInt(o.total, 0));
      var per = Math.max(1, toInt(o.perPage, 1));
      return Math.max(1, Math.ceil(total / per));
    },

    _clamp: function (p) {
      p = toInt(p, 1);
      var count = this._count();
      return p < 1 ? 1 : p > count ? count : p;
    },

    /* ---------------- setup ---------------- */

    _build: function () {
      var self = this;
      var s = saltToken();
      var labels = this.opts.labels;

      var nav = document.createElement('nav');
      nav.className = 'vpn' + (s ? ' ' + s : '');
      nav.setAttribute('aria-label', labels.pagination);
      this.nav = nav;

      // Side text — only meaningful in total/perPage mode.
      this._totalEl = null;
      if (this.opts.showTotal && this.opts.pages == null && this.opts.total != null) {
        this._totalEl = document.createElement('span');
        this._totalEl.className = 'vpn-total';
        nav.appendChild(this._totalEl);
      }

      this._prev = this._navButton('prev', '←', labels.prev, labels.prevAria);
      nav.appendChild(this._prev);

      // Page area: real page buttons, or a plain "3 / 12" readout in compact.
      this._pages = document.createElement('span');
      if (this.opts.compact) {
        this._pages.className = 'vpn-status';
        this._pages.setAttribute('aria-live', 'polite'); // announce page flips
      } else {
        this._pages.className = 'vpn-pages';
      }
      nav.appendChild(this._pages);

      this._next = this._navButton('next', '→', labels.next, labels.nextAria);
      nav.appendChild(this._next);

      this._jump = null;
      if (this.opts.showJump) {
        // <label> wraps the input — implicit labelling, no ids needed.
        var jump = document.createElement('label');
        jump.className = 'vpn-jump';
        jump.appendChild(document.createTextNode(labels.jump));
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        jump.appendChild(input);
        nav.appendChild(jump);
        this._jump = input;
        this._onJumpKeydown = function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault(); // never submit a surrounding form
          var v = parseInt(input.value, 10);
          if (isNaN(v)) return;
          self.setPage(v);    // clamped inside setPage
          input.value = '';
        };
        input.addEventListener('keydown', this._onJumpKeydown);
      }

      this._onPrevClick = function () { self._stepPage(-1); };
      this._onNextClick = function () { self._stepPage(1); };
      this._onPagesClick = function (e) { self._handlePagesClick(e); };
      this._prev.addEventListener('click', this._onPrevClick);
      this._next.addEventListener('click', this._onNextClick);
      this._pages.addEventListener('click', this._onPagesClick);

      this.el.appendChild(nav);
    },

    // Prev/next: glyph is decorative (aria-hidden), the button carries a
    // full aria-label; visible text is optional via labels.prev/next.
    _navButton: function (kind, glyph, text, ariaLabel) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vpn-btn vpn-' + kind;
      btn.setAttribute('aria-label', ariaLabel);
      var g = document.createElement('span');
      g.setAttribute('aria-hidden', 'true');
      g.textContent = glyph;
      if (kind === 'prev') {
        btn.appendChild(g);
        if (text) btn.appendChild(document.createTextNode(String(text)));
      } else {
        if (text) btn.appendChild(document.createTextNode(String(text)));
        btn.appendChild(g);
      }
      return btn;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.nav.setAttribute('data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _stepPage: function (dir) {
      this.setPage(this.page + dir);
      // The button under focus may have just become disabled — keep the
      // keyboard user parked somewhere sensible.
      var btn = dir < 0 ? this._prev : this._next;
      if (btn.disabled) (this._current || (dir < 0 ? this._next : this._prev)).focus();
    },

    _handlePagesClick: function (e) {
      var node = e.target;
      while (node && node !== this._pages) {
        if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-page')) {
          var p = +node.getAttribute('data-page');
          if (p !== this.page) this.setPage(p); // current page is inert
          return;
        }
        node = node.parentNode;
      }
    },

    /* ---------------- rendering ---------------- */

    _render: function () {
      var count = this._count();
      var labels = this.opts.labels;

      this._prev.disabled = this.page <= 1;
      this._next.disabled = this.page >= count;

      if (this.opts.compact) {
        this._pages.textContent = this.page + ' / ' + count;
        this._current = null;
      } else {
        // Rebuild the page strip; if focus was inside it, hand focus to the
        // new current-page button so keyboard flow isn't dropped on <body>.
        var hadFocus = this._pages.contains(document.activeElement);
        this._pages.innerHTML = '';
        var items = pageItems(this.page, count, this.opts.siblings, this.opts.boundaries);
        this._current = null;
        for (var i = 0; i < items.length; i++) {
          if (items[i] === 'gap') {
            var gap = document.createElement('span');
            gap.className = 'vpn-gap';
            gap.setAttribute('aria-hidden', 'true'); // inert separator
            gap.textContent = '…';
            this._pages.appendChild(gap);
          } else {
            var n = items[i];
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vpn-btn';
            btn.setAttribute('data-page', n);
            btn.setAttribute('aria-label', labels.page + ' ' + n);
            btn.textContent = String(n);
            if (n === this.page) {
              btn.setAttribute('aria-current', 'page');
              this._current = btn;
            }
            this._pages.appendChild(btn);
          }
        }
        if (hadFocus && this._current) this._current.focus();
      }

      if (this._totalEl) {
        var total = Math.max(0, toInt(this.opts.total, 0));
        var per = Math.max(1, toInt(this.opts.perPage, 1));
        var from = total === 0 ? 0 : (this.page - 1) * per + 1;
        var to = Math.min(this.page * per, total);
        var fn = this.opts.showTotal;
        this._totalEl.textContent = typeof fn === 'function'
          ? String(fn(total, [from, to]))
          : from + '–' + to + ' of ' + total;
      }

      if (this._jump) this._jump.max = String(count);
    },

    /* ---------------- public API ---------------- */

    getPage: function () {
      return this.page;
    },

    // setPage(5) — clamped to [1, pageCount]; fires onChange (and the
    // 'pagination:change' DOM event) only on an actual move, and never
    // with `{silent: true}`.
    setPage: function (p, o) {
      p = this._clamp(p);
      var prev = this.page;
      this.page = p;
      this._render();
      if (p !== prev && !(o && o.silent)) {
        if (this.opts.onChange) this.opts.onChange(p, this);
        this.el.dispatchEvent(new CustomEvent('pagination:change', {
          bubbles: true,
          detail: { page: p, pagination: this }
        }));
      }
      return this;
    },

    // update({total, perPage, pages}) — swap the data shape in place; the
    // current page is re-clamped silently (no onChange for the clamp).
    update: function (o) {
      o = o || {};
      if (o.total !== undefined) this.opts.total = o.total;
      if (o.perPage !== undefined) this.opts.perPage = o.perPage;
      if (o.pages !== undefined) this.opts.pages = o.pages;
      this.page = this._clamp(this.page);
      this._render();
      return this;
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      this._prev.removeEventListener('click', this._onPrevClick);
      this._next.removeEventListener('click', this._onNextClick);
      this._pages.removeEventListener('click', this._onPagesClick);
      if (this._jump) this._jump.removeEventListener('keydown', this._onJumpKeydown);
      if (this.nav.parentNode) this.nav.parentNode.removeChild(this.nav);
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Pagination.version = VERSION;
  Pagination.defaults = DEFAULTS;

  Pagination.create = function (target, options) {
    return new Pagination(target, options);
  };

  Pagination.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.pages != null && d.pages !== '') o.pages = +d.pages;
    if (d.total != null && d.total !== '') o.total = +d.total;
    if (d.perPage != null && d.perPage !== '') o.perPage = +d.perPage;
    if (d.page != null && d.page !== '') o.page = +d.page;
    if (d.siblings != null && d.siblings !== '') o.siblings = +d.siblings;
    if (d.boundaries != null && d.boundaries !== '') o.boundaries = +d.boundaries;
    if (d.compact != null) o.compact = parseBool(d.compact);
    if (d.showTotal != null) o.showTotal = parseBool(d.showTotal);
    if (d.showJump != null) o.showJump = parseBool(d.showJump);
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Pagination.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vpn]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Pagination(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Pagination auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Pagination.autoInit(); });
    } else {
      Pagination.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Pagination.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Pagination, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Pagination.css = renderCss();
  }
  Pagination.displayName = 'Pagination';
  Pagination.rootClass = 'vpn';
  Pagination.themeVars = {
    accent: '--vpn-accent',
    radius: '--vpn-radius',
    font: '--vpn-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Pagination.varScopes = ['.vpn', '.vpn[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('pagination', Pagination);
  }

  return Pagination;
});

/* ==== empty/empty.js ==== */
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
    Select: global.Select,
    CommandPalette: global.CommandPalette,
    Form: global.Form,
    PhoneInput: global.PhoneInput,
    Drawer: global.Drawer,
    Segmented: global.Segmented,
    Progress: global.Progress,
    Popconfirm: global.Popconfirm,
    Rating: global.Rating,
    Autocomplete: global.Autocomplete,
    Upload: global.Upload,
    Slider: global.Slider,
    NumberInput: global.NumberInput,
    Pagination: global.Pagination,
    EmptyState: global.EmptyState
  };
}
})(globalThis, null);
export var VC = globalThis.VC;
export var VanillaUI = globalThis.VanillaUI;
export var DatePicker = globalThis.DatePicker;
export var Toast = globalThis.Toast;
export var Tooltip = globalThis.Tooltip;
export var Menu = globalThis.Menu;
export var Modal = globalThis.Modal;
export var Tabs = globalThis.Tabs;
export var Select = globalThis.Select;
export var CommandPalette = globalThis.CommandPalette;
export var Form = globalThis.Form;
export var PhoneInput = globalThis.PhoneInput;
export var Drawer = globalThis.Drawer;
export var Segmented = globalThis.Segmented;
export var Progress = globalThis.Progress;
export var Popconfirm = globalThis.Popconfirm;
export var Rating = globalThis.Rating;
export var Autocomplete = globalThis.Autocomplete;
export var Upload = globalThis.Upload;
export var Slider = globalThis.Slider;
export var NumberInput = globalThis.NumberInput;
export var Pagination = globalThis.Pagination;
export var EmptyState = globalThis.EmptyState;
export default { VC, VanillaUI, DatePicker, Toast, Tooltip, Menu, Modal, Tabs, Select, CommandPalette, Form, PhoneInput, Drawer, Segmented, Progress, Popconfirm, Rating, Autocomplete, Upload, Slider, NumberInput, Pagination, EmptyState };
