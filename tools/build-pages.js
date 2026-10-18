#!/usr/bin/env node
/*!
 * ActionOverWords — static page generator
 * ------------------------------------------------------------------------
 * Reads the SAME data files the live site renders from (data.js + data/**) and
 * writes crawlable, script-free HTML pages:
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
.logo-word{font-weight:800;font-size:18px;letter-spacing:-.01em;white-space:nowrap}.logo-word .lw-short{display:none}
.cta{margin-left:auto;font-size:13px;font-weight:700;text-decoration:none;color:#fff;background:var(--brand);padding:7px 13px;border-radius:8px;white-space:nowrap}
@media (max-width:480px){.logo-word .lw-full{display:none}.logo-word .lw-short{display:inline}}
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

// mainClass: leave undefined for the normal narrow reading column. The home page passes '' because its sections
// (a full-width hero, then alternating bands) bring their own wrappers.
// headExtra: extra markup for the head (the home page's redirect script). csp: replaces the default policy; the home page
// uses it to allow exactly that one inline script by its hash.
function layout({ depth, title, description, canonical, body, ld, lastmodToken, extraCss, mainClass, headExtra, csp }) {
  const up = '../'.repeat(depth);
  const mainOpen = mainClass === undefined ? '<main class="wrap">' : (mainClass ? `<main class="${mainClass}">` : '<main>');
  const legal = [`<a href="${up}about/">About</a>`, `<a href="${up}contact/">Contact</a>`, `<a href="${up}methodology/">Methodology</a>`]
    .concat(LEGAL.filter(([f]) => fs.existsSync(path.join(ROOT, f))).map(([f, l]) => `<a href="${up}${f}">${l}</a>`)).join('');
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
<header class="masthead"><div class="wrap"><a class="logo" href="${homeHref(up)}"><span class="logo-mark">AOW</span><span class="logo-word"><span class="lw-full">ActionOverWords Index</span><span class="lw-short">AOW Index</span></span></a><a class="cta" href="${up}aow-index.html">Open the tracker</a></div></header>
${mainOpen}
${body}
</main>
<footer><div class="wrap"><p>ActionOverWords Index is an independent, nonpartisan tracker of specific promises made by U.S. officials, federal and state. Last updated ${lastmodToken}. Spot an error? <a style="margin:0" href="mailto:${CONTACT}">${CONTACT}</a></p><div>${legal}</div></div></footer>
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
${rosterSecs.map(([l, xs]) => `<section class="dir-sec">${secs ? `<h3>${esc(l)}</h3>` : ''}<ul class="dir">${xs.map(rosterRow).join('')}</ul></section>`).join('')}` : '';

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

// Headline numbers read like "700+", not "736": always rounded DOWN to the leading digit, the same rule the interactive
// tracker's hero strip uses, so the "+" can never overstate.
const fmtInt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function roundedPlus(n) {
  if (n < 10) return String(n);
  const step = Math.pow(10, String(Math.floor(n)).length - 1);
  return fmtInt(Math.floor(n / step) * step) + '+';
}
// The roster and the states are counted from the data files, so they move by themselves. The promise total lives in the
// live database, not in these files, so it is a stated floor: the tracker held 7,814 promises when this was last checked
// (2026-10-15). It stays true as the tracker grows. Raise it when you want the page to claim more.
const PROMISES_FLOOR = 7000;
const NOT_A_STATE = new Set(['DC', 'PR', 'GU', 'AS', 'VI', 'MP']);

// Small line icons (Feather, MIT licence), drawn inline so the page stays script-free and needs no image files.
const ICON = {
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};
const icon = k => `<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;

const HOME_CSS = `
:root{--shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);--shadow-md:0 8px 20px rgba(16,24,40,.10),0 2px 6px rgba(16,24,40,.06);--on-tint:#0C6355;--hero-top:#0D4A43}
@media (prefers-color-scheme:dark){:root{--shadow:0 1px 2px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.45);--shadow-md:0 8px 20px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.35);--on-tint:#6FD6BC;--hero-top:#0A332E}}
.wrap{max-width:1080px}
.hero{background:radial-gradient(820px 300px at 90% -10%,rgba(255,255,255,.10),transparent 70%),linear-gradient(180deg,var(--hero-top),#12594F);color:#fff;padding:50px 0 36px}
.eyebrow{margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#B7E0D8}
.hero h1{margin:0 0 14px;max-width:19ch;font-size:clamp(32px,5.4vw,52px);line-height:1.08;letter-spacing:-.025em;font-weight:800;text-wrap:balance}
.hero .lede{margin:0 0 26px;max-width:62ch;font-size:clamp(16px,2.1vw,18.5px);line-height:1.55;color:#C9E8E1;text-wrap:pretty}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-block;padding:12px 20px;border-radius:9px;border:1.5px solid transparent;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;text-align:center}
.btn.light{background:#fff;color:#0D4A43}.btn.light:hover{background:#E1F3EF}
.btn.ghost{color:#fff;border-color:rgba(255,255,255,.55)}.btn.ghost:hover{background:rgba(255,255,255,.12)}
.hero a:focus-visible{outline:2px solid #fff;outline-offset:3px}
.stat-row{list-style:none;margin:30px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.18);border-radius:10px;overflow:hidden;box-shadow:var(--shadow-md)}
.stat-row li{background:#135951;padding:15px 14px}
.stat-row .n{display:block;font-size:clamp(24px,4.4vw,34px);line-height:1.1;font-weight:800;letter-spacing:-.01em}
.stat-row .l{display:block;margin-top:3px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#B7E0D8}
.hero .fine{margin:10px 0 0;font-size:12.5px;color:#9FCFC5}

.sec{--card-bg:var(--bg);padding:56px 0 16px}
.sec.white{--card-bg:var(--bg-alt);background:var(--bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding-bottom:56px;margin-top:40px}
.sec h2{margin:0 0 8px;font-size:clamp(24px,3.3vw,31px);line-height:1.2;letter-spacing:-.02em}
.sec h3{margin:0 0 6px;font-size:16.5px;line-height:1.3}
.sec p{margin:0}
.sec .lede2{margin:0 0 28px;max-width:66ch;color:var(--text-muted);font-size:16.5px}
.sec .more{margin-top:22px;font-size:14.5px}
.sec a:focus-visible,.btn:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:4px}

.split{display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:start}
.steps{counter-reset:s;list-style:none;margin:0;padding:0;display:grid;gap:24px}
.steps li{counter-increment:s;position:relative;padding-left:54px}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:38px;height:38px;border-radius:50%;background:var(--brand-tint);color:var(--on-tint);font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center}
.steps p{color:var(--text-muted)}

.home .pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;font-size:11.5px;font-weight:700;letter-spacing:.02em;text-transform:none;white-space:nowrap}
.home .pill::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
.home .pill.sourcing{background:var(--in_progress-bg);color:var(--in_progress);border:1px dashed currentColor}
.entries{margin:0;display:grid;gap:14px}
.entry{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow-md)}
.entry .tag{margin:0 0 10px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint)}
.entry-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px 14px;flex-wrap:wrap}
.entry-text{flex:1 1 210px;font-size:16px;font-weight:600;line-height:1.4}
.pills{display:flex;gap:8px;flex-wrap:wrap}
.entry-cat{margin-top:8px!important;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint)}
.entry-src{list-style:none;margin:12px 0 0;padding:12px 0 0;border-top:1px solid var(--border);display:grid;gap:7px;font-size:12.5px;color:var(--text-muted)}
.entry-src li{display:flex;align-items:center;gap:8px}
.src-type{display:inline-block;min-width:98px;text-align:center;border:1px solid var(--border);border-radius:5px;padding:2px 7px;font-weight:600;color:var(--text-faint)}
.cap{margin:2px 2px 0;font-size:12.5px;color:var(--text-faint)}

.eq{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr) .95fr;gap:0 34px}
.eq>li{position:relative;display:block}
.eq>li+li::before{content:'+';position:absolute;left:-34px;top:50%;width:34px;margin-top:-14px;text-align:center;font-size:22px;font-weight:700;line-height:28px;color:var(--text-faint)}
.eq>li.result::before{content:'\\2192'}
.eq .result{display:flex;flex-direction:column;justify-content:center;background:var(--brand);color:#fff;border-radius:var(--radius);padding:18px;box-shadow:var(--shadow-md)}
.eq .result h3{color:#fff;margin:0 0 4px}.eq .result p{color:rgba(255,255,255,.88);font-size:14.5px}
.notes{list-style:none;margin:34px 0 0;padding:0;display:grid;gap:22px 30px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.notes li{border-left:3px solid var(--brand);padding:2px 0 2px 16px}
.notes li.amber{border-color:var(--in_progress)}.notes li.slate{border-color:var(--stalled)}
.notes p{color:var(--text-muted);font-size:15px}

.cards{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.cards.two{grid-template-columns:repeat(2,1fr)}
.cards.browse{grid-template-columns:repeat(3,1fr)}
.cards.browse>li:first-child{grid-column:span 2}
.cards>li{display:grid}
.card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:18px 18px 17px;box-shadow:var(--shadow)}
.card p{color:var(--text-muted);font-size:15px}
.card .num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-bottom:10px;border-radius:50%;background:var(--brand-tint);color:var(--on-tint);font-size:14px;font-weight:800}
.card .ico{display:block;margin-bottom:10px;color:var(--brand)}
a.card{display:block;color:inherit;text-decoration:none}
a.card h3{color:var(--brand)}
a.card:hover{border-color:var(--brand);box-shadow:var(--shadow-md)}
a.card:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
a.card.feature{background:linear-gradient(180deg,#0D4A43,#12594F);border-color:transparent;color:#fff;padding:22px}
a.card.feature h3{color:#fff;font-size:19px}a.card.feature p{color:#C9E8E1;font-size:15.5px;max-width:52ch}
a.card.feature:hover{box-shadow:var(--shadow-md);filter:brightness(1.08)}

.legend-grid{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.legend-grid li{display:flex;align-items:center;gap:14px;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow)}
.legend-grid .pill{flex:none;min-width:116px}
.legend-grid p{color:var(--text-muted);font-size:14.5px;line-height:1.4}
.fine2{margin-top:18px!important;max-width:70ch;color:var(--text-muted);font-size:14.5px}

.two-col{display:grid;gap:16px;grid-template-columns:1fr 1fr}
.panel{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow)}
.panel h3{margin:0 0 14px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted)}
.panel ul{list-style:none;margin:0;padding:0;display:grid;gap:13px}
.panel li{position:relative;padding-left:22px;font-size:15px;line-height:1.5}
.panel li::before{content:'';position:absolute;left:1px;top:.5em;width:9px;height:9px;border-radius:50%;background:var(--brand)}
.panel.not li::before{background:transparent;border:2px solid var(--text-faint);box-sizing:border-box}
.panel.not li{color:var(--text-muted)}

.callout{display:flex;align-items:center;justify-content:space-between;gap:18px 28px;flex-wrap:wrap;background:var(--brand-tint);border:1px solid var(--border);border-radius:var(--radius);padding:24px 26px}
.callout>div{flex:1 1 420px}
.callout h2{font-size:22px!important;margin:0 0 6px!important}
.callout p{color:var(--text);font-size:15.5px}
.callout .btn{flex:none;background:var(--brand);color:#fff}.callout .btn:hover{background:var(--brand-dark)}

@media (max-width:980px){.eq{grid-template-columns:1fr;gap:34px 0}.eq>li+li::before{left:0;right:0;top:-34px;width:auto;margin-top:0;height:34px;line-height:34px}.eq>li.result::before{content:'\\2193'}.cards.browse{grid-template-columns:repeat(2,1fr)}}
@media (max-width:860px){.split{grid-template-columns:1fr;gap:30px}}
@media (max-width:700px){.two-col,.cards.two,.cards.browse{grid-template-columns:1fr}.cards.browse>li:first-child{grid-column:auto}.hero{padding:34px 0 26px}.sec{padding-top:40px}.sec.white{padding-bottom:40px;margin-top:28px}.stat-row li{padding:13px 10px}.stat-row .l{font-size:10px;letter-spacing:.04em}.card{padding:16px}.sec .lede2{font-size:16px;margin-bottom:22px}}
@media (max-width:480px){.btns .btn{flex:1 1 100%}.legend-grid li{flex-wrap:wrap;gap:8px}}
`.trim();

// Plain visits to the bare domain read this page. Visits that carry a query string (utm_..., fbclid, ...) or a key=value
// hash (a sign-in or password-reset link: #access_token=...) still go straight to the tracker with both parts intact,
// as the old redirect did. Anchors on this page (#sourcing, #how-it-works) have no "=", so they stay here. The page's
// CSP allows this one inline script by its hash and nothing else.
const HOME_REDIRECT_JS = "if(location.search||location.hash.indexOf('=')>-1){location.replace('aow-index.html'+location.search+location.hash)}";
const HOME_CSP = CSP.replace("default-src 'none';", `default-src 'none'; script-src 'sha256-${crypto.createHash('sha256').update(HOME_REDIRECT_JS).digest('base64')}';`);

function renderHome(ctx) {
  const { model, hubs } = ctx;
  const canonical = SITE + '/';
  const title = 'ActionOverWords Index: Did Officials Keep Their Promises?';
  const description = 'Tracking what U.S. officials promised and what happened: specific promises, six plain statuses, sources shown, and one standard for every official.';
  const current = [...model.entries.values()].filter(e => e.kind === 'current');
  const states = new Set(current.filter(e => e.level === 'state' && STATE_NAMES[e.state] && !NOT_A_STATE.has(e.state)).map(e => e.state)).size;
  const people = model.pages.length;
  const total = model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0);
  const faq = fs.existsSync(path.join(ROOT, 'faq.html'));

  const browse = [`<li><a class="card feature" href="aow-index.html"><h3>The interactive tracker</h3><p>Search officials by name or state, filter by status and read each promise with its sources.</p></a></li>`,
    `<li><a class="card" href="officials/"><h3>Officials directory</h3><p>${esc(nOf(people, 'person', 'people'))} and ${esc(nOf(total, 'promise', 'promises'))}, each promise with sources from at least three distinct publishers, including a primary record.</p></a></li>`]
    .concat([...hubs.values()].map(h => `<li><a class="card" href="${esc(h.key)}/"><h3>${esc(cap(hubMeta(h.key, model).label))}</h3><p>${esc(nOf(h.pages.length, 'person', 'people'))} with promises published here.</p></a></li>`))
    .concat([`<li><a class="card" href="methodology/"><h3>Methodology</h3><p>Sources, statuses, the AOW Score and how the tracker stays nonpartisan.</p></a></li>`,
      `<li><a class="card" href="about/"><h3>About</h3><p>Who runs the Index, how it is paid for and what its limits are.</p></a></li>`,
      `<li><a class="card" href="contact/"><h3>Contact</h3><p>Suggest a correction, appeal a status or ask a question.</p></a></li>`])
    .concat(faq ? [`<li><a class="card" href="faq.html"><h3>Frequently asked questions</h3><p>Straight answers about how the site works.</p></a></li>`] : []);

  const body = `
<div class="home">
<section class="hero" aria-labelledby="top">
<div class="wrap">
<p class="eyebrow">What they said. What happened.</p>
<h1 id="top">Did U.S. officials keep their promises?</h1>
<p class="lede">ActionOverWords Index tracks the specific promises made by U.S. officials, federal and state, and shows what actually happened to each one: kept, broken, or somewhere in between. Every promise is held to the same standard, whatever the official's party.</p>
<div class="btns"><a class="btn light" href="aow-index.html">Open the interactive tracker</a><a class="btn ghost" href="#how-it-works">How it works</a></div>
<ul class="stat-row" aria-label="The size of the tracker">
<li><b class="n">${roundedPlus(current.length)}</b><span class="l">Officials</span></li>
<li><b class="n">${fmtInt(PROMISES_FLOOR)}+</b><span class="l">Promises</span></li>
<li><b class="n">${states}</b><span class="l">States covered</span></li>
</ul>
<p class="fine">Counts are rounded down. The interactive tracker has the full, current roster.</p>
</div>
</section>

<section class="sec" id="how-it-works" aria-labelledby="h-how">
<div class="wrap">
<h2 id="h-how">How it works</h2>
<p class="lede2">Each entry is one specific promise, rated on what has actually happened, with the sources we found for it shown right on the entry.</p>
<div class="split">
<ol class="steps">
<li><h3>One specific promise at a time</h3><p>Each entry is a single promise an official made: a bill to introduce, a policy to carry out, a commitment to keep.</p></li>
<li><h3>Checked against sources</h3><p>Our standard is three kinds of sources for each promise: a government record, mainstream or left-leaning news, and right-leaning news. The aim is that a status never rests on one side's account.</p></li>
<li><h3>Rated on what happened</h3><p>Six statuses, from Not started to Completed or Broken, based on what has actually happened, not on intent.</p></li>
<li><h3>Scored the same way for everyone</h3><p>The AOW Score is a 0 to 100 average of an official's tracked promises, weighted by status. The formula is fixed and published, so anyone can recompute it.</p></li>
</ol>
<figure class="entries" aria-label="Two made-up example entries">
<div class="entry">
<p class="tag">Example · fully sourced</p>
<div class="entry-top"><p class="entry-text">Cut permit wait times for new housing in half</p><span class="pills"><span class="pill s-in_progress">In progress</span></span></div>
<p class="entry-cat">Housing</p>
<ul class="entry-src"><li><span class="src-type">Official record</span>Agency filing</li><li><span class="src-type">News report</span>Mainstream outlet</li><li><span class="src-type">News report</span>Right-leaning outlet</li></ul>
</div>
<div class="entry">
<p class="tag">Example · still being sourced</p>
<div class="entry-top"><p class="entry-text">Bring high-speed internet to every rural county</p><span class="pills"><span class="pill sourcing">Still finding sources</span><span class="pill s-not_started">Not started</span></span></div>
<p class="entry-cat">Infrastructure</p>
<ul class="entry-src"><li><span class="src-type">News report</span>One outlet so far</li></ul>
</div>
<figcaption class="cap">Made-up examples to show the layout. Real entries link to each source.</figcaption>
</figure>
</div>
</div>
</section>

<section class="sec white" id="sourcing" aria-labelledby="h-src">
<div class="wrap">
<h2 id="h-src">Our sourcing standard</h2>
<p class="lede2">For each promise we look for three kinds of sources. The standard exists so a status doesn't rest on reporting from only one side of the aisle.</p>
<ul class="eq">
<li class="card"><span class="num">1</span><h3>A government record</h3><p>A vote record, a signed bill, an agency filing or a similar primary record.</p></li>
<li class="card"><span class="num">2</span><h3>Mainstream or left-leaning news</h3><p>At least one outlet from the mainstream or left-leaning press.</p></li>
<li class="card"><span class="num">3</span><h3>Right-leaning news</h3><p>At least one outlet from the right-leaning press.</p></li>
<li class="result"><h3>Sources you can check</h3><p>Every source we list is linked and labeled by type.</p></li>
</ul>
<ul class="notes">
<li><h3>When the record is the proof</h3><p>A promise to introduce, sponsor or pass a specific, named bill is checked against the congressional record, which shows exactly what happened to the bill. Many entries in the tracker are of this kind.</p></li>
<li class="amber"><h3>Still being sourced</h3><p>This is a new dataset, and sourcing is still being completed for many entries. Many of them carry a <span class="pill sourcing">Still finding sources</span> tag in the tracker instead of being presented as fully verified.</p></li>
<li class="slate"><h3>A good-faith reading, open to appeal</h3><p>A status is our reading of the sources linked on the entry, not an audited record. If you think one is wrong, you can appeal it with a named source.</p></li>
</ul>
<p class="more">Read the <a href="methodology/#sourcing">full sourcing rules</a>.</p>
</div>
</section>

<section class="sec" id="statuses" aria-labelledby="h-status">
<div class="wrap">
<h2 id="h-status">Six statuses</h2>
<p class="lede2">Every promise gets one of six statuses, based on what has actually happened so far.</p>
<ul class="legend-grid">
${Object.keys(STATUS).map(k => `<li><span class="pill s-${k}">${esc(STATUS[k])}</span><p>${esc(STATUS_MEANING[k])}</p></li>`).join('\n')}
</ul>
<p class="fine2">A promise whose outcome has not been fully verified can show <strong>Undetermined</strong> instead. That is a placeholder, not a verdict, and it is left out of the AOW Score until it is resolved.</p>
</div>
</section>

<section class="sec white" id="nonpartisan" aria-labelledby="h-fair">
<div class="wrap">
<h2 id="h-fair">The same standard for everyone</h2>
<p class="lede2">How the Index is run, in four commitments.</p>
<ul class="cards two">
<li class="card">${icon('tag')}<h3>Party is a fact, not a verdict</h3><p>A party badge is shown the way an election map shows one, and party is never assumed from context. Status colors are earned by outcome, never by party.</p></li>
<li class="card">${icon('check')}<h3>One standard, every official</h3><p>The same six statuses, the same sourcing standard and the same score formula apply to every official, current or former.</p></li>
<li class="card">${icon('list')}<h3>No ranking by party or score</h3><p>On these pages, officials are grouped by where they serve and listed alphabetically, or for the administration in the official order of office.</p></li>
<li class="card">${icon('shield')}<h3>Independent and openly funded</h3><p>Run by Action Over Words LLC and supported by memberships, optional tips and advertising. None of those changes a status or a score, and we don't knowingly accept money from elected officials, candidates, campaigns, parties or PACs.</p></li>
</ul>
</div>
</section>

<section class="sec" id="coverage" aria-labelledby="h-cov">
<div class="wrap">
<h2 id="h-cov">What is covered</h2>
<p class="lede2">Federal and state officials. Appointed officials such as Cabinet secretaries are included and marked Appointed in the tracker.</p>
<div class="two-col">
<div class="panel"><h3>Covered</h3><ul>
<li><strong>Federal:</strong> the President, the Vice President, Cabinet and senior White House officials, a set of sub-Cabinet law-enforcement and agency heads, and the U.S. Congress, including its non-voting members.</li>
<li><strong>State:</strong> in every state, the Governor, the Lieutenant Governor (or whichever office is first in succession) and the Attorney General. Some larger states go deeper into their other executive offices.</li>
<li><strong>Former officeholders</strong> and candidates who ran and lost are kept in the Archive, and past administrations are kept alongside the current one, under the same statuses and the same sourcing standard.</li>
</ul></div>
<div class="panel not"><h3>Not covered yet</h3><ul>
<li>County and city government, school boards and special districts.</li>
<li>State legislatures and judiciaries.</li>
<li>Federal judges and independent regulatory boards such as the Federal Reserve, which are a different category: appointed, often deliberately apolitical, and with less to track in the same way.</li>
</ul></div>
</div>
<p class="more"><a href="methodology/#coverage">What is and is not covered</a> in full.</p>
</div>
</section>

<section class="sec white" id="browse" aria-labelledby="h-browse">
<div class="wrap">
<h2 id="h-browse">Browse</h2>
<p class="lede2">Start in the interactive tracker, or browse the pages published here.</p>
<ul class="cards browse">${browse.join('')}</ul>
</div>
</section>

<section class="sec" id="corrections" aria-labelledby="h-fix">
<div class="wrap">
<div class="callout">
<div><h2 id="h-fix">Spot something wrong?</h2><p>If a status looks wrong, or you want to suggest a promise to track, write to <a href="mailto:${CONTACT}">${CONTACT}</a> or use the Contact form in the tracker (details on the <a href="contact/">contact page</a>). Appeals need a named source, the outlet and headline being cited, so they can be checked the same way every other entry is. <a href="methodology/#corrections">How corrections work</a>.</p></div>
<a class="btn" href="aow-index.html">Open the tracker</a>
</div>
</div>
</section>
</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': SITE_LD.concat([
      { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, isPartOf: { '@id': SITE + '/#website' },
        about: { '@id': SITE + '/#organization' }, dateModified: '{{LASTMOD}}', inLanguage: 'en-US' }
    ])
  };
  return layout({ depth: 0, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}', extraCss: HOME_CSS, mainClass: '', headExtra: `<script>${HOME_REDIRECT_JS}</script>\n`, csp: HOME_CSP });
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
    HOME_LANDING ? 'home page (/): generated landing page' : 'home page (/): off. index.html is a hand-written redirect to the tracker and is left alone (to switch the landing page on, replace index.html with a file that contains the marker comment, then run this script)',
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

  console.log(`Built ${model.pages.length} official pages + directory + methodology + about + contact + ${hubs.size} hub page${hubs.size === 1 ? '' : 's'}${HOME_LANDING ? ' + home page' : ''}; ${model.excluded.length} promises held back; ${changed} files changed, ${removed} stale pages removed, ${warnings.length} warnings.`);
}
main();
