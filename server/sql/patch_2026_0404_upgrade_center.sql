-- UIED 导航：升级中心（后台一键升级）
-- 目标：
-- 1) 新增升级任务审计表 uied_upgrade_task
-- 2) 新增后台菜单 “网站设置 -> 升级中心”
-- 3) 给系统角色（0/1）补授权

SET NAMES utf8mb4;
START TRANSACTION;

CREATE TABLE IF NOT EXISTS `uied_upgrade_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_no` varchar(40) NOT NULL DEFAULT '',
  `target_version` varchar(64) NOT NULL DEFAULT '',
  `bundle_name` varchar(255) NOT NULL DEFAULT '',
  `bundle_path` varchar(600) NOT NULL DEFAULT '',
  `expected_sha256` varchar(64) NOT NULL DEFAULT '',
  `actual_sha256` varchar(64) NOT NULL DEFAULT '',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `phase` varchar(40) NOT NULL DEFAULT 'queued',
  `progress` tinyint unsigned NOT NULL DEFAULT 0,
  `operator_id` int unsigned NOT NULL DEFAULT 0,
  `operator_username` varchar(80) NOT NULL DEFAULT '',
  `operator_nickname` varchar(80) NOT NULL DEFAULT '',
  `confirm_phrase` varchar(32) NOT NULL DEFAULT '',
  `log_path` varchar(600) NOT NULL DEFAULT '',
  `result_path` varchar(600) NOT NULL DEFAULT '',
  `backup_frontend_path` varchar(600) NOT NULL DEFAULT '',
  `backup_admin_path` varchar(600) NOT NULL DEFAULT '',
  `backup_backend_path` varchar(600) NOT NULL DEFAULT '',
  `backup_db_path` varchar(600) NOT NULL DEFAULT '',
  `rollback_status` varchar(20) NOT NULL DEFAULT 'none',
  `rollback_message` varchar(500) NOT NULL DEFAULT '',
  `error_message` varchar(500) NOT NULL DEFAULT '',
  `started_at` int unsigned NOT NULL DEFAULT 0,
  `finished_at` int unsigned NOT NULL DEFAULT 0,
  `duration_sec` int unsigned NOT NULL DEFAULT 0,
  `pid` int unsigned NOT NULL DEFAULT 0,
  `create_time` int unsigned NOT NULL DEFAULT 0,
  `update_time` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_task_no` (`task_no`),
  KEY `idx_status_create_time` (`status`,`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='UIED 升级任务审计表';

INSERT INTO `la_system_auth_menu`
(`id`, `pid`, `menu_type`, `menu_name`, `menu_icon`, `menu_sort`, `perms`, `paths`, `component`, `selected`, `params`, `is_cache`, `is_show`, `is_disable`, `create_time`, `update_time`)
VALUES
(1203, 814, 'C', '升级中心', 'el-icon-UploadFilled', 110, 'uied:upgrade:task:list', 'upgrade-center', 'uied/upgradeCenter/index', '/system-setting/upgrade-center', '', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  `pid` = VALUES(`pid`),
  `menu_name` = VALUES(`menu_name`),
  `menu_icon` = VALUES(`menu_icon`),
  `menu_sort` = VALUES(`menu_sort`),
  `perms` = VALUES(`perms`),
  `paths` = VALUES(`paths`),
  `component` = VALUES(`component`),
  `selected` = VALUES(`selected`),
  `is_show` = VALUES(`is_show`),
  `is_disable` = VALUES(`is_disable`),
  `update_time` = VALUES(`update_time`);

INSERT INTO `la_system_auth_perm` (`id`, `role_id`, `menu_id`)
SELECT REPLACE(UUID(), '-', ''), role_list.role_id, 1203
FROM (
    SELECT 0 AS role_id
    UNION ALL
    SELECT 1 AS role_id
) role_list
LEFT JOIN `la_system_auth_perm` perm_exists
       ON perm_exists.role_id = role_list.role_id
      AND perm_exists.menu_id = 1203
WHERE perm_exists.id IS NULL;

COMMIT;
