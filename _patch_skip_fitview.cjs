const fs = require('fs');

// 修改 MapView.tsx - 添加 skipFitView prop
const mapViewPath = 'src/features/map/components/MapView.tsx';
let mapViewContent = fs.readFileSync(mapViewPath, 'utf8');

// 1. 在 MapViewProps 中添加 skipFitView 属性
mapViewContent = mapViewContent.replace(
  'type MapViewProps = {\n  spots?: Spot[];\n  /** 当前选中的点位，用于高亮标记 */\n  selectedSpotId?: string | null;\n  /** 点击标记选中；点击空白地图传 null */\n  onSpotSelect?: (spot: Spot | null) => void;\n  /** 减少动效模式 */\n  reduceMotion?: boolean;\n  /** 初始中心点 */\n  initialCenter?: [number, number];\n  /** 初始缩放级别 */\n  initialZoom?: number;\n  className?: string;\n};',
  'type MapViewProps = {\n  spots?: Spot[];\n  /** 当前选中的点位，用于高亮标记 */\n  selectedSpotId?: string | null;\n  /** 点击标记选中；点击空白地图传 null */\n  onSpotSelect?: (spot: Spot | null) => void;\n  /** 减少动效模式 */\n  reduceMotion?: boolean;\n  /** 初始中心点 */\n  initialCenter?: [number, number];\n  /** 初始缩放级别 */\n  initialZoom?: number;\n  /** 跳过自动适配视野（当用户选择了特定城市时使用） */\n  skipFitView?: boolean;\n  className?: string;\n};'
);

// 2. 在函数参数中解构 skipFitView
mapViewContent = mapViewContent.replace(
  'export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({\n  spots = [],\n  selectedSpotId = null,\n  onSpotSelect,\n  reduceMotion = false,\n  initialCenter,\n  initialZoom,\n  className,\n}, ref)',
  'export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({\n  spots = [],\n  selectedSpotId = null,\n  onSpotSelect,\n  reduceMotion = false,\n  initialCenter,\n  initialZoom,\n  skipFitView = false,\n  className,\n}, ref)'
);

// 3. 修改 setFitView 的条件，添加 skipFitView 检查
mapViewContent = mapViewContent.replace(
  `const sig = spotsGeometrySignature(spots);
    if (
      spots.length > 0 &&
      sig !== lastFitSignatureRef.current &&
      typeof map.setFitView === "function"
    ) {
      lastFitSignatureRef.current = sig;
      try {
        map.setFitView(markersRef.current, false, [56, 48, 200, 48]);
      } catch {
        const f = spots[0];
        map.setZoomAndCenter(14, [f.location.lng, f.location.lat]);
      }
    }`,
  `const sig = spotsGeometrySignature(spots);
    // 只有在不跳过自动适配视野时才执行 setFitView
    if (
      !skipFitView &&
      spots.length > 0 &&
      sig !== lastFitSignatureRef.current &&
      typeof map.setFitView === "function"
    ) {
      lastFitSignatureRef.current = sig;
      try {
        map.setFitView(markersRef.current, false, [56, 48, 200, 48]);
      } catch {
        const f = spots[0];
        map.setZoomAndCenter(14, [f.location.lng, f.location.lat]);
      }
    }`
);

// 4. 更新 useEffect 依赖数组
mapViewContent = mapViewContent.replace(
  '}, [mapReady, spots, selectedSpotId, setupIntersectionObserver]);',
  '}, [mapReady, spots, selectedSpotId, setupIntersectionObserver, skipFitView]);'
);

fs.writeFileSync(mapViewPath, mapViewContent, 'utf8');
console.log('MapView.tsx updated');

// 修改 MapPageClient.tsx - 传递 skipFitView prop
const mapPagePath = 'src/features/map/components/MapPageClient.tsx';
let mapPageContent = fs.readFileSync(mapPagePath, 'utf8');

// 添加 skipFitView 状态
mapPageContent = mapPageContent.replace(
  'const initialCityAppliedRef = useRef(false);',
  'const initialCityAppliedRef = useRef(false);\n  const [skipFitView, setSkipFitView] = useState(true); // 初始时跳过自动适配，等待城市视野设置完成'
);

// 在初始化城市视野后设置 skipFitView 为 false（允许后续的 fitView）
mapPageContent = mapPageContent.replace(
  `// 客户端初始化时，确保地图视野与选择的城市一致
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
  }, [currentCity]);`,
  `// 客户端初始化时，确保地图视野与选择的城市一致
  const initialCityAppliedRef = useRef(false);
  const [skipFitView, setSkipFitView] = useState(true); // 初始时跳过自动适配，等待城市视野设置完成
  useEffect(() => {
    if (initialCityAppliedRef.current) return;
    // 等待地图准备好后移动到选择的城市
    const timer = setTimeout(() => {
      if (mapRef.current && currentCity) {
        mapRef.current.flyTo(currentCity.center, currentCity.zoom);
        initialCityAppliedRef.current = true;
        // 初始化完成后，保持 skipFitView 为 true，只有用户切换到"全部图层"时才允许 fitView
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentCity]);`
);

// 传递 skipFitView 给 MapView
mapPageContent = mapPageContent.replace(
  '<MapView ref={mapRef} spots={spots} selectedSpotId={selectedSpot?.id ?? null} onSpotSelect={handleSpotSelect} reduceMotion={reduceMotion} initialCenter={currentCity.center} initialZoom={currentCity.zoom} className="h-full w-full flex-1" />',
  '<MapView ref={mapRef} spots={spots} selectedSpotId={selectedSpot?.id ?? null} onSpotSelect={handleSpotSelect} reduceMotion={reduceMotion} initialCenter={currentCity.center} initialZoom={currentCity.zoom} skipFitView={skipFitView} className="h-full w-full flex-1" />'
);

fs.writeFileSync(mapPagePath, mapPageContent, 'utf8');
console.log('MapPageClient.tsx updated');

console.log('Done - Skip fit view fix applied');
