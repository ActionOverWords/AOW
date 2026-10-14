#!/usr/bin/env node
/*!
 * ActionOverWords — static page generator
 * ------------------------------------------------------------------------
 * Reads the SAME data files the live site renders from (data.js + data/**) and
 * writes crawlable, script-free HTML pages:
 *
 *   index.html                  the home page at the bare domain (only once index.html carries the marker;
 *                               until then the existing redirect stub is left alone)
 *   officials/<id>/index.html   one page per person with qualifying promises
 *   officials/index.html        directory of those people
 *   methodology/index.html      how promises are sourced, rated and scored (fixed text)
 *   administration/index.html   hub: the current administration's officials who have pages
 *   congress/senate/, congress/house/, states/<state>/
 *                               hubs, written only once a group has --hub-min (default 3)
 *                               people with pages, so no thin or empty hub is ever published
 *   sitemap.xml                 honest <lastmod> values (see tools/pages-manifest.json)
 *   robots.txt                  only if absent, or previously generated
 *   tools/pages-manifest.json   content hashes -> lastmod dates (committed)
 *   tools/pages-report.txt      what was published and what was held back, and why
 *
 * Nothing existing is edited. Every generated file carries a marker; the script
 * refuses to overwrite or delete anything that does not.
 *
 * Usage:  node tools/build-pages.js [--root .] [--site https://action-over-words.com]
 *                                   [--min-publishers 3] [--hub-min 3] [--today YYYY-MM-DD]
 *                                   [--allow-shrink]
 * Requires Node 18+. No npm install, no network access, no secrets.
 * (tools/indexnow.js is a separate script: it tells Bing and the other IndexNow engines which URLs changed.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

/* ------------------------------ configuration ------------------------------ */
const argv = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(argv.root || process.cwd());
const SITE = String(argv.site || 'https://action-over-words.com').replace(/\/+$/, '');
const MIN_PUBLISHERS = Number(argv['min-publishers'] === undefined ? 3 : argv['min-publishers']);
const HUB_MIN = Number(argv['hub-min'] === undefined ? 3 : argv['hub-min']);
const TODAY = String(argv.today || new Date().toISOString().slice(0, 10));
const CONTACT = 'info@action-over-words.com';
const MARK = '<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->';
const IN_CI = !!process.env.GITHUB_ACTIONS;

const STATUS = {
  not_started: 'Not started', in_progress: 'In progress', stalled: 'Stalled',
  compromise: 'Compromise', completed: 'Completed', broken: 'Broken'
};
const WEIGHTS = { completed: 100, compromise: 60, in_progress: 40, stalled: 15, not_started: 0, broken: 0 };
const SRC_TYPE = {
  campaign_statement: 'Campaign statement', interview: 'Interview', voting_record: 'Voting record',
  official_record: 'Official record', self_published_report: "Official's own office", news_report: 'News report'
};
const PRIMARY_TYPES = new Set(['official_record', 'voting_record', 'self_published_report']);
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico', GU: 'Guam', AS: 'American Samoa', VI: 'U.S. Virgin Islands', MP: 'Northern Mariana Islands'
};
const RANK = { current: 0, past: 1, archive: 2, prior: 3 };

// "Home" means the landing page at the bare domain once index.html is generated (it carries the marker);
// until then the bare domain is the old redirect stub and "Home" means the interactive tracker.
let HOME_LANDING = false;
const homeHref = up => (HOME_LANDING ? (up || './') : up + 'aow-index.html');
const homeUrl = () => SITE + (HOME_LANDING ? '/' : '/aow-index.html');
// Site-level JSON-LD, identical to the head of aow-index.html (same @id values), so the two pages describe one entity.
const SITE_DESC = 'See what elected officials promised and what happened. Promises are rated from Completed to Broken, with sources. 700+ federal and state officials.';
const SITE_LD = [
  { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'ActionOverWords Index', alternateName: ['AOW Index', 'Action Over Words'],
    description: SITE_DESC, inLanguage: 'en-US', publisher: { '@id': SITE + '/#organization' } },
  { '@type': 'Organization', '@id': SITE + '/#organization', name: 'ActionOverWords Index', url: SITE + '/',
    logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png', width: 512, height: 512 }, email: CONTACT }
];

/* --------------------------------- helpers --------------------------------- */
function parseArgs(a) {
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2);
    if (a[i + 1] === undefined || a[i + 1].startsWith('--')) o[k] = true; else o[k] = a[++i];
  }
  return o;
}
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const partyLabel = p => (p === 'D' ? 'Democrat' : p === 'R' ? 'Republican' : p === 'NP' ? 'Nonpartisan' : 'Independent');
const partyKey = p => (p === 'D' ? 'd' : p === 'R' ? 'r' : p === 'NP' ? 'np' : 'i');
const jsonLd = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const warnings = [];
function warn(msg) { warnings.push(msg); console.warn((IN_CI ? '::warning::' : 'WARN: ') + msg); }
function fatal(msg) { console.error((IN_CI ? '::error::' : 'ERROR: ') + msg); process.exit(1); }
function safeUrl(u) {
  try {
    const s = String(u || '').trim();
    const x = new URL(s);
    return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname ? s : null;
  } catch (e) { return null; }
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content);
  return true;
}
function isOurs(file) { return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('aow-generated'); }
const slugOf = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Structural groups an official belongs to: where they serve. Never party, never score, so every
// hub and every "More from ..." list is neutral by construction.
function groupKeysOf(e) {
  const keys = [];
  if (!e || e.kind !== 'current') return keys;
  if (e.state === 'US') return ['administration'];
  if (/^Senate( ·|$)/.test(e.seat)) keys.push('congress/senate');
  else if (/^House( ·|$)/.test(e.seat)) keys.push('congress/house');
  if (STATE_NAMES[e.state]) keys.push('states/' + slugOf(STATE_NAMES[e.state]));
  return keys;
}
// Inside the administration: ids are cab-* (Cabinet and senior White House officials) and agh-*
// (sub-Cabinet law-enforcement and agency heads); the President and Vice President are 'Executive'.
function adminGroupOf(e) { return /^agh-/.test(e.id) ? 'agency' : e.chamber === 'Executive' ? 'leadership' : 'cabinet'; }

/* ------------------------------ load the dataset ---------------------------- */
function loadDataset() {
  const dataJs = path.join(ROOT, 'data.js');
  if (!fs.existsSync(dataJs)) fatal('data.js not found under ' + ROOT + ' (run from the repo root, or pass --root).');
  const ctx = vm.createContext({});          // data files are pure data; no DOM, no network, no require
  const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f, timeout: 5000 });
  run(dataJs);
  const files = fs.existsSync(path.join(ROOT, 'data')) ? walk(path.join(ROOT, 'data')).filter(f => f.endsWith('.js')).sort() : [];
  files.forEach(run);
  const D = vm.runInContext('({DEFAULT_MEMBERS,DEFAULT_PROMISES,PAST_ADMINISTRATIONS,PAST_PROMISES,ARCHIVE,ARCHIVE_PROMISES,PERSON_LINKS,PRIOR_ROLES})', ctx);
  const hash = sha([dataJs, ...files].map(f => fs.readFileSync(f, 'utf8')).join('\u0000'));
  return { D, hash, fileCount: files.length + 1 };
}

