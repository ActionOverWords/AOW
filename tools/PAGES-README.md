# Static pages: how they stay current

`tools/build-pages.js` turns your data files into crawlable pages. It never edits
anything it didn't generate (every generated file carries an `aow-generated` marker).

## What gets built
- `officials/<id>/index.html`: one page per person (linked roles merged via PERSON_LINKS)
- `officials/index.html`: directory
- `sitemap.xml`: `<lastmod>` changes only when a page's content actually changes
- `robots.txt`: only if absent (a hand-written one is left alone)
- `tools/pages-manifest.json` and `tools/pages-report.txt`: bookkeeping you commit

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
Scores use ALL tracked promises (same as the tracker); pages say when some are held back.
Tune with `--min-publishers`.

## Safety checks
Fails (publishes nothing) if: no publishable promises, official pages would drop >15% in
one run (`--allow-shrink` to override), a promise has an invalid status or empty text, an id
isn't a safe slug, or a non-generated file sits at a generated path. Source URLs must be
http(s). All text is HTML-escaped. Pages contain no JavaScript and ship a strict CSP.

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
