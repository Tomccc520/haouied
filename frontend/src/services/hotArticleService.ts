/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file hotArticleService.ts
 * @description 热门文章页面服务（配置 + WordPress 文章代理）
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';
import { AxiosError } from 'axios';

export interface HotArticleFilterPreset {
  key: string;
  name: string;
  type: 'all' | 'category' | 'tag';
  id: number;
  description?: string;
  enabled: boolean;
  sort: number;
}

export interface HotArticlesDisplayConfig {
  enabled: boolean;
  displayPlacements: string[];
  displayLabel: string;
  displayPath: string;
  displaySort: number;
  displayOpenInNewTab: boolean;
  pageKicker: string;
  pageTitle: string;
  pageDescription: string;
  pageSize: number;
  defaultOrderBy: string;
  defaultOrder: 'asc' | 'desc';
  defaultCategoryId: number;
  defaultTagId: number;
  apiSourceMode: 'auto' | 'uied' | 'uied_hot' | 'uied_latest' | 'wp_v2';
  motionEnabled: boolean;
  heroTagline: string;
  linksNewWindow: boolean;
  filterPresets: HotArticleFilterPreset[];
  workbenchMenuItems: HotWorkbenchMenuItem[];
}

export interface HotArticleItem {
  id: string;
  name: string;
  description: string;
  link: string;
  thumbnail?: string;
  date?: string;
  authorName?: string;
  isNew?: boolean;
}

