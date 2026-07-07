/**
 * Type definitions for Vanilla UI Kit DatePicker (`datepicker/datepicker.js`).
 * Browser global: `DatePicker`. UMD/CommonJS: `import DatePicker = require('vanilla-ui-kit/datepicker')`.
 */
import { FamilyStatics, PanelPosition, SilentOptions, Theme } from './shared';

declare namespace DatePicker {
  /** A date value: `Date`, `'today'`, or a string in the configured `format` or ISO. */
  type DateLike = Date | string;

  /** A selected range. `end` is `null` while the second date is still being picked. */
  interface DateRange {
    start: Date | null;
    end: Date | null;
  }

  /** A quick-select preset. Use `range` in range mode, `date` in single-date mode. Functions are re-evaluated at click time so relative presets stay fresh. */
  interface Preset {
    /** Rail caption. */
    label: string;
    /** Range preset: `[start, end]` or a function returning one. */
    range?: [DateLike, DateLike] | (() => [DateLike, DateLike]);
    /** Single-date preset: a date or a function returning one. */
    date?: DateLike | (() => DateLike);
  }

  /** Overridable UI strings for i18n. */
  interface Labels {
    /** Footer "Today" button. */
    today?: string;
    /** Footer "Clear" button. */
    clear?: string;
  }

  interface Options {
    /** Initial value. Default none. */
    value?: DateLike | [DateLike, DateLike] | DateRange | null;
    /** Display/parse format. Tokens: `YYYY YY MMMM MMM MM M DD D`. Default `'YYYY-MM-DD'`. */
    format?: string;
    /** Earliest selectable date. */
    min?: DateLike;
    /** Latest selectable date. */
    max?: DateLike;
    /** Dates that can't be picked: an array, or `fn(date) => true` to disable. */
    disabledDates?: DateLike[] | ((date: Date) => boolean);
    /** Disabled weekdays, `0` = Sunday … `6` = Saturday. */
    disabledDays?: number[];
    /** Range selection ("start – end" in one input). Default `false`. */
    range?: boolean;
    /** Text between start and end in the input. Default `' – '`. */
    rangeSeparator?: string;
    /** Months shown side by side (1–3). Default `1`. */
    panes?: 1 | 2 | 3;
    /** Quick-select rail: `true` = built-ins, a comma-separated key subset (`'last7,thisMonth'`), or your own presets. Default `true`. */
    presets?: boolean | string | Preset[];
    /** Always-visible calendar (auto for non-input targets). Default `false`. */
    inline?: boolean;
    /** BCP-47 locale tag. Defaults to the browser locale. */
    locale?: string;
    /** First weekday, 0–6. Defaults to the locale's first weekday. */
    firstDay?: number;
    /** ISO-8601 week number column. Default `false`. */
    weekNumbers?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless: no CSS injected. Default `true`. */
    styles?: boolean;
    /** Accent color (any CSS color). */
    accent?: string;
    /** Show the footer Today button. Default `true`. */
    todayButton?: boolean;
    /** Show the footer Clear button. Default `true`. */
    clearButton?: boolean;
    /** Close the popup after picking. Default `true`. */
    autoClose?: boolean;
    /** Popup placement. Default `'auto'`. */
    position?: PanelPosition;
    /** UI strings for i18n, e.g. `{ today: 'Heute', clear: 'Löschen' }`. */
    labels?: Labels;
    /** Selection made. `value` is a `Date`, or `{start, end}` in range mode. */
    onSelect?: (value: Date | DateRange, formatted: string, dp: DatePicker) => void;
    /** Popup opened. */
    onOpen?: (dp: DatePicker) => void;
    /** Popup closed. */
    onClose?: (dp: DatePicker) => void;
    /** Value cleared. */
    onClear?: (dp: DatePicker) => void;
    /** Visible month changed. */
    onMonthChange?: (viewDate: Date, dp: DatePicker) => void;
  }
}

interface DatePicker {
  /** Show the popup. */
  open(): void;
  /** Hide the popup. */
  close(): void;
  /** Toggle the popup. */
  toggle(): void;
  /** Current value: `Date`, `{start, end}` in range mode, or `null`. */
  getDate(): Date | DatePicker.DateRange | null;
  /** Set the value: `Date` | string | `'today'` | `null`; range mode also accepts `[start, end]` or `{start, end}`. `{silent: true}` skips onSelect/change. */
  setDate(
    value: DatePicker.DateLike | [DatePicker.DateLike, DatePicker.DateLike] | DatePicker.DateRange | null,
    options?: SilentOptions
  ): void;
  /** Clear the value. */
  clear(): void;
  /** Change any option on the fly. */
  setOptions(options: DatePicker.Options): void;
  /** Remove the panel and all listeners. */
  destroy(): void;
}

/** Note: `DatePicker` relies on the function's own name for registry display — it does not carry a `displayName` static. */
interface DatePickerStatic extends Omit<FamilyStatics<DatePicker.Options, DatePicker>, 'displayName'> {
  /** Bind a picker to an input (or render inline into any element). */
  new (target: string | Element, options?: DatePicker.Options): DatePicker;
  prototype: DatePicker;
  /** Constructor alias: `DatePicker.create(el, opts)` = `new DatePicker(el, opts)`. */
  create(target: string | Element, options?: DatePicker.Options): DatePicker;
  /** Instance previously bound to an element, or `null`. */
  get(target: string | Element): DatePicker | null;
  /** Format a `Date` with the token format (`'DD MMM YYYY'`), optionally localized. */
  formatDate(date: Date, format?: string, locale?: string): string;
  /** Parse a string with the token format. Returns `null` when it doesn't parse. */
  parseDate(str: string, format?: string, locale?: string): Date | null;
}

declare const DatePicker: DatePickerStatic;

export = DatePicker;
