/**
 * Type definitions for Vanilla UI Kit Popconfirm (`popconfirm/popconfirm.js`).
 * Browser global: `Popconfirm`. UMD/CommonJS: `import Popconfirm = require('vanilla-ui-kit/popconfirm')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Popconfirm {
  /** Panel side relative to the trigger (auto-flips when out of room). */
  type Placement = 'top' | 'bottom' | 'left' | 'right';

  /** Overridable button captions (e.g. for localization). */
  interface Labels {
    /** Confirm button. Default `'OK'`. */
    ok?: string;
    /** Cancel button. Default `'Cancel'`. */
    cancel?: string;
  }

  interface Options {
    /** The question. Rendered as TEXT by default. */
    message?: string;
    /** Optional bold line above the message. */
    title?: string;
    /** Confirm caption. Defaults to `labels.ok` (`'OK'`). */
    okLabel?: string;
    /** Cancel caption. Defaults to `labels.cancel` (`'Cancel'`). */
    cancelLabel?: string;
    /** Red OK button + red icon. Default `false`. */
    danger?: boolean;
    /** Panel side. Default `'top'`. */
    placement?: Placement;
    /** `false` = no icon; a string = custom TRUSTED markup. Default `true`. */
    icon?: boolean | string;
    /** px number or CSS length; default fits content. */
    width?: number | string;
    /** Message is TEXT by default; opt in for markup. Default `false`. */
    html?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Overridable button captions. */
    labels?: Labels;
    /** Persistent binding: after OK (the original click also proceeds). */
    onConfirm?: (trigger: Element) => void;
    /** Persistent binding: dismissed (Esc, outside click, Cancel). */
    onCancel?: () => void;
  }
}

/** Persistent binding: intercepts the element's click until confirmed. */
interface Popconfirm {
  /** Show the confirm panel now. */
  show(): void;
  /** Hide the panel. */
  hide(): void;
  /** Unbind the click interceptor and remove everything. */
  destroy(): void;
}

interface PopconfirmStatic extends FamilyStatics<Popconfirm.Options, Popconfirm> {
  /** Bind a persistent confirm to an element: the original click (submit, navigation, inline onclick) is frozen until confirmed. */
  new (target: string | Element, options?: Popconfirm.Options): Popconfirm;
  prototype: Popconfirm;
  /** One-shot: anchor a confirm to an element, get a `Promise<boolean>`. Resolves `false` without a DOM (the safe answer). */
  ask(target: string | Element, options?: string | Popconfirm.Options): Promise<boolean>;
  /** Constructor alias. */
  create(target: string | Element, options?: Popconfirm.Options): Popconfirm;
  /** The bound instance for an element, or `null`. */
  get(target: string | Element): Popconfirm | null;
}

declare const Popconfirm: PopconfirmStatic;

export = Popconfirm;
