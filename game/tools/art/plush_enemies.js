// ほどき衆（ぬいぐるみ層）。各関数は足もと中央を (0,0) にして描く（フレーム側で平行移動する）。
function feltBall(ctx,cx,cy,rx,ry,base,hi,lo,seed,fuzz){const p=new Path2D();p.ellipse(cx,cy,rx,ry,0,0,7);
 puff(ctx,p,rg(ctx,cx-rx*0.3,cy-ry*0.4,0.2,Math.max(rx,ry)*1.2,[[0,hi],[0.55,base],[1,lo]],cx,cy),{x:cx-rx,y:cy-ry,w:2*rx,h:2*ry},{drop:[12,0.3*4,1*4],seed,rim:10,rimW:Math.min(rx,ry)*0.2,shiboDensity:fuzz||0.5,dir:0.6});return p;}
function squashAbout(ctx,sx,sy,fn){ctx.save();ctx.scale(sx,sy);fn();ctx.restore();}
// イガ: 筒＋背棘＋尻尾（足もと中央 = ローカル (13,16.2)）
function iga(ctx,pose){ctx.save();ctx.translate(-13,-16.2);
 if(pose==='squash'){ctx.translate(13,16.2);ctx.scale(1.3,0.42);ctx.translate(-13,-16.2);igaDraw(ctx,0);}
 else igaDraw(ctx,pose==='b'?1:0);ctx.restore();}
function kona(ctx,pose){ctx.save();ctx.translate(-14,-21.2); // 胴の下端中央
 if(pose==='squash'){ctx.translate(14,17);ctx.rotate(0.5);ctx.scale(1.2,0.5);ctx.translate(-14,-17);konaDraw(ctx,false);}
 else konaDraw(ctx,pose==='b');ctx.restore();}
// チョキ: はさみの付喪神。ため(a)=刃を立てて立つ、跳びかかり(b)=刃を前へ開いて斜めに
function choki(ctx,pose){ctx.save();
 const blade=(ang,len,seed)=>{ctx.save();ctx.rotate(ang);const p=new Path2D();p.moveTo(-1.3,0);p.lineTo(-0.6,-len);p.quadraticCurveTo(0.2,-len-1.6,1.2,-len+0.6);p.lineTo(1.5,0);p.closePath();
  puff(ctx,p,lg(ctx,-1.5,0,1.5,0,[[0,'#6a5a50'],[0.5,K.c],[1,'#1c1714']]),{x:-1.5,y:-len-1,w:3,h:len+1},{drop:[8,0.3*4,0.8*4],seed,rim:7,rimW:0.5,dir:Math.PI/2,shiboDensity:0.3});
  ctx.save();ctx.clip(p);ctx.strokeStyle='rgba(235,223,195,.28)';ctx.lineWidth=0.15;ctx.beginPath();ctx.moveTo(-0.9,-1);ctx.lineTo(-0.1,-len+0.6);ctx.stroke();ctx.restore();
  stitch(ctx,[[0.1,-1.5],[0.4,-len+1.2]],K.k,{seed:seed+1,dmin:1.2,dmax:1.8,w:0.25});ctx.restore();};
 const handle=(x,y,seed)=>{const p=new Path2D();p.ellipse(x,y,2.5,2.2,0,0,7);p.ellipse(x,y,1.1,0.95,0,0,7);puff(ctx,p,lg(ctx,0,y-2.2,0,y+2.2,[[0,'#d4574a'],[0.5,K.r],[1,'#7a241b']]),{x:x-2.5,y:y-2.2,w:5,h:4.4},{drop:[8,0.2*4,0.7*4],seed,rim:6,rimW:0.5,dir:0.4,shiboDensity:0.4});};
 if(pose==='b'){ctx.translate(0,-8);ctx.rotate(0.75);}
 if(pose==='squash'){ctx.scale(1.25,0.45);}
 const sq=pose==='squash';
 handle(-2.6,-2.4,401);handle(2.6,-2.4,402);
 blade(sq?-1.0:-0.28,sq?7:9.5,411);blade(sq?1.0:(pose==='b'?0.62:0.28),sq?7:9.5,413);
 const bt=feltBall(ctx,0,-5.6,1.8,1.8,'#fbf3dc',K.k,'#b8a97f',421,0.3);
 stitch(ctx,[[-1.0,-5.6],[1.0,-5.6]],K.c,{seed:423,dmin:0.9,dmax:1.0,w:0.28});stitch(ctx,[[0,-6.6],[0,-4.6]],K.c,{seed:425,dmin:0.9,dmax:1.0,w:0.28});
 ctx.restore();}
