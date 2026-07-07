/**
 * Type definitions for Vanilla UI Kit Pagination (`pagination/pagination.js`).
 * Browser global: `Pagination`. UMD/CommonJS: `import Pagination = require('vanilla-ui-kit/pagination')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace Pagination {
  interface Options {
    /** Item count (pair with `perPage`); `pages` takes precedence when both given. */
    total?: number;
    /** Items per page. Default `10`. */
    perPage?: number;
    /** Page count directly (instead of `total`/`perPage`). */
    pages?: number;
    /** Initial page (1-based). Default `1`. */
    page?: number;
    /** Pages shown around the current page. Default `1`. */
    siblings?: number;
    /** Pages pinned at each end. Default `1`. */
    boundaries?: number;
    /** Minimal `prev · 3 / 12 · next` rendering. Default `false`. */
    compact?: boolean;
    /** `true` = built-in `'1–10 of 97'`, or a custom formatter. Requires `total`/`perPage` mode. Default `false`. */
    showTotal?: boolean | ((total: number, range: [number, number]) => string);
    /** Labelled "go to" number input (Enter jumps, clamped). Default `false`. */
    showJump?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Overridable UI strings (prev/next/jump…, i18n). */
    labels?: Record<string, string>;
    /** Page changed (clicks, jump, keyboard). */
    onChange?: (page: number, pagination: Pagination) => void;
  }

  /** Accepted by `update()` — re-renders and re-clamps silently. */
  interface UpdateOptions {
    total?: number;
    perPage?: number;
    pages?: number;
  }
}

interface Pagination {
  /** Current page (1-based). */
  getPage(): number;
  /** Jump to a page (clamped); fires `onChange` unless `{silent: true}`. */
  setPage(page: number, options?: SilentOptions): void;
  /** Change the totals; keeps the current page clamped, never fires. */
  update(options: Pagination.UpdateOptions): void;
  /** Remove the built DOM. */
  destroy(): void;
}

interface PaginationStatic extends FamilyStatics<Pagination.Options, Pagination> {
  /** Render a `<nav aria-label="Pagination">` of real buttons into `target`. */
  new (target: string | Element, options?: Pagination.Options): Pagination;
  prototype: Pagination;
  /** Constructor alias: same as `new Pagination(...)`. */
  create(target: string | Element, options?: Pagination.Options): Pagination;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Pagination | null;
}

declare const Pagination: PaginationStatic;

export = Pagination;
