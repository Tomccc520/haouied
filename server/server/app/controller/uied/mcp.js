/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file controller/uied/mcp.js
 * @description MCP 内容中心控制器
 */

'use strict';

const baseController = require('../baseController');

class UiedMcpController extends baseController {
  /**
   * 获取 MCP 条目列表。
   */
  async list() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.mcp.list(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 MCP 列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 列表失败' });
    }
  }

  /**
   * 获取 MCP 条目详情。
   */
  async detail() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.query?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少 MCP ID' });
    }

    try {
      const detail = await ctx.service.uied.mcp.detail(id);
      if (!detail) {
        return this.result({ code: 404, message: 'MCP 不存在' });
      }
      this.result({ data: detail });
    } catch (error) {
      ctx.logger.error('获取 MCP 详情失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 详情失败' });
    }
  }

  /**
   * 新增 MCP 条目。
   */
  async add() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.mcp.add(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 MCP 失败:', error);
      this.result({ code: 500, message: error.message || '新增 MCP 失败' });
    }
  }

  /**
   * 编辑 MCP 条目。
   */
  async edit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少 MCP ID' });
    }

    try {
      await ctx.service.uied.mcp.edit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 MCP 失败:', error);
      this.result({ code: 500, message: error.message || '编辑 MCP 失败' });
    }
  }

  /**
   * 删除 MCP 条目。
   */
  async del() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少 MCP ID' });
    }

    try {
      await ctx.service.uied.mcp.del(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 MCP 失败:', error);
      this.result({ code: 500, message: error.message || '删除 MCP 失败' });
    }
  }

  /**
   * 获取 MCP 分类列表。
   */
  async categoryList() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.mcp.categoryList(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 MCP 分类列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 分类列表失败' });
    }
  }

  /**
   * 获取 MCP 分类全量。
   */
  async categoryAll() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.mcp.categoryAll();
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 MCP 分类全量失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 分类全量失败' });
    }
  }

  /**
   * 新增 MCP 分类。
   */
  async categoryAdd() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '分类名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.mcp.categoryAdd(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 MCP 分类失败:', error);
      this.result({ code: 500, message: error.message || '新增 MCP 分类失败' });
    }
  }

  /**
   * 编辑 MCP 分类。
   */
  async categoryEdit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少分类 ID' });
    }

    try {
      await ctx.service.uied.mcp.categoryEdit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 MCP 分类失败:', error);
      this.result({ code: 500, message: error.message || '编辑 MCP 分类失败' });
    }
  }

  /**
   * 删除 MCP 分类。
   */
  async categoryDel() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少分类 ID' });
    }

    try {
      await ctx.service.uied.mcp.categoryDel(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 MCP 分类失败:', error);
      this.result({ code: 500, message: error.message || '删除 MCP 分类失败' });
    }
  }

  /**
   * 获取 MCP 标签列表。
   */
  async tagList() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.mcp.tagList(ctx.query || {});
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 MCP 标签列表失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 标签列表失败' });
    }
  }

  /**
   * 获取 MCP 标签全量。
   */
  async tagAll() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.mcp.tagAll();
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取 MCP 标签全量失败:', error);
      this.result({ code: 500, message: error.message || '获取 MCP 标签全量失败' });
    }
  }

  /**
   * 新增 MCP 标签。
   */
  async tagAdd() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!String(body.name || '').trim()) {
      return this.result({ code: 400, message: '标签名称不能为空' });
    }

    try {
      const id = await ctx.service.uied.mcp.tagAdd(body);
      this.result({ data: { id }, message: '创建成功' });
    } catch (error) {
      ctx.logger.error('新增 MCP 标签失败:', error);
      this.result({ code: 500, message: error.message || '新增 MCP 标签失败' });
    }
  }

  /**
   * 编辑 MCP 标签。
   */
  async tagEdit() {
    const { ctx } = this;
    const body = ctx.request.body || {};
    if (!Number.parseInt(String(body.id || 0), 10)) {
      return this.result({ code: 400, message: '缺少标签 ID' });
    }

    try {
      await ctx.service.uied.mcp.tagEdit(body);
      this.result({ message: '更新成功' });
    } catch (error) {
      ctx.logger.error('编辑 MCP 标签失败:', error);
      this.result({ code: 500, message: error.message || '编辑 MCP 标签失败' });
    }
  }

  /**
   * 删除 MCP 标签。
   */
  async tagDel() {
    const { ctx } = this;
    const id = Number.parseInt(String(ctx.request.body?.id || 0), 10);
    if (!id) {
      return this.result({ code: 400, message: '缺少标签 ID' });
    }

    try {
      await ctx.service.uied.mcp.tagDel(id);
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除 MCP 标签失败:', error);
      this.result({ code: 500, message: error.message || '删除 MCP 标签失败' });
    }
  }
}

module.exports = UiedMcpController;
