create table if not exists public.collab_invites (
  id bigserial primary key,
  spot_id uuid not null references public.spots(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collab_invites_invitee_status on public.collab_invites(invitee_id, status, created_at desc);
create index if not exists idx_collab_invites_spot on public.collab_invites(spot_id);

alter table public.collab_invites enable row level security;

drop policy if exists collab_invites_read on public.collab_invites;
create policy collab_invites_read on public.collab_invites
for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);

drop policy if exists collab_invites_insert on public.collab_invites;
create policy collab_invites_insert on public.collab_invites
for insert with check (auth.uid() = inviter_id);

drop policy if exists collab_invites_update on public.collab_invites;
create policy collab_invites_update on public.collab_invites
for update using (auth.uid() = invitee_id)
with check (auth.uid() = invitee_id);
