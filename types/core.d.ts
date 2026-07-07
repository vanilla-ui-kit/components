/**
 * Type definitions for the Vanilla UI Kit convergence core (`core/core.js`).
 * Browser globals: `VanillaUI`, with `VC` as the short alias.
 * UMD/CommonJS: `import VC = require('vanilla-ui-kit/core')`.
 */
import { FamilyMember, Theme } from './shared';

declare namespace VC {
  /** Options for `VC.config()` — one call to theme every registered component. */
  interface ConfigOptions {
    /** Pin light/dark for every component via `<html data-theme>`; `'auto'` returns to detection. */
    theme?: Theme;
    /** Accent color mapped onto every component's accent variable (`--vdp-accent`, `--vt-accent`, …). */
    accent?: string;
    /** Corner radius mapped onto every component's radius variable. */
    radius?: string;
    /** Font stack mapped onto every component's font variable. */
    font?: string;
    /** CSS isolation namespace for the whole family. Set BEFORE the first render (styles inject once); `false` disables salting. */
    salt?: string | false;
  }

  /** One theme engine for the whole page — one `matchMedia` + one `MutationObserver`. */
  interface ThemeEngine {
    /** Resolve the current theme: `<html data-theme|data-bs-theme>` → `.dark`/`.light` class → OS `prefers-color-scheme`. */
    resolve(): 'light' | 'dark';
    /** Subscribe to live theme flips. Chainable. */
    watch(fn: (theme: 'light' | 'dark') => void): ThemeEngine;
    /** Unsubscribe a watcher registered with `watch()`. Chainable. */
    unwatch(fn: (theme: 'light' | 'dark') => void): ThemeEngine;
    /** Pin the page theme (stamps `<html data-theme>`, all components follow) or return to detection with `'auto'`. */
    set(theme: Theme): ThemeEngine;
  }

  /** Options for the shared popup positioning engine. */
  interface PositionOptions {
    /** Placement preference. Default `'auto'` (below when there is room, else above). */
    prefer?: 'auto' | 'below' | 'above';
    /** Gap in px between anchor and panel. Default `6`. */
    gap?: number;
    /** Viewport clamp padding in px. Default `8`. */
    pad?: number;
  }

  /** What `VC.position()` decided, so callers can set transform origins etc. */
  interface PositionResult {
    /** `true` when the panel was placed below the anchor. */
    below: boolean;
    /** `true` when positioned `fixed` (anchor lives in an open `<dialog>` top layer). */
    fixed: boolean;
    /** The anchor's bounding rect at decision time. */
    anchorRect: DOMRect;
    /** Resolved viewport-space left, before scroll offset. */
    left: number;
    /** Resolved viewport-space top, before scroll offset. */
    top: number;
  }
}

/** The optional convergence layer: registry, shared theme engine, popup positioning, deduped style injection, and one-call family theming. */
interface VCStatic {
  /** Core version, e.g. `'1.0.0'`. */
  readonly version: string;
  /** Registered components by name: `{ datepicker: DatePicker, toast: Toast, … }`. The same constructors are also exposed namespaced (`VC.DatePicker`, `VC.Toast`, …). */
  components: { [name: string]: FamilyMember };
  /** Deduped style injection (by id), inserted BEFORE page CSS so page rules of equal specificity win. Returns the created `<style>` or `null` when deduped / no DOM. */
  injectStyles(id: string, css: string): HTMLStyleElement | null;
  /** Shared theme engine for the whole page. */
  theme: VC.ThemeEngine;
  /** Shared popup placement: below/above flip, viewport clamp, `<dialog>` top-layer detection. Applies inline styles and returns what it decided (`null` without a DOM). */
  position(panel: HTMLElement, anchor: Element, opts?: VC.PositionOptions): VC.PositionResult | null;
  /** Register a component under `name` (also exposed as `VC.<DisplayName>`). Components self-register when VC is present; load order never matters. Chainable. */
  register(name: string, ctor: FamilyMember): this;
  /** Run every registered component's data-attribute init on new DOM. Returns everything created. */
  autoInit(root?: Element | Document): unknown[];
  /** Read the current config state. */
  config(): VC.ConfigOptions;
  /** One call to theme the whole family: `theme` stamps `<html data-theme>`, `salt` sets every component's namespace, visual keys are bridged onto each component's CSS variables. Chainable. */
  config(opts: VC.ConfigOptions): this;
}

declare const VC: VCStatic;

export = VC;
