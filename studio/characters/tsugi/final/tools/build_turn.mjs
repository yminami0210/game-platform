import fs from 'fs'; import {tsugi, topView, DIM, C, resetUid} from './lib.mjs'; import {png} from './render.mjs';
const W=2700,H=1250,S=6.2,GY=1010,X0=300,DX=400;
const FONT=`'Kaisei Decol','Shippori Mincho','IPAPGothic','IPAGothic','Noto Sans CJK JP',sans-serif`;
const T=(x,y,t,sz=26,anc='start',fill=C.sumi,op=1)=>`<text x="${x}" y="${y}" font-family="${FONT}" font-size="${sz}" fill="${fill}" text-anchor="${anc}" opacity="${op}">${t}</text>`;
let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .17  0 0 0 0 .14  0 0 0 0 .1  0 0 0 .08 0"/></filter>
<rect width="${W}" height="${H}" fill="#e4dac2"/><rect width="${W}" height="${H}" filter="url(#paper)"/>`;
s+=T(70,100,'ツギ　ターンアラウンド',60)+T(70,150,'「ツギと ほつれ島」主人公　決定版（C案 振袖の継ぎはぎ童子）　2.5頭身　全高=100（足裏から髷の頂点）',26,'start',C.sumi,.8);
// ガイド線
const gl=[[-13.5,'針の先'],[0,'髷の頂'],[9,'頭の頂'],[33.5,'目'],[47,'あご'],[62,'帯の上'],[71,'帯の下'],[88,'裾'],[100,'地面']];
const gy=v=>GY-(100-v)*S;
gl.forEach(([v,l])=>{ s+=`<path d="M${X0-200},${gy(v)}H${W-50}" stroke="${C.sumi}" stroke-width="1.6" stroke-dasharray="10 8" opacity="${v==100?.7:.32}"/>`+T(X0-212,gy(v)-6,l,22,'end',C.sumi,.85)+T(W-52,gy(v)-6,String(v),20,'end',C.sumi,.55); });
const views=[[0,'正面'],[38,'斜め前'],[90,'横'],[142,'斜め後ろ'],[180,'後ろ']];
resetUid(100);
views.forEach(([d,l],i)=>{ const cx=X0+i*DX; s+=`<g transform="translate(${cx},${GY}) scale(${S}) translate(0,-100)">${tsugi(d)}</g>`+T(cx,GY+60,l,32,'middle'); });
// 真上
{ const cx=X0+5*DX+20, cy=GY-330; s+=`<g transform="translate(${cx},${cy}) scale(${S*.95})">${topView()}</g>`+T(cx,GY+60,'真上',32,'middle')+T(cx,cy+190,'前',22,'middle',C.sumi,.7)+`<path d="M${cx},${cy+200} v16 m-6,-7 l6,8 l6,-8" stroke="${C.sumi}" fill="none" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`; 
 // 幅ガイド
 [-20,20,-28.6,28.6].forEach(x=>{ s+=`<path d="M${cx+x*S*.95},${cy-130}V${cy+130}" stroke="${C.sumi}" stroke-width="1.4" stroke-dasharray="8 8" opacity=".3"/>`; });
 s+=T(cx,cy-150,'頭の幅40・袖の外端±28.6',20,'middle',C.sumi,.7);
}
s+=T(70,H-50,'袖: 外は藍の絣・袖口の折り返しは茜・裏地は生成り（後ろ・横から見えるのは裏地）。針は髷を貫き、頭の輪郭の外へ全長の1/3以上出る。頬の縫い目は片側だけ。',22,'start',C.sumi,.8);
s+='</svg>';
fs.writeFileSync('turnaround.svg',s); await png('turnaround.svg','turnaround.png',W,H);
