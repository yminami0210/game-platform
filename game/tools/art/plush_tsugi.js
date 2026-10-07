// ツギ（ぬいぐるみ層）。head-local 座標（頭の左上が原点、足の中心は約 (10,34)）。pose で袖・脚・つぶれ・傾きを変える。
const FACES={
 // C 半月の目（決定）: 艶は糸の向きの細い帯、下まぶたは外側の短い弧、眉・口は茜のサテンステッチ（口は幅を詰め艶を下げる）
 moon(ctx){satin(ctx,6.2,9.9,1.5,1.05,0,K.c,131,'moon');satin(ctx,13.8,9.9,1.5,1.05,0,K.c,133,'moon');
  strandLine(ctx,[[4.2,8.1],[6.2,7.75],[8.2,8.05]],K.r,0.5,141,true,false);strandLine(ctx,[[11.8,8.0],[13.8,7.7],[15.8,8.0]],K.r,0.5,143,false,true);
  strandLine(ctx,[[4.55,10.55],[4.95,11.35],[5.9,11.55]],'#fff6df',0.3,151);strandLine(ctx,[[13.7,11.55],[14.65,11.35],[15.05,10.55]],'#fff6df',0.3,153);
  strandLine(ctx,[[8.7,13.5],[10,13.95],[11.4,13.45]],'#a8382c',0.42,145);},
 // 痛い: 目を閉じた弧、眉は上がり、口は小さな丸
 hurt(ctx){threadLine(ctx,[[4.4,10.6],[6.2,9.0],[8.0,10.6]],K.c,0.6,161);threadLine(ctx,[[12,10.6],[13.8,9.0],[15.6,10.6]],K.c,0.6,163);
  strandLine(ctx,[[4.2,7.7],[6.2,7.0],[8.2,7.4]],K.r,0.5,141,true,false);strandLine(ctx,[[11.8,7.4],[13.8,7.0],[15.8,7.7]],K.r,0.5,143,false,true);
  const m=new Path2D();m.ellipse(10,13.9,0.9,0.7,0,0,7);ctx.save();ctx.fillStyle='#a8382c';ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.fill(m);ctx.restore();},
};
function sleeveLocal(ctx,pivot,ang,flipX,len,sag,wave,seed,dirFuzz,lumps){
 ctx.save();ctx.translate(pivot[0],pivot[1]);ctx.scale(flipX?-1:1,1);ctx.rotate(ang);
 const h0=4.5,h1=3.1,r=2.4,s=sag*Math.cos(ang)+wave;
 const p=new Path2D();p.moveTo(0,-h0);p.quadraticCurveTo(len/2,-(h0+h1)/2+s,len-r,-h1);p.quadraticCurveTo(len,-h1,len,-h1+r);p.lineTo(len,h1-r);p.quadraticCurveTo(len,h1,len-r,h1);p.quadraticCurveTo(len/2,(h0+h1)/2+s,0,h0);p.closePath();
 puff(ctx,p,lg(ctx,0,-h0,0,h0,[[0,'#5b86b6'],[0.4,'#4a73a2'],[1,'#33557f']]),{x:0,y:-h0-1,w:len,h:2*h0+2},{drop:[10,0.4*4,1.1*4],seed,dir:dirFuzz,rim:10,rimW:1.2,lumps,shiboDensity:0.8});
 const my=(x)=>{const t=x/len;return (-(h0+(h1-h0)*t)+(h0+(h1-h0)*t))/2+2*t*(1-t)*s;};
 [[0.2,0.06],[0.46,-0.1],[0.7,0.12]].forEach(([f,rot],i)=>plus(ctx,3+f*(len-8),my(3+f*(len-8)),K.k,seed+i*3,rot));
 ctx.save();ctx.clip(p);ctx.lineCap='round';ctx.strokeStyle=K.k;ctx.lineWidth=0.6;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=3;const bp=new Path2D();bp.moveTo(0,h0-0.4);bp.quadraticCurveTo(len/2,(h0+h1)/2+s-0.4,len-1,h1-0.4);ctx.stroke(bp);ctx.restore();
 const cx0=len-5;ctx.save();ctx.clip(p);ctx.fillStyle=lg(ctx,0,-h1,0,h1,[[0,'#d4574a'],[0.4,K.r],[1,'#6f2018']]);ctx.fillRect(cx0,-h0-1,7,2*h0+2);
 ctx.shadowColor='rgba(10,5,5,.5)';ctx.shadowBlur=14;ctx.strokeStyle='rgba(10,5,5,.4)';ctx.lineWidth=1.1;ctx.stroke(p);ctx.restore();
 const sp=new Path2D();sp.moveTo(cx0,-3.3);sp.lineTo(cx0+0.15,3.3);seamShadow(ctx,sp,.5,.5);stitch(ctx,[[cx0-0.9,-3],[cx0-0.8,3]],K.k,{seed:seed+4,dmin:1.5,dmax:2.2});
 french(ctx,len-2.4,-1.5+s*0.5,0.5,K.y);french(ctx,len-2.2,1.2+s*0.5,0.46,K.y);
 ctx.restore();}
