alter table public.challenges
add column if not exists one_grape_per_day boolean not null default false;

create or replace function public.create_next_grape_entry(
  p_challenge_id uuid,
  p_image_path text,
  p_content text,
  p_event_date date
)
returns public.grape_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  challenge_row public.challenges%rowtype;
  next_index integer;
  inserted_row public.grape_entries%rowtype;
begin
  select *
  into challenge_row
  from public.challenges
  where id = p_challenge_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Challenge not found';
  end if;

  if challenge_row.one_grape_per_day and exists (
    select 1
    from public.grape_entries
    where challenge_id = p_challenge_id
      and user_id = auth.uid()
      and event_date = p_event_date
  ) then
    raise exception 'Only one grape entry per day is allowed';
  end if;

  select coalesce(max(grape_index), 0) + 1
  into next_index
  from public.grape_entries
  where challenge_id = p_challenge_id;

  if next_index > challenge_row.grape_count then
    raise exception 'Challenge is already complete';
  end if;

  insert into public.grape_entries (
    challenge_id,
    user_id,
    grape_index,
    image_path,
    content,
    event_date
  )
  values (
    p_challenge_id,
    auth.uid(),
    next_index,
    p_image_path,
    coalesce(nullif(trim(p_content), ''), '오늘 포도알 하나 채웠다.'),
    p_event_date
  )
  returning *
  into inserted_row;

  if next_index = challenge_row.grape_count then
    update public.challenges
    set completed_at = now()
    where id = p_challenge_id
      and completed_at is null;
  end if;

  return inserted_row;
end;
$$;
