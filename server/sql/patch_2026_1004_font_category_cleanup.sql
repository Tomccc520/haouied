-- UIED-NAV 字体分类清理补丁
-- 目的：隐藏历史 design-font 重复分类及其误挂的配色子分类，保留新字体导航（font-resources）作为唯一公开入口。
-- 执行方式：mysql -h127.0.0.1 -P3306 -u<user> -p <database> < patch_2026_1004_font_category_cleanup.sql

START TRANSACTION;

-- design-font 原属于旧设计导航，子分类实际是配色资源，不能继续作为字体分类公开展示。
UPDATE `uied_category`
SET `is_show` = 0,
    `update_time` = UNIX_TIMESTAMP()
WHERE `slug` = 'design-font'
  AND `is_delete` = 0;

UPDATE `uied_category`
SET `is_show` = 0,
    `update_time` = UNIX_TIMESTAMP()
WHERE `slug` IN (
    'design-color-palette',
    'design-color-theory',
    'design-color-tools',
    'design-color-inspiration'
  )
  AND `is_delete` = 0;

COMMIT;
