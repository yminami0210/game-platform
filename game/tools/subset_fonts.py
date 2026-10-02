# フォントを、ゲームで使っている文字だけに絞って game/fonts/ に置き直す（文章を足したら実行）。
#   pip install fonttools brotli && python3 game/tools/subset_fonts.py
# 元のフォント（SIL OFL 1.1）は Google Fonts から取得する。ライセンス本文は game/fonts/OFL-*.txt
import glob, os, subprocess, tempfile, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), '..')
FONTS = {
    'DotGothic16-subset.woff2': 'https://fonts.gstatic.com/s/dotgothic16/v22/v6-QGYjBJFKgyw5nSoDAGE7L.ttf',
    'KaiseiDecol-Bold-subset.woff2': 'https://fonts.gstatic.com/s/kaiseidecol/v12/bMrvmSqP45sidWf3QmfFW6iK534r0w.ttf',
}
chars = set(chr(c) for c in range(0x20, 0x7f))
chars |= set(chr(c) for c in range(0x3041, 0x3097)) | set(chr(c) for c in range(0x30a1, 0x30fb)) | set('ー・、。「」！？（）／：〜…　')
for f in [os.path.join(ROOT, 'index.html')] + glob.glob(os.path.join(ROOT, 'src/**/*.js'), recursive=True) + glob.glob(os.path.join(ROOT, 'src/data/*.json')):
    chars |= set(c for c in open(f, encoding='utf8').read() if ord(c) > 127)
with tempfile.TemporaryDirectory() as d:
    txt = os.path.join(d, 'chars.txt'); open(txt, 'w', encoding='utf8').write(''.join(sorted(chars)))
    for out, url in FONTS.items():
        ttf = os.path.join(d, 'src.ttf'); urllib.request.urlretrieve(url, ttf)
        subprocess.run(['pyftsubset', ttf, f'--text-file={txt}', '--flavor=woff2', f'--output-file={os.path.join(ROOT, "fonts", out)}', '--layout-features=*'], check=True)
        print(out, len(chars), '文字')
