-- 用户对该店的喜爱记录（与 PRD PrefRecord 对齐）
-- 在 Supabase Dashboard → SQL Editor 中执行

create table if not exists public.pref_records (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id text not null,

  overall integer not null check (overall >= 1 and overall <= 5),
  emoji text,
  mood_tag text,
  tags text[] not null default '{}',
  invited_by text,
  is_collaborative boolean not null default false,
  dimensions jsonb,
  note text,
  images text[] not null default '{}',
  visit_date date not null default (current_date),
  visit_count integer not null default 1 check (visit_count >= 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pref_records_spot_user_unique unique (spot_id, user_id)
);

create index if not exists pref_records_spot_id_idx on public.pref_records (spot_id);
create index if not exists pref_records_user_id_idx on public.pref_records (user_id);
create index if not exists pref_records_created_at_idx on public.pref_records (created_at desc);

alter table public.pref_records enable row level security;

comment on table public.pref_records is '用户对店铺的喜爱值与笔记；每用户每店一条（API 更新时 visit_count+1）';
