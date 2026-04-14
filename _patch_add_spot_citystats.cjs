const fs = require('fs');
const p = 'src/features/map/components/MapPageClient.tsx';
let c = fs.readFileSync(p, 'utf8');

// 修改 AddSpotSheet 的 onSuccess 回调，添加 includeCityStats: true
c = c.replace(
  'onSuccess={async () => { setActiveFilters(null); setSemanticBaseSummary(null); await fetchSpots(null); }}',
  'onSuccess={async () => { setActiveFilters(null); setSemanticBaseSummary(null); await fetchSpots(null, { includeCityStats: true }); }}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done - AddSpotSheet onSuccess now refreshes cityStats');
