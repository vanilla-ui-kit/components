/*! vanilla-ui-kit/phone v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
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

}).call(__root);
var PhoneInput = __root.PhoneInput;
export { PhoneInput };
export default PhoneInput;
