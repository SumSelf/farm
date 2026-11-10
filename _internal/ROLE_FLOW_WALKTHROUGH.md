# 闪马田园 SUMFARM · 五类使用者业务内容闭环走查报告

> 当前交付规模：**166 页**（前台 145 + 后台 21），资源版本 `v1.7.8`，域名 `iarm.fun`。本文出现的 118 / 127 / 131 / 143 页等为对应整改轮次当时的历史值，不代表当前页面数。


用户要求：**完整产品逻辑和使用者（租户、田园/集体商家、农户、技术专家、后台管理员）逻辑进行业务内容走查，是否业务内容闭环**。

验收句式只用「用户做了 X → 得到 Y」；「元素存在 / 无报错」只作前置条件，不算通过。

---

## 一、核查结论（先说结论）

**链接层此前已闭环，业务内容层没有闭环。** 上一轮「全站逻辑关联闭环」解决的是
「每页都有可点的业务联系跳转、没有入度 0 的死页」；这一轮按五类使用者逐链点下去，
发现的是更深一层问题：**走查当时全站 127 页，其中只有 39 页有专属业务渲染，其余 88 个业务节点
仍由 `pageGeneric` 的通用表格 / 占位表单 / 泛化说明撑着**。

| 现象 | 举例 | 为什么不算闭环 |
|---|---|---|
| 标题与内容是两套东西 | `farm-contract.html` 标题「承包合同」，内容是田园数据集字段表 + 通用说明 | 租户看不到合同条款、租金构成、确认动作 |
| 占位表单 | `activity-signup.html`、`produce-checkout.html` 的字段是「搜索 · 1 / 项目 · 2 / 内容 · 3」 | 报名、结算没有真实待填项 |
| 链条跳步 | `farm-detail.html` 首屏两个「立即订购 / 承包合同」都直接跳 `farm-payment.html` | 跳过承包方案与合同确认，且同页重复按钮 |
| 终点空转 | `orders.html` 卡片点进去回到 `account.html` | 订单没有详情、状态时间线与后续办理入口 |
| 状态不能推进 | `workorder-detail.html` 只有返回按钮和聊天框 | 农户接不了单、传不了回执、验收结算走不下去 |
| 商家看不到结果 | `farm-edit.html` 提交后只有一句 toast | 没有审核单号、三级审核进度、沟通交流 |
| 专家没有落点 | `expert-trials.html` 是通用表格 | 现场读数、技术结论没有提交位置 |
| 审核链断在口头 | 后台「通过并转复审」只弹提示 | 复审 / 终审工作台进不去 |

结论：**这是业务内容真缺陷，不是按钮数量问题**；已按「一次只做一个主题、小步串行」整改。

## 二、定死项（本轮一项未改）

品牌中英名 / 域名 / 备案 / 主体：闪马田园 · SUMFARM；`iarm.fun`；蜀ICP备18013136号；
闪马科技个人工作室；© 2026 SUMSTC. 保留所有权利.
发布形态：**一个包、一次发布**（`sumfarm-v1.7.0.zip` / 顶层 `sumfarm-v1.7.0/` / 单站点根，
`admin/` 只是根下独立文件夹）。资源版本按机制刷到 `?v=1.7.5`，包名与目录名不变。

## 三、渠道与职责边界（逐项列全，不写「等等」）

| 一级频道 | 属于它 | 不属于它 |
|---|---|---|
| 首页 | 四子栏目入口、身份导引、平台公告、精选田园 | 具体下单 / 审核 / 台账 |
| 田园 | 田块档案、按地区/土壤/分布筛选、对比、承包、合同、支付、商家发布与管理、审核进度 | 农事接单、论坛正文、后台审核 |
| 论坛 | 四版块文字列表、发帖、帖子详情、精华、版规、我的发布 | 交易、工单状态、价格表 |
| 专家 | 专家广场、排行、积分、认证、专栏、问答、管理历史、种植实践、技术结论、指导工单 | 农户接单结算、后台台账 |
| 接单 | 当前定位附近单、关联田园附近单、已接单、承接确认、作业回执、验收、结算、历史 | 给自己田派活（走个人 → 按田建单） |
| 个人 | 我的田园、我的工单、活动、消费订单、订单详情、发票、设置 | 商家审核后台、全站管控 |
| 价格公示 | 9 类目公示、查询、试算、规则、调价历史 | 下单 / 报名 / 发工单（只给直达链接） |
| 后台 | 台账、三级审核、聊天/评论管控、价格发布、权限、字典、导出、日志 | 前台导航可见内容 |

