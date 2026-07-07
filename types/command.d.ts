/**
 * Type definitions for Vanilla UI Kit Command Palette (`command/command.js`).
 * Browser global: `CommandPalette`. UMD/CommonJS: `import CommandPalette = require('vanilla-ui-kit/command')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace CommandPalette {
  /** One command in the palette. */
  interface Command {
    /** Unique key; re-registering an id replaces the command in place. */
    id: string;
    /** Visible row text (searched, highlighted). Defaults to `id`. */
    label?: string;
    /** Right-aligned shortcut text, e.g. `'Ctrl+S'`. Display only. */
    hint?: string;
    /** Section header the command is listed under (empty-query view). */
    group?: string;
    /** TRUSTED inline SVG markup, like Toast's icons. */
    icon?: string;
    /** Extra match terms (not displayed, never highlighted). */
    keywords?: string | string[];
    /** Runs on Enter/click, AFTER the palette closes. */
    action?: (command: Command, palette: CommandPalette) => void;
    /** Shown grayed out; skipped by keyboard navigation, not runnable. */
    disabled?: boolean;
  }

  interface Options {
    /** Initial commands. */
    commands?: Command[];
    /** Global hotkey, `'mod+k'` syntax (`mod` = Cmd on macOS, Ctrl elsewhere); `false` = no global binding. Default `'mod+k'`. */
    hotkey?: string | false;
    /** Search input placeholder. Default `'Type a command…'`. */
    placeholder?: string;
    /** Cap on filtered results (empty query shows all). Default `12`. */
    maxResults?: number;
    /** No-match text. Default `'No matching commands'`. */
    emptyText?: string;
    /** `true` = session-only "Recent" group (last 5 run). Default `false`. */
    recent?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Palette opened. */
    onOpen?: (palette: CommandPalette) => void;
    /** Palette closed. */
    onClose?: (palette: CommandPalette) => void;
    /** A command was run. */
    onRun?: (command: Command, palette: CommandPalette) => void;
  }
}

interface CommandPalette {
  /** Register a command (or an array); re-registering an id replaces it in place. */
  register(commands: CommandPalette.Command | CommandPalette.Command[]): void;
  /** Remove a command by id. */
  unregister(id: string): void;
  /** Open the palette. */
  open(): void;
  /** Close the palette. */
  close(): void;
  /** Toggle the palette. */
  toggle(): void;
  /** Unbind the hotkey, remove the panel. */
  destroy(): void;
}

/** The statics proxy a lazily created default instance — nothing is built or bound until first use. */
interface CommandPaletteStatic extends FamilyStatics<CommandPalette.Options, CommandPalette> {
  /** Create a standalone palette instance. */
  new (options?: CommandPalette.Options): CommandPalette;
  prototype: CommandPalette;
  /** Register command(s) on the default palette. Chainable. */
  register(commands: CommandPalette.Command | CommandPalette.Command[]): this;
  /** Remove a command from the default palette. Chainable. */
  unregister(id: string): this;
  /** Open the default palette. Chainable. */
  open(): this;
  /** Close the default palette. Chainable. */
  close(): this;
  /** Toggle the default palette. Chainable. */
  toggle(): this;
}

declare const CommandPalette: CommandPaletteStatic;

export = CommandPalette;
