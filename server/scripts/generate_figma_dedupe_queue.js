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
const DEFAULT_OUTPUT = path.resolve(__dirname, 'reports', 'figma_dedupe_queue_2026-03-21.json');

/**
 * 读取数据库配置（复用 Egg 本地配置）。
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
 * @returns {{output:string,top:number}}
 */
const parseArgs = () => {
    const options = {
        output: DEFAULT_OUTPUT,
        top: 50,
    };
    process.argv.slice(2).forEach((arg) => {
        if (arg.startsWith('--output=')) {
            options.output = path.resolve(process.cwd(), arg.slice('--output='.length));
            return;
        }
        if (arg.startsWith('--top=')) {
            const value = Number(arg.slice('--top='.length));
            if (Number.isFinite(value) && value > 0) {
                options.top = Math.floor(value);
            }
        }
    });
    return options;
};

/**
 * 生成重复插件修复队列。
 * @param {mysql.Connection} connection 数据库连接
 * @param {number} topN 输出前 N 个重复项
 * @returns {Promise<object>}
 */
const generateQueue = async (connection, topN) => {
    const [duplicateIds] = await connection.query(
        `
        SELECT
          figma_plugin_id AS figmaPluginId,
          official_url AS officialUrl,
          COUNT(*) AS duplicateCount
        FROM uied_figma_plugin
        WHERE is_delete = 0
          AND figma_plugin_id IS NOT NULL
          AND figma_plugin_id <> ''
          AND official_url IS NOT NULL
          AND official_url <> ''
        GROUP BY figma_plugin_id, official_url
        HAVING COUNT(*) > 1
        ORDER BY duplicateCount DESC, figma_plugin_id ASC
        LIMIT ?
      `,
        [ Number(topN) ]
    );

    const groups = [];
    for (const item of duplicateIds || []) {
        const [rows] = await connection.query(
            `
            SELECT
              p.id,
              p.name,
              p.slug,
              p.category_id AS categoryId,
              c.slug AS categorySlug,
              c.name AS categoryName,
              p.source_type AS sourceType,
              p.update_time AS updateTime
            FROM uied_figma_plugin p
            LEFT JOIN uied_figma_plugin_category c
              ON c.id = p.category_id AND c.is_delete = 0
            WHERE p.is_delete = 0
              AND p.figma_plugin_id = ?
              AND p.official_url = ?
            ORDER BY p.id ASC
          `,
            [ String(item.figmaPluginId || ''), String(item.officialUrl || '') ]
        );
        groups.push({
            figmaPluginId: String(item.figmaPluginId || ''),
            officialUrl: String(item.officialUrl || ''),
            duplicateCount: Number(item.duplicateCount || 0),
            items: (rows || []).map((row) => ({
                id: Number(row.id),
                name: String(row.name || ''),
                slug: String(row.slug || ''),
                categoryId: Number(row.categoryId || 0),
                categorySlug: String(row.categorySlug || ''),
                categoryName: String(row.categoryName || ''),
                sourceType: String(row.sourceType || ''),
                updateTime: Number(row.updateTime || 0),
            })),
        });
    }

    const [categoryUniqRows] = await connection.query(
        `
        SELECT
          c.slug AS categorySlug,
          c.name AS categoryName,
          COUNT(*) AS totalItems,
          COUNT(DISTINCT p.figma_plugin_id) AS uniquePluginIds
        FROM uied_figma_plugin p
        LEFT JOIN uied_figma_plugin_category c
          ON c.id = p.category_id AND c.is_delete = 0
        WHERE p.is_delete = 0
        GROUP BY c.slug, c.name
        ORDER BY totalItems DESC, categorySlug ASC
      `
    );

    const categoryUniqStats = (categoryUniqRows || []).map((row) => {
        const total = Number(row.totalItems || 0);
        const unique = Number(row.uniquePluginIds || 0);
        return {
            categorySlug: String(row.categorySlug || ''),
            categoryName: String(row.categoryName || ''),
            totalItems: total,
            uniquePluginIds: unique,
            duplicateItems: Math.max(total - unique, 0),
            uniquenessRatio: total > 0 ? Number((unique / total).toFixed(4)) : 0,
        };
    });

    const [summaryRow] = await connection.query(
        `
        SELECT
          COUNT(*) AS totalItems,
          COUNT(DISTINCT figma_plugin_id) AS uniquePluginIds,
          COUNT(DISTINCT official_url) AS uniqueOfficialUrls
        FROM uied_figma_plugin
        WHERE is_delete = 0
      `
    );
    const summary = summaryRow && summaryRow[0] ? summaryRow[0] : {};

    return {
        generatedAt: new Date().toISOString(),
        summary: {
            totalItems: Number(summary.totalItems || 0),
            uniquePluginIds: Number(summary.uniquePluginIds || 0),
            uniqueOfficialUrls: Number(summary.uniqueOfficialUrls || 0),
            duplicateGroupsTopN: groups.length,
        },
        duplicateGroups: groups,
        categoryUniqStats,
    };
};

/**
 * 主流程。
 * @returns {Promise<void>}
 */
const main = async () => {
    const options = parseArgs();
    const connection = await mysql.createConnection(loadDbConfig());
    try {
        const report = await generateQueue(connection, options.top);
        fs.mkdirSync(path.dirname(options.output), { recursive: true });
        fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`[OK] 去重队列已生成: ${options.output}`);
        console.log(`[OK] 总条目: ${report.summary.totalItems}`);
        console.log(`[OK] 唯一插件ID: ${report.summary.uniquePluginIds}`);
        console.log(`[OK] 唯一官方链接: ${report.summary.uniqueOfficialUrls}`);
        console.log(`[OK] 重复组(topN): ${report.summary.duplicateGroupsTopN}`);
    } finally {
        await connection.end();
    }
};

main().catch((error) => {
    console.error('[ERROR] generate_figma_dedupe_queue 执行失败：', error.message);
    process.exitCode = 1;
});

