-- 投稿服务字段补丁（兼容“AI产品提交及增长服务 / 付费加热推广产品”）
-- 执行方式（示例）：
-- 本机/宝塔: mysql -h127.0.0.1 -P3306 -uroot -proot uied_nav < server/sql/patch_2026_0305_submission_service_fields.sql
-- Docker:    mysql -h127.0.0.1 -P3308 -uuied -puied123456 uied_nav < server/sql/patch_2026_0305_submission_service_fields.sql

/**
 * MySQL 5.6/5.7 兼容说明：
 * - 不使用 `ADD COLUMN IF NOT EXISTS`（8.0+ 语法）
 * - 通过 information_schema 检查后按需执行 ALTER
 */
SET @db_name := DATABASE();

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'icon_url'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `icon_url` varchar(500) DEFAULT NULL COMMENT '网站图标URL' AFTER `description`",
  "SELECT 'uied_website_submission.icon_url already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'tags'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `tags` text COMMENT '标签文本' AFTER `category_id`",
  "SELECT 'uied_website_submission.tags already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'service_type'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `service_type` varchar(32) NOT NULL DEFAULT 'ai_growth' COMMENT '服务类型: ai_growth / paid_boost' AFTER `status`",
  "SELECT 'uied_website_submission.service_type already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'service_meta'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `service_meta` text COMMENT '服务扩展信息(JSON)' AFTER `service_type`",
  "SELECT 'uied_website_submission.service_meta already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;
