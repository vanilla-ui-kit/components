#!/usr/bin/env node
/*
 * Builds dist/ from the source files. Node only, zero dependencies.
 *
 *   dist/vanilla-ui-kit.js       core + every component, one CDN file (UMD-ish)
 *   dist/esm/vanilla-ui-kit.js   the same bundle as native ESM named exports
 *   dist/esm/<name>.js           each component as a standalone ES module
 *   dist/<name>.css              extracted stylesheet (for <link> / headless)
 *   dist/vanilla-ui-kit.css      all extracted stylesheets concatenated
 *
 * The JS bundle wraps each UMD file in a scope where `define`/`module` are
 * shadowed, so every part takes its browser branch and attaches its global;
 * a footer then exports the globals for CJS consumers. The ESM flavors run
 * the same code against globalThis and re-export the resulting globals —
 * identical behavior to the script tag, plus real `import` ergonomics.
 *
 * `npm run build` is deterministic and needs no network. Minification and
 * SRI live in `npm run build:min` (tools/minify.js), which pins terser.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var VERSION = require(path.join(ROOT, 'package.json')).version;

// One row per component: [source file, browser global, dist stylesheet, css banner name].
var COMPONENTS = [
  ['datepicker/datepicker.js', 'DatePicker', 'datepicker.css', 'vanilla-datepicker'],
  ['toast/toast.js', 'Toast', 'toast.css', 'vanilla-toast'],
  ['tooltip/tooltip.js', 'Tooltip', 'tooltip.css', 'vanilla-tooltip'],
  ['menu/menu.js', 'Menu', 'menu.css', 'vanilla-menu'],
  ['modal/modal.js', 'Modal', 'modal.css', 'vanilla-modal'],
  ['tabs/tabs.js', 'Tabs', 'tabs.css', 'vanilla-tabs'],
  ['select/select.js', 'Select', 'select.css', 'vanilla-select'],
  ['command/command.js', 'CommandPalette', 'command.css', 'vanilla-command'],
  ['form/form.js', 'Form', 'form.css', 'vanilla-form'],
  ['phone/phone.js', 'PhoneInput', 'phone.css', 'vanilla-phone'],
  ['drawer/drawer.js', 'Drawer', 'drawer.css', 'vanilla-drawer'],
  ['segmented/segmented.js', 'Segmented', 'segmented.css', 'vanilla-segmented'],
  ['progress/progress.js', 'Progress', 'progress.css', 'vanilla-progress'],
  ['popconfirm/popconfirm.js', 'Popconfirm', 'popconfirm.css', 'vanilla-popconfirm'],
  ['rating/rating.js', 'Rating', 'rating.css', 'vanilla-rating'],
  ['autocomplete/autocomplete.js', 'Autocomplete', 'autocomplete.css', 'vanilla-autocomplete'],
  ['upload/upload.js', 'Upload', 'upload.css', 'vanilla-upload'],
  ['slider/slider.js', 'Slider', 'slider.css', 'vanilla-slider'],
  ['number/number.js', 'NumberInput', 'number.css', 'vanilla-number'],
  ['pagination/pagination.js', 'Pagination', 'pagination.css', 'vanilla-pagination'],
  ['empty/empty.js', 'EmptyState', 'empty.css', 'vanilla-empty']
];

var FILES = ['core/core.js'].concat(COMPONENTS.map(function (c) { return c[0]; }));

var banner = '/*!\n' +
  ' * vanilla-ui-kit v' + VERSION + ' — single-file, zero-dependency UI components\n' +
  ' * Bundle of: ' + FILES.join(', ') + '\n' +
  ' * https://github.com/vanilla-ui-kit/components\n' +
  ' * License: MIT\n' +
  ' */\n';

var parts = FILES.map(function (f) {
  return '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8');
});

var GLOBALS = ['VC', 'VanillaUI'].concat(COMPONENTS.map(function (c) { return c[1]; }));

// The shared IIFE body — invoked differently by the UMD and ESM flavors.
var body =
  '(function (global, cjsModule) {\n' +
  // define/module/exports shadowed: force every UMD into its browser branch.
  // self pinned: ESM is strict mode, so the UMDs' `this` fallback is undefined.
  'var define, module, exports, self = global;\n' +
  parts.join('\n') + '\n' +
  'if (cjsModule) {\n' +
  '  cjsModule.exports = {\n' +
  GLOBALS.map(function (g) {
    return '    ' + g + ': global.' + g;
  }).join(',\n') + '\n' +
  '  };\n' +
  '}\n' +
  '})';

