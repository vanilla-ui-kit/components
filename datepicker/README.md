# VanillaDatePicker

A single-file, zero-dependency date picker for vanilla JavaScript. One `<script>`
tag, one line of JS (or none), and you have a beautiful calendar that follows your
page's light/dark theme automatically.

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/abdullah-life/vanilla-components/datepicker/datepicker.js"></script>

<input id="date">
<script>new DatePicker('#date')</script>
```

Or with zero JavaScript:

```html
<input data-datepicker data-format="DD/MM/YYYY" data-min="today">
```

Also works with CommonJS/AMD (`const DatePicker = require('./datepicker.js')`)
and is safe to import in SSR environments (no-op until used in a browser).

## Options

```js
new DatePicker('#date', {
  value: 'today',                  // Date | 'today' | string in `format` or ISO
  format: 'YYYY-MM-DD',            // tokens: YYYY YY MMMM MMM MM M DD D
  min: 'today',                    // earliest selectable date
  max: '2027-12-31',               // latest selectable date
  disabledDates: ['2026-12-25'],   // array of dates, or fn(date) => bool
  disabledDays: [0, 6],            // weekdays, 0 = Sunday … 6 = Saturday
  range: false,                    // range selection ("start – end" in one input)
  rangeSeparator: ' – ',
  panes: 2,                        // months shown side by side (1-3)
  presets: true,                   // quick-select rail; true = built-ins, or:
  // presets: [{ label: 'Next 14 days', range: () => [new Date(), addDays(14)] }],
  inline: false,                   // always-visible calendar (auto for non-inputs)
  locale: 'fr',                    // BCP-47 tag; defaults to the browser locale
  firstDay: 1,                     // 0-6; defaults to the locale's first weekday
  weekNumbers: false,              // ISO-8601 week number column
  theme: 'auto',                   // 'auto' | 'light' | 'dark'
  accent: '#0f766e',               // any CSS color
  todayButton: true,
  clearButton: true,
  autoClose: true,                 // close the popup after picking
  position: 'auto',                // 'auto' | 'below' | 'above'
  labels: { today: 'Heute', clear: 'Löschen' },  // UI strings for i18n

  onSelect: (value, formatted, dp) => {},  // value is a Date, or {start, end} in range mode
  onOpen:   (dp) => {},
  onClose:  (dp) => {},
  onClear:  (dp) => {},
  onMonthChange: (viewDate, dp) => {}
})
```

Every option (except function-valued ones) is also available as a data attribute
for auto-init, in kebab-case: `data-format`, `data-min`, `data-max`, `data-range`,
`data-panes`, `data-presets`, `data-inline`, `data-locale`, `data-first-day`,
`data-week-numbers`, `data-theme`, `data-accent`, `data-position`,
`data-disabled-days="0,6"`, `data-disabled-dates="2026-12-25,2026-12-26"`,
`data-auto-close`, `data-today-button`, `data-clear-button`, `data-value`.

A complete range picker with zero JavaScript:

```html
<input data-datepicker data-range data-panes="2"
       data-presets="last7,last30,thisMonth,lastMonth">
```

### Presets

`presets: true` shows the built-in set (Today, Yesterday, Last 7 days,
Last 30 days, This month, Last month — or Today/Yesterday/Tomorrow in
single-date mode). Pick a subset by key with `presets: 'last7,thisMonth'` or
`data-presets="…"`; available keys: `today`, `yesterday`, `tomorrow`, `last7`,
`last30`, `thisMonth`, `lastMonth`, `thisYear`. Or bring your own:

```js
presets: [
  { label: 'This week',  range: () => [monday, sunday] },
  { label: 'Q3',         range: ['2026-07-01', '2026-09-30'] },
]
```

Functions are re-evaluated at click time, so relative presets stay fresh. In
single-date mode use `{ label, date }`. The active preset is highlighted when
the current value matches it.

Note: with `panes > 1` the month/year quick views (clicking the masthead) are
disabled — arrow navigation and keyboard paging still work — and the footer's
Today button is omitted (the presets rail owns quick jumps there).

## Methods

```js
const dp = new DatePicker('#date')

