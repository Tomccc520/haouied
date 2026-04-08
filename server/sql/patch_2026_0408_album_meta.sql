-- UIED 素材中心元数据补丁（WP 媒体库参数持久化）
-- 执行日期：2026-04-08

CREATE TABLE IF NOT EXISTS `la_album_meta` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `album_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '素材ID（关联 la_album.id）',
  `alt` varchar(255) NOT NULL DEFAULT '' COMMENT '替代文本',
  `title` varchar(255) NOT NULL DEFAULT '' COMMENT '标题',
  `caption` varchar(255) NOT NULL DEFAULT '' COMMENT '说明文字',
  `description` text COMMENT '描述',
  `mime_type` varchar(100) NOT NULL DEFAULT '' COMMENT 'MIME类型',
  `width` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '图片宽度',
  `height` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '图片高度',
  `create_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_album_id` (`album_id`) USING BTREE,
  KEY `idx_update_time` (`update_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材元数据表';
