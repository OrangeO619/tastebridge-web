const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/profile/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { ArrowLeft, ImageDown, MapPin, Search, Sparkles, Star, X } from "lucide-react";',
  'import { ArrowLeft, Heart, ImageDown, MapPin, Search, Sparkles, Star, X } from "lucide-react";'
);

content = content.replace(
  '      <button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">退出</button>\n      <button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button><button onClick={openMonthlySummary} className="rounded-full bg-amber-500/25 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/35"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3"/>本月回顾</span></button>',
  '      <button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">退出</button>\n      <button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button><button onClick={openMonthlySummary} className="rounded-full bg-amber-500/25 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/35"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3"/>本月回顾</span></button><Link href="/together" className="rounded-full bg-sky-500/20 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-500/30"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3"/>共同回忆</span></Link>'
);

content = content.replace(
  '<button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button><button onClick={openMonthlySummary} className="rounded-full bg-amber-500/25 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/35"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3"/>本月回顾</span></button><Link href="/together" className="rounded-full bg-sky-500/20 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-500/30"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3"/>共同回忆</span></Link>',
  '<div className="flex items-center gap-2"><button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button><button onClick={openMonthlySummary} className="rounded-full bg-amber-500/25 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/35"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3"/>本月回顾</span></button><Link href="/together" className="rounded-full bg-sky-500/20 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-500/30"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3"/>共同回忆</span></Link></div>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Profile page patched with together entry');
