/**
 * @file useFrontendConfig.ts
 * @description 前端功能配置 Hook - 获取后台配置的功能开关
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import publicSettingService from '../services/publicSettingService';
import {
  normalizeWebsiteClickMode,
  normalizeHotRecommendationClickMode,
} from '../utils/clickMode';
import { DEFAULT_NAV_SWITCH_ITEMS } from '../config/navModel';

// ==================== 接口定义 ====================

interface PageOverrideConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
}

interface ExitModalConfig {
  enabled: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  showReport: boolean;
  reportText: string;
  autoRedirect?: boolean;
  autoRedirectSeconds?: number;
  openInNewWindow?: boolean;
  showAd?: boolean;
  adCode?: string;
  adPosition?: 'top' | 'bottom';
  logo?: string;
  showAgreementLinks?: boolean;
  userAgreementText?: string;
  userAgreementUrl?: string;
  copyrightAgreementText?: string;
  copyrightAgreementUrl?: string;
  hotRecommendationsEnabled?: boolean;
  pageOverrides?: { [pageSlug: string]: PageOverrideConfig };
}

interface PageGlobalConfig {
  defaultLayout: 'grid' | 'list';
  gridColumns: number;
  showSidebar: boolean;
  sidebarPosition: 'left' | 'right';
  cardStyle: 'default' | 'compact' | 'detailed';
  showCardTags: boolean;
  showCardDescription: boolean;
  maxDescriptionLines: number;
  defaultPageSize: number;
  showPagination: boolean;
  showSearch: boolean;
  searchPlaceholder: string;
  defaultThemeColor: string;
  enableDarkMode: boolean;
  websiteClickMode: 'detail' | 'direct';
  detailPageNewWindow?: boolean;
  showDirectArrow?: boolean;
  directArrowNewWindow?: boolean;
  viewMoreNewWindow?: boolean;
  hotRecommendationClickMode?: 'detail' | 'direct'; // 热门推荐独立配置
  appendRefEnabled?: boolean;
  appendRefValue?: string;
  sortZeroNewFirstEnabled?: boolean;
  categoryPaginationThreshold?: number;
  categoryPaginationPageSize?: number;
  categorySvgLibrary?: Array<{
    key: string;
    label?: string;
    svg: string;
  }>;
}

/** 外观配置 */
interface AppearanceConfig {
  primaryColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textPrimaryColor: string;
  fontFamily: string;
  baseFontSize: number;
  borderRadius: number;
  contentMaxWidth: number;
  customCss: string;
}

/** 首页配置 */
interface HomepageConfig {
  homePageSlug: string;
  heroBannerEnabled: boolean;
  heroBgType: 'default' | 'color' | 'gradient' | 'image';
  heroBgValue: string;
  heroDisplayMode: 'search' | 'iconScroll';
  heroIconClickMode: 'direct' | 'detail';
  heroShowStats: boolean;
  heroShowHotTags: boolean;
  bannerCardsEnabled: boolean;
  hotRecommendationsEnabled: boolean;
  hotRecommendationsTitle: string;
  topAdEnabled: boolean;
  topAdCode: string;
  homeCarouselEnabled: boolean;
  homeCarouselSort: number;
  homeRecommendationEnabled: boolean;
  homeRecommendationSort: number;
  dailyNewEnabled: boolean;
  dailyNewDisplayLabel: string;
  dailyNewDisplayPath: string;
  dailyNewDisplayPlacements: string[];
  dailyNewDisplaySort: number;
  dailyNewDisplayOpenInNewTab: boolean;
  dailyNewDefaultDays: number;
  dailyNewPageKicker: string;
  dailyNewPageTitle: string;
  dailyNewPageDescription: string;
  navSwitchItems: Array<{
    slug: string;
    name: string;
    icon: string;
    visible: boolean;
    sort: number;
  }>;
}

/** 卡片样式配置 */
interface CardStyleConfig {
  defaultLayout: 'grid' | 'list';
  gridColumns: number;
  showDescription: boolean;
  maxDescriptionLines: number;
  showTags: boolean;
  showFavicon: boolean;
  showUrl: boolean;
  hoverEffect: 'translateUp' | 'borderOnly' | 'shadow' | 'none';
}

/** 侧边栏配置 */
interface SidebarConfig {
  enabled: boolean;
  position: 'left' | 'right';
  width: number;
  showCategories: boolean;
  showCategoryCount: boolean;
  expandSubCategories: boolean;
  sticky: boolean;
}

