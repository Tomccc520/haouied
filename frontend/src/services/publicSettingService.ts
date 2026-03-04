/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.2.12
 * 
 * @file publicSettingService.ts
 * @description 前端公开设置服务 - 对接后台站点设置
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';
import {
  normalizeWebsiteClickMode,
  normalizeHotRecommendationClickMode,
} from '../utils/clickMode';
import { debugLog } from '../utils/debugHelper';
import { DEFAULT_NAV_SWITCH_ITEMS } from '../config/navModel';
import { DEFAULT_ARTICLE_CONFIG as DEFAULT_ARTICLE_UI_CONFIG, ARTICLE_TOPICS } from '../config/articleConfig';

// ==================== 类型定义 ====================

// 站点信息
export interface SiteInfo {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  logo: string;
  favicon: string;
  icp: string;
  copyright: string;
  contactEmail: string;
  analyticsCode: string;
}

// 外观配置
export interface AppearanceConfig {
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

// 首页配置
export interface HomepageConfig {
  homePageSlug: string;
  heroBannerEnabled: boolean;
  heroBgType: 'default' | 'color' | 'gradient' | 'image';
  heroBgValue: string;
  heroDisplayMode: 'search' | 'iconScroll';
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

// 页面配置
export interface PageGlobalConfig {
  websiteClickMode: 'detail' | 'direct';
  showDirectArrow: boolean;
  detailPageNewWindow: boolean;
  directArrowNewWindow: boolean;
  pageSize: number;
  hotRecommendationClickMode: 'detail' | 'direct';
  appendRefEnabled: boolean;
  appendRefValue: string;
  sortZeroNewFirstEnabled?: boolean;
  categorySvgLibrary?: Array<{
    key: string;
    label?: string;
    svg: string;
  }>;
}

// 卡片样式配置
export interface CardStyleConfig {
  defaultLayout: 'grid' | 'list';
  gridColumns: number;
  showDescription: boolean;
  maxDescriptionLines: number;
  showTags: boolean;
  showFavicon: boolean;
  showUrl: boolean;
  hoverEffect: 'translateUp' | 'borderOnly' | 'shadow' | 'none';
}

// 侧边栏配置
export interface SidebarConfig {
  enabled: boolean;
  position: 'left' | 'right';
  width: number;
  showCategories: boolean;
  showCategoryCount: boolean;
  expandSubCategories: boolean;
  sticky: boolean;
}

// 搜索配置
export interface SearchConfig {
  enabled: boolean;
  placeholder: string;
  debounceDelay: number;
  aiSearchEnabled: boolean;
  aiSearchBtnText: string;
  highlightKeyword: boolean;
  resultsPerPage: number;
}

// 跳转提醒配置
export interface ExitModalConfig {
  enabled: boolean;
  title: string;
  description: string;
  autoRedirect: boolean;
  countdown: number;
  logo?: string;
  showAgreementLinks?: boolean;
  userAgreementText?: string;
  userAgreementUrl?: string;
  copyrightAgreementText?: string;
  copyrightAgreementUrl?: string;
}

// 详情页配置
export interface DetailPageConfig {
  pageStylePreset?: 'showcase' | 'compact' | 'enterprise';
  layoutWidthMode?: 'contained' | 'wide' | 'fluid';
  spacingDensity?: 'compact' | 'comfortable';
  labelVisualStyle?: 'soft' | 'outline';
  dataPanelEnabled?: boolean;
  dataPanelTitle?: string;
  heroAccentGlassEnabled?: boolean;
  enabled?: boolean;
  relatedTitle?: string;
  relatedCount?: number;
  relatedMode?: 'same_category' | 'same_tags' | 'hot' | 'manual';
  manualWebsiteIds?: string | string[];
  hotWebsitesTitle?: string;
  hotWebsitesCount?: number;
  articlesTitle?: string;
  articlesCount?: number;
  tagsTitle?: string;
  tagSource?: 'website' | 'category' | 'manual';
  manualTags?: string | string[];
  categoryTitle?: string;
  sidebarLinksNewWindow?: boolean;
  sidebarAdSlotKey?: string;
  sidebarModules?: Array<{
    key: string;
    name: string;
    enabled: boolean;
    sort: number;
  }>;
  detailTopAdSlotKey?: string;
  detailInlineAdSlotKey?: string;
  detailBottomAdSlotKey?: string;
  seoFaqEnabled?: boolean;
  seoFaqTitle?: string;
  seoFaqLines?: string;
  seoLongTailEnabled?: boolean;
  seoLongTailTitle?: string;
  seoLongTailKeywords?: string | string[];
  seoSchemaEnabled?: boolean;
  seoCanonicalEnabled?: boolean;
  seoNoindexEnabled?: boolean;
  screenshotsEnabled: boolean;
  thumbnailLayoutStyle?: 'device' | 'split' | 'carousel';
  thumbnailSplitSideCount?: number;
  thumbnailCarouselThumbCount?: number;
  previewSnapshotEnabled?: boolean;
  previewSnapshotTimeoutMs?: number;
  previewSnapshotCacheTtlSeconds?: number;
  previewSnapshotAllowFallbackMshots?: boolean;
  ratingsEnabled: boolean;
  commentsEnabled: boolean;
  sharingEnabled: boolean;
  shareText?: string;
  shareChannels?: Array<{
    key: string;
    name: string;
    enabled: boolean;
    sort: number;
    icon?: string;
  }>;
  visitArrowEnabled: boolean;
  visitArrowText: string;
  copyrightEnabled: boolean;
  copyrightText: string;
  copyrightLink: string;
  disclaimerEnabled: boolean;
  disclaimerText: string;
  reportEnabled: boolean;
  reportText: string;
  reportEmail: string;
  visitBtnText: string;
  visitBtnNewWindow: boolean;
}

// 文章配置
export interface ArticleConfig {
  enabled: boolean;
  homeSectionEnabled: boolean;
  homeSectionTitle: string;
  homeSectionSubtitle: string;
  homeSectionLimit: number;
  listPageTitle: string;
  listPageDescription: string;
  listPageCoverImage: string;
  detailLayoutWidthMode: 'contained' | 'wide' | 'fluid';
  detailContentMaxWidth: number;
  detailHeaderAlign: 'left' | 'center';
  detailSidebarEnabled: boolean;
  detailSidebarSticky: boolean;
  detailSidebarTopOffset: number;
  detailSidebarLinksNewWindow: boolean;
  detailSidebarLatestArticlesTitle: string;
  detailSidebarLatestArticlesCount: number;
  detailSidebarHotWebsitesTitle: string;
  detailSidebarHotWebsitesCount: number;
  detailSidebarTagsTitle: string;
  detailSidebarModules: Array<{
    key: string;
    name: string;
    enabled: boolean;
    sort: number;
  }>;
  commentsEnabled: boolean;
  topicsEnabled: boolean;
}

// 文章专题配置
export interface ArticleTopicConfig {
  id: string;
  type: 'category' | 'tag';
  title: string;
  description: string;
  coverImage?: string;
  icon?: string;
  themeColor?: string;
}

export type ArticleTopicsConfig = Record<string, ArticleTopicConfig>;

// 登录/注册/个人中心配置
export interface AuthConfig {
  enable_register: number;
  enable_login: number;
  enable_user_center: number;
  register_close_message: string;
  login_close_message: string;
  user_center_close_message: string;
}

// 公开设置（所有配置的集合）
export interface PublicSettings {
  authConfig: AuthConfig;
  siteInfo: SiteInfo;
  appearance: AppearanceConfig;
  homepage: HomepageConfig;
  pageGlobal: PageGlobalConfig;
  cardStyle: CardStyleConfig;
  sidebar: SidebarConfig;
  search: SearchConfig;
  exitModal: ExitModalConfig;
  detailPage: DetailPageConfig;
  article: ArticleConfig;
  articleTopics: ArticleTopicsConfig;
}

interface PublicSettingsPayload {
  authConfig?: Partial<AuthConfig>;
  siteInfo?: SiteInfo;
  appearance?: AppearanceConfig;
  homepage?: HomepageConfig;
  pageGlobal?: PageGlobalConfig;
  cardStyle?: CardStyleConfig;
  sidebar?: SidebarConfig;
  search?: SearchConfig;
  exitModal?: ExitModalConfig;
  detailPage?: DetailPageConfig;
  article?: ArticleConfig;
  articleTopics?: ArticleTopicsConfig;
  popup?: ExitModalConfig;
}

export interface FrontendConfigPayload {
  authConfig?: Partial<AuthConfig>;
  exitModalEnabled?: boolean;
  exitModalConfig?: ExitModalConfig;
  popupConfig?: ExitModalConfig;
  pageGlobalConfig?: PageGlobalConfig;
  appearanceConfig?: AppearanceConfig;
  homepageConfig?: HomepageConfig;
  cardStyleConfig?: CardStyleConfig;
  sidebarConfig?: SidebarConfig;
  searchConfig?: SearchConfig;
}

// ==================== 默认配置 ====================

export const DEFAULT_SITE_INFO: SiteInfo = {
  siteName: 'UIED 导航',
  siteTitle: '设计师导航 - 精选设计资源',
  siteDescription: '为设计师精选的优质设计资源导航网站',
  siteKeywords: '设计,UI,导航,资源',
  logo: '/logo-3.svg',
  favicon: '/favicon.ico',
  icp: '',
  copyright: '© 2026 UIED. All Rights Reserved.',
  contactEmail: '',
  analyticsCode: '',
};

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  primaryColor: '#0066ff',
  backgroundColor: '#f6f8fb',
  cardBackgroundColor: '#ffffff',
  textPrimaryColor: '#333333',
  fontFamily: 'Lexend, -apple-system, sans-serif',
  baseFontSize: 16,
  borderRadius: 12,
  contentMaxWidth: 1200,
  customCss: '',
};

export const DEFAULT_HOMEPAGE: HomepageConfig = {
  homePageSlug: '',
  heroBannerEnabled: true,
  heroBgType: 'default',
  heroBgValue: '',
  heroDisplayMode: 'search',
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
  dailyNewDisplayPath: '/p/daily-new',
  dailyNewDisplayPlacements: [ 'nav_quick_entry' ],
  dailyNewDisplaySort: 86,
  dailyNewDisplayOpenInNewTab: false,
  dailyNewDefaultDays: 1,
  dailyNewPageKicker: 'Daily Fresh',
  dailyNewPageTitle: '每日上新网址',
  dailyNewPageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
  navSwitchItems: [...DEFAULT_NAV_SWITCH_ITEMS],
};

export const DEFAULT_PAGE_GLOBAL: PageGlobalConfig = {
  websiteClickMode: 'detail',
  showDirectArrow: false,
  detailPageNewWindow: false,
  directArrowNewWindow: true,
  pageSize: 20,
  hotRecommendationClickMode: 'detail',
  appendRefEnabled: false,
  appendRefValue: '',
  sortZeroNewFirstEnabled: false,
  categorySvgLibrary: [],
};

export const DEFAULT_CARD_STYLE: CardStyleConfig = {
  defaultLayout: 'grid',
  gridColumns: 4,
  showDescription: true,
  maxDescriptionLines: 2,
  showTags: true,
  showFavicon: true,
  showUrl: false,
  hoverEffect: 'translateUp',
};

export const DEFAULT_SIDEBAR: SidebarConfig = {
  enabled: true,
  position: 'left',
  width: 240,
  showCategories: true,
  showCategoryCount: true,
  expandSubCategories: false,
  sticky: true,
};

export const DEFAULT_SEARCH: SearchConfig = {
  enabled: true,
  placeholder: '搜索网站名称...',
  debounceDelay: 300,
  aiSearchEnabled: true,
  aiSearchBtnText: 'AI 搜索',
  highlightKeyword: true,
  resultsPerPage: 20,
};

export const DEFAULT_EXIT_MODAL: ExitModalConfig = {
  enabled: true,
  title: '即将离开本站',
  description: '您即将访问外部网站，请注意安全',
  autoRedirect: true,
  countdown: 5,
  logo: '',
  showAgreementLinks: false,
  userAgreementText: '',
  userAgreementUrl: '',
  copyrightAgreementText: '',
  copyrightAgreementUrl: '',
};

export const DEFAULT_DETAIL_PAGE: DetailPageConfig = {
  pageStylePreset: 'showcase',
  layoutWidthMode: 'contained',
  spacingDensity: 'compact',
  labelVisualStyle: 'soft',
  dataPanelEnabled: true,
  dataPanelTitle: '站点访问数据',
  heroAccentGlassEnabled: true,
  enabled: true,
  relatedTitle: '你可能还喜欢',
  relatedCount: 6,
  relatedMode: 'same_category',
  manualWebsiteIds: '',
  hotWebsitesTitle: '热门网址',
  hotWebsitesCount: 6,
  articlesTitle: '推荐文章',
  articlesCount: 5,
  tagsTitle: '深入探索',
  tagSource: 'website',
  manualTags: '',
  categoryTitle: '相关分类',
  sidebarLinksNewWindow: false,
  sidebarAdSlotKey: 'website_detail_sidebar',
  detailTopAdSlotKey: 'detail_top',
  detailInlineAdSlotKey: 'detail_inline',
  detailBottomAdSlotKey: 'detail_bottom',
  seoFaqEnabled: false,
  seoFaqTitle: '常见问题',
  seoFaqLines: '',
  seoLongTailEnabled: false,
  seoLongTailTitle: '相关搜索',
  seoLongTailKeywords: '',
  seoSchemaEnabled: true,
  seoCanonicalEnabled: true,
  seoNoindexEnabled: false,
  screenshotsEnabled: true,
  thumbnailLayoutStyle: 'device',
  thumbnailSplitSideCount: 2,
  thumbnailCarouselThumbCount: 6,
  previewSnapshotEnabled: true,
  previewSnapshotTimeoutMs: 12000,
  previewSnapshotCacheTtlSeconds: 21600,
  previewSnapshotAllowFallbackMshots: true,
  ratingsEnabled: true,
  commentsEnabled: true,
  sharingEnabled: true,
  shareText: '分享给更多朋友',
  shareChannels: [
    { key: 'wechat', name: '微信', enabled: true, sort: 1, icon: 'wechat' },
    { key: 'weibo', name: '微博', enabled: true, sort: 2, icon: 'weibo' },
    { key: 'qq', name: 'QQ', enabled: true, sort: 3, icon: 'qq' },
    { key: 'qzone', name: 'QQ空间', enabled: true, sort: 4, icon: 'qzone' },
    { key: 'twitter', name: 'Twitter', enabled: true, sort: 5, icon: 'twitter' },
    { key: 'facebook', name: 'Facebook', enabled: true, sort: 6, icon: 'facebook' },
    { key: 'linkedin', name: 'LinkedIn', enabled: false, sort: 7, icon: 'linkedin' },
    { key: 'copylink', name: '复制链接', enabled: true, sort: 8, icon: 'link' },
  ],
  sidebarModules: [
    { key: 'info', name: '网站信息', enabled: true, sort: 1 },
    { key: 'category', name: '分类', enabled: true, sort: 2 },
    { key: 'related', name: '相关推荐', enabled: true, sort: 3 },
    { key: 'hot_websites', name: '热门网址', enabled: true, sort: 4 },
    { key: 'articles', name: '推荐文章', enabled: true, sort: 5 },
    { key: 'tags', name: '标签', enabled: true, sort: 6 },
    { key: 'qrcode', name: '二维码', enabled: false, sort: 7 },
    { key: 'ad', name: '广告位', enabled: false, sort: 8 },
  ],
  visitArrowEnabled: true,
  visitArrowText: '直达网站',
  copyrightEnabled: true,
  copyrightText: '版权归原作者所有',
  copyrightLink: '',
  disclaimerEnabled: true,
  disclaimerText: '本站仅收录和推荐，不对第三方网站内容负责。',
  reportEnabled: true,
  reportText: '如发现违规内容，请发送邮件举报',
  reportEmail: '',
  visitBtnText: '访问网站',
  visitBtnNewWindow: true,
};

export const DEFAULT_ARTICLE_SETTING: ArticleConfig = {
  enabled: true,
  homeSectionEnabled: true,
  homeSectionTitle: '设计文章',
  homeSectionSubtitle: '汇聚优质设计文章，分享前沿设计趋势与实战经验',
  homeSectionLimit: 12,
  listPageTitle: DEFAULT_ARTICLE_UI_CONFIG.title,
  listPageDescription: DEFAULT_ARTICLE_UI_CONFIG.description,
  listPageCoverImage: DEFAULT_ARTICLE_UI_CONFIG.coverImage || '',
  detailLayoutWidthMode: 'contained',
  detailContentMaxWidth: 880,
  detailHeaderAlign: 'center',
  detailSidebarEnabled: true,
  detailSidebarSticky: true,
  detailSidebarTopOffset: 16,
  detailSidebarLinksNewWindow: false,
  detailSidebarLatestArticlesTitle: '最新文章',
  detailSidebarLatestArticlesCount: 6,
  detailSidebarHotWebsitesTitle: '热门网址',
  detailSidebarHotWebsitesCount: 6,
  detailSidebarTagsTitle: '文章标签',
  detailSidebarModules: [
    { key: 'latest_articles', name: '最新文章', enabled: true, sort: 1 },
    { key: 'hot_websites', name: '热门网址', enabled: true, sort: 2 },
    { key: 'article_tags', name: '文章标签', enabled: true, sort: 3 },
  ],
  commentsEnabled: true,
  topicsEnabled: true,
};

export const DEFAULT_ARTICLE_TOPICS: ArticleTopicsConfig = ARTICLE_TOPICS;

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  enable_register: 1,
  enable_login: 1,
  enable_user_center: 1,
  register_close_message: '注册功能暂时关闭',
  login_close_message: '系统维护中，暂时无法登录',
  user_center_close_message: '个人中心功能暂时关闭',
};

