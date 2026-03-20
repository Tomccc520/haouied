-- ============================================
-- UIED 数据库种子：MCP 中文场景扩展包（可重复执行）
-- 目标：
-- 1) 补充“办公/电商/运营”三类中文场景分类
-- 2) 增加中文场景标签
-- 3) 增加可直接演示的中文名称 MCP 条目（来源均为开源项目链接）
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;
SET @now := UNIX_TIMESTAMP();

-- =========================
-- 1) 场景分类
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_cn_category;
CREATE TEMPORARY TABLE tmp_mcp_cn_category (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(1000) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  seo_title varchar(191) DEFAULT NULL,
  seo_keywords varchar(500) DEFAULT NULL,
  seo_description varchar(1000) DEFAULT NULL,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_cn_category
  (slug, name, description, sort_order, seo_title, seo_keywords, seo_description)
VALUES
  ('cn-office', '办公协同', '面向团队办公、知识管理与协作通知的 MCP 场景。', 110, '办公协同 MCP 场景', 'MCP,办公协同,团队效率', '办公协同类 MCP 场景集合，适合知识库与通知协作。'),
  ('cn-ecommerce', '电商运营', '面向商品管理、数据看板与增长分析的 MCP 场景。', 120, '电商运营 MCP 场景', 'MCP,电商运营,数据分析', '电商运营类 MCP 场景集合，适合商品与运营分析。'),
  ('cn-operations', '运营增长', '面向内容运营、自动化巡检与发布协作的 MCP 场景。', 130, '运营增长 MCP 场景', 'MCP,运营增长,自动化', '运营增长类 MCP 场景集合，适合增长团队和运营同学。');

INSERT INTO uied_mcp_category
  (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_cn_category t
LEFT JOIN uied_mcp_category c ON c.slug = t.slug AND c.is_delete = 0
WHERE c.id IS NULL;

UPDATE uied_mcp_category c
INNER JOIN tmp_mcp_cn_category t ON t.slug = c.slug
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
-- 2) 场景标签
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_cn_tag;
CREATE TEMPORARY TABLE tmp_mcp_cn_tag (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(500) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_cn_tag
  (slug, name, description, sort_order)
VALUES
  ('cn-scene', '中文场景', '中文命名与本地化业务场景条目', 210),
  ('office-collab', '办公协同', '办公流转、知识协作与通知', 220),
  ('ecommerce-ops', '电商运营', '商品、订单与经营分析', 230),
  ('operations-growth', '运营增长', '内容增长与运营流程优化', 240),
  ('report-analysis', '报表分析', '数据看板与报表分析能力', 250),
  ('auto-testing', '自动巡检', '流程自动化与自动测试', 260),
  ('release-collab', '发布协作', '研发与运营协作发布', 270),
  ('market-research', '市场研究', '市场与竞品信息检索', 280);

INSERT INTO uied_mcp_tag
  (name, slug, description, sort_order, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, 0, @now, @now
FROM tmp_mcp_cn_tag t
LEFT JOIN uied_mcp_tag tag ON tag.slug = t.slug AND tag.is_delete = 0
WHERE tag.id IS NULL;

UPDATE uied_mcp_tag tag
INNER JOIN tmp_mcp_cn_tag t ON t.slug = tag.slug
SET
  tag.name = t.name,
  tag.description = t.description,
  tag.sort_order = t.sort_order,
  tag.is_delete = 0,
  tag.update_time = @now;

-- =========================
-- 3) 中文场景条目
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_cn_item;
CREATE TEMPORARY TABLE tmp_mcp_cn_item (
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

INSERT INTO tmp_mcp_cn_item
  (slug, name, category_slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, status, is_recommended, sort_order, publish_offset, seo_title, seo_keywords, seo_description)
VALUES
  (
    'cn-office-knowledge-hub-mcp',
    '办公知识库助手 MCP',
    'cn-office',
    '面向团队知识库维护与文档整理的 MCP 场景，适合 SOP 和资料归档。',
    '适用场景：团队文档归档、知识库同步、资料检索。\n来源：Filesystem MCP Server（开源）\n建议搭配：GitHub MCP + Slack MCP，形成“文档维护 + 研发同步 + 通知”闭环。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    210,
    3600,
    '办公知识库助手 MCP 场景',
    'MCP,办公协同,知识库,文档管理',
    '办公知识库助手 MCP，适合团队文档归档与知识管理。'
  ),
  (
    'cn-office-notice-bot-mcp',
    '团队通知协作 MCP',
    'cn-office',
    '面向团队通知广播和任务同步的 MCP 场景，适合运营和项目协同。',
    '适用场景：日报推送、审批通知、项目提醒。\n来源：Slack MCP Server（开源）\n可按需替换为企业内部 IM 网关实现本地化对接。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    220,
    3900,
    '团队通知协作 MCP 场景',
    'MCP,办公协同,通知机器人,协作',
    '团队通知协作 MCP，适合项目通知与任务同步。'
  ),
  (
    'cn-ecommerce-product-archive-mcp',
    '商品素材归档 MCP',
    'cn-ecommerce',
    '面向商品图文素材管理的 MCP 场景，适合运营素材库标准化。',
    '适用场景：商品图文归档、素材目录化、版本管理。\n来源：Filesystem MCP Server（开源）\n常用于电商活动周期中的素材治理。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    230,
    4200,
    '商品素材归档 MCP 场景',
    'MCP,电商运营,素材管理,商品运营',
    '商品素材归档 MCP，帮助电商团队管理商品素材。'
  ),
  (
    'cn-ecommerce-report-mcp',
    '店铺报表分析 MCP',
    'cn-ecommerce',
    '面向经营数据读取与日报分析的 MCP 场景，适合日常运营复盘。',
    '适用场景：经营日报、活动复盘、销量趋势分析。\n来源：SQLite MCP Server（开源）\n可快速接入本地经营数据快照进行分析。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    240,
    4500,
    '店铺报表分析 MCP 场景',
    'MCP,电商运营,报表分析,数据看板',
    '店铺报表分析 MCP，适合电商运营团队的经营复盘。'
  ),
  (
    'cn-ecommerce-trend-insight-mcp',
    '电商趋势洞察 MCP',
    'cn-ecommerce',
    '面向竞品与市场信息检索的 MCP 场景，适合活动选题与货盘决策。',
    '适用场景：竞品检索、关键词洞察、市场趋势扫描。\n来源：Brave Search MCP Server（开源）\n建议在后台配置检索词模板，提高运营效率。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    250,
    4800,
    '电商趋势洞察 MCP 场景',
    'MCP,电商运营,市场研究,竞品分析',
    '电商趋势洞察 MCP，帮助运营团队进行市场与竞品分析。'
  ),
  (
    'cn-ops-content-research-mcp',
    '内容选题研究 MCP',
    'cn-operations',
    '面向内容团队的选题检索与资料收集场景，适合内容生产前置调研。',
    '适用场景：选题调研、资料收集、观点对比。\n来源：Fetch MCP Server（开源）\n与知识库助手结合可形成完整内容产研链路。',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    260,
    5100,
    '内容选题研究 MCP 场景',
    'MCP,运营增长,内容运营,选题研究',
    '内容选题研究 MCP，适合内容团队做选题调研。'
  ),
  (
    'cn-ops-auto-regression-mcp',
    '活动页自动巡检 MCP',
    'cn-operations',
    '面向活动页和落地页的自动化巡检场景，减少上线风险。',
    '适用场景：活动页巡检、功能回归、链接可用性检查。\n来源：Playwright MCP Server（开源）\n可在上线前自动执行页面流程核查。',
    'https://github.com/microsoft/playwright-mcp',
    'https://github.com/microsoft/playwright-mcp',
    'https://github.com/microsoft/playwright-mcp',
    'sse',
    'node',
    '2024-11-05',
    'published',
    1,
    270,
    5400,
    '活动页自动巡检 MCP 场景',
    'MCP,运营增长,自动巡检,活动运营',
    '活动页自动巡检 MCP，适合上线前自动检测流程。'
  ),
  (
    'cn-ops-release-collab-mcp',
    '发布协同跟踪 MCP',
    'cn-operations',
    '面向研发与运营联合发布场景，统一追踪任务和变更。',
    '适用场景：发布清单跟踪、变更记录、跨团队协作。\n来源：GitHub MCP Server（开源）\n适用于技术团队与运营团队共同协作发布。',
    'https://github.com/github/github-mcp-server',
    'https://github.com/github/github-mcp-server',
    'https://github.com/github/github-mcp-server',
    'http',
    'other',
    '2024-11-05',
    'published',
    1,
    280,
    5700,
    '发布协同跟踪 MCP 场景',
    'MCP,运营增长,发布协作,研发协同',
    '发布协同跟踪 MCP，适合研发与运营团队协作发布。'
  );

INSERT INTO uied_mcp_item
  (name, slug, summary, content, official_url, docs_url, github_url, transport_type, runtime, protocol_version, category_id, status, is_recommended, sort_order, publish_time, click_count, view_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.summary, t.content,
  NULLIF(t.official_url, ''), NULLIF(t.docs_url, ''), NULLIF(t.github_url, ''),
  t.transport_type, t.runtime, t.protocol_version, c.id,
  t.status, t.is_recommended, t.sort_order, @now - t.publish_offset,
  0, 0, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_cn_item t
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
LEFT JOIN uied_mcp_item i ON i.slug = t.slug AND i.is_delete = 0
WHERE i.id IS NULL;

UPDATE uied_mcp_item i
INNER JOIN tmp_mcp_cn_item t ON t.slug = i.slug
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
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_cn_item_tag;
CREATE TEMPORARY TABLE tmp_mcp_cn_item_tag (
  item_slug varchar(191) NOT NULL,
  tag_slug varchar(120) NOT NULL,
  PRIMARY KEY (item_slug, tag_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_cn_item_tag (item_slug, tag_slug) VALUES
  ('cn-office-knowledge-hub-mcp', 'cn-scene'),
  ('cn-office-knowledge-hub-mcp', 'office-collab'),
  ('cn-office-knowledge-hub-mcp', 'productivity'),

  ('cn-office-notice-bot-mcp', 'cn-scene'),
  ('cn-office-notice-bot-mcp', 'office-collab'),
  ('cn-office-notice-bot-mcp', 'collaboration'),

  ('cn-ecommerce-product-archive-mcp', 'cn-scene'),
  ('cn-ecommerce-product-archive-mcp', 'ecommerce-ops'),
  ('cn-ecommerce-product-archive-mcp', 'operations-growth'),

  ('cn-ecommerce-report-mcp', 'cn-scene'),
  ('cn-ecommerce-report-mcp', 'ecommerce-ops'),
  ('cn-ecommerce-report-mcp', 'report-analysis'),
  ('cn-ecommerce-report-mcp', 'database'),

  ('cn-ecommerce-trend-insight-mcp', 'cn-scene'),
  ('cn-ecommerce-trend-insight-mcp', 'ecommerce-ops'),
  ('cn-ecommerce-trend-insight-mcp', 'market-research'),
  ('cn-ecommerce-trend-insight-mcp', 'search'),

  ('cn-ops-content-research-mcp', 'cn-scene'),
  ('cn-ops-content-research-mcp', 'operations-growth'),
  ('cn-ops-content-research-mcp', 'market-research'),

  ('cn-ops-auto-regression-mcp', 'cn-scene'),
  ('cn-ops-auto-regression-mcp', 'operations-growth'),
  ('cn-ops-auto-regression-mcp', 'auto-testing'),
  ('cn-ops-auto-regression-mcp', 'automation'),

  ('cn-ops-release-collab-mcp', 'cn-scene'),
  ('cn-ops-release-collab-mcp', 'operations-growth'),
  ('cn-ops-release-collab-mcp', 'release-collab'),
  ('cn-ops-release-collab-mcp', 'github');

INSERT INTO uied_mcp_item_tag (item_id, tag_id, is_delete, create_time, update_time)
SELECT
  i.id, t.id, 0, @now, @now
FROM tmp_mcp_cn_item_tag m
INNER JOIN uied_mcp_item i ON i.slug = m.item_slug AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.slug = m.tag_slug AND t.is_delete = 0
LEFT JOIN uied_mcp_item_tag rel ON rel.item_id = i.id AND rel.tag_id = t.id
WHERE rel.id IS NULL;

UPDATE uied_mcp_item_tag rel
INNER JOIN uied_mcp_item i ON i.id = rel.item_id AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
INNER JOIN tmp_mcp_cn_item_tag m ON m.item_slug = i.slug AND m.tag_slug = t.slug
SET
  rel.is_delete = 0,
  rel.update_time = @now;

COMMIT;

