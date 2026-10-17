// フレーム表: name, bounds=[左,上,右,下]（足もと中央を原点にした論理画素）, draw(ctx)。優先順に並べる。
const SC=4,PAD=8;
const T=(P)=>(ctx)=>{ctx.translate(-10,-34);tsugi(ctx,P);};
const FRAMES=[
 ['tsugi.idle.0',[-30,-52,32,3],T({legs:'stand',L:{a:0.62},R:{a:0.66}})],
 ['tsugi.idle.1',[-30,-52,32,3],T({legs:'stand',bob:-0.35,sy:1.012,L:{a:0.7},R:{a:0.72}})],
 ['tsugi.run.0',[-30,-52,32,3],T({back:true,legs:'run0',L:{a:0.12,wave:0.6},R:{a:-0.02,wave:-0.5}})],
 ['tsugi.run.1',[-30,-52,32,3],T({back:true,legs:'run1',bob:-0.7,L:{a:-0.2,wave:0.9},R:{a:0.2,wave:-0.8}})],
 ['tsugi.run.2',[-30,-52,32,3],T({back:true,legs:'run2',L:{a:-0.05,wave:-0.6},R:{a:0.14,wave:0.5}})],
 ['tsugi.run.3',[-30,-52,32,3],T({back:true,legs:'run3',bob:-0.7,L:{a:0.22,wave:-0.9},R:{a:-0.18,wave:0.8}})],
 ['tsugi.jump.0',[-30,-52,32,3],T({legs:'jump',L:{a:-0.45},R:{a:-0.55}})],
 ['tsugi.fall.0',[-30,-56,32,3],T({legs:'wide',L:{a:-0.95,wave:0.4},R:{a:-1.05,wave:-0.4}})],
 ['tsugi.glide.0',[-30,-52,32,3],T({legs:'jump',L:{a:0.04,wave:0.3},R:{a:-0.04,wave:-0.3}})],
 ['tsugi.land.0',[-30,-52,32,3],T({legs:'wide',sx:1.12,sy:0.84,L:{a:1.0},R:{a:0.95}})],
 ['tsugi.hurt.0',[-32,-54,32,3],T({face:'hurt',legs:'wide',tilt:-0.18,L:{a:-0.8},R:{a:-1.2}})],
 ['tsugi.fluff.0',[-9,-13,9,3],(c)=>tuft(c,0,-6,1.0,true)],
 ['iga.a',[-26,-26,20,4],(c)=>iga(c,'a')],['iga.b',[-26,-26,20,4],(c)=>iga(c,'b')],['iga.squash',[-26,-14,20,4],(c)=>iga(c,'squash')],
 ['kona.a',[-20,-26,18,12],(c)=>kona(c,'a')],['kona.b',[-20,-26,18,12],(c)=>kona(c,'b')],['kona.squash',[-20,-18,18,6],(c)=>kona(c,'squash')],
 ['choki.a',[-24,-39,24,6],(c)=>{c.scale(1.5,1.5);choki(c,'a');}],['choki.b',[-27,-45,30,9],(c)=>{c.scale(1.5,1.5);choki(c,'b');}],['choki.squash',[-24,-21,24,6],(c)=>{c.scale(1.5,1.5);choki(c,'squash');}],
 ['hari.a',[-17,-28,17,4],(c)=>{c.scale(1.4,1.4);hari(c,'a');}],['hari.b',[-17,-28,17,4],(c)=>{c.scale(1.4,1.4);hari(c,'b');}],['hari.squash',[-20,-17,20,4],(c)=>{c.scale(1.4,1.4);hari(c,'squash');}],
 ['tsumu.a',[-21,-42,21,4],(c)=>{c.scale(1.5,1.5);tsumu(c,'a');}],['tsumu.b',[-21,-42,21,4],(c)=>{c.scale(1.5,1.5);tsumu(c,'b');}],['tsumu.squash',[-24,-21,24,4],(c)=>{c.scale(1.5,1.5);tsumu(c,'squash');}],
 ['yubi.a',[-16,-24,24,4],(c)=>{c.scale(1.35,1.35);yubi(c,'a');}],['yubi.b',[-16,-24,24,4],(c)=>{c.scale(1.35,1.35);yubi(c,'b');}],['yubi.squash',[-16,-19,24,4],(c)=>{c.scale(1.35,1.35);yubi(c,'squash');}],
 ['kedama.a',[-17,-22,17,3],(c)=>{c.scale(1.4,1.4);kedama(c,'a');}],['kedama.b',[-17,-25,17,3],(c)=>{c.scale(1.4,1.4);kedama(c,'b');}],['kedama.squash',[-17,-14,17,3],(c)=>{c.scale(1.4,1.4);kedama(c,'squash');}],
 ['keba.hover.0',[-58,-64,58,8],(c)=>keba(c,'hover0')],['keba.hover.1',[-58,-56,58,12],(c)=>keba(c,'hover1')],
 ['keba.windup.0',[-58,-68,58,8],(c)=>keba(c,'windup')],['keba.swoop.0',[-66,-60,66,62],(c)=>keba(c,'swoop')],
 ['keba.rest.0',[-58,-50,58,28],(c)=>keba(c,'rest')],['keba.hurt.0',[-58,-64,58,8],(c)=>keba(c,'hurt')],['keba.defeat.0',[-62,-62,62,44],(c)=>keba(c,'defeat')],
 ['shot.dust',[-8,-12,8,2],(c)=>dustShot(c)],['shot.pin',[-12,-8,12,6],(c)=>pinShot(c)],
 ['item.yarn.0',[-8,-12,10,2],(c)=>itemYarn(c,0)],['item.yarn.1',[-8,-12,10,2],(c)=>itemYarn(c,1)],['item.knot',[-8,-16,8,2],(c)=>itemKnot(c)],
 ['item.box',[-18,-30,18,3],(c)=>itemBox(c,false)],['item.box.used',[-18,-30,18,3],(c)=>itemBox(c,true)],
 ['item.spring',[-18,-34,18,3],(c)=>itemSpring(c,false)],['item.spring.press',[-18,-34,18,3],(c)=>itemSpring(c,true)],
 ['item.medal',[-7,-12,7,2],(c)=>itemMedal(c)],['item.check',[-8,-28,16,2],(c)=>itemCheck(c,false)],['item.check.on',[-10,-30,18,2],(c)=>itemCheck(c,true)],
 ['item.goal',[-20,-34,20,2],(c)=>itemGoal(c)],['item.fluff',[-12,-18,12,3],(c)=>itemFluff(c)],
];
function packAndDraw(canvas,W,Hmax){
 const items=FRAMES.map(([name,b,draw])=>({name,b,draw,w:(b[2]-b[0])*SC+2*PAD,h:(b[3]-b[1])*SC+2*PAD,ax:-b[0]*SC+PAD,ay:-b[1]*SC+PAD}));
 const order=[...items].sort((a,b)=>b.h-a.h||b.w-a.w);let x=0,y=0,rowH=0;
 for(const it of order){if(x+it.w>W){x=0;y+=rowH;rowH=0;}it.x=x;it.y=y;x+=it.w;rowH=Math.max(rowH,it.h);}
 const used=y+rowH;canvas.width=W;canvas.height=Math.min(Hmax,used);const ctx=canvas.getContext('2d');
 for(const it of items){ctx.save();ctx.beginPath();ctx.rect(it.x,it.y,it.w,it.h);ctx.clip();ctx.translate(it.x+it.ax,it.y+it.ay);ctx.scale(SC,SC);it.draw(ctx);ctx.restore();}
 return {items,used};}
