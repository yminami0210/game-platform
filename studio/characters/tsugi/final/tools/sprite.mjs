import fs from 'fs';
const W=28,Hh=28;
const pal={K:'#2b2420',I:'#26426b',L:'#5a7fb0',R:'#b8372b',Y:'#d39a22',C:'#f0e6cf',S:'#cbbf9f'};
const mk=()=>Array.from({length:Hh},()=>Array(W).fill('.'));
function put(g,x,y,arr,flip=false){arr.forEach((row,j)=>{ if(flip) row=[...row].reverse().join(''); [...row].forEach((ch,i)=>{ if(ch!=='.'&&ch!==' '){const X=x+i,Y=y+j; if(X>=0&&X<W&&Y>=0&&Y<Hh) g[Y][X]=ch;}});});}
const HEAD=['...KKKKKKKK...','..KIIIILIIIIK.','.KIILIIIIIIIIK','KIICIICIICIICK','KCCCCCKKCCKKCK','KCCCCCKKCCKKCK','KCCCCCKKCCKKCK','.KCCCCCCCKCRK.','..KCCCCCCCCK..','...KKKKKKKK...'];
const HEADC=HEAD.map((r,i)=>(i==4||i==6)?'KCCCCCCCCCCCCK':r);
const BUN=['.KKKKK.','KYYYYYK','KYKYYYK','KYYKYYK'];
const BODY=['KRRCCCCRRK','KRRRCCRRRK','KYYYYYYYYK','KRYRRRRYRK','.KKKKKKKK.'];
const SL=['KKKKK','KIIIC','KILIC','KIIIC','KILIC','KRRRC','KRYRC','KKKKK']; // 左の袖（内縁が右）
const SLd=SL; 
const STREAM=['.KKKKKKK','KRRIILIC','KRYILIIC','KRRIIILC','.KKKKKKK'];
function figure(o={}){
  const g=mk(); const hx=8+(o.hx||0), hy=10+(o.hy||0), bx=10+(o.bx||0), by=20+(o.by||0);
  o.back&&o.back(g);
  // 袖
  (o.sleeves||(()=>{put(g,5+(o.bx||0),19+(o.by||0),SL);put(g,20+(o.bx||0),19+(o.by||0),SL,true);}))(g);
  put(g,bx,by,BODY);
  o.legs&&o.legs(g);
  put(g,hx,hy,o.closed?HEADC:HEAD); put(g,hx+3,hy-4,BUN);
  // 針（3px幅の斜め）と糸
  const nd=o.needle||[[hx+3,hy-5],[hx+2,hy-6],[hx+1,hy-7],[hx,hy-8]];
  nd.forEach(([x,y],i)=>{ [[0,1],[1,0]].forEach(([dx,dy])=>{ const X=x+dx,Y=y+dy; if(g[Y]&&g[Y][X]==='.')g[Y][X]='K';}); });
  nd.forEach(([x,y])=>{ if(g[y]) g[y][x]='C'; });
  const t=o.thread||[[hx-1,hy-7],[hx-1,hy-6],[hx-2,hy-5],[hx-2,hy-4],[hx-2,hy-3]];
  t.forEach(([x,y])=>{ if(g[y]) g[y][x]='R'; });
  return g;
}
const legsStand=g=>{put(g,11,25,['KCK','KCK','KIIK']);put(g,16,25,['KCK','KCK','KIIK']);put(g,12,27,['K']);};
const legs=(a,b)=>g=>{ put(g,a[0],a[1],a[2]); put(g,b[0],b[1],b[2]); };
const F={};
F.stand=figure({legs:g=>{put(g,11,25,['KCK','KCK','KIIIK']);put(g,16,25,['KCK','KCK','KIIIK']);}});
const runS=g=>{put(g,2,20,STREAM);put(g,3,23,['.KKKKK','KRRILC','.KKKKK']);};
F.run1=figure({hx:1,bx:0,sleeves:g=>{put(g,2,19,STREAM);put(g,4,22,['KKKKK.','KRIIC.','KKKKK.']);},legs:g=>{put(g,17,25,['KCK','KCCK','KIIIK']);put(g,10,25,['KCK','KCK','KIIK']);}});
F.run2=figure({hx:1,hy:0,by:0,sleeves:g=>{put(g,2,18,STREAM);put(g,4,21,['KKKKK.','KRIIC.','KKKKK.']);},legs:g=>{put(g,12,25,['KCK','KCK','KIIIK']);put(g,16,25,['KCK','KCCK','.KKK']);}});
F.run3=figure({hx:1,bx:0,sleeves:g=>{put(g,2,19,STREAM);put(g,4,22,['KKKKK.','KRIIC.','KKKKK.']);},legs:g=>{put(g,10,25,['KCK','KCCK','KIIIK']);put(g,17,25,['KCK','KCK','KIIK']);}});
const UP=['KKKKK','KRRRC','KRYRC','KIIIC','KILIC','KIIIC','KILIC','KKKKK'];
F.jump=figure({hy:0,sleeves:g=>{put(g,3,11,UP);put(g,20,11,UP,true);},legs:g=>{put(g,9,25,['.KCK','KCCK','KIIK']);put(g,17,25,['KCK','KCCK','.KIIK']);}});
F.fall=figure({hy:0,sleeves:g=>{put(g,3,14,UP);put(g,20,14,UP,true);},thread:[[7,3],[7,2],[6,2],[5,3]],legs:g=>{put(g,11,25,['KCK','KCK','KIIK']);put(g,16,25,['KCK','KCK','KIIK']);}});
const WING=['.KKKKKKKKK','KRRIILIILC','KRYILIIILC','KRRIIILIIC','.KKKKKKKKK'];
F.glide=figure({sleeves:g=>{put(g,0,19,WING);put(g,18,19,WING,true);},legs:g=>{put(g,11,25,['KCK','KCK','KIIK']);put(g,16,25,['KCK','KCK','KIIK']);}});
F.skid=figure({hx:-1,bx:-1,sleeves:g=>{put(g,5,19,['KKKKK','KIIIC','KILIC','KIIIC','KKKKK']);put(g,19,20,['KKKKKKKK','CIIILIRK','CILIIRYK','KKKKKKKK']);},thread:[[hx0(),0]].length?[[9,3],[10,2],[11,2],[12,2],[13,2]].map(a=>a):[],legs:g=>{put(g,8,25,['KCK','KCK','KIIK']);put(g,15,25,['KCCCK','KCCCK','KIIIIK']);}});
function hx0(){return 8}
// 倒れ: stand を右へ90度回して目を閉じる
{ const s=figure({closed:1,legs:g=>{put(g,11,25,['KCK','KCK','KIIIK']);put(g,16,25,['KCK','KCK','KIIIK']);}}); let minx=99,maxx=0,miny=99,maxy=0; s.forEach((r,y)=>r.forEach((c,x)=>{if(c!=='.'){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}}));
 const w=maxx-minx+1,h=maxy-miny+1; const g=mk(); const ox=Math.floor((W-h)/2), oy=Hh-w;
 // 時計回り: (x,y)->(h-1-(y-miny), x-minx)
 s.forEach((r,y)=>r.forEach((c,x)=>{ if(c!=='.'){ const nx=h-1-(y-miny)+ox, ny=(x-minx)+oy; if(nx<W&&ny<Hh&&ny>=0) g[ny][nx]=c; }}));
 F.dead=g; }
