/**
 * Type definitions for Vanilla UI Kit Segmented (`segmented/segmented.js`).
 * Browser global: `Segmented`. UMD/CommonJS: `import Segmented = require('vanilla-ui-kit/segmented')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace Segmented {
  /** One segment: a plain string (value = label) or an object. */
  type OptionSpec =
    | string
    | {
        /** Submitted/reported value. */
        value: string;
        /** Visible caption (always rendered as text). */
        label?: string;
        /** TRUSTED SVG string (same trust model as Toast's icons) — never user content. */
        icon?: string;
        /** Icon-only segment; the label becomes its `aria-label`. */
        iconOnly?: boolean;
        /** Skipped by keyboard, not selectable. */
        disabled?: boolean;
      };

  interface Options {
    /** Segments — `['a', 'b']` shorthand or objects. */
    options?: OptionSpec[];
    /** Initial value. Default: first enabled option. */
    value?: string;
    /** Hidden `<input>` carries the value in forms. */
    name?: string;
    /** Control size. Default `'md'`. */
    size?: 'sm' | 'md';
    /** Stretch segments evenly. Default `false`. */
    fullWidth?: boolean;
    /** `aria-label` for the radiogroup. */
    label?: string;
    /** Selection changed. */
    onChange?: (value: string, segmented: Segmented) => void;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }
}

interface Segmented {
  /** Current value. */
  getValue(): string;
  /** Select a value; fires `onChange` unless `{silent: true}`. */
  setValue(value: string, options?: SilentOptions): void;
  /** Re-enable the whole control. */
  enable(): void;
  /** Disable the whole control (the hidden input stops submitting). */
  disable(): void;
  /** Replace the options; selection kept when possible. */
  update(options: Segmented.OptionSpec[]): void;
  /** Unbind + restore the original children/attributes. */
  destroy(): void;
}

interface SegmentedStatic extends FamilyStatics<Segmented.Options, Segmented> {
  /** Build in a container from `options`, or enhance buttons you already have (labels from text, values from `data-value`). */
  new (target: string | Element, options?: Segmented.Options): Segmented;
  prototype: Segmented;
  /** Constructor alias: same as `new Segmented(...)`. */
  create(target: string | Element, options?: Segmented.Options): Segmented;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Segmented | null;
}

declare const Segmented: SegmentedStatic;

export = Segmented;
