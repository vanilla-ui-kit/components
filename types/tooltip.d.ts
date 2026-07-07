/**
 * Type definitions for Vanilla UI Kit Tooltip (`tooltip/tooltip.js`).
 * Browser global: `Tooltip`. UMD/CommonJS: `import Tooltip = require('vanilla-ui-kit/tooltip')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Tooltip {
  /** Panel side. Flips to the opposite side when out of room, clamps to the viewport. */
  type Placement = 'top' | 'bottom' | 'left' | 'right';

  /** What shows/hides the tooltip. `'hover'` also shows on keyboard focus; `'manual'` binds nothing. */
  type Trigger = 'hover' | 'click' | 'focus' | 'manual';

  /** Tooltip content: string, `fn(triggerEl)` (re-resolved on every show), or a DOM element. */
  type Content = string | Element | ((trigger: Element) => string | Element);

  /** Accessible names. */
  interface Labels {
    /** Labels click-trigger panels. Default `'Popover'`. */
    popover?: string;
  }

  interface Options {
    /** String, `fn(triggerEl)`, or a DOM element. Default `''`. */
    content?: Content;
    /** Panel side. Default `'top'`. */
    placement?: Placement;
    /** Show/hide trigger. Default `'hover'`. */
    trigger?: Trigger;
    /** Delay in ms (both ways) or `{ show, hide }`. Hover defaults to `{ show: 80, hide: 120 }`; other triggers to `0`. Focus always shows immediately. */
    delay?: number | { show?: number; hide?: number } | null;
    /** Gap in px between the trigger and the panel. Default `8`. */
    offset?: number;
    /** Render the pointer arrow. Default `true`. */
    arrow?: boolean;
    /** Popover mode: panel stays open while pointer/focus is inside, may contain focusable content. Default `false`. */
    interactive?: boolean;
    /** Content is TEXT by default (rendered with `textContent`); opt in for trusted markup. Default `false`. */
    html?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless, no CSS ever injected. Default `true`. */
    styles?: boolean;
    /** Accessible names. Default `{ popover: 'Popover' }`. */
    labels?: Labels;
    /** Panel shown. */
    onShow?: (tooltip: Tooltip) => void;
    /** Panel hidden. */
    onHide?: (tooltip: Tooltip) => void;
  }
}

interface Tooltip {
  /** Show the panel now. */
  show(): void;
  /** Hide the panel. */
  hide(): void;
  /** Toggle the panel. */
  toggle(): void;
  /** Replace the content (re-shown content is re-resolved). */
  update(content: Tooltip.Content): void;
  /** Unbind and remove everything. */
  destroy(): void;
}

interface TooltipStatic extends FamilyStatics<Tooltip.Options, Tooltip> {
  /** Bind a tooltip/popover to an element or selector. */
  new (target: string | Element, options?: Tooltip.Options): Tooltip;
  prototype: Tooltip;
  /** Constructor alias. */
  create(target: string | Element, options?: Tooltip.Options): Tooltip;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Tooltip | null;
}

declare const Tooltip: TooltipStatic;

export = Tooltip;
