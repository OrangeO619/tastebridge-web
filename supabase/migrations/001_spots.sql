-- TasteBridge：店铺点位表（与 PRD Spot 对齐，坐标用 lat/lng 便于与 Mapbox 对接）
-- 在 Supabase Dashboard → SQL Editor 中执行本文件内容

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  place_id text,
  phone text,
  business_hours text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by text not null
);

create index if not exists spots_created_at_idx on public.spots (created_at desc);

-- MVP：允许匿名通过 service role 的 API 读写；上线前务必改为 RLS + 用户 JWT
alter table public.spots enable row level security;

-- 开发阶段：若仅用服务端 service_role 访问，可不建 policy（service_role 绕过 RLS）
-- 若要用 anon key 直连表，需添加相应 policy

comment on table public.spots is '店铺固有信息；用户喜爱记录见后续 pref_records 表';
