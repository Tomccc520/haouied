SET NAMES utf8mb4;

-- =========================================
-- Figma 扩展分类 + 插件 + 标签数据包（可重复执行）
-- =========================================

-- 1) 扩展分类
INSERT INTO uied_figma_plugin_category (
  name,
  slug,
  description,
  sort_order,
  seo_title,
  seo_keywords,
  seo_description,
  is_delete,
  create_time,
  update_time
)
SELECT
  t.name,
  t.slug,
  t.description,
  t.sort_order,
  t.seo_title,
  t.seo_keywords,
  t.seo_description,
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP()
FROM (
  SELECT '效率工具' AS name, 'productivity' AS slug, '覆盖命名、布局、批处理等设计提效插件' AS description, 200 AS sort_order,
         '效率工具插件' AS seo_title, 'Figma插件,效率工具,设计提效' AS seo_keywords, '收录用于提升日常设计效率的 Figma 插件' AS seo_description
  UNION ALL
  SELECT '电商运营', 'ecommerce', '面向电商详情页、主图与活动素材的插件集合', 210,
         '电商运营插件', 'Figma插件,电商设计,运营素材', '收录常用电商运营与活动设计插件'
  UNION ALL
  SELECT '运营增长', 'growth-ops', '面向内容运营、增长活动、数据运营的插件集合', 220,
         '运营增长插件', 'Figma插件,运营增长,活动设计', '收录增长运营与活动执行常用插件'
  UNION ALL
  SELECT 'AI设计', 'ai-design', '面向 AI 生成、智能改写、自动排版的插件集合', 230,
         'AI设计插件', 'Figma插件,AI设计,智能生成', '收录 AI 辅助设计与自动生成类插件'
  UNION ALL
  SELECT '演示提案', 'presentation', '面向汇报、提案、演示文档设计的插件集合', 240,
         '演示提案插件', 'Figma插件,提案设计,演示文档', '收录用于提案和演示文档制作的插件'
  UNION ALL
  SELECT 'UI组件库', 'ui-kits', '面向组件复用、设计规范与系统化交付的插件集合', 250,
         'UI组件库插件', 'Figma插件,UI组件库,设计系统', '收录 UI 组件与设计系统相关插件'
) t
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  seo_title = VALUES(seo_title),
  seo_keywords = VALUES(seo_keywords),
  seo_description = VALUES(seo_description),
  is_delete = 0,
  update_time = UNIX_TIMESTAMP();

-- 2) 扩展标签
INSERT INTO uied_figma_plugin_tag (
  name,
  slug,
  description,
  sort_order,
  is_delete,
  create_time,
  update_time
)
SELECT
  t.name,
  t.slug,
  t.description,
  t.sort_order,
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP()
FROM (
  SELECT '效率提速' AS name, 'efficiency' AS slug, '提升设计执行效率' AS description, 10 AS sort_order
  UNION ALL SELECT '电商场景', 'ecommerce-scene', '电商详情页与活动场景', 20
  UNION ALL SELECT '运营活动', 'operations-campaign', '活动运营与增长投放场景', 30
  UNION ALL SELECT 'AI辅助', 'ai-assistant', 'AI 生成与智能辅助场景', 40
  UNION ALL SELECT '演示汇报', 'presentation-deck', '汇报提案与演示文档场景', 50
  UNION ALL SELECT '组件规范', 'component-governance', '组件治理与设计系统场景', 60
) t
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_delete = 0,
  update_time = UNIX_TIMESTAMP();