## 四、五类使用者的完整业务链（逐步写明页面文件）

### 1 租户 / 普通租赁用户

```
login.html（登录或注册）→ farms.html → farms-region / farms-soil / farms-map / farms-favorites
→ farm-detail.html?id=F001 → farm-compare.html → farms-lease.html?farm=F001
→ farm-contract.html → farm-payment.html → farm-success.html → order-detail.html?id=...
→ orders.html → account.html → workorder-new.html?farmId=... → workorder-detail.html?id=...
→ dispatch-verify.html → dispatch-settle.html → produce-delivery.html → produce-review.html → account-invoice.html
```
支链：活动 `activity.html → activity-detail → activity-signup → activity-checkin → activity-review`；
农产品 `produce.html → produce-detail → produce-cart → produce-checkout → produce-receipt → produce-review`；
场地 `venue-booking → venue-menu / venue-sports / venue-wedding / venue-camping`。

### 2 田园商家 / 村集体

```
login.html（商家身份）→ farm-edit.html（上传田园档案）→ 三级审核成功态（审核单号）
→ submission-status.html?id=AU001（提交/初审/复审/终审 + 沟通交流）
→ farm-manage.html → farm-gallery / farm-comments / farm-follow
→ merchant-orders.html（收到的租赁/活动/场地/农产品订单）
→ produce-stock.html（上架）/ venue-booking.html（场地档期）→ price.html（公示价目）
```

### 3 接单农户

```
login.html（农户身份）→ dispatch.html（定位附近单 / 关联田园附近单 / 已接单）
→ dispatch-nearby.html 或 dispatch-linked.html → dispatch-accept.html?job=...
→ dispatch-taken.html → workorder-detail.html?id=...（业务推进区）
→ dispatch-receipt.html（范围 / 用量 / 三段照片）→ dispatch-verify.html（验收结论）
→ dispatch-settle.html（结算对账）→ dispatch-history.html（六步流程留痕）
```

### 4 技术专家 / 产学研

```
login.html（产学研身份）→ experts.html → experts-rank.html → expert-apply.html（机构/方向/年限）
→ expert-detail.html?id=E001（田园、种植过程、管理历史、积分、论坛分享统计）
→ expert-points.html / expert-column.html / expert-qa.html / expert-history.html
→ expert-trials.html（种植实践）→ expert-conclusion.html?job=...（现场读数/技术结论/后续建议）
→ job-expert.html（专家指导工单）→ workorder-detail.html（验收归档）
```

### 5 平台管理员

```
admin/login.html（独立登录）→ admin/index.html?m=dashboard → 八类总览视图
→ admin/farms / users / workorders / chats / comments / planting / notices / prices 台账
→ admin/audit.html?id=AU001（初审 + 沟通交流）→ admin/audit-review.html（复审）
→ admin/audit-final.html（终审发布）→ admin/logs.html（审计日志）
→ admin/roles / dict / export（权限、字典、导出）
```

## 五、整改内容（按「新增引用立刻校验目标存在」执行）

1. **唯一业务节点映射 `BIZ`（130 节点）**：角色链、数据集、`BIZ_FIELDS` 中英字段标签、
   视图类型、上一步 / 下一步 / 跨链入口各只写一份；`bizKey()` 统一「文件名 + 后台目录前缀」
   查表，避免 `/admin/admin/` 错层。分派改为 `BIZ[bk] && !ROUTES[page]` 优先，
   **93 个非专属页全部改由 `bizGeneric()` 渲染**，不再落回 `pageGeneric`。
2. **专属业务视图**：按节点语义渲染真实记录表、文字行、专属表单（承包季数 / 支付方式 /
   报名人数 / 回执三段照片 / 验收结论 / 认证方向 / 技术结论等）、状态时间线、沟通交流框、
   成功态与动作条。数量文案一律由 `M.all(ds).length` 动态算；详情按 `?id=/farm=/job=` 参数渲染。