// ハリボウ: 針山を背負ってのそのそ（踏めない）
function hari(ctx,pose){ctx.save();const b=pose==='b'?0.35:0;
 if(pose==='squash'){ctx.scale(1.25,0.5);}
 [[-4.6,-1.4],[-1.8,-1.0],[2.2,-1.4],[5,-1.0]].forEach(([x,y],i)=>puff(ctx,RR(x-0.7,y,1.6,1.7+(pose==='b'&&i%2?0.8:0),0.7),lg(ctx,0,y,0,y+2,[[0,'#5a4c44'],[1,K.c]]),{x:x-1,y:y,w:2,h:2},{seed:430+i,rim:3,rimW:.4,shiboDensity:.2}));
 const dome=new Path2D();dome.moveTo(-8,-1.6);dome.bezierCurveTo(-8,-8,-4,-9.4+b,0,-9.4+b);dome.bezierCurveTo(5,-9.4+b,8.2,-7,8.2,-1.6);dome.quadraticCurveTo(0,0.2,-8,-1.6);
 puff(ctx,dome,lg(ctx,0,-10,0,0,[[0,'#b8453a'],[0.5,'#8a2c22'],[1,'#5a1a14']]),{x:-8,y:-10,w:16.2,h:10},{drop:[12,0.4*4,1.2*4],seed:441,rim:10,rimW:1,shiboDensity:0.6,dir:1.2,lumps:[[-4,-4,2.4,.12],[4,-3,2,.1]]});
 [[-5,-4],[-2,-6.6],[1,-3.4],[3.8,-6],[6,-3.2],[-3.4,-2.2]].forEach(([x,y],i)=>french(ctx,x,y+b,0.38,K.k));
 stitch(ctx,[[-6.8,-2.4],[0,-1.2],[7,-2.4]],K.k,{seed:445,dmin:1.4,dmax:2.2,w:0.35});
 [[-4.4,-9],[-1.4,-10.4],[1.6,-9.6],[4.4,-10.8],[6.4,-8.6]].forEach(([x,y],i)=>{const t=-12.2-(i%3)*1.4-(pose==='b'?0.4:0);ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(x+0.1,y+b+0.2);ctx.lineTo(x+(i-2)*0.15+0.1,t+b+0.2);ctx.stroke();ctx.strokeStyle='#d8cdb2';ctx.lineWidth=0.38;ctx.beginPath();ctx.moveTo(x,y+b);ctx.lineTo(x+(i-2)*0.15,t+b);ctx.stroke();ctx.restore();french(ctx,x+(i-2)*0.15,t+b,0.7,i%2?K.y:'#c9a030');});
 // 顔（右向き）
 satin(ctx,6.0,-5.2+b,0.6,0.7,0,K.c,451);satin(ctx,3.8,-5.0+b,0.5,0.6,0,K.c,453);strandLine(ctx,[[4.0,-3.0+b],[5.2,-2.6+b],[6.3,-3.1+b]],K.k,0.3,455);
 ctx.restore();}
