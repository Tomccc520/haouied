-- ============================================
-- UIED 菜单补丁：商业授权 / 交付中心 一级菜单化（可重复执行）
-- 目标：
-- 1) 在 UIED 一级下新增“商业授权”“交付中心”
-- 2) 许可证中心归档到“商业授权”
-- 3) 交付初始化归档到“交付中心”
-- 4) 功能开关默认隐藏（能力保留，菜单不干扰主流程）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 一级菜单：商业授权（ID:1101）
INSERT INTO la_system_auth_menu
(id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
VALUES
(1101, 702, 'M', '商业授权', 'el-icon-Key', 35, '', 'commercial-license', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
pid = VALUES(pid),
menu_type = VALUES(menu_type),
menu_name = VALUES(menu_name),
menu_icon = VALUES(menu_icon),
menu_sort = VALUES(menu_sort),
paths = VALUES(paths),
is_show = VALUES(is_show),
is_disable = VALUES(is_disable),
update_time = UNIX_TIMESTAMP();

-- 2) 一级菜单：交付中心（ID:1102）
INSERT INTO la_system_auth_menu
(id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
VALUES
(1102, 702, 'M', '交付中心', 'el-icon-MagicStick', 34, '', 'delivery-center', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
pid = VALUES(pid),
menu_type = VALUES(menu_type),
menu_name = VALUES(menu_name),
menu_icon = VALUES(menu_icon),
menu_sort = VALUES(menu_sort),
paths = VALUES(paths),
is_show = VALUES(is_show),
is_disable = VALUES(is_disable),
update_time = UNIX_TIMESTAMP();

-- 3) 许可证中心（ID:864）归档到一级“商业授权”
INSERT INTO la_system_auth_menu
(id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
VALUES
(864, 1101, 'C', '许可证中心', 'el-icon-Key', 90, 'uied:license:info', 'license-center', 'uied/license/index', '/uied/license-center', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
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

-- 4) 交付初始化（ID:894）归档到一级“交付中心”
INSERT INTO la_system_auth_menu
(id, pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected, params, is_cache, is_show, is_disable, create_time, update_time)
VALUES
(894, 1102, 'C', '交付初始化', 'el-icon-MagicStick', 90, 'uied:delivery:init:index', 'delivery-init', 'uied/deliveryInit/index', '/uied/delivery-init', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
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

-- 5) 功能开关（ID:866）默认隐藏，避免干扰授权主流程
UPDATE la_system_auth_menu
SET pid = 1101,
    is_show = 0,
    menu_sort = 10,
    update_time = UNIX_TIMESTAMP()
WHERE id = 866;

-- 6) 给系统角色补授权（role 0/1）
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), r.role_id, m.menu_id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) r
JOIN (
    SELECT 1101 AS menu_id
    UNION ALL
    SELECT 1102 AS menu_id
    UNION ALL
    SELECT 864 AS menu_id
    UNION ALL
    SELECT 894 AS menu_id
) m
LEFT JOIN la_system_auth_perm p
       ON p.role_id = r.role_id
      AND p.menu_id = m.menu_id
WHERE p.id IS NULL;

COMMIT;

