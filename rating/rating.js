/*!
 * Vanilla UI Kit Rating v1.0.0
 * A single-file, zero-dependency star rating input/display for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="rating.js"></script>
 *   <div id="stars"></div>
 *   <script>new Rating('#stars', { onChange: function (v) {} })</script>
 *
 * Or zero-JS:
 *   <div data-vrt data-value="3.5"></div>
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rating = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-rating-styles';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Rating.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Rating.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the widget; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vrt{--vrt-fill:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vrt{' +
      '--vrt-accent:#5b5bd6;' +
      '--vrt-fill:#f5a623;' + // the one non-accent fill in the family: warm star gold
      '--vrt-bg:#ffffff;' +
      '--vrt-text:#1c1d21;' +
      '--vrt-muted:#72747e;' +
      '--vrt-faint:#e7e7ec;' +
      '--vrt-radius:8px;' +
      '--vrt-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vrt[data-theme=dark]{' +
      '--vrt-accent:#7b7bea;' +
      '--vrt-fill:#f7b84d;' +
      '--vrt-bg:#1b1d24;' +
      '--vrt-text:#e9eaf0;' +
      '--vrt-muted:#989aa6;' +
      '--vrt-faint:#31343f;}' +
    '.vrt.SALT{display:inline-flex;align-items:center;gap:8px;' +
      'font-family:var(--vrt-font);color:var(--vrt-text);box-sizing:border-box;}' +
    '.vrt.SALT *,.vrt.SALT *::before,.vrt.SALT *::after{box-sizing:border-box;}' +
    '.vrt.SALT .vrt-stars{display:inline-flex;gap:3px;padding:2px;margin:-2px;' +
      'cursor:pointer;border-radius:var(--vrt-radius);touch-action:manipulation;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.vrt.SALT .vrt-stars:focus{outline:none;}' +
    '.vrt.SALT .vrt-stars:focus-visible{outline:2px solid var(--vrt-accent);outline-offset:1px;}' +
    '.vrt.SALT .vrt-star{position:relative;flex:none;transition:transform .12s ease;}' +
    '.vrt.SALT .vrt-star svg{display:block;width:100%;height:100%;}' +
    '.vrt.SALT .vrt-star-empty{display:block;width:100%;height:100%;color:var(--vrt-muted);}' +
    /* the fractional overlay — full icon clipped to N% of the star's width */
    '.vrt.SALT .vrt-star-fill{position:absolute;top:0;left:0;width:0;height:100%;' +
      'overflow:hidden;color:var(--vrt-fill);pointer-events:none;}' +
    '.vrt.SALT .vrt-star-full{display:block;height:100%;}' +
    '.vrt.SALT .vrt-stars:not(.vrt-static) .vrt-star:hover{transform:scale(1.1);}' +
    '.vrt.SALT .vrt-value{font-size:13px;font-weight:600;color:var(--vrt-muted);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vrt.SALT.vrt-readonly .vrt-stars{cursor:default;}' +
    '.vrt.SALT.vrt-disabled{opacity:.55;}' +
    '.vrt.SALT.vrt-disabled .vrt-stars{cursor:not-allowed;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vrt.SALT .vrt-star{transition:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/rating.css), or set Rating.salt to
  // your own token / false BEFORE the first instance is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Rating.salt;
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
    // Insert before the page's own CSS so `.vrt { --vrt-* }` overrides win the cascade.
    var firstSheet = document.head.querySelector('link[rel="stylesheet"],style');
    if (firstSheet) document.head.insertBefore(style, firstSheet);
    else document.head.appendChild(style);
  }

  // Built-in icons, drawn in the family 1.5px-stroke style; the full variant
  // keeps the same stroke so its silhouette matches the empty one exactly
  // (important — the clipped overlay sits pixel-perfect on top of it).
  var STAR_PATH = 'M12 3.1 L14.7 8.9 L21 9.7 L16.4 14.1 L17.6 20.4 ' +
    'L12 17.3 L6.4 20.4 L7.6 14.1 L3 9.7 L9.3 8.9 Z';
  var HEART_PATH = 'M12 20.3 C7.4 17 3.5 13.7 3.5 9.8 C3.5 7.2 5.5 5.2 8 5.2 ' +
    'C9.6 5.2 11.1 6 12 7.3 C12.9 6 14.4 5.2 16 5.2 C18.5 5.2 20.5 7.2 20.5 9.8 ' +
    'C20.5 13.7 16.6 17 12 20.3 Z';

  function svgPair(path) {
    var open = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="';
    var attrs = '" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    return {
      empty: open + 'none"><path d="' + path + attrs,
      full: open + 'currentColor"><path d="' + path + attrs
    };
  }

  var ICONS = { star: svgPair(STAR_PATH), heart: svgPair(HEART_PATH) };

  // 'star' | 'heart' | {empty, full} pair of TRUSTED SVG strings.
  function resolveIcon(icon) {
    if (icon && typeof icon === 'object' && icon.empty && icon.full) return icon;
    return ICONS[icon] || ICONS.star;
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

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // '3.5' not '3.500000001', '3' not '3.0' — for the value text and the form.
  function fmt(v) {
    return String(Math.round(v * 100) / 100);
  }

  function defaultLabel(value, max) {
    return fmt(value) + ' of ' + max;
  }

  var DEFAULTS = {
    max: 5,             // number of stars
    value: 0,           // initial value (input mode reads the input instead)
    half: true,         // half-star steps on hover/click/keyboard
    icon: 'star',       // 'star' | 'heart' | {empty, full} trusted SVG strings
    size: 22,           // icon size in px
    readOnly: false,    // display only: no interaction, no focus stop
    clearable: true,    // clicking the current value clears to 0
    name: null,         // adds a hidden input for forms (container mode)
    showValue: false,   // '3.5' text after the stars
    disabled: false,    // starts disabled (input mode inherits the input's)
    labels: defaultLabel, // fn(value, max) → aria-valuetext / read-only label
    theme: 'auto',      // 'auto' | 'light' | 'dark'
    styles: true,       // false = headless: no CSS injected, style .vrt-* yourself
    onChange: null,     // fn(value)
    onHover: null       // fn(value) previewing, fn(null) on leave
  };

  // SSR: constructing without a DOM yields an inert instance.
  var dummyInstance = {
    el: null,
    root: null,
    input: null,
    stars: null,
    value: 0,
    max: DEFAULTS.max,
    getValue: function () { return 0; },
    setValue: function () { return dummyInstance; },
    enable: function () { return dummyInstance; },
    disable: function () { return dummyInstance; },
    destroy: function () { return dummyInstance; }
  };

  /* ------------------------------------------------------------------ *
   * Rating.
   * ------------------------------------------------------------------ */

  function Rating(target, options) {
    if (!HAS_DOM) return dummyInstance;
    var el = resolveElement(target);
    if (!el) throw new Error('Rating: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    options = options || {};
    this.el = el;
    this._isInput = el.tagName === 'INPUT';
    this.opts = assignOptions({}, DEFAULTS, options);
    this.max = Math.max(1, Math.floor(+this.opts.max) || DEFAULTS.max);
    this._disabled = !!this.opts.disabled;
    if (this._isInput && options.disabled === undefined) this._disabled = el.disabled;

    // Input mode: the input's own value wins unless opts.value is explicit.
    var v = this.opts.value;
    if (this._isInput && options.value === undefined && el.value !== '') v = el.value;
    this.value = clamp(+v || 0, 0, this.max);

    this._preview = null; // hover value currently painted, or null
    this._saved = [];     // [{el, name, value}] — attributes to restore on destroy
    this._classes = [];   // [[el, className]] — classes to remove on destroy
    this._built = [];     // nodes we created — removed on destroy

    if (this.opts.styles !== false) injectStyles();
    this._build();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);

    this._render(this.value);
    this._syncAria();
    this._syncInput(false);
    this._refreshState();
  }

  Rating.prototype = {
    constructor: Rating,

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

    /* ---------------- setup ---------------- */

    _build: function () {
      var s = saltToken(), i;

      if (this._isInput) {
        // Enhance mode: hide the input (it keeps submitting), render after it.
        this.input = this.el;
        this._record(this.input, 'hidden');
        this.input.hidden = true;
        this.root = document.createElement('div');
        this.root.className = 'vrt' + (s ? ' ' + s : '');
        if (this.input.parentNode) {
          this.input.parentNode.insertBefore(this.root, this.input.nextSibling);
        }
        this._built.push(this.root);
      } else {
        this.root = this.el;
        this.input = null;
        this._addClass(this.root, 'vrt');
        if (s) this._addClass(this.root, s);
      }
      if (this.opts.readOnly) this._addClass(this.root, 'vrt-readonly');

      var pair = resolveIcon(this.opts.icon);
      var size = Math.max(8, Math.floor(+this.opts.size) || DEFAULTS.size);
      this.stars = document.createElement('span');
      this.stars.className = 'vrt-stars';
      this._starEls = [];
      this._fillEls = [];
      for (i = 0; i < this.max; i++) {
        var star = document.createElement('span');
        star.className = 'vrt-star';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        var empty = document.createElement('span');
        empty.className = 'vrt-star-empty';
        empty.innerHTML = pair.empty;
        // The overlay clips by width%, so the full icon inside needs its own
        // fixed width — otherwise it would shrink with the clip instead.
        var fill = document.createElement('span');
        fill.className = 'vrt-star-fill';
        var full = document.createElement('span');
        full.className = 'vrt-star-full';
        full.style.width = size + 'px';
        full.innerHTML = pair.full;
        fill.appendChild(full);
        star.appendChild(empty);
        star.appendChild(fill);
        this.stars.appendChild(star);
        this._starEls.push(star);
        this._fillEls.push(fill);
      }
      this.root.appendChild(this.stars);
      this._built.push(this.stars);

      if (this.opts.showValue) {
        this.valueEl = document.createElement('span');
        this.valueEl.className = 'vrt-value';
        this.root.appendChild(this.valueEl);
        this._built.push(this.valueEl);
      }

      if (!this._isInput && this.opts.name) {
        this.input = document.createElement('input');
        this.input.type = 'hidden';
        this.input.name = this.opts.name;
        this.root.appendChild(this.input);
        this._built.push(this.input);
      }

      if (this.opts.readOnly) {
        // Display mode: an image with a label, no focus stop.
        this.stars.className += ' vrt-static';
        this.stars.setAttribute('role', 'img');
      } else {
        // Input mode: one slider = one tab stop for the whole group.
        this.stars.setAttribute('role', 'slider');
        this.stars.setAttribute('aria-orientation', 'horizontal');
        this.stars.setAttribute('aria-valuemin', '0');
        this.stars.setAttribute('aria-valuemax', String(this.max));
        var name = this.el.getAttribute('aria-label');
        if (!name && this._isInput && this.el.id) {
          try { // adopt the input's <label for> text as the slider's name
            var lab = document.querySelector('label[for="' + this.el.id + '"]');
            if (lab) name = lab.textContent.replace(/^\s+|\s+$/g, '');
          } catch (err) { /* exotic id characters — skip */ }
        }
        if (name) this.stars.setAttribute('aria-label', name);
      }
    },

    _bind: function () {
      var self = this;
      this._onMove = function (e) { self._handleMove(e); };
      this._onLeave = function () { self._handleLeave(); };
      this._onClick = function (e) { self._handleClick(e); };
      this._onKeydown = function (e) { self._handleKeydown(e); };
      this.stars.addEventListener('mousemove', this._onMove);
      this.stars.addEventListener('mouseleave', this._onLeave);
      this.stars.addEventListener('click', this._onClick);
      this.stars.addEventListener('keydown', this._onKeydown);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      var resolved = (t === 'light' || t === 'dark') ? t : resolveAutoTheme();
      this._setAttr(this.root, 'data-theme', resolved);
    },

    /* ---------------- rendering ---------------- */

    // Paint any value 0..max: per star the overlay is clamp(v−i, 0, 1)·100%,
    // so fractions render exactly (4.3 → four full stars + a 30% fifth).
    _render: function (v) {
      for (var i = 0; i < this._fillEls.length; i++) {
        var pct = clamp(v - i, 0, 1) * 100;
        this._fillEls[i].style.width = pct + '%';
      }
      if (this.valueEl) this.valueEl.textContent = fmt(v);
    },

    _syncAria: function () {
      var lab = typeof this.opts.labels === 'function' ? this.opts.labels : defaultLabel;
      var text = String(lab(this.value, this.max));
      if (this.opts.readOnly) {
        this.stars.setAttribute('aria-label', text);
      } else {
        this.stars.setAttribute('aria-valuenow', String(this.value));
        this.stars.setAttribute('aria-valuetext', text);
      }
    },

    _syncInput: function (fireNative) {
      if (!this.input) return;
      this.input.value = this.value > 0 ? fmt(this.value) : '';
      // Enhanced native inputs announce commits like a user edit would.
      if (fireNative && this._isInput) {
        this.input.dispatchEvent(new CustomEvent('change', { bubbles: true }));
      }
    },

    _refreshState: function () {
      var cl = this.root.classList;
      if (this._disabled) cl.add('vrt-disabled');
      else cl.remove('vrt-disabled');
      if (this.opts.readOnly) return; // static forever; no focus, no ARIA state
      if (this._disabled) {
        this.stars.classList.add('vrt-static');
        this.stars.setAttribute('aria-disabled', 'true');
        this.stars.setAttribute('tabindex', '-1');
      } else {
        this.stars.classList.remove('vrt-static');
        this.stars.removeAttribute('aria-disabled');
        this.stars.setAttribute('tabindex', '0');
      }
    },

    /* ---------------- interaction ---------------- */

    _interactive: function () {
      return !this.opts.readOnly && !this._disabled;
    },

    // Pointer → value: which star, and its left half → .5 when `half`.
    _valueFromEvent: function (e) {
      var node = e.target, i = -1;
      while (node && node !== this.stars) {
        var idx = this._starEls.indexOf(node);
        if (idx !== -1) { i = idx; break; }
        node = node.parentNode;
      }
      if (i === -1) return null;
      var v = i + 1;
      if (this.opts.half) {
        var rect = this._starEls[i].getBoundingClientRect();
        if (rect.width && e.clientX - rect.left < rect.width / 2) v = i + 0.5;
      }
      return v;
    },

    _handleMove: function (e) {
      if (!this._interactive()) return;
      var v = this._valueFromEvent(e);
      if (v == null || v === this._preview) return;
      this._preview = v;
      this._render(v);
      if (this.opts.onHover) this.opts.onHover(v);
    },

    _handleLeave: function () {
      if (this._preview == null) return;
      this._preview = null;
      this._render(this.value);
      if (this.opts.onHover) this.opts.onHover(null);
    },

    _handleClick: function (e) {
      if (!this._interactive()) return;
      var v = this._valueFromEvent(e);
      if (v == null) return;
      if (this.opts.clearable && v === this.value) v = 0; // toggle-off
      this._preview = null;
      this.setValue(v);
    },

    _handleKeydown: function (e) {
      if (!this._interactive() || e.altKey || e.ctrlKey || e.metaKey) return;
      var step = this.opts.half ? 0.5 : 1;
      var v = null;
      // ± steps land on the NEAREST grid mark in that direction, so 4.3
      // (set programmatically) becomes 4.5 on ArrowRight and 4 on ArrowLeft.
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        v = Math.floor((this.value + step) / step) * step;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        v = Math.ceil((this.value - step) / step) * step;
      } else if (e.key === 'Home') {
        v = 0;
      } else if (e.key === 'End') {
        v = this.max;
      } else if (/^[1-9]$/.test(e.key)) {
        v = Math.min(+e.key, this.max);
      } else {
        return;
      }
      e.preventDefault();
      this._preview = null;
      this.setValue(clamp(v, 0, this.max));
    },

    /* ---------------- public API ---------------- */

    getValue: function () {
      return this.value;
    },

    // Any number 0..max — fractions are fine and render via the overlay.
    setValue: function (v, o) {
      v = +v;
      if (isNaN(v)) v = 0;
      v = clamp(v, 0, this.max);
      var changed = v !== this.value;
      var silent = !!(o && o.silent);
      this.value = v;
      this._render(v);
      this._syncAria();
      this._syncInput(changed && !silent);
      if (changed && !silent) {
        if (this.opts.onChange) this.opts.onChange(v);
        this.root.dispatchEvent(new CustomEvent('rating:change', {
          bubbles: true,
          detail: { value: v, rating: this }
        }));
      }
      return this;
    },

    enable: function () {
      this._disabled = false;
      if (this._isInput && this.input) {
        this._record(this.input, 'disabled');
        this.input.disabled = false;
      }
      this._refreshState();
      return this;
    },

    disable: function () {
      this._disabled = true;
      if (this._isInput && this.input) {
        // A disabled control must not submit — mirror onto the native input.
        this._record(this.input, 'disabled');
        this.input.disabled = true;
      }
      this._refreshState();
      return this;
    },

    destroy: function () {
      if (!this.el || this._destroyed) return this;
      this._destroyed = true;
      unwatchAutoTheme(this);
      this.stars.removeEventListener('mousemove', this._onMove);
      this.stars.removeEventListener('mouseleave', this._onLeave);
      this.stars.removeEventListener('click', this._onClick);
      this.stars.removeEventListener('keydown', this._onKeydown);
      var i;
      for (i = 0; i < this._built.length; i++) {
        var n = this._built[i];
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      // Put back every attribute we touched, then drop our classes.
      // (Enhanced inputs reappear un-hidden and keep their synced value.)
      for (i = this._saved.length - 1; i >= 0; i--) {
        var rec = this._saved[i];
        if (rec.value == null) rec.el.removeAttribute(rec.name);
        else rec.el.setAttribute(rec.name, rec.value);
      }
      for (i = 0; i < this._classes.length; i++) {
        this._classes[i][0].classList.remove(this._classes[i][1]);
      }
      this.root.classList.remove('vrt-disabled');
      if (instances) instances.delete(this.el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Rating.version = VERSION;
  Rating.defaults = DEFAULTS;

  Rating.create = function (target, options) {
    return new Rating(target, options);
  };

  Rating.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    if (d.max) o.max = +d.max;
    if (d.value != null && d.value !== '') o.value = parseFloat(d.value);
    if (d.half != null) o.half = parseBool(d.half);
    if (d.icon) o.icon = d.icon;
    if (d.size) o.size = +d.size;
    var ro = d.readOnly != null ? d.readOnly : d.readonly; // data-read-only | data-readonly
    if (ro != null) o.readOnly = parseBool(ro);
    if (d.clearable != null) o.clearable = parseBool(d.clearable);
    if (d.name) o.name = d.name;
    if (d.showValue != null) o.showValue = parseBool(d.showValue);
    if (d.disabled != null) o.disabled = parseBool(d.disabled);
    if (d.theme) o.theme = d.theme;
    if (d.styles != null) o.styles = parseBool(d.styles);
    return o;
  }

  Rating.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vrt]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Rating(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad container must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Rating auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Rating.autoInit(); });
    } else {
      Rating.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Rating.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Rating, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Rating.css = renderCss();
  }
  Rating.displayName = 'Rating';
  Rating.rootClass = 'vrt';
  Rating.themeVars = {
    accent: '--vrt-accent',
    radius: '--vrt-radius',
    font: '--vrt-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Rating.varScopes = ['.vrt', '.vrt[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('rating', Rating);
  }

  return Rating;
});
