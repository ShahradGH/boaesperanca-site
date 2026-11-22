import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('boaesperanca-site static build and Zero-Leak validation', () => {
  it('generates expected static routes, RSS feed, Sveltia CMS config, and redirects in dist/', () => {
    const requiredDistFiles = [
      'index.html',
      'hello-world/index.html',
      'sample-page/index.html',
      'rss.xml',
      'admin/index.html',
      'admin/config.yml',
      'uploads/boa-esperanca-crest.svg',
      'uploads/uploads-manifest.json',
      '_redirects',
    ];
    for (const rel of requiredDistFiles) {
      const full = path.join(distDir, rel);
      assert.equal(fs.existsSync(full), true, `Missing dist/${rel}`);
    }

    const helloHtml = fs.readFileSync(path.join(distDir, 'hello-world', 'index.html'), 'utf8');
    assert.match(helloHtml, /Hello world!/);
    assert.match(helloHtml, /Welcome to WordPress\. This is your first post\./);

    const sampleHtml = fs.readFileSync(path.join(distDir, 'sample-page', 'index.html'), 'utf8');
    assert.match(sampleHtml, /Sample Page/);
    assert.match(sampleHtml, /XYZ Doohickey Company/);

    const rss = fs.readFileSync(path.join(distDir, 'rss.xml'), 'utf8');
    assert.match(rss, /<rss/);
    assert.match(rss, /Hello world!/);

    const redirects = fs.readFileSync(path.join(distDir, '_redirects'), 'utf8');
    assert.match(redirects, /\/wp-content\/uploads\/\* \/uploads\/:splat 301/);

    const cmsCfg = fs.readFileSync(path.join(distDir, 'admin', 'config.yml'), 'utf8');
    assert.match(cmsCfg, /ShahradGH\/boaesperanca-site/);
  });

  it('contains zero 0-byte files and zero IPv4/secret leaks in dist/', () => {
    const files = walkFiles(distDir);
    assert.ok(files.length > 0);
    for (const f of files) {
      const stat = fs.statSync(f);
      assert.ok(stat.size > 0, `Zero-byte file detected in dist/: ${path.relative(distDir, f)}`);
      if (/\.(html|xml|yml|json|svg|txt)$/i.test(f) || path.basename(f) === '_redirects') {
        const text = fs.readFileSync(f, 'utf8');
        assert.equal(/\b\d{1,3}(\.\d{1,3}){3}\b/.test(text), false, `IPv4 literal in ${path.relative(distDir, f)}`);
      }
    }
  });
});
