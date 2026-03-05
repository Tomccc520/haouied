/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('../server/node_modules/mysql2/promise');
const parser = require('../../frontend/node_modules/@babel/parser');
const traverse = require('../../frontend/node_modules/@babel/traverse').default;
const t = require('../../frontend/node_modules/@babel/types');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ICONS_FILE = path.resolve(PROJECT_ROOT, 'frontend/src/components/UI/Icons/index.tsx');
const SIDEBAR_FILE = path.resolve(PROJECT_ROOT, 'frontend/src/components/CategorySidebar/index.tsx');
const LOCAL_CONFIG_FILE = path.resolve(PROJECT_ROOT, 'server/server/config/config.local.js');
const ADMIN_LOCAL_ICON_DIR = path.resolve(PROJECT_ROOT, 'server/admin/src/assets/icons');
const SVG_PREFIX = 'uied_';

/**
 * 读取本地数据库配置（沿用 egg 的 config.local.js）。
 */
const loadDbConfig = () => {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const localConfigFactory = require(LOCAL_CONFIG_FILE);
    const localConfig = localConfigFactory({ name: 'uied-nav' }) || {};
    const sequelize = localConfig.sequelize || {};
    return {
        host: sequelize.host || '127.0.0.1',
        port: Number(sequelize.port || 3306),
        user: sequelize.username || 'root',
        password: sequelize.password || '',
        database: sequelize.database || 'uied_nav'
    };
};

/**
 * 将 JSX 属性名转换为 SVG 标准属性名。
 */
const normalizeSvgAttrName = (name) => {
    const map = {
        className: 'class',
        strokeWidth: 'stroke-width',
        strokeLinecap: 'stroke-linecap',
        strokeLinejoin: 'stroke-linejoin',
        strokeMiterlimit: 'stroke-miterlimit',
        strokeDasharray: 'stroke-dasharray',
        strokeDashoffset: 'stroke-dashoffset',
        fillRule: 'fill-rule',
        clipRule: 'clip-rule',
        stopColor: 'stop-color',
        stopOpacity: 'stop-opacity',
        fontFamily: 'font-family',
        fontSize: 'font-size',
        textAnchor: 'text-anchor',
        dominantBaseline: 'dominant-baseline',
        xlinkHref: 'xlink:href',
        xmlnsXlink: 'xmlns:xlink'
    };
    return map[name] || name;
};

/**
 * 对文本做 HTML attribute 转义。
 */
const escapeAttr = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/**
 * 提取 JSXName 字段（兼容命名空间和成员访问）。
 */
const getJsxName = (node) => {
    if (!node) return '';
    if (t.isJSXIdentifier(node)) return node.name;
    if (t.isJSXNamespacedName(node)) {
        return `${getJsxName(node.namespace)}:${getJsxName(node.name)}`;
    }
    if (t.isJSXMemberExpression(node)) {
        return `${getJsxName(node.object)}.${getJsxName(node.property)}`;
    }
    return '';
};

/**
 * 将简单 JSX 表达式解析为静态值（仅处理图标组件所需场景）。
 */
const evaluateJsxExpression = (expr) => {
    if (!expr) return '';
    if (t.isStringLiteral(expr)) return expr.value;
    if (t.isNumericLiteral(expr)) return String(expr.value);
    if (t.isBooleanLiteral(expr)) return expr.value;
    if (t.isIdentifier(expr)) {
        if (expr.name === 'size') return '24';
        if (expr.name === 'color') return 'currentColor';
        if ([ 'className', 'style', 'DEFAULT_ICON_SIZE' ].includes(expr.name)) return '';
        return '';
    }
    if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
        return expr.quasis.map(item => item.value.cooked || '').join('');
    }
    return '';
};

/**
 * 将 JSXAttribute 序列化为 HTML 属性字符串。
 */
const serializeJsxAttribute = (attr) => {
    if (!t.isJSXAttribute(attr)) return '';
    const rawName = getJsxName(attr.name);
    const name = normalizeSvgAttrName(rawName);
    if (!name || [ 'class', 'style', 'key' ].includes(name)) return '';
    if (!attr.value) return name;
    if (t.isStringLiteral(attr.value)) {
        return `${name}="${escapeAttr(attr.value.value)}"`;
    }
    if (t.isJSXExpressionContainer(attr.value)) {
        const value = evaluateJsxExpression(attr.value.expression);
        if (value === '' || value === undefined || value === null) return '';
        if (typeof value === 'boolean') {
            return value ? name : '';
        }
        return `${name}="${escapeAttr(String(value))}"`;
    }
    return '';
};

