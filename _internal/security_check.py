#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""闪马田园 · 安全回归自检（安全员视角）
用法：cd <站点根>/_internal && python3 security_check.py
输出：security_check.json（26 项断言，任一失败应阻断发布）
复核对象：解压后的站点根目录，而不是开发态工作区。
"""
import os, re, json, glob, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == "_internal" else HERE
IN = os.path.join(ROOT, "_internal")

def txt(p):
    return open(p, encoding="utf-8", errors="ignore").read()

checks = []
def ck(name, cond, detail=""):
    checks.append({"name": name, "ok": bool(cond), "detail": str(detail)[:200]})

HTML = sorted(glob.glob(os.path.join(ROOT, "*.html")) +
              glob.glob(os.path.join(ROOT, "admin", "*.html")))
PUB_FILES = [p for p in glob.glob(os.path.join(ROOT, "*")) if os.path.isfile(p)]
ALLOWED_EXT = {".html", ".css", ".js", ".webp", ".txt", ".ico", ".svg", ".png", ".jpg"}

# 1 公开根只剩白名单扩展名（P0 信息泄露）
bad_ext = [os.path.basename(p) for p in PUB_FILES
           if os.path.splitext(p)[1].lower() not in ALLOWED_EXT]
ck("公开站点根无 .md/.py/.json/.sql 等非公开文件", not bad_ext, bad_ext[:6])

# 2 物理隔离目录存在且含核心内部资料
need_in = ["db/schema.sql", "db/api_catalog.json", "db/column_api_index.json",
           "reverse_dom.json", "SECURITY.md", "nginx-secure.conf",
           "security_check.py", "verify.py", "CHECK.md", "REVERSE_AUDIT.md"]
ck("_internal/ 物理隔离齐备", all(os.path.isfile(os.path.join(IN, f)) for f in need_in),
   [f for f in need_in if not os.path.isfile(os.path.join(IN, f))])

# 3 内部资料不在公开根
ck("内部资料不在公开根", not any(os.path.isfile(os.path.join(ROOT, f))
                                for f in ["schema.sql", "api_catalog.json", "verify.py", "CHECK.md"]))

# 4 Nginx 安全头与拦截规则
conf = txt(os.path.join(IN, "nginx-secure.conf"))
heads = ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options",
         "Strict-Transport-Security", "Referrer-Policy", "Permissions-Policy",
         "Cross-Origin-Opener-Policy", "server_tokens off", "autoindex off",
         "ssl_protocols TLSv1.2 TLSv1.3", "limit_req_zone", "upgrade-insecure-requests"]
ck("Nginx 安全头 / TLS / 限流齐备", all(h in conf for h in heads),
   [h for h in heads if h not in conf])
rules = ["location ^~ /_internal/", "location = /api-catalog.html",
         "location = /api-lab.html", "location ^~ /admin/", "deny all",
         "auth_basic", r"\.(?:sql|py|pyc|json|md", "return 404"]
ck("Nginx 拦截规则齐备（内部目录/开发者页/后台/扩展名）", all(r in conf for r in rules),
   [r for r in rules if r not in conf])

# 5 166 页 CSP meta 兜底
ck("166 页全部注入 CSP meta", len(HTML) == 166 and
   all("Content-Security-Policy" in txt(p) for p in HTML),
   sum("Content-Security-Policy" in txt(p) for p in HTML))
# 脚本策略保持严格；style-src 放宽是站内 JS 用 element.style 做展开/折叠/进度条的既有需求，
# Chromium 把动态 style 属性计入 inline style，已在 SECURITY.md 如实登记为权衡项。
ck("script-src 严格：无 unsafe-inline / unsafe-eval",
   all("script-src 'self';" in txt(p) and "unsafe-eval" not in txt(p)
       and "script-src 'self' 'unsafe-inline'" not in txt(p) for p in HTML))
ck("style-src 放宽已登记权衡（SECURITY.md 说明）",
   "style-src 'self' 'unsafe-inline'" in txt(os.path.join(IN, "SECURITY.md")))

# 6 0 内联脚本 / 危险 API
allh = "\n".join(txt(p) for p in HTML)
inline = (len(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>", allh)) +
          len(re.findall(r"<style(?![^>]*\bhref=)[^>]*>", allh)) +
          len(re.findall(r"\son\w+\s*=", allh)))
ck("0 内联 script/style/on*（严格 CSP 成立前提）", inline == 0, inline)
alljs = "\n".join(txt(p) for p in sorted(glob.glob(os.path.join(ROOT, "assets", "js", "*.js"))))
ck("无 eval / new Function / javascript: / document.write",
   not re.search(r"\beval\s*\(|new Function\s*\(|javascript:|document\.write\s*\(", alljs))
ck("页面不 fetch 任何本地 .json 内部资料", "fetch(" not in allh)

# 7 无硬编码固定 token / 手机号 / 身份证（公开面）
pub_text = allh + alljs
ck("无固定可预测 token", "mock-admin-token" not in alljs and "demo-" in alljs)
ck("公开面无真实手机号 / 身份证",
   not re.search(r"(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)\d{17}[\dXx](?!\d)", pub_text))
ck("站内无已弃用旧域名", "sumfarm.sumstc.com" not in pub_text)

# 8 越权字段：目录标注 + 请求层真实模式拒绝
cat = json.load(open(os.path.join(IN, "db", "api_catalog.json"), encoding="utf-8"))
sess = {}
for a in cat:
    for ar in a["args"]:
        for k, v in (ar.get("fields") or {}).items():
            if isinstance(v, dict) and v.get("source") == "session":
                sess.setdefault(a["name"], []).append(k)
ck("6 个越权字段标注 source=session", sum(len(v) for v in sess.values()) == 6, sess)
req = txt(os.path.join(ROOT, "assets", "js", "request.js"))
ck("请求层真实模式拦截会话注入字段（403）",
   "SESSION_INJECTED" in req and "clientIdentityRejected" in req and
   "code: 403" in req and "if (config.useMock) return null" in req)
ck("生产模式错误信息泛化", "请求参数不合法" in req and "config.useMock ?" in req)
ck("SF_REQUEST.security 暴露给后端开发者", "security: {" in req and "sessionInjected" in req)

# 9 演示凭据有 P0 阻断标注 + 失败锁定
auth = txt(os.path.join(ROOT, "assets", "js", "auth.js"))
ck("演示凭据已标注为 P0 上线阻断项",
   "P0 上线阻断项" in auth and "DEMO_ONLY_CREDENTIAL" in auth and
   "绝不信任 URL" in auth)
ck("登录失败计数与锁定已接入",
   "lockLeft" in auth and "noteFail" in auth and "clearFail" in auth and
   "MAX_FAIL = 5" in auth)

# 10 robots 不再公告后台路径
rob = txt(os.path.join(ROOT, "robots.txt"))
ck("robots.txt 不点名 /admin/（后台靠 Nginx 拦截）",
   "Disallow: /admin/" not in rob and "Sitemap: https://iarm.fun/sitemap.html" in rob)

# 11 开发者页仍 noindex 且被 Nginx 精确拒绝
ck("开发者页 noindex 且 Nginx 精确拒绝",
   all("noindex,nofollow" in txt(os.path.join(ROOT, p))
       for p in ["api-catalog.html", "api-lab.html"]) and
   "location = /api-catalog.html" in conf and "location = /api-lab.html" in conf)

# 12 后台 21 页 noindex
adm = glob.glob(os.path.join(ROOT, "admin", "*.html"))
ck("后台 21 页全带 noindex,nofollow", len(adm) == 21 and
   all("noindex" in txt(p) and "nofollow" in txt(p) for p in adm), len(adm))

# 13 上线阻断清单落盘
sec = txt(os.path.join(IN, "SECURITY.md"))
ck("SECURITY.md 含上线阻断清单与残留风险",
   "上线阻断清单" in sec and "残留风险" in sec and "未加载" in sec and
   "httpOnly" in sec and "魔数" in sec)

# 14 数据库与目录仍自洽（不因安全整改漂移）
ck("接口目录 74 条且全部声明 columns",
   len(cat) == 74 and all("columns" in a for a in cat))
emb = json.JSONDecoder().raw_decode(
    req[req.find("var CATALOG = ") + len("var CATALOG = "):].lstrip())[0]
ck("request.js 内嵌目录与 db 目录完全一致", emb == cat)

res = {"检查项": len(checks), "通过": sum(1 for c in checks if c["ok"]),
       "未通过": sum(1 for c in checks if not c["ok"]),
       "明细": checks,
       "公开根文件数": len(PUB_FILES), "页面数": len(HTML),
       "内部文件数": len([p for p in glob.glob(os.path.join(IN, "**", "*"), recursive=True)
                          if os.path.isfile(p)])}
open(os.path.join(IN, "security_check.json"), "w", encoding="utf-8").write(
    json.dumps(res, ensure_ascii=False, indent=2))
print("== 安全自检：%d 项 / 通过 %d / 未通过 %d ==" %
      (res["检查项"], res["通过"], res["未通过"]))
for c in checks:
    if not c["ok"]: print("  [未通过]", c["name"], "|", c["detail"])
print("公开根文件 %d | 页面 %d | 内部文件 %d" %
      (res["公开根文件数"], res["页面数"], res["内部文件数"]))
raise SystemExit(1 if res["未通过"] else 0)
