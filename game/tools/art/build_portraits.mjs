// 物語画面の立ち絵（ぬいぐるみ層＝ちりめん細工）。 node game/tools/art/build_portraits.mjs
// 出力: game/assets/portraits/*.png、game/src/data/portraits.json（キー→ファイル・サイズ）、一覧 studio/characters/portraits-sheet.png
// 描画は plush_*.js の部品をそのまま使う（乱数は種固定なので再実行で同じ画像）。
// 約束: ツギの顔は C 半月の目。白い反射線・墨の輪郭は入れない。色は6色の色相の中の階調だけ（design-concept §1.6 §4）。
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
// playwright は game/node_modules（devDependencies）を優先し、無ければグローバルから読む
let chromium; try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'))('playwright')); }
const lib = ['plush_lib.js', 'plush_tsugi.js', 'plush_enemies.js', 'plush_items.js'].map(f => readFileSync(join(HERE, f), 'utf8')).join('\n');

// ---- ブラウザ側の描画（論理画素。1論理画素=4px）----
const draw = String.raw`
const W=128,H=152,S=4;
// ツギの表情（C 半月の目を土台に）。下まぶたは生成りの糸、艶は糸の向きの帯だけ
FACES.pNormal=function(ctx){satin(ctx,6.2,9.9,1.5,1.05,0,K.c,131,'moon');satin(ctx,13.8,9.9,1.5,1.05,0,K.c,133,'moon');
 strandLine(ctx,[[4.2,8.1],[6.2,7.75],[8.2,8.05]],K.r,0.5,141,true,false);strandLine(ctx,[[11.8,8.0],[13.8,7.7],[15.8,8.0]],K.r,0.5,143,false,true);
 strandLine(ctx,[[4.55,10.55],[4.95,11.35],[5.9,11.55]],K.k,0.3,151);strandLine(ctx,[[13.7,11.55],[14.65,11.35],[15.05,10.55]],K.k,0.3,153);
 strandLine(ctx,[[8.7,13.5],[10,13.95],[11.4,13.45]],'#a8382c',0.42,145);};
FACES.pSurprise=function(ctx){satin(ctx,6.2,10.1,1.45,1.0,0,K.c,131,'moon5');satin(ctx,13.8,10.1,1.45,1.0,0,K.c,133,'moon5');
 strandLine(ctx,[[4.3,7.2],[6.2,6.5],[8.1,7.1]],K.r,0.5,141,true,false);strandLine(ctx,[[11.9,7.1],[13.8,6.5],[15.7,7.2]],K.r,0.5,143,false,true);
 strandLine(ctx,[[4.6,10.9],[5.0,11.6],[5.9,11.8]],K.k,0.3,151);strandLine(ctx,[[13.9,11.8],[14.8,11.6],[15.2,10.9]],K.k,0.3,153);
 satin(ctx,10,14.1,0.7,0.6,0,'#a8382c',147,'oval');};
FACES.pResolve=function(ctx){satin(ctx,6.2,10.15,1.5,0.82,0,K.c,131,'moon');satin(ctx,13.8,10.15,1.5,0.82,0,K.c,133,'moon');
 strandLine(ctx,[[4.2,7.7],[6.3,8.0],[8.3,8.75]],K.r,0.55,141,true,false);strandLine(ctx,[[11.7,8.75],[13.7,8.0],[15.8,7.7]],K.r,0.55,143,false,true);
 strandLine(ctx,[[4.55,10.6],[4.95,11.3],[5.9,11.45]],K.k,0.3,151);strandLine(ctx,[[13.7,11.45],[14.65,11.3],[15.05,10.6]],K.k,0.3,153);
 strandLine(ctx,[[8.8,13.65],[10,13.75],[11.3,13.6]],'#a8382c',0.42,145);};
function tsugiP(P){return(ctx)=>{ctx.translate(64,140);ctx.scale(2.5,2.5);ctx.translate(-10,-34);tsugi(ctx,P);};}
function ground(ctx,cx,y,rx){ctx.save();ctx.scale(1/S,1/S);stepShadow(ctx,cx*S,y*S,rx*S,10,0.32);ctx.restore();}

// ヌイばあ: 3頭身、継ぎ布4枚の羽織、糸巻きの髷、頭の上の眼鏡、足首にからまる茜の糸、手は見せる
function nuiba(ctx){ctx.translate(64,144);ctx.scale(1.82,1.82);
 // 足（足袋）と足首の糸
 [[-9,0],[3,1]].forEach(([x,i])=>{puff(ctx,RR(x,-7,7,7,[1.5,1.5,2.5,2.5]),lg(ctx,x,0,x+7,0,[[0,'#fbf3dc'],[1,'#b8a97f']]),{x,y:-7,w:7,h:7},{drop:[10,0.3*4,0.8*4],seed:401+i,rim:8,rimW:.8,dir:Math.PI/2,shiboDensity:.5});
  stitch(ctx,[[x+1,-2.2],[x+6,-2.2]],K.y,{seed:405+i,dmin:1.2,dmax:1.8,w:.5});});
 threadLine(ctx,[[-10,-4.5],[-5.5,-6.5],[-1.5,-4.4],[-5.5,-2.6],[-9.6,-4.2],[-14,-1.5],[-19,-0.6]],K.r,0.55,409);
 // 袖（羽織の後ろ）
 const sl=(sx,seed,col)=>{const p=new Path2D();p.moveTo(sx*9,-40);p.lineTo(sx*22,-34);p.quadraticCurveTo(sx*24.5,-24,sx*21,-15);p.lineTo(sx*13,-16);p.closePath();
  puff(ctx,p,col,{x:sx>0?9:-24,y:-40,w:15,h:25},{drop:[14,0.4*4,1.2*4],seed,rim:12,rimW:1.2,dir:1.4,lumps:[[sx*18,-20,3,.12]]});
  stitch(ctx,[[sx*20.6,-32],[sx*22.4,-24],[sx*20,-16.6]],K.k,{seed:seed+1,dmin:1.8,dmax:2.8,w:.4});};
 sl(-1,411,lg(ctx,0,-40,0,-15,[[0,'#4f78a6'],[1,'#233e5e']]));sl(1,415,lg(ctx,0,-40,0,-15,[[0,'#d8554a'],[1,'#7a241b']]));
 // 羽織（台形）を4枚の継ぎ布に
 const body=new Path2D();body.moveTo(-11,-41);body.lineTo(11,-41);body.bezierCurveTo(14,-30,16,-16,17,-6);body.quadraticCurveTo(0,-4,-17,-6);body.bezierCurveTo(-16,-16,-14,-30,-11,-41);body.closePath();
 const panels=[[[-20,-42,20,-20],lg(ctx,0,-42,0,-20,[[0,'#3f6590'],[1,'#1f3752']]),421,1.3],[[0,-42,20,-21],lg(ctx,0,-42,0,-21,[[0,'#8fb5cb'],[1,'#5683a3']]),423,1.9],
  [[-20,-20,20,-3],lg(ctx,0,-20,0,-3,[[0,'#e6c85a'],[1,'#7a5e18']]),425,0.4],[[0,-21,20,-3],lg(ctx,0,-21,0,-3,[[0,'#d4574a'],[1,'#6f2018']]),427,2.4]];
 ctx.save();ctx.shadowColor='rgba(15,10,10,.38)';ctx.shadowBlur=16;ctx.shadowOffsetY=1.3*4;ctx.fillStyle='#233e5e';ctx.fill(body);ctx.restore();
 panels.forEach(([[x0,y0,w,y1],f,seed,dir])=>{ctx.save();ctx.clip(body);const p=new Path2D();p.rect(x0,y0,w,y1-y0);puff(ctx,p,f,{x:x0,y:y0,w,h:y1-y0},{seed,rim:12,rimW:1,dir,shiboDensity:.5});ctx.restore();});
 ctx.save();ctx.clip(body);const sm=new Path2D();sm.moveTo(0,-41);sm.lineTo(0.4,-5);sm.moveTo(-17,-20);sm.lineTo(0,-20.5);sm.lineTo(17,-21);seamShadow(ctx,sm,.45,.5);ctx.restore();
 stitch(ctx,[[-1,-39],[-0.7,-6]],K.k,{seed:431,dmin:1.6,dmax:2.6,w:.4});stitch(ctx,[[-15,-21.2],[-1,-21.6]],K.k,{seed:433,w:.4});stitch(ctx,[[1,-22.2],[15.5,-22.4]],K.k,{seed:435,w:.4});
 [[-7,-30],[6,-33],[-9,-12],[8,-11]].forEach(([x,y],i)=>plus(ctx,x,y,i===2?K.Y:K.k,440+i*3,i*0.1));
 // 襟（生成り）と帯（茜）
 [-1,1].forEach((sg,i)=>{const p=new Path2D();p.moveTo(sg*3,-41);p.lineTo(sg*7,-41);p.lineTo(sg*1.5,-24);p.lineTo(0,-25);p.closePath();
  puff(ctx,p,lg(ctx,0,-41,0,-24,[[0,'#fbf3dc'],[1,'#cdbf98']]),{x:-7,y:-41,w:14,h:17},{seed:451+i,rim:6,rimW:.5,shiboDensity:.4,dir:i?2.2:0.9,drop:[6,0,0.4*4]});});
 // 手（袖口から）: 左は針と茜の糸、右は糸巻き
 const hand=(x,y,seed)=>{const p=new Path2D();p.ellipse(x,y,3.4,3,0,0,7);puff(ctx,p,rg(ctx,x-1,y-1,0.2,4,[[0,'#fbf3dc'],[1,'#b8a97f']],x,y),{x:x-3.4,y:y-3,w:6.8,h:6},{drop:[10,0.3*4,0.8*4],seed,rim:8,rimW:.7,shiboDensity:.5});};
 hand(-17,-15,461);ctx.save();ctx.lineCap='round';ctx.strokeStyle='#cdbf98';ctx.lineWidth=0.7;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(-24,-25);ctx.stroke();ctx.restore();
 threadLine(ctx,[[-23.6,-24.4],[-27,-20],[-25,-14],[-23,-9],[-26,-6]],K.r,0.45,463);
 hand(17,-15,465);const sp=RR(13.6,-23,7,4.6,1);puff(ctx,sp,lg(ctx,0,-23,0,-18,[[0,'#d8554a'],[1,'#6f2018']]),{x:13.6,y:-23,w:7,h:4.6},{seed:467,rim:5,rimW:.5,dir:0,shiboDensity:.4});
 [[-23.6],[-18.8]].forEach(([y],i)=>puff(ctx,RR(12.8,y,8.6,1.4,.6),lg(ctx,0,y,0,y+1.4,[[0,'#e6c85a'],[1,'#7a5e18']]),{x:12.8,y,w:8.6,h:1.4},{seed:469+i,rim:3,rimW:.3,shiboDensity:.2}));
 // 頭
 const head=RR(-13,-64,26,23,[9,10,8,9]);
 puff(ctx,head,rg(ctx,-2,-56,1,18,[[0,'#fbf3dc'],[0.6,K.k],[1,'#c7b88f']],0,-53),{x:-13,y:-64,w:26,h:23},{drop:[18,0.5*4,1.6*4],seed:471,rim:18,rimW:1.6,shiboDensity:.6,dir:0.4,lumps:[[-9,-47,3,.1],[9,-46.5,3,.1]]});
 // 髪: 生成りの明るい糸を束ねた面（白練→生成りの明）。艶は糸の向きに沿う暗い筋で出す
 const hair=new Path2D();hair.moveTo(-13.4,-50);hair.bezierCurveTo(-14.5,-63,-6,-67,0,-66.5);hair.bezierCurveTo(6,-67,14.5,-63,13.4,-50);hair.quadraticCurveTo(11,-57,4,-57.4);hair.quadraticCurveTo(0,-55.6,-4,-57.4);hair.quadraticCurveTo(-11,-57,-13.4,-50);hair.closePath();
 puff(ctx,hair,lg(ctx,0,-67,0,-50,[[0,'#fbf3dc'],[1,'#cdbf98']]),{x:-14,y:-67,w:28,h:17},{drop:[10,0.2*4,0.6*4],seed:475,rim:10,rimW:1,dir:1.2,shiboDensity:.4});
 ctx.save();ctx.clip(hair);ctx.lineCap='round';for(let i=0;i<9;i++){const x=-11+i*2.75;ctx.strokeStyle='rgba(120,100,60,.28)';ctx.lineWidth=0.22;ctx.beginPath();ctx.moveTo(x*0.4,-66);ctx.quadraticCurveTo(x*0.95,-62,x,-52);ctx.stroke();}ctx.restore();
 // 糸巻きの髷: 刈安濃の木＋茜の糸
 puff(ctx,RR(-4.5,-74.5,9,2,.8),lg(ctx,0,-74.5,0,-72.5,[[0,'#e6c85a'],[1,'#7a5e18']]),{x:-4.5,y:-74.5,w:9,h:2},{seed:481,rim:4,rimW:.4,shiboDensity:.2,drop:[6,0,0.3*4]});
 const wind=RR(-3.4,-72.6,6.8,5.4,1.2);puff(ctx,wind,lg(ctx,0,-72.6,0,-67,[[0,'#d8554a'],[1,'#7a241b']]),{x:-3.4,y:-72.6,w:6.8,h:5.4},{seed:483,rim:5,rimW:.5,dir:0,shiboDensity:.5});
 ctx.save();ctx.clip(wind);for(let i=0;i<7;i++){ctx.strokeStyle='rgba(70,12,6,.35)';ctx.lineWidth=0.2;ctx.beginPath();ctx.moveTo(-3.4,-72+i*0.8);ctx.lineTo(3.4,-71.6+i*0.8);ctx.stroke();}ctx.restore();
 puff(ctx,RR(-4.5,-67.6,9,2,.8),lg(ctx,0,-67.6,0,-65.6,[[0,'#e6c85a'],[1,'#7a5e18']]),{x:-4.5,y:-67.6,w:9,h:2},{seed:485,rim:4,rimW:.4,shiboDensity:.2,drop:[6,0,0.3*4]});
 // 眼鏡（頭の上）: 縹の糸の輪。光る線は入れない
 ctx.save();ctx.lineWidth=0.7;ctx.strokeStyle='#5683a3';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=4;ctx.shadowOffsetY=0.6;[[-5,-60.5],[5,-60.5]].forEach(([x,y])=>{ctx.beginPath();ctx.ellipse(x,y,3.2,2.6,0,0,7);ctx.stroke();});
 ctx.beginPath();ctx.moveTo(-1.8,-60.8);ctx.quadraticCurveTo(0,-61.8,1.8,-60.8);ctx.stroke();ctx.restore();
 // 顔: ツギと同じ刺繍の語彙（C 半月の系統）。細い横長の半月の目に重い上まぶた、目尻の小じわは生成りの短い糸、口は一文字に片側の玉止め。頬の色面は入れない
 satin(ctx,-6,-50.9,1.75,0.62,0,K.c,491,'moon');satin(ctx,6,-50.9,1.75,0.62,0,K.c,493,'moon');
 strandLine(ctx,[[-8.3,-51.3],[-6,-52.05],[-3.8,-51.4]],'#7a5e18',0.42,494,true,false);strandLine(ctx,[[3.8,-51.4],[6,-52.05],[8.3,-51.3]],'#7a5e18',0.42,496,false,true);
 strandLine(ctx,[[-8.6,-50.3],[-9.1,-49.9],[-9.5,-49.4]],'#b3a478',0.28,502);strandLine(ctx,[[8.6,-50.3],[9.1,-49.9],[9.5,-49.4]],'#b3a478',0.28,503);
 strandLine(ctx,[[-8.4,-54.8],[-6.2,-55.4],[-4.2,-54.9]],K.k,0.45,495);strandLine(ctx,[[4.2,-54.9],[6.2,-55.4],[8.4,-54.8]],K.k,0.45,497);
 strandLine(ctx,[[-1.7,-46.3],[0,-46.25],[1.7,-46.4]],'#a8382c',0.4,499,false,true);
 stitch(ctx,[[-11,-43.4],[0,-41.8],[11,-43.4]],'#b3a478',{seed:501,dmin:1.3,dmax:2,w:.32});}

// 虫食いのクイスキ: ヒロズコガの筒の巣の外套（縹の色相で錆びた色）、本当に透ける虫食い穴、3本指、短い足4本
function kuisuki(ctx){ctx.translate(62,146);ctx.scale(1.48,1.48);
 [[-10],[-4],[2],[8]].forEach(([x],i)=>puff(ctx,RR(x,-6,5,6,[1.2,1.2,2.2,2.2]),lg(ctx,x,0,x+5,0,[[0,'#fbf3dc'],[1,'#b8a97f']]),{x,y:-6,w:5,h:6},{drop:[8,0.2*4,0.6*4],seed:601+i,rim:6,rimW:.6,shiboDensity:.4}));
 const coat=new Path2D();coat.moveTo(-17,-4);coat.bezierCurveTo(-19,-40,-17,-70,-12,-80);coat.quadraticCurveTo(-4,-90,6,-86);coat.bezierCurveTo(14,-82,18,-70,18,-56);coat.bezierCurveTo(19,-36,19,-18,17,-4);coat.quadraticCurveTo(0,-1,-17,-4);coat.closePath();
 ctx.save();ctx.shadowColor='rgba(15,10,10,.38)';ctx.shadowBlur=16;ctx.shadowOffsetY=1.3*4;ctx.fillStyle='#233e5e';ctx.fill(coat);ctx.restore();
 puff(ctx,coat,lg(ctx,-18,0,18,0,[[0,'#3f6590'],[0.45,'#5683a3'],[1,'#1a2f4a']]),{x:-19,y:-90,w:38,h:88},{seed:611,rim:16,rimW:1.6,dir:0.2,shiboDensity:.35,lumps:[[-10,-30,5,.12],[10,-14,5,.12],[8,-62,4,.1]]});
 // 筒の巣の帯（横に重なる綴じ）
 ctx.save();ctx.clip(coat);[-74,-60,-46,-32,-18].forEach((y,i)=>{const p=new Path2D();p.moveTo(-20,y);p.quadraticCurveTo(0,y+2.4,20,y-0.6);seamShadow(ctx,p,.4,.5);});ctx.restore();
 [-74,-60,-46,-32,-18].forEach((y,i)=>stitch(ctx,[[-15,y+0.6],[0,y+1.8],[15,y]],'#8fb5cb',{seed:621+i,dmin:1.6,dmax:2.8,w:.38}));
 // 頭巾の垂れと茜の玉
 const tip=new Path2D();tip.moveTo(2,-87);tip.quadraticCurveTo(16,-94,24,-82);tip.quadraticCurveTo(27,-74,25,-68);tip.lineTo(22.6,-69);tip.quadraticCurveTo(22,-80,10,-82);tip.closePath();
 puff(ctx,tip,lg(ctx,0,-94,0,-68,[[0,'#5683a3'],[1,'#233e5e']]),{x:2,y:-94,w:25,h:26},{drop:[10,0.3*4,0.8*4],seed:631,rim:9,rimW:.9,dir:0.9,shiboDensity:.4});
 const ball=new Path2D();ball.arc(24.4,-66.4,2.6,0,7);puff(ctx,ball,rg(ctx,23.6,-67.2,0.2,3,[[0,'#d8554a'],[0.5,K.r],[1,'#6f2018']],24.4,-66.4),{x:21.8,y:-69,w:5.2,h:5.2},{drop:[8,0.2*4,0.6*4],seed:633,rim:6,rimW:.6,shiboDensity:.4});
 // 渦の印（ほどけかけの茜の糸）
 threadLine(ctx,[[-8,-77],[-6,-80],[-4,-77.6],[-5,-75.6],[-6.6,-76.8]],K.r,0.45,635);
 // 顔の開き（生成り）
 const face=new Path2D();face.ellipse(1,-64,11,9.5,0,0,7);
 ctx.save();ctx.fillStyle='#1a2f4a';ctx.beginPath();ctx.ellipse(1,-63.6,12.2,10.6,0,0,7);ctx.fill();ctx.restore();
 puff(ctx,face,rg(ctx,-1,-67,1,13,[[0,'#fbf3dc'],[0.6,K.k],[1,'#b8a97f']],1,-64),{x:-10,y:-73.5,w:22,h:19},{seed:641,rim:14,rimW:1.3,dir:0.5,shiboDensity:.5});
 // 目: 刈安のサテン（半月）、黒目は消炭の小さな半月。白い点は入れない
 [[-4,0],[6,1]].forEach(([x,i])=>{satin(ctx,x,-65.2,2.4,1.9,0,K.y,651+i,'moon5');satin(ctx,x+0.3,-64.6,1.1,1.0,0,K.c,655+i,'moon');});
 strandLine(ctx,[[-6.6,-69.2],[-4,-69.8],[-1.6,-69.0]],K.c,0.45,657);strandLine(ctx,[[3.6,-69.0],[6,-69.8],[8.6,-69.2]],K.c,0.45,659);
 // 口: 消炭の小さな弧に、くわえた茜の糸（ヌイばあの糸）
 threadLine(ctx,[[-1.4,-59.4],[1,-58.2],[3.4,-59.4]],K.c,0.55,661);
 threadLine(ctx,[[1,-58.6],[-3,-54],[-8,-52],[-14,-46],[-16,-38]],K.r,0.5,663);
 // 虫食い穴: 縁は消炭の影、腹の大穴は本当に抜く
 const holes=[[-9,-40,3.2,2.4,0.3],[10,-50,2.4,1.8,-0.2],[-11,-14,2.2,1.6,0.1],[12,-26,1.8,1.4,0.4]];
 holes.forEach(([x,y,rx,ry,r],i)=>{ctx.save();ctx.fillStyle='rgba(28,23,20,.85)';ctx.beginPath();ctx.ellipse(x,y,rx,ry,r,0,7);ctx.fill();ctx.restore();
  ctx.save();ctx.strokeStyle='#6a5a50';ctx.lineWidth=0.35;ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;ctx.beginPath();ctx.ellipse(x+0.2,y+0.2,rx+0.4,ry+0.4,r,0,7);ctx.stroke();ctx.restore();});
 const big=new Path2D();big.moveTo(-1,-34);big.bezierCurveTo(6,-35,9,-28,7,-22);big.bezierCurveTo(5,-17,-3,-17,-5,-22);big.bezierCurveTo(-7,-27,-6,-33,-1,-34);
 ctx.save();ctx.strokeStyle='#4a3326'.replace('#4a3326','#3a302b');ctx.lineWidth=1.4;ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=8;ctx.stroke(big);ctx.restore();
 ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fill(big);ctx.restore();
 ctx.save();ctx.strokeStyle='#6a5a50';ctx.lineWidth=0.5;ctx.stroke(big);ctx.restore();
 // ほつれた糸の端（穴の縁）
 [[6.6,-24,8.6,-22.6],[-4.6,-21,-6.4,-19],[5.4,-32,7.4,-33.4]].forEach(([a,b,c,d],i)=>threadLine(ctx,[[a,b],[(a+c)/2+0.4,(b+d)/2],[c,d]],'#5683a3',0.35,671+i));
 // 手: 3本指（生成り）、右手はくわえた糸の先をつまむ
 const hand=(x,y,s,seed)=>{[[-1.6,0],[0,-0.6],[1.6,0]].forEach(([dx,dy],i)=>{const p=new Path2D();p.ellipse(x+dx*s,y+dy+1.4,1.0,1.7,dx*0.25,0,7);puff(ctx,p,lg(ctx,0,y,0,y+3,[[0,'#fbf3dc'],[1,'#b8a97f']]),{x:x+dx*s-1,y:y+dy,w:2,h:3.4},{seed:seed+i,rim:4,rimW:.4,shiboDensity:.3});});
  const p=new Path2D();p.ellipse(x,y,3,2.4,0,0,7);puff(ctx,p,rg(ctx,x-1,y-1,0.2,3.5,[[0,'#fbf3dc'],[1,'#b8a97f']],x,y),{x:x-3,y:y-2.4,w:6,h:4.8},{drop:[8,0.2*4,0.6*4],seed:seed+5,rim:6,rimW:.6,shiboDensity:.4});};
 hand(-17,-38,1,681);hand(18,-44,1,691);
 ground(ctx,0,0,0);}
`;

