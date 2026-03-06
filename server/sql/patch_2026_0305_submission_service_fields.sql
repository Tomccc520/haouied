-- 投稿服务字段补丁（兼容“AI产品提交及增长服务 / 付费加热推广产品”）
-- 执行方式（示例）：
-- mysql -h127.0.0.1 -P3308 -uuied -puied123456 uied_nav < server/sql/patch_2026_0305_submission_service_fields.sql

ALTER TABLE `uied_website_submission`
  ADD COLUMN IF NOT EXISTS `icon_url` varchar(500) DEFAULT NULL COMMENT '网站图标URL' AFTER `description`,
  ADD COLUMN IF NOT EXISTS `tags` text COMMENT '标签文本' AFTER `category_id`,
  ADD COLUMN IF NOT EXISTS `service_type` varchar(32) NOT NULL DEFAULT 'ai_growth' COMMENT '服务类型: ai_growth / paid_boost' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `service_meta` text COMMENT '服务扩展信息(JSON)' AFTER `service_type`;
