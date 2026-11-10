/* 闪马田园 SUMFARM · 模拟数据 v1.7.0
   前后端彻底分离：本文件是唯一模拟数据源；真实接入见 api.js。
   图片：13 张成品主视觉 + 10 题材 × 5 规格 = 50 张切图，全部为真实田园成图；
        按 pagename_id 由 art() 统一解析，映射关系只写这一份，见 ART_MATRIX.md。
        功能性图标一律内联 SVG，不换位图；不再使用矢量色卡冒充内容图。
   日期分布 2026-01 ~ 2026-11，逐条字段不重复。 */
(function (global) {
  'use strict';
  var IMG = {
    hero: 'assets/img/home_hero.webp',
    heroM: 'assets/img/home_hero_m.webp',
    field: 'assets/img/bg_field.webp',
    tech: 'assets/img/bg_tech.webp',
    cute: 'assets/img/bg_cute.webp',
    empty: 'assets/img/empty_state.webp',
    farm: 'assets/img/farm_card.webp',
    venue: 'assets/img/activity_venue.webp',
    produce: 'assets/img/produce_basket.webp',
    admin: 'assets/img/admin_bg.webp',
    auth: 'assets/img/auth_side.webp',
    member: 'assets/img/member_card.webp',
    process: 'assets/img/process_steps.webp'
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
    audits: ['expert', 'forum', 'terrace'], notices: ['terrace', 'lawn', 'plain'],
    jobChanges: ['fieldjob', 'plain', 'forum'], refunds: ['harvest', 'lawn', 'plain'],
    contracts: ['plain', 'terrace', 'forum'], contractVersions: ['forum', 'expert', 'plain'],
    bills: ['harvest', 'lawn', 'plain'], reconciliations: ['plain', 'lawn', 'expert'],
    funds: ['fieldjob', 'harvest', 'plain'], withdrawals: ['fieldjob', 'lawn', 'plain'],
    activityVersions: ['lawn', 'camp', 'wedding'], regulations: ['expert', 'greenhouse', 'terrace'],
    plantRecords: ['greenhouse', 'plain', 'fieldjob']
  };
  var CAT_TOPIC = {
    farm: ['plain', 'terrace', 'greenhouse'], venue: ['lawn', 'wedding', 'camp'],
    produce: ['harvest', 'plain', 'greenhouse'], video: ['plain', 'terrace', 'fieldjob'],
    promo: ['terrace', 'plain', 'lawn'], topic: ['forum', 'greenhouse', 'fieldjob'],
    expert: ['expert', 'greenhouse', 'terrace'], job: ['fieldjob', 'plain', 'greenhouse'],
    user: ['forum', 'lawn', 'expert'], chat: ['forum', 'fieldjob', 'greenhouse'],
    planting: ['greenhouse', 'plain', 'terrace'], soil: ['plain', 'terrace', 'fieldjob'],
    job: ['fieldjob', 'plain', 'greenhouse'], bill: ['harvest', 'lawn', 'plain'],
    contract: ['plain', 'terrace', 'forum'], fund: ['fieldjob', 'harvest', 'plain'],
    activity: ['lawn', 'camp', 'wedding'], record: ['greenhouse', 'plain', 'fieldjob'],
    regulation: ['expert', 'greenhouse', 'terrace']
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
    return 'assets/img/art/sub_' + topic + '_' + s + '.webp';
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


  /* ================= 价格公示总账（全站唯一一份） =================
     平台所有业务节点的租金与价格都从这里取，页面不另写金额、不另写口径。
     金额展示单位为元；真实接口沿用 api.js 约定「金额单位分」，展示值 = 分 / 100。
     面积单位亩；计价周期：季 / 月 / 场 / 次 / 小时 / 斤 / 筐 / 份。
     公示期 2026-11-01 ~ 2027-10-31；调价须提前 7 天公示并留历史。
     ================================================================ */
  var PRICE_VERSION = '2026-11';
  var PRICE_PERIOD = { from: '2026-11-01', to: '2027-10-31' };
  var PRICE_CATS = [
    { key: 'lease', zh: '田块承包租金', en: 'Plot lease rent', unit: '元/亩/季', basisZh: '按田块面积 × 当季公示单价，承包类型决定折扣与押金比例', basisEn: 'Area in mu × published seasonal rate; lease type sets discount and deposit' },
    { key: 'venue', zh: '场地租赁', en: 'Venue hire', unit: '元/场', basisZh: '按场地类型与半天/全天时段计，含基础桌椅与田埂通行', basisEn: 'By venue type and half/full day, including basic seating and ridge access' },
    { key: 'activity', zh: '活动报名', en: 'Event sign-up', unit: '元/人', basisZh: '按人计，含田间导览与当季物料；名额以活动页公示为准', basisEn: 'Per person, including guided walk and seasonal materials; seats as published' },
    { key: 'produce', zh: '农产品', en: 'Farm produce', unit: '元/斤', basisZh: '按公示规格单位计，批次溯源号与价签一致', basisEn: 'Per published unit; batch trace number matches the shelf label' },
    { key: 'job', zh: '农事工单服务', en: 'Field work orders', unit: '元/次', basisZh: '按作业类型与田块面积核定，验收通过后进入结算', basisEn: 'By operation type and plot area; settlement starts after acceptance' },
    { key: 'expert', zh: '专家技术指导', en: 'Expert guidance', unit: '元/小时', basisZh: '按现场或远程时长计，含书面技术结论', basisEn: 'By on-site or remote hours, including a written technical conclusion' },
    { key: 'delivery', zh: '配送与回收', en: 'Delivery & return', unit: '元/单', basisZh: '按配送距离与重量阶梯计，回收物料单独列项', basisEn: 'Distance and weight tiers; returned materials itemised separately' },
    { key: 'deposit', zh: '押金与保证金', en: 'Deposit', unit: '元', basisZh: '按租金或场租比例收取，退租验收后原路退还', basisEn: 'A share of rent or venue fee, refunded after inspection on exit' },
    { key: 'service', zh: '平台服务费与结算', en: 'Platform fee & settlement', unit: '%', basisZh: '按订单金额比例计，下单页与结算页同步公示', basisEn: 'A share of order value, shown on both checkout and settlement pages' }
  ];
  /* 价目条目：id / 中英名 / 公示单价 / 单位 / 计价口径 / 适用范围 / 状态。
     租金类（lease）由 farms 的 price 与 areaMu 动态推导，不在此写死田块金额。 */
  var PRICE_ITEMS = [
    { cat: 'lease', id: 'L-01', zh: '整季承包', en: 'Full-season lease', price: 680, unit: '元/亩/季', scopeZh: '整畦自主种植，含灌溉用水', scopeEn: 'Whole strip, self-managed, irrigation included' },
    { cat: 'lease', id: 'L-02', zh: '半年托管', en: 'Half-year stewardship', price: 760, unit: '元/亩/季', scopeZh: '含代管翻地与两次巡田', scopeEn: 'Includes tilling and two field walks' },
    { cat: 'lease', id: 'L-03', zh: '分时认领', en: 'Shared-time claim', price: 880, unit: '元/亩/季', scopeZh: '按周排期，多人共担一畦', scopeEn: 'Weekly slots shared by several members' },
    { cat: 'lease', id: 'L-04', zh: '试验小区', en: 'Trial subplot', price: 950, unit: '元/亩/季', scopeZh: '产学研对照区，含样株记录位', scopeEn: 'Research control strip with plant record slots' },
    { cat: 'lease', id: 'L-05', zh: '冬闲续租', en: 'Winter extension', price: 420, unit: '元/亩/季', scopeZh: '非生长季续租，仅保墒', scopeEn: 'Off-season extension, soil cover only' },
    { cat: 'venue', id: 'V-01', zh: '田头聚会（半天）', en: 'Field gathering · half day', price: 480, unit: '元/场', scopeZh: '长桌、遮阳棚、基础音响', scopeEn: 'Long table, shade canopy, basic speaker' },
    { cat: 'venue', id: 'V-02', zh: '田间会议（半天）', en: 'Field meeting · half day', price: 620, unit: '元/场', scopeZh: '含投影与白板，20 人内', scopeEn: 'Projector and whiteboard, up to 20 people' },
    { cat: 'venue', id: 'V-03', zh: '运动场地（全天）', en: 'Sports field · full day', price: 880, unit: '元/场', scopeZh: '田埂步道与器材位', scopeEn: 'Ridge track and equipment bay' },
    { cat: 'venue', id: 'V-04', zh: '婚纱场地（全天）', en: 'Wedding lawn · full day', price: 1680, unit: '元/场', scopeZh: '草坪拱门位与拍摄动线', scopeEn: 'Lawn arch position and photo route' },
    { cat: 'venue', id: 'V-05', zh: '露营营位（每夜）', en: 'Camping pitch · per night', price: 220, unit: '元/营位/夜', scopeZh: '含营位与公共洗漱，不含装备', scopeEn: 'Pitch and shared wash area, gear excluded' },
    { cat: 'venue', id: 'V-06', zh: '农家菜单（每桌）', en: 'Farm table · per table', price: 380, unit: '元/桌', scopeZh: '当季菜蔬，十人桌', scopeEn: 'Seasonal vegetables, table of ten' },
    { cat: 'activity', id: 'A-01', zh: '田园导览', en: 'Guided field walk', price: 38, unit: '元/人', scopeZh: '约 90 分钟，含讲解与试吃', scopeEn: 'About 90 minutes with tasting' },
    { cat: 'activity', id: 'A-02', zh: '当季采摘', en: 'Seasonal picking', price: 68, unit: '元/人', scopeZh: '含 2 斤带走额度', scopeEn: 'Includes 2 jin to take home' },
    { cat: 'activity', id: 'A-03', zh: '亲子研学', en: 'Family study tour', price: 128, unit: '元/人', scopeZh: '含育苗盆与课程材料', scopeEn: 'Seedling pot and course materials included' },
    { cat: 'activity', id: 'A-04', zh: '田埂露营夜', en: 'Ridge camping night', price: 198, unit: '元/人', scopeZh: '含营位与早餐', scopeEn: 'Pitch and breakfast included' },
    { cat: 'produce', id: 'P-01', zh: '当季蔬菜', en: 'Seasonal vegetables', price: 12, unit: '元/斤', scopeZh: '按批次溯源，价签随批次', scopeEn: 'Batch traced; label follows the batch' },
    { cat: 'produce', id: 'P-02', zh: '羊肚菌（鲜）', en: 'Fresh morel', price: 128, unit: '元/斤', scopeZh: '限量批次，需预约', scopeEn: 'Limited batch, reservation required' },
    { cat: 'produce', id: 'P-03', zh: '新米', en: 'New rice', price: 18, unit: '元/斤', scopeZh: '当年新谷，5 斤起', scopeEn: 'Current harvest, minimum 5 jin' },
    { cat: 'produce', id: 'P-04', zh: '竹筐时令包', en: 'Seasonal crate', price: 98, unit: '元/筐', scopeZh: '混装 6~8 种，随季调整', scopeEn: 'Six to eight kinds, changes with the season' },
    { cat: 'job', id: 'J-01', zh: '翻地', en: 'Tilling', price: 120, unit: '元/亩/次', scopeZh: '含畦面平整', scopeEn: 'Includes levelling the strip' },
    { cat: 'job', id: 'J-02', zh: '种植 / 播种', en: 'Sowing', price: 150, unit: '元/亩/次', scopeZh: '不含种苗', scopeEn: 'Seedlings excluded' },
    { cat: 'job', id: 'J-03', zh: '施肥', en: 'Fertilising', price: 90, unit: '元/亩/次', scopeZh: '按测土用量，肥料另计', scopeEn: 'Soil-test dosage; fertiliser billed separately' },
    { cat: 'job', id: 'J-04', zh: '浇水', en: 'Watering', price: 60, unit: '元/亩/次', scopeZh: '含灌溉用水', scopeEn: 'Irrigation water included' },
    { cat: 'job', id: 'J-05', zh: '除草', en: 'Weeding', price: 100, unit: '元/亩/次', scopeZh: '人工除草，不含药剂', scopeEn: 'Manual weeding, no chemicals' },
    { cat: 'job', id: 'J-06', zh: '采摘', en: 'Harvesting', price: 180, unit: '元/亩/次', scopeZh: '含初筛与装筐', scopeEn: 'Includes sorting and crating' },
    { cat: 'job', id: 'J-07', zh: '回收清畦', en: 'Plot clearance', price: 110, unit: '元/亩/次', scopeZh: '秸秆与物料归集', scopeEn: 'Stalks and materials collected' },
    { cat: 'job', id: 'J-08', zh: '田头拍照回执', en: 'Field photo receipt', price: 30, unit: '元/次', scopeZh: '开工 / 作业中 / 完成各一张', scopeEn: 'Before, during and after photos' },
    { cat: 'expert', id: 'E-01', zh: '远程技术咨询', en: 'Remote consultation', price: 160, unit: '元/小时', scopeZh: '含书面答复与资料清单', scopeEn: 'Written answer and reading list included' },
    { cat: 'expert', id: 'E-02', zh: '现场技术指导', en: 'On-site guidance', price: 380, unit: '元/小时', scopeZh: '不含差旅，2 小时起', scopeEn: 'Travel excluded, minimum two hours' },
    { cat: 'expert', id: 'E-03', zh: '种植试验方案', en: 'Field trial plan', price: 880, unit: '元/份', scopeZh: '含对照区设计与读数表', scopeEn: 'Control-strip design and reading sheet included' },
    { cat: 'delivery', id: 'D-01', zh: '同城配送（10km 内）', en: 'Local delivery · within 10 km', price: 18, unit: '元/单', scopeZh: '当日达，5 斤内', scopeEn: 'Same day, up to 5 jin' },
    { cat: 'delivery', id: 'D-02', zh: '同城配送（10~30km）', en: 'Local delivery · 10–30 km', price: 32, unit: '元/单', scopeZh: '次日达，10 斤内', scopeEn: 'Next day, up to 10 jin' },
    { cat: 'delivery', id: 'D-03', zh: '物料回收', en: 'Material return', price: 25, unit: '元/次', scopeZh: '农具与剩余物料回库', scopeEn: 'Tools and leftover materials returned' },
    { cat: 'deposit', id: 'S-01', zh: '田块承包押金', en: 'Plot lease deposit', price: 30, unit: '% 一季租金', scopeZh: '退租验收后 7 个工作日内原路退还', scopeEn: 'Refunded within 7 working days after exit inspection' },
    { cat: 'deposit', id: 'S-02', zh: '场地使用保证金', en: 'Venue damage deposit', price: 500, unit: '元/场', scopeZh: '场地无损即退', scopeEn: 'Refunded if the venue is left intact' },
    { cat: 'service', id: 'F-01', zh: '平台服务费', en: 'Platform service fee', price: 2, unit: '% 订单金额', scopeZh: '租赁 / 场地 / 农产品订单统一口径', scopeEn: 'Same rate on lease, venue and produce orders' },
    { cat: 'service', id: 'F-02', zh: '工单结算服务费', en: 'Work-order settlement fee', price: 1, unit: '% 工单金额', scopeZh: '验收通过后随工单结算', scopeEn: 'Charged with the order after acceptance' },
    { cat: 'service', id: 'F-03', zh: '退租未使用租金折算', en: 'Unused rent refund', price: 100, unit: '% 未使用周期', scopeZh: '按未使用整季比例折算，不计息', scopeEn: 'Pro-rated by unused full season, no interest' }
  ];
  /* 公示规则：真答案，不是问题翻译 */
  var PRICE_RULES = [
    { zh: '明码标价：所有租金与价格在下单前公示，页面展示金额即为应付金额，不另收未列明费用。',
      en: 'Up-front pricing: every rent and fee is published before checkout. The amount shown is the amount payable, with no unlisted charges.' },
    { zh: '田块租金按「亩 × 当季单价 × 承包季数」计算；面积以田园档案的实测亩数为准，承包类型决定折扣。',
      en: 'Plot rent is area in mu times the seasonal rate times the number of seasons. Area comes from the measured plot record; the lease type sets the discount.' },
    { zh: '调价须提前 7 天在「调价公示历史」发布，已下单的订单按原价执行到本周期结束。',
      en: 'Rate changes are published seven days in advance in the change log. Orders already placed keep the old rate until their term ends.' },
    { zh: '押金、保证金与平台服务费分别列项，不并入租金；退租验收后按公示时限原路退还。',
      en: 'Deposits, damage bonds and platform fees are itemised separately from rent and refunded within the published window after inspection.' },
    { zh: '工单服务价按作业类型与田块面积核定，验收通过后进入结算；未验收不产生应付金额。',
      en: 'Field-work fees are set by operation type and plot area. Nothing becomes payable until the work is accepted.' },
    { zh: '农产品价随批次公示，溯源号与价签一致；配送按距离与重量阶梯单独列项。',
      en: 'Produce prices are published per batch, with the trace number matching the shelf label. Delivery is itemised by distance and weight tier' }
  ];
  var PRICE_CHANGES = [
    { id: 'CH-08', at: '2026-11-01', itemZh: '整季承包', itemEn: 'Full-season lease', before: 640, after: 680, unit: '元/亩/季', reasonZh: '灌溉水费与冬闲保墒成本调整', reasonEn: 'Irrigation and winter soil-cover costs revised', days: 7 },
    { id: 'CH-07', at: '2026-10-08', itemZh: '露营营位', itemEn: 'Camping pitch', before: 190, after: 220, unit: '元/营位/夜', reasonZh: '新增公共洗漱与夜间值守', reasonEn: 'Shared wash area and night watch added', days: 7 },
    { id: 'CH-06', at: '2026-09-12', itemZh: '现场技术指导', itemEn: 'On-site guidance', before: 340, after: 380, unit: '元/小时', reasonZh: '含书面技术结论与读数表', reasonEn: 'Written conclusion and reading sheet now included', days: 7 },
    { id: 'CH-05', at: '2026-08-20', itemZh: '同城配送（10km 内）', itemEn: 'Local delivery · within 10 km', before: 15, after: 18, unit: '元/单', reasonZh: '冷链包装成本调整', reasonEn: 'Cool-chain packaging cost revised', days: 7 },
    { id: 'CH-04', at: '2026-07-03', itemZh: '婚纱场地', itemEn: 'Wedding lawn', before: 1480, after: 1680, unit: '元/场', reasonZh: '新增拱门位与拍摄动线维护', reasonEn: 'Arch position and photo route maintenance added', days: 7 },
    { id: 'CH-03', at: '2026-05-16', itemZh: '采摘工单', itemEn: 'Harvesting', before: 160, after: 180, unit: '元/亩/次', reasonZh: '含初筛与装筐工序', reasonEn: 'Sorting and crating now included', days: 7 },
    { id: 'CH-02', at: '2026-03-28', itemZh: '平台服务费', itemEn: 'Platform service fee', before: 3, after: 2, unit: '% 订单金额', reasonZh: '让利于村集体与长期承包用户', reasonEn: 'Reduced for collectives and long-term leaseholders', days: 7 },
    { id: 'CH-01', at: '2026-01-10', itemZh: '竹筐时令包', itemEn: 'Seasonal crate', before: 88, after: 98, unit: '元/筐', reasonZh: '混装品类由 5 种增至 6~8 种', reasonEn: 'Mixed kinds raised from five to six–eight', days: 7 }
  ];
  /* 频道 → 关联价目类目：公共关系只写这一份，全站挂接与公示页共用。 */
  var PRICE_CHANNEL_CATS = {
    farms: ['lease', 'deposit', 'service'], activity: ['venue', 'activity', 'deposit'],
    produce: ['produce', 'delivery', 'service'], dispatch: ['job', 'expert', 'service'],
    experts: ['expert', 'job', 'service'], forum: ['lease', 'service'],
    account: ['lease', 'venue', 'produce', 'job', 'service'],
    home: ['lease', 'venue', 'produce', 'job', 'expert'],
    public: ['lease', 'venue', 'produce', 'job', 'expert', 'service'],
    pricebook: ['lease', 'venue', 'activity', 'produce', 'job', 'expert', 'delivery', 'deposit', 'service'],
    admin: ['lease', 'venue', 'activity', 'produce', 'job', 'expert', 'delivery', 'deposit', 'service'],
    aftersale: ['job', 'service', 'deposit'], contract: ['lease', 'deposit', 'service'],
    finance: ['job', 'service', 'delivery'], operation: ['activity', 'venue', 'deposit', 'service'],
    research: ['expert', 'job', 'produce']
  };
  /* 承包类型系数：与 lease 类目公示单价同一套口径，试算器据此折算当季单价，
     公共关系只写一份；factor 由该类型公示单价 / 整季承包基准价推导。 */
  var PRICE_LEASE_FACTORS = [
    { id: 'L-01', zh: '整季承包', en: 'Full-season lease', factor: 1.00 },
    { id: 'L-02', zh: '半年托管', en: 'Half-year stewardship', factor: 1.12 },
    { id: 'L-03', zh: '分时认领', en: 'Shared-time claim', factor: 1.29 },
    { id: 'L-04', zh: '试验小区', en: 'Trial subplot', factor: 1.40 },
    { id: 'L-05', zh: '冬闲续租', en: 'Winter extension', factor: 0.62 }
  ];
  function priceChannel(file) {
    var f = String(file || '');
    if (f.indexOf('admin/') === 0) return 'admin';
    if (f.indexOf('price') === 0) return 'pricebook';
    if (f === 'index.html') return 'home';
    if (f.indexOf('farm') === 0) return 'farms';
    if (f.indexOf('activity') === 0 || f.indexOf('venue-') === 0) return 'activity';
    if (f.indexOf('produce') === 0) return 'produce';
    if (f.indexOf('dispatch') === 0 || f.indexOf('workorder') === 0 || f.indexOf('job-') === 0) return 'dispatch';
    if (f.indexOf('expert') === 0) return 'experts';
    if (f.indexOf('forum') === 0) return 'forum';
    if (f.indexOf('account') === 0 || f.indexOf('orders') === 0) return 'account';
    if (f.indexOf('workorder-cancel') === 0 || f.indexOf('workorder-refund') === 0 ||
        f.indexOf('workorder-edit') === 0 || f.indexOf('workorder-reopen') === 0 ||
        f.indexOf('workorder-changes') === 0 || f.indexOf('refund') === 0) return 'aftersale';
    if (f.indexOf('contract') === 0 || f.indexOf('lease-edit') === 0 ||
        f.indexOf('merchant-reconcile') === 0 || f.indexOf('merchant-bills') === 0) return 'contract';
    if (f.indexOf('farmer-') === 0 || f.indexOf('withdraw') === 0 || f.indexOf('fund') === 0) return 'finance';
    if (f.indexOf('activity-manage') === 0 || f.indexOf('activity-publish') === 0 ||
        f.indexOf('activity-edit') === 0 || f.indexOf('activity-versions') === 0 ||
        f.indexOf('activity-registrations') === 0) return 'operation';
    if (f.indexOf('expert-stats') === 0 || f.indexOf('expert-compare') === 0 ||
        f.indexOf('expert-regulation') === 0 || f.indexOf('expert-planting') === 0) return 'research';
    return 'public';
  }
  function priceCats(file) { return PRICE_CHANNEL_CATS[priceChannel(file)] || PRICE_CHANNEL_CATS.public; }
  function priceItems(catKeys) {
    var ks = catKeys || [];
    return PRICE_ITEMS.filter(function (x) { return ks.indexOf(x.cat) >= 0; });
  }
  /* 公示统计：所有数量文案由数据动态算，禁止写死。 */
  function priceStats() {
    var rents = farms.map(function (f) { return +(f.price * f.areaMu).toFixed(0); });
    return {
      cats: PRICE_CATS.length, items: PRICE_ITEMS.length,
      rules: PRICE_RULES.length, changes: PRICE_CHANGES.length,
      plots: farms.length, rentMin: Math.min.apply(null, rents), rentMax: Math.max.apply(null, rents),
      rateMin: Math.min.apply(null, farms.map(function (f) { return f.price; })),
      rateMax: Math.max.apply(null, farms.map(function (f) { return f.price; })),
      version: PRICE_VERSION, from: PRICE_PERIOD.from, to: PRICE_PERIOD.to
    };
  }
  /* 详情页「本单价格构成」：按 URL 参数 id 取真实记录后动态算，禁止静态写死。
     返回行数组 [{ zh, en, amountZh, amountEn, noteZh, noteEn }]，金额均为展示单位元。 */
  function priceBreakdown(ds, id) {
    var r = byId(ds, id);
    if (!r) return [];
    var rows = [];
    if (ds === 'farms') {
      var season = +(r.price * r.areaMu).toFixed(0);
      var dep = +(season * 0.30).toFixed(0);
      var fee = +(season * 0.02).toFixed(0);
      rows = [
        { zh: '当季公示单价', en: 'Published seasonal rate', amountZh: '¥' + r.price + ' / 亩 / 季', amountEn: 'CNY ' + r.price + ' / mu / season', noteZh: '承包类型：' + r.leaseType, noteEn: 'Lease type: ' + r.leaseType },
        { zh: '实测面积', en: 'Measured area', amountZh: r.areaMu + ' 亩', amountEn: r.areaMu + ' mu', noteZh: '以田园档案登记为准', noteEn: 'From the plot archive' },
        { zh: '一季租金', en: 'One-season rent', amountZh: '¥' + season, amountEn: 'CNY ' + season, noteZh: r.price + ' × ' + r.areaMu + ' 亩', noteEn: r.price + ' × ' + r.areaMu + ' mu' },
        { zh: '承包押金（30%）', en: 'Lease deposit (30%)', amountZh: '¥' + dep, amountEn: 'CNY ' + dep, noteZh: '退租验收后原路退还', noteEn: 'Refunded after exit inspection' },
        { zh: '平台服务费（2%）', en: 'Platform fee (2%)', amountZh: '¥' + fee, amountEn: 'CNY ' + fee, noteZh: '单列，不并入租金', noteEn: 'Itemised, not part of rent' },
        { zh: '首期应付合计', en: 'Total due at signing', amountZh: '¥' + (season + dep + fee), amountEn: 'CNY ' + (season + dep + fee), noteZh: '租金 + 押金 + 服务费', noteEn: 'Rent + deposit + service fee' }
      ];
    } else if (ds === 'activities') {
      rows = [
        { zh: '活动报名公示价', en: 'Published sign-up price', amountZh: '¥' + r.price + ' / 人', amountEn: 'CNY ' + r.price + ' / person', noteZh: r.kind + ' · ' + r.date, noteEn: r.kind + ' · ' + r.date },
        { zh: '场地使用保证金', en: 'Venue damage deposit', amountZh: '¥500 / 场', amountEn: 'CNY 500 / event', noteZh: '场地无损即退', noteEn: 'Refunded if left intact' },
        { zh: '平台服务费（2%）', en: 'Platform fee (2%)', amountZh: '¥' + (r.price * 0.02).toFixed(1), amountEn: 'CNY ' + (r.price * 0.02).toFixed(1), noteZh: '按单人报名金额计', noteEn: 'On one sign-up' }
      ];
    } else if (ds === 'produces') {
      rows = [
        { zh: '公示单价', en: 'Published unit price', amountZh: '¥' + r.price + ' / ' + r.unit, amountEn: 'CNY ' + r.price + ' / ' + r.unit, noteZh: '批次 ' + r.traceNo, noteEn: 'Batch ' + r.traceNo },
        { zh: '当前库存', en: 'Stock on hand', amountZh: r.stock + r.unit, amountEn: r.stock + ' ' + r.unit, noteZh: '按批次实时更新', noteEn: 'Updated per batch' },
        { zh: '整批货值', en: 'Whole-batch value', amountZh: '¥' + (r.price * r.stock), amountEn: 'CNY ' + (r.price * r.stock), noteZh: r.price + ' × ' + r.stock + r.unit, noteEn: r.price + ' × ' + r.stock + ' units' },
        { zh: '同城配送', en: 'Local delivery', amountZh: '¥18 / 单', amountEn: 'CNY 18 / order', noteZh: '10km 内，5 斤内', noteEn: 'Within 10 km, up to 5 jin' }
      ];
    } else if (ds === 'workorders') {
      rows = [
        { zh: '工单公示价', en: 'Published work-order price', amountZh: '¥' + r.price, amountEn: 'CNY ' + r.price, noteZh: r.type + ' · ' + r.settleMode, noteEn: r.type + ' · ' + r.settleMode },
        { zh: '平台结算服务费（1%）', en: 'Settlement fee (1%)', amountZh: '¥' + (r.price * 0.01).toFixed(1), amountEn: 'CNY ' + (r.price * 0.01).toFixed(1), noteZh: '验收通过后随工单结算', noteEn: 'Charged after acceptance' },
        { zh: '验收后应付', en: 'Payable after acceptance', amountZh: '¥' + (r.price * 1.01).toFixed(1), amountEn: 'CNY ' + (r.price * 1.01).toFixed(1), noteZh: '未验收不产生应付金额', noteEn: 'Nothing payable before acceptance' }
      ];
    } else if (ds === 'experts') {
      rows = [
        { zh: '远程咨询公示价', en: 'Remote consultation rate', amountZh: '¥160 / 小时', amountEn: 'CNY 160 / hour', noteZh: '含书面答复', noteEn: 'Written answer included' },
        { zh: '现场指导公示价', en: 'On-site guidance rate', amountZh: '¥380 / 小时', amountEn: 'CNY 380 / hour', noteZh: '2 小时起，差旅另计', noteEn: 'Minimum two hours, travel excluded' },
        { zh: '试验方案', en: 'Field trial plan', amountZh: '¥880 / 份', amountEn: 'CNY 880 / plan', noteZh: '含对照区设计', noteEn: 'Control-strip design included' }
      ];
    } else if (ds === 'orders') {
      rows = [
        { zh: '订单金额', en: 'Order amount', amountZh: '¥' + r.amount, amountEn: 'CNY ' + r.amount, noteZh: r.kind + ' · ' + r.status, noteEn: r.kind + ' · ' + r.status },
        { zh: '平台服务费（2%）', en: 'Platform fee (2%)', amountZh: '¥' + (r.amount * 0.02).toFixed(1), amountEn: 'CNY ' + (r.amount * 0.02).toFixed(1), noteZh: '已含在订单金额内', noteEn: 'Included in the order amount' },
        { zh: '关联田园', en: 'Linked plot', amountZh: r.farmId, amountEn: r.farmId, noteZh: '租金口径见田块公示', noteEn: 'See the plot rate sheet for rent' }
      ];
    }
    return rows;
  }
  var PRICE_BOOK = {
    version: PRICE_VERSION, period: PRICE_PERIOD, cats: PRICE_CATS, items: PRICE_ITEMS,
    rules: PRICE_RULES, changes: PRICE_CHANGES, channelCats: PRICE_CHANNEL_CATS,
    leaseFactors: PRICE_LEASE_FACTORS,
    channel: priceChannel, catsFor: priceCats, itemsFor: priceItems,
    stats: priceStats, breakdown: priceBreakdown
  };


  /* ================= 用户级常规业务数据集（第 33 轮） =================
     这些不是展示用的装饰数据：取消/退款/改单/重发、合同版本与对账、
     农户资金与提现、商家活动运营、专家统计调控与种植记录查询，
     每一类都由真实业务动作产生，金额一律由记录算，不写死。 */
  var CHANGE_KINDS = ['取消工单', '修改工单', '重新发起'];
  var CHANGE_EN = ['Cancelled', 'Amended', 'Reissued'];
  var CANCEL_WHY = [
    ['农时提前，地块已自行处理，不再需要外派', 'Season moved forward; the plot was handled in-house'],
    ['承接人超时未确认，改由村集体统一安排', 'Assignee did not confirm in time; the collective took over'],
    ['验收标准写错，需要改成按畦核对', 'Acceptance criteria were wrong; switching to per-strip checks'],
    ['期望日期与降雨冲突，顺延后重发', 'Requested date clashed with rain; reissued with a later window']
  ];
  var jobChanges = Array.from({ length: 18 }, function (_, i) {
    var w = workorders[i % workorders.length], c = CANCEL_WHY[i % 4];
    return { id: 'JC' + String(i + 1).padStart(3, '0'), workorderId: w.id, farmId: w.farmId,
      kind: CHANGE_KINDS[i % 3], kindEn: CHANGE_EN[i % 3],
      fromStatus: w.status, toStatus: i % 3 === 0 ? '已取消' : (i % 3 === 1 ? '待接单（已修订）' : '待接单（新单）'),
      reasonZh: c[0], reasonEn: c[1], operator: users[(i % 8) + 12].nameZh,
      at: d((i % 11) + 1, (i * 5 % 26) + 1), amountImpact: i % 3 === 0 ? -(w.price * 0.3).toFixed(1) : 0,
      relatedId: i % 3 === 2 ? 'W' + String(901 + i).padStart(3, '0') : w.id };
  });
  var REFUND_ST = ['待平台核对', '核对通过', '原路退回中', '已到账', '已驳回'];
  var REFUND_EN = ['Awaiting review', 'Review passed', 'Refund in transit', 'Credited', 'Rejected'];
  var refunds = Array.from({ length: 14 }, function (_, i) {
    var w = workorders[i % workorders.length], o = orders[i % orders.length];
    var paid = o.amount, used = Math.round(paid * (0.1 + (i % 4) * 0.12));
    var fee = +(paid * 0.02).toFixed(1), back = +(paid - used - fee).toFixed(1);
    return { id: 'RF' + String(i + 1).padStart(3, '0'), orderId: o.id, workorderId: w.id,
      farmId: w.farmId, userId: w.userId, amountPaid: paid, usedAmount: used,
      serviceFee: fee, refundAmount: back, method: ['原支付渠道', '平台余额', '村集体统一结算'][i % 3],
      methodEn: ['Original payment method', 'Platform balance', 'Collective settlement'][i % 3],
      status: REFUND_ST[i % 5], statusEn: REFUND_EN[i % 5],
      reasonZh: CANCEL_WHY[i % 4][0], reasonEn: CANCEL_WHY[i % 4][1],
      appliedAt: d((i % 11) + 1, (i * 3 % 26) + 2), settledAt: d((i % 11) + 1, (i * 3 % 26) + 9),
      flow: [
        { zh: '提交退款申请', en: 'Request submitted', at: d((i % 11) + 1, (i * 3 % 26) + 2) },
        { zh: '平台核对已作业金额与公示价', en: 'Platform checks delivered work against published rates', at: d((i % 11) + 1, (i * 3 % 26) + 4) },
        { zh: '按原渠道发起退回', en: 'Refund sent to the original method', at: d((i % 11) + 1, (i * 3 % 26) + 6) },
        { zh: '到账并写入资金流水', en: 'Credited and written to the fund ledger', at: d((i % 11) + 1, (i * 3 % 26) + 9) }
      ] };
  });
  var CONTRACT_ST = ['生效中', '待双方确认', '变更审核中', '已到期', '已终止'];
  var CONTRACT_EN = ['In force', 'Awaiting signatures', 'Amendment under review', 'Expired', 'Terminated'];
  var contracts = Array.from({ length: 16 }, function (_, i) {
    var f = farms[i % 24], season = Math.round(f.price * f.areaMu);
    return { id: 'CT' + String(i + 1).padStart(3, '0'), farmId: f.id, plotNo: f.plotNo,
      version: 'v' + (1 + i % 3) + '.' + (i % 4), leaseType: f.leaseType,
      start: f.leaseStart, end: f.leaseEnd, rentPerSeason: season, seasons: 1 + i % 2,
      deposit: Math.round(season * 0.3), serviceFee: +(season * 0.02).toFixed(1),
      status: CONTRACT_ST[i % 5], statusEn: CONTRACT_EN[i % 5],
      signedAt: d((i % 11) + 1, (i * 7 % 26) + 1), ownerId: f.ownerId,
      clausesZh: ['实测面积 ' + f.areaMu + ' 亩，按公示单价 ' + f.price + ' 元/亩/季计租',
        '押金为一季租金的 30%，退租验收后 7 个工作日内原路退还',
        '灌溉用水与田埂通行包含在租金内，农具与种苗另行列项',
        '转租、改变田块用途或搭建固定设施须提前书面报备',
        '争议先由村集体协调，协商不成按平台公示规则处理'],
      clausesEn: ['Measured area ' + f.areaMu + ' mu at the published rate of CNY ' + f.price + ' / mu / season',
        'Deposit equals 30% of one season, refunded within 7 working days after exit inspection',
        'Irrigation water and ridge access are included; tools and seedlings are itemised separately',
        'Subletting, change of use or permanent structures require prior written notice',
        'Disputes go to the collective first, then to the published platform rules'] };
  });
  var CLAUSE_KEYS = [['rent', '租金与计价'], ['deposit', '押金与退还'], ['water', '灌溉与通行'],
    ['use', '用途与转租'], ['dispute', '争议处理']];
  var contractVersions = Array.from({ length: 24 }, function (_, i) {
    var c = contracts[i % contracts.length], k = CLAUSE_KEYS[i % 5];
    return { id: 'CV' + String(i + 1).padStart(3, '0'), contractId: c.id, farmId: c.farmId,
      version: 'v' + (1 + Math.floor(i / 5)) + '.' + (i % 4), clauseKey: k[0], clauseZh: k[1],
      clauseEn: ['Rent & pricing', 'Deposit & refund', 'Irrigation & access', 'Use & subletting', 'Disputes'][i % 5],
      beforeZh: c.clausesZh[i % 5].replace('30%', '25%').replace('7 个工作日', '10 个工作日'),
      beforeEn: c.clausesEn[i % 5].replace('30%', '25%').replace('7 working days', '10 working days'),
      afterZh: c.clausesZh[i % 5], afterEn: c.clausesEn[i % 5],
      changedBy: c.ownerId, at: d((i % 11) + 1, (i * 3 % 26) + 3),
      reasonZh: ['公示价调整后同步条款', '退租验收时限按公示规则修订', '补充灌溉用水口径', '明确转租报备范围', '统一争议协调层级'][i % 5],
      reasonEn: ['Clause synced after a published rate change', 'Exit-inspection window revised to match published rules',
        'Irrigation scope clarified', 'Subletting notice scope specified', 'Dispute escalation unified'][i % 5] };
  });
  var BILL_KINDS = ['田块租金', '场地使用', '活动报名', '农产品', '农事工单'];
  var BILL_EN = ['Plot rent', 'Venue hire', 'Event sign-up', 'Produce', 'Field work'];
  var bills = Array.from({ length: 24 }, function (_, i) {
    var f = farms[i % 24], gross = 180 + i * 47;
    var fee = +(gross * 0.02).toFixed(1), refund = i % 6 === 0 ? Math.round(gross * 0.3) : 0;
    return { id: 'BL' + String(i + 1).padStart(3, '0'), period: '2026-' + String((i % 11) + 1).padStart(2, '0'),
      farmId: f.id, kind: BILL_KINDS[i % 5], kindEn: BILL_EN[i % 5],
      receivable: gross, received: gross - refund, serviceFee: fee, refunded: refund,
      net: +(gross - fee - refund).toFixed(1), status: refund ? '含退款' : (i % 4 === 0 ? '待核对' : '已核对'),
      statusEn: refund ? 'Includes refund' : (i % 4 === 0 ? 'To be checked' : 'Reconciled'),
      at: d((i % 11) + 1, (i * 5 % 26) + 1) };
  });
  var reconciliations = Array.from({ length: 12 }, function (_, i) {
    var set = bills.filter(function (b) { return b.period === '2026-' + String(i + 1).padStart(2, '0'); });
    var gross = set.reduce(function (n, b) { return n + b.receivable; }, 0);
    var fee = set.reduce(function (n, b) { return n + b.serviceFee; }, 0);
    var refund = set.reduce(function (n, b) { return n + b.refunded; }, 0);
    return { id: 'RC' + String(i + 1).padStart(3, '0'), period: '2026-' + String(i + 1).padStart(2, '0'),
      subject: ['红旗村合作社', '道明竹艺田畈', '唐昌韭黄老圃', '李庄共享田园'][i % 4],
      orders: set.length, gross: gross, fee: +fee.toFixed(1), refunded: refund,
      net: +(gross - fee - refund).toFixed(1),
      status: i % 3 === 0 ? '待双方确认' : '已确认', statusEn: i % 3 === 0 ? 'Awaiting confirmation' : 'Confirmed',
      checkedAt: d(i + 1, 26) };
  });
  var FUND_KINDS = ['工单结算', '活动分成', '农产品货款', '平台服务费', '退款扣回', '提现'];
  var FUND_EN = ['Job settlement', 'Event share', 'Produce payment', 'Platform fee', 'Refund deduction', 'Withdrawal'];
  var funds = Array.from({ length: 30 }, function (_, i) {
    var kind = FUND_KINDS[i % 6], out = kind === '平台服务费' || kind === '退款扣回' || kind === '提现';
    /* 支出按收入的一定比例发生，保证「可提现余额」始终为正：
       否则农户资金总览会显示负数，任何提现都会被边界校验拦下，业务不成立。 */
    var base = 120 + i * 31;
    var amt = out ? -Math.round(base * 0.28) : base;
    return { id: 'FD' + String(i + 1).padStart(3, '0'), userId: 'U025', kind: kind, kindEn: FUND_EN[i % 6],
      amount: amt, balanceAfter: 0, status: i % 7 === 0 ? '处理中' : '已入账',
      statusEn: i % 7 === 0 ? 'Processing' : 'Posted', relatedId: i % 6 === 0 ? workorders[i % 28].id : orders[i % 18].id,
      at: d((i % 11) + 1, (i * 3 % 26) + 1) };
  });
  (function () { var bal = 0; funds.forEach(function (f) { bal += f.amount; f.balanceAfter = +bal.toFixed(1); }); })();
  var WITHDRAW_ST = ['待平台复核', '复核通过', '银行处理中', '已到账', '已驳回'];
  var WITHDRAW_EN = ['Awaiting review', 'Review passed', 'Bank processing', 'Credited', 'Rejected'];
  var withdrawals = Array.from({ length: 12 }, function (_, i) {
    var amt = 200 + i * 180, fee = 2;
    return { id: 'WD' + String(i + 1).padStart(3, '0'), userId: 'U025', amount: amt, fee: fee,
      arrive: amt - fee, bank: ['尾号 4472 · 农商行', '尾号 8810 · 邮储', '尾号 2093 · 建行'][i % 3],
      bankEn: ['Rural commercial bank ···4472', 'Postal savings ···8810', 'Construction bank ···2093'][i % 3],
      status: WITHDRAW_ST[i % 5], statusEn: WITHDRAW_EN[i % 5],
      appliedAt: d((i % 11) + 1, (i * 3 % 26) + 2),
      flow: [
        { zh: '提交提现申请', en: 'Withdrawal requested', at: d((i % 11) + 1, (i * 3 % 26) + 2) },
        { zh: '平台复核可提现余额与工单状态', en: 'Platform checks available balance and job status', at: d((i % 11) + 1, (i * 3 % 26) + 3) },
        { zh: '银行处理', en: 'Bank processing', at: d((i % 11) + 1, (i * 3 % 26) + 5) },
        { zh: '到账并写入资金流水', en: 'Credited and written to the fund ledger', at: d((i % 11) + 1, (i * 3 % 26) + 7) }
      ] };
  });
  var ACT_ST = ['草稿', '公示中', '报名中', '已结束', '已下架'];
  var ACT_EN = ['Draft', 'Published', 'Open for sign-up', 'Finished', 'Taken down'];
  var activityVersions = Array.from({ length: 18 }, function (_, i) {
    var a = activities[i % activities.length];
    return { id: 'AV' + String(i + 1).padStart(3, '0'), activityId: a.id, farmId: a.farmId,
      version: 'v' + (1 + Math.floor(i / 4)) + '.' + (i % 3),
      titleZh: a.titleZh, titleEn: a.titleEn,
      contentZh: a.descZh, contentEn: a.descEn,
      price: a.price + (i % 3) * 10, capacity: a.capacity + (i % 3) * 5,
      status: ACT_ST[i % 5], statusEn: ACT_EN[i % 5],
      operator: users[(i % 6) + 1].nameZh,
      at: d((i % 11) + 1, (i * 5 % 26) + 1),
      changeZh: ['首次发布活动内容与公示价', '名额与集合时间调整', '补充田块图册与菜单说明', '价格随公示版本同步', '活动结束后下架归档'][i % 5],
      changeEn: ['First publication of content and price', 'Seats and meeting time revised', 'Plot gallery and menu notes added',
        'Price synced with the published edition', 'Archived after the event ended'][i % 5] };
  });
  var REG_DIM = ['土壤湿度', '灌溉频次', '施肥用量', '播期安排', '品种对照', '病虫害防控'];
  var REG_EN = ['Soil moisture', 'Irrigation frequency', 'Fertiliser dosage', 'Sowing date', 'Cultivar comparison', 'Pest control'];
  var regulations = Array.from({ length: 16 }, function (_, i) {
    var f = farms[i % 24], dim = REG_DIM[i % 6];
    return { id: 'RG' + String(i + 1).padStart(3, '0'), expertId: experts[i % experts.length].id,
      farmId: f.id, plotNo: f.plotNo, dimension: dim, dimensionEn: REG_EN[i % 6],
      readingBefore: (52 + i * 2) + '% / ' + (22 + i % 7) + '℃',
      target: (58 + i % 9) + '% / ' + (20 + i % 5) + '℃',
      actionZh: ['按畦补水一次，三天后复测', '把滴灌频次由每周两次调为三次', '追施有机肥并记入用量台账', '播期顺延 5 天避开降雨', '换用对照区表现更稳的品种', '增设黄板并复核虫口密度'][i % 6],
      actionEn: ['Irrigate each strip once and re-measure in three days', 'Raise drip irrigation from twice to three times a week',
        'Side-dress organic fertiliser and log the dosage', 'Delay sowing by five days to avoid rain',
        'Switch to the more stable control-strip cultivar', 'Add sticky traps and recheck pest density'][i % 6],
      status: ['待执行', '执行中', '已复核', '已关闭'][i % 4],
      statusEn: ['Pending', 'In progress', 'Reviewed', 'Closed'][i % 4],
      at: d((i % 11) + 1, (i * 3 % 26) + 2),
      reviewZh: i % 4 === 2 ? '复测读数回到目标区间，建议保持' : '待下次巡田复核',
      reviewEn: i % 4 === 2 ? 'Re-measurement is back in range; keep the setting' : 'Awaiting the next field walk' };
  });
  var PLANT_STAGES = ['育苗', '定植', '旺长', '开花', '坐果', '采收'];
  var PLANT_EN = ['Seedling', 'Transplanting', 'Vegetative growth', 'Flowering', 'Fruit set', 'Harvest'];
  var plantRecords = Array.from({ length: 24 }, function (_, i) {
    var f = farms[i % 24], crop = f.currentCrops[i % 2];
    return { id: 'PR' + String(i + 1).padStart(3, '0'), farmId: f.id, plotNo: f.plotNo,
      crop: crop, stage: PLANT_STAGES[i % 6], stageEn: PLANT_EN[i % 6],
      at: d((i % 11) + 1, (i * 3 % 26) + 1), temp: 12 + i % 17, humid: 55 + i % 21,
      soilMoisture: 48 + i % 27, heightCm: 12 + i * 3, yieldKg: 60 + i * 9,
      operator: users[(i % 8) + 24].nameZh, workorderId: workorders[i % 28].id,
      notesZh: '田块 ' + f.plotNo + ' 本阶段读数稳定，' + PLANT_STAGES[i % 6] + '期按公示作业口径巡田。',
      notesEn: 'Plot ' + f.plotNo + ' reads steady at the ' + PLANT_EN[i % 6] + ' stage under the published field-work standard.',
      photos: [cover('planting', i), cover('job', i + 3)] };
  });

  var DATA = {
    farms: farms, activities: activities, produces: produces, videos: videos, promos: promos,
    topics: topics, experts: experts, workorders: workorders, dispatches: dispatches,
    orders: orders, users: users, comments: comments, chats: chats,
    plantings: plantings, audits: audits, notices: notices,
    jobChanges: jobChanges, refunds: refunds, contracts: contracts,
    contractVersions: contractVersions, bills: bills, reconciliations: reconciliations,
    funds: funds, withdrawals: withdrawals, activityVersions: activityVersions,
    regulations: regulations, plantRecords: plantRecords
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
    PRICE_BOOK: PRICE_BOOK,
    svgThumb: svgThumb, count: count, byId: byId, all: all };
})(window);