export interface HotArticleListParams {
  source?: 'auto' | 'uied' | 'uied_hot' | 'uied_latest' | 'wp_v2';
  period?: 'all' | 'daily' | 'weekly' | 'monthly';
  page?: number;
  perPage?: number;
  categoryId?: number;
  tagId?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface HotWorkbenchMenuItem {
  key: string;
  label: string;
  mode: 'latest' | 'hot' | 'preset' | 'authorHot' | 'circle' | 'external';
  iconKey: 'latest' | 'hot' | 'ai' | 'product' | 'design' | 'resource' | 'author' | 'circle' | 'extra' | 'home';
  source: 'auto' | 'uied' | 'uied_hot' | 'uied_latest' | 'wp_v2';
  presetKey?: string;
  fallbackType?: 'category' | 'tag';
  fallbackId?: number;
  categoryId?: number;
  tagId?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  period?: 'all' | 'daily' | 'weekly' | 'monthly';
  externalUrl?: string;
  subtitle?: string;
  enabled: boolean;
  sort: number;
}

interface MemoryCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const HOT_ARTICLE_CONFIG_CACHE_TTL_MS = 60 * 1000;
const HOT_ARTICLE_LIST_CACHE_TTL_MS = 90 * 1000;

const hotArticleListCache = new Map<string, MemoryCacheEntry<HotArticleItem[]>>();
const hotArticleListPending = new Map<string, Promise<HotArticleItem[]>>();
let hotArticleConfigCache: MemoryCacheEntry<HotArticlesDisplayConfig> | null = null;
let hotArticleConfigPending: Promise<HotArticlesDisplayConfig> | null = null;

/**
 * 统一菜单图标键，兼容 hot 旧项目图标名称。
 */
const normalizeMenuIconKey = (value: unknown): HotWorkbenchMenuItem['iconKey'] => {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();
  const allowSet = new Set([ 'latest', 'hot', 'ai', 'product', 'design', 'resource', 'author', 'circle', 'extra', 'home' ]);
  if (allowSet.has(text)) return text as HotWorkbenchMenuItem['iconKey'];
  if (allowSet.has(lower)) return lower as HotWorkbenchMenuItem['iconKey'];
  const aliasMap: Record<string, HotWorkbenchMenuItem['iconKey']> = {
    file: 'latest',
    'file-text': 'latest',
    filetext: 'latest',
    filetextoutlined: 'latest',
    star: 'hot',
    staroutlined: 'hot',
    robot: 'ai',
    robotoutlined: 'ai',
    trophy: 'product',
    trophyoutlined: 'product',
    desktop: 'design',
    desktopoutlined: 'design',
    appstore: 'resource',
    appstoreoutlined: 'resource',
    crown: 'author',
    crownoutlined: 'author',
    read: 'circle',
    readoutlined: 'circle',
    book: 'circle',
    home: 'home',
    homeoutlined: 'home',
  };
  return aliasMap[lower] || 'extra';
};

const DEFAULT_HOT_ARTICLE_CONFIG: HotArticlesDisplayConfig = {
  enabled: true,
  displayPlacements: [ 'nav_quick_entry', 'home_menu' ],
  displayLabel: '热门文章',
  displayPath: '/p/hot',
  displaySort: 84,
  displayOpenInNewTab: false,
  pageKicker: 'HOT ARTICLES',
  pageTitle: '热门文章',
  pageDescription: '同步 uied.cn 的优质文章内容，快速发现值得阅读的设计与产品洞察。',
  pageSize: 24,
  defaultOrderBy: 'date',
  defaultOrder: 'desc',
  defaultCategoryId: 417,
  defaultTagId: 0,
  apiSourceMode: 'auto',
  motionEnabled: true,
  heroTagline: '聚合国内外AI精选内容，探索AI技术前沿与应用',
  linksNewWindow: true,
  filterPresets: [
    { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
    { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
    { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
    { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
    { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
  ],
  workbenchMenuItems: [
    { key: 'latest-articles', label: '最新文章', mode: 'latest', iconKey: 'latest', source: 'uied_latest', orderBy: 'date', order: 'desc', period: 'all', categoryId: 0, tagId: 0, enabled: true, sort: 10 },
    { key: 'hot-articles', label: '热门文章', mode: 'hot', iconKey: 'hot', source: 'uied_hot', orderBy: 'views', order: 'desc', period: 'all', categoryId: 417, tagId: 0, enabled: true, sort: 20 },
    { key: 'ai-realtime', label: 'AI实时文章', mode: 'preset', iconKey: 'ai', source: 'uied_latest', presetKey: 'aigc', fallbackType: 'category', fallbackId: 417, enabled: true, sort: 30 },
    { key: 'ai-products', label: 'AI产品榜单', mode: 'preset', iconKey: 'product', source: 'uied_latest', presetKey: 'ai-tools', fallbackType: 'category', fallbackId: 3351, enabled: true, sort: 40 },
    { key: 'design-articles', label: '设计文章', mode: 'preset', iconKey: 'design', source: 'uied_latest', presetKey: 'design', fallbackType: 'category', fallbackId: 307, enabled: true, sort: 50 },
    { key: 'design-resources', label: '设计素材', mode: 'preset', iconKey: 'resource', source: 'uied_latest', presetKey: 'productivity', fallbackType: 'category', fallbackId: 338, enabled: true, sort: 60 },
    { key: 'top-authors', label: '优秀作者', mode: 'authorHot', iconKey: 'author', source: 'uied_hot', orderBy: 'comment_count', order: 'desc', period: 'weekly', categoryId: 0, tagId: 0, enabled: true, sort: 70 },
    { key: 'study-circles', label: '学习圈子', mode: 'circle', iconKey: 'circle', source: 'uied_latest', orderBy: 'date', order: 'desc', period: 'all', categoryId: 0, tagId: 393, enabled: true, sort: 80 },
    { key: 'back-main-site', label: '返回主站', mode: 'external', iconKey: 'home', source: 'auto', externalUrl: 'https://www.uied.cn', enabled: true, sort: 999 },
  ],
};

/**
 * 判断是否为 404 错误，便于兼容 /api 前缀差异。
 */
const is404Error = (error: unknown): boolean => {
  return error instanceof AxiosError && error.response?.status === 404;
};

/**
 * 兼容部分代理环境中有无 /api 前缀的路径差异。
 */
const requestWithCompatiblePath = async <T>(
  apiPath: string,
  params?: Record<string, unknown>,
): Promise<T> => {
  try {
    const response = await api.get<T>(apiPath, { params });
    return response.data;
  } catch (error) {
    if (!is404Error(error)) throw error;
    const legacyPath = apiPath.startsWith('/api/') ? apiPath.replace(/^\/api/, '') : `/api${apiPath}`;
    const response = await api.get<T>(legacyPath, { params });
    return response.data;
  }
};

/**
 * 规范化热门文章配置字段，确保页面读取结构稳定。
 */
const normalizeHotArticlesConfig = (payload: unknown): HotArticlesDisplayConfig => {
  const config = unwrapApiResponse<Partial<HotArticlesDisplayConfig>>(payload, {});
  const placements = Array.isArray(config?.displayPlacements)
    ? config.displayPlacements.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const filterPresets: HotArticleFilterPreset[] = Array.isArray(config?.filterPresets)
    ? config.filterPresets
        .map((item, index): HotArticleFilterPreset => {
          const presetType: HotArticleFilterPreset['type'] =
            item?.type === 'all' || item?.type === 'tag' ? item.type : 'category';
          return {
          key: String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `preset_${index + 1}`,
          name: String(item?.name || item?.key || '').trim() || `筛选 ${index + 1}`,
          type: presetType,
          id: Number.isFinite(Number(item?.id)) ? Number(item?.id) : 0,
          description: String(item?.description || '').trim(),
          enabled: item?.enabled !== false,
          sort: Number.isFinite(Number(item?.sort)) ? Number(item?.sort) : (index + 1) * 10,
        };
        })
        .filter((item) => Boolean(item.key))
        .sort((a, b) => a.sort - b.sort)
    : [];
  const allowSourceSet = new Set([ 'auto', 'uied', 'uied_hot', 'uied_latest', 'wp_v2' ]);
  const allowMenuModeSet = new Set([ 'latest', 'hot', 'preset', 'authorHot', 'circle', 'external' ]);
  const allowFallbackTypeSet = new Set([ 'category', 'tag' ]);
  const allowPeriodSet = new Set([ 'all', 'daily', 'weekly', 'monthly' ]);
  const workbenchMenuItems: HotWorkbenchMenuItem[] = Array.isArray(config?.workbenchMenuItems)
    ? config.workbenchMenuItems
        .map((item, index): HotWorkbenchMenuItem | null => {
          const key = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `menu_${index + 1}`;
          const modeText = String(item?.mode || '').trim();
          const sourceText = String(item?.source || '').trim().toLowerCase();
          const orderByText = String(item?.orderBy || '').trim().toLowerCase();
          const periodText = String(item?.period || '').trim().toLowerCase();
          const fallbackTypeText = String(item?.fallbackType || '').trim().toLowerCase();
          const categoryId = Number.parseInt(String(item?.categoryId || 0), 10);
          const tagId = Number.parseInt(String(item?.tagId || 0), 10);
          const fallbackId = Number.parseInt(String(item?.fallbackId || 0), 10);
          if (!key) return null;
          return {
            key,
            label: String(item?.label || key).trim() || key,
            mode: allowMenuModeSet.has(modeText) ? (modeText as HotWorkbenchMenuItem['mode']) : 'latest',
            iconKey: normalizeMenuIconKey(item?.iconKey),
            source: allowSourceSet.has(sourceText) ? (sourceText as HotWorkbenchMenuItem['source']) : 'auto',
            presetKey: String(item?.presetKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
            fallbackType: allowFallbackTypeSet.has(fallbackTypeText) ? (fallbackTypeText as 'category' | 'tag') : 'category',
            fallbackId: Number.isInteger(fallbackId) && fallbackId > 0 ? fallbackId : 0,
            categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : 0,
            tagId: Number.isInteger(tagId) && tagId > 0 ? tagId : 0,
            orderBy: orderByText || 'date',
            order: String(item?.order || '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
            period: allowPeriodSet.has(periodText) ? (periodText as HotWorkbenchMenuItem['period']) : 'all',
            externalUrl: String(item?.externalUrl || '').trim(),
            subtitle: String(item?.subtitle || '').trim(),
            enabled: item?.enabled !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item?.sort) : (index + 1) * 10,
          };
        })
        .filter((item): item is HotWorkbenchMenuItem => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
    : [];
  return {
    ...DEFAULT_HOT_ARTICLE_CONFIG,
    ...config,
    displayPlacements: placements.length > 0 ? Array.from(new Set(placements)) : DEFAULT_HOT_ARTICLE_CONFIG.displayPlacements,
    displayLabel: String(config?.displayLabel || DEFAULT_HOT_ARTICLE_CONFIG.displayLabel).trim() || DEFAULT_HOT_ARTICLE_CONFIG.displayLabel,
    displayPath: (() => {
      const path = String(config?.displayPath || '').trim();
      if (!path) return DEFAULT_HOT_ARTICLE_CONFIG.displayPath;
      if (/^(https?:)?\/\//i.test(path)) return path;
      return path.startsWith('/') ? path : `/${path}`;
    })(),
    displaySort: Number.isFinite(Number(config?.displaySort))
      ? Math.max(1, Math.min(9999, Number(config?.displaySort)))
      : DEFAULT_HOT_ARTICLE_CONFIG.displaySort,
    displayOpenInNewTab: config?.displayOpenInNewTab === true,
    pageKicker: String(config?.pageKicker || DEFAULT_HOT_ARTICLE_CONFIG.pageKicker).trim() || DEFAULT_HOT_ARTICLE_CONFIG.pageKicker,
    pageTitle: String(config?.pageTitle || DEFAULT_HOT_ARTICLE_CONFIG.pageTitle).trim() || DEFAULT_HOT_ARTICLE_CONFIG.pageTitle,
    pageDescription: String(config?.pageDescription || DEFAULT_HOT_ARTICLE_CONFIG.pageDescription).trim() || DEFAULT_HOT_ARTICLE_CONFIG.pageDescription,
    pageSize: Number.isFinite(Number(config?.pageSize))
      ? Math.max(1, Math.min(100, Number(config?.pageSize)))
      : DEFAULT_HOT_ARTICLE_CONFIG.pageSize,
    defaultOrderBy: String(config?.defaultOrderBy || DEFAULT_HOT_ARTICLE_CONFIG.defaultOrderBy).trim().toLowerCase() || DEFAULT_HOT_ARTICLE_CONFIG.defaultOrderBy,
    defaultOrder: String(config?.defaultOrder || DEFAULT_HOT_ARTICLE_CONFIG.defaultOrder).trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
    defaultCategoryId: Number.isFinite(Number(config?.defaultCategoryId)) ? Number(config?.defaultCategoryId) : DEFAULT_HOT_ARTICLE_CONFIG.defaultCategoryId,
    defaultTagId: Number.isFinite(Number(config?.defaultTagId)) ? Number(config?.defaultTagId) : DEFAULT_HOT_ARTICLE_CONFIG.defaultTagId,
    apiSourceMode: allowSourceSet.has(String(config?.apiSourceMode || '').trim().toLowerCase())
      ? (String(config?.apiSourceMode || '').trim().toLowerCase() as HotArticlesDisplayConfig['apiSourceMode'])
      : DEFAULT_HOT_ARTICLE_CONFIG.apiSourceMode,
    motionEnabled: config?.motionEnabled !== false,
    heroTagline: String(config?.heroTagline || DEFAULT_HOT_ARTICLE_CONFIG.heroTagline).trim() || DEFAULT_HOT_ARTICLE_CONFIG.heroTagline,
    linksNewWindow: config?.linksNewWindow !== false,
    filterPresets: filterPresets.length > 0 ? filterPresets : DEFAULT_HOT_ARTICLE_CONFIG.filterPresets,
    workbenchMenuItems: workbenchMenuItems.length > 0 ? workbenchMenuItems : DEFAULT_HOT_ARTICLE_CONFIG.workbenchMenuItems,
  };
};

/**
 * 规范化文章列表字段，屏蔽后端字段差异。
 */
const normalizeHotArticleItems = (payload: unknown): HotArticleItem[] => {
  const unwrapped = unwrapApiResponse<any>(payload, []);
  const rows = Array.isArray(unwrapped)
    ? unwrapped
    : (Array.isArray(unwrapped?.items) ? unwrapped.items : []);
  if (!Array.isArray(rows)) return [];
  return rows.map((item) => ({
    id: String(item?.id || ''),
    name: String(item?.name || ''),
    description: String(item?.description || ''),
    link: String(item?.link || ''),
    thumbnail: String(item?.thumbnail || ''),
    date: String(item?.date || ''),
    authorName: String(item?.authorName || ''),
    isNew: Boolean(item?.isNew),
  }));
};

/**
 * 生成热门文章列表缓存键。
 */
const buildListCacheKey = (params?: HotArticleListParams): string => {
  if (!params) return 'default';
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return 'default';
  return entries.map(([key, value]) => `${key}:${String(value)}`).join('|');
};

/**
 * 获取热门文章公开配置。
 */
export const getHotArticlesDisplayConfig = async (refresh = false): Promise<HotArticlesDisplayConfig> => {
  if (!refresh && hotArticleConfigCache && hotArticleConfigCache.expiresAt > Date.now()) {
    return hotArticleConfigCache.data;
  }
  if (!refresh && hotArticleConfigPending) {
    return hotArticleConfigPending;
  }
  const requestPromise = (async () => {
    try {
      const payload = await requestWithCompatiblePath<unknown>('/hot-articles/config');
      const normalized = normalizeHotArticlesConfig(payload);
      hotArticleConfigCache = {
        data: normalized,
        expiresAt: Date.now() + HOT_ARTICLE_CONFIG_CACHE_TTL_MS,
      };
      return normalized;
    } catch (error) {
      console.error('获取热门文章展示配置失败:', error);
      return { ...DEFAULT_HOT_ARTICLE_CONFIG };
    } finally {
      hotArticleConfigPending = null;
    }
  })();
  if (!refresh) {
    hotArticleConfigPending = requestPromise;
  }
  return requestPromise;
};

/**
 * 获取热门文章列表（WordPress 代理）。
 * @param refresh 是否跳过内存缓存，强制请求最新数据
 */
export const getHotArticles = async (params?: HotArticleListParams, refresh = false): Promise<HotArticleItem[]> => {
  const cacheKey = buildListCacheKey(params);
  if (!refresh) {
    const cached = hotArticleListCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const pending = hotArticleListPending.get(cacheKey);
    if (pending) {
      return pending;
    }
  } else {
    hotArticleListCache.delete(cacheKey);
    hotArticleListPending.delete(cacheKey);
  }
  const requestPromise = (async () => {
    try {
      const payload = await requestWithCompatiblePath<unknown>(
        '/wordpress/posts',
        params ? (params as unknown as Record<string, unknown>) : undefined,
      );
      const normalized = normalizeHotArticleItems(payload);
      hotArticleListCache.set(cacheKey, {
        data: normalized,
        expiresAt: Date.now() + HOT_ARTICLE_LIST_CACHE_TTL_MS,
      });
      return normalized;
    } catch (error) {
      console.error('获取热门文章列表失败:', error);
      throw error;
    } finally {
      hotArticleListPending.delete(cacheKey);
    }
  })();
  hotArticleListPending.set(cacheKey, requestPromise);
  return requestPromise;
};
