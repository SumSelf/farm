# 闪马田园 SUMFARM · 部署说明（静态前端 / 前后端彻底分离）

## 1. 交付结构

**发布形态（定稿，不再拆分）**：**一个包、一个站**。`sumfarm-v1.7.0.zip` 解压后只有一个顶层文件夹
`sumfarm-v1.7.0/`，把它的内容挂到**同一个站点根**即可，全部 166 页共用这一份 `assets/`。
`admin/` 只是这个站点根下**一个独立文件夹**：16 页后台、独立登录 `admin/login.html`、独立 `admin.css`，
不与前台共用导航与账号体系；它**不是**另一个包、另一个站点、也不需要独立域名或第二套资源目录。
前台 143 页全部在站点根，普通用户在导航 / 页脚 / 移动浮层 / 站点地图看不到任何后台入口；
`/admin/` 的实际拦截由运维侧 Nginx 白名单或 HTTP Basic 生效（见第 6 节）。
交付物只有 `sumfarm-v1.7.0.zip` 一个文件，无前台包、后台包、合并分发包之分。

```
sumfarm-v1.7.0/
├── 164 个 .html                143 个前台页（根目录）+ 21 个后台页（admin/，独立文件夹）
│   ├─ order-detail.html 等 4 页  # 订单详情 / 发布审核进度 / 收到的订单 / 技术结论（五角色闭环节点）
│   ├─ price*.html             8 个价格公示频道页（总览 / 租金 / 场地 / 工单 / 农产品 / 规则 / 调价 / 试算）
│   └─ admin/prices.html       后台价格公示管理（独立登录、noindex，不进公开索引）
│   ├── 主频道 25 页           首页、田园、活动、农产品、视频、宣发、论坛、
│   │                         专家、接单、个人、订单、工单、搜索、404 及其详情/编辑页
│   │                         + 账号 2 页（登录注册合并页 + 找回口令）
│   ├── 田园子页 13 页          按地区/承包/土壤/分布、对比、图册、评论、关注、合同、支付、生效、管理
│   ├── 活动场地 10 页          日历、报名、签到、回顾、成员、预约、菜单、婚纱、露营、运动
│   ├── 农产品 8 页             当季、溯源、购物车、结算、配送、签收、库存、评价
│   ├── 论坛 8 页               四个版块独立页、精华、我的帖子、发布成功、版规
│   ├── 专家 7 页               排行、认证、积分口径、专栏、问答、实践、管理历史
│   ├── 接单工单 12 页          附近/已接/关联、接单、回执、验收、结算、历史、四类作业详情
│   ├── 个人中心 10 页          资料、安全、通知、收藏、关注、地址、票据、绑定、帮助、注销
│   ├── 公共 8 页               帮助、关于、联系、协议、隐私、免责、站点地图、维护
│   └── 后台 21 页              独立登录、总览、三级审核工作台、九类信息管控、
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
├── RUNTIME_batch1..8.json               10 批验收原始数据
├── ROLE_FLOW_WALKTHROUGH.md           # 五类使用者业务内容闭环走查报告
├── slice_assets.py                      素材切图脚本（构建页面之后执行，可幂等复跑）
├── make_hero_bg.py                      论坛 / 专家频道 hero 专属主视觉生成脚本（排在切图之后）
├── verify.py                            全量静态回归脚本
└── runtime_check.py                     运行时验收脚本（自带 HTTP 服务，自动发现全站页面并分批）
```
顶层目录名与交付包名保持 `sumfarm-v1.7.0`（一个包、一次发布，不因样式改动改名）；CSS 变更后**静态资源版本号已全站刷为 `?v=1.7.8`**，避免长缓存仍取旧样式导致 hero 改动不生效。
全站内容图均为真实田园成图：按 `pagename_id` 由 `mock-data.js` 的 `art()` 解析题材与规格，
不再有矢量色卡占位；后台 21 页保持纯素，不注入田园题材装饰图。
本包是构建完成的产品级静态站点，直接部署即可；包内 `slice_assets.py` / `make_hero_bg.py` /
`verify.py` / `runtime_check.py` 分别用于题材切图、频道专属 hero 主视觉、全量静态回归
与真实服务环境分批验收，复跑命令见第 4 节。新增的 4 张 hero 图为全新文件名、无旧缓存，
故全站 `?v=1.7.8` 与交付包名保持不变，仍是「一个包、一次发布」。
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

    # 静态资源长缓存（版本号 ?v=1.7.8 变更即刷新）
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
- 版本号刷新方式：全量替换当前 `?v=1.7.8` 为新版本号后重新上传 `assets/`，HTML 因 no-cache 立即生效。

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
- 分批执行：自动发现全站 **166 页**，每批 18 页（低于 20 页上限），共 **10 批**；双视口合计 **332 次页面取样**。
- 等待策略：`networkidle` + 700ms 重绘 + 滚动到底 600ms + 强制 eager 900ms，懒加载全部完成后才取样；取样取完整 `body.innerText`。
- 从首页出发逐频道点击导航，再逐页加载；交互按「用户做了 X → 得到 Y」验收 **237 项**，含前台登录 / 注册合并双 Tab 与找回校验、后台隐藏与独立入口、后台侧栏—审核—返回—退出闭环、删除二次确认、ESC 关闭、全选可逆、收藏、主按钮配色、移动浮层、英文子页、子页 `?id=` 差异化、分页换页、表单反馈、素材三项、视图走查 12 项、上一轮首屏按钮与田园挂靠工单 11 项，以及逐按钮问答与五类画像的 18 项、本轮接口目录 / 数据仿真 10 项：首页唯一主按钮、四类画像八入口逐条点击、未登录 / 商家 / 租赁用户三态显隐、中英返回目标、接单双身份说明、个人查看档案、专家页产学研闭环、两处自解释文案，以及上一轮新增的 12 项：`sf-hero` 遮罩收紧而 body 罩不变、对比页多选候选与空态、勾 2 块生成清单且相同项缩减 / 不同项高亮、只看不同项切换、5 个 ids 收敛 4 列、英文对比页、清空重选、工单总览文字行与状态徽章、工单详情六步流程与十条明细、退回分支、创建页明细必填与固定流程说明、接单页状态徽章；本轮再新增 2 项：hero 眉标标签有实底可辨、hero 容器底色/边框/落影与整体背景分层可见；本轮再新增价格公示挂接交互：全站挂接条展开收起、类名隔离、详情页本单价格构成、总览九类目、流程跳转、24 块田租金表与回档案核对、试算参数变化与边界、FAQ 真答案、调价历史、后台发布进审核队列、六频道节点挂接。
- 【历史轮次】视觉微调曾把 `sf-hero-mask` 回调到 .93/.86/.70、hero 改更亮底色 + 深边框 + 落影、眉标改浅蓝实底标签；`--sf-veil .88` 未动。**【该轮定稿，非当前轮次】**用户反馈「hero 背景颜色太浅问题没有解决」，实测 hero `rgb(255,253,247)` 与 body `rgb(247,244,236)` 只差 8/9/11，近白罩把田园色洗没；已改为明确浅田绿实底 `--sf-hero-base:#D2E4C8` + 田绿罩 `rgba(210,228,200,.96/.86/.68)` + 低饱和提色，文字对比度标题 10.07:1 / 说明 5.30:1 / 眉标 6.40:1 全过 AA。【该轮历史值】CSS 变更后静态资源版本号由 `?v=1.7.0` 全站刷新为 **`?v=1.7.1`**，交付包名与顶层目录名不变；部署侧按长缓存配置即可，不会出现「改了没生效」。详见 `BUTTON_AUDIT.md` 第 13 节。
- 本轮结果：**运行时错误 0 / 请求失败 0 / 破图 0 / 横向溢出 0 页 / 内容充盈未达标 0 页 / 交互 237 项全通过**。
- 逐页内容充盈口径：前台动态区文字 ≥300 字符且 ≥3 张正文图片；后台纯素豁免图片、文字 ≥200 字符，见 `BUTTON_AUDIT.md` 第 6 节。
- 素材校验：`slice_assets.py` 产出 50 张 WebP 切图与清单，`verify.py` 逐条核对 WebP 有效性、声明尺寸与「题材数 × 规格数」；运行时确认内容图全部为真实成图、破图 0。
- 视图走查口径：第 8 节覆盖背景淡化、按钮/文字配色、搜索框归属、下拉防抖、论坛文字列表、接单与个人功能分区；第 9 节覆盖账号合并、首屏按钮去重、农事挂靠田园与专家指导工单；第 10 节与 `USER_WALKTHROUGH.md` 覆盖普通用户逐按钮问答与五类用户画像任务链，均按使用者视角逐项点过。
- 误报更正已登记在 `RUNTIME.md` 与 `CHECK.md`，不留「已知问题」。
- 语法检查（`node --check` + 静态回归）与运行时验证两者都做，语法检查不代替运行时。
- 复跑命令（在站点根目录执行，脚本自带 HTTP 服务并由系统分配空闲端口；每条命令单独跑若干批，避免单次超时）：
```bash
python3 slice_assets.py                 # 可选：重出 50 张题材切图与 manifest（源图已在包内）
python3 verify.py                       # 全量静态回归（166 HTML + 8 JS + 2 CSS + 77 WebP）
python3 runtime_check.py 1              # 第 1 批：18 页 × 双视口 + 237 项交互验收
python3 runtime_check.py 2              # 第 2 批，依次到 10；末批合并生成 RUNTIME.md
# 或按批次逐条执行：for b in $(seq 1 10); do python3 runtime_check.py $b; done
```
- `slice_assets.py` 需要 Pillow；`runtime_check.py` 需要 Python `playwright` 与 Chromium；无浏览器环境时仍可只跑 `verify.py`。
- 全站静态回归 `python3 verify.py` 结果：**错误 0**；21 条提示均为后台纯素页按基线豁免装饰图，非缺陷。静态回归另含 **18 组 WCAG 对比度复算**（含本轮新增的 hero 深字/浅罩、次按钮、眉标、分区标题等 7 组）、按钮动作分支覆盖、后台隐藏与错层路径扫描、栏目归属校验、50 张切图清单逐条核对、真实成图与页面题材归属扫描，以及搜索框归属、下拉桥接、文字列表/功能分区样式、接单双分区四类视图断言；上一轮再增 hero 按钮去重、账号合并双 Tab、专家指导工单统一清单、farmId 挂靠、个人田园每行远程创建工单五类断言；本轮再增按钮 title 自解释、`data-role` 合法性与三态显隐、91 个子页返回带目标、首页四类画像八入口与中英真文案、歧义文案清零、`USER_WALKTHROUGH.md` 完整性共六组断言。

