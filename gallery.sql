-- Supabase SQL Editor에서 실행하세요. 공개 키만 브라우저에 사용합니다.
create table if not exists public.gallery_guestbook (
  id bigint generated always as identity primary key,
  exhibit_id text not null,
  message text not null check (char_length(trim(message)) between 1 and 200),
  created_at timestamptz not null default now()
);
alter table public.gallery_guestbook drop constraint if exists gallery_guestbook_exhibit_id_check;
alter table public.gallery_guestbook add constraint gallery_guestbook_exhibit_id_check check (exhibit_id in ('eonmyeongnok','snap','where','sketchcatch','ilguda','harugi','inuna'));
alter table public.gallery_guestbook enable row level security;
grant select, insert on public.gallery_guestbook to anon, authenticated;
grant usage, select on sequence public.gallery_guestbook_id_seq to anon, authenticated;
drop policy if exists "Anyone can read guestbook" on public.gallery_guestbook;
drop policy if exists "Anyone can write guestbook" on public.gallery_guestbook;
create policy "Anyone can read guestbook" on public.gallery_guestbook for select to anon, authenticated using (true);
create policy "Anyone can write guestbook" on public.gallery_guestbook for insert to anon, authenticated with check (true);

create table if not exists public.gallery_votes (
  ballot_id uuid primary key,
  exhibit_id text not null check (exhibit_id in ('eonmyeongnok','snap','where','sketchcatch','ilguda','harugi','inuna')),
  created_at timestamptz not null default now()
);
alter table public.gallery_votes enable row level security;
revoke all on public.gallery_votes from anon, authenticated;

create or replace function public.gallery_vote(p_ballot_id uuid, p_exhibit_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare chosen text;
begin
  if now() < '2026-12-16T00:00:00+09:00'::timestamptz or now() >= '2027-01-01T00:00:00+09:00'::timestamptz then
    raise exception 'Voting is closed';
  end if;
  insert into public.gallery_votes (ballot_id, exhibit_id) values (p_ballot_id, p_exhibit_id)
    on conflict (ballot_id) do nothing;
  select exhibit_id into chosen from public.gallery_votes where ballot_id = p_ballot_id;
  return chosen;
end $$;

create or replace function public.gallery_vote_results()
returns table (exhibit_id text, votes bigint) language sql security definer set search_path = '' as $$
  select v.exhibit_id, count(*) from public.gallery_votes v
  where now() >= '2027-01-01T00:00:00+09:00'::timestamptz group by v.exhibit_id;
$$;
revoke all on function public.gallery_vote(uuid, text) from public;
revoke all on function public.gallery_vote_results() from public;
grant execute on function public.gallery_vote(uuid, text), public.gallery_vote_results() to anon, authenticated;

create table if not exists public.gallery_applause_counts (
  exhibit_id text primary key check (exhibit_id in ('eonmyeongnok','snap','where','sketchcatch','ilguda','harugi','inuna')),
  count bigint not null default 0
);
alter table public.gallery_applause_counts enable row level security;
revoke all on public.gallery_applause_counts from anon, authenticated;
create or replace function public.gallery_applause(p_exhibit_id text)
returns void language sql security definer set search_path = '' as $$
  insert into public.gallery_applause_counts (exhibit_id, count) values (p_exhibit_id, 1)
  on conflict (exhibit_id) do update set count = public.gallery_applause_counts.count + 1;
$$;
revoke all on function public.gallery_applause(text) from public;
grant execute on function public.gallery_applause(text) to anon, authenticated;
