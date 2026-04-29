-- UIED 热门推荐绑定网站 ID 补丁
-- 用途：
-- 1. 为热门推荐增加 website_id，避免只保存名称/链接快照
-- 2. 按 URL 自动回填历史热门推荐，后续展示可读取网站库最新名称与链接

ALTER TABLE `uied_hot_recommendation`
    ADD COLUMN `website_id` int unsigned NOT NULL DEFAULT 0 COMMENT '关联网站ID' AFTER `old_id`;

ALTER TABLE `uied_hot_recommendation`
    ADD KEY `idx_website_id` (`website_id`);

UPDATE `uied_hot_recommendation` hr
INNER JOIN `uied_website` w ON hr.url = w.url AND w.is_delete = 0
SET hr.website_id = w.id
WHERE hr.is_delete = 0
  AND (hr.website_id IS NULL OR hr.website_id = 0);
