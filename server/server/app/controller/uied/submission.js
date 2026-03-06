/**
 * @file controller/uied/submission.js
 * @description 网站提交控制器
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const baseController = require('../baseController');

class SubmissionController extends baseController {
  /**
   * 读取原始请求体（用于微信 XML 回调）
   */
  async readRawRequestBody() {
    const { ctx } = this;
    if (ctx.request.rawBody) {
      return String(ctx.request.rawBody || '');
    }
    if (ctx.req.rawBody) {
      return String(ctx.req.rawBody || '');
    }
    if (typeof ctx.request.body === 'string') {
      return ctx.request.body;
    }
    if (ctx.request.body && typeof ctx.request.body === 'object') {
      return '';
    }
    return await new Promise((resolve, reject) => {
      const chunks = [];
      ctx.req.on('data', chunk => chunks.push(Buffer.from(chunk)));
      ctx.req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      ctx.req.on('error', reject);
    });
  }

  /**
   * 检查 URL 是否已存在（前端用户）
   */
  async checkUrl() {
    const { ctx } = this;
    try {
      const { url } = ctx.query;
      if (!url) {
        return this.result({ code: 400, message: 'URL为必填项' });
      }
      const result = await ctx.service.uied.submission.checkUrl(url);
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('检查URL失败:', error);
      this.result({ code: 500, message: '检查失败' });
    }
  }

  /**
   * 提交网站（前端用户）
   */
  async submit() {
    const { ctx } = this;
    try {
      const data = ctx.request.body;
      if (!data.name || !data.url) {
        return this.result({ code: 400, message: '网站名称和URL为必填项' });
      }

      // 获取提交者 IP
      data.submitterIp = ctx.ip || ctx.request.ip;

      const result = await ctx.service.uied.submission.submit(data);
      this.result({ data: result, message: '提交成功，等待审核' });
    } catch (error) {
      ctx.logger.error('提交网站失败:', error);
      if (error.message.includes('已')) {
        return this.result({ code: 400, message: error.message });
      }
      this.result({ code: 500, message: '提交失败' });
    }
  }

  /**
   * 创建投稿支付订单（前端用户）
   */
  async createPayOrder() {
    const { ctx } = this;
    try {
      const data = ctx.request.body || {};
      if (!data.name || !data.url) {
        return this.result({ code: 400, message: '网站名称和URL为必填项' });
      }
      data.submitterIp = ctx.ip || ctx.request.ip;
      const result = await ctx.service.uied.submission.createPayOrder(data);
      this.result({ data: result, message: result?.message || '支付订单创建成功' });
    } catch (error) {
      ctx.logger.error('创建投稿支付订单失败:', error);
      this.result({ code: 400, message: error.message || '创建支付订单失败' });
    }
  }

  /**
   * 查询投稿支付订单状态（前端用户）
   */
  async payOrderStatus() {
    const { ctx } = this;
    try {
      const { orderNo } = ctx.query;
      if (!orderNo) {
        return this.result({ code: 400, message: '缺少订单号' });
      }
      const data = await ctx.service.uied.submission.getPayOrderStatus(orderNo, { reconcileIfPending: true });
      if (!data) {
        return this.result({ code: 404, message: '订单不存在' });
      }
      this.result({ data });
    } catch (error) {
      ctx.logger.error('查询投稿支付订单状态失败:', error);
      this.result({ code: 500, message: error.message || '查询失败' });
    }
  }

  /**
   * 手动触发投稿支付补单（后台运维入口）
   */
  async reconcilePayOrders() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const orderNo = String(payload.orderNo || ctx.query.orderNo || '').trim();
      const limit = Number(payload.limit || ctx.query.limit || 20);
      const data = await ctx.service.uied.submission.reconcilePendingOrders({
        orderNo,
        limit,
        source: 'admin_manual',
      });
      this.result({ data, message: '补单任务执行完成' });
    } catch (error) {
      ctx.logger.error('手动补单失败:', error);
      this.result({ code: 500, message: error.message || '补单失败' });
    }
  }

  /**
   * 支付宝支付异步回调
   */
  async payNotifyAlipay() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body && typeof ctx.request.body === 'object'
        ? ctx.request.body
        : {};
      await ctx.service.uied.submission.handleAlipayNotify(payload);
      ctx.type = 'text/plain; charset=utf-8';
      ctx.body = 'success';
    } catch (error) {
      ctx.logger.error('支付宝回调处理失败:', error);
      ctx.type = 'text/plain; charset=utf-8';
      ctx.body = 'failure';
    }
  }

  /**
   * 微信支付异步回调
   */
  async payNotifyWechat() {
    const { ctx } = this;
    try {
      let rawBody = await this.readRawRequestBody();
      if (!rawBody && ctx.request.body && typeof ctx.request.body === 'object') {
        rawBody = ctx.service.uied.submission.toWechatXml(ctx.request.body);
      }
      await ctx.service.uied.submission.handleWechatNotify(rawBody);
      ctx.type = 'text/xml; charset=utf-8';
      ctx.body = ctx.service.uied.submission.buildWechatNotifyResponse('SUCCESS', 'OK');
    } catch (error) {
      ctx.logger.error('微信回调处理失败:', error);
      ctx.type = 'text/xml; charset=utf-8';
      ctx.body = ctx.service.uied.submission.buildWechatNotifyResponse('FAIL', error.message || 'FAIL');
    }
  }

  /**
   * 查询提交状态（前端用户）
   */
  async status() {
    const { ctx } = this;
    try {
      const { id } = ctx.query;
      if (!id) {
        return this.result({ code: 400, message: '缺少提交ID' });
      }
      const result = await ctx.service.uied.submission.getStatus(parseInt(id));
      if (!result) {
        return this.result({ code: 404, message: '未找到提交记录' });
      }
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('查询状态失败:', error);
      this.result({ code: 500, message: '查询失败' });
    }
  }

  /**
   * 获取提交列表（后台管理）
   */
  async list() {
    const { ctx } = this;
    try {
      const { pageNo = 1, pageSize = 20, status, url, serviceType } = ctx.query;
      const result = await ctx.service.uied.submission.list({
        page: parseInt(pageNo),
        pageSize: parseInt(pageSize),
        status,
        url,
        serviceType,
      });
      this.result({ data: result });
    } catch (error) {
      ctx.logger.error('获取提交列表失败:', error);
      this.result({ code: 500, message: '获取列表失败' });
    }
  }

  /**
   * 获取待审核数量
   */
  async pendingCount() {
    const { ctx } = this;
    try {
      const count = await ctx.service.uied.submission.getPendingCount();
      this.result({ data: { count } });
    } catch (error) {
      ctx.logger.error('获取待审核数量失败:', error);
      this.result({ code: 500, message: '获取失败' });
    }
  }

  /**
   * 审核通过
   */
  async approve() {
    const { ctx } = this;
    try {
      const { id, categoryId } = ctx.request.body;
      if (!id) {
        return this.result({ code: 400, message: '缺少提交ID' });
      }
      const result = await ctx.service.uied.submission.approve(parseInt(id), categoryId);
      this.result({ data: result, message: '审核通过，网站已添加' });
    } catch (error) {
      ctx.logger.error('审核通过失败:', error);
      this.result({ code: 400, message: error.message });
    }
  }

  /**
   * 审核拒绝
   */
  async reject() {
    const { ctx } = this;
    try {
      const { id, reason } = ctx.request.body;
      if (!id) {
        return this.result({ code: 400, message: '缺少提交ID' });
      }
      const result = await ctx.service.uied.submission.reject(parseInt(id), reason);
      this.result({ data: result, message: '已拒绝' });
    } catch (error) {
      ctx.logger.error('审核拒绝失败:', error);
      this.result({ code: 400, message: error.message });
    }
  }

  /**
   * 删除提交记录
   */
  async del() {
    const { ctx } = this;
    try {
      const { id } = ctx.request.body;
      if (!id) {
        return this.result({ code: 400, message: '缺少提交ID' });
      }
      await ctx.service.uied.submission.del(parseInt(id));
      this.result({ message: '删除成功' });
    } catch (error) {
      ctx.logger.error('删除提交失败:', error);
      this.result({ code: 500, message: '删除失败' });
    }
  }

  /**
   * 更新提交记录
   */
  async edit() {
    const { ctx } = this;
    try {
      const data = ctx.request.body;
      if (!data.id) {
        return this.result({ code: 400, message: '缺少提交ID' });
      }
      const result = await ctx.service.uied.submission.edit(data);
      this.result({ data: result, message: '更新成功' });
    } catch (error) {
      ctx.logger.error('更新提交失败:', error);
      this.result({ code: 500, message: '更新失败' });
    }
  }
}

module.exports = SubmissionController;
