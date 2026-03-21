-- ============================================
-- UIED 菜单补丁：页面管理拆分为“导航页面 / 系统页面”（可重复执行）
-- 目标：
-- 1) 在「网站管理」下新增两个独立二级菜单：
--    - 导航页面（page-navigation）
--    - 系统页面（page-system）
-- 2) 原“页面管理（page）”入口隐藏，避免与新入口重复
-- 3) 复制原页面菜单已有角色授权，确保无感切换
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

SET @now_ts := UNIX_TIMESTAMP();

-- 1) 解析一级菜单「网站管理」ID（优先按路径匹配）
SET @website_manage_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE paths = 'website-manage'
    AND menu_type = 'M'
  ORDER BY id ASC
  LIMIT 1
);

-- 兜底：历史环境固定 ID
SET @website_manage_id := IFNULL(@website_manage_id, 857);

-- 2) 隐藏旧入口：page（保留数据以兼容历史）
UPDATE la_system_auth_menu
SET menu_name = '页面管理（旧）',
    menu_sort = 98,
    is_show = 0,
    is_disable = 0,
    update_time = @now_ts
WHERE pid = @website_manage_id
  AND menu_type = 'C'
  AND paths = 'page'
  AND component = 'uied/page/index';

-- 3) 新增二级菜单：导航页面
INSERT INTO la_system_auth_menu (
  pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params,
  is_cache, is_show, is_disable, create_time, update_time
)
SELECT
  @website_manage_id, 'C', '导航页面', 'el-icon-Document', 30, 'uied:page:list',
  'page-navigation', 'uied/page/index', '/uied/website-manage/page-navigation',
  '{"pageGroup":"navigation"}',
  0, 1, 0, @now_ts, @now_ts
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM la_system_auth_menu
  WHERE pid = @website_manage_id
    AND menu_type = 'C'
    AND paths = 'page-navigation'
    AND component = 'uied/page/index'
);

UPDATE la_system_auth_menu
SET menu_name = '导航页面',
    menu_icon = 'el-icon-Document',
    menu_sort = 30,
    perms = 'uied:page:list',
    selected = '/uied/website-manage/page-navigation',
    params = '{"pageGroup":"navigation"}',
    is_show = 1,
    is_disable = 0,
    update_time = @now_ts
WHERE pid = @website_manage_id
  AND menu_type = 'C'
  AND paths = 'page-navigation'
  AND component = 'uied/page/index';

-- 4) 新增二级菜单：系统页面
INSERT INTO la_system_auth_menu (
  pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params,
  is_cache, is_show, is_disable, create_time, update_time
)
SELECT
  @website_manage_id, 'C', '系统页面', 'el-icon-Files', 31, 'uied:page:list',
  'page-system', 'uied/page/index', '/uied/website-manage/page-system',
  '{"pageGroup":"custom"}',
  0, 1, 0, @now_ts, @now_ts
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM la_system_auth_menu
  WHERE pid = @website_manage_id
    AND menu_type = 'C'
    AND paths = 'page-system'
    AND component = 'uied/page/index'
);

UPDATE la_system_auth_menu
SET menu_name = '系统页面',
    menu_icon = 'el-icon-Files',
    menu_sort = 31,
    perms = 'uied:page:list',
    selected = '/uied/website-manage/page-system',
    params = '{"pageGroup":"custom"}',
    is_show = 1,
    is_disable = 0,
    update_time = @now_ts
WHERE pid = @website_manage_id
  AND menu_type = 'C'
  AND paths = 'page-system'
  AND component = 'uied/page/index';

-- 5) 角色授权：复制旧 page 菜单已有授权到新菜单
SET @legacy_page_menu_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE pid = @website_manage_id
    AND menu_type = 'C'
    AND paths = 'page'
    AND component = 'uied/page/index'
  ORDER BY id ASC
  LIMIT 1
);

SET @page_nav_menu_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE pid = @website_manage_id
    AND menu_type = 'C'
    AND paths = 'page-navigation'
    AND component = 'uied/page/index'
  ORDER BY id ASC
  LIMIT 1
);

SET @page_system_menu_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE pid = @website_manage_id
    AND menu_type = 'C'
    AND paths = 'page-system'
    AND component = 'uied/page/index'
  ORDER BY id ASC
  LIMIT 1
);

INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), source_perm.role_id, target_menu.id
FROM la_system_auth_perm AS source_perm
JOIN la_system_auth_menu AS target_menu
  ON target_menu.id IN (@page_nav_menu_id, @page_system_menu_id)
LEFT JOIN la_system_auth_perm AS existed
  ON existed.role_id = source_perm.role_id
 AND existed.menu_id = target_menu.id
WHERE source_perm.menu_id = @legacy_page_menu_id
  AND existed.id IS NULL;

-- 6) 兜底授权：给 role_id=0/1 补齐（避免旧库未给 page 授权导致看不到新菜单）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, target_menu.id
FROM (
  SELECT 0 AS role_id
  UNION ALL
  SELECT 1 AS role_id
) AS role_list
JOIN la_system_auth_menu AS target_menu
  ON target_menu.id IN (@page_nav_menu_id, @page_system_menu_id)
LEFT JOIN la_system_auth_perm AS existed
  ON existed.role_id = role_list.role_id
 AND existed.menu_id = target_menu.id
WHERE existed.id IS NULL;

COMMIT;

