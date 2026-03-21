/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { setTimeout: delay } = require('timers/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const DEFAULT_INPUT_GLOB_DIR = path.resolve(__dirname, 'data');
const DEFAULT_FILE_PREFIX = 'figma_real_mapping_round';
const DEFAULT_FILE_SUFFIX = '.json';
const DEFAULT_OUTPUT_SUFFIX = '.auto';
const DEFAULT_REPORT_FILE = path.resolve(__dirname, 'reports', `figma_auto_mapping_summary_${Date.now()}.json`);
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_RETRY = 2;
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * 解析命令行参数。
 * @returns {{
 *   rounds:number[],
 *   maxPages:number,
 *   outputSuffix:string,
 *   reportFile:string,
 *   timeoutMs:number,
 *   retry:number
 * }}
 */
const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {
        rounds: [],
        maxPages: DEFAULT_MAX_PAGES,
        outputSuffix: DEFAULT_OUTPUT_SUFFIX,
        reportFile: DEFAULT_REPORT_FILE,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        retry: DEFAULT_RETRY,
    };

    args.forEach((arg) => {
        if (arg.startsWith('--rounds=')) {
            const raw = String(arg.slice('--rounds='.length) || '').trim();
            const rounds = raw
                .split(',')
                .map(item => Number(item.trim()))
                .filter(item => Number.isInteger(item) && item > 0);
            options.rounds = Array.from(new Set(rounds));
            return;
        }
        if (arg.startsWith('--max-pages=')) {
            const value = Number(arg.slice('--max-pages='.length));
            if (Number.isFinite(value) && value > 0) {
                options.maxPages = Math.floor(value);
            }
            return;
        }
        if (arg.startsWith('--output-suffix=')) {
            const value = String(arg.slice('--output-suffix='.length) || '').trim();
            if (value) options.outputSuffix = value;
            return;
        }
        if (arg.startsWith('--report=')) {
            options.reportFile = path.resolve(process.cwd(), arg.slice('--report='.length));
            return;
        }
        if (arg.startsWith('--timeout=')) {
            const value = Number(arg.slice('--timeout='.length));
            if (Number.isFinite(value) && value > 1000) {
                options.timeoutMs = Math.floor(value);
            }
            return;
        }
        if (arg.startsWith('--retry=')) {
            const value = Number(arg.slice('--retry='.length));
            if (Number.isFinite(value) && value >= 0) {
                options.retry = Math.floor(value);
            }
        }
    });

    return options;
};

/**
 * 按 round 序号列出输入映射文件。
 * @param {number[]} rounds 目标批次
 * @returns {string[]}
 */
const listRoundFiles = (rounds = []) => {
    const files = fs.readdirSync(DEFAULT_INPUT_GLOB_DIR)
        .filter(name => name.startsWith(DEFAULT_FILE_PREFIX) && name.endsWith(DEFAULT_FILE_SUFFIX))
        .filter(name => !name.includes('.auto.'))
        .map(name => {
            const matched = name.match(/round(\d+)\.json$/);
            const round = matched ? Number(matched[1]) : 0;
            return {
                name,
                round,
                fullPath: path.resolve(DEFAULT_INPUT_GLOB_DIR, name),
            };
        })
        .filter(item => item.round > 0)
        .sort((a, b) => a.round - b.round);

    if (!Array.isArray(rounds) || rounds.length === 0) {
        return files.map(item => item.fullPath);
    }
    const roundSet = new Set(rounds);
    return files.filter(item => roundSet.has(item.round)).map(item => item.fullPath);
};

/**
 * 判断是否已经是插件详情链接。
 * @param {string} url 链接
 * @returns {boolean}
 */
const isPluginDetailUrl = (url = '') => /^https?:\/\/www\.figma\.com\/community\/plugin\/\d+/i.test(String(url || '').trim());

/**
 * 从链接中提取 query 关键词。
 * @param {string} url 原始链接
 * @returns {string}
 */
const extractQueryKeyword = (url = '') => {
    const value = String(url || '').trim();
    if (!value) return '';
    try {
        const parsed = new URL(value);
        const query = String(parsed.searchParams.get('query') || '').trim();
        return query;
    } catch (error) {
        return '';
    }
};

/**
 * 规范化搜索关键词。
 * @param {string} value 原值
 * @returns {string}
 */
const normalizeKeyword = (value = '') => String(value || '').trim().toLowerCase();

