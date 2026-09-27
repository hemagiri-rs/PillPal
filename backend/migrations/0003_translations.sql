-- Translation cache (addendum C). Same lockdown: RLS on, no policies, no anon access.
create table translation (
  id serial primary key,
  lang varchar(10) not null,
  source varchar(500) not null,
  text varchar(2000) not null,
  unique (lang, source)
);

alter table public.translation enable row level security;
revoke all on public.translation from anon, authenticated;