var bundle = banner + body +
  '(typeof globalThis !== \'undefined\' ? globalThis :\n' +
  '   typeof self !== \'undefined\' ? self : this,\n' +
  '   typeof module === \'object\' && module.exports ? module : null);\n';

// ESM bundle: same code run against globalThis, globals re-exported as
// named exports. Importing has the same page-level effect as the script tag.
var esmBundle = banner + body + '(globalThis, null);\n' +
  GLOBALS.map(function (g) {
    return 'export var ' + g + ' = globalThis.' + g + ';';
  }).join('\n') + '\n' +
  'export default { ' + GLOBALS.join(', ') + ' };\n';

fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'esm'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'vanilla-ui-kit.js'), bundle);
fs.writeFileSync(path.join(DIST, 'esm', 'vanilla-ui-kit.js'), esmBundle);
// Everything under dist/esm/ is ESM; .js stays for CDN-friendly URLs.
// sideEffects:false lives HERE because bundlers consult the NEAREST
// package.json — without it the barrel can't tree-shake. Each module's
// only import-time effect is attaching its own global, which is exactly
// what dropping an unimported component should skip.
fs.writeFileSync(path.join(DIST, 'esm', 'package.json'),
  '{ "type": "module", "sideEffects": false }\n');

// Per-component ES modules: embed the single UMD source with `self` pinned
// to globalThis so the browser branch attaches there, then re-export.
function writeEsmModule(sourceFile, dir, exportNames) {
  var src = fs.readFileSync(path.join(ROOT, sourceFile), 'utf8');
  var esm =
    '/*! vanilla-ui-kit/' + dir + ' v' + VERSION + ' — ES module wrapper. License: MIT */\n' +
    'var __root = typeof globalThis !== \'undefined\' ? globalThis : self;\n' +
    '(function () {\n' +
    'var define, module, exports, self = __root;\n' +
    src + '\n' +
    '}).call(__root);\n' +
    exportNames.map(function (n) {
      return 'var ' + n + ' = __root.' + n + ';';
    }).join('\n') + '\n' +
    'export { ' + exportNames.join(', ') + ' };\n' +
    'export default ' + exportNames[0] + ';\n';
  fs.writeFileSync(path.join(DIST, 'esm', dir + '.js'), esm);
}

writeEsmModule('core/core.js', 'core', ['VC', 'VanillaUI']);
COMPONENTS.forEach(function (c) {
  writeEsmModule(c[0], c[0].split('/')[0], [c[1]]);
});

// Tree-shakeable barrel — the package's `import` entry for bundlers. Pure
// re-exports over the per-component modules, so with sideEffects scoped to
// CSS a bundler keeps only what you import. CDN users who want ONE request
// keep using dist/esm/vanilla-ui-kit.js (the concatenated bundle) instead.
var barrel =
  '/*! vanilla-ui-kit v' + VERSION + ' — tree-shakeable ESM entry. License: MIT */\n' +
  'import { VC, VanillaUI } from \'./core.js\';\n' +
  COMPONENTS.map(function (c) {
    return 'import ' + c[1] + ' from \'./' + c[0].split('/')[0] + '.js\';';
  }).join('\n') + '\n' +
  'export { ' + GLOBALS.join(', ') + ' };\n' +
  'export default { ' + GLOBALS.join(', ') + ' };\n';
fs.writeFileSync(path.join(DIST, 'esm', 'index.js'), barrel);

// Extracted stylesheets — each component exposes its CSS as `Ctor.css`.
var cssBanner = function (name) {
  return '/*! ' + name + ' v' + VERSION + ' — extracted stylesheet. Pair with the JS in\n' +
    ' * headless mode (styles: false) to own the styling. License: MIT */\n';
};

var sheets = COMPONENTS.map(function (c) {
  return [c[2], c[3], require(path.join(ROOT, c[0])).css];
});

var all = '';
sheets.forEach(function (s) {
  if (!s[2]) throw new Error(s[0] + ': component does not expose .css');
  var text = cssBanner(s[1]) + s[2] + '\n';
  fs.writeFileSync(path.join(DIST, s[0]), text);
  all += text;
});
fs.writeFileSync(path.join(DIST, 'vanilla-ui-kit.css'), all);

sheets.concat([['vanilla-ui-kit.js'], ['esm/vanilla-ui-kit.js']]).forEach(function (s) {
  var p = path.join(DIST, s[0]);
  console.log('  dist/' + s[0] + '  (' + fs.statSync(p).size + ' bytes)');
});
console.log('  dist/esm/*.js  (' + (COMPONENTS.length + 1) + ' modules)');
console.log('Build complete.');
