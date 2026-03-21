-- ============================================
-- UIED 菜单补丁：Figma 中心（可重复执行）
-- 目标：
-- 1) 新增一级菜单「Figma中心」
-- 2) 新增二级菜单：插件列表 / 分类管理 / 标签管理 / 发布插件
-- 3) 补齐按钮权限并授权管理员角色（0 + 启用角色）
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 一级菜单：Figma中心（挂在 UIED导航 下，pid=702）
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    702, 'M', 'Figma中心', 'el-icon-Brush', 43, '', 'figma-center', '', '',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE pid = 702
      AND paths = 'figma-center'
      AND menu_type = 'M'
);

UPDATE la_system_auth_menu
SET pid = 702,
    menu_type = 'M',
    menu_name = 'Figma中心',
    menu_icon = 'el-icon-Brush',
    menu_sort = 43,
    perms = '',
    component = '',
    selected = '',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-center'
  AND menu_type = 'M';

SET @figma_root_id := (
    SELECT id
    FROM la_system_auth_menu
    WHERE paths = 'figma-center'
      AND menu_type = 'M'
    ORDER BY id DESC
    LIMIT 1
);

-- 2) 二级菜单：插件列表
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @figma_root_id, 'C', '插件列表', 'el-icon-List', 10, 'uied:figma:list',
    'figma-list', 'uied/figma/index', '/figma-center/figma-list',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @figma_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @figma_root_id
      AND paths = 'figma-list'
      AND component = 'uied/figma/index'
  );

UPDATE la_system_auth_menu
SET pid = @figma_root_id,
    menu_type = 'C',
    menu_name = '插件列表',
    menu_icon = 'el-icon-List',
    menu_sort = 10,
    perms = 'uied:figma:list',
    selected = '/figma-center/figma-list',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-list'
  AND menu_type = 'C';

-- 3) 二级菜单：分类管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @figma_root_id, 'C', '分类管理', 'el-icon-Folder', 20, 'uied:figma:category:list',
    'figma-category', 'uied/figma/category', '/figma-center/figma-category',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @figma_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @figma_root_id
      AND paths = 'figma-category'
      AND component = 'uied/figma/category'
  );

UPDATE la_system_auth_menu
SET pid = @figma_root_id,
    menu_type = 'C',
    menu_name = '分类管理',
    menu_icon = 'el-icon-Folder',
    menu_sort = 20,
    perms = 'uied:figma:category:list',
    selected = '/figma-center/figma-category',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-category'
  AND menu_type = 'C';

-- 4) 二级菜单：标签管理
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @figma_root_id, 'C', '标签管理', 'el-icon-CollectionTag', 30, 'uied:figma:tag:list',
    'figma-tag', 'uied/figma/tag', '/figma-center/figma-tag',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @figma_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @figma_root_id
      AND paths = 'figma-tag'
      AND component = 'uied/figma/tag'
  );

UPDATE la_system_auth_menu
SET pid = @figma_root_id,
    menu_type = 'C',
    menu_name = '标签管理',
    menu_icon = 'el-icon-CollectionTag',
    menu_sort = 30,
    perms = 'uied:figma:tag:list',
    selected = '/figma-center/figma-tag',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-tag'
  AND menu_type = 'C';

-- 5) 二级菜单：发布插件
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
    @figma_root_id, 'C', '发布插件', 'el-icon-EditPen', 40, 'uied:figma:add',
    'figma-publish', 'uied/figma/publish', '/figma-center/figma-list',
    '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @figma_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM la_system_auth_menu
    WHERE pid = @figma_root_id
      AND paths = 'figma-publish'
      AND component = 'uied/figma/publish'
  );

UPDATE la_system_auth_menu
SET pid = @figma_root_id,
    menu_type = 'C',
    menu_name = '发布插件',
    menu_icon = 'el-icon-EditPen',
    menu_sort = 40,
    perms = 'uied:figma:add',
    selected = '/figma-center/figma-list',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-publish'
  AND menu_type = 'C';

SET @figma_list_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'figma-list' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @figma_category_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'figma-category' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @figma_tag_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'figma-tag' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);
SET @figma_publish_id := (
    SELECT id FROM la_system_auth_menu
    WHERE paths = 'figma-publish' AND menu_type = 'C'
    ORDER BY id DESC LIMIT 1
);

-- 6) 插件列表按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @figma_list_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '列表读取' AS menu_name, 10 AS menu_sort, 'uied:figma:list' AS perms
    UNION ALL SELECT '插件详情', 20, 'uied:figma:detail'
    UNION ALL SELECT '插件新增', 30, 'uied:figma:add'
    UNION ALL SELECT '插件编辑', 40, 'uied:figma:edit'
    UNION ALL SELECT '插件删除', 50, 'uied:figma:del'
    UNION ALL SELECT '官方采集', 60, 'uied:figma:importOfficial'
    UNION ALL SELECT '分类下拉', 70, 'uied:figma:category:all'
    UNION ALL SELECT '标签下拉', 80, 'uied:figma:tag:all'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @figma_list_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @figma_list_id IS NOT NULL
  AND child.id IS NULL;

-- 7) 分类按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @figma_category_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '分类读取' AS menu_name, 10 AS menu_sort, 'uied:figma:category:list' AS perms
    UNION ALL SELECT '分类全部', 20, 'uied:figma:category:all'
    UNION ALL SELECT '分类新增', 30, 'uied:figma:category:add'
    UNION ALL SELECT '分类编辑', 40, 'uied:figma:category:edit'
    UNION ALL SELECT '分类删除', 50, 'uied:figma:category:del'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @figma_category_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @figma_category_id IS NOT NULL
  AND child.id IS NULL;

-- 8) 标签按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @figma_tag_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '标签读取' AS menu_name, 10 AS menu_sort, 'uied:figma:tag:list' AS perms
    UNION ALL SELECT '标签全部', 20, 'uied:figma:tag:all'
    UNION ALL SELECT '标签新增', 30, 'uied:figma:tag:add'
    UNION ALL SELECT '标签编辑', 40, 'uied:figma:tag:edit'
    UNION ALL SELECT '标签删除', 50, 'uied:figma:tag:del'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @figma_tag_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @figma_tag_id IS NOT NULL
  AND child.id IS NULL;

-- 9) 发布页按钮权限
INSERT INTO la_system_auth_menu (
    pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
    params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @figma_publish_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '发布新增' AS menu_name, 10 AS menu_sort, 'uied:figma:add' AS perms
    UNION ALL SELECT '发布编辑', 20, 'uied:figma:edit'
    UNION ALL SELECT '发布详情', 30, 'uied:figma:detail'
    UNION ALL SELECT '发布分类下拉', 40, 'uied:figma:category:all'
    UNION ALL SELECT '发布标签下拉', 50, 'uied:figma:tag:all'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @figma_publish_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @figma_publish_id IS NOT NULL
  AND child.id IS NULL;

-- 10) 角色授权（超级管理员 + 启用角色）
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
    WHERE id = @figma_root_id
       OR pid = @figma_root_id
       OR pid IN (
            SELECT id
            FROM la_system_auth_menu
            WHERE pid = @figma_root_id
       )
) AS menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE @figma_root_id IS NOT NULL
  AND perm_exists.id IS NULL;

COMMIT;
