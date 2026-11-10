# 闪马田园 SUMFARM · 开工基线（定稿，中途不改）

> 当前交付规模：**166 页**（前台 145 + 后台 21），资源版本 `v1.7.8`，域名 `iarm.fun`。本文出现的 118 / 127 / 131 / 143 页等为对应整改轮次当时的历史值，不代表当前页面数。


## 1. 品牌 / 主体 / 域名（一次定死）
- 中文名：**闪马田园**；读音 shǎn mǎ tián yuán。
- 英文名：**SUMFARM**；完整英文署名 **SUMFARM Shared Farmland Platform**；读音 /ˈsʌm.fɑːrm/。
- 构词说明：`SUM`（聚合、共享、汇总，取「众人共有一畦田」之意）+ `FARM`（田园、耕作）。中文「闪马」为工作室字号音译，取「轻快抵达田间」之意。
- 中文全称：**闪马共享田园平台**。
- 域名：`iarm.fun`。
- 主体：**闪马科技个人工作室**。
- 页脚固定文案：`sumfarm 闪马共享田园平台 Made by 闪马科技个人工作室 · © 2026 SUMSTC. 保留所有权利. 蜀ICP备18013136号`。
- 风格配比：真实田园 60% / 科技 30% / 可爱 10%。后台：**纯素、严谨、独立登录与管理**，不出现田园装饰与可爱元素。

## 2. 频道清单与职责边界（逐项列全，无「等等」）
| 频道 | 职责边界（属于） | 不属于 |
|---|---|---|
| 首页 | 平台总览、四个子栏目聚合入口、公告、数据概览、推荐田园与推荐活动 | 不承载完整列表、不承载交易明细 |
| 田园 | 田地档案（位置/编号/土壤/四季温湿度/历史成功作物/现有作物/历史采摘成果/承包类型/承包时间）、场地与配套（菜单、聚会、开会、活动、运动场地、婚纱场地、露营）、图片、文字、评论、分享关注、商家上传与管理、租赁下单 | 不承载论坛长帖、不承载工单聊天 |
| 论坛 | 常规论坛分享：热门田园、种植经验、活动、技术咨询、版块与回帖 | 不承载交易、不承载专家积分统计 |
| 专家 | 高级/专家用户产出、个人田园信息统计、种植过程统计、管理历史、积分与排名、技术论坛分享 | 不承载接单派工 |
| 接单 | 已接工单与需求、附近工单与需求、关联田园附近工单、农户接单与作业回执 | 不承载消费者下单 |
| 个人 | 关联活动、田园、历史消费、发布的需求与工单、远程管理、工单聊天 | 不承载全站内容审核 |
| 后台 | 独立登录；田园信息、用户信息、工单信息、聊天信息、种植信息、评论管理、多级审核、系统控制 | 不作为前台频道出现在主导航 |

首页子栏目（入口文案与导航文案逐字一致）：
`热点视频` → `videos.html`；`田园活动` → `activity.html`；`农产品` → `produce.html`；`田园宣发` → `promo.html`。
「更多」一律指向对应列表页，禁止指向投稿/写入页。

## 3. 导航 → 具体文件路由（逐字一致，不写「进某某频道」）
| 导航文案 | PC | 移动 |
|---|---|---|
| 首页 | `index.html` | `index.html` |
| 田园 | `farms.html` | `farms.html` |
| 论坛 | `forum.html` | `forum.html` |
| 专家 | `experts.html` | `experts.html` |
| 接单 | `dispatch.html` | `dispatch.html` |
| 个人 | `account.html` | `account.html` |
| 后台 | `admin/login.html` | `admin/login.html` |

PC：折叠浮窗固定在屏幕最上端，悬停/点击展开子栏目；移动：屏幕底部固定栏，5 项 +「更多」浮层。导航由 `assets/js/nav.js` 单点抽离注入，全站复用一份映射。

## 4. 命名规则（统一）
- 频道列表：`{channel}.html`（`farms.html` / `forum.html` / `experts.html` / `dispatch.html` / `account.html`）。
- 详情页：`{channel}-detail.html?id={id}`，**一律按 URL 参数渲染，禁止静态写死**；不同 id 内容必须不同。
- 编辑/写入页：`{channel}-edit.html`（`farm-edit.html`、`forum-edit.html`）。
- 首页：`index.html`；搜索：`search.html?q={keyword}`；下单结果：`orders.html`；工单：`workorders.html`、`workorder-detail.html?id={id}`。
- 后台：`admin/login.html`、`admin/index.html?m={module}`、`admin/audit.html?id={id}`；后台子页 `admin/{module}.html`。
- 功能子页：`{channel}-{topic}.html`（如 `farms-region.html`、`venue-camping.html`、`account-invoice.html`），
  统一由 `data-tpl` + `data-ds` 驱动一份渲染器，`data-page` 与页级文案键同名，`data-channel` 归属主频道用于导航高亮。
