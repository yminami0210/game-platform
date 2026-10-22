"""県民だよりの一面の写真を、FLUX.1 [schnell]（この Mac で動かす。承認済みの画像ツール）で作って差し替える。

使い方（サーバーが新聞を出したときに自動で呼ぶ。専用環境の Python で動かす）:
  ~/.venvs/nanashi-flux/bin/python scripts/news_photo.py <data/news/day-XXXX.md>

- 一面の出来事の言葉（屋根酢、子牛など）か場所の種類から、英語の指示文を決める（LLM は使わない）
- 文字は必ず崩れるので、写真に文字を入れさせない。ポスターの出来事は、FLUX で「何も貼っていない壁」を作り、
  コードで組んだポスター（server/newsart.js と同じ題名）を写真らしく貼り込む
- 指示文・シード・ツールを data/photos/<名前>.json と ai-company の 06_デザイン記録/県民だより写真ログ.md に残す（権利の記録）
"""
import datetime
import json
import os
import random
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV = os.path.expanduser("~/.venvs/nanashi-flux")
MODEL = os.path.join(VENV, "models", "schnell-4bit")
DESIGN_LOG = os.path.expanduser("~/ai-company/06_デザイン記録/県民だより写真ログ.md")
STYLE = ("Realistic documentary photograph for a small local newspaper in a quiet Japanese provincial town, "
         "natural light, 35mm lens, slightly muted colors, everyday atmosphere. "
         "Shallow depth of field so the background is soft. Nothing written anywhere: no text, no letters, no labels, no signs, no packaging print, no logos, no watermark.")

# 出来事の言葉 → 何を撮るか（上から順に見る）
BY_WORD = [
    (r"屋根酢|酢", "Close-up of a hand pouring amber homemade vinegar from a plain unglazed earthenware jug into a small white ceramic dish on a worn wooden table, warm window light."),
    (r"卵", "Close-up of brown eggs in plain gray pulp egg trays on a wooden table, a shopper's hand picking up a tray, soft light."),
    (r"子牛", "A newborn calf standing on straw in a small wooden barn, its mother cow beside it, morning light through the door."),
    (r"かぶら|かぶ", "Large white turnips with green leaves piled in wooden crates in front of a small greengrocer."),
    (r"自販機|ぬる", "Close-up of a hand holding a small plain unlabeled bottle of green tea at night, warm glow of a vending machine light behind, blurred."),
    (r"撮影", "A small local TV crew with a shoulder camera and a boom microphone filming on a riverside path."),
    (r"写生|作品", "Children's watercolor paintings displayed on panels in a shopping mall atrium, a few shoppers looking at them."),
    (r"ゲートボール", "Elderly people playing gateball on the sandy ground of a small town park in the morning."),
    (r"避難訓練", "Elementary school children walking out in a line to the schoolyard during an evacuation drill, teachers guiding them."),
    (r"年賀|はがき", "The counter of a small town post office, a clerk handing over a stack of postcards, seen from the customer side."),
    (r"電車", "A two-car local train stopped at a small rural station platform, a few passengers getting off."),
    (r"焼きいも|いも", "Roasted sweet potatoes wrapped in paper on a warm stone tray in front of a small supermarket."),
    (r"満席|フードコート", "A busy food court in a modest suburban shopping mall at lunchtime, families at tables."),
]
BY_KIND = {
    "super": "The entrance area of a small local supermarket with produce stands, shoppers with baskets.",
    "station": "The ticket gate area of a small rural train station, a few commuters walking through.",
    "kencho": "The lobby of an old prefectural government building, people waiting on benches.",
    "mall": "The atrium of a modest suburban shopping mall on a weekday, half the shops quiet.",
    "housou": "The front of a small regional TV station building with a satellite dish on the roof.",
    "post": "The front of a small town post office with a red mailbox outside.",
    "park": "A small town park with trees and benches, a few people walking.",
    "school": "The schoolyard of a small elementary school with the school building behind.",
    "bokujo": "A small dairy farm with cows grazing behind a wooden fence, mountains in the distance.",
    "tanbo": "Rice paddies after harvest in a quiet valley, mountains in the distance.",
    "shop": "A row of small family-run shops on a local shopping street, awnings over the storefronts.",
    "shokudo": "The interior of a small old-fashioned diner, wooden counter and a few customers.",
    "kissa": "The interior of an old retro coffee shop with dark wood and warm lamps.",
    "sento": "The entrance of an old public bathhouse with a curtain over the doorway.",
    "conbini": "The front of a small convenience store at dusk, lights on.",
}
WALL = {
    "station": "A plain clean concrete wall beside the ticket gate of a small rural train station, a large empty area in the center of the wall, nothing posted on it.",
    "kencho": "A plain cream-colored wall in the lobby of an old government building, a large empty area in the center, nothing posted on it.",
}
# ポスターの題名 → ポスターに載せる写真（文字なし）
POSTER_PHOTO = [
    (r"駅伝|マラソン|ロードレース", "Several runners in plain colored running shirts with no numbers running a relay race along a quiet country road lined with autumn trees, mountains behind, one runner handing a plain cloth sash to the next."),
    (r"博物館|企画展|資料|展示", "Old handwritten paper documents and a wooden box displayed under soft light in a quiet museum glass case, blurred so no writing is readable."),
    (r"祭|まつり|盆踊り", "Paper lanterns glowing at dusk over a small town festival street with stalls and people in light summer kimono."),
    (r"写生|絵|美術|県展", "Children sitting on the grass drawing pictures of a river with crayons on drawing boards, sunny day."),
    (r"野球|サッカー|運動|体育", "Young players on a dirt field in a small town sports ground on a sunny day."),
    (r"コンサート|演奏|合唱|音楽", "A small community choir singing on a simple stage in a town hall, warm stage light."),
]
POSTER_PHOTO_DEFAULT = "A wide river flowing through a quiet valley town with low houses and mountains behind, clear autumn day."
WALL_DEFAULT = "A plain light concrete wall in a quiet public place, a large empty area in the center of the wall, nothing posted on it."


