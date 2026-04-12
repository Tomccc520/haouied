/**
 * @file SiteContext.tsx
 * @description 站点信息全局Context，实现站点信息的全局共享和缓存
 * @copyright 版权所有 (c) 2025 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 * 
 * Requirements: 8.1, 8.2, 8.4
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { unwrapApiResponse } from '../utils/apiResponse';

/**
 * 站点信息接口
 */
export interface SiteInfo {
  id: number;
  siteName: string;
  siteTitle: string;
  description: string;
  keywords: string;
  logo: string;
  navbarLogoDisplayMode: 'icon_text' | 'text' | 'icon';
  navbarLogoText: string;
  favicon: string;
  icp?: string;
  icpLink?: string;
  copyright?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 默认站点信息 - 用于降级处理
 * Requirements: 8.4
 */
export const DEFAULT_SITE_INFO: SiteInfo = {
  id: 0,
  siteName: 'UIED AI工具导航',
  siteTitle: 'UIED AI工具导航 - 精选AI工具与资源平台',
  description: 'UIED AI导航汇集全球优质AI工具与资源，涵盖AI写作、AI绘画、AI视频、AI办公、AI设计、AI编程等多个领域，帮助设计师、开发者与创作者快速发现和使用高效的人工智能工具。',
  keywords: 'UIED,UIED AI导航,AI导航,AI工具,AI工具导航,人工智能工具,AI写作,AI绘画,AI视频,AI办公,AI设计工具',
  logo: '/logo-3.svg',
  navbarLogoDisplayMode: 'icon_text',
  navbarLogoText: '',
  favicon: '/favicon.ico',
};

/**
 * 规范化头部品牌展示模式，避免前端拿到非法值。
 */
const normalizeNavbarLogoDisplayMode = (
  value: unknown
): 'icon_text' | 'text' | 'icon' => {
  const mode = String(value || '').trim().toLowerCase();
  return mode === 'text' || mode === 'icon' ? mode : 'icon_text';
};

/**
 * 读取对象中的首个有效字符串字段。
 */
const pickTextField = (
  source: Record<string, unknown>,
  keys: string[],
  fallback = ''
): string => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return fallback;
};

/**
 * 规范化站点信息响应，兼容“包装响应 + 多字段命名”。
 */
export const normalizeSiteInfoPayload = (
  payload: unknown,
  fallback: SiteInfo = DEFAULT_SITE_INFO
): SiteInfo => {
  const unwrapped = unwrapApiResponse<Record<string, unknown> | null>(payload, null);
  if (!unwrapped || typeof unwrapped !== 'object') {
    return { ...fallback };
  }
  return mergeSiteInfoWithDefaults({
    id: Number(unwrapped.id ?? fallback.id) || fallback.id,
    siteName: pickTextField(unwrapped, [ 'siteName', 'site_name' ], fallback.siteName),
    siteTitle: pickTextField(unwrapped, [ 'siteTitle', 'site_title' ], fallback.siteTitle),
    description: pickTextField(
      unwrapped,
      [ 'description', 'siteDescription', 'site_description' ],
      fallback.description
    ),
    keywords: pickTextField(
      unwrapped,
      [ 'keywords', 'siteKeywords', 'site_keywords' ],
      fallback.keywords
    ),
    logo: pickTextField(unwrapped, [ 'logo' ], fallback.logo),
    navbarLogoDisplayMode: normalizeNavbarLogoDisplayMode(
      pickTextField(
        unwrapped,
        [ 'navbarLogoDisplayMode', 'navbar_logo_display_mode' ],
        fallback.navbarLogoDisplayMode
      )
    ),
    navbarLogoText: pickTextField(
      unwrapped,
      [ 'navbarLogoText', 'navbar_logo_text' ],
      fallback.navbarLogoText
    ),
    favicon: pickTextField(unwrapped, [ 'favicon' ], fallback.favicon),
    icp: pickTextField(unwrapped, [ 'icp' ], ''),
    icpLink: pickTextField(unwrapped, [ 'icpLink', 'icp_link' ], ''),
    copyright: pickTextField(unwrapped, [ 'copyright' ], ''),
    createdAt: pickTextField(unwrapped, [ 'createdAt', 'create_time' ], ''),
    updatedAt: pickTextField(unwrapped, [ 'updatedAt', 'update_time' ], ''),
  });
};

/**
 * SiteContext值接口
 */
export interface SiteContextValue {
  siteInfo: SiteInfo;
  loading: boolean;
  error: Error | null;
  isUsingDefault: boolean;
  refresh: () => Promise<void>;
}

/**
 * 创建Context
 */
const SiteContext = createContext<SiteContextValue | undefined>(undefined);

/**
 * SiteProvider Props
 */
interface SiteProviderProps {
  children: ReactNode;
  /** 自定义默认值（用于测试） */
  defaultSiteInfo?: SiteInfo;
  /** 刷新间隔（毫秒），默认30分钟 */
  refreshInterval?: number;
}