- 文件名全 ASCII，无中文、无空格、无控制字符。
- 素材：`assets/img/{pagename}_{id}.webp`，按 `pagename_id` 方式嵌入；功能性图标一律内联矢量 SVG，不用位图。

## 5. 首页每个入口第一屏内容（无空壳）
首页 → 主视觉 + 四个子栏目各 1 张真实卡片 + 数据概览；田园 → 精选田地档案卡；论坛 → 热门帖；专家 → 积分榜前三；接单 → 附近工单；个人 → 我的工单与消费；后台 → 独立登录框。折叠/展开规则：子栏目默认展开首屏 4 条，点击「更多」进列表页；FAQ 折叠答案为真答案，不是问题翻译。

## 6. 数据集清单（名称 / 条数 / 字段）
| 数据集 | 条数 | 字段 |
|---|---|---|
| farms | 24 | id, nameZh/nameEn, region, plotNo, soil, temp4[], humid4[], pastCrops[], currentCrops[], harvest[], leaseType, leaseStart, leaseEnd, areaMu, price, cover, gallery[], tags[], ownerId, rating, comments, follows, facilities[] |
| activities | 18 | id, titleZh/En, farmId, kind(聚会/开会/运动/婚纱/露营/菜单/采摘), date, capacity, booked, price, cover, descZh/En |
| produces | 20 | id, nameZh/En, farmId, category, season, unit, price, stock, cover, traceNo |
| videos | 16 | id, titleZh/En, authorId, farmId, duration, cover, views, likes, publishedAt, tag |
| promos | 12 | id, titleZh/En, farmId, channel, cover, publishedAt, summaryZh/En |
| topics | 30 | id, board, titleZh/En, authorId, bodyZh/En, replies, likes, publishedAt, tags[] |
| experts | 12 | id, nameZh/En, title, org, points, rank, farmCount, processCount, manageYears, avatar, techPosts[], bioZh/En |
| workorders | 28 | id, farmId, userId, type(翻地/种植/施肥/浇水/除草/采摘/回收/配送/拍照), status, assigneeId, createdAt, dueAt, price, chatId, photos[] |
| dispatches | 20 | id, workorderId, region, distanceKm, kind, status, publishedAt |
| orders | 18 | id, userId, farmId, kind(租赁/活动/场地/农产品), amount, status, createdAt, items[] |
| users | 40 | id, nameZh/En, role(商家集体/普通用户/接单农户/产学研/管理员), region, avatar, joinedAt, verified |
| comments | 60 | id, targetType, targetId, userId, bodyZh/En, rating, createdAt, status |
| chats | 24 | id, workorderId, fromId, toId, bodyZh/En, at, kind(text/photo) |
| plantings | 16 | id, farmId, crop, stage, operatorId, recordAt, temp, humid, noteZh/En, photos[] |
| audits | 9 | id, targetType, targetId, level(初审/复审/终审), status, operator, at, commentZh/En |
| notices | 8 | id, titleZh/En, bodyZh/En, at, level |

数量类文案一律 `countOf(dataset)` 动态计算，禁止写死。日期分布在 2026-01 至 2026-11，单页重复文案低于阈值。

## 7. 固定动作与硬约定
- **新增引用 → 立刻校验目标存在**（`verify.py` 每轮全量跑）。
- 详情页按 `?id=` 渲染；搜索按 `?q=` 真实过滤；分页 `?page=` 真实换页；页码数 = 真实数据页数，禁止空页码。
- 返回逻辑三情形：① 逐层回退 `history.back()`；② 直达子页回所属上级（显式 `?from=` 参数，不用 referrer/会话）；③ 无历史用 `location.replace(上级)` 兜底，不新增历史记录。
- 兜底值不作状态判断条件；核心判断不依赖 referrer / sessionStorage。
- 每个按钮先答五问再实现：可见反馈 / 是否符合点击意图 / 跳转内容是否为用户要的 / 怎么返回 / 边界行为。覆盖搜索、页码、加载更多、指示点、箭头、tab 筛选、更多、收藏点赞、表单提交、分享、删除、全选、滑块、返回、语言切换、浮层关闭。
- 有翻页必同时有箭头、页码、指示点；动态重建元素后用事件委托重新绑定。
- 边界：首页 prev 禁用、末页 next 禁用、空结果、重复点击、键盘左右、触摸滑动。
- 双语约定：`zh` / `en` 均为**真内容**两套文案，英文不是中文的占位翻译；`?lang=en` 显式参数优先。
- 空结果必须有插画、文案、引导按钮。
- 图片位必须输出 `<img>` 元素，禁止显示路径字符串；破图为 0。
- 品牌名与禁用词全站扫描残留为 0；页面标题逐页独立。

