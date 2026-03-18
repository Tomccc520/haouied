-- ============================================
-- UIED 菜单补丁：SEO 中心（可重复执行）
-- 目标：
-- 1) 在「网站设置 -> 基础配置(980)」下新增「SEO中心」
-- 2) 补齐查看/保存权限按钮（复用 uied:setting:get / uied:setting:save）
-- 3) 给管理员角色（0/1）自动授权
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 新增 SEO 中心菜单
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
    'SEO中心',
    'el-icon-Compass',
    26,
    'uied:setting:get',
    'seo-center-config',
    'uied/seoCenter/index',
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
      AND paths = 'seo-center-config'
      AND component = 'uied/seoCenter/index'
);

-- 2) 已存在时字段对齐
UPDATE la_system_auth_menu
SET pid = 980,
    menu_type = 'C',
    menu_name = 'SEO中心',
    menu_icon = 'el-icon-Compass',
    menu_sort = 26,
    perms = 'uied:setting:get',
    selected = '/system-setting/base-config/setting',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'seo-center-config'
  AND component = 'uied/seoCenter/index';

-- 3) 按钮权限：查看（uied:setting:get）
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
    'SEO中心查看',
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
WHERE menu_row.paths = 'seo-center-config'
  AND menu_row.component = 'uied/seoCenter/index'
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu child
    WHERE child.pid = menu_row.id
      AND child.menu_type = 'A'
      AND child.perms = 'uied:setting:get'
  );

-- 4) 按钮权限：保存（uied:setting:save）
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
    'SEO中心保存',
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
WHERE menu_row.paths = 'seo-center-config'
  AND menu_row.component = 'uied/seoCenter/index'
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu child
    WHERE child.pid = menu_row.id
      AND child.menu_type = 'A'
      AND child.perms = 'uied:setting:save'
  );

-- 5) 管理员角色授权（0/1）
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
    WHERE (paths = 'seo-center-config' AND component = 'uied/seoCenter/index')
       OR (menu_type = 'A' AND perms IN ('uied:setting:get', 'uied:setting:save') AND pid IN (
            SELECT id
            FROM la_system_auth_menu
            WHERE paths = 'seo-center-config' AND component = 'uied/seoCenter/index'
       ))
) AS menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE perm_exists.id IS NULL;

COMMIT;