// ツムグモ: 糸巻きから生まれた蜘蛛。糸は頭上へ（ゲーム側で伸ばす）。足もと中央=脚の先
function tsumu(ctx,pose){ctx.save();if(pose==='squash')ctx.scale(1.4,0.42);
 ctx.save();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0.1,-14);ctx.lineTo(0.1,-9);ctx.stroke();ctx.strokeStyle='#e6dabb';ctx.lineWidth=0.38;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,-9);ctx.stroke();ctx.restore();
 const legs=pose==='b'?[[-1,-5,-6,-9,-9,-2],[-1,-4,-7,-6,-10,-1],[-1,-3,-6,-3,-9,0],[1,-5,6,-9,9,-2],[1,-4,7,-6,10,-1],[1,-3,6,-3,9,0]]:[[-1,-5,-6,-10,-8,-3],[-1,-4,-7,-7,-9,-1],[-1,-3,-6,-4,-8,0],[1,-5,6,-10,8,-3],[1,-4,7,-7,9,-1],[1,-3,6,-4,8,0]];
 legs.forEach((l,i)=>{ctx.save();ctx.lineCap='round';ctx.lineJoin='round';const pth=new Path2D();pth.moveTo(l[0],l[1]);pth.quadraticCurveTo(l[2],l[3],l[4],l[5]);ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.0;ctx.translate(0.1,0.2);ctx.stroke(pth);ctx.translate(-0.1,-0.2);ctx.strokeStyle=K.c;ctx.lineWidth=0.8;ctx.stroke(pth);ctx.strokeStyle='rgba(235,223,195,.14)';ctx.lineWidth=0.2;ctx.translate(-0.12,-0.12);ctx.stroke(pth);ctx.restore();});
 feltBall(ctx,0,-6.2,4.6,4.0,'#2b4a6f','#4a73a2','#14233a',461,0.5);
 [[-2,-8],[1,-9],[2.6,-6.4],[-2.4,-5.2],[0.4,-4.2]].forEach(([x,y])=>french(ctx,x,y,0.4,K.k));
 stitch(ctx,[[-3.4,-6.6],[0,-5.6],[3.4,-6.8]],K.k,{seed:465,dmin:1.2,dmax:1.8,w:0.3});
 satin(ctx,1.6,-7.4,0.55,0.65,0,K.k,467);satin(ctx,1.7,-7.4,0.28,0.35,0,K.c,469);satin(ctx,-1.4,-7.2,0.5,0.6,0,K.k,471);satin(ctx,-1.3,-7.2,0.26,0.32,0,K.c,473);
 ctx.restore();}
// ユビヌキ砲: 刈安の指ぬき。頭は平ら（乗れる）。b=発射
function yubi(ctx,pose){ctx.save();if(pose==='squash')ctx.scale(1.15,0.7);
 const body=new Path2D();body.moveTo(-6.4,-1.4);body.lineTo(-5.4,-10.6);body.quadraticCurveTo(0,-12.6,5.4,-10.6);body.lineTo(6.4,-1.4);body.closePath();
 puff(ctx,body,lg(ctx,-6,0,6,0,[[0,'#e0c25a'],[0.45,K.y],[1,'#7a5e18']]),{x:-6.4,y:-12.6,w:12.8,h:11.2},{drop:[12,0.4*4,1.2*4],seed:481,rim:10,rimW:1,shiboDensity:0.3,dir:Math.PI/2});
 for(let r=0;r<4;r++)for(let c=0;c<5;c++){const x=-3.6+c*1.8+(r%2?0.9:0),y=-9.2+r*1.9;if(x>-4.8&&x<4.8)french(ctx,x,y,0.34,'#9b7c22');}
 puff(ctx,RR(-7,-2.2,14,2.4,0.8),lg(ctx,0,-2.2,0,0.2,[[0,'#c9a43a'],[1,'#6a5116']]),{x:-7,y:-2.2,w:14,h:2.4},{drop:[8,0.2*4,0.8*4],seed:485,rim:6,rimW:.6,dir:0});
 stitch(ctx,[[-6,-1.0],[0,-0.9],[6,-1.0]],K.k,{seed:487,dmin:1.6,dmax:2.4,w:0.3});
 const mz=new Path2D();mz.ellipse(6.2,-6.2,1.5,2.0,0,0,7);ctx.save();ctx.fillStyle='#1c1714';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;ctx.fill(mz);ctx.strokeStyle=K.k;ctx.lineWidth=0.5;ctx.stroke(mz);ctx.restore();
 satin(ctx,-1.8,-6.4,0.5,0.6,0,K.c,491);satin(ctx,1.4,-6.4,0.5,0.6,0,K.c,493);strandLine(ctx,[[-1.6,-4.4],[-0.2,-3.9],[1.2,-4.4]],'#7a241b',0.3,495);
 if(pose==='b'){const sp=[[7.6,-6.2],[10.4,-8.4],[9,-6],[11.6,-5.2],[9,-4.4],[10.4,-2.6],[8,-4.6]];ctx.save();ctx.fillStyle='#e6cd6e';ctx.shadowColor='rgba(210,120,40,.8)';ctx.shadowBlur=10;ctx.beginPath();sp.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.fillStyle=K.r;ctx.beginPath();ctx.arc(8.6,-5.8,0.9,0,7);ctx.fill();ctx.restore();}
 ctx.restore();}
