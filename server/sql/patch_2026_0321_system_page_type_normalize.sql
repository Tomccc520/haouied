-- ============================================
-- UIED 数据库补丁：系统页面 type 归一化（可重复执行）
-- 目标：
-- 1) 防止历史错误数据把系统页写成 navigation
-- 2) 页面管理按“导航页面 / 系统页面”稳定分区
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;

UPDATE `uied_page`
SET
  `type` = 'custom',
  `update_time` = UNIX_TIMESTAMP()
WHERE `is_delete` = 0
  AND LOWER(`slug`) IN ('hot', 'daily-hot', 'daily-new', 'rankings', 'mcp', 'figma', 'articles', 'search', 'submit')
  AND LOWER(COALESCE(`type`, '')) IN ('navigation', 'nav', 'channel', 'home');

COMMIT;

