#!/usr/bin/env node
/*
 * Scaffolds a new Vanilla UI Kit component that implements the family
 * contract (the written-down checklist lives in tools/README.md).
 *
 *   node tools/new-component.js <dir> <GlobalName> <rootClass> [registryName] [--wire]
 *   node tools/new-component.js breadcrumb Breadcrumb vbc breadcrumb --wire
 *
 * Zero dependencies, Node only. Generates <dir>/<dir>.js (a compilable,
 * contract-complete ES5 skeleton), <dir>/README.md and <dir>/examples.html.
 *
 * Without --wire it prints the exact wiring snippets to paste into
 * tools/build.js, package.json and test/node.test.js. With --wire it
 * inserts them itself, idempotently, anchored on the current LAST entry
 * of each list — and refuses (before writing anything) if an anchor
 * cannot be found.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

function fail(msg) {
  console.error('new-component: ' + msg);
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/* ------------------------------------------------------------------ *
 * Arguments & validation.
 * ------------------------------------------------------------------ */

var rawArgs = process.argv.slice(2);
var wire = rawArgs.indexOf('--wire') !== -1;
var args = rawArgs.filter(function (a) { return a !== '--wire'; });

if (args.length < 3 || args.length > 4) {
  console.error('Usage: node tools/new-component.js <dir> <GlobalName> <rootClass> [registryName] [--wire]');
  console.error('  e.g. node tools/new-component.js breadcrumb Breadcrumb vbc breadcrumb --wire');
  process.exit(1);
}

var dir = args[0];
var globalName = args[1];
var rootClass = args[2];
var registryName = args[3] || dir;

if (!/^[a-z][a-z0-9-]*$/.test(dir)) {
  fail('<dir> must be lowercase (a-z, 0-9, -), got: ' + dir);
}
var RESERVED = ['core', 'dist', 'docs', 'test', 'tools', 'node_modules'];
if (RESERVED.indexOf(dir) !== -1) fail('<dir> "' + dir + '" is reserved');
if (fs.existsSync(path.join(ROOT, dir))) {
  fail('directory already exists: ' + dir + '/ — pick a new name or remove it first');
}
if (!/^[A-Z][A-Za-z0-9]*$/.test(globalName) || !/[a-z]/.test(globalName)) {
  fail('<GlobalName> must be PascalCase (e.g. Breadcrumb, PhoneInput), got: ' + globalName);
}
if (!/^[a-z][a-z0-9]{1,7}$/.test(rootClass)) {
  fail('<rootClass> must be a short lowercase token, 2-8 chars (family style: vbc, vzz), got: ' + rootClass);
}
if (!/^[a-z][a-z0-9-]*$/.test(registryName)) {
  fail('[registryName] must be lowercase (a-z, 0-9, -), got: ' + registryName);
}

// rootClass must be UNIQUE across the repo — scan every component source
// for `X.rootClass = '<token>'` assignments (dist/ is a copy of sources,
// so it is skipped).
function scanRootClasses() {
  var out = {};
  fs.readdirSync(ROOT).forEach(function (entry) {
    if (entry[0] === '.' || entry === 'node_modules' || entry === 'dist') return;
    var d = path.join(ROOT, entry);
    if (!fs.statSync(d).isDirectory()) return;
    fs.readdirSync(d).forEach(function (f) {
      if (!/\.js$/.test(f)) return;
      var src = fs.readFileSync(path.join(d, f), 'utf8');
      var re = /\.rootClass\s*=\s*['"]([^'"]+)['"]/g;
      var m;
      while ((m = re.exec(src))) out[m[1]] = entry + '/' + f;
    });
  });
  return out;
}

var taken = scanRootClasses();
if (taken[rootClass]) {
  fail('rootClass "' + rootClass + '" is already used by ' + taken[rootClass] +
    ' — root classes must be unique across the family');
}

