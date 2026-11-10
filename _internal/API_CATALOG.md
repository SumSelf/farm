# 闪马田园 SUMFARM · 统一 API 目录（后台对接手册）

> 唯一实现：`assets/js/request.js`（`window.SF_REQUEST` / 兼容别名 `window.SF_API`）。本文件与 `db/api_catalog.json`、`db/schema.sql`、`db_api_crosscheck.py` 同步生成。

## 1. 统一约定（所有接口一致）

| 项 | 约定 |
|---|---|
| 基础路径 | `https://iarm.fun/api/v1`；`SF_REQUEST.config.base` 可改 |
| 认证 | `Authorization: Bearer <token>`；后台独立登录 `/admin/login` 返回 token |
| 响应包 | `{ code:number, message:string, data:T, traceId:string }`，`code=0` 为成功 |
| 分页 | `Paginated<T> = { items:T[], total, page, pageSize, pages }`；`1 ≤ page ≤ pages`，`1 ≤ pageSize ≤ 50` |
| 金额 | 所有 `*_Cents` 字段单位「分」，前端展示 `/100`；面积 `areaMu` 单位「亩」 |
| 时间 | ISO 8601 字符串 |
| 参数范围 | 由 `SF_REQUEST.validate()` 在调用前真实执行；越界返回 `code=4001` 并列出全部错误 |
| 错误码 | `4001` 参数越界 / `4001..4099` 业务校验 / `404` 记录不存在 / `5000` 未捕获异常 |
| 模拟开关 | `SF_REQUEST.config.useMock = false` 整体切真实 `fetch`；页面代码一行不改 |
| 静态资源版本 | `?v=1.7.8`，CSS/JS 长缓存、HTML 不缓存 |
| 数据库 | 不存文件二进制；上传只返回 `url` 路径，库里写 `*_path` |

## 2. 目录总览

- 接口总数：**74**；覆盖数据库表：**55 / 55**（0 悬空引用、0 未覆盖表）。
- 每条含：方法名、HTTP 方法与路径、业务说明、**关联数据库表**、**请求参数范围**、**返回参数范围**、**流程性备注**。

| 域 | 接口数 | 主要关联表 |
|---|---:|---|
| 专家域 | 7 | `farm_plot`, `planting_record`, `plot_crop_record`, `plot_season_metric`, `regulation_advice` |
| 主体域 | 4 | `expert_profile`, `forum_topic`, `planting_record`, `platform_user`, `user_notice`, `user_profile`… |
| 交易域 | 19 | `activity_event`, `activity_registration`, `activity_version`, `bill_item`, `contract_clause`, `contract_doc`… |
| 价格域 | 8 | `audit_task`, `farm_plot`, `lease_order`, `plot_rent_rate`, `price_book`, `price_change`… |
| 内容域 | 7 | `attachment`, `audit_task`, `content_comment`, `dict_item`, `forum_topic`, `promo_material`… |
| 工单域 | 10 | `attachment`, `dispatch_task`, `job_acceptance`, `refund_request`, `work_order`, `work_order_change`… |
| 检索域 | 2 | `activity_event`, `bill_item`, `content_like`, `contract_doc`, `dispatch_task`, `expert_profile`… |
| 田园域 | 3 | `audit_task`, `content_comment`, `farm_plot`, `plot_crop_record`, `plot_facility`, `plot_image`… |
| 管控域 | 10 | `admin_account`, `admin_operation_log`, `audit_task`, `content_comment`, `contract_doc`, `contract_version`… |
| 资金域 | 4 | `fund_account`, `fund_entry`, `withdrawal_flow`, `withdrawal_request` |

## 3. 逐条接口（按域）

