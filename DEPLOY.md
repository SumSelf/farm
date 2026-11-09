# 闪马田园 SUMFARM · 部署说明（静态前端 / 前后端彻底分离）

## 1. 交付结构

**发布形态（定稿，不再拆分）**：**一个包、一个站**。`sumfarm-v1.7.0.zip` 解压后只有一个顶层文件夹
`sumfarm-v1.7.0/`，把它的内容挂到**同一个站点根**即可，全部 118 页共用这一份 `assets/`。
`admin/` 只是这个站点根下**一个独立文件夹**：16 页后台、独立登录 `admin/login.html`、独立 `admin.css`，
不与前台共用导航与账号体系；它**不是**另一个包、另一个站点、也不需要独立域名或第二套资源目录。
前台 102 页全部在站点根，普通用户在导航 / 页脚 / 移动浮层 / 站点地图看不到任何后台入口；
`/admin/` 的实际拦截由运维侧 Nginx 白名单或 HTTP Basic 生效（见第 6 节）。
交付物只有 `sumfarm-v1.7.0.zip` 一个文件，无前台包、后台包、合并分发包之分。

```
sumfarm-v1.7.0/
├── 118 个 .html                102 个前台页（根目录）+ 16 个后台页（admin/，独立文件夹）
│   ├── 主频道 25 页           首页、田园、活动、农产品、视频、宣发、论坛、
│   │                         专家、接单、个人、订单、工单、搜索、404 及其详情/编辑页
│   │                         + 前台登录 / 注册 / 找回口令 3 页
│   ├── 田园子页 13 页          按地区/承包/土壤/分布、对比、图册、评论、关注、合同、支付、生效、管理
│   ├── 活动场地 10 页          日历、报名、签到、回顾、成员、预约、菜单、婚纱、露营、运动
│   ├── 农产品 8 页             当季、溯源、购物车、结算、配送、签收、库存、评价
│   ├── 论坛 8 页               四个版块独立页、精华、我的帖子、发布成功、版规
│   ├── 专家 7 页               排行、认证、积分口径、专栏、问答、实践、管理历史
│   ├── 接单工单 12 页          附近/已接/关联、接单、回执、验收、结算、历史、四类作业详情
│   ├── 个人中心 10 页          资料、安全、通知、收藏、关注、地址、票据、绑定、帮助、注销
│   ├── 公共 8 页               帮助、关于、联系、协议、隐私、免责、站点地图、维护
│   └── 后台 16 页              独立登录、总览、三级审核工作台、九类信息管控、
│                              审计日志、字典、权限、导出、复审与终审
├── assets/css/site.css / admin.css      前台 / 后台独立样式
├── assets/js/i18n.js / page-copy.js     中英真文案（通用键 + 每页独立文案）
├── assets/js/auth.js                    前台账号体系 + 唯一一份站内链接构造
├── assets/js/mock-data.js               模拟数据（17 个数据集）
├── assets/js/api.js                     真实接口函数（含注释与返回类型）
├── assets/js/nav.js / app.js            统一导航 / 全站分派与交互
├── assets/img/*.webp                     17 张成品主视觉（WebP）：13 张通用 + 论坛 / 专家
│                                         频道专属 hero 各 16:9 / 9:16 共 4 张
├── assets/img/src/*.webp                 10 张题材源图（WebP，收敛为 800×450，供切图复跑）
├── assets/img/art/sub_*.webp             10 题材 × 5 规格 = 50 张切图
├── assets/img/art/manifest.json         切图清单（题材 / 规格 / 声明尺寸）
├── robots.txt                           后台不进公开索引
├── SUMFARM_BASELINE.md                  开工基线（定稿）
├── BUTTON_AUDIT.md                      按钮 / 栏目 / 内容走查报告
├── ART_MATRIX.md                        素材用途 × 规格矩阵与 pagename_id 映射
├── DEPLOY.md                            本文件
├── CHECK.md                             全量静态回归自查记录
├── RUNTIME.md                           真实服务环境双视口运行时验收报告
├── RUNTIME_batch1..7.json               7 批验收原始数据
├── slice_assets.py                      素材切图脚本（构建页面之后执行，可幂等复跑）
├── make_hero_bg.py                      论坛 / 专家频道 hero 专属主视觉生成脚本（排在切图之后）
├── verify.py                            全量静态回归脚本
└── runtime_check.py                     运行时验收脚本（自带 HTTP 服务，自动发现全站页面并分批）
```
顶层目录名与交付包名保持 `sumfarm-v1.7.0`（一个包、一次发布，不因样式改动改名）；CSS 变更后**静态资源版本号已全站刷为 `?v=1.7.2`**，避免长缓存仍取旧样式导致 hero 改动不生效。
全站内容图均为真实田园成图：按 `pagename_id` 由 `mock-data.js` 的 `art()` 解析题材与规格，
不再有矢量色卡占位；后台 16 页保持纯素，不注入田园题材装饰图。
本包是构建完成的产品级静态站点，直接部署即可；包内 `slice_assets.py` / `make_hero_bg.py` /
`verify.py` / `runtime_check.py` 分别用于题材切图、频道专属 hero 主视觉、全量静态回归
与真实服务环境分批验收，复跑命令见第 4 节。新增的 4 张 hero 图为全新文件名、无旧缓存，
故全站 `?v=1.7.2` 与交付包名保持不变，仍是「一个包、一次发布」。
前台账号体系与后台独立登录为两套入口；后台地址不在导航、页脚、移动浮层、站点地图中暴露，
且 `robots.txt` 屏蔽 `/admin/`，仅由运维单独分发。
子页按 `data-tpl`（list / detail / table / form / flow / info / chat / gallery / success / stats / map）
与 `data-ds` 驱动同一份渲染器，页面标题、首屏文案与正文逐页独立，不做静态写死。

