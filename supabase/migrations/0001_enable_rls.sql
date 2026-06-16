-- Finance Portal — lock down the database.
--
-- This app has NO Supabase Auth users; the only authentication is the app PIN,
-- enforced server-side. All legitimate DB access goes through Next.js server
-- actions using the SERVICE-ROLE key, which bypasses RLS.
--
-- Strategy: enable RLS on every table and add NO policies for the anon /
-- authenticated roles. With RLS on and no policy, those roles can read/write
-- ZERO rows — so a leaked anon key is useless. We also REVOKE table privileges
-- from anon/authenticated as belt-and-suspenders.
--
-- Idempotent: safe to run multiple times. Run via the Supabase SQL editor, the
-- MCP apply_migration tool, or `supabase db push`.

do $$
declare
    t text;
    app_tables text[] := array['transactions', 'categories', 'savings_buckets', 'debts'];
begin
    foreach t in array app_tables loop
        if to_regclass(format('public.%I', t)) is not null then
            execute format('alter table public.%I enable row level security;', t);
            -- FORCE so the table owner is also subject to RLS (service_role still bypasses).
            execute format('alter table public.%I force row level security;', t);
            -- Remove any direct privileges from the client-facing roles.
            execute format('revoke all on public.%I from anon, authenticated;', t);
        else
            raise notice 'Table public.% not found — skipping.', t;
        end if;
    end loop;
end $$;

-- NOTE: We intentionally create NO policies. If you later add real per-user
-- Supabase Auth, replace this with policies scoped to auth.uid() and switch the
-- app back to the anon key + user session instead of the service-role key.