/**
 * 发起带超时控制的请求。
 * @param {string} url 请求链接
 * @param {number} timeoutMs 超时毫秒
 * @returns {Promise<string>}
 */
const fetchTextWithTimeout = async (url, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (UIED-NAV Auto Mapping Bot)',
                'Accept': 'text/plain,text/markdown,text/html;q=0.9,*/*;q=0.8',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP_${response.status}`);
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
};

/**
 * 使用 curl 作为 TLS 证书异常兜底抓取。
 * @param {string} url 请求链接
 * @param {number} timeoutMs 超时毫秒
 * @returns {Promise<string>}
 */
const fetchTextViaCurlFallback = async (url, timeoutMs) => {
    const maxTimeSeconds = Math.max(5, Math.ceil(Number(timeoutMs || DEFAULT_TIMEOUT_MS) / 1000));
    const { stdout } = await execFileAsync('curl', [
        '-k',
        '-sS',
        '--max-time',
        String(maxTimeSeconds),
        String(url),
    ], {
        maxBuffer: 12 * 1024 * 1024,
    });
    return String(stdout || '');
};

/**
 * 判断是否为 TLS 证书链错误。
 * @param {Error} error 错误对象
 * @returns {boolean}
 */
const isTlsIssuerError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || error?.cause?.code || '').toUpperCase();
    return message.includes('unable to get local issuer certificate')
        || code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
        || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';
};

/**
 * 带重试抓取 r.jina.ai 代理文本。
 * @param {string} sourceUrl 源链接
 * @param {number} retry 重试次数
 * @param {number} timeoutMs 超时毫秒
 * @returns {Promise<string>}
 */
const fetchViaJinaProxy = async (sourceUrl, retry, timeoutMs) => {
    const proxyUrl = `https://r.jina.ai/http://${String(sourceUrl || '').replace(/^https?:\/\//i, '')}`;
    let lastError = null;
    for (let i = 0; i <= retry; i += 1) {
        try {
            if (i > 0) await delay(500 * i);
            return await fetchTextWithTimeout(proxyUrl, timeoutMs);
        } catch (error) {
            if (isTlsIssuerError(error)) {
                return await fetchTextViaCurlFallback(proxyUrl, timeoutMs);
            }
            lastError = error;
        }
    }
    throw lastError || new Error('proxy_fetch_failed');
};

/**
 * 从页面文本提取插件 ID 列表。
 * @param {string} text 页面文本
 * @returns {string[]}
 */
const extractPluginIds = (text = '') => {
    const ids = [];
    const regex = /community\/plugin\/(\d{9,20})/ig;
    let match = null;
    while ((match = regex.exec(text)) !== null) {
        const id = String(match[1] || '').trim();
        if (id) ids.push(id);
    }
    return Array.from(new Set(ids));
};

/**
 * 获取关键词对应的候选插件 ID 池。
 * @param {string} keyword 搜索关键词
 * @param {number} maxPages 页数
 * @param {number} retry 重试次数
 * @param {number} timeoutMs 超时
 * @returns {Promise<string[]>}
 */
const fetchPluginIdPoolByKeyword = async (keyword, maxPages, retry, timeoutMs) => {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) return [];
    const pool = [];
    for (let page = 1; page <= maxPages; page += 1) {
        const sourceUrl = `https://www.figma.com/community/search?resource_type=plugins&query=${encodeURIComponent(normalizedKeyword)}&page=${page}`;
        const text = await fetchViaJinaProxy(sourceUrl, retry, timeoutMs);
        const ids = extractPluginIds(text);
        if (ids.length === 0) break;
        ids.forEach((id) => {
            if (!pool.includes(id)) pool.push(id);
        });
        if (ids.length < 8) break;
    }
    return pool;
};

/**
 * 自动补全单个映射文件。
 * @param {string} filePath 文件路径
 * @param {object} options 配置
 * @param {Map<string, string[]>} keywordCache 关键词缓存
 * @returns {Promise<object>}
 */
