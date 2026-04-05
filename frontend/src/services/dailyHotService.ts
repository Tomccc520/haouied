/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-25
 */
/**
 * @file dailyHotService.ts
 * @description 每日热榜服务
 * @copyright 版权所有 (c) 2025 UIED技术团队
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';
import { DailyHotItem, DailyHotPlatform, DailyHotParams, DailyHotDisplayConfig } from '../types/dailyHot';
import { AxiosError } from 'axios';
import { getFullImageUrl } from '../utils/urlUtils';

interface DailyHotBackendPlatformRow {
  title?: string;
  platformTitle?: string;
  displayName?: string;
  isEnabled?: boolean;
  sort?: number;
  icon?: string;
  iconUrl?: string;
  url?: string;
  link?: string;
  siteUrl?: string;
  extra?: {
    icon?: string;
    url?: string;
    link?: string;
  };
}

interface DailyHotBackendItemRow {
  title?: string;
  url?: string;
  mobileUrl?: string;
  hot?: string | number;
  desc?: string;
  cover?: string;
  timestamp?: string | number;
  time?: string | number;
  pubTime?: string | number;
  publishTime?: string | number;
  createdAt?: string | number;
  createTime?: string | number;
  updateTime?: string | number;
  date?: string | number;
}

interface DailyHotBackendPlatformResultRow {
  platform?: string;
  title?: string;
  displayName?: string;
  items?: DailyHotBackendItemRow[];
}

interface DailyHotBackendAggregateResponse {
  platforms?: DailyHotBackendPlatformResultRow[];
}

interface MemoryCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DAILY_HOT_AGGREGATE_CACHE_TTL_MS = 90 * 1000;
const DAILY_HOT_PLATFORMS_CACHE_TTL_MS = 90 * 1000;
const DAILY_HOT_DISPLAY_CONFIG_CACHE_TTL_MS = 60 * 1000;

const dailyHotAggregateCache = new Map<string, MemoryCacheEntry<Record<string, DailyHotItem[]>>>();
const dailyHotAggregatePendingMap = new Map<string, Promise<Record<string, DailyHotItem[]>>>();
let dailyHotPlatformsCache: MemoryCacheEntry<DailyHotPlatform[]> | null = null;
let dailyHotPlatformsPending: Promise<DailyHotPlatform[]> | null = null;
let dailyHotDisplayConfigCache: MemoryCacheEntry<DailyHotDisplayConfig> | null = null;
let dailyHotDisplayConfigPending: Promise<DailyHotDisplayConfig> | null = null;

/**
 * 判断缓存项是否仍在有效期内
 * @param entry 缓存项
 * @returns 是否有效
 */
const isCacheAlive = <T>(entry: MemoryCacheEntry<T> | null): entry is MemoryCacheEntry<T> => {
  return Boolean(entry && entry.expiresAt > Date.now());
};

/**
 * 序列化热榜请求参数，生成稳定缓存键
 * @param params 请求参数
 * @returns 缓存键
 */
const buildDailyHotCacheKey = (params?: DailyHotParams): string => {
  if (!params) return 'default';
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  if (!entries.length) return 'default';
  return entries.map(([key, value]) => `${key}:${String(value)}`).join('|');
};

/**
 * 把 Date 对象格式化为热榜展示时间（MM/DD HH:mm）
 * @param date 日期对象
 * @returns 格式化时间文本
 */
const formatDailyHotTimestamp = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

/**
 * 判断毫秒时间戳是否在合理范围（2000-2100）
 * @param timestampMs 毫秒时间戳
 * @returns 是否合理
 */
const isReasonableTimestampMs = (timestampMs: number): boolean => {
  const min = Date.UTC(2000, 0, 1, 0, 0, 0, 0);
  const max = Date.UTC(2100, 11, 31, 23, 59, 59, 999);
  return Number.isFinite(timestampMs) && timestampMs >= min && timestampMs <= max;
};

