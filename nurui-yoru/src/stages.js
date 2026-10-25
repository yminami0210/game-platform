// ぬるい夜 ステージ3〜10（本体から道具箱Kを受け取る）
export default function stages(K){
  const {T, woodTex, std, box, stripe, dots, kasuri, makeTansu, makeAndon, makeChabudai, makeClock, makeFan, makeCoil, makeKaya, makeTV, makeLamp, makeVent} = K;
  const P = (o)=>Object.assign({age:'adult', arm:1, foot:1, kakeEnd:88, swatDelay:.65, hear:1}, o);
  return [
  { id:3, name:'鳴沢温泉の旅館', short:'旅館', temp:'25℃', note:'修学旅行の5人。1人はまだ起きている',
    room:{w:600, h:240, d:460, wallTex:T.plaster, ceilTex:woodTex('#6e5638','45,30,12',1,8), pillars:true},
    win:{x:-265, y:110, z:230, w:40, h:30}, hemi:[0x46587e, .5],
    people:[
      P({key:'student1', label:'班長', x:-220, z:-40, s:.85, hair:0x1a1512, cloth:kasuri('#e8e4da','rgba(40,60,100,.7)'), kake:kasuri('#5a6a50','rgba(230,225,200,.6)'), yukata:true, arm:-1, swatDelay:.7, hear:.9}),
      P({key:'student2', label:'1組', x:-110, z:-40, s:.82, hair:0x241a14, cloth:kasuri('#e8e4da','rgba(40,60,100,.7)'), kake:kasuri('#5a6a50','rgba(230,225,200,.6)'), yukata:true, foot:-1, kakeEnd:40, swatDelay:.75, hear:.9}),
      P({key:'student5', label:'起きてる子', x:0, z:-40, s:.84, hair:0x15110e, cloth:kasuri('#e8e4da','rgba(40,60,100,.7)'), kake:kasuri('#5a6a50','rgba(230,225,200,.6)'), yukata:true, kakeEnd:30, swatDelay:.6, hear:1.1, awake:true}),
      P({key:'student3', label:'2組', x:110, z:-40, s:.8, hair:0x2c2018, cloth:kasuri('#e8e4da','rgba(40,60,100,.7)'), kake:kasuri('#5a6a50','rgba(230,225,200,.6)'), yukata:true, arm:-1, swatDelay:.8, hear:.8}),
      P({key:'student4', label:'副班長', x:220, z:-40, s:.83, hair:0x1e1814, longHair:true, cloth:kasuri('#e8e4da','rgba(40,60,100,.7)'), kake:kasuri('#5a6a50','rgba(230,225,200,.6)'), yukata:true, foot:-1, swatDelay:.7, hear:1})],
    build(){ makeChabudai(150, 160); makeAndon(-150, 170); makeClock(0, 180, -229);
      box(120, 6, 40, std({color:0x8a7050, roughness:.8}), -200, 3, -205); }},
  { id:4, name:'甲子園中継の居間', short:'居間', temp:'28℃', note:'3人ともテレビに夢中。叩くのは速い',
    room:{w:480, h:230, d:400, wallTex:T.cloth, trim:std({color:0x7a6a52, roughness:.8}), pillars:false},
    win:{x:205, y:110, z:200, w:36, h:28}, hemi:[0x3a4870, .4],
    people:[
      P({key:'father', label:'父', x:-130, z:40, s:.95, hair:0x1c1714, cloth:stripe('#8a96a0','#5e6a76',10,4), kake:kasuri('#6a6048','rgba(230,220,200,.5)'), kakeEnd:30, swatDelay:.45, hear:.6, awake:true}),
      P({key:'son', label:'兄', x:0, z:40, s:.85, hair:0x15110e, cloth:dots('#c8c0a8','#7a7058'), kake:kasuri('#4a5a6a','rgba(230,230,220,.5)'), arm:-1, kakeEnd:20, swatDelay:.45, hear:.6, awake:true}),
      P({key:'grandpa', label:'祖父', x:130, z:40, s:.95, age:'old', hair:0xc8c4bc, bald:true, cloth:kasuri('#a89880','rgba(250,245,230,.6)'), kake:kasuri('#7a5048','rgba(240,220,210,.5)'), kakeEnd:40, swatDelay:.5, hear:.6, awake:true})],
    build(){ makeTV(0, -175, 0); makeChabudai(-180, -150); makeClock(150, 180, -199); makeFan({x:200, z:-160, dir:Math.PI*.8, swing:.5, on:true}); }},
  { id:5, name:'深田の農家', short:'農家', temp:'26℃', note:'若い夫婦と赤ちゃん。赤ちゃんは蚊帳の中',
    room:{w:480, h:240, d:420, wallTex:T.plaster, ceilTex:woodTex('#5e4a32','40,28,12',1,6), pillars:true},
    win:{x:60, y:115, z:210, w:36, h:28}, hemi:[0x44567c, .5],
    people:[
      P({key:'husband', label:'夫', x:-150, z:0, s:1, hair:0x1a1512, cloth:stripe('#c0c8b8','#6a7a60',12,5), kake:kasuri('#3e4e3a','rgba(220,220,200,.5)'), arm:-1, swatDelay:.6, hear:1}),
      P({key:'wife', label:'妻', x:-30, z:0, s:.94, hair:0x2a1e16, longHair:true, cloth:dots('#d8c8c0','#a07868'), kake:kasuri('#6a4a52','rgba(240,220,215,.55)'), swatDelay:.55, hear:1.3}),
      P({key:'baby', label:'赤ちゃん', x:110, z:-20, s:.42, age:'kid', hair:0x3a2a20, cloth:dots('#ece6d8','#b8c0a0'), kake:kasuri('#d8d0b8','rgba(255,255,255,.6)'), kakeEnd:60, swatDelay:.85, hear:.6, noBite:true})],
    build(){ makeKaya({x:110, z:-20, w:90, d:150, h:80, gaps:[]});
      makeFan({x:-200, z:170, dir:Math.PI*.85, swing:.6, on:true}); makeFan({x:200, z:170, dir:-Math.PI*.85, swing:.6, on:true});
      makeTansu(170, -185); }},
  { id:6, name:'深田の県立大学の寮', short:'寮', temp:'27℃', note:'1人は机で起きている。電撃ラケットに注意',
    room:{w:360, h:230, d:420, wallTex:T.cloth, trim:std({color:0x8a8070, roughness:.8}), pillars:false},
    win:{x:0, y:115, z:210, w:30, h:26}, hemi:[0x3a4a70, .4],
    people:[
      P({key:'student_sleep', label:'同室', x:-80, z:20, s:1, hair:0x1a1512, cloth:stripe('#9aa0a8','#4e5660',8,3), kake:kasuri('#4a4a58','rgba(220,220,230,.5)'), arm:-1, foot:-1, swatDelay:.65, hear:1.1}),
      P({key:'student_awake', label:'起きてる先輩', x:90, z:20, s:.95, hair:0x221812, cloth:dots('#b8b0a0','#6a6050'), kake:kasuri('#5a5040','rgba(230,220,200,.5)'), kakeEnd:20, swatDelay:.55, hear:1.1, awake:true, swatR:26})],
    build(){ box(110, 72, 45, std({color:0x9a8a70, roughness:.7}), 100, 36, -186); makeLamp(130, 72, -190);
      box(40, 45, 40, std({color:0x6a6a70}), -150, 22, -185); makeClock(-60, 180, -209); }},
  { id:7, name:'下川原の部品工場の仮眠室', short:'仮眠室', temp:'29℃', note:'夜勤明けの4人。換気扇の風に流される',
    room:{w:560, h:230, d:420, wallTex:T.plaster, pillars:false},
    win:{x:0, y:115, z:210, w:28, h:26}, hemi:[0x404c68, .45],
    people:[
      P({key:'worker1', label:'班長', x:-200, z:10, s:.95, hair:0x2a2420, bald:false, cloth:stripe('#6a7480','#4a525c',10,5), kake:kasuri('#505a48','rgba(210,210,190,.5)'), arm:-1, swatDelay:.6, hear:1}),
      P({key:'worker2', label:'新人', x:-66, z:10, s:.92, hair:0x15110e, cloth:dots('#8a8a80','#5a5a50'), kake:kasuri('#5a5048','rgba(220,210,190,.5)'), foot:-1, kakeEnd:30, swatDelay:.5, hear:1.2}),
      P({key:'worker3', label:'古株', x:66, z:10, s:.95, age:'old', hair:0x9a9690, cloth:stripe('#a09888','#6a6050',12,4), kake:kasuri('#484e5a','rgba(210,210,220,.5)'), swatDelay:.65, hear:.8}),
      P({key:'worker4', label:'先輩', x:200, z:10, s:.95, hair:0x201a16, cloth:kasuri('#7a7e86','rgba(230,230,230,.5)'), kake:kasuri('#5a4a40','rgba(220,200,180,.5)'), arm:-1, kakeEnd:50, swatDelay:.55, hear:1.1})],
    build(){ makeVent(-275, 180, 0, Math.PI/2); makeCoil({x:240, z:170, lit:true}); makeClock(0, 185, -209);
      box(90, 110, 40, std({color:0x707880, metalness:.3, roughness:.6}), 200, 55, -188); }},
  { id:8, name:'上ヨコネ村の古い家', short:'古い家', temp:'24℃', note:'大きな蚊帳。すき間は2か所だけ',
    room:{w:420, h:240, d:400, wallTex:T.plaster, ceilTex:woodTex('#5a4630','40,26,10',1,6), pillars:true},
    win:{x:-160, y:115, z:200, w:36, h:28}, hemi:[0x44567c, .5],
    people:[
      P({key:'grandpa', label:'おじいさん', x:-60, z:0, s:.95, age:'old', hair:0xb8b4ac, brow:0xc8c4bc, bald:true, cloth:kasuri('#d8d4c8','rgba(50,70,100,.6)'), kake:kasuri('#2f4a6e','rgba(230,230,220,.7)'), yukata:true, arm:-1, swatDelay:.6, hear:1.2}),
      P({key:'grandma', label:'おばあさん', x:60, z:0, s:.9, age:'old', hair:0xd8d4cc, longHair:true, cloth:stripe('#d8d0c4','#8a6a6a',10,3), kake:kasuri('#6a4a40','rgba(240,225,210,.6)'), yukata:true, foot:-1, swatDelay:.55, hear:1.3})],
    build(){ makeKaya({x:0, z:0, w:260, d:250, h:170, gaps:[{side:'n', at:60, width:30, y0:120, y1:160}, {side:'e', at:-40, width:30, y0:30, y1:70}]});
      makeCoil({x:-170, z:150, lit:true}); makeCoil({x:170, z:-150, lit:true}); makeAndon(170, 150); makeClock(0, 185, -199); }},
  { id:9, name:'中ノ町商業高校 野球部の合宿', short:'合宿', temp:'27℃', note:'柔道場に6人。若いので耳がいい',
    room:{w:700, h:260, d:480, wallTex:T.plaster, ceilTex:woodTex('#7a6448','50,35,15',1,10), pillars:false},
    win:{x:120, y:120, z:240, w:36, h:28}, hemi:[0x40507a, .45],
    people:[
      P({key:'captain', label:'主将', x:-275, z:-30, s:.95, hair:0x111010, cloth:stripe('#d8dce0','#3a4a6a',10,4), kake:kasuri('#3a4a6a','rgba(230,230,230,.5)'), arm:-1, swatDelay:.55, hear:1.4}),
      P({key:'first1', label:'1年', x:-165, z:-30, s:.88, hair:0x141110, cloth:dots('#c8ccd0','#5a6070'), kake:kasuri('#3a4a6a','rgba(230,230,230,.5)'), foot:-1, kakeEnd:30, swatDelay:.6, hear:1.3}),
      P({key:'second1', label:'2年', x:-55, z:-30, s:.92, hair:0x161210, cloth:stripe('#b8a890','#6a5a40',12,5), kake:kasuri('#3a4a6a','rgba(230,230,230,.5)'), swatDelay:.55, hear:1.3}),
      P({key:'second2', label:'捕手', x:55, z:-30, s:.95, hair:0x121010, cloth:kasuri('#7a8070','rgba(230,230,220,.5)'), kake:kasuri('#3a4a6a','rgba(230,230,230,.5)'), arm:-1, kakeEnd:50, swatDelay:.5, hear:1.2}),
      P({key:'first2', label:'1年', x:165, z:-30, s:.93, hair:0x181412, cloth:stripe('#d0d4d8','#7a3a3a',10,3), kake:kasuri('#3a4a6a','rgba(230,230,230,.5)'), swatDelay:.5, hear:1.4}),
      P({key:'first3', label:'マネージャー', x:275, z:-30, s:.85, hair:0x2a1e16, longHair:true, cloth:dots('#d8d0c8','#9a7a70'), kake:kasuri('#6a5050','rgba(240,225,215,.5)'), foot:-1, swatDelay:.6, hear:1.3})],
    build(){ makeFan({x:-280, z:180, dir:Math.PI*.9, swing:.7, on:true}); makeFan({x:280, z:180, dir:-Math.PI*.9, swing:.7, on:true}); makeFan({x:-120, z:190, dir:Math.PI, swing:.5, on:true});
      box(160, 50, 40, std({color:0x7a6a50, roughness:.8}), 230, 25, -215); makeClock(0, 200, -239); }},
  { id:10, name:'お盆の大広間', short:'お盆', temp:'26℃', note:'親戚8人。蚊帳も扇風機も線香も、ラケットも',
    room:{w:720, h:250, d:500, wallTex:T.plaster, ceilTex:woodTex('#6a5236','45,30,12',1,10), pillars:true},
    win:{x:-45, y:115, z:250, w:30, h:26}, hemi:[0x44567c, .5],
    people:[
      P({key:'grandpa_far', label:'おじいさん', x:-240, z:-120, s:1, age:'old', hair:0xc0bcb4, brow:0xc8c4bc, bald:true, cloth:kasuri('#d8d4c8','rgba(50,70,100,.6)'), kake:kasuri('#2f4a6e','rgba(230,230,220,.7)'), yukata:true, arm:-1, swatDelay:.6, hear:1.1}),
      P({key:'grandma', label:'おばあさん', x:-80, z:-120, s:.92, age:'old', hair:0xd8d4cc, longHair:true, cloth:kasuri('#cfc6b8','rgba(110,70,70,.6)'), kake:kasuri('#6a4a40','rgba(240,225,210,.6)'), yukata:true, swatDelay:.55, hear:1.3}),
      P({key:'uncle', label:'おじ', x:80, z:-120, s:1, hair:0x1c1714, cloth:stripe('#c8ccd0','#4a5a70',10,4), kake:kasuri('#4a5a3a','rgba(230,225,200,.6)'), yukata:true, foot:-1, kakeEnd:40, swatDelay:.5, hear:1, awake:true}),
      P({key:'aunt', label:'おば', x:240, z:-120, s:.95, hair:0x2a1e16, longHair:true, cloth:dots('#d8c8c0','#9a7068'), kake:kasuri('#7a4a4a','rgba(240,220,210,.6)'), yukata:true, swatDelay:.5, hear:1.2, swatR:26}),
      P({key:'cousin_m', label:'いとこ', x:-260, z:110, s:.9, hair:0x15110e, cloth:stripe('#a8b0a0','#5a6a50',10,4), kake:kasuri('#4a4a58','rgba(220,220,230,.5)'), yukata:true, arm:-1, kakeEnd:30, swatDelay:.55, hear:1.3}),
      P({key:'cousin_f', label:'いとこ', x:-130, z:110, s:.88, hair:0x241a14, longHair:true, cloth:kasuri('#d0c8d0','rgba(90,70,110,.5)'), kake:kasuri('#5a4a5a','rgba(230,220,230,.5)'), yukata:true, swatDelay:.6, hear:1.3}),
      P({key:'kid1', label:'いとこの子', x:40, z:110, s:.6, age:'kid', hair:0x161210, cloth:dots('#e0d8a8','#b08a50'), kake:kasuri('#6a8ab0','rgba(255,255,255,.6)'), yukata:true, kakeEnd:20, swatDelay:.85, hear:.7}),
      P({key:'kid2', label:'弟', x:140, z:110, s:.58, age:'kid', hair:0x1e1612, cloth:stripe('#d8d0c0','#6a7a8a',8,3), kake:kasuri('#6a8ab0','rgba(255,255,255,.6)'), yukata:true, foot:-1, swatDelay:.8, hear:.7})],
    build(){ makeKaya({x:90, z:110, w:190, d:170, h:110, gaps:[{side:'w', at:20, width:28, y0:20, y1:60}]});
      makeFan({x:-335, z:0, dir:Math.PI/2, swing:.6, on:true}); makeFan({x:335, z:0, dir:-Math.PI/2, swing:.6, on:true});
      makeCoil({x:0, z:0, lit:true}); makeCoil({x:-340, z:230, lit:true}); makeCoil({x:280, z:228, lit:false}); makeClock(0, 190, -249); }},
  ];
}
