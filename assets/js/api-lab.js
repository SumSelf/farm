/* 闪马田园 SUMFARM · API 目录页与数据仿真页（只消费 SF_REQUEST，不另写一份目录）
   目录、参数范围、关联表、流程备注都来自 request.js 的 CATALOG；本文件只负责显示与交互。 */
(function (global) {
  'use strict';
  var R = global.SF_REQUEST;
  var host = document.getElementById('sf-lab-catalog') || document.getElementById('sf-lab-sim');
  if (!R || !host) return;
  var MODE = document.getElementById('sf-lab-sim') ? 'lab' : 'catalog';
  var CAT = R.catalog();
  var DOMAINS = [];
  CAT.forEach(function (c) { if (DOMAINS.indexOf(c.domain) < 0) DOMAINS.push(c.domain); });
  var E = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
          (global.location.search || '').indexOf('lang=en') >= 0;
  var S = { page: 1, size: 8, domain: 'all', onlyFail: false, results: {}, running: false, open: {}, demo: [] };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function L(zh, en) { return E ? en : zh; }
  function txt(c) { return E ? c.summaryEn : c.summaryZh; }
  function argLine(c) {
    if (!c.args || !c.args.length) return L('无参数', 'No parameters');
    return c.args.map(function (a) {
      var bits = a.name + ':' + a.type;
      if (a.min !== undefined) bits += '[' + a.min + '..' + a.max + ']';
      if (a.values) bits += '{' + a.values.join('|') + '}';
      if (a.must && a.must.length) bits += '+' + a.must.join(',');
      return bits;
    }).join(' / ');
  }
  function retLine(c) { return c.returns.type + ' · ' + c.returns.range; }
  function filtered() {
    return CAT.filter(function (c) {
      if (S.domain !== 'all' && c.domain !== S.domain) return false;
      if (S.onlyFail) { var r = S.results[c.name]; if (!r || r.ok) return false; }
      return true;
    });
  }
  function pages() { return Math.max(1, Math.ceil(filtered().length / S.size)); }
  function slice() { var p = Math.min(S.page, pages()); return filtered().slice((p - 1) * S.size, p * S.size); }
  function stats() {
    var pass = 0, fail = 0, blocked = 0, tabs = {};
    Object.keys(S.results).forEach(function (k) {
      var r = S.results[k];
      if (r.ok) pass++; else if (r.blocked) blocked++; else fail++;
      (r.tables || []).forEach(function (t) { tabs[t] = 1; });
    });
    return { total: CAT.length, done: pass + fail + blocked, pass: pass, blocked: blocked,
             fail: fail, tables: Object.keys(tabs).length };
  }
  function badge(r) {
    if (!r) return '<span class="sf-lab-badge is-wait">' + esc(L('待运行', 'Pending')) + '</span>';
    if (r.ok) return '<span class="sf-lab-badge is-ok">' + esc(L('通过', 'Pass')) + '</span>';
    if (r.blocked) return '<span class="sf-lab-badge is-block">' + esc(L('参数拦截', 'Blocked')) + '</span>';
    return '<span class="sf-lab-badge is-fail">' + esc(L('失败', 'Failed')) + '</span>';
  }
  function resultBox(c) {
    var r = S.results[c.name];
    if (!r) return '<div class="sf-lab-result is-empty">' + esc(L('尚未运行。点「运行全部接口」后这里会显示返回数据、条数与关联表。',
      'Not run yet. Run all endpoints to see the response, item count and linked tables here.')) + '</div>';
    var body = '<div class="sf-lab-result">' +
      '<div class="sf-lab-result-head">' + badge(r) +
      '<span>code=' + esc(r.code) + '</span><span>' + esc(r.ms) + 'ms</span>' +
      '<span>source=' + esc(r.source || '-') + '</span>' +
      (r.checked !== undefined ? '<span>' + esc(L('校验字段', 'fields checked')) + '=' + esc(r.checked) + '</span>' : '') +
      '</div>';
    if (!r.ok) body += '<p class="sf-lab-err">' + esc(r.message) + '</p>';
    if (r.summary) body += '<p>' + esc(L('返回', 'Response')) + '：' + esc(r.summary.kind) +
      ' · ' + esc(L('条数 / 字段数', 'items / fields')) + '=' + esc(r.summary.count) +
      (r.summary.fields ? ' · ' + esc(r.summary.fields.join(', ')) : '') + '</p>';
    body += '<p class="sf-lab-tables">' + esc(L('关联表', 'Tables')) + '：' +
      esc((r.tables || []).join(' / ')) + '</p>';
    if (S.open[c.name]) body += '<pre class="sf-lab-json">' + esc(r.summary ? r.summary.preview : '') + '</pre>';
    body += '<button class="sf-lab-link" type="button" data-lab="toggle" data-name="' + esc(c.name) + '">' +
      esc(S.open[c.name] ? L('收起返回预览', 'Hide response') : L('展开返回预览', 'Show response')) + '</button>';
    return body + '</div>';
  }
  function row(c, i) {
    var r = S.results[c.name];
    return '<div class="sf-lab-row' + (r && !r.ok ? ' is-bad' : '') + '" data-row="' + esc(c.name) + '">' +
      '<div class="sf-lab-row-head"><span class="sf-lab-idx">#' + esc(i + 1) + '</span>' +
      '<span class="sf-lab-method">' + esc(c.method) + '</span>' +
      '<code class="sf-lab-path">' + esc(c.path) + '</code>' +
      '<strong>' + esc(c.name) + '</strong>' + badge(r) +
      '<span class="sf-lab-domain">' + esc(c.domain) + '</span></div>' +
      '<p class="sf-lab-sum">' + esc(txt(c)) + '</p>' +
      '<div class="sf-lab-meta">' +
      '<div><b>' + esc(L('关联表', 'Tables')) + '</b> ' +
        c.tables.map(function (t) { return '<a class="sf-lab-chip" href="' +
          esc('api-catalog.html?lang=' + (E ? 'en' : 'zh') + '&table=' + encodeURIComponent(t)) +
          '">' + esc(t) + '</a>'; }).join('') + '</div>' +
      '<div><b>' + esc(L('请求参数范围', 'Request range')) + '</b> <code>' + esc(argLine(c)) + '</code></div>' +
      '<div><b>' + esc(L('返回参数范围', 'Return range')) + '</b> <code>' + esc(retLine(c)) + '</code></div>' +
      '<div><b>' + esc(L('流程备注', 'Flow note')) + '</b> ' + esc(c.flowZh) + '</div>' +
      '</div>' + (MODE === 'lab' ? resultBox(c) : '') + '</div>';
  }
  function pager() {
    var p = Math.min(S.page, pages()), n = pages();
    var dots = [];
    for (var i = 1; i <= n; i++) dots.push('<button type="button" class="sf-lab-dot' + (i === p ? ' is-on' : '') +
      '" data-lab="page" data-page="' + i + '" aria-label="' + esc(L('第 ', 'Page ') + i) + '">' + i + '</button>');
    return '<div class="sf-lab-pager">' +
      '<button class="sf-btn" type="button" data-lab="prev"' + (p <= 1 ? ' disabled' : '') + '>← ' + esc(L('上一页', 'Prev')) + '</button>' +
      '<span class="sf-lab-dots">' + dots.join('') + '</span>' +
      '<button class="sf-btn" type="button" data-lab="next"' + (p >= n ? ' disabled' : '') + '>' + esc(L('下一页', 'Next')) + ' →</button>' +
      '<span class="sf-lab-pageinfo">' + esc(L('第 ', 'Page ') + p + L(' / ', ' of ') + n) + '</span></div>';
  }
  function summaryCard() {
    var s = stats();
    return '<div class="sf-lab-stats">' +
      '<div><b>' + s.total + '</b><span>' + esc(L('接口总数', 'Endpoints')) + '</span></div>' +
      '<div><b>' + s.pass + '</b><span>' + esc(L('仿真通过', 'Simulated OK')) + '</span></div>' +
      '<div><b>' + (s.blocked + s.fail) + '</b><span>' + esc(L('拦截 / 失败', 'Blocked / failed')) + '</span></div>' +
      '<div><b>' + s.tables + '</b><span>' + esc(L('覆盖数据库表', 'Tables covered')) + '</span></div>' +
      '<div><b>' + DOMAINS.length + '</b><span>' + esc(L('业务域', 'Domains')) + '</span></div>' +
      '</div>';
  }
  function emptyBlock() {
    return '<div class="sf-lab-empty">' +
      '<img src="assets/img/art/sub_plain_card.webp" alt="' + esc(L('空结果插画', 'Empty result illustration')) + '">' +
      '<h3>' + esc(L('这个筛选下还没有结果', 'Nothing under this filter yet')) + '</h3>' +
      '<p>' + esc(L('切回「全部域」或关掉「只看失败」，就能重新看到接口清单。',
        'Switch back to all domains or turn off failures-only to see the catalogue again.')) + '</p>' +
      '<button class="sf-btn is-primary" type="button" data-lab="reset">' + esc(L('重置筛选', 'Reset filters')) + '</button></div>';
  }
  function render() {
    var list = slice(), p = Math.min(S.page, pages());
    var h = '<section class="sf-section sf-lab"><div class="sf-panel">' +
      '<h2>' + esc(MODE === 'lab' ? L('接口数据仿真工作台', 'API simulation workbench') :
                                   L('统一接口目录', 'Unified API catalogue')) + '</h2>' +
      '<p class="sf-lab-lead">' + esc(MODE === 'lab' ?
        L('目录来自 request.js 的唯一一份 CATALOG；每条先过参数范围校验，再由模拟数据返回，反馈全部显示在本页。',
          'The catalogue is the single CATALOG in request.js. Each call is range-checked, answered from mock data and reported here.') :
        L('74 条接口按业务域分组；请求参数、返回参数、关联数据库表与流程备注逐条列出。',
          '74 endpoints grouped by domain, each with request ranges, return ranges, linked tables and a flow note.')) + '</p>' +
      summaryCard();
    if (MODE === 'lab') {
      h += '<div class="sf-lab-actions">' +
        '<button class="sf-btn is-primary" type="button" data-lab="runall"' + (S.running ? ' disabled' : '') + '>' +
        esc(S.running ? L('正在运行…', 'Running…') : L('运行全部接口', 'Run all endpoints')) + '</button>' +
        '<button class="sf-btn" type="button" data-lab="demo">' + esc(L('范围校验演示', 'Range-check demo')) + '</button>' +
        '<button class="sf-btn" type="button" data-lab="onlyfail">' +
        esc(S.onlyFail ? L('显示全部', 'Show all') : L('只看失败', 'Failures only')) + '</button>' +
        '<button class="sf-btn" type="button" data-lab="clear">' + esc(L('清空结果', 'Clear results')) + '</button>' +
        '<span class="sf-lab-progress" data-lab-progress>' + esc(L('已运行 ', 'Done ') + stats().done + ' / ' + CAT.length) + '</span></div>';
      if (S.demo.length) {
        h += '<div class="sf-lab-demo"><h3>' + esc(L('参数范围校验演示', 'Parameter range-check demo')) + '</h3><ul>' +
          S.demo.map(function (d) { return '<li>' + badge(d) + ' <code>' + esc(d.name) + '</code> · code=' +
            esc(d.code) + ' · ' + esc(d.message) + '</li>'; }).join('') + '</ul></div>';
      }
    }
    h += '<div class="sf-lab-filters"><span>' + esc(L('按域筛选', 'Filter by domain')) + '：</span>' +
      '<button class="sf-lab-chip' + (S.domain === 'all' ? ' is-on' : '') + '" data-lab="domain" data-domain="all">' +
      esc(L('全部', 'All')) + '</button>' +
      DOMAINS.map(function (d) { return '<button class="sf-lab-chip' + (S.domain === d ? ' is-on' : '') +
        '" data-lab="domain" data-domain="' + esc(d) + '">' + esc(d) + '</button>'; }).join('') + '</div>';
    h += pager();
    h += '<div class="sf-lab-list">' + (list.length ? list.map(function (c, i) {
      return row(c, (p - 1) * S.size + i);
    }).join('') : emptyBlock()) + '</div>';
    h += pager() + '</div></section>';
    host.innerHTML = h;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function runAll() {
    if (S.running) return;
    S.running = true; S.results = {}; S.demo = []; render();
    var i = 0;
    function step() {
      if (i >= CAT.length) { S.running = false; render(); return; }
      var batch = CAT.slice(i, i + 6);
      Promise.all(batch.map(function (c) { return R.simulate(c.name, R.sampleArgs(c.name)); }))
        .then(function (rs) {
          rs.forEach(function (r, k) { S.results[batch[k].name] = r; });
          i += batch.length; render();
          return sleep(0);
        }).then(step);
    }
    step();
  }
  function demo() {
    var cases = [
      ['listFarms', [{ page: 0, pageSize: 8 }]],
      ['expertStats', [{ dim: 'unknown-dimension' }]],
      ['withdrawFunds', [{ amountCents: -5, bank: 'x' }]]
    ];
    Promise.all(cases.map(function (x) { return R.simulate(x[0], x[1]); })).then(function (rs) {
      S.demo = rs; S.onlyFail = false; render();
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-lab]') : null;
    if (!el) return;
    var a = el.getAttribute('data-lab');
    if (a === 'page') { S.page = parseInt(el.getAttribute('data-page'), 10) || 1; render(); }
    else if (a === 'prev') { S.page = Math.max(1, S.page - 1); render(); }
    else if (a === 'next') { S.page = Math.min(pages(), S.page + 1); render(); }
    else if (a === 'domain') { S.domain = el.getAttribute('data-domain'); S.page = 1; render(); }
    else if (a === 'onlyfail') { S.onlyFail = !S.onlyFail; S.page = 1; render(); }
    else if (a === 'reset') { S.domain = 'all'; S.onlyFail = false; S.page = 1; render(); }
    else if (a === 'clear') { S.results = {}; S.demo = []; render(); }
    else if (a === 'runall') { runAll(); }
    else if (a === 'demo') { demo(); }
    else if (a === 'toggle') {
      var n = el.getAttribute('data-name'); S.open[n] = !S.open[n]; render();
    }
  });
  /* 键盘左右翻页（边界正确：首页不再退、末页不再进） */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' && S.page > 1) { S.page--; render(); }
    if (e.key === 'ArrowRight' && S.page < pages()) { S.page++; render(); }
  });
  render();
  global.SF_LAB = { state: S, runAll: runAll, demo: demo, render: render, stats: stats };
})(window);