def font(size, bold=True):
    import glob
    name = "ToppanBunkyuMidashiMinchoStdN-ExtraBold.otf" if bold else "YuGothic-Medium.otf"
    hits = glob.glob(f"/System/Library/AssetsV2/com_apple_MobileAsset_Font*/*/AssetData/{name}")
    return ImageFont.truetype(hits[0], size) if hits else ImageFont.load_default(size=size)


def paste_poster(photo, title, seed, picture=None):
    """コードで組んだポスターを壁の写真に貼る（小さめ・紙の質感・わずかな遠近・テープ・光のむら・粒子で写真になじませる）"""
    rnd = random.Random(seed)
    W, H = photo.size
    pw = int(W * 0.26); ph = int(pw * 1.414)
    paper, accent = rnd.choice([((244, 239, 226), (200, 67, 43)), ((236, 241, 236), (47, 111, 78)), ((250, 244, 224), (31, 78, 121))])
    po = Image.new("RGB", (pw, ph), paper)
    d = ImageDraw.Draw(po)
    d.rectangle((0, 0, pw, int(ph * 0.12)), fill=accent)
    d.text((pw // 2, int(ph * 0.06)), "ナナシ県", font=font(int(pw * 0.08), False), fill=paper, anchor="mm")
    n = 6 if len(title) <= 12 else 7
    size = int(pw * (0.15 if len(title) <= 6 else 0.11))
    y = int(ph * 0.25)
    for i in range(0, len(title), n):
        d.text((pw // 2, y), title[i:i + n], font=font(size), fill=accent, anchor="mm")
        y += int(size * 1.35)
    box = (int(pw * 0.08), int(ph * 0.47), int(pw * 0.92), int(ph * 0.83))
    if picture is not None:  # 題名に合った写真を、印刷らしく少しだけ色を落として載せる
        bw, bh = box[2] - box[0], box[3] - box[1]
        side = min(picture.width, int(picture.height * bw / bh))
        pic = picture.crop(((picture.width - side) // 2, 0, (picture.width + side) // 2, int(side * bh / bw))).resize((bw, bh))
        po.paste(Image.blend(pic, Image.new("RGB", pic.size, paper), 0.08), box[:2])
    else:
        d.rectangle(box, fill=tuple(int(c * 0.9) for c in paper))
    for k in range(3):
        d.line((int(pw * 0.12), int(ph * (0.86 + k * 0.03)), int(pw * (0.88 - k * 0.15)), int(ph * (0.86 + k * 0.03))), fill=tuple(int(c * 0.75) for c in paper), width=2)
    # 紙の質感（細かいむら）と光のむら（左上が明るい）
    tex = Image.effect_noise((pw, ph), 18).convert("L").point(lambda v: 235 + v // 12)
    po = Image.composite(po, Image.new("RGB", po.size, (0, 0, 0)), tex)
    grad = Image.linear_gradient("L").resize((pw, ph)).point(lambda v: 255 - v // 6)
    po = Image.composite(po, Image.new("RGB", po.size, (0, 0, 0)), grad)
    # わずかな遠近（右が少し奥）
    dx = int(pw * 0.04)
    po = po.transform((pw, ph), Image.QUAD, (0, 0, 0, ph, pw, ph - dx, pw, dx), resample=Image.BICUBIC)
    po = po.convert("RGBA").rotate(rnd.uniform(-1.5, 1.5), expand=True, resample=Image.BICUBIC)
    x, yy = int(W * rnd.uniform(0.32, 0.48)), int(H * 0.2)
    sh = Image.new("RGBA", po.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 70), (0, 0), po)
    sh = sh.filter(ImageFilter.GaussianBlur(5))
    photo.paste(sh, (x + 5, yy + 6), sh)
    photo.paste(po, (x, yy), po)
    tape = Image.new("RGBA", (int(pw * 0.3), int(pw * 0.09)), (236, 230, 205, 170))
    for tx in (x + int(pw * 0.08), x + int(pw * 0.62)):
        photo.paste(tape, (tx, yy - int(pw * 0.04)), tape)
    # 写真全体の色味・ぼけ・粒子をそろえる
    photo = photo.filter(ImageFilter.GaussianBlur(0.7))
    return Image.blend(photo, Image.effect_noise(photo.size, 14).convert("RGB"), 0.035)


def wait_flux_free():
    """ほかの FLUX の生成（毎朝の画像など）が動いていたら終わるまで待つ（メモリが足りないので同時に動かさない）"""
    import time
    for _ in range(240):
        if subprocess.run(["pgrep", "-f", "mflux-generate"], capture_output=True).returncode != 0:
            return
        time.sleep(30)


def main():
    wait_flux_free()
    news_path = os.path.abspath(sys.argv[1])
    md = open(news_path, encoding="utf-8").read()
    m = re.search(r"^## (.+)$", md, re.M)
    if not m:
        return
    head = m.group(1).strip()
    meta = json.loads(os.environ.get("NEWS_TOP", "{}"))
    kind = meta.get("kind", "")
    day = re.search(r"day-(\d+)", news_path).group(1)
    name = f"news-day-{day}"
    poster = re.search(r"ポスター|チラシ|貼り紙|張り紙|掲示", head)
    if poster:
        prompt = WALL.get(kind, WALL_DEFAULT) + " " + STYLE
    else:
        prompt = next((p for w, p in BY_WORD if re.search(w, head)), BY_KIND.get(kind, BY_KIND["shop"])) + " " + STYLE
    seed = int(day) * 7 + 3
    tmp = os.path.join(ROOT, "data", "photos", name + ".png")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    subprocess.run([os.path.join(VENV, "bin", "mflux-generate"), "--model", MODEL, "--base-model", "schnell", "--prompt", prompt,
                    "--steps", "4", "--seed", str(seed), "--width", "1024", "--height", "768", "--output", tmp], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    photo = Image.open(tmp).convert("RGB")
    if poster:
        title = meta.get("posterTitle") or "お知らせ"
        pprompt = next((p for w, p in POSTER_PHOTO if re.search(w, title)), POSTER_PHOTO_DEFAULT) + " " + STYLE
        ptmp = os.path.join(ROOT, "data", "photos", name + "-poster.png")
        subprocess.run([os.path.join(VENV, "bin", "mflux-generate"), "--model", MODEL, "--base-model", "schnell", "--prompt", pprompt,
                        "--steps", "4", "--seed", str(seed + 1), "--width", "768", "--height", "576", "--output", ptmp], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        picture = Image.open(ptmp).convert("RGB")
        os.remove(ptmp)
        photo = paste_poster(photo, title, seed, picture)
        prompt = prompt + " ／ ポスターの写真：" + pprompt
    out = os.path.join(ROOT, "data", "photos", name + ".jpg")
    photo.save(out, quality=88)
    os.remove(tmp)

    caption = (f"貼り出された「{meta.get('posterTitle')}」のポスター" if poster else (meta.get("place") or "")) + "（広報課撮影）"
    md = re.sub(r"^!\[[^\]]*\]\([^)]*\)\n\*写真：[^\n]*\*$", f"![{caption}](data/photos/{name}.jpg)\n*写真：{caption}*", md, count=1, flags=re.M)
    open(news_path, "w", encoding="utf-8").write(md)

    rec = {"tool": "FLUX.1 [schnell] 4bit（mflux）、4ステップ、1024×768", "prompt": prompt, "seed": seed, "poster_overlay": bool(poster),
           "made": datetime.datetime.now().isoformat(timespec="minutes"), "news": os.path.relpath(news_path, ROOT)}
    json.dump(rec, open(os.path.join(ROOT, "data", "photos", name + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if os.path.isdir(os.path.dirname(DESIGN_LOG)):
        new = not os.path.exists(DESIGN_LOG)
        with open(DESIGN_LOG, "a", encoding="utf-8") as f:  # 追記のみ（デザイン規定）
            if new:
                f.write("# 県民だより写真ログ\n\nゲームの県民だより（町の中の新聞）の一面写真。派生デザイン（FLUX.1 [schnell]、承認済み）。ポスターの文字はコードで組んで貼り込む。\n\n| 作成 | 号 | 見出し | シード | ポスター貼り込み | 指示文 |\n|---|---|---|---|---|---|\n")
            f.write(f"| {rec['made']} | {day} | {head} | {seed} | {'あり' if poster else 'なし'} | {prompt[:120]}… |\n")
    print(out)


if __name__ == "__main__":
    main()
