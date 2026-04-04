-- ============================================
-- UIED 菜单补丁：下线“用户等级/交付工具/商业授权”冗余菜单（可重复执行）
-- 目标：
-- 1) 授权中心（864）固定归档到“网站设置”(814)
-- 2) 隐藏废弃菜单：商业授权(981/1101)、交付工具(982/1102/894)、用户等级(user:level:list)
-- 3) 功能开关（866）保留能力但默认隐藏
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 授权中心（864）固定归档到“网站设置”(814)
INSERT INTO la_system_auth_menu
(id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
VALUES
(864, 814, 'C', '授权中心', 'el-icon-Key', 85, 'uied:license:info', 'license-center', 'uied/license/index', '/uied/license-center', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
pid = VALUES(pid),
menu_name = VALUES(menu_name),
menu_icon = VALUES(menu_icon),
menu_sort = VALUES(menu_sort),
perms = VALUES(perms),
paths = VALUES(paths),
component = VALUES(component),
selected = VALUES(selected),
is_show = VALUES(is_show),
is_disable = VALUES(is_disable),
update_time = UNIX_TIMESTAMP();

-- 2) 功能开关（866）保留能力但默认隐藏
UPDATE la_system_auth_menu
SET pid = 814,
    is_show = 0,
    menu_sort = 10,
    update_time = UNIX_TIMESTAMP()
WHERE id = 866;

-- 3) 隐藏废弃菜单（商业授权/交付工具相关）
UPDATE la_system_auth_menu
SET is_show = 0,
    is_disable = 1,
    update_time = UNIX_TIMESTAMP()
WHERE id IN (981, 982, 894, 1101, 1102);

-- 4) 隐藏“用户等级”菜单（按权限点匹配，兼容不同环境菜单 ID）
UPDATE la_system_auth_menu
SET is_show = 0,
    is_disable = 1,
    update_time = UNIX_TIMESTAMP()
WHERE perms = 'user:level:list';

-- 5) 补齐系统角色权限（role 0/1，仅授权中心）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_list.menu_id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) role_list
JOIN (
    SELECT 864 AS menu_id
) menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.menu_id
WHERE perm_exists.id IS NULL;

COMMIT;
