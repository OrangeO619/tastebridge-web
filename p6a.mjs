// patch6a: 添加 Camera import + isOpenNow import
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('isOpenNow')){console.log('6a skip');process.exit(0);}
c=c.replace(
  'import { MapPin, Phone, Sparkles, Star, X } from "lucide-react";',
  'import { Camera, MapPin, Phone, Sparkles, Star, X } from "lucide-react";\r\nimport { isOpenNow } from "@/lib/utils/business-hours";'
);
fs.writeFileSync(F,c,'utf8');
console.log('6a ok');
