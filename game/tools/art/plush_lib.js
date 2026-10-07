// ちりめん細工のぬいぐるみ層の描画ヘルパー（ブラウザの Canvas 2D で動く。build_plush.mjs が読み込む）
// 座標は論理画素（1論理画素=4px）。
// 手作りちりめん細工のぬいぐるみ風。座標は論理画素（1論理画素=4px）。ctx は scale 済みで渡す。
const K={k:'#ebdfc3',n:'#c9b88f',b:'#2b4a6f',B:'#1f3752',l:'#3f6590',h:'#6f9bb8',r:'#b33a2c',R:'#8a2c22',y:'#d1aa36',Y:'#a4852b',Z:'#e6cd6e',c:'#3a302b'};
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function lg(ctx,x0,y0,x1,y1,st){const g=ctx.createLinearGradient(x0,y0,x1,y1);st.forEach(([o,c])=>g.addColorStop(o,c));return g;}
function rg(ctx,x,y,r0,r1,st,cx2,cy2){const g=ctx.createRadialGradient(x,y,r0,cx2??x,cy2??y,r1);st.forEach(([o,c])=>g.addColorStop(o,c));return g;}
function RR(x,y,w,h,r){const p=new Path2D();p.roundRect(x,y,w,h,r);return p;}
// ふくらんだ面: 塗り＋内側の縁の影＋しぼ
function puff(ctx,path,fill,bb,o={}){ctx.save();
 if(o.drop){ctx.shadowColor='rgba(15,10,10,0.38)';ctx.shadowBlur=o.drop[0];ctx.shadowOffsetX=o.drop[1];ctx.shadowOffsetY=o.drop[2];}
 ctx.fillStyle=fill;ctx.fill(path);ctx.restore();
 ctx.save();ctx.clip(path);
 // 縁の内影: 光は左上から。右下ほど濃く、左上は薄い（一様な内影にしない）
 ctx.shadowColor='rgba(10,5,5,0.7)';ctx.shadowBlur=o.rim??16;
 ctx.strokeStyle=lg(ctx,bb.x,bb.y,bb.x+bb.w,bb.y+bb.h,[[0,'rgba(10,5,5,0.10)'],[0.5,'rgba(10,5,5,0.32)'],[1,'rgba(10,5,5,0.78)']]);ctx.lineWidth=o.rimW??1.2;ctx.stroke(path);
 ctx.shadowBlur=0;ctx.shadowColor='transparent';
 // 綿の片寄り（手置きの暗いふくらみ）
 (o.lumps||[]).forEach(([x,y,r,a])=>{const g=rg(ctx,x,y,0.1,r,[[0,'rgba(20,10,5,'+a+')'],[1,'rgba(20,10,5,0)']]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();});
 // 毛羽・しぼ: 面ごとに向きが違い、縫い目と縁に寄せる（中央は薄い）
 const R=rng(o.seed||3);const dens=o.shiboDensity??1.0;const n=Math.round(bb.w*bb.h*dens*2.2);const dir=o.dir??Math.PI/2;
 for(let i=0;i<n;i++){const x=bb.x+R()*bb.w,y=bb.y+R()*bb.h;
  const e=Math.min(Math.min(x-bb.x,bb.x+bb.w-x)/(bb.w/2),Math.min(y-bb.y,bb.y+bb.h-y)/(bb.h/2));
  if(e>0.5||R()>Math.pow(1-e/0.5,2.4))continue;
  const a=dir+(R()-.5)*0.55,thick=R()<0.2,L=(0.5+R()*0.9)*(thick?1.3:0.8);ctx.strokeStyle=R()<0.6?'rgba(0,0,0,'+(thick?0.14:0.09)+')':'rgba(255,255,255,0.07)';ctx.lineWidth=thick?0.17+R()*0.06:0.05+R()*0.05;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a)*L*0.5+(R()-.5)*0.3,y+Math.sin(a)*L*0.5+(R()-.5)*0.3,x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();}
 ctx.restore();}
