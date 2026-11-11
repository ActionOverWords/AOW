#!/usr/bin/env node
/*!
 * ActionOverWords — static page generator
 * ------------------------------------------------------------------------
 * Reads the SAME data files the live site renders from (data.js + data/**) and
 * writes crawlable HTML pages with no JavaScript (apart from JSON-LD data blocks, and the home page's two small inline
 * scripts: the redirect and the live headline counts, both described in the home page section below):
 *
 *   index.html                  OFF by default. A home page is written here only if the file in the repo root
 *                               already carries the marker. Normally that file is a hand-written redirect to
 *                               the tracker (no marker), and this script leaves it alone
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
 *   preview/index.html          the redesigned home page, as a PREVIEW: noindex, not in the sitemap or the manifest
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
// AOW's active social accounts, shown in every generated page's footer and listed as sameAs in the site's structured data
// (the tracker, aow-index.html, carries the same two in its footer and JSON-LD). Only accounts that are live and posting.
const SOCIAL = [
  { name: 'Instagram', handle: '@aow_index', url: 'https://www.instagram.com/aow_index/' },
  { name: 'Facebook', handle: '', url: 'https://www.facebook.com/profile.php?id=61594983407204' },
  { name: 'YouTube', handle: '', url: 'https://www.youtube.com/@ActionOverWordsIndex' }
];
// The AdSense publisher account. Google's site verification and its periodic re-checks look for this meta tag in the head of
// the bare domain, so every generated page carries it (index.html is generated once the landing page is on).
const ADSENSE_ACCOUNT = 'ca-pub-2415928011419150';
const MARK = '<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->';
const IN_CI = !!process.env.GITHUB_ACTIONS;

const STATUS = {
  not_started: 'Not started', in_progress: 'In progress', stalled: 'Stalled',
  compromise: 'Compromise', completed: 'Completed', broken: 'Broken'
};
// One definition per status, shared by the methodology page and the home page so they cannot drift apart.
const STATUS_MEANING = {
  not_started: 'Nothing has happened yet.', in_progress: 'Active movement, not yet resolved.', stalled: 'Attempted, but momentum has died.',
  compromise: 'Something was delivered, narrower than promised.', completed: 'Kept as stated.', broken: 'Not kept.'
};
const WEIGHTS = { completed: 100, compromise: 60, in_progress: 40, stalled: 15, not_started: 0, broken: 0 };
// Statuses that only describe work still being done in office. A past administration's or an Archive person's promise
// can't be one of these (see mergeArchivePromises in aow-index.html, which shows them as Undetermined).
const OFFICE_ONLY = new Set(['not_started', 'in_progress', 'stalled']);
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

// "Home" means the landing page at the bare domain only if index.html is a generated file (it carries the marker).
// Normally the bare domain is a hand-written redirect to the tracker, and then "Home" means the interactive tracker.
let HOME_LANDING = false;
const homeHref = up => (HOME_LANDING ? (up || './') : up + 'aow-index.html');
const homeUrl = () => SITE + (HOME_LANDING ? '/' : '/aow-index.html');
// Site-level JSON-LD, identical to the head of aow-index.html (same @id values), so the two pages describe one entity.
const SITE_DESC = 'See what elected officials promised and what happened. Promises are rated from Completed to Broken, with sources. 700+ federal and state officials.';
const SITE_LD = [
  { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'ActionOverWords Index', alternateName: ['AOW Index', 'Action Over Words'],
    description: SITE_DESC, inLanguage: 'en-US', publisher: { '@id': SITE + '/#organization' } },
  { '@type': 'Organization', '@id': SITE + '/#organization', name: 'ActionOverWords Index', url: SITE + '/',
    logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png', width: 512, height: 512 }, email: CONTACT,
    sameAs: SOCIAL.map(s => s.url) }
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

// Inside the administration people are listed by office, in the official order: President, Vice President,
// the 15 executive departments in their legal order of succession (3 U.S.C. 19), then the other Cabinet-level
// officials (EPA, OMB, DNI, CIA, USTR, SBA ...), then the sub-Cabinet agency heads, by last name A to Z
// within those last two groups. Ranked by the office title, never by person, party or score, so the order
// stays right as people change. aow-index.html has the same table (DEPARTMENT_ORDER), so the tracker and
// these pages list the administration the same way.
const DEPARTMENT_ORDER = [
  [/^president\b/i, 1], [/^vice president\b/i, 2],
  [/^secretary of state\b/i, 10], [/^secretary of the treasury\b/i, 11], [/^secretary of (war|defense)\b/i, 12],
  [/^attorney general\b/i, 13], [/^secretary of the interior\b/i, 14], [/^secretary of agriculture\b/i, 15],
  [/^secretary of commerce\b/i, 16], [/^secretary of labor\b/i, 17], [/^secretary of health and human services\b/i, 18],
  [/^secretary of housing and urban development\b/i, 19], [/^secretary of transportation\b/i, 20],
  [/^secretary of energy\b/i, 21], [/^secretary of education\b/i, 22], [/^secretary of veterans affairs\b/i, 23],
  [/^secretary of homeland security\b/i, 24]
];
function officeTitleOf(e) {
  const raw = (e.chamber && e.chamber !== 'Executive') ? e.chamber : (e.seat || e.chamber || '');
  return String(raw).split(' · ')[0].replace(/\s*\(acting\)\s*/i, ' ').trim();
}
function adminRank(e) {
  const title = officeTitleOf(e);
  for (const [re, rank] of DEPARTMENT_ORDER) if (re.test(title)) return rank;
  return adminGroupOf(e) === 'agency' ? 50 : 30;
}
function lastNameKey(name) {
  const parts = String(name || '').replace(/,/g, ' ').trim().split(/\s+/).filter(w => !/^(jr|sr|ii|iii|iv|v)\.?$/i.test(w));
  return ((parts[parts.length - 1] || '') + ' ' + parts.slice(0, -1).join(' ')).toLowerCase();
}
function byAdminPrecedence(a, b) {
  return adminRank(a) - adminRank(b) || lastNameKey(a.name).localeCompare(lastNameKey(b.name)) || String(a.id).localeCompare(String(b.id));
}
const ADMIN_ORDER_NOTE = 'People are listed in the official order: the President, the Vice President, the heads of the executive departments in their legal order of succession, then other Cabinet-level officials and agency heads by last name.';

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
      state: e.state || '', termStart: e.termStart || '', years: e.years || '', chamber: e.chamber || '', level: e.level || '' }, extra || {}));
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
    if (p.status === 'campaign_promise') {                   // a candidate's record, not a verdict: never published here, never scored
      excluded.push({ id: p.id, member: entries.get(p.memberId).name, reason: 'status is Campaign promise (a candidate\'s record, left out of scores)' });
      return;
    }
    if (kind !== 'current' && OFFICE_ONLY.has(p.status)) {   // nobody in a past administration or the Archive holds the office now:
      excluded.push({ id: p.id, member: entries.get(p.memberId).name,  // the live tracker shows these as Undetermined, so they are held back here
        reason: 'status is ' + STATUS[p.status] + ', which can\'t apply to someone not in office (the tracker shows Undetermined until the final outcome is checked)' });
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
const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'";
const LEGAL = [['privacy-policy.html', 'Privacy Policy'], ['terms-of-service.html', 'Terms of Service'], ['cookie-policy.html', 'Cookie Policy'], ['dmca-policy.html', 'Copyright / DMCA'], ['faq.html', 'FAQ']];

// mainClass: leave undefined for the normal narrow reading column. The home page passes '' because its sections
// (a full-width hero, then alternating bands) bring their own wrappers.
// headExtra: extra markup for the head (the home page's redirect script). csp: replaces the default policy; the home page
// uses it to allow exactly that one inline script by its hash.
// Share picture (Open Graph). A few sections have their own; every other page, official pages included,
// keeps og-image.png. The files live in brand/og/ and are uploaded with the rest of the brand package;
// a page whose picture is missing still shares, just with nothing to show, so adding one here is safe.
const OG_DEFAULT = ['og-image.png', 'ActionOverWords Index: What they said. What happened.'];
// 'page' matches that one address; 'section' matches it and everything under it (the state and
// Congress hubs). A person's own page under /officials/ is not the directory, so it keeps the default.
const OG_PAGES = [
  ['page', '/', 'og-home.png', 'ActionOverWords Index. What they said. What happened.'],
  ['page', '/methodology/', 'og-methodology.png', 'ActionOverWords Index methodology. Our sourcing standard: one government record, one left-leaning outlet, one right-leaning outlet.'],
  ['page', '/officials/', 'og-officials.png', 'ActionOverWords Index officials directory. One standard. Every official.'],
  ['page', '/administration/', 'og-administration.png', 'ActionOverWords Index administration. Decide for yourself.'],
  ['section', '/congress/', 'og-congress.png', 'ActionOverWords Index, U.S. Congress. Look closer.'],
  ['section', '/states/', 'og-states.png', 'ActionOverWords Index states. Action over words.'],
];
function shareImage(canonical) {
  const p = String(canonical).startsWith(SITE) ? (String(canonical).slice(SITE.length) || '/') : '/';
  for (const [kind, at, file, alt] of OG_PAGES) {
    if (p === at || (kind === 'section' && p.startsWith(at))) return [`brand/og/${file}`, alt];
  }
  return OG_DEFAULT;
}

// The logo artwork (logo kit v1.0, direction Ring), used by the header and, as a faint picture, by the watermark.
const LOGO_INNER = '<span class="logo-mark" aria-hidden="true"><svg class="aow-sym" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166.55 181.3" width="29.4" height="32" aria-hidden="true" focusable="false"><path d="M146.33 56.97A41.65 41.65 0 0 1 147.23 65.62L147.23 102.64A41.65 41.65 0 0 1 105.59 144.28L61.09 144.28L12.72 179.75A7.99 7.99 0 0 1 0 173.31L0 65.62A41.65 41.65 0 0 1 41.65 23.97L105.59 23.97A41.65 41.65 0 0 1 113.08 24.65L100.03 39.95L41.65 39.95A25.66 25.66 0 0 0 15.98 65.62L15.98 157.53L53.75 129.84A7.99 7.99 0 0 1 58.47 128.3L105.59 128.3A25.66 25.66 0 0 0 131.25 102.64L131.25 74.66L146.33 56.97ZM36.37 83.3L66.41 113.33A13.88 13.88 0 0 0 86.79 112.53L163.23 22.89A13.88 13.88 0 0 0 142.11 4.88L75.41 83.08L56.01 63.67A13.88 13.88 0 0 0 36.37 83.3Z" class="s"/></svg></span><span class="logo-word"><span class="lw-full"><svg class="aow-wm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1147.4 181.3" width="202.52" height="32" role="img" aria-label="ActionOverWords Index"><g class="w"><path d="M40.15 120.63L65.85 48.33H83.5L109.25 120.63H92.35L87 105.23H62.6L57.15 120.63ZM66.3 90.58H83.05L74.7 64.68ZM138 121.63Q130.7 121.63 124.93 118.35Q119.15 115.08 115.83 109.08Q112.5 103.08 112.5 95.03Q112.5 86.98 115.75 80.88Q119 74.78 124.75 71.35Q130.5 67.93 138 67.93Q144.9 67.93 149.78 70.8Q154.65 73.68 157.33 78.45Q160 83.23 160.25 88.88H146.3Q146.05 87.13 145.18 85.23Q144.3 83.33 142.6 82Q140.9 80.68 138.15 80.68Q133.7 80.68 130.98 84.2Q128.25 87.73 128.25 94.83Q128.25 101.83 131.03 105.78Q133.8 109.73 138.45 109.73Q141.15 109.73 142.85 108.28Q144.55 106.83 145.4 104.93Q146.25 103.03 146.45 101.58H160.05Q159.9 107.03 157.18 111.58Q154.45 116.13 149.58 118.88Q144.7 121.63 138 121.63ZM191.7 121.28Q184.25 121.28 180.18 119.4Q176.1 117.53 174.53 114.25Q172.95 110.98 172.95 106.83V80.58H164.55V68.93H173.55L177.9 53.08H189.95V68.83H201.3V80.58H189.95L190 106.08Q190 108.38 191.03 109Q192.05 109.63 193.85 109.63H201.4V119.88Q200.35 120.38 198.15 120.83Q195.95 121.28 191.7 121.28ZM210.4 63.13V48.33H226.75V63.13ZM210.45 120.63V68.93H226.65V120.63ZM260.95 121.63Q253.15 121.63 247.4 118.3Q241.65 114.98 238.5 109.03Q235.35 103.08 235.35 95.08Q235.35 86.98 238.58 80.85Q241.8 74.73 247.58 71.33Q253.35 67.93 261.05 67.93Q268.9 67.93 274.63 71.35Q280.35 74.78 283.48 80.9Q286.6 87.03 286.6 95.08Q286.6 102.83 283.5 108.83Q280.4 114.83 274.65 118.23Q268.9 121.63 260.95 121.63ZM261.05 109.13Q264.5 109.13 266.45 106.95Q268.4 104.78 269.2 101.4Q270 98.03 270 94.53Q270 91.08 269.25 87.8Q268.5 84.53 266.55 82.38Q264.6 80.23 261.05 80.23Q257.5 80.23 255.53 82.3Q253.55 84.38 252.75 87.65Q251.95 90.93 251.95 94.53Q251.95 97.93 252.7 101.3Q253.45 104.68 255.43 106.9Q257.4 109.13 261.05 109.13ZM295.25 120.63V68.93H312.05V76.18Q313.75 73.53 317.08 71.05Q320.4 68.58 326.5 68.58Q331.15 68.58 335.28 70.38Q339.4 72.18 342 76.1Q344.6 80.03 344.6 86.38V120.63H327.5V88.63Q327.5 85.23 325.3 83.5Q323.1 81.78 320.25 81.78Q317.35 81.78 314.8 83.4Q312.25 85.03 312.25 88.23V120.63Z"/><path d="M386.75 121.63Q376.75 121.63 369.48 117.23Q362.2 112.83 358.23 104.55Q354.25 96.28 354.25 84.63Q354.25 72.93 358.25 64.58Q362.25 56.23 369.55 51.78Q376.85 47.33 386.75 47.33Q396.6 47.33 403.83 51.78Q411.05 56.23 415 64.58Q418.95 72.93 418.95 84.63Q418.95 96.23 415.05 104.5Q411.15 112.78 403.9 117.2Q396.65 121.63 386.75 121.63ZM386.75 111.43Q395.65 111.43 400.68 105.1Q405.7 98.78 405.7 84.78Q405.7 70.53 400.63 64.03Q395.55 57.53 386.75 57.53Q377.95 57.53 372.78 64.05Q367.6 70.58 367.6 84.78Q367.6 98.83 372.78 105.13Q377.95 111.43 386.75 111.43ZM444.55 120.63L425.45 68.93H436.6L449 105.13H449.65L462 68.93H473.2L454.15 120.63ZM503 121.63Q495.55 121.63 489.88 118.45Q484.2 115.28 481.03 109.38Q477.85 103.48 477.85 95.33Q477.85 87.38 480.73 81.2Q483.6 75.03 489.08 71.48Q494.55 67.93 502.3 67.93Q513.75 67.93 519.75 75.05Q525.75 82.18 525.75 93.88V97.58H490Q489.95 104.18 493.2 108.4Q496.45 112.63 502.75 112.63Q507.05 112.63 510.23 110.7Q513.4 108.78 514.45 104.83H525.55Q524.65 110.23 521.28 113.98Q517.9 117.73 513.08 119.68Q508.25 121.63 503 121.63ZM489.95 90.03H514.25Q514.25 84.43 511.3 80.55Q508.35 76.68 502.25 76.68Q498.25 76.68 495.5 78.63Q492.75 80.58 491.35 83.65Q489.95 86.73 489.95 90.03ZM536.95 120.63V68.93H548.6V80.13Q550.5 74.38 554.73 71.15Q558.95 67.93 564.5 67.93Q565.4 67.93 566.23 68.03Q567.05 68.13 567.5 68.38V80.03Q566.95 79.78 566.08 79.68Q565.2 79.58 564.55 79.58Q557.05 78.98 553.08 81.9Q549.1 84.83 549.1 90.58V120.63Z"/><path d="M593.05 120.63L572.2 48.33H581.55L597.55 105.88L613.85 48.33H621.1L637.35 105.88L653.65 48.33H662.95L641.85 120.63H633.3L617.45 64.58L601.35 120.63ZM688.65 121.63Q677.9 121.63 671.43 114.78Q664.95 107.93 664.95 94.98Q664.95 86.88 667.7 80.78Q670.45 74.68 675.75 71.3Q681.05 67.93 688.7 67.93Q699.35 67.93 705.78 74.93Q712.2 81.93 712.2 94.98Q712.2 102.88 709.53 108.88Q706.85 114.88 701.6 118.25Q696.35 121.63 688.65 121.63ZM688.7 114.33Q695.6 114.33 699.33 109.1Q703.05 103.88 703.05 94.78Q703.05 89.23 701.58 84.8Q700.1 80.38 696.93 77.78Q693.75 75.18 688.7 75.18Q681.65 75.18 677.9 80.35Q674.15 85.53 674.15 94.78Q674.15 100.23 675.63 104.68Q677.1 109.13 680.3 111.73Q683.5 114.33 688.7 114.33ZM724.1 120.63V68.93H732.9V78.88Q734.85 73.33 739.08 70.63Q743.3 67.93 748.2 67.93Q749.35 67.93 750.43 68.08Q751.5 68.23 752.15 68.58V77.53Q751.4 77.18 750.23 77.05Q749.05 76.93 748.25 76.93Q742.1 76.53 737.7 79.28Q733.3 82.03 733.3 88.48V120.63ZM780.85 121.63Q770.75 121.63 764.88 114.73Q759 107.83 759 94.58Q759 82.48 764.3 75.2Q769.6 67.93 780.1 67.93Q785.05 67.93 788.53 69.53Q792 71.13 794.1 73.28Q796.2 75.43 797.05 77.13V46.33H806.4V120.63H799.3L798.3 110.03Q797.65 112.03 795.88 114.78Q794.1 117.53 790.5 119.58Q786.9 121.63 780.85 121.63ZM782.5 114.53Q790.3 114.53 793.68 109.75Q797.05 104.98 797.05 94.13Q796.95 85.08 793.65 80.1Q790.35 75.13 782.65 75.13Q776.3 75.13 772.3 79.65Q768.3 84.18 768.3 94.13Q768.3 103.83 771.9 109.18Q775.5 114.53 782.5 114.53ZM839.85 121.63Q834.45 121.63 829.83 119.93Q825.2 118.23 822.15 114.7Q819.1 111.18 818.35 105.58H826.75Q827.75 110.13 831.33 112.43Q834.9 114.73 839.8 114.73Q845.05 114.73 848.25 112.78Q851.45 110.83 851.45 106.78Q851.45 101.33 844.55 99.68L833.85 97.03Q827.6 95.53 823.88 92.33Q820.15 89.13 820.1 83.38Q820.1 76.58 825.03 72.25Q829.95 67.93 839.8 67.93Q848.2 67.93 853.38 71.73Q858.55 75.53 858.8 82.78H850.6Q850.1 79.08 847.3 76.9Q844.5 74.73 839.7 74.73Q834.75 74.73 831.65 76.7Q828.55 78.68 828.55 82.83Q828.55 85.58 830.78 87.15Q833 88.73 837.25 89.78L847.65 92.38Q852.4 93.63 855.03 95.93Q857.65 98.23 858.7 100.98Q859.75 103.73 859.75 106.28Q859.75 113.43 854.53 117.53Q849.3 121.63 839.85 121.63Z"/></g><g class="i"><path d="M903.36 120.63V48.33H914.06V120.63ZM930.06 120.63V68.93H940.51V76.38Q942.36 73.28 946.28 70.78Q950.21 68.28 956.36 68.28Q961.21 68.28 965.33 70.2Q969.46 72.13 971.96 76.2Q974.46 80.28 974.46 86.73V120.63H963.76V87.88Q963.76 82.33 960.76 79.63Q957.76 76.93 953.11 76.93Q949.91 76.93 947.08 77.98Q944.26 79.03 942.51 81.15Q940.76 83.28 940.76 86.48V120.63ZM1006.86 121.63Q996.66 121.63 990.81 114.65Q984.96 107.68 984.96 94.53Q984.96 82.43 990.26 75.18Q995.56 67.93 1005.96 67.93Q1010.56 67.93 1013.91 69.38Q1017.26 70.83 1019.41 72.9Q1021.56 74.98 1022.51 76.78V46.33H1033.31V120.63H1025.26L1024.06 110.03Q1023.36 112.28 1021.53 114.98Q1019.71 117.68 1016.18 119.65Q1012.66 121.63 1006.86 121.63ZM1008.91 113.58Q1016.16 113.58 1019.33 109.05Q1022.51 104.53 1022.51 94.18Q1022.41 85.43 1019.28 80.75Q1016.16 76.08 1009.11 76.08Q1003.16 76.08 999.38 80.35Q995.61 84.63 995.61 94.18Q995.61 103.58 999.03 108.58Q1002.46 113.58 1008.91 113.58ZM1069.81 121.63Q1062.46 121.63 1056.86 118.45Q1051.26 115.28 1048.13 109.38Q1045.01 103.48 1045.01 95.33Q1045.01 87.28 1047.86 81.1Q1050.71 74.93 1056.08 71.43Q1061.46 67.93 1069.11 67.93Q1080.31 67.93 1086.23 74.95Q1092.16 81.98 1092.16 93.73V97.28H1055.76Q1055.71 104.23 1059.18 108.88Q1062.66 113.53 1069.56 113.53Q1074.21 113.53 1077.58 111.43Q1080.96 109.33 1082.01 105.18H1091.91Q1090.96 110.53 1087.66 114.18Q1084.36 117.83 1079.63 119.73Q1074.91 121.63 1069.81 121.63ZM1055.76 90.33H1081.96Q1081.96 84.23 1078.78 80Q1075.61 75.78 1069.06 75.78Q1064.61 75.78 1061.63 77.93Q1058.66 80.08 1057.21 83.43Q1055.76 86.78 1055.76 90.33ZM1095.81 120.63L1115.71 93.73L1097.46 68.93H1108.96L1121.66 86.08L1134.36 68.93H1145.86L1127.46 93.73L1147.41 120.63H1135.91L1121.61 101.28L1107.36 120.63Z"/></g></svg></span><span class="lw-short"><svg class="aow-wm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 571.45 181.3" width="100.86" height="32" role="img" aria-label="AOW Index"><g transform="scale(1.02778)"><g class="w"><path d="M36.16 119.7L61.85 47.4H79.5L105.25 119.7H88.36L83 104.3H58.6L53.16 119.7ZM62.3 89.65H79.06L70.7 63.75Z"/><path d="M144.1 120.7Q134.1 120.7 126.83 116.3Q119.56 111.9 115.58 103.62Q111.61 95.35 111.61 83.7Q111.61 72 115.61 63.65Q119.61 55.3 126.91 50.85Q134.21 46.4 144.1 46.4Q153.96 46.4 161.18 50.85Q168.41 55.3 172.35 63.65Q176.31 72 176.31 83.7Q176.31 95.3 172.41 103.57Q168.5 111.85 161.25 116.27Q154 120.7 144.1 120.7ZM144.1 110.5Q153 110.5 158.03 104.17Q163.06 97.85 163.06 83.85Q163.06 69.6 157.97 63.1Q152.91 56.6 144.1 56.6Q135.31 56.6 130.12 63.12Q124.95 69.65 124.95 83.85Q124.95 97.9 130.12 104.2Q135.31 110.5 144.1 110.5Z"/><path d="M203.75 119.7L182.91 47.4H192.25L208.25 104.95L224.56 47.4H231.81L248.06 104.95L264.36 47.4H273.65L252.56 119.7H244L228.16 63.65L212.06 119.7Z"/></g><g class="i"><path d="M310.7 119.7V47.4H322.86V119.7ZM337.7 119.7V68H349.61V75.4Q351.4 72.4 355.18 69.9Q358.95 67.4 365.15 67.4Q369.95 67.4 374.07 69.3Q378.2 71.2 380.73 75.25Q383.25 79.3 383.25 85.7V119.7H371.06V87.15Q371.06 82.1 368.23 79.6Q365.4 77.1 361.2 77.1Q356.81 77.1 353.32 79.3Q349.86 81.5 349.86 85.95V119.7ZM414.65 120.7Q404.4 120.7 398.56 113.65Q392.7 106.6 392.7 93.6Q392.7 81.45 398 74.22Q403.31 67 413.56 67Q419.95 67 424.06 69.8Q428.15 72.6 429.75 75.55V45.4H442V119.7H433L431.65 109.1Q430.86 111.55 428.98 114.25Q427.11 116.95 423.65 118.82Q420.2 120.7 414.65 120.7ZM417.15 111.75Q423.75 111.75 426.75 107.47Q429.75 103.2 429.75 93.3Q429.7 84.85 426.73 80.45Q423.75 76.05 417.31 76.05Q411.81 76.05 408.27 80.1Q404.75 84.15 404.75 93.3Q404.75 102.4 408 107.07Q411.25 111.75 417.15 111.75ZM477.81 120.7Q470.36 120.7 464.68 117.52Q459 114.35 455.82 108.45Q452.65 102.55 452.65 94.4Q452.65 86.45 455.52 80.27Q458.4 74.1 463.88 70.55Q469.36 67 477.11 67Q488.56 67 494.56 74.12Q500.56 81.25 500.56 92.95V96.65H464.81Q464.75 103.25 468 107.47Q471.25 111.7 477.56 111.7Q481.86 111.7 485.02 109.77Q488.2 107.85 489.25 103.9H500.36Q499.45 109.3 496.07 113.05Q492.7 116.8 487.88 118.75Q483.06 120.7 477.81 120.7ZM464.75 89.1H489.06Q489.06 83.5 486.11 79.62Q483.15 75.75 477.06 75.75Q473.06 75.75 470.31 77.7Q467.56 79.65 466.15 82.72Q464.75 85.8 464.75 89.1ZM503.06 119.7L522.9 92.8L504.7 68H517.61L529.55 84.15L541.5 68H554.46L536.11 92.8L556 119.7H543.11L529.5 101.3L515.96 119.7Z"/></g></g></svg></span></span>';
// Links in the header of every page except the home page, which links to its own sections instead.
const SITE_NAV = [['officials/', 'Officials'], ['methodology/', 'Methodology'], ['about/', 'About'], ['contact/', 'Contact']];
const HUB_PATH = /^(officials|administration|congress|states)\//;

// One page shell for every generated page (the redesign, "The record": see the V2_ section further down).
// A normal page's body starts with its breadcrumbs, heading and .sub line; those go in the deep green title band and the
// rest goes in the page column. `head` replaces that opening for a page with its own band (an official's page).
// mainClass '' (the home page): the body brings its own sections and wrappers.
// nav: the header links (the home page passes its own). wrapClass: a class on the page wrapper ('home').
function layout({ depth, title, description, canonical, body, ld, lastmodToken, extraCss, mainClass, headExtra, csp, nav, head, wrapClass }) {
  const [ogImage, ogAlt] = shareImage(canonical);
  const up = '../'.repeat(depth);
  const here = String(canonical).slice(SITE.length + 1);
  const section = HUB_PATH.test(here) ? 'officials/' : here;
  const navHtml = nav || SITE_NAV.map(([href, label]) => `<a href="${up}${href}"${href === here ? ' aria-current="page"' : href === section ? ' aria-current="true"' : ''}>${label}</a>`).join('');
  let main = body;
  if (mainClass === undefined) {
    let rest = body;
    if (!head) {
      const m = /^\s*(<nav class="crumbs"[^>]*>[\s\S]*?<\/nav>\s*<h1>[\s\S]*?<\/h1>\s*<p class="sub">[\s\S]*?<\/p>)\n/.exec(body);
      if (!m) fatal('layout(): the body of "' + title + '" does not start with breadcrumbs, a heading and a .sub line.');
      head = m[1];
      rest = body.slice(m[0].length);
    }
    main = `<div class="band-top"><div class="wrap">\n${head}\n</div></div>\n<div class="wrap page">\n${rest}\n</div>`;
  }
  const legal = [`<li><a href="${up}about/">About</a></li>`, `<li><a href="${up}contact/">Contact</a></li>`, `<li><a href="${up}methodology/">Methodology</a></li>`,
    `<li><a href="${up}aow-index.html#newsletter">Weekly email</a></li>`]   // the sign-up lives in the tracker (these pages run no scripts)
    .concat(LEGAL.filter(([f]) => fs.existsSync(path.join(ROOT, f))).map(([f, l]) => `<li><a href="${up}${f}">${l}</a></li>`)).join('');
  const follow = SOCIAL.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="me noopener noreferrer">${esc(s.name)}${s.handle ? ` ${esc(s.handle)}` : ''} <span aria-hidden="true">&#8599;</span></a></li>`).join('');
  return `<!DOCTYPE html>
${MARK}
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(csp || CSP)}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="max-image-preview:large">
<meta name="google-adsense-account" content="${ADSENSE_ACCOUNT}">
${headExtra || ''}<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="ActionOverWords Index">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(SITE)}/${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0D4A43">
<link rel="icon" href="${up}favicon.ico" sizes="32x32">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${v2StaticCss()}${v2WatermarkCss()}${V2_PAGE_CSS}${extraCss || ''}</style>
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>` : ''}
</head>
<body class="${V2_BODY_CLASS}">
<div${wrapClass ? ` class="${wrapClass}"` : ''}>
<header class="top"><div class="wrap"><a class="logo" href="${homeHref(up)}">${LOGO_INNER}</a><nav class="nav" aria-label="Main">${navHtml}</nav><div class="acts"><a class="btn primary sm" href="${up}aow-index.html">Open the tracker</a></div></div></header>
<main>
${main}
</main>
<footer class="foot"><div class="wrap foot-grid"><div><h2>ActionOverWords Index</h2><p>ActionOverWords Index is an independent, nonpartisan tracker of specific promises made by U.S. officials, federal and state. Last updated ${lastmodToken}. Spot an error? <a href="mailto:${CONTACT}">${CONTACT}</a></p></div><div><h2>Follow us</h2><ul>${follow}</ul></div><div><h2>The site</h2><ul>${legal}</ul></div></div></footer>
</div>
</body>
</html>
`;
}

// Small pieces every page type shares.
const v2Ring = (sc, cls) => `<div class="ring${cls ? ' ' + cls : ''} ${tierOf(sc)}" style="--p:${sc === null ? 0 : sc}" role="img" aria-label="${sc === null ? 'No AOW Score yet' : 'AOW Score ' + sc + ' out of 100'}"><b>${sc === null ? '—' : sc}</b></div>`;
const v2Party = p => (p ? `<span class="party p${partyKey(p).charAt(0)}"><i></i>${esc(partyLabel(p))}</span>` : '<span class="party"></span>');
function v2Mix(dist, total) {
  const keys = Object.keys(STATUS).filter(k => dist[k]);
  const label = keys.map(k => `${dist[k]} ${STATUS[k].toLowerCase()}`).join(', ');
  return total ? `<div class="mix" role="img" aria-label="${esc(label)}">${keys.map(k => `<i class="b-${k}" style="flex:${dist[k]}"></i>`).join('')}</div>` : '';
}
function initialsOf(name) {
  const parts = String(name).replace(/,?\s+(?:Jr|Sr|II|III|IV)\.?$/i, '').replace(/["“”(][^"“”)]*["“”)]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
}
// Which of the three kinds of source the standard asks for a linked source is. Same lists as sourceKind() in
// aow-index.html: an outlet on neither list is a plain news report and ticks nothing. Keep the two in step.
const KIND_MAINSTREAM = /^(pbs|politifact|ms now|msnbc|allsides|nbc|the hill|bloomberg|cbs)\b/;
const KIND_RIGHT = /^(fox news|fox business|fox ?\d+|national review|washington examiner|(the )?daily caller|townhall|(the )?american conservative|redstate|(the )?daily wire|washington free beacon|the federalist|(the )?washington times|cato institute)\b/;
function sourceKind(s) {
  if (PRIMARY_TYPES.has(s.type)) return 0;
  if (s.type !== 'news_report') return -1;
  const name = String(s.publisher || '').toLowerCase().trim();
  return KIND_MAINSTREAM.test(name) ? 1 : KIND_RIGHT.test(name) ? 2 : -1;
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
  return `<li class="row"><div class="who"><span class="mono" aria-hidden="true">${esc(initialsOf(pg.name))}</span><div><a class="name" href="${prefix}${esc(pg.slug)}/">${esc(pg.name)}</a><span class="seat">${esc(seatText(pg.primary.seat))}</span></div></div>${v2Party(pg.primary.party)}<div class="kept">${all.length} promise${all.length === 1 ? '' : 's'}${v2Mix(distOf(all), all.length)}</div>${v2Ring(sc)}</li>`;
}
function rosterRow(e) {
  return `<li class="row"><span class="name">${esc(e.name)}</span>${v2Party(e.party)}<span class="seat">${esc(seatText(e.seat))}</span></li>`;
}

// "More from ..." on an official's page: the next few people in the same group, in the hub's order (by name;
// by office for the administration),
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
${pick.length ? `<ul class="dir names">${pick.map(x => `<li class="row"><a class="name" href="../${esc(x.slug)}/">${esc(x.name)}</a>${v2Party(x.primary.party)}<span class="seat">${esc(seatText(x.primary.seat))}</span></li>`).join('')}</ul>` : ''}
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

  const multi = pg.roles.length > 1;
  const entry = p => {
    const found = [false, false, false];
    p.sources.forEach(s => { const k = sourceKind(s); if (k >= 0) found[k] = true; });
    const checks = V2_SOURCE_KINDS.filter((_, i) => found[i]).map(k => `<li>${V2_TICK}${k}</li>`).join('');
    return `
<article class="entry" id="${esc(p.id)}">
<div class="said"><h3 class="q">${esc(p.text)}</h3>${p.category ? `<p class="cat">${esc(p.category)}</p>` : ''}${checks ? `<ul class="src3" aria-label="Kinds of sources found">${checks}</ul>` : ''}</div>
<div class="did"><p class="pills"><span class="pill s-${p.status}">${esc(STATUS[p.status])}</span></p>
${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
<ul class="links">${p.sources.map(s => `<li><span>${esc(SRC_TYPE[s.type] || 'Source')}</span><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.publisher)}</a></li>`).join('')}</ul></div>
</article>`;
  };
  const roles = pg.roles.map(r => {
    const sc = scoreOf(r.all), d = distOf(r.all);       // score uses ALL tracked promises, same as the interactive tracker
    const hidden = r.all.length - r.shown.length;
    return `
<section class="role" aria-labelledby="r-${esc(r.entry.id)}">
<div class="sec-head">${multi ? v2Ring(sc) : ''}<div><h2 id="r-${esc(r.entry.id)}">${esc(roleLabel(r.entry))}</h2><p class="count">${r.all.length} tracked promise${r.all.length === 1 ? '' : 's'}</p></div></div>
<p class="summary">${esc(roleSummary(pg.name, r, sc, d))}</p>
${multi ? v2Mix(d, r.all.length) : ''}
${hidden ? `<p class="held">${r.shown.length} of ${r.all.length} are listed on this page; the rest do not yet meet the three-publisher sourcing standard for publication here and appear only in the interactive tracker.</p>` : ''}
${r.shown.length ? `<div class="ledger"><div class="ledger-head" aria-hidden="true"><span>What they said</span><span>What happened</span></div>${r.shown.map(entry).join('')}
</div>` : ''}
</section>`;
  }).join('\n');

  // The band: the name, the facts, and the score box for the first role listed (the current one when there is one).
  const r0 = pg.roles[0], sc0 = scoreOf(r0.all), d0 = distOf(r0.all);
  const head = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../../')}">Home</a> › <a href="../">Officials</a> › ${esc(pg.name)}</nav>
<div class="profile">
<div><h1>${esc(pg.name)}</h1>
<ul class="facts">${p0.party ? `<li>${v2Party(p0.party)}</li>` : ''}<li><strong>${esc(seatText(p0.seat))}</strong></li>${p0.termStart && p0.kind === 'current' ? `<li>In this role since ${esc(p0.termStart)}</li>` : ''}</ul></div>
<div class="scorebox"><div class="head">${v2Ring(sc0, 'lg')}<div><b class="t">AOW Score</b><span class="d">Based on ${r0.all.length} tracked promise${r0.all.length === 1 ? '' : 's'}${multi ? ' as ' + esc(roleWhere(r0.entry)) : ''}</span></div></div>
${v2Mix(d0, r0.all.length)}
<ul class="tally">${Object.keys(STATUS).filter(k => d0[k]).map(k => `<li><i class="b-${k}"></i>${esc(STATUS[k])}<b>${d0[k]}</b></li>`).join('')}</ul></div>
</div>`;
  const priors = pg.priors.length ? `<section class="role"><h2>Earlier offices</h2><p class="summary">${pg.priors.map(e => esc(seatText(e.seat) + (e.years ? ' (' + e.years + ')' : ''))).join(' · ')}</p></section>` : '';
  const body = `
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
  return layout({ depth: 2, title, description: desc, canonical, body, head, ld, lastmodToken: '{{LASTMOD}}' });
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
  if (bySec.has('0|Federal administration')) bySec.get('0|Federal administration').sort((a, b) => byAdminPrecedence(a.primary, b.primary));
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
  if (rBy.has('0|Federal administration')) rBy.get('0|Federal administration').sort(byAdminPrecedence);
  const rKeys = [...rBy.keys()].sort((a, b) => a.split('|')[0].localeCompare(b.split('|')[0]) || a.split('|')[1].localeCompare(b.split('|')[1]));
  const rosterHtml = roster.length ? `
<h2 id="all-officials" style="margin-top:44px">Everyone else on the roster</h2>
<p class="sub">${roster.length} more current officials are tracked in <a href="../aow-index.html">the interactive tracker</a> and have no promises published on this site yet. A page appears here automatically once an official has promises that meet the sourcing standard.</p>
${rKeys.map(k => `<section class="dir-sec"><h3>${hubLink(k, k.split('|')[1])}</h3><ul class="dir names">${rBy.get(k).map(rosterRow).join('')}</ul></section>`).join('')}` : '';
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
  // ...except the administration, which is listed by office (byAdminPrecedence)
  if (groups.has('administration')) groups.get('administration').sort((a, b) => byAdminPrecedence(a.primary, b.primary));
  if (rosterBy.has('administration')) rosterBy.get('administration').sort(byAdminPrecedence);
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

  // sections are structural (office type), listed in a fixed order; inside each, people are by name, except the
  // administration, which is by office (byAdminPrecedence, applied in buildHubs)
  const secs = h.key === 'administration' ? ADMIN_SECS.map(([k, l]) => [l, e => adminGroupOf(e) === k])
    : /^states\//.test(h.key) ? STATE_SECS.map(([k, l]) => [l, e => stateGroupOf(e) === k]) : null;
  const split = (items, entryOf, only) => (secs ? secs.map(([l, test]) => [l, items.filter(x => test(entryOf(x)))]).filter(([, xs]) => xs.length) : [[only, items]]);
  const pageSecs = split(h.pages, pg => pg.primary, cap(m.who) + ' with promises published');
  const rosterSecs = split(h.roster, e => e, '');

  const rosterHtml = h.roster.length ? `
<h2 id="all-officials" style="margin-top:44px">Everyone else on the roster</h2>
<p class="sub">${h.roster.length} more current ${esc(h.roster.length === 1 ? m.one : m.who)} ${h.roster.length === 1 ? 'is' : 'are'} tracked in <a href="${up}aow-index.html">the interactive tracker</a> and ${h.roster.length === 1 ? 'has' : 'have'} no promises published on this site yet. A page appears here automatically once an official has promises that meet the sourcing standard.</p>
${rosterSecs.map(([l, xs]) => `<section class="dir-sec">${secs ? `<h3>${esc(l)}</h3>` : ''}<ul class="dir names">${xs.map(rosterRow).join('')}</ul></section>`).join('')}` : '';

  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref(up)}">Home</a> › <a href="${up}officials/">Officials</a> › ${esc(m.label)}</nav>
<h1>${esc(m.h1)}</h1>
<p class="sub">${esc(nOf(h.pages.length, m.one, m.who))} ${h.pages.length === 1 ? 'has' : 'have'} promises published here, ${total} in all. Every published promise carries sources from at least three distinct publishers, including at least one primary record. ${h.key === 'administration' ? ADMIN_ORDER_NOTE : 'People are listed alphabetically within each group.'} See the <a href="${up}methodology/">methodology</a> for how sources, statuses and scores work.</p>
${pageSecs.map(([l, xs]) => `<section class="dir-sec"><h2>${esc(l)}</h2><ul class="dir">${xs.map(pg => dirRow(pg, up + 'officials/')).join('')}</ul></section>`).join('')}
${rosterHtml}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': canonical + '#webpage', url: canonical, name: title, description, dateModified: '{{LASTMOD}}', inLanguage: 'en-US', mainEntity: { '@id': canonical + '#list' } },
      { '@type': 'ItemList', '@id': canonical + '#list', numberOfItems: h.pages.length,
        itemListElement: pageSecs.flatMap(([, xs]) => xs).map((pg, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/officials/${pg.slug}/`, name: pg.name })) },
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
  const meaning = STATUS_MEANING;
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
<p>ActionOverWords Index tracks specific promises made by U.S. officials, federal and state, and shows whether each one has been kept, broken, or something in between. Most political coverage tracks what officials say. This tracks what actually happened to what they said.</p>
<p>The same standard applies whether a promise came from a Democrat or a Republican, because accountability that only works for one side isn't accountability. Officials who were appointed rather than elected, such as Cabinet secretaries and senior agency heads, are included and are marked Appointed in the interactive tracker.</p>

