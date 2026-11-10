# 闪马田园 SUMFARM · 反向逻辑闭环走查报告

走查方向：**页面每一个选项 / 参数 → 哪条 API 消费 → 落到哪张表的哪一列 → 由哪条相关 API 接回页面**。与正向走查相反，专查「页面有得选、后台没人用」和「接口要参数、页面没地方给」的孤儿。

取样口径：真实 HTTP + Chromium 渲染后 DOM（166 页，单视口桌面），逐页取 `select/option`、`input/textarea[name]`、`a[href]`/`form[action]` 查询参数与 `data-*` 控制值；另补静态扫描 JS 的 `U.get()` 读取。不是看源码模板，是看用户实际能点到的东西。

## 一、结论

| 检查项 | 结果 |
|---|---|
| 页面 / 接口 / 表 / 表列 | 166 / 74 / 55 / 497 |
| 渲染后下拉 / 选项值 | 18 / 130 |
| 页面字段 / API 参数字段 | 117 / 129 |
| 孤儿下拉 / 孤儿页面参数 / 孤儿 API 参数 | 0 / 0 / 0 |
| 表列未被任何接口返回 | 0 |
| 孤立接口（无共享表邻居） | 0 |
| ID 参数传递断链 | 0 |
| 目录两处口径漂移 | 0 |
| 流程备注无关联接口 / 举例引用不存在接口 | 0 / 0 |
| 枚举值域与页面不一致 | 0 |
| 同名字段跨接口多义（按接口分别校验，非缺陷） | 2 |
| DDL 自校验错误 | 0 |
| **未闭环项合计** | **0** |

## 二、参数来源逐条登记（隐式来源不写清，本身就是孤儿）

纯 UI / 框架参数 25 个，全部写明去向、不落库：

| 参数 | 去向 |
|---|---|
| `agree` | 协议勾选，仅前端校验 |
| `auth` | 登录态标记，由 auth.js 显式透传 |
| `cat` | 接口目录分类筛选，仅开发者页前端 |
| `f` | 表单简写占位，仅前端 |
| `filter` | 筛选态，仅前端（对应接口字段见 status/kind/type） |
| `from` | 来源页，仅用于逐层返回，不进 API |
| `keyword` | 搜索关键词别名，仅前端 |
| `lang` | 界面语言，i18n 消费；同时是 listFarms 等接口的返回语言参数 |
| `level` | 日志级别，前端筛选后传 status |
| `m` | 后台总览模块参数，仅后台导航 |
| `mode` | 登录/注册双 Tab，仅前端 |
| `only` | 只看不同项 / 只看失败，仅前端 |
| `order` | 排序方向，仅前端 |
| `page` | 列表分页页码，由分页组件注入 |
| `pageSize` | 每页条数，由分页组件注入 |
| `q` | 搜索关键词，由搜索框注入 |
| `remember` | 记住登录，仅前端 |
| `robots` | meta robots，非参数 |
| `sort` | 排序，仅前端 |
| `tab` | 页内标签切换，仅前端 |
| `uid` | 登录用户编号，由 auth.js 透传 |
| `v` | 静态资源版本号，构建期注入，非业务参数 |
| `view` | 视图切换，仅前端 |
| `viewport` | meta viewport，非参数 |
| `window` | 统计时间窗别名，前端归一后传 period |

派生参数 54 个，虽不是页面直接选项，但来源链明确：

