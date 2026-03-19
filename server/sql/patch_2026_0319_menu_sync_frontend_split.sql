-- ============================================
-- UIED 菜单同步补丁：对齐“前端配置 / 网站设置 / 运营管理”细分展示（可重复执行）
-- 目标：
-- 1) 对齐当前后台侧栏细分展示所需的菜单文案、图标、排序
-- 2) 仅做“结构归位 + 显示控制 + 排序统一”，不改现有路径体系，避免路由回归风险
-- 3) 自动补齐 role_id=0/1 管理员授权
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ----------------------------
-- A. UIED 一级菜单与核心分组排序
-- ----------------------------
UPDATE la_system_auth_menu
SET menu_name = 'UIED导航',
    menu_icon = 'el-icon-Compass',
    menu_sort = 5,
    paths = 'uied',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 702;

-- 网址管理 / 文章管理（一级）
UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '网址管理',
    menu_icon = 'el-icon-Connection',
    menu_sort = 20,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 857;

UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '文章管理',
    menu_icon = 'el-icon-Reading',
    menu_sort = 22,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 858;

-- 前端配置 / 网站设置 / 运营管理（一级）
UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '前端配置',
    menu_icon = 'el-icon-Monitor',
    menu_sort = 30,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 813;

UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '网站设置',
    menu_icon = 'el-icon-Setting',
    menu_sort = 32,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 814;

UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '运营管理',
    menu_icon = 'el-icon-DataAnalysis',
    menu_sort = 34,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 815;

-- 商业授权 / 交付中心（一级）
UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '商业授权',
    menu_icon = 'el-icon-Key',
    menu_sort = 36,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 1101;

UPDATE la_system_auth_menu
SET pid = 702,
    menu_name = '交付中心',
    menu_icon = 'el-icon-Suitcase',
    menu_sort = 38,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 1102;

-- 历史“内容管理”分组保留但隐藏（避免重复入口）
UPDATE la_system_auth_menu
SET is_show = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 812;

-- ----------------------------
-- B. 前端配置（813）子菜单细分排序
-- ----------------------------
UPDATE la_system_auth_menu SET pid = 813, menu_name = '导航菜单', menu_icon = 'el-icon-Menu', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 714;
UPDATE la_system_auth_menu SET pid = 813, menu_name = '社交媒体', menu_icon = 'el-icon-Share', menu_sort = 30, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 717;
UPDATE la_system_auth_menu SET pid = 813, menu_name = '页脚配置', menu_icon = 'el-icon-Document', menu_sort = 40, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 716;
UPDATE la_system_auth_menu SET pid = 813, menu_name = '友情链接', menu_icon = 'el-icon-Link', menu_sort = 50, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 715;
UPDATE la_system_auth_menu SET pid = 813, menu_name = 'Favicon API', menu_icon = 'el-icon-ChromeFilled', menu_sort = 60, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 719;

-- ----------------------------
-- C. 网站设置（814）分组与子菜单细分排序
-- 说明：保留 base-config 分组，避免既有路由路径变化
-- ----------------------------
UPDATE la_system_auth_menu
SET pid = 814,
    menu_type = 'M',
    menu_name = '基础配置',
    menu_icon = 'el-icon-Setting',
    menu_sort = 90,
    paths = 'base-config',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 980;

UPDATE la_system_auth_menu
SET pid = 814,
    menu_type = 'M',
    menu_name = '商业授权',
    menu_icon = 'el-icon-Key',
    menu_sort = 80,
    paths = 'commercial-auth',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 981;

UPDATE la_system_auth_menu
SET pid = 814,
    menu_type = 'M',
    menu_name = '交付工具',
    menu_icon = 'el-icon-MagicStick',
    menu_sort = 70,
    paths = 'delivery-tools',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 982;

-- 基础配置下关键入口排序
UPDATE la_system_auth_menu SET pid = 980, menu_name = '站点设置', menu_icon = 'el-icon-Setting', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 713;
UPDATE la_system_auth_menu SET pid = 980, menu_name = '文章配置', menu_icon = 'el-icon-DocumentCopy', menu_sort = 20, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 890;
UPDATE la_system_auth_menu SET pid = 980, menu_name = '网站详情页配置', menu_icon = 'el-icon-View', menu_sort = 30, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 900;
UPDATE la_system_auth_menu SET pid = 980, menu_name = 'AI配置', menu_icon = 'el-icon-MagicStick', menu_sort = 55, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 724;

-- 内容中心 / SEO / 认证配置（按 paths+component 对齐，兼容不同环境 id）
UPDATE la_system_auth_menu
SET pid = 980,
    menu_name = '内容中心配置',
    menu_icon = 'el-icon-DataAnalysis',
    menu_sort = 24,
    selected = '/system-setting/base-config/setting',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'content-hub-config'
  AND component = 'uied/setting/contentHub';

