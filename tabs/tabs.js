/*!
 * Vanilla UI Kit Tabs v1.0.0
 * A single-file, zero-dependency tabs widget for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="tabs.js"></script>
 *   <div id="tabs"><nav><button>A</button><button>B</button></nav>
 *     <section>Panel A</section><section>Panel B</section></div>
 *   <script>new Tabs('#tabs')</script>
 *
 * Or zero-JS:
 *   <div data-vtb>…same markup…</div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Tabs = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-tabs-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Tabs.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Tabs.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the tabs; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vtb{--vtb-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vtb{' +
      '--vtb-accent:#5b5bd6;' +
      '--vtb-text:#1c1d21;' +
      '--vtb-muted:#72747e;' +
      '--vtb-faint:#e7e7ec;' +
      '--vtb-radius:8px;' +
      '--vtb-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vtb[data-theme=dark]{' +
      '--vtb-accent:#7b7bea;' +
      '--vtb-text:#e9eaf0;' +
      '--vtb-muted:#989aa6;' +
      '--vtb-faint:#31343f;}' +
    '.vtb.SALT{font-family:var(--vtb-font);color:var(--vtb-text);}' +
    '.vtb.SALT .vtb-list{position:relative;display:flex;align-items:stretch;gap:2px;' +
      'margin:0;padding:0;list-style:none;box-sizing:border-box;' +
      'border-bottom:1px solid var(--vtb-faint);}' +
    '.vtb.SALT .vtb-tab{font:inherit;font-family:var(--vtb-font);font-size:14px;' +
      'font-weight:500;line-height:1.3;color:var(--vtb-muted);background:none;' +
      'border:0;border-radius:var(--vtb-radius) var(--vtb-radius) 0 0;' +
      'padding:10px 14px;margin:0;cursor:pointer;white-space:nowrap;' +
      'text-decoration:none;box-sizing:border-box;' +
      'transition:color .12s ease;-webkit-tap-highlight-color:transparent;}' +
    '.vtb.SALT .vtb-tab:hover{color:var(--vtb-text);}' +
    '.vtb.SALT .vtb-tab[aria-selected=true]{color:var(--vtb-accent);font-weight:600;}' +
    '.vtb.SALT .vtb-tab[disabled]{color:var(--vtb-muted);opacity:.4;cursor:not-allowed;}' +
    '.vtb.SALT .vtb-tab:focus{outline:none;}' +
    '.vtb.SALT .vtb-tab:focus-visible{outline:2px solid var(--vtb-accent);outline-offset:-2px;}' +
    /* the ink bar — one element that slides between tabs (JS sets transform/size) */
    '.vtb.SALT .vtb-ink{position:absolute;left:0;bottom:-1px;width:0;height:2px;' +
      'background:var(--vtb-accent);border-radius:1px;pointer-events:none;' +
      'transition:transform .22s cubic-bezier(.4,0,.2,1),width .22s cubic-bezier(.4,0,.2,1),' +
      'height .22s cubic-bezier(.4,0,.2,1);}' +
    '.vtb.SALT .vtb-panel{padding-top:14px;}' +
    '.vtb.SALT .vtb-panel:focus{outline:none;}' +
    '.vtb.SALT .vtb-panel:focus-visible{outline:2px solid var(--vtb-accent);' +
      'outline-offset:2px;border-radius:2px;}' +
    /* vertical: rail on the left, ink rides the right edge of the rail */
    '.vtb.SALT.vtb-vertical{display:flex;align-items:flex-start;gap:24px;}' +
    '.vtb.SALT.vtb-vertical .vtb-list{flex:none;flex-direction:column;align-items:stretch;' +
      'border-bottom:0;border-right:1px solid var(--vtb-faint);}' +
    '.vtb.SALT.vtb-vertical .vtb-tab{text-align:left;' +
      'border-radius:var(--vtb-radius) 0 0 var(--vtb-radius);}' +
    '.vtb.SALT.vtb-vertical .vtb-ink{left:auto;right:-1px;bottom:auto;top:0;' +
      'width:2px;height:0;}' +
    '.vtb.SALT.vtb-vertical .vtb-panel{flex:1;min-width:0;padding-top:0;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vtb.SALT .vtb-tab,.vtb.SALT .vtb-ink{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/tabs.css), or set Tabs.salt to your
  // own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Tabs.salt;
    if (s === false) return '';
    s = s == null ? DEFAULT_SALT : String(s).replace(/[^\w-]/g, '');
    return s || DEFAULT_SALT;
  }

  function renderCss() {
    var s = saltToken();
    return CSS.split('.SALT').join(s ? '.' + s : '');
  }

  function injectStyles() {
    if (!HAS_DOM) return;
    if (window.VC && window.VC.injectStyles) {
      window.VC.injectStyles(STYLE_ID, renderCss());
      return;
    }
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = renderCss();
    // Insert before the page's own CSS so `.vtb { --vtb-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var autoThemed = [];
  var ownMql = null;
  var ownObserver = null;

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

  function refreshAutoThemes() {
    for (var i = 0; i < autoThemed.length; i++) autoThemed[i]._applyTheme();
  }

  function watchAutoTheme(inst) {
    if (autoThemed.indexOf(inst) !== -1) return;
    autoThemed.push(inst);
    if (autoThemed.length !== 1 || !HAS_DOM) return;
    var core = vcCore();
    if (core) {
      core.theme.watch(refreshAutoThemes);
      return;
    }
    if (window.matchMedia) {
      ownMql = ownMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (ownMql.addEventListener) ownMql.addEventListener('change', refreshAutoThemes);
      else if (ownMql.addListener) ownMql.addListener(refreshAutoThemes);
    }
    if (typeof MutationObserver !== 'undefined') {
      ownObserver = new MutationObserver(refreshAutoThemes);
      ownObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-bs-theme']
      });
    }
  }

  function unwatchAutoTheme(inst) {
    var i = autoThemed.indexOf(inst);
    if (i !== -1) autoThemed.splice(i, 1);
    if (autoThemed.length !== 0) return;
    var core = vcCore();
    if (core) core.theme.unwatch(refreshAutoThemes);
    if (ownMql) {
      if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
      else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
    }
    if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Small helpers.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    return out;
  }

  function containsAll(node, els) {
    for (var i = 0; i < els.length; i++) {
      if (!node.contains(els[i])) return false;
    }
    return true;
  }

  // Canonical markup: first element child = the tab strip (its buttons/links
  // in order), following siblings = the panels in the same order. Authors
  // with custom structure pair explicitly via data-vtb-tab / data-vtb-panel
  // (matching values, or valueless attributes paired by document order).
  function parseMarkup(container) {
    var tabs = [], panels = [], list = null, i, j;
    var expl = container.querySelectorAll('[data-vtb-tab]');
    if (expl.length) {
      var pool = container.querySelectorAll('[data-vtb-panel]');
      for (i = 0; i < expl.length; i++) {
        var key = expl[i].getAttribute('data-vtb-tab');
        var panel = null;
        if (key) {
          for (j = 0; j < pool.length; j++) {
            if (pool[j].getAttribute('data-vtb-panel') === key) { panel = pool[j]; break; }
          }
        } else {
          panel = pool[i] || null;
        }
        if (!panel) continue;
        tabs.push(expl[i]);
        panels.push(panel);
      }
      // The tablist is the nearest ancestor holding ALL the tabs, so
      // per-tab wrappers (<li>, <span>) don't get mistaken for the strip.
      list = tabs.length ? tabs[0].parentNode : null;
      while (list && list !== container && !containsAll(list, tabs)) {
        list = list.parentNode;
      }
    } else {
      var kids = container.children;
      if (kids.length >= 2) {
        list = kids[0];
        var btns = list.querySelectorAll('button,a,[role=tab]');
        for (i = 0; i < btns.length && i + 1 < kids.length; i++) {
          tabs.push(btns[i]);
          panels.push(kids[i + 1]);
        }
      }
    }
    return { list: list, tabs: tabs, panels: panels };
  }

  // Builder mode: labels/content are TEXT by default (rendered with
  // textContent); `html: true` is an explicit opt-in for trusted markup.
  function buildDom(container, items) {
    var list = document.createElement('nav');
    var tabs = [], panels = [], i;
    for (i = 0; i < items.length; i++) {
      var item = items[i] || {};
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.label == null ? 'Tab ' + (i + 1) : String(item.label);
      if (item.disabled) btn.disabled = true;
      if (item.active) btn.setAttribute('data-vtb-active', '');
      list.appendChild(btn);
      tabs.push(btn);

      var panel = document.createElement('section');
      var c = item.content;
      if (c && c.nodeType === 1) panel.appendChild(c);
      else if (item.html) panel.innerHTML = c == null ? '' : String(c);
      else panel.textContent = c == null ? '' : String(c);
      panels.push(panel);
    }
    container.appendChild(list);
    for (i = 0; i < panels.length; i++) container.appendChild(panels[i]);
    return { list: list, tabs: tabs, panels: panels };
  }

  var DEFAULTS = {
    tabs: null,          // [{label, content, html?, disabled?, active?}] = builder mode
    active: null,        // initial index; null → the [data-vtb-active] tab, else 0
    vertical: false,     // vertical rail + ArrowUp/ArrowDown
    activation: 'auto',  // 'auto' (focus selects) | 'manual' (Enter/Space selects)
    theme: 'auto',       // 'auto' | 'light' | 'dark'
    styles: true,        // false = headless: no CSS injected, style .vtb-* yourself
    onChange: null       // fn(index, tabs)
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    list: null,
    tabs: [],
    panels: [],
    active: -1,
    select: function () { return dummyInstance; },
    getActive: function () { return -1; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Tabs.
   * ------------------------------------------------------------------ */

  function Tabs(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Tabs: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, DEFAULTS, options || {});
    this.active = -1;
    this._uid = ++uid;
    this._saved = [];   // [{el, name, value}] — attributes to restore on destroy
    this._classes = []; // [[el, className]] — classes to remove on destroy
    this._built = null;

    if (this.opts.styles !== false) injectStyles();

    var builder = this.opts.tabs && this.opts.tabs.length;
    var parts = builder ? buildDom(el, this.opts.tabs) : parseMarkup(el);
    if (!parts.list || !parts.tabs.length) {
      throw new Error('Tabs: no tabs found in container');
    }
    this.list = parts.list;
    this.tabs = parts.tabs;
    this.panels = parts.panels;
    if (builder) this._built = [this.list].concat(this.panels);

    this._wire();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._select(this._initialIndex(), false);
  }

  Tabs.prototype = {
    constructor: Tabs,

    /* ---------------- attribute bookkeeping ---------------- */

    _record: function (el, name) {
      var s = this._saved;
      for (var i = 0; i < s.length; i++) {
        if (s[i].el === el && s[i].name === name) return;
      }
      s.push({ el: el, name: name, value: el.getAttribute(name) });
    },

    _setAttr: function (el, name, value) {
      this._record(el, name);
      el.setAttribute(name, value);
    },

    _addClass: function (el, cls) {
      el.classList.add(cls);
      this._classes.push([el, cls]);
    },

    _ensureId: function (el, suffix) {
      if (!el.id) this._setAttr(el, 'id', 'vtb-' + this._uid + '-' + suffix);
      return el.id;
    },

    /* ---------------- setup ---------------- */

    _wire: function () {
      var s = saltToken(), i;
      this._addClass(this.el, 'vtb');
      if (s) this._addClass(this.el, s);
      if (this.opts.vertical) this._addClass(this.el, 'vtb-vertical');

      this._addClass(this.list, 'vtb-list');
      this._setAttr(this.list, 'role', 'tablist');
      if (this.opts.vertical) this._setAttr(this.list, 'aria-orientation', 'vertical');

      for (i = 0; i < this.tabs.length; i++) {
        var tab = this.tabs[i], panel = this.panels[i];
        this._addClass(tab, 'vtb-tab');
        this._addClass(panel, 'vtb-panel');
        var pid = this._ensureId(panel, 'panel-' + i);
        var tid = this._ensureId(tab, 'tab-' + i);
        this._setAttr(tab, 'role', 'tab');
        this._setAttr(tab, 'aria-selected', 'false');
        this._setAttr(tab, 'aria-controls', pid);
        this._setAttr(tab, 'tabindex', '-1');
        // Enhanced <button>s must not submit a surrounding form.
        if (tab.tagName === 'BUTTON' && !tab.getAttribute('type')) {
          this._setAttr(tab, 'type', 'button');
        }
        this._setAttr(panel, 'role', 'tabpanel');
        this._setAttr(panel, 'aria-labelledby', tid);
        this._setAttr(panel, 'tabindex', '0');
        this._record(panel, 'hidden');
        panel.hidden = true;
      }

      this._ink = document.createElement('span');
      this._ink.className = 'vtb-ink';
      this._ink.setAttribute('aria-hidden', 'true');
      this.list.appendChild(this._ink);
    },

    _bind: function () {
      var self = this;
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this._onResize = function () { self._moveInk(); };
      this.list.addEventListener('click', this._onClick);
      this.list.addEventListener('keydown', this._onKeydown);
      window.addEventListener('resize', this._onResize);
    },

    _initialIndex: function () {
      var i = this.opts.active, n = this.tabs.length, j;
      if (i == null) {
        for (j = 0; j < n; j++) {
          if (this.tabs[j].hasAttribute('data-vtb-active')) { i = j; break; }
        }
      }
      i = Math.floor(+i) || 0;
      if (i < 0 || i >= n) i = 0;
      if (this._isDisabled(this.tabs[i])) i = this._step(i, 1);
      return i;
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.el, 'data-theme', resolved);
    },

    /* ---------------- interaction ---------------- */

    _isDisabled: function (tab) {
      return tab.disabled === true || tab.hasAttribute('disabled') ||
        tab.getAttribute('aria-disabled') === 'true';
    },

    // Next enabled index from `from` in `dir`, wrapping; `from` if none.
    _step: function (from, dir) {
      var n = this.tabs.length;
      for (var k = 1; k <= n; k++) {
        var j = ((from + dir * k) % n + n) % n;
        if (!this._isDisabled(this.tabs[j])) return j;
      }
      return from;
    },

    _tabFromEvent: function (e) {
      var node = e.target;
      while (node && node !== this.list) {
        if (this.tabs.indexOf(node) !== -1) return node;
        node = node.parentNode;
      }
      return null;
    },

    _handleClick: function (e) {
      var tab = this._tabFromEvent(e);
      if (!tab) return;
      if (tab.tagName === 'A') e.preventDefault(); // tabs, not navigation
      if (this._isDisabled(tab)) return;
      this._select(this.tabs.indexOf(tab), true);
    },

    _handleKeydown: function (e) {
      var tab = this._tabFromEvent(e);
      if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
      var i = this.tabs.indexOf(tab);
      var nextKey = this.opts.vertical ? 'ArrowDown' : 'ArrowRight';
      var prevKey = this.opts.vertical ? 'ArrowUp' : 'ArrowLeft';
      var j = -1;
      if (e.key === nextKey) j = this._step(i, 1);
      else if (e.key === prevKey) j = this._step(i, -1);
      else if (e.key === 'Home') j = this._step(this.tabs.length - 1, 1); // first enabled
      else if (e.key === 'End') j = this._step(0, -1);                    // last enabled
      else if (e.key === 'Enter' || e.key === ' ') {
        // 'auto' already selected on focus; buttons also fire click natively.
        if (this.opts.activation === 'manual') {
          e.preventDefault();
          this._select(i, true);
        }
        return;
      } else return;
      e.preventDefault();
      this.tabs[j].focus();
      if (this.opts.activation !== 'manual') this._select(j, true);
    },

    _moveInk: function () {
      var tab = this.tabs[this.active];
      if (!tab || !this._ink) return;
      var s = this._ink.style;
      if (this.opts.vertical) {
        s.height = tab.offsetHeight + 'px';
        s.transform = 'translateY(' + tab.offsetTop + 'px)';
      } else {
        s.width = tab.offsetWidth + 'px';
        s.transform = 'translateX(' + tab.offsetLeft + 'px)';
      }
    },

    /* ---------------- public API ---------------- */

    _select: function (i, fire) {
      i = Math.floor(+i);
      var tab = this.tabs[i];
      if (!tab || this._isDisabled(tab)) return this;
      var prev = this.active;
      this.active = i;
      for (var j = 0; j < this.tabs.length; j++) {
        var sel = j === i;
        this.tabs[j].setAttribute('aria-selected', sel ? 'true' : 'false');
        this.tabs[j].setAttribute('tabindex', sel ? '0' : '-1'); // roving tabindex
        this.panels[j].hidden = !sel;
      }
      this._moveInk();
      if (fire && prev !== i) {
        if (this.opts.onChange) this.opts.onChange(i, this);
        this.el.dispatchEvent(new CustomEvent('tabs:change', {
          bubbles: true,
          detail: { index: i, tabs: this }
        }));
      }
      return this;
    },

    select: function (i) {
      return this._select(i, true);
    },

    getActive: function () {
      return this.active;
    },

    destroy: function () {
      if (!this.el) return this;
      unwatchAutoTheme(this);
      this.list.removeEventListener('click', this._onClick);
      this.list.removeEventListener('keydown', this._onKeydown);
      window.removeEventListener('resize', this._onResize);
      if (this._ink.parentNode) this._ink.parentNode.removeChild(this._ink);
      var i;
      if (this._built) {
        for (i = 0; i < this._built.length; i++) {
          var n = this._built[i];
          if (n.parentNode) n.parentNode.removeChild(n);
        }
      }
      // Put back every attribute we touched, then drop our classes.
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Tabs.version = VERSION;
  Tabs.defaults = DEFAULTS;

  Tabs.create = function (target, options) {
    return new Tabs(target, options);
  };

  Tabs.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.active != null && d.active !== '') o.active = +d.active;
    if (d.vertical != null) o.vertical = parseBool(d.vertical);
    if (d.activation) o.activation = d.activation;
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Tabs.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vtb]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Tabs(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Tabs auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Tabs.autoInit(); });
    } else {
      Tabs.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Tabs.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Tabs, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Tabs.css = renderCss();
  }
  Tabs.displayName = 'Tabs';
  Tabs.rootClass = 'vtb';
  Tabs.themeVars = {
    accent: '--vtb-accent',
    radius: '--vtb-radius',
    font: '--vtb-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Tabs.varScopes = ['.vtb', '.vtb[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('tabs', Tabs);
  }

  return Tabs;
});