/** 搜索配置 */
interface SearchConfig {
  enabled: boolean;
  placeholder: string;
  debounceDelay: number;
  websiteSearchEnabled: boolean;
  articleSearchEnabled: boolean;
  aiSearchEnabled: boolean;
  aiSearchBtnText: string;
  heroTitle: string;
  heroDescriptionTemplate: string;
  heroHighlightText: string;
  hotSearchTags: string[];
  searchDisabledText: string;
  aiSearchDisabledText: string;
  aiResultSummaryTemplate: string;
  aiKeywordResultSummaryTemplate: string;
  aiSemanticResultSummaryTemplate: string;
  aiNoResultText: string;
  aiFallbackErrorText: string;
  aiCacheSuffixText: string;
  highlightKeyword: boolean;
  resultsPerPage: number;
}

interface AuthConfig {
  enable_register: number;
  enable_login: number;
  enable_user_center: number;
  register_close_message: string;
  login_close_message: string;
  user_center_close_message: string;
  userCenterModules: {
    profile: boolean;
    messages: boolean;
    orders: boolean;
    submissions: boolean;
    collections: boolean;
    likes: boolean;
    comments: boolean;
    loginLogs: boolean;
    security: boolean;
  };
  wechatWebsiteLogin: {
    enabled: boolean;
    appId: string;
    callbackPath: string;
  };
  qqLogin: {
    enabled: boolean;
    appId: string;
    callbackPath: string;
  };
  wechatOfficialAccountLogin: {
    enabled: boolean;
    appId: string;
    domainVerifyFileName: string;
    scanAutoLoginEnabled: boolean;
    scanAutoLoginPrompt: string;
    oauthCallbackPath: string;
    eventCallbackPath: string;
  };
}

interface FrontendConfig {
  authConfig: AuthConfig;
  exitModalEnabled: boolean;
  exitModalConfig: ExitModalConfig;
  pageGlobalConfig: PageGlobalConfig;
  appearanceConfig: AppearanceConfig;
  homepageConfig: HomepageConfig;
  cardStyleConfig: CardStyleConfig;
  sidebarConfig: SidebarConfig;
  searchConfig: SearchConfig;
}

interface FrontendConfigData {
  authConfig?: Partial<AuthConfig>;
  exitModalEnabled?: boolean;
  exitModalConfig?: Partial<ExitModalConfig>;
  pageGlobalConfig?: Partial<PageGlobalConfig>;
  appearanceConfig?: Partial<AppearanceConfig>;
  homepageConfig?: Partial<HomepageConfig>;
  cardStyleConfig?: Partial<CardStyleConfig>;
  sidebarConfig?: Partial<SidebarConfig>;
  searchConfig?: Partial<SearchConfig>;
}

// ==================== 默认值 ====================

const defaultExitModalConfig: ExitModalConfig = {
  enabled: false,
  title: '即将离开本站',
  description: '您即将访问第三方网站，请注意保护个人信息安全。',
  confirmText: '继续访问',
  cancelText: '返回',
  showReport: true,
  reportText: '举报此链接',
  autoRedirect: false,
  autoRedirectSeconds: 5,
  openInNewWindow: true,
  showAd: false,
  adCode: '',
  adPosition: 'bottom',
  logo: '',
  showAgreementLinks: false,
  userAgreementText: '',
  userAgreementUrl: '',
  copyrightAgreementText: '',
  copyrightAgreementUrl: '',
  hotRecommendationsEnabled: true,
};

const defaultPageGlobalConfig: PageGlobalConfig = {
  defaultLayout: 'grid',
  gridColumns: 4,
  showSidebar: true,
  sidebarPosition: 'left',
  cardStyle: 'default',
  showCardTags: true,
  showCardDescription: true,
  maxDescriptionLines: 2,
  defaultPageSize: 20,
  showPagination: true,
  showSearch: true,
  searchPlaceholder: '搜索工具...',
  defaultThemeColor: '#2563EB',
  enableDarkMode: false,
  websiteClickMode: 'detail',
  detailPageNewWindow: false,
  showDirectArrow: false,
  directArrowNewWindow: true,
  viewMoreNewWindow: false,
  hotRecommendationClickMode: 'detail', // 热门推荐默认跳转详情页
  appendRefEnabled: false,
  appendRefValue: '',
  sortZeroNewFirstEnabled: false,
  categoryPaginationThreshold: 120,
  categoryPaginationPageSize: 24,
  categorySvgLibrary: [],
};

const defaultAppearanceConfig: AppearanceConfig = {
  primaryColor: '#0066ff',
  backgroundColor: '#f6f8fb',
  cardBackgroundColor: '#ffffff',
  textPrimaryColor: '#333333',
  fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  baseFontSize: 16,
  borderRadius: 12,
  contentMaxWidth: 1200,
  customCss: '',
};

