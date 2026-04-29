/**
 * @file usePageData.ts
 * @description 前端用户界面组件
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { pageService, PageFullData, Website, Category, SubCategory } from '../services/pageService';
import { debugLog } from '../utils/debugHelper';

interface UsePageDataOptions {
  slug: string;
  enabled?: boolean;
}

interface UsePageDataReturn {
  // 数据
  pageConfig: PageFullData['page'] | null;
  categories: Category[];
  websitesByCategory: Record<string, Website[]>;
  stats: PageFullData['stats'] | null;
  dynamicHotTags: string[];
  
  // 状态
  loading: boolean;
  error: Error | null;
  
  // 方法
  getWebsitesByCategory: (categoryId: string) => Website[];
  getWebsitesBySubCategory: (subCategoryId: string) => Website[];
  getSubCategories: (categoryId: string) => SubCategory[];
  getHotWebsites: () => Website[];
  getFeaturedWebsites: () => Website[];
  searchWebsites: (keyword: string) => Website[];
  getAllWebsites: () => Website[];
  refetch: () => Promise<void>;
}

/**
 * 按后台运营权重对网站列表排序，保证前端聚合分类时不打散置顶/排序规则。
 */
const compareWebsitesByOperationalOrder = (left: Website, right: Website): number => {
  if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
  if (left.isHot !== right.isHot) return left.isHot ? -1 : 1;
  if (left.isFeatured !== right.isFeatured) return left.isFeatured ? -1 : 1;
  const sortDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  if (sortDiff !== 0) return sortDiff;
  return Number(right.id || 0) - Number(left.id || 0);
};

/**
 * 页面数据 Hook - 从 API 获取页面配置、分类和网站数据
 */
export const usePageData = ({ slug, enabled = true }: UsePageDataOptions): UsePageDataReturn => {
  const [data, setData] = useState<PageFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dynamicHotTags, setDynamicHotTags] = useState<string[]>([]);
  const requestSeqRef = useRef(0);
  const hotTagsSeqRef = useRef(0);

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!enabled || !slug) {
      setData(null);
      setLoading(false);
      return;
    }

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const result = await pageService.getFullData(slug);
      if (requestSeq !== requestSeqRef.current) return;
      setData(result);
    } catch (err) {
      if (requestSeq !== requestSeqRef.current) return;
      setError(err as Error);
      debugLog.error(`Failed to fetch page data for ${slug}:`, err);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [slug, enabled]);

  // 获取动态热门标签（按点击量排序）
  const fetchHotTags = useCallback(async () => {
    if (!enabled || !slug) {
      setDynamicHotTags([]);
      return;
    }
    const requestSeq = hotTagsSeqRef.current + 1;
    hotTagsSeqRef.current = requestSeq;
    
    try {
      const response = await pageService.getHotTags(slug, 10);
      if (requestSeq !== hotTagsSeqRef.current) return;
      setDynamicHotTags(response.tags || []);
    } catch (err) {
      if (requestSeq !== hotTagsSeqRef.current) return;
      debugLog.error(`Failed to fetch hot tags for ${slug}:`, err);
      // 失败时不影响其他功能
    }
  }, [slug, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchHotTags();
  }, [fetchHotTags]);

  // 所有网站的扁平列表
  const allWebsites = useMemo(() => {
    if (!data?.websitesByCategory) return [];
    return Object.values(data.websitesByCategory).flat();
  }, [data?.websitesByCategory]);

  // 根据主分类获取网站
  const getWebsitesByCategory = useCallback((categoryId: string): Website[] => {
    if (!data?.websitesByCategory || !data?.categories) return [];
    
    // 找到该分类
    const category = data.categories.find(c => c.id === categoryId);
    if (!category) return [];
    
    // 获取该分类及其子分类的所有网站
    const websiteMap = new Map<string, Website>();
    
    // 主分类的网站
    if (data.websitesByCategory[categoryId]) {
      data.websitesByCategory[categoryId].forEach((website) => {
        if (website?.id) websiteMap.set(website.id, website);
      });
    }
    
    // 子分类的网站
    for (const subCat of category.subCategories) {
      if (data.websitesByCategory[subCat.id]) {
        data.websitesByCategory[subCat.id].forEach((website) => {
          if (website?.id) websiteMap.set(website.id, website);
        });
      }
    }
    
    return Array.from(websiteMap.values()).sort(compareWebsitesByOperationalOrder);
  }, [data]);

  // 根据子分类获取网站
  const getWebsitesBySubCategory = useCallback((subCategoryId: string): Website[] => {
    if (!data?.websitesByCategory) return [];
    return data.websitesByCategory[subCategoryId] || [];
  }, [data?.websitesByCategory]);

  // 获取分类的子分类
  const getSubCategories = useCallback((categoryId: string): SubCategory[] => {
    if (!data?.categories) return [];
    const category = data.categories.find(c => c.id === categoryId);
    return category?.subCategories || [];
  }, [data?.categories]);

  // 获取热门网站
  const getHotWebsites = useCallback((): Website[] => {
    return allWebsites.filter(w => w.isHot);
  }, [allWebsites]);

  // 获取推荐网站
  const getFeaturedWebsites = useCallback((): Website[] => {
    return allWebsites.filter(w => w.isFeatured);
  }, [allWebsites]);

  // 搜索网站
  const searchWebsites = useCallback((keyword: string): Website[] => {
    if (!keyword) return [];
    const lowerKeyword = keyword.toLowerCase();
    return allWebsites.filter(w => {
      const name = String(w.name || '');
      const description = String(w.description || '');
      const tags = Array.isArray(w.tags) ? w.tags : [];
      return (
        name.toLowerCase().includes(lowerKeyword) ||
        description.toLowerCase().includes(lowerKeyword) ||
        tags.some(tag => String(tag || '').toLowerCase().includes(lowerKeyword))
      );
    });
  }, [allWebsites]);

  // 获取所有网站
  const getAllWebsites = useCallback((): Website[] => {
    return allWebsites;
  }, [allWebsites]);

  return {
    pageConfig: data?.page || null,
    categories: data?.categories || [],
    websitesByCategory: data?.websitesByCategory || {},
    stats: data?.stats || null,
    dynamicHotTags,
    loading,
    error,
    getWebsitesByCategory,
    getWebsitesBySubCategory,
    getSubCategories,
    getHotWebsites,
    getFeaturedWebsites,
    searchWebsites,
    getAllWebsites,
    refetch: fetchData,
  };
};

export default usePageData;
