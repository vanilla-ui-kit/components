#!/usr/bin/env node
/*
 * Minifies the dist bundles and writes SRI hashes. Run via `npm run build:min`
 * AFTER `npm run build`. Needs network once per terser version (npx cache).
 *
 *   dist/vanilla-ui-kit.min.js       minified UMD bundle
 *   dist/esm/vanilla-ui-kit.min.js   minified ESM bundle
 *   dist/vanilla-ui-kit.min.css      minified combined stylesheet
 *   dist/sri.json                    sha384 integrity hashes for every dist file
 *
 * terser is pinned to an exact version so output is byte-stable across
 * machines and Node versions — CI diffs dist/ against a fresh build.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var execFileSync = require('child_process').execFileSync;

var TERSER = 'terser@5.44.0';
var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');

function terser(input, output, moduleMode) {
  var args = ['-y', TERSER, input,
    '--compress', 'passes=2', '--mangle',
    '--comments', '/^!/',
    '-o', output];
  if (moduleMode) args.push('--module');
  execFileSync('npx', args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
}

terser(path.join(DIST, 'vanilla-ui-kit.js'), path.join(DIST, 'vanilla-ui-kit.min.js'), false);
terser(path.join(DIST, 'esm', 'vanilla-ui-kit.js'), path.join(DIST, 'esm', 'vanilla-ui-kit.min.js'), true);

// CSS: safe structural minify — strip comments (keep /*!), collapse whitespace.
var css = fs.readFileSync(path.join(DIST, 'vanilla-ui-kit.css'), 'utf8');
var minCss = css
  .replace(/\/\*(?!!)[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/ ?([{}:;,]) ?/g, '$1')
  .replace(/;}/g, '}')
  .trim() + '\n';
fs.writeFileSync(path.join(DIST, 'vanilla-ui-kit.min.css'), minCss);

// SRI hashes for everything in dist/ (stable key order).
var sri = {};
function walk(dir, prefix) {
  fs.readdirSync(dir).sort().forEach(function (name) {
    if (name === 'sri.json') return;
    var full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) return walk(full, prefix + name + '/');
    var hash = crypto.createHash('sha384').update(fs.readFileSync(full)).digest('base64');
    sri[prefix + name] = 'sha384-' + hash;
  });
}
walk(DIST, '');
fs.writeFileSync(path.join(DIST, 'sri.json'), JSON.stringify(sri, null, 2) + '\n');

['vanilla-ui-kit.min.js', 'esm/vanilla-ui-kit.min.js', 'vanilla-ui-kit.min.css'].forEach(function (f) {
  console.log('  dist/' + f + '  (' + fs.statSync(path.join(DIST, f)).size + ' bytes)');
});
console.log('  dist/sri.json  (' + Object.keys(sri).length + ' hashes)');
console.log('Minify complete.');