## 2. 前后端 / 动静态分离
- 所有 HTML 为纯静态模板，不含服务端渲染逻辑，不内联业务数据。
- 业务数据只来自 `assets/js/mock-data.js`（模拟）或 `assets/js/api.js`（真实接口）。切换开关：`API.config.useMock`，默认 `true`。
- 切到真实后端：把 `useMock` 置 `false`，按 `api.js` 中 `ENDPOINTS` 与每个函数注释的路径、方法、参数、返回类型接入；前端不需要改动。
- 详情页一律 `?id=` 驱动；列表 `?page=`；搜索 `?q=`；语言 `?lang=zh|en`；后台模块 `?m=`。

## 3. Nginx 参考配置
```nginx
server {
    listen 80;
    server_name iarm.fun;   # 线上域名；如需 www 可另加 server_name www.iarm.fun;
    root /var/www/sumfarm-v1.7.0;
    index index.html;

    # HTML 不缓存
    location ~ \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    # 静态资源长缓存（版本号 ?v=1.7.2 变更即刷新）
    location ^~ /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # MIME
    types {
        text/html                             html;
        text/css                              css;
        application/javascript                js;
        # 站点图片已全量转为 WebP；以下两行保留兼容兜底（当前包内无 PNG/JPG 文件）
        image/png                             png;
        image/jpeg                            jpg jpeg;
        image/svg+xml                         svg;
        image/webp                            webp;
        application/json                      json;
    }
    charset utf-8;
    gzip on;
    # WebP 本身已是压缩格式，不再列入 gzip_types（二次 gzip 无收益且浪费 CPU）
    gzip_types text/css application/javascript image/svg+xml application/json;

    error_page 404 /404.html;
    location = /404.html { internal; }
}
```
- 纯静态多页，不做 SPA history fallback；`404.html` 提供回首页与搜索入口。
- 版本号刷新方式：全量替换 `?v=1.7.2` 为新版本号后重新上传 `assets/`，HTML 因 no-cache 立即生效。