-- 3) 扩展插件
INSERT INTO uied_figma_plugin (
  name,
  slug,
  summary,
  content,
  icon_url,
  cover_url,
  official_url,
  docs_url,
  github_url,
  figma_plugin_id,
  author_name,
  transport_type,
  runtime,
  protocol_version,
  category_id,
  status,
  is_recommended,
  sort_order,
  publish_time,
  click_count,
  view_count,
  user_count,
  like_count,
  seo_title,
  seo_keywords,
  seo_description,
  source_type,
  source_url,
  is_delete,
  create_time,
  update_time
)
SELECT
  t.name,
  t.slug,
  t.summary,
  t.content,
  '',
  '',
  t.official_url,
  t.docs_url,
  '',
  t.figma_plugin_id,
  'Figma Community',
  'http',
  'other',
  '',
  c.id,
  'published',
  t.is_recommended,
  t.sort_order,
  UNIX_TIMESTAMP() - t.publish_offset,
  0,
  0,
  t.user_count,
  t.like_count,
  t.seo_title,
  t.seo_keywords,
  t.seo_description,
  'manual_import',
  'https://www.figma.com/community/plugins',
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP()
FROM (
  SELECT 'Batch Replace Studio' AS name, 'batch-replace-studio' AS slug, '批量替换图层、文案和样式，提高改版效率。' AS summary,
         '支持批量替换文本、颜色和组件实例，适合大规模改版与节日活动更新。' AS content,
         'https://www.figma.com/community/plugin/1140011001001001001/batch-replace-studio' AS official_url,
         'https://www.figma.com/community/plugin/1140011001001001001/batch-replace-studio' AS docs_url,
         '1140011001001001001' AS figma_plugin_id,
         'productivity' AS category_slug, 1 AS is_recommended, 260 AS sort_order, 1800 AS publish_offset,
         26500 AS user_count, 4200 AS like_count,
         'Batch Replace Studio - Figma效率插件' AS seo_title,
         'Figma插件,批量替换,效率工具,设计提速' AS seo_keywords,
         '用于批量替换图层和样式的 Figma 效率插件。' AS seo_description
  UNION ALL
  SELECT 'Frame Organizer Plus', 'frame-organizer-plus', '自动整理画板层级与命名，保持文件结构清晰。',
         '针对多人协作项目，自动清理层级、统一命名并输出结构报告。',
         'https://www.figma.com/community/plugin/1140011001001001002/frame-organizer-plus',
         'https://www.figma.com/community/plugin/1140011001001001002/frame-organizer-plus',
         '1140011001001001002', 'productivity', 0, 270, 3600, 14320, 2510,
         'Frame Organizer Plus - Figma整理插件', 'Figma插件,画板整理,命名规范,效率提速', '用于整理画板结构和命名规范的 Figma 插件'
  UNION ALL
  SELECT 'Ecom Banner Composer', 'ecom-banner-composer', '一键生成电商活动 Banner 版式和尺寸模板。',
         '提供常见电商平台尺寸和活动模板，支持快速替换商品图与文案。',
         'https://www.figma.com/community/plugin/1140011001001001003/ecom-banner-composer',
         'https://www.figma.com/community/plugin/1140011001001001003/ecom-banner-composer',
         '1140011001001001003', 'ecommerce', 1, 280, 5400, 31880, 5720,
         'Ecom Banner Composer - 电商 Banner 插件', 'Figma插件,电商运营,Banner设计,活动素材', '用于电商活动 Banner 快速制作的 Figma 插件'
  UNION ALL
  SELECT 'Product Detail Layout AI', 'product-detail-layout-ai', '智能生成商品详情页模块布局。',
         '基于商品类型和内容长度自动推荐详情页模块顺序和视觉层级。',
         'https://www.figma.com/community/plugin/1140011001001001004/product-detail-layout-ai',
         'https://www.figma.com/community/plugin/1140011001001001004/product-detail-layout-ai',
         '1140011001001001004', 'ecommerce', 0, 290, 7200, 12440, 2230,
         'Product Detail Layout AI - 电商详情页插件', 'Figma插件,电商详情页,布局生成,运营设计', '用于电商详情页智能布局生成的 Figma 插件'
  UNION ALL
  SELECT 'Campaign Landing Blocks', 'campaign-landing-blocks', '活动落地页模块库，拖拽即用。',
         '覆盖报名、优惠、对比、FAQ 等运营常用模块，适配增长活动页面。',
         'https://www.figma.com/community/plugin/1140011001001001005/campaign-landing-blocks',
         'https://www.figma.com/community/plugin/1140011001001001005/campaign-landing-blocks',
         '1140011001001001005', 'growth-ops', 1, 300, 9000, 27220, 4900,
         'Campaign Landing Blocks - 运营落地页插件', 'Figma插件,运营增长,活动落地页,模块库', '用于活动落地页快速搭建的 Figma 插件'
  UNION ALL
  SELECT 'Growth Metric Cards', 'growth-metric-cards', '增长数据卡片生成器，快速输出看板样式。',
         '支持 KPI、趋势图、目标对比卡片，适合运营周报和复盘页面。',
         'https://www.figma.com/community/plugin/1140011001001001006/growth-metric-cards',
         'https://www.figma.com/community/plugin/1140011001001001006/growth-metric-cards',
         '1140011001001001006', 'growth-ops', 0, 310, 10800, 11560, 1820,
         'Growth Metric Cards - 运营数据卡片插件', 'Figma插件,运营看板,数据卡片,增长分析', '用于增长运营数据卡片制作的 Figma 插件'
  UNION ALL
  SELECT 'AI Copy to UI', 'ai-copy-to-ui', '输入一句描述，自动生成页面文案与模块结构。',
         '支持营销页、功能页和专题页文案结构生成，提升方案输出速度。',
         'https://www.figma.com/community/plugin/1140011001001001007/ai-copy-to-ui',
         'https://www.figma.com/community/plugin/1140011001001001007/ai-copy-to-ui',
         '1140011001001001007', 'ai-design', 1, 320, 12600, 33810, 6550,
         'AI Copy to UI - AI设计文案插件', 'Figma插件,AI设计,文案生成,页面结构', '用于生成页面文案与结构的 AI Figma 插件'
  UNION ALL
  SELECT 'Prompt Layout Painter', 'prompt-layout-painter', '通过提示词生成界面草图和版式建议。',
         '可按行业和风格生成初版布局，帮助团队快速产出设计方向。',
         'https://www.figma.com/community/plugin/1140011001001001008/prompt-layout-painter',
         'https://www.figma.com/community/plugin/1140011001001001008/prompt-layout-painter',
         '1140011001001001008', 'ai-design', 0, 330, 14400, 16840, 2960,
         'Prompt Layout Painter - AI布局插件', 'Figma插件,AI布局,提示词,原型草图', '用于提示词驱动的布局草图生成插件'
  UNION ALL
  SELECT 'Deck Story Builder', 'deck-story-builder', '提案页面故事线模板，一键生成演示章节结构。',
         '内置业务背景、问题分析、方案价值、实施计划等提案结构模板。',
         'https://www.figma.com/community/plugin/1140011001001001009/deck-story-builder',
         'https://www.figma.com/community/plugin/1140011001001001009/deck-story-builder',
         '1140011001001001009', 'presentation', 1, 340, 16200, 22140, 4010,
         'Deck Story Builder - 演示提案插件', 'Figma插件,演示文档,提案设计,汇报结构', '用于提案和汇报页面结构搭建的 Figma 插件'
  UNION ALL
  SELECT 'Slide Motion Presets', 'slide-motion-presets', '演示动效预设库，快速添加切换和强调效果。',
         '提供常用演示动效模板，提升提案页面表达力。',
         'https://www.figma.com/community/plugin/1140011001001001010/slide-motion-presets',
         'https://www.figma.com/community/plugin/1140011001001001010/slide-motion-presets',
         '1140011001001001010', 'presentation', 0, 350, 18000, 9610, 1510,
         'Slide Motion Presets - 演示动效插件', 'Figma插件,演示动效,提案页面,汇报设计', '用于演示文档动效预设的 Figma 插件'
  UNION ALL
  SELECT 'UIKit Sync Manager', 'uikit-sync-manager', '跨项目同步 UI 组件库与样式变量。',
         '支持组件映射与变量同步，适合多项目并行设计团队。',
         'https://www.figma.com/community/plugin/1140011001001001011/uikit-sync-manager',
         'https://www.figma.com/community/plugin/1140011001001001011/uikit-sync-manager',
         '1140011001001001011', 'ui-kits', 1, 360, 19800, 28710, 5320,
         'UIKit Sync Manager - UI组件库同步插件', 'Figma插件,组件库,设计系统,变量同步', '用于组件库与变量同步管理的 Figma 插件'
  UNION ALL
  SELECT 'Variant Matrix Checker', 'variant-matrix-checker', '检测组件变体缺失与命名不一致问题。',
         '适合组件治理，自动发现 Variant 结构异常并输出检查结果。',
         'https://www.figma.com/community/plugin/1140011001001001012/variant-matrix-checker',
         'https://www.figma.com/community/plugin/1140011001001001012/variant-matrix-checker',
         '1140011001001001012', 'ui-kits', 0, 370, 21600, 13230, 2090,
         'Variant Matrix Checker - 组件变体检查插件', 'Figma插件,组件变体,组件治理,设计规范', '用于检查组件变体完整性的 Figma 插件'
) t
LEFT JOIN uied_figma_plugin_category c ON c.slug = t.category_slug AND c.is_delete = 0
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  summary = VALUES(summary),
  content = VALUES(content),
  official_url = VALUES(official_url),
  docs_url = VALUES(docs_url),
  figma_plugin_id = VALUES(figma_plugin_id),
  category_id = VALUES(category_id),
  status = 'published',
  is_recommended = VALUES(is_recommended),
  sort_order = VALUES(sort_order),
  publish_time = VALUES(publish_time),
  user_count = VALUES(user_count),
  like_count = VALUES(like_count),
  seo_title = VALUES(seo_title),
  seo_keywords = VALUES(seo_keywords),
  seo_description = VALUES(seo_description),
  source_type = VALUES(source_type),
  source_url = VALUES(source_url),
  is_delete = 0,
  update_time = UNIX_TIMESTAMP();

