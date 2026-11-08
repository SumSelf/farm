/* 闪马田园 SUMFARM · 前端应用 v1.6.0
   一份页面分派、一份事件委托、一份返回链、一份类型判定；动态重建元素靠委托天然重绑。
   所有数量文案由接口返回的 total / pages 动态计算，禁止写死。 */
(function (global) {
  'use strict';
  var T = global.SF_I18N, NAV = global.SF_NAV, M = global.SF_MOCK, API = global.SF_API;
  var t = function (k) { return T.t(k); };
  var lang = T.current();
  var state = { page: 1, q: '', filter: '', tab: '', scope: '', loaded: 8 };
  var U = new URL(location.href);

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function zh(x, a, b) { return lang === 'en' ? (x[b] || x[a]) : (x[a] || x[b]); }
  function pic(src, alt) { return '<img loading="lazy" src="' + esc(src) + '" alt="' + esc(alt || '') + '">'; }
  function host() { return document.getElementById('sf-dynamic'); }
  /* 每页兜底内容块：逐页不同的真文案 + 3 个正文图片位；后台保持纯素只给文字 */
  function universalTail() {
    var isAdm = document.body.classList.contains('adm-body');
    var pg = document.body.getAttribute('data-page') || 'index';
    var ds = document.body.getAttribute('data-ds') || 'farms';
    var tpl = document.body.getAttribute('data-tpl') || 'list';
    var tip = boostTip(tpl);
    var label = dsLabel(ds);
    var n = M.all(ds).length;
    var a = lang === 'en'
      ? 'SUMFARM keeps ' + label + ' on one public platform. This is the ' + pg +
        ' view; every figure below comes from live records rather than a printed number.'
      : '闪马田园把' + label + '放在同一个公共平台上。当前是 ' + pg +
        ' 视图，页面里的数量都从数据集实时计算，不是印死的固定值。';
    var b = lang === 'en'
      ? 'If a reading looks off, open the linked plot record, check seasonal data and photo receipts, then post a request. Managers and research teams reply with a timestamp attached.'
      : '发现读数对不上时，先顺着关联的田园档案核四季记录与回执照片，再发起需求或工单；管理方与产学研团队的答复都带时间，不会只留一句结论。';
    var notes = '<div class="sf-panel sf-boost-notes"><p>' + esc(a) + '</p><p>' + esc(b) + '</p>' +
      '<p class="sf-mute-line">' + esc(tip) + '</p></div>';
    if (isAdm) {
      return '<div class="sf-section">' + sectionHead(t('common.notes'), '', '', n) + notes + '</div>';
    }
    return '<div class="sf-section">' + sectionHead(t('common.tip'), t('common.related'), '', n) +
      '<div class="sf-boost-grid">' + notes +
      '<div class="sf-panel sf-boost-art">' + pic(artFor(dsCat(ds), 'boost-a-' + pg, 'wide'), label + ' 实景') +
      pic(artFor(dsCat(ds), 'boost-b-' + pg, 'card'), label + ' 田块') +
      pic(artFor(dsCat(ds), 'boost-c-' + pg, 'mini'), label + ' 记录') +
      '</div></div></div>';
  }
  /* 页面级取图唯一入口：pagename_id = data-page + 内容子类 + 记录 id。
     题材与规格由 mock-data.js 的 art() 统一解析，公共关系不在此重复实现。 */
  function pgKey() { return document.body.getAttribute('data-page') || 'index'; }
  function artFor(cat, seed, slot) { return M.art(pgKey(), cat, seed, slot); }
  function put(html) { var h = host(); if (h) h.innerHTML = html + universalTail(); }
  function param(k, d) { return U.searchParams.get(k) || d || ''; }
  function count(n) { return M.count(n); }
  function toast(msg) {
    var el = document.getElementById('sf-toast');
    if (!el) { el = document.createElement('div'); el.id = 'sf-toast'; el.className = 'sf-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('is-on');
    clearTimeout(el._tm); el._tm = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }
  function link(file, extra) {
    /* 全站链接构造只写一份：显式透传 lang 与登录态，不依赖 referrer / 会话存储 */
    if (global.SF_AUTH) return global.SF_AUTH.decorate(file, extra);
    var s = '?lang=' + lang;
    if (extra) Object.keys(extra).forEach(function (k) { s += '&' + k + '=' + encodeURIComponent(extra[k]); });
    return file + s;
  }
  function detailLink(file, id, from) { return link(file, { id: id, from: from || hereFile() }); }
  function hereFile() { return location.pathname.split('/').pop() || 'index.html'; }
  function svgIcon(name) {
    var p = {
      heart: '<path d="M12 21s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 11c0 5.3-8 10-8 10z"/>',
      star: '<path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1z"/>',
      share: '<path d="M14 9V4l7 8-7 8v-5C8 15 4 18 2 21c0-7 4-12 12-12z"/>',
      chat: '<path d="M3 3h18v13H8l-5 5z"/>'
    };
    return '<svg class="sf-icon-svg" viewBox="0 0 24 24" aria-hidden="true">' + (p[name] || p.heart) + '</svg>';
  }

  /* ---------- 通用卡片 ---------- */
  function card(o) {
    return '<article class="sf-card">' +
      '<a class="sf-card-media" href="' + esc(o.href) + '">' + pic(o.cover, o.title) + '</a>' +
      '<div class="sf-card-body">' +
        '<h3 class="sf-card-title"><a href="' + esc(o.href) + '">' + esc(o.title) + '</a></h3>' +
        '<div class="sf-card-meta">' + esc(o.meta || '') + '</div>' +
        (o.tags || []).map(function (x, i) { return '<span class="sf-tag' + (i === 2 ? ' is-cute' : '') + '">' + esc(x) + '</span>'; }).join('') +
        '<div class="sf-card-foot">' +
          (o.price ? '<span class="sf-price">¥' + esc(o.price) + '</span>' : '') +
          '<button class="sf-icon-btn" data-act="like" data-id="' + esc(o.id) + '" type="button">' + svgIcon('heart') + ' ' + t('common.like') + '</button>' +
          '<button class="sf-icon-btn" data-act="collect" data-id="' + esc(o.id) + '" type="button">' + svgIcon('star') + ' ' + t('common.collect') + '</button>' +
          '<button class="sf-icon-btn" data-act="follow" data-id="' + esc(o.id) + '" type="button">' + t('common.follow') + '</button>' +
          '<button class="sf-icon-btn" data-act="share" type="button" aria-label="' + esc(t('common.share')) + '">' + svgIcon('share') + '</button>' +
          '<a class="sf-icon-btn" href="' + esc(o.href) + '">' + t('common.viewDetail') + '</a>' +
        '</div>' +
      '</div></article>';
  }
  function sectionHead(title, sub, moreFile, total) {
    return '<div class="sf-section-head"><div><p class="sf-eyebrow">SUMFARM</p><h2>' + esc(title) + '</h2>' +
      '<div class="sf-sub">' + esc(sub || '') + '</div></div><span class="sf-spacer"></span>' +
      (total !== undefined ? '<span class="sf-count">' + esc(total) + ' ' + t('common.result') + '</span>' : '') +
      (moreFile ? '<a class="sf-btn" data-act="more" href="' + esc(link(moreFile)) + '">' + t('common.more') + '</a>' : '') +
      '</div>';
  }
  function emptyBlock(ctaFile) {
    return '<div class="sf-panel sf-empty">' + pic(M.IMG.empty, 'empty') +
      '<h3>' + t('common.empty.title') + '</h3><p>' + t('common.empty.desc') + '</p>' +
      '<a class="sf-btn is-primary" href="' + esc(link(ctaFile || 'farms.html')) + '">' + t('common.empty.cta') + '</a></div>';
  }
  /* 翻页：箭头 + 页码 + 指示点，三类同时存在；页码数 = 真实数据页数 */
  function pager(pg, id) {
    if (!pg || pg.pages <= 0) return '';
    var nums = '', dots = '', i;
    var start = Math.max(1, Math.min(pg.page - 2, pg.pages - 4));
    var end = Math.min(pg.pages, start + 4);
    for (i = start; i <= end; i++) {
      nums += '<button class="sf-page-num' + (i === pg.page ? ' is-current' : '') + '" data-act="page" data-p="' + i + '" data-block="' + esc(id) + '" type="button">' + i + '</button>';
    }
    for (i = 1; i <= pg.pages; i++) {
      dots += '<button class="sf-dot' + (i === pg.page ? ' is-on' : '') + '" data-act="dot" data-p="' + i + '" data-block="' + esc(id) + '" aria-label="page ' + i + '" type="button"></button>';
    }
    return '<div class="sf-pager" data-pager="' + esc(id) + '">' +
      '<button class="sf-btn" data-act="prev" data-block="' + esc(id) + '"' + (pg.page <= 1 ? ' disabled' : '') + ' type="button">← ' + t('common.prev') + '</button>' +
      nums +
      '<button class="sf-btn" data-act="next" data-block="' + esc(id) + '"' + (pg.page >= pg.pages ? ' disabled' : '') + ' type="button">' + t('common.next') + ' →</button>' +
      '<span class="sf-dots">' + dots + '</span>' +
      '<span class="sf-pager-note">' + t('common.page') + ' ' + pg.page + ' ' + t('common.of') + ' ' + pg.pages + ' · ' + pg.total + ' ' + t('common.result') + '</span>' +
      '</div>';
  }
  function grid(items) { return '<div class="sf-grid">' + items.join('') + '</div>'; }
  /* 文字列表：论坛、评论、接单、个人等以文字为主的频道，不铺图片卡片 */
  function textRow(o) {
    return '<div class="sf-textrow">' +
      (o.board ? '<span class="sf-textrow-board">' + esc(o.board) + '</span>' : '') +
      '<div class="sf-textrow-main"><a href="' + esc(o.href) + '">' + esc(o.title) + '</a>' +
      (o.summary ? '<div class="sf-textrow-sum">' + esc(o.summary) + '</div>' : '') + '</div>' +
      (o.meta ? '<span class="sf-textrow-meta">' + esc(o.meta) + '</span>' : '') +
      (o.action || '') + '</div>';
  }
  function textList(items) { return '<div class="sf-textlist">' + items.join('') + '</div>'; }
  /* 功能分区：接单 / 个人按业务划分成独立管理区，每区文字行 + 明确的操作入口 */
  function zoneLine(o) {
    return '<div class="sf-zone-line">' +
      '<span class="sf-zone-title">' + (o.href ? '<a href="' + esc(o.href) + '">' + esc(o.title) + '</a>' : esc(o.title)) + '</span>' +
      (o.meta ? '<span class="sf-zone-meta">' + esc(o.meta) + '</span>' : '') +
      (o.tag ? '<span class="sf-tag">' + esc(o.tag) + '</span>' : '') +
      (o.btn || '') + '</div>';
  }
  function zoneBtn(label, file, extra) {
    return '<a class="sf-btn is-sm" href="' + esc(link(file, extra)) + '">' + esc(label) + '</a>';
  }
  function zone(o) {
    return '<section class="sf-zone" id="' + esc(o.id) + '">' +
      '<div class="sf-zone-head"><h3>' + esc(o.title) + '</h3>' +
      '<span class="sf-zone-desc">' + esc(o.desc || '') + '</span><span class="sf-spacer"></span>' +
      (o.total !== undefined ? '<span class="sf-count">' + esc(o.total) + ' ' + esc(t('common.result')) + '</span>' : '') +
      (o.headBtn || '') + '</div>' +
      '<div class="sf-zone-body">' +
      (o.lines.length ? o.lines.join('') : '<div class="sf-zone-empty">' + esc(o.empty || '') + '</div>') +
      '</div>' +
      (o.foot ? '<div class="sf-zone-foot">' + o.foot + '</div>' : '') + '</section>';
  }
  function genTextRow(x, ds, self) {
    var title = genTitle(x, ds);
    var file = ds === 'topics' ? 'forum-topic.html' : (ds === 'comments' ? 'farm-comments.html' : self);
    return textRow({ board: x.board || x.status || x.type || x.kind || '',
      title: title, href: detailLink(file, x.id, self),
      summary: (zh(x, 'bodyZh', 'bodyEn') || zh(x, 'descZh', 'descEn') || genMeta(x, ds) || '').slice(0, 96),
      meta: (x.publishedAt || x.createdAt || x.at || x.date || '') + ' · ' + x.id,
      action: '<span class="sf-textrow-act"><a class="sf-btn is-sm" href="' +
        esc(detailLink(file, x.id, self)) + '">' + t('common.viewDetail') + '</a></span>' });
  }
  function faq() {
    var qs = ['faq.q1', 'faq.q2', 'faq.q3', 'faq.q4'];
    return '<div class="sf-section"><div class="sf-panel">' + qs.map(function (q) {
      return '<div class="sf-faq"><button data-act="faq" type="button">' + t(q) + ' <span>＋</span></button>' +
        '<div class="sf-faq-body">' + t(q.replace('.q', '.a')) + '</div></div>';
    }).join('') + '</div></div>';
  }
  function filters(items, block) {
    return '<div class="sf-filters">' + items.map(function (x, i) {
      return '<button class="sf-chip' + ((state.filter || items[0].v) === x.v && i === 0 || state.filter === x.v ? ' is-on' : '') +
        '" data-act="filter" data-v="' + esc(x.v) + '" data-block="' + esc(block) + '" type="button">' + esc(x.k) + '</button>';
    }).join('') + '</div>';
  }
  /* 搜索框已移入 sf-hero 的静态模板（主页面与 89 个子页统一一份）。
     动态区不再另生成搜索表单，避免 hero 下面又贴一个；此函数保留作兼容层。 */
  function searchBar(ph) { return ''; }
  function syncHeroSearch() {
    var f = document.querySelector('.sf-hero-search[data-form="search"]');
    if (!f) return;
    var input = f.querySelector('input[name="q"]');
    var btn = f.querySelector('button[type="submit"]');
    if (input) { input.value = state.q || ''; input.placeholder = t('common.search.ph'); }
    if (btn) btn.textContent = t('common.search');
  }
  function table(heads, rows) {
    return '<div class="sf-table-wrap"><table class="sf-table"><thead><tr>' +
      heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }

  /* ---------- 列表渲染（统一供频道复用） ---------- */
  var BLOCKS = {};
  function listBlock(cfg) {
    BLOCKS[cfg.id] = cfg;
    return API[cfg.api](cfg.params()).then(function (pg) {
      var items = pg.items.map(cfg.toCard);
      var layout = cfg.layout === 'text' ? textList : grid;
      var html = '<div id="block-' + cfg.id + '">' +
        (items.length ? layout(items) : emptyBlock(cfg.emptyCta)) +
        pager(pg, cfg.id) +
        (items.length && cfg.loadMore ? '<div style="margin-top:12px"><button class="sf-btn" data-act="loadMore" data-block="' + cfg.id + '" type="button">' + t('common.loadMore') + '</button></div>' : '') +
        '</div>';
      var el = document.getElementById('mount-' + cfg.id);
      if (el) el.innerHTML = html;
      state.lastPager = pg;
    });
  }
  function rerender(id) { return listBlock(BLOCKS[id]); }

  /* ---------- 各页面 ---------- */
  function pageIndex() {
    var totalFarms = count('farms'), plots = totalFarms * 3;
    var stats = '<div class="sf-stats">' +
      '<div class="sf-stat"><b>' + totalFarms + '</b><span>' + t('home.stat.farms') + '</span></div>' +
      '<div class="sf-stat"><b>' + plots + '</b><span>' + t('home.stat.plots') + '</span></div>' +
      '<div class="sf-stat"><b>' + count('orders') + '</b><span>' + t('home.stat.orders') + '</span></div>' +
      '<div class="sf-stat"><b>' + count('experts') + '</b><span>' + t('home.stat.experts') + '</span></div></div>';
    var groups = [
      { id: 'videos', title: t('home.videos'), more: 'videos.html', api: 'listVideos', file: 'videos.html', kind: 'video' },
      { id: 'activity', title: t('home.activity'), more: 'activity.html', api: 'listActivities', file: 'activity-detail.html', kind: 'venue' },
      { id: 'produce', title: t('home.produce'), more: 'produce.html', api: 'listProduces', file: 'produce-detail.html', kind: 'produce' },
      { id: 'promo', title: t('home.promo'), more: 'promo.html', api: 'listPromos', file: 'promo.html', kind: 'promo' }
    ];
    var jobs = groups.map(function (g) {
      return API[g.api]({ page: 1, pageSize: 4 }).then(function (pg) {
        var cards = pg.items.map(function (x) {
          return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn') || zh(x, 'nameZh', 'nameEn'),
            cover: x.cover, meta: (x.publishedAt || x.date || x.season || '') + ' · ' + (x.tag || x.kind || x.channel || x.category || ''),
            tags: (x.tags || [x.kind || x.category]).slice(0, 3), price: x.price || x.views,
            href: link(g.file, { id: x.id, from: 'index.html' }) });
        });
        return '<div class="sf-section">' + sectionHead(g.title, '', g.more, pg.total) + grid(cards) + '</div>';
      });
    });
    /* 按身份进入：普通用户进站先答得出「我是谁、我该点哪」，四类画像各有起点。
       管理员入口按基线不在前台暴露，故此处不列。 */
    var guideRows = [
      { board: lang === 'en' ? 'Cooperative' : '商家 / 村集体',
        title: lang === 'en' ? 'List and manage farmland' : '把田园放上平台',
        sum: lang === 'en' ? 'Publish plot number, soil, four-season readings and services; manage listings after review.'
          : '发布田块编号、土壤、四季温湿度与配套服务，审核通过后对外展示。',
        href: 'farms.html',
        links: [[lang === 'en' ? 'Publish a plot' : '发布田园信息', 'farm-edit.html'],
                [lang === 'en' ? 'Manage listings' : '田园信息管理', 'farm-manage.html']] },
      { board: lang === 'en' ? 'Member' : '租赁用户',
        title: lang === 'en' ? 'Find a plot and follow it remotely' : '找一畦田，远程看着它长大',
        sum: lang === 'en' ? 'Browse registered farms, lease a plot, then create field jobs for that plot from your account.'
          : '浏览田园档案、承包田块，之后在个人中心给自己的田派工单、看回执。',
        href: 'farms.html',
        links: [[lang === 'en' ? 'Find plots by region' : '按地区找田', 'farms-region.html'],
                [lang === 'en' ? 'My plots' : '我的田园', 'account.html']] },
      { board: lang === 'en' ? 'Grower' : '接单农户',
        title: lang === 'en' ? 'Take field jobs nearby' : '接附近的田间活',
        sum: lang === 'en' ? 'Nearby requests, jobs linked to your plots, photo receipts and settlement, all in the job hall.'
          : '附近工单、关联田园的活、作业回执与结算，都在接单大厅按区分好。',
        href: 'dispatch.html',
        links: [[lang === 'en' ? 'Nearby jobs' : '附近工单', 'dispatch-nearby.html'],
                [lang === 'en' ? 'Jobs I took' : '已接工单', 'dispatch-taken.html']] },
      { board: lang === 'en' ? 'Research' : '产学研团队',
        title: lang === 'en' ? 'Share agronomy and run trials' : '做技术指导与种植实践',
        sum: lang === 'en' ? 'Answer technical questions, take expert guidance jobs and keep field trial records.'
          : '回答技术咨询、认领专家指导工单、记录种植实践与试验结论。',
        href: 'experts.html',
        links: [[lang === 'en' ? 'Expert guidance jobs' : '专家指导工单', 'job-expert.html'],
                [lang === 'en' ? 'Field trial records' : '种植实践记录', 'expert-trials.html']] }
    ];
    var guide = '<div class="sf-section">' + sectionHead(t('role.guide.title'), t('role.guide.desc')) +
      textList(guideRows.map(function (r) {
        return textRow({ board: r.board, title: r.title, href: link(r.href, { from: 'index.html' }),
          summary: r.sum,
          action: '<span class="sf-textrow-act">' + r.links.map(function (L) {
            return zoneBtn(L[0], L[1], { from: 'index.html' });
          }).join('') + '</span>' });
      })) + '</div>';
    Promise.all(jobs).then(function (blocks) {
      var notices = M.all('notices').slice(0, 4).map(function (n) {
        return '<li><b>' + esc(zh(n, 'titleZh', 'titleEn')) + '</b> · ' + esc(n.at) +
          '<div style="color:var(--sf-mute);font-size:12px">' + esc(zh(n, 'bodyZh', 'bodyEn')) + '</div></li>';
      }).join('');
      var featured = M.all('farms').slice(0, 4).map(function (f) {
        return card({ id: f.id, title: zh(f, 'nameZh', 'nameEn'), cover: f.cover,
          meta: f.region + ' · ' + f.plotNo + ' · ' + f.soil.split(' / ')[0],
          tags: [f.leaseType, f.currentCrops[0], f.facilities[0]], price: f.price,
          href: detailLink('farm-detail.html', f.id) });
      });
      put(stats + guide + '<div class="sf-section">' + sectionHead(t('home.notices'), '', '', count('notices')) +
        '<div class="sf-badge-cute" style="margin-bottom:10px">' + pic(M.IMG.cute, 'SUMFARM') +
        count('notices') + ' ' + t('common.result') + '</div>' +
        '<div class="sf-panel"><ul class="sf-timeline">' + notices + '</ul></div></div>' +
        blocks.join('') +
        '<div class="sf-section">' + sectionHead(t('home.recommend'), '', 'farms.html', totalFarms) + grid(featured) + '</div>' +
        '<div class="sf-section">' + sectionHead(t('faq.head'), t('faq.lead')) + faq() + '</div>');
    });
  }
  function pageFarms() {
    var regions = M.all('farms').map(function (f) { return f.region.split('·')[1] || f.region; });
    var uniq = regions.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 5);
    put(searchBar() +
      '<div class="sf-section">' + sectionHead(t('farms.title'), t('farms.desc'), '', count('farms')) +
      '<div style="margin-bottom:14px"><a class="sf-btn is-primary" href="' + esc(link('farm-edit.html', { from: 'farms.html' })) + '">' + t('farms.upload') + '</a></div>' +
      filters([{ k: t('common.all'), v: '' }].concat(uniq.map(function (r) { return { k: r, v: r }; })), 'farms') +
      '<div id="mount-farms"></div></div>');
    listBlock({ id: 'farms', api: 'listFarms', loadMore: true, emptyCta: 'farm-edit.html',
      params: function () { return { page: state.page, pageSize: 8, q: state.q, region: state.filter }; },
      toCard: function (f) { return card({ id: f.id, title: zh(f, 'nameZh', 'nameEn'), cover: f.cover,
        meta: f.region + ' · ' + f.plotNo + ' · ' + f.areaMu + ' 亩', tags: [f.soil.split(' / ')[0], f.leaseType, f.currentCrops[0]],
        price: f.price, href: detailLink('farm-detail.html', f.id) }); } });
  }
  function pageFarmDetail() {
    var id = param('id', 'F001');
    API.getFarm(id).then(function (f) {
      if (!f) { put(emptyBlock('farms.html')); return; }
      var f2 = n2(f.temp4, '°C'), h2 = n2(f.humid4, '%');
      var rows = [
        [t('farm.plotNo'), f.plotNo], [t('farms.region'), f.region], [t('farms.soil'), f.soil],
        [t('farm.area'), f.areaMu + ' 亩'], [t('farms.lease'), f.leaseType],
        [t('farm.leaseTime'), f.leaseStart + ' → ' + f.leaseEnd],
        [t('farm.temp'), f2], [t('farm.humid'), h2],
        [t('farm.past'), f.pastCrops.join(' / ')], [t('farm.current'), f.currentCrops.join(' / ')],
        [t('farm.harvest'), f.harvest.join(' / ')], [t('farm.facilities'), f.facilities.join(' / ')]
      ];
      var cs = M.all('comments').filter(function (c) { return c.targetId === f.id; }).slice(0, 6);
      put('<div class="sf-section">' + sectionHead(zh(f, 'nameZh', 'nameEn'), zh(f, 'descZh', 'descEn')) +
        '<div class="sf-row"><div class="sf-panel">' + pic(f.cover, zh(f, 'nameZh', 'nameEn')) +
        '<div class="sf-card-meta" style="margin-top:10px">' + t('farm.manager') + '：' + esc((M.byId('users', f.ownerId) || {}).nameZh || '—') + ' · ★ ' + f.rating + '</div></div>' +
        '<div class="sf-panel">' + table([t('common.item'), t('common.value')], rows) +
        '<div class="sf-row" style="margin-top:14px"><a class="sf-btn is-primary" href="' + esc(link('orders.html', { from: 'farm-detail.html', farm: f.id })) + '">' + t('common.book') + '</a>' +
        '<button class="sf-btn" data-act="follow" data-id="' + f.id + '" type="button">' + t('common.follow') + '</button>' +
        '<button class="sf-btn" data-act="share" type="button">' + t('common.share') + '</button>' +
        '<button class="sf-btn" data-act="back" data-fallback="farms.html" type="button">' + t('act.back') + '</button></div></div></div>' +
        '<div class="sf-section">' + sectionHead(t('farm.gallery'), '', '', f.gallery.length) +
        '<div class="sf-gallery">' + f.gallery.map(function (g) { return pic(g, 'gallery'); }).join('') + '</div></div>' +
        '<div class="sf-section">' + sectionHead(t('farm.comments'), '', '', cs.length) +
        '<div class="sf-panel"><ul class="sf-timeline">' + (cs.length ? cs.map(function (c) {
          return '<li><b>' + esc((M.byId('users', c.userId) || {}).nameZh || '田友') + '</b> · ' + esc(c.createdAt) + ' · ★' + c.rating +
            '<div style="color:var(--sf-mute)">' + esc(zh(c, 'bodyZh', 'bodyEn')) + '</div></li>';
        }).join('') : '<li>' + t('common.empty.desc') + '</li>') + '</ul></div></div>' + faq() + '</div>');
    });
  }
  function n2(a, unit) {
    return ['春', '夏', '秋', '冬'].map(function (s, i) { return s + ' ' + a[i] + unit; }).join(' · ');
  }

  /* 通用「列表 + 详情」页面工厂，避免重复实现 */
  function simpleList(cfg) {
    put(searchBar() + '<div class="sf-section">' + sectionHead(cfg.title, cfg.desc, cfg.more || '', count(cfg.ds)) +
      filters(cfg.filterItems || [{ k: t('common.all'), v: '' }], cfg.id) +
      '<div id="mount-' + cfg.id + '"></div></div>');
    listBlock({ id: cfg.id, api: cfg.api, loadMore: true, emptyCta: 'index.html',
      params: function () { var p = { page: state.page, pageSize: 8, q: state.q }; if (cfg.filterKey) p[cfg.filterKey] = state.filter; return p; },
      toCard: cfg.toCard });
  }
  function detailPage(cfg) {
    var id = param('id');
    API[cfg.api](id).then(function (x) {
      if (!x) { put(emptyBlock(cfg.back)); return; }
      var f = M.byId('farms', x.farmId) || M.all('farms')[0];
      var cs = M.all('comments').slice(0, 4);
      put('<div class="sf-section">' + sectionHead(zh(x, cfg.titleA, cfg.titleB), zh(x, 'descZh', 'descEn') || zh(f, 'descZh', 'descEn')) +
        '<div class="sf-row"><div class="sf-panel">' + pic(x.cover, zh(x, cfg.titleA, cfg.titleB)) + '</div>' +
        '<div class="sf-panel">' + table([t('common.item'), t('common.value')], cfg.rows(x, f)) +
        '<div class="sf-row" style="margin-top:14px"><a class="sf-btn is-primary" href="' + esc(link('orders.html', { from: hereFile(), ref: x.id })) + '">' + t('common.order') + '</a>' +
        '<button class="sf-btn" data-act="share" type="button">' + t('common.share') + '</button>' +
        '<button class="sf-btn" data-act="back" data-fallback="' + cfg.back + '" type="button">' + t('act.back') + '</button></div></div></div>' +
        '<div class="sf-section">' + sectionHead(t('farm.comments'), '', '', cs.length) +
        '<div class="sf-panel"><ul class="sf-timeline">' + cs.map(function (c) {
          return '<li>' + esc(zh(c, 'bodyZh', 'bodyEn')) + ' · ' + esc(c.createdAt) + '</li>';
        }).join('') + '</ul></div></div></div>');
    });
  }

  function pageForum() {
    var boards = ['热门田园', '种植经验', '活动', '技术咨询'];
    /* 论坛以文字列表为主：版块、标题、摘要、时间与回复数成行，不铺图片卡片 */
    put('<div class="sf-section">' + sectionHead(t('forum.title'), t('forum.desc'), '', count('topics')) +
      '<div style="margin-bottom:14px;display:flex;flex-direction:row;flex-wrap:wrap;gap:8px">' +
      '<a class="sf-btn is-primary" href="' + esc(link('forum-edit.html', { from: 'forum.html' })) + '">' + t('forum.new') + '</a>' +
      '<a class="sf-btn" href="' + esc(link('forum-rules.html', { from: 'forum.html' })) + '">' +
      (lang === 'en' ? 'Board rules' : '版规与发帖说明') + '</a></div>' +
      filters([{ k: t('common.all'), v: '' }].concat(boards.map(function (b) { return { k: b, v: b }; })), 'topics') +
      '<div id="mount-topics"></div></div>');
    listBlock({ id: 'topics', api: 'listTopics', loadMore: true, layout: 'text', emptyCta: 'forum-edit.html',
      params: function () { return { page: state.page, pageSize: 10, q: state.q, board: state.filter }; },
      toCard: function (x) {
        return textRow({ board: x.board, title: zh(x, 'titleZh', 'titleEn'),
          href: detailLink('forum-topic.html', x.id, 'forum.html'),
          summary: zh(x, 'bodyZh', 'bodyEn').slice(0, 96),
          meta: x.publishedAt + ' · ' + x.replies + ' ' + t('forum.replies') + ' · ' + x.likes + ' ' + t('common.like'),
          action: '<span class="sf-textrow-act"><a class="sf-btn is-sm" href="' +
            esc(detailLink('forum-topic.html', x.id, 'forum.html')) + '">' + t('forum.reply') + '</a></span>' });
      } });
  }
  function pageForumTopic() {
    var id = param('id', 'T001');
    API.getTopic(id).then(function (x) {
      if (!x) { put(emptyBlock('forum.html')); return; }
      put('<div class="sf-section">' + sectionHead(zh(x, 'titleZh', 'titleEn'), x.board + ' · ' + x.publishedAt) +
        '<div class="sf-panel"><p style="line-height:1.9;font-size:14px">' + esc(zh(x, 'bodyZh', 'bodyEn')) + '</p>' +
        '<div class="sf-card-foot">' +
        '<button class="sf-icon-btn" data-act="like" data-id="' + x.id + '" type="button">' + svgIcon('heart') + ' ' + x.likes + '</button>' +
        '<button class="sf-icon-btn" data-act="share" type="button">' + t('common.share') + '</button>' +
        '<button class="sf-btn" data-act="back" data-fallback="forum.html" type="button">' + t('act.back') + '</button></div></div>' +
        '<div class="sf-section">' + sectionHead(t('forum.reply'), '', '', (x.replyList || []).length) +
        '<div class="sf-panel"><ul class="sf-timeline">' + (x.replyList || []).map(function (c) {
          return '<li>' + esc(zh(c, 'bodyZh', 'bodyEn')) + ' · ' + esc(c.createdAt) + '</li>';
        }).join('') + '</ul>' +
        '<form data-form="reply" class="sf-field" style="margin-top:14px"><label>' + t('forum.reply') + '</label>' +
        '<textarea class="sf-textarea" name="body" required placeholder="' + esc(t('forum.body')) + '"></textarea>' +
        '<button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button></form></div></div></div>');
    });
  }
  function pageExperts() {
    var practice = '<div class="sf-section">' +
      sectionHead(lang === 'en' ? 'Technical practice and guidance' : '技术实践与指导',
        lang === 'en' ? 'Where research teams take guidance jobs and keep trial records.'
          : '产学研团队在这里认领专家指导工单，并把种植实践与试验结论记下来。') +
      textList([
        textRow({ board: lang === 'en' ? 'Guidance' : '指导',
          title: lang === 'en' ? 'Expert guidance jobs' : '专家指导工单',
          href: link('job-expert.html', { from: 'experts.html' }),
          summary: lang === 'en' ? 'Soil, pest, variety and facility requests, closed with field notes and a conclusion.'
            : '土壤、植保、品种与设施类请求，完成后附现场记录与技术结论。',
          action: '<span class="sf-textrow-act">' + zoneBtn(lang === 'en' ? 'Open list' : '查看工单', 'job-expert.html', { from: 'experts.html' }) + '</span>' }),
        textRow({ board: lang === 'en' ? 'Trials' : '实践',
          title: lang === 'en' ? 'Field trial records' : '种植实践记录',
          href: link('expert-trials.html', { from: 'experts.html' }),
          summary: lang === 'en' ? 'Crop, stage, treatment and outcome for each trial plot.'
            : '按田块记录作物、生育期、处理方式与试验结果，供论坛与积分统计引用。',
          action: '<span class="sf-textrow-act">' + zoneBtn(lang === 'en' ? 'Open records' : '查看记录', 'expert-trials.html', { from: 'experts.html' }) + '</span>' })
      ]) + '</div>';
    put(searchBar() + '<div class="sf-section">' + sectionHead(t('experts.title'), t('experts.desc'), '', count('experts')) +
      '<div id="mount-experts"></div></div>' + practice);
    listBlock({ id: 'experts', api: 'listExperts', loadMore: false, emptyCta: 'experts.html',
      params: function () { return { page: state.page, pageSize: 8, q: state.q }; },
      toCard: function (e) { return card({ id: e.id, title: zh(e, 'nameZh', 'nameEn') + ' · ' + e.title,
        cover: e.avatar, meta: e.org + ' · ' + t('experts.rank') + ' #' + e.rank + ' · ' + e.manageYears + ' 年',
        tags: [e.points + ' ' + t('experts.points'), e.farmCount + ' ' + t('experts.farmCount')], price: '',
        href: detailLink('expert-detail.html', e.id) }); } });
  }
  function pageExpertDetail() {
    var id = param('id', 'E001');
    API.getExpert(id).then(function (e) {
      if (!e) { put(emptyBlock('experts.html')); return; }
      put('<div class="sf-section">' + sectionHead(zh(e, 'nameZh', 'nameEn'), zh(e, 'bioZh', 'bioEn')) +
        '<div class="sf-stats">' +
        '<div class="sf-stat"><b>' + e.points + '</b><span>' + t('experts.points') + '</span></div>' +
        '<div class="sf-stat"><b>#' + e.rank + '</b><span>' + t('experts.rank') + '</span></div>' +
        '<div class="sf-stat"><b>' + e.farmCount + '</b><span>' + t('experts.farmCount') + '</span></div>' +
        '<div class="sf-stat"><b>' + e.processCount + '</b><span>' + t('experts.process') + '</span></div></div>' +
        '<div class="sf-row" style="margin-top:16px"><div class="sf-panel"><h3>' + t('experts.manage') + '</h3><ul class="sf-timeline">' +
        (e.workorders || []).map(function (w) { return '<li>' + esc(w.createdAt) + ' · ' + esc(w.type) + ' · ' + esc(w.status) + ' · ' + esc(w.descZh) + '</li>'; }).join('') +
        '</ul></div><div class="sf-panel"><h3>' + t('experts.process') + '</h3><ul class="sf-timeline">' +
        (e.plantings || []).map(function (p) { return '<li>' + esc(p.recordAt) + ' · ' + esc(p.crop) + ' · ' + esc(p.stage) + ' · ' + esc(p.noteZh) + '</li>'; }).join('') +
        '</ul></div></div>' +
        '<div class="sf-section">' + sectionHead(t('experts.tech'), '', 'forum.html', (e.techTopics || []).length) +
        '<div class="sf-panel"><ul class="sf-timeline">' + (e.techTopics || []).map(function (x) {
          return '<li><a href="' + esc(detailLink('forum-topic.html', x.id)) + '">' + esc(zh(x, 'titleZh', 'titleEn')) + '</a> · ' + esc(x.publishedAt) + '</li>';
        }).join('') + '</ul></div></div>' +
        '<button class="sf-btn" data-act="back" data-fallback="experts.html" type="button">' + t('act.back') + '</button></div>');
    });
  }
  function pageDispatch() {
    var ds = M.all('dispatches'), ws = M.all('workorders');
    var wById = {}; ws.forEach(function (w) { wById[w.id] = w; });
    /* 关联田园：当前账号已产生承包 / 消费关系的田园，按订单里的 farmId 真实关联 */
    var linkedFarmIds = {};
    M.all('orders').forEach(function (o) { if (o.farmId) linkedFarmIds[o.farmId] = 1; });
    var near = ds.slice().sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    var linked = ds.filter(function (d) { var w = wById[d.workorderId]; return w && linkedFarmIds[w.farmId]; });
    var taken = ws.filter(function (w) { return w.assigneeId || w.status === '进行中'; });
    var loc = lang === 'en' ? 'Chongzhou, Daoming (current location)' : '成都·崇州道明镇（当前定位）';
    function dLine(d) {
      var w = wById[d.workorderId] || {};
      var f = M.byId('farms', w.farmId) || {};
      return zoneLine({ title: d.kind + ' · ' + d.region + ' · ' + (f.plotNo || w.farmId || d.workorderId),
        href: detailLink('workorder-detail.html', d.workorderId, 'dispatch.html'),
        meta: d.distanceKm + ' km · ' + d.publishedAt + ' · ' + (zh(f, 'nameZh', 'nameEn') || w.farmId || ''),
        tag: d.status,
        btn: jobBadge(w) + '<a class="sf-btn is-sm" href="' + esc(detailLink('workorder-detail.html', d.workorderId, 'dispatch.html')) + '">' +
          esc(lang === 'en' ? 'Take job' : '查看并接单') + '</a>' });
    }
    var quick = '<div class="sf-filters" id="dispatch-tabs">' +
      [{ k: 'dispatch.nearby', v: 'nearby' }, { k: 'dispatch.linked', v: 'linked' }, { k: 'dispatch.taken', v: 'taken' }]
        .map(function (x) { return '<button class="sf-chip" data-act="tab" data-v="' + x.v + '" type="button">' + t(x.k) + '</button>'; }).join('') +
      '</div>';
    var zones = '<div class="sf-zones">' +
      zone({ id: 'zone-nearby', title: t('dispatch.nearby'),
        desc: (lang === 'en' ? 'Jobs near ' + loc + ', sorted by distance.' : '按 ' + loc + ' 的当前定位，由近到远排列，含田块编号与距离。'),
        total: near.length, lines: near.slice(0, 6).map(dLine),
        empty: lang === 'en' ? 'No nearby jobs at this location.' : '当前定位附近暂时没有待接工单。',
        foot: zoneBtn(lang === 'en' ? 'All nearby jobs' : '按距离查看全部附近单', 'dispatch-nearby.html', { from: 'dispatch.html' }) +
          zoneBtn(lang === 'en' ? 'Plot map' : '在田块分布图上找单', 'farms-map.html', { from: 'dispatch.html' }) }) +
      zone({ id: 'zone-linked', title: t('dispatch.linked'),
        desc: (lang === 'en' ? 'Jobs attached to the plots you lease or have ordered from, not all nearby jobs.' :
          '只显示与你已承包 / 消费过的田园关联的工单，和上面按定位找单是两套口径。'),
        total: linked.length, lines: linked.slice(0, 6).map(dLine),
        empty: lang === 'en' ? 'No jobs linked to your plots yet.' : '关联田园暂时没有待处理的工单。',
        foot: zoneBtn(lang === 'en' ? 'Linked jobs' : '关联田园工单总览', 'dispatch-linked.html', { from: 'dispatch.html' }) }) +
      zone({ id: 'zone-taken', title: t('dispatch.taken'),
        desc: (lang === 'en' ? 'Accepted jobs with photo receipts and settlement status.' : '已接工单、作业回执与验收结算集中在这里跟进。'),
        total: taken.length,
        lines: taken.slice(0, 6).map(function (w) {
          return zoneLine({ title: w.type + ' · ' + w.id + ' · ' + w.farmId,
            href: detailLink('workorder-detail.html', w.id, 'dispatch.html'),
            meta: w.createdAt + ' → ' + w.dueAt + ' · ¥' + w.price, tag: w.status,
            btn: jobBadge(w) + '<a class="sf-btn is-sm" href="' + esc(detailLink('workorder-detail.html', w.id, 'dispatch.html')) + '">' +
              esc(lang === 'en' ? 'Receipt' : '写回执') + '</a>' });
        }),
        empty: lang === 'en' ? 'No accepted jobs yet.' : '还没有接到的工单。',
        foot: zoneBtn(lang === 'en' ? 'All work orders' : '工单总览', 'workorders.html', { from: 'dispatch.html' }) +
          zoneBtn(lang === 'en' ? 'Settlement' : '验收与结算', 'dispatch-settle.html', { from: 'dispatch.html' }) }) +
      '</div>';
    /* 普通用户误入接单大厅时，先说清「这里不是给你派活的」，并给出正确去向 */
    var who = (global.SF_AUTH && global.SF_AUTH.read().role) || '';
    var hint = who === 'grower'
      ? (lang === 'en' ? 'This is the grower workbench: jobs below are open to take; upload a photo receipt when the work is done.'
        : '这里是接单农户的工作台：下面的工单都可以接，做完请上传回执照片，再到验收结算。')
      : (lang === 'en'
        ? 'This is the grower workbench, not the place to request work on your own plot. Leased a plot? Go to My account → My plots to create a job for that plot.'
        : '这里是接单农户的工作台，展示的是别人派给田块的活，不是给自己田派活的地方。租了田的话，请到「个人中心 → 我的田园」为那块田创建工单。');
    var hintHtml = '<p class="sf-role-hint">' + esc(hint) +
      (who === 'grower' ? '' : ' <a href="' + esc(link('account.html', { from: 'dispatch.html' })) + '">' +
        esc(lang === 'en' ? 'Go to my plots' : '去我的田园') + '</a>') + '</p>';
    put('<div class="sf-section">' + sectionHead(t('dispatch.title'), t('dispatch.desc'), '', count('dispatches')) +
      hintHtml + quick + zones + '</div>');
  }
  function pageAccount() {
    var welcome = param('welcome') ? '<div class="sf-welcome">' + pic(M.IMG.cute, 'SUMFARM') +
      '<span>' + t('auth.welcome') + '</span></div>' : '';
    var farms = M.all('farms'), acts = M.all('activities'), orders = M.all('orders'), ws = M.all('workorders');
    var myWo = ws.filter(function (w) { return w.userId === 'U013'; });
    if (myWo.length < 4) myWo = ws.slice(0, 6);
    var quickTabs = [
      { k: 'account.farms', v: 'farms' }, { k: 'account.workorders', v: 'workorders' },
      { k: 'account.activities', v: 'activities' }, { k: 'account.orders', v: 'orders' },
      { k: '', v: 'settings' }
    ];
    var quick = '<div class="sf-filters" id="account-tabs">' + quickTabs.map(function (x) {
      var label = x.k ? t(x.k) : (lang === 'en' ? 'Settings' : '账号设置');
      return '<button class="sf-chip" data-act="account-tab" data-v="' + x.v + '" type="button">' + esc(label) + '</button>';
    }).join('') + '</div>';
    var zFarms = zone({ id: 'zone-farms', title: t('account.farms'),
      desc: lang === 'en' ? 'Plots linked to your lease, with plot number, soil and lease window.' : '已关联的田园、田块编号、承包类型与租期，集中在这里管理。',
      total: farms.length,
      lines: farms.slice(0, 6).map(function (f) {
        return zoneLine({ title: zh(f, 'nameZh', 'nameEn') + ' · ' + f.plotNo,
          href: link('farm-detail.html', { id: f.id, from: 'account.html' }),
          meta: f.region + ' · ' + f.leaseType + ' · ' + f.leaseStart + ' → ' + f.leaseEnd,
          tag: f.soil.split(' / ')[0],
          /* 农事挂靠在对应田园上：每行直接为这一块田创建工单，带 farmId，
             不再是「按类型找农事」那种与田块无关的找活入口。 */
          btn: '<span class="sf-zone-actions">' +
            zoneBtn(lang === 'en' ? 'Create a field job' : '远程创建工单', 'workorder-new.html',
              { farmId: f.id, from: 'account.html' }) +
            zoneBtn(lang === 'en' ? 'View plot record' : '查看田园档案', 'farm-detail.html',
              { id: f.id, from: 'account.html' }) + '</span>' });
      }),
      foot: zoneBtn(lang === 'en' ? 'Create a job for a plot' : '为田园创建工单', 'workorder-new.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Expert guidance jobs' : '专家指导工单', 'job-expert.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Compare plots' : '田块对比', 'farm-compare.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Contract terms' : '承包合同', 'farm-contract.html', { from: 'account.html' }) });
    var zWo = zone({ id: 'zone-workorders', title: t('account.workorders'),
      desc: lang === 'en' ? 'Requests you posted for remote field work, each with a chat thread.' : '我发布的需求与远程管理工单，每条都带聊天对话框可跟进回执。',
      total: myWo.length,
      lines: myWo.slice(0, 6).map(function (w) {
        return zoneLine({ title: w.type + ' · ' + w.id + ' · ' + w.farmId,
          href: link('workorder-detail.html', { id: w.id, from: 'account.html' }),
          meta: w.createdAt + ' → ' + w.dueAt + ' · ¥' + w.price, tag: w.status,
          btn: zoneBtn(lang === 'en' ? 'Open chat' : '打开对话', 'workorder-detail.html', { id: w.id, from: 'account.html' }) });
      }),
      foot: zoneBtn(lang === 'en' ? 'All work orders' : '工单总览', 'workorders.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Create a job for a plot' : '为田园创建工单', 'workorder-new.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Expert guidance jobs' : '专家指导工单', 'job-expert.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Photo receipts' : '作业回执', 'dispatch-receipt.html', { from: 'account.html' }) });
    var zActs = zone({ id: 'zone-activities', title: t('account.activities'),
      desc: lang === 'en' ? 'Events you signed up for, with date, capacity and check-in state.' : '关联的活动与报名，按日期列出名额、签到状态与现场回顾入口。',
      total: acts.length,
      lines: acts.slice(0, 6).map(function (a) {
        return zoneLine({ title: zh(a, 'titleZh', 'titleEn'),
          href: link('activity-detail.html', { id: a.id, from: 'account.html' }),
          meta: a.date + ' · ' + a.kind + ' · ' + a.booked + '/' + a.capacity + ' ' + (lang === 'en' ? 'seats' : '人'),
          tag: a.kind,
          btn: zoneBtn(lang === 'en' ? 'Check in' : '现场签到', 'activity-checkin.html', { id: a.id, from: 'account.html' }) });
      }),
      foot: zoneBtn(lang === 'en' ? 'Event calendar' : '活动日历', 'activity-calendar.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Sign up' : '活动报名', 'activity-signup.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Venue booking' : '场地预约', 'venue-booking.html', { from: 'account.html' }) });
    var zOrders = zone({ id: 'zone-orders', title: t('account.orders'),
      desc: lang === 'en' ? 'Past spending, invoice titles and delivery windows, grouped by order.' : '历史消费按订单列出金额、状态与票据信息，可对账也可补开发票。',
      total: orders.length,
      lines: orders.slice(0, 6).map(function (o) {
        return zoneLine({ title: o.kind + ' · ' + o.id + ' · ' + (o.items || []).join(''),
          href: link('orders.html', { id: o.id, from: 'account.html' }),
          meta: o.createdAt + ' · ¥' + o.amount, tag: o.status,
          btn: zoneBtn(lang === 'en' ? 'Invoice' : '票据', 'account-invoice.html', { from: 'account.html' }) });
      }),
      foot: zoneBtn(lang === 'en' ? 'All orders' : '订单列表', 'orders.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Addresses' : '收货地址', 'account-address.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Delivery tracking' : '配送跟踪', 'produce-delivery.html', { from: 'account.html' }) });
    var settingLinks = [
      ['account-profile.html', lang === 'en' ? 'Profile' : '个人资料'],
      ['account-security.html', lang === 'en' ? 'Security' : '账号安全'],
      ['account-notice.html', lang === 'en' ? 'Notices' : '消息通知'],
      ['account-favorites.html', lang === 'en' ? 'Favorites' : '我的收藏'],
      ['account-following.html', lang === 'en' ? 'Following' : '我的关注'],
      ['account-bind.html', lang === 'en' ? 'Linked accounts' : '账号绑定'],
      ['account-help.html', lang === 'en' ? 'Help' : '帮助与反馈'],
      ['account-close.html', lang === 'en' ? 'Close account' : '注销账号']
    ];
    var zSettings = zone({ id: 'zone-settings',
      title: lang === 'en' ? 'Account & settings' : '账号与资料设置',
      desc: lang === 'en' ? 'Account-level tools, kept apart from field and order data.' : '账号级设置与资料工具，与田园、工单、订单数据分开管理。',
      lines: [settingLinks.slice(0, 4), settingLinks.slice(4, 8)].map(function (group, gi) {
        return zoneLine({ title: gi === 0 ? (lang === 'en' ? 'Profile & security' : '资料与安全')
            : (lang === 'en' ? 'Preferences & help' : '偏好与帮助'),
          meta: group.length + ' ' + (lang === 'en' ? 'tools' : '项功能'),
          btn: '<span class="sf-zone-actions">' + group.map(function (p) {
            return zoneBtn(p[1], p[0], { from: 'account.html' });
          }).join('') + '</span>' });
      }),
      foot: zoneBtn(lang === 'en' ? 'Help centre' : '帮助中心', 'help.html', { from: 'account.html' }) +
        zoneBtn(lang === 'en' ? 'Site map' : '站点地图', 'sitemap.html', { from: 'account.html' }) });
    put(welcome + '<div class="sf-section">' + sectionHead(t('account.title'), t('account.desc')) +
      '<div class="sf-stats">' +
      '<div class="sf-stat"><b>' + count('activities') + '</b><span>' + t('account.activities') + '</span></div>' +
      '<div class="sf-stat"><b>' + count('farms') + '</b><span>' + t('account.farms') + '</span></div>' +
      '<div class="sf-stat"><b>' + count('orders') + '</b><span>' + t('account.orders') + '</span></div>' +
      '<div class="sf-stat"><b>' + count('workorders') + '</b><span>' + t('account.workorders') + '</span></div></div>' +
      '<div style="margin-top:16px">' + quick + '</div>' +
      '<div class="sf-zones">' + zFarms + zWo + zActs + zOrders + zSettings + '</div></div>');
  }
  function pageOrders() {
    simpleList({ id: 'orders', title: t('orders.title'), desc: t('orders.desc'), ds: 'orders', api: 'listOrders',
      more: 'account.html', toCard: function (o) {
        var f = M.byId('farms', o.farmId) || {};
        return card({ id: o.id, title: o.kind + ' · ' + (o.items || []).join(''), cover: artFor('produce', o.id, 'card'),
          meta: o.createdAt + ' · ' + o.status + ' · ' + esc(zh(f, 'nameZh', 'nameEn')), tags: [o.status, o.kind], price: o.amount,
          href: link('account.html', { from: 'orders.html' }) }); } });
  }
  /* ---------- 田块对比：多选 → 并排清单，相同项缩减、不同项高亮 ----------
     字段清单只写这一份；统计数字全部由选中田块与字段实时计算，不写死。 */
  var COMPARE_FIELDS = [
    { k: 'name', key: 'compare.f.name', get: function (f) { return zh(f, 'nameZh', 'nameEn'); } },
    { k: 'plot', key: 'compare.f.plot', get: function (f) { return f.plotNo; } },
    { k: 'region', key: 'compare.f.region', get: function (f) { return f.region; } },
    { k: 'area', key: 'compare.f.area', get: function (f) { return String(f.areaMu); } },
    { k: 'soil', key: 'compare.f.soil', get: function (f) { return f.soil; } },
    { k: 'temp', key: 'compare.f.temp', get: function (f) { return (f.temp4 || []).join(' / '); } },
    { k: 'humid', key: 'compare.f.humid', get: function (f) { return (f.humid4 || []).join(' / '); } },
    { k: 'past', key: 'compare.f.past', get: function (f) { return (f.pastCrops || []).join('、'); } },
    { k: 'current', key: 'compare.f.current', get: function (f) { return (f.currentCrops || []).join('、'); } },
    { k: 'harvest', key: 'compare.f.harvest', get: function (f) { return (f.harvest || []).join('；'); } },
    { k: 'lease', key: 'compare.f.lease', get: function (f) { return f.leaseType; } },
    { k: 'leaseTime', key: 'compare.f.leaseTime', get: function (f) { return f.leaseStart + ' → ' + f.leaseEnd; } },
    { k: 'price', key: 'compare.f.price', get: function (f) { return String(f.price); } },
    { k: 'facilities', key: 'compare.f.facilities', get: function (f) { return (f.facilities || []).join('、'); } },
    { k: 'rating', key: 'compare.f.rating', get: function (f) { return String(f.rating); } },
    /* 平台级共同项：任意两块田都一致，用来真实演示「相同项缩减成一行」 */
    { k: 'source', key: 'compare.f.source', get: function () { return t('compare.v.source'); } },
    { k: 'service', key: 'compare.f.service', get: function () { return t('compare.v.service'); } }
  ];
  function compareRows(picked) {
    var rows = '', sameCount = 0;
    COMPARE_FIELDS.forEach(function (fd) {
      var vals = picked.map(function (f) { return fd.get(f) || '—'; });
      var same = vals.every(function (v) { return v === vals[0]; });
      var label = esc(t(fd.key));
      if (same) {
        sameCount++;
        rows += '<tr class="is-same" data-same="1"><th>' + label + '</th>' +
          '<td colspan="' + picked.length + '"><span class="sf-compare-same-badge">' +
          esc(picked.length + ' ' + t('compare.same')) + '</span>' + esc(vals[0]) + '</td></tr>';
      } else {
        rows += '<tr data-same="0"><th>' + label + '</th>' + vals.map(function (v) {
          return '<td class="' + (v !== vals[0] ? 'is-diff' : '') + '">' + esc(v) + '</td>';
        }).join('') + '</tr>';
      }
    });
    return { html: rows, same: sameCount, diff: COMPARE_FIELDS.length - sameCount };
  }
  function pageFarmCompare() {
    var all = M.all('farms'), byId = {};
    all.forEach(function (f) { byId[f.id] = f; });
    var raw = param('ids', ''), rawIds = raw ? raw.split(',') : [];
    var clean = [], invalid = false;
    rawIds.forEach(function (x) {
      var id = x.trim();
      if (!id) return;
      if (!byId[id]) { invalid = true; return; }
      if (clean.indexOf(id) < 0 && clean.length < 4) clean.push(id);
    });
    var picked = clean.map(function (id) { return byId[id]; });
    var pickedIds = picked.map(function (f) { return f.id; });
    /* 候选区：真正的多选，已选回填；超过 4 块由 change 事件拦下并给可见反馈 */
    var picks = '<div class="sf-compare-picks">' + all.map(function (f) {
      var on = pickedIds.indexOf(f.id) >= 0;
      return '<label class="sf-compare-pick' + (on ? ' is-on' : '') + '">' +
        '<input type="checkbox" data-act="compare-pick" data-v="' + esc(f.id) + '"' + (on ? ' checked' : '') + '>' +
        '<span><b>' + esc(zh(f, 'nameZh', 'nameEn')) + '</b>' +
        '<small>' + esc(f.plotNo + ' · ' + f.region + ' · ' + f.soil.split(' / ')[0]) + '</small></span></label>';
    }).join('') + '</div>';
    var bar = '<div class="sf-compare-bar">' +
      '<span class="sf-compare-count" data-compare-count>' + t('compare.selected') + ' <b>' + picked.length + '</b> / 4</span>' +
      '<button class="sf-btn is-primary" data-act="compare-build" type="button">' + t('compare.start') + '</button>' +
      '<button class="sf-btn" data-act="compare-clear" type="button">' + t('compare.clear') + '</button>' +
      '<span class="sf-compare-limit">' + t('compare.pick.max') + '</span></div>';
    var pickPanel = '<div class="sf-section">' + sectionHead(t('compare.pick'), t('compare.pick.desc'), '', all.length) +
      '<div class="sf-panel">' + picks + bar + '</div></div>';
    var result;
    if (picked.length < 2) {
      result = '<div class="sf-section">' + sectionHead(t('compare.result'), '') +
        '<div class="sf-panel sf-empty">' + pic(M.IMG.empty, 'compare') +
        '<h3>' + esc(t('compare.empty.title')) + '</h3><p>' + esc(t('compare.empty.desc')) + '</p>' +
        '<a class="sf-btn is-primary" href="' + esc(link('farms.html', { from: 'farm-compare.html' })) + '">' +
        esc(t('compare.empty.cta')) + '</a></div>' +
        (invalid ? '<p class="sf-role-hint">' + esc(t('compare.invalid')) + '</p>' : '') + '</div>';
    } else {
      var r = compareRows(picked);
      var heads = '<tr><th>' + esc(t('compare.f.name')) + '</th>' + picked.map(function (f) {
        return '<th><a href="' + esc(link('farm-detail.html', { id: f.id, from: 'farm-compare.html' })) + '">' +
          esc(zh(f, 'nameZh', 'nameEn')) + '</a><small>' + esc(f.plotNo) + '</small></th>';
      }).join('') + '</tr>';
      var stat = t('compare.stat').replace('%s', String(COMPARE_FIELDS.length))
        .replace('%s', String(r.same)).replace('%s', String(r.diff));
      result = '<div class="sf-section">' + sectionHead(t('compare.result'), t('compare.diffTip'), '', picked.length) +
        '<div class="sf-compare-bar">' +
        '<span class="sf-compare-count" data-compare-stat><b>' + esc(stat) + '</b></span>' +
        '<button class="sf-btn" data-act="compare-toggle" type="button" aria-pressed="false">' + t('compare.hideSame') + '</button>' +
        '</div>' +
        '<div class="sf-table-wrap"><table class="sf-table sf-compare-table" data-compare-table><thead>' + heads +
        '</thead><tbody>' + r.html + '</tbody></table></div>' +
        (invalid ? '<p class="sf-role-hint">' + esc(t('compare.invalid')) + '</p>' : '') + '</div>';
    }
    put('<div class="sf-section">' + sectionHead(t('compare.title'), t('compare.desc')) + '</div>' +
      pickPanel + result + contentBoost('farms', 'table', all, t('compare.desc')));
  }

  /* ---------- 工单：固定流程与明细需求（状态字典只认 mock-data.js 的 JOB_FLOW） ---------- */
  function jobFlowMain() { return (M.JOB_FLOW || []).filter(function (x) { return x.main; }); }
  function jobFlowState(w) {
    var main = jobFlowMain(), idx = 0;
    main.forEach(function (x, i) { if (x.id === w.statusKey) idx = i; });
    if (w.statusKey === 'returned') idx = 2;   // 退回后回到「作业中」补做
    return { main: main, idx: idx };
  }
  function jobBadge(w) {
    var f = (M.JOB_FLOW || []).filter(function (x) { return x.id === w.statusKey; })[0];
    if (!f) return '<span class="sf-job-badge">' + esc(w.status || '') + '</span>';
    return '<span class="sf-job-badge is-' + esc(f.id) + '">' + esc(lang === 'en' ? f.en : f.zh) + '</span>';
  }
  function jobFlowPanel(w) {
    var st = jobFlowState(w), cur = st.idx, records = w.flow || [];
    var lines = st.main.map(function (x, i) {
      var rec = records.filter(function (r) { return r.statusId === x.id; })[0];
      var cls = i < cur ? 'is-done' : (i === cur ? 'is-current' : 'is-pending');
      var mark = i < cur ? '✓ ' : (i === cur ? '▶ ' : (i + 1) + '. ');
      return '<li class="sf-job-step ' + cls + '">' +
        '<b>' + mark + esc(lang === 'en' ? x.en : x.zh) + '</b>' +
        '<span class="sf-job-step-tag">' + esc(i < cur ? t('job.flow.done') : (i === cur ? t('job.flow.current') : t('job.flow.pending'))) + '</span>' +
        '<p>' + esc(lang === 'en' ? x.descEn : x.descZh) + '</p>' +
        (rec ? '<small>' + esc(t('job.flow.at')) + ' ' + esc(rec.at) + ' · ' + esc(t('job.flow.by')) + ' ' + esc(rec.by) + '</small>' : '') +
        '</li>';
    }).join('');
    if (w.statusKey === 'returned') {
      var rr = records.filter(function (r) { return r.statusId === 'returned'; })[0];
      lines += '<li class="sf-job-step is-returned"><b>↩ ' + esc(t('job.flow.branch')) + ' · ' +
        esc(lang === 'en' ? 'Returned' : '已退回') + '</b><span class="sf-job-step-tag">' +
        esc(t('job.flow.branch')) + '</span><p>' + esc(rr ? (lang === 'en' ? rr.noteEn : rr.noteZh) : '') + '</p>' +
        (rr ? '<small>' + esc(rr.at) + ' · ' + esc(rr.by) + '</small>' : '') + '</li>';
    }
    var stat = t('job.flow.step').replace('%s', String(cur + 1)).replace('%s', String(st.main.length)) +
      ' · ' + t('job.flow.remaining').replace('%s', String(st.main.length - cur - 1));
    return '<div class="sf-panel">' + sectionHead(t('job.flow.title'), t('job.flow.desc')) +
      '<div class="sf-job-flow-stat">' + esc(w.status || '') + ' · ' + esc(stat) + '</div>' +
      '<ol class="sf-job-flow">' + lines + '</ol></div>';
  }
  function jobReqPanel(w) {
    var reqs = w.requirements || [];
    var rows = reqs.map(function (r) {
      return '<tr><th>' + esc(lang === 'en' ? r.labelEn : r.labelZh) + '</th>' +
        '<td>' + esc(lang === 'en' ? r.valueEn : r.valueZh) + '</td>' +
        '<td><span class="sf-tag' + (r.required ? ' is-req' : '') + '">' +
        esc(r.required ? t('job.req.required') : t('job.req.optional')) + '</span></td></tr>';
    }).join('');
    return '<div class="sf-panel">' + sectionHead(t('job.req.title'), t('job.req.desc'), '', reqs.length) +
      '<div class="sf-table-wrap"><table class="sf-table"><thead><tr><th>' + esc(t('common.item')) +
      '</th><th>' + esc(t('common.value')) + '</th><th>' + esc(t('job.req.required')) +
      '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="sf-card-meta">' + esc(t('job.req.count').replace('%s', String(reqs.length))) + '</p></div>';
  }

  /* 按田园创建工单：农事挂靠在具体田块上，从个人中心的「我的田园」逐块进入。
     明细需求条目逐条填写，提交后进入固定流程第 1 步「待接单」。 */
  function pageWorkorderNew() {
    var farms = M.all('farms');
    var fid = param('farmId', farms.length ? farms[0].id : 'F001');
    var f = M.byId('farms', fid) || farms[0] || {}, byId = {};
    farms.forEach(function (x) { byId[x.id] = x; });
    if (!byId[fid]) { fid = farms[0].id; f = farms[0]; }
    var from = param('from', 'account.html');
    var types = (M.JOB_TYPES || []), priorities = (M.PRIORITIES || ['常规']), settles = (M.SETTLE_MODES || []);
    var plotLabel = zh(f, 'nameZh', 'nameEn') + ' · ' + (f.plotNo || fid);
    var plotInfo = '<div class="sf-panel" style="margin-bottom:16px">' +
      '<h3 style="margin:0 0 8px;font-size:16px">' + esc(plotLabel) + '</h3>' +
      '<div class="sf-card-meta" style="line-height:1.9">' +
      esc(f.region || '') + ' · ' + esc(f.soil || '') + ' · ' + esc(f.areaMu + '') + ' 亩<br>' +
      (lang === 'en' ? 'Current crops: ' : '当前作物：') + esc((f.currentCrops || []).join(' / ')) +
      ' · ' + (lang === 'en' ? 'Lease: ' : '承包：') + esc(f.leaseType || '') + '<br>' +
      (lang === 'en' ? 'Seasonal temp: ' : '四季均温：') + esc((f.temp4 || []).join(' / ')) +
      ' ℃ · ' + (lang === 'en' ? 'humidity: ' : '四季均湿：') + esc((f.humid4 || []).join(' / ')) + ' %</div></div>';
    var switcher = '<div class="sf-field"><label>' + t('job.new.farm') + '</label>' +
      '<select class="sf-select" data-act="farm-switch">' + farms.slice(0, 24).map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === fid ? ' selected' : '') + '>' +
          esc(zh(x, 'nameZh', 'nameEn') + ' · ' + (x.plotNo || x.id)) + '</option>';
      }).join('') + '</select></div>';
    var basics = '<div class="sf-panel">' + sectionHead(t('job.base.title'), '') +
      '<div class="sf-field-err" data-err></div>' +
      '<input type="hidden" name="farmId" value="' + esc(fid) + '">' + switcher +
      '<div class="sf-row">' +
      '<div class="sf-field"><label>' + t('job.new.type') + ' *</label><select class="sf-select" name="type">' +
      types.map(function (x) { return '<option' + (x === param('type', '') ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="sf-field"><label>' + t('job.new.priority') + '</label><select class="sf-select" name="priority">' +
      priorities.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="sf-row">' +
      '<div class="sf-field"><label>' + t('job.new.due') + '</label><input class="sf-input" type="date" name="due" value="2026-11-20"></div>' +
      '<div class="sf-field"><label>' + t('job.new.budget') + '</label><input class="sf-input" type="number" name="budget" min="0" value="120"></div></div>' +
      '<div class="sf-field"><label>' + t('job.new.settle') + '</label><select class="sf-select" name="settle">' +
      settles.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div>' + submitRow(from) + '</div>';
    var reqLines = '<div class="sf-panel">' + sectionHead(t('job.new.section'), t('job.new.section.desc')) +
      '<div class="sf-field"><label>' + t('job.new.scope') + ' *</label>' +
      '<textarea class="sf-textarea" name="scope" required placeholder="' +
      esc(lang === 'en' ? 'Which strips, boundaries and any control area are included?' : '写清作业哪几畦、四至边界，是否含对照区。') + '"></textarea></div>' +
      '<div class="sf-field"><label>' + t('job.new.window') + '</label>' +
      '<input class="sf-input" name="window" value="' + esc(lang === 'en' ? 'Morning hours, avoid rain' : '上午时段，遇雨顺延') + '"></div>' +
      '<div class="sf-field"><label>' + t('job.new.acceptance') + ' *</label>' +
      '<textarea class="sf-textarea" name="acceptance" required placeholder="' +
      esc(lang === 'en' ? 'Measurable criteria the publisher will check line by line.' : '写清可逐项核对的验收标准，例如深度、用量、回执张数。') + '"></textarea></div>' +
      '<div class="sf-row">' +
      '<div class="sf-field"><label>' + t('job.new.materials') + '</label>' +
      '<input class="sf-input" name="materials" value="' + esc(lang === 'en' ? 'Dosage by area, record actual use' : '按面积核定，作业后填实际用量') + '"></div>' +
      '<div class="sf-field"><label>' + t('job.new.qualification') + '</label><select class="sf-select" name="qualification">' +
      '<option>' + esc(lang === 'en' ? 'Grower with same-operation records' : '有同类田间作业记录的接单农户') + '</option>' +
      '<option>' + esc(lang === 'en' ? 'Research team or certified agronomist' : '产学研团队或具备农技资质人员') + '</option></select></div></div>' +
      '<div class="sf-field"><label>' + t('job.new.safety') + '</label>' +
      '<textarea class="sf-textarea" name="safety" placeholder="' +
      esc(lang === 'en' ? 'Tool checks, restricted access, weather postponement.' : '农具检查、作业区限制、雷雨顺延等。') + '"></textarea></div>' +
      '<div class="sf-field"><label>' + t('job.new.remark') + '</label>' +
      '<textarea class="sf-textarea" name="remark" placeholder="' +
      esc(lang === 'en' ? 'Changes must be logged in the job chat before execution.' : '变更范围 / 时间 / 用量须先在工单对话留痕再执行。') + '"></textarea></div>' +
      '<label class="sf-check"><input type="checkbox" name="photo" checked><span>' + t('job.new.photosRule') + '</span></label>' +
      '<p class="sf-role-hint">' + esc(t('job.new.flowNote')) + '</p></div>';
    put('<div class="sf-section">' + sectionHead(t('job.new.title'), pageCopy('lead') || t('workorders.desc')) +
      '<form data-form="newjob-farm"><div class="sf-row"><div>' + plotInfo + basics + reqLines + '</div>' +
      '<div class="sf-panel">' + jobFlowIntro() + genGallery('workorders') + '</div></div></form></div>' +
      contentBoost('workorders', 'form', M.all('workorders'), pageCopy('lead') || ''));
  }
  function submitRow(from) {
    return '<div class="sf-row" style="margin-top:14px">' +
      '<button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button>' +
      '<a class="sf-btn" href="' + esc(link(from, {})) + '">' + t('act.back') + '</a></div>';
  }
  function jobFlowIntro() {
    var main = jobFlowMain();
    return '<div class="sf-panel">' + sectionHead(t('job.flow.title'), t('job.flow.desc')) +
      '<ol class="sf-job-flow">' + main.map(function (x, i) {
        return '<li class="sf-job-step is-pending"><b>' + (i + 1) + '. ' + esc(lang === 'en' ? x.en : x.zh) + '</b>' +
          '<p>' + esc(lang === 'en' ? x.descEn : x.descZh) + '</p></li>';
      }).join('') + '</ol>' +
      '<p class="sf-role-hint">' + esc(t('job.flow.branch')) + '：' +
      esc(lang === 'en' ? 'Returned → back to In progress for rework.' : '已退回 → 回到「作业中」补做并重新上传回执。') + '</p></div>';
  }

  function pageWorkorders() {
    /* 新建工单统一落到「按田园创建工单」页，首屏按钮与这里不再各放一个重复入口 */
    put('<div class="sf-section">' + sectionHead(t('workorders.title'), t('workorders.desc') + ' ' + t('job.list.desc'), '', count('workorders')) +
      '<div id="mount-workorders"></div></div>');
    /* 工单总览按严谨的文字清单呈现：状态徽章、当前流程步、明细摘要与截止都在一行里 */
    listBlock({ id: 'workorders', api: 'listWorkorders', loadMore: true, layout: 'text', emptyCta: 'workorders.html',
      params: function () { return { page: state.page, pageSize: 8, q: state.q }; },
      toCard: function (w) {
        var st = jobFlowState(w), f = M.byId('farms', w.farmId) || {};
        var step = t('job.flow.step').replace('%s', String(st.idx + 1)).replace('%s', String(st.main.length));
        var req = (w.requirements || []).filter(function (r) { return r.key === 'acceptance'; })[0];
        var href = detailLink('workorder-detail.html', w.id, 'workorders.html');
        return textRow({ board: w.type, title: w.id + ' · ' + (f.plotNo || w.farmId) + ' · ' + w.status,
          href: href,
          summary: (req ? (lang === 'en' ? req.labelEn + '：' + req.valueEn : req.labelZh + '：' + req.valueZh) : w.descZh),
          meta: w.createdAt + ' → ' + w.dueAt + ' · ¥' + w.price + ' · ' + step,
          action: '<span class="sf-textrow-act">' + jobBadge(w) +
            '<a class="sf-btn is-sm" href="' + esc(href) + '">' + t('common.viewDetail') + '</a></span>' });
      } });
  }
  function pageWorkorderDetail() {
    var id = param('id', 'W001');
    API.getWorkorder(id).then(function (w) {
      if (!w) { put(emptyBlock('workorders.html')); return; }
      var chat = (w.chat || []), f = M.byId('farms', w.farmId) || {};
      var st = jobFlowState(w);
      var stat = t('job.flow.step').replace('%s', String(st.idx + 1)).replace('%s', String(st.main.length)) +
        ' · ' + t('job.flow.remaining').replace('%s', String(st.main.length - st.idx - 1));
      var head = '<div class="sf-job-detail-head">' + jobBadge(w) +
        '<span>' + esc(w.status || '') + '</span><span class="sf-job-flow-stat">' + esc(stat) + '</span></div>';
      var basics = '<div class="sf-panel">' + sectionHead(t('job.base.title'), '') +
        table(['', ''], [
          [t('workorder.type'), w.type], [t('job.list.status'), w.status + '（' + (lang === 'en' ? 'fixed flow' : '固定流程') + '）'],
          [t('common.publishedAt'), w.createdAt], [t('job.base.due'), w.dueAt],
          [t('job.base.updated'), w.updatedAt || w.createdAt],
          [t('job.base.publisher'), w.userId],
          [t('job.base.assignee'), w.assigneeId || t('job.base.unassigned')],
          [t('common.price'), '¥' + w.price], [t('job.base.priority'), w.priority || '—'],
          [t('job.base.settle'), w.settleMode || '—'],
          [lang === 'en' ? 'Linked plot' : '关联田园', zh(f, 'nameZh', 'nameEn') + ' · ' + (f.plotNo || w.farmId)]]) +
        '<div class="sf-row" style="margin-top:12px">' +
        '<a class="sf-btn" href="' + esc(link('workorders.html', { from: 'workorder-detail.html' })) + '">' +
        esc(lang === 'en' ? 'Back to work orders' : '返回工单总览') + '</a></div></div>';
      var photos = '<div class="sf-panel"><h3>' + t('workorder.photos') + '</h3><div class="sf-gallery">' +
        (w.photos || []).map(function (x) { return pic(x, 'receipt'); }).join('') + '</div></div>';
      var chatBox = '<div class="sf-section">' + sectionHead(t('account.chat'), '', '', chat.length) +
        '<div class="sf-panel"><div class="sf-chat" id="sf-chat">' + chat.map(function (c) { return bubble(c); }).join('') + '</div>' +
        '<form data-form="chat" class="sf-row" style="margin-top:12px;flex-wrap:nowrap">' +
        '<input class="sf-input" name="msg" required placeholder="' + esc(t('workorder.ph')) + '" style="flex:1 1 auto">' +
        '<button class="sf-btn is-primary" type="submit">' + t('workorder.send') + '</button></form></div></div>';
      put('<div class="sf-section">' + sectionHead(w.type + ' · ' + w.id, w.descZh) + head +
        '<div class="sf-row">' + basics + photos + '</div>' +
        '<div class="sf-section">' + jobReqPanel(w) + '</div>' +
        '<div class="sf-section">' + jobFlowPanel(w) + '</div>' +
        chatBox + '</div>');
    });
  }
  function bubble(c) {
    var me = c.fromId === 'U013';
    return '<div class="sf-bubble' + (me ? ' is-me' : '') + '">' + esc(me ? c.bodyEn || c.bodyZh : c.bodyZh) +
      (c.kind === 'photo' ? '<div style="margin-top:6px">' + pic(artFor('job', c.id, 'mini'), 'photo') + '</div>' : '') +
      '<span class="sb-time">' + esc(c.at) + '</span></div>';
  }
  function pageSearch() {
    var q = param('q', state.q);
    put('<div class="sf-section">' + sectionHead(t('search.title'), t('search.desc')) + searchBar() +
      '<div id="mount-search"></div></div>');
    API.search(q, state.page).then(function (r) {
      var blocks = r.groups.map(function (g) {
        if (!g.items.length) return '';
        return '<div class="sf-section">' + sectionHead(g.label, '', '', g.total) + grid(g.items.map(function (x) {
          return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn') || zh(x, 'nameZh', 'nameEn') || (x.type + ' ' + x.id),
            cover: x.cover || artFor(g.key, x.id, 'card'),
            meta: (x.publishedAt || x.createdAt || x.date || x.leaseStart || '') + ' · ' + (x.board || x.kind || x.region || ''),
            tags: (x.tags || [g.label]).slice(0, 2), price: x.price || x.amount,
            href: link('search.html', { q: q, id: x.id, from: 'search.html' }) });
        })) + '</div>';
      }).join('');
      var el = document.getElementById('mount-search');
      if (el) el.innerHTML = (r.total ? blocks : emptyBlock('farms.html')) +
        '<div class="sf-panel sf-card-meta" style="margin-top:14px">' + r.total + ' ' + t('common.result') + ' · q=' + esc(q || '—') + '</div>';
    });
  }
  function page404() {
    var routes = [
      ['nav.home', 'index.html', lang === 'en' ? 'Start again from the home hero and its four sections.' : '回到首页，从主视觉重新进入四个子栏目。'],
      ['common.search', 'search.html', lang === 'en' ? 'Search plot numbers, crops, events or jobs across six datasets.' : '直接搜田块编号、作物、活动或工单，一次搜完六类数据集。'],
      ['nav.farms', 'farms.html', lang === 'en' ? 'Browse plot records filtered by region, lease type and soil.' : '翻田园档案，按地区、承包类型与土壤筛一块还能租的田。'],
      ['help.title', 'help.html', lang === 'en' ? 'Practical answers on leasing, jobs, payment, delivery and review.' : '承包、工单、支付、配送与审核的常见疑问，给的是可照做的答案。']
    ];
    var why = lang === 'en'
      ? 'This address may have been unpublished, renamed, or carry an ID that is not in the current dataset. We do not silently redirect a broken link to the home page: the usable routes are listed below so you do not keep landing in the same place.'
      : '这个地址可能已经下架、改过文件名，或链接里的编号不属于当前数据集。平台不把失效地址静默重定向到首页，而是把可走的几条路直接列在下面，避免你连点几次都回到同一个地方。';
    put('<div class="sf-section">' + sectionHead(t('404.title'), t('404.desc')) + emptyBlock('index.html') +
      '<div class="sf-panel"><p style="line-height:1.9;font-size:14px;margin:0">' + esc(why) + '</p></div>' +
      '<div class="sf-grid">' + routes.map(function (r) {
        return '<div class="sf-card"><div class="sf-card-body"><h3 class="sf-card-title">' + esc(t(r[0])) + '</h3>' +
          '<div class="sf-card-meta">' + esc(r[2]) + '</div>' +
          '<div class="sf-card-foot"><a class="sf-btn is-primary" href="' + link(r[1]) + '">' + esc(t('common.viewDetail')) + '</a></div>' +
          '</div></div>';
      }).join('') + '</div></div>');
  }

  /* ---------- 表单 / 编辑页 ---------- */
  function field(label, name, type, ph) {
    return '<div class="sf-field"><label>' + esc(label) + '</label>' +
      (type === 'textarea' ? '<textarea class="sf-textarea" name="' + name + '" placeholder="' + esc(ph || '') + '"></textarea>' :
       '<input class="sf-input" name="' + name + '" type="' + (type || 'text') + '" placeholder="' + esc(ph || '') + '">') + '</div>';
  }
  function pageFarmEdit() {
    put('<div class="sf-section">' + sectionHead(t('edit.farm.title'), t('edit.farm.desc')) +
      '<form data-form="farm" class="sf-panel"><div class="sf-row">' +
      field('田园名称', 'nameZh', 'text', '例如：道明竹艺田畈') + field('English name', 'nameEn') +
      field(t('farms.region'), 'region') + field(t('farm.plotNo'), 'plotNo', 'text', 'A-101') +
      field(t('farms.soil'), 'soil', 'text', '壤土 / 微酸 pH6.2') + field(t('farm.area'), 'areaMu', 'number', '2.4') +
      field('春 / ℃', 't1', 'number', '9') + field('夏 / ℃', 't2', 'number', '26') +
      field('秋 / ℃', 't3', 'number', '18') + field('冬 / ℃', 't4', 'number', '7') +
      field('春 / %', 'h1', 'number', '62') + field('夏 / %', 'h2', 'number', '74') +
      field(t('farm.past'), 'pastCrops', 'text', '油菜, 儿菜') + field(t('farm.current'), 'currentCrops', 'text', '二荆条辣椒') +
      field(t('farms.lease'), 'leaseType') + field('承包开始', 'leaseStart', 'date') +
      field('承包结束', 'leaseEnd', 'date') + field(t('farm.facilities'), 'facilities', 'text', '聚会长桌, 露营营位') +
      '</div>' + field('田园介绍', 'descZh', 'textarea', '写清土况、水源、交通与四季看点') +
      '<div class="sf-row"><button class="sf-btn is-primary" type="submit">' + t('common.save') + '</button>' +
      '<button class="sf-btn" data-act="back" data-fallback="farms.html" type="button">' + t('common.cancel') + '</button></div></form></div>');
  }
  function pageForumEdit() {
    put('<div class="sf-section">' + sectionHead(t('edit.forum.title'), t('edit.forum.desc')) +
      '<form data-form="topic" class="sf-panel">' +
      '<div class="sf-field"><label>' + t('forum.board.hot') + ' / 版块</label><select class="sf-select" name="board">' +
      ['热门田园', '种植经验', '活动', '技术咨询'].map(function (b) { return '<option>' + b + '</option>'; }).join('') + '</select></div>' +
      field('标题', 'titleZh') + field('Title (EN)', 'titleEn') +
      field(t('forum.body'), 'bodyZh', 'textarea', '把土况、时间、田块编号写清楚') +
      field('Body (EN)', 'bodyEn', 'textarea', 'Write the full English body for the bilingual edition') +
      '<button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button></form></div>');
  }

  /* ---------- 后台（纯素、严谨、独立） ---------- */
  var ADM_MODULES = [
    ['dashboard', 'admin.m.dashboard'], ['farms', 'admin.m.farms'], ['users', 'admin.m.users'],
    ['workorders', 'admin.m.workorders'], ['chats', 'admin.m.chats'], ['planting', 'admin.m.planting'],
    ['comments', 'admin.m.comments'], ['audit', 'admin.m.audit'], ['system', 'admin.m.system']
  ];
  function pageAdminLogin() {
    put('<form data-form="admin-login" class="adm-panel">' +
      '<div class="sf-field"><label>' + t('admin.login.user') + '</label><input class="adm-input" name="account" required value="sumfarm-admin"></div>' +
      '<div class="sf-field"><label>' + t('admin.login.pwd') + '</label><input class="adm-input" name="passphrase" type="password" required></div>' +
      '<div class="sf-field"><label>' + t('admin.login.captcha') + '</label><input class="adm-input" name="captcha" required placeholder="SUM2026"></div>' +
      '<button class="adm-btn" type="submit">' + t('admin.login.btn') + '</button>' +
      '<p class="adm-note">' + t('admin.login.note') + '</p></form>' +
      '<div class="adm-panel"><h3>独立入口说明 / Console isolation</h3>' +
      '<p class="adm-note">' +
      (lang === 'en'
        ? 'This console is not linked from the public navigation, footer, mobile menu or sitemap, and /admin/ is excluded from the public index. It is reached only by its own address, distributed to operators separately.'
        : '本入口不在前台导航、页脚、移动菜单与站点地图中出现，/admin/ 也不进入公开索引，仅由运维单独分发独立地址。') +
      '</p><p class="adm-note">' +
      (lang === 'en'
        ? 'Front-end accounts and console accounts are separate systems. A cooperative, a lessee, a grower or a research member signs in on the public site; an administrator signs in here.'
        : '前台账号与后台账号为两套体系：商家村集体、租赁用户、接单农户、产学研成员在前台登录，平台管理员仅在此处登录。') +
      '</p><p class="adm-note">' +
      (lang === 'en'
        ? 'Every approval, rejection, edit and export writes an audit row with operator, timestamp, target and before/after values. Review runs at three levels: completeness, consistency, publication.'
        : '所有通过、退回、编辑与导出均写入审计日志，含操作人、时间、对象与前后值；审核按资料完整性、编号与图片一致性、公开发布三级流转。') +
      '</p></div>');
  }
  function pageAdminIndex() {
    var m = param('m', 'dashboard');
    var side = ADM_MODULES.map(function (x) {
      var f = x[0] === 'audit'
        ? link('admin/audit.html', { from: 'index.html' })
        : link('admin/index.html', { m: x[0] });
      return '<a class="' + (m === x[0] ? 'is-on' : '') + '" href="' + esc(f) + '">' + t(x[1]) + '</a>';
    }).join('');
    var kpi = [['farms', t('admin.m.farms')], ['users', t('admin.m.users')],
      ['workorders', t('admin.m.workorders')], ['comments', t('admin.m.comments')]].map(function (x) {
      return '<div class="adm-kpi"><b>' + count(x[0]) + '</b><span>' + x[1] + '</span></div>';
    }).join('');
    put('<div class="adm-top"><h1>' + t('admin.title') + '</h1><span class="adm-spacer"></span>' +
      '<button class="adm-btn is-plain" data-act="lang" type="button">' + t('act.lang') + '</button>' +
      '<button class="adm-btn is-plain" data-act="logout" type="button">' + t('admin.logout') + '</button></div>' +
      '<div class="adm-kpis">' + kpi + '</div>' +
      '<div class="adm-shell"><div class="adm-side"><h2>SUMFARM ADMIN</h2>' + side + '</div>' +
      '<div class="adm-content"><div class="adm-panel"><h3>' + t(ADM_MODULES.filter(function (x) { return x[0] === m; })[0][1]) + '</h3>' +
      '<div class="adm-actions"><button class="adm-btn is-plain" data-act="selectAll" type="button">' + t('common.selectAll') + '</button>' +
      '<button class="adm-btn is-plain" data-act="delete" type="button">' + t('common.delete') + '</button>' +
      '<a class="adm-btn is-plain" href="' + esc(link('admin/audit.html', { from: 'index.html' })) + '">' + t('admin.m.audit') + '</a></div>' +
      '<div id="mount-adm"></div></div></div></div>');
    API.adminModule(m, { page: state.page, q: state.q }).then(function (r) {
      var cols = r.columns.slice(0, 6);
      var rows = r.rows.map(function (x) {
        return ['<input type="checkbox" class="adm-check">'].concat(cols.map(function (c) {
          var v = x[c]; return esc(Array.isArray(v) ? v.join(' / ') : (typeof v === 'object' && v ? JSON.stringify(v).slice(0, 40) : v));
        }));
      });
      var el = document.getElementById('mount-adm');
      if (!el) return;
      el.innerHTML = '<div class="adm-scroll"><table class="adm-table"><thead><tr>' +
        cols.concat(['✓']).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.map(function (rw) {
          return '<tr>' + rw.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="adm-note" style="margin-top:10px">' + r.total + ' ' + t('common.result') +
        ' · ' + r.pages + ' ' + t('common.page') + '</p>';
    });
  }
  function pageAdminAudit() {
    var id = param('id', 'AU001'), a = M.byId('audits', id) || M.all('audits')[0];
    put('<div class="adm-top"><h1>' + t('admin.audit.title') + ' · ' + esc(a.id) + '</h1><span class="adm-spacer"></span>' +
      '<button class="adm-btn is-plain" data-act="back" data-fallback="index.html?m=dashboard" type="button">' + t('act.back') + '</button></div>' +
      '<div class="adm-panel"><h3>' + esc(a.targetType) + ' · ' + esc(a.targetId) + '</h3>' +
      '<div class="adm-flow">' + ['初审', '复审', '终审'].map(function (lv, i) {
        return '<div class="adm-step"><b>' + (i + 1) + '. ' + lv + '</b><p>' +
          (i === 0 ? '资料完整性：田块编号、四季读数、图片是否齐全。' : i === 1 ? '一致性复核：编号牌与实景照片、承包时间是否对应。' : '公开发布：确认无敏感信息后写入前台索引。') +
          '</p><span class="adm-tag ' + (i === 0 ? 'is-ok' : i === 1 ? 'is-warn' : '') + '">' + esc(a.status) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="adm-log"><li><b>' + esc(a.operator) + '</b> · ' + esc(a.at) + ' · ' + esc(a.level) + '</li>' +
      '<li>' + esc(zh(a, 'commentZh', 'commentEn')) + '</li></div>' +
      '<div class="adm-actions" style="margin-top:14px"><button class="adm-btn" data-act="audit-step" data-level="复审" type="button">通过并转复审</button>' +
      '<button class="adm-btn is-plain" data-act="audit-step" data-level="退回" type="button">退回补正</button></div>' +
      '<form data-form="audit-note" class="sf-field" style="margin-top:12px"><label>审核意见 / 沟通交流</label>' +
      '<textarea class="adm-input" name="note" style="min-height:80px" placeholder="写明通过或退回的具体原因"></textarea>' +
      '<button class="adm-btn" type="submit">提交意见</button></form></div>');
  }

  /* ---------- 内容补强：每页至少 3 个正文图片位 + 逐页不同的真文案 ---------- */
  function dsLabel(ds) {
    var zh = { farms: '田园档案', activities: '田园活动', produces: '农产品', videos: '视频',
      promos: '田园宣发', topics: '论坛帖子', experts: '专家', workorders: '农事工单',
      dispatches: '接单需求', orders: '订单', users: '账号', comments: '评论',
      chats: '对话', plantings: '种植记录', audits: '审核记录', notices: '平台公告' };
    var en = { farms: 'plot records', activities: 'farm events', produces: 'produce batches', videos: 'field videos',
      promos: 'farm stories', topics: 'forum topics', experts: 'expert profiles', workorders: 'field jobs',
      dispatches: 'open jobs', orders: 'orders', users: 'accounts', comments: 'reviews',
      chats: 'chat messages', plantings: 'growing logs', audits: 'review records', notices: 'platform notices' };
    return (lang === 'en' ? en[ds] : zh[ds]) || ds;
  }
  function boostTip(tpl) {
    var zh = {
      list: '列表支持关键词、筛选与分页；点第 N 页会真的换一批记录，页码数按实际条数算，不会出现空页。',
      table: '表格在手机上可以横向滑动，列不会被压扁；全选只作用于当前页，删除前会再确认一次。',
      form: '带 * 的字段必填，提交后进入审核队列；审核意见会写回这条记录，不需要另发消息追问。',
      flow: '每一步都带操作人与时间，退回补正必须写明原因；终审通过后才会写入前台公开索引。',
      info: '说明里写的是现行做法，不是愿景描述；规则调整时以平台公告的生效日期为准。',
      chat: '对话按工单号留存，照片回执也在同一条时间线里；后台只做检索，不改动原始内容。',
      gallery: '照片按田块与作业类型归档，验收时可直接对照；懒加载完成后才会参与完整性检查。',
      success: '成功态不是终点：顺着下面的入口继续下单或派工，相关记录会汇到个人中心。',
      stats: '统计卡数值来自数据集实时条数，不写死；换筛选条件后，下方明细同步变化。',
      map: '先看区域再看田块编号，能少跑一趟；点开任意编号可回到完整田园档案。',
      detail: '详情按 URL 参数渲染，不同编号显示不同田块；四季读数带录入人与时间，可追溯到工单回执。'
    };
    var en = {
      list: 'Search, filters and pagination all work on real data. Page N shows a different batch and no page is ever empty.',
      table: 'Tables scroll sideways on phones instead of crushing columns. Select-all covers the current page and deletion asks twice.',
      form: 'Fields marked * are required. Submissions enter a review queue, and the decision comes back on the same record.',
      flow: 'Every step carries an operator and a timestamp; a return needs a reason, and only final approval publishes to the public index.',
      info: 'These pages describe current practice, not a roadmap. When rules change, the notice effective date is the reference.',
      chat: 'Messages are kept under the job number with photo receipts on the same timeline; the console searches them without editing originals.',
      gallery: 'Photos are filed by plot and job type for acceptance. Lazy-loaded images are checked only after they finish loading.',
      success: 'A success page is not the end — continue to orders or jobs below and the records flow into your account.',
      stats: 'Every number comes from live dataset counts; changing a filter updates the detail below at once.',
      map: 'Check the region first, then the plot number — it saves a trip. Any number links back to the full plot record.',
      detail: 'Details render from the URL parameter so different IDs show different plots. Seasonal readings carry an author and a timestamp.'
    };
    var d = lang === 'en' ? en : zh;
    return d[tpl] || d.list;
  }
  function contentBoost(ds, tpl, items, lead) {
    var isAdm = document.body.classList.contains('adm-body');
    var total = items.length;
    var latest = items[0] || {};
    var fields = Object.keys(latest).slice(0, 5).join(lang === 'en' ? ', ' : '、');
    var p1 = lead;
    var p2 = lang === 'en'
      ? 'This page holds ' + total + ' ' + dsLabel(ds) + '. The newest entry is "' + genTitle(latest, ds) +
        '" (' + (latest.publishedAt || latest.createdAt || latest.date || latest.recordAt || latest.at || '—') +
        '). Common fields: ' + fields + '. Every record carries an author and a timestamp, and the console keeps the full change log.'
      : '本页共收录 ' + total + ' 条' + dsLabel(ds) + '，最新一条是「' + genTitle(latest, ds) + '」，登记时间 ' +
        (latest.publishedAt || latest.createdAt || latest.date || latest.recordAt || latest.at || '—') +
        '。常见字段包括 ' + fields + '；每条记录都由录入人署名，后台保留完整变更日志，不会只留一个结论。';
    var p3 = boostTip(tpl);
    var stats = '<div class="sf-mini-stats">' +
      '<div class="sf-mini-stat"><b>' + total + '</b><span>' + dsLabel(ds) + '</span></div>' +
      '<div class="sf-mini-stat"><b>' + count('workorders') + '</b><span>' + t('workorders.title') + '</span></div>' +
      '<div class="sf-mini-stat"><b>' + count('orders') + '</b><span>' + t('orders.title') + '</span></div>' +
      '<div class="sf-mini-stat"><b>' + count('notices') + '</b><span>' + t('home.notices') + '</span></div></div>';
    var strip = '<div class="sf-note-strip"><span class="sf-tag">' + dsLabel(ds) + '</span>' +
      '<span class="sf-tag is-cute">' + t('common.tip') + '</span>' +
      '<a class="sf-btn is-sm" href="' + link('help.html') + '">' + t('help.title') + '</a>' +
      '<a class="sf-btn is-sm" href="' + link('farms.html') + '">' + t('nav.farms') + '</a>' +
      '<a class="sf-btn is-sm" href="' + link('forum.html') + '">' + t('nav.forum') + '</a></div>';
    /* 正文图片位由 universalTail 统一提供，此处只给逐页说明与统计，避免重复贴图 */
    var art = '';
    var notes = '<div class="sf-boost-notes"><p>' + esc(p1) + '</p><p>' + esc(p2) + '</p>' +
      '<p class="sf-mute-line">' + esc(p3) + '</p>' + stats + '</div>';
    if (isAdm) {
      /* 后台保持纯素：不输出任何装饰图片，靠更密的管控表格与说明补足内容 */
      var ks = genKeys(items, 6);
      return '<div class="sf-boost"><div class="sf-section">' +
        sectionHead(t('common.notes'), '', '', total) +
        '<div class="sf-panel">' + notes +
        '<div class="adm-scroll" style="margin-top:14px">' +
        '<table class="adm-table"><thead><tr>' + ks.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + genRows(items.slice(0, 8), ks).map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div></div></div></div>';
    }
    return '<div class="sf-boost"><div class="sf-section">' +
      sectionHead(t('common.notes'), t('common.related'), '', total) +
      '<div class="sf-boost-grid"><div class="sf-panel">' + notes + '</div>' +
      '<div class="sf-panel">' + art + strip + '</div></div></div></div>';
  }

  /* ---------- 前台账号：登录 / 注册 / 找回（与后台独立入口隔离） ---------- */
  function authInput(label, name, type, ph, required) {
    return '<div class="sf-field"><label>' + esc(label) + (required ? ' *' : '') + '</label>' +
      '<input class="sf-input" name="' + name + '" type="' + (type || 'text') + '"' +
      (required ? ' required' : '') + ' placeholder="' + esc(ph || '') + '"></div>';
  }
  /* 合并账号页：登录 / 注册共用一个面板，由 Tab 与 ?mode= 切换，不再分两页。
     栏目只保留「切模式 + 一张表单 + 找回口令」，角色从五张卡片收成一个下拉。 */
  function pageAuth(kind) {
    var A = global.SF_AUTH;
    var from = param('from', 'account.html');
    var lead = pageCopy('lead') || '';
    if (kind === 'forgot') {
      var fForm = '<h2>' + t('auth.forgot') + '</h2><p class="sf-auth-lead">' + esc(lead) + '</p>' +
        '<form data-form="forgot"><div class="sf-field-err" data-err></div>' +
        authInput(t('auth.phone'), 'phone', 'text', '手机号或邮箱', true) +
        '<button class="sf-btn is-primary" type="submit">' + t('auth.ok.reset') + '</button></form>' +
        '<div class="sf-section" style="margin-top:18px"><div class="sf-flow">' +
        [t('auth.reset.s1'), t('auth.reset.s2'), t('auth.reset.s3')].map(function (x, i) {
          return '<div class="sf-step"><b>' + (i + 1) + '. ' + esc(x) + '</b><p>' + esc(lead.slice(0, 46)) + '</p></div>';
        }).join('') + '</div></div>' +
        '<div class="sf-auth-alt"><a href="' + link('login.html', { from: from }) + '">' + t('auth.backLogin') + '</a></div>';
      put('<div class="sf-auth"><div class="sf-auth-art">' + pic(M.IMG.auth, 'SUMFARM') + '</div>' +
        '<div class="sf-auth-panel">' + fForm + '<p class="sf-auth-note">' + t('auth.demo') + '</p></div></div>' +
        contentBoost('users', 'form', M.all('users'), lead));
      return;
    }
    var mode = param('mode', 'login') === 'register' ? 'register' : 'login';
    var loginForm = '<h2>' + t('auth.mode.login') + '</h2><p class="sf-auth-lead">' + t('auth.mode.login.lead') + '</p>' +
      '<form data-form="login"><div class="sf-field-err" data-err></div>' +
      authInput(t('auth.account'), 'account', 'text', 'tianyou / hongqi / laozhou', true) +
      authInput(t('auth.passphrase'), 'passphrase', 'password', '至少 8 位', true) +
      '<label class="sf-check"><input type="checkbox" name="remember" checked><span>' + t('auth.remember') + '</span></label>' +
      '<button class="sf-btn is-primary is-block" type="submit">' + t('auth.mode.login') + '</button></form>' +
      '<div class="sf-auth-alt"><span>' + t('auth.noAccount') + '</span>' +
      '<button class="sf-btn is-quiet" data-act="auth-mode" data-v="register" type="button">' + t('auth.mode.register') + '</button>' +
      '<a href="' + link('forgot.html', { from: from }) + '">' + t('auth.forgot') + '</a></div>';
    var roleOpts = (A ? A.ROLES : []).map(function (r) {
      return '<option value="' + esc(r.id) + '">' + esc(lang === 'en' ? r.en : r.zh) + '</option>';
    }).join('');
    var regForm = '<h2>' + t('auth.mode.register') + '</h2><p class="sf-auth-lead">' + t('auth.mode.register.lead') + '</p>' +
      '<form data-form="register"><div class="sf-field-err" data-err></div>' +
      authInput(t('auth.account'), 'account', 'text', '用于登录的账号名', true) +
      authInput(t('auth.phone'), 'phone', 'text', '手机号或邮箱', true) +
      '<div class="sf-field"><label>' + t('auth.role.select') + ' *</label>' +
      '<select class="sf-select" name="role">' + roleOpts + '</select></div>' +
      '<div class="sf-row">' + authInput(t('auth.passphrase'), 'passphrase', 'password', '至少 8 位', true) +
      authInput(t('auth.confirm'), 'confirm', 'password', '再输一次', true) + '</div>' +
      '<label class="sf-check"><input type="checkbox" name="agree"><span>' + t('auth.agree') +
      ' · <a href="' + link('terms.html') + '">' + t('terms.title') + '</a> / ' +
      '<a href="' + link('privacy.html') + '">' + t('privacy.title') + '</a></span></label>' +
      '<button class="sf-btn is-primary is-block" type="submit">' + t('auth.mode.register') + '</button></form>' +
      '<div class="sf-auth-alt"><span>' + t('auth.hasAccount') + '</span>' +
      '<button class="sf-btn is-quiet" data-act="auth-mode" data-v="login" type="button">' + t('auth.mode.login') + '</button></div>' +
      '<p class="adm-note" style="margin-top:10px">' + t('auth.roleNote') + '</p>';
    var tabs = '<div class="sf-auth-tabs" role="tablist">' +
      '<button class="sf-auth-tab' + (mode === 'login' ? ' is-on' : '') + '" data-act="auth-mode" data-v="login" type="button" role="tab">' + t('auth.mode.login') + '</button>' +
      '<button class="sf-auth-tab' + (mode === 'register' ? ' is-on' : '') + '" data-act="auth-mode" data-v="register" type="button" role="tab">' + t('auth.mode.register') + '</button></div>';
    var panels = '<div class="sf-auth-mode" data-mode="login"' + (mode === 'login' ? '' : ' hidden') + '>' + loginForm + '</div>' +
      '<div class="sf-auth-mode" data-mode="register"' + (mode === 'register' ? '' : ' hidden') + '>' + regForm + '</div>';
    put('<div class="sf-auth"><div class="sf-auth-art">' + pic(M.IMG.auth, 'SUMFARM') + '</div>' +
      '<div class="sf-auth-panel">' + tabs + panels +
      '<p class="sf-auth-note">' + t('auth.demo') + '</p></div></div>' +
      contentBoost('users', 'form', M.all('users'), lead));
  }

  /* ---------- 子页体系通用渲染器（一份实现，按 data-tpl / data-ds 分派） ---------- */
  var DS_CAT = { farms: 'farm', activities: 'venue', produces: 'produce', videos: 'video',
    promos: 'promo', topics: 'topic', experts: 'expert', workorders: 'job', dispatches: 'job',
    orders: 'produce', users: 'user', comments: 'topic', chats: 'chat', plantings: 'planting',
    audits: 'job', notices: 'promo' };
  function dsCat(ds) { return DS_CAT[ds] || 'farm'; }
  function scalar(v) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.join(' / ');
    if (typeof v === 'object') return JSON.stringify(v).slice(0, 60);
    return String(v);
  }
  function genTitle(x, ds) {
    return zh(x, 'titleZh', 'titleEn') || zh(x, 'nameZh', 'nameEn') ||
      (scalar(x.kind || x.type || x.board || x.stage || x.crop || x.channel || ds) + ' · ' + x.id);
  }
  function genMeta(x, ds) {
    return [x.publishedAt || x.createdAt || x.date || x.recordAt || x.at || x.leaseStart,
      x.region || x.board || x.kind || x.type || x.category || x.season || x.level || x.stage,
      x.status || x.role || x.unit || ''].filter(Boolean).join(' · ');
  }
  function genTags(x, ds) {
    var a = x.tags || [x.category || x.season || x.level || x.stage || x.role || x.channel || x.leaseType || ds];
    return (Array.isArray(a) ? a : [a]).slice(0, 3).map(scalar);
  }
  function genCard(x, ds, self) {
    return card({ id: x.id, title: genTitle(x, ds),
      cover: x.cover || x.avatar || artFor(dsCat(ds), String(x.id), 'card'),
      meta: genMeta(x, ds), tags: genTags(x, ds),
      price: x.price || x.amount || '',
      href: link(self, { id: x.id, from: hereFile() }) });
  }
  function backRow(parent, more) {
    return '<div class="sf-row" style="margin-top:16px;flex-wrap:wrap">' +
      '<button class="sf-btn" data-act="back" data-fallback="' + esc(parent) + '" type="button">' + t('act.back') + '</button>' +
      (more || []).map(function (m) {
        return '<a class="sf-btn is-primary" href="' + esc(link(m[1], { from: hereFile() })) + '">' + esc(t(m[0])) + '</a>';
      }).join('') + '</div>';
  }
  function genTimeline(list, ds, limit) {
    return '<ul class="sf-timeline">' + list.slice(0, limit || 6).map(function (x) {
      var when = x.publishedAt || x.createdAt || x.date || x.recordAt || x.at || '';
      var txt = genTitle(x, ds) + (x.status ? ' · ' + x.status : '') +
        (x.noteZh ? ' · ' + zh(x, 'noteZh', 'noteEn') : '');
      return '<li><b>' + esc(when) + '</b> · ' + esc(txt) + '</li>';
    }).join('') + '</ul>';
  }
  function genGallery(ds) {
    var imgs = [];
    M.all('farms').slice(0, 6).forEach(function (f) { imgs.push(f.cover); });
    imgs.push(M.IMG.venue, M.IMG.produce, M.IMG.field);
    for (var i = 0; i < 3; i++) imgs.push(artFor(dsCat(ds), 'gal-' + i, i === 0 ? 'wide' : 'card'));
    return '<div class="sf-gallery">' + imgs.map(function (s, i) { return pic(s, 'field-' + i); }).join('') + '</div>';
  }
  function genRows(items, keys) {
    return items.map(function (x) {
      return keys.map(function (k) { return esc(scalar(x[k]).slice(0, 90)); });
    });
  }
  function genKeys(items, n) {
    return Object.keys(items[0] || {}).filter(function (k) {
      var v = items[0][k]; return typeof v !== 'object' || Array.isArray(v);
    }).slice(0, n || 6);
  }
  function pageGeneric() {
    var b = document.body;
    var tpl = b.getAttribute('data-tpl') || 'list';
    var ds = b.getAttribute('data-ds') || 'farms';
    var parent = b.getAttribute('data-parent') || 'index.html';
    var self = hereFile();
    var h1 = pageCopy('h1') || t('common.more');
    var lead = pageCopy('lead') || '';
    var items = M.all(ds);
    var head = sectionHead(h1, lead, '', items.length);
    var boost = contentBoost(ds, tpl, items, lead);
    var html = '';

    /* 详情页一律按 URL 参数渲染：同一子页带不同 id 显示不同条目 */
    if (param('id')) {
      var one = M.byId(ds, param('id')) || items[0];
      var dkeys = Object.keys(one || {}).filter(function (k) { return k !== 'cover' && k !== 'avatar'; }).slice(0, 12);
      var drows = dkeys.map(function (k) { return [k, scalar(one[k]).slice(0, 120)]; });
      html = head +
        '<div class="sf-row"><div class="sf-panel">' +
        pic(one.cover || one.avatar || artFor(dsCat(ds), String(one.id), 'wide'), genTitle(one, ds)) +
        '<div class="sf-card-meta" style="margin-top:10px">' + esc(one.id) + ' · ' + esc(genMeta(one, ds)) + '</div></div>' +
        '<div class="sf-panel">' + table([t('common.item'), t('common.value')], drows) + '</div></div>' +
        '<div class="sf-section">' + sectionHead(t('farm.gallery'), '', '', 12) + genGallery(ds) + '</div>' +
        '<div class="sf-section">' + sectionHead(t('experts.manage'), '', '', 5) +
        '<div class="sf-panel">' + genTimeline(items.filter(function (x) { return x.id !== one.id; }), ds, 5) + '</div></div>' +
        backRow(parent, [['common.viewDetail', 'farms.html'], ['nav.home', 'index.html']]);
      put(html + boost); return;
    }

    switch (tpl) {
      case 'list': {
        var chips = [];
        var key = { farms: 'leaseType', activities: 'kind', produces: 'category', topics: 'board',
          experts: 'title', workorders: 'type', dispatches: 'kind', orders: 'kind', users: 'role',
          comments: 'status', plantings: 'stage', notices: 'level', audits: 'level' }[ds] || 'id';
        var seen = {}, c = 0;
        items.forEach(function (x) { var v = scalar(x[key]); if (v && !seen[v] && c < 4) { seen[v] = 1; chips.push(v); c++; } });
        /* 论坛、评论与论坛频道下的子页以文字列表为主，其余频道保留卡片网格 */
        var isText = ds === 'topics' || ds === 'comments' ||
          b.getAttribute('data-channel') === 'forum.html';
        html = head + '<div class="sf-section">' + searchBar() +
          filters([{ k: t('common.all'), v: '' }].concat(chips.map(function (x) { return { k: x, v: x }; })), 'generic') +
          '<div id="mount-generic"></div></div>';
        put(html + boost);
        listBlock({ id: 'generic', api: 'listAny', loadMore: true, emptyCta: parent,
          layout: isText ? 'text' : 'grid',
          params: function () { return { name: ds, page: state.page, pageSize: isText ? 10 : 8, q: state.q, filter: state.filter }; },
          toCard: function (x) { return isText ? genTextRow(x, ds, self) : genCard(x, ds, self); } });
        return;
      }
      case 'table': {
        var ks = genKeys(items, 6);
        html = head + '<div class="sf-section"><div class="sf-panel">' +
          '<div class="sf-filters" style="margin-bottom:12px">' +
          '<button class="sf-btn" data-act="selectAll" type="button">' + t('common.selectAll') + '</button>' +
          '<button class="sf-btn is-danger" data-act="delete" type="button">' + t('common.delete') + '</button>' +
          '<button class="sf-btn" data-act="share" type="button">' + t('common.share') + '</button></div>' +
          table([''].concat(ks), genRows(items.slice(0, 10), ks).map(function (r) {
            return ['<input type="checkbox" class="sf-check-del" aria-label="select row">'].concat(r);
          })) + '</div></div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 5), ds, 5) + '</div></div>' +
          backRow(parent, [['common.viewDetail', 'farms.html'], ['nav.home', 'index.html']]);
        break;
      }
      case 'form': {
        var labels = ['common.search', 'common.item', 'common.value', 'common.status', 'common.price', 'common.save'];
        html = head + '<div class="sf-section"><form data-form="generic" class="sf-panel"><div class="sf-row">' +
          labels.slice(0, 5).map(function (k, i) {
            return '<div class="sf-field"><label>' + esc(t(k)) + ' · ' + (i + 1) + '</label>' +
              '<input class="sf-input" name="f' + i + '" placeholder="' + esc(lead.slice(0, 26)) + '"></div>';
          }).join('') +
          '</div><div class="sf-field"><label>' + esc(t('forum.body')) + '</label>' +
          '<textarea class="sf-textarea" name="note" placeholder="' + esc(t('workorder.ph')) + '"></textarea></div>' +
          '<button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button></form>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 4), ds, 4) + '</div></div>' +
          backRow(parent, [['common.viewDetail', 'farms.html']]) + '</div>';
        break;
      }
      case 'flow': {
        var steps = ['提交', '初审', '复审', '终审'];
        html = head + '<div class="sf-section"><div class="sf-panel"><div class="sf-flow">' +
          steps.map(function (s, i) {
            return '<div class="sf-step"><b>' + (i + 1) + '. ' + s + '</b><p>' +
              esc(lead.slice(0, 40)) + ' · ' + t('common.status') + '：' + (i < 2 ? t('common.confirm') : t('common.save')) +
              '</p></div>';
          }).join('') + '</div>' +
          '<h3>' + t('experts.manage') + '</h3>' + genTimeline(items.slice(0, 6), ds, 6) +
          '<form data-form="audit-note" class="sf-field" style="margin-top:14px"><label>' + t('forum.reply') + ' / ' + t('common.confirm') + '</label>' +
          '<textarea class="sf-textarea" name="note" placeholder="' + esc(t('workorder.ph')) + '"></textarea>' +
          '<button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button></form></div></div>' +
          backRow(parent, [['nav.home', 'index.html']]);
        break;
      }
      case 'info': {
        html = head + '<div class="sf-section"><div class="sf-panel">' +
          '<p style="line-height:1.95;font-size:14px">' + esc(lead) + '</p>' +
          '<p style="line-height:1.95;font-size:14px">' +
          esc(lang === 'en' ? 'Each record on this page carries an author, a timestamp and the plot it belongs to. Managers update it; the console keeps the full change log.' :
            '本页每条记录都带录入人、时间与所属田块。管理方负责更新，后台保留完整变更日志，不会只留一个结论。') + '</p>' +
          '<p style="line-height:1.95;font-size:14px">' +
          esc(lang === 'en' ? 'If a field looks wrong, use the linked plot record to check seasonal readings and photo receipts before raising a request.' :
            '发现读数对不上时，先顺着关联的田园档案核四季记录与回执照片，再发起需求或工单，处理会快很多。') + '</p>' +
          '</div></div>' +
          '<div class="sf-section">' + sectionHead(t('faq.head'), t('faq.lead')) + faq() + '</div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('home.notices'), '', '', items.length) +
          genTimeline(items.slice(0, 5), ds, 5) + '</div></div>' +
          backRow(parent, [['common.search', 'search.html'], ['nav.home', 'index.html']]);
        break;
      }
      case 'chat': {
        var msgs = M.all('chats').slice(0, 6);
        html = head + '<div class="sf-section"><div class="sf-panel">' +
          '<div class="sf-chat" id="sf-chat">' + msgs.map(bubble).join('') + '</div>' +
          '<form data-form="chat" class="sf-row" style="margin-top:12px;flex-wrap:nowrap">' +
          '<input class="sf-input" name="msg" required placeholder="' + esc(t('workorder.ph')) + '" style="flex:1 1 auto">' +
          '<button class="sf-btn is-primary" type="submit">' + t('workorder.send') + '</button></form></div></div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 4), ds, 4) + '</div></div>' +
          backRow(parent, [['nav.forum', 'forum.html']]);
        break;
      }
      case 'gallery': {
        html = head + '<div class="sf-section">' + sectionHead(t('farm.gallery'), '', '', 12) + genGallery(ds) + '</div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 5), ds, 5) + '</div></div>' +
          backRow(parent, [['nav.farms', 'farms.html']]);
        break;
      }
      case 'success': {
        html = head + '<div class="sf-section"><div class="sf-panel sf-empty">' +
          pic(M.IMG.cute, 'SUMFARM') +
          '<h3>' + esc(h1) + '</h3><p>' + esc(lead) + '</p>' +
          '<div class="sf-hero-actions" style="justify-content:center">' +
          '<a class="sf-btn is-primary" href="' + esc(link(parent, { from: self })) + '">' + t('act.back') + '</a>' +
          '<a class="sf-btn" href="' + esc(link('workorders.html', { from: self })) + '">' + t('workorders.title') + '</a>' +
          '<a class="sf-btn" href="' + esc(link('orders.html', { from: self })) + '">' + t('orders.title') + '</a>' +
          '</div></div></div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 5), ds, 5) + '</div></div>';
        break;
      }
      case 'stats': {
        html = head + '<div class="sf-stats">' +
          '<div class="sf-stat"><b>' + items.length + '</b><span>' + esc(h1) + '</span></div>' +
          '<div class="sf-stat"><b>' + count('workorders') + '</b><span>' + t('workorders.title') + '</span></div>' +
          '<div class="sf-stat"><b>' + count('orders') + '</b><span>' + t('orders.title') + '</span></div>' +
          '<div class="sf-stat"><b>' + count('notices') + '</b><span>' + t('home.notices') + '</span></div></div>' +
          '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('experts.manage'), '', '', items.length) +
          genTimeline(items.slice(0, 6), ds, 6) + '</div></div>' +
          backRow(parent, [['nav.account', 'account.html']]);
        break;
      }
      case 'map': {
        var groups = {};
        items.forEach(function (x) { var r = x.region || '其他'; (groups[r] = groups[r] || []).push(x); });
        var cards = Object.keys(groups).slice(0, 8).map(function (r) {
          var g = groups[r];
          return '<div class="sf-panel"><h3>' + esc(r) + '</h3>' +
            '<div class="sf-card-meta">' + g.length + ' ' + t('common.result') + ' · ' +
            esc(g.map(function (x) { return x.plotNo; }).slice(0, 4).join(' / ')) + '</div></div>';
        });
        html = head + '<div class="sf-section"><div class="sf-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
          cards.join('') + '</div></div>' +
          '<div class="sf-section"><div class="sf-panel">' + table(['田块编号', '田园', '面积（亩）', '当前作物'],
            items.slice(0, 10).map(function (x) {
              return [esc(x.plotNo || ''), esc(zh(x, 'nameZh', 'nameEn')), esc(x.areaMu || ''), esc((x.currentCrops || []).join(' / '))];
            })) + '</div></div>' +
          backRow(parent, [['nav.farms', 'farms.html']]);
        break;
      }
      default: {
        var dk = genKeys(items, 6);
        html = head + '<div class="sf-section"><div class="sf-panel">' +
          table(dk, genRows(items.slice(0, 10), dk)) + '</div></div>' + backRow(parent);
      }
    }
    put(html + boost);
  }

  /* ---------- 分派（唯一一份） ---------- */
  var ROUTES = {
    'index': pageIndex, 'farms': pageFarms, 'farm-detail': pageFarmDetail, 'farm-edit': pageFarmEdit,
    'farm-compare': pageFarmCompare,
    'activity': function () { simpleList({ id: 'activity', title: t('activity.title'), desc: t('activity.desc'), ds: 'activities', api: 'listActivities',
      filterItems: [{ k: t('common.all'), v: '' }].concat(['聚会', '露营', '采摘', '婚纱场地'].map(function (x) { return { k: x, v: x }; })), filterKey: 'kind',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.date + ' · ' + x.kind + ' · ' + x.booked + '/' + x.capacity, tags: [x.kind, x.farmId], price: x.price,
        href: detailLink('activity-detail.html', x.id) }); } }); },
    'activity-detail': function () { detailPage({ api: 'getActivity', titleA: 'titleZh', titleB: 'titleEn', back: 'activity.html',
      rows: function (x, f) { return [['日期', x.date], ['类型', x.kind], ['名额', x.booked + '/' + x.capacity], [t('common.price'), '¥' + x.price], ['田园', zh(f, 'nameZh', 'nameEn')]]; } }); },
    'produce': function () { simpleList({ id: 'produce', title: t('produce.title'), desc: t('produce.desc'), ds: 'produces', api: 'listProduces',
      filterItems: [{ k: t('common.all'), v: '' }].concat(['蔬菜', '菌菇', '果品', '粮油'].map(function (x) { return { k: x, v: x }; })), filterKey: 'category',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'nameZh', 'nameEn'), cover: x.cover,
        meta: x.season + ' · ' + x.category + ' · ' + x.traceNo, tags: [x.category, '库存 ' + x.stock + x.unit], price: x.price,
        href: detailLink('produce-detail.html', x.id) }); } }); },
    'produce-detail': function () { detailPage({ api: 'getProduce', titleA: 'nameZh', titleB: 'nameEn', back: 'produce.html',
      rows: function (x, f) { return [['批次', x.traceNo], ['季节', x.season], ['品类', x.category], ['规格', x.unit], ['库存', x.stock + x.unit], ['溯源田园', zh(f, 'nameZh', 'nameEn') + ' · ' + f.plotNo]]; } }); },
    'videos': function () { simpleList({ id: 'videos', title: t('videos.title'), desc: t('videos.desc'), ds: 'videos', api: 'listVideos',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.duration + ' · ' + x.publishedAt + ' · ' + x.views + ' 次播放', tags: [x.tag, x.farmId], price: '',
        href: link('videos.html', { id: x.id, from: 'videos.html' }) }); } }); },
    'promo': function () { simpleList({ id: 'promo', title: t('promo.title'), desc: t('promo.desc'), ds: 'promos', api: 'listPromos',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.channel + ' · ' + x.publishedAt, tags: [x.channel, x.farmId], price: '',
        href: link('promo.html', { id: x.id, from: 'promo.html' }) }); } }); },
    'forum': pageForum, 'forum-topic': pageForumTopic, 'forum-edit': pageForumEdit,
    'experts': pageExperts, 'expert-detail': pageExpertDetail,
    'dispatch': pageDispatch, 'account': pageAccount, 'orders': pageOrders,
    'workorders': pageWorkorders, 'workorder-detail': pageWorkorderDetail,
    'search': pageSearch, '404': page404,
    'login': function () { pageAuth('access'); },   /* 登录 / 注册合并页 */
    'forgot': function () { pageAuth('forgot'); },
    'workorder-new': function () { pageWorkorderNew(); },
    'admin-login': pageAdminLogin, 'admin-index': pageAdminIndex, 'admin-audit': pageAdminAudit
  };

  /* ---------- 浮层（发布需求 / 关闭） ---------- */
  function modal(html) {
    var m = document.getElementById('sf-modal');
    if (!m) { m = document.createElement('div'); m.id = 'sf-modal'; m.className = 'sf-modal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="sf-modal-box">' + html + '</div>';
    m.classList.add('is-on');
  }
  function closeModal() { var m = document.getElementById('sf-modal'); if (m) m.classList.remove('is-on'); }

  /* ---------- 全局事件委托：动态重建元素无需重绑 ---------- */
  function guard(el) {
    var now = Date.now();
    if (el._busy && now - el._busy < 220) return false;
    el._busy = now; return true;
  }
  function closeSheet() { var s = document.getElementById('sf-sheet'); if (s) s.classList.remove('is-on'); }
  function showErr(form, msg) {
    var box = form.querySelector('[data-err]');
    if (box) { box.textContent = msg; box.classList.add('is-on'); }
    else toast(msg);
  }
  function clearErr(form) { var box = form.querySelector('[data-err]'); if (box) box.classList.remove('is-on'); }
  function onClick(e) {
    /* 点遮罩关闭：发布浮层 / 删除确认 / 移动更多面板都不留死角 */
    if (e.target && (e.target.id === 'sf-modal' || e.target.id === 'sf-sheet')) {
      closeModal(); closeSheet(); return;
    }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), block = el.getAttribute('data-block');
    if (['like', 'follow', 'collect', 'faq', 'sheet-open', 'sheet-close', 'role-pick', 'confirm-delete'].indexOf(act) >= 0 && !guard(el)) return;
    switch (act) {
      case 'lang': T.set(lang === 'zh' ? 'en' : 'zh'); return;
      case 'back': e.preventDefault(); NAV.goBack(el.getAttribute('data-fallback')); return;
      case 'like': {
        var on = el.classList.toggle('is-on');
        el.innerHTML = svgIcon('heart') + ' ' + (on ? t('common.liked') : t('common.like'));
        toast(on ? t('common.toast.liked') : t('common.toast.unliked')); return;
      }
      case 'collect': {
        var c = el.classList.toggle('is-on');
        el.innerHTML = svgIcon('star') + ' ' + (c ? t('common.collected') : t('common.collect'));
        toast(c ? t('common.toast.followed') : t('common.toast.unliked')); return;
      }
      case 'follow': {
        var f = el.classList.toggle('is-on');
        el.textContent = f ? t('common.followed') : t('common.follow');
        toast(t('common.toast.followed')); return;
      }
      case 'share': {
        var copied = false;
        try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(location.href); copied = true; } } catch (x) {}
        toast(copied ? t('common.toast.shared') : t('common.copyFail')); return;
      }
      case 'delete': {
        modal('<div class="sf-confirm-box"><h3>' + t('common.delete') + '</h3>' +
          '<p>' + t('common.deleteConfirm') + '</p><div class="sf-confirm-actions">' +
          '<button class="sf-btn" data-act="modal-close" type="button">' + t('common.cancel') + '</button>' +
          '<button class="sf-btn is-danger" data-act="confirm-delete" type="button">' + t('common.confirm') + '</button>' +
          '</div></div>'); return;
      }
      case 'confirm-delete': {
        closeModal();
        var removed = 0;
        document.querySelectorAll('tr').forEach(function (tr) {
          var cb = tr.querySelector('.adm-check, .sf-check-del');
          if (cb && cb.checked) { tr.remove(); removed++; }
        });
        toast(t('common.toast.deleted') + (removed ? ' · ' + removed : '')); return;
      }
      case 'selectAll': {
        var boxes = Array.prototype.slice.call(document.querySelectorAll('.adm-check, .sf-check-del'));
        var all = boxes.length > 0 && boxes.every(function (c) { return c.checked; });
        boxes.forEach(function (c) { c.checked = !all; });
        el.textContent = all ? t('common.selectAll') : t('common.cancelAll');
        toast(all ? t('common.toast.unselected') : t('common.toast.selected')); return;
      }
      case 'faq': e.preventDefault(); el.parentNode.classList.toggle('is-open'); return;
      case 'page': case 'dot': {
        var p = parseInt(el.getAttribute('data-p'), 10);
        state.page = p; if (block && BLOCKS[block]) rerender(block);
        return;
      }
      case 'prev': {
        if (el.disabled) { toast(t('common.toast.empty')); return; }
        state.page = Math.max(1, state.page - 1); if (block && BLOCKS[block]) rerender(block); return;
      }
      case 'next': {
        if (el.disabled) { toast(t('common.toast.last')); return; }
        state.page = state.page + 1; if (block && BLOCKS[block]) rerender(block); return;
      }
      case 'loadMore': {
        var cfg = BLOCKS[block];
        if (cfg && !el.disabled) {
          el.disabled = true; el.classList.add('is-loading'); el.textContent = t('common.loading');
          API[cfg.api](Object.assign({}, cfg.params(), { pageSize: state.loaded + 4 })).then(function (pg) {
            state.loaded += 4;
            var el2 = document.getElementById('block-' + block);
            if (el2) { var g = el2.querySelector('.sf-grid, .sf-textlist');
              if (g) g.innerHTML = pg.items.map(cfg.toCard).join(''); }
            var full = pg.items.length >= state.loaded;
            el.disabled = full; el.classList.remove('is-loading');
            el.textContent = full ? t('common.allLoaded') : t('common.loadMore');
            toast(pg.items.length + ' ' + t('common.result'));
          });
        }
        return;
      }
      case 'filter': {
        state.filter = el.getAttribute('data-v'); state.page = 1;
        document.querySelectorAll('[data-act="filter"][data-block="' + block + '"]').forEach(function (c) { c.classList.remove('is-on'); });
        el.classList.add('is-on'); if (BLOCKS[block]) rerender(block); return;
      }
      case 'compare-build': {
        /* 多选 → 按显式 ids 参数生成对比清单；页面完全由 URL 参数渲染 */
        var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-act="compare-pick"]:checked'));
        var ids = boxes.map(function (b) { return b.getAttribute('data-v'); });
        if (ids.length < 2) { toast(t('compare.underLimit')); return; }
        if (ids.length > 4) { toast(t('compare.overLimit')); return; }
        location.href = link('farm-compare.html', { ids: ids.join(',') });
        return;
      }
      case 'compare-clear': {
        toast(t('compare.clear'));
        location.href = link('farm-compare.html');
        return;
      }
      case 'compare-toggle': {
        var tbl = document.querySelector('[data-compare-table]');
        if (!tbl) return;
        var on = !tbl.classList.contains('is-hide-same');
        tbl.classList.toggle('is-hide-same', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.textContent = on ? t('compare.showAll') : t('compare.hideSame');
        toast(on ? t('compare.hideSame') : t('compare.showAll'));
        return;
      }
      case 'tab': {
        /* 接单已改为常驻功能分区：快速定位按钮滚动到对应分区，不再切换卡片列表 */
        var v = el.getAttribute('data-v'); state.scope = v;
        document.querySelectorAll('#dispatch-tabs .sf-chip').forEach(function (c) { c.classList.remove('is-on'); });
        el.classList.add('is-on');
        var z = document.getElementById('zone-' + v);
        if (z) { z.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(el.textContent); }
        return;
      }
      case 'account-tab': {
        /* 个人中心同理：按功能分区常驻展示，chip 只做定位 */
        state.tab = el.getAttribute('data-v');
        document.querySelectorAll('[data-act="account-tab"]').forEach(function (c) { c.classList.remove('is-on'); });
        el.classList.add('is-on');
        var az = document.getElementById('zone-' + state.tab);
        if (az) { az.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(el.textContent); }
        return;
      }
      case 'more': return; // href 指向真实列表页
      case 'open-modal': {
        e.preventDefault();
        modal('<h3>' + t('workorders.new') + '</h3><form data-form="newjob">' +
          '<div class="sf-field"><label>' + t('workorder.type') + '</label><select class="sf-select" name="type">' +
          (M.JOB_TYPES || []).map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
          field('田地编号', 'plot') + field('说明', 'desc', 'textarea', '写清时间与验收要求') +
          '<div class="sf-row"><button class="sf-btn is-primary" type="submit">' + t('common.submit') + '</button>' +
          '<button class="sf-btn" data-act="modal-close" type="button">' + t('common.close') + '</button></div></form>');
        return;
      }
      case 'modal-close': e.preventDefault(); closeModal(); return;
      case 'sheet-open': { var sh = document.getElementById('sf-sheet'); if (sh) sh.classList.add('is-on'); return; }
      case 'sheet-close': closeSheet(); return;
      case 'role-pick': {
        /* 兼容层：合并账号页的角色已收成下拉，旧卡片式选择不再渲染，保留分支避免死链 */
        document.querySelectorAll('[data-act="role-pick"]').forEach(function (c) { c.classList.remove('is-on'); });
        el.classList.add('is-on'); return;
      }
      case 'auth-mode': {
        /* 合并账号页：点 Tab / 底部切换 → 只换当前表单，不跳页、不新增历史 */
        var v = el.getAttribute('data-v') === 'register' ? 'register' : 'login';
        var cur = document.querySelector('.sf-auth-mode:not([hidden])');
        if (cur && cur.getAttribute('data-mode') === v) return;  // 重复点当前模式：无多余反馈
        document.querySelectorAll('.sf-auth-mode').forEach(function (m) {
          m.hidden = m.getAttribute('data-mode') !== v;
        });
        document.querySelectorAll('.sf-auth-tab').forEach(function (b) {
          b.classList.toggle('is-on', b.getAttribute('data-v') === v);
        });
        var au = new URL(location.href); au.searchParams.set('mode', v);
        global.history.replaceState(null, '', au.toString());
        toast(v === 'login' ? t('auth.mode.login') : t('auth.mode.register'));
        return;
      }
      case 'signout': toast(t('auth.signout')); location.replace(global.SF_AUTH.signOut()); return;
      case 'audit-step': toast(el.getAttribute('data-level') + ' · 审核意见已记录'); return;
      case 'logout': location.href = link('admin/login.html', { from: 'index.html' }); return;
    }
  }
  function onSubmit(e) {
    var f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    if (f._sending) return;               // 重复提交边界：同一表单加锁
    var kind = f.getAttribute('data-form');
    var d = {}; new FormData(f).forEach(function (v, k) { d[k] = v; });
    if (kind === 'search') {
      /* hero 内搜索是全站统一入口：一律落到搜索结果页，并带来源便于逐层返回 */
      location.href = link('search.html', { q: d.q || '', from: hereFile() }); return;
    }
    if (kind === 'login' || kind === 'register' || kind === 'forgot') {
      var A = global.SF_AUTH;
      if (!A) return;
      var err = A.validate(d, kind);
      if (kind === 'forgot') {
        var fmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.phone || '') || /^1\d{10}$/.test(d.phone || '');
        if (!fmt) err = 'format';
      }
      if (err) { showErr(f, t('auth.err.' + err)); return; }
      clearErr(f);
      if (kind === 'login') {
        var r = A.signIn(d, param('from', 'account.html'));
        if (!r.ok) { showErr(f, t('auth.err.credential')); return; }
        f._sending = true; toast(t('auth.ok.login')); location.href = r.url; return;
      }
      if (kind === 'register') {
        f._sending = true; toast(t('auth.ok.register'));
        location.href = A.signUp(d, param('from', 'account.html')).url; return;
      }
      f._sending = true; toast(t('auth.ok.reset'));
      f.innerHTML = '<div class="sf-panel sf-empty">' + pic(M.IMG.process, 'reset') +
        '<h3>' + t('auth.ok.reset') + '</h3><p>' + t('auth.reset.s2') + '</p>' +
        '<a class="sf-btn is-primary" href="' + link('login.html', { from: param('from', 'account.html') }) + '">' +
        t('auth.backLogin') + '</a></div>';
      return;
    }
    if (kind === 'farm') { API.saveFarm(d).then(function (r) { toast(t('common.toast.saved') + ' · ' + r.auditId); }); return; }
    if (kind === 'topic') { API.saveTopic(d).then(function (r) { toast(t('common.toast.saved')); }); return; }
    if (kind === 'reply' || kind === 'chat' || kind === 'audit-note') {
      var box = document.getElementById('sf-chat');
      var msg = d.msg || d.body || d.note || '';
      if (box) {
        var div = document.createElement('div'); div.className = 'sf-bubble is-me';
        div.innerHTML = esc(msg) + '<span class="sb-time">刚刚</span>'; box.appendChild(div); box.scrollTop = box.scrollHeight;
      }
      f.reset(); toast(t('common.toast.saved')); return;
    }
    if (kind === 'generic') {
      f._sending = true; f.reset(); toast(t('common.toast.saved'));
      setTimeout(function () { f._sending = false; }, 400); return;
    }
    if (kind === 'newjob') { closeModal(); toast(t('common.toast.submitted')); return; }
    if (kind === 'newjob-farm') {
      /* 提交后工单挂到这块田：明细条目逐条落盘，状态固定为「待接单」 */
      if (!d.scope || !d.acceptance || !d.type) { showErr(f, t('auth.err.missing')); return; }
      f._sending = true;
      var jobId = 'W' + String(900 + Math.floor(Math.random() * 90));
      var farm2 = M.byId('farms', d.farmId) || {};
      var lines = [
        [t('job.new.scope'), d.scope], [t('job.new.window'), d.window],
        [t('job.new.acceptance'), d.acceptance], [t('job.new.materials'), d.materials],
        [t('job.new.qualification'), d.qualification], [t('job.new.safety'), d.safety],
        [t('job.new.remark'), d.remark], [t('job.new.priority'), d.priority],
        [t('job.new.settle'), d.settle],
        [t('job.new.photosRule'), d.photo ? (lang === 'en' ? 'Required' : '需要') : (lang === 'en' ? 'Not required' : '不需要')]
      ].filter(function (x) { return x[1]; });
      var reqTable = '<div class="sf-table-wrap"><table class="sf-table"><thead><tr><th>' +
        esc(t('common.item')) + '</th><th>' + esc(t('common.value')) + '</th></tr></thead><tbody>' +
        lines.map(function (x) { return '<tr><th>' + esc(x[0]) + '</th><td>' + esc(x[1]) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
      var okBox = '<div class="sf-panel sf-empty" data-job-ok>' +
        '<h3>' + t('job.new.ok') + '</h3>' +
        '<p>' + esc(jobId) + ' · ' + esc(zh(farm2, 'nameZh', 'nameEn') + ' · ' + (farm2.plotNo || d.farmId)) + '<br>' +
        esc(d.type) + ' · ' + esc(d.due || '') + ' · ¥' + esc(d.budget || '') + '</p>' +
        '<div class="sf-job-detail-head">' + jobBadge({ statusKey: 'open', status: '待接单' }) +
        '<span class="sf-job-flow-stat">' + esc(t('job.new.okStatus')) + '</span></div>' +
        '<div class="sf-section" style="text-align:left">' + sectionHead(t('job.new.okReq'), t('job.new.section.desc'), '', lines.length) +
        reqTable + '</div>' +
        '<div class="sf-confirm-actions">' +
        '<a class="sf-btn is-primary" href="' + esc(link(param('from', 'account.html'), {})) + '">' + t('job.new.back') + '</a>' +
        '<a class="sf-btn" href="' + esc(link('workorders.html', { farmId: d.farmId, from: param('from', 'account.html') })) + '">' + t('job.new.all') + '</a>' +
        '</div></div>';
      var holder = document.createElement('div'); holder.innerHTML = okBox;
      f.parentNode.replaceChild(holder.firstChild, f);
      toast(t('common.toast.submitted')); return;
    }
    if (kind === 'admin-login') {
      f._sending = true;
      API.adminLogin(d).then(function () {
        location.href = link('admin/index.html', { m: 'dashboard' });
      }); return;
    }
  }
  /* 下拉类控件：切换田园时按显式 farmId 重新渲染，不依赖 referrer / 会话存储 */
  function onChange(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    switch (el.getAttribute('data-act')) {
      case 'farm-switch':
        location.href = link('workorder-new.html', {
          farmId: el.value, from: param('from', 'account.html')
        });
        return;
      case 'compare-pick': {
        var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-act="compare-pick"]:checked'));
        if (boxes.length > 4) {
          el.checked = false;
          toast(t('compare.overLimit'));
          return;
        }
        document.querySelectorAll('.sf-compare-pick').forEach(function (lb) {
          var b = lb.querySelector('input');
          if (b) lb.classList.toggle('is-on', b.checked);
        });
        var cnt = document.querySelector('[data-compare-count] b');
        if (cnt) cnt.textContent = String(boxes.length);
        return;
      }
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { closeModal(); closeSheet(); return; }
    if (!state.lastPager) return;
    if (e.key === 'ArrowLeft' && state.page > 1) { state.page--; rerender(Object.keys(BLOCKS)[0]); }
    if (e.key === 'ArrowRight' && state.page < state.lastPager.pages) { state.page++; rerender(Object.keys(BLOCKS)[0]); }
  }
  var touchX = null;
  function onTouchStart(e) { touchX = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX === null || !state.lastPager) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    var id = Object.keys(BLOCKS)[0]; if (!id) return;
    if (dx < -60 && state.page < state.lastPager.pages) { state.page++; rerender(id); }
    if (dx > 60 && state.page > 1) { state.page--; rerender(id); }
  }
  /* 静态首屏双语替换：zh/en 都来自 I18N 与页级文案中另行撰写的真文案 */
  var PC = global.SF_PAGE_COPY || {};
  function pageCopy(field) {
    var c = PC[document.body.getAttribute('data-page')];
    if (c && c[field]) return c[field][lang] || c[field].zh;
    return null;
  }
  /* 角色专属按钮：普通用户不该被问「我为什么能上传田园」。
     核心判断只读显式 ?role= 参数，不依赖 referrer / 会话存储。 */
  function applyRoleButtons() {
    var box = document.querySelector('.sf-hero-actions');
    if (!box) return;
    var st = global.SF_AUTH ? global.SF_AUTH.read() : { role: '' };
    var role = st.role || '', hidden = 0;
    box.querySelectorAll('a[data-role]').forEach(function (a) {
      var allow = (a.getAttribute('data-role') || '').split(/\s+/);
      var ok = !!role && allow.indexOf(role) >= 0;
      a.hidden = !ok;
      if (!ok) hidden++;
    });
    if (!hidden) return;
    var hint = document.createElement('p');
    hint.className = 'sf-role-hint';
    hint.innerHTML = esc(lang === 'en'
      ? 'This action belongs to a specific account type. Sign in with the matching role, or start from your role on the home page.'
      : '这个按钮属于特定身份的操作。请用对应身份登录，或从首页「按身份进入」找到自己的入口。') +
      ' <a href="' + esc(link('login.html', { from: location.pathname.split('/').pop() })) + '">' +
      esc(lang === 'en' ? 'Sign in' : '去登录') + '</a>';
    box.parentNode.insertBefore(hint, box);
  }

  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-ph'));
      if (v) el.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-copy]').forEach(function (el) {
      var v = pageCopy(el.getAttribute('data-copy'));
      if (v) el.textContent = v;
    });
  }
  function init() {
    API.config.lang = lang;
    NAV.render();
    applyStaticI18n();
  applyRoleButtons();
    if (param('welcome')) toast(t('auth.welcome'));
    state.q = param('q', ''); state.page = parseInt(param('page', '1'), 10) || 1;
    state.filter = param('filter', ''); state.tab = param('tab', ''); state.scope = param('scope', '');
    syncHeroSearch();
    var page = document.body.getAttribute('data-page') || 'index';
    (ROUTES[page] || pageGeneric)();
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  global.SF_APP = { init: init, toast: toast, link: link };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