// ケダマ: 生成影の毛玉。a=着地でつぶれ、b=のびて口を開ける
function kedama(ctx,pose){ctx.save();const b=pose==='b',sq=pose==='squash';
 const rx=sq?8.4:b?5.4:6.8,ry=sq?3.0:b?7.6:5.6;const cy=-ry;
 const R=rng(501);feltBall(ctx,0,cy,rx,ry,'#d8c9a0','#f0e6c8','#9c8c60',503,0.5);
 ctx.save();ctx.lineCap='round';for(let i=0;i<46;i++){const a=R()*6.28,x=Math.cos(a)*rx,y=cy+Math.sin(a)*ry,L=0.9+R()*1.1;ctx.strokeStyle='rgba(216,201,160,'+(0.6+R()*0.3)+')';ctx.lineWidth=0.14+R()*0.1;ctx.beginPath();ctx.moveTo(x*0.94,cy+(y-cy)*0.94);ctx.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();}ctx.restore();
 if(!sq){satin(ctx,-2.1,cy-0.4,0.6,0.9,0,K.c,505);satin(ctx,2.1,cy-0.4,0.6,0.9,0,K.c,507);
  if(b){const m=new Path2D();m.ellipse(0,cy+2.4,1.1,1.4,0,0,7);ctx.save();ctx.fillStyle='#1c1714';ctx.fill(m);ctx.fillStyle='#a8382c';ctx.beginPath();ctx.ellipse(0,cy+3.0,0.7,0.6,0,0,7);ctx.fill();ctx.restore();}
  else strandLine(ctx,[[-1.2,cy+2.0],[0,cy+2.6],[1.2,cy+2.0]],'#a8382c',0.35,509);}
 else{strandLine(ctx,[[-3.2,cy-0.2],[-2,cy-0.9],[-0.8,cy-0.2]],K.c,0.4,511);strandLine(ctx,[[0.8,cy-0.2],[2,cy-0.9],[3.2,cy-0.2]],K.c,0.4,513);}
 ctx.restore();}
