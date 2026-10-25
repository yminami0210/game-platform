# ぬるい夜 ステージ計画（1〜10）

すべて8月上旬〜中旬の夜、23:00開始・5:00終了。ナナシ県の正本（バイブル）にある場所だけを使う。主要人物（西村ハル、丸山、戸田、三浦、佐藤）は出さない。

| # | 名前 | 人 | 新しい要素 | 難しさ |
|---|---|---|---|---|
| 1 | 中ノ町の一軒家 | おじいさん | 練習（案内つき） | ★ |
| 2 | 下川原の団地 | 父・母・兄・妹（川の字） | 首振り扇風機、火のついた蚊取り線香 | ★★ |
| 3 | 鳴沢温泉の旅館 | 修学旅行の中学生5人（浴衣）。1人は起きている | 起きている人（目が開いていて最初から警戒1.5）、広い客間、浴衣で肌が多い | ★★ |
| 4 | 甲子園中継の居間（中ノ町） | テレビの前で寝そべる3人（起きている） | テレビのちらつく光。全員起きているが画面に夢中で耳が悪い。叩くのは速い | ★★★ |
| 5 | 深田の農家 | 若い夫婦と赤ちゃん（赤ちゃんは刺せない・ベビー用蚊帳） | 蚊帳（入れない箱）。扇風機2台 | ★★★ |
| 6 | 深田の県立大学の寮 | 学生2人。1人は机で起きている | 電撃ラケット（その人の叩く範囲が広い）、机のライト | ★★★ |
| 7 | 下川原の部品工場の仮眠室 | 夜勤明けの4人 | 二段ベッドではなく畳に雑魚寝。換気扇（強い風の筋が一定方向） | ★★★★ |
| 8 | 上ヨコネ村の古い家 | 年配の夫婦 | 大きな蚊帳（すき間が2か所だけ）。強い蚊取り線香2つ | ★★★★ |
| 9 | 中ノ町商業高校 野球部の合宿（柔道場） | 部員6人 | 広い部屋、扇風機3台、耳がいい若者 | ★★★★ |
| 10 | お盆の大広間（鳴沢の親戚の家） | 親戚8人の雑魚寝 | 全部入り。蚊帳・扇風機・線香・起きている人・ラケット | ★★★★★ |

## stages.js の形（コンテンツ担当が書く）
`src/stages.js` は `export default function stages(K) { return [ ...3〜10の面... ]; }`。K は本体から渡す道具箱：

```
K.THREE, K.V(x,y,z), K.MOBILE
K.T: { tatami, plaster, cloth, sheet, screen }        // 既存テクスチャ
K.tex(w,h,drawFn,rx,ry), K.woodTex(base,'r,g,b',rx,ry), K.speckTex(base,rx,ry)
K.kasuri(bg,fg), K.stripe(bg,fg,step,wd), K.dots(bg,fg)   // 布の柄（掛け布団・寝間着）
K.std({...MeshStandardMaterial opts}), K.mat(color), K.M: { wood, kiri, sheet, metal, white }
K.add(mesh,x,y,z,parent?), K.box(w,h,d,colorOrMat,x,y,z,parent?), K.rbox(w,h,d,r,mat,x,y,z,parent?)
// 既製の家具（位置は cm、床が y=0）
K.makeTansu(x,z,ry), K.makeAndon(x,z), K.makeRandoseru(x,z), K.makeChabudai(x,z), K.makeClock(x,y,z)
K.makeFan({x,z,dir,swing,on})     // dir=風の向き（ラジアン、0で+z）、swing=首振りの幅（0で固定）。複数置ける
K.makeCoil({x,z,lit})             // 複数置ける
K.makeKaya({x,z,w,d,h,gaps:[{side:'n'|'s'|'e'|'w', at, width, y0, y1}]}) // 蚊帳。gaps のすき間からだけ出入りできる。side は n=-z側 s=+z側 w=-x側 e=+x側、at はその辺の中心からのずれ(cm)
K.makeTV(x,z,ry)                  // ちらつく光つきのテレビ
K.makeLamp(x,y,z)                 // 机のライト（光る）
K.makeVent(x,y,z,dir)             // 換気扇（一定方向の強い風）
```

面のオブジェクト（1・2面と同じ形）：
```
{ id, name, short, note, temp:'26℃',
  room:{w,h,d, wallTex, ceilTex?, trim?, pillars:bool, nightLight:bool},
  win:{x,y,z:room.d/2,w,h},           // 出口は必ず +z の壁
  hemi:[color, intensity],
  people:[{ key, label, x, z, s, age:'old'|'adult'|'kid', hair, brow?, bald?, longHair?, cloth, kake, yukata?, arm:-1|1, foot:-1|1, kakeEnd,
            swatDelay, hear, awake?:bool, swatR?:number, noBite?:bool }],
  build(){ ...家具・扇風機・線香・蚊帳を置く... } }
```
人は布団ごと幅約104×s、長さ約212×s を取る（x,z は布団の中心、頭は -z 側）。人どうしと家具が重ならないこと。部屋は最大 720×500 まで。
