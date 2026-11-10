# 闪马田园 SUMFARM · 网络安全整改报告

> 视角：平台安全员。对象：`sumfarm-v1.7.0` 单点部署包（166 页 + `admin/` 21 页 + 共享 `assets/`）。
> 走查方式：对交付目录做全量文件枚举、凭据/敏感串扫描、DOM 注入面统计、越权参数审计、
> 响应头与访问控制配置核对，并对整改结果做可复跑断言（`security_check.py`）。
> 结论先说：**整改前这个站不能上线**——不是因为页面有 XSS，而是「解压即整个目录挂到 Web 根」把后端设计图和源码一起公开了。

---

## 一、资产与信任边界

| 区域 | 内容 | 信任级别 |
|---|---|---|
| 公开前台 | 145 个 HTML、`assets/`（2 CSS / 8 JS / 77 WebP）、`robots.txt` | 匿名可访问 |
| 后台 `admin/` | 21 页 + 独立登录 | 仅平台管理员，需网络层 + 认证层双重拦截 |
| 开发者工具 | `api-catalog.html`、`api-lab.html` | 仅内网，公网必须拒绝 |
| 内部资料 `_internal/` | 55 张表 DDL、74 条 API 目录、497 列反向索引、11 份脚本、16 份报告、166 页 DOM 取样 | 仅运维/后端，公网必须拒绝 |
| 真实后端 API | `https://iarm.fun/api/v1`（当前 `useMock=true`，未接入） | 服务端鉴权，前端零信任 |

**关键前提**：这是纯静态前端包，没有服务端。任何「前端判断」「noindex」「robots Disallow」都不是访问控制，
只有 Web 服务器配置才是。**未加载 `_internal/nginx-secure.conf` 就不算上线完成。**

---

## 二、整改前发现（按严重度）

| 级别 | 发现 | 影响 |
|---|---|---|
| **P0** | 站点根可直接下载 62 个非公开文件：`db/schema.sql`（55 张表结构 + 全字段注释）、`db/api_catalog.json`（74 条接口 + 参数范围 + 表映射）、`db/column_api_index.json`（497 列反向索引）、`reverse_dom.json`（166 页渲染后 DOM 全量取样）、11 份 Python 源码、16 份内部走查报告、10 批运行时数据 | 完整后端设计图、源码、内部验收细节一次性泄露；攻击者无需探测即可规划注入、越权与业务逻辑攻击 |
| **P0** | `api-catalog.html` / `api-lab.html` 公网 URL 直达，页面逐条展示 74 条接口、参数范围、关联表、流程备注 | 完整 API 地图，等同把接口文档发给攻击者 |
| **P0** | `robots.txt` 明文写 `Disallow: /admin/` | robots 本身公开，等于向爬虫公告后台路径；且它只是「请勿抓取」，不是拦截 |
| **P1** | 安全响应头全缺：CSP / X-Frame-Options / X-Content-Type-Options / HSTS / Referrer-Policy / Permissions-Policy / 限流 均为 0 | 点击劫持、MIME 嗅探、降级、Referer 泄露、无爆破限速 |
| **P1** | 前端可指定 `withdrawFunds.userId`（给任意用户提现）、`acceptJob.assigneeId`（指定他人接单）、`stepAudit.level/result`、`reviewRefund.decision`、`reviewWithdrawal.decision` | 后端若照目录实现，直接产生水平越权与垂直越权 |
| **P1** | 登录态靠 URL `?auth=1&uid=&role=` 表达，`authed()` 据此判定；任何人改 URL 即可「变成」管理员展示态 | 演示站可接受，但目录把这套当成状态约定写进规范，后端照抄即越权 |
| **P1** | 硬编码凭据：`DEMO_PASS='sumfarm2026'`（统一演示口令）、`token:'mock-admin-token'`（可预测）、测试夹具里的手机号与邮箱 | 固定口令 / 固定 token 被写进公开 JS |
| **P2** | 上传接口只有 MIME 白名单与 20MB 上限，未规定文件名随机化、魔数校验、隔离存储 | 后缀伪装、路径穿越、存储型风险 |
| **P2** | `validate()` 在错误信息里回显全部字段与枚举值明细 | 辅助攻击者枚举参数与值域 |
| **P2** | 无密码强度校验、无登录失败锁定/限流 | 撞库与爆破 |

