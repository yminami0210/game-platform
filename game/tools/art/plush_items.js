// 触れる物・ボス・弾（ぬいぐるみ層）。足もと中央 (0,0)。
function pinShot(ctx){ctx.save();ctx.lineCap='round';
 ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.9;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(-6,-3);ctx.lineTo(6.6,-3);ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle=lg(ctx,0,-3.5,0,-2.5,[[0,'#e2d6b8'],[1,'#c3b48c']]);ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(-6,-3);ctx.lineTo(6,-3);ctx.stroke();
 ctx.fillStyle='#d8cdb0';ctx.beginPath();ctx.moveTo(6,-3.5);ctx.lineTo(7.6,-3);ctx.lineTo(6,-2.5);ctx.closePath();ctx.fill();ctx.restore();
 ctx.save();ctx.strokeStyle=K.r;ctx.lineWidth=0.7;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.beginPath();ctx.ellipse(-7.4,-3,1.9,1.9,0,0,7);ctx.stroke();ctx.restore();threadLine(ctx,[[-7.4,-1.2],[-8.6,0.6],[-7.2,1.6]],K.r,0.4,611);}
function dustShot(ctx){const R=rng(621);[[0,-4,3.2],[-2.6,-2.8,2.4],[2.6,-2.6,2.5],[0.6,-6.2,2.2],[-1.2,-0.8,1.9]].forEach(([x,y,r],i)=>{const p=new Path2D();p.arc(x,y,r,0,7);puff(ctx,p,rg(ctx,x-r*0.3,y-r*0.3,0.1,r*1.2,[[0,'rgba(255,250,235,.95)'],[0.7,'rgba(228,214,180,.9)'],[1,'rgba(190,176,140,.8)']],x,y),{x:x-r,y:y-r,w:2*r,h:2*r},{drop:i<2?[6,0,0.3*4]:null,seed:630+i,rim:4,rimW:0.4,shiboDensity:0.8});});
 ctx.save();ctx.lineCap='round';for(let i=0;i<16;i++){const a=R()*6.28,r0=3+R()*2;ctx.strokeStyle='rgba(235,225,200,'+(0.4+R()*0.4)+')';ctx.lineWidth=0.1;ctx.beginPath();ctx.moveTo(Math.cos(a)*r0,-4+Math.sin(a)*r0);ctx.lineTo(Math.cos(a)*(r0+1.1),-4+Math.sin(a)*(r0+1.1));ctx.stroke();}ctx.restore();}
function itemYarn(ctx,f){ctx.save();ctx.translate(0,-4.6);ctx.rotate(f?0.9:0);ctx.translate(0,4.6);yarnBall(ctx,0,-4.6,4.6,f?17:13);ctx.restore();}
function itemKnot(ctx){const cy=-4.4;feltBall(ctx,0,cy,4.2,3.9,K.r,'#e06a5c','#6f2018',701,0.5);
 ctx.save();ctx.lineCap='round';for(let i=0;i<7;i++){const a=-1.2+i*0.4;ctx.strokeStyle='rgba(60,10,5,.35)';ctx.lineWidth=0.2;ctx.beginPath();ctx.moveTo(Math.cos(a)*0.6,cy-3.4);ctx.quadraticCurveTo(Math.cos(a)*2.2,cy-1.2,Math.cos(a)*3.6,cy+1.4);ctx.stroke();}ctx.restore();
 bow(ctx,0,cy-3.8,0.9);}
function itemMedal(ctx){const cy=-4.4;const p=new Path2D();p.arc(0,cy,4.3,0,7);puff(ctx,p,rg(ctx,-1.2,cy-1.4,0.2,5.2,[[0,'#e6cd6e'],[0.5,K.y],[1,'#7a5e18']],0,cy),{x:-4.3,y:cy-4.3,w:8.6,h:8.6},{drop:[10,0.3*4,1*4],seed:711,rim:8,rimW:0.7,shiboDensity:0.3});
 const r2=new Path2D();r2.arc(0,cy,2.9,0,7);seamShadow(ctx,r2,.4,.35);
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{ctx.save();ctx.fillStyle='#3a302b';ctx.beginPath();ctx.arc(a*1.0,cy+b*1.0,0.42,0,7);ctx.fill();ctx.restore();});
 threadLine(ctx,[[-1,cy-1],[0,cy],[1,cy+1]],K.k,0.28,713);threadLine(ctx,[[1,cy-1],[0,cy],[-1,cy+1]],K.k,0.28,714);}
