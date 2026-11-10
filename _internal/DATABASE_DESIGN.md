# 闪马田园 SUMFARM · 平台系统数据库设计

> 本文件与 `db/schema.sql` 由 `gen_db.py` 同步生成；交付包内 DDL 可直接 `mysql < schema.sql` 执行。

## 1. 开工前定死的口径

| 规则 | 定义 | 为什么 |
|---|---|---|
| 关联列 | 带 `FOREIGN KEY ... REFERENCES` 的列，或语义上指向另一张表主键的 `*_id` 列 | 每张表 **0 或 1 个**，绝不出现第二个 |
| 软引用 | `*_no` 业务自然编码字符串（订单号、田块号、工单号、用户号…） | 是单据上印着的业务事实，**不是外键、不参与 JOIN**；跨实体由 API 层按编码查主档再组装响应 |
| 一维关联 | 业务链是「根表 → 一级子表」的星型/链式，不允许一张表同时挂 A、B 两个父表 | 用户订单表只跟 `user_id` 关联，不跟田块 / 活动 / 地址再建外键 |
| 无冗余列 | 同一业务事实只在一张表落库 | 订单不复制用户名、田名、区域；合同不复制用户信息；价目金额不复制进业务表 |
| 只存路径 | 图片 / 视频 / 回执 / 扫描件一律 `*_path VARCHAR(512)` | 全库 **0 个 BLOB / BYTEA / base64 列**；统一附件表 `attachment` 登记 MIME 与字节数 |
| 金额口径 | `BIGINT` 单位「分」，面积 `DECIMAL(10,2)` 单位「亩」，时间 `DATETIME` | 与前端 `request.js` 的 `amountCents / areaMu` 契约逐字对齐 |
| 枚举口径 | 状态 / 类型存代码，展示文案走 `dict_item` 与 `i18n.js` | 库里不存中英双语文案，避免重复数据列 |

**软引用为什么不算「第二个关联列」**：它是业务对象自身的自然键（快递单上写收件地址不等于数据库外键）。例如 `lease_order.ref_no` 记录「这次租的是 F001 这块田」，API 拿到 `ref_no` 后调 `getFarm(ref_no)` 取档案；库层没有第二条外键，`JOIN` 维度始终为 1。

- **身份枚举（与页面注册下拉、API `role` 参数完全一致）**：`consumer / merchant / grower / research / admin`。`grower` = 接单农户、`research` = 产学研团队；后端如需与旧 `farmer / expert` 编码互通，在接口层做归一映射，**不要**在页面与目录里并存两套值域。本轮反向走查已统一 40 处 `role` 定义。

## 2. 业务域划分（55 张表）

| 域 | 表数 | 职责边界 | 不属于本域 |
|---|---:|---|---|
| 主体域 | 6 | 账号、身份、资料、关注、通知 | 交易金额、田园读数、工单状态一律不进主体域 |
| 田园域 | 5 | 田园档案、四季读数、作物与采摘、配套设施、图册 | 租金金额（价格域）、订单（交易域） |
| 内容域 | 7 | 视频、宣发、论坛主帖与回帖、评论、点赞、统一附件登记 | 论坛积分（专家档案）、帖子关联订单 |
| 交易域 | 15 | 订单、明细、支付、合同与版本、账单、对账、退款、活动与报名、农产品与溯源 | 工单作业流程（工单域）、资金流水（资金域） |
| 工单域 | 7 | 工单主表、10 条明细、6 步流程、沟通、变更、接单大厅、验收回执 | 订单支付、合同文本、资金提现 |
| 资金域 | 4 | 资金账户、流水、提现申请与流程 | 订单成交额、账单净额（交易域各自落库） |
| 专家域 | 2 | 种植实践记录、调控建议与复核 | 专家积分（主体域）、论坛技术帖（内容域） |
| 价格域 | 5 | 公示版本、价目、调价历史、发布审核任务、田块租金快照 | 具体成交金额（交易域） |
| 管控域 | 4 | 多级审核任务、后台操作日志、数据字典、平台参数 | 前台业务数据本身 |

## 3. 表清单（逐表：中文名 / 唯一外键 / 软引用 / 关键列）

