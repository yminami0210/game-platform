import fs from 'fs'; import {tsugi, POSE_GLIDE, POSE_RUN, C, resetUid} from './lib.mjs'; import {png} from './render.mjs';
const OUT='/home/user/game-platform/studio/characters/tsugi/final/';
// portraits
const P=[['portrait',18,'normal',{tvec:[.2,1],sway:1}],['portrait-happy',16,'smile',{sleeve:{out:28,yaw:20},tvec:[.5,.8],sway:3,dy:-2}],['portrait-worried',20,'worry',{sleeve:{out:-3,yaw:40},tvec:[-.2,1],sway:-2,lean:-2}]];
for(const [n,d,e,p] of P){ resetUid(900);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="830" viewBox="0 0 720 830"><g transform="translate(360,816) scale(6.8) translate(0,-100)">${tsugi(d,e,p)}</g></svg>`;
 fs.writeFileSync(n+'.svg',svg); await png(n+'.svg',OUT+n+'.png',720,830,true); }
// silhouette
const FONT=`'IPAPGothic','IPAGothic','Noto Sans CJK JP',sans-serif`;
let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="900" viewBox="0 0 1800 900"><filter id="sil" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 .17  0 0 0 0 .14  0 0 0 0 .12  0 0 0 1 0"/></filter><rect width="1800" height="900" fill="#e4dac2"/>`;
[[0,'正面',{},'normal',300],[90,'横',{},'normal',900],[22,'ジャンプ（袖をひらく）',POSE_GLIDE,'normal',1500]].forEach(([d,l,p,e,cx])=>{ resetUid(1000+cx);
 s+=`<path d="M${cx-250},820H${cx+250}" stroke="#2b2420" stroke-opacity=".3" stroke-dasharray="8 8"/><g filter="url(#sil)" transform="translate(${cx},820) scale(6.4) translate(0,-100)">${tsugi(d,e,p)}</g><text x="${cx}" y="870" font-family="${FONT}" font-size="30" text-anchor="middle" fill="#2b2420">${l}</text>`; });
s+='</svg>'; fs.writeFileSync('silhouette.svg',s); await png('silhouette.svg',OUT+'silhouette.png',1800,900);
