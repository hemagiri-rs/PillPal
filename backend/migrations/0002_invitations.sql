-- Family invitations (addendum A). Same lockdown as 0001: RLS on, no policies, no anon access.
create type invitestatus as enum ('pending', 'accepted', 'declined');

create table invitation (
  id serial primary key,
  family_id integer not null references family (id) on delete cascade,
  email varchar(254) not null,
  label varchar(60),
  invited_by uuid not null,
  status invitestatus not null,
  created_at timestamp with time zone not null,
  responded_at timestamp with time zone,
  unique (family_id, email)
);
create index ix_invitation_family_id on invitation (family_id);
create index ix_invitation_email on invitation (email);

alter table public.invitation enable row level security;
revoke all on public.invitation from anon, authenticated;
