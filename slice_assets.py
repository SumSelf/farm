# -*- coding: utf-8 -*-
"""闪马田园 SUMFARM · 素材切图脚本 v1.7.0
------------------------------------------------------------------
执行顺序（基线约定）：先 build_pages.py 搭主页面 → 再 build_subpages.py 铺子页
→ 再运行本脚本生成切片与 manifest → 最后 verify.py / runtime_check.py 验收。
素材生成（文生图）排在页面构建之后，不提前。

输入：assets/img/src/src_<topic>.webp（10 张题材主视觉，WebP，800×450 收敛后落盘）
输出：assets/img/art/sub_<topic>_<slot>.webp（10 题材 × 5 规格 = 50 张 WebP）
      assets/img/art/manifest.json（供 verify.py 做资源存在性校验）

命名规则：sub_<topic>_<slot>.webp，全 ASCII、无空格。格式统一为 WebP（网站专用格式），不保留 PNG。
页面嵌入按 pagename_id 作为映射键，由 assets/js/mock-data.js 的 art() 统一解析，
映射表只写一份，见 ART_MATRIX.md。

规格矩阵（容器比例先算再选图）：
  wide  16:9  800×450   横幅 / PC 主视觉 / 详情页大图
  card   4:3  560×420   列表卡片（宽屏列数规则下缩略图不超上限）
  sq     1:1  400×400   头像 / 专家 / 用户 / 九宫格
  tall   9:16 360×640   移动主视觉 / 侧栏（模糊延展背景，主体完整不裁切）
  mini  16:9  320×180   时间线 / 表格 / 聊天回执小图

复跑：cd /data/workspace/sumfarm-v1.7.0 && python3 slice_assets.py
依赖：Pillow（沙盒已预装）；纯格式转换不涉及内容编辑，不改变图片语义。
"""
import os, json, sys
from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "assets/img/src")
OUT = os.path.join(ROOT, "assets/img/art")

TOPICS = ["plain", "terrace", "greenhouse", "lawn", "wedding",
          "camp", "harvest", "fieldjob", "expert", "forum"]
SLOTS = {
    "wide":  (800, 450, "16:9"),
    "card":  (560, 420, "4:3"),
    "sq":    (400, 400, "1:1"),
    "tall":  (360, 640, "9:16"),
    "mini":  (320, 180, "16:9"),
}


def fit_crop(im, w, h):
    """等比缩放 + 中心裁切；主体居中构图，裁掉的是边缘留白，不裁主体大半。"""
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = max(w, int(round(sw * scale))), max(h, int(round(sh * scale)))
    r = im.resize((nw, nh), Image.LANCZOS)
    x, y = (nw - w) // 2, (nh - h) // 2
    return r.crop((x, y, x + w, y + h))


def fit_contain_blur(im, w, h):
    """9:16 竖版：主体 16:9 完整居中，上下用同图模糊延展填充，避免上下双向裁切。"""
    bg = fit_crop(im, w, h).filter(ImageFilter.GaussianBlur(20))
    bg = ImageEnhance.Brightness(bg).enhance(0.86)
    bg = ImageEnhance.Color(bg).enhance(0.72)
    sw, sh = im.size
    iw = w
    ih = max(1, int(round(sh * iw / sw)))
    fg = im.resize((iw, ih), Image.LANCZOS)
    canvas = bg.convert("RGB").copy()
    canvas.paste(fg, (0, (h - ih) // 2))
    return canvas


def save(im, path):
    """按用途分档输出 WebP：源图保细节，大图重压，小图保边缘，背景最省。"""
    longest = max(im.size)
    name = os.path.basename(path).lower()
    if name.startswith("src_"):
        q, method = 82, 4
    elif longest >= 1000:
        q, method = 72, 6
    elif longest >= 500:
        q, method = 76, 4
    else:
        q, method = 80, 4
    im.convert("RGB").save(path, "WEBP", quality=q, method=method)


def main():
    if not os.path.isdir(SRC):
        print("缺源图目录 %s；请先按 ART_MATRIX.md 取回 10 张题材主视觉" % SRC)
        return 2
    os.makedirs(OUT, exist_ok=True)
    made, missing = [], []
    for topic in TOPICS:
        p = os.path.join(SRC, "src_%s.webp" % topic)
        if not os.path.exists(p):
            missing.append(p); continue
        im = Image.open(p).convert("RGB")
        # 收敛源图到统一尺寸，保证复跑结果稳定
        src_small = im.resize((800, 450), Image.LANCZOS)
        save(src_small, os.path.join(SRC, "src_%s.webp" % topic))
        for slot, (w, h, ratio) in SLOTS.items():
            if slot == "tall":
                out = fit_contain_blur(im, w, h)
            else:
                out = fit_crop(im, w, h)
            name = "sub_%s_%s.webp" % (topic, slot)
            save(out, os.path.join(OUT, name))
            made.append({"file": "assets/img/art/" + name, "topic": topic,
                         "slot": slot, "ratio": ratio, "w": w, "h": h})
    if missing:
        print("缺源图：%s" % ", ".join(missing)); return 2
    manifest = {"version": "1.7.0", "topics": TOPICS,
                "slots": {k: {"w": v[0], "h": v[1], "ratio": v[2]} for k, v in SLOTS.items()},
                "files": made}
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print("切图完成：%d 张，manifest 已写入" % len(made))
    return 0


if __name__ == "__main__":
    sys.exit(main())
