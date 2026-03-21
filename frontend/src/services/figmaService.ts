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

export interface FigmaListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  tag?: string;
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
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
}

export interface FigmaListResponse {
  lists: FigmaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

const figmaService = {
  getFigmaList,
  getFigmaCategories,
  getFigmaTags,
};

export default figmaService;
