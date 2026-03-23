-- 版本：1.0.9
-- 目的：新增/更新 Figma 插件「Web to Design」，并补充标签关联
-- 兼容：MySQL 5.6+

SET @now = UNIX_TIMESTAMP();

-- 1) 解析目标分类（效率工具）
SET @figma_category_id = (
  SELECT id
  FROM uied_figma_plugin_category
  WHERE slug = 'productivity' AND is_delete = 0
  LIMIT 1
);

-- 2) 兜底插入（若不存在）
INSERT INTO uied_figma_plugin (
  name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url,
  figma_plugin_id, author_name, transport_type, runtime, protocol_version, category_id,
  status, is_recommended, sort_order, publish_time, click_count, view_count, user_count, like_count,
  seo_title, seo_keywords, seo_description, source_type, source_url, is_delete, create_time, update_time
)
SELECT
  'Web to Design',
  'web-to-design-fsuied',
  '将网页快速转化为可编辑设计稿的效率工具，适用于设计还原、页面重构与方案提案场景。',
  '<p>Web to Design 是面向设计师与前端协作场景的效率插件，可将网页内容快速转为设计素材，便于做结构分析、视觉重构与交付评审。</p>',
  '',
  '',
  'https://fsuied.com/products/9',
  'https://fsuied.com/products/9',
  '',
  '',
  'UIED',
  'http',
  'other',
  '',
  @figma_category_id,
  'published',
  1,
  0,
  @now,
  0,
  0,
  0,
  0,
  'Web to Design - Figma 插件推荐',
  'Web to Design,Figma插件,网页转设计,设计提效',
  'Web to Design：将网页内容快速转成可编辑设计稿的 Figma 效率插件。',
  'manual',
  'https://fsuied.com/products/9',
  0,
  @now,
  @now
WHERE NOT EXISTS (
  SELECT 1
  FROM uied_figma_plugin
  WHERE is_delete = 0
    AND (slug = 'web-to-design-fsuied' OR official_url = 'https://fsuied.com/products/9')
);

-- 3) 统一更新（已存在时同步为目标内容）
UPDATE uied_figma_plugin
SET
  name = 'Web to Design',
  slug = 'web-to-design-fsuied',
  summary = '将网页快速转化为可编辑设计稿的效率工具，适用于设计还原、页面重构与方案提案场景。',
  content = '<p>Web to Design 是面向设计师与前端协作场景的效率插件，可将网页内容快速转为设计素材，便于做结构分析、视觉重构与交付评审。</p>',
  official_url = 'https://fsuied.com/products/9',
  docs_url = 'https://fsuied.com/products/9',
  github_url = '',
  category_id = @figma_category_id,
  status = 'published',
  is_recommended = 1,
  publish_time = IFNULL(publish_time, @now),
  seo_title = 'Web to Design - Figma 插件推荐',
  seo_keywords = 'Web to Design,Figma插件,网页转设计,设计提效',
  seo_description = 'Web to Design：将网页内容快速转成可编辑设计稿的 Figma 效率插件。',
  source_type = 'manual',
  source_url = 'https://fsuied.com/products/9',
  update_time = @now
WHERE is_delete = 0
  AND (slug = 'web-to-design-fsuied' OR official_url = 'https://fsuied.com/products/9');

-- 4) 标签关联：效率提速 + AI辅助 + 布局
SET @figma_item_id = (
  SELECT id
  FROM uied_figma_plugin
  WHERE slug = 'web-to-design-fsuied' AND is_delete = 0
  LIMIT 1
);

-- 先软删除历史关联，再按目标标签恢复/新增
UPDATE uied_figma_plugin_item_tag
SET is_delete = 1, update_time = @now
WHERE item_id = @figma_item_id;

INSERT INTO uied_figma_plugin_item_tag (item_id, tag_id, is_delete, create_time, update_time)
SELECT @figma_item_id, t.id, 0, @now, @now
FROM uied_figma_plugin_tag t
WHERE t.is_delete = 0
  AND t.slug IN ('efficiency', 'ai-assistant', 'layout')
ON DUPLICATE KEY UPDATE
  is_delete = 0,
  update_time = VALUES(update_time);

