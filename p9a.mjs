// p9a: SpotBottomCard 多用户视图
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('profilesMap')){console.log('9a skip');process.exit(0);}

// 1. 加 profilesMap state
const STATE_ANCHOR='const [saving, setSaving] = useState(false);';
if(!c.includes(STATE_ANCHOR)){console.error('9a: state anchor not found');process.exit(1);}
c=c.replace(STATE_ANCHOR,
  'const [profilesMap, setProfilesMap] = useState<Record<string,{displayName:string;avatarUrl:string|null}>>({});\r\n  const [saving, setSaving] = useState(false);'
);

// 2. 在 loadPrefs 设置 prefs 后，批量拉 profiles
const PREFS_SET='setPrefs(data.prefs ?? []);';
if(!c.includes(PREFS_SET)){console.error('9a: prefs set anchor not found');process.exit(1);}
c=c.replace(PREFS_SET,
  `setPrefs(data.prefs ?? []);
      // 批量拉取用户 profiles
      const ids=(data.prefs??[]).map((p)=>p.userId).filter(Boolean);
      if(ids.length>0){
        fetch('/api/profiles?ids='+ids.join(','))
          .then(r=>r.json())
          .then((d)=>{ setProfilesMap((d as {profiles?:Record<string,{displayName:string;avatarUrl:string|null}>}).profiles??{}); })
          .catch(()=>{});
      }`
);

// 3. 替换 pref 列表中的用户显示
const OLD_USER=`<span className="font-medium text-zinc-800 dark:text-zinc-200">\r\n                      {formatUserLabel(p.userId)}\r\n                    </span>`;
const NEW_USER=`<span className="flex items-center gap-1.5">\r\n                      {profilesMap[p.userId]?.avatarUrl\r\n                        ? <img src={profilesMap[p.userId].avatarUrl!} alt="" className="h-4 w-4 rounded-full object-cover"/>\r\n                        : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">{(profilesMap[p.userId]?.displayName??formatUserLabel(p.userId)).slice(0,1).toUpperCase()}</span>\r\n                      }\r\n                      <span className="font-medium text-zinc-800 dark:text-zinc-200">\r\n                        {p.userId===userId?'你':(profilesMap[p.userId]?.displayName??formatUserLabel(p.userId))}\r\n                      </span>\r\n                      {p.userId===userId&&<span className="rounded-full bg-amber-100 px-1 py-0.5 text-[9px] text-amber-600">我</span>}\r\n                    </span>`;
if(!c.includes(OLD_USER)){console.error('9a: user display anchor not found');process.exit(1);}
c=c.replace(OLD_USER,NEW_USER);

fs.writeFileSync(F,c,'utf8');
console.log('9a ok');
