'use strict';
/*
 * Node-side test suite — zero dependencies, runs with `npm test` (node --test).
 *
 * Everything here must hold in an environment with no DOM: the public API
 * surface, the pure helpers, SSR no-op behaviour, and that the committed
 * dist/ bundle is in sync with the sources it is built from.
 *
 * Adding a component: add one row to FAMILY (and a specifics test below if
 * the component has pure helpers or notable SSR behaviour).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const pkg = require('../package.json');
const VC = require('../core/core.js');
const bundle = require('../dist/vanilla-ui-kit.js');

// [display name, source file, root class, required API function names]
const FAMILY = [
  ['DatePicker', 'datepicker/datepicker.js', 'vdp', ['create', 'formatDate', 'parseDate', 'autoInit']],
  ['Toast', 'toast/toast.js', 'vt', ['show', 'info', 'success', 'error', 'warning', 'loading', 'promise', 'dismissAll']],
  ['Tooltip', 'tooltip/tooltip.js', 'vtt', ['create', 'get', 'autoInit']],
  ['Menu', 'menu/menu.js', 'vmn', ['create', 'get', 'open', 'closeAll', 'autoInit']],
  ['Modal', 'modal/modal.js', 'vmd', ['open', 'alert', 'confirm', 'prompt', 'get', 'autoInit']],
  ['Tabs', 'tabs/tabs.js', 'vtb', ['create', 'get', 'autoInit']],
  ['Select', 'select/select.js', 'vsel', ['create', 'get', 'autoInit']],
  ['CommandPalette', 'command/command.js', 'vcmd', ['register', 'unregister', 'open', 'close', 'toggle', 'autoInit']],
  ['Form', 'form/form.js', 'vfm', ['create', 'get', 'autoInit']],
  ['PhoneInput', 'phone/phone.js', 'vph', ['create', 'get', 'autoInit', 'parse', 'format', 'isValid', 'flag']],
  ['Drawer', 'drawer/drawer.js', 'vdr', ['open', 'create', 'get', 'autoInit']],
  ['Segmented', 'segmented/segmented.js', 'vsg', ['create', 'get', 'autoInit']],
  ['Progress', 'progress/progress.js', 'vpg', ['bar', 'spinner', 'skeleton', 'autoInit']],
  ['Popconfirm', 'popconfirm/popconfirm.js', 'vpc', ['ask', 'create', 'get', 'autoInit']],
  ['Rating', 'rating/rating.js', 'vrt', ['create', 'get', 'autoInit']],
  ['Autocomplete', 'autocomplete/autocomplete.js', 'vac', ['create', 'get', 'autoInit']],
  ['Upload', 'upload/upload.js', 'vup', ['create', 'get', 'autoInit', 'formatBytes']],
  ['Slider', 'slider/slider.js', 'vsld', ['create', 'get', 'autoInit']],
  ['NumberInput', 'number/number.js', 'vnum', ['create', 'get', 'autoInit', 'parse', 'format']],
];
const components = FAMILY.map(([name, file, root, api]) =>
  ({ name, file, root, api, mod: require(path.join(ROOT, file)) }));

test('family contract: every component honours it', () => {
  for (const { name, file, root, api, mod } of components) {
    assert.ok(mod, `${file} loads in Node`);
    for (const fn of api) {
      assert.equal(typeof mod[fn], 'function', `${name}.${fn}`);
    }
    assert.equal(mod.version, pkg.version, `${name}.version matches package.json`);
    // VC.register aliases via displayName, falling back to the function name.
    assert.equal(mod.displayName || mod.name, name, `${name} display/function name`);
    assert.equal(mod.rootClass, root, `${name}.rootClass`);
    assert.equal(typeof mod.css, 'string', `${name}.css`);
    assert.ok(mod.css.length > 500, `${name}.css is non-trivial`);
    assert.ok(mod.css.includes(root), `${name}.css mentions its root class`);
    assert.equal(mod.salt, 'vc1', `${name} shares the family salt`);
    assert.equal(typeof mod.themeVars, 'object', `${name}.themeVars`);
    for (const key of ['accent', 'radius', 'font']) {
      assert.ok(mod.themeVars[key], `${name}.themeVars.${key}`);
    }
    assert.ok(Array.isArray(mod.varScopes) && mod.varScopes.length, `${name}.varScopes`);
    assert.equal(typeof mod.defaults, 'object', `${name}.defaults`);
    // autoInit is optional (imperative-only components like Toast skip it),
    // but when present it must be SSR-safe.
    if (mod.autoInit) assert.doesNotThrow(() => mod.autoInit(), `${name}.autoInit is SSR-safe`);
  }
});

test('core API surface', () => {
  for (const fn of ['register', 'autoInit', 'config', 'position', 'injectStyles']) {
    assert.equal(typeof VC[fn], 'function', `VC.${fn}`);
  }
  assert.equal(typeof VC.theme.resolve, 'function');
  assert.equal(VC.version, pkg.version);
});

test('bundle exports the whole family', () => {
  const expected = ['VC', 'VanillaUI', ...components.map((c) => c.name)].sort();
  assert.deepEqual(Object.keys(bundle).sort(), expected);
  assert.equal(bundle.VanillaUI, bundle.VC);
  for (const { name } of components) {
    assert.ok(bundle[name], `bundle.${name}`);
    assert.equal(bundle[name].version, pkg.version);
  }
});

test('DatePicker specifics: formatDate / parseDate round-trip', () => {
  const DatePicker = components[0].mod;
  assert.equal(DatePicker.formatDate(new Date(2026, 6, 3), 'YYYY-MM-DD'), '2026-07-03');
  assert.equal(DatePicker.formatDate(new Date(2026, 0, 9), 'DD/MM/YYYY'), '09/01/2026');

  const d = DatePicker.parseDate('2026-07-03', 'YYYY-MM-DD');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 6);
  assert.equal(d.getDate(), 3);
  assert.equal(DatePicker.formatDate(d, 'YYYY-MM-DD'), '2026-07-03');
  assert.equal(DatePicker.parseDate('bogus', 'YYYY-MM-DD'), null);
  assert.equal(DatePicker.parseDate('', 'YYYY-MM-DD'), null);
});

test('Toast specifics: SSR no-op returns a working handle', () => {
  const Toast = components[1].mod;
  const h = Toast.info('hello from Node');
  assert.equal(h.el, null);
  assert.doesNotThrow(() => h.update({ message: 'still fine' }));
  assert.doesNotThrow(() => h.dismiss());
  assert.doesNotThrow(() => Toast.dismissAll());
});

test('Tooltip specifics: SSR no-op instance', () => {
  const Tooltip = components[2].mod;
  const t = Tooltip.create('#nope');
  for (const fn of ['show', 'hide', 'toggle', 'destroy']) {
    assert.doesNotThrow(() => t[fn](), `tooltip.${fn} in Node`);
  }
  assert.doesNotThrow(() => t.update('new content'));
  assert.equal(Tooltip.get(null), null);
});

test('Menu specifics: SSR no-op instance and one-shot open', () => {
  const Menu = components[3].mod;
  const m = Menu.create(null, { items: [{ label: 'x' }] });
  for (const fn of ['open', 'close', 'toggle', 'destroy']) {
    assert.doesNotThrow(() => m[fn](), `menu.${fn} in Node`);
  }
  assert.doesNotThrow(() => m.update([{ label: 'y' }]));
  assert.doesNotThrow(() => Menu.open(10, 10, [{ label: 'z' }]));
  assert.doesNotThrow(() => Menu.closeAll());
});

test('Modal specifics: SSR promises resolve to their cancel values', async () => {
  const Modal = components[4].mod;
  const h = Modal.open({ title: 'x' });
  assert.equal(h.el, null);
  assert.doesNotThrow(() => h.close());
  assert.equal(await Modal.alert('x'), undefined);
  assert.equal(await Modal.confirm('x'), false);
  assert.equal(await Modal.prompt('x'), null);
});

test('Tabs specifics: SSR no-op instance', () => {
  const Tabs = components[5].mod;
  const t = Tabs.create(null, { tabs: [{ label: 'a', content: 'A' }] });
  assert.doesNotThrow(() => t.select(0));
  assert.doesNotThrow(() => t.getActive());
  assert.doesNotThrow(() => t.destroy());
});

test('Select specifics: SSR no-op instance', () => {
  const Select = components[6].mod;
  const s = Select.create(null, { options: ['a', 'b'] });
  for (const fn of ['open', 'close', 'enable', 'disable', 'refresh', 'destroy']) {
    assert.doesNotThrow(() => s[fn](), `select.${fn} in Node`);
  }
  assert.doesNotThrow(() => s.setValue('a'));
  assert.doesNotThrow(() => s.getValue());
});

test('CommandPalette specifics: SSR static registry no-ops', () => {
  const CommandPalette = components[7].mod;
  assert.doesNotThrow(() => CommandPalette.register({ id: 'test', label: 'Test' }));
  assert.doesNotThrow(() => CommandPalette.open());
  assert.doesNotThrow(() => CommandPalette.toggle());
  assert.doesNotThrow(() => CommandPalette.close());
  assert.doesNotThrow(() => CommandPalette.unregister('test'));
});

test('Form specifics: pure validators and SSR handle', async () => {
  const Form = components[8].mod;
  assert.equal(Form.validators.email('a@b.co'), null);
  assert.equal(typeof Form.validators.email('not-an-email'), 'string');
  assert.equal(Form.validators.required('x'), null);
  assert.equal(typeof Form.validators.required(''), 'string');

  const f = Form.create(null, { fields: [{ name: 'x' }] });
  for (const fn of ['reset', 'destroy', 'clearErrors', 'enable', 'disable']) {
    assert.doesNotThrow(() => f[fn](), `form.${fn} in Node`);
  }
  assert.doesNotThrow(() => f.setValue('x', 1));
  assert.doesNotThrow(() => f.getValue('x'));
  assert.doesNotThrow(() => f.watch('x', () => {}));
  await f.submit();
});

test('PhoneInput specifics: pure parse/format/validate/flag helpers', () => {
  const PhoneInput = components[9].mod;
  assert.ok(PhoneInput.countries.length >= 240, 'full country table');
  assert.equal(PhoneInput.isValid('+14155552671', 'us'), true);
  assert.equal(PhoneInput.isValid('+1415', 'us'), false);
  const parsed = PhoneInput.parse('+971501234567');
  assert.equal(parsed.country, 'ae');
  assert.equal(parsed.valid, true);
  assert.equal(parsed.e164, '+971501234567');
  assert.equal(PhoneInput.format('4155552671', 'us'), '(415) 555-2671');
  for (const iso of ['us', 'gb', 'ae', 'jp', 'br', 'in']) {
    assert.ok(PhoneInput.flag(iso).startsWith('<svg'), `flag(${iso}) is SVG`);
  }
});

test('Drawer specifics: SSR no-op handles', () => {
  const Drawer = components[10].mod;
  const h = Drawer.open({ title: 'x' });
  assert.equal(h.el, null);
  assert.doesNotThrow(() => h.update({ title: 'y' }));
  assert.doesNotThrow(() => h.close());
  const d = Drawer.create(null);
  assert.doesNotThrow(() => d.open());
  assert.doesNotThrow(() => d.close());
  assert.doesNotThrow(() => d.destroy());
});

test('Segmented specifics: SSR no-op instance', () => {
  const Segmented = components[11].mod;
  const s = Segmented.create(null, { options: ['a', 'b'] });
  for (const fn of ['getValue', 'enable', 'disable', 'destroy']) {
    assert.doesNotThrow(() => s[fn](), `segmented.${fn} in Node`);
  }
  assert.doesNotThrow(() => s.setValue('b'));
  assert.doesNotThrow(() => s.update(['c', 'd']));
});

test('Progress specifics: SSR no-op handles for bar/spinner/skeleton', () => {
  const Progress = components[12].mod;
  const b = Progress.bar(null, { value: 10 });
  assert.doesNotThrow(() => b.set(50));
  assert.doesNotThrow(() => b.done());
  assert.doesNotThrow(() => b.remove());
  assert.doesNotThrow(() => Progress.spinner(null).remove());
  assert.doesNotThrow(() => Progress.skeleton(null).release());
  assert.doesNotThrow(() => Progress.skeleton.release(null));
});

test('Popconfirm specifics: SSR ask resolves false', async () => {
  const Popconfirm = components[13].mod;
  assert.equal(await Popconfirm.ask(null, 'sure?'), false);
  const p = Popconfirm.create(null, { message: 'x' });
  assert.doesNotThrow(() => p.show());
  assert.doesNotThrow(() => p.hide());
  assert.doesNotThrow(() => p.destroy());
});

test('Rating specifics: SSR no-op instance', () => {
  const Rating = components[14].mod;
  const r = Rating.create(null, { max: 5, half: true });
  for (const fn of ['getValue', 'enable', 'disable', 'destroy']) {
    assert.doesNotThrow(() => r[fn](), `rating.${fn} in Node`);
  }
  assert.doesNotThrow(() => r.setValue(3.5));
});

test('Autocomplete specifics: SSR no-op instance', () => {
  const Autocomplete = components[15].mod;
  const a = Autocomplete.create(null, { source: ['x', 'y'] });
  for (const fn of ['open', 'close', 'getInput', 'destroy']) {
    assert.doesNotThrow(() => a[fn](), `autocomplete.${fn} in Node`);
  }
  assert.doesNotThrow(() => a.setSource([]));
});

test('Upload specifics: SSR no-op instance and formatBytes', async () => {
  const Upload = components[16].mod;
  assert.equal(typeof Upload.formatBytes(1536), 'string');
  const u = Upload.create(null);
  assert.deepEqual(u.getFiles(), []);
  for (const fn of ['clear', 'enable', 'disable', 'destroy']) {
    assert.doesNotThrow(() => u[fn](), `upload.${fn} in Node`);
  }
  await u.uploadAll();
});

test('Slider specifics: SSR no-op instance', () => {
  const Slider = components[17].mod;
  const s = Slider.create(null, { value: [20, 80] });
  for (const fn of ['getValue', 'enable', 'disable', 'destroy']) {
    assert.doesNotThrow(() => s[fn](), `slider.${fn} in Node`);
  }
  assert.doesNotThrow(() => s.setValue([10, 90]));
});

test('NumberInput specifics: pure parse/format helpers', () => {
  const NumberInput = components[18].mod;
  assert.equal(NumberInput.parse('1,234.5'), 1234.5);
  assert.equal(NumberInput.format(1234.5, { precision: 2 }), '1,234.50');
  const n = NumberInput.create(null, { min: 0, max: 10 });
  for (const fn of ['getValue', 'stepUp', 'stepDown', 'enable', 'disable', 'destroy']) {
    assert.doesNotThrow(() => n[fn](), `number.${fn} in Node`);
  }
  assert.doesNotThrow(() => n.setValue(5));
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
  for (const f of ['core/core.js', ...components.map((c) => c.file)]) {
    assert.ok(dist.includes(read(f)), `dist embeds current ${f}`);
  }
  assert.ok(dist.startsWith('/*!'), 'bundle keeps its license banner');
  assert.ok(dist.includes(`vanilla-ui-kit v${pkg.version}`), 'banner carries the version');
});

test('dist stylesheets are in sync with component CSS', () => {
  let all = '';
  for (const { name, file, mod } of components) {
    const sheet = path.basename(path.dirname(file)) + '.css';
    assert.ok(read(`dist/${sheet}`).includes(mod.css), `dist/${sheet} embeds ${name}.css`);
    all += mod.css;
  }
  const combined = read('dist/vanilla-ui-kit.css');
  for (const { name, mod } of components) {
    assert.ok(combined.includes(mod.css), `vanilla-ui-kit.css embeds ${name}.css`);
  }
});

test('docs and metadata point at the canonical repo', () => {
  const canonical = 'vanilla-ui-kit/components';
  assert.ok(pkg.repository.url.includes(canonical));
  const readmes = ['README.md', ...components.map((c) => path.dirname(c.file) + '/README.md')];
  for (const f of readmes) {
    const text = read(f);
    assert.ok(!/abdallahk|abdullah-life|you\/vanilla/.test(text), `${f} has no stale repo paths`);
    assert.ok(text.includes(`cdn.jsdelivr.net/gh/${canonical}`), `${f} CDN snippet uses canonical path`);
  }
});
