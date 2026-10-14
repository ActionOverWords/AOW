#!/usr/bin/env node
/*!
 * ActionOverWords: IndexNow submitter
 * ------------------------------------------------------------------------
 * Tells Bing and the other IndexNow search engines (Yandex, Naver, Seznam, Yep, Amazon) which pages changed, so
 * new and updated pages are picked up within minutes instead of whenever a crawler comes back. Bing's index also
 * feeds Yahoo and DuckDuckGo. Google does not use IndexNow; it learns about changes from sitemap.xml and
 * Search Console.
 *
 * What it sends: only URLs from this site's own sitemap.xml whose <lastmod> is new or different, plus pages that
 * were removed. Nothing else leaves the repo. The key is public by design (it only proves you control the site);
 * there are no secrets and no npm packages.
 *
 *   node tools/indexnow.js prepare [--all] [--before <git-ref>]
 *        Compare sitemap.xml in the working tree with the one at <git-ref> (default HEAD~1) and write the list of
 *        added / changed / removed URLs to a temp file. --all lists every URL in the sitemap instead.
 *   node tools/indexnow.js submit [--wait] [--dry-run]
 *        Send that list. --wait first polls the live site until it serves the new sitemap and the key file (a
 *        GitHub Pages deploy takes a minute or two), so engines never fetch a page that is not live yet.
 *   node tools/indexnow.js check
 *        Verify the key file exists in the repo and answers on the live site.
 *
 * Options: --root . --site https://action-over-words.com --list <file> --endpoint <url> --live-sitemap <url>
 *          --wait-max <seconds> --wait-every <seconds> --settle <seconds>
 * The key file is a file in the repo root named <key>.txt whose only content is <key>. Remove it (or the workflow
 * .github/workflows/indexnow.yml) and this feature simply stays off.
 * Requires Node 18+ (global fetch).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const argv = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(argv.root || process.cwd());
const SITE = String(argv.site || 'https://action-over-words.com').replace(/\/+$/, '');
const ENDPOINT = String(argv.endpoint || 'https://api.indexnow.org/indexnow');
const LIVE_SITEMAP = String(argv['live-sitemap'] || SITE + '/sitemap.xml');
const LIST = path.resolve(argv.list || path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'indexnow-urls.json'));
const IN_CI = !!process.env.GITHUB_ACTIONS;
const BATCH = 10000;                                   // IndexNow accepts up to 10,000 URLs per request

function parseArgs(a) {
  const o = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) { o._.push(a[i]); continue; }
    const k = a[i].slice(2);
    if (a[i + 1] === undefined || a[i + 1].startsWith('--')) o[k] = true; else o[k] = a[++i];
  }
  return o;
}
const log = m => console.log(m);
const warn = m => console.warn((IN_CI ? '::warning::' : 'WARN: ') + m);
function fail(m) { console.error((IN_CI ? '::error::' : 'ERROR: ') + m); process.exit(1); }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const nl = s => String(s).replace(/\r\n/g, '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');

// url -> lastmod
function parseSitemap(xml) {
  const m = new Map();
  for (const x of String(xml).matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g)) m.set(decode(x[1].trim()), (x[2] || '').trim());
  return m;
}

// The key file: <key>.txt in the repo root, containing exactly the key (8 to 128 letters, digits or hyphens).
function findKey(root) {
  const names = fs.readdirSync(root).filter(f => /^[A-Za-z0-9-]{8,128}\.txt$/.test(f)).sort();
  for (const f of names) {
    const key = f.slice(0, -4);
    if (fs.readFileSync(path.join(root, f), 'utf8').trim() === key) return { key, file: f };
  }
  return null;
}

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'aow-indexnow/1.0 (+' + SITE + '/)' }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, body: await r.text() };
}

/* -------------------------------- prepare -------------------------------- */
function prepare() {
  const file = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(file)) fail('sitemap.xml not found under ' + ROOT);
  const cur = parseSitemap(fs.readFileSync(file, 'utf8'));
  if (!cur.size) fail('sitemap.xml lists no URLs; refusing to continue.');
  let added = [], changed = [], removed = [], mode;
  if (argv.all) { added = [...cur.keys()]; mode = 'every URL in the sitemap'; }
  else {
    const before = String(argv.before || 'HEAD~1');
    if (!/^(?:[0-9a-fA-F]{7,40}|HEAD(?:~\d{1,3})?)$/.test(before)) fail('Unsafe --before value: ' + before);
    let prevXml = null;
    try { prevXml = execFileSync('git', ['show', `${before}:sitemap.xml`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20 * 1024 * 1024 }); } catch (e) { /* handled below */ }
    if (prevXml === null) { warn(`Could not read sitemap.xml at ${before}; listing every URL instead.`); added = [...cur.keys()]; mode = 'every URL in the sitemap (earlier sitemap not readable)'; }
    else {
      const prev = parseSitemap(prevXml);
      cur.forEach((lm, u) => { if (!prev.has(u)) added.push(u); else if (prev.get(u) !== lm) changed.push(u); });
      prev.forEach((_, u) => { if (!cur.has(u)) removed.push(u); });
      mode = 'changes since ' + before;
    }
  }
  fs.mkdirSync(path.dirname(LIST), { recursive: true });
  fs.writeFileSync(LIST, JSON.stringify({ site: SITE, added, changed, removed }, null, 1));
  log(`IndexNow list (${mode}): ${added.length} added, ${changed.length} changed, ${removed.length} removed.`);
  [...added, ...changed, ...removed].slice(0, 12).forEach(u => log('  ' + u));
  if (added.length + changed.length + removed.length > 12) log('  ...');
}

