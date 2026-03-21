/**
 * @file service/uied/navMenu.js
 * @description UIED 导航菜单服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class NavMenuService extends Service {
  /**
   * 规范化父级菜单 ID：将 0/空值 统一视为顶级（null）
   */
  normalizeParentId(parentId) {
    const value = Number(parentId);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }

  /**
   * 获取内置入口映射（键 -> 默认路径）
   * 说明：仅用于“内置入口”模式，不影响历史自定义链接。
   */
  getBuiltinEntryMap() {
    return {
      home: '/',
      daily_hot: '/p/hot?tab=daily-hot',
      daily_new: '/p/hot?tab=daily-new',
      hot_articles: '/p/hot',
      rankings: '/p/hot?tab=rankings',
      submit: '/submit',
      articles: '/articles',
      figma: '/figma',
      mcp_center: '/mcp',
    };
  }

  /**
   * 规范化内置入口键（仅允许受控内置入口）
   */
  normalizeBuiltinKey(value) {
    const key = String(value || '').trim().toLowerCase();
    if (!key) return '';
    const allowSet = new Set(Object.keys(this.getBuiltinEntryMap()));
    return allowSet.has(key) ? key : '';
  }

  /**
   * 从 old_id 中提取内置入口键
   */
  parseBuiltinKeyFromOldId(oldId) {
    const text = String(oldId || '').trim();
    if (!text.startsWith('builtin:')) return '';
    return this.normalizeBuiltinKey(text.slice('builtin:'.length));
  }

  /**
   * 生成 old_id 存储值（内置入口模式）
   */
  buildOldIdFromBuiltinKey(builtinKey) {
    const normalized = this.normalizeBuiltinKey(builtinKey);
    return normalized ? `builtin:${normalized}` : null;
  }

  /**
   * 获取内置入口默认链接（用于后台保存时兜底）
   */
  getBuiltinDefaultLink(builtinKey) {
    const normalized = this.normalizeBuiltinKey(builtinKey);
    const builtinEntryMap = this.getBuiltinEntryMap();
    return builtinEntryMap[normalized] || '';
  }

  /**
   * 构建菜单保存数据（统一处理内置入口/自定义链接）
   */
  buildPersistPayload(data = {}) {
    const linkMode = String(data.linkMode || '').trim().toLowerCase();
    const builtinKey = this.normalizeBuiltinKey(data.builtinKey);
    const useBuiltin = linkMode === 'builtin' && Boolean(builtinKey);
    const rawOldId = String(data.oldId || '').trim();
    const oldId = useBuiltin
      ? this.buildOldIdFromBuiltinKey(builtinKey)
      : (this.parseBuiltinKeyFromOldId(rawOldId) ? null : (rawOldId || null));
    const rawLink = String(data.link || data.url || '').trim();
    const link = useBuiltin ? (rawLink || this.getBuiltinDefaultLink(builtinKey)) : rawLink;
    /**
     * 兼容后台提交字段：管理端常用 isActive/openInNewTab，
     * 历史接口使用 isShow/external。
     */
    const visibleRaw = Object.prototype.hasOwnProperty.call(data, 'isShow')
      ? data.isShow
      : (Object.prototype.hasOwnProperty.call(data, 'isActive') ? data.isActive : undefined);
    const externalRaw = Object.prototype.hasOwnProperty.call(data, 'external')
      ? data.external
      : (Object.prototype.hasOwnProperty.call(data, 'openInNewTab') ? data.openInNewTab : undefined);

    return {
      text: data.name || data.text || '',
      link,
      icon: data.icon || '',
      parentId: this.normalizeParentId(data.parentId),
      sort: data.sort || data.sortOrder || 0,
      isShow: visibleRaw === undefined ? 1 : ((visibleRaw === true || Number(visibleRaw) === 1) ? 1 : 0),
      external: externalRaw === undefined ? 0 : ((externalRaw === true || Number(externalRaw) === 1) ? 1 : 0),
      label: data.label || null,
      labelType: data.labelType || null,
      builtinKey: useBuiltin ? builtinKey : '',
      oldId,
      hasBuiltinControl: Object.prototype.hasOwnProperty.call(data, 'builtinKey')
        || Object.prototype.hasOwnProperty.call(data, 'linkMode'),
    };
  }

  /**
   * 导航菜单列表（分页）
   */
  async list(params = {}) {
    const { app } = this;
    const page = parseInt(params.pageNo) || 1;
    const pageSize = parseInt(params.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [ countResult ] = await app.model.query(
      'SELECT COUNT(*) as total FROM uied_nav_menu WHERE is_delete = 0',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const lists = await app.model.query(
      'SELECT * FROM uied_nav_menu WHERE is_delete = 0 ORDER BY sort ASC, id ASC LIMIT ? OFFSET ?',
      { replacements: [ pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    return {
      lists: lists.map(item => this.formatItem(item)),
      count: countResult.total,
      pageNo: page,
      pageSize,
    };
  }

  /**
   * 全部导航菜单（树形）
   */
  async all() {
    const { app } = this;
    const items = await app.model.query(
      'SELECT * FROM uied_nav_menu WHERE is_delete = 0 ORDER BY sort ASC, id ASC',
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    return this.buildTree(items.map(item => this.formatItem(item)));
  }

  /**
   * 导航菜单详情
   */
  async detail(id) {
    const { app } = this;
    const [ item ] = await app.model.query(
      'SELECT * FROM uied_nav_menu WHERE id = ? AND is_delete = 0',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    return item ? this.formatItem(item) : null;
  }

  /**
   * 添加导航菜单
   */
  async add(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const payload = this.buildPersistPayload(data);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_nav_menu (old_id, text, link, icon, parent_id, sort, is_show, external, label, label_type, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          payload.oldId,
          payload.text,
          payload.link,
          payload.icon,
          payload.parentId,
          payload.sort,
          payload.isShow,
          payload.external,
          payload.label,
          payload.labelType,
          now, now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result };
  }

  /**
   * 编辑导航菜单
   */
  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const payload = this.buildPersistPayload(data);

    if (payload.hasBuiltinControl) {
      await app.model.query(
        `UPDATE uied_nav_menu SET old_id = ?, text = ?, link = ?, icon = ?, parent_id = ?,
         sort = ?, is_show = ?, external = ?, label = ?, label_type = ?, update_time = ? WHERE id = ?`,
        {
          replacements: [
            payload.oldId,
            payload.text,
            payload.link,
            payload.icon,
            payload.parentId,
            payload.sort,
            payload.isShow,
            payload.external,
            payload.label,
            payload.labelType,
            now, data.id,
          ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      return;
    }

    await app.model.query(
      `UPDATE uied_nav_menu SET text = ?, link = ?, icon = ?, parent_id = ?,
       sort = ?, is_show = ?, external = ?, label = ?, label_type = ?, update_time = ? WHERE id = ?`,
      {
        replacements: [
          payload.text,
          payload.link,
          payload.icon,
          payload.parentId,
          payload.sort,
          payload.isShow,
          payload.external,
          payload.label,
          payload.labelType,
          now, data.id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 删除导航菜单（软删除）
   */
  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    // 软删除，同时删除子菜单
    await app.model.query(
      'UPDATE uied_nav_menu SET is_delete = 1, delete_time = ? WHERE id = ? OR parent_id = ?',
      {
        replacements: [ now, id, id ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 排序
   */
  async sort(items) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    for (const item of items) {
      await app.model.query('UPDATE uied_nav_menu SET sort = ?, parent_id = ?, update_time = ? WHERE id = ?', {
        replacements: [
          item.sort || item.sortOrder,
          this.normalizeParentId(item.parentId),
          now,
          item.id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      });
    }
  }

  /**
   * 格式化数据 - 映射数据库字段到前端字段
   */
  formatItem(item) {
    const builtinKey = this.parseBuiltinKeyFromOldId(item.old_id);
    return {
      id: item.id,
      oldId: item.old_id,
      builtinKey,
      linkMode: builtinKey ? 'builtin' : 'custom',
      text: item.text,
      name: item.text, // 兼容前端
      link: item.link,
      url: item.link, // 兼容前端
      icon: item.icon,
      parentId: this.normalizeParentId(item.parent_id),
      sort: item.sort,
      sortOrder: item.sort, // 兼容前端
      isShow: item.is_show === 1,
      isActive: item.is_show === 1, // 兼容前端
      external: item.external === 1,
      openInNewTab: item.external === 1, // 兼容前端
      label: item.label,
      labelType: item.label_type,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }

  /**
   * 构建树形结构
   */
  buildTree(items, parentId = null) {
    const normalizedParentId = this.normalizeParentId(parentId);
    return items
      .filter(item => this.normalizeParentId(item.parentId) === normalizedParentId)
      .map(item => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }
}

module.exports = NavMenuService;
