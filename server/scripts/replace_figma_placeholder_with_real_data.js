/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('../server/node_modules/mysql2/promise');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const LOCAL_CONFIG_FILE = path.resolve(PROJECT_ROOT, 'server/server/config/config.local.js');
const DEFAULT_MAPPING_FILE = path.resolve(__dirname, 'data', 'figma_real_mapping.sample.json');
const DEFAULT_EXPORT_FILE = path.resolve(__dirname, 'data', 'figma_placeholder_queue.json');
const DEFAULT_REPORT_FILE = path.resolve(__dirname, 'reports', `figma_replace_report_${Date.now()}.json`);

/**
 * 读取数据库配置（复用本地 Egg 配置）。
 * @returns {{host:string,port:number,user:string,password:string,database:string}}
 */
const loadDbConfig = () => {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const localConfigFactory = require(LOCAL_CONFIG_FILE);
    const localConfig = localConfigFactory({ name: 'uied-nav' }) || {};
    const sequelize = localConfig.sequelize || {};
    return {
        host: String(sequelize.host || '127.0.0.1'),
        port: Number(sequelize.port || 3306),
        user: String(sequelize.username || 'root'),
        password: String(sequelize.password || ''),
        database: String(sequelize.database || 'uied_nav'),
    };
};

/**
 * 解析命令行参数。
 * @returns {{
 *   apply:boolean,
 *   file:string,
 *   exportPlaceholder:boolean,
 *   exportFile:string,
 *   offset:number,
 *   limit:number,
 *   report:string
 * }}
 */
const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {
        apply: false,
        file: DEFAULT_MAPPING_FILE,
        exportPlaceholder: false,
        exportFile: DEFAULT_EXPORT_FILE,
        offset: 0,
        limit: 500,
        report: DEFAULT_REPORT_FILE,
    };

    args.forEach((arg) => {
        if (arg === '--apply') {
            options.apply = true;
            return;
        }
        if (arg === '--export-placeholder') {
            options.exportPlaceholder = true;
            return;
        }
        if (arg.startsWith('--file=')) {
            options.file = path.resolve(process.cwd(), arg.slice('--file='.length));
            return;
        }
        if (arg.startsWith('--export-file=')) {
            options.exportFile = path.resolve(process.cwd(), arg.slice('--export-file='.length));
            return;
        }
        if (arg.startsWith('--limit=')) {
            const value = Number(arg.slice('--limit='.length));
            if (Number.isFinite(value) && value > 0) {
                options.limit = Math.floor(value);
            }
            return;
        }
        if (arg.startsWith('--offset=')) {
            const value = Number(arg.slice('--offset='.length));
            if (Number.isFinite(value) && value >= 0) {
                options.offset = Math.floor(value);
            }
            return;
        }
        if (arg.startsWith('--report=')) {
            options.report = path.resolve(process.cwd(), arg.slice('--report='.length));
        }
    });

    return options;
};

/**
 * 从 Figma 官方链接中提取插件 ID。
 * @param {string} url 插件官方链接
 * @returns {string}
 */
const extractPluginIdFromUrl = (url = '') => {
    const value = String(url || '').trim();
    if (!value) return '';
    const match = value.match(/\/community\/plugin\/(\d+)/i);
    return match && match[1] ? String(match[1]).trim() : '';
};

/**
 * 规范化文本字段。
 * @param {*} value 任意值
 * @returns {string}
 */
const normalizeText = (value) => String(value === undefined || value === null ? '' : value).trim();

/**
 * 根据映射记录生成更新字段。
 * @param {object} row 数据库现有行
 * @param {object} mapping 映射对象
 * @returns {{sqlParts:string[],replacements:any[],updatedFields:string[]}}
 */