dp.open()                     // show the popup
dp.close()                    // hide it
dp.toggle()
dp.getDate()                  // Date | {start, end} | null
dp.setDate('2026-08-01')      // Date | string | 'today' | null; range: [start, end] or {start, end}
dp.setDate(d, {silent: true}) // ...without firing onSelect/change
dp.clear()
dp.setOptions({min: 'today'}) // change any option on the fly
dp.destroy()                  // remove the panel and all listeners

DatePicker.get('#date')       // instance for an element, or null
DatePicker.autoInit(rootEl)   // init [data-datepicker] added after page load
DatePicker.formatDate(new Date(), 'DD MMM YYYY', 'de')
DatePicker.parseDate('01/02/2026', 'DD/MM/YYYY')
```

## Events

The bound input fires native `input`/`change` events plus:

```js
input.addEventListener('datepicker:select', e => e.detail.value)
// also: datepicker:open, datepicker:close, datepicker:clear
```

## Theming

`theme: 'auto'` (the default) resolves the theme from, in order:

1. `<html data-theme="dark">` or `data-bs-theme` (Bootstrap)
2. `<html class="dark">` (Tailwind-style)
3. the OS `prefers-color-scheme`

and re-resolves live when any of those change — no wiring needed. Set
`theme: 'light' | 'dark'` to pin it.

All colors are CSS custom properties, so you can restyle from your own CSS:

```css
.vdp {
  --vdp-accent: #b45309;     /* primary color: selection, today, buttons */
  --vdp-radius: 8px;         /* panel corner radius */
  --vdp-cell: 44px;          /* day cell size */
  --vdp-bg: …; --vdp-text: …; --vdp-muted: …;
  --vdp-surface: …;          /* hover fill */
  --vdp-faint: …;            /* borders */
  --vdp-on-accent: …;        /* text on the accent color */
  --vdp-font: …; --vdp-display-font: …;
}
```

Scope overrides per theme with `.vdp[data-theme="dark"] { … }`.

## Keyboard & accessibility

- `↓` on the input opens the calendar and moves focus into the grid
- Arrow keys move by day/week, `PageUp`/`PageDown` by month, `Shift+PageUp`/`Shift+PageDown` by year, `Home`/`End` to week bounds
- `Enter`/`Space` selects, `Escape` closes and returns focus to the input; tabbing out of the widget closes it
- ARIA dialog/grid roles, `aria-selected`, `aria-current="date"` on today, month changes announced politely, `prefers-reduced-motion` respected
- Typing a date by hand always works; invalid text (including impossible dates like `2026-02-30`) reverts on blur, and typed values respect `min`/`max`/disabled rules

## Notes & limitations

- The popup is positioned in page coordinates from `document.body` (or from the
  nearest open `<dialog>`, which it joins in the top layer). If your `<body>`
  has a CSS `transform`/`filter`, absolute coordinates shift — use `inline`
  mode inside such containers.
- Use `type="text"` inputs. On `type="date"` the browser enforces ISO values
  and may show its own picker UI on mobile.

## Recipes

**Two linked inputs (check-in / check-out):**

```js
const checkOut = new DatePicker('#out', { min: 'today' })
const checkIn = new DatePicker('#in', {
  min: 'today',
  onSelect: d => checkOut.setOptions({ min: d })
})
```

**Global defaults for every picker on the page:**

```js
DatePicker.defaults.format = 'DD/MM/YYYY'
DatePicker.defaults.firstDay = 1
```

## Browser support

Evergreen browsers. Uses `Intl` for all localization, CSS grid, and
`color-mix` (with graceful fallback) — no polyfills, no build step.

## License

MIT
