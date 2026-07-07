/**
 * Type definitions for Vanilla UI Kit Menu (`menu/menu.js`).
 * Browser global: `Menu`. UMD/CommonJS: `import Menu = require('vanilla-ui-kit/menu')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Menu {
  /** Panel placement relative to the trigger. Flips when out of room, clamps to the viewport. */
  type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

  /** An activatable menu entry. */
  interface ActionItem {
    /** Item text — rendered with `textContent`. */
    label: string;
    /** Optional TRUSTED inline SVG markup, like Toast's icons. */
    icon?: string;
    /** Optional right-aligned kbd/hint text, e.g. `'⌘D'`. */
    hint?: string;
    /** Red, for destructive actions. */
    danger?: boolean;
    /** `aria-disabled`, skipped by arrow keys. */
    disabled?: boolean;
    /** Called when the item is activated. */
    onSelect?: (item: ActionItem, menu: Menu) => void;
    /** ONE level of submenu (hover / ArrowRight). */
    items?: Item[];
  }

  /** A separator rule between items. */
  interface Separator {
    type: 'separator';
  }

  /** One entry of `items`. */
  type Item = ActionItem | Separator;

  interface Options {
    /** Item list. Default `[]`. */
    items?: Item[];
    /** Panel placement. Default `'bottom-start'`. */
    placement?: Placement;
    /** Close after an item is activated. Default `true`. */
    closeOnSelect?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless, no CSS ever injected. Default `true`. */
    styles?: boolean;
    /** Menu opened. */
    onOpen?: (menu: Menu) => void;
    /** Menu closed. */
    onClose?: (menu: Menu) => void;
  }
}

interface Menu {
  /** Open the menu (also: trigger click / ArrowDown / Enter / Space). */
  open(): void;
  /** Close the menu. */
  close(): void;
  /** Toggle the menu. */
  toggle(): void;
  /** Swap the item list (re-renders if open). */
  update(items: Menu.Item[]): void;
  /** Unbind the trigger and remove the panel. */
  destroy(): void;
}

interface MenuStatic extends FamilyStatics<Menu.Options, Menu> {
  /** Bind a dropdown menu to a trigger `<button>` (element or selector). */
  new (trigger: string | Element, options?: Menu.Options): Menu;
  prototype: Menu;
  /** Constructor alias. */
  create(trigger: string | Element, options?: Menu.Options): Menu;
  /** Instance for a trigger, or `null`. */
  get(target: string | Element): Menu | null;
  /** One-shot menu at viewport coordinates (context menus; flips inward at viewport edges). */
  open(x: number, y: number, itemsOrOpts: Menu.Item[] | Menu.Options): Menu;
  /** Close any open menu. */
  closeAll(): void;
}

declare const Menu: MenuStatic;

export = Menu;
