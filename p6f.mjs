// patch6f: 营业状态显示
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('isOpenNow(spot')){console.log('6f skip');process.exit(0);}
// find businessHours block
const idx=c.indexOf('spot.businessHours ? (');
if(idx<0){console.error('6f: anchor not found');process.exit(1);}
// find the closing ) : null after it
const end=c.indexOf(') : null',idx);
if(end<0){console.error('6f: end not found');process.exit(1);}
const OLD=c.slice(idx,end+8);
const NEW=`spot.businessHours ? (\r\n          <div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">\r\n            <span className="font-medium text-zinc-800 dark:text-zinc-200">\u8425\u4e1a\u65f6\u95f4</span>\r\n            <span>{spot.businessHours}</span>\r\n            {isOpenNow(spot.businessHours)==='open' && (\r\n              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">\u8425\u4e1a\u4e2d</span>\r\n            )}\r\n            {isOpenNow(spot.businessHours)==='closed' && (\r\n              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">\u5df2\u5173\u95ed</span>\r\n            )}\r\n          </div>\r\n        ) : null`;
c=c.replace(OLD,NEW);
fs.writeFileSync(F,c,'utf8');
console.log('6f ok');
