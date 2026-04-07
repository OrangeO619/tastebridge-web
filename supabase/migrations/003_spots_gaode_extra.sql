-- 高德 POI 同步：评分、人均（展示快照，与 TasteBridge 自有「喜爱值」无关）

alter table public.spots
  add column if not exists gaode_rating text,
  add column if not exists avg_price text;

comment on column public.spots.gaode_rating is '高德侧评分快照（如有）';
comment on column public.spots.avg_price is '高德侧人均消费展示文案（如有）';
