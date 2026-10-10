#!/usr/bin/env node
/*!
 * ActionOverWords — static page generator
 * ------------------------------------------------------------------------
 * Reads the SAME data files the live site renders from (data.js + data/**) and
 * writes crawlable, script-free HTML pages:
 *
 *   officials/<id>/index.html   one page per person with qualifying promises
 *   officials/index.html        directory of those people
 *   sitemap.xml                 honest <lastmod> values (see tools/pages-manifest.json)
 *   robots.txt                  only if absent, or previously generated
 *   tools/pages-manifest.json   content hashes -> lastmod dates (committed)
 *   tools/pages-report.txt      what was published and what was held back, and why
 *
 * Nothing existing is edited. Every generated file carries a marker; the script
 * refuses to overwrite or delete anything that does not.
 *
 * Usage:  node tools/build-pages.js [--root .] [--site https://action-over-words.com]
 *                                   [--min-publishers 3] [--today YYYY-MM-DD]
 *                                   [--allow-shrink]
 * Requires Node 18+. No npm install, no network access, no secrets.
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
      state: e.state || '', termStart: e.termStart || '', years: e.years || '' }, extra || {}));
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
`.replace(/\n/g, '\n').trim();
const PARTY_CSS = ['d', 'r', 'i', 'np'].map(k => `.p-${k}{color:var(--party-${k});background:var(--party-${k}-bg)}`).join('') +
  Object.keys(STATUS).map(k => `.s-${k}{color:var(--${k});background:var(--${k}-bg)}.b-${k}{background:var(--${k})}`).join('');
const CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; base-uri 'none'; form-action 'none'";
const LEGAL = [['privacy-policy.html', 'Privacy Policy'], ['terms-of-service.html', 'Terms of Service'], ['cookie-policy.html', 'Cookie Policy'], ['dmca-policy.html', 'Copyright / DMCA'], ['faq.html', 'FAQ']];

function layout({ depth, title, description, canonical, body, ld, lastmodToken }) {
  const up = '../'.repeat(depth);
  const legal = LEGAL.filter(([f]) => fs.existsSync(path.join(ROOT, f))).map(([f, l]) => `<a href="${up}${f}">${l}</a>`).join('');
  return `<!DOCTYPE html>
${MARK}
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="ActionOverWords Index">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}${PARTY_CSS}</style>
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>` : ''}
</head>
<body>
<header class="masthead"><div class="wrap"><a class="logo" href="${up}aow-index.html"><span class="logo-mark">AOW</span><span class="logo-word">ActionOverWords Index</span></a><a class="cta" href="${up}aow-index.html">Open the tracker</a></div></header>
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
function seatText(seat) {
  const s = String(seat || '');
  if (/^(Senate|House)( ·|$)/.test(s)) return 'U.S. ' + s;
  if (/^Senate President\b/.test(s)) return 'State ' + s;
  return s;
}

function roleLabel(e) {
  if (e.kind === 'current') return 'Current role · ' + seatText(e.seat);
  if (e.kind === 'past') return e.adminLabel + (e.years ? ' (' + e.years + ')' : '') + ' · ' + seatText(e.seat);
  return 'Archive · ' + seatText(e.seat) + (e.years ? ' (' + e.years + ')' : '');
}

function renderOfficial(pg) {
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
${distBar(d, r.all.length)}
${hidden ? `<p class="legend">${r.shown.length} of ${r.all.length} are listed on this page; the rest do not yet meet the three-publisher sourcing standard for publication here and appear only in the interactive tracker.</p>` : ''}
${cards}
</section>`;
  }).join('\n');

  const priors = pg.priors.length ? `<h2>Earlier offices</h2><p class="sub">${pg.priors.map(e => esc(seatText(e.seat) + (e.years ? ' (' + e.years + ')' : ''))).join(' · ')}</p>` : '';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="../../aow-index.html">Home</a> › <a href="../">Officials</a> › ${esc(pg.name)}</nav>
<h1>${esc(pg.name)}${p0.party ? `<span class="chip p-${partyKey(p0.party)}">${esc(partyLabel(p0.party))}</span>` : ''}</h1>
<p class="sub">${esc(seatText(p0.seat))}${p0.termStart && p0.kind === 'current' ? ' · in this role since ' + esc(p0.termStart) : ''}</p>
${roles}
${priors}
<div class="info"><strong>How to read this page.</strong> Each status is ActionOverWords' assessment based on the sources listed. A listed promise needs sources from at least three distinct publishers, including at least one primary record. The AOW Score averages a person's tracked promises: Completed 100, Compromise 60, In progress 40, Stalled 15, Not started 0, Broken 0. <a href="../../aow-index.html">Full methodology and the interactive tracker</a>.</div>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Person', name: pg.name, jobTitle: seatText(p0.seat), url: canonical },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/aow-index.html' },
        { '@type': 'ListItem', position: 2, name: 'Officials', item: SITE + '/officials/' },
        { '@type': 'ListItem', position: 3, name: pg.name, item: canonical }] }
    ]
  };
  return layout({ depth: 2, title, description: desc, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

function renderDirectory(pages, roster) {
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
  const list = keys.map(k => `
<section class="dir-sec"><h2>${esc(k.split('|')[1])}</h2><ul class="dir">${bySec.get(k).map(pg => {
    const all = pg.roles.flatMap(r => r.all), sc = scoreOf(pg.roles[0].all);
    return `<li><a href="${esc(pg.slug)}/">${esc(pg.name)}</a>${pg.primary.party ? `<span class="chip p-${partyKey(pg.primary.party)}">${esc(partyLabel(pg.primary.party))}</span>` : ''}<span class="meta">${esc(seatText(pg.primary.seat))} · ${all.length} promise${all.length === 1 ? '' : 's'}${sc === null ? '' : ' · score ' + sc}</span></li>`;
  }).join('')}</ul></section>`).join('');
  // everyone else on the roster: listed by name only, no page until they have publishable promises
  const rsec = e => (e.state === 'US' ? '0|Federal administration' : '1|' + (STATE_NAMES[e.state] || e.state || 'Other'));
  const rBy = new Map();
  roster.forEach(e => { const k = rsec(e); if (!rBy.has(k)) rBy.set(k, []); rBy.get(k).push(e); });
  const rKeys = [...rBy.keys()].sort((a, b) => a.split('|')[0].localeCompare(b.split('|')[0]) || a.split('|')[1].localeCompare(b.split('|')[1]));
  const rosterHtml = roster.length ? `
<h2 id="all-officials" style="margin-top:44px">Everyone else on the roster</h2>
<p class="sub">${roster.length} more current officials are tracked in <a href="../aow-index.html">the interactive tracker</a> and have no promises published on this site yet. A page appears here automatically once an official has promises that meet the sourcing standard.</p>
${rKeys.map(k => `<section class="dir-sec"><h3>${esc(k.split('|')[1])}</h3><ul class="dir">${rBy.get(k).map(e =>
    `<li><span>${esc(e.name)}</span>${e.party ? `<span class="chip p-${partyKey(e.party)}">${esc(partyLabel(e.party))}</span>` : ''}<span class="meta">${esc(seatText(e.seat))}</span></li>`).join('')}</ul></section>`).join('')}` : '';
  const canonical = SITE + '/officials/';
  const title = 'Officials With Tracked Promises | ActionOverWords';
  const description = `${pages.length + roster.length} current and past officials tracked, ${pages.length} with ${total} sourced promises published: what was promised, what happened, and the evidence.`;
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="../aow-index.html">Home</a> › Officials</nav>
<h1>Officials with tracked promises</h1>
<p class="sub">${pages.length} people have promises published here, ${total} in all. Every published promise carries sources from at least three distinct publishers, including at least one primary record. The rest of the roster is listed further down.</p>
${list}
${rosterHtml}`;
  const ld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical };
  return layout({ depth: 1, title, description, canonical, body, ld, lastmodToken: '{{LASTMOD}}' });
}

/* ---------------------------------- build ---------------------------------- */
function main() {
  const { D, hash: dataHash, fileCount } = loadDataset();
  const model = buildModel(D);
  const manifestFile = path.join(ROOT, 'tools', 'pages-manifest.json');
  const prev = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { pages: {}, officialCount: 0 };

  if (!model.pages.length) fatal('No publishable promises found. Refusing to publish an empty site (is the data directory intact?).');
  if (prev.officialCount >= 10 && model.pages.length < prev.officialCount * 0.85 && !argv['allow-shrink'])
    fatal(`Official pages would drop from ${prev.officialCount} to ${model.pages.length} (>15%). Looks like a data problem. Re-run with --allow-shrink if intentional.`);

  // refuse to touch hand-written files that happen to share our paths
  const dirIndex = path.join(ROOT, 'officials', 'index.html');
  if (fs.existsSync(dirIndex) && !isOurs(dirIndex)) fatal('officials/index.html exists and was not generated by this script. Not overwriting.');
  model.pages.forEach(pg => { const f = path.join(ROOT, 'officials', pg.slug, 'index.html'); if (fs.existsSync(f) && !isOurs(f)) fatal(f + ' exists and was not generated by this script. Not overwriting.'); });

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
  model.pages.forEach(pg => {
    const raw = renderOfficial(pg), key = `officials/${pg.slug}/`;
    const lm = stamp(key, raw);
    out.set(`officials/${pg.slug}/index.html`, raw.replace('{{LASTMOD}}', lm));
  });
  { const raw = renderDirectory(model.pages, model.roster), lm = stamp('officials/', raw); out.set('officials/index.html', raw.replace('{{LASTMOD}}', lm)); }

  // sitemap: honest lastmod for generated pages, the SPA (hash of page + data), and static root pages that exist
  const urls = [];
  const spa = path.join(ROOT, 'aow-index.html');
  if (fs.existsSync(spa)) { stamp('aow-index.html', '', sha(fs.readFileSync(spa, 'utf8')) + dataHash); urls.push(['aow-index.html', next['aow-index.html'].lastmod]); }
  urls.push(['officials/', next['officials/'].lastmod]);
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
    `officials with a page: ${model.pages.length}`,
    `promises published on pages: ${model.pages.reduce((t, pg) => t + pg.roles.reduce((n, r) => n + r.shown.length, 0), 0)}`,
    `current officials listed by name only (no publishable promises yet): ${model.roster.length}`,
    `promises held back (fewer than ${MIN_PUBLISHERS} distinct publishers, or no primary-record source): ${model.excluded.length}`,
    ...model.excluded.map(x => `  - ${x.id} (${x.member}): ${x.publishers} publisher(s), primary-record source: ${x.primary ? 'yes' : 'no'}`),
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
  if (writeIfChanged(path.join(ROOT, 'sitemap.xml'), sitemap) ) changed++;
  const robotsFile = path.join(ROOT, 'robots.txt');
  if (!fs.existsSync(robotsFile) || isOurs(robotsFile)) { if (writeIfChanged(robotsFile, robots)) changed++; }
  else warn('robots.txt exists and is hand-written; left untouched. Make sure it contains: Sitemap: ' + SITE + '/sitemap.xml');
  const manifest = { version: 1, officialCount: model.pages.length, pages: next };
  if (writeIfChanged(manifestFile, JSON.stringify(manifest, null, 1) + '\n')) changed++;
  if (writeIfChanged(path.join(ROOT, 'tools', 'pages-report.txt'), report)) changed++;

  console.log(`Built ${model.pages.length} official pages + directory; ${model.excluded.length} promises held back; ${changed} files changed, ${removed} stale pages removed, ${warnings.length} warnings.`);
}
main();
