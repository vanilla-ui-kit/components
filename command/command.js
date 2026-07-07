/*!
 * Vanilla UI Kit Command Palette v1.0.0
 * A single-file, zero-dependency Ctrl/Cmd+K command palette for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="command.js"></script>
 *   <script>CommandPalette.register({ id: 'save', label: 'Save', action: save })</script>
 *   (then press Ctrl/Cmd+K)
 *
 * Headless:
 *   CommandPalette.defaults.styles = false   // no CSS injected; style .vcmd-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CommandPalette = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-command-styles';
  var OUT_MS = 160; // keep in sync with the .vcmd-out transition
  var MAX_RECENT = 5;
  var IS_MAC = HAS_DOM &&
    /Mac|iPhone|iPad|iPod/.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''));
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `CommandPalette.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when CommandPalette.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the palette; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vcmd{--vcmd-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vcmd{' +
      '--vcmd-accent:#5b5bd6;' +
      '--vcmd-bg:#ffffff;' +
      '--vcmd-surface:#f2f2f5;' +
      '--vcmd-text:#1c1d21;' +
      '--vcmd-muted:#72747e;' +
      '--vcmd-faint:#e7e7ec;' +
      '--vcmd-shadow:0 24px 64px rgba(24,25,32,.22),0 4px 16px rgba(24,25,32,.1);' +
      '--vcmd-backdrop:rgba(24,25,32,.42);' +
      '--vcmd-radius:14px;' +
      '--vcmd-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vcmd[data-theme=dark]{' +
      '--vcmd-accent:#7b7bea;' +
      '--vcmd-bg:#1b1d24;' +
      '--vcmd-surface:#272a33;' +
      '--vcmd-text:#e9eaf0;' +
      '--vcmd-muted:#989aa6;' +
      '--vcmd-faint:#31343f;' +
      '--vcmd-shadow:0 24px 64px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.4);' +
      '--vcmd-backdrop:rgba(0,0,0,.55);}' +
    '.vcmd.SALT{position:fixed;top:0;right:0;bottom:0;left:0;z-index:100000;' +
      'display:flex;align-items:flex-start;justify-content:center;' +
      'padding:15vh 16px 16px;box-sizing:border-box;' +
      'color:var(--vcmd-text);font-family:var(--vcmd-font);font-size:14px;line-height:1.45;}' +
    '.vcmd.SALT *,.vcmd.SALT *::before,.vcmd.SALT *::after{box-sizing:border-box;}' +
    '.vcmd.SALT .vcmd-backdrop{position:absolute;top:0;right:0;bottom:0;left:0;' +
      'background:var(--vcmd-backdrop);opacity:0;transition:opacity .16s ease;}' +
    '.vcmd.SALT .vcmd-panel{position:relative;width:100%;max-width:560px;max-height:70vh;' +
      'display:flex;flex-direction:column;overflow:hidden;' +
      'background:var(--vcmd-bg);border:1px solid var(--vcmd-faint);' +
      'border-radius:var(--vcmd-radius);box-shadow:var(--vcmd-shadow);' +
      'opacity:0;transform:translateY(-6px) scale(.98);' +
      'transition:opacity .16s ease,transform .18s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vcmd.SALT.vcmd-open .vcmd-backdrop{opacity:1;}' +
    '.vcmd.SALT.vcmd-open .vcmd-panel{opacity:1;transform:none;}' +
    '.vcmd.SALT.vcmd-out .vcmd-backdrop{opacity:0;}' +
    '.vcmd.SALT.vcmd-out .vcmd-panel{opacity:0;transform:scale(.97);' +
      'transition-duration:.14s,.14s;}' +
    '.vcmd.SALT .vcmd-search{display:flex;align-items:center;gap:10px;padding:0 16px;' +
      'border-bottom:1px solid var(--vcmd-faint);}' +
    '.vcmd.SALT .vcmd-search:focus-within{box-shadow:inset 0 -1px 0 var(--vcmd-accent);}' +
    '.vcmd.SALT .vcmd-glass{flex:none;display:grid;place-items:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-glass svg{display:block;}' +
    '.vcmd.SALT .vcmd-input{flex:1;min-width:0;font:inherit;font-size:15px;' +
      'color:var(--vcmd-text);background:none;border:0;padding:14px 0;outline:none;}' +
    '.vcmd.SALT .vcmd-input::placeholder{color:var(--vcmd-muted);opacity:1;}' +
    '.vcmd.SALT .vcmd-list{position:relative;flex:1;overflow-y:auto;' +
      'overscroll-behavior:contain;padding:6px;}' +
    '.vcmd.SALT .vcmd-group{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vcmd-muted);padding:10px 10px 4px;}' +
    '.vcmd.SALT .vcmd-option{display:flex;align-items:center;gap:10px;' +
      'padding:9px 10px;border-radius:8px;cursor:pointer;}' +
    '.vcmd.SALT .vcmd-option.is-active{background:var(--vcmd-surface);}' +
    '.vcmd.SALT .vcmd-option.is-disabled{opacity:.4;cursor:default;}' +
    '.vcmd.SALT .vcmd-option:focus-visible{outline:2px solid var(--vcmd-accent);' +
      'outline-offset:-2px;}' +
    '.vcmd.SALT .vcmd-icon{flex:none;width:18px;height:18px;display:grid;' +
      'place-items:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-option.is-active .vcmd-icon{color:var(--vcmd-accent);}' +
    '.vcmd.SALT .vcmd-icon svg{display:block;}' +
    '.vcmd.SALT .vcmd-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;}' +
    '.vcmd.SALT .vcmd-mark{color:var(--vcmd-accent);font-weight:650;}' +
    '.vcmd.SALT .vcmd-hint{flex:none;font-size:12px;color:var(--vcmd-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vcmd.SALT .vcmd-empty{padding:24px 16px;text-align:center;color:var(--vcmd-muted);}' +
    '.vcmd.SALT .vcmd-footer{display:flex;gap:14px;padding:9px 14px;' +
      'border-top:1px solid var(--vcmd-faint);color:var(--vcmd-muted);font-size:11.5px;}' +
    '.vcmd.SALT .vcmd-key{display:inline-block;min-width:16px;text-align:center;' +
      'background:var(--vcmd-surface);border:1px solid var(--vcmd-faint);border-radius:4px;' +
      'padding:0 4px;margin-right:5px;font-size:11px;line-height:1.6;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vcmd.SALT,.vcmd.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/command.css), or set CommandPalette.salt
  // to your own token / false BEFORE the palette first opens.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = CommandPalette.salt;
    if (s === false) return '';
    s = s == null ? DEFAULT_SALT : String(s).replace(/[^\w-]/g, '');
    return s || DEFAULT_SALT;
  }

  function saltClass() {
    var s = saltToken();
    return s ? ' ' + s : '';
  }

  function renderCss() {
    var s = saltToken();
    return CSS.split('.SALT').join(s ? '.' + s : '');
  }

  var MAGNIFIER = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var ownMql = null;
  var ownObserver = null;
  var watching = false;
  var instances = [];

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveTheme(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    var core = vcCore();
    if (core) return core.theme.resolve();
    if (!HAS_DOM) return 'light';
    var de = document.documentElement;
    var attr = de.getAttribute('data-theme') || de.getAttribute('data-bs-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    if (de.classList.contains('dark')) return 'dark';
    if (de.classList.contains('light')) return 'light';
    if (!ownMql && window.matchMedia) {
      ownMql = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return ownMql && ownMql.matches ? 'dark' : 'light';
  }

  function refreshTheme() {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].root) instances[i]._applyTheme();
    }
  }

  function ensureThemeWatch() {
    if (watching || !HAS_DOM) return;
    watching = true;
    var core = vcCore();
    if (core) {
      core.theme.watch(refreshTheme);
      return;
    }
    if (window.matchMedia) {
      ownMql = ownMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (ownMql.addEventListener) ownMql.addEventListener('change', refreshTheme);
      else if (ownMql.addListener) ownMql.addListener(refreshTheme);
    }
    if (typeof MutationObserver !== 'undefined') {
      ownObserver = new MutationObserver(refreshTheme);
      ownObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-bs-theme']
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Hotkey parsing — simple 'mod+k' / 'ctrl+shift+p' forms.
   * 'mod' means Cmd on macOS, Ctrl everywhere else.
   * ------------------------------------------------------------------ */

  function parseHotkey(spec) {
    if (spec === false || spec == null || spec === '') return null;
    var parts = String(spec).toLowerCase().split('+');
    var hk = { key: '', mod: false, ctrl: false, shift: false, alt: false, meta: false };
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/\s+/g, '');
      if (p === 'mod') hk.mod = true;
      else if (p === 'ctrl' || p === 'control') hk.ctrl = true;
      else if (p === 'shift') hk.shift = true;
      else if (p === 'alt' || p === 'option') hk.alt = true;
      else if (p === 'meta' || p === 'cmd' || p === 'command' || p === 'win') hk.meta = true;
      else hk.key = p;
    }
    return hk.key ? hk : null;
  }

  function matchesHotkey(e, hk) {
    var key = e.key ? String(e.key).toLowerCase() : '';
    if (key === 'esc') key = 'escape';
    if (key !== hk.key) return false;
    var ctrl = hk.ctrl || (hk.mod && !IS_MAC);
    var meta = hk.meta || (hk.mod && IS_MAC);
    return e.ctrlKey === ctrl && e.metaKey === meta &&
      e.shiftKey === hk.shift && e.altKey === hk.alt;
  }

  /* ------------------------------------------------------------------ *
   * Fuzzy matching — case/diacritic-insensitive subsequence over
   * label + keywords. Scoring: consecutive-run bonus, word-start bonus,
   * earlier-first-match bonus.
   * ------------------------------------------------------------------ */

  // Fold to lowercase and strip diacritics ONE CHAR AT A TIME so the folded
  // string stays index-aligned with the original — highlight positions map
  // straight back onto the raw label.
  function fold(s) {
    s = String(s).toLowerCase();
    if (!s.normalize) return s;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      var f = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += f.length === 1 ? f : c;
    }
    return out;
  }

  var WORD_BREAK = /[\s\-_./:]/;

  // q must already be folded and whitespace-free. Returns null on no match,
  // else { score, positions } with positions into the ORIGINAL text.
  function fuzzyMatch(q, text) {
    var t = fold(text);
    var qi = 0, score = 0, run = 0, first = -1;
    var positions = [];
    for (var i = 0; i < t.length && qi < q.length; i++) {
      if (t.charAt(i) === q.charAt(qi)) {
        if (first < 0) first = i;
        var pts = 1;
        if (run > 0) pts += 5;                                     // consecutive run
        if (i === 0 || WORD_BREAK.test(t.charAt(i - 1))) pts += 8; // word start
        score += pts;
        run++;
        positions.push(i);
        qi++;
      } else {
        run = 0;
      }
    }
    if (qi < q.length) return null;
    score += Math.max(0, 12 - first); // earlier first hit ranks higher
    return { score: score, positions: positions };
  }

  /* ------------------------------------------------------------------ *
   * Option plumbing.
   * ------------------------------------------------------------------ */

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  function normalizeCommand(c) {
    if (!c || c.id == null) return null;
    var keywords = c.keywords;
    if (typeof keywords === 'string') keywords = keywords.split(/\s+/);
    if (!Array.isArray(keywords)) keywords = [];
    return {
      id: String(c.id),
      label: c.label == null ? String(c.id) : String(c.label),
      hint: c.hint == null ? '' : String(c.hint),
      group: c.group == null ? '' : String(c.group),
      icon: c.icon == null ? '' : String(c.icon), // TRUSTED svg markup
      keywords: keywords.map(String),
      action: typeof c.action === 'function' ? c.action : null,
      disabled: !!c.disabled
    };
  }

  /* ------------------------------------------------------------------ *
   * CommandPalette.
   * ------------------------------------------------------------------ */

  function CommandPalette(options) {
    options = options || {};
    this.opts = assignOptions({}, CommandPalette.defaults, options);
    this.commands = [];
    this.isOpen = false;
    this.root = null;      // built lazily on first open (SSR: never)
    this.panel = null;
    this.input = null;
    this.list = null;
    this._recent = [];     // command ids, most recent first, session-only
    this._rows = [];       // current result rows: { cmd, positions }
    this._optEls = [];
    this._active = -1;
    this._query = '';
    this._prevFocus = null;
    this._closeTimer = null;
    this._idBase = 'vcmd-' + (++uid);

    if (options.commands) this.register(options.commands);

    this._hotkey = parseHotkey(this.opts.hotkey);
    if (HAS_DOM && this._hotkey) {
      var self = this;
      // Deliberately fires from inputs/textareas/contenteditable too — the
      // hotkey is the ONLY global binding, so plain typing is never touched.
      this._onHotkey = function (e) {
        if (matchesHotkey(e, self._hotkey)) {
          e.preventDefault();
          self.toggle();
        }
      };
      window.addEventListener('keydown', this._onHotkey);
    }
    if (HAS_DOM) instances.push(this);
  }

  CommandPalette.prototype = {
    constructor: CommandPalette,

    /* ---------------- command registry ---------------- */

    // register(command | commands[]) — appends; a command with an already
    // registered id replaces the old one IN PLACE (order is stable).
    register: function (input) {
      var list = Array.isArray(input) ? input : [input];
      for (var i = 0; i < list.length; i++) {
        var cmd = normalizeCommand(list[i]);
        if (!cmd) continue;
        var at = this._indexOf(cmd.id);
        if (at === -1) this.commands.push(cmd);
        else this.commands[at] = cmd;
      }
      if (this.isOpen) this._render(this._query);
      return this;
    },

    unregister: function (id) {
      var at = this._indexOf(String(id));
      if (at !== -1) this.commands.splice(at, 1);
      var r = this._recent.indexOf(String(id));
      if (r !== -1) this._recent.splice(r, 1);
      if (this.isOpen) this._render(this._query);
      return this;
    },

    _indexOf: function (id) {
      for (var i = 0; i < this.commands.length; i++) {
        if (this.commands[i].id === id) return i;
      }
      return -1;
    },

    _remember: function (id) {
      if (!this.opts.recent) return;
      var at = this._recent.indexOf(id);
      if (at !== -1) this._recent.splice(at, 1);
      this._recent.unshift(id);
      if (this._recent.length > MAX_RECENT) this._recent.pop();
    },

    /* ---------------- open / close ---------------- */

    open: function () {
      if (!HAS_DOM || this.isOpen) return this;
      if (this.opts.styles !== false) {
        if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
        else injectOwnStyles();
      }
      ensureThemeWatch();
      this._build();
      this._applyTheme();

      this._prevFocus = document.activeElement;
      this.isOpen = true;
      clearTimeout(this._closeTimer);
      this.root.classList.remove('vcmd-out');
      this.root.style.display = '';
      this.input.value = '';
      this._render('');
      this.input.setAttribute('aria-expanded', 'true');

      // Double rAF so the initial (hidden) styles are committed first.
      var root = this.root;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.add('vcmd-open'); });
      });
      this.input.focus();
      if (this.opts.onOpen) this.opts.onOpen(this);
      return this;
    },

    close: function () {
      if (!HAS_DOM || !this.isOpen) return this;
      this.isOpen = false;
      this.root.classList.remove('vcmd-open');
      this.root.classList.add('vcmd-out');
      this.input.setAttribute('aria-expanded', 'false');
      var root = this.root;
      this._closeTimer = setTimeout(function () {
        root.style.display = 'none';
        root.classList.remove('vcmd-out');
      }, OUT_MS);
      // Give focus back to wherever the user was before the palette opened.
      var prev = this._prevFocus;
      this._prevFocus = null;
      if (prev && prev.focus && document.documentElement.contains(prev)) prev.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close() : this.open();
    },

    destroy: function () {
      if (this._onHotkey && HAS_DOM) window.removeEventListener('keydown', this._onHotkey);
      clearTimeout(this._closeTimer);
      if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
      this.root = this.panel = this.input = this.list = null;
      this.isOpen = false;
      var at = instances.indexOf(this);
      if (at !== -1) instances.splice(at, 1);
      return this;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      if (this.root) this.root.setAttribute('data-theme', resolveTheme(this.opts.theme));
    },

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      if (this.root) return;
      var self = this;
      var L = this.opts.labels;
      var listId = this._idBase + '-list';

      var root = document.createElement('div');
      root.className = 'vcmd' + saltClass();
      root.style.display = 'none';

      var backdrop = document.createElement('div');
      backdrop.className = 'vcmd-backdrop';
      backdrop.addEventListener('click', function () { self.close(); });
      root.appendChild(backdrop);

      var panel = document.createElement('div');
      panel.className = 'vcmd-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', L.title);
      // Focus lives in the input for the whole session (ARIA combobox
      // pattern); swallow mousedown elsewhere so clicks can't steal it.
      panel.addEventListener('mousedown', function (e) {
        if (e.target !== self.input) e.preventDefault();
      });
      root.appendChild(panel);

      var search = document.createElement('div');
      search.className = 'vcmd-search';
      var glass = document.createElement('span');
      glass.className = 'vcmd-glass';
      glass.innerHTML = MAGNIFIER;
      search.appendChild(glass);

      var input = document.createElement('input');
      input.className = 'vcmd-input';
      input.type = 'text';
      input.placeholder = this.opts.placeholder;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', listId);
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-label', L.search);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      input.addEventListener('input', function () { self._render(input.value); });
      input.addEventListener('keydown', function (e) { self._onKeydown(e); });
      search.appendChild(input);
      panel.appendChild(search);

      var list = document.createElement('div');
      list.className = 'vcmd-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.commands);
      list.addEventListener('mouseover', function (e) {
        var at = self._optionIndex(e.target);
        if (at !== -1 && !self._rows[at].cmd.disabled) self._setActive(at, false);
      });
      list.addEventListener('click', function (e) {
        var at = self._optionIndex(e.target);
        if (at !== -1) self._run(at);
      });
      panel.appendChild(list);

      var footer = document.createElement('div');
      footer.className = 'vcmd-footer';
      footer.setAttribute('aria-hidden', 'true');
      footer.appendChild(footItem(['↑', '↓'], L.navigate));
      footer.appendChild(footItem(['↵'], L.run));
      footer.appendChild(footItem(['esc'], L.close));
      panel.appendChild(footer);

      document.body.appendChild(root);
      this.root = root;
      this.panel = panel;
      this.input = input;
      this.list = list;
    },

    _optionIndex: function (target) {
      var el = target;
      while (el && el !== this.list) {
        if (el.getAttribute && el.getAttribute('data-index') != null) {
          return +el.getAttribute('data-index');
        }
        el = el.parentNode;
      }
      return -1;
    },

    /* ---------------- results + rendering ---------------- */

    // Empty query → every command, grouped in registration order (Recent
    // first when enabled). Non-empty → flat list sorted by fuzzy score,
    // capped at maxResults.
    _results: function (query) {
      var q = fold(query).replace(/\s+/g, '');
      var rows = [];
      var i, cmd;

      if (!q) {
        if (this.opts.recent && this._recent.length) {
          rows.push({ group: this.opts.labels.recent });
          for (i = 0; i < this._recent.length; i++) {
            var at = this._indexOf(this._recent[i]);
            if (at !== -1) rows.push({ cmd: this.commands[at], positions: null });
          }
        }
        // Groups in first-registration order; ungrouped commands lead with
        // no header of their own.
        var order = [], seen = {};
        for (i = 0; i < this.commands.length; i++) {
          var g = this.commands[i].group;
          if (!seen[g]) { seen[g] = true; order.push(g); }
        }
        for (var gi = 0; gi < order.length; gi++) {
          if (order[gi]) rows.push({ group: order[gi] });
          for (i = 0; i < this.commands.length; i++) {
            cmd = this.commands[i];
            if (cmd.group === order[gi]) rows.push({ cmd: cmd, positions: null });
          }
        }
        return rows;
      }

      var scored = [];
      for (i = 0; i < this.commands.length; i++) {
        cmd = this.commands[i];
        var best = fuzzyMatch(q, cmd.label);
        var positions = best ? best.positions : null;
        for (var k = 0; k < cmd.keywords.length; k++) {
          var m = fuzzyMatch(q, cmd.keywords[k]);
          // Keyword hits rank a shade below equal label hits and never
          // highlight (the matched text isn't on screen).
          if (m && (!best || m.score - 1 > best.score)) {
            best = m;
            positions = null;
          }
        }
        if (best) scored.push({ cmd: cmd, positions: positions, score: best.score, idx: i });
      }
      scored.sort(function (a, b) {
        return b.score - a.score || a.idx - b.idx; // stable: registration order breaks ties
      });
      var max = +this.opts.maxResults || 12;
      if (scored.length > max) scored.length = max;
      for (i = 0; i < scored.length; i++) {
        rows.push({ cmd: scored[i].cmd, positions: scored[i].positions });
      }
      return rows;
    },

    _render: function (query) {
      this._query = String(query == null ? '' : query);
      var rows = this._results(this._query);
      var list = this.list;
      list.textContent = '';
      this._rows = [];
      this._optEls = [];
      this._active = -1;

      if (!rows.length) {
        var empty = document.createElement('div');
        empty.className = 'vcmd-empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = this.opts.emptyText;
        list.appendChild(empty);
        this._setActive(-1, false);
        return;
      }

      var firstEnabled = -1;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.group != null) {
          var head = document.createElement('div');
          head.className = 'vcmd-group';
          head.setAttribute('role', 'presentation');
          head.textContent = row.group;
          list.appendChild(head);
          continue;
        }
        var n = this._rows.length;
        this._rows.push(row);
        var opt = this._buildOption(row.cmd, row.positions, n);
        this._optEls.push(opt);
        list.appendChild(opt);
        if (firstEnabled === -1 && !row.cmd.disabled) firstEnabled = n;
      }
      list.scrollTop = 0;
      this._setActive(firstEnabled, false);
    },

    _buildOption: function (cmd, positions, n) {
      var opt = document.createElement('div');
      opt.className = 'vcmd-option' + (cmd.disabled ? ' is-disabled' : '');
      opt.id = this._idBase + '-opt-' + n;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', 'false');
      opt.setAttribute('data-index', String(n));
      if (cmd.disabled) opt.setAttribute('aria-disabled', 'true');

      if (cmd.icon) {
        var icon = document.createElement('span');
        icon.className = 'vcmd-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = cmd.icon; // documented as TRUSTED markup
        opt.appendChild(icon);
      }
      opt.appendChild(buildLabel(cmd.label, positions));
      if (cmd.hint) {
        var hint = document.createElement('span');
        hint.className = 'vcmd-hint';
        hint.textContent = cmd.hint;
        opt.appendChild(hint);
      }
      return opt;
    },

    _setActive: function (n, scroll) {
      this._active = n;
      for (var i = 0; i < this._optEls.length; i++) {
        var on = i === n;
        this._optEls[i].classList.toggle('is-active', on);
        this._optEls[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      if (n === -1) this.input.removeAttribute('aria-activedescendant');
      else this.input.setAttribute('aria-activedescendant', this._optEls[n].id);
      if (scroll && n !== -1) {
        // Manual "nearest" scrolling; .vcmd-list is the offset parent.
        var el = this._optEls[n], list = this.list;
        if (el.offsetTop < list.scrollTop) {
          list.scrollTop = el.offsetTop;
        } else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
    },

    _move: function (dir) {
      var n = this._rows.length;
      if (!n) return;
      var i = this._active;
      for (var step = 0; step < n; step++) {
        i = (i + dir + n) % n; // wrap both ways
        if (!this._rows[i].cmd.disabled) {
          this._setActive(i, true);
          return;
        }
      }
    },

    /* ---------------- keyboard ---------------- */

    _onKeydown: function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'Down') {
        e.preventDefault();
        this._move(1);
      } else if (k === 'ArrowUp' || k === 'Up') {
        e.preventDefault();
        this._move(-1);
      } else if (k === 'Enter') {
        if (e.isComposing) return;
        e.preventDefault();
        this._run(this._active);
      } else if (k === 'Escape' || k === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        // First Esc clears a non-empty query; the second closes.
        if (this.input.value) {
          this.input.value = '';
          this._render('');
        } else {
          this.close();
        }
      } else if (k === 'Tab') {
        e.preventDefault(); // focus stays trapped in the combobox
      }
    },

    _run: function (n) {
      var row = this._rows[n];
      if (!row || row.cmd.disabled) return;
      var cmd = row.cmd;
      this.close(); // close FIRST so the action can open dialogs / move focus
      this._remember(cmd.id);
      if (cmd.action) cmd.action(cmd, this);
      if (this.opts.onRun) this.opts.onRun(cmd, this);
    }
  };

  function buildLabel(text, positions) {
    // Matched characters are wrapped with DOM methods — user strings never
    // pass through innerHTML.
    var label = document.createElement('span');
    label.className = 'vcmd-label';
    text = String(text);
    if (!positions || !positions.length) {
      label.textContent = text;
      return label;
    }
    var last = 0, i = 0;
    while (i < positions.length) {
      var start = positions[i], end = start + 1;
      while (i + 1 < positions.length && positions[i + 1] === end) { i++; end++; }
      if (start > last) label.appendChild(document.createTextNode(text.slice(last, start)));
      var mark = document.createElement('span');
      mark.className = 'vcmd-mark';
      mark.textContent = text.slice(start, end);
      label.appendChild(mark);
      last = end;
      i++;
    }
    if (last < text.length) label.appendChild(document.createTextNode(text.slice(last)));
    return label;
  }

  function footItem(keys, text) {
    var item = document.createElement('span');
    for (var i = 0; i < keys.length; i++) {
      var key = document.createElement('span');
      key.className = 'vcmd-key';
      key.textContent = keys[i];
      item.appendChild(key);
    }
    item.appendChild(document.createTextNode(text));
    return item;
  }

  function injectOwnStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  CommandPalette.version = '1.0.0';
  CommandPalette.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(CommandPalette, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    CommandPalette.css = renderCss();
  }

  CommandPalette.defaults = {
    hotkey: 'mod+k',        // 'mod' = Cmd on macOS, Ctrl elsewhere; false disables
    placeholder: 'Type a command…',
    maxResults: 12,         // cap on FILTERED results (empty query shows all)
    emptyText: 'No matching commands',
    recent: false,          // true = in-memory "Recent" group (last 5 run, no storage)
    styles: true,           // false = headless, no CSS ever injected
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    labels: {
      title: 'Command palette',
      search: 'Search commands',
      commands: 'Commands',
      recent: 'Recent',
      navigate: 'navigate',
      run: 'run',
      close: 'close'
    },
    onOpen: null,           // fn(palette)
    onClose: null,          // fn(palette)
    onRun: null             // fn(command, palette)
  };

  // Zero-setup surface: the statics below proxy a lazily created default
  // instance, so `CommandPalette.register({...})` is all a page needs.
  var defaultInstance = null;

  function getDefault() {
    if (!defaultInstance) defaultInstance = new CommandPalette();
    return defaultInstance;
  }

  CommandPalette.register = function (commands) {
    getDefault().register(commands);
    return CommandPalette;
  };
  CommandPalette.unregister = function (id) {
    getDefault().unregister(id);
    return CommandPalette;
  };
  CommandPalette.open = function () { getDefault().open(); return CommandPalette; };
  CommandPalette.close = function () { getDefault().close(); return CommandPalette; };
  CommandPalette.toggle = function () { getDefault().toggle(); return CommandPalette; };

  // Declarative opener: any [data-command-open] element opens the default
  // palette on click.
  CommandPalette.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-command-open]');
    var wired = [];
    for (var i = 0; i < els.length; i++) {
      if (els[i]._vcmdWired) continue;
      els[i]._vcmdWired = true;
      els[i].addEventListener('click', function () { CommandPalette.open(); });
      wired.push(els[i]);
    }
    return wired;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { CommandPalette.autoInit(); });
    } else {
      CommandPalette.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  CommandPalette.displayName = 'CommandPalette';
  CommandPalette.rootClass = 'vcmd';
  CommandPalette.themeVars = {
    accent: '--vcmd-accent',
    radius: '--vcmd-radius',
    font: '--vcmd-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  CommandPalette.varScopes = ['.vcmd', '.vcmd[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('command', CommandPalette);
  }

  return CommandPalette;
});
