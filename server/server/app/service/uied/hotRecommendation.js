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
    const offset = (page - 1) * pageSize;
    const now = Math.floor(Date.now() / 1000);

    let whereClause = 'is_delete = 0';
    const replacements = [];

    if (position) {
      whereClause += ' AND position = ?';
      replacements.push(position);
    }

    if (pageSlug) {
      whereClause += ' AND page_slug = ?';
      replacements.push(pageSlug);
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_hot_recommendation WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    // 获取列表 - 映射字段名以兼容 Vue 管理后台
    const items = await app.model.query(
      `SELECT id, name as websiteName, name as title, description, url as websiteUrl, 
              icon_url as websiteIcon, icon_url as iconUrl, page_slug as pageSlug,
              position, sort as sortOrder, is_show as isActive,
              start_time as startTime, end_time as endTime,
              click_count as clickCount,
              create_time as createdAt
       FROM uied_hot_recommendation
       WHERE ${whereClause}
       ORDER BY sort ASC, id DESC
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

    const [ item ] = await app.model.query(
      `SELECT id, name, description, url, icon_url as iconUrl, page_slug as pageSlug,
              position, sort as sortOrder, is_show as isShow,
              start_time as startTime, end_time as endTime,
              click_count as clickCount,
              create_time as createdAt
       FROM uied_hot_recommendation
       WHERE id = ? AND is_delete = 0`,
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
    const now = Math.floor(Date.now() / 1000);
    const { startTime, endTime } = this.normalizeScheduleWindow(data);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_hot_recommendation (name, description, url, icon_url, page_slug, position, sort, is_show, start_time, end_time, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.name,
          data.description || '',
          data.url,
          data.iconUrl || null,
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
    const now = Math.floor(Date.now() / 1000);
    const { startTime, endTime } = this.normalizeScheduleWindow(data);

    const updates = [];
    const values = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.iconUrl !== undefined) { updates.push('icon_url = ?'); values.push(data.iconUrl); }
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

    // LEFT JOIN uied_website 通过 URL 匹配，获取真实的 website_id 和 slug
    const items = await app.model.query(
      `SELECT hr.id, hr.name, hr.description, hr.url, hr.icon_url as iconUrl, 
              hr.page_slug as pageSlug, hr.position, hr.sort as 'order',
              hr.start_time as startTime, hr.end_time as endTime,
              hr.is_show as visible, hr.click_count as clickCount,
              w.id as websiteId, w.slug as websiteSlug, w.tags as websiteTags
       FROM uied_hot_recommendation hr
       LEFT JOIN uied_website w ON hr.url = w.url AND w.is_delete = 0
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