const buildUpdatePayload = (row, mapping) => {
    const now = Math.floor(Date.now() / 1000);
    const sqlParts = [];
    const replacements = [];
    const updatedFields = [];

    const rawOfficialUrl = normalizeText(mapping.officialUrl || row.official_url);
    const derivedPluginId = extractPluginIdFromUrl(rawOfficialUrl);
    const nextPluginId = normalizeText(mapping.figmaPluginId || derivedPluginId || row.figma_plugin_id);
    const nextOfficialUrl = rawOfficialUrl || (nextPluginId ? `https://www.figma.com/community/plugin/${nextPluginId}` : '');
    const nextIconUrl = normalizeText(mapping.iconUrl || '');
    const nextCoverUrl = normalizeText(mapping.coverUrl || '');
    const nextSummary = normalizeText(mapping.summary || '');
    const nextSourceType = normalizeText(mapping.sourceType || 'figma_verified_manual');
    const nextSourceUrl = normalizeText(mapping.sourceUrl || nextOfficialUrl || row.source_url || '');

    /**
     * 仅在传入值有效且与原值不同的情况下更新字段，避免无意义写入。
     */
    const pushUpdate = (column, nextValue, oldValue) => {
        if (!normalizeText(nextValue)) return;
        if (normalizeText(nextValue) === normalizeText(oldValue)) return;
        sqlParts.push(`${column} = ?`);
        replacements.push(nextValue);
        updatedFields.push(column);
    };

    pushUpdate('figma_plugin_id', nextPluginId, row.figma_plugin_id);
    pushUpdate('official_url', nextOfficialUrl, row.official_url);
    pushUpdate('icon_url', nextIconUrl, row.icon_url);
    pushUpdate('cover_url', nextCoverUrl, row.cover_url);
    pushUpdate('summary', nextSummary, row.summary);
    pushUpdate('source_type', nextSourceType, row.source_type);
    pushUpdate('source_url', nextSourceUrl, row.source_url);

    if (sqlParts.length > 0) {
        sqlParts.push('update_time = ?');
        replacements.push(now);
        updatedFields.push('update_time');
    }

    return { sqlParts, replacements, updatedFields };
};

/**
 * 根据映射对象在数据库中定位目标插件。
 * @param {mysql.Connection} connection 数据库连接
 * @param {object} mapping 映射对象
 * @returns {Promise<object|null>}
 */
const resolveTargetRow = async (connection, mapping) => {
    const id = Number(mapping.id || 0);
    const slug = normalizeText(mapping.slug);
    const figmaPluginId = normalizeText(mapping.figmaPluginId || extractPluginIdFromUrl(mapping.officialUrl));
    const name = normalizeText(mapping.name);

    const selectSql = `
      SELECT id, name, slug, figma_plugin_id, official_url, icon_url, cover_url, summary, source_type, source_url
      FROM uied_figma_plugin
      WHERE is_delete = 0 AND %CONDITION%
      LIMIT 1
    `;

    if (id > 0) {
        const [rows] = await connection.query(selectSql.replace('%CONDITION%', 'id = ?'), [ id ]);
        if (rows && rows.length) return rows[0];
    }
    if (slug) {
        const [rows] = await connection.query(selectSql.replace('%CONDITION%', 'slug = ?'), [ slug ]);
        if (rows && rows.length) return rows[0];
    }
    if (figmaPluginId) {
        const [rows] = await connection.query(selectSql.replace('%CONDITION%', 'figma_plugin_id = ?'), [ figmaPluginId ]);
        if (rows && rows.length) return rows[0];
    }
    if (name) {
        const [rows] = await connection.query(selectSql.replace('%CONDITION%', 'name = ?'), [ name ]);
        if (rows && rows.length) return rows[0];
    }
    return null;
};

/**
 * 导出占位数据队列，供后续人工补充真实链接。
 * @param {mysql.Connection} connection 数据库连接
 * @param {string} exportFile 导出文件
 * @param {number} offset 起始偏移量
 * @param {number} limit 导出数量
 * @returns {Promise<void>}
 */
