-- ============================================
-- UIED 菜单补丁：侧边栏配置中心（可重复执行）
-- 目标：
-- 1) 在「网站设置 -> 基础配置(980)」下新增「侧边栏配置」入口
-- 2) 聚合文章详情侧栏 + 网址详情侧栏统一配置页
-- 3) 补齐读取/保存权限按钮并授权管理员角色（0/1）
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 新增菜单入口
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
    '侧边栏配置',
    'el-icon-Operation',
    32,
    'uied:setting:get',
    'sidebar-config',
    'uied/setting/sidebarConfig',
    '/system-setting/base-config/sidebar-config',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE paths = 'sidebar-config'
      AND component = 'uied/setting/sidebarConfig'
);

-- 2) 已存在时字段对齐
UPDATE la_system_auth_menu
SET pid = 980,
    menu_type = 'C',
    menu_name = '侧边栏配置',
    menu_icon = 'el-icon-Operation',
    menu_sort = 32,
    perms = 'uied:setting:get',
    selected = '/system-setting/base-config/sidebar-config',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'sidebar-config'
  AND component = 'uied/setting/sidebarConfig';

-- 3) 页面按钮权限：读取
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
    menu_row.id,
    'A',
    '侧栏配置读取',
    '',
    10,
    'uied:setting:get',
    '',
    '',
    '',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
FROM la_system_auth_menu AS menu_row
WHERE menu_row.paths = 'sidebar-config'
  AND menu_row.component = 'uied/setting/sidebarConfig'
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu child
    WHERE child.pid = menu_row.id
      AND child.menu_type = 'A'
      AND child.perms = 'uied:setting:get'
  );

-- 4) 页面按钮权限：保存网址侧栏
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
    menu_row.id,
    'A',
    '侧栏配置保存',
    '',
    20,
    'uied:setting:save',
    '',
    '',
    '',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
FROM la_system_auth_menu AS menu_row
WHERE menu_row.paths = 'sidebar-config'
  AND menu_row.component = 'uied/setting/sidebarConfig'
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu child
    WHERE child.pid = menu_row.id
      AND child.menu_type = 'A'
      AND child.perms = 'uied:setting:save'
  );

-- 5) 页面按钮权限：保存文章侧栏
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
    menu_row.id,
    'A',
    '文章侧栏保存',
    '',
    30,
    'uied:setting:saveArticleConfig',
    '',
    '',
    '',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
FROM la_system_auth_menu AS menu_row
WHERE menu_row.paths = 'sidebar-config'
  AND menu_row.component = 'uied/setting/sidebarConfig'
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu child
    WHERE child.pid = menu_row.id
      AND child.menu_type = 'A'
      AND child.perms = 'uied:setting:saveArticleConfig'
  );

-- 6) 管理员角色授权（0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_list.id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) AS role_list
JOIN (
    SELECT id
    FROM la_system_auth_menu
    WHERE (paths = 'sidebar-config' AND component = 'uied/setting/sidebarConfig')
       OR (menu_type = 'A' AND pid IN (
            SELECT id
            FROM la_system_auth_menu
            WHERE paths = 'sidebar-config' AND component = 'uied/setting/sidebarConfig'
       ))
) AS menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE perm_exists.id IS NULL;

COMMIT;
