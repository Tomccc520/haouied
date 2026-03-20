-- ============================================
-- UIED 数据库种子：开源 MCP 示例数据（可重复执行）
-- 适用库：uied_nav / uied_ainav（MySQL 5.6+）
-- 说明：
-- 1) 导入 MCP 分类、标签、条目与关联
-- 2) 按 slug 幂等更新，不会重复插入
-- 3) 可直接用于前台 /mcp 与后台 MCP中心 演示
-- ============================================

SET NAMES utf8mb4;
START TRANSACTION;
SET @now := UNIX_TIMESTAMP();

-- =========================
-- 1) 分类种子
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_seed_category;
CREATE TEMPORARY TABLE tmp_mcp_seed_category (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(1000) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  seo_title varchar(191) DEFAULT NULL,
  seo_keywords varchar(500) DEFAULT NULL,
  seo_description varchar(1000) DEFAULT NULL,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_seed_category
  (slug, name, description, sort_order, seo_title, seo_keywords, seo_description)
VALUES
  ('official-core', '官方核心', 'MCP 官方参考与核心能力，适合快速搭建基础连接能力。', 10, '官方核心 MCP', 'MCP,官方,核心服务器', 'MCP 官方核心服务器集合，覆盖文件、网络、记忆等基础能力。'),
  ('dev-tools', '开发工具', '面向开发与代码协作场景的 MCP 服务。', 20, '开发工具 MCP', 'MCP,开发工具,GitHub', '聚焦研发工作流的 MCP 服务，如 GitHub 与代码自动化能力。'),
  ('data-integration', '数据集成', '连接数据库与外部数据源的 MCP 服务。', 30, '数据集成 MCP', 'MCP,数据库,数据连接', '用于数据库与数据源集成的 MCP 服务集合。'),
  ('browser-automation', '浏览器自动化', '浏览器控制、抓取、自动化测试相关 MCP 服务。', 40, '浏览器自动化 MCP', 'MCP,浏览器自动化,Playwright', '用于网页自动化与浏览器交互的 MCP 服务。'),
  ('collaboration', '协作办公', '团队协作与办公系统接入相关 MCP 服务。', 50, '协作办公 MCP', 'MCP,协作,Slack', '面向团队协作和办公场景的 MCP 服务。');

INSERT INTO uied_mcp_category
  (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, t.seo_title, t.seo_keywords, t.seo_description, 0, @now, @now
FROM tmp_mcp_seed_category t
LEFT JOIN uied_mcp_category c
  ON c.slug = t.slug AND c.is_delete = 0
WHERE c.id IS NULL;

UPDATE uied_mcp_category c
INNER JOIN tmp_mcp_seed_category t ON t.slug = c.slug
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
-- 2) 标签种子
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_seed_tag;
CREATE TEMPORARY TABLE tmp_mcp_seed_tag (
  slug varchar(120) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(500) DEFAULT NULL,
  sort_order int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_seed_tag
  (slug, name, description, sort_order)
VALUES
  ('official', '官方', '官方发布或官方维护项目', 10),
  ('open-source', '开源', '开源社区可访问项目', 20),
  ('nodejs', 'Node.js', 'Node.js 运行时', 30),
  ('database', '数据库', '数据库连接与查询能力', 40),
  ('filesystem', '文件系统', '本地文件读写能力', 50),
  ('github', 'GitHub', 'GitHub 协作能力', 60),
  ('search', '搜索', '联网检索与搜索能力', 70),
  ('browser', '浏览器', '浏览器自动化能力', 80),
  ('automation', '自动化', '自动化工作流能力', 90),
  ('collaboration', '协作', '团队协作系统接入', 100),
  ('api', 'API', '外部 API 调用能力', 110),
  ('productivity', '效率', '效率类能力集合', 120);

INSERT INTO uied_mcp_tag
  (name, slug, description, sort_order, is_delete, create_time, update_time)
SELECT
  t.name, t.slug, t.description, t.sort_order, 0, @now, @now
FROM tmp_mcp_seed_tag t
LEFT JOIN uied_mcp_tag tag
  ON tag.slug = t.slug AND tag.is_delete = 0
WHERE tag.id IS NULL;

UPDATE uied_mcp_tag tag
INNER JOIN tmp_mcp_seed_tag t ON t.slug = tag.slug
SET
  tag.name = t.name,
  tag.description = t.description,
  tag.sort_order = t.sort_order,
  tag.is_delete = 0,
  tag.update_time = @now;

-- =========================
-- 3) 条目种子
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_seed_item;
CREATE TEMPORARY TABLE tmp_mcp_seed_item (
  slug varchar(191) NOT NULL,
  name varchar(191) NOT NULL,
  category_slug varchar(120) NOT NULL,
  summary text,
  content longtext,
  icon_url varchar(500) DEFAULT NULL,
  cover_url varchar(500) DEFAULT NULL,
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

INSERT INTO tmp_mcp_seed_item
  (slug, name, category_slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url, transport_type, runtime, protocol_version, status, is_recommended, sort_order, publish_offset, seo_title, seo_keywords, seo_description)
VALUES
  (
    'filesystem-mcp',
    'Filesystem MCP Server',
    'official-core',
    '提供文件与目录读写能力，适合知识库、文档处理、代码工程扫描等场景。',
    'Filesystem MCP Server 是 MCP 官方常用参考服务，提供本地文件系统访问能力，可用于读取、写入、列目录与批量处理文件内容。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    10,
    0,
    'Filesystem MCP Server 开源接入',
    'filesystem,mcp,文件系统,开源',
    'Filesystem MCP Server 开源接入示例，支持本地文件读写和目录管理。'
  ),
  (
    'fetch-mcp',
    'Fetch MCP Server',
    'official-core',
    '提供 URL 抓取与网页内容获取能力，适合联网页面读取与内容提取。',
    'Fetch MCP Server 用于通过 MCP 协议抓取外部网页内容，常用于搜索增强、资料获取与自动化摘要生成。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    20,
    300,
    'Fetch MCP Server 开源接入',
    'fetch,mcp,网页抓取,开源',
    'Fetch MCP Server 开源接入示例，提供网页内容抓取能力。'
  ),
  (
    'git-mcp',
    'Git MCP Server',
    'dev-tools',
    '连接本地 Git 仓库能力，支持分支、提交与版本信息读取。',
    'Git MCP Server 适用于代码仓库的自动化分析与版本变更理解，可用于研发辅助场景。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    30,
    600,
    'Git MCP Server 开源接入',
    'git,mcp,代码仓库,开发工具',
    'Git MCP Server 开源接入示例，支持 Git 仓库读取与分析。'
  ),
  (
    'memory-mcp',
    'Memory MCP Server',
    'official-core',
    '提供结构化记忆能力，支持会话外信息存储与回读。',
    'Memory MCP Server 支持在 MCP 工作流中维护长期记忆，适合多轮任务与上下文管理场景。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    40,
    900,
    'Memory MCP Server 开源接入',
    'memory,mcp,记忆,上下文',
    'Memory MCP Server 开源接入示例，支持多轮任务记忆。'
  ),
  (
    'sqlite-mcp',
    'SQLite MCP Server',
    'data-integration',
    '连接 SQLite 数据库，支持查询与结果读取。',
    'SQLite MCP Server 适合本地轻量数据库读写场景，常用于原型项目和本地知识数据处理。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    50,
    1200,
    'SQLite MCP Server 开源接入',
    'sqlite,mcp,数据库,sql',
    'SQLite MCP Server 开源接入示例，支持轻量数据库访问。'
  ),
  (
    'postgres-mcp',
    'PostgreSQL MCP Server',
    'data-integration',
    '连接 PostgreSQL 数据库并执行结构化查询。',
    'PostgreSQL MCP Server 提供标准数据库查询能力，可用于报表、运营分析和数据检索场景。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    60,
    1500,
    'PostgreSQL MCP Server 开源接入',
    'postgres,mcp,数据库,sql',
    'PostgreSQL MCP Server 开源接入示例，支持 PostgreSQL 查询。'
  ),
  (
    'github-mcp',
    'GitHub MCP Server',
    'dev-tools',
    '连接 GitHub 仓库、Issue、PR 等研发协作对象。',
    'GitHub MCP Server 用于将 GitHub 研发流程接入 MCP，适合代码审查、Issue 检索和 PR 协作。',
    '',
    '',
    'https://github.com/github/github-mcp-server',
    'https://github.com/github/github-mcp-server',
    'https://github.com/github/github-mcp-server',
    'http',
    'other',
    '2024-11-05',
    'published',
    1,
    70,
    1800,
    'GitHub MCP Server 开源接入',
    'github,mcp,开发协作,开源',
    'GitHub MCP Server 开源接入示例，支持代码协作流程连接。'
  ),
  (
    'playwright-mcp',
    'Playwright MCP Server',
    'browser-automation',
    '提供浏览器自动化与页面交互能力，适合测试与流程自动化。',
    'Playwright MCP Server 可驱动浏览器进行页面访问、元素操作与流程回放，常用于测试和自动化任务。',
    '',
    '',
    'https://github.com/microsoft/playwright-mcp',
    'https://github.com/microsoft/playwright-mcp',
    'https://github.com/microsoft/playwright-mcp',
    'sse',
    'node',
    '2024-11-05',
    'published',
    1,
    80,
    2100,
    'Playwright MCP Server 开源接入',
    'playwright,mcp,浏览器自动化,测试',
    'Playwright MCP Server 开源接入示例，支持浏览器自动化流程。'
  ),
  (
    'brave-search-mcp',
    'Brave Search MCP Server',
    'data-integration',
    '接入 Brave Search 搜索能力，支持联网检索与结果读取。',
    'Brave Search MCP Server 适用于需要联网实时信息检索的 MCP 场景，可作为搜索能力扩展。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    90,
    2400,
    'Brave Search MCP Server 开源接入',
    'brave search,mcp,联网检索,搜索',
    'Brave Search MCP Server 开源接入示例，提供联网搜索能力。'
  ),
  (
    'slack-mcp',
    'Slack MCP Server',
    'collaboration',
    '连接 Slack 会话与消息能力，适用于团队协作场景。',
    'Slack MCP Server 用于对接团队沟通平台，可用于自动摘要、消息检索和协作流程触发。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    'http',
    'node',
    '2024-11-05',
    'published',
    1,
    100,
    2700,
    'Slack MCP Server 开源接入',
    'slack,mcp,协作,办公',
    'Slack MCP Server 开源接入示例，支持团队消息协作。'
  ),
  (
    'everything-mcp',
    'Everything MCP Server',
    'official-core',
    '官方综合示例服务器，覆盖多种工具调用模式。',
    'Everything MCP Server 常用于演示和快速验证 MCP 客户端能力，适合作为入门参考样例。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    110,
    3000,
    'Everything MCP Server 开源接入',
    'everything,mcp,官方示例,开源',
    'Everything MCP Server 开源接入示例，便于快速体验 MCP 能力。'
  ),
  (
    'time-mcp',
    'Time MCP Server',
    'official-core',
    '提供时区与时间相关能力，适合计划、调度、日志时间处理。',
    'Time MCP Server 提供标准时间查询和时区转换能力，可用于跨时区任务处理。',
    '',
    '',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    'stdio',
    'node',
    '2024-11-05',
    'published',
    1,
    120,
    3300,
    'Time MCP Server 开源接入',
    'time,mcp,时区,时间处理',
    'Time MCP Server 开源接入示例，支持时间和时区能力。'
  );

INSERT INTO uied_mcp_item
  (name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url, transport_type, runtime, protocol_version, category_id, status, is_recommended, sort_order, publish_time, click_count, view_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
SELECT
  t.name,
  t.slug,
  t.summary,
  t.content,
  NULLIF(t.icon_url, ''),
  NULLIF(t.cover_url, ''),
  NULLIF(t.official_url, ''),
  NULLIF(t.docs_url, ''),
  NULLIF(t.github_url, ''),
  t.transport_type,
  t.runtime,
  t.protocol_version,
  c.id,
  t.status,
  t.is_recommended,
  t.sort_order,
  @now - t.publish_offset,
  0,
  0,
  t.seo_title,
  t.seo_keywords,
  t.seo_description,
  0,
  @now,
  @now
FROM tmp_mcp_seed_item t
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
LEFT JOIN uied_mcp_item i ON i.slug = t.slug AND i.is_delete = 0
WHERE i.id IS NULL;

UPDATE uied_mcp_item i
INNER JOIN tmp_mcp_seed_item t ON t.slug = i.slug
INNER JOIN uied_mcp_category c ON c.slug = t.category_slug AND c.is_delete = 0
SET
  i.name = t.name,
  i.summary = t.summary,
  i.content = t.content,
  i.icon_url = NULLIF(t.icon_url, ''),
  i.cover_url = NULLIF(t.cover_url, ''),
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
-- 4) 标签关联种子
-- =========================
DROP TEMPORARY TABLE IF EXISTS tmp_mcp_seed_item_tag;
CREATE TEMPORARY TABLE tmp_mcp_seed_item_tag (
  item_slug varchar(191) NOT NULL,
  tag_slug varchar(120) NOT NULL,
  PRIMARY KEY (item_slug, tag_slug)
) ENGINE=Memory DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_mcp_seed_item_tag (item_slug, tag_slug) VALUES
  ('filesystem-mcp', 'official'),
  ('filesystem-mcp', 'open-source'),
  ('filesystem-mcp', 'nodejs'),
  ('filesystem-mcp', 'filesystem'),
  ('filesystem-mcp', 'productivity'),

  ('fetch-mcp', 'official'),
  ('fetch-mcp', 'open-source'),
  ('fetch-mcp', 'nodejs'),
  ('fetch-mcp', 'search'),
  ('fetch-mcp', 'api'),

  ('git-mcp', 'official'),
  ('git-mcp', 'open-source'),
  ('git-mcp', 'nodejs'),
  ('git-mcp', 'automation'),

  ('memory-mcp', 'official'),
  ('memory-mcp', 'open-source'),
  ('memory-mcp', 'nodejs'),
  ('memory-mcp', 'productivity'),

  ('sqlite-mcp', 'official'),
  ('sqlite-mcp', 'open-source'),
  ('sqlite-mcp', 'nodejs'),
  ('sqlite-mcp', 'database'),

  ('postgres-mcp', 'official'),
  ('postgres-mcp', 'open-source'),
  ('postgres-mcp', 'nodejs'),
  ('postgres-mcp', 'database'),

  ('github-mcp', 'open-source'),
  ('github-mcp', 'github'),
  ('github-mcp', 'api'),
  ('github-mcp', 'automation'),

  ('playwright-mcp', 'open-source'),
  ('playwright-mcp', 'nodejs'),
  ('playwright-mcp', 'browser'),
  ('playwright-mcp', 'automation'),

  ('brave-search-mcp', 'official'),
  ('brave-search-mcp', 'open-source'),
  ('brave-search-mcp', 'search'),
  ('brave-search-mcp', 'api'),

  ('slack-mcp', 'official'),
  ('slack-mcp', 'open-source'),
  ('slack-mcp', 'collaboration'),
  ('slack-mcp', 'api'),

  ('everything-mcp', 'official'),
  ('everything-mcp', 'open-source'),
  ('everything-mcp', 'nodejs'),
  ('everything-mcp', 'productivity'),

  ('time-mcp', 'official'),
  ('time-mcp', 'open-source'),
  ('time-mcp', 'nodejs'),
  ('time-mcp', 'productivity');

INSERT INTO uied_mcp_item_tag (item_id, tag_id, is_delete, create_time, update_time)
SELECT
  i.id,
  t.id,
  0,
  @now,
  @now
FROM tmp_mcp_seed_item_tag map
INNER JOIN uied_mcp_item i ON i.slug = map.item_slug AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.slug = map.tag_slug AND t.is_delete = 0
LEFT JOIN uied_mcp_item_tag rel
  ON rel.item_id = i.id AND rel.tag_id = t.id
WHERE rel.id IS NULL;

UPDATE uied_mcp_item_tag rel
INNER JOIN uied_mcp_item i ON i.id = rel.item_id AND i.is_delete = 0
INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
INNER JOIN tmp_mcp_seed_item_tag map ON map.item_slug = i.slug AND map.tag_slug = t.slug
SET
  rel.is_delete = 0,
  rel.update_time = @now;

COMMIT;