<h2 id="sourcing">How each promise is sourced</h2>
<p>Our standard is three kinds of sources for each promise: one official government source (a vote record, a signed bill, an agency filing, or similar primary record), one mainstream/left-leaning news source, and one right-leaning news source. A status is meant to hold up across all three, not just one outlet's version of events. The three-source standard exists so that a status doesn't rest on reporting from only one side of the aisle.</p>
<p>A promise to introduce, sponsor or pass a specific, named bill is checked against the congressional record, which shows exactly what happened to the bill. For other promises, such as a policy goal or a campaign commitment, the standard is all three kinds of sources.</p>
<p>This is a new dataset, and sourcing is still being completed for many entries. Many of those entries carry a <strong>Still finding sources</strong> tag in the interactive tracker instead of being presented as fully verified. A status is our good-faith reading of the sources linked on the entry, not an audited record, and every call is open to appeal (see Corrections and appeals below).</p>
<p>Every source is linked on the promise and labeled by type: campaign statement, interview, voting record, official record, the official's own office, or news report. A campaign statement and an independently reported outcome are not presented as equally strong evidence, and the reader weighs the sources rather than being told what to think.</p>
<p>A promise is listed on the pages of this site only when its sources come from at least three distinct publishers and at least one of them is a primary record: an official record, a voting record, or the official's own office. Promises that do not yet meet that standard stay in the interactive tracker, and an official's page says when some of their tracked promises are not listed yet.</p>

