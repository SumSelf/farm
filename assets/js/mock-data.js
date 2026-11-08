/* 闪马田园 SUMFARM · 模拟数据 v1.6.0
   前后端彻底分离：本文件是唯一模拟数据源；真实接入见 api.js。
   图片：13 张成品主视觉 + 10 题材 × 5 规格 = 50 张切图，全部为真实田园成图；
        按 pagename_id 由 art() 统一解析，映射关系只写这一份，见 ART_MATRIX.md。
        功能性图标一律内联 SVG，不换位图；不再使用矢量色卡冒充内容图。
   日期分布 2026-01 ~ 2026-11，逐条字段不重复。 */
(function (global) {
  'use strict';
  var IMG = {
    hero: 'assets/img/home_hero.png',
    heroM: 'assets/img/home_hero_m.png',
    field: 'assets/img/bg_field.png',
    tech: 'assets/img/bg_tech.png',
    cute: 'assets/img/bg_cute.png',
    empty: 'assets/img/empty_state.png',
    farm: 'assets/img/farm_card.png',
    venue: 'assets/img/activity_venue.png',
    produce: 'assets/img/produce_basket.png',
    admin: 'assets/img/admin_bg.png',
    auth: 'assets/img/auth_side.png',
    member: 'assets/img/member_card.png',
    process: 'assets/img/process_steps.png'
  };
  /* ---------- 题材 × 规格映射（公共关系只写这一份） ----------
     CAT_TOPIC：内容子类 → 可用题材池；ART_TOPICS：数据集 → 可用题材池（供页面级取图）。
     每张切图由 slice_assets.py 从 10 张主视觉生成，规格矩阵见 ART_MATRIX.md。 */
  var ART_TOPICS = {
    farms: ['plain', 'terrace', 'greenhouse'], activities: ['lawn', 'wedding', 'camp'],
    produces: ['harvest', 'plain', 'greenhouse'], videos: ['plain', 'terrace', 'fieldjob'],
    promos: ['terrace', 'plain', 'lawn'], topics: ['forum', 'greenhouse', 'fieldjob'],
    experts: ['expert', 'greenhouse', 'terrace'], workorders: ['fieldjob', 'plain', 'greenhouse'],
    dispatches: ['fieldjob', 'terrace', 'plain'], orders: ['harvest', 'lawn', 'camp'],
    users: ['forum', 'lawn', 'expert'], comments: ['forum', 'plain', 'fieldjob'],
    chats: ['forum', 'fieldjob', 'greenhouse'], plantings: ['greenhouse', 'plain', 'terrace'],
    audits: ['expert', 'forum', 'terrace'], notices: ['terrace', 'lawn', 'plain']
  };
  var CAT_TOPIC = {
    farm: ['plain', 'terrace', 'greenhouse'], venue: ['lawn', 'wedding', 'camp'],
    produce: ['harvest', 'plain', 'greenhouse'], video: ['plain', 'terrace', 'fieldjob'],
    promo: ['terrace', 'plain', 'lawn'], topic: ['forum', 'greenhouse', 'fieldjob'],
    expert: ['expert', 'greenhouse', 'terrace'], job: ['fieldjob', 'plain', 'greenhouse'],
    user: ['forum', 'lawn', 'expert'], chat: ['forum', 'fieldjob', 'greenhouse'],
    planting: ['greenhouse', 'plain', 'terrace'], soil: ['plain', 'terrace', 'fieldjob']
  };
  var ART_SLOTS = ['card', 'wide', 'sq', 'mini', 'tall'];
  var ART_TOPIC_ALL = ['plain', 'terrace', 'greenhouse', 'lawn', 'wedding',
    'camp', 'harvest', 'fieldjob', 'expert', 'forum'];
  function hashId(s) {
    var n = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = (n * 16777619) >>> 0; }
    return n >>> 0;
  }
  /* pagename_id 是唯一映射键：页面名 + 内容子类 + 记录 id → 题材 + 规格。
     slot 可显式指定（列表用 card、头像用 sq、竖版用 tall）；不指定时按 id 稳定散列。
     同一 id 永远取到同一张图，不同 id 取到不同题材或规格，不写死、不重复占位。 */
  function art(pageId, cat, seed, slot) {
    var h = hashId(pageId + '|' + cat + '|' + seed);
    var pool = CAT_TOPIC[cat] || ART_TOPICS[cat] || CAT_TOPIC.farm;
    var topic = pool[h % pool.length];
    if (ART_TOPIC_ALL.indexOf(topic) < 0) topic = 'plain';
    var s = slot || ART_SLOTS[(h >>> 5) % ART_SLOTS.length];
    if (ART_SLOTS.indexOf(s) < 0) s = 'card';
    return 'assets/img/art/sub_' + topic + '_' + s + '.png';
  }
  /* 历史调用名保留作兼容层，实现已升级为真实成图；不再产出矢量色卡 */
  function svgThumb(cat, seed) { return art(cat, cat, seed, 'card'); }

  var REGIONS = ['成都·崇州道明镇', '成都·郫都唐昌镇', '成都·彭州桂花镇', '眉山·东坡太和镇',
    '德阳·广汉连山镇', '绵阳·安州雎水镇', '宜宾·翠屏李庄镇', '乐山·夹江甘江镇'];
  var SOILS = ['壤土 / 微酸 pH6.2', '砂壤土 / 中性 pH6.8', '黏壤土 / 微碱 pH7.4', '腐殖土 / 微酸 pH5.9', '紫色土 / 中性 pH7.0'];
  var CROPS = ['油菜', '儿菜', '二荆条辣椒', '水稻', '胭脂萝卜', '软枣猕猴桃', '羊肚菌', '紫皮大蒜', '藤椒', '莲藕', '草莓', '小番茄'];
  var FACILITIES = ['农家菜单', '聚会长桌', '会议室', '活动草坪', '运动场地', '婚纱场地', '露营营位'];
  var FARM_NAMES = [
    ['道明竹艺田畈', 'Daoming Bambow Plot'], ['唐昌韭黄老圃', 'Tangchang Chive Garden'],
    ['桂花镇稻香坝', 'Guihua Rice Flat'], ['太和东坡菜畦', 'Taihe Dongpo Beds'],
    ['连山浅丘梯田', 'Lianshan Terraces'], ['雎水河畔沙地', 'Jushui River Sand'],
    ['李庄花生垄', 'Lizhuang Peanut Ridges'], ['甘江莲藕塘', 'Ganjiang Lotus Pond'],
    ['白鹿顶高山圃', 'Bailu Highland Garden'], ['街子味江谷地', 'Jiezi Weijiang Vale'],
    ['三星堆旁麦田', 'Sanxingdui Wheatfield'], ['黄龙溪菜花塝', 'Huanglongxi Rapeseed Bank'],
    ['明月村茶果间作', 'Mingyue Tea-Fruit Intercrop'], ['大邑雾中山药垄', 'Dayi Wushan Yam Ridges'],
    ['蒲江猕猴桃架', 'Pujiang Kiwi Trellis'], ['新津渔耕田', 'Xinjin Fish-Farm Plot'],
    ['青神椪柑坡', 'Qingshen Citrus Slope'], ['什邡蒜田坝', 'Shifang Garlic Flat'],
    ['都江堰猕猴桃谷', 'Dujiangyan Kiwi Vale'], ['邛崃茶垄', 'Qionglai Tea Rows'],
    ['广元羊肚菌棚', 'Guangyuan Morel Shed'], ['雅安藤椒沟', "Ya'an Pepper Gully"],
    ['简阳草莓畦', 'Jianyang Strawberry Beds'], ['金堂脐橙台', 'Jintang Orange Terrace']
  ];
  var LEASES = ['整田年租', '分畦季租', '认养代耕', '共享轮作', '试验托管'];
  var OWNERS = ['崇州红旗村集体', '唐昌先锋合作社', '彭州桂花家庭农场', '东坡太和农业公司',
    '广汉连山农机社', '安州雎水种植社', '李庄共享田园', '夹江甘江村集体'];
  function d(mo, day) { return '2026-' + String(mo).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  function pick(a, i) { return a[i % a.length]; }
  /* 每条记录的封面都来自真实切图：题材按 pagename_id 稳定散列，规格按用途指定 */
  function cover(kind, i, slot) {
    return art(kind, kind, kind + '-' + i, slot || 'card');
  }

  var farms = FARM_NAMES.map(function (n, i) {
    var mo = (i % 11) + 1, day = (i * 7 % 27) + 1;
    return {
      id: 'F' + String(i + 1).padStart(3, '0'), nameZh: n[0], nameEn: n[1],
      region: pick(REGIONS, i), plotNo: (String.fromCharCode(65 + i % 6)) + '-' + String(101 + i * 3),
      soil: pick(SOILS, i), temp4: [8 + i % 5, 17 + i % 4, 26 + i % 3, 11 + i % 4],
      humid4: [58 + i % 9, 66 + i % 8, 74 + i % 7, 61 + i % 8],
      pastCrops: [pick(CROPS, i), pick(CROPS, i + 5), pick(CROPS, i + 9)],
      currentCrops: [pick(CROPS, i + 2), pick(CROPS, i + 7)],
      harvest: ['2025 秋收 ' + (420 + i * 13) + ' kg', '2026 春收 ' + (260 + i * 9) + ' kg'],
      leaseType: pick(LEASES, i), leaseStart: d(mo, day), leaseEnd: d(mo % 11 + 1, day),
      areaMu: +(1.2 + (i % 9) * 0.6).toFixed(1), price: 680 + i * 95,
      cover: cover('farm', i), gallery: [cover('farm', i, 'wide'), cover('farm', i + 4, 'card'), cover('farm', i + 9, 'sq')],
      tags: [pick(FACILITIES, i), pick(FACILITIES, i + 3), pick(CROPS, i + 1)],
      ownerId: 'U' + String((i % 8) + 1).padStart(3, '0'), rating: +(4.1 + (i % 9) * 0.1).toFixed(1),
      comments: 6 + i * 2, follows: 34 + i * 11,
      facilities: [pick(FACILITIES, i), pick(FACILITIES, i + 2), pick(FACILITIES, i + 5)],
      descZh: '田块位于' + pick(REGIONS, i) + '，' + pick(SOILS, i) + '，配套' + pick(FACILITIES, i) + '与' + pick(FACILITIES, i + 4) + '，适合' + pick(LEASES, i) + '。',
      descEn: 'A plot in ' + n[1] + ' with ' + pick(SOILS, i).split(' / ')[0] + ' soil, open for ' + pick(LEASES, i) + '.'
    };
  });
  var KINDS = ['聚会', '开会', '活动', '运动场地', '婚纱场地', '露营', '菜单', '采摘', '研学'];
  var activities = Array.from({ length: 18 }, function (_, i) {
    var f = farms[i % farms.length], mo = (i % 10) + 1;
    return { id: 'A' + String(i + 1).padStart(3, '0'),
      titleZh: f.nameZh + ' · ' + pick(KINDS, i) + '日', titleEn: f.nameEn + ' · ' + pick(['Gathering', 'Meeting', 'Field Day', 'Sports', 'Wedding Lawn', 'Camping', 'Farm Table', 'Harvest', 'Study Tour'][i % 9]),
      farmId: f.id, kind: pick(KINDS, i), date: d(mo, (i * 5 % 26) + 1),
      capacity: 20 + i * 4, booked: 6 + i * 2, price: 88 + i * 26, cover: cover('venue', i),
      descZh: '在' + f.nameZh + '安排一场' + pick(KINDS, i) + '，含田间导览与当季菜单，可加订露营营位。',
      descEn: 'A ' + pick(KINDS, i) + ' session at ' + f.nameEn + ' with a guided walk and seasonal farm table.' };
  });
  var PRODUCE = [['儿菜', 'Baby mustard'], ['二荆条辣椒', 'Erjingtiao chili'], ['胭脂萝卜', 'Rouge radish'],
    ['羊肚菌', 'Morel'], ['紫皮大蒜', 'Purple garlic'], ['藤椒', 'Green Sichuan pepper'], ['莲藕', 'Lotus root'],
    ['草莓', 'Strawberry'], ['小番茄', 'Cherry tomato'], ['软枣猕猴桃', 'Hardy kiwi'], ['油菜籽', 'Rapeseed'],
    ['新米', 'New rice'], ['椪柑', 'Ponkan'], ['山药', 'Chinese yam'], ['茶青', 'Tea leaf'], ['蒜薹', 'Garlic scape'],
    ['花生', 'Peanut'], ['稻花鱼', 'Paddy fish'], ['蜂蜜', 'Wild honey'], ['干菌包', 'Dried mushroom mix']];
  var produces = PRODUCE.map(function (p, i) {
    var f = farms[(i * 3) % farms.length];
    return { id: 'P' + String(i + 1).padStart(3, '0'), nameZh: p[0], nameEn: p[1], farmId: f.id,
      category: pick(['蔬菜', '菌菇', '果品', '粮油', '调味', '水产'], i), season: pick(['春', '夏', '秋', '冬'], i),
      unit: pick(['斤', '筐', '份', '袋'], i), price: 12 + i * 7, stock: 30 + i * 9,
      cover: cover('produce', i), traceNo: 'TR-2026-' + String(4100 + i * 17) };
  });
  var VIDEO_T = [['插秧那三天', 'Three days of transplanting'], ['雨后巡田', 'Walking the ridge after rain'],
    ['第一筐草莓', 'The first strawberry crate'], ['翻地机下田', 'Tiller enters the plot'],
    ['露营夜的田埂', 'A camping night on the ridge'], ['专家来看土', 'The agronomist reads the soil'],
    ['收割后的晚饭', 'Supper after harvest'], ['育苗棚清晨', 'Morning in the nursery'],
    ['稻田里的婚礼', 'A wedding in the paddy'], ['施肥记录', 'Logging the fertiliser'],
    ['配送出发', 'Delivery run'], ['冬灌', 'Winter irrigation'], ['田块编号牌', 'Plot number plates'],
    ['采摘节人潮', 'Harvest day crowd'], ['无人机航拍', 'Drone over the fields'], ['四季同框', 'Four seasons in one frame']];
  var videos = VIDEO_T.map(function (v, i) {
    return { id: 'V' + String(i + 1).padStart(3, '0'), titleZh: v[0], titleEn: v[1],
      authorId: 'U' + String((i % 20) + 9).padStart(3, '0'), farmId: farms[i % farms.length].id,
      duration: '0' + (2 + i % 8) + ':' + String(12 + i * 3 % 47).padStart(2, '0'),
      cover: cover('video', i), views: 320 + i * 187, likes: 21 + i * 13,
      publishedAt: d((i % 11) + 1, (i * 3 % 26) + 1), tag: pick(['四季', '采收', '农事', '活动', '技术'], i) };
  });
  var promos = Array.from({ length: 12 }, function (_, i) {
    var f = farms[(i * 2) % farms.length];
    return { id: 'R' + String(i + 1).padStart(3, '0'),
      titleZh: f.nameZh + '开放日 · 第' + (i + 1) + '期', titleEn: f.nameEn + ' open day · No.' + (i + 1),
      farmId: f.id, channel: pick(['村集体公告', '商家宣发', '招商合作', '开放日'], i),
      cover: cover('promo', i), publishedAt: d((i % 11) + 1, (i * 4 % 26) + 1),
      summaryZh: '本期开放' + f.plotNo + ' 等 ' + (3 + i) + ' 块田，可现场看土、看四季记录并试报名承包。',
      summaryEn: (3 + i) + ' plots including ' + f.plotNo + ' are open for on-site soil and lease review.' };
  });
  var BOARDS = ['热门田园', '种植经验', '活动', '技术咨询'];
  var TOPIC_T = [
    ['今年崇州的儿菜比去年甜，土里加了什么', 'Sweeter baby mustard in Chongzhou this year'],
    ['B-07 分畦季租半年记', 'Half a year on a shared ridge'],
    ['羊肚菌棚湿度别超过这个值', 'Keep morel shed humidity below this point'],
    ['把会议室搬进田埂旁', 'A meeting room beside the ridge'],
    ['稻茬还田之后第一周', 'The first week after straw return'],
    ['露营营位怎么排不压苗', 'Placing camping pitches without crushing seedlings'],
    ['二荆条育苗的三次间苗', 'Thinning Erjingtiao seedlings three times'],
    ['采摘节的人流动线复盘', 'Harvest day footfall, reviewed'],
    ['紫皮大蒜的冬灌时机', 'Timing winter irrigation for purple garlic'],
    ['给田块编号牌换成耐候材质', 'Weatherproof plot number plates'],
    ['产学研试验田的数据怎么记', 'Recording data in a trial plot'],
    ['婚纱场地的草种选择', 'Grass mix for a wedding lawn']
  ];
  var topics = Array.from({ length: 30 }, function (_, i) {
    var base = TOPIC_T[i % TOPIC_T.length];
    return { id: 'T' + String(i + 1).padStart(3, '0'), board: BOARDS[i % 4],
      titleZh: base[0] + (i >= 12 ? ' · 续 ' + (Math.floor(i / 12) + 1) : ''),
      titleEn: base[1] + (i >= 12 ? ' · follow-up ' + (Math.floor(i / 12) + 1) : ''),
      authorId: 'U' + String((i % 24) + 5).padStart(3, '0'),
      bodyZh: '在' + REGIONS[i % 8] + '的' + farms[i % 24].plotNo + '上，' + base[0] + '。记录时间是 ' + d((i % 11) + 1, (i * 2 % 26) + 1) + '，附田间照片与四季读数，欢迎同田块的田友补充。',
      bodyEn: 'Notes from plot ' + farms[i % 24].plotNo + ' on ' + base[1] + '. Logged ' + d((i % 11) + 1, (i * 2 % 26) + 1) + ' with field photos and seasonal readings.',
      replies: i % 17, likes: 4 + i * 3, publishedAt: d((i % 11) + 1, (i * 2 % 26) + 1),
      tags: [BOARDS[i % 4], pick(CROPS, i)] };
  });
  var EXPERT_N = [['周履田', 'Zhou Lutian'], ['何蕴土', 'He Yuntu'], ['蒋四时', 'Jiang Sishi'], ['蒲稼轩', 'Pu Jiaxuan'],
    ['岑禾', 'Cen He'], ['桑畦', 'Sang Qi'], ['祝墒', 'Zhu Shang'], ['牟穗', 'Mou Sui'],
    ['尹垄', 'Yin Long'], ['骆青苗', 'Luo Qingmiao'], ['聂灌', 'Nie Guan'], ['闻获', 'Wen Huo']];
  var experts = EXPERT_N.map(function (e, i) {
    return { id: 'E' + String(i + 1).padStart(3, '0'), nameZh: e[0], nameEn: e[1],
      title: pick(['土壤与肥力', '设施蔬菜', '水稻栽培', '采后处理', '田间物联', '植保'], i),
      org: pick(['四川农业大学', '省市农科院', '崇州农技站', '闪马田园产学研组'], i),
      points: 2860 - i * 137, rank: i + 1, farmCount: 9 - i % 6,
      processCount: 68 - i * 3, manageYears: 12 - i % 8, avatar: art('experts', 'expert', 'e' + i, 'sq'),
      techPosts: topics.filter(function (x) { return x.board === '技术咨询'; }).slice(0, 3 + i % 4).map(function (x) { return x.id; }),
      bioZh: '长期在' + REGIONS[i % 8] + '做' + pick(['土壤', '蔬菜', '水稻', '植保'], i) + '记录，累计管理 ' + (12 - i % 8) + ' 年，带过 ' + (9 - i % 6) + ' 块共享田。',
      bioEn: e[1] + ' has logged ' + (12 - i % 8) + ' years of field management across shared plots in Sichuan.' };
  });
  /* 十类农事：前九类是田间作业，第十类「专家指导」由产学研团队接单，
     附现场记录与技术结论；类型清单只写这一份，供列表、筛选与创建工单共用。 */
  var JOB_TYPES = ['翻地', '种植', '施肥', '浇水', '除草', '采摘', '回收', '配送', '拍照', '专家指导'];
  /* 固定工单流程：状态字典、顺序、说明只写这一份。
     main=true 为正向主流程，returned 是验收不通过时退回「作业中」的异常分支。
     所有页面的状态徽章、时间线、剩余步骤都由这一份推导，禁止各处另写一套。 */
  var JOB_FLOW = [
    { id: 'open', zh: '待接单', en: 'Open', main: true,
      descZh: '工单已发布并挂到具体田块，等待有资质的农户或团队接单。',
      descEn: 'Published and attached to its plot, waiting for a qualified grower or team.' },
    { id: 'taken', zh: '已接单', en: 'Taken', main: true,
      descZh: '承接人已确认，作业时间窗与明细需求锁定，不可单方面改动。',
      descEn: 'An assignee is confirmed; the time window and requirement lines are locked.' },
    { id: 'working', zh: '作业中', en: 'In progress', main: true,
      descZh: '按明细条目作业，关键节点上传现场照片，变更须在工单对话里留痕。',
      descEn: 'Work follows the requirement lines; field photos are uploaded at key points and changes are logged in chat.' },
    { id: 'review', zh: '待验收', en: 'Awaiting acceptance', main: true,
      descZh: '回执照片与用量说明已提交，等待发布方逐项核对验收标准。',
      descEn: 'Photo receipts and input notes are in; the publisher checks each acceptance criterion.' },
    { id: 'done', zh: '已完成', en: 'Completed', main: true,
      descZh: '验收通过，工单关闭并进入结算队列，作业记录归入田园档案。',
      descEn: 'Accepted and closed; the job enters settlement and its record joins the plot archive.' },
    { id: 'settled', zh: '已结算', en: 'Settled', main: true,
      descZh: '款项按约定结算方式支付完成，工单全流程归档，可导出对账。',
      descEn: 'Payment is made by the agreed method; the full trail is archived and exportable.' },
    { id: 'returned', zh: '已退回', en: 'Returned', main: false,
      descZh: '验收不通过，退回「作业中」补做并重新上传回执，退回原因记入时间线。',
      descEn: 'Acceptance failed: back to in-progress for rework and new receipts, with the reason logged in the timeline.' }
  ];
  var JOB_STATUS = JOB_FLOW.filter(function (x) { return x.main; }).map(function (x) { return x.zh; });
  var PRIORITIES = ['常规', '优先', '紧急'];
  var SETTLE_MODES = ['验收通过后平台结算', '按阶段结算', '月度汇总结算'];
  var REQ_KEYS = [
    ['scope', '作业范围', 'Work scope'], ['window', '作业时间窗', 'Time window'],
    ['acceptance', '验收标准', 'Acceptance criteria'], ['materials', '物料与用量', 'Materials and dosage'],
    ['photos', '拍照回执要求', 'Photo receipts'], ['safety', '安全与注意事项', 'Safety notes'],
    ['budget', '预算与结算', 'Budget and settlement'], ['qualification', '承接资质', 'Assignee qualification'],
    ['priority', '优先级', 'Priority'], ['remark', '备注与变更', 'Notes and changes']
  ];
  function requirementList(w, f, i) {
    var type = w.type, expert = type === '专家指导';
    var vals = [
      [expert ? f.plotNo + ' 全畦及对照区，取样点按试验方案布设' : f.plotNo + ' 全畦，四至以田埂界桩为准',
       expert ? 'Whole plot ' + f.plotNo + ' plus the control strip, sampling points per trial plan' : 'Whole plot ' + f.plotNo + ', bounded by the ridge markers'],
      [w.createdAt + ' 至 ' + w.dueAt + '，避开正午高温与降雨时段',
       w.createdAt + ' to ' + w.dueAt + ', avoiding midday heat and rain'],
      [expert ? '提交现场记录、检测读数与技术结论，逐条对应试验目标' : '作业深度 / 用量达标、畦面无遗漏，回执含全景与近景各一张',
       expert ? 'Field notes, readings and a written conclusion mapped to each trial objective' : 'Depth and dosage met, no skipped strips, one wide and one close photo in the receipt'],
      [expert ? '取样耗材由承接方自备，用量与批号写入现场记录' : '按面积核定用量，作业后填实际用量，剩余物料回收',
       expert ? 'Sampling consumables supplied by the assignee, with dosage and batch in field notes' : 'Dosage based on area, actual use recorded, leftovers returned'],
      ['开工前 / 作业中 / 完成后各 1 张，照片内可见田块编号牌',
       'One photo before, during and after work; the plot number plate must be visible'],
      ['农具使用前检查，未成年人不得进入作业区，雷雨天气顺延并留痕',
       'Check tools before use, keep minors out of the work area, postpone in thunderstorms and log it'],
      ['¥' + w.price + ' · ' + w.settleMode + '，验收通过后进入结算',
       'CNY ' + w.price + ' · ' + w.settleMode + ', settlement starts after acceptance'],
      [expert ? '产学研团队或具备农技资质人员，需有同类试验记录' : '有同类田间作业记录的接单农户',
       expert ? 'Research team or certified agronomist with comparable trial records' : 'Grower with records of the same field operation'],
      [w.priority + (w.priority === '紧急' ? ' · 需 24 小时内响应' : ' · 按约定时间窗响应'),
       w.priority + (w.priority === '紧急' ? ' · respond within 24 hours' : ' · respond within the agreed window')],
      ['细节在工单对话里确认；任何范围、时间或用量变更必须留痕后再执行',
       'Details confirmed in the job chat; any change to scope, timing or dosage is logged before execution']
    ];
    return REQ_KEYS.map(function (k, j) {
      return { key: k[0], labelZh: k[1], labelEn: k[2],
        valueZh: vals[j][0], valueEn: vals[j][1], required: j < 6 };
    });
  }
  var workorders = Array.from({ length: 28 }, function (_, i) {
    var f = farms[i % 24];
    var idx = i % JOB_STATUS.length;
    var returned = i % 9 === 4;           // 部分工单演示「已退回」异常分支
    var statusKey = returned ? 'returned' : JOB_FLOW[idx].id;
    var w = { id: 'W' + String(i + 1).padStart(3, '0'), farmId: f.id,
      userId: 'U' + String((i % 12) + 13).padStart(3, '0'), type: JOB_TYPES[i % JOB_TYPES.length],
      status: returned ? '已退回' : JOB_STATUS[idx], statusKey: statusKey,
      assigneeId: (i % 3 === 0 && idx === 0) ? null : 'U' + String((i % 8) + 25).padStart(3, '0'),
      createdAt: d((i % 11) + 1, (i * 3 % 26) + 1), dueAt: d((i % 11) + 1, (i * 3 % 26) + 4),
      updatedAt: d((i % 11) + 1, (i * 3 % 26) + 3),
      price: 45 + i * 12, chatId: 'C' + String(i + 1).padStart(3, '0'),
      priority: PRIORITIES[i % 3], settleMode: SETTLE_MODES[i % 3],
      photos: [cover('job', i), cover('farm', i + 2)],
      descZh: f.plotNo + ' 需要' + JOB_TYPES[i % JOB_TYPES.length] +
        (JOB_TYPES[i % JOB_TYPES.length] === '专家指导' ? '，请产学研团队到场并附现场记录与技术结论。' : '，作业后请拍照回执并说明用量。'),
      descEn: JOB_TYPES[i % JOB_TYPES.length] + ' requested on plot ' + f.plotNo +
        (JOB_TYPES[i % JOB_TYPES.length] === '专家指导' ? ', with field notes and a written conclusion.' : ', photo receipt required.') };
    /* 固定流程的时间线：只生成当前状态及其之前已发生的步骤，时间与操作人真实分散 */
    var flow = [];
    for (var k = 0; k <= idx; k++) {
      var step = JOB_FLOW[k];
      flow.push({ statusId: step.id, statusZh: step.zh, statusEn: step.en,
        at: d((i % 11) + 1, (i * 3 % 26) + 1 + k),
        by: k === 0 ? w.userId : (w.assigneeId || w.userId),
        noteZh: step.descZh, noteEn: step.descEn });
    }
    if (returned) {
      flow.push({ statusId: 'returned', statusZh: '已退回', statusEn: 'Returned',
        at: w.updatedAt, by: w.userId,
        noteZh: '验收发现回执照片缺近景、用量未填写，退回补做后重新提交。',
        noteEn: 'Acceptance returned it: close-up photo missing and dosage not filled; rework and resubmit.' });
    }
    w.flow = flow;
    w.requirements = requirementList(w, f, i);
    return w;
  });
  var dispatches = workorders.slice(0, 20).map(function (w, i) {
    return { id: 'D' + String(i + 1).padStart(3, '0'), workorderId: w.id,
      region: REGIONS[i % 8], distanceKm: +(1.2 + i * 1.7).toFixed(1), kind: w.type,
      status: w.status, publishedAt: w.createdAt };
  });
  var ORDER_KINDS = ['租赁', '活动', '场地', '农产品'];
  var orders = Array.from({ length: 18 }, function (_, i) {
    return { id: 'O' + String(i + 1).padStart(3, '0'), userId: 'U013',
      farmId: farms[i % 24].id, kind: ORDER_KINDS[i % 4], amount: 180 + i * 136,
      status: pick(['已支付', '待支付', '已完成', '已退款'], i),
      createdAt: d((i % 11) + 1, (i * 5 % 26) + 1),
      items: [farms[i % 24].nameZh + ' · ' + ORDER_KINDS[i % 4]] };
  });
  var ROLES = ['商家集体', '普通用户', '接单农户', '产学研', '管理员'];
  var USER_N = ['田友小林', '红旗村合作社', '老周', '阿蕴', '禾生', '畦上人', '履田', '小满', '阿穗', '青苗'];
  var users = Array.from({ length: 40 }, function (_, i) {
    return { id: 'U' + String(i + 1).padStart(3, '0'),
      nameZh: USER_N[i % 10] + (i >= 10 ? '·' + (Math.floor(i / 10) + 1) : ''),
      nameEn: 'Member ' + (i + 1), role: ROLES[i % 5], region: REGIONS[i % 8],
      avatar: art('account', 'user', 'u' + i, 'sq'), joinedAt: d((i % 11) + 1, (i * 2 % 26) + 1),
      verified: i % 4 !== 0 };
  });
  var COMMENT_BODY = [
    ['土看得见，四季记录也齐，租一畦试试。', 'Soil and seasonal logs are both visible — leasing a ridge.'],
    ['上周去现场看过，田埂修得规整。', 'Visited last week; the ridges are well kept.'],
    ['配送很及时，筐里还带着露水。', 'Delivery was prompt, the crate still had dew on it.'],
    ['希望多放几张冬灌的照片。', 'Would love more winter irrigation photos.'],
    ['会议室配了投影，开会挺合适。', 'The meeting room has a projector — worked well.'],
    ['专家给的湿度建议照做，苗齐了不少。', 'Followed the humidity advice; germination improved.']
  ];
  var comments = Array.from({ length: 60 }, function (_, i) {
    var c = COMMENT_BODY[i % 6];
    return { id: 'M' + String(i + 1).padStart(3, '0'), targetType: pick(['farm', 'activity', 'produce', 'topic'], i),
      targetId: farms[i % 24].id, userId: users[i % 40].id,
      bodyZh: c[0], bodyEn: c[1], rating: 3 + i % 3,
      createdAt: d((i % 11) + 1, (i * 3 % 26) + 1), status: i % 9 === 0 ? '待审' : '已公开' };
  });
  var CHAT_BODY = [
    ['今天下午浇一次，拍两张回执。', 'One irrigation this afternoon, two photos please.'],
    ['收到，B-07 已浇水，照片已上传。', 'Done on B-07, photos uploaded.'],
    ['东侧那畦先别动，明天要取样。', 'Leave the east ridge, sampling tomorrow.'],
    ['明白，取样后我再补肥。', 'Understood, I will fertilise after sampling.'],
    ['采摘的筐子放田头棚里了。', 'Harvest crates are in the field shed.'],
    ['好，配送单我这边确认。', 'Confirmed the delivery order on my side.']
  ];
  var chats = Array.from({ length: 24 }, function (_, i) {
    var c = CHAT_BODY[i % 6];
    return { id: 'C' + String(i + 1).padStart(3, '0'), workorderId: workorders[i % 28].id,
      fromId: i % 2 ? 'U013' : users[(i + 24) % 40].id, toId: i % 2 ? users[(i + 24) % 40].id : 'U013',
      bodyZh: c[0], bodyEn: c[1], at: d((i % 11) + 1, (i * 2 % 26) + 1) + ' ' + String(8 + i % 10).padStart(2, '0') + ':20',
      kind: i % 5 === 0 ? 'photo' : 'text' };
  });
  var plantings = Array.from({ length: 16 }, function (_, i) {
    return { id: 'G' + String(i + 1).padStart(3, '0'), farmId: farms[i % 24].id,
      crop: CROPS[i % 12], stage: pick(['整地', '播种', '出苗', '追肥', '采收', '留种'], i),
      operatorId: users[(i + 24) % 40].id, recordAt: d((i % 11) + 1, (i * 3 % 26) + 1),
      temp: farms[i % 24].temp4[i % 4], humid: farms[i % 24].humid4[i % 4],
      noteZh: '第' + (i + 1) + '次田间记录，' + CROPS[i % 12] + '长势正常，附照片。',
      noteEn: 'Field log ' + (i + 1) + ': ' + CROPS[i % 12] + ' developing normally, photo attached.',
      photos: [cover('planting', i)] };
  });
  var audits = Array.from({ length: 9 }, function (_, i) {
    return { id: 'AU' + String(i + 1).padStart(3, '0'), targetType: pick(['田园信息', '评论', '宣发内容'], i),
      targetId: i % 2 ? farms[i].id : comments[i].id,
      level: pick(['初审', '复审', '终审'], i), status: pick(['待审', '通过', '退回'], i),
      operator: pick(['管理员A', '管理员B', '审核组'], i), at: d((i % 11) + 1, (i * 2 % 26) + 1),
      commentZh: pick(['资料齐全，田块编号与图片一致。', '请补一张冬季田块全景。', '四季读数缺录入人，退回补充。'], i),
      commentEn: pick(['Complete; plot number matches photos.', 'Please add a winter wide shot.', 'Seasonal readings lack an author; returned.'], i) };
  });
  var notices = Array.from({ length: 8 }, function (_, i) {
    return { id: 'N' + String(i + 1).padStart(3, '0'),
      titleZh: pick(['2026 春耕开放日排期公布', '田块编号规则升级', '工单回执照片规范上线', '专家积分口径调整', '露营营位预约开放', '农产品溯源批次可查', '论坛版块新增技术咨询', '冬季灌溉提醒'], i),
      titleEn: pick(['Spring open-day calendar', 'Plot numbering update', 'Job photo receipt standard', 'Expert points revision', 'Camping pitch booking', 'Traceable produce batches', 'New technical Q&A board', 'Winter irrigation reminder'], i),
      bodyZh: '本条为平台公告正文，说明变更内容、生效时间与影响范围，' + d((i % 11) + 1, (i * 3 % 26) + 1) + ' 起执行。',
      bodyEn: 'Platform notice with scope, effective date ' + d((i % 11) + 1, (i * 3 % 26) + 1) + ' and affected records.',
      at: d((i % 11) + 1, (i * 3 % 26) + 1), level: pick(['常规', '重要'], i) };
  });

  var DATA = {
    farms: farms, activities: activities, produces: produces, videos: videos, promos: promos,
    topics: topics, experts: experts, workorders: workorders, dispatches: dispatches,
    orders: orders, users: users, comments: comments, chats: chats,
    plantings: plantings, audits: audits, notices: notices
  };
  function count(name) { return DATA[name] ? DATA[name].length : 0; }
  function byId(name, id) {
    var list = DATA[name] || [];
    for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id)) return list[i]; }
    return null;
  }
  function all(name) { return (DATA[name] || []).slice(); }
  global.SF_MOCK = { data: DATA, IMG: IMG, art: art, ART_TOPICS: ART_TOPICS,
    CAT_TOPIC: CAT_TOPIC, ART_SLOTS: ART_SLOTS, JOB_TYPES: JOB_TYPES,
    JOB_FLOW: JOB_FLOW, JOB_STATUS: JOB_STATUS, REQ_KEYS: REQ_KEYS, PRIORITIES: PRIORITIES, SETTLE_MODES: SETTLE_MODES,
    svgThumb: svgThumb, count: count, byId: byId, all: all };
})(window);
