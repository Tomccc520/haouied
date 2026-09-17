/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-09-17
 * @description 热门推荐列表搜索单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const HotRecommendationService = require('../../app/service/uied/hotRecommendation.js');

/**
 * 创建热门推荐服务测试实例。
 * @param {Array<unknown>} queryResults 每次 SQL 查询的模拟结果
 * @return {{service: HotRecommendationService, query: ReturnType<typeof vi.fn>}} 服务与查询函数
 */
function createHotRecommendationService(queryResults) {
  const query = vi.fn();
  queryResults.forEach(result => query.mockResolvedValueOnce(result));
  const app = {
    model: { query },
    Sequelize: { QueryTypes: { SELECT: 'SELECT' } },
  };
  const service = new HotRecommendationService({
    app,
    logger: { warn: vi.fn(), error: vi.fn() },
  });
  service._hotRecommendationWebsiteIdColumnReady = true;
  return { service, query };
}

describe('热门推荐列表搜索', () => {
  it('应同时搜索实时网站名称、链接、描述和推荐 ID', async () => {
    const { service, query } = createHotRecommendationService([
      [ { total: 1 } ],
      [ { id: 2573, name: 'Token工场', isActive: 1, startTime: 0, endTime: 0 } ],
    ]);

    const result = await service.list({
      page: 2,
      pageSize: 10,
      keyword: '  Token  ',
    });

    expect(query).toHaveBeenCalledTimes(2);
    const [ countSql, countOptions ] = query.mock.calls[0];
    const [ listSql, listOptions ] = query.mock.calls[1];
    expect(countSql).toContain('COUNT(DISTINCT hr.id)');
    expect(countSql).toContain('LEFT JOIN uied_website w');
    expect(countSql).toContain('CAST(hr.id AS CHAR) = ?');
    expect(countSql).toContain("NULLIF(w.name, '')");
    expect(countSql).toContain("NULLIF(w.url, '')");
    expect(countSql).toContain('hr.description');
    expect(countOptions.replacements).toEqual([ 'Token', 'Token', 'Token', 'Token' ]);
    expect(listSql).toContain('LEFT JOIN uied_website w');
    expect(listOptions.replacements).toEqual([ 'Token', 'Token', 'Token', 'Token', 10, 10 ]);
    expect(result).toEqual(expect.objectContaining({ count: 1, page: 2, pageSize: 10 }));
    expect(result.lists[0]).toEqual(expect.objectContaining({
      id: 2573,
      name: 'Token工场',
      isActive: true,
      scheduleStatus: 'active',
    }));
  });

  it('空关键词不应附加搜索条件', async () => {
    const { service, query } = createHotRecommendationService([
      [ { total: 0 } ],
      [],
    ]);

    await service.list({ keyword: '   ' });

    const [ countSql, countOptions ] = query.mock.calls[0];
    expect(countSql).not.toContain('CAST(hr.id AS CHAR)');
    expect(countOptions.replacements).toEqual([]);
  });
});
