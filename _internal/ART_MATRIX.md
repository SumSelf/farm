# 闪马田园 SUMFARM · 素材用途 × 规格矩阵

本轮把全站内容图从「程序化矢量色卡」升级为**按题材生成、按规格切图、按 `pagename_id` 嵌入**的真实田园成图。
所有图片位仍输出 `<img>` 元素；功能性图标继续用内联 SVG，不换位图。

---

## 1. 统一风格锚点

| 占比 | 视觉语言 | 具体落地 |
|---|---:|---|
| 60% 真实田园 | 川西田畈、田垄曲线、竹篱木牌、竹筐、湿润土壤、晨雾竹林、柔和自然光 | 主体为实拍质感场景，低饱和青绿 / 土棕 / 米白 |
| 30% 科技 | 极淡青灰等距网格细线、圆点节点、几乎透明的生长曲线 | 只作空间标记，不盖住主体，不做发光特效 |
| 10% 可爱 | 一枚圆润线条小苗 / 小番茄 / 小云 / 小月亮笑脸 | 每图仅一处，位于角落，不重复堆砌 |

全部主视觉统一约束：主体居中、构图留白、**无任何文字、字母、数字、编号、logo、水印、人物**；同一 seed 保证色调一致。

## 2. 十张题材主视觉 → 子类归属

| # | 题材键 | 画面内容 | 归属频道 / 子类 |
|---:|---|---|---|
| 1 | `plain` | 川西平原共享田畈、空白木牌、竹篱、儿菜油菜苗 | 田园档案 · 按地区 / 承包 / 图册 |
| 2 | `terrace` | 浅丘层叠梯田、水稻油菜、山脚薄雾 | 田园档案 · 分布 / 宣发 / 公共页 |
| 3 | `greenhouse` | 育苗大棚、育苗盘、喷灌细雾、样株 | 田园档案 · 土壤 / 产学研 / 种植记录 |
| 4 | `lawn` | 活动草坪长桌、粗陶碗、竹棚小旗 | 田园活动 · 聚会 / 开会 / 菜单 |
| 5 | `wedding` | 竹编拱门、小野花、草坪木凳 | 田园活动 · 婚纱场地 |
| 6 | `camp` | 帆布帐篷、马灯、暮色灯串 | 田园活动 · 露营 / 运动场地 |
| 7 | `harvest` | 竹筐当季蔬菜、溯源木牌、稻草绳 | 农产品 · 当季 / 溯源 / 结算 |
| 8 | `fieldjob` | 翻好的地、锄头、洒水壶、回执照片夹 | 接单 / 工单 · 九类农事作业 |
| 9 | `expert` | 田间记录本、样株标牌、平板、取样盒 | 专家 / 产学研 · 实践 / 积分 / 审核 |
| 10 | `forum` | 田头小黑板、长木凳、种植图册 | 论坛 · 种植经验 / 技术咨询 |

题材池与内容子类的对应写在 `assets/js/mock-data.js` 的 `CAT_TOPIC` / `ART_TOPICS`，页面题材映射写在构建器的 `TOPIC_BY_PREFIX`，两处语义一致，各只写一份。

## 3. 规格矩阵（容器比例先算再选图）

| 规格键 | 比例 | 像素 | 用途 | 容器处理 |
|---|---|---:|---|---|
| `wide` | 16:9 | 800×450 | PC 横幅、详情页大图、hero 宽版 | 等比缩放，中心裁切边缘留白 |
| `card` | 4:3 | 560×420 | 列表卡片、宽屏多列网格 | 中心裁切；宽屏列数规则下缩略图不超上限 |
| `sq` | 1:1 | 400×400 | 头像、专家、用户、九宫格图册 | 中心裁切 |
| `tall` | 9:16 | 360×640 | 移动主视觉、侧栏、hero 竖版 | **主体完整居中，上下用同图模糊延展填充，不做上下裁切** |
| `mini` | 16:9 | 320×180 | 时间线、表格、聊天回执小图 | 等比缩放 |

10 题材 × 5 规格 = **50 张切图**，命名 `sub_<topic>_<slot>.webp`，全 ASCII、无空格、无中文。
清单 `assets/img/art/manifest.json` 由 `slice_assets.py` 生成，`verify.py` 逐条校验存在性、WebP 有效性与声明尺寸。

## 4. pagename_id 映射规则

