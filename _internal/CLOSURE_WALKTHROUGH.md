# 闪马田园 SUMFARM · 全站逻辑关联闭环走查报告

> 当前交付规模：**166 页**（前台 145 + 后台 21），资源版本 `v1.7.8`，域名 `iarm.fun`。本文出现的 118 / 127 / 131 / 143 页等为对应整改轮次当时的历史值，不代表当前页面数。


走查口径：**使用者视角**。真实 HTTP 服务 + Chromium 无头浏览器，逐页加载 131 个页面，
取 `networkidle` 后渲染完成的 DOM（包含 JS 动态生成的顶栏、移动浮层、页脚、后台侧栏与内容区），
把内容区、页脚、侧栏、浮层里的 `<a href>` 全部归一化成页面节点，建成一张有向图；
再逐页核对「有没有可点的业务联系跳转」「能不能回到所属上级」「是不是只能靠地址进入」。
不使用 `file://`，不抽样。

## 一、走查发现

| 检查项 | 结果 |
|---|---|
| 渲染后死链（剥离版本号与查询参数后校验目标存在） | **0** |
| 内容区既无链接又无有效按钮的「死页」 | **0** |
| 每页按钮都有可见反馈（搜索 / 翻页 / tab / 收藏 / 分享 / 表单 / 返回 / 语言切换 / 浮层关闭） | 通过 |
| **内容区 + 页脚 + 侧栏 + 浮层入度为 0 的页面** | **49 个（真缺陷）** |
| 后台独立管理页有侧栏入口 | **0 / 12（真缺陷）** |
| 站点地图列出的页面数 | 仅 6 个一级频道 |

死链和空壳页此前已清零，但**业务流走不通**：论坛四版块、专家五个子页、场地四类、
农产品结算四步、农事工单五类、接单流程、田园附属页、后台 12 个台账页，
全部只能靠顶部导航或手动输入地址进入，从相邻业务页点不过去。
后台 `admin/index.html` 的侧栏 9 项里 8 项是 `?m=` 同页切换，独立管理 HTML 页一个都没挂上去；
`admin/audit.html` 等页面连侧栏都没有，进去后只能靠一个「返回」按钮出来。

### 入度 0 的完整清单（49 个）

```
404.html                  activity-members.html    activity-review.html
audit-final.html          audit-review.html        chats.html
comments.html             dict.html                disclaimer.html
dispatch-accept.html      dispatch-history.html    dispatch-verify.html
expert-apply.html         expert-column.html       expert-history.html
expert-points.html        expert-qa.html           export.html
farm-comments.html        farm-follow.html         farm-gallery.html
farm-success.html         farms-favorites.html     farms-lease.html
farms-soil.html           forum-act.html           forum-exp.html
forum-hot.html            forum-mine.html          forum-posted.html
forum-tech.html           job-harvest.html         job-sowing.html
job-tilling.html          job-water.html           logs.html
maintenance.html          notices.html             planting.html
produce-checkout.html     produce-receipt.html     produce-review.html
produce-stock.html        roles.html               users.html
venue-camping.html        venue-menu.html          venue-sports.html
venue-wedding.html
```

## 二、整改（公共关系只写一份）

- `app.js` 新增 **`FLOW_GROUPS`**：9 个频道按真实办理顺序列出全部前台子页，共 **98 个页面引用**，
  每条 `[文件, 中文名, 英文名]`；引用在校验脚本里逐条核对目标文件存在。
- `app.js` 新增 **`ADM_SIDE`**：后台 22 个管控入口（8 个总览视图 + 11 个独立管理页 + 3 级审核），
  16 个后台页共用同一份侧栏；独立登录页例外，不显示侧栏。
- 统一 **`put()`** 注入：前台每页前置「频道业务流程导航条」（当前步高亮、其余可点直达、
  末尾回频道首页）；后台每页包一层统一侧栏。`pageAdminIndex` 去掉自绘侧栏，避免嵌套两层 `.adm-shell`。
- 新增 **`pageSitemap()`**：站点地图按频道列出全站公开页（10 组 / 102 个直达入口），
  后台按「不得对外」约定**不进公开索引**。
- 流程条默认只显示当前步前后各 2 个（窗口 3~5 个可点入口）+「全部 N 步」一键展开 / 收起，
  避免把页面撑过 3 屏；展开收起有 toast 反馈，事件走已有委托、动态重建天然重绑。