const exportPlaceholderQueue = async (connection, exportFile, offset, limit) => {
    const [rows] = await connection.query(
        `SELECT id, name, slug, figma_plugin_id AS figmaPluginId, official_url AS officialUrl, source_type AS sourceType
         FROM uied_figma_plugin
         WHERE is_delete = 0
           AND source_type LIKE 'manual_expand_%'
           AND (
             official_url IS NULL
             OR official_url = ''
             OR (
               official_url NOT LIKE 'https://www.figma.com/community/plugin/%'
               AND official_url NOT LIKE 'http://www.figma.com/community/plugin/%'
             )
           )
         ORDER BY id ASC
         LIMIT ?, ?`,
        [ Number(offset), Number(limit) ]
    );
    const queue = (rows || []).map((item) => ({
        id: Number(item.id),
        name: normalizeText(item.name),
        slug: normalizeText(item.slug),
        sourceType: normalizeText(item.sourceType),
        figmaPluginId: normalizeText(item.figmaPluginId),
        officialUrl: normalizeText(item.officialUrl),
        iconUrl: '',
        coverUrl: '',
        summary: '',
    }));

    fs.mkdirSync(path.dirname(exportFile), { recursive: true });
    fs.writeFileSync(exportFile, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
    console.log(`[OK] 占位数据已导出：${exportFile}`);
    console.log(`[OK] 偏移量：${offset}`);
    console.log(`[OK] 导出数量：${queue.length}`);
};

/**
 * 加载并校验映射文件。
 * @param {string} filePath 映射文件路径
 * @returns {Array<object>}
 */
const loadMappingList = (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`映射文件不存在：${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`映射文件格式错误（必须为数组）：${filePath}`);
    }
    return parsed;
};

/**
 * 应用映射到数据库（默认 dry-run，带 --apply 才落库）。
 * @param {mysql.Connection} connection 数据库连接
 * @param {Array<object>} mappingList 映射列表
 * @param {boolean} apply 是否真正写入
 * @param {string} reportFile 报告文件
 * @returns {Promise<void>}
 */
const applyMappings = async (connection, mappingList, apply, reportFile) => {
    const report = {
        total: mappingList.length,
        matched: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        dryRun: !apply,
        rows: [],
    };

    for (let index = 0; index < mappingList.length; index += 1) {
        const mapping = mappingList[index] || {};
        const row = await resolveTargetRow(connection, mapping);
        if (!row) {
            report.notFound += 1;
            report.rows.push({
                index,
                id: mapping.id || '',
                slug: mapping.slug || '',
                name: mapping.name || '',
                status: 'not_found',
                reason: '无法定位目标记录（请补充 id 或 slug）',
            });
            continue;
        }

        report.matched += 1;
        const payload = buildUpdatePayload(row, mapping);
        if (payload.sqlParts.length === 0) {
            report.skipped += 1;
            report.rows.push({
                index,
                id: row.id,
                slug: row.slug,
                name: row.name,
                status: 'skipped',
                reason: '没有可更新字段',
            });
            continue;
        }

        if (apply) {
            const updateSql = `UPDATE uied_figma_plugin SET ${payload.sqlParts.join(', ')} WHERE id = ? LIMIT 1`;
            await connection.query(updateSql, [ ...payload.replacements, Number(row.id) ]);
        }

        report.updated += 1;
        report.rows.push({
            index,
            id: row.id,
            slug: row.slug,
            name: row.name,
            status: apply ? 'updated' : 'dry_run_ready',
            updatedFields: payload.updatedFields,
        });
    }

    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`[OK] 映射总数：${report.total}`);
    console.log(`[OK] 命中记录：${report.matched}`);
    console.log(`[OK] 可更新/已更新：${report.updated}`);
    console.log(`[OK] 跳过记录：${report.skipped}`);
    console.log(`[OK] 未命中：${report.notFound}`);
    console.log(`[OK] 报告文件：${reportFile}`);
    if (!apply) {
        console.log('[TIP] 当前为 dry-run，仅生成报告；加 --apply 才会写入数据库。');
    }
};

/**
 * 主流程：导出占位队列或执行映射替换。
 */
const main = async () => {
    const options = parseArgs();
    const dbConfig = loadDbConfig();
    const connection = await mysql.createConnection(dbConfig);
    try {
        if (options.exportPlaceholder) {
            await exportPlaceholderQueue(connection, options.exportFile, options.offset, options.limit);
            return;
        }
        const mappings = loadMappingList(options.file);
        await applyMappings(connection, mappings, options.apply, options.report);
    } finally {
        await connection.end();
    }
};

main().catch((error) => {
    console.error('[ERROR] replace_figma_placeholder_with_real_data 执行失败：', error.message);
    process.exitCode = 1;
});