// 縫い目: 縫い込まれた影＋盛り上がった糸＋糸の艶
function stitch(ctx,pts,color,o={}){const R=rng(o.seed||5);const w=o.w??0.55,dmin=o.dmin??2,dmax=o.dmax??3.4,gmin=o.gmin??0.9,gmax=o.gmax??1.5;
 const segs=[];for(let i=0;i<pts.length-1;i++)segs.push([pts[i],pts[i+1]]);
 let total=0;const lens=segs.map(([a,b])=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]);total+=l;return l;});
 const at=(d)=>{let acc=0;for(let i=0;i<segs.length;i++){if(d<=acc+lens[i]||i===segs.length-1){const t=Math.min(1,(d-acc)/lens[i]);const [a,b]=segs[i];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}acc+=lens[i];}};
 let d=o.start??0;const dashes=[];while(d<total){let L=dmin+R()*(dmax-dmin);if(total-d<L+0.6)L=total-d;if(d<2||total-d<2.5)L=Math.min(L,1.6);dashes.push([d,Math.min(total,d+L)]);d+=L+gmin+R()*(gmax-gmin);}
 ctx.save();ctx.lineCap='round';
 dashes.forEach(([d0,d1])=>{const a=at(d0),b=at(d1);
  ctx.strokeStyle='rgba(20,10,5,0.5)';ctx.lineWidth=w*1.15;ctx.shadowColor='rgba(0,0,0,0.35)';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(a[0]+0.12,a[1]+0.2);ctx.lineTo(b[0]+0.12,b[1]+0.2);ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowColor='transparent';
  ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  ctx.strokeStyle='rgba(255,250,235,0.2)';ctx.lineWidth=w*0.26;ctx.beginPath();ctx.moveTo(a[0]-0.06,a[1]-0.1);ctx.lineTo(b[0]-0.06,b[1]-0.1);ctx.stroke();});
 ctx.restore();}
function plus(ctx,x,y,color,seed,rot=0){const R=rng(seed);const rot2=rot,l1=1.1+R()*0.3,l2=1.0+R()*0.35;
 const d=(a,b)=>{ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(20,10,5,.5)';ctx.lineWidth=0.62;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(a[0]+0.1,a[1]+0.18);ctx.lineTo(b[0]+0.1,b[1]+0.18);ctx.stroke();ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.strokeStyle=color;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.restore();};
 const c=Math.cos(rot2),sn=Math.sin(rot2);d([x-l1*c,y-l1*sn],[x+l1*c,y+l1*sn]);d([x+l2*sn*(-1),y+l2*c],[x-l2*sn*(-1),y-l2*c]);}
// 縫い込まれた継ぎ目の影
function seamShadow(ctx,path,a=0.5,w=0.5){ctx.save();ctx.strokeStyle='rgba(8,4,4,'+a+')';ctx.lineWidth=w;ctx.shadowColor='rgba(8,4,4,.6)';ctx.shadowBlur=5;ctx.stroke(path);ctx.restore();}
function french(ctx,x,y,r,color){ctx.save();ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.shadowOffsetY=0.15*4;ctx.fillStyle=rg(ctx,x-r*0.3,y-r*0.3,0.05,r*1.2,[[0,'rgba(255,245,200,.8)'],[0.3,color],[1,'rgba(40,20,0,.55)']],x,y);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.restore();}
// 刺繍の目: サテンステッチ（糸の艶の帯つき）
function satin(ctx,cx,cy,rx,ry,rot,color,seed,shape){const p=new Path2D();
 if(shape==='moon5'){p.moveTo(-rx,ry*0.1);p.quadraticCurveTo(-rx*0.9,-ry*1.55,0,-ry*1.4);p.quadraticCurveTo(rx*0.9,-ry*1.55,rx,ry*0.1);p.quadraticCurveTo(rx*0.8,ry*1.15,0,ry*1.2);p.quadraticCurveTo(-rx*0.8,ry*1.15,-rx,ry*0.1);}
 else if(shape==='moon'){p.moveTo(-rx,-ry*0.3);p.quadraticCurveTo(0,-ry*1.0,rx,-ry*0.3);p.quadraticCurveTo(rx*0.9,ry*1.1,0,ry*1.15);p.quadraticCurveTo(-rx*0.9,ry*1.1,-rx,-ry*0.3);}
 else p.ellipse(0,0,rx,ry,0,0,7);
 ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);
 ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=3;ctx.shadowOffsetY=0.18*4;ctx.fillStyle=color;ctx.fill(p);ctx.shadowColor='transparent';ctx.shadowBlur=0;
 ctx.clip(p);const R=rng(seed);
 if(shape==='moon'||shape==='moon5'){ // 糸の向き（横）の艶は2本の帯だけ
  const R2=rng(seed+7);for(let y=-ry*1.1;y<=ry*1.2;y+=0.2){ctx.strokeStyle='rgba(0,0,0,'+(0.12+R2()*0.12)+')';ctx.lineWidth=0.07;ctx.beginPath();ctx.moveTo(-rx*1.2,y);ctx.lineTo(rx*1.2,y+0.04);ctx.stroke();}
  ctx.strokeStyle='rgba(235,223,195,0.26)';ctx.lineWidth=0.13;ctx.beginPath();ctx.moveTo(-rx*0.8,-ry*0.55);ctx.quadraticCurveTo(0,-ry*0.75,rx*0.8,-ry*0.55);ctx.stroke();
  ctx.strokeStyle='rgba(235,223,195,0.15)';ctx.lineWidth=0.1;ctx.beginPath();ctx.moveTo(-rx*0.6,ry*0.25);ctx.quadraticCurveTo(0,ry*0.15,rx*0.6,ry*0.25);ctx.stroke();
 }else{
  for(let x=-rx;x<=rx;x+=0.16){ctx.strokeStyle=R()<0.5?'rgba(255,235,210,0.16)':'rgba(0,0,0,0.3)';ctx.lineWidth=0.09;ctx.beginPath();ctx.moveTo(x-0.35,-ry*1.3);ctx.lineTo(x+0.35,ry*1.3);ctx.stroke();}
  const g=lg(ctx,-rx,-ry,rx*0.9,ry*0.4,[[0,'rgba(255,255,255,0)'],[0.4,'rgba(255,248,235,0.0)'],[0.52,'rgba(255,248,235,0.42)'],[0.64,'rgba(255,248,235,0)'],[1,'rgba(255,255,255,0)']]);ctx.fillStyle=g;ctx.fillRect(-rx*1.2,-ry*1.3,rx*2.4,ry*2.6);}
 ctx.restore();}
