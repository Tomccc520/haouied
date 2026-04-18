/**
 * @file service/uied/licenseCenter.js
 * @description 商业版许可证与功能能力服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const util = require('../../util');
const { dbTablePrefix = 'la_' } = require('../../extend/config');

const LICENSE_INFO_KEY = 'license_center_info';
const FEATURE_OVERRIDE_KEY = 'license_feature_overrides';
const COMMERCIAL_MODE_KEY = 'commercial_mode_config';
const LICENSE_DOMAIN_BINDINGS_KEY = 'license_runtime_domains';
const LICENSE_SIGN_VERSION = 'v1';
const DEFAULT_LICENSE_ACTIVATE_ENDPOINT = 'https://fsuied.com/api/license/detail';
const DEFAULT_LOCAL_LICENSE_RELATIVE_PATH = 'licenses/my.license';
const DEFAULT_LOCAL_LICENSE_RELATIVE_PATH_CANDIDATES = [
  'licenses/my.license',
  '../licenses/my.license',
];
const DEFAULT_LOCAL_LICENSE_DIR_RELATIVE_PATH_CANDIDATES = [
  'licenses',
  '../licenses',
  'license',
  '../license',
];
const AUTO_REMOTE_REPAIR_COOLDOWN_SECONDS = 600;
const AUTO_REMOTE_REPAIR_FAILURE_CACHE = new Map();
const LICENSE_ACTIVATE_REMOTE_ERROR_MESSAGE_MAP = {
  1001: '授权中心鉴权失败，请检查 UIED_LICENSE_ACTIVATE_TOKEN 或 API 签名密钥配置；也可把授权文件放到 server/licenses 目录（任意 .license 文件）后重试',
  41000: '授权请求参数不完整或格式不合法',
  41001: '授权码无效或不存在',
  41002: '授权码与当前域名不匹配（域名未在授权白名单），请先在 fsuied.com 绑定后重试',
  41003: '授权码与当前项目不匹配（请确认项目编码为 fsuied）',
  41004: '该授权码已被禁用，请联系管理员处理',
  41005: '授权域名额度已满，请先在 fsuied.com 更换或释放已绑定域名后重试',
  429: '授权校验请求过于频繁，请稍后重试',
};
const USER_TABLE = `${dbTablePrefix}user`;
const MENU_TABLE = `${dbTablePrefix}system_auth_menu`;

class LicenseCenterService extends Service {
  /**
   * 解析授权中心远端错误文案
   * @param {number} code 远端错误码
   * @param {string} remoteMessage 远端原始文案
   * @returns {string}
   */
  resolveActivateRemoteErrorMessage(code, remoteMessage = '') {
    const normalizedCode = Number(code || 0);
    const cleanRemoteMessage = String(remoteMessage || '').trim();
    const mappedMessage = String(LICENSE_ACTIVATE_REMOTE_ERROR_MESSAGE_MAP[normalizedCode] || '').trim();
    if (!cleanRemoteMessage) {
      return mappedMessage || '授权中心返回失败';
    }
    if (!mappedMessage) {
      return cleanRemoteMessage;
    }
    const isGenericRemoteMessage = /授权校验失败|授权中心返回失败|请稍后重试/.test(cleanRemoteMessage);
    if (normalizedCode === 1001 || isGenericRemoteMessage) {
      return mappedMessage;
    }
    return cleanRemoteMessage;
  }

  /**
   * 获取功能矩阵定义（Free / Pro / Enterprise）
   */
  getFeatureMatrix() {
    return {
      free: [
        'website_management',
        'category_management',
        'page_management',
        'basic_search',
        'import_export',
        'favicon_fetch',
        'basic_seo',
        'submission',
        'article_basic',
        'article_meta',
        'theme_basic',
        'daily_hot',
      ],
      pro: [
        'advanced_search',
        'no_ads',
        'comments',
        'user_center',
        'article_advanced',
        'wordpress_channel',
        'ai_assistant',
        'operations_blocks',
        'white_label_basic',
      ],
      enterprise: [
        'data_statistics',
        'monitoring',
        'api_access',
        'multi_user',
        'advanced_seo',
        'white_label_full',
        'ai_data_analysis',
        'priority_support',
      ],
    };
  }

  /**
   * 获取功能清单定义（用于前端渲染）
   */
  getFeatureCatalog() {
    return [
      { key: 'website_management', name: '网站管理', group: 'core', minEdition: 'free' },
      { key: 'category_management', name: '分类管理', group: 'core', minEdition: 'free' },
      { key: 'page_management', name: '页面管理', group: 'core', minEdition: 'free' },
      { key: 'basic_search', name: '基础搜索', group: 'core', minEdition: 'free' },
      { key: 'import_export', name: '导入导出', group: 'core', minEdition: 'free' },
      { key: 'favicon_fetch', name: '图标抓取', group: 'core', minEdition: 'free' },
      { key: 'basic_seo', name: '基础 SEO', group: 'seo', minEdition: 'free' },
      { key: 'submission', name: '网站投稿', group: 'content', minEdition: 'free' },
      { key: 'article_basic', name: '文章基础', group: 'content', minEdition: 'free' },
      { key: 'article_meta', name: '文章分类标签', group: 'content', minEdition: 'free' },
      { key: 'theme_basic', name: '基础主题配置', group: 'theme', minEdition: 'free' },
      { key: 'daily_hot', name: '每日热榜聚合', group: 'ops', minEdition: 'free' },
      { key: 'advanced_search', name: '高级搜索', group: 'core', minEdition: 'pro' },
      { key: 'no_ads', name: '去广告', group: 'theme', minEdition: 'pro' },
      { key: 'comments', name: '评论系统', group: 'content', minEdition: 'pro' },
      { key: 'user_center', name: '用户中心', group: 'user', minEdition: 'pro' },
      { key: 'article_advanced', name: '文章高级能力', group: 'content', minEdition: 'pro' },
      { key: 'wordpress_channel', name: 'WordPress 频道', group: 'content', minEdition: 'pro' },
      { key: 'ai_assistant', name: 'AI 助手', group: 'ai', minEdition: 'pro' },
      { key: 'operations_blocks', name: '运营位配置', group: 'ops', minEdition: 'pro' },
      { key: 'white_label_basic', name: '基础白标', group: 'theme', minEdition: 'pro' },
      { key: 'data_statistics', name: '数据统计', group: 'stats', minEdition: 'enterprise' },
      { key: 'monitoring', name: '可用性监控', group: 'stats', minEdition: 'enterprise' },
      { key: 'api_access', name: '开放 API', group: 'integration', minEdition: 'enterprise' },
      { key: 'multi_user', name: '多用户协作', group: 'user', minEdition: 'enterprise' },
      { key: 'advanced_seo', name: '高级 SEO', group: 'seo', minEdition: 'enterprise' },
      { key: 'white_label_full', name: '完整白标', group: 'theme', minEdition: 'enterprise' },
      { key: 'ai_data_analysis', name: 'AI 数据分析', group: 'ai', minEdition: 'enterprise' },
      { key: 'priority_support', name: '优先支持', group: 'service', minEdition: 'enterprise' },
    ];
  }

  /**
   * 将版本标识标准化为 free / pro / enterprise
   */
  normalizeEdition(edition) {
    const text = String(edition || '').trim().toLowerCase();
    if ([ 'enterprise', 'ent', 'business' ].includes(text)) return 'enterprise';
    if ([ 'pro', 'professional', 'personal' ].includes(text)) return 'pro';
    return 'free';
  }

  /**
   * 判断当前版本是否属于付费版本（Pro / Enterprise）
   */
  isPaidEdition(edition) {
    const normalized = this.normalizeEdition(edition);
    return normalized === 'pro' || normalized === 'enterprise';
  }

  /**
   * 判断是否为 Pro 版本
   */
  isProEdition(edition) {
    return this.normalizeEdition(edition) === 'pro';
  }

  /**
   * 校验商业授权版本（仅允许 Pro / Enterprise）
   */
  assertCommercialEdition(edition) {
    const normalized = this.normalizeEdition(edition);
    if (normalized !== 'pro' && normalized !== 'enterprise') {
      throw new Error('当前商业售卖仅支持 Pro/Enterprise 授权');
    }
    return normalized;
  }

  /**
   * 按版本策略规范许可证字段
   * 规则：
   * 1. Pro：永久授权 + 固定 3 域名
   * 2. Enterprise：永久授权 + 域名不限制（保存为大额度占位）
   * 3. Free：保持原有字段
   */
  applyEditionPolicy(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const edition = this.normalizeEdition(source.edition);
    const normalized = {
      ...source,
      edition,
    };

    if (edition === 'pro') {
      normalized.expiresAt = 0;
      normalized.domainLimit = 3;
      return normalized;
    }

    if (edition === 'enterprise') {
      normalized.expiresAt = 0;
      normalized.domainLimit = 9999;
      return normalized;
    }

    return normalized;
  }

  /**
   * 解析布尔值
   */
  parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const text = String(value).trim().toLowerCase();
    if ([ '1', 'true', 'yes', 'y', 'on' ].includes(text)) return true;
    if ([ '0', 'false', 'no', 'n', 'off' ].includes(text)) return false;
    return fallback;
  }

  /**
   * 将输入值规范化为字符串数组（支持数组/逗号分隔字符串）
   */
  toStringList(value) {
    if (Array.isArray(value)) {
      return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    const text = String(value || '').trim();
    if (!text) return [];
    return text.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * 归一化域名文本（支持 host、URL、带端口地址）
   */
  normalizeDomain(input = '') {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) return '';
    let value = raw.replace(/^https?:\/\//, '');
    value = value.replace(/^wss?:\/\//, '');
    if (value.includes('@')) value = value.split('@').pop();
    value = value.split('/')[0].split('?')[0].split('#')[0];
    if (value.startsWith('[') && value.includes(']')) {
      value = value.slice(1, value.indexOf(']'));
    } else {
      const parts = value.split(':');
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        value = parts[0];
      }
    }
    return value.replace(/\.$/, '').trim();
  }

  /**
   * 判断是否为 IPv4 地址
   */
  isIpv4Host(host = '') {
    const text = String(host || '').trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return false;
    const parts = text.split('.').map(item => Number.parseInt(item, 10));
    return parts.length === 4 && parts.every(item => Number.isInteger(item) && item >= 0 && item <= 255);
  }

  /**
   * 归一化授权域名（兼容 *.example.com 形式）
   */
  normalizeAuthorizedDomain(input = '') {
    const normalized = this.normalizeDomain(input).replace(/^\*\./, '').trim();
    return normalized;
  }

  /**
   * 判断授权域名是否有效（用于过滤脏数据）
   */
  isValidAuthorizedDomain(input = '') {
    const domain = this.normalizeAuthorizedDomain(input);
    if (!domain) return false;
    if (this.isBypassDomain(domain)) return true;
    if (this.isIpv4Host(domain)) return true;
    if (!domain.includes('.')) return false;
    if (domain.length > 253) return false;
    if (!/^[a-z0-9.-]+$/i.test(domain)) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.includes('..')) return false;
    return true;
  }

  /**
   * 规范化授权域名白名单（去重 + 过滤无效域名）
   */
  normalizeAuthorizedDomainList(value) {
    return Array.from(new Set(
      this.toStringList(value)
        .map(item => this.normalizeAuthorizedDomain(item))
        .filter(item => this.isValidAuthorizedDomain(item))
    ));
  }

  /**
   * 判断运行域名是否命中授权白名单（支持“主域 + 子域名”）
   */
  isRuntimeDomainMatched(runtimeDomain = '', authorizedDomain = '') {
    const runtime = this.normalizeDomain(runtimeDomain);
    const target = this.normalizeAuthorizedDomain(authorizedDomain);
    if (!runtime || !target) return false;
    if (runtime === target) return true;
    if (this.isIpv4Host(runtime) || this.isIpv4Host(target)) return false;
    if (runtime.includes(':') || target.includes(':')) return false;
    return runtime.endsWith(`.${target}`);
  }

  /**
   * 判断运行域名是否应忽略授权校验（本地开发场景）
   */
  isBypassDomain(domain = '') {
    const host = this.normalizeDomain(domain);
    if (!host) return true;
    if ([ 'localhost', '127.0.0.1', '::1' ].includes(host)) return true;
    if (host.endsWith('.local')) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  }

  /**
   * 获取当前请求域名（优先反向代理头）
   */
  getRuntimeDomain() {
    const { ctx } = this;
    const host = String(
      ctx.get('x-forwarded-host')
      || ctx.get('host')
      || ctx.request.host
      || ''
    ).split(',')[0].trim();
    return this.normalizeDomain(host);
  }

  /**
   * 读取“运行期已绑定域名”缓存
   */
  async getRuntimeDomainBindings() {
    const raw = await this.ctx.service.uied.setting.get(LICENSE_DOMAIN_BINDINGS_KEY);
    const source = raw && typeof raw === 'object' ? raw : {};
    const list = Array.isArray(source.domains)
      ? source.domains
      : (Array.isArray(raw) ? raw : []);
    const domains = Array.from(new Set(
      list.map(item => this.normalizeDomain(item)).filter(Boolean)
    ));
    return {
      domains,
      updatedAt: Number(source.updatedAt || 0) || 0,
    };
  }

  /**
   * 保存“运行期已绑定域名”缓存
   */
  async saveRuntimeDomainBindings(domains = []) {
    const normalizedDomains = Array.from(new Set(
      this.toStringList(domains).map(item => this.normalizeDomain(item)).filter(Boolean)
    ));
    await this.ctx.service.uied.setting.save({
      [LICENSE_DOMAIN_BINDINGS_KEY]: {
        domains: normalizedDomains,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
    return normalizedDomains;
  }

  /**
   * 解析并应用域名授权策略（按商业模式开关决定是否强制）
   */
  async resolveDomainAuthorization(licenseInfo = {}, commercialMode = {}, options = {}) {
    const runtimeDomain = this.getRuntimeDomain();
    const enforceEnabled = commercialMode?.enforceDomainBinding === true;
    const baseIsActive = options?.baseIsActive === true;
    const domainLimit = Math.max(1, Number.parseInt(String(licenseInfo?.domainLimit || 1), 10) || 1);
    const registeredDomains = this.normalizeAuthorizedDomainList(licenseInfo?.domainWhitelist);

    /**
     * 默认值：不开启时始终放行，只展示已配置域名信息。
     */
    const result = {
      domainEnforceEnabled: enforceEnabled,
      runtimeDomain,
      domainLimit,
      domainUsedCount: registeredDomains.length,
      domainRemainingCount: Math.max(0, domainLimit - registeredDomains.length),
      isDomainAuthorized: true,
      domainReason: 'not_enforced',
      registeredDomains,
    };

    if (!enforceEnabled) return result;
    if (!baseIsActive) {
      result.domainReason = 'license_inactive';
      return result;
    }
    if (this.isBypassDomain(runtimeDomain)) {
      result.domainReason = 'runtime_domain_bypass';
      return result;
    }
    if (!runtimeDomain) {
      result.domainReason = 'runtime_domain_empty';
      return result;
    }

    if (registeredDomains.some(item => this.isRuntimeDomainMatched(runtimeDomain, item))) {
      result.domainReason = 'already_bound';
      return result;
    }

    result.isDomainAuthorized = false;
    result.domainReason = registeredDomains.length >= domainLimit
      ? 'domain_limit_exceeded'
      : 'domain_not_in_whitelist';
    return result;
  }

  /**
   * 规范化商业版模式配置
   */
  normalizeCommercialMode(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
      strictLegacyRoutes: this.parseBoolean(source.strictLegacyRoutes, false),
      enforceLicenseSignature: this.parseBoolean(source.enforceLicenseSignature, false),
      enforceDomainBinding: this.parseBoolean(source.enforceDomainBinding, false),
      updatedAt: Number(source.updatedAt || 0) || Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 获取商业版模式配置
   */
  async getCommercialMode() {
    const { ctx } = this;
    const raw = await ctx.service.uied.setting.get(COMMERCIAL_MODE_KEY);
    return this.normalizeCommercialMode(raw || {});
  }

  /**
   * 保存商业版模式配置
   */
  async saveCommercialMode(payload = {}) {
    const next = this.normalizeCommercialMode(payload);
    next.updatedAt = Math.floor(Date.now() / 1000);
    await this.ctx.service.uied.setting.save({ [COMMERCIAL_MODE_KEY]: next });
    return this.getCommercialMode();
  }

  /**
   * 获取许可证签名密钥（优先环境变量）
   */
  getLicenseSignSecret() {
    const appConfig = this.app.config || {};
    const envSecret = String(process.env.UIED_LICENSE_SIGN_SECRET || '').trim();
    if (envSecret) return envSecret;
    const cfgSecret = String(appConfig.uiedLicenseSignSecret || '').trim();
    if (cfgSecret) return cfgSecret;
    const firstKey = String(appConfig.keys || '').split(',')[0].trim();
    if (firstKey) return firstKey;
    return 'uied-license-secret-change-me';
  }

  /**
   * 生成“自动远端修复”冷却缓存键
   * 使用验签摘要可确保字段变化后立即触发新一轮修复尝试。
   */
  buildRemoteRepairCacheKey(payload = {}) {
    const digest = this.buildLicenseVerifyDigest(payload);
    if (digest) return digest;
    const licenseKey = String(payload.licenseKey || '').trim();
    return licenseKey || 'unknown';
  }

  /**
   * 读取自动远端修复失败时间戳
   */
  getRemoteRepairLastFailedAt(payload = {}) {
    const cacheKey = this.buildRemoteRepairCacheKey(payload);
    if (!cacheKey) return 0;
    return Number(AUTO_REMOTE_REPAIR_FAILURE_CACHE.get(cacheKey) || 0) || 0;
  }

  /**
   * 写入自动远端修复失败时间戳
   */
  markRemoteRepairFailed(payload = {}) {
    const cacheKey = this.buildRemoteRepairCacheKey(payload);
    if (!cacheKey) return;
    AUTO_REMOTE_REPAIR_FAILURE_CACHE.set(cacheKey, Math.floor(Date.now() / 1000));
  }

  /**
   * 清理自动远端修复失败时间戳
   */
  clearRemoteRepairFailed(payload = {}) {
    const cacheKey = this.buildRemoteRepairCacheKey(payload);
    if (!cacheKey) return;
    AUTO_REMOTE_REPAIR_FAILURE_CACHE.delete(cacheKey);
  }

  /**
   * 判断是否显式配置了许可证签名密钥（不包含 app.keys 回退）
   */
  hasConfiguredLicenseSignSecret() {
    const appConfig = this.app.config || {};
    const envSecret = String(process.env.UIED_LICENSE_SIGN_SECRET || '').trim();
    if (envSecret) return true;
    const cfgSecret = String(appConfig.uiedLicenseSignSecret || '').trim();
    return Boolean(cfgSecret);
  }

  /**
   * 计算许可证验签摘要（用于无密钥场景下的远端验签缓存校验）
   */
  buildLicenseVerifyDigest(payload = {}) {
    const signPayload = this.buildLicenseSignPayload(payload);
    const signature = String(payload.signature || '').trim().toLowerCase();
    const digestContent = `${JSON.stringify(signPayload)}\n${signature}`;
    return crypto.createHash('sha256').update(digestContent).digest('hex');
  }

  /**
   * 校验远端验签缓存是否仍与当前许可证字段一致
   */
  isRemoteVerifiedDigestValid(payload = {}) {
    const verifiedAt = Number(payload.remoteVerifiedAt || 0) || 0;
    const storedDigest = String(payload.remoteVerifiedDigest || '').trim().toLowerCase();
    if (!verifiedAt || !storedDigest) return false;
    const currentDigest = this.buildLicenseVerifyDigest(payload);
    if (!currentDigest || currentDigest.length !== storedDigest.length) return false;
    return crypto.timingSafeEqual(Buffer.from(currentDigest), Buffer.from(storedDigest));
  }

  /**
   * 通过授权中心返回的官方载荷进行远端验签兜底（用于客户站未配置本地签名密钥时）
   */
  async verifyLicenseSignatureByRemotePayload(payload = {}) {
    const licenseKey = String(payload.licenseKey || '').trim();
    if (!licenseKey) {
      return { passed: false, reason: 'license_key_empty' };
    }
    const appConfig = this.app.config || {};
    const runtimeDomain = this.normalizeDomain(
      payload.runtimeDomain
      || payload.bindDomain
      || this.getRuntimeDomain()
      || ''
    );
    const projectCode = String(
      payload.projectCode
      || process.env.UIED_LICENSE_PROJECT_CODE
      || appConfig.uiedLicenseProjectCode
      || 'fsuied'
    ).trim().toLowerCase();
    try {
      const remotePayload = await this.fetchLicensePayloadByKey(licenseKey, runtimeDomain, projectCode);
      const localSignPayloadText = JSON.stringify(this.buildLicenseSignPayload(payload));
      const remoteSignPayloadText = JSON.stringify(this.buildLicenseSignPayload(remotePayload));
      const localSignature = String(payload.signature || '').trim().toLowerCase();
      const remoteSignature = String(remotePayload.signature || '').trim().toLowerCase();
      const signPayloadMatched = localSignPayloadText === remoteSignPayloadText;
      const signatureMatched = Boolean(localSignature) && localSignature === remoteSignature;
      return {
        passed: signPayloadMatched && signatureMatched,
        reason: signPayloadMatched && signatureMatched ? 'remote_matched' : 'remote_payload_mismatch',
      };
    } catch (error) {
      return {
        passed: false,
        reason: 'remote_verify_failed',
        error,
      };
    }
  }

  /**
   * 获取授权 API 请求签名密钥（用于激活接口签名）
   */
  getLicenseApiSignSecret() {
    const appConfig = this.app.config || {};
    const envApiSecret = String(process.env.UIED_LICENSE_API_SIGN_SECRET || '').trim();
    if (envApiSecret) return envApiSecret;
    const cfgApiSecret = String(appConfig.uiedLicenseApiSignSecret || '').trim();
    if (cfgApiSecret) return cfgApiSecret;
    /**
     * 注意：这里不再回退到 getLicenseSignSecret()/app.keys，
     * 避免客户站在未配置 API 签名密钥时，携带“错误签名头”导致授权中心直接鉴权失败。
     */
    return '';
  }

  /**
   * 使用本地授权文件内容做二次比对兜底（无本地签名密钥且远端鉴权失败时）
   * 规则：签名参与字段与 signature 必须与当前导入内容完全一致。
   */
  async verifyLicenseSignatureByLocalFilePayload(payload = {}) {
    try {
      const localData = await this.readLocalLicensePayload();
      if (!localData || !localData.payload) {
        return { passed: false, reason: 'local_license_not_found' };
      }
      const localPayload = localData.payload;
      const localSignPayloadText = JSON.stringify(this.buildLicenseSignPayload(localPayload));
      const currentSignPayloadText = JSON.stringify(this.buildLicenseSignPayload(payload));
      const localSignature = String(localPayload.signature || '').trim().toLowerCase();
      const currentSignature = String(payload.signature || '').trim().toLowerCase();
      const signPayloadMatched = localSignPayloadText === currentSignPayloadText;
      const signatureMatched = Boolean(localSignature) && localSignature === currentSignature;
      return {
        passed: signPayloadMatched && signatureMatched,
        reason: signPayloadMatched && signatureMatched ? 'local_file_matched' : 'local_file_payload_mismatch',
      };
    } catch (error) {
      return {
        passed: false,
        reason: 'local_file_verify_failed',
        error,
      };
    }
  }

  /**
   * 解析授权激活接口路径（用于签名路径）
   * @param {string} endpoint 远端完整地址
   * @returns {string}
   */
  resolveLicenseActivateEndpointPath(endpoint = '') {
    const fallback = '/api/license/detail';
    const target = String(endpoint || '').trim();
    if (!target) return fallback;
    try {
      const pathname = String(new URL(target).pathname || '').trim();
      if (!pathname || pathname === '/') return fallback;
      return pathname.replace(/\/+$/, '');
    } catch (error) {
      const pathPart = String(target.split('?')[0] || '').trim();
      if (!pathPart) return fallback;
      if (/^https?:\/\//i.test(pathPart)) return fallback;
      const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
      return normalized.replace(/\/+$/, '');
    }
  }

  /**
   * 构建授权激活签名明文
   * @param {object} params 参数
   * @param {string} params.method 请求方法
   * @param {string} params.path 请求路径
   * @param {{licenseKey:string,bindDomain:string,projectCode:string}} params.payload 业务参数
   * @param {number|string} params.timestamp 秒级时间戳
   * @param {string} params.nonce 随机串
   * @returns {string}
   */
  buildLicenseActivateSignMessage({ method, path, payload, timestamp, nonce }) {
    const targetPayload = payload && typeof payload === 'object' ? payload : {};
    const signPath = String(path || '/').replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    return [
      String(method || 'GET').trim().toUpperCase(),
      signPath,
      String(targetPayload.licenseKey || '').trim(),
      String(targetPayload.bindDomain || '').trim().toLowerCase(),
      String(targetPayload.projectCode || '').trim().toLowerCase(),
      String(timestamp || '').trim(),
      String(nonce || '').trim(),
    ].join('\n');
  }

  /**
   * 生成远端激活请求签名头（与 fsuied 机器鉴权网关保持一致）
   * @param {object} params 参数
   * @param {{licenseKey:string,bindDomain:string,projectCode:string}} params.payload 请求参数
   * @param {'GET'|'POST'} params.method 请求方法
   * @param {string} params.endpointPath 接口路径
   * @param {string} params.signSecret 签名密钥
   * @returns {Record<string, string>}
   */
  buildLicenseActivateSignHeaders({ payload, method, endpointPath, signSecret }) {
    const secret = String(signSecret || '').trim();
    if (!secret) return {};
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = util.randomString(24);
    const signMessage = this.buildLicenseActivateSignMessage({
      method,
      path: endpointPath,
      payload,
      timestamp,
      nonce,
    });
    const signature = crypto.createHmac('sha256', secret)
      .update(signMessage)
      .digest('hex');
    return {
      'x-license-timestamp': String(timestamp),
      'x-license-nonce': nonce,
      'x-license-signature': signature,
    };
  }

  /**
   * 获取“按授权码激活”远端配置（fsuied.com 授权中心）
   */
  getLicenseActivateRemoteConfig() {
    const appConfig = this.app.config || {};
    const endpoint = String(
      process.env.UIED_LICENSE_ACTIVATE_ENDPOINT
      || appConfig.uiedLicenseActivateEndpoint
      || DEFAULT_LICENSE_ACTIVATE_ENDPOINT
      || ''
    ).trim();
    const method = String(
      process.env.UIED_LICENSE_ACTIVATE_METHOD
      || appConfig.uiedLicenseActivateMethod
      || 'GET'
    ).trim().toUpperCase();
    const token = String(
      process.env.UIED_LICENSE_ACTIVATE_TOKEN
      || appConfig.uiedLicenseActivateToken
      || ''
    ).trim();
    const signSecret = this.getLicenseApiSignSecret();
    const timeout = Math.max(
      1000,
      Number.parseInt(
        String(
          process.env.UIED_LICENSE_ACTIVATE_TIMEOUT
          || appConfig.uiedLicenseActivateTimeout
          || 10000
        ),
        10
      ) || 10000
    );
    const allowInsecureTls = this.parseBoolean(
      process.env.UIED_LICENSE_ACTIVATE_ALLOW_INSECURE_TLS,
      this.parseBoolean(appConfig.uiedLicenseActivateAllowInsecureTls, false)
    );
    return {
      endpoint,
      endpointPath: this.resolveLicenseActivateEndpointPath(endpoint),
      method: [ 'GET', 'POST' ].includes(method) ? method : 'GET',
      token,
      signSecret,
      timeout,
      allowInsecureTls,
    };
  }

  /**
   * 生成本地授权文件候选路径（兼容多种部署目录）
   */
  resolveLocalLicenseFilePathCandidates() {
    const appConfig = this.app.config || {};
    const rawPath = String(
      process.env.UIED_LICENSE_FILE_PATH
      || appConfig.uiedLicenseFilePath
      || DEFAULT_LOCAL_LICENSE_RELATIVE_PATH
      || ''
    ).trim();
    const candidates = [];
    const seen = new Set();
    const pushCandidate = (targetPath = '') => {
      const cleanPath = String(targetPath || '').trim();
      if (!cleanPath) return;
      const resolvedPath = path.isAbsolute(cleanPath)
        ? cleanPath
        : path.resolve(this.app.baseDir, cleanPath);
      if (seen.has(resolvedPath)) return;
      seen.add(resolvedPath);
      candidates.push(resolvedPath);
    };
    /**
     * 从目录中自动发现授权文件，支持“目录名或文件名不固定”的交付场景。
     */
    const pushDirectoryLicenseCandidates = (targetDir = '') => {
      const cleanDir = String(targetDir || '').trim();
      if (!cleanDir) return;
      const resolvedDir = path.isAbsolute(cleanDir)
        ? cleanDir
        : path.resolve(this.app.baseDir, cleanDir);
      let stat = null;
      try {
        stat = fs.statSync(resolvedDir);
      } catch (error) {
        return;
      }
      if (!stat || !stat.isDirectory()) return;
      let entries = [];
      try {
        entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
      } catch (error) {
        return;
      }
      const licenseFiles = entries
        .filter(entry => entry && entry.isFile() && /\.license$/i.test(String(entry.name || '')))
        .map(entry => path.join(resolvedDir, String(entry.name || '')))
        .sort((left, right) => {
          const leftName = path.basename(left).toLowerCase();
          const rightName = path.basename(right).toLowerCase();
          if (leftName === rightName) return 0;
          if (leftName === 'my.license') return -1;
          if (rightName === 'my.license') return 1;
          return leftName.localeCompare(rightName);
        });
      licenseFiles.forEach(filePath => pushCandidate(filePath));
    };
    if (rawPath) {
      pushCandidate(rawPath);
    }
    DEFAULT_LOCAL_LICENSE_RELATIVE_PATH_CANDIDATES.forEach(item => pushCandidate(item));
    DEFAULT_LOCAL_LICENSE_DIR_RELATIVE_PATH_CANDIDATES.forEach(item => pushDirectoryLicenseCandidates(item));
    /**
     * 兼容 UIED_LICENSE_FILE_PATH 指向“目录”或“同目录其它文件名”的情况：
     * 额外扫描当前候选文件所在目录中的 *.license。
     */
    candidates
      .map(item => path.dirname(item))
      .forEach(dirPath => pushDirectoryLicenseCandidates(dirPath));
    return candidates;
  }

  /**
   * 解析本地授权文件路径
   * 支持 UIED_LICENSE_FILE_PATH 自定义，默认读取 server/licenses/my.license
   */
  resolveLocalLicenseFilePath() {
    const candidates = this.resolveLocalLicenseFilePathCandidates();
    if (!Array.isArray(candidates) || candidates.length === 0) return '';
    return String(candidates[0] || '');
  }

  /**
   * 解析本地授权文件内容
   * 支持 JSON 明文，兼容少数场景的 Base64(JSON) 内容。
   */
  parseLocalLicenseContent(rawContent = '') {
    const text = String(rawContent || '').trim();
    if (!text) return null;
    const candidates = [ text ];
    if (!text.startsWith('{') && !text.startsWith('[')) {
      try {
        const decoded = Buffer.from(text, 'base64').toString('utf8').trim();
        if (decoded) candidates.push(decoded);
      } catch (error) {
        // Base64 解析失败时忽略，继续按 JSON 明文尝试
      }
    }
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const parsed = JSON.parse(candidate);
        if (this.isLicensePayloadLike(parsed)) {
          return parsed;
        }
        try {
          return this.extractLicensePayloadFromRemoteBody(parsed);
        } catch (error) {
          continue;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  /**
   * 读取本地授权文件并提取授权载荷
   */
  async readLocalLicensePayload() {
    const candidates = this.resolveLocalLicenseFilePathCandidates();
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    let parseError = null;
    for (const filePath of candidates) {
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const payload = this.parseLocalLicenseContent(fileContent);
        if (!payload) {
          parseError = new Error(`本地授权文件格式无效：${filePath}，请确认是 fsuied.com 下发的 JSON 授权文件`);
          continue;
        }
        return {
          payload,
          filePath,
        };
      } catch (error) {
        if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
          continue;
        }
        throw error;
      }
    }
    if (parseError) throw parseError;
    return null;
  }

  /**
   * 本地授权文件兜底激活（适用于客户环境未配置远端鉴权 Token 的场景）
   */
  async activateLicenseByLocalFile(options = {}) {
    const localData = await this.readLocalLicensePayload();
    if (!localData) return null;
    const sourcePayload = localData.payload && typeof localData.payload === 'object'
      ? { ...localData.payload }
      : {};
    const inputLicenseKey = String(options.licenseKey || '').trim();
    const fileLicenseKey = String(sourcePayload.licenseKey || '').trim();
    if (inputLicenseKey && fileLicenseKey && inputLicenseKey !== fileLicenseKey) {
      throw new Error(`本地授权文件中的授权码（${fileLicenseKey}）与当前输入不一致，请确认后重试`);
    }
    if (!fileLicenseKey && inputLicenseKey) {
      sourcePayload.licenseKey = inputLicenseKey;
    }
    if (!String(sourcePayload.licenseKey || '').trim()) {
      throw new Error('本地授权文件缺少 licenseKey，请重新下载授权文件');
    }
    const bindDomain = String(options.bindDomain || '').trim();
    if (bindDomain && !String(sourcePayload.runtimeDomain || '').trim()) {
      sourcePayload.runtimeDomain = bindDomain;
    }
    this.assertCommercialEdition(sourcePayload.edition);
    const saved = await this.saveLicenseInfo(sourcePayload);
    return {
      ...saved,
      activatedBy: 'license_file',
      activateSourceFile: localData.filePath,
    };
  }

  /**
   * 判断远端激活失败后是否应该尝试本地授权文件兜底
   * 仅在鉴权配置缺失、网络异常、证书异常等场景启用，业务错误码不走兜底。
   */
  shouldFallbackToLocalLicense(error) {
    const bizCode = Number(error?.bizCode || 0);
    if (Number.isFinite(bizCode) && bizCode > 0) {
      return bizCode === 1001;
    }
    const message = String(error?.message || '').toLowerCase();
    if (!message) return false;
    return /network|timeout|certificate|unable to get local issuer|self signed|econnrefused|enotfound|eai_again/i.test(message);
  }

  /**
   * 判断对象是否像“授权载荷”
   */
  isLicensePayloadLike(payload) {
    if (!payload || typeof payload !== 'object') return false;
    const edition = String(payload.edition || '').trim();
    const licenseKey = String(payload.licenseKey || '').trim();
    const signature = String(payload.signature || '').trim();
    return Boolean(edition || licenseKey || signature);
  }

  /**
   * 从 fsuied.com 返回体中提取授权载荷
   */
  extractLicensePayloadFromRemoteBody(body) {
    const source = body && typeof body === 'object' ? body : {};
    const data = source.data && typeof source.data === 'object' ? source.data : {};
    const candidates = [
      data.licensePayload,
      data.payload,
      data.license,
      data,
      source.payload,
      source.license,
      source,
    ];
    const target = candidates.find(item => this.isLicensePayloadLike(item)) || null;
    if (!target) {
      throw new Error('授权中心返回缺少有效授权载荷');
    }
    return target;
  }

  /**
   * 从 fsuied.com 拉取授权载荷（按授权码）
   */
  async fetchLicensePayloadByKey(licenseKey, bindDomain = '', projectCode = '') {
    const { ctx } = this;
    const config = this.getLicenseActivateRemoteConfig();
    if (!config.endpoint) {
      throw new Error('未配置授权中心激活地址（UIED_LICENSE_ACTIVATE_ENDPOINT）');
    }

    const payload = {
      licenseKey: String(licenseKey || '').trim(),
      bindDomain: String(bindDomain || '').trim(),
      runtimeDomain: String(bindDomain || '').trim(),
      projectCode: String(projectCode || '').trim(),
    };
    const headers = {};
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
      headers['x-license-token'] = config.token;
    }
    Object.assign(headers, this.buildLicenseActivateSignHeaders({
      payload,
      method: config.method,
      endpointPath: config.endpointPath,
      signSecret: config.signSecret,
    }));
    const curlOptions = {
      dataType: 'json',
      timeout: config.timeout,
      rejectUnauthorized: !config.allowInsecureTls,
      headers,
    };

    let response = null;
    if (config.method === 'POST') {
      response = await ctx.curl(config.endpoint, {
        ...curlOptions,
        method: 'POST',
        contentType: 'json',
        data: payload,
      });
    } else {
      response = await ctx.curl(config.endpoint, {
        ...curlOptions,
        method: 'GET',
        data: payload,
      });
    }

    const body = response?.data && typeof response.data === 'object'
      ? response.data
      : {};
    const code = Number(body.code);
    if (Number.isFinite(code) && code !== 0 && code !== 200) {
      const message = this.resolveActivateRemoteErrorMessage(code, body.message || body.msg || '');
      const error = new Error(message);
      error.bizCode = code;
      throw error;
    }
    return this.extractLicensePayloadFromRemoteBody(body);
  }

  /**
   * 按授权码激活：向 fsuied.com 拉取签名授权并落库
   */
  async activateLicenseByKey(payload = {}) {
    const appConfig = this.app.config || {};
    const licenseKey = String(
      payload.licenseKey
      || payload.key
      || ''
    ).trim();
    const bindDomain = this.normalizeDomain(
      payload.bindDomain
      || payload.runtimeDomain
      || payload.domain
      || this.getRuntimeDomain()
      || ''
    );
    const projectCode = String(
      payload.projectCode
      || process.env.UIED_LICENSE_PROJECT_CODE
      || appConfig.uiedLicenseProjectCode
      || 'fsuied'
    ).trim().toLowerCase();
    /**
     * 文件授权模式：未传授权码时，直接尝试读取本地授权文件。
     * 这样后台可以隐藏在线 Key 激活入口，只保留文件激活入口。
     */
    if (!licenseKey) {
      const localActivated = await this.activateLicenseByLocalFile({
        bindDomain,
        projectCode,
      });
      if (localActivated) {
        return {
          ...localActivated,
          activatedBy: 'license_file_direct',
        };
      }
      throw new Error('未检测到本地授权文件，请将授权文件放到 server/licenses/my.license 后重试');
    }
    let remotePayload = null;
    try {
      remotePayload = await this.fetchLicensePayloadByKey(licenseKey, bindDomain, projectCode);
    } catch (error) {
      if (this.shouldFallbackToLocalLicense(error)) {
        const localActivated = await this.activateLicenseByLocalFile({
          licenseKey,
          bindDomain,
          projectCode,
        });
        if (localActivated) {
          return {
            ...localActivated,
            activatedBy: 'license_file_fallback',
          };
        }
      }
      throw error;
    }
    const remoteLicenseKey = String(remotePayload.licenseKey || '').trim();
    if (!remoteLicenseKey) {
      throw new Error('授权中心返回的授权数据缺少 licenseKey');
    }
    if (remoteLicenseKey !== licenseKey) {
      throw new Error('授权中心返回的授权码与当前输入不一致，请检查授权码');
    }
    this.assertCommercialEdition(remotePayload.edition);
    const saved = await this.saveLicenseInfo(remotePayload);
    return {
      ...saved,
      activatedBy: 'license_key',
    };
  }

  /**
   * 是否允许当前实例本地签发许可证
   * 默认关闭，仅 fsuied.com 授权中心实例应开启。
   */
  isLocalLicenseSignEnabled() {
    const appConfig = this.app.config || {};
    const envFlag = process.env.UIED_ENABLE_LOCAL_LICENSE_SIGN;
    if (envFlag !== undefined) {
      return this.parseBoolean(envFlag, false);
    }
    return this.parseBoolean(appConfig.uiedEnableLocalLicenseSign, false);
  }

  /**
   * 构建许可证签名载荷（固定字段顺序，避免签名漂移）
   */
  buildLicenseSignPayload(payload = {}) {
    const source = this.applyEditionPolicy(payload);
    return {
      edition: this.normalizeEdition(source.edition || 'free'),
      status: String(source.status || 'active').trim().toLowerCase() || 'active',
      licenseKey: String(source.licenseKey || '').trim(),
      customerName: String(source.customerName || '').trim(),
      companyName: String(source.companyName || '').trim(),
      contactEmail: String(source.contactEmail || '').trim(),
      domainLimit: Math.max(1, Number.parseInt(String(source.domainLimit || 1), 10) || 1),
      domainWhitelist: this.toStringList(source.domainWhitelist).sort(),
      issuedAt: Number(source.issuedAt || 0) || 0,
      expiresAt: Number(source.expiresAt || 0) || 0,
      note: String(source.note || '').trim(),
      signVersion: String(source.signVersion || LICENSE_SIGN_VERSION),
    };
  }

  /**
   * 构建并签发许可证数据（用于授权中心发放客户 License 文件）
   */
  buildSignedLicense(payload = {}) {
    const now = Math.floor(Date.now() / 1000);
    const signed = {
      ...this.buildLicenseSignPayload(payload),
      updatedAt: Number(payload?.updatedAt || 0) || now,
    };
    signed.signature = this.signLicensePayload(signed);
    return {
      ...signed,
      isSignatureValid: true,
    };
  }

  /**
   * 计算许可证签名
   */
  signLicensePayload(payload = {}) {
    const secret = this.getLicenseSignSecret();
    const content = JSON.stringify(this.buildLicenseSignPayload(payload));
    return crypto.createHmac('sha256', secret).update(content).digest('hex');
  }

  /**
   * 校验许可证签名
   */
  verifyLicenseSignature(payload = {}) {
    const signature = String(payload.signature || '').trim().toLowerCase();
    if (!signature) return false;
    const expected = String(this.signLicensePayload(payload) || '').trim().toLowerCase();
    if (!expected || signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * 校验外部许可证载荷（给后台“验签/导入前校验”使用）
   */
  verifyLicensePayload(payload = {}) {
    const now = Math.floor(Date.now() / 1000);
    const normalized = {
      ...this.buildLicenseSignPayload(payload),
      signature: String(payload?.signature || '').trim().toLowerCase(),
      updatedAt: Number(payload?.updatedAt || 0) || now,
    };
    const isSignatureValid = this.verifyLicenseSignature(normalized);
    const isExpired = normalized.expiresAt > 0 && normalized.expiresAt < now;
    const isActive = normalized.status === 'active' && !isExpired && isSignatureValid;
    return {
      ...normalized,
      isSignatureValid,
      isExpired,
      isActive,
      now,
    };
  }

  /**
   * 自动修复历史授权数据中的 invalid_signature（无本地密钥场景）
   * 场景：客户站升级后未重新导入 license，希望系统自动完成一次远端核验并回写摘要缓存。
   */
  async tryAutoRepairLicenseSignature(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const hasConfiguredSignSecret = this.hasConfiguredLicenseSignSecret();
    const isPaidEdition = this.isPaidEdition(source.edition);
    const hasLicenseKey = Boolean(String(source.licenseKey || '').trim());
    const hasSignature = Boolean(String(source.signature || '').trim());
    if (hasConfiguredSignSecret || !isPaidEdition || !hasLicenseKey || !hasSignature) {
      return { repaired: false, reason: 'repair_not_required' };
    }
    if (this.isRemoteVerifiedDigestValid(source)) {
      return { repaired: false, reason: 'remote_digest_exists' };
    }
    const now = Math.floor(Date.now() / 1000);
    const lastFailedAt = this.getRemoteRepairLastFailedAt(source);
    if (lastFailedAt > 0 && (now - lastFailedAt) < AUTO_REMOTE_REPAIR_COOLDOWN_SECONDS) {
      return { repaired: false, reason: 'cooldown' };
    }
    const verifyResult = await this.verifyLicenseSignatureByRemotePayload({
      ...source,
      runtimeDomain: this.getRuntimeDomain(),
    });
    if (!verifyResult.passed) {
      const localFileResult = await this.verifyLicenseSignatureByLocalFilePayload(source);
      if (localFileResult.passed) {
        const nextByLocalFile = {
          ...source,
          remoteVerifiedAt: now,
          remoteVerifiedDigest: this.buildLicenseVerifyDigest(source),
          updatedAt: now,
        };
        await this.ctx.service.uied.setting.save({ [LICENSE_INFO_KEY]: nextByLocalFile });
        this.clearRemoteRepairFailed(source);
        return {
          repaired: true,
          payload: nextByLocalFile,
        };
      }
      this.markRemoteRepairFailed(source);
      return {
        repaired: false,
        reason: verifyResult.reason || 'remote_verify_failed',
        error: verifyResult.error,
      };
    }
    const next = {
      ...source,
      remoteVerifiedAt: now,
      remoteVerifiedDigest: this.buildLicenseVerifyDigest(source),
      updatedAt: now,
    };
    await this.ctx.service.uied.setting.save({ [LICENSE_INFO_KEY]: next });
    this.clearRemoteRepairFailed(source);
    return {
      repaired: true,
      payload: next,
    };
  }

  /**
   * 获取许可证信息（带有效性判定）
   */
  async getLicenseInfo() {
    const { ctx } = this;
    const raw = await ctx.service.uied.setting.get(LICENSE_INFO_KEY);
    const mode = await this.getCommercialMode();
    const now = Math.floor(Date.now() / 1000);
    const defaults = {
      edition: 'free',
      status: 'active',
      licenseKey: '',
      customerName: '',
      companyName: '',
      contactEmail: '',
      domainLimit: 1,
      domainWhitelist: [],
      issuedAt: 0,
      expiresAt: 0,
      note: '',
      signVersion: LICENSE_SIGN_VERSION,
      signature: '',
      remoteVerifiedAt: 0,
      remoteVerifiedDigest: '',
      updatedAt: now,
    };
    const source = this.applyEditionPolicy(raw && typeof raw === 'object' ? raw : {});
    const normalized = {
      ...defaults,
      ...source,
      edition: this.normalizeEdition(source.edition),
      status: String(source.status || defaults.status).trim().toLowerCase() || 'active',
      domainLimit: Math.max(1, Number.parseInt(String(source.domainLimit || defaults.domainLimit), 10) || 1),
      domainWhitelist: Array.isArray(source.domainWhitelist)
        ? source.domainWhitelist.map(item => String(item || '').trim()).filter(Boolean)
        : [],
      issuedAt: Number(source.issuedAt || 0) || 0,
      expiresAt: Number(source.expiresAt || 0) || 0,
      signVersion: String(source.signVersion || defaults.signVersion),
      signature: String(source.signature || defaults.signature).trim().toLowerCase(),
      remoteVerifiedAt: Number(source.remoteVerifiedAt || 0) || 0,
      remoteVerifiedDigest: String(source.remoteVerifiedDigest || '').trim().toLowerCase(),
      updatedAt: Number(source.updatedAt || 0) || now,
    };
    const rawStatus = normalized.status;
    const isPaidEdition = this.isPaidEdition(normalized.edition);
    const isProEdition = this.isProEdition(normalized.edition);
    /**
     * 规则：
     * 1. Pro / Enterprise 固定强制验签
     * 2. Free 版本仅在后台显式开启时才验签
     */
    const signatureRequired = isPaidEdition || mode.enforceLicenseSignature === true;
    const hasConfiguredSignSecret = this.hasConfiguredLicenseSignSecret();
    const isSignatureValidLocal = this.verifyLicenseSignature(normalized);
    let isSignatureValidRemoteCached = !hasConfiguredSignSecret
      && this.isRemoteVerifiedDigestValid(normalized);
    if (signatureRequired && !isSignatureValidLocal && !isSignatureValidRemoteCached) {
      const repairedResult = await this.tryAutoRepairLicenseSignature(normalized);
      if (repairedResult.repaired && repairedResult.payload) {
        normalized.remoteVerifiedAt = Number(repairedResult.payload.remoteVerifiedAt || 0) || 0;
        normalized.remoteVerifiedDigest = String(repairedResult.payload.remoteVerifiedDigest || '').trim().toLowerCase();
        normalized.updatedAt = Number(repairedResult.payload.updatedAt || normalized.updatedAt) || normalized.updatedAt;
        isSignatureValidRemoteCached = !hasConfiguredSignSecret
          && this.isRemoteVerifiedDigestValid(normalized);
      } else if (repairedResult.error) {
        this.ctx.logger.warn(
          `[licenseCenter] 自动远端修复签名失败: ${String(repairedResult.error.message || repairedResult.reason || 'unknown')}`
        );
      }
    }
    const isSignatureValid = isSignatureValidLocal || isSignatureValidRemoteCached;
    const signatureBlocked = signatureRequired && !isSignatureValid;
    const isExpired = normalized.expiresAt > 0 && normalized.expiresAt < now;
    const baseIsActive = rawStatus === 'active' && !isExpired && !signatureBlocked;
    /**
     * 规则：
     * 1. Pro 固定强制域名授权（3 域名）
     * 2. Enterprise 不限制域名
     * 3. Free 版本按后台开关决定
     */
    const domainMode = {
      ...mode,
      enforceDomainBinding: isProEdition ? true : (!isPaidEdition && mode.enforceDomainBinding === true),
    };
    const domainAuth = await this.resolveDomainAuthorization(normalized, domainMode, { baseIsActive });
    const isActive = baseIsActive && (!domainAuth.domainEnforceEnabled || domainAuth.isDomainAuthorized);
    const effectiveEdition = isActive ? normalized.edition : 'free';
    const domainBlocked = !domainAuth.isDomainAuthorized && domainAuth.domainEnforceEnabled;
    const status = signatureBlocked
      ? 'invalid_signature'
      : (domainBlocked
        ? (domainAuth.domainReason === 'domain_not_in_whitelist' ? 'domain_not_authorized' : 'domain_limit_exceeded')
        : rawStatus);
    return {
      ...normalized,
      /**
       * 域名白名单以“规范化后白名单”为准，避免出现无效域名污染展示。
       */
      domainWhitelist: domainAuth.registeredDomains,
      rawStatus,
      status,
      isExpired,
      isActive,
      isPaidEdition,
      isProEdition,
      effectiveEdition,
      isSignatureValid,
      signatureVerifyMode: isSignatureValidLocal
        ? 'local_secret'
        : (isSignatureValidRemoteCached ? 'remote_cached' : 'failed'),
      signatureRequired,
      domainEnforceEnabled: domainAuth.domainEnforceEnabled,
      isDomainAuthorized: domainAuth.isDomainAuthorized,
      domainReason: domainAuth.domainReason,
      runtimeDomain: domainAuth.runtimeDomain,
      domainUsedCount: domainAuth.domainUsedCount,
      domainRemainingCount: domainAuth.domainRemainingCount,
      registeredDomains: domainAuth.registeredDomains,
      now,
    };
  }

  /**
   * 获取前台公开授权状态（脱敏）
   */
  async getPublicLicenseStatus() {
    const licenseInfo = await this.getLicenseInfo();
    return {
      edition: String(licenseInfo.edition || 'free'),
      effectiveEdition: String(licenseInfo.effectiveEdition || 'free'),
      status: String(licenseInfo.status || 'active'),
      isActive: licenseInfo.isActive === true,
      isExpired: licenseInfo.isExpired === true,
      isPaidEdition: licenseInfo.isPaidEdition === true,
      expiresAt: Number(licenseInfo.expiresAt || 0) || 0,
      now: Number(licenseInfo.now || Math.floor(Date.now() / 1000)),
    };
  }

  /**
   * 保存许可证信息
   */
  async saveLicenseInfo(payload = {}) {
    const now = Math.floor(Date.now() / 1000);
    const source = this.applyEditionPolicy(payload && typeof payload === 'object' ? payload : {});
    const incomingSignature = String(source.signature || '').trim().toLowerCase();
    const isPaidEdition = this.isPaidEdition(source.edition);
    if (!isPaidEdition) {
      throw new Error('当前商业售卖仅支持 Pro/Enterprise 授权');
    }
    const next = {
      edition: this.normalizeEdition(source.edition),
      status: String(source.status || 'active').trim().toLowerCase() || 'active',
      licenseKey: String(source.licenseKey || '').trim(),
      customerName: String(source.customerName || '').trim(),
      companyName: String(source.companyName || '').trim(),
      contactEmail: String(source.contactEmail || '').trim(),
      domainLimit: Math.max(1, Number.parseInt(String(source.domainLimit || 1), 10) || 1),
      domainWhitelist: this.toStringList(source.domainWhitelist),
      issuedAt: Number(source.issuedAt || 0) || 0,
      expiresAt: Number(source.expiresAt || 0) || 0,
      note: String(source.note || '').trim(),
      signVersion: LICENSE_SIGN_VERSION,
      remoteVerifiedAt: 0,
      remoteVerifiedDigest: '',
      updatedAt: now,
    };

    /**
     * Pro / Enterprise 必须使用 fsuied.com 签发后的签名导入。
     */
    if (!incomingSignature) {
      throw new Error('Pro/Enterprise 许可证必须包含签名，请使用授权码激活或导入 fsuied.com 签名授权');
    }
    next.signature = incomingSignature;
    const hasConfiguredSignSecret = this.hasConfiguredLicenseSignSecret();
    const isSignatureValidLocal = this.verifyLicenseSignature(next);
    if (!isSignatureValidLocal) {
      /**
       * 兜底策略：
       * 当客户站未配置本地签名密钥时，允许向授权中心拉取官方载荷二次核对。
       * 通过后缓存摘要，后续读取时仍可防止本地篡改。
       */
      if (!hasConfiguredSignSecret) {
        const remoteVerifyResult = await this.verifyLicenseSignatureByRemotePayload({
          ...next,
          runtimeDomain: this.getRuntimeDomain(),
        });
        if (remoteVerifyResult.passed) {
          next.remoteVerifiedAt = now;
          next.remoteVerifiedDigest = this.buildLicenseVerifyDigest(next);
        } else {
          const localFileVerifyResult = await this.verifyLicenseSignatureByLocalFilePayload(next);
          if (localFileVerifyResult.passed) {
            next.remoteVerifiedAt = now;
            next.remoteVerifiedDigest = this.buildLicenseVerifyDigest(next);
          } else {
            const remoteErrorText = String(remoteVerifyResult.error?.message || '').trim();
            const remoteHint = remoteErrorText
              ? `（远端校验失败：${remoteErrorText}）`
              : '';
            const localErrorText = String(localFileVerifyResult.error?.message || '').trim();
            const localHint = localErrorText
              ? `（本地文件校验失败：${localErrorText}）`
              : '';
            throw new Error(`许可证签名校验失败：请确认 UIED_LICENSE_SIGN_SECRET 与签发端一致，且授权文件未被修改${remoteHint}${localHint}`);
          }
        }
      } else {
        throw new Error('许可证签名校验失败：请确认 UIED_LICENSE_SIGN_SECRET 与签发端一致，且授权文件未被修改');
      }
    }

    await this.ctx.service.uied.setting.save({ [LICENSE_INFO_KEY]: next });
    /**
     * 导入/更新许可证后清空运行时自动绑定域名，避免改绑后旧域名仍占额度。
     */
    await this.saveRuntimeDomainBindings([]);
    return this.getLicenseInfo();
  }

  /**
   * 获取功能开关覆盖配置
   */
  async getFeatureOverrides() {
    const { ctx } = this;
    const raw = await ctx.service.uied.setting.get(FEATURE_OVERRIDE_KEY);
    if (!raw || typeof raw !== 'object') return {};
    const result = {};
    Object.keys(raw).forEach(key => {
      result[String(key)] = this.parseBoolean(raw[key], false);
    });
    return result;
  }

  /**
   * 保存功能开关覆盖配置
   */
  async saveFeatureOverrides(payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const next = {};
    Object.keys(source).forEach(key => {
      const featureKey = String(key || '').trim();
      if (!featureKey) return;
      next[featureKey] = this.parseBoolean(source[key], false);
    });
    await this.ctx.service.uied.setting.save({ [FEATURE_OVERRIDE_KEY]: next });
    return next;
  }

  /**
   * 读取表数据总数（可降级，避免商业版诊断接口因单表异常直接 500）
   */
  async safeCount(tableName, whereSql = '1=1', replacements = []) {
    const { app } = this;
    try {
      const [ row ] = await app.model.query(
        `SELECT COUNT(*) AS total FROM \`${tableName}\` WHERE ${whereSql}`,
        { replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
      return {
        available: true,
        count: Number(row?.total || 0),
        error: '',
      };
    } catch (error) {
      this.ctx.logger.warn(`[licenseCenter] safeCount(${tableName}) 降级: ${error.message}`);
      return {
        available: false,
        count: 0,
        error: String(error?.message || 'count_failed'),
      };
    }
  }

  /**
   * 检测商业版关键菜单权限是否出现重复（用于排查“菜单重复显示”）
   */
  async scanCommercialMenuDuplicates() {
    const { app } = this;
    const targetPerms = [
      'uied:license:info',
      'uied:feature:list',
      'uied:delivery:init:index',
      'uied:user:center:index',
    ];
    try {
      const placeholders = targetPerms.map(() => '?').join(',');
      const rows = await app.model.query(
        `SELECT perms, COUNT(*) AS total, GROUP_CONCAT(id ORDER BY id ASC) AS ids
         FROM \`${MENU_TABLE}\`
         WHERE is_delete = 0
           AND perms IN (${placeholders})
         GROUP BY perms
         HAVING COUNT(*) > 1`,
        {
          replacements: targetPerms,
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      return (Array.isArray(rows) ? rows : []).map(item => ({
        perms: String(item?.perms || ''),
        total: Number(item?.total || 0),
        ids: String(item?.ids || '').split(',').map(v => Number(v || 0))
          .filter(Boolean),
      })).filter(item => item.perms);
    } catch (error) {
      this.ctx.logger.warn(`[licenseCenter] scanCommercialMenuDuplicates 降级: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取商业版总览（运营态检查：许可证、能力开关、数据量、菜单重复）
   */
  async getCommercialOverview() {
    const { ctx } = this;
    const now = Math.floor(Date.now() / 1000);
    const [ licenseInfo, commercialMode, featureList, articleConfig ] = await Promise.all([
      this.getLicenseInfo(),
      this.getCommercialMode(),
      this.getFeatureList(),
      ctx.service.uied.setting.get('articleConfig').catch(() => null),
    ]);
    const normalizedArticleConfig = ctx.service.uied.setting.normalizeArticleConfig(articleConfig || {});

    const [
      websiteCount,
      websiteCategoryCount,
      websiteTagCount,
      articleCount,
      articleCategoryCount,
      articleTagCount,
      userCount,
      testUserCount,
      duplicateMenuPerms,
    ] = await Promise.all([
      this.safeCount('uied_website', 'is_delete = 0'),
      this.safeCount('uied_category', 'is_delete = 0'),
      this.safeCount('uied_website_tag', 'is_delete = 0'),
      this.safeCount('uied_article', 'is_delete = 0'),
      this.safeCount('uied_article_category', 'is_delete = 0'),
      this.safeCount('uied_article_tag', 'is_delete = 0'),
      this.safeCount(USER_TABLE, 'is_delete = 0'),
      this.safeCount(USER_TABLE, 'is_delete = 0 AND username LIKE ?', [ 'uied_test_%' ]),
      this.scanCommercialMenuDuplicates(),
    ]);

    const checks = [];
    checks.push({
      key: 'license_active',
      status: licenseInfo.isActive ? 'pass' : 'fail',
      message: licenseInfo.isActive
        ? `许可证状态正常（${licenseInfo.effectiveEdition}）`
        : `许可证未生效（status=${licenseInfo.status}）`,
    });
    checks.push({
      key: 'strict_legacy_routes',
      status: commercialMode.strictLegacyRoutes ? 'pass' : 'warn',
      message: commercialMode.strictLegacyRoutes
        ? '严格商业版模式已开启（旧兼容路由关闭）'
        : '严格商业版模式未开启（旧兼容路由仍可访问）',
    });
    const paidAuthorizationRequired = this.isPaidEdition(licenseInfo.edition);
    const proDomainEnforced = this.isProEdition(licenseInfo.edition);
    const signatureEnforced = paidAuthorizationRequired || commercialMode.enforceLicenseSignature;
    const domainEnforced = proDomainEnforced || (!paidAuthorizationRequired && commercialMode.enforceDomainBinding);

    checks.push({
      key: 'license_signature_enforce',
      status: signatureEnforced ? 'pass' : 'warn',
      message: signatureEnforced
        ? (paidAuthorizationRequired
          ? '许可证签名强校验已开启（付费版强制）'
          : '许可证签名强校验已开启')
        : '许可证签名强校验未开启',
    });
    checks.push({
      key: 'license_domain_enforce',
      status: domainEnforced ? 'pass' : 'warn',
      message: domainEnforced
        ? (proDomainEnforced
          ? '域名绑定数量限制已开启（Pro 固定 3 域名）'
          : '域名绑定数量限制已开启')
        : (paidAuthorizationRequired
          ? 'Enterprise 为源码交付，不限制域名数量'
          : '域名绑定数量限制未开启'),
    });
    checks.push({
      key: 'license_domain_authorized',
      status: domainEnforced
        ? (licenseInfo.isDomainAuthorized ? 'pass' : 'fail')
        : 'warn',
      message: domainEnforced
        ? (licenseInfo.isDomainAuthorized
          ? `当前域名已授权（${licenseInfo.runtimeDomain || 'unknown'}）`
          : `当前域名未授权（${licenseInfo.runtimeDomain || 'unknown'}）`)
        : (paidAuthorizationRequired
          ? 'Enterprise 为源码交付，不校验域名'
          : '未开启域名授权校验'),
    });
    checks.push({
      key: 'article_module_enabled',
      status: normalizedArticleConfig.enabled ? 'pass' : 'warn',
      message: normalizedArticleConfig.enabled
        ? '文章模块已启用'
        : '文章模块已关闭（前端文章入口可能为空）',
    });
    checks.push({
      key: 'test_users_seeded',
      status: testUserCount.count > 0 ? 'pass' : 'warn',
      message: testUserCount.count > 0
        ? `已存在测试用户 ${testUserCount.count} 个`
        : '未检测到测试用户（建议初始化用于交付联调）',
    });
    checks.push({
      key: 'commercial_menu_duplicate',
      status: duplicateMenuPerms.length > 0 ? 'warn' : 'pass',
      message: duplicateMenuPerms.length > 0
        ? `发现 ${duplicateMenuPerms.length} 组商业菜单权限重复`
        : '未发现商业菜单权限重复',
    });

    const failCount = checks.filter(item => item.status === 'fail').length;
    const warnCount = checks.filter(item => item.status === 'warn').length;
    const score = Math.max(0, 100 - failCount * 25 - warnCount * 8);
    const level = failCount > 0 ? 'risk' : (warnCount > 2 ? 'attention' : 'ready');

    return {
      generatedAt: now,
      score,
      level,
      checks,
      license: {
        edition: licenseInfo.edition,
        effectiveEdition: licenseInfo.effectiveEdition,
        status: licenseInfo.status,
        isActive: licenseInfo.isActive,
        isExpired: licenseInfo.isExpired,
        isSignatureValid: licenseInfo.isSignatureValid,
        signatureRequired: licenseInfo.signatureRequired,
        expiresAt: licenseInfo.expiresAt,
        domainEnforceEnabled: licenseInfo.domainEnforceEnabled,
        isDomainAuthorized: licenseInfo.isDomainAuthorized,
        runtimeDomain: licenseInfo.runtimeDomain,
        domainLimit: licenseInfo.domainLimit,
        domainUsedCount: licenseInfo.domainUsedCount,
        domainRemainingCount: licenseInfo.domainRemainingCount,
        registeredDomains: licenseInfo.registeredDomains,
        updatedAt: licenseInfo.updatedAt,
      },
      commercialMode,
      featureSummary: {
        edition: featureList.edition,
        totalCount: featureList.totalCount,
        enabledCount: featureList.enabledCount,
        disabledCount: Math.max(0, Number(featureList.totalCount || 0) - Number(featureList.enabledCount || 0)),
      },
      dataStats: {
        websites: websiteCount,
        websiteCategories: websiteCategoryCount,
        websiteTags: websiteTagCount,
        articles: articleCount,
        articleCategories: articleCategoryCount,
        articleTags: articleTagCount,
        users: userCount,
        testUsers: testUserCount,
      },
      diagnostics: {
        duplicateMenuPerms,
      },
    };
  }

  /**
   * 计算当前生效的功能键集合
   */
  async resolveEffectiveFeatureSet() {
    const matrix = this.getFeatureMatrix();
    const licenseInfo = await this.getLicenseInfo();
    const overrides = await this.getFeatureOverrides();
    const paidEditionActive = this.isPaidEdition(licenseInfo.effectiveEdition);
    /**
     * 商业售卖策略：
     * 1. Pro / Enterprise 均开放全部功能
     * 2. Free 仅保留免费能力
     */
    const baseSet = new Set([
      ...matrix.free,
      ...(paidEditionActive ? matrix.pro : []),
      ...(paidEditionActive ? matrix.enterprise : []),
    ]);

    // 当前策略：许可证优先，后台开关用于“关闭”功能，不提升许可证等级能力
    Object.keys(overrides).forEach(key => {
      if (overrides[key] === false) {
        baseSet.delete(key);
      }
    });

    return { featureSet: baseSet, licenseInfo, overrides };
  }

  /**
   * 获取完整功能列表（附带启用状态）
   */
  async getFeatureList() {
    const catalog = this.getFeatureCatalog();
    const { featureSet, licenseInfo, overrides } = await this.resolveEffectiveFeatureSet();
    const rows = catalog.map(item => {
      const enabled = featureSet.has(item.key);
      let source = 'license';
      if (Object.prototype.hasOwnProperty.call(overrides, item.key) && overrides[item.key] === false) {
        source = 'override_off';
      }
      return {
        ...item,
        enabled,
        source,
      };
    });
    const enabledCount = rows.filter(item => item.enabled).length;
    return {
      edition: licenseInfo.effectiveEdition,
      licenseStatus: licenseInfo.status,
      isActive: licenseInfo.isActive,
      isExpired: licenseInfo.isExpired,
      totalCount: rows.length,
      enabledCount,
      rows,
    };
  }

  /**
   * 判断是否具备某个功能（供后端业务调用）
   */
  async hasFeature(featureKey = '') {
    const key = String(featureKey || '').trim();
    if (!key) return false;
    const { featureSet } = await this.resolveEffectiveFeatureSet();
    return featureSet.has(key);
  }
}

module.exports = LicenseCenterService;
