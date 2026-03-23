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
   * 置顶四卡广告组标识前缀（仅用于后台列表聚合展示，不改变前台投放逻辑）。
   */
  getPageBannerBatchPrefix() {
    return 'batch:page_banner:';
  }

  /**
   * 判断 old_id 是否为置顶四卡广告组。
   * @param {unknown} oldId old_id 字段
   * @return {boolean}
   */
  isPageBannerBatchGroup(oldId) {
    const value = String(oldId || '').trim();
    return value.startsWith(this.getPageBannerBatchPrefix());
  }

  /**
   * 判断 old_id 是否应参与后台列表聚合（多位置组 + 历史四卡组）。
   * @param {unknown} oldId old_id 字段
   * @return {boolean}
   */
  isListMergeGroup(oldId) {
    return this.isMultiPositionGroup(oldId) || this.isPageBannerBatchGroup(oldId);
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
   * 判断位置列表是否包含置顶四卡位。
   * @param {string[]} positions 位置列表
   * @return {boolean}
   */
  hasPageBannerPosition(positions = []) {
    const list = Array.isArray(positions) ? positions : [];
    return list.includes('page_banner');
  }

  /**
   * 生成多位置广告组标识
   * @return {string} 分组标识
   */
  buildMultiPositionGroupId() {
    return `${this.getMultiPositionPrefix()}${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * 规范化客户端传入的广告组 old_id，仅允许识别的组前缀。
   * @param {unknown} value 组标识
   * @return {string|null}
   */
  normalizeGroupOldId(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    if (this.isMultiPositionGroup(normalized)) return normalized;
    if (this.isPageBannerBatchGroup(normalized)) return normalized;
    return null;
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
    const source = Array.isArray(items) ? items : [];
    const groupMap = new Map();
    source.forEach(item => {
      const oldId = String(item.oldId || '').trim();
      const normalizedPositionList = this.normalizePositionList(
        item.positionList?.length ? item.positionList : item.position
      );
      let groupKey = `single:${item.id}`;
      if (this.isListMergeGroup(oldId)) {
        groupKey = `group:${oldId}`;
      }

      if (!groupMap.has(groupKey)) {
        const initialItem = {
          ...item,
          id: Number(item.id || 0),
          groupItemIds: [ Number(item.id || 0) ].filter(Boolean),
          positionList: normalizedPositionList,
        };
        groupMap.set(groupKey, initialItem);
        return;
      }

      const current = groupMap.get(groupKey);
      current.groupItemIds = Array.from(new Set([
        ...(Array.isArray(current.groupItemIds) ? current.groupItemIds : []),
        Number(item.id || 0),
      ].filter(Boolean)));
      current.positionList = Array.from(new Set([
        ...this.normalizePositionList(current.positionList),
        ...this.normalizePositionList(item.positionList?.length ? item.positionList : item.position),
      ]));
      current.position = current.positionList.join(',');
      current.sort = Math.min(Number(current.sort || 0), Number(item.sort || 0));
      current.sortOrder = current.sort;
      current.clickCount = Math.max(Number(current.clickCount || 0), Number(item.clickCount || 0));
      current.updateTime = Math.max(Number(current.updateTime || 0), Number(item.updateTime || 0));
    });
    return Array.from(groupMap.values());
  }

  /**
   * 规范化后台“场景筛选”参数。
   * @param {unknown} scene 场景标识
   * @return {string} 规范化后的场景
   */
  normalizeScene(scene) {
    const value = String(scene || '').trim().toLowerCase();
    if (!value) return 'all';
    const map = {
      page: 'page_banner',
      pagebanner: 'page_banner',
      page_banner: 'page_banner',
      home: 'home',
      top: 'home',
      sidebar: 'sidebar',
      detail: 'detail',
      footer: 'footer',
      bottom: 'footer',
      global: 'global_strip',
      global_strip: 'global_strip',
      all: 'all',
      other: 'other',
    };
    return map[value] || value;
  }

  /**
   * 将具体位置归类到业务场景，便于后台筛选与统计。
   * @param {string} position 单个位置标识
   * @return {string} 业务场景
   */
  resolveSceneFromPosition(position) {
    const normalized = this.normalizePosition(position);
    if (!normalized) return 'other';
    if (normalized === 'page_banner') return 'page_banner';
    if ([ 'home', 'top' ].includes(normalized)) return 'home';
    if ([ 'global_strip' ].includes(normalized)) return 'global_strip';
    if ([ 'sidebar', 'detail_sidebar', 'website_detail_sidebar', 'detall_sidebar' ].includes(normalized)) return 'sidebar';
    if ([ 'footer', 'bottom' ].includes(normalized)) return 'footer';
    if (
      [ 'detail', 'popup', 'detall', 'detail_top', 'detail_inline', 'detail_bottom', 'detall_top', 'detall_inline', 'detall_bottom' ]
        .includes(normalized)
    ) {
      return 'detail';
    }
    return 'other';
  }

  /**
   * 计算广告记录包含的场景集合。
   * @param {Object} item 广告项
   * @return {Set<string>} 场景集合
   */
  getBannerSceneSet(item) {
    const positionList = this.normalizePositionList(item.positionList?.length ? item.positionList : item.position);
    if (positionList.length === 0) return new Set([ 'other' ]);
    return new Set(positionList.map(position => this.resolveSceneFromPosition(position)));
  }

  /**
   * 规范化后台“分类筛选”参数。
   * @param {unknown} sceneGroup 分类标识
   * @return {string} 规范化后的分类
   */
  normalizeSceneGroup(sceneGroup) {
    const value = String(sceneGroup || '').trim().toLowerCase();
    if (!value) return 'all';
    const map = {
      all: 'all',
      top: 'top_banner',
      top_banner: 'top_banner',
      topbanner: 'top_banner',
      traffic: 'traffic',
      content: 'content',
      support: 'support',
      other: 'other',
      normal: 'normal',
    };
    return map[value] || 'all';
  }

  /**
   * 判断广告是否匹配后台“分类筛选”。
   * @param {Object} item 广告项
   * @param {string} sceneGroup 分类标识
   * @return {boolean} 是否匹配
   */
  isBannerMatchedSceneGroup(item, sceneGroup) {
    const normalizedGroup = this.normalizeSceneGroup(sceneGroup);
    if (normalizedGroup === 'all') return true;
    const sceneSet = this.getBannerSceneSet(item);
    if (normalizedGroup === 'top_banner') return sceneSet.has('page_banner');
    if (normalizedGroup === 'traffic') return sceneSet.has('home') || sceneSet.has('global_strip');
    if (normalizedGroup === 'content') return sceneSet.has('detail');
    if (normalizedGroup === 'support') return sceneSet.has('sidebar') || sceneSet.has('footer');
    if (normalizedGroup === 'other') return sceneSet.has('other');
    if (normalizedGroup === 'normal') return !sceneSet.has('page_banner');
    return true;
  }

  /**
   * 判断广告是否匹配场景筛选。
   * @param {Object} item 广告项
   * @param {string} scene 场景标识
   * @return {boolean} 是否匹配
   */
  isBannerMatchedScene(item, scene) {
    const normalizedScene = this.normalizeScene(scene);
    if (normalizedScene === 'all') return true;
    const sceneSet = this.getBannerSceneSet(item);
    return sceneSet.has(normalizedScene);
  }

  /**
   * 判断广告是否匹配关键字（标题/描述/链接/页面标识/位置）。
   * @param {Object} item 广告项
   * @param {string} keyword 关键字
   * @return {boolean} 是否匹配
   */
  isBannerMatchedKeyword(item, keyword) {
    const q = String(keyword || '').trim().toLowerCase();
    if (!q) return true;
    const hitFields = [
      item.title,
      item.description,
      item.linkUrl || item.url,
      item.pageSlug,
      item.position,
    ];
    return hitFields.some(field => String(field || '').toLowerCase().includes(q));
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

  /**
   * 判断广告是否为“全站通配”页面范围（all/空）。
   * @param {Object} item 广告项
   * @return {boolean}
   */
  isGlobalPageScopeBanner(item) {
    const pageSlugList = this.normalizePageSlugList(item.pageSlugList?.length ? item.pageSlugList : item.pageSlug);
    if (!Array.isArray(pageSlugList) || pageSlugList.length === 0) return true;
    return pageSlugList.includes('all');
  }

  /**
   * 判断广告是否命中当前页面（非 all 的专属页范围）。
   * @param {Object} item 广告项
   * @param {string[]} pageSlugAliases 当前页面别名集合
   * @return {boolean}
   */
  isSpecificPageScopeBannerMatched(item, pageSlugAliases = []) {
    const aliases = Array.isArray(pageSlugAliases) ? pageSlugAliases.filter(Boolean) : [];
    if (aliases.length === 0) return false;
    const pageSlugList = this.normalizePageSlugList(item.pageSlugList?.length ? item.pageSlugList : item.pageSlug);
    if (!Array.isArray(pageSlugList) || pageSlugList.length === 0 || pageSlugList.includes('all')) return false;
    const targetSet = new Set(aliases);
    return pageSlugList.some(slug => targetSet.has(slug));
  }

  /**
   * 页面广告优先级：页面专属 > 全站通配。
   * 若存在页面专属配置，仅返回页面专属，避免与 all 配置混出 8 张卡片。
   * @param {Array<Object>} items 广告列表
   * @param {string} pageSlug 当前页面标识
   * @return {Array<Object>}
   */
  filterByPageScopePriority(items = [], pageSlug = '') {
    const normalizedPageSlug = this.normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) return Array.isArray(items) ? items : [];
    const pageSlugAliases = this.getPageSlugAliases(normalizedPageSlug);
    if (!Array.isArray(pageSlugAliases) || pageSlugAliases.length === 0) return Array.isArray(items) ? items : [];
    const source = Array.isArray(items) ? items : [];
    const specificMatched = source.filter(item => this.isSpecificPageScopeBannerMatched(item, pageSlugAliases));
    if (specificMatched.length > 0) return specificMatched;
    return source.filter(item => this.isGlobalPageScopeBanner(item));
  }

  async list(params = {}) {
    const { app } = this;
    const page = parseInt(params.pageNo) || 1;
    const pageSize = parseInt(params.pageSize) || 15;
    const offset = (page - 1) * pageSize;
    const rawMode = String(params.raw || '').trim() === '1' || params.raw === true;

    const rows = await app.model.query(
      'SELECT * FROM uied_banner WHERE is_delete = 0 ORDER BY sort ASC, id ASC',
      { type: app.Sequelize.QueryTypes.SELECT }
    );
    const formattedRows = rows.map(item => this.formatItem(item));
    const mergedLists = (rawMode ? formattedRows : this.mergeListByPositionGroup(formattedRows))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.id || 0) - Number(b.id || 0));
    const keyword = String(params.keyword || '').trim();
    const scene = this.normalizeScene(params.scene);
    const sceneGroup = this.normalizeSceneGroup(params.sceneGroup);
    const contentType = String(params.contentType || '').trim().toLowerCase();
    const status = String(params.status || '').trim().toLowerCase();
    const filteredLists = mergedLists.filter(item => {
      if (!this.isBannerMatchedKeyword(item, keyword)) return false;
      if (sceneGroup !== 'all' && !this.isBannerMatchedSceneGroup(item, sceneGroup)) return false;
      if (scene !== 'all' && !this.isBannerMatchedScene(item, scene)) return false;
      if ([ 'image', 'html', 'text' ].includes(contentType) && String(item.contentType || 'image').toLowerCase() !== contentType) {
        return false;
      }
      if (status === 'active' && !item.isActive) return false;
      if (status === 'hidden' && item.isActive) return false;
      return true;
    });
    const total = filteredLists.length;
    const lists = filteredLists.slice(offset, offset + pageSize);

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
    const customGroupOldId = this.normalizeGroupOldId(data.oldId || data.groupOldId);
    const positionList = this.normalizePositionList(data.positionList?.length ? data.positionList : data.position);
    const positions = positionList.length > 0
      ? positionList
      : [ this.normalizePosition(data.position || 'top') || 'home' ];
    const position = positions.join(',');
    const id = await this.insertBannerRecord(payload, customGroupOldId, position, now);
    return { id: Number(id || 0), ids: id ? [ Number(id) ] : [] };
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
    if (!currentRow) {
      throw new Error('广告不存在或已删除');
    }
    const nextPositionList = this.normalizePositionList(data.positionList?.length ? data.positionList : data.position);
    const position = nextPositionList.length > 0
      ? nextPositionList.join(',')
      : (this.normalizePosition(currentRow.position || 'top') || 'home');
    const currentOldId = String(currentRow.old_id || '').trim();
    if (this.isPageBannerBatchGroup(currentOldId)) {
      await this.updateBannerRecord(Number(data.id || 0), payload, null, position, now);
      await app.model.query(
        `UPDATE uied_banner
         SET is_delete = 1, delete_time = ?, update_time = ?
         WHERE old_id = ? AND id <> ? AND is_delete = 0`,
        {
          replacements: [ now, now, currentOldId, Number(data.id || 0) ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
      return;
    }
    if (this.isMultiPositionGroup(currentOldId)) {
      const siblingRows = await app.model.query(
        'SELECT id FROM uied_banner WHERE old_id = ? AND is_delete = 0 ORDER BY id ASC',
        {
          replacements: [ currentOldId ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      const siblingIds = (Array.isArray(siblingRows) ? siblingRows : [])
        .map(item => Number(item.id || 0))
        .filter(Boolean);
      await this.updateBannerRecord(Number(data.id || 0), payload, null, position, now);
      const removeIds = siblingIds.filter(id => id !== Number(data.id || 0));
      if (removeIds.length > 0) {
        await app.model.query(
          `UPDATE uied_banner
           SET is_delete = 1, delete_time = ?, update_time = ?
           WHERE old_id = ? AND id <> ? AND is_delete = 0`,
          {
            replacements: [ now, now, currentOldId, Number(data.id || 0) ],
            type: app.Sequelize.QueryTypes.UPDATE,
          }
        );
      }
      return;
    }
    await this.updateBannerRecord(Number(data.id || 0), payload, null, position, now);
  }

  async del(id) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const [ currentRow ] = await app.model.query(
      'SELECT id, old_id, position, page_slug, content_type FROM uied_banner WHERE id = ? AND is_delete = 0',
      {
        replacements: [ id ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const currentOldId = String(currentRow && currentRow.old_id ? currentRow.old_id : '').trim();
    if (this.isMultiPositionGroup(currentOldId) || this.isPageBannerBatchGroup(currentOldId)) {
      await app.model.query(
        'UPDATE uied_banner SET is_delete = 1, delete_time = ?, update_time = ? WHERE old_id = ? AND is_delete = 0',
        {
          replacements: [ now, now, currentOldId ],
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

    /**
     * 当按页面过滤时，先拉取更大窗口，再在服务层做“页面专属优先”筛选，避免 SQL limit 提前截断导致漏配。
     */
    const queryLimit = pageSlug ? Math.max(limit * 10, 200) : limit;
    const lists = await app.model.query(
      `SELECT * FROM uied_banner WHERE ${whereSql} ORDER BY sort ASC, id ASC LIMIT ?`,
      { replacements: [ ...replacements, queryLimit ], type: app.Sequelize.QueryTypes.SELECT }
    );

    const formatted = lists.map(item => this.formatItem(item));
    const scoped = pageSlug ? this.filterByPageScopePriority(formatted, pageSlug) : formatted;
    return scoped.slice(0, limit);
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