/**
 * 将 JSX 子节点序列化为字符串。
 */
const serializeJsxChild = (child) => {
    if (t.isJSXText(child)) return child.value;
    if (t.isJSXElement(child)) return serializeJsxElement(child);
    if (t.isJSXExpressionContainer(child)) {
        const value = evaluateJsxExpression(child.expression);
        return typeof value === 'string' ? value : '';
    }
    return '';
};

/**
 * 将 JSXElement 序列化为 SVG 字符串。
 */
const serializeJsxElement = (node) => {
    const tagName = getJsxName(node.openingElement.name);
    if (!tagName) return '';
    const attrs = node.openingElement.attributes
        .map(serializeJsxAttribute)
        .filter(Boolean)
        .join(' ');
    const attrPart = attrs ? ` ${attrs}` : '';
    if (node.openingElement.selfClosing) {
        return `<${tagName}${attrPart} />`;
    }
    const children = node.children.map(serializeJsxChild).join('');
    return `<${tagName}${attrPart}>${children}</${tagName}>`;
};

/**
 * 从函数体中提取 JSX 返回值。
 */
const extractReturnedJsx = (body) => {
    if (!body) return null;
    if (t.isJSXElement(body)) return body;
    if (t.isParenthesizedExpression(body) && t.isJSXElement(body.expression)) return body.expression;
    if (t.isBlockStatement(body)) {
        for (const stmt of body.body) {
            if (!t.isReturnStatement(stmt) || !stmt.argument) continue;
            if (t.isJSXElement(stmt.argument)) return stmt.argument;
            if (t.isParenthesizedExpression(stmt.argument) && t.isJSXElement(stmt.argument.expression)) {
                return stmt.argument.expression;
            }
        }
    }
    return null;
};

/**
 * 解析前端图标源码：提取 Icon 组件 SVG、别名、DesignIcons 映射。
 */
const parseFrontendIcons = () => {
    const code = fs.readFileSync(ICONS_FILE, 'utf8');
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [ 'typescript', 'jsx' ]
    });

    const componentSvgMap = new Map();
    const aliasMap = new Map();
    const designIconsMap = new Map();

    traverse(ast, {
        ExportNamedDeclaration(pathRef) {
            const declaration = pathRef.node.declaration;
            if (!t.isVariableDeclaration(declaration)) return;
            for (const declarator of declaration.declarations) {
                if (!t.isIdentifier(declarator.id)) continue;
                const exportName = declarator.id.name;
                const init = declarator.init;
                if (!init) continue;

                if (
                    (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) &&
                    exportName.startsWith('Icon')
                ) {
                    const jsxNode = extractReturnedJsx(init.body);
                    if (!jsxNode) continue;
                    const svgString = serializeJsxElement(jsxNode)
                        .replace(/\s+/g, ' ')
                        .replace(/>\s+</g, '><')
                        .trim();
                    if (svgString.startsWith('<svg')) {
                        componentSvgMap.set(exportName, svgString);
                    }
                    continue;
                }

                if (exportName.startsWith('Icon') && t.isIdentifier(init)) {
                    aliasMap.set(exportName, init.name);
                    continue;
                }

                if (exportName === 'DesignIcons' && t.isObjectExpression(init)) {
                    for (const prop of init.properties) {
                        if (!t.isObjectProperty(prop)) continue;
                        const key = t.isIdentifier(prop.key)
                            ? prop.key.name
                            : t.isStringLiteral(prop.key)
                              ? prop.key.value
                              : '';
                        if (!key) continue;
                        if (t.isIdentifier(prop.value)) {
                            designIconsMap.set(key, prop.value.name);
                        }
                    }
                }
            }
        }
    });

    return { componentSvgMap, aliasMap, designIconsMap };
};

/**
 * 递归解析 Icon 别名，最终定位到可序列化的组件名。
 */