### 专家域（7 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listPlantings` | `GET /plantings` | 后台种植信息管理 | `planting_record`, `regulation_advice` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「种植信息」→ 本接口 |
| 2 | `expertStats` | `GET /expert/stats` | 专家多维统计（按作物 / 田块 / 阶段分组重算均值） | `planting_record`, `regulation_advice` | `p`:object；min=0；max=40；fields(50)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result,dim,plot,field,table,h1,h2,t1,t2,t3,t4,new,old,msg,message,job,jobId,activity,activityId,produce,farm,farm-switch,count,qty | `ExpertStats` · dimension / groups[{key,count,avgReadings,avgYield}] / total；范围：groups.length ≥ 1；count ≥ 0；均值 ≥ 0 | ① 专家工作台「多维统计」→ 本接口（dim 切换必须重算）→ ② expertCompare |
| 3 | `expertCompare` | `GET /expert/compare` | 专家数据对比：相同项合并、不同项高亮 | `planting_record`, `farm_plot`, `plot_season_metric` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `ExpertCompare` · picks[] / same[] / diff[] / highlightCount；范围：picks.length ≤ 3；diff 行必须高亮；相同项跨列缩成一行 | ② 统计页「对比」→ 本接口（ids 最多 3 块）→ ③ saveRegulation 调控 |
| 4 | `listPlantRecords` | `GET /expert/plant-records` | 种植记录查询（按作物 / 阶段筛选真的改变条数） | `planting_record`, `plot_crop_record` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 专家「种植记录查询」→ 本接口 → ② getPlantRecord 看本阶段读数 |
| 5 | `getPlantRecord` | `GET /expert/plant-records/{id}` | 种植记录详情与读数回执 | `planting_record`, `regulation_advice` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 列表点记录 → 本接口；不同 id 读数不同 |
| 6 | `listRegulations` | `GET /expert/regulations` | 调控记录台账（维度 / 动作 / 状态 / 复核结论） | `regulation_advice`, `planting_record` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ③ 调控提交后 → 本接口 → ④ 后台 listAdminRegulations |
| 7 | `saveRegulation` | `POST /expert/regulations` | 提交调控建议，状态为「待执行」 | `regulation_advice`, `planting_record` | `body`:object；min=0；max=40；fields(11)=recordId,dimension,before,target,action,advice,conclusion,basis,actual,estimate,readings；必填=dimension,action | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ③ 对比页「调控」→ 本接口 → ④ 调控记录页 |

### 主体域（4 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listExperts` | `GET /experts` | 专家列表按积分降序 | `expert_profile`, `platform_user` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 专家频道 → 本接口 → ② getExpert → ③ expertStats / expertCompare |
| 2 | `getExpert` | `GET /experts/{id}` | 专家主页：个人田园统计、种植过程、管理历史、技术帖 | `expert_profile`, `planting_record`, `work_order`, `forum_topic` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 专家列表点专家 → 本接口；统计数字按各表实时聚合 |
| 3 | `listUsers` | `GET /users` | 后台用户台账 | `platform_user`, `user_profile` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「用户台账」→ 本接口 |
| 4 | `listNotices` | `GET /notices` | 站内通知列表 | `user_notice` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `T[]` · 数组；范围：数组长度 ≥ 0，元素字段见关联表列 | ① 个人「消息通知」→ 本接口 |

