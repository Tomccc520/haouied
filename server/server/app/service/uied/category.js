/**
 * @file service/uied/category.js
 * @description UIED 分类管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class CategoryService extends Service {
  /**
   * 规范化父级分类 ID（顶级统一为 null）。
   * @param {number|string|null|undefined} parentId - 父级分类ID
   * @return {number|null}
   */
  normalizeParentId(parentId) {
    const parsed = Number(parentId);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.trunc(parsed);
  }

  /**
   * 读取指定分类的父级 ID。
   * @param {number} categoryId - 分类ID
   * @return {number|null}
   */
  async getParentId(categoryId) {
    const { app } = this;
    const [ row ] = await app.model.query(
      'SELECT id, parent_id as parentId FROM uied_category WHERE id = ? AND is_delete = 0',
      { replacements: [ categoryId ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!row) return null;
    return this.normalizeParentId(row.parentId);
  }

  /**
   * 校验父级分类关系合法性（存在性、自引用、循环引用）。
   * @param {number|null} parentId - 目标父级分类 ID
   * @param {number|null} selfId - 当前分类 ID（新增时传 null）
   */
  async validateParentRelation(parentId, selfId = null) {
    const { app } = this;
    const normalizedParentId = this.normalizeParentId(parentId);
    const normalizedSelfId = Number.isFinite(Number(selfId)) && Number(selfId) > 0
      ? Math.trunc(Number(selfId))
      : null;
    if (!normalizedParentId) return;

    if (normalizedSelfId && normalizedParentId === normalizedSelfId) {
      throw new Error('父级分类不能选择当前分类');
    }

    const [ parentCategory ] = await app.model.query(
      'SELECT id FROM uied_category WHERE id = ? AND is_delete = 0',
      { replacements: [ normalizedParentId ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!parentCategory) {
      throw new Error('父级分类不存在');
    }

    if (!normalizedSelfId) return;

    // 沿父级链向上校验，防止形成 A -> B -> A 的循环层级。
    let cursorParentId = normalizedParentId;
    let depth = 0;
    while (cursorParentId && depth <= 100) {
      const nextParentId = await this.getParentId(cursorParentId);
      if (!nextParentId) break;
      if (nextParentId === normalizedSelfId) {
        throw new Error('父级分类不能选择当前分类的子级');
      }
      cursorParentId = nextParentId;
      depth += 1;
    }

    if (depth > 100) {
      throw new Error('分类层级校验失败，请检查父级配置');
    }
  }

  /**
   * 获取分类列表（分页）
   * @param {Object} params - 查询参数
   */
  async list({ page = 1, pageSize = 50, keyword, parentId }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'c.is_delete = 0';
    const replacements = [];

    if (keyword) {
      whereClause += ' AND c.name LIKE ?';
      replacements.push(`%${keyword}%`);
    }

    if (parentId !== undefined && parentId !== '') {
      whereClause += ' AND c.parent_id = ?';
      replacements.push(parentId);
    }

    // 获取总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_category c WHERE ${whereClause}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );
    const total = countResult.total;

    // 获取列表
    const categories = await app.model.query(
      `SELECT c.id, c.name, c.slug, c.icon, c.color, c.description,
              c.seo_title as seoTitle, c.seo_description as seoDescription, c.seo_keywords as seoKeywords,
              c.parent_id as parentId, c.sort as sortOrder, c.is_show as isActive,
              c.color as themeColor, c.create_time as createdAt,
              (SELECT COUNT(*) FROM uied_website w WHERE w.category_id = c.id AND w.is_delete = 0) as websiteCount
       FROM uied_category c
       WHERE ${whereClause}
       ORDER BY c.sort ASC, c.id ASC
       LIMIT ? OFFSET ?`,
      { replacements: [ ...replacements, pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 转换布尔值
    const lists = categories.map(c => ({
      ...c,
      isActive: c.isActive === 1,
    }));

    return {
      lists,
      count: total,
      page,
      pageSize,
    };
  }

  /**
   * 获取分类树形结构
   * @param {string} pageSlug - 页面slug，用于筛选特定页面的分类
   */
  async tree(pageSlug) {
    const { app } = this;

    // 如果指定了页面，通过页面分类关联表筛选
    let categoryIds = null;
    if (pageSlug) {
      const page = await app.model.query(
        `SELECT c.id FROM uied_category c 
         INNER JOIN uied_page_category pc ON c.id = pc.category_id 
         INNER JOIN uied_page p ON pc.page_id = p.id 
         WHERE p.slug = ? AND pc.is_delete = 0 AND c.is_delete = 0
         ORDER BY pc.sort ASC`,
        { replacements: [ pageSlug ], type: app.Sequelize.QueryTypes.SELECT }
      );
      categoryIds = page.map(p => p.id);
    }

    // 获取所有分类
    const categories = await app.model.query(
      `SELECT id, name, slug, icon, color, description,
              seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords,
              parent_id as parentId, 
              sort as \`order\`, is_show as visible, create_time as createdAt
       FROM uied_category 
       WHERE is_delete = 0 
       ${categoryIds ? `AND id IN (${categoryIds.join(',')})` : ''}
       ORDER BY sort ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 构建树形结构
    return this.buildTree(categories);
  }

  /**
   * 获取所有分类（扁平列表）
   */
  async all() {
    const { app } = this;
    const categories = await app.model.query(
      `SELECT id, name, slug, icon, color, description,
              seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords,
              parent_id as parentId, 
              sort as \`order\`, is_show as visible
       FROM uied_category 
       WHERE is_delete = 0 
       ORDER BY sort ASC, id ASC`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return categories;
  }


  /**
   * 获取分类详情
   */
  async detail(id) {
    const { app } = this;
    const [ category ] = await app.model.query(
      `SELECT id, name, slug, icon, color, description,
              seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords,
              parent_id as parentId, 
              sort as \`order\`, is_show as visible, create_time as createdAt
       FROM uied_category 
       WHERE id = ? AND is_delete = 0`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    return category || null;
  }

  /**
   * 创建分类
   */
  async add(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedParentId = this.normalizeParentId(data.parentId);

    // 检查 slug 是否已存在
    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_category WHERE slug = ? AND is_delete = 0',
      { replacements: [ data.slug ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      throw new Error('分类别名已存在');
    }
    await this.validateParentRelation(normalizedParentId, null);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_category (name, slug, icon, color, description, seo_title, seo_description, seo_keywords, parent_id, sort, is_show, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          data.name,
          data.slug,
          data.icon || '',
          data.color || data.themeColor || '#1890ff',
          data.description || null,
          data.seoTitle || null,
          data.seoDescription || null,
          data.seoKeywords || null,
          normalizedParentId,
          data.sortOrder ?? data.order ?? 0,
          (data.isActive !== undefined ? data.isActive : (data.visible !== false ? 1 : 0)),
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result, ...data };
  }

  /**
   * 更新分类
   */
  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const normalizedSelfId = Math.trunc(Number(data.id || 0));
    const hasParentIdField = Object.prototype.hasOwnProperty.call(data, 'parentId');

    // 检查分类是否存在
    const [ existing ] = await app.model.query(
      'SELECT id, parent_id as parentId FROM uied_category WHERE id = ? AND is_delete = 0',
      { replacements: [ data.id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (!existing) {
      throw new Error('分类不存在');
    }

    // 检查 slug 是否被其他分类使用
    if (data.slug) {
      const [ slugExists ] = await app.model.query(
        'SELECT id FROM uied_category WHERE slug = ? AND id != ? AND is_delete = 0',
        { replacements: [ data.slug, data.id ], type: app.Sequelize.QueryTypes.SELECT }
      );
      if (slugExists) {
        throw new Error('分类别名已存在');
      }
    }

    // 兼容 admin 和 frontend 字段名
    const sortValue = data.sortOrder ?? data.order;
    const showValue = data.isActive !== undefined ? data.isActive : (data.visible !== undefined ? (data.visible ? 1 : 0) : null);
    const colorValue = data.themeColor || data.color;
    const normalizedParentId = hasParentIdField
      ? this.normalizeParentId(data.parentId)
      : this.normalizeParentId(existing.parentId);
    if (hasParentIdField) {
      await this.validateParentRelation(normalizedParentId, normalizedSelfId);
    }

    await app.model.query(
      `UPDATE uied_category SET 
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        description = ?,
        seo_title = ?,
        seo_description = ?,
        seo_keywords = ?,
        parent_id = ?,
        sort = COALESCE(?, sort),
        is_show = COALESCE(?, is_show),
        update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          data.name,
          data.slug,
          data.icon,
          colorValue,
          data.description,
          data.seoTitle !== undefined ? data.seoTitle : null,
          data.seoDescription !== undefined ? data.seoDescription : null,
          data.seoKeywords !== undefined ? data.seoKeywords : null,
          normalizedParentId,
          sortValue,
          showValue,
          now,
          data.id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );

    return data;
  }

  /**
   * 删除分类
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    // 检查是否有子分类
    const [ hasChildren ] = await app.model.query(
      'SELECT id FROM uied_category WHERE parent_id = ? AND is_delete = 0 LIMIT 1',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (hasChildren) {
      throw new Error('该分类下存在子分类，无法删除');
    }

    // 检查是否有网站
    const [ hasWebsites ] = await app.model.query(
      'SELECT id FROM uied_website WHERE category_id = ? AND is_delete = 0 LIMIT 1',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    if (hasWebsites) {
      throw new Error('该分类下存在网站，无法删除');
    }

    // 软删除
    await app.model.query(
      'UPDATE uied_category SET is_delete = 1, delete_time = ? WHERE id = ?',
      { replacements: [ now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  /**
   * 更新分类排序
   */
  async updateSort(categories) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    for (const cat of categories) {
      await app.model.query(
        'UPDATE uied_category SET sort = ?, update_time = ? WHERE id = ?',
        { replacements: [ cat.order, now, cat.id ], type: app.Sequelize.QueryTypes.UPDATE }
      );
    }
  }

  /**
   * 构建树形结构
   */
  buildTree(categories, parentId = null) {
    const normalizedParentId = this.normalizeParentId(parentId);
    return categories
      .filter(cat => this.normalizeParentId(cat.parentId) === normalizedParentId)
      .map(cat => ({
        ...cat,
        visible: cat.visible === 1,
        children: this.buildTree(categories, cat.id),
      }));
  }
}

module.exports = CategoryService;