// キー: [ファイル名, 描画]
const LIST = [
  ['tsugi', 'tsugi', 'drawSheetGround(ctx,64,140,26);tsugiP({face:"pNormal",legs:"stand",L:{a:0.62},R:{a:0.66}})(ctx)'],
  ['tsugi-surprised', 'tsugi-surprised', 'drawSheetGround(ctx,64,140,26);tsugiP({face:"pSurprise",legs:"wide",sy:1.02,L:{a:-0.55,wave:0.3},R:{a:-0.7,wave:-0.3}})(ctx)'],
  ['tsugi-resolve', 'tsugi-resolve', 'drawSheetGround(ctx,64,140,26);tsugiP({face:"pResolve",legs:"wide",sx:1.03,sy:0.98,tilt:-0.03,L:{a:0.9},R:{a:-0.25,wave:-0.2}})(ctx)'],
  ['nuiba', 'nuiba', 'drawSheetGround(ctx,64,144,30);nuiba(ctx)'],
  ['keba', 'keba', 'drawSheetGround(ctx,64,148,30);ctx.translate(64,112);ctx.scale(1.08,1.08);keba(ctx,"hover0")'],
  ['kuisuki', 'kuisuki', 'drawSheetGround(ctx,64,148,28);kuisuki(ctx)'],
];
const html = `<!doctype html><meta charset=utf-8><body style="margin:0"><canvas id=c></canvas><script>${lib}\n${draw}
function drawSheetGround(ctx,cx,y,rx){ctx.save();ctx.fillStyle='rgba(20,36,60,.30)';for(let i=0;i<3;i++){const w=Math.round(rx*2*Math.sqrt(1-Math.pow(i/3,2)));ctx.fillRect(Math.round(cx-w/2),y+i-1,w,1);}ctx.restore();}
window.P={${LIST.map(([k,,c])=>JSON.stringify(k)+':function(ctx){'+c+'}').join(',')}};
window.render=function(code){const c=document.getElementById('c');c.width=W*S;c.height=H*S;const ctx=c.getContext('2d');ctx.save();ctx.scale(S,S);window.P[code](ctx);ctx.restore();return c.toDataURL('image/png');};
window.sheet=function(urls,names){return new Promise(res=>{const cw=W*S/2,ch=H*S/2;const s=document.createElement('canvas');s.width=cw*urls.length;s.height=ch+40;const c=s.getContext('2d');
 c.fillStyle='#2a4263';c.fillRect(0,0,s.width,s.height);let n=0;urls.forEach((u,i)=>{const im=new Image();im.onload=()=>{c.fillStyle='#34517a';c.fillRect(i*cw+4,4,cw-8,ch-8);c.drawImage(im,i*cw,0,cw,ch);c.fillStyle='#ebdfc3';c.font='16px monospace';c.fillText(names[i],i*cw+10,ch+26);if(++n===urls.length)res(s.toDataURL('image/png'));};im.src=u;});});};
</script>`;
const dir = join(HERE, '.tmp'); mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'portraits.html'), html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + join(dir, 'portraits.html'));
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const out = join(ROOT, 'game/assets/portraits'); mkdirSync(out, { recursive: true });
const png = d => Buffer.from(d.split(',')[1], 'base64');
const index = {}, urls = [];
for (const [key, file, code] of LIST) {
  const d = await page.evaluate(c => window.render(c), key);
  if (errs.length) { console.error(key, errs.join('\n')); process.exit(1); }
  writeFileSync(join(out, file + '.png'), png(d)); urls.push(d);
  index[key] = { file: `assets/portraits/${file}.png`, w: 512, h: 608 };
}
writeFileSync(join(ROOT, 'game/src/data/portraits.json'), JSON.stringify(index, null, 1) + '\n');
const sh = await page.evaluate(([u, n]) => window.sheet(u, n), [urls, LIST.map(l => l[0])]);
writeFileSync(join(ROOT, 'studio/characters/portraits-sheet.png'), png(sh));
await browser.close();
console.log(`portraits: ${LIST.length} (512x608)`);
