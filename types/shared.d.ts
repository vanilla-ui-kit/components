/**
 * Vanilla UI Kit — shared type contracts (types only, no runtime).
 *
 * Every component in the family follows one convergence contract: the same
 * statics (`version`, `rootClass`, `themeVars`, `varScopes`, `salt`, `css`,
 * `defaults`, `autoInit`) and the same theming model. The interfaces here are
 * reused by every per-component declaration file.
 */

/** Theme mode shared by every component. `'auto'` resolves from `<html data-theme>` / `data-bs-theme` / `.dark` class → `prefers-color-scheme`, re-resolved live. */
export type Theme = 'auto' | 'light' | 'dark';

/** Vertical placement preference for anchored popups. Default `'auto'` (below when there is room, else above). */
export type PanelPosition = 'auto' | 'below' | 'above';

/** Map of the shared theme keys onto the component's own CSS custom properties (e.g. `{ accent: '--vdp-accent' }`). `VC.config()` writes through these. */
export interface ThemeVars {
  /** CSS variable receiving `VC.config({ accent })`. */
  accent: string;
  /** CSS variable receiving `VC.config({ radius })`. */
  radius: string;
  /** CSS variable receiving `VC.config({ font })`. */
  font: string;
}

/** Options bag accepted by `setValue`-style methods. */
export interface SilentOptions {
  /** `true` = apply the change without firing callbacks/events. */
  silent?: boolean;
}

/**
 * The convergence contract every family component exposes.
 *
 * @template TDefaults - the component's options shape (`Ctor.defaults`).
 * @template TCreated  - what `autoInit` creates (instances or handles).
 */
export interface FamilyStatics<TDefaults extends object = Record<string, unknown>, TCreated = unknown> {
  /** Component version, e.g. `'1.0.0'`. */
  readonly version: string;
  /** Registry name used by the VC core (e.g. `'DatePicker'`). */
  readonly displayName: string;
  /** The component's CSS scope class (`'vdp'`, `'vt'`, …). */
  readonly rootClass: string;
  /** Shared theme keys → the component's CSS variables. */
  readonly themeVars: ThemeVars;
  /** Selectors where the CSS variables are DEFINED (unsalted on purpose), light and dark. */
  readonly varScopes: string[];
  /** CSS isolation namespace token baked into structural selectors. Default `'vc1'`; set before the first render; `false` = plain unsalted selectors. */
  salt: string | false;
  /** The component's stylesheet string, rendered with the current salt (headless starting point / build-pipeline extraction). */
  readonly css: string;
  /** Page-wide defaults — change any option once (e.g. `Ctor.defaults.styles = false`). */
  defaults: TDefaults;
  /** Run the component's data-attribute init on `root` (default: `document`). Returns whatever it created. */
  autoInit(root?: Element | Document): TCreated[];
}

/**
 * Loose registration shape accepted by `VC.register()` — the four statics a
 * new atom exposes to join the family. All optional so any component
 * constructor (or plain object component like `Toast`) is assignable.
 */
export interface FamilyMember {
  /** Registry name used for the `VC.<Name>` alias. */
  displayName?: string;
  /** Component version string. */
  version?: string;
  /** Its CSS scope class. */
  rootClass?: string;
  /** Shared theme keys → its CSS variables. */
  themeVars?: ThemeVars;
  /** Where its variables are defined (unsalted). */
  varScopes?: string[];
  /** CSS isolation namespace token (`false` to disable). */
  salt?: string | false;
  /** Its separable stylesheet string. */
  css?: string;
  /** Page-wide defaults object. */
  defaults?: object;
  /** Optional data-attribute init, run by `VC.autoInit()`. */
  autoInit?(root?: Element | Document): unknown;
}

/**
 * Footer button spec shared by Modal and Drawer.
 * @template THandle - the layer handle passed to `onClick`.
 */
export interface DialogButton<THandle> {
  /** Button caption (rendered as text). */
  label: string;
  /** Visual style. Default `'default'`. */
  variant?: 'primary' | 'default' | 'danger';
  /** Click handler. Return `false` to keep the layer open. */
  onClick?: (handle: THandle) => boolean | void;
  /** Close the layer after the click; this value is passed to `onClose(result)`. */
  close?: unknown;
}

/**
 * Handle returned by `Modal.open()` / `Drawer.open()`.
 * @template TOptions - the layer's options shape accepted by `update()`.
 */
export interface LayerHandle<TOptions extends object> {
  /** The root element (`<dialog>` where supported). */
  el: HTMLElement;
  /** Close the layer; `result` is passed to `onClose`. */
  close(result?: unknown): void;
  /** Merge new options and re-render in place. */
  update(options: TOptions): this;
}