/* ------------------------- people, links, promises -------------------------- */
function buildModel(D) {
  const entries = new Map();
  const add = (e, kind, extra) => {
    if (!e || !e.id) return;
    if (entries.has(e.id)) fatal('Duplicate id in data: ' + e.id);
    entries.set(e.id, Object.assign({ id: e.id, name: e.name, seat: e.seat || '', party: e.party || '', kind, order: entries.size,
      state: e.state || '', termStart: e.termStart || '', years: e.years || '', chamber: e.chamber || '' }, extra || {}));
  };
  D.DEFAULT_MEMBERS.forEach(m => add(m, 'current'));
  D.PAST_ADMINISTRATIONS.forEach(a => (a.people || []).forEach(p => add(p, 'past', { adminLabel: a.label, years: a.years })));
  D.ARCHIVE.forEach(p => add(p, 'archive', { category: p.category }));
  D.PRIOR_ROLES.forEach(p => add(p, 'prior'));

  // union-find over PERSON_LINKS so one real person -> one page
  const parent = new Map();
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  entries.forEach((_, id) => parent.set(id, id));
  D.PERSON_LINKS.forEach(l => {
    const ids = (l.ids || []).filter(id => { if (!entries.has(id)) { warn('PERSON_LINKS references unknown id: ' + id); return false; } return true; });
    for (let i = 1; i < ids.length; i++) parent.set(find(ids[i]), find(ids[0]));
  });
  const groups = new Map();
  entries.forEach((e, id) => { const r = find(id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(e); });

  // promises, validated
  const byMember = new Map();
  const excluded = [];
  const all = [['current', D.DEFAULT_PROMISES], ['past', D.PAST_PROMISES], ['archive', D.ARCHIVE_PROMISES]];
  all.forEach(([kind, arr]) => arr.forEach(p => {
    if (p.draft) return;                                    // drafts never leave the admin view
    if (!entries.has(p.memberId)) { warn('Promise ' + p.id + ' references unknown member ' + p.memberId); return; }
    if (p.status === 'undetermined') {                       // a placeholder, not a verdict: never published, never scored
      excluded.push({ id: p.id, member: entries.get(p.memberId).name, reason: 'status is Undetermined (a placeholder, left out of scores)' });
      return;
    }
    if (!STATUS[p.status]) fatal('Promise ' + p.id + ' has invalid status: ' + p.status);
    if (!String(p.text || '').trim()) fatal('Promise ' + p.id + ' has empty text');
    const src = (Array.isArray(p.sources) && p.sources.length ? p.sources : (p.source ? [p.source] : []))
      .map(s => ({ publisher: String(s.publisher || '').trim(), type: String(s.type || ''), url: safeUrl(s.url) }))
      .filter(s => s.publisher && s.url);
    const pubs = new Set(src.map(s => s.publisher.toLowerCase()));
    const hasPrimary = src.some(s => PRIMARY_TYPES.has(s.type));
    const rec = { id: p.id, memberId: p.memberId, text: String(p.text).trim(), category: p.category || '', status: p.status, note: p.note || '', sources: src };
    if (!byMember.has(p.memberId)) byMember.set(p.memberId, { all: [], shown: [] });
    byMember.get(p.memberId).all.push(rec);
    if (pubs.size >= MIN_PUBLISHERS && hasPrimary) byMember.get(p.memberId).shown.push(rec);
    else excluded.push({ id: p.id, member: entries.get(p.memberId).name, publishers: pubs.size, primary: hasPrimary });
  }));

  // one page model per group that has at least one publishable promise
  const pages = [];
  groups.forEach(list => {
    list.sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.order - b.order);
    const primary = list[0];
    const roles = list.filter(e => e.kind !== 'prior' && byMember.has(e.id) && byMember.get(e.id).shown.length)
      .map(e => ({ entry: e, all: byMember.get(e.id).all, shown: byMember.get(e.id).shown }));
    if (!roles.length) return;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(primary.id)) fatal('Unsafe page slug (ids must be a-z, 0-9, hyphen): ' + primary.id);
    pages.push({ slug: primary.id, name: primary.name, primary, roles, priors: list.filter(e => e.kind === 'prior'), ids: list.map(e => e.id) });
  });
  pages.sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
  const covered = new Set(pages.flatMap(pg => pg.ids));
  const roster = [...entries.values()].filter(e => e.kind === 'current' && !covered.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { entries, pages, excluded, roster };
}

/* --------------------------------- scoring --------------------------------- */
function scoreOf(promises) {
  if (!promises.length) return null;
  return Math.round(promises.reduce((t, p) => t + (WEIGHTS[p.status] || 0), 0) / promises.length);
}
const tierOf = s => (s === null ? 'na' : s >= 70 ? 'high' : s >= 40 ? 'mid' : 'low');
function distOf(promises) { const d = {}; Object.keys(STATUS).forEach(k => d[k] = 0); promises.forEach(p => d[p.status]++); return d; }

/* ---------------------------------- layout --------------------------------- */
const CSS = `
:root{--bg:#FFFFFF;--bg-alt:#F4F6F9;--border:#DFE3E9;--text:#171A21;--text-muted:#5B6472;--text-faint:#8992A3;--brand:#12836F;--brand-dark:#0C6355;--brand-tint:#E1F3EF;
--not_started:#8A93A3;--in_progress:#C2790F;--stalled:#5D7599;--compromise:#8A5CA8;--completed:#1E8E5A;--broken:#C0392B;
--not_started-bg:#EEF0F3;--in_progress-bg:#FBF0DF;--stalled-bg:#E9EDF4;--compromise-bg:#F3E9F6;--completed-bg:#E4F5EC;--broken-bg:#FBE7E4;
--party-d:#2058B0;--party-d-bg:#E7EFFC;--party-r:#B23A2F;--party-r-bg:#FBEAE7;--party-i:#8B5E00;--party-i-bg:#F7EEDA;--party-np:#6B7280;--party-np-bg:#EEF0F2;--radius:10px}
@media (prefers-color-scheme:dark){:root{--bg:#1D222B;--bg-alt:#14171D;--border:#2B313C;--text:#E8EAED;--text-muted:#9CA3AF;--text-faint:#6B7280;--brand:#22A98A;--brand-dark:#1B8570;--brand-tint:#16332E;
--not_started:#9AA3B2;--in_progress:#E0993D;--stalled:#7C93C4;--compromise:#B084D1;--completed:#3DBE82;--broken:#E0685A;
--not_started-bg:#262B33;--in_progress-bg:#3A2E1B;--stalled-bg:#212A38;--compromise-bg:#2E2438;--completed-bg:#1A3327;--broken-bg:#3A2220;
--party-d:#5B9BF0;--party-d-bg:#1B2A42;--party-r:#F0776A;--party-r-bg:#3A2220;--party-i:#D9A93F;--party-i-bg:#332A16;--party-np:#9AA3B2;--party-np-bg:#262B33}}
*{box-sizing:border-box}body{margin:0;background:var(--bg-alt);color:var(--text);font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--brand)}.wrap{max-width:860px;margin:0 auto;padding:0 20px}
.masthead{background:var(--bg);border-bottom:1px solid var(--border)}.masthead .wrap{display:flex;align-items:center;gap:12px;padding-top:14px;padding-bottom:14px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}.logo-mark{width:46px;height:32px;border-radius:7px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}
.logo-word{font-weight:800;font-size:18px;letter-spacing:-.01em}.cta{margin-left:auto;font-size:13px;font-weight:700;text-decoration:none;color:#fff;background:var(--brand);padding:7px 13px;border-radius:8px}
nav.crumbs{font-size:13px;color:var(--text-muted);padding:16px 0 0}nav.crumbs a{color:var(--text-muted)}
h1{font-size:30px;line-height:1.2;letter-spacing:-.02em;margin:10px 0 6px}h2{font-size:20px;letter-spacing:-.01em;margin:30px 0 10px}h3{font-size:16.5px;line-height:1.4;margin:10px 0 8px}
.sub{color:var(--text-muted);margin:0 0 6px}.chip{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:20px;vertical-align:middle;margin-left:6px}
.role{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin:18px 0}
.role-head{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.role-head h2{margin:0;font-size:18px}
.score{width:64px;height:64px;border-radius:50%;border:3px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}
.score b{font-size:22px;line-height:1}.score span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted)}
.score.tier-high{border-color:var(--completed);color:var(--completed)}.score.tier-mid{border-color:var(--in_progress);color:var(--in_progress)}.score.tier-low{border-color:var(--broken);color:var(--broken)}
.bar{display:flex;height:9px;border-radius:6px;overflow:hidden;background:var(--border);margin:12px 0 4px}.bar i{display:block;height:100%}
.legend{font-size:12.5px;color:var(--text-muted);margin:0}
.promise{border-top:1px solid var(--border);padding:16px 0 4px}.promise:first-of-type{border-top:0}
.pill{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;padding:3px 10px;border-radius:20px}
.cat{font-size:12.5px;color:var(--text-muted);margin-left:8px}.note{margin:0 0 10px;color:var(--text)}
.sources{list-style:none;margin:6px 0 12px;padding:0;font-size:13.5px}.sources li{padding:3px 0}.stype{display:inline-block;min-width:175px;font-size:11.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em}
.info{font-size:13.5px;color:var(--text-muted);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin:18px 0}
.dir-sec h2,.dir-sec h3{font-size:17px;margin:26px 0 6px}.dir{list-style:none;margin:0;padding:0;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius)}
.dir li{display:flex;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid var(--border);flex-wrap:wrap}.dir li:first-child{border-top:0}.dir .meta{color:var(--text-muted);font-size:13px;margin-left:auto}
footer{border-top:1px solid var(--border);margin-top:40px;padding:22px 0 40px;font-size:13px;color:var(--text-muted)}footer a{color:var(--text-muted);margin-right:14px}
.related{margin-top:30px}.related .sub{font-size:14px}.summary{margin:14px 0 4px}
.prose p{margin:0 0 14px}.prose h2{margin-top:34px}.prose ul{margin:0 0 14px;padding-left:22px}.prose li{margin:0 0 8px}.defs{margin:0 0 14px}.defs dt{margin-top:12px}.defs dd{margin:4px 0 0;color:var(--text-muted)}
table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0 18px;background:var(--bg);border:1px solid var(--border)}th,td{padding:9px 12px;border-top:1px solid var(--border);text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);border-top:0}code{font-size:13px;background:var(--bg-alt);padding:1px 5px;border-radius:5px}
`.replace(/\n/g, '\n').trim();
const PARTY_CSS = ['d', 'r', 'i', 'np'].map(k => `.p-${k}{color:var(--party-${k});background:var(--party-${k}-bg)}`).join('') +
  Object.keys(STATUS).map(k => `.s-${k}{color:var(--${k});background:var(--${k}-bg)}.b-${k}{background:var(--${k})}`).join('');
