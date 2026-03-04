/**
 * @file service/uied/website.js
 * @description UIED 网站管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class WebsiteService extends Service {
  /**
   * 规范化网站状态值（兼容历史 normal 与新版 active）
   * @param {unknown} statusValue 显式状态
   * @param {unknown} isActiveValue 兼容布尔开关值
   * @param {string} fallback 默认状态
   * @return {string} 规范化后的状态
   */
  normalizeWebsiteStatus(statusValue, isActiveValue, fallback = 'unchecked') {
    const normalized = String(statusValue || '').trim().toLowerCase();
    if (normalized === 'normal') return 'active';
    if ([ 'active', 'disabled', 'unchecked', 'failed', 'draft' ].includes(normalized)) {
      return normalized;
    }
    if (isActiveValue !== undefined && isActiveValue !== null) {
      return Number(isActiveValue) === 1 ? 'active' : 'disabled';
    }
    return fallback;
  }

  /**
   * 安全解析网站标签 JSON，避免脏数据导致接口报错
   * @param {unknown} source 标签字段原始值
   * @return {string[]} 标签列表
   */
  parseWebsiteTags(source) {
    return this.parseWebsiteTagBundle(source).tags;
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
      '官网': 'official',
      '官方': 'official',
      recommended: 'recommended',
      recommend: 'recommended',
      'weight:recommended': 'recommended',
      '推荐': 'recommended',
      enterprise_verified: 'enterprise_verified',
      enterpriseverified: 'enterprise_verified',
      enterprise: 'enterprise_verified',
      verified_enterprise: 'enterprise_verified',
      'weight:enterprise_verified': 'enterprise_verified',
      '企业认证': 'enterprise_verified',
    };
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
   * 合并普通标签与权重标签为数据库存储结构
   * @param {unknown} tags 普通标签
   * @param {unknown} weightTags 权重标签
   * @return {string[]} 可直接入库的标签数组
   */
  buildStoredWebsiteTags(tags, weightTags) {
    const normalTags = this.parseWebsiteTagBundle(tags).tags;
    const inheritedWeightTags = this.parseWebsiteTagBundle(tags).weightTags;
    const inputWeightTags = this.parseStringList(weightTags)
      .map(item => this.normalizeWebsiteWeightTag(item))
      .filter(Boolean);
    const mergedWeightTags = Array.from(new Set([ ...inheritedWeightTags, ...inputWeightTags ]));
    const storageWeightTags = mergedWeightTags.map(item => `weight:${item}`);
    return Array.from(new Set([ ...normalTags, ...storageWeightTags ]));
  }

  /**
   * 解析字符串/数组参数为去重后的字符串列表（兼容 query: a,b 或 a[]）
   * @param {unknown} value 输入值
   * @return {string[]} 规范化后的字符串列表
   */
  parseStringList(value) {
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map(item => String(item || '').trim()).filter(Boolean)));
    }
    return Array.from(
      new Set(
        String(value || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      )
    );
  }

  /**
   * 解析分类 ID 列表（仅保留正整数）
   * @param {unknown} value 输入值
   * @return {number[]} 分类ID列表
   */
  parseCategoryIdList(value) {
    return this.parseStringList(value)
      .map(item => Number.parseInt(item, 10))
      .filter(item => Number.isInteger(item) && item > 0);
  }

  /**
   * 规范化 varchar 字段（去首尾空格 + 截断），避免写库时报 Data too long。
   * @param {unknown} value 原始值
   * @param {number} maxLength 最大长度
   * @param {Object} options 选项
   * @param {boolean} options.allowNull 是否允许返回 null
   * @param {string} options.fallback 非空字段默认值
   * @return {string|null} 处理后的值
   */
  normalizeVarchar(value, maxLength, options = {}) {
    const allowNull = options.allowNull !== false;
    const fallback = options.fallback !== undefined ? String(options.fallback) : '';
    if (value === null || value === undefined) {
      return allowNull ? null : fallback;
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return allowNull ? null : fallback;
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.slice(0, maxLength);
  }

  /**
   * 获取网站列表（分页）
   * @param {Object} params
   * @param {number} params.categoryId - 分类ID
   * @param {boolean} params.includeChildren - 是否包含子分类的网站
   */
  async list({
    page = 1,
    pageSize = 20,
    categoryId,
    categoryIds,
    keyword,
    status,
    statusList,
    flagList,
    sortBy,
    includeChildren,
    hasDetailContent,
    hasThumbnail,
  }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'w.is_delete = 0';
    const replacements = [];

    const categoryIdList = Array.from(
      new Set([
        ...this.parseCategoryIdList(categoryId),
        ...this.parseCategoryIdList(categoryIds),
      ])
    );
    if (categoryIdList.length > 0) {
      const placeholders = categoryIdList.map(() => '?').join(',');
      if (includeChildren) {
        whereClause += ` AND (
          w.category_id IN (${placeholders})
          OR w.category_id IN (
            SELECT id FROM uied_category WHERE parent_id IN (${placeholders}) AND is_delete = 0
          )
        )`;
        replacements.push(...categoryIdList, ...categoryIdList);
      } else {
        whereClause += ` AND w.category_id IN (${placeholders})`;
        replacements.push(...categoryIdList);
      }
    }

    if (keyword) {
      whereClause += ' AND (w.name LIKE ? OR w.description LIKE ? OR w.url LIKE ? OR w.slug LIKE ? OR w.tags LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      replacements.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    const parsedStatusList = Array.from(
      new Set([
        ...this.parseStringList(status),
        ...this.parseStringList(statusList),
      ].map(item => item.toLowerCase()))
    );
    if (parsedStatusList.length > 0) {
      const includesPublished = parsedStatusList.some(item => item === 'active' || item === 'normal');
      const exactStatuses = parsedStatusList.filter(item => item !== 'active' && item !== 'normal');
      const statusClauses = [];
      if (includesPublished) {
        statusClauses.push("(w.status IN ('active', 'normal') OR w.status IS NULL OR w.status = '')");
      }
      if (exactStatuses.length > 0) {
        statusClauses.push(`w.status IN (${exactStatuses.map(() => '?').join(',')})`);
        replacements.push(...exactStatuses);
      }
      if (statusClauses.length > 0) {
        whereClause += ` AND (${statusClauses.join(' OR ')})`;
      }
    }

    const parsedFlagList = Array.from(
      new Set(this.parseStringList(flagList).map(item => item.toLowerCase()))
    );
    if (parsedFlagList.includes('pinned')) whereClause += ' AND w.is_pinned = 1';
    if (parsedFlagList.includes('hot')) whereClause += ' AND w.is_hot = 1';
    if (parsedFlagList.includes('featured')) whereClause += ' AND w.is_featured = 1';
    if (parsedFlagList.includes('new')) whereClause += ' AND w.is_new = 1';

    let orderByClause = 'w.is_pinned DESC, w.sort ASC, w.id DESC';
    switch (String(sortBy || '').trim().toLowerCase()) {
      case 'sort_asc':
        orderByClause = 'w.sort ASC, w.id DESC';
        break;
      case 'sort_desc':
        orderByClause = 'w.sort DESC, w.id DESC';
        break;
      case 'click_desc':
        orderByClause = 'w.click_count DESC, w.id DESC';
        break;
      case 'create_desc':
        orderByClause = 'w.create_time DESC, w.id DESC';
        break;
      case 'create_asc':
        orderByClause = 'w.create_time ASC, w.id ASC';
        break;
      case 'update_desc':
        orderByClause = 'w.update_time DESC, w.id DESC';
        break;
      case 'update_asc':
        orderByClause = 'w.update_time ASC, w.id ASC';
        break;
      default:
        break;
    }

    if (hasDetailContent === '1') {
      whereClause += " AND w.detail_content IS NOT NULL AND TRIM(w.detail_content) != ''";
    } else if (hasDetailContent === '0') {
      whereClause += " AND (w.detail_content IS NULL OR TRIM(w.detail_content) = '')";
    }

    if (hasThumbnail === '1') {
      whereClause += " AND w.thumbnail IS NOT NULL AND TRIM(w.thumbnail) != ''";
    } else if (hasThumbnail === '0') {
      whereClause += " AND (w.thumbnail IS NULL OR TRIM(w.thumbnail) = '')";
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_website w WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );
    const total = countResult.total;

    // 获取列表
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot, w.is_pinned as isPinned,
              w.tags, w.sort as sortOrder, w.click_count as clickCount,
              w.status as status, w.create_time as createdAt, w.update_time as updatedAt
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}
       ORDER BY ${orderByClause}
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 转换布尔值和解析 tags
    const list = websites.map(w => {
      const normalizedStatus = this.normalizeWebsiteStatus(w.status, undefined, 'active');
      const tagBundle = this.parseWebsiteTagBundle(w.tags);
      return {
        ...w,
        status: normalizedStatus,
        isNew: w.isNew === 1,
        isFeatured: w.isFeatured === 1,
        isHot: w.isHot === 1,
        isPinned: w.isPinned === 1,
        isActive: normalizedStatus === 'active',
        tags: tagBundle.tags,
        weightTags: tagBundle.weightTags,
      };
    });

    return {
      lists: list,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }


  /**
   * 获取网站详情
   */
  async detail(id, slug) {
    const { app } = this;

    let whereClause = 'w.is_delete = 0';
    const replacements = [];

    if (id) {
      whereClause += ' AND w.id = ?';
      replacements.push(id);
    } else if (slug) {
      whereClause += ' AND w.slug = ?';
      replacements.push(slug);
    }

    const [ website ] = await app.model.query(
      `SELECT w.*, c.name as categoryName, c.slug as categorySlug
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!website) return null;

    let trafficMetrics = null;
    try {
      trafficMetrics = await this.ctx.service.uied.websiteTrafficMetric.getByWebsiteId(website.id);
    } catch (error) {
      this.ctx.logger.warn('[uied.website.detail] 获取网站访问数据失败，忽略:', error.message);
    }

    // 转换字段名和类型
    const normalizedStatus = this.normalizeWebsiteStatus(website.status, undefined, 'active');
    const tagBundle = this.parseWebsiteTagBundle(website.tags);
    return {
      id: website.id,
      name: website.name,
      slug: website.slug,
      description: website.description,
      url: website.url,
      iconUrl: website.icon_url,
      categoryId: website.category_id,
      categoryName: website.categoryName,
      categorySlug: website.categorySlug,
      isNew: website.is_new === 1,
      isFeatured: website.is_featured === 1,
      isHot: website.is_hot === 1,
      isPinned: website.is_pinned === 1,
      tags: tagBundle.tags,
      weightTags: tagBundle.weightTags,
      order: website.sort,
      clickCount: website.click_count,
      seoTitle: website.seo_title,
      seoDescription: website.seo_description,
      seoKeywords: website.seo_keywords,
      detailContent: website.detail_content,
      screenshots: website.screenshots ? JSON.parse(website.screenshots) : [],
      thumbnail: website.thumbnail,
      visitBtnText: website.visit_btn_text,
      trafficMetrics,
      status: normalizedStatus,
      statusReason: String(website.status_message || website.check_error || '').trim(),
      lastCheckedAt: (() => {
        const raw = Number(website.last_checked_at || website.last_check_time || 0);
        if (!Number.isFinite(raw) || raw <= 0) return null;
        const milliseconds = raw > 9999999999 ? raw : raw * 1000;
        return new Date(milliseconds).toISOString();
      })(),
      createdAt: website.create_time,
      updatedAt: website.update_time,
    };
  }

  /**
   * 创建网站
   */
  async add(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedSlug = this.normalizeVarchar(data.slug, 200, { allowNull: true });

    // 检查 slug 是否已存在
    if (normalizedSlug) {
      const [ existing ] = await app.model.query(
        'SELECT id FROM uied_website WHERE slug = ? AND is_delete = 0',
        { replacements: [ normalizedSlug ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (existing) {
        throw new Error('网站别名已存在');
      }
    }

    const normalizedStatus = this.normalizeWebsiteStatus(data.status, data.isActive, 'unchecked');
    const [ result ] = await app.model.query(
      `INSERT INTO uied_website (name, slug, description, url, icon_url, category_id,
        is_new, is_featured, is_hot, is_pinned, tags, sort, click_count,
        seo_title, seo_description, seo_keywords, detail_content, screenshots, thumbnail, visit_btn_text,
        status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          this.normalizeVarchar(data.name, 200, { allowNull: false, fallback: '' }),
          normalizedSlug,
          data.description || '',
          this.normalizeVarchar(data.url, 500, { allowNull: false, fallback: '' }),
          this.normalizeVarchar(data.iconUrl, 500, { allowNull: true }),
          Number(data.categoryId || 0),
          data.isNew ? 1 : 0,
          data.isFeatured ? 1 : 0,
          data.isHot ? 1 : 0,
          data.isPinned ? 1 : 0,
          JSON.stringify(this.buildStoredWebsiteTags(data.tags, data.weightTags)),
          data.order || 0,
          0,
          this.normalizeVarchar(data.seoTitle, 100, { allowNull: true }),
          this.normalizeVarchar(data.seoDescription, 300, { allowNull: true }),
          this.normalizeVarchar(data.seoKeywords, 200, { allowNull: true }),
          data.detailContent || null,
          data.screenshots ? JSON.stringify(data.screenshots) : null,
          this.normalizeVarchar(data.thumbnail, 500, { allowNull: true }),
          this.normalizeVarchar(data.visitBtnText, 50, { allowNull: true }),
          normalizedStatus,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    const websiteId = Number(result || 0);
    if (websiteId > 0 && data.trafficMetrics !== undefined) {
      try {
        await this.ctx.service.uied.websiteTrafficMetric.saveByWebsiteId(websiteId, data.trafficMetrics || {});
      } catch (error) {
        this.ctx.logger.warn('[uied.website.add] 保存网站访问数据失败，忽略:', error.message);
      }
    }

    return { id: result, ...data };
  }


  /**
   * 更新网站
   */
  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const hasSlugField = Object.prototype.hasOwnProperty.call(data, 'slug');
    const normalizedSlug = hasSlugField
      ? this.normalizeVarchar(data.slug, 200, { allowNull: true })
      : undefined;

    // 检查网站是否存在
    const [ existing ] = await app.model.query(
      'SELECT id, tags FROM uied_website WHERE id = ? AND is_delete = 0',
      { replacements: [ data.id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!existing) {
      throw new Error('网站不存在');
    }

    // 检查 slug 是否被其他网站使用
    if (hasSlugField && normalizedSlug) {
      const [ slugExists ] = await app.model.query(
        'SELECT id FROM uied_website WHERE slug = ? AND id != ? AND is_delete = 0',
        { replacements: [ normalizedSlug, data.id ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (slugExists) {
        throw new Error('网站别名已存在');
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(this.normalizeVarchar(data.name, 200, { allowNull: false, fallback: '' }));
    }
    if (hasSlugField) { updates.push('slug = ?'); values.push(normalizedSlug); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(this.normalizeVarchar(data.url, 500, { allowNull: false, fallback: '' }));
    }
    if (data.iconUrl !== undefined) {
      updates.push('icon_url = ?');
      values.push(this.normalizeVarchar(data.iconUrl, 500, { allowNull: true }));
    }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); values.push(data.categoryId); }
    if (data.isNew !== undefined) { updates.push('is_new = ?'); values.push(data.isNew ? 1 : 0); }
    if (data.isFeatured !== undefined) { updates.push('is_featured = ?'); values.push(data.isFeatured ? 1 : 0); }
    if (data.isHot !== undefined) { updates.push('is_hot = ?'); values.push(data.isHot ? 1 : 0); }
    if (data.isPinned !== undefined) { updates.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0); }
    if (data.tags !== undefined || data.weightTags !== undefined) {
      const storedTagBundle = this.parseWebsiteTagBundle(existing.tags);
      const nextTags = data.tags !== undefined ? data.tags : storedTagBundle.tags;
      const nextWeightTags = data.weightTags !== undefined ? data.weightTags : storedTagBundle.weightTags;
      updates.push('tags = ?');
      values.push(JSON.stringify(this.buildStoredWebsiteTags(nextTags, nextWeightTags)));
    }
    if (data.order !== undefined) { updates.push('sort = ?'); values.push(data.order); }
    if (data.seoTitle !== undefined) {
      updates.push('seo_title = ?');
      values.push(this.normalizeVarchar(data.seoTitle, 100, { allowNull: true }));
    }
    if (data.seoDescription !== undefined) {
      updates.push('seo_description = ?');
      values.push(this.normalizeVarchar(data.seoDescription, 300, { allowNull: true }));
    }
    if (data.seoKeywords !== undefined) {
      updates.push('seo_keywords = ?');
      values.push(this.normalizeVarchar(data.seoKeywords, 200, { allowNull: true }));
    }
    if (data.detailContent !== undefined) { updates.push('detail_content = ?'); values.push(data.detailContent); }
    if (data.screenshots !== undefined) { updates.push('screenshots = ?'); values.push(JSON.stringify(data.screenshots)); }
    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      values.push(this.normalizeVarchar(data.thumbnail, 500, { allowNull: true }));
    }
    if (data.visitBtnText !== undefined) {
      updates.push('visit_btn_text = ?');
      values.push(this.normalizeVarchar(data.visitBtnText, 50, { allowNull: true }));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(this.normalizeWebsiteStatus(data.status, data.isActive, 'unchecked'));
    }
    if (data.status === undefined && data.isActive !== undefined) {
      updates.push('status = ?');
      values.push(this.normalizeWebsiteStatus(undefined, data.isActive, 'unchecked'));
    }

    updates.push('update_time = ?');
    values.push(now);
    values.push(data.id);

    await app.model.query(
      `UPDATE uied_website SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values, type: app.Sequelize.QueryTypes.UPDATE }
    );

    if (data.trafficMetrics !== undefined) {
      try {
        await this.ctx.service.uied.websiteTrafficMetric.saveByWebsiteId(data.id, data.trafficMetrics || {});
      } catch (error) {
        this.ctx.logger.warn('[uied.website.edit] 保存网站访问数据失败，忽略:', error.message);
      }
    }

    return data;
  }

  /**
   * 删除网站
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    await app.model.query(
      'UPDATE uied_website SET is_delete = 1, delete_time = ? WHERE id = ?',
      { replacements: [ now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 批量删除网站
   */
  async batchDel(ids) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    await app.model.query(
      `UPDATE uied_website SET is_delete = 1, delete_time = ? WHERE id IN (${ids.join(',')})`,
      { replacements: [ now ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 增加点击次数
   */
  async incrementClick(id) {
    const { app } = this;
    await app.model.query(
      'UPDATE uied_website SET click_count = click_count + 1 WHERE id = ?',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 搜索网站
   */
  async search({ keyword, pageSlug, page = 1, pageSize = 20 }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;
    const likeKeyword = `%${keyword}%`;

    let whereClause = 'w.is_delete = 0 AND (w.name LIKE ? OR w.description LIKE ? OR w.tags LIKE ?)';
    const replacements = [ likeKeyword, likeKeyword, likeKeyword ];

    // 如果指定了页面，只搜索该页面的分类下的网站
    if (pageSlug) {
      whereClause += ` AND w.category_id IN (
        SELECT pc.category_id FROM uied_page_category pc
        INNER JOIN uied_page p ON pc.page_id = p.id
        WHERE p.slug = ? AND pc.is_delete = 0
      )`;
      replacements.push(pageSlug);
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_website w WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    // 获取列表
    const websites = await app.model.query(
      `SELECT w.id, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot,
              w.tags, w.click_count as clickCount
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE ${whereClause}
       ORDER BY w.click_count DESC, w.id DESC
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    const list = websites.map(w => ({
      ...w,
      isNew: w.isNew === 1,
      isFeatured: w.isFeatured === 1,
      isHot: w.isHot === 1,
      ...this.parseWebsiteTagBundle(w.tags),
    }));

    return {
      lists: list,
      count: countResult.total,
      page,
      pageSize,
    };
  }

  /**
   * 通过ID列表获取网站（支持新数字ID和旧cuid格式）
   */
  async getByIds(ids) {
    const { app } = this;
    if (!ids || ids.length === 0) return [];

    // 分离数字ID和字符串ID（旧cuid格式）
    const numericIds = ids.filter(id => /^\d+$/.test(String(id)));
    const stringIds = ids.filter(id => !/^\d+$/.test(String(id)));

    const whereConditions = [];
    const replacements = [];

    if (numericIds.length > 0) {
      whereConditions.push(`w.id IN (${numericIds.join(',')})`);
    }

    if (stringIds.length > 0) {
      const placeholders = stringIds.map(() => '?').join(',');
      whereConditions.push(`w.old_id IN (${placeholders})`);
      replacements.push(...stringIds);
    }

    if (whereConditions.length === 0) return [];

    const websites = await app.model.query(
      `SELECT w.id, w.old_id as oldId, w.name, w.slug, w.description, w.url, w.icon_url as iconUrl,
              w.category_id as categoryId, c.name as categoryName,
              w.is_new as isNew, w.is_featured as isFeatured, w.is_hot as isHot,
              w.tags, w.click_count as clickCount
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE w.is_delete = 0 AND (${whereConditions.join(' OR ')})`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    return websites.map(w => ({
      ...w,
      isNew: w.isNew === 1,
      isFeatured: w.isFeatured === 1,
      isHot: w.isHot === 1,
      ...this.parseWebsiteTagBundle(w.tags),
    }));
  }
}

module.exports = WebsiteService;
