/* 闪马田园 SUMFARM · 前台账号体系 v1.5.0
   ------------------------------------------------------------------
   状态约定（严格遵守基线）：
   - 登录态的**核心判断只依赖显式 URL 参数** ?auth=1&uid=xxx&role=xxx，
     不依赖 referrer、不依赖 sessionStorage / localStorage 做权限判断。
   - localStorage 仅用于「注册表单记住上次选择的角色」这类展示偏好，
     读不到时一律走兜底，兜底值不参与状态判断。
   - 所有站内链接统一经 decorate() 构造，把 lang 与登录态显式透传，
     全站链接构造只写这一份，nav.js / app.js 都复用它。
   - 真实后端接入：把 signIn / signUp / reset 换成 POST /auth/login、
     /auth/register、/auth/password/reset，返回 {token,uid,role,expireAt}；
     前端把 uid/role 写进 URL 参数，token 仅放接口层 Authorization 头。
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';
  var PREF_KEY = 'sf_role_pref';
  var DEMO_PASS = 'sumfarm2026';
  var ROLES = [
    { id: 'consumer', zh: '普通用户 · 租赁与分享', en: 'Member · lease and share' },
    { id: 'merchant', zh: '商家 / 村集体 · 田园共享', en: 'Cooperative · list farmland' },
    { id: 'grower', zh: '接单农户 · 田园打理', en: 'Grower · take field jobs' },
    { id: 'research', zh: '产学研 · 技术指导与试验', en: 'Research · agronomy and trials' },
    { id: 'admin', zh: '平台管理员 · 仅后台入口', en: 'Administrator · console only' }
  ];
  /* 演示账号：五类角色各一个，密码统一，仅用于静态模板走通流程 */
  var DEMO = [
    { uid: 'U013', account: 'tianyou', nameZh: '田友小林', nameEn: 'Lin', roleId: 'consumer' },
    { uid: 'U001', account: 'hongqi', nameZh: '红旗村合作社', nameEn: 'Hongqi Cooperative', roleId: 'merchant' },
    { uid: 'U025', account: 'laozhou', nameZh: '老周', nameEn: 'Zhou', roleId: 'grower' },
    { uid: 'E001', account: 'zhoulvtian', nameZh: '周履田', nameEn: 'Zhou Lutian', roleId: 'research' },
    { uid: 'U005', account: 'sumfarm-admin', nameZh: '平台管理员', nameEn: 'Platform Admin', roleId: 'admin' }
  ];

  function read() {
    var u = new URL(location.href);
    return {
      auth: u.searchParams.get('auth') === '1',
      uid: u.searchParams.get('uid') || '',
      role: u.searchParams.get('role') || ''
    };
  }
  function authed() { return read().auth; }
  function roleName(id, lang) {
    var r = ROLES.filter(function (x) { return x.id === id; })[0] || ROLES[0];
    return lang === 'en' ? r.en : r.zh;
  }
  function user() {
    var s = read();
    if (!s.auth) return null;
    var d = DEMO.filter(function (x) { return x.uid === s.uid; })[0];
    if (d) return { uid: d.uid, name: d.nameZh, account: d.account, role: d.roleId };
    return { uid: s.uid || 'U013', name: s.uid || 'U013', account: s.uid || 'U013', role: s.role || 'consumer' };
  }
  /* 唯一一份站内链接构造：显式透传 lang 与登录态。
     两件公共事只在这里做一次：① 合并 file 自带的查询参数，不产生第二个问号；
     ② 当前位于后台目录时，把带后台目录前缀的文件名收敛为同目录文件名，
        避免后台内部链接叠出重复目录层级的错层路径。 */
  function decorate(file, extra) {
    var f = String(file || 'index.html'), hash = '', q0 = '';
    var hi = f.indexOf('#');
    if (hi >= 0) { hash = f.slice(hi); f = f.slice(0, hi); }
    var qi = f.indexOf('?');
    if (qi >= 0) { q0 = f.slice(qi + 1); f = f.slice(0, qi); }
    if (location.pathname.indexOf('/admin/') >= 0 && f.indexOf('admin/') === 0) f = f.slice(6);
    var p = new URLSearchParams(q0);
    p.set('lang', (global.SF_I18N && global.SF_I18N.current()) || 'zh');
    var s = read();
    if (s.auth) {
      p.set('auth', '1');
      p.set('uid', s.uid || 'U013');
      if (s.role) p.set('role', s.role);
    }
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] !== undefined && extra[k] !== null && extra[k] !== '') p.set(k, extra[k]);
    });
    var qs = p.toString();
    return f + (qs ? '?' + qs : '') + hash;
  }
  function go(file, extra) { return decorate(file, extra); }
  function signIn(d, from) {
    var acc = String(d.account || '').trim().toLowerCase();
    var hit = DEMO.filter(function (x) { return x.account.toLowerCase() === acc || x.uid.toLowerCase() === acc; })[0];
    var okPass = String(d.passphrase || '') === DEMO_PASS;
    if (!okPass || !hit) return { ok: false, reason: 'credential' };
    if (hit.roleId === 'admin') {
      return { ok: true, admin: true, url: 'admin/login.html?lang=' + ((global.SF_I18N && global.SF_I18N.current()) || 'zh') };
    }
    return { ok: true, admin: false,
      url: decorate(from || 'account.html', { auth: '1', uid: hit.uid, role: hit.roleId, welcome: '1' }) };
  }
  function signUp(d, from) {
    try { localStorage.setItem(PREF_KEY, d.role || 'consumer'); } catch (e) {}
    var uid = 'U0' + (41 + Math.floor(Math.random() * 40));
    return { ok: true, uid: uid,
      url: decorate(from || 'account.html', { auth: '1', uid: uid, role: d.role || 'consumer', welcome: '1' }) };
  }
  function prefRole() {
    try { return localStorage.getItem(PREF_KEY) || 'consumer'; } catch (e) { return 'consumer'; }
  }
  function signOut() {
    var u = new URL(location.href);
    ['auth', 'uid', 'role', 'welcome'].forEach(function (k) { u.searchParams.delete(k); });
    return u.toString();
  }
  function validate(d, kind) {
    if (kind === 'forgot') { if (!d.phone) return 'missing'; return ''; }
    if (kind === 'login') {
      if (!d.account || !d.passphrase) return 'missing';
      return '';
    }
    if (!d.account || !d.passphrase || !d.confirm || !d.role) return 'missing';
    if (d.passphrase !== d.confirm) return 'mismatch';
    if (String(d.passphrase).length < 8) return 'weak';
    if (!d.agree) return 'agree';
    return '';
  }
  global.SF_AUTH = {
    ROLES: ROLES, DEMO: DEMO, DEMO_PASS: DEMO_PASS,
    read: read, authed: authed, user: user, roleName: roleName,
    decorate: decorate, go: go, signIn: signIn, signUp: signUp,
    signOut: signOut, prefRole: prefRole, validate: validate
  };
})(window);