function spool(ctx,x){puff(ctx,RR(x-3,-2,6,2,0.8),lg(ctx,0,-2,0,0,[[0,'#d9b94e'],[1,'#7a5e18']]),{x:x-3,y:-2,w:6,h:2},{drop:[8,0.2*4,0.7*4],seed:721,rim:5,rimW:.5,dir:0});
 puff(ctx,RR(x-2.3,-7.4,4.6,5.6,0.6),lg(ctx,x-2.3,0,x+2.3,0,[[0,'#f0e6c8'],[0.5,'#d8cdb0'],[1,'#9c8c60']]),{x:x-2.3,y:-7.4,w:4.6,h:5.6},{seed:723,rim:5,rimW:.5,dir:0,shiboDensity:.4});
 ctx.save();ctx.strokeStyle='rgba(90,76,50,.35)';ctx.lineWidth=0.14;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x-2.2,-7+i*1.0);ctx.lineTo(x+2.2,-6.7+i*1.0);ctx.stroke();}ctx.restore();
 puff(ctx,RR(x-3,-9.4,6,2,0.8),lg(ctx,0,-9.4,0,-7.4,[[0,'#e0c25a'],[1,'#8a6d1e']]),{x:x-3,y:-9.4,w:6,h:2},{drop:[6,0.2*4,0.5*4],seed:725,rim:5,rimW:.5,dir:0});}
function itemCheck(ctx,on){spool(ctx,0);
 ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=0.8;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(0,-9.4);ctx.lineTo(0,-23);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#d8cdb0';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(0,-9.4);ctx.lineTo(0,-23);ctx.stroke();ctx.restore();
 const f=new Path2D();if(on){f.moveTo(0.4,-22.6);f.quadraticCurveTo(5,-24.2,10.4,-21.4);f.quadraticCurveTo(8.4,-19.6,10.6,-17.4);f.quadraticCurveTo(5,-18.6,0.4,-16.6);f.closePath();}
 else{f.moveTo(0.4,-22.6);f.quadraticCurveTo(0.2,-18,1.4,-13.4);f.lineTo(5.2,-13.6);f.quadraticCurveTo(4,-18,3.8,-22.2);f.closePath();}
 puff(ctx,f,lg(ctx,0,-24,0,-13,on?[[0,'#d8554a'],[0.5,K.r],[1,'#8f2c22']]:[[0,'#d8cdb0'],[1,'#9c8c60']]),{x:0,y:-24,w:11,h:11},{drop:[8,0.2*4,0.7*4],seed:731,rim:7,rimW:.6,dir:on?0.1:1.4,shiboDensity:0.5});
 stitch(ctx,on?[[1.4,-21.4],[5,-22.2],[9,-20.6]]:[[1.2,-20.8],[1.8,-17],[2.6,-14.6]],on?K.k:'#8a7c58',{seed:733,dmin:1.4,dmax:2,w:0.28});
 if(on){ctx.save();ctx.fillStyle='rgba(255,246,223,.9)';[[12.6,-24.6,0.7],[11.6,-14.8,0.5],[-3.4,-20,0.55]].forEach(([x,y,r])=>{ctx.beginPath();ctx.moveTo(x,y-r*2);ctx.lineTo(x+r*0.6,y-r*0.6);ctx.lineTo(x+r*2,y);ctx.lineTo(x+r*0.6,y+r*0.6);ctx.lineTo(x,y+r*2);ctx.lineTo(x-r*0.6,y+r*0.6);ctx.lineTo(x-r*2,y);ctx.lineTo(x-r*0.6,y-r*0.6);ctx.closePath();ctx.fill();});ctx.restore();}}
