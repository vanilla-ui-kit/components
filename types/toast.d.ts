/**
 * Type definitions for Vanilla UI Kit Toast (`toast/toast.js`).
 * Browser global: `Toast`. UMD/CommonJS: `import Toast = require('vanilla-ui-kit/toast')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Toast {
  /** Toast flavor — picks the icon, color, and ARIA role. */
  type Type = 'info' | 'success' | 'error' | 'warning' | 'loading';

  /** Stack position: one stack per position, newest toast nearest the screen edge. */
  type Position =
    | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

  /** One action button on the toast. */
  interface Action {
    /** Button caption. */
    label: string;
    /** Called with the toast handle when clicked. */
    onClick?: (toast: Handle) => void;
  }

  /** Overridable UI strings. */
  interface Labels {
    /** Accessible name of the × button. Default `'Dismiss'`. */
    dismiss?: string;
  }

  interface Options {
    /** Toast flavor. Default `'info'`. */
    type?: Type;
    /** Optional bold title line. */
    title?: string;
    /** Auto-dismiss after this many ms; `0` = sticky until dismissed. Default `4000`. */
    duration?: number;
    /** Stack position. Default `'bottom-right'`. */
    position?: Position;
    /** Show the × button. Default `true`. */
    dismissible?: boolean;
    /** One action button, e.g. `{ label: 'Undo', onClick: (t) => {} }`. */
    action?: Action;
    /** Message is TEXT by default; opt in for trusted markup. Default `false`. */
    html?: boolean;
    /** Called when the toast is dismissed. */
    onDismiss?: (toast: Handle) => void;
    /** Per-stack cap; the oldest toast is evicted beyond it. Default `5`. */
    max?: number;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** Overridable UI strings. */
    labels?: Labels;
  }

  /** Messages for `Toast.promise()` — strings or `fn(result | reason) → string`. */
  interface PromiseMessages<T> {
    /** Message while pending. Default `'Working…'`. */
    loading?: string;
    /** Message on resolve. Default `'Done'`. */
    success?: string | ((result: T) => string);
    /** Message on reject. Default `'Something went wrong'`. */
    error?: string | ((reason: unknown) => string);
  }

  /** Handle returned by `Toast.show()` and the type shorthands. */
  interface Handle {
    /** The toast element. */
    el: HTMLElement;
    /** Dismiss this toast now. */
    dismiss(): void;
    /** Replace the message (and any options) in place — e.g. promote a loading toast. */
    update(message?: string | null, options?: Options): Handle;
  }
}

/** Note: `Toast` has no data-attribute init, so the family `autoInit` static is absent. */
interface ToastStatic extends Omit<FamilyStatics<Toast.Options>, 'autoInit'> {
  /** Show a toast. Returns a handle: `{ el, dismiss(), update() }`. */
  show(message: string, options?: Toast.Options): Toast.Handle;
  /** `Toast.show` with `type: 'info'`. */
  info(message: string, options?: Toast.Options): Toast.Handle;
  /** `Toast.show` with `type: 'success'`. */
  success(message: string, options?: Toast.Options): Toast.Handle;
  /** `Toast.show` with `type: 'error'`. */
  error(message: string, options?: Toast.Options): Toast.Handle;
  /** `Toast.show` with `type: 'warning'`. */
  warning(message: string, options?: Toast.Options): Toast.Handle;
  /** `Toast.show` with `type: 'loading'` — sticky (duration 0) until updated or dismissed. */
  loading(message: string, options?: Toast.Options): Toast.Handle;
  /** A loading toast that resolves into success or error. Returns the ORIGINAL promise. */
  promise<T>(promise: Promise<T>, messages?: Toast.PromiseMessages<T>, options?: Toast.Options): Promise<T>;
  /** Dismiss every toast in every stack. */
  dismissAll(): void;
}

declare const Toast: ToastStatic;

export = Toast;
