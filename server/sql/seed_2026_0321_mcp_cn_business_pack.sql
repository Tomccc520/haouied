-- ============================================
-- UIED 数据库种子：MCP 中文业务扩展包（可重复执行）
-- 目标：
-- 1) 新增“设计创作/产品研发/客户服务”三类分类
-- 2) 新增业务标签与 10 条可演示条目
-- 3) 保持幂等导入（按 slug 更新）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;
SET @now := UNIX_TIMESTAMP();

-- =========================
-- 1) 分类扩展
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_business_category;
CREATE TEMPORARY TABLE tmp_mcp_business_category (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(1000) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  seo_title varchar(191) DEFAULT NULL,
  seo_keywords varchar(500) DEFAULT NULL,
  seo_description varchar(1000) DEFAULT NULL,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_business_category
  (slug, name, description, sort_order, seo_title, seo_keywords, seo_description)
VALUES
  ('cn-design', '设计创作', '面向设计团队的素材、审稿与设计协作场景。', 140, '设计创作 MCP 场景', 'MCP,设计创作,UI设计', '设计创作类 MCP 场景集合，适合素材管理与设计流程协作。'),
  ('cn-product', '产品研发', '面向产品经理与研发团队的需求与发布协作场景。', 150, '产品研发 MCP 场景', 'MCP,产品研发,需求管理', '产品研发类 MCP 场景集合，覆盖需求、发布和数据分析。'),
  ('cn-service', '客户服务', '面向客服与运营支持的知识检索与响应协作场景。', 160, '客户服务 MCP 场景', 'MCP,客户服务,客服运营', '客户服务类 MCP 场景集合，覆盖知识检索、工单协作与服务复盘。');

INSERT INTO uied_mcp_category
  (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_business_category t
LEFT JOIN uied_mcp_category c ON c.slug = t.slug AND c.is_delete = 0
WHERE c.id IS NULL;

UPDATE uied_mcp_category c
INNER JOIN tmp_mcp_business_category t ON t.slug = c.slug
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
-- 2) 标签扩展
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_business_tag;
CREATE TEMPORARY TABLE tmp_mcp_business_tag (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(500) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_business_tag
  (slug, name, description, sort_order)
VALUES
  ('design-workflow', '设计流程', '设计规范、素材与审稿流程协作', 310),
  ('product-research', '需求研究', '需求调研与竞品分析协作', 320),
  ('customer-support', '客户支持', '客服知识库与响应协同', 330),
  ('qa-review', '质检复核', '页面与流程质量检查', 340),
  ('docs-sync', '文档同步', '文档与知识库同步维护', 350),
  ('release-watch', '发布追踪', '版本发布和变更跟踪', 360);

INSERT INTO uied_mcp_tag
  (name, slug, description, sort_order, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, 0, @now, @now
FROM tmp_mcp_business_tag t
LEFT JOIN uied_mcp_tag tag ON tag.slug = t.slug AND tag.is_delete = 0
WHERE tag.id IS NULL;

UPDATE uied_mcp_tag tag
INNER JOIN tmp_mcp_business_tag t ON t.slug = tag.slug
SET
  tag.name = t.name,
  tag.description = t.description,
  tag.sort_order = t.sort_order,
  tag.is_delete = 0,
  tag.update_time = @now;

-- =========================
-- 3) 条目扩展
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_business_item;
CREATE TEMPORARY TABLE tmp_mcp_business_item (
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

INSERT INTO tmp_mcp_business_item
  (slug, name, category_slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, status, is_recommended, sort_order, publish_offset, seo_title, seo_keywords, seo_description)
VALUES
  ('cn-design-asset-hub-mcp', '设计素材中台 MCP', 'cn-design', '统一管理设计素材与组件文档，适合品牌与运营协作。', '基于 Filesystem MCP Server 的场景化封装，适合设计素材目录化、版本归档与跨团队共享。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', 'stdio', 'node', '2024-11-05', 'published', 1, 610, 1800, '设计素材中台 MCP', 'MCP,设计流程,素材管理,设计协作', '设计素材中台 MCP，适合设计团队素材与文档统一管理。'),
  ('cn-design-review-check-mcp', '设计稿质检 MCP', 'cn-design', '自动巡检设计稿交互与页面流程，减少上线前风险。', '基于 Playwright MCP Server 的质检能力，支持关键交互流程回归与异常截图留存。', 'https://github.com/microsoft/playwright-mcp', 'https://github.com/microsoft/playwright-mcp', 'https://github.com/microsoft/playwright-mcp', 'sse', 'node', '2024-11-05', 'published', 1, 620, 2100, '设计稿质检 MCP', 'MCP,质检复核,设计评审,自动化', '设计稿质检 MCP，适合活动页和落地页发布前自动巡检。'),
  ('cn-design-trend-search-mcp', '设计趋势检索 MCP', 'cn-design', '快速检索设计趋势与竞品灵感，服务选题与视觉方向。', '基于 Brave Search MCP Server 的联网检索能力，支持关键词趋势研究与灵感收集。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', 'http', 'node', '2024-11-05', 'published', 1, 630, 2400, '设计趋势检索 MCP', 'MCP,设计流程,趋势研究,搜索', '设计趋势检索 MCP，帮助设计团队快速完成灵感研究。'),
  ('cn-product-prd-memory-mcp', '需求知识记忆 MCP', 'cn-product', '沉淀 PRD 与版本决策上下文，提升需求协作效率。', '基于 Memory MCP Server 的长期记忆能力，可用于需求迭代记录与评审决策追踪。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory', 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory', 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory', 'stdio', 'node', '2024-11-05', 'published', 1, 640, 2700, '需求知识记忆 MCP', 'MCP,产品研发,需求研究,知识库', '需求知识记忆 MCP，适合产品与研发团队沉淀需求上下文。'),
  ('cn-product-release-board-mcp', '版本发布看板 MCP', 'cn-product', '打通研发仓库与发布节奏，统一展示版本推进状态。', '基于 GitHub MCP Server 的协作能力，可跟踪 issue、PR 与发布节点。', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'http', 'other', '2024-11-05', 'published', 1, 650, 3000, '版本发布看板 MCP', 'MCP,产品研发,发布追踪,GitHub', '版本发布看板 MCP，适合研发与产品共同追踪版本状态。'),
  ('cn-product-data-insight-mcp', '产品数据洞察 MCP', 'cn-product', '面向核心指标复盘与产品分析，支持结构化查询。', '基于 PostgreSQL MCP Server 的数据访问能力，适合看板分析与需求验证。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', 'stdio', 'node', '2024-11-05', 'published', 1, 660, 3300, '产品数据洞察 MCP', 'MCP,产品研发,数据库,数据分析', '产品数据洞察 MCP，帮助团队快速完成指标分析与需求验证。'),
  ('cn-service-faq-fetch-mcp', '客服知识检索 MCP', 'cn-service', '聚合 FAQ 与帮助文档，提高客服响应速度。', '基于 Fetch MCP Server 的文档抓取能力，可搭建客服知识检索与更新流程。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', 'http', 'node', '2024-11-05', 'published', 1, 670, 3600, '客服知识检索 MCP', 'MCP,客户支持,知识库,FAQ', '客服知识检索 MCP，适合构建客服 FAQ 与知识库系统。'),
  ('cn-service-ticket-collab-mcp', '客服工单协同 MCP', 'cn-service', '把工单通知与协作消息打通，减少跨组沟通成本。', '基于 Slack MCP Server 的协作通知能力，可用于工单升级与值班通知流程。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', 'http', 'node', '2024-11-05', 'published', 1, 680, 3900, '客服工单协同 MCP', 'MCP,客户支持,协作办公,工单', '客服工单协同 MCP，适合客服团队多角色协同响应。'),
  ('cn-service-quality-audit-mcp', '服务质量审计 MCP', 'cn-service', '自动记录服务指标并输出复盘报表，支持服务质量持续优化。', '基于 SQLite MCP Server 的轻量数据存储能力，可快速沉淀质检数据与复盘报告。', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', 'stdio', 'node', '2024-11-05', 'published', 1, 690, 4200, '服务质量审计 MCP', 'MCP,客户支持,质检复核,报表分析', '服务质量审计 MCP，适合客服团队持续监控服务质量。'),
  ('cn-service-release-watch-mcp', '客服发布追踪 MCP', 'cn-service', '在发布窗口同步客服与运营响应策略，减少版本切换风险。', '基于 GitHub MCP Server 的变更追踪能力，帮助客服团队提前准备话术与应答。', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', 'http', 'other', '2024-11-05', 'published', 1, 700, 4500, '客服发布追踪 MCP', 'MCP,客户支持,发布追踪,运营协同', '客服发布追踪 MCP，适合客服团队跟踪版本变更并提前响应。');

INSERT INTO uied_mcp_item
  (name, slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, category_id, status, is_recommended, sort_order, publish_time, click_count, view_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.summary, t.content,
  NULLIF(t.official_url, ''), NULLIF(t.docs_url, ''), NULLIF(t.github_url, ''),
  t.transport_type, t.runtime, t.protocol_version, c.id,
  t.status, t.is_recommended, t.sort_order, @now - t.publish_offset,
  0, 0, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_business_item t
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
LEFT JOIN uied_mcp_item i ON i.slug = t.slug AND i.is_delete = 0
WHERE i.id IS NULL;

UPDATE uied_mcp_item i
INNER JOIN tmp_mcp_business_item t ON t.slug = i.slug
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
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_business_item_tag;
CREATE TEMPORARY TABLE tmp_mcp_business_item_tag (
  item_slug varchar(191) NOT NULL,
  tag_slug varchar(120) NOT NULL,
  PRIMARY KEY (item_slug, tag_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_business_item_tag (item_slug, tag_slug) VALUES
  ('cn-design-asset-hub-mcp', 'cn-scene'),
  ('cn-design-asset-hub-mcp', 'design-workflow'),
  ('cn-design-asset-hub-mcp', 'docs-sync'),
  ('cn-design-asset-hub-mcp', 'filesystem'),
  ('cn-design-review-check-mcp', 'cn-scene'),
  ('cn-design-review-check-mcp', 'design-workflow'),
  ('cn-design-review-check-mcp', 'qa-review'),
  ('cn-design-review-check-mcp', 'automation'),
  ('cn-design-trend-search-mcp', 'cn-scene'),
  ('cn-design-trend-search-mcp', 'design-workflow'),
  ('cn-design-trend-search-mcp', 'product-research'),
  ('cn-design-trend-search-mcp', 'search'),
  ('cn-product-prd-memory-mcp', 'cn-scene'),
  ('cn-product-prd-memory-mcp', 'product-research'),
  ('cn-product-prd-memory-mcp', 'docs-sync'),
  ('cn-product-release-board-mcp', 'cn-scene'),
  ('cn-product-release-board-mcp', 'product-research'),
  ('cn-product-release-board-mcp', 'release-watch'),
  ('cn-product-release-board-mcp', 'github'),
  ('cn-product-data-insight-mcp', 'cn-scene'),
  ('cn-product-data-insight-mcp', 'product-research'),
  ('cn-product-data-insight-mcp', 'report-analysis'),
  ('cn-product-data-insight-mcp', 'database'),
  ('cn-service-faq-fetch-mcp', 'cn-scene'),
  ('cn-service-faq-fetch-mcp', 'customer-support'),
  ('cn-service-faq-fetch-mcp', 'docs-sync'),
  ('cn-service-ticket-collab-mcp', 'cn-scene'),
  ('cn-service-ticket-collab-mcp', 'customer-support'),
  ('cn-service-ticket-collab-mcp', 'collaboration'),
  ('cn-service-quality-audit-mcp', 'cn-scene'),
  ('cn-service-quality-audit-mcp', 'customer-support'),
  ('cn-service-quality-audit-mcp', 'qa-review'),
  ('cn-service-quality-audit-mcp', 'report-analysis'),
  ('cn-service-release-watch-mcp', 'cn-scene'),
  ('cn-service-release-watch-mcp', 'customer-support'),
  ('cn-service-release-watch-mcp', 'release-watch'),
  ('cn-service-release-watch-mcp', 'github');

INSERT INTO uied_mcp_item_tag (item_id, tag_id, is_delete, create_time, update_time)
SELECT
  i.id, t.id, 0, @now, @now
FROM tmp_mcp_business_item_tag m
INNER JOIN uied_mcp_item i ON i.slug = m.item_slug AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.slug = m.tag_slug AND t.is_delete = 0
LEFT JOIN uied_mcp_item_tag rel ON rel.item_id = i.id AND rel.tag_id = t.id
WHERE rel.id IS NULL;

UPDATE uied_mcp_item_tag rel
INNER JOIN uied_mcp_item i ON i.id = rel.item_id AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
INNER JOIN tmp_mcp_business_item_tag m ON m.item_slug = i.slug AND m.tag_slug = t.slug
SET
  rel.is_delete = 0,
  rel.update_time = @now;

COMMIT;