<h2 id="statuses">The six statuses</h2>
<p>Every promise gets one of six statuses, based on what has actually happened, not on intent.</p>
<dl class="defs">
${Object.keys(STATUS).map(k => `<dt><span class="pill s-${k}">${esc(STATUS[k])}</span></dt><dd>${esc(meaning[k])}</dd>`).join('\n')}
</dl>
<p>A promise whose outcome has not been fully verified shows <strong>Undetermined</strong> in the interactive tracker. That is a placeholder, not a verdict. It is left out of the AOW Score until it is resolved, and it is not published on these pages.</p>
<p>Candidates on the ballot are the one exception to the six statuses: from 60 days before their election, each of their promises shows <strong>Campaign promise</strong> in the interactive tracker. That is a record of what they said they would do if elected, not a verdict, and it is left out of the AOW Score. A pledge made for a race keeps that label after election day, because nothing a candidate promised can be under way before they hold the office: if they lost, it stays a record of what they promised; if they won, it starts being tracked when the term they ran for begins.</p>
<p>The same logic applies to anyone who has left office. A promise from a term that is over shows its final outcome (<strong>Completed</strong>, <strong>Compromise</strong> or <strong>Broken</strong>), or <strong>Undetermined</strong> until that outcome has been checked. It never shows Not started, In progress or Stalled, which describe work still being done in office.</p>