**基线做得好的部分（如实登记，不改）**：全站 0 个内联 `<script>` / `<style>` / `on*` 属性，
0 处 `eval` / `new Function` / `javascript:` / `document.write`，`esc()` 调用 586 处、
`innerHTML` 拼接 14 处均走转义；`target=_blank` 全部带 `noopener`；页面不 `fetch` 任何本地 JSON。
因此可以做到 **`script-src 'self'` 严格策略**（防 XSS 的关键项，无 `unsafe-inline` / `unsafe-eval`）。
      一处如实登记的权衡：站内 JS 用 `element.style.xxx` 做展开/折叠、进度条、遮罩透明度，
      Chromium 会把动态 style 属性计入 inline style，故 `style-src` 采用 `'self' 'unsafe-inline'`。
      内联样式不能执行脚本，且不削弱脚本策略；后续若改为 CSS 类切换，可把这一项再收紧。
      实际策略字面串：`style-src 'self' 'unsafe-inline'`；`script-src 'self'` 不含任何 unsafe 关键字。

---

## 三、本轮整改（已落地）

### 3.1 物理隔离 + 网络层拒绝（解决最严重的 P0）

新增 `_internal/`，把 **50 个顶层文档/脚本/数据 + 整个 `db/`** 全部移入。站点根现在只剩：
166 个 HTML、`assets/`、`robots.txt`、`_internal/`。页面运行时不依赖其中任何一个文件，
所以移走不影响任何渲染（已用真实 HTTP + Chromium 复验）。

配套 `_internal/nginx-secure.conf`：

- `location ^~ /_internal/ { deny all; return 404; }`
- 扩展名白名单：`.sql/.py/.json/.md/.log/.zip/.conf/.pem/.key/...` 一律 `return 404`
  （即使将来误把文件拷回根目录也下载不到）
- `location = /api-catalog.html` / `= /api-lab.html` 精确拒绝
- `location ^~ /admin/`：办公网/VPN IP 白名单 + HTTP Basic + `no-store` + `X-Robots-Tag`
- 全站严格 CSP、nosniff、DENY、HSTS、Referrer-Policy、Permissions-Policy、COOP/CORP
- TLS 1.2/1.3、HTTP 301 跳 HTTPS、`server_tokens off`、`autoindex off`
- `limit_req` 三档：认证 5r/m、API 30r/s、上传 2r/m

**robots.txt 改写**：删掉 `Disallow: /admin/`，不再公告后台路径；只保留空 `Disallow:` 与 Sitemap。
后台与内部目录的拦截全部交给 Nginx —— 这才是实际生效的那一层。

### 3.2 前端纵深防御

- **166 页注入 CSP `<meta>` 兜底**：即使运维只用 `python -m http.server` 之类朴素静态服务，
  也有 `default-src 'self'; script-src 'self'; ...; object-src 'none'` 兜底（全站 0 内联，不会误伤）。
- **`request.js`**：
  - `mock-admin-token` 改为运行时随机 `demo-*` 值，去掉可预测 token。
  - 新增 `SESSION_INJECTED`：6 个字段在 `useMock=false`（真实后端）时，前端一旦携带即返回 `403`，
    从请求层堵住水平/垂直越权；演示态保留以不破坏 74 条仿真。
  - 生产模式参数错误一律泛化为「请求参数不合法」，不再回显字段与枚举明细；演示态保留明细供仿真页。
  - 暴露 `SF_REQUEST.security.sessionInjected` 给后端开发者读取。
- **`db/api_catalog.json` / `API_CATALOG.md`**：6 个字段加 `source=session` 标注，
  文档显示「会话注入(忽略前端)=…」，后端照目录生成路由时就能看到。
- **`auth.js`**：
  - 演示口令与演示账号表集中到显式标注的 **P0 上线阻断块**，写明「生产必须删除并接入服务端鉴权」。
  - 新增失败计数与锁定（连续 5 次锁 60 秒）、`SF_AUTH.security.lockLeft()`。
  - 注释明确 `?auth/uid/role` **仅展示态**，服务端/网关不得据此授权。
- **`robots.txt`** 不再点名后台。
- 测试夹具里的手机号、邮箱改为占位值。

### 3.3 可复跑的安全回归