/**
 * 将热榜时间字段规范化为可读时间（兼容秒/毫秒/微秒时间戳与日期字符串）
 * @param value 原始时间值
 * @returns 规范化后时间文本
 */
const normalizeDailyHotTimestamp = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const lowerRaw = raw.toLowerCase();
  if ([ '0', '-', '--', 'null', 'undefined', 'nan' ].includes(lowerRaw)) {
    return '';
  }

  // 已经是“刚刚/xx分钟前/xx小时前”等相对时间，直接透传。
  if (/(刚刚|刚才|分钟前|小时前|天前|昨天|前天)/.test(raw)) {
    return raw;
  }

  // 纯数字时间戳：兼容秒(10位)/毫秒(13位)/微秒(16位)。
  if (/^\d{10,16}$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    let timestampMs = numeric;
    if (raw.length === 10) {
      timestampMs = numeric * 1000;
    } else if (raw.length === 16) {
      timestampMs = Math.floor(numeric / 1000);
    }
    if (!isReasonableTimestampMs(timestampMs)) return '';
    const date = new Date(timestampMs);
    if (Number.isNaN(date.getTime())) return '';
    return formatDailyHotTimestamp(date);
  }

  // yyyyMMdd（8位）日期数字兜底。
  if (/^\d{8}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      if (!Number.isNaN(date.getTime())) {
        return formatDailyHotTimestamp(date);
      }
    }
  }

  // 含明显日期时间特征的字符串尝试解析成本地时间。
  const hasDateLikeText = /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}|\d{1,2}:\d{2}|t\d{2}:\d{2}|z$|gmt|utc)/i.test(raw);
  if (hasDateLikeText) {
    const normalizedRaw = raw
      .replace(/[年/.]/g, '-')
      .replace(/月/g, '-')
      .replace(/日/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const parsedMs = Date.parse(normalizedRaw);
    if (Number.isFinite(parsedMs) && isReasonableTimestampMs(parsedMs)) {
      return formatDailyHotTimestamp(new Date(parsedMs));
    }
  }

  // 含中文时间单位（如“03月05日 10:20”）直接展示，避免误解析。
  if (/[年月日时分秒周]/.test(raw)) {
    return raw;
  }

  return '';
};

/**
 * 解析热榜条目的时间字段，兼容不同数据源的命名差异。
 * @param item 原始条目
 * @returns 可展示时间文本
 */
const resolveDailyHotItemTimestamp = (item: DailyHotBackendItemRow): string => {
  const candidateValues: unknown[] = [
    item?.timestamp,
    item?.time,
    item?.pubTime,
    item?.publishTime,
    item?.createdAt,
    item?.createTime,
    item?.updateTime,
    item?.date,
  ];
  for (const candidate of candidateValues) {
    const normalized = normalizeDailyHotTimestamp(candidate);
    if (normalized) return normalized;
  }
  return '';
};

/**
 * 判断是否为 404 错误（用于前后端版本短暂不一致时兜底重试）
 */
const is404Error = (error: unknown): boolean => {
  return error instanceof AxiosError && error.response?.status === 404;
};

/**
 * 获取接口并在 404 时尝试兼容路径（/api 前缀与非 /api 前缀）
 */