| # | 表名 | 中文名 | 域 | 外键（≤1） | 软引用 | 关键业务列 |
|---:|---|---|---|---|---|---|
| 1 | `platform_user` | 平台用户主档 | 主体域 | `—（0 外键根表 / 汇总表）` | — | user_no, role, display_name, phone_hash, email, status, region, avatar_path |
| 2 | `user_profile` | 用户实名与资料 | 主体域 | `user_id → platform_user(id)` | — | user_id, real_name, id_no_hash, intro, contact_path |
| 3 | `expert_profile` | 专家资质档案 | 主体域 | `user_id → platform_user(id)` | — | user_id, expert_no, title, org, domain, points, cert_path |
| 4 | `admin_account` | 后台管理员账号 | 主体域 | `—（0 外键根表 / 汇总表）` | — | admin_no, account, pass_hash, role, status, last_login_at |
| 5 | `follow_relation` | 关注与收藏 | 主体域 | `user_id → platform_user(id)` | target_no | user_id, target_type, target_no, kind |
| 6 | `user_notice` | 用户站内通知 | 主体域 | `user_id → platform_user(id)` | — | user_id, notice_no, kind, title, body, read_at |
| 7 | `farm_plot` | 田园档案主档 | 田园域 | `owner_user_id → platform_user(id)` | — | plot_no, owner_user_id, title, region, area_mu, soil_type, lease_type, lease_start, lease_end, status, cover_path |
| 8 | `plot_season_metric` | 四季温湿度读数 | 田园域 | `plot_id → farm_plot(id)` | — | plot_id, season, avg_temp_c, avg_humidity_pct |
| 9 | `plot_crop_record` | 历史 / 当前作物与采摘成果 | 田园域 | `plot_id → farm_plot(id)` | — | plot_id, kind, crop_name, season_year, yield_kg, receipt_path |
| 10 | `plot_facility` | 配套场地与菜单 | 田园域 | `plot_id → farm_plot(id)` | price_item_no | plot_id, kind, name, capacity, price_item_no, bookable |
| 11 | `plot_image` | 田园图册 | 田园域 | `plot_id → farm_plot(id)` | — | plot_id, file_path, caption, sort_no |
| 12 | `video_share` | 用户视频分享 | 内容域 | `user_id → platform_user(id)` | — | user_id, video_no, title, tag, cover_path, video_path, status |
| 13 | `promo_material` | 田园宣发内容 | 内容域 | `user_id → platform_user(id)` | — | user_id, promo_no, title, channel, body, cover_path |
| 14 | `forum_topic` | 论坛主帖 | 内容域 | `user_id → platform_user(id)` | — | user_id, topic_no, board, title, body, tags, status |
| 15 | `topic_reply` | 论坛回帖 | 内容域 | `topic_id → forum_topic(id)` | author_no | topic_id, author_no, body, status |
| 16 | `content_comment` | 全站评论 | 内容域 | `user_id → platform_user(id)` | target_no | user_id, comment_no, target_type, target_no, body, status |
| 17 | `content_like` | 点赞 | 内容域 | `user_id → platform_user(id)` | target_no | user_id, target_type, target_no |
| 18 | `attachment` | 统一附件登记 | 内容域 | `—（0 外键根表 / 汇总表）` | owner_no | attach_no, owner_type, owner_no, file_path, mime, size_bytes |
| 19 | `lease_order` | 用户订单主表 | 交易域 | `user_id → platform_user(id)` | ref_no | order_no, user_id, kind, ref_no, amount_cents, status, placed_at |
| 20 | `order_line` | 订单明细 | 交易域 | `order_id → lease_order(id)` | item_no | order_id, item_no, item_title, qty, unit_price_cents, amount_cents |
| 21 | `payment_record` | 支付流水 | 交易域 | `order_id → lease_order(id)` | — | order_id, pay_no, channel, amount_cents, status, paid_at |
| 22 | `contract_doc` | 承包合同 | 交易域 | `order_id → lease_order(id)` | — | contract_no, order_id, version, status, signed_at, scan_path |
| 23 | `contract_clause` | 合同条款 | 交易域 | `contract_id → contract_doc(id)` | — | contract_id, seq, body_zh, body_en |
| 24 | `contract_version` | 合同变更版本 | 交易域 | `contract_id → contract_doc(id)` | operator_no | contract_id, from_version, to_version, change_note, operator_no |
| 25 | `bill_item` | 对账账单明细 | 交易域 | `order_id → lease_order(id)` | — | bill_no, order_id, period, kind, receivable_cents, service_fee_cents, refunded_cents, net_cents, status |
| 26 | `reconciliation` | 商家对账单 | 交易域 | `—（0 外键根表 / 汇总表）` | subject_no | recon_no, period, subject_no, total_cents, status, checked_at |
| 27 | `refund_request` | 退款申请 | 交易域 | `order_id → lease_order(id)` | — | refund_no, order_id, amount_paid_cents, used_amount_cents, refund_amount_cents, reason_code, method, status, applied_at |
| 28 | `refund_flow` | 退款流程节点 | 交易域 | `refund_id → refund_request(id)` | operator_no | refund_id, step, status, operator_no, note |
| 29 | `activity_event` | 田园活动 / 场地档期 | 交易域 | `owner_user_id → platform_user(id)` | plot_no, price_item_no | activity_no, owner_user_id, title, kind, plot_no, start_at, capacity, price_item_no, content, cover_path, status |
| 30 | `activity_version` | 活动版本记录 | 交易域 | `activity_id → activity_event(id)` | — | activity_id, version, change_note, status |
| 31 | `activity_registration` | 活动报名 | 交易域 | `activity_id → activity_event(id)` | attendee_no, order_no | activity_id, attendee_no, order_no, status |
| 32 | `produce_item` | 农产品主档 | 交易域 | `owner_user_id → platform_user(id)` | price_item_no | trace_no, owner_user_id, name, category, unit, price_item_no, cover_path, status |
| 33 | `produce_trace` | 农产品溯源节点 | 交易域 | `produce_id → produce_item(id)` | — | produce_id, stage, note, receipt_path |
| 34 | `work_order` | 农事 / 专家指导工单主表 | 工单域 | `creator_user_id → platform_user(id)` | plot_no, assignee_no, price_item_no | wo_no, creator_user_id, type, plot_no, assignee_no, status, price_item_no |
| 35 | `work_order_item` | 工单明细需求条目 | 工单域 | `wo_id → work_order(id)` | — | wo_id, seq, item_key, content, required |
| 36 | `work_order_flow` | 工单固定流程节点 | 工单域 | `wo_id → work_order(id)` | operator_no | wo_id, step, status, operator_no, note, at |
| 37 | `work_order_chat` | 工单沟通消息 | 工单域 | `wo_id → work_order(id)` | sender_no, attach_no | wo_id, sender_no, body, kind, attach_no, at |
| 38 | `work_order_change` | 工单取消 / 修订 / 重发 | 工单域 | `wo_id → work_order(id)` | — | wo_id, kind, from_status, to_status, reason, amount_impact_cents, at |
| 39 | `dispatch_task` | 接单大厅任务 | 工单域 | `—（0 外键根表 / 汇总表）` | wo_no | dispatch_no, wo_no, scope, region, distance_km, status |
| 40 | `job_acceptance` | 工单验收回执 | 工单域 | `wo_id → work_order(id)` | — | wo_id, result, note, receipt_path, verified_at |
| 41 | `fund_account` | 农户 / 商家资金账户 | 资金域 | `user_id → platform_user(id)` | — | account_no, user_id, balance_cents, frozen_cents, status |
| 42 | `fund_entry` | 资金流水 | 资金域 | `account_id → fund_account(id)` | related_no | account_id, entry_no, kind, amount_cents, related_no, at |
| 43 | `withdrawal_request` | 提现申请 | 资金域 | `account_id → fund_account(id)` | — | wd_no, account_id, amount_cents, bank_no, status, applied_at |
| 44 | `withdrawal_flow` | 提现流程节点 | 资金域 | `wd_id → withdrawal_request(id)` | operator_no | wd_id, step, status, operator_no, at |
| 45 | `planting_record` | 种植实践与实验记录 | 专家域 | `—（0 外键根表 / 汇总表）` | plot_no, expert_no | record_no, plot_no, expert_no, crop, stage, reading_json, note, at |
| 46 | `regulation_advice` | 调控建议与复核 | 专家域 | `record_id → planting_record(id)` | — | record_id, dimension, before_value, target_value, action, status, review_note |
| 47 | `price_book` | 价格公示版本主档 | 价格域 | `—（0 外键根表 / 汇总表）` | — | version, period_from, period_to, status, published_at |
| 48 | `price_item` | 公示价目条目 | 价格域 | `book_id → price_book(id)` | — | book_id, item_no, cat, name_zh, name_en, unit, price_cents, scope, status |
| 49 | `price_change` | 调价公示历史 | 价格域 | `book_id → price_book(id)` | item_no | book_id, item_no, before_cents, after_cents, effective_at, notice_days, reason |
| 50 | `price_publish_task` | 价格发布审核任务 | 价格域 | `book_id → price_book(id)` | submitted_by | book_id, task_no, audit_level, status, submitted_by, note |
| 51 | `plot_rent_rate` | 田块租金试算快照 | 价格域 | `—（0 外键根表 / 汇总表）` | plot_no, book_version | plot_no, book_version, rate_cents, season_cents, deposit_cents, fee_cents, total_cents |
| 52 | `audit_task` | 多级审核任务 | 管控域 | `—（0 外键根表 / 汇总表）` | target_no, operator_no | audit_no, target_type, target_no, level, result, operator_no, comment, at |
| 53 | `admin_operation_log` | 后台操作日志 | 管控域 | `admin_id → admin_account(id)` | target_no | admin_id, module, action, target_no, at |
| 54 | `dict_item` | 数据字典 | 管控域 | `—（0 外键根表 / 汇总表）` | — | dict_key, dict_value_zh, dict_value_en, sort_no |
| 55 | `platform_config` | 平台参数 | 管控域 | `—（0 外键根表 / 汇总表）` | — | config_key, config_value |

