create extension if not exists pgcrypto;

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  grape_count integer not null default 30 check (grape_count > 0 and grape_count <= 100),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.grape_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grape_index integer not null check (grape_index > 0),
  image_path text not null,
  content text,
  created_at timestamptz not null default now(),
  unique (challenge_id, grape_index)
);

create index if not exists challenges_user_created_idx
  on public.challenges (user_id, created_at desc);

create index if not exists grape_entries_challenge_index_idx
  on public.grape_entries (challenge_id, grape_index);

alter table public.challenges enable row level security;
alter table public.grape_entries enable row level security;

drop policy if exists "Users can read own challenges" on public.challenges;
create policy "Users can read own challenges"
  on public.challenges
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own challenges" on public.challenges;
create policy "Users can create own challenges"
  on public.challenges
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own challenges" on public.challenges;
create policy "Users can update own challenges"
  on public.challenges
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own challenges" on public.challenges;
create policy "Users can delete own challenges"
  on public.challenges
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own grape entries" on public.grape_entries;
create policy "Users can read own grape entries"
  on public.grape_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own grape entries" on public.grape_entries;
create policy "Users can create own grape entries"
  on public.grape_entries
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.challenges
      where challenges.id = grape_entries.challenge_id
        and challenges.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own grape entries" on public.grape_entries;
create policy "Users can update own grape entries"
  on public.grape_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own grape entries" on public.grape_entries;
create policy "Users can delete own grape entries"
  on public.grape_entries
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'grape-photos',
  'grape-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own grape photos" on storage.objects;
create policy "Users can read own grape photos"
  on storage.objects
  for select
  using (
    bucket_id = 'grape-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own grape photos" on storage.objects;
create policy "Users can upload own grape photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'grape-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own grape photos" on storage.objects;
create policy "Users can update own grape photos"
  on storage.objects
  for update
  using (
    bucket_id = 'grape-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'grape-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own grape photos" on storage.objects;
create policy "Users can delete own grape photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'grape-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
