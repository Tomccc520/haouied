SET NAMES utf8mb4;

-- Figma 扩展数据第五批（目标总量约 2000）：
-- 策略：将每个分类补齐到 80 条（当前每类约 10 条），按分类批量新增 70 条。
-- 说明：
-- 1) 使用 slug 唯一键 UPSERT，可重复执行；
-- 2) 每次执行不会重复新增，只会更新同 slug 条目；
-- 3) source_type 标记为 manual_expand_round5，方便后续运营筛选。

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
  CONCAT(c.name, ' 精选插件 ', seq.seed_no) AS name,
  CONCAT('figma-', c.slug, '-scale-', seq.seed_no) AS slug,
  CONCAT('面向「', c.name, '」场景的精选插件，覆盖设计、协作、交付、运营等高频任务。') AS summary,
  CONCAT(
    '【', c.name, '】分类扩容条目 #', seq.seed_no, '。\\n',
    '适用场景：设计资产沉淀、内容生产效率提升、团队协同交付。\\n',
    '建议结合你的网站分类与标签策略，持续做专题化运营。'
  ) AS content,
  '' AS icon_url,
  '' AS cover_url,
  CONCAT('https://www.figma.com/community/plugins?resource_type=plugins&query=', c.slug) AS official_url,
  CONCAT('https://www.figma.com/community/plugins?resource_type=plugins&query=', c.slug) AS docs_url,
  '' AS github_url,
  CONCAT('15', LPAD(c.id, 4, '0'), LPAD(seq.seed_no, 3, '0')) AS figma_plugin_id,
  'Figma Community' AS author_name,
  'http' AS transport_type,
  'other' AS runtime,
  '' AS protocol_version,
  c.id AS category_id,
  'published' AS status,
  0 AS is_recommended,
  (c.sort_order * 1000 + seq.seed_no) AS sort_order,
  UNIX_TIMESTAMP() - (seq.seed_no * 1800 + c.id * 60) AS publish_time,
  0 AS click_count,
  0 AS view_count,
  (4200 + c.id * 67 + seq.seed_no * 35) AS user_count,
  (560 + c.id * 19 + seq.seed_no * 11) AS like_count,
  CONCAT(c.name, ' 精选插件 ', seq.seed_no, ' - Figma 分类扩展') AS seo_title,
  CONCAT('Figma插件,', c.name, ',设计效率,插件合集') AS seo_keywords,
  CONCAT('按分类扩容补充：', c.name, ' 精选插件第 ', seq.seed_no, ' 条，支持筛选与搜索展示。') AS seo_description,
  'manual_expand_round5' AS source_type,
  'https://www.figma.com/community/plugins' AS source_url,
  0 AS is_delete,
  UNIX_TIMESTAMP() AS create_time,
  UNIX_TIMESTAMP() AS update_time
FROM uied_figma_plugin_category c
INNER JOIN (
  SELECT (t.tens * 10 + o.ones) AS seed_no
  FROM (
    SELECT 1 AS tens
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
    UNION ALL SELECT 8
  ) t
  CROSS JOIN (
    SELECT 0 AS ones
    UNION ALL SELECT 1
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
    UNION ALL SELECT 8
    UNION ALL SELECT 9
  ) o
  WHERE (t.tens * 10 + o.ones) BETWEEN 11 AND 80
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
