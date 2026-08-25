/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-08-24
 * @description SEO 站长平台增量推送单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const SeoCenterService = require('../../app/service/uied/seoCenter.js');

/**
 * 创建 SEO 中心测试实例。
 * @return {SeoCenterService} 服务实例
 */
function createSeoCenterService() {
  return new SeoCenterService({
    app: {},
    service: {
      uied: {
        setting: {
          get: vi.fn(async () => []),
          save: vi.fn(async () => true),
        },
      },
    },
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

describe('SEO 站长平台增量推送', () => {
  it('已有游标时应按更新时间正序处理待推送 URL', async () => {
    const service = createSeoCenterService();
    service.buildSitemapRoutes = vi.fn(async () => ({
      routes: [
        { loc: 'https://hao.uied.cn/old', updatedAt: 1770000000 },
        { loc: 'https://hao.uied.cn/latest', updatedAt: 1770000300 },
        { loc: 'https://hao.uied.cn/newer', updatedAt: 1770000200 },
      ],
    }));

    const urls = await service.collectPushUrls({
      limit: 10,
      since: new Date(1770000100 * 1000).toISOString(),
    });

    expect(urls).toEqual([
      'https://hao.uied.cn/newer',
      'https://hao.uied.cn/latest',
    ]);
  });

  it('同一秒内应使用 URL 游标继续推送而不漏项', async () => {
    const service = createSeoCenterService();
    service.buildSitemapRoutes = vi.fn(async () => ({
      routes: [
        { loc: 'https://hao.uied.cn/a', updatedAt: 1770000200 },
        { loc: 'https://hao.uied.cn/b', updatedAt: 1770000200 },
        { loc: 'https://hao.uied.cn/c', updatedAt: 1770000200 },
      ],
    }));

    const urls = await service.collectPushUrls({
      limit: 10,
      cursor: { updatedAt: 1770000200, loc: 'https://hao.uied.cn/a' },
    });

    expect(urls).toEqual([
      'https://hao.uied.cn/b',
      'https://hao.uied.cn/c',
    ]);
  });

  it('自动增量任务无新 URL 时应正常跳过而不是失败', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({ platformPush: {} }));
    service.getLastSuccessfulPushCursor = vi.fn(async () => ({
      updatedAt: 1787529600,
      loc: 'https://hao.uied.cn/website/2573',
    }));
    service.collectPushUrlBatch = vi.fn(async () => ({
      mode: 'incremental',
      entries: [],
      newEntries: [],
      backfillEntries: [],
      backfillExhausted: true,
    }));
    service.appendLog = vi.fn(async (_key, entry) => entry);

    const result = await service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
    });

    expect(result.pushedCount).toBe(0);
    expect(result.result).toEqual({
      skipped: true,
      reason: 'no_updated_urls',
    });
    expect(service.appendLog).toHaveBeenCalledTimes(1);
  });

  it('首次自动任务应推送最新 URL 并记录增量上下文', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({
      platformPush: {
        baidu: {
          site: 'https://hao.uied.cn',
          token: 'test-token',
        },
      },
    }));
    service.getLastSuccessfulPushCursor = vi.fn(async () => ({}));
    service.collectPushUrlBatch = vi.fn(async () => ({
      mode: 'bootstrap',
      entries: [
        { loc: 'https://hao.uied.cn/website/2573', updatedAt: 1787529600 },
      ],
      newEntries: [],
      backfillEntries: [],
      hasBackfill: false,
      backfillExhausted: true,
    }));
    service.pushToBaidu = vi.fn(async () => ({ status: 200, data: { success: 1 } }));
    service.appendLog = vi.fn(async (_key, entry) => entry);

    const result = await service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
      limit: 100,
    });

    expect(result.pushedCount).toBe(1);
    expect(result.incremental).toBe(true);
    expect(result.success).toBe(true);
    expect(result.cursor).toEqual({
      updatedAt: 1787529600,
      loc: 'https://hao.uied.cn/website/2573',
      backfillUpdatedAt: 1787529600,
      backfillLoc: 'https://hao.uied.cn/website/2573',
      backfillComplete: true,
    });
    expect(service.pushToBaidu).toHaveBeenCalledTimes(1);
  });

  it('超过单批上限时应从上一批游标继续处理余量', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({
      platformPush: { baidu: { site: 'https://hao.uied.cn', token: 'test-token' } },
    }));
    service.getLastSuccessfulPushCursor = vi.fn(async () => ({
      updatedAt: 1770000000,
      loc: 'https://hao.uied.cn/start',
    }));
    service.buildSitemapRoutes = vi.fn(async () => ({
      routes: [ 1, 2, 3, 4, 5 ].map(index => ({
        loc: `https://hao.uied.cn/website/${index}`,
        updatedAt: 1770000000 + index,
      })),
    }));
    service.pushToBaidu = vi.fn(async urls => ({
      status: 200,
      data: { success: urls.length },
    }));
    service.appendLog = vi.fn(async (_key, entry) => entry);

    const first = await service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
      limit: 2,
    });
    const second = await service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
      limit: 2,
      cursor: first.cursor,
    });
    const third = await service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
      limit: 2,
      cursor: second.cursor,
    });

    expect(service.pushToBaidu.mock.calls.map(call => call[0])).toEqual([
      [ 'https://hao.uied.cn/website/1', 'https://hao.uied.cn/website/2' ],
      [ 'https://hao.uied.cn/website/3', 'https://hao.uied.cn/website/4' ],
      [ 'https://hao.uied.cn/website/5' ],
    ]);
    expect(third.cursor.loc).toBe('https://hao.uied.cn/website/5');
  });

  it('首次推送超过单批上限时应先推最新内容并持续回填全部历史 URL', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({
      platformPush: { baidu: { site: 'https://hao.uied.cn', token: 'test-token' } },
    }));
    service.getLastSuccessfulPushCursor = vi.fn(async () => ({}));
    service.buildSitemapRoutes = vi.fn(async () => ({
      routes: [ 1, 2, 3, 4, 5 ].map(index => ({
        loc: `https://hao.uied.cn/website/${index}`,
        updatedAt: 1770000000 + index,
      })),
    }));
    service.pushToBaidu = vi.fn(async urls => ({
      status: 200,
      data: { success: urls.length },
    }));
    service.appendLog = vi.fn(async (_key, entry) => entry);

    const first = await service.pushToPlatforms({ platform: 'baidu', incremental: true, limit: 2 });
    const second = await service.pushToPlatforms({ platform: 'baidu', incremental: true, limit: 2, cursor: first.cursor });
    const third = await service.pushToPlatforms({ platform: 'baidu', incremental: true, limit: 2, cursor: second.cursor });

    expect(service.pushToBaidu.mock.calls.map(call => call[0])).toEqual([
      [ 'https://hao.uied.cn/website/5', 'https://hao.uied.cn/website/4' ],
      [ 'https://hao.uied.cn/website/3', 'https://hao.uied.cn/website/2' ],
      [ 'https://hao.uied.cn/website/1' ],
    ]);
    expect(third.cursor.backfillComplete).toBe(true);
  });

  it('平台返回业务错误时应记录失败且不推进游标', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({
      platformPush: { baidu: { site: 'https://hao.uied.cn', token: 'bad-token' } },
    }));
    service.getLastSuccessfulPushCursor = vi.fn(async () => ({
      updatedAt: 1770000000,
      loc: 'https://hao.uied.cn/old',
    }));
    service.collectPushUrlBatch = vi.fn(async () => ({
      mode: 'incremental',
      entries: [
        { loc: 'https://hao.uied.cn/new', updatedAt: 1770000100 },
      ],
      newEntries: [
        { loc: 'https://hao.uied.cn/new', updatedAt: 1770000100 },
      ],
      backfillEntries: [],
      backfillExhausted: true,
    }));
    service.pushToBaidu = vi.fn(async () => ({
      status: 200,
      data: { error: 401, message: 'token is not valid' },
    }));
    service.appendLog = vi.fn(async (_key, entry) => entry);

    await expect(service.pushToPlatforms({
      platform: 'baidu',
      incremental: true,
    })).rejects.toThrow('token is not valid');

    const failedLog = service.appendLog.mock.calls[0][1];
    expect(failedLog.success).toBe(false);
    expect(failedLog.pushedCount).toBe(0);
    expect(failedLog.cursor).toMatchObject({
      updatedAt: 1770000000,
      loc: 'https://hao.uied.cn/old',
    });
  });

  it('进阶 Sitemap 分片 lastmod 应取分片内最新业务时间', async () => {
    const service = createSeoCenterService();
    service.getConfigCached = vi.fn(async () => ({ sitemap: { maxUrlsPerFile: 1000 } }));
    service.buildSitemapRoutes = vi.fn(async () => ({
      origin: 'https://hao.uied.cn',
      routes: [
        { path: '/about', loc: 'https://hao.uied.cn/about', updatedAt: 1769997700, lastmod: '2026-02-02T02:01:40.000Z' },
        { path: '/contact', loc: 'https://hao.uied.cn/contact', updatedAt: 1769997800, lastmod: '2026-02-02T02:03:20.000Z' },
      ],
    }));

    const bundle = await service.buildAdvancedSitemapBundle();

    expect(bundle.meta[0].lastmod).toBe('2026-02-02T02:03:20.000Z');
  });
});
