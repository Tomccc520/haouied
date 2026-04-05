/**
 * @file service/uied/page.js
 * @description UIED 页面管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;
const NAVIGATION_PAGE_SLUGS = [ 'uiux', 'ai', 'design', '3d', 'ecommerce', 'interior', 'font' ];
const SYSTEM_PAGE_SLUGS = [ 'hot', 'daily-hot', 'daily-new', 'rankings', 'mcp', 'figma', 'articles', 'search', 'submit' ];
const NAVIGATION_PAGE_TYPE_SET = new Set([ 'navigation', 'nav', 'channel', 'home' ]);
const SYSTEM_PAGE_SLUG_SET = new Set(SYSTEM_PAGE_SLUGS);

class PageService extends Service {
  /**
   * 规范化热门搜索模式，避免非法值入库导致前台行为不一致。
   * @param {unknown} mode 热门搜索模式
   * @return {'custom_only'|'dynamic_only'|'custom_then_dynamic'}
   */
  normalizeHotSearchMode(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    if (normalized === 'custom_only') return 'custom_only';
    if (normalized === 'dynamic_only') return 'dynamic_only';
    return 'custom_then_dynamic';
  }

  /**
   * 规范化热门搜索数值配置（窗口天数/阈值/条数）。
   * @param {unknown} value 配置值
   * @param {number} fallback 默认值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @return {number}
   */
  normalizeHotSearchNumber(value, fallback, min, max) {
    const next = Number.parseInt(String(value), 10);
    if (!Number.isFinite(next)) return fallback;
    return Math.min(max, Math.max(min, next));
  }

  /**
   * 构建页面热门搜索配置（用于写库时统一兜底）。
   * @param {Object} data 页面数据
   * @return {{hotSearchMode:string,hotSearchFixedCount:number,hotSearchDynamicCount:number,hotSearchWindowDays:number,hotSearchMinScore:number}}
   */
  resolveHotSearchConfig(data = {}) {
    return {
      hotSearchMode: this.normalizeHotSearchMode(data.hotSearchMode),
      hotSearchFixedCount: this.normalizeHotSearchNumber(data.hotSearchFixedCount, 4, 0, 20),
      hotSearchDynamicCount: this.normalizeHotSearchNumber(data.hotSearchDynamicCount, 6, 0, 20),
      hotSearchWindowDays: this.normalizeHotSearchNumber(data.hotSearchWindowDays, 7, 1, 30),
      hotSearchMinScore: this.normalizeHotSearchNumber(data.hotSearchMinScore, 1, 1, 1000000),
    };
  }

  /**
   * 判断页面是否属于“导航页面”分组。
   * @param {unknown} type 页面类型字段
   * @param {unknown} slug 页面 slug
   * @return {boolean}
   */
  isNavigationPage(type, slug) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (SYSTEM_PAGE_SLUG_SET.has(normalizedSlug)) return false;
    const normalizedType = String(type || '').trim().toLowerCase();
    if (NAVIGATION_PAGE_TYPE_SET.has(normalizedType)) return true;
    return NAVIGATION_PAGE_SLUGS.includes(normalizedSlug);
  }

  /**
   * 解析页面分组（navigation/custom）。
   * @param {unknown} type 页面类型
   * @param {unknown} slug 页面 slug
   * @return {'navigation'|'custom'}
   */
  resolvePageGroup(type, slug) {
    return this.isNavigationPage(type, slug) ? 'navigation' : 'custom';
  }

  /**
   * 返回页面分组中文文案。
   * @param {string} pageGroup 页面分组值
   * @return {string}
   */
  resolvePageGroupLabel(pageGroup) {
    return String(pageGroup || '') === 'navigation' ? '导航页面' : '系统页面';
  }

  /**
   * 规范化页面类型入库值，避免空值导致后台分组混乱。
   * @param {unknown} type 页面类型
   * @param {unknown} slug 页面 slug
   * @return {string}
   */
  normalizePageTypeForStorage(type, slug) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (SYSTEM_PAGE_SLUG_SET.has(normalizedSlug)) {
      return 'custom';
    }
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized) {
      return normalized.slice(0, 50);
    }
    return this.isNavigationPage('', normalizedSlug) ? 'navigation' : 'custom';
  }

  /**
   * 构建页面分组筛选 SQL 片段，支持导航页/自定义页。
   * @param {unknown} pageGroup 筛选值
   * @return {{ sql: string, replacements: string[] }}
   */
  buildPageGroupFilterSql(pageGroup) {
    const normalizedGroup = String(pageGroup || '').trim().toLowerCase();
    if (![ 'navigation', 'custom' ].includes(normalizedGroup)) {
      return { sql: '', replacements: [] };
    }
    const navigationTypeList = Array.from(NAVIGATION_PAGE_TYPE_SET);
    const navigationSlugList = NAVIGATION_PAGE_SLUGS;
    const systemSlugList = SYSTEM_PAGE_SLUGS;
    const typePlaceholders = navigationTypeList.map(() => '?').join(',');
    const slugPlaceholders = navigationSlugList.map(() => '?').join(',');
    const systemSlugPlaceholders = systemSlugList.map(() => '?').join(',');
    const navigationCondition = `((LOWER(COALESCE(type, '')) IN (${typePlaceholders}) AND LOWER(slug) NOT IN (${systemSlugPlaceholders})) OR (LOWER(slug) IN (${slugPlaceholders})))`;
    return {
      sql: normalizedGroup === 'navigation' ? navigationCondition : `NOT ${navigationCondition}`,
      replacements: [ ...navigationTypeList, ...systemSlugList, ...navigationSlugList ],
    };
  }

  /**
   * 确保页面表存在 show_banner 字段，避免历史库未打补丁导致查询报错。
   */
  async ensureShowBannerColumn() {
    if (this._showBannerColumnReady) return;
    const { app, ctx } = this;
    try {
      await app.model.query(
        'ALTER TABLE `uied_page` ADD COLUMN `show_banner` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT \'是否显示Banner\' AFTER `search_enabled`',
        { type: app.Sequelize.QueryTypes.RAW }
      );
    } catch (error) {
      const message = String(error?.message || '');
      if (!/Duplicate column name/i.test(message)) {
        ctx.logger.warn('[uied.page] 自动补齐 show_banner 字段失败，请手动执行 SQL 补丁: %s', message);
      }
    }
    await this.ensureHotSearchConfigColumns();
    this._showBannerColumnReady = true;
  }

  /**
   * 确保页面表存在热门搜索策略字段，避免历史库未执行补丁导致配置丢失。
   */
  async ensureHotSearchConfigColumns() {
    if (this._hotSearchConfigColumnsReady) return;
    const { app, ctx } = this;
    const columnPatchList = [
      {
        name: 'hot_search_mode',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_search_mode` varchar(30) NOT NULL DEFAULT 'custom_then_dynamic' COMMENT '热门搜索模式: custom_only/dynamic_only/custom_then_dynamic' AFTER `hot_search_tags`",
      },
      {
        name: 'hot_search_fixed_count',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_search_fixed_count` int unsigned NOT NULL DEFAULT 4 COMMENT '固定词数量' AFTER `hot_search_mode`",
      },
      {
        name: 'hot_search_dynamic_count',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_search_dynamic_count` int unsigned NOT NULL DEFAULT 6 COMMENT '动态补齐数量' AFTER `hot_search_fixed_count`",
      },
      {
        name: 'hot_search_window_days',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_search_window_days` int unsigned NOT NULL DEFAULT 7 COMMENT '动态热词窗口天数' AFTER `hot_search_dynamic_count`",
      },
      {
        name: 'hot_search_min_score',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_search_min_score` int unsigned NOT NULL DEFAULT 1 COMMENT '动态热词最低阈值' AFTER `hot_search_window_days`",
      },
    ];
    for (const patch of columnPatchList) {
      try {
        await app.model.query(patch.sql, { type: app.Sequelize.QueryTypes.RAW });
      } catch (error) {
        const message = String(error?.message || '');
        if (!/Duplicate column name/i.test(message)) {
          ctx.logger.warn('[uied.page] 自动补齐 %s 字段失败，请手动执行 SQL 补丁: %s', patch.name, message);
        }
      }
    }
    this._hotSearchConfigColumnsReady = true;
  }

  /**
   * 确保页面表存在动态页区块文案字段，避免历史库未执行补丁时后台保存后前台不生效。
   */
  async ensurePageContentCopyColumns() {
    if (this._pageContentCopyColumnsReady) return;
    const { app, ctx } = this;
    const columnPatchList = [
      {
        name: 'latest_updates_title',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `latest_updates_title` varchar(120) NOT NULL DEFAULT '最新网站更新' COMMENT '最新网站更新区标题' AFTER `show_hot_recommendations`",
      },
      {
        name: 'latest_updates_more_text',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `latest_updates_more_text` varchar(60) NOT NULL DEFAULT '查看更多' COMMENT '最新网站更新查看更多文案' AFTER `latest_updates_title`",
      },
      {
        name: 'latest_updates_loading_text',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `latest_updates_loading_text` varchar(120) NOT NULL DEFAULT '正在加载最新网站...' COMMENT '最新网站更新加载文案' AFTER `latest_updates_more_text`",
      },
      {
        name: 'latest_updates_empty_text',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `latest_updates_empty_text` varchar(120) NOT NULL DEFAULT '近 7 天暂无更新数据' COMMENT '最新网站更新空状态文案' AFTER `latest_updates_loading_text`",
      },
      {
        name: 'hot_recommendations_title',
        sql: "ALTER TABLE `uied_page` ADD COLUMN `hot_recommendations_title` varchar(80) NOT NULL DEFAULT '热门推荐' COMMENT '热门推荐区标题' AFTER `latest_updates_empty_text`",
      },
    ];
    for (const patch of columnPatchList) {
      try {
        await app.model.query(patch.sql, { type: app.Sequelize.QueryTypes.RAW });
      } catch (error) {
        const message = String(error?.message || '');
        if (!/Duplicate column name/i.test(message)) {
          ctx.logger.warn('[uied.page] 自动补齐 %s 字段失败，请手动执行 SQL 补丁: %s', patch.name, message);
        }
      }
    }
    this._pageContentCopyColumnsReady = true;
  }

  /**
   * 获取页面列表（分页）
   */
  async list({ page = 1, pageSize = 20, keyword = '', isActive = '', pageGroup = '' }) {
    await this.ensureShowBannerColumn();
    await this.ensurePageContentCopyColumns();
    const { app } = this;
    const offset = (page - 1) * pageSize;
    const whereSql = [];
    const replacements = [];

    whereSql.push('is_delete = 0');

    /**
     * 支持按名称/别名/描述/Hero 标题进行关键词搜索。
     */
    const normalizedKeyword = String(keyword || '').trim();
    if (normalizedKeyword) {
      const pattern = `%${normalizedKeyword}%`;
      whereSql.push('(name LIKE ? OR slug LIKE ? OR description LIKE ? OR hero_title LIKE ?)');
      replacements.push(pattern, pattern, pattern, pattern);
    }

    /**
     * 支持按显示状态筛选（true/false/1/0）。
     */
    const normalizedIsActive = String(isActive ?? '').trim().toLowerCase();
    if ([ '1', 'true' ].includes(normalizedIsActive)) {
      whereSql.push('is_show = 1');
    } else if ([ '0', 'false' ].includes(normalizedIsActive)) {
      whereSql.push('is_show = 0');
    }

    /**
     * 支持按页面分组筛选（导航页面/系统页面）。
     */
    const pageGroupFilter = this.buildPageGroupFilterSql(pageGroup);
    if (pageGroupFilter.sql) {
      whereSql.push(pageGroupFilter.sql);
      replacements.push(...pageGroupFilter.replacements);
    }

    const whereClause = whereSql.join(' AND ');

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_page WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );
    const total = countResult.total;

    // 获取列表（包含所有 Hero 配置字段）
    const pages = await app.model.query(
      `SELECT id, name, slug, type, description, icon,
              hero_title as heroTitle, hero_highlight_text as heroHighlightText,
              hero_subtitle as heroSubtitle, hot_search_tags as hotSearchTags,
              hot_search_mode as hotSearchMode,
              hot_search_fixed_count as hotSearchFixedCount,
              hot_search_dynamic_count as hotSearchDynamicCount,
              hot_search_window_days as hotSearchWindowDays,
              hot_search_min_score as hotSearchMinScore,
              hero_bg_type as heroBgType, hero_bg_value as heroBgValue,
              hero_display_mode as heroDisplayMode, hero_scroll_websites as heroScrollWebsites,
              search_placeholder as searchPlaceholder, search_enabled as searchEnabled,
              show_banner as showBanner,
              show_hot_recommendations as showHotRecommendations,
              latest_updates_title as latestUpdatesSectionTitle,
              latest_updates_more_text as latestUpdatesMoreText,
              latest_updates_loading_text as latestUpdatesLoadingText,
              latest_updates_empty_text as latestUpdatesEmptyText,
              hot_recommendations_title as hotRecommendationsTitle,
              show_categories as showCategories,
              show_sidebar as showSidebar, theme_color as themeColor,
              sort as sortOrder, is_show as isActive, create_time as createdAt
       FROM uied_page
       WHERE ${whereClause}
       ORDER BY sort ASC, id ASC
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    const lists = pages.map(p => ({
      ...p,
      pageGroup: this.resolvePageGroup(p.type, p.slug),
      pageGroupLabel: this.resolvePageGroupLabel(this.resolvePageGroup(p.type, p.slug)),
      isActive: p.isActive === 1,
      searchEnabled: p.searchEnabled === 1,
      showBanner: p.showBanner === 1,
      showHotRecommendations: p.showHotRecommendations === 1,
      showCategories: p.showCategories === 1,
      showSidebar: p.showSidebar === 1,
      hotSearchTags: p.hotSearchTags ? this.safeJsonParse(p.hotSearchTags, []) : [],
      hotSearchMode: this.normalizeHotSearchMode(p.hotSearchMode),
      hotSearchFixedCount: this.normalizeHotSearchNumber(p.hotSearchFixedCount, 4, 0, 20),
      hotSearchDynamicCount: this.normalizeHotSearchNumber(p.hotSearchDynamicCount, 6, 0, 20),
      hotSearchWindowDays: this.normalizeHotSearchNumber(p.hotSearchWindowDays, 7, 1, 30),
      hotSearchMinScore: this.normalizeHotSearchNumber(p.hotSearchMinScore, 1, 1, 1000000),
      heroScrollWebsites: p.heroScrollWebsites ? this.safeJsonParse(p.heroScrollWebsites, []) : [],
    }));

    return { lists, count: total, page, pageSize };
  }

  /**
   * 获取所有页面
   */
  async all() {
    await this.ensureShowBannerColumn();
    await this.ensurePageContentCopyColumns();
    const { app } = this;
    const pages = await app.model.query(
      `SELECT id, name, slug, type, icon, sort as sortOrder
       FROM uied_page
       WHERE is_delete = 0 AND is_show = 1
       ORDER BY sort ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return pages;
  }

  /**
   * 获取页面详情
   */
  async detail(id, slug) {
    await this.ensureShowBannerColumn();
    await this.ensurePageContentCopyColumns();
    const { app } = this;

    let whereClause = 'is_delete = 0';
    const replacements = [];

    if (id) {
      whereClause += ' AND id = ?';
      replacements.push(id);
    } else if (slug) {
      whereClause += ' AND slug = ?';
      replacements.push(slug);
    }

    const [ page ] = await app.model.query(
      `SELECT * FROM uied_page WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!page) return null;

    return {
      id: page.id,
      name: page.name,
      slug: page.slug,
      type: page.type,
      description: page.description,
      icon: page.icon,
      heroTitle: page.hero_title,
      heroHighlightText: page.hero_highlight_text,
      heroSubtitle: page.hero_subtitle,
      hotSearchTags: page.hot_search_tags ? this.safeJsonParse(page.hot_search_tags, []) : [],
      hotSearchMode: this.normalizeHotSearchMode(page.hot_search_mode),
      hotSearchFixedCount: this.normalizeHotSearchNumber(page.hot_search_fixed_count, 4, 0, 20),
      hotSearchDynamicCount: this.normalizeHotSearchNumber(page.hot_search_dynamic_count, 6, 0, 20),
      hotSearchWindowDays: this.normalizeHotSearchNumber(page.hot_search_window_days, 7, 1, 30),
      hotSearchMinScore: this.normalizeHotSearchNumber(page.hot_search_min_score, 1, 1, 1000000),
      heroBgType: page.hero_bg_type,
      heroBgValue: page.hero_bg_value,
      heroDisplayMode: page.hero_display_mode,
      heroScrollWebsites: page.hero_scroll_websites ? this.safeJsonParse(page.hero_scroll_websites, []) : [],
      searchPlaceholder: page.search_placeholder,
      searchEnabled: page.search_enabled === 1,
      showBanner: page.show_banner === 1,
      showHotRecommendations: page.show_hot_recommendations === 1,
      latestUpdatesSectionTitle: page.latest_updates_title,
      latestUpdatesMoreText: page.latest_updates_more_text,
      latestUpdatesLoadingText: page.latest_updates_loading_text,
      latestUpdatesEmptyText: page.latest_updates_empty_text,
      hotRecommendationsTitle: page.hot_recommendations_title,
      showCategories: page.show_categories === 1,
      showSidebar: page.show_sidebar === 1,
      themeColor: page.theme_color,
      pageGroup: this.resolvePageGroup(page.type, page.slug),
      pageGroupLabel: this.resolvePageGroupLabel(this.resolvePageGroup(page.type, page.slug)),
      sortOrder: page.sort,
      isActive: page.is_show === 1,
      createdAt: page.create_time,
    };
  }

  /**
   * 创建页面
   */
  async add(data) {
    await this.ensureShowBannerColumn();
    await this.ensurePageContentCopyColumns();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const hotSearchConfig = this.resolveHotSearchConfig(data);

    // 检查 slug 是否已存在
    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_page WHERE slug = ? AND is_delete = 0',
      { replacements: [ data.slug ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      throw new Error('页面别名已存在');
    }

    const normalizedType = this.normalizePageTypeForStorage(data.type, data.slug);
    const [ result ] = await app.model.query(
      `INSERT INTO uied_page (name, slug, type, description, icon, hero_title, hero_highlight_text,
        hero_subtitle, hot_search_tags, hot_search_mode, hot_search_fixed_count, hot_search_dynamic_count,
        hot_search_window_days, hot_search_min_score, hero_bg_type, hero_bg_value, hero_display_mode,
        hero_scroll_websites, search_placeholder, search_enabled, show_banner, show_hot_recommendations,
        latest_updates_title, latest_updates_more_text, latest_updates_loading_text, latest_updates_empty_text,
        hot_recommendations_title, show_categories, show_sidebar, theme_color, sort, is_show, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.name, data.slug, normalizedType, data.description || '',
          data.icon || '', data.heroTitle || '', data.heroHighlightText || '',
          data.heroSubtitle || '', data.hotSearchTags ? JSON.stringify(data.hotSearchTags) : null,
          hotSearchConfig.hotSearchMode, hotSearchConfig.hotSearchFixedCount, hotSearchConfig.hotSearchDynamicCount,
          hotSearchConfig.hotSearchWindowDays, hotSearchConfig.hotSearchMinScore,
          data.heroBgType || 'default', data.heroBgValue || '',
          data.heroDisplayMode || 'search', data.heroScrollWebsites ? JSON.stringify(data.heroScrollWebsites) : null,
          data.searchPlaceholder || '', data.searchEnabled !== false ? 1 : 0,
          data.showBanner !== false ? 1 : 0,
          data.showHotRecommendations !== false ? 1 : 0,
          data.latestUpdatesSectionTitle || '最新网站更新',
          data.latestUpdatesMoreText || '查看更多',
          data.latestUpdatesLoadingText || '正在加载最新网站...',
          data.latestUpdatesEmptyText || '近 7 天暂无更新数据',
          data.hotRecommendationsTitle || '热门推荐',
          data.showCategories !== false ? 1 : 0,
          data.showSidebar !== false ? 1 : 0, data.themeColor || null,
          data.sortOrder || 0, data.isActive !== false ? 1 : 0, now, now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新页面
   */
  async edit(data) {
    await this.ensureShowBannerColumn();
    await this.ensurePageContentCopyColumns();
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const updates = [];
    const values = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.slug !== undefined) { updates.push('slug = ?'); values.push(data.slug); }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(this.normalizePageTypeForStorage(data.type, data.slug));
    }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.heroTitle !== undefined) { updates.push('hero_title = ?'); values.push(data.heroTitle); }
    if (data.heroHighlightText !== undefined) { updates.push('hero_highlight_text = ?'); values.push(data.heroHighlightText); }
    if (data.heroSubtitle !== undefined) { updates.push('hero_subtitle = ?'); values.push(data.heroSubtitle); }
    if (data.hotSearchTags !== undefined) { updates.push('hot_search_tags = ?'); values.push(JSON.stringify(data.hotSearchTags)); }
    if (data.hotSearchMode !== undefined) {
      updates.push('hot_search_mode = ?');
      values.push(this.normalizeHotSearchMode(data.hotSearchMode));
    }
    if (data.hotSearchFixedCount !== undefined) {
      updates.push('hot_search_fixed_count = ?');
      values.push(this.normalizeHotSearchNumber(data.hotSearchFixedCount, 4, 0, 20));
    }
    if (data.hotSearchDynamicCount !== undefined) {
      updates.push('hot_search_dynamic_count = ?');
      values.push(this.normalizeHotSearchNumber(data.hotSearchDynamicCount, 6, 0, 20));
    }
    if (data.hotSearchWindowDays !== undefined) {
      updates.push('hot_search_window_days = ?');
      values.push(this.normalizeHotSearchNumber(data.hotSearchWindowDays, 7, 1, 30));
    }
    if (data.hotSearchMinScore !== undefined) {
      updates.push('hot_search_min_score = ?');
      values.push(this.normalizeHotSearchNumber(data.hotSearchMinScore, 1, 1, 1000000));
    }
    if (data.heroBgType !== undefined) { updates.push('hero_bg_type = ?'); values.push(data.heroBgType); }
    if (data.heroBgValue !== undefined) { updates.push('hero_bg_value = ?'); values.push(data.heroBgValue); }
    if (data.heroDisplayMode !== undefined) { updates.push('hero_display_mode = ?'); values.push(data.heroDisplayMode); }
    if (data.heroScrollWebsites !== undefined) { updates.push('hero_scroll_websites = ?'); values.push(JSON.stringify(data.heroScrollWebsites)); }
    if (data.searchPlaceholder !== undefined) { updates.push('search_placeholder = ?'); values.push(data.searchPlaceholder); }
    if (data.searchEnabled !== undefined) { updates.push('search_enabled = ?'); values.push(data.searchEnabled ? 1 : 0); }
    if (data.showBanner !== undefined) { updates.push('show_banner = ?'); values.push(data.showBanner ? 1 : 0); }
    if (data.showHotRecommendations !== undefined) { updates.push('show_hot_recommendations = ?'); values.push(data.showHotRecommendations ? 1 : 0); }
    if (data.latestUpdatesSectionTitle !== undefined) { updates.push('latest_updates_title = ?'); values.push(data.latestUpdatesSectionTitle); }
    if (data.latestUpdatesMoreText !== undefined) { updates.push('latest_updates_more_text = ?'); values.push(data.latestUpdatesMoreText); }
    if (data.latestUpdatesLoadingText !== undefined) { updates.push('latest_updates_loading_text = ?'); values.push(data.latestUpdatesLoadingText); }
    if (data.latestUpdatesEmptyText !== undefined) { updates.push('latest_updates_empty_text = ?'); values.push(data.latestUpdatesEmptyText); }
    if (data.hotRecommendationsTitle !== undefined) { updates.push('hot_recommendations_title = ?'); values.push(data.hotRecommendationsTitle); }
    if (data.showCategories !== undefined) { updates.push('show_categories = ?'); values.push(data.showCategories ? 1 : 0); }
    if (data.showSidebar !== undefined) { updates.push('show_sidebar = ?'); values.push(data.showSidebar ? 1 : 0); }
    if (data.themeColor !== undefined) { updates.push('theme_color = ?'); values.push(data.themeColor); }
    if (data.sortOrder !== undefined) { updates.push('sort = ?'); values.push(data.sortOrder); }
    if (data.isActive !== undefined) { updates.push('is_show = ?'); values.push(data.isActive ? 1 : 0); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_page SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }

  /**
   * 删除页面
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const targetId = Number.parseInt(String(id || 0), 10);
    if (!Number.isInteger(targetId) || targetId <= 0) return;

    /**
     * 系统页面暂不允许删除，避免“系统页面快捷管理”入口被误删导致配置丢失。
     */
    const [ page ] = await app.model.query(
      'SELECT id, slug, type, is_delete FROM uied_page WHERE id = ? LIMIT 1',
      { replacements: [ targetId ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!page || Number(page.is_delete || 0) === 1) return;
    const pageGroup = this.resolvePageGroup(page.type, page.slug);
    if (pageGroup === 'custom') {
      throw new Error('系统页面暂不支持删除，请在导航菜单中调整入口或在页面配置中隐藏');
    }

    await app.model.query(
      'UPDATE uied_page SET is_delete = 1, delete_time = ? WHERE id = ?',
      { replacements: [ now, targetId ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 安全解析 JSON（兼容逗号分隔字符串）
   */
  safeJsonParse(str, defaultValue = []) {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch (error) {
      // 如果不是 JSON，按逗号分隔处理
      if (typeof str === 'string') {
        return str.split(',').map(s => s.trim()).filter(Boolean);
      }
      return defaultValue;
    }
  }

  /**
   * 获取页面分类
   */
  async getCategories(pageId, pageSlug) {
    const { app } = this;

    let query = `
      SELECT c.id, c.name, c.slug, c.icon, pc.sort as sortOrder
      FROM uied_category c
      INNER JOIN uied_page_category pc ON c.id = pc.category_id
      INNER JOIN uied_page p ON pc.page_id = p.id
      WHERE pc.is_delete = 0 AND c.is_delete = 0
    `;
    const replacements = [];

    if (pageId) {
      query += ' AND p.id = ?';
      replacements.push(pageId);
    } else if (pageSlug) {
      query += ' AND p.slug = ?';
      replacements.push(pageSlug);
    }

    query += ' ORDER BY pc.sort ASC';

    return await app.model.query(query, { replacements, type: app.Sequelize.QueryTypes.SELECT });
  }

  /**
   * 更新页面分类
   */
  async updateCategories(pageId, categoryIds, categoryIcons = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedPageId = Number(pageId);
    const normalizedCategoryIds = Array.from(
      new Set(
        (Array.isArray(categoryIds) ? categoryIds : [])
          .map(item => Number(item))
          .filter(item => Number.isFinite(item) && item > 0)
      )
    );
    const normalizedIconEntries = Object.entries(categoryIcons || {})
      .map(([ categoryId, icon ]) => ({
        categoryId: Number(categoryId),
        icon: String(icon || '').trim().slice(0, 100),
      }))
      .filter(item => Number.isFinite(item.categoryId) && item.categoryId > 0);
    const iconMap = new Map(normalizedIconEntries.map(item => [ item.categoryId, item.icon ]));

    // 软删除现有关联
    await app.model.query(
      'UPDATE uied_page_category SET is_delete = 1, delete_time = ? WHERE page_id = ?',
      { replacements: [ now, normalizedPageId ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    // 添加新关联
    for (let i = 0; i < normalizedCategoryIds.length; i++) {
      const currentCategoryId = normalizedCategoryIds[i];
      await app.model.query(
        `INSERT INTO uied_page_category (page_id, category_id, sort, create_time, update_time)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_delete = 0, sort = ?, update_time = ?`,
        { replacements: [ normalizedPageId, currentCategoryId, i, now, now, i, now ], type: app.Sequelize.QueryTypes.INSERT }
      );
    }

    /**
     * 同步更新分类图标（仅处理当前页面选中的分类），满足页面分类配置中的图标维护需求。
     */
    for (const categoryId of normalizedCategoryIds) {
      if (!iconMap.has(categoryId)) continue;
      await app.model.query(
        'UPDATE uied_category SET icon = ?, update_time = ? WHERE id = ? AND is_delete = 0',
        { replacements: [ iconMap.get(categoryId) || '', now, categoryId ], type: app.Sequelize.QueryTypes.UPDATE }
      );
    }
  }
}

module.exports = PageService;
