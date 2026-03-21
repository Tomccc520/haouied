-- ============================================
-- UIED 数据库种子：MCP 中文增长扩展包（可重复执行）
-- 目标：
-- 1) 新增“办公协同 / 电商运营”分类
-- 2) 新增增长相关标签
-- 3) 新增 8 条可演示 MCP 条目（按 slug 幂等更新）
-- 适配：MySQL 5.6+
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;
SET @now := UNIX_TIMESTAMP();

-- =========================
-- 1) 分类扩展
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_growth_category;
CREATE TEMPORARY TABLE tmp_mcp_growth_category (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(1000) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  seo_title varchar(191) DEFAULT NULL,
  seo_keywords varchar(500) DEFAULT NULL,
  seo_description varchar(1000) DEFAULT NULL,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_growth_category
  (slug, name, description, sort_order, seo_title, seo_keywords, seo_description)
VALUES
  ('cn-office', '办公协同', '适合内容、运营与产品团队的日常协作和流程自动化场景。', 170, '办公协同 MCP 场景', 'MCP,办公协同,流程自动化', '办公协同类 MCP 场景集合，覆盖文档、消息、日报与流程编排。'),
  ('cn-ecommerce', '电商运营', '适合店铺运营、投放分析、活动复盘和客服协同的增长场景。', 180, '电商运营 MCP 场景', 'MCP,电商运营,增长分析', '电商运营类 MCP 场景集合，覆盖投放、数据洞察和客户运营。');

INSERT INTO uied_mcp_category
  (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_growth_category t
LEFT JOIN uied_mcp_category c ON c.slug = t.slug AND c.is_delete = 0
WHERE c.id IS NULL;

UPDATE uied_mcp_category c
INNER JOIN tmp_mcp_growth_category t ON t.slug = c.slug
SET
  c.name = t.name,
  c.description = t.description,
  c.sort_order = t.sort_order,
  c.seo_title = t.seo_title,
  c.seo_keywords = t.seo_keywords,
  c.seo_description = t.seo_description,
  c.is_delete = 0,
  c.update_time = @now;

-- =========================
-- 2) 标签扩展（含依赖标签兜底）
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_growth_tag;
CREATE TEMPORARY TABLE tmp_mcp_growth_tag (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(500) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_growth_tag
  (slug, name, description, sort_order)
VALUES
  ('office-automation', '办公自动化', '文档、消息、日报等办公流程自动化', 370),
  ('ecommerce-growth', '电商增长', '电商投放、促活、转化分析', 380),
  ('content-marketing', '内容营销', '选题、文案、活动内容协作', 390),
  ('workflow-orchestration', '流程编排', '跨系统任务编排与自动执行', 400),
  ('cn-scene', '中文场景', '面向国内业务落地的 MCP 方案', 300),
  ('collaboration', '协作办公', '跨团队协作与通知联动', 210),
  ('docs-sync', '文档同步', '文档、知识库与资料同步', 350),
  ('report-analysis', '报表分析', '数据分析与复盘报告', 220);

INSERT INTO uied_mcp_tag
  (name, slug, description, sort_order, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, 0, @now, @now
FROM tmp_mcp_growth_tag t
LEFT JOIN uied_mcp_tag tag ON tag.slug = t.slug AND tag.is_delete = 0
WHERE tag.id IS NULL;

UPDATE uied_mcp_tag tag
INNER JOIN tmp_mcp_growth_tag t ON t.slug = tag.slug
SET
  tag.name = t.name,
  tag.description = t.description,
  tag.sort_order = t.sort_order,
  tag.is_delete = 0,
  tag.update_time = @now;

-- =========================
-- 3) 条目扩展
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_growth_item;
CREATE TEMPORARY TABLE tmp_mcp_growth_item (
  slug varchar(191) NOT NULL,
  name varchar(191) NOT NULL,
  category_slug varchar(120) NOT NULL,
  summary text,
  content longtext,
  official_url varchar(500) DEFAULT NULL,
  docs_url varchar(500) DEFAULT NULL,
  github_url varchar(500) DEFAULT NULL,
  transport_type varchar(20) NOT NULL DEFAULT 'http',
  runtime varchar(20) NOT NULL DEFAULT 'other',
  protocol_version varchar(50) DEFAULT NULL,
  status varchar(20) NOT NULL DEFAULT 'published',
  is_recommended tinyint unsigned NOT NULL DEFAULT 1,
  sort_order int unsigned NOT NULL DEFAULT 0,
  publish_offset int unsigned NOT NULL DEFAULT 0,
  seo_title varchar(191) DEFAULT NULL,
  seo_keywords varchar(500) DEFAULT NULL,
  seo_description varchar(1000) DEFAULT NULL,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_growth_item
  (slug, name, category_slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, status, is_recommended, sort_order, publish_offset, seo_title, seo_keywords, seo_description)
VALUES
  ('cn-office-kb-assistant-mcp', '办公知识助手 MCP', 'cn-office', '整合文档检索与知识问答，提升团队答疑效率。', '基于 Fetch + Memory 场景封装，适合内部知识库问答、入职手册检索与规范查询。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'http', 'node', '2024-11-05', 'published', 1, 710, 1200, '办公知识助手 MCP', 'MCP,办公协同,文档同步,知识库', '办公知识助手 MCP，适合企业内部文档检索与知识问答。'),
  ('cn-office-daily-report-mcp', '日报周报自动汇总 MCP', 'cn-office', '自动汇总项目进展并生成日报周报草稿。', '基于 SQLite + GitHub 场景封装，适合研发和运营团队的阶段汇总与复盘输出。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'stdio', 'node', '2024-11-05', 'published', 1, 720, 1500, '日报周报自动汇总 MCP', 'MCP,办公自动化,报表分析,流程编排', '日报周报自动汇总 MCP，可用于团队周会前自动生成复盘内容。'),
  ('cn-office-slack-ops-mcp', '跨团队通知协同 MCP', 'cn-office', '打通运营、产品、研发通知链路，减少信息滞后。', '基于 Slack MCP Server 的通知与协同能力，支持任务提醒、故障播报和发布通知。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'http', 'node', '2024-11-05', 'published', 1, 730, 1800, '跨团队通知协同 MCP', 'MCP,协作办公,流程编排,办公协同', '跨团队通知协同 MCP，适合多部门联合运营。'),
  ('cn-office-release-sync-mcp', '发布变更同步 MCP', 'cn-office', '自动同步发布变更并生成对内公告。', '基于 GitHub MCP Server 的版本追踪能力，适配发布节奏同步和变更通知。', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'http', 'other', '2024-11-05', 'published', 1, 740, 2100, '发布变更同步 MCP', 'MCP,发布追踪,办公自动化,流程编排', '发布变更同步 MCP，帮助团队快速同步版本动态。'),
  ('cn-ecommerce-traffic-insight-mcp', '电商投放洞察 MCP', 'cn-ecommerce', '聚合渠道数据并输出投放复盘建议。', '基于 PostgreSQL 场景封装，适合按活动周期做投放效果分析与预算优化。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'stdio', 'node', '2024-11-05', 'published', 1, 750, 2400, '电商投放洞察 MCP', 'MCP,电商增长,报表分析,数据洞察', '电商投放洞察 MCP，适合电商团队追踪ROI和转化表现。'),
  ('cn-ecommerce-activity-content-mcp', '活动内容编排 MCP', 'cn-ecommerce', '围绕大促与上新活动统一编排内容素材。', '基于 Filesystem + Fetch 场景封装，可用于活动页文案、素材与任务协同。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'stdio', 'node', '2024-11-05', 'published', 1, 760, 2700, '活动内容编排 MCP', 'MCP,电商运营,内容营销,流程编排', '活动内容编排 MCP，适合电商活动运营团队。'),
  ('cn-ecommerce-customer-feedback-mcp', '电商客诉归因 MCP', 'cn-ecommerce', '自动汇总评价与客诉，输出问题归因建议。', '基于 Fetch + SQLite 场景封装，支持评论汇总、问题分类和改进建议输出。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'http', 'node', '2024-11-05', 'published', 1, 770, 3000, '电商客诉归因 MCP', 'MCP,电商增长,客户反馈,报表分析', '电商客诉归因 MCP，适合客服与运营联动复盘。'),
  ('cn-ecommerce-growth-search-mcp', '增长选题检索 MCP', 'cn-ecommerce', '快速检索竞品活动与热门话题，辅助增长选题。', '基于 Brave Search MCP Server 的检索能力，支持活动节点选题和竞品跟踪。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'http', 'node', '2024-11-05', 'published', 1, 780, 3300, '增长选题检索 MCP', 'MCP,电商增长,内容营销,搜索', '增长选题检索 MCP，适合运营和内容团队选题提效。');

INSERT INTO uied_mcp_item
  (name, slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, category_id, status, is_recommended, sort_order, publish_time, click_count, view_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.summary, t.content,
  NULLIF(t.official_url, ''), NULLIF(t.docs_url, ''), NULLIF(t.github_url, ''),
  t.transport_type, t.runtime, t.protocol_version, c.id,
  t.status, t.is_recommended, t.sort_order, @now - t.publish_offset,
  0, 0, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_growth_item t
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
LEFT JOIN uied_mcp_item i ON i.slug = t.slug AND i.is_delete = 0
WHERE i.id IS NULL;

UPDATE uied_mcp_item i
INNER JOIN tmp_mcp_growth_item t ON t.slug = i.slug
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
SET
  i.name = t.name,
  i.summary = t.summary,
  i.content = t.content,
  i.official_url = NULLIF(t.official_url, ''),
  i.docs_url = NULLIF(t.docs_url, ''),
  i.github_url = NULLIF(t.github_url, ''),
  i.transport_type = t.transport_type,
  i.runtime = t.runtime,
  i.protocol_version = t.protocol_version,
  i.category_id = c.id,
  i.status = t.status,
  i.is_recommended = t.is_recommended,
  i.sort_order = t.sort_order,
  i.publish_time = IFNULL(i.publish_time, @now - t.publish_offset),
  i.seo_title = t.seo_title,
  i.seo_keywords = t.seo_keywords,
  i.seo_description = t.seo_description,
  i.is_delete = 0,
  i.update_time = @now;

-- =========================
-- 4) 标签关联
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_growth_item_tag;
CREATE TEMPORARY TABLE tmp_mcp_growth_item_tag (
  item_slug varchar(191) NOT NULL,
  tag_slug varchar(120) NOT NULL,
  PRIMARY KEY (item_slug, tag_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_growth_item_tag (item_slug, tag_slug) VALUES
  ('cn-office-kb-assistant-mcp', 'cn-scene'),
  ('cn-office-kb-assistant-mcp', 'office-automation'),
  ('cn-office-kb-assistant-mcp', 'docs-sync'),
  ('cn-office-daily-report-mcp', 'cn-scene'),
  ('cn-office-daily-report-mcp', 'office-automation'),
  ('cn-office-daily-report-mcp', 'report-analysis'),
  ('cn-office-daily-report-mcp', 'workflow-orchestration'),
  ('cn-office-slack-ops-mcp', 'cn-scene'),
  ('cn-office-slack-ops-mcp', 'collaboration'),
  ('cn-office-slack-ops-mcp', 'workflow-orchestration'),
  ('cn-office-release-sync-mcp', 'cn-scene'),
  ('cn-office-release-sync-mcp', 'office-automation'),
  ('cn-office-release-sync-mcp', 'workflow-orchestration'),
  ('cn-ecommerce-traffic-insight-mcp', 'cn-scene'),
  ('cn-ecommerce-traffic-insight-mcp', 'ecommerce-growth'),
  ('cn-ecommerce-traffic-insight-mcp', 'report-analysis'),
  ('cn-ecommerce-activity-content-mcp', 'cn-scene'),
  ('cn-ecommerce-activity-content-mcp', 'ecommerce-growth'),
  ('cn-ecommerce-activity-content-mcp', 'content-marketing'),
  ('cn-ecommerce-activity-content-mcp', 'workflow-orchestration'),
  ('cn-ecommerce-customer-feedback-mcp', 'cn-scene'),
  ('cn-ecommerce-customer-feedback-mcp', 'ecommerce-growth'),
  ('cn-ecommerce-customer-feedback-mcp', 'report-analysis'),
  ('cn-ecommerce-growth-search-mcp', 'cn-scene'),
  ('cn-ecommerce-growth-search-mcp', 'ecommerce-growth'),
  ('cn-ecommerce-growth-search-mcp', 'content-marketing');

INSERT INTO uied_mcp_item_tag (item_id, tag_id, is_delete, create_time, update_time)
SELECT
  i.id, t.id, 0, @now, @now
FROM tmp_mcp_growth_item_tag m
INNER JOIN uied_mcp_item i ON i.slug = m.item_slug AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.slug = m.tag_slug AND t.is_delete = 0
LEFT JOIN uied_mcp_item_tag rel ON rel.item_id = i.id AND rel.tag_id = t.id
WHERE rel.id IS NULL;

UPDATE uied_mcp_item_tag rel
INNER JOIN uied_mcp_item i ON i.id = rel.item_id AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
INNER JOIN tmp_mcp_growth_item_tag m ON m.item_slug = i.slug AND m.tag_slug = t.slug
SET
  rel.is_delete = 0,
  rel.update_time = @now;

COMMIT;

