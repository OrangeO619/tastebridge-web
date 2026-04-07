import fs from 'fs';
const F='src/lib/auth/AuthProvider.tsx';
let c=fs.readFileSync(F,'utf8');
c=c.replace(
  'sb.auth.getSession().then(({ data: { session } }) => {',
  'sb.auth.getSession().then(({ data }) => { const session = data.session;'
);
fs.writeFileSync(F,c,'utf8');
console.log('ok');
