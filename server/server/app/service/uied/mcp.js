/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file service/uied/mcp.js
 * @description MCP 内容中心服务
 */

'use strict';

const Service = require('egg').Service;

class UiedMcpService extends Service {
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
      item: 'uied_mcp_item',
      category: 'uied_mcp_category',
      tag: 'uied_mcp_tag',
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
   * 规范化 MCP 条目入参。
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
      transportType: String(data.transportType || data.transport_type || '').trim() || 'http',
      runtime: String(data.runtime || '').trim() || 'other',
      protocolVersion: String(data.protocolVersion || data.protocol_version || '').trim(),
      categoryId: this.parsePositiveInt(data.categoryId ?? data.category_id, 0) || null,
      status,
      isRecommended: Number(data.isRecommended ?? data.is_recommended ?? 0) === 1 ? 1 : 0,
      sortOrder: Number.isFinite(Number(data.sortOrder ?? data.sort_order))
        ? Number(data.sortOrder ?? data.sort_order)
        : 0,
      publishTime: this.parsePositiveInt(data.publishTime ?? data.publish_time, 0) || null,
      seoTitle: String(data.seoTitle || data.seo_title || '').trim(),
      seoKeywords: String(data.seoKeywords || data.seo_keywords || '').trim(),
      seoDescription: String(data.seoDescription || data.seo_description || '').trim(),
      tagIds,
    };
  }

  /**
   * 批量保存条目标签关联。
   * @param {number} itemId MCP 条目 ID
   * @param {number[]} tagIds 标签 ID 列表
   * @return {Promise<void>}
   */
  async saveItemTags(itemId, tagIds = []) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedItemId = this.parsePositiveInt(itemId, 0);
    if (!normalizedItemId) return;

    await app.model.query(
      'UPDATE uied_mcp_item_tag SET is_delete = 1, update_time = ? WHERE item_id = ? AND is_delete = 0',
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
        'SELECT id FROM uied_mcp_item_tag WHERE item_id = ? AND tag_id = ? LIMIT 1',
        {
          replacements: [ normalizedItemId, normalizedTagId ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      if (existing) {
        await app.model.query(
          'UPDATE uied_mcp_item_tag SET is_delete = 0, update_time = ? WHERE id = ?',
          {
            replacements: [ now, existing.id ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
      } else {
        await app.model.query(
          `INSERT INTO uied_mcp_item_tag
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
   * 获取后台 MCP 条目分页列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async list(params = {}) {
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
        SELECT 1 FROM uied_mcp_item_tag rel
        WHERE rel.item_id = i.id AND rel.tag_id = ? AND rel.is_delete = 0
      )`;
      replacements.push(tagId);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_mcp_item i WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl,
              i.official_url AS officialUrl, i.transport_type AS transportType,
              i.runtime, i.protocol_version AS protocolVersion,
              i.status, i.is_recommended AS isRecommended,
              i.sort_order AS sortOrder, i.publish_time AS publishTime,
              i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.create_time AS createTime, i.update_time AS updateTime,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug,
              (
                SELECT GROUP_CONCAT(t.name ORDER BY t.sort_order ASC, t.id ASC SEPARATOR ',')
                FROM uied_mcp_item_tag rel
                INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
                WHERE rel.item_id = i.id AND rel.is_delete = 0
              ) AS tagNames
       FROM uied_mcp_item i
       LEFT JOIN uied_mcp_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE ${whereSql}
       ORDER BY i.sort_order ASC, i.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const lists = (Array.isArray(rows) ? rows : []).map(item => ({
      ...item,
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
   * 获取 MCP 条目详情（后台）。
   * @param {number|string} id 条目 ID
   * @return {Promise<any|null>}
   */
  async detail(id) {
    const { app } = this;
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return null;

    const [ row ] = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.content,
              i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.status, i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.category_id AS categoryId,
              c.name AS categoryName, c.slug AS categorySlug,
              i.create_time AS createTime, i.update_time AS updateTime
       FROM uied_mcp_item i
       LEFT JOIN uied_mcp_category c ON c.id = i.category_id AND c.is_delete = 0
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
       FROM uied_mcp_item_tag rel
       INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
       WHERE rel.item_id = ? AND rel.is_delete = 0
       ORDER BY t.sort_order ASC, t.id ASC`,
      {
        replacements: [ itemId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      ...row,
      tagIds: (Array.isArray(tags) ? tags : []).map(item => Number(item.id || 0)).filter(Boolean),
      tags: Array.isArray(tags) ? tags : [],
    };
  }

  /**
   * 新增 MCP 条目。
   * @param {Record<string, any>} data 条目数据
   * @return {Promise<number>}
   */
  async add(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const payload = this.normalizeItemPayload(data);
    const slug = await this.resolveUniqueSlug(payload.slug, payload.name, 0, 'item');

    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_mcp_item WHERE slug = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ slug ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (existing) {
      throw new Error('MCP 标识已存在');
    }

    const publishTime = payload.status === 'published'
      ? (payload.publishTime || now)
      : null;

    const [ result ] = await app.model.query(
      `INSERT INTO uied_mcp_item
       (name, slug, summary, content, icon_url, cover_url, official_url, docs_url, github_url,
        transport_type, runtime, protocol_version,
        category_id, status, is_recommended, sort_order, publish_time,
        click_count, view_count,
        seo_title, seo_keywords, seo_description,
        is_delete, create_time, update_time)
       VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 0, ?, ?)`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          payload.iconUrl || null,
          payload.coverUrl || null,
          payload.officialUrl || null,
          payload.docsUrl || null,
          payload.githubUrl || null,
          payload.transportType,
          payload.runtime,
          payload.protocolVersion || null,
          payload.categoryId,
          payload.status,
          payload.isRecommended,
          payload.sortOrder,
          publishTime,
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
   * 编辑 MCP 条目。
   * @param {Record<string, any>} data 条目数据
   * @return {Promise<boolean>}
   */
  async edit(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少 MCP ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug, status, publish_time FROM uied_mcp_item WHERE id = ? AND is_delete = 0 LIMIT 1',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!existing) {
      throw new Error('MCP 不存在');
    }

    const payload = this.normalizeItemPayload(data);
    const slug = await this.resolveUniqueSlug(payload.slug || existing.slug, payload.name, id, 'item');

    const publishTime = payload.status === 'published'
      ? (payload.publishTime || Number(existing.publish_time || 0) || now)
      : null;

    await app.model.query(
      `UPDATE uied_mcp_item
       SET name = ?, slug = ?, summary = ?, content = ?,
           icon_url = ?, cover_url = ?, official_url = ?, docs_url = ?, github_url = ?,
           transport_type = ?, runtime = ?, protocol_version = ?,
           category_id = ?, status = ?, is_recommended = ?, sort_order = ?, publish_time = ?,
           seo_title = ?, seo_keywords = ?, seo_description = ?,
           update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          payload.name,
          slug,
          payload.summary,
          payload.content,
          payload.iconUrl || null,
          payload.coverUrl || null,
          payload.officialUrl || null,
          payload.docsUrl || null,
          payload.githubUrl || null,
          payload.transportType,
          payload.runtime,
          payload.protocolVersion || null,
          payload.categoryId,
          payload.status,
          payload.isRecommended,
          payload.sortOrder,
          publishTime,
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
   * 删除 MCP 条目（软删除）。
   * @param {number|string} id 条目 ID
   * @return {Promise<boolean>}
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return true;

    await app.model.query(
      'UPDATE uied_mcp_item SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_mcp_item_tag SET is_delete = 1, update_time = ? WHERE item_id = ? AND is_delete = 0',
      {
        replacements: [ now, itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 获取 MCP 分类列表（后台）。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async categoryList(params = {}) {
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
      `SELECT COUNT(*) AS total FROM uied_mcp_category c WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order AS sortOrder,
              c.seo_title AS seoTitle, c.seo_keywords AS seoKeywords, c.seo_description AS seoDescription,
              c.create_time AS createTime, c.update_time AS updateTime,
              (
                SELECT COUNT(*) FROM uied_mcp_item i
                WHERE i.category_id = c.id AND i.is_delete = 0
              ) AS itemCount
       FROM uied_mcp_category c
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
   * 获取 MCP 分类全量（用于下拉）。
   * @return {Promise<any[]>}
   */
  async categoryAll() {
    const { app } = this;
    const rows = await app.model.query(
      `SELECT id, name, slug, description, sort_order AS sortOrder
       FROM uied_mcp_category
       WHERE is_delete = 0
       ORDER BY sort_order ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 新增 MCP 分类。
   * @param {Record<string, any>} data 分类数据
   * @return {Promise<number>}
   */
  async categoryAdd(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const name = String(data.name || '').trim();
    if (!name) throw new Error('分类名称不能为空');
    const slug = await this.resolveUniqueSlug(String(data.slug || '').trim(), name, 0, 'category');

    const [ result ] = await app.model.query(
      `INSERT INTO uied_mcp_category
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
   * 编辑 MCP 分类。
   * @param {Record<string, any>} data 分类数据
   * @return {Promise<boolean>}
   */
  async categoryEdit(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少分类 ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug FROM uied_mcp_category WHERE id = ? AND is_delete = 0 LIMIT 1',
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
      `UPDATE uied_mcp_category
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
   * 删除 MCP 分类（软删除）。
   * @param {number|string} id 分类 ID
   * @return {Promise<boolean>}
   */
  async categoryDel(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const categoryId = this.parsePositiveInt(id, 0);
    if (!categoryId) return true;

    await app.model.query(
      'UPDATE uied_mcp_category SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, categoryId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_mcp_item SET category_id = NULL, update_time = ? WHERE category_id = ? AND is_delete = 0',
      {
        replacements: [ now, categoryId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 获取 MCP 标签分页列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],count:number,page:number,pageSize:number}>}
   */
  async tagList(params = {}) {
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
      `SELECT COUNT(*) AS total FROM uied_mcp_tag t WHERE ${whereSql}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const rows = await app.model.query(
      `SELECT t.id, t.name, t.slug, t.description, t.sort_order AS sortOrder,
              t.create_time AS createTime, t.update_time AS updateTime,
              (
                SELECT COUNT(*) FROM uied_mcp_item_tag rel
                WHERE rel.tag_id = t.id AND rel.is_delete = 0
              ) AS itemCount
       FROM uied_mcp_tag t
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
   * 获取 MCP 标签全量列表（用于下拉）。
   * @return {Promise<any[]>}
   */
  async tagAll() {
    const { app } = this;
    const rows = await app.model.query(
      `SELECT id, name, slug, description, sort_order AS sortOrder
       FROM uied_mcp_tag
       WHERE is_delete = 0
       ORDER BY sort_order ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [];
  }

  /**
   * 新增 MCP 标签。
   * @param {Record<string, any>} data 标签数据
   * @return {Promise<number>}
   */
  async tagAdd(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const name = String(data.name || '').trim();
    if (!name) throw new Error('标签名称不能为空');

    const slug = await this.resolveUniqueSlug(String(data.slug || '').trim(), name, 0, 'tag');
    const [ result ] = await app.model.query(
      `INSERT INTO uied_mcp_tag
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
   * 编辑 MCP 标签。
   * @param {Record<string, any>} data 标签数据
   * @return {Promise<boolean>}
   */
  async tagEdit(data = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const id = this.parsePositiveInt(data.id, 0);
    if (!id) throw new Error('缺少标签 ID');

    const [ existing ] = await app.model.query(
      'SELECT id, slug FROM uied_mcp_tag WHERE id = ? AND is_delete = 0 LIMIT 1',
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
      `UPDATE uied_mcp_tag
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
   * 删除 MCP 标签（软删除）。
   * @param {number|string} id 标签 ID
   * @return {Promise<boolean>}
   */
  async tagDel(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const tagId = this.parsePositiveInt(id, 0);
    if (!tagId) return true;

    await app.model.query(
      'UPDATE uied_mcp_tag SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0',
      {
        replacements: [ now, tagId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    await app.model.query(
      'UPDATE uied_mcp_item_tag SET is_delete = 1, update_time = ? WHERE tag_id = ? AND is_delete = 0',
      {
        replacements: [ now, tagId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return true;
  }

  /**
   * 获取 MCP 前台公开列表。
   * @param {Record<string, any>} params 查询参数
   * @return {Promise<{lists:any[],total:number,page:number,pageSize:number,totalPages:number}>}
   */
  async publicList(params = {}) {
    const { app } = this;
    const page = this.parsePositiveInt(params.page, 1);
    const pageSize = this.parsePositiveInt(params.pageSize ?? params.limit, 12);
    const offset = (page - 1) * pageSize;

    const keyword = String(params.keyword || params.q || '').trim();
    const categorySlug = String(params.categorySlug || params.category || '').trim();
    const tagSlug = String(params.tagSlug || params.tag || '').trim();

    let whereSql = 'i.is_delete = 0 AND i.status = \'published\'';
    const replacements = [];

    if (keyword) {
      whereSql += ' AND (i.name LIKE ? OR i.summary LIKE ? OR i.slug LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (categorySlug) {
      whereSql += ' AND EXISTS (SELECT 1 FROM uied_mcp_category c WHERE c.id = i.category_id AND c.slug = ? AND c.is_delete = 0)';
      replacements.push(categorySlug);
    }

    if (tagSlug) {
      whereSql += ` AND EXISTS (
        SELECT 1
        FROM uied_mcp_item_tag rel
        INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
        WHERE rel.item_id = i.id
          AND rel.is_delete = 0
          AND t.slug = ?
      )`;
      replacements.push(tagSlug);
    }

    const [ countRow ] = await app.model.query(
      `SELECT COUNT(*) AS total FROM uied_mcp_item i WHERE ${whereSql}`,
      {
        replacements,
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const rows = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl, i.cover_url AS coverUrl,
              i.official_url AS officialUrl, i.docs_url AS docsUrl, i.github_url AS githubUrl,
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug,
              (
                SELECT GROUP_CONCAT(t.name ORDER BY t.sort_order ASC, t.id ASC SEPARATOR ',')
                FROM uied_mcp_item_tag rel
                INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
                WHERE rel.item_id = i.id AND rel.is_delete = 0
              ) AS tagNames
       FROM uied_mcp_item i
       LEFT JOIN uied_mcp_category c ON c.id = i.category_id AND c.is_delete = 0
       WHERE ${whereSql}
       ORDER BY i.is_recommended DESC, i.sort_order ASC, COALESCE(i.publish_time, i.update_time) DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, pageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const total = Number(countRow?.total || 0);
    const lists = (Array.isArray(rows) ? rows : []).map(item => ({
      ...item,
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
   * 获取 MCP 前台公开详情（按 slug 或 id）。
   * @param {string|number} idOrSlug 条目标识
   * @return {Promise<any|null>}
   */
  async publicDetail(idOrSlug) {
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
              i.transport_type AS transportType, i.runtime, i.protocol_version AS protocolVersion,
              i.is_recommended AS isRecommended, i.sort_order AS sortOrder,
              i.publish_time AS publishTime, i.view_count AS viewCount, i.click_count AS clickCount,
              i.seo_title AS seoTitle, i.seo_keywords AS seoKeywords, i.seo_description AS seoDescription,
              i.update_time AS updateTime, i.create_time AS createTime,
              c.id AS categoryId, c.name AS categoryName, c.slug AS categorySlug
       FROM uied_mcp_item i
       LEFT JOIN uied_mcp_category c ON c.id = i.category_id AND c.is_delete = 0
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
       FROM uied_mcp_item_tag rel
       INNER JOIN uied_mcp_tag t ON t.id = rel.tag_id AND t.is_delete = 0
       WHERE rel.item_id = ? AND rel.is_delete = 0
       ORDER BY t.sort_order ASC, t.id ASC`,
      {
        replacements: [ row.id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const related = await app.model.query(
      `SELECT i.id, i.name, i.slug, i.summary, i.icon_url AS iconUrl,
              i.transport_type AS transportType, i.runtime, i.publish_time AS publishTime
       FROM uied_mcp_item i
       WHERE i.is_delete = 0
         AND i.status = 'published'
         AND i.id != ?
         AND (
           i.category_id = ?
           OR EXISTS (
             SELECT 1
             FROM uied_mcp_item_tag rel_a
             INNER JOIN uied_mcp_item_tag rel_b
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

    return {
      ...row,
      tags: Array.isArray(tags) ? tags : [],
      related: Array.isArray(related) ? related : [],
    };
  }

  /**
   * 记录前台 MCP 详情浏览量。
   * @param {number|string} id 条目 ID
   * @return {Promise<void>}
   */
  async increaseViewCount(id) {
    const { app } = this;
    const itemId = this.parsePositiveInt(id, 0);
    if (!itemId) return;
    await app.model.query(
      'UPDATE uied_mcp_item SET view_count = view_count + 1 WHERE id = ? AND is_delete = 0',
      {
        replacements: [ itemId ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 获取前台 MCP 分类元数据（仅返回有已发布内容的分类）。
   * @return {Promise<any[]>}
   */
  async publicCategories() {
    const { app } = this;
    const rows = await app.model.query(
      `SELECT c.id, c.name, c.slug,
              COUNT(i.id) AS itemCount
       FROM uied_mcp_category c
       INNER JOIN uied_mcp_item i
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
   * 获取前台 MCP 标签元数据（仅返回有已发布内容的标签）。
   * @return {Promise<any[]>}
   */
  async publicTags() {
    const { app } = this;
    const rows = await app.model.query(
      `SELECT t.id, t.name, t.slug,
              COUNT(DISTINCT rel.item_id) AS itemCount
       FROM uied_mcp_tag t
       INNER JOIN uied_mcp_item_tag rel
         ON rel.tag_id = t.id
        AND rel.is_delete = 0
       INNER JOIN uied_mcp_item i
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

module.exports = UiedMcpService;
