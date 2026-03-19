/**
 * @file useWordPressWidgets.ts
 * @description WordPress 组件配置 Hook - 从 API 获取组件配置
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { unwrapApiList } from '../utils/apiResponse';
import { debugLog } from '../utils/debugHelper';

export interface WordPressWidget {
  id: string;
  name: string;
  pageSlug: string;
  position: string;
  componentType: string;
  title?: string;
  limit: number;
  showMoreLink?: string;
  categoryIds: number[];
  tagIds: number[];
  order: number;
  visible: boolean;
  widgetKey?: string;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  enableSubCategories?: boolean;
  fixedFilterType?: 'category' | 'tag';
  fixedFilterId?: number;
}

interface UseWordPressWidgetsOptions {
  pageSlug?: string;
  position?: string;
  enabled?: boolean;
}

interface UseWordPressWidgetsReturn {
  widgets: WordPressWidget[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getWidgetByPosition: (position: string) => WordPressWidget | undefined;
}

/**
 * 规范化正整数，异常时使用默认值。
 */
const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * 统一解析 ID 列表，兼容数组和逗号字符串。
 */
const normalizeIdList = (value: unknown): number[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  return Array.from(
    new Set(
      source
        .map((item) => Number.parseInt(String(item || ''), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
};

/**
 * 统一规范化 WordPress 组件配置，兼容 meta 与扁平字段两种结构。
 */
const normalizeWidget = (row: Record<string, any>): WordPressWidget => {
  const metaRaw = row?.meta && typeof row.meta === 'object' ? row.meta : {};
  const meta = metaRaw as Record<string, any>;
  const categoryIds = normalizeIdList(meta.categoryIds ?? row.categoryIds);
  const tagIds = normalizeIdList(meta.tagIds ?? row.tagIds);
  return {
    id: String(row?.id ?? ''),
    name: String(row?.widgetName || row?.name || row?.widgetKey || '').trim(),
    pageSlug: String(row?.pageSlug || '').trim(),
    position: String(meta.position || row?.position || 'main').trim() || 'main',
    componentType: String(meta.componentType || row?.componentType || row?.widgetKey || '').trim(),
    title: String(row?.title || meta.title || '').trim(),
    limit: toPositiveInt(meta.limit ?? row?.limit, 8),
    showMoreLink: String(meta.showMoreLink || row?.showMoreLink || '').trim(),
    categoryIds,
    tagIds,
    order: Number.isFinite(Number(row?.order)) ? Number(row.order) : 0,
    visible: row?.visible !== false,
    widgetKey: String(row?.widgetKey || '').trim(),
    settings: meta.settings && typeof meta.settings === 'object' ? meta.settings : {},
    meta,
    enableSubCategories: meta.enableSubCategories === undefined ? undefined : meta.enableSubCategories === true,
    fixedFilterType: String(meta.fixedFilterType || '').trim().toLowerCase() === 'tag' ? 'tag' : 'category',
    fixedFilterId: toPositiveInt(meta.fixedFilterId, 0),
  };
};

/**
 * WordPress 组件配置 Hook
 */
export const useWordPressWidgets = (
  options: UseWordPressWidgetsOptions = {}
): UseWordPressWidgetsReturn => {
  const { pageSlug, enabled = true } = options;
  
  const [widgets, setWidgets] = useState<WordPressWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const params: Record<string, string> = {};
      if (pageSlug) params.pageSlug = pageSlug;
      
      debugLog.dev('[useWordPressWidgets] 请求参数:', { pageSlug, params });
      
      const response = await api.get('/wordpress/widgets/active', { params });
      
      const data = unwrapApiList<Record<string, any>>(response.data)
        .map((item) => normalizeWidget(item));
      
      // 注意：不在这里按 position 筛选，让 getWidgetByPosition 来处理
      // 这样 widgets 数组包含该页面的所有组件
      
      setWidgets(data);
    } catch (err) {
      setError(err as Error);
      debugLog.error('Failed to fetch WordPress widgets:', err);
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  }, [pageSlug, enabled]); // 移除 position 依赖，因为不再在这里筛选

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 根据位置获取组件配置
  const getWidgetByPosition = useCallback((pos: string) => {
    const normalizedPos = String(pos || '').trim().toLowerCase();
    /**
     * 优先按 design-article-grid-container 定位，避免同一位置多个组件导致读取错配。
     */
    const foundByKey = widgets.find(
      (w) => String(w.widgetKey || '').trim() === 'design-article-grid-container',
    );
    if (foundByKey) return foundByKey;

    /**
     * 其次按 position + componentType 定位，兼容旧数据。
     */
    const foundByType = widgets.find((w) => {
      const currentPos = String(w.position || '').trim().toLowerCase();
      const type = String(w.componentType || '').trim().toLowerCase();
      return currentPos === normalizedPos && type === 'designarticlegrid';
    });
    if (foundByType) return foundByType;

    /**
     * 最后退化为仅按 position 匹配。
     */
    let found = widgets.find((w) => String(w.position || '').trim().toLowerCase() === normalizedPos);
    if (!found && widgets.length > 0) found = widgets[0];
    return found;
  }, [widgets]);

  return {
    widgets,
    loading,
    error,
    refetch: fetchData,
    getWidgetByPosition,
  };
};

export default useWordPressWidgets;
