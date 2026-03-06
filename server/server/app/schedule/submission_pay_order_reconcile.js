/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-06
 */
/**
 * @file schedule/submission_pay_order_reconcile.js
 * @description 投稿支付订单补单定时任务
 */

'use strict';

const Subscription = require('egg').Subscription;

class SubmissionPayOrderReconcileSchedule extends Subscription {
  static get schedule() {
    return {
      interval: '10m',
      type: 'worker',
      immediate: false,
    };
  }

  /**
   * 定时轮询待支付订单，自动纠偏支付状态。
   */
  async subscribe() {
    const { ctx } = this;
    try {
      await ctx.service.uied.submission.reconcilePendingOrders({
        limit: 40,
        source: 'schedule',
      });
    } catch (error) {
      ctx.logger.error('[submissionPayOrderReconcile] 任务执行失败:', error);
    }
  }
}

module.exports = SubmissionPayOrderReconcileSchedule;