**统计**：共 **55 张表**，其中 **44 张有且仅有 1 个外键**、**11 张为 0 外键根表/汇总表**，没有任何一张表出现第 2 个外键。

## 4. 三个关键的一维关联示例

**① 用户订单（用户点名的例子）**

```
lease_order
  ├─ user_id        → platform_user.id   【唯一外键】
  ├─ ref_no         VARCHAR(32)  ← 标的自然编号（F001 / A001 / P001），普通字符串、无外键
  └─ order_no       UNIQUE        ← 订单自身编号
order_line → order_id（唯一外键）+ item_no（软引用）
payment_record → order_id（唯一外键）
contract_doc → order_id（唯一外键）
```

要显示「订单里的田园名称」，API 走 `getOrder → 取 ref_no → getFarm(ref_no)`，库里不 JOIN 两张父表。

**② 工单挂靠田园**

```
work_order
  ├─ creator_user_id → platform_user.id  【唯一外键】
  ├─ plot_no        ← 挂靠田块编号（软引用）
  ├─ assignee_no    ← 承接农户 / 专家编号（软引用）
  └─ price_item_no  ← 公示价目编号（软引用）
work_order_item / flow / chat / change → wo_id（各自唯一外键）
```

「个人 → 我的田园 → 远程创建工单」提交时带 `plot_no`，工单表不建 `plot_id` 外键。

