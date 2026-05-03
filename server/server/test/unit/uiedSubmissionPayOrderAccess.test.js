/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-05-03
 * @description 投稿支付订单状态访问凭证单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const SubmissionService = require('../../app/service/uied/submission.js');

/**
 * 创建投稿服务测试实例。
 * @param {Object} row 支付订单查询返回行
 * @return {SubmissionService}
 */
function createSubmissionService(row) {
  const service = new SubmissionService({
    app: {
      model: {
        query: vi.fn(async (sql) => {
          if (sql.includes('FROM uied_submission_pay_order')) return row ? [row] : [];
          return [];
        }),
      },
      Sequelize: {
        QueryTypes: {
          SELECT: 'SELECT',
          RAW: 'RAW',
        },
      },
    },
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
  service.ensurePayOrderTable = vi.fn(async () => {});
  service.reconcilePendingOrders = vi.fn(async () => {});
  return service;
}

describe('投稿支付订单状态访问控制', () => {
  it('公开查询订单状态时缺少访问凭证应拒绝', async () => {
    const service = createSubmissionService({
      id: 1,
      order_no: 'SUBP_TEST',
      submission_id: 11,
      status: 'created',
      status_token: 'secure-token',
    });

    await expect(
      service.getPayOrderStatus('SUBP_TEST', { requireAccess: true, reconcileIfPending: true })
    ).rejects.toThrow('订单访问凭证无效');
    expect(service.reconcilePendingOrders).not.toHaveBeenCalled();
  });

  it('公开查询订单状态时访问凭证匹配才返回订单', async () => {
    const service = createSubmissionService({
      id: 1,
      order_no: 'SUBP_TEST',
      submission_id: 11,
      status: 'created',
      status_token: 'secure-token',
    });

    const result = await service.getPayOrderStatus('SUBP_TEST', {
      requireAccess: true,
      statusToken: 'secure-token',
    });

    expect(result.orderNo).toBe('SUBP_TEST');
    expect(result.status).toBe('created');
  });
});