### 交易域（19 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listActivities` | `GET /activities` | 分页查田园活动与场地档期 | `activity_event`, `plot_facility` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 活动分享子栏目 → 本接口 → ② getActivity → ③ listActivityRegistrations 报名 |
| 2 | `getActivity` | `GET /activities/{id}` | 活动详情 | `activity_event`, `activity_version` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 活动列表点标题 → 本接口 |
| 3 | `listProduces` | `GET /produces` | 分页查农产品与溯源码 | `produce_item`, `produce_trace` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 农产品分享 → 本接口 → ② getProduce → ③ 下单走 lease_order |
| 4 | `getProduce` | `GET /produces/{id}` | 农产品详情与溯源链 | `produce_item`, `produce_trace` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 列表点农产品 → 本接口 |
| 5 | `listOrders` | `GET /orders` | 我的订单列表 | `lease_order`, `order_line`, `payment_record` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 个人「历史消费」→ 本接口 → ② getPriceBreakdown 看金额构成 |
| 6 | `listRefunds` | `GET /refunds` | 退款申请列表 | `refund_request`, `refund_flow`, `lease_order` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 取消工单后 → 本接口 → ③ getRefund 看 4 步时间线 |
| 7 | `getRefund` | `GET /refunds/{id}` | 退款详情与 4 步流程 | `refund_request`, `refund_flow` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ③ 列表点退款单 → 本接口 |
| 8 | `applyRefund` | `POST /refunds` | 发起退款申请 | `refund_request`, `refund_flow` | `body`:object；min=0；max=40；fields(8)=orderId,workorderId,reason,method,amount,payer,repeat,confirm；必填=reason,method | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 取消成功页「申请退款」→ 本接口 → ③ 退款状态页 |
| 9 | `listContracts` | `GET /contracts` | 租赁合同列表 | `contract_doc`, `contract_clause`, `lease_order` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 商家「合同管理」→ 本接口 → ② getContract / listContractVersions |
| 10 | `getContract` | `GET /contracts/{id}` | 合同详情与条款 | `contract_doc`, `contract_clause` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 列表点合同 → 本接口 |
| 11 | `listContractVersions` | `GET /contracts/{id}/versions` | 合同版本逐条对照 | `contract_version`, `contract_doc` | `id`:code；`p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 合同详情「版本记录」→ 本接口 → ③ saveContract 提交变更 |
| 12 | `saveContract` | `POST /contracts` | 修改租赁合同内容并提交变更审核 | `contract_doc`, `contract_version`, `contract_clause` | `body`:object；min=0；max=40；fields(7)=contractId,reason,clauses,copyFrom,effective,remark,dispute；必填=reason,clauses | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ③ 合同编辑页 → 本接口 → ④ 版本对照页（status=变更审核中） |
| 13 | `listBills` | `GET /bills` | 账单明细（应收 / 服务费 / 已退 / 净额） | `bill_item`, `lease_order` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 商家「对账查看」→ 本接口 → ② listReconciliations 汇总 |
| 14 | `listReconciliations` | `GET /reconciliations` | 对账单列表 | `reconciliation`, `bill_item` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 账单页点账期 → 本接口 → ③ getReconciliation 看明细 |
| 15 | `getReconciliation` | `GET /reconciliations/{id}` | 对账单详情与当期账单明细 | `reconciliation`, `bill_item` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ③ 列表点对账单 → 本接口 |
| 16 | `listActivityVersions` | `GET /activities/{id}/versions` | 活动更新版本记录 | `activity_version`, `activity_event` | `id`:code；`p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 商家「更新活动」→ 本接口 → ② updateActivity 提交新版本 |
| 17 | `listActivityRegistrations` | `GET /activities/{id}/registrations` | 活动报名名单 | `activity_registration`, `lease_order` | `id`:code；`p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 活动详情「报名」→ 本接口 |
| 18 | `publishActivity` | `POST /activities` | 商家发布活动 | `activity_event`, `activity_version`, `price_item` | `body`:object；min=0；max=40；fields(17)=title,kind,farmId,date,capacity,slot,guests,price,descZh,content,photos,field,address,contact,phone,org,team；必填=title,kind | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ① 商家「发布活动」→ 本接口 → ② 活动管理页 |
| 19 | `updateActivity` | `POST /activities/{id}` | 商家更新活动内容并留版本 | `activity_event`, `activity_version` | `id`:code；`body`:object；min=0；max=40；fields(13)=title,content,slot,guests,price,descZh,photos,field,address,contact,phone,org,team；必填=title | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 活动编辑页 → 本接口 → ③ 版本记录页 |

### 价格域（8 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `getPriceBook` | `GET /prices` | 价格公示总账（9 类目 / 38 条价目 / 规则 / 调价历史） | `price_book`, `price_item`, `price_change` | —（无参数） | `PriceBook` · version / period / cats[] / items[] / rules[] / changes[] / stats；范围：cats.length = 9；items.length = 38；金额分 ≥ 0；version 非空 | ① 任一页面价格挂接条 → 本接口 → ② listPriceItems / getPriceBreakdown |
| 2 | `listPriceItems` | `GET /prices/items` | 公示价目分页列表，按类目 / 状态过滤 | `price_item`, `price_book` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 价格总览展开 → 本接口 → ③ 点条目看本单构成 |
| 3 | `listPricePlots` | `GET /prices/plots` | 24 块田的租金、押金、服务费、首期应付 | `plot_rent_rate`, `farm_plot`, `price_book` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 租金标准页 → 本接口 → ② 回田园档案核对面积 |
| 4 | `getPriceBreakdown` | `GET /prices/breakdown` | 按数据集与记录 id 取「本单价格构成」 | `price_item`, `plot_rent_rate`, `lease_order` | `ds`:enum；enum=farms/activities/produces/workorders/experts/orders；`id`:code | `PriceBreakdown` · ds / id / lines[{labelZh,labelEn,amountZh,amountEn,noteZh,noteEn}] / totalCents；范围：lines.length ≥ 1；totalCents ≥ 0；金额一律分 | ② 详情页 ?id= → 本接口 → 显示逐行金额与合计 |
| 5 | `calcPrice` | `POST /prices/calc` | 租金试算（不落库、不创建订单） | `plot_rent_rate`, `price_item`, `farm_plot` | `body`:object；min=0；max=40；fields(4)=farmId,areaMu,seasons,leaseType；必填=farmId | `PriceBreakdown` · 同上；范围：试算结果不写库；totalCents 由单价 × 面积 × 季数实时算 | ① 租金试算器填面积 / 季数 / 承包类型 → 本接口 → ② 展示 4 行金额与首期应付 |
| 6 | `listPriceChanges` | `GET /prices/changes` | 调价公示历史 | `price_change`, `price_book` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 价格公示「调价历史」→ 本接口 |
| 7 | `publishPrices` | `POST /admin/prices/publish` | 后台发布新价格版本，进入多级审核队列 | `price_book`, `price_publish_task`, `audit_task` | `body`:object；min=0；max=40；fields(4)=version,effectiveAt,note,lines；必填=version,lines | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ① 后台价格管理「发布」→ 本接口 → ② listPriceAudits → ③ 三级审核 |
| 8 | `listPriceAudits` | `GET /admin/prices/audit` | 价格发布审核工作台 | `price_publish_task`, `audit_task` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 发布后 → 本接口 → ③ 逐级审核 |

### 内容域（7 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listVideos` | `GET /videos` | 首页热点用户视频分享列表 | `video_share`, `attachment` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 首页「热点视频分享」→ 本接口 |
| 2 | `listPromos` | `GET /promos` | 首页田园宣发内容列表 | `promo_material`, `attachment` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 首页「田园宣发内容」→ 本接口 |
| 3 | `listTopics` | `GET /forum/topics` | 论坛文字列表，按版块 / 关键词过滤 | `forum_topic` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 论坛频道 → 本接口 → ② getTopic 看帖 → ③ sendChat / 回帖 |
| 4 | `getTopic` | `GET /forum/topics/{id}` | 帖子详情与回复列表 | `forum_topic`, `topic_reply`, `content_comment` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 论坛列表点标题 → 本接口；回复数由 topic_reply 聚合 |
| 5 | `saveTopic` | `POST /forum/topics` | 发起新帖，进入内容审核 | `forum_topic`, `audit_task` | `body`:object；min=0；max=40；`body`:object；fields(5)=board,bodyZh,bodyEn,title,name | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ③ 论坛「发起新帖」→ 本接口 → ④ 我已发布页 |
| 6 | `listComments` | `GET /comments` | 后台评论管理列表 | `content_comment`, `dict_item` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「评论管理」→ 本接口 → ② 隐藏 / 通过走审核 |
| 7 | `upload` | `POST /upload` | 上传图片 / 视频 / 回执，返回路径，库里只存路径 | `attachment` | `file`:file；≤20971520B；MIME 白名单 5 种 | `UploadResult` · url / width / height；范围：url 为路径字符串；宽度 1..8192；高度 1..8192 | ① 表单选文件 → 本接口（只写 attachment.file_path，不写二进制） → ② saveFarm / reissueWorkorder / sendChat 等业务接口带 attach_no → ③ getFarm / getWorkorder / listChats 回显路径 |

