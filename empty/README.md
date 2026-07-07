# Vanilla UI Kit EmptyState

A single-file, zero-dependency empty-state block for vanilla JavaScript —
the friendly placeholder for "no messages", "no results", "something broke".
Four built-in line-style illustrations, an accent action, generous
whitespace. Follows your page's light/dark theme automatically, in the same
visual family as [Vanilla UI Kit Toast](../toast/README.md) and
[Tabs](../tabs/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/empty/empty.js"></script>

<div id="list"></div>

<script>
  EmptyState.render('#list', {
    icon: 'inbox',
    title: 'No messages yet',
    description: 'Anything sent to you will land here.',
    action: { label: 'Compose', onClick: () => compose() }
  })
</script>
```

Or zero-JS, with data attributes:

```html
<div data-ves data-ves-icon="search" data-ves-title="No results"
     data-ves-description="Try a different search term.">
  <button data-ves-action onclick="clearFilters()">Clear filters</button>
</div>
```

The child `<button data-ves-action>` is adopted as the accent button —
its own listeners stay attached.

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/empty`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (no-op without a DOM).

## API

```js
const empty = EmptyState.render('#target', {
  icon: 'inbox',            // 'inbox' | 'search' | 'error' | 'folder'
                            // …or a TRUSTED inline-SVG string ('<svg …>')
  title: 'No results',      // TEXT (rendered with textContent)
  description: '…',         // TEXT by default; html: true opts in to markup
  html: false,              // applies to description only
  action:          { label: 'New project', onClick: (h) => {} },  // accent button
  secondaryAction: { label: 'Learn more',  onClick: (h) => {} },  // quiet link-button
  size: 'md',               // 'sm' | 'md'
  theme: 'auto',            // 'auto' | 'light' | 'dark'
  styles: true              // false = headless (no CSS injected)
})
// → handle: { el, update(opts), remove() }

empty.update({ description: 'Still nothing.' })  // merge + re-render in place
empty.remove()                                   // take the block back out

new EmptyState(target, opts)   // alias of render — same handle back
EmptyState.create(target, opts)
EmptyState.get(el)             // → handle bound to the target (or handle.el)
EmptyState.autoInit(root?)     // init every [data-ves] under root
```

Custom SVG strings are injected verbatim — pass only markup you trust,
never user input. The four built-ins are drawn in the family's 1.5px-stroke
line style, sitting on a muted illustration circle.

## Behavior

- Centered column layout: circle + icon, title, description, action row.
  The icon is `aria-hidden` — the title carries the meaning.
- `action` renders as a solid accent `<button>`, `secondaryAction` as a
  quiet link-button; both get family focus-visible rings and respect
  reduced motion.
- `size: 'sm'` tightens paddings and shrinks the illustration for cards,
  table bodies, and sidebars.
- Re-rendering onto the same target replaces the previous block (the old
  handle is removed first).

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live.
Pin one block with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.ves {
  --ves-accent: #b45309;   /* action button, quiet action, focus rings */
  --ves-text: …; --ves-muted: …; --ves-faint: …;
  --ves-circle: …;         /* the illustration circle */
  --ves-on-accent: …;      /* text on the accent button */
  --ves-radius: 10px; --ves-font: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes empty
states and every other family component in one call.

**CSS isolation:** blocks render as `class="ves ves-md vc1"` and all
structural rules ship salted (`.ves.vc1 .ves-title { … }`), so host-page
design systems can't override them — while the `--ves-*` variable overrides
above keep working (var definitions are deliberately unsalted). Custom
token: `EmptyState.salt = 'acme'` before the first render; disable with
`EmptyState.salt = false`.

## Headless

```js
EmptyState.render('#list', { title: 'Empty', styles: false })
```

You keep the behavior (rendering, adoption, theme tracking) and the markup
contract below — style it entirely from your own CSS. Our stylesheet is
available as a starting point: `EmptyState.css` (string).

```
.ves.ves-md[data-theme="dark"]     ← .ves-sm for size: 'sm'
  .ves-art                         ← illustration circle + inline SVG
  .ves-title                       ← only when `title` given
  .ves-desc                        ← only when `description` given
  .ves-actions                     ← only when any action given
    button.ves-action              ← accent button (or adopted button)
    button.ves-action-quiet        ← secondaryAction
```

## License

MIT
