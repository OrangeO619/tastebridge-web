const fs=require("fs");
const F="src/features/map/components/SpotBottomCard.tsx";
let c=fs.readFileSync(F,"utf8");
c=c.replace(".subscribe(async(s)=>",".subscribe(async(s:string)=>");
fs.writeFileSync(F,c,"utf8");
console.log("ok");
