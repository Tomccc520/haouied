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
const crypto = require('crypto');

class UiedFigmaService extends Service {
  /**
   * 生成远程资源缓存哈希（用于唯一索引）。
   * @param {string} value 原始 URL
   * @return {string}
   */
  buildAssetCacheHash(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return crypto.createHash('sha1').update(raw).digest('hex');
  }

  /**
   * 判断是否为本地素材地址（已转存）。
   * @param {string} url 资源地址
   * @return {boolean}
   */
  isLocalAssetUrl(url = '') {
    const value = String(url || '').trim();
    if (!value) return false;
    if (value.startsWith('/public/uploads/')) return true;
    if (value.startsWith('/api/uploads/')) return true;
    if (/^https?:\/\//i.test(value) && value.includes('/public/uploads/')) return true;
    if (/^https?:\/\//i.test(value) && value.includes('/api/uploads/')) return true;
    return false;
  }

  /**
   * 将远程图片转存到本地并缓存结果（同 URL 不重复下载）。
   * @param {string} remoteUrl 远程资源地址
   * @param {number} cid 素材分类 ID（可选）
   * @return {Promise<string>} 返回可写入数据库的资源 URL（优先本地 URI）
   */
  async cacheRemoteAssetToLocal(remoteUrl = '', cid = 0) {
    await this.ensureTables();
    const sourceUrl = String(remoteUrl || '').trim();
    if (!sourceUrl) return '';
    if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl;
    if (this.isLocalAssetUrl(sourceUrl)) return sourceUrl;

    const { app, ctx } = this;
    const now = Math.floor(Date.now() / 1000);
    const sourceHash = this.buildAssetCacheHash(sourceUrl);
    if (!sourceHash) return sourceUrl;

    const [ cacheRow ] = await app.model.query(
      `SELECT id, local_uri AS localUri, local_url AS localUrl, status, update_time AS updateTime
       FROM uied_figma_asset_cache
       WHERE source_url_hash = ? AND is_delete = 0
       LIMIT 1`,
      {
        replacements: [ sourceHash ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    /**
     * 命中成功缓存：直接复用本地资源路径，并累计命中次数。
     */
    if (cacheRow && String(cacheRow.status || '').trim() === 'success') {
      await app.model.query(
        `UPDATE uied_figma_asset_cache
         SET hit_count = hit_count + 1, update_time = ?
         WHERE id = ?`,
        {
          replacements: [ now, Number(cacheRow.id || 0) ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      const localUri = String(cacheRow.localUri || '').trim();
      const localUrl = String(cacheRow.localUrl || '').trim();
      return localUri || localUrl || sourceUrl;
    }

    /**
     * 命中失败缓存且仍在冷却窗口内：跳过重复下载，降低慢请求风险。
     */
    if (
      cacheRow
      && String(cacheRow.status || '').trim() === 'failed'
      && Number(cacheRow.updateTime || 0) > (now - 6 * 3600)
    ) {
      return sourceUrl;
    }

    try {
      const saved = await ctx.service.album.saveRemoteImageToAlbum(sourceUrl, Number(cid || 0));
      const localUri = String(saved?.uri || '').trim();
      const localUrl = String(saved?.to || '').trim();
      await app.model.query(
        `INSERT INTO uied_figma_asset_cache
         (source_url_hash, source_url, local_uri, local_url, status, error_msg, hit_count, is_delete, create_time, update_time)
         VALUES (?, ?, ?, ?, 'success', '', 1, 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           source_url = VALUES(source_url),
           local_uri = VALUES(local_uri),
           local_url = VALUES(local_url),
           status = 'success',
           error_msg = '',
           hit_count = hit_count + 1,
           is_delete = 0,
           update_time = VALUES(update_time)`,
        {
          replacements: [ sourceHash, sourceUrl, localUri, localUrl, now, now ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
      return localUri || localUrl || sourceUrl;
    } catch (error) {
      const errorMessage = String(error?.message || 'download_failed').slice(0, 250);
      ctx.logger.warn('[uied.figma] 远程图片转存失败，保留原地址: %s -> %s', sourceUrl, errorMessage);
      await app.model.query(
        `INSERT INTO uied_figma_asset_cache
         (source_url_hash, source_url, local_uri, local_url, status, error_msg, hit_count, is_delete, create_time, update_time)
         VALUES (?, ?, '', '', 'failed', ?, 0, 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           source_url = VALUES(source_url),
           status = 'failed',
           error_msg = VALUES(error_msg),
           update_time = VALUES(update_time)`,
        {
          replacements: [ sourceHash, sourceUrl, errorMessage, now, now ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
      return sourceUrl;
    }
  }

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
    let insecureDomains = [ 'figma.com', 'www.figma.com', 'r.jina.ai' ];

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

    /**
     * 固定保留 Figma 与只读镜像域名，避免后台误配白名单导致官方采集不可用。
     */
    insecureDomains = Array.from(new Set([
      ...(Array.isArray(insecureDomains) ? insecureDomains : []),
      'figma.com',
      'www.figma.com',
      'r.jina.ai',
    ]));

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
        \`user_count\` BIGINT NOT NULL DEFAULT 0 COMMENT '使用人数',
        \`like_count\` BIGINT NOT NULL DEFAULT 0 COMMENT '关注量',
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
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_figma_asset_cache\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`source_url_hash\` CHAR(40) NOT NULL DEFAULT '' COMMENT '来源URL哈希',
        \`source_url\` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '来源URL',
        \`local_uri\` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '本地URI',
        \`local_url\` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '绝对URL',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态 success/failed/pending',
        \`error_msg\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '失败原因',
        \`hit_count\` INT NOT NULL DEFAULT 0 COMMENT '命中次数',
        \`is_delete\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
        \`create_time\` BIGINT NOT NULL DEFAULT 0,
        \`update_time\` BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_figma_asset_cache_hash\` (\`source_url_hash\`),
        KEY \`idx_figma_asset_cache_status\` (\`status\`),
        KEY \`idx_figma_asset_cache_update\` (\`update_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Figma 远程资源缓存表'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );

    /**
     * 兼容历史库：补齐 user_count / like_count 字段。
     */
    const pluginColumns = await app.model.query('SHOW COLUMNS FROM `uied_figma_plugin`', {
      type: app.Sequelize.QueryTypes.SELECT,
    });
    const pluginColumnSet = new Set(
      (Array.isArray(pluginColumns) ? pluginColumns : [])
        .map(item => String(item?.Field || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const alterColumnSqlList = [];
    if (!pluginColumnSet.has('user_count')) {
      alterColumnSqlList.push('ADD COLUMN `user_count` BIGINT NOT NULL DEFAULT 0 COMMENT \'使用人数\' AFTER `view_count`');
    }
    if (!pluginColumnSet.has('like_count')) {
      alterColumnSqlList.push('ADD COLUMN `like_count` BIGINT NOT NULL DEFAULT 0 COMMENT \'关注量\' AFTER `user_count`');
    }
    if (alterColumnSqlList.length > 0) {
      await app.model.query(`ALTER TABLE \`uied_figma_plugin\` ${alterColumnSqlList.join(', ')}`, {
        type: app.Sequelize.QueryTypes.RAW,
      });
    }

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
   * @param {{allowReadOnlyFallback?:boolean}} options 抓取选项
   * @return {Promise<string>}
   */
  async fetchHtml(url, options = {}) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) return '';
    const { ctx } = this;
    const allowReadOnlyFallback = options && options.allowReadOnlyFallback === true;
    const networkConfig = await this.getOfficialImportNetworkConfig();
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    };

    /**
     * 判断当前请求地址是否满足 TLS 宽松重试条件。
     * @param {string} requestUrl 请求地址
     * @param {Error} error 错误对象
     * @return {boolean}
     */
    const shouldRetryInsecureForUrl = (requestUrl, error) => {
      if (!this.isTlsIssuerError(error)) return false;
      try {
        const host = String(new URL(requestUrl).hostname || '').trim().toLowerCase();
        /**
         * Figma 官方采集链路的已知域名强制允许 TLS 宽松重试，避免客户环境 CA 缺失导致不可用。
         */
        if ([ 'figma.com', 'www.figma.com', 'r.jina.ai' ].includes(host)) {
          return true;
        }
        if (!networkConfig.allowInsecureTls) return false;
        const whitelist = Array.isArray(networkConfig.insecureDomains) ? networkConfig.insecureDomains : [];
        return this.matchInsecureTlsHost(host, whitelist);
      } catch (_err) {
        return false;
      }
    };

    /**
     * 执行一次 HTML 抓取，支持切换 TLS 校验策略。
     * 说明：保留响应状态码，便于识别 403 风控页并触发降级抓取。
     * @param {string} requestUrl 请求地址
     * @param {boolean} rejectUnauthorized 是否严格校验证书
     * @return {Promise<{status:number,body:string}>}
     */
    const curlOnce = async (requestUrl, rejectUnauthorized = true, requestTimeout = 25000) => {
      const response = await ctx.curl(requestUrl, {
        method: 'GET',
        dataType: 'text',
        timeout: requestTimeout,
        followRedirect: true,
        rejectUnauthorized,
        headers,
      });
      return {
        status: Number(response?.status || 0),
        body: String(response?.data || ''),
      };
    };

    /**
     * 带 TLS 证书兜底的一次抓取。
     * @param {string} requestUrl 请求地址
     * @return {Promise<{status:number,body:string}>}
     */
    const curlWithTlsFallback = async (requestUrl, options = {}) => {
      const requestTimeout = Number(options?.timeout || 25000);
      try {
        return await curlOnce(requestUrl, true, requestTimeout);
      } catch (error) {
        if (!shouldRetryInsecureForUrl(requestUrl, error)) {
          throw error;
        }
        ctx.logger.warn('[uied.figma] TLS校验失败，已降级为 rejectUnauthorized=false 重试: %s', requestUrl);
        try {
          return await curlOnce(requestUrl, false, requestTimeout);
        } catch (retryError) {
          /**
           * 部分客户机器在 Node TLS 环境下仍会证书链校验失败（即使 rejectUnauthorized=false）。
           * 本地/开发环境再做一次全局 TLS 兜底重试，生产环境保持严格，避免扩大安全面。
           */
          const appEnv = String(this.app.config.env || '').trim().toLowerCase();
          if (!shouldRetryInsecureForUrl(requestUrl, retryError) || appEnv === 'prod') {
            throw retryError;
          }
          const prevTlsEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          try {
            ctx.logger.warn('[uied.figma] TLS降级重试仍失败，开发环境启用 NODE_TLS_REJECT_UNAUTHORIZED=0 兜底: %s', requestUrl);
            return await curlOnce(requestUrl, false, requestTimeout);
          } finally {
            if (prevTlsEnv === undefined) {
              delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            } else {
              process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTlsEnv;
            }
          }
        }
      }
    };

    /**
     * 当官方站点触发风控或 4xx 时，回退到只读镜像抓取公开元信息。
     * @return {Promise<string>}
     */
    const fetchReadOnlyMirror = async () => {
      if (!allowReadOnlyFallback) return '';
      const mirrorUrl = this.buildReadOnlyMirrorUrl(targetUrl);
      if (!mirrorUrl) return '';
      /**
       * 只读镜像链路在网络波动时更容易慢响应，放宽超时时间提升成功率。
       */
      const mirrorResult = await curlWithTlsFallback(mirrorUrl, { timeout: 45000 });
      if (mirrorResult.status >= 400 || !String(mirrorResult.body || '').trim()) {
        return '';
      }
      ctx.logger.warn('[uied.figma] 官方源不可达，已使用只读镜像采集公开元信息: %s', targetUrl);
      return mirrorResult.body;
    };

    let primaryResult = null;
    try {
      primaryResult = await curlWithTlsFallback(targetUrl, { timeout: 25000 });
    } catch (error) {
      if (allowReadOnlyFallback) {
        const fallbackHtml = await fetchReadOnlyMirror();
        if (fallbackHtml) return fallbackHtml;
      }
      throw error;
    }

    const statusCode = Number(primaryResult?.status || 0);
    const bodyText = String(primaryResult?.body || '');
    if (
      allowReadOnlyFallback
      && (statusCode >= 400 || this.isCloudfrontBlockedHtml(bodyText))
    ) {
      const fallbackHtml = await fetchReadOnlyMirror();
      if (fallbackHtml) return fallbackHtml;
    }
    if (statusCode >= 400) {
      throw new Error(`抓取失败，HTTP状态码：${statusCode}`);
    }
    return bodyText;
  }

  /**
   * 判断响应是否为 CloudFront 风控拦截页。
   * @param {string} payload 响应内容
   * @return {boolean}
   */
  isCloudfrontBlockedHtml(payload = '') {
    const text = String(payload || '').toLowerCase();
    if (!text) return false;
    return (
      (text.includes('error code: 403') && text.includes('cloudfront'))
      || (text.includes('request blocked') && text.includes('cloudfront'))
      || text.includes('generated by cloudfront')
    );
  }

  /**
   * 构建只读镜像地址（用于采集公开元信息，不抓取受保护内容）。
   * @param {string} url 原始地址
   * @return {string}
   */
  buildReadOnlyMirrorUrl(url = '') {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      if (!/^https?:$/i.test(parsed.protocol)) return '';
      const normalizedPath = `${parsed.hostname}${parsed.pathname}${parsed.search}${parsed.hash}`;
      return `https://r.jina.ai/http://${normalizedPath}`;
    } catch (error) {
      return '';
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
   * 从“标签行”格式文本中提取字段值（例如：Title: xxx）。
   * @param {string} text 原始文本
   * @param {string} label 字段标签
   * @return {string}
   */
  extractLineValueByLabel(text = '', label = '') {
    const source = String(text || '');
    const key = String(label || '').trim();
    if (!source || !key) return '';
    const reg = new RegExp(`^\\s*${key}\\s*:\\s*(.+)\\s*$`, 'im');
    const matched = source.match(reg);
    return matched && matched[1]
      ? this.decodeHtmlEntities(String(matched[1]).trim())
      : '';
  }

  /**
   * 从文本中提取首个 Markdown 一级标题。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractFirstMarkdownHeading(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const matched = source.match(/^\s*#\s+(.+)$/m);
    return matched && matched[1]
      ? this.decodeHtmlEntities(String(matched[1]).trim())
      : '';
  }

  /**
   * 从文本中提取首段摘要，兼容 HTML/Markdown/纯文本。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractSummaryFromText(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const normalized = source.replace(/\r/g, '\n');
    const markdownStart = normalized.search(/markdown content\s*:/i);
    const body = markdownStart >= 0
      ? normalized.slice(markdownStart).replace(/^[\s\S]*?markdown content\s*:\s*/i, '')
      : normalized;
    const plain = body
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .map(line => line.replace(/^[-*#>\s]+/, '').trim())
      .filter(line => (
        Boolean(line)
        && !/^title\s*:/i.test(line)
        && !/^url source\s*:/i.test(line)
        && !/^warning\s*:/i.test(line)
      ))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.slice(0, 260);
  }

  /**
   * 从文本中提取首个图片地址，用于封面兜底。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractFirstImageUrlFromText(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const matched = source.match(/https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s"'<>]*)?/i);
    return matched && matched[0] ? String(matched[0]).trim() : '';
  }

  /**
   * 从文本中提取插件图标地址（优先 Figma 社区 icon 接口）。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractPluginIconUrlFromText(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const matched = source.match(/https?:\/\/(?:www\.)?figma\.com\/community\/icon\?resource_id=\d+&resource_type=plugin[^\s)"']*/i);
    return matched && matched[0] ? String(matched[0]).trim() : '';
  }

  /**
   * 从文本中提取插件封面地址（优先插件预览图）。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractPluginCoverUrlFromText(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const previewMatched = source.match(/!\[[^\]]*preview[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
    if (previewMatched && previewMatched[1]) return String(previewMatched[1]).trim();
    const s3Matched = source.match(/https?:\/\/s3-figma-plugin-images[^)\s"'<>]+/i);
    if (s3Matched && s3Matched[0]) return String(s3Matched[0]).trim();
    return this.extractFirstImageUrlFromText(source);
  }

  /**
   * 从插件正文中提取 “About” 区块摘要。
   * @param {string} text 原始文本
   * @return {string}
   */
  extractSummaryFromAboutSection(text = '') {
    const source = String(text || '').replace(/\r/g, '\n');
    if (!source) return '';
    const lines = source.split('\n');
    const aboutIndex = lines.findIndex((line) => /^\s*about\s*$/i.test(String(line || '').trim()));
    if (aboutIndex < 0) return '';
    const stopReg = /^(comments?\s*\d*|version history|see all|post|###\s*tags|share|for figma|support:|no network access|\*\s*\*\s*\*)$/i;
    const resultLines = [];
    for (let index = aboutIndex + 1; index < lines.length; index += 1) {
      const rawLine = String(lines[index] || '').trim();
      if (!rawLine) {
        if (resultLines.length > 0) break;
        continue;
      }
      if (stopReg.test(rawLine)) break;
      if (/^!\[[^\]]*]\(/.test(rawLine)) continue;
      if (/^#+\s+/.test(rawLine)) continue;
      const normalizedLine = rawLine
        .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
        .replace(/^[•\-*\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!normalizedLine) continue;
      resultLines.push(normalizedLine);
      if (resultLines.length >= 3) break;
    }
    return resultLines.join(' ').slice(0, 260);
  }

  /**
   * 由插件详情链接提取插件名称兜底值。
   * @param {string} url 插件详情链接
   * @return {string}
   */
  extractPluginNameFromUrl(url = '') {
    const raw = String(url || '').trim();
    if (!raw) return '';
    const matched = raw.match(/\/community\/plugin\/\d+\/([^/?#]+)/i);
    if (!matched || !matched[1]) return '';
    let decodedName = String(matched[1] || '');
    try {
      decodedName = decodeURIComponent(decodedName);
    } catch (error) {
      decodedName = String(matched[1] || '');
    }
    return this.sanitizeFigmaTitle(
      this.decodeHtmlEntities(
        decodedName
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
    );
  }

  /**
   * 解析紧凑数字（支持 k/m 缩写）。
   * @param {string|number} value 原始数值
   * @return {number}
   */
  parseCompactNumber(value) {
    const raw = String(value || '').trim().toLowerCase().replace(/,/g, '');
    if (!raw) return 0;
    const matched = raw.match(/^(\d+(?:\.\d+)?)([km]?)$/i);
    if (!matched) return 0;
    const base = Number(matched[1] || 0);
    if (!Number.isFinite(base) || base <= 0) return 0;
    const unit = String(matched[2] || '').toLowerCase();
    if (unit === 'k') return Math.round(base * 1000);
    if (unit === 'm') return Math.round(base * 1000000);
    return Math.round(base);
  }

  /**
   * 从插件详情文本提取“关注量 + 使用人数”统计。
   * @param {string} text 原始文本
   * @return {{userCount:number,likeCount:number}}
   */
  extractPluginStatsFromText(text = '') {
    const source = String(text || '');
    if (!source) return { userCount: 0, likeCount: 0 };
    const flatText = source.replace(/\s+/g, ' ').trim();
    let userCount = 0;
    let likeCount = 0;

    const pairMatched = flatText.match(/\bplugin\b[^]{0,120}?[•·]\s*([0-9][0-9.,kKmM]*)\s*[•·]\s*([0-9][0-9.,kKmM]*)\s*users?\b/i);
    if (pairMatched) {
      likeCount = this.parseCompactNumber(pairMatched[1]);
      userCount = this.parseCompactNumber(pairMatched[2]);
    }

    if (!userCount) {
      const userMatched = flatText.match(/([0-9][0-9.,kKmM]*)\s*users?\b/i);
      userCount = this.parseCompactNumber(userMatched && userMatched[1] ? userMatched[1] : 0);
    }

    return {
      userCount,
      likeCount,
    };
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
      assetCid: this.parsePositiveInt(data.assetCid ?? data.asset_cid ?? data.cid, 0),
      categoryId: this.parsePositiveInt(data.categoryId ?? data.category_id, 0) || null,
      status,
      isRecommended: Number(data.isRecommended ?? data.is_recommended ?? 0) === 1 ? 1 : 0,
      sortOrder: Number.isFinite(Number(data.sortOrder ?? data.sort_order))
        ? Number(data.sortOrder ?? data.sort_order)
        : 0,
      publishTime: this.parsePositiveInt(data.publishTime ?? data.publish_time, 0) || null,
      userCount: this.parseCompactNumber(data.userCount ?? data.user_count),
      likeCount: this.parseCompactNumber(data.likeCount ?? data.like_count),
      seoTitle: String(data.seoTitle || data.seo_title || '').trim(),
      seoKeywords: String(data.seoKeywords || data.seo_keywords || '').trim(),
      seoDescription: String(data.seoDescription || data.seo_description || '').trim(),
      tagIds,
    };
  }

  /**
   * 规范化插件输出字段，兜底标题/摘要/图标，避免前台出现空白卡片。
   * @param {Record<string, any>} row 数据库原始行
   * @return {Record<string, any>}
   */
  normalizePluginOutputFields(row = {}) {
    const source = row && typeof row === 'object' ? row : {};
    const officialUrl = String(source.officialUrl || source.official_url || '').trim();
    const pluginId = String(source.figmaPluginId || source.figma_plugin_id || '').trim()
      || this.parsePluginIdByUrl(officialUrl);
    const idText = String(source.id || '').trim();
    const fallbackName = this.extractPluginNameFromUrl(officialUrl);
    const name = String(source.name || '').trim()
      || fallbackName
      || `Figma 插件 ${pluginId || idText || ''}`.trim();
    const summary = String(source.summary || '').trim()
      || `${name} 的插件介绍，详情请查看官方页面。`;
    const fallbackIconUrl = pluginId
      ? `https://www.figma.com/community/icon?resource_id=${pluginId}&resource_type=plugin`
      : '';
    const iconUrl = String(source.iconUrl || source.icon_url || '').trim()
      || String(source.coverUrl || source.cover_url || '').trim()
      || fallbackIconUrl;
    const coverUrl = String(source.coverUrl || source.cover_url || '').trim()
      || iconUrl;
    const content = String(source.content || '').trim() || summary;
    const userCount = this.parseCompactNumber(source.userCount ?? source.user_count);
    const likeCount = this.parseCompactNumber(source.likeCount ?? source.like_count);
    const seoTitle = String(source.seoTitle || source.seo_title || '').trim() || name;
    const seoDescription = String(source.seoDescription || source.seo_description || '').trim() || summary;
    return {
      ...source,
      name,
      summary,
      content,
      iconUrl,
      coverUrl,
      userCount,
      likeCount,
      seoTitle,
      seoDescription,
    };
  }

  /**
   * 批量应用已缓存的本地资源地址（仅替换已命中缓存的远程 URL）。
   * @param {Array<Record<string, any>>} rows 条目列表
   * @return {Promise<Array<Record<string, any>>>}
   */
  async applyCachedAssetUrls(rows = []) {
    await this.ensureTables();
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [];

    const { app } = this;
    const remoteUrlMap = new Map();

    /**
     * 收集可缓存的远程资源 URL，并建立 URL -> hash 映射。
     * @param {string} value 资源地址
     */
    const collectRemoteAssetUrl = (value = '') => {
      const sourceUrl = String(value || '').trim();
      if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl) || this.isLocalAssetUrl(sourceUrl)) {
        return;
      }
      const sourceHash = this.buildAssetCacheHash(sourceUrl);
      if (!sourceHash) return;
      remoteUrlMap.set(sourceUrl, sourceHash);
    };

    list.forEach(row => {
      collectRemoteAssetUrl(row?.iconUrl || row?.icon_url || '');
      collectRemoteAssetUrl(row?.coverUrl || row?.cover_url || '');
    });

    const hashList = Array.from(new Set(Array.from(remoteUrlMap.values())));
    if (hashList.length === 0) {
      return list.map(item => ({ ...item }));
    }

    const placeholders = hashList.map(() => '?').join(', ');
    const cacheRows = await app.model.query(
      `SELECT source_url_hash AS sourceHash, local_uri AS localUri, local_url AS localUrl
       FROM uied_figma_asset_cache
       WHERE is_delete = 0
         AND status = 'success'
         AND source_url_hash IN (${placeholders})`,
      {
        replacements: hashList,
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const cacheMap = new Map();
    (Array.isArray(cacheRows) ? cacheRows : []).forEach(item => {
      const sourceHash = String(item?.sourceHash || '').trim();
      const localUri = String(item?.localUri || '').trim();
      const localUrl = String(item?.localUrl || '').trim();
      const resolved = localUri || localUrl;
      if (sourceHash && resolved) {
        cacheMap.set(sourceHash, resolved);
      }
    });

    if (cacheMap.size === 0) {
      return list.map(item => ({ ...item }));
    }

    return list.map(item => {
      const next = { ...item };
      const iconUrl = String(next.iconUrl || '').trim();
      const coverUrl = String(next.coverUrl || '').trim();

      if (iconUrl) {
        const iconHash = remoteUrlMap.get(iconUrl);
        const iconCached = iconHash ? String(cacheMap.get(iconHash) || '').trim() : '';
        if (iconCached) {
          next.iconUrl = iconCached;
        }
      }

      if (coverUrl) {
        const coverHash = remoteUrlMap.get(coverUrl);
        const coverCached = coverHash ? String(cacheMap.get(coverHash) || '').trim() : '';
        if (coverCached) {
          next.coverUrl = coverCached;
        }
      }

      return next;
    });
  }

  /**
   * 渐进式将远程图片转存为本地地址（用于历史数据平滑迁移）。
   * @param {Array<Record<string, any>>} rows 条目列表
   * @param {{cid?:number,maxTransfer?:number}} options 转存参数
   * @return {Promise<Array<Record<string, any>>>}
   */
  async hydrateAssetUrlsToLocal(rows = [], options = {}) {
    const list = await this.applyCachedAssetUrls(rows);
    if (!Array.isArray(list) || list.length === 0) return [];

    const cid = this.parsePositiveInt(options.cid, 0);
    const maxTransfer = this.clamp(this.parsePositiveInt(options.maxTransfer, 0), 0, 24);
    if (maxTransfer <= 0) {
      return list.map(item => ({ ...item }));
    }

    let remainTransfer = maxTransfer;
    const nextList = [];

    for (const row of list) {
      const next = { ...row };
      if (remainTransfer > 0) {
        const rawIconUrl = String(next.iconUrl || '').trim();
        if (rawIconUrl && /^https?:\/\//i.test(rawIconUrl) && !this.isLocalAssetUrl(rawIconUrl)) {
          next.iconUrl = await this.cacheRemoteAssetToLocal(rawIconUrl, cid);
          remainTransfer -= 1;
        }
      }
      if (remainTransfer > 0) {
        const rawCoverUrl = String(next.coverUrl || '').trim();
        if (rawCoverUrl && /^https?:\/\//i.test(rawCoverUrl) && !this.isLocalAssetUrl(rawCoverUrl)) {
          next.coverUrl = await this.cacheRemoteAssetToLocal(rawCoverUrl, cid);
          remainTransfer -= 1;
        }
      }
      nextList.push(next);
    }

    return nextList;
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
              i.user_count AS userCount, i.like_count AS likeCount,
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

    const rowsWithCache = await this.hydrateAssetUrlsToLocal(rows, { maxTransfer: 6 });
    const lists = (Array.isArray(rowsWithCache) ? rowsWithCache : []).map(item => ({
      ...this.normalizePluginOutputFields(item),
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
              i.user_count AS userCount, i.like_count AS likeCount,
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

    const [ detailRow ] = await this.hydrateAssetUrlsToLocal([ row ], { maxTransfer: 2 });

    return {
      ...this.normalizePluginOutputFields(detailRow || row),
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
    const safeIconUrl = await this.cacheRemoteAssetToLocal(payload.iconUrl, payload.assetCid);
    const safeCoverUrl = await this.cacheRemoteAssetToLocal(payload.coverUrl || payload.iconUrl, payload.assetCid);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_figma_plugin
       (name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url,
        figma_plugin_id, author_name, source_type, source_url,
        transport_type, runtime, protocol_version,
        category_id, status, is_recommended, sort_order, publish_time,
        click_count, view_count, user_count, like_count,
        seo_title, seo_keywords, seo_description,
        is_delete, create_time, update_time)
       VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, 0, ?, ?)`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          safeIconUrl || payload.iconUrl || null,
          safeCoverUrl || payload.coverUrl || safeIconUrl || payload.iconUrl || null,
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
          payload.userCount,
          payload.likeCount,
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
    const safeIconUrl = await this.cacheRemoteAssetToLocal(payload.iconUrl, payload.assetCid);
    const safeCoverUrl = await this.cacheRemoteAssetToLocal(payload.coverUrl || payload.iconUrl, payload.assetCid);

    await app.model.query(
      `UPDATE uied_figma_plugin
       SET name = ?, slug = ?, summary = ?, content = ?,
           icon_url = ?, cover_url = ?, official_url = ?, docs_url = ?, github_url = ?,
           figma_plugin_id = ?, author_name = ?, source_type = ?, source_url = ?,
           transport_type = ?, runtime = ?, protocol_version = ?,
           category_id = ?, status = ?, is_recommended = ?, sort_order = ?, publish_time = ?,
           user_count = ?, like_count = ?,
           seo_title = ?, seo_keywords = ?, seo_description = ?,
           update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          safeIconUrl || payload.iconUrl || null,
          safeCoverUrl || payload.coverUrl || safeIconUrl || payload.iconUrl || null,
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
          payload.userCount,
          payload.likeCount,
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
   * 获取 Figma 官方分类种子数据。
   * @return {Array<{name:string,slug:string,description:string,sortOrder:number}>}
   */
  getOfficialCategorySeedList() {
    const sourceCategoryMap = this.getOfficialSourceCategoryMap();
    const seedKeys = [
      'editing-effects',
      'development',
      'import-export',
      'file-organization',
      'accessibility',
    ];
    return seedKeys.map((key, index) => {
      const source = sourceCategoryMap[key] || {};
      const name = String(source.name || key).trim();
      return {
        name,
        slug: key,
        description: `Figma 官方插件分类：${name}`,
        sortOrder: (index + 1) * 10,
      };
    });
  }

  /**
   * 初始化 Figma 官方分类（已存在分类不会删除，仅补齐或更新基础描述）。
   * @return {Promise<{total:number,created:number,updated:number,skipped:number}>}
   */
  async categoryInitOfficial() {
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const seedList = this.getOfficialCategorySeedList();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const seed of seedList) {
      const name = String(seed.name || '').trim();
      const slug = String(seed.slug || '').trim().toLowerCase();
      if (!name || !slug) {
        skipped += 1;
        continue;
      }

      const [ existingBySlug ] = await app.model.query(
        'SELECT id, name, description, sort_order FROM uied_figma_plugin_category WHERE slug = ? AND is_delete = 0 LIMIT 1',
        {
          replacements: [ slug ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );

      if (existingBySlug && Number(existingBySlug.id || 0) > 0) {
        await app.model.query(
          `UPDATE uied_figma_plugin_category
           SET name = CASE WHEN name = '' THEN ? ELSE name END,
               description = CASE WHEN description = '' THEN ? ELSE description END,
               sort_order = CASE WHEN sort_order = 0 THEN ? ELSE sort_order END,
               update_time = ?
           WHERE id = ?`,
          {
            replacements: [
              name,
              String(seed.description || '').trim(),
              Number(seed.sortOrder || 0),
              now,
              Number(existingBySlug.id || 0),
            ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
        updated += 1;
        continue;
      }

      const [ existingByName ] = await app.model.query(
        'SELECT id FROM uied_figma_plugin_category WHERE name = ? AND is_delete = 0 LIMIT 1',
        {
          replacements: [ name ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      if (existingByName && Number(existingByName.id || 0) > 0) {
        await app.model.query(
          `UPDATE uied_figma_plugin_category
           SET slug = CASE WHEN slug = '' THEN ? ELSE slug END,
               description = CASE WHEN description = '' THEN ? ELSE description END,
               sort_order = CASE WHEN sort_order = 0 THEN ? ELSE sort_order END,
               update_time = ?
           WHERE id = ?`,
          {
            replacements: [
              slug,
              String(seed.description || '').trim(),
              Number(seed.sortOrder || 0),
              now,
              Number(existingByName.id || 0),
            ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
        updated += 1;
        continue;
      }

      const [ inserted ] = await app.model.query(
        `INSERT INTO uied_figma_plugin_category
         (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, '', ?, 0, ?, ?)`,
        {
          replacements: [
            name,
            slug,
            String(seed.description || '').trim(),
            Number(seed.sortOrder || 0),
            name,
            String(seed.description || '').trim(),
            now,
            now,
          ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
      if (Number(inserted || 0) > 0) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      total: seedList.length,
      created,
      updated,
      skipped,
    };
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
   * 获取官方采集分类配置表。
   * @return {Record<string, {key:string,name:string,url:string}>}
   */
  getOfficialSourceCategoryMap() {
    return {
      plugins: {
        key: 'plugins',
        name: '全部插件',
        url: 'https://www.figma.com/community/plugins',
      },
      'editing-effects': {
        key: 'editing-effects',
        name: '编辑效果',
        url: 'https://www.figma.com/community/editing-effects?resource_type=plugins',
      },
      development: {
        key: 'development',
        name: '开发协作',
        url: 'https://www.figma.com/community/development?resource_type=plugins',
      },
      'import-export': {
        key: 'import-export',
        name: '导入导出',
        url: 'https://www.figma.com/community/import-export?resource_type=plugins',
      },
      'file-organization': {
        key: 'file-organization',
        name: '文件组织',
        url: 'https://www.figma.com/community/file-organization?resource_type=plugins',
      },
      accessibility: {
        key: 'accessibility',
        name: '无障碍',
        url: 'https://www.figma.com/community/accessibility?resource_type=plugins',
      },
    };
  }

  /**
   * 从分类 key 或 URL 解析官方采集分类信息。
   * @param {string} input 分类 key 或来源地址
   * @return {{key:string,name:string,url:string}|null}
   */
  resolveOfficialSourceCategory(input = '') {
    const source = String(input || '').trim().toLowerCase();
    if (!source) return null;
    const categoryMap = this.getOfficialSourceCategoryMap();
    if (categoryMap[source]) {
      return categoryMap[source];
    }
    try {
      const normalized = this.normalizeCommunityUrl(source);
      const parsed = new URL(normalized);
      const path = String(parsed.pathname || '').trim().replace(/\/+$/, '').toLowerCase();
      if (path === '/community/plugins') {
        return categoryMap.plugins;
      }
      const matched = path.match(/^\/community\/([a-z0-9-]+)/i);
      const categoryKey = matched && matched[1] ? String(matched[1]).toLowerCase() : '';
      if (categoryKey && categoryMap[categoryKey]) {
        return categoryMap[categoryKey];
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  /**
   * 根据来源分类自动创建/获取本地分类，便于采集后自动归类。
   * @param {{key:string,name:string,url:string}|null} sourceCategory 分类信息
   * @return {Promise<number|null>}
   */
  async ensureCategoryBySourceCategory(sourceCategory) {
    if (!sourceCategory || !sourceCategory.key || !sourceCategory.name) return null;
    if (sourceCategory.key === 'plugins') return null;
    await this.ensureTables();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const [ bySlug ] = await app.model.query(
      'SELECT id FROM uied_figma_plugin_category WHERE slug = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ sourceCategory.key ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (bySlug && Number(bySlug.id || 0) > 0) {
      return Number(bySlug.id || 0);
    }

    const [ byName ] = await app.model.query(
      'SELECT id FROM uied_figma_plugin_category WHERE name = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ sourceCategory.name ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (byName && Number(byName.id || 0) > 0) {
      return Number(byName.id || 0);
    }

    const slug = await this.resolveUniqueSlug(sourceCategory.key, sourceCategory.name, 0, 'category');
    const [ inserted ] = await app.model.query(
      `INSERT INTO uied_figma_plugin_category
       (name, slug, description, sort_order, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
       VALUES (?, ?, ?, 0, ?, '', ?, 0, ?, ?)`,
      {
        replacements: [
          sourceCategory.name,
          slug,
          `Figma 官方采集分类：${sourceCategory.name}`,
          sourceCategory.name,
          sourceCategory.name,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
    return Number(inserted || 0) || null;
  }

  /**
   * 构建 Figma 插件列表回退采集地址集合。
   * 说明：社区首页为动态渲染时，使用公开分类页补齐插件详情链接。
   * @param {string} sourceUrl 来源地址
   * @param {{includeGlobalFallback?:boolean}} options 额外选项
   * @return {string[]}
   */
  buildPluginListFallbackSources(sourceUrl = '', options = {}) {
    const normalizedSource = this.normalizeCommunityUrl(sourceUrl);
    const includeGlobalFallback = options && options.includeGlobalFallback !== false;
    const sourceList = [ normalizedSource ];
    if (includeGlobalFallback) {
      sourceList.push(
        'https://www.figma.com/community/editing-effects?resource_type=plugins',
        'https://www.figma.com/community/development?resource_type=plugins',
        'https://www.figma.com/community/import-export?resource_type=plugins',
        'https://www.figma.com/community/file-organization?resource_type=plugins',
        'https://www.figma.com/community/accessibility?resource_type=plugins'
      );
    }
    return Array.from(new Set(sourceList.map(item => String(item || '').trim()).filter(Boolean)));
  }

  /**
   * 通过回退分类页采集插件详情链接。
   * @param {string} sourceUrl 来源地址
   * @param {number} limit 最多采集数量
   * @param {{includeGlobalFallback?:boolean}} options 额外选项
   * @return {Promise<string[]>}
   */
  async collectPluginLinksByFallbackSources(sourceUrl = '', limit = 20, options = {}) {
    const { ctx } = this;
    const maxCount = this.clamp(this.parsePositiveInt(limit, 20), 1, 120);
    const collected = new Set();
    const fallbackSources = this.buildPluginListFallbackSources(sourceUrl, options);
    for (const fallbackUrl of fallbackSources) {
      if (collected.size >= maxCount) break;
      try {
        const pageHtml = await this.fetchHtml(fallbackUrl, { allowReadOnlyFallback: true });
        const links = this.extractPluginLinksFromHtml(pageHtml);
        for (const link of links) {
          if (!link) continue;
          collected.add(link);
          if (collected.size >= maxCount) break;
        }
      } catch (error) {
        ctx.logger.warn('[uied.figma] 回退地址采集失败: %s -> %s', fallbackUrl, error?.message || error);
      }
    }
    return Array.from(collected).slice(0, maxCount);
  }

  /**
   * 官方采集“应急插件链接种子”。
   * 说明：当社区页动态渲染/网络抖动导致未提取到任何链接时，使用官方插件详情链接兜底。
   * @param {number} limit 最大数量
   * @return {string[]}
   */
  getEmergencyPluginSeedLinks(limit = 20) {
    const maxCount = this.clamp(this.parsePositiveInt(limit, 20), 1, 120);
    const seedLinks = [
      'https://www.figma.com/community/plugin/1159123024924461424/html-to-design-by-divriots-import-websites-to-figma-designs-web-html-css',
      'https://www.figma.com/community/plugin/1592951406757461439/json-exporter-importer',
      'https://www.figma.com/community/plugin/762070688792833472/arc-bend-your-type',
      'https://www.figma.com/community/plugin/733902567457592893/autoflow',
      'https://www.figma.com/community/plugin/741472919529947576/skewdat',
      'https://www.figma.com/community/plugin/1521307608615567073/uixx-ai-review-for-ui-ux-design',
      'https://www.figma.com/community/plugin/735098390272716381/iconify',
      'https://www.figma.com/community/plugin/738454987945972471/unsplash',
      'https://www.figma.com/community/plugin/842128343887142055/figma-to-code-html-tailwind-flutter-swiftui',
      'https://www.figma.com/community/plugin/791103617505812222/icons8-icons-illustrations-photos',
      'https://www.figma.com/community/plugin/857346721138427857/anima-figma-to-code-react-html-css-tailwind-mui-devmode-inspect-react-html-vue-css',
      'https://www.figma.com/community/plugin/738992712906748191/remove-bg',
      'https://www.figma.com/community/plugin/740272380439725040/material-design-icons',
      'https://www.figma.com/community/plugin/817043359134136295/mockup-plugin-devices-mockups-print-mockups-warp-and-distort-transformation',
      'https://www.figma.com/community/plugin/997643096679511216/icons8-background-remover',
      'https://www.figma.com/community/plugin/747985167520967365/builder-io-figma-to-code-ai-apps-react-vue-tailwind-etc',
      'https://www.figma.com/community/plugin/736000994034548392/lorem-ipsum-by-divriots',
      'https://www.figma.com/community/plugin/1146185659935567786/open-iconic-icon-set-by-iconduck',
      'https://www.figma.com/community/plugin/744098704933821409/iconscout-icons-illustrations-3d-assets-lottie-animations',
      'https://www.figma.com/community/plugin/736737028347625415/get-waves',
    ];
    return Array.from(new Set(seedLinks)).slice(0, maxCount);
  }

  /**
   * 从插件详情 HTML 中提取结构化字段。
   * @param {string} pluginUrl 插件链接
   * @param {string} html 插件详情 HTML
   * @return {{pluginId:string,name:string,summary:string,iconUrl:string,coverUrl:string,userCount:number,likeCount:number}}
   */
  parsePluginDetailFromHtml(pluginUrl, html) {
    const source = String(html || '');
    const sourcePluginUrl = this.normalizePluginDetailUrl(this.extractLineValueByLabel(source, 'URL Source')) || pluginUrl;
    const pluginId = this.parsePluginIdByUrl(sourcePluginUrl);
    const ogTitle = this.extractMetaContent(source, [ 'og:title', 'twitter:title' ]);
    const lineTitle = this.extractLineValueByLabel(source, 'Title');
    const markdownHeading = this.extractFirstMarkdownHeading(source);
    const htmlTitle = this.extractHtmlTitle(source);
    const name = this.sanitizeFigmaTitle(
      ogTitle || lineTitle || markdownHeading || htmlTitle || this.extractPluginNameFromUrl(sourcePluginUrl) || `Figma Plugin ${pluginId || ''}`
    );
    const summary = this.extractMetaContent(source, [ 'og:description', 'description', 'twitter:description' ])
      || this.extractSummaryFromAboutSection(source)
      || this.extractSummaryFromText(source);
    const iconUrl = this.extractPluginIconUrlFromText(source)
      || this.extractMetaContent(source, [ 'og:image', 'twitter:image' ]);
    const coverUrl = this.extractPluginCoverUrlFromText(source)
      || this.extractMetaContent(source, [ 'og:image', 'twitter:image' ]);
    const stats = this.extractPluginStatsFromText(source);
    return {
      pluginId,
      name,
      summary,
      iconUrl,
      coverUrl,
      userCount: Number(stats.userCount || 0),
      likeCount: Number(stats.likeCount || 0),
    };
  }

  /**
   * 通过官方社区链接导入 Figma 插件数据（支持汉化标题/简介）。
   * @param {Record<string, any>} payload 导入参数
   * @return {Promise<{sourceUrl:string,scanned:number,created:number,updated:number,failed:number,items:any[]}>}
   */
  async importOfficial(payload = {}) {
    await this.ensureTables();
    const sourceCategoryRaw = String(payload.sourceCategory || payload.source_category || '').trim();
    const sourceCategoryByInput = this.resolveOfficialSourceCategory(sourceCategoryRaw);
    const sourceUrlRaw = sourceCategoryByInput
      ? sourceCategoryByInput.url
      : (payload.sourceUrl || payload.source_url);
    const sourceUrl = this.normalizeCommunityUrl(sourceUrlRaw);
    const sourceCategoryByUrl = this.resolveOfficialSourceCategory(sourceUrl);
    const sourceCategory = sourceCategoryByInput || sourceCategoryByUrl;
    const strictCollectByCategory = Boolean(sourceCategory && sourceCategory.key && sourceCategory.key !== 'plugins');
    const limit = this.clamp(this.parsePositiveInt(payload.limit, 20), 1, 120);
    const categoryId = this.parsePositiveInt(payload.categoryId ?? payload.category_id, 0) || null;
    const autoCategory = payload.autoCategory === true
      || payload.autoCategory === 1
      || String(payload.autoCategory || '').trim().toLowerCase() === 'true';
    const status = String(payload.status || '').trim().toLowerCase() === 'draft' ? 'draft' : 'published';
    const shouldTranslate = payload.translate !== false && payload.translate !== 0;
    const defaultSortOrder = Number.isFinite(Number(payload.sortOrder ?? payload.sort_order))
      ? Number(payload.sortOrder ?? payload.sort_order)
      : 0;
    const assetCid = this.parsePositiveInt(payload.assetCid ?? payload.asset_cid ?? payload.cid, 0);
    const now = Math.floor(Date.now() / 1000);
    const { app, ctx } = this;
    let targetCategoryId = categoryId;
    if (!targetCategoryId && autoCategory && sourceCategory) {
      targetCategoryId = await this.ensureCategoryBySourceCategory(sourceCategory);
    }

    const sourceHtml = await this.fetchHtml(sourceUrl, { allowReadOnlyFallback: true });
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
    /**
     * 社区首页通常为动态渲染，抓不到详情链接时自动回退分类页。
     */
    if (pluginLinks.length === 0) {
      pluginLinks = await this.collectPluginLinksByFallbackSources(sourceUrl, limit, {
        includeGlobalFallback: !strictCollectByCategory,
      });
    }
    /**
     * 最终兜底：仍未提取到链接时，使用应急官方插件详情链接集合，避免“扫描 0”。
     */
    if (pluginLinks.length === 0 && !strictCollectByCategory) {
      pluginLinks = this.getEmergencyPluginSeedLinks(limit);
      ctx.logger.warn('[uied.figma] 未提取到插件链接，已启用应急官方链接种子，数量: %s', pluginLinks.length);
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
        const detailHtml = await this.fetchHtml(pluginUrl, { allowReadOnlyFallback: true });
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
        const safeSummary = cnSummary || summaryRaw || `${safeTitle} 的 Figma 插件介绍，详情请查看官方页面。`;
        const safeIconUrl = await this.cacheRemoteAssetToLocal(parsed.iconUrl || parsed.coverUrl || '', assetCid);
        const safeCoverUrl = await this.cacheRemoteAssetToLocal(parsed.coverUrl || parsed.iconUrl || '', assetCid);
        const finalIconUrl = safeIconUrl || parsed.iconUrl || parsed.coverUrl || null;
        const finalCoverUrl = safeCoverUrl || parsed.coverUrl || parsed.iconUrl || finalIconUrl || null;
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
                 user_count = ?, like_count = ?,
                 status = ?, seo_title = ?, seo_description = ?, source_type = 'figma_community',
                 source_url = ?, publish_time = COALESCE(publish_time, ?), update_time = ?
             WHERE id = ?`,
            {
              replacements: [
                safeTitle,
                safeSummary,
                finalIconUrl,
                finalCoverUrl,
                pluginUrl,
                parsed.pluginId || '',
                targetCategoryId,
                Number(parsed.userCount || 0),
                Number(parsed.likeCount || 0),
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
            click_count, view_count, user_count, like_count, seo_title, seo_keywords, seo_description, is_delete, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, '', 'figma_community', ?, 'http', 'other', '', ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, '', ?, 0, ?, ?)`,
          {
            replacements: [
              safeTitle,
              slug,
              safeSummary,
              safeSummary,
              finalIconUrl,
              finalCoverUrl,
              pluginUrl,
              parsed.pluginId || '',
              sourceUrl,
              targetCategoryId,
              status,
              defaultSortOrder,
              now,
              Number(parsed.userCount || 0),
              Number(parsed.likeCount || 0),
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

    result.sourceCategory = sourceCategory ? sourceCategory.key : '';
    result.sourceCategoryName = sourceCategory ? sourceCategory.name : '';
    result.categoryId = targetCategoryId || null;
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
    const sortByRaw = String(params.sort || params.sortBy || '').trim().toLowerCase();

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

    /**
     * 构建排序 SQL，仅允许受控枚举避免注入风险。
     * - latest: 最新发布
     * - hot: 热度优先（推荐+浏览+点击）
     * - users: 使用人数优先
     * - likes: 收藏关注优先
     */
    const resolveOrderSql = sortBy => {
      if (sortBy === 'hot') {
        return 'i.is_recommended DESC, i.view_count DESC, i.click_count DESC, COALESCE(i.publish_time, i.update_time) DESC, i.id DESC';
      }
      if (sortBy === 'users') {
        return 'i.user_count DESC, i.like_count DESC, COALESCE(i.publish_time, i.update_time) DESC, i.id DESC';
      }
      if (sortBy === 'likes') {
        return 'i.like_count DESC, i.user_count DESC, COALESCE(i.publish_time, i.update_time) DESC, i.id DESC';
      }
      return 'COALESCE(i.publish_time, i.update_time) DESC, i.id DESC';
    };
    const orderSql = resolveOrderSql(sortByRaw);

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
              i.user_count AS userCount, i.like_count AS likeCount,
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
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const total = Number(countRow?.total || 0);
    const rowsWithCache = await this.hydrateAssetUrlsToLocal(rows, { maxTransfer: 8 });
    const lists = (Array.isArray(rowsWithCache) ? rowsWithCache : []).map(item => ({
      ...this.normalizePluginOutputFields(item),
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
              i.user_count AS userCount, i.like_count AS likeCount,
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
              i.transport_type AS transportType, i.runtime, i.publish_time AS publishTime,
              i.user_count AS userCount, i.like_count AS likeCount
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

    const [ detailRow ] = await this.hydrateAssetUrlsToLocal([ row ], { maxTransfer: 4 });
    const relatedRows = await this.hydrateAssetUrlsToLocal(related, { maxTransfer: 4 });

    return {
      ...this.normalizePluginOutputFields(detailRow || row),
      tags: Array.isArray(tags) ? tags : [],
      related: (Array.isArray(relatedRows) ? relatedRows : []).map(item => this.normalizePluginOutputFields(item)),
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