const resolveIconComponentName = (name, aliasMap, componentSvgMap, loopGuard = 0) => {
    if (!name || loopGuard > 20) return '';
    if (componentSvgMap.has(name)) return name;
    if (!aliasMap.has(name)) return '';
    const next = aliasMap.get(name) || '';
    if (!next || next === name) return '';
    return resolveIconComponentName(next, aliasMap, componentSvgMap, loopGuard + 1);
};

/**
 * 将对象属性值表达式映射为 Icon 组件名。
 */
const resolveComponentNameFromExpression = (expr, designIconsMap, aliasMap, componentSvgMap) => {
    if (!expr) return '';
    if (t.isIdentifier(expr)) {
        return resolveIconComponentName(expr.name, aliasMap, componentSvgMap);
    }
    if (
        t.isMemberExpression(expr) &&
        !expr.computed &&
        t.isIdentifier(expr.object) &&
        expr.object.name === 'DesignIcons' &&
        t.isIdentifier(expr.property)
    ) {
        const mapped = designIconsMap.get(expr.property.name) || '';
        return resolveIconComponentName(mapped, aliasMap, componentSvgMap);
    }
    if (t.isLogicalExpression(expr)) {
        return (
            resolveComponentNameFromExpression(expr.left, designIconsMap, aliasMap, componentSvgMap) ||
            resolveComponentNameFromExpression(expr.right, designIconsMap, aliasMap, componentSvgMap)
        );
    }
    return '';
};

/**
 * 解析 CategorySidebar 里的 defaultIconMap，得到 icon-key -> 组件名映射。
 */
const parseSidebarDefaultIconMap = ({ designIconsMap, aliasMap, componentSvgMap }) => {
    const code = fs.readFileSync(SIDEBAR_FILE, 'utf8');
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [ 'typescript', 'jsx' ]
    });

    const result = new Map();

    traverse(ast, {
        VariableDeclarator(pathRef) {
            if (!t.isIdentifier(pathRef.node.id) || pathRef.node.id.name !== 'defaultIconMap') return;
            if (!t.isObjectExpression(pathRef.node.init)) return;
            for (const prop of pathRef.node.init.properties) {
                if (!t.isObjectProperty(prop)) continue;
                const key = t.isIdentifier(prop.key)
                    ? prop.key.name
                    : t.isStringLiteral(prop.key)
                      ? prop.key.value
                      : '';
                if (!key) continue;
                const componentName = resolveComponentNameFromExpression(
                    prop.value,
                    designIconsMap,
                    aliasMap,
                    componentSvgMap
                );
                if (!componentName) continue;
                result.set(key, componentName);
            }
        }
    });

    return result;
};

/**
 * 标准化 icon key，用于生成 svg 库 key。
 */
const normalizeIconKey = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^svg:/, '')
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
};

/**
 * 生成 svg:key（统一加 uied_ 前缀）。
 */
const buildSvgTokenFromIconKey = (iconKey) => {
    const normalized = normalizeIconKey(iconKey) || 'default';
    return `svg:${SVG_PREFIX}${normalized}`.slice(0, 100);
};

/**
 * 生成图标库 key（不带 svg:）。
 */
const buildSvgLibraryKey = (iconKey) => {
    const normalized = normalizeIconKey(iconKey) || 'default';
    return `${SVG_PREFIX}${normalized}`.slice(0, 40);
};

/**
 * 解析 local-icon 名称，并尝试定位对应 SVG 文件。
 */
const resolveLocalIconSvg = (rawIcon) => {
    const matched = String(rawIcon || '').trim().match(/^local-icon-([a-zA-Z0-9_-]+)$/);
    if (!matched) return null;
    const iconName = String(matched[1] || '').trim();
    if (!iconName) return null;
    const svgPath = path.resolve(ADMIN_LOCAL_ICON_DIR, `${iconName}.svg`);
    if (!fs.existsSync(svgPath)) return null;
    const svgText = sanitizeSvgMarkup(fs.readFileSync(svgPath, 'utf8'));
    if (!svgText) return null;
    const key = buildSvgLibraryKey(`local_${iconName}`);
    return {
        key,
        token: `svg:${key}`,
        label: `local-${iconName}`,
        svg: svgText
    };
};

/**
 * 兼容前端 normalizeLegacyIconName 的关键字映射规则。
 */
