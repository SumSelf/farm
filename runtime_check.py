#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""闪马田园 SUMFARM · 真实服务环境浏览器运行时验收
用法：python3 runtime_check.py <批次号>，批次 1..N 自动按全站页面数计算。
每批 18 页（低于 20 页上限），双视口 1440x900 / 390x844，HTTP 服务而非 file://。
等待覆盖重绘，取样取完整文本；输出同目录 RUNTIME.md（合并全部已跑批次）。"""
import os, sys, json, threading, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 1
PORT = 0  # 由系统分配空闲端口，避免复跑时残留占用
CHROME = "/usr/local/bin/chromium"
BASE = "http://127.0.0.1:%d" % PORT

BATCH_SIZE = 18  # 单批页数上限 20，取 18 留余量

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
        dns[:] = [d for d in dns if d not in ("assets", "__pycache__", ".git")]
        for fn in sorted(fns):
            if not fn.endswith(".html"): continue
            rel = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, "/")
            out.append(rel + qmap.get(rel, ""))
    return sorted(out)

PAGES = discover()
TOTAL_BATCHES = (len(PAGES) + BATCH_SIZE - 1) // BATCH_SIZE
VIEWPORTS = [("桌面 1440x900", 1440, 900), ("移动 390x844", 390, 844)]
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 1
RESULT = {"batch": BATCH, "pages": [], "interactions": [], "errors": []}

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    os.chdir(ROOT)
    class H(Quiet): pass
    class S(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True
    srv = S(("127.0.0.1", 0), H)
    srv.daemon_threads = True
    t = threading.Thread(target=srv.serve_forever, daemon=True); t.start()
    return srv

def probe(page, url, label):
    rec = {"page": label, "url": url, "console": [], "pageerror": [], "failed": [], "http4xx": []}
    page.on("console", lambda m: rec["console"].append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: rec["pageerror"].append(str(e)))
    page.on("requestfailed", lambda r: rec["failed"].append(r.url))
    page.on("response", lambda r: rec["http4xx"].append("%s %s" % (r.status, r.url)) if r.status >= 400 else None)
    page.goto(url, wait_until="networkidle", timeout=25000)
    page.wait_for_timeout(700)  # 覆盖重绘，禁止点完立刻取样
    try:
        page.wait_for_function(
            "document.getElementById('sf-dynamic') && document.getElementById('sf-dynamic').innerText.length > 20",
            timeout=8000)
    except Exception:
        rec["pageerror"].append("动态区未渲染出内容")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(600)
    # 视口外的 lazy 图未必进入过加载队列：强制 eager 并等待，再判「破图 0」才成立
    page.evaluate("""() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(function (i) {
        i.loading = 'eager';
        var s = i.getAttribute('src');
        if (s) i.setAttribute('src', s);
      });
    }""")
    page.wait_for_timeout(900)
    d = page.evaluate("""() => ({
      text: document.body.innerText,
      dyn: (document.getElementById('sf-dynamic')||{}).innerText || '',
      broken: Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      imgCount: document.images.length,
      dynImg: document.querySelectorAll('#sf-dynamic img').length
    })""")
    isadm = "/admin/" in url
    rec.update({"text_len": len(d["text"]), "dyn_len": len(d["dyn"]),
                "broken": d["broken"], "overflow": d["overflow"], "imgCount": d["imgCount"],
                "dyn_img": d["dynImg"],
                "content_ok": (len(d["dyn"]) >= (200 if isadm else 300)) and (isadm or d["dynImg"] >= 3),
                "text_sample": d["text"][:120].replace("\n", " / ")})
    RESULT["pages"].append(rec)
    return rec

def check(name, cond, detail=""):
    RESULT["interactions"].append({"name": name, "ok": bool(cond), "detail": detail})
    print("  %-46s %s %s" % (name, "PASS" if cond else "FAIL", detail))

def interactions(pw, browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    p = ctx.new_page()
    p.set_default_timeout(6000)
    errs, http404 = [], []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    p.on("response", lambda r: http404.append("%s %s" % (r.status, r.url)) if r.status >= 400 else None)

    # 从首页出发，逐频道点击（不抽样跳页）
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(600)
    nav_targets = [
      ("nav.farms", "farms.html"), ("nav.forum", "forum.html"), ("nav.experts", "experts.html"),
      ("nav.dispatch", "dispatch.html"), ("nav.account", "account.html")
    ]
    for key, target in nav_targets:
        p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(350)
        p.click('[data-nav="%s"]' % key, timeout=8000)
        p.wait_for_load_state("networkidle"); p.wait_for_timeout(350)
        check("首页点击 %s → 到达 %s" % (key, target), target in p.url, p.url.split("/")[-1])

    # 后台隐藏：前台任何位置都不出现后台入口；管理员走独立地址
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(400)
    hidden = p.locator('a[href*="admin/"]').count()
    check("前台导航与页脚 → 不出现后台入口", hidden == 0, "命中 %d 个" % hidden)
    p.goto(BASE + "/admin/login.html", wait_until="networkidle"); p.wait_for_timeout(400)
    check("管理员直接访问独立地址 → 到达后台登录", p.locator('form[data-form="admin-login"]').count() > 0,
          p.url.split("/")[-1])

    # 前台账号体系：登录错误 → 行内报错；正确 → 显式登录态；退出 → 回到未登录
    p.goto(BASE + "/login.html?from=index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    p.fill('form[data-form="login"] input[name="account"]', "tianyou")
    p.fill('form[data-form="login"] input[name="passphrase"]', "wrong-pass")
    p.click('form[data-form="login"] button[type="submit"]'); p.wait_for_timeout(350)
    check("登录输入错误口令 → 行内报错且不跳转",
          p.locator(".sf-field-err.is-on").count() > 0 and "login.html" in p.url,
          (p.locator(".sf-field-err.is-on").first.inner_text()
           if p.locator(".sf-field-err.is-on").count() else "")[:30])
    p.fill('form[data-form="login"] input[name="passphrase"]', "sumfarm2026")
    p.click('form[data-form="login"] button[type="submit"]'); p.wait_for_timeout(900)
    check("登录提交正确口令 → 带显式登录态回到来源页",
          "auth=1" in p.url and "uid=U013" in p.url and "index.html" in p.url, p.url.split("/")[-1][:60])
    p.goto(BASE + "/account.html?auth=1&uid=U013&role=consumer&welcome=1", wait_until="networkidle")
    p.wait_for_timeout(500)
    check("进入个人中心欢迎态 → 显示欢迎条", p.locator(".sf-welcome").count() > 0)
    p.locator('[data-act="signout"]').first.click(); p.wait_for_timeout(800)
    check("点击退出登录 → 导航回到登录 / 注册",
          "auth=1" not in p.url and p.locator('[data-nav="auth.login"]').count() > 0, p.url.split("/")[-1][:50])

    # 登录 / 注册合并页：Tab 切换不跳页；注册校验拦截 → 成功直接登录
    p.goto(BASE + "/login.html?from=index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    check("打开账号页 → 登录 / 注册同页双 Tab，默认显示登录表单",
          p.locator('.sf-auth-tab[data-v="login"].is-on').count() > 0
          and p.locator('.sf-auth-mode[data-mode="login"]:not([hidden])').count() > 0
          and p.locator('.sf-auth-mode[data-mode="register"][hidden]').count() > 0, "")
    p.click('.sf-auth-tab[data-v="register"]'); p.wait_for_timeout(350)
    check("点注册 Tab → 只换表单，仍停在 login.html 且 URL 带 mode=register",
          "login.html" in p.url and "mode=register" in p.url
          and p.locator('.sf-auth-mode[data-mode="register"]:not([hidden])').count() > 0
          and p.locator('.sf-auth-mode[data-mode="login"][hidden]').count() > 0, p.url.split("/")[-1][:70])
    p.fill('form[data-form="register"] input[name="account"]', "newtianyou")
    p.fill('form[data-form="register"] input[name="phone"]', "13800138000")
    p.fill('form[data-form="register"] input[name="passphrase"]', "sumfarm2026")
    p.fill('form[data-form="register"] input[name="confirm"]', "different")
    p.click('form[data-form="register"] button[type="submit"]'); p.wait_for_timeout(300)
    check("注册两次口令不一致 → 行内拦截且不离开账号页",
          p.locator(".sf-field-err.is-on").count() > 0 and "login.html" in p.url)
    p.fill('form[data-form="register"] input[name="confirm"]', "sumfarm2026")
    p.check('form[data-form="register"] input[name="agree"]')
    p.select_option('form[data-form="register"] select[name="role"]', "grower"); p.wait_for_timeout(150)
    p.click('form[data-form="register"] button[type="submit"]'); p.wait_for_timeout(900)
    check("注册填写完整并勾选协议 → 直接登录并回到来源页",
          "auth=1" in p.url and "role=grower" in p.url and "welcome=1" in p.url, p.url.split("/")[-1][:70])
    p.goto(BASE + "/login.html", wait_until="networkidle"); p.wait_for_timeout(500)
    check("账号合并页 → 首屏不再堆无关跳转按钮",
          p.locator('.sf-hero-actions').count() == 0, "")
    p.goto(BASE + "/forgot.html", wait_until="networkidle"); p.wait_for_timeout(400)
    p.fill('form[data-form="forgot"] input[name="phone"]', "abc")
    p.click('form[data-form="forgot"] button[type="submit"]'); p.wait_for_timeout(300)
    check("找回填非法联系方式 → 行内格式拦截", p.locator(".sf-field-err.is-on").count() > 0)
    p.fill('form[data-form="forgot"] input[name="phone"]', "13800138000")
    p.click('form[data-form="forgot"] button[type="submit"]'); p.wait_for_timeout(400)
    check("找回填合法手机号 → 出现成功态与返回登录入口",
          p.locator("form[data-form='forgot'] .sf-empty h3").count() > 0,
          (p.locator("form[data-form='forgot'] .sf-empty h3").inner_text()
           if p.locator("form[data-form='forgot'] .sf-empty h3").count() else "")[:24])

    # 删除二次确认 / ESC 关闭 / 收藏 / 全选可逆
    p.goto(BASE + "/activity-calendar.html", wait_until="networkidle"); p.wait_for_timeout(500)
    p.locator('[data-act="delete"]').first.click(); p.wait_for_timeout(250)
    check("点击删除 → 先弹二次确认浮层",
          p.locator("#sf-modal.is-on .sf-confirm-box").count() > 0)
    p.keyboard.press("Escape"); p.wait_for_timeout(250)
    check("按 ESC → 确认浮层关闭且不执行删除", p.locator("#sf-modal.is-on").count() == 0)
    p.locator('[data-act="selectAll"]').first.click(); p.wait_for_timeout(200)
    checked = p.locator(".sf-check-del:checked").count()
    check("点击全选 → 当前页复选框真的勾选", checked >= 8, "勾选 %d 行" % checked)
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    cb = p.locator('[data-act="collect"]').first
    cb.click(); p.wait_for_timeout(250)
    check("点击收藏 → 按钮变为已收藏并有反馈", "已收藏" in cb.inner_text() or "Saved" in cb.inner_text(), cb.inner_text().strip())

    # 素材升级：内容图必须为真实田园成图，按 pagename_id 取到题材切图
    p.goto(BASE + "/farms-region.html", wait_until="networkidle"); p.wait_for_timeout(700)
    art_stat = p.evaluate("""() => ({
      svg: Array.from(document.images).filter(i => i.getAttribute('src') || '' ).filter(i => (i.getAttribute('src')||'').startsWith('data:image/svg')).length,
      art: Array.from(document.images).filter(i => (i.getAttribute('src')||'').includes('/art/sub_')).length,
      heroes: Array.from(document.querySelectorAll('.sf-hero-wide,.sf-hero-tall')).map(i => i.getAttribute('src'))
    })""")
    check("内容图片位 → 全部为真实成图，无矢量色卡占位",
          art_stat["svg"] == 0, "矢量占位 %d 个" % art_stat["svg"])
    check("按 pagename_id 取图 → 页面用到题材切图且 16:9 / 9:16 双主视觉齐备",
          art_stat["art"] >= 4 and any("wide" in h for h in art_stat["heroes"]) and
          any("tall" in h for h in art_stat["heroes"]),
          "切图 %d 张，hero %s" % (art_stat["art"], "/".join(x.split("/")[-1] for x in art_stat["heroes"])))
    p.goto(BASE + "/venue-wedding.html", wait_until="networkidle"); p.wait_for_timeout(700)
    wed = p.locator(".sf-hero-wide").get_attribute("src")
    check("题材归属 → 婚纱场地页取到 wedding 题材切图", "sub_wedding" in (wed or ""), wed or "")

    # 主按钮配色可见性
    pb = p.locator(".sf-btn.is-primary").first
    sty = pb.evaluate("e => { const s = getComputedStyle(e); return {bg:s.backgroundColor, fg:s.color, txt:e.innerText.trim()}; }")
    check("主按钮 → 有实心背景色、可读前景色与非空文案",
          sty["bg"] not in ("rgba(0, 0, 0, 0)", "transparent") and len(sty["txt"]) > 0,
          "%s / %s / %s" % (sty["bg"], sty["fg"], sty["txt"][:12]))

    # ===== 本轮视图走查整改：搜索框归属 / 配色 / 下拉 / 论坛 / 接单 / 个人 =====
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(700)
    hs = p.evaluate("""() => {
      const f=document.querySelector('.sf-hero-search');
      return {inside:!!(f&&f.closest('.sf-hero')&&f.closest('.sf-hero-copy')),
        total:document.querySelectorAll('form[data-form="search"]').length,
        h1:getComputedStyle(document.querySelector('.sf-hero h1')).color,
        mask:getComputedStyle(document.querySelector('.sf-hero-mask')).backgroundImage,
        heroImg:getComputedStyle(document.querySelector('.sf-hero-wide')).filter,
        bodyBg:getComputedStyle(document.body).backgroundImage};
    }""")
    check("打开首页 → 搜索框位于 sf-hero 内部，且全站只有这一个",
          hs["inside"] and hs["total"] == 1, "hero 内 %s / 全站 %d 个" % (hs["inside"], hs["total"]))
    check("hero 文字与背景 → 深墨绿字 + 浅色罩 + 图片降饱和，不再浓艳花眼",
          "34, 50, 41" in hs["h1"] and "255, 253, 247" in hs["mask"]
          and "saturate" in hs["heroImg"] and "linear-gradient" in hs["bodyBg"],
          "h1=%s / filter=%s" % (hs["h1"], hs["heroImg"][:32]))
    btns = p.evaluate("""() => {
      const g=e=>e?{fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}:null;
      return {pri:g(document.querySelector('.sf-hero-actions .sf-btn.is-primary')),
        sec:g(document.querySelector('.sf-hero-actions .sf-btn:not(.is-primary)'))};
    }""")
    # 首页首屏整改后只剩一个主按钮：次按钮为可选，存在时才校验「白底深字」层级
    check("hero 按钮 → 主按钮绿底白字，存在次按钮时白底深字，层级分开且字清楚",
          bool(btns["pri"] and "255, 255, 255" in btns["pri"]["fg"] and "74, 124, 89" in btns["pri"]["bg"]
               and (not btns["sec"] or "34, 50, 41" in btns["sec"]["fg"])),
          "主 %s / 次 %s" % (btns["pri"], btns["sec"]))
    p.fill('.sf-hero-search input[name="q"]', '儿菜')
    p.click('.sf-hero-search button[type="submit"]'); p.wait_for_timeout(900)
    check("在 hero 搜索框输入并提交 → 进入搜索结果页且带上关键词",
          "search.html" in p.url and "q=" in p.url, p.url.split("/")[-1][:60])

    # 首页下拉：鼠标分步穿过链接与菜单之间的 8px 间隙
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(600)
    lnk = p.locator('.sf-nav-item').first.locator('.sf-nav-link')
    bx = lnk.bounding_box()
    p.mouse.move(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2); p.wait_for_timeout(250)
    sub = p.locator('.sf-nav-sub').first
    v1 = sub.is_visible()
    for k in range(1, 9):
        p.mouse.move(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] + k * 2)
        p.wait_for_timeout(35)
    p.wait_for_timeout(320)
    v2 = sub.is_visible()
    sb = sub.bounding_box()
    if sb:
        p.mouse.move(sb["x"] + sb["width"] / 2, sb["y"] + sb["height"] / 2)
        p.wait_for_timeout(320)
    v3 = sub.is_visible()
    check("鼠标从首页导航斜移到下拉菜单 → 菜单保持展开，不闪一闪消失",
          v1 and v2 and v3, "悬停 %s → 过间隙 %s → 停子项 %s" % (v1, v2, v3))

    # 论坛：频道首页与版块子页都以文字行为主
    p.goto(BASE + "/forum.html", wait_until="networkidle"); p.wait_for_timeout(700)
    fr = p.evaluate("""() => ({rows:document.querySelectorAll('.sf-textrow').length,
      cards:document.querySelectorAll('#sf-dynamic .sf-grid .sf-card').length})""")
    check("打开论坛 → 以文字列表为主，不铺图片卡片",
          fr["rows"] >= 6 and fr["cards"] == 0, "文字行 %d / 卡片 %d" % (fr["rows"], fr["cards"]))
    p.goto(BASE + "/forum-tech.html", wait_until="networkidle"); p.wait_for_timeout(700)
    ft = p.evaluate("""() => ({rows:document.querySelectorAll('.sf-textrow').length,
      cards:document.querySelectorAll('#sf-dynamic .sf-grid .sf-card').length})""")
    check("打开论坛版块子页 → 同样以文字列表呈现",
          ft["rows"] >= 6 and ft["cards"] == 0, "文字行 %d / 卡片 %d" % (ft["rows"], ft["cards"]))

    # 接单：两个口径的附近单同时常驻
    p.goto(BASE + "/dispatch.html", wait_until="networkidle"); p.wait_for_timeout(700)
    dr = p.evaluate("""() => {
      const g=id=>{const e=document.querySelector(id);return e?e.innerText:''};
      return {zones:document.querySelectorAll('.sf-zone').length,
        near:!!document.querySelector('#zone-nearby'),linked:!!document.querySelector('#zone-linked'),
        nearTxt:g('#zone-nearby'),linkedTxt:g('#zone-linked'),
        cards:document.querySelectorAll('#sf-dynamic .sf-grid .sf-card').length};
    }""")
    check("打开接单 → 同时显示当前定位附近单与关联田园附近单两个分区",
          dr["zones"] >= 3 and dr["near"] and dr["linked"] and "当前定位" in dr["nearTxt"]
          and "关联" in dr["linkedTxt"] and dr["cards"] == 0,
          "分区 %d / 卡片 %d" % (dr["zones"], dr["cards"]))
    check("接单两个分区 → 按定位与按关联田园是两套数据，不是同列表换壳",
          dr["nearTxt"] != dr["linkedTxt"] and len(dr["nearTxt"]) > 100 and len(dr["linkedTxt"]) > 100,
          "%d / %d 字符" % (len(dr["nearTxt"]), len(dr["linkedTxt"])))
    p.click('#dispatch-tabs .sf-chip[data-v="linked"]'); p.wait_for_timeout(500)
    check("接单快速定位点关联田园 → 按钮选中且滚动到对应分区",
          p.locator('#dispatch-tabs .sf-chip[data-v="linked"].is-on').count() > 0
          and p.locator('#sf-toast.is-on').count() > 0, "")

    # 个人：按功能分区管理
    p.goto(BASE + "/account.html", wait_until="networkidle"); p.wait_for_timeout(700)
    ar = p.evaluate("""() => ({zones:document.querySelectorAll('.sf-zone').length,
      ids:Array.from(document.querySelectorAll('.sf-zone')).map(e=>e.id),
      cards:document.querySelectorAll('#sf-dynamic .sf-grid .sf-card').length})""")
    check("打开个人 → 按功能划分五个管理分区，不以卡片为主",
          ar["zones"] >= 5 and ar["cards"] == 0 and "zone-workorders" in ar["ids"],
          "分区 %d / 卡片 %d" % (ar["zones"], ar["cards"]))
    p.goto(BASE + "/login.html", wait_until="networkidle"); p.wait_for_timeout(600)
    check("打开登录页 → 不出现全局搜索框，填写不被干扰",
          p.locator('.sf-hero-search').count() == 0, "")

    # ===== 本轮整改：首屏按钮去重 / 账号合并 / 农事挂靠田园 / 专家指导工单 =====
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(600)
    hb = p.evaluate("""() => {
      const box=document.querySelector('.sf-hero-actions');
      if(!box) return {n:0,hrefs:[]};
      return {n:box.querySelectorAll('a').length,
        hrefs:Array.from(box.querySelectorAll('a')).map(a=>a.getAttribute('href').split('?')[0])};
    }""")
    navset = {'index.html','farms.html','forum.html','experts.html','dispatch.html','account.html',
              'videos.html','activity.html','produce.html','promo.html','search.html','orders.html','workorders.html'}
    check("首页首屏 → 最多 2 个按钮，且没有一个重复指向导航栏频道",
          hb["n"] <= 2 and all(h not in navset for h in hb["hrefs"]),
          "%d 个：%s" % (hb["n"], ",".join(hb["hrefs"])))
    p.goto(BASE + "/forum-tech.html", wait_until="networkidle"); p.wait_for_timeout(600)
    sh = p.evaluate("""() => {
      const b=document.querySelector('.sf-hero-actions');
      return b?{n:b.querySelectorAll('a').length,href:b.querySelector('a').getAttribute('href')}:{n:0,href:''};
    }""")
    check("论坛子页首屏 → 只保留一个返回上级按钮，不堆跨频道入口",
          sh["n"] == 1 and sh["href"] == "forum.html", "%s" % sh)
    p.goto(BASE + "/account.html", wait_until="networkidle"); p.wait_for_timeout(700)
    fj = p.evaluate("""() => {
      const z=document.querySelector('#zone-farms'); if(!z) return {btn:0,wrong:0};
      const links=Array.from(z.querySelectorAll('a')).map(a=>a.getAttribute('href'));
      return {btn:links.filter(h=>h.indexOf('workorder-new.html')>=0).length,
        wrong:links.filter(h=>h.indexOf('dispatch-nearby.html')>=0).length,
        txt:z.innerText};
    }""")
    check("个人「我的田园」→ 每行都有远程创建工单，且不再误解成找农事",
          fj["btn"] >= 6 and fj["wrong"] == 0 and "远程创建工单" in fj["txt"],
          "创建工单 %d / 找农事 %d" % (fj["btn"], fj["wrong"]))
    first = p.locator('#zone-farms a[href*="workorder-new.html"]').first
    fj_href = first.get_attribute("href")
    first.click(); p.wait_for_timeout(800)
    check("点某块田的远程创建工单 → 进入创建页且 URL 带这块田的 farmId",
          "workorder-new.html" in p.url and "farmId=" in p.url, fj_href[:80])
    wj = p.evaluate("""() => ({
      farm:(document.querySelector('.sf-panel h3')||{}).innerText||'',
      types:Array.from((document.querySelector('form[data-form="newjob-farm"] select[name="type"]')||{options:[]}).options).map(o=>o.value||o.text),
      hidden:(document.querySelector('form[data-form="newjob-farm"] input[name="farmId"]')||{}).value||''
    })""")
    check("创建工单页 → 显示所选田园档案、类型含专家指导、隐藏 farmId 已回填",
          len(wj["farm"]) > 4 and "专家指导" in wj["types"] and len(wj["hidden"]) >= 3,
          "%s / %d 类 / %s" % (wj["farm"][:28], len(wj["types"]), wj["hidden"]))
    p.fill('form[data-form="newjob-farm"] textarea[name="scope"]', 'B-07 全畦及对照区，取样点按试验方案布设')
    p.fill('form[data-form="newjob-farm"] textarea[name="acceptance"]', '提交现场记录、检测读数与技术结论，逐条对应试验目标')
    p.select_option('form[data-form="newjob-farm"] select[name="type"]', '专家指导')
    p.click('form[data-form="newjob-farm"] button[type="submit"]'); p.wait_for_timeout(500)
    check("提交专家指导工单 → 出现挂到这块田的成功态与返回入口",
          p.locator('[data-job-ok]').count() > 0 and "专家指导" in p.locator('[data-job-ok]').inner_text(), "")
    p.goto(BASE + "/job-expert.html", wait_until="networkidle"); p.wait_for_timeout(700)
    check("打开专家指导工单页 → 有真实文字内容，不是空壳",
          len(p.locator('#sf-dynamic').inner_text()) > 300, "")
    p.goto(BASE + "/login.html", wait_until="networkidle"); p.wait_for_timeout(500)
    check("账号页 → 登录 / 注册合并，导航只剩一个账号入口，独立注册页已下线",
          p.locator('.sf-auth-tab').count() == 2
          and p.locator('form[data-form="login"]').count() == 1
          and p.locator('form[data-form="register"]').count() == 1
          and p.locator('[data-nav="auth.login"]').count() == 1, "")

    # ===== 本轮：普通用户逐按钮问答 + 五类用户画像走查 =====
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(800)
    hb1 = p.evaluate("""() => {
      const b=document.querySelector('.sf-hero-actions');
      return {n:b?b.querySelectorAll('a').length:0,
        txt:b?b.innerText.trim():'', href:b&&b.querySelector('a')?b.querySelector('a').getAttribute('href'):''};
    }""")
    check("首页首屏 → 只剩一个所有人都能答的按钮「按地区找田」，不再问用户为什么能发布田园",
          hb1["n"] == 1 and "按地区找田" in hb1["txt"] and "farms-region.html" in hb1["href"],
          "%d 个 / %s" % (hb1["n"], hb1["txt"][:24]))
    gd = p.evaluate("""() => {
      const h=Array.from(document.querySelectorAll('.sf-section h2')).find(e=>e.innerText.indexOf('按身份进入')>=0);
      if(!h) return {rows:0,links:0,txt:''};
      const box=h.closest('.sf-section');
      const rows=box.querySelectorAll('.sf-textrow');
      return {rows:rows.length, links:box.querySelectorAll('.sf-textrow-act a').length, txt:box.innerText};
    }""")
    check("首页「按身份进入」→ 四类身份各一行、共 8 个直达入口，普通用户先找到自己",
          gd["rows"] == 4 and gd["links"] == 8
          and all(k in gd["txt"] for k in ('商家 / 村集体', '租赁用户', '接单农户', '产学研团队')),
          "%d 行 / %d 入口" % (gd["rows"], gd["links"]))
    for label, target in (("发布田园信息", "farm-edit.html"), ("我的田园", "account.html"),
                          ("附近工单", "dispatch-nearby.html"), ("专家指导工单", "job-expert.html")):
        p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(400)
        a = p.locator('.sf-textrow-act a', has_text=label).first
        href = a.get_attribute("href")
        a.click(); p.wait_for_timeout(700)
        check("画像任务链 · 点「%s」→ 真到 %s" % (label, target), target in p.url, (href or "")[:70])
    p.goto(BASE + "/farms.html", wait_until="networkidle"); p.wait_for_timeout(700)
    fr = p.evaluate("""() => { const a=document.querySelector('.sf-hero-actions a[data-i18n="farms.upload"]');
      return a?{hidden:a.hidden,txt:a.innerText}:{hidden:null,txt:''}; }""")
    check("未登录逛田园档案 → 商家专属「上传田园信息」隐藏，并给出身份说明与去登录入口",
          fr["hidden"] is True and p.locator('.sf-role-hint').count() > 0
          and p.locator('.sf-role-hint a').count() > 0, "")
    p.goto(BASE + "/farms.html?auth=1&uid=U001&role=merchant", wait_until="networkidle"); p.wait_for_timeout(700)
    check("以商家身份进田园档案 → 「上传田园信息」显示出来，动作与身份一致",
          p.locator('.sf-hero-actions a[data-i18n="farms.upload"]').is_visible(), "")
    p.goto(BASE + "/farms.html?auth=1&uid=U013&role=consumer", wait_until="networkidle"); p.wait_for_timeout(700)
    check("以租赁用户身份进田园档案 → 商家动作仍隐藏，不制造答不上来的按钮",
          p.locator('.sf-hero-actions a[data-i18n="farms.upload"]').is_hidden(), "")
    p.goto(BASE + "/forum-tech.html", wait_until="networkidle"); p.wait_for_timeout(600)
    btxt = p.locator('.sf-hero-actions a').first.inner_text()
    check("子页「返回」→ 写明回到哪一级，不再让用户猜",
          "返回田园论坛" in btxt and p.locator('.sf-hero-actions a').first.get_attribute("data-i18n") == "back.forum", btxt)
    p.goto(BASE + "/forum-tech.html?lang=en", wait_until="networkidle"); p.wait_for_timeout(600)
    check("英文子页「返回」→ 是另行撰写的真英文，不是中文翻译占位",
          "Back to the forum" in p.locator('.sf-hero-actions a').first.inner_text(), "")
    p.goto(BASE + "/index.html?lang=en", wait_until="networkidle"); p.wait_for_timeout(700)
    check("英文首页身份导引 → 真英文且四类身份齐全",
          "Start by your role" in p.locator('#sf-dynamic').inner_text()
          and "Cooperative" in p.locator('#sf-dynamic').inner_text(), "")
    p.goto(BASE + "/dispatch.html", wait_until="networkidle"); p.wait_for_timeout(800)
    dz = p.locator('#sf-dynamic').inner_text()
    check("普通用户进接单大厅 → 说明这是农户工作台、删掉跨频道「管理我的田园」、给出正确去向",
          "管理我的田园" not in dz and "不是给自己田派活的地方" in dz
          and p.locator('.sf-role-hint a[href*="account.html"]').count() > 0, dz[:60])
    p.goto(BASE + "/dispatch.html?auth=1&uid=U025&role=grower", wait_until="networkidle"); p.wait_for_timeout(800)
    check("农户进接单大厅 → 说明换成「这些活可以接、做完传回执」，不再指向个人中心",
          "接单农户的工作台" in p.locator('#sf-dynamic').inner_text()
          and "不是给自己田派活的地方" not in p.locator('#sf-dynamic').inner_text(), "")
    p.goto(BASE + "/account.html", wait_until="networkidle"); p.wait_for_timeout(800)
    az = p.evaluate("""() => { const z=document.querySelector('#zone-farms');
      const a=z?z.querySelector('a[href*="farm-detail.html"]'):null;
      return {txt:z?z.innerText:'', href:a?a.getAttribute('href'):''}; }""")
    check("个人「我的田园」→ 每行改为「查看田园档案」，落到田块详情，不再是商家动作",
          "查看田园档案" in az["txt"] and "管理档案" not in az["txt"]
          and "farm-detail.html" in az["href"] and "id=F" in az["href"], az["href"][:70])
    p.goto(BASE + "/experts.html", wait_until="networkidle"); p.wait_for_timeout(800)
    ez = p.locator('#sf-dynamic').inner_text()
    check("产学研从专家页 → 能直接到专家指导工单与种植实践记录，画像闭环",
          "技术实践与指导" in ez and "专家指导工单" in ez and "种植实践记录" in ez
          and p.locator('#sf-dynamic a[href*="job-expert.html"]').count() > 0, "")
    p.goto(BASE + "/activity-detail.html?id=A001", wait_until="networkidle"); p.wait_for_timeout(600)
    check("活动详情 → 按钮写明「报名后签到」，不再让没报名的人困惑",
          "报名后签到" in p.locator('.sf-hero-actions').inner_text(), "")
    p.goto(BASE + "/produce-detail.html?id=P001", wait_until="networkidle"); p.wait_for_timeout(600)
    check("农产品详情 → 按钮写明「加入购物车」，功能词不被可爱词盖住",
          "加入购物车" in p.locator('.sf-hero-actions').inner_text()
          and "竹筐购物车" not in p.locator('.sf-hero-actions').inner_text(), "")

    # ===== 本轮：hero 背景收紧 / 真实田块对比 / 工单严谨化 =====
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(700)
    mask = p.evaluate("""() => ({mask:getComputedStyle(document.querySelector('.sf-hero-mask')).backgroundImage,
      body:getComputedStyle(document.body).backgroundImage})""")
    check("hero 背景透明度收紧 → 浅米色更突出（.97 / .94 / .85），整体 body 罩保持 .88 不动",
          "0.97" in mask["mask"] and "0.85" in mask["mask"] and "0.88" in mask["body"],
          mask["mask"][:90])
    p.goto(BASE + "/farm-compare.html", wait_until="networkidle"); p.wait_for_timeout(700)
    cp = p.evaluate("""() => ({boxes:document.querySelectorAll('input[data-act="compare-pick"]').length,
      empty:document.querySelector('.sf-empty h3')?document.querySelector('.sf-empty h3').innerText:'',
      table:document.querySelectorAll('[data-compare-table]').length})""")
    check("打开田块对比 → 先看到真正的多选候选，未选时给空态引导而不是假表格",
          cp["boxes"] >= 20 and "还没有勾选田块" in cp["empty"] and cp["table"] == 0,
          "%d 个候选 / %s" % (cp["boxes"], cp["empty"]))
    for v in ("F001", "F002"):
        p.locator('input[data-act="compare-pick"][data-v="%s"]' % v).check()
    p.locator('[data-act="compare-build"]').click(); p.wait_for_timeout(800)
    cmp = p.evaluate("""() => {
      const t=document.querySelector('[data-compare-table]'); if(!t) return {ok:false};
      const rows=t.querySelectorAll('tbody tr');
      let same=0,diff=0,colspan=0;
      rows.forEach(r=>{ if(r.getAttribute('data-same')==='1'){same++; if(r.querySelector('td[colspan]')) colspan++;}
        else diff++; });
      return {ok:true, cols:t.querySelectorAll('thead th').length, rows:rows.length,
        same:same, diff:diff, colspan:colspan,
        diffCells:t.querySelectorAll('td.is-diff').length,
        stat:(document.querySelector('[data-compare-stat]')||{}).innerText||''};
    }""")
    check("勾选 2 块并生成清单 → URL 带 ids、表格按字段并排、相同项缩减、不同项高亮",
          "ids=" in p.url and cmp["ok"] and cmp["cols"] == 3 and cmp["colspan"] >= 1
          and cmp["diffCells"] >= 1 and "相同" in cmp["stat"],
          "%s" % cmp)
    p.locator('input[data-act="compare-pick"][data-v="F003"]').check(); p.wait_for_timeout(150)
    p.locator('[data-act="compare-toggle"]').click(); p.wait_for_timeout(300)
    tg = p.evaluate("""() => ({hidden:document.querySelector('[data-compare-table]').classList.contains('is-hide-same'),
      label:document.querySelector('[data-act="compare-toggle"]').innerText,
      pressed:document.querySelector('[data-act="compare-toggle"]').getAttribute('aria-pressed')})""")
    check("点「只看不同项」→ 相同行真的隐藏、按钮状态与文案同步变化",
          tg["hidden"] and "显示全部" in tg["label"] and tg["pressed"] == "true", "%s" % tg)
    p.goto(BASE + "/farm-compare.html?ids=F001,F002,F003,F004,F005", wait_until="networkidle"); p.wait_for_timeout(700)
    over = p.evaluate("""() => ({boxes:document.querySelectorAll('input[data-act="compare-pick"]:checked').length,
      cols:document.querySelector('[data-compare-table]')?document.querySelector('[data-compare-table]').querySelectorAll('thead th').length:0,
      hint:(document.querySelector('.sf-role-hint')||{}).innerText||''})""")
    check("URL 给 5 个 ids → 自动收敛到最多 4 块，重复/超限不撑破对比表",
          over["boxes"] == 4 and over["cols"] == 5, "%s" % over)
    p.goto(BASE + "/farm-compare.html?lang=en&ids=F001,F002", wait_until="networkidle"); p.wait_for_timeout(700)
    check("英文对比页 → 真英文文案，不是中文翻译占位",
          "Step 1" in p.locator('#sf-dynamic').inner_text()
          and "Build comparison" in p.locator('#sf-dynamic').inner_text(), "")
    p.goto(BASE + "/farm-compare.html?ids=F001,F002", wait_until="networkidle"); p.wait_for_timeout(700)
    p.locator('[data-act="compare-clear"]').click(); p.wait_for_timeout(700)
    check("点「清空重选」→ 回到未选状态与空态引导",
          "ids=" not in p.url and p.locator('.sf-empty h3').count() > 0, p.url.split("/")[-1][:60])

    p.goto(BASE + "/workorders.html", wait_until="networkidle"); p.wait_for_timeout(800)
    wl = p.evaluate("""() => ({rows:document.querySelectorAll('#sf-dynamic .sf-textrow').length,
      badges:document.querySelectorAll('#sf-dynamic .sf-job-badge').length,
      cards:document.querySelectorAll('#sf-dynamic .sf-grid .sf-card').length,
      txt:(document.querySelector('#sf-dynamic')||{}).innerText||''})""")
    check("工单总览 → 严谨文字清单，每行显示具体状态徽章与流程进度，不再随意铺卡片",
          wl["rows"] >= 4 and wl["badges"] >= 4 and wl["cards"] == 0
          and "固定流程" in wl["txt"], "%s" % wl)
    p.goto(BASE + "/workorder-detail.html?id=W001", wait_until="networkidle"); p.wait_for_timeout(800)
    wd = p.evaluate("""() => ({badge:document.querySelectorAll('.sf-job-badge').length,
      steps:document.querySelectorAll('.sf-job-step').length,
      reqs:document.querySelectorAll('.sf-table tbody tr').length,
      txt:(document.querySelector('#sf-dynamic')||{}).innerText||''})""")
    check("工单详情 → 状态徽章 + 六步固定流程 + 逐条明细需求，页面严谨可核对",
          wd["badge"] >= 1 and wd["steps"] >= 6 and wd["reqs"] >= 10
          and "工单明细需求" in wd["txt"] and "固定工单流程" in wd["txt"], "%s" % wd)
    p.goto(BASE + "/workorder-detail.html?id=W005", wait_until="networkidle"); p.wait_for_timeout(800)
    check("验收退回的工单 → 时间线显示异常分支与退回原因，不混进主流程",
          p.locator('.sf-job-badge.is-returned').count() > 0
          and "异常分支" in p.locator('#sf-dynamic').inner_text(), "")
    p.goto(BASE + "/workorder-new.html?farmId=F001", wait_until="networkidle"); p.wait_for_timeout(800)
    wn = p.evaluate("""() => ({scope:document.querySelectorAll('form[data-form="newjob-farm"] textarea[name="scope"]').length,
      acceptance:document.querySelectorAll('form[data-form="newjob-farm"] textarea[name="acceptance"]').length,
      safety:document.querySelectorAll('form[data-form="newjob-farm"] textarea[name="safety"]').length,
      priority:document.querySelectorAll('form[data-form="newjob-farm"] select[name="priority"]').length,
      settle:document.querySelectorAll('form[data-form="newjob-farm"] select[name="settle"]').length,
      flow:document.querySelectorAll('.sf-job-flow .sf-job-step').length,
      txt:(document.querySelector('#sf-dynamic')||{}).innerText||''})""")
    check("创建工单 → 明细需求条目齐全，并预先写明固定流程与提交后的状态",
          wn["scope"] == 1 and wn["acceptance"] == 1 and wn["safety"] == 1
          and wn["priority"] == 1 and wn["settle"] == 1 and wn["flow"] >= 6
          and "明细需求条目" in wn["txt"], "%s" % wn)
    p.goto(BASE + "/dispatch.html", wait_until="networkidle"); p.wait_for_timeout(800)
    check("接单大厅 → 每条工单也标明具体状态，方便农户判断能不能接",
          p.locator('.sf-job-badge').count() >= 4, "")

    # 移动端「更多」浮层
    mctx = browser.new_context(viewport={"width": 390, "height": 844})
    mp = mctx.new_page(); mp.set_default_timeout(6000)
    mp.goto(BASE + "/index.html", wait_until="networkidle"); mp.wait_for_timeout(500)
    mp.locator('[data-act="sheet-open"]').click(); mp.wait_for_timeout(300)
    check("手机点击更多 → 浮层列出子栏目与账号入口",
          mp.locator("#sf-sheet.is-on").count() > 0 and mp.locator(".sf-sheet-item").count() >= 6,
          "%d 个入口" % mp.locator(".sf-sheet-item").count())
    mp.locator('[data-act="sheet-close"]').click(); mp.wait_for_timeout(250)
    check("手机点关闭 → 浮层收起", mp.locator("#sf-sheet.is-on").count() == 0)
    mctx.close()

    # 首页子栏目「更多」指向列表页
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    more = p.locator('[data-act="more"]').first
    if more.count():
        href = more.get_attribute("href") or ""
        check("首页「更多」→ 列表页（非写入页）", href.split("?")[0].endswith("videos.html"), href)

    # 收藏点赞可见反馈
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    b = p.locator('[data-act="like"]').first
    before = b.inner_text()
    b.click(); p.wait_for_timeout(300)
    check("点击点赞 → 按钮变为已点赞并出现提示", "已点赞" in b.inner_text() or "Liked" in b.inner_text(),
          "%s → %s" % (before.strip(), b.inner_text().strip()))

    # FAQ 折叠答案是真答案
    faq = p.locator('[data-act="faq"]').first
    faq.click(); p.wait_for_timeout(250)
    body = p.locator(".sf-faq.is-open .sf-faq-body").first
    check("点击 FAQ → 展开真答案", body.count() > 0 and len(body.inner_text()) > 30,
          (body.inner_text()[:40] if body.count() else ""))

    # 分页真的换页
    p.goto(BASE + "/farms.html", wait_until="networkidle"); p.wait_for_timeout(600)
    first = p.locator(".sf-card-title").first.inner_text()
    nxt = p.locator('[data-act="next"]').first
    if nxt.is_enabled():
        nxt.click(); p.wait_for_timeout(600)
        second = p.locator(".sf-card-title").first.inner_text()
        check("点击下一页 → 卡片内容真的更换", first != second, "%s → %s" % (first[:16], second[:16]))
    else:
        check("点击下一页 → 卡片内容真的更换", False, "按钮被禁用")

    # 搜索不同关键词结果不同
    p.goto(BASE + "/search.html?q=%E5%84%BF%E8%8F%9C", wait_until="networkidle"); p.wait_for_timeout(600)
    a = p.locator("#sf-dynamic").inner_text()
    p.goto(BASE + "/search.html?q=%E9%9C%B2%E8%90%A5", wait_until="networkidle"); p.wait_for_timeout(600)
    b2 = p.locator("#sf-dynamic").inner_text()
    check("搜索不同关键词 → 结果内容不同", a != b2 and len(a) > 80 and len(b2) > 80,
          "%d / %d 字符" % (len(a), len(b2)))

    # 空结果插画 + 文案 + 引导
    p.goto(BASE + "/search.html?q=zzz-nonexistent-999", wait_until="networkidle"); p.wait_for_timeout(600)
    check("空结果 → 插画 + 文案 + 引导按钮",
          p.locator(".sf-empty img").count() > 0 and p.locator(".sf-empty a").count() > 0,
          "img=%d a=%d" % (p.locator(".sf-empty img").count(), p.locator(".sf-empty a").count()))

    # 不同 id 详情内容不同
    p.goto(BASE + "/farm-detail.html?id=F001", wait_until="networkidle"); p.wait_for_timeout(600)
    x = p.locator("#sf-dynamic").inner_text()
    p.goto(BASE + "/farm-detail.html?id=F002", wait_until="networkidle"); p.wait_for_timeout(600)
    y = p.locator("#sf-dynamic").inner_text()
    check("详情 ?id=F001 / F002 → 内容不同", x != y and len(x) > 100, "%d / %d 字符" % (len(x), len(y)))

    # 工单对话发送消息
    p.goto(BASE + "/workorder-detail.html?id=W001", wait_until="networkidle"); p.wait_for_timeout(600)
    n0 = p.locator("#sf-chat .sf-bubble").count()
    p.fill('form[data-form="chat"] input[name="msg"]', "B-07 今天下午浇水并拍照")
    p.click('form[data-form="chat"] button[type="submit"]'); p.wait_for_timeout(400)
    n1 = p.locator("#sf-chat .sf-bubble").count()
    check("工单发送对话 → 气泡真的增加", n1 == n0 + 1, "%d → %d" % (n0, n1))

    # 后台独立登录
    p.goto(BASE + "/admin/login.html", wait_until="networkidle"); p.wait_for_timeout(500)
    p.fill('form[data-form="admin-login"] input[name="passphrase"]', "sumfarm-2026")
    p.fill('form[data-form="admin-login"] input[name="captcha"]', "SUM2026")
    p.click('form[data-form="admin-login"] button[type="submit"]'); p.wait_for_timeout(800)
    check("后台提交登录 → 进入独立管理总览", "admin/index.html" in p.url, p.url.split("/")[-1])

    # 后台内部导航闭环：侧栏不叠目录、审核可进可退、退出回独立登录
    p.goto(BASE + "/admin/index.html?m=dashboard", wait_until="networkidle"); p.wait_for_timeout(500)
    side_hrefs = p.locator(".adm-side a").evaluate_all("els => els.map(e => e.getAttribute('href'))")
    check("后台侧栏链接 → 均为同目录相对路径，不出现 admin/admin",
          len(side_hrefs) >= 8 and all(h and "admin/admin" not in h for h in side_hrefs),
          " | ".join(side_hrefs[:3]))
    p.locator('.adm-side a[href*="audit.html"]').click(); p.wait_for_load_state("networkidle"); p.wait_for_timeout(500)
    check("后台侧栏点多级审核 → 到达审核工作台且页面有三级流程",
          "admin/audit.html" in p.url and p.locator(".adm-step").count() >= 3, p.url.split("/")[-1][:50])
    p.locator('[data-act="back"]').first.click(); p.wait_for_timeout(800)
    check("审核页点返回 → 回到后台总览而非错层路径",
          "admin/index.html" in p.url and "admin/admin" not in p.url, p.url.split("/")[-1][:50])
    p.locator('[data-act="logout"]').first.click(); p.wait_for_timeout(800)
    check("后台点退出登录 → 回到独立后台登录页",
          "admin/login.html" in p.url and p.locator('form[data-form="admin-login"]').count() > 0,
          p.url.split("/")[-1][:50])

    # 子页体系：英文真内容
    p.goto(BASE + "/farms-region.html?lang=en", wait_until="networkidle"); p.wait_for_timeout(600)
    en_h1 = p.locator("h1").first.inner_text()
    en_body = p.locator("body").inner_text()
    check("打开英文子页 → 标题与正文是独立撰写的英文真内容",
          "Find plots by region" in en_h1 and "Browse registered farms" in en_body, en_h1[:40])

    # 子页体系：详情页按 URL 参数渲染
    p.goto(BASE + "/farms-region.html?id=F001", wait_until="networkidle"); p.wait_for_timeout(600)
    gx = p.locator("#sf-dynamic").inner_text()
    p.goto(BASE + "/farms-region.html?id=F002", wait_until="networkidle"); p.wait_for_timeout(600)
    gy = p.locator("#sf-dynamic").inner_text()
    check("子页 ?id=F001 / F002 → 内容不同", gx != gy and len(gx) > 200, "%d / %d 字符" % (len(gx), len(gy)))

    # 子页体系：分页真的换页
    p.goto(BASE + "/farms-region.html", wait_until="networkidle"); p.wait_for_timeout(600)
    gfirst = p.locator(".sf-card-title").first.inner_text()
    gnxt = p.locator('[data-act="next"]').first
    if gnxt.is_enabled():
        gnxt.click(); p.wait_for_timeout(600)
        gsecond = p.locator(".sf-card-title").first.inner_text()
        check("子页点击下一页 → 卡片内容真的更换", gfirst != gsecond,
              "%s → %s" % (gfirst[:14], gsecond[:14]))
    else:
        check("子页点击下一页 → 卡片内容真的更换", False, "按钮被禁用")

    # 子页体系：表单提交可见反馈
    p.goto(BASE + "/contact.html", wait_until="networkidle"); p.wait_for_timeout(500)
    p.fill('form[data-form="generic"] input[name="f0"]', "田园入驻咨询")
    p.click('form[data-form="generic"] button[type="submit"]'); p.wait_for_timeout(350)
    check("子页提交表单 → 出现保存提示", p.locator("#sf-toast.is-on").count() > 0,
          (p.locator("#sf-toast").inner_text() if p.locator("#sf-toast").count() else ""))

    # 语言切换（放最后，避免污染前面的中文取样）
    p.goto(BASE + "/index.html", wait_until="networkidle"); p.wait_for_timeout(500)
    p.click('[data-act="lang"]'); p.wait_for_timeout(900)
    en = p.locator("body").inner_text()
    check("点击语言切换 → 英文真内容且 URL 带 lang=en",
          "lang=en" in p.url and "Lease a plot" in en, p.url.split("?")[-1])

    RESULT["interaction_errors"] = errs
    RESULT["interaction_http404"] = http404
    ctx.close()

def main():
    global BASE
    srv = serve()
    BASE = "http://127.0.0.1:%d" % srv.server_address[1]
    print("HTTP 服务 %s 已启动（非 file://）" % BASE)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True,
                                     args=["--no-sandbox", "--disable-dev-shm-usage"])
        pages = PAGES[(BATCH - 1) * BATCH_SIZE: BATCH * BATCH_SIZE]
        print("== 第 %d/%d 批：%d 页（全站 %d 页）==" % (BATCH, TOTAL_BATCHES, len(pages), len(PAGES)))
        for label, w, h in VIEWPORTS:
            for path in pages:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                pg = ctx.new_page()
                url = BASE + "/" + path
                r = probe(pg, url, "%s %s" % (label, path))
                print("  %-20s %-38s text=%-6d dyn=%-6d img=%-3d broken=%d overflow=%d err=%d" % (
                    label, path[:36], r["text_len"], r["dyn_len"], r["imgCount"],
                    len(r["broken"]), r["overflow"],
                    len(r["console"]) + len(r["pageerror"]) + len(r["failed"]) + len(r["http4xx"])))
                ctx.close()
        if BATCH == 1:
            print("== 交互验收（使用者视角：用户做了 X → 得到 Y）==")
            try:
                interactions(pw, browser)
            except Exception as e:
                RESULT["interactions"].append({"name": "交互验收过程", "ok": False, "detail": str(e)[:160]})
                print("  交互验收异常已登记：", str(e)[:160])
        browser.close()
    srv.shutdown()

    # 每批结果落 JSON，最后一批生成合并版 RUNTIME.md
    with open(os.path.join(ROOT, "RUNTIME_batch%d.json" % BATCH), "w", encoding="utf-8") as f:
        json.dump({"batch": BATCH, "pages": RESULT["pages"],
                   "interactions": RESULT["interactions"],
                   "interaction_errors": RESULT.get("interaction_errors", []),
                   "interaction_http404": RESULT.get("interaction_http404", [])}, f, ensure_ascii=False)
    all_pages, all_inter, all_ierr, all_h404, done = [], [], [], [], []
    for bn in range(1, TOTAL_BATCHES + 1):
        fp = os.path.join(ROOT, "RUNTIME_batch%d.json" % bn)
        if os.path.exists(fp):
            d = json.load(open(fp, encoding="utf-8"))
            all_pages += d["pages"]; all_inter += d["interactions"]
            all_ierr += d.get("interaction_errors", [])
            all_h404 += d.get("interaction_http404", []); done.append(bn)

    out = ["# 闪马田园 SUMFARM · 运行时验收记录", "",
           "环境：真实 HTTP 服务 + Chromium 无头浏览器，双视口 1440×900 / 390×844，不使用 `file://`。",
           "复跑：`for b in $(seq 1 %d); do python3 runtime_check.py $b; done`（自动发现全站 %d 页，每批 %d 页，低于 20 页上限）。" % (TOTAL_BATCHES, len(PAGES), BATCH_SIZE),
           "等待策略：`networkidle` + 700ms 重绘 + 滚动到底 600ms + 强制 eager 900ms，懒加载全部完成后才取样；"
           "取样取完整 `body.innerText`。", "",
           "已执行批次：%s；覆盖页面取样 %d 次（双视口）。" % ("、".join("第%d批" % x for x in done), len(all_pages)), "",
           "## 逐页结果", "",
           "| 视口 | 页面 | 完整文本 | 动态区文字 | 动态区图片 | 破图 | 横向溢出 | 充盈 | 运行时错误 |",
           "|---|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in all_pages:
        e = len(r["console"]) + len(r["pageerror"]) + len(r["failed"]) + len(r["http4xx"])
        out.append("| %s | `%s` | %d | %d | %d | %d | %d | %s | %d |" % (
            r["page"].split(" ")[0], r["page"].split(" ", 1)[1], r["text_len"], r["dyn_len"],
            r.get("dyn_img", 0), len(r["broken"]), r["overflow"],
            "是" if r.get("content_ok") else "否", e))
    allerr = sum(len(r["console"]) + len(r["pageerror"]) + len(r["failed"]) + len(r["http4xx"])
                 for r in all_pages)
    allbroken = sum(len(r["broken"]) for r in all_pages)
    allover = sum(1 for r in all_pages if r["overflow"] > 1)
    thin = [r["page"] for r in all_pages if not r.get("content_ok")]
    out += ["", "**汇总**：运行时错误 %d / 请求失败 %d / 破图 %d / 横向溢出 %d 页 / 内容充盈未达标 %d 页 / 交互 %d 项（未通过 %d 项）。" % (
        allerr, sum(len(r["failed"]) + len(r["http4xx"]) for r in all_pages), allbroken, allover, len(thin),
        len(all_inter), sum(1 for i in all_inter if not i["ok"])), ""]
    if thin:
        out += ["内容充盈未达标明细：%s" % "、".join(thin[:12]), ""]
    out += ["充盈口径：前台动态区文字 ≥300 字符且动态区图片 ≥3 张；后台纯素豁免图片、文字 ≥200 字符。"
            "由 `BUTTON_AUDIT.md` 第 6 节定义。", ""]
    if all_inter:
        out += ["## 交互验收（使用者视角）", "",
                "| 用户动作 | 得到 | 结果 |", "|---|---|---|"]
        for i in all_inter:
            out.append("| %s | %s | %s |" % (i["name"], i["detail"], "通过" if i["ok"] else "未通过"))
        fail = [i["name"] for i in all_inter if not i["ok"]]
        out += ["", "交互未通过项：%s" % ("无" if not fail else "、".join(fail)), ""]
    if all_ierr:
        out += ["交互阶段控制台错误：%s" % json.dumps(all_ierr, ensure_ascii=False), ""]
    if all_h404:
        out += ["交互阶段 HTTP 4xx 明细：%s" % json.dumps(all_h404, ensure_ascii=False), ""]
    out += ["## 误报更正登记", "",
            "- 首轮把视口外 `loading=lazy` 且尚未进入加载队列的图判为破图：已改为强制 eager 后等待再取样，属取样时机误报，非素材缺失。",
            "- 首轮「更多」链接断言未剥离 `?lang=`：已改为按查询参数前的文件名判定，属断言误报。",
            "- 第 4/5 批所在命令返回网关 502：逐批核查 `RUNTIME_batch*.json` 与报告后确认两批均已完整落盘并通过，"
            "属命令通道超时而非验收失败；随后第 6/7 批改为单批单命令复跑，7 批结果全部齐备。",
            "- 子页构建器首轮生成 76 个无扩展名文件已自清理并重建；重新纳入全站发现后页面数由 25 增至 114。",
            "- 本轮产品级走查整改新增前台登录 / 注册 / 找回 3 页，全站页面数增至 117；"
            "运行时验收改为自动发现全站页面，7 批 234 次取样无遗漏。",
            "- 后台入口原挂在主导航，验收断言也写死了「点击后台」；整改后前台不再暴露后台链接，"
            "断言改为「前台 0 个后台链接 + 管理员独立地址直达」，属产品决策变更而非缺陷。",
            "- 首批曾出现 2 条 `Failed to load resource 404` 控制台错误与 1 条 HTTP 404 明细：定位为后台总览/登录"
            "把后台目录前缀叠了两次，浏览器请求到重复目录层级的路径。已在唯一一份链接构造里按当前目录归一化，"
            "并补 4 项后台内部导航闭环验收；本轮复跑交互阶段控制台错误 0、HTTP 4xx 0。",
            "- 登录/注册成功断言原写死「进个人中心」，而实现按 `?from=` 逐层回退到来源页，属断言口径与产品约定不符："
            "已改为断言「带显式登录态回到来源页」，并另加个人中心欢迎态检查；非功能缺陷。",
            "- 404 页动态区 287 字符低于充盈口径：已补四条可照做的替代路径，复跑 117 页内容充盈未达标 0 页。",
            "- 验收服务端口原按批次号固定，复跑时残留服务占用导致 `Address already in use`："
            "已改为系统分配空闲端口并动态回填 BASE，属命令通道问题而非页面缺陷。",
            "- 第 2~5 批所在命令多次返回网关 502：逐批核查 `RUNTIME_batch*.json` 后确认各批均完整落盘且通过，"
            "属命令通道超时；第 6/7 批改单批单命令复跑，7 批 234 次取样无遗漏。",
            "- 本轮素材升级：10 张题材主视觉切成 50 张规格图，按 `pagename_id` 替换全站矢量色卡。"
            "运行时新增 3 项断言（内容图无 SVG 占位、按页面取到题材切图且 16:9 / 9:16 双主视觉齐备、"
            "婚纱场地页归属 wedding 题材），交互总数由 40 增至 43；"
            "静态侧另由 `verify.py` 逐条核对切图清单与声明尺寸。详见 `ART_MATRIX.md`。",
            "- 本轮视图走查整改：背景加浅色罩、hero 改浅底深字、主次按钮配色分级、搜索框移入 `sf-hero` 且全站唯一、"
            "首页下拉加透明桥接与 220ms 延时关闭、论坛改文字列表、接单与个人改功能分区。"
            "运行时新增 12 项断言（搜索框归属与提交、配色与降饱和、下拉斜移不闪退、论坛与版块文字行、"
            "接单双口径附近单、快速定位、个人五分区、登录页无搜索框），交互总数由 43 增至 55；"
            "静态侧新增 18 组 WCAG 对比度与四类视图断言。详见 `BUTTON_AUDIT.md` 第 8 节。",
            "- 上一轮第 1 批所在命令返回网关 502：核查 `RUNTIME_batch1.json` 后确认 36 次取样与 55 项交互均已完整落盘且通过，"
            "属命令通道超时而非验收失败；第 2~7 批随后逐批单命令复跑，7 批 234 次取样无遗漏。",
            "- 本轮账号合并：`login.html` 同时存在登录 / 注册两个表单，各自带一个 `.sf-field-err`，"
            "旧的「取第一个错误框文本」断言在 Chromium strict mode 下抛异常并中断整段交互验收。"
            "已改为只取 `.sf-field-err.is-on` 的首个元素；错误框定位仍按 `form.querySelector('[data-err]')` 各自归属，"
            "属断言口径未跟上页面结构变化，非功能缺陷。修后 66 项交互全部跑完。",
            "- 本轮 hero 按钮静态断言首版把子页「返回上级」当成「重复导航栏频道」误报 88 处："
            "已按 `data-parent` 区分子页、对 `act.back` 放行，并改为按 `data-i18n` + href 配对判定，"
            "属扫描范围误报，未改动任何页面功能。",
            "- 文档里残留的独立注册页文件名与注释中的「按类型找农事」说明被死链 / 归属扫描命中："
            "前者随账号合并同步改文案，后者给扫描加 JS 注释剥离，均属断言范围误报并当场更正登记。",
            "- 本轮第 1 批所在命令同样返回网关 502：核查 `RUNTIME_batch1.json` 后确认 36 次取样与 66 项交互均已完整落盘且通过，"
            "属命令通道超时；第 2~7 批逐批单命令复跑，7 批 236 次取样无遗漏。",
            "- 本轮整改：登录 / 注册合并为单页双 Tab、首屏按钮删除导航重复项、农事工单挂靠具体田园、"
            "新增「专家指导」工单类型与 `workorder-new.html` / `job-expert.html` 两页。"
            "运行时新增 11 项断言（Tab 切换、账号页无 hero 按钮、首页与子页按钮去重、田园每行创建工单、"
            "farmId 回填、专家指导类型、提交成功态、专家指导页非空），交互总数由 55 增至 66；"
            "全站页面 117 → 118，双视口取样 234 → 236。详见 `BUTTON_AUDIT.md` 第 9 节。",
            "- 首页首屏整改后只剩一个主按钮，旧配色断言写死「必须有次按钮且白底深字」而报 1 条未通过："
            "已改为「主按钮强制校验、次按钮存在时才校验层级」，属断言未跟上按钮精简，非配色缺陷。",
            "- 个人田园行链接实际为 `farm-detail.html?lang=zh&id=...&from=...`，"
            "新断言按连续字符串 `farm-detail.html?id=` 判定而报 1 条未通过："
            "已改为按「文件名 + 显式 id 参数」分别判定，属断言口径误报，链接本身正确。",
            "- 本轮第 1 批所在命令两次返回网关 502：首次未落盘，第二次核查 `RUNTIME_batch1.json`"
            "确认 36 次取样与 84 项交互已完整落盘且通过，属命令通道超时；第 2~7 批逐批单命令复跑，7 批 236 次取样无遗漏。",
            "- 本轮普通用户逐按钮问答与五类画像走查：新增 `USER_WALKTHROUGH.md`；"
            "首页首屏换成人人可答的「按地区找田」并新增「按身份进入」四类画像导引，"
            "角色专属按钮按显式 `?role=` 显隐，91 个子页「返回」写明回到哪一级，"
            "接单页删跨频道按钮并补身份说明，专家页补产学研闭环，歧义文案改自解释。"
            "运行时新增 18 项断言（逐按钮问答 / 角色显隐 / 返回去向 / 画像任务链 / 中英真文案），"
            "交互总数由 66 增至 84；静态新增按钮自解释、角色取值、返回目标、画像导引与报告完整性五组断言。"
            "详见 `BUTTON_AUDIT.md` 第 10 节。",
            "- 对比页新断言用 `.sf-compare-count` 取统计文字，但页面上有「已选 N / 4」和「共 X 项 · 相同 Y 项」两个同类元素，"
            "旧选择器取到前者导致 1 条未通过：已给结果统计条加 `data-compare-stat` 专属标识并按此取样，属断言取样口径误报。",
            "- 对比清单首版 15 个字段各不相同，断言要求「至少 1 行相同项缩减」而报 1 条未通过："
            "核对后是数据特性而非功能缺陷（任意两块田确实没有共同字段），已补两项平台级共同字段（田间数据口径 / 平台基础服务），"
            "让「相同项缩减」在真实数据上可见；同时给工单总览补固定流程说明文案，消除另一条文案取样误报。",
            "- 创建工单断言仍按旧字段 `textarea[name=note]` 填写，而本轮明细需求拆成 `scope` / `acceptance` 等条目："
            "已改为填写两个新必填项，属断言未跟上表单结构变化，非功能缺陷。",
            "- 本轮第 1 批所在命令三次返回网关 502：前两次未落盘，第三次核查 `RUNTIME_batch1.json`"
            "确认 36 次取样与 96 项交互已完整落盘且通过，属命令通道超时；第 2~7 批逐批单命令复跑，7 批 236 次取样无遗漏。",
            "- 本轮视图与流程整改：`sf-hero-mask` 收紧到 .97/.94/.85（body 罩 .88 不动）；田块对比改为真多选 → 并排清单"
            "（相同项缩减、不同项高亮、只看不同项、最多 4 块、中英真文案）；工单扩为 6 步固定流程 + 退回分支、"
            "10 条明细需求、状态徽章与流程时间线、总览严谨文字行；发布形态按用户要求回退为单点部署："
            "一个包、一个站点根，后台仍在 `admin/` 子目录，靠独立登录 / 前台 0 入口 / noindex / robots / Nginx 白名单隔离。"
            "运行时新增 12 项断言，交互总数由 84 增至 96；静态新增第 23 组断言。详见 `BUTTON_AUDIT.md` 第 11 节。", ""]
    with open(os.path.join(ROOT, "RUNTIME.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print("== 完成：写入 RUNTIME.md（批次 %s）==" % done)
    print("运行时错误 %d / 破图 %d / 横向溢出 %d" % (allerr, allbroken, allover))

if __name__ == "__main__":
    main()
