/**
 * @file DynamicPage/index.tsx
 * @description 动态页面组件 - 从API获取数据并渲染页面
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePageData } from '../../hooks/usePageData';
import { Website, SubCategory } from '../../services/pageService';
import { recordWebsiteClick } from '../../services/api';
import CategorySidebar, { type NavItem, type SidebarConfig } from '../CategorySidebar';
import HeroBanner from '../HeroBanner';
import HotRecommendations from '../HotRecommendations';
import ToolCard from '../ToolCard';
import DesignArticleGrid from '../DesignArticleGrid';
import AdBanner from '../AdBanner';
import SEO from '../SEO';
import { useFrontendConfig } from '../../hooks/useFrontendConfig';
import { usePermalinkConfig, generateWebsiteUrl } from '../../hooks/usePermalinkConfig';
import { getArrowConfigByWebsiteClickMode, appendRefParamToUrl } from '../../utils/clickMode';
import { unwrapApiResponse } from '../../utils/apiResponse';
import { createSvgIconMap } from '../../utils/svgIconLibrary';
import {
  getDailyNewWebsites,
  getDailyNewDisplayConfig,
  type DailyNewWebsiteItem,
  type DailyNewDisplayConfig,
} from '../../services/dailyNewService';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CategorySidebarSkeleton, 
  ToolGridSkeleton,
  HeroBannerSkeleton 
} from '../Skeleton';
import { NavMenuType } from '../../types';
import '../../styles/common.css';

type HeroPageType = 'home' | 'ai' | 'uiux' | 'design' | 'search' | 'threed' | 'ecommerce' | 'interior' | 'font';
type WebsiteWithExtra = Website & { slug?: string; oldId?: string };
type HeroScrollWebsite = { id: string; name: string; iconUrl?: string; url: string; slug?: string };

interface DirectVisitTarget {
  id: string;
  url: string;
  slug?: string;
}

/**
 * 首页“最新网站更新”默认展示最近 7 天数据。
 */
const HOMEPAGE_LATEST_UPDATE_DAYS = 7;
const CATEGORY_SECTION_ID_PREFIX = 'category-';

/**
 * 判断滚动容器是否为 window，便于 TypeScript 做类型收窄。
 */
const isWindowScrollContainer = (container: Window | HTMLElement): container is Window => {
  return typeof window !== 'undefined' && container === window;
};

/**
 * 将页面标识统一映射为 HeroBanner 支持的 pageType。
 */
const resolveHeroPageType = (input: string | NavMenuType | undefined): HeroPageType => {
  const value = String(input || '').toLowerCase();
  if (value === NavMenuType.AI) return 'ai';
  if (value === NavMenuType.UIUX) return 'uiux';
  if (value === NavMenuType.DESIGN) return 'design';
  if (value === NavMenuType.ECOMMERCE) return 'ecommerce';
  if (value === NavMenuType.INTERIOR) return 'interior';
  if (value === NavMenuType.FONT) return 'font';
  if (value === NavMenuType.THREE_D || value === 'threed') return 'threed';
  return 'home';
};

interface DynamicPageProps {
  slug: string;
  pageType?: NavMenuType;
}

/**
 * 动态页面组件
 */
