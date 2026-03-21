SET NAMES utf8mb4;

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
  'Auto Layout Toolkit', 'auto-layout-toolkit',
  '快速整理约束与自动布局的效率插件，适合组件库与页面规范化。',
  '适用于页面结构整理、组件重排、约束批量修正，降低设计稿维护成本。',
  '', '',
  'https://www.figma.com/community/plugin/1222147529187481312/auto-layout-toolkit',
  'https://www.figma.com/community/plugin/1222147529187481312/auto-layout-toolkit',
  '', '1222147529187481312', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='essentials' AND is_delete=0 LIMIT 1),
  'published', 1, 10, UNIX_TIMESTAMP() - 3600,
  0, 0, 23140, 4200,
  'Auto Layout Toolkit - Figma效率插件',
  'figma插件,自动布局,设计系统,组件库',
  '用于快速处理自动布局与约束关系的 Figma 插件，适合日常设计协作。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Quick Rename Pro', 'quick-rename-pro',
  '批量命名图层与组件，支持规则替换与前后缀处理。',
  '帮助团队统一命名规范，减少交付前人工检查成本。',
  '', '',
  'https://www.figma.com/community/plugin/1034969338659738588/quick-rename-pro',
  'https://www.figma.com/community/plugin/1034969338659738588/quick-rename-pro',
  '', '1034969338659738588', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='essentials' AND is_delete=0 LIMIT 1),
  'published', 0, 20, UNIX_TIMESTAMP() - 7200,
  0, 0, 18450, 3300,
  'Quick Rename Pro - Figma图层命名插件',
  'figma插件,图层命名,批量重命名,设计交付',
  '支持批量重命名、规则替换和命名前后缀处理的 Figma 插件。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Illustration Scene Builder', 'illustration-scene-builder',
  '插画场景拼装插件，快速组合人物、物件与背景层。',
  '适合落地页和产品介绍页视觉设计，提升插画制作效率。',
  '', '',
  'https://www.figma.com/community/plugin/1076672674946653703/illustration-scene-builder',
  'https://www.figma.com/community/plugin/1076672674946653703/illustration-scene-builder',
  '', '1076672674946653703', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='illustration' AND is_delete=0 LIMIT 1),
  'published', 0, 30, UNIX_TIMESTAMP() - 10800,
  0, 0, 9520, 2180,
  'Illustration Scene Builder - Figma插画插件',
  'figma插件,插画,场景设计,视觉设计',
  '用于快速拼装插画场景与视觉元素的 Figma 插件。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Character Pose Pack', 'character-pose-pack',
  '人物姿态与动作组件库，一键拖拽到画板使用。',
  '提供多种人物动作模板，适合产品演示和运营海报。',
  '', '',
  'https://www.figma.com/community/plugin/1094308120302962248/character-pose-pack',
  'https://www.figma.com/community/plugin/1094308120302962248/character-pose-pack',
  '', '1094308120302962248', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='illustration' AND is_delete=0 LIMIT 1),
  'published', 0, 40, UNIX_TIMESTAMP() - 14400,
  0, 0, 8012, 1902,
  'Character Pose Pack - Figma人物插画插件',
  'figma插件,人物插画,姿态模板,运营设计',
  '内置人物姿态组件，支持快速组合插画画面。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Mockup Studio', 'mockup-studio',
  '常用设备与品牌载体样机插件，支持快速替换截图。',
  '适合 App 预览、品牌展示和社媒素材制作场景。',
  '', '',
  'https://www.figma.com/community/plugin/1015796562359761431/mockup-studio',
  'https://www.figma.com/community/plugin/1015796562359761431/mockup-studio',
  '', '1015796562359761431', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='mockup' AND is_delete=0 LIMIT 1),
  'published', 1, 50, UNIX_TIMESTAMP() - 18000,
  0, 0, 22310, 5180,
  'Mockup Studio - Figma样机插件',
  'figma插件,样机,展示图,设计交付',
  '提供多种样机模板，支持快速替换截图并导出展示图。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Poster Mockup Frame', 'poster-mockup-frame',
  '海报与画框样机工具，适合活动页和电商场景快速出图。',
  '可批量应用海报到真实场景，节省物料展示时间。',
  '', '',
  'https://www.figma.com/community/plugin/1133335203177332101/poster-mockup-frame',
  'https://www.figma.com/community/plugin/1133335203177332101/poster-mockup-frame',
  '', '1133335203177332101', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='mockup' AND is_delete=0 LIMIT 1),
  'published', 0, 60, UNIX_TIMESTAMP() - 21600,
  0, 0, 6320, 1290,
  'Poster Mockup Frame - Figma海报样机插件',
  'figma插件,海报样机,电商设计,活动视觉',
  '提供海报样机容器，适合活动页和电商素材制作。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Layout Grid Master', 'layout-grid-master',
  '快速建立多列网格和间距体系，适合大屏与官网布局。',
  '支持自定义断点和栅格模板，提高响应式设计效率。',
  '', '',
  'https://www.figma.com/community/plugin/1095074225669892341/layout-grid-master',
  'https://www.figma.com/community/plugin/1095074225669892341/layout-grid-master',
  '', '1095074225669892341', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='layout' AND is_delete=0 LIMIT 1),
  'published', 0, 70, UNIX_TIMESTAMP() - 25200,
  0, 0, 9240, 1800,
  'Layout Grid Master - Figma布局插件',
  'figma插件,布局,栅格,响应式设计',
  '用于快速配置栅格与间距规则的 Figma 布局插件。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Section Divider Kit', 'section-divider-kit',
  '页面区块分割与留白模板，快速生成视觉层级。',
  '适合官网和专题页，能快速形成清晰的模块分区。',
  '', '',
  'https://www.figma.com/community/plugin/1117303688433277014/section-divider-kit',
  'https://www.figma.com/community/plugin/1117303688433277014/section-divider-kit',
  '', '1117303688433277014', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='layout' AND is_delete=0 LIMIT 1),
  'published', 0, 80, UNIX_TIMESTAMP() - 28800,
  0, 0, 5030, 990,
  'Section Divider Kit - Figma分区布局插件',
  'figma插件,页面布局,分区设计,专题页',
  '帮助搭建页面分区和留白节奏，提升整体版式质量。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  '3D Device Mockups', '3d-device-mockups',
  '3D 设备模型与透视展示插件，适合产品截图演示。',
  '内置 3D 角度和设备模板，便于快速输出视觉稿。',
  '', '',
  'https://www.figma.com/community/plugin/1172350098814583366/3d-device-mockups',
  'https://www.figma.com/community/plugin/1172350098814583366/3d-device-mockups',
  '', '1172350098814583366', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='3d' AND is_delete=0 LIMIT 1),
  'published', 0, 90, UNIX_TIMESTAMP() - 32400,
  0, 0, 12480, 2520,
  '3D Device Mockups - Figma 3D样机插件',
  'figma插件,3D,设备样机,产品展示',
  '为产品设计提供 3D 设备场景与透视展示能力。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  '3D Icon Generator', '3d-icon-generator',
  '快速生成拟物 3D 图标，支持主色与材质参数调整。',
  '适用于运营活动页和产品落地页的视觉强化。',
  '', '',
  'https://www.figma.com/community/plugin/1113622661692829804/3d-icon-generator',
  'https://www.figma.com/community/plugin/1113622661692829804/3d-icon-generator',
  '', '1113622661692829804', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='3d' AND is_delete=0 LIMIT 1),
  'published', 0, 100, UNIX_TIMESTAMP() - 36000,
  0, 0, 6720, 1490,
  '3D Icon Generator - Figma 3D图标插件',
  'figma插件,3D图标,拟物图标,视觉设计',
  '用于生成 3D 图标和拟物视觉元素的 Figma 插件。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Design Token Sync', 'design-token-sync',
  '设计变量与 Token 同步插件，支持团队协作管理。',
  '适合设计系统项目，统一颜色、字号、间距等规范。',
  '', '',
  'https://www.figma.com/community/plugin/112233445566778899/design-token-sync',
  'https://www.figma.com/community/plugin/112233445566778899/design-token-sync',
  '', '112233445566778899', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='design-system' AND is_delete=0 LIMIT 1),
  'published', 1, 110, UNIX_TIMESTAMP() - 39600,
  0, 0, 14220, 2980,
  'Design Token Sync - Figma设计系统插件',
  'figma插件,设计系统,token,变量管理',
  '帮助团队同步设计 Token，保障系统化设计一致性。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Component Audit', 'component-audit',
  '组件一致性审查插件，检测命名、样式和变体缺失。',
  '适合设计系统治理与交付质检流程，提升规范执行率。',
  '', '',
  'https://www.figma.com/community/plugin/109999777666555444/component-audit',
  'https://www.figma.com/community/plugin/109999777666555444/component-audit',
  '', '109999777666555444', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='design-system' AND is_delete=0 LIMIT 1),
  'published', 0, 120, UNIX_TIMESTAMP() - 43200,
  0, 0, 7210, 1360,
  'Component Audit - Figma组件审查插件',
  'figma插件,组件库,设计系统,质量检查',
  '帮助检查组件命名和样式一致性，提升系统稳定性。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Prototype Flow Helper', 'prototype-flow-helper',
  '原型流程批量连线与命名插件，适合复杂业务流设计。',
  '可快速构建页面跳转关系并统一原型节点命名。',
  '', '',
  'https://www.figma.com/community/plugin/1164215352089931055/prototype-flow-helper',
  'https://www.figma.com/community/plugin/1164215352089931055/prototype-flow-helper',
  '', '1164215352089931055', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='prototype' AND is_delete=0 LIMIT 1),
  'published', 0, 130, UNIX_TIMESTAMP() - 46800,
  0, 0, 9820, 2050,
  'Prototype Flow Helper - Figma原型流程插件',
  'figma插件,原型,流程图,交互设计',
  '用于快速整理原型流程和页面跳转关系。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Interactive Preview Modes', 'interactive-preview-modes',
  '原型演示模式预设，快速切换展示与录屏场景。',
  '提升评审和客户演示效率，减少手工配置时间。',
  '', '',
  'https://www.figma.com/community/plugin/1195520409884202405/interactive-preview-modes',
  'https://www.figma.com/community/plugin/1195520409884202405/interactive-preview-modes',
  '', '1195520409884202405', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='prototype' AND is_delete=0 LIMIT 1),
  'published', 0, 140, UNIX_TIMESTAMP() - 50400,
  0, 0, 5420, 980,
  'Interactive Preview Modes - Figma原型演示插件',
  'figma插件,原型演示,交互预览,评审',
  '用于原型演示模式切换和展示优化的 Figma 插件。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Handoff Spec Exporter', 'handoff-spec-exporter',
  '一键导出交付标注与切图说明，降低研发沟通成本。',
  '适合前后端协作场景，提升交付效率与准确性。',
  '', '',
  'https://www.figma.com/community/plugin/1087554072816501092/handoff-spec-exporter',
  'https://www.figma.com/community/plugin/1087554072816501092/handoff-spec-exporter',
  '', '1087554072816501092', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='handoff' AND is_delete=0 LIMIT 1),
  'published', 0, 150, UNIX_TIMESTAMP() - 54000,
  0, 0, 12020, 2310,
  'Handoff Spec Exporter - Figma交付插件',
  'figma插件,交付标注,前端切图,研发协作',
  '用于导出交付标注与设计规格，方便研发落地。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Design QA Checklist', 'design-qa-checklist',
  '内置设计交付检查清单，支持团队复核流程。',
  '帮助团队在交付前快速检查尺寸、颜色、命名和状态。',
  '', '',
  'https://www.figma.com/community/plugin/1130203901120023112/design-qa-checklist',
  'https://www.figma.com/community/plugin/1130203901120023112/design-qa-checklist',
  '', '1130203901120023112', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='handoff' AND is_delete=0 LIMIT 1),
  'published', 0, 160, UNIX_TIMESTAMP() - 57600,
  0, 0, 6410, 1380,
  'Design QA Checklist - Figma交付质检插件',
  'figma插件,设计质检,交付流程,团队协作',
  '通过检查清单帮助团队完成交付前质检。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'SVG Sprite Builder', 'svg-sprite-builder',
  '批量整理 SVG 图标并生成统一命名规范。',
  '适合图标系统维护和前端资产管理场景。',
  '', '',
  'https://www.figma.com/community/plugin/1100099120010099222/svg-sprite-builder',
  'https://www.figma.com/community/plugin/1100099120010099222/svg-sprite-builder',
  '', '1100099120010099222', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='svg' AND is_delete=0 LIMIT 1),
  'published', 0, 170, UNIX_TIMESTAMP() - 61200,
  0, 0, 10100, 1900,
  'SVG Sprite Builder - Figma SVG插件',
  'figma插件,svg,图标,前端资源',
  '帮助整理 SVG 图标并输出标准化资源。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'SVG to React Export', 'svg-to-react-export',
  '将 SVG 组件导出为 React 代码模板，减少手工转换。',
  '支持常用属性和命名映射，提升前端协作效率。',
  '', '',
  'https://www.figma.com/community/plugin/1187711230045521200/svg-to-react-export',
  'https://www.figma.com/community/plugin/1187711230045521200/svg-to-react-export',
  '', '1187711230045521200', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='svg' AND is_delete=0 LIMIT 1),
  'published', 0, 180, UNIX_TIMESTAMP() - 64800,
  0, 0, 5890, 1120,
  'SVG to React Export - Figma前端导出插件',
  'figma插件,svg,react,前端协作',
  '将 SVG 资产快速导出为 React 组件代码。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();

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
  'Typography Scale Manager', 'typography-scale-manager',
  '快速生成字号层级和文本样式变量。',
  '适合设计系统和内容型页面，统一排版节奏。',
  '', '',
  'https://www.figma.com/community/plugin/1102142009221001003/typography-scale-manager',
  'https://www.figma.com/community/plugin/1102142009221001003/typography-scale-manager',
  '', '1102142009221001003', 'Figma Community',
  'http', 'other', '',
  (SELECT id FROM uied_figma_plugin_category WHERE slug='typography' AND is_delete=0 LIMIT 1),
  'published', 0, 190, UNIX_TIMESTAMP() - 68400,
  0, 0, 8800, 1690,
  'Typography Scale Manager - Figma排版插件',
  'figma插件,排版,字号体系,设计规范',
  '用于建立文字样式层级与排版体系。',
  'manual_import', 'https://www.figma.com/community/plugins', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM dual
ON DUPLICATE KEY UPDATE
  summary=VALUES(summary), content=VALUES(content), official_url=VALUES(official_url),
  docs_url=VALUES(docs_url), category_id=VALUES(category_id), status='published',
  seo_title=VALUES(seo_title), seo_keywords=VALUES(seo_keywords), seo_description=VALUES(seo_description),
  update_time=UNIX_TIMESTAMP();