| 参数 | 来源链 |
|---|---|
| `acceptance` | 验收标准，创建工单明细需求条目 |
| `account` | 登录账号，登录表单输入 |
| `action` | 流程动作，由按钮 data-* 注入 |
| `amountCents` | PRICE_BOOK 单价 × areaMu 由前端试算，提交前再由服务端按 price_book 复算 |
| `areaMu` | 田园档案 farm_plot.area_mu，详情页只读展示 |
| `assigneeId` | 承接人由接单页选择农户/专家 → expert_profile / user_profile |
| `bank` | 提现银行卡，由资金页表单 |
| `before` | 变更前的旧值，由前端回填当前记录 |
| `board` | 论坛版块，由版块导航 / 下拉 |
| `bodyEn` | 中英双语正文，由 bodyZh 翻译字段并列提交 |
| `bodyZh` | 正文输入，论坛发帖 / 公告表单 |
| `capacity` | 场地容量，由活动表单 |
| `captcha` | 图形验证码，前端生成并校验 |
| `category` | 农产品品类，由筛选下拉 |
| `clauses` | 合同条款数组，由合同模板 contract_clause 组装 |
| `comment` | 评论内容，由表单输入 |
| `content` | 正文内容，由表单输入 |
| `contractId` | getContract 返回 contract_no → 修订 / 条款 / 对账 |
| `crop` | 作物品类，由种植记录下拉 |
| `date` | 日期，由表单 date 输入 |
| `decision` | 审核结论，由审核表单单选 |
| `detail` | 明细说明，由表单输入 |
| `dim` | 统计维度别名，归一后传 dimension |
| `dimension` | 专家多维度统计字段，统计页下拉 |
| `effectiveAt` | 生效时间，由表单日期选择 |
| `farmId` | 田园下拉 farm-switch 或详情页 ?id= → farm_plot.id |
| `ids` | 田块对比多选结果拼成逗号串 → farm_plot.id 集合 |
| `ids[]` | 同 ids，多选数组形态 |
| `kind` | 类型筛选，由列表筛选栏 |
| `leaseType` | 承包类型，由找田筛选下拉 |
| `lines` | 订单明细行，由购物车 / 报名记录组装 |
| `method` | 结算 / 支付方式，由表单下拉 |
| `name` | 名称，由表单输入 |
| `note` | 备注，由表单输入 |
| `orderId` | createLeaseOrder 返回 order_no → 订单详情 / 支付 / 合同 |
| `passphrase` | 后台独立登录口令，仅后台登录表单 |
| `period` | 账期 / 统计周期，由统计页周期下拉 |
| `reason` | 取消 / 退款 / 退回原因，由表单输入 |
| `recordId` | 种植记录列表 ?id= → planting_record.id |
| `region` | 地区，由找田筛选下拉 |
| `result` | 审核 / 验收结论，由表单决策字段 decision 组装后提交 |
| `role` | 五类身份，注册下拉与 ?role= 显式透传 |
| `scope` | 接单口径 nearby / taken / linked，由接单分区按钮 |
| `seasons` | 四季均温均湿，由 plot_season_metric 组装 |
| `soil` | 土壤类型，由找田筛选下拉 |
| `stage` | 工单流程步次，由固定 6 步状态字典映射 |
| `status` | 状态筛选 / 目标状态，由筛选栏与流程按钮 |
| `target` | 评论/点赞目标，归一后传 targetType |
| `targetType` | 目标类型，由列表项 data-* 注入 |
| `title` | 标题，由表单输入 |
| `type` | 工单 / 内容类型，由创建表单下拉 |
| `userId` | 登录态 auth.js 的 uid → 用户主档 platform_user.user_no |
| `version` | 公示版本号，由 price_book.version 回填 |
| `workorderId` | createWorkorder 返回 wo_no → 详情 / 取消 / 退款 / 修订 / 重发 |

## 三、表列反向索引

`db/column_api_index.json` 给 497 个表列逐个登记「由哪些接口返回 / 由哪些接口按它筛选或写入」，后台开发者可按列反查接口，不需要猜 SELECT 字段。`db/api_catalog.json` 每条接口的 `columns` 由唯一 `schema.sql` 自动推导（`python3 gen_column_map.py` 幂等复跑），两处不会漂移。

## 四、接口邻接与端到端链路

每条接口按「共享同一张表」关联到其它接口；74 条接口全部有邻居，无孤立接口。典型闭环（从页面选项出发）：

1. **找田筛选** `region / soil / leaseType` → `listFarms(p.region, p.soil, p.leaseType)` → `farm_plot.region / soil_type / lease_type` → `getFarm(id)` → `calcPrice(farmId, areaMu, seasons)` → `listOrders` / `listContracts` / `getPriceBreakdown` 回显租金构成。
2. **工单明细** 按田建单页 `farmId / type / priority / acceptance / safety / settle` → `reissueWorkorder`（原单号为空即新建，与重发共用同一 payload）→ `work_order / work_order_item / work_order_flow` → `listWorkorders(status)` → `getWorkorder(workorderId)` → `acceptJob` 承接 → `sendChat` 留痕。
3. **售后链** 详情页「取消 / 退款 / 修改 / 重发」→ `cancelWorkorder(workorderId, reason)` → `applyRefund(orderId, method, reason)` → `getRefund` → `reviewRefund(decision)` → `listFunds` / `listBills` 回写资金与对账。
4. **专家调控** 统计页 `dimension / period / field` → `expertStats` → `planting_record` / `plot_season_metric` → `expertCompare(ids)` → `saveRegulation(recordId, dimension, action)` → `listRegulations` / `listPlantRecords` 查询回显。
5. **价格公示** 后台 `publishPrices(version, effectiveAt, lines)` → `price_book` / `price_item` → `getPriceBook` / `getPriceBreakdown` / `calcPrice` → 全站 166 页价格条与本单构成同步。

## 五、本轮查出的真缺陷与修复

上一轮「数据库完成」只做了表名交叉验证，没有真正执行 DDL，反向走查才发现三处硬伤：

1. **55 张表全部带 `PRIMARY KEY (...), ,UNIQUE/...` 重复逗号**（108 处）：MySQL 语法直接报错，全库建不起来。已全量清除。
2. **44 个外键中 15 个引用 `platform_user.user_id`**，而该表主键是 `id`、根本没有 `user_id` 列：外键指向不存在的列。已统一改为 `REFERENCES platform_user(id)`。
3. **`work_order` 表重复定义 `created_at` 两次**（发布时间 / 创建时间），违反「无重复数据列」：删去冗余列并补 `updated_at`，与其余 54 张表审计列口径一致。