新增 `security_check.py`（26 项断言，输出 `security_check.json`）并纳入 `verify.py` 第 38 组：
公开根文件白名单、`_internal/` 隔离、Nginx 各项头与 deny 规则、166 页 CSP 覆盖、
0 内联脚本、无硬编码 token / 手机号 / 身份证、6 个会话注入字段、robots 不公告后台、
开发者页被精确拦截、后台 21 页 noindex、上线阻断清单落盘。

---

## 四、上线阻断清单（**必须逐条完成才算可上线**，本方未执行）

> 这些是服务端 / 运维侧动作，静态前端包无法代替。按优先级：

1. **加载 `_internal/nginx-secure.conf`**，并确认 `/_internal/`、`/api-catalog.html`、
   `/api-lab.html` 从公网返回 404；`/admin/` 非白名单 IP 返回 403。
2. **删除演示凭据**：移除 `auth.js` 的 `DEMO` / `DEMO_ONLY_CREDENTIAL` 整块；
   `signIn/signUp/reset` 换成服务端鉴权，会话用 `httpOnly + Secure + SameSite=Lax/Strict` Cookie
   或短时签名 token；**权限判定只认服务端会话**。
3. **后端按 `db/api_catalog.json` 生成路由与参数校验**，对 6 个 `source=session` 字段
   **强制忽略前端传值**；金额、余额、面积一律服务端按 `price_book` / `fund_account` 复算。
4. **删除或迁移开发者工具页**：`api-catalog.html` / `api-lab.html` 不进生产站点，
   或仅在内网构建产物中保留。
5. **上传链路加固**：服务端校验魔数（不只信 `Content-Type`）、文件名随机化后落盘、
   存储与 Web 根隔离、路径只存 `*_path`、接入病毒扫描、按用户与 IP 限流。
6. **认证限流与口令策略**：服务端按 IP+账号限流、失败锁定、验证码服务端一次性校验、
   口令强度策略、敏感操作二次验证。
7. **错误与日志**：生产错误响应泛化；服务端记录审计日志但不写口令/证件号/完整 token；
   日志目录不可被 Web 访问。
8. **数据库**：`schema.sql` 含 `DROP TABLE IF EXISTS`，仅用于空库初始化，生产用增量迁移；
   最小权限账号、禁止应用账号拥有 DDL 权限；备份文件不落 Web 根。
9. **TLS / 证书 / 备案接入**：按实际证书配置 `ssl_certificate`，HSTS preload 与
   `iarm.fun` 备案接入信息变更由运维办理。
10. **依赖与供应链**：全站无第三方 CDN / 外链脚本；若后续引入，加 SRI 与 CSP 白名单。

---

## 五、残留风险（如实登记，不包装成已完成）

- 这是**静态演示包**，`useMock=true`，没有真实后端、没有真实会话、没有真实权限校验。
  上面第 1/2/3/5/6 条都是「上线前必须做」，不是「已经做了」。
- `admin/` 与前台在同一站点根，是**单点部署下的逻辑隔离**；物理隔离需要独立域名/独立站点，
  用户已明确要求单点，故本轮用 Nginx 白名单 + Basic + 全站 noindex 兜底。
- `api-catalog.html` / `api-lab.html` 仍在包内（流程组与站点地图有入口，去掉会产生孤儿页），
  靠 Nginx 精确 `return 404` 拦截；若运维不加载配置，这两页仍会暴露 API 地图。
- 沙盒没有 MySQL / 真实 Nginx 实例：`ddl_check.py` 用 SQLite 转译实际建库执行，
  Nginx 配置只做静态断言核对，**未做真实 443 端口的渗透验证**。
- 线上部署、`iarm.fun` 解析与证书未由本方执行；不主动查线上，线上表现不作验收依据。
- 166 页逐页独立设计图、每条模拟记录专属照片仍是遗留项。

---

## 六、复跑

```bash
cd <站点根>/_internal
python3 security_check.py     # 14 项安全断言 → security_check.json
python3 ddl_check.py          # DDL 语法 + 实际建库执行
python3 reverse_audit.py      # 反向逻辑闭环
python3 db_api_crosscheck.py  # 表 × API 交叉验证
python3 verify.py             # 全量静态回归（含第 38 组安全断言）
python3 pack_check.py .. --browser
```

`security_check.py` 任一项失败即应阻断发布。
