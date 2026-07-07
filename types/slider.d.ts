/**
 * Type definitions for Vanilla UI Kit Slider (`slider/slider.js`).
 * Browser global: `Slider`. UMD/CommonJS: `import Slider = require('vanilla-ui-kit/slider')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace Slider {
  /** Slider value: a number for single thumb, `[low, high]` for dual-thumb range. */
  type Value = number | [number, number];

  /** Per-thumb accessible names. */
  interface Labels {
    /** Single thumb. Default `'Value'`. */
    value?: string;
    /** Dual: low thumb. Default `'Minimum value'`. */
    min?: string;
    /** Dual: high thumb. Default `'Maximum value'`. */
    max?: string;
  }

  interface Options {
    /** Track minimum. Default `0`. */
    min?: number;
    /** Track maximum. Default `100`. */
    max?: number;
    /** Snap increment. Default `1`. */
    step?: number;
    /** Number = single thumb; `[20, 80]` = dual-thumb range. */
    value?: Value;
    /** `true` = tick per step (when ≤ 20 steps), or `{ 0: 'Low', 50: 'Mid' }` labeled marks. Default `false`. */
    marks?: boolean | Record<number, string>;
    /** Value bubble: `'drag'` (while dragging/focused) | `'always'` | `false`. Default `'drag'`. */
    tooltip?: 'drag' | 'always' | false;
    /** Formats the tooltip and `aria-valuetext`, e.g. `(v) => v + ' GB'`. */
    format?: (value: number) => string;
    /** Shorthand prefix when no `format` given, e.g. `'$'`. */
    prefix?: string;
    /** Shorthand suffix when no `format` given. */
    suffix?: string;
    /** Bottom → top; ArrowUp still increases. Default `false`. */
    vertical?: boolean;
    /** Start disabled (disabled sliders don't submit, like native controls). Default `false`. */
    disabled?: boolean;
    /** Hidden input(s) for forms: `'price'` single, `'price[]'` dual. */
    name?: string;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Every move. */
    onInput?: (value: Value, slider: Slider) => void;
    /** On release / commit. */
    onChange?: (value: Value, slider: Slider) => void;
    /** Per-thumb accessible names. */
    labels?: Labels;
  }
}

interface Slider {
  /** Current value: `40`, or `[20, 80]` for dual. */
  getValue(): Slider.Value;
  /** Set the value (snapped + clamped); fires `onInput` + `onChange` unless `{silent: true}`. */
  setValue(value: Slider.Value, options?: SilentOptions): void;
  /** Re-enable the slider. */
  enable(): void;
  /** Disable the slider (stops submitting). */
  disable(): void;
  /** Restore a replaced input, remove built DOM. */
  destroy(): void;
}

interface SliderStatic extends FamilyStatics<Slider.Options, Slider> {
  /** Build into a container, or replace a native `<input type=range>` (hidden and kept synced for plain form posts). */
  new (target: string | Element, options?: Slider.Options): Slider;
  prototype: Slider;
  /** Constructor alias: same as `new Slider(...)`. */
  create(target: string | Element, options?: Slider.Options): Slider;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Slider | null;
}

declare const Slider: SliderStatic;

export = Slider;