const requestWithCompatiblePath = async <T>(
  apiPath: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<T> => {
  try {
    const response = await api.get<T>(apiPath, { params, timeout: timeoutMs });
    return response.data;
  } catch (error) {
    if (!is404Error(error)) throw error;

    // 兼容某些环境下 API baseURL 被改成后端根路径或历史代理规则
    const legacyPath = apiPath.startsWith('/api/') ? apiPath.replace(/^\/api/, '') : `/api${apiPath}`;
    const response = await api.get<T>(legacyPath, { params, timeout: timeoutMs });
    return response.data;
  }
};

/**
 * 将后端单条热榜项统一映射为前端使用结构
 */
const mapDailyHotItem = (item: DailyHotBackendItemRow): DailyHotItem => {
  return {
    title: String(item?.title || ''),
    url: String(item?.mobileUrl || item?.url || ''),
    hotValue: item?.hot ?? '',
    desc: String(item?.desc || ''),
    cover: String(item?.cover || ''),
    timestamp: resolveDailyHotItemTimestamp(item),
  };
};

/**
 * 将后端聚合响应转换为旧版组件兼容的 Record<平台标题, 列表>
 */
const normalizeDailyHotListResponse = (payload: unknown): Record<string, DailyHotItem[]> => {
  const unwrapped = unwrapApiResponse<DailyHotBackendAggregateResponse>(payload, {});

  // 兼容旧版后端已直接返回 Record<string, DailyHotItem[]>
  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped) && !Array.isArray(unwrapped.platforms)) {
    const maybeRecord = unwrapped as Record<string, unknown>;
    const keys = Object.keys(maybeRecord);
    const isRecordShape = keys.length > 0 && maybeRecord[keys[0]] instanceof Array;
    if (isRecordShape) {
      return maybeRecord as Record<string, DailyHotItem[]>;
    }
  }

  const rows = Array.isArray(unwrapped?.platforms) ? unwrapped.platforms : [];
  return rows.reduce<Record<string, DailyHotItem[]>>((accumulator, row) => {
    const list = Array.isArray(row?.items) ? row.items.map(mapDailyHotItem) : [];
    /**
     * 同时挂载 displayName/title/platform 三种键，避免前端 tab 使用 platformTitle 时取不到数据
     */
    const keys = Array.from(new Set([
      String(row?.displayName || '').trim(),
      String(row?.title || '').trim(),
      String(row?.platform || '').trim(),
    ].filter(Boolean)));
    if (keys.length === 0) return accumulator;
    keys.forEach((key) => {
      accumulator[key] = list;
    });
    return accumulator;
  }, {});
};

/**
 * 将后端平台列表响应标准化为组件使用的字段结构
 */
const normalizeDailyHotPlatformsResponse = (payload: unknown): DailyHotPlatform[] => {
  const unwrapped = unwrapApiResponse<{ platforms?: DailyHotBackendPlatformRow[] }>(payload, {});
  const rows = Array.isArray(unwrapped?.platforms) ? unwrapped.platforms : [];
  return rows.map((row) => {
    const platformTitle = String(row?.platformTitle || row?.title || '').trim();
    const icon = String(row?.icon || row?.iconUrl || row?.extra?.icon || '').trim();
    const link = String(row?.url || row?.link || row?.siteUrl || row?.extra?.url || row?.extra?.link || '').trim();
    return {
      platformTitle,
      displayName: String(row?.displayName || platformTitle),
      icon: icon ? getFullImageUrl(icon) : undefined,
      url: link || undefined,
      isEnabled: row?.isEnabled !== false,
      sort: typeof row?.sort === 'number' ? row.sort : Number(row?.sort || 0),
    };
  }).filter((item) => Boolean(item.platformTitle));
};

/**
 * 获取每日热榜聚合数据
 * @param params 查询参数
 */
