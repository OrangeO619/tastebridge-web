const fs = require('fs');

const mapViewPath = 'src/features/map/components/MapView.tsx';
let c = fs.readFileSync(mapViewPath, 'utf8');

// 修改 setFitView 的条件，添加 skipFitView 检查
c = c.replace(
  `const sig = spotsGeometrySignature(spots);
    if (
      spots.length > 0 &&
      sig !== lastFitSignatureRef.current &&
      typeof map.setFitView === "function"
    ) {`,
  `const sig = spotsGeometrySignature(spots);
    // 只有在不跳过自动适配视野时才执行 setFitView
    if (
      !skipFitView &&
      spots.length > 0 &&
      sig !== lastFitSignatureRef.current &&
      typeof map.setFitView === "function"
    ) {`
);

fs.writeFileSync(mapViewPath, c, 'utf8');
console.log('Done - skipFitView condition added');
