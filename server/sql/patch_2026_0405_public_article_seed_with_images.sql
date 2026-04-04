-- ============================================
-- 前台文章测试数据补图与新增示例
-- 目标：
-- 1) 补齐历史 seed 文章封面与正文图片
-- 2) 新增几篇可直接用于前台联调的图文文章
-- 3) 可重复执行，不重复插入
-- ============================================

SET @now_ts = UNIX_TIMESTAMP();

-- 1) 兜底分类
INSERT INTO `uied_article_category` (`name`, `slug`, `description`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'Design', 'design', 'Design related articles', 10, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_category` WHERE `slug` = 'design' AND `is_delete` = 0);

INSERT INTO `uied_article_category` (`name`, `slug`, `description`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'AI', 'ai', 'AI related articles', 20, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_category` WHERE `slug` = 'ai' AND `is_delete` = 0);

INSERT INTO `uied_article_category` (`name`, `slug`, `description`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'Tools', 'tools', 'Tooling and productivity', 30, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_category` WHERE `slug` = 'tools' AND `is_delete` = 0);

-- 2) 兜底标签
INSERT INTO `uied_article_tag` (`name`, `slug`, `color`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'UI', 'ui', '#3B82F6', 10, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_tag` WHERE `slug` = 'ui' AND `is_delete` = 0);

INSERT INTO `uied_article_tag` (`name`, `slug`, `color`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'UX', 'ux', '#10B981', 20, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_tag` WHERE `slug` = 'ux' AND `is_delete` = 0);

INSERT INTO `uied_article_tag` (`name`, `slug`, `color`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'AI', 'ai', '#8B5CF6', 30, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_tag` WHERE `slug` = 'ai' AND `is_delete` = 0);

INSERT INTO `uied_article_tag` (`name`, `slug`, `color`, `sort_order`, `is_delete`, `create_time`, `update_time`, `createdAt`, `updatedAt`)
SELECT 'Productivity', 'productivity', '#F59E0B', 40, 0, @now_ts, @now_ts, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article_tag` WHERE `slug` = 'productivity' AND `is_delete` = 0);

-- 3) 更新历史 seed 文章：补齐封面和正文图片
UPDATE `uied_article`
SET
  `excerpt` = '一篇适合测试前台详情页的示例文章，包含封面图、正文图片、锚点结构与标签信息。',
  `cover_image` = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
  `content` = '<h2>UI 资源导航内容页的标准测试结构</h2><p>这篇示例文章用于验证文章列表封面、详情大图、正文排版与评论区布局。</p><p><img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80" alt="UI 资源导航内容页测试图" /></p><h3>为什么需要带图测试数据</h3><p>只有同时具备封面图和正文内图，才能完整验证文章详情页的阅读节奏与视觉层次。</p><blockquote>你可以直接用这篇文章检查首页文章模块、文章列表页和详情页是否一致。</blockquote>',
  `seo_title` = 'UI 资源导航内容页测试结构',
  `seo_description` = '用于验证封面图、正文图片、目录锚点和详情页阅读体验的示例文章。',
  `update_time` = @now_ts
WHERE `slug` = 'seed-ui-curation-workflow' AND `is_delete` = 0;

UPDATE `uied_article`
SET
  `excerpt` = '这篇文章用于验证 AI 分类下的文章卡片、详情头图和正文图文混排效果。',
  `cover_image` = 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1600&q=80',
  `content` = '<h2>AI 设计研究类文章如何做前台验证</h2><p>测试文章不应该只是几段文字，至少要覆盖封面、摘要、正文图片、标签和相关推荐。</p><p><img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80" alt="AI 设计研究测试图" /></p><h3>适合验证的页面模块</h3><ul><li>文章列表图文卡片</li><li>文章详情顶部信息区</li><li>正文图片和引用区块</li></ul><blockquote>如果这篇文章显示正常，基本就能确认文章频道的主要图文样式已经打通。</blockquote>',
  `seo_title` = 'AI 设计研究类文章测试示例',
  `seo_description` = '用于验证 AI 分类下图文卡片、文章封面、正文图片与相关推荐布局的示例文章。',
  `update_time` = @now_ts
WHERE `slug` = 'seed-ai-design-research' AND `is_delete` = 0;

UPDATE `uied_article`
SET
  `excerpt` = '把效率工具类内容做成有图有结构的测试文章，便于联调文章详情页和运营模块。',
  `cover_image` = 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80',
  `content` = '<h2>效率工具文章页的测试重点</h2><p>这篇文章适合用来验证封面图、正文图片、目录锚点、标签和关联网址模块。</p><p><img src="https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1600&q=80" alt="效率工具文章测试图" /></p><h3>推荐检查动作</h3><p>刷新首页文章模块、进入详情页、切移动端宽度查看图片比例与段落间距是否正常。</p><blockquote>没有图片的测试文章只能测通路，有图片的测试文章才能测视觉完成度。</blockquote>',
  `seo_title` = '效率工具文章页测试重点',
  `seo_description` = '用于验证效率工具类文章封面、正文图片、目录锚点与运营模块展示效果。',
  `update_time` = @now_ts
WHERE `slug` = 'seed-tool-stack-daily-creative' AND `is_delete` = 0;

-- 4) 新增几篇带封面和正文图的测试文章
INSERT INTO `uied_article`
(`old_id`, `title`, `content`, `excerpt`, `cover_image`, `author`, `category`, `slug`, `status`, `view_count`, `seo_title`, `seo_description`, `published_at`, `is_delete`, `create_time`, `update_time`, `delete_time`)
SELECT
  '',
  '文章详情页图片布局回归测试',
  '<h2>文章详情页图片布局回归测试</h2><p>这篇文章用于验证详情页封面、正文大图和区块间距是否稳定。</p><p><img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80" alt="文章详情页图片布局回归测试图" /></p><h3>建议检查</h3><p>重点查看正文图片是否溢出、引用区块是否清晰、相关推荐与评论区是否衔接自然。</p><blockquote>如果图片比例和段落间距都正常，说明文章页视觉链路基本稳定。</blockquote>',
  '用于验证封面图、正文图片、引用样式和相关推荐是否正常的一篇前台测试文章。',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  'UIED编辑部',
  'Design',
  'article-image-layout-regression-demo',
  'published',
  126,
  '文章详情页图片布局回归测试',
  '用于验证文章详情页封面、正文图片、引用与推荐区布局的前台测试文章。',
  @now_ts - 60,
  0,
  @now_ts - 60,
  @now_ts - 60,
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article` WHERE `slug` = 'article-image-layout-regression-demo' AND `is_delete` = 0);