3. **7 个真实断点修复**：田块「立即订购」→ `farms-lease.html?farm=`；活动 / 农产品「下单」
   → `activity-signup.html` / `produce-cart.html`；订单卡片 → `order-detail.html?id=`；
   工单详情补「承接 / 回执 / 验收 / 结算 / 技术结论」推进区与状态推进可见反馈；
   商家发布 → 三级审核成功态 + 审核进度入口；后台「通过并转复审」→ 真的跳复审工作台；
   删除 `farm-detail.html` 首屏两个都指向支付页的历史重复按钮。
4. **新增 4 个闭环页面**：`order-detail.html`、`submission-status.html`、
   `merchant-orders.html`、`expert-conclusion.html`；流程组、站点地图、逐页双语文案、
   返回去向键（`back.orders/farms/account/experts`）、主视觉归属全部同步。
5. **表单与按钮边界**：`data-form="biz-form"` 提交 → 成功态（写明记录 ID、状态、
   下一步），重复提交加锁；成功态不再重复动作条里的「下一步」按钮；动作条每页最多
   一个「上一步」+ 一个「下一步」+ 若干不重复的跨链入口；动作目标 0 死链；
   返回按 `?from=` 逐层回退，无历史用 `replace` 兜底。
6. **类名隔离**：新增组件一律 `.sf-biz-*`，与价格挂接条 `.sf-pub-*`、卡片价格标签
   `.sf-price` 互不复用；后台在 `admin.css` 里做纯素化，不引入田园装饰。
7. **价格公示挂接不回退**：`priceStrip()` 仍由统一 `put()` 注入全部 131 页；
   所有涉及金额的业务节点都能展开本频道公示价目与本单价格构成。

## 六、逐按钮五问（新链上的关键按钮）

| 按钮 | 可见反馈 | 符合点击意图 | 跳过去是用户要的 | 怎么返回 | 边界 |
|---|---|---|---|---|---|
| 田块「立即订购」 | 进入承包租赁页并带 `farm=F001` | 是 | 承包季数 / 类型 / 联系人表单 | `?from=` 回田块详情 | 未登录也能看，提交才校验 |
| 承包页「提交并继续」 | 表单换成成功态，写明记录与下一步 | 是 | 合同页显示当前业务记录与公示口径 | 成功态回链上一步 | 必填为空拦下、重复提交加锁 |
| 动作条「下一步」 | 进入链上真实下一页，内容随参数变 | 是 | 合同 → 支付 → 成功 → 订单详情 | 动作条「上一步」 | 首页 prev / 末页 next 不越界 |
| 订单卡片 | 进入 `order-detail.html?id=` | 是 | 该订单金额、状态、关联田园 | `?from=orders.html` | 无效 id 走空态 |
| 工单「承接确认」 | 承接表单提交后出现成功态 | 是 | 已接工单页 | 动作条上一步 | 参数带 `job=` 不丢工单号 |
| 工单「记录状态推进」 | 页面出现状态已更新的提示条 + toast | 是 | 同页更新，不新增历史 | 无需返回 | 重复点击幂等 |
| 商家「查看审核进度」 | 进入 `submission-status.html?id=` | 是 | 四级时间线与沟通交流 | `?from=farm-edit.html` | 审核单号无效走空态 |
| 专家「提交技术结论」 | 成功态写明记录已进入流程 | 是 | 后续验收归档 | 动作条回种植实践 | 结论为空可提示 |
| 后台「通过并转复审」 | toast + 真的跳复审工作台 | 是 | 复审时间线与终审下一步 | 后台侧栏回总览 | 退回补正留在本页留意见 |

## 七、验收结果

| 项目 | 结果 |
|---|---|
| 独立五角色逐链真实点击 | **43 项全通过**（租户 18 / 商家 6 / 农户 7 / 专家 6 / 管理员 6），运行时错误 0 |
| 业务节点全量渲染检查 | 93 页：动作条 ≥2 个、无占位字段、有价格挂接、0 破图 / 0 溢出 / 0 控制台错误 |
| 静态回归 | **0 错误**，新增第 32 组断言（BIZ 覆盖、动作目标 0 死链、五链节点齐备、7 处断点修复在码、4 新页双语与返回去向、数量动态算、URL 参数差异化、0 页落回通用模板） |
| 运行时全量 | 真实 HTTP + Chromium 双视口，131 页逐页加载，明细见 `RUNTIME.md` |
| 包完整性 | `unzip -t` + 包内抽查，见 `CHECK.md` / `DEPLOY.md` |

