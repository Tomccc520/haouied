/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-07-15
 * @description WordPress 文章代理缓存与并发降级单元测试
 */

import { createRequire } from 'module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const WordpressConfigService = require('../../app/service/uied/wordpressConfig.js');

/**
 * 创建 WordPress 配置服务测试实例。
 * @return {WordpressConfigService} 服务实例
 */
function createWordpressService() {
  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
  };
  const service = new WordpressConfigService({
    app: {},
    logger,
  });
  service.testLogger = logger;
  service.getDefaultConfig = vi.fn(async () => ({
    id: 1,
    apiUrl: 'https://www.uied.cn/wp-json/wp/v2',
    cacheTime: 120,
  }));
  return service;
}

describe('WordPress 文章代理缓存', () => {
  let service;

  beforeEach(() => {
    service = createWordpressService();
  });

  it('相同参数的并发请求应只访问一次上游并复用缓存', async () => {
    const rows = [{ id: '1', name: '测试文章' }];
    service.fetchPostsFromUiedApi = vi.fn(async () => rows);
    service.fetchPostsFromWpV2 = vi.fn(async () => []);
    const params = {
      source: 'auto',
      categoryId: 417,
      page: 1,
      perPage: 8,
      orderBy: 'date',
      order: 'desc',
    };

    const results = await Promise.all([
      service.getPosts(params),
      service.getPosts(params),
      service.getPosts(params),
    ]);
    const cachedResult = await service.getPosts(params);

    expect(results).toEqual([ rows, rows, rows ]);
    expect(cachedResult).toEqual(rows);
    expect(service.fetchPostsFromUiedApi).toHaveBeenCalledTimes(1);
    expect(service.getDefaultConfig).toHaveBeenCalledTimes(1);
    expect(service.fetchPostsFromWpV2).not.toHaveBeenCalled();
  });

  it('上游全部失败且没有缓存时应降级为空列表', async () => {
    service.fetchPostsFromUiedApi = vi.fn(async () => {
      throw new Error('UIED 上游失败');
    });
    service.fetchPostsFromWpV2 = vi.fn(async () => {
      throw new Error('WordPress 上游失败');
    });

    const result = await service.getPosts({ categoryId: 417, perPage: 8 });

    expect(result).toEqual([]);
    expect(service.testLogger.error).toHaveBeenCalledTimes(1);
  });

  it('上游失败时应返回过期缓存而不是抛出错误', async () => {
    const staleRows = [{ id: '2', name: '缓存文章' }];
    const fetchOptions = {
      sourceMode: 'uied_latest',
      period: 'all',
      categoryId: 417,
      tagId: undefined,
      page: 1,
      perPage: 8,
      orderBy: 'date',
      order: 'desc',
      search: '',
    };
    const cacheKey = service.buildPostsCacheKey(fetchOptions);
    service.getPostsRuntimeStores().cache.set(cacheKey, {
      data: staleRows,
      expiresAt: Date.now() - 1000,
    });
    service.fetchPostsFromUiedApi = vi.fn(async () => {
      throw new Error('UIED 上游失败');
    });
    service.fetchPostsFromWpV2 = vi.fn(async () => {
      throw new Error('WordPress 上游失败');
    });

    const result = await service.getPosts({ categoryId: 417, perPage: 8 });

    expect(result).toEqual(staleRows);
    expect(service.testLogger.warn).toHaveBeenCalled();
  });
});
