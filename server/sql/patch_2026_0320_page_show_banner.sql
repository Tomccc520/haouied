-- @file patch_2026_0320_page_show_banner.sql
-- @description 为 uied_page 增加 show_banner 字段（页面 Banner 独立开关）
-- @author UIED技术团队
-- @createDate 2026-03-20

SET @db_name := DATABASE();

SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_page'
    AND COLUMN_NAME = 'show_banner'
);

SET @alter_sql := IF(
  @column_exists = 0,
  'ALTER TABLE `uied_page` ADD COLUMN `show_banner` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT ''是否显示Banner'' AFTER `search_enabled`',
  'SELECT ''uied_page.show_banner already exists'' AS message'
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