function itemGoal(ctx){spool(ctx,-12);spool(ctx,12);
 ctx.save();ctx.lineCap='round';[-12,12].forEach(x=>{ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(x,-9.4);ctx.lineTo(x,-26);ctx.stroke();ctx.strokeStyle='#d8cdb0';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(x,-9.4);ctx.lineTo(x,-26);ctx.stroke();});ctx.restore();
 const rb=new Path2D();rb.moveTo(-12,-25.4);rb.quadraticCurveTo(0,-22,12,-25.4);rb.lineTo(12,-22.4);rb.quadraticCurveTo(0,-19,-12,-22.4);rb.closePath();
 puff(ctx,rb,lg(ctx,0,-26,0,-19,[[0,'#d8554a'],[0.5,K.r],[1,'#8f2c22']]),{x:-12,y:-26,w:24,h:7},{drop:[8,0.2*4,0.8*4],seed:741,rim:8,rimW:.7,dir:0,shiboDensity:0.5});
 stitch(ctx,[[-10,-22.6],[0,-20.6],[10,-22.6]],K.k,{seed:743,dmin:1.6,dmax:2.4,w:0.3});
 ctx.save();ctx.translate(0,-8);itemMedal(ctx);ctx.restore();threadLine(ctx,[[0,-22],[0,-16],[0,-13]],K.k,0.3,745);}
function itemFluff(ctx){tuft(ctx,0,-5,1.3,true);ctx.save();ctx.fillStyle='rgba(255,246,223,.9)';[[6.6,-10.4,0.7],[-6.4,-3.6,0.5]].forEach(([x,y,r])=>{ctx.beginPath();ctx.moveTo(x,y-r*2);ctx.lineTo(x+r*0.6,y-r*0.6);ctx.lineTo(x+r*2,y);ctx.lineTo(x+r*0.6,y+r*0.6);ctx.lineTo(x,y+r*2);ctx.lineTo(x-r*0.6,y+r*0.6);ctx.lineTo(x-r*2,y);ctx.lineTo(x-r*0.6,y-r*0.6);ctx.closePath();ctx.fill();});ctx.restore();}
function itemBox(ctx,used){ctx.save();ctx.translate(-14.8,-25.4);tsuzuraDraw(ctx,used);ctx.restore();}
function itemSpring(ctx,press){ctx.save();ctx.translate(-13.5,-30.8);springDraw(ctx,press);ctx.restore();}
// ボス 大蛾ケバ（足もと中央 = 胴の下端）
function kebaWing(ctx,ang,seed){ctx.save();ctx.translate(5,-20);ctx.rotate(ang);
 const w=new Path2D();w.moveTo(0,0);w.quadraticCurveTo(14,-24,44,-32);w.quadraticCurveTo(52,-18,49,-6);w.quadraticCurveTo(44,10,30,12);w.quadraticCurveTo(14,14,2,8);w.closePath();
 puff(ctx,w,lg(ctx,0,-32,30,12,[[0,'#6a5a50'],[0.5,K.c],[1,'#1c1714']]),{x:0,y:-32,w:52,h:46},{drop:[16,0.5*4,1.4*4],seed,rim:14,rimW:1.2,shiboDensity:0.7,dir:-0.5,lumps:[[22,-10,6,.12],[40,-8,5,.1]]});
 ctx.save();ctx.clip(w);
 // 七宝の刺繍の翅脈（刈安）
 [[18,-8,11],[34,-6,11],[28,-20,10],[42,-18,8]].forEach(([cx,cy,r],i)=>{const pts=[];for(let k=0;k<=24;k++){const a=k/24*6.28;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}stitch(ctx,pts,K.y,{seed:seed+i*3,dmin:1.8,dmax:2.8,gmin:.7,gmax:1,w:0.5});});
 [[30,-6,6.6,'#1c1714'],[30,-6,5.2,K.R],[30,-6,3.4,K.y],[30,-6,2.0,'#1c1714']].forEach(([x,y,r,c])=>{ctx.save();ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.restore();});
 ctx.restore();
 // 縁のほつれ糸
 ctx.save();ctx.lineCap='round';const R=rng(seed+5);for(let i=0;i<26;i++){const t=i/25;const x=44+Math.sin(t*3)*4+(t>0.5?-(t-0.5)*30:0),y=-32+t*44;ctx.strokeStyle='rgba(58,48,43,'+(0.6+R()*0.3)+')';ctx.lineWidth=0.12+R()*0.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.2+R()*2.2,y+0.6+R()*1.6);ctx.stroke();}ctx.restore();
 ctx.restore();}
