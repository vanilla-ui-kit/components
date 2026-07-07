/**
 * Type definitions for Vanilla UI Kit Drawer (`drawer/drawer.js`).
 * Browser global: `Drawer`. UMD/CommonJS: `import Drawer = require('vanilla-ui-kit/drawer')`.
 */
import { DialogButton, FamilyStatics, LayerHandle, Theme } from './shared';

declare namespace Drawer {
  /** Which edge the drawer slides in from. */
  type Side = 'right' | 'left' | 'top' | 'bottom';

  /** Handle returned by `Drawer.open()`: `{ el, close(result), update(opts) }`. */
  type Handle = LayerHandle<Options>;

  /** Footer button, same shape as Modal's. Return `false` from `onClick` to stay open. */
  type Button = DialogButton<Handle>;

  interface Options {
    /** Edge to slide from. Default `'right'`. */
    side?: Side;
    /** Heading text. */
    title?: string;
    /** String (TEXT by default), DOM element (adopted, put back on close), or markup with `html: true`. */
    content?: string | Element;
    /** Width for left/right, height for top/bottom (CSS length). Default `'360px'`. */
    size?: string;
    /** Optional footer buttons. */
    buttons?: Button[];
    /** Esc, backdrop click, and the ✕ button. Default `true`. */
    dismissible?: boolean;
    /** Content is TEXT by default; opt in for trusted markup. Default `false`. */
    html?: boolean;
    /** After the drawer is shown. */
    onOpen?: (handle: Handle) => void;
    /** After close — `result` is the `close` value of the button used. */
    onClose?: (result: unknown) => void;
    /** Theme mode (per call or via defaults). Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }
}

/** Instance wrapper for enhancing existing markup: `new Drawer('#cart-panel', opts)`. */
interface Drawer {
  /** Open — `.open({...extra})` merges per-call options. Chainable. */
  open(extra?: Drawer.Options): this;
  /** Close; `result` is passed to `onClose`. Chainable. */
  close(result?: unknown): this;
  /** Whether this drawer is currently open. */
  isOpen(): boolean;
  /** Restore the element, drop the instance. */
  destroy(): void;
}

interface DrawerStatic extends FamilyStatics<Drawer.Options, Drawer> {
  /** Enhance an existing element as drawer content. */
  new (target: string | Element, options?: Drawer.Options): Drawer;
  prototype: Drawer;
  /** Open a drawer. Returns a handle: `{ el, close(result), update(opts) }`. */
  open(options?: Drawer.Options): Drawer.Handle;
  /** Constructor alias. */
  create(target: string | Element, options?: Drawer.Options): Drawer;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Drawer | null;
}

declare const Drawer: DrawerStatic;

export = Drawer;