const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'";
const LEGAL = [['privacy-policy.html', 'Privacy Policy'], ['terms-of-service.html', 'Terms of Service'], ['cookie-policy.html', 'Cookie Policy'], ['dmca-policy.html', 'Copyright / DMCA'], ['faq.html', 'FAQ']];

function layout({ depth, title, description, canonical, body, ld, lastmodToken, extraCss }) {
  const up = '../'.repeat(depth);
  const legal = [`<a href="${up}methodology/">Methodology</a>`]
    .concat(LEGAL.filter(([f]) => fs.existsSync(path.join(ROOT, f))).map(([f, l]) => `<a href="${up}${f}">${l}</a>`)).join('');
  return `<!DOCTYPE html>
${MARK}
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="ActionOverWords Index">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(SITE)}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ActionOverWords Index: What they said. What happened.">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0D4A43">
<link rel="icon" href="${up}favicon.ico" sizes="32x32">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}${PARTY_CSS}${extraCss || ''}</style>
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>` : ''}
</head>
<body>
<header class="masthead"><div class="wrap"><a class="logo" href="${homeHref(up)}"><span class="logo-mark">AOW</span><span class="logo-word">ActionOverWords Index</span></a><a class="cta" href="${up}aow-index.html">Open the tracker</a></div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap"><p>ActionOverWords Index is an independent, nonpartisan tracker of specific promises made by elected officials. Last updated ${lastmodToken}. Spot an error? <a style="margin:0" href="mailto:${CONTACT}">${CONTACT}</a></p><div>${legal}</div></div></footer>
</body>
</html>
`;
}

function distBar(dist, total) {
  const segs = Object.keys(STATUS).filter(k => dist[k]).map(k => `<i class="b-${k}" style="width:${(dist[k] / total * 100).toFixed(2)}%"></i>`).join('');
  const label = Object.keys(STATUS).filter(k => dist[k]).map(k => `${dist[k]} ${STATUS[k].toLowerCase()}`).join(' · ');
  return `<div class="bar" role="img" aria-label="${esc(label)}">${segs}</div><p class="legend">${esc(label)}</p>`;
}

// "Senate · Florida" is a U.S. Senate seat; "Florida Senate" is the state's. The data files store the
// bare "Senate · X" / "House · X" form, so spell out "U.S." (or "State") on the way out. Mirrors seatText()
// in aow-index.html, which does the same for the interactive site.
function ordinal(n) { const v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); }
function seatText(seat) {
  // district suffixes are rebuilt from the number, so a typo in the data ("California 32th") never reaches a page
  const s = String(seat || '').replace(/\b(\d+)(?:st|nd|rd|th)\b/g, (_, d) => ordinal(Number(d)));
  if (/^(Senate|House)( ·|$)/.test(s)) return 'U.S. ' + s;
  if (/^Senate President\b/.test(s)) return 'State ' + s;
  return s;
}

function roleLabel(e) {
  if (e.kind === 'current') return 'Current role · ' + seatText(e.seat);
  if (e.kind === 'past') return e.adminLabel + (e.years ? ' (' + e.years + ')' : '') + ' · ' + seatText(e.seat);
  return 'Archive · ' + seatText(e.seat) + (e.years ? ' (' + e.years + ')' : '');
}

// One directory row, used by the directory and by every hub so they can never drift apart.
function dirRow(pg, prefix) {
  const all = pg.roles.flatMap(r => r.all), sc = scoreOf(pg.roles[0].all);
  return `<li><a href="${prefix}${esc(pg.slug)}/">${esc(pg.name)}</a>${pg.primary.party ? `<span class="chip p-${partyKey(pg.primary.party)}">${esc(partyLabel(pg.primary.party))}</span>` : ''}<span class="meta">${esc(seatText(pg.primary.seat))} · ${all.length} promise${all.length === 1 ? '' : 's'}${sc === null ? '' : ' · score ' + sc}</span></li>`;
}
function rosterRow(e) {
  return `<li><span>${esc(e.name)}</span>${e.party ? `<span class="chip p-${partyKey(e.party)}">${esc(partyLabel(e.party))}</span>` : ''}<span class="meta">${esc(seatText(e.seat))}</span></li>`;
}

// "More from ..." on an official's page: the next few people in the same group, in alphabetical order,
// wrapping around, so every page gets the same number of links in. Never chosen by party or score.
function relatedHtml(pg, ctx) {
  const keys = groupKeysOf(pg.primary);
  const mates = keys.length ? (ctx.groups.get(keys[0]) || []) : [];
  const hubLinks = keys.filter(k => ctx.hubs.has(k)).map(k => `<a href="../../${k}/">${esc(cap(hubMeta(k, ctx.model).label))}</a>`);
  if (mates.length < 2 && !hubLinks.length) return '';
  const i = mates.indexOf(pg), n = Math.min(6, mates.length - 1);
  const pick = n > 0 ? Array.from({ length: n }, (_, k) => mates[(i + 1 + k) % mates.length]) : [];
  return `
