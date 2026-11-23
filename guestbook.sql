-- Use gallery.sql for the complete setup.
-- Run in the configured Supabase project before enabling the shared guestbook.
create table if not exists public.gallery_guestbook (
  id bigint generated always as identity primary key,
  exhibit_id text not null check (exhibit_id in ('eonmyeongnok', 'snap', 'where', 'sketchcatch', 'ilguda', 'harugi', 'inuna')),
  message text not null check (char_length(trim(message)) between 1 and 200),
  created_at timestamptz not null default now()
);
alter table public.gallery_guestbook enable row level security;
grant select, insert on public.gallery_guestbook to anon, authenticated;
grant usage, select on sequence public.gallery_guestbook_id_seq to anon, authenticated;
create policy "Anyone can read guestbook" on public.gallery_guestbook for select to anon, authenticated using (true);
create policy "Anyone can write guestbook" on public.gallery_guestbook for insert to anon, authenticated with check (true);
