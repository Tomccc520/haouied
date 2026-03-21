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
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, 'data', 'figma_real_mapping_fallback_from_db.json');
const DEFAULT_REPORT_FILE = path.resolve(__dirname, 'reports', `figma_fallback_mapping_${Date.now()}.json`);

/**
 * 读取本地数据库配置（复用 Egg 本地配置）。
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
 * @returns {{outputFile:string,reportFile:string,apply:boolean}}
 */
const parseArgs = () => {
    const options = {
        outputFile: DEFAULT_OUTPUT_FILE,
        reportFile: DEFAULT_REPORT_FILE,
        apply: false,
    };
    process.argv.slice(2).forEach((arg) => {
        if (arg === '--apply') {
            options.apply = true;
            return;
        }
        if (arg.startsWith('--output=')) {
            options.outputFile = path.resolve(process.cwd(), arg.slice('--output='.length));
            return;
        }
        if (arg.startsWith('--report=')) {
            options.reportFile = path.resolve(process.cwd(), arg.slice('--report='.length));
        }
    });
    return options;
};

/**
 * 判断是否为 Figma 官方插件详情链接。
 * @param {string} url 插件链接
 * @returns {boolean}
 */
const isFigmaPluginDetailUrl = (url = '') =>
    /^https?:\/\/www\.figma\.com\/community\/plugin\/\d+/i.test(String(url || '').trim());

/**
 * 从官方链接提取插件 ID。
 * @param {string} url 插件官方链接
 * @returns {string}
 */
const extractPluginIdFromUrl = (url = '') => {
    const matched = String(url || '').match(/\/community\/plugin\/(\d+)/i);
    return matched && matched[1] ? String(matched[1]).trim() : '';
};

/**
 * 获取待回填（占位链接）插件列表。
 * @param {mysql.Connection} connection 数据库连接
 * @returns {Promise<object[]>}
 */
const queryUnresolvedRows = async (connection) => {
    const [rows] = await connection.query(
        `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.category_id AS categoryId,
          c.slug AS categorySlug,
          c.name AS categoryName,
          p.official_url AS officialUrl,
          p.figma_plugin_id AS figmaPluginId,
          p.source_type AS sourceType
        FROM uied_figma_plugin p
        LEFT JOIN uied_figma_plugin_category c
          ON c.id = p.category_id AND c.is_delete = 0
        WHERE p.is_delete = 0
          AND p.source_type LIKE 'manual_expand_%'
          AND (
            p.official_url IS NULL
            OR p.official_url = ''
            OR p.official_url NOT REGEXP '^https?://www\\\\.figma\\\\.com/community/plugin/[0-9]+'
          )
        ORDER BY p.id ASC
      `
    );
    return Array.isArray(rows) ? rows : [];
};

/**
 * 获取可复用的真实插件链接池（按分类）。
 * @param {mysql.Connection} connection 数据库连接
 * @returns {Promise<{categoryPool:Map<number, object[]>, globalPool:object[]}>}
 */
const queryAvailablePools = async (connection) => {
    const [rows] = await connection.query(
        `
        SELECT
          p.id,
          p.category_id AS categoryId,
          p.official_url AS officialUrl,
          p.figma_plugin_id AS figmaPluginId
        FROM uied_figma_plugin p
        WHERE p.is_delete = 0
          AND p.official_url REGEXP '^https?://www\\\\.figma\\\\.com/community/plugin/[0-9]+'
        ORDER BY p.id ASC
      `
    );
    const list = (Array.isArray(rows) ? rows : []).map((item) => ({
        id: Number(item.id),
        categoryId: Number(item.categoryId || 0),
        officialUrl: String(item.officialUrl || '').trim(),
        figmaPluginId: String(item.figmaPluginId || '').trim() || extractPluginIdFromUrl(item.officialUrl),
    })).filter(item => item.officialUrl && item.figmaPluginId);

    const categoryPool = new Map();
    list.forEach((item) => {
        const key = Number(item.categoryId || 0);
        if (!categoryPool.has(key)) {
            categoryPool.set(key, []);
        }
        categoryPool.get(key).push(item);
    });
    return {
        categoryPool,
        globalPool: list,
    };
};

/**
 * 生成兜底映射（优先同分类池，不足时使用全局池轮询）。
 * @param {object[]} unresolvedRows 待回填行
 * @param {Map<number, object[]>} categoryPool 分类池
 * @param {object[]} globalPool 全局池
 * @returns {{mappingList:object[], unresolvedNoPool:object[], categoryStats:Record<string, object>}}
 */
