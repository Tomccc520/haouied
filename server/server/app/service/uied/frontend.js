/**
 * @file service/uied/frontend.js
 * @description UIED 前端兼容服务 - 提供与原 Express API 兼容的接口
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class FrontendService extends Service {
  /**
   * 规范化热门搜索模式，避免异常值影响前台渲染策略。
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
   * 规范化热门搜索数值配置（固定词数量/动态补齐数量/窗口天数/阈值）。
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
   * 解析页面热门搜索配置，统一兜底并输出可直接用于计算的结构。
   * @param {Object} page 页面原始记录
   * @param {number} fallbackLimit 接口 limit 兜底值
   * @return {{mode:string,fixedCount:number,dynamicCount:number,windowDays:number,minScore:number,totalLimit:number}}
   */
  resolvePageHotTagConfig(page = {}, fallbackLimit = 10) {
    const fixedCount = this.normalizeHotSearchNumber(page?.hot_search_fixed_count, 4, 0, 20);
    const dynamicCount = this.normalizeHotSearchNumber(page?.hot_search_dynamic_count, 6, 0, 20);
    const totalLimit = this.normalizeHotSearchNumber(fallbackLimit, Math.max(1, fixedCount + dynamicCount), 1, 30);
    return {
      mode: this.normalizeHotSearchMode(page?.hot_search_mode),
      fixedCount,
      dynamicCount,
      windowDays: this.normalizeHotSearchNumber(page?.hot_search_window_days, 7, 1, 30),
      minScore: this.normalizeHotSearchNumber(page?.hot_search_min_score, 1, 1, 1000000),
      totalLimit,
    };
  }

  /**
   * 构建页面热门搜索缓存 Key（5 分钟），避免每次刷新都实时重算导致抖动。
   * @param {string} slug 页面 slug
   * @param {number[]} categoryIds 页面分类 ID 列表
   * @param {Object} config 热门搜索配置
   * @return {string}
   */
  buildPageHotTagsCacheKey(slug, categoryIds = [], config = {}) {
    const categoryKey = this.normalizeCategoryIdList(categoryIds).join('-') || 'none';
    const mode = this.normalizeHotSearchMode(config.mode);
    const fixedCount = this.normalizeHotSearchNumber(config.fixedCount, 4, 0, 20);
    const dynamicCount = this.normalizeHotSearchNumber(config.dynamicCount, 6, 0, 20);
    const windowDays = this.normalizeHotSearchNumber(config.windowDays, 7, 1, 30);
    const minScore = this.normalizeHotSearchNumber(config.minScore, 1, 1, 1000000);
    const totalLimit = this.normalizeHotSearchNumber(config.totalLimit, 10, 1, 30);
    return [
      'uied:page-hot-tags:v2',
      String(slug || '').trim().toLowerCase(),
      categoryKey,
      mode,
      `f${fixedCount}`,
      `d${dynamicCount}`,
      `w${windowDays}`,
      `s${minScore}`,
      `l${totalLimit}`,
    ].join(':');
  }

  /**
   * 计算“最近 N 天”起始日期（YYYYMMDD）。
   * 统一使用 Asia/Shanghai，避免生产机时区不同导致热门标签窗口偏移。
   * @param {number} windowDays 窗口天数
   * @return {number}
   */
  resolveMetricDateLowerBound(windowDays = 7) {
    const safeWindowDays = this.normalizeHotSearchNumber(windowDays, 7, 1, 30);
    const date = new Date(Date.now() - (safeWindowDays - 1) * 86400000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).reduce((result, item) => {
      if (item.type !== 'literal') result[item.type] = item.value;
      return result;
    }, {});
    return Number.parseInt(`${parts.year}${parts.month}${parts.day}`, 10);
  }

  /**
   * 确保页面表存在热门搜索策略字段，避免历史库缺字段导致接口报错。
   */
  async ensurePageHotSearchColumns() {
    if (this._pageHotSearchColumnsReady) return;
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
          ctx.logger.warn('[uied.frontend] 自动补齐 uied_page.%s 失败，请手动执行 SQL 补丁: %s', patch.name, message);
        }
      }
    }
    this._pageHotSearchColumnsReady = true;
  }

  /**
   * 确保页面表存在动态页区块文案字段，避免前台读取历史库时报列不存在。
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
          ctx.logger.warn('[uied.frontend] 自动补齐 uied_page.%s 失败，请手动执行 SQL 补丁: %s', patch.name, message);
        }
      }
    }
    this._pageContentCopyColumnsReady = true;
  }

  /**
   * 确保网站点击日表存在（用于热门搜索标签的 7 天窗口统计）。
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
   * 生成前端可见网站状态 SQL 条件（仅展示已发布状态，兼容历史 normal）
   * @param {string} alias 表别名前缀（可空）
   * @return {string} SQL 片段
   */
  getPublicWebsiteStatusCondition(alias = '') {
    const prefix = alias ? `${alias}.` : '';
    return `(${prefix}status IS NULL OR ${prefix}status = '' OR ${prefix}status IN ('active', 'normal'))`;
  }

  /**
   * 获取“排序=0 新站优先”开关（来自页面全局配置）。
   * @return {Promise<boolean>} 开关状态
   */
  async getSortZeroNewFirstEnabled() {
    try {
      const raw = await this.ctx.service.uied.setting.getSettingByKey('pageGlobalConfig');
      const normalized = this.ctx.service.uied.setting.normalizePageGlobalConfig(raw || {});
      return normalized?.sortZeroNewFirstEnabled === true;
    } catch (error) {
      this.ctx.logger.warn('[uied.frontend] 读取 sortZeroNewFirstEnabled 配置失败，按关闭处理: %s', error?.message || error);
      return false;
    }
  }

  /**
   * 解析并去重分类 ID 列表
   * @param {Array<number|string>} categoryIds 分类ID列表
   * @return {number[]} 规范化后的分类ID
   */
  normalizeCategoryIdList(categoryIds = []) {
    return Array.from(
      new Set(
        (Array.isArray(categoryIds) ? categoryIds : [])
          .map(item => Number.parseInt(String(item || 0), 10))
          .filter(item => Number.isInteger(item) && item > 0)
      )
    );
  }

  /**
   * 构建网站分类匹配 SQL（主分类 + 多分类关联表）
   * @param {Array<number|string>} categoryIds 分类ID列表
   * @param {string} alias 网站表别名
   * @return {{sql:string,replacements:number[]}} SQL 条件与参数
   */
  buildWebsiteCategoryFilterCondition(categoryIds = [], alias = 'w') {
    const normalizedCategoryIds = this.normalizeCategoryIdList(categoryIds);
    if (normalizedCategoryIds.length === 0) {
      return { sql: '1=1', replacements: [] };
    }
    const placeholders = normalizedCategoryIds.map(() => '?').join(',');
    return {
      sql: `(
        ${alias}.category_id IN (${placeholders})
        OR EXISTS (
          SELECT 1
          FROM uied_website_category uwc
          WHERE uwc.website_id = ${alias}.id
            AND uwc.is_delete = 0
            AND uwc.category_id IN (${placeholders})
        )
      )`,
      replacements: [ ...normalizedCategoryIds, ...normalizedCategoryIds ],
    };
  }

  /**
   * 解析有边界的整数参数，避免 NaN 进入 SQL LIMIT/OFFSET。
   * @param {number|string} value 原始参数
   * @param {number} fallback 默认值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @return {number} 安全整数
   */
  parseBoundedInteger(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  /**
   * 确保网站多分类关联表存在（前台查询前兜底）。
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
   * 确保页面表存在 show_banner 字段，避免历史库未执行补丁时前台接口报错。
   */
  async ensurePageShowBannerColumn() {
    if (this._pageShowBannerColumnReady) return;
    const { app, ctx } = this;
    try {
      await app.model.query(
        'ALTER TABLE `uied_page` ADD COLUMN `show_banner` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT \'是否显示Banner\' AFTER `search_enabled`',
        { type: app.Sequelize.QueryTypes.RAW }
      );
    } catch (error) {
      const message = String(error?.message || '');
      if (!/Duplicate column name/i.test(message)) {
        ctx.logger.warn('[uied.frontend] 自动补齐 uied_page.show_banner 失败，请手动执行 SQL 补丁: %s', message);
      }
    }
    await this.ensurePageHotSearchColumns();
    await this.ensurePageContentCopyColumns();
    this._pageShowBannerColumnReady = true;
  }

  /**
   * 获取所有页面配置
   */
  async getAllPages() {
    await this.ensurePageShowBannerColumn();
    const { app } = this;
    const pages = await app.model.query(
      `SELECT id, name, slug, type, description, icon,
              hero_title as heroTitle, hero_subtitle as heroSubtitle,
              hero_highlight_text as heroHighlightText,
              hot_search_tags as hotSearchTags,
              hot_search_mode as hotSearchMode,
              hot_search_fixed_count as hotSearchFixedCount,
              hot_search_dynamic_count as hotSearchDynamicCount,
              hot_search_window_days as hotSearchWindowDays,
              hot_search_min_score as hotSearchMinScore,
              hero_display_mode as heroDisplayMode,
              hero_scroll_websites as heroScrollWebsites,
              hero_bg_type as heroBgType, hero_bg_value as heroBgValue,
              search_placeholder as searchPlaceholder,
              search_enabled as searchEnabled,
              show_banner as showBanner,
              show_hot_recommendations as showHotRecommendations,
              latest_updates_title as latestUpdatesSectionTitle,
              latest_updates_more_text as latestUpdatesMoreText,
              latest_updates_loading_text as latestUpdatesLoadingText,
              latest_updates_empty_text as latestUpdatesEmptyText,
              hot_recommendations_title as hotRecommendationsTitle,
              show_categories as showCategories,
              show_sidebar as showSidebar,
              theme_color as themeColor,
              sort as sortOrder
       FROM uied_page
       WHERE is_delete = 0 AND is_show = 1
       ORDER BY sort ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return pages.map(p => ({
      ...p,
      searchEnabled: p.searchEnabled === 1,
      showBanner: p.showBanner === 1,
      showHotRecommendations: p.showHotRecommendations === 1,
      latestUpdatesSectionTitle: p.latestUpdatesSectionTitle,
      latestUpdatesMoreText: p.latestUpdatesMoreText,
      latestUpdatesLoadingText: p.latestUpdatesLoadingText,
      latestUpdatesEmptyText: p.latestUpdatesEmptyText,
      hotRecommendationsTitle: p.hotRecommendationsTitle,
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
  }

  /**
   * 获取页面完整数据（包含分类和网站）
   */
  async getPageFullData(slug) {
    const { app } = this;
    await this.ensurePageShowBannerColumn();
    await this.ensureWebsiteCategoryTable();

    // 获取页面配置
    const [ page ] = await app.model.query(
      'SELECT * FROM uied_page WHERE slug = ? AND is_delete = 0',
      { replacements: [ slug ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!page) return null;

    // 获取页面关联的主分类
    const mainCategories = await app.model.query(
      `SELECT c.id, c.name, c.slug, c.icon, c.color, c.description, pc.sort as sortOrder
       FROM uied_category c
       INNER JOIN uied_page_category pc ON c.id = pc.category_id
       WHERE pc.page_id = ? AND pc.is_delete = 0 AND c.is_delete = 0 AND c.is_show = 1
       ORDER BY pc.sort ASC`,
      { replacements: [ page.id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 收集所有分类ID（主分类 + 子分类）用于查询网站
    const allCategoryIds = [];
    const categoriesWithSubs = [];

    for (const cat of mainCategories) {
      // 获取子分类
      const subCategories = await app.model.query(
        `SELECT id, name, slug FROM uied_category
         WHERE parent_id = ? AND is_delete = 0 AND is_show = 1
         ORDER BY sort ASC`,
        { replacements: [ cat.id ], type: app.Sequelize.QueryTypes.SELECT }
      );

      // 主分类和子分类都纳入前台查询，兼容运营直接把网站收录到主分类的场景。
      allCategoryIds.push(cat.id);

      // 收集子分类ID
      const subCategoryIds = subCategories.map(s => s.id);
      allCategoryIds.push(...subCategoryIds);

      categoriesWithSubs.push({
        id: String(cat.id),
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || 'default',
        color: cat.color || '#3B82F6',
        description: cat.description,
        order: cat.sortOrder,
        subCategories: subCategories.map(s => ({
          id: String(s.id),
          name: s.name,
          slug: s.slug,
        })),
        websites: [], // 将在下面填充
      });
    }

    const queryCategoryIds = Array.from(new Set(
      allCategoryIds
        .map(item => Number.parseInt(String(item || 0), 10))
        .filter(item => Number.isInteger(item) && item > 0)
    ));

    // 获取所有相关网站
    let websites = [];
    if (queryCategoryIds.length > 0) {
      const sortZeroNewFirstEnabled = await this.getSortZeroNewFirstEnabled();
      const sortZeroOrderSql = sortZeroNewFirstEnabled
        ? ', CASE WHEN w.sort = 0 THEN w.create_time ELSE 0 END DESC'
        : '';
      const categoryFilter = this.buildWebsiteCategoryFilterCondition(queryCategoryIds, 'w');
      websites = await app.model.query(
        `SELECT w.id, w.name, w.description, w.url, w.icon_url as iconUrl, w.category_id as categoryId,
                w.is_hot as isHot, w.is_featured as isFeatured, w.is_new as isNew, w.is_pinned as isPinned,
                w.tags, w.sort as sortOrder, w.create_time as createdAt
         FROM uied_website w
         WHERE ${categoryFilter.sql} AND w.is_delete = 0 AND ${this.getPublicWebsiteStatusCondition('w')}
         ORDER BY w.is_pinned DESC, w.is_hot DESC, w.is_featured DESC, w.sort ASC${sortZeroOrderSql}, w.id DESC`,
        { replacements: categoryFilter.replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
    }

    // 按分类组织网站（用于 websitesByCategory）
    const websiteCategoryRows = websites.length > 0
      ? await app.model.query(
        `SELECT website_id as websiteId, category_id as categoryId
         FROM uied_website_category
         WHERE is_delete = 0 AND website_id IN (?) AND category_id IN (?)`,
        {
          replacements: [ websites.map(item => item.id), queryCategoryIds ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      )
      : [];
    const websiteCategoryMap = new Map();
    (Array.isArray(websiteCategoryRows) ? websiteCategoryRows : []).forEach(item => {
      const websiteId = Number.parseInt(String(item?.websiteId || 0), 10);
      const categoryId = Number.parseInt(String(item?.categoryId || 0), 10);
      if (!Number.isInteger(websiteId) || websiteId <= 0) return;
      if (!Number.isInteger(categoryId) || categoryId <= 0) return;
      if (!websiteCategoryMap.has(websiteId)) {
        websiteCategoryMap.set(websiteId, new Set());
      }
      websiteCategoryMap.get(websiteId).add(categoryId);
    });

    const websitesByCategory = {};
    for (const website of websites) {
      const tagBundle = this.parseWebsiteTagBundle(website.tags);
      const websiteItem = {
        id: String(website.id),
        name: website.name,
        description: website.description || '',
        url: website.url,
        iconUrl: website.iconUrl,
        isHot: website.isHot === 1,
        isFeatured: website.isFeatured === 1,
        isNew: website.isNew === 1,
        isPinned: website.isPinned === 1,
        sortOrder: Number(website.sortOrder || 0),
        createdAt: Number(website.createdAt || 0),
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
      const categorySet = websiteCategoryMap.get(Number(website.id || 0)) || new Set();
      const primaryCategoryId = Number.parseInt(String(website.categoryId || 0), 10);
      if (Number.isInteger(primaryCategoryId) && primaryCategoryId > 0) {
        categorySet.add(primaryCategoryId);
      }
      const effectiveCategoryIds = Array.from(categorySet)
        .filter(item => queryCategoryIds.includes(item));
      if (effectiveCategoryIds.length === 0) continue;
      effectiveCategoryIds.forEach(categoryId => {
        const categoryKey = String(categoryId);
        if (!websitesByCategory[categoryKey]) {
          websitesByCategory[categoryKey] = [];
        }
        websitesByCategory[categoryKey].push(websiteItem);
      });
    }

    /**
     * 按前台运营权重排序网站，保证主分类聚合列表与后台排序语义一致。
     */
    const compareWebsiteOperationalOrder = (left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      if (left.isHot !== right.isHot) return left.isHot ? -1 : 1;
      if (left.isFeatured !== right.isFeatured) return left.isFeatured ? -1 : 1;
      const sortDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
      if (sortDiff !== 0) return sortDiff;
      return Number(right.id || 0) - Number(left.id || 0);
    };

    // 为每个主分类填充网站（合并其所有子分类的网站，并按 ID 去重）
    for (const cat of categoriesWithSubs) {
      const catWebsiteMap = new Map();
      // 添加直接关联到主分类的网站
      if (websitesByCategory[cat.id]) {
        websitesByCategory[cat.id].forEach(item => catWebsiteMap.set(item.id, item));
      }
      // 添加子分类的网站
      for (const sub of cat.subCategories) {
        if (websitesByCategory[sub.id]) {
          websitesByCategory[sub.id].forEach(item => catWebsiteMap.set(item.id, item));
        }
      }
      cat.websites = Array.from(catWebsiteMap.values()).sort(compareWebsiteOperationalOrder);
    }

    return {
      page: {
        id: String(page.id),
        name: page.name,
        slug: page.slug,
        type: page.type,
        icon: page.icon,
        description: page.description,
        heroTitle: page.hero_title,
        heroHighlightText: page.hero_highlight_text,
        heroSubtitle: page.hero_subtitle,
        hotSearchTags: this.safeJsonParse(page.hot_search_tags, []),
        hotSearchMode: this.normalizeHotSearchMode(page.hot_search_mode),
        hotSearchFixedCount: this.normalizeHotSearchNumber(page.hot_search_fixed_count, 4, 0, 20),
        hotSearchDynamicCount: this.normalizeHotSearchNumber(page.hot_search_dynamic_count, 6, 0, 20),
        hotSearchWindowDays: this.normalizeHotSearchNumber(page.hot_search_window_days, 7, 1, 30),
        hotSearchMinScore: this.normalizeHotSearchNumber(page.hot_search_min_score, 1, 1, 1000000),
        heroDisplayMode: page.hero_display_mode || 'search',
        heroScrollWebsites: page.hero_scroll_websites ? JSON.stringify(this.safeJsonParse(page.hero_scroll_websites, [])) : null,
        heroBgType: page.hero_bg_type || 'default',
        heroBgValue: page.hero_bg_value,
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
      },
      categories: categoriesWithSubs,
      websitesByCategory,
      stats: {
        totalCategories: categoriesWithSubs.length,
        totalWebsites: websites.length,
      },
    };
  }

  /**
   * 获取页面热门推荐
   */
  async getPageHotWebsites(slug, limit = 12) {
    const { app } = this;
    await this.ensureWebsiteCategoryTable();
    const safeLimit = this.parseBoundedInteger(limit, 12, 1, 100);

    // 获取页面
    const [ page ] = await app.model.query(
      'SELECT id FROM uied_page WHERE slug = ? AND is_delete = 0',
      { replacements: [ slug ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!page) return [];

    // 获取页面关联的分类ID
    const categoryIds = await this.getPageCategoryIds(page.id);
    if (categoryIds.length === 0) return [];
    const categoryFilter = this.buildWebsiteCategoryFilterCondition(categoryIds, 'w');

    // 获取热门网站
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.description, w.url, w.icon_url as iconUrl,
              w.is_hot as isHot, w.is_featured as isFeatured, w.is_new as isNew, w.tags
       FROM uied_website w
       WHERE ${categoryFilter.sql} AND w.is_delete = 0 AND ${this.getPublicWebsiteStatusCondition('w')} AND w.is_hot = 1
       ORDER BY w.is_featured DESC, w.sort ASC
      LIMIT ?`,
      {
        replacements: [ ...categoryFilter.replacements, safeLimit ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return websites.map(w => {
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      return {
        ...w,
        id: String(w.id),
        isHot: w.isHot === 1,
        isFeatured: w.isFeatured === 1,
        isNew: w.isNew === 1,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });
  }

  /**
   * 获取页面热门标签
   */
  async getPageHotTags(slug, limit = 10) {
    const { app } = this;
    await this.ensureWebsiteCategoryTable();
    await this.ensureWebsiteClickDailyTable();
    await this.ensurePageShowBannerColumn();
    const safeLimit = Number.isInteger(parseInt(limit, 10))
      ? Math.max(1, Math.min(30, parseInt(limit, 10)))
      : 10;

    // 获取页面
    const [ page ] = await app.model.query(
      `SELECT id, hot_search_tags, hot_search_mode, hot_search_fixed_count,
              hot_search_dynamic_count, hot_search_window_days, hot_search_min_score
       FROM uied_page
       WHERE slug = ? AND is_delete = 0`,
      { replacements: [ slug ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!page) return { tags: [], websites: [] };
    const hotTagConfig = this.resolvePageHotTagConfig(page, safeLimit);

    // 获取页面关联的分类ID
    const categoryIds = await this.getPageCategoryIds(page.id);
    if (categoryIds.length === 0) return { tags: [], websites: [] };
    const categoryFilter = this.buildWebsiteCategoryFilterCondition(categoryIds, 'w');
    const pageCustomTags = this.safeJsonParse(page.hot_search_tags, [])
      .map(item => String(item || '').trim())
      .filter(Boolean);
    const cacheKey = this.buildPageHotTagsCacheKey(slug, categoryIds, hotTagConfig);

    /**
     * 热门搜索接口增加 5 分钟缓存，避免频繁刷新引发标签抖动与数据库压力。
     */
    try {
      const cached = await app.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.tags) && Array.isArray(parsed.websites)) {
          return parsed;
        }
      }
    } catch (error) {
      this.ctx.logger.warn('[uied.frontend] 读取页面热门标签缓存失败（继续实时计算）: %s', error?.message || error);
    }

    const metricDateStart = this.resolveMetricDateLowerBound(hotTagConfig.windowDays);
    const dynamicFetchLimit = Math.max(safeLimit * 8, (hotTagConfig.fixedCount + hotTagConfig.dynamicCount) * 6);

    // 按最近 N 天点击数获取候选网站（优先最近热度）
    let topWebsites = await app.model.query(
      `SELECT w.id, w.name, w.tags, w.click_count as clickCount,
              COALESCE(SUM(d.click_count), 0) as recentClicks
       FROM uied_website w
       LEFT JOIN uied_website_click_daily d
         ON d.website_id = w.id AND d.metric_date >= ?
       WHERE ${categoryFilter.sql}
         AND w.is_delete = 0
         AND ${this.getPublicWebsiteStatusCondition('w')}
       GROUP BY w.id, w.name, w.tags, w.click_count
       HAVING recentClicks > 0 OR clickCount > 0
       ORDER BY recentClicks DESC, clickCount DESC, w.is_hot DESC, w.is_featured DESC, w.id DESC
       LIMIT ?`,
      {
        replacements: [ metricDateStart, ...categoryFilter.replacements, dynamicFetchLimit ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    // 如果近期点击不足，回退到全量点击 + 运营标记
    if (topWebsites.length === 0) {
      topWebsites = await app.model.query(
        `SELECT w.id, w.name, w.click_count as clickCount, w.tags, 0 as recentClicks
         FROM uied_website w
         WHERE ${categoryFilter.sql} AND w.is_delete = 0 AND ${this.getPublicWebsiteStatusCondition('w')}
           AND (w.is_hot = 1 OR w.is_featured = 1)
         ORDER BY w.is_hot DESC, w.is_featured DESC, w.sort ASC
         LIMIT ?`,
        {
          replacements: [ ...categoryFilter.replacements, dynamicFetchLimit ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
    }

    /**
     * 统计页面范围内标签热度：
     * - recentClicks 提升近期热词权重；
     * - clickCount 保留历史热度兜底；
     * - rankBonus 减少同分并提升头部稳定性。
     */
    const buildDynamicTags = () => {
      const scoreMap = new Map();
      (Array.isArray(topWebsites) ? topWebsites : []).forEach((website, index) => {
        const recentClicks = Number.parseInt(String(website?.recentClicks || 0), 10) || 0;
        const clickCount = Number.parseInt(String(website?.clickCount || 0), 10) || 0;
        const rankBonus = Math.max(dynamicFetchLimit - index, 1);
        const weight = recentClicks * 10 + clickCount + rankBonus;
        const tagBundle = this.parseWebsiteTagBundle(website?.tags);
        const tags = Array.from(new Set((tagBundle?.tags || []).map(item => String(item || '').trim()).filter(Boolean)));
        tags.forEach(tag => {
          const prev = Number(scoreMap.get(tag) || 0);
          scoreMap.set(tag, prev + weight);
        });
      });
      return Array.from(scoreMap.entries())
        .filter(item => Number(item[1] || 0) >= hotTagConfig.minScore)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, Math.max(safeLimit * 2, hotTagConfig.dynamicCount + hotTagConfig.fixedCount))
        .map(item => String(item[0]));
    };

    const dynamicTags = buildDynamicTags();
    const fixedTags = pageCustomTags.slice(0, hotTagConfig.fixedCount);
    const dynamicQuota = Math.max(0, Math.min(hotTagConfig.dynamicCount, safeLimit));
    const dynamicOnlyTags = dynamicTags.slice(0, dynamicQuota > 0 ? dynamicQuota : safeLimit);
    let resolvedTags = [];

    if (hotTagConfig.mode === 'custom_only') {
      resolvedTags = pageCustomTags.slice(0, safeLimit);
    } else if (hotTagConfig.mode === 'dynamic_only') {
      resolvedTags = dynamicOnlyTags.slice(0, safeLimit);
      if (resolvedTags.length === 0) {
        resolvedTags = pageCustomTags.slice(0, safeLimit);
      }
    } else {
      const dynamicFillTags = dynamicTags
        .filter(tag => !fixedTags.includes(tag))
        .slice(0, dynamicQuota);
      resolvedTags = [ ...fixedTags, ...dynamicFillTags ].slice(0, safeLimit);
      if (resolvedTags.length === 0) {
        resolvedTags = dynamicTags.slice(0, safeLimit);
      }
      if (resolvedTags.length === 0) {
        resolvedTags = pageCustomTags.slice(0, safeLimit);
      }
    }

    const response = {
      tags: resolvedTags,
      websites: topWebsites.slice(0, safeLimit * 2).map(w => ({
        id: String(w.id),
        name: w.name,
        clickCount: Number(w.clickCount || 0),
        recentClicks: Number(w.recentClicks || 0),
      })),
    };

    try {
      await app.redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
    } catch (error) {
      this.ctx.logger.warn('[uied.frontend] 写入页面热门标签缓存失败（继续返回实时结果）: %s', error?.message || error);
    }
    return response;
  }

  /**
   * 搜索页面内的网站
   */
  async searchPageWebsites(slug, query, limit = 50) {
    const { app } = this;
    await this.ensureWebsiteCategoryTable();
    const safeLimit = this.parseBoundedInteger(limit, 50, 1, 100);

    if (!query) {
      return { results: [], total: 0, query: '', suggestions: [], recommendations: [] };
    }

    // 获取页面
    const [ page ] = await app.model.query(
      'SELECT id FROM uied_page WHERE slug = ? AND is_delete = 0',
      { replacements: [ slug ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!page) {
      return { results: [], total: 0, query, suggestions: [], recommendations: [] };
    }

    // 获取页面关联的分类ID
    const categoryIds = await this.getPageCategoryIds(page.id);
    if (categoryIds.length === 0) {
      return { results: [], total: 0, query, suggestions: [], recommendations: [] };
    }
    const categoryFilter = this.buildWebsiteCategoryFilterCondition(categoryIds, 'w');

    // 搜索网站
    const searchPattern = `%${query}%`;
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.description, w.url, w.icon_url as iconUrl,
              w.is_hot as isHot, w.is_featured as isFeatured, w.is_new as isNew, w.tags
       FROM uied_website w
       WHERE ${categoryFilter.sql}
         AND w.is_delete = 0
         AND ${this.getPublicWebsiteStatusCondition('w')}
         AND (w.name LIKE ? OR w.description LIKE ? OR w.tags LIKE ?)
       ORDER BY w.is_hot DESC, w.is_featured DESC
       LIMIT ?`,
      {
        replacements: [
          ...categoryFilter.replacements,
          searchPattern,
          searchPattern,
          searchPattern,
          safeLimit,
        ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const results = websites.map(w => {
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      return {
        ...w,
        id: String(w.id),
        isHot: w.isHot === 1,
        isFeatured: w.isFeatured === 1,
        isNew: w.isNew === 1,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
        score: this.calculateRelevanceScore(w, query),
      };
    });

    // 按相关性排序
    results.sort((a, b) => b.score - a.score);

    // 如果没有结果，获取热门推荐
    let recommendations = [];
    if (results.length === 0) {
      recommendations = await this.getPageHotWebsites(slug, 8);
    }

    return {
      results,
      total: results.length,
      query,
      suggestions: [],
      recommendations,
    };
  }

  /**
   * 获取页面关联的所有分类ID（包括子分类）
   */
  async getPageCategoryIds(pageId) {
    const { app } = this;

    // 获取主分类
    const mainCategories = await app.model.query(
      `SELECT c.id FROM uied_category c
       INNER JOIN uied_page_category pc ON c.id = pc.category_id
       WHERE pc.page_id = ? AND pc.is_delete = 0 AND c.is_delete = 0 AND c.is_show = 1`,
      { replacements: [ pageId ], type: app.Sequelize.QueryTypes.SELECT }
    );

    const mainCategoryIds = mainCategories.map(c => c.id);
    const allCategoryIds = [ ...mainCategoryIds ];

    // 获取子分类（网站主要关联子分类）
    if (mainCategoryIds.length > 0) {
      const placeholders = mainCategoryIds.map(() => '?').join(',');
      const subCategories = await app.model.query(
        `SELECT id FROM uied_category
         WHERE parent_id IN (${placeholders}) AND is_delete = 0 AND is_show = 1`,
        { replacements: mainCategoryIds, type: app.Sequelize.QueryTypes.SELECT }
      );

      for (const sub of subCategories) {
        allCategoryIds.push(sub.id);
      }
    }

    return Array.from(new Set(
      allCategoryIds
        .map(item => Number.parseInt(String(item || 0), 10))
        .filter(item => Number.isInteger(item) && item > 0)
    ));
  }

  /**
   * 计算搜索相关性分数
   */
  calculateRelevanceScore(website, keyword) {
    const lowerKeyword = keyword.toLowerCase();
    let score = 0;

    if (website.name) {
      const lowerName = website.name.toLowerCase();
      if (lowerName === lowerKeyword) score += 100;
      else if (lowerName.startsWith(lowerKeyword)) score += 50;
      else if (lowerName.includes(lowerKeyword)) score += 30;
    }

    if (website.description && website.description.toLowerCase().includes(lowerKeyword)) {
      score += 10;
    }

    if (website.isHot) score += 3;
    if (website.isFeatured) score += 2;
    if (website.isNew) score += 1;

    return score;
  }

  /**
   * 通过 ID 列表获取网站（支持新数字ID和旧cuid格式）
   */
  async getWebsitesByIds(ids) {
    const { app } = this;

    if (!ids || ids.length === 0) return [];

    // 分离数字ID和字符串ID（旧cuid格式）
    const numericIds = [];
    const stringIds = [];

    for (const id of ids) {
      if (typeof id === 'number' || /^\d+$/.test(String(id))) {
        numericIds.push(parseInt(id));
      } else {
        stringIds.push(String(id));
      }
    }

    const websites = [];

    // 查询数字ID
    if (numericIds.length > 0) {
      const placeholders = numericIds.map(() => '?').join(',');
      const result = await app.model.query(
        `SELECT id, old_id as oldId, name, description, url, icon_url as iconUrl,
                is_hot as isHot, is_featured as isFeatured, is_new as isNew, tags
         FROM uied_website
         WHERE id IN (${placeholders}) AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}`,
        { replacements: numericIds, type: app.Sequelize.QueryTypes.SELECT }
      );
      websites.push(...result);
    }

    // 查询旧cuid格式ID
    if (stringIds.length > 0) {
      const placeholders = stringIds.map(() => '?').join(',');
      const result = await app.model.query(
        `SELECT id, old_id as oldId, name, description, url, icon_url as iconUrl,
                is_hot as isHot, is_featured as isFeatured, is_new as isNew, tags
         FROM uied_website
         WHERE old_id IN (${placeholders}) AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}`,
        { replacements: stringIds, type: app.Sequelize.QueryTypes.SELECT }
      );
      websites.push(...result);
    }

    return websites.map(w => {
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      return {
        id: String(w.id),
        oldId: w.oldId,
        name: w.name,
        description: w.description || '',
        url: w.url,
        iconUrl: w.iconUrl,
        isHot: w.isHot === 1,
        isFeatured: w.isFeatured === 1,
        isNew: w.isNew === 1,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });
  }

  /**
   * 获取热门网站列表
   */
  async getHotWebsites(limit = 100) {
    const { app } = this;

    const websites = await app.model.query(
      `SELECT id, name, description, url, icon_url as iconUrl,
              is_hot as isHot, is_featured as isFeatured, is_new as isNew, tags
       FROM uied_website
       WHERE is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()} AND (is_hot = 1 OR is_featured = 1)
       ORDER BY is_hot DESC, is_featured DESC, click_count DESC
       LIMIT ?`,
      { replacements: [ limit ], type: app.Sequelize.QueryTypes.SELECT }
    );

    return websites.map(w => {
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      return {
        id: String(w.id),
        name: w.name,
        description: w.description || '',
        url: w.url,
        iconUrl: w.iconUrl,
        isHot: w.isHot === 1,
        isFeatured: w.isFeatured === 1,
        isNew: w.isNew === 1,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });
  }

  /**
   * 获取“每日上新”网站列表（按最新时间倒序：update_time 优先，回退 create_time）
   */
  async getDailyNewWebsites(options = {}) {
    const { app } = this;
    await this.ensureWebsiteCategoryTable();
    const page = this.parseBoundedInteger(options.page, 1, 1, 999999);
    const pageSize = this.parseBoundedInteger(options.pageSize, 24, 1, 100);
    const days = this.parseBoundedInteger(options.days, 7, 1, 30);
    const pageSlug = String(options.pageSlug || '').trim();
    const sortBy = String(options.sortBy || 'latest').trim().toLowerCase();
    const offset = (page - 1) * pageSize;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sinceTimestamp = Math.floor(startOfToday.getTime() / 1000) - (days - 1) * 24 * 60 * 60;
    const latestTimeExpr = 'GREATEST(IFNULL(w.update_time, 0), IFNULL(w.create_time, 0))';
    const supportedSortModes = [ 'latest', 'hot', 'rank' ];
    const normalizedSortBy = supportedSortModes.includes(sortBy) ? sortBy : 'latest';
    let orderBySql = `${latestTimeExpr} DESC, w.is_pinned DESC, w.is_hot DESC, w.id DESC`;

    /**
     * “每日上新”支持三种排序：
     * - latest：按发布时间倒序（默认）
     * - hot：按热度(click_count)倒序
     * - rank：综合推荐（置顶/热门/精选 + 热度 + 时间）
     */
    if (normalizedSortBy === 'hot') {
      orderBySql = `w.click_count DESC, ${latestTimeExpr} DESC, w.is_hot DESC, w.id DESC`;
    } else if (normalizedSortBy === 'rank') {
      orderBySql = `w.is_pinned DESC, w.is_hot DESC, w.is_featured DESC, w.click_count DESC, ${latestTimeExpr} DESC, w.id DESC`;
    }

    let whereSql = `w.is_delete = 0 AND ${this.getPublicWebsiteStatusCondition('w')} AND ${latestTimeExpr} >= ?`;
    const replacements = [ sinceTimestamp ];
    let pageCategoryIds = [];

    if (pageSlug) {
      const [ pageRow ] = await app.model.query(
        'SELECT id FROM uied_page WHERE slug = ? AND is_delete = 0',
        { replacements: [ pageSlug ], type: app.Sequelize.QueryTypes.SELECT }
      );
      pageCategoryIds = pageRow ? await this.getPageCategoryIds(pageRow.id) : [];
      if (pageCategoryIds.length === 0) {
        whereSql += ' AND 1 = 0';
      } else {
        const categoryFilter = this.buildWebsiteCategoryFilterCondition(pageCategoryIds, 'w');
        whereSql += ` AND ${categoryFilter.sql}`;
        replacements.push(...categoryFilter.replacements);
      }
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) as total
       FROM uied_website w
       WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const list = await app.model.query(
      `SELECT w.id, w.slug, w.name, w.description, w.url, w.icon_url as iconUrl,
              w.is_hot as isHot, w.is_featured as isFeatured, w.is_new as isNew,
              w.is_pinned as isPinned, w.sort as sortOrder,
              w.category_id as categoryId,
              w.tags, w.create_time as createTime, w.update_time as updateTime,
              ${latestTimeExpr} as latestTime,
              w.click_count as clickCount,
              c.name as categoryName, c.slug as categorySlug
       FROM uied_website w
       LEFT JOIN uied_category c ON c.id = w.category_id AND c.is_delete = 0 AND c.is_show = 1
       WHERE ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    /**
     * 当通过多分类命中页面时，返回命中的页面分类，避免显示成站点主分类。
     */
    const pageMatchedCategoryMap = new Map();
    if (pageCategoryIds.length > 0 && list.length > 0) {
      const matchedRows = await app.model.query(
        `SELECT uwc.website_id as websiteId, c.name as categoryName, c.slug as categorySlug
         FROM uied_website_category uwc
         INNER JOIN uied_category c ON c.id = uwc.category_id
         WHERE uwc.is_delete = 0
           AND c.is_delete = 0
           AND c.is_show = 1
           AND uwc.website_id IN (?)
           AND uwc.category_id IN (?)
         ORDER BY uwc.website_id ASC, uwc.sort ASC, uwc.id ASC`,
        {
          replacements: [ list.map(item => item.id), pageCategoryIds ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      (Array.isArray(matchedRows) ? matchedRows : []).forEach(row => {
        const websiteId = Number(row?.websiteId || 0);
        if (!Number.isInteger(websiteId) || websiteId <= 0) return;
        if (pageMatchedCategoryMap.has(websiteId)) return;
        pageMatchedCategoryMap.set(websiteId, {
          categoryName: row.categoryName || '',
          categorySlug: row.categorySlug || '',
        });
      });
    }

    const websites = list.map(item => {
      const tagBundle = this.parseWebsiteTagBundle(item.tags);
      const primaryCategoryId = Number(item.categoryId || 0);
      const primaryCategoryInPage = pageCategoryIds.length === 0 || pageCategoryIds.includes(primaryCategoryId);
      const matchedCategory = primaryCategoryInPage
        ? null
        : pageMatchedCategoryMap.get(Number(item.id || 0));
      return {
        id: String(item.id),
        slug: String(item.slug || ''),
        name: item.name,
        description: item.description || '',
        url: item.url,
        iconUrl: item.iconUrl || '',
        isHot: item.isHot === 1,
        isFeatured: item.isFeatured === 1,
        isNew: item.isNew === 1,
        isPinned: item.isPinned === 1,
        sortOrder: Number(item.sortOrder || 0),
        clickCount: Number(item.clickCount || 0),
        category: matchedCategory?.categoryName || item.categoryName || '',
        categorySlug: matchedCategory?.categorySlug || item.categorySlug || '',
        createdAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : '',
        updatedAt: item.updateTime ? new Date(item.updateTime * 1000).toISOString() : '',
        latestAt: item.latestTime ? new Date(item.latestTime * 1000).toISOString() : '',
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });

    return {
      list: websites,
      total: Number(countRow?.total || 0),
      page,
      pageSize,
      days,
      sortBy: normalizedSortBy,
      since: new Date(sinceTimestamp * 1000).toISOString(),
      hasMore: page * pageSize < Number(countRow?.total || 0),
    };
  }

  /**
   * 获取网站详情（前端）
   * @param {string} idOrSlug - 网站ID或slug
   * @param {Object} options 额外选项
   * @param {boolean} options.includeUnpublished - 是否包含未发布内容（草稿预览）
   */
  async getWebsiteDetail(idOrSlug, options = {}) {
    const { app } = this;
    const includeUnpublished = options?.includeUnpublished === true;
    const statusCondition = includeUnpublished ? '' : ` AND ${this.getPublicWebsiteStatusCondition('w')}`;
    const normalizedIdOrSlug = String(idOrSlug || '').trim();
    const isNumericId = /^\d+$/.test(normalizedIdOrSlug);

    /**
     * 统一执行详情查询 SQL，避免多处分支重复拼接字段列表。
     */
    const queryWebsiteDetail = async (whereSql, replacements) => {
      const [ row ] = await app.model.query(
        `SELECT w.*, c.name as category_name, c.slug as category_slug, c.id as cat_id,
                c.parent_id as category_parent_id
         FROM uied_website w
         LEFT JOIN uied_category c ON w.category_id = c.id
         WHERE ${whereSql}`,
        { replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
      return row || null;
    };

    // 先尝试按 ID 查询，再按 slug 查询
    let website;
    if (isNumericId) {
      website = await queryWebsiteDetail(
        `(w.id = ? OR w.old_id = ?) AND w.is_delete = 0${statusCondition}`,
        [ normalizedIdOrSlug, normalizedIdOrSlug ]
      );
      if (!website) return null;
    }

    if (!website) {
      website = await queryWebsiteDetail(
        `w.slug = ? AND w.is_delete = 0${statusCondition}`,
        [ normalizedIdOrSlug ]
      );
    }

    if (!website) return null;

    // 获取父分类信息
    let parentCategory = null;
    if (website.category_parent_id) {
      [ parentCategory ] = await app.model.query(
        'SELECT id, name, slug FROM uied_category WHERE id = ? AND is_delete = 0',
        { replacements: [ website.category_parent_id ], type: app.Sequelize.QueryTypes.SELECT }
      );
    }

    /**
     * 汇总互动数据（评分/收藏/点赞）
     * 说明：失败时不阻断详情页主流程，前端使用默认值兜底。
     */
    let interactionSummary = {
      userRating: 0,
      averageRating: 0,
      totalRatings: 0,
      favorited: false,
      totalFavorites: 0,
      isLiked: false,
      likeCount: 0,
    };
    try {
      interactionSummary = {
        ...interactionSummary,
        ...(await this.ctx.service.uied.websiteInteraction.getWebsiteInteractionSummary(website.id)),
      };
    } catch (error) {
      this.ctx.logger.warn('[frontend] 获取网站互动汇总失败，使用默认值:', error.message);
    }

    /**
     * 统计网站评论数（已审核）
     * 说明：与互动汇总分开处理，避免评论表异常影响详情页主流程。
     */
    let commentsCount = 0;
    try {
      const [ commentCountRow ] = await app.model.query(
        `SELECT COUNT(1) AS total
         FROM uied_website_comment
         WHERE website_id = ? AND is_delete = 0 AND status = 'approved'`,
        {
          replacements: [ website.id ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      commentsCount = Number(commentCountRow?.total || 0);
    } catch (error) {
      this.ctx.logger.warn('[frontend] 统计网站评论数失败，使用默认值:', error.message);
    }

    /**
     * 读取网站访问数据（高级版）
     * 说明：手动录入数据为可选项，失败不影响详情页主流程。
     */
    let trafficMetrics = null;
    try {
      trafficMetrics = await this.ctx.service.uied.websiteTrafficMetric.getByWebsiteId(website.id);
    } catch (error) {
      this.ctx.logger.warn('[frontend] 获取网站访问数据失败，使用默认值:', error.message);
    }

    const tagBundle = this.parseWebsiteTagBundle(website.tags);
    return {
      id: String(website.id),
      name: website.name,
      slug: website.slug,
      description: website.description || '',
      url: website.url,
      iconUrl: website.icon_url,
      category: {
        id: String(website.cat_id || website.category_id),
        name: website.category_name || '未分类',
        slug: website.category_slug,
        parent: parentCategory ? {
          id: String(parentCategory.id),
          name: parentCategory.name,
          slug: parentCategory.slug,
        } : null,
      },
      tags: tagBundle.tags,
      weightTags: tagBundle.weightTags,
      seoTitle: website.seo_title,
      seoDescription: website.seo_description,
      seoKeywords: website.seo_keywords,
      detailContent: website.detail_content,
      screenshots: website.screenshots ? this.safeJsonParse(website.screenshots, []) : [],
      thumbnail: website.thumbnail,
      visitBtnText: website.visit_btn_text,
      averageRating: Number(interactionSummary.averageRating || 0),
      totalRatings: Number(interactionSummary.totalRatings || 0),
      userRating: Number(interactionSummary.userRating || 0),
      isFavorited: interactionSummary.favorited === true,
      totalFavorites: Number(interactionSummary.totalFavorites || 0),
      isLiked: interactionSummary.isLiked === true,
      likeCount: Number(interactionSummary.likeCount || 0),
      commentsCount,
      trafficMetrics,
      status: String(website.status || '').trim(),
      statusReason: String(website.status_message || website.check_error || '').trim(),
      lastCheckedAt: (() => {
        const raw = Number(website.last_checked_at || website.last_check_time || 0);
        if (!Number.isFinite(raw) || raw <= 0) return null;
        const milliseconds = raw > 9999999999 ? raw : raw * 1000;
        return new Date(milliseconds).toISOString();
      })(),
      createdAt: website.create_time ? new Date(website.create_time * 1000).toISOString() : null,
      updatedAt: website.update_time ? new Date(website.update_time * 1000).toISOString() : null,
    };
  }

  /**
   * 获取相关推荐网站（支持同分类/同标签/热门/手动）
   * @param {string} websiteId 网站ID
   * @param {number|{limit?: number, mode?: string, manualIds?: string}} options 参数
   */
  async getRelatedWebsites(websiteId, options = 6) {
    const { app } = this;
    const normalizedOptions = typeof options === 'number'
      ? { limit: options, mode: 'same_category', manualIds: '' }
      : {
        limit: Number.parseInt(String(options?.limit || 6), 10) || 6,
        mode: String(options?.mode || 'same_category').trim(),
        manualIds: String(options?.manualIds || '').trim(),
      };
    const limit = Math.max(1, Math.min(12, normalizedOptions.limit || 6));

    // 获取当前网站的分类
    const [ website ] = await app.model.query(
      `SELECT id, category_id, tags FROM uied_website
       WHERE id = ? AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}`,
      { replacements: [ websiteId ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!website) return [];

    /**
     * 统一格式化结果，供详情页侧边栏展示
     * @param {Array<object>} rows 原始行数据
     * @return {Array<object>} 规范化结果
     */
    const formatRows = rows => (Array.isArray(rows) ? rows : []).map(w => ({
      id: String(w.id),
      name: w.name,
      slug: w.slug,
      description: w.description || '',
      url: w.url,
      iconUrl: w.iconUrl || w.icon_url || '',
    }));

    const mode = [ 'same_category', 'same_tags', 'hot', 'manual' ].includes(normalizedOptions.mode)
      ? normalizedOptions.mode
      : 'same_category';

    if (mode === 'manual') {
      const idList = normalizedOptions.manualIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .filter(id => id !== String(websiteId));
      if (!idList.length) return [];
      const manualList = await this.getWebsitesByIds(idList);
      return (Array.isArray(manualList) ? manualList : []).slice(0, limit);
    }

    if (mode === 'hot') {
      const rows = await app.model.query(
        `SELECT id, name, slug, description, url, icon_url as iconUrl
         FROM uied_website
         WHERE id != ? AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}
         ORDER BY is_hot DESC, is_featured DESC, click_count DESC, sort ASC
         LIMIT ?`,
        { replacements: [ websiteId, limit ], type: app.Sequelize.QueryTypes.SELECT }
      );
      return formatRows(rows);
    }

    if (mode === 'same_tags') {
      const tags = this.parseWebsiteTagBundle(website.tags).tags
        .slice(0, 5);
      if (!tags.length) {
        return await this.getRelatedWebsites(websiteId, { limit, mode: 'same_category' });
      }
      const likeClauses = tags.map(() => 'tags LIKE ?').join(' OR ');
      const likeValues = tags.map(tag => `%${tag}%`);
      const rows = await app.model.query(
        `SELECT id, name, slug, description, url, icon_url as iconUrl
         FROM uied_website
         WHERE id != ? AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}
           AND (${likeClauses})
         ORDER BY is_hot DESC, is_featured DESC, click_count DESC, sort ASC
         LIMIT ?`,
        {
          replacements: [ websiteId, ...likeValues, limit ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      return formatRows(rows);
    }

    // 获取同分类的其他网站
    const related = await app.model.query(
      `SELECT id, name, slug, description, url, icon_url as iconUrl, category_id
       FROM uied_website
       WHERE category_id = ? AND id != ? AND is_delete = 0 AND ${this.getPublicWebsiteStatusCondition()}
       ORDER BY is_hot DESC, is_featured DESC, click_count DESC
       LIMIT ?`,
      { replacements: [ website.category_id, websiteId, limit ], type: app.Sequelize.QueryTypes.SELECT }
    );
    return formatRows(related);
  }

  /**
   * 生成网站对比 AI 分析文案（复用后台 AI 配置服务）
   * @param {string} leftIdOrSlug 左侧网站ID或slug
   * @param {string} rightIdOrSlug 右侧网站ID或slug
   * @return {Promise<object>} AI 分析结果
   */
  async getWebsiteCompareAiAnalysis(leftIdOrSlug, rightIdOrSlug) {
    const left = String(leftIdOrSlug || '').trim();
    const right = String(rightIdOrSlug || '').trim();
    if (!left || !right) {
      throw new Error('缺少对比网站参数');
    }
    if (left === right) {
      throw new Error('请选择两个不同的网站进行对比');
    }

    const [ leftWebsite, rightWebsite ] = await Promise.all([
      this.getWebsiteDetail(left),
      this.getWebsiteDetail(right),
    ]);
    if (!leftWebsite || !rightWebsite) {
      throw new Error('对比网站不存在或已下线');
    }

    const leftTags = Array.isArray(leftWebsite.tags) ? leftWebsite.tags.slice(0, 10) : [];
    const rightTags = Array.isArray(rightWebsite.tags) ? rightWebsite.tags.slice(0, 10) : [];
    const leftTraffic = leftWebsite.trafficMetrics || {};
    const rightTraffic = rightWebsite.trafficMetrics || {};

    const prompt = [
      '请为以下两个网站输出一份中文对比分析，使用 Markdown 格式。',
      '要求：',
      '1. 输出结构固定为：概览结论、核心差异、适用人群、选择建议、风险提示',
      '2. 不要编造无法确认的数据；没有数据就明确写“未录入/未知”',
      '3. 语气专业、简洁，适合直接展示在导航站详情对比页',
      '4. 每个小节用二级标题（##）',
      '',
      '左侧网站：',
      `- 名称：${leftWebsite.name}`,
      `- 分类：${leftWebsite.category?.name || '未分类'}`,
      `- 描述：${leftWebsite.description || '无'}`,
      `- 标签：${leftTags.join('、') || '无'}`,
      `- 点赞：${Number(leftWebsite.likeCount || 0)}`,
      `- 收藏：${Number(leftWebsite.totalFavorites || 0)}`,
      `- 评论：${Number(leftWebsite.commentsCount || 0)}`,
      `- 月访问量：${Number(leftTraffic.monthlyVisits || 0) || '未录入'}`,
      `- 平均访问时长(秒)：${Number(leftTraffic.avgVisitDurationSeconds || 0) || '未录入'}`,
      `- 每次访问页数：${Number(leftTraffic.pagesPerVisit || 0) || '未录入'}`,
      `- 跳出率：${Number(leftTraffic.bounceRate || 0) ? `${Number(leftTraffic.bounceRate || 0)}%` : '未录入'}`,
      '',
      '右侧网站：',
      `- 名称：${rightWebsite.name}`,
      `- 分类：${rightWebsite.category?.name || '未分类'}`,
      `- 描述：${rightWebsite.description || '无'}`,
      `- 标签：${rightTags.join('、') || '无'}`,
      `- 点赞：${Number(rightWebsite.likeCount || 0)}`,
      `- 收藏：${Number(rightWebsite.totalFavorites || 0)}`,
      `- 评论：${Number(rightWebsite.commentsCount || 0)}`,
      `- 月访问量：${Number(rightTraffic.monthlyVisits || 0) || '未录入'}`,
      `- 平均访问时长(秒)：${Number(rightTraffic.avgVisitDurationSeconds || 0) || '未录入'}`,
      `- 每次访问页数：${Number(rightTraffic.pagesPerVisit || 0) || '未录入'}`,
      `- 跳出率：${Number(rightTraffic.bounceRate || 0) ? `${Number(rightTraffic.bounceRate || 0)}%` : '未录入'}`,
    ].join('\n');

    const result = await this.ctx.service.uied.aiConfig.chat(prompt, []);
    return {
      left: { id: String(leftWebsite.id), name: leftWebsite.name, slug: leftWebsite.slug || '' },
      right: { id: String(rightWebsite.id), name: rightWebsite.name, slug: rightWebsite.slug || '' },
      markdown: String(result?.reply || '').trim(),
      reasoningContent: String(result?.reasoningContent || '').trim(),
      usage: result?.usage || null,
    };
  }

  /**
   * 获取启用的 Favicon API 列表（按优先级排序）
   * 前端用于动态获取网站图标
   */
  async getFaviconApis() {
    const { app } = this;

    const apis = await app.model.query(
      `SELECT id, name, url_template as urlTemplate, description
       FROM uied_favicon_api
       WHERE is_delete = 0 AND is_enabled = 1
       ORDER BY sort ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return apis;
  }

  /**
   * 规范化 SEO 文本，去除首尾空白并提供兜底值。
   * @param {unknown} value 原始文本
   * @param {string} fallback 兜底文本
   * @return {string} 规范化文本
   */
  normalizeSeoText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || String(fallback || '').trim();
  }

  /**
   * 解析布尔值（兼容 0/1、true/false、yes/no 等形式）。
   * @param {unknown} value 原始值
   * @param {boolean} fallback 默认值
   * @return {boolean} 解析结果
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
   * 构建“标题 + 站点名”格式，避免重复追加站点名。
   * @param {unknown} title 页面标题
   * @param {unknown} siteName 站点名称
   * @return {string} 规范化标题
   */
  buildSeoTitle(title, siteName) {
    const resolvedSiteName = this.normalizeSeoText(siteName, 'UIED AI工具导航');
    const resolvedTitle = this.normalizeSeoText(title, resolvedSiteName);
    if (!resolvedTitle) return resolvedSiteName;
    if (!resolvedSiteName) return resolvedTitle;
    if (resolvedTitle.includes(resolvedSiteName)) return resolvedTitle;
    return `${resolvedTitle} - ${resolvedSiteName}`;
  }

  /**
   * 判断文章是否为不应进入搜索索引的测试占位内容。
   * @param {object} article 文章数据
   * @return {boolean} 是否应标记 noindex
   */
  isSeoPlaceholderArticle(article = {}) {
    const title = String(article?.title || '').trim();
    const slug = String(article?.slug || '').trim();
    const content = String(article?.content || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const placeholderTitle = /^(?:测试(?:文章)?|示例(?:文章)?|test(?:\s+article)?|demo)$/i.test(title);
    const placeholderSlug = /^(?:test|demo|ceshi)$/i.test(slug);
    return (placeholderTitle || placeholderSlug) && content.length < 200;
  }

  /**
   * 规范化路由路径，统一为以 "/" 开头且不带尾部 "/"（根路径除外）。
   * @param {unknown} inputPath 原始路径
   * @param {string} fallback 兜底路径
   * @return {string} 规范化路径
   */
  normalizeRoutePath(inputPath, fallback = '/') {
    const raw = String(inputPath || '').trim();
    if (!raw) return fallback;
    if (/^https?:\/\//i.test(raw)) return fallback;
    const purePath = raw.split('?')[0].split('#')[0].trim();
    if (!purePath || purePath === '/') return '/';
    const normalized = `/${purePath.replace(/^\/+/, '').replace(/\/+$/, '')}`;
    return normalized === '/' ? '/' : normalized;
  }

  /**
   * 根据固定链接配置生成网站详情页路径。
   * @param {object} permalinkConfig 固定链接配置
   * @param {number|string} websiteId 网站ID
   * @param {string} websiteSlug 网站slug
   * @return {string} 详情路径
   */
  buildWebsitePermalinkPath(permalinkConfig = {}, websiteId, websiteSlug = '') {
    const idText = String(websiteId || '').trim();
    const slugText = String(websiteSlug || '').trim() || idText;
    const structure = String(permalinkConfig?.structure || 'plain').trim().toLowerCase();
    const customPattern = String(permalinkConfig?.customPattern || '').trim();

    if (structure === 'id') {
      return this.normalizeRoutePath(`/website/${idText}.html`, `/website/${idText}`);
    }
    if (structure === 'name') {
      return this.normalizeRoutePath(`/website/${slugText}`, `/website/${idText}`);
    }
    if (structure === 'custom' && customPattern) {
      const resolved = customPattern
        .replace(/%id%/g, idText)
        .replace(/%slug%/g, slugText)
        .replace(/%name%/g, slugText);
      return this.normalizeRoutePath(`/website/${resolved}`, `/website/${idText}`);
    }
    return this.normalizeRoutePath(`/website/${idText}`, '/website');
  }

  /**
   * 构建前端预渲染所需的 SEO 路由清单（用于构建后生成静态路由 HTML）。
   * @param {object} options 选项
   * @param {string} options.siteOrigin 站点主域名（含协议）
   * @param {boolean} options.includeWebsiteDetails 是否包含网站详情路由
   * @param {number} options.websiteLimit 网站详情路由数量上限
   * @return {Promise<object>} SEO 预渲染清单
   */
  async buildSeoPrerenderManifest(options = {}) {
    const { app, ctx } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizeOriginText = value => String(value || '').trim().replace(/\/+$/, '');
    const requestOrigin = normalizeOriginText(ctx?.request?.origin || '');
    const siteOrigin = normalizeOriginText(
      options.siteOrigin
      || process.env.UIED_SITE_ORIGIN
      || process.env.SEO_SITE_ORIGIN
      || requestOrigin
      || 'http://127.0.0.1:3003'
    ) || 'http://127.0.0.1:3003';
    const includeWebsiteDetails = this.parseBoolean(options.includeWebsiteDetails, true);
    const rawWebsiteLimit = Number.parseInt(String(options.websiteLimit || 5000), 10);
    const websiteLimit = Number.isInteger(rawWebsiteLimit) && rawWebsiteLimit > 0
      ? Math.min(rawWebsiteLimit, 50000)
      : 5000;

    const siteInfo = (await ctx.service.uied.setting.getSiteInfo().catch(() => null)) || {};
    const siteName = this.normalizeSeoText(siteInfo.siteName, 'UIED AI工具导航');
    const siteTitle = this.buildSeoTitle(siteInfo.siteTitle || siteName, siteName);
    const siteDescription = this.normalizeSeoText(
      siteInfo.siteDescription || siteInfo.description,
      'UIED AI导航汇集全球优质AI工具与资源，涵盖AI写作、AI绘画、AI视频、AI办公、AI设计、AI编程等多个领域，帮助设计师、开发者与创作者快速发现和使用高效的人工智能工具。'
    );
    const siteKeywords = this.normalizeSeoText(
      siteInfo.siteKeywords || siteInfo.keywords,
      'UIED,UIED AI导航,AI导航,AI工具,AI工具导航,人工智能工具,AI写作,AI绘画,AI视频,AI办公,AI设计工具'
    );

    const routeMap = new Map();

    /**
     * 合并并写入一条路由 SEO 元数据，后写入值仅覆盖非空字段。
     * @param {object} route 路由对象
     */
    const upsertRoute = route => {
      const path = this.normalizeRoutePath(route?.path || '/');
      const existing = routeMap.get(path) || {};
      const noindex = route?.noindex === true
        ? true
        : (route?.noindex === false ? false : existing.noindex === true);
      const normalized = {
        path,
        canonicalPath: this.normalizeRoutePath(route?.canonicalPath || existing.canonicalPath || path),
        title: this.normalizeSeoText(route?.title, existing.title || siteTitle),
        description: this.normalizeSeoText(route?.description, existing.description || siteDescription),
        keywords: this.normalizeSeoText(route?.keywords, existing.keywords || siteKeywords),
        noindex,
        updatedAt: Number.parseInt(String(route?.updatedAt || existing.updatedAt || now), 10) || now,
        seoType: String(route?.seoType || existing.seoType || 'WebPage').trim() || 'WebPage',
        image: String(route?.image || existing.image || '').trim(),
        bodyContent: String(route?.bodyContent || existing.bodyContent || '').trim(),
        author: this.normalizeSeoText(route?.author, existing.author || ''),
        category: this.normalizeSeoText(route?.category, existing.category || ''),
        datePublished: Number.parseInt(String(route?.datePublished || existing.datePublished || 0), 10) || 0,
        breadcrumbs: Array.isArray(route?.breadcrumbs) ? route.breadcrumbs : (existing.breadcrumbs || []),
      };
      routeMap.set(path, normalized);
    };

    // 全站公共路由（保证核心页面有首屏 SEO）
    [
      { path: '/', title: siteTitle, description: siteDescription, keywords: siteKeywords },
      { path: '/404', title: this.buildSeoTitle('页面未找到', siteName), description: '您访问的页面不存在或已下线。', noindex: true },
      { path: '/search', title: this.buildSeoTitle('全站搜索', siteName), description: siteDescription, noindex: true },
      { path: '/submit', title: this.buildSeoTitle('网站提交', siteName), description: siteDescription },
      { path: '/changelog', title: this.buildSeoTitle('更新日志', siteName), description: siteDescription },
      { path: '/p/hot', title: this.buildSeoTitle('热门内容', siteName), description: siteDescription },
      { path: '/hot', canonicalPath: '/p/hot', title: this.buildSeoTitle('热门内容', siteName), description: siteDescription, noindex: true },
      { path: '/figma', title: this.buildSeoTitle('Figma 插件', siteName), description: siteDescription },
      { path: '/category', title: this.buildSeoTitle('全部分类', siteName), description: siteDescription },
      { path: '/categories', canonicalPath: '/category', title: this.buildSeoTitle('全部分类', siteName), description: siteDescription, noindex: true },
      { path: '/p/category', canonicalPath: '/category', title: this.buildSeoTitle('全部分类', siteName), description: siteDescription, noindex: true },
      { path: '/p/categories', canonicalPath: '/category', title: this.buildSeoTitle('全部分类', siteName), description: siteDescription, noindex: true },
      { path: '/tag', title: this.buildSeoTitle('全部标签', siteName), description: siteDescription },
      { path: '/tags', canonicalPath: '/tag', title: this.buildSeoTitle('全部标签', siteName), description: siteDescription, noindex: true },
      { path: '/p/tag', canonicalPath: '/tag', title: this.buildSeoTitle('全部标签', siteName), description: siteDescription, noindex: true },
      { path: '/p/tags', canonicalPath: '/tag', title: this.buildSeoTitle('全部标签', siteName), description: siteDescription, noindex: true },
      { path: '/articles', title: this.buildSeoTitle('文章中心', siteName), description: siteDescription },
      { path: '/daily-hot', canonicalPath: '/p/hot', title: this.buildSeoTitle('每日热榜', siteName), description: siteDescription, noindex: true },
      { path: '/p/daily-hot', canonicalPath: '/p/hot', title: this.buildSeoTitle('每日热榜', siteName), description: siteDescription, noindex: true },
      { path: '/daily-new', canonicalPath: '/p/hot', title: this.buildSeoTitle('每日上新', siteName), description: siteDescription, noindex: true },
      { path: '/p/daily-new', canonicalPath: '/p/hot', title: this.buildSeoTitle('每日上新', siteName), description: siteDescription, noindex: true },
      { path: '/rankings', canonicalPath: '/p/hot', title: this.buildSeoTitle('热榜排行', siteName), description: siteDescription, noindex: true },
      { path: '/p/rankings', canonicalPath: '/p/hot', title: this.buildSeoTitle('热榜排行', siteName), description: siteDescription, noindex: true },
    ].forEach(upsertRoute);

    // 动态导航页
    try {
      const pageRows = await app.model.query(
        `SELECT id, slug, name, description, update_time
         FROM uied_page
         WHERE is_delete = 0 AND is_show = 1
         ORDER BY sort ASC, id ASC`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      const fixedSlugSet = new Set([ 'uiux', 'ai', 'design', '3d', 'ecommerce', 'interior', 'font', 'figma' ]);
      const frontendConfig = await ctx.service.uied.setting.get('homepageConfig').catch(() => ({}));
      const homePageSlug = String(frontendConfig?.homePageSlug || 'uiux').trim().toLowerCase() || 'uiux';

      (Array.isArray(pageRows) ? pageRows : []).forEach(row => {
        const slug = String(row?.slug || '').trim().toLowerCase();
        if (!slug) return;
        const pageName = this.normalizeSeoText(row?.name, slug);
        const title = this.buildSeoTitle(pageName, siteName);
        const description = this.normalizeSeoText(row?.description, siteDescription);
        const keywords = `${pageName},${siteKeywords}`;
        const updatedAt = Number.parseInt(String(row?.update_time || now), 10) || now;
        upsertRoute({ path: `/p/${slug}`, title, description, keywords, updatedAt });
        if (fixedSlugSet.has(slug)) {
          upsertRoute({ path: `/${slug}`, title, description, keywords, updatedAt });
        }
        if (slug === homePageSlug) {
          upsertRoute({ path: '/', title, description, keywords, updatedAt });
        }
      });
    } catch (error) {
      ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取页面数据失败: ${error?.message || error}`);
    }

    // 分类详情页
    try {
      const categoryRows = await app.model.query(
        `SELECT slug, name, description, seo_title, seo_description, seo_keywords, update_time
         FROM uied_category
         WHERE is_delete = 0 AND is_show = 1 AND slug IS NOT NULL AND slug <> ''
         ORDER BY sort ASC, id ASC`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      (Array.isArray(categoryRows) ? categoryRows : []).forEach(row => {
        const slug = String(row?.slug || '').trim();
        if (!slug) return;
        const name = this.normalizeSeoText(row?.name, slug);
        upsertRoute({
          path: `/category/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 分类`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
        });
        upsertRoute({
          path: `/categories/${slug}`,
          canonicalPath: `/category/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 分类`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
        upsertRoute({
          path: `/p/category/${slug}`,
          canonicalPath: `/category/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 分类`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
        upsertRoute({
          path: `/p/categories/${slug}`,
          canonicalPath: `/category/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 分类`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
      });
    } catch (error) {
      ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取分类数据失败: ${error?.message || error}`);
    }

    // 标签详情页
    try {
      const tagRows = await app.model.query(
        `SELECT slug, name, description, seo_title, seo_description, seo_keywords, update_time
         FROM uied_website_tag
         WHERE is_delete = 0 AND slug IS NOT NULL AND slug <> ''
         ORDER BY sort ASC, id ASC`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      (Array.isArray(tagRows) ? tagRows : []).forEach(row => {
        const slug = String(row?.slug || '').trim();
        if (!slug) return;
        const name = this.normalizeSeoText(row?.name, slug);
        upsertRoute({
          path: `/tag/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 标签`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
        });
        upsertRoute({
          path: `/tags/${slug}`,
          canonicalPath: `/tag/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 标签`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
        upsertRoute({
          path: `/p/tag/${slug}`,
          canonicalPath: `/tag/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 标签`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
        upsertRoute({
          path: `/p/tags/${slug}`,
          canonicalPath: `/tag/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} 标签`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
          updatedAt: Number.parseInt(String(row?.update_time || now), 10) || now,
          noindex: true,
        });
      });
    } catch (error) {
      ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取标签数据失败: ${error?.message || error}`);
    }

    // 文章详情页
    try {
      const articleRows = await app.model.query(
        `SELECT slug, title, excerpt, LEFT(content, 4000) AS content_preview, cover_image, author, category,
                seo_title, seo_description, update_time, published_at
         FROM uied_article
         WHERE is_delete = 0 AND status = 'published' AND slug IS NOT NULL AND slug <> ''
         ORDER BY COALESCE(published_at, update_time) DESC, id DESC`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      (Array.isArray(articleRows) ? articleRows : []).forEach(row => {
        const slug = String(row?.slug || '').trim();
        if (!slug) return;
        const titleSeed = this.normalizeSeoText(row?.seo_title || row?.title, slug);
        const updatedAt = Number.parseInt(String(row?.published_at || row?.update_time || now), 10) || now;
        const noindex = this.isSeoPlaceholderArticle({
          title: row?.title,
          slug,
          content: row?.content_preview || row?.excerpt,
        });
        upsertRoute({
          path: `/article/${slug}`,
          title: this.buildSeoTitle(titleSeed, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.excerpt, siteDescription),
          keywords: `${titleSeed},${siteKeywords}`,
          updatedAt,
          seoType: 'Article',
          image: row?.cover_image,
          bodyContent: row?.content_preview || row?.excerpt,
          author: row?.author,
          category: row?.category,
          datePublished: Number.parseInt(String(row?.published_at || 0), 10) || 0,
          noindex,
          breadcrumbs: [
            { name: siteName, url: '/' },
            { name: '文章中心', url: '/articles' },
            { name: titleSeed, url: `/article/${slug}` },
          ],
        });
        upsertRoute({
          path: `/articles/${slug}`,
          canonicalPath: `/article/${slug}`,
          title: this.buildSeoTitle(titleSeed, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.excerpt, siteDescription),
          keywords: `${titleSeed},${siteKeywords}`,
          updatedAt,
          noindex: true,
        });
      });
    } catch (error) {
      ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取文章数据失败: ${error?.message || error}`);
    }

    // MCP 中心路由
    try {
      upsertRoute({
        path: '/mcp',
        title: this.buildSeoTitle('MCP 中心', siteName),
        description: siteDescription,
        keywords: `MCP,Model Context Protocol,${siteKeywords}`,
      });

      const mcpRows = await app.model.query(
        `SELECT slug, name, summary, seo_title, seo_description, seo_keywords,
                publish_time, update_time
         FROM uied_mcp_item
         WHERE is_delete = 0
           AND status = 'published'
           AND slug IS NOT NULL
           AND slug <> ''
         ORDER BY COALESCE(publish_time, update_time) DESC, id DESC`,
        { type: app.Sequelize.QueryTypes.SELECT }
      );
      (Array.isArray(mcpRows) ? mcpRows : []).forEach(row => {
        const slug = String(row?.slug || '').trim();
        if (!slug) return;
        const name = this.normalizeSeoText(row?.name, slug);
        const updatedAt = Number.parseInt(String(row?.publish_time || row?.update_time || now), 10) || now;
        upsertRoute({
          path: `/mcp/${slug}`,
          title: this.buildSeoTitle(row?.seo_title || `${name} MCP`, siteName),
          description: this.normalizeSeoText(row?.seo_description || row?.summary, siteDescription),
          keywords: this.normalizeSeoText(row?.seo_keywords, `${name},MCP,${siteKeywords}`),
          updatedAt,
        });
      });
    } catch (error) {
      ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取 MCP 数据失败: ${error?.message || error}`);
    }

    // 网站详情页（可选）
    if (includeWebsiteDetails) {
      try {
        const permalinkConfig = await ctx.service.uied.setting.get('permalink_config').catch(() => ({}));
        const websiteRows = await app.model.query(
          `SELECT w.id, w.slug, w.name, w.description, w.icon_url, w.thumbnail,
                  LEFT(w.detail_content, 4000) AS detail_content_preview,
                  w.seo_title, w.seo_description, w.seo_keywords,
                  w.update_time, c.name as category_name, c.slug as category_slug
           FROM uied_website w
           LEFT JOIN uied_category c ON c.id = w.category_id AND c.is_delete = 0
           WHERE w.is_delete = 0 AND ${this.getPublicWebsiteStatusCondition('w')}
           ORDER BY w.id DESC
           LIMIT ?`,
          {
            replacements: [ websiteLimit ],
            type: app.Sequelize.QueryTypes.SELECT,
          }
        );
        (Array.isArray(websiteRows) ? websiteRows : []).forEach(row => {
          const id = Number.parseInt(String(row?.id || 0), 10);
          if (!Number.isInteger(id) || id <= 0) return;
          const name = this.normalizeSeoText(row?.name, `网站 ${id}`);
          const detailPath = this.buildWebsitePermalinkPath(permalinkConfig || {}, id, row?.slug || '');
          const updatedAt = Number.parseInt(String(row?.update_time || now), 10) || now;
          upsertRoute({
            path: detailPath,
            title: this.buildSeoTitle(row?.seo_title || name, siteName),
            description: this.normalizeSeoText(row?.seo_description || row?.description, siteDescription),
            keywords: this.normalizeSeoText(row?.seo_keywords, `${name},${siteKeywords}`),
            updatedAt,
            seoType: 'SoftwareApplication',
            image: row?.thumbnail || row?.icon_url,
            bodyContent: row?.detail_content_preview || row?.description,
            category: row?.category_name,
            breadcrumbs: [
              { name: siteName, url: '/' },
              { name: row?.category_name || '网站导航', url: row?.category_name ? `/category/${row?.category_slug || ''}` : '/category' },
              { name, url: detailPath },
            ],
          });
        });
      } catch (error) {
        ctx.logger.warn(`[uied.frontend] 构建 SEO 清单时读取网站详情失败: ${error?.message || error}`);
      }
    }

    /**
     * 聚合页的更新时间跟随其下属最新内容，避免 Sitemap 长期保留过期日期。
     * @param {string} aggregatePath 聚合页路径
     * @param {(path:string) => boolean} matcher 下属路由匹配函数
     */
    const syncAggregateUpdatedAt = (aggregatePath, matcher) => {
      const aggregate = routeMap.get(aggregatePath);
      if (!aggregate) return;
      const latestUpdatedAt = Array.from(routeMap.values()).reduce((latest, route) => {
        if (!route || route.noindex === true || !matcher(String(route.path || ''))) return latest;
        return Math.max(latest, Number(route.updatedAt || 0));
      }, Number(aggregate.updatedAt || 0));
      aggregate.updatedAt = latestUpdatedAt || now;
      routeMap.set(aggregatePath, aggregate);
    };

    syncAggregateUpdatedAt('/', routePath => routePath !== '/');
    syncAggregateUpdatedAt('/articles', routePath => /^\/article\/[^/]+$/i.test(routePath));
    syncAggregateUpdatedAt('/category', routePath => /^\/category\/[^/]+$/i.test(routePath));
    syncAggregateUpdatedAt('/tag', routePath => /^\/tag\/[^/]+$/i.test(routePath));
    syncAggregateUpdatedAt('/mcp', routePath => /^\/mcp\/[^/]+$/i.test(routePath));

    const routes = Array.from(routeMap.values())
      .sort((a, b) => a.path.localeCompare(b.path));

    return {
      generatedAt: now,
      siteOrigin,
      siteInfo: {
        siteName,
        siteTitle,
        siteDescription,
        siteKeywords,
      },
      routeCount: routes.length,
      routes,
    };
  }

  /**
   * 规范化站点权重标签键（支持中英文别名）
   * @param {unknown} value 原始值
   * @return {string} 规范化后的键
   */
  normalizeWebsiteWeightTag(value) {
    const raw = String(value || '').trim().toLowerCase();
    const aliasMap = {
      official: 'official',
      'weight:official': 'official',
      官网: 'official',
      官方: 'official',
      recommended: 'recommended',
      recommend: 'recommended',
      'weight:recommended': 'recommended',
      推荐: 'recommended',
      enterprise_verified: 'enterprise_verified',
      enterpriseverified: 'enterprise_verified',
      enterprise: 'enterprise_verified',
      verified_enterprise: 'enterprise_verified',
      'weight:enterprise_verified': 'enterprise_verified',
      企业认证: 'enterprise_verified',
    };
    return aliasMap[raw] || '';
  }

  /**
   * 解析网站标签，拆分普通标签与权重标签
   * @param {unknown} source 标签原始值
   * @return {{tags: string[], weightTags: string[]}} 规范化标签结构
   */
  parseWebsiteTagBundle(source) {
    const rows = this.safeJsonParse(source, [])
      .map(item => String(item || '').trim())
      .filter(Boolean);
    const tags = [];
    const weightTags = [];
    rows.forEach(item => {
      const normalizedWeight = this.normalizeWebsiteWeightTag(item);
      if (normalizedWeight) {
        weightTags.push(normalizedWeight);
        return;
      }
      if (String(item).toLowerCase().startsWith('weight:')) {
        const fallback = this.normalizeWebsiteWeightTag(String(item).replace(/^weight:/i, ''));
        if (fallback) {
          weightTags.push(fallback);
          return;
        }
      }
      tags.push(item);
    });
    return {
      tags: Array.from(new Set(tags)),
      weightTags: Array.from(new Set(weightTags)),
    };
  }

  /**
   * 安全解析 JSON
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
}

module.exports = FrontendService;
