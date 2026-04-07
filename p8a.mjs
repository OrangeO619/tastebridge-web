// p8a: SpotBottomCard - 使用 useAuth 替换 DEV_USER_ID
import fs from 'fs';
const F='src/features/map/components/SpotBottomCard.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('useAuth')){console.log('8a skip');process.exit(0);}

// 1. 加 useAuth import
c=c.replace(
  'import { DEV_USER_ID } from "@/lib/constants/user";',
  'import { DEV_USER_ID } from "@/lib/constants/user";\r\nimport { useAuth } from "@/lib/auth/AuthProvider";'
);

// 2. 在组件开头加 userId
c=c.replace(
  'const [prefsLoading, setPrefsLoading]',
  'const { user } = useAuth();\r\n  const userId = user?.id ?? DEV_USER_ID;\r\n  const [prefsLoading, setPrefsLoading]'
);

// 3. 替换 POST body 中的 DEV_USER_ID
c=c.replace('userId: DEV_USER_ID,','userId: userId,');

// 4. 替换 handleShare 中的 DEV_USER_ID
c=c.replace(
  'ref=\${encodeURIComponent(DEV_USER_ID)}',
  'ref=\${encodeURIComponent(userId)}'
);

// 5. 替换 handleImageSelect 中的 DEV_USER_ID
c=c.replace("'x-user-id': DEV_USER_ID","'x-user-id': userId");

// 6. 替换 myPref 查找
c=c.replace('p.userId === DEV_USER_ID','p.userId === userId');

// 7. 替换 code 显示
c=c.replace('{DEV_USER_ID}','{userId}');

fs.writeFileSync(F,c,'utf8');
console.log('8a ok');
