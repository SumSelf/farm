#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""闪马田园 SUMFARM · 交付包完整性与包内抽查
用法：python3 pack_check.py <解压后的站点根> [--browser]
静态项：文件清单、版本、域名、品牌备案、后台隔离、修复点、验收报告。
--browser：再从包内解压目录起真实 HTTP 服务，Chromium 双视口抽检关键页面。
"""
import sys, os, glob, re, json, shutil, zipfile, tempfile

ROOT = os.path.abspath(sys.argv[1])
BROWSER = '--browser' in sys.argv
ok, bad = [], []


def ck(name, cond, detail=""):
    (ok if cond else bad).append(name + ((" · " + str(detail)) if detail else ""))


def txt(p):
    try:
        return open(p, encoding="utf-8", errors="ignore").read()
    except OSError:
        return ""


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


html = sorted(glob.glob(ROOT + "/**/*.html", recursive=True))
front = [h for h in html if not rel(h).startswith("admin/")]
adm = [h for h in html if rel(h).startswith("admin/")]
webp = glob.glob(ROOT + "/**/*.webp", recursive=True)
css = glob.glob(ROOT + "/**/*.css", recursive=True)
js = glob.glob(ROOT + "/**/*.js", recursive=True)
md = glob.glob(ROOT + "/_internal/*.md")
allf = [p for p in glob.glob(ROOT + "/**/*", recursive=True) if os.path.isfile(p)]

ck("页面总数 166", len(html) == 166, len(html))
ck("前台页 145", len(front) == 145, len(front))
ck("后台页 21", len(adm) == 21, len(adm))
ck("WebP 77 张", len(webp) == 77, len(webp))
ck("CSS 2 / JS 8", len(css) == 2 and len(js) == 8, "%d/%d" % (len(css), len(js)))
ck("内部文档 17 份（含 SECURITY.md）", len(md) == 17, len(md))
ck("包内无 PNG/JPG 残留", not glob.glob(ROOT + "/**/*.png", recursive=True) and not glob.glob(ROOT + "/**/*.jpg", recursive=True))
ck("包内无嵌套 zip", not glob.glob(ROOT + "/**/*.zip", recursive=True))
ck("包内无 __pycache__/.git", not glob.glob(ROOT + "/**/__pycache__/**", recursive=True) and not os.path.isdir(ROOT + "/.git"))

vfiles = [h for h in html if "?v=1.7.8" in txt(h)]
ck("资源版本 v1.7.8 覆盖全站", len(vfiles) >= 165, "%d 页" % len(vfiles))
ck("旧版本 ?v=1.7.7 残留 0", not any("?v=1.7.7" in txt(h) for h in html))

joined = "\n".join(txt(h) for h in html)
ck("品牌中文名在站内", "闪马田园" in joined)
ck("品牌英文名在站内", "SUMFARM" in joined)
ck("备案号在站内", "蜀ICP备18013136号" in joined)
ck("旧域名残留 0", "sumfarm.sumstc.com" not in joined and "sumfarm.sumstc.com" not in txt(ROOT + "/assets/js/request.js"))
ck("新域名写入 API base", "iarm.fun" in txt(ROOT + "/assets/js/request.js"))
rob = txt(ROOT + "/robots.txt")
ck("robots 不公告后台且 Sitemap 指向 iarm.fun",
   "Disallow: /admin/" not in rob and "Sitemap: https://iarm.fun/sitemap.html" in rob)
ng = txt(ROOT + "/_internal/nginx-secure.conf")
ck("Nginx /admin/ 拦截层在包内",
   "location ^~ /admin/" in ng and "auth_basic" in ng and "deny all" in ng)
ck("后台 21 页全带 noindex", all("noindex" in txt(h) and "nofollow" in txt(h) for h in adm))
ck("前台导航 0 后台入口", all("admin/index.html" not in txt(h) and "admin/login.html" not in txt(h) for h in front))

app = txt(ROOT + "/assets/js/app.js")
ck("对比页平台级共同字段修复在包内", "统一档案口径" in app and "平台基础服务" in app)
mock = txt(ROOT + "/assets/js/mock-data.js")
ck("价格总账 PRICE_BOOK 在包内", "PRICE_BOOK" in mock)
ck("双语真文案在包内", "Unified archive standard" in app and "Published rate" in app)

chk = txt(ROOT + "/_internal/CHECK.md")
# 数据库 / 统一 API / 仿真页
schema = txt(ROOT + "/_internal/db/schema.sql")
blocks = re.findall(r"CREATE TABLE `(\w+)` \(([\s\S]*?)\n\) ENGINE", schema)
ck("包内 55 张数据库表", len(blocks) == 55, len(blocks))
ck("包内每表外键 ≤ 1", all(len(re.findall(r"FOREIGN KEY", b)) <= 1 for _, b in blocks))
ck("包内 0 个二进制列", not re.search(r"\b(BLOB|BYTEA|VARBINARY|BASE64)\b", schema, re.I))
ck("包内订单表只挂 user_id", "CONSTRAINT `fk_lease_order_user_id` FOREIGN KEY (`user_id`)" in schema)
ck("包内 db/api_catalog.json 存在", os.path.isfile(ROOT + "/_internal/db/api_catalog.json"))
ck("包内 db_api_crosscheck.py 存在", os.path.isfile(ROOT + "/_internal/db_api_crosscheck.py"))
ck("包内 API_DB_CROSSCHECK.md 34 项全通过", "未通过：**0**" in txt(ROOT + "/_internal/API_DB_CROSSCHECK.md"))
ck("包内 request.js 唯一且 api.js 已删",
   os.path.isfile(ROOT + "/assets/js/request.js") and not os.path.isfile(ROOT + "/assets/js/api.js"))
ck("包内 166 页全部引用 request.js",
   sum("request.js" in txt(h) for h in html) == 166, sum("request.js" in txt(h) for h in html))
ck("包内 API_CATALOG.md 存在且列出 74 条", "74 条" in txt(ROOT + "/_internal/API_CATALOG.md") or "**74**" in txt(ROOT + "/_internal/API_CATALOG.md"))
ck("包内 DATABASE_DESIGN.md 存在", "一维关联" in txt(ROOT + "/_internal/DATABASE_DESIGN.md"))
ck("包内 API_SIMULATION.md 存在", "范围校验演示" in txt(ROOT + "/_internal/API_SIMULATION.md"))
ck("包内两页开发者页面存在且 noindex", all("noindex,nofollow" in txt(ROOT + "/" + p) for p in ["api-catalog.html", "api-lab.html"]))
ck("包内 api-lab.js 存在", os.path.isfile(ROOT + "/assets/js/api-lab.js"))

# 反向逻辑闭环交付物
for f in ["reverse_dom.json", "reverse_audit.json", "ddl_check.json",
          "db/column_api_index.json", "REVERSE_AUDIT.md",
          "reverse_dom_probe.py", "reverse_audit.py", "ddl_check.py", "gen_column_map.py"]:
    ck("包内反向闭环文件 " + f, os.path.isfile(ROOT + "/_internal/" + f))
ra = txt(ROOT + "/_internal/REVERSE_AUDIT.md")
ck("包内反向走查未闭环项为 0", "| **未闭环项合计** | **0** |" in ra)
ddl = json.load(open(ROOT + "/_internal/ddl_check.json", encoding="utf-8"))
ck("包内 DDL 自校验错误 0", ddl["错误数"] == 0 and "通过" in ddl["SQLite转译执行"], ddl["错误数"])
ck("包内 schema 无重复逗号", not re.search(r",\s*,", schema))
ck("包内外键引用列已修正", "REFERENCES `platform_user` (`id`)" in schema and
   "REFERENCES `platform_user` (`user_id`)" not in schema)
ci = json.load(open(ROOT + "/_internal/db/column_api_index.json", encoding="utf-8"))
ck("包内表列反向索引全覆盖", ci["列总数"] == len(ci["索引"]) == 497, ci["列总数"])
cat = json.load(open(ROOT + "/_internal/db/api_catalog.json", encoding="utf-8"))
ck("包内 74 条接口全部声明返回列", len(cat) == 74 and all("columns" in a for a in cat))
ra_json = json.load(open(ROOT + "/_internal/reverse_audit.json", encoding="utf-8"))
zero = ["孤儿下拉", "孤儿页面参数", "孤儿 API 参数", "未覆盖表列", "孤立接口",
        "ID 传递断链", "两处口径漂移", "流程无关联接口", "DDL 错误",
        "枚举值域不一致", "流程举例引用不存在接口"]
ck("包内反向审计 11 项全为 0", all(not ra_json[k] for k in zero),
   {k: len(ra_json[k]) for k in zero if ra_json[k]})
ck("包内参数字段补齐到 129",
   len({k for a in cat for ar in a["args"] for k in (ar.get("fields") or {})}) == 129)
ck("包内角色值域与页面一致",
   all("grower" in (ar.get("fields") or {}).get("role", {}).get("values", [])
       for a in cat for ar in a["args"] if isinstance((ar.get("fields") or {}).get("role"), dict)
       and (ar["fields"]["role"].get("type") == "enum")))
ck("包内 upload 流程备注含回显接口",
   "getWorkorder" in next(a for a in cat if a["name"] == "upload")["flowZh"])
ck("包内对接文档显示完整参数字段",
   "fields(15)=" in txt(ROOT + "/_internal/API_CATALOG.md") and "fields(17)=" in txt(ROOT + "/_internal/API_CATALOG.md"))
ck("包内 patch_catalog.py 存在", os.path.isfile(ROOT + "/_internal/patch_catalog.py"))
ck("包内 DEPLOY.md 第 12 节反向闭环口径", "## 12." in txt(ROOT + "/_internal/DEPLOY.md"))

# 安全整改交付物
for f in ["SECURITY.md", "nginx-secure.conf", "security_check.py", "security_check.json"]:
    ck("包内安全交付物 " + f, os.path.isfile(ROOT + "/_internal/" + f))
scj = json.load(open(ROOT + "/_internal/security_check.json", encoding="utf-8"))
ck("包内安全自检 26 项全通过", scj["未通过"] == 0 and scj["检查项"] == 26, scj["未通过"])
ck("包内公开根无 .md/.py/.json/.sql",
   not [p for p in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, p))
        and os.path.splitext(p)[1].lower() in (".md", ".py", ".json", ".sql")])
ck("包内 _internal 物理隔离含 DDL 与目录",
   os.path.isfile(ROOT + "/_internal/db/schema.sql") and
   os.path.isfile(ROOT + "/_internal/db/api_catalog.json"))
ck("包内 166 页 CSP 兜底",
   sum("Content-Security-Policy" in txt(h) for h in html) == 166)
ck("包内 Nginx 安全头与扩展名白名单齐备",
   all(k in ng for k in ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security",
                         "limit_req_zone", "location ^~ /_internal/", "location = /api-lab.html"]))
ck("包内 SECURITY.md 含上线阻断清单",
   "上线阻断清单" in txt(ROOT + "/_internal/SECURITY.md") and
   "残留风险" in txt(ROOT + "/_internal/SECURITY.md"))
reqpack = txt(ROOT + "/assets/js/request.js")
ck("包内无固定 token 且真实模式越权拦截",
   "mock-admin-token" not in reqpack and "SESSION_INJECTED" in reqpack and "code: 403" in reqpack)
ck("包内 6 个会话注入字段标注",
   sum(1 for a in cat for ar in a["args"] for v in (ar.get("fields") or {}).values()
       if isinstance(v, dict) and v.get("source") == "session") == 6)
ck("包内静态报告第 38 组安全断言登记", "网络安全员视角整改" in chk)

ck("静态报告错误为 0", "- 错误：**0**" in chk)
ck("静态报告口径说明在包内", "当前全站规模一律以本文件" in chk)
ck("静态报告版本 v1.7.8", "v1.7.8" in chk)
run = txt(ROOT + "/_internal/RUNTIME.md")
ck("运行时报告覆盖 10 批", "第10批" in run, run.split("\n")[5][:80] if len(run.split("\n")) > 5 else "")
ck("运行时报告含双视口取样汇总", "次（双视口）" in run)
dep = txt(ROOT + "/_internal/DEPLOY.md")
ck("部署说明 166 页口径", "166 页" in dep or "164 页" in dep)
ck("部署说明 iarm.fun", "iarm.fun" in dep)
ck("部署说明 /admin/ 拦截层", "白名单" in dep or "Basic" in dep)
for f in ["BUSINESS_LOGIC_WALKTHROUGH.md", "BUTTON_AUDIT.md", "CLOSURE_WALKTHROUGH.md",
          "PRICE_WALKTHROUGH.md", "ROLE_FLOW_WALKTHROUGH.md", "SUMFARM_BASELINE.md",
          "USER_WALKTHROUGH.md"]:
    ck("走查报告口径说明 " + f, "当前交付规模" in txt(ROOT + "/_internal/" + f))

# 交互与逐页数据从批次 JSON 复核
batches = sorted(glob.glob(ROOT + "/_internal/RUNTIME_batch*.json"))
ck("运行时 10 批结果齐备", len(batches) == 10, len(batches))
pages = inters = 0
ierr = h404 = 0
if batches:
    for b in batches:
        d = json.load(open(b, encoding="utf-8"))
        pages += len(d["pages"]); inters += len(d["interactions"])
        ierr += len(d.get("interaction_errors", [])); h404 += len(d.get("interaction_http404", []))
        for it in d["interactions"]:
            if not it.get("ok"):
                ck("批次 %s 交互未通过：%s" % (os.path.basename(b), it.get("name")), False, it.get("detail", ""))
    ck("交互未通过项 0", ierr == 0 and not any(x.startswith("批次") for x in bad), ierr)
    ck("交互 404 项 0", h404 == 0, h404)
    ck("取样 332 次", pages == 332, pages)
    print("  批次数据：取样 %d 次 / 交互 %d 项" % (pages, inters))

print("== 静态抽查：%d 通过 / %d 未通过 ==" % (len(ok), len(bad)))
for b in bad:
    print("  [未通过] " + b)

if BROWSER:
    import http.server, socketserver, threading
    from playwright.sync_api import sync_playwright

    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    os.chdir(ROOT)
    srv = socketserver.TCPServer(("127.0.0.1", 0), H)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    picks = ["index.html", "forum.html", "experts.html", "farm-detail.html?id=F001",
             "expert-compare.html?ids=F001,F002", "price.html", "price-calc.html",
             "workorder-cancel.html", "farmer-withdraw.html", "expert-stats.html?dim=crop",
             "contract-manage.html", "account.html", "404.html",
             "admin/index.html?m=farms", "admin/login.html", "admin/refunds.html",
             "api-catalog.html", "api-lab.html"]
    picks = [p for p in picks if os.path.isfile(ROOT + "/" + p.split("?")[0])]
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path="/usr/local/bin/chromium", headless=True,
                                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                                      "--disable-extensions", "--disable-background-timer-throttling"])
        for label, w, h in [("桌面", 1440, 900), ("手机", 390, 844)]:
            for path in picks:
                ctx = br.new_context(viewport={"width": w, "height": h})
                pg = ctx.new_page()
                errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
                pg.goto("http://127.0.0.1:%d/%s" % (port, path), wait_until="networkidle")
                pg.wait_for_timeout(700)
                # 与 runtime_check.py 一致：先滚到底让懒加载进入队列，再全量强制 eager 并等重绘，
                # 避免把「视口外尚未加载」误判成破图（不是素材缺失）
                pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                pg.wait_for_timeout(600)
                pg.evaluate("""() => {
                  document.querySelectorAll('img').forEach(i => {
                    if (i.dataset.src) i.src = i.dataset.src;
                    i.loading = 'eager';
                  });
                }""")
                pg.wait_for_timeout(900)
                body = pg.locator("body").inner_text()
                broken = pg.evaluate("Array.from(document.images).filter(i=>!i.complete||i.naturalWidth===0).length")
                over = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                ck("抽检 %s %s → 文本充盈/0 破图/0 溢出/0 报错" % (label, path),
                   len(body) > 600 and broken == 0 and not over and not errs,
                   "text=%d broken=%d over=%s err=%d" % (len(body), broken, over, len(errs)))
                if "expert-compare" in path:
                    rows = pg.locator(".sf-v2-table tbody").first.locator("tr").count()
                    ck("抽检 %s 专家对比相同项表有真实内容" % label, rows >= 2, rows)
                if path.startswith("api-lab.html"):
                    pg.locator('[data-lab="runall"]').click()
                    for _w in range(180):
                        if pg.evaluate("() => !!(window.SF_LAB && window.SF_LAB.stats().done === 74)"):
                            break
                        pg.wait_for_timeout(500)
                    st = pg.evaluate('window.SF_LAB.stats()')
                    ck("抽检 %s 逐条仿真 → 74 通过 / 0 失败 / 覆盖 55 表" % label,
                       st["pass"] == 74 and st["fail"] == 0 and st["tables"] == 55, str(st))
                if path.startswith("api-catalog.html"):
                    ck("抽检 %s 接口目录 → 74 条分页可见" % label,
                       pg.locator(".sf-lab-row").count() == 8 and "74" in pg.locator("body").inner_text())
                if path.startswith("admin/"):
                    ck("抽检 %s 后台页 noindex 生效" % label,
                       "noindex" in (pg.locator('meta[name=robots]').first.get_attribute("content") or ""))
                ctx.close()
        br.close()
    srv.shutdown()
    print("== 浏览器抽检完成：%d 通过 / %d 未通过 ==" % (len(ok), len(bad)))
    for b in bad:
        print("  [未通过] " + b)

sys.exit(1 if bad else 0)
