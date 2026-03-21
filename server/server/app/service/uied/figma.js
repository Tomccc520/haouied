/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file service/uied/figma.js
 * @description Figma插件 内容中心服务
 */

'use strict';

const Service = require('egg').Service;

class UiedFigmaService extends Service {
  /**
   * 规范化域名白名单（支持数组 / 逗号文本 / 换行文本）。
   * @param {Array<string>|string} input 原始域名配置
   * @param {Array<string>} fallback 默认值
   * @return {Array<string>}
   */
  normalizeInsecureDomainList(input, fallback = []) {
    const source = Array.isArray(input)
      ? input
      : String(input || '').split(/[\n,;\s]+/);
    const list = source
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean)
      .map(item => item.replace(/^https?:\/\//, ''))
      .map(item => item.replace(/\/+$/, ''))
      .filter(item => /^[a-z0-9.-]+$/.test(item));
    const merged = list.length
      ? list
      : (Array.isArray(fallback) ? fallback.map(item => String(item || '').trim().toLowerCase()).filter(Boolean) : []);
    return Array.from(new Set(merged));
  }

  /**
   * 判断错误是否为 TLS 证书链异常。
   * @param {Error} error 错误对象
   * @return {boolean}
   */
  isTlsIssuerError(error) {
    const message = String(error && error.message ? error.message : '').toLowerCase();
    const code = String(error && error.code ? error.code : '').toUpperCase();
    return (
      message.includes('unable to get local issuer certificate')
      || message.includes('self-signed certificate')
      || message.includes('unable to verify the first certificate')
      || code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
      || code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
      || code === 'SELF_SIGNED_CERT_IN_CHAIN'
      || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    );
  }

  /**
   * 判断域名是否命中 TLS 宽松校验白名单（支持子域名）。
   * @param {string} host 请求域名
   * @param {Array<string>} whitelist 白名单
   * @return {boolean}
   */
  matchInsecureTlsHost(host = '', whitelist = []) {
    const normalizedHost = String(host || '').trim().toLowerCase();
    if (!normalizedHost) return false;
    const domains = Array.isArray(whitelist) ? whitelist : [];
    return domains.some(domain => {
      const normalizedDomain = String(domain || '').trim().toLowerCase();
      if (!normalizedDomain) return false;
      return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
    });
  }

  /**
   * 获取 Figma 官方采集网络配置（TLS 证书容错）。
   * 说明：仅在证书链异常时，且命中白名单域名，才会降级为不校验证书重试。
   * @return {Promise<{allowInsecureTls:boolean,insecureDomains:Array<string>}>}
   */
  async getOfficialImportNetworkConfig() {
    const { ctx } = this;
    let allowInsecureTls = true;
    let insecureDomains = [ 'figma.com', 'www.figma.com' ];

    try {
      const importConfig = await ctx.service.uied.aiConfig.getImportConfig();
      const networkConfig = importConfig?.network || importConfig?.remoteImageTransfer || {};
      if (Object.prototype.hasOwnProperty.call(networkConfig, 'allowInsecureTls')) {
        allowInsecureTls = Boolean(networkConfig.allowInsecureTls);
      }
      insecureDomains = this.normalizeInsecureDomainList(
        networkConfig.insecureDomains,
        insecureDomains
      );
    } catch (error) {
      ctx.logger.warn('[uied.figma] 读取 AI 导入网络配置失败，采用默认 Figma 域名白名单: %s', error?.message || error);
    }

    if (process.env.UIED_REMOTE_ALLOW_INSECURE_TLS !== undefined) {
      const raw = String(process.env.UIED_REMOTE_ALLOW_INSECURE_TLS || '').trim().toLowerCase();
      allowInsecureTls = raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
    }
    if (process.env.UIED_REMOTE_INSECURE_DOMAINS) {
      insecureDomains = this.normalizeInsecureDomainList(
        process.env.UIED_REMOTE_INSECURE_DOMAINS,
        insecureDomains
      );
    }

    return {
      allowInsecureTls,
      insecureDomains,
    };
  }

  /**
   * 确保 Figma 插件中心相关数据表存在。
   * 说明：支持历史数据库未执行 SQL 补丁时自动兜底建表，降低部署失败风险。
   */
  async ensureTables() {
    if (this._figmaTablesReady) return;
    const { app } = this;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_figma_plugin_category\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '分类名称',
        \`slug\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '分类标识',
        \`description\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '分类描述',
        \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序',
        \`seo_title\` VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'SEO标题',
        \`seo_keywords\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'SEO关键词',
        \`seo_description\` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'SEO描述',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_figma_plugin_category_slug\` (\`slug\`),
        KEY \`idx_figma_plugin_category_sort\` (\`sort_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件分类表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_figma_plugin_tag\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '标签名称',
        \`slug\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '标签标识',
        \`description\` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '标签描述',
        \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_figma_plugin_tag_slug\` (\`slug\`),
        KEY \`idx_figma_plugin_tag_sort\` (\`sort_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件标签表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_figma_plugin\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(220) NOT NULL DEFAULT '' COMMENT '插件名称',
        \`slug\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '插件标识',
        \`summary\` TEXT COMMENT '摘要',
        \`content\` LONGTEXT COMMENT '详情正文',
        \`icon_url\` VARCHAR(1024) DEFAULT NULL COMMENT '图标地址',
        \`cover_url\` VARCHAR(1024) DEFAULT NULL COMMENT '封面地址',
        \`official_url\` VARCHAR(1024) DEFAULT NULL COMMENT 'Figma 官方链接',
        \`docs_url\` VARCHAR(1024) DEFAULT NULL COMMENT '文档链接',
        \`github_url\` VARCHAR(1024) DEFAULT NULL COMMENT 'GitHub 链接',
        \`figma_plugin_id\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'Figma 官方插件ID',
        \`author_name\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '作者名称',
        \`transport_type\` VARCHAR(32) NOT NULL DEFAULT 'http' COMMENT '保留字段-协议类型',
        \`runtime\` VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT '保留字段-运行时',
        \`protocol_version\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '保留字段-协议版本',
        \`category_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态 draft/published',
        \`is_recommended\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐',
        \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序',
        \`publish_time\` BIGINT DEFAULT NULL COMMENT '发布时间',
        \`click_count\` BIGINT NOT NULL DEFAULT 0 COMMENT '点击量',
        \`view_count\` BIGINT NOT NULL DEFAULT 0 COMMENT '浏览量',
        \`seo_title\` VARCHAR(220) NOT NULL DEFAULT '' COMMENT 'SEO标题',
        \`seo_keywords\` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'SEO关键词',
        \`seo_description\` VARCHAR(2000) NOT NULL DEFAULT '' COMMENT 'SEO描述',
        \`source_type\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '来源类型',
        \`source_url\` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '来源地址',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_figma_plugin_slug\` (\`slug\`),
        KEY \`idx_figma_plugin_category\` (\`category_id\`),
        KEY \`idx_figma_plugin_status\` (\`status\`),
        KEY \`idx_figma_plugin_recommend\` (\`is_recommended\`),
        KEY \`idx_figma_plugin_sort\` (\`sort_order\`),
        KEY \`idx_figma_plugin_publish\` (\`publish_time\`),
        KEY \`idx_figma_plugin_update\` (\`update_time\`),
        KEY \`idx_figma_plugin_source\` (\`figma_plugin_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件内容表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_figma_plugin_item_tag\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`item_id\` BIGINT UNSIGNED NOT NULL COMMENT '插件ID',
        \`tag_id\` BIGINT UNSIGNED NOT NULL COMMENT '标签ID',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_figma_plugin_item_tag\` (\`item_id\`, \`tag_id\`),
        KEY \`idx_figma_plugin_item_tag_item\` (\`item_id\`),
        KEY \`idx_figma_plugin_item_tag_tag\` (\`tag_id\`),
        KEY \`idx_figma_plugin_item_tag_delete\` (\`is_delete\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 插件标签关联表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    this._figmaTablesReady = true;
  }

  /**
   * 解析正整数参数。
   * @param {unknown} value 原始值
   * @param {number} defaultValue 默认值
   * @return {number}
   */
  parsePositiveInt(value, defaultValue = 0) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return defaultValue;
    }
    return parsed;
  }

  /**
   * 将数值限制在指定区间内。
   * @param {number} value 原始值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @return {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 判断文本中是否包含中文字符。
   * @param {string} value 原始文本
   * @return {boolean}
   */
  hasChinese(value = '') {
    return /[\u4e00-\u9fa5]/.test(String(value || ''));
  }

  /**
   * 解码常见 HTML 实体，避免标题/摘要出现编码字符。
   * @param {string} value 原始文本
   * @return {string}
   */
  decodeHtmlEntities(value = '') {
    const text = String(value || '');
    if (!text) return '';
    return text
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, '\'')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_m, code) => {
        const num = Number.parseInt(String(code || ''), 10);
        if (!Number.isFinite(num) || num <= 0) return '';
        return String.fromCharCode(num);
      });
  }

  /**
   * 拉取网页 HTML 文本。
   * @param {string} url 页面地址
   * @return {Promise<string>}
   */
  async fetchHtml(url) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) return '';
    const { ctx } = this;
    const networkConfig = await this.getOfficialImportNetworkConfig();
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    };

    /**
     * 执行一次 HTML 抓取，支持切换 TLS 校验策略。
     * @param {boolean} rejectUnauthorized 是否严格校验证书
     * @return {Promise<string>}
     */
    const curlOnce = async (rejectUnauthorized = true) => {
      const response = await ctx.curl(targetUrl, {
        method: 'GET',
        dataType: 'text',
        timeout: 25000,
        followRedirect: true,
        rejectUnauthorized,
        headers,
      });
      return String(response?.data || '');
    };

    try {
      return await curlOnce(true);
    } catch (error) {
      const shouldRetryInsecure = (() => {
        if (!this.isTlsIssuerError(error)) return false;
        if (!networkConfig.allowInsecureTls) return false;
        try {
          const host = String(new URL(targetUrl).hostname || '').trim().toLowerCase();
          const whitelist = Array.isArray(networkConfig.insecureDomains) ? networkConfig.insecureDomains : [];
          return this.matchInsecureTlsHost(host, whitelist);
        } catch (e) {
          return false;
        }
      })();

      if (!shouldRetryInsecure) {
        throw error;
      }
      ctx.logger.warn('[uied.figma] 证书链校验失败，已降级为 rejectUnauthorized=false 重试: %s', targetUrl);
      return await curlOnce(false);
    }
  }

  /**
   * 从 HTML 中提取 meta 字段内容。
   * @param {string} html HTML 内容
   * @param {string[]} names 属性名列表（name/property）
   * @return {string}
   */
  extractMetaContent(html = '', names = []) {
    const source = String(html || '');
    const targets = Array.isArray(names) ? names : [ names ];
    for (const name of targets) {
      const key = String(name || '').trim();
      if (!key) continue;
      const regA = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
      const regB = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["'][^>]*>`, 'i');
      const matched = source.match(regA) || source.match(regB);
      if (matched && matched[1]) {
        return this.decodeHtmlEntities(matched[1]).trim();
      }
    }
    return '';
  }

  /**
   * 从 HTML 文本中提取标题内容。
   * @param {string} html HTML 内容
   * @return {string}
   */
  extractHtmlTitle(html = '') {
    const source = String(html || '');
    const match = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match || !match[1]) return '';
    return this.decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
  }

  /**
   * 清洗 Figma 页面标题，移除站点尾缀。
   * @param {string} value 原始标题
   * @return {string}
   */
  sanitizeFigmaTitle(value = '') {
    return String(value || '')
      .replace(/\s*[\-|｜|]\s*figma.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 从 Figma 社区页面提取插件链接列表。
   * @param {string} html HTML 内容
   * @return {string[]}
   */
  extractPluginLinksFromHtml(html = '') {
    const source = String(html || '');
    const reg = /(?:https?:\/\/www\.figma\.com)?\/community\/plugin\/\d+\/[A-Za-z0-9._~%-]+/gi;
    const urls = new Set();
    let match = reg.exec(source);
    while (match) {
      const raw = String(match[0] || '').trim();
      if (raw) {
        const normalized = this.normalizePluginDetailUrl(raw);
        if (normalized) {
          urls.add(normalized);
        }
      }
      match = reg.exec(source);
    }
    return Array.from(urls);
  }

  /**
   * 从 Figma 插件链接中提取插件 ID。
   * @param {string} url 插件链接
   * @return {string}
   */
  parsePluginIdByUrl(url = '') {
    const text = String(url || '').trim();
    const matched = text.match(/\/community\/plugin\/(\d+)/i);
    return matched && matched[1] ? String(matched[1]) : '';
  }

  /**
   * 规范化 Figma 插件详情链接，确保为官方插件地址。
   * @param {string} url 原始链接
   * @return {string}
   */
  normalizePluginDetailUrl(url = '') {
    const raw = String(url || '').trim();
    if (!raw) return '';
    let full = raw;
    if (raw.startsWith('/')) {
      full = `https://www.figma.com${raw}`;
    } else if (!/^https?:\/\//i.test(raw)) {
      full = `https://${raw}`;
    }
    try {
      const parsed = new URL(full);
      const host = String(parsed.hostname || '').toLowerCase().replace(/^www\./, '');
      if (host !== 'figma.com') return '';
      const pathMatched = String(parsed.pathname || '').match(/^\/community\/plugin\/\d+(?:\/[^/?#]+)?/i);
      if (!pathMatched || !pathMatched[0]) return '';
      return `https://www.figma.com${pathMatched[0].replace(/\/+$/, '')}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * 使用 AI 将英文文本翻译为中文（失败自动降级为原文）。
   * @param {string} source 原文
   * @param {'title'|'summary'} textType 文本类型
   * @param {boolean} enabled 是否启用翻译
   * @return {Promise<string>}
   */
  async translateToChinese(source = '', textType = 'summary', enabled = true) {
    const raw = String(source || '').trim();
    if (!raw) return '';
    if (!enabled) return raw;
    if (this.hasChinese(raw)) return raw;
    const { ctx } = this;
    try {
      const typeLabel = textType === 'title' ? '插件标题' : '插件简介';
      const prompt = [
        `请把以下 Figma 插件${typeLabel}翻译成简体中文。`,
        '要求：',
        '1. 保留产品名或品牌名，不要乱翻译专有名词。',
        '2. 输出纯文本，不要解释，不要加引号，不要分点。',
        `原文：${raw}`,
      ].join('\n');
      const result = await ctx.service.uied.aiConfig.chat(prompt, []);
      const translated = String(result?.reply || '').trim();
      if (!translated) return raw;
      return translated
        .replace(/^["“”'`]+|["“”'`]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      ctx.logger.warn('[uied.figma] AI 汉化失败，已降级原文: %s', error?.message || error);
      return raw;
    }
  }

  /**
   * 规范化 slug，保留英文数字与连字符。
   * @param {string} value 原始文本
   * @return {string}
   */
  normalizeSlug(value = '') {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * 构建唯一 slug（支持排除当前 ID）。
   * @param {string} rawSlug 原始 slug
   * @param {string} fallbackName 兜底名称
   * @param {number} currentId 当前记录 ID
   * @param {'item'|'category'|'tag'} target 目标类型
   * @return {Promise<string>}
   */
  async resolveUniqueSlug(rawSlug = '', fallbackName = '', currentId = 0, target = 'item') {
    const { app } = this;
    let base = this.normalizeSlug(rawSlug) || this.normalizeSlug(fallbackName);
    if (!base) {
      base = `${target}-${Date.now().toString(36)}`;
    }

    const tableMap = {
      item: 'uied_figma_plugin',
      category: 'uied_figma_plugin_category',
      tag: 'uied_figma_plugin_tag',
    };
    const table = tableMap[target] || tableMap.item;

    let candidate = base;
    let seq = 2;
    while (true) {
      const [ row ] = await app.model.query(
        `SELECT id FROM ${table} WHERE slug = ? AND is_delete = 0 AND id != ? LIMIT 1`,
        {
          replacements: [ candidate, Number(currentId || 0) ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      if (!row) {
        return candidate;
      }
      candidate = `${base}-${seq}`;
      seq += 1;
    }
  }

  /**
   * 规范化 Figma插件 条目入参。
   * @param {Record<string, any>} data 原始入参
   * @return {Record<string, any>}
   */
  normalizeItemPayload(data = {}) {
    const tagIdsRaw = Array.isArray(data.tagIds) ? data.tagIds : (Array.isArray(data.tag_ids) ? data.tag_ids : []);
    const tagIds = Array.from(new Set(tagIdsRaw.map(item => this.parsePositiveInt(item, 0)).filter(Boolean)));
    const statusRaw = String(data.status || '').trim().toLowerCase();
    const status = statusRaw === 'published' ? 'published' : 'draft';

    return {
      name: String(data.name || '').trim(),
      slug: String(data.slug || '').trim(),
      summary: String(data.summary || '').trim(),
      content: String(data.content || '').trim(),
      iconUrl: String(data.iconUrl || data.icon_url || '').trim(),
      coverUrl: String(data.coverUrl || data.cover_url || '').trim(),
      officialUrl: String(data.officialUrl || data.official_url || '').trim(),
      docsUrl: String(data.docsUrl || data.docs_url || '').trim(),
      githubUrl: String(data.githubUrl || data.github_url || '').trim(),
      figmaPluginId: String(data.figmaPluginId || data.figma_plugin_id || '').trim(),
      authorName: String(data.authorName || data.author_name || '').trim(),
      sourceType: String(data.sourceType || data.source_type || '').trim(),
      sourceUrl: String(data.sourceUrl || data.source_url || '').trim(),
      transportType: String(data.transportType || data.transport_type || '').trim() || 'http',
      runtime: String(data.runtime || '').trim() || 'other',
      protocolVersion: String(data.protocolVersion || data.protocol_version || '').trim(),
      categoryId: this.parsePositiveInt(data.categoryId ?? data.category_id, 0) || null,
      status,
      isRecommended: Number(data.isRecommended ?? data.is_recommended ?? 0) === 1 ? 1 : 0,
      sortOrder: Number.isFinite(Number(data.sortOrder ?? data.sort_order))
        ? Number(data.sortOrder ?? data.sort_order)
        : 0,
      publishTime: this.parsePositiveInt(data.publishTime ?? data.publish_time, 0) || null,
      seoTitle: String(data.seoTitle || data.seo_title || '').trim(),
      seoKeywords: String(data.seoKeywords || data.seo_keywords || '').trim(),
      seoDescription: String(data.seoDescription || data.seo_description || '').trim(),
      tagIds,
    };
  }

  /**
   * 批量保存条目标签关联。
   * @param {number} itemId Figma插件 条目 ID
   * @param {number[]} tagIds 标签 ID 列表
   * @return {Promise<void>}
   */
  async saveItemTags(itemId, tagIds = []) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedItemId = this.parsePositiveInt(itemId, 0);
    if (!normalizedItemId) return;

    await app.model.query(
      'UPDATE uied_figma_plugin_item_tag SET is_delete = 1, update_time = ? WHERE item_id = ? AND is_delete = 0',
      {
        replacements: [ now, normalizedItemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    if (!Array.isArray(tagIds) || tagIds.length === 0) return;

    for (const tagId of tagIds) {
      const normalizedTagId = this.parsePositiveInt(tagId, 0);
      if (!normalizedTagId) continue;
      const [ existing ] = await app.model.query(
        'SELECT id FROM uied_figma_plugin_item_tag WHERE item_id = ? AND tag_id = ? LIMIT 1',
        {
          replacements: [ normalizedItemId, normalizedTagId ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      if (existing) {
        await app.model.query(
          'UPDATE uied_figma_plugin_item_tag SET is_delete = 0, update_time = ? WHERE id = ?',
          {
            replacements: [ now, existing.id ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
      } else {
        await app.model.query(
          `INSERT INTO uied_figma_plugin_item_tag
           (item_id, tag_id, is_delete, create_time, update_time)
           VALUES (?, ?, 0, ?, ?)`,
          {
            replacements: [ normalizedItemId, normalizedTagId, now, now ],
            type: app.Sequelize.QueryTypes.INSERT,
          }
        );
      }
    }
  }

  /**
   * 获取后台 Figma插件 条目分页列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async list(params = {}) {
    await this.ensureTables();
    const { app } = this;
    const page = this.parsePositiveInt(params.page ?? params.pageNo, 1);
    const pageSize = this.parsePositiveInt(params.pageSize, 20);
    const offset = (page - 1) * pageSize;

    const keyword = String(params.keyword || '').trim();
    const categoryId = this.parsePositiveInt(params.categoryId ?? params.category_id, 0);
    const tagId = this.parsePositiveInt(params.tagId ?? params.tag_id, 0);
    const status = String(params.status || '').trim();

    let whereSql = 'i.is_delete = 0';
    const replacements = [];

    if (keyword) {
      whereSql += ' AND (i.name LIKE ? OR i.summary LIKE ? OR i.slug LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId > 0) {
      whereSql += ' AND i.category_id = ?';
      replacements.push(categoryId);
    }
    if (status === 'published' || status === 'draft') {
      whereSql += ' AND i.status = ?';
      replacements.push(status);
    }
    if (tagId > 0) {
      whereSql += ` AND EXISTS (
        SELECT 1 FROM uied_figma_plugin_item_tag rel
        WHERE rel.item_id = i.id AND rel.tag_id = ? AND rel.is_delete = 0
      )`;
      replacements.push(tagId);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_figma_plugin i WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.figma_plugin_id AS figmaPluginId, i.author_name AS authorName,
              i.source_type AS sourceType, i.source_url AS sourceUrl,
              i.transport_type AS transportType,
              i.runtime, i.protocol_version AS protocolVersion,
              i.status, i.is_recommended AS isRecommended,
              i.sort_order AS sortOrder, i.publish_time AS publishTime,
              i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.create_time AS createTime, i.update_time AS updateTime,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug,
              (
                SELECT GROUP_CONCAT(t.name ORDER BY t.sort_order ASC, t.id ASC SEPARATOR ',')
                FROM uied_figma_plugin_item_tag rel
                INNER JOIN uied_figma_plugin_tag t ON t.id = rel.tag_id AND t.is_delete = 0
                WHERE rel.item_id = i.id AND rel.is_delete = 0
              ) AS tagNames
       FROM uied_figma_plugin i
       LEFT JOIN uied_figma_plugin_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE ${whereSql}
       ORDER BY i.sort_order ASC, i.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const lists = (Array.isArray(rows) ? rows : []).map(item => ({
      ...item,
      tags: String(item.tagNames || '')
        .split(',')
        .map(tag => String(tag || '').trim())
        .filter(Boolean),
    }));

    return {
      lists,
      count: Number(countRow?.total || 0),
      page,
      pageSize,
    };
  }

  /**
   * 获取 Figma插件 条目详情（后台）。
   * @param {number|string} id 条目 ID
   * @return {Promise<any|null>}
   */
  async detail(id) {
    await this.ensureTables();
    const { app } = this;
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return null;

    const [ row ] = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.content,
              i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.figma_plugin_id AS figmaPluginId, i.author_name AS authorName,
              i.source_type AS sourceType, i.source_url AS sourceUrl,
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.status, i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.category_id AS categoryId,
              c.name AS categoryName, c.slug AS categorySlug,
              i.create_time AS createTime, i.update_time AS updateTime
       FROM uied_figma_plugin i
       LEFT JOIN uied_figma_plugin_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE i.id = ? AND i.is_delete = 0
       LIMIT 1`,
      {
        replacements: [ itemId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!row) return null;

    const tags = await app.model.query(
      `SELECT t.id, t.name, t.slug
       FROM uied_figma_plugin_item_tag rel
       INNER JOIN uied_figma_plugin_tag t ON t.id = rel.tag_id AND t.is_delete = 0
       WHERE rel.item_id = ? AND rel.is_delete = 0
       ORDER BY t.sort_order ASC, t.id ASC`,
      {
        replacements: [ itemId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      ...row,
      tagIds: (Array.isArray(tags) ? tags : []).map(item => Number(item.id || 0)).filter(Boolean),
      tags: Array.isArray(tags) ? tags : [],
    };
  }

  /**
   * 新增 Figma插件 条目。
   * @param {Record<string, any>} data 条目数据
   * @return {Promise<number>}
   */
  async add(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const payload = this.normalizeItemPayload(data);
    const slug = await this.resolveUniqueSlug(payload.slug, payload.name, 0, 'item');

    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_figma_plugin WHERE slug = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ slug ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (existing) {
      throw new Error('Figma插件 标识已存在');
    }

    const publishTime = payload.status === 'published'
      ? (payload.publishTime || now)
      : null;

    const [ result ] = await app.model.query(
      `INSERT INTO uied_figma_plugin
       (name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url,
        figma_plugin_id, author_name, source_type, source_url,
        transport_type, runtime, protocol_version,
        category_id, status, is_recommended, sort_order, publish_time,
        click_count, view_count,
        seo_title, seo_keywords, seo_description,
        is_delete, create_time, update_time)
       VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 0, ?, ?)`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          payload.iconUrl || null,
          payload.coverUrl || null,
          payload.officialUrl || null,
          payload.docsUrl || null,
          payload.githubUrl || null,
          payload.figmaPluginId || '',
          payload.authorName || '',
          payload.sourceType || '',
          payload.sourceUrl || '',
          payload.transportType,
          payload.runtime,
          payload.protocolVersion || null,
          payload.categoryId,
          payload.status,
          payload.isRecommended,
          payload.sortOrder,
          publishTime,
          payload.seoTitle || payload.name,
          payload.seoKeywords || '',
          payload.seoDescription || payload.summary,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    await this.saveItemTags(Number(result || 0), payload.tagIds);
    return Number(result || 0);
  }

  /**
   * 编辑 Figma插件 条目。
   * @param {Record<string, any>} data 条目数据
   * @return {Promise<boolean>}
   */
  async edit(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少 Figma插件 ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug, status, publish_time FROM uied_figma_plugin WHERE id = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!existing) {
      throw new Error('Figma插件 不存在');
    }

    const payload = this.normalizeItemPayload(data);
    const slug = await this.resolveUniqueSlug(payload.slug || existing.slug, payload.name, id, 'item');

    const publishTime = payload.status === 'published'
      ? (payload.publishTime || Number(existing.publish_time || 0) || now)
      : null;

    await app.model.query(
      `UPDATE uied_figma_plugin
       SET name = ?, slug = ?, summary = ?, content = ?,
           icon_url = ?, cover_url = ?, official_url = ?, docs_url = ?, github_url = ?,
           figma_plugin_id = ?, author_name = ?, source_type = ?, source_url = ?,
           transport_type = ?, runtime = ?, protocol_version = ?,
           category_id = ?, status = ?, is_recommended = ?, sort_order = ?, publish_time = ?,
           seo_title = ?, seo_keywords = ?, seo_description = ?,
           update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          payload.iconUrl || null,
          payload.coverUrl || null,
          payload.officialUrl || null,
          payload.docsUrl || null,
          payload.githubUrl || null,
          payload.figmaPluginId || '',
          payload.authorName || '',
          payload.sourceType || '',
          payload.sourceUrl || '',
          payload.transportType,
          payload.runtime,
          payload.protocolVersion || null,
          payload.categoryId,
          payload.status,
          payload.isRecommended,
          payload.sortOrder,
          publishTime,
          payload.seoTitle || payload.name,
          payload.seoKeywords || '',
          payload.seoDescription || payload.summary,
          now,
          id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await this.saveItemTags(id, payload.tagIds);
    return true;
  }

  /**
   * 删除 Figma插件 条目（软删除）。
   * @param {number|string} id 条目 ID
   * @return {Promise<boolean>}
   */
  async del(id) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return true;

    await app.model.query(
      'UPDATE uied_figma_plugin SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_figma_plugin_item_tag SET is_delete = 1, update_time = ? WHERE item_id = ? AND is_delete = 0',
      {
        replacements: [ now, itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 获取 Figma插件 分类列表（后台）。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async categoryList(params = {}) {
    await this.ensureTables();
    const { app } = this;
    const page = this.parsePositiveInt(params.page ?? params.pageNo, 1);
    const pageSize = this.parsePositiveInt(params.pageSize, 20);
    const offset = (page - 1) * pageSize;
    const keyword = String(params.keyword || '').trim();

    let whereSql = 'c.is_delete = 0';
    const replacements = [];
    if (keyword) {
      whereSql += ' AND (c.name LIKE ? OR c.slug LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_figma_plugin_category c WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order AS sortOrder,
              c.seo_title AS seoTitle, c.seo_keywords AS seoKeywords, c.seo_description AS seoDescription,
              c.create_time AS createTime, c.update_time AS updateTime,
              (
                SELECT COUNT(*) FROM uied_figma_plugin i
                WHERE i.category_id = c.id AND i.is_delete = 0
              ) AS itemCount
       FROM uied_figma_plugin_category c
       WHERE ${whereSql}
       ORDER BY c.sort_order ASC, c.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      lists: Array.isArray(rows) ? rows : [],
      count: Number(countRow?.total || 0),
      page,
      pageSize,
    };
  }

  /**
   * 获取 Figma插件 分类全量（用于下拉）。
   * @return {Promise<any[]>}
   */
  async categoryAll() {
    await this.ensureTables();
    const { app } = this;
    const rows = await app.model.query(
      `SELECT id, name, slug, description, sort_order AS sortOrder
       FROM uied_figma_plugin_category
       WHERE is_delete = 0
       ORDER BY sort_order ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 新增 Figma插件 分类。
   * @param {Record<string, any>} data 分类数据
   * @return {Promise<number>}
   */
  async categoryAdd(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const name = String(data.name || '').trim();
    if (!name) throw new Error('分类名称不能为空');
    const slug = await this.resolveUniqueSlug(String(data.slug || '').trim(), name, 0, 'category');

    const [ result ] = await app.model.query(
      `INSERT INTO uied_figma_plugin_category
       (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      {
        replacements: [
          name,
          slug,
          String(data.description || '').trim(),
          Number.isFinite(Number(data.sortOrder ?? data.sort_order)) ? Number(data.sortOrder ?? data.sort_order) : 0,
          String(data.seoTitle || data.seo_title || '').trim(),
          String(data.seoKeywords || data.seo_keywords || '').trim(),
          String(data.seoDescription || data.seo_description || '').trim(),
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return Number(result || 0);
  }

  /**
   * 编辑 Figma插件 分类。
   * @param {Record<string, any>} data 分类数据
   * @return {Promise<boolean>}
   */
  async categoryEdit(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少分类 ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug FROM uied_figma_plugin_category WHERE id = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!existing) throw new Error('分类不存在');

    const name = String(data.name || '').trim();
    if (!name) throw new Error('分类名称不能为空');
    const slug = await this.resolveUniqueSlug(String(data.slug || existing.slug || '').trim(), name, id, 'category');

    await app.model.query(
      `UPDATE uied_figma_plugin_category
       SET name = ?, slug = ?, description = ?, sort_order = ?,
           seo_title = ?, seo_keywords = ?, seo_description = ?,
           update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          name,
          slug,
          String(data.description || '').trim(),
          Number.isFinite(Number(data.sortOrder ?? data.sort_order)) ? Number(data.sortOrder ?? data.sort_order) : 0,
          String(data.seoTitle || data.seo_title || '').trim(),
          String(data.seoKeywords || data.seo_keywords || '').trim(),
          String(data.seoDescription || data.seo_description || '').trim(),
          now,
          id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
    return true;
  }

  /**
   * 删除 Figma插件 分类（软删除）。
   * @param {number|string} id 分类 ID
   * @return {Promise<boolean>}
   */
  async categoryDel(id) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const categoryId = this.parsePositiveInt(id, 0);
    if (!categoryId) return true;

    await app.model.query(
      'UPDATE uied_figma_plugin_category SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, categoryId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_figma_plugin SET category_id = NULL, update_time = ? WHERE category_id = ? AND is_delete = 0',
      {
        replacements: [ now, categoryId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 获取 Figma插件 标签分页列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async tagList(params = {}) {
    await this.ensureTables();
    const { app } = this;
    const page = this.parsePositiveInt(params.page ?? params.pageNo, 1);
    const pageSize = this.parsePositiveInt(params.pageSize, 20);
    const offset = (page - 1) * pageSize;
    const keyword = String(params.keyword || '').trim();

    let whereSql = 't.is_delete = 0';
    const replacements = [];
    if (keyword) {
      whereSql += ' AND (t.name LIKE ? OR t.slug LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_figma_plugin_tag t WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT t.id, t.name, t.slug, t.description, t.sort_order AS sortOrder,
              t.create_time AS createTime, t.update_time AS updateTime,
              (
                SELECT COUNT(*) FROM uied_figma_plugin_item_tag rel
                WHERE rel.tag_id = t.id AND rel.is_delete = 0
              ) AS itemCount
       FROM uied_figma_plugin_tag t
       WHERE ${whereSql}
       ORDER BY t.sort_order ASC, t.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      lists: Array.isArray(rows) ? rows : [],
      count: Number(countRow?.total || 0),
      page,
      pageSize,
    };
  }

  /**
   * 获取 Figma插件 标签全量列表（用于下拉）。
   * @return {Promise<any[]>}
   */
  async tagAll() {
    await this.ensureTables();
    const { app } = this;
    const rows = await app.model.query(
      `SELECT id, name, slug, description, sort_order AS sortOrder
       FROM uied_figma_plugin_tag
       WHERE is_delete = 0
       ORDER BY sort_order ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 新增 Figma插件 标签。
   * @param {Record<string, any>} data 标签数据
   * @return {Promise<number>}
   */
  async tagAdd(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const name = String(data.name || '').trim();
    if (!name) throw new Error('标签名称不能为空');

    const slug = await this.resolveUniqueSlug(String(data.slug || '').trim(), name, 0, 'tag');
    const [ result ] = await app.model.query(
      `INSERT INTO uied_figma_plugin_tag
       (name, slug, description, sort_order, is_delete, create_time, update_time)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      {
        replacements: [
          name,
          slug,
          String(data.description || '').trim(),
          Number.isFinite(Number(data.sortOrder ?? data.sort_order)) ? Number(data.sortOrder ?? data.sort_order) : 0,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
    return Number(result || 0);
  }

  /**
   * 编辑 Figma插件 标签。
   * @param {Record<string, any>} data 标签数据
   * @return {Promise<boolean>}
   */
  async tagEdit(data = {}) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少标签 ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug FROM uied_figma_plugin_tag WHERE id = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!existing) throw new Error('标签不存在');

    const name = String(data.name || '').trim();
    if (!name) throw new Error('标签名称不能为空');

    const slug = await this.resolveUniqueSlug(String(data.slug || existing.slug || '').trim(), name, id, 'tag');

    await app.model.query(
      `UPDATE uied_figma_plugin_tag
       SET name = ?, slug = ?, description = ?, sort_order = ?, update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          name,
          slug,
          String(data.description || '').trim(),
          Number.isFinite(Number(data.sortOrder ?? data.sort_order)) ? Number(data.sortOrder ?? data.sort_order) : 0,
          now,
          id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 删除 Figma插件 标签（软删除）。
   * @param {number|string} id 标签 ID
   * @return {Promise<boolean>}
   */
  async tagDel(id) {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const tagId = this.parsePositiveInt(id, 0);
    if (!tagId) return true;

    await app.model.query(
      'UPDATE uied_figma_plugin_tag SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, tagId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_figma_plugin_item_tag SET is_delete = 1, update_time = ? WHERE tag_id = ? AND is_delete = 0',
      {
        replacements: [ now, tagId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 将 URL 规范为完整的 Figma 社区地址。
   * @param {string} sourceUrl 原始地址
   * @return {string}
   */
  normalizeCommunityUrl(sourceUrl = '') {
    const raw = String(sourceUrl || '').trim();
    if (!raw) return 'https://www.figma.com/community/plugins';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `https://www.figma.com${raw}`;
    return `https://${raw}`;
  }

  /**
   * 从插件详情 HTML 中提取结构化字段。
   * @param {string} pluginUrl 插件链接
   * @param {string} html 插件详情 HTML
   * @return {{pluginId:string,name:string,summary:string,coverUrl:string}}
   */
  parsePluginDetailFromHtml(pluginUrl, html) {
    const pluginId = this.parsePluginIdByUrl(pluginUrl);
    const ogTitle = this.extractMetaContent(html, [ 'og:title', 'twitter:title' ]);
    const htmlTitle = this.extractHtmlTitle(html);
    const name = this.sanitizeFigmaTitle(ogTitle || htmlTitle || `Figma Plugin ${pluginId || ''}`);
    const summary = this.extractMetaContent(html, [ 'og:description', 'description', 'twitter:description' ]);
    const coverUrl = this.extractMetaContent(html, [ 'og:image', 'twitter:image' ]);
    return {
      pluginId,
      name,
      summary,
      coverUrl,
    };
  }

  /**
   * 通过官方社区链接导入 Figma 插件数据（支持汉化标题/简介）。
   * @param {Record<string, any>} payload 导入参数
   * @return {Promise<{sourceUrl:string,scanned:number,created:number,updated:number,failed:number,items:any[]}>}
   */
  async importOfficial(payload = {}) {
    await this.ensureTables();
    const sourceUrl = this.normalizeCommunityUrl(payload.sourceUrl || payload.source_url);
    const limit = this.clamp(this.parsePositiveInt(payload.limit, 20), 1, 120);
    const categoryId = this.parsePositiveInt(payload.categoryId ?? payload.category_id, 0) || null;
    const status = String(payload.status || '').trim().toLowerCase() === 'draft' ? 'draft' : 'published';
    const shouldTranslate = payload.translate !== false && payload.translate !== 0;
    const defaultSortOrder = Number.isFinite(Number(payload.sortOrder ?? payload.sort_order))
      ? Number(payload.sortOrder ?? payload.sort_order)
      : 0;
    const now = Math.floor(Date.now() / 1000);
    const { app, ctx } = this;

    const sourceHtml = await this.fetchHtml(sourceUrl);
    let pluginLinks = this.extractPluginLinksFromHtml(sourceHtml);
    /**
     * 兼容直接传入单个插件详情链接的采集场景。
     */
    if (pluginLinks.length === 0) {
      const singlePluginUrl = this.normalizePluginDetailUrl(sourceUrl);
      if (singlePluginUrl) {
        pluginLinks = [ singlePluginUrl ];
      }
    }
    pluginLinks = pluginLinks.slice(0, limit);
    const result = {
      sourceUrl,
      scanned: pluginLinks.length,
      created: 0,
      updated: 0,
      failed: 0,
      items: [],
    };

    for (const link of pluginLinks) {
      try {
        const pluginUrl = this.normalizePluginDetailUrl(link) || this.normalizeCommunityUrl(link);
        const detailHtml = await this.fetchHtml(pluginUrl);
        const parsed = this.parsePluginDetailFromHtml(pluginUrl, detailHtml);
        const titleRaw = String(parsed.name || '').trim();
        if (!titleRaw) {
          result.failed += 1;
          continue;
        }
        const summaryRaw = String(parsed.summary || '').trim();
        const cnTitle = await this.translateToChinese(titleRaw, 'title', shouldTranslate);
        const cnSummary = await this.translateToChinese(summaryRaw, 'summary', shouldTranslate);
        const safeTitle = cnTitle || titleRaw;
        const safeSummary = cnSummary || summaryRaw;
        const slug = await this.resolveUniqueSlug('', `${safeTitle}-${parsed.pluginId || ''}`, 0, 'item');

        const [ existing ] = await app.model.query(
          `SELECT id
           FROM uied_figma_plugin
           WHERE is_delete = 0
             AND (
               (figma_plugin_id != '' AND figma_plugin_id = ?)
               OR official_url = ?
             )
           LIMIT 1`,
          {
            replacements: [ parsed.pluginId || '', pluginUrl ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );

        if (existing && Number(existing.id || 0) > 0) {
          const targetId = Number(existing.id || 0);
          await app.model.query(
            `UPDATE uied_figma_plugin
             SET name = ?, summary = ?, icon_url = ?, cover_url = ?,
                 official_url = ?, figma_plugin_id = ?, category_id = COALESCE(?, category_id),
                 status = ?, seo_title = ?, seo_description = ?, source_type = 'figma_community',
                 source_url = ?, publish_time = COALESCE(publish_time, ?), update_time = ?
             WHERE id = ?`,
            {
              replacements: [
                safeTitle,
                safeSummary,
                parsed.coverUrl || null,
                parsed.coverUrl || null,
                pluginUrl,
                parsed.pluginId || '',
                categoryId,
                status,
                safeTitle,
                safeSummary,
                sourceUrl,
                now,
                now,
                targetId,
              ],
              type: app.Sequelize.QueryTypes.UPDATE,
            }
          );
          result.updated += 1;
          result.items.push({ id: targetId, name: safeTitle, officialUrl: pluginUrl, mode: 'updated' });
          continue;
        }

        const [ inserted ] = await app.model.query(
          `INSERT INTO uied_figma_plugin
           (name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url,
            figma_plugin_id, author_name, source_type, source_url,
            transport_type, runtime, protocol_version, category_id, status, is_recommended, sort_order, publish_time,
            click_count, view_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, '', 'figma_community', ?, 'http', 'other', '', ?, ?, 0, ?, ?, 0, 0, ?, '', ?, 0, ?, ?)`,
          {
            replacements: [
              safeTitle,
              slug,
              safeSummary,
              safeSummary,
              parsed.coverUrl || null,
              parsed.coverUrl || null,
              pluginUrl,
              parsed.pluginId || '',
              sourceUrl,
              categoryId,
              status,
              defaultSortOrder,
              now,
              safeTitle,
              safeSummary,
              now,
              now,
            ],
            type: app.Sequelize.QueryTypes.INSERT,
          }
        );

        const insertedId = Number(inserted || 0);
        result.created += 1;
        result.items.push({ id: insertedId, name: safeTitle, officialUrl: pluginUrl, mode: 'created' });
      } catch (error) {
        result.failed += 1;
        ctx.logger.warn('[uied.figma] 官方采集单条失败: %s', error?.message || error);
      }
    }

    return result;
  }

  /**
   * 获取 Figma插件 前台公开列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],total:number,page:number,pageSize:number,totalPages:number}>}
   */
  async publicList(params = {}) {
    await this.ensureTables();
    const { app } = this;
    const page = this.parsePositiveInt(params.page, 1);
    const pageSize = this.parsePositiveInt(params.pageSize ?? params.limit, 12);
    const offset = (page - 1) * pageSize;

    const keyword = String(params.keyword || params.q || '').trim();
    const categorySlug = String(params.categorySlug || params.category || '').trim();
    const tagSlug = String(params.tagSlug || params.tag || '').trim();

    let whereSql = 'i.is_delete = 0 AND i.status = \'published\'';
    const replacements = [];

    if (keyword) {
      whereSql += ' AND (i.name LIKE ? OR i.summary LIKE ? OR i.slug LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (categorySlug) {
      whereSql += ' AND EXISTS (SELECT 1 FROM uied_figma_plugin_category c WHERE c.id = i.category_id AND c.slug = ? AND c.is_delete = 0)';
      replacements.push(categorySlug);
    }

    if (tagSlug) {
      whereSql += ` AND EXISTS (
        SELECT 1
        FROM uied_figma_plugin_item_tag rel
        INNER JOIN uied_figma_plugin_tag t ON t.id = rel.tag_id AND t.is_delete = 0
        WHERE rel.item_id = i.id
          AND rel.is_delete = 0
          AND t.slug = ?
      )`;
      replacements.push(tagSlug);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_figma_plugin i WHERE ${whereSql}`,
      {
        replacements,
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const rows = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.figma_plugin_id AS figmaPluginId, i.author_name AS authorName,
              i.source_type AS sourceType, i.source_url AS sourceUrl,
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug,
              (
                SELECT GROUP_CONCAT(t.name ORDER BY t.sort_order ASC, t.id ASC SEPARATOR ',')
                FROM uied_figma_plugin_item_tag rel
                INNER JOIN uied_figma_plugin_tag t ON t.id = rel.tag_id AND t.is_delete = 0
                WHERE rel.item_id = i.id AND rel.is_delete = 0
              ) AS tagNames
       FROM uied_figma_plugin i
       LEFT JOIN uied_figma_plugin_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE ${whereSql}
       ORDER BY i.is_recommended DESC, i.sort_order ASC, COALESCE(i.publish_time, i.update_time) DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const total = Number(countRow?.total || 0);
    const lists = (Array.isArray(rows) ? rows : []).map(item => ({
      ...item,
      tags: String(item.tagNames || '')
        .split(',')
        .map(tag => String(tag || '').trim())
        .filter(Boolean),
    }));

    return {
      lists,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
    };
  }

  /**
   * 获取 Figma插件 前台公开详情（按 slug 或 id）。
   * @param {string|number} idOrSlug 条目标识
   * @return {Promise<any|null>}
   */
  async publicDetail(idOrSlug) {
    await this.ensureTables();
    const { app } = this;
    const text = String(idOrSlug || '').trim();
    if (!text) return null;

    const maybeId = this.parsePositiveInt(text, 0);
    const whereSql = maybeId > 0 ? '(i.id = ? OR i.slug = ?)' : 'i.slug = ?';
    const replacements = maybeId > 0 ? [ maybeId, text ] : [ text ];

    const [ row ] = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.content,
              i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.figma_plugin_id AS figmaPluginId, i.author_name AS authorName,
              i.source_type AS sourceType, i.source_url AS sourceUrl,
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.update_time AS updateTime, i.create_time AS createTime,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug
       FROM uied_figma_plugin i
       LEFT JOIN uied_figma_plugin_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE ${whereSql}
         AND i.is_delete = 0
         AND i.status = 'published'
       LIMIT 1`,
      {
        replacements,
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    if (!row) return null;

    const tags = await app.model.query(
      `SELECT t.id, t.name, t.slug
       FROM uied_figma_plugin_item_tag rel
       INNER JOIN uied_figma_plugin_tag t ON t.id = rel.tag_id AND t.is_delete = 0
       WHERE rel.item_id = ? AND rel.is_delete = 0
       ORDER BY t.sort_order ASC, t.id ASC`,
      {
        replacements: [ row.id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const related = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl,
              i.official_url AS officialUrl,
              i.transport_type AS transportType, i.runtime, i.publish_time AS publishTime
       FROM uied_figma_plugin i
       WHERE i.is_delete = 0
         AND i.status = 'published'
         AND i.id != ?
         AND (
           i.category_id = ?
           OR EXISTS (
             SELECT 1
             FROM uied_figma_plugin_item_tag rel_a
             INNER JOIN uied_figma_plugin_item_tag rel_b
               ON rel_b.tag_id = rel_a.tag_id
              AND rel_b.item_id = i.id
              AND rel_b.is_delete = 0
             WHERE rel_a.item_id = ?
               AND rel_a.is_delete = 0
           )
         )
       ORDER BY i.is_recommended DESC, i.sort_order ASC, COALESCE(i.publish_time, i.update_time) DESC
       LIMIT 8`,
      {
        replacements: [ row.id, row.categoryId || 0, row.id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      ...row,
      tags: Array.isArray(tags) ? tags : [],
      related: Array.isArray(related) ? related : [],
    };
  }

  /**
   * 记录前台 Figma插件 详情浏览量。
   * @param {number|string} id 条目 ID
   * @return {Promise<void>}
   */
  async increaseViewCount(id) {
    await this.ensureTables();
    const { app } = this;
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return;
    await app.model.query(
      'UPDATE uied_figma_plugin SET view_count = view_count + 1 WHERE id = ? AND is_delete = 0',
      {
        replacements: [ itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 获取前台 Figma插件 分类元数据（仅返回有已发布内容的分类）。
   * @return {Promise<any[]>}
   */
  async publicCategories() {
    await this.ensureTables();
    const { app } = this;
    const rows = await app.model.query(
      `SELECT c.id, c.name, c.slug,
              COUNT(i.id) AS itemCount
       FROM uied_figma_plugin_category c
       INNER JOIN uied_figma_plugin i
         ON i.category_id = c.id
        AND i.is_delete = 0
        AND i.status = 'published'
       WHERE c.is_delete = 0
       GROUP BY c.id, c.name, c.slug
       ORDER BY c.sort_order ASC, c.id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 获取前台 Figma插件 标签元数据（仅返回有已发布内容的标签）。
   * @return {Promise<any[]>}
   */
  async publicTags() {
    await this.ensureTables();
    const { app } = this;
    const rows = await app.model.query(
      `SELECT t.id, t.name, t.slug,
              COUNT(DISTINCT rel.item_id) AS itemCount
       FROM uied_figma_plugin_tag t
       INNER JOIN uied_figma_plugin_item_tag rel
         ON rel.tag_id = t.id
        AND rel.is_delete = 0
       INNER JOIN uied_figma_plugin i
         ON i.id = rel.item_id
        AND i.is_delete = 0
        AND i.status = 'published'
       WHERE t.is_delete = 0
       GROUP BY t.id, t.name, t.slug
       ORDER BY t.sort_order ASC, t.id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }
}

module.exports = UiedFigmaService;
