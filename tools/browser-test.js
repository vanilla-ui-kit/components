#!/usr/bin/env node
/*
 * Browser smoke tests + accessibility audit for every page on the demo site.
 * Would have caught the theme-watcher freeze before it shipped — that's the
 * bar: a real Chromium loads every page and proves it renders, settles, and
 * stays quiet on the console.
 *
 * Per page:
 *   - loads with a hard timeout (a hang = frozen main thread = failure)
 *   - fails on any pageerror or console.error (allowlist below)
 *   - asserts the page actually rendered (body has content)
 *   - runs axe-core: violations with impact "critical" fail; "serious" warn
 *
 * Needs: puppeteer-core (npm i --no-save puppeteer-core) and a Chrome binary
 * via CHROME_BIN, or the Playwright cache path used by this repo's dev boxes.
 * axe-core is fetched once from jsDelivr at a pinned version (skipped with a
 * warning when offline — the smoke assertions still run).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const AXE_VERSION = '4.10.2';
const AXE_URL = `https://cdn.jsdelivr.net/npm/axe-core@${AXE_VERSION}/axe.min.js`;
const PAGE_TIMEOUT_MS = 20000;
const SETTLE_MS = 700;

const ALLOWED_CONSOLE = [
  /DatePicker: invalid locale/ // benign environment-locale notice
];

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  const pw = '/opt/pw-browsers';
  if (fs.existsSync(pw)) {
    for (const dir of fs.readdirSync(pw)) {
      const bin = path.join(pw, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  }
  throw new Error('No Chrome binary found. Set CHROME_BIN.');
}

function collectPages() {
  const pages = ['index.html', 'theme.html', 'demo/admin.html'].filter((p) =>
    fs.existsSync(path.join(ROOT, p))
  );
  for (const entry of fs.readdirSync(ROOT)) {
    const ex = path.join(entry, 'examples.html');
    if (fs.existsSync(path.join(ROOT, ex))) pages.push(ex);
  }
  return pages;
}

function serve() {
  const types = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.normalize(path.join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        file = path.join(file, 'index.html');
      }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function fetchAxe() {
  return new Promise((resolve) => {
    https.get(AXE_URL, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const puppeteer = require('puppeteer-core');
  const chrome = findChrome();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const axeSource = await fetchAxe();
  if (!axeSource) {
    console.warn('WARN axe-core unavailable (offline?) — accessibility audit skipped this run.');
  }

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const pages = collectPages();
  const failures = [];
  let seriousWarnings = 0;

  for (const rel of pages) {
    const url = `${base}/${rel}`;
    const page = await browser.newPage();
    const problems = [];

    page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (ALLOWED_CONSOLE.some((re) => re.test(text))) return;
      // Chrome's automatic favicon probe isn't the page's fault.
      if (/favicon\.ico/.test((msg.location() || {}).url || '') ||
          (/Failed to load resource/.test(text) && /favicon/.test((msg.location() || {}).url || ''))) return;
      problems.push(`console.error: ${text}`);
    });

    try {
      await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
      // A frozen main thread can't run this evaluate — the timeout catches it.
      await page.evaluate(
        (ms) => new Promise((r) => setTimeout(r, ms)),
        SETTLE_MS
      );
      const rendered = await page.evaluate(
        () => document.body && document.body.children.length > 0
      );
      if (!rendered) problems.push('body rendered no content');

      if (axeSource) {
        await page.evaluate(axeSource);
        const results = await page.evaluate(() =>
          window.axe.run(document, { resultTypes: ['violations'] })
        );
        for (const v of results.violations) {
          const line = `axe ${v.impact}: ${v.id} (${v.nodes.length} nodes) — ${v.help}`;
          if (v.impact === 'critical') problems.push(line);
          else if (v.impact === 'serious') { seriousWarnings++; console.warn(`  warn ${rel}: ${line}`); }
        }
      }
    } catch (err) {
      problems.push(`load failed or main thread frozen: ${err.message}`);
    }

    if (problems.length) {
      failures.push({ page: rel, problems });
      console.error(`FAIL ${rel}`);
      for (const p of problems) console.error(`     ${p}`);
    } else {
      console.log(` ok  ${rel}`);
    }
    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`\n${pages.length} pages, ${failures.length} failing, ${seriousWarnings} serious a11y warnings.`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