function keba(ctx,pose){const cfg={hover0:{w:-0.5,t:0,e:'open',sy:1},hover1:{w:0.35,t:0,e:'open',sy:1},windup:{w:-1.1,t:-0.14,e:'narrow',sy:1},swoop:{w:0.95,t:0.75,e:'narrow',sy:1},rest:{w:1.25,t:0,e:'closed',sy:0.9},hurt:{w:-0.15,t:0.08,e:'x',sy:1,flash:1},defeat:{w:0.85,t:-1.45,e:'x',sy:1}}[pose];
 ctx.save();ctx.translate(0,0);
 // 倒れる／急降下は胴の中心まわりで回す
 ctx.translate(0,-14);ctx.rotate(cfg.t);ctx.scale(1,cfg.sy);ctx.translate(0,14);
 if(pose==='defeat'){ctx.translate(-14,-0);}
 kebaWing(ctx,cfg.w,901);ctx.save();ctx.scale(-1,1);kebaWing(ctx,cfg.w,903);ctx.restore();
 // 胴・腹
 const ab=new Path2D();ab.moveTo(-6,-6);ab.quadraticCurveTo(-7,4,0,3);ab.quadraticCurveTo(7,4,6,-6);ab.closePath();
 puff(ctx,ab,lg(ctx,0,-6,0,4,[[0,'#6a5a50'],[1,'#1c1714']]),{x:-7,y:-6,w:14,h:10},{drop:[10,0.3*4,1*4],seed:911,rim:9,rimW:.9,shiboDensity:0.6,dir:Math.PI/2});
 const to=new Path2D();to.ellipse(0,-15,8,11,0,0,7);puff(ctx,to,rg(ctx,-2,-19,1,16,[[0,'#6a5a50'],[0.5,K.c],[1,'#1c1714']],0,-15),{x:-8,y:-26,w:16,h:22},{drop:[14,0.4*4,1.4*4],seed:913,rim:12,rimW:1.1,shiboDensity:0.7,dir:Math.PI/2,lumps:[[-3,-10,3,.12]]});
 ctx.save();ctx.clip(to);[-8,-3.4,1.4].forEach((y,i)=>{const p=new Path2D();p.moveTo(-9,y);p.quadraticCurveTo(0,y+1.6,9,y);ctx.strokeStyle=lg(ctx,-8,0,8,0,[[0,'#8a6d1e'],[0.5,K.y],[1,'#8a6d1e']]);ctx.lineWidth=1.3;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.stroke(p);});ctx.restore();
 // 頭
 const hd=new Path2D();hd.arc(0,-30,6.6,0,7);puff(ctx,hd,rg(ctx,-2,-33,0.5,10,[[0,'#6a5a50'],[0.55,K.c],[1,'#1c1714']],0,-30),{x:-6.6,y:-36.6,w:13.2,h:13.2},{drop:[12,0.4*4,1.2*4],seed:915,rim:10,rimW:1,shiboDensity:0.7,dir:0.6});
 const e=cfg.e;
 if(e==='open'||e==='narrow'){const ry=e==='open'?1.5:0.6;[-2.7,2.7].forEach((x,i)=>{satin(ctx,x,-30.4,1.7,ry,0,K.r,920+i);if(e==='open')satin(ctx,x,-30.4,0.7,0.7,0,K.c,924+i);});}
 else if(e==='closed'){[-2.7,2.7].forEach((x,i)=>threadLine(ctx,[[x-1.5,-30.6],[x,-29.4],[x+1.5,-30.6]],K.k,0.4,930+i));}
 else{[-2.7,2.7].forEach((x,i)=>{threadLine(ctx,[[x-1.2,-31.4],[x,-30.4],[x+1.2,-29.4]],K.k,0.4,940+i);threadLine(ctx,[[x+1.2,-31.4],[x,-30.4],[x-1.2,-29.4]],K.k,0.4,944+i);});}
 strandLine(ctx,[[-1.6,-27],[0,-26.4],[1.6,-27]],'#a8382c',0.4,950);
 [[[-3,-35.6],[-7,-42],[-12,-44]],[[3,-35.6],[7,-42],[12,-44]]].forEach((pt,i)=>{threadLine(ctx,pt,K.c,0.6,960+i);for(let k=0;k<5;k++){const t=0.25+k*0.17;const x=(1-t)*(1-t)*pt[0][0]+2*(1-t)*t*pt[1][0]+t*t*pt[2][0],y=(1-t)*(1-t)*pt[0][1]+2*(1-t)*t*pt[1][1]+t*t*pt[2][1];threadLine(ctx,[[x,y],[x+(i?1:-1)*0.5,y-1.1],[x+(i?1:-1)*1.2,y-1.5]],K.c,0.28,970+k+i*7);}french(ctx,pt[2][0],pt[2][1],0.6,K.y);});
 if(cfg.flash){ctx.save();ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(255,246,223,.45)';ctx.fillRect(-60,-60,120,70);ctx.restore();}
 if(pose==='rest'){ctx.save();const d=new Path2D();d.moveTo(9,-34);d.quadraticCurveTo(11.4,-31,9,-29.4);d.quadraticCurveTo(6.6,-31,9,-34);ctx.fillStyle='#bcd2e0';ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=3;ctx.fill(d);ctx.restore();}
 ctx.restore();}
function tsuzuraDraw(ctx,used){ // sprite-local
 const body=new Path2D();body.moveTo(1,10);body.lineTo(28.5,10);body.quadraticCurveTo(28.2,19,26.6,24.4);body.quadraticCurveTo(14.7,26,2.4,24.4);body.quadraticCurveTo(0.8,19,1,10);body.closePath();
 // 中身（先に置いて縁の後ろに隠す）
 if(!used){yarnBall(ctx,6.4,8,3.9,71);yarnBall(ctx,23.2,7.4,3.9,73);}
 puff(ctx,body,lg(ctx,0,10,0,25,[[0,'#c9a43a'],[0.5,K.Y],[1,'#5d4612']]),{x:1,y:10,w:28,h:15},{drop:[16,0.5*4,1.6*4],seed:75,rim:12,rimW:1.4,shiboDensity:.3});
 // 編み目（ふくらんだ編み材のブロック）
 ctx.save();ctx.clip(body);
 for(let by=0;by<4;by++)for(let bx=0;bx<6;bx++){const hor=((bx+by)&1)===0;const x0=bx*5.2-0.2,y0=10.6+by*3.8;
  for(let k=0;k<3;k++){const rr=hor?RR(x0+0.15,y0+k*1.22,4.9,1.05,0.5):RR(x0+k*1.7+0.1,y0,1.5,3.6,0.6);
   ctx.save();ctx.shadowColor='rgba(30,18,0,.55)';ctx.shadowBlur=3;ctx.shadowOffsetY=0.1*4;ctx.fillStyle=hor?lg(ctx,0,y0+k*1.22,0,y0+k*1.22+1.05,[[0,'#e2c35a'],[1,'#9b7c22']]):lg(ctx,x0+k*1.7,0,x0+k*1.7+1.5,0,[[0,'#e2c35a'],[1,'#9b7c22']]);ctx.fill(rr);ctx.restore();}}
 const g=lg(ctx,0,10,0,25,[[0,'rgba(255,240,200,0.0)'],[0.5,'rgba(60,40,0,0.0)'],[1,'rgba(30,18,0,0.35)']]);ctx.fillStyle=g;ctx.fillRect(0,10,30,16);ctx.restore();
 // 縁（巻いた縁取り）
 const rim=RR(0.4,9.2,28.8,2.6,1.2);puff(ctx,rim,lg(ctx,0,9,0,12,[[0,'#f0d46e'],[0.5,K.y],[1,'#8a6d1e']]),{x:0,y:9,w:29,h:3},{drop:[8,0.2*4,0.8*4],seed:77,rim:6,rimW:0.5,dir:0});
 stitch(ctx,[[2,10.5],[27,10.5]],K.Y,{seed:78,dmin:2,dmax:3.2,w:0.4});
 // 藍の当て布と紐
 [[1.6,20.6,1],[28,20.6,-1]].forEach(([x,y,d],i)=>{const t=new Path2D();t.moveTo(x,y);t.lineTo(x+d*5,y+4);t.lineTo(x,y+4);t.closePath();ctx.save();ctx.clip(body);puff(ctx,t,lg(ctx,0,y,0,y+4,[[0,'#3f6590'],[1,'#1d3452']]),{x:x-5,y,w:10,h:4},{seed:80+i,rim:6,rimW:.8,dir:0});ctx.restore();stitch(ctx,[[x+d*0.6,y+3.3],[x+d*3.6,y+3.3]],K.k,{seed:82+i,dmin:1.1,dmax:1.5,w:.35});});
 const strap=RR(14.8,9.6,2.8,15,0.6);puff(ctx,strap,lg(ctx,14.8,0,17.6,0,[[0,'#4f78a6'],[0.5,K.b],[1,'#1a2f4a']]),{x:14.8,y:9.6,w:3,h:15},{drop:[6,0.2*4,0.5*4],seed:84,rim:6,rimW:.6,dir:Math.PI/2});
 stitch(ctx,[[16.2,11.2],[16.2,23.6]],K.k,{seed:85,dmin:1.8,dmax:2.6,w:.4});
 if(!used)bow(ctx,16.2,6.2,1.6);else{ctx.save();ctx.clip(body);ctx.fillStyle='rgba(70,60,50,.22)';ctx.fillRect(0,9,30,17);ctx.restore();threadLine(ctx,[[16.2,10],[19,8.6],[22.5,10.4]],K.r,0.55,91);threadLine(ctx,[[16.2,10],[13,8.9],[10,10.6]],K.r,0.55,92);}}
function springDraw(ctx,press){ // sprite-local
 const cm=(y)=>press?25.2-(25.2-y)*0.45:y;const dy=press?cm(9.6)-9.6:0;
 // 板
 const base=RR(2,27.6,24,3.4,1);puff(ctx,base,lg(ctx,0,27.6,0,31,[[0,'#d9b94e'],[0.5,K.Y],[1,'#5d4612']]),{x:2,y:27,w:24,h:4},{drop:[10,0.3*4,1*4],seed:90,rim:7,rimW:.7,dir:0});
 [[5,29.3],[23,29.3]].forEach(([x,y])=>french(ctx,x,y,0.35,'#5d4612'));
 // コイル（布を巻いた綿のばね）
 const pts=[[6,9.6],[21,13.4],[6,17.4],[21,21.2],[6,25.2]].map(([x,y])=>[x,cm(y)]);
 for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];ctx.save();ctx.lineCap='round';
  ctx.strokeStyle='rgba(8,12,24,.5)';ctx.lineWidth=3.4;ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(a[0]+0.2,a[1]+0.5);ctx.lineTo(b[0]+0.2,b[1]+0.5);ctx.stroke();ctx.shadowBlur=0;ctx.shadowColor='transparent';
  ctx.strokeStyle=lg(ctx,0,Math.min(a[1],b[1])-1.5,0,Math.max(a[1],b[1])+1.5,[[0,'#4f78a6'],[0.5,K.b],[1,'#1a2f4a']]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  ctx.strokeStyle='rgba(235,223,195,.16)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(a[0]-0.1,a[1]-0.8);ctx.lineTo(b[0]-0.1,b[1]-0.8);ctx.stroke();
  ctx.strokeStyle=K.k;ctx.lineWidth=0.4;ctx.setLineDash([1.4,1.0]);ctx.beginPath();ctx.moveTo(a[0],a[1]+0.2);ctx.lineTo(b[0],b[1]+0.2);ctx.stroke();ctx.restore();}
 // ボタン（生成りのふっくらした円盤）
 ctx.save();ctx.translate(0,dy);const btn=new Path2D();btn.moveTo(5,3.8);btn.quadraticCurveTo(3,3.4,2.4,2.2);btn.quadraticCurveTo(3.2,-0.2,7,-0.4);btn.lineTo(18,-0.4);btn.quadraticCurveTo(22,-0.2,22.8,2.2);btn.quadraticCurveTo(22.2,3.6,20,3.8);btn.quadraticCurveTo(14,6.6,5,3.8);btn.closePath();
 puff(ctx,btn,rg(ctx,11,0.5,0.5,13,[[0,'#fbf3dc'],[0.6,K.k],[1,'#b8a97f']],12.5,3),{x:2,y:-1,w:21,h:7},{drop:[12,0.4*4,1.2*4],seed:92,rim:8,rimW:.9,dir:0,shiboDensity:1});
 // 茜の十字刺繍（押す所）
 threadLine(ctx,[[10.2,0.4],[12.5,1.5],[14.8,2.6]],K.r,0.7,95);threadLine(ctx,[[14.8,0.4],[12.5,1.5],[10.2,2.6]],K.r,0.7,96);ctx.restore();}
