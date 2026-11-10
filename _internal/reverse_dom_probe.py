#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""反向审计 · 渲染后 DOM 选项/参数探针
用法：python3 reverse_dom_probe.py <批次号>，10 批覆盖全站 166 页（单视口桌面）。
逐页取浏览器实际渲染出的 select/option、input/textarea、链接查询参数、data-* 控制，
落 reverse_dom_batchN.json；最后一批合并为 reverse_dom.json。
"""
import os, re, sys, json, threading, http.server, socketserver, glob
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == '_internal':
    ROOT = os.path.dirname(ROOT)
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 1
BATCH_SIZE = 18
CHROME = "/usr/local/bin/chromium"
LAUNCH = ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions"]

def discover():
    qmap = {
      "farm-detail.html": "?id=F001", "activity-detail.html": "?id=A001",
      "produce-detail.html": "?id=P001", "forum-topic.html": "?id=T001",
      "expert-detail.html": "?id=E001", "workorder-detail.html": "?id=W001",
      "search.html": "?q=%E5%84%BF%E8%8F%9C", "admin/index.html": "?m=farms",
      "admin/audit.html": "?id=AU001"
    }
    out = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in ("assets", "__pycache__", ".git", "_internal")]
        for fn in sorted(fns):
            if not fn.endswith(".html"): continue
            rel = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, "/")
            out.append(rel + qmap.get(rel, ""))
    return sorted(out)

PAGES = discover()
TOTAL = (len(PAGES) + BATCH_SIZE - 1) // BATCH_SIZE

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

class Threaded(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def serve():
    os.chdir(ROOT)
    srv = Threaded(("127.0.0.1", 0), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

COLLECT = r"""() => {
  const out = {selects: [], inputs: [], params: [], controls: [], apiCount: 0};
  const dec = function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } };
  document.querySelectorAll('select').forEach(function (s) {
    const name = s.getAttribute('name') || s.getAttribute('data-act') || '(no-name)';
    out.selects.push({name: name, values: Array.from(s.options).map(function (o) {
      return (o.value || o.textContent || '').trim();
    }).filter(Boolean)});
  });
  document.querySelectorAll('input[name], textarea[name], select[name]').forEach(function (i) {
    out.inputs.push({name: i.name, type: i.type || i.tagName.toLowerCase(), value: (i.value||'').slice(0,40)});
  });
  const push = function (u) {
    if (!u || u.indexOf('?') < 0) return;
    const q = u.slice(u.indexOf('?') + 1).split('#')[0];
    q.split('&').forEach(function (kv) {
      const p = kv.split('='); if (!p[0]) return;
      out.params.push({k: dec(p[0]), v: dec((p[1]||'').slice(0,40))});
    });
  };
  document.querySelectorAll('a[href]').forEach(function (a) { push(a.getAttribute('href')); });
  document.querySelectorAll('form[action]').forEach(function (f) { push(f.getAttribute('action')); });
  push(location.search);
  const keys = ['data-act','data-lab','data-biz','data-nav','data-role','data-form','data-page','data-compare','data-price'];
  document.querySelectorAll('*').forEach(function (e) {
    keys.forEach(function (k) {
      const v = e.getAttribute(k); if (v) out.controls.push({k: k, v: v});
    });
  });
  try { out.apiCount = (window.SF_REQUEST && window.SF_REQUEST.catalog().length) || 0; } catch (e) {}
  return out;
}"""

def main():
    srv = serve()
    BASE = "http://127.0.0.1:%d" % srv.server_address[1]
    pages = PAGES[(BATCH - 1) * BATCH_SIZE: BATCH * BATCH_SIZE]
    result = {"batch": BATCH, "pages": []}
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME, headless=True, args=LAUNCH)
        for path in pages:
            ctx = b.new_context(viewport={"width": 1440, "height": 900})
            pg = ctx.new_page()
            try:
                pg.goto(BASE + "/" + path, wait_until="domcontentloaded", timeout=20000)
                pg.wait_for_timeout(900)
                d = pg.evaluate(COLLECT)
            except Exception as e:
                d = {"error": str(e)[:120], "selects": [], "inputs": [], "params": [], "controls": []}
            result["pages"].append({"page": path, "data": d})
            if d.get("error"): print("  !! %s 采集异常: %s" % (path[:36], d["error"]), flush=True)
            print("  %-42s sel=%-3d opt=%-4d inp=%-3d param=%-3d api=%d" % (
                path[:40], len(d.get("selects", [])),
                sum(len(x["values"]) for x in d.get("selects", [])),
                len(d.get("inputs", [])), len(d.get("params", [])), d.get("apiCount", 0)), flush=True)
            ctx.close()
        b.close()
    srv.shutdown()
    with open(os.path.join(ROOT, "reverse_dom_batch%d.json" % BATCH), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)
    # 全部批次齐备时合并
    fs = sorted(glob.glob(os.path.join(ROOT, "reverse_dom_batch*.json")),
                key=lambda x: int(re.search(r"(\d+)\.json", x).group(1)))
    if len(fs) == TOTAL:
        merged = [p for f in fs for p in json.load(open(f, encoding="utf-8"))["pages"]]
        with open(os.path.join(ROOT, "_internal/reverse_dom.json"), "w", encoding="utf-8") as f:
            json.dump({"pages": merged, "total": len(merged)}, f, ensure_ascii=False)
        print("== 合并完成：%d 页 → reverse_dom.json ==" % len(merged), flush=True)

if __name__ == "__main__":
    main()
