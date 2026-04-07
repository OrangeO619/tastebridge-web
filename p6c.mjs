// patch6c: 添加 handleImageSelect 函数
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('handleImageSelect')){console.log('6c skip');process.exit(0);}
const OLD='  const loadPrefs = useCallback';
const FN=`  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {\r\n    const files = Array.from(e.target.files ?? []).slice(0, 3 - myImages.length);\r\n    if (!files.length) return;\r\n    setUploading(true);\r\n    try {\r\n      for (const file of files) {\r\n        const fd = new FormData();\r\n        fd.append('file', file);\r\n        const r = await fetch('/api/upload', { method: 'POST', headers: { 'x-user-id': DEV_USER_ID }, body: fd });\r\n        const d = await r.json() as { url?: string; error?: string };\r\n        if (r.ok && d.url) setMyImages(p => [...p, d.url!]);\r\n      }\r\n    } catch { /* silent */ } finally {\r\n      setUploading(false);\r\n      if (fileInputRef.current) fileInputRef.current.value = '';\r\n    }\r\n  };\r\n\r\n  const loadPrefs = useCallback`;
if(!c.includes(OLD)){console.error('6c: anchor not found');process.exit(1);}
c=c.replace(OLD,FN);
fs.writeFileSync(F,c,'utf8');
console.log('6c ok');
