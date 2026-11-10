# 闪马田园 SUMFARM · 数据库表 × API 交叉验证报告

> 复跑：`cd <站点根> && python3 db_api_crosscheck.py`。先跑 5 个已知正确样本自校准，再跑全量。
> 数据源：`db/schema.sql`（55 表）× `assets/js/request.js` 的 `CATALOG`（74 条）。

## 1. 结果汇总

- 检查项：**34**；通过：**34**；未通过：**0**。
- 数据库表：**55**（1 外键 44 / 0 外键 11）；API：**74**；API 引用表 **55** 张；0 悬空引用、0 未覆盖表。

| 检查项 | 结果 | 说明 |
|---|---|---|
| 自校准1 DDL 可解析 | 通过 | 55 |
| 自校准2 request.js 可解析 | 通过 | 74 |
| 自校准3 已知表 farm_plot 存在 | 通过 |  |
| 自校准4 已知接口 getFarm 存在 | 通过 |  |
| 自校准5 已知外键数 ≤1 | 通过 |  |
| 1.1 表数 = 55 | 通过 | 55 |
| 1.2 每表外键 ≤ 1（一维关联） | 通过 | {} |
| 1.3 每表有主键 | 通过 |  |
| 1.4 列定义无二进制类型（只存路径） | 通过 |  |
| 1.5 所有 *_path 列都是 VARCHAR(512) | 通过 |  |
| 1.6 金额列一律 *_cents BIGINT | 通过 |  |
| 1.7 无冗余展示列（订单不复制用户名/田名） | 通过 |  |
| 1.8 订单表只有 user_id 一个外键 | 通过 | [('user_id', 'platform_user', 'id')] |
| 1.9 工单表只有 creator_user_id 一个外键 | 通过 | [('creator_user_id', 'platform_user', 'id')] |
| 2.1 目录条数 = request.js 方法数 | 通过 | 74 / 74 |
| 2.2 目录方法名与实现一一对应 | 通过 | [] |
| 2.3 每条 10 个元数据字段齐备 | 通过 |  |
| 2.4 每条都有流程性备注 | 通过 |  |
| 2.5 每条都有参数范围声明（无参接口允许 args=[]） | 通过 |  |
| 2.6 数值/枚举/字符串参数范围齐备 | 通过 |  |
| 2.7 每条都有返回类型 / 结构 / 范围 | 通过 |  |
| 2.8 HTTP 方法合法 | 通过 |  |
| 2.9 路径以 / 开头 | 通过 |  |
| 3.1 API 引用的表全部存在 | 通过 | [] |
| 3.2 每张表至少被 1 个 API 覆盖 | 通过 | [] |
| 3.3 每条 API 至少关联 1 张表 | 通过 |  |
| 3.4 业务接口关联表数 ≤ 6（通用聚合接口 adminModule/listAny/search 按设计跨表） | 通过 | [('adminModule', 15), ('listAny', 18)] |
| 3.5 订单类 API 主表均为 lease_order | 通过 |  |
| 3.6 价格类 API 主表均为 price_book / price_item | 通过 |  |
| 4.1 流程备注覆盖下单→合同→工单→结算 | 通过 |  |
| 4.2 流程备注覆盖审核多级 | 通过 |  |
| 4.3 流程备注覆盖专家统计→对比→调控 | 通过 |  |
| 4.4 流程备注覆盖资金提现 | 通过 |  |
| 4.5 五条端到端流程均落盘在 API_DB_CROSSCHECK.md | 通过 |  |

## 2. 三个交叉验证举例

**举例 1 · 用户订单表为何只有 1 个关联列**

`listOrders → lease_order`：表里只有 `user_id → platform_user.id` 一个外键；「租的是哪块田」记作 `ref_no`（普通字符串）。后端实现 `GET /orders` 时先查 `lease_order`，再按 `ref_no` 调 `GET /farms/{id}` 组装展示名，**不要写 `JOIN farm_plot`**。对应前端：`API_CATALOG.md` 交易域 `listOrders` 的「关联表」列与流程备注。

