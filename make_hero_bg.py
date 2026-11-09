#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""闪马田园 SUMFARM · 论坛 / 专家频道 hero 专属主视觉生成脚本
------------------------------------------------------------------
执行顺序（基线约定）：页面构建完成 → slice_assets.py 切题材图 → 本脚本生成
频道级 hero 主视觉 → verify.py / runtime_check.py 验收。素材生成排在页面构建之后。

输入：assets/img/src/src_forum.webp / src_expert.webp（同批田园成图，800×450）
输出：assets/img/<channel>_hero.webp       16:9 1280×720  PC hero
      assets/img/<channel>_hero_m.webp     9:16  720×1280 移动 hero
映射：forum*.html 共 11 页 → forum_hero；expert*.html / experts.html 共 9 页
      → expert_hero，见 ART_MATRIX.md。图片按 pagename_id 所属频道归属，
      不写死在 JS 里；列表缩略图仍由 mock-data.js 的 art() 按题材池解析。

设计约束：60% 真实田园（同批成图主体）+ 30% 科技（极淡网格 / 数据点连线）
+ 10% 可爱（圆润气泡 / 笑脸）；左侧 45% 柔雾留白供叠加深墨绿标题，
色调与 --sf-hero-base #D2E4C8 统一，右下角生成标记以相邻内容镜像抹除。
格式统一 WebP（网站专用格式），不保留 PNG。

复跑：cd <站点根目录> && python3 make_hero_bg.py
依赖：Pillow（沙盒已预装）。
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "assets/img/src")
OUT = os.path.join(ROOT, "assets/img")
W, H = 1280, 720
MW, MH = 720, 1280
GREEN = (210, 228, 200)
INK = (34, 50, 41)
TECH = (46, 110, 126)


def blend(a, b, t):
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


def remove_watermark(im):
    w, h = im.size
    bw, bh = int(w * .16), int(h * .11)
    patch = im.crop((w - 2 * bw, h - bh, w - bw, h)).transpose(Image.FLIP_LEFT_RIGHT)
    patch = patch.filter(ImageFilter.GaussianBlur(2))
    im.paste(patch, (w - bw, h - bh, w, h))
    return im


def soft_grid(im, alpha=26):
    w, h = im.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    step = max(52, w // 22)
    for x in range(step, w, step):
        d.line([(x, 0), (x, h)], fill=(*TECH, alpha), width=1)
    for y in range(step, h, step):
        d.line([(0, y), (w, y)], fill=(*TECH, alpha), width=1)
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def cute_bits(im, kind):
    w, h = im.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if kind == "forum":
        for (cx, cy, r) in [(int(w * .78), int(h * .24), 16),
                            (int(w * .90), int(h * .36), 11),
                            (int(w * .70), int(h * .16), 9)]:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 253, 247, 150),
                      outline=(*INK, 90), width=2)
            d.polygon([(cx - r // 2, cy + r - 2), (cx - r // 3, cy + r + 9),
                       (cx + r // 4, cy + r - 2)], fill=(255, 253, 247, 150))
    else:
        pts = [(int(w * .74), int(h * .27), 9), (int(w * .88), int(h * .20), 7),
               (int(w * .93), int(h * .44), 8), (int(w * .68), int(h * .15), 6)]
        for (cx, cy, r) in pts:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(227, 240, 241, 210),
                      outline=(*TECH, 140), width=2)
        d.line([(p[0], p[1]) for p in pts[:3]], fill=(*TECH, 105), width=2)
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def soft_left(sharp):
    """左侧 45% 用「同图高斯柔化 + 浅田绿」做留白，右侧保持清晰主体。
    用 smoothstep 蒙版平滑混合，不叠纯色块，避免主体边缘出现贯穿全高的硬分界；
    文字对比由 CSS 田绿罩 .96 最终保证。"""
    blur = sharp.filter(ImageFilter.GaussianBlur(18))
    blur = ImageEnhance.Brightness(blur).enhance(1.05)
    blur = Image.blend(blur, Image.new("RGB", (W, H), GREEN), .32)
    cut = int(W * .62)
    mask = Image.new("L", (W, 1))
    for x in range(W):
        t = min(1.0, x / cut)
        mask.putpixel((x, 0), int(255 * (t * t * (3 - 2 * t))))
    # hero 图是背景而非主体展示：整图轻微软化，让黑板 / 标牌等硬边退成柔和底纹，
    # 避免与 CSS 田绿罩的明暗过渡叠出一条贯穿全高的竖直分界。
    return Image.composite(sharp, blur, mask.resize((W, H))).filter(
        ImageFilter.GaussianBlur(1.8))


def make_wide(topic, kind):
    im = Image.open(os.path.join(SRC, "src_%s.webp" % topic)).convert("RGB")
    im = remove_watermark(im).resize((W, H), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(.82)
    im = ImageEnhance.Brightness(im).enhance(1.06)
    im = ImageEnhance.Contrast(im).enhance(.94)
    im = soft_grid(im)
    im = cute_bits(im, kind)
    return soft_left(im)


def make_tall(wide):
    bg = wide.resize((MW, MH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(26))
    bg = ImageEnhance.Brightness(bg).enhance(1.03)
    bg = ImageEnhance.Color(bg).enhance(.68)
    bp = bg.load()
    for y in range(MH):
        a = .60 * (abs(y - MH / 2) / (MH / 2)) ** .8
        for x in range(MW):
            bp[x, y] = blend(bp[x, y], GREEN, a)
    iw = MW
    ih = int(round(H * iw / W))
    fg = wide.resize((iw, ih), Image.LANCZOS)
    canvas = bg.convert("RGB").copy()
    canvas.paste(fg, (0, (MH - ih) // 2))
    px = canvas.load()
    cut = int(MH * .46)
    for y in range(cut):
        a = .72 * ((1 - y / cut) ** 1.5)
        for x in range(MW):
            px[x, y] = blend(px[x, y], GREEN, a)
    return canvas


def save(im, path):
    im.convert("RGB").save(path, "WEBP", quality=72, method=6)


def main():
    for topic, stem in (("forum", "forum_hero"), ("expert", "expert_hero")):
        wide = make_wide(topic, topic)
        tall = make_tall(wide)
        save(wide, os.path.join(OUT, stem + ".webp"))
        save(tall, os.path.join(OUT, stem + "_m.webp"))
        for p in (stem + ".webp", stem + "_m.webp"):
            f = os.path.join(OUT, p)
            print(p, Image.open(f).size, "%.1f KB" % (os.path.getsize(f) / 1024))
    print("频道 hero 主视觉生成完成（2 题材 × 16:9 / 9:16 = 4 张 WebP）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