const normalizeLegacyIconKey = (rawIcon, availableIconKeys) => {
    const raw = String(rawIcon || '').trim();
    if (!raw) return '';
    if (availableIconKeys.has(raw)) return raw;
    const lowerRaw = raw.toLowerCase();
    if (availableIconKeys.has(lowerRaw)) return lowerRaw;
    const compact = lowerRaw
        .replace(/^el-icon-/, '')
        .replace(/^local-icon-/, '')
        .replace(/[_\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .trim();
    if (!compact) return '';
    if (availableIconKeys.has(compact)) return compact;

    const aliasRules = [
        [/(cpu|monitor|data|histogram|trend|pie|rank|chart|analysis)/, 'analytics'],
        [/(camera|photo|picture|image)/, 'image'],
        [/(video|film|movie|clapperboard)/, 'video'],
        [/(music|audio|mic|headset)/, 'audio'],
        [/(cart|shop|store|goods|bag)/, 'ecommerce'],
        [/(brush|pen|palette|color)/, 'palette'],
        [/(font|text|typography|word)/, 'font'],
        [/(code|bug|terminal|command|api)/, 'code'],
        [/(globe|world|earth|browser|link|internet)/, 'web'],
        [/(mobile|phone|device|tablet)/, 'mobile'],
        [/(book|read|school|education|learn|graduation)/, 'education'],
        [/(bulb|idea|light|spark|star)/, 'inspiration'],
        [/(layout|grid|module|component|template)/, 'layout'],
        [/(ai|robot|chip|bot)/, 'ai'],
        [/(cube|three|3d)/, '3d'],
        [/(game|joystick)/, 'gameui'],
        [/(project|plan|task|calendar)/, 'project'],
        [/(vr|virtual|ar)/, 'vr'],
        [/(home|house|building|office)/, 'platform'],
        [/(tool|wrench|setting|gear)/, 'tools'],
        [/(basketball|football|soccer|tennis|sport)/, 'tool']
    ];
    for (const [ pattern, mapped ] of aliasRules) {
        if (pattern.test(compact) && availableIconKeys.has(mapped)) return mapped;
    }
    return '';
};

/**
 * 清洗 SVG 内容，确保能以 v-html 安全显示。
 */
const sanitizeSvgMarkup = (svgMarkup) => {
    const text = String(svgMarkup || '').trim();
    if (!text) return '';
    const extracted = (() => {
        const matched = text.match(/<svg[\s\S]*?<\/svg>/i);
        return matched ? String(matched[0] || '').trim() : text;
    })();
    const sanitized = extracted
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    return sanitized.toLowerCase().startsWith('<svg') ? sanitized : '';
};

/**
 * 按 key 去重并保留首个出现项。
 */
const uniqueByKey = (list) => {
    const map = new Map();
    for (const item of list) {
        const key = String(item?.key || '').trim().toLowerCase();
        if (!key || map.has(key)) continue;
        map.set(key, { key, label: String(item.label || key).trim() || key, svg: String(item.svg || '') });
    }
    return Array.from(map.values());
};

/**
 * 主流程：抽取前端图标 -> 合并入后台 SVG 图标库 -> 同步分类 icon 字段。
 */
const run = async () => {
    const { componentSvgMap, aliasMap, designIconsMap } = parseFrontendIcons();
    const defaultIconMap = parseSidebarDefaultIconMap({ designIconsMap, aliasMap, componentSvgMap });
    const availableIconKeys = new Set(Array.from(defaultIconMap.keys()));

    const dbConfig = loadDbConfig();
    const connection = await mysql.createConnection(dbConfig);

    try {
        const [ settingsRows ] = await connection.execute(
            'SELECT `value` FROM uied_site_setting WHERE `key` = ? LIMIT 1',
            [ 'pageGlobalConfig' ]
        );
        let pageGlobalConfig = {};
        if (Array.isArray(settingsRows) && settingsRows.length > 0) {
            try {
                pageGlobalConfig = JSON.parse(String(settingsRows[0].value || '{}')) || {};
            } catch (_error) {
                pageGlobalConfig = {};
            }
        }
        const existingLibrary = Array.isArray(pageGlobalConfig.categorySvgLibrary)
            ? pageGlobalConfig.categorySvgLibrary
            : [];

        const [ categoryRows ] = await connection.execute(
            'SELECT id, name, icon FROM uied_category WHERE is_delete = 0'
        );

        const requiredIconKeys = new Set();
        const localIconMigrationMap = new Map();
        for (const row of categoryRows) {
            const rawIcon = String(row.icon || '').trim();
            if (rawIcon.startsWith('svg:')) continue;
            if (!rawIcon) {
                requiredIconKeys.add('default');
                continue;
            }
            const localIconEntry = resolveLocalIconSvg(rawIcon);
            if (localIconEntry) {
                localIconMigrationMap.set(rawIcon, localIconEntry);
                continue;
            }
            const normalizedKey = normalizeLegacyIconKey(rawIcon, availableIconKeys);
            if (!normalizedKey) continue;
            requiredIconKeys.add(normalizedKey);
        }

        // 追加一组高频 key，方便页面管理直接选后台图标。
        [ 'tool', 'tools', 'inspiration', 'material', 'palette', 'photo', 'font', 'video', 'gameui', 'metaverse', 'ai', 'web', 'resource', 'blog', 'brand', 'graphic', 'animation', 'image', 'code', 'education', 'learning', '3d', 'digital', 'system', 'carui', 'designteam', 'project', 'cad', 'texture', 'furniture', 'lighting' ]
            .forEach(key => {
                if (availableIconKeys.has(key)) requiredIconKeys.add(key);
            });

        const generatedEntries = [];
        for (const iconKey of requiredIconKeys) {
            const componentName = defaultIconMap.get(iconKey);
            if (!componentName) continue;
            const resolvedName = resolveIconComponentName(componentName, aliasMap, componentSvgMap);
            if (!resolvedName) continue;
            const svgMarkup = sanitizeSvgMarkup(componentSvgMap.get(resolvedName) || '');
            if (!svgMarkup) continue;
            generatedEntries.push({
                key: buildSvgLibraryKey(iconKey),
                label: iconKey,
                svg: svgMarkup
            });
        }
        for (const localIconEntry of localIconMigrationMap.values()) {
            generatedEntries.push({
                key: localIconEntry.key,
                label: localIconEntry.label,
                svg: localIconEntry.svg
            });
        }

        const mergedLibrary = uniqueByKey([ ...existingLibrary, ...generatedEntries ]);
        const mergedConfig = {
            ...pageGlobalConfig,
            categorySvgLibrary: mergedLibrary
        };
        const mergedConfigJson = JSON.stringify(mergedConfig);
        const now = Math.floor(Date.now() / 1000);

        await connection.execute(
            `INSERT INTO uied_site_setting (\`key\`, \`value\`, create_time, update_time)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), update_time = VALUES(update_time)`,
            [ 'pageGlobalConfig', mergedConfigJson, now, now ]
        );

        let migratedCount = 0;
        for (const row of categoryRows) {
            const rawIcon = String(row.icon || '').trim();
            if (rawIcon.startsWith('svg:')) continue;
            if (!rawIcon) {
                const targetToken = buildSvgTokenFromIconKey('default');
                await connection.execute(
                    'UPDATE uied_category SET icon = ?, update_time = ? WHERE id = ?',
                    [ targetToken, now, Number(row.id) ]
                );
                migratedCount += 1;
                continue;
            }
            const localIconEntry = localIconMigrationMap.get(rawIcon);
            if (localIconEntry) {
                await connection.execute(
                    'UPDATE uied_category SET icon = ?, update_time = ? WHERE id = ?',
                    [ localIconEntry.token, now, Number(row.id) ]
                );
                migratedCount += 1;
                continue;
            }
            const normalizedKey = normalizeLegacyIconKey(rawIcon, availableIconKeys);
            if (!normalizedKey) continue;
            const targetToken = buildSvgTokenFromIconKey(normalizedKey);
            await connection.execute(
                'UPDATE uied_category SET icon = ?, update_time = ? WHERE id = ?',
                [ targetToken, now, Number(row.id) ]
            );
            migratedCount += 1;
        }

        console.log('[sync-icons] 成功写入 SVG 图标库条目:', generatedEntries.length);
        console.log('[sync-icons] 图标库当前总数:', mergedLibrary.length);
        console.log('[sync-icons] 成功迁移分类 icon -> svg:key 数量:', migratedCount);
    } finally {
        await connection.end();
    }
};

run()
    .then(() => {
        console.log('[sync-icons] 同步完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[sync-icons] 同步失败:', error);
        process.exit(1);
    });
