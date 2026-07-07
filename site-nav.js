/*!
 * Vanilla UI Kit demo-site sidebar. Included by every component examples
 * page (<script src="../site-nav.js" defer></script>) so the pages connect
 * into one navigable docs site. Self-contained: injects its own styles,
 * follows the page theme, collapses off-canvas below 1100px.
 * Not part of the component library.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var COMPONENTS = [
    ['datepicker', 'Date picker'],
    ['toast', 'Toast'],
    ['tooltip', 'Tooltip'],
    ['menu', 'Menu'],
    ['modal', 'Modal'],
    ['tabs', 'Tabs'],
    ['select', 'Select'],
    ['command', 'Command palette'],
    ['form', 'Form'],
    ['phone', 'Phone input'],
    ['drawer', 'Drawer'],
    ['autocomplete', 'Autocomplete'],
    ['slider', 'Slider'],
    ['popconfirm', 'Popconfirm'],
    ['segmented', 'Segmented'],
    ['upload', 'Upload'],
    ['number', 'Number input'],
    ['progress', 'Progress'],
    ['pagination', 'Pagination'],
    ['empty', 'Empty state'],
    ['rating', 'Rating']
  ];

  var CSS = '' +
    ':root{--vkn-bg:#ffffff;--vkn-text:#1c1d21;--vkn-muted:#72747e;--vkn-faint:#e7e7ec;' +
      '--vkn-accent:#5b5bd6;--vkn-hover:#f4f4f8;}' +
    'html[data-theme=dark]{--vkn-bg:#16171d;--vkn-text:#e9eaf0;--vkn-muted:#989aa6;' +
      '--vkn-faint:#31343f;--vkn-accent:#7b7bea;--vkn-hover:#22242d;}' +
    '@media (prefers-color-scheme:dark){html:not([data-theme=light]){--vkn-bg:#16171d;' +
      '--vkn-text:#e9eaf0;--vkn-muted:#989aa6;--vkn-faint:#31343f;--vkn-accent:#7b7bea;' +
      '--vkn-hover:#22242d;}}' +
    '.vkn{position:fixed;top:0;left:0;bottom:0;width:250px;box-sizing:border-box;' +
      'background:var(--vkn-bg);border-right:1px solid var(--vkn-faint);z-index:9000;' +
      'overflow-y:auto;padding:20px 14px 28px;' +
      'font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
      'color:var(--vkn-text);}' +
    '.vkn a{display:block;color:inherit;text-decoration:none;border-radius:8px;' +
      'padding:5px 10px;margin:1px 0;}' +
    '.vkn a:hover{background:var(--vkn-hover);}' +
    '.vkn a:focus-visible{outline:2px solid var(--vkn-accent);outline-offset:1px;}' +
    '.vkn a[aria-current=page]{background:var(--vkn-hover);color:var(--vkn-accent);' +
      'font-weight:650;}' +
    '.vkn-brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:15px;' +
      'padding:4px 10px 14px;}' +
    '.vkn-brand svg{flex:none;border-radius:7px;}' +
    '.vkn-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;' +
      'color:var(--vkn-muted);padding:14px 10px 4px;}' +
    '.vkn-theme{display:flex;gap:4px;padding:2px 10px 6px;}' +
    '.vkn-theme button{flex:1;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;' +
      'padding:5px 0;border-radius:8px;border:1px solid var(--vkn-faint);' +
      'background:transparent;color:var(--vkn-muted);}' +
    '.vkn-theme button:hover{background:var(--vkn-hover);}' +
    '.vkn-theme button:focus-visible{outline:2px solid var(--vkn-accent);outline-offset:1px;}' +
    '.vkn-theme button[aria-pressed=true]{color:var(--vkn-accent);border-color:var(--vkn-accent);' +
      'background:var(--vkn-hover);}' +
    '.vkn-toggle{position:fixed;top:14px;left:14px;z-index:9002;display:none;' +
      'align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;' +
      'border:1px solid var(--vkn-faint);background:var(--vkn-bg);color:var(--vkn-text);' +
      'cursor:pointer;font-size:18px;line-height:1;}' +
    '.vkn-toggle:focus-visible{outline:2px solid var(--vkn-accent);outline-offset:1px;}' +
    '.vkn-scrim{position:fixed;inset:0;background:rgba(16,17,23,.45);z-index:8999;' +
      'opacity:0;pointer-events:none;transition:opacity .18s ease;}' +
    'body{margin-left:250px;}' +
    '@media (max-width:1099px){' +
      'body{margin-left:0;}' +
      '.vkn{transform:translateX(-100%);transition:transform .2s ease;}' +
      '.vkn.vkn-open{transform:none;box-shadow:0 10px 40px rgba(0,0,0,.25);}' +
      '.vkn-toggle{display:flex;}' +
      '.vkn-scrim.vkn-open{opacity:1;pointer-events:auto;}' +
    '}' +
    '@media (prefers-reduced-motion:reduce){.vkn,.vkn-scrim{transition:none;}}';

  // Examples pages live at <dir>/examples.html — everything else is one up.
  var parts = location.pathname.split('/');
  var current = parts[parts.length - 2] || '';
  var up = '../';

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var nav = document.createElement('nav');
  nav.className = 'vkn';
  nav.id = 'vkn-sidebar';
  nav.setAttribute('aria-label', 'Vanilla UI Kit pages');

  function link(href, label, isCurrent) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (isCurrent) a.setAttribute('aria-current', 'page');
    return a;
  }

  var brand = document.createElement('a');
  brand.className = 'vkn-brand';
  brand.href = up;
  brand.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect width="32" height="32" rx="7" fill="#5b5bd6"/>' +
    '<path d="M8 9l8 15 8-15h-5l-3 6.5L13 9z" fill="#fff"/></svg>' +
    '<span>Vanilla UI Kit</span>';
  nav.appendChild(brand);

  var h1 = document.createElement('div');
  h1.className = 'vkn-h';
  h1.textContent = 'Components';
  nav.appendChild(h1);
  for (var i = 0; i < COMPONENTS.length; i++) {
    nav.appendChild(link(
      up + COMPONENTS[i][0] + '/examples.html',
      COMPONENTS[i][1],
      COMPONENTS[i][0] === current
    ));
  }

  var h2 = document.createElement('div');
  h2.className = 'vkn-h';
  h2.textContent = 'More';
  nav.appendChild(h2);
  nav.appendChild(link(up, 'Home'));
  nav.appendChild(link(up + 'install.html', 'Installation'));
  nav.appendChild(link(up + 'theme.html', 'Theme builder'));
  nav.appendChild(link(up + 'demo/admin.html', 'Demo app'));
  nav.appendChild(link('https://github.com/vanilla-ui-kit/components', 'GitHub'));

  // Theme — persisted in localStorage ('vuk-theme'); the head snippet on
  // every page applies it before first paint.
  var h3 = document.createElement('div');
  h3.className = 'vkn-h';
  h3.textContent = 'Theme';
  nav.appendChild(h3);
  var themeRow = document.createElement('div');
  themeRow.className = 'vkn-theme';
  themeRow.setAttribute('role', 'group');
  themeRow.setAttribute('aria-label', 'Color theme');
  var MODES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];

  function storedTheme() {
    try { var t = localStorage.getItem('vuk-theme'); return t === 'dark' || t === 'light' ? t : 'auto'; }
    catch (e) { return 'auto'; }
  }
  function applyStoredThemeState() {
    var active = storedTheme();
    var btns = themeRow.children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-mode') === active));
    }
  }
  function setTheme(mode) {
    var d = document.documentElement;
    try {
      if (mode === 'auto') { localStorage.removeItem('vuk-theme'); d.removeAttribute('data-theme'); }
      else { localStorage.setItem('vuk-theme', mode); d.setAttribute('data-theme', mode); }
    } catch (e) { /* private mode: still apply for this page */
      if (mode === 'auto') d.removeAttribute('data-theme');
      else d.setAttribute('data-theme', mode);
    }
    applyStoredThemeState();
  }
  for (var m = 0; m < MODES.length; m++) {
    (function (mode, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('data-mode', mode);
      b.addEventListener('click', function () { setTheme(mode); });
      themeRow.appendChild(b);
    })(MODES[m][0], MODES[m][1]);
  }
  nav.appendChild(themeRow);
  applyStoredThemeState();

  var scrim = document.createElement('div');
  scrim.className = 'vkn-scrim';

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'vkn-toggle';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'vkn-sidebar');
  toggle.textContent = '☰';

  function setOpen(open) {
    nav.classList.toggle('vkn-open', open);
    scrim.classList.toggle('vkn-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('vkn-open'));
  });
  scrim.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('vkn-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.body.appendChild(nav);
  document.body.appendChild(scrim);
  document.body.appendChild(toggle);
})();