## 4. 复跑命令（分批，不串联重命令）
```bash
cd /data/workspace/sumfarm-v1.7.0
python3 make_hero_bg.py         # 频道专属 hero 主视觉（幂等复跑）
python3 verify.py                 # 全量静态回归
python3 -m py_compile verify.py  # 校验脚本自身语法
```
打包单独一条，完整性校验单独一条：
```bash
cd /data/workspace && zip -rq sumfarm-v1.7.0.zip sumfarm-v1.7.0
unzip -t sumfarm-v1.7.0.zip && unzip -l sumfarm-v1.7.0.zip | tail -n 3
```

## 5. 真实服务环境验收（本轮已执行，结果与明细见 `RUNTIME.md`）
- 环境：本地 HTTP 服务 + Chromium 无头浏览器，**不使用 `file://`**；双视口 1440×900 / 390×844。
- 分批执行：自动发现全站 **118 页**，每批 18 页（低于 20 页上限），共 **7 批**；双视口合计 **236 次页面取样**。
- 等待策略：`networkidle` + 700ms 重绘 + 滚动到底 600ms + 强制 eager 900ms，懒加载全部完成后才取样；取样取完整 `body.innerText`。
- 从首页出发逐频道点击导航，再逐页加载；交互按「用户做了 X → 得到 Y」验收 **115 项**，含前台登录 / 注册合并双 Tab 与找回校验、后台隐藏与独立入口、后台侧栏—审核—返回—退出闭环、删除二次确认、ESC 关闭、全选可逆、收藏、主按钮配色、移动浮层、英文子页、子页 `?id=` 差异化、分页换页、表单反馈、素材三项、视图走查 12 项、上一轮首屏按钮与田园挂靠工单 11 项，以及逐按钮问答与五类画像的 18 项：首页唯一主按钮、四类画像八入口逐条点击、未登录 / 商家 / 租赁用户三态显隐、中英返回目标、接单双身份说明、个人查看档案、专家页产学研闭环、两处自解释文案，以及上一轮新增的 12 项：`sf-hero` 遮罩收紧而 body 罩不变、对比页多选候选与空态、勾 2 块生成清单且相同项缩减 / 不同项高亮、只看不同项切换、5 个 ids 收敛 4 列、英文对比页、清空重选、工单总览文字行与状态徽章、工单详情六步流程与十条明细、退回分支、创建页明细必填与固定流程说明、接单页状态徽章；本轮再新增 2 项：hero 眉标标签有实底可辨、hero 容器底色/边框/落影与整体背景分层可见。
- 【历史轮次】视觉微调曾把 `sf-hero-mask` 回调到 .93/.86/.70、hero 改更亮底色 + 深边框 + 落影、眉标改浅蓝实底标签；`--sf-veil .88` 未动。**本轮（当前定稿）**：用户反馈「hero 背景颜色太浅问题没有解决」，实测 hero `rgb(255,253,247)` 与 body `rgb(247,244,236)` 只差 8/9/11，近白罩把田园色洗没；已改为明确浅田绿实底 `--sf-hero-base:#D2E4C8` + 田绿罩 `rgba(210,228,200,.96/.86/.68)` + 低饱和提色，文字对比度标题 10.07:1 / 说明 5.30:1 / 眉标 6.40:1 全过 AA。CSS 变更后静态资源版本号由 `?v=1.7.0` 全站刷新为 **`?v=1.7.2`**，交付包名与顶层目录名不变；部署侧按长缓存配置即可，不会出现「改了没生效」。详见 `BUTTON_AUDIT.md` 第 13 节。
- 本轮结果：**运行时错误 0 / 请求失败 0 / 破图 0 / 横向溢出 0 页 / 内容充盈未达标 0 页 / 交互 115 项全通过**。
- 逐页内容充盈口径：前台动态区文字 ≥300 字符且 ≥3 张正文图片；后台纯素豁免图片、文字 ≥200 字符，见 `BUTTON_AUDIT.md` 第 6 节。
- 素材校验：`slice_assets.py` 产出 50 张 WebP 切图与清单，`verify.py` 逐条核对 WebP 有效性、声明尺寸与「题材数 × 规格数」；运行时确认内容图全部为真实成图、破图 0。
- 视图走查口径：第 8 节覆盖背景淡化、按钮/文字配色、搜索框归属、下拉防抖、论坛文字列表、接单与个人功能分区；第 9 节覆盖账号合并、首屏按钮去重、农事挂靠田园与专家指导工单；第 10 节与 `USER_WALKTHROUGH.md` 覆盖普通用户逐按钮问答与五类用户画像任务链，均按使用者视角逐项点过。
- 误报更正已登记在 `RUNTIME.md` 与 `CHECK.md`，不留「已知问题」。
- 语法检查（`node --check` + 静态回归）与运行时验证两者都做，语法检查不代替运行时。
- 复跑命令（在站点根目录执行，脚本自带 HTTP 服务并由系统分配空闲端口；每条命令单独跑若干批，避免单次超时）：
```bash
python3 slice_assets.py                 # 可选：重出 50 张题材切图与 manifest（源图已在包内）
python3 verify.py                       # 全量静态回归（118 HTML + 7 JS + 2 CSS + 73 WebP）
python3 runtime_check.py 1              # 第 1 批：18 页 × 双视口 + 115 项交互验收
python3 runtime_check.py 2              # 第 2 批，依次到 7；末批合并生成 RUNTIME.md
# 或按批次逐条执行：for b in $(seq 1 7); do python3 runtime_check.py $b; done
```
- `slice_assets.py` 需要 Pillow；`runtime_check.py` 需要 Python `playwright` 与 Chromium；无浏览器环境时仍可只跑 `verify.py`。
- 全站静态回归 `python3 verify.py` 结果：**错误 0**；16 条提示均为后台纯素页按基线豁免装饰图，非缺陷。静态回归另含 **18 组 WCAG 对比度复算**（含本轮新增的 hero 深字/浅罩、次按钮、眉标、分区标题等 7 组）、按钮动作分支覆盖、后台隐藏与错层路径扫描、栏目归属校验、50 张切图清单逐条核对、真实成图与页面题材归属扫描，以及搜索框归属、下拉桥接、文字列表/功能分区样式、接单双分区四类视图断言；上一轮再增 hero 按钮去重、账号合并双 Tab、专家指导工单统一清单、farmId 挂靠、个人田园每行远程创建工单五类断言；本轮再增按钮 title 自解释、`data-role` 合法性与三态显隐、91 个子页返回带目标、首页四类画像八入口与中英真文案、歧义文案清零、`USER_WALKTHROUGH.md` 完整性共六组断言。

