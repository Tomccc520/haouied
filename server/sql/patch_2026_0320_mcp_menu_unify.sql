-- ============================================
-- UIED 菜单补丁：MCP 菜单统一归类（可重复执行）
-- 目标：
-- 1) 确保存在一级菜单「MCP中心」
-- 2) 将「MCP配置」移动到 MCP中心 下（不再分散在网站设置）
-- 3) 自动补齐管理员与 MCP 相关角色授权
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 确保一级菜单 MCP中心 存在（挂在 UIED导航 id=702）
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
    702,
    'M',
    'MCP中心',
    'el-icon-Connection',
    42,
    '',
    'mcp-center',
    '',
    '',
    '',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE paths = 'mcp-center'
      AND menu_type = 'M'
);

UPDATE la_system_auth_menu
SET pid = 702,
    menu_type = 'M',
    menu_name = 'MCP中心',
    menu_icon = 'el-icon-Connection',
    menu_sort = 42,
    perms = '',
    component = '',
    selected = '',
    params = '',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-center'
  AND menu_type = 'M';

SET @mcp_root_id := (
    SELECT id
    FROM la_system_auth_menu
    WHERE paths = 'mcp-center'
      AND menu_type = 'M'
    ORDER BY id DESC
    LIMIT 1
);

-- 2) 新增/归位 MCP配置 到 MCP中心
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
    @mcp_root_id,
    'C',
    'MCP配置',
    'el-icon-Connection',
    45,
    'uied:setting:get',
    'mcp-config',
    'uied/setting/contentHub',
    '/mcp-center/mcp-config',
    '{"tab":"mcp"}',
    0,
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM la_system_auth_menu
      WHERE paths = 'mcp-config'
        AND component = 'uied/setting/contentHub'
  );

UPDATE la_system_auth_menu
SET pid = @mcp_root_id,
    menu_type = 'C',
    menu_name = 'MCP配置',
    menu_icon = 'el-icon-Connection',
    menu_sort = 45,
    perms = 'uied:setting:get',
    selected = '/mcp-center/mcp-config',
    params = '{"tab":"mcp"}',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND paths = 'mcp-config'
  AND component = 'uied/setting/contentHub';

SET @mcp_config_id := (
    SELECT id
    FROM la_system_auth_menu
    WHERE paths = 'mcp-config'
      AND component = 'uied/setting/contentHub'
    ORDER BY id DESC
    LIMIT 1
);

-- 3) 管理员授权（role_id 0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, @mcp_config_id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) AS role_list
LEFT JOIN la_system_auth_perm perm_row
       ON perm_row.role_id = role_list.role_id
      AND perm_row.menu_id = @mcp_config_id
WHERE @mcp_config_id IS NOT NULL
  AND perm_row.id IS NULL;

-- 4) 已有 MCP 列表权限的角色，自动补齐 MCP配置 权限
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_with_mcp.role_id, @mcp_config_id
FROM (
    SELECT DISTINCT perm.role_id
    FROM la_system_auth_perm perm
    JOIN la_system_auth_menu m ON m.id = perm.menu_id
    WHERE m.paths = 'mcp-list'
      AND m.menu_type = 'C'
) role_with_mcp
LEFT JOIN la_system_auth_perm has_perm
       ON has_perm.role_id = role_with_mcp.role_id
      AND has_perm.menu_id = @mcp_config_id
WHERE @mcp_config_id IS NOT NULL
  AND has_perm.id IS NULL;

COMMIT;