UPDATE la_system_auth_menu
SET pid = 980,
    menu_name = 'SEO中心',
    menu_icon = 'el-icon-Compass',
    menu_sort = 50,
    selected = '/system-setting/base-config/setting',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'seo-center-config'
  AND component = 'uied/seoCenter/index';

UPDATE la_system_auth_menu
SET pid = 980,
    menu_name = '注册登录配置',
    menu_icon = 'el-icon-UserFilled',
    menu_sort = 40,
    selected = '/system-setting/base-config/setting',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE (paths = 'auth-config' OR paths = 'settings/auth-config')
  AND component IN ('settings/AuthConfig', 'settings/auth-config', 'uied/setting/authConfig', 'uied/setting/index');

-- ----------------------------
-- D. 运营管理（815）分组与子菜单细分排序
-- 说明：保留 rank-topic/growth-engagement/... 分组，避免既有路由路径变化
-- ----------------------------
UPDATE la_system_auth_menu
SET pid = 815,
    menu_type = 'M',
    menu_name = '榜单与专题',
    menu_icon = 'el-icon-Histogram',
    menu_sort = 90,
    paths = 'rank-topic',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 983;

UPDATE la_system_auth_menu
SET pid = 815,
    menu_type = 'M',
    menu_name = '增长与互动',
    menu_icon = 'el-icon-StarFilled',
    menu_sort = 80,
    paths = 'growth-engagement',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 984;

UPDATE la_system_auth_menu
SET pid = 815,
    menu_type = 'M',
    menu_name = '商业变现',
    menu_icon = 'el-icon-PriceTag',
    menu_sort = 70,
    paths = 'commercial-monetization',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 985;

UPDATE la_system_auth_menu
SET pid = 815,
    menu_type = 'M',
    menu_name = '数据与审计',
    menu_icon = 'el-icon-Histogram',
    menu_sort = 60,
    paths = 'data-audit',
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE id = 986;

UPDATE la_system_auth_menu SET pid = 983, menu_name = '每日热榜', menu_icon = 'el-icon-TrendCharts', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 910;
UPDATE la_system_auth_menu SET pid = 983, menu_name = '榜单系统', menu_icon = 'el-icon-Histogram', menu_sort = 20, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 920;
UPDATE la_system_auth_menu SET pid = 983, menu_name = '专题页工厂', menu_icon = 'el-icon-Management', menu_sort = 30, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 930;

UPDATE la_system_auth_menu SET pid = 984, menu_name = '网站提交', menu_icon = 'el-icon-Upload', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 722;
UPDATE la_system_auth_menu SET pid = 984, menu_name = '投稿激励', menu_icon = 'el-icon-EditPen', menu_sort = 20, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 940;
UPDATE la_system_auth_menu SET pid = 984, menu_name = '评论管理', menu_icon = 'el-icon-ChatDotRound', menu_sort = 30, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 726;

UPDATE la_system_auth_menu SET pid = 985, menu_name = '商业位体系', menu_icon = 'el-icon-PriceTag', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 960;
UPDATE la_system_auth_menu
SET pid = 985,
    menu_name = 'Banner配置',
    menu_icon = 'el-icon-Picture',
    menu_sort = 20,
    is_show = 1,
    update_time = UNIX_TIMESTAMP()
WHERE component = 'uied/banner/index';

UPDATE la_system_auth_menu SET pid = 986, menu_name = '数据统计', menu_icon = 'el-icon-Histogram', menu_sort = 10, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 727;
UPDATE la_system_auth_menu SET pid = 986, menu_name = '数据导出', menu_icon = 'el-icon-Download', menu_sort = 20, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 723;
UPDATE la_system_auth_menu SET pid = 986, menu_name = '操作日志', menu_icon = 'el-icon-Notebook', menu_sort = 30, is_show = 1, update_time = UNIX_TIMESTAMP() WHERE id = 721;

-- ----------------------------
-- E. 管理员角色授权补齐（0/1）
-- ----------------------------
INSERT INTO la_system_auth_perm (id, role_id, menu_id)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, menu_list.id
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) role_list
JOIN (
    SELECT id FROM la_system_auth_menu WHERE id IN (
        702, 857, 858, 813, 814, 815, 980, 981, 982, 983, 984, 985, 986, 1101, 1102,
        714, 717, 716, 715, 719, 713, 890, 900, 724,
        910, 920, 930, 722, 940, 726, 960, 727, 723, 721
    )
    UNION ALL
    SELECT id FROM la_system_auth_menu WHERE paths IN ('content-hub-config', 'seo-center-config', 'auth-config')
) menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE perm_exists.id IS NULL;

COMMIT;
