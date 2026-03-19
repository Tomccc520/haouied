-- patch_2026_0319_article_website_relation.sql
-- 说明：新增“文章绑定网址”关联表（1篇文章可绑定多个网址）
-- 适配：MySQL 5.6+

CREATE TABLE IF NOT EXISTS `uied_article_website_relation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
  `website_id` BIGINT UNSIGNED NOT NULL COMMENT '网址ID',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` BIGINT NOT NULL DEFAULT 0,
  `update_time` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_article_website` (`article_id`, `website_id`),
  KEY `idx_article` (`article_id`, `sort_order`),
  KEY `idx_website` (`website_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='文章绑定网址关联表';

