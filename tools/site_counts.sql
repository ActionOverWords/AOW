-- site_counts(): the three headline numbers on the landing page (https://action-over-words.com/)
-- ------------------------------------------------------------------------------------------------
-- Run once in the Supabase SQL editor. Nothing in the repo runs this file; it is kept here so
-- the function can be recreated if the database is ever rebuilt. See tools/PAGES-README.md ("What gets built", index.html).
--
-- What it does: returns {"officials": N, "promises": N, "states": N} by counting the same two public rows the tracker
-- loads (app_data keys 'aow_officials' and 'aow_promises'), so the landing page shows the same exact figures as the
-- tracker's own headline strip (which rounds them and shows the exact number on hover). "states" is the number of the
-- 50 states that have at least one state-level official tracked.
--
-- Why it is safe to expose:
--   * It only reads. It is STABLE, so PostgREST also allows it over GET, and it writes nothing.
--   * SECURITY INVOKER: it runs with the caller's own rights, so row-level security still decides what can be read.
--     Those two rows are public by design (the tracker loads them for every visitor), so the function reveals nothing
--     new, and its answer is far smaller than the rows themselves (three numbers instead of several megabytes).
--   * search_path is pinned to empty and every table is schema-qualified, so nothing can be swapped in underneath it.
--   * It is not SECURITY DEFINER, so it adds nothing to the "executable SECURITY DEFINER function" security advisories.
--   * PUBLIC is revoked, and signed-out and signed-in visitors (anon, authenticated) are granted it. Supabase's own admin
--     roles (postgres, service_role) keep their usual default access.
--   * Cost: it has to read the large aow_promises row to count it, roughly 30 to 70 ms of database time per call. The same
--     row is already downloadable in full by anyone holding the public key, so this adds no new exposure. A lighter
--     version (plain jsonb_array_length without the type guard) is possible if landing-page traffic ever gets heavy.
--
-- The landing page calls it with one GET request (the browser sends a small automatic permission check first) and the
-- publishable key, and ignores the answer unless all three values are whole numbers in a sane range, so a missing or
-- malformed answer leaves the rounded-down figures in place. A well-formed answer is shown as it is.

create or replace function public.site_counts()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'officials', (
      select case when jsonb_typeof(a.value) = 'array' then jsonb_array_length(a.value) end
      from public.app_data a
      where a.key = 'aow_officials'
    ),
    'promises', (
      select case when jsonb_typeof(a.value) = 'array' then jsonb_array_length(a.value) end
      from public.app_data a
      where a.key = 'aow_promises'
    ),
    'states', (
      select count(distinct e ->> 'state')
      from public.app_data a,
           jsonb_array_elements(case when jsonb_typeof(a.value) = 'array' then a.value else '[]'::jsonb end) e
      where a.key = 'aow_officials'
        and e ->> 'level' = 'state'
        and (e ->> 'state') = any (array[
          'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
          'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
          'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
        ])
    )
  );
$$;

comment on function public.site_counts() is
  'Read-only headline counts (officials, promises, states) for the public landing page. SECURITY INVOKER; see tools/site_counts.sql.';

revoke all on function public.site_counts() from public;
grant execute on function public.site_counts() to anon, authenticated;

-- Check (as a visitor would see it). Expect {"states": 50, "officials": <roster size>, "promises": <promise count>}:
--   set local role anon;
--   select public.site_counts();
--
-- Undo, if ever wanted (the landing page then quietly keeps its rounded-down figures):
--   drop function if exists public.site_counts();