INSERT INTO `uied_article`
(`old_id`, `title`, `content`, `excerpt`, `cover_image`, `author`, `category`, `slug`, `status`, `view_count`, `seo_title`, `seo_description`, `published_at`, `is_delete`, `create_time`, `update_time`, `delete_time`)
SELECT
  '',
  '设计导航首页文章模块联调示例',
  '<h2>设计导航首页文章模块联调示例</h2><p>首页文章模块如果要显示得更完整，至少需要封面图、摘要、标签和可读的正文节奏。</p><p><img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&q=80" alt="首页文章模块联调示例图" /></p><h3>这篇文章能测什么</h3><ul><li>首页文章模块封面比例</li><li>文章列表摘要长度</li><li>详情页首图和正文图片衔接</li></ul><blockquote>这是一篇典型的站内文章测试数据，适合反复回归验证。</blockquote>',
  '用于测试首页文章模块和详情页视觉衔接的图文示例文章。',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
  '内容运营组',
  'Design',
  'design-home-article-module-demo',
  'published',
  98,
  '设计导航首页文章模块联调示例',
  '用于测试首页文章模块封面比例、摘要长度和详情页图文衔接的示例文章。',
  @now_ts - 120,
  0,
  @now_ts - 120,
  @now_ts - 120,
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article` WHERE `slug` = 'design-home-article-module-demo' AND `is_delete` = 0);

INSERT INTO `uied_article`
(`old_id`, `title`, `content`, `excerpt`, `cover_image`, `author`, `category`, `slug`, `status`, `view_count`, `seo_title`, `seo_description`, `published_at`, `is_delete`, `create_time`, `update_time`, `delete_time`)
SELECT
  '',
  'AI 文章频道图文测试样例',
  '<h2>AI 文章频道图文测试样例</h2><p>AI 文章除了封面图，更需要在正文里放一张可感知的示意图，才能看出详情页是否有阅读层次。</p><p><img src="https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=1600&q=80" alt="AI 文章频道图文测试样例" /></p><h3>测试重点</h3><p>检查 AI 分类筛选、详情首图、正文内图、标签显示和 SEO 信息是否完整。</p><blockquote>这类文章特别适合验证文章封面图和分类切换是否同步正常。</blockquote>',
  '用于测试 AI 频道图文内容展示和详情页排版的一篇示例文章。',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=80',
  'Tomda',
  'AI',
  'ai-channel-graphic-content-demo',
  'published',
  87,
  'AI 文章频道图文测试样例',
  '用于测试 AI 频道图文内容展示、详情页排版和 SEO 信息的一篇示例文章。',
  @now_ts - 180,
  0,
  @now_ts - 180,
  @now_ts - 180,
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article` WHERE `slug` = 'ai-channel-graphic-content-demo' AND `is_delete` = 0);

