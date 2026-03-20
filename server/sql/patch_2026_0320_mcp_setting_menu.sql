-- ============================================
-- UIED 菜单补丁：网站设置新增 MCP 配置入口（可重复执行）
-- 目标：
-- 1) 在「网站设置 -> 基础配置(980)」下新增二级菜单「MCP配置」
-- 2) 点击后打开 contentHub，并默认切到 tab=mcp
-- 3) 自动补齐管理员角色与历史内容中心角色授权
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 新增菜单（幂等）
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
    'MCP配置',
    'el-icon-Connection',
    35,
    'uied:setting:get',
    'mcp-config',
    'uied/setting/contentHub',
    '/system-setting/base-config/mcp-config',
    '{"tab":"mcp"}',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE paths = 'mcp-config'
      AND component = 'uied/setting/contentHub'
);

-- 2) 字段对齐（幂等修正）
UPDATE la_system_auth_menu
SET pid = 980,
    menu_type = 'C',
    menu_name = 'MCP配置',
    menu_icon = 'el-icon-Connection',
    menu_sort = 35,
    perms = 'uied:setting:get',
    selected = '/system-setting/base-config/mcp-config',
    params = '{"tab":"mcp"}',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-config'
  AND component = 'uied/setting/contentHub';

SET @mcp_setting_menu_id := (
    SELECT id
    FROM la_system_auth_menu
    WHERE paths = 'mcp-config'
      AND component = 'uied/setting/contentHub'
    ORDER BY id DESC
    LIMIT 1
);

-- 3) 管理员授权（0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, @mcp_setting_menu_id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) AS role_list
LEFT JOIN la_system_auth_perm AS perm_row
    ON perm_row.role_id = role_list.role_id
   AND perm_row.menu_id = @mcp_setting_menu_id
WHERE @mcp_setting_menu_id IS NOT NULL
  AND perm_row.id IS NULL;

-- 4) 已拥有“内容中心配置”的角色，自动补齐 MCP 配置入口权限
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), old_role.role_id, @mcp_setting_menu_id
FROM (
    SELECT DISTINCT perm.role_id
    FROM la_system_auth_perm perm
    JOIN la_system_auth_menu menu_old ON menu_old.id = perm.menu_id
    WHERE menu_old.paths = 'content-hub-config'
      AND menu_old.component = 'uied/setting/contentHub'
) AS old_role
LEFT JOIN la_system_auth_perm AS perm_exists
    ON perm_exists.role_id = old_role.role_id
   AND perm_exists.menu_id = @mcp_setting_menu_id
WHERE @mcp_setting_menu_id IS NOT NULL
  AND perm_exists.id IS NULL;

COMMIT;
