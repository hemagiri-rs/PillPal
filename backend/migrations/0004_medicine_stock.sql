-- Optional tablet stock for refill reminders.
alter table medicine add column pills_left integer check (pills_left >= 0);
alter table medicine add column pills_per_dose integer not null default 1 check (pills_per_dose between 1 and 20);
