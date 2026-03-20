/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 *
 * @file services/mcpService.ts
 * @description MCP 中心前端 API 服务
 */

import type { AxiosError } from 'axios';
import api from './api';
import { unwrapApiList, unwrapApiResponse } from '../utils/apiResponse';

export interface McpListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  tag?: string;
}

export interface McpCategoryMeta {
  id: number;
  name: string;
  slug: string;
  itemCount?: number;
}

export interface McpTagMeta {
  id: number;
  name: string;
  slug: string;
  itemCount?: number;
}

export interface McpListItem {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  iconUrl?: string;
  coverUrl?: string;
  officialUrl?: string;
  docsUrl?: string;
  githubUrl?: string;
  transportType?: string;
  runtime?: string;
  protocolVersion?: string;
  categoryId?: number;
  categoryName?: string;
  categorySlug?: string;
  tags?: string[];
  isRecommended?: number;
  sortOrder?: number;
  publishTime?: number;
  viewCount?: number;
  clickCount?: number;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
  createTime?: number;
  updateTime?: number;
}

export interface McpListResponse {
  lists: McpListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface McpDetailTag {
  id: number;
  name: string;
  slug: string;
}

export interface McpDetailRelated {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  iconUrl?: string;
  transportType?: string;
  runtime?: string;
  publishTime?: number;
}

export interface McpDetail extends Omit<McpListItem, 'tags'> {
  content?: string;
  tags: McpDetailTag[];
  related: McpDetailRelated[];
}

const DEFAULT_LIST_RESPONSE: McpListResponse = {
  lists: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 0,
};

/**
 * 获取 MCP 列表。
 */
export const getMcpList = async (params?: McpListParams): Promise<McpListResponse> => {
  const response = await api.get('/mcp/list', { params });
  const data = unwrapApiResponse<Partial<McpListResponse>>(response.data, DEFAULT_LIST_RESPONSE);
  return {
    lists: Array.isArray(data?.lists) ? (data.lists as McpListItem[]) : [],
    total: Number(data?.total || 0),
    page: Number(data?.page || params?.page || 1),
    pageSize: Number(data?.pageSize || params?.pageSize || 12),
    totalPages: Number(data?.totalPages || 0),
  };
};

/**
 * 获取 MCP 详情。
 */
export const getMcpDetail = async (idOrSlug: string): Promise<McpDetail | null> => {
  const normalized = String(idOrSlug || '').trim();
  if (!normalized) return null;

  /**
   * 统一规范化详情对象，避免后端返回字段缺失导致前端渲染异常。
   */
  const normalizeDetailPayload = (rawDetail: unknown): McpDetail | null => {
    if (!rawDetail || typeof rawDetail !== 'object') return null;
    const detail = rawDetail as McpDetail;
    return {
      ...detail,
      tags: Array.isArray(detail.tags) ? detail.tags : [],
      related: Array.isArray(detail.related) ? detail.related : [],
    };
  };

  /**
   * 按标识获取详情：支持 slug/id 两种入参。
   */
  const fetchByIdentity = async (identity: string): Promise<McpDetail | null> => {
    const response = await api.get(`/mcp/${encodeURIComponent(identity)}`);
    return normalizeDetailPayload(unwrapApiResponse<McpDetail | null>(response.data, null));
  };

  /**
   * 兼容旧数据：slug 获取失败时，尝试通过列表匹配到条目 ID 再重试详情。
   */
  const loadFallbackDetailByList = async (): Promise<McpDetail | null> => {
    const lookup = await getMcpList({ page: 1, pageSize: 500 });
    const matched = (Array.isArray(lookup.lists) ? lookup.lists : []).find((item) => {
      return String(item.slug || '').trim() === normalized || String(item.id || '') === normalized;
    });
    if (!matched) return null;

    try {
      const fallback = await fetchByIdentity(String(matched.id));
      if (fallback) return fallback;
    } catch (fallbackError) {
      // 详情接口不可用时，回退到列表卡片信息构造最小详情，保证页面可用
    }

    return {
      ...matched,
      content: matched.summary || '',
      tags: [],
      related: [],
    } as McpDetail;
  };

  try {
    const primary = await fetchByIdentity(normalized);
    if (primary) return primary;
    return await loadFallbackDetailByList();
  } catch (primaryError) {
    try {
      const fallbackDetail = await loadFallbackDetailByList();
      if (fallbackDetail) return fallbackDetail;
    } catch (fallbackError) {
      // 忽略二次兜底错误，统一抛出原始异常
    }

    const status = Number((primaryError as AxiosError)?.response?.status || 0);
    if (status === 404) {
      return null;
    }
    throw primaryError;
  }
};

/**
 * 获取 MCP 分类元数据。
 */
export const getMcpCategories = async (): Promise<McpCategoryMeta[]> => {
  const response = await api.get('/mcp/meta/categories');
  return unwrapApiList<McpCategoryMeta>(response.data);
};

/**
 * 获取 MCP 标签元数据。
 */
export const getMcpTags = async (): Promise<McpTagMeta[]> => {
  const response = await api.get('/mcp/meta/tags');
  return unwrapApiList<McpTagMeta>(response.data);
};

const mcpService = {
  getMcpList,
  getMcpDetail,
  getMcpCategories,
  getMcpTags,
};

export default mcpService;
