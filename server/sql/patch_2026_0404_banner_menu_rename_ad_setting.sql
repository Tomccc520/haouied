-- UIED 导航：统一 Banner 菜单命名为“广告设置”
-- 适用场景：存量环境已存在“Banner配置 / 广告管理”菜单时执行

SET NAMES utf8mb4;
START TRANSACTION;

UPDATE la_system_auth_menu
SET menu_name = '广告设置',
    menu_icon = 'el-icon-Picture',
    update_time = UNIX_TIMESTAMP()
WHERE is_delete = 0
  AND (
    component = 'uied/banner/index'
    OR id = 718
    OR (paths = 'banner' AND perms LIKE 'uied:banner:%')
  );

COMMIT;
