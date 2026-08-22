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
    service.fetchPostsFromUiedOpenApi = vi.fn(async () => rows);
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
    expect(service.fetchPostsFromUiedOpenApi).toHaveBeenCalledTimes(1);
    expect(service.getDefaultConfig).toHaveBeenCalledTimes(1);
    expect(service.fetchPostsFromWpV2).not.toHaveBeenCalled();
  });

  it('上游全部失败且没有缓存时应降级为空列表', async () => {
    service.fetchPostsFromUiedOpenApi = vi.fn(async () => {
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
    service.fetchPostsFromUiedOpenApi = vi.fn(async () => {
      throw new Error('UIED 上游失败');
    });
    service.fetchPostsFromWpV2 = vi.fn(async () => {
      throw new Error('WordPress 上游失败');
    });

    const result = await service.getPosts({ categoryId: 417, perPage: 8 });

    expect(result).toEqual(staleRows);
    expect(service.testLogger.warn).toHaveBeenCalled();
  });

  it('历史 UIED wp-json 地址应自动映射到开放文章流', () => {
    expect(service.resolveUiedOpenPostsApiUrl('https://www.uied.cn/wp-json/wp/v2'))
      .toBe('https://www.uied.cn/api/open/v1/posts');
    expect(service.resolveUiedOpenPostsApiUrl('http://uied.cn/wp-json/wp/v2'))
      .toBe('https://www.uied.cn/api/open/v1/posts');
    expect(service.resolveUiedOpenPostsApiUrl('https://example.com/wp-json/wp/v2')).toBe('');
    expect(service.resolvePostsCacheTtl({
      apiUrl: 'https://www.uied.cn/api/open/v1/posts',
      cacheTime: 7200,
    })).toBe(300000);
  });

  it('开放文章流应传递分类和排序参数并解析封面图与统计字段', async () => {
    service.requestWordPressJson = vi.fn(async () => ({
      data: {
        code: 0,
        message: 'ok',
        data: {
          items: [{
            id: 921498,
            title: '测试开放文章',
            excerpt: '文章摘要',
            url: 'https://www.uied.cn/posts/921498',
            thumbnail: 'https://img.uied.cn/test-cover.webp',
            publishedAt: '2026-07-31 14:17:55',
            author: {
              name: '测试作者',
              avatar: 'https://img.uied.cn/test-avatar.webp',
            },
            category: { id: 417, name: 'AIGC' },
            stats: { views: 88, comments: 6, likes: 3 },
          }],
        },
      },
    }));

    const rows = await service.fetchPostsFromUiedOpenApi({
      config: { apiUrl: 'https://www.uied.cn/api/open/v1/posts' },
      categoryId: 417,
      page: 2,
      perPage: 12,
      orderBy: 'views',
      order: 'desc',
    });

    expect(service.requestWordPressJson).toHaveBeenCalledWith(
      'https://www.uied.cn/api/open/v1/posts',
      {
        page: 2,
        per_page: 12,
        orderby: 'views',
        order: 'desc',
        categories: 417,
      }
    );
    expect(rows).toEqual([ expect.objectContaining({
      id: '921498',
      name: '测试开放文章',
      thumbnail: 'https://img.uied.cn/test-cover.webp',
      authorName: '测试作者',
      category: 'AIGC',
      viewCount: 88,
      commentCount: 6,
    }) ]);

    await service.fetchPostsFromUiedOpenApi({
      config: { apiUrl: 'https://www.uied.cn/api/open/v1/posts' },
      categorySlug: 'ai',
      page: 1,
      perPage: 6,
    });
    expect(service.requestWordPressJson).toHaveBeenLastCalledWith(
      'https://www.uied.cn/api/open/v1/posts',
      {
        page: 1,
        per_page: 6,
        orderby: 'date',
        order: 'desc',
        category_slug: 'ai',
      }
    );
  });

  it('自动模式在客户配置源为空时应回退内置开放文章流', async () => {
    const fallbackRows = [{ id: 'fallback-1', name: '官方最新文章' }];
    service.getDefaultConfig = vi.fn(async () => ({
      id: 2,
      apiUrl: 'https://example.com/wp-json/wp/v2',
      cacheTime: 120,
    }));
    service.fetchPostsFromUiedApi = vi.fn(async () => []);
    service.fetchPostsFromBuiltinUiedOpenApi = vi.fn(async options => {
      expect(options).toEqual(expect.objectContaining({
        categoryId: 417,
        perPage: 8,
      }));
      return fallbackRows;
    });

    const result = await service.getPosts({
      source: 'auto',
      categoryId: 417,
      perPage: 8,
    });

    expect(result).toEqual(fallbackRows);
    expect(service.fetchPostsFromBuiltinUiedOpenApi).toHaveBeenCalledTimes(1);
  });

  it('应拒绝本机、私网和带账号密码的数据源地址', () => {
    expect(() => service.normalizeSourceApiUrl('http://127.0.0.1:8002/api'))
      .toThrow('不能指向本机或私网地址');
    expect(() => service.normalizeSourceApiUrl('http://192.168.1.8/wp-json/wp/v2'))
      .toThrow('不能指向本机或私网地址');
    expect(() => service.normalizeSourceApiUrl('http://[::ffff:127.0.0.1]/api'))
      .toThrow('不能指向本机或私网地址');
    expect(() => service.normalizeSourceApiUrl('https://user:pass@example.com/wp-json/wp/v2'))
      .toThrow('不能包含用户名或密码');
    expect(service.normalizeSourceApiUrl('https://example.com/wp-json/wp/v2/'))
      .toBe('https://example.com/wp-json/wp/v2');
  });

  it('全新数据库缺少配置表时应自动建表并回退内置源', async () => {
    const query = vi.fn(async sql => String(sql).startsWith('SELECT') ? [] : []);
    const app = {
      model: { query },
      Sequelize: {
        QueryTypes: {
          RAW: 'RAW',
          SELECT: 'SELECT',
        },
      },
    };
    const nextService = new WordpressConfigService({
      app,
      logger: service.testLogger,
    });

    const config = await nextService.getDefaultConfig();

    expect(config).toEqual(expect.objectContaining({
      id: 0,
      apiUrl: 'https://www.uied.cn/api/open/v1/posts',
      cacheTime: 300,
    }));
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[0][0])).toContain('CREATE TABLE IF NOT EXISTS `uied_wordpress_config`');
    expect(String(query.mock.calls[1][0])).toContain('CREATE TABLE IF NOT EXISTS `uied_wordpress_category`');
  });

  it('诊断模式应绕过缓存并向管理端暴露真实上游错误', async () => {
    const cacheKey = service.buildPostsCacheKey({
      sourceMode: 'uied_latest',
      period: 'all',
      categoryId: 417,
      categorySlug: '',
      tagId: 0,
      page: 1,
      perPage: 8,
      orderBy: 'date',
      order: 'desc',
      search: '',
    });
    service.getPostsRuntimeStores().cache.set(cacheKey, {
      data: [{ id: 'cached' }],
      expiresAt: Date.now() + 60000,
    });
    service.fetchPostsFromUiedOpenApi = vi.fn(async () => {
      throw new Error('真实上游连接失败');
    });

    await expect(service.getPosts({
      categoryId: 417,
      perPage: 8,
      strict: true,
      bypassCache: true,
    })).rejects.toThrow('真实上游连接失败');
    expect(service.fetchPostsFromUiedOpenApi).toHaveBeenCalledTimes(1);
  });

  it('配置切换后旧请求不得把过期数据重新写回缓存', async () => {
    let resolveRequest;
    service.fetchPostsFromUiedOpenApi = vi.fn(() => new Promise(resolve => {
      resolveRequest = resolve;
    }));
    const pending = service.getPosts({ categoryId: 417, perPage: 8 });
    await Promise.resolve();
    service.clearPostsRuntimeCache();
    resolveRequest([{ id: 'old-source' }]);

    await expect(pending).resolves.toEqual([{ id: 'old-source' }]);
    expect(service.getPostsRuntimeStores().cache.size).toBe(0);
  });
});