## 8. 素材用途 × 规格矩阵（容器比例先算再选图）
| 素材 pagename_id | 比例 | 用途 | 容器比例 |
|---|---|---|---|
| home_hero | 16:9 | 首页主视觉 | 16:9，桌面首屏 |
| home_hero_m | 9:16 | 移动首屏主视觉 | 9:16 |
| bg_field | 16:9 | 页面平铺背景 | 全宽装饰，低对比可叠字 |
| bg_tech | 16:9 | 数据/统计区底纹 | 16:9 |
| bg_cute | 1:1 | 徽章、可爱点缀 | 1:1，≤64px |
| empty_state | 9:16 | 空结果插画 | 3:4 居中，留引导区 |
| farm_card | 16:9 | 田园档案样例 | 16:9 卡片缩略图 |
| activity_venue | 16:9 | 聚会/婚纱/露营/场地样例 | 16:9 |
| produce_basket | 16:9 | 农产品分享样例 | 16:9 |
| admin_bg | 16:9 | 后台素色底纹 | 全宽，极细规则线 |

宽屏列表列数规则：≥1600px 4 列 / 1200–1599px 3 列 / 1024–1199px 2 列 / 768–1023px 2 列 / <768px 1 列。缩略图统一 16:9、`max-height:220px`，禁止 4:3 图被撑到近千像素高。长表格外层横向滚动。

## 9. 断点与基准视口
- 桌面基准：**1440×900**（≥1024px 顶部折叠浮窗导航）。
- 移动基准：**390×844**（<768px 底部导航，单页 ≤3 屏，超出做左右翻页）。
- 主 flex 容器显式 `flex-direction` + `flex-wrap`；列方向 + wrap 在移动端显式处理。
- 容器内上下双向裁切为 0；横向溢出 0；越界 0（排除轮播容器内页、隐藏元素、本就该全宽的装饰图）。

## 10. 隔离 / 版本 / 权限 / 验收
- 容器类名统一 `sf-` 前缀 + `[data-page]` 作用域；后台 `adm-` 独立样式，不加载前台田园装饰。禁止为按钮行写的规则命中翻页容器。
- 静态资源版本号：`?v=1.7.5` 第一天落地并已按整改刷新；HTML 不缓存、资源长缓存、404 指向、MIME 写入 `DEPLOY.md`。
- 账号约定：前台 `login.html`（登录 / 注册合并双模式）与 `forgot.html` 为唯一公开账号入口，五类身份在注册 Tab 里用下拉选择；登录态靠显式 `?auth=1&uid=&role=` 透传，不依赖 referrer 或会话存储做权限判断。后台 `admin/login.html` 为独立入口，不进导航 / 页脚 / 移动浮层 / 站点地图，`robots.txt` 屏蔽 `/admin/`；站内链接构造只写一份（`auth.js` 的 `decorate`）。
- 工作区权限边界：只写 `/data/workspace`；**不主动初始化 / 提交 / 推送版本库**；不主动查线上；线上表现不作验收依据。
- 验收口径：**使用者视角**，句式只能是「用户做了 X → 得到 Y」；「元素存在 / 无报错」只作前置条件。
- 交付物清单（当前口径）：166 个 HTML 页面（145 前台 + 21 后台）、`assets/`（2 CSS / 8 JS / 77 WebP ≈ 2.65 MB = 17 成品 + 10 源图 + 50 切图）、`db/`（schema.sql / api_catalog.json）、`assets/img/art/manifest.json`、`robots.txt`、`SUMFARM_BASELINE.md`、`BUTTON_AUDIT.md`、`ART_MATRIX.md`、`PRICE_WALKTHROUGH.md`、`ROLE_FLOW_WALKTHROUGH.md`、`DEPLOY.md`、`CHECK.md`、`RUNTIME.md`、`RUNTIME_batch1..8.json`、`slice_assets.py`、`verify.py`、`runtime_check.py`、打包 `sumfarm-v1.7.0.zip`。
- 素材约定：`pagename_id` = `data-page` + 内容子类 + 记录 id，由 `mock-data.js` 的 `art()` 唯一解析；`slice_assets.py` 排在页面构建之后，10 题材 × 5 规格（wide/card/sq/tall/mini）产出 50 张切图；9:16 竖版用模糊延展保留完整主体，不做上下裁切。详见 `ART_MATRIX.md`。
- 子页体系模板类型：`list / detail / table / form / flow / info / chat / gallery / success / stats / map`，公共关系只写一份（`app.js` 的 `pageGeneric`）；新增引用在构建期立刻校验目标存在，构建后再全量复核。
- 完整性校验：`python3 verify.py` 全量回归（结构平衡、死链、资源缺失、脚本语法、样式括号、控制字符、嵌套标签、文件名、图片位、数量文案、id 差异化、空态）；校验脚本先用 3–5 个已知正确样本校准。
- 单条命令不超时：分批执行、打包单独一条、重命令不串联；打包后单独做完整性校验。
- 遗留项如实写，没有写「无」。

