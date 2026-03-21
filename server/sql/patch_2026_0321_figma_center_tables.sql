-- ============================================
-- UIED NAV 1.0.9 补丁：Figma 插件中心数据表
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;

-- 1) Figma 插件分类表
CREATE TABLE IF NOT EXISTS `uied_figma_plugin_category` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '分类名称',
  `slug` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '分类标识',
  `description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '分类描述',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `seo_title` VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'SEO标题',
  `seo_keywords` VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'SEO关键词',
  `seo_description` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'SEO描述',
  `is_delete` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `create_time` BIGINT NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` BIGINT NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_figma_plugin_category_slug` (`slug`),
  KEY `idx_figma_plugin_category_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件分类表';

-- 2) Figma 插件标签表
CREATE TABLE IF NOT EXISTS `uied_figma_plugin_tag` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '标签名称',
  `slug` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '标签标识',
  `description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '标签描述',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `is_delete` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `create_time` BIGINT NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` BIGINT NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_figma_plugin_tag_slug` (`slug`),
  KEY `idx_figma_plugin_tag_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件标签表';

-- 3) Figma 插件内容表
CREATE TABLE IF NOT EXISTS `uied_figma_plugin` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(220) NOT NULL DEFAULT '' COMMENT '插件名称',
  `slug` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '插件标识',
  `summary` TEXT COMMENT '摘要',
  `content` LONGTEXT COMMENT '详情正文',
  `icon_url` VARCHAR(1024) DEFAULT NULL COMMENT '图标地址',
  `cover_url` VARCHAR(1024) DEFAULT NULL COMMENT '封面地址',
  `official_url` VARCHAR(1024) DEFAULT NULL COMMENT 'Figma 官方链接',
  `docs_url` VARCHAR(1024) DEFAULT NULL COMMENT '文档链接',
  `github_url` VARCHAR(1024) DEFAULT NULL COMMENT 'GitHub 链接',
  `figma_plugin_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'Figma 官方插件ID',
  `author_name` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '作者名称',
  `transport_type` VARCHAR(32) NOT NULL DEFAULT 'http' COMMENT '保留字段-协议类型',
  `runtime` VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT '保留字段-运行时',
  `protocol_version` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '保留字段-协议版本',
  `category_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态 draft/published',
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `publish_time` BIGINT DEFAULT NULL COMMENT '发布时间',
  `click_count` BIGINT NOT NULL DEFAULT 0 COMMENT '点击量',
  `view_count` BIGINT NOT NULL DEFAULT 0 COMMENT '浏览量',
  `seo_title` VARCHAR(220) NOT NULL DEFAULT '' COMMENT 'SEO标题',
  `seo_keywords` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'SEO关键词',
  `seo_description` VARCHAR(2000) NOT NULL DEFAULT '' COMMENT 'SEO描述',
  `source_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '来源类型',
  `source_url` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '来源地址',
  `is_delete` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `create_time` BIGINT NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` BIGINT NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_figma_plugin_slug` (`slug`),
  KEY `idx_figma_plugin_category` (`category_id`),
  KEY `idx_figma_plugin_status` (`status`),
  KEY `idx_figma_plugin_recommend` (`is_recommended`),
  KEY `idx_figma_plugin_sort` (`sort_order`),
  KEY `idx_figma_plugin_publish` (`publish_time`),
  KEY `idx_figma_plugin_update` (`update_time`),
  KEY `idx_figma_plugin_source` (`figma_plugin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件内容表';

-- 4) Figma 插件标签关联表
CREATE TABLE IF NOT EXISTS `uied_figma_plugin_item_tag` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` BIGINT UNSIGNED NOT NULL COMMENT '插件ID',
  `tag_id` BIGINT UNSIGNED NOT NULL COMMENT '标签ID',
  `is_delete` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `create_time` BIGINT NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` BIGINT NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_figma_plugin_item_tag` (`item_id`, `tag_id`),
  KEY `idx_figma_plugin_item_tag_item` (`item_id`),
  KEY `idx_figma_plugin_item_tag_tag` (`tag_id`),
  KEY `idx_figma_plugin_item_tag_delete` (`is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件标签关联表';
