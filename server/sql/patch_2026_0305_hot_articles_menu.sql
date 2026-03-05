-- ============================================
-- UIED 新增「热门文章配置」菜单补丁（可重复执行）
-- 目标：
-- 1) 在「网站设置 -> 基础配置」下新增独立菜单
-- 2) 指向 admin 页面：uied/setting/hotArticles
-- 3) 自动授权给 role_id=0/1（管理员角色）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 菜单：热门文章配置（幂等）
INSERT INTO la_system_auth_menu (
    pid,
    menu_type,
    menu_name,
    menu_icon,
    menu_sort,
    perms,
    paths,
    component,
    selected,
    params,
    is_cache,
    is_show,
    is_disable,
    create_time,
    update_time
)
SELECT
    980,
    'C',
    '热门文章配置',
    'el-icon-Reading',
    26,
    'uied:setting:get',
    'hot-articles-config',
    'uied/setting/hotArticles',
    '/system-setting/base-config/setting',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE pid = 980
      AND paths = 'hot-articles-config'
      AND component = 'uied/setting/hotArticles'
);

-- 已存在时做字段对齐（幂等修正）
UPDATE la_system_auth_menu
SET menu_name = '热门文章配置',
    menu_icon = 'el-icon-Reading',
    menu_sort = 26,
    perms = 'uied:setting:get',
    selected = '/system-setting/base-config/setting',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE pid = 980
  AND paths = 'hot-articles-config'
  AND component = 'uied/setting/hotArticles';

-- 管理员角色授权（role 0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_row.id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) AS role_list
JOIN la_system_auth_menu AS menu_row
    ON menu_row.pid = 980
   AND menu_row.paths = 'hot-articles-config'
   AND menu_row.component = 'uied/setting/hotArticles'
LEFT JOIN la_system_auth_perm AS perm_row
    ON perm_row.role_id = role_list.role_id
   AND perm_row.menu_id = menu_row.id
WHERE perm_row.id IS NULL;

-- 预置热门文章默认配置（仅在未配置时写入）
INSERT INTO uied_site_setting (`key`, `value`, `description`, create_time, update_time)
SELECT
    'hotArticlesConfig',
    JSON_OBJECT(
        'enabled', true,
        'displayPlacements', JSON_ARRAY('nav_quick_entry', 'home_menu'),
        'displayLabel', '热门文章',
        'displayPath', '/p/hot',
        'displaySort', 84,
        'displayOpenInNewTab', false,
        'pageKicker', 'HOT ARTICLES',
        'pageTitle', '热门文章',
        'pageDescription', '同步 uied.cn 的优质文章内容，快速发现值得阅读的设计与产品洞察。',
        'pageSize', 24,
        'defaultOrderBy', 'date',
        'defaultOrder', 'desc',
        'defaultCategoryId', 417,
        'defaultTagId', 0,
        'apiSourceMode', 'auto',
        'motionEnabled', true,
        'heroTagline', '聚合国内外AI精选内容，探索AI技术前沿与应用',
        'linksNewWindow', true,
        'filterPresets', JSON_ARRAY(
            JSON_OBJECT('key', 'all', 'name', '全部', 'type', 'all', 'id', 0, 'description', '全部热门文章', 'enabled', true, 'sort', 10),
            JSON_OBJECT('key', 'aigc', 'name', 'AIGC', 'type', 'category', 'id', 417, 'description', 'AIGC 分类内容', 'enabled', true, 'sort', 20),
            JSON_OBJECT('key', 'ai-tools', 'name', 'AI工具', 'type', 'category', 'id', 3351, 'description', 'AI 工具分类内容', 'enabled', true, 'sort', 30),
            JSON_OBJECT('key', 'productivity', 'name', '效率工具', 'type', 'category', 'id', 338, 'description', '效率工具分类内容', 'enabled', true, 'sort', 40),
            JSON_OBJECT('key', 'design', 'name', '设计干货', 'type', 'category', 'id', 307, 'description', '设计干货分类内容', 'enabled', true, 'sort', 50)
        ),
        'workbenchMenuItems', JSON_ARRAY(
            JSON_OBJECT('key', 'latest-articles', 'label', '最新文章', 'mode', 'latest', 'iconKey', 'latest', 'source', 'uied_latest', 'presetKey', '', 'fallbackType', 'category', 'fallbackId', 0, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '按发布时间实时更新', 'enabled', true, 'sort', 10),
            JSON_OBJECT('key', 'hot-articles', 'label', '热门文章', 'mode', 'hot', 'iconKey', 'hot', 'source', 'uied_hot', 'presetKey', '', 'fallbackType', 'category', 'fallbackId', 0, 'categoryId', 417, 'tagId', 0, 'orderBy', 'views', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '按热度优先展示', 'enabled', true, 'sort', 20),
            JSON_OBJECT('key', 'ai-realtime', 'label', 'AI实时文章', 'mode', 'preset', 'iconKey', 'ai', 'source', 'uied_latest', 'presetKey', 'aigc', 'fallbackType', 'category', 'fallbackId', 417, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 30),
            JSON_OBJECT('key', 'ai-products', 'label', 'AI产品榜单', 'mode', 'preset', 'iconKey', 'product', 'source', 'uied_latest', 'presetKey', 'ai-tools', 'fallbackType', 'category', 'fallbackId', 3351, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 40),
            JSON_OBJECT('key', 'design-articles', 'label', '设计文章', 'mode', 'preset', 'iconKey', 'design', 'source', 'uied_latest', 'presetKey', 'design', 'fallbackType', 'category', 'fallbackId', 307, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 50),
            JSON_OBJECT('key', 'design-resources', 'label', '设计素材', 'mode', 'preset', 'iconKey', 'resource', 'source', 'uied_latest', 'presetKey', 'productivity', 'fallbackType', 'category', 'fallbackId', 338, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 60),
            JSON_OBJECT('key', 'top-authors', 'label', '优秀作者', 'mode', 'authorHot', 'iconKey', 'author', 'source', 'uied_hot', 'presetKey', '', 'fallbackType', 'category', 'fallbackId', 0, 'categoryId', 0, 'tagId', 0, 'orderBy', 'comment_count', 'order', 'desc', 'period', 'weekly', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 70),
            JSON_OBJECT('key', 'study-circles', 'label', '学习圈子', 'mode', 'circle', 'iconKey', 'circle', 'source', 'uied_latest', 'presetKey', '', 'fallbackType', 'category', 'fallbackId', 0, 'categoryId', 0, 'tagId', 393, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', '', 'subtitle', '', 'enabled', true, 'sort', 80),
            JSON_OBJECT('key', 'back-main-site', 'label', '返回主站', 'mode', 'external', 'iconKey', 'home', 'source', 'auto', 'presetKey', '', 'fallbackType', 'category', 'fallbackId', 0, 'categoryId', 0, 'tagId', 0, 'orderBy', 'date', 'order', 'desc', 'period', 'all', 'externalUrl', 'https://www.uied.cn', 'subtitle', '', 'enabled', true, 'sort', 999)
        )
    ),
    '热门文章（Hot）页面运营配置',
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM uied_site_setting
    WHERE `key` = 'hotArticlesConfig'
);

COMMIT;