<section class="related">
<h2>${pick.length ? 'More from ' + esc(hubMeta(keys[0], ctx.model).from) : 'Browse'}</h2>
${hubLinks.length ? `<p class="sub">Everyone with promises published: ${hubLinks.join(' · ')}</p>` : ''}
${pick.length ? `<ul class="dir">${pick.map(x => `<li><a href="../${esc(x.slug)}/">${esc(x.name)}</a><span class="meta">${esc(seatText(x.primary.seat))}</span></li>`).join('')}</ul>` : ''}
</section>`;
}

// One plain sentence per role, built only from counts, office and status names (no adjectives, no party, no ranking).
// It gives search engines and AI assistants a quotable statement of the same facts the bar and score show.
const nOf = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function statusWords(dist) {
  const bits = Object.keys(STATUS).filter(k => dist[k]).map(k => `${dist[k]} ${STATUS[k].toLowerCase()}`);
  return bits.length < 2 ? bits.join('') : bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1];
}
function roleWhere(e) {
  const seat = seatText(e.seat).replace(/ · /g, ', ');
  if (e.kind === 'current') return seat;
  if (e.kind === 'past') return seat + ', ' + e.adminLabel + (e.years ? ', ' + e.years : '');
  return seat + (e.years ? ', ' + e.years : '');
}
function roleSummary(name, r, sc, d) {
  const total = r.all.length, shown = r.shown.length;
  const listed = shown === total ? (total === 1 ? 'It is listed below with its sources.' : total === 2 ? 'Both are listed below with their sources.' : `All ${total} are listed below with their sources.`)
    : `${shown} of the ${total} ${shown === 1 ? 'is' : 'are'} listed below with ${shown === 1 ? 'its' : 'their'} sources.`;
  // the score always travels with the number of promises it rests on, as the methodology page explains
  const score = sc === null ? '' : ` The AOW Score (0 to 100, based on ${nOf(total, 'tracked promise', 'tracked promises')}) is ${sc}.`;
  return `ActionOverWords Index tracks ${nOf(total, 'promise', 'promises')} by ${name} as ${roleWhere(r.entry)}: ${statusWords(d)}.${score} ${listed}`;
}

function renderOfficial(pg, ctx) {
  const p0 = pg.primary;
  const canonical = `${SITE}/officials/${pg.slug}/`;
  const allShown = pg.roles.flatMap(r => r.shown);
  const dist = distOf(allShown);
  const bits = Object.keys(STATUS).filter(k => dist[k]).map(k => `${dist[k]} ${STATUS[k].toLowerCase()}`);
  let desc = `${pg.name}${p0.party ? ' (' + partyLabel(p0.party) + ')' : ''}, ${seatText(p0.seat)}: ${allShown.length} sourced promise${allShown.length === 1 ? '' : 's'} tracked — ${bits.join(', ')}. See each status, the evidence, and the sources.`;
  if (desc.length > 300) desc = desc.slice(0, 297) + '...';
  const title = `${pg.name} — Campaign Promise Tracker | ActionOverWords`;

  const roles = pg.roles.map(r => {
    const sc = scoreOf(r.all), d = distOf(r.all);       // score uses ALL tracked promises, same as the interactive tracker
    const hidden = r.all.length - r.shown.length;
    const cards = r.shown.map(p => `
