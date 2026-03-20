-- ============================================
-- UIED 数据库补丁：MCP 中心数据表（可重复执行）
-- 目标：
-- 1) 新增 MCP 条目/分类/标签/关联四张表
-- 2) 兼容 MySQL 5.6+（避免超长唯一索引）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- MCP 分类表
CREATE TABLE IF NOT EXISTS `uied_mcp_category` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL DEFAULT '' COMMENT '分类名称',
  `slug` varchar(120) NOT NULL DEFAULT '' COMMENT '分类标识',
  `description` varchar(1000) DEFAULT NULL COMMENT '分类描述',
  `sort_order` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序',
  `seo_title` varchar(191) DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` varchar(500) DEFAULT NULL COMMENT 'SEO关键词',
  `seo_description` varchar(1000) DEFAULT NULL COMMENT 'SEO描述',
  `is_delete` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mcp_category_slug` (`slug`),
  KEY `idx_mcp_category_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP 分类表';

-- MCP 标签表
CREATE TABLE IF NOT EXISTS `uied_mcp_tag` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL DEFAULT '' COMMENT '标签名称',
  `slug` varchar(120) NOT NULL DEFAULT '' COMMENT '标签标识',
  `description` varchar(500) DEFAULT NULL COMMENT '标签描述',
  `sort_order` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序',
  `is_delete` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mcp_tag_slug` (`slug`),
  KEY `idx_mcp_tag_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP 标签表';

-- MCP 条目表
CREATE TABLE IF NOT EXISTS `uied_mcp_item` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL DEFAULT '' COMMENT '名称',
  `slug` varchar(191) NOT NULL DEFAULT '' COMMENT 'URL标识',
  `summary` text COMMENT '摘要',
  `content` longtext COMMENT '正文',
  `icon_url` varchar(500) DEFAULT NULL COMMENT '图标地址',
  `cover_url` varchar(500) DEFAULT NULL COMMENT '封面地址',
  `official_url` varchar(500) DEFAULT NULL COMMENT '官网地址',
  `docs_url` varchar(500) DEFAULT NULL COMMENT '文档地址',
  `github_url` varchar(500) DEFAULT NULL COMMENT 'GitHub地址',
  `transport_type` varchar(20) NOT NULL DEFAULT 'http' COMMENT '传输协议',
  `runtime` varchar(20) NOT NULL DEFAULT 'other' COMMENT '运行时',
  `protocol_version` varchar(50) DEFAULT NULL COMMENT '协议版本',
  `category_id` int(10) unsigned DEFAULT NULL COMMENT '分类ID',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT '状态 draft/published',
  `is_recommended` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否推荐',
  `sort_order` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序',
  `publish_time` int(10) unsigned DEFAULT NULL COMMENT '发布时间',
  `click_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '点击数',
  `view_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '浏览数',
  `seo_title` varchar(191) DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` varchar(500) DEFAULT NULL COMMENT 'SEO关键词',
  `seo_description` varchar(1000) DEFAULT NULL COMMENT 'SEO描述',
  `is_delete` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mcp_item_slug` (`slug`),
  KEY `idx_mcp_item_category` (`category_id`),
  KEY `idx_mcp_item_status` (`status`),
  KEY `idx_mcp_item_recommend` (`is_recommended`),
  KEY `idx_mcp_item_sort` (`sort_order`),
  KEY `idx_mcp_item_publish` (`publish_time`),
  KEY `idx_mcp_item_update` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP 条目表';

-- MCP 条目与标签关联表
CREATE TABLE IF NOT EXISTS `uied_mcp_item_tag` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int(10) unsigned NOT NULL COMMENT '条目ID',
  `tag_id` int(10) unsigned NOT NULL COMMENT '标签ID',
  `is_delete` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mcp_item_tag` (`item_id`, `tag_id`),
  KEY `idx_mcp_item_tag_item` (`item_id`),
  KEY `idx_mcp_item_tag_tag` (`tag_id`),
  KEY `idx_mcp_item_tag_delete` (`is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP 条目标签关联表';

COMMIT;
