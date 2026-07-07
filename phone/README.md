# Vanilla UI Kit Phone Input

A single-file, zero-dependency international phone input for vanilla
JavaScript, in the spirit of Maz-UI's phone number input: country button
with an SVG flag and dial code, searchable country dropdown, as-you-type
national formatting, built-in validation and E.164 output. Follows your
page's light/dark theme automatically, in the same visual family as
[Vanilla UI Kit DatePicker](../datepicker/README.md) and
[Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/phone/phone.js"></script>
<input id="phone">
<script>
  new PhoneInput('#phone', {
    country: 'ae',
    onChange: function (v) { console.log(v.e164, v.valid) }
  })
</script>
```

Or zero-JS via data attributes:

```html
<input data-vph data-country="gb" data-preferred="gb,ie,us">
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/phone`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (constructing without a DOM returns an inert handle,
and the pure helpers below work fine in Node).

## API

### Instance

```js
var phone = new PhoneInput(target, opts)
// target: an <input> (coerced to type="tel"), or any container —
// then the control is built inside it, with a hidden input carrying
// opts.name for form submission.

phone.getValue()        // → { e164, national, country, valid }
phone.setValue('+971501234567')  // sets country (from dial code) + number
phone.setCountry('ae')  // switch the flag/dial code
phone.getCountry()      // → 'ae'
phone.setDisabled(true)
phone.open() / .close() // country dropdown
phone.focus()
phone.destroy()         // unwraps the original input, removes everything

PhoneInput.create(target, opts)   // constructor alias
PhoneInput.get(el)                // instance registry lookup
PhoneInput.autoInit(root?)        // init every [data-vph] under root
```

Typing `+` followed by a dial code auto-detects the country
(longest-prefix match, area-code aware for shared codes like +1/+7/+44)
and switches the flag; pasting `+9715…` does the same. Input is
restricted to digits and `+ ( ) - . space`.

### Pure helpers (work in Node)

```js
PhoneInput.parse('+971501234567')
// → { country: 'ae', dialCode: '+971', national: '50 123 4567',
//     e164: '+971501234567', valid: true }

PhoneInput.format('4155552671', 'us')   // → '(415) 555-2671'
PhoneInput.isValid('+14155552671', 'us') // → true
PhoneInput.exampleNumber('gb')           // → '1234 567891'
PhoneInput.countries                     // the full data table
PhoneInput.flag('ae')                    // → '<svg …>' (20×15)
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `country` | `'us'` | Initial ISO-3166 alpha-2 country |
| `preferredCountries` | `[]` | iso2s pinned to the top of the dropdown |
| `onlyCountries` | `null` | Whitelist of iso2s |
| `excludeCountries` | `null` | Blacklist of iso2s |
| `nationalMode` | `true` | Display national formatting (output is always E.164); `false` shows `+971 50 123 4567` |
| `placeholder` | `'auto'` | `'auto'` = example number for the country, string, or `false` |
| `showDialCode` | `true` | `+971` shown in the country button |
| `searchable` | `true` | Search box in the dropdown |
| `validate` | `'blur'` | `'blur'` = red/green only after first blur (Maz-style); `'live'` = immediately |
| `validator` | `null` | `fn({country, digits, e164}) → bool` — overrides the length check |
| `name` | `null` | Adds a hidden input carrying the E.164 for forms |
| `disabled` | `false` | Start disabled |
| `theme` | `'auto'` | `'auto'` \| `'light'` \| `'dark'` |
| `styles` | `true` | `false` = headless, no CSS injected |
| `labels` | `{…}` | `country`, `search`, `noResults`, `invalid` |
| `onChange` | `null` | `fn({e164, national, country, valid})` on every edit |
| `onCountryChange` | `null` | `fn(iso2)` |
| `onValidityChange` | `null` | `fn(valid)` when validity flips |

## Country data & validation caveats

The embedded table covers **242** ITU countries/territories:
`[iso2, name, dialCode, order, nationalLengths, formatPattern, areaCodes]`,
one line each. Dial codes are ITU-accurate. **Validation is pragmatic**:
a number is "valid" when its national digit count (after stripping one
trunk `0`, except Italy/Vatican) matches the country's allowed lengths.
That catches the common cases but is *not* libphonenumber — it doesn't
know which prefixes are assigned. Use `opts.validator` to plug in a
strict checker.

Shared dial codes (`+1`, `+7`, `+44`, `+61`, `+590`, `+599`, `+39`,
`+358`, `+212`, `+47`) are disambiguated by embedded area-code prefixes
(all Canadian area codes ship in the table); with no area match the
primary owner wins (`+1` → US, `+7` → RU, `+44` → GB).

## Flags

Flags are **flagpack-style simplified, optimized for small sizes** —
they render at 20×15 in the button, so emblems are deliberately reduced
(a plain 5-point star stands in for detailed crests). Rather than
embedding artwork, a compact declarative DSL per country drives a tiny
renderer (stripes, cantons, discs, stars, crescents, crosses, diagonals,
polygons — see the comment above `FLAGS` in [phone.js](./phone.js)).
Fifteen famous flags whose geometry the DSL can't approximate (US, GB,
BR, IN, MX, ES, PT, AR, ZA, KR, CA, AU, NZ, IL, NP) are hand-written
fragments. Every country in the table has flag art; anything unknown to
`PhoneInput.flag(iso2)` falls back to a neutral rounded badge showing
the uppercase iso2. All flag SVG is generated by the component's own
code; country names are rendered with `textContent` — no third-party
markup ever hits `innerHTML`.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved
live (through `VC.theme` when the core is loaded). Pin per instance with
`theme: 'dark'`.

