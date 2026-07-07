/**
 * Type definitions for Vanilla UI Kit Autocomplete (`autocomplete/autocomplete.js`).
 * Browser global: `Autocomplete`. UMD/CommonJS: `import Autocomplete = require('vanilla-ui-kit/autocomplete')`.
 */
import { FamilyStatics, PanelPosition, Theme } from './shared';

declare namespace Autocomplete {
  /** One suggestion: a plain string or an object item. */
  type Item =
    | string
    | {
        /** Committed into the input on select. */
        value: string;
        /** Visible label (rendered as text via `textContent`). */
        label?: string;
        /** Group header this item is listed under. */
        group?: string;
        /** Not selectable, skipped by arrows. */
        disabled?: boolean;
        /** Per-item opt-in for trusted markup (skips highlighting). Default `false`. */
        html?: boolean;
      };

  /**
   * Suggestion source:
   * 1. Array — filtered locally (case/diacritic-insensitive substring).
   * 2. Callback — call `done(results)` whenever you're ready.
   * 3. Promise — return a thenable that resolves to results.
   * Stale responses are discarded automatically (sequence tokens).
   */
  type Source =
    | Item[]
    | ((query: string, done: (results: Item[]) => void) => void | PromiseLike<Item[]>);

  /** Overridable UI strings. */
  interface Labels {
    /** Empty-result row. Default `'No results'`. */
    noResults?: string;
    /** In-flight row. Default `'Loading…'`. */
    loading?: string;
    /** Listbox accessible name. Default `'Suggestions'`. */
    suggestions?: string;
  }

  interface Options {
    /** Where suggestions come from (array, callback, or promise). */
    source?: Source;
    /** Fewer typed chars = closed panel. Default `1`. */
    minChars?: number;
    /** ms between last keystroke and the lookup. Default `150`. */
    debounce?: number;
    /** Cap applied after the source answers. Default `10`. */
    maxResults?: number;
    /** Wrap the matched substring in a `<span>` (DOM, never innerHTML). Default `true`. */
    highlight?: boolean;
    /** Lookup on focus, ignoring `minChars` — recent-searches lists. Default `false`. */
    openOnFocus?: boolean;
    /** Free text stays valid; `false` reverts unmatched text on blur. Default `true`. */
    allowNew?: boolean;
    /** "No results" row text; defaults to `labels.noResults`. */
    emptyText?: string | null;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Panel placement. Default `'auto'`. */
    position?: PanelPosition;
    /** Overridable UI strings. */
    labels?: Labels;
    /** Suggestion committed (Enter or click). */
    onSelect?: (item: Item, autocomplete: Autocomplete) => void;
    /** Every keystroke. */
    onInput?: (query: string, autocomplete: Autocomplete) => void;
    /** Source failure (the panel closes silently). */
    onError?: (error: unknown, autocomplete: Autocomplete) => void;
    /** Panel opened. */
    onOpen?: (autocomplete: Autocomplete) => void;
    /** Panel closed. */
    onClose?: (autocomplete: Autocomplete) => void;
  }
}

interface Autocomplete {
  /** Look up the current text now (ignores `minChars`) and show. */
  open(): void;
  /** Close; also cancels any in-flight lookup. */
  close(): void;
  /** Swap the source; an open panel refreshes in place. */
  setSource(source: Autocomplete.Source): void;
  /** The bound `<input>`. */
  getInput(): HTMLInputElement;
  /** Tear down, give the input back exactly as found. */
  destroy(): void;
}

interface AutocompleteStatic extends FamilyStatics<Autocomplete.Options, Autocomplete> {
  /** Bind a typeahead to an `<input>` (element or selector). The input stays free text — suggestions assist, never constrain. */
  new (target: string | Element, options?: Autocomplete.Options): Autocomplete;
  prototype: Autocomplete;
  /** Constructor alias. */
  create(target: string | Element, options?: Autocomplete.Options): Autocomplete;
  /** Instance already bound to that element, or `null`. */
  get(target: string | Element): Autocomplete | null;
}

declare const Autocomplete: AutocompleteStatic;

export = Autocomplete;