INSERT INTO `uied_article`
(`old_id`, `title`, `content`, `excerpt`, `cover_image`, `author`, `category`, `slug`, `status`, `view_count`, `seo_title`, `seo_description`, `published_at`, `is_delete`, `create_time`, `update_time`, `delete_time`)
SELECT
  '',
  '效率工具文章封面图测试案例',
  '<h2>效率工具文章封面图测试案例</h2><p>这篇文章用于检查工具类文章在首页、列表页和详情页里是否都能正确显示图片。</p><p><img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80" alt="效率工具文章封面图测试案例" /></p><h3>为什么要单独做这类数据</h3><p>因为工具类文章往往更依赖视觉封面，没有图片就很难判断模块是否完成。</p><blockquote>推荐用它测试首页设计文章区和文章详情页的封面一致性。</blockquote>',
  '用于测试工具类文章封面图、正文图片和列表模块显示的一篇示例文章。',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
  '内容运营组',
  'Tools',
  'tool-article-cover-visual-demo',
  'published',
  73,
  '效率工具文章封面图测试案例',
  '用于测试工具类文章封面图、正文图片和列表模块视觉表现的一篇示例文章。',
  @now_ts - 240,
  0,
  @now_ts - 240,
  @now_ts - 240,
  0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `uied_article` WHERE `slug` = 'tool-article-cover-visual-demo' AND `is_delete` = 0);

-- 5) 标签关联
INSERT INTO `uied_article_tag_relation` (`article_id`, `tag_id`, `create_time`, `createdAt`, `updatedAt`)
SELECT a.id, t.id, @now_ts, NOW(), NOW()
FROM `uied_article` a
INNER JOIN `uied_article_tag` t ON t.slug IN ('ui', 'ux')
WHERE a.slug = 'article-image-layout-regression-demo'
  AND NOT EXISTS (
    SELECT 1 FROM `uied_article_tag_relation` r
    WHERE r.article_id = a.id AND r.tag_id = t.id
  );

INSERT INTO `uied_article_tag_relation` (`article_id`, `tag_id`, `create_time`, `createdAt`, `updatedAt`)
SELECT a.id, t.id, @now_ts, NOW(), NOW()
FROM `uied_article` a
INNER JOIN `uied_article_tag` t ON t.slug IN ('ui', 'productivity')
WHERE a.slug = 'design-home-article-module-demo'
  AND NOT EXISTS (
    SELECT 1 FROM `uied_article_tag_relation` r
    WHERE r.article_id = a.id AND r.tag_id = t.id
  );

INSERT INTO `uied_article_tag_relation` (`article_id`, `tag_id`, `create_time`, `createdAt`, `updatedAt`)
SELECT a.id, t.id, @now_ts, NOW(), NOW()
FROM `uied_article` a
INNER JOIN `uied_article_tag` t ON t.slug IN ('ai', 'ux')
WHERE a.slug = 'ai-channel-graphic-content-demo'
  AND NOT EXISTS (
    SELECT 1 FROM `uied_article_tag_relation` r
    WHERE r.article_id = a.id AND r.tag_id = t.id
  );

INSERT INTO `uied_article_tag_relation` (`article_id`, `tag_id`, `create_time`, `createdAt`, `updatedAt`)
SELECT a.id, t.id, @now_ts, NOW(), NOW()
FROM `uied_article` a
INNER JOIN `uied_article_tag` t ON t.slug IN ('productivity', 'ui')
WHERE a.slug = 'tool-article-cover-visual-demo'
  AND NOT EXISTS (
    SELECT 1 FROM `uied_article_tag_relation` r
    WHERE r.article_id = a.id AND r.tag_id = t.id
  );