const LEG={
 stand:[[4.4,26,5.2,3.8,-1.8,29,12,4.0],[10.4,26,5.2,4.8,10.4,30,12.4,4.0]],
 jump:[[4.4,26,5.2,3.8,-1.8,29,12,4.0],[10.4,26,5.2,4.8,10.4,30,12.4,4.0]],
 run0:[[2.0,26,5.2,3.2,-5.5,28.6,12,4.0],[11.5,26,5.2,5.2,11.6,30.2,12.4,4.0]],
 run1:[[5.0,26,5.2,2.2,0.2,27.6,11,3.8],[9.8,26,5.2,2.6,9.8,27.8,11.5,3.8]],
 run2:[[6.5,26,5.2,5.0,-1.2,30.0,12,4.0],[10.0,26,5.2,3.2,13.0,28.4,12.4,4.0]],
 run3:[[5.0,26,5.2,2.6,0.0,27.8,11,3.8],[9.8,26,5.2,2.2,9.8,27.6,11.5,3.8]],
 wide:[[2.6,26,5.2,3.4,-4,29.5,12,4.0],[12.6,26,5.2,3.4,11.5,29.5,12.4,4.0]],
};
function tsugi(ctx,P){P=Object.assign({face:'moon',legs:'stand',L:{a:0.62,wave:0},R:{a:0.66,wave:0},back:false,sx:1,sy:1,tilt:0,bob:0},P||{});
 P.L=Object.assign({a:0.62,wave:0},P.L);P.R=Object.assign({a:0.66,wave:0},P.R);
 ctx.save();
 ctx.translate(10,34);ctx.rotate(P.tilt);ctx.scale(P.sx,P.sy);ctx.translate(-10,-34+P.bob);
 const headP=RR(0,0,20,16,[6,6,6.5,6]);
 // 袖（胴の後ろ）。back=true は両袖がうしろへ流れる（走り）
 if(P.back){sleeveLocal(ctx,[7,19.5],Math.PI-P.L.a,false,19,1.0,P.L.wave,31,0.08,[[-8,20,2.8,.13]]);sleeveLocal(ctx,[12,19],Math.PI-P.R.a,false,19,1.0,P.R.wave,37,-0.14,[[26,18.6,2.8,.13]]);}
 else{sleeveLocal(ctx,[5,20.5],P.L.a,true,19,1.1,P.L.wave,31,0.08,[[-8,20,2.8,.13]]);sleeveLocal(ctx,[15,18.5],P.R.a,false,19,0.8,P.R.wave,37,-0.14,[[26,18.6,2.8,.13]]);}
 const leg=(x,y,w,h,sx,sy,sw,sh,sd)=>{puff(ctx,RR(x,y,w,h,1.4),lg(ctx,x,0,x+w,0,[[0,'#f6edd2'],[1,'#c3b48c']]),{x,y,w,h},{drop:[6,0.3*4,0.5*4],seed:sd,rim:6,rimW:0.7,dir:Math.PI/2,shiboDensity:.4});
  puff(ctx,RR(sx,sy,sw,sh,[1.8,1.8,1.2,1.2]),lg(ctx,0,sy,0,sy+sh,[[0,'#4c76a6'],[1,'#1b304c']]),{x:sx,y:sy,w:sw,h:sh},{drop:[7,0.2*4,0.6*4],seed:sd+2,rim:6,rimW:0.8,dir:0,shiboDensity:.5});
  stitch(ctx,[[sx+1.2,sy+sh*0.45],[sx+sw-1.4,sy+sh*0.45]],K.k,{seed:sd+5,dmin:1.2,dmax:1.8,w:.3});};
 const L=LEG[P.legs];leg(...L[0],41);leg(...L[1],45);
 const skirt=new Path2D();skirt.moveTo(4,21);skirt.lineTo(16,21);skirt.bezierCurveTo(17.5,23,18.4,25,18.6,27);skirt.quadraticCurveTo(10,28.4,1.4,27);skirt.bezierCurveTo(1.6,25,2.5,23,4,21);
 puff(ctx,skirt,lg(ctx,0,21,0,28,[[0,'#d0493a'],[0.5,K.r],[1,'#7a241b']]),{x:1,y:21,w:18,h:7},{drop:[16,0.5*4,1.6*4],seed:47,rim:12,rimW:1.4,dir:1.1,lumps:[[4,24.6,2.4,.12],[15,25,2.2,.1]]});
 ctx.save();ctx.clip(skirt);ctx.lineCap='round';[[6.4,22,5.0,27.6,.38],[10.3,22,10.5,28,.28],[14,22,15.2,27.6,.4]].forEach(([x0,y0,x1,y1,al],i)=>{ctx.strokeStyle='rgba(70,12,6,'+al+')';ctx.lineWidth=0.6+i*0.1;ctx.shadowColor='rgba(70,12,6,.5)';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo((x0+x1)/2+0.5,(y0+y1)/2,x1,y1);ctx.stroke();});ctx.restore();
 [[5,24],[9.3,23.2],[13,24.4],[7.2,26],[11.4,25.4],[15.2,26.5]].forEach(([x,y])=>french(ctx,x,y,0.42,K.y));
 stitch(ctx,[[3,26.4],[10,26.9],[17,26.4]],K.k,{seed:51,dmin:1.8,dmax:3});french(ctx,17.2,26.35,0.3,K.k);
 const torso=RR(4,15.5,12,6.5,[1.5,1.5,1.5,1.5]);
 puff(ctx,torso,lg(ctx,0,15,0,22,[[0,'#d8554a'],[0.5,K.r],[1,'#8f2c22']]),{x:4,y:15,w:12,h:7},{drop:[14,0.4*4,1.2*4],seed:53,rim:10,rimW:1.2,dir:1.35,lumps:[[7,18.5,2.4,.12]]});
 [[4.15,16.8,21.6],[15.85,16.3,21.4]].forEach(([x,y0,y1],i)=>{const sp=new Path2D();sp.moveTo(x,y0);sp.quadraticCurveTo(x+(i?0.3:-0.3),(y0+y1)/2,x,y1);seamShadow(ctx,sp,.45,.45);ctx.save();ctx.strokeStyle='rgba(255,230,210,.22)';ctx.lineWidth=0.15;ctx.translate(i?-0.25:0.25,0);ctx.stroke(sp);ctx.restore();stitch(ctx,[[x+(i?-0.8:0.8),y0+0.3],[x+(i?-0.8:0.8),y1-0.3]],'#f0d6c8',{seed:230+i,dmin:1.1,dmax:1.7,gmin:.6,gmax:1,w:.3});});
 const collar=(sign)=>{const p=new Path2D();const x0=sign<0?5.2:14.8;p.moveTo(x0,15.6);p.lineTo(x0-sign*1.8,15.6);p.lineTo(10,20.8);p.lineTo(10-sign*0.2,20.9);p.closePath();return p;};
 [-1,1].forEach((sg,i)=>{puff(ctx,collar(sg),lg(ctx,0,15,0,21,[[0,'#fbf3dc'],[1,'#cdbf98']]),{x:5,y:15,w:10,h:6},{drop:[6,0.2*4,0.5*4],seed:57+i,rim:5,rimW:0.5,shiboDensity:.4,dir:i?2.2:0.9});});
 const obi=RR(3,20.6,14,2.8,0.9);puff(ctx,obi,lg(ctx,0,20.6,0,23.4,[[0,'#ecc65a'],[0.5,K.y],[1,'#8a6d1e']]),{x:3,y:20.6,w:14,h:2.8},{drop:[10,0.3*4,1*4],seed:59,rim:8,rimW:0.8,dir:0,shiboDensity:.5});
 stitch(ctx,[[4.5,22],[15.5,22]],K.k,{seed:61,dmin:2,dmax:3.2,w:0.4});
 const knot=RR(14,20.2,3.6,3.6,1);puff(ctx,knot,lg(ctx,0,20,0,24,[[0,'#d8b544'],[1,'#7a5e18']]),{x:14,y:20,w:4,h:4},{drop:[8,0.3*4,0.8*4],seed:63,rim:6,rimW:.8,dir:0.7,shiboDensity:.4});
 const tail=new Path2D();tail.moveTo(16,23.2);tail.quadraticCurveTo(17.6,25,17.4,27.4);tail.lineTo(16,27);tail.quadraticCurveTo(15.6,25,15,23.4);tail.closePath();puff(ctx,tail,lg(ctx,0,23,0,27,[[0,K.y],[1,'#7a5e18']]),{x:15,y:23,w:3,h:5},{seed:65,rim:5,rimW:.6,shiboDensity:.3});
 puff(ctx,headP,rg(ctx,8.5,6.5,1,15,[[0,'#fbf3dc'],[0.55,K.k],[1,'#c7b88f']],10,8),{x:0,y:0,w:20,h:16},{drop:[18,0.5*4,1.6*4],seed:71,rim:20,rimW:1.8,shiboDensity:.7,dir:0.5,lumps:[[3,6.6,2.6,.08],[17,7.2,2.2,.07],[5,13.4,2.4,.11],[15.5,14,2.2,.09]]});
 ctx.save();ctx.clip(headP);
 [[3.4,11.6,3.4,3],[16.8,12.0,3.4,3]].forEach(([x,y,rx,ry])=>{const g=rg(ctx,x-0.5,y-0.6,0.2,rx*1.2,[[0,'rgba(255,255,255,.38)'],[0.5,'rgba(255,255,255,.06)'],[1,'rgba(255,255,255,0)']]);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill();});
 ctx.fillStyle=rg(ctx,10,8,6,11,[[0,'rgba(0,0,0,0)'],[0.72,'rgba(0,0,0,0)'],[1,'rgba(90,70,40,.34)']],10,8);ctx.fillRect(0,0,20,16);ctx.restore();
 [[[1.4,12.2],[2.2,14.6],[4.8,15.5]],[[18.6,12.6],[17.8,14.8],[15.2,15.5]]].forEach((pt,i)=>{const cs=new Path2D();cs.moveTo(pt[0][0],pt[0][1]);cs.quadraticCurveTo(pt[1][0],pt[1][1],pt[2][0],pt[2][1]);ctx.save();ctx.clip(headP);seamShadow(ctx,cs,.3,.4);ctx.restore();stitch(ctx,pt,'#b3a478',{seed:240+i,dmin:1.3,dmax:2,gmin:.8,gmax:1.1,w:.32});});
 const hood=new Path2D();hood.moveTo(-1,-1);hood.lineTo(21,-1);hood.lineTo(21,5);for(let x=21,i=0;x>-1;x-=2.4,i++)hood.lineTo(x-1.2,i%2?5:7.2);hood.lineTo(-1,5);hood.closePath();
 ctx.save();ctx.clip(headP);puff(ctx,hood,rg(ctx,9,1,1,14,[[0,'#5b86b6'],[0.5,'#3f6590'],[1,'#233e5e']],10,4),{x:0,y:0,w:20,h:7.5},{seed:73,dir:1.45,rim:10,rimW:1.2,shiboDensity:1.0,drop:[10,0,0.6*4],lumps:[[6,2,2.4,.1],[15,3,2,.09]]});ctx.restore();
 const hl=new Path2D();hl.moveTo(0.5,3.2);hl.quadraticCurveTo(10,4.4,19.5,3.2);ctx.save();ctx.clip(headP);seamShadow(ctx,hl,.35,.4);ctx.restore();
 stitch(ctx,[[1.4,3.2],[10,3.9],[18.6,3.2]],K.k,{seed:75,dmin:2,dmax:3.2,w:0.5});
 plus(ctx,4.2,1.7,K.k,80,0.1);plus(ctx,10.1,1.0,K.k,83,-0.05);plus(ctx,15.3,1.9,K.k,86,0.14);
 FACES[P.face](ctx);
 if(P.fluff)tuft(ctx,10,-1.2,0.8,true);
 const kn=new Path2D();kn.arc(10,-1.2,2.7,0,7);puff(ctx,kn,rg(ctx,9,-2.2,0.3,3.2,[[0,'#dcc060'],[0.45,K.y],[1,'#7a5e18']],10,-1.2),{x:7,y:-4,w:6,h:6},{drop:[10,0.3*4,1*4],seed:85,rim:8,rimW:.9,dir:0.8,shiboDensity:.4});
 ctx.save();ctx.clip(kn);for(let i=0;i<7;i++){ctx.strokeStyle=i%2?'rgba(90,64,10,.45)':'rgba(255,240,170,.14)';ctx.lineWidth=0.25;ctx.beginPath();ctx.moveTo(6.6+i*0.1,-3.8+i*0.9);ctx.quadraticCurveTo(10,-3.2+i*0.9,13.2,-2.2+i*0.7);ctx.stroke();}ctx.restore();
 // 簪（針金入りの針と輪）: 針は生成りの平らな面、艶は無し
 ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.95;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(9.6,-1.2);ctx.lineTo(20,-8.2);ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle=lg(ctx,10,-1,20,-8,[[0,'#e2d6b8'],[1,'#cdbf9c']]);ctx.lineWidth=0.78;ctx.beginPath();ctx.moveTo(9.6,-1.4);ctx.lineTo(20,-8.4);ctx.stroke();
 ctx.strokeStyle='#dfd3b4';ctx.lineWidth=0.62;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=3;ctx.beginPath();ctx.ellipse(21.6,-10.4,1.7,1.9,0.3,0,7);ctx.stroke();ctx.restore();
 threadLine(ctx,[[21.2,-10.6],[22.5,-9],[23.2,-6.5],[23.9,-4.2],[22.6,-2.4],[23.4,-0.8]],K.r,0.55,5);
 threadLine(ctx,[[23.4,-0.8],[23.9,0.3]],K.r,0.4,6);threadLine(ctx,[[23.4,-0.8],[22.6,0.2]],K.r,0.4,7);
 ctx.restore();}
