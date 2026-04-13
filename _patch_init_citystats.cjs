const fs = require('fs');
const p = 'src/features/map/components/MapPageClient.tsx';
let c = fs.readFileSync(p, 'utf8');

// 修改初始加载时包含城市统计数据
c = c.replace(
  'await fetchSpots(null);',
  'await fetchSpots(null, { includeCityStats: true });'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done - Initial fetchSpots now includes cityStats');
