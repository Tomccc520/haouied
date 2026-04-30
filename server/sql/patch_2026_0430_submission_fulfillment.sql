-- 投稿服务履约字段/日志补丁
-- 执行方式（示例）：
-- 本机/宝塔: mysql -h127.0.0.1 -P3306 -uroot -proot uied_nav < server/sql/patch_2026_0430_submission_fulfillment.sql
-- Docker:    mysql -h127.0.0.1 -P3308 -uuied -puied123456 uied_nav < server/sql/patch_2026_0430_submission_fulfillment.sql

/**
 * MySQL 5.6/5.7 兼容说明：
 * - 不使用 `ADD COLUMN IF NOT EXISTS`（8.0+ 语法）
 * - 通过 information_schema 检查后按需执行 ALTER
 */
SET @db_name := DATABASE();

CREATE TABLE IF NOT EXISTS `uied_submission_fulfillment_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` int unsigned NOT NULL DEFAULT 0 COMMENT '投稿ID',
  `order_no` varchar(64) DEFAULT NULL COMMENT '支付订单号',
  `action` varchar(32) NOT NULL DEFAULT '' COMMENT '动作',
  `from_status` varchar(32) DEFAULT NULL COMMENT '原履约状态',
  `to_status` varchar(32) NOT NULL DEFAULT '' COMMENT '新履约状态',
  `note` varchar(255) DEFAULT NULL COMMENT '备注',
  `operator_id` int unsigned NOT NULL DEFAULT 0 COMMENT '操作人ID',
  `create_time` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_submission_id` (`submission_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_to_status` (`to_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投稿服务履约日志表';

SET @after_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'uied_website_submission' AND COLUMN_NAME = 'service_meta') > 0,
  'service_meta',
  'status'
);

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'reviewed_at'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `reviewed_at` int unsigned NOT NULL DEFAULT 0 COMMENT '审核时间' AFTER `status`",
  "SELECT 'uied_website_submission.reviewed_at already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'reject_reason'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `reject_reason` text COMMENT '拒绝原因' AFTER `reviewed_at`",
  "SELECT 'uied_website_submission.reject_reason already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'fulfillment_status'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  CONCAT("ALTER TABLE `uied_website_submission` ADD COLUMN `fulfillment_status` varchar(32) NOT NULL DEFAULT 'pending_review' COMMENT '履约状态' AFTER `", @after_col, "`"),
  "SELECT 'uied_website_submission.fulfillment_status already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'fulfillment_note'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `fulfillment_note` varchar(255) DEFAULT NULL COMMENT '履约备注' AFTER `fulfillment_status`",
  "SELECT 'uied_website_submission.fulfillment_note already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'fulfilled_at'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `fulfilled_at` int unsigned NOT NULL DEFAULT 0 COMMENT '履约完成时间' AFTER `fulfillment_note`",
  "SELECT 'uied_website_submission.fulfilled_at already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'related_website_id'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `related_website_id` int unsigned NOT NULL DEFAULT 0 COMMENT '关联收录网站ID' AFTER `fulfilled_at`",
  "SELECT 'uied_website_submission.related_website_id already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND COLUMN_NAME = 'related_banner_id'
);
SET @ddl_sql := IF(
  @column_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD COLUMN `related_banner_id` int unsigned NOT NULL DEFAULT 0 COMMENT '关联广告位ID' AFTER `related_website_id`",
  "SELECT 'uied_website_submission.related_banner_id already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND INDEX_NAME = 'idx_submission_fulfillment_status'
);
SET @ddl_sql := IF(
  @index_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD INDEX `idx_submission_fulfillment_status` (`fulfillment_status`)",
  "SELECT 'idx_submission_fulfillment_status already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_website_submission'
    AND INDEX_NAME = 'idx_submission_related_website_id'
);
SET @ddl_sql := IF(
  @index_exists = 0,
  "ALTER TABLE `uied_website_submission` ADD INDEX `idx_submission_related_website_id` (`related_website_id`)",
  "SELECT 'idx_submission_related_website_id already exists' AS info"
);
PREPARE ddl_stmt FROM @ddl_sql;
EXECUTE ddl_stmt;
DEALLOCATE PREPARE ddl_stmt;

UPDATE `uied_website_submission`
SET `fulfillment_status` = 'fulfilled',
    `fulfillment_note` = COALESCE(`fulfillment_note`, '历史审核通过记录'),
    `fulfilled_at` = IF(`reviewed_at` > 0, `reviewed_at`, `update_time`)
WHERE `status` = 'approved'
  AND `fulfillment_status` = 'pending_review';

UPDATE `uied_website_submission`
SET `fulfillment_status` = 'rejected',
    `fulfillment_note` = COALESCE(`fulfillment_note`, `reject_reason`)
WHERE `status` = 'rejected'
  AND `fulfillment_status` = 'pending_review';
