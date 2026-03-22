-- ============================================
-- UIED 补丁：Figma 推荐审核（表结构 + 后台菜单）
-- 目标：
-- 1) 新增前台推荐审核表 uied_figma_plugin_recommendation
-- 2) 在 Figma中心 下新增二级菜单“推荐审核”
-- 3) 补齐推荐审核按钮权限并授权管理员角色
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

-- 1) 推荐审核表（幂等）
CREATE TABLE IF NOT EXISTS `uied_figma_plugin_recommendation` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `plugin_name` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '插件名称',
  `official_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '官方链接',
  `summary` TEXT COMMENT '推荐简介',
  `category_id` BIGINT(20) UNSIGNED DEFAULT NULL COMMENT '意向分类ID',
  `category_name` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '意向分类名称',
  `submitter_name` VARCHAR(80) NOT NULL DEFAULT '' COMMENT '推荐人名称',
  `submitter_email` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '推荐人邮箱',
  `submitter_wechat` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '推荐人微信',
  `submit_note` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '补充说明',
  `source_ip` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '来源IP',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态 pending/approved/rejected',
  `review_note` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '审核备注',
  `reviewer_id` BIGINT(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '审核人ID',
  `reviewer_name` VARCHAR(80) NOT NULL DEFAULT '' COMMENT '审核人名称',
  `review_time` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '审核时间',
  `approved_item_id` BIGINT(20) UNSIGNED DEFAULT NULL COMMENT '通过后关联插件ID',
  `is_delete` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `create_time` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` INT(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_figma_recommend_status` (`status`),
  KEY `idx_figma_recommend_category` (`category_id`),
  KEY `idx_figma_recommend_create_time` (`create_time`),
  KEY `idx_figma_recommend_official_url` (`official_url`(191)),
  KEY `idx_figma_recommend_approved_item` (`approved_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件推荐审核表';

-- 2) 保底 Figma 一级菜单（若不存在则创建）
INSERT INTO la_system_auth_menu (
  pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
  params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
  702, 'M', 'Figma中心', 'el-icon-Brush', 43, '', 'figma-center', '', '',
  '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE NOT EXISTS (
  SELECT 1 FROM la_system_auth_menu
  WHERE paths = 'figma-center'
    AND menu_type = 'M'
);

SET @figma_root_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE paths = 'figma-center'
    AND menu_type = 'M'
  ORDER BY id DESC
  LIMIT 1
);

-- 3) 新增“推荐审核”二级菜单
INSERT INTO la_system_auth_menu (
  pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
  params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT
  @figma_root_id, 'C', '推荐审核', 'el-icon-Select', 45, 'uied:figma:recommend:list',
  'figma-recommend', 'uied/figma/recommend', '/figma-center/figma-recommend',
  '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
WHERE @figma_root_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM la_system_auth_menu
    WHERE pid = @figma_root_id
      AND paths = 'figma-recommend'
      AND component = 'uied/figma/recommend'
  );

UPDATE la_system_auth_menu
SET pid = @figma_root_id,
    menu_type = 'C',
    menu_name = '推荐审核',
    menu_icon = 'el-icon-Select',
    menu_sort = 45,
    perms = 'uied:figma:recommend:list',
    selected = '/figma-center/figma-recommend',
    is_cache = 0,
    is_show = 1,
    is_disable = 0,
    update_time = UNIX_TIMESTAMP()
WHERE paths = 'figma-recommend'
  AND menu_type = 'C';

SET @figma_recommend_id := (
  SELECT id
  FROM la_system_auth_menu
  WHERE paths = 'figma-recommend'
    AND menu_type = 'C'
  ORDER BY id DESC
  LIMIT 1
);

-- 4) 推荐审核按钮权限
INSERT INTO la_system_auth_menu (
  pid, menu_type, menu_name, menu_icon, menu_sort, perms, paths, component, selected,
  params, is_cache, is_show, is_disable, create_time, update_time
)
SELECT @figma_recommend_id, 'A', perm_item.menu_name, '', perm_item.menu_sort, perm_item.perms,
       '', '', '', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM (
    SELECT '审核列表' AS menu_name, 10 AS menu_sort, 'uied:figma:recommend:list' AS perms
    UNION ALL SELECT '审核详情', 20, 'uied:figma:recommend:detail'
    UNION ALL SELECT '审核通过', 30, 'uied:figma:recommend:approve'
    UNION ALL SELECT '审核拒绝', 40, 'uied:figma:recommend:reject'
    UNION ALL SELECT '审核删除', 50, 'uied:figma:recommend:del'
    UNION ALL SELECT '分类下拉', 60, 'uied:figma:category:all'
) AS perm_item
LEFT JOIN la_system_auth_menu child
       ON child.pid = @figma_recommend_id
      AND child.menu_type = 'A'
      AND child.perms = perm_item.perms
WHERE @figma_recommend_id IS NOT NULL
  AND child.id IS NULL;

-- 5) 角色授权（超级管理员 + 启用角色）
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
    WHERE id = @figma_recommend_id
       OR pid = @figma_recommend_id
) AS menu_list
LEFT JOIN la_system_auth_perm perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = menu_list.id
WHERE @figma_recommend_id IS NOT NULL
  AND perm_exists.id IS NULL;

COMMIT;
