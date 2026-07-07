/**
 * Compile-only exercise of the public API surface. Never executed — `tsc
 * --noEmit` over this file is the acceptance gate for the definitions.
 */
import {
  VC, DatePicker, Toast, Tooltip, Menu, Modal, Tabs, Select, CommandPalette,
  Form, PhoneInput, Drawer, Autocomplete, Slider, Popconfirm, Segmented,
  Upload, NumberInput, Progress, Pagination, EmptyState, Rating
} from './index';
import UploadNS = require('./upload');

// ---- convergence core -------------------------------------------------
VC.config({ theme: 'dark', accent: '#b45309', radius: '10px', font: 'Inter, sans-serif' });
const resolved: 'light' | 'dark' = VC.theme.resolve();
VC.theme.set('auto');
VC.register('thing', { displayName: 'Thing', version: '1.0.0' });
void resolved;

// ---- family contract statics ------------------------------------------
const familyMembers = [
  DatePicker, Toast, Tooltip, Menu, Modal, Tabs, Select, CommandPalette,
  Form, PhoneInput, Drawer, Autocomplete, Slider, Popconfirm, Segmented,
  Upload, NumberInput, Progress, Pagination, EmptyState, Rating
] as const;
for (const m of familyMembers) {
  const v: string = m.version;
  const rc: string = m.rootClass;
  const css: string = m.css;
  const accentVar: string = m.themeVars.accent;
  const scopes: string[] = m.varScopes;
  void [v, rc, css, accentVar, scopes];
}

// ---- pure helpers ------------------------------------------------------
const parsed = PhoneInput.parse('+971501234567');
const e164: string = parsed.e164;
const ok: boolean = PhoneInput.isValid('+14155552671', 'us');
const flag: string = PhoneInput.flag('ae');
const formattedPhone: string = PhoneInput.format('4155552671', 'us');
void [e164, ok, flag, formattedPhone];

const n: number | null = NumberInput.parse('1,234.5');
const money: string = NumberInput.format(1234.5, { precision: 2 });
void [n, money];

const day: string = DatePicker.formatDate(new Date(2026, 6, 3), 'YYYY-MM-DD');
const date: Date | null = DatePicker.parseDate('2026-07-03', 'YYYY-MM-DD');
void [day, date];

// ---- instances and handles ---------------------------------------------
const toast = Toast.success('Saved', { duration: 2000, position: 'top-center' });
toast.update('Still saved');
Toast.promise(Promise.resolve(42), { success: (r) => `Got ${r}` });

const dp = new DatePicker('#date', { range: true });
new Tooltip('#btn', { placement: 'top', trigger: 'hover', interactive: false });
new Menu('#trigger', { items: [{ label: 'Copy' }, { type: 'separator' }, { label: 'Delete', danger: true }] });
Menu.open(10, 20, [{ label: 'Paste' }]);

async function dialogs(): Promise<void> {
  const yes: boolean = await Modal.confirm('Sure?');
  const text: string | null = await Modal.prompt({ message: 'Name?', value: 'x' });
  await Modal.alert('Done');
  const answered: boolean = await Popconfirm.ask('#del', { message: 'Delete?', danger: true });
  void [yes, text, answered];
}
void dialogs;

const tabs = new Tabs('#tabs', { activation: 'manual', onChange: (i: number) => void i });
tabs.select(1);

const select = new Select('#sel', { searchable: true, multiple: true, onChange: (v) => void v });
const selVal: string | string[] | null = select.getValue();
void selVal;

CommandPalette.register([{ id: 'x', label: 'Do X', action: () => {} }]);
CommandPalette.toggle();

const form = Form.create('#form', {
  fields: [{ name: 'email', type: 'email', required: true }],
  onSubmit: () => Promise.resolve()
});
const submitted: Promise<boolean> = form.submit();
void submitted;

const drawer = Drawer.open({ side: 'left', title: 'Cart', dismissible: true });
drawer.close('done');

new Autocomplete('#search', {
  source: (q: string) => Promise.resolve([{ value: q, label: q.toUpperCase() }]),
  debounce: 200
});

const slider = new Slider('#range', { value: [20, 80], tooltip: 'always', format: (v) => `$${v}` });
const sv: number | [number, number] = slider.getValue();
void sv;

const seg = new Segmented('#seg', { options: ['Day', 'Week'], value: 'Week' });
seg.setValue('Day', { silent: true });

const up = new Upload('#drop', {
  multiple: true,
  maxSize: 5 * 1024 * 1024,
  upload: (file, onProgress) => { onProgress(0.5); return Promise.resolve({ id: file.name }); }
});
const entries: Promise<UploadNS.Entry[]> = up.uploadAll();
void entries;
const human: string = Upload.formatBytes(1536);
void human;

const num = new NumberInput('#qty', { prefix: '$', precision: 2, step: 10 });
num.stepUp();
const nv: number | null = num.getValue();
void nv;

const bar = Progress.bar('#p', { value: 10, showValue: true });
bar.set(50);
bar.done();
Progress.spinner('#s', { size: 24 }).remove();
Progress.skeleton('#card', { lines: 4, avatar: true }).release();
Progress.skeleton.release('#card');

const pg = new Pagination('#pager', { total: 97, perPage: 10, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` });
pg.setPage(3);

const es = EmptyState.render('#list', { icon: 'search', title: 'No results', action: { label: 'Reset' } });
es.update({ title: 'Still nothing' }).remove();

const rt = new Rating('#stars', { half: true, value: 3.5, onHover: (v: number | null) => void v });
rt.setValue(4.5);

void dp;

// ---- wrong usage must not compile ---------------------------------------
// @ts-expect-error — duration is a number, not a string
Toast.show('x', { duration: 'long' });
// @ts-expect-error — placement is a literal union
new Tooltip('#a', { placement: 'diagonal' });
// @ts-expect-error — Modal.confirm resolves boolean, not string
const wrong: Promise<string> = Modal.confirm('x');
void wrong;
// @ts-expect-error — pages/total are numbers
new Pagination('#p', { pages: 'twelve' });
// @ts-expect-error — Rating value is a number
new Rating('#r', { value: 'three' });