<article class="promise" id="${esc(p.id)}">
<span class="pill s-${p.status}">${esc(STATUS[p.status])}</span>${p.category ? `<span class="cat">${esc(p.category)}</span>` : ''}
<h3>${esc(p.text)}</h3>
${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
<ul class="sources">${p.sources.map(s => `<li><span class="stype">${esc(SRC_TYPE[s.type] || 'Source')}</span><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.publisher)}</a></li>`).join('')}</ul>
</article>`).join('');
    return `
<section class="role" aria-labelledby="r-${esc(r.entry.id)}">
<div class="role-head"><div class="score tier-${tierOf(sc)}" title="AOW Score, based on ${r.all.length} tracked promise${r.all.length === 1 ? '' : 's'}"><b>${sc === null ? '—' : sc}</b><span>Score</span></div>
<div><h2 id="r-${esc(r.entry.id)}">${esc(roleLabel(r.entry))}</h2><p class="sub">${r.all.length} tracked promise${r.all.length === 1 ? '' : 's'}</p></div></div>
<p class="summary">${esc(roleSummary(pg.name, r, sc, d))}</p>
${distBar(d, r.all.length)}
${hidden ? `<p class="legend">${r.shown.length} of ${r.all.length} are listed on this page; the rest do not yet meet the three-publisher sourcing standard for publication here and appear only in the interactive tracker.</p>` : ''}
${cards}
</section>`;
  }).join('\n');

  const priors = pg.priors.length ? `<h2>Earlier offices</h2><p class="sub">${pg.priors.map(e => esc(seatText(e.seat) + (e.years ? ' (' + e.years + ')' : ''))).join(' · ')}</p>` : '';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../../')}">Home</a> › <a href="../">Officials</a> › ${esc(pg.name)}</nav>
<h1>${esc(pg.name)}${p0.party ? `<span class="chip p-${partyKey(p0.party)}">${esc(partyLabel(p0.party))}</span>` : ''}</h1>
<p class="sub">${esc(seatText(p0.seat))}${p0.termStart && p0.kind === 'current' ? ' · in this role since ' + esc(p0.termStart) : ''}</p>
${roles}
${priors}
${relatedHtml(pg, ctx)}
<div class="info"><strong>How to read this page.</strong> Each status is ActionOverWords' assessment based on the sources listed. A listed promise needs sources from at least three distinct publishers, including at least one primary record. The AOW Score averages a person's tracked promises: Completed 100, Compromise 60, In progress 40, Stalled 15, Not started 0, Broken 0. <a href="../../methodology/">Full methodology</a> and the <a href="../../aow-index.html">interactive tracker</a>.</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, dateModified: '{{LASTMOD}}', inLanguage: 'en-US', about: { '@id': canonical + '#person' } },
      { '@type': 'Person', '@id': canonical + '#person', name: pg.name, jobTitle: seatText(p0.seat), url: canonical },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl() },
        { '@type': 'ListItem', position: 2, name: 'Officials', item: SITE + '/officials/' },
        { '@type': 'ListItem', position: 3, name: pg.name, item: canonical }] }
    ]
  };
  return layout({ depth: 2, title, description: desc, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

function renderDirectory(pages, roster, hubs) {
  const sec = pg => {
    const e = pg.primary;
    if (e.kind === 'current') return e.state === 'US' ? '0|Federal administration' : '1|' + (STATE_NAMES[e.state] || e.state || 'Other');
    if (e.kind === 'past') return '8|Past administrations';
    return '9|Archive';
  };
  const bySec = new Map();
  pages.forEach(pg => { const k = sec(pg); if (!bySec.has(k)) bySec.set(k, []); bySec.get(k).push(pg); });
  const keys = [...bySec.keys()].sort((a, b) => a.split('|')[0].localeCompare(b.split('|')[0]) || a.split('|')[1].localeCompare(b.split('|')[1]));
  const total = pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0);
  const hubKeyOf = k => { const [rank, name] = k.split('|'); return rank === '0' ? 'administration' : rank === '1' ? 'states/' + slugOf(name) : null; };
  const hubLink = (k, text) => { const hk = hubKeyOf(k); return hk && hubs.has(hk) ? `<a href="../${hk}/">${esc(text)}</a>` : esc(text); };
  const list = keys.map(k => `
<section class="dir-sec"><h2>${hubLink(k, k.split('|')[1])}</h2><ul class="dir">${bySec.get(k).map(pg => dirRow(pg, '')).join('')}</ul></section>`).join('');
  // everyone else on the roster: listed by name only, no page until they have publishable promises
  const rsec = e => (e.state === 'US' ? '0|Federal administration' : '1|' + (STATE_NAMES[e.state] || e.state || 'Other'));
  const rBy = new Map();
  roster.forEach(e => { const k = rsec(e); if (!rBy.has(k)) rBy.set(k, []); rBy.get(k).push(e); });
  const rKeys = [...rBy.keys()].sort((a, b) => a.split('|')[0].localeCompare(b.split('|')[0]) || a.split('|')[1].localeCompare(b.split('|')[1]));
  const rosterHtml = roster.length ? `
<h2 id="all-officials" style="margin-top:44px">Everyone else on the roster</h2>
<p class="sub">${roster.length} more current officials are tracked in <a href="../aow-index.html">the interactive tracker</a> and have no promises published on this site yet. A page appears here automatically once an official has promises that meet the sourcing standard.</p>
${rKeys.map(k => `<section class="dir-sec"><h3>${hubLink(k, k.split('|')[1])}</h3><ul class="dir">${rBy.get(k).map(rosterRow).join('')}</ul></section>`).join('')}` : '';
  const canonical = SITE + '/officials/';
  const title = 'Officials With Tracked Promises | ActionOverWords';
  const description = `${pages.length + roster.length} current and past officials tracked, ${pages.length} with ${total} sourced promises published: what was promised, what happened, and the evidence.`;
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../')}">Home</a> › Officials</nav>
<h1>Officials with tracked promises</h1>
<p class="sub">${pages.length} people have promises published here, ${total} in all. Every published promise carries sources from at least three distinct publishers, including at least one primary record. The rest of the roster is listed further down. See the <a href="../methodology/">methodology</a> for how sources, statuses and scores work.</p>
${list}
${rosterHtml}`;
  const ld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical };
  return layout({ depth: 1, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

/* ----------------------------------- hubs ----------------------------------- */
const ADMIN_SECS = [['leadership', 'President and Vice President'], ['cabinet', 'Cabinet and senior White House officials'], ['agency', 'Sub-Cabinet law-enforcement and agency heads']];
const STATE_SECS = [['state', 'State offices'], ['senate', 'U.S. Senate'], ['house', 'U.S. House']];
const stateGroupOf = e => (/^Senate( ·|$)/.test(e.seat) ? 'senate' : /^House( ·|$)/.test(e.seat) ? 'house' : 'state');

// Names and wording for each hub. Built from structure only (where people serve), never party or score.
function hubMeta(key, model) {
  if (key === 'administration') {
    const pres = [...model.entries.values()].find(e => e.kind === 'current' && e.state === 'US' && /^President of the United States/.test(e.seat));
    const last = pres ? String(pres.name).replace(/,?\s+(?:Jr|Sr|II|III|IV)\.?$/i, '').trim().split(/\s+/).pop() : '';
    const lead = last || 'Federal', low = last || 'federal';
    return { label: lead + ' administration', from: `the ${low} administration`, title: lead + ' Administration Promise Tracker', h1: lead + ' administration promise tracker',
      who: `officials in the ${low} administration`, one: `official in the ${low} administration` };
  }
  if (key === 'congress/senate') return { label: 'U.S. Senate', from: 'the U.S. Senate', title: 'U.S. Senate Promise Tracker', h1: 'U.S. Senate promise tracker', who: 'U.S. senators', one: 'U.S. senator' };
  if (key === 'congress/house') return { label: 'U.S. House', from: 'the U.S. House', title: 'U.S. House Promise Tracker', h1: 'U.S. House promise tracker', who: 'U.S. House members', one: 'U.S. House member' };
  const m = /^states\/(.+)$/.exec(key);
  const name = m && Object.values(STATE_NAMES).find(v => slugOf(v) === m[1]);
  if (name) return { label: name, from: name, title: name + ' Officials Promise Tracker', h1: name + ' officials promise tracker', who: name + ' officials', one: name + ' official' };
  return fatal('Unknown hub key: ' + key);
}

// People with pages, grouped by where they serve. A group gets its own hub page only once it has HUB_MIN people
// with pages, so no thin or empty hub is ever published. Smaller groups still get "More from ..." links.
function buildHubs(model) {
  const groups = new Map(), rosterBy = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  model.pages.forEach(pg => groupKeysOf(pg.primary).forEach(k => push(groups, k, pg)));      // model.pages is alphabetical
  model.roster.forEach(e => groupKeysOf(e).forEach(k => push(rosterBy, k, e)));
  const hubs = new Map();
  [...groups.keys()].sort().forEach(k => {
    if (groups.get(k).length >= HUB_MIN) hubs.set(k, { key: k, pages: groups.get(k), roster: rosterBy.get(k) || [] });
  });
  return { groups, hubs };
}

function renderHub(h, ctx) {
  const m = hubMeta(h.key, ctx.model);
  const depth = h.key.split('/').length, up = '../'.repeat(depth);
  const canonical = `${SITE}/${h.key}/`;
  const total = h.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0);
  const title = `${m.title} | ActionOverWords`;
  const description = `${nOf(h.pages.length, m.one, m.who)} with sourced promises: ${total} in all, each rated kept, broken, or in between, with the evidence behind it.`;

  // sections are structural (office type), listed in a fixed order; people are alphabetical inside each
  const secs = h.key === 'administration' ? ADMIN_SECS.map(([k, l]) => [l, e => adminGroupOf(e) === k])
    : /^states\//.test(h.key) ? STATE_SECS.map(([k, l]) => [l, e => stateGroupOf(e) === k]) : null;
  const split = (items, entryOf, only) => (secs ? secs.map(([l, test]) => [l, items.filter(x => test(entryOf(x)))]).filter(([, xs]) => xs.length) : [[only, items]]);
  const pageSecs = split(h.pages, pg => pg.primary, cap(m.who) + ' with promises published');
  const rosterSecs = split(h.roster, e => e, '');

  const rosterHtml = h.roster.length ? `
<h2 id="all-officials" style="margin-top:44px">Everyone else on the roster</h2>
<p class="sub">${h.roster.length} more current ${esc(h.roster.length === 1 ? m.one : m.who)} ${h.roster.length === 1 ? 'is' : 'are'} tracked in <a href="${up}aow-index.html">the interactive tracker</a> and ${h.roster.length === 1 ? 'has' : 'have'} no promises published on this site yet. A page appears here automatically once an official has promises that meet the sourcing standard.</p>
${rosterSecs.map(([l, xs]) => `<section class="dir-sec">${secs ? `<h3>${esc(l)}</h3>` : ''}<ul class="dir">${xs.map(rosterRow).join('')}</ul></section>`).join('')}` : '';

  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref(up)}">Home</a> › <a href="${up}officials/">Officials</a> › ${esc(m.label)}</nav>
<h1>${esc(m.h1)}</h1>
<p class="sub">${esc(nOf(h.pages.length, m.one, m.who))} ${h.pages.length === 1 ? 'has' : 'have'} promises published here, ${total} in all. Every published promise carries sources from at least three distinct publishers, including at least one primary record. People are listed alphabetically within each group. See the <a href="${up}methodology/">methodology</a> for how sources, statuses and scores work.</p>
${pageSecs.map(([l, xs]) => `<section class="dir-sec"><h2>${esc(l)}</h2><ul class="dir">${xs.map(pg => dirRow(pg, up + 'officials/')).join('')}</ul></section>`).join('')}
${rosterHtml}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': canonical + '#webpage', url: canonical, name: title, description, dateModified: '{{LASTMOD}}', inLanguage: 'en-US', mainEntity: { '@id': canonical + '#list' } },
      { '@type': 'ItemList', '@id': canonical + '#list', numberOfItems: h.pages.length,
        itemListElement: h.pages.map((pg, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/officials/${pg.slug}/`, name: pg.name })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl() },
        { '@type': 'ListItem', position: 2, name: 'Officials', item: SITE + '/officials/' },
        { '@type': 'ListItem', position: 3, name: m.label, item: canonical }] }
    ]
  };
  return layout({ depth, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

/* -------------------------------- methodology ------------------------------- */
// Fixed text. It restates what the live site already says (About tab, FAQ, the notes on every generated page)
// and takes the weights and worked examples from the same constants the scores use, so it cannot drift.
function renderMethodology() {
  const canonical = SITE + '/methodology/';
  const title = 'Methodology: Sources, Statuses and AOW Score | ActionOverWords';
  const description = 'How ActionOverWords Index sources each promise, what the six statuses mean, how the 0–100 AOW Score is calculated, and how the tracker stays nonpartisan.';
  const scoreOrder = ['completed', 'compromise', 'in_progress', 'stalled', 'not_started', 'broken'];
  const meaning = {
    not_started: 'Nothing has happened yet.', in_progress: 'Active movement, not yet resolved.', stalled: 'Attempted, but momentum has died.',
    compromise: 'Something was delivered, narrower than promised.', completed: 'Kept as stated.', broken: 'Not kept.'
  };
  const example = counts => {
    const list = [];
    scoreOrder.forEach(k => { for (let i = 0; i < (counts[k] || 0); i++) list.push({ status: k }); });
    const terms = list.map(p => WEIGHTS[p.status]);
    const avg = terms.reduce((a, b) => a + b, 0) / list.length;
    return `<tr><td>${esc(scoreOrder.filter(k => counts[k]).map(k => counts[k] + ' ' + STATUS[k]).join(', '))}</td><td><code>(${terms.join('+')}) ÷ ${list.length} = ${avg.toFixed(1)}</code></td><td>${scoreOf(list)}</td></tr>`;
  };
  const faq = fs.existsSync(path.join(ROOT, 'faq.html')) ? ' · <a href="../faq.html">FAQ</a>' : '';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../')}">Home</a> › Methodology</nav>
<h1>Methodology</h1>
<p class="sub">How promises are chosen, sourced, rated and scored on ActionOverWords Index.</p>
<div class="prose">

<h2 id="what-this-tracks">What this tracks</h2>
<p>ActionOverWords Index tracks specific promises made by elected officials, federal and state, and shows whether each one has been kept, broken, or something in between. Most political coverage tracks what officials say. This tracks what actually happened to what they said.</p>
<p>The same standard applies whether a promise came from a Democrat or a Republican, because accountability that only works for one side isn't accountability. Officials who were appointed rather than elected, such as Cabinet secretaries and senior agency heads, are included and are marked Appointed in the interactive tracker.</p>

<h2 id="sourcing">How each promise is sourced</h2>
<p>Every promise is checked against three sources before a status is set: one official government source (a vote record, a signed bill, an agency filing, or similar primary record), one mainstream/left-leaning news source, and one right-leaning news source. A status only gets applied once it holds up across all three, not just one outlet's version of events. The three-source rule exists so that a status can never rest on reporting from only one side of the aisle.</p>
<p>Every source is linked on the promise and labeled by type: campaign statement, interview, voting record, official record, the official's own office, or news report. A campaign statement and an independently reported outcome are not presented as equally strong evidence, and the reader weighs the sources rather than being told what to think.</p>
<p>A promise is listed on the pages of this site only when its sources come from at least three distinct publishers and at least one of them is a primary record: an official record, a voting record, or the official's own office. Promises that do not yet meet that standard stay in the interactive tracker, and an official's page says when some of their tracked promises are not listed yet.</p>

<h2 id="statuses">The six statuses</h2>
<p>Every promise gets one of six statuses, based on what has actually happened, not on intent.</p>
<dl class="defs">
${Object.keys(STATUS).map(k => `<dt><span class="pill s-${k}">${esc(STATUS[k])}</span></dt><dd>${esc(meaning[k])}</dd>`).join('\n')}
</dl>
<p>A promise whose outcome has not been fully verified shows <strong>Undetermined</strong> in the interactive tracker. That is a placeholder, not a verdict. It is left out of the AOW Score until it is resolved, and it is not published on these pages.</p>

<h2 id="aow-score">The AOW Score</h2>
<p>An official's score is the average of their tracked promises, weighted by status, on a scale of 0 to 100. It is rounded to the nearest whole number, with halves rounding up.</p>
<table>
<tr><th scope="col">Status</th><th scope="col">Weight</th></tr>
${scoreOrder.map(k => `<tr><td>${esc(STATUS[k])}</td><td>${WEIGHTS[k]}</td></tr>`).join('\n')}
</table>
<p>Undetermined promises carry no weight: they are left out of the average rather than counted as 0. An official with no tracked promises shows a dash instead of a 0, because no data isn't the same as a bad record. The score badge uses the same colors as the statuses: 70 and above reads green, 40 to 69 amber, and below 40 red.</p>
<p>There is no minimum number of promises required to produce a score, so a single promise generates one. That is why the number of tracked promises is shown next to every score: a score built on one promise and a score built on twenty look the same if they land in the same range, and the count is what tells them apart.</p>
<p>The formula is fixed and published, not an editorial judgment made case by case, so anyone can recompute it from an official's promise list and get the same number. It runs identically for current officials, past administrations and the archive, with no softer standard for someone no longer in office or who never won. Worked examples:</p>
<table>
<tr><th scope="col">Promises tracked</th><th scope="col">Calculation</th><th scope="col">Score</th></tr>
${example({ completed: 2, in_progress: 2, stalled: 1 })}
${example({ completed: 1, in_progress: 1, not_started: 2 })}
${example({ completed: 5, in_progress: 3 })}
</table>

<h2 id="nonpartisan">Keeping it nonpartisan</h2>
<p>Most political trackers eventually reveal a lean: in which promises get picked, which words describe a broken one versus a complicated one, whose excuses get more room. A few specific choices here are aimed directly at that.</p>
<ul>
<li><strong>Party is a fact, not a verdict.</strong> A party badge is colored the way an election map colors it, and that is the only role color plays. Status colors are earned by outcome, not by party: the same six categories, checked against the same standard, for every official.</li>
<li><strong>Party isn't assumed from context.</strong> Serving under a Republican administration doesn't automatically get someone tagged Republican, and serving under a Democratic one doesn't make someone a Democrat.</li>
<li><strong>Sourcing is shown, not summarized into a conclusion.</strong> Every promise links to where it came from, so the evidence can be checked rather than taken on trust.</li>
<li><strong>The score is a fixed formula.</strong> Nobody adjusts it case by case.</li>
<li><strong>Lists are never ranked by party or score.</strong> The directory and the administration, Senate, House and state pages group officials by where they serve and list them alphabetically.</li>
</ul>
<p>No dataset is perfect, and this one is still growing. What these choices are meant to do is make any bias that does creep in visible and checkable, instead of buried behind a "trust the editors" black box.</p>

<h2 id="corrections">Corrections and appeals</h2>
<p>If you think a status is wrong, or want to suggest a promise to track, use the Contact form on <a href="../aow-index.html">the Index</a> and choose <em>Suggested correction</em> or <em>Appeal a status</em>, or write to <a href="mailto:${CONTACT}">${CONTACT}</a>. Appeals need a named source, the outlet and headline being cited, so they can be checked the same way every other entry is checked. Every submission is reviewed, which is how the record gets more accurate over time.</p>

<h2 id="coverage">What is and is not covered</h2>
<p><strong>Covered:</strong> the President, the Vice President, Cabinet and senior White House officials, and a set of sub-Cabinet law-enforcement and agency heads; the U.S. Congress, including its non-voting members; and in every state the Governor, the Lieutenant Governor (or whichever office is first in succession) and the Attorney General, with some larger states going deeper into their other executive offices. Former officeholders, past administrations and candidates who ran and lost are kept too, under the same statuses and the same sourcing standard, because a promise doesn't stop being checkable just because someone left office or never won.</p>
<p><strong>Not covered yet:</strong> county and city government, school boards, and special districts. State legislatures and judiciaries are not built out yet. Federal judges and independent regulatory boards such as the Federal Reserve are a different category: appointed, often deliberately apolitical, and with less to track in the same way.</p>
<p>Not every tracked official has promises published yet. The <a href="../officials/">officials directory</a> shows who does, and a page appears automatically once an official has promises that meet the sourcing standard.</p>

<p>See also: <a href="../officials/">Officials directory</a> · <a href="../aow-index.html">Interactive tracker</a>${faq}</p>
</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, dateModified: '{{LASTMOD}}', inLanguage: 'en-US' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl() },
        { '@type': 'ListItem', position: 2, name: 'Methodology', item: canonical }] }
    ]
  };
  return layout({ depth: 1, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

/* ----------------------------------- home ----------------------------------- */
// The landing page at the bare domain. Fixed explanatory text that restates the FAQ and the methodology, plus counts
// read from the data. No outcome tallies (nothing like "60% kept"), so the page can never read as a scoreboard for one side.
const HOME_CSS = `.lede{font-size:18px;line-height:1.55;margin:8px 0 18px}.btns{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 10px}
.btn{display:inline-block;font-size:15px;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:9px;border:1px solid var(--brand);color:#fff;background:var(--brand)}.btn.alt{background:transparent;color:var(--brand)}
.stats{list-style:none;margin:0 0 12px;padding:0;display:flex;gap:12px;flex-wrap:wrap}.stats li{flex:1 1 200px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px}
.stats b{display:block;font-size:28px;line-height:1.1;letter-spacing:-.02em}.stats span{font-size:13.5px;color:var(--text-muted)}.steps{margin:0 0 14px;padding-left:22px}.steps li{margin:0 0 10px}main>h1:first-child{margin-top:30px}`;

function renderHome(ctx) {
  const { model, hubs } = ctx;
  const canonical = SITE + '/';
  const title = 'ActionOverWords Index: Did Officials Keep Their Promises?';
  const description = 'A nonpartisan tracker of what U.S. officials promised and what happened. Promises are rated from Completed to Broken, with the sources behind them.';
  const current = [...model.entries.values()].filter(e => e.kind === 'current').length;
  const people = model.pages.length;
  const total = model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0);
  const faq = fs.existsSync(path.join(ROOT, 'faq.html'));
  const browse = [`<li><a href="officials/">All officials with promises published</a><span class="meta">${esc(nOf(people, 'person', 'people'))} · ${esc(nOf(total, 'promise', 'promises'))}</span></li>`]
    .concat([...hubs.values()].map(h => `<li><a href="${esc(h.key)}/">${esc(cap(hubMeta(h.key, model).label))}</a><span class="meta">${esc(nOf(h.pages.length, 'person', 'people'))} with promises published</span></li>`))
    .concat([`<li><a href="methodology/">Methodology</a><span class="meta">Sources, statuses and the AOW Score</span></li>`])
    .concat(faq ? [`<li><a href="faq.html">Frequently asked questions</a><span class="meta">Straight answers about how the site works</span></li>`] : []);
  const body = `
<h1>Did U.S. officials keep their promises?</h1>
<p class="lede"><strong>ActionOverWords Index</strong> (AOW Index) is an independent tracker of specific promises made by elected officials, federal and state, and what actually happened to them: kept, broken, or somewhere in between. Most political coverage tracks what officials say. This tracks what happened to what they said, with every entry linked back to where it came from.</p>
<div class="btns"><a class="btn" href="aow-index.html">Open the interactive tracker</a><a class="btn alt" href="officials/">Browse officials with published promises</a></div>

<h2 id="coverage">What is tracked</h2>
<ul class="stats">
<li><b>${current}</b><span>current officials on the roster, federal and state</span></li>
<li><b>${people}</b><span>${people === 1 ? 'person has' : 'people have'} promises published on these pages</span></li>
<li><b>${total}</b><span>${total === 1 ? 'promise is' : 'promises are'} published with sources</span></li>
</ul>
<p class="sub">Every published promise carries sources from at least three distinct publishers, including at least one primary record. Promises still being sourced stay in the interactive tracker, so coverage grows over time.</p>
<p>Federal officials: the President, the Vice President, Cabinet and senior White House officials, a set of sub-Cabinet agency heads, and members of Congress. State officials: governors, lieutenant governors and attorneys general. <a href="methodology/#coverage">What is and is not covered</a>.</p>

<h2 id="how-it-works">How it works</h2>
<ol class="steps">
<li><strong>One specific promise at a time.</strong> Each entry is a specific promise made by an official, with the sources that show what happened to it.</li>
<li><strong>Three sources before a status is set.</strong> One official government source, one mainstream/left-leaning news source, and one right-leaning news source. A status only gets applied once it holds up across all three, so it can't rest on reporting from only one side of the aisle.</li>
<li><strong>Six statuses.</strong> Not started, In progress, Stalled, Compromise, Completed or Broken, based on what has actually happened, not on intent.</li>
<li><strong>A fixed score.</strong> The AOW Score is a 0 to 100 average of an official's tracked promises, weighted by status. The formula is published, so anyone can recompute it.</li>
<li><strong>The same standard for everyone.</strong> The same statuses, score and sourcing rules apply to every official, regardless of party.</li>
</ol>
<p>Read the <a href="methodology/">full methodology</a>.</p>

<h2 id="browse">Browse</h2>
<ul class="dir">${browse.join('')}</ul>

<h2 id="corrections">Corrections</h2>
<p>If a status looks wrong, or you want to suggest a promise to track, write to <a href="mailto:${CONTACT}">${CONTACT}</a> or use the Contact form in <a href="aow-index.html">the tracker</a>. Appeals need a named source (the outlet and headline being cited), so they can be checked the same way every other entry is. <a href="methodology/#corrections">How corrections work</a>.</p>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': SITE_LD.concat([
      { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, isPartOf: { '@id': SITE + '/#website' },
        about: { '@id': SITE + '/#organization' }, dateModified: '{{LASTMOD}}', inLanguage: 'en-US' }
    ])
  };
  return layout({ depth: 0, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}', extraCss: HOME_CSS });
}

/* ---------------------------------- build ---------------------------------- */
function main() {
  // New folders (methodology/, administration/, congress/, states/) only reach the site if the workflow stages them.
  // With an older workflow that stages a fixed list, the sitemap would name pages that never get committed (404s),
  // so in CI stop before writing anything and say what to upload.
  if (IN_CI) {
    const wf = path.join(ROOT, '.github', 'workflows', 'build-pages.yml');
    if (fs.existsSync(wf) && !/git add (-A|--all|\.)(\s|$)/m.test(fs.readFileSync(wf, 'utf8')))
      fatal('.github/workflows/build-pages.yml is out of date: its commit step must stage new folders with "git add -A". Upload the updated workflow file from the SEO bundle.');
  }
  // The bare domain is generated only if index.html already carries the marker (the home page was uploaded from the SEO
  // bundle). The old hand-written redirect stub is never overwritten; until it is replaced, "Home" stays the tracker.
  HOME_LANDING = isOurs(path.join(ROOT, 'index.html'));
  const { D, hash: dataHash, fileCount } = loadDataset();
  const model = buildModel(D);
  const manifestFile = path.join(ROOT, 'tools', 'pages-manifest.json');
  const prev = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { pages: {}, officialCount: 0 };

  if (!model.pages.length) fatal('No publishable promises found. Refusing to publish an empty site (is the data directory intact?).');
  if (prev.officialCount >= 10 && model.pages.length < prev.officialCount * 0.85 && !argv['allow-shrink'])
    fatal(`Official pages would drop from ${prev.officialCount} to ${model.pages.length} (>15%). Looks like a data problem. Re-run with --allow-shrink if intentional.`);

  const ctx = Object.assign({ model }, buildHubs(model));
  const hubs = ctx.hubs;

  // refuse to touch hand-written files that happen to share our paths
  const guard = f => { if (fs.existsSync(f) && !isOurs(f)) fatal(path.relative(ROOT, f).split(path.sep).join('/') + ' exists and was not generated by this script. Not overwriting.'); };
  guard(path.join(ROOT, 'officials', 'index.html'));
  guard(path.join(ROOT, 'methodology', 'index.html'));
  hubs.forEach((_, k) => guard(path.join(ROOT, k, 'index.html')));
  model.pages.forEach(pg => guard(path.join(ROOT, 'officials', pg.slug, 'index.html')));

  // render, then assign lastmod only where content actually changed
  const out = new Map();           // site-relative path -> html with {{LASTMOD}} resolved
  const next = {};
  const stamp = (key, rawHtml, hashInput) => {
    const h = sha(hashInput === undefined ? rawHtml : hashInput);
    const old = prev.pages && prev.pages[key];
    const lastmod = old && old.hash === h ? old.lastmod : TODAY;
    next[key] = { hash: h, lastmod };
    return lastmod;
  };
  const emit = (key, rel, raw) => { const lm = stamp(key, raw); out.set(rel, raw.split('{{LASTMOD}}').join(lm)); };   // every occurrence, not just the first
  if (HOME_LANDING) emit('home', 'index.html', renderHome(ctx));
  model.pages.forEach(pg => emit(`officials/${pg.slug}/`, `officials/${pg.slug}/index.html`, renderOfficial(pg, ctx)));
  emit('officials/', 'officials/index.html', renderDirectory(model.pages, model.roster, hubs));
  emit('methodology/', 'methodology/index.html', renderMethodology());
  hubs.forEach((h, k) => emit(`${k}/`, `${k}/index.html`, renderHub(h, ctx)));

  // sitemap: honest lastmod for generated pages, the SPA (hash of page + data), and static root pages that exist
  const urls = [];
  if (HOME_LANDING) urls.push(['', next['home'].lastmod]);
  const spa = path.join(ROOT, 'aow-index.html');
  if (fs.existsSync(spa)) { stamp('aow-index.html', '', sha(fs.readFileSync(spa, 'utf8')) + dataHash); urls.push(['aow-index.html', next['aow-index.html'].lastmod]); }
  urls.push(['officials/', next['officials/'].lastmod]);
  urls.push(['methodology/', next['methodology/'].lastmod]);
  hubs.forEach((_, k) => urls.push([`${k}/`, next[`${k}/`].lastmod]));
  model.pages.forEach(pg => urls.push([`officials/${pg.slug}/`, next[`officials/${pg.slug}/`].lastmod]));
  LEGAL.forEach(([f]) => { const fp = path.join(ROOT, f); if (fs.existsSync(fp)) { stamp(f, '', fs.readFileSync(fp, 'utf8')); urls.push([f, next[f].lastmod]); } });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, lm]) => `  <url><loc>${esc(SITE + '/' + u)}</loc><lastmod>${lm}</lastmod></url>`).join('\n')}
