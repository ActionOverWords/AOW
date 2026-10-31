# Static pages: how they stay current

`tools/build-pages.js` turns your data files into crawlable pages. It never edits
anything it didn't generate (every generated file carries an `aow-generated` marker).

## What gets built
- `index.html`: the landing page at the bare domain, **generated while the file carries the `aow-generated` marker
  comment** (the first line of any generated page: `<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->`).
  Plain visits read the page. Visits that carry a `?query` (utm_..., fbclid) or a `key=value` `#hash` (a sign-in or
  password-reset link) are sent on to the tracker (`aow-index.html`) with both parts intact, by one small inline script
  that the page's Content-Security-Policy allows by its hash (`HOME_REDIRECT_JS` in `build-pages.js`; change the script and
  the hash follows). Anchors on the page (`#sourcing`) have no `=`, so they stay put. Because the file is generated, "Home"
  in every page's breadcrumb and logo means this page, and `/` is in the sitemap.
  *Switching the landing page off:* replace the root `index.html` with a hand-written file that has no marker (for
  example a one-line `location.replace('aow-index.html' + location.search + location.hash)` redirect), commit, and
  run "Build static pages". The builder then leaves it alone and "Home" goes back to meaning the tracker.
  The landing page's three headline numbers come in two layers. The page is written with **rounded-down claims that stay
  true**: officials is the roster rounded down (two leading digits from 100 up: 736 reads "730+"), states is counted from the roster, and promises comes
  from `PROMISES_FLOOR` near the top of the home section in `build-pages.js` (the repo data files hold only a small
  hand-entered set of promises, so the builder cannot count the tracker's thousands; the live database held 19,540 on
  2026-10-30, and `PROMISES_FLOOR` is 19,000). That is what a visitor sees with scripts off, offline, or if the lookup below fails.
  In a normal browser a second small inline script then reads the **live counts** (736 officials, 19,540 promises, 50
  states on 2026-10-30) and shows them **rounded down by the same rule as the tracker's headline strip**: from 100 up the
  first two digits are kept, so 736 reads "730+" and 19,540 reads "19,000+" (10 to 99 keep one digit, under 10 is exact),
  and the states are shown as they are. (Until 2026-10-30 only the first digit was kept, which held 19,540 at "10,000+".) The exact figure is one hover away ("Exactly
  736"), like the tracker. So the page steps up by itself ("740+", "20,000+") as the data grows, without a rebuild, and
  always matches the tracker. The note under the numbers ("Counts are rounded down ...") is left as it is. The script
  makes one read-only lookup, `GET <project address>/rest/v1/rpc/site_counts` (the browser first sends its own automatic
  permission check, an `OPTIONS` request, so two small requests go out), to the database function `public.site_counts()`
  (`tools/site_counts.sql`, run once in the Supabase SQL editor). The function counts the same `aow_officials` and
  `aow_promises` rows the tracker loads, so the figures match the tracker's own. The request carries only the publishable
  key in an `apikey` header (no cookies, no sign-in, nothing stored). The answer is written into the page as plain text,
  and only if all three values are whole numbers in a sane range; a missing function, an error, bad data, or an answer
  slower than 8 seconds all leave the rounded-down figures in place. On a visit the redirect script is sending to the
  tracker (a `?query`, or a `#` holding `=`) the script does nothing at all, so a page that is about to be replaced never
  makes the request. The script's rounding rule (`up`) must stay the same as `roundedPlus()` in the builder and in
  `aow-index.html`.
  The project address and the publishable key are read out of `aow-index.html` at build time (nothing is copied into the
  builder). After rotating the key, start the build by hand (Actions > Build static pages > Run workflow): pushing
  `aow-index.html` alone does not start it, and the nightly run would only pick the new key up the next morning; until
  then the old key is refused and the page quietly keeps the rounded-down figures. If either setting cannot be found in the
  expected shape, or is declared more than once in `aow-index.html`, the page is built without the live script, the build
  prints a warning, and `tools/pages-report.txt` says "live headline numbers: off" with the reason.
  The page's Content-Security-Policy names both inline scripts (the redirect and the live counts) by their hashes and adds
  `connect-src` for that one address, nothing else. Raise `PROMISES_FLOOR` to make the fallback claim more, and keep it
  below the tracker's real count. The three hero cells were checked from 320 px wide up (including a much wider font)
  for officials up to 9,999 ("9,000+") and promises up to 99,999 ("90,000+"); the script's own sanity limits are wider,
  so if the counts ever get past those figures, look at the `.stat-row` rules in `HOME_CSS` (phones are the tight ones)
- `about/index.html` and `contact/index.html`: who runs the site, how it is paid for, its limits, and how to reach it.
  Fixed text that restates the tracker's About tab, the Terms and the methodology; the pages cannot host a form (strict
  CSP, no scripts), so Contact gives the email address and points to the tracker's own contact form