**键**：`data-page`（页面名）+ 内容子类 + 记录 id，例如 `farms-region|farm|farm-3`、`account|user|U013`。

**唯一解析函数**：`assets/js/mock-data.js` 的 `art(pageId, cat, seed, slot)`

```
hash(pageId|cat|seed) → 题材池下标 → topic
slot 显式指定（列表 card / 头像 sq / 竖版 tall / 小图 mini）
    或按 hash 高位在 5 种规格中稳定散列
→ assets/img/art/sub_<topic>_<slot>.webp
```

约束：

- 同一 `pagename_id` 永远取到同一张图（稳定散列，刷新不跳图）。
- 不同 id 取到不同题材或不同规格；详情页文字与配图都按 URL 参数变化，不静态写死。
- 页面层只经 `app.js` 的 `artFor(cat, seed, slot)` 调用，`pgKey()` 读 `data-page`；映射关系不在页面层重复实现。
- `cover(kind, i, slot)` 为模拟数据每条记录生成封面；`gallery` 用 wide / card / sq 三种规格；`avatar` 用 sq。
- 兼容层 `svgThumb()` 保留函数名，但实现已改为返回真实切图路径，不再产出 `data:image/svg+xml`。

## 5. 页面 hero 题材归属

- 子页（89 页）：`build_subpages.py` 按 `pagename` 稳定散列到题材池，hero 宽版取 `sub_<topic>_wide.webp`，竖版取 `sub_<topic>_tall.webp`。
- 主页面（28 页）：hero 宽版沿用各频道成品主视觉，竖版按题材取 9:16 切图；`index.html` 保留专门生成的 9:16 首页主视觉。
- 题材池带权重：农产品组偏 `harvest`、论坛组偏 `forum`、专家组偏 `expert`，允许同类相邻题材出现，避免同组所有页面共用一张图。
- 后台 16 页保持纯素，**不注入任何田园题材装饰图**，按基线豁免图片位但文字内容不豁免。

## 6. 生成顺序（硬性）

```
build_pages.py        → 主页面骨架
build_subpages.py     → 89 个子页 + 每页中英真文案
slice_assets.py       → 10 题材主视觉切成 50 张切片 + manifest.json
verify.py             → 全量静态回归（含切片清单校验）
runtime_check.py 1..7 → 真实 HTTP + Chromium 双视口逐页验收
```

素材生成排在页面构建之后，不提前；脚本接在构建之后，可幂等复跑。
源图放在 `assets/img/src/src_<topic>.webp`（收敛为 800×450），复跑 `python3 slice_assets.py` 即可重出全部切片。

## 7. 与上一版的差异

| 项 | 上一版 | 本版 |
|---|---|---|
| 内容图 | 13 张成品 + 程序化 SVG 色卡充当多数卡片图 | 13 张成品 + 50 张题材切图，全站内容图均为真实成图 |
| 移动端主视觉 | 子页统一套用首页 9:16 图 | 按页面题材取专属 9:16 切图 |
| 记录级配图 | 每 3 条用一次成品，其余色卡 | 每条按 id 稳定取图，题材与规格都不同 |
| 图片路径 | 部分为 `data:image/svg+xml` 字符串 | 全部为 `assets/img/art/*.webp`，无占位 |
| 规格校验 | 无 | manifest 逐条校验尺寸与 WebP 有效性 |

`BUTTON_AUDIT.md` 第 6 节的「每页 ≥3 张正文图片位」口径不变，本轮只是把图片来源从色卡换成成图。


## 图片格式与体积（本轮压缩）

全站素材统一为 **WebP**（网站专用格式），不保留 PNG。`slice_assets.py` 直接输出 WebP：源图 q=82、≥1000px q=72、500–999px q=76、<500px q=80，method=4（大图 6）。73 张图共 **2.56 MB**，较压缩前的 36.66 MB 省 **93.0%**；尺寸与规格矩阵不变，manifest 增加 `format: "webp"` 字段。部署侧 MIME 与缓存口径见 `DEPLOY.md` 第 7 节。


## 频道级 hero 专属主视觉（本轮新增，2 题材 × 2 规格）

