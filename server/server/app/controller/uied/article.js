/**
 * @file controller/uied/article.js
 * @description UIED 文章管理控制器
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Controller = require('egg').Controller;

class ArticleController extends Controller {
  /**
   * 获取文章列表
   * GET /api/uied/article/list
   */
  async list() {
    const { ctx } = this;
    const params = ctx.query;

    try {
      const result = await ctx.service.uied.article.list(params);
      ctx.body = {
        code: 200,
        msg: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('获取文章列表失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '获取失败',
      };
    }
  }

  /**
   * 获取文章详情
   * GET /api/uied/article/detail
   */
  async detail() {
    const { ctx } = this;
    const { id } = ctx.query;

    if (!id) {
      ctx.body = { code: 400, msg: '缺少文章ID' };
      return;
    }

    try {
      const article = await ctx.service.uied.article.detail(id);
      if (!article) {
        ctx.body = { code: 404, msg: '文章不存在' };
        return;
      }
      ctx.body = {
        code: 200,
        msg: '获取成功',
        data: article,
      };
    } catch (error) {
      ctx.logger.error('获取文章详情失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '获取失败',
      };
    }
  }

  /**
   * 创建文章
   * POST /api/uied/article/add
   */
  async add() {
    const { ctx } = this;
    const data = ctx.request.body;

    if (!data.title) {
      ctx.body = { code: 400, msg: '标题不能为空' };
      return;
    }

    try {
      const id = await ctx.service.uied.article.add(data);
      ctx.body = {
        code: 200,
        msg: '创建成功',
        data: { id },
      };
    } catch (error) {
      ctx.logger.error('创建文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '创建失败',
      };
    }
  }

  /**
   * 更新文章
   * POST /api/uied/article/edit
   */
  async edit() {
    const { ctx } = this;
    const data = ctx.request.body;

    if (!data.id) {
      ctx.body = { code: 400, msg: '缺少文章ID' };
      return;
    }

    try {
      await ctx.service.uied.article.edit(data.id, data);
      ctx.body = {
        code: 200,
        msg: '更新成功',
      };
    } catch (error) {
      ctx.logger.error('更新文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '更新失败',
      };
    }
  }

  /**
   * 删除文章
   * POST /api/uied/article/del
   */
  async del() {
    const { ctx } = this;
    const { ids } = ctx.request.body;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      ctx.body = { code: 400, msg: '缺少文章ID' };
      return;
    }

    try {
      await ctx.service.uied.article.del(ids);
      ctx.body = {
        code: 200,
        msg: '已移入回收站',
      };
    } catch (error) {
      ctx.logger.error('删除文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '删除失败',
      };
    }
  }

  /**
   * 恢复文章（回收站 -> 正常）
   * POST /api/uied/article/restore
   */
  async restore() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    const ids = body.ids || body.id;
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      ctx.body = { code: 400, msg: '缺少文章ID' };
      return;
    }

    try {
      await ctx.service.uied.article.restore(ids);
      ctx.body = {
        code: 200,
        msg: '恢复成功',
      };
    } catch (error) {
      ctx.logger.error('恢复文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '恢复失败',
      };
    }
  }

  /**
   * 彻底删除文章（仅回收站）
   * POST /api/uied/article/realDelete
   */
  async realDelete() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    const ids = body.ids || body.id;
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      ctx.body = { code: 400, msg: '缺少文章ID' };
      return;
    }

    try {
      await ctx.service.uied.article.realDelete(ids);
      ctx.body = {
        code: 200,
        msg: '彻底删除成功',
      };
    } catch (error) {
      ctx.logger.error('彻底删除文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '彻底删除失败',
      };
    }
  }

  /**
   * 批量更新文章状态（发布/取消发布）
   * POST /api/uied/article/batchStatus
   */
  async batchStatus() {
    const { ctx } = this;
    const { ids, status } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.body = { code: 400, msg: '缺少文章ID列表' };
      return;
    }

    if (!status || ![ 'published', 'draft' ].includes(status)) {
      ctx.body = { code: 400, msg: '状态值无效，仅支持 published 或 draft' };
      return;
    }

    try {
      const count = await ctx.service.uied.article.batchUpdateStatus(ids, status);
      ctx.body = {
        code: 200,
        msg: '操作成功',
        data: { count },
      };
    } catch (error) {
      ctx.logger.error('批量更新文章状态失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '操作失败',
      };
    }
  }

  /**
   * 批量移动文章分类与标签
   * POST /api/uied/article/batchMove
   */
  async batchMove() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      ctx.body = { code: 400, msg: '请选择要操作的文章' };
      return;
    }

    try {
      const result = await ctx.service.uied.article.batchMove(ids, body);
      ctx.body = {
        code: 200,
        msg: '批量移动成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('批量移动文章失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '批量移动失败',
      };
    }
  }

  /**
   * 一键清空文章回收站（支持筛选条件）
   * POST /api/uied/article/recycle/clear
   */
  async clearRecycle() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    try {
      const result = await ctx.service.uied.article.clearRecycle(body);
      ctx.body = {
        code: 200,
        msg: `已清空 ${Number(result?.deleted || 0)} 篇文章`,
        data: result,
      };
    } catch (error) {
      ctx.logger.error('清空文章回收站失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '清空回收站失败',
      };
    }
  }

  /**
   * 获取文章分类列表
   * GET /api/uied/article/categories
   */
  async categories() {
    const { ctx } = this;

    try {
      // 兼容前端按 mode/detail/onlyPublished 获取不同粒度分类数据
      const categories = await ctx.service.uied.article.categories(ctx.query || {});
      ctx.body = {
        code: 200,
        msg: '获取成功',
        data: categories,
      };
    } catch (error) {
      ctx.logger.error('获取文章分类失败:', error);
      ctx.body = {
        code: 500,
        msg: error.message || '获取失败',
      };
    }
  }
}

module.exports = ArticleController;
