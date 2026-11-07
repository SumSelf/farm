/* 闪马田园 SUMFARM · 真实接口层 v1.5.0
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
  var BASE = 'https://sumfarm.sumstc.com/api/v1';
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
    adminLogin: '/admin/login', adminModules: '/admin/modules'
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
        return ok({ token: 'mock-admin-token', modules: ['dashboard', 'farms', 'users', 'workorders', 'chats', 'planting', 'comments', 'audit', 'system'] });
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
    /* POST /upload body:FormData → Promise<{url,width,height}>；前端只做预览，真实上传由后端落 OSS */
    upload: function (file) {
      if (config.useMock) return ok({ url: M.IMG.farm, width: 1280, height: 720 }, 'uploaded').then(function (j) { return j.data; });
      var fd = new FormData(); fd.append('file', file);
      return fetch(config.base + ENDPOINTS.upload, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + config.token }, body: fd
      }).then(function (r) { return r.json(); }).then(function (j) { return j.data; });
    }
  };
  global.SF_API = API;
})(window);
