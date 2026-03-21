SET NAMES utf8mb4;

-- Figma 扩展数据第二批：为新增分类补齐到 3 条

INSERT INTO uied_figma_plugin (
  name, slug, summary, content, icon_url, cover_url,
  official_url, docs_url, github_url, figma_plugin_id, author_name,
  transport_type, runtime, protocol_version,
  category_id, status, is_recommended, sort_order, publish_time,
  click_count, view_count, user_count, like_count,
  seo_title, seo_keywords, seo_description,
  source_type, source_url, is_delete, create_time, update_time
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
  SELECT 'Token Batch Converter' AS name, 'token-batch-converter' AS slug, '批量转换颜色/字号为设计 Token。' AS summary,
         '帮助团队快速把历史页面样式转换为变量 Token，提升规范化程度。' AS content,
         'https://www.figma.com/community/plugin/1140011001001001013/token-batch-converter' AS official_url,
         'https://www.figma.com/community/plugin/1140011001001001013/token-batch-converter' AS docs_url,
         '1140011001001001013' AS figma_plugin_id,
         'productivity' AS category_slug, 0 AS is_recommended, 380 AS sort_order, 2400 AS publish_offset,
         9960 AS user_count, 1550 AS like_count,
         'Token Batch Converter - Figma效率插件' AS seo_title,
         'Figma插件,效率工具,Token转换,样式规范' AS seo_keywords,
         '用于批量转换样式为 Token 的 Figma 插件。' AS seo_description
  UNION ALL
  SELECT 'SKU Poster Factory', 'sku-poster-factory', '快速生成 SKU 海报与主图组合。',
         '适用于多 SKU 商品批量出图，支持统一模板与自动替换字段。',
         'https://www.figma.com/community/plugin/1140011001001001014/sku-poster-factory',
         'https://www.figma.com/community/plugin/1140011001001001014/sku-poster-factory',
         '1140011001001001014', 'ecommerce', 0, 390, 3600, 17820, 3020,
         'SKU Poster Factory - 电商海报插件', 'Figma插件,电商运营,SKU海报,主图设计', '用于电商 SKU 海报批量制作的 Figma 插件'
  UNION ALL
  SELECT 'Campaign Timeline Blocks', 'campaign-timeline-blocks', '活动时间线与节奏模块库。',
         '适配运营排期与活动节奏展示，提升项目沟通效率。',
         'https://www.figma.com/community/plugin/1140011001001001015/campaign-timeline-blocks',
         'https://www.figma.com/community/plugin/1140011001001001015/campaign-timeline-blocks',
         '1140011001001001015', 'growth-ops', 0, 400, 4800, 8820, 1390,
         'Campaign Timeline Blocks - 运营节奏插件', 'Figma插件,运营增长,活动时间线,排期设计', '用于活动节奏与时间线搭建的 Figma 插件'
  UNION ALL
  SELECT 'AI Section Rewriter', 'ai-section-rewriter', '基于语义重写模块标题与卖点文案。',
         '可按场景重写文案风格，适配官网、专题页与落地页。',
         'https://www.figma.com/community/plugin/1140011001001001016/ai-section-rewriter',
         'https://www.figma.com/community/plugin/1140011001001001016/ai-section-rewriter',
         '1140011001001001016', 'ai-design', 0, 410, 6000, 12560, 2040,
         'AI Section Rewriter - AI文案重写插件', 'Figma插件,AI设计,文案重写,内容优化', '用于页面文案语义重写和优化的 Figma 插件'
  UNION ALL
  SELECT 'Pitch Onepager Builder', 'pitch-onepager-builder', '一页式提案模板生成器。',
         '帮助快速组织卖点、指标、方案与行动计划页面。',
         'https://www.figma.com/community/plugin/1140011001001001017/pitch-onepager-builder',
         'https://www.figma.com/community/plugin/1140011001001001017/pitch-onepager-builder',
         '1140011001001001017', 'presentation', 0, 420, 7200, 7840, 1220,
         'Pitch Onepager Builder - 一页提案插件', 'Figma插件,演示提案,一页PPT,汇报模板', '用于一页提案快速搭建的 Figma 插件'
  UNION ALL
  SELECT 'Component Library Scanner', 'component-library-scanner', '扫描组件库重复项与命名冲突。',
         '帮助团队治理组件库，减少重复组件和命名混乱问题。',
         'https://www.figma.com/community/plugin/1140011001001001018/component-library-scanner',
         'https://www.figma.com/community/plugin/1140011001001001018/component-library-scanner',
         '1140011001001001018', 'ui-kits', 0, 430, 8400, 10210, 1730,
         'Component Library Scanner - 组件库扫描插件', 'Figma插件,组件库,设计系统,组件治理', '用于组件库扫描和重复项治理的 Figma 插件'
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

INSERT INTO uied_figma_plugin_item_tag (
  item_id, tag_id, is_delete, create_time, update_time
)
SELECT
  p.id,
  tg.id,
  0,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP()
FROM (
  SELECT 'token-batch-converter' AS plugin_slug, 'efficiency' AS tag_slug
  UNION ALL SELECT 'sku-poster-factory', 'ecommerce-scene'
  UNION ALL SELECT 'campaign-timeline-blocks', 'operations-campaign'
  UNION ALL SELECT 'ai-section-rewriter', 'ai-assistant'
  UNION ALL SELECT 'pitch-onepager-builder', 'presentation-deck'
  UNION ALL SELECT 'component-library-scanner', 'component-governance'
) m
INNER JOIN uied_figma_plugin p ON p.slug = m.plugin_slug AND p.is_delete = 0
INNER JOIN uied_figma_plugin_tag tg ON tg.slug = m.tag_slug AND tg.is_delete = 0
ON DUPLICATE KEY UPDATE
  is_delete = 0,
  update_time = UNIX_TIMESTAMP();
