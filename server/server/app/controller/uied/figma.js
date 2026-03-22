/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file controller/uied/figma.js
 * @description Figma插件 内容中心控制器
 */

'use strict';

const baseController = require('../baseController');

class UiedFigmaController extends baseController {
  /**
   * 获取 Figma插件 条目列表。
   */
  async list() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.list(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 列表失败' });
    }
  }

  /**
   * 获取 Figma插件 条目详情。
   */
  async detail() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.query?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少 Figma插件 ID' });
    }

    try {
      const detail = await ctx.service.uied.figma.detail(id);
      if (!detail) {
        return this.result({ code: 404, message: 'Figma插件 不存在' });
      }
      this.result({ data: detail });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 详情失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 详情失败' });
    }
  }

  /**
   * 新增 Figma插件 条目。
   */
  async add() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.figma.add(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 Figma插件 失败:', error);
      this.result({ code: 500, message: error.message || '新增 Figma插件 失败' });
    }
  }

  /**
   * 编辑 Figma插件 条目。
   */
  async edit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少 Figma插件 ID' });
    }

    try {
      await ctx.service.uied.figma.edit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 Figma插件 失败:', error);
      this.result({ code: 500, message: error.message || '编辑 Figma插件 失败' });
    }
  }

  /**
   * 删除 Figma插件 条目。
   */
  async del() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少 Figma插件 ID' });
    }

    try {
      await ctx.service.uied.figma.del(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 Figma插件 失败:', error);
      this.result({ code: 500, message: error.message || '删除 Figma插件 失败' });
    }
  }

  /**
   * 获取 Figma插件 分类列表。
   */
  async categoryList() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.categoryList(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 分类列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 分类列表失败' });
    }
  }

  /**
   * 获取 Figma插件 分类全量。
   */
  async categoryAll() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.categoryAll();
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 分类全量失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 分类全量失败' });
    }
  }

  /**
   * 初始化 Figma插件 官方分类。
   */
  async categoryInitOfficial() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.categoryInitOfficial();
      this.result({ data: result, message: '官方分类初始化完成' });
    } catch (error) {
      ctx.logger.error('初始化 Figma插件 官方分类失败:', error);
      this.result({ code: 500, message: error.message || '初始化官方分类失败' });
    }
  }

  /**
   * 新增 Figma插件 分类。
   */
  async categoryAdd() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '分类名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.figma.categoryAdd(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 Figma插件 分类失败:', error);
      this.result({ code: 500, message: error.message || '新增 Figma插件 分类失败' });
    }
  }

  /**
   * 编辑 Figma插件 分类。
   */
  async categoryEdit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少分类 ID' });
    }

    try {
      await ctx.service.uied.figma.categoryEdit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 Figma插件 分类失败:', error);
      this.result({ code: 500, message: error.message || '编辑 Figma插件 分类失败' });
    }
  }

  /**
   * 删除 Figma插件 分类。
   */
  async categoryDel() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少分类 ID' });
    }

    try {
      await ctx.service.uied.figma.categoryDel(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 Figma插件 分类失败:', error);
      this.result({ code: 500, message: error.message || '删除 Figma插件 分类失败' });
    }
  }

  /**
   * 获取 Figma插件 标签列表。
   */
  async tagList() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.tagList(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 标签列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 标签列表失败' });
    }
  }

  /**
   * 获取 Figma插件 标签全量。
   */
  async tagAll() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.tagAll();
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma插件 标签全量失败:', error);
      this.result({ code: 500, message: error.message || '获取 Figma插件 标签全量失败' });
    }
  }

  /**
   * 新增 Figma插件 标签。
   */
  async tagAdd() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '标签名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.figma.tagAdd(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 Figma插件 标签失败:', error);
      this.result({ code: 500, message: error.message || '新增 Figma插件 标签失败' });
    }
  }

  /**
   * 编辑 Figma插件 标签。
   */
  async tagEdit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少标签 ID' });
    }

    try {
      await ctx.service.uied.figma.tagEdit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 Figma插件 标签失败:', error);
      this.result({ code: 500, message: error.message || '编辑 Figma插件 标签失败' });
    }
  }

  /**
   * 删除 Figma插件 标签。
   */
  async tagDel() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少标签 ID' });
    }

    try {
      await ctx.service.uied.figma.tagDel(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 Figma插件 标签失败:', error);
      this.result({ code: 500, message: error.message || '删除 Figma插件 标签失败' });
    }
  }

  /**
   * 获取插件推荐审核列表（后台）。
   */
  async recommendList() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.figma.recommendList(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 Figma 插件推荐审核列表失败:', error);
      this.result({ code: 500, message: error.message || '获取推荐审核列表失败' });
    }
  }

  /**
   * 获取插件推荐记录详情（后台）。
   */
  async recommendDetail() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.query?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少推荐记录 ID' });
    }
    try {
      const detail = await ctx.service.uied.figma.recommendDetail(id);
      if (!detail) {
        return this.result({ code: 404, message: '推荐记录不存在' });
      }
      this.result({ data: detail });
    } catch (error) {
      ctx.logger.error('获取 Figma 插件推荐记录详情失败:', error);
      this.result({ code: 500, message: error.message || '获取推荐记录详情失败' });
    }
  }

  /**
   * 审核通过插件推荐（后台）。
   */
  async recommendApprove() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少推荐记录 ID' });
    }
    try {
      const auth = ctx.authInfo || {};
      const result = await ctx.service.uied.figma.recommendApprove({
        ...body,
        reviewerId: auth.adminId || auth.id || 0,
        reviewerName: auth.nickname || auth.username || '',
      });
      this.result({ data: result, message: '审核通过并已处理入库' });
    } catch (error) {
      ctx.logger.error('审核通过 Figma 插件推荐失败:', error);
      this.result({ code: 500, message: error.message || '审核通过失败' });
    }
  }

  /**
   * 审核拒绝插件推荐（后台）。
   */
  async recommendReject() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少推荐记录 ID' });
    }
    try {
      const auth = ctx.authInfo || {};
      await ctx.service.uied.figma.recommendReject({
        ...body,
        reviewerId: auth.adminId || auth.id || 0,
        reviewerName: auth.nickname || auth.username || '',
      });
      this.result({ message: '已拒绝该推荐' });
    } catch (error) {
      ctx.logger.error('拒绝 Figma 插件推荐失败:', error);
      this.result({ code: 500, message: error.message || '拒绝失败' });
    }
  }

  /**
   * 删除插件推荐记录（后台）。
   */
  async recommendDel() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少推荐记录 ID' });
    }
    try {
      await ctx.service.uied.figma.recommendDel(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 Figma 插件推荐失败:', error);
      this.result({ code: 500, message: error.message || '删除失败' });
    }
  }

  /**
   * 从 Figma 官方社区链接采集插件数据。
   */
  async importOfficial() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const result = await ctx.service.uied.figma.importOfficial(payload);
      this.result({ data: result, message: '采集完成' });
    } catch (error) {
      ctx.logger.error('采集 Figma 官方插件失败:', error);
      this.result({ code: 500, message: error.message || '采集失败' });
    }
  }

  /**
   * 批量为无标签 Figma 插件自动补全标签。
   */
  async autoTagMissing() {
    const { ctx } = this;
    try {
      const payload = { ...(ctx.query || {}), ...(ctx.request.body || {}) };
      const result = await ctx.service.uied.figma.autoTagMissing(payload);
      this.result({ data: result, message: '批量补标签完成' });
    } catch (error) {
      ctx.logger.error('批量补 Figma 标签失败:', error);
      this.result({ code: 500, message: error.message || '批量补标签失败' });
    }
  }

  /**
   * 批量补全 Figma 插件用户量/关注量。
   */
  async refreshMissingStats() {
    const { ctx } = this;
    try {
      const payload = { ...(ctx.query || {}), ...(ctx.request.body || {}) };
      const result = await ctx.service.uied.figma.refreshMissingStats(payload);
      this.result({ data: result, message: '补全统计完成' });
    } catch (error) {
      ctx.logger.error('补全 Figma 统计失败:', error);
      this.result({ code: 500, message: error.message || '补全统计失败' });
    }
  }
}

module.exports = UiedFigmaController;