export const getDailyHot = async (params?: DailyHotParams): Promise<Record<string, DailyHotItem[]>> => {
  const forceRefresh = Number(params?.refresh || 0) === 1;
  const cacheKey = buildDailyHotCacheKey(params);
  if (!forceRefresh) {
    const cached = dailyHotAggregateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const pending = dailyHotAggregatePendingMap.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const requestPromise = (async () => {
    try {
      const payload = await requestWithCompatiblePath<unknown>(
        '/daily-hot',
        params ? (params as unknown as Record<string, unknown>) : undefined
      );
      const normalized = normalizeDailyHotListResponse(payload);
      dailyHotAggregateCache.set(cacheKey, {
        data: normalized,
        expiresAt: Date.now() + DAILY_HOT_AGGREGATE_CACHE_TTL_MS,
      });
      return normalized;
    } catch (error) {
      console.error('获取每日热榜数据失败:', error);
      throw error;
    } finally {
      dailyHotAggregatePendingMap.delete(cacheKey);
    }
  })();

  if (!forceRefresh) {
    dailyHotAggregatePendingMap.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } catch (error) {
    throw error;
  }
};

/**
 * 获取热榜平台列表
 * @param refresh 是否强制刷新缓存
 */
export const getDailyHotPlatforms = async (refresh?: boolean): Promise<DailyHotPlatform[]> => {
  const forceRefresh = refresh === true;
  if (!forceRefresh && isCacheAlive(dailyHotPlatformsCache)) {
    return dailyHotPlatformsCache.data;
  }
  if (!forceRefresh && dailyHotPlatformsPending) {
    return dailyHotPlatformsPending;
  }

  const requestPromise = (async () => {
    try {
      const payload = await requestWithCompatiblePath<unknown>(
        '/daily-hot/platforms',
        { refresh: forceRefresh ? 1 : undefined }
      );
      const normalized = normalizeDailyHotPlatformsResponse(payload);
      dailyHotPlatformsCache = {
        data: normalized,
        expiresAt: Date.now() + DAILY_HOT_PLATFORMS_CACHE_TTL_MS,
      };
      return normalized;
    } catch (error) {
      console.error('获取热榜平台列表失败:', error);
      throw error;
    } finally {
      dailyHotPlatformsPending = null;
    }
  })();

  if (!forceRefresh) {
    dailyHotPlatformsPending = requestPromise;
  }

  try {
    return await requestPromise;
  } catch (error) {
    throw error;
  }
};

/**
 * 获取每日热榜公开展示配置（首页入口/导航快捷入口等）
 */
export const getDailyHotDisplayConfig = async (refresh = false): Promise<DailyHotDisplayConfig> => {
  const fallback: DailyHotDisplayConfig = {
    enabled: true,
    defaultPlatforms: [ '哔哩哔哩', '知乎', '微博' ],
    defaultLimit: 10,
    maxPlatforms: 12,
    displayPlacements: [],
    displayLabel: '每日热榜',
    displayPath: '/p/hot?tab=daily-hot',
    displaySort: 90,
    displayDesktop: true,
    displayMobile: true,
    displayOpenInNewTab: false,
    componentSubtitle: '聚合全平台热点，实时更新',
    pageEyebrow: '全网热点速览',
    pageDescription: '保持卡片式阅读体验，按平台快速切换热点内容；支持后台配置默认平台与排序，适配运营入口分发。',
    loadingText: '热榜加载中...',
    emptyText: '暂无数据',
    errorText: '热榜数据加载失败，请稍后重试',
    retryText: '重新加载',
    refreshText: '刷新热榜',
    refreshingText: '刷新中...',
    platformLinkText: '访问平台',
    updatedAt: 0,
  };

  if (!refresh && isCacheAlive(dailyHotDisplayConfigCache)) {
    return dailyHotDisplayConfigCache.data;
  }
  if (!refresh && dailyHotDisplayConfigPending) {
    return dailyHotDisplayConfigPending;
  }

  const requestPromise = (async () => {
    try {
      const payload = await requestWithCompatiblePath<unknown>('/daily-hot/config');
      const normalized = unwrapApiResponse<DailyHotDisplayConfig>(payload, fallback);
      dailyHotDisplayConfigCache = {
        data: normalized,
        expiresAt: Date.now() + DAILY_HOT_DISPLAY_CONFIG_CACHE_TTL_MS,
      };
      return normalized;
    } catch (error) {
      console.error('获取每日热榜展示配置失败:', error);
      return fallback;
    } finally {
      dailyHotDisplayConfigPending = null;
    }
  })();

  if (!refresh) {
    dailyHotDisplayConfigPending = requestPromise;
  }

  try {
    return await requestPromise;
  } catch (error) {
    return fallback;
  }
};
