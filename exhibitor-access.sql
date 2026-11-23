-- Run in Supabase SQL Editor. Keys are stored only as SHA-256 hashes.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.gallery_exhibitor_keys (
  exhibit_id text primary key check (exhibit_id in ('eonmyeongnok','snap','where','sketchcatch','ilguda','harugi','inuna')),
  key_hash bytea not null unique
);
alter table public.gallery_exhibitor_keys enable row level security;
revoke all on public.gallery_exhibitor_keys from public, anon, authenticated;

create or replace function public.gallery_verify_exhibitor_key(p_key text)
returns text language sql stable security definer set search_path = '' as $$
  select exhibit_id from public.gallery_exhibitor_keys
  where length(p_key) = 64 and key_hash = extensions.digest(p_key, 'sha256')
  limit 1;
$$;
revoke all on function public.gallery_verify_exhibitor_key(text) from public;
grant execute on function public.gallery_verify_exhibitor_key(text) to anon, authenticated;

-- To issue or rotate all keys, run this separately in the SQL Editor and securely
-- distribute each returned key to its exhibitor. The plaintext is not stored.
-- Rotating invalidates every previously issued key.
-- with keys as materialized (
--   select exhibit_id, encode(extensions.gen_random_bytes(32), 'hex') as key
--   from unnest(array['eonmyeongnok','snap','where','sketchcatch','ilguda','harugi','inuna']) exhibit_id
-- ), saved as (
--   insert into public.gallery_exhibitor_keys (exhibit_id, key_hash)
--   select exhibit_id, extensions.digest(key, 'sha256') from keys
--   on conflict (exhibit_id) do update set key_hash = excluded.key_hash
--   returning exhibit_id
-- )
-- select keys.exhibit_id, keys.key from keys join saved using (exhibit_id);
