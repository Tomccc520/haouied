/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 *
 * @file services/figmaService.ts
 * @description Figma 插件中心前端 API 服务
 */

import api from './api';
import { unwrapApiList, unwrapApiResponse } from '../utils/apiResponse';
import type { AxiosError } from 'axios';

export interface FigmaListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  tag?: string;
  sort?: 'latest' | 'hot' | 'users' | 'likes';
}

export interface FigmaRecommendPayload {
  pluginName: string;
  officialUrl: string;
  summary?: string;
  categoryId?: number;
  submitterName?: string;
  submitterEmail?: string;
  submitterWechat?: string;
  submitNote?: string;
}

export interface FigmaCategoryMeta {
  id: number;
  name: string;
  slug: string;
  itemCount?: number;
}

export interface FigmaTagMeta {
  id: number;
  name: string;
  slug: string;
  itemCount?: number;
}

export interface FigmaListItem {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  iconUrl?: string;
  coverUrl?: string;
  officialUrl?: string;
  docsUrl?: string;
  githubUrl?: string;
  figmaPluginId?: string;
  authorName?: string;
  sourceType?: string;
  sourceUrl?: string;
  categoryId?: number;
  categoryName?: string;
  categorySlug?: string;
  tags?: string[];
  isRecommended?: number;
  sortOrder?: number;
  publishTime?: number;
  viewCount?: number;
  clickCount?: number;
  userCount?: number;
  likeCount?: number;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
}

export interface FigmaDetailTag {
  id: number;
  name: string;
  slug: string;
}

export interface FigmaDetail extends Omit<FigmaListItem, 'tags'> {
  content?: string;
  transportType?: string;
  runtime?: string;
  protocolVersion?: string;
  createTime?: number;
  updateTime?: number;
  tags?: FigmaDetailTag[];
  related?: FigmaListItem[];
}

export interface FigmaListResponse {
  lists: FigmaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FigmaRecommendResponse {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
}

const DEFAULT_LIST_RESPONSE: FigmaListResponse = {
  lists: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 0,
};

/**
 * 获取 Figma 插件列表。
 */
export const getFigmaList = async (params?: FigmaListParams): Promise<FigmaListResponse> => {
  const response = await api.get('/figma/list', { params });
  const data = unwrapApiResponse<Partial<FigmaListResponse>>(response.data, DEFAULT_LIST_RESPONSE);
  return {
    lists: Array.isArray(data?.lists) ? (data.lists as FigmaListItem[]) : [],
    total: Number(data?.total || 0),
    page: Number(data?.page || params?.page || 1),
    pageSize: Number(data?.pageSize || params?.pageSize || 12),
    totalPages: Number(data?.totalPages || 0),
  };
};

/**
 * 获取 Figma 插件分类元数据。
 */
export const getFigmaCategories = async (): Promise<FigmaCategoryMeta[]> => {
  const response = await api.get('/figma/meta/categories');
  return unwrapApiList<FigmaCategoryMeta>(response.data);
};

/**
 * 获取 Figma 插件标签元数据。
 */
export const getFigmaTags = async (): Promise<FigmaTagMeta[]> => {
  const response = await api.get('/figma/meta/tags');
  return unwrapApiList<FigmaTagMeta>(response.data);
};

/**
 * 获取 Figma 插件详情。
 */
export const getFigmaDetail = async (idOrSlug: string | number): Promise<FigmaDetail | null> => {
  const value = String(idOrSlug || '').trim();
  if (!value) return null;
  const normalizeDetailPayload = (rawDetail: unknown): FigmaDetail | null => {
    if (!rawDetail || typeof rawDetail !== 'object') return null;
    const detail = rawDetail as FigmaDetail;
    return {
      ...detail,
      tags: Array.isArray(detail.tags) ? detail.tags : [],
      related: Array.isArray(detail.related) ? detail.related : [],
    };
  };

  const fetchByIdentity = async (identity: string): Promise<FigmaDetail | null> => {
    const response = await api.get(`/figma/${encodeURIComponent(identity)}`);
    return normalizeDetailPayload(unwrapApiResponse<FigmaDetail | null>(response.data, null));
  };

  /**
   * 兜底方案：详情接口暂时不可用时，使用列表卡片数据构造最小详情，保证页面可读。
   */
  const loadFallbackDetailByList = async (): Promise<FigmaDetail | null> => {
    const lookup = await getFigmaList({ page: 1, pageSize: 500 });
    const matched = (Array.isArray(lookup.lists) ? lookup.lists : []).find((item) => {
      return String(item.slug || '').trim() === value || String(item.id || '') === value;
    });
    if (!matched) return null;
    const tags = Array.isArray(matched.tags)
      ? matched.tags.map((tagName, index) => ({ id: index + 1, name: String(tagName || ''), slug: String(tagName || '') }))
      : [];
    return {
      ...matched,
      content: matched.summary || '',
      tags,
      related: [],
    };
  };

  try {
    const detail = await fetchByIdentity(value);
    if (detail) return detail;
    return await loadFallbackDetailByList();
  } catch (error) {
    const status = Number((error as AxiosError)?.response?.status || 0);
    if (status === 404) return null;
    const fallback = await loadFallbackDetailByList().catch(() => null);
    if (fallback) return fallback;
    throw error;
  }
};

/**
 * 提交 Figma 插件推荐（前台用户入口）。
 */
export const submitFigmaRecommendation = async (payload: FigmaRecommendPayload): Promise<FigmaRecommendResponse> => {
  const response = await api.post('/figma/recommend', payload);
  const data = unwrapApiResponse<Partial<FigmaRecommendResponse>>(response.data, {
    id: 0,
    status: 'pending',
    message: '',
  });
  return {
    id: Number(data?.id || 0),
    status: String(data?.status || 'pending').trim().toLowerCase() === 'approved'
      ? 'approved'
      : (String(data?.status || 'pending').trim().toLowerCase() === 'rejected' ? 'rejected' : 'pending'),
    message: String(data?.message || '').trim(),
  };
};

const figmaService = {
  getFigmaList,
  getFigmaCategories,
  getFigmaTags,
  getFigmaDetail,
  submitFigmaRecommendation,
};

export default figmaService;
