const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/map/components/MapPageClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add reduceMotion state
content = content.replace(
  '  const [sharedOwnerId, setSharedOwnerId] = useState<string | null>(null);',
  '  const [sharedOwnerId, setSharedOwnerId] = useState<string | null>(null);\n  const [reduceMotion, setReduceMotion] = useState(() => {\n    if (typeof window !== "undefined") {\n      return window.localStorage.getItem("tb_reduce_motion") === "1";\n    }\n    return false;\n  });'
);

// 2. Update MapView to pass reduceMotion
content = content.replace(
  '<MapView spots={spots} selectedSpotId={selectedSpot?.id ?? null} onSpotSelect={handleSpotSelect} className="h-full w-full flex-1" />',
  '<MapView spots={spots} selectedSpotId={selectedSpot?.id ?? null} onSpotSelect={handleSpotSelect} reduceMotion={reduceMotion} className="h-full w-full flex-1" />'
);

// 3. Update MapLegend to pass reduceMotion and handler
content = content.replace(
  '<MapLegend />',
  '<MapLegend reduceMotion={reduceMotion} onReduceMotionChange={setReduceMotion} />'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ MapPageClient patched with reduceMotion state');
