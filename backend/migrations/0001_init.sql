-- PillPal schema. Generated from app/models.py (SQLModel) for Postgres, plus Supabase specifics:
--  * app_user.id references auth.users so deleting a login removes the app user
--  * RLS enabled on every table with NO policies, and anon/authenticated privileges revoked:
--    all data access goes through the FastAPI backend (direct DB connection as postgres).

create type role as enum ('caregiver', 'member');
create type dosestatus as enum ('taken', 'skipped');

create table family (
  id serial primary key,
  name varchar(80) not null,
  timezone varchar(64) not null
);

create table profile (
  id serial primary key,
  family_id integer not null references family (id) on delete cascade,
  name varchar(80) not null,
  date_of_birth date,
  notes varchar(500)
);
create index ix_profile_family_id on profile (family_id);

create table app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  email varchar(254) not null unique,
  role role not null,
  family_id integer not null references family (id) on delete cascade,
  profile_id integer references profile (id) on delete set null
);
create index ix_app_user_family_id on app_user (family_id);
create index ix_app_user_profile_id on app_user (profile_id);

create table medicine (
  id serial primary key,
  profile_id integer not null references profile (id) on delete cascade,
  name varchar(120) not null,
  strength varchar(60) not null,
  rxterms_name varchar(200),
  instructions varchar(300) not null,
  start_date date not null,
  end_date date,
  active boolean not null
);
create index ix_medicine_profile_id on medicine (profile_id);

create table schedule_time (
  id serial primary key,
  medicine_id integer not null references medicine (id) on delete cascade,
  time_of_day time without time zone not null,
  unique (medicine_id, time_of_day)
);
create index ix_schedule_time_medicine_id on schedule_time (medicine_id);

create table dose_log (
  id serial primary key,
  medicine_id integer not null references medicine (id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time without time zone not null,
  status dosestatus not null,
  marked_at timestamp with time zone not null,
  marked_by uuid not null,
  unique (medicine_id, scheduled_date, scheduled_time)
);
create index ix_dose_log_medicine_id on dose_log (medicine_id);
create index ix_dose_log_scheduled_date on dose_log (scheduled_date);

do $$
declare t text;
begin
  foreach t in array array['family','profile','app_user','medicine','schedule_time','dose_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
