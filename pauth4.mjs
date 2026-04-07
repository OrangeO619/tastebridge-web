import fs from 'fs';
const F='src/lib/auth/AuthProvider.tsx';
let c=fs.readFileSync(F,'utf8');
c=c.replace(
  `sb.auth.getSession().then((result) => { const session = result.data.session;
      setUser(session?.user ?? null);
      setLoading(false);
    });`,
  `void sb.auth.getSession().then((r) => {
      setUser(r.data.session?.user ?? null);
      setLoading(false);
    });`
);
fs.writeFileSync(F,c,'utf8');
console.log('content:',fs.readFileSync(F,'utf8').slice(1200,1500));