function strandLine(ctx,pts,color,w,seed,knotStart,knotEnd){ // サテンステッチ: 密な糸の筋の束＋玉止め
 const R=rng(seed);const [p0,c,p1]=pts;const N=18;const P=[];for(let i=0;i<=N;i++){const t=i/N;P.push([(1-t)*(1-t)*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0],(1-t)*(1-t)*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]]);}
 const nrm=P.map((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(N,i+1)];const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[-dy/l,dx/l];});
 ctx.save();ctx.lineCap='round';
 ctx.strokeStyle='rgba(20,8,4,.5)';ctx.lineWidth=w*1.15;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=3;ctx.beginPath();P.forEach((p,i)=>{i?ctx.lineTo(p[0]+0.1,p[1]+0.18):ctx.moveTo(p[0]+0.1,p[1]+0.18);});ctx.stroke();ctx.shadowBlur=0;ctx.shadowColor='transparent';
 const n=Math.max(3,Math.round(w/0.085));
 for(let k=0;k<n;k++){const off=(k-(n-1)/2)*(w/n);const s0=Math.floor(R()*2),s1=N-Math.floor(R()*2);
  const tint=R();ctx.strokeStyle=tint<0.33?'rgba(0,0,0,0.22)':tint<0.66?'rgba(255,245,230,0.18)':'rgba(0,0,0,0)';
  ctx.beginPath();for(let i=s0;i<=s1;i++){const p=P[i],m=nrm[i];const x=p[0]+m[0]*off,y=p[1]+m[1]*off;i===s0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.strokeStyle=color;ctx.lineWidth=w/n*1.25;ctx.stroke();
  if(tint>=0.33){ctx.strokeStyle=tint<0.66?'rgba(0,0,0,0.2)':'rgba(255,245,230,0.16)';ctx.lineWidth=w/n*0.6;ctx.stroke();}}
 ctx.restore();
 if(knotStart)french(ctx,p0[0],p0[1],w*0.62,color);if(knotEnd)french(ctx,p1[0],p1[1],w*0.5,color);}
function threadLine(ctx,pts,color,w,seed){ // 刺繍の弧（サテンの線）
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 const path=new Path2D();path.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i+=2)path.quadraticCurveTo(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);
 ctx.strokeStyle='rgba(20,8,4,.5)';ctx.lineWidth=w*1.2;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=3;ctx.translate(0.1,0.18);ctx.stroke(path);ctx.translate(-0.1,-0.18);ctx.shadowBlur=0;ctx.shadowColor='transparent';
 ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke(path);ctx.strokeStyle='rgba(255,245,230,.4)';ctx.lineWidth=w*0.28;ctx.translate(-0.07,-0.12);ctx.stroke(path);ctx.restore();}

