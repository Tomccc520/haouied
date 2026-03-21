-- =============================================
-- UIED NAV 1.0.9 补丁：页面分组规范 + Figma 独立页初始化
-- 兼容 MySQL 5.6+
-- =============================================

-- 1) 固定导航页统一标记为 navigation
UPDATE `uied_page`
SET `type` = 'navigation'
WHERE `is_delete` = 0
  AND LOWER(`slug`) IN ('uiux', 'ai', 'design', '3d', 'ecommerce', 'interior', 'font');

-- 2) 非导航页且 type 为空时，补齐为 custom（后台文案展示为“系统页面”）
UPDATE `uied_page`
SET `type` = 'custom'
WHERE `is_delete` = 0
  AND (`type` IS NULL OR TRIM(`type`) = '')
  AND LOWER(`slug`) NOT IN ('uiux', 'ai', 'design', '3d', 'ecommerce', 'interior', 'font');

-- 3) 清理历史占位页 figma-plugins（存在则软删除）
UPDATE `uied_page`
SET `is_delete` = 1,
    `delete_time` = UNIX_TIMESTAMP(),
    `update_time` = UNIX_TIMESTAMP()
WHERE `is_delete` = 0
  AND LOWER(`slug`) = 'figma-plugins';

-- 4) 初始化 Figma 系统页（不存在时插入）
INSERT INTO `uied_page` (
  `name`,
  `slug`,
  `type`,
  `description`,
  `sort`,
  `is_show`,
  `hero_title`,
  `hero_highlight_text`,
  `hero_subtitle`,
  `hot_search_tags`,
  `hero_bg_type`,
  `hero_bg_value`,
  `hero_display_mode`,
  `search_placeholder`,
  `search_enabled`,
  `show_banner`,
  `show_hot_recommendations`,
  `show_categories`,
  `show_sidebar`,
  `theme_color`,
  `is_delete`,
  `create_time`,
  `update_time`,
  `delete_time`
)
SELECT
  'Figma 插件',
  'figma',
  'custom',
  '收录 Figma 插件、组件库与设计协作工具。',
  85,
  1,
  'Figma 插件收录中心',
  'Figma Plugins',
  '集中收录设计提效、协作、原型与自动化插件，持续更新实用工具。',
  '["自动布局","原型插件","图标工具","设计协作"]',
  'gradient',
  'linear-gradient(135deg,#14B8A6 0%,#0EA5E9 100%)',
  'search',
  '搜索 Figma 插件、组件库、设计协作工具',
  1,
  1,
  1,
  1,
  1,
  '#14B8A6',
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM `uied_page`
  WHERE LOWER(`slug`) = 'figma'
    AND `is_delete` = 0
);

-- 5) 前端导航菜单补齐 Figma 入口（不存在则新增，已存在则修复）
UPDATE `uied_nav_menu`
SET `text` = 'Figma 插件',
    `link` = '/figma',
    `external` = 0,
    `is_show` = 1,
    `is_delete` = 0,
    `update_time` = UNIX_TIMESTAMP(),
    `delete_time` = 0
WHERE `old_id` = 'builtin:figma';

INSERT INTO `uied_nav_menu` (
  `old_id`,
  `text`,
  `link`,
  `external`,
  `parent_id`,
  `sort`,
  `is_show`,
  `is_delete`,
  `create_time`,
  `update_time`,
  `delete_time`
)
SELECT
  'builtin:figma',
  'Figma 插件',
  '/figma',
  0,
  NULL,
  95,
  1,
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM `uied_nav_menu`
  WHERE `old_id` = 'builtin:figma'
    AND `is_delete` = 0
);