All colors are CSS custom properties:

```css
.vph, .vph-panel {
  --vph-accent: #b45309;  /* focus ring, selected option, caret */
  --vph-danger: …; --vph-success: …;   /* validation states */
  --vph-bg: …; --vph-text: …; --vph-muted: …; --vph-faint: …;
  --vph-radius: 10px; --vph-font: …; --vph-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the
phone input and every other family component in one call.

**CSS isolation:** the control renders as `class="vph vc1"` and all
structural rules ship salted (`.vph.vc1 .vph-input { … }`), so host-page
design systems can't override the widget — while the `--vph-*` variable
overrides above keep working (var definitions are deliberately
unsalted). Custom token: `PhoneInput.salt = 'acme'` before the first
instance; disable with `PhoneInput.salt = false`.

## Headless

```js
PhoneInput.defaults.styles = false   // never inject CSS
```

You keep the full behavior (detection, formatting, validation, dropdown,
ARIA) and the markup contract below — style it entirely from your own
CSS. Our stylesheet is available as a starting point: `PhoneInput.css`
(string, live with the current salt).

```
.vph[data-theme=dark].vph-invalid     ← .vph-valid when valid (after blur)
  .vph-country[aria-expanded]         ← button: flag + dial + caret
    .vph-flag > svg                   ← 20×15 flag
    .vph-dial
    .vph-caret
  input.vph-input[type=tel]
  input[type=hidden]                  ← only when opts.name given
  .vph-sr[aria-live=polite]           ← validation announcements
.vph-panel                            ← portaled to <body> while open
  .vph-search > input[role=combobox]
  .vph-list[role=listbox]
    .vph-opt[role=option].is-active.is-selected
    .vph-sep / .vph-empty
```

## Accessibility

- The tel input is a real `<input type="tel">` with `autocomplete="tel"`
  preserved (or added when absent).
- The country button carries `aria-label` ("Choose country: … +971"),
  `aria-haspopup="listbox"` and `aria-expanded`.
- The dropdown is an ARIA listbox driven by `aria-activedescendant`:
  ArrowUp/Down, Home/End, Enter, Escape, plus a search input; without
  the search box, typeahead over country names kicks in.
- Invalid state sets `aria-invalid` on the input and announces the
  message through a polite live region — only after blur by default, so
  users aren't scolded mid-typing.
- `:focus-visible` outlines everywhere; `prefers-reduced-motion` is
  respected.

## License

MIT