## 11. 范围说明（如实）
累计交付（当前口径）：**166 个可直接部署的产品级页面（145 前台 + 21 后台）**；下文覆盖范围说明保留历史列举，数据库 / 统一 API / 仿真页见第 12 节，覆盖首页四子栏目、田园档案全字段、商家上传与三级审核、活动与七类场地、农产品溯源与结算、四版块论坛、专家积分与实践、十类农事工单（含专家指导）与对话、按田园创建工单、个人中心十项、后台九类信息管控与复审终审工作台、帮助/协议/站点地图等公共页，前台账号合并页与找回口令页、价格公示频道 8 页与后台价格公示管理页（全站 131 页均挂接租金与价格公示，唯一 `PRICE_BOOK` 见 `PRICE_WALKTHROUGH.md`）；另有 `USER_WALKTHROUGH.md` 逐按钮问答与五类用户画像走查报告；发布形态按用户要求**定稿为「一个包、一个站、`admin/` 独立文件夹」**：单个 `sumfarm-v1.7.0.zip` 解压后只有一棵站点树，131 页（114 前台 + `admin/` 17 后台）共用同一份 `assets/`，挂到一个站点根即可；`admin/` 是该根下唯一独立文件夹（独立登录 + 独立 `admin.css` + 17 页 noindex），不是第二个包 / 第二个站 / 独立域名；后台靠独立登录、前台 0 入口、`robots.txt` 屏蔽、17 页 noindex 与运维侧 `/admin/` 访问控制隔离，属逻辑隔离而非物理分离，见 `DEPLOY.md` 第 6 节。
统一抽离导航（PC 顶部折叠浮窗 / 移动底部 + 更多浮层，`data-channel` 让子页归属主频道高亮）、中英双真文案（通用键 + 每页独立撰写）、模拟数据 17 类与真实接口函数两版（含通用分页接口）、独立素色后台。
素材：**17 张成品主视觉 + 10 张题材源图 + 50 张切图 = 77 张 WebP**，全站内容图均为真实田园成图，按 `pagename_id` 取题材与规格；子页 hero 同时具备 16:9 与 9:16 两张专属切图。本轮由 PNG 全量压缩为 WebP（36.66 MB → 2.56 MB，省 93.0%），原 PNG 已删除，Nginx 补 `image/webp` MIME、资源版本号当前为 v1.7.8。矩阵与映射规则见 `ART_MATRIX.md`，压缩口径见 `DEPLOY.md` 第 7 节。
上一轮视图走查整改：全站背景加浅色罩、hero 图片降饱和、主次按钮配色层级分开（18 组 WCAG 对比度全过）；搜索框移入 `sf-hero-copy` 并全站统一一个；首页下拉加透明桥接 + 220ms 延时关闭；论坛改文字行列表；接单与个人改功能分区。详见 `BUTTON_AUDIT.md` 第 8 节。
更早一轮整改：登录与注册合并为单页双 Tab，账号栏目三页缩两页，导航只留一个账号入口；所有 `sf-hero-actions` 删除导航重复项与无关内容；个人「我的田园」每行新增「远程创建工单」并带 `farmId` 挂靠到具体田块；新增第十类「专家指导」工单与两页。详见 `BUTTON_AUDIT.md` 第 9 节。
本轮走查整改：以普通租赁用户视角对全站按钮逐条问「为什么在这 / 干什么」，判为 ❌ 的 5 处与 ⚠️ 的 6 处全部处置——首页首屏换成人人可答的「按地区找田」并新增「按身份进入」四类画像导引；角色专属按钮按显式 `?role=` 显隐；91 个子页「返回」写明回到哪一级；接单页删跨频道按钮并补农户工作台说明与租赁用户去向；个人「管理档案」改「查看田园档案」；「现场签到」「竹筐购物车」改自解释文案；专家页补产学研闭环。再从商家 / 租赁用户 / 接单农户 / 产学研 / 管理员五类画像各走一遍整站任务链，全部闭环。详见 `USER_WALKTHROUGH.md` 与 `BUTTON_AUDIT.md` 第 10 节。
已验证：全量静态回归错误 0（18 组对比度，加上按钮自解释 / 角色显隐 / 返回目标 / 画像导引 / 报告完整性五组，以及第 23 / 24 / 25 / 28 / 29 / 30 / 31 / 32 组 hero 分层 / 田块对比 / 工单流程 / 单点部署 / 背景色 / 频道主视觉 / 闭环 / 价格公示断言全过）；真实 HTTP 服务 + Chromium 双视口 10 批共 **332 次页面取样**，运行时错误 0、请求失败 0、破图 0、横向溢出 0 页、内容充盈未达标 0 页；**交互 237 项全通过**。明细见 `CHECK.md` / `RUNTIME.md` / `RUNTIME_batch1..8.json`。
更早轮次**已完成**：按题材生成 10 张主视觉、切成 50 张规格图、按 `pagename_id` 嵌入全部页面与每条模拟记录，替换掉矢量色卡占位；移动端子页主视觉不再统一套用首页图；后台内部链接错层修复与包内抽查补齐。
【历史轮次】`sf-hero` 遮罩曾收紧到 .97/.94/.85、又回调到 .93/.86/.70 并给 hero 更亮底色 / 深边框 / 落影、眉标改实底标签（body 整体背景 `--sf-veil .88` 一个数未动）；**当前定稿**：因「背景颜色太浅」未解决，hero 已改为明确浅田绿实底 `--sf-veil .88` 不动、`--sf-hero-base:#D2E4C8` + 田绿罩 `rgba(210,228,200,.96/.86/.68)`，静态资源版本（该轮）`?v=1.7.5`，当前 `?v=1.7.8`（交付包名保持 `sumfarm-v1.7.0`）；田块对比改为真多选 → 并排清单（相同项缩减、不同项高亮、只看不同项、最多 4 块）；工单扩为 6 步固定流程 + 退回分支、10 条明细需求、状态徽章与流程时间线，列表改严谨文字行；后台先单独打包、又按用户要求**回退为单点部署**：一个包一个站点根，后台仍在 `admin/` 子目录但补了 17 页 noindex 与 Nginx 白名单建议；双包 / 合并分发包及其构建脚本已全部清理。静态新增第 23 / 24 / 25 组断言、运行时新增 12 + 2 项交互，交互总数 84 → 98；此后又新增第 28 组 hero 背景色定量断言、第 29 组频道专属 hero 主视觉断言与 2 项运行时交互，交互总数 100；18 组 WCAG 对比度按真实底色复算。

本轮**仍**未完成：131 页逐页独立设计图（当前按题材池散列复用，同题材页面共用同一张主视觉）、每条模拟记录完全独立拍摄的照片（当前按 id 在 50 张切图中稳定取图）、全部子类图片逐张单独生成；`role-pick` 与 `newjob` 弹层为已无前台入口的兼容层，本轮如实登记为待清理、未伪装成已删除；按用户说明，线上域名为 `iarm.fun`，站点当前在该域名下运行；用户此前附的站点链接在对话侧资源解析服务请求失败，未据此判断线上状态；按权限边界不主动查线上，本轮未执行部署 / 域名切换动作，交付包的实际发布由运维完成，线上表现不作验收依据。这些按「一次只做一个主题，小步串行」进入后续批次，不包装成已完成。

## 数据集清单增补（第 33 轮）

原 17 类数据集之外新增 11 类：工单变更 18 条、退款 14 条、合同 16 条、合同版本 24 条、账单 24 条、月度对账 12 条、资金流水 30 条、提现 12 条、活动版本 18 条、调控记录 16 条、种植记录 24 条。全部由 `mock-data.js` 唯一数据源生成，字段与 `api.js` 契约一致；页面数由 131 增至 164。
