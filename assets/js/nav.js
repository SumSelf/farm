/* 闪马田园 SUMFARM · 统一导航（单点抽离） v1.7.0
   - PC 顶部折叠浮窗 / 移动底部栏，映射表全站只写这一份
   - 后台入口不在前台出现：主导航、移动浮层、页脚均不暴露，仅独立 URL 可达
   - 登录态由 SF_AUTH 显式参数驱动，链接统一经 decorate 透传
   - data-channel 决定一级频道高亮；data-sub 决定首页子栏目高亮
*/
(function (global) {
  'use strict';
  var V = '1.7.0';
  var NAV = [
    { key: 'nav.home', file: 'index.html', subs: [
      { key: 'sub.videos', file: 'videos.html' },
      { key: 'sub.activity', file: 'activity.html' },
      { key: 'sub.produce', file: 'produce.html' },
      { key: 'sub.promo', file: 'promo.html' }
    ] },
    { key: 'nav.farms', file: 'farms.html' },
    { key: 'nav.forum', file: 'forum.html' },
    { key: 'nav.experts', file: 'experts.html' },
    { key: 'nav.dispatch', file: 'dispatch.html' },
    { key: 'nav.account', file: 'account.html' },
    /* 价格公示：所有业务节点的租金与费用都挂到这一级，子栏目逐个列全 */
    { key: 'nav.price', file: 'price.html', subs: [
      { key: 'price.lease', file: 'price-lease.html' },
      { key: 'price.venue', file: 'price-venue.html' },
      { key: 'price.job', file: 'price-job.html' },
      { key: 'price.produce', file: 'price-produce.html' },
      { key: 'price.calc', file: 'price-calc.html' },
      { key: 'price.rulesPage', file: 'price-rules.html' },
      { key: 'price.changesPage', file: 'price-changes.html' }
    ] }
  ];
  var MOBILE = ['nav.home', 'nav.farms', 'nav.forum', 'nav.experts', 'nav.more'];
  var ICON = {
    'nav.home': '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    'nav.farms': '<svg viewBox="0 0 24 24"><path d="M4 19h16v2H4zm2-3l4-9 4 9 4-9 2 1-6 12H0L6 7z"/></svg>',
    'nav.forum': '<svg viewBox="0 0 24 24"><path d="M3 3h18v13H8l-5 5z"/></svg>',
    'nav.experts': '<svg viewBox="0 0 24 24"><path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1z"/></svg>',
    'nav.account': '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/></svg>',
    'nav.more': '<svg viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>'
  };
  function t(k) { return global.SF_I18N.t(k); }
  function A() { return global.SF_AUTH; }
  function href(f, extra) { return A() ? A().decorate(f, extra) : f; }
  function here() { return location.pathname.split('/').pop() || 'index.html'; }
  function isAdmin() { return location.pathname.indexOf('/admin/') >= 0; }
  function bodyAttr(k) { return document.body.getAttribute(k) || ''; }

  function userTools() {
    var on = A() && A().authed();
    var u = on ? A().user() : null;
    if (on) {
      return '<a class="sf-btn sf-nav-desktop-only" href="' + href('account.html') + '" data-nav="nav.account">' +
               escAttr(u ? u.name : t('nav.account')) + '</a>' +
             '<button class="sf-btn is-quiet" data-act="signout" type="button" aria-label="' + escAttr(t('auth.signout')) + '">' +
               t('auth.signout') + '</button>';
    }
    /* 登录与注册已合并为单页双模式：导航只留一个入口，不再重复两个按钮 */
    return '<a class="sf-btn is-primary" href="' + href('login.html', { from: here() }) + '" data-nav="auth.login">' + t('auth.access') + '</a>';
  }
  function escAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function moreSheet() {
    var on = A() && A().authed();
    var items = NAV[0].subs.map(function (s) { return { label: t(s.key), file: s.file }; });
    items.push({ label: t('nav.dispatch'), file: 'dispatch.html' });
    items.push({ label: t('nav.price'), file: 'price.html' });
    items.push({ label: t('price.lease'), file: 'price-lease.html' });
    items.push({ label: t('price.calc'), file: 'price-calc.html' });
    items.push({ label: t('orders.title'), file: 'orders.html' });
    items.push({ label: t('common.search'), file: 'search.html' });
    items.push({ label: t('help.title'), file: 'help.html' });
    return '<div class="sf-sheet" id="sf-sheet" aria-hidden="true">' +
      '<div class="sf-sheet-box"><div class="sf-sheet-head"><b>' + t('nav.more') + '</b>' +
      '<button class="sf-btn is-quiet" data-act="sheet-close" type="button" aria-label="' + escAttr(t('common.close')) + '">✕</button></div>' +
      '<div class="sf-sheet-grid">' + items.map(function (x) {
        return '<a class="sf-sheet-item" href="' + href(x.file) + '">' + escAttr(x.label) + '</a>';
      }).join('') + '</div>' +
      '<div class="sf-sheet-foot">' +
        (on
          ? '<a class="sf-btn" href="' + href('account.html') + '">' + t('nav.account') + '</a>' +
            '<button class="sf-btn is-quiet" data-act="signout" type="button">' + t('auth.signout') + '</button>'
          : '<a class="sf-btn is-primary" href="' + href('login.html', { from: here() }) + '">' + t('auth.access') + '</a>') +
        '<button class="sf-btn is-quiet" data-act="lang" type="button">' + t('act.lang') + '</button>' +
      '</div></div></div>';
  }

  function render() {
    if (isAdmin()) return; // 后台独立登录与管理，不注入前台导航，也不暴露回前台的主导航
    var host = document.getElementById('sf-nav');
    if (!host) return;
    var channel = bodyAttr('data-channel') || here();
    var sub = bodyAttr('data-sub');
    var links = NAV.map(function (n) {
      var active = channel === n.file ? ' is-active' : '';
      var subHtml = '';
      if (n.subs) {
        subHtml = '<div class="sf-nav-sub">' + n.subs.map(function (s) {
          var cur = (sub === s.file || here() === s.file) ? ' is-current' : '';
          return '<a class="' + cur.trim() + '" href="' + href(s.file) + '">' + t(s.key) + '</a>';
        }).join('') + '</div>';
      }
      return '<div class="sf-nav-item">' +
        '<a class="sf-nav-link' + active + '" href="' + href(n.file) + '" data-nav="' + n.key + '">' +
        t(n.key) + (n.subs ? ' ▾' : '') + '</a>' + subHtml + '</div>';
    }).join('');
    host.innerHTML =
      '<div class="sf-nav">' +
        '<div class="sf-nav-in">' +
          '<a class="sf-brand" href="' + href('index.html') + '">' +
            '<span class="sf-brand-mark">田</span><span>闪马田园<small>SUMFARM · ' + t('brand.sub') + '</small></span>' +
          '</a>' +
          '<nav class="sf-nav-links">' + links + '</nav>' +
          '<div class="sf-nav-tools">' +
            '<a class="sf-btn sf-nav-desktop-only" href="' + href('search.html') + '">' + t('common.search') + '</a>' +
            '<button class="sf-btn is-quiet" data-act="lang" type="button" aria-label="' + escAttr(t('act.lang')) + '">' + t('act.lang') + '</button>' +
            userTools() +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sf-mobile-bar">' +
        MOBILE.map(function (k) {
          var n = NAV.filter(function (x) { return x.key === k; })[0];
          if (k === 'nav.more') {
            return '<button class="sf-mobile-more' + '" data-act="sheet-open" type="button" aria-label="' + escAttr(t('nav.more')) + '">' +
              ICON[k] + '<span>' + t(k) + '</span></button>';
          }
          return '<a href="' + href(n.file) + '" class="' + (channel === n.file ? 'is-active' : '') + '">' +
            ICON[k] + '<span>' + t(k) + '</span></a>';
        }).join('') +
      '</div>' + moreSheet();
    bindDropdown();
    renderFoot();
  }
  /* 首页下拉：CSS 透明桥接补上 8px 间隙，这里再加 220ms 延时关闭，
     鼠标斜移 / 键盘 Tab 都不会让菜单一闪就消失；动态重建后随 render 重新绑定。 */
  function bindDropdown() {
    document.querySelectorAll('.sf-nav-item').forEach(function (it) {
      var sub = it.querySelector('.sf-nav-sub');
      if (!sub) return;
      var timer = null;
      function open() { clearTimeout(timer); it.classList.add('is-open'); }
      function close() {
        clearTimeout(timer);
        timer = setTimeout(function () { it.classList.remove('is-open'); }, 220);
      }
      it.addEventListener('mouseenter', open);
      it.addEventListener('mouseleave', close);
      sub.addEventListener('mouseenter', open);
      sub.addEventListener('mouseleave', close);
      it.addEventListener('focusin', open);
      it.addEventListener('focusout', function (e) {
        if (!it.contains(e.relatedTarget)) { clearTimeout(timer); it.classList.remove('is-open'); }
      });
    });
  }
  function renderFoot() {
    var f = document.getElementById('sf-foot');
    if (!f) return;
    var links = [
      ['help.title', 'help.html'], ['about.title', 'about.html'], ['contact.title', 'contact.html'],
      ['terms.title', 'terms.html'], ['privacy.title', 'privacy.html'], ['sitemap.title', 'sitemap.html'],
      ['nav.price', 'price.html'], ['price.changesPage', 'price-changes.html']
    ];
    f.innerHTML = '<div class="sf-foot-in">' +
      '<span>sumfarm 闪马共享田园平台 · Made by 闪马科技个人工作室</span>' +
      '<nav class="sf-foot-links">' + links.map(function (x) {
        return '<a href="' + href(x[1]) + '">' + t(x[0]) + '</a>';
      }).join('') + '</nav>' +
      '<span class="sf-spacer"></span>' +
      '<span>© 2026 SUMSTC. ' + t('foot.rights') + ' · 蜀ICP备18013136号 · v' + V + '</span>' +
      '</div>';
  }
  /* 返回三情形：逐层回退 / 直达子页回所属上级 / 无历史 replace 兜底，不新增历史 */
  function goBack(fallback) {
    var u = new URL(location.href);
    var from = u.searchParams.get('from');
    if (from && /^[a-z0-9\-]+\.html$/i.test(from)) { location.replace(href(from)); return; }
    if (global.history.length > 1) { global.history.back(); return; }
    location.replace(href(fallback || 'index.html'));
  }
  global.SF_NAV = { render: render, goBack: goBack, NAV: NAV, href: href, V: V };
})(window);
