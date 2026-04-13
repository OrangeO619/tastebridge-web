const fs = require('fs');
const p = 'src/features/map/components/MapPageClient.tsx';
let c = fs.readFileSync(p, 'utf8');

// 在 fetchSpots 的 useEffect 之后添加初始化城市视野的 useEffect
const oldCode = `  }, [fetchSpots]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(\`/api/maps/\${encodeURIComponent(user.id)}/shared\``;

const newCode = `  }, [fetchSpots]);

  // 客户端初始化时，确保地图视野与选择的城市一致
  const initialCityAppliedRef = useRef(false);
  useEffect(() => {
    if (initialCityAppliedRef.current) return;
    // 等待地图准备好后移动到选择的城市
    const timer = setTimeout(() => {
      if (mapRef.current && currentCity) {
        mapRef.current.flyTo(currentCity.center, currentCity.zoom);
        initialCityAppliedRef.current = true;
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentCity]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(\`/api/maps/\${encodeURIComponent(user.id)}/shared\``;

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Done - Initial city view fix applied');
} else {
  console.log('Pattern not found, checking alternative...');
  // 尝试另一种模式
  const alt = c.indexOf('}, [fetchSpots]);');
  if (alt !== -1) {
    console.log('Found fetchSpots effect at position:', alt);
  }
}
