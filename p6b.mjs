// patch6b: 添加 dims/myImages/uploading state + fileInputRef
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('setDims')){console.log('6b skip');process.exit(0);}
const OLD=`const [aiTagsLoading, setAiTagsLoading] = useState(false);\r\n  const [myNote`;
const NEW=`const [aiTagsLoading, setAiTagsLoading] = useState(false);\r\n  const [dims, setDims] = useState({ taste:0, ambiance:0, service:0, value:0 });\r\n  const [myImages, setMyImages] = useState<string[]>([]);\r\n  const [uploading, setUploading] = useState(false);\r\n  const fileInputRef = useRef<HTMLInputElement>(null);\r\n  const [myNote`;
if(!c.includes(OLD)){console.error('6b: anchor not found');process.exit(1);}
c=c.replace(OLD,NEW);
fs.writeFileSync(F,c,'utf8');
console.log('6b ok');
