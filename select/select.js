/*!
 * Vanilla UI Kit Select v1.0.0
 * A single-file, zero-dependency styleable <select> replacement for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="select.js"></script>
 *   <select id="fruit">…</select>
 *   <script>new Select('#fruit', { searchable: true })</script>
 *
 * Or zero-JS:
 *   <select data-vsel data-vsel-searchable>…</select>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Select = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-select-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Select.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Select.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vsel{--vsel-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vsel{' +
      '--vsel-accent:#5b5bd6;' +
      '--vsel-on-accent:#ffffff;' +
      '--vsel-bg:#ffffff;' +
      '--vsel-surface:#f2f2f5;' +
      '--vsel-text:#1c1d21;' +
      '--vsel-muted:#72747e;' +
      '--vsel-faint:#e7e7ec;' +
      '--vsel-accent-soft:rgba(91,91,214,.13);' +
      '--vsel-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vsel-radius:12px;' +
      '--vsel-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vsel[data-theme=dark]{' +
      '--vsel-accent:#7b7bea;' +
      '--vsel-on-accent:#131418;' +
      '--vsel-bg:#1b1d24;' +
      '--vsel-surface:#272a33;' +
      '--vsel-text:#e9eaf0;' +
      '--vsel-muted:#989aa6;' +
      '--vsel-faint:#31343f;' +
      '--vsel-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);' +
    '}' +
    '@supports (color:color-mix(in srgb,red 10%,white)){.vsel{' +
      '--vsel-accent-soft:color-mix(in srgb,var(--vsel-accent) 14%,transparent);}}' +
    '.vsel.SALT{position:relative;display:inline-block;box-sizing:border-box;min-width:220px;' +
      'color:var(--vsel-text);font-family:var(--vsel-font);font-size:14px;line-height:1.35;' +
      'text-align:left;}' +
    '.vsel.SALT *,.vsel.SALT *::before,.vsel.SALT *::after{box-sizing:border-box;}' +
    /* control */
    '.vsel.SALT .vsel-control{display:flex;align-items:center;gap:6px;min-height:38px;' +
      'padding:5px 8px 5px 12px;background:var(--vsel-bg);border:1px solid var(--vsel-faint);' +
      'border-radius:10px;cursor:pointer;-webkit-user-select:none;user-select:none;' +
      'transition:border-color .12s ease,box-shadow .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-control:focus{outline:none;}' +
    '.vsel.SALT .vsel-control:focus-visible{border-color:var(--vsel-accent);' +
      'box-shadow:0 0 0 3px var(--vsel-accent-soft);}' +
    '.vsel.SALT.is-open .vsel-control{border-color:var(--vsel-accent);' +
      'box-shadow:0 0 0 3px var(--vsel-accent-soft);}' +
    '.vsel.SALT.is-disabled .vsel-control{opacity:.55;cursor:not-allowed;' +
      'background:var(--vsel-surface);}' +
    '.vsel.SALT .vsel-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
      'white-space:nowrap;}' +
    '.vsel.SALT .vsel-value.is-placeholder{color:var(--vsel-muted);}' +
    /* tags (multiple) */
    '.vsel.SALT .vsel-tags{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0;}' +
    '.vsel.SALT .vsel-tag{display:inline-flex;align-items:center;gap:2px;max-width:100%;' +
      'background:var(--vsel-accent-soft);border-radius:7px;padding:2px 3px 2px 8px;' +
      'font-size:13px;line-height:1.4;}' +
    '.vsel.SALT .vsel-tag-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.vsel.SALT .vsel-tag-x{flex:none;width:18px;height:18px;display:grid;place-items:center;' +
      'color:var(--vsel-muted);background:none;border:0;border-radius:5px;padding:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-tag-x:hover{background:var(--vsel-accent);color:var(--vsel-on-accent);}' +
    /* clear + arrow */
    '.vsel.SALT .vsel-clear{flex:none;width:22px;height:22px;display:grid;place-items:center;' +
      'color:var(--vsel-muted);background:none;border:0;border-radius:6px;padding:0;' +
      'cursor:pointer;transition:background .12s ease,color .12s ease;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vsel.SALT .vsel-clear:hover{background:var(--vsel-surface);color:var(--vsel-text);}' +
    '.vsel.SALT .vsel-clear:focus,.vsel.SALT .vsel-tag-x:focus{outline:none;}' +
    '.vsel.SALT .vsel-clear:focus-visible,.vsel.SALT .vsel-tag-x:focus-visible{' +
      'outline:2px solid var(--vsel-accent);outline-offset:1px;}' +
    '.vsel.SALT .vsel-arrow{flex:none;display:grid;place-items:center;' +
      'color:var(--vsel-muted);transition:transform .15s ease;}' +
    '.vsel.SALT.is-open .vsel-arrow{transform:rotate(180deg);}' +
    '.vsel.SALT .vsel-arrow svg,.vsel.SALT .vsel-clear svg,.vsel.SALT .vsel-tag-x svg,' +
      '.vsel.SALT .vsel-check svg{display:block;}' +
    /* panel */
    '.vsel.SALT.vsel-panel{position:absolute;z-index:99999;display:block;min-width:0;' +
      'background:var(--vsel-bg);border:1px solid var(--vsel-faint);' +
      'border-radius:var(--vsel-radius);box-shadow:var(--vsel-shadow);padding:6px;' +
      'opacity:0;transform:translateY(4px) scale(.98);' +
      'transition:opacity .13s ease,transform .16s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vsel.SALT.vsel-panel.vsel-open{opacity:1;transform:none;}' +
    '.vsel.SALT .vsel-search{padding:2px 2px 8px;}' +
    '.vsel.SALT .vsel-search input{width:100%;font:inherit;color:var(--vsel-text);' +
      'background:var(--vsel-surface);border:1px solid var(--vsel-faint);border-radius:8px;' +
      'padding:7px 10px;margin:0;}' +
    '.vsel.SALT .vsel-search input:focus{outline:none;border-color:var(--vsel-accent);}' +
    '.vsel.SALT .vsel-search input::placeholder{color:var(--vsel-muted);}' +
    /* offsetTop of options must resolve against the list for scroll math */
    '.vsel.SALT .vsel-list{position:relative;max-height:264px;overflow-y:auto;' +
      'overscroll-behavior:contain;}' +
    '.vsel.SALT .vsel-group-label{font-size:10.5px;font-weight:650;letter-spacing:.08em;' +
      'text-transform:uppercase;color:var(--vsel-muted);padding:8px 10px 4px;}' +
    '.vsel.SALT .vsel-option{display:flex;align-items:center;gap:8px;padding:8px 10px;' +
      'border-radius:8px;cursor:pointer;transition:background .1s ease;}' +
    '.vsel.SALT .vsel-option.is-active{background:var(--vsel-surface);}' +
    '.vsel.SALT .vsel-option.is-selected{color:var(--vsel-accent);font-weight:600;}' +
    '.vsel.SALT .vsel-option.is-disabled{opacity:.4;cursor:not-allowed;background:none;}' +
    '.vsel.SALT .vsel-check{flex:none;width:16px;height:16px;display:grid;place-items:center;' +
      'color:var(--vsel-accent);visibility:hidden;}' +
    '.vsel.SALT .vsel-option.is-selected .vsel-check{visibility:visible;}' +
    '.vsel.SALT .vsel-option-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
      'white-space:nowrap;}' +
    '.vsel.SALT .vsel-empty{display:none;padding:10px 12px;color:var(--vsel-muted);' +
      'font-size:13px;}' +
    '.vsel.SALT.is-empty .vsel-empty{display:block;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vsel.SALT,.vsel.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/select.css), or set Select.salt to
  // your own token / false BEFORE the first select is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Select.salt;
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
    // Insert before the page's own CSS so `.vsel { --vsel-* }` overrides win.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  var ICONS = {
    chevron: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3 8.4 6.4 12 13 4.6" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.5"' +
      ' stroke-linecap="round"/></svg>'
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

  // Case- and diacritic-insensitive fold for searching and typeahead.
  function fold(s) {
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s;
  }

  // Accepts [{value, label, disabled, group, html}] or ['a', 'b'] shorthand.
  function normalizeOptions(list) {
    var out = [];
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o == null) continue;
      if (typeof o === 'object') {
        out.push({
          value: String(o.value != null ? o.value : (o.label != null ? o.label : '')),
          label: String(o.label != null ? o.label : (o.value != null ? o.value : '')),
          disabled: !!o.disabled,
          group: o.group != null ? String(o.group) : null,
          html: !!o.html
        });
      } else {
        out.push({ value: String(o), label: String(o), disabled: false, group: null, html: false });
      }
    }
    return out;
  }

  function toValueArray(v) {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) if (v[i] != null) out.push(String(v[i]));
      return out;
    }
    return [String(v)];
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
    options: null,          // [{value, label, disabled, group, html}] or ['a','b'] (container mode)
    value: null,            // initial value; string or array (multiple)
    multiple: false,        // defaults to the native select's `multiple` in select mode
    searchable: false,      // filter input at the top of the panel
    clearable: false,       // ✕ button that resets the selection
    placeholder: 'Select…',
    name: null,             // form field name (container mode)
    maxItems: null,         // cap for multiple selection
    noResultsText: 'No results',
    disabled: false,
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    styles: true,           // false = headless: no CSS injected, style .vsel-* yourself
    position: 'auto',       // 'auto' | 'below' | 'above'
    labels: {
      remove: 'Remove',
      clear: 'Clear selection',
      search: 'Search',
      options: 'Options'
    },
    onChange: null,         // fn(value, select)
    onOpen: null,
    onClose: null
  };

  /* ------------------------------------------------------------------ *
   * Select.
   * ------------------------------------------------------------------ */

  function Select(target, options) {
    // SSR: an inert instance — every public method below no-ops without a DOM.
    if (!HAS_DOM) return;
    var el = resolveElement(target);
    if (!el) throw new Error('Select: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this.native = el.tagName === 'SELECT' ? el : null;
    this.opts = assignOptions({}, DEFAULTS, options);
    if (this.native) {
      if (options.multiple === undefined) this.opts.multiple = this.native.multiple;
      if (options.disabled === undefined) this.opts.disabled = this.native.disabled;
    }

    this.isOpen = false;
    this.options = [];         // [{value, label, disabled, group, html}]
    this.selectedValues = [];
    this._uid = 'vsel-' + (++uid);
    this._activeIdx = -1;
    this._visible = [];        // indexes into this.options after filtering
    this._normQuery = '';
    this._typeBuf = '';
    this._typeAt = 0;
    this._closeTimer = null;

    if (this.opts.styles !== false) injectStyles();
    this._readOptions();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._renderControl();
    this._syncForm(true);
  }

  Select.prototype = {
    constructor: Select,

    /* ---------------- option + value plumbing ---------------- */

    _readOptions: function () {
      if (this.native) this._readNative();
      else {
        this.options = normalizeOptions(this.opts.options);
        this.selectedValues = this._prune(toValueArray(this.opts.value));
      }
    },

    _readNative: function () {
      var out = [], selected = [];
      var kids = this.native.children;
      for (var i = 0; i < kids.length; i++) this._readNativeNode(kids[i], null, out, selected);
      // A leading empty-value option is the conventional native placeholder —
      // adopt its label and keep it out of the list (clear() re-selects it).
      this._placeholderOpt = null;
      if (out.length && out[0].value === '' && !this.opts.multiple) {
        this._placeholderOpt = out.shift();
        if (this.opts.placeholder === DEFAULTS.placeholder && this._placeholderOpt.label) {
          this.opts.placeholder = this._placeholderOpt.label;
        }
        if (selected.length && selected[0] === '' ) selected.shift();
      }
      this.options = out;
      this.selectedValues = this._prune(selected);
    },

    _readNativeNode: function (node, group, out, selected) {
      if (node.tagName === 'OPTGROUP') {
        var g = node.label || '';
        for (var i = 0; i < node.children.length; i++) {
          this._readNativeNode(node.children[i], g, out, selected);
        }
      } else if (node.tagName === 'OPTION') {
        out.push({
          value: node.value,
          label: node.text,
          disabled: node.disabled || (node.parentNode.tagName === 'OPTGROUP' &&
            node.parentNode.disabled),
          group: group,
          html: false
        });
        if (node.selected) selected.push(node.value);
      }
    },

    // Keep only values that exist as options, deduped, capped by maxItems.
    _prune: function (vals) {
      var out = [], i, j;
      for (i = 0; i < vals.length; i++) {
        for (j = 0; j < this.options.length; j++) {
          if (this.options[j].value === vals[i]) {
            if (out.indexOf(vals[i]) === -1) out.push(vals[i]);
            break;
          }
        }
      }
      if (!this.opts.multiple && out.length > 1) out = [out[0]];
      var max = +this.opts.maxItems;
      if (this.opts.multiple && max > 0 && out.length > max) out = out.slice(0, max);
      return out;
    },

    _optionByValue: function (v) {
      for (var i = 0; i < this.options.length; i++) {
        if (this.options[i].value === v) return this.options[i];
      }
      return null;
    },

    _syncForm: function (silent) {
      if (this.native) {
        // Mirror the selection onto the hidden native select so form
        // submission and external `change` listeners keep working.
        var opts = this.native.options;
        var any = false;
        for (var i = 0; i < opts.length; i++) {
          var on = this.selectedValues.indexOf(opts[i].value) !== -1 &&
            !(this._placeholderOpt && opts[i].value === '');
          opts[i].selected = on;
          if (on) any = true;
        }
        if (!any) {
          // Represent "nothing chosen": placeholder option if there is one.
          this.native.selectedIndex = this._placeholderOpt ? 0 : -1;
        }
        if (!silent) this.native.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (this._hiddenSelect) {
        this._hiddenSelect.innerHTML = '';
        for (var j = 0; j < this.selectedValues.length; j++) {
          var o = document.createElement('option');
          o.value = this.selectedValues[j];
          o.selected = true;
          this._hiddenSelect.appendChild(o);
        }
      } else if (this._hiddenInput) {
        this._hiddenInput.value = this.selectedValues.length ? this.selectedValues[0] : '';
      }
    },

    _afterChange: function (silent) {
      this._syncForm(silent);
      if (silent) return;
      var v = this.getValue();
      if (this.opts.onChange) this.opts.onChange(v, this);
      this._emit('change', { value: v, select: this });
    },

    _emit: function (name, detail) {
      this.el.dispatchEvent(new CustomEvent('select:' + name, {
        bubbles: true,
        detail: detail || { select: this }
      }));
    },

    /* ---------------- DOM construction ---------------- */

    _build: function () {
      var L = this.opts.labels;
      var listId = this._uid + '-list';

      var wrap = document.createElement('div');
      wrap.className = 'vsel' + saltClass();
      this.wrapper = wrap;

      var control = document.createElement('div');
      control.className = 'vsel-control';
      control.setAttribute('role', 'combobox');
      control.setAttribute('aria-haspopup', 'listbox');
      control.setAttribute('aria-expanded', 'false');
      control.setAttribute('aria-controls', listId);
      if (!this.opts.disabled) control.setAttribute('tabindex', '0');
      this._control = control;

      // Borrow the accessible name from an associated <label for=…>.
      if (this.native && this.native.id) {
        var lab = document.querySelector('label[for="' + this.native.id + '"]');
        if (lab) control.setAttribute('aria-label', lab.textContent.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''));
      }

      if (this.opts.multiple) {
        this._tagsEl = document.createElement('span');
        this._tagsEl.className = 'vsel-tags';
        control.appendChild(this._tagsEl);
      }
      this._valueEl = document.createElement('span');
      this._valueEl.className = 'vsel-value';
      control.appendChild(this._valueEl);

      if (this.opts.clearable) {
        this._clearBtn = document.createElement('button');
        this._clearBtn.type = 'button';
        this._clearBtn.className = 'vsel-clear';
        this._clearBtn.setAttribute('aria-label', L.clear);
        this._clearBtn.innerHTML = ICONS.close;
        control.appendChild(this._clearBtn);
      }

      var arrow = document.createElement('span');
      arrow.className = 'vsel-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = ICONS.chevron;
      control.appendChild(arrow);
      wrap.appendChild(control);

      if (this.opts.disabled) wrap.classList.add('is-disabled');

      if (this.native) {
        this.native.parentNode.insertBefore(wrap, this.native.nextSibling);
        this._nativeDisplay = this.native.style.display;
        this.native.style.display = 'none';
        this.native.setAttribute('aria-hidden', 'true');
        this.native.setAttribute('data-vsel-bound', '');
      } else {
        this.el.appendChild(wrap);
        if (this.opts.name) {
          // Form carrier: hidden input (single) or hidden multi-select.
          if (this.opts.multiple) {
            this._hiddenSelect = document.createElement('select');
            this._hiddenSelect.multiple = true;
            this._hiddenSelect.name = this.opts.name;
            this._hiddenSelect.style.display = 'none';
            this._hiddenSelect.setAttribute('aria-hidden', 'true');
            this._hiddenSelect.tabIndex = -1;
            wrap.appendChild(this._hiddenSelect);
          } else {
            this._hiddenInput = document.createElement('input');
            this._hiddenInput.type = 'hidden';
            this._hiddenInput.name = this.opts.name;
            wrap.appendChild(this._hiddenInput);
          }
        }
      }

      /* panel */
      var panel = document.createElement('div');
      panel.className = 'vsel vsel-panel' + saltClass();
      this.panel = panel;

      if (this.opts.searchable) {
        var search = document.createElement('div');
        search.className = 'vsel-search';
        var input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', listId);
        input.setAttribute('aria-label', L.search);
        input.placeholder = L.search;
        search.appendChild(input);
        panel.appendChild(search);
        this._searchInput = input;
      }

      var list = document.createElement('div');
      list.className = 'vsel-list';
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', L.options);
      if (this.opts.multiple) list.setAttribute('aria-multiselectable', 'true');
      panel.appendChild(list);
      this._list = list;

      var empty = document.createElement('div');
      empty.className = 'vsel-empty';
      empty.textContent = this.opts.noResultsText;
      panel.appendChild(empty);

      panel.style.display = 'none';
      document.body.appendChild(panel);
    },

    _bind: function () {
      var self = this;

      this._onControlClick = function (e) {
        if (self.opts.disabled) return;
        var t = e.target;
        var tagX = t.closest ? t.closest('.vsel-tag-x') : null;
        if (tagX) {
          self._removeTag(+tagX.getAttribute('data-i'));
          return;
        }
        if (self._clearBtn && (t === self._clearBtn || self._clearBtn.contains(t))) {
          self.setValue(self.opts.multiple ? [] : null);
          self._control.focus();
          return;
        }
        self.toggle();
      };
      this._onControlKeydown = function (e) { self._handleKeydown(e, false); };
      this._control.addEventListener('click', this._onControlClick);
      this._control.addEventListener('keydown', this._onControlKeydown);

      // Selecting an option must not steal focus from the control/search.
      this._onPanelMousedown = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (opt || e.target === self._list) e.preventDefault();
      };
      this._onPanelClick = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (!opt || opt.classList.contains('is-disabled')) return;
        self._choose(+opt.getAttribute('data-i'));
      };
      this._onPanelOver = function (e) {
        var opt = e.target.closest ? e.target.closest('.vsel-option') : null;
        if (opt && !opt.classList.contains('is-disabled')) {
          self._setActive(+opt.getAttribute('data-i'), false);
        }
      };
      this.panel.addEventListener('mousedown', this._onPanelMousedown);
      this.panel.addEventListener('click', this._onPanelClick);
      this.panel.addEventListener('mouseover', this._onPanelOver);

      if (this._searchInput) {
        this._onSearchInput = function () {
          self._normQuery = fold(self._searchInput.value.replace(/^\s+|\s+$/g, ''));
          self._renderList();
          self._initActive();
          if (self.isOpen) self._position();
        };
        this._onSearchKeydown = function (e) { self._handleKeydown(e, true); };
        this._searchInput.addEventListener('input', this._onSearchInput);
        this._searchInput.addEventListener('keydown', this._onSearchKeydown);
      }

      // Close when keyboard focus moves somewhere outside the widget.
      // relatedTarget is null for clicks on non-focusables and window blur —
      // the outside-pointerdown handler owns those cases.
      this._onFocusOut = function (e) {
        if (!self.isOpen || !e.relatedTarget) return;
        if (self.panel.contains(e.relatedTarget) ||
            self.wrapper.contains(e.relatedTarget)) return;
        self.close(false);
      };
      this.wrapper.addEventListener('focusout', this._onFocusOut);
      this.panel.addEventListener('focusout', this._onFocusOut);

      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(self.wrapper) !== -1) return;
        self.close(false);
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this.wrapper.setAttribute('data-theme', resolved);
      this.panel.setAttribute('data-theme', resolved);
    },

    /* ---------------- rendering ---------------- */

    _renderControl: function () {
      var L = this.opts.labels;
      if (this.opts.multiple) {
        this._tagsEl.innerHTML = '';
        for (var i = 0; i < this.selectedValues.length; i++) {
          var o = this._optionByValue(this.selectedValues[i]);
          if (!o) continue;
          var tag = document.createElement('span');
          tag.className = 'vsel-tag';
          var lbl = document.createElement('span');
          lbl.className = 'vsel-tag-label';
          lbl.textContent = o.label;
          tag.appendChild(lbl);
          var x = document.createElement('button');
          x.type = 'button';
          x.className = 'vsel-tag-x';
          x.setAttribute('data-i', String(i));
          x.setAttribute('aria-label', L.remove + ' ' + o.label);
          x.tabIndex = -1; // one tab stop: the control; Backspace removes tags
          x.innerHTML = ICONS.close;
          tag.appendChild(x);
          this._tagsEl.appendChild(tag);
        }
        var has = this.selectedValues.length > 0;
        this._valueEl.style.display = has ? 'none' : '';
        this._valueEl.className = 'vsel-value is-placeholder';
        this._valueEl.textContent = this.opts.placeholder;
      } else {
        var sel = this.selectedValues.length
          ? this._optionByValue(this.selectedValues[0]) : null;
        this._valueEl.className = 'vsel-value' + (sel ? '' : ' is-placeholder');
        if (sel && sel.html) this._valueEl.innerHTML = sel.label;
        else this._valueEl.textContent = sel ? sel.label : this.opts.placeholder;
      }
      if (this._clearBtn) {
        this._clearBtn.style.display =
          (this.selectedValues.length && !this.opts.disabled) ? '' : 'none';
      }
    },

    _renderList: function () {
      var list = this._list;
      list.innerHTML = '';
      var q = this._normQuery;
      var groups = {};
      var visible = [];
      for (var i = 0; i < this.options.length; i++) {
        var o = this.options[i];
        if (q && fold(o.label).indexOf(q) === -1) continue;
        visible.push(i);
        var parent = list;
        if (o.group) {
          if (!groups[o.group]) {
            var g = document.createElement('div');
            g.setAttribute('role', 'group');
            g.setAttribute('aria-label', o.group);
            var gl = document.createElement('div');
            gl.className = 'vsel-group-label';
            gl.setAttribute('aria-hidden', 'true');
            gl.textContent = o.group;
            g.appendChild(gl);
            list.appendChild(g);
            groups[o.group] = g;
          }
          parent = groups[o.group];
        }
        var selected = this.selectedValues.indexOf(o.value) !== -1;
        var opt = document.createElement('div');
        opt.className = 'vsel-option' +
          (selected ? ' is-selected' : '') +
          (o.disabled ? ' is-disabled' : '');
        opt.id = this._uid + '-opt-' + i;
        opt.setAttribute('role', 'option');
        opt.setAttribute('data-i', String(i));
        opt.setAttribute('aria-selected', String(selected));
        if (o.disabled) opt.setAttribute('aria-disabled', 'true');
        var check = document.createElement('span');
        check.className = 'vsel-check';
        check.innerHTML = ICONS.check;
        opt.appendChild(check);
        var lbl = document.createElement('span');
        lbl.className = 'vsel-option-label';
        // Labels are TEXT by default; `html: true` is an explicit opt-in.
        if (o.html) lbl.innerHTML = o.label;
        else lbl.textContent = o.label;
        opt.appendChild(lbl);
        parent.appendChild(opt);
      }
      this._visible = visible;
      this.panel.classList.toggle('is-empty', visible.length === 0);
    },

    // In-place state refresh — cheaper than a re-render, keeps hover intact.
    _refreshListState: function () {
      var opts = this._list.querySelectorAll('.vsel-option');
      for (var i = 0; i < opts.length; i++) {
        var selected = this.selectedValues.indexOf(
          this.options[+opts[i].getAttribute('data-i')].value) !== -1;
        opts[i].classList.toggle('is-selected', selected);
        opts[i].setAttribute('aria-selected', String(selected));
      }
    },

    /* ---------------- active option ---------------- */

    _enabledVisible: function () {
      var out = [];
      for (var i = 0; i < this._visible.length; i++) {
        if (!this.options[this._visible[i]].disabled) out.push(this._visible[i]);
      }
      return out;
    },

    _initActive: function () {
      var vis = this._enabledVisible();
      var idx = -1;
      for (var i = 0; i < vis.length; i++) {
        if (this.selectedValues.indexOf(this.options[vis[i]].value) !== -1) {
          idx = vis[i];
          break;
        }
      }
      if (idx === -1 && vis.length) idx = vis[0];
      if (idx !== -1) this._setActive(idx, true);
      else {
        this._activeIdx = -1;
        this._setActiveDescendant('');
      }
    },

    _setActive: function (idx, scroll) {
      this._activeIdx = idx;
      var prev = this._list.querySelector('.vsel-option.is-active');
      if (prev) prev.classList.remove('is-active');
      var el = this._list.querySelector('[data-i="' + idx + '"]');
      if (!el) return;
      el.classList.add('is-active');
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
      if (id) this._control.setAttribute('aria-activedescendant', id);
      else this._control.removeAttribute('aria-activedescendant');
      if (this._searchInput) {
        if (id) this._searchInput.setAttribute('aria-activedescendant', id);
        else this._searchInput.removeAttribute('aria-activedescendant');
      }
    },

    _moveActive: function (dir) {
      var vis = this._enabledVisible();
      if (!vis.length) return;
      var cur = vis.indexOf(this._activeIdx);
      var next = cur === -1
        ? (dir > 0 ? 0 : vis.length - 1)
        : (cur + dir + vis.length) % vis.length; // skips disabled, wraps
      this._setActive(vis[next], true);
    },

    /* ---------------- selection ---------------- */

    _choose: function (idx) {
      var o = this.options[idx];
      if (!o || o.disabled) return;
      if (this.opts.multiple) {
        var pos = this.selectedValues.indexOf(o.value);
        if (pos !== -1) this.selectedValues.splice(pos, 1);
        else {
          var max = +this.opts.maxItems;
          if (max > 0 && this.selectedValues.length >= max) return;
          this.selectedValues.push(o.value);
        }
        this._refreshListState();
        this._renderControl();
        this._afterChange(false);
        if (this.isOpen) this._position(); // tags can change the control height
      } else {
        var same = this.selectedValues.length === 1 && this.selectedValues[0] === o.value;
        this.selectedValues = [o.value];
        this._renderControl();
        if (!same) this._afterChange(false);
        this.close(true);
      }
    },

    _removeTag: function (i) {
      if (this.opts.disabled || i < 0 || i >= this.selectedValues.length) return;
      this.selectedValues.splice(i, 1);
      this._renderControl();
      this._afterChange(false);
      if (this.isOpen) {
        this._refreshListState();
        this._position();
      }
    },

    /* ---------------- keyboard ---------------- */

    _handleKeydown: function (e, fromSearch) {
      if (this.opts.disabled) return;
      var key = e.key;
      var searchText = fromSearch ? this._searchInput.value : '';

      if (!this.isOpen) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
          e.preventDefault();
          this.open();
          return;
        }
        if (key === 'Backspace' && this.opts.multiple && this.selectedValues.length) {
          this._removeTag(this.selectedValues.length - 1);
          return;
        }
        if (!this.opts.searchable && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.open();
          this._typeahead(key);
        }
        return;
      }

      switch (key) {
        case 'ArrowDown':
          e.preventDefault();
          this._moveActive(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          this._moveActive(-1);
          return;
        case 'Home':
        case 'End':
          // In the search field these keys move the caret, as usual.
          if (fromSearch && searchText) return;
          e.preventDefault();
          var vis = this._enabledVisible();
          if (vis.length) this._setActive(vis[key === 'Home' ? 0 : vis.length - 1], true);
          return;
        case 'Enter':
          e.preventDefault();
          if (this._activeIdx !== -1) this._choose(this._activeIdx);
          return;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          this.close(true);
          return;
        case 'Tab':
          this.close(false); // let Tab move on naturally
          return;
        case 'Backspace':
          if (this.opts.multiple && !searchText && this.selectedValues.length) {
            this._removeTag(this.selectedValues.length - 1);
          }
          return;
        case ' ':
          if (!fromSearch) {
            e.preventDefault();
            if (this._typeBuf && Date.now() - this._typeAt <= 500) this._typeahead(' ');
            else if (this._activeIdx !== -1) this._choose(this._activeIdx);
          }
          return;
        default:
          if (!this.opts.searchable && key.length === 1 &&
              !e.ctrlKey && !e.metaKey && !e.altKey) {
            this._typeahead(key);
          }
      }
    },

    _typeahead: function (ch) {
      var now = Date.now();
      if (now - this._typeAt > 500) this._typeBuf = '';
      this._typeAt = now;
      this._typeBuf += fold(ch);
      var vis = this._enabledVisible();
      if (!vis.length) return;
      var from = vis.indexOf(this._activeIdx);
      // A growing buffer re-checks the current option; a fresh keypress
      // starts at the next one, so repeated letters cycle through matches.
      var start = this._typeBuf.length > 1 ? 0 : 1;
      for (var n = start; n <= vis.length; n++) {
        var idx = vis[((from === -1 ? 0 : from) + n) % vis.length];
        if (fold(this.options[idx].label).indexOf(this._typeBuf) === 0) {
          this._setActive(idx, true);
          return;
        }
      }
    },

    /* ---------------- popup positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this._control;
      panel.style.minWidth = anchor.offsetWidth + 'px';
      var prefer = this.opts.position === 'below' ? 'below'
        : this.opts.position === 'above' ? 'above' : null;
      if (window.VC && typeof window.VC.position === 'function') {
        var res = window.VC.position(panel, anchor, { gap: 6, pad: 8, prefer: prefer });
        if (res) panel.style.transformOrigin = res.below ? '50% 0' : '50% 100%';
        return;
      }
      // Private fallback: flip above when there is no room below, clamp to
      // the viewport horizontally (same approach as the datepicker).
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

    /* ---------------- public API ---------------- */

    open: function () {
      if (!this.wrapper || this.isOpen || this.opts.disabled) return this;
      clearTimeout(this._closeTimer);
      if (this._searchInput) this._searchInput.value = '';
      this._normQuery = '';

      // If the control lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this._control.closest ? this._control.closest('dialog') : null;
      this._inTopLayer = !!host;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this._renderList();
      this._initActive();
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vsel-open'); });
      this.isOpen = true;
      this.wrapper.classList.add('is-open');
      this._control.setAttribute('aria-expanded', 'true');
      if (this._searchInput) {
        this._searchInput.setAttribute('aria-expanded', 'true');
        this._searchInput.focus();
      }

      document.addEventListener('pointerdown', this._onDocPointer, true);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);

      if (this.opts.onOpen) this.opts.onOpen(this);
      this._emit('open');
      return this;
    },

    close: function (refocus) {
      if (!this.wrapper || !this.isOpen) return this;
      this.isOpen = false;
      this.wrapper.classList.remove('is-open');
      this._control.setAttribute('aria-expanded', 'false');
      this._setActiveDescendant('');
      if (this._searchInput) this._searchInput.setAttribute('aria-expanded', 'false');

      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);

      var focusInside = this.panel.contains(document.activeElement);
      this.panel.classList.remove('vsel-open');
      var panel = this.panel;
      clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(function () { panel.style.display = 'none'; }, 140);

      // refocus === false means "focus is moving elsewhere, leave it alone".
      if (refocus !== false && (refocus || focusInside)) this._control.focus();
      if (this.opts.onClose) this.opts.onClose(this);
      this._emit('close');
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.close(true) : this.open();
    },

    getValue: function () {
      if (!this.wrapper) return this.opts && this.opts.multiple ? [] : null;
      if (this.opts.multiple) return this.selectedValues.slice();
      return this.selectedValues.length ? this.selectedValues[0] : null;
    },

    setValue: function (v, config) {
      if (!this.wrapper) return this;
      var silent = config && config.silent;
      this.selectedValues = this._prune(toValueArray(v));
      this._renderControl();
      if (this.isOpen) this._refreshListState();
      this._afterChange(silent);
      return this;
    },

    enable: function () {
      if (!this.wrapper) return this;
      this.opts.disabled = false;
      this.wrapper.classList.remove('is-disabled');
      this._control.setAttribute('tabindex', '0');
      this._control.removeAttribute('aria-disabled');
      if (this.native) this.native.disabled = false;
      this._renderControl();
      return this;
    },

    disable: function () {
      if (!this.wrapper) return this;
      this.close(false);
      this.opts.disabled = true;
      this.wrapper.classList.add('is-disabled');
      this._control.removeAttribute('tabindex');
      this._control.setAttribute('aria-disabled', 'true');
      if (this.native) this.native.disabled = true;
      this._renderControl();
      return this;
    },

    // Re-read the options: from the native <select> (its markup is the
    // source of truth) or from a fresh look at opts.options.
    refresh: function () {
      if (!this.wrapper) return this;
      if (this.native) this._readNative();
      else {
        this.options = normalizeOptions(this.opts.options);
        this.selectedValues = this._prune(this.selectedValues);
      }
      this._renderControl();
      this._syncForm(true);
      if (this.isOpen) {
        this._renderList();
        this._initActive();
        this._position();
      }
      return this;
    },

    // Tear down and restore the native select untouched.
    destroy: function () {
      if (!this.wrapper) return this;
      this.close(false);
      clearTimeout(this._closeTimer);
      unwatchAutoTheme(this);
      document.removeEventListener('pointerdown', this._onDocPointer, true);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
      if (this.native) {
        this.native.style.display = this._nativeDisplay || '';
        this.native.removeAttribute('aria-hidden');
        this.native.removeAttribute('data-vsel-bound');
      }
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Select.version = VERSION;
  Select.defaults = DEFAULTS;

  Select.create = function (target, options) {
    return new Select(target, options);
  };

  Select.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset || {}, o = {};
    if (d.vselPlaceholder) o.placeholder = d.vselPlaceholder;
    if (d.vselName) o.name = d.vselName;
    if (d.vselTheme) o.theme = d.vselTheme;
    if (d.vselPosition) o.position = d.vselPosition;
    if (d.vselNoResults) o.noResultsText = d.vselNoResults;
    if (d.vselValue != null && d.vselValue !== '') {
      o.value = d.vselValue.indexOf(',') !== -1 ? d.vselValue.split(',') : d.vselValue;
    }
    if (d.vselMaxItems != null && d.vselMaxItems !== '') o.maxItems = +d.vselMaxItems;
    if (d.vselSearchable != null) o.searchable = parseBool(d.vselSearchable);
    if (d.vselClearable != null) o.clearable = parseBool(d.vselClearable);
    if (d.vselMultiple != null) o.multiple = parseBool(d.vselMultiple);
    if (d.vselStyles != null) o.styles = parseBool(d.vselStyles);
    if (d.vselOptions) {
      // JSON array, or a plain comma list as shorthand.
      try { o.options = JSON.parse(d.vselOptions); }
      catch (err) { o.options = d.vselOptions.split(','); }
    }
    return o;
  }

  Select.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vsel]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Select(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Select auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Select.autoInit(); });
    } else {
      Select.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Select.displayName = 'Select';
  Select.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Select, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Select.css = renderCss();
  }
  Select.rootClass = 'vsel';
  Select.themeVars = {
    accent: '--vsel-accent',
    radius: '--vsel-radius',
    font: '--vsel-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Select.varScopes = ['.vsel', '.vsel[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('select', Select);
  }

  return Select;
});
