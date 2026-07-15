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
import {
  DEFAULT_BRAND_CONFIG,
  type BrandConfig,
  type BrandQuickLinkItem,
  type BrandBannerCard,
  type BrandCarouselSlide,
  type BrandRepoLinkItem,
  type BrandPlatformLinkItem,
  type BrandRepoIconKey,
} from '../config/brandConfig';

// ==================== 类型定义 ====================

// 站点信息
export type NavbarLogoDisplayMode = 'icon_text' | 'text' | 'icon';

export interface SiteInfo {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  logo: string;
  navbarLogoDisplayMode: NavbarLogoDisplayMode;
  navbarLogoText: string;
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

// 页面配置
export interface PageGlobalConfig {
  websiteClickMode: 'detail' | 'direct';
  showDirectArrow: boolean;
  detailPageNewWindow: boolean;
  directArrowNewWindow: boolean;
  viewMoreNewWindow: boolean;
  pageSize: number;
  hotRecommendationClickMode: 'detail' | 'direct';
  appendRefEnabled: boolean;
  appendRefValue: string;
  sortZeroNewFirstEnabled?: boolean;
  categoryPaginationThreshold?: number;
  categoryPaginationPageSize?: number;
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
  sidebarSticky?: boolean;
  sidebarTopOffset?: number;
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
  detailVisualStyle: 'editorial' | 'product';
  detailActionRailStyle: 'rail' | 'toolbar';
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

export type WebsiteCompareMetricKey =
  | 'category'
  | 'domain'
  | 'protocol'
  | 'tag_count'
  | 'screenshot_count'
  | 'comment_count'
  | 'rating_count'
  | 'updated_at';

export interface WebsiteCompareMetricConfig {
  key: WebsiteCompareMetricKey;
  label: string;
  enabled: boolean;
  sort: number;
}

export interface WebsiteCompareFaqItem {
  question: string;
  answer: string;
  enabled: boolean;
  sort: number;
}

export interface WebsiteCompareConfig {
  sections: {
    coreDiff: boolean;
    guide: boolean;
    faq: boolean;
    internalLinks: boolean;
    aiAnalysis: boolean;
  };
  copywriting: {
    heroTitleTemplate: string;
    heroDescriptionTemplate: string;
    coreDiffTitle: string;
    guideTitle: string;
    guideDescription: string;
    strengthTemplates: string[];
    cautionTemplates: string[];
    audienceTemplates: string[];
    recommendationTieTemplate: string;
    recommendationLeadTemplate: string;
    faqTitle: string;
    internalLinksTitle: string;
    internalLinksDescription: string;
    aiAnalysisTitle: string;
    aiAnalysisDescription: string;
  };
  metrics: WebsiteCompareMetricConfig[];
  faqItems: WebsiteCompareFaqItem[];
}

export interface McpPageConfig {
  enabled: boolean;
  heroEnabled: boolean;
  heroStyle: 'glass' | 'solid';
  visualPreset: 'minimal' | 'tech';
  pageKicker: string;
  pageTitle: string;
  pageDescription: string;
  showHeroStats: boolean;
  cardStyle: 'elevated' | 'outline';
  density: 'compact' | 'comfortable';
  backgroundMode: 'plain' | 'mesh' | 'grid';
  accentColor: string;
  pageBackgroundColor: string;
  heroBackgroundColor: string;
  heroCoverImage: string;
  cardBorderColor: string;
  cardRadius: number;
  cardShadowEnabled: boolean;
  showOfficialLink: boolean;
  showTagFilter: boolean;
  tagFilterLimit: number;
  showCategoryCount: boolean;
  listPageSize: number;
  maxWidth: number;
  detailHeaderStyle: 'classic' | 'market';
  detailShowRating: boolean;
  detailRatingValue: number;
  detailShowCommand: boolean;
  detailCommandTemplate: string;
  detailShowVersionTag: boolean;
}

export interface FigmaPageConfig {
  enabled: boolean;
  listPageSize: number;
  cardClickAction: 'detail' | 'official_first';
  cardClickNewWindow: boolean;
}

// 登录/注册/个人中心配置
export interface WechatWebsiteLoginPublicConfig {
  enabled: boolean;
  appId: string;
  callbackPath: string;
}

export interface QqLoginPublicConfig {
  enabled: boolean;
  appId: string;
  callbackPath: string;
}

export interface WechatOfficialAccountLoginPublicConfig {
  enabled: boolean;
  appId: string;
  domainVerifyFileName: string;
  scanAutoLoginEnabled: boolean;
  scanAutoLoginPrompt: string;
  oauthCallbackPath: string;
  eventCallbackPath: string;
}

export interface AuthConfig {
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
  wechatWebsiteLogin: WechatWebsiteLoginPublicConfig;
  qqLogin: QqLoginPublicConfig;
  wechatOfficialAccountLogin: WechatOfficialAccountLoginPublicConfig;
}

// 公开设置（所有配置的集合）
export interface PublicSettings {
  authConfig: AuthConfig;
  brand: BrandConfig;
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
  mcpPage: McpPageConfig;
  figmaPage: FigmaPageConfig;
  websiteCompare: WebsiteCompareConfig;
}

interface PublicSettingsPayload {
  authConfig?: Partial<AuthConfig>;
  brand?: Partial<BrandConfig>;
  siteInfo?: Partial<SiteInfo>;
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
  mcpPage?: McpPageConfig;
  figmaPage?: FigmaPageConfig;
  websiteCompare?: WebsiteCompareConfig;
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
  siteName: 'UIED AI工具导航',
  siteTitle: 'UIED AI工具导航 - 精选AI工具与资源平台',
  siteDescription: 'UIED AI导航汇集全球优质AI工具与资源，涵盖AI写作、AI绘画、AI视频、AI办公、AI设计、AI编程等多个领域，帮助设计师、开发者与创作者快速发现和使用高效的人工智能工具。',
  siteKeywords: 'UIED,UIED AI导航,AI导航,AI工具,AI工具导航,人工智能工具,AI写作,AI绘画,AI视频,AI办公,AI设计工具',
  logo: '/logo-3.svg',
  navbarLogoDisplayMode: 'icon_text',
  navbarLogoText: '',
  favicon: '/favicon.ico',
  icp: '',
  copyright: '© 2026 UIED. All Rights Reserved.',
  contactEmail: '',
  analyticsCode: '',
};

/**
 * 规范化头部品牌展示模式，确保前端只消费三种合法值。
 */
const normalizeNavbarLogoDisplayMode = (value: unknown): NavbarLogoDisplayMode => {
  const mode = String(value || '').trim().toLowerCase();
  return mode === 'text' || mode === 'icon' ? mode : 'icon_text';
};

/**
 * 规范化站点信息配置，兼容新增的头部品牌展示字段。
 */
const normalizeSiteInfoConfig = (config: unknown): SiteInfo => {
  const source = config && typeof config === 'object'
    ? (config as Partial<SiteInfo>)
    : {};
  return {
    siteName: String(source.siteName || DEFAULT_SITE_INFO.siteName).trim() || DEFAULT_SITE_INFO.siteName,
    siteTitle: String(source.siteTitle || DEFAULT_SITE_INFO.siteTitle).trim() || DEFAULT_SITE_INFO.siteTitle,
    siteDescription: String(source.siteDescription || DEFAULT_SITE_INFO.siteDescription).trim() || DEFAULT_SITE_INFO.siteDescription,
    siteKeywords: String(source.siteKeywords || DEFAULT_SITE_INFO.siteKeywords).trim() || DEFAULT_SITE_INFO.siteKeywords,
    logo: String(source.logo || DEFAULT_SITE_INFO.logo).trim() || DEFAULT_SITE_INFO.logo,
    navbarLogoDisplayMode: normalizeNavbarLogoDisplayMode(source.navbarLogoDisplayMode),
    navbarLogoText: String(source.navbarLogoText || '').trim().slice(0, 40),
    favicon: String(source.favicon || DEFAULT_SITE_INFO.favicon).trim() || DEFAULT_SITE_INFO.favicon,
    icp: String(source.icp || '').trim(),
    copyright: String(source.copyright || DEFAULT_SITE_INFO.copyright).trim() || DEFAULT_SITE_INFO.copyright,
    contactEmail: String(source.contactEmail || '').trim(),
    analyticsCode: String(source.analyticsCode || '').trim(),
  };
};

export const DEFAULT_APPEARANCE: AppearanceConfig = {
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

export const DEFAULT_HOMEPAGE: HomepageConfig = {
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
  dailyNewDefaultDays: 7,
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
  viewMoreNewWindow: false,
  pageSize: 20,
  hotRecommendationClickMode: 'detail',
  appendRefEnabled: false,
  appendRefValue: '',
  sortZeroNewFirstEnabled: false,
  categoryPaginationThreshold: 120,
  categoryPaginationPageSize: 24,
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
  sidebarSticky: true,
  sidebarTopOffset: 16,
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
  detailVisualStyle: 'editorial',
  detailActionRailStyle: 'rail',
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

export const DEFAULT_WEBSITE_COMPARE: WebsiteCompareConfig = {
  sections: {
    coreDiff: true,
    guide: true,
    faq: true,
    internalLinks: true,
    aiAnalysis: true,
  },
  copywriting: {
    heroTitleTemplate: '{left} 和 {right} 哪个好？有什么区别和优缺点？',
    heroDescriptionTemplate: '对比 {left} 和 {right} 的基础信息、分类、标签、截图与更新时间，帮助你更快判断哪个网站更适合你的使用场景。',
    coreDiffTitle: '核心差异对比',
    guideTitle: '优缺点速览与适用人群',
    guideDescription: '基于站点公开信息自动生成结构化建议，辅助快速决策。',
    strengthTemplates: [
      '{website} 的定位更偏向「{category}」场景，适合目标明确时快速筛选。',
      '从标签覆盖看，{website} 更接近 {top_tags} 等方向，功能边界相对清晰。',
      '如果你更关注 {top_tags} 这类需求，{website} 更值得优先试用。',
      '当前公开信息结构较完整，适合先纳入候选清单做进一步体验。',
    ],
    cautionTemplates: [
      '建议结合官网实际体验确认 {website} 的核心功能与上手门槛。',
      '如果你更看重深度文档或社区反馈，建议再补充外部资料验证。',
      '在最终选择前，最好把 {website} 与同类工具的价格、更新频率一起比较。',
      '若你的需求偏离「{category}」方向，建议再看一轮备选方案。',
    ],
    audienceTemplates: [
      '适合正在寻找「{category}」相关资源的用户。',
      '适合关注 {top_tags} 等方向的从业者或团队。',
      '如果你希望先快速筛一轮候选站点，{website} 适合作为首批试用对象。',
    ],
    recommendationTieTemplate: '两者公开信息量接近，建议优先根据具体功能场景和实际体验来决策。',
    recommendationLeadTemplate: '从当前收录信息完整度看，{winner} 的公开信息更丰富，适合先作为优先试用方案。',
    faqTitle: '常见问题',
    internalLinksTitle: '更多候选对比（内链）',
    internalLinksDescription: '基于分类与标签自动推荐，持续扩展对比页覆盖的长尾词。',
    aiAnalysisTitle: 'AI 分析对比（可选）',
    aiAnalysisDescription: '基于当前公开信息生成对比结论、适用人群与选择建议。',
  },
  metrics: [
    { key: 'category', label: '分类', enabled: true, sort: 10 },
    { key: 'domain', label: '域名', enabled: true, sort: 20 },
    { key: 'protocol', label: '协议', enabled: true, sort: 30 },
    { key: 'tag_count', label: '标签数量', enabled: true, sort: 40 },
    { key: 'screenshot_count', label: '截图数量', enabled: true, sort: 50 },
    { key: 'comment_count', label: '评论数', enabled: true, sort: 60 },
    { key: 'rating_count', label: '评分人数', enabled: true, sort: 70 },
    { key: 'updated_at', label: '最近更新', enabled: true, sort: 80 },
  ],
  faqItems: [
    {
      question: '{left} 和 {right} 哪个更适合新手？',
      answer: '建议先从功能定位、界面复杂度和你的使用目标来判断。',
      enabled: true,
      sort: 10,
    },
    {
      question: '{left} 和 {right} 的主要区别是什么？',
      answer: '通常差异体现在功能定位、内容风格、更新频率与使用门槛。',
      enabled: true,
      sort: 20,
    },
    {
      question: '怎么选择 {left} 或 {right}？',
      answer: '优先选择标签和分类更匹配的站点，再结合实际体验做最终决策。',
      enabled: true,
      sort: 30,
    },
  ],
};

export const DEFAULT_MCP_PAGE: McpPageConfig = {
  enabled: true,
  heroEnabled: true,
  heroStyle: 'glass',
  visualPreset: 'minimal',
  pageKicker: 'MCP HUB',
  pageTitle: 'MCP 中心',
  pageDescription: '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。',
  showHeroStats: true,
  cardStyle: 'elevated',
  density: 'comfortable',
  backgroundMode: 'mesh',
  accentColor: '#2563eb',
  pageBackgroundColor: '#f2f6ff',
  heroBackgroundColor: '#eef4ff',
  heroCoverImage: '',
  cardBorderColor: '#dbe4ff',
  cardRadius: 16,
  cardShadowEnabled: false,
  showOfficialLink: true,
  showTagFilter: true,
  tagFilterLimit: 20,
  showCategoryCount: true,
  listPageSize: 12,
  maxWidth: 1280,
  detailHeaderStyle: 'classic',
  detailShowRating: true,
  detailRatingValue: 0,
  detailShowCommand: true,
  detailCommandTemplate: '',
  detailShowVersionTag: true,
};

export const DEFAULT_FIGMA_PAGE: FigmaPageConfig = {
  enabled: true,
  listPageSize: 24,
  cardClickAction: 'official_first',
  cardClickNewWindow: true,
};

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
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

/**
 * 公开设置缓存 TTL（毫秒）。
 * 说明：用于降低页面切换时重复请求 `/api/settings/public` 的频率，减少被网关/WAF 误判风险。
 */
const PUBLIC_SETTINGS_CACHE_TTL = 60 * 1000;
/**
 * 公开设置内存缓存。
 */
let publicSettingsCache: PublicSettings | null = null;
/**
 * 公开设置缓存时间戳。
 */
let publicSettingsCacheAt = 0;
/**
 * 公开设置进行中的请求 Promise（并发去重）。
 */
let publicSettingsPendingPromise: Promise<PublicSettings> | null = null;

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
  },

  /**
   * 规范化首页配置，确保轮播/推荐区和导航切换配置结构稳定
   */
  normalizeHomepageConfig: (config: unknown): HomepageConfig => {
    const merged = { ...DEFAULT_HOMEPAGE, ...((config as Partial<HomepageConfig>) || {}) };
    /**
     * 规范化 Hero 图标点击模式，仅允许 direct/detail。
     */
    const normalizedHeroIconClickMode = String(merged.heroIconClickMode || '').trim() === 'detail'
      ? 'detail'
      : 'direct';
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
      heroIconClickMode: normalizedHeroIconClickMode,
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
   * 规范化品牌与默认内容配置，确保安装页、404、登录弹窗、首页兜底内容与更新记录页可统一消费。
   */
  normalizeBrandConfig: (config: unknown): BrandConfig => {
    const merged = { ...DEFAULT_BRAND_CONFIG, ...((config as Partial<BrandConfig>) || {}) };
    const normalizeText = (value: unknown, fallback: string): string => {
      return String(value || '').trim() || fallback;
    };
    const normalizeUrl = (value: unknown, fallback = ''): string => {
      const text = String(value || '').trim();
      return text || fallback;
    };
    /**
     * 规范化 404 快捷入口，支持站内相对路径与外链两种模式。
     */
    const normalizeQuickLinks = (value: unknown): BrandQuickLinkItem[] => {
      if (Array.isArray(value) && value.length === 0) return [];
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const fallback = DEFAULT_BRAND_CONFIG.notFoundQuickLinks[index % DEFAULT_BRAND_CONFIG.notFoundQuickLinks.length];
          const label = normalizeText((item as BrandQuickLinkItem | undefined)?.label, fallback?.label || '');
          const to = normalizeUrl((item as BrandQuickLinkItem | undefined)?.to, fallback?.to || '');
          if (!label || !to) return null;
          return {
            label,
            to,
            newWindow: (item as BrandQuickLinkItem | undefined)?.newWindow === true,
          };
        })
        .filter((item): item is BrandQuickLinkItem => Boolean(item));
      return normalized.length > 0 ? normalized : DEFAULT_BRAND_CONFIG.notFoundQuickLinks;
    };
    /**
     * 规范化首页 Banner 兜底卡片，未配置时返回空数组以避免继续展示演示内容。
     */
    const normalizeBannerCards = (value: unknown): BrandBannerCard[] => {
      const rawList = Array.isArray(value) ? value : [];
      return rawList
        .map((item, index) => {
          const title = String((item as BrandBannerCard | undefined)?.title || '').trim();
          const link = normalizeUrl((item as BrandBannerCard | undefined)?.link);
          if (!title || !link) return null;
          return {
            id: normalizeText((item as BrandBannerCard | undefined)?.id, `brand-banner-${index + 1}`),
            title,
            description: String((item as BrandBannerCard | undefined)?.description || '').trim(),
            link,
            badge: String((item as BrandBannerCard | undefined)?.badge || '').trim(),
            color: normalizeText((item as BrandBannerCard | undefined)?.color, index % 2 === 0 ? '#2563eb' : '#0f766e'),
            newWindow: (item as BrandBannerCard | undefined)?.newWindow !== false,
          };
        })
        .filter((item): item is BrandBannerCard => Boolean(item));
    };
    /**
     * 规范化首页轮播兜底内容，未配置时返回空数组以避免继续展示演示素材。
     */
    const normalizeCarouselSlides = (value: unknown): BrandCarouselSlide[] => {
      const rawList = Array.isArray(value) ? value : [];
      return rawList
        .map((item, index) => {
          const title = String((item as BrandCarouselSlide | undefined)?.title || '').trim();
          const image = String((item as BrandCarouselSlide | undefined)?.image || '').trim();
          const link = normalizeUrl((item as BrandCarouselSlide | undefined)?.link);
          if (!title || !image || !link) return null;
          return {
            id: normalizeText((item as BrandCarouselSlide | undefined)?.id, `brand-carousel-${index + 1}`),
            title,
            subtitle: String((item as BrandCarouselSlide | undefined)?.subtitle || '').trim(),
            image,
            link,
            newWindow: (item as BrandCarouselSlide | undefined)?.newWindow !== false,
          };
        })
        .filter((item): item is BrandCarouselSlide => Boolean(item));
    };
    /**
     * 规范化更新记录页仓库链接，限制在受控图标枚举内。
     */
    const normalizeRepoLinks = (value: unknown): BrandRepoLinkItem[] => {
      if (Array.isArray(value) && value.length === 0) return [];
      const iconAllowSet = new Set<BrandRepoIconKey>([ 'github', 'gitee', 'csdn', 'uied' ]);
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const fallback = DEFAULT_BRAND_CONFIG.changelogRepoLinks[index % DEFAULT_BRAND_CONFIG.changelogRepoLinks.length];
          const name = normalizeText((item as BrandRepoLinkItem | undefined)?.name, fallback?.name || '');
          const url = normalizeUrl((item as BrandRepoLinkItem | undefined)?.url, fallback?.url || '');
          const iconKey = String((item as BrandRepoLinkItem | undefined)?.iconKey || fallback?.iconKey || 'github').trim() as BrandRepoIconKey;
          if (!name || !url) return null;
          return {
            name,
            url,
            iconKey: iconAllowSet.has(iconKey) ? iconKey : 'github',
          };
        })
        .filter((item): item is BrandRepoLinkItem => Boolean(item));
      return normalized.length > 0 ? normalized : DEFAULT_BRAND_CONFIG.changelogRepoLinks;
    };
    /**
     * 规范化更新记录页平台链接，空值时回退品牌默认链接组。
     */
    const normalizePlatformLinks = (value: unknown): BrandPlatformLinkItem[] => {
      if (Array.isArray(value) && value.length === 0) return [];
      const rawList = Array.isArray(value) ? value : [];
      const normalized = rawList
        .map((item, index) => {
          const fallback = DEFAULT_BRAND_CONFIG.changelogPlatformLinks[index % DEFAULT_BRAND_CONFIG.changelogPlatformLinks.length];
          const name = normalizeText((item as BrandPlatformLinkItem | undefined)?.name, fallback?.name || '');
          const url = normalizeUrl((item as BrandPlatformLinkItem | undefined)?.url, fallback?.url || '');
          if (!name || !url) return null;
          return { name, url };
        })
        .filter((item): item is BrandPlatformLinkItem => Boolean(item));
      return normalized.length > 0 ? normalized : DEFAULT_BRAND_CONFIG.changelogPlatformLinks;
    };