<h2 id="aow-score">The AOW Score</h2>
<p>An official's score is the average of their tracked promises, weighted by status, on a scale of 0 to 100. It is rounded to the nearest whole number, with halves rounding up.</p>
<table>
<tr><th scope="col">Status</th><th scope="col">Weight</th></tr>
${scoreOrder.map(k => `<tr><td>${esc(STATUS[k])}</td><td>${WEIGHTS[k]}</td></tr>`).join('\n')}
</table>
<p>Undetermined promises and campaign promises carry no weight: they are left out of the average rather than counted as 0. An official with no tracked promises shows a dash instead of a 0, because no data isn't the same as a bad record. The score badge uses the same colors as the statuses: 70 and above reads green, 40 to 69 amber, and below 40 red.</p>
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
<li><strong>Sourcing is shown, not summarized into a conclusion.</strong> Each entry links to the sources found for it, so the evidence can be checked rather than taken on trust.</li>
<li><strong>The score is a fixed formula.</strong> Nobody adjusts it case by case.</li>
<li><strong>Lists on these pages are never ranked by party or score.</strong> The directory and the administration, Senate, House and state pages group officials by where they serve and list them alphabetically, except the administration, which follows the official order: the President, the Vice President, then the Cabinet departments in their legal order of succession.</li>
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
// The landing page at the bare domain. Every sentence on it restates something the live tracker, the FAQ or the
// methodology already says, and the figures are checked (see PROMISES_FLOOR). It names no party, shows no outcome
// tallies (nothing like "60% kept") and no scores, so the page can never read as a scoreboard for one side.
// It never says that every promise has three sources: most entries are bill promises checked against the congressional
// record, and many others are still being sourced, which the page says in plain words.

// Headline numbers are rounded DOWN and get a "+", the same rule the interactive tracker's hero strip uses, so the "+"
// can never overstate: from 100 up the first two digits are kept (736 -> "730+", 19,540 -> "19,000+"), 10 to 99 keep the
// first digit (88 -> "80+"), and under 10 is exact. The live script's up() below must stay the same rule.
const fmtInt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function roundedPlus(n) {
  n = Math.floor(n);
  if (n < 10) return String(n);
  const step = Math.pow(10, String(n).length - (n < 100 ? 1 : 2));
  return fmtInt(Math.floor(n / step) * step) + '+';
}
// These three figures are what the hero shows when the live lookup (see "live headline numbers" below) is not available:
// no script, no network, a refused answer. The roster and the states are counted from the data files, so they move by
// themselves. The promise total lives in the live database, not in these files, so it is a stated floor: the tracker held
// 19,540 promises when this was last checked (2026-10-26), and its own headline strip rounds that down to "19,000+", the
// same figure used here. It stays true as the tracker grows. Raise it when you want the fallback to claim more, and keep
// it below the real count.
const PROMISES_FLOOR = 19000;
const NOT_A_STATE = new Set(['DC', 'PR', 'GU', 'AS', 'VI', 'MP']);

