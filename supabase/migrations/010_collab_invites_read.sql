-- 添加已读时间字段到协作邀请表
alter table public.collab_invites add column if not exists read_at timestamptz default null;