### 权限边界（第 5 节验收口径的补充）
只写 `/data/workspace`；不初始化、不提交、不推送版本库；不主动查线上；上传延迟导致的线上表现不作验收依据。


## 6. 单点部署（发布形态回退，后台不得对外）

交付物**只有一个包**：`sumfarm-v1.7.0.zip`，顶层目录 `sumfarm-v1.7.0/`。解压后把该目录的**全部内容**挂到站点根目录 `/` 即可，前台与后台在同一台站点、同一棵目录树里，共享一份 `assets/`。

```
sumfarm-v1.7.0/
├─ index.html ... 143 个前台 HTML      # 首页四子栏目、田园档案与对比、论坛、专家、接单、个人、账号、帮助与公共页
├─ admin/                              # 16 个后台 HTML：独立登录 + 总览 + 九类管控 + 三级审核工作台
│   ├─ login.html                      # 后台独立入口
│   └─ index.html / audit*.html / workorders.html / users.html / ...
├─ assets/                             # 2 CSS + 8 JS + 77 WebP ≈ 2.6 MB（前后台共用，后台页用 ../assets/ 引用）
├─ robots.txt                          # Disallow: /admin/；同时屏蔽验收脚本与报告
├─ sitemap.html                        # 公开站点地图，0 个后台链接
├─ DEPLOY.md / CHECK.md / RUNTIME.md   # 部署、静态回归、10 批运行时验收
├─ PRICE_WALKTHROUGH.md                # 全站租金与价格公示挂接走查报告
└─ USER_WALKTHROUGH.md / BUTTON_AUDIT.md / SUMFARM_BASELINE.md / ART_MATRIX.md
```

