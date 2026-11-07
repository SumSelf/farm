# 闪马田园 SUMFARM · 部署说明（静态前端 / 前后端彻底分离）

## 1. 交付结构
```
sumfarm-v1.5.0/
├── 117 个 .html                101 个前台页（根目录）+ 16 个后台页（admin/）
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
├── assets/img/*.png                     13 张成品主视觉（含 16:9 / 9:16 双主视觉）
├── assets/img/src/*.png                 10 张题材源图（收敛为 800×450，供切图复跑）
├── assets/img/art/sub_*.png             10 题材 × 5 规格 = 50 张切图
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
├── verify.py                            全量静态回归脚本
└── runtime_check.py                     运行时验收脚本（自带 HTTP 服务，自动发现全站页面并分批）
```
顶层目录名 `sumfarm-v1.5.0`，静态资源版本号 `1.5.0` 已刷新到所有资源引用 `?v=1.5.0`。
全站内容图均为真实田园成图：按 `pagename_id` 由 `mock-data.js` 的 `art()` 解析题材与规格，
不再有矢量色卡占位；后台 16 页保持纯素，不注入田园题材装饰图。
构建顺序：`build_pages.py` → `build_subpages.py` → `slice_assets.py` → `verify.py` → `runtime_check.py 1..7`。
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
    server_name sumfarm.sumstc.com;
    root /var/www/sumfarm-v1.5.0;
    index index.html;

    # HTML 不缓存
    location ~ \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    # 静态资源长缓存（版本号 ?v=1.5.0 变更即刷新）
    location ^~ /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # MIME
    types {
        text/html                             html;
        text/css                              css;
        application/javascript                js;
        image/png                             png;
        image/jpeg                            jpg jpeg;
        image/svg+xml                         svg;
        image/webp                            webp;
        application/json                      json;
    }
    charset utf-8;
    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;

    error_page 404 /404.html;
    location = /404.html { internal; }
}
```
- 纯静态多页，不做 SPA history fallback；`404.html` 提供回首页与搜索入口。
- 版本号刷新方式：全量替换 `?v=1.5.0` 为新版本号后重新上传 `assets/`，HTML 因 no-cache 立即生效。

## 4. 复跑命令（分批，不串联重命令）
```bash
cd /data/workspace/sumfarm-v1.5.0
python3 verify.py                 # 全量静态回归
python3 -m py_compile verify.py  # 校验脚本自身语法
```
打包单独一条，完整性校验单独一条：
```bash
cd /data/workspace && zip -rq sumfarm-v1.5.0.zip sumfarm-v1.5.0
unzip -t sumfarm-v1.5.0.zip && unzip -l sumfarm-v1.5.0.zip | tail -n 3
```

## 5. 真实服务环境验收（本轮已执行，结果与明细见 `RUNTIME.md`）
- 环境：本地 HTTP 服务 + Chromium 无头浏览器，**不使用 `file://`**；双视口 1440×900 / 390×844。
- 分批执行：自动发现全站 **118 页**，每批 18 页（低于 20 页上限），共 **7 批**；双视口合计 **236 次页面取样**。
- 等待策略：`networkidle` + 700ms 重绘 + 滚动到底 600ms + 强制 eager 900ms，懒加载全部完成后才取样；取样取完整 `body.innerText`。
- 从首页出发逐频道点击导航，再逐页加载；交互按「用户做了 X → 得到 Y」验收 **84 项**，含前台登录 / 注册合并双 Tab 与找回校验、后台隐藏与独立入口、后台侧栏—审核—返回—退出闭环、删除二次确认、ESC 关闭、全选可逆、收藏、主按钮配色、移动浮层、英文子页、子页 `?id=` 差异化、分页换页、表单反馈、素材三项、视图走查 12 项、上一轮首屏按钮与田园挂靠工单 11 项，以及本轮逐按钮问答与五类画像新增的 18 项：首页唯一主按钮、四类画像八入口逐条点击、未登录 / 商家 / 租赁用户三态显隐、中英返回目标、接单双身份说明、个人查看档案、专家页产学研闭环、两处自解释文案。
- 本轮结果：**运行时错误 0 / 请求失败 0 / 破图 0 / 横向溢出 0 页 / 内容充盈未达标 0 页 / 交互 84 项全通过**。
- 逐页内容充盈口径：前台动态区文字 ≥300 字符且 ≥3 张正文图片；后台纯素豁免图片、文字 ≥200 字符，见 `BUTTON_AUDIT.md` 第 6 节。
- 素材校验：`slice_assets.py` 产出 50 张切图与清单，`verify.py` 逐条核对 PNG 有效性、声明尺寸与「题材数 × 规格数」；运行时确认内容图全部为真实成图。
- 视图走查口径：第 8 节覆盖背景淡化、按钮/文字配色、搜索框归属、下拉防抖、论坛文字列表、接单与个人功能分区；第 9 节覆盖账号合并、首屏按钮去重、农事挂靠田园与专家指导工单；第 10 节与 `USER_WALKTHROUGH.md` 覆盖普通用户逐按钮问答与五类用户画像任务链，均按使用者视角逐项点过。
- 误报更正已登记在 `RUNTIME.md` 与 `CHECK.md`，不留「已知问题」。
- 语法检查（`node --check` + 静态回归）与运行时验证两者都做，语法检查不代替运行时。
- 复跑命令（在站点根目录执行，脚本自带 HTTP 服务并由系统分配空闲端口；每条命令单独跑若干批，避免单次超时）：
```bash
python3 slice_assets.py                 # 可选：重出 50 张题材切图与 manifest（源图已在包内）
python3 verify.py                       # 全量静态回归（118 HTML + 7 JS + 2 CSS + 73 PNG）
python3 runtime_check.py 1              # 第 1 批：18 页 × 双视口 + 84 项交互验收
python3 runtime_check.py 2              # 第 2 批，依次到 7；末批合并生成 RUNTIME.md
# 或按批次逐条执行：for b in $(seq 1 7); do python3 runtime_check.py $b; done
```
- `slice_assets.py` 需要 Pillow；`runtime_check.py` 需要 Python `playwright` 与 Chromium；无浏览器环境时仍可只跑 `verify.py`。
- 全站静态回归 `python3 verify.py` 结果：**错误 0**；16 条提示均为后台纯素页按基线豁免装饰图，非缺陷。静态回归另含 **18 组 WCAG 对比度复算**（含本轮新增的 hero 深字/浅罩、次按钮、眉标、分区标题等 7 组）、按钮动作分支覆盖、后台隐藏与错层路径扫描、栏目归属校验、50 张切图清单逐条核对、真实成图与页面题材归属扫描，以及搜索框归属、下拉桥接、文字列表/功能分区样式、接单双分区四类视图断言；上一轮再增 hero 按钮去重、账号合并双 Tab、专家指导工单统一清单、farmId 挂靠、个人田园每行远程创建工单五类断言；本轮再增按钮 title 自解释、`data-role` 合法性与三态显隐、91 个子页返回带目标、首页四类画像八入口与中英真文案、歧义文案清零、`USER_WALKTHROUGH.md` 完整性共六组断言。

## 6. 权限边界
只写 `/data/workspace`；不初始化、不提交、不推送版本库；不主动查线上；上传延迟导致的线上表现不作验收依据。