- 手机端后台侧栏由 `display:none` 改为**横向可滚动模块条**，管理页在手机上也能闭环。
- JS / CSS 变更后按版本号机制把全站 `?v=1.7.1` 刷为 **`?v=1.7.5`**（124 文件 / 975 处），
  交付包名与顶层目录名保持 `sumfarm-v1.7.0`，仍是「一个包、一次发布」。

## 三、复测结果

| 检查项 | 整改前 | 整改后 |
|---|---|---|
| 渲染后死链 | 0 | **0** |
| 内容死页 | 0 | **0** |
| 前台未接入任何业务流程的页面 | 49 个中的前台部分 | **0**（第 30 组静态断言） |
| 后台未进统一侧栏的独立管理页 | 12 | **0** |
| 后台任意页侧栏链接数 | 0 / 9 | **23** |
| 站点地图直达入口 | 6 | **102** |
| 流程条当前步高亮 / 可点入口 / 返回上级 | 无 | 逐页通过 |
| 从流程条点「技术咨询」 | 点不到 | 真的进入 `forum-tech.html` |
| 从后台侧栏点「田园台账」 | 点不到 | 真的进入 `admin/farms.html` 且侧栏仍在 |

静态新增第 30 组闭环断言（`flow_refs` 98 / `side_refs` 15 / `front_uncovered` 0 / `adm_uncovered` 0）；
运行时新增闭环交互断言并 8 批双视口全量重跑，明细见 `CHECK.md` / `RUNTIME.md`。

## 四、误报更正登记（当场更正，不留成已知问题）

首轮闭环验收报 3 条未通过，复核均为**断言口径误报、非功能缺陷**：

1. 论坛第 2 步左边界只够 4 个窗口入口，断言写死 5 个 → 改为 `min(5, total)` 且允许 ≥3。
2. 展开后 11 / 收起后 4，同样是边界窗口数 → 按实际窗口数判定。
3. 后台侧栏链接按单点部署约定写成同目录相对路径 `farms.html` / `audit.html`，
   断言却按 `admin/farms.html` 绝对片段匹配 → 改为按 basename 判定，并另验点击真的跳转。

## 五、如实登记的遗留项

- **页面长度**：本轮双视口实测首页桌面 8.1 屏 / 手机 13.8 屏，部分流程子页桌面 3.1~3.8 屏、
  手机 3.3~4.8 屏，仍超过「单页不超过 3 屏、超过做左右翻页」的口径。首页是历史遗留的长首页，
  本轮只补闭环导航、未重排分区；新增流程条已做窗口折叠，站点地图由 3.2 屏降到 2.7 屏。
- 131 页逐页独立设计图、每条模拟记录单独拍摄的照片仍未完成。
- 线上部署与 `iarm.fun` 解析由运维执行，本方不主动查线上、不拿线上表现作验收依据。

---

## 附：本轮价格公示整改后的闭环复测

「平台所有节点业务内容都需要跟租金和价格公示挂钩」落地后，闭环图重新走查：

- `FLOW_GROUPS` 新增「租金与价格公示流程」8 步，`ADM_SIDE` 新增后台价格公示管理，
  `nav.js` PC 下拉 / 手机浮层 / 页脚、`pageSitemap()` 全站索引同步接入；
- 新增 9 个页面全部归属 `price.html` 一级频道（后台页归后台），
  静态第 31 组断言复核 `front_uncovered` / `adm_uncovered` 仍为 **0**；
- 统一 `put()` 在原有流程导航之外再注入 `priceStrip()`，131 页每页都多出
  5 个可点业务入口，不存在「只能靠地址进入」的死页；
- 详细规格、逐按钮五问与遗留项见 `PRICE_WALKTHROUGH.md`。

---

## 附：业务内容闭环复测（本轮）

链接闭环之外，本轮补的是**业务内容闭环**：93 个原来由通用占位模板撑着的节点
升级为按五角色链路渲染的专属业务页；7 个断点修复、4 个新页接入流程组与站点地图后，
`front_uncovered` / `adm_uncovered` 仍为 0，动作目标 0 死链。
逐链真实点击 43 项全通过，明细见 `ROLE_FLOW_WALKTHROUGH.md`。

## 第 33 轮 · 闭环增补

新增 4 个业务流程组与 33 个节点，前台 143 页 100% 归属某个流程，后台 21 页全部进统一侧栏；新增引用逐条校验目标存在，动作死链 0。
