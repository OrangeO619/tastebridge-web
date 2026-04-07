create table if not exists public.map_share_notifs (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view','edit')),
  created_at timestamptz not null default now()
);

create index if not exists idx_map_share_notifs_shared_with on public.map_share_notifs(shared_with, created_at desc);

alter table public.map_share_notifs enable row level security;

drop policy if exists map_share_notifs_read on public.map_share_notifs;
create policy map_share_notifs_read on public.map_share_notifs
for select using (auth.uid() = shared_with);


drop policy if exists map_share_notifs_insert on public.map_share_notifs;
create policy map_share_notifs_insert on public.map_share_notifs
for insert with check (auth.uid() = owner_id);
