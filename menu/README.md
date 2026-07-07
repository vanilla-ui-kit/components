# Vanilla UI Kit Menu

A single-file, zero-dependency dropdown action menu for vanilla JavaScript.
One `<script>` tag, one line of JS. Full WAI-ARIA menu-button keyboard
support, one level of submenus, and context menus at pointer coordinates.
Follows your page's light/dark theme automatically, in the same visual
family as [Vanilla UI Kit Toast](../toast/README.md) and
[DatePicker](../datepicker/README.md).

Menus are for **actions** — if you're picking a value, you want Select.

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/menu/menu.js"></script>
<button id="more">More</button>
<script>
  new Menu('#more', {
    items: [
      { label: 'Rename', hint: 'F2', onSelect: function (item) { rename(); } },
      { label: 'Duplicate', onSelect: duplicate },
      { type: 'separator' },
      { label: 'Delete', danger: true, onSelect: confirmDelete }
    ]
  })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/menu`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
var menu = new Menu(trigger, opts)   // trigger: element or selector of a <button>
menu.open()                          // also: trigger click / ArrowDown / Enter / Space
menu.close()
menu.toggle()
menu.update(items)                   // swap the item list (re-renders if open)
menu.destroy()

Menu.create(trigger, opts)           // constructor alias
Menu.get(el)                         // instance for a trigger, or null
Menu.open(x, y, items | opts)        // one-shot menu at viewport coordinates
Menu.closeAll()
Menu.autoInit(root?)                 // activate [data-vmn] triggers (see below)
Menu.defaults.placement = 'bottom-end'   // change any default once
```

**Items** — each entry of `items` is one of:

```js
{ label: 'Rename',               // TEXT — rendered with textContent
  icon: '<svg …>…</svg>',        // optional; TRUSTED SVG markup, like Toast's icons
  hint: '⌘D',                    // optional right-aligned kbd/hint text
  danger: true,                  // red, for destructive actions
  disabled: true,                // aria-disabled, skipped by arrow keys
  onSelect: function (item, menu) {} }
{ type: 'separator' }
{ label: 'Share', items: [ … ] } // ONE level of submenu (hover / ArrowRight)
```

Selecting an item also dispatches a bubbling `menu:select` CustomEvent on
the trigger with `{ item, menu }` in `detail`.

**Context menus** — open at pointer coordinates (flips inward at viewport
edges):

```js
el.addEventListener('contextmenu', function (e) {
  e.preventDefault()
  Menu.open(e.clientX, e.clientY, [
    { label: 'Copy' },
    { label: 'Paste', disabled: !canPaste }
  ])
})
```

## Options

| Option          | Default          | Description                                          |
| --------------- | ---------------- | ---------------------------------------------------- |
| `items`         | `[]`             | Item list (see above).                               |
| `placement`     | `'bottom-start'` | `bottom`/`top` + `-start`/`-end`; flips when out of room, clamps to the viewport. |
| `closeOnSelect` | `true`           | Close after an item is activated.                    |
| `theme`         | `'auto'`         | `'auto'` \| `'light'` \| `'dark'`.                   |
| `styles`        | `true`           | `false` = headless, no CSS ever injected.            |
| `onOpen`        | `null`           | `fn(menu)`.                                          |
| `onClose`       | `null`           | `fn(menu)`.                                          |

## Declarative

`Menu.autoInit()` runs on load and activates every `[data-vmn]` trigger.
The attribute value is a selector to a `<template>` (or any element)
holding the items:

```html
<button data-vmn="#file-menu">File</button>

<template id="file-menu">
  <button>New file</button>
  <button data-hint="⌘S">Save</button>
  <hr>
  <li data-label="Share">
    <ul>
      <li>Copy link</li>
      <li data-value="email">Email</li>
    </ul>
  </li>
  <button data-danger>Delete</button>
</template>
```

`<hr>` is a separator; every other child is an item. The label comes from
`data-label` or the child's own text; `data-hint` / `data-value` map
through; `data-danger` and `data-disabled` are flags; a nested `<ul>` (or
`<menu>`) makes the entry a submenu of its children. Listen for
`menu:select` on the trigger to react.

## Behavior & accessibility

Full [WAI-ARIA menu-button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/):
the trigger gets `aria-haspopup="menu"` + `aria-expanded`; the panel is
`role="menu"` with `role="menuitem"` items, `role="separator"` rules, and
`aria-disabled` on disabled items. Only one root menu is open at a time;
outside clicks close it.

| Key                       | Action                                             |
| ------------------------- | -------------------------------------------------- |
| ArrowDown / Enter / Space | On the trigger: open, focus the first item.        |
| ArrowUp                   | On the trigger: open, focus the last item.         |
| ArrowDown / ArrowUp       | Move focus; skips disabled items, wraps.           |
| Home / End                | First / last enabled item.                         |
| Enter / Space             | Activate the focused item.                         |
| ArrowRight                | Open the focused item's submenu, focus first item. |
| ArrowLeft                 | Close the submenu, refocus its parent item.        |
| Esc                       | Close and refocus the trigger.                     |
| Tab                       | Close and move on.                                 |
| Printable characters      | Typeahead — jump to items by their first letters.  |

`:focus-visible` outlines and `prefers-reduced-motion` are respected.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin it per menu with `theme: 'dark'` or family-wide via
`Menu.defaults.theme`.

All colors are CSS custom properties:

```css
.vmn {
  --vmn-accent: #b45309;   /* focus outline */
  --vmn-danger: …;         /* danger items */
  --vmn-bg: …; --vmn-surface: …; --vmn-text: …; --vmn-muted: …; --vmn-faint: …;
  --vmn-radius: 12px; --vmn-font: …; --vmn-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes menus
and every other family component in one call.

**CSS isolation:** panels render as `class="vmn vc1"` and all structural
rules ship salted (`.vmn.vc1 .vmn-item { … }`), so host-page design systems
can't override the menu — while the `--vmn-*` variable overrides above keep
working (var definitions are deliberately unsalted). Custom token:
`Menu.salt = 'acme'` before the first menu opens; disable with
`Menu.salt = false`.

## Headless

```js
Menu.defaults.styles = false   // never inject CSS
```

You keep the full behavior (positioning, keyboard, typeahead, ARIA) and the
markup contract below — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `Menu.css` (string) or
[`dist/menu.css`](../dist/menu.css) (file).

```
.vmn[data-theme="dark"].vmn-open     ← root panel; .vmn-sub on flyouts
  .vmn-item                          ← <button role="menuitem">
    .vmn-icon                        ← inline SVG, only when `icon` given
    .vmn-label
    .vmn-hint                        ← only when `hint` given
    .vmn-caret                       ← only on submenu parents
  .vmn-item.vmn-danger
  .vmn-item[aria-disabled="true"]
  .vmn-sep                           ← separator
```

## License

MIT
