/* AOW Index — civic dataset loader.
   Officials, promises, and prior-office career histories.
   Loaded by aow-index.html via <script src="data.js"> — FIRST, before any of
   the files under data/. This file is pure data — no app logic lives here.

   The dataset itself no longer lives in this one file. It's split into small
   files under data/ — alphabetically by state, and separately by current
   administration (federal executive branch) and past administration — capped
   at 20 people per file, so any one file is quick to open, edit, and review.
   See data/README.md for the full map of which file holds which people.

   How it fits together: this file declares the shared arrays EMPTY. Every
   file under data/ then pushes its own rows into these same arrays (or, for
   PAST_ADMINISTRATIONS, into one administration's nested `people` array).
   aow-index.html loads this file first, then every data/ file (any order
   works between them), then the app logic — which reads DEFAULT_MEMBERS,
   DEFAULT_PROMISES, PAST_ADMINISTRATIONS, PAST_PROMISES, ARCHIVE,
   ARCHIVE_PROMISES, PERSON_LINKS, CONFIRMED_NO_PRIOR_ROLE, and PRIOR_ROLES
   exactly as before — nothing downstream of this file changed shape.

   To add a new file (e.g. a state that later needs a second part), just add
   one more <script src="data/..."> line in aow-index.html — this file does
   NOT need to change; it only needs to keep loading before the rest.
*/

// Default seed data — only used the first time this loads with nothing in storage yet.
// After that, MEMBERS/PROMISES (see aow-index.html) are loaded from (and saved back to)
// persistent storage, same as before this file was split up.
const DEFAULT_MEMBERS = [];
const DEFAULT_PROMISES = [];

// A small, curated reference set — not the live, editable roster. Sourced from PolitiFact's own
// closed-record retrospectives on both terms, since both administrations are now complete and the
// outcomes are settled rather than still in progress. Where a Cabinet position changed hands during
// the term, the person listed is whoever served longest in a confirmed capacity — not necessarily
// whoever technically held the office on the administration's final day. The two administrations'
// people/promises are filled in by data/past-administrations/biden-46.js and trump-45.js.
const PAST_ADMINISTRATIONS = [
  { id: 'biden-46', label: 'Biden Administration', years: '2021–2025', party: 'D', people: [] },
  { id: 'trump-45', label: 'Trump (First Term)', years: '2017–2021', party: 'R', people: [] }
];
const PAST_PROMISES = [];

// Archive — people who don't currently hold a tracked office: former officeholders who left
// (resignation, retirement, defeat, death), candidates who ran and lost, and other historical
// figures whose promises are still worth having on record. Filled in by data/archive.js.
const ARCHIVE = [];
const ARCHIVE_PROMISES = [];

// Groups of entry IDs (spanning MEMBERS, PAST_ADMINISTRATIONS people, and PRIOR_ROLES) that are
// the same real person under different roles or terms. Checked whenever a detail page is opened
// so the person gets one merged profile listing every role. Filled in by data/person-links.js.
const PERSON_LINKS = [];

// People who were specifically researched and confirmed to have held no qualifying prior elected
// office (as distinct from people not yet researched at all). Filled in by
// data/confirmed-no-prior-role.js.
const CONFIRMED_NO_PRIOR_ROLE = [];

// Individual prior stints for current officials with a documented career in a previously-elected
// office. Filled in by data/prior-roles/part-1.js, part-2.js, part-3.js.
const PRIOR_ROLES = [];
