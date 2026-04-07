// patch6h: 图片上传 UI（插入 textarea 前）
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('fileInputRef')&&c.includes('api/upload')&&c.includes('Camera')&&c.includes('handleImageSelect')&&c.includes('type="file"')){console.log('6h skip');process.exit(0);}
const ANCHOR='<textarea\r\n            value={myNote}';
if(!c.includes(ANCHOR)){console.error('6h: textarea anchor not found');process.exit(1);}
const IMG_UI=`<input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />\r\n          {myImages.length>0 && (\r\n            <div className="mb-1.5 flex flex-wrap gap-1.5">\r\n              {myImages.map((url,i)=>(\r\n                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg">\r\n                  <img src={url} alt="" className="h-full w-full object-cover" />\r\n                  <button type="button" onClick={()=>setMyImages(p=>p.filter((_,j)=>j!==i))}\r\n                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"\r\n                  ><X className="h-3 w-3"/></button>\r\n                </div>\r\n              ))}\r\n            </div>\r\n          )}\r\n          {myImages.length<3 && (\r\n            <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading}\r\n              className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-amber-400 hover:text-amber-600 disabled:opacity-50 dark:border-zinc-600"\r\n            ><Camera className="h-3.5 w-3.5"/>{uploading?'\u4e0a\u4f20\u4e2d\u2026':'\u6dfb\u52a0\u56fe\u7247\uff08\u6700\u591a3\u5f20\uff09'}</button>\r\n          )}\r\n          <textarea\r\n            value={myNote}`;
c=c.replace(ANCHOR,IMG_UI);
fs.writeFileSync(F,c,'utf8');
console.log('6h ok');