## 七之二、全量回归中查出的两处真问题与本轮修复

按「每轮改完必须跑全量回归、禁止只测改动页面」重跑第 1 批交互时，又查出两处
BIZ 接管后的兼容问题，已当场修复并登记：

| 现象 | 判定 | 修复 |
|---|---|---|
| `farms-region.html` / `farms-soil.html` 被 BIZ 表格接管后，没有筛选、没有分页，`?id=F001/F002` 渲染同一批记录 | **真缺陷**：按地区找田 / 按土壤筛选的业务语义就是「找田列表」，丢掉分页与按参数差异化不符合硬性条款 | 恢复可分页卡片列表（复用唯一 `listFarms` + `pager`，点第 N 页真的换一批）；带 `?id=` 时按 URL 参数渲染单块田详情，不同编号内容不同 |
| `activity-calendar.html` 等台账节点丢了全选 / 删除二次确认 / 分享 | **真缺陷**：台账类页面缺常规管控能力 | `bizTable` 补 `.sf-check-del` 复选框列与 `.sf-biz-tools` 管控条，复用既有全局事件委托，不重复实现删除逻辑 |
| `contact.html` 旧断言仍按 `generic` 表单的 `f0` 字段取样 | **断言口径误报**（非功能缺陷）：页面已升级为业务专属表单（称呼 / 邮箱 / 留言） | 断言改按真实字段取样并检查成功态；登记为口径误报，没有改功能去迁就断言 |
| 论坛版块子页 `.sf-textrow` 归零 | **真缺陷**：BIZ 接管后论坛子页没沿用文字列表渲染器 | 按文件名判定论坛频道，`list` 分支走 `genTextRow`，10 行文字列表、0 图片卡片；第 32 组静态断言防回归 |

## 七之三、全量回归收尾的断言口径更正

第 1 批交互验收最后一处异常来自 `contact.html`：页面已升级为业务专属表单
（称呼 / 邮箱 / 留言，提交后出现成功态与 toast），旧断言仍按通用占位表单的
`f0` 字段取样，超时后整段交互被记为 1 条「交互验收过程」未通过。
这是**断言口径未跟上重构**，不是功能缺陷：已按真实字段 `name/email` 取样并
同时检查成功态，登记为口径误报，没有改功能去迁就断言。修复后重跑第 1 批，
`?id=F001/F002` 差异化、点第 N 页换一批、论坛文字列表、台账全选/删除二次确认、
五角色逐链点击均在同一批次内复验通过。

## 八、如实登记的遗留项（不包装成已完成）

- **页面长度**：首页桌面 8.3 屏 / 手机 13.8 屏，部分流程与价格子页 2.2~3.9 屏，
  仍超「单页不超过 3 屏、超过做左右翻页」口径。本轮业务动作条默认不额外撑屏，
  但历史长首页未重排分区，如实登记。
- **模拟态不落库**：前端静态模板的提交、审核、结算都是可见反馈与流程记录，
  真实持久化由 `api.js` 的后端接口承担；`USE_MOCK=true` 时不写回服务端。
- 131 页逐页独立设计图、每条模拟记录单独拍摄的照片仍未完成（按题材池与频道主视觉复用）。
- 线上部署与 `iarm.fun` 解析未由本方执行，不主动查线上、不拿线上表现作验收依据。
- 后台与前台在同一站点根，属逻辑隔离（独立登录 / 0 入口 / noindex / robots /
  Nginx `/admin/` 白名单或 Basic），**不是物理分离**；部署侧务必配置访问控制。

## 九、第 33 轮 · 用户级常规动作补齐

五角色每条链现在都有「正向办理 + 售后变更 + 资金/合同/内容管理 + 后台管控」四层。例如租户：看田 → 承包 → 派工 → 验收 → 结算，以及取消 → 退款 → 进度、改单 → 变更记录、重发 → 新单。详见 `BUSINESS_LOGIC_WALKTHROUGH.md`。