// 綿の房（パワーアップの飾り／アイテム）: 生成りの綿の塊に茜の糸の結び
function tuft(ctx,cx,cy,s,tie){ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
 const R=rng(77);const blobs=[[-2.6,0.6,2.4],[2.4,0.4,2.5],[0,-1.4,2.8],[-1,1.6,2.3],[1.6,1.7,2.2]];
 blobs.forEach(([x,y,r],i)=>{const p=new Path2D();p.arc(x,y,r,0,7);puff(ctx,p,rg(ctx,x-r*0.3,y-r*0.4,0.1,r*1.2,[[0,'#fffaf0'],[0.6,'#f0e7cf'],[1,'#c3b48c']],x,y),{x:x-r,y:y-r,w:2*r,h:2*r},{drop:i<3?[6,0.1*4,0.4*4]:null,seed:300+i,rim:6,rimW:0.5,shiboDensity:0.5});});
 ctx.lineCap='round';for(let i=0;i<14;i++){const a=R()*6.28,r0=2.6+R()*1.6;ctx.strokeStyle='rgba(235,225,200,'+(0.5+R()*0.3)+')';ctx.lineWidth=0.08;ctx.beginPath();ctx.moveTo(Math.cos(a)*r0,Math.sin(a)*r0*0.8);ctx.lineTo(Math.cos(a)*(r0+0.9),Math.sin(a)*(r0+0.9)*0.8);ctx.stroke();}
 if(tie){threadLine(ctx,[[-2,1.6],[0,2.4],[2,1.6]],K.r,0.45,310);french(ctx,0,2.5,0.5,K.r);}
 ctx.restore();}
