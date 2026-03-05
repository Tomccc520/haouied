-- ============================================
-- UIED 内容中心菜单合并补丁（可重复执行）
-- 目标：
-- 1) 在「网站设置 -> 基础配置」下仅保留一个“内容中心配置”入口
-- 2) 将热门文章/榜单系统/每日热榜旧菜单隐藏并禁用，避免重复入口
-- 3) 自动给已拥有旧菜单权限的角色补齐新菜单权限
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 新增统一菜单（幂等）
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
    '内容中心配置',
    'el-icon-DataAnalysis',
    24,
    'uied:setting:get',
    'content-hub-config',
    'uied/setting/contentHub',
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
      AND paths = 'content-hub-config'
      AND component = 'uied/setting/contentHub'
);

-- 已存在时字段对齐（幂等修正）
UPDATE la_system_auth_menu
SET pid = 980,
    menu_type = 'C',
    menu_name = '内容中心配置',
    menu_icon = 'el-icon-DataAnalysis',
    menu_sort = 24,
    perms = 'uied:setting:get',
    selected = '/system-setting/base-config/setting',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'content-hub-config'
  AND component = 'uied/setting/contentHub';

-- 旧菜单隐藏并禁用（保留数据以便回滚）
UPDATE la_system_auth_menu
SET is_show = 0,
    is_disable = 1,
    update_time = UNIX_TIMESTAMP()
WHERE (
    component IN ('uied/setting/hotArticles', 'uied/dailyHot/index', 'uied/rankBoard/index')
    OR paths IN ('hot-articles-config', 'daily-hot', 'rank-board')
)
AND NOT (paths = 'content-hub-config' AND component = 'uied/setting/contentHub');

-- 统一入口授权给管理员角色（0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_row.id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) AS role_list
JOIN la_system_auth_menu AS menu_row
    ON menu_row.paths = 'content-hub-config'
   AND menu_row.component = 'uied/setting/contentHub'
LEFT JOIN la_system_auth_perm AS perm_row
    ON perm_row.role_id = role_list.role_id
   AND perm_row.menu_id = menu_row.id
WHERE perm_row.id IS NULL;

-- 对“已有旧菜单权限”的角色自动补齐新菜单权限
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), old_role.role_id, new_menu.id
FROM (
    SELECT DISTINCT perm.role_id
    FROM la_system_auth_perm perm
    JOIN la_system_auth_menu menu_old ON menu_old.id = perm.menu_id
    WHERE (
        menu_old.component IN ('uied/setting/hotArticles', 'uied/dailyHot/index', 'uied/rankBoard/index')
        OR menu_old.paths IN ('hot-articles-config', 'daily-hot', 'rank-board')
    )
) AS old_role
JOIN la_system_auth_menu AS new_menu
    ON new_menu.paths = 'content-hub-config'
   AND new_menu.component = 'uied/setting/contentHub'
LEFT JOIN la_system_auth_perm AS perm_exists
    ON perm_exists.role_id = old_role.role_id
   AND perm_exists.menu_id = new_menu.id
WHERE perm_exists.id IS NULL;

COMMIT;
