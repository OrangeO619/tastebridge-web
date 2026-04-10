-- 添加已读时间字段
alter table public.map_share_notifs add column if not exists read_at timestamptz default null;

-- 允许用户更新自己收到的通知
drop policy if exists map_share_notifs_update on public.map_share_notifs;
create policy map_share_notifs_update on public.map_share_notifs
for update using (auth.uid() = shared_with);