- `officials/<id>/index.html`: one page per person (linked roles merged via PERSON_LINKS). Each role opens with one
  plain sentence built from counts and status names ("ActionOverWords Index tracks 3 promises by ... as ...: 2 completed
  and 1 compromise. The AOW Score (0 to 100, based on 3 tracked promises) is ...."), and the page ends with a
  "More from ..." list of neighbours in the same group
- `officials/index.html`: directory
- `methodology/index.html`: how promises are sourced, rated and scored. Fixed text that restates what the
  site already says; the weights and the worked examples come from the same constants the scores use
- `administration/index.html`: hub for the sitting administration (President, Cabinet, agency heads)
- `congress/senate/`, `congress/house/`, `states/<state>/`: hubs, written automatically once a group has
  enough people with pages (see "Hub pages" below)
- `sitemap.xml`: `<lastmod>` changes only when a page's content actually changes
- `robots.txt`: only if absent (a hand-written one is left alone)
- `tools/pages-manifest.json` and `tools/pages-report.txt`: bookkeeping you commit
- `tools/indexnow.js`, `.github/workflows/indexnow.yml` and `<key>.txt`: tell Bing and other engines what changed
  (see "IndexNow" below)

Every generated page carries `<meta name="google-adsense-account" content="ca-pub-...">` (`ADSENSE_ACCOUNT` near the top
of `build-pages.js`), because Google's site verification and re-checks read it from the bare domain's head.

Pages point at `og-image.png`, `favicon.ico`, `favicon.svg` and `apple-touch-icon.png` in the repo root.
Those files come from the earlier SEO upload; the pages still work if one is missing.

## Why it can't go stale
The GitHub Action (`.github/workflows/build-pages.yml`) rebuilds when `data.js` or `data/**`
changes (so every merged promise PR updates its page within minutes), nightly, and on
demand. Each run is a full rebuild: a promise set to `draft:true`, removed, or retracted
disappears from its page; a person with nothing publishable loses their page and sitemap
entry. For an urgent correction, run the workflow manually (Actions tab > Build static pages).

## What gets published (the sourcing gate)
A promise appears on a static page only if it has sources from at least 3 distinct
publishers and at least one primary-type source (official record, voting record, or the
official's own office), matching your enforced sourcing rules. Everything else stays
in the interactive tracker only and is listed in `tools/pages-report.txt` with the reason.
A promise with status Undetermined is a placeholder, not a verdict: it is never published and
never scored here (the tracker does the same for scores).
Scores use ALL tracked promises (same as the tracker); pages say when some are held back.
Tune with `--min-publishers`.

## Hub pages
Hubs group people by where they serve, never by party or score, and list them alphabetically, except
`administration/` (and the directory's Federal administration section), which follows the official order:
President, Vice President, the 15 executive departments in their legal order of succession (3 U.S.C. 19),
then other Cabinet-level officials, then agency heads, by last name within those two. The order comes from
the office title (`DEPARTMENT_ORDER` in `build-pages.js`; the tracker `aow-index.html` has the same table):

| Hub | Who is in it |
| --- | --- |
| `administration/` | current federal executive (state `US`): President and VP, Cabinet and senior White House, sub-Cabinet agency heads |
| `congress/senate/`, `congress/house/` | current senators, current House members and delegates |
| `states/<state>/` | everyone current who serves that state: governor, statewide offices, its senators and House members |

A hub is written only when it has at least `--hub-min` people with pages (default 3), so a thin or
empty hub is never published. Below that, the people still link to each other. Each hub also lists
the rest of that group by name only (no link), the same way the directory does. When a group
drops below the minimum, its hub is removed, but only if the script generated it and nothing else
lives in that folder. `tools/pages-report.txt` lists the hubs that exist and how many groups are
below the minimum.

Today every page belongs to the federal executive, so only `administration/` appears. State and
Congress hubs switch on by themselves as researched promises are added for those officials. The
bottleneck is sourced promises, not code: a person only gets a page once a promise has three
publishers including a primary record.

## IndexNow (telling Bing and others what changed)
IndexNow is an open protocol: one notification reaches Bing, Yandex, Naver, Seznam, Yep and Amazon. Bing's index also
feeds Yahoo and DuckDuckGo. Google does not use IndexNow; it learns from `sitemap.xml` and Search Console.

After every successful "Build static pages" run, the workflow "Tell IndexNow engines about changed pages" compares
`sitemap.xml` before and after, waits until the live site shows the update (a Pages deploy takes a minute or two), and
sends the URLs whose `<lastmod>` is new or different, plus pages that were removed. Nothing else is sent.

- **Key file.** `<key>.txt` in the repo root contains only the key. It is public by design: it proves you control the
  site, nothing more. Do not delete it while the workflow is in use; to rotate the key, add a new `<newkey>.txt`
  containing the new key and delete the old file.
- **Check it.** After the first deploy, open `https://action-over-words.com/<key>.txt`; it should show the key. Then run
  Actions > "Tell IndexNow engines about changed pages" > Run workflow with "all" ticked to send every page once.
- **Failures.** A failed IndexNow run shows a red mark in the Actions tab but cannot affect the site or the page build.
- **Turn it off.** Delete the workflow file or the key file.

## Safety checks
Fails (publishes nothing) if: no publishable promises, official pages would drop >15% in
one run (`--allow-shrink` to override), a promise has an invalid status or empty text, an id
isn't a safe slug, or a non-generated file sits at a generated path (officials, methodology and
every hub path are checked; a hand-written `index.html` is simply left alone). Source URLs must be http(s). All text is HTML-escaped. Pages contain
no JavaScript apart from JSON-LD data blocks and, on the home page only, two small inline scripts (the redirect and the live
counts, both allowed by hash), and ship a strict CSP.

## First run
1. Copy `tools/` and `.github/` into the repo root.
2. Locally: `node tools/build-pages.js`, then open `officials/index.html` and read `tools/pages-report.txt`.
3. Commit. In GitHub: Settings > Actions > General > Workflow permissions > Read and write.
4. If `main` is branch-protected, the bot's push will be rejected; allow it or tell me
   and I'll switch the workflow to open a PR instead.
5. After the first Action run, confirm Pages redeployed on the bot's commit.

## Later
- Supabase: `promises` is currently empty, so the generator reads the data files. When
  promises migrate, the data source gets swapped; the pages, sitemap and workflow stay.
- Ads: apart from the home page's two small inline scripts (the redirect and the live counts, each allowed by hash),
  pages contain no scripts and have a locked-down CSP. When AdSense approves the
  site, the template gets `ads.js`, the ad box, and a relaxed CSP in one change.

## Security finding (not changed)
The Supabase policy "promises readable by everyone" is `using (true)`, so anyone with the
public key can read `draft` promises through the API (the site hides them only in the UI).
The table is empty today, so nothing is exposed yet. Before promises move in, consider:

    drop policy "promises readable by everyone" on public.promises;
    create policy "promises readable unless draft" on public.promises for select
      using (draft = false or exists (select 1 from public.profiles
        where id = auth.uid() and (is_admin_account or is_bot)));
