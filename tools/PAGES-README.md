# Static pages: how they stay current

`tools/build-pages.js` turns your data files into crawlable pages. It never edits
anything it didn't generate (every generated file carries an `aow-generated` marker).

## What gets built
- `index.html`: **not generated (the home page is off).** The bare domain has no landing page of its own: the
  root `index.html` is a small hand-written redirect to the tracker (`aow-index.html`) that keeps any `?query` and
  `#hash`, so campaign links and sign-in links survive. Because it has no `aow-generated` marker, the builder never
  touches it, every generated page treats the tracker as "Home", and `/` stays out of the sitemap. Jay decided on
  Oct 16, 2026 that a separate landing page isn't needed.
  *Switching the landing page back on:* replace the root `index.html` with a file containing the marker comment
  (the first line of any generated page: `<!-- aow-generated: do not edit by hand; rebuilt by tools/build-pages.js -->`),
  commit it, and run "Build static pages" (Actions tab > Run workflow). The builder then writes the home page. Its
  three headline numbers are deliberately **rounded-down claims that stay true**, not live counts: officials is the
  roster rounded down to its leading digit, states is counted from the roster, and promises comes from
  `PROMISES_FLOOR` near the top of the home section in `build-pages.js` (the repo data files hold only a small
  hand-entered set of promises, so the builder cannot count the tracker's thousands). Raise `PROMISES_FLOOR` to
  claim more, and keep it below the tracker's real count
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
Hubs group people by where they serve, never by party or score, and list them alphabetically:

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
no JavaScript apart from JSON-LD data blocks and ship a strict CSP.

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
- Ads: pages currently contain no scripts and a locked-down CSP. When AdSense approves the
  site, the template gets `ads.js`, the ad box, and a relaxed CSP in one change.

## Security finding (not changed)
The Supabase policy "promises readable by everyone" is `using (true)`, so anyone with the
public key can read `draft` promises through the API (the site hides them only in the UI).
The table is empty today, so nothing is exposed yet. Before promises move in, consider:

    drop policy "promises readable by everyone" on public.promises;
    create policy "promises readable unless draft" on public.promises for select
      using (draft = false or exists (select 1 from public.profiles
        where id = auth.uid() and (is_admin_account or is_bot)));
