/**
 * Type definitions for Vanilla UI Kit Progress (`progress/progress.js`).
 * Browser global: `Progress`. UMD/CommonJS: `import Progress = require('vanilla-ui-kit/progress')`.
 *
 * Static-API component (like Toast): bars, spinners, and skeleton
 * placeholders, each returning a small handle.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Progress {
  interface BarOptions {
    /** Initial value. Default `0`. */
    value?: number;
    /** Scale ceiling. Default `100`. */
    max?: number;
    /** Sweeping animation, no `aria-valuenow` (unknown duration). Default `false`. */
    indeterminate?: boolean;
    /** Visible label above the bar (also the accessible name). */
    label?: string;
    /** Show `'42%'` at the right edge. Default `false`. */
    showValue?: boolean;
    /** Bar height. Default `'md'`. */
    size?: 'sm' | 'md';
    /** Fill color token. Default `'accent'`. */
    color?: 'accent' | 'success';
    /** After `done()`: `true` = remove after 800 ms, number = custom ms, `false` = stay. */
    autoRemove?: boolean | number;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }

  interface SpinnerOptions {
    /** Diameter in px. Default `20`. */
    size?: number;
    /** Visually-hidden accessible text. Default `'Loading…'`. */
    label?: string;
    /** Render inline-block (vs block). Default `true`. */
    inline?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }

  interface SkeletonOptions {
    /** Placeholder line count. Default `3`. */
    lines?: number;
    /** Leading circle placeholder. Default `false`. */
    avatar?: boolean;
    /** Taller first line. Default `false`. */
    header?: boolean;
    /** CSS widths per line. Default staggered `100/85/60%`. */
    widths?: string[];
    /** Line height (CSS length). */
    height?: string;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }

  interface BarHandle {
    /** The bar's root element. */
    el: HTMLElement;
    /** Set the value (clamped to `[0, max]`; promotes an indeterminate bar to determinate). */
    set(value: number): void;
    /** Fill to max in the success color, then honor `autoRemove`. */
    done(): void;
    /** Replace the label text. */
    setLabel(text: string): void;
    /** Remove the bar from the DOM. */
    remove(): void;
  }

  interface SpinnerHandle {
    /** The spinner's root element. */
    el: HTMLElement;
    /** Remove the spinner from the DOM. */
    remove(): void;
  }

  interface SkeletonHandle {
    /** The skeleton overlay element. */
    el: HTMLElement;
    /** Restore the target's hidden children exactly (incl. `aria-busy`). */
    release(): void;
  }

  /** `Progress.skeleton(target, opts)` plus the static `release(target)` form. */
  interface SkeletonFn {
    (target: string | Element, options?: SkeletonOptions): SkeletonHandle;
    /** Release a target skeletonized elsewhere. */
    release(target: string | Element): void;
  }
}

/** Note: static-API component — the family `defaults` covers all three primitives. */
interface ProgressStatic extends FamilyStatics<
  Progress.BarOptions & Progress.SpinnerOptions & Progress.SkeletonOptions
> {
  /** Render a progress bar into `target`. */
  bar(target: string | Element, options?: Progress.BarOptions): Progress.BarHandle;
  /** Render a spinner into `target`. */
  spinner(target: string | Element, options?: Progress.SpinnerOptions): Progress.SpinnerHandle;
  /** Cover `target`'s content with shimmering placeholders (restored by `release()`). */
  skeleton: Progress.SkeletonFn;
}

declare const Progress: ProgressStatic;

export = Progress;