### 权限边界（第 5 节验收口径的补充）
只写 `/data/workspace`；不初始化、不提交、不推送版本库；不主动查线上；上传延迟导致的线上表现不作验收依据。


## 6. 单点部署（发布形态回退，后台不得对外）

交付物**只有一个包**：`sumfarm-v1.7.0.zip`，顶层目录 `sumfarm-v1.7.0/`。解压后把该目录的**全部内容**挂到站点根目录 `/` 即可，前台与后台在同一台站点、同一棵目录树里，共享一份 `assets/`。

```
sumfarm-v1.7.0/
├─ index.html ... 102 个前台 HTML      # 首页四子栏目、田园档案与对比、论坛、专家、接单、个人、账号、帮助与公共页
├─ admin/                              # 16 个后台 HTML：独立登录 + 总览 + 九类管控 + 三级审核工作台
│   ├─ login.html                      # 后台独立入口
│   └─ index.html / audit*.html / workorders.html / users.html / ...
├─ assets/                             # 2 CSS + 7 JS + 73 WebP ≈ 2.6 MB（前后台共用，后台页用 ../assets/ 引用）
├─ robots.txt                          # Disallow: /admin/；同时屏蔽验收脚本与报告
├─ sitemap.html                        # 公开站点地图，0 个后台链接
├─ DEPLOY.md / CHECK.md / RUNTIME.md   # 部署、静态回归、7 批运行时验收
└─ USER_WALKTHROUGH.md / BUTTON_AUDIT.md / SUMFARM_BASELINE.md / ART_MATRIX.md
```

### 后台隔离口径（单点下靠访问控制，不是物理分离）