const DynamicPage: React.FC<DynamicPageProps> = ({ slug, pageType }) => {
  // 使用 usePageData hook 获取数据
  const {
    pageConfig,
    categories,
    loading,
    error,
    getWebsitesByCategory,
    getWebsitesBySubCategory,
    getSubCategories,
    dynamicHotTags,
  } = usePageData({ slug });

  // 状态
  const [activeCategory, setActiveCategory] = useState<string>('');
  const activeCategoryRef = useRef<string>('');
  const [searchResults, setSearchResults] = useState<Website[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [heroScrollWebsites, setHeroScrollWebsites] = useState<HeroScrollWebsite[]>([]);
  const [latestWebsiteUpdates, setLatestWebsiteUpdates] = useState<DailyNewWebsiteItem[]>([]);
  const [latestWebsiteUpdatesLoading, setLatestWebsiteUpdatesLoading] = useState(false);
  const [dailyNewDisplayConfig, setDailyNewDisplayConfig] = useState<DailyNewDisplayConfig | null>(null);
  const [sidebarStickyEnabled, setSidebarStickyEnabled] = useState<boolean>(true);
  const [sidebarFixedActive, setSidebarFixedActive] = useState<boolean>(false);
  const mainLayoutRef = useRef<HTMLDivElement | null>(null);
  
  // 获取前端配置（跳转弹窗自定义文案）
  const { config: frontendConfig } = useFrontendConfig();
  const { config: permalinkConfig } = usePermalinkConfig();
  const detailNavigate = useNavigate();
  const location = useLocation();
  const showDirectArrow = frontendConfig?.pageGlobalConfig?.showDirectArrow ?? false;
  const websiteClickMode = frontendConfig?.pageGlobalConfig?.websiteClickMode ?? 'detail';
  const directArrowNewWindow = frontendConfig?.pageGlobalConfig?.directArrowNewWindow ?? true;
  const detailPageNewWindow = frontendConfig?.pageGlobalConfig?.detailPageNewWindow ?? false;
  const viewMoreNewWindow = frontendConfig?.pageGlobalConfig?.viewMoreNewWindow ?? false;
  const { isDirectMode, arrowLabel, arrowIsExternal } = getArrowConfigByWebsiteClickMode(websiteClickMode);
  const heroIconClickMode = frontendConfig?.homepageConfig?.heroIconClickMode ?? 'direct';

  /**
   * 将“上新时间”规范化为毫秒时间戳，兼容秒级时间戳、毫秒时间戳与 ISO 字符串。
   * @param {unknown} value 原始时间值
   * @returns {number} 毫秒时间戳，非法时返回 0
   */
  const parseTimeToMs = useCallback((value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 9999999999 ? value : value * 1000;
    }
    const text = String(value).trim();
    if (!text) return 0;
    if (/^\d+$/.test(text)) {
      const numeric = Number.parseInt(text, 10);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return numeric > 9999999999 ? numeric : numeric * 1000;
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  /**
   * 将网站更新时间格式化为“MM-DD HH:mm / HH:mm”。
   * @param {DailyNewWebsiteItem} item 最新网站项
   * @returns {string} 时间文案
   */
  const formatLatestUpdateTime = useCallback((item: DailyNewWebsiteItem): string => {
    const timestamp = parseTimeToMs(item.latestAt || item.updatedAt || item.createdAt);
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    const hh = `${date.getHours()}`.padStart(2, '0');
    const mm = `${date.getMinutes()}`.padStart(2, '0');
    if (sameDay) return `${hh}:${mm}`;
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${month}-${day} ${hh}:${mm}`;
  }, [parseTimeToMs]);

  // 直达箭头点击回调 - 与 useNavigation.ts 逻辑保持一致
  const handleDirectVisit = useCallback((tool: DirectVisitTarget, _event: React.MouseEvent) => {
    recordWebsiteClick(tool.id);
    if (isDirectMode) {
      // 分类区域设置为直达时，箭头进入详情页
      const detailUrl = generateWebsiteUrl(permalinkConfig, { 
        id: tool.id, 
        slug: tool.slug 
      });
      if (detailPageNewWindow) {
        window.open(detailUrl, '_blank');
      } else {
        detailNavigate(detailUrl);
        window.scrollTo(0, 0);
      }
    } else {
      // 其他模式下，箭头直达外部网址
      const url = tool?.url;
      if (url) {
        const directUrl = appendRefParamToUrl(url, frontendConfig?.pageGlobalConfig);
        if (directArrowNewWindow) {
          window.open(directUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = directUrl;
        }
      }
    }
  }, [isDirectMode, directArrowNewWindow, detailPageNewWindow, permalinkConfig, detailNavigate, frontendConfig?.pageGlobalConfig]);

  /**
   * 生成 Hero 图标墙详情链接，统一复用当前永久链接规则。
   */
  const buildHeroWebsiteDetailUrl = useCallback((website: HeroScrollWebsite) => {
    return generateWebsiteUrl(permalinkConfig, {
      id: website.id,
      slug: website.slug,
    });
  }, [permalinkConfig]);

  /**
   * 拉取“最新网站更新”列表，用于 Hero 下方滚动条展示。
   */
  const fetchLatestWebsiteUpdates = useCallback(async () => {
    /**
     * 统一过滤并截断列表，避免空字段导致渲染异常。
     */
    const normalizeLatestItems = (rows: DailyNewWebsiteItem[] | undefined) => {
      return (Array.isArray(rows) ? rows : [])
        .filter((item) => item && item.id && item.name && item.url)
        .slice(0, 8);
    };

    try {
      setLatestWebsiteUpdatesLoading(true);
      const globalResult = await getDailyNewWebsites({
        page: 1,
        pageSize: 8,
        days: HOMEPAGE_LATEST_UPDATE_DAYS,
        sortBy: 'latest',
      });
      setLatestWebsiteUpdates(normalizeLatestItems(globalResult?.list));
    } catch (error) {
      console.warn('获取最新网站更新失败，降级为空列表:', error);
      setLatestWebsiteUpdates([]);
    } finally {
      setLatestWebsiteUpdatesLoading(false);
    }
  }, []);

  /**
   * 拉取“每日上新”公开展示配置（用于“查看更多”链接）。
   */
  const fetchDailyNewDisplayConfig = useCallback(async () => {
    try {
      const config = await getDailyNewDisplayConfig();
      setDailyNewDisplayConfig(config);
    } catch (error) {
      console.warn('获取每日上新展示配置失败，使用默认查看链接:', error);
      setDailyNewDisplayConfig(null);
    }
  }, []);

  // 获取滚动图标墙的网站数据
  useEffect(() => {
    if (pageConfig?.heroDisplayMode === 'iconScroll' && pageConfig?.heroScrollWebsites) {
      try {
        const websiteIds = JSON.parse(pageConfig.heroScrollWebsites);
        if (Array.isArray(websiteIds) && websiteIds.length > 0) {
          // 从API获取网站详情
          import('../../services/api').then(({ default: api }) => {
            api.get('/websites', { params: { ids: websiteIds.join(','), limit: 100 } })
              .then(res => {
                const rawData = unwrapApiResponse<WebsiteWithExtra[] | { websites?: WebsiteWithExtra[] }>(res.data, []);
                const websites = Array.isArray(rawData) ? rawData : (rawData.websites || []);
                // 按照配置的顺序排序，使用字符串比较确保类型匹配
                const sortedWebsites = websiteIds
                  .map((id: string | number) => websites.find((w) => String(w.id) === String(id) || String(w.oldId || '') === String(id)))
                  .filter((w): w is WebsiteWithExtra => Boolean(w && w.id && w.name && w.url))
                  .map((w) => ({
                    id: w.id,
                    name: w.name,
                    iconUrl: w.iconUrl,
                    url: w.url,
                    slug: w.slug,
                  }));
                setHeroScrollWebsites(sortedWebsites);
              })
              .catch(err => {
                console.error('获取滚动网站数据失败:', err);
              });
          });
        }
      } catch (e) {
        console.error('解析滚动网站ID失败:', e);
      }
    }
  }, [pageConfig?.heroDisplayMode, pageConfig?.heroScrollWebsites]);

  // 读取“最新网站更新”数据（用于 Hero 下方滚动模块）
  useEffect(() => {
    fetchLatestWebsiteUpdates();
  }, [fetchLatestWebsiteUpdates]);

  // 读取“每日上新”展示配置，供“查看更多”使用
  useEffect(() => {
    fetchDailyNewDisplayConfig();
  }, [fetchDailyNewDisplayConfig]);

  /**
   * 侧栏吸顶仅在桌面端启用，平板与移动端降级为普通流式布局，避免遮挡主内容。
   */
  useEffect(() => {
    const resolveSidebarStickyState = () => {
      if (typeof window === 'undefined') {
        setSidebarStickyEnabled(true);
        return;
      }
      setSidebarStickyEnabled(window.innerWidth > 768);
    };
    resolveSidebarStickyState();
    window.addEventListener('resize', resolveSidebarStickyState, { passive: true });
    return () => {
      window.removeEventListener('resize', resolveSidebarStickyState);
    };
  }, []);

  /**
   * 仅当主内容区滚动到头部导航下方时，才启用“左侧固定”样式：
   * - Hero 区域内：侧栏保持正常文档流，不覆盖 Hero
   * - 进入内容区后：侧栏固定在头部菜单下方
   */
  useEffect(() => {
    if (!sidebarStickyEnabled) {
      setSidebarFixedActive(false);
      return;
    }

    const resolveHeaderOffset = (): number => {
      const rootStyle = window.getComputedStyle(document.documentElement);
      const headerHeightText = rootStyle.getPropertyValue('--header-height').trim();
      const headerHeight = Number.parseFloat(headerHeightText);
      const safeHeaderHeight = Number.isFinite(headerHeight) && headerHeight > 0 ? headerHeight : 64;
      return safeHeaderHeight + 8;
    };

    const updateFixedState = () => {
      const mainLayout = mainLayoutRef.current;
      if (!mainLayout) {
        setSidebarFixedActive(false);
        return;
      }
      const triggerTop = resolveHeaderOffset();
      const mainLayoutTop = mainLayout.getBoundingClientRect().top;
      setSidebarFixedActive(mainLayoutTop <= triggerTop);
    };

    updateFixedState();
    window.addEventListener('scroll', updateFixedState, { passive: true });
    window.addEventListener('resize', updateFixedState);
    return () => {
      window.removeEventListener('scroll', updateFixedState);
      window.removeEventListener('resize', updateFixedState);
    };
  }, [sidebarStickyEnabled]);

  /**
   * 构建 svg:key 图标索引，供分类侧边栏渲染自定义 SVG。
   */
  const svgIconMap = useMemo(
    () => createSvgIconMap(frontendConfig?.pageGlobalConfig?.categorySvgLibrary || []),
    [frontendConfig?.pageGlobalConfig?.categorySvgLibrary]
  );

  /**
   * 热门推荐首屏条数：按“网格列数 × 3 行”计算，保证默认展示三行卡片。
   */
  const hotRecommendationLimit = useMemo(() => {
    const gridColumns = Number(frontendConfig?.pageGlobalConfig?.gridColumns || 4);
    const safeColumns = Number.isFinite(gridColumns) ? Math.max(2, Math.min(6, Math.floor(gridColumns))) : 4;
    /**
     * 超大屏保持 6 列时，兜底至少 18 条，确保首屏仍可展示 3 行卡片。
     */
    return Math.max(18, safeColumns * 3);
  }, [frontendConfig?.pageGlobalConfig?.gridColumns]);

  // 导航项 - 包含子分类信息
  const navItems: NavItem[] = useMemo(() => {
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: getWebsitesByCategory(cat.id).length,
      icon: String(cat.icon || 'default').trim() || 'default',
      color: cat.color,
      subcategories: cat.subCategories?.map(sub => ({
        id: sub.id,
        name: sub.name,
        count: getWebsitesBySubCategory(sub.id).length,
      })) || [],
    }));
  }, [categories, getWebsitesByCategory, getWebsitesBySubCategory]);

  /**
   * 计算锚点滚动偏移值（顶部导航高度 + 额外留白）。
   * @returns {number} 锚点滚动偏移像素
   */
  const getAnchorOffset = useCallback((): number => {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const headerHeightText = rootStyle.getPropertyValue('--header-height').trim();
    const headerHeight = Number.parseFloat(headerHeightText);
    const safeHeaderHeight = Number.isFinite(headerHeight) && headerHeight > 0 ? headerHeight : 64;
    return safeHeaderHeight + 16;
  }, []);

  /**
   * 获取主内容滚动容器：
   * - 若 `.layout-main` 具备独立滚动能力，则优先使用它；
   * - 否则回退到 window。
   * 这样可同时兼容“整页滚动”和“内容区独立滚动”两种布局。
   */
  const getPrimaryScrollContainer = useCallback((): Window | HTMLElement => {
    const layoutMain = document.querySelector('.layout-main');
    if (!(layoutMain instanceof HTMLElement)) {
      return window;
    }
    const style = window.getComputedStyle(layoutMain);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && layoutMain.scrollHeight > layoutMain.clientHeight + 2;
    return canScroll ? layoutMain : window;
  }, []);

  /**
   * 滚动到指定分类区块，并保留顶部偏移，避免被顶部导航遮挡。
   * @param {string} categoryId 分类 ID
   * @param {ScrollBehavior} behavior 滚动动画行为
   * @returns {boolean} 是否命中并执行滚动
   */
  const scrollToCategorySection = useCallback((categoryId: string, behavior: ScrollBehavior = 'smooth'): boolean => {
    const targetSection = document.getElementById(`${CATEGORY_SECTION_ID_PREFIX}${categoryId}`);
    if (!targetSection) return false;
    const scrollContainer = getPrimaryScrollContainer();
    if (isWindowScrollContainer(scrollContainer)) {
      const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - getAnchorOffset();
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior,
      });
      return true;
    }
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetTop = targetSection.getBoundingClientRect().top - containerRect.top
      + scrollContainer.scrollTop
      - getAnchorOffset();
    scrollContainer.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
    return true;
  }, [getAnchorOffset, getPrimaryScrollContainer]);

  /**
   * 同步当前分类锚点到地址栏（replaceState，不触发页面跳转）。
   * @param {string} categoryId 分类 ID
   */
  const syncCategoryHash = useCallback((categoryId: string) => {
    if (!categoryId) return;
    const nextHash = `#${CATEGORY_SECTION_ID_PREFIX}${categoryId}`;
    if (window.location.hash === nextHash) return;
    const nextUrl = `${location.pathname}${location.search}${nextHash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [location.pathname, location.search]);

  // 处理导航点击
  const handleNavItemClick = useCallback((itemId: string) => {
    setActiveCategory(itemId);
    activeCategoryRef.current = itemId;
    scrollToCategorySection(itemId, 'smooth');
    syncCategoryHash(itemId);
  }, [scrollToCategorySection, syncCategoryHash]);

  // 设置默认激活分类 - 只在首次加载且没有激活分类时设置
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  /**
   * 保持 ref 与 state 同步，避免滚动回调里读取到旧值。
   */
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  /**
   * 首次进入页面时，若 URL 中带有分类锚点，则自动定位到对应分类。
   */
  useEffect(() => {
    if (categories.length === 0 || isSearchMode) return;
    const hash = String(window.location.hash || '').replace(/^#/, '');
    if (!hash.startsWith(CATEGORY_SECTION_ID_PREFIX)) return;
    const targetCategoryId = hash.replace(CATEGORY_SECTION_ID_PREFIX, '');
    const hasTargetCategory = categories.some((item) => item.id === targetCategoryId);
    if (!hasTargetCategory) return;
    setActiveCategory(targetCategoryId);
    activeCategoryRef.current = targetCategoryId;
    window.requestAnimationFrame(() => {
      scrollToCategorySection(targetCategoryId, 'auto');
    });
  }, [categories, isSearchMode, scrollToCategorySection]);

  /**
   * 监听页面滚动位置，实时同步侧栏高亮到当前可见分类区块。
   */
  useEffect(() => {
    if (categories.length === 0 || isSearchMode) return;
    const sectionTargets = categories
      .map((category) => ({
        id: category.id,
        element: document.getElementById(`${CATEGORY_SECTION_ID_PREFIX}${category.id}`),
      }))
      .filter((item): item is { id: string; element: HTMLElement } => item.element instanceof HTMLElement);
    if (sectionTargets.length === 0) return;

    let ticking = false;
    let frameId = 0;
    const primaryScrollContainer = getPrimaryScrollContainer();

    /**
     * 根据当前滚动位置，计算应该激活的分类 ID。
     * @returns {string} 当前激活分类 ID
     */
    const resolveActiveCategoryByScroll = (): string => {
      const detectLine = Math.max(getAnchorOffset() + 24, window.innerHeight * 0.28);
      let currentCategoryId = sectionTargets[0].id;
      sectionTargets.forEach((target) => {
        if (target.element.getBoundingClientRect().top <= detectLine) {
          currentCategoryId = target.id;
        }
      });
      const reachedPageBottom = isWindowScrollContainer(primaryScrollContainer)
        ? (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4)
        : (primaryScrollContainer.scrollTop + primaryScrollContainer.clientHeight >= primaryScrollContainer.scrollHeight - 4);
      if (reachedPageBottom) {
        currentCategoryId = sectionTargets[sectionTargets.length - 1].id;
      }
      return currentCategoryId;
    };

    /**
     * 将滚动计算结果同步到侧栏高亮与 URL 锚点。
     */
    const syncActiveCategoryByScroll = () => {
      const nextCategoryId = resolveActiveCategoryByScroll();
      if (!nextCategoryId || nextCategoryId === activeCategoryRef.current) return;
      activeCategoryRef.current = nextCategoryId;
      setActiveCategory(nextCategoryId);
      syncCategoryHash(nextCategoryId);
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      frameId = window.requestAnimationFrame(() => {
        syncActiveCategoryByScroll();
        ticking = false;
      });
    };

    // 初始化先同步一次，避免首屏高亮与实际位置不一致。
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    if (!isWindowScrollContainer(primaryScrollContainer)) {
      primaryScrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, true);
      if (!isWindowScrollContainer(primaryScrollContainer)) {
        primaryScrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [categories, isSearchMode, getAnchorOffset, getPrimaryScrollContainer, syncCategoryHash]);

  // 退出搜索模式
  const handleExitSearchMode = useCallback(() => {
    setIsSearchMode(false);
    setSearchResults([]);
  }, []);

  // 处理网站点击
  const handleWebsiteClick = useCallback((website: Website) => {
    // 记录点击数据
    recordWebsiteClick(website.id);
    if (isDirectMode) {
      const directUrl = appendRefParamToUrl(website.url, frontendConfig?.pageGlobalConfig);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const websiteSlug = (website as WebsiteWithExtra).slug;
    const detailUrl = generateWebsiteUrl(permalinkConfig, {
      id: website.id,
      slug: websiteSlug,
    });
    if (detailPageNewWindow) {
      window.open(detailUrl, '_blank');
    } else {
      detailNavigate(detailUrl);
      window.scrollTo(0, 0);
    }
  }, [isDirectMode, permalinkConfig, detailPageNewWindow, detailNavigate, frontendConfig?.pageGlobalConfig]);

  /**
   * 处理“最新网站更新”项点击，复用详情/直达统一跳转逻辑。
   * @param {DailyNewWebsiteItem} item 最新网站项
   */
  const handleLatestUpdateClick = useCallback((item: DailyNewWebsiteItem) => {
    handleWebsiteClick({
      id: String(item.id),
      name: String(item.name || ''),
      description: String(item.description || ''),
      url: String(item.url || ''),
      iconUrl: item.iconUrl,
      isHot: item.isHot === true,
      isFeatured: item.isFeatured === true,
      isNew: item.isNew === true,
      tags: Array.isArray(item.tags) ? item.tags : [],
      weightTags: [],
    });
  }, [handleWebsiteClick]);

  /**
   * 最新更新模块“查看更多”入口。
   */
  const latestUpdatesMoreEntry = useMemo(() => {
    const href = String(dailyNewDisplayConfig?.displayPath || '/p/hot?tab=daily-new').trim() || '/p/hot?tab=daily-new';
    const openInNewTab = dailyNewDisplayConfig?.displayOpenInNewTab === true;
    return {
      href,
      target: openInNewTab ? '_blank' as const : '_self' as const,
      rel: openInNewTab ? 'noopener noreferrer' : undefined,
    };
  }, [dailyNewDisplayConfig?.displayOpenInNewTab, dailyNewDisplayConfig?.displayPath]);

  /**
   * 构建“最新网站更新”头部时间文案，显示当前列表最新一条的更新时间。
   */
  const latestUpdatesMetaText = useMemo(() => {
    const latestItem = latestWebsiteUpdates[0];
    if (!latestItem) return '更新至 --:--';
    const timestamp = parseTimeToMs(latestItem.latestAt || latestItem.updatedAt || latestItem.createdAt);
    if (!timestamp) return '更新至 --:--';
    const date = new Date(timestamp);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hh = `${date.getHours()}`.padStart(2, '0');
    const mm = `${date.getMinutes()}`.padStart(2, '0');
    return `更新至 ${month}-${day} ${hh}:${mm}`;
  }, [latestWebsiteUpdates, parseTimeToMs]);

  // 侧边栏配置
  const sidebarConfig: SidebarConfig = {
    title: pageConfig?.name || '导航',
    type: pageType || NavMenuType.UIUX
  };
  const heroPageType = useMemo<HeroPageType>(() => {
    return resolveHeroPageType(pageType || slug);
  }, [pageType, slug]);

  // 生成主题色相关的CSS变量 - 必须在早期返回之前调用
  const themeStyle = useMemo(() => {
    if (!pageConfig?.themeColor) return undefined;
    
    const color = pageConfig.themeColor;
    // 生成浅色版本（用于背景等）
    const lightColor = `${color}15`; // 15% 透明度
    const lighterColor = `${color}08`; // 8% 透明度
    
    return {
      '--primary-color': color,
      '--primary-light': lightColor,
      '--primary-lighter': lighterColor,
      '--primary-dark': color,
      '--primary-hover': color,
      '--primary-active': color,
      // 兼容其他可能使用的变量名
      '--theme-color': color,
      '--accent-color': color,
    } as React.CSSProperties;
  }, [pageConfig?.themeColor]);

  // 加载状态 - 使用骨架屏
  if (loading) {
    return (
      <div className="home-page dynamic-page">
        {/* 骨架屏 Hero Banner */}
        <HeroBannerSkeleton />
        
        <div className="main-layout">
          {/* 骨架屏侧边栏 */}
          <CategorySidebarSkeleton count={10} />
          
          {/* 骨架屏内容区域 */}
          <main className="tools-main">
            {/* 骨架屏热门推荐 */}
            <section className="content-section">
              <div className="section-header-simple">
                <div className="skeleton" style={{ width: 150, height: 28, borderRadius: 4 }} />
              </div>
              <ToolGridSkeleton count={8} />
            </section>
            
            {/* 骨架屏分类内容 */}
            <section className="content-section">
              <div className="section-header-simple">
                <div className="skeleton" style={{ width: 120, height: 24, borderRadius: 4 }} />
              </div>
              <ToolGridSkeleton count={12} />
            </section>
          </main>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="error-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>加载失败</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }

  return (
    <div 
      className="home-page dynamic-page"
      style={themeStyle}
    >
      {/* SEO优化 */}
      <SEO 
        title={pageConfig?.name || '导航'}
        description={pageConfig?.description || ''}
        keywords={pageConfig?.name || ''}
        url={location.pathname || `/p/${slug}`}
      />
      
      {/* 头部Hero区域 */}
      <HeroBanner 
        pageType={heroPageType}
        showStats={true}
        customTitle={pageConfig?.heroTitle}
        customDescription={pageConfig?.heroSubtitle}
        apiHotSearchTags={pageConfig?.hotSearchTags}
        dynamicHotTags={dynamicHotTags}
        hotSearchMode={pageConfig?.hotSearchMode}
        searchPlaceholder={pageConfig?.searchPlaceholder}
        heroBgType={pageConfig?.heroBgType}
        heroBgValue={pageConfig?.heroBgValue}
        highlightText={pageConfig?.heroHighlightText}
        heroDisplayMode={pageConfig?.heroDisplayMode}
        heroScrollWebsites={heroScrollWebsites}
        heroIconClickMode={heroIconClickMode}
        buildHeroWebsiteDetailUrl={buildHeroWebsiteDetailUrl}
        aiSearchEnabled={frontendConfig?.searchConfig?.enabled !== false && frontendConfig?.searchConfig?.aiSearchEnabled !== false}
        aiSearchBtnText={frontendConfig?.searchConfig?.aiSearchBtnText || 'AI 搜索'}
      />

      <div
        ref={mainLayoutRef}
        className={`main-layout ${pageConfig?.showSidebar === false ? 'no-sidebar' : ''} ${pageConfig?.showSidebar !== false && sidebarStickyEnabled ? 'has-sticky-sidebar' : ''} ${sidebarFixedActive ? 'sidebar-fixed-active' : ''}`}
      >
        {/* 侧边栏 - 根据配置显示或隐藏 */}
        {pageConfig?.showSidebar !== false && (
          <CategorySidebar
            config={sidebarConfig}
            navItems={navItems}
            svgIconMap={svgIconMap}
            activeItem={activeCategory}
            onItemClick={handleNavItemClick}
            isSearchMode={isSearchMode}
            searchResultsCount={searchResults.length}
            onExitSearchMode={handleExitSearchMode}
            isSticky={sidebarStickyEnabled}
            badgeText={pageConfig?.slug?.toUpperCase() || slug.toUpperCase()}
          />
        )}

        {/* 右侧内容区域 */}
        <main className="tools-main">
          {/* 最新网站更新（Hero 下方固定 8 条） */}
          {!isSearchMode && (
            <section className="latest-update-strip content-section" aria-label="最新网站更新">
              <div className="latest-update-strip__header">
                <h2 className="latest-update-strip__title">最新网站更新</h2>
                <div className="latest-update-strip__header-right">
                  <span className="latest-update-strip__meta">{latestUpdatesMetaText}</span>
                  <a
                    className="latest-update-strip__more"
                    href={latestUpdatesMoreEntry.href}
                    target={latestUpdatesMoreEntry.target}
                    rel={latestUpdatesMoreEntry.rel}
                  >
                    查看更多
                  </a>
                </div>
              </div>
              {latestWebsiteUpdatesLoading && latestWebsiteUpdates.length === 0 ? (
                <div className="latest-update-strip__loading">正在加载最新网站...</div>
              ) : latestWebsiteUpdates.length > 0 ? (
                <div className="latest-update-strip__list">
                  {latestWebsiteUpdates.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.id}-${index}`}
                      className="latest-update-strip__item"
                      onClick={() => handleLatestUpdateClick(item)}
                      title={`${item.name} · ${formatLatestUpdateTime(item)}`}
                    >
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt={item.name}
                          className="latest-update-strip__icon"
                          loading="lazy"
                        />
                      ) : (
                        <span className="latest-update-strip__icon latest-update-strip__icon--fallback">
                          {String(item.name || 'W').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="latest-update-strip__name">{item.name}</span>
                      <span className="latest-update-strip__time">{formatLatestUpdateTime(item)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="latest-update-strip__loading">近 7 天暂无更新数据</div>
              )}
            </section>
          )}

          {/* 页面 Banner（独立开关）- 放在热门推荐上方 */}
          {!isSearchMode && pageConfig?.showBanner !== false && (
            <AdBanner
              pageSlug={slug}
              position="page_banner"
              limit={4}
            />
          )}

          {/* 热门推荐 - 使用 HotRecommendations 组件，与其他页面保持一致 */}
          {pageConfig?.showHotRecommendations && !isSearchMode && (
            <HotRecommendations 
              limit={hotRecommendationLimit}
              title="热门推荐"
              showMoreButton={false}
              enableSubCategories={true}
              useApi={true}
              pageSlug={slug}
              onWebsiteClick={(tool) => handleWebsiteClick({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                url: tool.url,
                iconUrl: tool.iconUrl,
                tags: tool.tags,
                weightTags: tool.weightTags || [],
                isNew: tool.isNew || false,
                isHot: tool.isHot || false,
                isFeatured: tool.isFeatured || false
              })}
            />
          )}

          {/* WordPress 文章组件 - 根据后台配置显示 */}
          {!isSearchMode && (
            <DesignArticleGrid 
              pageSlug={slug}
              position="main"
              title="设计文章"
              limit={6}
              showMoreButton={true}
              enableSubCategories={true}
            />
          )}

          {/* 搜索结果 */}
          {isSearchMode && (
            <section id="search-results" className="content-section">
              <div className="section-header-simple">
                <h2>搜索结果</h2>
                <span className="resource-count">共找到 {searchResults.length} 个相关工具</span>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="tools-grid">
                  {searchResults.map(website => (
                    <ToolCard
                      key={website.id}
                      tool={{
                        id: website.id,
                        name: website.name,
                        description: website.description,
                        url: website.url,
                        iconUrl: website.iconUrl,
                        isHot: website.isHot,
                        isFeatured: website.isFeatured,
                        isNew: website.isNew,
                        category: '',
                        tags: website.tags || [],
                        weightTags: website.weightTags || [],
                      }}
                      onClick={() => handleWebsiteClick(website)}
                      showDirectArrow={showDirectArrow}
                      onDirectVisit={handleDirectVisit}
                      arrowLabel={arrowLabel}
                      arrowIsExternal={arrowIsExternal}
                      directArrowNewWindow={directArrowNewWindow}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-result">
                  <p>没有找到相关结果，请尝试其他关键词</p>
                </div>
              )}
            </section>
          )}

          {/* 分类内容 */}
          {!isSearchMode && categories.map(category => {
            const subCategories = getSubCategories(category.id);
            const categoryWebsites = getWebsitesByCategory(category.id);
            
            // 检查子分类是否有网站
            const subCategoriesWithWebsites = subCategories.filter(
              sub => getWebsitesBySubCategory(sub.id).length > 0
            );
            const hasSubCategoryWebsites = subCategoriesWithWebsites.length > 0;
            
            return (
              <section 
                key={category.id} 
                id={`category-${category.id}`} 
                className="content-section"
              >
                <div className="section-header-simple">
                  <h2>{category.name}</h2>
                  <span className="resource-count">共 {categoryWebsites.length} 个</span>
                </div>
                
                {/* 子分类标签 - 只有当子分类有网站时才显示 */}
                {subCategories.length > 0 && hasSubCategoryWebsites && (
                  <SubCategoryTabs
                    subCategories={subCategories}
                    categorySlug={category.slug}
                    getWebsitesBySubCategory={getWebsitesBySubCategory}
                    onWebsiteClick={handleWebsiteClick}
                    showDirectArrow={showDirectArrow}
                    onDirectVisit={handleDirectVisit}
                    arrowLabel={arrowLabel}
                    arrowIsExternal={arrowIsExternal}
                    directArrowNewWindow={directArrowNewWindow}
                    viewMoreNewWindow={viewMoreNewWindow}
                  />
                )}
                
                {/* 如果没有子分类，或者子分类都没有网站，直接显示所有网站 */}
                {(subCategories.length === 0 || !hasSubCategoryWebsites) && categoryWebsites.length > 0 && (
                  <div className="tools-grid">
                    {categoryWebsites.map(website => (
                      <ToolCard
                        key={website.id}
                        tool={{
                          id: website.id,
                          name: website.name,
                          description: website.description,
                          url: website.url,
                          iconUrl: website.iconUrl,
                          isHot: website.isHot,
                          isFeatured: website.isFeatured,
                          isNew: website.isNew,
                          category: '',
                          tags: website.tags || [],
                          weightTags: website.weightTags || [],
                        }}
                        onClick={() => handleWebsiteClick(website)}
                        showDirectArrow={showDirectArrow}
                        onDirectVisit={handleDirectVisit}
                        arrowLabel={arrowLabel}
                        arrowIsExternal={arrowIsExternal}
                        directArrowNewWindow={directArrowNewWindow}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
};

// 子分类标签组件
interface SubCategoryTabsProps {
  subCategories: SubCategory[];
  categorySlug?: string;
  getWebsitesBySubCategory: (id: string) => Website[];
  onWebsiteClick: (website: Website) => void;
  showDirectArrow?: boolean;
  onDirectVisit?: (tool: DirectVisitTarget, e: React.MouseEvent) => void;
  arrowLabel?: string;
  arrowIsExternal?: boolean;
  directArrowNewWindow?: boolean;
  viewMoreNewWindow?: boolean;
}

const SubCategoryTabs: React.FC<SubCategoryTabsProps> = ({
  subCategories,
  categorySlug,
  getWebsitesBySubCategory,
  onWebsiteClick,
  showDirectArrow = false,
  onDirectVisit,
  arrowLabel = '直达网站',
  arrowIsExternal = true,
  directArrowNewWindow = true,
  viewMoreNewWindow = false,
}) => {
  const navigate = useNavigate();
  // 当前选中的子分类，默认选中 'all'
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12; // 每页显示12个
  
  // 获取所有子分类的网站
  const allWebsites = useMemo(() => {
    const websites: Website[] = [];
    subCategories.forEach(sub => {
      websites.push(...getWebsitesBySubCategory(sub.id));
    });
    return websites;
  }, [subCategories, getWebsitesBySubCategory]);
  
  // 当前显示的网站（未分页）
  const filteredWebsites = useMemo(() => {
    if (activeSubCategory === 'all') {
      return allWebsites;
    }
    return getWebsitesBySubCategory(activeSubCategory);
  }, [activeSubCategory, allWebsites, getWebsitesBySubCategory]);
  
  // 分页计算
  const paginationData = useMemo(() => {
    const totalItems = filteredWebsites.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageItems = filteredWebsites.slice(startIndex, endIndex);
    
    return {
      totalItems,
      totalPages,
      currentPageItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  }, [filteredWebsites, currentPage, pageSize]);
  
  // 过滤出有网站的子分类
  const validSubCategories = useMemo(() => {
    return subCategories.filter(sub => getWebsitesBySubCategory(sub.id).length > 0);
  }, [subCategories, getWebsitesBySubCategory]);
  
  // 切换子分类时重置分页
  const handleSubCategoryChange = (subCatId: string) => {
    setActiveSubCategory(subCatId);
    setCurrentPage(1);
  };

  /**
   * 跳转分类页并重置滚动位置，规避历史滚动位置/锚点导致的落点偏移。
   */
  const navigateCategoryWithTopReset = useCallback((targetPath: string) => {
    navigate(targetPath);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    });
  }, [navigate]);

  /**
   * 解析“查看更多”跳转路径：优先当前激活子分类，其次主分类，最后回退分类列表页。
   */
  const resolveViewMoreTargetPath = useCallback(() => {
    const activeSubCategoryItem = validSubCategories.find((item) => item.id === activeSubCategory);
    const targetSlug = String(activeSubCategoryItem?.slug || categorySlug || '').trim();
    if (targetSlug) {
      return `/category/${targetSlug}`;
    }
    return '/category';
  }, [activeSubCategory, validSubCategories, categorySlug]);

  /**
   * 处理“查看更多”按钮：支持当前窗口或新窗口打开。
   */
  const handleViewCategory = useCallback(() => {
    const targetPath = resolveViewMoreTargetPath();
    if (viewMoreNewWindow) {
      window.open(targetPath, '_blank', 'noopener,noreferrer');
      return;
    }
    navigateCategoryWithTopReset(targetPath);
  }, [resolveViewMoreTargetPath, viewMoreNewWindow, navigateCategoryWithTopReset]);
  
  if (allWebsites.length === 0) {
    return null;
  }
  
  return (
    <div className="subcategory-section">
      {/* 子分类标签栏 - 可横向滚动 */}
      <div className="subcategory-tabs-wrapper" style={{
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          flex: 1,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          <div className="subcategory-tabs" style={{
            display: 'flex',
            gap: '8px',
            paddingBottom: '8px',
            minWidth: 'max-content',
          }}>
            {/* 全部标签 */}
            <button
              className={`subcategory-tab ${activeSubCategory === 'all' ? 'active' : ''}`}
              onClick={() => handleSubCategoryChange('all')}
              style={{
                padding: '6px 16px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: activeSubCategory === 'all' ? 'var(--primary-color, #1890ff)' : '#f5f5f5',
                color: activeSubCategory === 'all' ? '#fff' : '#666',
              }}
            >
              全部 ({allWebsites.length})
            </button>
            
            {/* 子分类标签 */}
            {validSubCategories.map(subCat => {
              const count = getWebsitesBySubCategory(subCat.id).length;
              const isActive = activeSubCategory === subCat.id;
              
              return (
                <button
                  key={subCat.id}
                  className={`subcategory-tab ${isActive ? 'active' : ''}`}
                  onClick={() => handleSubCategoryChange(subCat.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: isActive ? 'var(--primary-color, #1890ff)' : '#f5f5f5',
                    color: isActive ? '#fff' : '#666',
                  }}
                >
                  {subCat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          <button
            onClick={handleViewCategory}
            aria-label="查看更多分类"
            style={{
              height: '24px',
              width: '24px',
              borderRadius: '5px',
              border: '1px solid rgba(24, 144, 255, 0.32)',
              background: 'rgba(24, 144, 255, 0.08)',
              color: 'var(--primary-color, #1890ff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
            }}
            title="查看更多"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 7h2M5 12h2M5 17h2M9 7h10M9 12h10M9 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          {paginationData.totalPages > 1 && (
            <>
            <button
              onClick={() => paginationData.hasPrevPage && setCurrentPage(currentPage - 1)}
              disabled={!paginationData.hasPrevPage}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid #e8e8e8',
                background: paginationData.hasPrevPage ? '#fff' : '#f5f5f5',
                cursor: paginationData.hasPrevPage ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: paginationData.hasPrevPage ? '#333' : '#ccc',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{ fontSize: '13px', color: '#666', minWidth: '50px', textAlign: 'center' }}>
              {currentPage} / {paginationData.totalPages}
            </span>
            <button
              onClick={() => paginationData.hasNextPage && setCurrentPage(currentPage + 1)}
              disabled={!paginationData.hasNextPage}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid #e8e8e8',
                background: paginationData.hasNextPage ? '#fff' : '#f5f5f5',
                cursor: paginationData.hasNextPage ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: paginationData.hasNextPage ? '#333' : '#ccc',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            </>
          )}
        </div>
      </div>
      
      {/* 网站列表 */}
      <div className="tools-grid">
        {paginationData.currentPageItems.map(website => (
          <ToolCard
            key={website.id}
            tool={{
              id: website.id,
              name: website.name,
              description: website.description,
              url: website.url,
              iconUrl: website.iconUrl,
              isHot: website.isHot,
              isFeatured: website.isFeatured,
              isNew: website.isNew,
              category: '',
              tags: website.tags || [],
              weightTags: website.weightTags || [],
            }}
            onClick={() => onWebsiteClick(website)}
            showDirectArrow={showDirectArrow}
            onDirectVisit={onDirectVisit}
            arrowLabel={arrowLabel}
            arrowIsExternal={arrowIsExternal}
            directArrowNewWindow={directArrowNewWindow}
          />
        ))}
      </div>
    </div>
  );
};

export default DynamicPage;
