alter table public.grape_entries
add column if not exists event_date date;

update public.grape_entries
set event_date = created_at::date
where event_date is null;

alter table public.grape_entries
alter column event_date set not null;

alter table public.grape_entries
alter column event_date set default current_date;
