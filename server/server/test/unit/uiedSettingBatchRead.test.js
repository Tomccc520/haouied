/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-07-15
 * @description UIED 站点设置批量读取单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const SettingService = require('../../app/service/uied/setting.js');

/**
 * 创建带假数据库查询器的设置服务。
 * @param {Array<Record<string, unknown>>} rows 查询返回行
 * @return {SettingService} 设置服务实例
 */
function createSettingService(rows) {
  return new SettingService({
    app: {
      model: {
        query: vi.fn(async () => rows),
      },
      Sequelize: {
        QueryTypes: {
          SELECT: 'SELECT',
        },
      },
    },
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

describe('UIED 站点设置批量读取', () => {
  it('应通过一次 SQL 返回多个已解析配置并去重键名', async () => {
    const service = createSettingService([
      { key: 'homepageConfig', value: '{"homePageSlug":"ai"}' },
      { key: 'searchConfig', value: '{"enabled":false}' },
    ]);

    const result = await service.getMany([
      'homepageConfig',
      'searchConfig',
      'homepageConfig',
      '',
    ]);

    expect(result).toEqual({
      homepageConfig: { homePageSlug: 'ai' },
      searchConfig: { enabled: false },
    });
    expect(service.app.model.query).toHaveBeenCalledTimes(1);
    expect(service.app.model.query.mock.calls[0][1].replacements).toEqual([
      'homepageConfig',
      'searchConfig',
    ]);
  });
});