// ==================== API 服务 ====================

export const publicSettingService = {
  /**
   * 统一解包后端响应
   * 兼容 `{ code, data, message }` 与直接返回数据两种结构
   */
  unwrapResponseData: <T>(payload: unknown, fallback: T): T => {
    return unwrapApiResponse<T>(payload, fallback);
  },

  /**
   * 规范化分类区域点击模式
   * 兼容历史值：directExternal -> direct
   */
  normalizeWebsiteClickMode: (mode: unknown): 'detail' | 'direct' => {
    return normalizeWebsiteClickMode(mode);
  },

  /**
   * 规范化热门推荐点击模式
   * 兼容历史值：modal -> detail
   */
  normalizeHotRecommendationClickMode: (mode: unknown): 'detail' | 'direct' => {
    return normalizeHotRecommendationClickMode(mode);
  },

  /**
   * 规范化页面全局配置，确保分类区域与热门推荐配置语义一致且独立
   */
  normalizePageGlobalConfig: (config: unknown): PageGlobalConfig => {
    const mergedConfig = { ...DEFAULT_PAGE_GLOBAL, ...((config as Partial<PageGlobalConfig>) || {}) };
    /**
     * 规范化分类 SVG 图标库，确保 key 与 SVG 内容可用。
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
      websiteClickMode: publicSettingService.normalizeWebsiteClickMode(mergedConfig.websiteClickMode),
      hotRecommendationClickMode: publicSettingService.normalizeHotRecommendationClickMode(mergedConfig.hotRecommendationClickMode),
      appendRefEnabled: mergedConfig.appendRefEnabled === true,
      appendRefValue: String(mergedConfig.appendRefValue || '').trim(),
      sortZeroNewFirstEnabled: mergedConfig.sortZeroNewFirstEnabled === true,
      categorySvgLibrary: normalizedCategorySvgLibrary,
    };
  },

  /**
   * 规范化首页配置，确保轮播/推荐区和导航切换配置结构稳定
   */
  normalizeHomepageConfig: (config: unknown): HomepageConfig => {
    const merged = { ...DEFAULT_HOMEPAGE, ...((config as Partial<HomepageConfig>) || {}) };
    /**
     * 规范化每日上新入口展示位置，限制受控枚举并去重。
     */
    const normalizedDailyNewPlacements = (() => {
      const allowSet = new Set([ 'nav_quick_entry', 'home_menu', 'footer_link' ]);
      const raw = Array.isArray(merged.dailyNewDisplayPlacements)
        ? merged.dailyNewDisplayPlacements
        : [];
      const list = raw
        .map((item) => String(item || '').trim())
        .filter((item) => allowSet.has(item));
      return Array.from(new Set(list));
    })();
    /**
     * 规范化每日上新入口路径，兼容无前导斜杠和外链写法。
     */
    const normalizedDailyNewPath = (() => {
      const rawPath = String(merged.dailyNewDisplayPath || '').trim();
      if (!rawPath) return DEFAULT_HOMEPAGE.dailyNewDisplayPath;
      if (/^(https?:)?\/\//i.test(rawPath)) return rawPath;
      return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    })();
    const normalizedItems = Array.isArray(merged.navSwitchItems)
      ? merged.navSwitchItems
      : DEFAULT_HOMEPAGE.navSwitchItems;
    return {
      ...merged,
      homePageSlug: String(merged.homePageSlug || '').trim(),
      homeCarouselEnabled: merged.homeCarouselEnabled !== false,
      homeRecommendationEnabled: merged.homeRecommendationEnabled !== false,
      homeCarouselSort: Number.isFinite(Number(merged.homeCarouselSort)) ? Number(merged.homeCarouselSort) : DEFAULT_HOMEPAGE.homeCarouselSort,
      homeRecommendationSort: Number.isFinite(Number(merged.homeRecommendationSort)) ? Number(merged.homeRecommendationSort) : DEFAULT_HOMEPAGE.homeRecommendationSort,
      dailyNewEnabled: merged.dailyNewEnabled !== false,
      dailyNewDisplayLabel: String(merged.dailyNewDisplayLabel || DEFAULT_HOMEPAGE.dailyNewDisplayLabel).trim() || DEFAULT_HOMEPAGE.dailyNewDisplayLabel,
      dailyNewDisplayPath: normalizedDailyNewPath,
      dailyNewDisplayPlacements: normalizedDailyNewPlacements.length > 0 ? normalizedDailyNewPlacements : DEFAULT_HOMEPAGE.dailyNewDisplayPlacements,
      dailyNewDisplaySort: Number.isFinite(Number(merged.dailyNewDisplaySort))
        ? Math.max(1, Math.min(9999, Number(merged.dailyNewDisplaySort)))
        : DEFAULT_HOMEPAGE.dailyNewDisplaySort,
      dailyNewDisplayOpenInNewTab: merged.dailyNewDisplayOpenInNewTab === true,
      dailyNewDefaultDays: Number.isFinite(Number(merged.dailyNewDefaultDays))
        ? Math.max(1, Math.min(30, Number(merged.dailyNewDefaultDays)))
        : DEFAULT_HOMEPAGE.dailyNewDefaultDays,
      dailyNewPageKicker: String(merged.dailyNewPageKicker || DEFAULT_HOMEPAGE.dailyNewPageKicker).trim() || DEFAULT_HOMEPAGE.dailyNewPageKicker,
      dailyNewPageTitle: String(merged.dailyNewPageTitle || DEFAULT_HOMEPAGE.dailyNewPageTitle).trim() || DEFAULT_HOMEPAGE.dailyNewPageTitle,
      dailyNewPageDescription: String(
        merged.dailyNewPageDescription || DEFAULT_HOMEPAGE.dailyNewPageDescription
      ).trim() || DEFAULT_HOMEPAGE.dailyNewPageDescription,
      navSwitchItems: normalizedItems
        .map((item, index) => ({
          slug: String(item?.slug || DEFAULT_HOMEPAGE.navSwitchItems[index % DEFAULT_HOMEPAGE.navSwitchItems.length].slug),
          name: String(item?.name || DEFAULT_HOMEPAGE.navSwitchItems[index % DEFAULT_HOMEPAGE.navSwitchItems.length].name),
          icon: String(item?.icon || DEFAULT_HOMEPAGE.navSwitchItems[index % DEFAULT_HOMEPAGE.navSwitchItems.length].icon),
          visible: item?.visible !== false,
          sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        }))
        .sort((a, b) => a.sort - b.sort),
    };
  },

  /**
   * 规范化详情页配置，确保 SEO 开关与排序数组结构稳定
   */
  normalizeDetailPageConfig: (config: unknown): DetailPageConfig => {
    const rawConfig = (config && typeof config === 'object')
      ? (config as Record<string, unknown>)
      : {};
    const merged = { ...DEFAULT_DETAIL_PAGE, ...(rawConfig as Partial<DetailPageConfig>) };
    /**
     * 规范化排序数组，避免旧数据缺失 sort 导致前端渲染顺序异常。
     */
    const normalizeSortableList = <
      T extends { key: string; name: string; enabled: boolean; sort: number; icon?: string }
    >(
      list: unknown,
      fallback: T[]
    ): T[] => {
      const rawList = Array.isArray(list) ? list : [];
      const normalized = rawList
        .filter((item) => String((item as { key?: unknown })?.key || '').trim())
        .map((item, index) => {
          const typed = (item || {}) as Partial<T>;
          return {
            ...(typed as T),
            key: String(typed.key || '').trim(),
            name: String(typed.name || typed.key || ''),
            enabled: typed.enabled !== false,
            sort: Number.isFinite(Number(typed.sort)) ? Number(typed.sort) : index + 1,
          };
        })
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
        .map((item, index) => ({ ...item, sort: index + 1 }));
      return normalized.length > 0 ? normalized as T[] : fallback;
    };
    /**
     * 兼容旧字段：若历史配置仍使用 shareEnabled，则迁移到 sharingEnabled。
     */
    const sharingEnabled = typeof merged.sharingEnabled === 'boolean'
      ? merged.sharingEnabled
      : rawConfig.shareEnabled !== false;
    /**
     * 兼容旧字段：仅当未配置 sidebarModules 时，使用 show* 迁移模块开关。
     */
    const hasExplicitSidebarModules = Array.isArray(rawConfig.sidebarModules)
      && rawConfig.sidebarModules.length > 0;
    const normalizedSidebarModules = normalizeSortableList(
      merged.sidebarModules,
      (DEFAULT_DETAIL_PAGE.sidebarModules || []).map(item => ({ ...item }))
    );
    const migratedSidebarModules = !hasExplicitSidebarModules
      ? normalizedSidebarModules.map((item) => {
          const legacyMap: Record<string, string> = {
            category: 'showCategory',
            related: 'showRelated',
            hot_websites: 'showHotWebsites',
            articles: 'showArticles',
            tags: 'showTags',
          };
          const legacyKey = legacyMap[item.key];
          if (!legacyKey) return item;
          const legacyValue = rawConfig[legacyKey];
          if (typeof legacyValue !== 'boolean') return item;
          return { ...item, enabled: legacyValue };
        })
      : normalizedSidebarModules;
    /**
     * 清理已废弃字段，避免运营后台出现重复开关语义。
     */
    const mergedWithLegacy = merged as DetailPageConfig & Record<string, unknown>;
    const {
      showRelated: _legacyShowRelated,
      showHotWebsites: _legacyShowHotWebsites,
      showArticles: _legacyShowArticles,
      showTags: _legacyShowTags,
      showCategory: _legacyShowCategory,
      shareEnabled: _legacyShareEnabled,
      sidebarAdEnabled: _legacySidebarAdEnabled,
      detailTopAdEnabled: _legacyDetailTopAdEnabled,
      detailInlineAdEnabled: _legacyDetailInlineAdEnabled,
      detailBottomAdEnabled: _legacyDetailBottomAdEnabled,
      favoritesEnabled: _legacyFavoritesEnabled,
      relatedEnabled: _legacyRelatedEnabled,
      tagsEnabled: _legacyTagsEnabled,
      ...cleanConfig
    } = mergedWithLegacy;
    return {
      ...(cleanConfig as DetailPageConfig),
      sharingEnabled: sharingEnabled !== false,
      sidebarAdSlotKey: String(merged.sidebarAdSlotKey || '').trim() || 'website_detail_sidebar',
      detailTopAdSlotKey: String(merged.detailTopAdSlotKey || '').trim() || 'detail_top',
      detailInlineAdSlotKey: String(merged.detailInlineAdSlotKey || '').trim() || 'detail_inline',
      detailBottomAdSlotKey: String(merged.detailBottomAdSlotKey || '').trim() || 'detail_bottom',
      seoCanonicalEnabled: merged.seoCanonicalEnabled !== false,
      seoNoindexEnabled: merged.seoNoindexEnabled === true,
      shareChannels: normalizeSortableList(
        merged.shareChannels,
        (DEFAULT_DETAIL_PAGE.shareChannels || []).map(item => ({ ...item }))
      ),
      sidebarModules: migratedSidebarModules,
    };
  },

  /**
   * 规范化文章配置，保证字段完整可用
   */
  normalizeArticleConfig: (config: unknown): ArticleConfig => {
    const merged = { ...DEFAULT_ARTICLE_SETTING, ...((config as Partial<ArticleConfig>) || {}) };
    const defaultSidebarModules = DEFAULT_ARTICLE_SETTING.detailSidebarModules || [];
    const rawSidebarModules = Array.isArray(merged.detailSidebarModules)
      ? merged.detailSidebarModules
      : [];
    /**
     * 规范化文章详情侧栏模块列表，确保旧配置升级后仍有完整模块。
     */
    const normalizedSidebarModules = (() => {
      const defaultMap = new Map(defaultSidebarModules.map(item => [item.key, item]));
      const existed = new Set<string>();
      const mergedList = rawSidebarModules
        .filter(item => String(item?.key || '').trim())
        .map(item => {
          const key = String(item.key || '').trim();
          existed.add(key);
          const defaultItem = defaultMap.get(key);
          return {
            key,
            name: String(item.name || defaultItem?.name || key),
            enabled: item.enabled !== false,
            sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : 0,
          };
        });
      defaultSidebarModules.forEach(item => {
        if (!existed.has(item.key)) {
          mergedList.push({ ...item });
        }
      });
      return mergedList
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: index + 1 }));
    })();
    const detailLayoutWidthMode = [ 'contained', 'wide', 'fluid' ].includes(String(merged.detailLayoutWidthMode || '').trim())
      ? (String(merged.detailLayoutWidthMode || '').trim() as 'contained' | 'wide' | 'fluid')
      : DEFAULT_ARTICLE_SETTING.detailLayoutWidthMode;
    const detailHeaderAlign = [ 'left', 'center' ].includes(String(merged.detailHeaderAlign || '').trim())
      ? (String(merged.detailHeaderAlign || '').trim() as 'left' | 'center')
      : DEFAULT_ARTICLE_SETTING.detailHeaderAlign;
    return {
      ...merged,
      enabled: merged.enabled !== false,
      homeSectionEnabled: merged.homeSectionEnabled !== false,
      homeSectionLimit: Number.isFinite(Number(merged.homeSectionLimit))
        ? Number(merged.homeSectionLimit)
        : DEFAULT_ARTICLE_SETTING.homeSectionLimit,
      listPageTitle: String(merged.listPageTitle || DEFAULT_ARTICLE_SETTING.listPageTitle),
      listPageDescription: String(merged.listPageDescription || DEFAULT_ARTICLE_SETTING.listPageDescription),
      listPageCoverImage: String(merged.listPageCoverImage || DEFAULT_ARTICLE_SETTING.listPageCoverImage),
      detailLayoutWidthMode,
      detailContentMaxWidth: Number.isFinite(Number(merged.detailContentMaxWidth))
        ? Math.max(680, Math.min(1600, Number(merged.detailContentMaxWidth)))
        : DEFAULT_ARTICLE_SETTING.detailContentMaxWidth,
      detailHeaderAlign,
      detailSidebarEnabled: merged.detailSidebarEnabled !== false,
      detailSidebarSticky: merged.detailSidebarSticky !== false,
      detailSidebarTopOffset: Number.isFinite(Number(merged.detailSidebarTopOffset))
        ? Math.max(0, Math.min(240, Number(merged.detailSidebarTopOffset)))
        : DEFAULT_ARTICLE_SETTING.detailSidebarTopOffset,
      detailSidebarLinksNewWindow: merged.detailSidebarLinksNewWindow === true,
      detailSidebarLatestArticlesTitle: String(
        merged.detailSidebarLatestArticlesTitle || DEFAULT_ARTICLE_SETTING.detailSidebarLatestArticlesTitle
      ),
      detailSidebarLatestArticlesCount: Number.isFinite(Number(merged.detailSidebarLatestArticlesCount))
        ? Math.max(1, Math.min(20, Number(merged.detailSidebarLatestArticlesCount)))
        : DEFAULT_ARTICLE_SETTING.detailSidebarLatestArticlesCount,
      detailSidebarHotWebsitesTitle: String(
        merged.detailSidebarHotWebsitesTitle || DEFAULT_ARTICLE_SETTING.detailSidebarHotWebsitesTitle
      ),
      detailSidebarHotWebsitesCount: Number.isFinite(Number(merged.detailSidebarHotWebsitesCount))
        ? Math.max(1, Math.min(20, Number(merged.detailSidebarHotWebsitesCount)))
        : DEFAULT_ARTICLE_SETTING.detailSidebarHotWebsitesCount,
      detailSidebarTagsTitle: String(
        merged.detailSidebarTagsTitle || DEFAULT_ARTICLE_SETTING.detailSidebarTagsTitle
      ),
      detailSidebarModules: normalizedSidebarModules,
      homeSectionTitle: String(merged.homeSectionTitle || DEFAULT_ARTICLE_SETTING.homeSectionTitle),
      homeSectionSubtitle: String(merged.homeSectionSubtitle || DEFAULT_ARTICLE_SETTING.homeSectionSubtitle),
      commentsEnabled: merged.commentsEnabled !== false,
      topicsEnabled: merged.topicsEnabled !== false,
    };
  },

  /**
   * 规范化文章专题配置，兼容未配置时的默认配置
   */
  normalizeArticleTopicsConfig: (config: unknown): ArticleTopicsConfig => {
    if (!config || typeof config !== 'object') {
      return DEFAULT_ARTICLE_TOPICS;
    }
    const merged = { ...DEFAULT_ARTICLE_TOPICS, ...(config as ArticleTopicsConfig) };
    return Object.keys(merged).reduce<ArticleTopicsConfig>((result, key) => {
      const current = merged[key];
      if (!current || typeof current !== 'object') {
        return result;
      }
      result[key] = {
        id: String(current.id || key),
        type: current.type === 'tag' ? 'tag' : 'category',
        title: String(current.title || ''),
        description: String(current.description || ''),
        coverImage: current.coverImage ? String(current.coverImage) : undefined,
        icon: current.icon ? String(current.icon) : undefined,
        themeColor: current.themeColor ? String(current.themeColor) : undefined,
      };
      return result;
    }, {} as ArticleTopicsConfig);
  },

  getFrontendConfig: async (): Promise<FrontendConfigPayload> => {
    try {
      const response = await api.get('/settings/frontend-config');
      const data = publicSettingService.unwrapResponseData<FrontendConfigPayload>(response.data, {});
      return {
        authConfig: data.authConfig,
        exitModalEnabled: typeof data.exitModalEnabled === 'boolean' ? data.exitModalEnabled : undefined,
        exitModalConfig: data.exitModalConfig || data.popupConfig,
        pageGlobalConfig: data.pageGlobalConfig,
        appearanceConfig: data.appearanceConfig,
        homepageConfig: data.homepageConfig,
        cardStyleConfig: data.cardStyleConfig,
        sidebarConfig: data.sidebarConfig,
        searchConfig: data.searchConfig,
      };
    } catch (error) {
      debugLog.error('获取前端配置失败，回退公开设置:', error);
      return {};
    }
  },

  /**
   * 获取所有公开设置
   */
  getPublicSettings: async (options?: { forceFresh?: boolean }): Promise<PublicSettings> => {
    try {
      const response = await api.get('/settings/public', {
        params: options?.forceFresh ? { _t: Date.now() } : undefined,
      });
      const data = publicSettingService.unwrapResponseData<PublicSettingsPayload>(response.data, {});
      const exitModalConfig = data.exitModal || data.popup;
      const rawAuthConfig = data.authConfig || {};
      const authConfig: AuthConfig = {
        enable_register: rawAuthConfig.enable_register === 0 ? 0 : 1,
        enable_login: rawAuthConfig.enable_login === 0 ? 0 : 1,
        enable_user_center: rawAuthConfig.enable_user_center === 0 ? 0 : 1,
        register_close_message: String(
          rawAuthConfig.register_close_message || DEFAULT_AUTH_CONFIG.register_close_message
        ).trim() || DEFAULT_AUTH_CONFIG.register_close_message,
        login_close_message: String(
          rawAuthConfig.login_close_message || DEFAULT_AUTH_CONFIG.login_close_message
        ).trim() || DEFAULT_AUTH_CONFIG.login_close_message,
        user_center_close_message: String(
          rawAuthConfig.user_center_close_message || DEFAULT_AUTH_CONFIG.user_center_close_message
        ).trim() || DEFAULT_AUTH_CONFIG.user_center_close_message,
      };
      return {
        authConfig,
        siteInfo: data.siteInfo || DEFAULT_SITE_INFO,
        appearance: data.appearance || DEFAULT_APPEARANCE,
        homepage: publicSettingService.normalizeHomepageConfig(data.homepage),
        pageGlobal: publicSettingService.normalizePageGlobalConfig(data.pageGlobal),
        cardStyle: data.cardStyle || DEFAULT_CARD_STYLE,
        sidebar: data.sidebar || DEFAULT_SIDEBAR,
        search: { ...DEFAULT_SEARCH, ...(data.search || {}) },
        exitModal: exitModalConfig || DEFAULT_EXIT_MODAL,
        detailPage: publicSettingService.normalizeDetailPageConfig(data.detailPage),
        article: publicSettingService.normalizeArticleConfig(data.article),
        articleTopics: publicSettingService.normalizeArticleTopicsConfig(data.articleTopics),
      };
    } catch (error) {
      debugLog.error('获取公开设置失败，使用默认配置:', error);
      // 返回默认配置
      return {
        authConfig: DEFAULT_AUTH_CONFIG,
        siteInfo: DEFAULT_SITE_INFO,
        appearance: DEFAULT_APPEARANCE,
        homepage: DEFAULT_HOMEPAGE,
        pageGlobal: DEFAULT_PAGE_GLOBAL,
        cardStyle: DEFAULT_CARD_STYLE,
        sidebar: DEFAULT_SIDEBAR,
        search: DEFAULT_SEARCH,
        exitModal: DEFAULT_EXIT_MODAL,
        detailPage: publicSettingService.normalizeDetailPageConfig(DEFAULT_DETAIL_PAGE),
        article: DEFAULT_ARTICLE_SETTING,
        articleTopics: DEFAULT_ARTICLE_TOPICS,
      };
    }
  },

  /**
   * 获取站点信息
   */
  getSiteInfo: async (): Promise<SiteInfo> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return settings.siteInfo || DEFAULT_SITE_INFO;
    } catch (error) {
      debugLog.error('获取站点信息失败，使用默认配置:', error);
      return DEFAULT_SITE_INFO;
    }
  },

  /**
   * 获取外观配置
   */
  getAppearanceConfig: async (): Promise<AppearanceConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return settings.appearance || DEFAULT_APPEARANCE;
    } catch (error) {
      debugLog.error('获取外观配置失败，使用默认配置:', error);
      return DEFAULT_APPEARANCE;
    }
  },

  /**
   * 获取首页配置
   */
  getHomepageConfig: async (): Promise<HomepageConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return publicSettingService.normalizeHomepageConfig(settings.homepage || DEFAULT_HOMEPAGE);
    } catch (error) {
      debugLog.error('获取首页配置失败，使用默认配置:', error);
      return DEFAULT_HOMEPAGE;
    }
  },

  /**
   * 获取页面配置
   */
  getPageGlobalConfig: async (): Promise<PageGlobalConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return publicSettingService.normalizePageGlobalConfig(settings.pageGlobal || DEFAULT_PAGE_GLOBAL);
    } catch (error) {
      debugLog.error('获取页面配置失败，使用默认配置:', error);
      return DEFAULT_PAGE_GLOBAL;
    }
  },

  /**
   * 获取卡片样式配置
   */
  getCardStyleConfig: async (): Promise<CardStyleConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return settings.cardStyle || DEFAULT_CARD_STYLE;
    } catch (error) {
      debugLog.error('获取卡片样式配置失败，使用默认配置:', error);
      return DEFAULT_CARD_STYLE;
    }
  },

  /**
   * 获取侧边栏配置
   */
  getSidebarConfig: async (): Promise<SidebarConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return settings.sidebar || DEFAULT_SIDEBAR;
    } catch (error) {
      debugLog.error('获取侧边栏配置失败，使用默认配置:', error);
      return DEFAULT_SIDEBAR;
    }
  },

  /**
   * 获取搜索配置
   */
  getSearchConfig: async (): Promise<SearchConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return { ...DEFAULT_SEARCH, ...(settings.search || {}) };
    } catch (error) {
      debugLog.error('获取搜索配置失败，使用默认配置:', error);
      return DEFAULT_SEARCH;
    }
  },

  /**
   * 获取跳转提醒配置
   */
  getExitModalConfig: async (): Promise<ExitModalConfig> => {
    try {
      const settings = await publicSettingService.getPublicSettings();
      return settings.exitModal || DEFAULT_EXIT_MODAL;
    } catch (error) {
      debugLog.error('获取跳转提醒配置失败，使用默认配置:', error);
      return DEFAULT_EXIT_MODAL;
    }
  },

  /**
   * 获取详情页配置
   */
  getDetailPageConfig: async (options?: { forceFresh?: boolean }): Promise<DetailPageConfig> => {
    try {
      const response = await api.get('/settings/detailPageConfig', {
        params: options?.forceFresh ? { _t: Date.now() } : undefined,
      });
      const config = publicSettingService.unwrapResponseData<DetailPageConfig>(
        response.data,
        DEFAULT_DETAIL_PAGE
      );
      return publicSettingService.normalizeDetailPageConfig(config);
    } catch (error) {
      debugLog.error('获取详情页配置失败，使用默认配置:', error);
      return publicSettingService.normalizeDetailPageConfig(DEFAULT_DETAIL_PAGE);
    }
  },
};

export default publicSettingService;
