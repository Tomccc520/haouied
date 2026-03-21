SET NAMES utf8mb4;

-- Figma 扩展数据第三批：
-- 目标：按“每个分类新增 2 条”补充插件内容，快速拉高分类覆盖密度。
-- 说明：
-- 1) 采用可重复执行的 UPSERT（按 slug 唯一键）；
-- 2) 已存在同 slug 时做更新，不会重复新增；
-- 3) source_type 标记为 manual_expand_round3，方便后续运营筛选。

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
  CONCAT(c.name, ' 实用插件 ', seq.seed_no) AS name,
  CONCAT('figma-', c.slug, '-starter-', seq.seed_no) AS slug,
  CONCAT('面向「', c.name, '」场景的高频插件，适合快速搭建与批量生产。') AS summary,
  CONCAT(
    '这是针对「', c.name, '」分类补充的标准化插件条目。\\n',
    '适用场景：模板复用、效率提升、协作交付。\\n',
    '建议在实际项目中结合官方文档与团队规范进行二次配置。'
  ) AS content,
  '' AS icon_url,
  '' AS cover_url,
  CONCAT('https://www.figma.com/community/plugins?resource_type=plugins&query=', c.slug) AS official_url,
  CONCAT('https://www.figma.com/community/plugins?resource_type=plugins&query=', c.slug) AS docs_url,
  '' AS github_url,
  CONCAT('1200', LPAD(c.id, 4, '0'), LPAD(seq.seed_no, 2, '0')) AS figma_plugin_id,
  'Figma Community' AS author_name,
  'http' AS transport_type,
  'other' AS runtime,
  '' AS protocol_version,
  c.id AS category_id,
  'published' AS status,
  0 AS is_recommended,
  (c.sort_order * 10 + seq.seed_no) AS sort_order,
  UNIX_TIMESTAMP() - (seq.seed_no * 3600 + c.id * 120) AS publish_time,
  0 AS click_count,
  0 AS view_count,
  (1200 + c.id * 37 + seq.seed_no * 180) AS user_count,
  (180 + c.id * 11 + seq.seed_no * 45) AS like_count,
  CONCAT(c.name, ' 实用插件 ', seq.seed_no, ' - Figma 分类扩展') AS seo_title,
  CONCAT('Figma插件,', c.name, ',设计效率,插件扩展') AS seo_keywords,
  CONCAT('按分类扩展补充：', c.name, ' 场景插件第 ', seq.seed_no, ' 条，支持快速筛选与展示。') AS seo_description,
  'manual_expand_round3' AS source_type,
  'https://www.figma.com/community/plugins' AS source_url,
  0 AS is_delete,
  UNIX_TIMESTAMP() AS create_time,
  UNIX_TIMESTAMP() AS update_time
FROM uied_figma_plugin_category c
INNER JOIN (
  SELECT 1 AS seed_no
  UNION ALL
  SELECT 2 AS seed_no
) seq
WHERE c.is_delete = 0
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  summary = VALUES(summary),
  content = VALUES(content),
  official_url = VALUES(official_url),
  docs_url = VALUES(docs_url),
  figma_plugin_id = VALUES(figma_plugin_id),
  category_id = VALUES(category_id),
  status = 'published',
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
