const fs = require('fs');
const p = 'src/features/map/components/MapPageClient.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. 添加 ChevronDown, ChevronUp 图标导入
c = c.replace(
  'import { Loader2, Sparkles, X } from "lucide-react";',
  'import { ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";'
);

// 2. 添加 showAiSearch 状态
c = c.replace(
  'const [reduceMotion, setReduceMotion] = useState(() => {',
  `const [showAiSearch, setShowAiSearch] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => {`
);

// 3. 优化 header 布局 - 更紧凑的移动端样式
c = c.replace(
  '<header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex flex-col gap-2 bg-gradient-to-b from-black/55 via-black/35 to-transparent px-3 pb-2 pt-3 sm:px-4">',
  '<header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex flex-col gap-1.5 bg-gradient-to-b from-black/55 via-black/35 to-transparent px-2 pb-1.5 pt-2 sm:gap-2 sm:px-4 sm:pb-2 sm:pt-3">'
);

// 4. 优化顶部工具栏行的间距
c = c.replace(
  '<div className="flex flex-wrap items-center gap-2">',
  '<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">'
);

// 5. 优化品牌名在移动端隐藏
c = c.replace(
  '<span className="text-lg font-semibold tracking-tight text-white">TasteBridge</span>',
  '<span className="hidden text-lg font-semibold tracking-tight text-white sm:inline">TasteBridge</span>'
);

// 6. 优化用户头像按钮
c = c.replace(
  '<a href="/profile" className="flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-xs text-white/95 hover:bg-black/55">',
  '<a href="/profile" className="flex items-center gap-1 rounded-full border border-white/35 bg-black/35 px-2 py-0.5 text-[11px] text-white/95 hover:bg-black/55 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">'
);

// 7. 优化头像大小
c = c.replace(
  '{avatarUrl ? <img src={avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold">{displayName.slice(0, 1).toUpperCase()}</span>}',
  '{avatarUrl ? <img src={avatarUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover sm:h-4 sm:w-4" /> : <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold sm:h-4 sm:w-4 sm:text-[9px]">{displayName.slice(0, 1).toUpperCase()}</span>}'
);

// 8. 优化退出按钮
c = c.replace(
  '<button onClick={signOut} className="max-[420px]:hidden rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 hover:bg-black/50">退出</button>',
  '<button onClick={signOut} className="hidden rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[11px] text-white/70 hover:bg-black/50 sm:block sm:px-2.5 sm:py-1 sm:text-xs">退出</button>'
);

// 9. 优化图层选择器
c = c.replace(
  'className="rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-xs text-white/90 outline-none"',
  'className="rounded-full border border-white/25 bg-black/40 px-2 py-1 text-[11px] text-white/90 outline-none sm:px-3 sm:py-1.5 sm:text-xs"'
);

// 10. 优化点位计数显示
c = c.replace(
  '{loadError ? <span className="pointer-events-auto order-2 ml-auto max-w-[45%] truncate text-xs text-amber-200 sm:order-3 sm:max-w-[28%]">{loadError}</span> : <span className="order-2 ml-auto text-xs text-white/90 sm:order-3">{layerMode === "mine" ? "我的足迹" : layerMode === "shared" ? "共享地图" : "全部图层"} · {spots.length} 个点位</span>}',
  '{loadError ? <span className="pointer-events-auto order-2 ml-auto max-w-[40%] truncate text-[10px] text-amber-200 sm:order-3 sm:max-w-[28%] sm:text-xs">{loadError}</span> : <span className="order-2 ml-auto text-[10px] text-white/90 sm:order-3 sm:text-xs"><span className="hidden sm:inline">{layerMode === "mine" ? "我的足迹" : layerMode === "shared" ? "共享地图" : "全部图层"} · </span>{spots.length} 点位</span>}'
);

// 11. 将语义搜索栏改为可折叠
const oldAiSearch = `<div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 p-2 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <input value={semanticQuery} onChange={(e) => setSemanticQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void handleSemanticSearch(); }} placeholder="语义搜索：如 适合约会的安静餐厅" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 outline-none" />
          <button onClick={() => void handleSemanticSearch()} disabled={semanticLoading || !semanticQuery.trim()} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-400 disabled:opacity-60">{semanticLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AI 搜索"}</button>
          {hasAnyFilter(activeFilters) ? <button onClick={() => void clearSemanticSearch()} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"><X className="h-3.5 w-3.5" /></button> : null}
        </div>`;

const newAiSearch = `{/* 移动端折叠的 AI 搜索栏 */}
        <div className="pointer-events-auto sm:hidden">
          <button onClick={() => setShowAiSearch(!showAiSearch)} className="flex w-full items-center justify-between rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-[11px] text-white/80">{hasAnyFilter(activeFilters) ? "已筛选" : "AI 搜索"}</span>
            </div>
            {showAiSearch ? <ChevronUp className="h-3.5 w-3.5 text-white/60" /> : <ChevronDown className="h-3.5 w-3.5 text-white/60" />}
          </button>
          {showAiSearch && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/40 p-1.5 backdrop-blur-md">
              <input value={semanticQuery} onChange={(e) => setSemanticQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void handleSemanticSearch(); }} placeholder="如：适合约会的安静餐厅" className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/45 outline-none" />
              <button onClick={() => void handleSemanticSearch()} disabled={semanticLoading || !semanticQuery.trim()} className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-400 disabled:opacity-60">{semanticLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "搜索"}</button>
              {hasAnyFilter(activeFilters) ? <button onClick={() => void clearSemanticSearch()} className="rounded-md bg-white/10 px-1.5 py-1 text-white/80 hover:bg-white/20"><X className="h-3 w-3" /></button> : null}
            </div>
          )}
        </div>
        {/* 桌面端始终显示的 AI 搜索栏 */}
        <div className="pointer-events-auto hidden items-center gap-2 rounded-xl border border-white/20 bg-black/40 p-2 backdrop-blur-md sm:flex">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <input value={semanticQuery} onChange={(e) => setSemanticQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void handleSemanticSearch(); }} placeholder="语义搜索：如 适合约会的安静餐厅" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 outline-none" />
          <button onClick={() => void handleSemanticSearch()} disabled={semanticLoading || !semanticQuery.trim()} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-400 disabled:opacity-60">{semanticLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AI 搜索"}</button>
          {hasAnyFilter(activeFilters) ? <button onClick={() => void clearSemanticSearch()} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"><X className="h-3.5 w-3.5" /></button> : null}
        </div>`;

c = c.replace(oldAiSearch, newAiSearch);

// 12. 优化共享视角提示栏
c = c.replace(
  '<div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100">',
  '<div className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] text-amber-100 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">'
);

// 13. 优化语义搜索结果提示
c = c.replace(
  '{semanticSummary ? <div className="pointer-events-auto rounded-lg bg-emerald-900/35 px-3 py-1.5 text-xs text-emerald-100">{semanticSummary}</div> : null}',
  '{semanticSummary ? <div className="pointer-events-auto rounded-lg bg-emerald-900/35 px-2 py-1 text-[11px] text-emerald-100 sm:px-3 sm:py-1.5 sm:text-xs">{semanticSummary}</div> : null}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done - Responsive layout patch applied');
