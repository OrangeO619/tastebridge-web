create table if not exists public.map_shares (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view','edit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, shared_with)
);

create index if not exists idx_map_shares_shared_with on public.map_shares(shared_with, permission, created_at desc);
create index if not exists idx_map_shares_owner on public.map_shares(owner_id, created_at desc);

alter table public.map_shares enable row level security;

drop policy if exists map_shares_read on public.map_shares;
create policy map_shares_read on public.map_shares
for select using (auth.uid() = owner_id or auth.uid() = shared_with);

drop policy if exists map_shares_insert on public.map_shares;
create policy map_shares_insert on public.map_shares
for insert with check (auth.uid() = owner_id);

drop policy if exists map_shares_update on public.map_shares;
create policy map_shares_update on public.map_shares
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists map_shares_delete on public.map_shares;
create policy map_shares_delete on public.map_shares
for delete using (auth.uid() = owner_id);
