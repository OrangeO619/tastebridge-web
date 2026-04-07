// patch6d: POST body 加 dimensions + images
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('dimensions:')){console.log('6d skip');process.exit(0);}
const OLD=`tags: myTags,\r\n          note:`;
const NEW=`tags: myTags,\r\n          dimensions: (dims.taste||dims.ambiance||dims.service||dims.value) ? dims : undefined,\r\n          images: myImages,\r\n          note:`;
if(!c.includes(OLD)){console.error('6d: anchor not found');process.exit(1);}
c=c.replace(OLD,NEW);
fs.writeFileSync(F,c,'utf8');
console.log('6d ok');