**③ 专家多维统计与调控**

```
planting_record（0 外键）   plot_no / expert_no / crop / stage / reading_json
regulation_advice → record_id（唯一外键） dimension / before / target / action
```

统计按 `crop / plot_no / stage` 在 API 层聚合，不在库里给记录表挂「田块 + 专家 + 实验」三个外键。

## 5. 文件与图片落库方式

- 业务主档允许一张封面：`cover_path VARCHAR(512)`，**只存路径**。
- 多图 / 视频 / 回执 / 合同扫描件统一登记 `attachment(attach_no, owner_type, owner_no, file_path, mime, size_bytes)`；`owner_no` 是软引用，不建 FK。
- `plot_image` / `video_share` / `produce_trace` / `job_acceptance` 的路径列均为 `VARCHAR(512)`，前端上传走 `POST /upload`，后端落对象存储后返回 `url`，库里只写这个 url。
- 全库扫描断言：`BLOB|BYTEA|VARBINARY|base64` 出现次数必须为 0（见 `db_api_crosscheck.py` 第 2 组）。

## 6. 列唯一性（无重复数据列）

| 业务事实 | 唯一落库位置 | 其它表如何拿到 |
|---|---|---|
| 用户显示名 / 角色 / 地区 | `platform_user` | 按 `user_no` 软引用，API 组装 |
| 专家积分 / 职称 | `expert_profile` | 专家页按 `expert_no` 查，不复制进帖子 |
| 田块面积 / 土壤 / 承包期 | `farm_plot` | 订单、工单、记录只存 `plot_no` |
| 四季温湿度 | `plot_season_metric` | 对比 / 统计页按 `plot_id` 读子表 |
| 公示单价 / 押金 / 服务费 | `price_item` + `plot_rent_rate` | 所有业务节点按 `item_no` 挂接，不写死金额 |
| 成交金额 | `lease_order.amount_cents` / `order_line` | 支付、退款、账单各自记自身金额（不同语义，各自独立业务） |
| 工单 6 步状态 | `work_order_flow` + `work_order.status` | 接单大厅按 `wo_no` 查，不复制流程节点 |
| 可用余额 | `fund_account.balance_cents` + `fund_entry` 流水 | 提现校验在 API 层按账户聚合，流水表不复制余额 |
| 审核结论 | `audit_task` | 田园 / 价格 / 评论页按 `target_no` 查，不在业务表加 `audit_status` 冗余列 |

## 7. 部署与复跑

```bash
mysql -u<user> -p sumfarm < db/schema.sql     # 幂等：先 DROP 再 CREATE，仅用于初始化 / 重建
python3 db_api_crosscheck.py                  # 数据库表 × API 交叉验证，输出 API_DB_CROSSCHECK.md
```

> 注意：`schema.sql` 含 `DROP TABLE IF EXISTS`，**只用于空库初始化或演示库重建**，生产库请用迁移脚本增量执行，交付说明见 `DEPLOY.md` 第 11 节。

