// patch6g: 多维评分 UI（插入情绪选择器之前）
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('\u53e3\u5473')){console.log('6g skip');process.exit(0);}
const ANCHOR=`{/* \u60c5\u7eea\u6807\u7b7e */}`;
if(!c.includes(ANCHOR)){console.error('6g: anchor not found, raw:',c.includes('MOOD_PRESETS'));process.exit(1);}
const DIMS_UI=`{/* \u5b50\u7ef4\u5ea6\u8bc4\u5206 */}\r\n          <div className="mt-2 space-y-1.5">\r\n            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">\u7ec6\u5206\u8bc4\u5206\uff08\u53ef\u9009\uff09</p>\r\n            {([\r\n              { key: 'taste'  , label: '\u53e3\u5473' },\r\n              { key: 'ambiance', label: '\u73af\u5883' },\r\n              { key: 'service' , label: '\u670d\u52a1' },\r\n              { key: 'value'  , label: '\u6027\u4ef7\u6bd4' },\r\n            ] as { key: keyof typeof dims; label: string }[]).map(({ key, label }) => (\r\n              <div key={key} className="flex items-center gap-1.5">\r\n                <span className="w-10 shrink-0 text-xs text-zinc-500">{label}</span>\r\n                <div className="flex gap-0.5">\r\n                  {[1,2,3,4,5].map(n => (\r\n                    <button key={n} type="button"\r\n                      onClick={() => setDims(d => ({ ...d, [key]: d[key]===n ? 0 : n }))}\r\n                      className={dims[key]>=n ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}\r\n                    >\r\n                      <Star className={cn('h-3.5 w-3.5', dims[key]>=n ? 'fill-amber-400' : '')} />\r\n                    </button>\r\n                  ))}\r\n                </div>\r\n                {dims[key]>0 && <span className="text-[11px] text-zinc-400">{dims[key]}\u5206</span>}\r\n              </div>\r\n            ))}\r\n          </div>\r\n          `;
c=c.replace(ANCHOR, DIMS_UI+ANCHOR);
fs.writeFileSync(F,c,'utf8');
console.log('6g ok');