// Small line icons (Feather, MIT licence), drawn inline so the page stays script-free and needs no image files.
const ICON = {
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};
const icon = k => `<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;

const HOME_REDIRECT_JS = "if(location.search||location.hash.indexOf('=')>-1){location.replace('aow-index.html'+location.search+location.hash)}";

// ---- live headline numbers ----
// The hero's three numbers (Officials, Promises, States covered) are written into the page as the rounded-down figures
// above, which are always true. In the visitor's browser a second small script then reads the current counts from the
// same database the tracker reads and shows them rounded down by the tracker's own rule (736 officials read "730+", 19,540
// promises read "19,000+"; the 50 states are shown as they are), with the exact figure one hover away ("Exactly 736"),
// just like the tracker's headline strip. So the page steps up by itself as officials and promises are added, with no
// rebuild and nobody having to remember to raise a floor, and it always matches the tracker. The note under the numbers
// ("Counts are rounded down ...") is left alone: it stays true. The script's rounding function (up) must stay the same
// rule as roundedPlus() above and the tracker's roundedPlus() in aow-index.html.
// Layout: the three hero cells were checked from 320 px wide up for officials up to 9,999 ("9,000+") and promises up to
// 99,999 ("90,000+"); the script's own sanity limits are wider than that, so if the counts ever get past those figures,
// look at the .figures rules in V2_CSS (the phone sizes are the tight ones).
// It makes one read-only lookup, GET <project address>/rest/v1/rpc/site_counts (the browser adds its own automatic OPTIONS
// permission check first), to a database function that returns three whole numbers
// (tools/site_counts.sql holds it). The request carries only the publishable key in an "apikey" header: no cookies, no
// sign-in, no body, nothing stored, and the answer is written into the page as plain text, never as markup.
// Nothing depends on it. No script, no network, a refused or malformed answer, a missing function or a slow answer
// (8 seconds) all leave the rounded-down figures exactly as they were.
// The project address and the publishable key are public by design (the tracker ships both in aow-index.html), but this
// file does not copy them: they are read out of aow-index.html at build time, so there is one place to change them and
// a rotated key reaches this page on the next build (the nightly run, or "Run workflow" by hand: pushing aow-index.html alone
// does not start the build). If either cannot be found in the strict shape expected, or is declared more than once (a second
// declaration might be the one the tracker really uses), the page is built without the live script and without the extra
// Content-Security-Policy source, and the report says so.
const LIVE_COUNTS_TIMEOUT_MS = 8000;
let HOME_LIVE_STATE = 'not built yet';   // for tools/pages-report.txt

function liveCountsConfig() {
  const spa = path.join(ROOT, 'aow-index.html');
  if (!fs.existsSync(spa)) return { why: 'aow-index.html not found' };
  const src = fs.readFileSync(spa, 'utf8');
  // Each setting must be declared exactly once, in any shape (const, let or var), and that one declaration must then have
  // the strict shape below. Counting every declaration, not only well-formed ones, keeps a stray second copy from being
  // ignored or believed by mistake.
  const declared = name => (src.match(new RegExp('^[ \\t]*(?:const|let|var)[ \\t]+' + name + '\\b', 'gm')) || []).length;
  const nUrl = declared('SUPABASE_URL'), nKey = declared('SUPABASE_PUBLISHABLE_KEY');
  if (nUrl !== 1) return { why: 'SUPABASE_URL is declared ' + nUrl + ' times in aow-index.html (needs exactly 1)' };
  if (nKey !== 1) return { why: 'SUPABASE_PUBLISHABLE_KEY is declared ' + nKey + ' times in aow-index.html (needs exactly 1)' };
  const url = /^[ \t]*const[ \t]+SUPABASE_URL[ \t]*=[ \t]*'(https:\/\/[a-z0-9]{20}\.supabase\.co)'[ \t]*;/m.exec(src);
  const key = /^[ \t]*const[ \t]+SUPABASE_PUBLISHABLE_KEY[ \t]*=[ \t]*'(sb_publishable_[A-Za-z0-9_-]{16,100})'[ \t]*;/m.exec(src);
  if (!url) return { why: 'no SUPABASE_URL of the expected shape in aow-index.html' };
  if (!key) return { why: 'no SUPABASE_PUBLISHABLE_KEY of the expected shape in aow-index.html' };
  return { origin: url[1], key: key[1] };
}

// The script text is the exact text the page's Content-Security-Policy hashes, so it is built in one place and used for both.
// Plain ES5 (no build step, old phones). The only values spliced in are the two strictly validated strings above.
// Its first line makes it stand down on a visit the redirect script is already sending to the tracker (an address with a
// ?query, or a # holding "="), so a page that is about to be replaced never fires a request. It must match HOME_REDIRECT_JS.
function homeLiveJs(cfg) {
  return [
    "(function(){",
    "if(location.search||location.hash.indexOf('=')>-1)return;",
    "var o=document.getElementById('live-officials'),p=document.getElementById('live-promises'),s=document.getElementById('live-states');",
    "if(!o||!p||!s||!window.fetch)return;",
    "function ok(v,max){return typeof v==='number'&&isFinite(v)&&Math.floor(v)===v&&v>=1&&v<=max}",
    "function up(n){if(n<10)return String(n);var m=Math.pow(10,String(n).length-(n<100?1:2));return (Math.floor(n/m)*m).toLocaleString('en-US')+'+'}",
    "var c=window.AbortController?new AbortController():null,t=setTimeout(function(){if(c)c.abort()}," + LIVE_COUNTS_TIMEOUT_MS + ");",
    "fetch(" + JSON.stringify(cfg.origin + '/rest/v1/rpc/site_counts') + ",{method:'GET',headers:{apikey:" + JSON.stringify(cfg.key) + ",Accept:'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:c?c.signal:undefined})",
    ".then(function(r){if(!r.ok)throw 0;return r.json()})",
    ".then(function(d){",
    "clearTimeout(t);",
    "if(!d||!ok(d.officials,100000)||!ok(d.promises,10000000)||!ok(d.states,50))return;",
    "o.textContent=up(d.officials);p.textContent=up(d.promises);s.textContent=String(d.states);",
    "o.parentNode.title='Exactly '+d.officials.toLocaleString('en-US');p.parentNode.title='Exactly '+d.promises.toLocaleString('en-US');",
    "})",
    ".catch(function(){clearTimeout(t)});",
    "})();"
  ].join('\n');
}

// The home page's policy: the base policy, plus script-src naming each inline script by its hash (nothing else may run),
// plus, only when the live script is on, connect-src naming the one address it may call.
function homeCsp(scripts, connectOrigin) {
  const hashes = scripts.map(js => `'sha256-${crypto.createHash('sha256').update(js).digest('base64')}'`).join(' ');
  return CSP.replace("default-src 'none';", `default-src 'none'; script-src ${hashes};${connectOrigin ? ` connect-src ${connectOrigin};` : ''}`);
}

/* ------------------------------ the design ("The record") ------------------------------ */
// The redesign chosen in the Look Studio (Nov 2026). It was built as a preview first (a /preview/ folder and a
// switch in the tracker's address) and became the site's look at the switch-over on Nov 10, 2026. layout() uses the
// stylesheet and helpers in this section for every generated page.
//
// V2_CSS is the redesign's one stylesheet. It is written for the tracker's theme switch (html[data-theme="dark"]);
// v2StaticCss() turns those rules into a prefers-color-scheme block for these script-free pages.
// Look settings picked in the studio: deep green banner and footer, large centered logo watermark at medium strength.
const V2_BODY_CLASS = 'bk-deep wm-mark wms-medium';
const V2_CSS = `
:root{
  --bg:#FFFFFF; --bg-alt:#F6F8F7; --border:#DCE3E0;
  --text:#171A21; --text-muted:#566069; --text-faint:#69737E;
  --brand:#12836F; --brand-dark:#0C6355; --brand-tint:#E1F3EF; --brand-tint-hover:#D2ECE6; --on-tint:#0C6355; --on-brand:#FFFFFF;
  --not_started:#8A93A3; --in_progress:#C2790F; --stalled:#5D7599; --compromise:#8A5CA8; --completed:#1E8E5A; --broken:#C0392B;
  --not_started-bg:#EEF0F3; --in_progress-bg:#FBF0DF; --stalled-bg:#E9EDF4; --compromise-bg:#F3E9F6; --completed-bg:#E4F5EC; --broken-bg:#FBE7E4;
  --party-d:#2058B0; --party-r:#B23A2F; --party-i:#8B5E00; --party-np:#6B7280;
  --radius:14px;
  --deep:#0D4A43; --ink-band:#171A21; --on-deep:#FFFFFF; --on-deep-muted:#D3E7E2; --on-deep-faint:#B4D2CB; --on-deep-border:rgba(255,255,255,.28);
  --t0:var(--text); --m0:var(--text-muted); --f0:var(--text-faint); --b0:var(--border);
}
html[data-theme="dark"]{
  --deep:#0A332E; --ink-band:#0B0D10;
  --bg:#1D222B; --bg-alt:#14171D; --border:#313946;
  --text:#E8EAED; --text-muted:#A9B1BB; --text-faint:#8E97A3;
  --brand:#22A98A; --brand-dark:#1B8570; --brand-tint:#16332E; --brand-tint-hover:#1E4038; --on-tint:#6FD6BC; --on-brand:#06231C;
  --not_started:#9AA3B2; --in_progress:#E0993D; --stalled:#7C93C4; --compromise:#B084D1; --completed:#3DBE82; --broken:#E0685A;
  --not_started-bg:#262B33; --in_progress-bg:#3A2E1B; --stalled-bg:#212A38; --compromise-bg:#2E2438; --completed-bg:#1A3327; --broken-bg:#3A2220;
  --party-d:#5B9BF0; --party-r:#F0776A; --party-i:#D9A93F; --party-np:#9AA3B2;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg-alt);color:var(--text);font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
h1,h2,h3,p,ul,ol,dl,dd,figure{margin:0}
ul,ol{padding:0;list-style:none}
a{color:var(--brand);text-underline-offset:3px}
button,input,select{font:inherit;color:inherit}
.wrap{max-width:1168px;margin:0 auto;padding:0 24px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.top{background:var(--bg);border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;gap:8px 26px;min-height:70px}
.logo{display:flex;align-items:center;flex:none;color:var(--text);text-decoration:none}
.logo svg{display:block;overflow:visible}
.logo .aow-sym .s,.logo .aow-wm .i{fill:var(--brand)}
.logo .aow-wm .w{fill:currentColor}
html[data-theme="dark"] .logo .aow-wm .i{fill:#7CE0C4}
.logo .lw-short{display:none}
.nav{display:flex;align-self:stretch;gap:2px;margin-right:auto}
.nav a{display:flex;align-items:center;padding:3px 11px 0;border-bottom:3px solid transparent;font-size:15px;font-weight:600;color:var(--text-muted);text-decoration:none;white-space:nowrap}
.nav a:hover{color:var(--text)}
.nav a[aria-current]{color:var(--text);border-bottom-color:var(--brand)}
.acts{display:flex;align-items:center;gap:8px;margin-left:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 20px;border:2px solid transparent;border-radius:calc(var(--radius) - 3px);background:none;font-size:15.5px;font-weight:700;line-height:1.2;text-decoration:none;white-space:nowrap;cursor:pointer}
.btn.primary{background:var(--brand);color:var(--on-brand)}
.btn.primary:hover{background:var(--brand-dark)}
html[data-theme="dark"] .btn.primary:hover{background:var(--brand);filter:brightness(1.1)}
.btn.line{border-color:var(--text);color:var(--text)}
.btn.line:hover{background:var(--bg-alt)}
.btn.quiet{border-color:var(--border);background:var(--bg);color:var(--text)}
.btn.quiet:hover{border-color:var(--text-faint)}
.btn.sm{min-height:38px;padding:0 14px;font-size:14px}
.notice{background:var(--brand-tint);font-size:14px}
.notice .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:9px;padding-bottom:9px}
.notice a{color:var(--on-tint);font-weight:600}
.notice button{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:none;font-size:18px;line-height:1;cursor:pointer}
.pill{display:inline-flex;align-items:center;gap:8px;padding:5px 13px 5px 10px;border-radius:999px;background:var(--pill-bg);color:var(--text);font-size:14px;font-weight:700;line-height:1.3;white-space:nowrap}
.pill::before{content:'';flex:none;width:10px;height:10px;border-radius:50%;background:var(--pill-c)}
.s-not_started{--pill-c:var(--not_started);--pill-bg:var(--not_started-bg)}
.s-in_progress{--pill-c:var(--in_progress);--pill-bg:var(--in_progress-bg)}
.s-stalled{--pill-c:var(--stalled);--pill-bg:var(--stalled-bg)}
.s-compromise{--pill-c:var(--compromise);--pill-bg:var(--compromise-bg)}
.s-completed{--pill-c:var(--completed);--pill-bg:var(--completed-bg)}
.s-broken{--pill-c:var(--broken);--pill-bg:var(--broken-bg)}
.pill.sourcing{padding:4px 12px;background:none;border:1.5px dashed var(--in_progress)}
.pill.sourcing::before{display:none}
.b-not_started{background:var(--not_started)}.b-in_progress{background:var(--in_progress)}.b-stalled{background:var(--stalled)}
.b-compromise{background:var(--compromise)}.b-completed{background:var(--completed)}.b-broken{background:var(--broken)}
.mix{display:flex;gap:2px;height:8px;border-radius:4px;overflow:hidden;background:var(--border)}
.mix i{display:block;height:100%;min-width:4px}
.src3{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13.5px;color:var(--text-muted)}
.src3 li{display:flex;align-items:center;gap:6px;white-space:nowrap}
.src3 svg{flex:none;color:var(--brand)}
.src3 .missing{color:var(--text-faint)}
.src3 .missing svg{color:var(--text-faint)}
.ring{--p:0;--tier:var(--border);position:relative;display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:50%;background:conic-gradient(var(--tier) calc(var(--p) * 1%),var(--border) 0)}
.ring::before{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--ring-bg,var(--bg-alt))}
.ring b{position:relative;font-size:17px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.ring.high{--tier:var(--completed)}.ring.mid{--tier:var(--in_progress)}.ring.low{--tier:var(--broken)}
.ring.na b{color:var(--text-faint);font-weight:600}
.ring.lg{width:104px;height:104px}
.ring.lg::before{inset:10px}
.ring.lg b{font-size:38px;letter-spacing:-.04em}
.ledger{background:var(--bg);border:2px solid var(--border);border-radius:var(--radius);overflow:hidden}
.ledger-head{display:grid;grid-template-columns:1fr 1fr;border-bottom:3px solid var(--text);font-size:14px;color:var(--text-muted)}
.ledger-head span{padding:11px 22px}
.ledger-head span+span{font-weight:800;color:var(--text)}
.entry{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border)}
.ledger-head+.entry{border-top:0}
.said{padding:22px;border-right:1px solid var(--border)}
.did{padding:22px;min-width:0}
.said .q{font-size:20px;font-weight:400;line-height:1.35;letter-spacing:-.01em;text-wrap:pretty}
.said .cat{margin-top:8px;font-size:14px;color:var(--text-muted)}
.said .src3{margin-top:16px}
.did .pills{display:flex;flex-wrap:wrap;gap:8px}
.did .note{margin-top:12px;font-size:15.5px;line-height:1.6;color:var(--text-muted)}
.did .links{margin-top:14px;display:grid;gap:6px;font-size:14px}
.did .links li{display:flex;flex-wrap:wrap;gap:4px 10px}
.did .links span{color:var(--text-muted)}
.did .links a{font-weight:600}
.did .appeal{display:inline-block;margin-top:14px;font-size:13.5px;color:var(--text-muted)}
.ledger.small .said,.ledger.small .did{padding:16px 18px}
.ledger.small .said .q{font-size:17px}
.ledger.small .ledger-head span{padding:9px 18px}
.hero{background:var(--bg);border-bottom:1px solid var(--border);padding:clamp(36px,6vw,80px) 0 clamp(36px,5vw,64px)}
.said-did{margin-bottom:clamp(24px,4vw,48px);font-size:clamp(40px,9vw,112px);line-height:.96;letter-spacing:-.045em}
.said-did span{display:block}
.said-did .a{font-weight:300}
.said-did .b{font-weight:800}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(28px,5vw,72px);align-items:start}
.hero h1{font-size:clamp(20px,2.3vw,26px);font-weight:700;line-height:1.25;letter-spacing:-.015em}
.hero .lede{margin-top:12px;max-width:54ch;font-size:clamp(16px,1.5vw,18px);color:var(--text-muted)}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.hero figcaption{margin-top:10px;font-size:13.5px;color:var(--text-faint)}
.figures{display:grid;grid-template-columns:repeat(3,1fr);margin-top:clamp(32px,5vw,60px);border-top:3px solid var(--text)}
.figures div{padding:16px 16px 0 0}
.figures div+div{padding-left:22px;border-left:1px solid var(--border)}
.figures b{display:block;font-size:clamp(26px,4.6vw,52px);font-weight:800;line-height:1.05;letter-spacing:-.035em;font-variant-numeric:tabular-nums}
.figures span{font-size:15px;color:var(--text-muted)}
.figures-note{margin-top:14px;font-size:13.5px;color:var(--text-faint)}
.band{padding:clamp(48px,7vw,104px) 0}
.band.paper{background:var(--bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.band-grid{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:clamp(20px,5vw,80px);align-items:start}
.band h2{font-size:clamp(28px,4vw,46px);font-weight:800;line-height:1.05;letter-spacing:-.035em;text-wrap:balance}
.band .intro{margin-top:14px;font-size:17.5px;color:var(--text-muted);text-wrap:pretty}
.band .more{margin-top:18px;font-size:15.5px}
.band h3{font-size:19px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.steps{counter-reset:s;border-top:3px solid var(--text)}
.steps li{counter-increment:s;display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 12px;padding:22px 0;border-bottom:1px solid var(--border)}
.steps li::before{content:counter(s);grid-row:span 2;font-size:46px;font-weight:300;line-height:.95;color:var(--brand);font-variant-numeric:tabular-nums}
.steps p{color:var(--text-muted)}
.kinds{border-top:3px solid var(--text)}
.kinds li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:4px 12px;padding:20px 0;border-bottom:1px solid var(--border)}
.kinds svg{grid-row:span 2;color:var(--brand)}
.kinds p{color:var(--text-muted)}
.kinds .sum{border-bottom:0;margin-top:20px;padding:22px;border-radius:var(--radius);background:var(--brand);color:var(--on-brand)}
.kinds .sum svg,.kinds .sum p{color:inherit}
.asides{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:clamp(32px,5vw,56px)}
.asides h3{font-size:17px}
.asides p{margin-top:6px;font-size:15.5px;color:var(--text-muted)}
.statuses{border-top:3px solid var(--text)}
.statuses div{display:grid;grid-template-columns:170px minmax(0,1fr);gap:8px 16px;align-items:center;padding:15px 0;border-bottom:1px solid var(--border)}
.statuses dd{color:var(--text-muted)}
.fine{margin-top:18px;font-size:15px;color:var(--text-muted)}
.pledges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;border-top:3px solid var(--text)}
.pledges li{padding:22px 0;border-bottom:1px solid var(--border)}
.pledges svg{display:block;margin-bottom:10px;color:var(--brand)}
.pledges p{margin-top:6px;color:var(--text-muted)}
.cover{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px}
.cover h3{padding-bottom:12px;border-bottom:3px solid var(--text)}
.cover li{position:relative;padding:14px 0 14px 30px;border-bottom:1px solid var(--border);font-size:15.5px}
.cover li::before{content:'';position:absolute;left:2px;top:19px;width:14px;height:14px;border-radius:50%;background:var(--brand)}
.cover .not li{color:var(--text-muted)}
.cover .not li::before{background:none;border:2px solid var(--text-faint)}
.browse{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;border-top:3px solid var(--text)}
.browse a{display:block;height:100%;padding:18px 0;border-bottom:1px solid var(--border);color:inherit;text-decoration:none}
.browse b{display:block;font-size:18px;color:var(--brand)}
.browse a:hover b{text-decoration:underline}
.browse span{color:var(--text-muted);font-size:15.5px}
.browse .lead{grid-column:1/-1}
.browse .lead a{height:auto;margin:22px 0 10px;padding:24px;border:0;border-radius:var(--radius);background:var(--brand);color:var(--on-brand)}
.browse .lead b{font-size:22px;color:inherit}
.browse .lead span{color:inherit}
.fix{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px 40px;padding:clamp(22px,3vw,36px);border-radius:var(--radius);background:var(--brand-tint)}
.fix div{flex:1 1 440px}
.fix h2{font-size:clamp(22px,2.6vw,28px);max-width:none}
.fix p{margin-top:8px}
.fix a:not(.btn){color:var(--on-tint)}
.page-head{padding-top:clamp(26px,4vw,48px)}
.page-head h1{font-size:clamp(32px,5vw,56px);font-weight:800;line-height:1.02;letter-spacing:-.04em}
.page-head .sub{margin-top:10px;max-width:64ch;color:var(--text-muted)}
.filters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:24px}
.filters input[type=search]{flex:1 1 300px;min-width:0;min-height:50px;padding:0 16px 0 46px;border:2px solid var(--border);border-radius:calc(var(--radius) - 2px);background:var(--bg) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="%2369737E" stroke-width="2.2" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><line x1="12.5" y1="12.5" x2="16.5" y2="16.5"/></svg>') no-repeat 16px center;font-size:16px}
.filters select{min-height:50px;padding:0 12px;border:2px solid var(--border);border-radius:calc(var(--radius) - 2px);background:var(--bg);font-size:15px}
.group{margin-top:clamp(28px,4vw,48px)}
.group-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:3px solid var(--text)}
.group-head h2{font-size:24px;font-weight:800;letter-spacing:-.025em}
.group-head span{font-size:14.5px;color:var(--text-muted)}
.cols,.row{display:grid;grid-template-columns:minmax(0,2.3fr) 130px minmax(0,1.5fr) 56px 44px;gap:20px;align-items:center}
.cols{padding:10px 8px;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--text-muted)}
.row{padding:14px 8px;border-bottom:1px solid var(--border);color:inherit;text-decoration:none}
.row:hover{background:var(--bg);--ring-bg:var(--bg)}
.who{display:flex;align-items:center;gap:14px;min-width:0}
.mono{display:flex;align-items:center;justify-content:center;flex:none;width:46px;height:46px;border:2px solid var(--border);border-radius:50%;background:var(--bg);font-size:14.5px;font-weight:700;color:var(--text-muted)}
.who .name{display:block;font-size:18px;font-weight:700;line-height:1.25;letter-spacing:-.015em;color:var(--text);text-decoration:none}
.who .name:hover{text-decoration:underline}
.who .seat{display:block;font-size:14.5px;color:var(--text-muted)}
.party{display:inline-flex;align-items:center;gap:8px;font-size:15px}
.party i{flex:none;width:10px;height:10px;border-radius:50%}
.pd i{background:var(--party-d)}.pr i{background:var(--party-r)}.pi i{background:var(--party-i)}.pn i{background:var(--party-np)}
.kept{min-width:0;font-size:14.5px;color:var(--text-muted)}
.kept .mix{margin-top:7px}
.star{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:50%;background:none;font-size:20px;color:var(--text-faint);cursor:pointer}
.star:hover{color:var(--text);background:var(--bg-alt)}
.key{display:flex;flex-wrap:wrap;gap:8px 20px;margin:clamp(28px,4vw,44px) 0 0;font-size:14.5px;color:var(--text-muted)}
.key li{display:flex;align-items:center;gap:8px}
.key i{width:10px;height:10px;border-radius:50%}
.crumbs{padding-top:22px;font-size:14.5px;color:var(--text-muted)}
.crumbs a{color:var(--text-muted)}
.profile{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:clamp(24px,5vw,64px);align-items:start;padding:18px 0 0}
.profile h1{font-size:clamp(36px,6vw,72px);font-weight:800;line-height:.98;letter-spacing:-.045em}
.facts{display:flex;flex-wrap:wrap;gap:4px 26px;margin-top:16px;font-size:16.5px;color:var(--text-muted)}
.facts strong{font-weight:600;color:var(--text)}
.tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.scorebox{padding:22px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);--ring-bg:var(--bg)}
.scorebox .head{display:flex;align-items:center;gap:18px}
.scorebox .head b.t{display:block;font-size:17px;font-weight:800}
.scorebox .head .d{display:block;font-size:14.5px;color:var(--text-muted)}
.scorebox .mix{height:10px;border-radius:5px;margin-top:20px}
.tally{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;margin-top:14px;font-size:14px;color:var(--text-muted)}
.tally li{display:flex;align-items:center;gap:8px}
.tally i{flex:none;width:10px;height:10px;border-radius:50%}
.tally b{margin-left:auto;color:var(--text);font-variant-numeric:tabular-nums}
.upsell{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin-top:22px;padding:14px 18px;border:2px dashed var(--border);border-radius:var(--radius);font-size:15px;color:var(--text-muted)}
.upsell b{color:var(--text)}
.sec-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin:clamp(28px,4vw,44px) 0 16px}
.sec-head h2{font-size:28px;font-weight:800;letter-spacing:-.03em}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips button{min-height:38px;padding:0 13px;border:2px solid var(--border);border-radius:999px;background:var(--bg);font-size:14px;font-weight:600;cursor:pointer}
.chips button[aria-pressed="true"]{border-color:var(--text);background:var(--text);color:var(--bg)}
.foot{margin-top:clamp(48px,7vw,96px);padding:36px 0 52px;border-top:3px solid var(--text);background:var(--bg);font-size:15px;color:var(--text-muted)}
.home .foot{margin-top:0}
.foot-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,3fr) minmax(0,3fr);gap:28px clamp(24px,5vw,72px)}
.foot h2{margin-bottom:10px;font-size:15px;font-weight:800;color:var(--text)}
.foot li{padding:3px 0}
.foot a{color:var(--text-muted)}
.foot a:hover{color:var(--text)}
.foot .mail{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.foot .mail input{flex:1 1 200px;min-width:0;min-height:46px;padding:0 14px;border:2px solid var(--border);border-radius:calc(var(--radius) - 3px);background:var(--bg-alt)}
.band-top{padding-bottom:clamp(22px,3vw,38px)}
body.bk-plain .band-top.p{border-bottom:3px solid var(--text)}
body.bk-ink{--deep:var(--ink-band)}
body.bk-tint :is(.hero,.band-top){background:var(--brand-tint);border-color:transparent;--border:color-mix(in srgb,var(--text) 16%,transparent)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot){background:var(--deep);border-color:transparent;color:var(--on-deep);--text:var(--on-deep);--text-muted:var(--on-deep-muted);--text-faint:var(--on-deep-faint);--border:var(--on-deep-border)}
body.bk-ink :is(.hero,.band-top,.foot){color:#FFFFFF;--text:#FFFFFF;--text-muted:#D5D9DE;--text-faint:#B3B9C2;--border:rgba(255,255,255,.26)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) .btn.primary{background:var(--text);color:var(--deep)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) .btn.primary:hover{background:var(--text);filter:brightness(.93)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) .btn.line:hover{background:color-mix(in srgb,var(--text) 12%,transparent)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) .btn.quiet{background:transparent}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) .btn.quiet:hover{border-color:var(--text)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top) .party i{box-shadow:0 0 0 2px var(--text)}
body:is(.bk-tint,.bk-deep,.bk-ink) :is(.hero,.band-top,.foot) :is(.ledger,.scorebox,.filters input,.filters select,.mail input){--text:var(--t0);--text-muted:var(--m0);--text-faint:var(--f0);--border:var(--b0);color:var(--text)}
body:is(.bk-deep,.bk-ink) :is(.band-top,.foot) :is(.filters input,.filters select,.mail input){border-color:transparent;background-color:var(--bg)}
body:is(.bk-deep,.bk-ink) :is(.hero,.band-top) :is(.ledger,.scorebox){border-color:transparent}
body:is(.bk-deep,.bk-ink) .foot{margin-top:clamp(48px,7vw,96px)}
body:is(.bk-deep,.bk-ink) .home .foot{margin-top:0}
body.wm-pattern,body.wm-mark main{position:relative}
body.wm-pattern::after,body.wm-mark main::after{content:'';position:absolute;inset:0;z-index:40;pointer-events:none;opacity:var(--wm-o,.09)}
body.wm-mark main::after{background:var(--wm-mark) center center/clamp(260px,46vw,600px) auto repeat-y}
body.wm-pattern::after{background:var(--wm-tile) 0 0/280px auto repeat}
body.wm-pattern :is(.top,.notice,.hero,.band-top,.foot),body.wm-mark .hero{position:relative;z-index:41}
body.wm-mark .home main::after{display:none}
body.wm-mark .home .band:not(.paper):not(#corrections){position:relative}
body.wm-mark .home .band:not(.paper):not(#corrections)::after{content:'';position:absolute;inset:0;margin:auto;width:min(46vw,540px);aspect-ratio:166.55/181.3;max-height:80%;z-index:40;pointer-events:none;opacity:var(--wm-o,.09);background:var(--wm-one) center/contain no-repeat}
body.wms-faint{--wm-o:.05}
body.wms-medium{--wm-o:.09}
body.wms-strong{--wm-o:.15}
@media (max-width:1000px){
  .top .wrap{flex-wrap:wrap;padding-top:10px}
  .nav{order:3;flex:1 1 100%;align-self:auto;margin:0 -24px;padding:0 14px;overflow-x:auto;border-top:1px solid var(--border)}
  .nav a{padding:12px 10px 9px}
  .hero-grid,.band-grid,.profile{grid-template-columns:minmax(0,1fr)}
  .asides{grid-template-columns:minmax(0,1fr);gap:20px}
}
@media (max-width:720px){
  .wrap{padding:0 18px}
  .nav{margin:0 -18px;padding:0 8px}
  .logo .lw-full{display:none}.logo .lw-short{display:block}
  .btn{min-height:44px;padding:0 15px;font-size:15px}
  .cols{display:none}
  .row{grid-template-columns:minmax(0,1fr) 56px;gap:12px 14px;padding:16px 2px}
  .row .party{grid-column:1;grid-row:2;padding-left:60px}
  .row .kept{grid-column:1/-1;grid-row:3}
  .row .ring{grid-column:2;grid-row:1}
  .row .star{display:none}
  .ledger-head{display:none}
  .entry{grid-template-columns:minmax(0,1fr)}
  .said{border-right:0;padding-bottom:6px}
  .did{padding-top:10px}
  .pledges,.cover,.browse{grid-template-columns:minmax(0,1fr)}
  .cover .not{margin-top:28px}
  .statuses div{grid-template-columns:minmax(0,1fr);gap:6px}
  .steps li{grid-template-columns:44px minmax(0,1fr)}
  .steps li::before{font-size:36px}
  .figures div{padding-right:8px}
  .figures div+div{padding-left:12px}
  .figures span{font-size:13.5px}
  .foot-grid{grid-template-columns:minmax(0,1fr)}
  .cta-row .btn{flex:1 1 100%}
  .acts .btn.quiet{display:none}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

function v2StaticCss() {
  const dark = [];
  const light = V2_CSS.replace(/html\[data-theme="dark"\]( [^{]+)?\{([^}]*)\}\n?/g, (_, sel, decl) => {
    dark.push(`${sel ? sel.trim() : ':root'}{${decl}}`);
    return '';
  });
  if (!dark.length || light.includes('data-theme')) fatal('Redesign preview: the dark-theme rules in V2_CSS did not convert cleanly.');
  return `${light}\n@media (prefers-color-scheme:dark){\n${dark.join('\n')}\n}\n`;
}

// The watermark is drawn from the header logo's own artwork (LOGO_INNER), so there is one copy of it.
let V2_LOGO = null;
function v2Logo() {
  if (V2_LOGO) return V2_LOGO;
  const sym = /<svg class="aow-sym"[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*><path d="([^"]+)"/.exec(LOGO_INNER);
  if (!sym) fatal('Could not read the logo symbol out of LOGO_INNER.');
  V2_LOGO = { w: +sym[1], h: +sym[2], d: sym[3] };
  return V2_LOGO;
}
function v2WatermarkCss() {
  const { w, h, d } = v2Logo();
  // Plain pictures in the logo's own green (a lighter green in dark theme), shown through the element's opacity.
  // No blend mode and no mask: on long pages those made scrolling slow.
  const url = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const tall = +(h * 2.3).toFixed(2);
  const vars = fill => {
    const p = `<path fill="${fill}" d="${d}"/>`;
    const one = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${p}</svg>`;
    const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${tall}" viewBox="0 0 ${w} ${tall}"><g transform="translate(0,${+(h * 0.65).toFixed(2)})">${p}</g></svg>`;
    const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><g transform="translate(60,50) scale(.6)">${p}</g><g transform="translate(380,370) scale(.6)">${p}</g></svg>`;
    return `:root{--wm-one:${url(one)};--wm-mark:${url(mark)};--wm-tile:${url(tile)}}`;
  };
  return `${vars('#12836F')}\n@media (prefers-color-scheme:dark){${vars('#22A98A')}}\n`;
}

// What the generated pages need on top of V2_CSS: the title band's heading, the reading column, an official's roles,
// and the directory rows. Colors come from the same tokens, so the dark theme needs nothing extra here.
const V2_PAGE_CSS = `
body.wm-mark main::after{display:none}
body.wm-mark .page{position:relative}
body.wm-mark .page::after{content:'';position:absolute;inset:0;z-index:40;pointer-events:none;opacity:var(--wm-o,.09);background:var(--wm-mark) center center/clamp(260px,46vw,600px) auto;background-repeat:no-repeat space}
.band-top h1{margin-top:14px;font-size:clamp(32px,5vw,56px);font-weight:800;line-height:1.02;letter-spacing:-.04em;text-wrap:balance}
.band-top .profile h1{margin-top:0;font-size:clamp(36px,6vw,72px);line-height:.98;letter-spacing:-.045em}
.band-top .sub{margin-top:14px;max-width:72ch;font-size:17px;color:var(--text-muted);text-wrap:pretty}
.band-top a{color:var(--text)}
.facts .party{font-size:inherit}
.page{padding-top:clamp(28px,4vw,48px)}
.page h2{font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-.025em;scroll-margin-top:16px}
.page .sub{max-width:78ch;margin-top:8px;color:var(--text-muted)}
.prose{max-width:72ch;font-size:17px;line-height:1.65}
.prose h2{margin:44px 0 12px}
.prose h2:first-child{margin-top:0}
.prose p{margin:0 0 16px}
.prose ul,.prose ol{margin:0 0 16px;padding-left:22px}
.prose ul{list-style:disc}
.prose ol{list-style:decimal}
.prose li{margin:0 0 8px}
.defs{margin:0 0 16px}
.defs dt{margin-top:14px;font-weight:700}
.defs dd{margin-top:4px;color:var(--text-muted)}
table{width:100%;border-collapse:collapse;margin:14px 0 20px;border:2px solid var(--border);background:var(--bg);font-size:15px;line-height:1.5}
th,td{padding:10px 14px;border-top:1px solid var(--border);text-align:left;vertical-align:top}
th{border-top:0;border-bottom:3px solid var(--text);font-size:14px;font-weight:600;color:var(--text-muted)}
code{padding:1px 6px;border-radius:5px;background:var(--bg-alt);font-size:.9em}
.role{margin-top:clamp(36px,5vw,60px)}
.role:first-child{margin-top:0}
.role .sec-head{justify-content:flex-start;margin:0 0 12px}
.role .sec-head h2{font-size:28px;letter-spacing:-.03em}
.role .count{font-size:15px;color:var(--text-muted)}
.role .summary{max-width:80ch;margin-top:10px;color:var(--text-muted)}
.role .mix{max-width:560px;height:10px;margin-top:16px;border-radius:5px}
.role .held{max-width:80ch;margin-top:12px;font-size:14.5px;color:var(--text-muted)}
.role .ledger{margin-top:20px}
.entry{scroll-margin-top:16px}
.entry:target{box-shadow:inset 4px 0 0 var(--brand)}
.info{margin-top:clamp(36px,5vw,56px);padding:18px 20px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);font-size:15px;color:var(--text-muted)}
.info strong{color:var(--text)}
.related{margin-top:clamp(36px,5vw,60px)}
.related .dir{margin-top:14px}
.dir-sec{margin-top:clamp(28px,4vw,44px)}
.dir-sec>h2,.dir-sec>h3{padding-bottom:10px;border-bottom:3px solid var(--text);font-size:24px;font-weight:800;letter-spacing:-.025em}
.dir-sec>h3{font-size:20px}
.dir-sec>:is(h2,h3) a{color:inherit;text-decoration:none}
.dir-sec>:is(h2,h3) a:hover{text-decoration:underline}
.dir .row{grid-template-columns:minmax(0,2.3fr) 130px minmax(0,1.5fr) 56px}
.dir .kept .mix{max-width:320px}
.dir.names{border-top:1px solid var(--border)}
.related .dir.names{border-top:3px solid var(--text)}
.dir.names .row{grid-template-columns:minmax(0,1.5fr) 130px minmax(0,1.6fr);padding:10px 8px}
.dir.names .name{font-size:16px;font-weight:600;color:var(--text)}
.dir.names a.name{color:var(--brand);text-decoration:none}
.dir.names a.name:hover{text-decoration:underline}
.dir.names .seat{font-size:14.5px;color:var(--text-muted)}
.foot ul a span{font-size:.85em}
@media (max-width:720px){
  .dir .row{grid-template-columns:minmax(0,1fr) 56px}
  .dir.names .row{grid-template-columns:minmax(0,1fr);gap:2px;padding:10px 2px}
  .dir.names .row .party{grid-row:auto;padding-left:0;font-size:14.5px}
  .prose{font-size:16.5px}
  table{font-size:14px}
  th,td{padding:8px 10px}
}
`;

const V2_TICK = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="9" cy="9" r="7.75" stroke-width="1.5"/><path d="M5.4 9.5l2.5 2.5 4.9-5.6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const V2_OPEN = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="9" cy="9" r="7.75" stroke-width="1.5" stroke-dasharray="3 2.6"/></svg>';
const V2_BIGTICK = '<svg width="30" height="30" viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="9" cy="9" r="7.75" stroke-width="1.2"/><path d="M5.4 9.5l2.5 2.5 4.9-5.6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// The three kinds of source the standard asks for, in the order the site always lists them.
const V2_SOURCE_KINDS = ['Official record', 'Mainstream news', 'Right-leaning news'];
const v2Src3 = found => `<ul class="src3" aria-label="Sources found">${V2_SOURCE_KINDS.map((k, i) => found[i]
  ? `<li>${V2_TICK}${k}</li>` : `<li class="missing">${V2_OPEN}${k} (not yet)</li>`).join('')}</ul>`;

// The home page.
function renderHome(ctx) {
  const { model, hubs } = ctx;
  const canonical = SITE + '/';
  const title = 'ActionOverWords Index: Did Officials Keep Their Promises?';
  const description = 'Tracking what U.S. officials promised and what happened: specific promises, six plain statuses, sources shown, and one standard for every official.';
  const up = '';
  const tracker = 'aow-index.html';
  const current = [...model.entries.values()].filter(e => e.kind === 'current');
  const states = new Set(current.filter(e => e.level === 'state' && STATE_NAMES[e.state] && !NOT_A_STATE.has(e.state)).map(e => e.state)).size;
  const people = model.pages.length;
  const total = model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0);
  const faq = fs.existsSync(path.join(ROOT, 'faq.html'));
  const live = liveCountsConfig();
  const liveJs = live.origin ? homeLiveJs(live) : null;
  HOME_LIVE_STATE = liveJs ? 'on (the browser reads public.site_counts() and shows the live counts rounded down like the tracker)' : `off, rounded-down figures only (${live.why})`;
  if (!liveJs) warn('Home page: live headline numbers are off: ' + live.why + '.');
  const liveId = k => (liveJs ? ` id="live-${k}"` : '');

  const link = (href, name, text, lead) => `<li${lead ? ' class="lead"' : ''}><a href="${href}"><b>${name}</b><span>${text}</span></a></li>`;
  const browse = [link(tracker, 'The interactive tracker', 'Search officials by name or state, filter by status and read each promise with its sources.', true),
    link(up + 'officials/', 'Officials directory', `${esc(nOf(people, 'person', 'people'))} and ${esc(nOf(total, 'promise', 'promises'))}, each promise with sources from at least three distinct publishers, including a primary record.`)]
    .concat([...hubs.values()].map(h => link(up + esc(h.key) + '/', esc(cap(hubMeta(h.key, model).label)), `${esc(nOf(h.pages.length, 'person', 'people'))} with promises published here.`)))
    .concat([link(up + 'methodology/', 'Methodology', 'Sources, statuses, the AOW Score and how the tracker stays nonpartisan.'),
      link(up + 'about/', 'About', 'Who runs the Index, how it is paid for and what its limits are.'),
      link(up + 'contact/', 'Contact', 'Suggest a correction, appeal a status or ask a question.'),
      link(tracker + '#newsletter', 'The weekly email', 'What changed on the tracker this week, in one free email every Monday.')])
    .concat(faq ? [link(up + 'faq.html', 'Frequently asked questions', 'Straight answers about how the site works.')] : []);

  const band = (id, hid, h2, intro, content, { paper, more, wide } = {}) => `
<section class="band${paper ? ' paper' : ''}" id="${id}" aria-labelledby="${hid}">
<div class="wrap">
<div class="band-grid"><div><h2 id="${hid}">${h2}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${more ? `<p class="more">${more}</p>` : ''}</div><div>${content}</div></div>${wide || ''}
</div>
</section>`;

  const body = `
<section class="hero" aria-labelledby="top">
<div class="wrap">
<p class="said-did"><span class="a">What they said.</span><span class="b">What happened.</span></p>
<div class="hero-grid">
<div>
<h1 id="top">Did U.S. officials keep their promises?</h1>
<p class="lede">ActionOverWords Index tracks the specific promises made by U.S. officials, federal and state, and shows what actually happened to each one: kept, broken, or somewhere in between. Every promise is held to the same standard, whatever the official's party.</p>
<div class="cta-row"><a class="btn primary" href="${tracker}">Open the interactive tracker</a><a class="btn line" href="#how-it-works">How it works</a></div>
</div>
<figure aria-label="Two made-up example entries">
<div class="ledger small"><div class="ledger-head"><span>What they said</span><span>What happened</span></div>
<div class="entry"><div class="said"><p class="q">Cut permit wait times for new housing in half</p><p class="cat">Housing</p>${v2Src3([true, true, true])}</div><div class="did"><div class="pills"><span class="pill s-in_progress">In progress</span></div><p class="note">Example: fully sourced.</p></div></div>
<div class="entry"><div class="said"><p class="q">Bring high-speed internet to every rural county</p><p class="cat">Infrastructure</p>${v2Src3([false, true, false])}</div><div class="did"><div class="pills"><span class="pill sourcing">Still finding sources</span><span class="pill s-not_started">Not started</span></div><p class="note">Example: still being sourced.</p></div></div>
</div>
<figcaption>Made-up examples to show the layout. Real entries link to each source.</figcaption>
</figure>
</div>
<div class="figures" role="group" aria-label="The size of the tracker">
<div><b${liveId('officials')}>${roundedPlus(current.length)}</b><span>Officials</span></div>
<div><b${liveId('promises')}>${fmtInt(PROMISES_FLOOR)}+</b><span>Promises</span></div>
<div><b${liveId('states')}>${states}</b><span>States covered</span></div>
</div>
<p class="figures-note">Counts are rounded down. The interactive tracker has the full, current roster.</p>
</div>
</section>
${liveJs ? `<script>${liveJs}</script>\n` : ''}${band('how-it-works', 'h-how', 'How it works', 'Each entry is one specific promise, rated on what has actually happened, with the sources we found for it shown right on the entry.', `<ol class="steps">
<li><h3>One specific promise at a time</h3><p>Each entry is a single promise an official made: a bill to introduce, a policy to carry out, a commitment to keep.</p></li>
<li><h3>Checked against sources</h3><p>Our standard is three kinds of sources for each promise: a government record, mainstream or left-leaning news, and right-leaning news. The aim is that a status never rests on one side's account.</p></li>
<li><h3>Rated on what happened</h3><p>Six statuses, from Not started to Completed or Broken, based on what has actually happened, not on intent.</p></li>
<li><h3>Scored the same way for everyone</h3><p>The AOW Score is a 0 to 100 average of an official's tracked promises, weighted by status. The formula is fixed and published, so anyone can recompute it.</p></li>
</ol>`)}
${band('sourcing', 'h-src', 'Our sourcing standard', 'For each promise we look for three kinds of sources. The standard exists so a status doesn\'t rest on reporting from only one side of the aisle.', `<ul class="kinds">
<li>${V2_BIGTICK}<h3>A government record</h3><p>A vote record, a signed bill, an agency filing or a similar primary record.</p></li>
<li>${V2_BIGTICK}<h3>Mainstream or left-leaning news</h3><p>At least one outlet from the mainstream or left-leaning press.</p></li>
<li>${V2_BIGTICK}<h3>Right-leaning news</h3><p>At least one outlet from the right-leaning press.</p></li>
<li class="sum">${V2_BIGTICK}<h3>Sources you can check</h3><p>Every source we list is linked and labeled by type.</p></li>
</ul>`, { paper: true, more: `Read the <a href="${up}methodology/#sourcing">full sourcing rules</a>.`, wide: `<div class="asides">
<div><h3>When the record is the proof</h3><p>A promise to introduce, sponsor or pass a specific, named bill is checked against the congressional record, which shows exactly what happened to the bill. Many entries in the tracker are of this kind.</p></div>
<div><h3>Still being sourced</h3><p>This is a new dataset, and sourcing is still being completed for many entries. Many of them carry a <span class="pill sourcing">Still finding sources</span> tag in the tracker instead of being presented as fully verified.</p></div>
<div><h3>A good-faith reading, open to appeal</h3><p>A status is our reading of the sources linked on the entry, not an audited record. If you think one is wrong, you can appeal it with a named source.</p></div>
</div>` })}
${band('statuses', 'h-status', 'Six statuses', 'Every promise gets one of six statuses, based on what has actually happened so far.', `<dl class="statuses">
${Object.keys(STATUS).map(k => `<div><dt><span class="pill s-${k}">${esc(STATUS[k])}</span></dt><dd>${esc(STATUS_MEANING[k])}</dd></div>`).join('\n')}
</dl>
<p class="fine">A promise whose outcome has not been fully verified can show <strong>Undetermined</strong> instead. That is a placeholder, not a verdict, and it is left out of the AOW Score until it is resolved. A candidate's promises show <strong>Campaign promise</strong> from 60 days before their election, and a pledge made for that race keeps the label after election day, also left out of the score.</p>`)}
${band('nonpartisan', 'h-fair', 'The same standard for everyone', 'How the Index is run, in four commitments.', `<ul class="pledges">
<li>${icon('tag')}<h3>Party is a fact, not a verdict</h3><p>A party badge is shown the way an election map shows one, and party is never assumed from context. Status colors are earned by outcome, never by party.</p></li>
<li>${icon('check')}<h3>One standard, every official</h3><p>The same six statuses, the same sourcing standard and the same score formula apply to every official, current or former.</p></li>
<li>${icon('list')}<h3>No ranking by party or score</h3><p>On these pages, officials are grouped by where they serve and listed alphabetically, or for the administration in the official order of office.</p></li>
<li>${icon('shield')}<h3>Independent and openly funded</h3><p>Run by Action Over Words LLC and supported by memberships, optional tips and advertising. None of those changes a status or a score, and we don't knowingly accept money from elected officials, candidates, campaigns, parties or PACs.</p></li>
</ul>`, { paper: true })}
${band('coverage', 'h-cov', 'What is covered', 'Federal and state officials. Appointed officials such as Cabinet secretaries are included and marked Appointed in the tracker.', `<div class="cover">
<div><h3>Covered</h3><ul>
<li><strong>Federal:</strong> the President, the Vice President, Cabinet and senior White House officials, a set of sub-Cabinet law-enforcement and agency heads, and the U.S. Congress, including its non-voting members.</li>
<li><strong>State:</strong> in every state, the Governor, the Lieutenant Governor (or whichever office is first in succession) and the Attorney General. Some larger states go deeper into their other executive offices.</li>
<li><strong>Former officeholders</strong> and candidates who ran and lost are kept in the Archive, and past administrations are kept alongside the current one, under the same statuses and the same sourcing standard.</li>
</ul></div>
<div class="not"><h3>Not covered yet</h3><ul>
<li>County and city government, school boards and special districts.</li>
<li>State legislatures and judiciaries.</li>
<li>Federal judges and independent regulatory boards such as the Federal Reserve, which are a different category: appointed, often deliberately apolitical, and with less to track in the same way.</li>
</ul></div>
</div>`, { more: `<a href="${up}methodology/#coverage">What is and is not covered</a> in full.` })}
${band('browse', 'h-browse', 'Browse', 'Start in the interactive tracker, or browse the pages published here.', `<ul class="browse">${browse.join('')}</ul>`, { paper: true })}
<section class="band" id="corrections" aria-labelledby="h-fix">
<div class="wrap">
<div class="fix">
<div><h2 id="h-fix">Spot something wrong?</h2><p>If a status looks wrong, or you want to suggest a promise to track, write to <a href="mailto:${CONTACT}">${CONTACT}</a> or use the Contact form in the tracker (details on the <a href="${up}contact/">contact page</a>). Appeals need a named source, the outlet and headline being cited, so they can be checked the same way every other entry is. <a href="${up}methodology/#corrections">How corrections work</a>.</p></div>
<a class="btn primary" href="${tracker}">Open the tracker</a>
</div>
</div>
</section>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': SITE_LD.concat([
      { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, isPartOf: { '@id': SITE + '/#website' },
        about: { '@id': SITE + '/#organization' }, dateModified: '{{LASTMOD}}', inLanguage: 'en-US' }
    ])
  };
  return layout({ depth: 0, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}', mainClass: '', wrapClass: 'home',
    nav: '<a href="#how-it-works">How it works</a><a href="#sourcing">Sourcing</a><a href="#statuses">Statuses</a><a href="#coverage">Coverage</a><a href="officials/">Officials</a>',
    headExtra: `<script>${HOME_REDIRECT_JS}</script>\n`,
    csp: homeCsp([HOME_REDIRECT_JS].concat(liveJs ? [liveJs] : []), liveJs ? live.origin : null) });
}

