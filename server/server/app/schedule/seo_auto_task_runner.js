/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
/**
 * @file schedule/seo_auto_task_runner.js
 * @description SEO 自动任务调度器（按后台间隔配置执行检测/推送）
 */

'use strict';

const Subscription = require('egg').Subscription;

class SeoAutoTaskRunnerSchedule extends Subscription {
  static get schedule() {
    return {
      interval: '5m',
      type: 'worker',
      immediate: false,
    };
  }

  /**
   * 轮询 SEO 自动任务状态，并在到期时触发任务。
   */
  async subscribe() {
    const { ctx } = this;
    try {
      const result = await ctx.service.uied.seoCenter.runDueAutoTasks();
      if (result?.ran === true) {
        ctx.logger.info('[seo_auto_task_runner] 自动任务执行完成: %j', {
          reason: result.reason,
          taskType: result?.data?.taskType || 'all',
          success: result?.data?.success === true,
          taskCount: Number(result?.data?.taskCount || 0),
        });
      }
    } catch (error) {
      ctx.logger.error('[seo_auto_task_runner] 自动任务调度失败:', error);
    }
  }
}

module.exports = SeoAutoTaskRunnerSchedule;
