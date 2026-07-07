#!/usr/bin/env node
/*
 * Builds dist/ from the source files. Node only, zero dependencies.
 *
 *   dist/vanilla-ui-kit.js   core + every component, one CDN file
 *   dist/datepicker.css          extracted stylesheet (for <link> / headless)
 *   dist/toast.css
 *   dist/vanilla-ui-kit.css  all extracted stylesheets concatenated
 *
 * The JS bundle wraps each UMD file in a scope where `define`/`module` are
 * shadowed, so every part takes its browser branch and attaches its global;
 * a footer then exports { VanillaUI, VC, DatePicker, Toast } for CJS consumers.
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

var bundle = banner +
  '(function (global, cjsModule) {\n' +
  'var define, module, exports;\n' + // shadowed: force every UMD into its browser branch
  parts.join('\n') + '\n' +
  'if (cjsModule) {\n' +
  '  cjsModule.exports = {\n' +
  '    VC: global.VC,\n' +
  '    VanillaUI: global.VanillaUI,\n' +
  COMPONENTS.map(function (c) {
    return '    ' + c[1] + ': global.' + c[1];
  }).join(',\n') + '\n' +
  '  };\n' +
  '}\n' +
  '})(typeof globalThis !== \'undefined\' ? globalThis :\n' +
  '   typeof self !== \'undefined\' ? self : this,\n' +
  '   typeof module === \'object\' && module.exports ? module : null);\n';

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'vanilla-ui-kit.js'), bundle);

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

sheets.concat([['vanilla-ui-kit.js']]).forEach(function (s) {
  var p = path.join(DIST, s[0]);
  console.log('  dist/' + s[0] + '  (' + fs.statSync(p).size + ' bytes)');
});
console.log('Build complete.');
