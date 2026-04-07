import fs from 'fs';
const F='src/app/profile/page.tsx';
let c=fs.readFileSync(F,'utf8');
// Fix: wrap array entries in outer []
const OLD=`const e=(["\u53e3\u5473",dims.taste],["\u73af\u5883",dims.ambiance],["\u670d\u52a1",dims.service],["\u6027\u4ef7\u6bd4",dims.value]as[string,number][]).filter`;
const NEW=`const e=([["\u53e3\u5473",dims.taste],["\u73af\u5883",dims.ambiance],["\u670d\u52a1",dims.service],["\u6027\u4ef7\u6bd4",dims.value]]as[string,number][]).filter`;
if(!c.includes(OLD)){console.error('anchor not found');process.exit(1);}
c=c.replace(OLD,NEW);
fs.writeFileSync(F,c,'utf8');
console.log('fix ok');