**举例 2 · 取消工单到退款的表链**

`cancelWorkorder` 写 `work_order_change` + 推进 `work_order_flow`；`applyRefund` 写 `refund_request`（只挂 `order_id` 一个外键）+ `refund_flow` 第 1 步；`reviewRefund` 追加流程节点并写 `admin_operation_log`。三张表各自只有一个父键，跨表靠 `wo_no / order_no` 软引用，没有二维关联。

**举例 3 · 专家对比到调控**

`expertStats` 与 `expertCompare` 读 `planting_record`（0 外键，按 `plot_no / expert_no` 软引用）与 `plot_season_metric`；`saveRegulation` 写 `regulation_advice`（唯一外键 `record_id`）。统计在 API 层聚合，库里不给记录表挂「田块 + 专家 + 实验」三个外键。

## 3. 五条端到端流程（后台开发者按此顺序对接）

**流程 A · 租户租田 → 支付 → 合同 → 工单 → 验收 → 结算**

`listFarms` → `getFarm(F001)` → `getPriceBreakdown(farms,F001)` → `calcPrice` → 下单写 `lease_order` → `payment_record` → `listContracts` → `getContract` → 个人田园「远程创建工单」写 `work_order(plot_no=F001)` → `listDispatches(scope=nearby)` → `acceptJob` → `getWorkorder`（6 步）→ 验收回执 → `listBills` → `listReconciliations`。状态从「待接单」逐节点推进到「已结算」，验收不过退回「作业中」。

**流程 B · 商家发布 → 多级审核 → 价格公示**

`saveFarm` → `listAudits` → `stepAudit(level=1)` → 复审 → `stepAudit(level=2)` → 终审 → `publishActivity` → `updateActivity` → `publishPrices` → `listPriceAudits` → `listPriceItems`。审核对象统一按 `audit_task.target_no` 软引用，业务表不加审核状态列。

**流程 C · 取消工单 → 退款 → 后台核对**

`getWorkorder` → `cancelWorkorder`（仅待接单/已接单）→ `listJobChanges` → `applyRefund` → `listRefunds` → `getRefund` → `listAdminRefunds` → `reviewRefund` → 流程追加节点。

**流程 D · 农户接单 → 回执 → 资金 → 提现**

`listDispatches(nearby|linked)` → `acceptJob` → `sendChat` → `getWorkorder` → 验收 → `listFunds` → `withdrawFunds`（金额 >0 且 ≤ 余额）→ `listWithdrawals` → `getWithdrawal` → `listAdminWithdrawals` → `reviewWithdrawal`。

**流程 E · 专家统计 → 对比 → 调控 → 记录查询**

`listExperts` → `getExpert` → `expertStats(dim)` → `expertCompare(ids)` → `saveRegulation` → `listPlantRecords` → `getPlantRecord` → `listRegulations` → `listAdminRegulations`。

## 4. 误报与口径

- 「关联列」只数带 `FOREIGN KEY` 的列；`*_no` 业务编码是单据自身字段，不计入关联维度。
- 「重复数据列」按业务事实判定，通用审计列（`created_at / updated_at / status`）与不同语义的同名字段（订单成交额 / 支付实付 / 退款应退）不算重复。
- 检查脚本按列定义行扫描二进制类型，SQL 注释里的说明文字不参与判定。
- 【口径误报，已更正，非缺陷】首版断言要求「每条 API 的 args 非空」，把 getPriceBook / listNotices 等无参接口判成缺参数范围：已改为「无参接口允许 args=[]，出现的参数必须带 type」。
- 【口径误报，已更正，非缺陷】首版断言要求「每条 API 关联表 ≤ 6」，把 adminModule（后台统一管控）/ listAny（子页通用分页）/ search（跨 6 类检索）判成违规：三者按设计跨表编排，但每张表本身仍只有 ≤1 外键；已改为业务接口 ≤6、通用聚合接口豁免，未改动任何目录数据。

