const fs = require('fs');

// 修复 MapPageClient.tsx
const mapPath = 'src/features/map/components/MapPageClient.tsx';
let mapContent = fs.readFileSync(mapPath, 'utf8');

// 1. 修复 PoiSearchBar 的 className - 移除 basis-full 避免占满整行，改为固定宽度
mapContent = mapContent.replace(
  '<PoiSearchBar className="pointer-events-auto order-3 basis-full min-w-0 sm:order-2 sm:basis-auto sm:flex-1 sm:max-w-xl" onPick={handlePoiPick} />',
  '<PoiSearchBar className="pointer-events-auto order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:min-w-[280px] sm:max-w-md" onPick={handlePoiPick} />'
);

// 2. 修复顶部导航栏布局 - 使用 grid 布局避免遮挡
mapContent = mapContent.replace(
  '<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">',
  '<div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:flex sm:flex-wrap sm:gap-2">'
);

// 3. 修复第一行元素的 order
mapContent = mapContent.replace(
  '<div className="pointer-events-auto order-1 flex min-w-0 items-center gap-2">',
  '<div className="pointer-events-auto col-span-1 flex min-w-0 items-center gap-2 sm:order-1">'
);

// 4. 修复搜索框在移动端单独一行
mapContent = mapContent.replace(
  '<PoiSearchBar className="pointer-events-auto order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:min-w-[280px] sm:max-w-md" onPick={handlePoiPick} />',
  '<PoiSearchBar className="pointer-events-auto col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:row-start-1 sm:order-2 sm:min-w-[280px] sm:max-w-md" onPick={handlePoiPick} />'
);

// 5. 修复图层选择器
mapContent = mapContent.replace(
  '<div className="pointer-events-auto order-4 flex flex-wrap items-center gap-1.5">',
  '<div className="pointer-events-auto col-span-1 flex items-center gap-1.5 sm:order-4">'
);

// 6. 修复点位计数显示
mapContent = mapContent.replace(
  '{loadError ? <span className="pointer-events-auto order-2 ml-auto max-w-[40%] truncate text-[10px] text-amber-200 sm:order-3 sm:max-w-[28%] sm:text-xs">{loadError}</span> : <span className="order-2 ml-auto text-[10px] text-white/90 sm:order-3 sm:text-xs"><span className="hidden sm:inline">{layerMode === "mine" ? "我的足迹" : layerMode === "shared" ? "共享地图" : "全部图层"} · </span>{spots.length} 点位</span>}',
  '{loadError ? <span className="pointer-events-auto col-span-1 justify-self-end max-w-[40%] truncate text-[10px] text-amber-200 sm:order-3 sm:ml-auto sm:max-w-[28%] sm:text-xs">{loadError}</span> : <span className="col-span-1 justify-self-end text-[10px] text-white/90 sm:order-3 sm:ml-auto sm:text-xs"><span className="hidden sm:inline">{layerMode === "mine" ? "我的足迹" : layerMode === "shared" ? "共享地图" : "全部图层"} · </span>{spots.length} 点位</span>}'
);

// 7. 提高 SpotBottomCard 的 z-index (从 z-20 改为 z-40)
mapContent = mapContent.replace(
  '{selectedSpot && !addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">',
  '{selectedSpot && !addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">'
);

// 8. 提高 AddSpotSheet 的 z-index (从 z-[25] 改为 z-[45])
mapContent = mapContent.replace(
  '{addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">',
  '{addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">'
);

fs.writeFileSync(mapPath, mapContent, 'utf8');
console.log('MapPageClient.tsx updated');

// 修复 PoiSearchBar.tsx - 固定宽度
const poiPath = 'src/features/map/components/PoiSearchBar.tsx';
let poiContent = fs.readFileSync(poiPath, 'utf8');

// 让搜索框在移动端更紧凑
poiContent = poiContent.replace(
  '<div className="flex flex-col gap-2 sm:flex-row sm:items-center">',
  '<div className="flex items-center gap-1.5 sm:flex-row sm:gap-2">'
);

// 优化输入框容器
poiContent = poiContent.replace(
  '<div className="flex min-w-0 flex-1 gap-2 rounded-xl border border-white/25 bg-black/40 px-2 py-1.5 shadow-lg backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75">',
  '<div className="flex min-w-0 flex-1 gap-1.5 rounded-xl border border-white/25 bg-black/40 px-2 py-1 shadow-lg backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75 sm:gap-2 sm:py-1.5">'
);

// 优化搜索图标
poiContent = poiContent.replace(
  '<Search className="mt-2 h-4 w-4 shrink-0 text-white/70" aria-hidden />',
  '<Search className="mt-1.5 h-3.5 w-3.5 shrink-0 text-white/70 sm:mt-2 sm:h-4 sm:w-4" aria-hidden />'
);

// 优化输入框
poiContent = poiContent.replace(
  'className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-white/50 outline-none"',
  'className="min-w-0 flex-1 bg-transparent py-1 text-xs text-white placeholder:text-white/50 outline-none sm:py-1.5 sm:text-sm"'
);

// 优化城市输入和搜索按钮容器
poiContent = poiContent.replace(
  '<div className="flex shrink-0 gap-2">',
  '<div className="flex shrink-0 gap-1.5 sm:gap-2">'
);

// 优化城市输入框
poiContent = poiContent.replace(
  'className="w-[6.5rem] rounded-xl border border-white/25 bg-black/40 px-2 py-2 text-sm text-white placeholder:text-white/45 outline-none backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75 sm:w-28"',
  'className="hidden w-20 rounded-lg border border-white/25 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/45 outline-none backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75 sm:block sm:w-24 sm:rounded-xl sm:py-2 sm:text-sm"'
);

// 优化搜索按钮
poiContent = poiContent.replace(
  'className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-amber-600 disabled:opacity-60"',
  'className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-medium text-white shadow-md hover:bg-amber-600 disabled:opacity-60 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"'
);

fs.writeFileSync(poiPath, poiContent, 'utf8');
console.log('PoiSearchBar.tsx updated');

console.log('Done - Layout fixes applied');
