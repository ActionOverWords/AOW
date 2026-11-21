/* ActionOverWords Index: Member votes and Member forums (the "Members" tab).
   Loaded by aow-index.html after its main script. Everything here talks to the database only through
   the functions in the User Info Data project (ballots_public, ballot_vote, forum_*, admin_*), which
   check the member's plan, the preview switch and every limit on the server. This file only draws pages.
   Built Nov 2026; see claude/aow-member-votes-forums-2026-11-09.md in the project. */
'use strict';

const MB = {
  live: false, checked: false, view: 'votes', pending: null,
  ballots: null, ballotsLoading: false, ballotsErr: '', ballotTab: 'features',
  me: null, meLoading: false,
  overview: null, overviewLoading: false,
  list: null, listLoading: false, listErr: '', filters: { cat: null, promise: null, q: '', sort: 'activity' },
  threadId: null, thread: null, threadLoading: false, threadErr: '',
  quote: null, editing: null, busy: false,
  draft: { body: '', url: '', kind: '' },
  draftNew: { cat: '', title: '', body: '', url: '', kind: '', promise: '', promiseQ: '' },
  admin: { tab: 'ballots', data: null, loading: false, queue: null, queueLoading: false }
};

/* ---------- small helpers ---------- */
function mbEsc(s){ return escAttr(s == null ? '' : String(s)); }
function mbCount(n){ return typeof roundedPlus === 'function' ? roundedPlus(Number(n) || 0) : String(n); }
function membersVisible(){ return !!(MB.live || isAdmin); }
function mbRerender(){ if(activeTab === 'members') render(); }
function mbErr(e){
  const msg = e && (e.message || e.error_description || e.details);
  return msg && !/^(Failed to fetch|NetworkError)/.test(msg) ? msg : 'That did not go through. Check your connection and try again.';
}
function mbDate(ts, withYear){
  const d = new Date(ts); if(isNaN(d)) return '';
  const opts = { month: 'short', day: 'numeric' };
  if(withYear || d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}
function mbWhen(ts){
  const d = new Date(ts); if(isNaN(d)) return '';
  const s = (Date.now() - d.getTime()) / 1000;
  if(s < 60) return 'Just now';
  if(s < 3600) return Math.floor(s / 60) + ' min ago';
  if(s < 86400) return Math.floor(s / 3600) + ' hr ago';
  if(s < 172800) return 'Yesterday';
  return mbDate(ts);
}
function mbInitials(h){ const s = String(h || '?').replace(/[^A-Za-z0-9]/g, ''); return (s.slice(0, 2) || '?').toUpperCase(); }
async function mbRpc(name, args){
  if(!sb) throw new Error('The site could not reach the server. Reload the page.');
  const { data, error } = await sb.rpc(name, args || {});
  if(error) throw error;
  return data;
}
const MB_KIND_LABEL = { official: 'Official record', mainstream: 'Mainstream news', right: 'Right-leaning news', other: 'Other source' };
const MB_REASONS = [
  ['personal_attack', 'A personal attack'], ['no_source', 'A claim with no source'], ['campaigning', 'Campaigning, endorsing or fundraising'],
  ['spam', 'Spam or advertising'], ['off_topic', 'Off topic'], ['other', 'Something else']
];
const MB_CHECK = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
const MB_LOCK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
const MB_SYM = '<svg viewBox="0 0 166.55 181.3" width="16" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M146.33 56.97A41.65 41.65 0 0 1 147.23 65.62L147.23 102.64A41.65 41.65 0 0 1 105.59 144.28L61.09 144.28L12.72 179.75A7.99 7.99 0 0 1 0 173.31L0 65.62A41.65 41.65 0 0 1 41.65 23.97L105.59 23.97A41.65 41.65 0 0 1 113.08 24.65L100.03 39.95L41.65 39.95A25.66 25.66 0 0 0 15.98 65.62L15.98 157.53L53.75 129.84A7.99 7.99 0 0 1 58.47 128.3L105.59 128.3A25.66 25.66 0 0 0 131.25 102.64L131.25 74.66L146.33 56.97ZM36.37 83.3L66.41 113.33A13.88 13.88 0 0 0 86.79 112.53L163.23 22.89A13.88 13.88 0 0 0 142.11 4.88L75.41 83.08L56.01 63.67A13.88 13.88 0 0 0 36.37 83.3Z"/></svg>';

/* ---------- the tab: shown when live, or to admins as a preview ---------- */
async function membersCheckLive(){
  try { MB.live = !!(await mbRpc('members_live')); } catch(e){ MB.live = false; }
  MB.checked = true;
  membersSyncTab();
  membersApplyPending();
}
function membersSyncTab(){
  const show = membersVisible();
  document.querySelectorAll('[data-tab="members"]').forEach(b => { b.hidden = !show; });
  if(!show && activeTab === 'members'){ activeTab = 'featured'; render(); }
  if(typeof fitHeader === 'function') { try { fitHeader(); } catch(e){ /* header fit is cosmetic */ } }
}
// Called by aow-index.html's renderAccountZone() after every sign-in, sign-out and page load.
function membersOnAccountChange(){
  MB.ballots = null; MB.me = null; MB.overview = null; MB.list = null; MB.thread = null;
  MB.admin.data = null; MB.admin.queue = null; MB.quote = null; MB.editing = null;
  MB.ballotsErr = ''; MB.listErr = ''; MB.threadErr = '';
  membersSyncTab();
  membersApplyPending();
  if(activeTab === 'members') membersLoadView();
}
// Links into the tab: #votes, #forums, #thread=12. Called by aow-index.html's handleLinkHash().
function membersHandleHash(h){
  let m;
  if(h === 'votes' || h === 'members') MB.pending = { view: 'votes' };
  else if(h === 'forums') MB.pending = { view: 'forums' };
  else if((m = /^thread=(\d{1,12})$/.exec(h))) MB.pending = { view: 'thread', id: Number(m[1]) };
  else return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch(e){ /* old browser */ }
  membersApplyPending();
  return true;
}
function membersApplyPending(){
  if(!MB.pending || !MB.checked) return;
  if(!membersVisible()) return;           // not live yet: the link waits until an admin signs in, or does nothing
  const p = MB.pending; MB.pending = null;
  if(p.view === 'thread') membersOpenThread(p.id); else membersOpen(p.view);
}
function membersOpen(view){
  if(!membersVisible()) return;
  MB.view = view || 'votes';
  if(MB.view !== 'thread') MB.threadId = null;
  try { if(typeof closeMenu === 'function' && document.body.classList.contains('menu-open')) closeMenu(false); } catch(e){ /* menu not open */ }
  selectTab('members');
  membersLoadView();
}
function membersOpenThread(id){
  MB.threadId = Number(id); MB.thread = null; MB.threadErr = ''; MB.quote = null; MB.editing = null;
  MB.draft = { body: '', url: '', kind: '' };
  membersOpen('thread');
}
function membersLoadView(){
  if(MB.view === 'votes') mbLoadBallots();
  else if(MB.view === 'forums'){ mbLoadMe(); mbLoadOverview(); mbLoadList(); }
  else if(MB.view === 'thread'){ mbLoadMe(); mbLoadThread(); }
  else if(MB.view === 'new'){ mbLoadMe(); mbLoadOverview(); }
  else if(MB.view === 'admin'){ mbLoadAdmin(); mbLoadQueue(); }
}

/* ---------- loading ---------- */
async function mbLoadBallots(force){
  if(MB.ballotsLoading || ((MB.ballots || MB.ballotsErr) && !force)) return;
  MB.ballotsLoading = true; MB.ballotsErr = '';
  try { MB.ballots = await mbRpc('ballots_public'); } catch(e){ MB.ballotsErr = mbErr(e); }
  MB.ballotsLoading = false; mbRerender();
}
async function mbLoadMe(force){
  if(MB.meLoading || (MB.me && !force)) return;
  MB.meLoading = true;
  try { MB.me = await mbRpc('forum_me'); } catch(e){ MB.me = { available: true, signed_in: !!CURRENT_USER, can_read: false, error: mbErr(e) }; }
  MB.meLoading = false; mbRerender();
}
async function mbLoadOverview(force){
  if(!CURRENT_USER || MB.overviewLoading || (MB.overview && !force)) return;
  MB.overviewLoading = true;
  try { MB.overview = await mbRpc('forum_overview'); } catch(e){ MB.overview = { categories: [], total: 0, error: mbErr(e) }; }
  MB.overviewLoading = false; mbRerender();
}
async function mbLoadList(more){
  if(!CURRENT_USER || MB.listLoading) return;
  if(!more && ((MB.list && MB.list._key === mbListKey()) || (MB.listErr && MB.listErrKey === mbListKey()))) return;
  MB.listLoading = true; MB.listErr = '';
  const f = MB.filters, offset = more && MB.list ? MB.list.threads.length : 0;
  try {
    const data = await mbRpc('forum_list', { p_category: f.cat, p_promise: f.promise, p_search: f.q || null, p_sort: f.sort, p_limit: 25, p_offset: offset });
    if(more && MB.list) MB.list.threads = MB.list.threads.concat(data.threads || []);
    else MB.list = data;
    MB.list.total = data.total; MB.list._key = mbListKey();
  } catch(e){ MB.listErr = mbErr(e); MB.listErrKey = mbListKey(); }
  MB.listLoading = false; mbRerender();
}
function mbListKey(){ const f = MB.filters; return [f.cat, f.promise, f.q, f.sort].join('|'); }
async function mbLoadThread(more){
  if(!CURRENT_USER || MB.threadLoading || !MB.threadId) return;
  if(!more && MB.thread && MB.thread.thread && MB.thread.thread.id === MB.threadId && !MB.thread._stale) return;
  if(!more && !MB.thread && MB.threadErr) return;
  MB.threadLoading = true; MB.threadErr = '';
  try {
    const offset = more && MB.thread ? MB.thread.posts.length : 0;
    const data = await mbRpc('forum_thread', { p_thread: MB.threadId, p_limit: 50, p_offset: offset });
    if(more && MB.thread) MB.thread.posts = MB.thread.posts.concat(data.posts || []);
    else MB.thread = data;
    MB.thread.total_posts = data.total_posts; MB.thread.thread = data.thread; MB.thread._stale = false;
  } catch(e){ MB.threadErr = mbErr(e); MB.thread = null; }
  MB.threadLoading = false; mbRerender();
}
async function mbLoadAdmin(force){
  if(!isAdmin || MB.admin.loading || (MB.admin.data && !force)) return;
  MB.admin.loading = true;
  try { MB.admin.data = await mbRpc('admin_ballots'); } catch(e){ MB.admin.data = { error: mbErr(e), ballots: [], suggestions: [] }; }
  MB.admin.loading = false; mbRerender();
}
async function mbLoadQueue(force){
  if(!isAdmin || MB.admin.queueLoading || (MB.admin.queue && !force)) return;
  MB.admin.queueLoading = true;
  try { MB.admin.queue = await mbRpc('forum_mod_queue'); } catch(e){ MB.admin.queue = { error: mbErr(e), reports: [], recent: [], bans: [] }; }
  MB.admin.queueLoading = false; mbRerender();
}

/* ---------- the green band (title, sub-tabs, filters) ---------- */
function mbSubnav(){
  const items = [['votes', 'Votes'], ['forums', 'Forums']];
  if(isAdmin) items.push(['admin', 'Admin']);
  const cur = MB.view === 'thread' || MB.view === 'new' ? 'forums' : MB.view;
  return `<nav class="mb-subnav" aria-label="Members sections">${items.map(([k, l]) =>
    `<a href="#${k === 'admin' ? 'members' : k}" ${k === cur ? 'aria-current="page"' : ''} onclick="membersOpen('${k}'); return false;">${l}</a>`).join('')}</nav>`;
}
function mbPreviewNote(){
  return !MB.live && isAdmin ? `<p class="mb-preview">${MB_LOCK}<span>Preview. Only admins can see the Members tab. Switch it on for everyone under Admin.</span></p>` : '';
}
function membersBandHTML(){
  if(MB.view === 'thread') return mbThreadBand();
  let head = '';
  if(MB.view === 'votes') head = mbVotesBand();
  else if(MB.view === 'forums') head = mbForumsBand();
  else if(MB.view === 'new') head = `<div class="mb-head"><h1>Start a thread</h1><p class="r-sub">Supporter members can start threads. Keep it specific and link your sources.</p></div>`;
  else if(MB.view === 'admin') head = `<div class="mb-head"><h1>Members admin</h1><p class="r-sub">The switch, the ballots and the forum reports.</p></div>`;
  return mbSubnav() + mbPreviewNote() + head;
}

/* ---------- votes ---------- */
function mbVotesBand(){
  const b = MB.ballots, can = !!(b && b.can_vote);
  const open = b && b.ballots ? b.ballots : [];
  const closes = open.length ? mbDate(open[0].closes_at, true) : '';
  const card = can && open.length ? `<section class="mb-card mb-desk" aria-labelledby="mb-yb">
      <div class="mb-card-top"><h2 id="mb-yb">Your ballots</h2><span>${open.length > 1 && open.every(x => x.closes_at === open[0].closes_at) ? 'Both close ' + mbEsc(closes) : ''}</span></div>
      <ul>${open.map(x => { const pick = x.items.find(i => i.id === x.my_item);
        return `<li><span>${mbEsc(x.title)}</span>${pick ? `<b class="mb-voted">${MB_CHECK}${mbEsc(pick.title)}</b>` : '<em>Not voted yet</em>'}</li>`; }).join('')}</ul>
    </section>` : '';
  const tabs = open.length > 1 ? `<div class="mb-ballot-tabs" role="tablist" aria-label="Ballots">${open.map(x => {
      const on = MB.ballotTab === x.kind, pick = x.items.find(i => i.id === x.my_item);
      return `<button type="button" role="tab" aria-selected="${on}" class="${on ? 'on' : ''}" onclick="MB.ballotTab='${x.kind}'; mbRerender();"><b>${x.kind === 'features' ? 'Features' : 'Offices'}</b><span>${can ? (pick ? 'Voted: ' + mbEsc(pick.title) : 'Not voted yet') : mbCount(x.total) + ' votes'}</span></button>`;
    }).join('')}</div>` : '';
  return `<div class="mb-split"><div class="mb-head"><h1>Member votes</h1><p class="r-sub">Choose what we build next and which offices we add to the Index. One vote per ballot, the same for every paid plan.</p></div>${card}</div>${tabs}`;
}
function mbVotesHTML(){
  if(MB.ballotsErr) return `<div class="empty">${mbEsc(MB.ballotsErr)} <button class="btn-sm" onclick="mbLoadBallots(true)">Try again</button></div>`;
  const b = MB.ballots;
  if(!b) return `<div class="empty">Loading the ballots…</div>`;
  if(!b.available) return `<div class="empty">Member votes aren't open yet.</div>`;
  let gate = '';
  if(!CURRENT_USER) gate = `<div class="mb-upsell">${MB_LOCK}<span><b>Anyone can see the results.</b> Members on any paid plan get one vote on each ballot.</span><span class="mb-upsell-btns"><button class="btn-sm" onclick="showAuthModal('login')">Log in</button><button class="btn-primary btn-sm" onclick="goToPlans()">See plans</button></span></div>`;
  else if(!b.can_vote) gate = `<div class="mb-upsell">${MB_LOCK}<span><b>Voting is part of every paid plan.</b> Plus, Premium and Supporter members all get the same vote: one per ballot.</span><span class="mb-upsell-btns"><button class="btn-primary btn-sm" onclick="goToPlans()">See plans</button></span></div>`;
  const ballots = (b.ballots || []).map(x => mbBallotHTML(x, b.can_vote)).join('') || `<div class="empty">No ballot is open right now. The next one opens soon.</div>`;
  const wins = (b.winners || []).length ? `<section class="mb-group" aria-labelledby="mb-wins"><div class="mb-group-head"><h2 id="mb-wins">Won earlier ballots</h2><span>What members picked before</span></div>
      <ul class="mb-wins">${b.winners.map(w => `<li><div><b>${mbEsc(w.title)}</b><span>${w.kind === 'features' ? 'Features ballot' : 'Offices ballot'}</span></div><span class="mb-tag">${({ next_up: 'Next up', building: 'Building', shipped: 'Done' })[w.progress] || 'Next up'}</span></li>`).join('')}</ul></section>` : '';
  return gate + ballots + wins + `
    <section class="mb-how" aria-labelledby="mb-how"><div><h2 id="mb-how">How votes work</h2><p>Votes set our to-do list. They never change a promise’s status or an official’s score.</p></div>
      <ul class="mb-pledges">
        <li><b>One vote per ballot</b>Pick one item on each ballot. You can move your vote until the ballot closes.</li>
        <li><b>Same for every paid plan</b>Plus, Premium and Supporter members get the same vote, and every vote counts the same.</li>
        <li><b>Offices, not people</b>Everyone who holds a winning office is added under the same sourcing standard.</li>
        <li><b>When a ballot closes</b>The winner moves to Next up, we post progress here, and a new ballot opens.</li>
        <li><b>Suggest an item</b>Any paid member can suggest one. We review it before it goes on a ballot.</li>
        <li><b>Private and rounded</b>Who voted for what stays private. Totals are rounded down and shown with a plus.</li>
      </ul></section>`;
}
function mbBallotHTML(x, canVote){
  const max = Math.max(1, ...x.items.map(i => i.votes));
  const rows = x.items.map((i, n) => {
    let act = '';
    if(canVote && x.open){
      if(x.my_item === i.id) act = `<button class="btn-sm mb-on" aria-pressed="true" title="Take your vote back" onclick="mbUnvote(${x.id})" ${MB.busy ? 'disabled' : ''}>${MB_CHECK}Your vote</button>`;
      else if(x.my_item) act = `<button class="btn-sm" onclick="mbVote(${i.id})" aria-label="Move your vote to ${mbEsc(i.title)}" ${MB.busy ? 'disabled' : ''}>Move vote</button>`;
      else act = `<button class="btn-primary btn-sm" onclick="mbVote(${i.id})" aria-label="Vote for ${mbEsc(i.title)}" ${MB.busy ? 'disabled' : ''}>Vote</button>`;
    }
    return `<li class="mb-vrow"><span class="mb-rank" aria-hidden="true">${n + 1}</span>
      <div class="mb-vmain"><h3>${mbEsc(i.title)}</h3>${i.detail ? `<p>${mbEsc(i.detail)}</p>` : ''}</div>
      <div class="mb-vcount" title="Exactly ${i.votes.toLocaleString('en-US')} vote${i.votes === 1 ? '' : 's'}"><b>${mbCount(i.votes)}</b> vote${i.votes === 1 ? '' : 's'}<div class="mb-bar" aria-hidden="true"><i style="width:${Math.round(i.votes / max * 100)}%"></i></div></div>
      <div class="mb-vact">${act}</div></li>`;
  }).join('');
  const hideOnPhone = MB.ballotTab !== x.kind ? ' mb-phone-hide' : '';
  const suggest = canVote ? `<div class="mb-suggest"><span>Any paid member can suggest an item for the next ballot.</span><button class="btn-sm" onclick="mbSuggestForm('${x.kind}')">Suggest ${x.kind === 'features' ? 'a feature' : 'an office'}</button></div>` : '';
  return `<section class="mb-group${hideOnPhone}" aria-label="${mbEsc(x.title)}">
    <div class="mb-group-head"><h2>${mbEsc(x.title)}</h2><span title="Exactly ${Number(x.total).toLocaleString('en-US')}">1 vote · ${x.open ? 'closes ' + mbDate(x.closes_at, true) : 'voting has ended'} · ${mbCount(x.total)} votes cast</span></div>
    ${x.intro ? `<p class="mb-intro">${mbEsc(x.intro)}</p>` : ''}<ol class="mb-vlist">${rows}</ol>${suggest}</section>`;
}
async function mbVote(itemId){
  if(MB.busy) return;
  MB.busy = true; mbRerender();
  try { MB.ballots = await mbRpc('ballot_vote', { p_item: itemId }); showStatus('Vote saved.'); }
  catch(e){ showStatus(mbErr(e), true, 4000); }
  MB.busy = false; mbRerender();
}
async function mbUnvote(ballotId){
  if(MB.busy) return;
  MB.busy = true; mbRerender();
  try { MB.ballots = await mbRpc('ballot_unvote', { p_ballot: ballotId }); showStatus('Vote taken back. You can vote again until the ballot closes.'); }
  catch(e){ showStatus(mbErr(e), true, 4000); }
  MB.busy = false; mbRerender();
}
function mbSuggestForm(kind){
  openModal(`<h3>Suggest ${kind === 'features' ? 'a feature' : 'an office'}</h3>
    <p class="score-note" style="margin-top:-4px">We review every suggestion before it goes on a ballot. You can send 3 a week.${kind === 'offices' ? ' Name an office, not a person.' : ''}</p>
    <label>Name<input id="mb-sg-title" maxlength="80" placeholder="${kind === 'features' ? 'For example: Promise search by bill number' : 'For example: State treasurers'}"></label>
    <label>Details (optional)<textarea id="mb-sg-detail" maxlength="500" rows="3"></textarea></label>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="mbSuggestSend('${kind}')">Send suggestion</button></div>`);
}
async function mbSuggestSend(kind){
  const t = document.getElementById('mb-sg-title').value, d = document.getElementById('mb-sg-detail').value;
  try { await mbRpc('ballot_suggest', { p_kind: kind, p_title: t, p_detail: d }); closeModal(); showStatus('Thanks. We will review it before the next ballot.', false, 3500); }
  catch(e){ showStatus(mbErr(e), true, 4000); }
}

/* ---------- forums: list ---------- */
function mbForumGate(){
  if(!CURRENT_USER) return `<div class="mb-upsell">${MB_LOCK}<span><b>The member forums are for members.</b> Create a free account to read every thread. Replies start with Premium, and Supporter members start threads.</span><span class="mb-upsell-btns"><button class="btn-sm" onclick="showAuthModal('login')">Log in</button><button class="btn-primary btn-sm" onclick="showAuthModal('signup')">Create a free account</button></span></div>`;
  return '';
}
function mbForumsBand(){
  const me = MB.me || {}, f = MB.filters, cats = (MB.overview && MB.overview.categories) || [];
  let start = '';
  if(CURRENT_USER && me.can_start) start = `<button class="btn-primary" onclick="mbNewThread()">+ Start a thread</button>`;
  else if(CURRENT_USER && me.banned_until) start = `<p class="mb-note">${MB_LOCK}<span>Your posting is paused by a moderator.</span></p>`;
  else if(CURRENT_USER && me.can_reply) start = `<p class="mb-note">${MB_LOCK}<span>You can read and reply. Supporter members start threads.</span></p>`;
  else if(CURRENT_USER) start = `<p class="mb-note">${MB_LOCK}<span>You can read every thread. Replies start with Premium.</span></p>`;
  const filters = CURRENT_USER ? `<form class="mb-filters" onsubmit="mbSearch(event)" role="search">
      <label class="mb-search"><span class="vh">Search the forums</span><input type="search" id="mb-q" value="${mbEsc(f.q)}" placeholder="Search thread titles…"></label>
      <select aria-label="Category" onchange="mbSetFilter('cat', this.value ? Number(this.value) : null)"><option value="">All categories</option>${cats.map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${mbEsc(c.name)}</option>`).join('')}</select>
      <select aria-label="Sort" onchange="mbSetFilter('sort', this.value)">${[['activity', 'Latest activity'], ['newest', 'Newest'], ['replies', 'Most replies']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </form>` : '';
  return `<div class="mb-split"><div class="mb-head"><h1>Member forums</h1><p class="r-sub">Talk through promises, sources and the site with other members. Bring the record.</p></div><div class="mb-start">${start}</div></div>${filters}`;
}
function mbSearch(ev){ ev.preventDefault(); const el = document.getElementById('mb-q'); mbSetFilter('q', el ? el.value.trim() : ''); }
function mbSetFilter(k, v){ MB.filters[k] = v; MB.list = null; MB.listErr = ''; mbLoadList(); mbRerender(); }
function mbPromiseById(pid){ return (typeof PROMISES !== 'undefined' ? PROMISES : []).find(p => String(p.id) === String(pid)) || null; }
function mbForumsHTML(){
  const gate = mbForumGate();
  if(gate) return gate + mbRulesHTML(true);
  const me = MB.me || {}, f = MB.filters, ov = MB.overview || { categories: [] };
  const cats = ov.categories || [];
  const chips = `<nav class="mb-chips" aria-label="Forum categories"><a href="#" ${f.cat === null ? 'aria-current="page"' : ''} onclick="mbSetFilter('cat', null); return false;">All threads <em>${mbCount(ov.total || 0)}</em></a>${cats.map(c =>
    `<a href="#" ${f.cat === c.id ? 'aria-current="page"' : ''} onclick="mbSetFilter('cat', ${c.id}); return false;">${mbEsc(c.name)} <em>${mbCount(c.threads)}</em></a>`).join('')}</nav>`;
  let promiseBar = '';
  if(f.promise){
    const p = mbPromiseById(f.promise), m = p && typeof memberById === 'function' ? memberById(p.memberId) : null;
    promiseBar = `<div class="mb-promisebar"><span>Threads about ${p ? `“${mbEsc(p.text)}”${m ? ' · ' + mbEsc(m.name) : ''}` : 'one promise'}</span>
      <span class="mb-upsell-btns">${me.can_start ? `<button class="btn-primary btn-sm" onclick="mbNewThread('${escJsAttr(String(f.promise))}')">Start a thread about it</button>` : ''}<button class="btn-sm" onclick="mbSetFilter('promise', null)">Show all threads</button></span></div>`;
  }
  let rows;
  if(MB.listErr) rows = `<div class="empty">${mbEsc(MB.listErr)}</div>`;
  else if(!MB.list) rows = `<div class="empty">Loading threads…</div>`;
  else if(!MB.list.threads.length) rows = `<div class="empty">${f.q || f.cat || f.promise ? 'No threads match.' : 'No threads yet.'}</div>`;
  else rows = `<ul class="mb-tlist">${MB.list.threads.map(t => {
      const p = t.promise_id ? mbPromiseById(t.promise_id) : null;
      return `<li class="mb-trow${t.hidden ? ' mb-hidden' : ''}"><div class="mb-tmain"><span class="mb-cat">${mbEsc(t.category)}</span>
        <a class="mb-ttitle" href="#thread=${t.id}" onclick="membersOpenThread(${t.id}); return false;">${mbEsc(t.title)}</a>
        <div class="mb-meta"><span>Started by ${mbEsc(t.author)}</span>${t.author_team ? '<span class="mb-tag">Team</span>' : ''}${t.pinned ? '<span class="mb-tag">Pinned</span>' : ''}${t.locked ? '<span class="mb-tag mb-tag-quiet">Locked</span>' : ''}${t.hidden ? '<span class="mb-tag mb-tag-warn">Hidden</span>' : ''}${p ? `<span class="pill p-${statusClass(p.status)}">${mbEsc(statusMeta(p.status).label)}</span>` : ''}</div></div>
        <div class="mb-num" title="Exactly ${t.replies} repl${t.replies === 1 ? 'y' : 'ies'}">${mbCount(t.replies)}<span>repl${t.replies === 1 ? 'y' : 'ies'}</span></div>
        <div class="mb-when">${mbWhen(t.last_post_at)}</div></li>`; }).join('')}</ul>
      ${MB.list.threads.length < MB.list.total ? `<div class="mb-more"><span title="Exactly ${MB.list.total}">Showing ${MB.list.threads.length} of ${mbCount(MB.list.total)} threads</span><button class="btn-sm" onclick="mbLoadList(true)" ${MB.listLoading ? 'disabled' : ''}>Load more</button></div>` : ''}`;
  const catList = `<section class="mb-desk" aria-labelledby="mb-cats"><h2 id="mb-cats">Categories</h2><ul class="mb-slist">
      <li><a href="#" ${f.cat === null ? 'aria-current="page"' : ''} onclick="mbSetFilter('cat', null); return false;">All threads<em>${mbCount(ov.total || 0)}</em></a></li>
      ${cats.map(c => `<li><a href="#" ${f.cat === c.id ? 'aria-current="page"' : ''} onclick="mbSetFilter('cat', ${c.id}); return false;">${mbEsc(c.name)}<em>${mbCount(c.threads)}</em></a></li>`).join('')}</ul></section>`;
  return `${chips}${promiseBar}<div class="mb-layout"><section aria-labelledby="mb-th"><div class="mb-group-head"><h2 id="mb-th">${f.q ? 'Threads matching “' + mbEsc(f.q) + '”' : 'Latest threads'}</h2><span title="Exactly ${MB.list ? MB.list.total : 0}">${MB.list ? mbCount(MB.list.total) + ' thread' + (MB.list.total === 1 ? '' : 's') : ''}</span></div>${rows}</section>
    <aside class="mb-side">${catList}${mbNameBox()}${mbRulesHTML(false)}</aside></div>`;
}
function mbRulesHTML(wide){
  return `<section class="${wide ? 'mb-how' : ''}" aria-labelledby="mb-rules"><div><h2 id="mb-rules">House rules</h2>${wide ? '<p>Members read and post here under a forum name they pick, never their email or real name.</p>' : ''}</div>
    <ul class="mb-rules"><li>Link a source for any claim.</li><li>Argue the record, not the person.</li><li>No campaigning, endorsements or fundraising.</li><li>Use Report and a moderator reviews it.</li></ul>
    ${wide ? '' : '<p class="mb-who">Free and Plus members can read. Premium members can also reply. Only Supporter members start threads.</p>'}</section>`;
}
function mbNameBox(){
  const me = MB.me;
  if(!me || !(me.can_reply || me.can_start || me.handle)) return '';
  return `<section aria-labelledby="mb-name"><h2 id="mb-name">Your forum name</h2>${me.handle
    ? `<p class="mb-who">You post as <b>${mbEsc(me.handle)}</b>. <a href="#" onclick="mbHandleForm(); return false;">Change</a></p>`
    : `<p class="mb-who">Pick a name before you post. It shows on your posts instead of your email or real name.</p><button class="btn-sm" onclick="mbHandleForm()">Pick a forum name</button>`}</section>`;
}
function mbHandleForm(after){
  const me = MB.me || {};
  openModal(`<h3>${me.handle ? 'Change your forum name' : 'Pick a forum name'}</h3>
    <p class="score-note" style="margin-top:-4px">3 to 24 letters, numbers or underscores. It shows on your posts. You can change it once every 30 days.</p>
    <label>Forum name<input id="mb-handle" maxlength="24" value="${mbEsc(me.handle || '')}" autocomplete="off" spellcheck="false"></label>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="mbHandleSave(${after ? `'${after}'` : ''})">Save name</button></div>`);
  setTimeout(() => { const el = document.getElementById('mb-handle'); if(el) el.focus(); }, 30);
}
async function mbHandleSave(after){
  const v = document.getElementById('mb-handle').value;
  try {
    const h = await mbRpc('forum_set_handle', { p_handle: v });
    if(MB.me) MB.me.handle = h;
    closeModal(); showStatus('Saved. You post as ' + h + '.');
    if(after === 'reply') mbSubmitReply();
    else if(after === 'new') mbSubmitThread();
    mbRerender();
  } catch(e){ showStatus(mbErr(e), true, 4000); }
}

/* ---------- forums: one thread ---------- */
function mbThreadBand(){
  const d = MB.thread, t = d && d.thread;
  if(!t) return mbSubnav() + mbPreviewNote() + `<div class="mb-head"><h1>${MB.threadErr ? 'Thread not found' : 'Loading…'}</h1></div>`;
  const p = t.promise_id ? mbPromiseById(t.promise_id) : null;
  const m = p && typeof memberById === 'function' ? memberById(p.memberId) : null;
  const admin = isAdmin ? `<button class="btn-sm" onclick="mbMod('${t.pinned ? 'unpin' : 'pin'}', ${t.id})">${t.pinned ? 'Unpin' : 'Pin'}</button>
      <button class="btn-sm" onclick="mbMod('${t.locked ? 'unlock' : 'lock'}', ${t.id})">${t.locked ? 'Unlock' : 'Lock'}</button>
      <button class="btn-sm" onclick="mbMod('${t.hidden ? 'show_thread' : 'hide_thread'}', ${t.id})">${t.hidden ? 'Show thread' : 'Hide thread'}</button>` : '';
  const promise = p ? `<div class="mb-promise">${LOOK2 && typeof promiseEntryHTML === 'function' ? promiseEntryHTML(p, m ? m.name : '', false) : `<p><b>${mbEsc(p.text)}</b></p>`}
      ${m ? `<p class="mb-promise-who">${mbEsc(m.name)} · <a href="#" onclick="showDetail('${escJsAttr(m.id)}'); return false;">Open this official’s promises</a></p>` : ''}</div>` : '';
  return `${mbSubnav()}${mbPreviewNote()}<p class="mb-crumbs"><a href="#forums" onclick="membersOpen('forums'); return false;">Member forums</a> / ${mbEsc(t.category)}</p>
    <div class="mb-head"><h1 class="mb-thread-title">${mbEsc(t.title)}</h1>
    <p class="mb-facts"><span>Started by <b>${mbEsc(t.author)}</b></span><span>${mbDate(t.created_at, true)}</span><span title="Exactly ${t.replies}">${mbCount(t.replies)} repl${t.replies === 1 ? 'y' : 'ies'}</span>${t.sources ? `<span>${t.sources} source${t.sources === 1 ? '' : 's'} linked</span>` : ''}${t.locked ? '<span>Locked</span>' : ''}${t.hidden ? '<span>Hidden from members</span>' : ''}</p>
    <div class="mb-tools"><button class="btn-sm" onclick="mbCopyLink(${t.id})">Copy link</button>${admin}</div></div>${promise}`;
}
function mbCopyLink(id){
  const url = location.origin + location.pathname + '#thread=' + id;
  const done = () => showStatus('Link copied. Members need to sign in to read it.');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => showStatus(url, false, 6000));
  else showStatus(url, false, 6000);
}
function mbThreadHTML(){
  const gate = mbForumGate();
  if(gate) return gate;
  if(MB.threadErr) return `<div class="empty">${mbEsc(MB.threadErr)} <a href="#forums" onclick="membersOpen('forums'); return false;">Back to the forums</a></div>`;
  const d = MB.thread;
  if(!d) return `<div class="empty">Loading the thread…</div>`;
  const me = MB.me || {}, t = d.thread;
  const posts = d.posts.map(p => mbPostHTML(p, t, me)).join('');
  const more = d.posts.length < d.total_posts ? `<div class="mb-more"><span>Showing ${d.posts.length} of ${d.total_posts} posts</span><button class="btn-sm" onclick="mbLoadThread(true)" ${MB.threadLoading ? 'disabled' : ''}>Show more</button></div>` : '';
  return `<div class="mb-layout"><section aria-labelledby="mb-disc"><div class="mb-group-head"><h2 id="mb-disc">Discussion</h2><span>Oldest first</span></div>${posts}${more}${mbReplyBox(t, me)}</section>
    <aside class="mb-side">${t.promise_id ? `<section aria-labelledby="mb-rev"><h2 id="mb-rev">Promise status</h2><p class="mb-who">A thread can’t change a promise’s status. Statuses change only through the same three-source review every promise gets. To ask for one, use “Appeal this status” on the promise.</p></section>` : ''}
    ${mbNameBox()}${mbRulesHTML(false)}</aside></div>`;
}
function mbPostHTML(p, t, me){
  const removed = p.hidden && p.body == null;
  if(removed) return `<article class="mb-post mb-removed" id="mb-post-${p.id}"><span class="mb-av" aria-hidden="true">–</span><div class="mb-who-line"><b>${mbEsc(p.author)}</b><span>${mbWhen(p.created_at)}</span></div><p class="mb-body">This post was removed by a moderator.</p></article>`;
  const editing = MB.editing === p.id;
  const tags = (p.team ? '<span class="mb-tag">Team</span>' : '') + (p.op && !p.first ? '<span class="mb-tag mb-tag-quiet">Started the thread</span>' : '') + (p.hidden ? `<span class="mb-tag mb-tag-warn">Hidden${p.hidden_reason ? ': ' + mbEsc(p.hidden_reason) : ''}</span>` : '') + (isAdmin && p.open_reports ? `<span class="mb-tag mb-tag-warn">${p.open_reports} report${p.open_reports === 1 ? '' : 's'}</span>` : '');
  const quote = p.quote ? `<blockquote class="mb-quote"><b>${mbEsc(p.quote.author)} wrote:</b> ${p.quote.excerpt == null ? '<em>(removed)</em>' : mbEsc(p.quote.excerpt)}</blockquote>` : '';
  const href = p.source_url ? sourceHref(p.source_url) : '';
  const src = href ? `<div class="mb-src">${MB_CHECK}<span>${mbEsc(MB_KIND_LABEL[p.source_kind] || 'Source')}</span><a href="${mbEsc(href)}" target="_blank" rel="nofollow ugc noopener noreferrer">${mbEsc(mbHost(href))} ↗</a></div>` : '';
  const tools = [];
  if(me.can_reply && !p.hidden) tools.push(`<button type="button" class="${p.my_helpful ? 'on' : ''}" aria-pressed="${!!p.my_helpful}" onclick="mbHelpful(${p.id})">Helpful · ${mbCount(p.helpful)}</button>`);
  else if(p.helpful) tools.push(`<span class="mb-quiet">Helpful · ${mbCount(p.helpful)}</span>`);
  if(me.can_reply && !t.locked && !p.hidden) tools.push(`<button type="button" onclick="mbQuote(${p.id}, '${escJsAttr(p.author)}')">Quote</button>`);
  if(p.can_edit && !editing) tools.push(`<button type="button" onclick="MB.editing=${p.id}; mbRerender();">Edit</button>`);
  if(!p.mine) tools.push(p.reported ? '<span class="mb-quiet mb-end">Reported</span>' : `<button type="button" class="mb-end" onclick="mbReportForm(${p.id})">Report</button>`);
  if(isAdmin) tools.push(`<button type="button" onclick="mbMod('${p.hidden ? 'show_post' : 'hide_post'}', ${p.id})">${p.hidden ? 'Show' : 'Hide'}</button>`, `<button type="button" onclick="mbPauseForm(${p.id}, '${escJsAttr(p.author)}')">Pause author</button>`);
  const body = editing ? `<div class="mb-edit"><label class="vh" for="mb-edit-${p.id}">Edit your post</label><textarea id="mb-edit-${p.id}" rows="5" maxlength="5000">${mbEsc(p.body)}</textarea>
      <div class="mb-edit-btns"><button class="btn-sm" onclick="MB.editing=null; mbRerender();">Cancel</button><button class="btn-primary btn-sm" onclick="mbSaveEdit(${p.id})">Save</button></div></div>`
    : `<p class="mb-body">${mbEsc(p.body)}</p>`;
  return `<article class="mb-post${p.team ? ' mb-team' : ''}${p.hidden ? ' mb-hidden' : ''}" id="mb-post-${p.id}">
    <span class="mb-av${p.team ? ' mb-av-team' : ''}" aria-hidden="true">${p.team ? MB_SYM : mbInitials(p.author)}</span>
    <div class="mb-who-line"><b>${mbEsc(p.author)}</b>${tags}<span>${p.member_since ? 'Member since ' + mbEsc(p.member_since) + ' · ' : ''}${mbWhen(p.created_at)}${p.edited_at ? ' · edited' : ''}</span></div>
    ${quote}${body}${src}<div class="mb-ptools">${tools.join('')}</div></article>`;
}
function mbHost(u){ try { return new URL(u).hostname.replace(/^www\./, ''); } catch(e){ return 'Source'; } }
function mbReplyBox(t, me){
  if(t.locked) return `<div class="mb-upsell">${MB_LOCK}<span><b>This thread is locked.</b> It stays here to read.</span></div>`;
  if(me.banned_until) return `<div class="mb-upsell">${MB_LOCK}<span><b>Your posting is paused by a moderator.</b> You can still read every thread.</span></div>`;
  if(!me.can_reply) return `<div class="mb-upsell">${MB_LOCK}<span><b>Replying starts with Premium.</b> Your plan can read every thread. Supporter members start threads.</span><span class="mb-upsell-btns"><button class="btn-sm" onclick="goToPlans()">Compare plans</button></span></div>`;
  const dr = MB.draft;
  const quoting = MB.quote ? `<p class="mb-quoting">Quoting ${mbEsc(MB.quote.author)} <button type="button" class="btn-sm" onclick="MB.quote=null; mbRerender();">Remove</button></p>` : '';
  return `<form class="mb-form" onsubmit="event.preventDefault(); mbSubmitReply();" id="mb-reply">
    <h2>Reply</h2>${quoting}
    <label class="mb-field">Your reply<textarea id="mb-r-body" rows="5" maxlength="5000" placeholder="Add to the discussion. Link a source for any claim." oninput="MB.draft.body=this.value">${mbEsc(dr.body)}</textarea></label>
    <div class="mb-row2"><label class="mb-field">Source link (optional)<input id="mb-r-url" type="url" maxlength="500" placeholder="https://" value="${mbEsc(dr.url)}" oninput="MB.draft.url=this.value"></label>
    <label class="mb-field">Source type<select id="mb-r-kind" onchange="MB.draft.kind=this.value">${Object.entries(MB_KIND_LABEL).map(([k, l]) => `<option value="${k}" ${dr.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="mb-formfoot"><span>${me.handle ? 'You post as <b>' + mbEsc(me.handle) + '</b>. Replies are visible to signed-in members.' : 'You will pick a forum name first.'}</span><button type="submit" class="btn-primary" ${MB.busy ? 'disabled' : ''}>Post reply</button></div></form>`;
}
function mbQuote(postId, author){
  MB.quote = { id: postId, author: author }; mbRerender();
  setTimeout(() => { const el = document.getElementById('mb-r-body'); if(el){ el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 30);
}
async function mbSubmitReply(){
  if(MB.busy) return;
  const body = (document.getElementById('mb-r-body') || {}).value || MB.draft.body;
  const url = ((document.getElementById('mb-r-url') || {}).value || MB.draft.url || '').trim();
  const kind = (document.getElementById('mb-r-kind') || {}).value || MB.draft.kind || 'other';
  MB.draft = { body: body, url: url, kind: kind };
  if(!body || body.trim().length < 2){ showStatus('Write something first.', true); return; }
  if(url && !sourceHref(url)){ showStatus('The source link must start with http:// or https://.', true, 4000); return; }
  if(MB.me && !MB.me.handle){ mbHandleForm('reply'); return; }
  MB.busy = true; mbRerender();
  try {
    await mbRpc('forum_reply', { p_thread: MB.threadId, p_body: body, p_source_url: url || null, p_source_kind: url ? kind : null, p_quote_post: MB.quote ? MB.quote.id : null });
    MB.draft = { body: '', url: '', kind: '' }; MB.quote = null;
    if(MB.thread) MB.thread._stale = true;
    showStatus('Reply posted.');
    MB.busy = false; MB.list = null;
    await mbLoadThread();
    setTimeout(() => { const posts = document.querySelectorAll('.mb-post'); const last = posts[posts.length - 1]; if(last) last.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
  } catch(e){ MB.busy = false; showStatus(mbErr(e), true, 4500); mbRerender(); }
}
async function mbSaveEdit(postId){
  const el = document.getElementById('mb-edit-' + postId);
  const post = MB.thread && MB.thread.posts.find(p => p.id === postId);
  try {
    await mbRpc('forum_edit_post', { p_post: postId, p_body: el ? el.value : '', p_source_url: post ? post.source_url : null, p_source_kind: post ? post.source_kind : null });
    MB.editing = null; MB.thread._stale = true; showStatus('Saved.'); mbLoadThread();
  } catch(e){ showStatus(mbErr(e), true, 4000); }
}
async function mbHelpful(postId){
  try {
    const on = await mbRpc('forum_toggle_helpful', { p_post: postId });
    const p = MB.thread && MB.thread.posts.find(x => x.id === postId);
    if(p){ p.my_helpful = on; p.helpful = Math.max(0, p.helpful + (on ? 1 : -1)); }
    mbRerender();
  } catch(e){ showStatus(mbErr(e), true, 4000); }
}
function mbReportForm(postId){
  openModal(`<h3>Report this post</h3><p class="score-note" style="margin-top:-4px">A moderator reviews every report. The author isn't told who reported it.</p>
    <fieldset class="mb-reasons"><legend class="vh">Reason</legend>${MB_REASONS.map(([k, l], i) => `<label><input type="radio" name="mb-reason" value="${k}" ${i === 0 ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>
    <label>Anything else? (optional)<textarea id="mb-rep-note" maxlength="500" rows="3"></textarea></label>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="mbReportSend(${postId})">Send report</button></div>`);
}
async function mbReportSend(postId){
  const r = document.querySelector('input[name="mb-reason"]:checked');
  try {
    await mbRpc('forum_report', { p_post: postId, p_reason: r ? r.value : 'other', p_note: document.getElementById('mb-rep-note').value });
    closeModal(); showStatus('Thanks. A moderator will look at it.');
    if(MB.thread) MB.thread._stale = true; mbLoadThread();
  } catch(e){ showStatus(mbErr(e), true, 4000); }
}

/* ---------- forums: start a thread ---------- */
function mbNewThread(promiseId){
  MB.draftNew = { cat: MB.filters.cat ? String(MB.filters.cat) : '', title: '', body: '', url: '', kind: '', promise: promiseId || MB.filters.promise || '', promiseQ: '' };
  if(MB.draftNew.promise && !MB.draftNew.cat && MB.overview){ const c = (MB.overview.categories || []).find(x => x.slug === 'promise-discussions'); if(c) MB.draftNew.cat = String(c.id); }
  membersOpen('new');
}
function mbNewHTML(){
  const gate = mbForumGate();
  if(gate) return gate;
  const me = MB.me;
  if(!me) return `<div class="empty">Loading…</div>`;
  if(!me.can_start) return `<div class="mb-upsell">${MB_LOCK}<span><b>Starting threads is part of the Supporter plan.</b> ${me.can_reply ? 'You can reply in any open thread.' : 'Your plan can read every thread.'}</span><span class="mb-upsell-btns"><button class="btn-sm" onclick="membersOpen('forums')">Back to the forums</button><button class="btn-primary btn-sm" onclick="goToPlans()">Compare plans</button></span></div>`;
  const d = MB.draftNew, cats = (MB.overview && MB.overview.categories) || [];
  const linked = d.promise ? mbPromiseById(d.promise) : null;
  return `<form class="mb-form mb-newform" onsubmit="event.preventDefault(); mbSubmitThread();">
    <label class="mb-field">Category<select id="mb-n-cat" onchange="MB.draftNew.cat=this.value"><option value="">Pick a category</option>${cats.map(c => `<option value="${c.id}" ${d.cat === String(c.id) ? 'selected' : ''}>${mbEsc(c.name)}</option>`).join('')}</select></label>
    <label class="mb-field">Title<input id="mb-n-title" maxlength="140" value="${mbEsc(d.title)}" placeholder="A specific question or finding" oninput="MB.draftNew.title=this.value"></label>
    <div class="mb-field"><span>Promise this is about (optional)</span>${linked ? `<p class="mb-linked">“${mbEsc(linked.text)}” <button type="button" class="btn-sm" onclick="MB.draftNew.promise=''; mbRerender();">Remove</button></p>`
      : `<input id="mb-n-pq" placeholder="Search promises by words or an official's name" value="${mbEsc(d.promiseQ)}" oninput="MB.draftNew.promiseQ=this.value; mbPromisePicker();" autocomplete="off"><div id="mb-n-pres" class="mb-picker"></div>`}</div>
    <label class="mb-field">Your post<textarea id="mb-n-body" rows="7" maxlength="5000" placeholder="Say what you found and why it matters. Link a source for any claim." oninput="MB.draftNew.body=this.value">${mbEsc(d.body)}</textarea></label>
    <div class="mb-row2"><label class="mb-field">Source link (optional)<input id="mb-n-url" type="url" maxlength="500" placeholder="https://" value="${mbEsc(d.url)}" oninput="MB.draftNew.url=this.value"></label>
    <label class="mb-field">Source type<select id="mb-n-kind" onchange="MB.draftNew.kind=this.value">${Object.entries(MB_KIND_LABEL).map(([k, l]) => `<option value="${k}" ${d.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="mb-formfoot"><span>${me.handle ? 'You post as <b>' + mbEsc(me.handle) + '</b>. You can start 3 threads a day.' : 'You will pick a forum name first.'}</span>
      <span class="mb-upsell-btns"><button type="button" class="btn-sm" onclick="membersOpen('forums')">Cancel</button><button type="submit" class="btn-primary" ${MB.busy ? 'disabled' : ''}>Start the thread</button></span></div></form>`;
}
function mbPromisePicker(){
  const box = document.getElementById('mb-n-pres'); if(!box) return;
  const q = (MB.draftNew.promiseQ || '').trim().toLowerCase();
  if(q.length < 3){ box.innerHTML = ''; return; }
  const all = typeof PROMISES !== 'undefined' ? PROMISES : [];
  const hits = [];
  for(const p of all){
    const m = typeof memberById === 'function' ? memberById(p.memberId) : null;
    if(String(p.text || '').toLowerCase().includes(q) || (m && String(m.name || '').toLowerCase().includes(q))) hits.push([p, m]);
    if(hits.length >= 8) break;
  }
  box.innerHTML = hits.length ? hits.map(([p, m]) => `<button type="button" onclick="MB.draftNew.promise='${escJsAttr(String(p.id))}'; mbRerender();"><b>${mbEsc(p.text)}</b><span>${m ? mbEsc(m.name) : ''}</span></button>`).join('') : '<p class="mb-quiet">No promises match.</p>';
}
async function mbSubmitThread(){
  if(MB.busy) return;
  const d = MB.draftNew;
  ['cat', 'title', 'body', 'url', 'kind'].forEach(k => { const el = document.getElementById('mb-n-' + k); if(el) d[k] = el.value; });
  if(!d.cat){ showStatus('Pick a category.', true); return; }
  if((d.title || '').trim().length < 8){ showStatus('Titles need at least 8 characters.', true); return; }
  if((d.body || '').trim().length < 2){ showStatus('Write your post first.', true); return; }
  if(d.url && !sourceHref(d.url.trim())){ showStatus('The source link must start with http:// or https://.', true, 4000); return; }
  if(MB.me && !MB.me.handle){ mbHandleForm('new'); return; }
  MB.busy = true; mbRerender();
  try {
    const id = await mbRpc('forum_start_thread', { p_category: Number(d.cat), p_title: d.title, p_body: d.body, p_source_url: d.url.trim() || null, p_source_kind: d.url.trim() ? (d.kind || 'other') : null, p_promise_id: d.promise || null });
    MB.busy = false; MB.list = null; MB.overview = null;
    MB.draftNew = { cat: '', title: '', body: '', url: '', kind: '', promise: '', promiseQ: '' };
    showStatus('Thread started.');
    membersOpenThread(id);
  } catch(e){ MB.busy = false; showStatus(mbErr(e), true, 4500); mbRerender(); }
}
// "Discuss in the member forums" under a promise (aow-index.html, promiseEntryHTML).
function membersDiscussLink(p){
  if(!membersVisible() || !p || p.id == null) return '';
  return `<a href="#forums" class="r-discuss" onclick="mbDiscuss('${escJsAttr(String(p.id))}'); return false;">Discuss in the member forums</a>`;
}
function mbDiscuss(pid){
  MB.filters = { cat: null, promise: pid, q: '', sort: 'activity' }; MB.list = null;
  membersOpen('forums');
}

/* ---------- moderation and ballots (admins) ---------- */
async function mbMod(action, id, note, days){
  try {
    await mbRpc('forum_mod', { p_action: action, p_id: id, p_note: note || '', p_days: days == null ? null : days });
    showStatus('Done.');
    if(MB.thread) MB.thread._stale = true;
    MB.list = null; MB.admin.queue = null;
    membersLoadView();
  } catch(e){ showStatus(mbErr(e), true, 4000); }
}
function mbPauseForm(postId, author){
  openModal(`<h3>Pause ${mbEsc(author)}'s posting</h3><p class="score-note" style="margin-top:-4px">They can still read. Their existing posts stay unless you hide them.</p>
    <label>How long<select id="mb-pause-days"><option value="1">1 day</option><option value="7" selected>7 days</option><option value="30">30 days</option><option value="">Until I lift it</option></select></label>
    <label>Note for the log (optional)<input id="mb-pause-note" maxlength="300"></label>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="mbPauseSend(${postId})">Pause posting</button></div>`);
}
function mbPauseSend(postId){
  const v = document.getElementById('mb-pause-days').value;
  const note = document.getElementById('mb-pause-note').value;
  closeModal(); mbMod('pause_author', postId, note, v === '' ? null : Number(v));
}
function mbAdminHTML(){
  if(!isAdmin) return `<div class="empty">Admins only.</div>`;
  const tab = MB.admin.tab;
  const q = MB.admin.queue, nReports = q && q.reports ? q.reports.length : 0;
  const tabs = `<div class="mb-chips mb-admin-tabs" role="tablist">${[['ballots', 'Ballots'], ['reports', 'Reports' + (nReports ? ' (' + nReports + ')' : '')], ['switch', 'On or off']].map(([k, l]) =>
    `<a href="#" role="tab" aria-selected="${tab === k}" ${tab === k ? 'aria-current="page"' : ''} onclick="MB.admin.tab='${k}'; mbRerender(); return false;">${l}</a>`).join('')}</div>`;
  let body = '';
  if(tab === 'switch') body = mbAdminSwitchHTML();
  else if(tab === 'reports') body = mbAdminReportsHTML();
  else body = mbAdminBallotsHTML();
  return tabs + body;
}
function mbAdminSwitchHTML(){
  return `<section class="mb-adminbox"><h2>${MB.live ? 'On for everyone' : 'Preview: admins only'}</h2>
    <p>${MB.live ? 'Every visitor sees the Members tab. Paid members can vote; signed-in members can read the forums; Premium and Supporter members can post as their plan allows.'
      : 'Only admin accounts see the Members tab, and the server refuses votes and forum use from anyone else. Nothing changes for visitors until you switch it on.'}</p>
    <p>${MB.live ? 'Switching off hides the tab again and blocks votes and posts. Nothing is deleted.' : 'Before you switch it on: read the new Terms and Privacy wording, and check that the plans table shows the two new rows (it does once this is on).'}</p>
    <button class="${MB.live ? 'btn-secondary' : 'btn-primary'}" onclick="mbSwitchConfirm(${!MB.live})">${MB.live ? 'Back to preview' : 'Switch on for everyone'}</button></section>`;
}
function mbSwitchConfirm(on){
  openModal(`<h3>${on ? 'Switch on Member votes and forums?' : 'Back to the admin-only preview?'}</h3>
    <p>${on ? 'Every visitor will see the Members tab right away.' : 'The Members tab disappears for everyone but admins, and votes and posts are blocked. Nothing is deleted.'}</p>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="mbSwitchSet(${on})">${on ? 'Switch on' : 'Switch off'}</button></div>`);
}
async function mbSwitchSet(on){
  try { MB.live = !!(await mbRpc('admin_members_set_live', { p_live: on })); closeModal(); showStatus(on ? 'Member votes and forums are on for everyone.' : 'Back to the admin-only preview.', false, 4000); MB.ballots = null; render(); }
  catch(e){ showStatus(mbErr(e), true, 4000); }
}
function mbAdminBallotsHTML(){
  const d = MB.admin.data;
  if(!d) return `<div class="empty">Loading…</div>`;
  if(d.error) return `<div class="empty">${mbEsc(d.error)}</div>`;
  const open = d.ballots.filter(b => b.status === 'open'), closed = d.ballots.filter(b => b.status === 'closed');
  const openHTML = open.map(b => `<section class="mb-adminbox"><div class="mb-group-head"><h2>${mbEsc(b.title)}</h2><span>Closes ${mbDate(b.closes_at, true)} · ${b.total} vote${b.total === 1 ? '' : 's'}</span></div>
      <ul class="mb-admin-items">${b.items.map(i => `<li class="${i.withdrawn ? 'mb-hidden' : ''}"><span><b>${mbEsc(i.title)}</b>${i.withdrawn ? ' (withdrawn)' : ''}</span><span>${i.votes} vote${i.votes === 1 ? '' : 's'}</span>${i.withdrawn ? '' : `<button class="btn-sm" onclick="mbWithdraw(${i.id}, '${escJsAttr(i.title)}')">Withdraw</button>`}</li>`).join('')}</ul>
      <form class="mb-inline" onsubmit="event.preventDefault(); mbAddItem(${b.id}, this);"><input name="t" maxlength="80" placeholder="Add an item" required><input name="d" maxlength="200" placeholder="One-line detail (optional)"><button class="btn-sm" type="submit">Add</button></form>
      <button class="btn-secondary" onclick="mbCloseConfirm(${b.id}, '${escJsAttr(b.title)}')">Close this ballot now</button></section>`).join('');
  const kindsOpen = open.map(b => b.kind);
  const newForm = ['features', 'offices'].filter(k => !kindsOpen.includes(k)).map(k => `<section class="mb-adminbox"><h2>Open a new ${k === 'features' ? 'Features' : 'Offices'} ballot</h2>
      <form onsubmit="event.preventDefault(); mbOpenBallot('${k}', this);" class="mb-form-plain">
        <label>Closes on<input type="date" name="c" required></label>
        <label>Intro<input name="i" maxlength="300" value="${k === 'features' ? 'Ideas from members and from us. The winner gets built next.' : 'Offices, not people. When an office wins, everyone who holds it is added under the same standard.'}"></label>
        <label>Items, one per line (Name | short detail)<textarea name="items" rows="6" required></textarea></label>
        <button class="btn-primary" type="submit">Open the ballot</button></form></section>`).join('');
  const closedHTML = closed.length ? `<section class="mb-adminbox"><h2>Closed ballots</h2><ul class="mb-admin-items">${closed.map(b => {
      const w = b.items.find(i => i.id === b.winner_item_id);
      return `<li><span><b>${mbEsc(b.title)}</b> · closed ${mbDate(b.closed_at, true)} · winner: ${w ? mbEsc(w.title) : 'none'}</span>${w ? `<select aria-label="Progress" onchange="mbProgress(${w.id}, this.value)">${[['next_up', 'Next up'], ['building', 'Building'], ['shipped', 'Done']].map(([v, l]) => `<option value="${v}" ${w.progress === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</li>`; }).join('')}</ul></section>` : '';
  const sg = d.suggestions || [];
  const sgHTML = `<section class="mb-adminbox"><h2>Suggestions from members</h2>${sg.length ? `<ul class="mb-admin-items">${sg.map(s => `<li><span><b>${mbEsc(s.title)}</b> · ${s.kind} · from ${mbEsc(s.by)} · ${mbDate(s.created_at)}${s.detail ? `<br><span class="mb-quiet">${mbEsc(s.detail)}</span>` : ''}</span>
      ${s.status === 'new' ? `<span class="mb-upsell-btns"><button class="btn-sm" onclick="mbSuggestionSet(${s.id}, 'added')">Added</button><button class="btn-sm" onclick="mbSuggestionSet(${s.id}, 'declined')">Decline</button></span>` : `<span class="mb-quiet">${s.status}</span>`}</li>`).join('')}</ul>` : '<p class="mb-quiet">None yet.</p>'}
      <p class="mb-quiet">“Added” only marks it. To put one on an open ballot, use “Add an item” above.</p></section>`;
  return openHTML + newForm + closedHTML + sgHTML;
}
async function mbAdminCall(fn, args, msg){
  try { await mbRpc(fn, args); showStatus(msg || 'Done.'); MB.admin.data = null; MB.ballots = null; mbLoadAdmin(true); }
  catch(e){ showStatus(mbErr(e), true, 4000); }
}
function mbAddItem(ballotId, form){ mbAdminCall('admin_ballot_item_add', { p_ballot: ballotId, p_title: form.t.value, p_detail: form.d.value }, 'Item added.'); }
function mbWithdraw(itemId, title){
  openModal(`<h3>Withdraw “${mbEsc(title)}”?</h3><p>It comes off the ballot and its votes are removed, so those members can vote again.</p>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="closeModal(); mbAdminCall('admin_ballot_item_withdraw', { p_item: ${itemId} }, 'Withdrawn.')">Withdraw</button></div>`);
}
function mbCloseConfirm(ballotId, title){
  openModal(`<h3>Close the ${mbEsc(title)} now?</h3><p>Voting stops. The item with the most votes wins and moves to Next up; a tie goes to the item that reached its total first. You can then open the next ballot.</p>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="closeModal(); mbAdminCall('admin_ballot_close', { p_ballot: ${ballotId} }, 'Ballot closed.')">Close the ballot</button></div>`);
}
function mbProgress(itemId, v){ mbAdminCall('admin_ballot_progress', { p_item: itemId, p_progress: v }, 'Saved.'); }
function mbSuggestionSet(id, status){ mbAdminCall('admin_ballot_suggestion_set', { p_id: id, p_status: status }, 'Saved.'); }
function mbOpenBallot(kind, form){
  const items = form.items.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [t, ...rest] = l.split('|'); return { title: t.trim(), detail: rest.join('|').trim() }; });
  if(items.length < 2){ showStatus('Add at least 2 items.', true); return; }
  const closes = new Date(form.c.value + 'T23:59:59');
  mbAdminCall('admin_ballot_open', { p_kind: kind, p_title: kind === 'features' ? 'Features ballot' : 'Offices ballot', p_intro: form.i.value, p_closes_at: closes.toISOString(), p_items: items }, 'Ballot opened.');
}
function mbAdminReportsHTML(){
  const q = MB.admin.queue;
  if(!q) return `<div class="empty">Loading…</div>`;
  if(q.error) return `<div class="empty">${mbEsc(q.error)}</div>`;
  const reports = q.reports.length ? q.reports.map(r => `<section class="mb-adminbox"><div class="mb-group-head"><h2>${mbEsc(r.author)} in “${mbEsc(r.thread_title)}”</h2><span>${r.count} report${r.count === 1 ? '' : 's'}${r.hidden ? ' · hidden' : ''}${r.author_banned ? ' · posting paused' : ''}</span></div>
      <p class="mb-body">${mbEsc(r.body)}</p>
      <ul class="mb-admin-items">${r.reasons.map(x => `<li><span>${mbEsc((MB_REASONS.find(m => m[0] === x.reason) || [0, x.reason])[1])}${x.note ? ': ' + mbEsc(x.note) : ''}</span><span class="mb-quiet">${mbEsc(x.by)} · ${mbWhen(x.at)}</span></li>`).join('')}</ul>
      <div class="mb-upsell-btns"><button class="btn-sm" onclick="membersOpenThread(${r.thread_id})">Open the thread</button><button class="btn-primary btn-sm" onclick="mbMod('hide_post', ${r.post_id})">Hide the post</button><button class="btn-sm" onclick="mbMod('dismiss_reports', ${r.post_id})">Keep it, dismiss reports</button><button class="btn-sm" onclick="mbPauseForm(${r.post_id}, '${escJsAttr(r.author)}')">Pause author</button></div></section>`).join('')
    : `<section class="mb-adminbox"><h2>No open reports</h2><p class="mb-quiet">Three reports from different members hide a post until you look at it.</p></section>`;
  const recent = `<section class="mb-adminbox"><h2>Latest posts</h2><ul class="mb-admin-items">${(q.recent || []).map(p => `<li><span><b>${mbEsc(p.author)}</b> in <a href="#thread=${p.thread_id}" onclick="membersOpenThread(${p.thread_id}); return false;">${mbEsc(p.thread_title)}</a>${p.hidden ? ' (hidden)' : ''}<br><span class="mb-quiet">${mbEsc(p.body)}</span></span><span class="mb-quiet">${mbWhen(p.created_at)}</span></li>`).join('') || '<li class="mb-quiet">None yet.</li>'}</ul></section>`;
  const bans = (q.bans || []).length ? `<section class="mb-adminbox"><h2>Posting paused</h2><ul class="mb-admin-items">${q.bans.map(b => `<li><span><b>${mbEsc(b.handle)}</b>${b.reason ? ' · ' + mbEsc(b.reason) : ''}</span><span class="mb-quiet">${b.until ? 'until ' + mbDate(b.until, true) : 'until lifted'}</span>${b.post_id ? `<button class="btn-sm" onclick="mbMod('unpause_author', ${b.post_id})">Lift the pause</button>` : ''}</li>`).join('')}</ul></section>` : '';
  return reports + recent + bans;
}

/* ---------- the page ---------- */
function renderMembers(){
  if(!membersVisible()) return `<div class="empty">Loading…</div>`;
  membersLoadView();               // each loader skips work it has already done
  let html = '';
  if(MB.view === 'forums') html = mbForumsHTML();
  else if(MB.view === 'thread') html = mbThreadHTML();
  else if(MB.view === 'new') html = mbNewHTML();
  else if(MB.view === 'admin') html = mbAdminHTML();
  else html = mbVotesHTML();
  // The previous look has no green band, so the band's content goes at the top of the page instead.
  return `<div class="mb-page mb-view-${MB.view}">${LOOK2 ? '' : `<div class="mb-band-fallback">${membersBandHTML()}</div>`}${html}</div>`;
}
// The plans table (Support Us) gains two rows only once the feature is on for everyone.
function membersTierRows(){
  if(!MB.live) return [];
  return [
    { label: 'Member votes: one vote per ballot', free: 'See results', supporter: '✓', sustainer: '✓', patron: '✓' },
    { label: 'Member forums', free: 'Read', supporter: 'Read', sustainer: 'Read and reply', patron: 'Read, reply and start threads' }
  ];
}

/* ---------- styles ---------- */
(function(){
  const css = `
#tabs .tab-btn[hidden],#siteMenu .menu-item[hidden]{display:none!important}
html[data-look="2"] .r-band[data-tab="members"] #searchBar{display:none!important}
.mb-page .vh,.r-band .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.mb-subnav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.mb-subnav a{display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border:2px solid var(--border);border-radius:999px;font-size:14.5px;font-weight:700;color:var(--text);text-decoration:none}
.mb-subnav a:hover{border-color:var(--text)}
.mb-subnav a[aria-current]{background:var(--text);border-color:var(--text);color:var(--deep,var(--bg))}
.mb-preview{display:flex;gap:10px;align-items:center;margin:0 0 18px;padding:10px 14px;border:2px dashed var(--border);border-radius:12px;font-size:14.5px;color:var(--text)}
.mb-preview svg,.mb-note svg,.mb-upsell>svg{flex:none}
.mb-split{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:clamp(24px,5vw,64px);align-items:end}
.mb-head h1{margin:0}
.mb-head .r-sub{margin-top:10px}
.r-band .mb-card,.mb-page .mb-card{--text:var(--t0,var(--text));--text-muted:var(--m0,var(--text-muted));--border:var(--b0,var(--border));padding:20px 22px;border-radius:var(--radius,14px);background:var(--bg);color:var(--text)}
.mb-card-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.mb-card-top h2{margin:0;font-size:17px;font-weight:800}
.mb-card-top span{font-size:14px;color:var(--text-muted)}
.mb-card ul{margin:10px 0 0;padding:0;list-style:none}
.mb-card li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--border);font-size:15px}
.mb-card li span{font-weight:700}
.mb-card li em{font-style:normal;color:var(--text-muted)}
.mb-voted{display:flex;align-items:center;gap:6px;color:var(--brand);text-align:right}
.mb-ballot-tabs{display:none;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:18px}
.mb-ballot-tabs button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:60px;padding:10px 14px;border:2px solid var(--border);border-radius:12px;background:transparent;color:var(--text);font:inherit;text-align:left;cursor:pointer}
.mb-ballot-tabs button b{font-size:15.5px;font-weight:800}
.mb-ballot-tabs button span{font-size:13px;line-height:1.3;color:var(--text-muted)}
.mb-ballot-tabs button.on{border-color:var(--text);background:var(--text);color:var(--deep,var(--bg))}
.mb-ballot-tabs button.on span{color:inherit}
.mb-start{display:flex;justify-content:flex-end}
.mb-note{display:flex;align-items:center;gap:10px;margin:0;font-size:15px;color:var(--text-muted)}
.mb-filters{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.mb-filters .mb-search{flex:1 1 300px;min-width:0}
.mb-filters input,.mb-filters select{--text:var(--t0,var(--text));width:100%;min-height:50px;padding:0 14px;border:2px solid transparent;border-radius:12px;background:var(--bg);color:var(--text);font:inherit;font-size:16px}
.mb-filters select{width:auto;font-size:15px}
.mb-crumbs{margin:0 0 12px;font-size:14.5px;color:var(--text-muted)}
.mb-crumbs a{color:var(--text-muted)}
.mb-thread-title{font-size:clamp(30px,4vw,46px)!important;max-width:28ch}
.mb-facts{display:flex;flex-wrap:wrap;gap:4px 24px;margin:14px 0 0;font-size:16px;color:var(--text-muted)}
.mb-facts b{font-weight:600;color:var(--text)}
.mb-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.r-band .mb-tools .btn-sm{background:transparent;color:var(--text);border-color:var(--border)}
.mb-promise{margin-top:22px;--text:var(--t0,var(--text));--text-muted:var(--m0,var(--text-muted));--text-faint:var(--f0,var(--text-faint));--border:var(--b0,var(--border));color:var(--text)}
.mb-promise .r-entry{margin-top:0;border-color:transparent}
.mb-promise .r-entry a{color:var(--brand)}
.mb-promise-who{margin:10px 0 0;font-size:14.5px;color:var(--on-deep-muted,var(--text-muted))}
.mb-promise-who a{color:inherit}
.mb-page{position:relative}
.mb-group{margin-top:clamp(28px,4vw,48px)}
.mb-page>.mb-group:first-child,.mb-page>.mb-upsell+.mb-group{margin-top:0}
.mb-group-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px;padding-bottom:10px;border-bottom:3px solid var(--text)}
.mb-group-head h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.025em}
.mb-group-head span{font-size:14.5px;color:var(--text-muted)}
.mb-intro{margin:0;padding:12px 8px;border-bottom:1px solid var(--border);font-size:15.5px;color:var(--text-muted)}
.mb-vlist,.mb-tlist,.mb-slist,.mb-rules,.mb-wins,.mb-pledges,.mb-admin-items{margin:0;padding:0;list-style:none}
.mb-vrow{display:grid;grid-template-columns:52px minmax(0,2.2fr) minmax(0,1.3fr) 140px;gap:20px;align-items:center;padding:16px 8px;border-bottom:1px solid var(--border)}
.mb-vrow:hover{background:var(--bg)}
.mb-rank{font-size:34px;font-weight:300;line-height:1;color:var(--brand);font-variant-numeric:tabular-nums}
.mb-vmain h3{margin:0;font-size:18px;font-weight:700;line-height:1.25;letter-spacing:-.015em}
.mb-vmain p{margin:2px 0 0;font-size:14.5px;color:var(--text-muted)}
.mb-vcount{font-size:14.5px;color:var(--text-muted)}
.mb-vcount b{color:var(--text)}
.mb-bar{height:8px;margin-top:7px;border-radius:4px;background:var(--border);overflow:hidden}
.mb-bar i{display:block;height:100%;border-radius:4px;background:var(--brand)}
.mb-vact{display:flex;justify-content:flex-end}
.mb-vact .btn-sm{display:inline-flex;align-items:center;gap:6px}
.mb-on{border-color:var(--brand)!important;background:var(--brand-tint)!important;color:var(--on-tint,var(--brand-dark))!important}
.mb-suggest{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:16px 8px 0;font-size:15px;color:var(--text-muted)}
.mb-wins{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 32px}
.mb-wins li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 0;border-bottom:1px solid var(--border)}
.mb-wins b{display:block;font-size:17px}
.mb-wins span{font-size:14px;color:var(--text-muted)}
.mb-tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;background:var(--brand-tint);color:var(--on-tint,var(--brand-dark));font-size:13px;font-weight:700;line-height:1.3;white-space:nowrap}
.mb-tag-quiet{background:transparent;border:1.5px solid var(--border);color:var(--text-muted)}
.mb-tag-warn{background:var(--broken-bg,#FBE7E4);color:var(--text)}
.mb-how{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:clamp(20px,5vw,80px);align-items:start;padding:clamp(40px,6vw,72px) 0 0}
.mb-how h2{margin:0;font-size:clamp(26px,3.6vw,36px);font-weight:800;line-height:1.05;letter-spacing:-.035em}
.mb-how>div>p{margin:14px 0 0;font-size:17px;color:var(--text-muted)}
.mb-pledges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;border-top:3px solid var(--text)}
.mb-pledges li{padding:18px 0;border-bottom:1px solid var(--border);font-size:15.5px;color:var(--text-muted)}
.mb-pledges b{display:block;margin-bottom:4px;font-size:17px;color:var(--text)}
.mb-upsell{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;margin:0 0 24px;padding:16px 20px;border:2px dashed var(--border);border-radius:var(--radius,14px);font-size:15.5px;color:var(--text-muted)}
.mb-upsell>span:not(.mb-upsell-btns){flex:1 1 300px}
.mb-upsell b{color:var(--text)}
.mb-upsell-btns{display:flex;flex-wrap:wrap;gap:8px}
.mb-chips{display:none;gap:8px;overflow-x:auto;margin:0 -18px 16px;padding:0 18px 4px}
.mb-chips a{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border:2px solid var(--border);border-radius:999px;background:var(--bg);font-size:14.5px;font-weight:600;color:var(--text);text-decoration:none;white-space:nowrap}
.mb-chips a em{font-style:normal;font-weight:400;color:var(--text-muted)}
.mb-chips a[aria-current]{border-color:var(--text);background:var(--text);color:var(--bg)}
.mb-chips a[aria-current] em{color:var(--bg)}
.mb-admin-tabs{display:flex;margin:0 0 20px;padding:0;overflow:visible;flex-wrap:wrap}
.mb-promisebar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;margin:0 0 20px;padding:14px 18px;border-radius:var(--radius,14px);background:var(--brand-tint);font-size:15px}
.mb-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:clamp(28px,5vw,64px);align-items:start}
.mb-trow{display:grid;grid-template-columns:minmax(0,1fr) 84px 104px;gap:20px;align-items:center;padding:18px 8px;border-bottom:1px solid var(--border)}
.mb-trow:hover{background:var(--bg)}
.mb-cat{font-size:13.5px;color:var(--text-muted)}
.mb-ttitle{display:block;margin-top:2px;font-size:18px;font-weight:700;line-height:1.3;letter-spacing:-.015em;color:var(--text);text-decoration:none}
.mb-ttitle:hover{text-decoration:underline}
.mb-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:8px;font-size:14px;color:var(--text-muted)}
.mb-meta .pill{font-size:13px;padding:3px 10px 3px 8px}
.mb-num{text-align:right;font-size:24px;font-weight:800;line-height:1.05;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.mb-num span{display:block;font-size:13px;font-weight:400;letter-spacing:0;color:var(--text-muted)}
.mb-when{text-align:right;font-size:14px;color:var(--text-muted)}
.mb-more{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:18px 8px 0;font-size:15px;color:var(--text-muted)}
.mb-side{display:flex;flex-direction:column;gap:36px}
.mb-side h2{margin:0;padding-bottom:10px;border-bottom:3px solid var(--text);font-size:17px;font-weight:800}
.mb-slist a{display:flex;justify-content:space-between;gap:10px;padding:11px 2px;border-bottom:1px solid var(--border);font-size:15px;color:var(--text);text-decoration:none}
.mb-slist a:hover{color:var(--brand)}
.mb-slist a[aria-current]{font-weight:800;color:var(--brand)}
.mb-slist em{font-style:normal;color:var(--text-muted)}
.mb-rules li{position:relative;padding:11px 0 11px 28px;border-bottom:1px solid var(--border);font-size:15px}
.mb-rules li::before{content:'';position:absolute;left:2px;top:17px;width:12px;height:12px;border-radius:50%;background:var(--brand)}
.mb-who{margin:12px 0 0;font-size:15px;line-height:1.55;color:var(--text-muted)}
.mb-who b{color:var(--text)}
.mb-side .btn-sm{margin-top:10px}
.mb-post{display:grid;grid-template-columns:46px minmax(0,1fr);gap:4px 16px;padding:24px 0;border-bottom:1px solid var(--border)}
.mb-post>*:not(.mb-av){grid-column:2}
.mb-av{grid-row:1/span 2;display:flex;align-items:center;justify-content:center;width:46px;height:46px;border:2px solid var(--border);border-radius:50%;background:var(--bg);font-size:14.5px;font-weight:700;color:var(--text-muted)}
.mb-av-team{border-color:var(--brand);background:var(--brand);color:var(--on-brand,#fff)}
.mb-who-line{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.mb-who-line b{font-size:16.5px}
.mb-who-line>span:last-child{flex-basis:100%;font-size:14px;color:var(--text-muted)}
.mb-body{margin:8px 0 0;font-size:17px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
.mb-quote{margin:12px 0 0;padding:10px 14px;border-radius:10px;background:var(--bg);font-size:15px;color:var(--text-muted)}
.mb-quote b{color:var(--text)}
.mb-src{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:12px;font-size:14px;color:var(--text-muted)}
.mb-src svg{color:var(--brand)}
.mb-src a{font-weight:600}
.mb-ptools{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0 0 -10px}
.mb-ptools button{min-height:40px;padding:0 10px;border:0;border-radius:10px;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--text-muted);cursor:pointer}
.mb-ptools button:hover{background:var(--bg);color:var(--text)}
.mb-ptools button.on{color:var(--brand)}
.mb-ptools .mb-end{margin-left:auto}
.mb-quiet{display:inline-flex;align-items:center;min-height:40px;padding:0 10px;font-size:14px;color:var(--text-muted)}
p.mb-quiet,li.mb-quiet{display:block;min-height:0;padding:6px 0}
.mb-team{margin-top:16px;padding:22px;border:0;border-radius:var(--radius,14px);background:var(--brand-tint)}
.mb-hidden{opacity:.6}
.mb-removed .mb-body{font-style:italic;color:var(--text-muted)}
.mb-edit textarea,.mb-field textarea,.mb-field input,.mb-field select,.mb-inline input,.mb-form-plain input,.mb-form-plain textarea{width:100%;min-height:50px;padding:10px 14px;border:2px solid var(--border);border-radius:12px;background:var(--bg-alt);color:var(--text);font:inherit;font-size:16px;font-weight:400;box-sizing:border-box}
.mb-edit-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
.mb-form{display:flex;flex-direction:column;gap:16px;margin-top:22px;padding:22px;border:2px solid var(--border);border-radius:var(--radius,14px);background:var(--bg)}
.mb-form h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.025em}
.mb-newform{margin-top:0}
.mb-field{display:flex;flex-direction:column;gap:6px;font-size:14.5px;font-weight:700}
.mb-row2{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:14px}
.mb-formfoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;font-size:14.5px;color:var(--text-muted)}
.mb-quoting{display:flex;align-items:center;gap:10px;margin:0;font-size:14.5px;color:var(--text-muted)}
.mb-linked{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0;font-weight:400}
.mb-picker{display:flex;flex-direction:column;gap:4px}
.mb-picker button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font:inherit;text-align:left;cursor:pointer}
.mb-picker button:hover{border-color:var(--text)}
.mb-picker button span{font-size:13.5px;color:var(--text-muted)}
.mb-reasons{display:flex;flex-direction:column;gap:8px;margin:0 0 14px;padding:0;border:0}
.mb-reasons label{display:flex;gap:8px;align-items:center;font-weight:400}
.mb-adminbox{margin:0 0 26px;padding:20px 22px;border:2px solid var(--border);border-radius:var(--radius,14px);background:var(--bg)}
.mb-adminbox>h2{margin:0 0 10px;font-size:20px;font-weight:800}
.mb-adminbox .mb-group-head{margin-bottom:6px}
.mb-adminbox .mb-group-head h2{font-size:20px}
.mb-adminbox>p{margin:0 0 12px;font-size:15.5px;color:var(--text-muted)}
.mb-admin-items li{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;padding:10px 0;border-bottom:1px solid var(--border);font-size:15px}
.mb-admin-items li>span:first-child{flex:1 1 280px}
.mb-admin-items select{min-height:38px;border:2px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font:inherit}
.mb-inline{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.mb-inline input{flex:1 1 200px;min-height:40px;padding:6px 12px}
.mb-form-plain{display:flex;flex-direction:column;gap:12px}
.mb-form-plain label{display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:14.5px}
.mb-band-fallback{margin:0 0 24px;padding:22px;border-radius:14px;background:var(--bg-brand,#0D4A43);color:#fff;--text:#fff;--text-muted:#D3E7E2;--border:rgba(255,255,255,.3)}
.mb-band-fallback h1{margin:0;font-size:32px}
.r-discuss{display:inline-block;margin:14px 0 0 16px;font-size:13.5px;font-weight:600}
.mb-promise .r-discuss{display:none}
@media (max-width:1000px){.mb-split,.mb-layout,.mb-how{grid-template-columns:minmax(0,1fr)}.mb-start{justify-content:flex-start}.mb-wins{grid-template-columns:minmax(0,1fr)}.mb-side{gap:28px}}
@media (max-width:720px){
  .mb-desk{display:none!important}
  .mb-phone-hide{display:none!important}
  .mb-ballot-tabs{display:grid}
  .mb-chips{display:flex}
  .mb-subnav a{min-height:44px}
  .mb-vrow{grid-template-columns:34px minmax(0,1fr) auto;gap:6px 12px;padding:16px 2px}
  .mb-rank{font-size:26px;align-self:start}
  .mb-vcount{grid-column:2/-1;grid-row:2}
  .mb-vact{grid-column:3;grid-row:1}
  html .mb-page .mb-vact .btn-sm,html .mb-page .mb-ptools button,html .mb-page .mb-upsell-btns .btn-sm,html .mb-page .mb-more .btn-sm,html .mb-page .mb-suggest .btn-sm{min-height:44px}
  .mb-trow{grid-template-columns:minmax(0,1fr) auto;padding:16px 2px}
  .mb-when{display:none}
  .mb-pledges,.mb-row2{grid-template-columns:minmax(0,1fr)}
  .mb-post{grid-template-columns:38px minmax(0,1fr);gap:4px 12px;padding:18px 0}
  .mb-av{width:38px;height:38px;font-size:13px}
  .mb-body{font-size:16px}
  .mb-team{padding:16px}
  .mb-start .btn-primary,.mb-upsell-btns .btn-primary{flex:1 1 100%}
  .mb-filters select{flex:1 1 140px}
  .mb-thread-title{font-size:28px!important}
  .r-discuss{margin-left:0;display:block}
}`;
  const el = document.createElement('style');
  el.id = 'members-css';
  el.textContent = css;
  document.head.appendChild(el);
})();

// A link like #thread=12 may arrive before or after aow-index.html has read the address; whichever runs first takes it.
(function(){ const h = (location.hash || '').replace(/^#/, ''); if(h) membersHandleHash(h); })();
membersCheckLive();
