/**
 * @file patch_2026_0322_hot_search_mode_and_click_daily.sql
 * @description 页面热门搜索模式配置 + 网站点击日统计表
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

-- =========================================================
-- 1) 页面热门搜索策略配置字段
-- =========================================================

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uied_page' AND COLUMN_NAME = 'hot_search_mode') = 0,
  "ALTER TABLE `uied_page` ADD COLUMN `hot_search_mode` varchar(30) NOT NULL DEFAULT 'custom_then_dynamic' COMMENT '热门搜索模式: custom_only/dynamic_only/custom_then_dynamic' AFTER `hot_search_tags`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uied_page' AND COLUMN_NAME = 'hot_search_fixed_count') = 0,
  "ALTER TABLE `uied_page` ADD COLUMN `hot_search_fixed_count` int unsigned NOT NULL DEFAULT 4 COMMENT '固定词数量' AFTER `hot_search_mode`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uied_page' AND COLUMN_NAME = 'hot_search_dynamic_count') = 0,
  "ALTER TABLE `uied_page` ADD COLUMN `hot_search_dynamic_count` int unsigned NOT NULL DEFAULT 6 COMMENT '动态补齐数量' AFTER `hot_search_fixed_count`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uied_page' AND COLUMN_NAME = 'hot_search_window_days') = 0,
  "ALTER TABLE `uied_page` ADD COLUMN `hot_search_window_days` int unsigned NOT NULL DEFAULT 7 COMMENT '动态热词窗口天数' AFTER `hot_search_dynamic_count`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uied_page' AND COLUMN_NAME = 'hot_search_min_score') = 0,
  "ALTER TABLE `uied_page` ADD COLUMN `hot_search_min_score` int unsigned NOT NULL DEFAULT 1 COMMENT '动态热词最低阈值' AFTER `hot_search_window_days`",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 历史数据兜底（重复执行无副作用）
UPDATE `uied_page`
SET
  `hot_search_mode` = IFNULL(NULLIF(`hot_search_mode`, ''), 'custom_then_dynamic'),
  `hot_search_fixed_count` = IFNULL(NULLIF(`hot_search_fixed_count`, 0), 4),
  `hot_search_dynamic_count` = IFNULL(NULLIF(`hot_search_dynamic_count`, 0), 6),
  `hot_search_window_days` = IFNULL(NULLIF(`hot_search_window_days`, 0), 7),
  `hot_search_min_score` = IFNULL(NULLIF(`hot_search_min_score`, 0), 1)
WHERE `is_delete` = 0;

-- =========================================================
-- 2) 网站点击日统计表（用于最近7天动态热词）
-- =========================================================

CREATE TABLE IF NOT EXISTS `uied_website_click_daily` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `website_id` bigint unsigned NOT NULL COMMENT '网站ID',
  `metric_date` int unsigned NOT NULL COMMENT '统计日期(YYYYMMDD)',
  `click_count` bigint unsigned NOT NULL DEFAULT 0 COMMENT '当日点击数',
  `create_time` bigint unsigned NOT NULL DEFAULT 0,
  `update_time` bigint unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_website_date` (`website_id`, `metric_date`),
  KEY `idx_metric_date` (`metric_date`),
  KEY `idx_website_date` (`website_id`, `metric_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站点击日统计表';