### 工单域（10 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listWorkorders` | `GET /workorders` | 工单总览（状态徽章 + 第 N/6 步） | `work_order`, `work_order_item`, `work_order_flow` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 接单 / 个人频道 → 本接口 → ② getWorkorder → ③ cancelWorkorder / amendWorkorder |
| 2 | `getWorkorder` | `GET /workorders/{id}` | 工单详情：10 条明细、6 步时间线、对话、验收回执 | `work_order`, `work_order_item`, `work_order_flow`, `work_order_chat`, `job_acceptance` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 列表点工单 → 本接口；验收不过退回「作业中」 |
| 3 | `listDispatches` | `GET /dispatches` | 接单大厅：当前定位附近单 / 已接单 / 关联田园附近单 | `dispatch_task`, `work_order` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 接单频道两个分区 → 本接口（scope 不同口径不同数据）→ ② acceptJob |
| 4 | `acceptJob` | `POST /dispatches/{id}/accept` | 农户承接工单，推进到「已接单」 | `dispatch_task`, `work_order_flow` | `body`:object；min=0；max=40；fields(2)=workorderId,assigneeId；必填=workorderId,assigneeId；会话注入(忽略前端)=assigneeId | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 附近单点「承接」→ 本接口 → ③ 工单详情第 2 步 |
| 5 | `listChats` | `GET /chats` | 按工单编号取沟通消息 | `work_order_chat`, `attachment` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result；必填=workorderId | `T[]` · 数组；范围：数组长度 ≥ 0，元素字段见关联表列 | ① 个人「工单聊天」→ 本接口 → ② sendChat |
| 6 | `sendChat` | `POST /chats` | 在工单对话框发消息 | `work_order_chat`, `attachment` | `body`:object；min=0；max=40；fields(4)=workorderId,bodyZh,bodyEn,kind；必填=workorderId,bodyZh | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 对话框输入 → 本接口 → 消息追加到时间线；图片只传 attach_no |
| 7 | `listJobChanges` | `GET /workorders/changes` | 工单取消 / 修订 / 重发变更记录 | `work_order_change`, `work_order` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 工单详情「变更记录」→ 本接口 |
| 8 | `cancelWorkorder` | `POST /workorders/{id}/cancel` | 取消工单（仅待接单 / 已接单可取消） | `work_order_change`, `work_order_flow`, `refund_request` | `id`:code；`body`:object；min=0；max=40；fields(2)=reason,detail；必填=reason | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ① 工单详情「取消」→ 本接口 → ② applyRefund 申请退款 |
| 9 | `amendWorkorder` | `POST /workorders/{id}/amend` | 修改工单明细需求后重新待接单 | `work_order_change`, `work_order_item` | `id`:code；`body`:object；min=0；max=40；fields(3)=scope,window,acceptance；必填=scope,acceptance | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ① 工单详情「修改」→ 本接口 → ② 变更记录页 |
| 10 | `reissueWorkorder` | `POST /workorders/{id}/reissue` | 新建工单（无原单号时）或按原单重新发起；页面表单字段与本接口一一对应 | `work_order_change`, `work_order` | `id`:code；`body`:object；min=0；max=40；fields(15)=farmId,type,scope,priority,qualification,settle,budget,safety,materials,acceptance,window,due,note,plotNo,photo；必填=farmId,type | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ① 个人田园「远程创建工单」/ 按田建单页逐项填写 → 本接口（原单号为空即新建） → ② listWorkorders / getWorkorder 看状态 → ③ acceptJob 承接 → ④ cancelWorkorder / amendWorkorder / applyRefund 售后 |