</urlset>
`;

  const blocked = LEGAL.length ? ['thank-you-donate.html', 'thank-you-subscribe.html'].filter(f => fs.existsSync(path.join(ROOT, f))) : [];
  const robots = `# aow-generated: do not edit by hand; rebuilt by tools/build-pages.js
User-agent: *
Allow: /
${blocked.map(f => 'Disallow: /' + f).join('\n')}${blocked.length ? '\n' : ''}
Sitemap: ${SITE}/sitemap.xml
`;

  const report = [
    'AOW static pages report (deterministic; no timestamps)',
    `data files read: ${fileCount}`,
    HOME_LANDING ? 'home page (/): generated landing page' : 'home page (/): the redirect stub is kept (upload the generated index.html from the SEO bundle to switch to the landing page)',
    `officials with a page: ${model.pages.length}`,
    `promises published on pages: ${model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0)}`,
    `current officials listed by name only (no publishable promises yet): ${model.roster.length}`,
    `hub pages (a group needs at least ${HUB_MIN} people with pages): ${hubs.size}`,
    ...[...hubs.values()].map(h => `  - ${h.key}: ${h.pages.length} with pages, ${h.roster.length} listed by name only`),
    `groups with a page but below that minimum, so no hub yet: ${[...ctx.groups.keys()].filter(k => !hubs.has(k)).length}`,
    `promises held back (fewer than ${MIN_PUBLISHERS} distinct publishers, no primary-record source, or status Undetermined): ${model.excluded.length}`,
    ...model.excluded.map(x => x.reason
      ? `  - ${x.id} (${x.member}): ${x.reason}`
      : `  - ${x.id} (${x.member}): ${x.publishers} publisher(s), primary-record source: ${x.primary ? 'yes' : 'no'}`),
    ''
  ].join('\n');

  // ---- all checks passed: write ----
  let changed = 0;
  out.forEach((html, rel) => { if (writeIfChanged(path.join(ROOT, rel), html)) changed++; });
  const keep = new Set(model.pages.map(pg => pg.slug));
  const offDir = path.join(ROOT, 'officials');
  let removed = 0;
  fs.readdirSync(offDir, { withFileTypes: true }).filter(e => e.isDirectory() && !keep.has(e.name)).forEach(e => {
    const idx = path.join(offDir, e.name, 'index.html');
    const items = fs.readdirSync(path.join(offDir, e.name));
    if (isOurs(idx) && items.length === 1) { fs.rmSync(path.join(offDir, e.name), { recursive: true }); removed++; }
    else warn(`Leaving officials/${e.name}/ in place (not exclusively generated).`);
  });

  // a hub whose group dropped below the minimum is removed, but only if we generated it and it holds nothing else
  const staleHubs = [];
  if (!hubs.has('administration')) staleHubs.push('administration');
  ['congress/senate', 'congress/house'].forEach(k => { if (!hubs.has(k)) staleHubs.push(k); });
  const statesDir = path.join(ROOT, 'states');
  if (fs.existsSync(statesDir)) fs.readdirSync(statesDir, { withFileTypes: true }).filter(e => e.isDirectory() && !hubs.has('states/' + e.name)).forEach(e => staleHubs.push('states/' + e.name));
  staleHubs.forEach(rel => {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) return;
    if (isOurs(path.join(dir, 'index.html')) && fs.readdirSync(dir).length === 1) { fs.rmSync(dir, { recursive: true }); removed++; }
    else warn(`Leaving ${rel}/ in place (not exclusively generated).`);
  });
  ['congress', 'states'].forEach(d => { const p = path.join(ROOT, d); if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmSync(p, { recursive: true }); });

  if (writeIfChanged(path.join(ROOT, 'sitemap.xml'), sitemap) ) changed++;
  const robotsFile = path.join(ROOT, 'robots.txt');
  if (!fs.existsSync(robotsFile) || isOurs(robotsFile)) { if (writeIfChanged(robotsFile, robots)) changed++; }
  else warn('robots.txt exists and is hand-written; left untouched. Make sure it contains: Sitemap: ' + SITE + '/sitemap.xml');
  const manifest = { version: 1, officialCount: model.pages.length, pages: next };
  if (writeIfChanged(manifestFile, JSON.stringify(manifest, null, 1) + '\n')) changed++;
  if (writeIfChanged(path.join(ROOT, 'tools', 'pages-report.txt'), report)) changed++;

  console.log(`Built ${model.pages.length} official pages + directory + methodology + ${hubs.size} hub page${hubs.size === 1 ? '' : 's'}${HOME_LANDING ? ' + home page' : ''}; ${model.excluded.length} promises held back; ${changed} files changed, ${removed} stale pages removed, ${warnings.length} warnings.`);
}
main();
