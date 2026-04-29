/**
 * @file service/uied/hotRecommendation.js
 * @description UIED 热门推荐服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class HotRecommendationService extends Service {
  /**
   * 判断是否为字段已存在错误，避免自动补丁重复执行时报错。
   * @param {Error} error 异常对象
   * @return {boolean} 是否字段重复
   */
  isDuplicateColumnError(error) {
    const message = String(error?.message || '');
    const code = String(error?.original?.code || error?.code || '').toUpperCase();
    return code === 'ER_DUP_FIELDNAME' || /Duplicate column name/i.test(message);
  }

  /**
   * 判断是否为索引已存在错误，避免自动补丁重复执行时报错。
   * @param {Error} error 异常对象
   * @return {boolean} 是否索引重复
   */
  isDuplicateKeyError(error) {
    const message = String(error?.message || '');
    const code = String(error?.original?.code || error?.code || '').toUpperCase();
    return code === 'ER_DUP_KEYNAME' || /Duplicate key name/i.test(message);
  }

  /**
   * 规范化网站 ID，只保留正整数。
   * @param {unknown} value 原始网站 ID
   * @return {number} 规范化后的网站 ID
   */
  normalizeWebsiteId(value) {
    const id = Number.parseInt(String(value || 0), 10);
    return Number.isInteger(id) && id > 0 ? id : 0;
  }

  /**
   * 确保热门推荐表存在 website_id 字段，并按 URL 回填历史数据。
   */
  async ensureWebsiteIdColumn() {
    if (this._hotRecommendationWebsiteIdColumnReady) return;
    const { app, ctx } = this;

    try {
      await app.model.query(
        'ALTER TABLE `uied_hot_recommendation` ADD COLUMN `website_id` int unsigned NOT NULL DEFAULT 0 COMMENT \'关联网站ID\' AFTER `old_id`',
        { type: app.Sequelize.QueryTypes.RAW }
      );
    } catch (error) {
      if (!this.isDuplicateColumnError(error)) {
        ctx.logger.warn('[uied.hotRecommendation] 自动补齐 website_id 字段失败，请手动执行 SQL 补丁: %s', error.message);
      }
    }

    try {
      await app.model.query(
        'ALTER TABLE `uied_hot_recommendation` ADD KEY `idx_website_id` (`website_id`)',
        { type: app.Sequelize.QueryTypes.RAW }
      );
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) {
        ctx.logger.warn('[uied.hotRecommendation] 自动补齐 website_id 索引失败，请手动执行 SQL 补丁: %s', error.message);
      }
    }

    try {
      await app.model.query(
        `UPDATE uied_hot_recommendation hr
         INNER JOIN uied_website w ON hr.url = w.url AND w.is_delete = 0
         SET hr.website_id = w.id
         WHERE hr.is_delete = 0 AND (hr.website_id IS NULL OR hr.website_id = 0)`,
        { type: app.Sequelize.QueryTypes.UPDATE }
      );
    } catch (error) {
      ctx.logger.warn('[uied.hotRecommendation] 历史热门推荐 website_id 回填失败，可忽略后重新选择网站: %s', error.message);
    }

    this._hotRecommendationWebsiteIdColumnReady = true;
  }

  /**
   * 按网站 ID 或 URL 获取网站库最新信息，优先使用网站 ID。
   * @param {{websiteId?: unknown, url?: unknown}} params 查询参数
   * @return {Promise<object|null>} 网站信息
   */
  async findWebsiteSource(params = {}) {
    const { app } = this;
    const websiteId = this.normalizeWebsiteId(params.websiteId);
    if (websiteId > 0) {
      const [ website ] = await app.model.query(
        `SELECT id, name, description, url, icon_url as iconUrl, slug, tags
         FROM uied_website
         WHERE id = ? AND is_delete = 0
         LIMIT 1`,
        { replacements: [ websiteId ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (website) return website;
    }

    const url = String(params.url || '').trim();
    if (!url) return null;
    const [ website ] = await app.model.query(
      `SELECT id, name, description, url, icon_url as iconUrl, slug, tags
       FROM uied_website
       WHERE url = ? AND is_delete = 0
       ORDER BY id DESC
       LIMIT 1`,
      { replacements: [ url ], type: app.Sequelize.QueryTypes.SELECT }
    );
    return website || null;
  }

  /**
   * 构建热门推荐入库数据，绑定网站 ID 并保存一份快照兜底。
   * @param {object} data 表单数据
   * @return {Promise<object>} 标准化后的入库数据
   */
  async buildStoragePayload(data = {}) {
    const website = await this.findWebsiteSource({
      websiteId: data.websiteId,
      url: data.url,
    });
    const hasOwnDescription = Object.prototype.hasOwnProperty.call(data, 'description');
    const websiteId = website ? this.normalizeWebsiteId(website.id) : this.normalizeWebsiteId(data.websiteId);
    const name = String((website && website.name) || data.name || '').trim();
    const url = String((website && website.url) || data.url || '').trim();
    return {
      websiteId,
      name,
      url,
      description: String(hasOwnDescription ? data.description || '' : (website && website.description) || '').trim(),
      iconUrl: String(data.iconUrl || (website && website.iconUrl) || '').trim() || null,
    };
  }

  /**
   * 规范化投放时间戳（秒）
   * @param {unknown} value 原始值
   * @return {number} 标准化后的秒级时间戳，未设置时返回 0
   */
  normalizeScheduleTimestamp(value) {
    const raw = Number(value || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.floor(raw);
  }

  /**
   * 规范化投放时间窗口
   * @param {{startTime?: unknown, endTime?: unknown}} data 原始表单数据
   * @return {{startTime: number, endTime: number}} 标准化时间窗口
   */
  normalizeScheduleWindow(data = {}) {
    const startTime = this.normalizeScheduleTimestamp(data.startTime);
    const endTime = this.normalizeScheduleTimestamp(data.endTime);
    if (startTime > 0 && endTime > 0 && endTime < startTime) {
      throw new Error('结束时间不能早于开始时间');
    }
    return {
      startTime,
      endTime,
    };
  }

  /**
   * 解析当前投放状态
   * @param {{isShow?: boolean|number, startTime?: number, endTime?: number}} item 推荐项
   * @param {number} now 当前时间戳（秒）
   * @return {'hidden'|'pending'|'active'|'expired'} 当前投放状态
   */
  resolveScheduleStatus(item, now = Math.floor(Date.now() / 1000)) {
    const isShow = item && (item.isShow === true || item.isShow === 1 || item.isActive === true || item.isActive === 1);
    const startTime = this.normalizeScheduleTimestamp(item?.startTime);
    const endTime = this.normalizeScheduleTimestamp(item?.endTime);
    if (!isShow) return 'hidden';
    if (startTime > 0 && startTime > now) return 'pending';
    if (endTime > 0 && endTime < now) return 'expired';
    return 'active';
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
      recommended: 'recommended',
      recommend: 'recommended',
      'weight:recommended': 'recommended',
      enterprise_verified: 'enterprise_verified',
      enterpriseverified: 'enterprise_verified',
      enterprise: 'enterprise_verified',
      verified_enterprise: 'enterprise_verified',
      'weight:enterprise_verified': 'enterprise_verified',
    };
    aliasMap.官网 = 'official';
    aliasMap.官方 = 'official';
    aliasMap.推荐 = 'recommended';
    aliasMap.企业认证 = 'enterprise_verified';
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
   * 获取热门推荐列表
   */
  async list({ page = 1, pageSize = 20, position, pageSlug }) {
    const { app } = this;
    await this.ensureWebsiteIdColumn();
    const offset = (page - 1) * pageSize;
    const now = Math.floor(Date.now() / 1000);

    let whereClause = 'hr.is_delete = 0';
    const replacements = [];

    if (position) {
      whereClause += ' AND hr.position = ?';
      replacements.push(position);
    }

    if (pageSlug) {
      whereClause += ' AND hr.page_slug = ?';
      replacements.push(pageSlug);
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_hot_recommendation hr WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    // 获取列表 - 映射字段名以兼容 Vue 管理后台
    const items = await app.model.query(
      `SELECT hr.id, COALESCE(w.id, hr.website_id, 0) as websiteId,
              COALESCE(NULLIF(w.name, ''), hr.name) as name,
              COALESCE(NULLIF(w.name, ''), hr.name) as websiteName,
              COALESCE(NULLIF(w.name, ''), hr.name) as title,
              hr.name as storedName,
              hr.description,
              COALESCE(NULLIF(w.url, ''), hr.url) as url,
              COALESCE(NULLIF(w.url, ''), hr.url) as websiteUrl,
              COALESCE(NULLIF(hr.icon_url, ''), NULLIF(w.icon_url, '')) as websiteIcon,
              COALESCE(NULLIF(hr.icon_url, ''), NULLIF(w.icon_url, '')) as iconUrl,
              hr.page_slug as pageSlug,
              hr.position, hr.sort as sortOrder, hr.is_show as isActive,
              hr.start_time as startTime, hr.end_time as endTime,
              hr.click_count as clickCount,
              hr.create_time as createdAt
       FROM uied_hot_recommendation hr
       LEFT JOIN uied_website w
         ON w.is_delete = 0
        AND ((hr.website_id > 0 AND w.id = hr.website_id)
          OR ((hr.website_id IS NULL OR hr.website_id = 0) AND w.url = hr.url))
       WHERE ${whereClause}
       ORDER BY hr.sort ASC, hr.id DESC
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    const lists = items.map(item => ({
      ...item,
      isActive: item.isActive === 1,
      scheduleStatus: this.resolveScheduleStatus(item, now),
    }));

    return { lists, count: countResult.total, page, pageSize };
  }

  /**
   * 获取热门推荐详情
   */
  async detail(id) {
    const { app } = this;
    await this.ensureWebsiteIdColumn();

    const [ item ] = await app.model.query(
      `SELECT hr.id, COALESCE(w.id, hr.website_id, 0) as websiteId,
              COALESCE(NULLIF(w.name, ''), hr.name) as name,
              hr.name as storedName,
              hr.description,
              COALESCE(NULLIF(w.url, ''), hr.url) as url,
              COALESCE(NULLIF(hr.icon_url, ''), NULLIF(w.icon_url, '')) as iconUrl,
              hr.page_slug as pageSlug,
              hr.position, hr.sort as sortOrder, hr.is_show as isShow,
              hr.start_time as startTime, hr.end_time as endTime,
              hr.click_count as clickCount,
              hr.create_time as createdAt
       FROM uied_hot_recommendation hr
       LEFT JOIN uied_website w
         ON w.is_delete = 0
        AND ((hr.website_id > 0 AND w.id = hr.website_id)
          OR ((hr.website_id IS NULL OR hr.website_id = 0) AND w.url = hr.url))
       WHERE hr.id = ? AND hr.is_delete = 0`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!item) return null;

    return {
      ...item,
      isShow: item.isShow === 1,
      scheduleStatus: this.resolveScheduleStatus(item),
    };
  }

  /**
   * 创建热门推荐
   */
  async add(data) {
    const { app } = this;
    await this.ensureWebsiteIdColumn();
    const now = Math.floor(Date.now() / 1000);
    const { startTime, endTime } = this.normalizeScheduleWindow(data);
    const storagePayload = await this.buildStoragePayload(data);

    if (!storagePayload.name || !storagePayload.url) {
      throw new Error('请选择有效的网站');
    }

    const [ result ] = await app.model.query(
      `INSERT INTO uied_hot_recommendation (website_id, name, description, url, icon_url, page_slug, position, sort, is_show, start_time, end_time, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          storagePayload.websiteId,
          storagePayload.name,
          storagePayload.description,
          storagePayload.url,
          storagePayload.iconUrl,
          data.pageSlug || null,
          data.position || 'hot',
          data.sortOrder || 0,
          data.isShow !== false ? 1 : 0,
          startTime || null,
          endTime || null,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新热门推荐
   */
  async edit(data) {
    const { app } = this;
    await this.ensureWebsiteIdColumn();
    const now = Math.floor(Date.now() / 1000);
    const { startTime, endTime } = this.normalizeScheduleWindow(data);
    const storagePayload = await this.buildStoragePayload(data);

    const updates = [];
    const values = [];

    if (data.websiteId !== undefined || storagePayload.websiteId > 0) {
      updates.push('website_id = ?'); values.push(storagePayload.websiteId);
    }
    if (data.name !== undefined || storagePayload.name) { updates.push('name = ?'); values.push(storagePayload.name || data.name || ''); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(storagePayload.description); }
    if (data.url !== undefined || storagePayload.url) { updates.push('url = ?'); values.push(storagePayload.url || data.url || ''); }
    if (data.iconUrl !== undefined) { updates.push('icon_url = ?'); values.push(storagePayload.iconUrl); }
    if (data.pageSlug !== undefined) { updates.push('page_slug = ?'); values.push(data.pageSlug); }
    if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
    if (data.sortOrder !== undefined) { updates.push('sort = ?'); values.push(data.sortOrder); }
    if (data.isShow !== undefined) { updates.push('is_show = ?'); values.push(data.isShow ? 1 : 0); }
    if (data.startTime !== undefined) { updates.push('start_time = ?'); values.push(startTime || null); }
    if (data.endTime !== undefined) { updates.push('end_time = ?'); values.push(endTime || null); }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_hot_recommendation SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    return data;
  }

  /**
   * 删除热门推荐
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    await app.model.query(
      'UPDATE uied_hot_recommendation SET is_delete = 1, delete_time = ? WHERE id = ?',
      { replacements: [ now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 获取激活的热门推荐（前端调用）
   * 返回字段与前端 useHotRecommendations hook 期望的格式一致
   */
  async getActive(position, limit = 20) {
    const { app } = this;
    await this.ensureWebsiteIdColumn();
    const now = Math.floor(Date.now() / 1000);

    let whereClause = 'hr.is_delete = 0 AND hr.is_show = 1';
    const replacements = [];
    whereClause += ' AND (hr.start_time IS NULL OR hr.start_time = 0 OR hr.start_time <= ?)';
    replacements.push(now);
    whereClause += ' AND (hr.end_time IS NULL OR hr.end_time = 0 OR hr.end_time >= ?)';
    replacements.push(now);

    if (position && position !== 'all') {
      whereClause += ' AND hr.position = ?';
      replacements.push(position);
    }

    // 优先通过 website_id 绑定网站，历史数据回退到 URL 匹配。
    const items = await app.model.query(
      `SELECT hr.id,
              COALESCE(NULLIF(w.name, ''), hr.name) as name,
              hr.description,
              COALESCE(NULLIF(w.url, ''), hr.url) as url,
              COALESCE(NULLIF(hr.icon_url, ''), NULLIF(w.icon_url, '')) as iconUrl,
              hr.page_slug as pageSlug, hr.position, hr.sort as 'order',
              hr.start_time as startTime, hr.end_time as endTime,
              hr.is_show as visible, hr.click_count as clickCount,
              COALESCE(w.id, hr.website_id, 0) as websiteId,
              w.slug as websiteSlug, w.tags as websiteTags
       FROM uied_hot_recommendation hr
       LEFT JOIN uied_website w
         ON w.is_delete = 0
        AND ((hr.website_id > 0 AND w.id = hr.website_id)
          OR ((hr.website_id IS NULL OR hr.website_id = 0) AND w.url = hr.url))
       WHERE ${whereClause}
       ORDER BY hr.sort ASC, hr.id DESC
       LIMIT ?`,
      { replacements: [ ...replacements, limit ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 转换 visible 为布尔值
    return items.map(item => {
      const tagBundle = this.parseWebsiteTagBundle(item.websiteTags);
      return {
        ...item,
        visible: item.visible === 1,
        websiteId: item.websiteId || null,
        websiteSlug: item.websiteSlug || null,
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });
  }

  /**
   * 记录热门推荐点击
   */
  async recordClick(id) {
    const { app } = this;

    await app.model.query(
      'UPDATE uied_hot_recommendation SET click_count = click_count + 1 WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }
}

module.exports = HotRecommendationService;
