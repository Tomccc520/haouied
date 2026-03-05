-- ============================================
-- UIED 后台新增「素材中心 -> SVG 图标库」菜单（可重复执行）
-- 目标：
-- 1) 在素材中心下新增 SVG 图标库独立菜单
-- 2) 菜单指向 admin 视图：uied/svgLibrary/index
-- 3) 为角色 1（系统管理员）补充菜单授权
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 新增菜单（若不存在）
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
    700,
    'C',
    'SVG图标库',
    'el-icon-PictureRounded',
    8,
    'uied:svgLibrary:get',
    'svg-library',
    'uied/svgLibrary/index',
    '/material/index',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE pid = 700
      AND paths = 'svg-library'
      AND component = 'uied/svgLibrary/index'
);

-- 对已存在菜单做幂等修正（名称、图标、排序、显示状态）
UPDATE la_system_auth_menu
SET menu_name = 'SVG图标库',
    menu_icon = 'el-icon-PictureRounded',
    menu_sort = 8,
    perms = 'uied:svgLibrary:get',
    selected = '/material/index',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE pid = 700
  AND paths = 'svg-library'
  AND component = 'uied/svgLibrary/index';

-- 给系统管理员角色补授权（幂等）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), 1, m.id
FROM la_system_auth_menu m
LEFT JOIN la_system_auth_perm p
    ON p.role_id = 1 AND p.menu_id = m.id
WHERE m.pid = 700
  AND m.paths = 'svg-library'
  AND m.component = 'uied/svgLibrary/index'
  AND p.id IS NULL;

COMMIT;