const defaultHomepageConfig: HomepageConfig = {
  homePageSlug: '',
  heroBannerEnabled: true,
  heroBgType: 'default',
  heroBgValue: '',
  heroDisplayMode: 'search',
  heroIconClickMode: 'direct',
  heroShowStats: true,
  heroShowHotTags: true,
  bannerCardsEnabled: true,
  hotRecommendationsEnabled: true,
  hotRecommendationsTitle: '热门推荐',
  topAdEnabled: false,
  topAdCode: '',
  homeCarouselEnabled: true,
  homeCarouselSort: 10,
  homeRecommendationEnabled: true,
  homeRecommendationSort: 20,
  dailyNewEnabled: true,
  dailyNewDisplayLabel: '每日上新',
  dailyNewDisplayPath: '/p/hot?tab=daily-new',
  dailyNewDisplayPlacements: [ 'nav_quick_entry' ],
  dailyNewDisplaySort: 86,
  dailyNewDisplayOpenInNewTab: false,
  dailyNewDefaultDays: 1,
  dailyNewPageKicker: 'Daily Fresh',
  dailyNewPageTitle: '每日上新网址',
  dailyNewPageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
  navSwitchItems: [...DEFAULT_NAV_SWITCH_ITEMS],
};

const defaultCardStyleConfig: CardStyleConfig = {
  defaultLayout: 'grid',
  gridColumns: 4,
  showDescription: true,
  maxDescriptionLines: 2,
  showTags: true,
  showFavicon: true,
  showUrl: false,
  hoverEffect: 'translateUp',
};

const defaultSidebarConfig: SidebarConfig = {
  enabled: true,
  position: 'left',
  width: 240,
  showCategories: true,
  showCategoryCount: true,
  expandSubCategories: false,
  sticky: true,
};

const defaultSearchConfig: SearchConfig = {
  enabled: true,
  placeholder: '搜索网站名称...',
  debounceDelay: 300,
  websiteSearchEnabled: true,
  articleSearchEnabled: true,
  aiSearchEnabled: true,
  aiSearchBtnText: 'AI 搜索',
  heroTitle: '全站搜索',
  heroDescriptionTemplate: '收录 {count} 个优质网站资源',
  heroHighlightText: '',
  hotSearchTags: [ 'AI绘画', 'ChatGPT', 'Figma', '免费工具', 'UI设计', 'Midjourney', '字体', '图标库', 'SVG' ],
  searchDisabledText: '站内搜索功能已关闭',
  aiSearchDisabledText: 'AI 搜索功能已关闭，请在后台配置中开启后再使用。',
  aiResultSummaryTemplate: 'AI 智能推荐找到 {count} 个结果{extra}',
  aiKeywordResultSummaryTemplate: '关键词匹配找到 {count} 个结果',
  aiSemanticResultSummaryTemplate: 'AI 语义扩展已返回 {count} 个结果{extra}',
  aiNoResultText: 'AI 未找到相关结果，请尝试其他描述',
  aiFallbackErrorText: 'AI 搜索暂时不可用，请稍后重试',
  aiCacheSuffixText: '（缓存）',
  highlightKeyword: true,
  resultsPerPage: 20,
};

const defaultAuthConfig: AuthConfig = {
  enable_register: 1,
  enable_login: 1,
  enable_user_center: 1,
  register_close_message: '注册功能暂时关闭',
  login_close_message: '系统维护中，暂时无法登录',
  user_center_close_message: '个人中心功能暂时关闭',
  userCenterModules: {
    profile: true,
    messages: true,
    orders: false,
    submissions: true,
    collections: true,
    likes: true,
    comments: true,
    loginLogs: true,
    security: true,
  },
  wechatWebsiteLogin: {
    enabled: false,
    appId: '',
    callbackPath: '/api/auth/wechat/open-platform/callback',
  },
  qqLogin: {
    enabled: false,
    appId: '',
    callbackPath: '/api/auth/qq/callback',
  },
  wechatOfficialAccountLogin: {
    enabled: false,
    appId: '',
    domainVerifyFileName: '',
    scanAutoLoginEnabled: false,
    scanAutoLoginPrompt: '扫码关注公众号后可自动完成登录，请根据页面提示继续操作。',
    oauthCallbackPath: '/api/auth/wechat/official-account/login/callback',
    eventCallbackPath: '/api/auth/wechat/official-account/event',
  },
};

const defaultConfig: FrontendConfig = {
  authConfig: defaultAuthConfig,
  exitModalEnabled: true,
  exitModalConfig: defaultExitModalConfig,
  pageGlobalConfig: defaultPageGlobalConfig,
  appearanceConfig: defaultAppearanceConfig,
  homepageConfig: defaultHomepageConfig,
  cardStyleConfig: defaultCardStyleConfig,
  sidebarConfig: defaultSidebarConfig,
  searchConfig: defaultSearchConfig,
};

