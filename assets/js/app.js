/* 闪马田园 SUMFARM · 前端应用 v1.7.0
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

  /* ---------- 全站业务流程图（公共关系只写这一份） ----------
     每个频道按真实办理顺序列出全部子页：当前页高亮、其余可点直达、末尾回频道首页。
     作用是把流程子页接进业务流，避免「只能靠顶栏或地址进入」的孤立页面。
     条目格式：[文件, 中文名, 英文名]；文件名全部取自实际存在的页面，新增引用即校验。 */
  var FLOW_GROUPS = [
    { home: 'farms.html', zh: '田园档案与承包流程', en: 'Plot archive & lease workflow', steps: [
      ['farms.html', '田园档案', 'Plot archive'], ['farms-region.html', '按地区找田', 'By region'],
      ['farms-soil.html', '按土壤筛选', 'By soil'], ['farms-map.html', '田块分布图', 'Plot map'],
      ['farms-lease.html', '承包租赁', 'Lease'], ['farms-favorites.html', '我的收藏', 'Favorites'],
      ['farm-compare.html', '田块对比', 'Compare'], ['farm-detail.html', '田块详情', 'Plot detail'],
      ['farm-gallery.html', '田园图册', 'Gallery'], ['farm-comments.html', '田园评论', 'Reviews'],
      ['farm-follow.html', '关注动态', 'Following'], ['farm-contract.html', '承包合同', 'Contract'],
      ['farm-payment.html', '费用支付', 'Payment'], ['farm-edit.html', '上传档案', 'Submit plot'],
      ['farm-manage.html', '田园管理', 'Manage plot'], ['farm-success.html', '发布成功', 'Published'],
      ['submission-status.html', '审核进度', 'Approval progress']] },
    { home: 'forum.html', zh: '论坛版块与发帖流程', en: 'Forum boards & posting workflow', steps: [
      ['forum.html', '论坛首页', 'Forum home'], ['forum-hot.html', '热门田园', 'Popular plots'],
      ['forum-exp.html', '种植经验', 'Growing notes'], ['forum-act.html', '活动复盘', 'Event recap'],
      ['forum-tech.html', '技术咨询', 'Tech Q&A'], ['forum-best.html', '精华采纳', 'Best posts'],
      ['forum-rules.html', '版规说明', 'Board rules'], ['forum-edit.html', '发起新帖', 'New post'],
      ['forum-posted.html', '我已发布', 'My posts'], ['forum-mine.html', '我的收藏', 'Saved threads'],
      ['forum-topic.html', '帖子详情', 'Thread detail']] },
    { home: 'experts.html', zh: '专家认证与技术产出流程', en: 'Expert accreditation & output workflow', steps: [
      ['experts.html', '专家广场', 'Experts'], ['experts-rank.html', '积分排行', 'Ranking'],
      ['expert-detail.html', '专家主页', 'Profile'], ['expert-points.html', '积分口径', 'Points rules'],
      ['expert-column.html', '技术专栏', 'Columns'], ['expert-qa.html', '技术问答', 'Q&A'],
      ['expert-apply.html', '认证申请', 'Apply'], ['expert-history.html', '管理历史', 'History'],
      ['expert-trials.html', '种植实践', 'Field trials'],
      ['expert-conclusion.html', '技术结论', 'Technical conclusion']] },
    { home: 'dispatch.html', zh: '接单与农事工单流程', en: 'Dispatch & work-order workflow', steps: [
      ['dispatch.html', '接单大厅', 'Dispatch home'], ['dispatch-nearby.html', '定位附近单', 'Nearby jobs'],
      ['dispatch-linked.html', '关联田园单', 'Linked plots'], ['dispatch-taken.html', '已接工单', 'Accepted'],
      ['dispatch-accept.html', '承接确认', 'Accept'], ['dispatch-receipt.html', '作业回执', 'Receipts'],
      ['dispatch-verify.html', '验收核对', 'Verify'], ['dispatch-settle.html', '结算对账', 'Settlement'],
      ['dispatch-history.html', '历史工单', 'History'], ['workorders.html', '工单总览', 'All orders'],
      ['workorder-new.html', '按田建单', 'New order'], ['workorder-detail.html', '工单详情', 'Order detail']] },
    { home: 'workorders.html', zh: '农事工单类型', en: 'Work-order types', steps: [
      ['job-tilling.html', '翻地', 'Tilling'], ['job-sowing.html', '种植', 'Sowing'],
      ['job-water.html', '浇水', 'Watering'], ['job-harvest.html', '采摘', 'Harvest'],
      ['job-expert.html', '专家指导', 'Expert guidance']] },
    { home: 'produce.html', zh: '农产品溯源与结算流程', en: 'Produce trace & checkout workflow', steps: [
      ['produce.html', '农产品', 'Produce'], ['produce-season.html', '时令清单', 'Seasonal'],
      ['produce-trace.html', '溯源档案', 'Traceability'], ['produce-detail.html', '产品详情', 'Detail'],
      ['produce-cart.html', '购物车', 'Cart'], ['produce-stock.html', '库存台账', 'Stock'],
      ['produce-checkout.html', '结算下单', 'Checkout'], ['produce-delivery.html', '配送跟踪', 'Delivery'],
      ['produce-receipt.html', '签收回执', 'Receipt'], ['produce-review.html', '产品评价', 'Review']] },
    { home: 'activity.html', zh: '活动与场地预约流程', en: 'Events & venue booking workflow', steps: [
      ['activity.html', '田园活动', 'Activities'], ['activity-calendar.html', '活动日历', 'Calendar'],
      ['activity-signup.html', '活动报名', 'Sign-up'], ['activity-checkin.html', '现场签到', 'Check-in'],
      ['activity-detail.html', '活动详情', 'Event detail'], ['activity-members.html', '参与成员', 'Members'],
      ['activity-review.html', '活动回顾', 'Recap'], ['venue-booking.html', '场地预约', 'Book a venue'],
      ['venue-menu.html', '农家菜单', 'Farm menu'], ['venue-sports.html', '运动场地', 'Sports field'],
      ['venue-wedding.html', '婚纱场地', 'Wedding lawn'], ['venue-camping.html', '露营营位', 'Camping pitch']] },
    { home: 'account.html', zh: '个人中心与账户管理', en: 'Account & personal centre', steps: [
      ['account.html', '个人中心', 'My centre'], ['orders.html', '我的订单', 'Orders'],
      ['account-profile.html', '资料设置', 'Profile'], ['account-security.html', '账号安全', 'Security'],
      ['account-bind.html', '绑定管理', 'Linked accounts'], ['account-address.html', '收货地址', 'Addresses'],
      ['account-notice.html', '消息通知', 'Notifications'], ['account-favorites.html', '我的收藏', 'Favorites'],
      ['account-following.html', '我的关注', 'Following'], ['account-invoice.html', '发票管理', 'Invoices'],
      ['account-help.html', '帮助工单', 'Help tickets'], ['account-close.html', '注销申请', 'Close account'],
      ['order-detail.html', '订单详情', 'Order detail'], ['merchant-orders.html', '收到的订单', 'Incoming orders']] },
    { home: 'price.html', zh: '租金与价格公示流程', en: 'Rent & published price workflow', steps: [
      ['price.html', '价格公示总览', 'Price book'], ['price-lease.html', '田块租金标准', 'Plot rent standard'],
      ['price-venue.html', '场地与活动价目', 'Venue & event rates'], ['price-job.html', '工单与专家服务价', 'Field-work & expert rates'],
      ['price-produce.html', '农产品与配送价目', 'Produce & delivery rates'], ['price-calc.html', '租金试算', 'Rent calculator'],
      ['price-rules.html', '公示规则与口径', 'Rules & basis'], ['price-changes.html', '调价公示历史', 'Rate change log']] },
    { home: 'api-catalog.html', zh: '接口目录与数据仿真', en: 'API catalogue & data simulation', steps: [
      ['api-catalog.html', '统一接口目录', 'API catalogue'],
      ['api-lab.html', '数据仿真', 'Data simulation'],
      ['help.html', '对接帮助', 'Integration help']] },
    { home: 'sitemap.html', zh: '站点服务与公共页面', en: 'Site services & public pages', steps: [
      ['sitemap.html', '站点地图', 'Sitemap'], ['help.html', '帮助中心', 'Help centre'],
      ['search.html', '全站搜索', 'Search'], ['videos.html', '热点视频', 'Videos'],
      ['promo.html', '田园宣发', 'Campaigns'], ['about.html', '关于我们', 'About'],
      ['contact.html', '联系我们', 'Contact'], ['terms.html', '服务协议', 'Terms'],
      ['privacy.html', '隐私政策', 'Privacy'], ['disclaimer.html', '免责声明', 'Disclaimer'],
      ['maintenance.html', '维护公告', 'Maintenance']] },
    { home: 'workorders.html', zh: "工单售后与变更流程", en: "Job aftercare & changes", steps: [
      ['workorders.html', "工单总览", "All jobs"],
      ['workorder-cancel.html', "取消工单", "Cancel a job"],
      ['workorder-refund.html', "申请退款", "Request a refund"],
      ['workorder-refund-status.html', "退款进度", "Refund progress"],
      ['workorder-edit.html', "修改工单", "Amend a job"],
      ['workorder-reopen.html', "重新发起工单", "Reissue a job"],
      ['workorder-changes.html', "工单变更记录", "Job change log"]] },
    { home: 'farm-manage.html', zh: "租赁、合同、对账与活动运营", en: "Lease, contracts, reconciliation & events", steps: [
      ['farm-manage.html', "田园管理", "Plot management"],
      ['lease-edit.html', "修改租赁信息", "Edit lease terms"],
      ['contract-manage.html', "合同管理", "Contract management"],
      ['contract-edit.html', "编辑合同内容", "Edit contract clauses"],
      ['contract-versions.html', "合同版本对比", "Contract version diff"],
      ['merchant-reconcile.html', "对账中心", "Reconciliation centre"],
      ['merchant-bills.html', "账单明细", "Bill lines"],
      ['merchant-reconcile-detail.html', "对账单详情", "Statement detail"],
      ['activity-manage.html', "活动管理", "Event management"],
      ['activity-publish.html', "发布活动", "Publish an event"],
      ['activity-edit.html', "更新活动", "Update an event"],
      ['activity-versions.html', "活动内容版本", "Event content versions"],
      ['activity-registrations.html', "报名名单", "Event sign-ups"]] },
    { home: 'dispatch.html', zh: "农户资金与提现流程", en: "Grower funds & withdrawals", steps: [
      ['dispatch.html', "接单大厅", "Dispatch hall"],
      ['farmer-wallet.html', "资金总览", "My wallet"],
      ['farmer-funds.html', "资金流水", "Fund ledger"],
      ['farmer-settlement.html', "结算单", "Settlement statements"],
      ['farmer-withdraw.html', "申请提现", "Withdraw funds"],
      ['farmer-withdraw-status.html', "提现进度", "Withdrawal progress"]] },
    { home: 'experts.html', zh: "专家统计、调控与种植记录", en: "Expert analytics, control & field records", steps: [
      ['experts.html', "专家频道", "Expert channel"],
      ['expert-stats.html', "多维统计", "Multi-dimensional analytics"],
      ['expert-compare.html', "数据对比", "Compare data"],
      ['expert-regulation.html', "调控建议", "Control advice"],
      ['expert-regulation-log.html', "调控记录", "Control log"],
      ['expert-planting-query.html', "种植记录查询", "Field record query"],
      ['expert-planting-detail.html', "种植记录详情", "Field record detail"]] }
  ];
  var FLOW_SKIP = { 'index.html': 1, 'login.html': 1, 'forgot.html': 1, '404.html': 1 };
  function flowGroup(file) {
    for (var i = 0; i < FLOW_GROUPS.length; i++) {
      var g = FLOW_GROUPS[i];
      for (var j = 0; j < g.steps.length; j++) if (g.steps[j][0] === file) return g;
    }
    return null;
  }
  function flowNav() {
    var here = hereFile();
    if (FLOW_SKIP[here]) return '';
    var g = flowGroup(here);
    if (!g) return '';
    var idx = 0;
    g.steps.forEach(function (x, i) { if (x[0] === here) idx = i; });
    var n = g.steps.length;
    var title = lang === 'en' ? g.en : g.zh;
    var hint = lang === 'en'
      ? 'Step ' + (idx + 1) + ' of ' + n + '. Every step below is a live link; tap to jump.'
      : '当前第 ' + (idx + 1) + ' / ' + n + ' 步。下面每一步都是可点的业务入口，点哪步直接去哪步。';
    var back = lang === 'en' ? 'Back to channel home' : '返回频道首页';
    /* 默认只显示当前步前后各 2 个（共 5 个可点入口），保持页面在 3 屏内；
       「全部 N 步」一键展开全量流程，属于超长列表的左右 / 展开式翻页设计。 */
    var steps = g.steps.map(function (x, i) {
      var lb = lang === 'en' ? x[2] : x[1];
      var far = (i < idx - 2 || i > idx + 2);
      return '<a class="sf-flow-step' + (i === idx ? ' is-on' : '') + (far ? ' is-far' : '') + '" href="' +
        esc(link(x[0], { from: here })) + '"' + (i === idx ? ' aria-current="step"' : '') +
        ' title="' + esc(lb) + '"><span class="sf-flow-n">' + (i + 1) + '</span>' + esc(lb) + '</a>';
    }).join('');
    var expand = lang === 'en' ? 'All ' + n + ' steps' : '全部 ' + n + ' 步';
    var collapse = lang === 'en' ? 'Show fewer' : '收起';
    return '<section class="sf-section sf-flow" aria-label="' + esc(title) + '">' +
      '<div class="sf-section-head"><h2>' + esc(title) + '</h2><span class="sf-sub">' + esc(hint) + '</span></div>' +
      '<div class="sf-flow-steps is-collapsed" id="sf-flow-steps">' + steps + '</div>' +
      '<div class="sf-flow-foot">' +
      '<button class="sf-btn is-quiet" data-act="flow-expand" type="button"' +
      ' data-more="' + esc(expand) + '" data-less="' + esc(collapse) + '">' + esc(expand) + '</button>' +
      '<a class="sf-btn is-quiet" href="' + esc(link(g.home, { from: here })) + '">' +
      esc(back) + '</a></div></section>';
  }

  /* ---------- 五角色常规业务入口（公共关系只写这一份） ----------
     取消/退款/改单、合同/对账/活动、资金/提现、统计/调控/种植记录这些
     用户天天要用的动作，必须从他本来就在的那一页直接点得到，不能靠背 URL。
     按当前页给出该角色该做的下一步；显式透传当前记录 id / job / order，
     不依赖 referrer 或会话存储。容器类名 .sf-shortcut-* 与流程条隔离。 */
  var ROLE_SHORTCUTS = {
    'workorder-detail.html': { zh: '这张工单还能办什么', en: 'What else you can do with this job', items: [
      ['workorder-cancel.html', '取消工单', 'Cancel job'], ['workorder-refund.html', '申请退款', 'Request refund'],
      ['workorder-edit.html', '修改工单', 'Amend job'], ['workorder-reopen.html', '重新发起', 'Reissue job'],
      ['workorder-changes.html', '变更记录', 'Change log']] },
    'workorders.html': { zh: '工单售后与变更', en: 'Job aftercare & changes', items: [
      ['workorder-cancel.html', '取消工单', 'Cancel job'], ['workorder-refund.html', '申请退款', 'Request refund'],
      ['workorder-edit.html', '修改工单', 'Amend job'], ['workorder-reopen.html', '重新发起', 'Reissue job'],
      ['workorder-changes.html', '变更记录', 'Change log']] },
    'account.html': { zh: '我发出去的单：售后与变更', en: 'My jobs: aftercare & changes', items: [
      ['workorder-cancel.html', '取消工单', 'Cancel job'], ['workorder-refund.html', '申请退款', 'Request refund'],
      ['workorder-refund-status.html', '退款进度', 'Refund progress'], ['workorder-edit.html', '修改工单', 'Amend job'],
      ['workorder-reopen.html', '重新发起', 'Reissue job'], ['workorder-changes.html', '变更记录', 'Change log']] },
    'orders.html': { zh: '订单相关的退款', en: 'Refunds for these orders', items: [
      ['workorder-refund.html', '申请退款', 'Request refund'], ['workorder-refund-status.html', '退款进度', 'Refund progress'],
      ['workorder-changes.html', '变更记录', 'Change log']] },
    'order-detail.html': { zh: '这张订单的退款', en: 'Refund for this order', items: [
      ['workorder-refund.html', '申请退款', 'Request refund'], ['workorder-refund-status.html', '退款进度', 'Refund progress'],
      ['workorder-changes.html', '变更记录', 'Change log']] },
    'farm-edit.html': { zh: '田园商家的租赁与合同', en: 'Merchant lease & contracts', items: [
      ['lease-edit.html', '修改租赁信息', 'Edit lease terms'], ['contract-manage.html', '合同管理', 'Contracts'],
      ['activity-publish.html', '发布活动', 'Publish an event']] },
    'farm-manage.html': { zh: '田园商家工作台 · 租赁 / 合同 / 对账', en: 'Merchant desk · lease, contracts & bills', items: [
      ['lease-edit.html', '修改租赁信息', 'Edit lease terms'], ['contract-manage.html', '合同管理', 'Contract management'],
      ['contract-edit.html', '编辑合同内容', 'Edit clauses'], ['contract-versions.html', '合同版本对比', 'Version diff'],
      ['merchant-reconcile.html', '对账中心', 'Reconciliation'], ['merchant-bills.html', '账单明细', 'Bill lines'],
      ['activity-manage.html', '活动管理', 'Event management']] },
    'merchant-orders.html': { zh: '订单 / 对账 / 活动运营', en: 'Orders, bills & event operations', items: [
      ['merchant-reconcile.html', '对账中心', 'Reconciliation'], ['merchant-bills.html', '账单明细', 'Bill lines'],
      ['merchant-reconcile-detail.html', '对账单详情', 'Statement detail'], ['activity-publish.html', '发布活动', 'Publish an event'],
      ['activity-edit.html', '更新活动', 'Update an event'], ['activity-versions.html', '活动内容版本', 'Content versions']] },
    'activity.html': { zh: '商家活动运营', en: 'Merchant event operations', items: [
      ['activity-publish.html', '发布活动', 'Publish an event'], ['activity-manage.html', '活动管理', 'Event management'],
      ['activity-edit.html', '更新活动', 'Update an event'], ['activity-versions.html', '活动内容版本', 'Content versions'],
      ['activity-registrations.html', '报名名单', 'Sign-up list']] },
    'activity-detail.html': { zh: '这场活动的运营动作', en: 'Operations for this event', items: [
      ['activity-edit.html', '更新活动', 'Update an event'], ['activity-versions.html', '活动内容版本', 'Content versions'],
      ['activity-registrations.html', '报名名单', 'Sign-up list']] },
    'dispatch.html': { zh: '农户的钱：余额 / 流水 / 提现', en: 'Grower money: balance, ledger & withdrawals', items: [
      ['farmer-wallet.html', '资金总览', 'My wallet'], ['farmer-funds.html', '资金流水', 'Fund ledger'],
      ['farmer-settlement.html', '结算单', 'Settlements'], ['farmer-withdraw.html', '申请提现', 'Withdraw funds'],
      ['farmer-withdraw-status.html', '提现进度', 'Withdrawal progress']] },
    'dispatch-taken.html': { zh: '做完活去结算、看钱', en: 'After work: settlement & payout', items: [
      ['farmer-wallet.html', '资金总览', 'My wallet'], ['farmer-settlement.html', '结算单', 'Settlements'],
      ['farmer-withdraw.html', '申请提现', 'Withdraw funds']] },
    'experts.html': { zh: '专家的数据工作台', en: 'Expert analytics workbench', items: [
      ['expert-stats.html', '多维统计', 'Multi-dimensional analytics'], ['expert-compare.html', '数据对比', 'Compare data'],
      ['expert-regulation.html', '调控建议', 'Control advice'], ['expert-regulation-log.html', '调控记录', 'Control log'],
      ['expert-planting-query.html', '种植记录查询', 'Field record query'], ['expert-planting-detail.html', '记录详情', 'Record detail']] },
    'expert-detail.html': { zh: '这位专家的统计与记录', en: 'This expert’s analytics & records', items: [
      ['expert-stats.html', '多维统计', 'Analytics'], ['expert-compare.html', '数据对比', 'Compare data'],
      ['expert-regulation.html', '调控建议', 'Control advice'], ['expert-planting-query.html', '种植记录查询', 'Field records']] },
    'expert-trials.html': { zh: '把试验读数用起来', en: 'Put trial readings to work', items: [
      ['expert-stats.html', '多维统计', 'Analytics'], ['expert-compare.html', '数据对比', 'Compare data'],
      ['expert-planting-query.html', '种植记录查询', 'Field records']] }
  };
  function roleShortcuts() {
    var f = hereFile(), c = ROLE_SHORTCUTS[f];
    if (!c || document.body.classList.contains('adm-body')) return '';
    var ex = bizParams(); ex.from = f;
    var links = c.items.map(function (x) {
      var lb = lang === 'en' ? x[2] : x[1];
      return '<a class="sf-shortcut" href="' + esc(link(x[0], ex)) + '" title="' + esc(lb) + '">' + esc(lb) + '</a>';
    }).join('');
    return '<section class="sf-section sf-shortcuts" aria-label="' + esc(lang === 'en' ? c.en : c.zh) + '">' +
      '<div class="sf-section-head"><h2>' + esc(lang === 'en' ? c.en : c.zh) + '</h2>' +
      '<span class="sf-sub">' + esc(lang === 'en'
        ? 'One tap goes to the exact page, carrying this record. Back returns to where you came from.'
        : '点一下就到对应办理页，并带上当前记录；返回按来源页逐层回退。') + '</span></div>' +
      '<div class="sf-shortcut-row">' + links + '</div></section>';
  }

  /* ---------- 后台统一侧栏（16 页共用一份，独立管理页全部纳入） ---------- */
  var ADM_SIDE = [
    { zh: '总览与管控视图', en: 'Console views', items: [
      ['admin/index.html', { m: 'dashboard' }, '总览', 'Dashboard'],
      ['admin/index.html', { m: 'farms' }, '田园信息', 'Plots'],
      ['admin/index.html', { m: 'users' }, '用户信息', 'Users'],
      ['admin/index.html', { m: 'workorders' }, '工单信息', 'Work orders'],
      ['admin/index.html', { m: 'chats' }, '聊天信息', 'Chats'],
      ['admin/index.html', { m: 'planting' }, '种植信息', 'Planting'],
      ['admin/index.html', { m: 'comments' }, '评论管理', 'Comments'],
      ['admin/index.html', { m: 'system' }, '系统控制', 'System']] },
    { zh: '独立管理页', en: 'Record consoles', items: [
      ['admin/farms.html', null, '田园台账', 'Plot records'],
      ['admin/users.html', null, '用户台账', 'User records'],
      ['admin/workorders.html', null, '工单台账', 'Order records'],
      ['admin/chats.html', null, '聊天记录', 'Chat logs'],
      ['admin/planting.html', null, '种植记录', 'Planting logs'],
      ['admin/comments.html', null, '评论台账', 'Comment records'],
      ['admin/notices.html', null, '公告管理', 'Notices'],
      ['admin/roles.html', null, '权限角色', 'Roles'],
      ['admin/dict.html', null, '数据字典', 'Dictionary'],
      ['admin/export.html', null, '导出任务', 'Exports'],
      ['admin/logs.html', null, '审计日志', 'Audit log'],
      ['admin/prices.html', null, '价格公示管理', 'Published prices'],
      ['admin/refunds.html', null, "退款审核", "Refund review"],
      ['admin/withdrawals.html', null, "提现复核", "Withdrawal review"],
      ['admin/contracts.html', null, "合同版本台账", "Contract version ledger"],
      ['admin/regulations.html', null, "调控记录台账", "Control advice ledger"]] },
    { zh: '多级审核', en: 'Approval chain', items: [
      ['admin/audit.html', null, '审核工作台', 'Approval desk'],
      ['admin/audit-review.html', null, '复审', 'Second review'],
      ['admin/audit-final.html', null, '终审', 'Final review']] }
  ];
  function admSide() {
    var here = hereFile();
    var m = param('m', 'dashboard');
    var groups = ADM_SIDE.map(function (grp) {
      var items = grp.items.map(function (x) {
        var lb = lang === 'en' ? x[3] : x[2];
        var bn = x[0].split('/').pop();
        var on = bn === here && (!x[1] || (x[1].m === m));
        return '<a class="' + (on ? 'is-on' : '') + '" href="' +
          esc(link(x[0], x[1] || { from: here })) + '">' + esc(lb) + '</a>';
      }).join('');
      return '<div class="adm-side-grp"><span>' + esc(lang === 'en' ? grp.en : grp.zh) + '</span>' + items + '</div>';
    }).join('');
    return '<div class="adm-side"><h2>SUMFARM ADMIN</h2>' + groups +
      '<div class="adm-side-grp"><a href="' + esc(link('admin/login.html', { from: here })) + '">' +
      esc(lang === 'en' ? 'Independent sign-in' : '独立登录 / 退出') + '</a></div></div>';
  }
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
  /* 每页统一注入：前台前置流程导航条、后台包一层统一侧栏，
     保证任意页面都有可点的业务联系跳转，不出现只能靠地址进入的孤立页。 */
  function put(html) {
    var h = host(); if (!h) return;
    var isAdm = document.body.classList.contains('adm-body');
    var isLogin = isAdm && hereFile() === 'login.html';
    if (isAdm && !isLogin) {
      h.innerHTML = '<div class="adm-shell">' + admSide() +
        '<div class="adm-content">' + html + priceStrip() + universalTail() + '</div></div>';
    } else if (isAdm) {
      h.innerHTML = html + priceStrip() + universalTail();
    } else {
      h.innerHTML = flowNav() + html + roleShortcuts() + priceStrip() + universalTail();
    }
  }
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

  /* ================= 全站价格公示挂接（唯一一份实现） =================
     平台所有业务节点都要能看到与它相关的租金 / 价格：由统一 put() 注入，
     前台业务页按频道取关联价目，详情页按 ?id= 动态算「本单价格构成」，
     公共页给全站公示摘要，后台给素价目管控表。数量文案一律由 PRICE_BOOK 动态算。
     默认折叠成一行摘要，避免把页面撑过 3 屏；展开后是完整价目表。 */
  function priceStrip() {
    var PB = M.PRICE_BOOK;
    var here = hereFile();
    var isAdm = document.body.classList.contains('adm-body');
    var st = PB.stats();
    var catKeys = isAdm ? PB.cats.map(function (c) { return c.key; }) : PB.catsFor(here);
    var items = PB.itemsFor(catKeys);
    var ds = document.body.getAttribute('data-ds') || '';
    var rid = param('id');
    var bd = rid ? PB.breakdown(ds, rid) : [];
    var E = lang === 'en';
    var title = isAdm
      ? (E ? 'Published price control · all categories' : '价格公示管控 · 全类目')
      : (E ? 'Published prices & plot rent for this node' : '本节点租金与价格公示');
    var sub = isAdm
      ? (E ? 'Admin view: every rate that front-end nodes display, itemised below.'
           : '管理视图：前台各节点展示的每一条租金与价格，逐项列在下方。')
      : (E ? 'Every fee at this node comes from the same public price book; nothing is charged off-book.'
           : '本节点涉及的每一笔租金与费用都取自同一份价格公示总账，页面展示金额即应付金额，不另收未列明费用。');
    var catNames = PB.cats.filter(function (c) { return catKeys.indexOf(c.key) >= 0; })
      .map(function (c) { return E ? c.en : c.zh; });
    var chips =
      '<span class="sf-pub-chip"><b>' + st.version + '</b> ' + (E ? ' edition' : '版公示') + '</span>' +
      '<span class="sf-pub-chip">' + (E ? 'Linked categories ' : '关联类目 ') + '<b>' + catKeys.length + '</b> / ' + st.cats + '</span>' +
      '<span class="sf-pub-chip">' + (E ? 'Published lines ' : '公示条目 ') + '<b>' + items.length + '</b> / ' + st.items + '</span>' +
      '<span class="sf-pub-chip">' + (E ? 'Plot rent ' : '田块租金区间 ') + '<b>¥' + st.rentMin + '–' + st.rentMax + '</b> / ' + (E ? 'season' : '季') + '</span>' +
      '<span class="sf-pub-chip">' + (E ? 'Valid ' : '有效期 ') + st.from + ' ~ ' + st.to + '</span>';
    var rows = items.map(function (x) {
      var cat = PB.cats.filter(function (c) { return c.key === x.cat; })[0];
      return '<tr><td>' + esc(E ? cat.en : cat.zh) + '</td>' +
        '<td><b>' + esc(E ? x.en : x.zh) + '</b><small>' + esc(x.id) + '</small></td>' +
        '<td class="sf-pub-num">¥' + esc(x.price) + '</td>' +
        '<td>' + esc(x.unit) + '</td>' +
        '<td>' + esc(E ? cat.basisEn : cat.basisZh) + '</td>' +
        '<td>' + esc(E ? x.scopeEn : x.scopeZh) + '</td></tr>';
    }).join('');
    var table = '<div class="sf-pub-scroll"><table class="sf-pub-table"><thead><tr>' +
      '<th>' + (E ? 'Category' : '类目') + '</th><th>' + (E ? 'Published item' : '公示项目') + '</th>' +
      '<th>' + (E ? 'Rate' : '公示单价') + '</th><th>' + (E ? 'Unit' : '计价单位') + '</th>' +
      '<th>' + (E ? 'Basis' : '计价口径') + '</th><th>' + (E ? 'Scope' : '适用范围') + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    var bdHtml = '';
    if (bd.length) {
      var bdRows = bd.map(function (r) {
        return '<tr><td>' + esc(E ? r.en : r.zh) + '</td>' +
          '<td class="sf-pub-num">' + esc(E ? r.amountEn : r.amountZh) + '</td>' +
          '<td>' + esc(E ? r.noteEn : r.noteZh) + '</td></tr>';
      }).join('');
      bdHtml = '<div class="sf-pub-bd"><h4>' +
        (E ? 'This order · price breakdown (record ' + esc(rid) + ')' : '本单价格构成 · 记录 ' + esc(rid)) +
        '</h4><div class="sf-pub-scroll"><table class="sf-pub-table"><thead><tr><th>' +
        (E ? 'Line' : '条目') + '</th><th>' + (E ? 'Amount' : '金额') + '</th><th>' +
        (E ? 'Basis' : '计算依据') + '</th></tr></thead><tbody>' + bdRows + '</tbody></table></div></div>';
    }
    var rulesHtml = '<div class="sf-pub-rules"><h4>' + (E ? 'Pricing rules' : '公示与计费规则') + '</h4><ol>' +
      PB.rules.map(function (r) { return '<li>' + esc(E ? r.en : r.zh) + '</li>'; }).join('') + '</ol></div>';
    var navs =
      '<a class="sf-pub-link" href="' + esc(link('price.html', { from: here })) + '">' +
        (E ? 'Full price book' : '价格公示总览') + '</a>' +
      '<a class="sf-pub-link" href="' + esc(link('price-lease.html', { from: here })) + '">' +
        (E ? 'Plot rent standard' : '田块租金标准') + '</a>' +
      '<a class="sf-pub-link" href="' + esc(link('price-calc.html', { from: here })) + '">' +
        (E ? 'Rent calculator' : '租金试算') + '</a>' +
      '<a class="sf-pub-link" href="' + esc(link('price-changes.html', { from: here })) + '">' +
        (E ? 'Rate change log' : '调价公示历史') + '</a>' +
      (isAdm
        ? '<a class="sf-pub-link" href="' + esc(link('admin/prices.html', { from: here })) + '">' +
            (E ? 'Price management console' : '价格公示管理') + '</a>'
        : '<a class="sf-pub-link" href="' + esc(link('price-rules.html', { from: here })) + '">' +
            (E ? 'Rules & basis' : '公示规则与口径') + '</a>');
    var more = E ? 'Show all ' + items.length + ' published lines' : '展开本节点 ' + items.length + ' 条公示价目';
    var less = E ? 'Collapse price table' : '收起价目表';
    return '<section class="sf-section sf-pub" aria-label="' + esc(title) + '">' +
      '<div class="sf-pub-head"><div><p class="sf-eyebrow">SUMFARM · ' +
        (E ? 'PUBLIC PRICE BOOK' : '租金与价格公示') + '</p><h2>' + esc(title) + '</h2>' +
        '<div class="sf-sub">' + esc(sub) + '</div></div></div>' +
      '<div class="sf-pub-chips">' + chips +
        '<span class="sf-pub-chip is-cats">' + esc(catNames.join(' · ')) + '</span></div>' +
      '<div class="sf-pub-foot">' +
        '<button class="sf-btn is-quiet" type="button" data-act="price-expand" ' +
          'data-more="' + esc(more) + '" data-less="' + esc(less) + '">' + esc(more) + '</button>' +
        navs + '</div>' +
      '<div class="sf-pub-body is-collapsed" id="sf-pub-body">' +
        bdHtml + table + rulesHtml +
        '<p class="sf-pub-note">' + (E
          ? 'All ' + st.items + ' lines across ' + st.cats + ' categories, ' + st.plots +
            ' measured plots and ' + st.changes + ' published rate changes are derived from the same price book.'
          : '全站 ' + st.cats + ' 类目共 ' + st.items + ' 条价目、' + st.plots +
            ' 块实测田块租金与 ' + st.changes + ' 条调价公示，均由同一份价格公示总账推导。') + '</p>' +
      '</div></section>';
  }

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
                [lang === 'en' ? 'Manage listings' : '田园信息管理', 'farm-manage.html'],
                [lang === 'en' ? 'Lease & contracts' : '租赁与合同', 'contract-manage.html'],
                [lang === 'en' ? 'Publish an event' : '发布活动', 'activity-publish.html']] },
      { board: lang === 'en' ? 'Member' : '租赁用户',
        title: lang === 'en' ? 'Find a plot and follow it remotely' : '找一畦田，远程看着它长大',
        sum: lang === 'en' ? 'Browse registered farms, lease a plot, then create field jobs for that plot from your account.'
          : '浏览田园档案、承包田块，之后在个人中心给自己的田派工单、看回执。',
        href: 'farms.html',
        links: [[lang === 'en' ? 'Find plots by region' : '按地区找田', 'farms-region.html'],
                [lang === 'en' ? 'My plots' : '我的田园', 'account.html'],
                [lang === 'en' ? 'Job aftercare' : '工单售后', 'workorder-changes.html'],
                [lang === 'en' ? 'Request a refund' : '申请退款', 'workorder-refund.html']] },
      { board: lang === 'en' ? 'Grower' : '接单农户',
        title: lang === 'en' ? 'Take field jobs nearby' : '接附近的田间活',
        sum: lang === 'en' ? 'Nearby requests, jobs linked to your plots, photo receipts and settlement, all in the job hall.'
          : '附近工单、关联田园的活、作业回执与结算，都在接单大厅按区分好。',
        href: 'dispatch.html',
        links: [[lang === 'en' ? 'Nearby jobs' : '附近工单', 'dispatch-nearby.html'],
                [lang === 'en' ? 'Jobs I took' : '已接工单', 'dispatch-taken.html'],
                [lang === 'en' ? 'My wallet' : '我的资金', 'farmer-wallet.html'],
                [lang === 'en' ? 'Withdraw' : '申请提现', 'farmer-withdraw.html']] },
      { board: lang === 'en' ? 'Research' : '产学研团队',
        title: lang === 'en' ? 'Share agronomy and run trials' : '做技术指导与种植实践',
        sum: lang === 'en' ? 'Answer technical questions, take expert guidance jobs and keep field trial records.'
          : '回答技术咨询、认领专家指导工单、记录种植实践与试验结论。',
        href: 'experts.html',
        links: [[lang === 'en' ? 'Expert guidance jobs' : '专家指导工单', 'job-expert.html'],
                [lang === 'en' ? 'Field trial records' : '种植实践记录', 'expert-trials.html'],
                [lang === 'en' ? 'Analytics' : '多维统计', 'expert-stats.html'],
                [lang === 'en' ? 'Field records' : '种植记录查询', 'expert-planting-query.html']] }
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
        '<div class="sf-row" style="margin-top:14px"><a class="sf-btn is-primary" href="' + esc(link('farms-lease.html', { from: 'farm-detail.html', farm: f.id })) + '">' + t('common.book') + '</a>' +
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
        '<div class="sf-row" style="margin-top:14px"><a class="sf-btn is-primary" href="' + esc(link(cfg.orderTo || 'orders.html', (function () { var o = { from: hereFile() }; o[cfg.orderKey || 'ref'] = x.id; return o; })())) + '">' + t('common.order') + '</a>' +
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
          href: detailLink('order-detail.html', o.id, 'orders.html') }); } });
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
      /* 业务推进：按当前工单状态给出可点的下一步，状态推进也有可见反馈 */
      var jp = { from: 'workorder-detail.html', job: w.id, id: w.id };
      var adv = '<div class="sf-panel"><h3>' + (lang === 'en' ? 'Move this job forward' : '推进这条工单') + '</h3>' +
        '<div class="sf-biz-actions">' +
        '<a class="sf-biz-btn" href="' + esc(link('dispatch-accept.html', jp)) + '">' + (lang === 'en' ? 'Accept job' : '承接确认') + '</a>' +
        '<a class="sf-biz-btn" href="' + esc(link('dispatch-receipt.html', jp)) + '">' + (lang === 'en' ? 'Upload receipt' : '写作业回执') + '</a>' +
        '<a class="sf-biz-btn" href="' + esc(link('dispatch-verify.html', jp)) + '">' + (lang === 'en' ? 'Acceptance check' : '验收核对') + '</a>' +
        '<a class="sf-biz-btn" href="' + esc(link('dispatch-settle.html', jp)) + '">' + (lang === 'en' ? 'Settlement' : '结算对账') + '</a>' +
        (w.type === '专家指导' ? '<a class="sf-biz-btn" href="' + esc(link('expert-conclusion.html', jp)) + '">' +
          (lang === 'en' ? 'Technical conclusion' : '提交技术结论') + '</a>' : '') +
        '</div><div class="sf-biz-live" id="sf-biz-live"></div>' +
        '<button class="sf-btn is-quiet" type="button" data-act="biz-advance" data-step="' +
        esc(w.type + ' · ' + (lang === 'en' ? 'status advanced' : '状态已推进到下一步')) + '">' +
        (lang === 'en' ? 'Record status change' : '记录状态推进') + '</button></div>';
      put('<div class="sf-section">' + sectionHead(w.type + ' · ' + w.id, w.descZh) + head +
        '<div class="sf-row">' + basics + photos + '</div>' +
        '<div class="sf-section"><div class="sf-panel">' + adv + '</div></div>' +
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
    /* 侧栏由 put() 统一注入 admSide()，这里只输出内容区，避免嵌套两层 .adm-shell */
    var kpi = [['farms', t('admin.m.farms')], ['users', t('admin.m.users')],
      ['workorders', t('admin.m.workorders')], ['comments', t('admin.m.comments')]].map(function (x) {
      return '<div class="adm-kpi"><b>' + count(x[0]) + '</b><span>' + x[1] + '</span></div>';
    }).join('');
    put('<div class="adm-top"><h1>' + t('admin.title') + '</h1><span class="adm-spacer"></span>' +
      '<button class="adm-btn is-plain" data-act="lang" type="button">' + t('act.lang') + '</button>' +
      '<button class="adm-btn is-plain" data-act="logout" type="button">' + t('admin.logout') + '</button></div>' +
      '<div class="adm-kpis">' + kpi + '</div>' +
      '<div class="adm-panel"><h3>' + t(ADM_MODULES.filter(function (x) { return x[0] === m; })[0][1]) + '</h3>' +
      '<div class="adm-actions"><button class="adm-btn is-plain" data-act="selectAll" type="button">' + t('common.selectAll') + '</button>' +
      '<button class="adm-btn is-plain" data-act="delete" type="button">' + t('common.delete') + '</button>' +
      '<a class="adm-btn is-plain" href="' + esc(link('admin/audit.html', { from: 'index.html' })) + '">' + t('admin.m.audit') + '</a></div>' +
      '<div id="mount-adm"></div></div>');
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
  /* ---------- 业务节点映射与专属渲染（角色链路闭环） ---------- */
var BIZ = {"farms.html":{"r":"tenant","ds":"farms","k":"list","zh":"田园档案","en":"Plot archive","a":[["farms-region.html","下一步 · 按地区找田","Next · By region"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":1,"len":21},"farms-region.html":{"r":"tenant","ds":"farms","k":"table","zh":"按地区找田","en":"By region","a":[["farms.html","上一步 · 田园档案","Back · Plot archive"],["farms-soil.html","下一步 · 按土壤筛选","Next · By soil"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":2,"len":21},"farms-soil.html":{"r":"tenant","ds":"farms","k":"table","zh":"按土壤筛选","en":"By soil","a":[["farms-region.html","上一步 · 按地区找田","Back · By region"],["farms-map.html","下一步 · 田块分布图","Next · Plot map"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":3,"len":21},"farms-map.html":{"r":"tenant","ds":"farms","k":"map","zh":"田块分布图","en":"Plot map","a":[["farms-soil.html","上一步 · 按土壤筛选","Back · By soil"],["farms-favorites.html","下一步 · 我的收藏","Next · Saved plots"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":4,"len":21},"farms-favorites.html":{"r":"tenant","ds":"farms","k":"list","zh":"我的收藏","en":"Saved plots","a":[["farms-map.html","上一步 · 田块分布图","Back · Plot map"],["farm-detail.html","下一步 · 田块详情","Next · Plot detail"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":5,"len":21},"farms-lease.html":{"r":"tenant","ds":"farms","k":"form","zh":"承包租赁","en":"Lease a plot","a":[["farm-compare.html","上一步 · 田块对比","Back · Compare plots"],["farm-contract.html","下一步 · 承包合同","Next · Lease contract"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":8,"len":21},"farm-detail.html":{"r":"tenant","ds":"farms","k":"list","zh":"田块详情","en":"Plot detail","a":[["farms-favorites.html","上一步 · 我的收藏","Back · Saved plots"],["farm-compare.html","下一步 · 田块对比","Next · Compare plots"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":6,"len":21},"farm-compare.html":{"r":"tenant","ds":"farms","k":"list","zh":"田块对比","en":"Compare plots","a":[["farm-detail.html","上一步 · 田块详情","Back · Plot detail"],["farms-lease.html","下一步 · 承包租赁","Next · Lease a plot"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":7,"len":21},"farm-contract.html":{"r":"tenant","ds":"orders","k":"info","zh":"承包合同","en":"Lease contract","a":[["farms-lease.html","上一步 · 承包租赁","Back · Lease a plot"],["farm-payment.html","下一步 · 费用支付","Next · Payment"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":9,"len":21},"farm-payment.html":{"r":"tenant","ds":"orders","k":"form","zh":"费用支付","en":"Payment","a":[["farm-contract.html","上一步 · 承包合同","Back · Lease contract"],["farm-success.html","下一步 · 承包成功","Next · Lease confirmed"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":10,"len":21},"farm-success.html":{"r":"tenant","ds":"orders","k":"success","zh":"承包成功","en":"Lease confirmed","a":[["farm-payment.html","上一步 · 费用支付","Back · Payment"],["order-detail.html","下一步 · 订单详情","Next · Order detail"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":11,"len":21},"order-detail.html":{"r":"tenant","ds":"orders","k":"detail","zh":"订单详情","en":"Order detail","a":[["farm-success.html","上一步 · 承包成功","Back · Lease confirmed"],["orders.html","下一步 · 我的订单","Next · My orders"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":12,"len":21},"orders.html":{"r":"tenant","ds":"orders","k":"list","zh":"我的订单","en":"My orders","a":[["order-detail.html","上一步 · 订单详情","Back · Order detail"],["account.html","下一步 · 个人中心","Next · My account"],["price.html","核对公示租金","Check published rent"],["workorders.html","工单总览","All jobs"],["orders.html","我的订单","My orders"]],"idx":13,"len":21},"account.html":{"r":"tenant","ds":"orders","k":"list","zh":"个人中心","en":"My account","a":[["orders.html","上一步 · 我的订单","Back · My orders"],["workorder-new.html","下一步 · 按田建单","Next · New job for plot"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["submission-status.html","查审核进度","Approval progress"]],"idx":14,"len":21},"workorder-new.html":{"r":"tenant","ds":"workorders","k":"form","zh":"按田建单","en":"New job for plot","a":[["account.html","上一步 · 个人中心","Back · My account"],["workorder-detail.html","下一步 · 工单详情","Next · Job detail"],["price.html","核对公示租金","Check published rent"],["workorders.html","工单总览","All jobs"],["workorder-new.html","按田建单","New job"]],"idx":15,"len":21},"workorder-detail.html":{"r":"tenant","ds":"workorders","k":"list","zh":"工单详情","en":"Job detail","a":[["workorder-new.html","上一步 · 按田建单","Back · New job for plot"],["dispatch-verify.html","下一步 · 验收核对","Next · Acceptance"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["dispatch.html","接单大厅","Dispatch home"]],"idx":16,"len":21},"dispatch-verify.html":{"r":"tenant","ds":"workorders","k":"form","zh":"验收核对","en":"Acceptance","a":[["workorder-detail.html","上一步 · 工单详情","Back · Job detail"],["dispatch-settle.html","下一步 · 结算对账","Next · Settlement"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":17,"len":21},"dispatch-settle.html":{"r":"tenant","ds":"workorders","k":"table","zh":"结算对账","en":"Settlement","a":[["dispatch-verify.html","上一步 · 验收核对","Back · Acceptance"],["produce-delivery.html","下一步 · 配送跟踪","Next · Delivery tracking"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":18,"len":21},"produce-delivery.html":{"r":"tenant","ds":"orders","k":"flow","zh":"配送跟踪","en":"Delivery tracking","a":[["dispatch-settle.html","上一步 · 结算对账","Back · Settlement"],["produce-review.html","下一步 · 产品评价","Next · Review produce"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"]],"idx":19,"len":21},"produce-review.html":{"r":"tenant","ds":"comments","k":"chat","zh":"产品评价","en":"Review produce","a":[["produce-delivery.html","上一步 · 配送跟踪","Back · Delivery tracking"],["account-invoice.html","下一步 · 发票管理","Next · Invoices"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":20,"len":21},"account-invoice.html":{"r":"tenant","ds":"orders","k":"table","zh":"发票管理","en":"Invoices","a":[["produce-review.html","上一步 · 产品评价","Back · Review produce"],["price.html","核对公示租金","Check published rent"],["account.html","回个人中心","My account"],["workorders.html","工单总览","All jobs"],["orders.html","我的订单","My orders"]],"idx":21,"len":21},"activity.html":{"r":"activity","ds":"activities","k":"list","zh":"田园活动","en":"Activities","a":[["activity-calendar.html","下一步 · 活动日历","Next · Calendar"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":1,"len":12},"activity-calendar.html":{"r":"activity","ds":"activities","k":"table","zh":"活动日历","en":"Calendar","a":[["activity.html","上一步 · 田园活动","Back · Activities"],["activity-detail.html","下一步 · 活动详情","Next · Event detail"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":2,"len":12},"activity-detail.html":{"r":"activity","ds":"activities","k":"list","zh":"活动详情","en":"Event detail","a":[["activity-calendar.html","上一步 · 活动日历","Back · Calendar"],["activity-signup.html","下一步 · 活动报名","Next · Sign up"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":3,"len":12},"activity-signup.html":{"r":"activity","ds":"activities","k":"form","zh":"活动报名","en":"Sign up","a":[["activity-detail.html","上一步 · 活动详情","Back · Event detail"],["activity-checkin.html","下一步 · 现场签到","Next · Check in"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":4,"len":12},"activity-checkin.html":{"r":"activity","ds":"activities","k":"success","zh":"现场签到","en":"Check in","a":[["activity-signup.html","上一步 · 活动报名","Back · Sign up"],["activity-members.html","下一步 · 参与成员","Next · Participants"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":5,"len":12},"activity-members.html":{"r":"activity","ds":"users","k":"table","zh":"参与成员","en":"Participants","a":[["activity-checkin.html","上一步 · 现场签到","Back · Check in"],["activity-review.html","下一步 · 活动回顾","Next · Event recap"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":6,"len":12},"activity-review.html":{"r":"activity","ds":"comments","k":"chat","zh":"活动回顾","en":"Event recap","a":[["activity-members.html","上一步 · 参与成员","Back · Participants"],["venue-booking.html","下一步 · 场地预约","Next · Book a venue"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":7,"len":12},"venue-booking.html":{"r":"activity","ds":"activities","k":"form","zh":"场地预约","en":"Book a venue","a":[["activity-review.html","上一步 · 活动回顾","Back · Event recap"],["venue-menu.html","下一步 · 农家菜单","Next · Farm menu"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"],["submission-status.html","查审核进度","Approval progress"]],"idx":8,"len":12},"venue-menu.html":{"r":"activity","ds":"produces","k":"list","zh":"农家菜单","en":"Farm menu","a":[["venue-booking.html","上一步 · 场地预约","Back · Book a venue"],["venue-sports.html","下一步 · 运动场地","Next · Sports field"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":9,"len":12},"venue-sports.html":{"r":"activity","ds":"activities","k":"info","zh":"运动场地","en":"Sports field","a":[["venue-menu.html","上一步 · 农家菜单","Back · Farm menu"],["venue-wedding.html","下一步 · 婚纱场地","Next · Wedding lawn"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":10,"len":12},"venue-wedding.html":{"r":"activity","ds":"activities","k":"gallery","zh":"婚纱场地","en":"Wedding lawn","a":[["venue-sports.html","上一步 · 运动场地","Back · Sports field"],["venue-camping.html","下一步 · 露营营位","Next · Camping pitch"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":11,"len":12},"venue-camping.html":{"r":"activity","ds":"activities","k":"list","zh":"露营营位","en":"Camping pitch","a":[["venue-wedding.html","上一步 · 婚纱场地","Back · Wedding lawn"],["price-venue.html","场地公示价","Venue rates"],["account.html","回个人中心","My account"]],"idx":12,"len":12},"produce.html":{"r":"produce","ds":"produces","k":"list","zh":"农产品","en":"Produce","a":[["produce-season.html","下一步 · 时令清单","Next · Seasonal list"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":1,"len":9},"produce-season.html":{"r":"produce","ds":"produces","k":"list","zh":"时令清单","en":"Seasonal list","a":[["produce.html","上一步 · 农产品","Back · Produce"],["produce-trace.html","下一步 · 溯源档案","Next · Traceability"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":2,"len":9},"produce-trace.html":{"r":"produce","ds":"produces","k":"detail","zh":"溯源档案","en":"Traceability","a":[["produce-season.html","上一步 · 时令清单","Back · Seasonal list"],["produce-detail.html","下一步 · 产品详情","Next · Produce detail"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":3,"len":9},"produce-detail.html":{"r":"produce","ds":"produces","k":"list","zh":"产品详情","en":"Produce detail","a":[["produce-trace.html","上一步 · 溯源档案","Back · Traceability"],["produce-cart.html","下一步 · 购物车","Next · Cart"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":4,"len":9},"produce-cart.html":{"r":"produce","ds":"produces","k":"table","zh":"购物车","en":"Cart","a":[["produce-detail.html","上一步 · 产品详情","Back · Produce detail"],["produce-checkout.html","下一步 · 结算下单","Next · Checkout"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":5,"len":9},"produce-checkout.html":{"r":"produce","ds":"orders","k":"form","zh":"结算下单","en":"Checkout","a":[["produce-cart.html","上一步 · 购物车","Back · Cart"],["produce-receipt.html","下一步 · 签收回执","Next · Delivery receipt"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":6,"len":9},"produce-receipt.html":{"r":"produce","ds":"orders","k":"success","zh":"签收回执","en":"Delivery receipt","a":[["produce-checkout.html","上一步 · 结算下单","Back · Checkout"],["produce-review.html","下一步 · 产品评价","Next · Review"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"]],"idx":7,"len":9},"produce-stock.html":{"r":"produce","ds":"produces","k":"table","zh":"库存台账","en":"Stock ledger","a":[["produce-review.html","上一步 · 产品评价","Back · Review"],["price-produce.html","农产品公示价","Produce rates"],["orders.html","我的订单","My orders"],["venue-booking.html","下一步 · 场地档期","Next · Venue calendar"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":9,"len":9},"farm-edit.html":{"r":"merchant","ds":"farms","k":"list","zh":"上传田园档案","en":"Submit a plot","a":[["farm-manage.html","上一步 · 田园管理","Back · Plot management"],["farm-success.html","下一步 · 提交成功","Next · Submitted"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"]],"idx":2,"len":12},"submission-status.html":{"r":"merchant","ds":"audits","k":"flow","zh":"审核进度","en":"Approval progress","a":[["farm-success.html","上一步 · 提交成功","Back · Submitted"],["farm-manage.html","下一步 · 田园管理","Next · Manage plot"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":4,"len":12},"farm-manage.html":{"r":"merchant","ds":"farms","k":"table","zh":"田园管理","en":"Manage plot","a":[["submission-status.html","上一步 · 审核进度","Back · Approval progress"],["farm-gallery.html","下一步 · 田园图册","Next · Gallery"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":5,"len":12},"farm-gallery.html":{"r":"merchant","ds":"farms","k":"gallery","zh":"田园图册","en":"Gallery","a":[["farm-manage.html","上一步 · 田园管理","Back · Manage plot"],["farm-comments.html","下一步 · 评论管理","Next · Review moderation"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":6,"len":12},"farm-comments.html":{"r":"merchant","ds":"comments","k":"chat","zh":"评论管理","en":"Review moderation","a":[["farm-gallery.html","上一步 · 田园图册","Back · Gallery"],["farm-follow.html","下一步 · 关注动态","Next · Followers"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":7,"len":12},"farm-follow.html":{"r":"merchant","ds":"users","k":"stats","zh":"关注动态","en":"Followers","a":[["farm-comments.html","上一步 · 评论管理","Back · Review moderation"],["merchant-orders.html","下一步 · 收到的订单","Next · Incoming orders"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":8,"len":12},"merchant-orders.html":{"r":"merchant","ds":"orders","k":"table","zh":"收到的订单","en":"Incoming orders","a":[["farm-follow.html","上一步 · 关注动态","Back · Followers"],["produce-stock.html","下一步 · 农产品上架","Next · List produce"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"]],"idx":9,"len":12},"price.html":{"r":"merchant","ds":"farms","k":"list","zh":"价格公示","en":"Published prices","a":[["venue-booking.html","上一步 · 场地档期","Back · Venue calendar"],["submission-status.html","查审核进度","Approval progress"],["price.html","价格公示","Published prices"],["farm-manage.html","田园管理","Plot management"],["price-lease.html","下一步 · 田块租金标准","Next · Plot rent standard"],["price-calc.html","租金试算","Rent calculator"]],"idx":12,"len":12},"dispatch.html":{"r":"grower","ds":"dispatches","k":"list","zh":"接单大厅","en":"Dispatch home","a":[["dispatch-nearby.html","下一步 · 定位附近单","Next · Nearby jobs"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":1,"len":12},"dispatch-nearby.html":{"r":"grower","ds":"dispatches","k":"list","zh":"定位附近单","en":"Nearby jobs","a":[["dispatch.html","上一步 · 接单大厅","Back · Dispatch home"],["dispatch-linked.html","下一步 · 关联田园单","Next · Linked-plot jobs"],["price-job.html","工单公示价","Published job rates"]],"idx":2,"len":12},"dispatch-linked.html":{"r":"grower","ds":"dispatches","k":"list","zh":"关联田园单","en":"Linked-plot jobs","a":[["dispatch-nearby.html","上一步 · 定位附近单","Back · Nearby jobs"],["dispatch-accept.html","下一步 · 承接确认","Next · Accept job"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":3,"len":12},"dispatch-accept.html":{"r":"grower","ds":"dispatches","k":"form","zh":"承接确认","en":"Accept job","a":[["dispatch-linked.html","上一步 · 关联田园单","Back · Linked-plot jobs"],["dispatch-taken.html","下一步 · 已接工单","Next · Accepted jobs"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":4,"len":12},"dispatch-taken.html":{"r":"grower","ds":"workorders","k":"list","zh":"已接工单","en":"Accepted jobs","a":[["dispatch-accept.html","上一步 · 承接确认","Back · Accept job"],["dispatch-receipt.html","下一步 · 作业回执","Next · Field receipt"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":5,"len":12},"dispatch-receipt.html":{"r":"grower","ds":"workorders","k":"form","zh":"作业回执","en":"Field receipt","a":[["dispatch-taken.html","上一步 · 已接工单","Back · Accepted jobs"],["dispatch-verify.html","下一步 · 验收核对","Next · Acceptance"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":6,"len":12},"dispatch-history.html":{"r":"grower","ds":"workorders","k":"flow","zh":"历史工单","en":"Job history","a":[["dispatch-settle.html","上一步 · 结算对账","Back · Settlement"],["workorders.html","下一步 · 工单总览","Next · All jobs"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":9,"len":12},"workorders.html":{"r":"grower","ds":"workorders","k":"list","zh":"工单总览","en":"All jobs","a":[["dispatch-history.html","上一步 · 历史工单","Back · Job history"],["workorder-detail.html","下一步 · 工单详情","Next · Job detail"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"]],"idx":10,"len":12},"price-job.html":{"r":"grower","ds":"workorders","k":"list","zh":"工单公示价","en":"Published job rates","a":[["workorder-detail.html","上一步 · 工单详情","Back · Job detail"],["price-job.html","工单公示价","Published job rates"],["dispatch.html","接单大厅","Dispatch home"],["price-produce.html","下一步 · 农产品与配送价目","Next · Produce & delivery rates"],["price.html","公示总览","Price book"],["price-calc.html","租金试算","Rent calculator"]],"idx":12,"len":12},"experts.html":{"r":"expert","ds":"experts","k":"list","zh":"专家广场","en":"Experts","a":[["experts-rank.html","下一步 · 积分排行","Next · Ranking"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":1,"len":12},"experts-rank.html":{"r":"expert","ds":"experts","k":"table","zh":"积分排行","en":"Ranking","a":[["experts.html","上一步 · 专家广场","Back · Experts"],["expert-apply.html","下一步 · 认证申请","Next · Apply"],["price-job.html","专家服务公示价","Expert rates"]],"idx":2,"len":12},"expert-apply.html":{"r":"expert","ds":"experts","k":"form","zh":"认证申请","en":"Apply","a":[["experts-rank.html","上一步 · 积分排行","Back · Ranking"],["expert-detail.html","下一步 · 专家主页","Next · Expert profile"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":3,"len":12},"expert-detail.html":{"r":"expert","ds":"experts","k":"list","zh":"专家主页","en":"Expert profile","a":[["expert-apply.html","上一步 · 认证申请","Back · Apply"],["expert-points.html","下一步 · 积分口径","Next · Points rules"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":4,"len":12},"expert-points.html":{"r":"expert","ds":"experts","k":"info","zh":"积分口径","en":"Points rules","a":[["expert-detail.html","上一步 · 专家主页","Back · Expert profile"],["expert-column.html","下一步 · 技术专栏","Next · Columns"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":5,"len":12},"expert-column.html":{"r":"expert","ds":"topics","k":"list","zh":"技术专栏","en":"Columns","a":[["expert-points.html","上一步 · 积分口径","Back · Points rules"],["expert-qa.html","下一步 · 技术问答","Next · Q&A"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":6,"len":12},"expert-qa.html":{"r":"expert","ds":"topics","k":"chat","zh":"技术问答","en":"Q&A","a":[["expert-column.html","上一步 · 技术专栏","Back · Columns"],["expert-history.html","下一步 · 管理历史","Next · Management history"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":7,"len":12},"expert-history.html":{"r":"expert","ds":"plantings","k":"flow","zh":"管理历史","en":"Management history","a":[["expert-qa.html","上一步 · 技术问答","Back · Q&A"],["expert-trials.html","下一步 · 种植实践","Next · Field trials"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":8,"len":12},"expert-trials.html":{"r":"expert","ds":"plantings","k":"table","zh":"种植实践","en":"Field trials","a":[["expert-history.html","上一步 · 管理历史","Back · Management history"],["expert-conclusion.html","下一步 · 技术结论","Next · Technical conclusion"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":9,"len":12},"expert-conclusion.html":{"r":"expert","ds":"workorders","k":"form","zh":"技术结论","en":"Technical conclusion","a":[["expert-trials.html","上一步 · 种植实践","Back · Field trials"],["job-expert.html","下一步 · 专家指导工单","Next · Guidance jobs"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"]],"idx":10,"len":12},"job-expert.html":{"r":"expert","ds":"workorders","k":"list","zh":"专家指导工单","en":"Guidance jobs","a":[["expert-conclusion.html","上一步 · 技术结论","Back · Technical conclusion"],["forum-tech.html","下一步 · 技术论坛","Next · Tech forum"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"],["workorders.html","工单总览","All jobs"]],"idx":11,"len":12},"forum-tech.html":{"r":"expert","ds":"topics","k":"list","zh":"技术论坛","en":"Tech forum","a":[["job-expert.html","上一步 · 专家指导工单","Back · Guidance jobs"],["price-job.html","专家服务公示价","Expert rates"],["experts.html","专家广场","Experts"],["forum-best.html","下一步 · 精华采纳","Next · Best posts"],["forum.html","论坛首页","Forum home"]],"idx":12,"len":12},"job-tilling.html":{"r":"job","ds":"workorders","k":"list","zh":"翻地","en":"Tilling","a":[["job-sowing.html","下一步 · 种植","Next · Sowing"],["workorder-new.html","按田建单","New job"],["workorders.html","工单总览","All jobs"]],"idx":1,"len":6},"job-sowing.html":{"r":"job","ds":"workorders","k":"list","zh":"种植","en":"Sowing","a":[["job-tilling.html","上一步 · 翻地","Back · Tilling"],["job-water.html","下一步 · 浇水","Next · Watering"],["workorder-new.html","按田建单","New job"],["workorders.html","工单总览","All jobs"]],"idx":2,"len":6},"job-water.html":{"r":"job","ds":"workorders","k":"list","zh":"浇水","en":"Watering","a":[["job-sowing.html","上一步 · 种植","Back · Sowing"],["job-harvest.html","下一步 · 采摘","Next · Harvest"],["workorder-new.html","按田建单","New job"],["workorders.html","工单总览","All jobs"]],"idx":3,"len":6},"job-harvest.html":{"r":"job","ds":"workorders","k":"list","zh":"采摘","en":"Harvest","a":[["job-water.html","上一步 · 浇水","Back · Watering"],["job-expert.html","下一步 · 专家指导","Next · Expert guidance"],["workorder-new.html","按田建单","New job"],["workorders.html","工单总览","All jobs"]],"idx":4,"len":6},"forum.html":{"r":"forum","ds":"topics","k":"list","zh":"论坛首页","en":"Forum home","a":[["forum-hot.html","下一步 · 热门田园","Next · Popular plots"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":1,"len":11},"forum-hot.html":{"r":"forum","ds":"topics","k":"list","zh":"热门田园","en":"Popular plots","a":[["forum.html","上一步 · 论坛首页","Back · Forum home"],["forum-exp.html","下一步 · 种植经验","Next · Growing notes"],["experts.html","专家广场","Experts"]],"idx":2,"len":11},"forum-exp.html":{"r":"forum","ds":"topics","k":"list","zh":"种植经验","en":"Growing notes","a":[["forum-hot.html","上一步 · 热门田园","Back · Popular plots"],["forum-act.html","下一步 · 活动复盘","Next · Event recap"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":3,"len":11},"forum-act.html":{"r":"forum","ds":"topics","k":"list","zh":"活动复盘","en":"Event recap","a":[["forum-exp.html","上一步 · 种植经验","Back · Growing notes"],["forum-tech.html","下一步 · 技术咨询","Next · Tech Q&A"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":4,"len":11},"forum-best.html":{"r":"forum","ds":"topics","k":"list","zh":"精华采纳","en":"Best posts","a":[["forum-tech.html","上一步 · 技术咨询","Back · Tech Q&A"],["forum-rules.html","下一步 · 版规说明","Next · Board rules"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":6,"len":11},"forum-rules.html":{"r":"forum","ds":"topics","k":"info","zh":"版规说明","en":"Board rules","a":[["forum-best.html","上一步 · 精华采纳","Back · Best posts"],["forum-edit.html","下一步 · 发起新帖","Next · New post"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":7,"len":11},"forum-edit.html":{"r":"forum","ds":"topics","k":"form","zh":"发起新帖","en":"New post","a":[["forum-rules.html","上一步 · 版规说明","Back · Board rules"],["forum-posted.html","下一步 · 我已发布","Next · My posts"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":8,"len":11},"forum-posted.html":{"r":"forum","ds":"topics","k":"list","zh":"我已发布","en":"My posts","a":[["forum-edit.html","上一步 · 发起新帖","Back · New post"],["forum-mine.html","下一步 · 我的收藏","Next · Saved threads"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":9,"len":11},"forum-mine.html":{"r":"forum","ds":"topics","k":"list","zh":"我的收藏","en":"Saved threads","a":[["forum-posted.html","上一步 · 我已发布","Back · My posts"],["forum-topic.html","下一步 · 帖子详情","Next · Thread detail"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":10,"len":11},"forum-topic.html":{"r":"forum","ds":"topics","k":"chat","zh":"帖子详情","en":"Thread detail","a":[["forum-mine.html","上一步 · 我的收藏","Back · Saved threads"],["forum.html","论坛首页","Forum home"],["experts.html","专家广场","Experts"]],"idx":11,"len":11},"account-profile.html":{"r":"account","ds":"users","k":"form","zh":"资料设置","en":"Profile","a":[["orders.html","上一步 · 我的订单","Back · My orders"],["account-security.html","下一步 · 账号安全","Next · Security"],["account.html","个人中心","My account"]],"idx":3,"len":12},"account-security.html":{"r":"account","ds":"users","k":"form","zh":"账号安全","en":"Security","a":[["account-profile.html","上一步 · 资料设置","Back · Profile"],["account-bind.html","下一步 · 绑定管理","Next · Linked accounts"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":4,"len":12},"account-bind.html":{"r":"account","ds":"users","k":"form","zh":"绑定管理","en":"Linked accounts","a":[["account-security.html","上一步 · 账号安全","Back · Security"],["account-address.html","下一步 · 收货地址","Next · Addresses"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":5,"len":12},"account-address.html":{"r":"account","ds":"users","k":"table","zh":"收货地址","en":"Addresses","a":[["account-bind.html","上一步 · 绑定管理","Back · Linked accounts"],["account-notice.html","下一步 · 消息通知","Next · Notifications"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":6,"len":12},"account-notice.html":{"r":"account","ds":"notices","k":"list","zh":"消息通知","en":"Notifications","a":[["account-address.html","上一步 · 收货地址","Back · Addresses"],["account-favorites.html","下一步 · 我的收藏","Next · Favorites"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":7,"len":12},"account-favorites.html":{"r":"account","ds":"farms","k":"list","zh":"我的收藏","en":"Favorites","a":[["account-notice.html","上一步 · 消息通知","Back · Notifications"],["account-following.html","下一步 · 我的关注","Next · Following"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":8,"len":12},"account-following.html":{"r":"account","ds":"users","k":"list","zh":"我的关注","en":"Following","a":[["account-favorites.html","上一步 · 我的收藏","Back · Favorites"],["account-invoice.html","下一步 · 发票管理","Next · Invoices"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":9,"len":12},"account-help.html":{"r":"account","ds":"notices","k":"chat","zh":"帮助工单","en":"Help tickets","a":[["account-invoice.html","上一步 · 发票管理","Back · Invoices"],["account-close.html","下一步 · 注销申请","Next · Close account"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":11,"len":12},"account-close.html":{"r":"account","ds":"users","k":"flow","zh":"注销申请","en":"Close account","a":[["account-help.html","上一步 · 帮助工单","Back · Help tickets"],["orders.html","我的订单","My orders"],["account.html","个人中心","My account"]],"idx":12,"len":12},"admin/index.html":{"r":"admin","ds":"farms","k":"list","zh":"总览","en":"Dashboard","a":[["admin/farms.html","下一步 · 田园台账","Next · Plot records"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":1,"len":16},"admin/farms.html":{"r":"admin","ds":"farms","k":"table","zh":"田园台账","en":"Plot records","a":[["admin/index.html","上一步 · 总览","Back · Dashboard"],["admin/users.html","下一步 · 用户台账","Next · User records"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":2,"len":16},"admin/users.html":{"r":"admin","ds":"users","k":"table","zh":"用户台账","en":"User records","a":[["admin/farms.html","上一步 · 田园台账","Back · Plot records"],["admin/workorders.html","下一步 · 工单台账","Next · Order records"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":3,"len":16},"admin/workorders.html":{"r":"admin","ds":"workorders","k":"table","zh":"工单台账","en":"Order records","a":[["admin/users.html","上一步 · 用户台账","Back · User records"],["admin/chats.html","下一步 · 聊天记录","Next · Chat logs"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":4,"len":16},"admin/chats.html":{"r":"admin","ds":"chats","k":"chat","zh":"聊天记录","en":"Chat logs","a":[["admin/workorders.html","上一步 · 工单台账","Back · Order records"],["admin/planting.html","下一步 · 种植记录","Next · Planting logs"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":5,"len":16},"admin/planting.html":{"r":"admin","ds":"plantings","k":"table","zh":"种植记录","en":"Planting logs","a":[["admin/chats.html","上一步 · 聊天记录","Back · Chat logs"],["admin/comments.html","下一步 · 评论台账","Next · Comment records"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":6,"len":16},"admin/comments.html":{"r":"admin","ds":"comments","k":"table","zh":"评论台账","en":"Comment records","a":[["admin/planting.html","上一步 · 种植记录","Back · Planting logs"],["admin/notices.html","下一步 · 公告管理","Next · Notices"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":7,"len":16},"admin/notices.html":{"r":"admin","ds":"notices","k":"table","zh":"公告管理","en":"Notices","a":[["admin/comments.html","上一步 · 评论台账","Back · Comment records"],["admin/prices.html","下一步 · 价格公示管理","Next · Published prices"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":8,"len":16},"admin/prices.html":{"r":"admin","ds":"farms","k":"list","zh":"价格公示管理","en":"Published prices","a":[["admin/notices.html","上一步 · 公告管理","Back · Notices"],["admin/audit.html","下一步 · 审核工作台","Next · Approval desk"],["admin/index.html","回总览","Dashboard"],["admin/logs.html","审计日志","Audit log"]],"idx":9,"len":16},"admin/audit.html":{"r":"admin","ds":"audits","k":"list","zh":"审核工作台","en":"Approval desk","a":[["admin/prices.html","上一步 · 价格公示管理","Back · Published prices"],["admin/audit-review.html","下一步 · 复审工作台","Next · Second review"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":10,"len":16},"admin/audit-review.html":{"r":"admin","ds":"audits","k":"flow","zh":"复审工作台","en":"Second review","a":[["admin/audit.html","上一步 · 审核工作台","Back · Approval desk"],["admin/audit-final.html","下一步 · 终审发布","Next · Final approval"],["admin/index.html","回总览","Dashboard"],["admin/logs.html","审计日志","Audit log"]],"idx":11,"len":16},"admin/audit-final.html":{"r":"admin","ds":"audits","k":"flow","zh":"终审发布","en":"Final approval","a":[["admin/audit-review.html","上一步 · 复审工作台","Back · Second review"],["admin/roles.html","下一步 · 权限角色","Next · Roles"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":12,"len":16},"admin/roles.html":{"r":"admin","ds":"users","k":"table","zh":"权限角色","en":"Roles","a":[["admin/audit-final.html","上一步 · 终审发布","Back · Final approval"],["admin/dict.html","下一步 · 数据字典","Next · Dictionary"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":13,"len":16},"admin/dict.html":{"r":"admin","ds":"notices","k":"table","zh":"数据字典","en":"Dictionary","a":[["admin/roles.html","上一步 · 权限角色","Back · Roles"],["admin/export.html","下一步 · 导出任务","Next · Exports"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":14,"len":16},"admin/export.html":{"r":"admin","ds":"orders","k":"table","zh":"导出任务","en":"Exports","a":[["admin/dict.html","上一步 · 数据字典","Back · Dictionary"],["admin/logs.html","下一步 · 审计日志","Next · Audit log"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"]],"idx":15,"len":16},"admin/logs.html":{"r":"admin","ds":"audits","k":"flow","zh":"审计日志","en":"Audit log","a":[["admin/export.html","上一步 · 导出任务","Back · Exports"],["admin/index.html","回总览","Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"]],"idx":16,"len":16},"index.html":{"r":"public","ds":"farms","k":"list","zh":"首页","en":"Home","a":[["sitemap.html","下一步 · 站点地图","Next · Sitemap"],["index.html","首页","Home"],["price.html","价格公示","Price book"]],"idx":1,"len":15},"sitemap.html":{"r":"public","ds":"farms","k":"list","zh":"站点地图","en":"Sitemap","a":[["index.html","上一步 · 首页","Back · Home"],["help.html","下一步 · 帮助中心","Next · Help"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":2,"len":15},"help.html":{"r":"public","ds":"notices","k":"info","zh":"帮助中心","en":"Help","a":[["sitemap.html","上一步 · 站点地图","Back · Sitemap"],["about.html","下一步 · 关于我们","Next · About"],["index.html","首页","Home"],["price.html","价格公示","Price book"]],"idx":3,"len":15},"about.html":{"r":"public","ds":"notices","k":"info","zh":"关于我们","en":"About","a":[["help.html","上一步 · 帮助中心","Back · Help"],["contact.html","下一步 · 联系我们","Next · Contact"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":4,"len":15},"contact.html":{"r":"public","ds":"users","k":"form","zh":"联系我们","en":"Contact","a":[["about.html","上一步 · 关于我们","Back · About"],["terms.html","下一步 · 服务协议","Next · Terms"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":5,"len":15},"terms.html":{"r":"public","ds":"notices","k":"info","zh":"服务协议","en":"Terms","a":[["contact.html","上一步 · 联系我们","Back · Contact"],["privacy.html","下一步 · 隐私政策","Next · Privacy"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":6,"len":15},"privacy.html":{"r":"public","ds":"notices","k":"info","zh":"隐私政策","en":"Privacy","a":[["terms.html","上一步 · 服务协议","Back · Terms"],["disclaimer.html","下一步 · 免责声明","Next · Disclaimer"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":7,"len":15},"disclaimer.html":{"r":"public","ds":"notices","k":"info","zh":"免责声明","en":"Disclaimer","a":[["privacy.html","上一步 · 隐私政策","Back · Privacy"],["maintenance.html","下一步 · 维护公告","Next · Maintenance"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":8,"len":15},"maintenance.html":{"r":"public","ds":"notices","k":"info","zh":"维护公告","en":"Maintenance","a":[["disclaimer.html","上一步 · 免责声明","Back · Disclaimer"],["404.html","下一步 · 页面不存在","Next · Not found"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":9,"len":15},"404.html":{"r":"public","ds":"farms","k":"info","zh":"页面不存在","en":"Not found","a":[["maintenance.html","上一步 · 维护公告","Back · Maintenance"],["login.html","下一步 · 登录 / 注册","Next · Sign in"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":10,"len":15},"login.html":{"r":"public","ds":"users","k":"list","zh":"登录 / 注册","en":"Sign in","a":[["404.html","上一步 · 页面不存在","Back · Not found"],["forgot.html","下一步 · 找回口令","Next · Recover password"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":11,"len":15},"forgot.html":{"r":"public","ds":"users","k":"list","zh":"找回口令","en":"Recover password","a":[["login.html","上一步 · 登录 / 注册","Back · Sign in"],["search.html","下一步 · 全站搜索","Next · Search"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":12,"len":15},"search.html":{"r":"public","ds":"farms","k":"list","zh":"全站搜索","en":"Search","a":[["forgot.html","上一步 · 找回口令","Back · Recover password"],["videos.html","下一步 · 热点视频","Next · Videos"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":13,"len":15},"videos.html":{"r":"public","ds":"videos","k":"list","zh":"热点视频","en":"Videos","a":[["search.html","上一步 · 全站搜索","Back · Search"],["promo.html","下一步 · 田园宣发","Next · Campaigns"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":14,"len":15},"promo.html":{"r":"public","ds":"promos","k":"list","zh":"田园宣发","en":"Campaigns","a":[["videos.html","上一步 · 热点视频","Back · Videos"],["index.html","首页","Home"],["sitemap.html","站点地图","Sitemap"],["price.html","价格公示","Price book"]],"idx":15,"len":15},"price-lease.html":{"r":"price","ds":"farms","k":"list","zh":"田块租金标准","en":"Plot rent standard","a":[["price.html","上一步 · 价格公示总览","Back · Price book"],["price-venue.html","下一步 · 场地与活动价目","Next · Venue & event rates"],["price-calc.html","租金试算","Rent calculator"]],"idx":2,"len":8},"price-venue.html":{"r":"price","ds":"activities","k":"list","zh":"场地与活动价目","en":"Venue & event rates","a":[["price-lease.html","上一步 · 田块租金标准","Back · Plot rent standard"],["price-job.html","下一步 · 工单与专家服务价","Next · Field-work & expert rates"],["price.html","公示总览","Price book"],["price-calc.html","租金试算","Rent calculator"]],"idx":3,"len":8},"price-produce.html":{"r":"price","ds":"produces","k":"list","zh":"农产品与配送价目","en":"Produce & delivery rates","a":[["price-job.html","上一步 · 工单与专家服务价","Back · Field-work & expert rates"],["price-calc.html","下一步 · 租金试算","Next · Rent calculator"],["price.html","公示总览","Price book"]],"idx":5,"len":8},"price-calc.html":{"r":"price","ds":"farms","k":"list","zh":"租金试算","en":"Rent calculator","a":[["price-produce.html","上一步 · 农产品与配送价目","Back · Produce & delivery rates"],["price-rules.html","下一步 · 公示规则与口径","Next · Rules & basis"],["price.html","公示总览","Price book"],["price-calc.html","租金试算","Rent calculator"]],"idx":6,"len":8},"price-rules.html":{"r":"price","ds":"notices","k":"list","zh":"公示规则与口径","en":"Rules & basis","a":[["price-calc.html","上一步 · 租金试算","Back · Rent calculator"],["price-changes.html","下一步 · 调价公示历史","Next · Rate change log"],["price.html","公示总览","Price book"]],"idx":7,"len":8},"price-changes.html":{"r":"price","ds":"notices","k":"list","zh":"调价公示历史","en":"Rate change log","a":[["price-rules.html","上一步 · 公示规则与口径","Back · Rules & basis"],["price.html","公示总览","Price book"],["price-calc.html","租金试算","Rent calculator"]],"idx":8,"len":8},"workorder-cancel.html":{"r":"tenant","ds":"workorders","k":"form","zh":"取消工单","en":"Cancel a job","a":[["workorders.html","上一步 · 工单总览","Back · All jobs"],["workorder-detail.html","查看原工单","Open the job"],["workorder-refund.html","下一步 · 申请退款","Next · Request a refund"],["workorder-changes.html","变更记录","Change log"]],"idx":1,"len":6},"workorder-refund.html":{"r":"tenant","ds":"refunds","k":"form","zh":"申请退款","en":"Request a refund","a":[["workorder-cancel.html","上一步 · 取消工单","Back · Cancel job"],["workorder-refund-status.html","下一步 · 退款进度","Next · Refund progress"],["workorders.html","工单总览","All jobs"],["price.html","核对公示价","Check published rates"]],"idx":2,"len":6},"workorder-refund-status.html":{"r":"tenant","ds":"refunds","k":"flow","zh":"退款进度","en":"Refund progress","a":[["workorder-refund.html","上一步 · 申请退款","Back · Request a refund"],["farmer-funds.html","资金流水","Fund ledger"],["workorder-changes.html","变更记录","Change log"],["account.html","回个人中心","My account"]],"idx":3,"len":6},"workorder-edit.html":{"r":"tenant","ds":"workorders","k":"form","zh":"修改工单","en":"Amend a job","a":[["workorders.html","上一步 · 工单总览","Back · All jobs"],["workorder-changes.html","下一步 · 变更记录","Next · Change log"],["workorder-detail.html","查看原工单","Open the job"],["workorder-refund.html","申请退款","Request a refund"]],"idx":4,"len":6},"workorder-reopen.html":{"r":"tenant","ds":"workorders","k":"form","zh":"重新发起工单","en":"Reissue a job","a":[["workorder-cancel.html","上一步 · 取消工单","Back · Cancel job"],["workorder-detail.html","下一步 · 新工单详情","Next · New job detail"],["workorder-changes.html","变更记录","Change log"],["account.html","回个人中心","My account"]],"idx":5,"len":6},"workorder-changes.html":{"r":"tenant","ds":"jobChanges","k":"table","zh":"工单变更记录","en":"Job change log","a":[["workorder-cancel.html","上一步 · 取消工单","Back · Cancel job"],["workorder-edit.html","修改工单","Amend a job"],["workorder-reopen.html","重新发起","Reissue a job"],["workorders.html","工单总览","All jobs"]],"idx":6,"len":6},"lease-edit.html":{"r":"merchant","ds":"farms","k":"form","zh":"修改租赁信息","en":"Edit lease terms","a":[["farm-manage.html","上一步 · 田园管理","Back · Plot management"],["contract-manage.html","下一步 · 合同管理","Next · Contracts"],["price-lease.html","核对租金标准","Check rent rates"],["farms.html","田园档案","Plot archive"]],"idx":1,"len":12},"contract-manage.html":{"r":"merchant","ds":"contracts","k":"table","zh":"合同管理","en":"Contract management","a":[["lease-edit.html","上一步 · 修改租赁信息","Back · Edit lease"],["contract-edit.html","下一步 · 编辑合同内容","Next · Edit clauses"],["contract-versions.html","版本对比","Version diff"],["merchant-reconcile.html","对账中心","Reconciliation"]],"idx":2,"len":12},"contract-edit.html":{"r":"merchant","ds":"contracts","k":"form","zh":"编辑合同内容","en":"Edit contract clauses","a":[["contract-manage.html","上一步 · 合同管理","Back · Contracts"],["contract-versions.html","下一步 · 版本对比","Next · Version diff"],["merchant-reconcile.html","对账中心","Reconciliation"],["farms.html","田园档案","Plot archive"]],"idx":3,"len":12},"contract-versions.html":{"r":"merchant","ds":"contractVersions","k":"table","zh":"合同版本对比","en":"Contract version diff","a":[["contract-edit.html","上一步 · 编辑合同内容","Back · Edit clauses"],["merchant-reconcile.html","下一步 · 对账中心","Next · Reconciliation"],["contract-manage.html","合同管理","Contracts"],["price.html","核对公示价","Check published rates"]],"idx":4,"len":12},"merchant-reconcile.html":{"r":"merchant","ds":"reconciliations","k":"stats","zh":"对账中心","en":"Reconciliation centre","a":[["contract-versions.html","上一步 · 版本对比","Back · Version diff"],["merchant-bills.html","下一步 · 账单明细","Next · Bill lines"],["merchant-reconcile-detail.html","对账单详情","Statement detail"],["farm-manage.html","田园管理","Plot management"]],"idx":5,"len":12},"merchant-bills.html":{"r":"merchant","ds":"bills","k":"table","zh":"账单明细","en":"Bill lines","a":[["merchant-reconcile.html","上一步 · 对账中心","Back · Reconciliation"],["merchant-reconcile-detail.html","下一步 · 对账单详情","Next · Statement detail"],["activity-manage.html","活动管理","Event management"],["price.html","核对公示价","Check published rates"]],"idx":6,"len":12},"merchant-reconcile-detail.html":{"r":"merchant","ds":"bills","k":"detail","zh":"对账单详情","en":"Statement detail","a":[["merchant-bills.html","上一步 · 账单明细","Back · Bill lines"],["activity-manage.html","下一步 · 活动管理","Next · Event management"],["merchant-reconcile.html","对账中心","Reconciliation"],["account.html","回个人中心","My account"]],"idx":7,"len":12},"activity-manage.html":{"r":"merchant","ds":"activityVersions","k":"table","zh":"活动管理","en":"Event management","a":[["merchant-reconcile-detail.html","上一步 · 对账单详情","Back · Statement detail"],["activity-publish.html","下一步 · 发布活动","Next · Publish an event"],["activity-edit.html","更新活动","Update an event"],["activity.html","田园活动","Field events"]],"idx":8,"len":12},"activity-publish.html":{"r":"merchant","ds":"activities","k":"form","zh":"发布活动","en":"Publish an event","a":[["activity-manage.html","上一步 · 活动管理","Back · Event management"],["activity-edit.html","下一步 · 更新活动","Next · Update an event"],["activity-versions.html","内容版本","Content versions"],["price-venue.html","核对场租","Check venue rates"]],"idx":9,"len":12},"activity-edit.html":{"r":"merchant","ds":"activities","k":"form","zh":"更新活动","en":"Update an event","a":[["activity-publish.html","上一步 · 发布活动","Back · Publish an event"],["activity-versions.html","下一步 · 内容版本","Next · Content versions"],["activity-registrations.html","报名名单","Sign-ups"],["activity.html","田园活动","Field events"]],"idx":10,"len":12},"activity-versions.html":{"r":"merchant","ds":"activityVersions","k":"table","zh":"活动内容版本","en":"Event content versions","a":[["activity-edit.html","上一步 · 更新活动","Back · Update an event"],["activity-registrations.html","下一步 · 报名名单","Next · Sign-ups"],["activity-manage.html","活动管理","Event management"],["price.html","核对公示价","Check published rates"]],"idx":11,"len":12},"activity-registrations.html":{"r":"merchant","ds":"orders","k":"table","zh":"报名名单","en":"Event sign-ups","a":[["activity-versions.html","上一步 · 内容版本","Back · Content versions"],["activity-manage.html","下一步 · 活动管理","Next · Event management"],["activity-checkin.html","现场签到","On-site check-in"],["farm-manage.html","田园管理","Plot management"]],"idx":12,"len":12},"farmer-wallet.html":{"r":"grower","ds":"funds","k":"stats","zh":"资金总览","en":"My wallet","a":[["dispatch.html","上一步 · 接单大厅","Back · Dispatch hall"],["farmer-funds.html","下一步 · 资金流水","Next · Fund ledger"],["farmer-withdraw.html","申请提现","Withdraw funds"],["price-job.html","核对工单价","Check job rates"]],"idx":1,"len":5},"farmer-funds.html":{"r":"grower","ds":"funds","k":"table","zh":"资金流水","en":"Fund ledger","a":[["farmer-wallet.html","上一步 · 资金总览","Back · Wallet"],["farmer-settlement.html","下一步 · 结算单","Next · Settlements"],["farmer-withdraw.html","申请提现","Withdraw funds"],["dispatch-history.html","作业历史","Work history"]],"idx":2,"len":5},"farmer-settlement.html":{"r":"grower","ds":"workorders","k":"table","zh":"结算单","en":"Settlement statements","a":[["farmer-funds.html","上一步 · 资金流水","Back · Fund ledger"],["farmer-withdraw.html","下一步 · 申请提现","Next · Withdraw funds"],["farmer-wallet.html","资金总览","Wallet"],["dispatch-settle.html","工单结算","Job settlement"]],"idx":3,"len":5},"farmer-withdraw.html":{"r":"grower","ds":"withdrawals","k":"form","zh":"申请提现","en":"Withdraw funds","a":[["farmer-settlement.html","上一步 · 结算单","Back · Settlements"],["farmer-withdraw-status.html","下一步 · 提现进度","Next · Withdrawal progress"],["farmer-funds.html","资金流水","Fund ledger"],["account.html","回个人中心","My account"]],"idx":4,"len":5},"farmer-withdraw-status.html":{"r":"grower","ds":"withdrawals","k":"flow","zh":"提现进度","en":"Withdrawal progress","a":[["farmer-withdraw.html","上一步 · 申请提现","Back · Withdraw funds"],["farmer-wallet.html","下一步 · 资金总览","Next · Wallet"],["farmer-funds.html","资金流水","Fund ledger"],["dispatch.html","接单大厅","Dispatch hall"]],"idx":5,"len":5},"expert-stats.html":{"r":"expert","ds":"plantRecords","k":"stats","zh":"多维统计","en":"Multi-dimensional analytics","a":[["experts.html","上一步 · 专家频道","Back · Experts"],["expert-compare.html","下一步 · 数据对比","Next · Compare data"],["expert-planting-query.html","种植记录查询","Field record query"],["expert-points.html","积分口径","Points rules"]],"idx":1,"len":6},"expert-compare.html":{"r":"expert","ds":"farms","k":"detail","zh":"数据对比","en":"Compare data","a":[["expert-stats.html","上一步 · 多维统计","Back · Analytics"],["expert-regulation.html","下一步 · 调控建议","Next · Control advice"],["expert-planting-query.html","种植记录查询","Field record query"],["price.html","核对公示价","Check published rates"]],"idx":2,"len":6},"expert-regulation.html":{"r":"expert","ds":"regulations","k":"form","zh":"调控建议","en":"Control advice","a":[["expert-compare.html","上一步 · 数据对比","Back · Compare data"],["expert-regulation-log.html","下一步 · 调控记录","Next · Control log"],["expert-stats.html","多维统计","Analytics"],["expert-detail.html","专家主页","Expert profile"]],"idx":3,"len":6},"expert-regulation-log.html":{"r":"expert","ds":"regulations","k":"table","zh":"调控记录","en":"Control log","a":[["expert-regulation.html","上一步 · 调控建议","Back · Control advice"],["expert-planting-query.html","下一步 · 种植记录查询","Next · Field record query"],["expert-regulation-log.html","调控记录","Control log"],["experts.html","专家频道","Experts"]],"idx":4,"len":6},"expert-planting-query.html":{"r":"expert","ds":"plantRecords","k":"table","zh":"种植记录查询","en":"Field record query","a":[["expert-regulation-log.html","上一步 · 调控记录","Back · Control log"],["expert-planting-detail.html","下一步 · 记录详情","Next · Record detail"],["expert-stats.html","多维统计","Analytics"],["experts.html","专家频道","Experts"]],"idx":5,"len":6},"expert-planting-detail.html":{"r":"expert","ds":"plantRecords","k":"detail","zh":"种植记录详情","en":"Field record detail","a":[["expert-planting-query.html","上一步 · 种植记录查询","Back · Field record query"],["expert-stats.html","下一步 · 多维统计","Next · Analytics"],["expert-regulation.html","调控建议","Control advice"],["experts.html","专家频道","Experts"]],"idx":6,"len":6},"admin/refunds.html":{"r":"admin","ds":"refunds","k":"table","zh":"退款审核","en":"Refund review","a":[["admin/index.html","上一步 · 后台总览","Back · Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"],["admin/export.html","导出任务","Exports"]],"idx":1,"len":4},"admin/withdrawals.html":{"r":"admin","ds":"withdrawals","k":"table","zh":"提现复核","en":"Withdrawal review","a":[["admin/index.html","上一步 · 后台总览","Back · Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"],["admin/export.html","导出任务","Exports"]],"idx":1,"len":4},"admin/contracts.html":{"r":"admin","ds":"contractVersions","k":"table","zh":"合同版本台账","en":"Contract version ledger","a":[["admin/index.html","上一步 · 后台总览","Back · Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"],["admin/export.html","导出任务","Exports"]],"idx":1,"len":4},"admin/regulations.html":{"r":"admin","ds":"regulations","k":"table","zh":"调控记录台账","en":"Control advice ledger","a":[["admin/index.html","上一步 · 后台总览","Back · Dashboard"],["admin/audit.html","审核工作台","Approval desk"],["admin/logs.html","审计日志","Audit log"],["admin/export.html","导出任务","Exports"]],"idx":1,"len":4}};
var ROLE_LABEL = {"tenant": "租户 / 普通租赁用户", "activity": "租户 / 活动与场地", "produce": "租户 / 农产品", "merchant": "田园商家 / 村集体", "grower": "接单农户", "expert": "技术专家 / 产学研", "job": "农事工单类型", "forum": "论坛用户", "account": "账号设置", "admin": "平台管理员", "public": "公共信息", "price": "价格公示"};
var ROLE_LABEL_EN = {"tenant": "Tenant", "activity": "Tenant · events", "produce": "Tenant · produce", "merchant": "Merchant / collective", "grower": "Grower", "expert": "Expert / research", "job": "Job types", "forum": "Forum user", "account": "Account", "admin": "Platform admin", "public": "Public", "price": "Price book"};
  var BIZ_FIELDS = {
    farms: [['plotNo','田块编号','Plot no.'],['nameZh','田园名称','Plot name'],['region','所属地区','Region'],['soil','土壤类型','Soil'],
      ['areaMu','实测面积（亩）','Area (mu)'],['leaseType','承包类型','Lease type'],['leaseStart','承包起','From'],['leaseEnd','承包止','To'],
      ['price','公示单价（元/亩/季）','Published rate'],['currentCrops','当前作物','Current crops'],['pastCrops','曾种成功作物','Past crops'],
      ['harvest','历史采摘成果','Harvest record'],['facilities','配套设施','Facilities'],['rating','评分','Rating']],
    activities: [['titleZh','活动名称','Event'],['kind','类型','Type'],['date','日期','Date'],['capacity','名额','Capacity'],
      ['booked','已报名','Booked'],['price','报名价（元/人）','Sign-up fee'],['farmId','关联田园','Linked plot']],
    produces: [['nameZh','农产品','Produce'],['traceNo','溯源批次','Trace no.'],['category','品类','Category'],
      ['season','季节','Season'],['price','公示单价','Unit price'],['unit','规格单位','Unit'],['stock','当前库存','Stock'],['farmId','溯源田园','Source plot']],
    workorders: [['id','工单号','Job no.'],['type','作业类型','Type'],['status','当前状态','Status'],['farmId','关联田园','Linked plot'],
      ['userId','发布人','Publisher'],['assigneeId','承接人','Assignee'],['createdAt','发布时间','Published'],['dueAt','期望完成','Due'],
      ['price','公示价（元）','Published price'],['settleMode','结算方式','Settlement'],['priority','优先级','Priority']],
    dispatches: [['id','需求编号','Request no.'],['kind','需求类型','Type'],['region','区域','Region'],['distanceKm','距离（km）','Distance'],
      ['publishedAt','发布时间','Published'],['status','状态','Status'],['workorderId','关联工单','Job no.']],
    orders: [['id','订单号','Order no.'],['kind','订单类型','Type'],['farmId','关联田园','Linked plot'],['amount','订单金额（元）','Amount'],
      ['status','订单状态','Status'],['createdAt','下单时间','Placed at'],['items','订单条目','Items']],
    experts: [['nameZh','专家','Expert'],['title','职称/方向','Title'],['points','积分','Points'],['level','认证等级','Level'],
      ['farmCount','关联田园','Linked plots'],['trials','种植实践','Field trials'],['columns','技术专栏','Columns']],
    topics: [['titleZh','帖子标题','Thread'],['board','所属版块','Board'],['author','作者','Author'],
      ['publishedAt','发布时间','Published'],['replies','回复数','Replies'],['likes','收藏数','Saves']],
    comments: [['id','评论号','Review no.'],['targetId','对象','Target'],['userId','评论人','Author'],['rating','评分','Rating'],
      ['bodyZh','评论内容','Review'],['createdAt','时间','At'],['status','状态','Status']],
    chats: [['id','消息号','Msg no.'],['fromId','发言人','From'],['bodyZh','内容','Message'],['at','时间','At'],['kind','类型','Kind']],
    plantings: [['id','记录号','Log no.'],['farmId','田园','Plot'],['crop','作物','Crop'],['stage','生长阶段','Stage'],
      ['at','记录时间','At'],['operator','记录人','By']],
    audits: [['id','审核单号','Audit no.'],['targetType','审核对象','Target'],['targetId','对象编号','Target id'],
      ['level','审核级别','Level'],['status','状态','Status'],['operator','操作人','Operator'],['at','时间','At'],['commentZh','审核意见','Note']],
    notices: [['titleZh','公告标题','Notice'],['level','级别','Level'],['at','生效日期','Effective'],['bodyZh','正文','Body']],
    users: [['nameZh','账号名称','Account'],['role','身份','Role'],['region','所属地区','Region'],['status','状态','Status']],
    videos: [['titleZh','视频标题','Video'],['tag','标签','Tag'],['duration','时长','Duration'],['views','播放量','Views'],['publishedAt','发布时间','At']],
    promos: [['titleZh','宣发标题','Story'],['channel','渠道','Channel'],['publishedAt','发布时间','At'],['farmId','关联田园','Plot']],
    jobChanges: [['id','变更号','Change no.'],['workorderId','原工单','Job no.'],['kind','变更类型','Change type'],['fromStatus','变更前','From'],['toStatus','变更后','To'],['reasonZh','原因','Reason'],['operator','操作人','By'],['at','时间','At'],['amountImpact','金额影响','Amount impact']],
    refunds: [['id','退款单号','Refund no.'],['orderId','关联订单','Order no.'],['workorderId','关联工单','Job no.'],['amountPaid','已付金额','Paid'],['usedAmount','已作业金额','Delivered'],['serviceFee','服务费','Service fee'],['refundAmount','应退金额','Refundable'],['status','状态','Status'],['method','退回方式','Method'],['appliedAt','申请时间','Applied at']],
    contracts: [['id','合同号','Contract no.'],['farmId','关联田园','Plot'],['plotNo','田块编号','Plot no.'],['version','版本','Version'],['leaseType','承包类型','Lease type'],['rentPerSeason','一季租金','Season rent'],['deposit','押金','Deposit'],['status','状态','Status'],['signedAt','签署时间','Signed at']],
    contractVersions: [['id','版本号','Version no.'],['contractId','合同号','Contract no.'],['clauseZh','条款','Clause'],['beforeZh','变更前','Before'],['afterZh','变更后','After'],['reasonZh','变更原因','Reason'],['changedBy','提交人','By'],['at','时间','At']],
    bills: [['id','账单号','Bill no.'],['period','账期','Period'],['farmId','关联田园','Plot'],['kind','类型','Type'],['receivable','应收','Receivable'],['received','已收','Received'],['serviceFee','服务费','Fee'],['refunded','退款','Refunded'],['net','净额','Net'],['status','状态','Status']],
    reconciliations: [['id','对账单号','Statement no.'],['period','账期','Period'],['subject','对账主体','Subject'],['orders','账单笔数','Bills'],['gross','应收合计','Gross'],['fee','服务费','Fee'],['refunded','退款','Refunded'],['net','净额','Net'],['status','状态','Status'],['checkedAt','核对日期','Checked at']],
    funds: [['id','流水号','Entry no.'],['kind','类型','Type'],['amount','金额（元）','Amount'],['balanceAfter','变动后余额','Balance after'],['status','状态','Status'],['relatedId','关联单号','Related'],['at','时间','At']],
    withdrawals: [['id','提现单号','Withdrawal no.'],['amount','申请金额','Amount'],['fee','手续费','Fee'],['arrive','到账金额','Net'],['bank','到账账户','Bank'],['status','状态','Status'],['appliedAt','申请时间','Applied at']],
    activityVersions: [['id','版本号','Version no.'],['activityId','活动号','Event no.'],['titleZh','活动名称','Event'],['price','公示价','Published price'],['capacity','名额','Seats'],['status','状态','Status'],['changeZh','本次变更','Change'],['operator','操作人','By'],['at','时间','At']],
    regulations: [['id','建议编号','Advice no.'],['farmId','关联田园','Plot'],['dimension','调控维度','Dimension'],['readingBefore','调整前读数','Before'],['target','目标区间','Target'],['actionZh','调控动作','Action'],['status','状态','Status'],['reviewZh','复核结论','Review'],['at','时间','At']],
    plantRecords: [['id','记录号','Record no.'],['farmId','田园','Plot'],['plotNo','田块编号','Plot no.'],['crop','作物','Crop'],['stage','生长阶段','Stage'],['temp','温度（℃）','Temp'],['humid','湿度（%）','Humidity'],['soilMoisture','含水率（%）','Soil moisture'],['heightCm','株高（cm）','Height'],['yieldKg','预估产量（kg）','Est. yield'],['operator','记录人','By'],['at','时间','At']]
  };
  function bizFieldLabel(ds, k) {
    var list = BIZ_FIELDS[ds] || [];
    for (var i = 0; i < list.length; i++) if (list[i][0] === k) return lang === 'en' ? list[i][2] : list[i][1];
    return k;
  }
  function bizScalar(v) {
    if (v === undefined || v === null) return '—';
    if (Array.isArray(v)) return v.join(' / ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
  /* ================= 业务节点专属渲染层（五角色链路） =================
     除 ROUTES 里已专属实现的页面外，其余业务节点不再套通用占位模板：
     按 BIZ[page] 的角色、数据集、视图类型与流程位置渲染真实记录、专属字段、
     动作条、状态时间线与沟通交流框。数量文案全部由数据集动态算；
     详情按 URL 参数渲染；每个按钮都指向链上真实存在的下一节点。 */
  function bizKey() { return (location.pathname.indexOf('/admin/') >= 0 ? 'admin/' : '') + hereFile(); }
  function bizRecord(ds) {
    var q = param('id') || param('farm') || param('farmId') || param('job') || param('order') ||
            param('activity') || param('produce') || param('venue') || param('trial') || param('target');
    var list = M.all(ds);
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(q)) return list[i];
    return list[0] || {};
  }
  function bizParams() {
    var out = {}, keys = ['id','farm','farmId','job','order','activity','produce','venue','trial','target','role','mode'];
    keys.forEach(function (k) { var v = param(k); if (v) out[k] = v; });
    return out;
  }
  function bizAction(a) {
    var target = a[0];
    /* 后台目录内统一去前缀，避免叠成 /admin/admin/；前台保持原样 */
    if (location.pathname.indexOf('/admin/') >= 0 && target.indexOf('admin/') === 0) target = target.slice(6);
    var ex = bizParams(); ex.from = hereFile();
    if (!ex.id && !ex.farm && !ex.job && !ex.order) {
      var r = bizRecord((BIZ[bizKey()] || {}).ds || 'farms');
      if (r && r.id) ex.id = r.id;
    }
    return '<a class="sf-biz-btn' + (a[1].indexOf('下一步') === 0 ? ' is-next' : '') + '" href="' +
      esc(link(target, ex)) + '" title="' + esc(lang === 'en' ? a[2] : a[1]) + '">' +
      esc(lang === 'en' ? a[2] : a[1]) + '</a>';
  }
  function bizActions(cfg) {
    return '<div class="sf-biz-actions"><span class="sf-biz-role">' +
      esc(lang === 'en' ? ROLE_LABEL_EN[cfg.r] : ROLE_LABEL[cfg.r]) +
      ' · ' + (lang === 'en' ? 'step ' : '第 ') + cfg.idx + ' / ' + cfg.len +
      (lang === 'en' ? '' : ' 步') + '</span>' +
      cfg.a.map(bizAction).join('') + '</div>';
  }
  function bizRows(ds, rec, n) {
    var list = BIZ_FIELDS[ds] || Object.keys(rec || {}).slice(0, n || 8).map(function (k) { return [k,k,k]; });
    return list.slice(0, n || 8).map(function (f) {
      return '<tr><th>' + esc(lang === 'en' ? f[2] : f[1]) + '</th><td>' +
        esc(bizScalar(rec[f[0]])) + '</td></tr>';
    }).join('');
  }
  function bizTable(ds, items, n) {
    /* 台账类业务节点保留常规管控条：全选可逆、删除二次确认、分享当前记录。
       类名沿用 .sf-check-del 以便与既有全局事件委托共用，不重复实现删除逻辑。 */
    var E = lang === 'en';
    var bar = '<div class="sf-biz-tools">' +
      '<button class="sf-btn" data-act="selectAll" type="button">' + t('common.selectAll') + '</button>' +
      '<button class="sf-btn is-danger" data-act="delete" type="button">' + t('common.delete') + '</button>' +
      '<button class="sf-btn" data-act="share" type="button">' + t('common.share') + '</button>' +
      '<span class="sf-biz-tools-note">' + esc(E ? 'Selection applies to this page only' : '勾选只作用于本页，删除前会二次确认') + '</span></div>';
    var list = (BIZ_FIELDS[ds] || []).slice(0, 6);
    var rows = items.slice(0, n || 8).map(function (x) {
      return '<tr><td><input type="checkbox" class="sf-check-del" aria-label="' +
        esc(E ? 'select this row' : '选择本行') + '"></td>' +
        list.map(function (f) { return '<td>' + esc(bizScalar(x[f[0]])) + '</td>'; }).join('') +
        '<td><a class="sf-biz-link" href="' + esc(link(hereFile(), { id: x.id, from: hereFile() })) + '">' +
        esc(lang === 'en' ? 'Open' : '查看') + '</a></td></tr>';
    }).join('');
    return bar + '<div class="sf-biz-scroll"><table class="sf-biz-table"><thead><tr>' +
      '<th></th>' + list.map(function (f) { return '<th>' + esc(lang === 'en' ? f[2] : f[1]) + '</th>'; }).join('') +
      '<th>' + (lang === 'en' ? 'Action' : '操作') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function bizList(ds, items, n) {
    return '<div class="sf-biz-list">' + items.slice(0, n || 8).map(function (x) {
      var title = x.titleZh || x.nameZh || x.id || x.type || x.kind || '记录';
      var titleEn = x.titleEn || x.nameEn || title;
      var meta = [x.plotNo, x.region, x.status, x.createdAt || x.publishedAt || x.at, x.kind, x.board]
        .filter(Boolean).slice(0, 3).join(' · ');
      return '<div class="sf-biz-line"><a href="' + esc(link(hereFile(), { id: x.id, from: hereFile() })) + '">' +
        '<b>' + esc(lang === 'en' ? titleEn : title) + '</b></a>' +
        '<span>' + esc(meta) + '</span>' +
        '<small>' + esc(x.id || '') + '</small></div>';
    }).join('') + '</div>';
  }
  function bizForm(cfg, rec) {
    var E = lang === 'en';
    var F = {
      'farms-lease.html': [['seasons','承包季数','Seasons','number','1'],['leaseType','承包类型','Lease type','select','整季承包|半年托管|分时认领|试验小区'],['contact','联系人','Contact','text','']],
      'farm-payment.html': [['method','支付方式','Payment method','select','平台担保支付|线下转账|村集体统一结算'],['amount','应付金额（元）','Amount due','number','' + Math.round((rec.price || 680) * (rec.areaMu || 1.2))],['payer','付款人','Payer','text','']],
      'activity-signup.html': [['name','报名人','Name','text',''],['count','报名人数','Seats','number','1'],['phone','联系电话','Phone','text','']],
      'venue-booking.html': [['date','使用日期','Date','date','2026-11-20'],['slot','时段','Slot','select','半天|全天|过夜'],['guests','人数','Guests','number','10']],
      'produce-checkout.html': [['qty','数量','Quantity','number','2'],['address','收货地址','Delivery address','text','成都·崇州道明镇'],['note','备注','Note','text','']],
      'dispatch-accept.html': [['estimate','预计到场','Arrival','date','2026-11-18'],['team','作业人数','Crew size','number','2'],['note','承接说明','Note','text','按明细条目作业并上传三段回执']],
      'dispatch-receipt.html': [['scope','作业范围完成情况','Scope completed','text','全畦完成，四至与界桩一致'],['actual','实际用量','Actual dosage','text','按面积核定'],['photos','回执照片（开工/作业中/完工）','Receipt photos','text','3 张，含田块编号牌']],
      'dispatch-verify.html': [['result','验收结论','Result','select','通过|退回补正'],['note','核对说明','Check note','text','逐条对照明细需求与回执照片']],
      'expert-apply.html': [['org','所属机构','Institution','text',''],['field','技术方向','Field','select','土壤与施肥|育种与育苗|病虫害防治|采后与溯源'],['years','从业年限','Years','number','5']],
      'expert-conclusion.html': [['readings','现场读数','Field readings','text','土壤含水率 62%，株高 34cm'],['conclusion','技术结论','Conclusion','text','建议追施有机肥并延后 3 天灌溉'],['advice','后续建议','Follow-up','text','下次巡田复核对照区读数']],
      'account-profile.html': [['name','显示名称','Display name','text',''],['phone','联系电话','Phone','text',''],['region','常驻地区','Region','text','成都']],
      'account-security.html': [['old','原口令','Current password','password',''],['new','新口令','New password','password',''],['repeat','重复新口令','Repeat password','password','']],
      'account-bind.html': [['account','待绑定账号','Account to link','text',''],['kind','绑定类型','Link type','select','微信|手机号|村集体账号']],
      'contact.html': [['name','称呼','Name','text',''],['email','邮箱','Email','text',''],['message','留言','Message','text','']],
      'forum-edit.html': [['title','标题','Title','text',''],['board','版块','Board','select','热门田园|种植经验|活动|技术咨询'],['body','正文','Body','text','']]
    }[bizKey()] || [['title','标题','Title','text',''],['content','内容','Content','text',''],['remark','备注','Note','text','']];
    var inputs = F.map(function (f) {
      var v = f[4] || '';
      if (f[3] === 'select') {
        return '<label class="sf-biz-field"><span>' + esc(E ? f[2] : f[1]) + '</span><select class="sf-input" name="' + f[0] + '">' +
          v.split('|').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>';
      }
      if (f[3] === 'text' && f[0].indexOf('body') >= 0 || f[0] === 'message' || f[0] === 'conclusion' || f[0] === 'advice' || f[0] === 'note') {
        return '<label class="sf-biz-field"><span>' + esc(E ? f[2] : f[1]) + '</span><textarea class="sf-textarea" name="' + f[0] + '">' + esc(v) + '</textarea></label>';
      }
      return '<label class="sf-biz-field"><span>' + esc(E ? f[2] : f[1]) + '</span><input class="sf-input" name="' + f[0] + '" type="' + f[3] + '" value="' + esc(v) + '"></label>';
    }).join('');
    var next = cfg.a.filter(function (a) { return a[1].indexOf('下一步') === 0; })[0] || cfg.a[0];
    return '<form class="sf-biz-form" data-form="biz-form" data-next="' + esc(next ? next[0] : 'account.html') + '">' +
      '<div class="sf-biz-err" data-err></div>' + inputs +
      '<button class="sf-btn is-primary" type="submit">' + esc(E ? 'Submit and continue' : '提交并继续') + '</button></form>';
  }
  function bizFlow(cfg, items) {
    var E = lang === 'en';
    var FLOW = {
      'submission-status.html': ['提交资料','资料初审','一致性复审','终审公开'],
      'admin/audit-review.html': ['提交','初审通过','复审中','终审'],
      'admin/audit-final.html': ['提交','初审','复审','终审发布'],
      'produce-delivery.html': ['订单已付','分拣装筐','冷链出库','配送中','签收完成'],
      'dispatch-history.html': ['发布','接单','作业','回执','验收','结算'],
      'expert-history.html': ['建档','巡田','记录读数','技术结论','归档'],
      'account-close.html': ['提交申请','身份核验','结算清算','账号注销'],
      'admin/logs.html': ['操作发生','写入台账','复核留痕','归档']
    };
    var key = bizKey();
    var steps = FLOW[key] || FLOW[cfg.k] || ['提交','初审','复审','终审'];
    var cur = Math.min(cfg.idx, steps.length) - 1;
    return '<ol class="sf-biz-flow">' + steps.map(function (s, i) {
      return '<li class="' + (i < cur ? 'is-done' : i === cur ? 'is-on' : '') + '"><b>' + (i+1) + '. ' +
        esc(s) + '</b><span>' + esc(E ? (i < cur ? 'Done' : i === cur ? 'Current' : 'Pending')
          : (i < cur ? '已完成' : i === cur ? '当前步骤' : '未开始')) + '</span></li>';
    }).join('') + '</ol>' +
      '<div class="sf-biz-log"><b>' + esc(E ? 'Audit trail' : '操作留痕') + '</b>' +
      items.slice(0, 4).map(function (x) {
        return '<p>' + esc(x.id || '') + ' · ' + esc(bizScalar(x.at || x.createdAt || x.publishedAt || x.operator || '')) + ' · ' +
          esc(bizScalar(x.commentZh || x.status || x.bodyZh || '')) .slice(0, 60) + '</p>';
      }).join('') + '</div>';
  }
  function bizChat(ds, items) {
    var E = lang === 'en';
    return '<div class="sf-biz-chat" id="sf-chat">' + items.slice(0, 6).map(function (x, i) {
      return '<div class="sf-bubble' + (i % 3 === 0 ? ' is-me' : '') + '">' +
        esc(bizScalar(x.bodyZh || x.bodyEn || x.commentZh || x.titleZh || x.message || '')) +
        '<span class="sb-time">' + esc(bizScalar(x.at || x.createdAt || x.publishedAt || '')) + '</span></div>';
    }).join('') + '</div>' +
      '<form data-form="chat" class="sf-biz-chat-form"><input class="sf-input" name="msg" required placeholder="' +
      esc(E ? 'Write a message attached to this record' : '就这条记录写一句沟通内容') + '">' +
      '<button class="sf-btn is-primary" type="submit">' + esc(E ? 'Send' : '发送') + '</button></form>';
  }
  function bizSuccess(cfg, rec) {
    var E = lang === 'en';
    /* 成功态不重复动作条里的「下一步」，只给一个不同目标的归档入口，
       避免同页出现两个指向同一页的按钮；继续办理请走本页动作条。 */
    return '<div class="sf-biz-ok"><h3>' + esc(E ? 'Done · the record is now in the flow' : '已办结 · 记录已进入业务流程') + '</h3>' +
      '<p>' + esc(E ? 'Record ' : '记录 ') + esc(bizScalar(rec.id || cfg.zh)) +
      esc(E ? ' has a status, an owner and a next step. Use the action bar below to continue.'
           : ' 已有状态、责任人与下一步；继续办理请用本页下方的动作条，不会停在这一页没有下文。') + '</p>' +
      '<div class="sf-biz-ok-acts">' +
      bizAction(['orders.html', '查看我的订单', 'My orders']) + '</div></div>';
  }
  function bizInfo(cfg, rec) {
    var E = lang === 'en';
    var body = [
      E ? 'This node serves ' + ROLE_LABEL_EN[cfg.r] + '. The fields below are read from the live record, not a demo placeholder.'
        : '本节点服务「' + ROLE_LABEL[cfg.r] + '」，下面的字段来自当前业务记录，不是演示占位。',
      E ? 'Amounts follow the published price book; the same rate is shown on checkout, settlement and the invoice.'
        : '涉及金额一律以价格公示总账为准，下单、结算与发票三处口径一致；有异议可回到公示规则页核对。',
      E ? 'The action bar below leads to the previous and next real step, so the workflow can always move on or go back.'
        : '下方动作条给出本链的上一步与下一步真实页面，业务不会停在这页；返回按来源页逐层回退。'
    ];
    return '<div class="sf-biz-prose">' + body.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' +
      '<div class="sf-biz-scroll"><table class="sf-biz-table"><tbody>' + bizRows(cfg.ds, rec, 8) + '</tbody></table></div>';
  }
  function bizGeneric(page, cfg) {
    var E = lang === 'en', rec = bizRecord(cfg.ds), items = M.all(cfg.ds);
    var h1 = pageCopy('h1') || (E ? cfg.en : cfg.zh);
    var lead = pageCopy('lead') || (E ? 'A working step for ' + ROLE_LABEL_EN[cfg.r] + '.' : '「' + ROLE_LABEL[cfg.r] + '」业务流程中的一个真实办理节点。');
    var body = '';
    /* 按地区找田 / 按土壤筛选：业务语义是「找田列表」，必须保留筛选、真实分页与
       点第 N 页换一批；带 ?id= 时按 URL 参数渲染单块田详情，不同编号内容不同。 */
    if (page === 'farms-region.html' || page === 'farms-soil.html') {
      var back32 = backRow(document.body.getAttribute('data-parent') || 'farms.html');
      if (param('id')) {
        var pick32 = M.byId('farms', param('id')) || items[0];
        put(sectionHead(h1, lead, '', count('farms')) +
          '<div class="sf-section"><div class="sf-panel">' +
          '<div class="sf-biz-rec"><b>' + esc(E ? 'Current plot' : '当前田块') + '</b> · ' +
          esc(pick32.id) + ' · ' + esc(zh(pick32, 'nameZh', 'nameEn')) + '</div>' +
          '<div class="sf-biz-scroll"><table class="sf-biz-table"><tbody>' +
          bizRows('farms', pick32, 12) + '</tbody></table></div></div></div>' +
          bizActions(cfg) + back32);
        return;
      }
      var bid32 = page === 'farms-region.html' ? 'region' : 'soil';
      var vals32 = page === 'farms-region.html'
        ? M.all('farms').map(function (f) { return f.region.split('·')[1] || f.region; })
        : M.all('farms').map(function (f) { return f.soil.split(' / ')[0]; });
      var uniq32 = vals32.filter(function (v, i, arr) { return v && arr.indexOf(v) === i; }).slice(0, 5);
      put(searchBar() + '<div class="sf-section">' + sectionHead(h1, lead, '', count('farms')) +
        filters([{ k: t('common.all'), v: '' }].concat(uniq32.map(function (x) { return { k: x, v: x }; })), bid32) +
        '<div id="mount-' + bid32 + '"></div></div>' + bizActions(cfg) + back32);
      listBlock({ id: bid32, api: 'listFarms', loadMore: true, emptyCta: 'farms.html',
        params: function () { return { page: state.page, pageSize: 8, q: state.q, region: state.filter, soil: state.filter }; },
        toCard: function (f) { return card({ id: f.id, title: zh(f, 'nameZh', 'nameEn'), cover: f.cover,
          meta: f.region + ' · ' + f.plotNo + ' · ' + f.areaMu + ' 亩',
          tags: [f.soil.split(' / ')[0], f.leaseType, f.currentCrops[0]], price: f.price,
          href: detailLink('farm-detail.html', f.id) }); } });
      return;
    }
    switch (cfg.k) {
      case 'table': body = bizTable(cfg.ds, items, 8); break;
      case 'list':
        /* 论坛版块子页沿用全站文字列表渲染器：版块、标题、摘要、时间、回复数成行，
           绝不退回图片卡片；按文件名判定而非角色，避免同一页挂到专家链时漏判。 */
        body = page.indexOf('forum') === 0
          ? items.slice(0, 10).map(function (x) { return genTextRow(x, 'topics', page); }).join('')
          : bizList(cfg.ds, items, 8);
        break;
      case 'detail': body = '<div class="sf-biz-scroll"><table class="sf-biz-table"><tbody>' + bizRows(cfg.ds, rec, 10) + '</tbody></table></div>'; break;
      case 'form': body = bizForm(cfg, rec); break;
      case 'flow': body = bizFlow(cfg, items); break;
      case 'chat': body = bizChat(cfg.ds, items); break;
      case 'success': body = bizSuccess(cfg, rec); break;
      case 'gallery': body = '<div class="sf-gallery">' + items.slice(0, 6).map(function (x, i) {
          return pic(artFor(dsCat(cfg.ds), String(x.id) + i, 'card'), bizScalar(x.titleZh || x.nameZh || x.id || ''));
        }).join('') + '</div>'; break;
      case 'map': body = '<div class="sf-biz-map">' + items.slice(0, 8).map(function (x) {
          return '<a href="' + esc(link('farm-detail.html', { id: x.id, from: page })) + '">' +
            esc(bizScalar(x.plotNo || x.id)) + '<small>' + esc(bizScalar(x.region || x.nameZh || '')) + '</small></a>';
        }).join('') + '</div>'; break;
      case 'stats': body = '<div class="sf-stats">' + [['田园记录', items.length, 'Plots'], ['在册工单', count('workorders'), 'Jobs'],
          ['公示价目', M.PRICE_BOOK.stats().items, 'Published lines'], ['论坛帖子', count('topics'), 'Threads']]
          .map(function (x) { return '<div class="sf-stat"><b>' + x[1] + '</b><span>' + esc(E ? x[2] : x[0]) + '</span></div>'; }).join('') + '</div>'; break;
      default: body = bizInfo(cfg, rec);
    }
    var head = sectionHead(h1, lead, '', items.length);
    var recHead = '<div class="sf-biz-rec"><b>' + esc(E ? 'Current record' : '当前业务记录') + '</b> · ' +
      esc(bizScalar(rec.id || cfg.zh)) + ' · ' + esc(ROLE_LABEL[cfg.r] || '') + '</div>';
    var extra = '<div class="sf-section"><div class="sf-panel">' +
      sectionHead(E ? 'Related records' : '相关业务记录', E ? 'Each line links back to its own record.' : '每行都能点回自己的业务记录。', '', items.length) +
      contentBoost(cfg.ds, cfg.k, items, lead) + '</div></div>';
    put(head + recHead + '<div class="sf-section"><div class="sf-panel">' + body + '</div></div>' +
      bizActions(cfg) + extra + backRow(document.body.getAttribute('data-parent') || 'index.html'));
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
  /* 站点地图：按频道列出全站前台页面，每一个都是可点的业务入口；
     后台页面不进公开索引（独立登录、noindex、robots 屏蔽），符合「后台不得对外」。 */

  /* ================= 租金与价格公示频道（9 个页面 + 1 个后台管控） =================
     所有金额与数量均由 PRICE_BOOK / 数据集动态推导，禁止写死；详情页按 ?id= 渲染；
     每个按钮都有可见反馈与明确目标，返回逐层回退到所属上级。 */
  var PRICE_CAT_PAGE = { lease: 'price-lease.html', venue: 'price-venue.html', activity: 'price-venue.html',
    job: 'price-job.html', expert: 'price-job.html', produce: 'price-produce.html',
    delivery: 'price-produce.html', deposit: 'price-rules.html', service: 'price-rules.html' };
  function priceTable(heads, rows) {
    return '<div class="sf-pub-scroll"><table class="sf-pub-table"><thead><tr>' +
      heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function priceItemRows(catKeys, E) {
    var PB = M.PRICE_BOOK;
    return PB.itemsFor(catKeys).map(function (x) {
      var cat = PB.cats.filter(function (c) { return c.key === x.cat; })[0];
      return [esc(E ? cat.en : cat.zh), '<b>' + esc(E ? x.en : x.zh) + '</b><small>' + esc(x.id) + '</small>',
        '<span class="sf-pub-num">¥' + esc(x.price) + '</span>', esc(x.unit),
        esc(E ? cat.basisEn : cat.basisZh), esc(E ? x.scopeEn : x.scopeZh)];
    });
  }
  function priceHeads(E) {
    return [t('price.table.cat'), t('price.table.item'), t('price.table.rate'),
      t('price.table.unit'), t('price.table.basis'), t('price.table.scope')];
  }
  function priceBackRow(E) {
    return '<div class="sf-pub-foot" style="margin-top:12px">' +
      '<a class="sf-pub-link" href="' + esc(link('price.html', { from: hereFile() })) + '">' +
      esc(t('back.price')) + '</a>' +
      '<a class="sf-pub-link" href="' + esc(link('price-calc.html', { from: hereFile() })) + '">' +
      esc(t('price.calc')) + '</a>' +
      '<a class="sf-pub-link" href="' + esc(link('price-changes.html', { from: hereFile() })) + '">' +
      esc(t('price.changesPage')) + '</a></div>';
  }
  function pagePriceIndex() {
    var PB = M.PRICE_BOOK, st = PB.stats(), E = lang === 'en';
    var stats = '<div class="sf-pub-chips sf-pub-stats">' +
      '<span class="sf-pub-chip">' + t('price.cats') + ' <b>' + st.cats + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.lines') + ' <b>' + st.items + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.plots') + ' <b>' + st.plots + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.changes') + ' <b>' + st.changes + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.version') + ' <b>' + st.version + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.valid') + ' <b>' + st.from + ' ~ ' + st.to + '</b></span>' +
      '<span class="sf-pub-chip">' + t('price.rentRange') + ' <b>¥' + st.rentMin + '–' + st.rentMax + '</b> / ' + t('price.perSeason') + '</span></div>';
    var cats = PB.cats.map(function (c) {
      var list = PB.itemsFor([c.key]);
      var mini = list.slice(0, 3).map(function (x) {
        return '<span class="sf-pub-chip">' + esc(E ? x.en : x.zh) + ' <b>¥' + x.price + '</b> / ' + esc(x.unit) + '</span>';
      }).join('');
      return '<div class="sf-panel sf-pub-cat"><h3>' + esc(E ? c.en : c.zh) +
        ' <small>' + list.length + ' ' + t('price.lines') + ' · ' + esc(c.unit) + '</small></h3>' +
        '<p class="sf-sub">' + esc(E ? c.basisEn : c.basisZh) + '</p>' +
        '<div class="sf-pub-chips">' + mini + '</div>' +
        '<div class="sf-pub-foot"><a class="sf-pub-link" href="' +
        esc(link(PRICE_CAT_PAGE[c.key], { from: 'price.html' })) + '">' +
        (E ? 'View all ' + list.length + ' lines' : '查看本类目 ' + list.length + ' 条公示价目') + '</a></div></div>';
    }).join('');
    var recent = PB.changes.slice(0, 3).map(function (c) {
      return '<li>' + esc(E ? c.itemEn : c.itemZh) + '：¥' + c.before + ' → <b>¥' + c.after +
        '</b> / ' + esc(c.unit) + ' · ' + c.at + '</li>';
    }).join('');
    put('<div class="sf-section">' + sectionHead(t('price.title'), t('price.desc'), '', st.items) +
      stats + '</div>' +
      '<div class="sf-section">' + sectionHead(t('price.cats'), E ? 'Each category links to its own published rate sheet.' : '每个类目都能点进自己的公示价目页。', '', st.cats) +
      '<div class="sf-pub-cats">' + cats + '</div></div>' +
      '<div class="sf-section"><div class="sf-panel">' +
      sectionHead(t('price.changesPage'), E ? 'The three most recent rate changes.' : '最近三条调价公示。', 'price-changes.html', st.changes) +
      '<ul class="sf-pub-log">' + recent + '</ul>' + priceBackRow(E) + '</div></div>');
  }
  function pagePriceLease() {
    var PB = M.PRICE_BOOK, st = PB.stats(), E = lang === 'en';
    var plots = M.all('farms'), sum = 0;
    var rows = plots.map(function (f) {
      var season = Math.round(f.price * f.areaMu);
      var dep = Math.round(season * 0.30), fee = Math.round(season * 0.02);
      sum += season;
      return [esc(E ? f.nameEn : f.nameZh) + '<small>' + esc(f.plotNo) + '</small>',
        f.areaMu + ' ' + (E ? 'mu' : '亩'),
        '<span class="sf-pub-num">¥' + f.price + '</span> / ' + (E ? 'mu / season' : '亩 / 季'),
        '<span class="sf-pub-num">¥' + season + '</span>', esc(f.leaseType),
        '¥' + dep, '<span class="sf-pub-num">¥' + (season + dep + fee) + '</span>',
        '<a class="sf-pub-link" href="' + esc(detailLink('farm-detail.html', f.id, 'price-lease.html')) + '">' +
          t('price.lease.view') + '</a>'];
    });
    var heads = [t('price.lease.plot'), t('price.lease.area'), t('price.lease.rate'),
      t('price.lease.season'), t('price.lease.type'), t('price.lease.deposit'),
      t('price.lease.total'), ''];
    put('<div class="sf-section">' + sectionHead(t('price.lease'),
      E ? 'Measured area times the published seasonal rate; deposit and fee are itemised separately.'
         : '实测亩数 × 当季公示单价；押金与平台服务费单列，点「核对档案」回到田园档案确认面积。',
      'price.html', plots.length) + priceTable(heads, rows) +
      '<p class="sf-pub-note">' + (E
        ? 'All ' + plots.length + ' plots together come to CNY ' + sum + ' for one season; each line is derived from the plot record, never hard-coded.'
        : '在册 ' + plots.length + ' 块田一季租金合计 ¥' + sum + '，每一行都由田园档案的面积与公示单价推导，不是写死的金额。') + '</p>' +
      priceBackRow(E) + '</div>');
  }
  function pagePriceVenue() {
    var PB = M.PRICE_BOOK, E = lang === 'en';
    var items = PB.itemsFor(['venue', 'activity']);
    var evs = M.all('activities');
    var evRows = evs.map(function (a) {
      return [esc(E ? a.titleEn : a.titleZh) + '<small>' + esc(a.id) + '</small>', esc(a.kind),
        '<span class="sf-pub-num">¥' + a.price + '</span> / ' + (E ? 'person' : '人'),
        a.capacity + ' ' + (E ? 'seats' : '名额'), esc(a.date),
        '<a class="sf-pub-link" href="' + esc(detailLink('activity-detail.html', a.id, 'price-venue.html')) + '">' + t('common.viewDetail') + '</a>'];
    });
    put('<div class="sf-section">' + sectionHead(t('price.venue'),
      E ? 'Published venue and event rates, plus the sign-up price of every listed event.'
         : '场地与活动的公示价目，并逐场列出报名价；场地保证金单独列项。', 'price.html', items.length) +
      priceTable(priceHeads(E), priceItemRows(['venue', 'activity'], E)) + '</div>' +
      '<div class="sf-section"><div class="sf-panel">' +
      sectionHead(E ? 'Every listed event' : '逐场活动报名价', '', '', evs.length) +
      priceTable([t('price.table.item'), t('price.table.cat'), t('price.table.rate'),
        E ? 'Capacity' : '名额', E ? 'Date' : '日期', ''], evRows) +
      priceBackRow(E) + '</div></div>');
  }
  function pagePriceJob() {
    var PB = M.PRICE_BOOK, E = lang === 'en';
    var items = PB.itemsFor(['job', 'expert']);
    var types = M.JOB_TYPES;
    var rows = types.map(function (tp, i) {
      var line = PB.items.filter(function (x) { return x.zh === tp; })[0];
      return ['<b>' + esc(tp) + '</b><small>' + (E ? 'Work order type ' : '工单类型 ') + (i + 1) + '</small>',
        line ? '<span class="sf-pub-num">¥' + line.price + '</span> / ' + esc(line.unit) : '—',
        line ? esc(E ? line.scopeEn : line.scopeZh) : (E ? 'Priced by area and acceptance' : '按面积核定，验收后结算'),
        '<a class="sf-pub-link" href="' + esc(link('workorders.html', { from: 'price-job.html' })) + '">' +
          (E ? 'View work orders' : '查看工单') + '</a>'];
    });
    put('<div class="sf-section">' + sectionHead(t('price.job'),
      E ? 'Ten field-work types and expert guidance, all priced before an order is placed.'
         : '十类农事作业与专家指导，全部在发单前公示；未验收不产生应付金额。', 'price.html', items.length) +
      priceTable(priceHeads(E), priceItemRows(['job', 'expert'], E)) + '</div>' +
      '<div class="sf-section"><div class="sf-panel">' +
      sectionHead(E ? 'Work-order type index' : '工单类型价目索引', '', '', types.length) +
      priceTable([t('price.table.item'), t('price.table.rate'), t('price.table.scope'), ''], rows) +
      priceBackRow(E) + '</div></div>');
  }
  function pagePriceProduce() {
    var PB = M.PRICE_BOOK, E = lang === 'en';
    var items = PB.itemsFor(['produce', 'delivery']);
    var ps = M.all('produces');
    var rows = ps.map(function (p) {
      return [esc(E ? p.nameEn : p.nameZh) + '<small>' + esc(p.traceNo) + '</small>', esc(p.category),
        '<span class="sf-pub-num">¥' + p.price + '</span> / ' + esc(p.unit),
        p.stock + esc(p.unit), '¥' + (p.price * p.stock),
        '<a class="sf-pub-link" href="' + esc(detailLink('produce-detail.html', p.id, 'price-produce.html')) + '">' + t('common.viewDetail') + '</a>'];
    });
    put('<div class="sf-section">' + sectionHead(t('price.produce'),
      E ? 'Batch prices by trace number; delivery is itemised by distance and weight tier.'
         : '按批次溯源号公示单价，配送按距离与重量阶梯单列，价签与批次号一致。', 'price.html', items.length) +
      priceTable(priceHeads(E), priceItemRows(['produce', 'delivery'], E)) + '</div>' +
      '<div class="sf-section"><div class="sf-panel">' +
      sectionHead(E ? 'Every traced batch' : '逐批次公示单价', '', '', ps.length) +
      priceTable([t('price.table.item'), t('price.table.cat'), t('price.table.rate'),
        E ? 'Stock' : '库存', E ? 'Batch value' : '整批货值', ''], rows) +
      priceBackRow(E) + '</div></div>');
  }
  function pagePriceRules() {
    var PB = M.PRICE_BOOK, E = lang === 'en';
    var rules = PB.rules.map(function (r, i) {
      return '<li><b>' + (i + 1) + '.</b> ' + esc(E ? r.en : r.zh) + '</li>';
    }).join('');
    var FAQ = [
      { q: E ? 'How is plot rent worked out?' : '田块租金怎么算？',
        a: E ? 'Measured area × published seasonal rate × number of seasons. The lease type multiplies the rate by its published factor; the measured area comes from the plot archive.'
            : '实测亩数 × 当季公示单价 × 承包季数；承包类型按公示系数折算单价，面积以田园档案登记为准。' },
      { q: E ? 'When is the deposit refunded?' : '押金什么时候退？',
        a: E ? 'Within seven working days after the exit inspection, back to the original payment method. A venue bond is refunded in full if the site is left intact.'
            : '退租验收后 7 个工作日内原路退还；场地保证金在场地无损时全额退还。' },
      { q: E ? 'Does a rate change affect my order?' : '调价会影响已下的单吗？',
        a: E ? 'No. An order already placed keeps the old rate until its term ends. Every change is published seven days in advance in the change log.'
            : '不会。已下单的订单按原价执行到本周期结束；每次调价都会提前 7 天在调价公示历史里发布。' },
      { q: E ? 'Do I pay before work is accepted?' : '工单没验收要付钱吗？',
        a: E ? 'No payable amount arises before acceptance. The 1% settlement fee is charged with the work order only after the receipt is approved.'
            : '不产生应付金额。1% 结算服务费只在回执验收通过后随工单结算，未验收不计费。' },
      { q: E ? 'Why is delivery listed separately?' : '配送费为什么单列？',
        a: E ? 'It follows a distance and weight tier (18 or 32 CNY per order) and is never folded into the goods total, so the produce price stays comparable across batches.'
            : '配送按距离与重量阶梯（18 / 32 元每单）计，不并入货款，方便不同批次的农产品单价横向比较。' },
      { q: E ? 'What is the platform fee?' : '平台服务费怎么收？',
        a: E ? 'Two percent of lease, venue and produce orders, and one percent of work orders. It is shown as its own line on checkout and settlement pages.'
            : '租赁、场地与农产品订单按 2%，工单按 1%，在下单页与结算页单独列项，不并入租金。' }
    ];
    var faq = FAQ.map(function (x) {
      return '<details class="sf-pub-faq"><summary>' + esc(x.q) + '</summary><p>' + esc(x.a) + '</p></details>';
    }).join('');
    var basis = PB.cats.map(function (c) {
      return [esc(E ? c.en : c.zh), esc(c.unit), esc(E ? c.basisEn : c.basisZh)];
    });
    put('<div class="sf-section">' + sectionHead(t('price.rulesPage'),
      E ? 'Six binding rules and a plain answer to each billing question.' : '六条可执行规则，以及每个计费问题的正面答案。', 'price.html', PB.rules.length) +
      '<div class="sf-panel"><ol class="sf-pub-rules-list">' + rules + '</ol></div></div>' +
      '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('price.table.basis'), '', '', PB.cats.length) +
      priceTable([t('price.table.cat'), t('price.table.unit'), t('price.table.basis')], basis) + '</div></div>' +
      '<div class="sf-section"><div class="sf-panel">' + sectionHead(t('faq.head'), t('faq.lead'), '', FAQ.length) +
      faq + priceBackRow(E) + '</div></div>');
  }
  function pagePriceChanges() {
    var PB = M.PRICE_BOOK, E = lang === 'en';
    var rows = PB.changes.map(function (c) {
      return ['<b>' + esc(E ? c.itemEn : c.itemZh) + '</b><small>' + esc(c.id) + '</small>',
        '¥' + c.before, '<span class="sf-pub-num">¥' + c.after + '</span>', esc(c.unit),
        esc(c.at), c.days + ' ' + (E ? 'days' : '天'), esc(E ? c.reasonEn : c.reasonZh)];
    });
    put('<div class="sf-section">' + sectionHead(t('price.changesPage'),
      E ? 'Old rate, new rate, effective date, notice days and reason for every change.' : '每条调价写明原价、新价、生效日、提前公示天数与原因。', 'price.html', PB.changes.length) +
      priceTable([t('price.chg.item'), t('price.chg.before'), t('price.chg.after'),
        t('price.table.unit'), t('price.chg.at'), t('price.chg.days'), t('price.chg.reason')], rows) +
      '<p class="sf-pub-note">' + (E
        ? 'Orders already placed keep the old rate until their term ends. All changes are published ' +
          PB.changes.filter(function (c) { return c.days >= 7; }).length + ' of ' + PB.changes.length + ' times with at least seven days notice.'
        : '已下单的订单按原价执行到本周期结束；' + PB.changes.length + ' 条调价中有 ' +
          PB.changes.filter(function (c) { return c.days >= 7; }).length + ' 条满足提前 7 天公示。') + '</p>' +
      priceBackRow(E) + '</div>');
  }
  function pagePriceCalc() {
    var E = lang === 'en', plots = M.all('farms'), f0 = plots[0];
    var opts = plots.map(function (f) {
      return '<option value="' + esc(f.id) + '">' + esc(E ? f.nameEn : f.nameZh) + ' · ' + esc(f.plotNo) +
        ' · ¥' + f.price + '/' + (E ? 'mu' : '亩') + '</option>';
    }).join('');
    var types = M.PRICE_BOOK.leaseFactors.map(function (x) {
      return '<option value="' + x.factor + '">' + esc(E ? x.en : x.zh) + ' × ' + x.factor.toFixed(2) + '</option>';
    }).join('');
    var form = '<form class="sf-pub-calc-form" id="sf-pub-calc-form">' +
      '<label>' + t('price.calc.plot') + '<select class="sf-input" name="plot">' + opts + '</select></label>' +
      '<label>' + t('price.calc.area') + '<input class="sf-input" name="area" type="number" min="0.1" step="0.1" value="' + f0.areaMu + '" required></label>' +
      '<label>' + t('price.calc.seasons') + '<input class="sf-input" name="seasons" type="number" min="1" max="8" step="1" value="1" required></label>' +
      '<label>' + t('price.calc.type') + '<select class="sf-input" name="type">' + types + '</select></label>' +
      '<button class="sf-btn is-primary" type="button" data-act="price-calc" title="' +
        esc(t('price.calc.submit')) + '">' + t('price.calc.submit') + '</button></form>';
    var out = '<div class="sf-pub-calc-out" id="sf-calc-out"><p class="sf-sub">' +
      esc(t('price.calc.desc')) + '</p></div>';
    put('<div class="sf-section">' + sectionHead(t('price.calc'), t('price.calc.desc'), 'price-lease.html', plots.length) +
      '<div class="sf-panel">' + form + out + '</div>' + priceBackRow(E) + '</div>');
  }
  function pageAdminPrices() {
    var PB = M.PRICE_BOOK, st = PB.stats(), E = lang === 'en';
    var rows = PB.items.map(function (x) {
      var cat = PB.cats.filter(function (c) { return c.key === x.cat; })[0];
      return ['<b>' + esc(E ? x.en : x.zh) + '</b><small>' + esc(x.id) + '</small>',
        esc(E ? cat.en : cat.zh), '<span class="sf-pub-num">¥' + x.price + '</span>', esc(x.unit),
        '<span class="adm-tag is-on">' + (E ? 'Published' : '已公示') + '</span>', esc(st.version)];
    });
    var form = '<form class="sf-pub-calc-form" id="sf-pub-publish-form">' +
      '<label>' + (E ? 'New edition' : '新版本号') + '<input class="sf-input" name="version" value="' +
        esc(st.version) + '" required></label>' +
      '<label>' + (E ? 'Effective date' : '生效日期') + '<input class="sf-input" name="effective" type="date" value="' + esc(st.from) + '" required></label>' +
      '<label>' + (E ? 'Change note' : '变更说明') + '<input class="sf-input" name="note" placeholder="' +
        esc(E ? 'Why this edition is published' : '说明本次公示调整了什么') + '" required></label>' +
      '<button class="sf-btn is-primary" type="button" data-act="price-publish" title="' +
        esc(t('price.admin.publish')) + '">' + t('price.admin.publish') + '</button></form>';
    put('<div class="adm-panel"><h3>' + esc(t('price.admin.status')) + '</h3>' +
      '<p class="adm-note">' + esc(t('price.admin.note')) + ' · ' + esc(st.items) + ' ' + t('price.lines') +
      ' · ' + esc(st.version) + '</p>' + form +
      '<div id="sf-pub-admin-msg" class="adm-note"></div></div>' +
      '<div class="adm-panel"><h3>' + esc(t('price.all')) + '</h3>' +
      priceTable([t('price.table.item'), t('price.table.cat'), t('price.table.rate'),
        t('price.table.unit'), t('price.admin.status'), t('price.version')], rows) + '</div>');
  }

  function pageSitemap() {
    var all = FLOW_GROUPS.map(function (g) {
      var links = g.steps.map(function (x) {
        var lb = lang === 'en' ? x[2] : x[1];
        return '<a class="sf-flow-step" href="' + esc(link(x[0], { from: 'sitemap.html' })) +
          '" title="' + esc(lb) + '">' + esc(lb) + '</a>';
      }).join('');
      return '<div class="sf-sitemap-grp"><h3>' + esc(lang === 'en' ? g.en : g.zh) + '</h3>' +
        '<div class="sf-flow-steps">' + links + '</div></div>';
    }).join('');
    var extra = [['index.html', '首页', 'Home'], ['login.html', '登录 / 注册', 'Sign in'],
      ['forgot.html', '找回口令', 'Recover password'], ['404.html', '页面不存在', 'Not found']];
    var extraHtml = '<div class="sf-sitemap-grp"><h3>' +
      esc(lang === 'en' ? 'Account & fallback' : '账号入口与兜底') + '</h3><div class="sf-flow-steps">' +
      extra.map(function (x) {
        var lb = lang === 'en' ? x[2] : x[1];
        return '<a class="sf-flow-step" href="' + esc(link(x[0], { from: 'sitemap.html' })) + '">' +
          esc(lb) + '</a>';
      }).join('') + '</div></div>';
    var head = lang === 'en'
      ? 'Every public page is listed below, grouped by channel. Each label is a direct link.'
      : '下面按频道列出全部公开页面，每个名称都是直达入口；管理后台不列入公开索引。';
    put('<div class="sf-section">' + sectionHead(
      lang === 'en' ? 'Full site index' : '站点地图 · 全站页面索引', head, '',
      FLOW_GROUPS.reduce(function (n, g) { return n + g.steps.length; }, 0) + extra.length) +
      all + extraHtml + '</div>');
  }

  /* ================= 第 33 轮 · 用户级常规业务渲染层 =================
     取消/退款/改单/重发、合同版本与对账、资金提现、活动运营、专家统计调控
     都在这里按真实业务语义渲染：金额由记录算、状态写成时间线、
     相同项合并 / 差异高亮、表单有边界校验、详情按 ?id= 差异化。
     类名统一 .sf-v2-*，与 .sf-card / .sf-pub / .sf-biz 前缀隔离。 */
  var V2 = (function () {
    function E() { return lang === 'en'; }
    function L(a, b) { return E() ? b : a; }
    function pick(ds, id) { return M.byId(ds, id) || M.all(ds)[0] || {}; }
    function all(ds) { return M.all(ds); }
    function uniq(items, key) {
      var out = [];
      items.forEach(function (x) { var v = bizScalar(x[key]); if (v && v !== '—' && out.indexOf(v) < 0) out.push(v); });
      return out.slice(0, 5);
    }
    function chips(items, key, titleZh, titleEn) {
      var vals = uniq(items, key), cur = param('f', '');
      var ex = { from: hereFile() }, base = link(hereFile(), ex);
      var html = '<a class="sf-v2-chip' + (cur ? '' : ' is-on') + '" href="' + esc(base) + '">' +
        esc(L('全部', 'All')) + '</a>';
      vals.forEach(function (v) {
        var e2 = { f: v, from: hereFile() };
        html += '<a class="sf-v2-chip' + (cur === v ? ' is-on' : '') + '" href="' +
          esc(link(hereFile(), e2)) + '" title="' + esc(L(titleZh, titleEn) + ' · ' + v) + '">' + esc(v) + '</a>';
      });
      return '<div class="sf-v2-chips"><span>' + esc(L(titleZh, titleEn)) + '</span>' + html + '</div>';
    }
    function stat(cards) {
      return '<div class="sf-v2-stats">' + cards.map(function (c) {
        return '<div class="sf-v2-stat"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>';
      }).join('') + '</div>';
    }
    function badge(s) {
      var v = bizScalar(s), cls = 'is-normal';
      if (/待|处理|审核|核对|执行中|公示中/.test(v)) cls = 'is-wait';
      if (/已到账|已完成|已确认|已通过|已入账|生效中|已复核|已关闭/.test(v)) cls = 'is-done';
      if (/驳回|取消|终止|下架|退回/.test(v)) cls = 'is-stop';
      return '<span class="sf-v2-badge ' + cls + '">' + esc(v) + '</span>';
    }
    function table(cols, rows, opt) {
      opt = opt || {};
      var out = '<div class="sf-v2-scroll"><table class="sf-v2-table"><thead><tr>';
      cols.forEach(function (c) { out += '<th>' + esc(L(c[1], c[2])) + '</th>'; });
      out += '</tr></thead><tbody>';
      rows.forEach(function (r, i) {
        var diff = opt.diff && r[opt.diff[0]] !== r[opt.diff[1]];
        out += '<tr class="' + (diff ? 'is-diff' : '') + '">';
        cols.forEach(function (c, j) {
          var v = r[c[0]];
          if (v === undefined || v === null || v === '') v = '—';
          var cell = esc(bizScalar(v));
          if (j === 0 && opt.idKey !== false) {
            cell = '<a href="' + esc(link(hereFile(), { id: r.id, from: hereFile() })) +
              '" title="' + esc(L('查看这条记录', 'Open this record')) + '">' + cell + '</a>';
          }
          if (c[0] === 'status' || c[0] === 'statusEn') cell = badge(v);
          if (opt.diff && (c[0] === opt.diff[0] || c[0] === opt.diff[1])) cell = '<span class="sf-v2-cell">' + cell + '</span>';
          out += '<td>' + cell + '</td>';
        });
        out += '</tr>';
      });
      return out + '</tbody></table></div>';
    }
    function money(lines) {
      return '<div class="sf-v2-money">' + lines.map(function (x, i) {
        return '<div class="sf-v2-money-row' + (i === lines.length - 1 ? ' is-total' : '') + '">' +
          '<span>' + esc(L(x[0], x[1])) + '</span><b>' + esc(bizScalar(x[2])) + '</b>' +
          '<small>' + esc(L(x[3] || '', x[4] || '')) + '</small></div>';
      }).join('') + '</div>';
    }
    function timeline(steps) {
      return '<ol class="sf-v2-flow">' + (steps || []).map(function (s, i) {
        return '<li' + (i === 0 ? ' class="is-now"' : '') + '><span class="sf-v2-flow-n">' + (i + 1) + '</span>' +
          '<div><b>' + esc(L(s.zh, s.en)) + '</b><small>' + esc(s.at || '') + '</small></div></li>';
      }).join('') + '</ol>';
    }
    function form(titleZh, titleEn, fields, next, kind, noteZh, noteEn) {
      var html = '<form class="sf-v2-form" data-form="biz-form" data-next="' + esc(next) +
        '" data-biz-kind="' + esc(kind || '') + '">';
      fields.forEach(function (f) {
        var name = f[0], zh = f[1], en = f[2], type = f[3] || 'text', val = f[4] || '', req = f[5];
        html += '<label class="sf-biz-field"><span>' + esc(L(zh, en)) + (req ? ' *' : '') + '</span>';
        if (type === 'select') {
          var opts = String(val).split('|');
          html += '<select class="sf-input" name="' + esc(name) + '"' + (req ? ' required' : '') + '>' +
            opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
        } else if (type === 'textarea') {
          html += '<textarea class="sf-textarea" name="' + esc(name) + '"' + (req ? ' required' : '') + '>' + esc(val) + '</textarea>';
        } else {
          html += '<input class="sf-input" type="' + esc(type) + '" name="' + esc(name) +
            '" value="' + esc(val) + '"' + (req ? ' required' : '') + '>';
        }
        html += '</label>';
      });
      html += '<div class="sf-v2-form-foot"><button class="sf-btn is-primary" type="submit">' +
        esc(L('提交', 'Submit')) + '</button><span>' + esc(L(noteZh || '提交后状态与下一步会写进业务记录。',
          noteEn || 'Submitting writes a status and a next step into the record.')) + '</span></div></form>';
      return '<div class="sf-v2-box"><h3>' + esc(L(titleZh, titleEn)) + '</h3>' + html + '</div>';
    }
    function detail(rec, ds, n) {
      var list = BIZ_FIELDS[ds] || Object.keys(rec).slice(0, n || 12).map(function (k) { return [k, k, k]; });
      return '<div class="sf-v2-scroll"><table class="sf-v2-table"><tbody>' +
        list.slice(0, n || 12).map(function (f) {
          return '<tr><th>' + esc(L(f[1], f[2])) + '</th><td>' + esc(bizScalar(rec[f[0]])) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    function photos(rec, seed) {
      var a = artFor('farm', String(seed || rec.id || 'x'), 'wide');
      var b = artFor('job', String(seed || rec.id || 'x') + 'b', 'card');
      return '<div class="sf-v2-photos">' + pic(a, L('现场回执照片', 'Field receipt')) +
        pic(b, L('关联田园画面', 'Linked plot')) + '</div>';
    }
    function shell(cfg, blocks, n) {
      var h1 = pageCopy('h1') || L(cfg.zh, cfg.en);
      var lead = pageCopy('lead') || L('按业务记录逐项办理。', 'Work through the record step by step.');
      put(sectionHead(h1, lead, '', n) +
        '<div class="sf-v2-rec"><b>' + esc(L('当前业务记录', 'Current record')) + '</b> · ' +
        esc(bizScalar((pick(cfg.ds, param('id') || param('job') || param('order') || param('activity') || param('contract')) || {}).id || cfg.zh)) +
        ' · ' + esc(L(ROLE_LABEL[cfg.r] || '', ROLE_LABEL_EN[cfg.r] || '')) + '</div>' +
        blocks.map(function (b) { return '<div class="sf-section"><div class="sf-panel">' + b + '</div></div>'; }).join('') +
        bizActions(cfg) + backRow(document.body.getAttribute('data-parent') || 'index.html'));
    }
    function filtered(ds, fkey) {
      var f = param('f', '');
      return all(ds).filter(function (x) { return !f || !fkey || bizScalar(x[fkey]) === f; });
    }
    function ledger(cfg, C) {
      var items = filtered(C.ds, C.fkey), rec = pick(C.ds, param('id'));
      var n = items.length;
      var cards = [[n, L('条记录', 'records')],
        [uniq(items, 'status').length, L('种状态', 'statuses')],
        [C.sumKey ? items.reduce(function (s, x) { return s + (Number(x[C.sumKey]) || 0); }, 0).toFixed(1) : (M.count(C.ds)),
         L('金额合计 / 全站记录', 'Amount total / all records')]];
      var b = stat(cards) + (C.fkey ? chips(all(C.ds), C.fkey, C.fzh, C.fen) : '') +
        table(C.cols, items.slice(0, C.limit || 10), C.opt);
      /* 空结果必须有插画、真文案与能照着走的引导，不能只剩一张空表 */
      if (!items.length) {
        b = stat(cards) + (C.fkey ? chips(all(C.ds), C.fkey, C.fzh, C.fen) : '') +
          '<div class="sf-v2-empty">' + pic(M.IMG.empty, L('暂无匹配记录', 'No matching records')) +
          '<h3>' + esc(L('这个筛选条件下还没有记录', 'Nothing under this filter yet')) + '</h3>' +
          '<p>' + esc(L('可以换一个筛选条件，或回到全部记录重新找。',
                        'Try another filter, or go back to the full list.')) + '</p>' +
          '<a class="sf-biz-btn" href="' + esc(link(hereFile(), { from: hereFile() })) + '">' +
          esc(L('查看全部记录', 'View all records')) + '</a></div>';
      }
      if (param('id')) {
        b += '<div class="sf-v2-sub"><h3>' + esc(L('这条记录的逐项明细', 'This record, field by field')) + '</h3>' +
          detail(rec, C.ds, 12) + photos(rec, rec.id) + '</div>';
      }
      if (C.after) b += C.after(items, rec);
      if (document.body.classList.contains('adm-body')) {
        b += form('管控动作', 'Control action', [
          ['decision', '处理结论', 'Decision', 'select', L('核对通过|已驳回|转复审', 'Approved|Rejected|Second review'), true],
          ['note', '处理说明', 'Note', 'textarea', L('按公示口径逐项核对后填写。', 'Fill in after checking each line against published rates.'), false]
        ], C.next || 'admin/index.html', 'admin-review',
          L('提交后状态写回台账并进入审计日志。', 'The decision is written back and logged.'),
          'The decision is written back and logged.');
      }
      shell(cfg, [b], n);
      return true;
    }
    function formPage(cfg, C) {
      var rec = pick(C.ds, param('id') || param('job') || param('order') || param('activity') || param('contract'));
      var b = '<div class="sf-v2-sub"><h3>' + esc(L(C.recTitleZh || '当前记录', C.recTitleEn || 'Current record')) + '</h3>' +
        detail(rec, C.recDs || C.ds, 8) + '</div>';
      if (C.money) b += money(C.money(rec));
      if (C.flow) b += '<div class="sf-v2-sub"><h3>' + esc(L('固定流程', 'Fixed workflow')) + '</h3>' + timeline(C.flow(rec)) + '</div>';
      b += form(C.titleZh, C.titleEn, C.fields(rec), C.next, C.kind, C.noteZh, C.noteEn);
      if (C.extra) b += C.extra(rec);
      shell(cfg, [b], all(C.ds).length);
      return true;
    }
    function flowPage(cfg, C) {
      var rec = pick(C.ds, param('id'));
      var b = '<div class="sf-v2-status">' + badge(rec.status) + '<span>' +
        esc(L('每一步都有时间与责任方', 'Every step has a date and an owner')) + '</span></div>' +
        detail(rec, C.ds, 8) + money(C.money(rec)) +
        '<div class="sf-v2-sub"><h3>' + esc(L('办理时间线', 'Progress timeline')) + '</h3>' + timeline(rec.flow) + '</div>' +
        photos(rec, rec.id);
      shell(cfg, [b], all(C.ds).length);
      return true;
    }
    function detailPage(cfg, C) {
      var rec = pick(C.ds, param('id'));
      var b = '<div class="sf-v2-status">' + badge(rec.status || L('已归档', 'Archived')) + '</div>' +
        detail(rec, C.ds, 12) + photos(rec, rec.id);
      if (C.after) b += C.after(rec);
      shell(cfg, [b], all(C.ds).length);
      return true;
    }
    function statsPage(cfg, C) {
      var dim = param('dim', C.dims[0][0]), items = all(C.ds), g = {};
      items.forEach(function (r) {
        var k = C.keyOf(r, dim);
        if (!g[k]) g[k] = { key: k, n: 0, a: 0, b: 0, c: 0, d: 0 };
        var x = g[k]; x.n++; x.a += Number(r[C.vals[0]]) || 0; x.b += Number(r[C.vals[1]]) || 0;
        x.c += Number(r[C.vals[2]]) || 0; x.d += Number(r[C.vals[3]]) || 0;
      });
      var groups = Object.keys(g).map(function (k) {
        var x = g[k]; return { key: k, n: x.n, a: +(x.a / x.n).toFixed(1), b: +(x.b / x.n).toFixed(1),
          c: +(x.c / x.n).toFixed(1), d: +(x.d / x.n).toFixed(1) };
      });
      var dimChips = '<div class="sf-v2-chips"><span>' + esc(L('统计维度', 'Group by')) + '</span>' +
        C.dims.map(function (d) {
          return '<a class="sf-v2-chip' + (dim === d[0] ? ' is-on' : '') + '" href="' +
            esc(link(hereFile(), { dim: d[0], from: hereFile() })) + '">' + esc(L(d[1], d[2])) + '</a>';
        }).join('') + '</div>';
      var b = stat([[items.length, L('条原始记录', 'source records')],
        [groups.length, L('个分组', 'groups')], [dim, L('当前维度', 'current dimension')]]) + dimChips +
        table([['key', L(C.keyZh, C.keyEn), L(C.keyEn, C.keyZh)], ['n', '记录数', 'Records'],
          ['a', C.labels[0], C.labelsEn[0]], ['b', C.labels[1], C.labelsEn[1]],
          ['c', C.labels[2], C.labelsEn[2]], ['d', C.labels[3], C.labelsEn[3]]], groups, { idKey: false });
      if (C.after) b += C.after(dim, groups);
      shell(cfg, [b], items.length);
      return true;
    }
    function comparePage(cfg) {
      var ids = String(param('ids', 'F001,F002')).split(',').slice(0, 3);
      var fs = ids.map(function (id) { return M.byId('farms', id) || M.all('farms')[0]; });
      var defs = [['soil', '土壤类型', 'Soil'], ['leaseType', '承包类型', 'Lease type'],
        ['areaMu', '实测面积（亩）', 'Area (mu)'], ['price', '公示单价', 'Published rate'],
        ['temp4', '四季均温', 'Season temperatures'], ['humid4', '四季均湿', 'Season humidity'],
        ['plotNo', '田块编号', 'Plot no.'],
        ['source', '田间数据口径', 'Field data standard'], ['service', '平台基础服务', 'Platform services']];
      var same = [], diff = [];
      defs.forEach(function (d) {
        var vals = fs.map(function (f) {
          if (d[0] === 'source') return L('统一档案口径（四季读数 / 公示价）', 'Unified archive standard (season readings / published rates)');
          if (d[0] === 'service') return L('远程工单 / 对账 / 价格公示', 'Remote jobs / reconciliation / published rates');
          return bizScalar(f[d[0]]);
        });
        var eq = vals.every(function (v) { return v === vals[0]; });
        var row = { key: L(d[1], d[2]), v0: vals[0], v1: vals[1] || vals[0], v2: vals[2] || vals[0], _diff: !eq };
        (eq ? same : diff).push(row);
      });
      var cols = [['key', '对比项', 'Field'], ['v0', fs[0].plotNo, fs[0].plotNo],
        ['v1', fs[1] ? fs[1].plotNo : '—', fs[1] ? fs[1].plotNo : '—'],
        ['v2', fs[2] ? fs[2].plotNo : '—', fs[2] ? fs[2].plotNo : '—']];
      var picks = M.all('farms').slice(0, 8).map(function (f) {
        return '<a class="sf-v2-chip' + (ids.indexOf(f.id) >= 0 ? ' is-on' : '') + '" href="' +
          esc(link('expert-compare.html', { ids: (ids.indexOf(f.id) >= 0 ? ids.filter(function (x) { return x !== f.id; }) : ids.concat([f.id])).slice(0, 3).join(','), from: hereFile() })) +
          '">' + esc(f.plotNo) + '</a>';
      }).join('');
      var b = '<div class="sf-v2-chips"><span>' + esc(L('选择田块（最多 3 块）', 'Pick plots (up to 3)')) + '</span>' + picks + '</div>' +
        '<div class="sf-v2-sub"><h3>' + esc(L('相同项（' + same.length + ' 项合并）', 'Identical fields (' + same.length + ' collapsed)')) + '</h3>' +
        (same.length ? table(cols, same, { idKey: false }) :
          '<p class="sf-v2-note">' + esc(L('本组田块没有相同项，全部指标见下方不同项清单。',
            'No identical fields for this pair; every metric is listed below.')) + '</p>') + '</div>' +
        '<div class="sf-v2-sub"><h3>' + esc(L('不同项（' + diff.length + ' 项高亮）', 'Differences (' + diff.length + ' highlighted)')) + '</h3>' +
        table(cols, diff, { idKey: false, diff: ['v0', 'v1'] }) + '</div>' +
        '<p class="sf-v2-note">' + esc(L('对比结果可直接作为调控建议的依据；读数来自田园档案与种植记录，不另造数据。',
          'Comparison results feed straight into control advice; readings come from plot archives and field records.')) + '</p>';
      shell(cfg, [b], M.count('farms'));
      return true;
    }

    /* ---------- 页面分派：每个键都对应一个真实的常规用户动作 ---------- */
    var P = {};
    var WO = [['id', '工单号', 'Job no.'], ['type', '作业类型', 'Type'], ['status', '当前状态', 'Status'],
      ['farmId', '关联田园', 'Linked plot'], ['price', '公示价（元）', 'Published price'],
      ['createdAt', '发布时间', 'Published']];
    var RF = [['id', '退款单号', 'Refund no.'], ['orderId', '关联订单', 'Order'], ['status', '状态', 'Status'],
      ['amountPaid', '已付', 'Paid'], ['usedAmount', '已作业', 'Delivered'],
      ['refundAmount', '应退', 'Refundable'], ['appliedAt', '申请时间', 'Applied at']];
    P['workorder-cancel.html'] = function (cfg) {
      return formPage(cfg, { ds: 'workorders', recDs: 'workorders', titleZh: '取消这张工单', titleEn: 'Cancel this job',
        recTitleZh: '要取消的工单', recTitleEn: 'Job to cancel', kind: 'cancel', next: 'workorder-refund.html',
        money: function (r) { return [['工单公示价', 'Published job price', '¥' + r.price, '按公示价目核定', 'From the published rate sheet'],
          ['已作业金额（估）', 'Delivered work (est.)', '¥' + (r.price * 0.3).toFixed(1), '按当前流程步骤折算', 'Pro-rated by the current step'],
          ['预计可退', 'Estimated refund', '¥' + (r.price * 0.7).toFixed(1), '提交退款申请时复核', 'Rechecked when the refund is filed']]; },
        fields: function (r) { return [['jobId', '工单号', 'Job no.', 'text', r.id, true],
          ['reason', '取消原因', 'Reason', 'select', '农时变更|承接人超时|计划调整|天气影响', true],
          ['detail', '补充说明', 'Detail', 'textarea', '', false]]; },
        noteZh: '只有待接单、已接单可取消；已作业部分不会整单退。',
        noteEn: 'Only unassigned or assigned jobs can be cancelled; delivered work is pro-rated.' });
    };
    P['workorder-refund.html'] = function (cfg) {
      return formPage(cfg, { ds: 'refunds', recDs: 'orders', titleZh: '提交退款申请', titleEn: 'File a refund request',
        recTitleZh: '关联订单与工单', recTitleEn: 'Linked order and job', kind: 'refund', next: 'workorder-refund-status.html',
        money: function (r) { var paid = r.amount || 0, used = Math.round(paid * .3), fee = +(paid * .02).toFixed(1);
          return [['订单已付金额', 'Order paid', '¥' + paid, '按订单记录', 'From the order record'],
            ['已作业金额', 'Delivered work', '¥' + used, '按公示价折算', 'Valued at published rates'],
            ['平台服务费', 'Platform fee', '¥' + fee, '2% 单列', '2%, itemised'],
            ['预计应退', 'Estimated refund', '¥' + (paid - used - fee).toFixed(1), '核对后原路退回', 'Refunded after review']]; },
        fields: function (r) { return [['orderId', '订单号', 'Order no.', 'text', r.id, true],
          ['method', '退回方式', 'Refund method', 'select', '原支付渠道|平台余额|村集体统一结算', true],
          ['reason', '退款说明', 'Reason', 'textarea', '', false]]; },
        noteZh: '金额由订单与公示价实时算，提交后进入平台核对。',
        noteEn: 'Amounts are computed from the order and published rates; the platform reviews next.' });
    };
    P['workorder-refund-status.html'] = function (cfg) {
      return flowPage(cfg, { ds: 'refunds',
        money: function (r) { return [['已付金额', 'Paid', '¥' + r.amountPaid, '订单实付', 'Order paid'],
          ['已作业扣减', 'Delivered work', '¥' + r.usedAmount, '按公示价', 'At published rates'],
          ['服务费', 'Service fee', '¥' + r.serviceFee, '2% 单列', '2%, itemised'],
          ['应退金额', 'Refundable', '¥' + r.refundAmount, r.method, r.methodEn || r.method]]; } });
    };
    P['workorder-edit.html'] = function (cfg) {
      return formPage(cfg, { ds: 'workorders', titleZh: '修订工单明细', titleEn: 'Amend job details',
        recTitleZh: '当前工单', recTitleEn: 'Current job', kind: 'amend', next: 'workorder-changes.html',
        fields: function (r) { return [['jobId', '工单号', 'Job no.', 'text', r.id, true],
          ['scope', '作业范围', 'Scope', 'text', (r.requirements && r.requirements[0] ? r.requirements[0].valueZh : ''), true],
          ['window', '期望时间窗', 'Time window', 'text', r.dueAt || '', false],
          ['acceptance', '验收标准', 'Acceptance criteria', 'textarea', '按畦逐项核对并上传三段回执照片', true],
          ['budget', '预算（元）', 'Budget', 'number', r.price || 120, false],
          ['reason', '修订说明', 'Reason', 'textarea', '', true]]; },
        noteZh: '已被承接的工单不能在这里改；改动会写进变更记录并通知承接人。',
        noteEn: 'Assigned jobs cannot be amended here. Edits are logged and the assignee is notified.' });
    };
    P['workorder-reopen.html'] = function (cfg) {
      return formPage(cfg, { ds: 'workorders', titleZh: '按原工单重新发起', titleEn: 'Reissue from this job',
        recTitleZh: '原工单（作为模板）', recTitleEn: 'Original job (as template)', kind: 'reissue', next: 'workorder-detail.html',
        fields: function (r) { return [['copyFrom', '原工单号', 'Original job', 'text', r.id, true],
          ['farmId', '关联田园', 'Linked plot', 'text', r.farmId, true],
          ['type', '作业类型', 'Operation', 'select', '翻地|种植|施肥|浇水|除草|采摘|回收|配送|拍照|专家指导', true],
          ['scope', '作业范围', 'Scope', 'text', '', true],
          ['acceptance', '验收标准', 'Acceptance criteria', 'textarea', '按畦逐项核对并上传三段回执照片', true]]; },
        noteZh: '提交后生成新工单号，旧工单仍保留在变更记录里。',
        noteEn: 'A new job number is created; the old one stays in the change log.' });
    };
    P['workorder-changes.html'] = function (cfg) {
      return ledger(cfg, { ds: 'jobChanges', fkey: 'kind', fzh: '按变更类型筛选', fen: 'Filter by change type',
        cols: [['id', '变更号', 'Change no.'], ['workorderId', '原工单', 'Job'], ['kind', '类型', 'Type'],
          ['toStatus', '变更后', 'To'], ['reasonZh', '原因', 'Reason'], ['operator', '操作人', 'By'], ['at', '时间', 'At']], limit: 10 });
    };
    P['lease-edit.html'] = function (cfg) {
      return formPage(cfg, { ds: 'farms', titleZh: '修改租赁信息', titleEn: 'Edit lease terms',
        recTitleZh: '当前田园租赁信息', recTitleEn: 'Current lease terms', kind: 'lease', next: 'contract-manage.html',
        money: function (r) { var s = Math.round((r.price || 680) * (r.areaMu || 1.2));
          return [['公示单价', 'Published rate', '¥' + r.price + ' / 亩 / 季', '以公示版本为准', 'Per published edition'],
            ['实测面积', 'Measured area', r.areaMu + ' 亩', '田园档案登记', 'From the plot archive'],
            ['一季租金', 'One-season rent', '¥' + s, '单价 × 面积', 'Rate × area'],
            ['押金（30%）', 'Deposit (30%)', '¥' + Math.round(s * .3), '退租验收后退还', 'Refunded after inspection']]; },
        fields: function (r) { return [['farmId', '田块编号', 'Plot no.', 'text', r.id, true],
          ['leaseType', '承包类型', 'Lease type', 'select', '整田年租|分畦季租|认养代耕|共享轮作|试验托管', true],
          ['seasons', '承包季数', 'Seasons', 'number', '1', true],
          ['price', '公示单价（元/亩/季）', 'Published rate', 'number', r.price || 680, true],
          ['reason', '变更说明', 'Reason', 'textarea', '', true]]; },
        noteZh: '提交后进入多级审核；已生效订单按原价执行到本周期结束。',
        noteEn: 'Changes enter multi-level review; existing orders keep the old rate until their term ends.' });
    };
    P['contract-manage.html'] = function (cfg) {
      return ledger(cfg, { ds: 'contracts', fkey: 'status', fzh: '按合同状态筛选', fen: 'Filter by contract status',
        cols: [['id', '合同号', 'Contract'], ['farmId', '田园', 'Plot'], ['version', '版本', 'Version'],
          ['leaseType', '承包类型', 'Lease type'], ['rentPerSeason', '一季租金', 'Season rent'], ['status', '状态', 'Status'], ['signedAt', '签署日', 'Signed']], limit: 10 });
    };
    P['contract-edit.html'] = function (cfg) {
      return formPage(cfg, { ds: 'contracts', titleZh: '逐条编辑合同内容', titleEn: 'Edit contract clauses',
        recTitleZh: '当前合同版本', recTitleEn: 'Current contract version', kind: 'contract', next: 'contract-versions.html',
        fields: function (r) { var c = r.clausesZh || [];
          return [['contractId', '合同号', 'Contract no.', 'text', r.id, true],
            ['rent', '租金与计价条款', 'Rent & pricing', 'textarea', c[0] || '', true],
            ['deposit', '押金与退还条款', 'Deposit & refund', 'textarea', c[1] || '', true],
            ['water', '灌溉与通行条款', 'Irrigation & access', 'textarea', c[2] || '', false],
            ['use', '用途与转租条款', 'Use & subletting', 'textarea', c[3] || '', false],
            ['dispute', '争议处理条款', 'Disputes', 'textarea', c[4] || '', false],
            ['reason', '变更原因', 'Reason', 'textarea', '', true]]; },
        noteZh: '保存后生成新版本，双方确认前不影响已生效合同。',
        noteEn: 'Saving creates a new version; the in-force contract stands until both sides confirm.' });
    };
    P['contract-versions.html'] = function (cfg) {
      return ledger(cfg, { ds: 'contractVersions', fkey: 'clauseZh', fzh: '按条款筛选', fen: 'Filter by clause',
        cols: [['id', '版本号', 'Version'], ['contractId', '合同号', 'Contract'], ['clauseZh', '条款', 'Clause'],
          ['beforeZh', '变更前', 'Before'], ['afterZh', '变更后', 'After'], ['reasonZh', '变更原因', 'Reason'], ['at', '时间', 'At']],
        opt: { diff: ['beforeZh', 'afterZh'] }, limit: 10,
        after: function () { return '<p class="sf-v2-note">' +
          esc(L('相同条款保持原样，改动的条款整行高亮；每条版本都写明提交人与变更原因。',
            'Unchanged clauses stay as they were; amended rows are highlighted with author and reason.')) + '</p>'; } });
    };
    P['merchant-reconcile.html'] = function (cfg) {
      return statsPage(cfg, { ds: 'bills', keyZh: '账期', keyEn: 'Period', labels: ['应收合计', '已收合计', '服务费', '净额'],
        labelsEn: ['Gross', 'Received', 'Fee', 'Net'], vals: ['receivable', 'received', 'serviceFee', 'net'],
        dims: [['period', '按账期', 'By period'], ['kind', '按类型', 'By type'], ['status', '按状态', 'By status']],
        keyOf: function (r, d) { return bizScalar(d === 'period' ? r.period : d === 'kind' ? r.kind : r.status); },
        after: function () { return '<p class="sf-v2-note">' +
          esc(L('应收、服务费、退款与净额都由逐笔账单实时聚合；点上方维度切换分组，数字会跟着变。',
            'Gross, fees, refunds and net are aggregated live from bill lines. Switch the dimension above and the figures change.')) + '</p>'; } });
    };
    P['merchant-bills.html'] = function (cfg) {
      return ledger(cfg, { ds: 'bills', fkey: 'kind', fzh: '按账单类型筛选', fen: 'Filter by bill type', sumKey: 'net',
        cols: [['id', '账单号', 'Bill'], ['period', '账期', 'Period'], ['farmId', '田园', 'Plot'],
          ['kind', '类型', 'Type'], ['receivable', '应收', 'Receivable'], ['serviceFee', '服务费', 'Fee'],
          ['refunded', '退款', 'Refunded'], ['net', '净额', 'Net'], ['status', '状态', 'Status']], limit: 10 });
    };
    P['merchant-reconcile-detail.html'] = function (cfg) {
      return detailPage(cfg, { ds: 'reconciliations',
        after: function (r) { var lines = all('bills').filter(function (b) { return b.period === r.period; });
          return '<div class="sf-v2-sub"><h3>' + esc(L('本期逐笔账单（' + lines.length + ' 笔）', 'Itemised bills (' + lines.length + ')')) + '</h3>' +
            table([['id', '账单号', 'Bill'], ['kind', '类型', 'Type'], ['receivable', '应收', 'Receivable'],
              ['serviceFee', '服务费', 'Fee'], ['refunded', '退款', 'Refunded'], ['net', '净额', 'Net']], lines.slice(0, 8)) +
            money([['应收合计', 'Gross', '¥' + r.gross, '本期全部账单', 'All bills this period'],
              ['平台服务费', 'Platform fee', '¥' + r.fee, '2% 单列', '2%, itemised'],
              ['退款', 'Refunds', '¥' + r.refunded, '按原渠道退回', 'Refunded to source'],
              ['本期净额', 'Net for period', '¥' + r.net, r.status, r.statusEn || r.status]]) + '</div>'; } });
    };
    P['activity-manage.html'] = function (cfg) {
      return ledger(cfg, { ds: 'activityVersions', fkey: 'status', fzh: '按活动状态筛选', fen: 'Filter by event status',
        cols: [['id', '版本', 'Version'], ['titleZh', '活动名称', 'Event'], ['price', '公示价', 'Price'],
          ['capacity', '名额', 'Seats'], ['status', '状态', 'Status'], ['changeZh', '最近变更', 'Latest change'], ['at', '时间', 'At']], limit: 10 });
    };
    P['activity-publish.html'] = function (cfg) {
      return formPage(cfg, { ds: 'activities', titleZh: '发布一场田园活动', titleEn: 'Publish a field event',
        recTitleZh: '可选参考活动（用于字段示例）', recTitleEn: 'Reference event for field values', kind: 'publish', next: 'activity-manage.html',
        fields: function (r) { return [['title', '活动名称', 'Event title', 'text', '', true],
          ['kind', '活动类型', 'Type', 'select', '聚会|开会|活动|运动场地|婚纱场地|露营|采摘|研学', true],
          ['farmId', '关联田园', 'Linked plot', 'text', r.farmId || 'F001', true],
          ['date', '活动日期', 'Date', 'date', '2026-11-20', true],
          ['capacity', '名额', 'Seats', 'number', '20', true],
          ['price', '公示价（元/人）', 'Published price', 'number', r.price || 68, true],
          ['content', '活动内容', 'Description', 'textarea', '', true]]; },
        noteZh: '提交后进入公示与报名，价格取自公示总账口径。',
        noteEn: 'Publishing opens sign-up; the price follows the published rate book.' });
    };
    P['activity-edit.html'] = function (cfg) {
      return formPage(cfg, { ds: 'activities', titleZh: '更新活动内容', titleEn: 'Update an event',
        recTitleZh: '当前活动内容（已回填）', recTitleEn: 'Live event content (pre-filled)', kind: 'update', next: 'activity-versions.html',
        fields: function (r) { return [['activityId', '活动号', 'Event no.', 'text', r.id, true],
          ['title', '活动名称', 'Event title', 'text', r.titleZh || '', true],
          ['date', '活动日期', 'Date', 'date', r.date || '2026-11-20', true],
          ['capacity', '名额', 'Seats', 'number', r.capacity || 20, true],
          ['price', '公示价（元/人）', 'Published price', 'number', r.price || 68, true],
          ['content', '活动内容', 'Description', 'textarea', r.descZh || '', true],
          ['reason', '变更说明', 'Change note', 'textarea', '', true]]; },
        noteZh: '改时间、名额、价格或文案都会留一个新版本；已报名用户会看到变更说明。',
        noteEn: 'Time, seats, price or copy changes create a version; signed-up users see the note.' });
    };
    P['activity-versions.html'] = function (cfg) {
      return ledger(cfg, { ds: 'activityVersions', fkey: 'status', fzh: '按版本状态筛选', fen: 'Filter by version status',
        cols: [['id', '版本号', 'Version'], ['activityId', '活动号', 'Event'], ['titleZh', '活动名称', 'Event'],
          ['price', '公示价', 'Price'], ['capacity', '名额', 'Seats'], ['changeZh', '本次变更', 'Change'],
          ['operator', '操作人', 'By'], ['at', '时间', 'At']], limit: 10 });
    };
    P['activity-registrations.html'] = function (cfg) {
      return ledger(cfg, { ds: 'orders', fkey: 'status', fzh: '按报名状态筛选', fen: 'Filter by sign-up status', sumKey: 'amount',
        cols: [['id', '报名单号', 'Sign-up'], ['userId', '报名人', 'Member'], ['kind', '类型', 'Type'],
          ['amount', '金额', 'Amount'], ['status', '状态', 'Status'], ['createdAt', '报名时间', 'At']], limit: 10,
        after: function (items) { return '<div class="sf-v2-sub"><h3>' +
          esc(L('现场签到', 'On-site check-in')) + '</h3><p class="sf-v2-note">' +
          esc(L('共 ' + items.length + ' 条报名记录，签到状态与名单同步；逐条可核到订单。',
            items.length + ' sign-ups; check-in status is synced with the list and each line traces to an order.')) + '</p>' +
          '<a class="sf-biz-btn" href="' + esc(link('activity-checkin.html', { from: hereFile() })) + '">' +
          esc(L('去现场签到', 'Go to check-in')) + '</a></div>'; } });
    };
    P['farmer-wallet.html'] = function (cfg) {
      var fs = all('funds'), bal = fs.reduce(function (n, f) { return n + f.amount; }, 0);
      var pending = fs.filter(function (f) { return f.status !== '已入账'; }).reduce(function (n, f) { return n + f.amount; }, 0);
      var income = fs.filter(function (f) { return f.amount > 0; }).reduce(function (n, f) { return n + f.amount; }, 0);
      var out = fs.filter(function (f) { return f.amount < 0; }).reduce(function (n, f) { return n - f.amount; }, 0);
      return statsPage(cfg, { ds: 'funds', keyZh: '流水类型', keyEn: 'Entry type', labels: ['金额合计', '笔数', '变动后余额均值', '时间跨度'],
        labelsEn: ['Amount total', 'Entries', 'Avg. balance', 'Span'], vals: ['amount', 'amount', 'balanceAfter', 'at'],
        dims: [['kind', '按类型', 'By type'], ['status', '按状态', 'By status']],
        keyOf: function (r, d) { return bizScalar(d === 'status' ? r.status : r.kind); },
        after: function () { return stat([['¥' + bal.toFixed(1), L('可提现余额', 'Available balance')],
          ['¥' + pending.toFixed(1), L('处理中金额', 'In flight')],
          ['¥' + income.toFixed(1), L('累计收入', 'Lifetime income')],
          ['¥' + out.toFixed(1), L('累计支出', 'Total out')]]) +
          money([['期初余额', 'Opening balance', '¥0', '按流水滚动', 'Rolling ledger'],
            ['累计收入', 'Income', '¥' + income.toFixed(1), '结算 / 分成 / 货款', 'Settlements and sales'],
            ['累计支出', 'Outgoings', '¥' + out.toFixed(1), '服务费 / 退款 / 提现', 'Fees, refunds, withdrawals'],
            ['当前可提现', 'Available now', '¥' + bal.toFixed(1), '提现页会再次校验', 'Rechecked on withdrawal']]) +
          '<p class="sf-v2-note">' + esc(L('四个数字都由资金流水逐笔相加，不是写死的展示值。',
            'All four figures are summed from the ledger; none is a printed constant.')) + '</p>'; } });
    };
    P['farmer-funds.html'] = function (cfg) {
      return ledger(cfg, { ds: 'funds', fkey: 'kind', fzh: '按流水类型筛选', fen: 'Filter by entry type', sumKey: 'amount',
        cols: [['id', '流水号', 'Entry'], ['kind', '类型', 'Type'], ['amount', '金额（元）', 'Amount'],
          ['balanceAfter', '变动后余额', 'Balance after'], ['status', '状态', 'Status'],
          ['relatedId', '关联单号', 'Related'], ['at', '时间', 'At']], limit: 10 });
    };
    P['farmer-settlement.html'] = function (cfg) {
      return ledger(cfg, { ds: 'workorders', fkey: 'status', fzh: '按工单状态筛选', fen: 'Filter by job status', sumKey: 'price',
        cols: [['id', '工单号', 'Job'], ['type', '作业类型', 'Type'], ['status', '状态', 'Status'],
          ['price', '公示价', 'Published price'], ['settleMode', '结算方式', 'Settlement'], ['updatedAt', '更新时间', 'Updated']], limit: 10,
        after: function (items) {
          var tot = items.reduce(function (n, x) { return n + (Number(x.price) || 0); }, 0);
          var fee = +(tot * .01).toFixed(1);
          return money([['验收通过工单合计', 'Accepted jobs', '¥' + tot.toFixed(1), items.length + ' 条', items.length + ' jobs'],
            ['平台结算服务费（1%）', 'Settlement fee (1%)', '¥' + fee, '按公示口径', 'Per published rules'],
            ['实结合计', 'Net payout', '¥' + (tot - fee).toFixed(1), '进入可提现余额', 'Added to available balance']]); } });
    };
    P['farmer-withdraw.html'] = function (cfg) {
      var fs = all('funds'), bal = fs.reduce(function (n, f) { return n + f.amount; }, 0);
      return formPage(cfg, { ds: 'withdrawals', recDs: 'funds', titleZh: '申请提现', titleEn: 'Withdraw funds',
        recTitleZh: '最近一条资金流水', recTitleEn: 'Latest ledger entry', kind: 'withdraw', next: 'farmer-withdraw-status.html',
        money: function () { return [['可提现余额', 'Available balance', '¥' + bal.toFixed(1), '由流水实时算', 'Live from the ledger'],
          ['最低提现额', 'Minimum', '¥100', '低于此额不可提交', 'Below this is blocked'],
          ['手续费', 'Handling fee', '¥2 / 笔', '固定，提交前明示', 'Fixed, shown up front'],
          ['预计到账', 'Estimated credit', '¥' + Math.max(0, bal - 2).toFixed(1), '按实际申请金额算', 'Based on the requested amount']]; },
        fields: function () { return [['amount', '提现金额（元）', 'Amount', 'number', '', true],
          ['bank', '到账账户', 'Bank account', 'select', '尾号 4472 · 农商行|尾号 8810 · 邮储|尾号 2093 · 建行', true],
          ['note', '备注', 'Note', 'text', '', false]]; },
        noteZh: '金额超过可提现余额或低于 100 元会被当场拦下，不会生成提现单。',
        noteEn: 'Amounts above the available balance or below CNY 100 are blocked on the spot.' });
    };
    P['farmer-withdraw-status.html'] = function (cfg) {
      return flowPage(cfg, { ds: 'withdrawals',
        money: function (r) { return [['申请金额', 'Requested', '¥' + r.amount, r.appliedAt, r.appliedAt],
          ['手续费', 'Handling fee', '¥' + r.fee, '固定每笔', 'Per withdrawal'],
          ['到账金额', 'Net credit', '¥' + r.arrive, r.bank, r.bankEn || r.bank]]; } });
    };
    P['expert-stats.html'] = function (cfg) {
      return statsPage(cfg, { ds: 'plantRecords', keyZh: '分组', keyEn: 'Group',
        labels: ['均温（℃）', '均湿（%）', '含水率（%）', '预估产量（kg）'],
        labelsEn: ['Avg temp', 'Avg humidity', 'Avg soil moisture', 'Est. yield'],
        vals: ['temp', 'humid', 'soilMoisture', 'yieldKg'],
        dims: [['crop', '按作物', 'By crop'], ['farm', '按田块', 'By plot'], ['stage', '按生长阶段', 'By stage'], ['season', '按月份', 'By month']],
        keyOf: function (r, d) { return d === 'farm' ? bizScalar(r.farmId) : d === 'stage' ? bizScalar(r.stage) : d === 'season' ? String(r.at).slice(5, 7) + ' 月' : bizScalar(r.crop); },
        after: function (dim, groups) { return '<p class="sf-v2-note">' +
          esc(L('当前按「' + dim + '」分成 ' + groups.length + ' 组；切换维度后分组与四项均值都会重算，可直接作为调控依据。',
            'Grouped by ' + dim + ' into ' + groups.length + ' groups. Switching the dimension recomputes every average.')) + '</p>'; } });
    };
    P['expert-compare.html'] = comparePage;
    P['expert-regulation.html'] = function (cfg) {
      return formPage(cfg, { ds: 'regulations', recDs: 'plantRecords', titleZh: '提交调控建议', titleEn: 'Submit control advice',
        recTitleZh: '依据的种植记录', recTitleEn: 'Evidence: field record', kind: 'regulation', next: 'expert-regulation-log.html',
        fields: function (r) { return [['farmId', '关联田园', 'Linked plot', 'text', r.farmId || 'F001', true],
          ['dimension', '调控维度', 'Dimension', 'select', '土壤湿度|灌溉频次|施肥用量|播期安排|品种对照|病虫害防控', true],
          ['before', '调整前读数', 'Reading before', 'text', r.soilMoisture + '% / ' + r.temp + '℃', true],
          ['target', '目标区间', 'Target range', 'text', '58% / 20℃', true],
          ['action', '具体动作', 'Action', 'textarea', '', true],
          ['basis', '对比依据', 'Evidence', 'textarea', r.notesZh || '', false]]; },
        noteZh: '提交后进入执行与复核，复核读数会写回调控记录。',
        noteEn: 'Advice enters execution and review; re-measured readings are written back.' });
    };
    P['expert-regulation-log.html'] = function (cfg) {
      return ledger(cfg, { ds: 'regulations', fkey: 'dimension', fzh: '按调控维度筛选', fen: 'Filter by dimension',
        cols: [['id', '建议编号', 'Advice'], ['farmId', '田园', 'Plot'], ['dimension', '维度', 'Dimension'],
          ['readingBefore', '调整前读数', 'Before'], ['target', '目标区间', 'Target'], ['actionZh', '调控动作', 'Action'],
          ['status', '状态', 'Status'], ['at', '时间', 'At']], limit: 10 });
    };
    P['expert-planting-query.html'] = function (cfg) {
      return ledger(cfg, { ds: 'plantRecords', fkey: 'crop', fzh: '按作物筛选', fen: 'Filter by crop', sumKey: 'yieldKg',
        cols: [['id', '记录号', 'Record'], ['farmId', '田园', 'Plot'], ['plotNo', '田块', 'Plot no.'],
          ['crop', '作物', 'Crop'], ['stage', '阶段', 'Stage'], ['temp', '温度', 'Temp'],
          ['soilMoisture', '含水率', 'Soil moisture'], ['yieldKg', '预估产量', 'Est. yield'], ['at', '时间', 'At']], limit: 10,
        after: function (items) { return '<div class="sf-v2-chips"><span>' + esc(L('按阶段筛', 'By stage')) + '</span>' +
          uniq(all('plantRecords'), 'stage').map(function (v) {
            return '<a class="sf-v2-chip" href="' + esc(link('expert-planting-query.html', { f: v, from: hereFile() })) + '">' + esc(v) + '</a>';
          }).join('') + '</div><p class="sf-v2-note">' +
          esc(L('筛到 ' + items.length + ' 条记录；点任一行的编号进入该记录的读数与照片回执。',
            items.length + ' records found. Open any record number for readings and photo receipts.')) + '</p>'; } });
    };
    P['expert-planting-detail.html'] = function (cfg) {
      return detailPage(cfg, { ds: 'plantRecords',
        after: function (r) { return '<div class="sf-v2-sub"><h3>' + esc(L('本阶段读数', 'Stage readings')) + '</h3>' +
          money([['温度', 'Temperature', r.temp + ' ℃', '现场记录', 'Field reading'],
            ['空气湿度', 'Humidity', r.humid + ' %', '现场记录', 'Field reading'],
            ['土壤含水率', 'Soil moisture', r.soilMoisture + ' %', '现场记录', 'Field reading'],
            ['株高 / 预估产量', 'Height / est. yield', r.heightCm + ' cm / ' + r.yieldKg + ' kg', '关联工单 ' + r.workorderId, 'Linked job ' + r.workorderId]]) +
          '<p class="sf-v2-note">' + esc(L(r.notesZh || '', r.notesEn || '')) + '</p></div>'; } });
    };
    /* 后台 4 个管控台账：复用 ledger，自动带审核表单且保持纯素 */
    P['admin/refunds.html'] = function (cfg) {
      return ledger(cfg, { ds: 'refunds', fkey: 'status', fzh: '按退款状态筛选', fen: 'Filter by refund status', sumKey: 'refundAmount',
        cols: RF, limit: 10, next: 'refunds.html' });
    };
    P['admin/withdrawals.html'] = function (cfg) {
      return ledger(cfg, { ds: 'withdrawals', fkey: 'status', fzh: '按提现状态筛选', fen: 'Filter by withdrawal status', sumKey: 'amount',
        cols: [['id', '提现单号', 'Withdrawal'], ['userId', '农户', 'Grower'], ['amount', '金额', 'Amount'],
          ['bank', '到账账户', 'Bank'], ['status', '状态', 'Status'], ['appliedAt', '申请时间', 'Applied at']], limit: 10, next: 'withdrawals.html' });
    };
    P['admin/contracts.html'] = function (cfg) {
      return ledger(cfg, { ds: 'contractVersions', fkey: 'clauseZh', fzh: '按条款筛选', fen: 'Filter by clause',
        cols: [['id', '版本号', 'Version'], ['contractId', '合同号', 'Contract'], ['clauseZh', '条款', 'Clause'],
          ['beforeZh', '变更前', 'Before'], ['afterZh', '变更后', 'After'], ['changedBy', '提交人', 'By'], ['at', '时间', 'At']],
        opt: { diff: ['beforeZh', 'afterZh'] }, limit: 10, next: 'contracts.html' });
    };
    P['admin/regulations.html'] = function (cfg) {
      return ledger(cfg, { ds: 'regulations', fkey: 'status', fzh: '按执行状态筛选', fen: 'Filter by status',
        cols: [['id', '建议编号', 'Advice'], ['farmId', '田园', 'Plot'], ['dimension', '维度', 'Dimension'],
          ['actionZh', '调控动作', 'Action'], ['status', '状态', 'Status'], ['reviewZh', '复核结论', 'Review'], ['at', '时间', 'At']],
        limit: 10, next: 'regulations.html' });
    };
    return P;
  })();

  var ROUTES = {
    'index': pageIndex, 'sitemap': pageSitemap,
    'api-catalog': pageGeneric, 'api-lab': pageGeneric, 'farms': pageFarms, 'farm-detail': pageFarmDetail, 'farm-edit': pageFarmEdit,
    'price': pagePriceIndex, 'price-lease': pagePriceLease, 'price-venue': pagePriceVenue,
    'price-job': pagePriceJob, 'price-produce': pagePriceProduce, 'price-rules': pagePriceRules,
    'price-changes': pagePriceChanges, 'price-calc': pagePriceCalc, 'adm-prices': pageAdminPrices,
    'farm-compare': pageFarmCompare,
    'activity': function () { simpleList({ id: 'activity', title: t('activity.title'), desc: t('activity.desc'), ds: 'activities', api: 'listActivities',
      filterItems: [{ k: t('common.all'), v: '' }].concat(['聚会', '露营', '采摘', '婚纱场地'].map(function (x) { return { k: x, v: x }; })), filterKey: 'kind',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.date + ' · ' + x.kind + ' · ' + x.booked + '/' + x.capacity, tags: [x.kind, x.farmId], price: x.price,
        href: detailLink('activity-detail.html', x.id) }); } }); },
    'activity-detail': function () { detailPage({ api: 'getActivity', titleA: 'titleZh', titleB: 'titleEn', back: 'activity.html',
      orderTo: 'activity-signup.html', orderKey: 'activity',
      rows: function (x, f) { return [['日期', x.date], ['类型', x.kind], ['名额', x.booked + '/' + x.capacity], [t('common.price'), '¥' + x.price], ['田园', zh(f, 'nameZh', 'nameEn')]]; } }); },
    'produce': function () { simpleList({ id: 'produce', title: t('produce.title'), desc: t('produce.desc'), ds: 'produces', api: 'listProduces',
      filterItems: [{ k: t('common.all'), v: '' }].concat(['蔬菜', '菌菇', '果品', '粮油'].map(function (x) { return { k: x, v: x }; })), filterKey: 'category',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'nameZh', 'nameEn'), cover: x.cover,
        meta: x.season + ' · ' + x.category + ' · ' + x.traceNo, tags: [x.category, '库存 ' + x.stock + x.unit], price: x.price,
        href: detailLink('produce-detail.html', x.id) }); } }); },
    'produce-detail': function () { detailPage({ api: 'getProduce', titleA: 'nameZh', titleB: 'nameEn', back: 'produce.html',
      orderTo: 'produce-cart.html', orderKey: 'produce',
      rows: function (x, f) { return [['批次', x.traceNo], ['季节', x.season], ['品类', x.category], ['规格', x.unit], ['库存', x.stock + x.unit], ['溯源田园', zh(f, 'nameZh', 'nameEn') + ' · ' + f.plotNo]]; } }); },
    'videos': function () { simpleList({ id: 'videos', title: t('videos.title'), desc: t('videos.desc'), ds: 'videos', api: 'listVideos',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.duration + ' · ' + x.publishedAt + ' · ' + x.views + ' 次播放', tags: [x.tag, x.farmId], price: '',
        href: link('videos.html', { id: x.id, from: 'videos.html' }) }); } }); },
    'promo': function () { simpleList({ id: 'promo', title: t('promo.title'), desc: t('promo.desc'), ds: 'promos', api: 'listPromos',
      toCard: function (x) { return card({ id: x.id, title: zh(x, 'titleZh', 'titleEn'), cover: x.cover,
        meta: x.channel + ' · ' + x.publishedAt, tags: [x.channel, x.farmId], price: '',
        href: link('promo.html', { id: x.id, from: 'promo.html' }) }); } }); },
    'forum': pageForum, 'forum-topic': pageForumTopic, 'forum-edit.html': pageForumEdit,
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
      case 'flow-expand': {
        e.preventDefault();
        var box = document.getElementById('sf-flow-steps');
        if (!box) return;
        var on = box.classList.toggle('is-collapsed');
        el.textContent = on ? el.getAttribute('data-more') : el.getAttribute('data-less');
        el.setAttribute('aria-expanded', on ? 'false' : 'true');
        toast(on ? (lang === 'en' ? 'Showing nearby steps' : '已收起，仅显示当前步附近入口')
                 : (lang === 'en' ? 'All steps shown' : '已展开全部业务步骤'));
        return;
      }
      case 'price-expand': {
        e.preventDefault();
        var pb = document.getElementById('sf-pub-body');
        if (!pb) return;
        var on = pb.classList.toggle('is-collapsed');
        el.textContent = on ? el.getAttribute('data-more') : el.getAttribute('data-less');
        el.setAttribute('aria-expanded', on ? 'false' : 'true');
        toast(on ? (lang === 'en' ? 'Price table collapsed' : '已收起价目表')
                 : (lang === 'en' ? 'Published price table shown' : '已展开本节点公示价目'));
        return;
      }
      case 'biz-advance': {
        /* 业务链上的显式推进：点了就有可见反馈，状态 / 时间线同步更新，不新增历史 */
        e.preventDefault();
        var box = document.getElementById('sf-biz-live');
        var step = el.getAttribute('data-step');
        if (box) {
          box.innerHTML = '<b>' + esc(step) + '</b> · ' +
            (lang === 'en' ? 'Status updated, the flow timeline now shows this step.' : '状态已更新，流程时间线已写入这一步。');
          box.classList.add('is-on');
        }
        toast(step + (lang === 'en' ? ' · recorded' : ' · 已记录'));
        return;
      }
      case 'price-calc': {
        e.preventDefault();
        var form = document.getElementById('sf-pub-calc-form');
        var out = document.getElementById('sf-calc-out');
        if (!form || !out) return;
        var f = M.byId('farms', form.querySelector('[name=plot]').value);
        var area = parseFloat(form.querySelector('[name=area]').value);
        var seasons = parseInt(form.querySelector('[name=seasons]').value, 10);
        var factor = parseFloat(form.querySelector('[name=type]').value);
        if (!f || !(area > 0) || !(seasons >= 1 && seasons <= 8) || !(factor > 0)) {
          toast(t('price.calc.invalid')); return;
        }
        var rate = Math.round(f.price * factor);
        var rent = Math.round(rate * area * seasons);
        var dep = Math.round(rent * 0.30), fee = Math.round(rent * 0.02);
        var E = lang === 'en';
        out.innerHTML = '<h4>' + esc(t('price.calc.total')) + '</h4>' +
          priceTable([t('price.table.item'), t('common.value')], [
            [esc(t('price.calc.rate')), '<span class="sf-pub-num">¥' + rate + '</span> / ' + (E ? 'mu / season' : '亩 / 季')],
            [esc(t('price.calc.rent')), '<span class="sf-pub-num">¥' + rent + '</span> <small>' + rate + ' × ' + area + ' × ' + seasons + '</small>'],
            [esc(t('price.calc.deposit')), '¥' + dep],
            [esc(t('price.calc.fee')), '¥' + fee],
            ['<b>' + esc(t('price.calc.total')) + '</b>', '<b class="sf-pub-num">¥' + (rent + dep + fee) + '</b>']
          ]) + '<p class="sf-pub-note">' + esc(t('price.calc.desc')) + '</p>';
        toast(t('price.calc.ok'));
        return;
      }
      case 'price-publish': {
        e.preventDefault();
        var pf = document.getElementById('sf-pub-publish-form');
        var msg = document.getElementById('sf-pub-admin-msg');
        if (!pf || !msg) return;
        var v = (pf.querySelector('[name=version]').value || '').trim();
        var note = (pf.querySelector('[name=note]').value || '').trim();
        var eff = pf.querySelector('[name=effective]').value;
        if (!v || !note || !eff) { toast(lang === 'en' ? 'Fill in edition, date and note' : '请填写版本号、生效日期与变更说明'); return; }
        msg.textContent = (lang === 'en' ? 'Edition ' : '公示版本 ') + v +
          (lang === 'en' ? ' queued for review; effective ' : ' 已进入审核队列，生效日 ') + eff +
          (lang === 'en' ? '. Note: ' : '。变更说明：') + note;
        toast(lang === 'en' ? 'New edition queued for multi-level review' : '新版本已进入多级审核队列');
        return;
      }
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
      case 'audit-step': {
        var lv = el.getAttribute('data-level');
        toast(lv + ' · ' + (lang === 'en' ? 'review note recorded' : '审核意见已记录'));
        if (lv === '复审') { location.href = link('admin/audit-review.html', { id: param('id', 'AU001'), from: 'admin/audit.html' }); return; }
        return;
      }
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
    if (kind === 'farm') {
      API.saveFarm(d).then(function (r) {
        var E3 = lang === 'en';
        var ok3 = '<div class="sf-biz-ok" data-farm-ok><h3>' +
          esc(E3 ? 'Submitted for multi-level review' : '已提交 · 进入三级审核') + '</h3>' +
          '<p>' + esc(E3 ? 'Review no. ' : '审核单号 ') + esc(r.auditId || 'AU-NEW') +
          esc(E3 ? '. The plot goes live only after initial, second and final approval.' :
            '。资料初审 → 一致性复审 → 终审公开，三步都通过后田园才会出现在前台档案。') + '</p>' +
          '<div class="sf-biz-ok-acts">' +
          '<a class="sf-biz-btn is-next" href="' + esc(link('submission-status.html', { id: 'AU001', from: 'farm-edit.html' })) + '">' +
          esc(E3 ? 'Track approval progress' : '查看审核进度') + '</a>' +
          '<a class="sf-biz-btn" href="' + esc(link('farm-manage.html', { from: 'farm-edit.html' })) + '">' +
          esc(E3 ? 'Manage my plots' : '管理我的田园') + '</a></div></div>';
        var w3 = document.createElement('div'); w3.innerHTML = ok3;
        f.parentNode.replaceChild(w3.firstChild, f);
        toast(t('common.toast.saved') + ' · ' + (r.auditId || 'AU-NEW'));
      }); return;
    }
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
    if (kind === 'biz-form') {
      /* 业务表单：必填校验 → 成功态（写明记录与下一步）→ 动作条直达下一节点 */
      var d2 = {}; new FormData(f).forEach(function (v, k) { d2[k] = v; });
      var first = f.querySelector('input,select,textarea');
      if (first && first.required && !String(d2[first.name] || '').trim()) {
        showErr(f, t('auth.err.missing')); return;
      }
      var E2 = lang === 'en';
      var kind2 = f.getAttribute('data-biz-kind') || '';
      /* 提现边界：金额必须 > 100、不超过由资金流水实时算出的可提现余额。
         不满足就当场拦下，不生成提现单，也不写成功态。 */
      if (kind2 === 'withdraw') {
        var bal2 = M.all('funds').reduce(function (n2, x2) { return n2 + (Number(x2.amount) || 0); }, 0);
        var amt2 = Number(d2.amount);
        if (!(amt2 >= 100) || amt2 > bal2) {
          showErr(f, E2 ? 'Amount must be at least 100 and within the available balance'
                       : '提现金额需不低于 100 元且不超过可提现余额'); return;
        }
      }
      var rec2 = bizRecord((BIZ[bizKey()] || {}).ds || 'farms');
      var nx = f.getAttribute('data-next') || 'account.html';
      var ex2 = bizParams(); ex2.from = hereFile(); if (rec2 && rec2.id) ex2.id = rec2.id;
      /* 成功态按业务动作写真实标题与真实第二去向，不给所有页面套同一句话 */
      var OK2 = {
        cancel: ['已取消 · 进入退款流程', 'Cancelled · refund follows', 'farmer-funds.html', '查看资金流水', 'View fund ledger'],
        refund: ['退款申请已提交 · 待平台核对', 'Refund filed · awaiting review', 'workorder-changes.html', '查看变更记录', 'View change log'],
        amend: ['工单已修订 · 变更留痕', 'Job amended · change logged', 'workorder-changes.html', '查看变更记录', 'View change log'],
        reissue: ['新工单已生成 · 待接单', 'New job created · awaiting assignee', 'workorders.html', '工单总览', 'All jobs'],
        lease: ['租赁变更已提交 · 进入审核', 'Lease change filed · in review', 'submission-status.html', '查看审核进度', 'Track approval'],
        contract: ['合同新版本已生成', 'New contract version created', 'contract-manage.html', '合同管理', 'Contracts'],
        publish: ['活动已提交公示', 'Event sent to publication', 'activity.html', '田园活动', 'Field events'],
        update: ['活动已更新 · 版本已留痕', 'Event updated · version kept', 'activity-manage.html', '活动管理', 'Event management'],
        withdraw: ['提现申请已提交 · 待复核', 'Withdrawal filed · awaiting review', 'farmer-funds.html', '查看资金流水', 'View fund ledger'],
        regulation: ['调控建议已提交 · 待执行', 'Control advice filed · pending', 'expert-regulation-log.html', '调控记录', 'Control log'],
        'admin-review': ['管控结论已写回台账', 'Decision written to the ledger', 'admin/logs.html', '审计日志', 'Audit log']
      }[kind2] || ['已提交 · 记录已进入业务流程', 'Submitted · recorded in the workflow',
                   'orders.html', '查看我的订单', 'My orders'];
      var ok2 = '<div class="sf-biz-ok" data-biz-ok><h3>' + esc(E2 ? OK2[1] : OK2[0]) + '</h3>' +
        '<p>' + esc(E2 ? 'Record ' : '记录 ') + esc(bizScalar(rec2.id || hereFile())) +
        esc(E2 ? ' now has a status, an owner and a next step.' : ' 已有状态、责任人与下一步。') + '</p>' +
        '<div class="sf-biz-ok-acts"><a class="sf-biz-btn is-next" href="' + esc(link(nx, ex2)) + '">' +
        esc(E2 ? 'Continue to next step' : '进入下一步') + '</a>' +
        '<a class="sf-biz-btn" href="' + esc(link(OK2[2], ex2)) + '">' +
        esc(E2 ? OK2[4] : OK2[3]) + '</a></div></div>';
      var wrap2 = document.createElement('div'); wrap2.innerHTML = ok2;
      f.parentNode.replaceChild(wrap2.firstChild, f);
      toast(t('common.toast.submitted'));
      return;
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
    var bk = bizKey();
    /* V2 渲染完成后必须继续往下绑定事件，不能提前 return：
       否则新业务页的表单会走浏览器原生 GET，点击没有任何业务反馈。 */
    var v2done = !!(V2[bk] && V2[bk](BIZ[bk]));
    if (!v2done) {
      if (BIZ[bk] && !ROUTES[page]) bizGeneric(bk, BIZ[bk]);
      else (ROUTES[page] || pageGeneric)();
    }
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  global.SF_APP = { init: init, toast: toast, link: link, BIZ: BIZ, ROLE_LABEL: ROLE_LABEL };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
