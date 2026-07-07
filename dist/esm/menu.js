/*! vanilla-ui-kit/menu v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Menu v1.0.0
 * A single-file, zero-dependency dropdown action menu for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="menu.js"></script>
 *   <button id="more">More</button>
 *   <script>new Menu('#more', { items: [{ label: 'Rename', onSelect: fn }] })</script>
 *
 * Headless:
 *   Menu.defaults.styles = false   // no CSS injected; style .vmn-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Menu = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var STYLE_ID = 'vanilla-menu-styles';
  var OUT_MS = 130; // keep in sync with the .vmn closing transition
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Menu.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Menu.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the menu; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vmn{--vmn-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vmn{' +
      '--vmn-accent:#5b5bd6;' +
      '--vmn-danger:#e5484d;' +
      '--vmn-bg:#ffffff;' +
      '--vmn-surface:#f2f2f5;' +
      '--vmn-text:#1c1d21;' +
      '--vmn-muted:#72747e;' +
      '--vmn-faint:#e7e7ec;' +
      '--vmn-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vmn-radius:12px;' +
      '--vmn-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vmn[data-theme=dark]{' +
      '--vmn-accent:#7b7bea;' +
      '--vmn-danger:#f2555a;' +
      '--vmn-bg:#1b1d24;' +
      '--vmn-surface:#272a33;' +
      '--vmn-text:#e9eaf0;' +
      '--vmn-muted:#989aa6;' +
      '--vmn-faint:#31343f;' +
      '--vmn-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vmn.SALT{' +
      'position:absolute;z-index:99999;box-sizing:border-box;' +
      'min-width:180px;max-width:320px;padding:6px;' +
      'background:var(--vmn-bg);color:var(--vmn-text);' +
      'font-family:var(--vmn-font);font-size:14px;line-height:1.4;' +
      'border:1px solid var(--vmn-faint);border-radius:var(--vmn-radius);' +
      'box-shadow:var(--vmn-shadow);' +
      '-webkit-user-select:none;user-select:none;' +
      'opacity:0;transform:scale(.97);' +
      'transition:opacity .11s ease,transform .13s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vmn.SALT *,.vmn.SALT *::before,.vmn.SALT *::after{box-sizing:border-box;}' +
    '.vmn.SALT.vmn-open{opacity:1;transform:none;}' +
    '.vmn.SALT .vmn-item{display:flex;align-items:center;gap:9px;width:100%;' +
      'font:inherit;color:inherit;text-align:left;background:none;border:0;' +
      'border-radius:8px;padding:7px 10px;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vmn.SALT .vmn-item:hover{background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item:focus{outline:none;background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item:focus-visible{outline:2px solid var(--vmn-accent);outline-offset:-2px;}' +
    '.vmn.SALT .vmn-item[aria-expanded=true]{background:var(--vmn-surface);}' +
    '.vmn.SALT .vmn-item[aria-disabled=true]{opacity:.45;cursor:default;}' +
    '.vmn.SALT .vmn-item[aria-disabled=true]:hover,' +
    '.vmn.SALT .vmn-item[aria-disabled=true]:focus{background:none;}' +
    '.vmn.SALT .vmn-item.vmn-danger{color:var(--vmn-danger);}' +
    '.vmn.SALT .vmn-item.vmn-danger .vmn-icon{color:var(--vmn-danger);}' +
    '.vmn.SALT .vmn-icon{flex:none;width:16px;height:16px;display:grid;place-items:center;' +
      'color:var(--vmn-muted);}' +
    '.vmn.SALT .vmn-icon svg{display:block;}' +
    '.vmn.SALT .vmn-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;}' +
    '.vmn.SALT .vmn-hint{flex:none;font-size:12px;color:var(--vmn-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vmn.SALT .vmn-caret{flex:none;display:grid;place-items:center;color:var(--vmn-muted);}' +
    '.vmn.SALT .vmn-caret svg{display:block;}' +
    '.vmn.SALT .vmn-sep{height:1px;margin:6px 4px;background:var(--vmn-faint);}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vmn.SALT,.vmn.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/menu.css), or set Menu.salt to your
  // own token / false BEFORE the first menu is opened.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Menu.salt;
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

  function injectOwnStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    // Insert before the page's own CSS so `.vmn { --vmn-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var CARET = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var allInstances = [];
  var ownMql = null;
  var ownObserver = null;
  var watching = false;

  function vcCore() {
    return (HAS_DOM && window.VC && window.VC.theme) ? window.VC : null;
  }

  function resolveAutoTheme() {
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
    for (var i = 0; i < allInstances.length; i++) allInstances[i]._applyTheme();
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
   * Popup positioning — VC.position when core is present, else a private
   * fallback with the same approach (flip when no room, clamp, <dialog>).
   * ------------------------------------------------------------------ */

  function fallbackPosition(panel, anchor, placement) {
    placement = String(placement || 'bottom-start');
    var r = anchor.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var gap = 6, pad = 8;

    var below = placement.indexOf('top') === 0 ? false :
      (vh - r.bottom >= ph + gap || r.top < ph + gap);
    var top = below ? r.bottom + gap : r.top - ph - gap;
    var x = /-end$/.test(placement) ? r.right - pw : r.left;
    var left = Math.min(Math.max(pad, x), Math.max(pad, vw - pw - pad));

    // Inside an open <dialog> the panel must ride in the top layer with the
    // dialog (fixed, viewport coordinates); otherwise absolute in the page.
    var fixed = !!(anchor.closest && anchor.closest('dialog'));
    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
  }

  // Context menus open at pointer coordinates and flip inward at the edges.
  function positionAtPoint(panel, x, y) {
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var pad = 8;
    if (x + pw > vw - pad) x = Math.max(pad, x - pw);
    if (y + ph > vh - pad) y = Math.max(pad, y - ph);
    panel.style.position = 'absolute';
    panel.style.top = Math.round(y + window.scrollY) + 'px';
    panel.style.left = Math.round(x + window.scrollX) + 'px';
  }

  // Flyouts sit beside their parent item; -7 lines the first sub item up
  // with the parent (6px panel padding + 1px border).
  function positionSub(panel, parentBtn) {
    var r = parentBtn.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var pad = 8;
    var left = r.right + 2;
    if (left + pw > vw - pad) left = Math.max(pad, r.left - pw - 2);
    var top = Math.min(Math.max(pad, r.top - 7), Math.max(pad, vh - ph - pad));
    var fixed = !!(parentBtn.closest && parentBtn.closest('dialog'));
    panel.style.position = fixed ? 'fixed' : 'absolute';
    panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
    panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
  }

  /* ------------------------------------------------------------------ *
   * Panel building. Labels and hints are TEXT (rendered with textContent);
   * `icon` is trusted SVG markup, same contract as Toast's icons.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function hasSubmenu(rec, it) {
    // One level of nesting only — `items` inside a flyout render as plain items.
    return !rec.isSub && Array.isArray(it.items) && it.items.length > 0;
  }

  function buildPanel(inst, items, isSub) {
    var el = document.createElement('div');
    el.className = 'vmn' + saltClass() + (isSub ? ' vmn-sub' : '');
    el.setAttribute('role', 'menu');
    el.tabIndex = -1;
    var rec = { el: el, items: [], buttons: [], isSub: !!isSub };

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.type === 'separator') {
        var sep = document.createElement('div');
        sep.className = 'vmn-sep';
        sep.setAttribute('role', 'separator');
        el.appendChild(sep);
        continue;
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vmn-item' + (it.danger ? ' vmn-danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-idx', String(rec.items.length));
      btn.tabIndex = -1;
      if (it.disabled) btn.setAttribute('aria-disabled', 'true');
      if (it.icon) {
        var icon = document.createElement('span');
        icon.className = 'vmn-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = String(it.icon); // trusted markup by contract
        btn.appendChild(icon);
      }
      var label = document.createElement('span');
      label.className = 'vmn-label';
      label.textContent = it.label == null ? '' : String(it.label);
      btn.appendChild(label);
      if (hasSubmenu(rec, it)) {
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        var caret = document.createElement('span');
        caret.className = 'vmn-caret';
        caret.innerHTML = CARET;
        btn.appendChild(caret);
      } else if (it.hint) {
        var hint = document.createElement('span');
        hint.className = 'vmn-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = String(it.hint);
        btn.appendChild(hint);
      }
      rec.items.push(it);
      rec.buttons.push(btn);
      el.appendChild(btn);
    }

    el.addEventListener('click', function (e) { inst._handleClick(rec, e); });
    el.addEventListener('keydown', function (e) { inst._handleKeydown(rec, e); });
    el.addEventListener('mouseover', function (e) { inst._handleOver(rec, e); });
    return rec;
  }

  // Next enabled index from `from` in direction `dir`, wrapping; -1 if none.
  function step(rec, from, dir) {
    var n = rec.buttons.length;
    var i = from;
    for (var k = 0; k < n; k++) {
      i = ((i + dir) % n + n) % n;
      if (!rec.items[i].disabled) return i;
    }
    return -1;
  }

  var openInst = null; // the single open root menu

  var dummyMenu = {
    el: null,
    trigger: null,
    isOpen: false,
    open: function () { return dummyMenu; },
    close: function () { return dummyMenu; },
    toggle: function () { return dummyMenu; },
    update: function () { return dummyMenu; },
    destroy: function () { return dummyMenu; }
  };

  /* ------------------------------------------------------------------ *
   * Menu.
   * ------------------------------------------------------------------ */

  function Menu(trigger, options) {
    if (!HAS_DOM) return dummyMenu;
    var el = null;
    if (trigger != null) { // null trigger = detached (Menu.open at coordinates)
      el = resolveElement(trigger);
      if (!el) throw new Error('Menu: trigger element not found: ' + trigger);
      var existing = instances && instances.get(el);
      if (existing) existing.destroy();
    }
    options = options || {};
    this.trigger = el;
    this.el = null; // the panel, once first opened
    this.opts = {};
    for (var k in Menu.defaults) this.opts[k] = Menu.defaults[k];
    for (k in options) if (options[k] !== undefined) this.opts[k] = options[k];
    this._items = Array.isArray(this.opts.items) ? this.opts.items : [];
    this.isOpen = false;
    this._root = null;      // {el, items, buttons, isSub}
    this._sub = null;       // open flyout record
    this._subBtn = null;    // the flyout's parent item
    this._at = null;        // {x,y} viewport coords for detached menus
    this._transient = false;
    this._typeBuf = '';
    this._typeTimer = null;
    this._closeTimer = null;
    this._bind();
    if (el) {
      el.setAttribute('aria-haspopup', 'menu');
      el.setAttribute('aria-expanded', 'false');
      if (instances) instances.set(el, this);
    }
    allInstances.push(this);
  }

  Menu.prototype = {
    constructor: Menu,

    /* ---------------- wiring ---------------- */

    _bind: function () {
      var self = this;
      this._onTriggerClick = function (e) {
        var wasOpen = self.isOpen;
        self.toggle();
        // e.detail === 0 → the click came from Enter/Space on the trigger;
        // keyboard opens land focus on the first item.
        if (!wasOpen && self.isOpen && e.detail === 0) self._focusEdge(self._root, 1);
      };
      this._onTriggerKeydown = function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          self.open();
          self._focusEdge(self._root, e.key === 'ArrowDown' ? 1 : -1);
        }
      };
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (self._root && path.indexOf(self._root.el) !== -1) return;
        if (self._sub && path.indexOf(self._sub.el) !== -1) return;
        if (self.trigger && path.indexOf(self.trigger) !== -1) return;
        self.close(false);
      };
      this._onDocKeydown = function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); self.close(true); }
      };
      this._onWinScroll = function () {
        // Detached menus keep their page coordinates; anchored ones track.
        if (self.isOpen && self.trigger) self._position();
      };
      if (this.trigger) {
        this.trigger.addEventListener('click', this._onTriggerClick);
        this.trigger.addEventListener('keydown', this._onTriggerKeydown);
      }
    },

    /* ---------------- theming ---------------- */

    _resolvedTheme: function () {
      var t = this.opts.theme;
      return (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
    },

    _applyTheme: function () {
      var t = this._resolvedTheme();
      if (this._root) this._root.el.setAttribute('data-theme', t);
      if (this._sub) this._sub.el.setAttribute('data-theme', t);
    },

    /* ---------------- positioning ---------------- */

    _position: function () {
      if (!this._root) return;
      var panel = this._root.el;
      if (!this.trigger) {
        positionAtPoint(panel, this._at ? this._at.x : 0, this._at ? this._at.y : 0);
      } else if (window.VC && window.VC.position) {
        var placement = String(this.opts.placement || 'bottom-start');
        var res = window.VC.position(panel, this.trigger, {
          prefer: placement.indexOf('top') === 0 ? 'above' : undefined
        });
        if (res && /-end$/.test(placement)) {
          // VC.position is start-aligned; shift for the -end placements.
          var r = res.anchorRect, pw = panel.offsetWidth;
          var vw = document.documentElement.clientWidth;
          var left = Math.min(Math.max(8, r.right - pw), Math.max(8, vw - pw - 8));
          panel.style.left = Math.round(left + (res.fixed ? 0 : window.scrollX)) + 'px';
        }
      } else {
        fallbackPosition(panel, this.trigger, this.opts.placement);
      }
      if (this._sub) positionSub(this._sub.el, this._subBtn);
    },

    /* ---------------- focus / keyboard ---------------- */

    _focusIdx: function (rec, i) {
      if (rec && i >= 0 && rec.buttons[i]) rec.buttons[i].focus();
    },

    _focusEdge: function (rec, dir) {
      if (!rec) return;
      this._focusIdx(rec, dir > 0 ? step(rec, -1, 1) : step(rec, 0, -1));
    },

    _handleKeydown: function (rec, e) {
      var key = e.key;
      if (key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
        return;
      }
      if (key === 'Tab') { this.close(false); return; } // let focus move on
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      var cur = btn && rec.el.contains(btn) ? +btn.getAttribute('data-idx') : -1;
      var it = cur >= 0 ? rec.items[cur] : null;

      if (key === 'ArrowDown') {
        e.preventDefault();
        this._focusIdx(rec, step(rec, cur, 1));
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        this._focusIdx(rec, cur === -1 ? step(rec, 0, -1) : step(rec, cur, -1));
      } else if (key === 'Home') {
        e.preventDefault();
        this._focusEdge(rec, 1);
      } else if (key === 'End') {
        e.preventDefault();
        this._focusEdge(rec, -1);
      } else if (key === 'ArrowRight') {
        if (it && hasSubmenu(rec, it) && !it.disabled) {
          e.preventDefault();
          this._openSub(btn, it, true);
        }
      } else if (key === 'ArrowLeft') {
        if (rec.isSub) {
          e.preventDefault();
          var pb = this._subBtn;
          this._closeSub();
          if (pb) pb.focus();
        }
      } else if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (cur >= 0) this._activate(rec, cur);
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this._typeahead(rec, cur, key);
      }
    },

    // First-letter typeahead; a repeated single letter cycles its matches.
    _typeahead: function (rec, cur, ch) {
      var self = this;
      clearTimeout(this._typeTimer);
      this._typeTimer = setTimeout(function () { self._typeBuf = ''; }, 500);
      this._typeBuf += ch.toLowerCase();
      var buf = this._typeBuf;
      var repeated = buf.length > 1 && /^(.)\1+$/.test(buf);
      var needle = repeated ? buf.charAt(0) : buf;
      var start = (repeated || buf.length === 1) ? cur + 1 : cur;
      var n = rec.buttons.length;
      for (var k = 0; k < n; k++) {
        var i = ((start + k) % n + n) % n;
        var itm = rec.items[i];
        if (itm.disabled) continue;
        if (String(itm.label || '').toLowerCase().indexOf(needle) === 0) {
          this._focusIdx(rec, i);
          return;
        }
      }
    },

    /* ---------------- pointer ---------------- */

    _handleClick: function (rec, e) {
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      if (!btn || !rec.el.contains(btn)) return;
      this._activate(rec, +btn.getAttribute('data-idx'));
    },

    _handleOver: function (rec, e) {
      var btn = e.target.closest ? e.target.closest('.vmn-item') : null;
      if (!btn || !rec.el.contains(btn)) return;
      var it = rec.items[+btn.getAttribute('data-idx')];
      if (!it) return;
      if (!it.disabled) btn.focus(); // hover moves the roving focus
      if (!rec.isSub) {
        if (hasSubmenu(rec, it) && !it.disabled) {
          if (this._subBtn !== btn) this._openSub(btn, it, false);
        } else {
          this._closeSub();
        }
      }
    },

    _activate: function (rec, idx) {
      var it = rec.items[idx];
      if (!it || it.disabled) return;
      if (hasSubmenu(rec, it)) {
        // Click / Enter / Space on a flyout parent toggles the flyout.
        if (this._subBtn === rec.buttons[idx]) this._closeSub();
        else this._openSub(rec.buttons[idx], it, true);
        return;
      }
      if (it.onSelect) it.onSelect(it, this);
      if (this.trigger) {
        this.trigger.dispatchEvent(new CustomEvent('menu:select', {
          bubbles: true,
          detail: { item: it, menu: this }
        }));
      }
      if (this.opts.closeOnSelect !== false) this.close(true);
    },

    /* ---------------- submenu ---------------- */

    _openSub: function (parentBtn, item, focusFirst) {
      this._closeSub();
      var rec = buildPanel(this, item.items, true);
      rec.el.setAttribute('data-theme', this._resolvedTheme());
      // Class added before insertion — flyouts appear instantly, only the
      // root panel plays the entry transition.
      rec.el.classList.add('vmn-open');
      this._root.el.parentNode.appendChild(rec.el);
      this._sub = rec;
      this._subBtn = parentBtn;
      parentBtn.setAttribute('aria-expanded', 'true');
      positionSub(rec.el, parentBtn);
      if (focusFirst) this._focusEdge(rec, 1);
    },

    _closeSub: function () {
      if (!this._sub) return;
      if (this._subBtn) this._subBtn.setAttribute('aria-expanded', 'false');
      if (this._sub.el.parentNode) this._sub.el.parentNode.removeChild(this._sub.el);
      this._sub = null;
      this._subBtn = null;
    },

    /* ---------------- public API ---------------- */

    open: function () {
      if (this.isOpen) return this;
      if (openInst && openInst !== this) openInst.close(false); // one root menu at a time
      if (this.opts.styles !== false) {
        if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
        else injectOwnStyles();
      }
      ensureThemeWatch();
      clearTimeout(this._closeTimer);

      if (!this._root) this._root = buildPanel(this, this._items, false);
      var panel = this._root.el;
      this.el = panel;
      panel.setAttribute('data-theme', this._resolvedTheme());

      // If the trigger lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the menu.
      var host = this.trigger && this.trigger.closest ? this.trigger.closest('dialog') : null;
      var parent = host || document.body;
      if (panel.parentNode !== parent) parent.appendChild(panel);
      panel.style.display = '';
      this._position();
      requestAnimationFrame(function () { panel.classList.add('vmn-open'); });

      this.isOpen = true;
      openInst = this;
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', this._onDocPointer, true);
      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);
      if (this.opts.onOpen) this.opts.onOpen(this);
      return this;
    },

    close: function (refocus) {
      if (!this.isOpen) return this;
      this.isOpen = false;
      if (openInst === this) openInst = null;
      this._closeSub();
      clearTimeout(this._typeTimer);
      this._typeBuf = '';
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      var panel = this._root && this._root.el;
      var focusInside = !!(panel && panel.contains(document.activeElement));
      if (panel) {
        panel.classList.remove('vmn-open');
        var self = this;
        clearTimeout(this._closeTimer);
        this._closeTimer = setTimeout(function () {
          panel.style.display = 'none';
          if (self._transient) self.destroy(); // Menu.open() menus are one-shot
        }, OUT_MS);
      }
      // refocus === false means "focus is moving elsewhere, leave it alone".
      if (this.trigger && refocus !== false && (refocus || focusInside)) this.trigger.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close() : this.open();
    },

    update: function (items) {
      this._items = Array.isArray(items) ? items : [];
      this.opts.items = this._items;
      var wasOpen = this.isOpen;
      var hadFocus = wasOpen && this._root && this._root.el.contains(document.activeElement);
      if (wasOpen) this.close(false);
      clearTimeout(this._closeTimer);
      if (this._root && this._root.el.parentNode) {
        this._root.el.parentNode.removeChild(this._root.el);
      }
      this._root = null;
      this.el = null;
      if (wasOpen) {
        this.open();
        if (hadFocus) this._focusEdge(this._root, 1);
      }
      return this;
    },

    destroy: function () {
      this._transient = false; // the pending close timer must not re-enter
      this.close(false);
      clearTimeout(this._closeTimer);
      clearTimeout(this._typeTimer);
      if (this._root && this._root.el.parentNode) {
        this._root.el.parentNode.removeChild(this._root.el);
      }
      this._root = null;
      this.el = null;
      if (this.trigger) {
        this.trigger.removeEventListener('click', this._onTriggerClick);
        this.trigger.removeEventListener('keydown', this._onTriggerKeydown);
        this.trigger.removeAttribute('aria-haspopup');
        this.trigger.removeAttribute('aria-expanded');
        if (instances) instances.delete(this.trigger);
      }
      var i = allInstances.indexOf(this);
      if (i !== -1) allInstances.splice(i, 1);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Menu.version = '1.0.0';
  Menu.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Menu, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Menu.css = renderCss();
  }

  Menu.defaults = {
    items: [],                // [{label, icon, hint, danger, disabled, onSelect, items} | {type:'separator'}]
    placement: 'bottom-start', // bottom|top - start|end; flips when out of room
    closeOnSelect: true,
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    styles: true,             // false = headless, no CSS ever injected
    onOpen: null,
    onClose: null
  };

  Menu.create = function (trigger, options) {
    return new Menu(trigger, options);
  };

  Menu.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  // Menu.open(x, y, items | opts) — a one-shot menu at viewport coordinates
  // (pair with `contextmenu` events: e.clientX / e.clientY). Destroys itself
  // on close; returns the instance.
  Menu.open = function (x, y, itemsOrOpts) {
    if (!HAS_DOM) return dummyMenu;
    var opts = Array.isArray(itemsOrOpts) ? { items: itemsOrOpts } : (itemsOrOpts || {});
    var m = new Menu(null, opts);
    m._transient = true;
    m._at = { x: +x || 0, y: +y || 0 };
    m.open();
    m._focusEdge(m._root, 1); // so Esc / arrows / typeahead work immediately
    return m;
  };

  Menu.closeAll = function () {
    if (openInst) openInst.close(false);
    return Menu;
  };

  // Declarative form for autoInit: `<button data-vmn="#file-menu">` where the
  // value selects a <template> (or any element) holding the items — <hr> is a
  // separator, every other child is an item. `data-label` (or the child's own
  // text) is the label; data-hint / data-value map through; data-danger and
  // data-disabled are flags; a nested <ul>/<menu> makes it a submenu of its
  // children. Selection dispatches a bubbling 'menu:select' CustomEvent on
  // the trigger with { item, menu } in `detail`.
  function parseChildren(children, isSub) {
    var items = [];
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.tagName === 'HR') {
        items.push({ type: 'separator' });
        continue;
      }
      var list = null;
      if (!isSub) {
        for (var j = 0; j < el.children.length; j++) {
          if (el.children[j].tagName === 'UL' || el.children[j].tagName === 'MENU') {
            list = el.children[j];
            break;
          }
        }
      }
      var label = el.getAttribute('data-label');
      if (label == null) {
        // The element's own text, minus any nested list markup.
        var clone = el.cloneNode(true);
        var l2 = clone.querySelector('ul,menu');
        if (l2 && l2.parentNode) l2.parentNode.removeChild(l2);
        label = clone.textContent.replace(/\s+/g, ' ').trim();
      }
      var item = {
        label: label,
        hint: el.getAttribute('data-hint') || undefined,
        value: el.getAttribute('data-value') || undefined,
        danger: el.hasAttribute('data-danger'),
        disabled: el.hasAttribute('data-disabled') || el.disabled === true
      };
      if (list) item.items = parseChildren(list.children, true);
      items.push(item);
    }
    return items;
  }

  Menu.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vmn]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        var src = document.querySelector(els[i].getAttribute('data-vmn'));
        if (!src) continue;
        created.push(new Menu(els[i], {
          items: parseChildren((src.content || src).children, false),
          placement: els[i].getAttribute('data-placement') || Menu.defaults.placement
        }));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Menu auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Menu.autoInit(); });
    } else {
      Menu.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Menu.displayName = 'Menu';
  Menu.rootClass = 'vmn';
  Menu.themeVars = {
    accent: '--vmn-accent',
    radius: '--vmn-radius',
    font: '--vmn-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Menu.varScopes = ['.vmn', '.vmn[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('menu', Menu);
  }

  return Menu;
});

}).call(__root);
var Menu = __root.Menu;
export { Menu };
export default Menu;
