/**
 * @file service/uied/banner.js
 * @description UIED 广告管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class BannerService extends Service {
  /**
   * 多位置广告组标识前缀
   */
  getMultiPositionPrefix() {
    return 'multi:banner:';
  }

  /**
   * 规范化广告位置参数，兼容前后端不同命名
   */
  normalizePosition(position) {
    const normalized = String(position || '').trim().toLowerCase();
    /**
     * 兼容历史错误拼写：detall -> detail
     */
    const normalizedWithTypoFixed = normalized
      .replace(/^detall(?=$|[_-])/, 'detail')
      .replace(/^website-detall/, 'website-detail')
      .replace(/^website_detall/, 'website_detail');
    const map = {
      top: 'home',
      bottom: 'footer',
      popup: 'detail',
      website_detail_sidebar: 'detail_sidebar',
      'website-detail-sidebar': 'detail_sidebar',
      website_detail: 'detail',
      detail_sidebar: 'detail_sidebar',
      'detail-sidebar': 'detail_sidebar',
      detail_top: 'detail_top',
      detail_inline: 'detail_inline',
      detail_bottom: 'detail_bottom',
      detall: 'detail',
      detall_sidebar: 'detail_sidebar',
      'detall-sidebar': 'detail_sidebar',
      detall_top: 'detail_top',
      detall_inline: 'detail_inline',
      detall_bottom: 'detail_bottom',
    };
    const value = map[normalizedWithTypoFixed] || normalizedWithTypoFixed || '';
    if (value.length > 20 && /sidebar/i.test(value)) {
      return 'detail_sidebar';
    }
    return value.slice(0, 20);
  }

  /**
   * 规范化页面标识，用于广告按页面投放过滤
   * @param {unknown} pageSlug 页面标识
   * @return {string} 规范化结果
   */
  normalizePageSlug(pageSlug) {
    const normalized = String(pageSlug || '').trim().toLowerCase();
    if (!normalized) return '';
    if ([ '/', 'index', 'uiux' ].includes(normalized)) return 'home';
    return normalized;
  }

  /**
   * 规范化页面标识列表，兼容数组/逗号串输入
   * @param {unknown} value 页面标识输入
   * @return {string[]} 去重后的页面标识列表
   */
  normalizePageSlugList(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map(item => String(item || '').trim())
        .filter(Boolean);
    const list = source
      .map(item => this.normalizePageSlug(item))
      .filter(Boolean);
    if (list.length === 0) return [ 'all' ];
    // all 为全局通配值，若存在则仅保留 all
    if (list.includes('all')) return [ 'all' ];
    return Array.from(new Set(list));
  }

  /**
   * 获取页面标识别名，兼容 website-detail / website_detail 等历史写法
   * @param {unknown} pageSlug 页面标识
   * @return {string[]} 别名列表
   */
  getPageSlugAliases(pageSlug) {
    const normalized = this.normalizePageSlug(pageSlug);
    if (!normalized) return [];
    const set = new Set([ normalized ]);
    if (normalized.includes('-')) set.add(normalized.replace(/-/g, '_'));
    if (normalized.includes('_')) set.add(normalized.replace(/_/g, '-'));
    /**
     * 首页兼容：前台可能走 /（uiux 动态首页）或 /home（历史首页）
     */
    if ([ 'home', 'uiux', 'index', '/' ].includes(normalized)) {
      set.add('home');
      set.add('uiux');
      set.add('index');
    }
    /**
     * 搜索页广告默认复用首页投放，避免运营仅配置 home 时搜索页为空。
     */
    if (normalized === 'search') {
      set.add('home');
      set.add('uiux');
    }
    if (normalized === 'website-detail' || normalized === 'website_detail') {
      set.add('website-detail');
      set.add('website_detail');
      set.add('detail');
    }
    return Array.from(set).filter(Boolean);
  }

  /**
   * 规范化“多位置”输入，支持数组/逗号串两种格式
   * @param {unknown} value 输入位置值
   * @return {string[]} 去重后的规范化位置列表
   */
  normalizePositionList(value) {
    const rawList = Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map(item => String(item || '').trim())
        .filter(Boolean);
    const normalized = rawList
      .map(item => this.normalizePosition(item))
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  /**
   * 判断 old_id 是否为多位置广告分组标识
   * @param {unknown} oldId old_id 字段
   * @return {boolean} 是否多位置广告组
   */
  isMultiPositionGroup(oldId) {
    const value = String(oldId || '').trim();
    return value.startsWith(this.getMultiPositionPrefix());
  }

  /**
   * 生成多位置广告组标识
   * @return {string} 分组标识
   */
  buildMultiPositionGroupId() {
    return `${this.getMultiPositionPrefix()}${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * 归一化广告写库 payload（位置与 old_id 由外层控制）
   * @param {Object} data 提交数据
   * @return {Object} 入库字段
   */
  buildBannerPayload(data = {}) {
    const rawSort = data.sort ?? data.sortOrder ?? 0;
    const parsedSort = Number.parseInt(String(rawSort || 0), 10);
    const visibleRaw = data.isShow !== undefined ? data.isShow : data.isActive;
    const isShow = visibleRaw === undefined ? 1 : (Number(visibleRaw) === 1 || visibleRaw === true ? 1 : 0);
    const normalizedPageSlugList = this.normalizePageSlugList(
      Array.isArray(data.pageSlugList) && data.pageSlugList.length > 0
        ? data.pageSlugList
        : data.pageSlug
    );
    const normalizedPageSlug = normalizedPageSlugList.includes('all')
      ? 'all'
      : normalizedPageSlugList.join(',');
    return {
      title: String(data.title || '').trim(),
      description: data.description || '',
      imageUrl: data.imageUrl || data.image || '',
      linkUrl: data.linkUrl || data.url || '',
      linkTarget: data.linkTarget || '_blank',
      contentType: data.contentType || 'image',
      htmlContent: data.htmlContent || '',
      pageSlug: normalizedPageSlug || 'all',
      sort: Number.isNaN(parsedSort) ? 0 : parsedSort,
      isShow,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
    };
  }

  /**
   * 新增一条广告记录
   * @param {Object} payload 已归一化字段
   * @param {string|null} oldId 分组标识
   * @param {string} position 广告位置
   * @param {number} now 当前时间戳
   * @return {Promise<number>} 新增记录 ID
   */
  async insertBannerRecord(payload, oldId, position, now) {
    const { app } = this;
    const [ result ] = await app.model.query(
      `INSERT INTO uied_banner (old_id, title, description, image_url, link_url, link_target, content_type,
       html_content, page_slug, position, sort, is_show, start_time, end_time, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          oldId,
          payload.title,
          payload.description,
          payload.imageUrl,
          payload.linkUrl,
          payload.linkTarget,
          payload.contentType,
          payload.htmlContent,
          payload.pageSlug,
          position,
          payload.sort,
          payload.isShow,
          payload.startTime,
          payload.endTime,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );
    return Number(result || 0);
  }

  /**
   * 更新一条广告记录
   * @param {number} id 广告 ID
   * @param {Object} payload 已归一化字段
   * @param {string|null} oldId 分组标识
   * @param {string} position 广告位置
   * @param {number} now 当前时间戳
   */
  async updateBannerRecord(id, payload, oldId, position, now) {
    const { app } = this;
    await app.model.query(
      `UPDATE uied_banner SET old_id = ?, title = ?, description = ?, image_url = ?, link_url = ?, link_target = ?,
       content_type = ?, html_content = ?, page_slug = ?, position = ?, sort = ?, is_show = ?,
       start_time = ?, end_time = ?, update_time = ? WHERE id = ?`,
      {
        replacements: [
          oldId,
          payload.title,
          payload.description,
          payload.imageUrl,
          payload.linkUrl,
          payload.linkTarget,
          payload.contentType,
          payload.htmlContent,
          payload.pageSlug,
          position,
          payload.sort,
          payload.isShow,
          payload.startTime,
          payload.endTime,
          now,
          id,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 聚合多位置广告记录，后台列表按“单条广告”展示
   * @param {Array<Object>} items 格式化后的广告列表
   * @return {Array<Object>} 聚合后列表
   */
  mergeListByPositionGroup(items = []) {
    const groupMap = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      const key = this.isMultiPositionGroup(item.oldId) ? `group:${item.oldId}` : `single:${item.id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          ...item,
          positionList: this.normalizePositionList(item.positionList?.length ? item.positionList : item.position),
        });
        return;
      }
      const current = groupMap.get(key);
      const mergedPositionList = Array.from(new Set([
        ...this.normalizePositionList(current.positionList),
        ...this.normalizePositionList(item.positionList?.length ? item.positionList : item.position),
      ]));
      current.positionList = mergedPositionList;
      current.position = mergedPositionList.join(', ');
      current.sort = Math.min(Number(current.sort || 0), Number(item.sort || 0));
      current.sortOrder = current.sort;
      current.updateTime = Math.max(Number(current.updateTime || 0), Number(item.updateTime || 0));
    });
    return Array.from(groupMap.values());
  }

  /**
   * 获取广告位置别名集合（兼容后台配置值与前端请求值不一致）
   * @param {string} position 前端传入的位置标识
   * @return {string[]} 可匹配的位置列表
   */
  getPositionAliases(position) {
    const normalized = String(position || '').trim();
    if (!normalized) return [];

    const aliasGroups = {
      top: [ 'top', 'home' ],
      home: [ 'home', 'top' ],
      global_strip: [ 'global_strip' ],
      bottom: [ 'bottom', 'footer' ],
      footer: [ 'footer', 'bottom' ],
      sidebar: [ 'sidebar', 'website_detail_sidebar', 'detail_sidebar', 'detall_sidebar' ],
      website_detail_sidebar: [ 'website_detail_sidebar', 'sidebar', 'detail_sidebar', 'detall_sidebar' ],
      detail_sidebar: [ 'detail_sidebar', 'website_detail_sidebar', 'sidebar', 'detall_sidebar' ],
      detall_sidebar: [ 'detall_sidebar', 'detail_sidebar', 'website_detail_sidebar', 'sidebar' ],
      popup: [ 'popup', 'detail', 'detall' ],
      detail: [ 'detail', 'popup', 'detall' ],
      detall: [ 'detall', 'detail', 'popup' ],
      detail_top: [ 'detail_top', 'detall_top', 'detail' ],
      detall_top: [ 'detall_top', 'detail_top', 'detail' ],
      detail_inline: [ 'detail_inline', 'detall_inline', 'detail' ],
      detall_inline: [ 'detall_inline', 'detail_inline', 'detail' ],
      detail_bottom: [ 'detail_bottom', 'detall_bottom', 'detail' ],
      detall_bottom: [ 'detall_bottom', 'detail_bottom', 'detail' ],
    };

    const aliases = aliasGroups[normalized] || [ normalized ];
    return Array.from(new Set(aliases.filter(Boolean)));
  }

  async list(params = {}) {
    const { app } = this;
    const page = parseInt(params.pageNo) || 1;
    const pageSize = parseInt(params.pageSize) || 15;
    const offset = (page - 1) * pageSize;

    const rows = await app.model.query(
      'SELECT * FROM uied_banner WHERE is_delete = 0 ORDER BY sort ASC, id ASC',
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    const mergedLists = this
      .mergeListByPositionGroup(rows.map(item => this.formatItem(item)))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.id || 0) - Number(b.id || 0));
    const total = mergedLists.length;
    const lists = mergedLists.slice(offset, offset + pageSize);

    return {
      lists,
      count: total,
      pageNo: page,
      pageSize,
    };
  }

  async detail(id) {
    const { app } = this;
    const [ item ] = await app.model.query(
      'SELECT * FROM uied_banner WHERE id = ? AND is_delete = 0',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );
    return item ? this.formatItem(item) : null;
  }

  async add(data) {
    const now = Math.floor(Date.now() / 1000);
    const payload = this.buildBannerPayload(data);
    const positionList = this.normalizePositionList(data.positionList?.length ? data.positionList : data.position);
    const positions = positionList.length > 0
      ? positionList
      : [ this.normalizePosition(data.position || 'top') || 'home' ];
    const multiGroupId = positions.length > 1 ? this.buildMultiPositionGroupId() : null;
    const ids = [];

    for (const position of positions) {
      const id = await this.insertBannerRecord(payload, multiGroupId, position, now);
      if (id > 0) ids.push(id);
    }

    return { id: ids[0] || 0, ids };
  }

  async edit(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const payload = this.buildBannerPayload(data);
    const [ currentRow ] = await app.model.query(
      'SELECT * FROM uied_banner WHERE id = ? AND is_delete = 0',
      {
        replacements: [ data.id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!currentRow) return;

    const currentOldId = String(currentRow.old_id || '').trim();
    const isCurrentMultiGroup = this.isMultiPositionGroup(currentOldId);
    const nextPositionList = this.normalizePositionList(
      data.positionList?.length ? data.positionList : data.position
    );
    const positions = nextPositionList.length > 0
      ? nextPositionList
      : [ this.normalizePosition(currentRow.position || 'top') || 'home' ];
    const useMultiGroup = positions.length > 1;
    const groupId = useMultiGroup
      ? (isCurrentMultiGroup ? currentOldId : this.buildMultiPositionGroupId())
      : (isCurrentMultiGroup ? null : (currentOldId || null));

    const siblingRows = isCurrentMultiGroup
      ? await app.model.query(
        'SELECT id FROM uied_banner WHERE old_id = ? AND is_delete = 0 AND id <> ? ORDER BY id ASC',
        {
          replacements: [ currentOldId, data.id ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      )
      : [];
    const reusableIds = [
      Number(data.id || 0),
      ...(Array.isArray(siblingRows) ? siblingRows.map(item => Number(item.id || 0)) : []).filter(Boolean),
    ];

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const recordId = reusableIds[i];
      if (recordId) {
        await this.updateBannerRecord(recordId, payload, groupId, position, now);
      } else {
        await this.insertBannerRecord(payload, groupId, position, now);
      }
    }

    const removeIds = reusableIds.slice(positions.length).filter(Boolean);
    if (removeIds.length > 0) {
      await app.model.query(
        `UPDATE uied_banner SET is_delete = 1, delete_time = ?, update_time = ? WHERE id IN (${removeIds.map(() => '?').join(',')})`,
        {
          replacements: [ now, now, ...removeIds ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
    }
  }

  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const [ currentRow ] = await app.model.query(
      'SELECT old_id FROM uied_banner WHERE id = ? AND is_delete = 0',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const oldId = String(currentRow?.old_id || '').trim();
    if (this.isMultiPositionGroup(oldId)) {
      await app.model.query(
        'UPDATE uied_banner SET is_delete = 1, delete_time = ?, update_time = ? WHERE old_id = ? AND is_delete = 0',
        {
          replacements: [ now, now, oldId ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      return;
    }
    await app.model.query(
      'UPDATE uied_banner SET is_delete = 1, delete_time = ?, update_time = ? WHERE id = ?',
      {
        replacements: [ now, now, id ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 获取前端可用的激活广告
   */
  async active(params = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const limit = parseInt(params.limit) || 20;
    const position = this.normalizePosition(params.position);
    const pageSlug = this.normalizePageSlug(params.pageSlug);

    let whereSql = 'is_delete = 0 AND is_show = 1';
    const replacements = [];

    // 生效时间控制：为空或0表示不限制
    whereSql += ' AND (start_time IS NULL OR start_time = 0 OR start_time <= ?)';
    whereSql += ' AND (end_time IS NULL OR end_time = 0 OR end_time >= ?)';
    replacements.push(now, now);

    if (position) {
      const positionAliases = this.getPositionAliases(position);
      if (positionAliases.length > 0) {
        whereSql += ` AND (position IN (${positionAliases.map(() => '?').join(',')})`;
        replacements.push(...positionAliases);
        positionAliases.forEach(() => {
          whereSql += ' OR FIND_IN_SET(?, REPLACE(position, \' \', \'\')) > 0';
        });
        replacements.push(...positionAliases);
        whereSql += ')';
      }
    }

    // page_slug 为空表示全局；支持 all 作为通配值
    if (pageSlug) {
      const pageSlugAliases = this.getPageSlugAliases(pageSlug);
      if (pageSlugAliases.length > 0) {
        whereSql += ` AND (page_slug IS NULL OR page_slug = '' OR page_slug = 'all' OR FIND_IN_SET('all', REPLACE(page_slug, ' ', '')) > 0 OR page_slug IN (${pageSlugAliases.map(() => '?').join(',')})`;
        replacements.push(...pageSlugAliases);
        pageSlugAliases.forEach(() => {
          whereSql += ' OR FIND_IN_SET(?, REPLACE(page_slug, \' \', \'\')) > 0';
        });
        replacements.push(...pageSlugAliases);
        whereSql += ')';
      }
    }

    const lists = await app.model.query(
      `SELECT * FROM uied_banner WHERE ${whereSql} ORDER BY sort ASC, id ASC LIMIT ?`,
      { replacements: [ ...replacements, limit ], type: app.Sequelize.QueryTypes.SELECT }
    );

    return lists.map(item => this.formatItem(item));
  }

  /**
   * 记录广告点击
   */
  async recordClick(id) {
    const { app } = this;
    await app.model.query(
      'UPDATE uied_banner SET click_count = click_count + 1 WHERE id = ? AND is_delete = 0',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }

  formatItem(item) {
    const positionList = this.normalizePositionList(item.position);
    const pageSlugList = this.normalizePageSlugList(item.page_slug);
    return {
      id: item.id,
      oldId: item.old_id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      image: item.image_url, // 兼容
      linkUrl: item.link_url,
      url: item.link_url, // 兼容
      linkTarget: item.link_target,
      contentType: item.content_type,
      htmlContent: item.html_content,
      pageSlug: item.page_slug,
      pageSlugList,
      position: item.position,
      positionList,
      sort: item.sort,
      sortOrder: item.sort, // 兼容
      isShow: item.is_show === 1,
      isActive: item.is_show === 1, // 兼容
      startTime: item.start_time,
      endTime: item.end_time,
      clickCount: item.click_count,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }
}

module.exports = BannerService;
