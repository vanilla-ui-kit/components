/**
 * Type definitions for Vanilla UI Kit NumberInput (`number/number.js`).
 * Browser global: `NumberInput`. UMD/CommonJS: `import NumberInput = require('vanilla-ui-kit/number')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace NumberInput {
  /** Thousands grouping separator; `false` disables grouping. */
  type Thousands = ',' | '.' | ' ' | false;

  /** Options for the pure `parse`/`format` helpers (a subset of the instance options). */
  interface FormatOptions {
    /** Decimal places on output; default inferred from `step`. */
    precision?: number;
    /** Grouping separator. Default `','`. */
    thousands?: Thousands;
    /** Decimal separator. Default `'.'` (must differ from `thousands`). */
    decimal?: '.' | ',';
    /** Allow negative values. Default `true`. */
    allowNegative?: boolean;
  }

  interface Options extends FormatOptions {
    /** Clamp floor (also disables the minus key when `>= 0`). */
    min?: number;
    /** Clamp ceiling. */
    max?: number;
    /** Arrow/stepper increment. Default `1`. */
    step?: number;
    /** Initial value (container mode). */
    value?: number;
    /** Non-editable adornment before the number, e.g. `'$'`. */
    prefix?: string;
    /** Non-editable adornment after the number, e.g. `'kg'`. */
    suffix?: string;
    /** Show +/− buttons (hold to repeat, accelerating). Default `true`. */
    steppers?: boolean;
    /** Input placeholder. */
    placeholder?: string;
    /** Accessible name for the editable input — required in container mode, where no `<label>` can point at it. */
    ariaLabel?: string;
    /** Hidden input name carrying the RAW value for forms (never `'1,234.50'`). */
    name?: string;
    /** Start disabled. Default `false`. */
    disabled?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Committed value (blur / Enter / step); `null` = empty. */
    onChange?: (value: number | null) => void;
    /** Live while typing; `null` while not parseable. */
    onInput?: (value: number | null) => void;
  }
}

interface NumberInput {
  /** Current committed value; `null` when empty. */
  getValue(): number | null;
  /** Set (clamped + rounded); fires `onChange` unless `{silent: true}`. */
  setValue(value: number | null, options?: SilentOptions): void;
  /** Increment by `step` (respects `max`). */
  stepUp(): void;
  /** Decrement by `step` (respects `min`). */
  stepDown(): void;
  /** Re-enable the control. */
  enable(): void;
  /** Disable the control. */
  disable(): void;
  /** Focus the editable input. */
  focus(): void;
  /** Restore an enhanced input's original attributes, remove built DOM. */
  destroy(): void;
}

interface NumberInputStatic extends FamilyStatics<NumberInput.Options, NumberInput> {
  /** Enhance an existing `<input>` in place, or build inside a container. */
  new (target: string | Element, options?: NumberInput.Options): NumberInput;
  prototype: NumberInput;
  /** Constructor alias: same as `new NumberInput(...)`. */
  create(target: string | Element, options?: NumberInput.Options): NumberInput;
  /** Instance for an element, or `null`. */
  get(target: string | Element): NumberInput | null;
  /** Pure, Node-safe: `'$1,234.50'` → `1234.5`; `null` when unparseable. */
  parse(text: string, options?: NumberInput.FormatOptions): number | null;
  /** Pure, Node-safe: `1234.5` → `'1,234.50'` (with `precision: 2`). */
  format(value: number, options?: NumberInput.FormatOptions): string;
}

declare const NumberInput: NumberInputStatic;

export = NumberInput;