// ================= イガ =================
function igaDraw(ctx,leg){leg=leg||0; // sprite-local 座標
 const body=new Path2D();body.moveTo(1.2,9.5);body.bezierCurveTo(1.2,5.5,4,3.6,9,3.4);body.bezierCurveTo(14,3.2,19.5,3.8,20.4,7);body.bezierCurveTo(21,10,20.4,12.4,17,13);body.bezierCurveTo(11,13.8,5,13.8,2.6,12.4);body.bezierCurveTo(1.4,11.6,1.2,10.6,1.2,9.5);body.closePath();
 // 足
 (leg?[[4,13.6],[8,13.2],[12.4,13.6],[16.6,13.2]]:[[4,13.2],[8,13.6],[12.4,13.2],[16.6,13.6]]).forEach(([x,y],i)=>puff(ctx,RR(x-0.8,y,1.8,3.2,0.8),lg(ctx,0,y,0,y+3,[[0,'#5a4c44'],[1,'#25201c']]),{x,y,w:2,h:3},{drop:[4,0.1*4,0.3*4],seed:150+i,rim:3,rimW:.5}));
 // 尻尾（長いとがり）
 const tail=new Path2D();tail.moveTo(3,6.4);tail.quadraticCurveTo(-3,3.6,-9.4,0.6);tail.quadraticCurveTo(-3.5,6.4,2.4,10);tail.closePath();
 puff(ctx,tail,lg(ctx,-9,0,3,9,[[0,'#6a5a50'],[1,'#26201c']]),{x:-10,y:0,w:14,h:10},{drop:[8,0.3*4,0.9*4],seed:161,rim:7,rimW:.8,dir:-0.4});
 const tip=new Path2D();tip.moveTo(-9.4,0.6);tip.lineTo(-6.6,1.8);tip.lineTo(-7.6,3);tip.closePath();puff(ctx,tip,lg(ctx,0,0,0,3,[[0,'#f3e6a8'],[1,K.y]]),{x:-10,y:0,w:4,h:3},{seed:163,rim:3,rimW:.4});
 // 背棘（フェルトの円錐、背にそろえて尻尾側へ傾ける）
 [[7,-5],[11,-6],[15,-4]].forEach(([x,ty],i)=>{const p=new Path2D();p.moveTo(x-2.4,4.6);p.quadraticCurveTo(x-3.2,0,x-3.2,ty);p.quadraticCurveTo(x+0.6,-0.5,x+2.4,4.6);p.closePath();
  puff(ctx,p,lg(ctx,x-3,0,x+2.5,0,[[0,'#e2d083'],[0.5,'#bd9d35'],[1,'#7f6520']]),{x:x-3.4,y:ty,w:6,h:11},{drop:[8,0.2*4,0.6*4],seed:170+i,rim:8,rimW:.9,dir:-1.3});
  stitch(ctx,[[x-0.3,4],[x-1.4,ty+1.4]],'#7a5a14',{seed:175+i,dmin:1.1,dmax:1.8,gmin:.5,gmax:.8,w:.35});});
 // 胴（ふくらんだ筒、継ぎ目で締まる）
 puff(ctx,body,lg(ctx,0,3,0,14,[[0,'#d4b64e'],[0.4,'#b79630'],[1,'#6a5116']]),{x:1,y:3,w:20,h:11},{drop:[16,0.5*4,1.6*4],seed:181,rim:14,rimW:1.5,dir:0.3});
 [[5.2,3.8,6.4,8.5,5.4,13.4],[9.8,3.5,11,8.5,10.2,13.6],[14.4,3.5,15.6,8.5,14.8,13.2]].forEach(([x0,y0,cx,cy,x1,y1],i)=>{const p=new Path2D();p.moveTo(x0,y0);p.quadraticCurveTo(cx,cy,x1,y1);ctx.save();ctx.clip(body);seamShadow(ctx,p,.55,.7);ctx.restore();
  stitch(ctx,[[x0+0.5,y0+0.3],[cx+0.6,cy],[x1+0.5,y1-0.3]],K.k,{seed:190+i,dmin:1.4,dmax:2.2,gmin:.8,gmax:1.2,w:.5});});
 // 頭（フェルトの玉）
 const head=new Path2D();head.moveTo(19.5,5);head.bezierCurveTo(22,3.4,26.6,4.8,27.8,8.4);head.bezierCurveTo(28.8,12,25,14.5,22,14);head.bezierCurveTo(20,13.8,19,12.6,19,10);head.closePath();
 puff(ctx,head,rg(ctx,22.5,6,0.5,9,[[0,'#6a5a50'],[0.6,K.c],[1,'#1c1714']],23,9),{x:19,y:3,w:10,h:12},{drop:[12,0.4*4,1.2*4],seed:201,rim:10,rimW:1.2,shiboDensity:2.4,dir:0.6});
 satin(ctx,23.1,8.1,1.15,1.05,0,K.r,205);
 threadLine(ctx,[[21.4,6],[23,5.2],[24.8,6.2]],K.R,0.45,207);
 // 大あご（フェルトの白）
 [[[24.8,12.6],[26.4,13.2],[27.4,12.2]],[[23.4,13.4],[25.2,14.8],[26.6,14]]].forEach((pts,i)=>threadLine(ctx,pts,K.k,0.7,210+i));
 // 触角
 threadLine(ctx,[[21,4.4],[22,2],[22.8,0.2]],K.c,0.35,215);threadLine(ctx,[[24,4.2],[25.6,2.4],[27,1]],K.c,0.35,216);
 french(ctx,22.8,0.2,0.5,K.y);french(ctx,27,1,0.5,K.y);
}
// ================= コナ =================
function konaDraw(ctx,down){down=down||false;ctx.save();if(down){ctx.translate(0,28);ctx.scale(1,-1);}
 const wing=new Path2D();wing.moveTo(3,0.4);wing.bezierCurveTo(3.4,5,4.2,10,5,14.2);wing.bezierCurveTo(10,15,16,14.8,20,14.2);wing.bezierCurveTo(14,10,8,5,3,0.4);wing.closePath();
 const hind=new Path2D();hind.moveTo(7,14);hind.bezierCurveTo(10,14.4,12,14.6,13.4,15);hind.bezierCurveTo(11,18,9.4,20,7.6,22);hind.bezierCurveTo(6.6,19,6.4,16.5,7,14);hind.closePath();
 puff(ctx,hind,lg(ctx,0,14,0,22,[[0,'#d8c9a0'],[1,'#9c8c60']]),{x:6,y:14,w:8,h:8},{drop:[8,0.3*4,0.8*4],seed:301,rim:8,rimW:.9,shiboDensity:1.8,dir:1});
 puff(ctx,wing,lg(ctx,3,0,18,14,[[0,'#f1e6c6'],[0.55,'#d8c9a0'],[1,'#a89868']]),{x:3,y:0,w:17,h:15},{drop:[14,0.5*4,1.4*4],seed:303,rim:12,rimW:1.2,shiboDensity:2.2,dir:1.1});
 // 刺繍の翅脈（刈安）
 [[[8,13.6],[5.4,8],[4,2.2]],[[11,13.8],[8.6,8],[7.4,4.4]],[[14.4,13.8],[12.6,10],[12,8]]].forEach((pts,i)=>stitch(ctx,pts,K.y,{seed:310+i,dmin:1.6,dmax:2.6,gmin:.7,gmax:1,w:.5}));
 stitch(ctx,[[8.6,15.4],[9.4,18.4],[8.4,20.4]],K.y,{seed:318,dmin:1.4,dmax:2,w:.45});
 // 縁のかがり縫い（消炭）
 const edge=[[3.6,1.6],[4.2,6],[4.8,10],[5.2,13.6]];stitch(ctx,edge,K.c,{seed:320,dmin:0.8,dmax:1.2,gmin:0.9,gmax:1.2,w:.4});
 stitch(ctx,[[5.6,14],[10,14.4],[16,14.2],[19.6,14]],K.c,{seed:321,dmin:0.9,dmax:1.3,gmin:0.9,gmax:1.2,w:.4});
 // 目玉模様（同心の刺繍）
 [[3.2,K.c],[2.5,K.R],[1.7,K.y],[1.05,K.R]].forEach(([r,c],i)=>{ctx.save();ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.fillStyle=c;ctx.beginPath();ctx.arc(10.4,8.8,r,0,7);ctx.fill();ctx.restore();});
 satin(ctx,10.4,8.8,0.6,0.6,0,K.c,330);
 ctx.restore();
 // 胴（縞の筒）
 const body=new Path2D();body.moveTo(5,17);body.bezierCurveTo(5,14,9,13,15,13);body.bezierCurveTo(20,13,23.2,15.4,24.6,16.8);body.bezierCurveTo(23,19.6,19,21.2,14,21.2);body.bezierCurveTo(8.5,21.2,5,20,5,17);body.closePath();
 puff(ctx,body,lg(ctx,0,13,0,21.5,[[0,'#6a5a50'],[0.45,K.c],[1,'#1c1714']]),{x:5,y:13,w:20,h:9},{drop:[12,0.4*4,1.2*4],seed:340,rim:12,rimW:1.3,shiboDensity:2.2,dir:Math.PI/2});
 ctx.save();ctx.clip(body);[11,14.2,17.4].forEach((x,i)=>{const p=new Path2D();p.moveTo(x,12.5);p.quadraticCurveTo(x+0.9,17,x,22);ctx.save();ctx.strokeStyle=lg(ctx,x-1,0,x+1,0,[[0,'#8a6d1e'],[0.5,K.y],[1,'#8a6d1e']]);ctx.lineWidth=1.3;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.stroke(p);ctx.restore();});ctx.restore();
 // 頭・目・触角
 satin(ctx,22.3,16.4,0.75,0.7,0,K.r,350);
 [[[19.8,13],[21,10.6],[22.4,10.4]],[[18,13.2],[17.6,11],[18.4,9.2]]].forEach((pts,i)=>threadLine(ctx,pts,K.c,0.35,360+i));
 french(ctx,22.4,10.4,0.45,K.y);french(ctx,18.4,9.2,0.45,K.y);
}