    return {
      ...merged,
      brandName: normalizeText(merged.brandName, DEFAULT_BRAND_CONFIG.brandName),
      officialSiteUrl: normalizeUrl(merged.officialSiteUrl, DEFAULT_BRAND_CONFIG.officialSiteUrl),
      buyUrl: normalizeUrl(merged.buyUrl, DEFAULT_BRAND_CONFIG.buyUrl),
      supportUrl: normalizeUrl(merged.supportUrl, DEFAULT_BRAND_CONFIG.supportUrl),
      supportLabel: normalizeText(merged.supportLabel, DEFAULT_BRAND_CONFIG.supportLabel),
      supportQq: String(merged.supportQq || '').trim(),
      supportQqGroup: String(merged.supportQqGroup || '').trim(),
      installPageTitle: normalizeText(merged.installPageTitle, DEFAULT_BRAND_CONFIG.installPageTitle),
      installPageDescription: normalizeText(merged.installPageDescription, DEFAULT_BRAND_CONFIG.installPageDescription),
      installSiteName: normalizeText(merged.installSiteName, DEFAULT_BRAND_CONFIG.installSiteName),
      installSiteTitle: normalizeText(merged.installSiteTitle, DEFAULT_BRAND_CONFIG.installSiteTitle),
      installSiteDescription: normalizeText(merged.installSiteDescription, DEFAULT_BRAND_CONFIG.installSiteDescription),
      installSiteKeywords: normalizeText(merged.installSiteKeywords, DEFAULT_BRAND_CONFIG.installSiteKeywords),
      installAdminNickname: normalizeText(merged.installAdminNickname, DEFAULT_BRAND_CONFIG.installAdminNickname),
      authLogoText: normalizeText(merged.authLogoText, DEFAULT_BRAND_CONFIG.authLogoText),
      authLoginTitle: normalizeText(merged.authLoginTitle, DEFAULT_BRAND_CONFIG.authLoginTitle),
      authLoginSubtitle: normalizeText(merged.authLoginSubtitle, DEFAULT_BRAND_CONFIG.authLoginSubtitle),
      authRegisterTitle: normalizeText(merged.authRegisterTitle, DEFAULT_BRAND_CONFIG.authRegisterTitle),
      authRegisterSubtitle: normalizeText(merged.authRegisterSubtitle, DEFAULT_BRAND_CONFIG.authRegisterSubtitle),
      notFoundTitle: normalizeText(merged.notFoundTitle, DEFAULT_BRAND_CONFIG.notFoundTitle),
      notFoundDescription: normalizeText(merged.notFoundDescription, DEFAULT_BRAND_CONFIG.notFoundDescription),
      notFoundSeoTitle: normalizeText(merged.notFoundSeoTitle, DEFAULT_BRAND_CONFIG.notFoundSeoTitle),
      notFoundSeoDescription: normalizeText(merged.notFoundSeoDescription, DEFAULT_BRAND_CONFIG.notFoundSeoDescription),
      notFoundSeoKeywords: normalizeText(merged.notFoundSeoKeywords, DEFAULT_BRAND_CONFIG.notFoundSeoKeywords),
      notFoundAutoRedirectSeconds: Number.isFinite(Number(merged.notFoundAutoRedirectSeconds))
        ? Math.max(3, Math.min(30, Number(merged.notFoundAutoRedirectSeconds)))
        : DEFAULT_BRAND_CONFIG.notFoundAutoRedirectSeconds,
      notFoundQuickLinks: normalizeQuickLinks(merged.notFoundQuickLinks),
      homeFallbackBannerCards: normalizeBannerCards(merged.homeFallbackBannerCards),
      homeFallbackCarouselSlides: normalizeCarouselSlides(merged.homeFallbackCarouselSlides),
      changelogAuthorName: normalizeText(merged.changelogAuthorName, DEFAULT_BRAND_CONFIG.changelogAuthorName),
      changelogAuthorUrl: normalizeUrl(merged.changelogAuthorUrl, DEFAULT_BRAND_CONFIG.changelogAuthorUrl),
      changelogAuthorDescription: normalizeText(merged.changelogAuthorDescription, DEFAULT_BRAND_CONFIG.changelogAuthorDescription),
      changelogBuyButtonText: normalizeText(merged.changelogBuyButtonText, DEFAULT_BRAND_CONFIG.changelogBuyButtonText),
      changelogRepoLinks: normalizeRepoLinks(merged.changelogRepoLinks),
      changelogPlatformLinks: normalizePlatformLinks(merged.changelogPlatformLinks),
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
      sidebarSticky: merged.sidebarSticky !== false,
      sidebarTopOffset: Number.isFinite(Number(merged.sidebarTopOffset))
        ? Math.max(0, Math.min(240, Number(merged.sidebarTopOffset)))
        : 16,
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
    const detailVisualStyle = [ 'editorial', 'product' ].includes(String(merged.detailVisualStyle || '').trim())
      ? (String(merged.detailVisualStyle || '').trim() as 'editorial' | 'product')
      : DEFAULT_ARTICLE_SETTING.detailVisualStyle;
    const detailActionRailStyle = [ 'rail', 'toolbar' ].includes(String(merged.detailActionRailStyle || '').trim())
      ? (String(merged.detailActionRailStyle || '').trim() as 'rail' | 'toolbar')
      : DEFAULT_ARTICLE_SETTING.detailActionRailStyle;
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
      detailVisualStyle,
      detailActionRailStyle,
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

  /**
   * 规范化搜索配置，统一 AI 搜索文案模板与禁用提示，避免前端多处各自写死。
   */
  normalizeSearchConfig: (config: unknown): SearchConfig => {
    const source = (config && typeof config === 'object')
      ? (config as Partial<SearchConfig>)
      : {};
    const merged = { ...DEFAULT_SEARCH, ...source };
    /**
     * 规范化搜索页热门标签兜底词，兼容数组与多行字符串两种写法。
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
      return normalized.length > 0 ? normalized.slice(0, 20) : DEFAULT_SEARCH.hotSearchTags;
    };
    return {
      enabled: merged.enabled !== false,
      placeholder: String(merged.placeholder || DEFAULT_SEARCH.placeholder).trim() || DEFAULT_SEARCH.placeholder,
      debounceDelay: Number.isFinite(Number(merged.debounceDelay))
        ? Math.max(100, Math.min(2000, Number(merged.debounceDelay)))
        : DEFAULT_SEARCH.debounceDelay,
      websiteSearchEnabled: merged.websiteSearchEnabled !== false,
      articleSearchEnabled: merged.articleSearchEnabled !== false,
      aiSearchEnabled: merged.aiSearchEnabled !== false,
      aiSearchBtnText: String(merged.aiSearchBtnText || DEFAULT_SEARCH.aiSearchBtnText).trim() || DEFAULT_SEARCH.aiSearchBtnText,
      heroTitle: String(merged.heroTitle || DEFAULT_SEARCH.heroTitle).trim() || DEFAULT_SEARCH.heroTitle,
      heroDescriptionTemplate: String(
        merged.heroDescriptionTemplate || DEFAULT_SEARCH.heroDescriptionTemplate
      ).trim() || DEFAULT_SEARCH.heroDescriptionTemplate,
      heroHighlightText: String(merged.heroHighlightText || DEFAULT_SEARCH.heroHighlightText).trim()
        || DEFAULT_SEARCH.heroHighlightText,
      hotSearchTags: normalizeHotSearchTags(merged.hotSearchTags),
      searchDisabledText: String(merged.searchDisabledText || DEFAULT_SEARCH.searchDisabledText).trim() || DEFAULT_SEARCH.searchDisabledText,
      aiSearchDisabledText: String(merged.aiSearchDisabledText || DEFAULT_SEARCH.aiSearchDisabledText).trim()
        || DEFAULT_SEARCH.aiSearchDisabledText,
      aiResultSummaryTemplate: String(merged.aiResultSummaryTemplate || DEFAULT_SEARCH.aiResultSummaryTemplate).trim()
        || DEFAULT_SEARCH.aiResultSummaryTemplate,
      aiKeywordResultSummaryTemplate: String(
        merged.aiKeywordResultSummaryTemplate || DEFAULT_SEARCH.aiKeywordResultSummaryTemplate
      ).trim() || DEFAULT_SEARCH.aiKeywordResultSummaryTemplate,
      aiSemanticResultSummaryTemplate: String(
        merged.aiSemanticResultSummaryTemplate || DEFAULT_SEARCH.aiSemanticResultSummaryTemplate
      ).trim() || DEFAULT_SEARCH.aiSemanticResultSummaryTemplate,
      aiNoResultText: String(merged.aiNoResultText || DEFAULT_SEARCH.aiNoResultText).trim() || DEFAULT_SEARCH.aiNoResultText,
      aiFallbackErrorText: String(merged.aiFallbackErrorText || DEFAULT_SEARCH.aiFallbackErrorText).trim()
        || DEFAULT_SEARCH.aiFallbackErrorText,
      aiCacheSuffixText: String(merged.aiCacheSuffixText || DEFAULT_SEARCH.aiCacheSuffixText).trim() || DEFAULT_SEARCH.aiCacheSuffixText,
      highlightKeyword: merged.highlightKeyword !== false,
      resultsPerPage: Number.isFinite(Number(merged.resultsPerPage))
        ? Math.max(10, Math.min(100, Number(merged.resultsPerPage)))
        : DEFAULT_SEARCH.resultsPerPage,
    };
  },

  /**
   * 规范化网站对比配置，确保区块开关、指标项与 FAQ 数据结构稳定。
   */
  normalizeWebsiteCompareConfig: (config: unknown): WebsiteCompareConfig => {
    const source = (config && typeof config === 'object')
      ? (config as Partial<WebsiteCompareConfig>)
      : {};
    const mergedSections = {
      ...DEFAULT_WEBSITE_COMPARE.sections,
      ...(source.sections || {}),
    };
    const mergedCopywriting = {
      ...DEFAULT_WEBSITE_COMPARE.copywriting,
      ...(source.copywriting || {}),
    };
    /**
     * 规范化模板列表，兼容数组或多行字符串。
     */
    const normalizeTemplateList = (value: unknown, fallback: string[], max: number = 6): string[] => {
      const sourceList = Array.isArray(value)
        ? value
        : String(value || '')
          .split(/\r?\n/)
          .map((item) => String(item || '').trim())
          .filter(Boolean);
      const normalized = sourceList
        .map((item) => String(item || '').trim().slice(0, 200))
        .filter(Boolean);
      return normalized.length > 0 ? normalized.slice(0, max) : fallback.slice(0, max);
    };
    const allowMetricKeys = new Set<WebsiteCompareMetricKey>([
      'category',
      'domain',
      'protocol',
      'tag_count',
      'screenshot_count',
      'comment_count',
      'rating_count',
      'updated_at',
    ]);
    const normalizedMetrics = (Array.isArray(source.metrics) ? source.metrics : DEFAULT_WEBSITE_COMPARE.metrics)
      .map((item, index) => {
        const key = String(item?.key || '').trim() as WebsiteCompareMetricKey;
        if (!allowMetricKeys.has(key)) return null;
        return {
          key,
          label: String(item?.label || key).trim() || key,
          enabled: item?.enabled !== false,
          sort: Number.isFinite(Number(item?.sort)) ? Number(item?.sort) : (index + 1) * 10,
        };
      })
      .filter((item): item is WebsiteCompareMetricConfig => Boolean(item))
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: (index + 1) * 10 }));
    const normalizedFaqItems = (Array.isArray(source.faqItems) ? source.faqItems : DEFAULT_WEBSITE_COMPARE.faqItems)
      .map((item, index) => ({
        question: String(item?.question || '').trim().slice(0, 160),
        answer: String(item?.answer || '').trim().slice(0, 1200),
        enabled: item?.enabled !== false,
        sort: Number.isFinite(Number(item?.sort)) ? Number(item?.sort) : (index + 1) * 10,
      }))
      .filter((item) => Boolean(item.question && item.answer))
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: (index + 1) * 10 }));
    return {
      sections: {
        coreDiff: mergedSections.coreDiff !== false,
        guide: mergedSections.guide !== false,
        faq: mergedSections.faq !== false,
        internalLinks: mergedSections.internalLinks !== false,
        aiAnalysis: mergedSections.aiAnalysis !== false,
      },
      copywriting: {
        heroTitleTemplate: String(mergedCopywriting.heroTitleTemplate || DEFAULT_WEBSITE_COMPARE.copywriting.heroTitleTemplate).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.heroTitleTemplate,
        heroDescriptionTemplate: String(
          mergedCopywriting.heroDescriptionTemplate || DEFAULT_WEBSITE_COMPARE.copywriting.heroDescriptionTemplate
        ).trim() || DEFAULT_WEBSITE_COMPARE.copywriting.heroDescriptionTemplate,
        coreDiffTitle: String(mergedCopywriting.coreDiffTitle || DEFAULT_WEBSITE_COMPARE.copywriting.coreDiffTitle).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.coreDiffTitle,
        guideTitle: String(mergedCopywriting.guideTitle || DEFAULT_WEBSITE_COMPARE.copywriting.guideTitle).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.guideTitle,
        guideDescription: String(mergedCopywriting.guideDescription || DEFAULT_WEBSITE_COMPARE.copywriting.guideDescription).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.guideDescription,
        strengthTemplates: normalizeTemplateList(
          mergedCopywriting.strengthTemplates,
          DEFAULT_WEBSITE_COMPARE.copywriting.strengthTemplates,
          6
        ),
        cautionTemplates: normalizeTemplateList(
          mergedCopywriting.cautionTemplates,
          DEFAULT_WEBSITE_COMPARE.copywriting.cautionTemplates,
          6
        ),
        audienceTemplates: normalizeTemplateList(
          mergedCopywriting.audienceTemplates,
          DEFAULT_WEBSITE_COMPARE.copywriting.audienceTemplates,
          6
        ),
        recommendationTieTemplate: String(
          mergedCopywriting.recommendationTieTemplate || DEFAULT_WEBSITE_COMPARE.copywriting.recommendationTieTemplate
        ).trim() || DEFAULT_WEBSITE_COMPARE.copywriting.recommendationTieTemplate,
        recommendationLeadTemplate: String(
          mergedCopywriting.recommendationLeadTemplate || DEFAULT_WEBSITE_COMPARE.copywriting.recommendationLeadTemplate
        ).trim() || DEFAULT_WEBSITE_COMPARE.copywriting.recommendationLeadTemplate,
        faqTitle: String(mergedCopywriting.faqTitle || DEFAULT_WEBSITE_COMPARE.copywriting.faqTitle).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.faqTitle,
        internalLinksTitle: String(mergedCopywriting.internalLinksTitle || DEFAULT_WEBSITE_COMPARE.copywriting.internalLinksTitle).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.internalLinksTitle,
        internalLinksDescription: String(
          mergedCopywriting.internalLinksDescription || DEFAULT_WEBSITE_COMPARE.copywriting.internalLinksDescription
        ).trim() || DEFAULT_WEBSITE_COMPARE.copywriting.internalLinksDescription,
        aiAnalysisTitle: String(mergedCopywriting.aiAnalysisTitle || DEFAULT_WEBSITE_COMPARE.copywriting.aiAnalysisTitle).trim()
          || DEFAULT_WEBSITE_COMPARE.copywriting.aiAnalysisTitle,
        aiAnalysisDescription: String(
          mergedCopywriting.aiAnalysisDescription || DEFAULT_WEBSITE_COMPARE.copywriting.aiAnalysisDescription
        ).trim() || DEFAULT_WEBSITE_COMPARE.copywriting.aiAnalysisDescription,
      },
      metrics: normalizedMetrics.length > 0 ? normalizedMetrics : DEFAULT_WEBSITE_COMPARE.metrics,
      faqItems: normalizedFaqItems.length > 0 ? normalizedFaqItems : DEFAULT_WEBSITE_COMPARE.faqItems,
    };
  },

  /**
   * 规范化 MCP 页面配置，确保页面样式与筛选交互在售卖版下可稳定回放。
   */
  normalizeMcpPageConfig: (config: unknown): McpPageConfig => {
    const source = (config && typeof config === 'object')
      ? (config as Partial<McpPageConfig>)
      : {};
    const merged = { ...DEFAULT_MCP_PAGE, ...source };
    const heroStyle = String(merged.heroStyle || '').trim().toLowerCase();
    const visualPreset = String(merged.visualPreset || '').trim().toLowerCase();
    const cardStyle = String(merged.cardStyle || '').trim().toLowerCase();
    const density = String(merged.density || '').trim().toLowerCase();
    const backgroundMode = String(merged.backgroundMode || '').trim().toLowerCase();
    const detailHeaderStyle = String(merged.detailHeaderStyle || '').trim().toLowerCase();
    /**
     * 规范化十六进制色值，避免注入非法字符串到 CSS 变量。
     */
    const normalizeColor = (value: unknown, fallback: string): string => {
      const text = String(value || '').trim();
      return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text) ? text : fallback;
    };
    return {
      enabled: merged.enabled !== false,
      heroEnabled: merged.heroEnabled !== false,
      heroStyle: heroStyle === 'solid' ? 'solid' : 'glass',
      visualPreset: visualPreset === 'tech' ? 'tech' : 'minimal',
      pageKicker: String(merged.pageKicker || DEFAULT_MCP_PAGE.pageKicker).trim() || DEFAULT_MCP_PAGE.pageKicker,
      pageTitle: String(merged.pageTitle || DEFAULT_MCP_PAGE.pageTitle).trim() || DEFAULT_MCP_PAGE.pageTitle,
      pageDescription: String(merged.pageDescription || DEFAULT_MCP_PAGE.pageDescription).trim() || DEFAULT_MCP_PAGE.pageDescription,
      showHeroStats: merged.showHeroStats !== false,
      cardStyle: cardStyle === 'outline' ? 'outline' : 'elevated',
      density: density === 'compact' ? 'compact' : 'comfortable',
      backgroundMode: backgroundMode === 'plain' || backgroundMode === 'grid' ? backgroundMode : 'mesh',
      accentColor: normalizeColor(merged.accentColor, DEFAULT_MCP_PAGE.accentColor),
      pageBackgroundColor: normalizeColor(merged.pageBackgroundColor, DEFAULT_MCP_PAGE.pageBackgroundColor),
      heroBackgroundColor: normalizeColor(merged.heroBackgroundColor, DEFAULT_MCP_PAGE.heroBackgroundColor),
      heroCoverImage: String(merged.heroCoverImage || '').trim().slice(0, 1000),
      cardBorderColor: normalizeColor(merged.cardBorderColor, DEFAULT_MCP_PAGE.cardBorderColor),
      cardRadius: Number.isFinite(Number(merged.cardRadius))
        ? Math.max(10, Math.min(28, Number(merged.cardRadius)))
        : DEFAULT_MCP_PAGE.cardRadius,
      cardShadowEnabled: merged.cardShadowEnabled === true,
      showOfficialLink: merged.showOfficialLink !== false,
      showTagFilter: merged.showTagFilter !== false,
      tagFilterLimit: Number.isFinite(Number(merged.tagFilterLimit))
        ? Math.max(5, Math.min(60, Number(merged.tagFilterLimit)))
        : DEFAULT_MCP_PAGE.tagFilterLimit,
      showCategoryCount: merged.showCategoryCount !== false,
      listPageSize: Number.isFinite(Number(merged.listPageSize))
        ? Math.max(6, Math.min(48, Number(merged.listPageSize)))
        : DEFAULT_MCP_PAGE.listPageSize,
      maxWidth: Number.isFinite(Number(merged.maxWidth))
        ? Math.max(960, Math.min(1800, Number(merged.maxWidth)))
        : DEFAULT_MCP_PAGE.maxWidth,
      detailHeaderStyle: detailHeaderStyle === 'market' ? 'market' : 'classic',
      detailShowRating: merged.detailShowRating !== false,
      detailRatingValue: Number.isFinite(Number(merged.detailRatingValue))
        ? Math.max(0, Math.min(5, Number(merged.detailRatingValue)))
        : DEFAULT_MCP_PAGE.detailRatingValue,
      detailShowCommand: merged.detailShowCommand !== false,
      detailCommandTemplate: String(merged.detailCommandTemplate || '').trim().slice(0, 400),
      detailShowVersionTag: merged.detailShowVersionTag !== false,
    };
  },

  /**
   * 规范化 Figma 页面配置，确保卡片点击交互与分页参数可控。
   */
  normalizeFigmaPageConfig: (config: unknown): FigmaPageConfig => {
    const source = (config && typeof config === 'object')
      ? (config as Partial<FigmaPageConfig>)
      : {};
    const merged = { ...DEFAULT_FIGMA_PAGE, ...source };
    const cardClickAction = String(merged.cardClickAction || '').trim().toLowerCase();
    return {
      enabled: merged.enabled !== false,
      listPageSize: Number.isFinite(Number(merged.listPageSize))
        ? Math.max(6, Math.min(72, Number(merged.listPageSize)))
        : DEFAULT_FIGMA_PAGE.listPageSize,
      cardClickAction: cardClickAction === 'detail' ? 'detail' : 'official_first',
      cardClickNewWindow: merged.cardClickNewWindow !== false,
    };
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
    const forceFresh = options?.forceFresh === true;
    const now = Date.now();
    const cacheValid = Boolean(publicSettingsCache) && (now - publicSettingsCacheAt) < PUBLIC_SETTINGS_CACHE_TTL;

    if (!forceFresh && cacheValid && publicSettingsCache) {
      return publicSettingsCache;
    }

    if (!forceFresh && publicSettingsPendingPromise) {
      return publicSettingsPendingPromise;
    }

    /**
     * 拉取并规范化公开设置。
     * 说明：统一封装请求与默认值兜底，供缓存与并发去重复用。
     */
    const loadSettings = async (): Promise<PublicSettings> => {
      try {
        const response = await api.get('/settings/public', {
          params: forceFresh ? { _t: Date.now() } : undefined,
        });
        const data = publicSettingService.unwrapResponseData<PublicSettingsPayload>(response.data, {});
        const exitModalConfig = data.exitModal || data.popup;
        const rawAuthConfig = data.authConfig || {};
        /**
         * 规范化个人中心模块开关，避免后端缺字段时前端展示异常。
         */
        const normalizeUserCenterModules = (modules: any) => {
          const source = modules && typeof modules === 'object' ? modules : {};
          const defaults = DEFAULT_AUTH_CONFIG.userCenterModules;
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
          userCenterModules: normalizeUserCenterModules(rawAuthConfig.userCenterModules),
          wechatWebsiteLogin: {
            enabled: rawAuthConfig?.wechatWebsiteLogin?.enabled === true,
            appId: String(
              rawAuthConfig?.wechatWebsiteLogin?.appId
                || DEFAULT_AUTH_CONFIG.wechatWebsiteLogin.appId
            ).trim(),
            callbackPath: String(
              rawAuthConfig?.wechatWebsiteLogin?.callbackPath
                || DEFAULT_AUTH_CONFIG.wechatWebsiteLogin.callbackPath
            ).trim() || DEFAULT_AUTH_CONFIG.wechatWebsiteLogin.callbackPath,
          },
          qqLogin: {
            enabled: rawAuthConfig?.qqLogin?.enabled === true,
            appId: String(
              rawAuthConfig?.qqLogin?.appId
                || DEFAULT_AUTH_CONFIG.qqLogin.appId
            ).trim(),
            callbackPath: String(
              rawAuthConfig?.qqLogin?.callbackPath
                || DEFAULT_AUTH_CONFIG.qqLogin.callbackPath
            ).trim() || DEFAULT_AUTH_CONFIG.qqLogin.callbackPath,
          },
          wechatOfficialAccountLogin: {
            enabled: rawAuthConfig?.wechatOfficialAccountLogin?.enabled === true,
            appId: String(
              rawAuthConfig?.wechatOfficialAccountLogin?.appId
                || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.appId
            ).trim(),
            domainVerifyFileName: String(
              rawAuthConfig?.wechatOfficialAccountLogin?.domainVerifyFileName
                || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.domainVerifyFileName
            ).trim(),
            scanAutoLoginEnabled:
              rawAuthConfig?.wechatOfficialAccountLogin?.scanAutoLoginEnabled === true,
            scanAutoLoginPrompt: String(
              rawAuthConfig?.wechatOfficialAccountLogin?.scanAutoLoginPrompt
                || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.scanAutoLoginPrompt
            ).trim() || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.scanAutoLoginPrompt,
            oauthCallbackPath: String(
              rawAuthConfig?.wechatOfficialAccountLogin?.oauthCallbackPath
                || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.oauthCallbackPath
            ).trim() || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.oauthCallbackPath,
            eventCallbackPath: String(
              rawAuthConfig?.wechatOfficialAccountLogin?.eventCallbackPath
                || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.eventCallbackPath
            ).trim() || DEFAULT_AUTH_CONFIG.wechatOfficialAccountLogin.eventCallbackPath,
          },
        };
        return {
          authConfig,
          brand: publicSettingService.normalizeBrandConfig(data.brand),
          siteInfo: normalizeSiteInfoConfig(data.siteInfo),
          appearance: data.appearance || DEFAULT_APPEARANCE,
          homepage: publicSettingService.normalizeHomepageConfig(data.homepage),
          pageGlobal: publicSettingService.normalizePageGlobalConfig(data.pageGlobal),
          cardStyle: data.cardStyle || DEFAULT_CARD_STYLE,
          sidebar: data.sidebar || DEFAULT_SIDEBAR,
          search: publicSettingService.normalizeSearchConfig(data.search),
          exitModal: exitModalConfig || DEFAULT_EXIT_MODAL,
          detailPage: publicSettingService.normalizeDetailPageConfig(data.detailPage),
          article: publicSettingService.normalizeArticleConfig(data.article),
          articleTopics: publicSettingService.normalizeArticleTopicsConfig(data.articleTopics),
          mcpPage: publicSettingService.normalizeMcpPageConfig(data.mcpPage),
          figmaPage: publicSettingService.normalizeFigmaPageConfig(data.figmaPage),
          websiteCompare: publicSettingService.normalizeWebsiteCompareConfig(data.websiteCompare),
        };
      } catch (error) {
        debugLog.error('获取公开设置失败，使用默认配置:', error);
        return {
          authConfig: DEFAULT_AUTH_CONFIG,
          brand: DEFAULT_BRAND_CONFIG,
          siteInfo: normalizeSiteInfoConfig(DEFAULT_SITE_INFO),
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
          mcpPage: DEFAULT_MCP_PAGE,
          figmaPage: DEFAULT_FIGMA_PAGE,
          websiteCompare: DEFAULT_WEBSITE_COMPARE,
        };
      }
    };

    const requestPromise = (async (): Promise<PublicSettings> => {
      const settings = await loadSettings();
      /**
       * 更新公开设置缓存，避免短时间重复请求触发网关拦截。
       */
      publicSettingsCache = settings;
      publicSettingsCacheAt = Date.now();
      return settings;
    })();

    if (!forceFresh) {
      publicSettingsPendingPromise = requestPromise;
    }

    try {
      return await requestPromise;
    } finally {
      if (!forceFresh) {
        publicSettingsPendingPromise = null;
      }
    }
  },

  /**
   * 获取站点信息
   */
  getSiteInfo: async (options?: { forceFresh?: boolean }): Promise<SiteInfo> => {
    try {
      const settings = await publicSettingService.getPublicSettings(options);
      return normalizeSiteInfoConfig(settings.siteInfo || DEFAULT_SITE_INFO);
    } catch (error) {
      debugLog.error('获取站点信息失败，使用默认配置:', error);
      return normalizeSiteInfoConfig(DEFAULT_SITE_INFO);
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
      return publicSettingService.normalizeSearchConfig(settings.search || DEFAULT_SEARCH);
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