// ==================== 缓存 ====================

let cachedConfig: FrontendConfig | null = null;
let configPromise: Promise<FrontendConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 60秒

/** 清除配置缓存 */
export const clearConfigCache = () => {
  cachedConfig = null;
  configPromise = null;
  cacheTimestamp = 0;
};

// ==================== 构建配置 ====================

/**
 * 规范化页面全局配置，确保分类区域与热门推荐配置语义一致且独立
 */
const normalizePageGlobalConfig = (config: unknown): PageGlobalConfig => {
  const mergedConfig = { ...defaultPageGlobalConfig, ...((config as Partial<PageGlobalConfig>) || {}) };
  /**
   * 规范化分类 SVG 图标库，确保前端渲染时可直接通过 svg:key 命中。
   */
  const normalizedCategorySvgLibrary = (() => {
    const rows = Array.isArray(mergedConfig.categorySvgLibrary) ? mergedConfig.categorySvgLibrary : [];
    return rows
      .map((item, index) => {
        const key = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
        if (!key) return null;
        const svg = String(item?.svg || '').trim();
        if (!svg || !svg.toLowerCase().startsWith('<svg')) return null;
        const label = String(item?.label || key).trim().slice(0, 40) || key;
        const sort = Number.isFinite(Number((item as { sort?: unknown })?.sort))
          ? Number((item as { sort?: unknown }).sort)
          : index + 1;
        return { key, label, svg, sort };
      })
      .filter((item): item is { key: string; label: string; svg: string; sort: number } => Boolean(item))
      .sort((a, b) => a.sort - b.sort)
      .map(({ key, label, svg }) => ({ key, label, svg }));
  })();
  return {
    ...mergedConfig,
    websiteClickMode: normalizeWebsiteClickMode(mergedConfig.websiteClickMode),
    hotRecommendationClickMode: normalizeHotRecommendationClickMode(mergedConfig.hotRecommendationClickMode),
    viewMoreNewWindow: mergedConfig.viewMoreNewWindow === true,
    appendRefEnabled: mergedConfig.appendRefEnabled === true,
    appendRefValue: String(mergedConfig.appendRefValue || '').trim(),
    sortZeroNewFirstEnabled: mergedConfig.sortZeroNewFirstEnabled === true,
    categoryPaginationThreshold: Number.isFinite(Number(mergedConfig.categoryPaginationThreshold))
      ? Math.max(24, Math.min(2000, Number(mergedConfig.categoryPaginationThreshold)))
      : 120,
    categoryPaginationPageSize: Number.isFinite(Number(mergedConfig.categoryPaginationPageSize))
      ? Math.max(8, Math.min(120, Number(mergedConfig.categoryPaginationPageSize)))
      : 24,
    categorySvgLibrary: normalizedCategorySvgLibrary,
  };
};

/**
 * 规范化首页配置，确保轮播/推荐区和导航切换项结构稳定
 */
