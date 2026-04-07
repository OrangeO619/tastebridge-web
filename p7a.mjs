// p7a: SpotBottomCard — share button + invitedBy prop
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('handleShare')){console.log('7a skip');process.exit(0);}

// 1. Add Share2 to lucide import
c=c.replace('import { Camera,',"import { Camera, Share2,");

// 2. Add invitedBy to props type
c=c.replace(
  'onDismissPrefGuide?: () => void;\r\n};',
  'onDismissPrefGuide?: () => void;\r\n  /** 邀请人用户ID，由分享链接传入 */\r\n  invitedBy?: string;\r\n};'
);

// 3. Destructure invitedBy in component params
c=c.replace(
  'onDismissPrefGuide,\r\n}: SpotBottomCardProps)',
  'onDismissPrefGuide,\r\n  invitedBy,\r\n}: SpotBottomCardProps)'
);

// 4. Add shareCopied state after saving state
c=c.replace(
  'const [saving, setSaving] = useState(false);\r\n  const [saveError',
  'const [saving, setSaving] = useState(false);\r\n  const [shareCopied, setShareCopied] = useState(false);\r\n  const [saveError'
);

// 5. Add handleShare function before handleSaveMine
c=c.replace(
  'const handleSaveMine = async',
  `const handleShare = async () => {\r\n    const url = \`\${window.location.origin}/?spotId=\${spot.id}&ref=\${encodeURIComponent(DEV_USER_ID)}\`;\r\n    try {\r\n      if (navigator.share) { await navigator.share({ title: spot.name, url }); }\r\n      else { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(()=>setShareCopied(false),2000); }\r\n    } catch { /* user cancelled */ }\r\n  };\r\n\r\n  const handleSaveMine = async`
);

// 6. Add invitedBy to POST body
c=c.replace(
  'images: myImages,\r\n          note:',
  'images: myImages,\r\n          invitedBy: invitedBy ?? undefined,\r\n          note:'
);

// 7. Add share button next to X close button
c=c.replace(
  'aria-label="关闭"\r\n        >\r\n          <X className="h-5 w-5" />\r\n        </button>',
  `aria-label="关闭"\r\n        >\r\n          <X className="h-5 w-5" />\r\n        </button>\r\n        <button type="button" onClick={handleShare}\r\n          className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"\r\n          aria-label="分享"\r\n          title={shareCopied ? '链接已复制' : '分享这家店'}\r\n        >\r\n          <Share2 className={shareCopied ? 'h-5 w-5 text-amber-500' : 'h-5 w-5'} />\r\n        </button>`
);

// 8. Show invitedBy hint below user ID line
c=c.replace(
  '（登录后可换）\r\n          </p>',
  `（登录后可换）\r\n          </p>\r\n          {invitedBy && (<p className="mt-0.5 text-[11px] text-violet-600 dark:text-violet-400">由 {invitedBy.slice(0,8)} 邀请探店</p>)}`
);

fs.writeFileSync(F,c,'utf8');
console.log('7a ok');
