import fs from 'fs'; import {tsugi, headOnly, POSE_RUN, POSE_GLIDE, C, resetUid} from './lib.mjs'; import {png} from './render.mjs';
const W=2400,H=1560;
const FONT=`'Kaisei Decol','Shippori Mincho','IPAPGothic','IPAGothic','Noto Sans CJK JP',sans-serif`;
const T=(x,y,t,sz=26,anc='start',op=1)=>`<text x="${x}" y="${y}" font-family="${FONT}" font-size="${sz}" fill="${C.sumi}" text-anchor="${anc}" opacity="${op}">${t}</text>`;
const frame=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="${C.sumi}" stroke-opacity=".45" stroke-width="2.2" stroke-dasharray="9 7"/>`;
let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .17  0 0 0 0 .14  0 0 0 0 .1  0 0 0 .08 0"/></filter>
<rect width="${W}" height="${H}" fill="#e4dac2"/><rect width="${W}" height="${H}" filter="url(#paper)"/>`;
s+=T(60,95,'ツギ　表情と決めポーズ',56)+T(2340,95,'「ツギと ほつれ島」主人公　決定版',26,'end',.8);
s+=frame(40,125,2320,640);
const ex=[['normal','ふつう'],['smile','笑う'],['surprise','驚く'],['worry','困る'],['angry','怒る'],['sleep','眠い']];
resetUid(500);
ex.forEach(([e,l],i)=>{ const cx=210+i*388, sc=7.2; const pose={tvec:[.2,1],sway:e=='worry'?-2:e=='surprise'?3:0}; if(e=='sleep')pose.tvec=[.1,1];
 s+=`<g transform="translate(${cx},${690-47*sc}) scale(${sc})">${headOnly(e=='normal'||e=='smile'?8:e=='worry'?10:e=='angry'?0:6,e,pose)}</g>`+T(cx,745,l,32,'middle'); });
s+=frame(40,800,1000,720)+frame(1060,800,1000,720)+frame(2080,800,280,720);
s+=`<g transform="translate(540,1440) scale(5.3) translate(0,-100)">${tsugi(68,'smile',POSE_RUN)}</g>`+T(540,1495,'走り出し　袖が風を受けてうしろへ流れる',28,'middle');
s+=`<g transform="translate(1560,1440) scale(5.3) translate(0,-100)">${tsugi(22,'surprise',POSE_GLIDE)}</g>`+T(1560,1495,'綿毛で滑空　袖をひらくと裏地の生成りと茜が見える',28,'middle');
const pal=[[C.ai,'本藍'],[C.hana,'縹'],[C.akane,'茜'],[C.kinari,'生成り'],[C.karashi,'芥子'],[C.sumi,'墨']];
pal.forEach(([c,n],i)=>{ s+=`<rect x="2110" y="${830+i*100}" width="64" height="64" rx="8" fill="${c}" stroke="${C.sumi}" stroke-width="2.5"/>`+T(2190,872+i*100,n,24)+T(2190,896+i*100,c,16,'start',.7); });
s+='</svg>';
fs.writeFileSync('sheet.svg',s); await png('sheet.svg','sheet.png',W,H);
