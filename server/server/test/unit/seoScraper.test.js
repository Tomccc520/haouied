/**
 * @file test/unit/seoScraper.test.js
 * @description 单元测试：SEO 抓取网络异常提示规范化
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.10.05
 */

import { describe, expect, it } from 'vitest';
import SeoScraperService from '../../app/service/uied/seoScraper.js';

describe('SEO 抓取异常提示', () => {
  const service = Object.create(SeoScraperService.prototype);

  it('识别 status -1 且未建立连接的错误', () => {
    expect(service.isNetworkFetchError({
      message: 'GET https://example.com -1 (connected: false)',
    })).toBe(true);
  });

  it('隐藏底层 Socket 统计并返回可读提示', () => {
    const message = service.formatFetchError({
      message: 'GET https://www.tripo3d.ai/zh -1 (connected: false, agent status: {"timeoutSocketCount":4273})',
    }, 'https://www.tripo3d.ai/zh');
    expect(message).toContain('目标站点 www.tripo3d.ai 暂时无法连接');
    expect(message).not.toContain('timeoutSocketCount');
  });
});
