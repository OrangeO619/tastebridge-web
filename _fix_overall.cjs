const fs = require('fs');
const p = 'src/features/map/components/SpotBottomCard.tsx';
let c = fs.readFileSync(p, 'utf8');

// 修改喜爱值范围从 1-10 到 1-5
c = c.replace(/min=\{1\} max=\{10\}/g, 'min={1} max={5}');
c = c.replace(/<span>1<\/span><span>10<\/span>/g, '<span>1</span><span>5</span>');

fs.writeFileSync(p, c, 'utf8');
console.log('Done');
