-- ============================================
-- UIED 菜单补丁：MCP 中心（可重复执行）
-- 目标：
-- 1) 新增一级菜单「MCP中心」
-- 2) 新增二级菜单：资源管理 / 分类管理 / 标签管理 / 发布管理
-- 3) 补齐权限按钮并授权管理员角色（0/1）
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 一级菜单：MCP中心（挂在 UIED导航 下，pid=702）
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
    WHERE pid = 702
      AND paths = 'mcp-center'
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

-- 2) 二级菜单：资源管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @mcp_root_id, 'C', '资源管理', 'el-icon-List', 10, 'uied:mcp:list',
    'mcp-list', 'uied/mcp/index', '/mcp-center/mcp-list',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @mcp_root_id
      AND paths = 'mcp-list'
      AND component = 'uied/mcp/index'
  );

UPDATE la_system_auth_menu
SET pid = @mcp_root_id,
    menu_type = 'C',
    menu_name = '资源管理',
    menu_icon = 'el-icon-List',
    menu_sort = 10,
    perms = 'uied:mcp:list',
    selected = '/mcp-center/mcp-list',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-list'
  AND menu_type = 'C';

-- 3) 二级菜单：分类管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @mcp_root_id, 'C', '分类管理', 'el-icon-Folder', 20, 'uied:mcp:category:list',
    'mcp-category', 'uied/mcp/category', '/mcp-center/mcp-category',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @mcp_root_id
      AND paths = 'mcp-category'
      AND component = 'uied/mcp/category'
  );

UPDATE la_system_auth_menu
SET pid = @mcp_root_id,
    menu_type = 'C',
    menu_name = '分类管理',
    menu_icon = 'el-icon-Folder',
    menu_sort = 20,
    perms = 'uied:mcp:category:list',
    selected = '/mcp-center/mcp-category',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-category'
  AND menu_type = 'C';

-- 4) 二级菜单：标签管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @mcp_root_id, 'C', '标签管理', 'el-icon-CollectionTag', 30, 'uied:mcp:tag:list',
    'mcp-tag', 'uied/mcp/tag', '/mcp-center/mcp-tag',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @mcp_root_id
      AND paths = 'mcp-tag'
      AND component = 'uied/mcp/tag'
  );

UPDATE la_system_auth_menu
SET pid = @mcp_root_id,
    menu_type = 'C',
    menu_name = '标签管理',
    menu_icon = 'el-icon-CollectionTag',
    menu_sort = 30,
    perms = 'uied:mcp:tag:list',
    selected = '/mcp-center/mcp-tag',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-tag'
  AND menu_type = 'C';

-- 5) 二级菜单：发布管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @mcp_root_id, 'C', '发布管理', 'el-icon-EditPen', 40, 'uied:mcp:add',
    'mcp-publish', 'uied/mcp/publish', '/mcp-center/mcp-list',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @mcp_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @mcp_root_id
      AND paths = 'mcp-publish'
      AND component = 'uied/mcp/publish'
  );

UPDATE la_system_auth_menu
SET pid = @mcp_root_id,
    menu_type = 'C',
    menu_name = '发布管理',
    menu_icon = 'el-icon-EditPen',
    menu_sort = 40,
    perms = 'uied:mcp:add',
    selected = '/mcp-center/mcp-list',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'mcp-publish'
  AND menu_type = 'C';

SET @mcp_list_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'mcp-list' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @mcp_category_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'mcp-category' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @mcp_tag_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'mcp-tag' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @mcp_publish_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'mcp-publish' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);

-- 6) MCP列表按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @mcp_list_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT 'MCP读取' AS menu_name, 10 AS menu_sort, 'uied:mcp:list' AS perms
    UNION ALL SELECT 'MCP详情', 20, 'uied:mcp:detail'
    UNION ALL SELECT 'MCP新增', 30, 'uied:mcp:add'
    UNION ALL SELECT 'MCP编辑', 40, 'uied:mcp:edit'
    UNION ALL SELECT 'MCP删除', 50, 'uied:mcp:del'
    UNION ALL SELECT '分类下拉', 60, 'uied:mcp:category:all'
    UNION ALL SELECT '标签下拉', 70, 'uied:mcp:tag:all'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @mcp_list_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @mcp_list_id IS NOT NULL
  AND child.id IS NULL;

-- 7) MCP分类按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @mcp_category_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '分类读取' AS menu_name, 10 AS menu_sort, 'uied:mcp:category:list' AS perms
    UNION ALL SELECT '分类全部', 20, 'uied:mcp:category:all'
    UNION ALL SELECT '分类新增', 30, 'uied:mcp:category:add'
    UNION ALL SELECT '分类编辑', 40, 'uied:mcp:category:edit'
    UNION ALL SELECT '分类删除', 50, 'uied:mcp:category:del'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @mcp_category_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @mcp_category_id IS NOT NULL
  AND child.id IS NULL;

-- 8) MCP标签按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @mcp_tag_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '标签读取' AS menu_name, 10 AS menu_sort, 'uied:mcp:tag:list' AS perms
    UNION ALL SELECT '标签全部', 20, 'uied:mcp:tag:all'
    UNION ALL SELECT '标签新增', 30, 'uied:mcp:tag:add'
    UNION ALL SELECT '标签编辑', 40, 'uied:mcp:tag:edit'
    UNION ALL SELECT '标签删除', 50, 'uied:mcp:tag:del'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @mcp_tag_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @mcp_tag_id IS NOT NULL
  AND child.id IS NULL;

-- 9) 发布页按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @mcp_publish_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '发布新增' AS menu_name, 10 AS menu_sort, 'uied:mcp:add' AS perms
    UNION ALL SELECT '发布编辑', 20, 'uied:mcp:edit'
    UNION ALL SELECT '发布详情', 30, 'uied:mcp:detail'
    UNION ALL SELECT '发布分类下拉', 40, 'uied:mcp:category:all'
    UNION ALL SELECT '发布标签下拉', 50, 'uied:mcp:tag:all'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @mcp_publish_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @mcp_publish_id IS NOT NULL
  AND child.id IS NULL;

-- 10) 角色授权（超级管理员 + 已启用角色）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_list.id
FROM (
    SELECT 0 AS role_id
    UNION
    SELECT id AS role_id FROM la_system_auth_role WHERE is_disable = 0
) AS role_list
JOIN (
    SELECT id
    FROM la_system_auth_menu
    WHERE id = @mcp_root_id
       OR pid = @mcp_root_id
       OR pid IN (
            SELECT id
            FROM la_system_auth_menu
            WHERE pid = @mcp_root_id
       )
) AS menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE @mcp_root_id IS NOT NULL
  AND perm_exists.id IS NULL;

COMMIT;