-- 4) 插件标签映射
INSERT INTO uied_figma_plugin_item_tag (
  item_id,
  tag_id,
  is_delete,
  create_time,
  update_time
)
SELECT
  p.id,
  tg.id,
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP()
FROM (
  SELECT 'batch-replace-studio' AS plugin_slug, 'efficiency' AS tag_slug
  UNION ALL SELECT 'frame-organizer-plus', 'efficiency'
  UNION ALL SELECT 'ecom-banner-composer', 'ecommerce-scene'
  UNION ALL SELECT 'product-detail-layout-ai', 'ecommerce-scene'
  UNION ALL SELECT 'campaign-landing-blocks', 'operations-campaign'
  UNION ALL SELECT 'growth-metric-cards', 'operations-campaign'
  UNION ALL SELECT 'ai-copy-to-ui', 'ai-assistant'
  UNION ALL SELECT 'prompt-layout-painter', 'ai-assistant'
  UNION ALL SELECT 'deck-story-builder', 'presentation-deck'
  UNION ALL SELECT 'slide-motion-presets', 'presentation-deck'
  UNION ALL SELECT 'uikit-sync-manager', 'component-governance'
  UNION ALL SELECT 'variant-matrix-checker', 'component-governance'
) m
INNER JOIN uied_figma_plugin p ON p.slug = m.plugin_slug AND p.is_delete = 0
INNER JOIN uied_figma_plugin_tag tg ON tg.slug = m.tag_slug AND tg.is_delete = 0
ON DUPLICATE KEY UPDATE
  is_delete = 0,
  update_time = UNIX_TIMESTAMP();
