/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-05-03
 * @description UIED 网站公开访问安全与分类递归筛选单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const WebsiteService = require('../../app/service/uied/website.js');
const FrontendService = require('../../app/service/uied/frontend.js');

/**
 * 创建带假查询器的网站管理服务，便于验证 SQL 查询边界。
 * @param {Function} queryHandler 查询处理函数
 * @return {WebsiteService}
 */
function createWebsiteService(queryHandler) {
  const query = vi.fn(queryHandler);
  return new WebsiteService({
    app: {
      model: { query },
      Sequelize: {
        QueryTypes: {
          SELECT: 'SELECT',
          UPDATE: 'UPDATE',
        },
      },
    },
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

/**
 * 创建带假查询器的前台服务，便于验证公开详情查询条件。
 * @param {Function} queryHandler 查询处理函数
 * @return {FrontendService}
 */
function createFrontendService(queryHandler) {
  const query = vi.fn(queryHandler);
  return new FrontendService({
    app: {
      model: { query },
      Sequelize: {
        QueryTypes: {
          SELECT: 'SELECT',
          UPDATE: 'UPDATE',
          RAW: 'RAW',
        },
      },
    },
    service: {},
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

describe('UIED 网站公开访问边界', () => {
  it('公开详情按数字 ID 未命中时不应回退读取非公开站点', async () => {
    const service = createFrontendService(async () => []);

    const result = await service.getWebsiteDetail('2573');

    expect(result).toBeNull();
    expect(service.app.model.query).toHaveBeenCalledTimes(1);
    expect(service.app.model.query.mock.calls[0][0]).toContain('status');
  });

  it('公开详情按 slug 未命中时不应回退读取非公开站点', async () => {
    const service = createFrontendService(async () => []);

    const result = await service.getWebsiteDetail('hidden-site');

    expect(result).toBeNull();
    expect(service.app.model.query).toHaveBeenCalledTimes(1);
    expect(service.app.model.query.mock.calls[0][0]).toContain('status');
  });

  it('点击埋点必须拒绝非公开状态网站', async () => {
    const service = createWebsiteService(async (sql) => {
      if (/^SELECT/i.test(sql) && sql.includes('status')) return [];
      if (/^SELECT/i.test(sql)) return [{ id: 1, status: 'draft' }];
      return [];
    });

    await expect(service.incrementClick(1)).rejects.toThrow('网站不存在');
    expect(service.app.model.query.mock.calls.some(([ sql ]) => /^UPDATE/i.test(sql))).toBe(false);
  });
});

describe('UIED 网站分类筛选', () => {
  it('包含子分类时应递归收集所有后代分类', async () => {
    const service = createWebsiteService(async (sql, options = {}) => {
      if (sql.includes('FROM uied_category') && sql.includes('parent_id IN')) {
        const parents = (options.replacements?.[0] || []).map(Number);
        if (parents.includes(1)) return [{ id: 2 }];
        if (parents.includes(2)) return [{ id: 3 }];
        return [];
      }
      if (sql.includes('SELECT COUNT(*) as total')) return [{ total: 0 }];
      if (sql.includes('SELECT w.id, w.name')) return [];
      return [];
    });

    await service.list({ categoryId: 1, includeChildren: true });

    const descendantQueries = service.app.model.query.mock.calls
      .filter(([ sql ]) => sql.includes('FROM uied_category') && sql.includes('parent_id IN'));
    const listQuery = service.app.model.query.mock.calls
      .find(([ sql ]) => sql.includes('SELECT w.id, w.name'));

    expect(descendantQueries).toHaveLength(3);
    expect(listQuery?.[1].replacements).toEqual(
      expect.arrayContaining([1, 2, 3, 1, 2, 3])
    );
  });
});
