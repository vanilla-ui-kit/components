/**
 * Type definitions for Vanilla UI Kit Modal (`modal/modal.js`).
 * Browser global: `Modal`. UMD/CommonJS: `import Modal = require('vanilla-ui-kit/modal')`.
 */
import { DialogButton, FamilyStatics, LayerHandle, Theme } from './shared';

declare namespace Modal {
  /** Panel width: `'sm'` 360px · `'md'` 480px · `'lg'` 720px · `'full'`. */
  type Size = 'sm' | 'md' | 'lg' | 'full';

  /** Handle returned by `Modal.open()`: `{ el, close(result), update(opts) }`. */
  type Handle = LayerHandle<Options>;

  /** Footer button: `{ label, variant, onClick(h), close }`. Return `false` from `onClick` to stay open. */
  type Button = DialogButton<Handle>;

  /** Overridable UI strings (button captions etc.), for localisation. */
  interface Labels {
    /** OK button caption. */
    ok?: string;
    /** Cancel button caption. */
    cancel?: string;
    /** Accessible name of the ✕ button. */
    close?: string;
    /** Accessible fallback name of the dialog. */
    dialog?: string;
  }

  interface Options {
    /** Heading text (rendered with `textContent`). */
    title?: string;
    /** String (text by default), DOM element (adopted, put back on close), or HTML string with `html: true`. */
    content?: string | Element;
    /** Opt-in to render string content as trusted markup. Default `false`. */
    html?: boolean;
    /** Footer buttons. */
    buttons?: Button[];
    /** Panel size. Default `'md'`. */
    size?: Size;
    /** Allow Esc, backdrop click, and the ✕ button. Default `true`. */
    dismissible?: boolean;
    /** After the dialog is shown. */
    onOpen?: (handle: Handle) => void;
    /** After close — `result` is the closing button's `close` value, else `undefined`. */
    onClose?: (result: unknown) => void;
    /** Theme mode (per call or via defaults). Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless, no CSS injected. Default `true`. */
    styles?: boolean;
    /** Overridable UI strings. Default `{ ok, cancel, close, dialog }`. */
    labels?: Labels;
    /** Accessible name when there is no `title`. */
    ariaLabel?: string;
    /** Element to return focus to (defaults to `activeElement`). */
    opener?: HTMLElement;
  }

  /** Object form for `Modal.alert()`. */
  interface AlertOptions extends Options {
    /** Body text. */
    message?: string;
  }

  /** Object form for `Modal.confirm()`. Resolves `true` ONLY on the explicit confirm. */
  interface ConfirmOptions extends AlertOptions {
    /** Red confirm button. Default `false`. */
    danger?: boolean;
  }

  /** Object form for `Modal.prompt()`. Resolves the string, or `null` on cancel/Esc/backdrop. */
  interface PromptOptions extends AlertOptions {
    /** Initial input value. */
    value?: string;
    /** Input placeholder. */
    placeholder?: string;
    /** OK/Enter refuse an empty value. Default `false`. */
    required?: boolean;
  }
}

/** Instance wrapper for enhancing existing markup: `new Modal('#terms', opts)`. */
interface Modal {
  /** Open — adopts the element; puts it back (re-hidden) on close. Extra per-call options are merged. Chainable. */
  open(extra?: Modal.Options): this;
  /** Close; `result` is passed to `onClose`. Chainable. */
  close(result?: unknown): this;
  /** Whether this modal is currently open. */
  isOpen(): boolean;
}

interface ModalStatic extends FamilyStatics<Modal.Options, Modal> {
  /** Enhance an existing element as modal content. */
  new (target: string | Element, options?: Modal.Options): Modal;
  prototype: Modal;
  /** Open a modal. Returns a handle: `{ el, close(result), update(opts) }`. */
  open(options?: Modal.Options): Modal.Handle;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Modal | null;
  /** Message dialog with one OK button. */
  alert(messageOrOptions?: string | Modal.AlertOptions): Promise<void>;
  /** Confirm dialog. `true` ONLY on the explicit confirm — Esc / backdrop / ✕ resolve `false`. */
  confirm(messageOrOptions?: string | Modal.ConfirmOptions): Promise<boolean>;
  /** Prompt dialog. Input auto-focused, Enter submits; `null` on cancel/Esc/backdrop. */
  prompt(messageOrOptions?: string | Modal.PromptOptions): Promise<string | null>;
}

declare const Modal: ModalStatic;

export = Modal;
