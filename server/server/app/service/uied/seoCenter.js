/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
/**
 * @file service/uied/seoCenter.js
 * @description SEO 中心服务（TDK/Robots/Sitemap/重定向/404监测/链接检测/站长推送）
 */

'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SEO_CENTER_CONFIG_KEY = 'seoCenterConfig';
const SEO_404_LOG_KEY = 'seo404Logs';
const SEO_INVALID_URL_LOG_KEY = 'seoInvalidUrlLogs';
const SEO_LINK_DETECTOR_LOG_KEY = 'seoLinkDetectorLogs';
const SEO_IMAGE_OPT_LOG_KEY = 'seoImageOptimizationLogs';
const SEO_PUSH_LOG_KEY = 'seoPushLogs';
const SEO_AUTO_TASK_LOG_KEY = 'seoAutoTaskLogs';
const SEO_AUTO_TASK_STATE_KEY = 'seoAutoTaskState';
let SEO_RELEASE_UPDATED_AT_MS = Date.now();
try {
  // 所有 Egg worker 统一读取发布包时间，避免多进程响应产生不同的静态页 lastmod。
  SEO_RELEASE_UPDATED_AT_MS = fs.statSync(path.join(__dirname, '../../../package.json')).mtimeMs;
} catch (_error) {
  // 文件时间不可用时保留进程启动时间兜底。
}

class SeoCenterService extends Service {
  /**
   * 判断是否为普通对象
   * @param {unknown} value 待判断值
   * @return {boolean} 判断结果
   */
  isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  /**
   * 安全转字符串并去空格
   * @param {unknown} value 原始值
   * @param {string} fallback 默认值
   * @return {string} 结果字符串
   */
  normalizeString(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  /**
   * 规范化布尔值
   * @param {unknown} value 原始值
   * @param {boolean} fallback 默认值
   * @return {boolean} 布尔值
   */
  normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
    return fallback;
  }

