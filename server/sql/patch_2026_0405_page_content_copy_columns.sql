-- UIED 动态页区块文案字段补丁
-- 用途：
-- 1. 为 uied_page 增加“最新网站更新/热门推荐”文案配置字段
-- 2. 配合 2026-04-05 第二批动态化改造使用

ALTER TABLE `uied_page`
    ADD COLUMN `latest_updates_title` varchar(120) NOT NULL DEFAULT '最新网站更新' COMMENT '最新网站更新区标题' AFTER `show_hot_recommendations`,
    ADD COLUMN `latest_updates_more_text` varchar(60) NOT NULL DEFAULT '查看更多' COMMENT '最新网站更新查看更多文案' AFTER `latest_updates_title`,
    ADD COLUMN `latest_updates_loading_text` varchar(120) NOT NULL DEFAULT '正在加载最新网站...' COMMENT '最新网站更新加载文案' AFTER `latest_updates_more_text`,
    ADD COLUMN `latest_updates_empty_text` varchar(120) NOT NULL DEFAULT '近 7 天暂无更新数据' COMMENT '最新网站更新空状态文案' AFTER `latest_updates_loading_text`,
    ADD COLUMN `hot_recommendations_title` varchar(80) NOT NULL DEFAULT '热门推荐' COMMENT '热门推荐区标题' AFTER `latest_updates_empty_text`;