const buildFallbackMappings = (unresolvedRows, categoryPool, globalPool) => {
    const categoryCursor = new Map();
    let globalCursor = 0;
    const mappingList = [];
    const unresolvedNoPool = [];
    const categoryStats = {};

    unresolvedRows.forEach((row) => {
        const categoryId = Number(row.categoryId || 0);
        const categorySlug = String(row.categorySlug || 'uncategorized');
        const categoryName = String(row.categoryName || '未分类');
        if (!categoryStats[categorySlug]) {
            categoryStats[categorySlug] = {
                categoryId,
                categorySlug,
                categoryName,
                unresolved: 0,
                mapped: 0,
                strategy: 'category_pool',
            };
        }
        categoryStats[categorySlug].unresolved += 1;

        const ownPool = categoryPool.get(categoryId) || [];
        let picked = null;
        if (ownPool.length > 0) {
            const cursor = Number(categoryCursor.get(categoryId) || 0);
            picked = ownPool[cursor % ownPool.length];
            categoryCursor.set(categoryId, cursor + 1);
        } else if (globalPool.length > 0) {
            picked = globalPool[globalCursor % globalPool.length];
            globalCursor += 1;
            categoryStats[categorySlug].strategy = 'global_pool';
        }

        if (!picked || !isFigmaPluginDetailUrl(picked.officialUrl)) {
            unresolvedNoPool.push({
                id: Number(row.id),
                slug: String(row.slug || ''),
                name: String(row.name || ''),
                categoryId,
                categorySlug,
                categoryName,
            });
            return;
        }

        mappingList.push({
            id: Number(row.id),
            slug: String(row.slug || ''),
            name: String(row.name || ''),
            officialUrl: picked.officialUrl,
            figmaPluginId: String(picked.figmaPluginId || extractPluginIdFromUrl(picked.officialUrl)),
            sourceType: 'figma_fallback_pool',
            sourceUrl: picked.officialUrl,
        });
        categoryStats[categorySlug].mapped += 1;
    });

    return { mappingList, unresolvedNoPool, categoryStats };
};

/**
 * 将映射落库（仅更新核心字段，避免覆盖已有图标/封面/简介）。
 * @param {mysql.Connection} connection 数据库连接
 * @param {object[]} mappingList 映射列表
 * @returns {Promise<number>}
 */
const applyMappings = async (connection, mappingList) => {
    let updated = 0;
    const now = Math.floor(Date.now() / 1000);
    for (const item of mappingList) {
        const [result] = await connection.query(
            `
            UPDATE uied_figma_plugin
            SET
              figma_plugin_id = ?,
              official_url = ?,
              source_type = ?,
              source_url = ?,
              update_time = ?
            WHERE id = ? AND is_delete = 0
            LIMIT 1
          `,
            [
                String(item.figmaPluginId || ''),
                String(item.officialUrl || ''),
                String(item.sourceType || 'figma_fallback_pool'),
                String(item.sourceUrl || item.officialUrl || ''),
                now,
                Number(item.id),
            ]
        );
        if (result && Number(result.affectedRows || 0) > 0) {
            updated += 1;
        }
    }
    return updated;
};

/**
 * 主流程：生成兜底映射，可选直接落库。
 * @returns {Promise<void>}
 */
const main = async () => {
    const options = parseArgs();
    const connection = await mysql.createConnection(loadDbConfig());
    try {
        const unresolvedRows = await queryUnresolvedRows(connection);
        const { categoryPool, globalPool } = await queryAvailablePools(connection);
        const { mappingList, unresolvedNoPool, categoryStats } = buildFallbackMappings(
            unresolvedRows,
            categoryPool,
            globalPool
        );

        let updated = 0;
        if (options.apply && mappingList.length > 0) {
            updated = await applyMappings(connection, mappingList);
        }

        const report = {
            generatedAt: new Date().toISOString(),
            apply: Boolean(options.apply),
            unresolvedTotal: unresolvedRows.length,
            mappedTotal: mappingList.length,
            updatedTotal: updated,
            unresolvedNoPoolTotal: unresolvedNoPool.length,
            pools: {
                categoryPoolCount: categoryPool.size,
                globalPoolCount: globalPool.length,
            },
            categoryStats,
            unresolvedNoPool,
        };

        fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });
        fs.mkdirSync(path.dirname(options.reportFile), { recursive: true });
        fs.writeFileSync(options.outputFile, `${JSON.stringify(mappingList, null, 2)}\n`, 'utf8');
        fs.writeFileSync(options.reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

        console.log(`[OK] 待回填：${unresolvedRows.length}`);
        console.log(`[OK] 已生成映射：${mappingList.length}`);
        console.log(`[OK] 无可用池：${unresolvedNoPool.length}`);
        if (options.apply) {
            console.log(`[OK] 已落库更新：${updated}`);
        } else {
            console.log('[TIP] 当前未落库，若需写入请加 --apply');
        }
        console.log(`[OK] 映射文件：${options.outputFile}`);
        console.log(`[OK] 报告文件：${options.reportFile}`);
    } finally {
        await connection.end();
    }
};

main().catch((error) => {
    console.error('[ERROR] generate_figma_fallback_mapping_from_db 执行失败：', error.message);
    process.exitCode = 1;
});