/* --------------------------------- submit -------------------------------- */
async function liveMatches(want, kf) {
  try {
    const bust = u => u + (u.includes('?') ? '&' : '?') + 'nocache=' + Date.now();      // skip the CDN's cached copy
    const a = await fetchText(bust(LIVE_SITEMAP));
    if (a.status !== 200 || sha(nl(a.body)) !== want) return false;
    const b = await fetchText(bust(SITE + '/' + kf.file));
    return b.status === 200 && b.body.trim() === kf.key;
  } catch (e) { return false; }
}
async function waitForLive(kf) {
  const maxMs = Number(argv['wait-max'] === undefined ? 480 : argv['wait-max']) * 1000;
  const every = Number(argv['wait-every'] === undefined ? 15 : argv['wait-every']) * 1000;
  const settle = Number(argv.settle === undefined ? 20 : argv.settle) * 1000;
  const want = sha(nl(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8')));
  const t0 = Date.now();
  for (;;) {
    if (await liveMatches(want, kf)) { log('The live site serves the new sitemap and the key file.'); if (settle) await sleep(settle); return; }
    if (Date.now() - t0 > maxMs) { warn('The live site did not show the new sitemap within the wait window; submitting anyway.'); return; }
    await sleep(every);
  }
}
const MEANING = {
  200: 'submitted', 202: 'accepted (the engine checks the key file when it fetches your pages)',
  400: 'bad request', 403: 'the key was not accepted (is <key>.txt live at the site root, and does it contain exactly the key?)',
  422: 'the URLs do not belong to the host, or the key does not match', 429: 'too many requests; try again later'
};
async function post(kf, urls) {
  const payload = { host: new URL(SITE).host, key: kf.key, keyLocation: SITE + '/' + kf.file, urlList: urls };
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'user-agent': 'aow-indexnow/1.0' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
      const text = (await r.text()).slice(0, 300);
      if (r.status >= 500 && attempt < 3) { await sleep(attempt * 3000); continue; }
      return { status: r.status, text };
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(attempt * 3000);
    }
  }
}
async function submit() {
  if (!fs.existsSync(LIST)) { log('No URL list found (run "prepare" first). Nothing to submit.'); return; }
  const j = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const all = [...new Set([...(j.added || []), ...(j.changed || []), ...(j.removed || [])])];
  const urls = all.filter(u => u.startsWith(SITE + '/'));
  if (urls.length !== all.length) warn(`${all.length - urls.length} URL(s) outside ${SITE} were skipped.`);
  if (!urls.length) { log('Nothing changed, so nothing to submit.'); return; }
  const kf = findKey(ROOT);
  if (!kf) { log('No IndexNow key file in the repo root (a file named <key>.txt whose only content is the key). Skipping.'); return; }
  if (argv['dry-run']) { log(`Dry run: would send ${urls.length} URL(s) to ${ENDPOINT} with key file ${kf.file}.`); urls.forEach(u => log('  ' + u)); return; }
  if (argv.wait) await waitForLive(kf);
  let bad = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    const r = await post(kf, chunk);
    const ok = r.status === 200 || r.status === 202;
    log(`IndexNow: ${chunk.length} URL(s) -> HTTP ${r.status} ${MEANING[r.status] || ''}${ok || !r.text ? '' : ' | ' + r.text}`);
    if (!ok) bad++;
  }
  if (bad) fail('IndexNow did not accept the submission (see above). This does not affect the site.');
}

/* ---------------------------------- check -------------------------------- */
async function check() {
  const kf = findKey(ROOT);
  if (!kf) fail('No key file found: expected <key>.txt in the repo root, containing only the key.');
  log(`Key file in the repo: ${kf.file}`);
  const r = await fetchText(SITE + '/' + kf.file);
  if (r.status === 200 && r.body.trim() === kf.key) log(`OK: ${SITE}/${kf.file} serves the key.`);
  else fail(`${SITE}/${kf.file} answered HTTP ${r.status}${r.status === 200 ? ' but the content does not match the key' : ''}. Upload the key file and wait for the site to deploy.`);
}

const commands = { prepare: async () => prepare(), submit, check };
const run = commands[argv._[0]];
if (!run) fail('Usage: node tools/indexnow.js prepare [--all] [--before <ref>] | submit [--wait] [--dry-run] | check');
run().catch(e => fail(e && e.message ? e.message : String(e)));
