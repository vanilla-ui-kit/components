#!/usr/bin/env node
/*
 * Size budget gate — fails the build when dist/ outgrows its budgets, so
 * size regressions surface in the PR that causes them, not in a complaint.
 * Budgets are deliberately roomy; raise them consciously in this file when
 * the kit genuinely grows (say so in the commit message).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var DIST = path.join(__dirname, '..', 'dist');

var BUDGETS = [
  ['vanilla-ui-kit.js', 1100 * 1024],
  ['vanilla-ui-kit.min.js', 500 * 1024],
  ['esm/vanilla-ui-kit.js', 1100 * 1024],
  ['vanilla-ui-kit.css', 120 * 1024],
  ['vanilla-ui-kit.min.css', 90 * 1024]
];
var PER_COMPONENT_CSS = 16 * 1024;

var failed = false;

function check(name, size, budget) {
  var pct = Math.round((size / budget) * 100);
  var over = size > budget;
  if (over) failed = true;
  console.log(
    (over ? 'FAIL ' : ' ok  ') + name +
    '  ' + size + ' / ' + budget + ' bytes (' + pct + '%)'
  );
}

BUDGETS.forEach(function (b) {
  var p = path.join(DIST, b[0]);
  if (!fs.existsSync(p)) {
    console.log('FAIL ' + b[0] + '  missing — run npm run build && npm run build:min');
    failed = true;
    return;
  }
  check(b[0], fs.statSync(p).size, b[1]);
});

fs.readdirSync(DIST).sort().forEach(function (name) {
  if (!/\.css$/.test(name) || /vanilla-ui-kit/.test(name)) return;
  check(name, fs.statSync(path.join(DIST, name)).size, PER_COMPONENT_CSS);
});

if (failed) {
  console.error('\nSize budget exceeded. Shrink the change or raise the budget consciously in tools/size-check.js.');
  process.exit(1);
}
console.log('\nAll size budgets respected.');