const processMappingFile = async (filePath, options, keywordCache) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) {
        throw new Error(`文件格式错误：${filePath}`);
    }

    const groupedRowIndexes = new Map();
    rows.forEach((item, index) => {
        const officialUrl = String(item?.officialUrl || '').trim();
        if (isPluginDetailUrl(officialUrl)) return;
        const keyword = extractQueryKeyword(officialUrl);
        const normalizedKeyword = normalizeKeyword(keyword);
        if (!normalizedKeyword) return;
        if (!groupedRowIndexes.has(normalizedKeyword)) {
            groupedRowIndexes.set(normalizedKeyword, []);
        }
        groupedRowIndexes.get(normalizedKeyword).push(index);
    });

    const groupEntries = Array.from(groupedRowIndexes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const fileReport = {
        file: filePath,
        totalRows: rows.length,
        candidateRows: 0,
        updatedRows: 0,
        unresolvedRows: 0,
        keywordStats: [],
    };

    for (const [keyword, indexList] of groupEntries) {
        fileReport.candidateRows += indexList.length;
        let pool = keywordCache.get(keyword);
        if (!pool) {
            try {
                pool = await fetchPluginIdPoolByKeyword(keyword, options.maxPages, options.retry, options.timeoutMs);
            } catch (error) {
                pool = [];
                fileReport.keywordStats.push({
                    keyword,
                    rows: indexList.length,
                    fetchedPool: 0,
                    assigned: 0,
                    unresolved: indexList.length,
                    error: String(error?.message || 'fetch_failed'),
                });
                fileReport.unresolvedRows += indexList.length;
                continue;
            }
            keywordCache.set(keyword, pool);
        }
        const available = Array.isArray(pool) ? pool : [];
        let assigned = 0;
        indexList.forEach((rowIndex, position) => {
            const pluginId = available[position] || '';
            if (!pluginId) return;
            const row = rows[rowIndex] || {};
            row.figmaPluginId = pluginId;
            row.officialUrl = `https://www.figma.com/community/plugin/${pluginId}`;
            if (!String(row.sourceType || '').trim()) {
                row.sourceType = 'figma_auto_search';
            }
            rows[rowIndex] = row;
            assigned += 1;
            fileReport.updatedRows += 1;
        });
        const unresolved = Math.max(indexList.length - assigned, 0);
        fileReport.unresolvedRows += unresolved;
        fileReport.keywordStats.push({
            keyword,
            rows: indexList.length,
            fetchedPool: available.length,
            assigned,
            unresolved,
        });
    }

    const extIndex = filePath.lastIndexOf('.json');
    const outputPath = extIndex > 0
        ? `${filePath.slice(0, extIndex)}${options.outputSuffix}.json`
        : `${filePath}${options.outputSuffix}.json`;
    fs.writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    fileReport.output = outputPath;
    return fileReport;
};

/**
 * 主流程。
 */
const main = async () => {
    const options = parseArgs();
    const files = listRoundFiles(options.rounds);
    if (!files.length) {
        console.log('[WARN] 未找到待处理映射文件');
        return;
    }

    const keywordCache = new Map();
    const report = {
        generatedAt: new Date().toISOString(),
        files: [],
        totals: {
            fileCount: files.length,
            totalRows: 0,
            candidateRows: 0,
            updatedRows: 0,
            unresolvedRows: 0,
            keywordCount: 0,
        },
    };

    for (const filePath of files) {
        const fileReport = await processMappingFile(filePath, options, keywordCache);
        report.files.push(fileReport);
        report.totals.totalRows += Number(fileReport.totalRows || 0);
        report.totals.candidateRows += Number(fileReport.candidateRows || 0);
        report.totals.updatedRows += Number(fileReport.updatedRows || 0);
        report.totals.unresolvedRows += Number(fileReport.unresolvedRows || 0);
        console.log(`[OK] 自动补全完成：${path.basename(filePath)} -> ${path.basename(fileReport.output)}`);
        console.log(`     候选=${fileReport.candidateRows}，已补全=${fileReport.updatedRows}，待人工=${fileReport.unresolvedRows}`);
    }

    report.totals.keywordCount = keywordCache.size;
    fs.mkdirSync(path.dirname(options.reportFile), { recursive: true });
    fs.writeFileSync(options.reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`[DONE] 处理文件：${report.totals.fileCount}`);
    console.log(`[DONE] 总候选：${report.totals.candidateRows}`);
    console.log(`[DONE] 自动补全：${report.totals.updatedRows}`);
    console.log(`[DONE] 待人工：${report.totals.unresolvedRows}`);
    console.log(`[DONE] 关键词池：${report.totals.keywordCount}`);
    console.log(`[DONE] 报告文件：${options.reportFile}`);
};

main().catch((error) => {
    console.error('[ERROR] generate_figma_auto_mapping_from_keywords 失败：', error.message);
    process.exitCode = 1;
});