/* ------------------------------ about and contact ----------------------------- */
// Static versions of what the tracker's About tab already says about who runs the site, how it is paid for and how to
// reach it, so a visitor, a search engine or a reviewer can find them at a real address without running scripts. Every
// sentence restates the About tab, the Terms, the FAQ or the methodology; nothing new is claimed here. The page cannot
// host a form (the pages ship a strict CSP with no scripts and form-action 'none'), so it points to email and to the
// tracker's own contact form.
function renderAbout() {
  const canonical = SITE + '/about/';
  const title = 'About ActionOverWords Index: Who Runs It and How It Works';
  const description = 'ActionOverWords Index tracks specific promises by U.S. officials and what happened to them. Who runs it, how it is paid for, how it stays nonpartisan, and its limits.';
  const faq = fs.existsSync(path.join(ROOT, 'faq.html')) ? ' · <a href="../faq.html">FAQ</a>' : '';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../')}">Home</a> › About</nav>
<h1>About ActionOverWords Index</h1>
<p class="sub">An independent tracker of what U.S. officials promised and what happened.</p>
<div class="prose">

<h2 id="why">Why this exists</h2>
<p>Every election produces thousands of specific promises, and almost no permanent record of which ones were kept. ActionOverWords Index exists to be that record: tracking what federal and state officials actually said, sourcing it, and following up long after the campaign ends. The same standard applies whether a promise came from a Democrat or a Republican, because accountability that only works for one side isn't accountability.</p>

<h2 id="what-it-does">What it does</h2>
<p>The Index tracks specific promises made by U.S. officials, federal and state, and shows whether each one has been kept, broken, or something in between. Most political coverage tracks what officials say. This tracks what actually happened to what they said.</p>
<ul>
<li><strong>One promise at a time.</strong> Each entry is a single, specific promise: a bill to introduce, a policy to carry out, a commitment to keep.</li>
<li><strong>Sources you can check.</strong> Every source we list is linked and labeled by type. Our standard is three kinds of sources for each promise: a government record, mainstream or left-leaning news, and right-leaning news.</li>
<li><strong>Six plain statuses.</strong> Not started, In progress, Stalled, Compromise, Completed or Broken, based on what has actually happened, not on intent.</li>
<li><strong>One score formula.</strong> The AOW Score is a 0 to 100 average of an official's tracked promises, weighted by status. The formula is fixed and published, so anyone can recompute it.</li>
</ul>
<p>The details, including how a promise is sourced and how the score is worked out, are on the <a href="../methodology/">methodology page</a>.</p>

<h2 id="who-runs-this">Who runs it, and how it's paid for</h2>
<p>ActionOverWords Index is run by Action Over Words LLC, an independent company. It's supported by membership plans, optional one-time tips and advertising: signed-out visitors and free accounts may see ads, and paid members see none. None of those changes a promise's status or the AOW Score, and we don't knowingly accept money from elected officials, candidates, campaigns, parties or PACs.</p>
<p>Browsing and the core promise tracker are free to everyone.</p>

<h2 id="nonpartisan">Staying nonpartisan</h2>
<ul>
<li><strong>Party is a fact, not a verdict.</strong> A party badge is shown the way an election map shows one, and party is never assumed from context. Status colors are earned by outcome, never by party.</li>
<li><strong>Sourcing is shown, not summarized into a conclusion.</strong> Every promise links to where it came from, so the evidence can be checked rather than taken on trust.</li>
<li><strong>The score is a fixed formula.</strong> Nobody adjusts it case by case.</li>
<li><strong>No ranking by party or score.</strong> On these pages, officials are grouped by where they serve and listed alphabetically, or for the administration in the official order of office.</li>
</ul>
<p>More on each point is in the <a href="../methodology/#nonpartisan">methodology</a>.</p>

<h2 id="limits">What to know about its limits</h2>
<p>This is a new dataset, and sourcing is still being completed for many entries. Many of them carry a <strong>Still finding sources</strong> tag in the interactive tracker instead of being presented as fully verified. A status is our good-faith reading of the sources linked on the entry, not an audited record, and anyone can appeal one with a named source. Some officials have no promises tracked yet. County and city government, state legislatures and judiciaries are not covered yet; the <a href="../methodology/#coverage">methodology page</a> lists what is and isn't.</p>

<h2 id="get-in-touch">Get in touch</h2>
<p>To report an error, suggest a promise or ask a question, see the <a href="../contact/">contact page</a>, or write to <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>

<p>See also: <a href="../aow-index.html">Interactive tracker</a> · <a href="../officials/">Officials directory</a> · <a href="../methodology/">Methodology</a>${faq}</p>
</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': ['WebPage', 'AboutPage'], '@id': canonical + '#webpage', url: canonical, name: title, description, dateModified: '{{LASTMOD}}', inLanguage: 'en-US',
        isPartOf: { '@id': SITE + '/#website' }, about: { '@id': SITE + '/#organization' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl() },
        { '@type': 'ListItem', position: 2, name: 'About', item: canonical }] }
    ]
  };
  return layout({ depth: 1, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

function renderContact() {
  const canonical = SITE + '/contact/';
  const title = 'Contact ActionOverWords Index: Corrections, Appeals and Questions';
  const description = 'How to reach ActionOverWords Index: email, how to suggest a correction or a new promise, and how to appeal a status with a named source.';
  const legalLink = (f, label) => (fs.existsSync(path.join(ROOT, f)) ? `<a href="../${f}">${label}</a>` : label);
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="${homeHref('../')}">Home</a> › Contact</nav>
<h1>Contact</h1>
<p class="sub">How to reach ActionOverWords Index.</p>
<div class="prose">

<h2 id="email">Email</h2>
<p>For general questions, corrections, suggestions and anything else: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>

<h2 id="correction">Suggest a correction or a new promise</h2>
<p>Tell us which official and which promise, and what you think is wrong or missing. A link, or the name of the outlet and the headline, helps us check it. Every submission is reviewed.</p>

<h2 id="appeal">Appeal a status</h2>
<p>If you think a promise's status is wrong, tell us which official and which promise, and include a named source: the outlet and headline you're citing. Appeals are checked the same way every other entry is checked, so a named source is what lets us look at it.</p>

<h2 id="form">Prefer a form?</h2>
<p>The interactive tracker has its own contact form. Open the <a href="../aow-index.html">tracker</a>, choose <em>About</em>, then <em>Contact</em>. You can send a general message, a suggested correction or a status appeal there. Paid members get priority review, but anyone can submit.</p>

<h2 id="more">Other things you may be looking for</h2>
<ul>
<li>How promises are sourced, rated and scored: the <a href="../methodology/">methodology page</a> and the ${legalLink('faq.html', 'FAQ')}.</li>
<li>What happens to messages sent through the form: the ${legalLink('privacy-policy.html', 'Privacy Policy')}.</li>
<li>A copyright complaint: the ${legalLink('dmca-policy.html', 'Copyright / DMCA policy')}.</li>
<li>Who runs the site: the <a href="../about/#who-runs-this">About page</a>.</li>
</ul>
</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': ['WebPage', 'ContactPage'], '@id': canonical + '#webpage', url: canonical, name: title, description, dateModified: '{{LASTMOD}}', inLanguage: 'en-US',
        isPartOf: { '@id': SITE + '/#website' }, about: { '@id': SITE + '/#organization' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl() },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: canonical }] }
    ]
  };
  return layout({ depth: 1, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
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
  // The bare domain is generated only if index.html already carries the marker. A hand-written redirect to the
  // tracker (the normal state) is never overwritten, and "Home" stays the tracker.
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
  guard(path.join(ROOT, 'about', 'index.html'));
  guard(path.join(ROOT, 'contact', 'index.html'));
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
  emit('about/', 'about/index.html', renderAbout());
  emit('contact/', 'contact/index.html', renderContact());
  hubs.forEach((h, k) => emit(`${k}/`, `${k}/index.html`, renderHub(h, ctx)));

  // sitemap: honest lastmod for generated pages, the SPA (hash of page + data), and static root pages that exist
  const urls = [];
  if (HOME_LANDING) urls.push(['', next['home'].lastmod]);
  const spa = path.join(ROOT, 'aow-index.html');
  if (fs.existsSync(spa)) { stamp('aow-index.html', '', sha(fs.readFileSync(spa, 'utf8')) + dataHash); urls.push(['aow-index.html', next['aow-index.html'].lastmod]); }
  urls.push(['officials/', next['officials/'].lastmod]);
  urls.push(['methodology/', next['methodology/'].lastmod]);
  urls.push(['about/', next['about/'].lastmod]);
  urls.push(['contact/', next['contact/'].lastmod]);
  hubs.forEach((_, k) => urls.push([`${k}/`, next[`${k}/`].lastmod]));
  model.pages.forEach(pg => urls.push([`officials/${pg.slug}/`, next[`officials/${pg.slug}/`].lastmod]));
  LEGAL.forEach(([f]) => { const fp = path.join(ROOT, f); if (fs.existsSync(fp)) { stamp(f, '', fs.readFileSync(fp, 'utf8')); urls.push([f, next[f].lastmod]); } });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, lm]) => `  <url><loc>${esc(SITE + '/' + u)}</loc><lastmod>${lm}</lastmod></url>`).join('\n')}
