/**
 * @file service/uied/wordpressConfig.js
 * @description WordPress 配置服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class WordpressConfigService extends Service {
  /**
   * 构建内置默认 WordPress 源配置（数据库未配置时兜底使用）
   */
  buildBuiltinDefaultConfig() {
    return {
      id: 0,
      name: 'UIED 默认源',
      apiUrl: 'https://www.uied.cn/wp-json/wp/v2',
      cacheTime: 7200,
    };
  }

  /**
   * 获取进程级文章缓存与进行中请求容器，供多个请求实例共享。
   * @return {{cache: Map<string, any>, pending: Map<string, Promise<any>>}} 运行时容器
   */
  getPostsRuntimeStores() {
    const { app } = this;
    if (!(app.__uiedWordpressPostsCache instanceof Map)) {
      app.__uiedWordpressPostsCache = new Map();
    }
    if (!(app.__uiedWordpressPostsPending instanceof Map)) {
      app.__uiedWordpressPostsPending = new Map();
    }
    return {
      cache: app.__uiedWordpressPostsCache,
      pending: app.__uiedWordpressPostsPending,
    };
  }

  /**
   * 清理 WordPress 运行时缓存，配置变更后确保下一次请求读取最新源。
   */
  clearPostsRuntimeCache() {
    const { app } = this;
    const stores = this.getPostsRuntimeStores();
    stores.cache.clear();
    stores.pending.clear();
    app.__uiedWordpressDefaultConfigCache = {
      data: null,
      expiresAt: 0,
      pending: null,
    };
  }

  /**
   * 构建文章查询缓存键，保证同参数请求可复用缓存与进行中 Promise。
   * @param {Record<string, any>} options 已规范化查询参数
   * @return {string} 缓存键
   */
  buildPostsCacheKey(options = {}) {
    return [
      String(options.sourceMode || 'uied_latest'),
      String(options.period || 'all'),
      Number(options.categoryId || 0),
      Number(options.tagId || 0),
      Number(options.page || 1),
      Number(options.perPage || 10),
      String(options.orderBy || 'date'),
      String(options.order || 'desc'),
      String(options.search || ''),
    ].join('|');
  }

  /**
   * 解析文章缓存有效期，限制在 30 秒到 24 小时之间。
   * @param {Record<string, any>} config WordPress 源配置
   * @return {number} 缓存毫秒数
   */
  resolvePostsCacheTtl(config = {}) {
    const seconds = Number.parseInt(String(config?.cacheTime || 7200), 10);
    const safeSeconds = Number.isFinite(seconds)
      ? Math.max(30, Math.min(seconds, 24 * 60 * 60))
      : 7200;
    return safeSeconds * 1000;
  }

  /**
   * 判断是否为可降级的库结构兼容错误
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
   * 确保 WordPress 标签与组件配置表存在（新环境兜底）
   */
  async ensureTagWidgetTables() {
    const { app } = this;
    const cacheKey = '__uiedWordpressTagWidgetTablesReady__';
    if (app[cacheKey] === true) return;
    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_wordpress_tag\` (
        \`id\` int unsigned NOT NULL AUTO_INCREMENT,
        \`config_id\` int unsigned DEFAULT NULL,
        \`wp_tag_id\` int unsigned NOT NULL DEFAULT 0,
        \`wp_tag_name\` varchar(128) NOT NULL DEFAULT '',
        \`display_name\` varchar(128) NOT NULL DEFAULT '',
        \`slug\` varchar(128) NOT NULL DEFAULT '',
        \`description\` varchar(500) NOT NULL DEFAULT '',
        \`sort\` int unsigned NOT NULL DEFAULT 0,
        \`visible\` tinyint unsigned NOT NULL DEFAULT 1,
        \`page_slug\` varchar(64) NOT NULL DEFAULT '',
        \`create_time\` int unsigned NOT NULL DEFAULT 0,
        \`update_time\` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        KEY \`idx_page_visible_sort\` (\`page_slug\`,\`visible\`,\`sort\`),
        KEY \`idx_slug\` (\`slug\`),
        KEY \`idx_config_id\` (\`config_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WordPress 标签映射配置'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );

    await app.model.query(
      `CREATE TABLE IF NOT EXISTS \`uied_wordpress_widget\` (
        \`id\` int unsigned NOT NULL AUTO_INCREMENT,
        \`config_id\` int unsigned DEFAULT NULL,
        \`widget_key\` varchar(100) NOT NULL DEFAULT '',
        \`widget_name\` varchar(128) NOT NULL DEFAULT '',
        \`title\` varchar(200) NOT NULL DEFAULT '',
        \`content\` text,
        \`meta_json\` text,
        \`sort\` int unsigned NOT NULL DEFAULT 0,
        \`visible\` tinyint unsigned NOT NULL DEFAULT 1,
        \`page_slug\` varchar(64) NOT NULL DEFAULT '',
        \`create_time\` int unsigned NOT NULL DEFAULT 0,
        \`update_time\` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        KEY \`idx_page_visible_sort\` (\`page_slug\`,\`visible\`,\`sort\`),
        KEY \`idx_widget_key\` (\`widget_key\`),
        KEY \`idx_config_id\` (\`config_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='WordPress 组件配置'`,
      { type: app.Sequelize.QueryTypes.RAW }
    );
    app[cacheKey] = true;
  }

  // ==================== WordPress 配置 ====================

  /**
   * 获取所有 WordPress 配置
   */
  async listConfigs() {
    const { app } = this;

    const configs = await app.model.query(
      'SELECT * FROM uied_wordpress_config ORDER BY create_time DESC',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return configs.map(c => ({
      id: c.id,
      name: c.name,
      apiUrl: c.api_url,
      enabled: c.enabled === 1,
      isDefault: c.is_default === 1,
      cacheTime: c.cache_time,
      createdAt: c.create_time,
    }));
  }

  /**
   * 获取默认 WordPress 配置
   */
  async getDefaultConfig() {
    const { app } = this;
    const state = app.__uiedWordpressDefaultConfigCache || {
      data: null,
      expiresAt: 0,
      pending: null,
    };
    app.__uiedWordpressDefaultConfigCache = state;

    if (state.data && state.expiresAt > Date.now()) return state.data;
    if (state.pending) return await state.pending;

    state.pending = (async () => {
      let [ config ] = await app.model.query(
        'SELECT * FROM uied_wordpress_config WHERE enabled = 1 AND is_default = 1 LIMIT 1',
        { type: app.Sequelize.QueryTypes.SELECT }
      );

      if (!config) {
        [ config ] = await app.model.query(
          'SELECT * FROM uied_wordpress_config WHERE enabled = 1 LIMIT 1',
          { type: app.Sequelize.QueryTypes.SELECT }
        );
      }

      if (!config) {
        this.ctx.logger.warn('[wordpressConfig] 未配置可用 WordPress 源，自动回退 UIED 默认源');
        return this.buildBuiltinDefaultConfig();
      }

      return {
        id: config.id,
        name: config.name,
        apiUrl: config.api_url,
        cacheTime: config.cache_time,
      };
    })();

    try {
      state.data = await state.pending;
      state.expiresAt = Date.now() + 60 * 1000;
      return state.data;
    } finally {
      state.pending = null;
    }
  }

  /**
   * 创建 WordPress 配置
   */
  async addConfig(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    if (data.isDefault) {
      await app.model.query(
        'UPDATE uied_wordpress_config SET is_default = 0',
        { type: app.Sequelize.QueryTypes.UPDATE }
      );
    }

    const [ result ] = await app.model.query(
      `INSERT INTO uied_wordpress_config (name, api_url, enabled, is_default, cache_time, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.name,
          data.apiUrl,
          data.enabled !== false ? 1 : 0,
          data.isDefault ? 1 : 0,
          data.cacheTime || 7200,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    this.clearPostsRuntimeCache();

    return { id: result, ...data };
  }

  /**
   * 更新 WordPress 配置
   */
  async editConfig(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    if (data.isDefault) {
      await app.model.query(
        'UPDATE uied_wordpress_config SET is_default = 0 WHERE id != ?',
        { replacements: [ data.id ], type: app.Sequelize.QueryTypes.UPDATE }
      );
    }

    const updates = [];
    const values = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.apiUrl !== undefined) { updates.push('api_url = ?'); values.push(data.apiUrl); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.isDefault !== undefined) { updates.push('is_default = ?'); values.push(data.isDefault ? 1 : 0); }
    if (data.cacheTime !== undefined) { updates.push('cache_time = ?'); values.push(data.cacheTime); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_wordpress_config SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    this.clearPostsRuntimeCache();

    return data;
  }

  /**
   * 删除 WordPress 配置
   */
  async delConfig(id) {
    const { app } = this;

    await app.model.query(
      'DELETE FROM uied_wordpress_config WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.DELETE }
    );
    this.clearPostsRuntimeCache();
  }

  // ==================== WordPress 分类配置 ====================

  /**
   * 获取分类配置列表
   */
  async listCategories(pageSlug) {
    const { app } = this;

    let whereClause = '1=1';
    const replacements = [];

    if (pageSlug) {
      whereClause += ' AND page_slug = ?';
      replacements.push(pageSlug);
    }

    let categories = [];
    try {
      categories = await app.model.query(
        `SELECT * FROM uied_wordpress_category WHERE ${whereClause} ORDER BY sort ASC, create_time DESC`,
        { replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      this.ctx.logger.warn('[wordpressConfig] listCategories 降级为空数组:', error.message);
      return [];
    }

    return categories.map(c => ({
      id: c.id,
      configId: c.config_id,
      wpCategoryId: c.wp_category_id,
      wpCategoryName: c.wp_category_name,
      displayName: c.display_name,
      slug: c.slug,
      description: c.description,
      order: c.sort,
      visible: c.visible === 1,
      pageSlug: c.page_slug,
    }));
  }

  /**
   * 创建分类配置
   */
  async addCategory(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_wordpress_category 
       (config_id, wp_category_id, wp_category_name, display_name, slug, description, sort, visible, page_slug, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.configId || null,
          data.wpCategoryId,
          data.wpCategoryName,
          data.displayName,
          data.slug,
          data.description || null,
          data.order || 0,
          data.visible !== false ? 1 : 0,
          data.pageSlug || null,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新分类配置
   */
  async editCategory(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const updates = [];
    const values = [];

    if (data.wpCategoryId !== undefined) { updates.push('wp_category_id = ?'); values.push(data.wpCategoryId); }
    if (data.wpCategoryName !== undefined) { updates.push('wp_category_name = ?'); values.push(data.wpCategoryName); }
    if (data.displayName !== undefined) { updates.push('display_name = ?'); values.push(data.displayName); }
    if (data.slug !== undefined) { updates.push('slug = ?'); values.push(data.slug); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.order !== undefined) { updates.push('sort = ?'); values.push(data.order); }
    if (data.visible !== undefined) { updates.push('visible = ?'); values.push(data.visible ? 1 : 0); }
    if (data.pageSlug !== undefined) { updates.push('page_slug = ?'); values.push(data.pageSlug); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_wordpress_category SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }

  /**
   * 删除分类配置
   */
  async delCategory(id) {
    const { app } = this;

    await app.model.query(
      'DELETE FROM uied_wordpress_category WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.DELETE }
    );
  }

  // ==================== WordPress 标签配置 ====================

  /**
   * 获取标签配置列表
   */
  async listTags(pageSlug) {
    const { app } = this;
    await this.ensureTagWidgetTables();

    let whereClause = '1=1';
    const replacements = [];

    if (pageSlug) {
      whereClause += ' AND page_slug = ?';
      replacements.push(pageSlug);
    }

    let rows = [];
    try {
      rows = await app.model.query(
        `SELECT * FROM uied_wordpress_tag WHERE ${whereClause} ORDER BY sort ASC, create_time DESC`,
        { replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      this.ctx.logger.warn('[wordpressConfig] listTags 降级为空数组:', error.message);
      return [];
    }

    return rows.map(item => ({
      id: item.id,
      configId: item.config_id,
      wpTagId: item.wp_tag_id,
      wpTagName: item.wp_tag_name,
      displayName: item.display_name,
      slug: item.slug,
      description: item.description,
      order: item.sort,
      visible: item.visible === 1,
      pageSlug: item.page_slug,
    }));
  }

  /**
   * 创建标签配置
   */
  async addTag(data) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    const now = Math.floor(Date.now() / 1000);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_wordpress_tag
       (config_id, wp_tag_id, wp_tag_name, display_name, slug, description, sort, visible, page_slug, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.configId || null,
          data.wpTagId,
          data.wpTagName,
          data.displayName,
          data.slug,
          data.description || '',
          data.order || 0,
          data.visible !== false ? 1 : 0,
          data.pageSlug || '',
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新标签配置
   */
  async editTag(data) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    const now = Math.floor(Date.now() / 1000);

    const updates = [];
    const values = [];

    if (data.configId !== undefined) { updates.push('config_id = ?'); values.push(data.configId || null); }
    if (data.wpTagId !== undefined) { updates.push('wp_tag_id = ?'); values.push(data.wpTagId); }
    if (data.wpTagName !== undefined) { updates.push('wp_tag_name = ?'); values.push(data.wpTagName); }
    if (data.displayName !== undefined) { updates.push('display_name = ?'); values.push(data.displayName); }
    if (data.slug !== undefined) { updates.push('slug = ?'); values.push(data.slug); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.order !== undefined) { updates.push('sort = ?'); values.push(data.order); }
    if (data.visible !== undefined) { updates.push('visible = ?'); values.push(data.visible ? 1 : 0); }
    if (data.pageSlug !== undefined) { updates.push('page_slug = ?'); values.push(data.pageSlug || ''); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_wordpress_tag SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }

  /**
   * 删除标签配置
   */
  async delTag(id) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    await app.model.query(
      'DELETE FROM uied_wordpress_tag WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.DELETE }
    );
  }

  // ==================== WordPress 组件配置 ====================

  /**
   * 获取组件配置列表
   */
  async listWidgets(pageSlug) {
    const { app } = this;
    await this.ensureTagWidgetTables();

    let whereClause = '1=1';
    const replacements = [];
    if (pageSlug) {
      whereClause += ' AND page_slug = ?';
      replacements.push(pageSlug);
    }

    let rows = [];
    try {
      rows = await app.model.query(
        `SELECT * FROM uied_wordpress_widget WHERE ${whereClause} ORDER BY sort ASC, create_time DESC`,
        { replacements, type: app.Sequelize.QueryTypes.SELECT }
      );
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      this.ctx.logger.warn('[wordpressConfig] listWidgets 降级为空数组:', error.message);
      return [];
    }

    return rows.map(item => {
      const meta = (() => {
        try {
          return item.meta_json ? JSON.parse(item.meta_json) : {};
        } catch (error) {
          return {};
        }
      })();
      const normalizeNumberList = value => {
        const source = Array.isArray(value)
          ? value
          : String(value || '')
            .split(',')
            .map(text => String(text || '').trim())
            .filter(Boolean);
        return Array.from(
          new Set(
            source
              .map(text => Number.parseInt(String(text || ''), 10))
              .filter(number => Number.isFinite(number) && number > 0)
          )
        );
      };
      return {
        id: item.id,
        configId: item.config_id,
        widgetKey: item.widget_key,
        widgetName: item.widget_name,
        title: item.title,
        content: item.content || '',
        meta,
        position: String(meta?.position || '').trim(),
        componentType: String(meta?.componentType || '').trim(),
        limit: Number.isFinite(Number(meta?.limit)) ? Number(meta.limit) : 0,
        showMoreLink: String(meta?.showMoreLink || '').trim(),
        categoryIds: normalizeNumberList(meta?.categoryIds),
        tagIds: normalizeNumberList(meta?.tagIds),
        order: item.sort,
        visible: item.visible === 1,
        pageSlug: item.page_slug,
      };
    });
  }

  /**
   * 创建组件配置
   */
  async addWidget(data) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    const now = Math.floor(Date.now() / 1000);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_wordpress_widget
       (config_id, widget_key, widget_name, title, content, meta_json, sort, visible, page_slug, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.configId || null,
          data.widgetKey || '',
          data.widgetName || '',
          data.title || '',
          data.content || '',
          JSON.stringify(data.meta || {}),
          data.order || 0,
          data.visible !== false ? 1 : 0,
          data.pageSlug || '',
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新组件配置
   */
  async editWidget(data) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    const now = Math.floor(Date.now() / 1000);

    const updates = [];
    const values = [];

    if (data.configId !== undefined) { updates.push('config_id = ?'); values.push(data.configId || null); }
    if (data.widgetKey !== undefined) { updates.push('widget_key = ?'); values.push(data.widgetKey || ''); }
    if (data.widgetName !== undefined) { updates.push('widget_name = ?'); values.push(data.widgetName || ''); }
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title || ''); }
    if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content || ''); }
    if (data.meta !== undefined) { updates.push('meta_json = ?'); values.push(JSON.stringify(data.meta || {})); }
    if (data.order !== undefined) { updates.push('sort = ?'); values.push(data.order || 0); }
    if (data.visible !== undefined) { updates.push('visible = ?'); values.push(data.visible ? 1 : 0); }
    if (data.pageSlug !== undefined) { updates.push('page_slug = ?'); values.push(data.pageSlug || ''); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_wordpress_widget SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }

  /**
   * 删除组件配置
   */
  async delWidget(id) {
    const { app } = this;
    await this.ensureTagWidgetTables();
    await app.model.query(
      'DELETE FROM uied_wordpress_widget WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.DELETE }
    );
  }

  // ==================== WordPress 文章代理 ====================

  /**
   * 从 WordPress API 地址推导站点根域名。
   * @param {string} apiUrl WordPress API 地址
   * @return {string} 站点根域名
   */
  resolveWordPressSiteOrigin(apiUrl) {
    const raw = String(apiUrl || '').trim();
    if (!raw) return 'https://www.uied.cn';
    try {
      const url = new URL(raw);
      return `${url.protocol}//${url.host}`;
    } catch (_error) {
      const text = raw.replace(/\/wp-json\/.*$/i, '').replace(/\/+$/, '');
      return text || 'https://www.uied.cn';
    }
  }

  /**
   * 清理 HTML 并压缩多余空白。
   * @param {unknown} value 原始 HTML 或文本
   * @return {string} 纯文本摘要
   */
  toPlainText(value) {
    return String(value || '')
      .replace(/<\/?[^>]+(>|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 统一请求 WordPress 接口并返回 JSON。
   * @param {string} url 请求 URL
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<any>} 请求响应
   */
  async requestWordPressJson(url, params = {}) {
    const { ctx, app } = this;

    /**
     * 统一构建 curl 参数，减少重复逻辑。
     * @param {boolean} insecureTls 是否关闭 TLS 证书校验
     * @return {Record<string, any>} curl 参数
     */
    const buildCurlOptions = insecureTls => ({
      timeout: 15000,
      data: params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UIED-Nav/1.0)',
        Accept: 'application/json',
      },
      dataType: 'json',
      followRedirect: true,
      ...(insecureTls ? { rejectUnauthorized: false } : {}),
    });

    /**
     * 判断是否是 TLS 证书链类错误（本地环境常见）。
     * @param {any} error curl 抛出的异常
     * @return {boolean} 是否证书错误
     */
    const isTlsCertificateError = error => {
      const code = String(error?.code || error?.name || '').toUpperCase();
      const message = String(error?.message || '').toLowerCase();
      return code.includes('CERT')
        || code.includes('UNABLE_TO_GET_ISSUER_CERT')
        || message.includes('unable to get local issuer certificate')
        || message.includes('self signed certificate')
        || message.includes('certificate');
    };

    /**
     * 严格模式请求，优先保证安全。
     */
    try {
      const response = await ctx.curl(url, buildCurlOptions(false));
      if (response.status !== 200) {
        throw new Error(`WordPress API 错误: ${response.status}`);
      }
      return response;
    } catch (error) {
      /**
       * 仅在本地开发环境遇到证书链问题时，降级关闭证书校验重试一次，避免前台直接 500。
       */
      const isLocalEnv = String(app.config.env || '').toLowerCase() === 'local';
      if (!isLocalEnv || !isTlsCertificateError(error)) {
        throw error;
      }

      ctx.logger.warn(
        '[wordpressConfig] TLS 证书校验失败，降级为 rejectUnauthorized=false 重试:',
        error?.message || error
      );

      const response = await ctx.curl(url, buildCurlOptions(true));
      if (response.status !== 200) {
        throw new Error(`WordPress API 错误: ${response.status}`);
      }
      return response;
    }
  }

  /**
   * 规范化 WordPress v2 文章列表结构。
   * @param {Array<any>} posts WordPress v2 原始文章数组
   * @return {Array<any>} 标准化后的文章列表
   */
  normalizeWpV2Posts(posts = []) {
    return posts.map(post => {
      let thumbnail = '';
      if (post?._embedded?.['wp:featuredmedia']?.[0]) {
        const media = post._embedded['wp:featuredmedia'][0];
        thumbnail = media.source_url || '';
        if (media.media_details?.sizes?.medium_large?.source_url) {
          thumbnail = media.media_details.sizes.medium_large.source_url;
        } else if (media.media_details?.sizes?.medium?.source_url) {
          thumbnail = media.media_details.sizes.medium.source_url;
        }
      }

      const authorName = post?._embedded?.author?.[0]?.name || '';
      const authorAvatar = String(post?._embedded?.author?.[0]?.avatar_urls?.['96'] || '').trim();
      const description = this.toPlainText(post?.excerpt?.rendered || post?.content?.rendered || '');
      const title = String(post?.title?.rendered || '').trim() || '未命名文章';
      const dateRaw = String(post?.date || '').trim();
      const viewCount = Number.parseInt(String(post?.views || post?.page_views || 0), 10);
      const commentCount = Number.parseInt(String(post?.comment_count || post?.comments || post?.commentCount || 0), 10);

      return {
        id: String(post?.id || ''),
        name: title,
        description,
        link: String(post?.link || '#'),
        thumbnail,
        date: dateRaw ? new Date(dateRaw).toLocaleDateString() : '',
        authorName,
        authorAvatar,
        viewCount: Number.isFinite(viewCount) && viewCount > 0 ? viewCount : 0,
        commentCount: Number.isFinite(commentCount) && commentCount > 0 ? commentCount : 0,
        isNew: this.isNewPost(dateRaw),
      };
    });
  }

  /**
   * 规范化 UIED 自定义接口文章结构。
   * @param {Array<any>} rows UIED 自定义接口返回的文章数组
   * @return {Array<any>} 标准化后的文章列表
   */
  normalizeUiedPosts(rows = []) {
    return rows.map(item => {
      const title = String(
        item?.name
          || item?.title?.rendered
          || item?.title
          || item?.post_title
          || ''
      ).trim() || '未命名文章';
      const description = this.toPlainText(
        item?.description
          || item?.excerpt?.rendered
          || item?.excerpt
          || item?.content?.rendered
          || item?.content
          || ''
      );
      const link = String(item?.link || item?.url || item?.permalink || '#').trim() || '#';
      const thumbnail = String(
        item?.thumbnail
          || item?.featured_image
          || item?.featuredImage
          || item?.cover
          || item?.image
          || item?.attachment?.image?.[0]?.thumb
          || ''
      ).trim();
      const authorName = String(
        item?.authorName
          || item?.author_name
          || item?.author?.name
          || item?.user?.name
          || ''
      ).trim();
      const authorAvatar = String(
        item?.authorAvatar
          || item?.author_avatar
          || item?.author?.avatar
          || item?.author?.avatar_url
          || item?.user?.avatar
          || item?.avatar
          || ''
      ).trim();
      const rawDate = String(item?.date || item?.post_date || item?.create_time || '').trim();
      const id = String(item?.id || item?.post_id || item?.topic_id || '').trim();
      const viewCount = Number.parseInt(String(item?.views || item?.view_count || item?.visit_count || 0), 10);
      const commentCount = Number.parseInt(String(item?.comment_count || item?.comments || item?.commentCount || 0), 10);

      return {
        id,
        name: title,
        description,
        link,
        thumbnail,
        date: rawDate ? new Date(rawDate).toLocaleDateString() : '',
        authorName,
        authorAvatar,
        viewCount: Number.isFinite(viewCount) && viewCount > 0 ? viewCount : 0,
        commentCount: Number.isFinite(commentCount) && commentCount > 0 ? commentCount : 0,
        isNew: this.isNewPost(rawDate),
      };
    });
  }

  /**
   * 通过 WordPress v2 接口获取文章（稳定兜底）。
   * @param {Record<string, any>} options 拉取参数
   * @return {Promise<Array<any>>} 标准化文章数组
   */
  async fetchPostsFromWpV2(options = {}) {
    const { config, categoryId, tagId, page = 1, perPage = 10, orderBy = 'date', order = 'desc', search } = options;
    let url = `${config.apiUrl}/posts?page=${page}&per_page=${perPage}&orderby=${orderBy}&order=${order}&_embed=true`;
    if (categoryId) url += `&categories=${categoryId}`;
    if (tagId) url += `&tags=${tagId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await this.requestWordPressJson(url);
    const posts = Array.isArray(response.data) ? response.data : [];
    return this.normalizeWpV2Posts(posts);
  }

  /**
   * 通过 UIED 自定义接口获取文章。
   * @param {Record<string, any>} options 拉取参数
   * @return {Promise<Array<any>>} 标准化文章数组
   */
  async fetchPostsFromUiedApi(options = {}) {
    const {
      config,
      sourceMode = 'uied_latest',
      categoryId,
      tagId,
      page = 1,
      perPage = 10,
      orderBy = 'date',
      order = 'desc',
      search,
      period = 'all',
    } = options;
    const siteOrigin = this.resolveWordPressSiteOrigin(config.apiUrl);
    const basePath = `${siteOrigin}/wp-json/uied/v1`;
    const params = {
      page,
      per_page: perPage,
    };

    let endpoint = '/latest-posts';
    if (sourceMode === 'uied_hot') {
      endpoint = '/hot-posts';
      if (period) params.period = period;
      if (categoryId) params.category_id = categoryId;
      if (tagId) params.tag_id = tagId;
      if (search) params.search = search;
      if (orderBy) params.orderby = orderBy;
      if (order) params.order = order;
    } else if (categoryId) {
      endpoint = `/category-posts/${categoryId}`;
      if (orderBy) params.orderby = orderBy;
      if (order) params.order = order;
    } else if (tagId) {
      endpoint = `/tag-posts/${tagId}`;
      if (orderBy) params.orderby = orderBy;
      if (order) params.order = order;
    } else {
      endpoint = '/latest-posts';
      if (search) params.search = search;
      if (orderBy) params.orderby = orderBy;
      if (order) params.order = order;
    }

    const response = await this.requestWordPressJson(`${basePath}${endpoint}`, params);
    const payload = response.data;
    const rows = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.items)
        ? payload.items
        : (Array.isArray(payload?.data) ? payload.data : []));
    return this.normalizeUiedPosts(rows);
  }

  /**
   * 代理获取 WordPress 文章
   */
  async getPosts({ source = 'auto', period = 'all', categoryId, tagId, page = 1, perPage = 10, orderBy = 'date', order = 'desc', search }) {
    const normalizedSource = String(source || 'auto').trim().toLowerCase();
    const normalizedOrderBy = String(orderBy || 'date').trim().toLowerCase();
    const preferUiedHot = [ 'views', 'view', 'hot', 'comment_count' ].includes(normalizedOrderBy);
    const sourceMode = normalizedSource === 'auto'
      ? (preferUiedHot ? 'uied_hot' : 'uied_latest')
      : (normalizedSource === 'uied' ? 'uied_latest' : normalizedSource);

    const fetchOptions = {
      sourceMode,
      period: String(period || 'all').trim().toLowerCase(),
      categoryId,
      tagId,
      page: Math.max(1, Number.parseInt(page, 10) || 1),
      perPage: Math.max(1, Math.min(Number.parseInt(perPage, 10) || 10, 100)),
      orderBy: normalizedOrderBy,
      order: String(order || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
      search: String(search || '').trim(),
    };
    const cacheKey = this.buildPostsCacheKey(fetchOptions);
    const stores = this.getPostsRuntimeStores();
    const cached = stores.cache.get(cacheKey);

    if (cached?.expiresAt > Date.now() && Array.isArray(cached.data)) {
      return cached.data;
    }
    if (stores.pending.has(cacheKey)) {
      return await stores.pending.get(cacheKey);
    }

    /**
     * 执行一次上游读取；并发请求共用该 Promise，异常时优先返回过期缓存。
     */
    const requestPromise = (async () => {
      try {
        const config = await this.getDefaultConfig();
        const runtimeOptions = { ...fetchOptions, config };
        let rows;

        if ([ 'uied_hot', 'uied_latest' ].includes(sourceMode)) {
          try {
            rows = await this.fetchPostsFromUiedApi(runtimeOptions);
          } catch (error) {
            this.ctx.logger.warn(
              '[wordpressConfig] uied 接口拉取失败，自动回退 wp/v2:',
              error?.message || error
            );
          }
        }

        if (!Array.isArray(rows)) {
          rows = await this.fetchPostsFromWpV2(runtimeOptions);
        }

        const normalizedRows = Array.isArray(rows) ? rows : [];
        if (stores.cache.size >= 200 && !stores.cache.has(cacheKey)) {
          const oldestKey = stores.cache.keys().next().value;
          if (oldestKey) stores.cache.delete(oldestKey);
        }
        stores.cache.set(cacheKey, {
          data: normalizedRows,
          expiresAt: Date.now() + this.resolvePostsCacheTtl(config),
        });
        return normalizedRows;
      } catch (error) {
        if (Array.isArray(cached?.data)) {
          this.ctx.logger.warn(
            '[wordpressConfig] 上游不可用，返回过期文章缓存:',
            error?.message || error
          );
          return cached.data;
        }
        this.ctx.logger.error(
          '[wordpressConfig] 上游不可用且无缓存，降级为空列表:',
          error?.message || error
        );
        return [];
      }
    })();

    stores.pending.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (stores.pending.get(cacheKey) === requestPromise) {
        stores.pending.delete(cacheKey);
      }
    }
  }

  /**
   * 判断是否是新文章（7天内发布）
   */
  isNewPost(dateString) {
    const publishDate = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
    return diffInDays <= 7;
  }
}

module.exports = WordpressConfigService;
