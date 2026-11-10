# 闪马田园 SUMFARM · API 数据仿真与前端反馈验证

> 页面：`api-lab.html`（逐条仿真 + 反馈显示）、`api-catalog.html`（目录说明）。两页属开发者对接工具，`noindex,nofollow`，不进主导航，站点地图与流程组提供可达入口。

## 1. 仿真怎么跑

1. 打开 `api-lab.html`，页面从 `SF_REQUEST.catalog()` 取 **74 条**接口，按域分组、每页 8 条翻页。
2. 点「运行全部接口」：按目录顺序逐条 `SF_REQUEST.simulate(name, sampleArgs(name))` 串行执行，每条先把参数交给 `validate()` 做范围校验，再走 `SF_API` 的模拟 / 真实单点分派。
3. 每条反馈实时追加到列表：状态徽章（通过 / 拦截 / 失败）、`code`、耗时 `ms`、来源 `mock|http`、关联表、返回摘要（条数 / 字段 / JSON 预览）、参数校验通过字段数。
4. 单条可点开看完整返回预览；「只看失败」与「按域筛选」可切换；空结果有插画与引导。
5. 「范围校验演示」故意传 3 组越界值，验证拦截反馈真实显示：
   - `listFarms({page:0})` → `4001 参数范围校验未通过：page 不得小于 1`
   - `expertStats({dim:'unknown'})` → `4001` 枚举不符
   - `withdrawFunds({amountCents:-5,bank:'x'})` → `4001` 金额越界

## 2. 反馈显示内容（前端可见，不是控制台）

| 字段 | 来源 | 显示 |
|---|---|---|
| `name / method / path` | CATALOG | 接口行标题 |
| `domain / tables` | CATALOG | 域徽章与关联表标签（点击可跳目录页对应行） |
| `ok / code / message` | simulate | 状态徽章 + 错误原因 |
`ms / source` | simulate | 耗时与 mock/http 来源 |
| `summary` | 返回数据实时统计 | 条数、字段名、JSON 预览 |
| `checked` | validate | 本次通过范围校验的字段数 |

## 3. 前端验证项（使用者视角）

| 用户动作 | 得到 |
|---|---|
| 打开目录页 | 74 条接口按域成表，参数范围 / 返回范围 / 关联表 / 流程备注逐条可见 |
| 点第 N 页 | 真的换一批接口，页码数按 74 条动态算 |
| 点「运行全部接口」 | 74 条逐条追加反馈，汇总卡显示通过 / 拦截 / 失败 / 覆盖表数 / 总耗时 |
| 点「范围校验演示」 | 3 条越界请求被拦下并显示 `4001` 与具体原因 |
| 点单条结果 | 展开完整返回预览 |
| 切换英文 | 全部说明与反馈文案切成真英文内容 |
| 点关联表标签 | 跳到目录页并高亮该表 |

## 4. 复跑命令

```bash
python3 db_api_crosscheck.py            # 表 × API 交叉验证
python3 verify.py                          # 静态回归（含第 34/35/36 组）
for b in $(seq 1 10); do python3 runtime_check.py $b; done   # 双视口逐页 + 交互（含仿真页）
```

