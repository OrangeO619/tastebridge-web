const fs = require('fs');
const p = 'src/app/profile/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 将店名从普通文本改为可点击链接，跳转到地图页面并显示该店铺
c = c.replace(
  '<h2 className="truncate text-sm font-semibold text-white">{spot?.name??"未知店铺"}</h2>',
  '{spot?.id ? <a href={`/?spotId=${spot.id}`} className="truncate text-sm font-semibold text-white hover:text-amber-400 hover:underline">{spot.name}</a> : <span className="truncate text-sm font-semibold text-white">未知店铺</span>}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done - Profile page spot name now links to map');