const names=['stand','run1','run2','run3','jump','fall','skid','dead','glide'];
// 倒れ: 目を閉じる（目のKブロックをCに戻し、中央に1本線）
{ const g=F.dead; const eyes=[]; for(let y=0;y<Hh;y++)for(let x=1;x<W-1;x++){ if(g[y][x]==='K'&&g[y][x-1]==='C'&&g[y][x+1]==='K'&&g[y+1]&&g[y+1][x]==='K'&&g[y+1][x+1]==='K'&&g[y-1]&&g[y-1][x]!=='K'){} }
}
const out={w:28,h:28,palette:pal,frames:Object.fromEntries(names.map(n=>[n,F[n].map(r=>r.join(''))]))};
fs.writeFileSync('sprite.json',JSON.stringify(out));
// プレビュー
const sc=8,cols=5; let h='';
const cells=names.map((n,i)=>{ const x=(i%cols)*(28*sc+20)+10,y=Math.floor(i/cols)*(28*sc+30)+10; let r=`<rect x="${x}" y="${y}" width="${28*sc}" height="${28*sc}" fill="#26426b" opacity="1"/><rect x="${x}" y="${y+27*sc}" width="${28*sc}" height="${sc}" fill="#3b5f93"/><rect x="${x}" y="${y}" width="${28*sc}" height="${27*sc}" fill="#8fb3c4"/><rect x="${x}" y="${y+27*sc}" width="${28*sc}" height="${sc}" fill="#26426b"/>`; F[n].forEach((row,j)=>row.forEach((c,i2)=>{ if(c!=='.') r+=`<rect x="${x+i2*sc}" y="${y+j*sc}" width="${sc}" height="${sc}" fill="${pal[c]}"/>`; })); return r+`<text x="${x}" y="${y+28*sc+18}" font-size="16" font-family="sans-serif">${n}</text>`;}).join('');
fs.writeFileSync('sprite-preview.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*(28*sc+20)+10}" height="${2*(28*sc+30)+10}"><rect width="100%" height="100%" fill="#fff"/>${cells}</svg>`);
