/**
 * @file service/uied/website.js
 * @description UIED 网站管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class WebsiteService extends Service {
  /**
   * 判断是否为可降级的库结构兼容错误。
   * @param {Error} error 异常对象
   * @return {boolean} 是否兼容错误
   */
  isSchemaCompatibilityError(error) {
    const code = String(error?.original?.code || error?.code || '').toUpperCase();
    const message = String(error?.message || '');
    return code === 'ER_NO_SUCH_TABLE'
      || code === 'ER_BAD_FIELD_ERROR'
      || message.includes('doesn\'t exist')
      || message.includes('Unknown column');
  }

  /**
   * 规范化网站状态值（兼容历史 normal 与新版 active）
   * @param {unknown} statusValue 显式状态
   * @param {unknown} isActiveValue 兼容布尔开关值
   * @param {string} fallback 默认状态
   * @return {string} 规范化后的状态
   */
  normalizeWebsiteStatus(statusValue, isActiveValue, fallback = 'unchecked') {
    const normalized = String(statusValue || '').trim().toLowerCase();
    if (normalized === 'normal') return 'active';
    if ([ 'active', 'disabled', 'unchecked', 'failed', 'draft' ].includes(normalized)) {
      return normalized;
    }
    if (isActiveValue !== undefined && isActiveValue !== null) {
      return Number(isActiveValue) === 1 ? 'active' : 'disabled';
    }
    return fallback;
  }

  /**
   * 安全解析网站标签 JSON，避免脏数据导致接口报错
   * @param {unknown} source 标签字段原始值
   * @return {string[]} 标签列表
   */
  parseWebsiteTags(source) {
    return this.parseWebsiteTagBundle(source).tags;
  }

  /**
   * 规范化站点权重标签键（支持中英文别名）
   * @param {unknown} value 原始值
   * @return {string} 规范化键值
   */
  normalizeWebsiteWeightTag(value) {
    const raw = String(value || '').trim().toLowerCase();
    const aliasMap = {
      official: 'official',
      'weight:official': 'official',
      '官网': 'official',
      '官方': 'official',
      recommended: 'recommended',
      recommend: 'recommended',
      'weight:recommended': 'recommended',
      '推荐': 'recommended',
      enterprise_verified: 'enterprise_verified',
      enterpriseverified: 'enterprise_verified',
      enterprise: 'enterprise_verified',
      verified_enterprise: 'enterprise_verified',
      'weight:enterprise_verified': 'enterprise_verified',
      '企业认证': 'enterprise_verified',
    };
    return aliasMap[raw] || '';
  }

  /**
   * 解析网站标签，拆分普通标签与权重标签
   * @param {unknown} source 标签字段原始值
   * @return {{tags: string[], weightTags: string[]}} 标签结果
   */
  parseWebsiteTagBundle(source) {
    const rows = (() => {
      if (!source) return [];
      if (Array.isArray(source)) {
        return source.map(item => String(item || '').trim()).filter(Boolean);
      }
      try {
        const parsed = JSON.parse(source);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => String(item || '').trim()).filter(Boolean);
      } catch (error) {
        if (typeof source === 'string') {
          return source.split(',').map(item => item.trim()).filter(Boolean);
        }
        return [];
      }
    })();
    const tags = [];
    const weightTags = [];
    rows.forEach(item => {
      const normalizedItem = String(item || '').trim();
      if (!normalizedItem) return;
      const normalizedWeightKey = this.normalizeWebsiteWeightTag(normalizedItem);
      if (normalizedWeightKey) {
        weightTags.push(normalizedWeightKey);
        return;
      }
      if (normalizedItem.toLowerCase().startsWith('weight:')) {
        const fallbackKey = this.normalizeWebsiteWeightTag(normalizedItem.replace(/^weight:/i, ''));
        if (fallbackKey) {
          weightTags.push(fallbackKey);
          return;
        }
      }
      tags.push(normalizedItem);
    });
    return {
      tags: Array.from(new Set(tags)),
      weightTags: Array.from(new Set(weightTags)),
    };
  }

  /**
   * 合并普通标签与权重标签为数据库存储结构
   * @param {unknown} tags 普通标签
   * @param {unknown} weightTags 权重标签
   * @return {string[]} 可直接入库的标签数组
   */
  buildStoredWebsiteTags(tags, weightTags) {
    const normalTags = this.parseWebsiteTagBundle(tags).tags;
    const inheritedWeightTags = this.parseWebsiteTagBundle(tags).weightTags;
    const inputWeightTags = this.parseStringList(weightTags)
      .map(item => this.normalizeWebsiteWeightTag(item))
      .filter(Boolean);
    const mergedWeightTags = Array.from(new Set([ ...inheritedWeightTags, ...inputWeightTags ]));
    const storageWeightTags = mergedWeightTags.map(item => `weight:${item}`);
    return Array.from(new Set([ ...normalTags, ...storageWeightTags ]));
  }

  /**
   * 解析字符串/数组参数为去重后的字符串列表（兼容 query: a,b 或 a[]）
   * @param {unknown} value 输入值
   * @return {string[]} 规范化后的字符串列表
   */
  parseStringList(value) {
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map(item => String(item || '').trim()).filter(Boolean)));
    }
    return Array.from(
      new Set(
        String(value || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      )
    );
  }

  /**
   * 解析分类 ID 列表（仅保留正整数）
   * @param {unknown} value 输入值
   * @return {number[]} 分类ID列表
   */
  parseCategoryIdList(value) {
    return this.parseStringList(value)
      .map(item => Number.parseInt(item, 10))
      .filter(item => Number.isInteger(item) && item > 0);
  }

  /**
   * 归一化网站分类 ID 列表（支持 categoryId + categoryIds 混合输入）。
   * 第一项视为主分类，用于兼容历史 category_id 字段。
   * @param {Object} data 网站数据
   * @return {number[]} 分类ID列表
   */
  normalizeWebsiteCategoryIds(data = {}) {
    const fromList = this.parseCategoryIdList(data.categoryIds);
    const primaryCategoryId = Number.parseInt(String(data.categoryId || 0), 10);
    if (Number.isInteger(primaryCategoryId) && primaryCategoryId > 0) {
      fromList.unshift(primaryCategoryId);
    }
    return Array.from(new Set(fromList));
  }

  /**
   * 确保“网站-分类关联表”存在，支持一个网站挂多个分类。
   */
  async ensureWebsiteCategoryTable() {
    if (this._websiteCategoryTableReady) return;
    const { app } = this;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_website_category\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`website_id\` BIGINT UNSIGNED NOT NULL COMMENT '网站ID',
        \`category_id\` BIGINT UNSIGNED NOT NULL COMMENT '分类ID',
        \`sort\` INT NOT NULL DEFAULT 0 COMMENT '排序（同网站内）',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_website_category\` (\`website_id\`, \`category_id\`),
        KEY \`idx_category\` (\`category_id\`, \`is_delete\`),
        KEY \`idx_website\` (\`website_id\`, \`is_delete\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站-分类多对多关联表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    this._websiteCategoryTableReady = true;
  }

  /**
   * 确保网站点击日统计表存在（用于热门搜索标签 7 天热度计算）。
   */
  async ensureWebsiteClickDailyTable() {
    const { app } = this;
    const cacheKey = '__uiedWebsiteClickDailyTableReady__';
    if (app[cacheKey] === true) return;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_website_click_daily\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`website_id\` BIGINT UNSIGNED NOT NULL COMMENT '网站ID',
        \`metric_date\` INT UNSIGNED NOT NULL COMMENT '统计日期(YYYYMMDD)',
        \`click_count\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当日点击数',
        \`create_time\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        \`update_time\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_website_date\` (\`website_id\`, \`metric_date\`),
        KEY \`idx_metric_date\` (\`metric_date\`),
        KEY \`idx_website_date\` (\`website_id\`, \`metric_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站点击日统计表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    app[cacheKey] = true;
  }

  /**
   * 记录网站当日点击（按天聚合），为热门搜索动态标签提供近 7 天热度源。
   * @param {number} websiteId 网站ID
   */
  async recordWebsiteDailyClick(websiteId) {
    const { app } = this;
    const normalizedWebsiteId = Number.parseInt(String(websiteId || 0), 10);
    if (!Number.isInteger(normalizedWebsiteId) || normalizedWebsiteId <= 0) return;
    await this.ensureWebsiteClickDailyTable();
    const now = Math.floor(Date.now() / 1000);
    const metricDate = this.buildWebsiteClickMetricDate(new Date());
    await app.model.query(
      `INSERT INTO uied_website_click_daily (website_id, metric_date, click_count, create_time, update_time)
       VALUES (?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE click_count = click_count + 1, update_time = VALUES(update_time)`,
      {
        replacements: [ normalizedWebsiteId, metricDate, now, now ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
  }

  /**
   * 将日期转换为网站点击日统计表使用的 YYYYMMDD 数字格式。
   * 统一使用 Asia/Shanghai，避免服务器时区差异造成统计边界漂移。
   * @param {Date} date 日期对象
   * @return {number} 统计日期
   */
  buildWebsiteClickMetricDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).reduce((result, item) => {
      if (item.type !== 'literal') result[item.type] = item.value;
      return result;
    }, {});
    return Number.parseInt(
      `${parts.year}${parts.month}${parts.day}`,
      10
    );
  }

  /**
   * 基于北京时间生成偏移后的统计日期。
   * @param {number} offsetDays 相对今天的偏移天数
   * @return {number} 统计日期
   */
  buildWebsiteClickMetricDateByOffset(offsetDays = 0) {
    return this.buildWebsiteClickMetricDate(new Date(Date.now() + Number(offsetDays || 0) * 86400000));
  }

  /**
   * 生成北京时间本月第一天的统计日期。
   * @return {number} 统计日期
   */
  buildWebsiteClickCurrentMonthStartMetricDate() {
    const today = String(this.buildWebsiteClickMetricDate(new Date()));
    return Number.parseInt(`${today.slice(0, 6)}01`, 10);
  }

  /**
   * 获取网站自动点击汇总，来自前台/后台点击埋点的按日聚合数据。
   * @param {number|string} websiteId 网站ID
   * @param {number|string} totalClickCount 历史总点击，用于旧库无日统计时提示口径
   * @return {Promise<{currentMonthClicks:number,recent30DayClicks:number,recent7DayClicks:number,hasRecentDailyMetrics:boolean,historicalTotalClicks:number}>} 点击汇总
   */
  async getWebsiteClickSummary(websiteId, totalClickCount = 0) {
    const { app } = this;
    const normalizedWebsiteId = Number.parseInt(String(websiteId || 0), 10);
    const normalizedTotalClickCount = Math.max(0, Number.parseInt(String(totalClickCount || 0), 10) || 0);
    if (!Number.isInteger(normalizedWebsiteId) || normalizedWebsiteId <= 0) {
      return {
        currentMonthClicks: 0,
        recent30DayClicks: 0,
        recent7DayClicks: 0,
        hasRecentDailyMetrics: false,
        historicalTotalClicks: normalizedTotalClickCount,
      };
    }
    await this.ensureWebsiteClickDailyTable();

    const monthStartMetricDate = this.buildWebsiteClickCurrentMonthStartMetricDate();
    const recent30StartMetricDate = this.buildWebsiteClickMetricDateByOffset(-29);
    const recent7StartMetricDate = this.buildWebsiteClickMetricDateByOffset(-6);
    const minMetricDate = Math.min(monthStartMetricDate, recent30StartMetricDate, recent7StartMetricDate);

    const [ row ] = await app.model.query(
      `SELECT
          COUNT(*) AS dailyRows,
          COALESCE(SUM(CASE WHEN metric_date >= ? THEN click_count ELSE 0 END), 0) AS currentMonthClicks,
          COALESCE(SUM(CASE WHEN metric_date >= ? THEN click_count ELSE 0 END), 0) AS recent30DayClicks,
          COALESCE(SUM(CASE WHEN metric_date >= ? THEN click_count ELSE 0 END), 0) AS recent7DayClicks
       FROM uied_website_click_daily
       WHERE website_id = ? AND metric_date >= ?`,
      {
        replacements: [
          monthStartMetricDate,
          recent30StartMetricDate,
          recent7StartMetricDate,
          normalizedWebsiteId,
          minMetricDate,
        ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      currentMonthClicks: Number(row?.currentMonthClicks || 0),
      recent30DayClicks: Number(row?.recent30DayClicks || 0),
      recent7DayClicks: Number(row?.recent7DayClicks || 0),
      hasRecentDailyMetrics: Number(row?.dailyRows || 0) > 0,
      historicalTotalClicks: normalizedTotalClickCount,
    };
  }

  /**
   * 保存网站与分类的关联关系（全量覆盖）。
   * @param {number} websiteId 网站ID
   * @param {number[]} categoryIds 分类ID列表
   * @param {number} nowUnix 更新时间戳（秒）
   */
  async saveWebsiteCategoryRelations(websiteId, categoryIds = [], nowUnix = Math.floor(Date.now() / 1000)) {
    const { app } = this;
    const normalizedWebsiteId = Number.parseInt(String(websiteId || 0), 10);
    if (!Number.isInteger(normalizedWebsiteId) || normalizedWebsiteId <= 0) return;

    await this.ensureWebsiteCategoryTable();
    const normalizedCategoryIds = Array.from(
      new Set(
        (Array.isArray(categoryIds) ? categoryIds : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );

    await app.model.query(
      'UPDATE uied_website_category SET is_delete = 1, update_time = ? WHERE website_id = ? AND is_delete = 0',
      {
        replacements: [ nowUnix, normalizedWebsiteId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    if (normalizedCategoryIds.length === 0) return;
    const placeholders = normalizedCategoryIds.map(() => '(?, ?, ?, 0, ?, ?)').join(',');
    const replacements = [];
    normalizedCategoryIds.forEach((categoryId, index) => {
      replacements.push(
        normalizedWebsiteId,
        categoryId,
        index + 1,
        nowUnix,
        nowUnix
      );
    });
    await app.model.query(
      `INSERT INTO uied_website_category
        (website_id, category_id, sort, is_delete, create_time, update_time)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         is_delete = 0,
         sort = VALUES(sort),
         update_time = VALUES(update_time)`,
      {
        replacements,
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
  }

  /**
   * 批量读取网站关联分类，用于列表/详情回填 categoryIds。
   * @param {Array<number|string>} websiteIds 网站ID数组
   * @return {Promise<Map<number, number[]>>} 网站ID到分类ID列表映射
   */
  async getWebsiteCategoryIdMap(websiteIds = []) {
    const { app } = this;
    const normalizedWebsiteIds = Array.from(
      new Set(
        (Array.isArray(websiteIds) ? websiteIds : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    const resultMap = new Map();
    normalizedWebsiteIds.forEach(id => resultMap.set(id, []));
    if (normalizedWebsiteIds.length === 0) return resultMap;

    await this.ensureWebsiteCategoryTable();
    const rows = await app.model.query(
      `SELECT website_id as websiteId, category_id as categoryId
       FROM uied_website_category
       WHERE is_delete = 0 AND website_id IN (?)
       ORDER BY website_id ASC, sort ASC, id ASC`,
      {
        replacements: [ normalizedWebsiteIds ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const websiteId = Number.parseInt(String(row.websiteId || 0), 10);
      const categoryId = Number.parseInt(String(row.categoryId || 0), 10);
      if (!Number.isInteger(websiteId) || websiteId <= 0) return;
      if (!Number.isInteger(categoryId) || categoryId <= 0) return;
      if (!resultMap.has(websiteId)) {
        resultMap.set(websiteId, []);
      }
      const nextList = resultMap.get(websiteId);
      if (!nextList.includes(categoryId)) {
        nextList.push(categoryId);
      }
    });
    return resultMap;
  }

  /**
   * 规范化 varchar 字段（去首尾空格 + 截断），避免写库时报 Data too long。
   * @param {unknown} value 原始值
   * @param {number} maxLength 最大长度
   * @param {Object} options 选项
   * @param {boolean} options.allowNull 是否允许返回 null
   * @param {string} options.fallback 非空字段默认值
   * @return {string|null} 处理后的值
   */
  normalizeVarchar(value, maxLength, options = {}) {
    const allowNull = options.allowNull !== false;
    const fallback = options.fallback !== undefined ? String(options.fallback) : '';
    if (value === null || value === undefined) {
      return allowNull ? null : fallback;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return allowNull ? null : fallback;
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.slice(0, maxLength);
  }

  /**
   * 提取 URL 对比用主机名（忽略协议与 www 前缀），用于缩小重复查询范围。
   * @param {unknown} rawUrl 原始网址
   * @return {string} 归一化主机名
   */
  extractWebsiteCompareHost(rawUrl) {
    const source = String(rawUrl || '').trim();
    if (!source) return '';
    let candidate = source;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }
    try {
      const parsed = new URL(candidate);
      return String(parsed.hostname || '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, '')
        .replace(/^www\./, '');
    } catch (error) {
      return source
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .replace(/\.$/, '')
        .replace(/^www\./, '');
    }
  }

  /**
   * 从主机名提取主域名（示例：a.b.example.com -> example.com）
   * 说明：用于“仅主域名”重复判定，忽略子域名差异。
   * @param {string} host 主机名
   * @return {string} 主域名
   */
  extractWebsiteRootDomain(host) {
    const hostname = String(host || '')
      .trim()
      .toLowerCase()
      .replace(/\.$/, '')
      .replace(/^www\./, '');
    if (!hostname) return '';
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }
    const parts = hostname.split('.').filter(Boolean);
    if (parts.length <= 2) return hostname;
    const twoLevelSuffixSet = new Set([
      'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
      'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
      'com.au', 'net.au', 'org.au',
      'co.jp', 'com.hk', 'com.tw',
    ]);
    const tailTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (twoLevelSuffixSet.has(tailTwo) && parts.length >= 3) {
      return `${parts[parts.length - 3]}.${tailTwo}`;
    }
    return tailTwo;
  }

  /**
   * 规范化网址用于重复校验：仅保留主域名（忽略协议、路径、参数、子域名差异）。
   * @param {unknown} rawUrl 原始网址
   * @return {string} 主域名对比键
   */
  normalizeWebsiteUrlForCompare(rawUrl) {
    const source = String(rawUrl || '').trim();
    if (!source) return '';
    let candidate = source;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }
    try {
      const parsed = new URL(candidate);
      const hostname = String(parsed.hostname || '').trim();
      return this.extractWebsiteRootDomain(hostname);
    } catch (error) {
      const host = source
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .replace(/\.$/, '');
      return this.extractWebsiteRootDomain(host);
    }
  }

  /**
   * 检查网址是否重复（兼容 http/https、www、尾斜杠差异）。
   * @param {unknown} rawUrl 待校验网址
   * @param {Object} options 选项
   * @param {number} options.excludeId 需要排除的网站 ID（编辑态）
   * @return {Promise<null|{id:number,name:string,url:string,status:string}>} 重复记录
   */
  async findDuplicateWebsiteByUrl(rawUrl, options = {}) {
    const { app } = this;
    const targetRootDomain = this.normalizeWebsiteUrlForCompare(rawUrl);
    if (!targetRootDomain) return null;

    const excludeId = Number.parseInt(String(options.excludeId || 0), 10);
    const compareDomain = targetRootDomain;
    const where = [ 'is_delete = 0', 'url IS NOT NULL', "TRIM(url) != ''" ];
    const replacements = [];

    if (Number.isInteger(excludeId) && excludeId > 0) {
      where.push('id != ?');
      replacements.push(excludeId);
    }

    if (compareDomain) {
      where.push('LOWER(url) LIKE ?');
      replacements.push(`%${compareDomain}%`);
    }

    const records = await app.model.query(
      `SELECT id, name, url, status
       FROM uied_website
       WHERE ${where.join(' AND ')}
       ORDER BY id DESC
       LIMIT 300`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    for (const row of records) {
      const existingRootDomain = this.normalizeWebsiteUrlForCompare(row.url);
      if (!existingRootDomain) continue;
      if (existingRootDomain !== targetRootDomain) continue;
      return {
        id: Number(row.id || 0),
        name: String(row.name || ''),
        url: String(row.url || ''),
        status: this.normalizeWebsiteStatus(row.status, undefined, 'unchecked'),
      };
    }
    return null;
  }

  /**
   * 解析批量导入输入（支持换行、逗号、空格分隔），输出合法 URL 列表。
   * @param {unknown} urls 原始输入（字符串或数组）
   * @return {string[]} 规范化 URL 列表
   */
  normalizeBatchImportUrls(urls) {
    const rows = Array.isArray(urls)
      ? urls
      : String(urls || '')
        .split(/[\n\r,，;；\t ]+/g)
        .map(item => item.trim())
        .filter(Boolean);
    const unique = [];
    const seen = new Set();
    rows.forEach(item => {
      let candidate = String(item || '').trim();
      if (!candidate) return;
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`;
      }
      try {
        const parsed = new URL(candidate);
        const url = String(parsed.href || '').trim();
        if (!url) return;
        if (seen.has(url)) return;
        seen.add(url);
        unique.push(url);
      } catch (error) {
        // 无效 URL 由上层统一记录失败原因
      }
    });
    return unique;
  }

  /**
   * 基于 URL 生成默认网站名称（当 SEO 抓取不到 title 时兜底）。
   * @param {string} url 网址
   * @return {string} 默认网站名称
   */
  buildWebsiteNameFromUrl(url) {
    const host = this.extractWebsiteCompareHost(url);
    if (!host) return '未命名网站';
    const rootDomain = this.extractWebsiteRootDomain(host);
    const segments = String(rootDomain || host).split('.');
    if (!segments.length) return rootDomain || host;
    return String(segments[0] || rootDomain || host);
  }

  /**
   * 将 SEO keywords 文本转换为标签列表。
   * @param {string} keywords 关键词文本
   * @return {string[]} 标签数组
   */
  parseSeoKeywordsToTags(keywords) {
    return String(keywords || '')
      .split(/[，,；;、\n\r\t]/g)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  /**
   * 批量导入网址（可选：抓取网站信息、AI 生成详情内容）。
   * @param {Object} payload 导入参数
   * @return {Promise<{total:number,created:number,skipped:number,failed:number,rows:any[]}>} 导入结果
   */
  async batchImport(payload = {}) {
    const { ctx } = this;
    const urls = this.normalizeBatchImportUrls(payload.urls);
    const normalizedCategoryIds = this.normalizeWebsiteCategoryIds(payload);
    const categoryId = normalizedCategoryIds[0] || Number.parseInt(String(payload.categoryId || 0), 10);
    const shouldFetchSeo = payload.fetchSeo !== false;
    let shouldGenerateDetailContent = payload.generateDetailContent === true;
    const allowDuplicate = payload.allowDuplicate !== false;
    const publishStatus = this.normalizeWebsiteStatus(payload.status, payload.isActive, 'draft');
    let aiModelOverride = String(payload.aiModel || '').trim();
    let aiPromptTemplateOverride = String(payload.aiPromptTemplate || '').trim();

    if (shouldGenerateDetailContent) {
      try {
        const importConfig = await ctx.service.uied.aiConfig.getImportConfig();
        const websiteImportConfig = importConfig?.websiteBatchImport || {};
        if (websiteImportConfig.enabled === false) {
          shouldGenerateDetailContent = false;
        }
        if (!aiModelOverride) {
          aiModelOverride = String(websiteImportConfig.model || '').trim();
        }
        if (!aiPromptTemplateOverride) {
          aiPromptTemplateOverride = String(websiteImportConfig.promptTemplate || '').trim();
        }
      } catch (error) {
        ctx.logger.warn(`[website.batchImport] 读取 AI 导入配置失败，将继续使用请求参数: ${error?.message || error}`);
      }
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new Error('请选择所属分类');
    }
    if (!urls.length) {
      return { total: 0, created: 0, skipped: 0, failed: 0, rows: [] };
    }

    const rows = [];
    for (const rawUrl of urls) {
      const currentUrl = String(rawUrl || '').trim();
      if (!currentUrl) continue;
      try {
        const duplicate = await this.findDuplicateWebsiteByUrl(currentUrl);
        if (duplicate && !allowDuplicate) {
          rows.push({
            status: 'skipped',
            url: currentUrl,
            reason: `重复域名（已存在：ID ${duplicate.id} ${duplicate.name || ''}）`,
            websiteId: duplicate.id,
          });
          continue;
        }
        const duplicateNotice = duplicate
          ? `检测到重复主域名（已存在：ID ${duplicate.id} ${duplicate.name || ''}），已按“允许重复”继续导入`
          : '';

        let seoInfo = null;
        if (shouldFetchSeo) {
          try {
            seoInfo = await ctx.service.uied.seoScraper.fetch(currentUrl);
          } catch (seoError) {
            // SEO 抓取失败不阻塞导入
            seoInfo = null;
          }
        }

        const generatedTags = this.parseSeoKeywordsToTags(String(seoInfo?.keywords || ''));
        const savePayload = {
          name: this.normalizeVarchar(
            String(seoInfo?.title || '').trim() || this.buildWebsiteNameFromUrl(currentUrl),
            200,
            { allowNull: false, fallback: this.buildWebsiteNameFromUrl(currentUrl) || '未命名网站' }
          ),
          slug: null,
          url: currentUrl,
          categoryId,
          categoryIds: normalizedCategoryIds.length > 0 ? normalizedCategoryIds : [ categoryId ],
          description: this.normalizeVarchar(String(seoInfo?.description || '').trim(), 1000, { allowNull: true }) || '',
          iconUrl: this.normalizeVarchar(String(seoInfo?.favicon || '').trim(), 500, { allowNull: true }),
          tags: generatedTags,
          order: 0,
          isActive: publishStatus === 'active' ? 1 : 0,
          status: publishStatus,
          allowDuplicate: true,
          seoTitle: this.normalizeVarchar(String(seoInfo?.title || '').trim(), 100, { allowNull: true }),
          seoDescription: this.normalizeVarchar(String(seoInfo?.description || '').trim(), 300, { allowNull: true }),
          seoKeywords: this.normalizeVarchar(String(seoInfo?.keywords || '').trim(), 200, { allowNull: true }),
          detailContent: null,
          thumbnail: null,
        };

        const created = await this.add(savePayload);
        const websiteId = Number(created?.id || 0);

        let aiDetailGenerated = false;
        let aiDetailError = '';
        if (websiteId > 0 && shouldGenerateDetailContent) {
          try {
            const aiResult = await ctx.service.uied.aiConfig.generateDetailContent(websiteId, {
              modelOverride: aiModelOverride || undefined,
              promptTemplateOverride: aiPromptTemplateOverride || undefined,
            });
            const aiContent = String(aiResult?.content || '').trim();
            if (aiContent) {
              await this.edit({ id: websiteId, detailContent: aiContent });
              aiDetailGenerated = true;
            }
          } catch (aiError) {
            aiDetailError = String(aiError?.message || 'AI 详情生成失败').trim();
          }
        }

        rows.push({
          status: 'created',
          url: currentUrl,
          websiteId,
          name: savePayload.name,
          reason: aiDetailError
            ? `${duplicateNotice ? `${duplicateNotice}；` : ''}导入成功，AI详情生成失败：${aiDetailError}`
            : `${duplicateNotice ? `${duplicateNotice}；` : ''}导入成功`,
          fetchedSeo: Boolean(seoInfo),
          duplicated: Boolean(duplicate),
          duplicateWebsiteId: duplicate ? Number(duplicate.id || 0) : undefined,
          aiDetailGenerated,
          aiDetailError,
        });
      } catch (error) {
        rows.push({
          status: 'failed',
          url: currentUrl,
          reason: String(error?.message || '导入失败').trim(),
        });
      }
    }

    const created = rows.filter(item => item.status === 'created').length;
    const skipped = rows.filter(item => item.status === 'skipped').length;
    const failed = rows.filter(item => item.status === 'failed').length;
    return {
      total: rows.length,
      created,
      skipped,
      failed,
      rows,
    };
  }

  /**
   * 批量 AI 生成网站详情正文。
   * 默认跳过已有正文的网站，避免覆盖已人工编辑内容。
   * @param {{ids?: Array<number|string>, overwrite?: boolean}} payload 批量生成参数
   * @return {Promise<{total:number,success:number,skipped:number,failed:number,rows:Array<object>}>} 批量结果
   */
  async batchGenerateDetailContent(payload = {}) {
    const { app, ctx } = this;
    const ids = Array.from(
      new Set(
        (Array.isArray(payload.ids) ? payload.ids : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    const overwrite = payload.overwrite === true;
    if (ids.length === 0) {
      return { total: 0, success: 0, skipped: 0, failed: 0, rows: [] };
    }

    const websiteRows = await app.model.query(
      'SELECT id, name, detail_content as detailContent FROM uied_website WHERE is_delete = 0 AND id IN (?)',
      { replacements: [ ids ], type: app.Sequelize.QueryTypes.SELECT }
    );
    const websiteMap = new Map();
    (Array.isArray(websiteRows) ? websiteRows : []).forEach(item => {
      const websiteId = Number.parseInt(String(item?.id || 0), 10);
      if (!Number.isInteger(websiteId) || websiteId <= 0) return;
      websiteMap.set(websiteId, item);
    });

    const now = Math.floor(Date.now() / 1000);
    const rows = [];
    for (const websiteId of ids) {
      const website = websiteMap.get(websiteId);
      if (!website) {
        rows.push({
          status: 'failed',
          websiteId,
          reason: '网站不存在或已删除',
        });
        continue;
      }
      const hasDetailContent = String(website.detailContent || '').trim().length > 0;
      if (hasDetailContent && !overwrite) {
        rows.push({
          status: 'skipped',
          websiteId,
          name: String(website.name || ''),
          reason: '已存在正文，默认跳过（可开启覆盖模式）',
        });
        continue;
      }
      try {
        const aiResult = await ctx.service.uied.aiConfig.generateDetailContent(websiteId);
        const aiContent = String(aiResult?.content || '').trim();
        if (!aiContent) {
          throw new Error('AI 返回内容为空');
        }
        await app.model.query(
          'UPDATE uied_website SET detail_content = ?, update_time = ? WHERE id = ?',
          {
            replacements: [ aiContent, now, websiteId ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
        rows.push({
          status: 'success',
          websiteId,
          name: String(website.name || ''),
          reason: hasDetailContent ? '已覆盖正文并更新成功' : '正文生成成功',
          contentLength: aiContent.length,
        });
      } catch (error) {
        rows.push({
          status: 'failed',
          websiteId,
          name: String(website.name || ''),
          reason: String(error?.message || 'AI 生成失败').trim() || 'AI 生成失败',
        });
      }
    }

    const success = rows.filter(item => item.status === 'success').length;
    const skipped = rows.filter(item => item.status === 'skipped').length;
    const failed = rows.filter(item => item.status === 'failed').length;
    return {
      total: rows.length,
      success,
      skipped,
      failed,
      rows,
    };
  }

  /**
   * 批量处理网站权重标签。
   * 支持 add/remove/replace/clear 四种模式，避免运营逐条编辑。
   * @param {{ids?: Array<number|string>, operation?: string, weightTags?: Array<string>|string}} payload 批量参数
   * @return {Promise<{total:number,updated:number,skipped:number,rows:Array<object>}>} 处理结果
   */
  async batchUpdateWeightTags(payload = {}) {
    const { app } = this;
    const ids = Array.from(
      new Set(
        (Array.isArray(payload.ids) ? payload.ids : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (ids.length === 0) {
      throw new Error('请选择要处理的网站');
    }

    const normalizedOperation = String(payload.operation || 'add').trim().toLowerCase();
    const operationAllowSet = new Set([ 'add', 'remove', 'replace', 'clear' ]);
    const operation = operationAllowSet.has(normalizedOperation) ? normalizedOperation : 'add';
    const normalizedWeightTags = Array.from(
      new Set(
        this.parseStringList(payload.weightTags)
          .map(item => this.normalizeWebsiteWeightTag(item))
          .filter(Boolean)
      )
    );
    if (operation !== 'clear' && normalizedWeightTags.length === 0) {
      throw new Error('请至少选择一个权重标签');
    }

    const websiteRows = await app.model.query(
      `SELECT id, name, tags
       FROM uied_website
       WHERE is_delete = 0 AND id IN (?)`,
      {
        replacements: [ ids ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const websiteMap = new Map();
    (Array.isArray(websiteRows) ? websiteRows : []).forEach(item => {
      const websiteId = Number.parseInt(String(item?.id || 0), 10);
      if (!Number.isInteger(websiteId) || websiteId <= 0) return;
      websiteMap.set(websiteId, item);
    });

    const rows = [];
    const now = Math.floor(Date.now() / 1000);
    for (const websiteId of ids) {
      const website = websiteMap.get(websiteId);
      if (!website) {
        rows.push({
          status: 'skipped',
          websiteId,
          reason: '网站不存在或已删除',
        });
        continue;
      }
      const tagBundle = this.parseWebsiteTagBundle(website.tags);
      const nextWeightTagSet = new Set(tagBundle.weightTags);
      if (operation === 'clear' || operation === 'replace') {
        nextWeightTagSet.clear();
      }
      if (operation === 'add' || operation === 'replace') {
        normalizedWeightTags.forEach(item => nextWeightTagSet.add(item));
      }
      if (operation === 'remove') {
        normalizedWeightTags.forEach(item => nextWeightTagSet.delete(item));
      }
      const nextWeightTags = Array.from(nextWeightTagSet);
      const currentStorageTags = this.buildStoredWebsiteTags(tagBundle.tags, tagBundle.weightTags);
      const nextStorageTags = this.buildStoredWebsiteTags(tagBundle.tags, nextWeightTags);
      const currentStorageJson = JSON.stringify(currentStorageTags);
      const nextStorageJson = JSON.stringify(nextStorageTags);
      if (currentStorageJson === nextStorageJson) {
        rows.push({
          status: 'skipped',
          websiteId,
          name: String(website?.name || ''),
          reason: '权重标签无变化',
        });
        continue;
      }

      await app.model.query(
        'UPDATE uied_website SET tags = ?, update_time = ? WHERE id = ?',
        {
          replacements: [ nextStorageJson, now, websiteId ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      rows.push({
        status: 'updated',
        websiteId,
        name: String(website?.name || ''),
        weightTags: nextWeightTags,
        reason: '更新成功',
      });
    }

    const updated = rows.filter(item => item.status === 'updated').length;
    const skipped = rows.filter(item => item.status === 'skipped').length;
    return {
      total: rows.length,
      updated,
      skipped,
      rows,
    };
  }

  /**
   * 获取网站列表（分页）
   * @param {Object} params
   * @param {number} params.categoryId - 分类ID
   * @param {boolean} params.includeChildren - 是否包含子分类的网站
   */
  async list({
    page = 1,
    pageSize = 20,
    categoryId,
    categoryIds,
    keyword,
    status,
    statusList,
    flagList,
    sortBy,
    includeChildren,
    hasDetailContent,
    hasThumbnail,
    recycleBin = 0,
  }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;
    const recycleFlag = Number(recycleBin || 0) === 1 ? 1 : 0;

    // 构建查询条件
    let whereClause = 'w.is_delete = ?';
    const replacements = [ recycleFlag ];

    const categoryIdList = Array.from(
      new Set([
        ...this.parseCategoryIdList(categoryId),
        ...this.parseCategoryIdList(categoryIds),
      ])
    );
    if (categoryIdList.length > 0) {
      let effectiveCategoryIds = [ ...categoryIdList ];
      if (includeChildren) {
        const childRows = await app.model.query(
          'SELECT id FROM uied_category WHERE parent_id IN (?) AND is_delete = 0',
          {
            replacements: [ categoryIdList ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );
        const childIds = (Array.isArray(childRows) ? childRows : [])
          .map(item => Number.parseInt(String(item?.id || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0);
        effectiveCategoryIds = Array.from(new Set([ ...effectiveCategoryIds, ...childIds ]));
      }
      const placeholders = effectiveCategoryIds.map(() => '?').join(',');
      whereClause += ` AND (
        w.category_id IN (${placeholders})
        OR EXISTS (
          SELECT 1
          FROM uied_website_category uwc
          WHERE uwc.website_id = w.id
            AND uwc.is_delete = 0
            AND uwc.category_id IN (${placeholders})
        )
      )`;
      replacements.push(...effectiveCategoryIds, ...effectiveCategoryIds);
    }

    if (keyword) {
      whereClause += ' AND (w.name LIKE ? OR w.description LIKE ? OR w.url LIKE ? OR w.slug LIKE ? OR w.tags LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      replacements.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    /**
     * 状态筛选兼容策略：
     * 1. 优先使用新版多选参数 statusList；
     * 2. 仅当 statusList 为空时，回退 legacy 单值参数 status。
     * 说明：避免两者叠加导致“筛了草稿却混入已发布”。
     */
    const parsedStatusList = (() => {
      const normalizedStatusList = this.parseStringList(statusList).map(item => item.toLowerCase());
      if (normalizedStatusList.length > 0) {
        return Array.from(new Set(normalizedStatusList));
      }
      return Array.from(new Set(this.parseStringList(status).map(item => item.toLowerCase())));
    })();
    if (parsedStatusList.length > 0) {
      const includesPublished = parsedStatusList.some(item => item === 'active' || item === 'normal');
      const exactStatuses = parsedStatusList.filter(item => item !== 'active' && item !== 'normal');
      const statusClauses = [];
      if (includesPublished) {
        statusClauses.push("(w.status IN ('active', 'normal') OR w.status IS NULL OR w.status = '')");
      }
      if (exactStatuses.length > 0) {
        statusClauses.push(`w.status IN (${exactStatuses.map(() => '?').join(',')})`);
        replacements.push(...exactStatuses);
      }
      if (statusClauses.length > 0) {
        whereClause += ` AND (${statusClauses.join(' OR ')})`;
      }
    }

    const parsedFlagList = Array.from(
      new Set(this.parseStringList(flagList).map(item => item.toLowerCase()))
    );
    if (parsedFlagList.includes('pinned')) whereClause += ' AND w.is_pinned = 1';
    if (parsedFlagList.includes('hot')) whereClause += ' AND w.is_hot = 1';
    if (parsedFlagList.includes('featured')) whereClause += ' AND w.is_featured = 1';
    if (parsedFlagList.includes('new')) whereClause += ' AND w.is_new = 1';

    let orderByClause = 'w.is_pinned DESC, w.sort ASC, w.id DESC';
    switch (String(sortBy || '').trim().toLowerCase()) {
      case 'sort_asc':
        orderByClause = 'w.sort ASC, w.id DESC';
        break;
      case 'sort_desc':
        orderByClause = 'w.sort DESC, w.id DESC';
        break;
      case 'click_desc':
        orderByClause = 'w.click_count DESC, w.id DESC';
        break;
      case 'create_desc':
        orderByClause = 'w.create_time DESC, w.id DESC';
        break;
      case 'create_asc':
        orderByClause = 'w.create_time ASC, w.id ASC';
        break;
      case 'update_desc':
        orderByClause = 'w.update_time DESC, w.id DESC';
        break;
      case 'update_asc':
        orderByClause = 'w.update_time ASC, w.id ASC';
        break;
      default:
        break;
    }

    if (hasDetailContent === '1') {
      whereClause += " AND w.detail_content IS NOT NULL AND TRIM(w.detail_content) != ''";
    } else if (hasDetailContent === '0') {
      whereClause += " AND (w.detail_content IS NULL OR TRIM(w.detail_content) = '')";
    }

    if (hasThumbnail === '1') {
      whereClause += " AND w.thumbnail IS NOT NULL AND TRIM(w.thumbnail) != ''";
    } else if (hasThumbnail === '0') {
      whereClause += " AND (w.thumbnail IS NULL OR TRIM(w.thumbnail) = '')";
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_website w WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );
    const total = countResult.total;

    // 获取列表
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot, w.is_pinned as isPinned,
              w.tags, w.sort as sortOrder, w.click_count as clickCount,
              w.status as status, w.create_time as createdAt, w.update_time as updatedAt
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}
       ORDER BY ${orderByClause}
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 转换布尔值和解析 tags
    const websiteIds = websites
      .map(item => Number.parseInt(String(item?.id || 0), 10))
      .filter(item => Number.isInteger(item) && item > 0);
    const websiteCategoryIdMap = await this.getWebsiteCategoryIdMap(websiteIds);

    const list = websites.map(w => {
      const normalizedStatus = this.normalizeWebsiteStatus(w.status, undefined, 'active');
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      const fallbackCategoryId = Number.parseInt(String(w.categoryId || 0), 10);
      const categoryIdsForWebsite = websiteCategoryIdMap.get(Number(w.id || 0)) || [];
      if (categoryIdsForWebsite.length === 0 && Number.isInteger(fallbackCategoryId) && fallbackCategoryId > 0) {
        categoryIdsForWebsite.push(fallbackCategoryId);
      }
      return {
        ...w,
        status: normalizedStatus,
        isNew: w.isNew === 1,
        isFeatured: w.isFeatured === 1,
        isHot: w.isHot === 1,
        isPinned: w.isPinned === 1,
        isActive: normalizedStatus === 'active',
        categoryIds: categoryIdsForWebsite,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });

    return {
      lists: list,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }


  /**
   * 获取网站详情
   */
  async detail(id, slug) {
    const { app } = this;

    let whereClause = 'w.is_delete = 0';
    const replacements = [];

    if (id) {
      whereClause += ' AND w.id = ?';
      replacements.push(id);
    } else if (slug) {
      whereClause += ' AND w.slug = ?';
      replacements.push(slug);
    }

    const [ website ] = await app.model.query(
      `SELECT w.*, c.name as categoryName, c.slug as categorySlug
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!website) return null;

    let trafficMetrics = null;
    let clickMetrics = {
      currentMonthClicks: 0,
      recent30DayClicks: 0,
      recent7DayClicks: 0,
    };
    try {
      trafficMetrics = await this.ctx.service.uied.websiteTrafficMetric.getByWebsiteId(website.id);
    } catch (error) {
      this.ctx.logger.warn('[uied.website.detail] 获取网站访问数据失败，忽略:', error.message);
    }
    try {
      clickMetrics = await this.getWebsiteClickSummary(website.id, website.click_count);
    } catch (error) {
      this.ctx.logger.warn('[uied.website.detail] 获取网站点击汇总失败，忽略:', error.message);
    }

    // 转换字段名和类型
    const normalizedStatus = this.normalizeWebsiteStatus(website.status, undefined, 'active');
    const tagBundle = this.parseWebsiteTagBundle(website.tags);
    const websiteCategoryIdMap = await this.getWebsiteCategoryIdMap([ website.id ]);
    const categoryIds = websiteCategoryIdMap.get(Number(website.id || 0)) || [];
    if (categoryIds.length === 0 && Number(website.category_id || 0) > 0) {
      categoryIds.push(Number(website.category_id));
    }
    return {
      id: website.id,
      name: website.name,
      slug: website.slug,
      description: website.description,
      url: website.url,
      iconUrl: website.icon_url,
      categoryId: website.category_id,
      categoryIds,
      categoryName: website.categoryName,
      categorySlug: website.categorySlug,
      isNew: website.is_new === 1,
      isFeatured: website.is_featured === 1,
      isHot: website.is_hot === 1,
      isPinned: website.is_pinned === 1,
      tags: tagBundle.tags,
      weightTags: tagBundle.weightTags,
      order: website.sort,
      clickCount: website.click_count,
      seoTitle: website.seo_title,
      seoDescription: website.seo_description,
      seoKeywords: website.seo_keywords,
      detailContent: website.detail_content,
      screenshots: website.screenshots ? JSON.parse(website.screenshots) : [],
      thumbnail: website.thumbnail,
      visitBtnText: website.visit_btn_text,
      trafficMetrics,
      clickMetrics,
      status: normalizedStatus,
      statusReason: String(website.status_message || website.check_error || '').trim(),
      lastCheckedAt: (() => {
        const raw = Number(website.last_checked_at || website.last_check_time || 0);
        if (!Number.isFinite(raw) || raw <= 0) return null;
        const milliseconds = raw > 9999999999 ? raw : raw * 1000;
        return new Date(milliseconds).toISOString();
      })(),
      createdAt: website.create_time,
      updatedAt: website.update_time,
    };
  }

  /**
   * 创建网站
   */
  async add(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedSlug = this.normalizeVarchar(data.slug, 200, { allowNull: true });
    const normalizedUrl = this.normalizeVarchar(data.url, 500, { allowNull: false, fallback: '' });
    const allowDuplicate = data.allowDuplicate === true;
    const normalizedCategoryIds = this.normalizeWebsiteCategoryIds(data);
    const primaryCategoryId = normalizedCategoryIds[0] || Number.parseInt(String(data.categoryId || 0), 10);

    if (!Number.isInteger(primaryCategoryId) || primaryCategoryId <= 0) {
      throw new Error('请选择所属分类');
    }

    // 检查 URL 是否已存在（忽略协议与尾斜杠差异）
    if (normalizedUrl && !allowDuplicate) {
      const duplicateUrl = await this.findDuplicateWebsiteByUrl(normalizedUrl);
      if (duplicateUrl) {
        throw new Error(`网站URL已存在（ID: ${duplicateUrl.id}，名称：${duplicateUrl.name || '未命名'}）`);
      }
    }

    // 检查 slug 是否已存在
    if (normalizedSlug) {
      const [ existing ] = await app.model.query(
        'SELECT id FROM uied_website WHERE slug = ? AND is_delete = 0',
        { replacements: [ normalizedSlug ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (existing) {
        throw new Error('网站别名已存在');
      }
    }

    const normalizedStatus = this.normalizeWebsiteStatus(data.status, data.isActive, 'unchecked');
    const [ result ] = await app.model.query(
      `INSERT INTO uied_website (name, slug, description, url, icon_url, category_id,
        is_new, is_featured, is_hot, is_pinned, tags, sort, click_count,
        seo_title, seo_description, seo_keywords, detail_content, screenshots, thumbnail, visit_btn_text,
        status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          this.normalizeVarchar(data.name, 200, { allowNull: false, fallback: '' }),
          normalizedSlug,
          data.description || '',
          normalizedUrl,
          this.normalizeVarchar(data.iconUrl, 500, { allowNull: true }),
          primaryCategoryId,
          data.isNew ? 1 : 0,
          data.isFeatured ? 1 : 0,
          data.isHot ? 1 : 0,
          data.isPinned ? 1 : 0,
          JSON.stringify(this.buildStoredWebsiteTags(data.tags, data.weightTags)),
          data.order || 0,
          0,
          this.normalizeVarchar(data.seoTitle, 100, { allowNull: true }),
          this.normalizeVarchar(data.seoDescription, 300, { allowNull: true }),
          this.normalizeVarchar(data.seoKeywords, 200, { allowNull: true }),
          data.detailContent || null,
          data.screenshots ? JSON.stringify(data.screenshots) : null,
          this.normalizeVarchar(data.thumbnail, 500, { allowNull: true }),
          this.normalizeVarchar(data.visitBtnText, 50, { allowNull: true }),
          normalizedStatus,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    const websiteId = Number(result || 0);
    if (websiteId > 0) {
      await this.saveWebsiteCategoryRelations(
        websiteId,
        normalizedCategoryIds.length > 0 ? normalizedCategoryIds : [ primaryCategoryId ],
        now
      );
    }
    if (websiteId > 0 && data.trafficMetrics !== undefined) {
      try {
        await this.ctx.service.uied.websiteTrafficMetric.saveByWebsiteId(websiteId, data.trafficMetrics || {});
      } catch (error) {
        this.ctx.logger.warn('[uied.website.add] 保存网站访问数据失败，忽略:', error.message);
      }
    }

    return { id: result, ...data };
  }


  /**
   * 更新网站
   */
  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const hasSlugField = Object.prototype.hasOwnProperty.call(data, 'slug');
    const hasCategoryIdField = Object.prototype.hasOwnProperty.call(data, 'categoryId');
    const hasCategoryIdsField = Object.prototype.hasOwnProperty.call(data, 'categoryIds');
    const normalizedSlug = hasSlugField
      ? this.normalizeVarchar(data.slug, 200, { allowNull: true })
      : undefined;
    const normalizedCategoryIds = hasCategoryIdField || hasCategoryIdsField
      ? this.normalizeWebsiteCategoryIds(data)
      : [];

    // 检查网站是否存在
    const [ existing ] = await app.model.query(
      'SELECT id, tags, category_id as categoryId FROM uied_website WHERE id = ? AND is_delete = 0',
      { replacements: [ data.id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!existing) {
      throw new Error('网站不存在');
    }

    // 检查 slug 是否被其他网站使用
    if (hasSlugField && normalizedSlug) {
      const [ slugExists ] = await app.model.query(
        'SELECT id FROM uied_website WHERE slug = ? AND id != ? AND is_delete = 0',
        { replacements: [ normalizedSlug, data.id ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (slugExists) {
        throw new Error('网站别名已存在');
      }
    }

    const primaryCategoryIdForUpdate = hasCategoryIdField || hasCategoryIdsField
      ? (normalizedCategoryIds[0] || Number.parseInt(String(data.categoryId || existing.categoryId || 0), 10))
      : Number.parseInt(String(existing.categoryId || 0), 10);
    if ((hasCategoryIdField || hasCategoryIdsField)
      && (!Number.isInteger(primaryCategoryIdForUpdate) || primaryCategoryIdForUpdate <= 0)) {
      throw new Error('请选择所属分类');
    }

    // 构建更新字段
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(this.normalizeVarchar(data.name, 200, { allowNull: false, fallback: '' }));
    }
    if (hasSlugField) { updates.push('slug = ?'); values.push(normalizedSlug); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.url !== undefined) {
      const normalizedUrl = this.normalizeVarchar(data.url, 500, { allowNull: false, fallback: '' });
      /**
       * 按业务要求：编辑态不拦截重复网址。
       * 说明：
       * 1. 重复提醒仅保留在“获取网站信息”动作中（前端提示）。
       * 2. 新增网站仍保留重复拦截，避免新增脏数据。
       */
      updates.push('url = ?');
      values.push(normalizedUrl);
    }
    if (data.iconUrl !== undefined) {
      updates.push('icon_url = ?');
      values.push(this.normalizeVarchar(data.iconUrl, 500, { allowNull: true }));
    }
    if (hasCategoryIdField || hasCategoryIdsField) {
      updates.push('category_id = ?');
      values.push(primaryCategoryIdForUpdate);
    }
    if (data.isNew !== undefined) { updates.push('is_new = ?'); values.push(data.isNew ? 1 : 0); }
    if (data.isFeatured !== undefined) { updates.push('is_featured = ?'); values.push(data.isFeatured ? 1 : 0); }
    if (data.isHot !== undefined) { updates.push('is_hot = ?'); values.push(data.isHot ? 1 : 0); }
    if (data.isPinned !== undefined) { updates.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0); }
    if (data.tags !== undefined || data.weightTags !== undefined) {
      const storedTagBundle = this.parseWebsiteTagBundle(existing.tags);
      const nextTags = data.tags !== undefined ? data.tags : storedTagBundle.tags;
      const nextWeightTags = data.weightTags !== undefined ? data.weightTags : storedTagBundle.weightTags;
      updates.push('tags = ?');
      values.push(JSON.stringify(this.buildStoredWebsiteTags(nextTags, nextWeightTags)));
    }
    if (data.order !== undefined) { updates.push('sort = ?'); values.push(data.order); }
    if (data.seoTitle !== undefined) {
      updates.push('seo_title = ?');
      values.push(this.normalizeVarchar(data.seoTitle, 100, { allowNull: true }));
    }
    if (data.seoDescription !== undefined) {
      updates.push('seo_description = ?');
      values.push(this.normalizeVarchar(data.seoDescription, 300, { allowNull: true }));
    }
    if (data.seoKeywords !== undefined) {
      updates.push('seo_keywords = ?');
      values.push(this.normalizeVarchar(data.seoKeywords, 200, { allowNull: true }));
    }
    if (data.detailContent !== undefined) { updates.push('detail_content = ?'); values.push(data.detailContent); }
    if (data.screenshots !== undefined) { updates.push('screenshots = ?'); values.push(JSON.stringify(data.screenshots)); }
    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      values.push(this.normalizeVarchar(data.thumbnail, 500, { allowNull: true }));
    }
    if (data.visitBtnText !== undefined) {
      updates.push('visit_btn_text = ?');
      values.push(this.normalizeVarchar(data.visitBtnText, 50, { allowNull: true }));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(this.normalizeWebsiteStatus(data.status, data.isActive, 'unchecked'));
    }
    if (data.status === undefined && data.isActive !== undefined) {
      updates.push('status = ?');
      values.push(this.normalizeWebsiteStatus(undefined, data.isActive, 'unchecked'));
    }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_website SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    if (hasCategoryIdField || hasCategoryIdsField) {
      await this.saveWebsiteCategoryRelations(
        Number(data.id),
        normalizedCategoryIds.length > 0 ? normalizedCategoryIds : [ primaryCategoryIdForUpdate ],
        now
      );
    }

    if (data.trafficMetrics !== undefined) {
      try {
        await this.ctx.service.uied.websiteTrafficMetric.saveByWebsiteId(data.id, data.trafficMetrics || {});
      } catch (error) {
        this.ctx.logger.warn('[uied.website.edit] 保存网站访问数据失败，忽略:', error.message);
      }
    }

    return data;
  }

  /**
   * 删除网站
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const websiteId = Number.parseInt(String(id || 0), 10);
    if (!Number.isInteger(websiteId) || websiteId <= 0) return;

    await app.model.query(
      'UPDATE uied_website SET is_delete = 1, delete_time = ?, update_time = ? WHERE id = ? AND is_delete = 0',
      { replacements: [ now, now, websiteId ], type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.ensureWebsiteCategoryTable();
    await app.model.query(
      'UPDATE uied_website_category SET is_delete = 1, update_time = ? WHERE website_id = ? AND is_delete = 0',
      { replacements: [ now, websiteId ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 批量删除网站
   */
  async batchDel(ids) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const websiteIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (websiteIds.length === 0) return;

    await app.model.query(
      'UPDATE uied_website SET is_delete = 1, delete_time = ?, update_time = ? WHERE id IN (?) AND is_delete = 0',
      { replacements: [ now, now, websiteIds ], type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.ensureWebsiteCategoryTable();
    await app.model.query(
      'UPDATE uied_website_category SET is_delete = 1, update_time = ? WHERE website_id IN (?) AND is_delete = 0',
      { replacements: [ now, websiteIds ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 从回收站恢复网站。
   * @param {number|string} id 网站ID
   */
  async restore(id) {
    return this.batchRestore([ id ]);
  }

  /**
   * 批量恢复回收站网站。
   * @param {Array<number|string>} ids 网站ID列表
   */
  async batchRestore(ids) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const websiteIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ ids ])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (websiteIds.length === 0) return;

    await app.model.query(
      'UPDATE uied_website SET is_delete = 0, delete_time = 0, update_time = ? WHERE id IN (?) AND is_delete = 1',
      { replacements: [ now, websiteIds ], type: app.Sequelize.QueryTypes.UPDATE }
    );
    await this.ensureWebsiteCategoryTable();
    await app.model.query(
      'UPDATE uied_website_category SET is_delete = 0, update_time = ? WHERE website_id IN (?)',
      { replacements: [ now, websiteIds ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 按网站ID执行容错删除（关联清理）。
   * @param {string} tableName 表名
   * @param {string} columnName 关联字段
   * @param {number[]} websiteIds 网站ID列表
   */
  async safeDeleteByWebsiteIds(tableName, columnName, websiteIds) {
    const { app } = this;
    if (!Array.isArray(websiteIds) || websiteIds.length === 0) return;
    try {
      await app.model.query(
        `DELETE FROM \`${tableName}\` WHERE \`${columnName}\` IN (?)`,
        { replacements: [ websiteIds ], type: app.Sequelize.QueryTypes.DELETE }
      );
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      this.ctx.logger.warn(`[website] 清理表 ${tableName} 失败，按兼容策略忽略:`, error.message);
    }
  }

  /**
   * 彻底删除网站（仅回收站）。
   * @param {number|string} id 网站ID
   */
  async realDelete(id) {
    return this.batchRealDelete([ id ]);
  }

  /**
   * 批量彻底删除网站（仅回收站）。
   * @param {Array<number|string>} ids 网站ID列表
   */
  async batchRealDelete(ids) {
    const { app } = this;
    const websiteIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ ids ])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (websiteIds.length === 0) return;

    await this.safeDeleteByWebsiteIds('uied_website_category', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_website_traffic_metric', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_website_comment', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_website_favorite', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_website_like', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_website_rating', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_user_website_interaction', 'website_id', websiteIds);
    await this.safeDeleteByWebsiteIds('uied_article_website_relation', 'website_id', websiteIds);
    await app.model.query(
      'DELETE FROM uied_website WHERE id IN (?) AND is_delete = 1',
      { replacements: [ websiteIds ], type: app.Sequelize.QueryTypes.DELETE }
    );
  }

  /**
   * 批量移动网站分类与标签。
   * @param {Object} payload 批量参数
   * @param {Array<number|string>} payload.ids 网站ID列表
   * @param {boolean} payload.applyCategory 是否应用分类变更
   * @param {number|string} payload.categoryId 主分类ID
   * @param {Array<number|string>|string} payload.categoryIds 分类ID列表
   * @param {boolean} payload.applyTags 是否应用标签变更
   * @param {Array<string>|string} payload.tags 目标标签（普通标签）
   * @param {Array<number|string>|string} payload.tagIds 目标标签ID（从网站标签库取名称）
   * @return {Promise<{updated:number,categoryUpdated:number,tagUpdated:number}>} 更新结果
   */
  async batchMove(payload = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const websiteIds = Array.from(
      new Set(
        (Array.isArray(payload.ids) ? payload.ids : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (websiteIds.length === 0) {
      throw new Error('请选择要操作的网站');
    }

    const applyCategory = payload.applyCategory === true;
    const applyTags = payload.applyTags === true;
    let categoryUpdated = 0;
    let tagUpdated = 0;

    if (applyCategory) {
      const normalizedCategoryIds = this.normalizeWebsiteCategoryIds(payload);
      const primaryCategoryId = normalizedCategoryIds[0] || 0;
      if (!Number.isInteger(primaryCategoryId) || primaryCategoryId <= 0) {
        throw new Error('请选择有效的目标分类');
      }

      await app.model.query(
        'UPDATE uied_website SET category_id = ?, update_time = ? WHERE id IN (?) AND is_delete = 0',
        {
          replacements: [ primaryCategoryId, now, websiteIds ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      for (const websiteId of websiteIds) {
        await this.saveWebsiteCategoryRelations(websiteId, normalizedCategoryIds, now);
      }
      categoryUpdated = websiteIds.length;
    }

    if (applyTags) {
      let nextTags = this.parseStringList(payload.tags);
      const tagIds = this.parseCategoryIdList(payload.tagIds);
      if (nextTags.length === 0 && tagIds.length > 0) {
        const tagRows = await app.model.query(
          'SELECT name FROM uied_website_tag WHERE id IN (?) AND is_delete = 0',
          { replacements: [ tagIds ], type: app.Sequelize.QueryTypes.SELECT }
        );
        nextTags = Array.from(
          new Set(
            (Array.isArray(tagRows) ? tagRows : [])
              .map(item => String(item?.name || '').trim())
              .filter(Boolean)
          )
        );
      }
      const websiteRows = await app.model.query(
        'SELECT id, tags FROM uied_website WHERE id IN (?) AND is_delete = 0',
        { replacements: [ websiteIds ], type: app.Sequelize.QueryTypes.SELECT }
      );
      for (const row of Array.isArray(websiteRows) ? websiteRows : []) {
        const websiteId = Number.parseInt(String(row?.id || 0), 10);
        if (!Number.isInteger(websiteId) || websiteId <= 0) continue;
        const currentBundle = this.parseWebsiteTagBundle(row?.tags);
        const nextStoredTags = this.buildStoredWebsiteTags(nextTags, currentBundle.weightTags);
        await app.model.query(
          'UPDATE uied_website SET tags = ?, update_time = ? WHERE id = ?',
          {
            replacements: [ JSON.stringify(nextStoredTags), now, websiteId ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
      }
      tagUpdated = websiteIds.length;
    }

    return {
      updated: websiteIds.length,
      categoryUpdated,
      tagUpdated,
    };
  }

  /**
   * 一键清空网站回收站（支持按筛选条件清理）。
   * @param {Object} params 筛选参数
   * @return {Promise<{deleted:number}>} 清理结果
   */
  async clearRecycle(params = {}) {
    const { app } = this;
    let whereClause = 'w.is_delete = 1';
    const replacements = [];

    const categoryIdList = Array.from(
      new Set([
        ...this.parseCategoryIdList(params.categoryId),
        ...this.parseCategoryIdList(params.categoryIds),
      ])
    );
    if (categoryIdList.length > 0) {
      let effectiveCategoryIds = [ ...categoryIdList ];
      const includeChildren = params.includeChildren === true
        || params.includeChildren === 'true'
        || params.includeChildren === '1';
      if (includeChildren) {
        const childRows = await app.model.query(
          'SELECT id FROM uied_category WHERE parent_id IN (?) AND is_delete = 0',
          {
            replacements: [ categoryIdList ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );
        const childIds = (Array.isArray(childRows) ? childRows : [])
          .map(item => Number.parseInt(String(item?.id || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0);
        effectiveCategoryIds = Array.from(new Set([ ...effectiveCategoryIds, ...childIds ]));
      }
      const placeholders = effectiveCategoryIds.map(() => '?').join(',');
      whereClause += ` AND (
        w.category_id IN (${placeholders})
        OR EXISTS (
          SELECT 1
          FROM uied_website_category uwc
          WHERE uwc.website_id = w.id
            AND uwc.is_delete = 0
            AND uwc.category_id IN (${placeholders})
        )
      )`;
      replacements.push(...effectiveCategoryIds, ...effectiveCategoryIds);
    }

    const keyword = String(params.keyword || '').trim();
    if (keyword) {
      whereClause += ' AND (w.name LIKE ? OR w.description LIKE ? OR w.url LIKE ? OR w.slug LIKE ? OR w.tags LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      replacements.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    const parsedStatusList = (() => {
      const normalizedStatusList = this.parseStringList(params.statusList).map(item => item.toLowerCase());
      if (normalizedStatusList.length > 0) {
        return Array.from(new Set(normalizedStatusList));
      }
      return Array.from(new Set(this.parseStringList(params.status).map(item => item.toLowerCase())));
    })();
    if (parsedStatusList.length > 0) {
      const includesPublished = parsedStatusList.some(item => item === 'active' || item === 'normal');
      const exactStatuses = parsedStatusList.filter(item => item !== 'active' && item !== 'normal');
      const statusClauses = [];
      if (includesPublished) {
        statusClauses.push("(w.status IN ('active', 'normal') OR w.status IS NULL OR w.status = '')");
      }
      if (exactStatuses.length > 0) {
        statusClauses.push(`w.status IN (${exactStatuses.map(() => '?').join(',')})`);
        replacements.push(...exactStatuses);
      }
      if (statusClauses.length > 0) {
        whereClause += ` AND (${statusClauses.join(' OR ')})`;
      }
    }

    const rows = await app.model.query(
      `SELECT w.id
       FROM uied_website w
       WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );
    const websiteIds = Array.from(
      new Set(
        (Array.isArray(rows) ? rows : [])
          .map(item => Number.parseInt(String(item?.id || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
    if (websiteIds.length === 0) {
      return { deleted: 0 };
    }

    await this.batchRealDelete(websiteIds);
    return { deleted: websiteIds.length };
  }

  /**
   * 增加点击次数
   */
  async incrementClick(id) {
    const { app } = this;
    const normalizedId = Number.parseInt(String(id || 0), 10);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('网站ID无效');
    }
    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_website WHERE id = ? AND is_delete = 0 LIMIT 1',
      { replacements: [ normalizedId ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!existing) {
      throw new Error('网站不存在');
    }
    await app.model.query(
      'UPDATE uied_website SET click_count = click_count + 1 WHERE id = ? AND is_delete = 0',
      { replacements: [ normalizedId ], type: app.Sequelize.QueryTypes.UPDATE }
    );
    try {
      await this.recordWebsiteDailyClick(normalizedId);
    } catch (error) {
      this.ctx.logger.warn('[uied.website] 记录点击日统计失败（不影响主点击计数）: %s', error?.message || error);
    }
  }

  /**
   * 前台点击上报入口（兼容旧调用：ctx.service.uied.website.click）。
   * @param {number|string} id 网站ID
   * @return {Promise<{success:boolean, websiteId:number}>}
   */
  async click(id) {
    const websiteId = Number.parseInt(String(id || 0), 10);
    if (!Number.isInteger(websiteId) || websiteId <= 0) {
      throw new Error('网站ID无效');
    }
    await this.incrementClick(websiteId);
    return {
      success: true,
      websiteId,
    };
  }

  /**
   * 搜索网站
   */
  async search({ keyword, pageSlug, page = 1, pageSize = 20 }) {
    const { app } = this;
    const normalizedKeyword = String(keyword || '').trim();
    if (!normalizedKeyword) {
      return {
        lists: [],
        count: 0,
        page,
        pageSize,
      };
    }

    const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0
      ? Math.min(Number(pageSize), 100)
      : 20;
    const offset = (safePage - 1) * safePageSize;
    const likeKeyword = `%${normalizedKeyword}%`;
    const prefixKeyword = `${normalizedKeyword}%`;
    const keywordForUrl = this.extractWebsiteCompareHost(normalizedKeyword) || normalizedKeyword;
    const urlLikeKeyword = `%${keywordForUrl}%`;

    let whereClause = `w.is_delete = 0 AND (
      w.name LIKE ?
      OR w.description LIKE ?
      OR w.tags LIKE ?
      OR w.url LIKE ?
      OR w.slug LIKE ?
    )`;
    const replacements = [ likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword ];

    // 如果指定了页面，只搜索该页面的分类下的网站
    if (pageSlug) {
      whereClause += ` AND (
        w.category_id IN (
          SELECT pc.category_id FROM uied_page_category pc
          INNER JOIN uied_page p ON pc.page_id = p.id
          WHERE p.slug = ? AND pc.is_delete = 0
        )
        OR EXISTS (
          SELECT 1
          FROM uied_website_category uwc
          WHERE uwc.website_id = w.id
            AND uwc.is_delete = 0
            AND uwc.category_id IN (
              SELECT pc.category_id FROM uied_page_category pc
              INNER JOIN uied_page p ON pc.page_id = p.id
              WHERE p.slug = ? AND pc.is_delete = 0
            )
        )
      )`;
      replacements.push(pageSlug);
      replacements.push(pageSlug);
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_website w WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const relevanceSql = `(
      CASE
        WHEN w.name = ? THEN 120
        WHEN w.slug = ? THEN 110
        WHEN w.url = ? THEN 100
        WHEN w.name LIKE ? THEN 90
        WHEN w.slug LIKE ? THEN 86
        WHEN w.url LIKE ? THEN 82
        WHEN w.url LIKE ? THEN 80
        WHEN w.tags LIKE ? THEN 70
        WHEN w.description LIKE ? THEN 60
        ELSE 0
      END
    )`;

    // 获取列表
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot,
              w.tags, w.click_count as clickCount,
              ${relevanceSql} as relevanceScore
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}
       ORDER BY relevanceScore DESC, w.click_count DESC, w.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [
          ...replacements,
          normalizedKeyword,
          normalizedKeyword,
          normalizedKeyword,
          prefixKeyword,
          prefixKeyword,
          prefixKeyword,
          urlLikeKeyword,
          likeKeyword,
          likeKeyword,
          safePageSize,
          offset,
        ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const list = websites.map(w => ({
      ...w,
      isNew: w.isNew === 1,
      isFeatured: w.isFeatured === 1,
      isHot: w.isHot === 1,
      ...this.parseWebsiteTagBundle(w.tags),
    }));

    return {
      lists: list,
      count: countResult.total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  /**
   * 通过ID列表获取网站（支持新数字ID和旧cuid格式）
   */
  async getByIds(ids) {
    const { app } = this;
    if (!ids || ids.length === 0) return [];

    // 分离数字ID和字符串ID（旧cuid格式）
    const numericIds = ids.filter(id => /^\d+$/.test(String(id)));
    const stringIds = ids.filter(id => !/^\d+$/.test(String(id)));

    const whereConditions = [];
    const replacements = [];

    if (numericIds.length > 0) {
      whereConditions.push(`w.id IN (${numericIds.join(',')})`);
    }

    if (stringIds.length > 0) {
      const placeholders = stringIds.map(() => '?').join(',');
      whereConditions.push(`w.old_id IN (${placeholders})`);
      replacements.push(...stringIds);
    }

    if (whereConditions.length === 0) return [];

    const websites = await app.model.query(
      `SELECT w.id, w.old_id as oldId, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot,
              w.tags, w.click_count as clickCount
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE w.is_delete = 0 AND (${whereConditions.join(' OR ')})`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    return websites.map(w => ({
      ...w,
      isNew: w.isNew === 1,
      isFeatured: w.isFeatured === 1,
      isHot: w.isHot === 1,
      ...this.parseWebsiteTagBundle(w.tags),
    }));
  }
}

module.exports = WebsiteService;
