'use strict';
/*
 * Node-side test suite — zero dependencies, runs with `node --test test/`.
 *
 * Everything here must hold in an environment with no DOM: the public API
 * surface, the pure date helpers, SSR no-op behaviour, and that the committed
 * dist/ bundle is in sync with the sources it is built from.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const pkg = require('../package.json');
const VC = require('../core/core.js');
const DatePicker = require('../datepicker/datepicker.js');
const Toast = require('../toast/toast.js');
const bundle = require('../dist/vanilla-ui-kit.js');

test('modules load in Node and expose their API', () => {
  assert.equal(typeof DatePicker, 'function');
  for (const fn of ['create', 'formatDate', 'parseDate', 'autoInit']) {
    assert.equal(typeof DatePicker[fn], 'function', `DatePicker.${fn}`);
  }
  for (const fn of ['show', 'info', 'success', 'error', 'warning', 'loading', 'promise', 'dismissAll']) {
    assert.equal(typeof Toast[fn], 'function', `Toast.${fn}`);
  }
  for (const fn of ['register', 'autoInit', 'config', 'position', 'injectStyles']) {
    assert.equal(typeof VC[fn], 'function', `VC.${fn}`);
  }
  assert.equal(typeof VC.theme.resolve, 'function');
});

test('all versions agree with package.json', () => {
  assert.equal(VC.version, pkg.version);
  assert.equal(DatePicker.version, pkg.version);
  assert.equal(Toast.version, pkg.version);
});

test('bundle exports the whole family', () => {
  assert.deepEqual(Object.keys(bundle).sort(), ['DatePicker', 'Toast', 'VC', 'VanillaUI']);
  assert.equal(bundle.VanillaUI, bundle.VC);
  assert.equal(typeof bundle.DatePicker, 'function');
  assert.equal(bundle.VC.version, pkg.version);
  assert.equal(bundle.DatePicker.version, pkg.version);
  assert.equal(bundle.Toast.version, pkg.version);
});

test('formatDate / parseDate round-trip', () => {
  assert.equal(DatePicker.formatDate(new Date(2026, 6, 3), 'YYYY-MM-DD'), '2026-07-03');
  assert.equal(DatePicker.formatDate(new Date(2026, 0, 9), 'DD/MM/YYYY'), '09/01/2026');

  const d = DatePicker.parseDate('2026-07-03', 'YYYY-MM-DD');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 6);
  assert.equal(d.getDate(), 3);
  assert.equal(DatePicker.formatDate(d, 'YYYY-MM-DD'), '2026-07-03');
});

test('parseDate rejects garbage', () => {
  assert.equal(DatePicker.parseDate('bogus', 'YYYY-MM-DD'), null);
  assert.equal(DatePicker.parseDate('', 'YYYY-MM-DD'), null);
});

test('components expose extractable, salted CSS', () => {
  for (const C of [DatePicker, Toast]) {
    assert.equal(typeof C.css, 'string');
    assert.ok(C.css.length > 500, 'css is non-trivial');
    assert.ok(C.css.includes(C.rootClass), 'css mentions its root class');
    assert.equal(typeof C.salt, 'string');
    assert.ok(C.salt.length > 0);
  }
  assert.equal(DatePicker.salt, Toast.salt, 'family shares one salt namespace');
});

test('SSR: Toast is a no-op that still returns a handle', () => {
  const h = Toast.info('hello from Node');
  assert.equal(h.el, null);
  assert.doesNotThrow(() => h.update({ message: 'still fine' }));
  assert.doesNotThrow(() => h.dismiss());
  assert.doesNotThrow(() => Toast.dismissAll());
});

test('SSR: VC registry and injectStyles are safe without a DOM', () => {
  const Fake = function FakeTest() {};
  VC.register('faketest', Fake);
  assert.equal(VC.components.faketest, Fake);
  assert.equal(VC.FakeTest, Fake, 'aliased under the constructor name');
  assert.doesNotThrow(() => VC.injectStyles('test-styles', '.x{color:red}'));
});

test('package.json exports map points at real files', () => {
  for (const target of Object.values(pkg.exports)) {
    assert.ok(fs.existsSync(path.join(ROOT, target)), `${target} exists`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, pkg.main)), 'main exists');
});

test('dist bundle is in sync with sources', () => {
  // tools/build.js embeds each source file verbatim, so a stale dist/ shows
  // up as a missing substring. CI also rebuilds and diffs; this catches it
  // locally with no git required.
  const dist = read('dist/vanilla-ui-kit.js');
  for (const f of ['core/core.js', 'datepicker/datepicker.js', 'toast/toast.js']) {
    assert.ok(dist.includes(read(f)), `dist embeds current ${f}`);
  }
  assert.ok(dist.startsWith('/*!'), 'bundle keeps its license banner');
  assert.ok(dist.includes(`vanilla-ui-kit v${pkg.version}`), 'banner carries the version');
});

test('dist stylesheets are in sync with component CSS', () => {
  assert.ok(read('dist/datepicker.css').includes(DatePicker.css));
  assert.ok(read('dist/toast.css').includes(Toast.css));
  const all = read('dist/vanilla-ui-kit.css');
  assert.ok(all.includes(DatePicker.css) && all.includes(Toast.css));
});

test('docs and metadata point at the canonical repo', () => {
  const canonical = 'vanilla-ui-kit/components';
  assert.ok(pkg.repository.url.includes(canonical));
  for (const f of ['README.md', 'toast/README.md', 'datepicker/README.md']) {
    const text = read(f);
    assert.ok(!/abdallahk|abdullah-life|you\/vanilla/.test(text), `${f} has no stale repo paths`);
    assert.ok(text.includes(`cdn.jsdelivr.net/gh/${canonical}`), `${f} CDN snippet uses canonical path`);
  }
});
