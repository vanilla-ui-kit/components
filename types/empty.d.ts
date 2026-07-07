/**
 * Type definitions for Vanilla UI Kit EmptyState (`empty/empty.js`).
 * Browser global: `EmptyState`. UMD/CommonJS: `import EmptyState = require('vanilla-ui-kit/empty')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace EmptyState {
  /** Built-in icon name, or a trusted `<svg…` string rendered verbatim. */
  type Icon = 'inbox' | 'search' | 'error' | 'folder' | string;

  /** An action button under the description. */
  interface Action {
    /** Button caption. */
    label: string;
    /** Click handler. */
    onClick?: (handle: Handle) => void;
  }

  interface Options {
    /** Icon above the title. Default `'inbox'`. */
    icon?: Icon;
    /** Headline (rendered as text). */
    title?: string;
    /** Supporting copy (text; `html: true` opts into trusted markup). */
    description?: string;
    /** Render `description` as trusted markup. Default `false`. */
    html?: boolean;
    /** Primary (accent) action button. */
    action?: Action;
    /** Quiet link-style secondary action. */
    secondaryAction?: Action;
    /** Scale. Default `'md'`. */
    size?: 'sm' | 'md';
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
  }

  /** Handle returned by `render()` / the constructor. */
  interface Handle {
    /** The empty-state root element. */
    el: HTMLElement;
    /** Merge new options and re-render in place. */
    update(options: Options): Handle;
    /** Remove it (adopted `[data-ves-action]` buttons are returned to the host). */
    remove(): void;
  }
}

interface EmptyStateStatic extends FamilyStatics<EmptyState.Options, EmptyState.Handle> {
  /** Render an empty state into `target`, replacing its content. */
  render(target: string | Element, options?: EmptyState.Options): EmptyState.Handle;
  /** Constructor form — alias of `render()` for family symmetry. */
  new (target: string | Element, options?: EmptyState.Options): EmptyState.Handle;
  /** Alias of `render()`. */
  create(target: string | Element, options?: EmptyState.Options): EmptyState.Handle;
  /** Handle for a target (or its rendered root), or `null`. */
  get(target: string | Element): EmptyState.Handle | null;
}

declare const EmptyState: EmptyStateStatic;

export = EmptyState;
