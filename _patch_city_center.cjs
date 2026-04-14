const fs = require('fs');
const p = 'src/features/map/components/MapPageClient.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. 更新 cityStats 的类型定义
c = c.replace(
  'const [cityStats, setCityStats] = useState<Array<{ name: string; spotCount: number }>>([]);',
  'const [cityStats, setCityStats] = useState<Array<{ name: string; spotCount: number; center?: [number, number]; zoom?: number }>>([]);'
);

// 2. 更新 CitySelector 的 cities prop，使用 API 返回的 center 和 zoom
c = c.replace(
  'cities={cityStats.map(cs => ({ name: cs.name, center: getCityInfo(cs.name)?.center ?? [116.4, 39.9], zoom: getCityInfo(cs.name)?.zoom ?? 12, spotCount: cs.spotCount }))}',
  'cities={cityStats.map(cs => ({ name: cs.name, center: cs.center ?? getCityInfo(cs.name)?.center ?? [116.4, 39.9], zoom: cs.zoom ?? getCityInfo(cs.name)?.zoom ?? 12, spotCount: cs.spotCount }))}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done - MapPageClient now uses API-provided city center coordinates');
