-- ============================================
-- UIED 数据库补丁：系统页面模板字段清理（可重复执行）
-- 目标：
-- 1) 将“系统页面(custom)”从导航模板字段中解耦
-- 2) 兼容历史数据（早期接入时遗留了导航模板内容）
-- 3) 不影响导航页面（navigation）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

UPDATE `uied_page`
SET
  `hero_title` = '',
  `hero_highlight_text` = '',
  `hero_subtitle` = '',
  `hot_search_tags` = NULL,
  `hero_bg_type` = 'default',
  `hero_bg_value` = '',
  `hero_display_mode` = 'search',
  `hero_scroll_websites` = NULL,
  `show_hot_recommendations` = 0,
  `show_categories` = 0,
  `update_time` = UNIX_TIMESTAMP()
WHERE `is_delete` = 0
  AND NOT (
    LOWER(COALESCE(`type`, '')) IN ('navigation', 'nav', 'channel', 'home')
    OR LOWER(`slug`) IN ('uiux', 'ai', 'design', '3d', 'ecommerce', 'interior', 'font')
  );

COMMIT;

