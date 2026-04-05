/**
 * @file service/uied/setting.js
 * @description UIED 站点设置服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;
const SETTING_BACKUP_VERSION = 'uied-setting-backup-v1';
const AUTH_CONFIG_SETTING_KEY = 'authConfig';

class SettingService extends Service {
  /**
   * 判断是否为可安全处理的普通对象
   */
  isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  /**
   * 规范化备份中的 settings，过滤非法键名
   */
  normalizeBackupSettings(settings) {
    if (!this.isPlainObject(settings)) return {};
    const result = {};
    for (const [ key, value ] of Object.entries(settings)) {
      const settingKey = String(key || '').trim();
      if (!settingKey) continue;
      if (settingKey.length > 120) continue;
      result[settingKey] = value;
    }
    return result;
  }

  /**
   * 获取注册/登录配置默认值
   */
  getDefaultAuthConfig() {
    return {
      enable_register: 1,
      enable_login: 1,
      enable_user_center: 1,
      register_close_message: '注册功能暂时关闭',
      login_close_message: '系统维护中，暂时无法登录',
      user_center_close_message: '个人中心功能暂时关闭',
    };
  }

  /**
   * 规范化注册/登录配置，确保字段和类型稳定
   */
  normalizeAuthConfig(config = {}) {
    const defaults = this.getDefaultAuthConfig();
    return {
      enable_register: config?.enable_register === 0 ? 0 : 1,
      enable_login: config?.enable_login === 0 ? 0 : 1,
      enable_user_center: config?.enable_user_center === 0 ? 0 : 1,
      register_close_message: String(
        config?.register_close_message || defaults.register_close_message
      ).trim() || defaults.register_close_message,
      login_close_message: String(
        config?.login_close_message || defaults.login_close_message
      ).trim() || defaults.login_close_message,
      user_center_close_message: String(
        config?.user_center_close_message || defaults.user_center_close_message
      ).trim() || defaults.user_center_close_message,
    };
  }

  /**
   * 获取 uied_site_setting 字段集合（兼容历史列式结构）
   */
  async getSiteSettingColumns() {
    if (this._siteSettingColumns) {
      return this._siteSettingColumns;
    }
    const { app } = this;
    try {
      const rows = await app.model.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'uied_site_setting'`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      this._siteSettingColumns = new Set(
        (Array.isArray(rows) ? rows : []).map(item => String(item?.COLUMN_NAME || '').trim())
      );
      return this._siteSettingColumns;
    } catch (error) {
      this.ctx.logger.warn('[setting] 读取 uied_site_setting 字段失败，按 key-value 结构处理:', error.message);
      this._siteSettingColumns = new Set([ 'key', 'value', 'create_time', 'update_time' ]);
      return this._siteSettingColumns;
    }
  }

  /**
   * 判断是否存在历史列式 auth 配置字段
   */
  async hasLegacyAuthColumns() {
    const columns = await this.getSiteSettingColumns();
    return columns.has('enable_register')
      && columns.has('enable_login')
      && columns.has('register_close_message')
      && columns.has('login_close_message');
  }

  /**
   * 导出后台设置备份
   */
  async exportBackup() {
    const settings = await this.getAll();
    const siteInfo = await this.getSiteInfo();
    const authConfig = await this.getAuthConfig();
    return {
      version: SETTING_BACKUP_VERSION,
      source: 'uied-admin-setting',
      exportedAt: Date.now(),
      settings,
      siteInfo: siteInfo || {},
      authConfig: authConfig || {},
    };
  }

  /**
   * 导入后台设置备份
   */
  async importBackup(payload = {}, options = {}) {
    if (!this.isPlainObject(payload)) {
      throw new Error('备份数据格式错误，必须是 JSON 对象');
    }
    const normalizedSettings = this.normalizeBackupSettings(payload.settings || {});
    const applySiteInfo = options.applySiteInfo !== false;
    const applyAuthConfig = options.applyAuthConfig !== false;
    const siteInfo = this.isPlainObject(payload.siteInfo) ? payload.siteInfo : null;
    const authConfig = this.isPlainObject(payload.authConfig) ? payload.authConfig : null;
    const settingKeys = Object.keys(normalizedSettings);

    if (!settingKeys.length && !siteInfo && !authConfig) {
      throw new Error('备份中没有可导入的配置项');
    }

    if (settingKeys.length) {
      await this.save(normalizedSettings);
    }
    if (applySiteInfo && siteInfo && Object.keys(siteInfo).length) {
      await this.saveSiteInfo(siteInfo);
    }
    if (applyAuthConfig && authConfig && Object.keys(authConfig).length) {
      await this.updateAuthConfig(authConfig);
    }

    return {
      version: String(payload.version || ''),
      importedSettingsCount: settingKeys.length,
      importedSettingKeys: settingKeys,
      importedSiteInfo: Boolean(applySiteInfo && siteInfo && Object.keys(siteInfo).length),
      importedAuthConfig: Boolean(applyAuthConfig && authConfig && Object.keys(authConfig).length),
    };
  }

  /**
   * 获取站点信息表字段映射（兼容不同版本字段命名）
   */
  async getSiteInfoFieldMapping() {
    if (this._siteInfoFieldMapping) {
      return this._siteInfoFieldMapping;
    }
    const { app } = this;
    let columns = [];
    try {
      columns = await app.model.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'uied_site_info'`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
    } catch (error) {
      this.ctx.logger.warn('[setting] 读取 uied_site_info 字段失败，使用默认兼容映射:', error.message);
      columns = [];
    }
    const has = new Set((Array.isArray(columns) ? columns : []).map(item => String(item?.COLUMN_NAME || '')));
    this._siteInfoFieldMapping = {
      descriptionField: has.has('site_description') ? 'site_description' : (has.has('description') ? 'description' : ''),
      keywordsField: has.has('site_keywords') ? 'site_keywords' : (has.has('keywords') ? 'keywords' : ''),
      contactEmailField: has.has('contact_email') ? 'contact_email' : '',
      analyticsCodeField: has.has('analytics_code') ? 'analytics_code' : '',
    };
    return this._siteInfoFieldMapping;
  }

  /**
   * 获取默认导航切换项配置
   */
  getDefaultNavSwitchItems() {
    return [
      { slug: 'uiux', name: 'UI导航', icon: 'Figma', visible: true, sort: 10 },
      { slug: 'ai', name: 'AI导航', icon: 'AI', visible: true, sort: 20 },
      { slug: 'design', name: '平面导航', icon: 'Design', visible: true, sort: 30 },
      { slug: '3d', name: '三维导航', icon: '3D', visible: true, sort: 40 },
      { slug: 'ecommerce', name: '电商导航', icon: 'Ecommerce', visible: true, sort: 50 },
      { slug: 'interior', name: '室内导航', icon: 'Design', visible: true, sort: 60 },
      { slug: 'font', name: '字体导航', icon: 'Font', visible: true, sort: 70 },
    ];
  }

  /**
   * 规范化导航切换项，确保前端有稳定的显示/排序结构
   */
  normalizeNavSwitchItems(items) {
    const defaults = this.getDefaultNavSwitchItems();
    const list = Array.isArray(items) && items.length > 0 ? items : defaults;
    return list
      .map((item, index) => {
        const fallback = defaults[index] || defaults[0];
        return {
          slug: String(item?.slug || fallback.slug),
          name: String(item?.name || fallback.name),
          icon: String(item?.icon || fallback.icon),
          visible: item?.visible !== false,
          sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        };
      })
      .sort((a, b) => a.sort - b.sort);
  }

  /**
   * 规范化首页配置
   * 新增：轮播区/推荐区显示与排序、导航切换项后台化配置
   */
  normalizeHomepageConfig(config = {}) {
    /**
     * 规范化“每日上新”入口显示位置，限制为受控枚举并去重。
     */
    const normalizeDailyNewPlacements = value => {
      const allowSet = new Set([ 'nav_quick_entry', 'home_menu', 'footer_link' ]);
      const rawList = Array.isArray(value)
        ? value
        : String(value || '').split(/[\n,]/);
      const normalized = rawList
        .map(item => String(item || '').trim())
        .filter(item => allowSet.has(item));
      return Array.from(new Set(normalized));
    };

    /**
     * 规范化“每日上新”入口路径，确保前导斜杠且支持外链。
     */
    const normalizeDailyNewPath = (value, fallback) => {
      const text = String(value || '').trim();
      if (!text) return fallback;
      if (text === '/p/daily-new' || text === '/daily-new') return '/p/hot?tab=daily-new';
      if (/^(https?:)?\/\//i.test(text)) return text;
      return text.startsWith('/') ? text : `/${text}`;
    };

    const defaults = {
      homePageSlug: '',
      heroBannerEnabled: true,
      heroBgType: 'default',
      heroBgValue: '',
      heroDisplayMode: 'search',
      heroIconClickMode: 'direct',
      heroShowStats: true,
      heroShowHotTags: true,
      bannerCardsEnabled: true,
      hotRecommendationsEnabled: true,
      hotRecommendationsTitle: '热门推荐',
      topAdEnabled: false,
      topAdCode: '',
      homeCarouselEnabled: true,
      homeCarouselSort: 10,
      homeRecommendationEnabled: true,
      homeRecommendationSort: 20,
      navSwitchItems: this.getDefaultNavSwitchItems(),
      dailyNewEnabled: true,
      dailyNewDisplayLabel: '每日上新',
      dailyNewDisplayPath: '/p/hot?tab=daily-new',
      dailyNewDisplayPlacements: [ 'nav_quick_entry' ],
      dailyNewDisplaySort: 86,
      dailyNewDisplayOpenInNewTab: false,
      dailyNewDefaultDays: 7,
      dailyNewPageKicker: 'Daily Fresh',
      dailyNewPageTitle: '每日上新网址',
      dailyNewPageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
    };
    const merged = { ...defaults, ...(config || {}) };
    /**
     * 规范化 Hero 图标墙点击模式，仅允许 direct/detail 两种受控值。
     */
    const normalizeHeroIconClickMode = value => {
      return String(value || '').trim() === 'detail' ? 'detail' : 'direct';
    };
    const dailyNewPlacements = normalizeDailyNewPlacements(merged.dailyNewDisplayPlacements);
    /**
     * 规范化“每日上新”页面文案，避免空值或异常字符串导致前端展示错乱。
     */
    const normalizeDailyNewPageText = (value, fallback) => {
      const text = String(value || '').trim();
      return text || fallback;
    };
    return {
      ...merged,
      homePageSlug: String(merged.homePageSlug || '').trim(),
      heroIconClickMode: normalizeHeroIconClickMode(merged.heroIconClickMode),
      homeCarouselEnabled: merged.homeCarouselEnabled !== false,
      homeRecommendationEnabled: merged.homeRecommendationEnabled !== false,
      homeCarouselSort: Number.isFinite(Number(merged.homeCarouselSort)) ? Number(merged.homeCarouselSort) : 10,
      homeRecommendationSort: Number.isFinite(Number(merged.homeRecommendationSort)) ? Number(merged.homeRecommendationSort) : 20,
      navSwitchItems: this.normalizeNavSwitchItems(merged.navSwitchItems),
      dailyNewEnabled: merged.dailyNewEnabled !== false,
      dailyNewDisplayLabel: String(merged.dailyNewDisplayLabel || defaults.dailyNewDisplayLabel).trim() || defaults.dailyNewDisplayLabel,
      dailyNewDisplayPath: normalizeDailyNewPath(merged.dailyNewDisplayPath, defaults.dailyNewDisplayPath),
      dailyNewDisplayPlacements: dailyNewPlacements.length > 0 ? dailyNewPlacements : defaults.dailyNewDisplayPlacements,
      dailyNewDisplaySort: Number.isFinite(Number(merged.dailyNewDisplaySort))
        ? Math.max(1, Math.min(9999, Number(merged.dailyNewDisplaySort)))
        : defaults.dailyNewDisplaySort,
      dailyNewDisplayOpenInNewTab: merged.dailyNewDisplayOpenInNewTab === true,
      dailyNewDefaultDays: Number.isFinite(Number(merged.dailyNewDefaultDays))
        ? Math.max(1, Math.min(30, Number(merged.dailyNewDefaultDays)))
        : defaults.dailyNewDefaultDays,
      dailyNewPageKicker: normalizeDailyNewPageText(merged.dailyNewPageKicker, defaults.dailyNewPageKicker),
      dailyNewPageTitle: normalizeDailyNewPageText(merged.dailyNewPageTitle, defaults.dailyNewPageTitle),
      dailyNewPageDescription: normalizeDailyNewPageText(
        merged.dailyNewPageDescription,
        defaults.dailyNewPageDescription
      ),
    };
  }

  /**
   * 规范化“热门文章 Hot”配置
   * 统一入口展示、页面文案、WordPress 拉取参数与筛选预设结构。
   * @param {Record<string, any>} config 原始配置
   * @return {Record<string, any>} 规范化后的配置
   */
  normalizeHotArticlesConfig(config = {}) {
    /**
     * 预设来源于 hot 项目默认分类配置，便于直接迁移现有运营策略。
     */
    const defaultFilterPresets = [
      { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
      { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
      { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
      { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
      { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
    ];
    const defaultWorkbenchMenuItems = [
      {
        key: 'latest-articles',
        label: '最新文章',
        mode: 'latest',
        iconKey: 'latest',
        source: 'uied_latest',
        orderBy: 'date',
        order: 'desc',
        period: 'all',
        categoryId: 0,
        tagId: 0,
        enabled: true,
        sort: 10,
      },
      {
        key: 'hot-articles',
        label: '热门文章',
        mode: 'hot',
        iconKey: 'hot',
        source: 'uied_hot',
        orderBy: 'views',
        order: 'desc',
        period: 'all',
        categoryId: 417,
        tagId: 0,
        enabled: true,
        sort: 20,
      },
      {
        key: 'ai-realtime',
        label: 'AI实时文章',
        mode: 'preset',
        iconKey: 'ai',
        source: 'uied_latest',
        presetKey: 'aigc',
        presetKeys: [ 'all', 'aigc', 'nano-banana', 'midjourney', 'stable-diffusion', 'deepseek', 'jimeng', 'gpt4o', 'gpt' ],
        fallbackType: 'category',
        fallbackId: 417,
        enabled: true,
        sort: 30,
      },
      {
        key: 'ai-products',
        label: 'AI产品榜单',
        mode: 'preset',
        iconKey: 'product',
        source: 'uied_latest',
        presetKey: 'ai-tools',
        presetKeys: [ 'all', 'ai-tools', 'aixiezuo', 'aihuihua', 'aishipin', 'aibangong', 'aisheji', 'aikaifa', 'aishuziren' ],
        fallbackType: 'category',
        fallbackId: 3351,
        enabled: true,
        sort: 40,
      },
      {
        key: 'design-articles',
        label: '设计文章',
        mode: 'preset',
        iconKey: 'design',
        source: 'uied_latest',
        presetKey: 'design',
        presetKeys: [ 'all', 'design', 'ui', 'ux', 'product', 'graphic', '3d', 'tips', 'inspiration' ],
        fallbackType: 'category',
        fallbackId: 307,
        enabled: true,
        sort: 50,
      },
      {
        key: 'design-resources',
        label: '设计素材',
        mode: 'preset',
        iconKey: 'resource',
        source: 'uied_latest',
        presetKey: 'all-resources',
        presetKeys: [ 'all', 'all-resources', 'portfolio', 'card', 'big-data', 'dashboard', 'icon', 'ar', 'app', 'watch', 'web', 'design-system', '3d-icon', 'font-resource', 'font', 'ps-plugin', 'sketch-plugin', 'mockup' ],
        fallbackType: 'category',
        fallbackId: 4,
        enabled: true,
        sort: 60,
      },
      {
        key: 'top-authors',
        label: '优秀作者',
        mode: 'authorHot',
        iconKey: 'author',
        source: 'uied_hot',
        orderBy: 'comment_count',
        order: 'desc',
        period: 'weekly',
        categoryId: 0,
        tagId: 0,
        enabled: true,
        sort: 70,
      },
      {
        key: 'study-circles',
        label: '学习圈子',
        mode: 'circle',
        iconKey: 'circle',
        source: 'uied_latest',
        orderBy: 'date',
        order: 'desc',
        period: 'all',
        categoryId: 0,
        tagId: 393,
        enabled: true,
        sort: 80,
      },
      {
        key: 'back-main-site',
        label: '返回主站',
        mode: 'external',
        iconKey: 'home',
        source: 'auto',
        externalUrl: 'https://www.uied.cn',
        enabled: true,
        sort: 999,
      },
    ];

    const defaults = {
      enabled: true,
      displayPlacements: [ 'nav_quick_entry', 'home_menu' ],
      displayLabel: '热门文章',
      displayPath: '/p/hot',
      displaySort: 84,
      displayOpenInNewTab: false,
      pageKicker: 'HOT ARTICLES',
      pageTitle: '热门文章',
      pageDescription: '同步 uied.cn 的优质文章内容，快速发现值得阅读的设计与产品洞察。',
      pageSize: 24,
      defaultOrderBy: 'date',
      defaultOrder: 'desc',
      defaultCategoryId: 417,
      defaultTagId: 0,
      apiSourceMode: 'auto',
      motionEnabled: true,
      heroTagline: '聚合国内外AI精选内容，探索AI技术前沿与应用',
      hubHeaderKicker: 'CONTENT HUB',
      hubHeaderTitle: '内容中心',
      hubHeaderDescription: '热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。',
      linksNewWindow: true,
      filterPresets: defaultFilterPresets,
      workbenchMenuItems: defaultWorkbenchMenuItems,
    };
    const merged = { ...defaults, ...(config || {}) };

    /**
     * 规范化入口路径，支持相对路径和外链。
     */
    const normalizePath = value => {
      const text = String(value || '').trim();
      if (!text) return defaults.displayPath;
      if (/^(https?:)?\/\//i.test(text)) return text;
      return text.startsWith('/') ? text : `/${text}`;
    };

    /**
     * 规范化入口展示位置并去重。
     */
    const normalizePlacements = value => {
      const allowSet = new Set([ 'nav_quick_entry', 'home_menu', 'footer_link' ]);
      const rows = Array.isArray(value) ? value : [];
      const list = rows
        .map(item => String(item || '').trim())
        .filter(item => allowSet.has(item));
      return list.length > 0 ? Array.from(new Set(list)) : defaults.displayPlacements;
    };

    /**
     * 规范化筛选项配置，确保 key/type/id/sort 稳定可排序。
     */
    const normalizeFilterPresets = value => {
      const sourceRows = Array.isArray(value) ? value : defaultFilterPresets;
      const usedKeySet = new Set();
      const rows = sourceRows
        .map((item, index) => {
          const rawKey = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
          const key = rawKey || `preset_${index + 1}`;
          if (usedKeySet.has(key)) return null;
          usedKeySet.add(key);
          const type = String(item?.type || 'category').trim().toLowerCase();
          const normalizedType = [ 'all', 'category', 'tag' ].includes(type) ? type : 'category';
          const id = Number.parseInt(String(item?.id || 0), 10);
          return {
            key,
            name: String(item?.name || key).trim() || key,
            type: normalizedType,
            id: Number.isInteger(id) && id > 0 ? id : 0,
            description: String(item?.description || '').trim(),
            enabled: item?.enabled !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
          };
        })
        .filter(Boolean);

      if (!rows.length) {
        return defaultFilterPresets.map(item => ({ ...item }));
      }
      return rows
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({
          ...item,
          sort: (index + 1) * 10,
        }));
    };

    /**
     * 限定排序字段，避免写入非法 orderBy 值导致接口报错。
     */
    const normalizeOrderBy = value => {
      const allowSet = new Set([ 'date', 'modified', 'id', 'title', 'slug', 'relevance', 'views', 'comment_count' ]);
      const text = String(value || '').trim().toLowerCase();
      return allowSet.has(text) ? text : defaults.defaultOrderBy;
    };

    /**
     * 统一排序方向，只允许 asc/desc。
     */
    const normalizeOrder = value => {
      const text = String(value || '').trim().toLowerCase();
      return text === 'asc' ? 'asc' : 'desc';
    };
    /**
     * 统一 API 来源模式，支持自动/自定义接口/wp-v2。
     */
    const normalizeSource = value => {
      const text = String(value || '').trim().toLowerCase();
      const allowSet = new Set([ 'auto', 'uied', 'uied_hot', 'uied_latest', 'wp_v2' ]);
      return allowSet.has(text) ? text : 'auto';
    };
    /**
     * 统一热榜周期字段。
     */
    const normalizePeriod = value => {
      const text = String(value || '').trim().toLowerCase();
      const allowSet = new Set([ 'all', 'daily', 'weekly', 'monthly' ]);
      return allowSet.has(text) ? text : 'all';
    };
    /**
     * 统一菜单图标键，兼容 hot 旧项目的图标命名。
     */
    const normalizeMenuIconKey = value => {
      const text = String(value || '').trim();
      const lower = text.toLowerCase();
      const allowSet = new Set([ 'latest', 'hot', 'ai', 'product', 'design', 'resource', 'author', 'circle', 'extra', 'home' ]);
      if (allowSet.has(text)) return text;
      if (allowSet.has(lower)) return lower;
      const aliasMap = {
        file: 'latest',
        'file-text': 'latest',
        filetext: 'latest',
        filetextoutlined: 'latest',
        star: 'hot',
        staroutlined: 'hot',
        robot: 'ai',
        robotoutlined: 'ai',
        trophy: 'product',
        trophyoutlined: 'product',
        desktop: 'design',
        desktopoutlined: 'design',
        appstore: 'resource',
        appstoreoutlined: 'resource',
        crown: 'author',
        crownoutlined: 'author',
        read: 'circle',
        readoutlined: 'circle',
        book: 'circle',
        home: 'home',
        homeoutlined: 'home',
      };
      return aliasMap[lower] || 'extra';
    };
    /**
     * 规范化工作台菜单，保证 key 唯一、模式和查询字段可控。
     */
    const normalizeWorkbenchMenuItems = (value, filterPresets = []) => {
      const rows = Array.isArray(value) ? value : defaultWorkbenchMenuItems;
      const allowModeSet = new Set([ 'latest', 'hot', 'preset', 'authorHot', 'circle', 'external' ]);
      const allowFallbackTypeSet = new Set([ 'category', 'tag' ]);
      const validPresetKeys = new Set(
        (Array.isArray(filterPresets) ? filterPresets : [])
          .map(item => String(item?.key || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const usedKeySet = new Set();
      const normalizedRows = rows
        .map((item, index) => {
          const key = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `menu_${index + 1}`;
          if (usedKeySet.has(key)) return null;
          usedKeySet.add(key);
          const mode = allowModeSet.has(String(item?.mode || '').trim()) ? String(item?.mode).trim() : 'latest';
          const iconKey = normalizeMenuIconKey(item?.iconKey);
          const categoryId = Number.parseInt(String(item?.categoryId || 0), 10);
          const tagId = Number.parseInt(String(item?.tagId || 0), 10);
          const fallbackId = Number.parseInt(String(item?.fallbackId || 0), 10);
          const fallbackType = allowFallbackTypeSet.has(String(item?.fallbackType || '').trim())
            ? String(item?.fallbackType).trim()
            : 'category';
          const externalUrlRaw = String(item?.externalUrl || '').trim();
          const presetKey = String(item?.presetKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
          /**
           * 菜单级筛选项白名单：支持数组、逗号字符串，且自动兼容 presetKey。
           */
          const presetKeysRaw = Array.isArray(item?.presetKeys)
            ? item.presetKeys
            : String(item?.presetKeys || '')
              .split(',')
              .map(keyText => String(keyText || '').trim())
              .filter(Boolean);
          const presetKeys = Array.from(new Set([
            ...presetKeysRaw,
            presetKey,
          ]
            .map(keyText => String(keyText || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
            .filter(Boolean)
            .filter(keyText => validPresetKeys.size === 0 || validPresetKeys.has(keyText))));
          return {
            key,
            label: String(item?.label || key).trim() || key,
            mode,
            iconKey,
            source: normalizeSource(item?.source),
            presetKey,
            presetKeys,
            fallbackType,
            fallbackId: Number.isInteger(fallbackId) && fallbackId > 0 ? fallbackId : 0,
            categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : 0,
            tagId: Number.isInteger(tagId) && tagId > 0 ? tagId : 0,
            orderBy: normalizeOrderBy(item?.orderBy),
            order: normalizeOrder(item?.order),
            period: normalizePeriod(item?.period),
            externalUrl: mode === 'external'
              ? (externalUrlRaw || 'https://www.uied.cn')
              : '',
            subtitle: String(item?.subtitle || '').trim(),
            enabled: item?.enabled !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
          };
        })
        .filter(Boolean);
      if (!normalizedRows.length) {
        return defaultWorkbenchMenuItems.map(item => ({ ...item }));
      }
      return normalizedRows
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({
          ...item,
          sort: (index + 1) * 10,
        }));
    };

    const defaultCategoryId = Number.parseInt(String(merged.defaultCategoryId || 0), 10);
    const defaultTagId = Number.parseInt(String(merged.defaultTagId || 0), 10);
    const normalizedFilterPresets = normalizeFilterPresets(merged.filterPresets);

    return {
      ...merged,
      enabled: merged.enabled !== false,
      displayPlacements: normalizePlacements(merged.displayPlacements),
      displayLabel: String(merged.displayLabel || defaults.displayLabel).trim() || defaults.displayLabel,
      displayPath: normalizePath(merged.displayPath),
      displaySort: Number.isFinite(Number(merged.displaySort))
        ? Math.max(1, Math.min(9999, Number(merged.displaySort)))
        : defaults.displaySort,
      displayOpenInNewTab: merged.displayOpenInNewTab === true,
      pageKicker: String(merged.pageKicker || defaults.pageKicker).trim() || defaults.pageKicker,
      pageTitle: String(merged.pageTitle || defaults.pageTitle).trim() || defaults.pageTitle,
      pageDescription: String(merged.pageDescription || defaults.pageDescription).trim() || defaults.pageDescription,
      pageSize: Number.isFinite(Number(merged.pageSize))
        ? Math.max(1, Math.min(100, Number(merged.pageSize)))
        : defaults.pageSize,
      defaultOrderBy: normalizeOrderBy(merged.defaultOrderBy),
      defaultOrder: normalizeOrder(merged.defaultOrder),
      defaultCategoryId: Number.isInteger(defaultCategoryId) && defaultCategoryId > 0 ? defaultCategoryId : 0,
      defaultTagId: Number.isInteger(defaultTagId) && defaultTagId > 0 ? defaultTagId : 0,
      apiSourceMode: normalizeSource(merged.apiSourceMode),
      motionEnabled: merged.motionEnabled !== false,
      heroTagline: String(merged.heroTagline || defaults.heroTagline).trim() || defaults.heroTagline,
      hubHeaderKicker: String(merged.hubHeaderKicker || defaults.hubHeaderKicker).trim() || defaults.hubHeaderKicker,
      hubHeaderTitle: String(merged.hubHeaderTitle || defaults.hubHeaderTitle).trim() || defaults.hubHeaderTitle,
      hubHeaderDescription: String(merged.hubHeaderDescription || defaults.hubHeaderDescription).trim() || defaults.hubHeaderDescription,
      linksNewWindow: merged.linksNewWindow !== false,
      filterPresets: normalizedFilterPresets,
      workbenchMenuItems: normalizeWorkbenchMenuItems(merged.workbenchMenuItems, normalizedFilterPresets),
    };
  }

  /**
   * 规范化分类区域点击模式
   * 兼容历史值：directExternal -> direct
   */
  normalizeWebsiteClickMode(mode) {
    if (mode === 'direct' || mode === 'directExternal') {
      return 'direct';
    }
    return 'detail';
  }

  /**
   * 规范化热门推荐点击模式
   * 兼容历史值：modal -> detail
   */
  normalizeHotRecommendationClickMode(mode) {
    if (mode === 'direct') {
      return 'direct';
    }
    return 'detail';
  }

  /**
   * 清洗 SVG 字符串，避免后台注入脚本。
   * @param {unknown} value SVG 原始字符串
   * @return {string} 清洗后的 SVG
   */
  sanitizeSvgMarkup(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    let sanitized = raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
      .replace(/javascript:/gi, '');
    sanitized = sanitized.trim();
    if (!sanitized.toLowerCase().startsWith('<svg')) return '';
    return sanitized;
  }

  /**
   * 规范化分类 SVG 图标库。
   * 支持数组、对象和 JSON 字符串三种输入格式。
   * @param {unknown} value 图标库原始值
   * @return {Array<{key:string,label:string,svg:string}>} 规范化后的图标库
   */
  normalizeCategorySvgLibrary(value) {
    let source = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch (_error) {
        source = [];
      }
    }
    const rows = Array.isArray(source)
      ? source
      : (source && typeof source === 'object'
        ? Object.keys(source).map(key => ({ key, svg: source[key] }))
        : []);
    return rows
      .map((item, index) => {
        const key = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
        if (!key) return null;
        const svg = this.sanitizeSvgMarkup(item?.svg);
        if (!svg) return null;
        const label = String(item?.label || key).trim().slice(0, 40) || key;
        const sort = Number.isFinite(Number(item?.sort)) ? Number(item.sort) : index + 1;
        return { key, label, svg, sort };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort)
      .map(({ key, label, svg }) => ({ key, label, svg }));
  }

  /**
   * 规范化页面全局配置，确保分类与热门推荐为独立且统一语义
   */
  normalizePageGlobalConfig(config = {}) {
    const normalized = { ...config };
    normalized.websiteClickMode = this.normalizeWebsiteClickMode(config.websiteClickMode);
    normalized.hotRecommendationClickMode = this.normalizeHotRecommendationClickMode(config.hotRecommendationClickMode);
    normalized.viewMoreNewWindow = config.viewMoreNewWindow === true;
    normalized.appendRefEnabled = config.appendRefEnabled === true;
    normalized.appendRefValue = String(config.appendRefValue || '').trim();
    /**
     * 排序值为 0 的站点默认按“最新优先”排序，可由后台页面配置开关控制。
     */
    normalized.sortZeroNewFirstEnabled = config.sortZeroNewFirstEnabled === true;
    normalized.categoryPaginationThreshold = Number.isFinite(Number(config.categoryPaginationThreshold))
      ? Math.max(24, Math.min(2000, Number(config.categoryPaginationThreshold)))
      : 120;
    normalized.categoryPaginationPageSize = Number.isFinite(Number(config.categoryPaginationPageSize))
      ? Math.max(8, Math.min(120, Number(config.categoryPaginationPageSize)))
      : 24;
    normalized.categorySvgLibrary = this.normalizeCategorySvgLibrary(config.categorySvgLibrary);
    return normalized;
  }

  /**
   * 获取评论审核配置默认值
   */
  getDefaultCommentConfig() {
    return {
      loginRequired: false,
      autoAuditMode: 'off', // off | manual | smart
      enableTextDetection: true,
      autoRejectSensitive: true,
      sensitiveWords: '',
      autoPendingSuspicious: true,
      suspiciousWords: '',
      minLength: 2,
      maxLinkCount: 2,
      duplicateCheckEnabled: true,
      duplicateWindowSec: 300,
      duplicateThreshold: 2,
    };
  }

  /**
   * 规范化评论审核配置，确保自动审核参数范围稳定
   */
  normalizeCommentConfig(config = {}) {
    const defaults = this.getDefaultCommentConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = { ...defaults, ...source };
    const mode = String(merged.autoAuditMode || '').trim().toLowerCase();
    return {
      loginRequired: merged.loginRequired === true,
      autoAuditMode: [ 'off', 'manual', 'smart' ].includes(mode) ? mode : defaults.autoAuditMode,
      enableTextDetection: merged.enableTextDetection !== false,
      autoRejectSensitive: merged.autoRejectSensitive !== false,
      sensitiveWords: String(merged.sensitiveWords || '').trim().slice(0, 2000),
      autoPendingSuspicious: merged.autoPendingSuspicious !== false,
      suspiciousWords: String(merged.suspiciousWords || '').trim().slice(0, 2000),
      minLength: Number.isFinite(Number(merged.minLength))
        ? Math.max(0, Math.min(500, Number(merged.minLength)))
        : defaults.minLength,
      maxLinkCount: Number.isFinite(Number(merged.maxLinkCount))
        ? Math.max(0, Math.min(50, Number(merged.maxLinkCount)))
        : defaults.maxLinkCount,
      duplicateCheckEnabled: merged.duplicateCheckEnabled !== false,
      duplicateWindowSec: Number.isFinite(Number(merged.duplicateWindowSec))
        ? Math.max(10, Math.min(86400, Number(merged.duplicateWindowSec)))
        : defaults.duplicateWindowSec,
      duplicateThreshold: Number.isFinite(Number(merged.duplicateThreshold))
        ? Math.max(2, Math.min(100, Number(merged.duplicateThreshold)))
        : defaults.duplicateThreshold,
    };
  }

  /**
   * 规范化跳转弹窗配置，确保商业版协议文案可后台配置
   */
  normalizeExitModalConfig(config = {}) {
    const defaults = {
      enabled: true,
      title: '即将离开本站',
      description: '您即将访问外部网站，请注意安全',
      autoRedirect: true,
      countdown: 5,
      logo: '',
      showAgreementLinks: false,
      userAgreementText: '用户协议',
      userAgreementUrl: '',
      copyrightAgreementText: '版权协议',
      copyrightAgreementUrl: '',
    };
    const merged = { ...defaults, ...(config || {}) };
    return {
      ...merged,
      enabled: merged.enabled !== false,
      autoRedirect: merged.autoRedirect !== false,
      countdown: Number.isFinite(Number(merged.countdown))
        ? Math.max(1, Math.min(30, Number(merged.countdown)))
        : defaults.countdown,
      logo: String(merged.logo || ''),
      showAgreementLinks: merged.showAgreementLinks === true,
      userAgreementText: String(merged.userAgreementText || defaults.userAgreementText),
      userAgreementUrl: String(merged.userAgreementUrl || ''),
      copyrightAgreementText: String(merged.copyrightAgreementText || defaults.copyrightAgreementText),
      copyrightAgreementUrl: String(merged.copyrightAgreementUrl || ''),
    };
  }

  /**
   * 规范化搜索配置，确保站内搜索/AI 搜索可独立开关并保持参数范围稳定
   */
  normalizeSearchConfig(config = {}) {
    const defaults = {
      enabled: true,
      placeholder: '搜索网站名称...',
      debounceDelay: 300,
      websiteSearchEnabled: true,
      articleSearchEnabled: true,
      aiSearchEnabled: true,
      aiSearchBtnText: 'AI 搜索',
      heroTitle: '全站搜索',
      heroDescriptionTemplate: '收录 {count} 个优质网站资源',
      heroHighlightText: '',
      hotSearchTags: [ 'AI绘画', 'ChatGPT', 'Figma', '免费工具', 'UI设计', 'Midjourney', '字体', '图标库', 'SVG' ],
      searchDisabledText: '站内搜索功能已关闭',
      aiSearchDisabledText: 'AI 搜索功能已关闭，请在后台配置中开启后再使用。',
      aiResultSummaryTemplate: 'AI 智能推荐找到 {count} 个结果{extra}',
      aiKeywordResultSummaryTemplate: '关键词匹配找到 {count} 个结果',
      aiSemanticResultSummaryTemplate: 'AI 语义扩展已返回 {count} 个结果{extra}',
      aiNoResultText: 'AI 未找到相关结果，请尝试其他描述',
      aiFallbackErrorText: 'AI 搜索暂时不可用，请稍后重试',
      aiCacheSuffixText: '（缓存）',
      highlightKeyword: true,
      resultsPerPage: 20,
    };
    const merged = { ...defaults, ...(config || {}) };
    const searchEnabled = merged.enabled !== false;
    const websiteSearchEnabled = merged.websiteSearchEnabled !== false;
    const articleSearchEnabled = merged.articleSearchEnabled !== false;
    const contentSearchFallback = websiteSearchEnabled || articleSearchEnabled
      ? { website: websiteSearchEnabled, article: articleSearchEnabled }
      : { website: true, article: false };
    /**
     * 规范化搜索页 Hero 的热搜兜底词，兼容数组与多行字符串格式。
     */
    const normalizedHotSearchTags = (() => {
      const sourceList = Array.isArray(merged.hotSearchTags)
        ? merged.hotSearchTags
        : String(merged.hotSearchTags || '')
          .split(/[，,\n|]+/)
          .map(item => String(item || '').trim())
          .filter(Boolean);
      const normalized = Array.from(new Set(sourceList
        .map(item => String(item || '').trim().slice(0, 20))
        .filter(Boolean)));
      return normalized.length > 0 ? normalized.slice(0, 20) : defaults.hotSearchTags;
    })();
    return {
      ...merged,
      enabled: searchEnabled,
      placeholder: String(merged.placeholder || defaults.placeholder).trim() || defaults.placeholder,
      debounceDelay: Number.isFinite(Number(merged.debounceDelay))
        ? Math.max(100, Math.min(2000, Number(merged.debounceDelay)))
        : defaults.debounceDelay,
      websiteSearchEnabled: searchEnabled ? contentSearchFallback.website : false,
      articleSearchEnabled: searchEnabled ? contentSearchFallback.article : false,
      aiSearchEnabled: searchEnabled && merged.aiSearchEnabled !== false,
      aiSearchBtnText: String(merged.aiSearchBtnText || defaults.aiSearchBtnText).trim() || defaults.aiSearchBtnText,
      heroTitle: String(merged.heroTitle || defaults.heroTitle).trim() || defaults.heroTitle,
      heroDescriptionTemplate: String(
        merged.heroDescriptionTemplate || defaults.heroDescriptionTemplate
      ).trim() || defaults.heroDescriptionTemplate,
      heroHighlightText: String(merged.heroHighlightText || defaults.heroHighlightText).trim() || defaults.heroHighlightText,
      hotSearchTags: normalizedHotSearchTags,
      searchDisabledText: String(merged.searchDisabledText || defaults.searchDisabledText).trim() || defaults.searchDisabledText,
      aiSearchDisabledText: String(merged.aiSearchDisabledText || defaults.aiSearchDisabledText).trim() || defaults.aiSearchDisabledText,
      aiResultSummaryTemplate: String(merged.aiResultSummaryTemplate || defaults.aiResultSummaryTemplate).trim()
        || defaults.aiResultSummaryTemplate,
      aiKeywordResultSummaryTemplate: String(
        merged.aiKeywordResultSummaryTemplate || defaults.aiKeywordResultSummaryTemplate
      ).trim() || defaults.aiKeywordResultSummaryTemplate,
      aiSemanticResultSummaryTemplate: String(
        merged.aiSemanticResultSummaryTemplate || defaults.aiSemanticResultSummaryTemplate
      ).trim() || defaults.aiSemanticResultSummaryTemplate,
      aiNoResultText: String(merged.aiNoResultText || defaults.aiNoResultText).trim() || defaults.aiNoResultText,
      aiFallbackErrorText: String(merged.aiFallbackErrorText || defaults.aiFallbackErrorText).trim()
        || defaults.aiFallbackErrorText,
      aiCacheSuffixText: String(merged.aiCacheSuffixText || defaults.aiCacheSuffixText).trim() || defaults.aiCacheSuffixText,
      highlightKeyword: merged.highlightKeyword !== false,
      resultsPerPage: Number.isFinite(Number(merged.resultsPerPage))
        ? Math.max(10, Math.min(100, Number(merged.resultsPerPage)))
        : defaults.resultsPerPage,
    };
  }

  /**
   * 获取品牌与默认内容配置默认值。
   */
  getDefaultBrandConfig() {
    return {
      brandName: 'UIED导航系统',
      officialSiteUrl: 'https://fsuied.com',
      buyUrl: 'https://fsuied.com/products/10',
      supportUrl: 'https://fsuied.com',
      supportLabel: '前往官网咨询',
      supportQq: '403479454',
      supportQqGroup: '1082794860',
      installPageTitle: '安装向导',
      installPageDescription: '正式交付流程：先授权校验，再做数据库测试，最后初始化站点与管理员',
      installSiteName: 'UIED导航系统',
      installSiteTitle: 'UIED导航系统 - 高质量资源导航',
      installSiteDescription: '基于 UIED-NAV 构建的可运营网址导航系统。',
      installSiteKeywords: 'UIED,导航系统,网址导航,AI导航',
      installAdminNickname: '系统管理员',
      authLogoText: 'UIED',
      authLoginTitle: '欢迎回来',
      authLoginSubtitle: '登录以体验更多精彩功能',
      authRegisterTitle: '加入 UIED',
      authRegisterSubtitle: '开启您的设计探索之旅',
      notFoundTitle: '页面不存在或已迁移',
      notFoundDescription: '你访问的链接可能已经下线、改名或暂未开放。你可以返回首页，或直接进入常用入口继续浏览。',
      notFoundSeoTitle: '页面未找到',
      notFoundSeoDescription: '访问的页面不存在或已迁移，请返回首页继续浏览 UIED 导航。',
      notFoundSeoKeywords: '404,页面未找到,导航站',
      notFoundAutoRedirectSeconds: 10,
      notFoundQuickLinks: [
        { label: 'AI导航', to: '/ai', newWindow: false },
        { label: 'UI导航', to: '/uiux', newWindow: false },
        { label: '平面导航', to: '/design', newWindow: false },
        { label: 'MCP中心', to: '/mcp', newWindow: false },
        { label: 'Figma频道', to: '/figma', newWindow: false },
        { label: '热门内容', to: '/p/hot', newWindow: false },
      ],
      homeFallbackBannerCards: [],
      homeFallbackCarouselSlides: [],
      changelogAuthorName: 'Tomda',
      changelogAuthorUrl: 'https://tomda.top/',
      changelogAuthorDescription: '开发（AI协助）并记录 UIED-NAV 的开发历程和功能更新。公众号：Tomda',
      changelogBuyButtonText: '购买源码授权',
      changelogRepoLinks: [
        { name: 'GitHub 仓库', url: 'https://github.com/Tomccc520/UIED-NAV', iconKey: 'github' },
        { name: 'Gitee 仓库', url: 'https://gitee.com/tomdac/uied-nav', iconKey: 'gitee' },
        { name: 'CSDN 博客', url: 'https://blog.csdn.net/Tomdac?spm=1000.2115.3001.5343', iconKey: 'csdn' },
        { name: 'UIED技术团队', url: 'https://fsuied.com/', iconKey: 'uied' },
      ],
      changelogPlatformLinks: [
        { name: 'AI学习平台', url: 'https://www.uied.cn/' },
        { name: 'AI免费工具', url: 'https://uiedtool.com' },
        { name: 'AI资讯热榜', url: 'https://hot.uied.cn' },
        { name: 'AI工具导航', url: 'https://hao.uied.cn/ai' },
        { name: 'AI交流群', url: 'https://ai.feishu.cn/wiki/CUuaw5ooxiHAkckgtRkcn6rnnVQ?from=from_copylink' },
        { name: 'AI知识库', url: 'https://ai.feishu.cn/wiki/ZjddwTFpWivK6ukwBoDc5DoHnVt?from=from_copylink' },
      ],
    };
  }

  /**
   * 规范化品牌与默认内容配置，统一前台多处兜底内容的结构与字段。
   */
  normalizeBrandConfig(config = {}) {
    const defaults = this.getDefaultBrandConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = { ...defaults, ...source };
    const normalizeText = (value, fallback = '') => String(value || '').trim() || fallback;
    const normalizeUrl = (value, fallback = '') => String(value || '').trim() || fallback;
    const normalizeBoolean = value => value === true;
    /**
     * 规范化 404 快捷入口数组，兼容历史缺失字段并回退默认项。
     */
    const normalizeQuickLinks = value => {
      if (Array.isArray(value) && value.length === 0) return [];
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const current = this.isPlainObject(item) ? item : {};
          const fallback = defaults.notFoundQuickLinks[index % defaults.notFoundQuickLinks.length] || {};
          const label = normalizeText(current.label, fallback.label || '');
          const to = normalizeUrl(current.to, fallback.to || '');
          if (!label || !to) return null;
          return {
            label,
            to,
            newWindow: normalizeBoolean(current.newWindow),
          };
        })
        .filter(Boolean);
      return normalized.length > 0 ? normalized : defaults.notFoundQuickLinks;
    };
    /**
     * 规范化首页 Banner 兜底卡片，未配置时返回空数组，避免继续暴露演示内容。
     */
    const normalizeBannerCards = value => {
      const rawList = Array.isArray(value) ? value : [];
      return rawList
        .map((item, index) => {
          const current = this.isPlainObject(item) ? item : {};
          const title = normalizeText(current.title);
          const link = normalizeUrl(current.link);
          if (!title || !link) return null;
          return {
            id: normalizeText(current.id, `brand-banner-${index + 1}`),
            title,
            description: normalizeText(current.description),
            link,
            badge: normalizeText(current.badge),
            color: normalizeText(current.color, index % 2 === 0 ? '#2563eb' : '#0f766e'),
            newWindow: current.newWindow !== false,
          };
        })
        .filter(Boolean);
    };
    /**
     * 规范化首页轮播兜底内容，未配置时返回空数组，避免继续暴露演示素材。
     */
    const normalizeCarouselSlides = value => {
      const rawList = Array.isArray(value) ? value : [];
      return rawList
        .map((item, index) => {
          const current = this.isPlainObject(item) ? item : {};
          const title = normalizeText(current.title);
          const image = normalizeText(current.image);
          const link = normalizeUrl(current.link);
          if (!title || !image || !link) return null;
          return {
            id: normalizeText(current.id, `brand-carousel-${index + 1}`),
            title,
            subtitle: normalizeText(current.subtitle),
            image,
            link,
            newWindow: current.newWindow !== false,
          };
        })
        .filter(Boolean);
    };
    /**
     * 规范化更新记录页仓库链接，仅允许受控 iconKey 枚举。
     */
    const normalizeRepoLinks = value => {
      if (Array.isArray(value) && value.length === 0) return [];
      const allowIconKeys = new Set([ 'github', 'gitee', 'csdn', 'uied' ]);
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const current = this.isPlainObject(item) ? item : {};
          const fallback = defaults.changelogRepoLinks[index % defaults.changelogRepoLinks.length] || {};
          const name = normalizeText(current.name, fallback.name || '');
          const url = normalizeUrl(current.url, fallback.url || '');
          if (!name || !url) return null;
          const iconKey = normalizeText(current.iconKey, fallback.iconKey || 'github');
          return {
            name,
            url,
            iconKey: allowIconKeys.has(iconKey) ? iconKey : 'github',
          };
        })
        .filter(Boolean);
      return normalized.length > 0 ? normalized : defaults.changelogRepoLinks;
    };
    /**
     * 规范化更新记录页平台链接，空值时回退默认链接组。
     */
    const normalizePlatformLinks = value => {
      if (Array.isArray(value) && value.length === 0) return [];
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const current = this.isPlainObject(item) ? item : {};
          const fallback = defaults.changelogPlatformLinks[index % defaults.changelogPlatformLinks.length] || {};
          const name = normalizeText(current.name, fallback.name || '');
          const url = normalizeUrl(current.url, fallback.url || '');
          if (!name || !url) return null;
          return { name, url };
        })
        .filter(Boolean);
      return normalized.length > 0 ? normalized : defaults.changelogPlatformLinks;
    };

    return {
      brandName: normalizeText(merged.brandName, defaults.brandName),
      officialSiteUrl: normalizeUrl(merged.officialSiteUrl, defaults.officialSiteUrl),
      buyUrl: normalizeUrl(merged.buyUrl, defaults.buyUrl),
      supportUrl: normalizeUrl(merged.supportUrl, defaults.supportUrl),
      supportLabel: normalizeText(merged.supportLabel, defaults.supportLabel),
      supportQq: normalizeText(merged.supportQq),
      supportQqGroup: normalizeText(merged.supportQqGroup),
      installPageTitle: normalizeText(merged.installPageTitle, defaults.installPageTitle),
      installPageDescription: normalizeText(merged.installPageDescription, defaults.installPageDescription),
      installSiteName: normalizeText(merged.installSiteName, defaults.installSiteName),
      installSiteTitle: normalizeText(merged.installSiteTitle, defaults.installSiteTitle),
      installSiteDescription: normalizeText(merged.installSiteDescription, defaults.installSiteDescription),
      installSiteKeywords: normalizeText(merged.installSiteKeywords, defaults.installSiteKeywords),
      installAdminNickname: normalizeText(merged.installAdminNickname, defaults.installAdminNickname),
      authLogoText: normalizeText(merged.authLogoText, defaults.authLogoText),
      authLoginTitle: normalizeText(merged.authLoginTitle, defaults.authLoginTitle),
      authLoginSubtitle: normalizeText(merged.authLoginSubtitle, defaults.authLoginSubtitle),
      authRegisterTitle: normalizeText(merged.authRegisterTitle, defaults.authRegisterTitle),
      authRegisterSubtitle: normalizeText(merged.authRegisterSubtitle, defaults.authRegisterSubtitle),
      notFoundTitle: normalizeText(merged.notFoundTitle, defaults.notFoundTitle),
      notFoundDescription: normalizeText(merged.notFoundDescription, defaults.notFoundDescription),
      notFoundSeoTitle: normalizeText(merged.notFoundSeoTitle, defaults.notFoundSeoTitle),
      notFoundSeoDescription: normalizeText(merged.notFoundSeoDescription, defaults.notFoundSeoDescription),
      notFoundSeoKeywords: normalizeText(merged.notFoundSeoKeywords, defaults.notFoundSeoKeywords),
      notFoundAutoRedirectSeconds: Number.isFinite(Number(merged.notFoundAutoRedirectSeconds))
        ? Math.max(3, Math.min(30, Number(merged.notFoundAutoRedirectSeconds)))
        : defaults.notFoundAutoRedirectSeconds,
      notFoundQuickLinks: normalizeQuickLinks(merged.notFoundQuickLinks),
      homeFallbackBannerCards: normalizeBannerCards(merged.homeFallbackBannerCards),
      homeFallbackCarouselSlides: normalizeCarouselSlides(merged.homeFallbackCarouselSlides),
      changelogAuthorName: normalizeText(merged.changelogAuthorName, defaults.changelogAuthorName),
      changelogAuthorUrl: normalizeUrl(merged.changelogAuthorUrl, defaults.changelogAuthorUrl),
      changelogAuthorDescription: normalizeText(merged.changelogAuthorDescription, defaults.changelogAuthorDescription),
      changelogBuyButtonText: normalizeText(merged.changelogBuyButtonText, defaults.changelogBuyButtonText),
      changelogRepoLinks: normalizeRepoLinks(merged.changelogRepoLinks),
      changelogPlatformLinks: normalizePlatformLinks(merged.changelogPlatformLinks),
    };
  }

  /**
   * 获取 MCP 页面默认配置
   */
  getDefaultMcpPageConfig() {
    return {
      enabled: true,
      heroEnabled: true,
      heroStyle: 'glass',
      visualPreset: 'minimal',
      pageKicker: 'MCP HUB',
      pageTitle: 'MCP 中心',
      pageDescription: '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。',
      showHeroStats: true,
      cardStyle: 'elevated',
      density: 'comfortable',
      backgroundMode: 'mesh',
      accentColor: '#2563eb',
      pageBackgroundColor: '#f2f6ff',
      heroBackgroundColor: '#eef4ff',
      heroCoverImage: '',
      cardBorderColor: '#dbe4ff',
      cardRadius: 16,
      cardShadowEnabled: false,
      showOfficialLink: true,
      showTagFilter: true,
      tagFilterLimit: 20,
      showCategoryCount: true,
      listPageSize: 12,
      maxWidth: 1280,
      detailHeaderStyle: 'classic',
      detailShowRating: true,
      detailRatingValue: 0,
      detailShowCommand: true,
      detailCommandTemplate: '',
      detailShowVersionTag: true,
    };
  }

  /**
   * 获取 Figma 页面默认配置
   */
  getDefaultFigmaPageConfig() {
    return {
      enabled: true,
      listPageSize: 24,
      cardClickAction: 'official_first',
      cardClickNewWindow: true,
    };
  }

  /**
   * 规范化 Figma 页面配置，确保卡片点击行为与分页参数稳定可用。
   */
  normalizeFigmaPageConfig(config = {}) {
    const defaults = this.getDefaultFigmaPageConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = { ...defaults, ...source };
    const cardClickAction = String(merged.cardClickAction || '').trim().toLowerCase();
    return {
      enabled: merged.enabled !== false,
      listPageSize: Number.isFinite(Number(merged.listPageSize))
        ? Math.max(6, Math.min(72, Number(merged.listPageSize)))
        : defaults.listPageSize,
      cardClickAction: [ 'detail', 'official_first' ].includes(cardClickAction)
        ? cardClickAction
        : defaults.cardClickAction,
      cardClickNewWindow: merged.cardClickNewWindow !== false,
    };
  }

  /**
   * 规范化 MCP 页面配置，确保售卖版站点在不同主题下都可稳定渲染
   */
  normalizeMcpPageConfig(config = {}) {
    const defaults = this.getDefaultMcpPageConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = { ...defaults, ...source };
    const heroStyle = String(merged.heroStyle || '').trim().toLowerCase();
    const visualPreset = String(merged.visualPreset || '').trim().toLowerCase();
    const cardStyle = String(merged.cardStyle || '').trim().toLowerCase();
    const density = String(merged.density || '').trim().toLowerCase();
    const backgroundMode = String(merged.backgroundMode || '').trim().toLowerCase();
    const detailHeaderStyle = String(merged.detailHeaderStyle || '').trim().toLowerCase();
    /**
     * 规范化色值，避免非法颜色导致前端样式失效。
     * @param {unknown} value 原始颜色
     * @param {string} fallback 兜底颜色
     * @return {string}
     */
    const normalizeColor = (value, fallback) => {
      const text = String(value || '').trim();
      return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text) ? text : fallback;
    };
    const normalizedHeroStyle = [ 'glass', 'solid' ].includes(heroStyle) ? heroStyle : defaults.heroStyle;
    const normalizedVisualPreset = [ 'minimal', 'tech' ].includes(visualPreset) ? visualPreset : defaults.visualPreset;
    const normalizedCardStyle = [ 'elevated', 'outline' ].includes(cardStyle) ? cardStyle : defaults.cardStyle;
    const normalizedDensity = [ 'compact', 'comfortable' ].includes(density) ? density : defaults.density;
    const normalizedBackgroundMode = [ 'plain', 'mesh', 'grid' ].includes(backgroundMode) ? backgroundMode : defaults.backgroundMode;
    const normalizedDetailHeaderStyle = [ 'classic', 'market' ].includes(detailHeaderStyle)
      ? detailHeaderStyle
      : defaults.detailHeaderStyle;
    return {
      enabled: merged.enabled !== false,
      heroEnabled: merged.heroEnabled !== false,
      heroStyle: normalizedHeroStyle,
      visualPreset: normalizedVisualPreset,
      pageKicker: String(merged.pageKicker || defaults.pageKicker).trim().slice(0, 40) || defaults.pageKicker,
      pageTitle: String(merged.pageTitle || defaults.pageTitle).trim().slice(0, 80) || defaults.pageTitle,
      pageDescription: String(merged.pageDescription || defaults.pageDescription).trim().slice(0, 240) || defaults.pageDescription,
      showHeroStats: merged.showHeroStats !== false,
      cardStyle: normalizedCardStyle,
      density: normalizedDensity,
      backgroundMode: normalizedBackgroundMode,
      accentColor: normalizeColor(merged.accentColor, defaults.accentColor),
      pageBackgroundColor: normalizeColor(merged.pageBackgroundColor, defaults.pageBackgroundColor),
      heroBackgroundColor: normalizeColor(merged.heroBackgroundColor, defaults.heroBackgroundColor),
      heroCoverImage: String(merged.heroCoverImage || defaults.heroCoverImage).trim().slice(0, 1000),
      cardBorderColor: normalizeColor(merged.cardBorderColor, defaults.cardBorderColor),
      cardRadius: Number.isFinite(Number(merged.cardRadius))
        ? Math.max(10, Math.min(28, Number(merged.cardRadius)))
        : defaults.cardRadius,
      cardShadowEnabled: merged.cardShadowEnabled === true,
      showOfficialLink: merged.showOfficialLink !== false,
      showTagFilter: merged.showTagFilter !== false,
      tagFilterLimit: Number.isFinite(Number(merged.tagFilterLimit))
        ? Math.max(5, Math.min(60, Number(merged.tagFilterLimit)))
        : defaults.tagFilterLimit,
      showCategoryCount: merged.showCategoryCount !== false,
      listPageSize: Number.isFinite(Number(merged.listPageSize))
        ? Math.max(6, Math.min(48, Number(merged.listPageSize)))
        : defaults.listPageSize,
      maxWidth: Number.isFinite(Number(merged.maxWidth))
        ? Math.max(960, Math.min(1800, Number(merged.maxWidth)))
        : defaults.maxWidth,
      detailHeaderStyle: normalizedDetailHeaderStyle,
      detailShowRating: merged.detailShowRating !== false,
      detailRatingValue: Number.isFinite(Number(merged.detailRatingValue))
        ? Math.max(0, Math.min(5, Number(merged.detailRatingValue)))
        : defaults.detailRatingValue,
      detailShowCommand: merged.detailShowCommand !== false,
      detailCommandTemplate: String(merged.detailCommandTemplate || defaults.detailCommandTemplate).trim().slice(0, 400),
      detailShowVersionTag: merged.detailShowVersionTag !== false,
    };
  }

  /**
   * 获取网站对比页默认配置
   */
  getDefaultWebsiteCompareConfig() {
    return {
      sections: {
        coreDiff: true,
        guide: true,
        faq: true,
        internalLinks: true,
        aiAnalysis: true,
      },
      copywriting: {
        heroTitleTemplate: '{left} 和 {right} 哪个好？有什么区别和优缺点？',
        heroDescriptionTemplate: '对比 {left} 和 {right} 的基础信息、分类、标签、截图与更新时间，帮助你更快判断哪个网站更适合你的使用场景。',
        coreDiffTitle: '核心差异对比',
        guideTitle: '优缺点速览与适用人群',
        guideDescription: '基于站点公开信息自动生成结构化建议，辅助快速决策。',
        strengthTemplates: [
          '{website} 的定位更偏向「{category}」场景，适合目标明确时快速筛选。',
          '从标签覆盖看，{website} 更接近 {top_tags} 等方向，功能边界相对清晰。',
          '如果你更关注 {top_tags} 这类需求，{website} 更值得优先试用。',
          '当前公开信息结构较完整，适合先纳入候选清单做进一步体验。',
        ],
        cautionTemplates: [
          '建议结合官网实际体验确认 {website} 的核心功能与上手门槛。',
          '如果你更看重深度文档或社区反馈，建议再补充外部资料验证。',
          '在最终选择前，最好把 {website} 与同类工具的价格、更新频率一起比较。',
          '若你的需求偏离「{category}」方向，建议再看一轮备选方案。',
        ],
        audienceTemplates: [
          '适合正在寻找「{category}」相关资源的用户。',
          '适合关注 {top_tags} 等方向的从业者或团队。',
          '如果你希望先快速筛一轮候选站点，{website} 适合作为首批试用对象。',
        ],
        recommendationTieTemplate: '两者公开信息量接近，建议优先根据具体功能场景和实际体验来决策。',
        recommendationLeadTemplate: '从当前收录信息完整度看，{winner} 的公开信息更丰富，适合先作为优先试用方案。',
        faqTitle: '常见问题',
        internalLinksTitle: '更多候选对比（内链）',
        internalLinksDescription: '基于分类与标签自动推荐，持续扩展对比页覆盖的长尾词。',
        aiAnalysisTitle: 'AI 分析对比（可选）',
        aiAnalysisDescription: '基于当前公开信息生成对比结论、适用人群与选择建议。',
      },
      metrics: [
        { key: 'category', label: '分类', enabled: true, sort: 10 },
        { key: 'domain', label: '域名', enabled: true, sort: 20 },
        { key: 'protocol', label: '协议', enabled: true, sort: 30 },
        { key: 'tag_count', label: '标签数量', enabled: true, sort: 40 },
        { key: 'screenshot_count', label: '截图数量', enabled: true, sort: 50 },
        { key: 'comment_count', label: '评论数', enabled: true, sort: 60 },
        { key: 'rating_count', label: '评分人数', enabled: true, sort: 70 },
        { key: 'updated_at', label: '最近更新', enabled: true, sort: 80 },
      ],
      faqItems: [
        { question: '{left} 和 {right} 哪个更适合新手？', answer: '建议先从功能定位、界面复杂度和你的使用目标来判断。', sort: 10, enabled: true },
        { question: '{left} 和 {right} 的主要区别是什么？', answer: '通常差异体现在功能定位、内容风格、更新频率与使用门槛。', sort: 20, enabled: true },
        { question: '怎么选择 {left} 或 {right}？', answer: '优先选择标签和分类更匹配的站点，再结合实际体验做最终决策。', sort: 30, enabled: true },
      ],
    };
  }

  /**
   * 规范化网站对比页配置，避免模板与指标项结构失真
   */
  normalizeWebsiteCompareConfig(config = {}) {
    const defaults = this.getDefaultWebsiteCompareConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = {
      ...defaults,
      ...source,
      sections: {
        ...defaults.sections,
        ...(this.isPlainObject(source.sections) ? source.sections : {}),
      },
      copywriting: {
        ...defaults.copywriting,
        ...(this.isPlainObject(source.copywriting) ? source.copywriting : {}),
      },
      metrics: Array.isArray(source.metrics) ? source.metrics : defaults.metrics,
      faqItems: Array.isArray(source.faqItems) ? source.faqItems : defaults.faqItems,
    };
    /**
     * 规范化文本模板列表，兼容数组/多行文本两种输入方式。
     */
    const normalizeTemplateList = (value, fallback, max = 6) => {
      const sourceList = Array.isArray(value)
        ? value
        : String(value || '')
          .split(/\r?\n/)
          .map(item => String(item || '').trim())
          .filter(Boolean);
      const normalized = sourceList
        .map(item => String(item || '').trim().slice(0, 200))
        .filter(Boolean);
      return normalized.length > 0 ? normalized.slice(0, max) : fallback.slice(0, max);
    };
    const allowedMetricKeys = new Set([
      'category',
      'domain',
      'protocol',
      'tag_count',
      'screenshot_count',
      'comment_count',
      'rating_count',
      'updated_at',
    ]);
    const metricList = merged.metrics
      .map((item, index) => {
        const key = String(item?.key || '').trim().toLowerCase();
        if (!allowedMetricKeys.has(key)) return null;
        return {
          key,
          label: String(item?.label || key).trim() || key,
          enabled: item?.enabled !== false,
          sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: (index + 1) * 10 }));
    const faqItems = merged.faqItems
      .map((item, index) => ({
        question: String(item?.question || '').trim().slice(0, 160),
        answer: String(item?.answer || '').trim().slice(0, 1200),
        sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        enabled: item?.enabled !== false,
      }))
      .filter(item => item.question && item.answer)
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: (index + 1) * 10 }));

    return {
      sections: {
        coreDiff: merged.sections.coreDiff !== false,
        guide: merged.sections.guide !== false,
        faq: merged.sections.faq !== false,
        internalLinks: merged.sections.internalLinks !== false,
        aiAnalysis: merged.sections.aiAnalysis !== false,
      },
      copywriting: {
        heroTitleTemplate: String(
          merged.copywriting.heroTitleTemplate || defaults.copywriting.heroTitleTemplate
        ).trim() || defaults.copywriting.heroTitleTemplate,
        heroDescriptionTemplate: String(
          merged.copywriting.heroDescriptionTemplate || defaults.copywriting.heroDescriptionTemplate
        ).trim() || defaults.copywriting.heroDescriptionTemplate,
        coreDiffTitle: String(merged.copywriting.coreDiffTitle || defaults.copywriting.coreDiffTitle).trim() || defaults.copywriting.coreDiffTitle,
        guideTitle: String(merged.copywriting.guideTitle || defaults.copywriting.guideTitle).trim() || defaults.copywriting.guideTitle,
        guideDescription: String(
          merged.copywriting.guideDescription || defaults.copywriting.guideDescription
        ).trim() || defaults.copywriting.guideDescription,
        strengthTemplates: normalizeTemplateList(
          merged.copywriting.strengthTemplates,
          defaults.copywriting.strengthTemplates,
          6
        ),
        cautionTemplates: normalizeTemplateList(
          merged.copywriting.cautionTemplates,
          defaults.copywriting.cautionTemplates,
          6
        ),
        audienceTemplates: normalizeTemplateList(
          merged.copywriting.audienceTemplates,
          defaults.copywriting.audienceTemplates,
          6
        ),
        recommendationTieTemplate: String(
          merged.copywriting.recommendationTieTemplate || defaults.copywriting.recommendationTieTemplate
        ).trim() || defaults.copywriting.recommendationTieTemplate,
        recommendationLeadTemplate: String(
          merged.copywriting.recommendationLeadTemplate || defaults.copywriting.recommendationLeadTemplate
        ).trim() || defaults.copywriting.recommendationLeadTemplate,
        faqTitle: String(merged.copywriting.faqTitle || defaults.copywriting.faqTitle).trim() || defaults.copywriting.faqTitle,
        internalLinksTitle: String(
          merged.copywriting.internalLinksTitle || defaults.copywriting.internalLinksTitle
        ).trim() || defaults.copywriting.internalLinksTitle,
        internalLinksDescription: String(
          merged.copywriting.internalLinksDescription || defaults.copywriting.internalLinksDescription
        ).trim() || defaults.copywriting.internalLinksDescription,
        aiAnalysisTitle: String(
          merged.copywriting.aiAnalysisTitle || defaults.copywriting.aiAnalysisTitle
        ).trim() || defaults.copywriting.aiAnalysisTitle,
        aiAnalysisDescription: String(
          merged.copywriting.aiAnalysisDescription || defaults.copywriting.aiAnalysisDescription
        ).trim() || defaults.copywriting.aiAnalysisDescription,
      },
      metrics: metricList.length > 0 ? metricList : defaults.metrics,
      faqItems: faqItems.length > 0 ? faqItems : defaults.faqItems,
    };
  }

  /**
   * 获取页脚关于区域默认配置
   * 用于“footer-section footer-about-section”后台可配置。
   */
  getDefaultFooterAboutConfig() {
    return {
      aboutTitle: 'UIED设计导航',
      aboutDescription: 'UIED设计导航汇集优质设计工具与资源，涵盖UI/UX设计、平面设计、AI设计工具、三维设计等多个领域。提供Figma、Sketch、Adobe等专业设计软件资源，包含设计灵感、素材库、配色工具、字体资源、图标库等。为设计师提供一站式设计工具导航服务，助力提升设计效率与创作灵感。',
      mobileDescription: 'UIED设计导航汇集优质设计工具与资源，为设计师提供一站式工具导航服务',
      showSubmitButton: true,
      submitButtonText: '提交网站',
      submitButtonUrl: '/submit',
      submitButtonNewWindow: true,
      showChangelogButton: true,
      changelogButtonText: '更新记录',
      changelogButtonUrl: '/changelog',
      changelogButtonNewWindow: true,
    };
  }

  /**
   * 规范化页脚关于区域配置
   * 统一文案字段与按钮开关，确保前端可直接消费。
   */
  normalizeFooterAboutConfig(config = {}) {
    const defaults = this.getDefaultFooterAboutConfig();
    const merged = { ...defaults, ...(config || {}) };
    /**
     * 规范化跳转路径：支持相对路径与外链。
     */
    const normalizeLink = (value, fallback) => {
      const text = String(value || '').trim();
      if (!text) return fallback;
      if (/^(https?:)?\/\//i.test(text)) return text;
      return text.startsWith('/') ? text : `/${text}`;
    };
    return {
      aboutTitle: String(merged.aboutTitle || defaults.aboutTitle).trim() || defaults.aboutTitle,
      aboutDescription: String(merged.aboutDescription || defaults.aboutDescription).trim() || defaults.aboutDescription,
      mobileDescription: String(merged.mobileDescription || defaults.mobileDescription).trim() || defaults.mobileDescription,
      showSubmitButton: merged.showSubmitButton !== false,
      submitButtonText: String(merged.submitButtonText || defaults.submitButtonText).trim() || defaults.submitButtonText,
      submitButtonUrl: normalizeLink(merged.submitButtonUrl, defaults.submitButtonUrl),
      submitButtonNewWindow: merged.submitButtonNewWindow !== false,
      showChangelogButton: merged.showChangelogButton !== false,
      changelogButtonText: String(merged.changelogButtonText || defaults.changelogButtonText).trim() || defaults.changelogButtonText,
      changelogButtonUrl: normalizeLink(merged.changelogButtonUrl, defaults.changelogButtonUrl),
      changelogButtonNewWindow: merged.changelogButtonNewWindow !== false,
    };
  }

  /**
   * 获取全站支付配置默认值
   * 统一供投稿、订单、广告位加购等前后端支付链路复用。
   */
  getDefaultPaymentConfig() {
    return {
      enabled: false,
      allowAlipay: true,
      allowWechat: true,
      orderExpireMinutes: 30,
      notifyBaseUrl: '',
      alipay: {
        enabled: false,
        gateway: 'https://openapi.alipay.com/gateway.do',
        appId: '',
        sellerId: '',
        privateKey: '',
        alipayPublicKey: '',
        returnUrl: '',
        notifyUrl: '',
      },
      wechat: {
        enabled: false,
        appId: '',
        mchId: '',
        apiKey: '',
        notifyUrl: '',
        tradeType: 'MWEB',
        sceneName: 'UIED支付中心',
      },
    };
  }

  /**
   * 规范化全站支付配置
   */
  normalizePaymentConfig(config = {}) {
    const defaults = this.getDefaultPaymentConfig();
    const source = this.isPlainObject(config) ? config : {};
    const merged = {
      ...defaults,
      ...source,
      alipay: {
        ...defaults.alipay,
        ...(this.isPlainObject(source?.alipay) ? source.alipay : {}),
      },
      wechat: {
        ...defaults.wechat,
        ...(this.isPlainObject(source?.wechat) ? source.wechat : {}),
      },
    };
    return {
      enabled: merged.enabled === true,
      allowAlipay: merged.allowAlipay !== false,
      allowWechat: merged.allowWechat !== false,
      orderExpireMinutes: Number.isFinite(Number(merged.orderExpireMinutes))
        ? Math.max(5, Math.min(180, Number(merged.orderExpireMinutes)))
        : defaults.orderExpireMinutes,
      notifyBaseUrl: String(merged.notifyBaseUrl || '').trim(),
      alipay: {
        enabled: merged.alipay.enabled === true,
        gateway: String(merged.alipay.gateway || defaults.alipay.gateway).trim() || defaults.alipay.gateway,
        appId: String(merged.alipay.appId || '').trim(),
        sellerId: String(merged.alipay.sellerId || '').trim(),
        privateKey: String(merged.alipay.privateKey || '').trim(),
        alipayPublicKey: String(merged.alipay.alipayPublicKey || '').trim(),
        returnUrl: String(merged.alipay.returnUrl || '').trim(),
        notifyUrl: String(merged.alipay.notifyUrl || '').trim(),
      },
      wechat: {
        enabled: merged.wechat.enabled === true,
        appId: String(merged.wechat.appId || '').trim(),
        mchId: String(merged.wechat.mchId || '').trim(),
        apiKey: String(merged.wechat.apiKey || '').trim(),
        notifyUrl: String(merged.wechat.notifyUrl || '').trim(),
        tradeType: 'MWEB',
        sceneName: String(merged.wechat.sceneName || defaults.wechat.sceneName).trim() || defaults.wechat.sceneName,
      },
    };
  }

  /**
   * 构建前台可公开的支付配置（去敏）
   */
  buildPublicPaymentConfig(config = {}) {
    const normalized = this.normalizePaymentConfig(config);
    return {
      enabled: normalized.enabled,
      allowAlipay: normalized.allowAlipay && normalized.alipay.enabled,
      allowWechat: normalized.allowWechat && normalized.wechat.enabled,
    };
  }

  /**
   * 获取投稿与运营加购配置默认值
   * 该配置用于前端投稿页的基础收录服务、置顶/Banner 加购与 FAQ 展示。
   */
  getDefaultSubmissionServiceConfig() {
    return {
      enabled: true,
      pageTitle: '提交网站',
      pageSubtitle: '提交收录统一付费，支持置顶推荐和 Banner 运营位增值加购',
      pageDescription: '提交后进入审核与收录流程，可按需叠加购买置顶推荐或 Banner 运营位，适合新品上线与运营推广。',
      containerMaxWidth: 1280,
      pricingTitle: '收录与增值服务',
      faqTitle: '常见问题',
      submitService: {
        enabled: true,
        key: 'submission',
        label: '付费提交收录',
        badge: '基础服务',
        description: '提交后进入人工审核、信息完善与正式收录流程，是所有投稿的基础服务。',
        price: 39,
        originalPrice: 59,
        ctaText: '提交并支付',
        features: [
          '站点进入人工审核与分类收录流程',
          '支持 AI 补全站点信息与基础内容优化',
          '审核通过后进入站内搜索与列表展示'
        ],
      },
      topRecommendAddon: {
        enabled: true,
        key: 'top_recommendation',
        label: '置顶推荐加购',
        badge: '曝光增强',
        description: '适合希望在分类页或推荐区获得更高排序与额外曝光的产品。',
        price: 99,
        originalPrice: 129,
        ctaText: '勾选加购',
        features: [
          '优先进入推荐位与更高排序',
          '适合新品冷启动与短期活动推广',
          '可与 Banner 位叠加购买'
        ],
      },
      bannerAddon: {
        enabled: true,
        key: 'banner_slot',
        label: 'Banner 运营位加购',
        badge: '高曝光',
        description: '适合重点推广活动，可额外购买 Banner 位置用于首页或频道页运营展示。',
        price: 199,
        originalPrice: 299,
        ctaText: '勾选加购',
        features: [
          '支持首页或频道 Banner 位展示',
          '适合重点活动、新品发布与商业推广',
          '由运营同学排期后投放'
        ],
      },
      faqItems: [
        { question: '提交后多久审核？', answer: '通常 1-3 个工作日完成审核。', sort: 10, enabled: true },
        { question: '置顶推荐和 Banner 位何时生效？', answer: '支付成功后由运营排期，审核通过后按配置执行。', sort: 20, enabled: true },
        { question: '支持哪些支付方式？', answer: '支持支付宝和微信支付。', sort: 30, enabled: true },
      ],
    };
  }

  /**
   * 规范化投稿与运营加购配置
   * @param {Record<string, any>} config 原始配置
   * @return {Record<string, any>} 规范化结果
   */
  normalizeSubmissionServiceConfig(config = {}) {
    const defaults = this.getDefaultSubmissionServiceConfig();
    const source = this.isPlainObject(config) ? config : {};
    const normalizePrice = (value, fallback = 0) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return Number(fallback || 0);
      return Math.max(0, Math.min(999999, Number(num.toFixed(2))));
    };
    const normalizeFeatureList = (value, fallback = []) => {
      const list = Array.isArray(value) ? value : fallback;
      const normalized = list
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 12);
      return normalized.length > 0 ? normalized : fallback;
    };
    const normalizeFaqItems = (value, fallback = []) => {
      const rows = Array.isArray(value) ? value : fallback;
      return rows
        .map((item, index) => ({
          question: String(item?.question || '').trim().slice(0, 120),
          answer: String(item?.answer || '').trim().slice(0, 1000),
          sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
          enabled: item?.enabled !== false,
        }))
        .filter(item => item.question && item.answer)
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: (index + 1) * 10 }));
    };
    const merged = {
      ...defaults,
      ...source,
      submitService: {
        ...defaults.submitService,
        ...(this.isPlainObject(source.submitService)
          ? source.submitService
          : (this.isPlainObject(source.aiGrowthService) ? source.aiGrowthService : {})),
      },
      topRecommendAddon: {
        ...defaults.topRecommendAddon,
        ...(this.isPlainObject(source.topRecommendAddon)
          ? source.topRecommendAddon
          : (this.isPlainObject(source.paidBoostService) ? source.paidBoostService : {})),
      },
      bannerAddon: {
        ...defaults.bannerAddon,
        ...(this.isPlainObject(source.bannerAddon) ? source.bannerAddon : {}),
      },
    };
    return {
      enabled: merged.enabled !== false,
      pageTitle: String(merged.pageTitle || defaults.pageTitle).trim() || defaults.pageTitle,
      pageSubtitle: String(merged.pageSubtitle || defaults.pageSubtitle).trim() || defaults.pageSubtitle,
      pageDescription: String(merged.pageDescription || defaults.pageDescription).trim() || defaults.pageDescription,
      containerMaxWidth: Number.isFinite(Number(merged.containerMaxWidth))
        ? Math.max(960, Math.min(1600, Number(merged.containerMaxWidth)))
        : defaults.containerMaxWidth,
      pricingTitle: String(merged.pricingTitle || defaults.pricingTitle).trim() || defaults.pricingTitle,
      faqTitle: String(merged.faqTitle || defaults.faqTitle).trim() || defaults.faqTitle,
      submitService: {
        ...merged.submitService,
        enabled: merged.submitService.enabled !== false,
        key: 'submission',
        label: String(merged.submitService.label || defaults.submitService.label).trim() || defaults.submitService.label,
        badge: String(merged.submitService.badge || defaults.submitService.badge).trim(),
        description: String(merged.submitService.description || defaults.submitService.description).trim() || defaults.submitService.description,
        price: normalizePrice(merged.submitService.price, defaults.submitService.price),
        originalPrice: normalizePrice(merged.submitService.originalPrice, defaults.submitService.originalPrice),
        ctaText: String(merged.submitService.ctaText || defaults.submitService.ctaText).trim() || defaults.submitService.ctaText,
        features: normalizeFeatureList(merged.submitService.features, defaults.submitService.features),
      },
      topRecommendAddon: {
        ...merged.topRecommendAddon,
        enabled: merged.topRecommendAddon.enabled !== false,
        key: 'top_recommendation',
        label: String(merged.topRecommendAddon.label || defaults.topRecommendAddon.label).trim() || defaults.topRecommendAddon.label,
        badge: String(merged.topRecommendAddon.badge || defaults.topRecommendAddon.badge).trim(),
        description: String(merged.topRecommendAddon.description || defaults.topRecommendAddon.description).trim() || defaults.topRecommendAddon.description,
        price: normalizePrice(merged.topRecommendAddon.price, defaults.topRecommendAddon.price),
        originalPrice: normalizePrice(merged.topRecommendAddon.originalPrice, defaults.topRecommendAddon.originalPrice),
        ctaText: String(merged.topRecommendAddon.ctaText || defaults.topRecommendAddon.ctaText).trim() || defaults.topRecommendAddon.ctaText,
        features: normalizeFeatureList(merged.topRecommendAddon.features, defaults.topRecommendAddon.features),
      },
      bannerAddon: {
        ...merged.bannerAddon,
        enabled: merged.bannerAddon.enabled !== false,
        key: 'banner_slot',
        label: String(merged.bannerAddon.label || defaults.bannerAddon.label).trim() || defaults.bannerAddon.label,
        badge: String(merged.bannerAddon.badge || defaults.bannerAddon.badge).trim(),
        description: String(merged.bannerAddon.description || defaults.bannerAddon.description).trim() || defaults.bannerAddon.description,
        price: normalizePrice(merged.bannerAddon.price, defaults.bannerAddon.price),
        originalPrice: normalizePrice(merged.bannerAddon.originalPrice, defaults.bannerAddon.originalPrice),
        ctaText: String(merged.bannerAddon.ctaText || defaults.bannerAddon.ctaText).trim() || defaults.bannerAddon.ctaText,
        features: normalizeFeatureList(merged.bannerAddon.features, defaults.bannerAddon.features),
      },
      faqItems: normalizeFaqItems(merged.faqItems, defaults.faqItems),
    };
  }

  /**
   * 构建前台可公开的投稿配置（去敏）
   * @param {Record<string, any>} config 全量配置
   * @return {Record<string, any>} 前台可读配置
   */
  buildPublicSubmissionServiceConfig(config = {}, paymentConfig = {}) {
    const normalized = this.normalizeSubmissionServiceConfig(config);
    const payment = this.buildPublicPaymentConfig(paymentConfig);
    return {
      enabled: normalized.enabled,
      pageTitle: normalized.pageTitle,
      pageSubtitle: normalized.pageSubtitle,
      pageDescription: normalized.pageDescription,
      containerMaxWidth: normalized.containerMaxWidth,
      pricingTitle: normalized.pricingTitle,
      faqTitle: normalized.faqTitle,
      submitService: normalized.submitService,
      topRecommendAddon: normalized.topRecommendAddon,
      bannerAddon: normalized.bannerAddon,
      // 兼容旧前端字段
      aiGrowthService: normalized.submitService,
      paidBoostService: normalized.topRecommendAddon,
      faqItems: normalized.faqItems,
      payment,
    };
  }

  /**
   * 规范化详情页配置，确保 SEO 开关与数组字段结构稳定
   */
  normalizeDetailPageConfig(config = {}) {
    const rawConfig = this.isPlainObject(config) ? config : {};
    const defaults = {
      seoCanonicalEnabled: true,
      seoNoindexEnabled: false,
      sidebarSticky: true,
      sidebarTopOffset: 16,
      shareChannels: [
        { key: 'wechat', name: '微信', enabled: true, icon: 'wechat', sort: 1 },
        { key: 'weibo', name: '微博', enabled: true, icon: 'weibo', sort: 2 },
        { key: 'qq', name: 'QQ', enabled: true, icon: 'qq', sort: 3 },
        { key: 'qzone', name: 'QQ空间', enabled: true, icon: 'qzone', sort: 4 },
        { key: 'twitter', name: 'Twitter', enabled: true, icon: 'twitter', sort: 5 },
        { key: 'facebook', name: 'Facebook', enabled: true, icon: 'facebook', sort: 6 },
        { key: 'linkedin', name: 'LinkedIn', enabled: false, icon: 'linkedin', sort: 7 },
        { key: 'copylink', name: '复制链接', enabled: true, icon: 'link', sort: 8 },
      ],
      sidebarModules: [
        { key: 'info', name: '网站信息', enabled: true, sort: 1 },
        { key: 'category', name: '分类', enabled: true, sort: 2 },
        { key: 'related', name: '相关推荐', enabled: true, sort: 3 },
        { key: 'hot_websites', name: '热门网址', enabled: true, sort: 4 },
        { key: 'articles', name: '推荐文章', enabled: true, sort: 5 },
        { key: 'tags', name: '标签', enabled: true, sort: 6 },
        { key: 'qrcode', name: '二维码', enabled: false, sort: 7 },
        { key: 'ad', name: '广告位', enabled: false, sort: 8 },
      ],
    };
    const merged = { ...defaults, ...rawConfig };
    const restConfig = { ...merged };
    delete restConfig.sidebarAdEnabled;
    delete restConfig.detailTopAdEnabled;
    delete restConfig.detailInlineAdEnabled;
    delete restConfig.detailBottomAdEnabled;
    /**
     * 规范化排序配置数组，确保前端按 sort 渲染时顺序稳定。
     */
    const normalizeSortableList = list => (Array.isArray(list) ? list : [])
      .filter(item => String(item?.key || '').trim())
      .map(item => ({
        ...item,
        key: String(item.key || '').trim(),
        name: String(item.name || item.key || '').trim(),
        enabled: item.enabled !== false,
        sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : 0,
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: index + 1 }));
    /**
     * 兼容旧字段：若历史配置仍使用 shareEnabled，则迁移到 sharingEnabled。
     */
    const sharingEnabled = typeof merged.sharingEnabled === 'boolean'
      ? merged.sharingEnabled
      : rawConfig.shareEnabled !== false;
    const normalizedShareChannels = normalizeSortableList(merged.shareChannels);
    const normalizedSidebarModules = normalizeSortableList(merged.sidebarModules);
    const hasExplicitSidebarModules = Array.isArray(rawConfig.sidebarModules)
      && rawConfig.sidebarModules.length > 0;
    /**
     * 兼容旧字段：仅在未配置 sidebarModules 时，使用 show* 迁移模块开关。
     */
    const migratedSidebarModules = !hasExplicitSidebarModules
      ? normalizedSidebarModules.map(item => {
          const legacyMap = {
            category: 'showCategory',
            related: 'showRelated',
            hot_websites: 'showHotWebsites',
            articles: 'showArticles',
            tags: 'showTags',
          };
          const legacyKey = legacyMap[item.key];
          if (!legacyKey) return item;
          if (typeof rawConfig[legacyKey] !== 'boolean') return item;
          return { ...item, enabled: rawConfig[legacyKey] !== false };
        })
      : normalizedSidebarModules;
    /**
     * 清理已废弃字段，避免运营后台出现重复开关语义。
     */
    delete restConfig.showRelated;
    delete restConfig.showHotWebsites;
    delete restConfig.showArticles;
    delete restConfig.showTags;
    delete restConfig.showCategory;
    delete restConfig.shareEnabled;
    delete restConfig.favoritesEnabled;
    delete restConfig.relatedEnabled;
    delete restConfig.tagsEnabled;
    /**
     * 规范化详情广告 slotKey，避免空字符串导致前台无法命中广告位。
     */
    const normalizeSlotKey = (value, fallback) => {
      const text = String(value || '').trim();
      return text || fallback;
    };
    return {
      ...restConfig,
      sidebarSticky: merged.sidebarSticky !== false,
      sidebarTopOffset: Number.isFinite(Number(merged.sidebarTopOffset))
        ? Math.max(0, Math.min(240, Number(merged.sidebarTopOffset)))
        : 16,
      sidebarAdSlotKey: normalizeSlotKey(merged.sidebarAdSlotKey, 'website_detail_sidebar'),
      detailTopAdSlotKey: normalizeSlotKey(merged.detailTopAdSlotKey, 'detail_top'),
      detailInlineAdSlotKey: normalizeSlotKey(merged.detailInlineAdSlotKey, 'detail_inline'),
      detailBottomAdSlotKey: normalizeSlotKey(merged.detailBottomAdSlotKey, 'detail_bottom'),
      sharingEnabled: sharingEnabled !== false,
      seoCanonicalEnabled: merged.seoCanonicalEnabled !== false,
      seoNoindexEnabled: merged.seoNoindexEnabled === true,
      shareChannels: normalizedShareChannels.length > 0 ? normalizedShareChannels : defaults.shareChannels,
      sidebarModules: migratedSidebarModules.length > 0 ? migratedSidebarModules : defaults.sidebarModules,
    };
  }

  /**
   * 规范化文章模块公开配置（前端官网读取）
   */
  normalizeArticleConfig(config = {}) {
    const defaults = {
      enabled: true,
      homeSectionEnabled: true,
      homeSectionTitle: '设计文章',
      homeSectionSubtitle: '汇聚优质设计文章，分享前沿设计趋势与实战经验',
      homeSectionLimit: 12,
      listPageTitle: '设计专栏',
      listPageDescription: '汇聚优质设计文章，分享前沿设计趋势、实战技巧与行业洞察',
      listPageCoverImage: '',
      detailLayoutWidthMode: 'contained',
      detailContentMaxWidth: 880,
      detailHeaderAlign: 'center',
      detailVisualStyle: 'editorial',
      detailActionRailStyle: 'rail',
      detailSidebarEnabled: true,
      detailSidebarSticky: true,
      detailSidebarTopOffset: 16,
      detailSidebarLinksNewWindow: false,
      detailSidebarLatestArticlesTitle: '最新文章',
      detailSidebarLatestArticlesCount: 6,
      detailSidebarHotWebsitesTitle: '热门网址',
      detailSidebarHotWebsitesCount: 6,
      detailSidebarTagsTitle: '文章标签',
      detailSidebarModules: [
        { key: 'latest_articles', name: '最新文章', enabled: true, sort: 1 },
        { key: 'hot_websites', name: '热门网址', enabled: true, sort: 2 },
        { key: 'article_tags', name: '文章标签', enabled: true, sort: 3 },
      ],
      commentsEnabled: true,
      topicsEnabled: true,
    };
    const merged = { ...defaults, ...(config || {}) };
    /**
     * 规范化文章详情侧栏模块，兼容旧配置并保持排序稳定。
     */
    const normalizedSidebarModules = (() => {
      const defaultList = Array.isArray(defaults.detailSidebarModules) ? defaults.detailSidebarModules : [];
      const rawList = Array.isArray(merged.detailSidebarModules) ? merged.detailSidebarModules : [];
      const defaultMap = new Map(defaultList.map(item => [ item.key, item ]));
      const keySet = new Set();
      const list = rawList
        .filter(item => String(item?.key || '').trim())
        .map(item => {
          const key = String(item.key || '').trim();
          keySet.add(key);
          const defaultItem = defaultMap.get(key);
          return {
            key,
            name: String(item.name || defaultItem?.name || key),
            enabled: item.enabled !== false,
            sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : 0,
          };
        });
      defaultList.forEach(item => {
        if (!keySet.has(item.key)) list.push({ ...item });
      });
      return list
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: index + 1 }));
    })();
    const detailLayoutWidthMode = [ 'contained', 'wide', 'fluid' ].includes(String(merged.detailLayoutWidthMode || '').trim())
      ? String(merged.detailLayoutWidthMode || '').trim()
      : defaults.detailLayoutWidthMode;
    const detailHeaderAlign = [ 'left', 'center' ].includes(String(merged.detailHeaderAlign || '').trim())
      ? String(merged.detailHeaderAlign || '').trim()
      : defaults.detailHeaderAlign;
    const detailVisualStyle = [ 'editorial', 'product' ].includes(String(merged.detailVisualStyle || '').trim())
      ? String(merged.detailVisualStyle || '').trim()
      : defaults.detailVisualStyle;
    const detailActionRailStyle = [ 'rail', 'toolbar' ].includes(String(merged.detailActionRailStyle || '').trim())
      ? String(merged.detailActionRailStyle || '').trim()
      : defaults.detailActionRailStyle;
    return {
      ...merged,
      enabled: merged.enabled !== false,
      homeSectionEnabled: merged.homeSectionEnabled !== false,
      homeSectionLimit: Number.isFinite(Number(merged.homeSectionLimit))
        ? Math.max(1, Math.min(50, Number(merged.homeSectionLimit)))
        : defaults.homeSectionLimit,
      detailLayoutWidthMode,
      detailContentMaxWidth: Number.isFinite(Number(merged.detailContentMaxWidth))
        ? Math.max(680, Math.min(1600, Number(merged.detailContentMaxWidth)))
        : defaults.detailContentMaxWidth,
      detailHeaderAlign,
      detailVisualStyle,
      detailActionRailStyle,
      detailSidebarEnabled: merged.detailSidebarEnabled !== false,
      detailSidebarSticky: merged.detailSidebarSticky !== false,
      detailSidebarTopOffset: Number.isFinite(Number(merged.detailSidebarTopOffset))
        ? Math.max(0, Math.min(240, Number(merged.detailSidebarTopOffset)))
        : defaults.detailSidebarTopOffset,
      detailSidebarLinksNewWindow: merged.detailSidebarLinksNewWindow === true,
      detailSidebarLatestArticlesTitle: String(
        merged.detailSidebarLatestArticlesTitle || defaults.detailSidebarLatestArticlesTitle
      ),
      detailSidebarLatestArticlesCount: Number.isFinite(Number(merged.detailSidebarLatestArticlesCount))
        ? Math.max(1, Math.min(20, Number(merged.detailSidebarLatestArticlesCount)))
        : defaults.detailSidebarLatestArticlesCount,
      detailSidebarHotWebsitesTitle: String(
        merged.detailSidebarHotWebsitesTitle || defaults.detailSidebarHotWebsitesTitle
      ),
      detailSidebarHotWebsitesCount: Number.isFinite(Number(merged.detailSidebarHotWebsitesCount))
        ? Math.max(1, Math.min(20, Number(merged.detailSidebarHotWebsitesCount)))
        : defaults.detailSidebarHotWebsitesCount,
      detailSidebarTagsTitle: String(
        merged.detailSidebarTagsTitle || defaults.detailSidebarTagsTitle
      ),
      detailSidebarModules: normalizedSidebarModules,
      commentsEnabled: merged.commentsEnabled !== false,
      topicsEnabled: merged.topicsEnabled !== false,
    };
  }

  /**
   * 规范化文章专题配置（按 category/tag 自定义视觉）
   */
  normalizeArticleTopicsConfig(config = {}) {
    if (!config || typeof config !== 'object') {
      return {};
    }
    const result = {};
    Object.keys(config).forEach(key => {
      const item = config[key] || {};
      const topicKey = String(key || '').trim();
      if (!topicKey) return;
      result[topicKey] = {
        id: String(item.id || topicKey),
        type: String(item.type || 'category') === 'tag' ? 'tag' : 'category',
        title: String(item.title || ''),
        description: String(item.description || ''),
        coverImage: String(item.coverImage || ''),
        icon: String(item.icon || ''),
        themeColor: String(item.themeColor || ''),
      };
    });
    return result;
  }

  /**
   * 获取单个设置
   */
  async get(key) {
    const { app } = this;

    const [ setting ] = await app.model.query(
      'SELECT `key`, `value`, description FROM uied_site_setting WHERE `key` = ?',
      { replacements: [ key ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!setting) return null;

    try {
      return JSON.parse(setting.value);
    } catch (error) {
      return setting.value;
    }
  }

  /**
   * 获取所有设置
   */
  async getAll() {
    const { app } = this;

    const settings = await app.model.query(
      'SELECT `key`, `value`, description FROM uied_site_setting',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const result = {};
    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch (error) {
        result[setting.key] = setting.value;
      }
    }

    return result;
  }

  /**
   * 保存设置
   */
  async save(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    for (const [ key, rawValue ] of Object.entries(data)) {
      let value = rawValue;
      if (key === 'pageGlobalConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizePageGlobalConfig(rawValue);
      } else if (key === 'homepageConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeHomepageConfig(rawValue);
      } else if (key === 'exitModalConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeExitModalConfig(rawValue);
      } else if (key === 'searchConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeSearchConfig(rawValue);
      } else if (key === 'brandConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeBrandConfig(rawValue);
      } else if (key === 'footerAboutConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeFooterAboutConfig(rawValue);
      } else if (key === 'paymentConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizePaymentConfig(rawValue);
      } else if (key === 'submissionServiceConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeSubmissionServiceConfig(rawValue);
      } else if (key === 'detailPageConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeDetailPageConfig(rawValue);
      } else if (key === 'hotArticlesConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeHotArticlesConfig(rawValue);
      } else if (key === 'commentConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeCommentConfig(rawValue);
      } else if (key === 'websiteCompareConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeWebsiteCompareConfig(rawValue);
      } else if (key === 'mcpPageConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeMcpPageConfig(rawValue);
      } else if (key === 'figmaPageConfig' && rawValue && typeof rawValue === 'object') {
        value = this.normalizeFigmaPageConfig(rawValue);
      }
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

      await app.model.query(
        `INSERT INTO uied_site_setting (\`key\`, \`value\`, create_time, update_time)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = ?, update_time = ?`,
        { replacements: [ key, valueStr, now, now, valueStr, now ], type: app.Sequelize.QueryTypes.INSERT }
      );
    }
  }

  /**
   * 获取站点信息
   */
  async getSiteInfo() {
    const { app } = this;

    const [ info ] = await app.model.query(
      'SELECT * FROM uied_site_info LIMIT 1',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!info) return null;

    return {
      id: info.id,
      siteName: info.site_name,
      siteTitle: info.site_title,
      siteDescription: info.site_description !== undefined ? info.site_description : (info.description || ''),
      siteKeywords: info.site_keywords !== undefined ? info.site_keywords : (info.keywords || ''),
      logo: info.logo,
      favicon: info.favicon,
      icp: info.icp,
      copyright: info.copyright,
      contactEmail: info.contact_email !== undefined ? info.contact_email : '',
      analyticsCode: info.analytics_code !== undefined ? info.analytics_code : '',
    };
  }

  /**
   * 保存站点信息
   */
  async saveSiteInfo(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const fieldMapping = await this.getSiteInfoFieldMapping();

    // 检查是否存在记录
    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_site_info LIMIT 1',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      const updates = [
        'site_name = ?',
        'site_title = ?',
      ];
      const values = [
        data.siteName || '',
        data.siteTitle || '',
      ];
      if (fieldMapping.descriptionField) {
        updates.push(`\`${fieldMapping.descriptionField}\` = ?`);
        values.push(data.siteDescription || '');
      }
      if (fieldMapping.keywordsField) {
        updates.push(`\`${fieldMapping.keywordsField}\` = ?`);
        values.push(data.siteKeywords || '');
      }
      updates.push('logo = ?');
      values.push(data.logo || '');
      updates.push('favicon = ?');
      values.push(data.favicon || '');
      updates.push('icp = ?');
      values.push(data.icp || '');
      updates.push('copyright = ?');
      values.push(data.copyright || '');
      if (fieldMapping.contactEmailField) {
        updates.push(`\`${fieldMapping.contactEmailField}\` = ?`);
        values.push(data.contactEmail || '');
      }
      if (fieldMapping.analyticsCodeField) {
        updates.push(`\`${fieldMapping.analyticsCodeField}\` = ?`);
        values.push(data.analyticsCode || '');
      }
      updates.push('update_time = ?');
      values.push(now);
      values.push(existing.id);

      await app.model.query(
        `UPDATE uied_site_info SET ${updates.join(', ')} WHERE id = ?`,
        {
          replacements: values,
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
    } else {
      const insertColumns = [
        'site_name',
        'site_title',
      ];
      const insertValues = [
        data.siteName || '',
        data.siteTitle || '',
      ];
      if (fieldMapping.descriptionField) {
        insertColumns.push(`\`${fieldMapping.descriptionField}\``);
        insertValues.push(data.siteDescription || '');
      }
      if (fieldMapping.keywordsField) {
        insertColumns.push(`\`${fieldMapping.keywordsField}\``);
        insertValues.push(data.siteKeywords || '');
      }
      insertColumns.push('logo');
      insertValues.push(data.logo || '');
      insertColumns.push('favicon');
      insertValues.push(data.favicon || '');
      insertColumns.push('icp');
      insertValues.push(data.icp || '');
      insertColumns.push('copyright');
      insertValues.push(data.copyright || '');
      if (fieldMapping.contactEmailField) {
        insertColumns.push(`\`${fieldMapping.contactEmailField}\``);
        insertValues.push(data.contactEmail || '');
      }
      if (fieldMapping.analyticsCodeField) {
        insertColumns.push(`\`${fieldMapping.analyticsCodeField}\``);
        insertValues.push(data.analyticsCode || '');
      }
      insertColumns.push('create_time');
      insertValues.push(now);
      insertColumns.push('update_time');
      insertValues.push(now);
      const placeholders = insertColumns.map(() => '?').join(', ');

      await app.model.query(
        `INSERT INTO uied_site_info (${insertColumns.join(', ')})
         VALUES (${placeholders})`,
        {
          replacements: insertValues,
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
    }
  }

  /**
   * 获取公开设置（前端访问）
   */
  async getPublicSettings() {
    const siteInfo = await this.getSiteInfo();

    // 从数据库读取各项配置
    const pageGlobalConfig = await this.get('pageGlobalConfig');
    const appearanceConfig = await this.get('appearanceConfig');
    const homepageConfig = await this.get('homepageConfig');
    const cardStyleConfig = await this.get('cardStyleConfig');
    const sidebarConfig = await this.get('sidebarConfig');
    const searchConfig = await this.get('searchConfig');
    const exitModalConfig = await this.get('exitModalConfig');
    const paymentConfig = await this.get('paymentConfig');
    const submissionServiceConfig = await this.get('submissionServiceConfig');
    const detailPageConfig = await this.get('detailPageConfig');
    const hotArticlesConfig = await this.get('hotArticlesConfig');
    const articleConfig = await this.get('articleConfig');
    const articleTopicsConfig = await this.get('articleTopicsConfig');
    const footerAboutConfig = await this.get('footerAboutConfig');
    const websiteCompareConfig = await this.get('websiteCompareConfig');
    const mcpPageConfig = await this.get('mcpPageConfig');
    const figmaPageConfig = await this.get('figmaPageConfig');
    const brandConfig = await this.get('brandConfig');
    const authConfig = await this.getAuthConfig();

    // 默认配置
    const defaultPageGlobal = {
      websiteClickMode: 'detail',
      showDirectArrow: true,
      directArrowNewWindow: true,
      detailPageNewWindow: false,
      viewMoreNewWindow: false,
      pageSize: 20,
      categoryPaginationThreshold: 120,
      categoryPaginationPageSize: 24,
      hotRecommendationClickMode: 'detail', // 热门推荐独立配置，默认进详情页
      appendRefEnabled: false,
      appendRefValue: '',
      sortZeroNewFirstEnabled: false,
      categorySvgLibrary: [],
    };

    const defaultAppearance = {
      primaryColor: '#0066ff',
      backgroundColor: '#f6f8fb',
      cardBackgroundColor: '#ffffff',
      textPrimaryColor: '#333333',
      fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      baseFontSize: 16,
      borderRadius: 12,
      contentMaxWidth: 1200,
      customCss: '',
    };

    const defaultHomepage = {
      homePageSlug: '',
      heroBannerEnabled: true,
      heroBgType: 'default',
      heroBgValue: '',
      heroDisplayMode: 'search',
      heroIconClickMode: 'direct',
      heroShowStats: true,
      heroShowHotTags: true,
      bannerCardsEnabled: true,
      hotRecommendationsEnabled: true,
      hotRecommendationsTitle: '热门推荐',
      topAdEnabled: false,
      topAdCode: '',
      homeCarouselEnabled: true,
      homeCarouselSort: 10,
      homeRecommendationEnabled: true,
      homeRecommendationSort: 20,
      navSwitchItems: this.getDefaultNavSwitchItems(),
      dailyNewEnabled: true,
      dailyNewDisplayLabel: '每日上新',
      dailyNewDisplayPath: '/p/hot?tab=daily-new',
      dailyNewDisplayPlacements: [ 'nav_quick_entry' ],
      dailyNewDisplaySort: 86,
      dailyNewDisplayOpenInNewTab: false,
      dailyNewDefaultDays: 7,
      dailyNewPageKicker: 'Daily Fresh',
      dailyNewPageTitle: '每日上新网址',
      dailyNewPageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
    };

    const defaultCardStyle = {
      defaultLayout: 'grid',
      gridColumns: 4,
      showDescription: true,
      maxDescriptionLines: 2,
      showTags: true,
      showFavicon: true,
      showUrl: false,
      hoverEffect: 'translateUp',
    };

    const defaultSidebar = {
      enabled: true,
      position: 'left',
      width: 240,
      showCategories: true,
      showCategoryCount: true,
      expandSubCategories: false,
      sticky: true,
    };

    const defaultSearch = {
      enabled: true,
      placeholder: '搜索网站名称...',
      debounceDelay: 300,
      websiteSearchEnabled: true,
      articleSearchEnabled: true,
      aiSearchEnabled: true,
      aiSearchBtnText: 'AI 搜索',
      heroTitle: '全站搜索',
      heroDescriptionTemplate: '收录 {count} 个优质网站资源',
      heroHighlightText: '',
      hotSearchTags: [ 'AI绘画', 'ChatGPT', 'Figma', '免费工具', 'UI设计', 'Midjourney', '字体', '图标库', 'SVG' ],
      highlightKeyword: true,
      resultsPerPage: 20,
    };

    const defaultExitModal = {
      enabled: true,
      title: '即将离开本站',
      description: '您即将访问外部网站，请注意安全',
      autoRedirect: true,
      countdown: 5,
      logo: '',
      showAgreementLinks: false,
      userAgreementText: '用户协议',
      userAgreementUrl: '',
      copyrightAgreementText: '版权协议',
      copyrightAgreementUrl: '',
    };
    const defaultPayment = this.getDefaultPaymentConfig();
    const defaultSubmissionService = this.getDefaultSubmissionServiceConfig();

    const defaultDetailPage = {
      pageStylePreset: 'showcase',
      layoutWidthMode: 'contained',
      spacingDensity: 'compact',
      labelVisualStyle: 'soft',
      dataPanelEnabled: true,
      dataPanelTitle: '站点访问数据',
      heroAccentGlassEnabled: true,
      enabled: true,
      relatedTitle: '你可能还喜欢',
      relatedCount: 6,
      relatedMode: 'same_category',
      manualWebsiteIds: '',
      hotWebsitesTitle: '热门网址',
      hotWebsitesCount: 6,
      articlesTitle: '推荐文章',
      articlesCount: 5,
      tagsTitle: '深入探索',
      tagSource: 'website',
      manualTags: '',
      categoryTitle: '相关分类',
      sidebarSticky: true,
      sidebarTopOffset: 16,
      sidebarLinksNewWindow: false,
      sidebarAdSlotKey: 'website_detail_sidebar',
      detailTopAdSlotKey: 'detail_top',
      detailInlineAdSlotKey: 'detail_inline',
      detailBottomAdSlotKey: 'detail_bottom',
      seoFaqEnabled: false,
      seoFaqTitle: '常见问题',
      seoFaqLines: '',
      seoLongTailEnabled: false,
      seoLongTailTitle: '相关搜索',
      seoLongTailKeywords: '',
      seoSchemaEnabled: true,
      seoCanonicalEnabled: true,
      seoNoindexEnabled: false,
      screenshotsEnabled: true,
      thumbnailLayoutStyle: 'device',
      thumbnailSplitSideCount: 2,
      thumbnailCarouselThumbCount: 6,
      previewSnapshotEnabled: true,
      previewSnapshotTimeoutMs: 12000,
      previewSnapshotCacheTtlSeconds: 21600,
      previewSnapshotAllowFallbackMshots: true,
      ratingsEnabled: true,
      commentsEnabled: true,
      sharingEnabled: true,
      visitArrowEnabled: true,
      visitArrowText: '直达网站',
      copyrightEnabled: true,
      copyrightText: '版权归原作者所有',
      copyrightLink: '',
      disclaimerEnabled: true,
      disclaimerText: '本站仅收录和推荐，不对第三方网站内容负责。',
      reportEnabled: true,
      reportText: '如发现违规内容，请发送邮件举报',
      reportEmail: '',
      visitBtnText: '访问网站',
      visitBtnNewWindow: true,
      // 分享渠道配置
      shareChannels: [
        { key: 'wechat', name: '微信', enabled: true, icon: 'wechat', sort: 1 },
        { key: 'weibo', name: '微博', enabled: true, icon: 'weibo', sort: 2 },
        { key: 'qq', name: 'QQ', enabled: true, icon: 'qq', sort: 3 },
        { key: 'qzone', name: 'QQ空间', enabled: true, icon: 'qzone', sort: 4 },
        { key: 'twitter', name: 'Twitter', enabled: true, icon: 'twitter', sort: 5 },
        { key: 'facebook', name: 'Facebook', enabled: true, icon: 'facebook', sort: 6 },
        { key: 'linkedin', name: 'LinkedIn', enabled: false, icon: 'linkedin', sort: 7 },
        { key: 'copylink', name: '复制链接', enabled: true, icon: 'link', sort: 8 },
      ],
      // 侧边栏配置
      sidebarModules: [
        { key: 'info', name: '网站信息', enabled: true, sort: 1 },
        { key: 'category', name: '分类', enabled: true, sort: 2 },
        { key: 'related', name: '相关推荐', enabled: true, sort: 3 },
        { key: 'hot_websites', name: '热门网址', enabled: true, sort: 4 },
        { key: 'articles', name: '推荐文章', enabled: true, sort: 5 },
        { key: 'tags', name: '标签', enabled: true, sort: 6 },
        { key: 'qrcode', name: '二维码', enabled: false, sort: 7 },
        { key: 'ad', name: '广告位', enabled: false, sort: 8 },
      ],
    };

    const defaultArticleConfig = {
      enabled: true,
      homeSectionEnabled: true,
      homeSectionTitle: '设计文章',
      homeSectionSubtitle: '汇聚优质设计文章，分享前沿设计趋势与实战经验',
      homeSectionLimit: 12,
      listPageTitle: '设计专栏',
      listPageDescription: '汇聚优质设计文章，分享前沿设计趋势、实战技巧与行业洞察',
      listPageCoverImage: '',
      detailLayoutWidthMode: 'contained',
      detailContentMaxWidth: 880,
      detailHeaderAlign: 'center',
      detailVisualStyle: 'editorial',
      detailActionRailStyle: 'rail',
      detailSidebarEnabled: true,
      detailSidebarSticky: true,
      detailSidebarTopOffset: 16,
      detailSidebarLinksNewWindow: false,
      detailSidebarLatestArticlesTitle: '最新文章',
      detailSidebarLatestArticlesCount: 6,
      detailSidebarHotWebsitesTitle: '热门网址',
      detailSidebarHotWebsitesCount: 6,
      detailSidebarTagsTitle: '文章标签',
      detailSidebarModules: [
        { key: 'latest_articles', name: '最新文章', enabled: true, sort: 1 },
        { key: 'hot_websites', name: '热门网址', enabled: true, sort: 2 },
        { key: 'article_tags', name: '文章标签', enabled: true, sort: 3 },
      ],
      commentsEnabled: true,
      topicsEnabled: true,
    };

    const defaultFooterAbout = this.getDefaultFooterAboutConfig();
    const defaultWebsiteCompareConfig = this.getDefaultWebsiteCompareConfig();
    const defaultMcpPageConfig = this.getDefaultMcpPageConfig();
    const defaultFigmaPageConfig = this.getDefaultFigmaPageConfig();
    const defaultBrandConfig = this.getDefaultBrandConfig();

    const defaultHotArticlesConfig = {
      enabled: true,
      displayPlacements: [ 'nav_quick_entry', 'home_menu' ],
      displayLabel: '热门文章',
      displayPath: '/p/hot',
      displaySort: 84,
      displayOpenInNewTab: false,
      pageKicker: 'HOT ARTICLES',
      pageTitle: '热门文章',
      pageDescription: '同步 uied.cn 的优质文章内容，快速发现值得阅读的设计与产品洞察。',
      pageSize: 24,
      defaultOrderBy: 'date',
      defaultOrder: 'desc',
      defaultCategoryId: 417,
      defaultTagId: 0,
      apiSourceMode: 'auto',
      motionEnabled: true,
      heroTagline: '聚合国内外AI精选内容，探索AI技术前沿与应用',
      hubHeaderKicker: 'CONTENT HUB',
      hubHeaderTitle: '内容中心',
      hubHeaderDescription: '热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。',
      linksNewWindow: true,
      filterPresets: [
        { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
        { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
        { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
        { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
        { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
      ],
      workbenchMenuItems: [
        { key: 'latest-articles', label: '最新文章', mode: 'latest', iconKey: 'latest', source: 'uied_latest', orderBy: 'date', order: 'desc', period: 'all', categoryId: 0, tagId: 0, enabled: true, sort: 10 },
        { key: 'hot-articles', label: '热门文章', mode: 'hot', iconKey: 'hot', source: 'uied_hot', orderBy: 'views', order: 'desc', period: 'all', categoryId: 417, tagId: 0, enabled: true, sort: 20 },
        { key: 'ai-realtime', label: 'AI实时文章', mode: 'preset', iconKey: 'ai', source: 'uied_latest', presetKey: 'aigc', presetKeys: [ 'all', 'aigc', 'nano-banana', 'midjourney', 'stable-diffusion', 'deepseek', 'jimeng', 'gpt4o', 'gpt' ], fallbackType: 'category', fallbackId: 417, enabled: true, sort: 30 },
        { key: 'ai-products', label: 'AI产品榜单', mode: 'preset', iconKey: 'product', source: 'uied_latest', presetKey: 'ai-tools', presetKeys: [ 'all', 'ai-tools', 'aixiezuo', 'aihuihua', 'aishipin', 'aibangong', 'aisheji', 'aikaifa', 'aishuziren' ], fallbackType: 'category', fallbackId: 3351, enabled: true, sort: 40 },
        { key: 'design-articles', label: '设计文章', mode: 'preset', iconKey: 'design', source: 'uied_latest', presetKey: 'design', presetKeys: [ 'all', 'design', 'ui', 'ux', 'product', 'graphic', '3d', 'tips', 'inspiration' ], fallbackType: 'category', fallbackId: 307, enabled: true, sort: 50 },
        { key: 'design-resources', label: '设计素材', mode: 'preset', iconKey: 'resource', source: 'uied_latest', presetKey: 'all-resources', presetKeys: [ 'all', 'all-resources', 'portfolio', 'card', 'big-data', 'dashboard', 'icon', 'ar', 'app', 'watch', 'web', 'design-system', '3d-icon', 'font-resource', 'font', 'ps-plugin', 'sketch-plugin', 'mockup' ], fallbackType: 'category', fallbackId: 4, enabled: true, sort: 60 },
        { key: 'top-authors', label: '优秀作者', mode: 'authorHot', iconKey: 'author', source: 'uied_hot', orderBy: 'comment_count', order: 'desc', period: 'weekly', categoryId: 0, tagId: 0, enabled: true, sort: 70 },
        { key: 'study-circles', label: '学习圈子', mode: 'circle', iconKey: 'circle', source: 'uied_latest', orderBy: 'date', order: 'desc', period: 'all', categoryId: 0, tagId: 393, enabled: true, sort: 80 },
        { key: 'back-main-site', label: '返回主站', mode: 'external', iconKey: 'home', source: 'auto', externalUrl: 'https://www.uied.cn', enabled: true, sort: 999 },
      ],
    };

    const normalizedPageGlobalConfig = this.normalizePageGlobalConfig(pageGlobalConfig || {});
    const normalizedExitModalConfig = this.normalizeExitModalConfig(exitModalConfig || defaultExitModal);

    // 返回完整的配置结构（注意字段名要和前端期望的一致）
    return {
      siteInfo,
      authConfig, // 注册/登录配置
      brand: this.normalizeBrandConfig(brandConfig || defaultBrandConfig),
      pageGlobal: { ...defaultPageGlobal, ...normalizedPageGlobalConfig },
      appearance: appearanceConfig || defaultAppearance,
      homepage: this.normalizeHomepageConfig(homepageConfig || defaultHomepage),
      cardStyle: cardStyleConfig || defaultCardStyle,
      sidebar: sidebarConfig || defaultSidebar,
      search: this.normalizeSearchConfig(searchConfig || defaultSearch),
      submission: this.buildPublicSubmissionServiceConfig(
        this.normalizeSubmissionServiceConfig(submissionServiceConfig || defaultSubmissionService),
        this.normalizePaymentConfig(paymentConfig || defaultPayment)
      ),
      payment: this.buildPublicPaymentConfig(
        this.normalizePaymentConfig(paymentConfig || defaultPayment)
      ),
      exitModal: normalizedExitModalConfig,
      popup: normalizedExitModalConfig,
      detailPage: this.normalizeDetailPageConfig({ ...defaultDetailPage, ...(detailPageConfig || {}) }),
      hotArticles: this.normalizeHotArticlesConfig(hotArticlesConfig || defaultHotArticlesConfig),
      article: this.normalizeArticleConfig(articleConfig || defaultArticleConfig),
      articleTopics: this.normalizeArticleTopicsConfig(articleTopicsConfig || {}),
      footerAbout: this.normalizeFooterAboutConfig(footerAboutConfig || defaultFooterAbout),
      mcpPage: this.normalizeMcpPageConfig(mcpPageConfig || defaultMcpPageConfig),
      figmaPage: this.normalizeFigmaPageConfig(figmaPageConfig || defaultFigmaPageConfig),
      websiteCompare: this.normalizeWebsiteCompareConfig(websiteCompareConfig || defaultWebsiteCompareConfig),
    };
  }

  /**
   * 通过 key 获取设置（别名，兼容 controller 调用）
   */
  async getSettingByKey(key) {
    return await this.get(key);
  }

  /**
   * 获取注册/登录配置
   */
  async getAuthConfig() {
    const { app } = this;
    const defaults = this.getDefaultAuthConfig();

    // 新结构：统一存储在 key-value 的 authConfig 中
    const kvAuthConfig = await this.get(AUTH_CONFIG_SETTING_KEY);
    if (this.isPlainObject(kvAuthConfig)) {
      return this.normalizeAuthConfig(kvAuthConfig);
    }

    // 兼容历史结构：列式字段（enable_register / enable_login 等）
    const hasLegacyColumns = await this.hasLegacyAuthColumns();
    if (!hasLegacyColumns) {
      return defaults;
    }

    try {
      const [ setting ] = await app.model.query(
        'SELECT enable_register, enable_login, register_close_message, login_close_message FROM uied_site_setting LIMIT 1',
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      return this.normalizeAuthConfig(setting || defaults);
    } catch (error) {
      this.ctx.logger.warn('[setting] 读取历史 auth 列式配置失败，回退默认值:', error.message);
      return defaults;
    }
  }

  /**
   * 更新注册/登录配置
   */
  async updateAuthConfig(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalized = this.normalizeAuthConfig(data || {});

    // 新结构：直接写入 key-value，避免依赖列式字段
    await this.save({ [AUTH_CONFIG_SETTING_KEY]: normalized });

    // 兼容历史结构：若数据库仍存在列式字段，则同步写一份
    if (await this.hasLegacyAuthColumns()) {
      const [ existing ] = await app.model.query(
        'SELECT id FROM uied_site_setting LIMIT 1',
        { type: app.Sequelize.QueryTypes.SELECT }
      );

      if (existing) {
        await app.model.query(
          `UPDATE uied_site_setting
           SET enable_register = ?,
               enable_login = ?,
               register_close_message = ?,
               login_close_message = ?,
               update_time = ?
           WHERE id = ?`,
          {
            replacements: [
              normalized.enable_register,
              normalized.enable_login,
              normalized.register_close_message,
              normalized.login_close_message,
              now,
              existing.id,
            ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
      } else {
        await app.model.query(
          `INSERT INTO uied_site_setting
           (enable_register, enable_login, register_close_message, login_close_message, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              normalized.enable_register,
              normalized.enable_login,
              normalized.register_close_message,
              normalized.login_close_message,
              now,
              now,
            ],
            type: app.Sequelize.QueryTypes.INSERT,
          }
        );
      }
    }

    return true;
  }
}

module.exports = SettingService;
