/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 */
/**
 * @file dailyNewService.ts
 * @description 每日上新网址服务
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';

export interface DailyNewWebsiteItem {
  id: string;
  slug?: string;
  name: string;
  description: string;
  url: string;
  iconUrl?: string;
  isHot?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isPinned?: boolean;
  sortOrder?: number;
  tags?: string[];
  category?: string;
  categorySlug?: string;
  clickCount?: number;
  createdAt?: string;
  updatedAt?: string;
  latestAt?: string;
}

export interface DailyNewWebsiteResponse {
  list: DailyNewWebsiteItem[];
  total: number;
  page: number;
  pageSize: number;
  days: number;
  sortBy: 'latest' | 'hot' | 'rank';
  since: string;
  hasMore: boolean;
}

export interface DailyNewDisplayConfig {
  enabled: boolean;
  displayPlacements: string[];
  displayLabel: string;
  displayPath: string;
  displaySort: number;
  displayOpenInNewTab: boolean;
  defaultDays: number;
  pageKicker: string;
  pageTitle: string;
  pageDescription: string;
  updatedAt: number;
}

/**
 * 获取每日上新网址列表
 */
export const getDailyNewWebsites = async (params?: {
  page?: number;
  pageSize?: number;
  days?: number;
  pageSlug?: string;
  sortBy?: 'latest' | 'hot' | 'rank';
}): Promise<DailyNewWebsiteResponse> => {
  const response = await api.get('/websites/daily-new', { params });
  return unwrapApiResponse<DailyNewWebsiteResponse>(response.data, {
    list: [],
    total: 0,
    page: Number(params?.page || 1),
    pageSize: Number(params?.pageSize || 24),
    days: Number(params?.days || 7),
    sortBy: params?.sortBy || 'latest',
    since: '',
    hasMore: false,
  });
};

/**
 * 获取每日上新公开展示配置（首页入口/菜单注入等）
 */
export const getDailyNewDisplayConfig = async (): Promise<DailyNewDisplayConfig> => {
  const fallback: DailyNewDisplayConfig = {
    enabled: true,
    displayPlacements: [ 'nav_quick_entry' ],
    displayLabel: '每日上新',
    displayPath: '/p/hot?tab=daily-new',
    displaySort: 86,
    displayOpenInNewTab: false,
    defaultDays: 7,
    pageKicker: 'Daily Fresh',
    pageTitle: '每日上新网址',
    pageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
    updatedAt: 0,
  };

  try {
    const response = await api.get('/daily-new/config');
    return unwrapApiResponse<DailyNewDisplayConfig>(response.data, fallback);
  } catch (error) {
    console.error('获取每日上新展示配置失败:', error);
    return fallback;
  }
};
