# Vanilla UI Kit Upload

A single-file, zero-dependency file-upload dropzone with a managed file
list for vanilla JavaScript. Click, drag-drop, or paste to add files;
per-file validation, image thumbnails, real progress bars, retry, and
remove — in the same visual family as
[Vanilla UI Kit Toast](../toast/README.md).

**[Live examples →](./examples.html)**

## Quick start

```html
<script src="https://cdn.jsdelivr.net/gh/vanilla-ui-kit/components/upload/upload.js"></script>

<div id="attachments"></div>
<script>
  new Upload('#attachments', {
    multiple: true,
    accept: 'image/*,.pdf',
    maxSize: 5 * 1024 * 1024,          // 5 MB, human-readable in errors
    upload: { action: '/api/upload' }, // built-in XHR uploader
    autoUpload: true
  })
</script>
```

Also available via the family bundle (`dist/vanilla-ui-kit.js`), npm
(`vanilla-ui-kit/upload`), or by copying this one file. CommonJS/AMD
supported; SSR-safe (`new Upload(null)` returns an inert no-op handle).

## Two ways to mount

```js
new Upload('#box', opts)          // container: a REAL <input type=file> is
                                  // created inside — with `name`, it still
                                  // submits with a parent <form> (no-JS /
                                  // form fallback) when autoUpload is off

new Upload(fileInput, opts)       // enhance an existing <input type=file>:
                                  // wrapped and visually hidden, but kept
                                  // fully functional for its form;
                                  // destroy() restores it exactly
```

In enhance mode `multiple` and `accept` are adopted from the input's own
attributes when not passed as options.

## Options

```js
new Upload('#box', {
  multiple: false,        // false = a new pick REPLACES the current file
  accept: 'image/*,.pdf', // set on the input AND validated on drop/paste
  maxSize: 2097152,       // bytes; error shows a human size ('2 MB')
  maxFiles: 5,            // cap on managed files
  text: null,             // full dropzone prompt (overrides drop/browse labels)
  listPosition: 'below',  // 'below' | 'none' (render your own via callbacks)
  autoUpload: false,      // true = upload immediately on add
  upload: null,           // fn or config — see "Upload contract" below
  name: 'attachment',     // created input's name= for the form fallback
  theme: 'auto',          // 'auto' | 'light' | 'dark'
  styles: true,           // false = headless (no CSS injected)
  onAdd:      (file, inst) => {},
  onRemove:   (file, inst) => {},
  onProgress: (file, pct, inst) => {},        // pct: 0..100
  onDone:     (file, response, inst) => {},
  onError:    (file, error, inst) => {},      // validation AND upload errors
  labels: { drop: 'Drop files here or', browse: 'browse', /* …see source */ }
})
```

### Instance API

```js
up.addFiles(filesOrFileList)  // same validation path as drop/pick/paste
up.removeFile(file)           // aborts an in-flight upload, revokes preview
up.uploadAll()                // starts every 'pending' file
                              //   → Promise<getFiles()> when all settle
up.getFiles()                 // → [{ file, status, response, error }]
                              //   status: 'pending'|'uploading'|'done'|'error'
up.clear()                    // remove everything
up.enable() / up.disable()
up.destroy()                  // enhance mode: restores the original input

Upload.get(el)                // instance registered on an element
Upload.formatBytes(1536)      // → '1.5 KB'
```

## Upload contract

`upload` takes either **a function** or **a config object**.

**Function** — you own the transport. It receives the `File` and a progress
callback taking a ratio **0..1**, and must return a Promise: resolve =
done (the resolution value becomes `response`), reject = error (the row
shows the message with a retry button).

```js
upload: function (file, onProgress) {
  return myApi.put('/files', file, { onUploadProgress: function (e) {
    onProgress(e.loaded / e.total)
  }})
}
```

**Config object** — the built-in `XMLHttpRequest` uploader with real
`upload.onprogress` events. The file is sent as `multipart/form-data`:

```js
upload: {
  action: '/api/upload',     // required — POST target
  method: 'POST',            // default
  fieldName: 'file',         // default — FormData field the file rides in
  headers: { 'X-CSRF-Token': '…' },
  withCredentials: false
}
```

2xx resolves; the response body is JSON-parsed when possible (else the raw
text). Non-2xx rejects with an `Error` carrying `.status` and `.response`
— a JSON body's `message` becomes the row's error text.

> **Server-side validation caveat:** `accept`, `maxSize`, and `maxFiles`
> are **client-side conveniences only**. Anyone can bypass them with
> `curl`, and a file's reported MIME type is whatever the client claims.
> Always re-validate type (by content, not extension), size, and count on
> the server; treat every uploaded byte as untrusted input.

## Behavior

- **Add files by**: clicking the zone (or Enter/Space while focused),
  drag-and-drop (dragenter/leave counting — nested elements don't flicker
  the highlight), or **pasting** while the dropzone has focus.
- Validation failures (type / size / count) render an inline per-file
  error row in danger colors — nothing throws, valid files in the same
  batch still land.
- Image files get a thumbnail (object URL, revoked on remove; FileReader
  fallback). Names and sizes render via `textContent` — never as markup.
- When `autoUpload` is off, the managed list is mirrored back onto the
  real input (where `DataTransfer` is supported), so a plain form submit
  sends dragged/pasted files too.
- `multiple: false` treats each new pick as a replacement.

## Accessibility

- The dropzone is a labelled `role="button"` (`tabindex="0"`, Enter/Space
  activate), described by the visible prompt via `aria-describedby`.
- The file list is a labelled `<ul>`; a visually-hidden **polite live
  region** announces added / removed / uploaded / failed files.
- Progress bars are `role="progressbar"` with live `aria-valuenow`;
  remove/retry buttons carry per-file `aria-label`s.
- `:focus-visible` rings only; `prefers-reduced-motion` disables all
  transitions.

## Theming

Auto light/dark with the family's resolution order: `<html data-theme>` /
`data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved
live. Pin per instance with `theme: 'dark'`.

All colors are CSS custom properties:

```css
.vup {
  --vup-accent: #b45309;   /* zone highlight, progress, browse link */
  --vup-danger: …; --vup-success: …;
  --vup-bg: …; --vup-text: …; --vup-muted: …; --vup-faint: …;
  --vup-radius: 12px; --vup-font: …; --vup-shadow: …;
}
```

With the VC core loaded, `VC.config({ accent: '#b45309' })` themes uploads
and every other family component in one call.

**CSS isolation:** the root renders as `class="vup vc1"` and structural
rules ship salted (`.vup.vc1 .vup-zone { … }`), so host-page design
systems can't override the widget — while the `--vup-*` variable
overrides above keep working (var definitions are deliberately unsalted).
Custom token: `Upload.salt = 'acme'` before the first instance; disable
with `Upload.salt = false`.

## Headless

```js
Upload.defaults.styles = false   // never inject CSS
```

You keep the full behavior (drag counting, validation, uploads, ARIA) and
this markup contract — style it entirely from your own CSS. Our stylesheet
is available as a starting point: `Upload.css` (string).

```
.vup[data-theme="dark"].is-drag.is-disabled
  .vup-zone[role=button]           ← .vup-zone-icon + .vup-prompt > .vup-browse
  .vup-live                        ← visually-hidden polite live region
  input.vup-native                 ← the real file input, visually hidden
  ul.vup-list
    li.vup-item[data-status=pending|uploading|done|error]
      .vup-thumb > img|svg
      .vup-meta > .vup-name + .vup-sub|.vup-errmsg + .vup-bar > .vup-fill
      .vup-retry                   ← only after an upload error
      .vup-remove
```

## Auto-init

```html
<div data-vup data-vup-multiple="true" data-vup-accept="image/*"
     data-vup-max-size="2097152" data-vup-action="/api/upload"
     data-vup-auto-upload="true"></div>
<!-- or enhance: <input type="file" data-vup multiple> -->
```

## License

MIT
