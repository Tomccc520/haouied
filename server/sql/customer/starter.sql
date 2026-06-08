/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-06-08
 */

-- UIED-NAV 客户干净初始化数据（可重复执行）
-- 用途：安装基础表结构后，为新客户补齐站点基础配置、页面、分类、页脚按钮与交付初始化菜单。
-- 注意：不包含真实授权文件、演示用户、访问日志、客户私有内容。

SET NAMES utf8mb4;
SET @now_ts := UNIX_TIMESTAMP();

-- 兼容早期 uied_site_setting 表没有 description 字段的安装包。
SET @db_name := DATABASE();
SET @setting_desc_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'uied_site_setting'
    AND COLUMN_NAME = 'description'
);
SET @setting_desc_sql := IF(
  @setting_desc_exists = 0,
  "ALTER TABLE `uied_site_setting` ADD COLUMN `description` varchar(255) NOT NULL DEFAULT '' COMMENT '配置说明' AFTER `value`",
  "SELECT 'uied_site_setting.description already exists' AS info"
);
PREPARE setting_desc_stmt FROM @setting_desc_sql;
EXECUTE setting_desc_stmt;
DEALLOCATE PREPARE setting_desc_stmt;

START TRANSACTION;

-- 1) 站点基础信息：已有记录时更新第一条，避免重复插入。
INSERT INTO `uied_site_info`
(`id`, `site_name`, `site_title`, `description`, `keywords`, `logo`, `favicon`, `icp`, `copyright`, `is_delete`, `create_time`, `update_time`, `delete_time`)
SELECT
  1,
  'UIED 导航',
  'UIED 导航 - 优质工具与资源导航',
  '聚合优质设计、AI、效率与开发工具，支持后台配置、投稿收录、商业服务与授权交付。',
  'UIED导航,设计导航,AI工具,效率工具,网址导航',
  '',
  '',
  '',
  '© UIED 导航 版权所有',
  0,
  @now_ts,
  @now_ts,
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_site_info` LIMIT 1);

UPDATE `uied_site_info`
SET
  `site_name` = IF(`site_name` = '', 'UIED 导航', `site_name`),
  `site_title` = IF(`site_title` = '', 'UIED 导航 - 优质工具与资源导航', `site_title`),
  `description` = IF(`description` = '', '聚合优质设计、AI、效率与开发工具，支持后台配置、投稿收录、商业服务与授权交付。', `description`),
  `keywords` = IF(`keywords` = '', 'UIED导航,设计导航,AI工具,效率工具,网址导航', `keywords`),
  `copyright` = IF(`copyright` IS NULL OR `copyright` = '', '© UIED 导航 版权所有', `copyright`),
  `is_delete` = 0,
  `update_time` = @now_ts
ORDER BY `id` ASC
LIMIT 1;

-- 2) 公开配置：按 key 幂等写入，客户可在后台继续修改。
INSERT INTO `uied_site_setting` (`key`, `value`, `description`, `create_time`, `update_time`)
VALUES
(
  'homepageConfig',
  '{"heroBannerEnabled":true,"heroBgType":"default","heroBgValue":"","heroDisplayMode":"search","heroShowStats":true,"heroShowHotTags":true,"bannerCardsEnabled":true,"hotRecommendationsEnabled":true,"hotRecommendationsTitle":"精选推荐","topAdEnabled":false,"topAdCode":"","homeCarouselEnabled":true,"homeCarouselSort":10,"homeRecommendationEnabled":true,"homeRecommendationSort":20,"dailyNewEnabled":true,"dailyNewDisplayLabel":"每日上新","dailyNewDisplayPath":"/daily-new","dailyNewDisplayPlacements":["nav_quick_entry","home_menu"],"dailyNewDisplaySort":82,"dailyNewDisplayOpenInNewTab":false,"dailyNewDefaultDays":7,"dailyNewPageKicker":"DAILY NEW","dailyNewPageTitle":"每日上新","dailyNewPageDescription":"按时间发现最新收录的网站与工具。"}',
  '首页公开配置',
  @now_ts,
  @now_ts
),
(
  'pageGlobalConfig',
  '{"websiteClickMode":"detail","hotRecommendationClickMode":"detail","showDirectArrow":true,"directArrowNewWindow":true,"detailPageNewWindow":false,"appendRefEnabled":false,"appendRefValue":"","sortZeroNewFirstEnabled":false,"pageSize":24}',
  '页面全局行为配置',
  @now_ts,
  @now_ts
),
(
  'searchConfig',
  '{"placeholder":"搜索站点名称、标签、分类","debounceDelay":250,"aiSearchEnabled":true,"aiSearchBtnText":"AI 搜索","highlightKeyword":true,"resultsPerPage":24}',
  '搜索公开配置',
  @now_ts,
  @now_ts
),
(
  'articleConfig',
  '{"enabled":true,"homeSectionEnabled":true,"homeSectionTitle":"精选文章","homeSectionSubtitle":"聚合运营实战、产品增长与设计趋势","homeSectionLimit":9,"listPageTitle":"运营与产品专栏","listPageDescription":"持续更新可直接复用的运营方案与商业化经验","listPageCoverImage":"","detailSidebarEnabled":true,"detailSidebarSticky":true,"detailSidebarTopOffset":16,"detailSidebarLinksNewWindow":false,"detailSidebarLatestArticlesTitle":"最新文章","detailSidebarLatestArticlesCount":6,"detailSidebarHotWebsitesTitle":"热门网址","detailSidebarHotWebsitesCount":6,"detailSidebarTagsTitle":"文章标签","commentsEnabled":true,"topicsEnabled":true}',
  '文章公开配置',
  @now_ts,
  @now_ts
),
(
  'footerAboutConfig',
  '{"aboutTitle":"UIED 导航","aboutDescription":"聚合优质工具与资源，支持网站收录、商业曝光和可运营导航站交付。","mobileDescription":"聚合优质工具与资源，支持网站收录与商业曝光。","showSubmitButton":true,"submitButtonText":"网站收录","submitButtonUrl":"/submit","submitButtonNewWindow":false,"showServiceButton":true,"serviceButtonText":"收录与增值服务","serviceButtonUrl":"/submit/services","serviceButtonNewWindow":false,"showChangelogButton":true,"changelogButtonText":"更新记录","changelogButtonUrl":"/changelog","changelogButtonNewWindow":true}',
  '页脚关于与按钮配置',
  @now_ts,
  @now_ts
),
(
  'submissionServiceConfig',
  '{"enabled":true,"pageEyebrow":"Website Submission","pageTitle":"网站收录","pageSubtitle":"免费收录与商业增值服务分离：基础提交走网站收录，置顶推荐与 Banner 曝光在服务页加购。","pageDescription":"提交后进入审核与收录流程，商业服务页用于新品上线、首页曝光与短期活动冲刺。","heroHighlights":["免费基础收录","人工审核收录","支持置顶推荐与 Banner 加购","个人中心可追踪进度"],"containerMaxWidth":1280,"pricingTitle":"收录与增值服务","processTitle":"服务流程","processDescription":"从提交资料、创建订单到人工审核上线，整条链路都可以按后台配置推进。","processSteps":[{"title":"填写站点资料","description":"提交网址、分类、简介与基础联系方式。","sort":10,"enabled":true},{"title":"选择服务方案","description":"免费收录走 /submit；商业服务页用于选择置顶推荐或 Banner 位。","sort":20,"enabled":true},{"title":"支付与审核","description":"勾选收费加购后系统会创建订单；完成支付后进入人工审核与排期。","sort":30,"enabled":true},{"title":"收录上线","description":"审核通过后正式上线展示，并可在个人中心查看记录。","sort":40,"enabled":true}],"submitNoticeTitle":"提交须知","submitNotices":["请确保提交的网站内容合法合规，且能稳定访问。","免费基础收录请使用 /submit；增值服务用于置顶推荐、Banner 位等下单。","置顶推荐和 Banner 位属于附加曝光，不替代收录审核标准。"],"faqTitle":"常见问题","closedTitle":"提交服务暂未开放","closedDescription":"当前站点已暂停新的提交与收录申请，请稍后再试或联系运营团队。","closedButtonText":"返回首页","closedButtonUrl":"/","submitService":{"enabled":true,"key":"submission","mode":"free","label":"免费提交收录","badge":"基础服务","description":"提交后进入人工审核、信息完善与正式收录流程。","price":0,"originalPrice":0,"ctaText":"免费提交","features":["站点进入人工审核与分类收录流程","审核通过后进入站内搜索与列表展示","适合常规网站收录"]},"topRecommendAddon":{"enabled":true,"key":"top_recommendation","label":"置顶推荐加购","badge":"曝光增强","description":"适合希望在分类页或推荐区获得更高排序与额外曝光的产品。","price":99,"originalPrice":129,"ctaText":"勾选加购","features":["优先进入推荐位与更高排序","适合新品冷启动与短期活动推广","可与 Banner 位叠加购买"]},"bannerAddon":{"enabled":true,"key":"banner_slot","label":"Banner 运营位加购","badge":"高曝光","description":"适合重点推广活动，可额外购买 Banner 位置用于首页或频道页运营展示。","price":199,"originalPrice":299,"ctaText":"勾选加购","features":["支持首页或频道 Banner 位展示","适合重点活动、新品发布与商业推广","由运营排期后投放"]},"faqItems":[{"question":"提交后多久审核？","answer":"通常 1-3 个工作日完成审核。","sort":10,"enabled":true},{"question":"置顶推荐和 Banner 位何时生效？","answer":"支付成功后由运营排期，审核通过后按配置执行。","sort":20,"enabled":true}]}',
  '投稿与增值服务配置',
  @now_ts,
  @now_ts
),
(
  'deliveryProfileCatalog',
  '[{"key":"commercial_default","name":"商业交付默认模板","description":"通用商业导航模板，适合标准售卖交付。","recommendedEdition":"pro","sort":10,"enabled":true,"baseProfile":"commercial_default","builtin":true},{"key":"ai_navigation","name":"AI 导航模板","description":"偏 AI 工具聚合场景，强调 AI 搜索与效率工具。","recommendedEdition":"pro","sort":20,"enabled":true,"baseProfile":"ai_navigation","builtin":true},{"key":"design_navigation","name":"设计导航模板","description":"偏 UI/UX 与灵感素材场景，强化设计分类与标签。","recommendedEdition":"pro","sort":30,"enabled":true,"baseProfile":"design_navigation","builtin":true},{"key":"tools_navigation","name":"工具导航模板","description":"偏效率与开发工具场景，适合通用工具站售卖。","recommendedEdition":"pro","sort":40,"enabled":true,"baseProfile":"tools_navigation","builtin":true}]',
  '交付初始化模板目录',
  @now_ts,
  @now_ts
)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `description` = VALUES(`description`),
  `update_time` = @now_ts;

-- 3) 初始分类：只写少量通用分类，客户可后台继续调整。
INSERT INTO `uied_category`
(`name`, `slug`, `icon`, `color`, `description`, `parent_id`, `sort`, `is_show`, `is_delete`, `create_time`, `update_time`, `delete_time`)
VALUES
('AI 工具', 'ai-tools', 'AI', '#7c3aed', 'AI 生成、分析、办公与开发工具', NULL, 10, 1, 0, @now_ts, @now_ts, 0),
('设计资源', 'design-resources', 'Design', '#1677ff', 'UI/UX、灵感、素材与设计系统资源', NULL, 20, 1, 0, @now_ts, @now_ts, 0),
('效率协作', 'productivity', 'Tool', '#16a34a', '办公协作、项目管理与自动化工具', NULL, 30, 1, 0, @now_ts, @now_ts, 0),
('开发工具', 'dev-tools', 'Code', '#0ea5e9', '前端、后端、部署与工程效率工具', NULL, 40, 1, 0, @now_ts, @now_ts, 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `icon` = VALUES(`icon`),
  `color` = VALUES(`color`),
  `description` = VALUES(`description`),
  `sort` = VALUES(`sort`),
  `is_show` = 1,
  `is_delete` = 0,
  `update_time` = @now_ts;

-- 4) 初始页面配置。
INSERT INTO `uied_page`
(`name`, `slug`, `type`, `icon`, `description`, `sort`, `is_show`, `hero_title`, `hero_highlight_text`, `hero_subtitle`, `hero_bg_type`, `hero_bg_value`, `hero_display_mode`, `search_placeholder`, `search_enabled`, `show_banner`, `show_hot_recommendations`, `show_categories`, `show_sidebar`, `theme_color`, `is_delete`, `create_time`, `update_time`, `delete_time`)
VALUES
('首页', 'home', 'home', 'Home', '站点首页', 10, 1, '发现优质工具与资源', '优质工具', '聚合设计、AI、效率与开发工具，支持免费收录与商业曝光。', 'default', '', 'search', '搜索站点名称、标签、分类', 1, 1, 1, 1, 1, '#1677ff', 0, @now_ts, @now_ts, 0),
('AI 工具', 'ai', 'category', 'AI', 'AI 工具频道', 20, 1, 'AI 工具导航', 'AI', '发现高质量 AI 产品、模型与工作流工具。', 'default', '', 'search', '搜索 AI 工具', 1, 1, 1, 1, 1, '#7c3aed', 0, @now_ts, @now_ts, 0),
('设计资源', 'design', 'category', 'Design', '设计资源频道', 30, 1, '设计资源导航', '设计', '聚合 UI/UX、灵感、素材和设计系统资源。', 'default', '', 'search', '搜索设计资源', 1, 1, 1, 1, 1, '#1677ff', 0, @now_ts, @now_ts, 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `icon` = VALUES(`icon`),
  `description` = VALUES(`description`),
  `sort` = VALUES(`sort`),
  `is_show` = 1,
  `is_delete` = 0,
  `update_time` = @now_ts;

-- 5) 后台交付初始化菜单与按钮权限，保证客户导入后能直接使用。
INSERT INTO `la_system_auth_menu`
(`id`, `pid`, `menu_type`, `menu_name`, `menu_icon`, `menu_sort`, `perms`, `paths`, `component`, `selected`, `params`, `is_cache`, `is_show`, `is_disable`, `create_time`, `update_time`)
VALUES
(894, 814, 'C', '交付初始化', 'el-icon-MagicStick', 43, 'uied:delivery:init:index', 'delivery-init', 'uied/deliveryInit/index', '/uied/delivery-init', '', 0, 1, 0, @now_ts, @now_ts),
(895, 894, 'A', '交付初始化预览', '', 10, 'uied:delivery:init:preview', '', '', '', '', 0, 1, 0, @now_ts, @now_ts),
(896, 894, 'A', '交付初始化执行', '', 11, 'uied:delivery:init:execute', '', '', '', '', 0, 1, 0, @now_ts, @now_ts),
(897, 894, 'A', '客户包导出', '', 12, 'uied:delivery:package:export', '', '', '', '', 0, 1, 0, @now_ts, @now_ts),
(898, 894, 'A', '模板管理', '', 13, 'uied:delivery:profile:save', '', '', '', '', 0, 1, 0, @now_ts, @now_ts),
(899, 894, 'A', '发布自检', '', 14, 'uied:delivery:doctor', '', '', '', '', 0, 1, 0, @now_ts, @now_ts)
ON DUPLICATE KEY UPDATE
  `pid` = VALUES(`pid`),
  `menu_type` = VALUES(`menu_type`),
  `menu_name` = VALUES(`menu_name`),
  `menu_icon` = VALUES(`menu_icon`),
  `menu_sort` = VALUES(`menu_sort`),
  `perms` = VALUES(`perms`),
  `paths` = VALUES(`paths`),
  `component` = VALUES(`component`),
  `selected` = VALUES(`selected`),
  `is_cache` = VALUES(`is_cache`),
  `is_show` = VALUES(`is_show`),
  `is_disable` = VALUES(`is_disable`),
  `update_time` = @now_ts;

INSERT INTO `la_system_auth_perm` (`id`, `role_id`, `menu_id`)
SELECT REPLACE(UUID(), '-', ''), 1, m.id
FROM `la_system_auth_menu` m
LEFT JOIN `la_system_auth_perm` p ON p.role_id = 1 AND p.menu_id = m.id
WHERE m.id IN (894, 895, 896, 897, 898, 899)
  AND p.id IS NULL;

COMMIT;