</urlset>
`;

  // Do NOT Disallow the noindex pages (thank-you-donate.html, thank-you-subscribe.html, 404.html) here.
  // A page that robots.txt blocks can't be crawled, so Google never reads its
  // <meta name="robots" content="noindex">, and a URL it already knows about can stay listed as
  // "Indexed, though blocked by robots.txt" in Search Console. Leave them crawlable: the noindex
  // tag on each page is what keeps them out of search results. (Changed 2026-10-24.)
  const blocked = [];
  const robots = `# aow-generated: do not edit by hand; rebuilt by tools/build-pages.js
User-agent: *
Allow: /
${blocked.map(f => 'Disallow: /' + f).join('\n')}${blocked.length ? '\n' : ''}
Sitemap: ${SITE}/sitemap.xml
`;

  const report = [
    'AOW static pages report (deterministic; no timestamps)',
    `data files read: ${fileCount}`,
    HOME_LANDING ? `home page (/): generated landing page; live headline numbers: ${HOME_LIVE_STATE}` : 'home page (/): off. index.html is a hand-written redirect to the tracker and is left alone (to switch the landing page on, replace index.html with a file that contains the marker comment, then run this script)',
    'design: the redesign ("The record") on every generated page; the /preview/ folder from before the switch-over is removed when found',
    `officials with a page: ${model.pages.length}`,
    `promises published on pages: ${model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0)}`,
    `current officials listed by name only (no publishable promises yet): ${model.roster.length}`,
    `hub pages (a group needs at least ${HUB_MIN} people with pages): ${hubs.size}`,
    ...[...hubs.values()].map(h => `  - ${h.key}: ${h.pages.length} with pages, ${h.roster.length} listed by name only`),
    `groups with a page but below that minimum, so no hub yet: ${[...ctx.groups.keys()].filter(k => !hubs.has(k)).length}`,
    `promises held back (fewer than ${MIN_PUBLISHERS} distinct publishers, no primary-record source, status Undetermined or Campaign promise, or a status that can't apply to someone not in office): ${model.excluded.length}`,
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
  // the redesign's preview folder (Nov 2026) is not needed once the redesign is the site: remove it if this script made it
  const previewDir = path.join(ROOT, 'preview');
  if (fs.existsSync(previewDir)) {
    if (isOurs(path.join(previewDir, 'index.html')) && fs.readdirSync(previewDir).length === 1) { fs.rmSync(previewDir, { recursive: true }); removed++; }
    else warn('Leaving preview/ in place (not exclusively generated).');
  }

  if (writeIfChanged(path.join(ROOT, 'sitemap.xml'), sitemap) ) changed++;
  const robotsFile = path.join(ROOT, 'robots.txt');
  if (!fs.existsSync(robotsFile) || isOurs(robotsFile)) { if (writeIfChanged(robotsFile, robots)) changed++; }
  else warn('robots.txt exists and is hand-written; left untouched. Make sure it contains: Sitemap: ' + SITE + '/sitemap.xml');
  const manifest = { version: 1, officialCount: model.pages.length, pages: next };
  if (writeIfChanged(manifestFile, JSON.stringify(manifest, null, 1) + '\n')) changed++;
  if (writeIfChanged(path.join(ROOT, 'tools', 'pages-report.txt'), report)) changed++;

  console.log(`Built ${model.pages.length} official pages + directory + methodology + about + contact + ${hubs.size} hub page${hubs.size === 1 ? '' : 's'}${HOME_LANDING ? ' + home page' : ''}; ${model.excluded.length} promises held back; ${changed} files changed, ${removed} stale pages removed, ${warnings.length} warnings.`);
}
main();
