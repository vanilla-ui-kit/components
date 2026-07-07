/**
 * Type definitions for Vanilla UI Kit Tabs (`tabs/tabs.js`).
 * Browser global: `Tabs`. UMD/CommonJS: `import Tabs = require('vanilla-ui-kit/tabs')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Tabs {
  /** One tab in builder mode. */
  interface TabSpec {
    /** Tab caption (rendered with `textContent`). */
    label: string;
    /** Panel content: plain text (always safe), a DOM element (moved in as-is), or trusted markup with `html: true`. */
    content?: string | Element;
    /** Render string content as trusted markup. Default `false`. */
    html?: boolean;
    /** Disabled tab — skipped by arrow-key navigation. */
    disabled?: boolean;
    /** Initially active tab. */
    active?: boolean;
  }

  interface Options {
    /** Builder mode: describe the tabs and Tabs renders everything. Default `null` (wire up existing markup). */
    tabs?: TabSpec[] | null;
    /** Initial tab index; a `data-vtb-active` tab wins over the default. Default `0`. */
    active?: number;
    /** Vertical rail; arrows become ArrowUp/ArrowDown. Default `false`. */
    vertical?: boolean;
    /** `'auto'` = focus selects; `'manual'` = Enter/Space selects. Default `'auto'`. */
    activation?: 'auto' | 'manual';
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless: no CSS injected. Default `true`. */
    styles?: boolean;
    /** After a tab is activated. */
    onChange?: (index: number, tabs: Tabs) => void;
  }
}

interface Tabs {
  /** Activate a tab by index (no-op for disabled/out-of-range). */
  select(index: number): void;
  /** Current active index. */
  active: number;
  /** Current active index (method form). */
  getActive(): number;
  /** Unbind and restore every attribute it changed. */
  destroy(): void;
}

interface TabsStatic extends FamilyStatics<Tabs.Options, Tabs> {
  /** Wire up a tabs container (first child = tab strip, following siblings = panels), or build from `options.tabs`. */
  new (target: string | Element, options?: Tabs.Options): Tabs;
  prototype: Tabs;
  /** Constructor alias. */
  create(target: string | Element, options?: Tabs.Options): Tabs;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Tabs | null;
}

declare const Tabs: TabsStatic;

export = Tabs;