// GlobalName must not collide with an existing browser global in the bundle.
// Parse ONLY the COMPONENTS block — the rest of build.js also contains
// bracketed path literals (FILES, dist/esm bookkeeping) that must not
// be mistaken for component rows.
var buildSrc = read('tools/build.js');
var compStart = buildSrc.indexOf('var COMPONENTS = [');
var compEnd = compStart === -1 ? -1 : buildSrc.indexOf('\n];', compStart);
if (compStart === -1 || compEnd === -1) {
  fail('could not find the COMPONENTS array in tools/build.js');
}
var compBlock = buildSrc.slice(compStart, compEnd);
var gre = /\['([a-z0-9-]+)\/[a-z0-9-]+\.js',\s*'([A-Za-z0-9]+)'/g;
var gm;
var globals = ['VC', 'VanillaUI'];
var dirs = [];
while ((gm = gre.exec(compBlock))) {
  dirs.push(gm[1]);
  globals.push(gm[2]);
}
if (globals.indexOf(globalName) !== -1) {
  fail('GlobalName "' + globalName + '" is already a browser global in tools/build.js');
}
if (dirs.length === 0) fail('could not parse any COMPONENTS rows out of tools/build.js');
var lastDir = dirs[dirs.length - 1]; // wiring anchor: the current last component

/* ------------------------------------------------------------------ *
 * Templates. __DIR__, __NAME__, __RC__, __REG__ are substituted.
 * String.raw keeps the generated regex escapes (\w etc.) intact.
 * ------------------------------------------------------------------ */

function render(tpl) {
  return tpl
    .split('__DIR__').join(dir)
    .split('__NAME__').join(globalName)
    .split('__RC__').join(rootClass)
    .split('__REG__').join(registryName);
}

var JS_TPL = String.raw`/*!
 * Vanilla UI Kit __NAME__ v1.0.0
 * A single-file, zero-dependency __REG__ component for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="__DIR__.js"></script>
 *   <div id="demo"></div>
 *   <script>__NAME__.create('#demo')</script>
 *
 * Or zero-JS:
 *   <div data-__RC__></div>
 *
 * Headless:
 *   __NAME__.defaults.styles = false   // no CSS injected; style .__RC__-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__NAME__ = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-__DIR__-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * 'styles: false'; also exposed raw as '__NAME__.css'.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when __NAME__.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the component; custom-property DEFINITIONS stay unsalted at
  // their documented specificity so page overrides like
  // '.__RC__{--__RC__-accent:…}' keep working (var names are already
  // namespaced — they need no armor).
  var CSS = '' +
    '.__RC__{' +
      '--__RC__-accent:#5b5bd6;' +
      '--__RC__-bg:#ffffff;' +
      '--__RC__-text:#1c1d21;' +
      '--__RC__-muted:#72747e;' +
      '--__RC__-faint:#e7e7ec;' +
      '--__RC__-shadow:0 1px 3px rgba(24,25,32,.12),0 1px 2px rgba(24,25,32,.06);' +
      '--__RC__-radius:10px;' +
      '--__RC__-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.__RC__[data-theme=dark]{' +
      '--__RC__-accent:#7b7bea;' +
      '--__RC__-bg:#1b1d24;' +
      '--__RC__-text:#e9eaf0;' +
      '--__RC__-muted:#989aa6;' +
      '--__RC__-faint:#31343f;' +
      '--__RC__-shadow:0 1px 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3);}' +
    /* TODO: component logic — replace this starter block with the real
       structural styles. Every structural rule must keep the .SALT armor. */
    '.__RC__.SALT{box-sizing:border-box;display:inline-block;' +
      'background:var(--__RC__-bg);color:var(--__RC__-text);' +
      'font-family:var(--__RC__-font);font-size:14px;line-height:1.45;' +
      'border:1px solid var(--__RC__-faint);border-radius:var(--__RC__-radius);' +
      'box-shadow:var(--__RC__-shadow);padding:12px 14px;}' +
    '.__RC__.SALT *,.__RC__.SALT *::before,.__RC__.SALT *::after{box-sizing:border-box;}' +
    '.__RC__.SALT .__RC__-muted{color:var(--__RC__-muted);}' +
    '.__RC__.SALT :focus{outline:none;}' +
    '.__RC__.SALT :focus-visible{outline:2px solid var(--__RC__-accent);outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.__RC__.SALT,.__RC__.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/__DIR__.css), or set __NAME__.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = __NAME__.salt;
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
    // Insert before the page's own CSS so '.__RC__{--__RC__-*}' overrides
    // win the cascade.
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

  var DEFAULTS = {
    theme: 'auto',  // 'auto' | 'light' | 'dark'
    styles: true,   // false = headless: no CSS injected, style .__RC__-* yourself
    /* TODO: component logic — add and document the component's options here,
       one per line, like the rest of the family */
    labels: { region: '__NAME__' } // every user-facing string lives here (i18n)
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    update: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * __NAME__.
   * ------------------------------------------------------------------ */

  function __NAME__(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('__NAME__: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this._destroyed = false;

    if (this.opts.styles !== false) injectStyles();

    var s = saltToken();
    el.classList.add('__RC__');
    if (s) el.classList.add(s);

    /* TODO: component logic — build the DOM (labels are TEXT via
       textContent; innerHTML only for trusted, component-owned SVG),
       set ARIA roles/names (use this.opts.labels), bind events. */

    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  __NAME__.prototype = {
    constructor: __NAME__,

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.el.setAttribute('data-theme', resolved);
    },

    /* TODO: component logic — private helpers and event handlers go here */

    update: function (options) {
      if (!this.el || this._destroyed) return this;
      this.opts = assignOptions({}, this.opts, options || {});
      /* TODO: component logic — re-render from the merged options */
      this._applyTheme();
      return this;
    },

    destroy: function () {
      if (!this.el || this._destroyed) return this;
      this._destroyed = true;
      unwatchAutoTheme(this);
      /* TODO: component logic — unbind events, remove built DOM, restore
         any attributes the constructor touched */
      this.el.classList.remove('__RC__');
      var s = saltToken();
      if (s) this.el.classList.remove(s);
      this.el.removeAttribute('data-theme');
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  __NAME__.version = VERSION;
  __NAME__.defaults = DEFAULTS;

  __NAME__.create = function (target, options) {
    return new __NAME__(target, options);
  };

  __NAME__.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    /* TODO: component logic — map more data-* attributes onto options */
    return o;
  }

  __NAME__.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-__RC__]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new __NAME__(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('__NAME__ auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { __NAME__.autoInit(); });
    } else {
      __NAME__.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  __NAME__.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(__NAME__, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    __NAME__.css = renderCss();
  }
  __NAME__.displayName = '__NAME__';
  __NAME__.rootClass = '__RC__';
  __NAME__.themeVars = {
    accent: '--__RC__-accent',
    radius: '--__RC__-radius',
    font: '--__RC__-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  __NAME__.varScopes = ['.__RC__', '.__RC__[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('__REG__', __NAME__);
  }

  return __NAME__;
});
`;

var README_TPL = `# Vanilla UI Kit __NAME__

A single-file, zero-dependency __REG__ component for vanilla JavaScript.
One \`<script>\` tag, one line of JS. Follows your page's light/dark theme
automatically, in the same visual family as the rest of
[Vanilla UI Kit](../README.md).

**[Live examples →](./examples.html)**

## Quick start

\`\`\`html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/__DIR__/__DIR__.js"></script>
<div id="demo"></div>
<script>
  __NAME__.create('#demo')
</script>
\`\`\`

Also available via the family bundle (\`dist/vanilla-ui-kit.js\`), npm
(\`vanilla-ui-kit/__DIR__\`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

<!-- TODO: document the component's options and instance methods -->

\`\`\`js
__NAME__.create('#demo', {
  theme: 'auto',   // 'auto' | 'light' | 'dark'
  styles: true     // false = headless (no CSS injected)
})
// → instance: { el, update(options), destroy() }

__NAME__.get('#demo')   // instance for an element, or null
__NAME__.autoInit()     // init every [data-__RC__] (also runs on DOMContentLoaded)
\`\`\`

## Theming

Auto light/dark with the family's resolution order: \`<html data-theme>\` /
\`data-bs-theme\` / \`.dark\` class → \`prefers-color-scheme\`, re-resolved
live. Pin it with \`__NAME__.defaults.theme = 'dark'\`.

All colors are CSS custom properties:

\`\`\`css
.__RC__ {
  --__RC__-accent: #b45309;
  --__RC__-bg: …; --__RC__-text: …; --__RC__-muted: …; --__RC__-faint: …;
  --__RC__-radius: 10px; --__RC__-font: …;
}
\`\`\`

With the VC core loaded, \`VC.config({ accent: '#b45309' })\` themes this
and every other family component in one call.

**CSS isolation:** structural rules ship salted (\`.__RC__.vc1 { … }\`), so
host-page design systems can't override the component — while the
\`--__RC__-*\` variable overrides above keep working (var definitions are
deliberately unsalted). Custom token: \`__NAME__.salt = 'acme'\` before the
first instance; disable with \`__NAME__.salt = false\`.

## Headless

\`\`\`js
__NAME__.defaults.styles = false   // never inject CSS
\`\`\`

You keep the full behavior and markup contract — style it entirely from
your own CSS. Our stylesheet is available as a starting point:
\`__NAME__.css\` (string) or [\`dist/__DIR__.css\`](../dist/__DIR__.css)
(file).

## License

MIT
`;

var EXAMPLES_TPL = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vanilla UI Kit __NAME__ — Examples</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='1' y='3' width='14' height='4.5' rx='2' fill='%235b5bd6'/%3E%3Crect x='1' y='9.5' width='14' height='4.5' rx='2' fill='%239b9bf0'/%3E%3C/svg%3E">
<style>
  :root {
    --bg: #fbfbfa; --surface: #ffffff; --surface-2: #f2f2f5; --text: #1c1d21;
    --muted: #72747e; --faint: #e7e7ec; --accent: #5b5bd6;
    --code-bg: #f6f6f8;
    --shadow: 0 1px 2px rgba(24,25,32,.05), 0 8px 24px rgba(24,25,32,.06);
    --display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #16171c; --surface: #1b1d24; --surface-2: #272a33; --text: #e9eaf0;
      --muted: #989aa6; --faint: #31343f; --accent: #7b7bea; --code-bg: #14151a;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="light"] {
    --bg: #fbfbfa; --surface: #ffffff; --surface-2: #f2f2f5; --text: #1c1d21;
    --muted: #72747e; --faint: #e7e7ec; --accent: #5b5bd6; --code-bg: #f6f6f8;
    --shadow: 0 1px 2px rgba(24,25,32,.05), 0 8px 24px rgba(24,25,32,.06);
  }
  :root[data-theme="dark"] {
    --bg: #16171c; --surface: #1b1d24; --surface-2: #272a33; --text: #e9eaf0;
    --muted: #989aa6; --faint: #31343f; --accent: #7b7bea; --code-bg: #14151a;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: var(--sans); font-size: 15px; line-height: 1.6;
    transition: background .2s ease, color .2s ease;
  }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px 96px; }
  .top {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 28px 0 0; flex-wrap: wrap;
  }
  .brand { font-family: var(--display); font-size: 18px; font-weight: 600; }
  .brand small { font-family: var(--sans); color: var(--muted); font-weight: 400; margin-left: 8px; }
  .brand a { color: var(--muted); text-decoration: none; }
  .theme-switch { display: flex; gap: 2px; background: var(--surface-2); border-radius: 10px; padding: 3px; }
  .theme-switch button {
    font: inherit; font-size: 13px; color: var(--muted); background: none;
    border: 0; border-radius: 8px; padding: 5px 14px; cursor: pointer;
  }
  .theme-switch button[aria-pressed="true"] {
    background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.12);
  }
  h1 {
    font-family: var(--display); font-size: clamp(34px, 5vw, 48px);
    font-weight: 600; line-height: 1.08; letter-spacing: -.01em; margin: 64px 0 14px;
  }
  h1 em { font-style: italic; color: var(--accent); }
  p.lede { font-size: 17px; color: var(--muted); margin: 0 0 40px; max-width: 56ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
  .card {
    background: var(--surface); border: 1px solid var(--faint); border-radius: 16px;
    padding: 24px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 14px;
  }
  .card h3 { margin: 0; font-size: 16px; font-weight: 650; }
  .card p { margin: -6px 0 0; color: var(--muted); font-size: 14px; }
  .card .demo { display: flex; flex-wrap: wrap; gap: 8px; }
  .card pre {
    margin: 0; background: var(--code-bg); border: 1px solid var(--faint);
    border-radius: 10px; padding: 12px 14px; font-family: var(--mono);
    font-size: 12.5px; line-height: 1.55; overflow-x: auto;
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div class="brand">Vanilla UI Kit __NAME__ <small>v1.0.0 · <a href="../toast/examples.html">toast →</a></small></div>
    <div class="theme-switch" role="group" aria-label="Theme">
      <button type="button" data-set-theme="" aria-pressed="true">Auto</button>
      <button type="button" data-set-theme="light" aria-pressed="false">Light</button>
      <button type="button" data-set-theme="dark" aria-pressed="false">Dark</button>
    </div>
  </div>

  <h1>__NAME__, <em>one file</em>.</h1>
  <p class="lede">A zero-dependency __REG__ that follows your page's theme
  on its own. <!-- TODO: describe the component --></p>

  <div class="grid">
    <div class="card">
      <h3>Basic</h3>
      <p><!-- TODO: describe the demo --></p>
      <div class="demo">
        <div data-__RC__>__NAME__ goes here</div>
      </div>
      <pre>__NAME__.create('#demo')</pre>
    </div>
  </div>
</div>

<script src="__DIR__.js"></script>
<script>
  // Theme switch — the component follows <html data-theme> on its own.
  var btns = document.querySelectorAll('[data-set-theme]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var t = this.getAttribute('data-set-theme');
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
      for (var j = 0; j < btns.length; j++) {
        btns[j].setAttribute('aria-pressed', String(btns[j] === this));
      }
    });
  }
