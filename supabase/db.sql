-- Erweiterungen (wenn nicht vorhanden)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Profile mit Username + last_seen
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  last_seen timestamptz,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Policies: jeder sieht nur sein eigenes Profil
create policy "profile_select_own"
  on public.profiles
  for select
  using ( auth.uid() = id );

create policy "profile_insert_own"
  on public.profiles
  for insert
  with check ( auth.uid() = id );

create policy "profile_update_own"
  on public.profiles
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- Logins (nur protokollieren, im Frontend nicht anzeigen)
create table if not exists public.user_logins (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  user_agent text,
  note text
);
alter table public.user_logins enable row level security;

-- Policies: nur eigener Kram
create policy "login_insert_own"
  on public.user_logins
  for insert
  with check ( auth.uid() = user_id );

create policy "login_select_own"
  on public.user_logins
  for select
  using ( auth.uid() = user_id );

-- Events (Gemeinschaftskalender)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.events enable row level security;

-- Trigger für updated_at
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch
before update on public.events
for each row execute procedure public.touch_updated_at();

-- RLS:
-- 1) Jeder eingeloggte User darf ALLE Events lesen (Gemeinschaft)
create policy "events_read_all"
  on public.events
  for select
  using ( auth.role() = 'authenticated' );

-- 2) Nur der Besitzer darf erstellen/ändern/löschen
create policy "events_insert_own"
  on public.events
  for insert
  with check ( auth.uid() = owner );

create policy "events_update_own"
  on public.events
  for update
  using ( auth.uid() = owner )
  with check ( auth.uid() = owner );

create policy "events_delete_own"
  on public.events
  for delete
  using ( auth.uid() = owner );

-- STORAGE: Öffentlicher Bucket für einfache Nutzung
-- (Sicherheit ist für euch nicht kritisch)
select storage.create_bucket('laura', public := true);

-- Policies für den Bucket
-- Lesen: alle (weil public := true) – Select-Policy optional
create policy if not exists "storage_public_read"
on storage.objects
for select
to public
using ( bucket_id = 'laura' );

-- Hochladen: nur Authentifizierte
create policy if not exists "storage_auth_insert"
on storage.objects
for insert
to authenticated
with check ( bucket_id = 'laura' );

-- Update/Delete: nur Besitzer (Storage setzt owner automatisch)
create policy if not exists "storage_owner_update"
on storage.objects
for update
to authenticated
using ( bucket_id = 'laura' and owner = auth.uid() )
with check ( bucket_id = 'laura' and owner = auth.uid() );

create policy if not exists "storage_owner_delete"
on storage.objects
for delete
to authenticated
using ( bucket_id = 'laura' and owner = auth.uid() );
