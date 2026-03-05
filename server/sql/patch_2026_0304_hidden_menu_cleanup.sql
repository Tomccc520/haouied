-- ============================================
-- UIED 后台历史隐藏入口清理（可重复执行）
-- 目标：
-- 1) 保留必要的编辑/详情隐藏路由（如 817/862）
-- 2) 下线重复历史入口（如 725 旧文章管理）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 725：历史“文章管理”旧入口（uied/article/index），已由 816 等新菜单替代
UPDATE la_system_auth_menu
SET menu_name = '文章管理（旧入口）',
    is_show = 0,
    is_disable = 1,
    update_time = UNIX_TIMESTAMP()
WHERE id = 725;

COMMIT;
