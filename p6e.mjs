// patch6e: 保存成功后重置 dims + images
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('setDims({ taste')){console.log('6e skip');process.exit(0);}
const OLD=`setAiTags([]);\r\n      onDismissPrefGuide`;
const NEW=`setAiTags([]);\r\n      setDims({ taste:0, ambiance:0, service:0, value:0 });\r\n      setMyImages([]);\r\n      onDismissPrefGuide`;
if(!c.includes(OLD)){console.error('6e: anchor not found');process.exit(1);}
c=c.replace(OLD,NEW);
fs.writeFileSync(F,c,'utf8');
console.log('6e ok');
