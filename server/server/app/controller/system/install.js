/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
 */

'use strict';

const baseController = require('../baseController');

class InstallController extends baseController {
  /**
   * 获取安装状态
   */
  async status() {
    const { ctx } = this;
    try {
      const data = await ctx.service.install.getStatus();
      this.result({ code: 0, data, message: 'ok' });
    } catch (error) {
      ctx.logger.error('[install.status] 获取安装状态失败:', error);
      this.result({ code: 500, message: error.message || '获取安装状态失败' });
    }
  }

  /**
   * 获取环境检测结果
   */
  async envCheck() {
    const { ctx } = this;
    try {
      const data = await ctx.service.install.checkEnvironment();
      this.result({ code: 0, data, message: 'ok' });
    } catch (error) {
      ctx.logger.error('[install.envCheck] 获取环境检测失败:', error);
      this.result({ code: 500, message: error.message || '获取环境检测失败' });
    }
  }

  /**
   * 执行安装初始化
   */
  async initialize() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.install.initialize(payload);
      this.result({ code: 0, data, message: '安装初始化成功' });
    } catch (error) {
      ctx.logger.error('[install.initialize] 安装初始化失败:', error);
      this.result({ code: 500, message: error.message || '安装初始化失败' });
    }
  }
}

module.exports = InstallController;

