/**
 * @file notFoundSeo.test.ts
 * @description 不存在页面 SEO 回归测试
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.10.05
 */

import { describe, expect, it } from '@jest/globals';
import {
  buildNotFoundCanonical,
  NOT_FOUND_HEADING,
  NOT_FOUND_SEO_TITLE,
} from './notFoundSeo';

describe('不存在页面 SEO', () => {
  it.each([
    '/website/99999999',
    '/article/not-found-qa',
    '/category/not-found-qa',
  ])('%s 使用 noindex 和当前路由 canonical', (pathname) => {
    expect(NOT_FOUND_SEO_TITLE).toBe('页面不存在 - UIED AI工具导航');
    expect(NOT_FOUND_HEADING).toBe('页面不存在');
    expect(buildNotFoundCanonical(pathname, 'https://hao.uied.cn')).toBe(`https://hao.uied.cn${pathname}`);
  });
});
