/**
 * Type definitions for Vanilla UI Kit Select (`select/select.js`).
 * Browser global: `Select`. UMD/CommonJS: `import Select = require('vanilla-ui-kit/select')`.
 */
import { FamilyStatics, PanelPosition, SilentOptions, Theme } from './shared';

declare namespace Select {
  /** One option (container mode). Plain strings are value = label shorthand. */
  type OptionSpec =
    | string
    | {
        /** Submitted value. */
        value: string;
        /** Visible label (rendered with `textContent`; `html: true` per option opts in to trusted markup). */
        label?: string;
        /** Option group header this option is listed under. */
        group?: string;
        /** Not selectable, skipped by keyboard. */
        disabled?: boolean;
        /** Render this option's label as trusted markup. Default `false`. */
        html?: boolean;
      };

  /** Current selection: `string | null` (single), `string[]` (multiple). */
  type Value = string | string[] | null;

  /** Overridable UI strings. */
  interface Labels {
    /** Tag remove button. Default `'Remove'`. */
    remove?: string;
    /** Clear button. Default `'Clear selection'`. */
    clear?: string;
    /** Search input. Default `'Search'`. */
    search?: string;
    /** Listbox name. Default `'Options'`. */
    options?: string;
  }

  interface Options {
    /** Container mode only: the option list (native `<select>` targets read their own `<option>`s). */
    options?: OptionSpec[];
    /** Initial value; string or array (multiple). Default `null`. */
    value?: Value;
    /** Multiple selection. Defaults to the native select's `multiple`. */
    multiple?: boolean;
    /** Filter input at the top of the panel. Default `false`. */
    searchable?: boolean;
    /** ✕ button that resets the selection. Default `false`. */
    clearable?: boolean;
    /** Placeholder text. Default `'Select…'`. */
    placeholder?: string;
    /** Form field name (container mode — a hidden input/select is maintained). */
    name?: string;
    /** Cap for multiple selection. Default `null` (no cap). */
    maxItems?: number | null;
    /** Empty-search text. Default `'No results'`. */
    noResultsText?: string;
    /** Start disabled. Default `false`. */
    disabled?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Panel placement. Default `'auto'`. */
    position?: PanelPosition;
    /** Overridable UI strings. */
    labels?: Labels;
    /** Selection changed. */
    onChange?: (value: Value, select: Select) => void;
    /** Panel opened. */
    onOpen?: (select: Select) => void;
    /** Panel closed. */
    onClose?: (select: Select) => void;
  }
}

interface Select {
  /** Current value: `string | null` (single), `string[]` (multiple). */
  getValue(): Select.Value;
  /** Set the selection; fires `onChange` (pass `{ silent: true }` to skip). Chainable. */
  setValue(value: Select.Value, options?: SilentOptions): this;
  /** Open the panel. Chainable. */
  open(): this;
  /** Close the panel. Chainable. */
  close(): this;
  /** Toggle the panel. Chainable. */
  toggle(): this;
  /** Enable the control (also re-enables the native element). Chainable. */
  enable(): this;
  /** Disable the control (native `disabled` kept in sync). Chainable. */
  disable(): this;
  /** Re-read options from the native `<select>` after DOM mutation. Chainable. */
  refresh(): this;
  /** Whether the panel is currently open. */
  isOpen: boolean;
  /** Tear down, restore the native select exactly as it was. */
  destroy(): void;
}

interface SelectStatic extends FamilyStatics<Select.Options, Select> {
  /** Enhance a native `<select>` (kept in the DOM and synced) or any container element (options from `options`). */
  new (target: string | Element, options?: Select.Options): Select;
  prototype: Select;
  /** Constructor alias: same as `new Select(…)`. */
  create(target: string | Element, options?: Select.Options): Select;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Select | null;
}

declare const Select: SelectStatic;

export = Select;