</script>
</body>
</html>
`;

/* ------------------------------------------------------------------ *
 * Wiring — anchored, idempotent insertions. Every insertion is computed
 * BEFORE anything is written, so a missing anchor aborts cleanly.
 * ------------------------------------------------------------------ */

var buildRow = "  ['" + dir + '/' + dir + ".js', '" + globalName + "', '" +
  dir + ".css', 'vanilla-" + dir + "']";
// Conditional exports entry (the current package.json shape: types first,
// then import, then default) and older shapes — wirePkg inserts whichever
// form the anchor entry uses.
var pkgJsBlock = '    "./' + dir + '": {\n' +
  '      "types": "./types/' + dir + '.d.ts",\n' +
  '      "import": "./dist/esm/' + dir + '.js",\n' +
  '      "default": "./' + dir + '/' + dir + '.js"\n' +
  '    },';
var pkgJsBlockNoTypes = '    "./' + dir + '": {\n' +
  '      "import": "./dist/esm/' + dir + '.js",\n' +
  '      "default": "./' + dir + '/' + dir + '.js"\n' +
  '    },';
var pkgJsFlat = '    "./' + dir + '": "./' + dir + '/' + dir + '.js",';
var pkgCssLine = '    "./' + dir + '.css": "./dist/' + dir + '.css",';
var pkgFilesLine = '    "' + dir + '",';
var familyRow = "  ['" + globalName + "', '" + dir + '/' + dir + ".js', '" +
  rootClass + "', ['create', 'get', 'autoInit']],";

// tools/build.js — append a row before the `];` that closes COMPONENTS.
function wireBuild(src) {
  if (src.indexOf("'" + dir + '/' + dir + ".js'") !== -1) return { src: src, added: [] };
  var start = src.indexOf('var COMPONENTS = [');
  if (start === -1) return null;
  var end = src.indexOf('\n];', start);
  if (end === -1) return null;
  if (!/\]\s*$/.test(src.slice(start, end))) return null; // last row must close with ]
  return {
    src: src.slice(0, end) + ',\n' + buildRow + src.slice(end),
    added: [buildRow]
  };
}

// package.json — insert after the CURRENT last component's entries
// (lastDir comes from the pre-wire COMPONENTS table in tools/build.js).
function wirePkg(src) {
  var added = [];

  if (src.indexOf('"./' + dir + '":') === -1) {
    // Newest shape first (types + import + default), then import + default,
    // then the flat legacy string — insert the matching form.
    var typedAnchor = '"./' + lastDir + '": {\n' +
      '      "types": "./types/' + lastDir + '.d.ts",\n' +
      '      "import": "./dist/esm/' + lastDir + '.js",\n' +
      '      "default": "./' + lastDir + '/' + lastDir + '.js"\n' +
      '    },';
    var condAnchor = '"./' + lastDir + '": {\n' +
      '      "import": "./dist/esm/' + lastDir + '.js",\n' +
      '      "default": "./' + lastDir + '/' + lastDir + '.js"\n' +
      '    },';
    var flatAnchor = '"./' + lastDir + '": "./' + lastDir + '/' + lastDir + '.js",';
    var at = src.indexOf(typedAnchor);
    var jsIns = pkgJsBlock;
    var anchorLen = typedAnchor.length;
    if (at === -1) {
      at = src.indexOf(condAnchor);
      jsIns = pkgJsBlockNoTypes;
      anchorLen = condAnchor.length;
    }
    if (at === -1) {
      at = src.indexOf(flatAnchor);
      jsIns = pkgJsFlat;
      anchorLen = flatAnchor.length;
    }
    if (at === -1) return null;
    at += anchorLen;
    src = src.slice(0, at) + '\n' + jsIns + src.slice(at);
    added.push(jsIns);
  }

  if (src.indexOf('"./' + dir + '.css":') === -1) {
    var cssAnchor = '"./' + lastDir + '.css": "./dist/' + lastDir + '.css",';
    var at2 = src.indexOf(cssAnchor);
    if (at2 === -1) return null;
    at2 += cssAnchor.length;
    src = src.slice(0, at2) + '\n' + pkgCssLine + src.slice(at2);
    added.push(pkgCssLine);
  }

  var fi = src.indexOf('"files": [');
  if (fi === -1) return null;
  var fend = src.indexOf(']', fi);
  if (fend === -1) return null;
  if (src.slice(fi, fend).indexOf('"' + dir + '"') === -1) {
    var filesAnchor = '\n    "' + lastDir + '",';
    var at3 = src.indexOf(filesAnchor, fi);
    if (at3 === -1 || at3 > fend) return null;
    at3 += filesAnchor.length;
    src = src.slice(0, at3) + '\n' + pkgFilesLine + src.slice(at3);
    added.push(pkgFilesLine);
  }

  return { src: src, added: added };
}

// test/node.test.js — append a row before the `];` that closes FAMILY.
function wireTest(src) {
  if (src.indexOf("'" + dir + '/' + dir + ".js'") !== -1) return { src: src, added: [] };
  var start = src.indexOf('const FAMILY = [');
  if (start === -1) return null;
  var end = src.indexOf('\n];', start);
  if (end === -1) return null;
  if (!/\],\s*$/.test(src.slice(start, end))) return null; // rows keep trailing commas
  return {
    src: src.slice(0, end) + '\n' + familyRow + src.slice(end),
    added: [familyRow]
  };
}

var wired = null;
if (wire) {
  var b = wireBuild(buildSrc);
  if (!b) fail('--wire: could not find the COMPONENTS array anchor in tools/build.js ' +
    '(expected `var COMPONENTS = [` … rows … `];` with the last row ending in `]`). ' +
    'Nothing was written — wire it by hand or fix the file.');
  var p = wirePkg(read('package.json'));
  if (!p) fail('--wire: could not find the "./' + lastDir + '" / "./' + lastDir +
    '.css" / files "' + lastDir + '" anchors in package.json ' +
    '(derived from the last COMPONENTS row in tools/build.js). Nothing was written.');
  var t = wireTest(read('test/node.test.js'));
  if (!t) fail('--wire: could not find the FAMILY array anchor in test/node.test.js ' +
    '(expected `const FAMILY = [` … rows ending in `],` … `];`). Nothing was written.');
  wired = { build: b, pkg: p, test: t };
}

/* ------------------------------------------------------------------ *
 * Write everything.
 * ------------------------------------------------------------------ */

fs.mkdirSync(path.join(ROOT, dir));
fs.writeFileSync(path.join(ROOT, dir, dir + '.js'), render(JS_TPL));
fs.writeFileSync(path.join(ROOT, dir, 'README.md'), render(README_TPL));
fs.writeFileSync(path.join(ROOT, dir, 'examples.html'), render(EXAMPLES_TPL));

console.log('Created:');
console.log('  ' + dir + '/' + dir + '.js       (contract-complete skeleton — search for "TODO: component logic")');
console.log('  ' + dir + '/README.md      (doc skeleton)');
console.log('  ' + dir + '/examples.html  (demo skeleton)');
console.log('');

if (wired) {
  fs.writeFileSync(path.join(ROOT, 'tools', 'build.js'), wired.build.src);
  fs.writeFileSync(path.join(ROOT, 'package.json'), wired.pkg.src);
  fs.writeFileSync(path.join(ROOT, 'test', 'node.test.js'), wired.test.src);

  console.log('Wired:');
  var summary = [
    ['tools/build.js', wired.build.added],
    ['package.json', wired.pkg.added],
    ['test/node.test.js', wired.test.added]
  ];
  summary.forEach(function (s) {
    console.log('  ' + s[0]);
    if (s[1].length === 0) console.log('    (already wired — no change)');
    s[1].forEach(function (chunk) {
      chunk.split('\n').forEach(function (line) { console.log('  + ' + line); });
    });
  });
} else {
  console.log('Not wired (no --wire). Paste these snippets:');
  console.log('');
  console.log('tools/build.js — add to the COMPONENTS array:');
  console.log(buildRow + ',');
  console.log('');
  console.log('package.json — add to "exports" (with the other components / the other .css entries):');
  console.log(pkgJsBlock);
  console.log(pkgCssLine);
  console.log('');
  console.log('package.json — add to "files" (before "dist"):');
  console.log(pkgFilesLine);
  console.log('');
  console.log('test/node.test.js — add to the FAMILY table:');
  console.log(familyRow);
}

console.log('');
console.log('Next steps:');
console.log('  1. Implement the "TODO: component logic" regions in ' + dir + '/' + dir + '.js');
console.log('  2. npm run build       (regenerates dist/, incl. dist/' + dir + '.css and dist/esm/' + dir + '.js)');
console.log('  3. npm run build:min   (refreshes the minified bundles and dist/sri.json — the');
console.log('                          SRI test fails on a stale dist/, needs npx terser once)');
console.log('  4. npm test            (the family-contract suite picks the component up)');
