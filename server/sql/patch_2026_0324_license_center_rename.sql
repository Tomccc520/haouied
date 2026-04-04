-- ============================================
-- UIED 菜单补丁：许可证中心更名为“授权中心”（可重复执行）
-- 目标：
-- 1) 将菜单 ID 864 标题统一为“授权中心”
-- 2) 保持原权限点/路由不变，避免影响历史角色
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

UPDATE la_system_auth_menu
SET menu_name = '授权中心',
    menu_icon = 'el-icon-Key',
    menu_sort = 90,
    perms = 'uied:license:info',
    paths = 'license-center',
    component = 'uied/license/index',
    selected = '/uied/license-center',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 864;

COMMIT;