单点部署后，后台 HTML 物理上与前台在同一台站点上，**能凭 URL 直接请求到**。因此「后台不得对外」由下面五层共同保证，缺一层都不算达标：

1. **独立登录**：`admin/login.html`，与前台合并账号页不共用账号体系；后台总览—审核—返回—退出闭环在同一目录树内自洽，链接由 `auth.js` 的 `decorate` 按当前目录归一化，不会叠出 `/admin/admin/`。
2. **前台 0 入口**：顶部导航、折叠浮窗、页脚、手机底部栏、移动「更多」浮层、站点地图、所有前台 HTML 均不出现后台链接；`sitemap.html` 只列公开页面。
3. **不进索引**：站点根 `robots.txt` 为 `Disallow: /admin/`；后台 16 页 `<head>` 全部带 `<meta name="robots" content="noindex,nofollow">`，双保险。
4. **运维侧访问控制（强烈建议，实际生效层）**：前台静态资源无服务端鉴权，仅靠「不放链接」不能阻止直接输网址。部署时请在 Nginx 对 `/admin/` 加 IP 白名单或 HTTP Basic，示例：

```nginx
location ^~ /admin/ {
    # 方案 A：仅内网 / 运维出口可访问
    allow 10.0.0.0/8;
    allow 127.0.0.1;
    deny  all;
    # 方案 B：改为 HTTP Basic（二选一）
    # auth_basic "SUMFARM Ops";
    # auth_basic_user_file /etc/nginx/conf.d/sumfarm.htpasswd;
    try_files $uri $uri/ =404;
}
```

5. **地址单独分发**：后台地址只由运维告知平台管理员，不写进任何前台可见文案、不出现在公开导航与帮助文档里。

> 明确的限定：这是**逻辑隔离**，不是物理隔离。当前「一个包、一个站、`admin/` 独立文件夹」就是最终形态；
> 不再拆包、不再有独立后台域名。若未来确需后台与前台分机部署，属于另一期工程，与本包无关。

### 部署步骤

```bash
unzip -t sumfarm-v1.7.0.zip                 # 完整性校验
unzip sumfarm-v1.7.0.zip -d /var/www/
# 把 sumfarm-v1.7.0/ 的内容作为站点根（或将其内容拷到站点根），配置 Nginx：
#   HTML 不缓存 / 资源长缓存（?v=1.7.2）/ 404 指向 404.html / 正确 MIME / /admin/ 按上文加白名单
```

`verify.py`、`runtime_check.py`、`slice_assets.py` 是验收与素材工具，不参与页面渲染；正式部署时可从站点根剔除，不影响运行（robots.txt 已屏蔽）。

### 复跑命令（在解压后的目录执行）

```bash
python3 verify.py                 # 全量静态回归 → CHECK.md
for b in 1 2 3 4 5 6 7; do python3 runtime_check.py $b; done   # 双视口逐页 → RUNTIME.md
unzip -t ../sumfarm-v1.7.0.zip   # 交付包完整性
```

验收口径仍为使用者视角：开发态 = 交付态，118 页（102 前台 + 16 后台），静态回归 0 错误，7 批真实 HTTP + Chromium 双视口 **236 次取样 / 115 项交互**，运行时错误 0 / 破图 0 / 横向溢出 0 页。

**如实说明**：按用户说明，线上域名为 `iarm.fun`，站点当前在该域名下运行。用户此前附的站点链接在对话侧资源解析服务请求失败，未据此判断线上状态；本轮**不主动查线上**，线上表现不作验收依据，也未由本方执行部署 / 域名切换；本次交付包需由运维更新到线上，并同步 Nginx `server_name`、`robots.txt` 的 Sitemap 绝对地址、前端 `api.js` 的 API base、TLS 证书与静态资源缓存刷新。备案号 `蜀ICP备18013136号` 沿用，部署时由运维按实际接入信息办理。每页独立设计图、每条模拟记录单独拍摄的照片仍是遗留项，见 `SUMFARM_BASELINE.md`。


## 7. 图片压缩为 WebP（网站专用格式）

