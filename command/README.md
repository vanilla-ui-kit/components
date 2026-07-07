# Vanilla UI Kit Command Palette

A single-file, zero-dependency Ctrl/Cmd+K command palette for vanilla
JavaScript. One `<script>` tag, register your commands, done. Follows your
page's light/dark theme automatically, in the same visual family as
[Vanilla UI Kit Toast](../toast/README.md) and
[DatePicker](../datepicker/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/command/command.js"></script>
<script>
  CommandPalette.register([
    { id: 'save',  label: 'Save file', hint: 'Ctrl+S', group: 'Actions',
      action: function () { save(); } },
    { id: 'docs',  label: 'Open documentation', group: 'Navigation',
      keywords: 'help manual', action: function () { location.href = '/docs'; } }
  ])
  // that's it — Ctrl/Cmd+K opens the palette
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/command`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

### Static registry (zero setup)

The statics proxy a lazily created default instance — nothing is built or
bound until you first call one of them:

```js
CommandPalette.register(command)     // or an array; re-registering an id replaces it in place
CommandPalette.unregister('save')
CommandPalette.open()
CommandPalette.close()
CommandPalette.toggle()
CommandPalette.defaults.placeholder = 'What do you need?'   // change any default once
```

Any element with `data-command-open` opens the default palette on click
(wired automatically on DOM ready, or via `CommandPalette.autoInit(root)`).

### Instances

```js
var palette = new CommandPalette({
  commands: [...],           // initial commands (see shape below)
  hotkey: 'mod+k',           // see hotkey syntax; false = no global binding
  placeholder: 'Type a command…',
  maxResults: 12,            // cap on filtered results (empty query shows all)
  emptyText: 'No matching commands',
  recent: false,             // true = session-only "Recent" group (last 5 run)
  theme: 'auto',             // 'auto' | 'light' | 'dark'
  styles: true,              // false = headless (no CSS injected)
  onOpen:  function (palette) {},
  onClose: function (palette) {},
  onRun:   function (command, palette) {}
})

palette.register(command | commands[])
palette.unregister(id)
palette.open() / .close() / .toggle()
palette.destroy()            // unbind the hotkey, remove the panel
```

### Command shape

| Key        | Type              | Meaning                                                       |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `id`       | string (required) | Unique key; re-registering it replaces the command in place.   |
| `label`    | string            | The visible row text (searched, highlighted). Defaults to `id`.|
| `hint`     | string            | Right-aligned shortcut text, e.g. `'Ctrl+S'`. Display only.    |
| `group`    | string            | Section header the command is listed under (empty query view). |
| `icon`     | string            | **Trusted** inline SVG markup, like Toast's icons.             |
| `keywords` | string[] or string| Extra match terms (not displayed, never highlighted).          |
| `action`   | function          | `action(command, palette)` — runs on Enter/click, after close. |
| `disabled` | boolean           | Shown grayed out; skipped by keyboard navigation, not runnable.|

The palette closes **before** calling `action`, so the action can open a
modal or move focus without fighting the palette. With `recent: true` the
last 5 run commands appear in a "Recent" group at the top of the empty-query
view — in memory only, per page load, nothing is stored.

### Hotkey syntax

Simple `modifier+…+key` strings: `'mod+k'` (default), `'ctrl+shift+p'`,
`'alt+space'`. `mod` means **Cmd on macOS, Ctrl everywhere else**; other
modifiers are `ctrl`, `shift`, `alt`/`option`, `meta`/`cmd`. Set
`hotkey: false` to disable the global binding and open programmatically.

The hotkey is bound on `window` and deliberately fires even while an input,
textarea, or contenteditable has focus — it is the palette's only global
binding, so ordinary typing is never intercepted.

### Matching

Case- and diacritic-insensitive **subsequence** match over `label` +
`keywords` (spaces in the query are ignored). Scoring favors consecutive
runs, word-starts (so `'sf'` finds *Save File*), and matches near the start
of the label; results are sorted by score and capped at `maxResults`.
Matched label characters are highlighted. With an empty query all commands
are shown, grouped in registration order.

## Keyboard

| Key       | Action                                                    |
| --------- | --------------------------------------------------------- |
| `↑` / `↓` | Move the active command (wraps, scrolls into view).        |
| `Enter`   | Run the active command.                                    |
| `Esc`     | Clears the query first if non-empty; **a second Esc closes**. |
| `Tab`     | Trapped — focus stays in the search input (combobox pattern). |

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it with `CommandPalette.defaults.theme = 'dark'`.

All colors are CSS custom properties:

```css
.vcmd {
  --vcmd-accent: #b45309;   /* highlight marks, active icon */
  --vcmd-bg: …; --vcmd-surface: …; --vcmd-text: …;
  --vcmd-muted: …; --vcmd-faint: …;
  --vcmd-backdrop: rgba(24,25,32,.42);
  --vcmd-shadow: …; --vcmd-radius: 14px; --vcmd-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes the
palette and every other family component in one call.

**CSS isolation:** the overlay renders as `class="vcmd vc1"` and all
structural rules ship salted (`.vcmd.vc1 .vcmd-option { … }`), so host-page
design systems can't override the palette — while the `--vcmd-*` variable
overrides above keep working (var definitions are deliberately unsalted).
Custom token: `CommandPalette.salt = 'acme'` before the first open; disable
with `CommandPalette.salt = false`.

## Headless

```js
CommandPalette.defaults.styles = false   // never inject CSS
```

You keep the full behavior (fuzzy matching, keyboard model, ARIA, recent
group) and the markup contract below — style it entirely from your own CSS.
Our stylesheet is available as a starting point: `CommandPalette.css`
(string) or [`dist/command.css`](../dist/command.css) (file).

```
.vcmd[data-theme="dark"].vcmd-open      ← .vcmd-out while leaving
  .vcmd-backdrop
  .vcmd-panel                           ← role=dialog
    .vcmd-search
      .vcmd-glass                       ← magnifier SVG
      .vcmd-input                       ← role=combobox
    .vcmd-list                          ← role=listbox
      .vcmd-group                       ← section header (role=presentation)
      .vcmd-option.is-active            ← role=option; .is-disabled
        .vcmd-icon                      ← only when `icon` given
        .vcmd-label                     ← .vcmd-mark spans wrap matches
        .vcmd-hint                      ← only when `hint` given
      .vcmd-empty                       ← only when nothing matches
    .vcmd-footer                        ← ↑↓ navigate · ↵ run · esc close
```

## Accessibility

- ARIA combobox/listbox pattern: the search input is `role="combobox"` with
  `aria-expanded`, `aria-controls`, and `aria-activedescendant` pointing at
  the active `role="option"` row; group headers are presentational.
- Focus is held in the input for the whole session (clicks inside the panel
  don't steal it; `Tab` is trapped); on close, focus returns to the element
  that was focused before opening.
- The panel is `role="dialog" aria-modal="true"`; the footer key legend is
  `aria-hidden` (the same keys are conveyed by the combobox semantics).
- Reduced motion is respected (`prefers-reduced-motion`).

## License

MIT