用户反馈「论坛和专家 hero 没有设计图」：两频道此前共用 `bg_tech.webp` 通用科技底纹与
散列切图 `sub_greenhouse_tall.webp`，没有属于自己频道的画面。本轮以同批田园成图为画面主体，
按 60% 真实田园 + 30% 科技细网格 / 数据点 + 10% 圆润气泡 / 笑脸重新设计成两张专属背景，
左侧 45% 用同图柔化 + 浅田绿留白（smoothstep 平滑过渡，整图轻微高斯柔化消除硬边），
右侧保持清晰主体；色调与 `--sf-hero-base #D2E4C8` 统一。

| 用途 | 文件（全 ASCII） | 比例 | 声明尺寸 | 归属页面 | 容器比例 |
|---|---|---|---|---|---|
| 论坛 PC hero | `assets/img/forum_hero.webp` | 16:9 | 1280×720 | `forum*.html` 共 11 页 | PC hero 1392×340，object-fit:cover |
| 论坛移动 hero | `assets/img/forum_hero_m.webp` | 9:16 | 720×1280 | 同上 | 移动 hero 362×311，主体完整不裁 |
| 专家 PC hero | `assets/img/expert_hero.webp` | 16:9 | 1280×720 | `expert*.html` + `experts.html` 共 9 页 | 同上 |
| 专家移动 hero | `assets/img/expert_hero_m.webp` | 9:16 | 720×1280 | 同上 | 同上 |

- 归属规则只写一份：`forum` 前缀 → `forum_hero`，`expert` 前缀 → `expert_hero`；
  列表 / 卡片缩略图仍由 `mock-data.js` 的 `art()` 按题材池解析，不与 hero 混用。
- 生成脚本 `make_hero_bg.py` 排在页面构建与 `slice_assets.py` 之后，可幂等复跑；
  `manifest.json` 的 `hero_images` 节由两处脚本共同维护，复跑不丢。
- 4 张均为 WebP（q=72 / method=6），合计约 121 KB；新增资源无旧缓存，故全站 `?v=1.7.5`
  保持不变，交付包名 `sumfarm-v1.7.0` 不变，仍是「一个包、一次发布」。

## 价格公示频道 hero 素材归属（本轮）

价格公示 8 个前台页复用首页双主视觉，不新增题材切图，避免同一频道出现第二套画风：

| 用途 | 文件 | 比例 | 声明尺寸 | 归属页面 | 容器比例 |
|---|---|---|---|---|---|
| 价格频道 PC hero | `assets/img/home_hero.webp` | 16:9 | 1280×720 | `price*.html` 共 8 页 | PC hero 1392×340，object-fit:cover |
| 价格频道移动 hero | `assets/img/home_hero_m.webp` | 9:16 | 720×1280 | 同上 | 移动 hero 362×311，主体完整不裁 |

后台 `admin/prices.html` 按基线保持纯素，不注入任何田园装饰图。
全站 WebP 仍为 77 张；价格挂接条内的图标与表格均为 CSS / 内联 SVG，不占用图片位。

## 五角色业务办理节点 hero 归属（本轮）

新增 4 个闭环页面复用已有成图，不新增题材切图，避免同一类节点出现第三套画风：

| 页面 | 用途 | 16:9 | 9:16 | 归属 |
|---|---|---|---|---|
| `order-detail.html` | 订单详情 | `home_hero.webp` | `home_hero_m.webp` | 个人 / 订单链 |
| `submission-status.html` | 商家发布审核进度 | `home_hero.webp` | `home_hero_m.webp` | 田园 / 商家链 |
| `merchant-orders.html` | 商家收到的订单 | `home_hero.webp` | `home_hero_m.webp` | 个人 / 商家链 |
| `expert-conclusion.html` | 专家技术结论 | `expert_hero.webp` | `expert_hero_m.webp` | 专家频道专属（manifest 专家页 9 → 10） |

业务节点内的表格、状态时间线、对话框与动作条均为 CSS / 内联 SVG，不占用图片位；
后台 `admin/` 的业务节点按基线保持纯素，不注入田园装饰图。

## 素材用途增补（第 33 轮）

新增 29 个前台页复用既有题材切图：专家 6 页用 `expert_hero` 频道专属 16:9 / 9:16，活动运营 5 页用 `sub_lawn`，农户资金 3 页用 `sub_fieldjob`，其余用 `home_hero` 或 `sub_plain` / `sub_harvest`。后台 4 页保持纯素、不注入装饰图；本轮不新增图片文件，77 张 WebP 清单不变。