// ================= 小物（インタラクト物）もぬいぐるみ =================
function yarnBall(ctx,cx,cy,r,seed){const p=new Path2D();p.arc(cx,cy,r,0,7);
 puff(ctx,p,rg(ctx,cx-r*0.35,cy-r*0.4,r*0.1,r*1.15,[[0,'#e6c85a'],[0.45,K.y],[1,'#7a5e18']],cx,cy),{x:cx-r,y:cy-r,w:2*r,h:2*r},{drop:[10,0.3*4,0.9*4],seed:seed||9,rim:9,rimW:r*0.18,shiboDensity:.4});
 ctx.save();ctx.clip(p);ctx.lineCap='round';const R=rng(seed||9);
 for(let i=0;i<9;i++){const a=-0.9+i*0.34+(R()-.5)*0.1;ctx.strokeStyle=i%2?'rgba(110,80,12,.5)':'rgba(255,240,170,.13)';ctx.lineWidth=r*0.09;ctx.beginPath();ctx.ellipse(cx,cy,r*1.15,r*(0.35+0.5*R()),a,0.2,Math.PI*1.3);ctx.stroke();}
 ctx.restore();
 threadLine(ctx,[[cx+r*0.7,cy+r*0.7],[cx+r*1.5,cy+r*0.8],[cx+r*1.9,cy+r*1.3]],K.y,r*0.13,(seed||9)+1);}
function bow(ctx,cx,cy,s){ // 茜の結び玉（蝶結び）
 const loop=(sx)=>{const p=new Path2D();p.moveTo(cx,cy);p.bezierCurveTo(cx+sx*s*1.2,cy-s*1.6,cx+sx*s*3.6,cy-s*1.6,cx+sx*s*3.4,cy+s*0.2);p.bezierCurveTo(cx+sx*s*3.2,cy+s*1.6,cx+sx*s*1.2,cy+s*1.2,cx,cy);return p;};
 [-1,1].forEach((sx,i)=>{const p=loop(sx);puff(ctx,p,lg(ctx,0,cy-s*1.6,0,cy+s*1.4,[[0,'#d8554a'],[0.5,K.r],[1,'#7a241b']]),{x:cx-s*4,y:cy-s*2,w:s*8,h:s*4},{drop:[8,0.2*4,0.6*4],seed:20+i,rim:7,rimW:s*0.3,shiboDensity:2});});
 [[ -1,s*2.4],[1,s*2.4]].forEach(([sx,L],i)=>{const t=new Path2D();t.moveTo(cx,cy+s*0.2);t.quadraticCurveTo(cx+sx*s*1.2,cy+s*2,cx+sx*s*1.6,cy+L+s*1.4);t.lineTo(cx+sx*s*0.6,cy+L+s*1.1);t.quadraticCurveTo(cx+sx*s*0.4,cy+s*1.6,cx,cy+s*0.2);puff(ctx,t,lg(ctx,0,cy,0,cy+L+s,[[0,K.r],[1,'#6f2018']]),{x:cx-s*2,y:cy,w:s*4,h:L+s},{seed:30+i,rim:5,rimW:s*0.3});});
 const kn=new Path2D();kn.ellipse(cx,cy,s*0.95,s*0.8,0,0,7);puff(ctx,kn,rg(ctx,cx-s*0.3,cy-s*0.3,0.1,s*1.2,[[0,'#e06a5c'],[0.5,K.r],[1,'#6f2018']],cx,cy),{x:cx-s,y:cy-s,w:s*2,h:s*2},{drop:[6,0.1*4,0.4*4],seed:35,rim:5,rimW:s*0.3});}
// 接地影: 藍濃の半透明。背景の段差（1論理画素）に合わせて階段状に切る
function stepShadow(ctx,cx,y,rx,rows,a,clip){ctx.save();if(clip){ctx.beginPath();ctx.rect(clip[0],clip[1],clip[2],clip[3]);ctx.clip();}
 ctx.fillStyle='rgba(20,36,60,'+a+')';for(let i=0;i<rows;i++){const w=Math.round(rx*2*Math.sqrt(1-Math.pow(i/rows,2))*0.5)*2;ctx.fillRect(Math.round(cx-w/2),Math.round(y)+i,w,1);}ctx.restore();}
