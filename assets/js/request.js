/* 闪马田园 SUMFARM · 统一请求层 request.js v1.7.8
   ------------------------------------------------------------------
   前后端彻底分离：页面只调用 API.xxx()，不直接读 SF_MOCK。
   USE_MOCK=true 时由本层回落到模拟数据；置 false 即走 fetch 真实后端。
   约定（所有接口一致）：
     - 基础路径 BASE，认证 Authorization: Bearer <token>（登录后写入 session，仅用于接口，不参与页面状态判断）
     - 统一响应 { code:number, message:string, data:T, traceId:string }
     - 分页响应 Paginated<T> = { items:T[], total:number, page:number, pageSize:number, pages:number }
     - 失败时 reject { code, message, traceId }，由调用方 toast，不吞错
     - 所有列表接口支持 ?page=&pageSize=&q=&lang=；详情接口支持 ?id=
     - 时间字段 ISO 8601 字符串；金额单位分（前端展示时 /100）；面积单位亩
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';
  var BASE = 'https://iarm.fun/api/v1';
  var ENDPOINTS = {
    farms: '/farms', farmDetail: '/farms/{id}', farmSave: '/farms',
    activities: '/activities', activityDetail: '/activities/{id}',
    produces: '/produces', produceDetail: '/produces/{id}',
    videos: '/videos', promos: '/promos',
    topics: '/forum/topics', topicDetail: '/forum/topics/{id}', topicSave: '/forum/topics',
    experts: '/experts', expertDetail: '/experts/{id}',
    workorders: '/workorders', workorderDetail: '/workorders/{id}',
    dispatches: '/dispatches', orders: '/orders',
    users: '/users', comments: '/comments', chats: '/chats',
    chatSend: '/chats', plantings: '/plantings',
    audits: '/admin/audits', auditStep: '/admin/audits/{id}/step',
    notices: '/notices', upload: '/upload', search: '/search',
    adminLogin: '/admin/login', adminModules: '/admin/modules',
    /* 价格公示：全站节点挂接、公示频道与后台管控共用同一组接口。
       金额字段单位分（前端展示 /100），面积亩；所有列表支持 ?page=&pageSize=&q=&lang=。
       GET  /prices             → PriceBook { version, period, cats[], items[], rules[], changes[] }
       GET  /prices/items       → Paginated<PriceItem>  (可按 cat / channel / status 过滤)
       GET  /prices/plots       → Paginated<PlotRent>   { farmId, plotNo, areaMu, rateCents, seasonCents, depositCents, feeCents, totalCents }
       GET  /prices/breakdown   → PriceBreakdown { ds, id, lines:[{ labelZh,labelEn,amountCents,unit,noteZh,noteEn }], totalCents }
                                  查询参数 ?ds=farms|activities|produces|workorders|experts|orders&id=<记录 id>
       POST /prices/calc        → PriceBreakdown  入参 { farmId, areaMu, seasons, leaseType }，试算不落库、不创建订单
       GET  /prices/changes     → Paginated<PriceChange> { itemZh,itemEn,beforeCents,afterCents,effectiveAt,noticeDays,reasonZh,reasonEn }
       POST /admin/prices/publish → { version }  入参 { version, effectiveAt, note, lines[] }，进入多级审核队列
       GET  /admin/prices/audit  → Paginated<PricePublishTask>  审核工作台列表 */
    prices: '/prices', priceItems: '/prices/items', pricePlots: '/prices/plots',
    priceBreakdown: '/prices/breakdown', priceCalc: '/prices/calc',
    priceChanges: '/prices/changes', pricePublish: '/admin/prices/publish',
    priceAudit: '/admin/prices/audit',
    /* 第 33 轮：用户级常规业务接口。金额单位分，展示时 /100；所有写操作返回
       { id, status, next, changedAt }，由前端渲染成功态并跳到下一步。 */
    jobChanges: '/workorders/changes', refunds: '/refunds', refundDetail: '/refunds/{id}',
    contracts: '/contracts', contractDetail: '/contracts/{id}', contractVersions: '/contracts/{id}/versions',
    bills: '/bills', reconciliations: '/reconciliations', reconciliationDetail: '/reconciliations/{id}',
    funds: '/funds', withdrawals: '/withdrawals', withdrawalDetail: '/withdrawals/{id}',
    activityVersions: '/activities/{id}/versions', activityRegistrations: '/activities/{id}/registrations',
    regulations: '/expert/regulations', expertStats: '/expert/stats', expertCompare: '/expert/compare',
    plantRecords: '/expert/plant-records', plantRecordDetail: '/expert/plant-records/{id}',
    jobCancel: '/workorders/{id}/cancel', jobAmend: '/workorders/{id}/amend',
    jobReissue: '/workorders/{id}/reissue', refundApply: '/refunds',
    contractSave: '/contracts', activityPublish: '/activities', activityUpdate: '/activities/{id}',
    fundWithdraw: '/withdrawals', regulationSave: '/expert/regulations',
    adminRefunds: '/admin/refunds', adminWithdrawals: '/admin/withdrawals',
    adminContracts: '/admin/contracts', adminRegulations: '/admin/regulations'
  };
  var config = { useMock: true, base: BASE, token: '', pageSize: 8, lang: 'zh' };
  var M = global.SF_MOCK;

  function qs(o) {
    var p = new URLSearchParams();
    Object.keys(o || {}).forEach(function (k) { if (o[k] !== undefined && o[k] !== null && o[k] !== '') p.set(k, o[k]); });
    p.set('lang', config.lang);
    return p.toString();
  }
  function ok(data, message) { return Promise.resolve({ code: 0, message: message || 'ok', data: data, traceId: 'mock-' + Date.now() }); }
  /* 价格公示接口：USE_MOCK=true 时由唯一一份 SF_MOCK.PRICE_BOOK 组装响应，
     字段与真实后端契约一致（金额分 / 面积亩）；置 false 即走 fetch。 */
  function priceCents(yuan) { return Math.round(Number(yuan) * 100); }
  function priceBookMock() {
    var PB = M.PRICE_BOOK, st = PB.stats();
    return {
      version: st.version, period: { from: st.from, to: st.to },
      cats: PB.cats.map(function (c) { return { key: c.key, zh: c.zh, en: c.en, unit: c.unit, basisZh: c.basisZh, basisEn: c.basisEn }; }),
      items: PB.items.map(function (x) { return { id: x.id, cat: x.cat, zh: x.zh, en: x.en, priceCents: priceCents(x.price), unit: x.unit, scopeZh: x.scopeZh, scopeEn: x.scopeEn, status: 'published' }; }),
      rules: PB.rules, changes: PB.changes.map(function (c) { return { id: c.id, itemZh: c.itemZh, itemEn: c.itemEn, beforeCents: priceCents(c.before), afterCents: priceCents(c.after), unit: c.unit, effectiveAt: c.at, noticeDays: c.days, reasonZh: c.reasonZh, reasonEn: c.reasonEn }; }),
      stats: st
    };
  }
  function pricePlotsMock() {
    return M.all('farms').map(function (f) {
      var season = Math.round(f.price * f.areaMu), dep = Math.round(season * .30), fee = Math.round(season * .02);
      return { farmId: f.id, plotNo: f.plotNo, nameZh: f.nameZh, nameEn: f.nameEn,
        areaMu: f.areaMu, leaseType: f.leaseType, rateCents: priceCents(f.price),
        seasonCents: priceCents(season), depositCents: priceCents(dep), feeCents: priceCents(fee),
        totalCents: priceCents(season + dep + fee) };
    });
  }
  function priceBreakdownMock(ds, id, override) {
    var lines = (M.PRICE_BOOK.breakdown(ds, id) || []).map(function (r) {
      return { labelZh: r.zh, labelEn: r.en, amountZh: r.amountZh, amountEn: r.amountEn,
        noteZh: r.noteZh, noteEn: r.noteEn };
    });
    if (override && override.lines) lines = override.lines;
    return { ds: ds, id: id || '', lines: lines, totalCents: override && override.totalCents !== undefined ? override.totalCents : 0 };
  }

  function paginate(list, page, pageSize, q, fields) {
    var kw = (q || '').trim().toLowerCase();
    var items = list.filter(function (x) {
      if (!kw) return true;
      return (fields || Object.keys(x)).some(function (f) {
        var v = x[f];
        return v && String(Array.isArray(v) ? v.join(' ') : v).toLowerCase().indexOf(kw) >= 0;
      });
    });
    var ps = pageSize || config.pageSize;
    var pages = Math.max(1, Math.ceil(items.length / ps));
    var p = Math.min(Math.max(1, page || 1), pages);
    return { items: items.slice((p - 1) * ps, p * ps), total: items.length, page: p, pageSize: ps, pages: pages };
  }
  function request(path, method, params, body) {
    var url = config.base + path + (method === 'GET' ? '?' + qs(params) : '');
    return fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.token },
      body: method === 'GET' ? undefined : JSON.stringify(body || {})
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { return Promise.reject({ code: r.status, message: j.message, traceId: j.traceId }); });
      return r.json();
    }).then(function (j) { return j.code === 0 ? j : Promise.reject(j); });
  }
  /* 模拟与真实的单点分派：页面无需感知走哪条 */

  /* ================= 第 33 轮 · 用户级常规业务接口 =================
     统一约定：列表 Paginated<T>；详情 T；写操作 { id, status, next, changedAt }。
     模拟分支一律由唯一一份 SF_MOCK 数据集组装，不另造第二套数据。 */
  function listOf(ds, p, fields) {
    p = p || {};
    var list = M.all(ds).filter(function (x) {
      return (!p.status || x.status === p.status) && (!p.kind || (x.kind || x.kindEn) === p.kind) &&
             (!p.farmId || x.farmId === p.farmId) && (!p.crop || x.crop === p.crop) &&
             (!p.stage || x.stage === p.stage) && (!p.dimension || x.dimension === p.dimension) &&
             (!p.period || x.period === p.period) && (!p.ds || true);
    });
    return ok(paginate(list, p.page, p.pageSize, p.q,
      fields || ['id', 'status', 'kind', 'reasonZh', 'reasonEn', 'titleZh', 'titleEn', 'actionZh', 'actionEn']));
  }
  function byMock(ds, id) { return ok(M.byId(ds, id) || M.all(ds)[0] || {}, 'detail'); }
  function written(id, status, next) {
    return ok({ id: id, status: status, next: next, changedAt: new Date().toISOString(), traceId: 'mock-' + Date.now() }, 'saved');
  }

  function call(mockFn, path, method, params, body) {
    /* 模拟与真实两条分支必须返回同一层：业务 data，而不是整包响应 */
    if (config.useMock) return mockFn().then(function (j) { return j.data; });
    return request(path, method, params, body).then(function (j) { return j.data; });
  }

  var API = {
    config: config, ENDPOINTS: ENDPOINTS,

    /* GET /farms?page&pageSize&q&region&leaseType&soil
       返回 Promise<Paginated<Farm>>；Farm 字段见 SUMFARM_BASELINE.md 数据集清单 */
    listFarms: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('farms').filter(function (x) {
          return (!p.region || x.region.indexOf(p.region) >= 0) &&
                 (!p.leaseType || x.leaseType === p.leaseType) &&
                 (!p.soil || x.soil.indexOf(p.soil) >= 0);
        });
        return ok(paginate(list, p.page, p.pageSize, p.q,
          ['nameZh', 'nameEn', 'region', 'plotNo', 'soil', 'pastCrops', 'currentCrops', 'tags']));
      }, ENDPOINTS.farms, 'GET', p);
    },
    /* GET /farms/{id} → Promise<Farm>；不同 id 返回不同田块档案，含 gallery/facilities/temp4/humid4 */
    getFarm: function (id) {
      return call(function () { return ok(M.byId('farms', id), 'farm'); },
        ENDPOINTS.farmDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* POST /farms  body: Farm（不含 id） → Promise<{id, auditId, status:'待初审'}> */
    saveFarm: function (payload) {
      return call(function () { return ok({ id: 'F' + (M.count('farms') + 1), auditId: 'AU' + (M.count('audits') + 1), status: '待初审' }, 'saved'); },
        ENDPOINTS.farmSave, 'POST', {}, payload);
    },
    /* GET /activities?page&q&kind → Promise<Paginated<Activity>> */
    listActivities: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('activities').filter(function (x) { return !p.kind || x.kind === p.kind; });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['titleZh', 'titleEn', 'kind', 'descZh']));
      }, ENDPOINTS.activities, 'GET', p);
    },
    /* GET /activities/{id} → Promise<Activity> */
    getActivity: function (id) {
      return call(function () { return ok(M.byId('activities', id)); },
        ENDPOINTS.activityDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* GET /produces?page&q&category → Promise<Paginated<Produce>> */
    listProduces: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('produces').filter(function (x) { return !p.category || x.category === p.category; });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['nameZh', 'nameEn', 'category', 'traceNo']));
      }, ENDPOINTS.produces, 'GET', p);
    },
    /* GET /produces/{id} → Promise<Produce> */
    getProduce: function (id) {
      return call(function () { return ok(M.byId('produces', id)); },
        ENDPOINTS.produceDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* GET /videos?page&q → Promise<Paginated<Video>> */
    listVideos: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('videos'), p.page, p.pageSize, p.q, ['titleZh', 'titleEn', 'tag'])); }, ENDPOINTS.videos, 'GET', p); },
    /* GET /promos?page&q → Promise<Paginated<Promo>> */
    listPromos: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('promos'), p.page, p.pageSize, p.q, ['titleZh', 'titleEn', 'channel'])); }, ENDPOINTS.promos, 'GET', p); },
    /* GET /forum/topics?page&q&board → Promise<Paginated<Topic>> */
    listTopics: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('topics').filter(function (x) { return !p.board || x.board === p.board; });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['titleZh', 'titleEn', 'bodyZh', 'board', 'tags']));
      }, ENDPOINTS.topics, 'GET', p);
    },
    /* GET /forum/topics/{id} → Promise<Topic & {replyList:Comment[]}> */
    getTopic: function (id) {
      return call(function () {
        var t = M.byId('topics', id);
        return ok(t ? Object.assign({}, t, { replyList: M.all('comments').slice(0, t.replies) }) : null);
      }, ENDPOINTS.topicDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* POST /forum/topics body:{board,titleZh,titleEn,bodyZh,bodyEn} → Promise<{id}> */
    saveTopic: function (payload) {
      return call(function () { return ok({ id: 'T' + (M.count('topics') + 1) }, 'posted'); },
        ENDPOINTS.topicSave, 'POST', {}, payload);
    },
    /* GET /experts?page&q → Promise<Paginated<Expert>>，按 points 降序 */
    listExperts: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('experts').slice().sort(function (a, b) { return b.points - a.points; }), p.page, p.pageSize, p.q, ['nameZh', 'nameEn', 'title', 'org'])); }, ENDPOINTS.experts, 'GET', p); },
    /* GET /experts/{id} → Promise<Expert & {plantings, workorders, techTopics}> */
    getExpert: function (id) {
      return call(function () {
        var e = M.byId('experts', id);
        return ok(e ? Object.assign({}, e, {
          plantings: M.all('plantings').slice(0, e.processCount % 8 + 2),
          workorders: M.all('workorders').slice(0, 5),
          techTopics: M.all('topics').filter(function (x) { return x.board === '技术咨询'; }).slice(0, 3)
        }) : null);
      }, ENDPOINTS.expertDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* GET /workorders?page&q&status&type → Promise<Paginated<Workorder>> */
    listWorkorders: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('workorders').filter(function (x) {
          return (!p.status || x.status === p.status) && (!p.type || x.type === p.type);
        });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['id', 'type', 'descZh', 'farmId']));
      }, ENDPOINTS.workorders, 'GET', p);
    },
    /* GET /workorders/{id} → Promise<Workorder & {chat:Chat[]}> */
    getWorkorder: function (id) {
      return call(function () {
        var w = M.byId('workorders', id);
        return ok(w ? Object.assign({}, w, { chat: M.all('chats').filter(function (c) { return c.workorderId === id; }) }) : null);
      }, ENDPOINTS.workorderDetail.replace('{id}', id), 'GET', { id: id });
    },
    /* GET /dispatches?page&q&scope=nearby|taken|linked → Promise<Paginated<Dispatch>> */
    listDispatches: function (p) {
      p = p || {};
      return call(function () {
        var list = M.all('dispatches').filter(function (x) {
          if (p.scope === 'taken') return x.status !== '待接单';
          if (p.scope === 'linked') return x.distanceKm < 12;
          return true;
        });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['id', 'kind', 'region']));
      }, ENDPOINTS.dispatches, 'GET', p);
    },
    /* POST /dispatches/{id}/accept 由工单接单复用：body:{workorderId,assigneeId} → Promise<{status:'已接单'}> */
    acceptJob: function (workorderId, assigneeId) {
      return call(function () { return ok({ status: '已接单' }, 'accepted'); },
        '/dispatches/' + workorderId + '/accept', 'POST', {}, { workorderId: workorderId, assigneeId: assigneeId });
    },
    /* GET /orders?page&q → Promise<Paginated<Order>> */
    listOrders: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('orders'), p.page, p.pageSize, p.q, ['id', 'kind', 'items'])); }, ENDPOINTS.orders, 'GET', p); },
    /* GET /users?page&q&role → Promise<Paginated<User>>（后台） */
    listUsers: function (p) { p = p || {}; return call(function () { var l = M.all('users').filter(function (x) { return !p.role || x.role === p.role; }); return ok(paginate(l, p.page, p.pageSize, p.q, ['nameZh', 'nameEn', 'role', 'region'])); }, ENDPOINTS.users, 'GET', p); },
    /* GET /comments?page&q&targetType&status → Promise<Paginated<Comment>>（后台评论管理） */
    listComments: function (p) { p = p || {}; return call(function () { var l = M.all('comments').filter(function (x) { return (!p.status || x.status === p.status) && (!p.targetType || x.targetType === p.targetType); }); return ok(paginate(l, p.page, p.pageSize, p.q, ['bodyZh', 'bodyEn', 'id'])); }, ENDPOINTS.comments, 'GET', p); },
    /* GET /chats?workorderId → Promise<Chat[]>；POST /chats 发消息 */
    listChats: function (workorderId) {
      return call(function () { return ok(M.all('chats').filter(function (c) { return !workorderId || c.workorderId === workorderId; })); },
        ENDPOINTS.chats, 'GET', { workorderId: workorderId });
    },
    /* POST /chats body:{workorderId,bodyZh,bodyEn,kind} → Promise<Chat> */
    sendChat: function (payload) {
      return call(function () { return ok(Object.assign({ id: 'C' + Date.now(), at: new Date().toISOString().slice(0, 16).replace('T', ' ') }, payload), 'sent'); },
        ENDPOINTS.chatSend, 'POST', {}, payload);
    },
    /* GET /plantings?page&q → Promise<Paginated<Planting>>（种植信息管理） */
    listPlantings: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('plantings'), p.page, p.pageSize, p.q, ['crop', 'stage', 'noteZh'])); }, ENDPOINTS.plantings, 'GET', p); },
    /* GET /admin/audits?page → Promise<Paginated<Audit>> */
    listAudits: function (p) { p = p || {}; return call(function () { return ok(paginate(M.all('audits'), p.page, p.pageSize, p.q, ['id', 'targetId', 'operator'])); }, ENDPOINTS.audits, 'GET', p); },
    /* POST /admin/audits/{id}/step body:{level,result,comment} → Promise<{level,status}> 三级审核 */
    stepAudit: function (id, payload) {
      return call(function () { return ok({ level: payload.level, status: payload.result }, 'stepped'); },
        ENDPOINTS.auditStep.replace('{id}', id), 'POST', {}, payload);
    },
    /* GET /notices → Promise<Notice[]> */
    listNotices: function () { return call(function () { return ok(M.all('notices')); }, ENDPOINTS.notices, 'GET', {}); },
    /* GET /search?q&page → Promise<{groups:{key,label,items:T[]}[],total}> 跨数据集真实过滤 */
    search: function (q, page) {
      return call(function () {
        var defs = [
          ['farms', '田园', ['nameZh', 'nameEn', 'region', 'plotNo']],
          ['activities', '田园活动', ['titleZh', 'titleEn', 'kind']],
          ['produces', '农产品', ['nameZh', 'nameEn', 'traceNo']],
          ['topics', '论坛', ['titleZh', 'titleEn', 'bodyZh']],
          ['workorders', '工单', ['id', 'type', 'descZh']],
          ['experts', '专家', ['nameZh', 'nameEn', 'title']]
        ];
        var groups = defs.map(function (d) {
          var pg = paginate(M.all(d[0]), 1, 4, q, d[2]);
          return { key: d[0], label: d[1], items: pg.items, total: pg.total };
        });
        return ok({ groups: groups, total: groups.reduce(function (a, g) { return a + g.total; }, 0), page: page || 1 });
      }, ENDPOINTS.search, 'GET', { q: q, page: page });
    },
    /* POST /admin/login body:{account,passphrase,captcha} → Promise<{token,modules:string[]}> */
    adminLogin: function (payload) {
      return call(function () {
        return ok({ token: 'demo-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36), modules: ['dashboard', 'farms', 'users', 'workorders', 'chats', 'planting', 'comments', 'audit', 'system'] });
      }, ENDPOINTS.adminLogin, 'POST', {}, payload);
    },
    /* GET /admin/modules?m → Promise<{rows:object[],columns:string[],total:number}> 后台统一管控数据 */
    adminModule: function (m, p) {
      p = p || {};
      return call(function () {
        var map = { farms: 'farms', users: 'users', workorders: 'workorders', chats: 'chats',
          planting: 'plantings', comments: 'comments', audit: 'audits', dashboard: 'farms', system: 'notices' };
        var name = map[m] || 'farms';
        var pg = paginate(M.all(name), p.page, 12, p.q);
        return ok({ rows: pg.items, columns: Object.keys(pg.items[0] || {}), total: pg.total, pages: pg.pages });
      }, ENDPOINTS.adminModules, 'GET', { m: m, page: p.page, q: p.q });
    },
    /* GET /{dataset}?page&pageSize&q&filter&lang  通用分页接口（子页体系共用）
       name 取数据集名；返回 Promise<Paginated<T>>，T 为该数据集的条目类型。
       filter 为枚举筛选值，命中条目任一字段即保留；q 为全字段关键词。 */
    listAny: function (p) {
      p = p || {};
      var name = p.name || 'farms';
      return call(function () {
        var kw = (p.filter || '').trim();
        var list = M.all(name).filter(function (x) {
          if (!kw) return true;
          return Object.keys(x).some(function (k) {
            var v = x[k];
            return v && String(Array.isArray(v) ? v.join(' ') : v).indexOf(kw) >= 0;
          });
        });
        return ok(paginate(list, p.page, p.pageSize, p.q));
      }, '/' + name, 'GET', { page: p.page, pageSize: p.pageSize, q: p.q, filter: p.filter, name: name });
    },
    /* ---------- 价格公示 API（前端页面与后台管控共用；USE_MOCK=false 时走真实后端） ----------
       统一响应 { code, message, data, traceId }；分页 Paginated<T>；金额字段一律单位分。
       接口要求与返回类型见 ENDPOINTS 处的注释，此处不再重复声明。 */
    getPriceBook: function () {
      return call(function () { return ok(priceBookMock()); }, ENDPOINTS.prices, 'GET', {});
    },
    listPriceItems: function (p) {
      p = p || {};
      return call(function () {
        var list = priceBookMock().items.filter(function (x) {
          return (!p.cat || x.cat === p.cat) && (!p.status || x.status === p.status);
        });
        return ok(paginate(list, p.page, p.pageSize, p.q, ['id', 'zh', 'en', 'unit']));
      }, ENDPOINTS.priceItems, 'GET', p);
    },
    listPricePlots: function (p) {
      p = p || {};
      return call(function () { return ok(paginate(pricePlotsMock(), p.page, p.pageSize, p.q, ['plotNo', 'nameZh', 'nameEn', 'leaseType'])); },
        ENDPOINTS.pricePlots, 'GET', p);
    },
    getPriceBreakdown: function (ds, id) {
      return call(function () { return ok(priceBreakdownMock(ds, id)); },
        ENDPOINTS.priceBreakdown, 'GET', { ds: ds, id: id });
    },
    calcPrice: function (body) {
      /* POST /prices/calc 入参 { farmId, areaMu, seasons, leaseType }；
         返回 PriceBreakdown；试算不落库、不创建订单，前端据此展示结果。 */
      return call(function () {
        var f = M.byId('farms', body.farmId);
        if (!f) return Promise.reject({ code: 404, message: 'plot not found', traceId: 'mock' });
        var area = Number(body.areaMu) || f.areaMu, seasons = Number(body.seasons) || 1;
        var lf = M.PRICE_BOOK.leaseFactors.filter(function (x) { return x.zh === body.leaseType; })[0];
        var factor = lf ? lf.factor : 1;
        var rate = Math.round(f.price * factor), rent = Math.round(rate * area * seasons);
        var dep = Math.round(rent * .30), fee = Math.round(rent * .02);
        var E = config.lang === 'en';
        var lines = [
          { labelZh: '当季公示单价', labelEn: 'Published seasonal rate', amountZh: '¥' + rate + ' / 亩 / 季', amountEn: 'CNY ' + rate + ' / mu / season', noteZh: '承包类型 ' + (body.leaseType || '整季承包'), noteEn: 'Lease type ' + (body.leaseType || 'full season') },
          { labelZh: '租金合计', labelEn: 'Total rent', amountZh: '¥' + rent, amountEn: 'CNY ' + rent, noteZh: rate + ' × ' + area + ' × ' + seasons, noteEn: rate + ' × ' + area + ' × ' + seasons },
          { labelZh: '承包押金（30%）', labelEn: 'Lease deposit (30%)', amountZh: '¥' + dep, amountEn: 'CNY ' + dep, noteZh: '退租验收后原路退还', noteEn: 'Refunded after exit inspection' },
          { labelZh: '平台服务费（2%）', labelEn: 'Platform fee (2%)', amountZh: '¥' + fee, amountEn: 'CNY ' + fee, noteZh: '单列，不并入租金', noteEn: 'Itemised, not part of rent' }
        ];
        return ok(priceBreakdownMock('farms', f.id, { lines: lines, totalCents: priceCents(rent + dep + fee) }));
      }, ENDPOINTS.priceCalc, 'POST', body);
    },
    listPriceChanges: function (p) {
      p = p || {};
      return call(function () { return ok(paginate(priceBookMock().changes, p.page, p.pageSize, p.q, ['itemZh', 'itemEn', 'reasonZh', 'reasonEn'])); },
        ENDPOINTS.priceChanges, 'GET', p);
    },
    publishPrices: function (body) {
      /* POST /admin/prices/publish 入参 { version, effectiveAt, note, lines[] }，
         返回 { version, status:'pending_review', auditId }；进入多级审核队列，不直接生效。 */
      return call(function () { return ok({ version: body.version, status: 'pending_review', auditId: 'PA-' + Date.now() }, 'queued'); },
        ENDPOINTS.pricePublish, 'POST', body);
    },
    listPriceAudits: function (p) {
      p = p || {};
      return call(function () { return ok(paginate([], p.page, p.pageSize, p.q)); }, ENDPOINTS.priceAudit, 'GET', p);
    },

    /* GET /workorders/changes?workorderId=&kind= → Paginated<JobChange>
       JobChange { id, workorderId, kind, fromStatus, toStatus, reasonZh, reasonEn, operator, at, amountImpact } */
    listJobChanges: function (p) { return call(function () { return listOf('jobChanges', p, ['id','workorderId','kind','reasonZh','reasonEn','operator','at']); }, ENDPOINTS.jobChanges, 'GET', p); },
    /* POST /workorders/{id}/cancel body:{ reason, detail } → { id, status:'已取消', next:'workorder-refund.html' }
       仅「待接单 / 已接单」可取消；已作业部分按公示价折算，不整单退。 */
    cancelWorkorder: function (id, body) { return call(function () { return written(id, '已取消', 'workorder-refund.html'); }, ENDPOINTS.jobCancel.replace('{id}', id), 'POST', {}, body); },
    /* POST /workorders/{id}/amend body:{ scope, window, acceptance, budget, reason } → { id, status:'待接单（已修订）', next:'workorder-changes.html' } */
    amendWorkorder: function (id, body) { return call(function () { return written(id, '待接单（已修订）', 'workorder-changes.html'); }, ENDPOINTS.jobAmend.replace('{id}', id), 'POST', {}, body); },
    /* POST /workorders/{id}/reissue body:{ farmId, type, scope, acceptance } → { id:'W9xx', status:'待接单（新单）', next:'workorder-detail.html' } */
    reissueWorkorder: function (id, body) { return call(function () { return written('W' + (900 + M.count('workorders')), '待接单（新单）', 'workorder-detail.html'); }, ENDPOINTS.jobReissue.replace('{id}', id), 'POST', {}, body); },
    /* GET /refunds?status= → Paginated<Refund>；Refund 含金额构成 amountPaid/usedAmount/serviceFee/refundAmount（分） */
    listRefunds: function (p) { return call(function () { return listOf('refunds', p, ['id','orderId','workorderId','status','reasonZh','reasonEn','method']); }, ENDPOINTS.refunds, 'GET', p); },
    /* GET /refunds/{id} → Refund（含 4 步时间线 flow[]） */
    getRefund: function (id) { return call(function () { return byMock('refunds', id); }, ENDPOINTS.refundDetail.replace('{id}', id), 'GET', { id: id }); },
    /* POST /refunds body:{ orderId, workorderId, reason, method } → { id:'RFxxx', status:'待平台核对', next:'workorder-refund-status.html' } */
    applyRefund: function (body) { return call(function () { return written('RF' + (M.count('refunds') + 1), '待平台核对', 'workorder-refund-status.html'); }, ENDPOINTS.refundApply, 'POST', {}, body); },
    /* GET /contracts?farmId= → Paginated<Contract>；Contract 含 clausesZh[]/clausesEn[] 与金额构成 */
    listContracts: function (p) { return call(function () { return listOf('contracts', p, ['id','farmId','plotNo','version','status','leaseType']); }, ENDPOINTS.contracts, 'GET', p); },
    /* GET /contracts/{id} → Contract */
    getContract: function (id) { return call(function () { return byMock('contracts', id); }, ENDPOINTS.contractDetail.replace('{id}', id), 'GET', { id: id }); },
    /* GET /contracts/{id}/versions → Paginated<ContractVersion>（before/after 逐条对照） */
    listContractVersions: function (id, p) { return call(function () { return listOf('contractVersions', p, ['id','version','clauseZh','clauseEn','reasonZh','reasonEn','at']); }, ENDPOINTS.contractVersions.replace('{id}', id), 'GET', p); },
    /* POST /contracts body:{ farmId, clauses[], reason } → { id, status:'变更审核中', next:'contract-versions.html' } */
    saveContract: function (body) { return call(function () { return written(body.contractId || 'CT-NEW', '变更审核中', 'contract-versions.html'); }, ENDPOINTS.contractSave, 'POST', {}, body); },
    /* GET /bills?period=&kind= → Paginated<Bill>；Bill.net = receivable - serviceFee - refunded */
    listBills: function (p) { return call(function () { return listOf('bills', p, ['id','period','farmId','kind','status','at']); }, ENDPOINTS.bills, 'GET', p); },
    /* GET /reconciliations?period= → Paginated<Reconciliation>；汇总金额由 bills 实时聚合 */
    listReconciliations: function (p) { return call(function () { return listOf('reconciliations', p, ['id','period','subject','status','checkedAt']); }, ENDPOINTS.reconciliations, 'GET', p); },
    /* GET /reconciliations/{id} → Reconciliation（含该期账单明细） */
    getReconciliation: function (id) { return call(function () { return byMock('reconciliations', id); }, ENDPOINTS.reconciliationDetail.replace('{id}', id), 'GET', { id: id }); },
    /* GET /funds?kind= → Paginated<Fund>；Fund.amount 可为负（支出） */
    listFunds: function (p) { return call(function () { return listOf('funds', p, ['id','kind','status','relatedId','at']); }, ENDPOINTS.funds, 'GET', p); },
    /* GET /withdrawals?status= → Paginated<Withdrawal> */
    listWithdrawals: function (p) { return call(function () { return listOf('withdrawals', p, ['id','status','bank','appliedAt']); }, ENDPOINTS.withdrawals, 'GET', p); },
    /* GET /withdrawals/{id} → Withdrawal（含 4 步时间线） */
    getWithdrawal: function (id) { return call(function () { return byMock('withdrawals', id); }, ENDPOINTS.withdrawalDetail.replace('{id}', id), 'GET', { id: id }); },
    /* POST /withdrawals body:{ amountCents, bank, userId } → { id:'WDxxx', status:'待平台复核', next:'farmer-withdraw-status.html' }
       服务端必须校验 amountCents ≤ 可提现余额且 > 0；模拟层同样校验，超额 reject。 */
    withdrawFunds: function (body) {
      return call(function () {
        var bal = M.all('funds').reduce(function (n, f) { return n + f.amount; }, 0);
        if (!(body.amountCents > 0) || body.amountCents > bal * 100) {
          return Promise.reject({ code: 4001, message: 'amount exceeds available balance', traceId: 'mock-' + Date.now() });
        }
        return written('WD' + (M.count('withdrawals') + 1), '待平台复核', 'farmer-withdraw-status.html');
      }, ENDPOINTS.fundWithdraw, 'POST', {}, body);
    },
    /* GET /activities/{id}/versions → Paginated<ActivityVersion> */
    listActivityVersions: function (id, p) { return call(function () { return listOf('activityVersions', p, ['id','version','titleZh','titleEn','changeZh','changeEn','status']); }, ENDPOINTS.activityVersions.replace('{id}', id), 'GET', p); },
    /* GET /activities/{id}/registrations → Paginated<Registration> */
    listActivityRegistrations: function (id, p) { return call(function () { return listOf('orders', p, ['id','userId','kind','status','createdAt']); }, ENDPOINTS.activityRegistrations.replace('{id}', id), 'GET', p); },
    /* POST /activities body:{ title, kind, farmId, date, capacity, price, content } → { id, status:'公示中', next:'activity-manage.html' } */
    publishActivity: function (body) { return call(function () { return written('A' + (M.count('activities') + 1), '公示中', 'activity-manage.html'); }, ENDPOINTS.activityPublish, 'POST', {}, body); },
    /* POST /activities/{id} body:{ ...变更字段, reason } → { id, status:'公示中（已更新）', next:'activity-versions.html' } */
    updateActivity: function (id, body) { return call(function () { return written(id, '公示中（已更新）', 'activity-versions.html'); }, ENDPOINTS.activityUpdate.replace('{id}', id), 'POST', {}, body); },
    /* GET /expert/stats?dimension=farm|crop|season|stage → StatsResult { groups:[{ key, count, avgTemp, avgHumid, avgYield }], total } */
    expertStats: function (p) {
      return call(function () {
        var dim = (p && p.dimension) || 'crop', recs = M.all('plantRecords'), g = {}, out = [];
        recs.forEach(function (r) {
          var k = dim === 'farm' ? r.farmId : dim === 'stage' ? r.stage : dim === 'season' ? r.at.slice(5, 7) + ' 月' : r.crop;
          if (!g[k]) g[k] = { key: k, count: 0, temp: 0, humid: 0, soil: 0, yield: 0 };
          g[k].count++; g[k].temp += r.temp; g[k].humid += r.humid; g[k].soil += r.soilMoisture; g[k].yield += r.yieldKg;
        });
        Object.keys(g).forEach(function (k) {
          var x = g[k]; out.push({ key: k, count: x.count, avgTemp: +(x.temp / x.count).toFixed(1),
            avgHumid: +(x.humid / x.count).toFixed(1), avgSoil: +(x.soil / x.count).toFixed(1),
            avgYield: +(x.yield / x.count).toFixed(1) });
        });
        return ok({ dimension: dim, groups: out, total: recs.length }, 'stats');
      }, ENDPOINTS.expertStats, 'GET', p);
    },
    /* GET /expert/compare?ids=F001,F002 → CompareResult { fields[], same[], diff[] }；相同项合并、差异高亮 */
    expertCompare: function (p) {
      return call(function () {
        var ids = String((p && p.ids) || 'F001,F002').split(',').slice(0, 3);
        var fs = ids.map(function (id) { return M.byId('farms', id) || M.all('farms')[0]; });
        var defs = [['soil','土壤','Soil'],['leaseType','承包类型','Lease type'],['areaMu','实测面积（亩）','Area (mu)'],
          ['price','公示单价','Published rate'],['temp4','四季均温','Season temps'],['humid4','四季均湿','Season humidity']];
        var same = [], diff = [];
        defs.forEach(function (d) {
          var vals = fs.map(function (f) { return String(f[d[0]]); });
          var eq = vals.every(function (v) { return v === vals[0]; });
          (eq ? same : diff).push({ key: d[0], zh: d[1], en: d[2], values: vals });
        });
        return ok({ ids: ids, fields: defs.map(function (d) { return { key: d[0], zh: d[1], en: d[2] }; }), same: same, diff: diff }, 'compare');
      }, ENDPOINTS.expertCompare, 'GET', p);
    },
    /* GET /expert/plant-records?farmId=&crop=&stage= → Paginated<PlantRecord> */
    listPlantRecords: function (p) { return call(function () { return listOf('plantRecords', p, ['id','farmId','plotNo','crop','stage','operator','at']); }, ENDPOINTS.plantRecords, 'GET', p); },
    /* GET /expert/plant-records/{id} → PlantRecord（含读数与照片回执） */
    getPlantRecord: function (id) { return call(function () { return byMock('plantRecords', id); }, ENDPOINTS.plantRecordDetail.replace('{id}', id), 'GET', { id: id }); },
    /* GET /expert/regulations?status= → Paginated<Regulation> */
    listRegulations: function (p) { return call(function () { return listOf('regulations', p, ['id','farmId','dimension','actionZh','actionEn','status','at']); }, ENDPOINTS.regulations, 'GET', p); },
    /* POST /expert/regulations body:{ farmId, dimension, target, action, basis } → { id, status:'待执行', next:'expert-regulation-log.html' } */
    saveRegulation: function (body) { return call(function () { return written('RG' + (M.count('regulations') + 1), '待执行', 'expert-regulation-log.html'); }, ENDPOINTS.regulationSave, 'POST', {}, body); },
    /* 后台管控：GET 列表 + POST 状态推进，返回类型与前台一致 */
    listAdminRefunds: function (p) { return call(function () { return listOf('refunds', p, ['id','orderId','status','refundAmount','appliedAt']); }, ENDPOINTS.adminRefunds, 'GET', p); },
    reviewRefund: function (id, body) { return call(function () { return written(id, (body && body.decision) || '核对通过', 'admin/refunds.html'); }, ENDPOINTS.adminRefunds + '/' + id + '/review', 'POST', {}, body); },
    listAdminWithdrawals: function (p) { return call(function () { return listOf('withdrawals', p, ['id','userId','amount','status','appliedAt']); }, ENDPOINTS.adminWithdrawals, 'GET', p); },
    reviewWithdrawal: function (id, body) { return call(function () { return written(id, (body && body.decision) || '复核通过', 'admin/withdrawals.html'); }, ENDPOINTS.adminWithdrawals + '/' + id + '/review', 'POST', {}, body); },
    listAdminContracts: function (p) { return call(function () { return listOf('contractVersions', p, ['id','contractId','version','clauseZh','at']); }, ENDPOINTS.adminContracts, 'GET', p); },
    listAdminRegulations: function (p) { return call(function () { return listOf('regulations', p, ['id','farmId','dimension','status','at']); }, ENDPOINTS.adminRegulations, 'GET', p); },

    /* POST /upload body:FormData → Promise<{url,width,height}>；前端只做预览，真实上传由后端落 OSS */
    upload: function (file) {
      if (config.useMock) return ok({ url: M.IMG.farm, width: 1280, height: 720 }, 'uploaded').then(function (j) { return j.data; });
      var fd = new FormData(); fd.append('file', file);
      return fetch(config.base + ENDPOINTS.upload, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + config.token }, body: fd
      }).then(function (r) { return r.json(); }).then(function (j) { return j.data; });
    }
  };
  /* ==================================================================
     统一请求层 · 唯一 API 目录（CATALOG）
     ------------------------------------------------------------------
     本文件是全站唯一 API 定义处：页面只调 SF_API.xxx()，不直接读 SF_MOCK。
     目录每条含：域 / HTTP 方法 / 路径 / 关联数据库表 / 参数范围 / 返回范围 /
     流程备注（后台开发者按「流程性说明」顺序对接即可）。
     参数范围由 validate() 真实执行；仿真由 simulate() 逐条跑并给反馈。
     ================================================================== */
  var CATALOG =  [
  {
   "name": "listFarms",
   "domain": "田园域",
   "method": "GET",
   "path": "/farms",
   "tables": [
    "farm_plot",
    "plot_image",
    "plot_season_metric"
   ],
   "summaryZh": "分页查田园档案，可按地区 / 土壤 / 承包类型筛选",
   "summaryEn": "List plot archives with region, soil and lease filters",
   "flowZh": "① 首页「按地区找田」→ 本接口 → ② getFarm 看档案 → ③ 价格挂接 getPriceBreakdown",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "plot_image": [
     "id",
     "plot_id",
     "file_path",
     "caption",
     "sort_no",
     "created_at",
     "updated_at"
    ],
    "plot_season_metric": [
     "id",
     "plot_id",
     "season",
     "avg_temp_c",
     "avg_humidity_pct",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getFarm",
   "domain": "田园域",
   "method": "GET",
   "path": "/farms/{id}",
   "tables": [
    "farm_plot",
    "plot_season_metric",
    "plot_crop_record",
    "plot_facility",
    "plot_image",
    "content_comment"
   ],
   "summaryZh": "按田块编号取完整档案（四季读数、作物、设施、图册、评论）",
   "summaryEn": "Get a full plot archive by plot number",
   "flowZh": "② 列表点田块 → 本接口；不同 id 必须返回不同档案",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "plot_season_metric": [
     "id",
     "plot_id",
     "season",
     "avg_temp_c",
     "avg_humidity_pct",
     "created_at",
     "updated_at"
    ],
    "plot_crop_record": [
     "id",
     "plot_id",
     "kind",
     "crop_name",
     "season_year",
     "yield_kg",
     "receipt_path",
     "created_at",
     "updated_at"
    ],
    "plot_facility": [
     "id",
     "plot_id",
     "kind",
     "name",
     "capacity",
     "price_item_no",
     "bookable",
     "created_at",
     "updated_at"
    ],
    "plot_image": [
     "id",
     "plot_id",
     "file_path",
     "caption",
     "sort_no",
     "created_at",
     "updated_at"
    ],
    "content_comment": [
     "id",
     "user_id",
     "comment_no",
     "target_type",
     "target_no",
     "body",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "saveFarm",
   "domain": "田园域",
   "method": "POST",
   "path": "/farms",
   "tables": [
    "farm_plot",
    "audit_task"
   ],
   "summaryZh": "商家 / 村集体上传田园档案，生成初审任务",
   "summaryEn": "Submit a plot archive and create a level-1 audit task",
   "flowZh": "③ 田园管理「上传档案」→ 本接口 → ④ listAudits / 审核进度页；返回 status=待初审",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {},
     "must": []
    },
    {
     "name": "body",
     "type": "object",
     "fields": {
      "title": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "田园名称"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "所在地区"
      },
      "area": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "面积（亩）"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "土壤类型"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "承包类型"
      },
      "leaseStart": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "租期起"
      },
      "leaseEnd": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "租期止"
      },
      "rent": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "租金（元/季）"
      },
      "deposit": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "押金"
      },
      "price": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "公示单价"
      },
      "currentCrops": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "当前作物"
      },
      "pastCrops": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "历史作物"
      },
      "facilities": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "配套设施"
      },
      "readings": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "四季温湿度读数"
      },
      "descZh": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "中文简介"
      },
      "nameZh": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "中文名"
      },
      "nameEn": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "英文名"
      },
      "photos": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "图集路径（只存路径）"
      },
      "water": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "水源条件"
      },
      "use": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "用途"
      },
      "years": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包年限"
      }
     }
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "payload"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listActivities",
   "domain": "交易域",
   "method": "GET",
   "path": "/activities",
   "tables": [
    "activity_event",
    "plot_facility"
   ],
   "summaryZh": "分页查田园活动与场地档期",
   "summaryEn": "List activities and venue slots",
   "flowZh": "① 活动分享子栏目 → 本接口 → ② getActivity → ③ listActivityRegistrations 报名",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "plot_facility": [
     "id",
     "plot_id",
     "kind",
     "name",
     "capacity",
     "price_item_no",
     "bookable",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getActivity",
   "domain": "交易域",
   "method": "GET",
   "path": "/activities/{id}",
   "tables": [
    "activity_event",
    "activity_version"
   ],
   "summaryZh": "活动详情",
   "summaryEn": "Get an activity detail",
   "flowZh": "② 活动列表点标题 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "activity_version": [
     "id",
     "activity_id",
     "version",
     "change_note",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listProduces",
   "domain": "交易域",
   "method": "GET",
   "path": "/produces",
   "tables": [
    "produce_item",
    "produce_trace"
   ],
   "summaryZh": "分页查农产品与溯源码",
   "summaryEn": "List produce items with trace codes",
   "flowZh": "① 农产品分享 → 本接口 → ② getProduce → ③ 下单走 lease_order",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "produce_item": [
     "id",
     "trace_no",
     "owner_user_id",
     "name",
     "category",
     "unit",
     "price_item_no",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "produce_trace": [
     "id",
     "produce_id",
     "stage",
     "note",
     "receipt_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getProduce",
   "domain": "交易域",
   "method": "GET",
   "path": "/produces/{id}",
   "tables": [
    "produce_item",
    "produce_trace"
   ],
   "summaryZh": "农产品详情与溯源链",
   "summaryEn": "Get produce detail and trace chain",
   "flowZh": "② 列表点农产品 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "produce_item": [
     "id",
     "trace_no",
     "owner_user_id",
     "name",
     "category",
     "unit",
     "price_item_no",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "produce_trace": [
     "id",
     "produce_id",
     "stage",
     "note",
     "receipt_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listVideos",
   "domain": "内容域",
   "method": "GET",
   "path": "/videos",
   "tables": [
    "video_share",
    "attachment"
   ],
   "summaryZh": "首页热点用户视频分享列表",
   "summaryEn": "List shared videos for the home video section",
   "flowZh": "① 首页「热点视频分享」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "video_share": [
     "id",
     "user_id",
     "video_no",
     "title",
     "tag",
     "cover_path",
     "video_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "attachment": [
     "id",
     "attach_no",
     "owner_type",
     "owner_no",
     "file_path",
     "mime",
     "size_bytes",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPromos",
   "domain": "内容域",
   "method": "GET",
   "path": "/promos",
   "tables": [
    "promo_material",
    "attachment"
   ],
   "summaryZh": "首页田园宣发内容列表",
   "summaryEn": "List promotional materials",
   "flowZh": "① 首页「田园宣发内容」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "promo_material": [
     "id",
     "user_id",
     "promo_no",
     "title",
     "channel",
     "body",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "attachment": [
     "id",
     "attach_no",
     "owner_type",
     "owner_no",
     "file_path",
     "mime",
     "size_bytes",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listTopics",
   "domain": "内容域",
   "method": "GET",
   "path": "/forum/topics",
   "tables": [
    "forum_topic"
   ],
   "summaryZh": "论坛文字列表，按版块 / 关键词过滤",
   "summaryEn": "Forum text list filtered by board and keyword",
   "flowZh": "① 论坛频道 → 本接口 → ② getTopic 看帖 → ③ sendChat / 回帖",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getTopic",
   "domain": "内容域",
   "method": "GET",
   "path": "/forum/topics/{id}",
   "tables": [
    "forum_topic",
    "topic_reply",
    "content_comment"
   ],
   "summaryZh": "帖子详情与回复列表",
   "summaryEn": "Get a thread with replies",
   "flowZh": "② 论坛列表点标题 → 本接口；回复数由 topic_reply 聚合",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ],
    "topic_reply": [
     "id",
     "topic_id",
     "author_no",
     "body",
     "status",
     "created_at",
     "updated_at"
    ],
    "content_comment": [
     "id",
     "user_id",
     "comment_no",
     "target_type",
     "target_no",
     "body",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "saveTopic",
   "domain": "内容域",
   "method": "POST",
   "path": "/forum/topics",
   "tables": [
    "forum_topic",
    "audit_task"
   ],
   "summaryZh": "发起新帖，进入内容审核",
   "summaryEn": "Post a new forum thread",
   "flowZh": "③ 论坛「发起新帖」→ 本接口 → ④ 我已发布页",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {},
     "must": []
    },
    {
     "name": "body",
     "type": "object",
     "fields": {
      "board": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "论坛版块"
      },
      "bodyZh": {
       "type": "string",
       "min": 0,
       "max": 1024,
       "zh": "中文正文"
      },
      "bodyEn": {
       "type": "string",
       "min": 0,
       "max": 1024,
       "zh": "英文正文"
      },
      "title": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "帖子标题"
      },
      "name": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "署名"
      }
     }
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "payload"
   ],
   "columns": {
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listExperts",
   "domain": "主体域",
   "method": "GET",
   "path": "/experts",
   "tables": [
    "expert_profile",
    "platform_user"
   ],
   "summaryZh": "专家列表按积分降序",
   "summaryEn": "List experts ordered by points",
   "flowZh": "① 专家频道 → 本接口 → ② getExpert → ③ expertStats / expertCompare",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "expert_profile": [
     "id",
     "user_id",
     "expert_no",
     "title",
     "org",
     "domain",
     "points",
     "cert_path",
     "created_at",
     "updated_at"
    ],
    "platform_user": [
     "id",
     "user_no",
     "role",
     "display_name",
     "phone_hash",
     "email",
     "status",
     "region",
     "avatar_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getExpert",
   "domain": "主体域",
   "method": "GET",
   "path": "/experts/{id}",
   "tables": [
    "expert_profile",
    "planting_record",
    "work_order",
    "forum_topic"
   ],
   "summaryZh": "专家主页：个人田园统计、种植过程、管理历史、技术帖",
   "summaryEn": "Expert profile with plots, growing records and tech posts",
   "flowZh": "② 专家列表点专家 → 本接口；统计数字按各表实时聚合",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "expert_profile": [
     "id",
     "user_id",
     "expert_no",
     "title",
     "org",
     "domain",
     "points",
     "cert_path",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listWorkorders",
   "domain": "工单域",
   "method": "GET",
   "path": "/workorders",
   "tables": [
    "work_order",
    "work_order_item",
    "work_order_flow"
   ],
   "summaryZh": "工单总览（状态徽章 + 第 N/6 步）",
   "summaryEn": "List work orders with status badge and fixed step",
   "flowZh": "① 接单 / 个人频道 → 本接口 → ② getWorkorder → ③ cancelWorkorder / amendWorkorder",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "work_order_item": [
     "id",
     "wo_id",
     "seq",
     "item_key",
     "content",
     "required",
     "created_at",
     "updated_at"
    ],
    "work_order_flow": [
     "id",
     "wo_id",
     "step",
     "status",
     "operator_no",
     "note",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getWorkorder",
   "domain": "工单域",
   "method": "GET",
   "path": "/workorders/{id}",
   "tables": [
    "work_order",
    "work_order_item",
    "work_order_flow",
    "work_order_chat",
    "job_acceptance"
   ],
   "summaryZh": "工单详情：10 条明细、6 步时间线、对话、验收回执",
   "summaryEn": "Work order detail with 10 requirement lines and 6-step timeline",
   "flowZh": "② 列表点工单 → 本接口；验收不过退回「作业中」",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "work_order_item": [
     "id",
     "wo_id",
     "seq",
     "item_key",
     "content",
     "required",
     "created_at",
     "updated_at"
    ],
    "work_order_flow": [
     "id",
     "wo_id",
     "step",
     "status",
     "operator_no",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order_chat": [
     "id",
     "wo_id",
     "sender_no",
     "body",
     "kind",
     "attach_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "job_acceptance": [
     "id",
     "wo_id",
     "result",
     "note",
     "receipt_path",
     "verified_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listDispatches",
   "domain": "工单域",
   "method": "GET",
   "path": "/dispatches",
   "tables": [
    "dispatch_task",
    "work_order"
   ],
   "summaryZh": "接单大厅：当前定位附近单 / 已接单 / 关联田园附近单",
   "summaryEn": "Dispatch tasks by nearby / taken / linked scope",
   "flowZh": "① 接单频道两个分区 → 本接口（scope 不同口径不同数据）→ ② acceptJob",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "dispatch_task": [
     "id",
     "dispatch_no",
     "wo_no",
     "scope",
     "region",
     "distance_km",
     "status",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "acceptJob",
   "domain": "工单域",
   "method": "POST",
   "path": "/dispatches/{id}/accept",
   "tables": [
    "dispatch_task",
    "work_order_flow"
   ],
   "summaryZh": "农户承接工单，推进到「已接单」",
   "summaryEn": "Accept a dispatch task and advance the work order",
   "flowZh": "② 附近单点「承接」→ 本接口 → ③ 工单详情第 2 步",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "workorderId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "assigneeId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      }
     },
     "must": [
      "workorderId",
      "assigneeId"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "workorderId",
    "assigneeId"
   ],
   "columns": {
    "dispatch_task": [
     "id",
     "dispatch_no",
     "wo_no",
     "scope",
     "region",
     "distance_km",
     "status",
     "created_at",
     "updated_at"
    ],
    "work_order_flow": [
     "id",
     "wo_id",
     "step",
     "status",
     "operator_no",
     "note",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listOrders",
   "domain": "交易域",
   "method": "GET",
   "path": "/orders",
   "tables": [
    "lease_order",
    "order_line",
    "payment_record"
   ],
   "summaryZh": "我的订单列表",
   "summaryEn": "List my orders",
   "flowZh": "① 个人「历史消费」→ 本接口 → ② getPriceBreakdown 看金额构成",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ],
    "order_line": [
     "id",
     "order_id",
     "item_no",
     "item_title",
     "qty",
     "unit_price_cents",
     "amount_cents",
     "created_at",
     "updated_at"
    ],
    "payment_record": [
     "id",
     "order_id",
     "pay_no",
     "channel",
     "amount_cents",
     "status",
     "paid_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listUsers",
   "domain": "主体域",
   "method": "GET",
   "path": "/users",
   "tables": [
    "platform_user",
    "user_profile"
   ],
   "summaryZh": "后台用户台账",
   "summaryEn": "Admin user ledger",
   "flowZh": "① 后台侧栏「用户台账」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "platform_user": [
     "id",
     "user_no",
     "role",
     "display_name",
     "phone_hash",
     "email",
     "status",
     "region",
     "avatar_path",
     "created_at",
     "updated_at"
    ],
    "user_profile": [
     "id",
     "user_id",
     "real_name",
     "id_no_hash",
     "intro",
     "contact_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listComments",
   "domain": "内容域",
   "method": "GET",
   "path": "/comments",
   "tables": [
    "content_comment",
    "dict_item"
   ],
   "summaryZh": "后台评论管理列表",
   "summaryEn": "Admin comment moderation list",
   "flowZh": "① 后台侧栏「评论管理」→ 本接口 → ② 隐藏 / 通过走审核",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "content_comment": [
     "id",
     "user_id",
     "comment_no",
     "target_type",
     "target_no",
     "body",
     "status",
     "created_at",
     "updated_at"
    ],
    "dict_item": [
     "id",
     "dict_key",
     "dict_value_zh",
     "dict_value_en",
     "sort_no",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listChats",
   "domain": "工单域",
   "method": "GET",
   "path": "/chats",
   "tables": [
    "work_order_chat",
    "attachment"
   ],
   "summaryZh": "按工单编号取沟通消息",
   "summaryEn": "List chat messages of a work order",
   "flowZh": "① 个人「工单聊天」→ 本接口 → ② sendChat",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [
      "workorderId"
     ],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "T[]",
    "shape": "数组",
    "range": "数组长度 ≥ 0，元素字段见关联表列"
   },
   "sig": [
    "workorderId"
   ],
   "columns": {
    "work_order_chat": [
     "id",
     "wo_id",
     "sender_no",
     "body",
     "kind",
     "attach_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "attachment": [
     "id",
     "attach_no",
     "owner_type",
     "owner_no",
     "file_path",
     "mime",
     "size_bytes",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "sendChat",
   "domain": "工单域",
   "method": "POST",
   "path": "/chats",
   "tables": [
    "work_order_chat",
    "attachment"
   ],
   "summaryZh": "在工单对话框发消息",
   "summaryEn": "Send a chat message in a work order",
   "flowZh": "② 对话框输入 → 本接口 → 消息追加到时间线；图片只传 attach_no",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "workorderId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "bodyZh": {
       "type": "string",
       "min": 1,
       "max": 1024
      },
      "bodyEn": {
       "type": "string",
       "min": 0,
       "max": 1024
      },
      "kind": {
       "type": "enum",
       "values": [
        "text",
        "image"
       ]
      }
     },
     "must": [
      "workorderId",
      "bodyZh"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "payload"
   ],
   "columns": {
    "work_order_chat": [
     "id",
     "wo_id",
     "sender_no",
     "body",
     "kind",
     "attach_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "attachment": [
     "id",
     "attach_no",
     "owner_type",
     "owner_no",
     "file_path",
     "mime",
     "size_bytes",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPlantings",
   "domain": "专家域",
   "method": "GET",
   "path": "/plantings",
   "tables": [
    "planting_record",
    "regulation_advice"
   ],
   "summaryZh": "后台种植信息管理",
   "summaryEn": "Admin planting record ledger",
   "flowZh": "① 后台侧栏「种植信息」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAudits",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/audits",
   "tables": [
    "audit_task",
    "admin_operation_log"
   ],
   "summaryZh": "多级审核工作台列表",
   "summaryEn": "List multi-level audit tasks",
   "flowZh": "① 后台「审核」→ 本接口 → ② stepAudit → ③ 复审 / 终审工作台",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ],
    "admin_operation_log": [
     "id",
     "admin_id",
     "module",
     "action",
     "target_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "stepAudit",
   "domain": "管控域",
   "method": "POST",
   "path": "/admin/audits/{id}/step",
   "tables": [
    "audit_task",
    "admin_operation_log"
   ],
   "summaryZh": "推进一级审核（初审 / 复审 / 终审）",
   "summaryEn": "Advance one audit level",
   "flowZh": "② 审核工作台点「通过并转复审」→ 本接口 → ③ 下一级列表",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      },
      "comment": {
       "type": "string",
       "min": 0,
       "max": 512
      }
     },
     "must": [
      "level",
      "result"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "payload"
   ],
   "columns": {
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ],
    "admin_operation_log": [
     "id",
     "admin_id",
     "module",
     "action",
     "target_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listNotices",
   "domain": "主体域",
   "method": "GET",
   "path": "/notices",
   "tables": [
    "user_notice"
   ],
   "summaryZh": "站内通知列表",
   "summaryEn": "List in-site notices",
   "flowZh": "① 个人「消息通知」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "T[]",
    "shape": "数组",
    "range": "数组长度 ≥ 0，元素字段见关联表列"
   },
   "sig": [],
   "columns": {
    "user_notice": [
     "id",
     "user_id",
     "notice_no",
     "kind",
     "title",
     "body",
     "read_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "search",
   "domain": "检索域",
   "method": "GET",
   "path": "/search",
   "tables": [
    "farm_plot",
    "activity_event",
    "produce_item",
    "forum_topic",
    "work_order",
    "expert_profile"
   ],
   "summaryZh": "跨 6 类数据集按关键词真实过滤",
   "summaryEn": "Search across six datasets with a real keyword filter",
   "flowZh": "① hero 搜索框输入 → 本接口 → ② 点结果进对应详情",
   "args": [
    {
     "name": "q",
     "type": "string",
     "min": 0,
     "max": 64,
     "zh": "关键词"
    },
    {
     "name": "page",
     "type": "int",
     "min": 1,
     "max": 1000,
     "zh": "页码"
    }
   ],
   "returns": {
    "type": "SearchResult",
    "shape": "groups[{key,label,items,total}] / total / page",
    "range": "groups.length = 6；每组 items ≤ 4；total ≥ 0"
   },
   "sig": [
    "q",
    "page"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "produce_item": [
     "id",
     "trace_no",
     "owner_user_id",
     "name",
     "category",
     "unit",
     "price_item_no",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "expert_profile": [
     "id",
     "user_id",
     "expert_no",
     "title",
     "org",
     "domain",
     "points",
     "cert_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "adminLogin",
   "domain": "管控域",
   "method": "POST",
   "path": "/admin/login",
   "tables": [
    "admin_account",
    "admin_operation_log"
   ],
   "summaryZh": "后台独立登录，返回令牌与可见模块",
   "summaryEn": "Admin independent login",
   "flowZh": "① 访问 admin/login.html → 本接口 → ② adminModule 取台账",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "account": {
       "type": "string",
       "min": 3,
       "max": 64
      },
      "passphrase": {
       "type": "string",
       "min": 6,
       "max": 128
      },
      "captcha": {
       "type": "string",
       "min": 0,
       "max": 16
      }
     },
     "must": [
      "account",
      "passphrase"
     ]
    }
   ],
   "returns": {
    "type": "AdminSession",
    "shape": "token / modules[]",
    "range": "token 非空；modules 为后台模块键数组，长度 ≥ 1"
   },
   "sig": [
    "payload"
   ],
   "columns": {
    "admin_account": [
     "id",
     "admin_no",
     "account",
     "pass_hash",
     "role",
     "status",
     "last_login_at",
     "created_at",
     "updated_at"
    ],
    "admin_operation_log": [
     "id",
     "admin_id",
     "module",
     "action",
     "target_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "adminModule",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/modules",
   "tables": [
    "farm_plot",
    "platform_user",
    "work_order",
    "work_order_chat",
    "planting_record",
    "content_comment",
    "audit_task",
    "user_notice",
    "dict_item",
    "platform_config",
    "refund_request",
    "withdrawal_request",
    "contract_doc",
    "regulation_advice",
    "price_book"
   ],
   "summaryZh": "后台统一管控数据（按模块映射表取数）",
   "summaryEn": "Admin module ledger rows",
   "flowZh": "② 后台侧栏任一台账 → 本接口（m = 模块键）→ ③ 行操作写回对应业务表",
   "args": [
    {
     "name": "m",
     "type": "string",
     "min": 1,
     "max": 32,
     "zh": "后台模块键（允许值见后台侧栏：dashboard/farms/users/workorders/chats/planting/comments/audit/system/refunds/withdrawals/contracts/regulations/prices）"
    },
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "AdminModule",
    "shape": "rows[] / columns[] / total / pages",
    "range": "rows.length ≤ 12；columns 为字段名数组；total ≥ 0"
   },
   "sig": [
    "m",
    "p"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "platform_user": [
     "id",
     "user_no",
     "role",
     "display_name",
     "phone_hash",
     "email",
     "status",
     "region",
     "avatar_path",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "work_order_chat": [
     "id",
     "wo_id",
     "sender_no",
     "body",
     "kind",
     "attach_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "content_comment": [
     "id",
     "user_id",
     "comment_no",
     "target_type",
     "target_no",
     "body",
     "status",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ],
    "user_notice": [
     "id",
     "user_id",
     "notice_no",
     "kind",
     "title",
     "body",
     "read_at",
     "created_at",
     "updated_at"
    ],
    "dict_item": [
     "id",
     "dict_key",
     "dict_value_zh",
     "dict_value_en",
     "sort_no",
     "created_at",
     "updated_at"
    ],
    "platform_config": [
     "id",
     "config_key",
     "config_value",
     "updated_at",
     "created_at"
    ],
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ],
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ],
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAny",
   "domain": "检索域",
   "method": "GET",
   "path": "/{dataset}",
   "tables": [
    "farm_plot",
    "activity_event",
    "produce_item",
    "forum_topic",
    "work_order",
    "expert_profile",
    "video_share",
    "promo_material",
    "dispatch_task",
    "lease_order",
    "contract_doc",
    "refund_request",
    "bill_item",
    "fund_entry",
    "withdrawal_request",
    "planting_record",
    "follow_relation",
    "content_like"
   ],
   "summaryZh": "子页体系通用分页接口（含收藏 / 关注 / 支付台账等子页取数）",
   "summaryEn": "Generic paginated dataset reader for sub pages",
   "flowZh": "① 任一子页带 data-ds → 本接口 → ② 点第 N 页真的换一批记录",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [
      "name"
     ],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "produce_item": [
     "id",
     "trace_no",
     "owner_user_id",
     "name",
     "category",
     "unit",
     "price_item_no",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "forum_topic": [
     "id",
     "user_id",
     "topic_no",
     "board",
     "title",
     "body",
     "tags",
     "status",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ],
    "expert_profile": [
     "id",
     "user_id",
     "expert_no",
     "title",
     "org",
     "domain",
     "points",
     "cert_path",
     "created_at",
     "updated_at"
    ],
    "video_share": [
     "id",
     "user_id",
     "video_no",
     "title",
     "tag",
     "cover_path",
     "video_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "promo_material": [
     "id",
     "user_id",
     "promo_no",
     "title",
     "channel",
     "body",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "dispatch_task": [
     "id",
     "dispatch_no",
     "wo_no",
     "scope",
     "region",
     "distance_km",
     "status",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ],
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ],
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "bill_item": [
     "id",
     "bill_no",
     "order_id",
     "period",
     "kind",
     "receivable_cents",
     "service_fee_cents",
     "refunded_cents",
     "net_cents",
     "status",
     "created_at",
     "updated_at"
    ],
    "fund_entry": [
     "id",
     "account_id",
     "entry_no",
     "kind",
     "amount_cents",
     "related_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "follow_relation": [
     "id",
     "user_id",
     "target_type",
     "target_no",
     "kind",
     "created_at",
     "updated_at"
    ],
    "content_like": [
     "id",
     "user_id",
     "target_type",
     "target_no",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getPriceBook",
   "domain": "价格域",
   "method": "GET",
   "path": "/prices",
   "tables": [
    "price_book",
    "price_item",
    "price_change"
   ],
   "summaryZh": "价格公示总账（9 类目 / 38 条价目 / 规则 / 调价历史）",
   "summaryEn": "Get the published price book",
   "flowZh": "① 任一页面价格挂接条 → 本接口 → ② listPriceItems / getPriceBreakdown",
   "args": [],
   "returns": {
    "type": "PriceBook",
    "shape": "version / period / cats[] / items[] / rules[] / changes[] / stats",
    "range": "cats.length = 9；items.length = 38；金额分 ≥ 0；version 非空"
   },
   "sig": [],
   "columns": {
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ],
    "price_item": [
     "id",
     "book_id",
     "item_no",
     "cat",
     "name_zh",
     "name_en",
     "unit",
     "price_cents",
     "scope",
     "status",
     "created_at",
     "updated_at"
    ],
    "price_change": [
     "id",
     "book_id",
     "item_no",
     "before_cents",
     "after_cents",
     "effective_at",
     "notice_days",
     "reason",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPriceItems",
   "domain": "价格域",
   "method": "GET",
   "path": "/prices/items",
   "tables": [
    "price_item",
    "price_book"
   ],
   "summaryZh": "公示价目分页列表，按类目 / 状态过滤",
   "summaryEn": "List published price items",
   "flowZh": "② 价格总览展开 → 本接口 → ③ 点条目看本单构成",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "price_item": [
     "id",
     "book_id",
     "item_no",
     "cat",
     "name_zh",
     "name_en",
     "unit",
     "price_cents",
     "scope",
     "status",
     "created_at",
     "updated_at"
    ],
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPricePlots",
   "domain": "价格域",
   "method": "GET",
   "path": "/prices/plots",
   "tables": [
    "plot_rent_rate",
    "farm_plot",
    "price_book"
   ],
   "summaryZh": "24 块田的租金、押金、服务费、首期应付",
   "summaryEn": "List plot rent breakdowns",
   "flowZh": "① 租金标准页 → 本接口 → ② 回田园档案核对面积",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "plot_rent_rate": [
     "id",
     "plot_no",
     "book_version",
     "rate_cents",
     "season_cents",
     "deposit_cents",
     "fee_cents",
     "total_cents",
     "created_at",
     "updated_at"
    ],
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getPriceBreakdown",
   "domain": "价格域",
   "method": "GET",
   "path": "/prices/breakdown",
   "tables": [
    "price_item",
    "plot_rent_rate",
    "lease_order"
   ],
   "summaryZh": "按数据集与记录 id 取「本单价格构成」",
   "summaryEn": "Get the price breakdown of one business record",
   "flowZh": "② 详情页 ?id= → 本接口 → 显示逐行金额与合计",
   "args": [
    {
     "name": "ds",
     "type": "enum",
     "values": [
      "farms",
      "activities",
      "produces",
      "workorders",
      "experts",
      "orders"
     ],
     "zh": "数据集键"
    },
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "PriceBreakdown",
    "shape": "ds / id / lines[{labelZh,labelEn,amountZh,amountEn,noteZh,noteEn}] / totalCents",
    "range": "lines.length ≥ 1；totalCents ≥ 0；金额一律分"
   },
   "sig": [
    "ds",
    "id"
   ],
   "columns": {
    "price_item": [
     "id",
     "book_id",
     "item_no",
     "cat",
     "name_zh",
     "name_en",
     "unit",
     "price_cents",
     "scope",
     "status",
     "created_at",
     "updated_at"
    ],
    "plot_rent_rate": [
     "id",
     "plot_no",
     "book_version",
     "rate_cents",
     "season_cents",
     "deposit_cents",
     "fee_cents",
     "total_cents",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "calcPrice",
   "domain": "价格域",
   "method": "POST",
   "path": "/prices/calc",
   "tables": [
    "plot_rent_rate",
    "price_item",
    "farm_plot"
   ],
   "summaryZh": "租金试算（不落库、不创建订单）",
   "summaryEn": "Calculate rent without persisting",
   "flowZh": "① 租金试算器填面积 / 季数 / 承包类型 → 本接口 → ② 展示 4 行金额与首期应付",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "farmId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "areaMu": {
       "type": "number",
       "min": 0.1,
       "max": 1000,
       "zh": "面积（亩）"
      },
      "seasons": {
       "type": "int",
       "min": 1,
       "max": 8,
       "zh": "季数"
      },
      "leaseType": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "承包类型"
      }
     },
     "must": [
      "farmId"
     ]
    }
   ],
   "returns": {
    "type": "PriceBreakdown",
    "shape": "同上",
    "range": "试算结果不写库；totalCents 由单价 × 面积 × 季数实时算"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "plot_rent_rate": [
     "id",
     "plot_no",
     "book_version",
     "rate_cents",
     "season_cents",
     "deposit_cents",
     "fee_cents",
     "total_cents",
     "created_at",
     "updated_at"
    ],
    "price_item": [
     "id",
     "book_id",
     "item_no",
     "cat",
     "name_zh",
     "name_en",
     "unit",
     "price_cents",
     "scope",
     "status",
     "created_at",
     "updated_at"
    ],
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPriceChanges",
   "domain": "价格域",
   "method": "GET",
   "path": "/prices/changes",
   "tables": [
    "price_change",
    "price_book"
   ],
   "summaryZh": "调价公示历史",
   "summaryEn": "List published price changes",
   "flowZh": "① 价格公示「调价历史」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "price_change": [
     "id",
     "book_id",
     "item_no",
     "before_cents",
     "after_cents",
     "effective_at",
     "notice_days",
     "reason",
     "created_at",
     "updated_at"
    ],
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "publishPrices",
   "domain": "价格域",
   "method": "POST",
   "path": "/admin/prices/publish",
   "tables": [
    "price_book",
    "price_publish_task",
    "audit_task"
   ],
   "summaryZh": "后台发布新价格版本，进入多级审核队列",
   "summaryEn": "Publish a price version into the review queue",
   "flowZh": "① 后台价格管理「发布」→ 本接口 → ② listPriceAudits → ③ 三级审核",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "version": {
       "type": "string",
       "min": 1,
       "max": 24
      },
      "effectiveAt": {
       "type": "string",
       "min": 8,
       "max": 24
      },
      "note": {
       "type": "string",
       "min": 0,
       "max": 512
      },
      "lines": {
       "type": "array",
       "min": 1,
       "max": 200
      }
     },
     "must": [
      "version",
      "lines"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "price_book": [
     "id",
     "version",
     "period_from",
     "period_to",
     "status",
     "published_at",
     "created_at",
     "updated_at"
    ],
    "price_publish_task": [
     "id",
     "book_id",
     "task_no",
     "audit_level",
     "status",
     "submitted_by",
     "note",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPriceAudits",
   "domain": "价格域",
   "method": "GET",
   "path": "/admin/prices/audit",
   "tables": [
    "price_publish_task",
    "audit_task"
   ],
   "summaryZh": "价格发布审核工作台",
   "summaryEn": "List price publish review tasks",
   "flowZh": "② 发布后 → 本接口 → ③ 逐级审核",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "price_publish_task": [
     "id",
     "book_id",
     "task_no",
     "audit_level",
     "status",
     "submitted_by",
     "note",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listJobChanges",
   "domain": "工单域",
   "method": "GET",
   "path": "/workorders/changes",
   "tables": [
    "work_order_change",
    "work_order"
   ],
   "summaryZh": "工单取消 / 修订 / 重发变更记录",
   "summaryEn": "List work order change records",
   "flowZh": "① 工单详情「变更记录」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "work_order_change": [
     "id",
     "wo_id",
     "kind",
     "from_status",
     "to_status",
     "reason",
     "amount_impact_cents",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "cancelWorkorder",
   "domain": "工单域",
   "method": "POST",
   "path": "/workorders/{id}/cancel",
   "tables": [
    "work_order_change",
    "work_order_flow",
    "refund_request"
   ],
   "summaryZh": "取消工单（仅待接单 / 已接单可取消）",
   "summaryEn": "Cancel a work order",
   "flowZh": "① 工单详情「取消」→ 本接口 → ② applyRefund 申请退款",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "reason": {
       "type": "string",
       "min": 1,
       "max": 64
      },
      "detail": {
       "type": "string",
       "min": 0,
       "max": 512
      }
     },
     "must": [
      "reason"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "work_order_change": [
     "id",
     "wo_id",
     "kind",
     "from_status",
     "to_status",
     "reason",
     "amount_impact_cents",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order_flow": [
     "id",
     "wo_id",
     "step",
     "status",
     "operator_no",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "amendWorkorder",
   "domain": "工单域",
   "method": "POST",
   "path": "/workorders/{id}/amend",
   "tables": [
    "work_order_change",
    "work_order_item"
   ],
   "summaryZh": "修改工单明细需求后重新待接单",
   "summaryEn": "Amend work order requirements",
   "flowZh": "① 工单详情「修改」→ 本接口 → ② 变更记录页",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "scope": {
       "type": "string",
       "min": 1,
       "max": 512
      },
      "window": {
       "type": "string",
       "min": 0,
       "max": 128
      },
      "acceptance": {
       "type": "string",
       "min": 1,
       "max": 512
      }
     },
     "must": [
      "scope",
      "acceptance"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "work_order_change": [
     "id",
     "wo_id",
     "kind",
     "from_status",
     "to_status",
     "reason",
     "amount_impact_cents",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order_item": [
     "id",
     "wo_id",
     "seq",
     "item_key",
     "content",
     "required",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "reissueWorkorder",
   "domain": "工单域",
   "method": "POST",
   "path": "/workorders/{id}/reissue",
   "tables": [
    "work_order_change",
    "work_order"
   ],
   "summaryZh": "新建工单（无原单号时）或按原单重新发起；页面表单字段与本接口一一对应",
   "summaryEn": "Reissue a new work order for the same plot",
   "flowZh": "① 个人田园「远程创建工单」/ 按田建单页逐项填写 → 本接口（原单号为空即新建） → ② listWorkorders / getWorkorder 看状态 → ③ acceptJob 承接 → ④ cancelWorkorder / amendWorkorder / applyRefund 售后",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "farmId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "type": {
       "type": "string",
       "min": 1,
       "max": 32
      },
      "scope": {
       "type": "string",
       "min": 1,
       "max": 512
      },
      "priority": {
       "type": "enum",
       "values": [
        "常规",
        "优先",
        "紧急"
       ],
       "zh": "优先级，与页面下拉一致"
      },
      "qualification": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "承接资质要求（页面下拉二选一）"
      },
      "settle": {
       "type": "enum",
       "values": [
        "验收通过后平台结算",
        "按阶段结算",
        "月度汇总结算"
       ],
       "zh": "结算方式，与页面下拉一致"
      },
      "budget": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "预算（元），提交前按价格公示复算"
      },
      "safety": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "安全与注意事项"
      },
      "materials": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "物料与用量"
      },
      "acceptance": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "验收标准"
      },
      "window": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "作业时间窗"
      },
      "due": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "期望完成日期"
      },
      "note": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "备注与变更约定"
      },
      "plotNo": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "挂靠田园编号（软引用 farm_plot.plot_no）"
      },
      "photo": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "回执照片路径（只存路径）"
      }
     },
     "must": [
      "farmId",
      "type"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "work_order_change": [
     "id",
     "wo_id",
     "kind",
     "from_status",
     "to_status",
     "reason",
     "amount_impact_cents",
     "at",
     "created_at",
     "updated_at"
    ],
    "work_order": [
     "id",
     "wo_no",
     "creator_user_id",
     "type",
     "plot_no",
     "assignee_no",
     "status",
     "price_item_no",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listRefunds",
   "domain": "交易域",
   "method": "GET",
   "path": "/refunds",
   "tables": [
    "refund_request",
    "refund_flow",
    "lease_order"
   ],
   "summaryZh": "退款申请列表",
   "summaryEn": "List refund requests",
   "flowZh": "② 取消工单后 → 本接口 → ③ getRefund 看 4 步时间线",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "refund_flow": [
     "id",
     "refund_id",
     "step",
     "status",
     "operator_no",
     "note",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getRefund",
   "domain": "交易域",
   "method": "GET",
   "path": "/refunds/{id}",
   "tables": [
    "refund_request",
    "refund_flow"
   ],
   "summaryZh": "退款详情与 4 步流程",
   "summaryEn": "Get a refund with its 4-step timeline",
   "flowZh": "③ 列表点退款单 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "refund_flow": [
     "id",
     "refund_id",
     "step",
     "status",
     "operator_no",
     "note",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "applyRefund",
   "domain": "交易域",
   "method": "POST",
   "path": "/refunds",
   "tables": [
    "refund_request",
    "refund_flow"
   ],
   "summaryZh": "发起退款申请",
   "summaryEn": "Apply for a refund",
   "flowZh": "② 取消成功页「申请退款」→ 本接口 → ③ 退款状态页",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "orderId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "workorderId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "reason": {
       "type": "string",
       "min": 1,
       "max": 128
      },
      "method": {
       "type": "enum",
       "values": [
        "原支付渠道",
        "平台余额",
        "平台担保支付",
        "村集体统一结算",
        "线下转账",
        "original",
        "balance",
        "bank"
       ],
       "zh": "退款去向：页面中文展示值与后端机器码等价，后端归一 original / balance / bank"
      },
      "amount": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "金额（元），提交前换算为 amountCents（分）"
      },
      "payer": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "付款方"
      },
      "repeat": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "重复口令确认，仅前端校验"
      },
      "confirm": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "二次确认标记，仅前端"
      }
     },
     "must": [
      "reason",
      "method"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "refund_flow": [
     "id",
     "refund_id",
     "step",
     "status",
     "operator_no",
     "note",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listContracts",
   "domain": "交易域",
   "method": "GET",
   "path": "/contracts",
   "tables": [
    "contract_doc",
    "contract_clause",
    "lease_order"
   ],
   "summaryZh": "租赁合同列表",
   "summaryEn": "List lease contracts",
   "flowZh": "① 商家「合同管理」→ 本接口 → ② getContract / listContractVersions",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ],
    "contract_clause": [
     "id",
     "contract_id",
     "seq",
     "body_zh",
     "body_en",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getContract",
   "domain": "交易域",
   "method": "GET",
   "path": "/contracts/{id}",
   "tables": [
    "contract_doc",
    "contract_clause"
   ],
   "summaryZh": "合同详情与条款",
   "summaryEn": "Get a contract with clauses",
   "flowZh": "② 列表点合同 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ],
    "contract_clause": [
     "id",
     "contract_id",
     "seq",
     "body_zh",
     "body_en",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listContractVersions",
   "domain": "交易域",
   "method": "GET",
   "path": "/contracts/{id}/versions",
   "tables": [
    "contract_version",
    "contract_doc"
   ],
   "summaryZh": "合同版本逐条对照",
   "summaryEn": "List contract versions",
   "flowZh": "② 合同详情「版本记录」→ 本接口 → ③ saveContract 提交变更",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "id",
    "p"
   ],
   "columns": {
    "contract_version": [
     "id",
     "contract_id",
     "from_version",
     "to_version",
     "change_note",
     "operator_no",
     "created_at",
     "updated_at"
    ],
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "saveContract",
   "domain": "交易域",
   "method": "POST",
   "path": "/contracts",
   "tables": [
    "contract_doc",
    "contract_version",
    "contract_clause"
   ],
   "summaryZh": "修改租赁合同内容并提交变更审核",
   "summaryEn": "Save a contract revision",
   "flowZh": "③ 合同编辑页 → 本接口 → ④ 版本对照页（status=变更审核中）",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "contractId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "reason": {
       "type": "string",
       "min": 1,
       "max": 512
      },
      "clauses": {
       "type": "array",
       "min": 1,
       "max": 60
      },
      "copyFrom": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "复制自哪版合同编号"
      },
      "effective": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生效日期"
      },
      "remark": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "修订备注"
      },
      "dispute": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "争议处理约定"
      }
     },
     "must": [
      "reason",
      "clauses"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ],
    "contract_version": [
     "id",
     "contract_id",
     "from_version",
     "to_version",
     "change_note",
     "operator_no",
     "created_at",
     "updated_at"
    ],
    "contract_clause": [
     "id",
     "contract_id",
     "seq",
     "body_zh",
     "body_en",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listBills",
   "domain": "交易域",
   "method": "GET",
   "path": "/bills",
   "tables": [
    "bill_item",
    "lease_order"
   ],
   "summaryZh": "账单明细（应收 / 服务费 / 已退 / 净额）",
   "summaryEn": "List bill items",
   "flowZh": "① 商家「对账查看」→ 本接口 → ② listReconciliations 汇总",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "bill_item": [
     "id",
     "bill_no",
     "order_id",
     "period",
     "kind",
     "receivable_cents",
     "service_fee_cents",
     "refunded_cents",
     "net_cents",
     "status",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listReconciliations",
   "domain": "交易域",
   "method": "GET",
   "path": "/reconciliations",
   "tables": [
    "reconciliation",
    "bill_item"
   ],
   "summaryZh": "对账单列表",
   "summaryEn": "List reconciliation statements",
   "flowZh": "② 账单页点账期 → 本接口 → ③ getReconciliation 看明细",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "reconciliation": [
     "id",
     "recon_no",
     "period",
     "subject_no",
     "total_cents",
     "status",
     "checked_at",
     "created_at",
     "updated_at"
    ],
    "bill_item": [
     "id",
     "bill_no",
     "order_id",
     "period",
     "kind",
     "receivable_cents",
     "service_fee_cents",
     "refunded_cents",
     "net_cents",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getReconciliation",
   "domain": "交易域",
   "method": "GET",
   "path": "/reconciliations/{id}",
   "tables": [
    "reconciliation",
    "bill_item"
   ],
   "summaryZh": "对账单详情与当期账单明细",
   "summaryEn": "Get a reconciliation with its bill lines",
   "flowZh": "③ 列表点对账单 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "reconciliation": [
     "id",
     "recon_no",
     "period",
     "subject_no",
     "total_cents",
     "status",
     "checked_at",
     "created_at",
     "updated_at"
    ],
    "bill_item": [
     "id",
     "bill_no",
     "order_id",
     "period",
     "kind",
     "receivable_cents",
     "service_fee_cents",
     "refunded_cents",
     "net_cents",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listFunds",
   "domain": "资金域",
   "method": "GET",
   "path": "/funds",
   "tables": [
    "fund_entry",
    "fund_account"
   ],
   "summaryZh": "农户资金流水",
   "summaryEn": "List fund entries",
   "flowZh": "① 农户「我的资金」→ 本接口 → ② withdrawFunds 提取资金",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "fund_entry": [
     "id",
     "account_id",
     "entry_no",
     "kind",
     "amount_cents",
     "related_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "fund_account": [
     "id",
     "account_no",
     "user_id",
     "balance_cents",
     "frozen_cents",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listWithdrawals",
   "domain": "资金域",
   "method": "GET",
   "path": "/withdrawals",
   "tables": [
    "withdrawal_request",
    "withdrawal_flow"
   ],
   "summaryZh": "提现申请列表",
   "summaryEn": "List withdrawal requests",
   "flowZh": "② 提现后 → 本接口 → ③ getWithdrawal 看 4 步时间线",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_flow": [
     "id",
     "wd_id",
     "step",
     "status",
     "operator_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getWithdrawal",
   "domain": "资金域",
   "method": "GET",
   "path": "/withdrawals/{id}",
   "tables": [
    "withdrawal_request",
    "withdrawal_flow"
   ],
   "summaryZh": "提现详情与流程",
   "summaryEn": "Get a withdrawal with its timeline",
   "flowZh": "③ 列表点提现单 → 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_flow": [
     "id",
     "wd_id",
     "step",
     "status",
     "operator_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "withdrawFunds",
   "domain": "资金域",
   "method": "POST",
   "path": "/withdrawals",
   "tables": [
    "withdrawal_request",
    "withdrawal_flow",
    "fund_account",
    "fund_entry"
   ],
   "summaryZh": "农户提取资金（金额必须 >0 且 ≤ 可用余额）",
   "summaryEn": "Withdraw funds with balance validation",
   "flowZh": "② 资金页「提取资金」→ 本接口 → ③ 提现状态页；超额由 API 拒绝",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "amountCents": {
       "type": "int",
       "min": 1,
       "max": 100000000,
       "zh": "提现金额（分）"
      },
      "bank": {
       "type": "string",
       "min": 1,
       "max": 64
      },
      "userId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      }
     },
     "must": [
      "amountCents",
      "bank"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_flow": [
     "id",
     "wd_id",
     "step",
     "status",
     "operator_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "fund_account": [
     "id",
     "account_no",
     "user_id",
     "balance_cents",
     "frozen_cents",
     "status",
     "created_at",
     "updated_at"
    ],
    "fund_entry": [
     "id",
     "account_id",
     "entry_no",
     "kind",
     "amount_cents",
     "related_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listActivityVersions",
   "domain": "交易域",
   "method": "GET",
   "path": "/activities/{id}/versions",
   "tables": [
    "activity_version",
    "activity_event"
   ],
   "summaryZh": "活动更新版本记录",
   "summaryEn": "List activity versions",
   "flowZh": "① 商家「更新活动」→ 本接口 → ② updateActivity 提交新版本",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "id",
    "p"
   ],
   "columns": {
    "activity_version": [
     "id",
     "activity_id",
     "version",
     "change_note",
     "status",
     "created_at",
     "updated_at"
    ],
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listActivityRegistrations",
   "domain": "交易域",
   "method": "GET",
   "path": "/activities/{id}/registrations",
   "tables": [
    "activity_registration",
    "lease_order"
   ],
   "summaryZh": "活动报名名单",
   "summaryEn": "List activity registrations",
   "flowZh": "① 活动详情「报名」→ 本接口",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "id",
    "p"
   ],
   "columns": {
    "activity_registration": [
     "id",
     "activity_id",
     "attendee_no",
     "order_no",
     "status",
     "created_at",
     "updated_at"
    ],
    "lease_order": [
     "id",
     "order_no",
     "user_id",
     "kind",
     "ref_no",
     "amount_cents",
     "status",
     "placed_at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "publishActivity",
   "domain": "交易域",
   "method": "POST",
   "path": "/activities",
   "tables": [
    "activity_event",
    "activity_version",
    "price_item"
   ],
   "summaryZh": "商家发布活动",
   "summaryEn": "Publish an activity",
   "flowZh": "① 商家「发布活动」→ 本接口 → ② 活动管理页",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "title": {
       "type": "string",
       "min": 1,
       "max": 128
      },
      "kind": {
       "type": "string",
       "min": 1,
       "max": 32
      },
      "farmId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "date": {
       "type": "string",
       "min": 8,
       "max": 24
      },
      "capacity": {
       "type": "int",
       "min": 1,
       "max": 10000
      },
      "slot": {
       "type": "enum",
       "values": [
        "全天",
        "半天",
        "过夜"
       ],
       "zh": "活动时段，与页面下拉一致"
      },
      "guests": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "预计人数"
      },
      "price": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "活动价目"
      },
      "descZh": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "活动简介"
      },
      "content": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "活动详情"
      },
      "photos": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "活动图集路径（只存路径）"
      },
      "field": {
       "type": "enum",
       "values": [
        "土壤与施肥",
        "病虫害防治",
        "育种与育苗",
        "采后与溯源"
       ],
       "zh": "专家领域，与页面下拉一致"
      },
      "address": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "场地地址"
      },
      "contact": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "联系方式"
      },
      "phone": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "联系电话"
      },
      "org": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "主办村集体 / 商家"
      },
      "team": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "服务团队"
      }
     },
     "must": [
      "title",
      "kind"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "activity_version": [
     "id",
     "activity_id",
     "version",
     "change_note",
     "status",
     "created_at",
     "updated_at"
    ],
    "price_item": [
     "id",
     "book_id",
     "item_no",
     "cat",
     "name_zh",
     "name_en",
     "unit",
     "price_cents",
     "scope",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "updateActivity",
   "domain": "交易域",
   "method": "POST",
   "path": "/activities/{id}",
   "tables": [
    "activity_event",
    "activity_version"
   ],
   "summaryZh": "商家更新活动内容并留版本",
   "summaryEn": "Update an activity with a new version",
   "flowZh": "② 活动编辑页 → 本接口 → ③ 版本记录页",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "title": {
       "type": "string",
       "min": 1,
       "max": 128
      },
      "content": {
       "type": "string",
       "min": 0,
       "max": 4096
      },
      "slot": {
       "type": "enum",
       "values": [
        "全天",
        "半天",
        "过夜"
       ],
       "zh": "活动时段，与页面下拉一致"
      },
      "guests": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "预计人数"
      },
      "price": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "活动价目"
      },
      "descZh": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "活动简介"
      },
      "photos": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "活动图集路径（只存路径）"
      },
      "field": {
       "type": "enum",
       "values": [
        "土壤与施肥",
        "病虫害防治",
        "育种与育苗",
        "采后与溯源"
       ],
       "zh": "专家领域，与页面下拉一致"
      },
      "address": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "场地地址"
      },
      "contact": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "联系方式"
      },
      "phone": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "联系电话"
      },
      "org": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "主办村集体 / 商家"
      },
      "team": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "服务团队"
      }
     },
     "must": [
      "title"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "activity_event": [
     "id",
     "activity_no",
     "owner_user_id",
     "title",
     "kind",
     "plot_no",
     "start_at",
     "capacity",
     "price_item_no",
     "content",
     "cover_path",
     "status",
     "created_at",
     "updated_at"
    ],
    "activity_version": [
     "id",
     "activity_id",
     "version",
     "change_note",
     "status",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "expertStats",
   "domain": "专家域",
   "method": "GET",
   "path": "/expert/stats",
   "tables": [
    "planting_record",
    "regulation_advice"
   ],
   "summaryZh": "专家多维统计（按作物 / 田块 / 阶段分组重算均值）",
   "summaryEn": "Expert multi-dimension statistics",
   "flowZh": "① 专家工作台「多维统计」→ 本接口（dim 切换必须重算）→ ② expertCompare",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      },
      "dim": {
       "type": "enum",
       "values": [
        "crop",
        "farm",
        "stage",
        "dimension"
       ]
      },
      "plot": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "对比/筛选的田园编号，可多选取首块"
      },
      "field": {
       "type": "enum",
       "values": [
        "土壤与施肥",
        "病虫害防治",
        "育种与育苗",
        "采后与溯源"
       ],
       "zh": "专家领域，归一到 dimension"
      },
      "table": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计表名（前端标识，按白名单映射）"
      },
      "h1": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "表头列 1（前端展示字段）"
      },
      "h2": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "表头列 2"
      },
      "t1": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "对比列 1"
      },
      "t2": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "对比列 2"
      },
      "t3": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "对比列 3"
      },
      "t4": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "对比列 4"
      },
      "new": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "变更后值"
      },
      "old": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "变更前值"
      },
      "msg": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "对话/备注内容"
      },
      "message": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "留言内容"
      },
      "job": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联工单号"
      },
      "jobId": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联工单号别名"
      },
      "activity": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联活动编号"
      },
      "activityId": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联活动编号别名"
      },
      "produce": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联农产品编号"
      },
      "farm": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "关联田园编号别名"
      },
      "farm-switch": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "田园下拉选中值 → farmId"
      },
      "count": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "数量（前端汇总，服务端按明细复算）"
      },
      "qty": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "数量（组装进 lines / items）"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "ExpertStats",
    "shape": "dimension / groups[{key,count,avgReadings,avgYield}] / total",
    "range": "groups.length ≥ 1；count ≥ 0；均值 ≥ 0"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "expertCompare",
   "domain": "专家域",
   "method": "GET",
   "path": "/expert/compare",
   "tables": [
    "planting_record",
    "farm_plot",
    "plot_season_metric"
   ],
   "summaryZh": "专家数据对比：相同项合并、不同项高亮",
   "summaryEn": "Expert plot comparison with identical rows collapsed",
   "flowZh": "② 统计页「对比」→ 本接口（ids 最多 3 块）→ ③ saveRegulation 调控",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 1,
       "max": 96
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "ExpertCompare",
    "shape": "picks[] / same[] / diff[] / highlightCount",
    "range": "picks.length ≤ 3；diff 行必须高亮；相同项跨列缩成一行"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "farm_plot": [
     "id",
     "plot_no",
     "owner_user_id",
     "title",
     "region",
     "area_mu",
     "soil_type",
     "lease_type",
     "lease_start",
     "lease_end",
     "status",
     "cover_path",
     "created_at",
     "updated_at"
    ],
    "plot_season_metric": [
     "id",
     "plot_id",
     "season",
     "avg_temp_c",
     "avg_humidity_pct",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listPlantRecords",
   "domain": "专家域",
   "method": "GET",
   "path": "/expert/plant-records",
   "tables": [
    "planting_record",
    "plot_crop_record"
   ],
   "summaryZh": "种植记录查询（按作物 / 阶段筛选真的改变条数）",
   "summaryEn": "Query planting records",
   "flowZh": "① 专家「种植记录查询」→ 本接口 → ② getPlantRecord 看本阶段读数",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "plot_crop_record": [
     "id",
     "plot_id",
     "kind",
     "crop_name",
     "season_year",
     "yield_kg",
     "receipt_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "getPlantRecord",
   "domain": "专家域",
   "method": "GET",
   "path": "/expert/plant-records/{id}",
   "tables": [
    "planting_record",
    "regulation_advice"
   ],
   "summaryZh": "种植记录详情与读数回执",
   "summaryEn": "Get a planting record detail",
   "flowZh": "② 列表点记录 → 本接口；不同 id 读数不同",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    }
   ],
   "returns": {
    "type": "T",
    "shape": "单条记录对象，字段见关联表列",
    "range": "编号 1..32 位；金额分 ≥ 0；面积 0..100000 亩；时间 ISO 8601"
   },
   "sig": [
    "id"
   ],
   "columns": {
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ],
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listRegulations",
   "domain": "专家域",
   "method": "GET",
   "path": "/expert/regulations",
   "tables": [
    "regulation_advice",
    "planting_record"
   ],
   "summaryZh": "调控记录台账（维度 / 动作 / 状态 / 复核结论）",
   "summaryEn": "List control advice records",
   "flowZh": "③ 调控提交后 → 本接口 → ④ 后台 listAdminRegulations",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "saveRegulation",
   "domain": "专家域",
   "method": "POST",
   "path": "/expert/regulations",
   "tables": [
    "regulation_advice",
    "planting_record"
   ],
   "summaryZh": "提交调控建议，状态为「待执行」",
   "summaryEn": "Submit a control advice",
   "flowZh": "③ 对比页「调控」→ 本接口 → ④ 调控记录页",
   "args": [
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "recordId": {
       "type": "code",
       "zh": "业务自然编号，1..32 位字母数字下划线连字符"
      },
      "dimension": {
       "type": "string",
       "min": 1,
       "max": 32
      },
      "before": {
       "type": "string",
       "min": 1,
       "max": 64
      },
      "target": {
       "type": "string",
       "min": 1,
       "max": 64
      },
      "action": {
       "type": "string",
       "min": 1,
       "max": 512
      },
      "advice": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "技术建议"
      },
      "conclusion": {
       "type": "string",
       "min": 0,
       "max": 512,
       "zh": "技术结论"
      },
      "basis": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "数据依据"
      },
      "actual": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "实测读数"
      },
      "estimate": {
       "type": "string",
       "min": 0,
       "max": 128,
       "zh": "估算值"
      },
      "readings": {
       "type": "string",
       "min": 0,
       "max": 256,
       "zh": "多维读数"
      }
     },
     "must": [
      "dimension",
      "action"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "body"
   ],
   "columns": {
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAdminRefunds",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/refunds",
   "tables": [
    "refund_request",
    "audit_task"
   ],
   "summaryZh": "后台退款审核台账",
   "summaryEn": "Admin refund ledger",
   "flowZh": "① 后台侧栏「退款审核」→ 本接口 → ② reviewRefund",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "audit_task": [
     "id",
     "audit_no",
     "target_type",
     "target_no",
     "level",
     "result",
     "operator_no",
     "comment",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "reviewRefund",
   "domain": "管控域",
   "method": "POST",
   "path": "/admin/refunds/{id}/review",
   "tables": [
    "refund_request",
    "refund_flow",
    "admin_operation_log"
   ],
   "summaryZh": "后台核对 / 驳回退款",
   "summaryEn": "Review a refund request",
   "flowZh": "② 退款台账点「核对」→ 本接口 → ③ 退款流程追加节点",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "decision": {
       "type": "enum",
       "values": [
        "核对通过",
        "已驳回",
        "转复审",
        "待补材料",
        "复核通过",
        "驳回"
       ],
       "zh": "管控结论：页面中文值与机器码等价；转复审进入 stepAudit 下一级，驳回写回台账；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      },
      "note": {
       "type": "string",
       "min": 0,
       "max": 512
      }
     },
     "must": [
      "decision"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "refund_request": [
     "id",
     "refund_no",
     "order_id",
     "amount_paid_cents",
     "used_amount_cents",
     "refund_amount_cents",
     "reason_code",
     "method",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "refund_flow": [
     "id",
     "refund_id",
     "step",
     "status",
     "operator_no",
     "note",
     "created_at",
     "updated_at"
    ],
    "admin_operation_log": [
     "id",
     "admin_id",
     "module",
     "action",
     "target_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAdminWithdrawals",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/withdrawals",
   "tables": [
    "withdrawal_request",
    "withdrawal_flow"
   ],
   "summaryZh": "后台提现复核台账",
   "summaryEn": "Admin withdrawal ledger",
   "flowZh": "① 后台侧栏「提现复核」→ 本接口 → ② reviewWithdrawal",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_flow": [
     "id",
     "wd_id",
     "step",
     "status",
     "operator_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "reviewWithdrawal",
   "domain": "管控域",
   "method": "POST",
   "path": "/admin/withdrawals/{id}/review",
   "tables": [
    "withdrawal_request",
    "withdrawal_flow",
    "admin_operation_log"
   ],
   "summaryZh": "后台复核提现",
   "summaryEn": "Review a withdrawal request",
   "flowZh": "② 提现台账点「复核」→ 本接口 → ③ 提现流程追加节点",
   "args": [
    {
     "name": "id",
     "type": "code",
     "zh": "业务自然编号，1..32 位字母数字下划线连字符"
    },
    {
     "name": "body",
     "type": "object",
     "min": 0,
     "max": 40,
     "zh": "请求体对象，字段按目录说明",
     "fields": {
      "decision": {
       "type": "enum",
       "values": [
        "核对通过",
        "已驳回",
        "转复审",
        "待补材料",
        "复核通过",
        "驳回"
       ],
       "zh": "管控结论：页面中文值与机器码等价；转复审进入 stepAudit 下一级，驳回写回台账；【安全】服务端从会话注入，忽略前端传值，useMock=false 时前端携带即 403",
       "source": "session"
      },
      "note": {
       "type": "string",
       "min": 0,
       "max": 512
      }
     },
     "must": [
      "decision"
     ]
    }
   ],
   "returns": {
    "type": "WriteResult",
    "shape": "id / status / next / changedAt",
    "range": "status 为枚举；next 必须是站内 .html 页面；changedAt ISO 8601"
   },
   "sig": [
    "id",
    "body"
   ],
   "columns": {
    "withdrawal_request": [
     "id",
     "wd_no",
     "account_id",
     "amount_cents",
     "bank_no",
     "status",
     "applied_at",
     "created_at",
     "updated_at"
    ],
    "withdrawal_flow": [
     "id",
     "wd_id",
     "step",
     "status",
     "operator_no",
     "at",
     "created_at",
     "updated_at"
    ],
    "admin_operation_log": [
     "id",
     "admin_id",
     "module",
     "action",
     "target_no",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAdminContracts",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/contracts",
   "tables": [
    "contract_version",
    "contract_doc"
   ],
   "summaryZh": "后台合同版本台账",
   "summaryEn": "Admin contract version ledger",
   "flowZh": "① 后台侧栏「合同台账」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "contract_version": [
     "id",
     "contract_id",
     "from_version",
     "to_version",
     "change_note",
     "operator_no",
     "created_at",
     "updated_at"
    ],
    "contract_doc": [
     "id",
     "contract_no",
     "order_id",
     "version",
     "status",
     "signed_at",
     "scan_path",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "listAdminRegulations",
   "domain": "管控域",
   "method": "GET",
   "path": "/admin/regulations",
   "tables": [
    "regulation_advice",
    "planting_record"
   ],
   "summaryZh": "后台调控记录台账",
   "summaryEn": "Admin control advice ledger",
   "flowZh": "① 后台侧栏「调控记录」→ 本接口",
   "args": [
    {
     "name": "p",
     "type": "object",
     "fields": {
      "page": {
       "type": "int",
       "min": 1,
       "max": 1000,
       "zh": "页码，从 1 起"
      },
      "pageSize": {
       "type": "int",
       "min": 1,
       "max": 50,
       "zh": "每页条数"
      },
      "q": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "关键词，可空"
      },
      "lang": {
       "type": "enum",
       "values": [
        "zh",
        "en"
       ],
       "zh": "语言"
      },
      "status": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "状态筛选"
      },
      "kind": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "类型筛选"
      },
      "type": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "工单类型筛选"
      },
      "scope": {
       "type": "enum",
       "values": [
        "nearby",
        "taken",
        "linked",
        ""
       ],
       "zh": "接单口径"
      },
      "region": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "地区"
      },
      "leaseType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "承包类型"
      },
      "soil": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "土壤类型"
      },
      "category": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "农产品品类"
      },
      "board": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "论坛版块"
      },
      "role": {
       "type": "enum",
       "values": [
        "consumer",
        "merchant",
        "grower",
        "research",
        "admin",
        ""
       ],
       "zh": "用户身份：grower=接单农户 / research=产学研，后端归一到 platform_user.role"
      },
      "targetType": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "评论目标类型"
      },
      "period": {
       "type": "string",
       "min": 0,
       "max": 7,
       "zh": "账期 YYYY-MM"
      },
      "dimension": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "统计 / 调控维度"
      },
      "crop": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "作物筛选"
      },
      "stage": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "生长阶段"
      },
      "cat": {
       "type": "string",
       "min": 0,
       "max": 32,
       "zh": "价目类目"
      },
      "filter": {
       "type": "string",
       "min": 0,
       "max": 64,
       "zh": "枚举筛选值"
      },
      "name": {
       "type": "string",
       "min": 1,
       "max": 40,
       "zh": "数据集名"
      },
      "ids": {
       "type": "string",
       "min": 0,
       "max": 96,
       "zh": "对比田块编号串，最多 3 个"
      },
      "farmId": {
       "type": "code",
       "zh": "田块编号（软引用）"
      },
      "workorderId": {
       "type": "code",
       "zh": "工单编号（软引用）"
      },
      "level": {
       "type": "int",
       "min": 1,
       "max": 3,
       "zh": "审核级别"
      },
      "result": {
       "type": "string",
       "min": 1,
       "max": 32,
       "zh": "审核结果"
      }
     },
     "must": [],
     "min": 0,
     "max": 40,
     "zh": "请求参数对象"
    }
   ],
   "returns": {
    "type": "Paginated<T>",
    "shape": "items[] / total / page / pageSize / pages",
    "range": "total ≥ 0；1 ≤ page ≤ pages；1 ≤ pageSize ≤ 50；items.length ≤ pageSize"
   },
   "sig": [
    "p"
   ],
   "columns": {
    "regulation_advice": [
     "id",
     "record_id",
     "dimension",
     "before_value",
     "target_value",
     "action",
     "status",
     "review_note",
     "created_at",
     "updated_at"
    ],
    "planting_record": [
     "id",
     "record_no",
     "plot_no",
     "expert_no",
     "crop",
     "stage",
     "reading_json",
     "note",
     "at",
     "created_at",
     "updated_at"
    ]
   }
  },
  {
   "name": "upload",
   "domain": "内容域",
   "method": "POST",
   "path": "/upload",
   "tables": [
    "attachment"
   ],
   "summaryZh": "上传图片 / 视频 / 回执，返回路径，库里只存路径",
   "summaryEn": "Upload a file and return its path",
   "flowZh": "① 表单选文件 → 本接口（只写 attachment.file_path，不写二进制） → ② saveFarm / reissueWorkorder / sendChat 等业务接口带 attach_no → ③ getFarm / getWorkorder / listChats 回显路径",
   "args": [
    {
     "name": "file",
     "type": "file",
     "maxBytes": 20971520,
     "mimes": [
      "image/webp",
      "image/jpeg",
      "image/png",
      "video/mp4",
      "application/pdf"
     ],
     "zh": "上传文件，≤20MB，白名单 MIME"
    }
   ],
   "returns": {
    "type": "UploadResult",
    "shape": "url / width / height",
    "range": "url 为路径字符串；宽度 1..8192；高度 1..8192"
   },
   "sig": [
    "file"
   ],
   "columns": {
    "attachment": [
     "id",
     "attach_no",
     "owner_type",
     "owner_no",
     "file_path",
     "mime",
     "size_bytes",
     "created_at",
     "updated_at"
    ]
   }
  }
 ];
  var SAMPLE_ARGS = {
 "listFarms": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getFarm": [
  "F001"
 ],
 "saveFarm": [
  {
   "titleZh": "仿真田园",
   "region": "成都",
   "soil": "壤土"
  }
 ],
 "listActivities": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getActivity": [
  "A001"
 ],
 "listProduces": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getProduce": [
  "P001"
 ],
 "listVideos": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listPromos": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listTopics": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getTopic": [
  "T001"
 ],
 "saveTopic": [
  {
   "board": "tech",
   "titleZh": "仿真帖",
   "bodyZh": "内容"
  }
 ],
 "listExperts": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getExpert": [
  "E001"
 ],
 "listWorkorders": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getWorkorder": [
  "W001"
 ],
 "listDispatches": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "acceptJob": [
  {
   "workorderId": "F001",
   "assigneeId": "F001"
  }
 ],
 "listOrders": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listUsers": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listComments": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listChats": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop",
   "workorderId": "F001"
  }
 ],
 "sendChat": [
  {
   "workorderId": "F001",
   "bodyZh": "x"
  }
 ],
 "listPlantings": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listAudits": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "stepAudit": [
  "F001",
  {
   "level": 1,
   "result": "x"
  }
 ],
 "listNotices": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "search": [
  "儿菜",
  1
 ],
 "adminLogin": [
  {
   "account": "admin",
   "passphrase": "pass1234",
   "captcha": ""
  }
 ],
 "adminModule": [
  "farms",
  {
   "page": 1,
   "q": ""
  }
 ],
 "listAny": [
  {
   "name": "farms",
   "page": 1,
   "pageSize": 8
  }
 ],
 "getPriceBook": [],
 "listPriceItems": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listPricePlots": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getPriceBreakdown": [
  "farms",
  "F001"
 ],
 "calcPrice": [
  {
   "farmId": "F001",
   "areaMu": 2.5,
   "seasons": 1,
   "leaseType": "整田年租"
  }
 ],
 "listPriceChanges": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "publishPrices": [
  {
   "version": "2026Q4",
   "effectiveAt": "2026-11-10",
   "note": "仿真",
   "lines": [
    {
     "itemNo": "PI001"
    }
   ]
  }
 ],
 "listPriceAudits": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listJobChanges": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "cancelWorkorder": [
  "F001",
  {
   "reason": "x"
  }
 ],
 "amendWorkorder": [
  "F001",
  {
   "scope": "x",
   "acceptance": "x"
  }
 ],
 "reissueWorkorder": [
  "F001",
  {
   "scope": "nearby",
   "farmId": "F001",
   "type": "x"
  }
 ],
 "listRefunds": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getRefund": [
  "RF001"
 ],
 "applyRefund": [
  {
   "orderId": "O001",
   "workorderId": "W001",
   "reason": "农时变更",
   "method": "original"
  }
 ],
 "listContracts": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getContract": [
  "CT001"
 ],
 "listContractVersions": [
  "F001",
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "saveContract": [
  {
   "contractId": "CT001",
   "reason": "条款更新",
   "clauses": [
    "条款一"
   ]
  }
 ],
 "listBills": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listReconciliations": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getReconciliation": [
  "RC001"
 ],
 "listFunds": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listWithdrawals": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getWithdrawal": [
  "WD001"
 ],
 "withdrawFunds": [
  {
   "amountCents": 1000,
   "bank": "6222****",
   "userId": "U001"
  }
 ],
 "listActivityVersions": [
  "F001",
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listActivityRegistrations": [
  "F001",
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "publishActivity": [
  {
   "title": "仿真活动",
   "kind": "聚会",
   "farmId": "F001",
   "date": "2026-11-20",
   "capacity": 20
  }
 ],
 "updateActivity": [
  "F001",
  {
   "title": "x"
  }
 ],
 "expertStats": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "expertCompare": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listPlantRecords": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "getPlantRecord": [
  "PR001"
 ],
 "listRegulations": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "saveRegulation": [
  {
   "recordId": "PR001",
   "dimension": "水分",
   "before": "22",
   "target": "26",
   "action": "按畦补水一次"
  }
 ],
 "listAdminRefunds": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "reviewRefund": [
  "F001",
  {
   "decision": "核对通过"
  }
 ],
 "listAdminWithdrawals": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "reviewWithdrawal": [
  "F001",
  {
   "decision": "复核通过"
  }
 ],
 "listAdminContracts": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "listAdminRegulations": [
  {
   "page": 1,
   "pageSize": 8,
   "lang": "zh",
   "scope": "nearby",
   "role": "consumer",
   "dimension": "crop"
  }
 ],
 "upload": [
  {
   "__file__": true
  }
 ]
};
  var byName = {};
  CATALOG.forEach(function (c) { byName[c.name] = c; });

  /* 参数范围校验：只校验「出现且在目录里声明」的字段，未知字段放行，
     避免旧页面表单字段升级时被误拦；数值 / 枚举 / 编码 / 长度都真实生效。 */
  function fieldCheck(v, rule, label, errs) {
    if (v === undefined || v === null || v === '') return;
    var ty = rule.type;
    if (ty === 'int' || ty === 'number') {
      var n = Number(v);
      if (!isFinite(n)) { errs.push(label + ' 必须是数字'); return; }
      if (ty === 'int' && Math.floor(n) !== n) errs.push(label + ' 必须是整数');
      if (rule.min !== undefined && n < rule.min) errs.push(label + ' 不得小于 ' + rule.min);
      if (rule.max !== undefined && n > rule.max) errs.push(label + ' 不得大于 ' + rule.max);
    } else if (ty === 'string') {
      var s = String(v), L = s.length;
      if (rule.min !== undefined && L < rule.min) errs.push(label + ' 长度不得小于 ' + rule.min);
      if (rule.max !== undefined && L > rule.max) errs.push(label + ' 长度不得大于 ' + rule.max);
    } else if (ty === 'code') {
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(String(v))) errs.push(label + ' 编号格式不合法（1..32 位字母数字 _ -）');
    } else if (ty === 'enum') {
      if ((rule.values || []).indexOf(v) < 0) errs.push(label + ' 必须是枚举值：' + (rule.values || []).join(' / '));
    } else if (ty === 'array') {
      var a = Array.isArray(v) ? v : [];
      if (rule.min !== undefined && a.length < rule.min) errs.push(label + ' 至少 ' + rule.min + ' 项');
      if (rule.max !== undefined && a.length > rule.max) errs.push(label + ' 至多 ' + rule.max + ' 项');
    } else if (ty === 'file') {
      var f = v || {};
      if (f.__file__) return;
      if (f.size !== undefined && rule.maxBytes && f.size > rule.maxBytes) errs.push(label + ' 超过 ' + rule.maxBytes + ' 字节');
      if (f.type && (rule.mimes || []).length && rule.mimes.indexOf(f.type) < 0) errs.push(label + ' MIME 不在白名单');
    }
  }
  function validate(name, args) {
    var meta = byName[name], errs = [];
    if (!meta) return { ok: true, errors: [], checked: 0 };
    var checked = 0;
    (meta.args || []).forEach(function (a, i) {
      var v = args[i];
      if (a.required && (v === undefined || v === null || v === '')) { errs.push(a.name + ' 必填'); return; }
      if (v === undefined || v === null) return;
      checked++;
      if (a.type === 'object') {
        if (typeof v !== 'object' || Array.isArray(v)) { errs.push(a.name + ' 必须是对象'); return; }
        var fs = a.fields || {};
        Object.keys(v).forEach(function (k) { if (fs[k]) { checked++; fieldCheck(v[k], fs[k], k, errs); } });
        (a.must || []).forEach(function (k) {
          if (v[k] === undefined || v[k] === null || v[k] === '') errs.push(a.name + '.' + k + ' 必填');
        });
        var nk = Object.keys(v).length;
        if (a.max !== undefined && nk > a.max) errs.push(a.name + ' 字段数超过 ' + a.max);
      } else fieldCheck(v, a, a.name, errs);
    });
    return { ok: errs.length === 0, errors: errs, checked: checked };
  }

  /* 逐条数据仿真：返回统一反馈对象，供 api-lab.html 显示并做前端验证。
     source=mock 表示回落模拟数据；后端接好置 config.useMock=false 即走 fetch。 */
  function summarize(data) {
    if (data === null || data === undefined) return { kind: 'null', count: 0, preview: '无数据' };
    if (Array.isArray(data)) return { kind: 'array', count: data.length, preview: String(JSON.stringify(data.slice(0, 2))).slice(0, 180) };
    if (typeof data === 'object') {
      var keys = Object.keys(data);
      var n = null;
      ['items', 'rows', 'groups', 'lines', 'cats', 'changes', 'rules'].forEach(function (k) {
        if (Array.isArray(data[k])) n = data[k].length;
      });
      return { kind: 'object', count: n === null ? keys.length : n,
               fields: keys.slice(0, 12),
               preview: String(JSON.stringify(data)).slice(0, 220) };
    }
    return { kind: 'scalar', count: 1, preview: String(data).slice(0, 180) };
  }
  function simulate(name, args) {
    var meta = byName[name];
    if (!meta) return Promise.resolve({ name: name, ok: false, code: 4040,
      message: '接口未在 CATALOG 登记', tables: [], ms: 0 });
    var v = validate(name, args || []);
    if (!v.ok) return Promise.resolve({ name: name, ok: false, code: 4001,
      message: '参数范围校验未通过：' + v.errors.join('；'), errors: v.errors,
      tables: meta.tables, ms: 0, blocked: true });
    var t0 = Date.now();
    var fn = API[name];
    if (typeof fn !== 'function') return Promise.resolve({ name: name, ok: false, code: 4041,
      message: '方法未实现', tables: meta.tables, ms: 0 });
    return Promise.resolve().then(function () { return fn.apply(API, args || []); }).then(function (data) {
      return { name: name, ok: true, code: 0, message: 'ok', data: data,
               summary: summarize(data), tables: meta.tables, domain: meta.domain,
               method: meta.method, path: meta.path, checked: v.checked,
               source: config.useMock ? 'mock' : 'http', ms: Date.now() - t0 };
    }).catch(function (e) {
      return { name: name, ok: false, code: (e && e.code) || 5000,
               message: (e && e.message) || String(e), tables: meta.tables,
               domain: meta.domain, method: meta.method, path: meta.path,
               source: config.useMock ? 'mock' : 'http', ms: Date.now() - t0 };
    });
  }
  function catalog() { return CATALOG.slice(); }
  function sampleArgs(name) { return (SAMPLE_ARGS[name] || []).slice(); }

  /* ===== 安全整改（安全员视角）=====
     以下字段属于「服务端会话注入」：真实后端必须从 Authorization / 会话解析，
     忽略前端传值。前端仅在 useMock=true 的演示态允许携带，切到真实后端即拒绝，
     防止水平越权（指定他人 userId / assigneeId）与垂直越权（自定审核 level / decision）。 */
  var SESSION_INJECTED = {
    acceptJob: ['assigneeId'], withdrawFunds: ['userId'],
    stepAudit: ['level', 'result'], reviewRefund: ['decision'], reviewWithdrawal: ['decision'],
    adminLogin: ['captcha'], publishPrices: ['version']
  };
  function clientIdentityRejected(name, args) {
    if (config.useMock) return null;
    var keys = SESSION_INJECTED[name] || [];
    if (!keys.length) return null;
    for (var i = 0; i < args.length; i++) {
      var v = args[i];
      if (!v || typeof v !== 'object') continue;
      for (var j = 0; j < keys.length; j++) {
        if (v[keys[j]] !== undefined && v[keys[j]] !== null && v[keys[j]] !== '')
          return keys[j];
      }
    }
    return null;
  }
  /* 统一包装：所有方法先过参数范围校验，再走原实现（模拟 / fetch 单点分派）。
     页面调用方式完全不变，SF_API.config.useMock=false 即整体切到真实后端。 */
  Object.keys(API).forEach(function (k) {
    if (k === 'config' || k === 'ENDPOINTS') return;
    var orig = API[k];
    if (typeof orig !== 'function') return;
    API[k] = function () {
      var args = Array.prototype.slice.call(arguments);
      var injected = clientIdentityRejected(k, args);
      if (injected) return Promise.reject({ code: 403,
        message: '请求参数不合法', traceId: 'req-' + Date.now() });
      var v = validate(k, args);
      if (!v.ok) return Promise.reject({ code: 4001,
        message: config.useMock ? '参数范围校验未通过：' + v.errors.join('；') : '请求参数不合法',
        traceId: 'req-' + Date.now() });
      return orig.apply(API, args);
    };
  });

  global.SF_API = API;
  global.SF_REQUEST = {
    catalog: catalog, sampleArgs: sampleArgs, validate: validate,
    simulate: simulate, config: config, ENDPOINTS: ENDPOINTS,
    API: API, version: '1.7.8',
    security: {
      sessionInjected: SESSION_INJECTED,
      demoMode: true,
      notes: '演示态用 URL 参数表达身份，仅用于静态走查；上线前必须接入服务端签名会话，' +
             '并在 Nginx 层拒绝 /admin/ 与 /_internal/。生产错误信息一律泛化，不回显字段明细。'
    }
  };
})(window);
