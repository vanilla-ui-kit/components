/*! vanilla-ui-kit/tooltip v1.0.0 — ES module wrapper. License: MIT */
var __root = typeof globalThis !== 'undefined' ? globalThis : self;
(function () {
var define, module, exports, self = __root;
/*!
 * Vanilla UI Kit Tooltip v1.0.0
 * A single-file, zero-dependency tooltip/popover for vanilla JS.
 * Part of the Vanilla UI Kit family — standalone, or converges with
 * the VC core when it is present.
 *
 * Quick start:
 *   <script src="tooltip.js"></script>
 *   <button data-vtt="Saves your work">Save</button>
 *
 * Headless:
 *   Tooltip.defaults.styles = false   // no CSS injected; style .vtt-* yourself
 *
 * License: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Tooltip = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined';
  var VERSION = '1.0.0';
  var STYLE_ID = 'vanilla-tooltip-styles';
  var OUT_MS = 150; // keep in sync with the .vtt transition
  var PLACEMENTS = ['top', 'bottom', 'left', 'right'];
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var uid = 0;

  /* ------------------------------------------------------------------ *
   * Embedded stylesheet — a separable layer. Never injected when
   * `styles: false`; also exposed raw as `Tooltip.css`.
   * ------------------------------------------------------------------ */

  // '.SALT' is a placeholder replaced at inject time with the active salt
  // namespace class ('.vc1' by default, '' when Tooltip.salt === false).
  // Structural rules carry the salt so host-page design systems cannot
  // override the panels; custom-property DEFINITIONS stay unsalted at their
  // documented specificity so `.vtt{--vtt-accent:…}` page overrides keep
  // working (var names are already namespaced — they need no armor).
  var CSS = '' +
    '.vtt{' +
      '--vtt-accent:#5b5bd6;' +
      '--vtt-bg:#ffffff;' +
      '--vtt-text:#1c1d21;' +
      '--vtt-muted:#72747e;' +
      '--vtt-faint:#e7e7ec;' +
      '--vtt-shadow:0 10px 28px rgba(24,25,32,.14),0 2px 8px rgba(24,25,32,.08);' +
      '--vtt-radius:10px;' +
      '--vtt-max-width:280px;' +
      '--vtt-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
    '}' +
    '.vtt[data-theme=dark]{' +
      '--vtt-accent:#7b7bea;' +
      '--vtt-bg:#1b1d24;' +
      '--vtt-text:#e9eaf0;' +
      '--vtt-muted:#989aa6;' +
      '--vtt-faint:#31343f;' +
      '--vtt-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
    '.vtt.SALT{position:absolute;z-index:100000;box-sizing:border-box;' +
      'background:var(--vtt-bg);color:var(--vtt-text);' +
      'font-family:var(--vtt-font);font-size:13px;line-height:1.45;font-weight:400;' +
      'border:1px solid var(--vtt-faint);border-radius:var(--vtt-radius);' +
      'box-shadow:var(--vtt-shadow);padding:7px 10px;' +
      'max-width:var(--vtt-max-width);width:max-content;pointer-events:none;' +
      'opacity:0;transform:scale(.96);' +
      'transition:opacity .12s ease,transform .15s cubic-bezier(.2,.9,.3,1.1);}' +
    '.vtt.SALT *,.vtt.SALT *::before,.vtt.SALT *::after{box-sizing:border-box;}' +
    '.vtt.SALT.vtt-open{opacity:1;transform:none;}' +
    '.vtt.SALT.vtt-interactive{pointer-events:auto;}' +
    '.vtt.SALT[data-placement=top]{transform-origin:50% 100%;}' +
    '.vtt.SALT[data-placement=bottom]{transform-origin:50% 0%;}' +
    '.vtt.SALT[data-placement=left]{transform-origin:100% 50%;}' +
    '.vtt.SALT[data-placement=right]{transform-origin:0% 50%;}' +
    '.vtt.SALT .vtt-content{overflow-wrap:break-word;}' +
    '.vtt.SALT .vtt-content :where(a){color:var(--vtt-accent);}' +
    '.vtt.SALT .vtt-content :where(small,.vtt-muted){color:var(--vtt-muted);font-size:12px;}' +
    /* the arrow is a rotated square; each placement shows the two borders
       that face away from the panel, so the outline stays continuous */
    '.vtt.SALT .vtt-arrow{position:absolute;width:8px;height:8px;background:var(--vtt-bg);' +
      'border:0 solid var(--vtt-faint);transform:rotate(45deg);}' +
    '.vtt.SALT[data-placement=top] .vtt-arrow{bottom:-4.5px;' +
      'border-right-width:1px;border-bottom-width:1px;}' +
    '.vtt.SALT[data-placement=bottom] .vtt-arrow{top:-4.5px;' +
      'border-left-width:1px;border-top-width:1px;}' +
    '.vtt.SALT[data-placement=left] .vtt-arrow{right:-4.5px;' +
      'border-top-width:1px;border-right-width:1px;}' +
    '.vtt.SALT[data-placement=right] .vtt-arrow{left:-4.5px;' +
      'border-bottom-width:1px;border-left-width:1px;}' +
    '.vtt.SALT :where(a,button,input,select,textarea):focus{outline:none;}' +
    '.vtt.SALT :where(a,button,input,select,textarea):focus-visible{' +
      'outline:2px solid var(--vtt-accent);outline-offset:1px;}' +
    '@media (prefers-reduced-motion:reduce){' +
      '.vtt.SALT,.vtt.SALT *{transition:none!important;animation:none!important;}' +
    '}';

  // Salt namespace — same defaults and semantics as the rest of the family:
  // 'vc1' (deterministic, matches dist/tooltip.css), or set Tooltip.salt to
  // your own token / false BEFORE the first tooltip is created.
  var DEFAULT_SALT = 'vc1';

  function saltToken() {
    var s = Tooltip.salt;
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
    // Insert before the page's own CSS so `.vtt { --vtt-* }` overrides win the cascade.
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
    if (autoThemed.length === 0) {
      var core = vcCore();
      if (core) core.theme.unwatch(refreshAutoThemes);
      if (ownMql) {
        if (ownMql.removeEventListener) ownMql.removeEventListener('change', refreshAutoThemes);
        else if (ownMql.removeListener) ownMql.removeListener(refreshAutoThemes);
      }
      if (ownObserver) { ownObserver.disconnect(); ownObserver = null; }
    }
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
    out.labels = {};
    for (k in defaults.labels) out.labels[k] = defaults.labels[k];
    if (options.labels) for (k in options.labels) out.labels[k] = options.labels[k];
    return out;
  }

  // SSR: `new Tooltip(…)` hands back one shared inert instance whose whole
  // API is a harmless no-op (same idea as the toast dummyHandle).
  var dummyInstance = null;

  function makeDummy() {
    if (dummyInstance) return dummyInstance;
    var d = { el: null, panel: null, isOpen: false, opts: {} };
    d.show = d.hide = d.toggle = d.update = d.destroy = function () { return d; };
    dummyInstance = d;
    return d;
  }

  /* ------------------------------------------------------------------ *
   * Tooltip.
   * ------------------------------------------------------------------ */

  function Tooltip(target, options) {
    if (!HAS_DOM) return makeDummy();
    var el = resolveElement(target);
    if (!el) throw new Error('Tooltip: target element not found: ' + target);

    var existing = instances && instances.get(el);
    if (existing) existing.destroy();

    this.el = el;
    this.opts = assignOptions({}, Tooltip.defaults, options || {});
    this.isOpen = false;
    this._timer = null;     // pending delayed show/hide
    this._outTimer = null;  // pending display:none after the out transition
    this._destroyed = false;

    if (this.opts.styles !== false) {
      if (window.VC && window.VC.injectStyles) window.VC.injectStyles(STYLE_ID, renderCss());
      else injectOwnStyles();
    }
    this._buildPanel();
    this._bind();
    this._applyTheme();
    if (this.opts.theme === 'auto') watchAutoTheme(this);
    if (instances) instances.set(el, this);
  }

  Tooltip.prototype = {
    constructor: Tooltip,

    /* ---------------- DOM construction ---------------- */

    _buildPanel: function () {
      var p = document.createElement('div');
      p.className = 'vtt' + saltClass() +
        (this.opts.interactive ? ' vtt-interactive' : '');
      p.id = 'vtt-' + (++uid);
      p.style.display = 'none';
      if (this.opts.trigger === 'click') {
        // Click popovers are disclosure-style content, not descriptions.
        p.setAttribute('role', 'group');
        p.setAttribute('aria-label', this.opts.labels.popover);
      } else {
        p.setAttribute('role', 'tooltip');
      }
      if (this.opts.arrow !== false) {
        var arrow = document.createElement('span');
        arrow.className = 'vtt-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        p.appendChild(arrow);
        this._arrow = arrow;
      } else {
        this._arrow = null;
      }
      var body = document.createElement('div');
      body.className = 'vtt-content';
      p.appendChild(body);
      this.panel = p;
      this._body = body;
    },

    // Content is TEXT by default (rendered with textContent); `html: true`
    // is an explicit opt-in for trusted markup. Function content is
    // re-resolved on every show.
    _renderContent: function () {
      var c = this.opts.content;
      if (typeof c === 'function') c = c(this.el);
      if (c && c.nodeType === 1) {
        this._body.innerHTML = '';
        this._body.appendChild(c);
      } else if (this.opts.html) {
        this._body.innerHTML = c == null ? '' : String(c);
      } else {
        this._body.textContent = c == null ? '' : String(c);
      }
    },

    /* ---------------- event wiring ---------------- */

    _bind: function () {
      var self = this;
      var el = this.el;
      var trig = this.opts.trigger;

      this._onEnter = function () { self._scheduleShow(); };
      this._onLeave = function (e) {
        // Moving into an interactive panel keeps it open.
        if (self.opts.interactive && e.relatedTarget &&
            self.panel.contains(e.relatedTarget)) return;
        self._scheduleHide();
      };
      this._onFocusIn = function () { self.show(); }; // no delay for keyboard users
      this._onFocusOut = function (e) {
        var to = e.relatedTarget;
        if (to && (el.contains(to) || self.panel.contains(to))) return;
        self.hide();
      };
      this._onClick = function () { self.toggle(); };
      this._onPanelEnter = function () { clearTimeout(self._timer); };
      this._onPanelLeave = function (e) {
        if (e.relatedTarget && el.contains(e.relatedTarget)) return;
        self._scheduleHide();
      };
      this._onDocPointer = function (e) {
        var path = e.composedPath ? e.composedPath() : [e.target];
        if (path.indexOf(self.panel) !== -1 || path.indexOf(el) !== -1) return;
        self.hide();
      };
      this._onDocKeydown = function (e) {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        e.stopPropagation();
        var refocus = self.opts.trigger === 'click';
        self.hide();
        if (refocus && el.focus) el.focus();
      };
      this._onWinScroll = function () { if (self.isOpen) self._position(); };

      if (trig === 'hover') {
        el.addEventListener('mouseenter', this._onEnter);
        el.addEventListener('mouseleave', this._onLeave);
        el.addEventListener('focusin', this._onFocusIn); // hover also shows on focus
        el.addEventListener('focusout', this._onFocusOut);
      } else if (trig === 'focus') {
        el.addEventListener('focusin', this._onFocusIn);
        el.addEventListener('focusout', this._onFocusOut);
      } else if (trig === 'click') {
        el.addEventListener('click', this._onClick);
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('aria-controls', this.panel.id);
      }
      // 'manual': nothing bound — show()/hide() only.

      if (this.opts.interactive) {
        this.panel.addEventListener('mouseenter', this._onPanelEnter);
        this.panel.addEventListener('mouseleave', this._onPanelLeave);
        if (trig === 'hover' || trig === 'focus') {
          this.panel.addEventListener('focusout', this._onFocusOut);
        }
      }
    },

    _delays: function () {
      var d = this.opts.delay;
      var base = this.opts.trigger === 'hover'
        ? { show: 80, hide: 120 } : { show: 0, hide: 0 };
      if (typeof d === 'number') return { show: d, hide: d };
      if (d && typeof d === 'object') {
        return {
          show: d.show != null ? +d.show : base.show,
          hide: d.hide != null ? +d.hide : base.hide
        };
      }
      return base;
    },

    _scheduleShow: function () {
      clearTimeout(this._timer);
      var self = this;
      var ms = this._delays().show;
      if (!ms) { this.show(); return; }
      this._timer = setTimeout(function () { self.show(); }, ms);
    },

    _scheduleHide: function () {
      clearTimeout(this._timer);
      var self = this;
      var ms = this._delays().hide;
      if (!ms) { this.hide(); return; }
      this._timer = setTimeout(function () { self.hide(); }, ms);
    },

    /* ---------------- theming ---------------- */

    _applyTheme: function () {
      var t = this.opts.theme;
      this.panel.setAttribute('data-theme',
        (t === 'light' || t === 'dark') ? t : resolveAutoTheme());
    },

    /* ---------------- positioning ---------------- */

    _position: function () {
      var panel = this.panel, anchor = this.el;
      var r = anchor.getBoundingClientRect();
      var pw = panel.offsetWidth, ph = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var gap = this.opts.offset == null ? 8 : +this.opts.offset;
      var pad = 8;
      var place = PLACEMENTS.indexOf(this.opts.placement) !== -1
        ? this.opts.placement : 'top';

      // Flip to the opposite side when there is no room but the other has it.
      if (place === 'top' && r.top < ph + gap && vh - r.bottom >= ph + gap) place = 'bottom';
      else if (place === 'bottom' && vh - r.bottom < ph + gap && r.top >= ph + gap) place = 'top';
      else if (place === 'left' && r.left < pw + gap && vw - r.right >= pw + gap) place = 'right';
      else if (place === 'right' && vw - r.right < pw + gap && r.left >= pw + gap) place = 'left';

      // Inside an open <dialog> the panel must ride in the top layer with the
      // dialog (fixed, viewport coordinates); otherwise absolute in the page.
      var fixed = !!(anchor.closest && anchor.closest('dialog'));
      var core = window.VC && typeof window.VC.position === 'function' ? window.VC : null;
      var top, left;

      if (place === 'top' || place === 'bottom') {
        if (core) {
          // Core owns the vertical decision (clamp, <dialog> detection); a
          // tooltip centers on its anchor, so the cross axis is set below.
          var res = core.position(panel, anchor, {
            prefer: place === 'bottom' ? 'below' : 'above', gap: gap, pad: pad
          });
          place = res.below ? 'bottom' : 'top';
          fixed = res.fixed;
          top = res.top;
        } else {
          top = place === 'bottom' ? r.bottom + gap : r.top - ph - gap;
        }
        left = Math.min(Math.max(pad, r.left + (r.width - pw) / 2),
          Math.max(pad, vw - pw - pad));
      } else {
        left = place === 'left' ? r.left - pw - gap : r.right + gap;
        top = Math.min(Math.max(pad, r.top + (r.height - ph) / 2),
          Math.max(pad, vh - ph - pad));
      }

      panel.style.position = fixed ? 'fixed' : 'absolute';
      panel.style.top = Math.round(top + (fixed ? 0 : window.scrollY)) + 'px';
      panel.style.left = Math.round(left + (fixed ? 0 : window.scrollX)) + 'px';
      panel.setAttribute('data-placement', place);

      // Keep the arrow pointed at the anchor even when the panel is clamped.
      if (this._arrow) {
        if (place === 'top' || place === 'bottom') {
          var ax = Math.min(Math.max(10, r.left + r.width / 2 - left), pw - 10);
          this._arrow.style.left = Math.round(ax - 4) + 'px';
          this._arrow.style.top = '';
        } else {
          var ay = Math.min(Math.max(10, r.top + r.height / 2 - top), ph - 10);
          this._arrow.style.top = Math.round(ay - 4) + 'px';
          this._arrow.style.left = '';
        }
      }
    },

    /* ---------------- ARIA plumbing ---------------- */

    // Append our id to any aria-describedby the page already set, and put
    // the original value back on hide.
    _addDescribedBy: function () {
      var cur = this.el.getAttribute('aria-describedby');
      this._prevDescribedBy = cur;
      var id = this.panel.id;
      if (!cur) this.el.setAttribute('aria-describedby', id);
      else if ((' ' + cur + ' ').indexOf(' ' + id + ' ') === -1) {
        this.el.setAttribute('aria-describedby', cur + ' ' + id);
      }
    },

    _removeDescribedBy: function () {
      if (this._prevDescribedBy) this.el.setAttribute('aria-describedby', this._prevDescribedBy);
      else this.el.removeAttribute('aria-describedby');
    },

    /* ---------------- public API ---------------- */

    show: function () {
      if (this._destroyed) return this;
      clearTimeout(this._timer);
      if (this.isOpen) return this;

      // If the anchor lives inside an open <dialog>, the panel must join it
      // in the top layer, otherwise a modal dialog renders above the popup.
      var host = this.el.closest ? this.el.closest('dialog') : null;
      var parent = host || document.body;
      if (this.panel.parentNode !== parent) parent.appendChild(this.panel);

      this._renderContent();
      this._applyTheme();
      clearTimeout(this._outTimer);
      this.panel.style.display = '';
      this._position();
      var panel = this.panel;
      requestAnimationFrame(function () { panel.classList.add('vtt-open'); });
      this.isOpen = true;

      if (this.opts.trigger === 'click') this.el.setAttribute('aria-expanded', 'true');
      else this._addDescribedBy();

      document.addEventListener('keydown', this._onDocKeydown);
      window.addEventListener('scroll', this._onWinScroll, true);
      window.addEventListener('resize', this._onWinScroll);
      if (this.opts.trigger === 'click') {
        document.addEventListener('pointerdown', this._onDocPointer, true);
      }
      if (this.opts.onShow) this.opts.onShow(this);
      return this;
    },

    hide: function () {
      clearTimeout(this._timer);
      if (!this.isOpen) return this;
      this.isOpen = false;

      document.removeEventListener('keydown', this._onDocKeydown);
      window.removeEventListener('scroll', this._onWinScroll, true);
      window.removeEventListener('resize', this._onWinScroll);
      document.removeEventListener('pointerdown', this._onDocPointer, true);

      if (this.opts.trigger === 'click') this.el.setAttribute('aria-expanded', 'false');
      else this._removeDescribedBy();

      this.panel.classList.remove('vtt-open');
      var panel = this.panel;
      clearTimeout(this._outTimer);
      this._outTimer = setTimeout(function () { panel.style.display = 'none'; }, OUT_MS);
      if (this.opts.onHide) this.opts.onHide(this);
      return this;
    },

    toggle: function () {
      return this.isOpen ? this.hide() : this.show();
    },

    update: function (content) {
      if (content !== undefined) this.opts.content = content;
      if (this.isOpen) {
        this._renderContent();
        this._position();
      }
      return this;
    },

    destroy: function () {
      if (this._destroyed) return this;
      this.hide();
      this._destroyed = true;
      clearTimeout(this._timer);
      clearTimeout(this._outTimer);
      unwatchAutoTheme(this);

      var el = this.el;
      el.removeEventListener('mouseenter', this._onEnter);
      el.removeEventListener('mouseleave', this._onLeave);
      el.removeEventListener('focusin', this._onFocusIn);
      el.removeEventListener('focusout', this._onFocusOut);
      el.removeEventListener('click', this._onClick);
      if (this.opts.trigger === 'click') {
        el.removeAttribute('aria-expanded');
        el.removeAttribute('aria-controls');
      }
      if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
      if (instances) instances.delete(el);
      return this;
    }
  };

  /* ------------------------------------------------------------------ *
   * Statics & auto-init.
   * ------------------------------------------------------------------ */

  Tooltip.version = VERSION;

  Tooltip.defaults = {
    content: '',          // string | fn(triggerEl) | DOM element
    placement: 'top',     // 'top' | 'bottom' | 'left' | 'right' (auto-flips)
    trigger: 'hover',     // 'hover' | 'click' | 'focus' | 'manual'
    delay: null,          // ms or {show, hide}; hover defaults to {show:80, hide:120}
    offset: 8,            // px gap between anchor and panel
    arrow: true,
    interactive: false,   // popover mode: stays open while hovered/focused
    html: false,          // content is TEXT by default; opt in for markup
    theme: 'auto',        // 'auto' | 'light' | 'dark'
    styles: true,         // false = headless, no CSS ever injected
    labels: { popover: 'Popover' },
    onShow: null,
    onHide: null
  };

  Tooltip.create = function (target, options) {
    return new Tooltip(target, options);
  };

  Tooltip.get = function (target) {
    if (!HAS_DOM) return null;
    var el = resolveElement(target);
    return (el && instances && instances.get(el)) || null;
  };

  function parseBool(v) {
    return v !== 'false' && v !== '0';
  }

  function dataOptions(el) {
    var d = el.dataset, o = {};
    o.content = el.getAttribute('data-vtt') || '';
    if (d.vttPlacement) o.placement = d.vttPlacement;
    if (d.vttTrigger) o.trigger = d.vttTrigger;
    if (d.vttInteractive != null) o.interactive = parseBool(d.vttInteractive);
    if (d.vttTheme) o.theme = d.vttTheme;
    if (d.vttDelay != null && d.vttDelay !== '') o.delay = +d.vttDelay;
    return o;
  }

  Tooltip.autoInit = function (root) {
    if (!HAS_DOM) return [];
    var els = (root || document).querySelectorAll('[data-vtt]');
    var created = [];
    for (var i = 0; i < els.length; i++) {
      if (instances && instances.get(els[i])) continue;
      try {
        created.push(new Tooltip(els[i], dataOptions(els[i])));
      } catch (err) {
        // One bad element must not abort init for the rest of the page.
        if (typeof console !== 'undefined') console.error('Tooltip auto-init:', err);
      }
    }
    return created;
  };

  if (HAS_DOM) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Tooltip.autoInit(); });
    } else {
      Tooltip.autoInit();
    }
  }

  /* ---- convergence contract ---- */
  Tooltip.salt = DEFAULT_SALT;
  try {
    // Live view: always rendered with the CURRENT salt.
    Object.defineProperty(Tooltip, 'css', {
      get: renderCss, enumerable: true, configurable: true
    });
  } catch (err) {
    Tooltip.css = renderCss();
  }
  Tooltip.displayName = 'Tooltip';
  Tooltip.rootClass = 'vtt';
  Tooltip.themeVars = {
    accent: '--vtt-accent',
    radius: '--vtt-radius',
    font: '--vtt-font'
  };
  // Where theme vars are DEFINED (unsalted on purpose) — VC.config() writes
  // its bridge overrides to these scopes so they apply in dark mode too.
  Tooltip.varScopes = ['.vtt', '.vtt[data-theme=dark]'];

  if (HAS_DOM && window.VC && typeof window.VC.register === 'function') {
    window.VC.register('tooltip', Tooltip);
  }

  return Tooltip;
});

}).call(__root);
var Tooltip = __root.Tooltip;
export { Tooltip };
export default Tooltip;