### 检索域（2 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `search` | `GET /search` | 跨 6 类数据集按关键词真实过滤 | `farm_plot`, `activity_event`, `produce_item`, `forum_topic`, `work_order`, `expert_profile` | `q`:string；min=0；max=64；`page`:int；min=1；max=1000 | `SearchResult` · groups[{key,label,items,total}] / total / page；范围：groups.length = 6；每组 items ≤ 4；total ≥ 0 | ① hero 搜索框输入 → 本接口 → ② 点结果进对应详情 |
| 2 | `listAny` | `GET /{dataset}` | 子页体系通用分页接口（含收藏 / 关注 / 支付台账等子页取数） | `farm_plot`, `activity_event`, `produce_item`, `forum_topic`, `work_order`, `expert_profile`, `video_share`, `promo_material`, `dispatch_task`, `lease_order`, `contract_doc`, `refund_request`, `bill_item`, `fund_entry`, `withdrawal_request`, `planting_record`, `follow_relation`, `content_like` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result；必填=name | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 任一子页带 data-ds → 本接口 → ② 点第 N 页真的换一批记录 |

### 田园域（3 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listFarms` | `GET /farms` | 分页查田园档案，可按地区 / 土壤 / 承包类型筛选 | `farm_plot`, `plot_image`, `plot_season_metric` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 首页「按地区找田」→ 本接口 → ② getFarm 看档案 → ③ 价格挂接 getPriceBreakdown |
| 2 | `getFarm` | `GET /farms/{id}` | 按田块编号取完整档案（四季读数、作物、设施、图册、评论） | `farm_plot`, `plot_season_metric`, `plot_crop_record`, `plot_facility`, `plot_image`, `content_comment` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ② 列表点田块 → 本接口；不同 id 必须返回不同档案 |
| 3 | `saveFarm` | `POST /farms` | 商家 / 村集体上传田园档案，生成初审任务 | `farm_plot`, `audit_task` | `body`:object；min=0；max=40；`body`:object；fields(21)=title,region,area,soil,leaseType,leaseStart,leaseEnd,rent,deposit,price,currentCrops,pastCrops,facilities,readings,descZh,nameZh,nameEn,photos,water,use,years | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ③ 田园管理「上传档案」→ 本接口 → ④ listAudits / 审核进度页；返回 status=待初审 |