  /**
   * 规范化数字并限制范围
   * @param {unknown} value 原始值
   * @param {number} fallback 默认值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @return {number} 结果数字
   */
  normalizeNumber(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  /**
   * 将秒级、毫秒级或日期字符串统一转换为毫秒时间戳。
   * @param {unknown} value 原始时间值
   * @param {number} fallback 默认毫秒时间戳
   * @return {number} 毫秒时间戳
   */
  normalizeTimestampMs(value, fallback = Date.now()) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue > 9999999999 ? numericValue : numericValue * 1000;
    }
    const parsedValue = Date.parse(String(value || ''));
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
  }

  /**
   * 规范化字符串数组
   * @param {unknown} value 原始值
   * @return {string[]} 去重后的字符串数组
   */
  normalizeStringList(value) {
    const list = Array.isArray(value)
      ? value
      : String(value || '')
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
    return Array.from(new Set(list.map(item => String(item || '').trim()).filter(Boolean)));
  }

  /**
   * 生成稳定 ID
   * @return {string} 唯一 ID
   */
  createId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 获取 SEO 中心默认配置
   * @return {Record<string, any>} 默认配置
   */
  getDefaultConfig() {
    return {
      tdkOptimization: {
        homeTitleTemplate: '{siteTitle}',
        pageTitleTemplate: '{pageTitle} - {siteName}',
        categoryTitleTemplate: '{categoryName} - {siteName}',
        tagTitleTemplate: '{tagName} - {siteName}',
        articleTitleTemplate: '{articleTitle} - {siteName}',
        websiteTitleTemplate: '{websiteName} - {siteName}',
        descriptionTemplate: '{description}',
        keywordsTemplate: '{keywords}',
      },
      imageOptimization: {
        enabled: true,
        preferWebp: true,
        lazyLoad: true,
        addWidthHeight: true,
        maxImageWidth: 1600,
      },
      linkRewrite: {
        enabled: true,
        forceHttps: false,
        lowerCasePath: false,
        removeTrailingSlash: false,
        stripIndexHtml: true,
        removeTrackingParams: true,
        trackingParams: [
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'from',
          'spm',
        ],
      },
      monitoring: {
        enable404Monitor: true,
        max404Logs: 500,
        invalidScanLimit: 200,
        linkDetectorLimit: 120,
        slowThresholdMs: 3000,
        sslExpireWarnDays: 14,
      },
      robots: {
        enabled: true,
        userAgent: '*',
        allowPaths: [ '/' ],
        disallowPaths: [ '/admin', '/api' ],
        crawlDelay: 0,
        extraRules: '',
        includeSitemap: true,
      },
      sitemap: {
        enabled: true,
        includeWebsiteDetails: true,
        websiteLimit: 5000,
        includeNoindex: false,
        changefreq: 'daily',
        priority: 0.8,
        advancedEnabled: true,
        maxUrlsPerFile: 1000,
        includeCategoryPages: true,
        includeTagPages: true,
        includeArticlePages: true,
      },
      webmasterVerification: {
        baidu: '',
        google: '',
        bing: '',
        sogou: '',
        so360: '',
      },
      redirects: [],
      internalLinkManagement: {
        enabled: false,
        maxLinksPerPage: 6,
        relatedByCategory: true,
        relatedByTag: true,
      },
      advancedLinkDetector: {
        enabled: true,
        timeoutMs: 6000,
        checkHttps: true,
        checkRedirect: true,
        checkSslExpiry: true,
      },
      platformPush: {
        baidu: {
          enabled: false,
          site: '',
          token: '',
          endpoint: 'http://data.zz.baidu.com/urls',
        },
        bing: {
          enabled: false,
          apiKey: '',
          site: '',
          endpoint: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch',
        },
        indexNow: {
          enabled: false,
          host: '',
          key: '',
          keyLocation: '',
          endpoint: 'https://api.indexnow.org/indexnow',
        },
      },
      autoTasks: {
        enabled: false,
        intervalMinutes: 30,
        tasks: {
          invalidScan: true,
          linkDetector: true,
          imageOptimization: false,
          sitemapGenerate: true,
          logs404Digest: true,
          platformPush: false,
        },
        pushPlatform: 'baidu',
        pushLimit: 100,
        siteOrigin: '',
        digestLookbackDays: 7,
      },
    };
  }

  /**
   * 深度合并配置对象
   * @param {Record<string, any>} base 基础对象
   * @param {Record<string, any>} patch 补丁对象
   * @return {Record<string, any>} 合并结果
   */
  deepMerge(base, patch) {
    const source = this.isPlainObject(base) ? base : {};
    const target = this.isPlainObject(patch) ? patch : {};
    const result = { ...source };

    Object.keys(target).forEach(key => {
      const nextValue = target[key];
      const currentValue = source[key];
      if (this.isPlainObject(currentValue) && this.isPlainObject(nextValue)) {
        result[key] = this.deepMerge(currentValue, nextValue);
      } else {
        result[key] = nextValue;
      }
    });

    return result;
  }

  /**
   * 规范化重定向规则列表
   * @param {unknown} value 原始规则列表
   * @return {Array<Record<string, any>>} 规范化后的规则列表
   */
  normalizeRedirectRules(value) {
    const list = Array.isArray(value) ? value : [];
    return list
      .map((item, index) => {
        const id = this.normalizeString(item?.id || '') || this.createId();
        const from = this.normalizeRedirectFromPath(item?.from || '');
        const toRaw = this.normalizeString(item?.to || '/');
        const to = /^https?:\/\//i.test(toRaw)
          ? toRaw
          : this.normalizePath(toRaw || '/');
        const type = String(item?.type || '301').trim() === '302' ? '302' : '301';
        const enabled = this.normalizeBoolean(item?.enabled, true);
        const preserveQuery = this.normalizeBoolean(item?.preserveQuery, true);
        const sort = this.normalizeNumber(item?.sort, (index + 1) * 10, 1, 999999);
        const note = this.normalizeString(item?.note || '');
        return { id, from, to, type, enabled, preserveQuery, sort, note };
      })
      .sort((a, b) => a.sort - b.sort);
  }

  /**
   * 规范化重定向来源路径（统一去除尾斜杠，空值保留为空，根路径保留 /）
   * @param {unknown} pathValue 来源路径
   * @return {string} 规范化来源路径
   */
  normalizeRedirectFromPath(pathValue) {
    const raw = this.normalizeString(pathValue || '');
    if (!raw) return '';
    const normalizedPath = this.normalizePath(raw);
    if (normalizedPath === '/') return '/';
    const cleaned = normalizedPath.replace(/\/+$/, '');
    return cleaned || '/';
  }

  /**
   * 生成重定向来源路径比对键（忽略大小写，避免重复配置）
   * @param {unknown} pathValue 来源路径
   * @return {string} 比对键
   */
  buildRedirectFromKey(pathValue) {
    return this.normalizeRedirectFromPath(pathValue).toLowerCase();
  }

  /**
   * 校验重定向规则来源路径是否重复
   * @param {Array<Record<string, any>>} rules 规则列表
   */
  validateRedirectRules(rules = []) {
    const sourceMap = new Map();
    for (const rule of Array.isArray(rules) ? rules : []) {
      const fromPath = this.normalizeRedirectFromPath(rule?.from || '');
      if (!fromPath || fromPath === '/') {
        const error = new Error('来源路径不能为空，也不能配置为根路径 /');
        error.code = 'SEO_REDIRECT_FROM_INVALID';
        throw error;
      }
      if (!this.normalizeString(rule?.to || '')) {
        const error = new Error(`目标地址不能为空：${fromPath}`);
        error.code = 'SEO_REDIRECT_TO_INVALID';
        throw error;
      }
      const fromKey = this.buildRedirectFromKey(fromPath);
      if (!fromKey) continue;
      const existing = sourceMap.get(fromKey);
      if (existing) {
        const error = new Error(`来源路径已存在：${fromPath}`);
        error.code = 'SEO_REDIRECT_FROM_DUPLICATED';
        throw error;
      }
      sourceMap.set(fromKey, true);
    }
  }

  /**
   * 规范化 SEO 中心配置
   * @param {unknown} value 原始配置
   * @return {Record<string, any>} 规范化配置
   */
  normalizeConfig(value) {
    const defaults = this.getDefaultConfig();
    const merged = this.deepMerge(defaults, this.isPlainObject(value) ? value : {});

    return {
      tdkOptimization: {
        homeTitleTemplate: this.normalizeString(merged.tdkOptimization?.homeTitleTemplate, defaults.tdkOptimization.homeTitleTemplate),
        pageTitleTemplate: this.normalizeString(merged.tdkOptimization?.pageTitleTemplate, defaults.tdkOptimization.pageTitleTemplate),
        categoryTitleTemplate: this.normalizeString(merged.tdkOptimization?.categoryTitleTemplate, defaults.tdkOptimization.categoryTitleTemplate),
        tagTitleTemplate: this.normalizeString(merged.tdkOptimization?.tagTitleTemplate, defaults.tdkOptimization.tagTitleTemplate),
        articleTitleTemplate: this.normalizeString(merged.tdkOptimization?.articleTitleTemplate, defaults.tdkOptimization.articleTitleTemplate),
        websiteTitleTemplate: this.normalizeString(merged.tdkOptimization?.websiteTitleTemplate, defaults.tdkOptimization.websiteTitleTemplate),
        descriptionTemplate: this.normalizeString(merged.tdkOptimization?.descriptionTemplate, defaults.tdkOptimization.descriptionTemplate),
        keywordsTemplate: this.normalizeString(merged.tdkOptimization?.keywordsTemplate, defaults.tdkOptimization.keywordsTemplate),
      },
      imageOptimization: {
        enabled: this.normalizeBoolean(merged.imageOptimization?.enabled, defaults.imageOptimization.enabled),
        preferWebp: this.normalizeBoolean(merged.imageOptimization?.preferWebp, defaults.imageOptimization.preferWebp),
        lazyLoad: this.normalizeBoolean(merged.imageOptimization?.lazyLoad, defaults.imageOptimization.lazyLoad),
        addWidthHeight: this.normalizeBoolean(merged.imageOptimization?.addWidthHeight, defaults.imageOptimization.addWidthHeight),
        maxImageWidth: this.normalizeNumber(
          merged.imageOptimization?.maxImageWidth,
          defaults.imageOptimization.maxImageWidth,
          320,
          3840
        ),
      },
      linkRewrite: {
        enabled: this.normalizeBoolean(merged.linkRewrite?.enabled, defaults.linkRewrite.enabled),
        forceHttps: this.normalizeBoolean(merged.linkRewrite?.forceHttps, defaults.linkRewrite.forceHttps),
        lowerCasePath: this.normalizeBoolean(merged.linkRewrite?.lowerCasePath, defaults.linkRewrite.lowerCasePath),
        removeTrailingSlash: this.normalizeBoolean(merged.linkRewrite?.removeTrailingSlash, defaults.linkRewrite.removeTrailingSlash),
        stripIndexHtml: this.normalizeBoolean(merged.linkRewrite?.stripIndexHtml, defaults.linkRewrite.stripIndexHtml),
        removeTrackingParams: this.normalizeBoolean(merged.linkRewrite?.removeTrackingParams, defaults.linkRewrite.removeTrackingParams),
        trackingParams: this.normalizeStringList(merged.linkRewrite?.trackingParams),
      },
      monitoring: {
        enable404Monitor: this.normalizeBoolean(merged.monitoring?.enable404Monitor, defaults.monitoring.enable404Monitor),
        max404Logs: this.normalizeNumber(merged.monitoring?.max404Logs, defaults.monitoring.max404Logs, 50, 2000),
        invalidScanLimit: this.normalizeNumber(merged.monitoring?.invalidScanLimit, defaults.monitoring.invalidScanLimit, 10, 2000),
        linkDetectorLimit: this.normalizeNumber(merged.monitoring?.linkDetectorLimit, defaults.monitoring.linkDetectorLimit, 10, 1000),
        slowThresholdMs: this.normalizeNumber(merged.monitoring?.slowThresholdMs, defaults.monitoring.slowThresholdMs, 500, 20000),
        sslExpireWarnDays: this.normalizeNumber(merged.monitoring?.sslExpireWarnDays, defaults.monitoring.sslExpireWarnDays, 1, 180),
      },
      robots: {
        enabled: this.normalizeBoolean(merged.robots?.enabled, defaults.robots.enabled),
        userAgent: this.normalizeString(merged.robots?.userAgent, defaults.robots.userAgent),
        allowPaths: this.normalizeStringList(merged.robots?.allowPaths).map(item => this.normalizePath(item)),
        disallowPaths: this.normalizeStringList(merged.robots?.disallowPaths).map(item => this.normalizePath(item)),
        crawlDelay: this.normalizeNumber(merged.robots?.crawlDelay, defaults.robots.crawlDelay, 0, 60),
        extraRules: this.normalizeString(merged.robots?.extraRules, ''),
        includeSitemap: this.normalizeBoolean(merged.robots?.includeSitemap, defaults.robots.includeSitemap),
      },
      sitemap: {
        enabled: this.normalizeBoolean(merged.sitemap?.enabled, defaults.sitemap.enabled),
        includeWebsiteDetails: this.normalizeBoolean(merged.sitemap?.includeWebsiteDetails, defaults.sitemap.includeWebsiteDetails),
        websiteLimit: this.normalizeNumber(merged.sitemap?.websiteLimit, defaults.sitemap.websiteLimit, 50, 50000),
        includeNoindex: this.normalizeBoolean(merged.sitemap?.includeNoindex, defaults.sitemap.includeNoindex),
        changefreq: this.normalizeString(merged.sitemap?.changefreq, defaults.sitemap.changefreq),
        priority: Number(this.normalizeNumber(merged.sitemap?.priority, defaults.sitemap.priority, 0.1, 1.0).toFixed(1)),
        advancedEnabled: this.normalizeBoolean(merged.sitemap?.advancedEnabled, defaults.sitemap.advancedEnabled),
        maxUrlsPerFile: this.normalizeNumber(merged.sitemap?.maxUrlsPerFile, defaults.sitemap.maxUrlsPerFile, 100, 20000),
        includeCategoryPages: this.normalizeBoolean(merged.sitemap?.includeCategoryPages, defaults.sitemap.includeCategoryPages),
        includeTagPages: this.normalizeBoolean(merged.sitemap?.includeTagPages, defaults.sitemap.includeTagPages),
        includeArticlePages: this.normalizeBoolean(merged.sitemap?.includeArticlePages, defaults.sitemap.includeArticlePages),
      },
      webmasterVerification: {
        baidu: this.normalizeString(merged.webmasterVerification?.baidu, ''),
        google: this.normalizeString(merged.webmasterVerification?.google, ''),
        bing: this.normalizeString(merged.webmasterVerification?.bing, ''),
        sogou: this.normalizeString(merged.webmasterVerification?.sogou, ''),
        so360: this.normalizeString(merged.webmasterVerification?.so360, ''),
      },
      redirects: this.normalizeRedirectRules(merged.redirects),
      internalLinkManagement: {
        enabled: this.normalizeBoolean(merged.internalLinkManagement?.enabled, defaults.internalLinkManagement.enabled),
        maxLinksPerPage: this.normalizeNumber(
          merged.internalLinkManagement?.maxLinksPerPage,
          defaults.internalLinkManagement.maxLinksPerPage,
          1,
          50
        ),
        relatedByCategory: this.normalizeBoolean(
          merged.internalLinkManagement?.relatedByCategory,
          defaults.internalLinkManagement.relatedByCategory
        ),
        relatedByTag: this.normalizeBoolean(
          merged.internalLinkManagement?.relatedByTag,
          defaults.internalLinkManagement.relatedByTag
        ),
      },
      advancedLinkDetector: {
        enabled: this.normalizeBoolean(merged.advancedLinkDetector?.enabled, defaults.advancedLinkDetector.enabled),
        timeoutMs: this.normalizeNumber(
          merged.advancedLinkDetector?.timeoutMs,
          defaults.advancedLinkDetector.timeoutMs,
          1000,
          20000
        ),
        checkHttps: this.normalizeBoolean(merged.advancedLinkDetector?.checkHttps, defaults.advancedLinkDetector.checkHttps),
        checkRedirect: this.normalizeBoolean(merged.advancedLinkDetector?.checkRedirect, defaults.advancedLinkDetector.checkRedirect),
        checkSslExpiry: this.normalizeBoolean(merged.advancedLinkDetector?.checkSslExpiry, defaults.advancedLinkDetector.checkSslExpiry),
      },
      platformPush: {
        baidu: {
          enabled: this.normalizeBoolean(merged.platformPush?.baidu?.enabled, defaults.platformPush.baidu.enabled),
          site: this.normalizeString(merged.platformPush?.baidu?.site, ''),
          token: this.normalizeString(merged.platformPush?.baidu?.token, ''),
          endpoint: this.normalizeString(merged.platformPush?.baidu?.endpoint, defaults.platformPush.baidu.endpoint),
        },
        bing: {
          enabled: this.normalizeBoolean(merged.platformPush?.bing?.enabled, defaults.platformPush.bing.enabled),
          apiKey: this.normalizeString(merged.platformPush?.bing?.apiKey, ''),
          site: this.normalizeString(merged.platformPush?.bing?.site, ''),
          endpoint: this.normalizeString(merged.platformPush?.bing?.endpoint, defaults.platformPush.bing.endpoint),
        },
        indexNow: {
          enabled: this.normalizeBoolean(merged.platformPush?.indexNow?.enabled, defaults.platformPush.indexNow.enabled),
          host: this.normalizeString(merged.platformPush?.indexNow?.host, ''),
          key: this.normalizeString(merged.platformPush?.indexNow?.key, ''),
          keyLocation: this.normalizeString(merged.platformPush?.indexNow?.keyLocation, ''),
          endpoint: this.normalizeString(merged.platformPush?.indexNow?.endpoint, defaults.platformPush.indexNow.endpoint),
        },
      },
      autoTasks: {
        enabled: this.normalizeBoolean(merged.autoTasks?.enabled, defaults.autoTasks.enabled),
        intervalMinutes: this.normalizeNumber(
          merged.autoTasks?.intervalMinutes,
          defaults.autoTasks.intervalMinutes,
          5,
          1440
        ),
        tasks: {
          invalidScan: this.normalizeBoolean(
            merged.autoTasks?.tasks?.invalidScan,
            defaults.autoTasks.tasks.invalidScan
          ),
          linkDetector: this.normalizeBoolean(
            merged.autoTasks?.tasks?.linkDetector,
            defaults.autoTasks.tasks.linkDetector
          ),
          imageOptimization: this.normalizeBoolean(
            merged.autoTasks?.tasks?.imageOptimization,
            defaults.autoTasks.tasks.imageOptimization
          ),
          sitemapGenerate: this.normalizeBoolean(
            merged.autoTasks?.tasks?.sitemapGenerate,
            defaults.autoTasks.tasks.sitemapGenerate
          ),
          logs404Digest: this.normalizeBoolean(
            merged.autoTasks?.tasks?.logs404Digest,
            defaults.autoTasks.tasks.logs404Digest
          ),
          platformPush: this.normalizeBoolean(
            merged.autoTasks?.tasks?.platformPush,
            defaults.autoTasks.tasks.platformPush
          ),
        },
        pushPlatform: [ 'baidu', 'bing', 'indexnow' ].includes(
          this.normalizeString(merged.autoTasks?.pushPlatform, defaults.autoTasks.pushPlatform).toLowerCase()
        )
          ? this.normalizeString(merged.autoTasks?.pushPlatform, defaults.autoTasks.pushPlatform).toLowerCase()
          : defaults.autoTasks.pushPlatform,
        pushLimit: this.normalizeNumber(
          merged.autoTasks?.pushLimit,
          defaults.autoTasks.pushLimit,
          1,
          1000
        ),
        siteOrigin: this.normalizeString(merged.autoTasks?.siteOrigin, ''),
        digestLookbackDays: this.normalizeNumber(
          merged.autoTasks?.digestLookbackDays,
          defaults.autoTasks.digestLookbackDays,
          1,
          90
        ),
      },
    };
  }

  /**
   * 获取 SEO 配置（实时）
   * @return {Promise<Record<string, any>>} 规范化配置
   */
  async getConfig() {
    const raw = await this.ctx.service.uied.setting.get(SEO_CENTER_CONFIG_KEY);
    return this.normalizeConfig(raw || {});
  }

  /**
   * 获取 SEO 配置（短时缓存）
   * @return {Promise<Record<string, any>>} 规范化配置
   */
  async getConfigCached() {
    const now = Date.now();
    if (this._seoCenterConfigCache && (now - Number(this._seoCenterConfigCacheAt || 0)) < 10000) {
      return this._seoCenterConfigCache;
    }
    const config = await this.getConfig();
    this._seoCenterConfigCache = config;
    this._seoCenterConfigCacheAt = now;
    return config;
  }

  /**
   * 保存 SEO 配置
   * @param {Record<string, any>} payload 配置补丁
   * @return {Promise<Record<string, any>>} 最新配置
   */
  async saveConfig(payload = {}) {
    const current = await this.getConfig();
    const merged = this.deepMerge(current, this.isPlainObject(payload) ? payload : {});
    const normalized = this.normalizeConfig(merged);
    this.validateRedirectRules(normalized.redirects);
    await this.ctx.service.uied.setting.save({ [SEO_CENTER_CONFIG_KEY]: normalized });
    this._seoCenterConfigCache = normalized;
    this._seoCenterConfigCacheAt = Date.now();
    return normalized;
  }

  /**
   * 构建对前端公开的 SEO 配置子集
   * @param {Record<string, any>} config SEO 配置
   * @return {Record<string, any>} 公开配置
   */
  buildPublicConfig(config = {}) {
    const normalized = this.normalizeConfig(config);
    return {
      tdkOptimization: normalized.tdkOptimization,
      webmasterVerification: normalized.webmasterVerification,
      linkRewrite: {
        enabled: normalized.linkRewrite.enabled,
        removeTrackingParams: normalized.linkRewrite.removeTrackingParams,
        trackingParams: normalized.linkRewrite.trackingParams,
      },
      robots: {
        enabled: normalized.robots.enabled,
        includeSitemap: normalized.robots.includeSitemap,
      },
    };
  }

  /**
   * 规范化路由路径
   * @param {unknown} pathValue 路径值
   * @return {string} 规范化路径
   */
  normalizePath(pathValue) {
    const raw = String(pathValue || '').trim();
    if (!raw) return '/';
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        return this.normalizePath(`${parsed.pathname || '/'}${parsed.search || ''}`);
      } catch (_error) {
        return '/';
      }
    }
    if (raw.startsWith('?')) return `/${raw}`;
    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    return normalized.replace(/\/+/g, '/').replace(/\s+/g, '');
  }

  /**
   * 解析站点主域名
   * @param {string} customOrigin 自定义主域名
   * @return {string} 规范化后的主域名
   */
  resolveSiteOrigin(customOrigin = '') {
    const candidate = this.normalizeString(customOrigin)
      || this.normalizeString(process.env.UIED_SITE_ORIGIN)
      || this.normalizeString(this.ctx.request.origin)
      || 'https://hao.uied.cn';
    try {
      return new URL(candidate).origin;
    } catch (_error) {
      return 'https://hao.uied.cn';
    }
  }

  /**
   * 拼接绝对地址
   * @param {string} origin 站点主域名
   * @param {string} path 路径
   * @return {string} 绝对地址
   */
  toAbsoluteUrl(origin, path) {
    const safeOrigin = this.resolveSiteOrigin(origin);
    const safePath = this.normalizePath(path);
    return `${safeOrigin}${safePath}`;
  }

  /**
   * 转义 XML 文本
   * @param {unknown} value 原始文本
   * @return {string} 转义后文本
   */
  escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 将 Unix 时间戳转为 W3C 日期
   * @param {unknown} unixValue Unix 秒级/毫秒级时间戳
   * @return {string} ISO 日期
   */
  toW3cDate(unixValue) {
    const raw = Number(unixValue || 0);
    if (!Number.isFinite(raw) || raw <= 0) {
      return new Date().toISOString();
    }
    const ms = raw > 9999999999 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }

  /**
   * 记录日志（固定长度）
   * @param {string} key 设置键名
   * @param {Record<string, any>} entry 日志项
   * @param {number} maxCount 最大保留条数
   * @return {Promise<Record<string, any>>} 新日志项
   */
  async appendLog(key, entry, maxCount = 300) {
    const oldLogs = await this.ctx.service.uied.setting.get(key).catch(() => []);
    const list = Array.isArray(oldLogs) ? oldLogs : [];
    const next = [ entry, ...list ].slice(0, Math.max(20, maxCount));
    await this.ctx.service.uied.setting.save({ [key]: next });
    return entry;
  }

  /**
   * 读取日志列表
   * @param {string} key 设置键名
   * @return {Promise<Array<Record<string, any>>>} 日志列表
   */
  async getLogs(key) {
    const rows = await this.ctx.service.uied.setting.get(key).catch(() => []);
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 清空指定日志
   * @param {string} key 设置键名
   */
  async clearLogs(key) {
    await this.ctx.service.uied.setting.save({ [key]: [] });
  }

  /**
   * 记录 404 日志
   * @param {Record<string, any>} payload 404 信息
   * @return {Promise<Record<string, any>>} 日志条目
   */
  async record404Log(payload = {}) {
    const config = await this.getConfigCached();
    if (!config.monitoring.enable404Monitor) {
      return { ignored: true };
    }
    const entry = {
      id: this.createId(),
      path: this.normalizeString(payload.path || '/'),
      referer: this.normalizeString(payload.referer || ''),
      userAgent: this.normalizeString(payload.userAgent || ''),
      source: this.normalizeString(payload.source || 'server'),
      ip: this.normalizeString(payload.ip || ''),
      createdAt: new Date().toISOString(),
    };
    await this.appendLog(SEO_404_LOG_KEY, entry, config.monitoring.max404Logs);
    return entry;
  }

  /**
   * 解析 robots.txt 内容
   * @param {Record<string, any>} options 可选参数
   * @return {Promise<string>} robots 文本
   */
  async buildRobotsTxt(options = {}) {
    const config = await this.getConfigCached();
    const robots = config.robots || {};
    const siteOrigin = this.resolveSiteOrigin(options.siteOrigin || '');
    const lines = [];

    lines.push(`# Generated by UIED SEO Center at ${new Date().toISOString()}`);
    lines.push(`User-agent: ${this.normalizeString(robots.userAgent, '*')}`);

    const allowPaths = this.normalizeStringList(robots.allowPaths || [ '/' ]);
    const disallowPaths = this.normalizeStringList(robots.disallowPaths || []);

    if (allowPaths.length === 0) {
      lines.push('Allow: /');
    } else {
      allowPaths.forEach(item => lines.push(`Allow: ${this.normalizePath(item)}`));
    }
    disallowPaths.forEach(item => lines.push(`Disallow: ${this.normalizePath(item)}`));

    const crawlDelay = Number(robots.crawlDelay || 0);
    if (Number.isFinite(crawlDelay) && crawlDelay > 0) {
      lines.push(`Crawl-delay: ${Math.floor(crawlDelay)}`);
    }

    const extraRules = String(robots.extraRules || '').trim();
    if (extraRules) {
      lines.push('');
      lines.push(extraRules);
    }

    if (robots.includeSitemap !== false) {
      lines.push('');
      lines.push(`Sitemap: ${siteOrigin}/sitemap.xml`);
      if (config.sitemap.advancedEnabled) {
        lines.push(`Sitemap: ${siteOrigin}/sitemap-advanced.xml`);
      }
    }

    return `${lines.join('\n').trim()}\n`;
  }

  /**
   * 获取 sitemap 路由清单
   * @param {Record<string, any>} options 可选参数
   * @return {Promise<{origin: string, routes: Array<Record<string, any>>}>} 路由清单
   */
  async buildSitemapRoutes(options = {}) {
    const config = await this.getConfigCached();
    const sitemapConfig = config.sitemap || {};
    const siteOrigin = this.resolveSiteOrigin(options.siteOrigin || '');
    const manifest = await this.ctx.service.uied.frontend.buildSeoPrerenderManifest({
      includeWebsiteDetails: sitemapConfig.includeWebsiteDetails !== false,
      websiteLimit: Number(sitemapConfig.websiteLimit || 5000),
      siteOrigin,
    });

    let routes = Array.isArray(manifest?.routes) ? manifest.routes : [];
    if (sitemapConfig.includeNoindex !== true) {
      routes = routes.filter(item => item?.noindex !== true);
    }

    const generatedAtMs = this.normalizeTimestampMs(manifest?.generatedAt, Date.now());
    routes = routes.map(item => {
      const path = this.normalizePath(item?.canonicalPath || item?.path || '/');
      const sourceUpdatedAtMs = this.normalizeTimestampMs(item?.updatedAt, generatedAtMs);
      // 未携带业务更新时间的静态路由固定到进程启动时间，避免每次请求都改变 lastmod。
      const updatedAtMs = sourceUpdatedAtMs === generatedAtMs
        ? SEO_RELEASE_UPDATED_AT_MS
        : sourceUpdatedAtMs;
      return {
        path,
        loc: this.toAbsoluteUrl(siteOrigin, path),
        updatedAt: Math.floor(updatedAtMs / 1000),
        lastmod: this.toW3cDate(updatedAtMs),
        noindex: item?.noindex === true,
      };
    });

    return {
      origin: siteOrigin,
      routes,
    };
  }

  /**
   * 构建基础 sitemap.xml
   * @param {Record<string, any>} options 可选参数
   * @return {Promise<string>} sitemap XML
   */
  async buildBasicSitemapXml(options = {}) {
    const config = await this.getConfigCached();
    const { routes } = await this.buildSitemapRoutes(options);
    const changefreq = this.normalizeString(config.sitemap?.changefreq, 'daily');
    const priority = Number(config.sitemap?.priority || 0.8).toFixed(1);

    const body = routes
      .map(item => {
        return [
          '<url>',
          `  <loc>${this.escapeXml(item.loc)}</loc>`,
          `  <lastmod>${this.escapeXml(item.lastmod)}</lastmod>`,
          `  <changefreq>${this.escapeXml(changefreq)}</changefreq>`,
          `  <priority>${this.escapeXml(priority)}</priority>`,
          '</url>',
        ].join('\n');
      })
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      body,
      '</urlset>',
      '',
    ].join('\n');
  }

  /**
   * 判断是否为网站详情路由
   * @param {string} path 路由路径
   * @return {boolean} 判断结果
   */
  isWebsiteDetailPath(path) {
    return /^\/website\/[^/]+$/i.test(String(path || '').trim());
  }

  /**
   * 拆分进阶 sitemap 分组
   * @param {Array<Record<string, any>>} routes 路由列表
   * @return {Record<string, Array<Record<string, any>>>} 分组结果
   */
  splitAdvancedGroups(routes) {
    const groups = {
      static: [],
      category: [],
      tag: [],
      article: [],
      website: [],
    };

    routes.forEach(item => {
      const path = String(item?.path || '/');
      if (path.startsWith('/category/')) {
        groups.category.push(item);
        return;
      }
      if (path.startsWith('/tag/')) {
        groups.tag.push(item);
        return;
      }
      if (path.startsWith('/article/')) {
        groups.article.push(item);
        return;
      }
      if (this.isWebsiteDetailPath(path)) {
        groups.website.push(item);
        return;
      }
      groups.static.push(item);
    });

    return groups;
  }

  /**
   * 生成单个 sitemap 文件 XML
   * @param {Array<Record<string, any>>} routes 路由列表
   * @return {string} XML 文本
   */
  createSitemapFileXml(routes) {
    const body = routes
      .map(item => {
        return [
          '<url>',
          `  <loc>${this.escapeXml(item.loc)}</loc>`,
          `  <lastmod>${this.escapeXml(item.lastmod)}</lastmod>`,
          '</url>',
        ].join('\n');
      })
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      body,
      '</urlset>',
      '',
    ].join('\n');
  }

  /**
   * 解析 Sitemap 分片内最新的业务更新时间，避免索引文件每次请求都改变 lastmod。
   * @param {Array<Record<string, any>>} routes 路由列表
   * @return {string} W3C 时间字符串
   */
  resolveSitemapChunkLastmod(routes) {
    const latestMs = (Array.isArray(routes) ? routes : []).reduce((maxValue, item) => {
      const currentMs = this.normalizeTimestampMs(item?.updatedAt || item?.lastmod, 0);
      return Math.max(maxValue, currentMs);
    }, 0);
    return new Date(latestMs || SEO_RELEASE_UPDATED_AT_MS).toISOString();
  }

  /**
   * 构建进阶 sitemap 文件集合
   * @param {Record<string, any>} options 可选参数
   * @return {Promise<{indexXml: string, files: Record<string, string>, meta: any[]}>} 结果集合
   */
  async buildAdvancedSitemapBundle(options = {}) {
    const config = await this.getConfigCached();
    const sitemapConfig = config.sitemap || {};
    const maxUrlsPerFile = Number(sitemapConfig.maxUrlsPerFile || 1000);
    const { origin, routes } = await this.buildSitemapRoutes(options);

    const groups = this.splitAdvancedGroups(routes);
    const allowGroup = {
      static: true,
      category: sitemapConfig.includeCategoryPages !== false,
      tag: sitemapConfig.includeTagPages !== false,
      article: sitemapConfig.includeArticlePages !== false,
      website: sitemapConfig.includeWebsiteDetails !== false,
    };

    const files = {};
    const meta = [];

    Object.keys(groups).forEach(groupName => {
      if (!allowGroup[groupName]) return;
      const groupRoutes = groups[groupName] || [];
      if (groupRoutes.length === 0) return;
      const chunks = [];
      for (let i = 0; i < groupRoutes.length; i += maxUrlsPerFile) {
        chunks.push(groupRoutes.slice(i, i + maxUrlsPerFile));
      }
      chunks.forEach((chunk, index) => {
        const suffix = chunks.length > 1 ? `-${index + 1}` : '';
        const fileName = `sitemap-${groupName}${suffix}.xml`;
        files[fileName] = this.createSitemapFileXml(chunk);
        meta.push({
          fileName,
          count: chunk.length,
          loc: `${origin}/sitemap-advanced/${fileName}`,
          lastmod: this.resolveSitemapChunkLastmod(chunk),
        });
      });
    });

    const indexBody = meta
      .map(item => {
        return [
          '<sitemap>',
          `  <loc>${this.escapeXml(item.loc)}</loc>`,
          `  <lastmod>${this.escapeXml(item.lastmod)}</lastmod>`,
          '</sitemap>',
        ].join('\n');
      })
      .join('\n');

    const indexXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      indexBody,
      '</sitemapindex>',
      '',
    ].join('\n');

    return { indexXml, files, meta };
  }

  /**
   * 并发执行任务池
   * @param {Array<any>} list 待处理数组
   * @param {number} concurrency 并发数
   * @param {(item:any,index:number)=>Promise<any>} worker 工作函数
   * @return {Promise<Array<any>>} 结果数组
   */
  async mapPool(list, concurrency, worker) {
    const queue = Array.isArray(list) ? list : [];
    const result = [];
    const maxWorkers = Math.max(1, Math.min(10, Number(concurrency || 1)));
    let cursor = 0;

    const runWorker = async () => {
      while (cursor < queue.length) {
        const currentIndex = cursor;
        cursor += 1;
        const item = queue[currentIndex];
        // eslint-disable-next-line no-await-in-loop
        result[currentIndex] = await worker(item, currentIndex);
      }
    };

    await Promise.all(Array.from({ length: maxWorkers }).map(() => runWorker()));
    return result;
  }

  /**
   * 扫描失效 URL
   * @param {Record<string, any>} options 扫描参数
   * @return {Promise<Record<string, any>>} 扫描结果
   */
  async scanInvalidUrls(options = {}) {
    const { app, ctx } = this;
    const config = await this.getConfigCached();
    const limit = this.normalizeNumber(
      options.limit,
      config.monitoring.invalidScanLimit,
      10,
      5000
    );
    const timeoutMs = this.normalizeNumber(
      options.timeoutMs,
      config.advancedLinkDetector.timeoutMs,
      1000,
      20000
    );

    const websites = await app.model.query(
      `SELECT id, name, url, status, update_time as updatedAt
       FROM uied_website
       WHERE is_delete = 0
       ORDER BY id DESC
       LIMIT ?`,
      {
        replacements: [ limit ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const rows = await this.mapPool(websites, 5, async website => {
      try {
        const probe = await ctx.service.uied.websiteHealthProbe.probeByUrl(website.url, { timeoutMs });
        const statusCode = Number(probe?.http?.statusCode || 0);
        const invalid = !probe?.http?.reachable || statusCode >= 400;
        return {
          id: website.id,
          name: website.name,
          url: website.url,
          invalid,
          statusCode,
          responseTimeMs: Number(probe?.http?.responseTimeMs || 0),
          redirectLocation: String(probe?.http?.redirectLocation || ''),
          sslDaysRemaining: Number.isFinite(Number(probe?.ssl?.daysRemaining)) ? Number(probe.ssl.daysRemaining) : null,
          errorMessage: String(probe?.http?.errorMessage || ''),
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          id: website.id,
          name: website.name,
          url: website.url,
          invalid: true,
          statusCode: 0,
          responseTimeMs: 0,
          redirectLocation: '',
          sslDaysRemaining: null,
          errorMessage: String(error?.message || '检测失败'),
          checkedAt: new Date().toISOString(),
        };
      }
    });

    const invalidItems = rows.filter(item => item.invalid);
    const runResult = {
      id: this.createId(),
      scannedCount: rows.length,
      invalidCount: invalidItems.length,
      timeoutMs,
      createdAt: new Date().toISOString(),
      items: invalidItems,
    };

    await this.appendLog(SEO_INVALID_URL_LOG_KEY, runResult, 50);
    return runResult;
  }

  /**
   * 执行进阶链接检测
   * @param {Record<string, any>} options 检测参数
   * @return {Promise<Record<string, any>>} 检测结果
   */
  async runAdvancedLinkDetector(options = {}) {
    const { app, ctx } = this;
    const config = await this.getConfigCached();
    const limit = this.normalizeNumber(
      options.limit,
      config.monitoring.linkDetectorLimit,
      10,
      2000
    );
    const timeoutMs = this.normalizeNumber(
      options.timeoutMs,
      config.advancedLinkDetector.timeoutMs,
      1000,
      20000
    );
    const slowThresholdMs = this.normalizeNumber(
      options.slowThresholdMs,
      config.monitoring.slowThresholdMs,
      500,
      30000
    );
    const sslWarnDays = this.normalizeNumber(
      options.sslWarnDays,
      config.monitoring.sslExpireWarnDays,
      1,
      180
    );

    const websites = await app.model.query(
      `SELECT id, name, url
       FROM uied_website
       WHERE is_delete = 0
       ORDER BY id DESC
       LIMIT ?`,
      {
        replacements: [ limit ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const rows = await this.mapPool(websites, 5, async website => {
      try {
        const probe = await ctx.service.uied.websiteHealthProbe.probeByUrl(website.url, { timeoutMs });
        const statusCode = Number(probe?.http?.statusCode || 0);
        const responseTimeMs = Number(probe?.http?.responseTimeMs || 0);
        const redirectLocation = String(probe?.http?.redirectLocation || '');
        const sslDaysRemaining = Number.isFinite(Number(probe?.ssl?.daysRemaining)) ? Number(probe.ssl.daysRemaining) : null;

        const issues = [];
        if (!probe?.http?.reachable || statusCode >= 400) {
          issues.push('broken');
        }
        if (statusCode >= 300 && statusCode < 400) {
          issues.push('redirect');
        }
        if (responseTimeMs > slowThresholdMs) {
          issues.push('slow');
        }
        if (config.advancedLinkDetector.checkSslExpiry && sslDaysRemaining !== null && sslDaysRemaining < sslWarnDays) {
          issues.push('ssl_expiring');
        }

        return {
          id: website.id,
          name: website.name,
          url: website.url,
          statusCode,
          responseTimeMs,
          redirectLocation,
          sslDaysRemaining,
          issues,
          errorMessage: String(probe?.http?.errorMessage || ''),
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          id: website.id,
          name: website.name,
          url: website.url,
          statusCode: 0,
          responseTimeMs: 0,
          redirectLocation: '',
          sslDaysRemaining: null,
          issues: [ 'broken' ],
          errorMessage: String(error?.message || '检测失败'),
          checkedAt: new Date().toISOString(),
        };
      }
    });

    const issueRows = rows.filter(item => item.issues.length > 0);
    const runResult = {
      id: this.createId(),
      scannedCount: rows.length,
      issueCount: issueRows.length,
      timeoutMs,
      slowThresholdMs,
      sslWarnDays,
      createdAt: new Date().toISOString(),
      items: issueRows,
    };

    await this.appendLog(SEO_LINK_DETECTOR_LOG_KEY, runResult, 50);
    return runResult;
  }

  /**
   * 执行图片优化检查
   * @param {Record<string, any>} options 检测参数
   * @return {Promise<Record<string, any>>} 检测结果
   */
  async runImageOptimizationScan(options = {}) {
    const { app } = this;
    const limit = this.normalizeNumber(options.limit, 200, 10, 5000);

    const websites = await app.model.query(
      `SELECT id, name, icon_url as iconUrl, thumbnail
       FROM uied_website
       WHERE is_delete = 0
       ORDER BY id DESC
       LIMIT ?`,
      {
        replacements: [ limit ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const detectImageIssue = (urlValue, field) => {
      const url = String(urlValue || '').trim();
      if (!url) return null;
      const issues = [];
      if (/^http:\/\//i.test(url)) issues.push('http_not_https');
      if (/\.(png|jpg|jpeg)(\?|$)/i.test(url)) issues.push('not_webp');
      return issues.length > 0
        ? {
          field,
          url,
          issues,
        }
        : null;
    };

    const items = websites
      .map(item => {
        const issueList = [
          detectImageIssue(item.iconUrl, 'iconUrl'),
          detectImageIssue(item.thumbnail, 'thumbnail'),
        ].filter(Boolean);
        if (issueList.length === 0) return null;
        return {
          id: item.id,
          name: item.name,
          issues: issueList,
          checkedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    const runResult = {
      id: this.createId(),
      scannedCount: websites.length,
      issueCount: items.length,
      createdAt: new Date().toISOString(),
      items,
    };

    await this.appendLog(SEO_IMAGE_OPT_LOG_KEY, runResult, 50);
    return runResult;
  }

  /**
   * 获取内部链接建议
   * @param {Record<string, any>} options 参数
   * @return {Promise<Record<string, any>>} 建议结果
   */
  async getInternalLinkSuggestions(options = {}) {
    const { app } = this;
    const limit = this.normalizeNumber(options.limit, 20, 5, 100);

    const [ categories, tags, pages ] = await Promise.all([
      app.model.query(
        `SELECT name, slug, update_time
         FROM uied_category
         WHERE is_delete = 0 AND is_show = 1
         ORDER BY sort ASC, id ASC
         LIMIT ?`,
        { replacements: [ limit ], type: app.Sequelize.QueryTypes.SELECT }
      ),
      app.model.query(
        `SELECT name, slug, update_time
         FROM uied_website_tag
         WHERE is_delete = 0
         ORDER BY sort ASC, id ASC
         LIMIT ?`,
        { replacements: [ limit ], type: app.Sequelize.QueryTypes.SELECT }
      ),
      app.model.query(
        `SELECT name, slug, update_time
         FROM uied_page
         WHERE is_delete = 0 AND is_show = 1
         ORDER BY sort ASC, id ASC
         LIMIT ?`,
        { replacements: [ limit ], type: app.Sequelize.QueryTypes.SELECT }
      ),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      categories: (categories || []).map(item => ({
        name: item.name,
        path: `/category/${item.slug}`,
        updatedAt: this.toW3cDate(item.update_time),
      })),
      tags: (tags || []).map(item => ({
        name: item.name,
        path: `/tag/${item.slug}`,
        updatedAt: this.toW3cDate(item.update_time),
      })),
      pages: (pages || []).map(item => ({
        name: item.name,
        path: `/p/${item.slug}`,
        updatedAt: this.toW3cDate(item.update_time),
      })),
    };
  }

  /**
   * 规范化站长推送游标，使用“更新时间 + URL”保证同一秒内的链接不会漏推。
   * @param {unknown} value 原始游标或兼容时间值
   * @return {{updatedAt: number, loc: string, backfillUpdatedAt: number, backfillLoc: string, backfillComplete: boolean}} 标准游标
   */
  normalizePushCursor(value) {
    const source = this.isPlainObject(value) ? value : { updatedAt: value };
    const backfillSource = this.isPlainObject(source.backfillBefore)
      ? source.backfillBefore
      : {
        updatedAt: source.backfillUpdatedAt,
        loc: source.backfillLoc,
      };
    const backfillUpdatedAt = Math.floor(this.normalizeTimestampMs(backfillSource.updatedAt, 0) / 1000);
    return {
      updatedAt: Math.floor(this.normalizeTimestampMs(source.updatedAt, 0) / 1000),
      loc: this.normalizeString(source.loc, ''),
      backfillUpdatedAt,
      backfillLoc: this.normalizeString(backfillSource.loc, ''),
      backfillComplete: Object.prototype.hasOwnProperty.call(source, 'backfillComplete')
        ? this.normalizeBoolean(source.backfillComplete, false)
        : backfillUpdatedAt <= 0,
    };
  }

  /**
   * 将 Sitemap 条目转换为可比较的站长推送游标。
   * @param {Record<string, any>} entry Sitemap 条目
   * @return {{updatedAt: number, loc: string}} 条目游标
   */
  createPushCursorFromEntry(entry) {
    return {
      updatedAt: Math.floor(this.normalizeTimestampMs(entry?.updatedAt, 0) / 1000),
      loc: this.normalizeString(entry?.loc, ''),
    };
  }

  /**
   * 比较两个站长推送游标，先比较更新时间，再比较 URL。
   * @param {Record<string, any>} left 左侧游标
   * @param {Record<string, any>} right 右侧游标
   * @return {number} 比较结果
   */
  comparePushCursors(left, right) {
    const leftCursor = this.normalizePushCursor(left);
    const rightCursor = this.normalizePushCursor(right);
    const timeDiff = leftCursor.updatedAt - rightCursor.updatedAt;
    return timeDiff || leftCursor.loc.localeCompare(rightCursor.loc);
  }

  /**
   * 从本批推送上下文计算下一批双向游标，新内容向前推进、历史内容向后回填。
   * @param {Record<string, any>} batch 本批推送上下文
   * @param {Record<string, any>} fallback 兜底游标
   * @return {{updatedAt: number, loc: string, backfillUpdatedAt: number, backfillLoc: string, backfillComplete: boolean}} 下一游标
   */
  buildNextPushCursor(batch = {}, fallback = {}) {
    const previous = this.normalizePushCursor(fallback);
    const entries = Array.isArray(batch.entries) ? batch.entries : [];
    if (batch.mode === 'bootstrap') {
      const newest = entries.reduce((current, entry) => {
        const candidate = this.createPushCursorFromEntry(entry);
        return this.comparePushCursors(candidate, current) > 0 ? candidate : current;
      }, this.normalizePushCursor(null));
      const oldest = entries.reduce((current, entry) => {
        const candidate = this.createPushCursorFromEntry(entry);
        return current.updatedAt <= 0 || this.comparePushCursors(candidate, current) < 0 ? candidate : current;
      }, this.normalizePushCursor(null));
      return {
        updatedAt: newest.updatedAt,
        loc: newest.loc,
        backfillUpdatedAt: oldest.updatedAt,
        backfillLoc: oldest.loc,
        backfillComplete: batch.hasBackfill !== true,
      };
    }

    const highWater = (Array.isArray(batch.newEntries) ? batch.newEntries : []).reduce((current, entry) => {
      const candidate = this.createPushCursorFromEntry(entry);
      return this.comparePushCursors(candidate, current) > 0 ? candidate : current;
    }, previous);
    const backfillStart = {
      updatedAt: previous.backfillUpdatedAt,
      loc: previous.backfillLoc,
    };
    const backfillWater = (Array.isArray(batch.backfillEntries) ? batch.backfillEntries : []).reduce((current, entry) => {
      const candidate = this.createPushCursorFromEntry(entry);
      return current.updatedAt <= 0 || this.comparePushCursors(candidate, current) < 0 ? candidate : current;
    }, backfillStart);
    return {
      updatedAt: highWater.updatedAt,
      loc: highWater.loc,
      backfillUpdatedAt: backfillWater.updatedAt,
      backfillLoc: backfillWater.loc,
      backfillComplete: previous.backfillComplete || batch.backfillExhausted === true,
    };
  }

  /**
   * 构建站长推送批次；优先处理新内容，再使用独立水位分批回填历史 URL。
   * @param {Record<string, any>} options 选项
   * @return {Promise<Record<string, any>>} 推送批次
   */
  async collectPushUrlBatch(options = {}) {
    const limit = this.normalizeNumber(options.limit, 100, 1, 1000);
    const cursor = this.normalizePushCursor(options.cursor || options.since);
    const hasCursor = cursor.updatedAt > 0;
    const { routes } = await this.buildSitemapRoutes(options);
    const compareEntries = (left, right) => this.comparePushCursors(
      this.createPushCursorFromEntry(left),
      this.createPushCursorFromEntry(right)
    );

    if (!hasCursor) {
      const sortedEntries = routes.slice().sort((left, right) => -compareEntries(left, right));
      const entries = sortedEntries.slice(0, limit);
      const oldestSelected = entries[entries.length - 1];
      const hasBackfill = Boolean(oldestSelected)
        && sortedEntries.some(item => compareEntries(item, oldestSelected) < 0);
      return {
        mode: 'bootstrap',
        entries,
        newEntries: entries,
        backfillEntries: [],
        hasBackfill,
        backfillExhausted: !hasBackfill,
      };
    }

    const newEntries = routes
      .filter(item => compareEntries(item, cursor) > 0)
      .sort(compareEntries)
      .slice(0, limit);
    const remaining = Math.max(0, limit - newEntries.length);
    let backfillEntries = [];
    let backfillExhausted = cursor.backfillComplete;
    if (remaining > 0 && !cursor.backfillComplete && cursor.backfillUpdatedAt > 0) {
      const backfillCursor = {
        updatedAt: cursor.backfillUpdatedAt,
        loc: cursor.backfillLoc,
      };
      const backfillCandidates = routes
        .filter(item => compareEntries(item, backfillCursor) < 0)
        .sort((left, right) => -compareEntries(left, right));
      backfillEntries = backfillCandidates.slice(0, remaining);
      backfillExhausted = backfillCandidates.length <= remaining;
    } else if (remaining > 0 && !cursor.backfillComplete) {
      backfillExhausted = true;
    }
    return {
      mode: 'incremental',
      entries: [ ...newEntries, ...backfillEntries ],
      newEntries,
      backfillEntries,
      hasBackfill: !backfillExhausted,
      backfillExhausted,
    };
  }

  /**
   * 选择用于站长推送的 URL 条目。
   * @param {Record<string, any>} options 选项
   * @return {Promise<Array<Record<string, any>>>} URL 条目列表
   */
  async collectPushUrlEntries(options = {}) {
    const batch = await this.collectPushUrlBatch(options);
    return batch.entries;
  }

  /**
   * 选择用于站长推送的 URL 列表。
   * @param {Record<string, any>} options 选项
   * @return {Promise<string[]>} URL 列表
   */
  async collectPushUrls(options = {}) {
    const entries = await this.collectPushUrlEntries(options);
    return entries.map(item => item.loc);
  }

  /**
   * 获取指定平台最近一次确认成功的推送游标。
   * @param {string} platform 平台编码
   * @return {Promise<{updatedAt: number, loc: string}>} 最近成功游标
   */
  async getLastSuccessfulPushCursor(platform) {
    const normalizedPlatform = this.normalizeString(platform).toLowerCase();
    const logs = await this.getLogs(SEO_PUSH_LOG_KEY);
    const matched = (Array.isArray(logs) ? logs : []).find(item => (
      String(item?.platform || '').toLowerCase() === normalizedPlatform
      && item?.success === true
      && this.normalizePushCursor(item?.cursor).updatedAt > 0
    ));
    return this.normalizePushCursor(matched?.cursor);
  }

  /**
   * 校验站长平台 HTTP 与业务响应，防止鉴权失败等错误被误记为推送成功。
   * @param {string} platform 平台编码
   * @param {Record<string, any>} result 平台响应
   * @param {number} attemptedCount 尝试推送数量
   */
  assertPlatformPushSuccess(platform, result, attemptedCount) {
    const status = Number(result?.status || 0);
    const data = this.isPlainObject(result?.data) ? result.data : {};
    const errorValue = data.error ?? data.errorCode ?? data.ErrorCode;
    const errorList = Array.isArray(data.errors) ? data.errors : [];
    if (status < 200 || status >= 300) {
      throw new Error(`${platform} 推送 HTTP 状态异常: ${status || '未知'}`);
    }
    if ((errorValue !== undefined && errorValue !== null && String(errorValue) !== '' && String(errorValue) !== '0') || errorList.length > 0) {
      const errorMessage = this.normalizeString(data.message || data.Message, String(errorValue || '业务错误'));
      throw new Error(`${platform} 推送失败: ${errorMessage}`);
    }
    if (platform === 'baidu') {
      const rejectedCount = (Array.isArray(data.not_same_site) ? data.not_same_site.length : 0)
        + (Array.isArray(data.not_valid) ? data.not_valid.length : 0);
      if (attemptedCount > 0 && rejectedCount >= attemptedCount && Number(data.success || 0) <= 0) {
        throw new Error('baidu 推送失败: 本批 URL 全部被拒绝');
      }
    }
  }

  /**
   * 推送到百度站长平台
   * @param {string[]} urls URL 列表
   * @param {Record<string, any>} config 平台配置
   * @return {Promise<Record<string, any>>} 推送结果
   */
  async pushToBaidu(urls, config) {
    const endpoint = String(config.endpoint || 'http://data.zz.baidu.com/urls').trim();
    const site = String(config.site || '').trim();
    const token = String(config.token || '').trim();
    if (!site || !token) {
      throw new Error('百度推送缺少 site 或 token');
    }

    const apiUrl = `${endpoint}?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`;
    const body = urls.join('\n');
    const response = await this.ctx.curl(apiUrl, {
      method: 'POST',
      contentType: 'text/plain',
      data: body,
      timeout: 10000,
      dataType: 'json',
      headers: {
        'User-Agent': 'UIED-SEO-Center/1.0',
      },
    });

    return {
      status: response.status,
      data: response.data || {},
    };
  }

  /**
   * 推送到 Bing Webmaster API
   * @param {string[]} urls URL 列表
   * @param {Record<string, any>} config 平台配置
   * @return {Promise<Record<string, any>>} 推送结果
   */
  async pushToBing(urls, config) {
    const endpoint = String(config.endpoint || 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch').trim();
    const apiKey = String(config.apiKey || '').trim();
    const site = String(config.site || '').trim();
    if (!apiKey || !site) {
      throw new Error('Bing 推送缺少 site 或 apiKey');
    }

    const apiUrl = `${endpoint}?apikey=${encodeURIComponent(apiKey)}`;
    const response = await this.ctx.curl(apiUrl, {
      method: 'POST',
      contentType: 'json',
      data: {
        siteUrl: site,
        urlList: urls,
      },
      timeout: 10000,
      dataType: 'json',
      headers: {
        'User-Agent': 'UIED-SEO-Center/1.0',
      },
    });

    return {
      status: response.status,
      data: response.data || {},
    };
  }

  /**
   * 推送到 IndexNow
   * @param {string[]} urls URL 列表
   * @param {Record<string, any>} config 平台配置
   * @return {Promise<Record<string, any>>} 推送结果
   */
  async pushToIndexNow(urls, config) {
    const endpoint = String(config.endpoint || 'https://api.indexnow.org/indexnow').trim();
    const host = String(config.host || '').trim();
    const key = String(config.key || '').trim();
    if (!host || !key) {
      throw new Error('IndexNow 推送缺少 host 或 key');
    }

    const payload = {
      host,
      key,
      keyLocation: String(config.keyLocation || '').trim() || `${host.replace(/\/+$/, '')}/${key}.txt`,
      urlList: urls,
    };

    const response = await this.ctx.curl(endpoint, {
      method: 'POST',
      contentType: 'json',
      data: payload,
      timeout: 10000,
      dataType: 'json',
      headers: {
        'User-Agent': 'UIED-SEO-Center/1.0',
      },
    });

    return {
      status: response.status,
      data: response.data || {},
    };
  }

  /**
   * 执行站长平台推送
   * @param {Record<string, any>} options 推送参数
   * @return {Promise<Record<string, any>>} 推送结果
   */
  async pushToPlatforms(options = {}) {
    const config = await this.getConfigCached();
    const platform = this.normalizeString(options.platform || '').toLowerCase();
    const incremental = options.incremental === true;
    const hasExplicitUrls = Array.isArray(options.urls) && options.urls.length > 0;
    const previousCursor = incremental
      ? this.normalizePushCursor(options.cursor || options.since || await this.getLastSuccessfulPushCursor(platform))
      : this.normalizePushCursor(null);
    const urlBatch = hasExplicitUrls
      ? {
        mode: 'manual',
        entries: [],
        newEntries: [],
        backfillEntries: [],
        backfillExhausted: previousCursor.backfillComplete,
      }
      : await this.collectPushUrlBatch({
        limit: this.normalizeNumber(options.limit, 100, 1, 1000),
        siteOrigin: options.siteOrigin,
        cursor: previousCursor,
      });
    const urls = hasExplicitUrls
      ? Array.from(new Set(options.urls.map(item => String(item || '').trim()).filter(Boolean)))
      : urlBatch.entries.map(item => item.loc);
    const nextCursor = incremental
      ? this.buildNextPushCursor(urlBatch, previousCursor)
      : previousCursor;
    const since = previousCursor.updatedAt > 0
      ? new Date(previousCursor.updatedAt * 1000).toISOString()
      : '';

    if (urls.length === 0) {
      if (!incremental) {
        throw new Error('没有可推送的 URL');
      }
      const skippedEntry = {
        id: this.createId(),
        platform,
        pushedCount: 0,
        sampleUrls: [],
        incremental: true,
        since,
        cursor: nextCursor,
        success: true,
        result: {
          skipped: true,
          reason: 'no_updated_urls',
        },
        createdAt: new Date().toISOString(),
      };
      await this.appendLog(SEO_PUSH_LOG_KEY, skippedEntry, 100);
      return skippedEntry;
    }

    let pushResult = {};
    try {
      if (platform === 'baidu') {
        pushResult = await this.pushToBaidu(urls, config.platformPush.baidu || {});
      } else if (platform === 'bing') {
        pushResult = await this.pushToBing(urls, config.platformPush.bing || {});
      } else if (platform === 'indexnow') {
        pushResult = await this.pushToIndexNow(urls, config.platformPush.indexNow || {});
      } else {
        throw new Error('暂不支持该推送平台');
      }
      this.assertPlatformPushSuccess(platform, pushResult, urls.length);
    } catch (error) {
      await this.appendLog(SEO_PUSH_LOG_KEY, {
        id: this.createId(),
        platform,
        attemptedCount: urls.length,
        pushedCount: 0,
        sampleUrls: urls.slice(0, 10),
        incremental,
        since,
        cursor: previousCursor,
        success: false,
        error: this.normalizeString(error?.message, '推送失败'),
        result: pushResult,
        createdAt: new Date().toISOString(),
      }, 100);
      throw error;
    }

    const logEntry = {
      id: this.createId(),
      platform,
      pushedCount: urls.length,
      sampleUrls: urls.slice(0, 10),
      incremental,
      since,
      cursor: incremental ? nextCursor : null,
      success: true,
      result: pushResult,
      createdAt: new Date().toISOString(),
    };

    await this.appendLog(SEO_PUSH_LOG_KEY, logEntry, 100);
    return logEntry;
  }

  /**
   * 规范化自动任务类型
   * @param {unknown} value 原始任务类型
   * @return {'all'|'invalid'|'link-detector'|'image-optimization'|'sitemap-generate'|'logs-404-digest'|'push-platform'} 标准任务类型
   */
  normalizeAutoTaskType(value) {
    const taskType = this.normalizeString(value || 'all').toLowerCase();
    const allowList = [
      'all',
      'invalid',
      'link-detector',
      'image-optimization',
      'sitemap-generate',
      'logs-404-digest',
      'push-platform',
    ];
    return allowList.includes(taskType) ? taskType : 'all';
  }

  /**
   * 根据任务类型和开关解析实际执行项
   * @param {'all'|'invalid'|'link-detector'|'image-optimization'|'sitemap-generate'|'logs-404-digest'|'push-platform'} taskType 任务类型
   * @param {Record<string, any>} autoTaskConfig 自动任务配置
   * @param {boolean} respectSwitch 是否遵循开关
   * @return {string[]} 待执行任务编码列表
   */
  resolveAutoTaskList(taskType, autoTaskConfig = {}, respectSwitch = true) {
    const taskSwitch = this.isPlainObject(autoTaskConfig.tasks) ? autoTaskConfig.tasks : {};
    const isEnabled = key => {
      if (respectSwitch !== true) return true;
      return this.normalizeBoolean(taskSwitch[key], false);
    };

    if (taskType === 'invalid') {
      return [ 'invalid' ];
    }
    if (taskType === 'link-detector') {
      return [ 'link-detector' ];
    }
    if (taskType === 'image-optimization') {
      return [ 'image-optimization' ];
    }
    if (taskType === 'sitemap-generate') {
      return [ 'sitemap-generate' ];
    }
    if (taskType === 'logs-404-digest') {
      return [ 'logs-404-digest' ];
    }
    if (taskType === 'push-platform') {
      return [ 'push-platform' ];
    }

    const list = [];
    if (isEnabled('invalidScan')) list.push('invalid');
    if (isEnabled('linkDetector')) list.push('link-detector');
    if (isEnabled('imageOptimization')) list.push('image-optimization');
    if (isEnabled('sitemapGenerate')) list.push('sitemap-generate');
    if (isEnabled('logs404Digest')) list.push('logs-404-digest');
    if (isEnabled('platformPush')) list.push('push-platform');
    return list;
  }

  /**
   * 构建下一次自动执行时间
   * @param {string} lastRunAt 上次执行时间
   * @param {number} intervalMinutes 间隔分钟
   * @param {boolean} enabled 是否开启自动任务
   * @return {string} ISO 时间
   */
  buildNextAutoTaskRunAt(lastRunAt, intervalMinutes, enabled) {
    if (enabled !== true) return '';
    const intervalMs = Math.max(5, Number(intervalMinutes || 30)) * 60 * 1000;
    const lastMs = Date.parse(String(lastRunAt || ''));
    const baseMs = Number.isFinite(lastMs) ? lastMs : Date.now();
    return new Date(baseMs + intervalMs).toISOString();
  }

  /**
   * 获取自动任务运行状态
   * @return {Promise<Record<string, any>>} 状态信息
   */
  async getAutoTaskState() {
    const raw = await this.ctx.service.uied.setting.get(SEO_AUTO_TASK_STATE_KEY).catch(() => ({}));
    const data = this.isPlainObject(raw) ? raw : {};
    return {
      running: this.normalizeBoolean(data.running, false),
      lastRunAt: this.normalizeString(data.lastRunAt, ''),
      lastCompletedAt: this.normalizeString(data.lastCompletedAt, ''),
      lastStartedAt: this.normalizeString(data.lastStartedAt, ''),
      lastTaskType: this.normalizeString(data.lastTaskType, ''),
      lastTrigger: this.normalizeString(data.lastTrigger, ''),
      lastDurationMs: this.normalizeNumber(data.lastDurationMs, 0, 0, 24 * 60 * 60 * 1000),
      nextRunAt: this.normalizeString(data.nextRunAt, ''),
      lastError: this.normalizeString(data.lastError, ''),
      lastResult: this.isPlainObject(data.lastResult) ? data.lastResult : null,
      updatedAt: this.normalizeString(data.updatedAt, ''),
    };
  }

  /**
   * 保存自动任务状态
   * @param {Record<string, any>} patch 状态补丁
   * @return {Promise<Record<string, any>>} 最新状态
   */
  async saveAutoTaskState(patch = {}) {
    const current = await this.getAutoTaskState();
    const next = {
      ...current,
      ...(this.isPlainObject(patch) ? patch : {}),
      updatedAt: new Date().toISOString(),
    };
    await this.ctx.service.uied.setting.save({ [SEO_AUTO_TASK_STATE_KEY]: next });
    return next;
  }

  /**
   * 生成 Sitemap 快照摘要（用于自动任务中心展示）。
   * @param {Record<string, any>} config SEO 配置
   * @param {Record<string, any>} options 执行参数
   * @return {Promise<Record<string, any>>} 快照摘要
   */
  async buildSitemapSnapshot(config = {}, options = {}) {
    const sitemap = this.isPlainObject(config.sitemap) ? config.sitemap : {};
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : {};
    const siteOrigin = this.normalizeString(options.siteOrigin || autoTask.siteOrigin, '');

    const [ basicXml, routeBundle ] = await Promise.all([
      this.buildBasicSitemapXml({ siteOrigin }),
      this.buildSitemapRoutes({ siteOrigin }),
    ]);

    let advancedMeta = [];
    if (sitemap.advancedEnabled !== false) {
      const advanced = await this.buildAdvancedSitemapBundle({ siteOrigin });
      advancedMeta = Array.isArray(advanced?.meta) ? advanced.meta : [];
    }

    const advancedUrlCount = advancedMeta.reduce((sum, item) => {
      return sum + Number(item?.count || 0);
    }, 0);

    return {
      siteOrigin: this.resolveSiteOrigin(siteOrigin),
      routeCount: Array.isArray(routeBundle?.routes) ? routeBundle.routes.length : 0,
      basicXmlBytes: Buffer.byteLength(String(basicXml || ''), 'utf8'),
      advancedFileCount: advancedMeta.length,
      advancedUrlCount,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 聚合 404 日志摘要（用于自动任务中心巡检）。
   * @param {Record<string, any>} config SEO 配置
   * @param {Record<string, any>} options 执行参数
   * @return {Promise<Record<string, any>>} 聚合结果
   */
  async build404Digest(config = {}, options = {}) {
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : {};
    const lookbackDays = this.normalizeNumber(
      options.lookbackDays,
      autoTask.digestLookbackDays || 7,
      1,
      90
    );
    const cutoff = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    const logs = await this.getLogs(SEO_404_LOG_KEY);
    const sourceRows = Array.isArray(logs) ? logs : [];
    const recentRows = sourceRows.filter(item => {
      const createdAtText = this.normalizeString(item?.createdAt, '');
      const createdMs = Date.parse(createdAtText);
      if (Number.isFinite(createdMs)) {
        return createdMs >= cutoff;
      }
      return true;
    });

    const pathCounter = new Map();
    const sourceCounter = new Map();
    recentRows.forEach(item => {
      const path = this.normalizeString(item?.path, '/');
      const source = this.normalizeString(item?.source, 'unknown');
      const createdAt = this.normalizeString(item?.createdAt, '');

      const previousPath = pathCounter.get(path) || { path, count: 0, lastSeenAt: '' };
      previousPath.count += 1;
      if (createdAt && (!previousPath.lastSeenAt || Date.parse(createdAt) > Date.parse(previousPath.lastSeenAt || ''))) {
        previousPath.lastSeenAt = createdAt;
      }
      pathCounter.set(path, previousPath);

      const previousSourceCount = Number(sourceCounter.get(source) || 0);
      sourceCounter.set(source, previousSourceCount + 1);
    });

    const topPaths = Array.from(pathCounter.values())
      .sort((left, right) => {
        if (left.count !== right.count) return right.count - left.count;
        return String(right.lastSeenAt || '').localeCompare(String(left.lastSeenAt || ''));
      })
      .slice(0, 20);

    const sourceStats = Array.from(sourceCounter.entries())
      .map(([ source, count ]) => ({ source, count: Number(count || 0) }))
      .sort((left, right) => right.count - left.count);

    return {
      lookbackDays,
      totalCount: recentRows.length,
      uniquePathCount: topPaths.length,
      topPaths,
      sourceStats,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 执行自动任务中的单项任务
   * @param {string} taskName 任务编码
   * @param {Record<string, any>} config SEO 配置
   * @param {Record<string, any>} options 执行参数
   * @return {Promise<Record<string, any>>} 单项执行结果
   */
  async executeAutoTask(taskName, config = {}, options = {}) {
    const monitoring = this.isPlainObject(config.monitoring) ? config.monitoring : {};
    const detector = this.isPlainObject(config.advancedLinkDetector) ? config.advancedLinkDetector : {};
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : {};
    const siteOrigin = this.normalizeString(options.siteOrigin || autoTask.siteOrigin, '');

    if (taskName === 'invalid') {
      const data = await this.scanInvalidUrls({
        limit: Number(monitoring.invalidScanLimit || 200),
        timeoutMs: Number(detector.timeoutMs || 6000),
      });
      return {
        task: taskName,
        success: true,
        summary: `失效 URL ${data.invalidCount}/${data.scannedCount}`,
        data: {
          scannedCount: Number(data.scannedCount || 0),
          issueCount: Number(data.invalidCount || 0),
        },
      };
    }

    if (taskName === 'link-detector') {
      const data = await this.runAdvancedLinkDetector({
        limit: Number(monitoring.linkDetectorLimit || 120),
        timeoutMs: Number(detector.timeoutMs || 6000),
        slowThresholdMs: Number(monitoring.slowThresholdMs || 3000),
        sslWarnDays: Number(monitoring.sslExpireWarnDays || 14),
      });
      return {
        task: taskName,
        success: true,
        summary: `进阶检测 ${data.issueCount}/${data.scannedCount}`,
        data: {
          scannedCount: Number(data.scannedCount || 0),
          issueCount: Number(data.issueCount || 0),
        },
      };
    }

    if (taskName === 'image-optimization') {
      const data = await this.runImageOptimizationScan({
        limit: Number(monitoring.invalidScanLimit || 200),
      });
      return {
        task: taskName,
        success: true,
        summary: `图片优化 ${data.issueCount}/${data.scannedCount}`,
        data: {
          scannedCount: Number(data.scannedCount || 0),
          issueCount: Number(data.issueCount || 0),
        },
      };
    }

    if (taskName === 'sitemap-generate') {
      const data = await this.buildSitemapSnapshot(config, {
        siteOrigin,
      });
      return {
        task: taskName,
        success: true,
        summary: `Sitemap 路由 ${Number(data.routeCount || 0)}，分片 ${Number(data.advancedFileCount || 0)}`,
        data: {
          routeCount: Number(data.routeCount || 0),
          advancedFileCount: Number(data.advancedFileCount || 0),
          advancedUrlCount: Number(data.advancedUrlCount || 0),
          basicXmlBytes: Number(data.basicXmlBytes || 0),
          siteOrigin: data.siteOrigin,
        },
      };
    }

    if (taskName === 'logs-404-digest') {
      const data = await this.build404Digest(config, {
        lookbackDays: Number(autoTask.digestLookbackDays || 7),
      });
      const topPath = Array.isArray(data.topPaths) && data.topPaths[0]
        ? `${data.topPaths[0].path}(${data.topPaths[0].count})`
        : '无';
      return {
        task: taskName,
        success: true,
        summary: `404汇总 ${data.totalCount} 条，Top: ${topPath}`,
        data: {
          lookbackDays: Number(data.lookbackDays || 0),
          totalCount: Number(data.totalCount || 0),
          uniquePathCount: Number(data.uniquePathCount || 0),
          topPaths: Array.isArray(data.topPaths) ? data.topPaths.slice(0, 10) : [],
          sourceStats: Array.isArray(data.sourceStats) ? data.sourceStats : [],
        },
      };
    }

    if (taskName === 'push-platform') {
      const data = await this.pushToPlatforms({
        platform: this.normalizeString(autoTask.pushPlatform, 'baidu'),
        limit: Number(autoTask.pushLimit || 100),
        siteOrigin,
        incremental: true,
      });
      return {
        task: taskName,
        success: true,
        summary: data?.result?.skipped === true
          ? `${String(data.platform || '').toUpperCase()} 暂无新增 URL`
          : `${String(data.platform || '').toUpperCase()} 推送 ${data.pushedCount}`,
        data: {
          platform: data.platform,
          pushedCount: Number(data.pushedCount || 0),
          skipped: data?.result?.skipped === true,
        },
      };
    }

    throw new Error('不支持的自动任务类型');
  }

  /**
   * 获取自动任务状态与日志摘要
   * @return {Promise<Record<string, any>>} 自动任务中心数据
   */
  async getAutoTaskStatus() {
    const config = await this.getConfigCached();
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : this.getDefaultConfig().autoTasks;
    const state = await this.getAutoTaskState();
    const logs = await this.getLogs(SEO_AUTO_TASK_LOG_KEY);
    const latest = logs[0] || null;
    const lastRunAt = this.normalizeString(state.lastRunAt, this.normalizeString(latest?.finishedAt, ''));
    const nextRunAt = this.normalizeString(
      state.nextRunAt,
      this.buildNextAutoTaskRunAt(lastRunAt, Number(autoTask.intervalMinutes || 30), autoTask.enabled === true)
    );

    return {
      config: autoTask,
      state: {
        ...state,
        lastRunAt,
        nextRunAt,
      },
      latest,
      logs: logs.slice(0, 30),
    };
  }

  /**
   * 手动/定时执行自动任务
   * @param {Record<string, any>} options 执行参数
   * @return {Promise<Record<string, any>>} 执行结果
   */
  async runAutoTaskNow(options = {}) {
    const config = await this.getConfigCached();
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : this.getDefaultConfig().autoTasks;
    const taskType = this.normalizeAutoTaskType(options.taskType || 'all');
    const trigger = this.normalizeString(options.trigger || 'manual', 'manual');
    const respectSwitch = options.respectSwitch !== false;
    const state = await this.getAutoTaskState();
    if (state.running) {
      throw new Error('SEO 自动任务正在执行中，请稍后再试');
    }

    const taskList = this.resolveAutoTaskList(taskType, autoTask, respectSwitch);
    if (taskList.length === 0) {
      throw new Error('当前未启用可执行的自动任务，请先开启任务开关');
    }

    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    let started = false;
    let resultEntry = null;
    let errorMessage = '';

    try {
      await this.saveAutoTaskState({
        running: true,
        lastStartedAt: startedAt,
        lastTaskType: taskType,
        lastTrigger: trigger,
        lastError: '',
      });
      started = true;

      const results = [];
      for (const taskName of taskList) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const taskResult = await this.executeAutoTask(taskName, config, {
            siteOrigin: options.siteOrigin || autoTask.siteOrigin,
          });
          results.push(taskResult);
        } catch (error) {
          results.push({
            task: taskName,
            success: false,
            summary: `${taskName} 执行失败`,
            errorMessage: String(error?.message || '执行失败'),
            data: null,
          });
        }
      }

      const successCount = results.filter(item => item.success === true).length;
      const failedRows = results.filter(item => item.success !== true);
      const finishedAt = new Date().toISOString();
      resultEntry = {
        id: this.createId(),
        taskType,
        trigger,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        taskCount: taskList.length,
        successCount,
        failedCount: failedRows.length,
        success: failedRows.length === 0,
        results,
      };

      await this.appendLog(SEO_AUTO_TASK_LOG_KEY, resultEntry, 200);
      return resultEntry;
    } catch (error) {
      errorMessage = String(error?.message || '自动任务执行失败');
      throw error;
    } finally {
      if (started) {
        const finishedAt = new Date().toISOString();
        const durationMs = Math.max(0, Date.now() - startedMs);
        const finalSuccess = resultEntry?.success === true;
        const finalError = finalSuccess
          ? ''
          : (errorMessage || (resultEntry?.results || [])
            .filter(item => item.success !== true)
            .map(item => item.errorMessage || item.summary || '')
            .filter(Boolean)
            .join('；'));

        await this.saveAutoTaskState({
          running: false,
          lastRunAt: finishedAt,
          lastCompletedAt: finishedAt,
          lastDurationMs: durationMs,
          lastTaskType: taskType,
          lastTrigger: trigger,
          nextRunAt: this.buildNextAutoTaskRunAt(
            finishedAt,
            Number(autoTask.intervalMinutes || 30),
            autoTask.enabled === true
          ),
          lastError: finalError,
          lastResult: resultEntry ? {
            success: resultEntry.success === true,
            taskCount: Number(resultEntry.taskCount || 0),
            successCount: Number(resultEntry.successCount || 0),
            failedCount: Number(resultEntry.failedCount || 0),
            finishedAt,
          } : null,
        }).catch(err => {
          this.ctx.logger.error('[seoCenter] 保存自动任务状态失败: %s', err?.message || err);
        });
      }
    }
  }

  /**
   * 按调度间隔执行自动任务
   * @return {Promise<Record<string, any>>} 执行结果
   */
  async runDueAutoTasks() {
    const config = await this.getConfigCached();
    const autoTask = this.isPlainObject(config.autoTasks) ? config.autoTasks : this.getDefaultConfig().autoTasks;
    if (autoTask.enabled !== true) {
      return { ran: false, reason: 'disabled' };
    }
    const enabledTaskList = this.resolveAutoTaskList('all', autoTask, true);
    if (enabledTaskList.length === 0) {
      return { ran: false, reason: 'no_enabled_tasks' };
    }

    const state = await this.getAutoTaskState();
    if (state.running) {
      return { ran: false, reason: 'running' };
    }

    const lastRunMs = Date.parse(String(state.lastRunAt || ''));
    const intervalMs = Math.max(5, Number(autoTask.intervalMinutes || 30)) * 60 * 1000;
    if (Number.isFinite(lastRunMs) && (Date.now() - lastRunMs) < intervalMs) {
      return {
        ran: false,
        reason: 'not_due',
        nextRunAt: this.buildNextAutoTaskRunAt(state.lastRunAt, Number(autoTask.intervalMinutes || 30), true),
      };
    }

    const data = await this.runAutoTaskNow({
      taskType: 'all',
      trigger: 'schedule',
      respectSwitch: true,
      siteOrigin: autoTask.siteOrigin,
    });

    return {
      ran: true,
      reason: 'executed',
      data,
    };
  }

  /**
   * 汇总 SEO 中心概览
   * @return {Promise<Record<string, any>>} 概览信息
   */
  async getOverview() {
    const config = await this.getConfigCached();
    const [ logs404, invalidLogs, detectorLogs, imageLogs, pushLogs ] = await Promise.all([
      this.getLogs(SEO_404_LOG_KEY),
      this.getLogs(SEO_INVALID_URL_LOG_KEY),
      this.getLogs(SEO_LINK_DETECTOR_LOG_KEY),
      this.getLogs(SEO_IMAGE_OPT_LOG_KEY),
      this.getLogs(SEO_PUSH_LOG_KEY),
    ]);

    const latestInvalid = invalidLogs[0] || null;
    const latestDetector = detectorLogs[0] || null;
    const latestImage = imageLogs[0] || null;

    return {
      config,
      stats: {
        redirectRuleCount: Array.isArray(config.redirects) ? config.redirects.length : 0,
        logs404Count: logs404.length,
        latestInvalidCount: Number(latestInvalid?.invalidCount || 0),
        latestDetectorIssueCount: Number(latestDetector?.issueCount || 0),
        latestImageIssueCount: Number(latestImage?.issueCount || 0),
        latestPushCount: Number(pushLogs[0]?.pushedCount || 0),
      },
      latest: {
        invalidScan: latestInvalid,
        linkDetector: latestDetector,
        imageScan: latestImage,
        push: pushLogs[0] || null,
      },
    };
  }

  /**
   * 判断是否应跳过 SEO 改写
   * @param {string} pathname 请求路径
   * @return {boolean} 是否跳过
   */
  shouldSkipRewrite(pathname) {
    const path = String(pathname || '');
    if (!path) return true;
    if (path.startsWith('/api/')) return true;
    if (path.startsWith('/admin')) return true;
    if (path.startsWith('/public/')) return true;
    if (path.startsWith('/uploads/')) return true;
    if (path.startsWith('/socket.io/')) return true;
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|map)$/i.test(path)) return true;
    return false;
  }

  /**
   * 应用重定向规则匹配
   * @param {string} pathname 请求路径
   * @param {string} querystring 查询串
   * @param {Record<string, any>} config SEO 配置
   * @return {{matched:boolean,targetUrl?:string,statusCode?:number}} 匹配结果
   */
  matchRedirectRule(pathname, querystring, config) {
    const path = this.buildRedirectFromKey(pathname || '/');
    const rules = Array.isArray(config?.redirects) ? config.redirects : [];

    for (const rule of rules) {
      if (!rule?.enabled) continue;
      const from = this.buildRedirectFromKey(rule.from || '');
      if (!from || from === '/') continue;
      if (from !== path) continue;
      const type = String(rule.type || '301') === '302' ? 302 : 301;
      let target = String(rule.to || '/').trim();
      if (!/^https?:\/\//i.test(target)) {
        target = this.normalizePath(target);
      }
      if (rule.preserveQuery !== false && String(querystring || '').trim()) {
        target += target.includes('?') ? `&${querystring}` : `?${querystring}`;
      }
      return {
        matched: true,
        targetUrl: target,
        statusCode: type,
      };
    }

    return { matched: false };
  }

  /**
   * 应用链接改写规则
   * @param {Record<string, any>} requestInfo 请求信息
   * @param {Record<string, any>} config SEO 配置
   * @return {{shouldRedirect:boolean,targetUrl?:string,statusCode:number,reason?:string}} 改写结果
   */
  rewriteRequestUrl(requestInfo = {}, config = {}) {
    const rewrite = config.linkRewrite || {};
    if (rewrite.enabled !== true) {
      return { shouldRedirect: false, statusCode: 301 };
    }

    const protocol = String(requestInfo.protocol || 'http').toLowerCase();
    const host = String(requestInfo.host || '').trim();
    const query = this.isPlainObject(requestInfo.query) ? requestInfo.query : {};
    let path = this.normalizePath(requestInfo.path || '/');

    // 1) 去 index.html
    if (rewrite.stripIndexHtml && /\/index\.html$/i.test(path)) {
      path = path.replace(/\/index\.html$/i, '/') || '/';
    }

    // 2) 路径小写
    if (rewrite.lowerCasePath) {
      path = path.toLowerCase();
    }

    // 3) 去尾斜杠
    if (rewrite.removeTrailingSlash && path.length > 1 && path.endsWith('/')) {
      path = path.replace(/\/+$/, '');
      if (!path) path = '/';
    }

    // 4) 清理跟踪参数
    const queryEntries = Object.entries(query)
      .map(([ key, value ]) => [ String(key), value ])
      .filter(([ key ]) => key);

    const removeTracking = rewrite.removeTrackingParams === true;
    const trackingSet = new Set(
      this.normalizeStringList(rewrite.trackingParams).map(item => item.toLowerCase())
    );

    const filteredQueryEntries = removeTracking
      ? queryEntries.filter(([ key ]) => !trackingSet.has(String(key).toLowerCase()))
      : queryEntries;

    const queryString = filteredQueryEntries
      .map(([ key, value ]) => {
        if (Array.isArray(value)) {
          return value
            .map(item => `${encodeURIComponent(key)}=${encodeURIComponent(String(item ?? ''))}`)
            .join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value ?? ''))}`;
      })
      .filter(Boolean)
      .join('&');

    const originalPath = this.normalizePath(requestInfo.path || '/');
    const originalQueryString = Object.entries(query)
      .map(([ key, value ]) => {
        if (Array.isArray(value)) {
          return value
            .map(item => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(item ?? ''))}`)
            .join('&');
        }
        return `${encodeURIComponent(String(key))}=${encodeURIComponent(String(value ?? ''))}`;
      })
      .filter(Boolean)
      .join('&');

    const protocolChanged = rewrite.forceHttps === true && protocol !== 'https';
    const pathChanged = path !== originalPath;
    const queryChanged = queryString !== originalQueryString;

    if (!protocolChanged && !pathChanged && !queryChanged) {
      return { shouldRedirect: false, statusCode: 301 };
    }

    const finalProtocol = protocolChanged ? 'https' : protocol;
    const targetUrl = `${finalProtocol}://${host}${path}${queryString ? `?${queryString}` : ''}`;

    return {
      shouldRedirect: true,
      statusCode: 301,
      targetUrl,
      reason: protocolChanged
        ? 'force_https'
        : (pathChanged ? 'path_rewrite' : 'query_rewrite'),
    };
  }
}

module.exports = SeoCenterService;
