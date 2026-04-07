// p7b: MapPageClient — URL params + invitedBy state
import fs from 'fs';
const F='src/features/map/components/MapPageClient.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('invitedBy')){console.log('7b skip');process.exit(0);}

// 1. Add invitedBy state
c=c.replace(
  'const [prefGuideSpotId, setPrefGuideSpotId] = useState<string | null>(null);',
  'const [prefGuideSpotId, setPrefGuideSpotId] = useState<string | null>(null);\r\n  const [invitedBy, setInvitedBy] = useState<string | null>(null);'
);

// 2. Add useEffect to read URL params when spots load
const HOOK=`  useEffect(() => {\r\n    if (spots.length === 0) return;\r\n    const params = new URLSearchParams(window.location.search);\r\n    const sid = params.get('spotId');\r\n    const ref = params.get('ref');\r\n    if (sid) {\r\n      const found = spots.find((s) => s.id === sid);\r\n      if (found) { setSelectedSpot(found); if (ref) setInvitedBy(ref); }\r\n    }\r\n  }, [spots]);\r\n\r\n  `;
c=c.replace('  const handleSpotSelect',HOOK+'  const handleSpotSelect');

// 3. Reset invitedBy on close
c=c.replace(
  'setSelectedSpot(null);\r\n    setPrefGuideSpotId(null);\r\n  }, []);',
  'setSelectedSpot(null);\r\n    setPrefGuideSpotId(null);\r\n    setInvitedBy(null);\r\n  }, []);'
);

// 4. Pass invitedBy to SpotBottomCard
c=c.replace(
  'showPrefGuide={prefGuideSpotId === selectedSpot.id}\r\n            onDismissPrefGuide={() => setPrefGuideSpotId(null)}\r\n            className="max-w-lg"',
  'showPrefGuide={prefGuideSpotId === selectedSpot.id}\r\n            onDismissPrefGuide={() => setPrefGuideSpotId(null)}\r\n            invitedBy={invitedBy ?? undefined}\r\n            className="max-w-lg"'
);

fs.writeFileSync(F,c,'utf8');
console.log('7b ok');