### 管控域（10 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listAudits` | `GET /admin/audits` | 多级审核工作台列表 | `audit_task`, `admin_operation_log` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台「审核」→ 本接口 → ② stepAudit → ③ 复审 / 终审工作台 |
| 2 | `stepAudit` | `POST /admin/audits/{id}/step` | 推进一级审核（初审 / 复审 / 终审） | `audit_task`, `admin_operation_log` | `id`:code；`body`:object；min=0；max=40；fields(3)=level,result,comment；必填=level,result；会话注入(忽略前端)=level,result | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 审核工作台点「通过并转复审」→ 本接口 → ③ 下一级列表 |
| 3 | `adminLogin` | `POST /admin/login` | 后台独立登录，返回令牌与可见模块 | `admin_account`, `admin_operation_log` | `body`:object；min=0；max=40；fields(3)=account,passphrase,captcha；必填=account,passphrase | `AdminSession` · token / modules[]；范围：token 非空；modules 为后台模块键数组，长度 ≥ 1 | ① 访问 admin/login.html → 本接口 → ② adminModule 取台账 |
| 4 | `adminModule` | `GET /admin/modules` | 后台统一管控数据（按模块映射表取数） | `farm_plot`, `platform_user`, `work_order`, `work_order_chat`, `planting_record`, `content_comment`, `audit_task`, `user_notice`, `dict_item`, `platform_config`, `refund_request`, `withdrawal_request`, `contract_doc`, `regulation_advice`, `price_book` | `m`:string；min=1；max=32；`p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `AdminModule` · rows[] / columns[] / total / pages；范围：rows.length ≤ 12；columns 为字段名数组；total ≥ 0 | ② 后台侧栏任一台账 → 本接口（m = 模块键）→ ③ 行操作写回对应业务表 |
| 5 | `listAdminRefunds` | `GET /admin/refunds` | 后台退款审核台账 | `refund_request`, `audit_task` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「退款审核」→ 本接口 → ② reviewRefund |
| 6 | `reviewRefund` | `POST /admin/refunds/{id}/review` | 后台核对 / 驳回退款 | `refund_request`, `refund_flow`, `admin_operation_log` | `id`:code；`body`:object；min=0；max=40；fields(2)=decision,note；必填=decision；会话注入(忽略前端)=decision | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 退款台账点「核对」→ 本接口 → ③ 退款流程追加节点 |
| 7 | `listAdminWithdrawals` | `GET /admin/withdrawals` | 后台提现复核台账 | `withdrawal_request`, `withdrawal_flow` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「提现复核」→ 本接口 → ② reviewWithdrawal |
| 8 | `reviewWithdrawal` | `POST /admin/withdrawals/{id}/review` | 后台复核提现 | `withdrawal_request`, `withdrawal_flow`, `admin_operation_log` | `id`:code；`body`:object；min=0；max=40；fields(2)=decision,note；必填=decision；会话注入(忽略前端)=decision | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 提现台账点「复核」→ 本接口 → ③ 提现流程追加节点 |
| 9 | `listAdminContracts` | `GET /admin/contracts` | 后台合同版本台账 | `contract_version`, `contract_doc` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「合同台账」→ 本接口 |
| 10 | `listAdminRegulations` | `GET /admin/regulations` | 后台调控记录台账 | `regulation_advice`, `planting_record` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 后台侧栏「调控记录」→ 本接口 |

### 资金域（4 条）

| # | 方法 | HTTP / 路径 | 说明 | 关联表 | 请求参数范围 | 返回范围 | 流程备注 |
|---:|---|---|---|---|---|---|---|
| 1 | `listFunds` | `GET /funds` | 农户资金流水 | `fund_entry`, `fund_account` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ① 农户「我的资金」→ 本接口 → ② withdrawFunds 提取资金 |
| 2 | `listWithdrawals` | `GET /withdrawals` | 提现申请列表 | `withdrawal_request`, `withdrawal_flow` | `p`:object；min=0；max=40；fields(27)=page,pageSize,q,lang,status,kind,type,scope,region,leaseType,soil,category,board,role,targetType,period,dimension,crop,stage,cat,filter,name,ids,farmId,workorderId,level,result | `Paginated<T>` · items[] / total / page / pageSize / pages；范围：total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize | ② 提现后 → 本接口 → ③ getWithdrawal 看 4 步时间线 |
| 3 | `getWithdrawal` | `GET /withdrawals/{id}` | 提现详情与流程 | `withdrawal_request`, `withdrawal_flow` | `id`:code | `T` · 单条记录对象，字段见关联表列；范围：编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601 | ③ 列表点提现单 → 本接口 |
| 4 | `withdrawFunds` | `POST /withdrawals` | 农户提取资金（金额必须 >0 且 ≤ 可用余额） | `withdrawal_request`, `withdrawal_flow`, `fund_account`, `fund_entry` | `body`:object；min=0；max=40；fields(3)=amountCents,bank,userId；必填=amountCents,bank；会话注入(忽略前端)=userId | `WriteResult` · id / status / next / changedAt；范围：status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601 | ② 资金页「提取资金」→ 本接口 → ③ 提现状态页；超额由 API 拒绝 |

## 4. 后台开发者怎么读这份目录

1. 先看 `DATABASE_DESIGN.md` 第 1 节的「一维关联」口径：每张表最多 1 个外键，跨实体引用都是 `*_no` 字符串软引用，**不要在后端写多表 JOIN**。
2. 按第 3 节每条的「关联表」建单表 CRUD；列表接口按 `page/pageSize/q` 分页，详情按 `id` 取单条，写操作返回 `{ id, status, next, changedAt }`。
3. 「流程备注」列用 `① → ② → ③` 写明调用顺序；第 5 节给出 5 条端到端流程的完整串接。
4. 「请求参数范围」是硬约束：数值越界、枚举不符、编号格式错、必填缺失都会被 `validate()` 拦下并返回 `4001`。
5. 前端把 `config.useMock` 置 `false` 后，所有 74 条走同一个 `fetch` 实现；建议后端按 `db/api_catalog.json` 自动生成路由与参数校验，避免两处口径漂移。

## 5. 五条端到端流程（流程性说明）

**流程 A · 租户租田 → 支付 → 合同 → 工单 → 验收 → 结算**

`listFarms` → `getFarm(F001)` → `getPriceBreakdown(farms,F001)` → `calcPrice` → `listOrders`（下单写 `lease_order`）→ `adminModule`/支付写 `payment_record` → `listContracts` → `getContract` → 个人田园「远程创建工单」写 `work_order(plot_no=F001)` → `listDispatches(scope=nearby)` → `acceptJob` → `getWorkorder`（6 步时间线）→ `job_acceptance` 验收 → `listBills` → `listReconciliations`。涉及表：`farm_plot / plot_rent_rate / lease_order / payment_record / contract_doc / work_order / work_order_flow / job_acceptance / bill_item / reconciliation`。

**流程 B · 商家发布田园 / 活动 → 多级审核 → 价格公示**

`saveFarm`（写 `farm_plot` + `audit_task`）→ `listAudits` → `stepAudit(level=1)` → 复审工作台 → `stepAudit(level=2)` → 终审 → `publishActivity`（写 `activity_event` + `activity_version`）→ `updateActivity` → `publishPrices`（写 `price_book` + `price_publish_task`）→ `listPriceAudits` → `listPriceItems`。审核对象一律用 `audit_task.target_no` 软引用，不给田园 / 活动 / 价格表加审核状态列。

**流程 C · 租户取消工单 → 退款 → 后台核对**

`getWorkorder(W001)` → `cancelWorkorder(W001, reason)`（仅待接单 / 已接单可取消）→ `listJobChanges` → `applyRefund`（写 `refund_request` + `refund_flow` 第 1 步）→ `listRefunds` → `getRefund` → `listAdminRefunds` → `reviewRefund(decision)` → 退款流程追加节点。已作业部分按公示价折算，不整单退。

**流程 D · 农户接单 → 回执 → 资金 → 提现**

`listDispatches(scope=nearby | linked)` → `acceptJob` → `sendChat`（工单沟通）→ `getWorkorder` → 验收回执 `job_acceptance` → `listFunds`（写 `fund_entry`）→ `withdrawFunds`（校验 `0 < amountCents ≤ 可用余额`）→ `listWithdrawals` → `getWithdrawal` → `listAdminWithdrawals` → `reviewWithdrawal`。

**流程 E · 专家统计 → 对比 → 调控 → 记录查询 → 后台台账**

`listExperts` → `getExpert` → `expertStats(dim=crop|farm|stage)` → `expertCompare(ids=F001,F002)`（相同项合并、不同项高亮）→ `saveRegulation`（写 `regulation_advice`，状态「待执行」）→ `listPlantRecords` → `getPlantRecord(PR001)` → `listRegulations` → `listAdminRegulations`。

## 6. 复跑

```bash
python3 patch_catalog.py        # 页面选项/参数补齐并回灌 request.js 内嵌 CATALOG（幂等）
python3 gen_docs.py            # 由唯一目录重写 API_CATALOG.md 等对接文档
python3 gen_column_map.py     # 497 个表列 → API 反向索引
python3 ddl_check.py           # DDL 语法/外键/重复列 + 实际建库执行
for b in $(seq 1 10); do python3 reverse_dom_probe.py $b; done
python3 reverse_audit.py       # 反向闭环：选项 → API → 表列 → 相关 API
python3 db_api_crosscheck.py  # 表 × API 交叉验证
python3 verify.py              # 全量静态回归（含第 34/35/36/37 组断言）
```

