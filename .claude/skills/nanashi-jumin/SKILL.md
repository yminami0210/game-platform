---
name: nanashi-jumin
description: ナナシ県 住民課として CP（住民）を追加したり、人間アバターを登録したりする。「住民を増やして」「CP を追加」「転入」「アバター登録」と言われたとき。ナナシ県サーバー（npm start）が動いている前提。
---

# ナナシ県 住民課（人事機能）

LLM は使わない。API を呼ぶだけ（トークンほぼ 0）。住民課の CP が手続きし、完了するとナナシ駅に新住民が到着する。

- CP を追加: `curl -s -XPOST localhost:8787/api/residents -d '{"name":"山田 太郎","role":"worker","work":"super"}'`
  - `role`: `resident`（一般）/ `worker`（勤め人。`work` に施設 id）/ `student`（児童）。`name` 省略で自動命名。
  - 施設 id: super, conbini1, conbini2, mall, car, yaoya, sakanaya, kissa, shoten, shokudo, sento, station, bokujo, tanbo, school
- 何人も追加するときはループで呼ぶ（1件ずつ住民課のタスクになる）。
- 人間アバター登録: `curl -s -XPOST localhost:8787/api/avatars -d '{"name":"なまえ","color":"#e8b730"}'`
  返る `token` を持つ人だけがそのアバターを動かせる。token はログやコミットに残さない。
- 進み具合: `curl -s localhost:8787/api/tasks`
