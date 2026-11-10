-- 闪马田园 SUMFARM · 平台系统数据库表（MySQL 8 / utf8mb4）
-- 一维关联口径：每张表最多 1 个 FOREIGN KEY；跨实体引用一律用 *_no 业务编码软引用。
-- 文件与图片：只存 *_path 路径字符串，全库无二进制大对象 / 字节数组 / 编码文本列。
-- 金额：BIGINT 单位「分」；面积：DECIMAL 单位「亩」；时间：DATETIME。
-- DDL 自校验：python3 ddl_check.py（括号/逗号/FK 引用列/类型逐表核对），勿手工改列顺序。
SET NAMES utf8mb4;

-- [主体域] 平台用户主档 · 五类使用者唯一入口；不存角色专属字段，避免重复列。
DROP TABLE IF EXISTS `platform_user`;
CREATE TABLE `platform_user` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_no` VARCHAR(32) NOT NULL COMMENT '用户自然编号 Uxxxxxxxx（跨实体软引用键）',
  `role` VARCHAR(24) NOT NULL COMMENT '身份枚举：consumer / merchant / grower(接单农户) / research(产学研) / admin',
  `display_name` VARCHAR(64) NOT NULL COMMENT '显示名',
  `phone_hash` CHAR(64) NULL COMMENT '手机号摘要，不存明文',
  `email` VARCHAR(128) NULL COMMENT '邮箱',
  `status` VARCHAR(16) NOT NULL COMMENT '状态：active / frozen / closed',
  `region` VARCHAR(64) NULL COMMENT '所在地区',
  `avatar_path` VARCHAR(512) NULL COMMENT '头像路径（只存路径）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_user_user_no` (`user_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 平台用户主档 | FK=0 | SOFT_REF=-';

-- [主体域] 用户实名与资料 · 用户的补充资料，独立业务存在。
DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE `user_profile` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：用户主档',
  `real_name` VARCHAR(64) NULL COMMENT '实名',
  `id_no_hash` CHAR(64) NULL COMMENT '证件号摘要',
  `intro` VARCHAR(512) NULL COMMENT '个人简介',
  `contact_path` VARCHAR(512) NULL COMMENT '联系材料路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_profile_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 用户实名与资料 | FK=1 | SOFT_REF=-';

-- [主体域] 专家资质档案 · 积分只在专家档案落库，论坛/统计页通过编号查询，不复制。
DROP TABLE IF EXISTS `expert_profile`;
CREATE TABLE `expert_profile` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：用户主档',
  `expert_no` VARCHAR(32) NOT NULL COMMENT '专家自然编号（跨实体软引用键）',
  `title` VARCHAR(64) NOT NULL COMMENT '职称',
  `org` VARCHAR(128) NOT NULL COMMENT '所属机构',
  `domain` VARCHAR(64) NULL COMMENT '研究方向',
  `points` INT UNSIGNED NOT NULL COMMENT '积分（排行依据，仅此表落库）',
  `cert_path` VARCHAR(512) NULL COMMENT '认证材料路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expert_profile_expert_no` (`expert_no`),
  CONSTRAINT `fk_expert_profile_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 专家资质档案 | FK=1 | SOFT_REF=-';

-- [主体域] 后台管理员账号 · 后台独立登录体系，物理上不与 platform_user 共用账号表。
DROP TABLE IF EXISTS `admin_account`;
CREATE TABLE `admin_account` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `admin_no` VARCHAR(32) NOT NULL COMMENT '管理员自然编号',
  `account` VARCHAR(64) NOT NULL COMMENT '登录账号（独立体系，不与前台用户混用）',
  `pass_hash` CHAR(64) NOT NULL COMMENT '口令摘要',
  `role` VARCHAR(24) NOT NULL COMMENT '后台角色',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `last_login_at` DATETIME NULL COMMENT '最近登录',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_account_admin_no` (`admin_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 后台管理员账号 | FK=0 | SOFT_REF=-';

-- [主体域] 关注与收藏 · 多类型目标只用一列编码软引用，避免二维关联。
DROP TABLE IF EXISTS `follow_relation`;
CREATE TABLE `follow_relation` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：用户主档',
  `target_type` VARCHAR(24) NOT NULL COMMENT '目标类型：plot / topic / video / expert',
  `target_no` VARCHAR(32) NOT NULL COMMENT '目标自然编号（软引用，不建外键）',
  `kind` VARCHAR(16) NOT NULL COMMENT 'follow / favorite',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_follow_relation_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_follow_relation_target_no` (`target_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 关注与收藏 | FK=1 | SOFT_REF=target_no';

-- [主体域] 用户站内通知 · 通知只挂用户一维。
DROP TABLE IF EXISTS `user_notice`;
CREATE TABLE `user_notice` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：用户主档',
  `notice_no` VARCHAR(32) NOT NULL COMMENT '通知编号',
  `kind` VARCHAR(24) NOT NULL COMMENT '通知类型',
  `title` VARCHAR(128) NOT NULL COMMENT '标题',
  `body` VARCHAR(1024) NOT NULL COMMENT '正文',
  `read_at` DATETIME NULL COMMENT '已读时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_notice_notice_no` (`notice_no`),
  CONSTRAINT `fk_user_notice_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主体域 | 用户站内通知 | FK=1 | SOFT_REF=-';

-- [田园域] 田园档案主档 · 不存单价（价格在价格域）、不存四季读数（在子表）、不存作物（在子表），无冗余列。
DROP TABLE IF EXISTS `farm_plot`;
CREATE TABLE `farm_plot` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_no` VARCHAR(32) NOT NULL COMMENT '田块自然编号 Fxxx（全站软引用键）',
  `owner_user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发布方（商家 / 村集体）用户',
  `title` VARCHAR(128) NOT NULL COMMENT '档案标题',
  `region` VARCHAR(64) NOT NULL COMMENT '地区',
  `area_mu` DECIMAL(10,2) NOT NULL COMMENT '实测面积（亩）',
  `soil_type` VARCHAR(32) NOT NULL COMMENT '土壤类型',
  `lease_type` VARCHAR(32) NOT NULL COMMENT '承包类型',
  `lease_start` DATE NULL COMMENT '承包开始',
  `lease_end` DATE NULL COMMENT '承包结束',
  `status` VARCHAR(16) NOT NULL COMMENT '档案状态',
  `cover_path` VARCHAR(512) NULL COMMENT '封面图路径（只存路径）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_farm_plot_plot_no` (`plot_no`),
  CONSTRAINT `fk_farm_plot_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='田园域 | 田园档案主档 | FK=1 | SOFT_REF=-';

-- [田园域] 四季温湿度读数 · 四季读数独立成行，不复制进主档。
DROP TABLE IF EXISTS `plot_season_metric`;
CREATE TABLE `plot_season_metric` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：田园档案',
  `season` VARCHAR(8) NOT NULL COMMENT '季：spring / summer / autumn / winter',
  `avg_temp_c` DECIMAL(5,2) NOT NULL COMMENT '季均温（℃）',
  `avg_humidity_pct` DECIMAL(5,2) NOT NULL COMMENT '季均湿（%）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_plot_season_metric_plot_id` FOREIGN KEY (`plot_id`) REFERENCES `farm_plot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='田园域 | 四季温湿度读数 | FK=1 | SOFT_REF=-';

-- [田园域] 历史 / 当前作物与采摘成果 · 作物与采摘成果按类型分行。
DROP TABLE IF EXISTS `plot_crop_record`;
CREATE TABLE `plot_crop_record` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：田园档案',
  `kind` VARCHAR(16) NOT NULL COMMENT 'past / current / harvest',
  `crop_name` VARCHAR(64) NOT NULL COMMENT '作物或成果名称',
  `season_year` SMALLINT UNSIGNED NULL COMMENT '年份',
  `yield_kg` DECIMAL(10,2) NULL COMMENT '产量（kg）',
  `receipt_path` VARCHAR(512) NULL COMMENT '成果回执图路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_plot_crop_record_plot_id` FOREIGN KEY (`plot_id`) REFERENCES `farm_plot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='田园域 | 历史 / 当前作物与采摘成果 | FK=1 | SOFT_REF=-';

-- [田园域] 配套场地与菜单 · 场地金额不复制，按价目编号到价格域取。
DROP TABLE IF EXISTS `plot_facility`;
CREATE TABLE `plot_facility` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：田园档案',
  `kind` VARCHAR(24) NOT NULL COMMENT 'menu / party / meeting / event / sport / wedding / camp',
  `name` VARCHAR(128) NOT NULL COMMENT '项目名',
  `capacity` INT UNSIGNED NULL COMMENT '可容纳人数',
  `price_item_no` VARCHAR(32) NULL COMMENT '对应公示价目编号（软引用）',
  `bookable` TINYINT(1) NOT NULL COMMENT '是否可预订',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_plot_facility_plot_id` FOREIGN KEY (`plot_id`) REFERENCES `farm_plot` (`id`),
  KEY `idx_plot_facility_price_item_no` (`price_item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='田园域 | 配套场地与菜单 | FK=1 | SOFT_REF=price_item_no';

-- [田园域] 田园图册 · 多图走子表；主档只留一张封面路径。
DROP TABLE IF EXISTS `plot_image`;
CREATE TABLE `plot_image` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：田园档案',
  `file_path` VARCHAR(512) NOT NULL COMMENT '图片路径（只存路径，禁止存二进制）',
  `caption` VARCHAR(128) NULL COMMENT '图注',
  `sort_no` INT UNSIGNED NOT NULL COMMENT '排序',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_plot_image_plot_id` FOREIGN KEY (`plot_id`) REFERENCES `farm_plot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='田园域 | 田园图册 | FK=1 | SOFT_REF=-';

-- [内容域] 用户视频分享 · 首页热点视频子栏目数据源。
DROP TABLE IF EXISTS `video_share`;
CREATE TABLE `video_share` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发布用户',
  `video_no` VARCHAR(32) NOT NULL COMMENT '视频自然编号',
  `title` VARCHAR(128) NOT NULL COMMENT '标题',
  `tag` VARCHAR(32) NULL COMMENT '标签',
  `cover_path` VARCHAR(512) NULL COMMENT '封面路径',
  `video_path` VARCHAR(512) NOT NULL COMMENT '视频文件路径（只存路径）',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_video_share_video_no` (`video_no`),
  CONSTRAINT `fk_video_share_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 用户视频分享 | FK=1 | SOFT_REF=-';

-- [内容域] 田园宣发内容 · 宣发内容独立业务。
DROP TABLE IF EXISTS `promo_material`;
CREATE TABLE `promo_material` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发布用户',
  `promo_no` VARCHAR(32) NOT NULL COMMENT '宣发自然编号',
  `title` VARCHAR(128) NOT NULL COMMENT '标题',
  `channel` VARCHAR(32) NOT NULL COMMENT '宣发渠道',
  `body` TEXT NULL COMMENT '正文',
  `cover_path` VARCHAR(512) NULL COMMENT '配图路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promo_material_promo_no` (`promo_no`),
  CONSTRAINT `fk_promo_material_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 田园宣发内容 | FK=1 | SOFT_REF=-';

-- [内容域] 论坛主帖 · 论坛以文字列表为主，正文只在此表。
DROP TABLE IF EXISTS `forum_topic`;
CREATE TABLE `forum_topic` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发帖用户',
  `topic_no` VARCHAR(32) NOT NULL COMMENT '帖子自然编号',
  `board` VARCHAR(24) NOT NULL COMMENT '版块：hot / experience / activity / tech',
  `title` VARCHAR(160) NOT NULL COMMENT '标题',
  `body` TEXT NOT NULL COMMENT '正文',
  `tags` VARCHAR(256) NULL COMMENT '标签',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_forum_topic_topic_no` (`topic_no`),
  CONSTRAINT `fk_forum_topic_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 论坛主帖 | FK=1 | SOFT_REF=-';

-- [内容域] 论坛回帖 · 回帖只挂主帖一维；作者用编号软引用。
DROP TABLE IF EXISTS `topic_reply`;
CREATE TABLE `topic_reply` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `topic_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：主帖',
  `author_no` VARCHAR(32) NOT NULL COMMENT '回帖人用户编号（软引用）',
  `body` TEXT NOT NULL COMMENT '回帖正文',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_topic_reply_topic_id` FOREIGN KEY (`topic_id`) REFERENCES `forum_topic` (`id`),
  KEY `idx_topic_reply_author_no` (`author_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 论坛回帖 | FK=1 | SOFT_REF=author_no';

-- [内容域] 全站评论 · 后台评论管理直接管这张表。
DROP TABLE IF EXISTS `content_comment`;
CREATE TABLE `content_comment` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：评论用户',
  `comment_no` VARCHAR(32) NOT NULL COMMENT '评论自然编号',
  `target_type` VARCHAR(24) NOT NULL COMMENT '目标类型（田园 / 视频 / 活动 / 农产品）',
  `target_no` VARCHAR(32) NOT NULL COMMENT '目标自然编号（软引用）',
  `body` VARCHAR(1024) NOT NULL COMMENT '评论正文',
  `status` VARCHAR(16) NOT NULL COMMENT '状态：visible / hidden / pending',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_content_comment_comment_no` (`comment_no`),
  CONSTRAINT `fk_content_comment_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_content_comment_target_no` (`target_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 全站评论 | FK=1 | SOFT_REF=target_no';

-- [内容域] 点赞 · 点赞状态一维挂用户。
DROP TABLE IF EXISTS `content_like`;
CREATE TABLE `content_like` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：点赞用户',
  `target_type` VARCHAR(24) NOT NULL COMMENT '目标类型',
  `target_no` VARCHAR(32) NOT NULL COMMENT '目标自然编号（软引用）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_content_like_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_content_like_target_no` (`target_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 点赞 | FK=1 | SOFT_REF=target_no';

-- [内容域] 统一附件登记 · 所有图片 / 视频 / 回执 / 合同扫描件统一登记路径；业务表不落文件。
DROP TABLE IF EXISTS `attachment`;
CREATE TABLE `attachment` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `attach_no` VARCHAR(32) NOT NULL COMMENT '附件自然编号',
  `owner_type` VARCHAR(24) NOT NULL COMMENT '归属业务类型',
  `owner_no` VARCHAR(32) NOT NULL COMMENT '归属业务单号（软引用）',
  `file_path` VARCHAR(512) NOT NULL COMMENT '文件路径（只存路径，不存二进制内容）',
  `mime` VARCHAR(64) NOT NULL COMMENT 'MIME 类型',
  `size_bytes` BIGINT UNSIGNED NOT NULL COMMENT '字节数',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attachment_attach_no` (`attach_no`),
  KEY `idx_attachment_owner_no` (`owner_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容域 | 统一附件登记 | FK=0 | SOFT_REF=owner_no';

-- [交易域] 用户订单主表 · 【一维关联示范】订单只跟 user_id 建外键；标的不另建 farm_id / activity_id，按 ref_no 由 API 编排查询。
DROP TABLE IF EXISTS `lease_order`;
CREATE TABLE `lease_order` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单自然编号',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '唯一关联列：下单用户',
  `kind` VARCHAR(24) NOT NULL COMMENT 'lease / activity / venue / produce',
  `ref_no` VARCHAR(32) NOT NULL COMMENT '标的自然编号（田块 / 活动 / 农产品编号，普通字符串、非外键）',
  `amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '成交金额（分）',
  `status` VARCHAR(24) NOT NULL COMMENT '订单状态',
  `placed_at` DATETIME NOT NULL COMMENT '下单时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lease_order_order_no` (`order_no`),
  CONSTRAINT `fk_lease_order_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_lease_order_ref_no` (`ref_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 用户订单主表 | FK=1 | SOFT_REF=ref_no';

-- [交易域] 订单明细 · 明细只挂订单一维。
DROP TABLE IF EXISTS `order_line`;
CREATE TABLE `order_line` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：订单主表',
  `item_no` VARCHAR(32) NOT NULL COMMENT '标的编号（软引用，非外键）',
  `item_title` VARCHAR(128) NOT NULL COMMENT '标的名称快照（下单当时的展示文案，属单据自身字段）',
  `qty` DECIMAL(10,2) NOT NULL COMMENT '数量',
  `unit_price_cents` BIGINT UNSIGNED NOT NULL COMMENT '成交单价（分）',
  `amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '行金额（分）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_order_line_order_id` FOREIGN KEY (`order_id`) REFERENCES `lease_order` (`id`),
  KEY `idx_order_line_item_no` (`item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 订单明细 | FK=1 | SOFT_REF=item_no';

-- [交易域] 支付流水 · 支付只挂订单一维。
DROP TABLE IF EXISTS `payment_record`;
CREATE TABLE `payment_record` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：订单主表',
  `pay_no` VARCHAR(32) NOT NULL COMMENT '支付流水号',
  `channel` VARCHAR(24) NOT NULL COMMENT '支付渠道',
  `amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '实付金额（分）',
  `status` VARCHAR(16) NOT NULL COMMENT '支付状态',
  `paid_at` DATETIME NULL COMMENT '支付完成时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_record_pay_no` (`pay_no`),
  CONSTRAINT `fk_payment_record_order_id` FOREIGN KEY (`order_id`) REFERENCES `lease_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 支付流水 | FK=1 | SOFT_REF=-';

-- [交易域] 承包合同 · 合同挂订单一维；田园 / 用户信息由订单链查得，不复制。
DROP TABLE IF EXISTS `contract_doc`;
CREATE TABLE `contract_doc` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `contract_no` VARCHAR(32) NOT NULL COMMENT '合同自然编号',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：订单主表',
  `version` VARCHAR(16) NOT NULL COMMENT '当前版本号',
  `status` VARCHAR(24) NOT NULL COMMENT '状态',
  `signed_at` DATETIME NULL COMMENT '签署时间',
  `scan_path` VARCHAR(512) NULL COMMENT '扫描件路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contract_doc_contract_no` (`contract_no`),
  CONSTRAINT `fk_contract_doc_order_id` FOREIGN KEY (`order_id`) REFERENCES `lease_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 承包合同 | FK=1 | SOFT_REF=-';

-- [交易域] 合同条款 · 条款逐行，双语真内容。
DROP TABLE IF EXISTS `contract_clause`;
CREATE TABLE `contract_clause` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：合同',
  `seq` INT UNSIGNED NOT NULL COMMENT '条款序号',
  `body_zh` VARCHAR(1024) NOT NULL COMMENT '中文条款',
  `body_en` VARCHAR(1024) NULL COMMENT '英文条款',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_contract_clause_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_doc` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 合同条款 | FK=1 | SOFT_REF=-';

-- [交易域] 合同变更版本 · 商家改合同 / 管合同 / 查版本的落点。
DROP TABLE IF EXISTS `contract_version`;
CREATE TABLE `contract_version` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：合同',
  `from_version` VARCHAR(16) NOT NULL COMMENT '变更前版本',
  `to_version` VARCHAR(16) NOT NULL COMMENT '变更后版本',
  `change_note` VARCHAR(512) NOT NULL COMMENT '变更说明',
  `operator_no` VARCHAR(32) NOT NULL COMMENT '操作人编号（软引用）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_contract_version_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contract_doc` (`id`),
  KEY `idx_contract_version_operator_no` (`operator_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 合同变更版本 | FK=1 | SOFT_REF=operator_no';

-- [交易域] 对账账单明细 · 金额构成只在账单表落库，对账单由 API 聚合，不复制。
DROP TABLE IF EXISTS `bill_item`;
CREATE TABLE `bill_item` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `bill_no` VARCHAR(32) NOT NULL COMMENT '账单自然编号',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：订单主表',
  `period` CHAR(7) NOT NULL COMMENT '账期 YYYY-MM',
  `kind` VARCHAR(24) NOT NULL COMMENT '账单类型',
  `receivable_cents` BIGINT UNSIGNED NOT NULL COMMENT '应收（分）',
  `service_fee_cents` BIGINT UNSIGNED NOT NULL COMMENT '平台服务费（分）',
  `refunded_cents` BIGINT UNSIGNED NOT NULL COMMENT '已退（分）',
  `net_cents` BIGINT NOT NULL COMMENT '净额 = 应收 - 服务费 - 已退',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bill_item_bill_no` (`bill_no`),
  CONSTRAINT `fk_bill_item_order_id` FOREIGN KEY (`order_id`) REFERENCES `lease_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 对账账单明细 | FK=1 | SOFT_REF=-';

-- [交易域] 商家对账单 · 汇总型根表，0 外键；避免与账单形成第二维关联。
DROP TABLE IF EXISTS `reconciliation`;
CREATE TABLE `reconciliation` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `recon_no` VARCHAR(32) NOT NULL COMMENT '对账单自然编号',
  `period` CHAR(7) NOT NULL COMMENT '账期 YYYY-MM',
  `subject_no` VARCHAR(32) NOT NULL COMMENT '对账主体编号（商家用户编号，软引用）',
  `total_cents` BIGINT NOT NULL COMMENT '本期合计（由账单实时聚合，不复制明细）',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `checked_at` DATETIME NULL COMMENT '核对时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_recon_no` (`recon_no`),
  KEY `idx_reconciliation_subject_no` (`subject_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 商家对账单 | FK=0 | SOFT_REF=subject_no';

-- [交易域] 退款申请 · 租户取消工单后发起退款的落点。
DROP TABLE IF EXISTS `refund_request`;
CREATE TABLE `refund_request` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `refund_no` VARCHAR(32) NOT NULL COMMENT '退款自然编号',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：订单主表',
  `amount_paid_cents` BIGINT UNSIGNED NOT NULL COMMENT '已付（分）',
  `used_amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '已作业 / 已消费（分）',
  `refund_amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '应退（分）',
  `reason_code` VARCHAR(32) NOT NULL COMMENT '退款原因码',
  `method` VARCHAR(24) NOT NULL COMMENT '退款方式',
  `status` VARCHAR(24) NOT NULL COMMENT '状态',
  `applied_at` DATETIME NOT NULL COMMENT '申请时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_request_refund_no` (`refund_no`),
  CONSTRAINT `fk_refund_request_order_id` FOREIGN KEY (`order_id`) REFERENCES `lease_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 退款申请 | FK=1 | SOFT_REF=-';

-- [交易域] 退款流程节点 · 时间线独立成行。
DROP TABLE IF EXISTS `refund_flow`;
CREATE TABLE `refund_flow` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `refund_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：退款申请',
  `step` TINYINT UNSIGNED NOT NULL COMMENT '步骤 1..4',
  `status` VARCHAR(24) NOT NULL COMMENT '节点状态',
  `operator_no` VARCHAR(32) NULL COMMENT '操作人编号（软引用）',
  `note` VARCHAR(512) NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_refund_flow_refund_id` FOREIGN KEY (`refund_id`) REFERENCES `refund_request` (`id`),
  KEY `idx_refund_flow_operator_no` (`operator_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 退款流程节点 | FK=1 | SOFT_REF=operator_no';

-- [交易域] 田园活动 / 场地档期 · 商家发布 / 更新活动的落点；金额不复制，取价目编号。
DROP TABLE IF EXISTS `activity_event`;
CREATE TABLE `activity_event` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `activity_no` VARCHAR(32) NOT NULL COMMENT '活动自然编号',
  `owner_user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发布商家 / 集体',
  `title` VARCHAR(128) NOT NULL COMMENT '活动标题',
  `kind` VARCHAR(24) NOT NULL COMMENT '活动 / 场地类型',
  `plot_no` VARCHAR(32) NULL COMMENT '关联田园编号（软引用，非外键）',
  `start_at` DATETIME NOT NULL COMMENT '开始时间',
  `capacity` INT UNSIGNED NOT NULL COMMENT '名额',
  `price_item_no` VARCHAR(32) NULL COMMENT '公示价目编号（软引用）',
  `content` TEXT NULL COMMENT '活动内容',
  `cover_path` VARCHAR(512) NULL COMMENT '配图路径',
  `status` VARCHAR(24) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_event_activity_no` (`activity_no`),
  CONSTRAINT `fk_activity_event_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_activity_event_plot_no` (`plot_no`),
  KEY `idx_activity_event_price_item_no` (`price_item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 田园活动 / 场地档期 | FK=1 | SOFT_REF=plot_no,price_item_no';

-- [交易域] 活动版本记录 · 更新活动留痕。
DROP TABLE IF EXISTS `activity_version`;
CREATE TABLE `activity_version` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：活动',
  `version` VARCHAR(16) NOT NULL COMMENT '版本号',
  `change_note` VARCHAR(512) NOT NULL COMMENT '更新说明',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_activity_version_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activity_event` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 活动版本记录 | FK=1 | SOFT_REF=-';

-- [交易域] 活动报名 · 报名只挂活动一维。
DROP TABLE IF EXISTS `activity_registration`;
CREATE TABLE `activity_registration` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：活动',
  `attendee_no` VARCHAR(32) NOT NULL COMMENT '报名用户编号（软引用）',
  `order_no` VARCHAR(32) NULL COMMENT '关联订单号（软引用）',
  `status` VARCHAR(16) NOT NULL COMMENT '报名状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_activity_registration_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activity_event` (`id`),
  KEY `idx_activity_registration_attendee_no` (`attendee_no`),
  KEY `idx_activity_registration_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 活动报名 | FK=1 | SOFT_REF=attendee_no,order_no';

-- [交易域] 农产品主档 · 农产品分享与下单标的。
DROP TABLE IF EXISTS `produce_item`;
CREATE TABLE `produce_item` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `trace_no` VARCHAR(32) NOT NULL COMMENT '溯源码（自然键）',
  `owner_user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：发布商家',
  `name` VARCHAR(128) NOT NULL COMMENT '品名',
  `category` VARCHAR(32) NOT NULL COMMENT '品类',
  `unit` VARCHAR(16) NOT NULL COMMENT '计价单位',
  `price_item_no` VARCHAR(32) NULL COMMENT '公示价目编号（软引用）',
  `cover_path` VARCHAR(512) NULL COMMENT '主图路径',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_produce_item_trace_no` (`trace_no`),
  CONSTRAINT `fk_produce_item_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_produce_item_price_item_no` (`price_item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 农产品主档 | FK=1 | SOFT_REF=price_item_no';

-- [交易域] 农产品溯源节点 · 溯源链一维。
DROP TABLE IF EXISTS `produce_trace`;
CREATE TABLE `produce_trace` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `produce_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：农产品',
  `stage` VARCHAR(32) NOT NULL COMMENT '环节',
  `note` VARCHAR(512) NOT NULL COMMENT '环节说明',
  `receipt_path` VARCHAR(512) NULL COMMENT '环节凭证路径',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_produce_trace_produce_id` FOREIGN KEY (`produce_id`) REFERENCES `produce_item` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易域 | 农产品溯源节点 | FK=1 | SOFT_REF=-';

-- [工单域] 农事 / 专家指导工单主表 · 工单只跟发单人建外键；田园、承接人、价目全用编号软引用，关联维度保持一维。
DROP TABLE IF EXISTS `work_order`;
CREATE TABLE `work_order` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_no` VARCHAR(32) NOT NULL COMMENT '工单自然编号',
  `creator_user_id` BIGINT UNSIGNED NOT NULL COMMENT '唯一关联列：发单用户',
  `type` VARCHAR(32) NOT NULL COMMENT '类型：翻地/种植/施肥/浇水/除草/采摘/回收/配送/拍照/专家指导',
  `plot_no` VARCHAR(32) NULL COMMENT '挂靠田园编号（软引用，非外键）',
  `assignee_no` VARCHAR(32) NULL COMMENT '承接农户 / 专家编号（软引用）',
  `status` VARCHAR(24) NOT NULL COMMENT '固定流程状态',
  `price_item_no` VARCHAR(32) NULL COMMENT '公示价目编号（软引用）',
  `created_at` DATETIME NOT NULL COMMENT '发布时间',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_wo_no` (`wo_no`),
  CONSTRAINT `fk_work_order_creator_user_id` FOREIGN KEY (`creator_user_id`) REFERENCES `platform_user` (`id`),
  KEY `idx_work_order_plot_no` (`plot_no`),
  KEY `idx_work_order_assignee_no` (`assignee_no`),
  KEY `idx_work_order_price_item_no` (`price_item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 农事 / 专家指导工单主表 | FK=1 | SOFT_REF=plot_no,assignee_no,price_item_no';

-- [工单域] 工单明细需求条目 · 10 条明细固定条目，逐行落库。
DROP TABLE IF EXISTS `work_order_item`;
CREATE TABLE `work_order_item` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：工单',
  `seq` TINYINT UNSIGNED NOT NULL COMMENT '条目序号 1..10',
  `item_key` VARCHAR(32) NOT NULL COMMENT 'scope/window/acceptance/material/receipt/safety/budget/qualification/priority/change',
  `content` VARCHAR(1024) NOT NULL COMMENT '条目内容',
  `required` TINYINT(1) NOT NULL COMMENT '是否必填',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_work_order_item_wo_id` FOREIGN KEY (`wo_id`) REFERENCES `work_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 工单明细需求条目 | FK=1 | SOFT_REF=-';

-- [工单域] 工单固定流程节点 · 待接单→已接单→作业中→待验收→已完成→已结算，验收不过退回作业中。
DROP TABLE IF EXISTS `work_order_flow`;
CREATE TABLE `work_order_flow` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：工单',
  `step` TINYINT UNSIGNED NOT NULL COMMENT '第 1..6 步；退回分支单独记',
  `status` VARCHAR(24) NOT NULL COMMENT '节点状态',
  `operator_no` VARCHAR(32) NULL COMMENT '操作人编号（软引用）',
  `note` VARCHAR(512) NULL COMMENT '节点说明',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_work_order_flow_wo_id` FOREIGN KEY (`wo_id`) REFERENCES `work_order` (`id`),
  KEY `idx_work_order_flow_operator_no` (`operator_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 工单固定流程节点 | FK=1 | SOFT_REF=operator_no';

-- [工单域] 工单沟通消息 · 个人频道工单聊天、后台聊天管理共用。
DROP TABLE IF EXISTS `work_order_chat`;
CREATE TABLE `work_order_chat` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：工单',
  `sender_no` VARCHAR(32) NOT NULL COMMENT '发送人编号（软引用）',
  `body` VARCHAR(1024) NOT NULL COMMENT '消息正文',
  `kind` VARCHAR(16) NOT NULL COMMENT 'text / image',
  `attach_no` VARCHAR(32) NULL COMMENT '附件编号（软引用，图片只存路径）',
  `at` DATETIME NOT NULL COMMENT '发送时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_work_order_chat_wo_id` FOREIGN KEY (`wo_id`) REFERENCES `work_order` (`id`),
  KEY `idx_work_order_chat_sender_no` (`sender_no`),
  KEY `idx_work_order_chat_attach_no` (`attach_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 工单沟通消息 | FK=1 | SOFT_REF=sender_no,attach_no';

-- [工单域] 工单取消 / 修订 / 重发 · 售后与变更留痕。
DROP TABLE IF EXISTS `work_order_change`;
CREATE TABLE `work_order_change` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：工单',
  `kind` VARCHAR(16) NOT NULL COMMENT 'cancel / amend / reissue',
  `from_status` VARCHAR(24) NOT NULL COMMENT '原状态',
  `to_status` VARCHAR(24) NOT NULL COMMENT '新状态',
  `reason` VARCHAR(512) NOT NULL COMMENT '原因',
  `amount_impact_cents` BIGINT NOT NULL COMMENT '金额影响（分，可为负）',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_work_order_change_wo_id` FOREIGN KEY (`wo_id`) REFERENCES `work_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 工单取消 / 修订 / 重发 | FK=1 | SOFT_REF=-';

-- [工单域] 接单大厅任务 · 接单双口径附近单都从这张表按 scope 查；0 外键保持一维。
DROP TABLE IF EXISTS `dispatch_task`;
CREATE TABLE `dispatch_task` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `dispatch_no` VARCHAR(32) NOT NULL COMMENT '派单自然编号',
  `wo_no` VARCHAR(32) NOT NULL COMMENT '关联工单编号（软引用，非外键）',
  `scope` VARCHAR(16) NOT NULL COMMENT 'nearby（当前定位附近）/ taken（已接）/ linked（关联田园附近）',
  `region` VARCHAR(64) NOT NULL COMMENT '区域',
  `distance_km` DECIMAL(8,2) NOT NULL COMMENT '距离（km）',
  `status` VARCHAR(24) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dispatch_task_dispatch_no` (`dispatch_no`),
  KEY `idx_dispatch_task_wo_no` (`wo_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 接单大厅任务 | FK=0 | SOFT_REF=wo_no';

-- [工单域] 工单验收回执 · 农户回执与租户验收共用。
DROP TABLE IF EXISTS `job_acceptance`;
CREATE TABLE `job_acceptance` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wo_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：工单',
  `result` VARCHAR(16) NOT NULL COMMENT 'pass / reject',
  `note` VARCHAR(512) NULL COMMENT '验收说明',
  `receipt_path` VARCHAR(512) NULL COMMENT '回执照片路径',
  `verified_at` DATETIME NOT NULL COMMENT '验收时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_job_acceptance_wo_id` FOREIGN KEY (`wo_id`) REFERENCES `work_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单域 | 工单验收回执 | FK=1 | SOFT_REF=-';

-- [资金域] 农户 / 商家资金账户 · 余额只在账户表落库，流水按账户聚合。
DROP TABLE IF EXISTS `fund_account`;
CREATE TABLE `fund_account` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `account_no` VARCHAR(32) NOT NULL COMMENT '账户自然编号',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：账户所属用户',
  `balance_cents` BIGINT NOT NULL COMMENT '可用余额（分）',
  `frozen_cents` BIGINT NOT NULL COMMENT '冻结金额（分）',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fund_account_account_no` (`account_no`),
  CONSTRAINT `fk_fund_account_user_id` FOREIGN KEY (`user_id`) REFERENCES `platform_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资金域 | 农户 / 商家资金账户 | FK=1 | SOFT_REF=-';

-- [资金域] 资金流水 · 农户查资金的数据源；余额由流水 + 账户初值推导。
DROP TABLE IF EXISTS `fund_entry`;
CREATE TABLE `fund_entry` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：资金账户',
  `entry_no` VARCHAR(32) NOT NULL COMMENT '流水自然编号',
  `kind` VARCHAR(16) NOT NULL COMMENT 'income / expense',
  `amount_cents` BIGINT NOT NULL COMMENT '发生额（分，支出为负）',
  `related_no` VARCHAR(32) NULL COMMENT '关联业务单号（软引用）',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fund_entry_entry_no` (`entry_no`),
  CONSTRAINT `fk_fund_entry_account_id` FOREIGN KEY (`account_id`) REFERENCES `fund_account` (`id`),
  KEY `idx_fund_entry_related_no` (`related_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资金域 | 资金流水 | FK=1 | SOFT_REF=related_no';

-- [资金域] 提现申请 · 农户提取资金落点；范围校验由 API 层与库约束共同保证。
DROP TABLE IF EXISTS `withdrawal_request`;
CREATE TABLE `withdrawal_request` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wd_no` VARCHAR(32) NOT NULL COMMENT '提现自然编号',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：资金账户',
  `amount_cents` BIGINT UNSIGNED NOT NULL COMMENT '提现金额（分，必须 >0 且 ≤ 可用余额）',
  `bank_no` VARCHAR(64) NOT NULL COMMENT '收款账户标识',
  `status` VARCHAR(24) NOT NULL COMMENT '状态',
  `applied_at` DATETIME NOT NULL COMMENT '申请时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_withdrawal_request_wd_no` (`wd_no`),
  CONSTRAINT `fk_withdrawal_request_account_id` FOREIGN KEY (`account_id`) REFERENCES `fund_account` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资金域 | 提现申请 | FK=1 | SOFT_REF=-';

-- [资金域] 提现流程节点 · 提现时间线。
DROP TABLE IF EXISTS `withdrawal_flow`;
CREATE TABLE `withdrawal_flow` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `wd_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：提现申请',
  `step` TINYINT UNSIGNED NOT NULL COMMENT '步骤 1..4',
  `status` VARCHAR(24) NOT NULL COMMENT '节点状态',
  `operator_no` VARCHAR(32) NULL COMMENT '操作人编号（软引用）',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_withdrawal_flow_wd_id` FOREIGN KEY (`wd_id`) REFERENCES `withdrawal_request` (`id`),
  KEY `idx_withdrawal_flow_operator_no` (`operator_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资金域 | 提现流程节点 | FK=1 | SOFT_REF=operator_no';

-- [专家域] 种植实践与实验记录 · 专家多维统计 / 对比 / 记录查询的数据源；0 外键保证记录独立。
DROP TABLE IF EXISTS `planting_record`;
CREATE TABLE `planting_record` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `record_no` VARCHAR(32) NOT NULL COMMENT '记录自然编号',
  `plot_no` VARCHAR(32) NOT NULL COMMENT '田块编号（软引用）',
  `expert_no` VARCHAR(32) NOT NULL COMMENT '专家编号（软引用）',
  `crop` VARCHAR(64) NOT NULL COMMENT '作物',
  `stage` VARCHAR(32) NOT NULL COMMENT '生长阶段',
  `reading_json` TEXT NULL COMMENT '本阶段读数（JSON 文本，非文件）',
  `note` VARCHAR(1024) NULL COMMENT '记录说明',
  `at` DATETIME NOT NULL COMMENT '记录时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_planting_record_record_no` (`record_no`),
  KEY `idx_planting_record_plot_no` (`plot_no`),
  KEY `idx_planting_record_expert_no` (`expert_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家域 | 种植实践与实验记录 | FK=0 | SOFT_REF=plot_no,expert_no';

-- [专家域] 调控建议与复核 · 专家对比数据后进行调控的落点。
DROP TABLE IF EXISTS `regulation_advice`;
CREATE TABLE `regulation_advice` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `record_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：种植记录',
  `dimension` VARCHAR(32) NOT NULL COMMENT '调控维度（水 / 肥 / 温 / 湿 / 密度）',
  `before_value` VARCHAR(64) NOT NULL COMMENT '调控前读数',
  `target_value` VARCHAR(64) NOT NULL COMMENT '目标读数',
  `action` VARCHAR(512) NOT NULL COMMENT '建议动作',
  `status` VARCHAR(24) NOT NULL COMMENT '待执行 / 执行中 / 已复核',
  `review_note` VARCHAR(512) NULL COMMENT '复核结论',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_regulation_advice_record_id` FOREIGN KEY (`record_id`) REFERENCES `planting_record` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专家域 | 调控建议与复核 | FK=1 | SOFT_REF=-';

-- [价格域] 价格公示版本主档 · 全站租金与价格公示的唯一总账版本。
DROP TABLE IF EXISTS `price_book`;
CREATE TABLE `price_book` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `version` VARCHAR(24) NOT NULL COMMENT '公示版本号（自然键）',
  `period_from` DATE NOT NULL COMMENT '生效起',
  `period_to` DATE NOT NULL COMMENT '生效止',
  `status` VARCHAR(16) NOT NULL COMMENT 'draft / published / archived',
  `published_at` DATETIME NULL COMMENT '公示时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_price_book_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格域 | 价格公示版本主档 | FK=0 | SOFT_REF=-';

-- [价格域] 公示价目条目 · 所有节点挂接的金额都从这里按 item_no 取，业务表不复制金额。
DROP TABLE IF EXISTS `price_item`;
CREATE TABLE `price_item` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：公示版本',
  `item_no` VARCHAR(32) NOT NULL COMMENT '价目自然编号（业务软引用键）',
  `cat` VARCHAR(32) NOT NULL COMMENT '类目（9 类）',
  `name_zh` VARCHAR(128) NOT NULL COMMENT '中文名',
  `name_en` VARCHAR(128) NOT NULL COMMENT '英文名',
  `unit` VARCHAR(24) NOT NULL COMMENT '计价单位',
  `price_cents` BIGINT UNSIGNED NOT NULL COMMENT '公示单价（分）',
  `scope` VARCHAR(256) NULL COMMENT '适用范围',
  `status` VARCHAR(16) NOT NULL COMMENT '状态',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_price_item_item_no` (`item_no`),
  CONSTRAINT `fk_price_item_book_id` FOREIGN KEY (`book_id`) REFERENCES `price_book` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格域 | 公示价目条目 | FK=1 | SOFT_REF=-';

-- [价格域] 调价公示历史 · 调价历史独立业务。
DROP TABLE IF EXISTS `price_change`;
CREATE TABLE `price_change` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：公示版本',
  `item_no` VARCHAR(32) NOT NULL COMMENT '价目编号（软引用）',
  `before_cents` BIGINT UNSIGNED NOT NULL COMMENT '调价前（分）',
  `after_cents` BIGINT UNSIGNED NOT NULL COMMENT '调价后（分）',
  `effective_at` DATE NOT NULL COMMENT '生效日',
  `notice_days` SMALLINT UNSIGNED NOT NULL COMMENT '提前公示天数',
  `reason` VARCHAR(512) NOT NULL COMMENT '调价说明',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_price_change_book_id` FOREIGN KEY (`book_id`) REFERENCES `price_book` (`id`),
  KEY `idx_price_change_item_no` (`item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格域 | 调价公示历史 | FK=1 | SOFT_REF=item_no';

-- [价格域] 价格发布审核任务 · 后台发布价格进多级审核队列。
DROP TABLE IF EXISTS `price_publish_task`;
CREATE TABLE `price_publish_task` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `book_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：公示版本',
  `task_no` VARCHAR(32) NOT NULL COMMENT '任务编号',
  `audit_level` TINYINT UNSIGNED NOT NULL COMMENT '当前审核级 1..3',
  `status` VARCHAR(24) NOT NULL COMMENT 'pending_review / reviewing / approved',
  `submitted_by` VARCHAR(32) NOT NULL COMMENT '提交人编号（软引用）',
  `note` VARCHAR(512) NULL COMMENT '发布说明',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_price_publish_task_task_no` (`task_no`),
  CONSTRAINT `fk_price_publish_task_book_id` FOREIGN KEY (`book_id`) REFERENCES `price_book` (`id`),
  KEY `idx_price_publish_task_submitted_by` (`submitted_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格域 | 价格发布审核任务 | FK=1 | SOFT_REF=submitted_by';

-- [价格域] 田块租金试算快照 · 租金试算结果按田块存档；0 外键，按编号软引用，不与田园主档形成二维关联。
DROP TABLE IF EXISTS `plot_rent_rate`;
CREATE TABLE `plot_rent_rate` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `plot_no` VARCHAR(32) NOT NULL COMMENT '田块编号（软引用）',
  `book_version` VARCHAR(24) NOT NULL COMMENT '依据的公示版本（软引用）',
  `rate_cents` BIGINT UNSIGNED NOT NULL COMMENT '当季单价（分 / 亩 / 季）',
  `season_cents` BIGINT UNSIGNED NOT NULL COMMENT '租金合计（分）',
  `deposit_cents` BIGINT UNSIGNED NOT NULL COMMENT '押金（分）',
  `fee_cents` BIGINT UNSIGNED NOT NULL COMMENT '平台服务费（分）',
  `total_cents` BIGINT UNSIGNED NOT NULL COMMENT '首期应付（分）',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_plot_rent_rate_plot_no` (`plot_no`),
  KEY `idx_plot_rent_rate_book_version` (`book_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格域 | 田块租金试算快照 | FK=0 | SOFT_REF=plot_no,book_version';

-- [管控域] 多级审核任务 · 所有对象（田园 / 价格 / 评论 / 活动）统一按编号软引用送审，0 外键。
DROP TABLE IF EXISTS `audit_task`;
CREATE TABLE `audit_task` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `audit_no` VARCHAR(32) NOT NULL COMMENT '审核任务编号',
  `target_type` VARCHAR(24) NOT NULL COMMENT '审核对象类型',
  `target_no` VARCHAR(32) NOT NULL COMMENT '审核对象编号（软引用）',
  `level` TINYINT UNSIGNED NOT NULL COMMENT '当前级别 1 初审 / 2 复审 / 3 终审',
  `result` VARCHAR(24) NOT NULL COMMENT '结果',
  `operator_no` VARCHAR(32) NULL COMMENT '操作管理员编号（软引用）',
  `comment` VARCHAR(512) NULL COMMENT '审核意见',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_task_audit_no` (`audit_no`),
  KEY `idx_audit_task_target_no` (`target_no`),
  KEY `idx_audit_task_operator_no` (`operator_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管控域 | 多级审核任务 | FK=0 | SOFT_REF=target_no,operator_no';

-- [管控域] 后台操作日志 · 后台所有管控操作留痕。
DROP TABLE IF EXISTS `admin_operation_log`;
CREATE TABLE `admin_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `admin_id` BIGINT UNSIGNED NOT NULL COMMENT '关联列：管理员账号',
  `module` VARCHAR(32) NOT NULL COMMENT '模块',
  `action` VARCHAR(32) NOT NULL COMMENT '动作',
  `target_no` VARCHAR(32) NULL COMMENT '对象编号（软引用）',
  `at` DATETIME NOT NULL COMMENT '发生时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_admin_operation_log_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admin_account` (`id`),
  KEY `idx_admin_operation_log_target_no` (`target_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管控域 | 后台操作日志 | FK=1 | SOFT_REF=target_no';

-- [管控域] 数据字典 · 枚举值统一字典，避免各表重复写死状态文案。
DROP TABLE IF EXISTS `dict_item`;
CREATE TABLE `dict_item` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `dict_key` VARCHAR(64) NOT NULL COMMENT '字典键',
  `dict_value_zh` VARCHAR(128) NOT NULL COMMENT '中文值',
  `dict_value_en` VARCHAR(128) NOT NULL COMMENT '英文值',
  `sort_no` INT UNSIGNED NOT NULL COMMENT '排序',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  `updated_at` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_item_dict_key` (`dict_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管控域 | 数据字典 | FK=0 | SOFT_REF=-';

-- [管控域] 平台参数 · 版本号、押金比例、服务费率等平台参数；业务表不复制这些值。
DROP TABLE IF EXISTS `platform_config`;
CREATE TABLE `platform_config` (
  `id` BIGINT UNSIGNED NOT NULL COMMENT '代理主键（业务不暴露，仅库内使用）',
  `config_key` VARCHAR(64) NOT NULL COMMENT '参数键',
  `config_value` VARCHAR(512) NOT NULL COMMENT '参数值',
  `updated_at` DATETIME NOT NULL COMMENT '更新时间',
  `created_at` DATETIME NOT NULL COMMENT '创建时间（ISO 8601）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_config_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管控域 | 平台参数 | FK=0 | SOFT_REF=-';

