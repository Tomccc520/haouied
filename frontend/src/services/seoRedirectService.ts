/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-31
 *
 * @file seoRedirectService.ts
 * @description 前台短链重定向解析服务
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';

export interface SeoRedirectResolveResult {
  matched: boolean;
  targetUrl: string;
  statusCode: number;
}

/**
 * 规范化前台路径，确保传给后端解析接口的是合法站内路径。
 */
const normalizePath = (pathname: string): string => {
  const raw = String(pathname || '').trim();
  if (!raw) return '/';
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
};

/**
 * 调用后端解析短链规则，命中后返回最终跳转地址。
 */
export const resolveSeoRedirect = async (
  pathname: string,
  search: string = ''
): Promise<SeoRedirectResolveResult> => {
  const normalizedPath = normalizePath(pathname);
  const normalizedQuery = String(search || '').trim().replace(/^\?+/, '');

  try {
    const response = await api.get('/seo/redirect/resolve', {
      params: {
        path: normalizedPath,
        query: normalizedQuery,
      },
    });
    const payload = unwrapApiResponse<Record<string, unknown>>(response?.data, {});
    return {
      matched: payload?.matched === true,
      targetUrl: String(payload?.targetUrl || '').trim(),
      statusCode: Number(payload?.statusCode || 301),
    };
  } catch (_error) {
    return {
      matched: false,
      targetUrl: '',
      statusCode: 301,
    };
  }
};

