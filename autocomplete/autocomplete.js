/*!
 * Vanilla UI Kit Autocomplete v1.0.0
 * A single-file, zero-dependency free-text typeahead for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Unlike Select, the input stays free text: suggestions assist, they
 * never constrain (search boxes, mention pickers, tag fields).
 *
 * Quick start:
 *   <script src="autocomplete.js"></script>
 *   <input id="q">
 *   <script>new Autocomplete('#q', { source: ['One', 'Two'] })</script>
 *
 * Or zero-JS:
 *   <input data-vac data-vac-source='["One","Two"]'>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Autocomplete = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-autocomplete-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Autocomplete.css`.
   * The host input is deliberately NOT styled — it belongs to the page;
   * only the suggestion panel is ours.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Autocomplete.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the panel; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vac{--vac-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vac{' +
      '--vac-accent:#5b5bd6;' +
      '--vac-bg:#ffffff;' +
      '--vac-surface:#f2f2f5;' +
      '--vac-text:#1c1d21;' +
      '--vac-muted:#72747e;' +
      '--vac-faint:#e7e7ec;' +
      '--vac-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vac-radius:12px;' +
      '--vac-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vac[data-theme=dark]{' +
      '--vac-accent:#7b7bea;' +
      '--vac-bg:#1b1d24;' +
      '--vac-surface:#272a33;' +
      '--vac-text:#e9eaf0;' +
      '--vac-muted:#989aa6;' +
      '--vac-faint:#31343f;' +
      '--vac-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    /* panel */
    '.vac.SALT.vac-panel{position:absolute;z-index:99999;box-sizing:border-box;' +
      'background:var(--vac-bg);color:var(--vac-text);border:1px solid var(--vac-faint);' +
      'border-radius:var(--vac-radius);box-shadow:var(--vac-shadow);padding:6px;' +
      'font-family:var(--vac-font);font-size:14px;line-height:1.35;text-align:left;' +
      'opacity:0;transform:translateY(4px) scale(.98);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vac.SALT.vac-panel.vac-open{opacity:1;transform:none;}' +
    '.vac.SALT *,.vac.SALT *::before,.vac.SALT *::after{box-sizing:border-box;}' +
    /* offsetTop of options must resolve against the list for scroll math */
    '.vac.SALT .vac-list{position:relative;max-height:264px;overflow-y:auto;' +
      'overscroll-behavior:contain;}' +
    '.vac.SALT .vac-group-label{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vac-muted);padding:8px 10px 4px;}' +
    '.vac.SALT .vac-option{display:block;padding:8px 10px;border-radius:8px;' +
      'cursor:pointer;transition:background .1s ease;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;}' +
    '.vac.SALT .vac-option.is-active{background:var(--vac-surface);}' +
    '.vac.SALT .vac-option.is-disabled{opacity:.4;cursor:not-allowed;background:none;}' +
    '.vac.SALT .vac-match{color:var(--vac-accent);font-weight:650;}' +
    /* status rows — hidden by default, toggled via panel state classes */
    '.vac.SALT .vac-empty,.vac.SALT .vac-loading{display:none;padding:10px 12px;' +
      'color:var(--vac-muted);font-size:13px;}' +
    '.vac.SALT.is-empty .vac-empty{display:block;}' +
    '.vac.SALT.is-loading .vac-loading{display:flex;align-items:center;gap:8px;}' +
    '.vac.SALT.is-loading .vac-empty{display:none;}' +
    '.vac.SALT .vac-loading svg{display:block;flex:none;}' +
    '.vac.SALT .vac-spin{animation:vac-spin .8s linear infinite;}' +
    '@keyframes vac-spin{to{transform:rotate(360deg);}}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vac.SALT,.vac.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/autocomplete.css), or set
  // Autocomplete.salt to your own token / false BEFORE the first instance.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Autocomplete.salt;
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
    // Insert before the page's own CSS so `.vac { --vac-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    spinner: '<svg class="vac-spin" width="14" height="14" viewBox="0 0 16 16" fill="none"' +
      ' aria-hidden="true"><path d="M14.25 8A6.25 6.25 0 1 1 8 1.75" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  /* ------------------------------------------------------------------ *
   * Theme — prefer the shared VC engine when core is loaded; otherwise a
   * private watcher with the same resolution order as the rest of the
   * family: data-theme/data-bs-theme → .dark/.light class → OS scheme.
   * ------------------------------------------------------------------ */

  var autoThemed = [];
  var themeMql = null;
  var themeObserver = null;

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
    if (!themeMql && window.matchMedia) {
      themeMql = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return themeMql && themeMql.matches ? 'dark' : 'light';
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
      themeMql = themeMql || window.matchMedia('(prefers-color-scheme: dark)');
      if (themeMql.addEventListener) themeMql.addEventListener('change', refreshAutoThemes);
      else if (themeMql.addListener) themeMql.addListener(refreshAutoThemes);
    }
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(refreshAutoThemes);
      themeObserver.observe(document.documentElement, {
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
    if (core) {
      core.theme.unwatch(refreshAutoThemes);
      return;
    }
    if (themeMql) {
      if (themeMql.removeEventListener) themeMql.removeEventListener('change', refreshAutoThemes);
      else if (themeMql.removeListener) themeMql.removeListener(refreshAutoThemes);
    }
    if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
  }

  /* ------------------------------------------------------------------ *
   * Small helpers.
   * ------------------------------------------------------------------ */

  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  // Case- and diacritic-insensitive fold. Folds CHARACTER BY CHARACTER so
  // the folded string keeps a 1:1 index mapping onto the original — that is
  // what lets the highlighter wrap the matched substring of the real label.
  function fold(s) {
    s = String(s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i).toLowerCase();
      if (c.normalize) c = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += c.length === 1 ? c : (c.charAt(0) || s.charAt(i));
    }
    return out;
  }

  // Accepts [{value, label, group, disabled, html}] or ['a', 'b'] shorthand.
  function normalizeItems(list) {
    var out = [];
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o == null) continue;
      if (typeof o === 'object') {
        out.push({
          value: String(o.value != null ? o.value : (o.label != null ? o.label : '')),
          label: String(o.label != null ? o.label : (o.value != null ? o.value : '')),
          group: o.group != null ? String(o.group) : null,
          disabled: !!o.disabled,
          html: !!o.html
        });
      } else {
        out.push({ value: String(o), label: String(o), group: null, disabled: false, html: false });
      }
    }
    return out;
  }

  function assignOptions(out, defaults, options) {
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in options) if (options[k] !== undefined) out[k] = options[k];
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  var DEFAULTS = {
    source: null,           // array | fn(query, done) | fn(query) → Promise
    minChars: 1,            // fewer typed chars than this = closed panel
    debounce: 150,          // ms between last keystroke and the lookup
    maxResults: 10,         // cap applied after the source answers
    highlight: true,        // wrap the matched substring in a DOM span
    openOnFocus: false,     // lookup on focus, ignoring minChars (recents)
    allowNew: true,         // free text stays valid; false reverts on blur
    emptyText: null,        // defaults to labels.noResults
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vac-* yourself
    position: 'auto',       // 'auto' | 'below' | 'above'
    labels: {
      noResults: 'No results',
      loading: 'Loading…',
      suggestions: 'Suggestions'
    },
    onSelect: null,         // fn(item, autocomplete)
    onInput: null,          // fn(query, autocomplete)
    onError: null,          // fn(error, autocomplete) — source failures
    onOpen: null,
    onClose: null
  };

  /* ------------------------------------------------------------------ *
   * Autocomplete.
   * ------------------------------------------------------------------ */

  function Autocomplete(target, options) {
    // SSR: an inert instance — every public method below no-ops without a DOM.
    if (!HAS_DOM) return;
    var el = resolveElement(target);
    if (!el) throw new Error('Autocomplete: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.input = el;
    this.opts = assignOptions({}, DEFAULTS, options);

    this.isOpen = false;
    this.items = [];           // last DELIVERED results (normalized)
    this._uid = 'vac-' + (++uid);
    this._activeIdx = -1;
    this._seq = 0;             // async race guard: only the latest seq lands
    this._pending = false;
    this._query = '';
    this._committed = el.value || ''; // last selected/accepted value (allowNew:false)
    this._debounceTimer = null;
    this._closeTimer = null;
    this._prevAttrs = {};

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  Autocomplete.prototype = {
    constructor: Autocomplete,

    /* ---------------- DOM construction ---------------- */

    _setInputAttr: function (name, value) {
      if (!(name in this._prevAttrs)) this._prevAttrs[name] = this.input.getAttribute(name);
      this.input.setAttribute(name, value);
    },

    _build: function () {
      var L = this.opts.labels;
      var listId = this._uid + '-list';

      // The input is the combobox; we decorate it and leave its styling alone.
      this._setInputAttr('role', 'combobox');
      this._setInputAttr('aria-autocomplete', 'list');
      this._setInputAttr('aria-expanded', 'false');
      this._setInputAttr('aria-controls', listId);
      this._setInputAttr('autocomplete', 'off');
      this.input.setAttribute('data-vac-bound', '');

      var panel = document.createElement('div');
      panel.className = 'vac vac-panel' + saltClass();
      this.panel = panel;

      var list = document.createElement('div');
      list.className = 'vac-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.suggestions);
      panel.appendChild(list);
      this._list = list;

      var loading = document.createElement('div');
      loading.className = 'vac-loading';
      loading.innerHTML = ICONS.spinner;
      var loadText = document.createElement('span');
      loadText.textContent = L.loading;
      loading.appendChild(loadText);
      panel.appendChild(loading);

      var empty = document.createElement('div');
      empty.className = 'vac-empty';
      empty.textContent = this.opts.emptyText != null
        ? String(this.opts.emptyText) : L.noResults;
      panel.appendChild(empty);

      panel.style.display = 'none';
      document.body.appendChild(panel);
    },

    _bind: function () {
      var self = this;

      this._onInput = function () {
        var v = self.input.value;
        if (self.opts.onInput) self.opts.onInput(v, self);
        self._lookup(v, false, false); // typing reopens (debounced)
      };
      this._onFocus = function () {
        if (self.opts.openOnFocus && !self.isOpen) {
          self._lookup(self.input.value, true, true);
        }
      };
      // Options aren't focusable and panel mousedowns are prevented, so any
      // real blur means focus genuinely left the widget.
      this._onBlur = function () {
        if (!self.opts.allowNew) self._enforceMatch();
        self.close();
      };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this.input.addEventListener('input', this._onInput);
      this.input.addEventListener('focus', this._onFocus);
      this.input.addEventListener('blur', this._onBlur);
      this.input.addEventListener('keydown', this._onKeydown);

      // Choosing a suggestion must not steal focus from the input.
      this._onPanelMousedown = function (e) { e.preventDefault(); };
      this._onPanelClick = function (e) {
        var opt = e.target.closest ? e.target.closest('.vac-option') : null;
        if (!opt || opt.classList.contains('is-disabled')) return;
        self._choose(+opt.getAttribute('data-i'));
      };
      this._onPanelOver = function (e) {
        var opt = e.target.closest ? e.target.closest('.vac-option') : null;
        if (opt && !opt.classList.contains('is-disabled')) {
          self._setActive(+opt.getAttribute('data-i'), false);
        }
      };
      this.panel.addEventListener('mousedown', this._onPanelMousedown);
      this.panel.addEventListener('click', this._onPanelClick);
      this.panel.addEventListener('mouseover', this._onPanelOver);

      // Backup for pointer interactions that never move focus (blur owns
      // the common path since the input is the only focusable piece).
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(self.input) !== -1) return;
        self.close();
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.panel.setAttribute('data-theme', resolved);
    },

    /* ---------------- lookups (async-safe) ---------------- */

    // force=true ignores minChars (focus/open with an empty query → recents).
    _lookup: function (query, immediate, force) {
      var self = this;
      clearTimeout(this._debounceTimer);
      var q = String(query == null ? '' : query).replace(/^\s+|\s+$/g, '');
      this._query = q;
      var min = +this.opts.minChars || 0;
      if (!force && q.length < min) {
        this._seq++; // a shorter query also supersedes any in-flight lookup
        this._pending = false;
        this.close();
        return;
      }
      if (immediate) this._run(q);
      else {
        this._debounceTimer = setTimeout(function () {
          self._run(q);
        }, +this.opts.debounce || 0);
      }
    },

    _run: function (query) {
      var self = this;
      var seq = ++this._seq; // this lookup supersedes everything before it
      var src = this.opts.source;

      if (typeof src === 'function') {
        var settled = false; // a source may call done() AND return a promise
        var ok = function (results) {
          if (settled) return;
          settled = true;
          self._deliver(seq, query, results);
        };
        var fail = function (err) {
          if (settled) return;
          settled = true;
          self._fail(seq, err);
        };
        this._pending = true;
        this._showLoading();
        var ret;
        try {
          ret = src(query, ok);
        } catch (err) {
          fail(err);
          return;
        }
        if (ret && typeof ret.then === 'function') ret.then(ok, fail);
        return;
      }

      // Array source: filter locally. An empty query matches everything —
      // that is what openOnFocus uses for "recent searches" lists.
      var items = normalizeItems(src);
      var fq = fold(query);
      var out = [];
      for (var i = 0; i < items.length; i++) {
        if (!fq || fold(items[i].label).indexOf(fq) !== -1) out.push(items[i]);
      }
      this._deliver(seq, query, out);
    },

    // Results land here from every source shape. Anything from a superseded
    // query (seq mismatch) is DISCARDED — late responses can never clobber
    // the list the user is currently looking at.
    _deliver: function (seq, query, results) {
      if (!this.input || seq !== this._seq) return; // stale or destroyed
      this._pending = false;
      var items = normalizeItems(results);
      var max = +this.opts.maxResults;
      if (max > 0 && items.length > max) items = items.slice(0, max);
      this.items = items;
      this._activeIdx = -1; // browsing starts fresh; Enter stays free-text
      this._setActiveDescendant('');
      this._renderList(query);
      this.panel.classList.remove('is-loading');

      var min = +this.opts.minChars || 0;
      if (items.length) {
        this.panel.classList.remove('is-empty');
        this._openPanel();
      } else if (query.length >= min) {
        // Empty state only once the query is long enough to have searched;
        // a forced lookup with a shorter query just closes quietly.
        this.panel.classList.add('is-empty');
        this._openPanel();
      } else {
        this.close();
      }
      if (this.isOpen) this._position();
    },

    // Source errors close the panel silently; opts.onError gets the details.
    _fail: function (seq, err) {
      if (!this.input || seq !== this._seq) return;
      this._pending = false;
      this.close();
      if (this.opts.onError) this.opts.onError(err, this);
    },

    // Subtle loading row while a lookup is in flight — previous results stay
    // visible underneath so the list doesn't flicker between keystrokes.
    _showLoading: function () {
      this.panel.classList.add('is-loading');
      this.panel.classList.remove('is-empty');
      this._openPanel();
      this._position();
    },

    /* ---------------- rendering ---------------- */

    _renderList: function (query) {
      var list = this._list;
      list.innerHTML = '';
      var groups = {};
      for (var i = 0; i < this.items.length; i++) {
        var o = this.items[i];
        var parent = list;
        if (o.group) {
          if (!groups[o.group]) {
            var g = document.createElement('div');
            g.setAttribute('role', 'group');
            g.setAttribute('aria-label', o.group);
            var gl = document.createElement('div');
            gl.className = 'vac-group-label';
            gl.setAttribute('aria-hidden', 'true');
            gl.textContent = o.group;
            g.appendChild(gl);
            list.appendChild(g);
            groups[o.group] = g;
          }
          parent = groups[o.group];
        }
        var opt = document.createElement('div');
        opt.className = 'vac-option' + (o.disabled ? ' is-disabled' : '');
        opt.id = this._uid + '-opt-' + i;
        opt.setAttribute('role', 'option');
        opt.setAttribute('data-i', String(i));
        opt.setAttribute('aria-selected', 'false');
        if (o.disabled) opt.setAttribute('aria-disabled', 'true');
        this._renderLabel(opt, o, query);
        parent.appendChild(opt);
      }
    },

    // Labels are TEXT by default; `html: true` is an explicit per-item
    // opt-in (and skips highlighting — the markup is taken as-is). The
    // highlight itself is built from DOM spans, never innerHTML.
    _renderLabel: function (el, item, query) {
      if (item.html) {
        el.innerHTML = item.label;
        return;
      }
      var label = item.label;
      var q = query ? fold(query) : '';
      var idx = (this.opts.highlight && q) ? fold(label).indexOf(q) : -1;
      if (idx === -1) {
        el.textContent = label;
        return;
      }
      if (idx > 0) el.appendChild(document.createTextNode(label.slice(0, idx)));
      var mark = document.createElement('span');
      mark.className = 'vac-match';
      mark.textContent = label.slice(idx, idx + q.length);
      el.appendChild(mark);
      if (idx + q.length < label.length) {
        el.appendChild(document.createTextNode(label.slice(idx + q.length)));
      }
    },

    /* ---------------- active option ---------------- */

    _enabled: function () {
      var out = [];
      for (var i = 0; i < this.items.length; i++) {
        if (!this.items[i].disabled) out.push(i);
      }
      return out;
    },

    _setActive: function (idx, scroll) {
      this._activeIdx = idx;
      var prev = this._list.querySelector('.vac-option.is-active');
      if (prev) {
        prev.classList.remove('is-active');
        prev.setAttribute('aria-selected', 'false');
      }
      var el = this._list.querySelector('[data-i="' + idx + '"]');
      if (!el) {
        this._setActiveDescendant('');
        return;
      }
      el.classList.add('is-active');
      el.setAttribute('aria-selected', 'true');
      this._setActiveDescendant(el.id);
      if (scroll) {
        var lt = this._list.scrollTop, lh = this._list.clientHeight;
        if (el.offsetTop < lt) this._list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > lt + lh) {
          this._list.scrollTop = el.offsetTop + el.offsetHeight - lh;
        }
      }
    },

    _setActiveDescendant: function (id) {
      if (id) this.input.setAttribute('aria-activedescendant', id);
      else this.input.removeAttribute('aria-activedescendant');
    },

    // Browsing moves aria-activedescendant only — the typed text is never
    // overwritten until the user actually commits with Enter or a click.
    _moveActive: function (dir) {
      var vis = this._enabled();
      if (!vis.length) return;
      var cur = vis.indexOf(this._activeIdx);
      var next = cur === -1
        ? (dir > 0 ? 0 : vis.length - 1)
        : (cur + dir + vis.length) % vis.length; // skips disabled, wraps
      this._setActive(vis[next], true);
    },

    /* ---------------- selection ---------------- */

    _choose: function (idx) {
      var item = this.items[idx];
      if (!item || item.disabled) return;
      this.input.value = item.value;
      this._committed = item.value;
      this._query = item.value;
      this.close();
      if (this.opts.onSelect) this.opts.onSelect(item, this);
      this._emit('select', { item: item, autocomplete: this });
    },

    // allowNew: false — on leave, text that isn't a suggestion (by value or
    // label, case/diacritic-insensitive) reverts to the last accepted value.
    _enforceMatch: function () {
      var v = this.input.value.replace(/^\s+|\s+$/g, '');
      if (v === '') { this._committed = ''; return; } // clearing is always allowed
      var fv = fold(v);
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        if (it.disabled) continue;
        if (fold(it.value) === fv || fold(it.label) === fv) {
          this.input.value = it.value;
          this._committed = it.value;
          return;
        }
      }
      if (fold(this._committed) !== fv) this.input.value = this._committed;
    },

    _emit: function (name, detail) {
      this.input.dispatchEvent(new CustomEvent('autocomplete:' + name, {
        bubbles: true,
        detail: detail || { autocomplete: this }
      }));
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e) {
      var key = e.key;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        if (!this.isOpen) {
          this.open(); // reopen with suggestions for the current text
          return;
        }
        this._moveActive(key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (!this.isOpen) return;
      switch (key) {
        case 'Enter':
          if (this._activeIdx !== -1) {
            e.preventDefault(); // commit the browsed suggestion, not the form
            this._choose(this._activeIdx);
          } else {
            this.close(); // free text stands; let the form see the Enter
          }
          return;
        case 'Escape':
          // Single Esc: close only — the typed text is deliberately kept.
          e.preventDefault();
          e.stopPropagation();
          this.close();
          return;
        case 'Tab':
          this.close(); // let Tab move on naturally
          return;
      }
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this.input;
      panel.style.minWidth = anchor.offsetWidth + 'px';
      var prefer = this.opts.position === 'below' ? 'below'
        : this.opts.position === 'above' ? 'above' : null;
      if (window.VC && typeof window.VC.position === 'function') {
        var res = window.VC.position(panel, anchor, { gap: 6, pad: 8, prefer: prefer });
        if (res) panel.style.transformOrigin = res.below ? '50% 0' : '50% 100%';
        return;
      }
      // Private fallback: flip above when there is no room below, clamp to
      // the viewport horizontally (same approach as the rest of the family).
      var r = anchor.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = 6, pad = 8;

      var below = prefer === 'below' ||
        (prefer !== 'above' && (vh - r.bottom >= ph + gap || r.top < ph + gap));
      var top = below ? r.bottom + gap : r.top - ph - gap;
      var left = Math.min(Math.max(pad, r.left), Math.max(pad, vw - pw - pad));

      // Inside a native <dialog> the panel rides in the top layer with the
      // dialog, positioned fixed in viewport coordinates; otherwise absolute.
      var fixed = this._inTopLayer;
      panel.style.position = fixed ? 'fixed' : 'absolute';
      panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
      panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
      panel.style.transformOrigin = below ? '50% 0' : '50% 100%';
    },

    _openPanel: function () {
      if (this.isOpen) return;
      clearTimeout(this._closeTimer);

      // If the input lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this.input.closest ? this.input.closest('dialog') : null;
      this._inTopLayer = !!host;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vac-open'); });
      this.isOpen = true;
      this.input.setAttribute('aria-expanded', 'true');

      document.addEventListener('pointerdown', this._onDocPointer, true);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);

      if (this.opts.onOpen) this.opts.onOpen(this);
      this._emit('open');
    },

    /* ---------------- public API ---------------- */

    // Look up suggestions for the current text right now (no debounce) and
    // show them — minChars is ignored, like openOnFocus.
    open: function () {
      if (!this.input) return this;
      this._lookup(this.input.value, true, true);
      return this;
    },

    close: function () {
      if (!this.input) return this;
      // Always cancel whatever is in flight — even when the panel never got
      // to open (blur during the debounce window must not reopen it later).
      clearTimeout(this._debounceTimer);
      this._seq++;
      this._pending = false;
      if (!this.isOpen) return this;

      this.isOpen = false;
      this.input.setAttribute('aria-expanded', 'false');
      this._activeIdx = -1;
      this._setActiveDescendant('');
      this.panel.classList.remove('is-loading');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      this.panel.classList.remove('vac-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);

      if (this.opts.onClose) this.opts.onClose(this);
      this._emit('close');
      return this;
    },

    // Swap the source (array or function); an open panel refreshes in place.
    setSource: function (src) {
      if (!this.input) return this;
      this.opts.source = src;
      if (this.isOpen) this._lookup(this.input.value, true, true);
      return this;
    },

    getInput: function () {
      return this.input || null;
    },

    // Tear down and give the input back exactly as we found it.
    destroy: function () {
      if (!this.input) return this;
      this.close();
      clearTimeout(this._debounceTimer);
      clearTimeout(this._closeTimer);
      this._seq++; // orphan any in-flight lookup for good
      unwatchAutoTheme(this);
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      this.input.removeEventListener('input', this._onInput);
      this.input.removeEventListener('focus', this._onFocus);
      this.input.removeEventListener('blur', this._onBlur);
      this.input.removeEventListener('keydown', this._onKeydown);
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      for (var name in this._prevAttrs) {
        if (this._prevAttrs[name] == null) this.input.removeAttribute(name);
        else this.input.setAttribute(name, this._prevAttrs[name]);
      }
      this.input.removeAttribute('aria-activedescendant');
      this.input.removeAttribute('data-vac-bound');
      if (instances) instances.delete(this.input);
      this.input = null;
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Autocomplete.version = VERSION;
  Autocomplete.defaults = DEFAULTS;

  Autocomplete.create = function (target, options) {
    return new Autocomplete(target, options);
  };

  Autocomplete.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vacMinChars != null && d.vacMinChars !== '') o.minChars = +d.vacMinChars;
    if (d.vacDebounce != null && d.vacDebounce !== '') o.debounce = +d.vacDebounce;
    if (d.vacMaxResults != null && d.vacMaxResults !== '') o.maxResults = +d.vacMaxResults;
    if (d.vacHighlight != null) o.highlight = parseBool(d.vacHighlight);
    if (d.vacOpenOnFocus != null) o.openOnFocus = parseBool(d.vacOpenOnFocus);
    if (d.vacAllowNew != null) o.allowNew = parseBool(d.vacAllowNew);
    if (d.vacStyles != null) o.styles = parseBool(d.vacStyles);
    if (d.vacEmptyText) o.emptyText = d.vacEmptyText;
    if (d.vacTheme) o.theme = d.vacTheme;
    if (d.vacPosition) o.position = d.vacPosition;
    if (d.vacSource) {
      // JSON array, or a plain comma list as shorthand.
      try { o.source = JSON.parse(d.vacSource); }
      catch (err) { o.source = d.vacSource.split(','); }
    }
    return o;
  }

  Autocomplete.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vac]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Autocomplete(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Autocomplete auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Autocomplete.autoInit(); });
    } else {
      Autocomplete.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Autocomplete.displayName = 'Autocomplete';
  Autocomplete.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Autocomplete, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Autocomplete.css = renderCss();
  }
  Autocomplete.rootClass = 'vac';
  Autocomplete.themeVars = {
    accent: '--vac-accent',
    radius: '--vac-radius',
    font: '--vac-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Autocomplete.varScopes = ['.vac', '.vac[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('autocomplete', Autocomplete);
  }

  return Autocomplete;
});