### 后台隔离口径（单点下靠访问控制，不是物理分离）

单点部署后，后台 HTML 物理上与前台在同一台站点上，**能凭 URL 直接请求到**。因此「后台不得对外」由下面五层共同保证，缺一层都不算达标：

1. **独立登录**：`admin/login.html`，与前台合并账号页不共用账号体系；后台总览—审核—返回—退出闭环在同一目录树内自洽，链接由 `auth.js` 的 `decorate` 按当前目录归一化，不会叠出 `/admin/admin/`。
2. **前台 0 入口**：顶部导航、折叠浮窗、页脚、手机底部栏、移动「更多」浮层、站点地图、所有前台 HTML 均不出现后台链接；`sitemap.html` 只列公开页面。
3. **不进索引**：站点根 `robots.txt` 为 `Disallow: /admin/`；后台 21 页 `<head>` 全部带 `<meta name="robots" content="noindex,nofollow">`，双保险。
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
#   HTML 不缓存 / 资源长缓存（?v=1.7.8）/ 404 指向 404.html / 正确 MIME / /admin/ 按上文加白名单
```

`verify.py`、`runtime_check.py`、`slice_assets.py` 是验收与素材工具，不参与页面渲染；正式部署时可从站点根剔除，不影响运行（robots.txt 已屏蔽）。

### 复跑命令（在解压后的目录执行）

```bash
python3 verify.py                 # 全量静态回归 → CHECK.md
for b in 1 2 3 4 5 6 7; do python3 runtime_check.py $b; done   # 双视口逐页 → RUNTIME.md
unzip -t ../sumfarm-v1.7.0.zip   # 交付包完整性
```

验收口径仍为使用者视角：开发态 = 交付态，166 页（145 前台 + 21 后台），静态回归 0 错误，10 批真实 HTTP + Chromium 双视口 **332 次取样 / 237 项交互**，运行时错误 0 / 破图 0 / 横向溢出 0 页。

**如实说明**：按用户说明，线上域名为 `iarm.fun`，站点当前在该域名下运行。用户此前附的站点链接在对话侧资源解析服务请求失败，未据此判断线上状态；本轮**不主动查线上**，线上表现不作验收依据，也未由本方执行部署 / 域名切换；本次交付包需由运维更新到线上，并同步 Nginx `server_name`、`robots.txt` 的 Sitemap 绝对地址、前端 `api.js` 的 API base、TLS 证书与静态资源缓存刷新。备案号 `蜀ICP备18013136号` 沿用，部署时由运维按实际接入信息办理。每页独立设计图、每条模拟记录单独拍摄的照片仍是遗留项，见 `SUMFARM_BASELINE.md`。


## 7. 图片压缩为 WebP（网站专用格式）

用户反馈「额外图片太大，更新到 git 上之后显示很慢」。根因是站点素材全为 **PNG 位图**：73 张共 **36.66 MB**，单张背景图 1–2 MB，首页一次要拉主视觉、底纹与多张切图；仓库体积大、首屏加载慢。本轮把全部图片转为 **WebP**（网站专用格式，Chrome / Edge / Firefox / Safari 14+ 与移动端浏览器全覆盖，支持有损压缩与透明通道）。

| 项目 | 压缩前 | 压缩后 |
|---|---|---|
| 格式 | 73 张 PNG | 77 张 WebP（同名改后缀） |
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
2. 全站引用同步：131 个 HTML 的 `<img src>` / `data-mobile-src`、2 个 CSS 的 `url()`、7 个 JS 的路径字面量、`assets/img/art/manifest.json` 的 50 条清单、`slice_assets.py` 的输入输出。
3. `slice_assets.py` 改为**直接产出 WebP**，复跑不会重新生成 PNG；`verify.py` 的素材校验改为 WebP 头 + Pillow 回读解码 + 尺寸核对，并新增第 26 组断言（0 个 PNG 文件 / 0 个 PNG 后缀引用 / 77 张 WebP 有效性 / 图片目录 ≤ 6 MB / manifest `format=webp` / MIME 与版本号齐备）。
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

---

## 9. 五角色业务内容闭环（本轮当前定稿）

> 以上历史轮次的页面数 / 取样数 / 交互数均为当时值；**当前口径以本节、
> `ROLE_FLOW_WALKTHROUGH.md`、`CHECK.md` 与 `RUNTIME.md` 为准**。

- 走查结论：**链接层闭环，业务内容层原本没有闭环**。上一轮只保证「每页可点、没有死页」，
  本轮按租户 / 商家 / 农户 / 专家 / 管理员五条链逐链点击，发现 88 个业务节点仍是通用占位模板
  （标题写「承包合同」、内容是数据集字段表；「立即订购」直接跳支付页；订单卡片点回个人中心；
  工单不能推进；商家查不到审核进度；专家没有技术结论落点；后台转复审只弹提示）。
- 整改：建立唯一 `BIZ` 五角色链路映射与 `bizGeneric()` 专属渲染层，93 个非专属页全部按业务语义
  渲染真实记录、专属表单、状态时间线、沟通交流框与动作条；修 7 个真实断点；新增 4 个闭环页面；
  动作目标 0 死链；`.sf-biz-*` 与 `.sf-pub-*` / `.sf-price` 严格隔离；价格公示挂接不回退。
- 当前 **166 页（145 前台 + `admin/` 21 后台）**，`?v=1.7.8`，仍是**一个包、一次发布**。
  静态新增第 32 组断言；运行时把五角色链纳入第 1 批交互验收，10 批全量双视口重跑。
- 全量回归中另修 3 处真问题：论坛版块子页文字列表归零、找田子页丢分页与 `?id=` 差异化、
  台账节点丢全选/删除二次确认；`contact.html` 表单取样属断言口径误报，已更正并登记。
  详见 `ROLE_FLOW_WALKTHROUGH.md` 第 7.2 / 7.3 节。
- 遗留（如实登记）：首页 8.3 / 13.8 屏与部分子页 2.2~3.9 屏仍超「单页 3 屏」口径；
  模拟提交不落库；逐页独立设计图与每条记录专属照片未完成；线上部署由运维执行；
  `/admin/` 白名单或 Basic 需在部署侧配置（单点部署是逻辑隔离，不是物理分离）。


## 9. 第 33 轮 · 用户级常规业务（本轮增量）

按租户 / 商家 / 农户 / 专家 / 管理员五类使用者的日常操作补齐 **33 个页面**（29 前台 + 4 后台），
前台总数 114 → 143，后台 17 → 21，当轮全站 **164 页**（历史轮次；当前为 166 页，见第 11 节）。新增页面全部在站点根或 `admin/` 下，
共用同一份 `assets/`，发布形态仍是「一个包、一个站、`admin/` 独立文件夹、一次发布」。

- 新增 4 个业务流程组：工单售后与变更、租赁/合同/对账/活动运营、农户资金与提现、专家统计/调控/记录；
  全部由统一 `flowNav()` 注入，站点地图自动列出，后台 4 页只进统一侧栏、不进公开索引。
- 新增 11 类模拟数据集与 34 个真实接口函数（含入参、返回类型、金额单位分、余额校验），
  见 `assets/js/mock-data.js` 与 `assets/js/request.js`（当轮名为 api.js，现已收口）；前后端仍彻底分离。
- 所有新页由 `put()` 自动挂接本频道租金与价格公示，不另写金额口径。
- 静态资源版本号刷为 `?v=1.7.8`，顶层目录名与交付包名保持 `sumfarm-v1.7.0`。
- 逐按钮五问、逐角色闭环与遗留项见 `BUSINESS_LOGIC_WALKTHROUGH.md`。
- 复跑：全站页面自动发现，批次数按 `ceil(页面数 / 18)` 动态计算（当前 10 批）；
  `for b in $(seq 1 10); do python3 runtime_check.py $b; done`，再 `python3 verify.py` 与包内抽查。

## 10. 上一轮定稿口径（历史值，当前数字以第 11 节与页首为准）

- 发布形态：**一个包、一个站、一次发布**；交付包 `sumfarm-v1.7.0.zip`，顶层 `sumfarm-v1.7.0/`，`admin/` 只是站点根下的独立文件夹（独立登录 / 纯素 / `noindex,nofollow`），共用一份 `assets/`，前台 0 入口、不对外分发第二个包。
- 规模：**166 页**（前台 145 + 后台 21）、77 张 WebP、2 CSS、8 JS、15 份文档；静态资源版本 **`?v=1.7.8`**（全站 1351 处），包名与顶层目录名仍为 `sumfarm-v1.7.0`。
- 域名：`iarm.fun`（API base / Sitemap / `server_name` / 基线四处生效）；品牌「闪马田园 / SUMFARM」、主体「闪马科技个人工作室」、备案号 `蜀ICP备18013136号` 未变。
- 验收：静态回归 **0 错误 / 21 条后台纯素豁免提示**；真实 HTTP + Chromium 双视口 **10 批 / 332 次取样 / 237 项交互全通过**，运行时错误 0 / 请求失败 0 / 破图 0 / 横向溢出 0 页 / 内容充盈未达标 0 页；18 组 WCAG 对比度全过。
- 本轮收尾修复：专家数据对比页「相同项」表首版为空（补 2 项平台级共同字段与空态引导）、旧断言取空表误报、首页「按身份进入」入口 8 → 16 的断言口径；资源版本 `?v=1.7.6` → `?v=1.7.8`。
- 复跑（在解压后的站点根执行，脚本自带 HTTP 服务并由系统分配空闲端口）：
  ```bash
  python3 verify.py                                   # 全量静态回归，重写 CHECK.md
  for b in $(seq 1 10); do python3 runtime_check.py $b; done   # 10 批双视口，末批合并 RUNTIME.md
  python3 pack_check.py .                             # 包内完整性 / 口径 / 修复点抽查
  python3 pack_check.py . --browser                   # 再从包内目录起 HTTP，Chromium 双视口抽检关键页
  ```
- 打包由开发态 `build_zip.py` 单独一条执行（不随站点包发布）；`unzip -t` 与 SHA-256 在交付时复核。
- 遗留（如实登记）：首页桌面 8.3 屏 / 手机 13.8 屏、部分子页 2.2~3.9 屏仍超「单页 3 屏」口径；166 页逐页独立设计图、每条模拟记录专属照片仍未完成；线上部署与 `iarm.fun` 解析未由本方执行，不主动查线上；`/admin/` 白名单或 Basic 仍需运维在部署侧配置（单点属逻辑隔离，不是物理分离）。

## 11. 数据库表与统一 API（本轮增量，覆盖前文历史值）

- 数据库：`db/schema.sql`，**55 张表 / 9 个业务域**；每张表最多 **1 个外键**（44 张 1 外键、11 张 0 外键根表/汇总表），跨实体只用 `*_no` 业务编码软引用，不建第二维关联。图片 / 视频 / 回执只存 `*_path` 路径，全库 0 个二进制列。设计口径见 `DATABASE_DESIGN.md`。
- 统一 API：全站接口收口到唯一文件 `assets/js/request.js`（`window.SF_REQUEST`，兼容别名 `window.SF_API`）；原 `api.js` 已删除，166 页脚本引用统一改为 `request.js?v=1.7.8`。**74 条接口**的目录、参数范围、返回范围、关联表、流程备注在 `API_CATALOG.md` 与 `db/api_catalog.json`；参数越界由 `validate()` 真实拦截并返回 `code=4001`。
- 交叉验证：`python3 db_api_crosscheck.py` → `API_DB_CROSSCHECK.md`，34 项全通过（0 悬空表引用、0 未覆盖表、流程 A~E 五条端到端串接）。
- 数据仿真：`api-lab.html` 逐条跑完 74 条并在页面显示反馈（状态 / code / 耗时 / 来源 / 返回条数 / 关联表 / JSON 预览）；`api-catalog.html` 为纯目录说明页。两页 `noindex,nofollow`、不进主导航，由流程组与站点地图提供入口。说明见 `API_SIMULATION.md`。
- 资源版本 `?v=1.7.8`（全站 1351 处），新增 JS `api-lab.js`、CSS 追加 `.sf-lab-*` 隔离样式、新增 `db/` 目录；交付仍是**一个包、一个站、一次发布**，包名与顶层目录名保持 `sumfarm-v1.7.0`。
- 复跑：`python3 db_api_crosscheck.py` → `python3 verify.py` → `for b in $(seq 1 10); do python3 runtime_check.py $b; done` → `python3 pack_check.py . --browser`。
- 上线切换：把 `SF_REQUEST.config.useMock` 置 `false`，74 条统一走 `fetch(https://iarm.fun/api/v1/...)`；建议后端按 `db/api_catalog.json` 生成路由与参数校验，避免两处口径漂移。`schema.sql` 含 `DROP TABLE IF EXISTS`，仅用于空库初始化 / 演示库重建，生产用增量迁移。

## 12. 反向逻辑闭环走查（本轮增量，页首数字仍以当前口径为准）

走查方向：**页面每个选项 / 参数 → 哪条 API 消费 → 落到哪张表列 → 由哪条相关 API 接回页面**。
不是看源码模板，是用真实 HTTP + Chromium 取 166 页渲染后 DOM 的 `select/option`、表单字段、链接参数与 `data-*` 控制值。

- 交付物：`reverse_dom.json`（166 页渲染后取样）、`reverse_audit.json` / `REVERSE_AUDIT.md`（逐项结论与参数来源登记）、
  `db/column_api_index.json`（497 个表列 → 返回它的接口 / 按它筛选或写入的接口）、
  `ddl_check.py` / `ddl_check.json`（DDL 逐表校验 + SQLite 转译后实际建库）。
- 复跑顺序（全部幂等，不串联重命令）：

```bash
python3 patch_catalog.py        # 页面选项/参数补齐并回灌 request.js 内嵌 CATALOG
python3 gen_column_map.py       # 由唯一 schema.sql 推 74 条接口的 columns + 表列反向索引
python3 ddl_check.py            # 括号/逗号/重复列/外键引用列 + 实际建库执行
for b in $(seq 1 10); do python3 reverse_dom_probe.py $b; done
python3 reverse_audit.py        # 反向闭环，输出 REVERSE_AUDIT.md（未闭环项必须为 0）
python3 db_api_crosscheck.py    # 表 × API 交叉验证 34 项
python3 verify.py               # 全量静态回归（含第 37 组反向闭环断言）
```

- 本轮修掉的真缺陷：① `schema.sql` 55 张表重复逗号 108 处、15 个外键指向不存在的 `platform_user.user_id`、
  `work_order` 重复 `created_at`（DDL 根本建不起来）；② 7 个下拉 + 71 个表单字段没有任何 API 参数消费，
  已补 100 项字段到 9 条写接口，参数字段 61 → 129；③ 注册角色 `grower/research` 与 API `farmer/expert`、
  退款去向 5 个中文选项、审核结论「已驳回/转复审」三处值域不一致，已统一并注明后端归一规则；
  ④ `upload` 流程备注缺回显链路、对接文档的流程举例引用 6 个不存在的接口名，已换成目录里真实接口并加断言。
- 两处口径不漂移：`patch_catalog.py` 只改唯一 `db/api_catalog.json`，再把整份目录幂等回灌到
  `request.js` 内嵌 `CATALOG`；`reverse_audit.py` 与 `verify.py` 第 37 组每次都比对两者完全一致。
- 页面 HTML / CSS 本轮未改动，`request.js` 只同步内嵌目录数据；运行时沿用 10 批 332 次双视口取样与
  237 项交互全通过的数据。前端 `useMock = true`，接真实后端时请按 `db/api_catalog.json` 生成路由与参数校验，
  否则会出现「页面有参数、后端不认」的新孤儿。

## 13. 安全部署（本轮增量，上线阻断项以此节与 SECURITY.md 为准）

**未加载 `_internal/nginx-secure.conf` 不算上线完成。** 静态站没有服务端，
`noindex` / `robots.txt` / 前端判断都不是访问控制，只有 Web 服务器配置生效。

- 交付结构变化：50 个顶层文档/脚本/数据 + 整个 `db/` 已物理移入 `_internal/`。
  站点根现在只有 166 个 HTML、`assets/`、`robots.txt`、`_internal/`。
  页面运行时不依赖 `_internal/` 中任何文件，移走不影响渲染。
- Nginx 必须配置（详见 `_internal/nginx-secure.conf`）：
  `/_internal/` 与 `api-catalog.html` / `api-lab.html` 精确 `return 404`；
  `.sql/.py/.json/.md/.log/...` 扩展名白名单外一律 404；
  `/admin/` 办公网 IP 白名单 + HTTP Basic + `no-store`；
  全站严格 CSP / nosniff / DENY / HSTS / Referrer-Policy / Permissions-Policy；
  TLS 1.2+、HTTP 301 跳 HTTPS、三档 `limit_req`。
- `robots.txt` 不再点名 `/admin/`（robots 公开可读，点名等于公告后台路径），只保留 Sitemap。
- 前端兜底：166 页注入 CSP `<meta>`；`request.js` 在真实后端模式下拦截 6 个会话注入字段（403）、
  错误信息泛化；`auth.js` 演示凭据已标注为 P0 上线阻断块并接入失败锁定。
- 上线前必须由后端/运维完成：删除 `DEMO` / `DEMO_ONLY_CREDENTIAL`、接入服务端签名会话、
  按 `db/api_catalog.json` 实现 6 个 `source=session` 字段的服务端注入、上传魔数校验与隔离存储、
  口令策略与限流、日志脱敏、最小权限数据库账号。完整 10 条见 `_internal/SECURITY.md`。
- 安全回归：`cd _internal && python3 security_check.py`（26 项，任一失败阻断发布）；
  全量静态回归第 38 组也会复核同一份结果。
