const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/map/components/MapPageClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace line 264 - add onSpotUpdated callback
const oldLine = `      {selectedSpot && !addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"><SpotBottomCard spot={selectedSpot} onClose={handleCloseCard} showPrefGuide={prefGuideSpotId === selectedSpot.id} onDismissPrefGuide={() => setPrefGuideSpotId(null)} invitedBy={invitedBy ?? undefined} className="max-w-lg" /></div> : null}`;

const newLine = `      {selectedSpot && !addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"><SpotBottomCard spot={selectedSpot} onClose={handleCloseCard} showPrefGuide={prefGuideSpotId === selectedSpot.id} onDismissPrefGuide={() => setPrefGuideSpotId(null)} invitedBy={invitedBy ?? undefined} onSpotUpdated={(nextSpot) => { setSelectedSpot(nextSpot); setSpots((prev) => prev.map((s) => s.id === nextSpot.id ? { ...s, ...nextSpot } : s)); }} className="max-w-lg" /></div> : null}`;

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ MapPageClient.tsx patched successfully - added onSpotUpdated callback');
} else {
  console.log('❌ Could not find the target line to patch');
  console.log('Looking for:', oldLine.substring(0, 100) + '...');
}