/**
 * SiteProvider组件
 * 提供站点信息的全局状态管理
 * 
 * Requirements: 8.1, 8.2
 */
export const SiteProvider: React.FC<SiteProviderProps> = ({
  children,
  defaultSiteInfo = DEFAULT_SITE_INFO,
  refreshInterval = 30 * 60 * 1000, // 30分钟
}) => {
  const [siteInfo, setSiteInfo] = useState<SiteInfo>(defaultSiteInfo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingDefault, setIsUsingDefault] = useState(true);

  /**
   * 获取站点信息
   * Requirements: 8.1, 8.4
   */
  const fetchSiteInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/site-info', {
        params: { _t: Date.now() },
      });
      
      if (response.data) {
        setSiteInfo(normalizeSiteInfoPayload(response.data, defaultSiteInfo));
        setIsUsingDefault(false);
        setError(null);
      } else {
        // API返回空数据，使用默认值
        setSiteInfo(defaultSiteInfo);
        setIsUsingDefault(true);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch site info');
      setError(error);
      console.error('Failed to fetch site info:', err);
      
      // 降级处理：使用默认值
      // Requirements: 8.4
      setSiteInfo(defaultSiteInfo);
      setIsUsingDefault(true);
    } finally {
      setLoading(false);
    }
  }, [defaultSiteInfo]);

  /**
   * 手动刷新方法
   * Requirements: 8.2
   */
  const refresh = useCallback(async () => {
    await fetchSiteInfo();
  }, [fetchSiteInfo]);

  /**
   * 初始化加载和定时刷新
   * Requirements: 8.1
   */
  useEffect(() => {
    fetchSiteInfo();

    // 设置定时刷新
    const intervalId = setInterval(fetchSiteInfo, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchSiteInfo, refreshInterval]);

  const value: SiteContextValue = {
    siteInfo,
    loading,
    error,
    isUsingDefault,
    refresh,
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
};

/**
 * useSiteContext Hook
 * 用于在组件中访问站点信息
 * 
 * @throws {Error} 如果在SiteProvider外部使用
 */
export const useSiteContext = (): SiteContextValue => {
  const context = useContext(SiteContext);
  
  if (context === undefined) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  
  return context;
};

/**
 * 降级处理工具函数
 * 用于在任何情况下都能获取有效的站点信息
 * 
 * Requirements: 8.4
 */
export const getSafeValue = <K extends keyof SiteInfo>(
  siteInfo: SiteInfo | null | undefined,
  key: K,
  fallback?: SiteInfo[K]
): SiteInfo[K] => {
  if (siteInfo && siteInfo[key] !== undefined && siteInfo[key] !== null) {
    const value = siteInfo[key];
    // For string fields, also check for empty strings
    if (typeof value === 'string' && value.length === 0) {
      return fallback !== undefined ? fallback : DEFAULT_SITE_INFO[key];
    }
    return value;
  }
  return fallback !== undefined ? fallback : DEFAULT_SITE_INFO[key];
};

/**
 * 合并站点信息与默认值
 * 确保所有必需字段都有值
 * 
 * Requirements: 8.4
 */
export const mergeSiteInfoWithDefaults = (
  siteInfo: Partial<SiteInfo> | null | undefined
): SiteInfo => {
  if (!siteInfo) {
    return { ...DEFAULT_SITE_INFO };
  }
  
  return {
    id: siteInfo.id ?? DEFAULT_SITE_INFO.id,
    siteName: siteInfo.siteName || DEFAULT_SITE_INFO.siteName,
    siteTitle: siteInfo.siteTitle || DEFAULT_SITE_INFO.siteTitle,
    description: siteInfo.description || DEFAULT_SITE_INFO.description,
    keywords: siteInfo.keywords || DEFAULT_SITE_INFO.keywords,
    logo: siteInfo.logo || DEFAULT_SITE_INFO.logo,
    navbarLogoDisplayMode: normalizeNavbarLogoDisplayMode(siteInfo.navbarLogoDisplayMode),
    navbarLogoText: siteInfo.navbarLogoText || DEFAULT_SITE_INFO.navbarLogoText,
    favicon: siteInfo.favicon || DEFAULT_SITE_INFO.favicon,
    icp: siteInfo.icp,
    icpLink: siteInfo.icpLink,
    copyright: siteInfo.copyright,
    createdAt: siteInfo.createdAt,
    updatedAt: siteInfo.updatedAt,
  };
};

/**
 * 验证站点信息是否有效
 * 
 * Requirements: 8.4
 */
export const isValidSiteInfo = (siteInfo: unknown): siteInfo is SiteInfo => {
  if (!siteInfo || typeof siteInfo !== 'object') {
    return false;
  }
  
  const info = siteInfo as Record<string, unknown>;
  
  // 检查必需字段
  return (
    typeof info.siteName === 'string' &&
    typeof info.siteTitle === 'string' &&
    typeof info.description === 'string' &&
    typeof info.keywords === 'string' &&
    typeof info.logo === 'string' &&
    typeof info.favicon === 'string'
  );
};

export default SiteContext;