用户反馈「额外图片太大，更新到 git 上之后显示很慢」。根因是站点素材全为 **PNG 位图**：73 张共 **36.66 MB**，单张背景图 1–2 MB，首页一次要拉主视觉、底纹与多张切图；仓库体积大、首屏加载慢。本轮把全部图片转为 **WebP**（网站专用格式，Chrome / Edge / Firefox / Safari 14+ 与移动端浏览器全覆盖，支持有损压缩与透明通道）。

| 项目 | 压缩前 | 压缩后 |
|---|---|---|
| 格式 | 73 张 PNG | 73 张 WebP（同名改后缀） |
| 图片目录体积 | **36.66 MB** | **2.56 MB** |
| 降幅 | — | **93.0%** |
| 交付 zip | 38 MB | 约 3 MB |
| 单张最大（bg_field） | 2008 KB | 约 190 KB |

### 分档质量（按用途，不一刀切）

| 用途 | 质量 | 说明 |
|---|---|---|
| `bg_*` / `admin_bg` 背景底纹 | q=68，method=6 | 上面覆盖浅色罩，肉眼几乎无差，压得最狠 |
| ≥1000px 主视觉 | q=72，method=6 | 大图再省一点 |
| 500–999px 列表切图 | q=76 | 缩略图不超上限，细节够用 |
| <500px 小图 / 回执 | q=80 | 保文字与边缘 |
| `src_*` 题材源图 | q=82 | 供切图复跑，细节优先 |

### 做了什么、为什么不会破图

1. 图片文件同名改后缀为 `.webp`，**尺寸、构图、语义都不变**；原 PNG 全部删除，git 仓库不再保留大位图。
2. 全站引用同步：118 个 HTML 的 `<img src>` / `data-mobile-src`、2 个 CSS 的 `url()`、7 个 JS 的路径字面量、`assets/img/art/manifest.json` 的 50 条清单、`slice_assets.py` 的输入输出。
3. `slice_assets.py` 改为**直接产出 WebP**，复跑不会重新生成 PNG；`verify.py` 的素材校验改为 WebP 头 + Pillow 回读解码 + 尺寸核对，并新增第 26 组断言（0 个 PNG 文件 / 0 个 PNG 后缀引用 / 73 张 WebP 有效性 / 图片目录 ≤ 6 MB / manifest `format=webp` / MIME 与版本号齐备）。
4. **静态资源版本号刷新为 `v1.7.0`**：CSS 内容改了但 URL 没变时，浏览器/CDN 会命中长缓存里的旧 CSS，旧 CSS 里仍写着 PNG 路径，会直接破图。刷版本号后 HTML 不缓存 + 资源长缓存的配合才成立。
5. Nginx 已配 `image/webp webp;` MIME；WebP 本身是压缩格式，**不列入 `gzip_types`**（二次 gzip 无收益）。`types` 里的 `image/png` / `image/jpeg` 保留作兼容兜底，当前包内没有这两类文件。

### 兼容性与兜底

- WebP 覆盖率：Chrome / Edge / Firefox 全版本、Safari 14+（含 iOS 14+）、主流安卓浏览器。仍要兼容 Safari 13 及更老的环境时，需要额外保留一份 PNG 并用 `<picture>` 兜底，但那样仓库体积会回升，与本轮「减小体积」的目标冲突，故未采用。
- 若线上出现 WebP 无法解码的极端环境，`compress_images.py` 的统计报告 `compression_report.json` 保留了每张图的原始尺寸与前后体积，可用源图重新导出。

### 复跑命令

```bash
# 在开发态工作区（压缩工具位于工作区根，不随站点包发布）
python3 /data/workspace/compress_images.py --root <站点目录>/assets/img --ext .png
python3 <站点目录>/slice_assets.py         # 仅需重切题材图时；现在直接产 WebP
python3 <站点目录>/verify.py                # 第 26 组断言校验压缩结果
```

压缩工具会逐张回读校验 WebP 头与尺寸，任一失败即回滚该张，不留下损坏图片；统计写入 `/data/workspace/compression_report.json`。
