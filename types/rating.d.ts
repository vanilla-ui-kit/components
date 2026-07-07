/**
 * Type definitions for Vanilla UI Kit Rating (`rating/rating.js`).
 * Browser global: `Rating`. UMD/CommonJS: `import Rating = require('vanilla-ui-kit/rating')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace Rating {
  /** Built-in icon set name, or a `{ empty, full }` pair of trusted SVG strings. */
  type Icon = 'star' | 'heart' | { empty: string; full: string };

  interface Options {
    /** Number of icons. Default `5`. */
    max?: number;
    /** Initial value; fractional values render via clipped fills (e.g. `4.3`). Default `0`. */
    value?: number;
    /** Allow half-step selection (left half of an icon = .5). Default `true`. */
    half?: boolean;
    /** Icon set. Default `'star'`. */
    icon?: Icon;
    /** Icon size in px. Default `22`. */
    size?: number;
    /** Display-only: renders as `role="img"`, no focus stop, no interaction. Default `false`. */
    readOnly?: boolean;
    /** Clicking the committed value again clears to 0. Default `true`. */
    clearable?: boolean;
    /** Hidden input name for forms (submits `'3.5'`, empty string when 0). */
    name?: string;
    /** Show the numeric value after the icons. Default `false`. */
    showValue?: boolean;
    /** Start disabled. Default `false`. */
    disabled?: boolean;
    /** Builds the `aria-valuetext`, e.g. `(v, max) => v + ' of ' + max`. */
    labels?: (value: number, max: number) => string;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Committed value changed. */
    onChange?: (value: number) => void;
    /** Pointer preview value, `null` when the pointer leaves. */
    onHover?: (value: number | null) => void;
  }
}

interface Rating {
  /** Current committed value. */
  getValue(): number;
  /** Set the value (clamped to `[0, max]`, snapped to the step); fires `onChange` unless `{silent: true}`. */
  setValue(value: number, options?: SilentOptions): void;
  /** Re-enable interaction. */
  enable(): void;
  /** Disable interaction (keeps the value visible). */
  disable(): void;
  /** Restore an enhanced input, remove built DOM. */
  destroy(): void;
}

interface RatingStatic extends FamilyStatics<Rating.Options, Rating> {
  /** Build into a container, or enhance an `<input>` (hidden, synced, restored on destroy). */
  new (target: string | Element, options?: Rating.Options): Rating;
  prototype: Rating;
  /** Constructor alias: same as `new Rating(...)`. */
  create(target: string | Element, options?: Rating.Options): Rating;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Rating | null;
}

declare const Rating: RatingStatic;

export = Rating;