const normalizeHomepageConfig = (config: unknown): HomepageConfig => {
  const mergedConfig = { ...defaultHomepageConfig, ...((config as Partial<HomepageConfig>) || {}) };
  /**
   * 规范化 Hero 图标点击模式，仅允许 direct/detail。
   */
  const normalizedHeroIconClickMode = String(mergedConfig.heroIconClickMode || '').trim() === 'detail'
    ? 'detail'
    : 'direct';
  /**
   * 规范化每日上新入口显示位置，限制受控枚举并去重。
   */
  const normalizedDailyNewPlacements = (() => {
    const allowSet = new Set([ 'nav_quick_entry', 'home_menu', 'footer_link' ]);
    const rows = Array.isArray(mergedConfig.dailyNewDisplayPlacements)
      ? mergedConfig.dailyNewDisplayPlacements
      : [];
    const list = rows
      .map((item) => String(item || '').trim())
      .filter((item) => allowSet.has(item));
    return Array.from(new Set(list));
  })();
  /**
   * 规范化每日上新入口路径，兼容相对路径写法。
   */
  const normalizedDailyNewPath = (() => {
    const rawPath = String(mergedConfig.dailyNewDisplayPath || '').trim();
    if (!rawPath) return defaultHomepageConfig.dailyNewDisplayPath;
    if (/^(https?:)?\/\//i.test(rawPath)) return rawPath;
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  })();
  const items = Array.isArray(mergedConfig.navSwitchItems)
    ? mergedConfig.navSwitchItems
    : defaultHomepageConfig.navSwitchItems;
  return {
    ...mergedConfig,
    heroIconClickMode: normalizedHeroIconClickMode,
    homePageSlug: String(mergedConfig.homePageSlug || '').trim(),
    homeCarouselEnabled: mergedConfig.homeCarouselEnabled !== false,
    homeRecommendationEnabled: mergedConfig.homeRecommendationEnabled !== false,
    homeCarouselSort: Number.isFinite(Number(mergedConfig.homeCarouselSort))
      ? Number(mergedConfig.homeCarouselSort)
      : defaultHomepageConfig.homeCarouselSort,
    homeRecommendationSort: Number.isFinite(Number(mergedConfig.homeRecommendationSort))
      ? Number(mergedConfig.homeRecommendationSort)
      : defaultHomepageConfig.homeRecommendationSort,
    dailyNewEnabled: mergedConfig.dailyNewEnabled !== false,
    dailyNewDisplayLabel: String(mergedConfig.dailyNewDisplayLabel || defaultHomepageConfig.dailyNewDisplayLabel).trim() || defaultHomepageConfig.dailyNewDisplayLabel,
    dailyNewDisplayPath: normalizedDailyNewPath,
    dailyNewDisplayPlacements: normalizedDailyNewPlacements.length > 0 ? normalizedDailyNewPlacements : defaultHomepageConfig.dailyNewDisplayPlacements,
    dailyNewDisplaySort: Number.isFinite(Number(mergedConfig.dailyNewDisplaySort))
      ? Math.max(1, Math.min(9999, Number(mergedConfig.dailyNewDisplaySort)))
      : defaultHomepageConfig.dailyNewDisplaySort,
    dailyNewDisplayOpenInNewTab: mergedConfig.dailyNewDisplayOpenInNewTab === true,
    dailyNewDefaultDays: Number.isFinite(Number(mergedConfig.dailyNewDefaultDays))
      ? Math.max(1, Math.min(30, Number(mergedConfig.dailyNewDefaultDays)))
      : defaultHomepageConfig.dailyNewDefaultDays,
    dailyNewPageKicker: String(
      mergedConfig.dailyNewPageKicker || defaultHomepageConfig.dailyNewPageKicker
    ).trim() || defaultHomepageConfig.dailyNewPageKicker,
    dailyNewPageTitle: String(
      mergedConfig.dailyNewPageTitle || defaultHomepageConfig.dailyNewPageTitle
    ).trim() || defaultHomepageConfig.dailyNewPageTitle,
    dailyNewPageDescription: String(
      mergedConfig.dailyNewPageDescription || defaultHomepageConfig.dailyNewPageDescription
    ).trim() || defaultHomepageConfig.dailyNewPageDescription,
    navSwitchItems: items
      .map((item, index) => ({
        slug: String(item?.slug || defaultHomepageConfig.navSwitchItems[index % defaultHomepageConfig.navSwitchItems.length].slug),
        name: String(item?.name || defaultHomepageConfig.navSwitchItems[index % defaultHomepageConfig.navSwitchItems.length].name),
        icon: String(item?.icon || defaultHomepageConfig.navSwitchItems[index % defaultHomepageConfig.navSwitchItems.length].icon),
        visible: item?.visible !== false,
        sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
      }))
      .sort((a, b) => a.sort - b.sort),
  };
};

/**
 * 规范化认证配置，确保登录/注册/个人中心开关字段稳定。
 */
const normalizeAuthConfig = (config: unknown): AuthConfig => {
  const mergedConfig = { ...defaultAuthConfig, ...((config as Partial<AuthConfig>) || {}) };
  /**
   * 规范化个人中心模块开关，保证字段完整。
   */
  const normalizeUserCenterModules = (modules: unknown) => {
    const source = (modules && typeof modules === 'object')
      ? (modules as Partial<AuthConfig['userCenterModules']>)
      : {};
    const defaults = defaultAuthConfig.userCenterModules;
    const normalizedModules = {
      profile: source.profile !== false && defaults.profile !== false,
      messages: source.messages !== false && defaults.messages !== false,
      orders: source.orders === true || defaults.orders === true,
      submissions: source.submissions !== false && defaults.submissions !== false,
      collections: source.collections !== false && defaults.collections !== false,
      likes: source.likes !== false && defaults.likes !== false,
      comments: source.comments !== false && defaults.comments !== false,
      loginLogs: source.loginLogs !== false && defaults.loginLogs !== false,
      security: source.security !== false && defaults.security !== false,
    };
    if (!Object.values(normalizedModules).some(Boolean)) {
      normalizedModules.profile = true;
    }
    return normalizedModules;
  };
  return {
    enable_register: mergedConfig.enable_register === 0 ? 0 : 1,
    enable_login: mergedConfig.enable_login === 0 ? 0 : 1,
    enable_user_center: mergedConfig.enable_user_center === 0 ? 0 : 1,
    register_close_message: String(
      mergedConfig.register_close_message || defaultAuthConfig.register_close_message
    ).trim() || defaultAuthConfig.register_close_message,
    login_close_message: String(
      mergedConfig.login_close_message || defaultAuthConfig.login_close_message
    ).trim() || defaultAuthConfig.login_close_message,
    user_center_close_message: String(
      mergedConfig.user_center_close_message || defaultAuthConfig.user_center_close_message
    ).trim() || defaultAuthConfig.user_center_close_message,
    userCenterModules: normalizeUserCenterModules(
      (mergedConfig as Partial<AuthConfig>).userCenterModules
    ),
    wechatWebsiteLogin: {
      enabled: mergedConfig?.wechatWebsiteLogin?.enabled === true,
      appId: String(
        mergedConfig?.wechatWebsiteLogin?.appId || defaultAuthConfig.wechatWebsiteLogin.appId
      ).trim(),
      callbackPath: String(
        mergedConfig?.wechatWebsiteLogin?.callbackPath
          || defaultAuthConfig.wechatWebsiteLogin.callbackPath
      ).trim() || defaultAuthConfig.wechatWebsiteLogin.callbackPath,
    },
    qqLogin: {
      enabled: mergedConfig?.qqLogin?.enabled === true,
      appId: String(
        mergedConfig?.qqLogin?.appId || defaultAuthConfig.qqLogin.appId
      ).trim(),
      callbackPath: String(
        mergedConfig?.qqLogin?.callbackPath
          || defaultAuthConfig.qqLogin.callbackPath
      ).trim() || defaultAuthConfig.qqLogin.callbackPath,
    },
    wechatOfficialAccountLogin: {
      enabled: mergedConfig?.wechatOfficialAccountLogin?.enabled === true,
      appId: String(
        mergedConfig?.wechatOfficialAccountLogin?.appId
          || defaultAuthConfig.wechatOfficialAccountLogin.appId
      ).trim(),
      domainVerifyFileName: String(
        mergedConfig?.wechatOfficialAccountLogin?.domainVerifyFileName
          || defaultAuthConfig.wechatOfficialAccountLogin.domainVerifyFileName
      ).trim(),
      scanAutoLoginEnabled:
        mergedConfig?.wechatOfficialAccountLogin?.scanAutoLoginEnabled === true,
      scanAutoLoginPrompt: String(
        mergedConfig?.wechatOfficialAccountLogin?.scanAutoLoginPrompt
          || defaultAuthConfig.wechatOfficialAccountLogin.scanAutoLoginPrompt
      ).trim() || defaultAuthConfig.wechatOfficialAccountLogin.scanAutoLoginPrompt,
      oauthCallbackPath: String(
        mergedConfig?.wechatOfficialAccountLogin?.oauthCallbackPath
          || defaultAuthConfig.wechatOfficialAccountLogin.oauthCallbackPath
      ).trim() || defaultAuthConfig.wechatOfficialAccountLogin.oauthCallbackPath,
      eventCallbackPath: String(
        mergedConfig?.wechatOfficialAccountLogin?.eventCallbackPath
          || defaultAuthConfig.wechatOfficialAccountLogin.eventCallbackPath
      ).trim() || defaultAuthConfig.wechatOfficialAccountLogin.eventCallbackPath,
    },
  };
};

/**
 * 规范化搜索配置，统一 AI 搜索提示文案和模板字段。
 */
const normalizeSearchConfig = (config: unknown): SearchConfig => {
  const mergedConfig = { ...defaultSearchConfig, ...((config as Partial<SearchConfig>) || {}) };
  /**
   * 规范化搜索页热门标签兜底词，兼容数组与多行文本格式。
   */
  const normalizeHotSearchTags = (value: unknown): string[] => {
    const sourceList = Array.isArray(value)
      ? value
      : String(value || '')
        .split(/[，,\n|]+/)
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    const normalized = Array.from(new Set(sourceList
      .map((item) => String(item || '').trim().slice(0, 20))
      .filter(Boolean)));
    return normalized.length > 0 ? normalized.slice(0, 20) : defaultSearchConfig.hotSearchTags;
  };
  return {
    enabled: mergedConfig.enabled !== false,
    placeholder: String(mergedConfig.placeholder || defaultSearchConfig.placeholder).trim() || defaultSearchConfig.placeholder,
    debounceDelay: Number.isFinite(Number(mergedConfig.debounceDelay))
      ? Math.max(100, Math.min(2000, Number(mergedConfig.debounceDelay)))
      : defaultSearchConfig.debounceDelay,
    websiteSearchEnabled: mergedConfig.websiteSearchEnabled !== false,
    articleSearchEnabled: mergedConfig.articleSearchEnabled !== false,
    aiSearchEnabled: mergedConfig.aiSearchEnabled !== false,
    aiSearchBtnText: String(mergedConfig.aiSearchBtnText || defaultSearchConfig.aiSearchBtnText).trim()
      || defaultSearchConfig.aiSearchBtnText,
    heroTitle: String(mergedConfig.heroTitle || defaultSearchConfig.heroTitle).trim()
      || defaultSearchConfig.heroTitle,
    heroDescriptionTemplate: String(
      mergedConfig.heroDescriptionTemplate || defaultSearchConfig.heroDescriptionTemplate
    ).trim() || defaultSearchConfig.heroDescriptionTemplate,
    heroHighlightText: String(mergedConfig.heroHighlightText || defaultSearchConfig.heroHighlightText).trim()
      || defaultSearchConfig.heroHighlightText,
    hotSearchTags: normalizeHotSearchTags(mergedConfig.hotSearchTags),
    searchDisabledText: String(mergedConfig.searchDisabledText || defaultSearchConfig.searchDisabledText).trim()
      || defaultSearchConfig.searchDisabledText,
    aiSearchDisabledText: String(mergedConfig.aiSearchDisabledText || defaultSearchConfig.aiSearchDisabledText).trim()
      || defaultSearchConfig.aiSearchDisabledText,
    aiResultSummaryTemplate: String(mergedConfig.aiResultSummaryTemplate || defaultSearchConfig.aiResultSummaryTemplate).trim()
      || defaultSearchConfig.aiResultSummaryTemplate,
    aiKeywordResultSummaryTemplate: String(
      mergedConfig.aiKeywordResultSummaryTemplate || defaultSearchConfig.aiKeywordResultSummaryTemplate
    ).trim() || defaultSearchConfig.aiKeywordResultSummaryTemplate,
    aiSemanticResultSummaryTemplate: String(
      mergedConfig.aiSemanticResultSummaryTemplate || defaultSearchConfig.aiSemanticResultSummaryTemplate
    ).trim() || defaultSearchConfig.aiSemanticResultSummaryTemplate,
    aiNoResultText: String(mergedConfig.aiNoResultText || defaultSearchConfig.aiNoResultText).trim()
      || defaultSearchConfig.aiNoResultText,
    aiFallbackErrorText: String(mergedConfig.aiFallbackErrorText || defaultSearchConfig.aiFallbackErrorText).trim()
      || defaultSearchConfig.aiFallbackErrorText,
    aiCacheSuffixText: String(mergedConfig.aiCacheSuffixText || defaultSearchConfig.aiCacheSuffixText).trim()
      || defaultSearchConfig.aiCacheSuffixText,
    highlightKeyword: mergedConfig.highlightKeyword !== false,
    resultsPerPage: Number.isFinite(Number(mergedConfig.resultsPerPage))
      ? Math.max(10, Math.min(100, Number(mergedConfig.resultsPerPage)))
      : defaultSearchConfig.resultsPerPage,
  };
};

const buildConfig = (data: FrontendConfigData): FrontendConfig => ({
  authConfig: normalizeAuthConfig(data.authConfig),
  exitModalEnabled: data.exitModalEnabled ?? true,
  exitModalConfig: { ...defaultExitModalConfig, ...(data.exitModalConfig || {}) },
  pageGlobalConfig: normalizePageGlobalConfig(data.pageGlobalConfig),
  appearanceConfig: { ...defaultAppearanceConfig, ...(data.appearanceConfig || {}) },
  homepageConfig: normalizeHomepageConfig(data.homepageConfig),
  cardStyleConfig: { ...defaultCardStyleConfig, ...(data.cardStyleConfig || {}) },
  sidebarConfig: { ...defaultSidebarConfig, ...(data.sidebarConfig || {}) },
  searchConfig: normalizeSearchConfig(data.searchConfig),
});

// ==================== Hook ====================

/** 获取前端功能配置 */
export const useFrontendConfig = () => {
  const [config, setConfig] = useState<FrontendConfig>(cachedConfig || defaultConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  const fetchConfig = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cacheValid = cachedConfig && (now - cacheTimestamp) < CACHE_TTL;

    if (!forceRefresh && cacheValid) {
      setConfig(cachedConfig!);
      setLoading(false);
      return;
    }

    if (configPromise) {
      const result = await configPromise;
      setConfig(result);
      setLoading(false);
      return;
    }

    setLoading(true);
    configPromise = (async () => {
      try {
        const frontendConfig = await publicSettingService.getFrontendConfig();
        const hasFrontendConfig = Boolean(
          frontendConfig.authConfig ||
          frontendConfig.exitModalConfig ||
          frontendConfig.pageGlobalConfig ||
          frontendConfig.appearanceConfig ||
          frontendConfig.homepageConfig ||
          frontendConfig.cardStyleConfig ||
          frontendConfig.sidebarConfig ||
          frontendConfig.searchConfig ||
          typeof frontendConfig.exitModalEnabled === 'boolean'
        );

        if (hasFrontendConfig) {
          const newConfig = buildConfig({
            authConfig: frontendConfig.authConfig,
            exitModalEnabled: frontendConfig.exitModalEnabled,
            exitModalConfig: frontendConfig.exitModalConfig,
            pageGlobalConfig: frontendConfig.pageGlobalConfig,
            appearanceConfig: frontendConfig.appearanceConfig,
            homepageConfig: frontendConfig.homepageConfig,
            cardStyleConfig: frontendConfig.cardStyleConfig,
            sidebarConfig: frontendConfig.sidebarConfig,
            searchConfig: frontendConfig.searchConfig,
          });
          cachedConfig = newConfig;
          cacheTimestamp = Date.now();
          return newConfig;
        }

        const settings = await publicSettingService.getPublicSettings();
        const newConfig = buildConfig({
          authConfig: settings.authConfig,
          pageGlobalConfig: settings.pageGlobal,
          appearanceConfig: settings.appearance,
          homepageConfig: settings.homepage,
          cardStyleConfig: settings.cardStyle,
          sidebarConfig: settings.sidebar,
          searchConfig: settings.search,
          exitModalConfig: settings.exitModal,
        });
        cachedConfig = newConfig;
        cacheTimestamp = Date.now();
        return newConfig;
      } catch (err) {
        console.error('加载前端配置失败，使用默认配置:', err);
        cachedConfig = defaultConfig;
        cacheTimestamp = Date.now();
        return defaultConfig;
      } finally {
        configPromise = null;
      }
    })();

    const result = await configPromise;
    setConfig(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, refetch: () => fetchConfig(true) };
};

/** 直接获取配置（非 Hook 版本） */
export const getFrontendConfig = async (forceRefresh = false): Promise<FrontendConfig> => {
  const now = Date.now();
  const cacheValid = cachedConfig && (now - cacheTimestamp) < CACHE_TTL;

  if (!forceRefresh && cacheValid) {
    return cachedConfig!;
  }

  try {
    const frontendConfig = await publicSettingService.getFrontendConfig();
    const hasFrontendConfig = Boolean(
      frontendConfig.authConfig ||
      frontendConfig.exitModalConfig ||
      frontendConfig.pageGlobalConfig ||
      frontendConfig.appearanceConfig ||
      frontendConfig.homepageConfig ||
      frontendConfig.cardStyleConfig ||
      frontendConfig.sidebarConfig ||
      frontendConfig.searchConfig ||
      typeof frontendConfig.exitModalEnabled === 'boolean'
    );

    if (hasFrontendConfig) {
      cachedConfig = buildConfig({
        authConfig: frontendConfig.authConfig,
        exitModalEnabled: frontendConfig.exitModalEnabled,
        exitModalConfig: frontendConfig.exitModalConfig,
        pageGlobalConfig: frontendConfig.pageGlobalConfig,
        appearanceConfig: frontendConfig.appearanceConfig,
        homepageConfig: frontendConfig.homepageConfig,
        cardStyleConfig: frontendConfig.cardStyleConfig,
        sidebarConfig: frontendConfig.sidebarConfig,
        searchConfig: frontendConfig.searchConfig,
      });
      cacheTimestamp = Date.now();
      return cachedConfig;
    }

    const settings = await publicSettingService.getPublicSettings();
    cachedConfig = buildConfig({
      authConfig: settings.authConfig,
      pageGlobalConfig: settings.pageGlobal,
      appearanceConfig: settings.appearance,
      homepageConfig: settings.homepage,
      cardStyleConfig: settings.cardStyle,
      sidebarConfig: settings.sidebar,
      searchConfig: settings.search,
      exitModalConfig: settings.exitModal,
    });
    cacheTimestamp = Date.now();
    return cachedConfig;
  } catch {
    return defaultConfig;
  }
};

// ==================== 类型导出 ====================

export type {
  FrontendConfig,
  ExitModalConfig,
  PageGlobalConfig,
  AppearanceConfig,
  HomepageConfig,
  CardStyleConfig,
  SidebarConfig,
  SearchConfig,
  AuthConfig,
};

export default useFrontendConfig;