新增 `ddl_check.py`：逐表核对括号、重复逗号、重复列、外键本地列与引用列存在性、单表外键 ≤ 1、无二进制列，并把 MySQL DDL 转译成 SQLite 后**实际建库执行**，当前 55 张表全部建成、错误 0。如实说明：沙盒没有 MySQL 实例，实际执行的是 SQLite 转译版；MySQL 专有类型语义以 `schema.sql` 为准。

反向走查又在「页面选项 ↔ 接口参数」这一层查出四处真缺陷，均已修复：

4. **7 个下拉、71 个表单字段没有任何 API 参数消费**：按田建单页的 `priority / qualification / settle`、田园切换 `farm-switch / plot`、活动时段 `slot`、专家领域 `field` 等，用户选了之后目录里根本没有对应字段，是真正的孤儿选项。已把 100 项字段补进 `reissueWorkorder / saveFarm / publishActivity / updateActivity / saveTopic / saveContract / saveRegulation / applyRefund / expertStats` 的参数范围，并逐条写明类型、长度与去向；按田建单与重新发起共用同一 payload（原单号为空即新建）。
5. **角色 / 退款去向 / 管控结论值域不一致**：注册下拉给的是 `grower / research`，API 目录却只认 `farmer / expert`；退款去向页面是 5 个中文选项、API 只认 `original / balance / bank`；审核结论页面有「已驳回 / 转复审」而 API 枚举里没有。三处都会让 `validate()` 真实拦下用户的选择。已把 40 处 `role` 统一为 `consumer / merchant / grower / research / admin`、`method` 与 `decision` 扩为页面真实选项并注明后端归一规则，同时更新 `platform_user.role` 的列注释。
6. **`upload` 流程备注没有关联接口**：只写了「选文件 → 本接口」，没有说明路径由谁带回页面。已补 `saveFarm / reissueWorkorder / sendChat` 写入、`getFarm / getWorkorder / listChats` 回显的完整链路。
7. **上一版报告的端到端流程举例引用了 6 个不存在的接口名**（`createWorkorder / submitReceipt / acceptWorkorder / settleWorkorder / adminRefund / expertAdjust`）：文档本身制造假闭环。已全部替换为 `db/api_catalog.json` 里真实存在的接口，并加断言按目录名逐条核验。

整改后两条前端口径不会漂移：`patch_catalog.py` 改唯一 `db/api_catalog.json`，再把整份目录幂等回灌到 `request.js` 内嵌 `CATALOG`；`reverse_audit.py` 每次都比对两处完全一致。

## 六、误报更正登记（当场更正，不留成已知问题）

- 首版审计只扫静态 HTML 的 `<select>`，而全站下拉绝大多数由 `app.js` 模板字符串拼出，静态正则只抓到 4 个业务参数、误报 56 个「孤儿 API 参数」。已改为渲染后 DOM 取样（166 页）并补 JS 读取来源，属取样口径误报，非页面缺陷。
- 探针首版把 `decodeURIComponent` 用在非编码 `%` 上抛 URIError，整页退化成空结果；后又漏起 HTTP 服务线程导致 `goto` 超时、改用 `domcontentloaded + 900ms` 重绘等待。三条都属探针自身缺陷，已修复并重跑，页面未改。
- `auth / uid / m / v` 首版被判为孤儿参数，实际是登录态透传、后台模块参数与构建期资源版本号，已在纯 UI 参数表逐条写明去向，属分类口径误报。
- 首版「ID 参数传递断链」断言写成 `"id" in returned_by`（里面存的是接口名、不是列名），7 个实体全部误报。已改为判断 `%s.id` 的 `returned_by` 是否非空，属断言逻辑错误，非数据缺陷。
- 首版把同名字段跨接口的不同枚举聚合成一个值域比对，导致 `kind`（列表接口是 string 筛选、`sendChat` 是 `text/image` 枚举）误报 11 个「页面多出值」。已改为识别同名多义、按 (接口, 字段) 维度分别校验并登记，属比对口径误报。
- 首版只把页面字段当「请求参数」比对 API args，`email / id / area` 等由接口返回的展示字段全被判成孤儿。已把 497 个表列（含 camel→snake 归一）与返回 shape 纳入反向索引，属判定范围误报。

## 七、如实说明

- 前端 `SF_REQUEST.config.useMock = true`，全部 74 条走本地仿真；接真实后端需置 `false` 并按 `db/api_catalog.json` 生成路由与参数校验，否则会出现「页面有参数、后端不认」的新孤儿。
- 线上部署与 `iarm.fun` 解析未由本方执行；不主动查线上，线上表现不作验收依据。
- 166 页逐页独立设计图、每条模拟记录专属照片仍复用题材切图。
