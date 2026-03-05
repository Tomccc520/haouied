/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file HotArticles/index.tsx
 * @description 热门文章工作台页面（配置驱动版）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AiOutlineAppstore,
  AiOutlineCrown,
  AiOutlineDesktop,
  AiOutlineFileText,
  AiOutlineHome,
  AiOutlinePlus,
  AiOutlineRead,
  AiOutlineRobot,
  AiOutlineStar,
  AiOutlineTrophy,
} from 'react-icons/ai';
import SEO from '../../components/SEO';
import {
  getHotArticles,
  getHotArticlesDisplayConfig,
  type HotArticleFilterPreset,
  type HotArticleItem,
  type HotArticleListParams,
  type HotArticlesDisplayConfig,
  type HotWorkbenchMenuItem,
} from '../../services/hotArticleService';
import { getDailyHot, getDailyHotDisplayConfig, getDailyHotPlatforms } from '../../services/dailyHotService';
import { getDailyNewDisplayConfig, getDailyNewWebsites } from '../../services/dailyNewService';
import { getRankingsAggregate } from '../../services/rankingService';
import ContentHubSwitch from '../../components/ContentHubSwitch';
import DailyHotPage from '../DailyHot';
import DailyNewPage from '../DailyNew';
import RankingsPage from '../Rankings';
import useDetailLayoutWidthMode from '../../hooks/useDetailLayoutWidthMode';
import HotMotionHero from './HotMotionHero';
import './index.css';

type ContentHubTabKey = 'hot' | 'rankings' | 'daily-hot' | 'daily-new';

type WorkbenchIconKey =
  | 'latest'
  | 'hot'
  | 'ai'
  | 'product'
  | 'design'
  | 'resource'
  | 'author'
  | 'circle'
  | 'extra'
  | 'home';

interface RuntimeMenuItem {
  key: string;
  label: string;
  mode: HotWorkbenchMenuItem['mode'];
  iconKey: WorkbenchIconKey;
  presetKey?: string;
  presetKeys: string[];
  subtitle: string;
  externalUrl?: string;
  query?: HotArticleListParams;
}

const WEEKDAY_TEXT = [ '周日', '周一', '周二', '周三', '周四', '周五', '周六' ];
const CONTENT_HUB_TAB_KEYS: ContentHubTabKey[] = [ 'hot', 'rankings', 'daily-hot', 'daily-new' ];
const HOT_HUB_ACTIVE_TAB_STORAGE_KEY = 'uied.hot.hub.active-tab';
const DEFAULT_CONTENT_HUB_SWITCH_ITEMS = [
  { key: 'hot', label: '热门文章', to: '/p/hot', description: '编辑精选 + 热门阅读' },
  { key: 'rankings', label: '热门榜单', to: '/p/hot', description: '按指标与周期查看' },
  { key: 'daily-hot', label: '每日热榜', to: '/p/hot', description: '全网热点卡片速览' },
  { key: 'daily-new', label: '最新上新', to: '/p/hot', description: '近7日新收录站点' },
] as const;

/**
 * 解析内容中心当前标签。
 */
const resolveContentHubTab = (value: unknown): ContentHubTabKey => {
  const normalized = String(value || '').trim().toLowerCase();
  return CONTENT_HUB_TAB_KEYS.includes(normalized as ContentHubTabKey)
    ? (normalized as ContentHubTabKey)
    : 'hot';
};

/**
 * 格式化数字（用于阅读/评论计数展示）。
 */
const formatCompactCount = (value: unknown): string => {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '';
  if (count >= 10000) return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(count));
};

/**
 * 基于作者名生成稳定颜色，避免默认头像单调。
 */
const resolveAuthorColorToken = (authorName: string): string => {
  const palette = [ 'is-blue', 'is-green', 'is-orange', 'is-purple', 'is-slate' ];
  const text = String(authorName || '').trim();
  if (!text) return 'is-slate';
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
};

/**
 * 根据互动数据提取“热读”标签。
 */
const resolveHeatLabel = (viewCount: unknown, commentCount: unknown): string => {
  const views = Number(viewCount || 0);
  const comments = Number(commentCount || 0);
  if (views >= 10000 || comments >= 120) return '热读';
  return '';
};

/**
 * 根据预设 key 解析分类/标签查询参数。
 */
const resolvePresetQuery = (
  presetKey: string | undefined,
  presetMap: Map<string, HotArticleFilterPreset>,
  fallbackType?: 'category' | 'tag',
  fallbackId?: number,
): Pick<HotArticleListParams, 'categoryId' | 'tagId'> => {
  const normalizedPresetKey = String(presetKey || '').trim();
  if (normalizedPresetKey) {
    const preset = presetMap.get(normalizedPresetKey);
    if (preset) {
      if (preset.type === 'tag') return { tagId: preset.id > 0 ? preset.id : undefined };
      if (preset.type === 'category') return { categoryId: preset.id > 0 ? preset.id : undefined };
      return {};
    }
  }
  if (fallbackType === 'tag' && Number(fallbackId) > 0) {
    return { tagId: Number(fallbackId) };
  }
  if (fallbackType === 'category' && Number(fallbackId) > 0) {
    return { categoryId: Number(fallbackId) };
  }
  return {};
};

/**
 * 组装左侧菜单（仅使用后台 workbenchMenuItems，避免前端自动补齐导致配置错觉）。
 */
const buildRuntimeMenuItems = (
  config: HotArticlesDisplayConfig | null,
  presets: HotArticleFilterPreset[],
): RuntimeMenuItem[] => {
  const presetMap = new Map<string, HotArticleFilterPreset>(presets.map((item) => [ item.key, item ]));
  const rawMenuRows = Array.isArray(config?.workbenchMenuItems)
    ? config?.workbenchMenuItems || []
    : [];
  const enabledMenuRows = rawMenuRows
    .filter((item) => item?.enabled !== false)
    .sort((a, b) => a.sort - b.sort);

  const list: RuntimeMenuItem[] = enabledMenuRows.map((item) => {
    const source = item.source || config?.apiSourceMode || 'auto';
    const orderBy = item.orderBy || (item.mode === 'hot' ? 'views' : (config?.defaultOrderBy || 'date'));
    const order = item.order || config?.defaultOrder || 'desc';
    const period = item.period || 'all';
    const subtitle = String(item.subtitle || '').trim();
    const queryBase: HotArticleListParams = {
      source,
      period,
      orderBy,
      order,
      categoryId: item.categoryId && item.categoryId > 0 ? item.categoryId : undefined,
      tagId: item.tagId && item.tagId > 0 ? item.tagId : undefined,
    };
    const normalizedPresetKeys = Array.isArray(item.presetKeys)
      ? item.presetKeys
      : String(item.presetKeys || '')
        .split(',')
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const resolvedPresetKeys = Array.from(
      new Set(
        normalizedPresetKeys
          .map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
          .filter((value) => Boolean(value) && presetMap.has(value)),
      ),
    );
    if (item.presetKey && presetMap.has(item.presetKey) && !resolvedPresetKeys.includes(item.presetKey)) {
      resolvedPresetKeys.push(item.presetKey);
    }

    if (item.mode === 'preset') {
      const presetQuery = resolvePresetQuery(item.presetKey, presetMap, item.fallbackType, item.fallbackId);
      return {
        key: item.key,
        label: item.label,
        mode: item.mode,
        iconKey: item.iconKey || 'extra',
        presetKey: item.presetKey || '',
        presetKeys: resolvedPresetKeys,
        subtitle,
        query: {
          ...queryBase,
          ...presetQuery,
        },
      };
    }

    if (item.mode === 'latest') {
      return {
        key: item.key,
        label: item.label,
        mode: item.mode,
        iconKey: item.iconKey || 'latest',
        presetKey: '',
        presetKeys: resolvedPresetKeys,
        subtitle: subtitle || '按发布时间实时更新',
        query: {
          ...queryBase,
          source: source === 'auto' ? 'uied_latest' : source,
          orderBy: orderBy || 'date',
          order: order || 'desc',
        },
      };
    }

    if (item.mode === 'hot') {
      return {
        key: item.key,
        label: item.label,
        mode: item.mode,
        iconKey: item.iconKey || 'hot',
        presetKey: '',
        presetKeys: resolvedPresetKeys,
        subtitle: subtitle || '按热度优先展示',
        query: {
          ...queryBase,
          source: source === 'auto' ? 'uied_hot' : source,
          categoryId: queryBase.categoryId || (config?.defaultCategoryId || 0) || undefined,
          tagId: queryBase.tagId || (config?.defaultTagId || 0) || undefined,
          orderBy: orderBy || 'views',
          order: order || 'desc',
        },
      };
    }

    if (item.mode === 'external') {
      return {
        key: item.key,
        label: item.label,
        mode: item.mode,
        iconKey: item.iconKey || 'home',
        presetKey: '',
        presetKeys: resolvedPresetKeys,
        subtitle,
        externalUrl: item.externalUrl || 'https://www.uied.cn',
      };
    }

    return {
      key: item.key,
      label: item.label,
      mode: item.mode,
      iconKey: item.iconKey || 'extra',
      presetKey: '',
      presetKeys: resolvedPresetKeys,
      subtitle,
      query: queryBase,
    };
  });
  return list;
};

/**
 * 根据当前菜单筛选可见预设：若菜单未配置筛选组，则回退到全量预设。
 */
const resolveVisiblePresets = (
  menuItem: RuntimeMenuItem | null,
  presets: HotArticleFilterPreset[],
): HotArticleFilterPreset[] => {
  if (!Array.isArray(presets) || presets.length === 0) return [];
  if (!menuItem) return presets;
  const menuPresetKeys = Array.isArray(menuItem.presetKeys) ? menuItem.presetKeys : [];
  if (menuPresetKeys.length === 0) return presets;
  const keySet = new Set(menuPresetKeys.map((key) => String(key || '').trim().toLowerCase()).filter(Boolean));
  const allPreset = presets.find((item) => item.key === 'all');
  if (allPreset && !keySet.has(allPreset.key)) keySet.add(allPreset.key);
  const filtered = presets.filter((item) => keySet.has(item.key));
  return filtered.length > 0 ? filtered : presets;
};

/**
 * 格式化顶部时间文案（HH:mm:ss）。
 */
const formatClockText = (value: Date): string => {
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  const second = String(value.getSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
};

/**
 * 格式化顶部日期文案（MM/DD周X）。
 */
const formatDateText = (value: Date): string => {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const date = String(value.getDate()).padStart(2, '0');
  const weekday = WEEKDAY_TEXT[value.getDay()] || '';
  return `${month}/${date}${weekday}`;
};

/**
 * 渲染左侧菜单图标字徽。
 */
const renderMenuIcon = (iconKey: WorkbenchIconKey) => {
  /**
   * 使用固定分支渲染，规避动态组件在 TS + React19 下的类型推断问题。
   */
  const createIconNode = (IconComponent: unknown) => React.createElement(IconComponent as React.ComponentType<any>, { size: 14 });
  const iconNode = (() => {
    if (iconKey === 'latest') return createIconNode(AiOutlineFileText);
    if (iconKey === 'hot') return createIconNode(AiOutlineStar);
    if (iconKey === 'ai') return createIconNode(AiOutlineRobot);
    if (iconKey === 'product') return createIconNode(AiOutlineTrophy);
    if (iconKey === 'design') return createIconNode(AiOutlineDesktop);
    if (iconKey === 'resource') return createIconNode(AiOutlineAppstore);
    if (iconKey === 'author') return createIconNode(AiOutlineCrown);
    if (iconKey === 'circle') return createIconNode(AiOutlineRead);
    if (iconKey === 'home') return createIconNode(AiOutlineHome);
    return createIconNode(AiOutlinePlus);
  })();
  return (
    <span className="hot-articles-page__menu-icon" aria-hidden="true">
      {iconNode}
    </span>
  );
};

/**
 * 根据当前预设覆盖分类/标签查询参数。
 */
const applyFilterPresetToParams = (
  params: HotArticleListParams,
  preset: HotArticleFilterPreset | null,
): HotArticleListParams => {
  if (!preset || preset.type === 'all' || Number(preset.id) <= 0) return params;
  if (preset.type === 'tag') {
    return {
      ...params,
      tagId: Number(preset.id),
      categoryId: undefined,
    };
  }
  if (preset.type === 'category') {
    return {
      ...params,
      categoryId: Number(preset.id),
      tagId: undefined,
    };
  }
  return params;
};

/**
 * Hot 页面首屏预加载过渡组件，避免重内容页面首次进入突兀闪动。
 */
const HotPagePreloader: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="hot-articles-page__preloader" role="status" aria-live="polite">
      <div className="hot-articles-page__preloader-head">
        <span className="hot-articles-page__preloader-dot" />
        <strong>{title}</strong>
      </div>
      <div className="hot-articles-page__preloader-lines">
        <span />
        <span />
        <span />
      </div>
      <p>正在准备热门内容...</p>
    </div>
  );
};

/**
 * 热门文章页面组件。
 */
const HotArticlesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const [displayConfig, setDisplayConfig] = useState<HotArticlesDisplayConfig | null>(null);
  const [activeMenuKey, setActiveMenuKey] = useState<string>('');
  const [activePresetKey, setActivePresetKey] = useState<string>('all');
  const [articleList, setArticleList] = useState<HotArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [bootCompleted, setBootCompleted] = useState<boolean>(false);
  const [activatedHubPanels, setActivatedHubPanels] = useState<Record<Exclude<ContentHubTabKey, 'hot'>, boolean>>({
    rankings: false,
    'daily-hot': false,
    'daily-new': false,
  });
  const preloadedHubTabRef = useRef<Set<ContentHubTabKey>>(new Set<ContentHubTabKey>([ 'hot' ]));
  const [hubSwitchItems, setHubSwitchItems] = useState<Array<{
    key: ContentHubTabKey;
    label: string;
    to: string;
    description: string;
  }>>([ ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS ]);

  /**
   * 生效筛选项（按后台排序，自动过滤禁用项）。
   */
  const enabledPresets = useMemo<HotArticleFilterPreset[]>(() => {
    const rows = Array.isArray(displayConfig?.filterPresets) ? displayConfig?.filterPresets || [] : [];
    const forcedVisibleKeySet = new Set(
      (Array.isArray(displayConfig?.workbenchMenuItems) ? (displayConfig?.workbenchMenuItems ?? []) : [])
        .filter((menu) => menu?.enabled !== false)
        .flatMap((menu) => {
          const keys = Array.isArray(menu?.presetKeys) ? menu.presetKeys : [];
          const presetKey = String(menu?.presetKey || '').trim();
          return presetKey ? [ ...keys, presetKey ] : keys;
        })
        .map((key) => String(key || '').trim().toLowerCase())
        .filter(Boolean),
    );
    const list = rows
      .filter((item) => item?.enabled !== false || forcedVisibleKeySet.has(String(item?.key || '').trim().toLowerCase()))
      .sort((a, b) => a.sort - b.sort);
    if (list.length > 0) return list;
    return [ { key: 'all', name: '全部', type: 'all', id: 0, enabled: true, sort: 10 } ];
  }, [displayConfig?.filterPresets, displayConfig?.workbenchMenuItems]);

  /**
   * 左侧菜单数据。
   */
  const menuItems = useMemo<RuntimeMenuItem[]>(
    () => buildRuntimeMenuItems(displayConfig, enabledPresets),
    [displayConfig, enabledPresets],
  );

  /**
   * 当前激活菜单项。
   */
  const activeMenu = useMemo<RuntimeMenuItem | null>(() => {
    return menuItems.find((item) => item.key === activeMenuKey) || menuItems.find((item) => item.mode !== 'external') || null;
  }, [activeMenuKey, menuItems]);
  /**
   * 当前菜单对应可见预设。
   */
  const visiblePresets = useMemo<HotArticleFilterPreset[]>(() => {
    return resolveVisiblePresets(activeMenu, enabledPresets);
  }, [activeMenu, enabledPresets]);
  /**
   * 当前激活预设（分类/标签切换）。
   */
  const activePreset = useMemo<HotArticleFilterPreset | null>(() => {
    if (!visiblePresets.length) return null;
    return visiblePresets.find((item) => item.key === activePresetKey) || visiblePresets[0] || null;
  }, [activePresetKey, visiblePresets]);

  const isPageDisabled = displayConfig?.enabled === false;
  const pageTitle = String(displayConfig?.pageTitle || '热门文章').trim() || '热门文章';
  const pageDescription = String(displayConfig?.pageDescription || '聚合国内外AI精选内容，探索AI技术前沿与应用').trim();
  const pageKicker = String(displayConfig?.pageKicker || 'HOT ARTICLES').trim() || 'HOT ARTICLES';
  const heroTagline = String(displayConfig?.heroTagline || pageDescription).trim() || pageDescription;
  const hubHeaderKicker = String(displayConfig?.hubHeaderKicker || pageKicker).trim() || pageKicker;
  const hubHeaderTitle = String(displayConfig?.hubHeaderTitle || '内容中心').trim() || '内容中心';
  const hubHeaderDescription = String(displayConfig?.hubHeaderDescription || '热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。').trim()
    || '热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。';
  const activeHubTab = useMemo<ContentHubTabKey>(
    () => resolveContentHubTab(searchParams.get('tab')),
    [searchParams],
  );
  const linkTarget = displayConfig?.linksNewWindow !== false ? '_blank' : undefined;
  const linkRel = displayConfig?.linksNewWindow !== false ? 'noopener noreferrer' : undefined;

  /**
   * 拉取内容中心四个模块的公开文案，驱动顶部切换菜单名称。
   */
  const refreshHubSwitchItems = useCallback(async (hotConfig: HotArticlesDisplayConfig) => {
    const fallbackHotLabel = String(hotConfig?.displayLabel || '热门文章').trim() || '热门文章';
    const fallbackItems = [
      { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[0], label: fallbackHotLabel },
      { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[1] },
      { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[2] },
      { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[3] },
    ];
    try {
      const [dailyHotConfig, dailyNewConfig, rankingAggregate] = await Promise.all([
        getDailyHotDisplayConfig(),
        getDailyNewDisplayConfig(),
        getRankingsAggregate(1),
      ]);
      const rankingsLabel = String(rankingAggregate?.publicConfig?.displayLabel || '').trim() || '热门榜单';
      const dailyHotLabel = String(dailyHotConfig?.displayLabel || '').trim() || '每日热榜';
      const dailyNewLabel = String(dailyNewConfig?.displayLabel || '').trim() || '最新上新';
      setHubSwitchItems([
        { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[0], label: fallbackHotLabel },
        { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[1], label: rankingsLabel },
        { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[2], label: dailyHotLabel },
        { ...DEFAULT_CONTENT_HUB_SWITCH_ITEMS[3], label: dailyNewLabel },
      ]);
    } catch (switchError) {
      console.warn('加载内容中心切换菜单文案失败，使用默认文案:', switchError);
      setHubSwitchItems(fallbackItems);
    }
  }, []);

  /**
   * 处理顶部频道切换：保持 /p/hot 路由，仅更新 tab 参数。
   */
  const handleHubTabChange = useCallback((nextKey: string) => {
    const nextTab = resolveContentHubTab(nextKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: false });
  }, [searchParams, setSearchParams]);

  /**
   * 读取会话记忆：首次进入 /p/hot 且 URL 未指定 tab 时，恢复上次浏览标签。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryTab = String(searchParams.get('tab') || '').trim();
    if (queryTab) return;
    const rememberedTab = resolveContentHubTab(window.sessionStorage.getItem(HOT_HUB_ACTIVE_TAB_STORAGE_KEY));
    if (!rememberedTab || rememberedTab === 'hot') return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', rememberedTab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  /**
   * 记录当前内容中心标签到 sessionStorage，实现跨页面返回时状态记忆。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(HOT_HUB_ACTIVE_TAB_STORAGE_KEY, activeHubTab);
  }, [activeHubTab]);

  /**
   * 当前访问过的模块保持挂载，避免反复切换导致重复初始化与闪烁。
   */
  useEffect(() => {
    if (activeHubTab === 'hot') return;
    setActivatedHubPanels((prev) => {
      if (prev[activeHubTab]) return prev;
      return {
        ...prev,
        [activeHubTab]: true,
      };
    });
  }, [activeHubTab]);

  /**
   * 预加载下一个模块核心数据，减少切换等待（接口层有缓存，不会重复高频打接口）。
   */
  const preloadHubTabData = useCallback(async (tabKey: ContentHubTabKey) => {
    if (tabKey === 'rankings') {
      await getRankingsAggregate(12);
      return;
    }
    if (tabKey === 'daily-hot') {
      await Promise.all([
        getDailyHotDisplayConfig(),
        getDailyHotPlatforms(),
        getDailyHot({ limit: 10 }),
      ]);
      return;
    }
    if (tabKey === 'daily-new') {
      await Promise.all([
        getDailyNewDisplayConfig(),
        getDailyNewWebsites({ page: 1, pageSize: 24, days: 7, sortBy: 'latest' }),
      ]);
    }
  }, []);

  /**
   * 邻近标签预加载策略：在当前 tab 稳定后预热下一个 tab，提升切换流畅度。
   */
  useEffect(() => {
    const orderedTabs: ContentHubTabKey[] = [ 'hot', 'rankings', 'daily-hot', 'daily-new' ];
    const currentIndex = orderedTabs.indexOf(activeHubTab);
    if (currentIndex < 0) return;
    const nextTab = orderedTabs[(currentIndex + 1) % orderedTabs.length];
    if (preloadedHubTabRef.current.has(nextTab)) return;
    const timer = window.setTimeout(() => {
      preloadHubTabData(nextTab)
        .catch((error) => {
          console.warn('预加载内容中心模块失败:', nextTab, error);
        })
        .finally(() => {
          preloadedHubTabRef.current.add(nextTab);
        });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [activeHubTab, preloadHubTabData]);

  /**
   * 首屏完成判定：配置加载并完成首轮内容请求后关闭 Preloader。
   */
  useEffect(() => {
    if (bootCompleted) return;
    if (!displayConfig) return;
    if (loading) return;
    if (!activeMenu && !isPageDisabled) return;
    const timer = window.setTimeout(() => setBootCompleted(true), 220);
    return () => window.clearTimeout(timer);
  }, [activeMenu, bootCompleted, displayConfig, isPageDisabled, loading]);

  /**
   * 拉取热门文章公开配置。
   */
  const fetchConfig = useCallback(async (forceRefresh = false) => {
    const config = await getHotArticlesDisplayConfig(forceRefresh);
    setDisplayConfig(config);
    await refreshHubSwitchItems(config);
    return config;
  }, [refreshHubSwitchItems]);

  /**
   * 按菜单项拉取文章列表。
   */
  const requestArticleList = useCallback(
    async (
      menuItem: RuntimeMenuItem,
      config: HotArticlesDisplayConfig,
      preset: HotArticleFilterPreset | null,
      forceRefresh = false,
    ): Promise<HotArticleItem[]> => {
      const baseParams: HotArticleListParams = {
        page: 1,
        perPage: Number(config.pageSize || 24),
        source: config.apiSourceMode || 'auto',
        orderBy: config.defaultOrderBy || 'date',
        order: config.defaultOrder || 'desc',
        ...menuItem.query,
      };
      const params = applyFilterPresetToParams(baseParams, preset);
      return await getHotArticles(params, forceRefresh);
    },
    [],
  );

  /**
   * 首次加载页面配置。
   */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchConfig()
      .catch((err: any) => {
        console.error('加载热门文章配置失败:', err);
        if (mounted) setError(String(err?.message || '加载配置失败，请稍后重试'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [fetchConfig]);

  /**
   * 自动校正激活菜单，避免指向失效 key。
   */
  useEffect(() => {
    if (!menuItems.length) return;
    const valid = menuItems.find((item) => item.key === activeMenuKey && item.mode !== 'external');
    if (valid) return;
    const firstMenu = menuItems.find((item) => item.mode !== 'external');
    if (firstMenu) setActiveMenuKey(firstMenu.key);
  }, [activeMenuKey, menuItems]);
  /**
   * 自动校正筛选预设，防止 key 失效。
   */
  useEffect(() => {
    if (!visiblePresets.length) return;
    const valid = visiblePresets.some((item) => item.key === activePresetKey);
    if (valid) return;
    setActivePresetKey(visiblePresets[0].key);
  }, [activePresetKey, visiblePresets]);

  /**
   * 菜单切换后加载内容。
   */
  useEffect(() => {
    if (activeHubTab !== 'hot') return;
    if (!displayConfig || isPageDisabled || !activeMenu || activeMenu.mode === 'external') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    requestArticleList(activeMenu, displayConfig, activePreset)
      .then((rows) => {
        if (!cancelled) setArticleList(Array.isArray(rows) ? rows : []);
      })
      .catch((err: any) => {
        console.error('加载热门文章失败:', err);
        if (!cancelled) setError(String(err?.message || '加载失败，请稍后重试'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeHubTab, activeMenu, activePreset, displayConfig, isPageDisabled, requestArticleList]);

  /**
   * 每秒更新时间显示。
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * 处理左侧菜单点击。
   */
  const handleMenuClick = (item: RuntimeMenuItem) => {
    if (item.mode === 'external' && item.externalUrl) {
      window.location.href = item.externalUrl;
      return;
    }
    const nextVisiblePresets = resolveVisiblePresets(item, enabledPresets);
    const defaultPresetKey = item.presetKey && nextVisiblePresets.some((preset) => preset.key === item.presetKey)
      ? item.presetKey
      : (nextVisiblePresets[0]?.key || enabledPresets[0]?.key || 'all');
    setActivePresetKey(defaultPresetKey);
    setActiveMenuKey(item.key);
  };

  /**
   * 处理手动刷新。
   */
  const handleRefresh = async () => {
    if (!displayConfig || !activeMenu || activeMenu.mode === 'external') return;
    setRefreshing(true);
    setError(null);
    try {
      const latestConfig = await fetchConfig(true);
      const rows = await requestArticleList(activeMenu, latestConfig, activePreset, true);
      setArticleList(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      console.error('刷新热门文章失败:', err);
      setError(String(err?.message || '刷新失败，请稍后重试'));
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 渲染列表骨架屏。
   */
  const renderSkeletonRows = (latestLayout = false) => {
    return Array.from({ length: 6 }).map((_, index) => (
      <article
        key={`skeleton-${index}`}
        className={`hot-articles-page__row hot-articles-page__row--skeleton ${latestLayout ? 'hot-articles-page__row--latest' : ''}`.trim()}
      >
        <div className="hot-articles-page__rank-skeleton" />
        <div className="hot-articles-page__thumb-skeleton" />
        <div className="hot-articles-page__line-group">
          <span />
          <span />
          <span />
        </div>
      </article>
    ));
  };

  return (
    <div className={`hot-articles-page hot-articles-page--layout-${detailLayoutWidthMode}`.trim()}>
      <SEO title={pageTitle} description={pageDescription} url="https://hao.uied.cn/p/hot" />
      <div className="hot-articles-page__shell">
        {displayConfig?.motionEnabled !== false ? (
          <HotMotionHero description={heroTagline} />
        ) : null}

        <section className="hot-articles-page__hub-header" aria-label="内容中心头部">
          <div className="hot-articles-page__hub-header-main">
            <span>{hubHeaderKicker}</span>
            <h1>{hubHeaderTitle}</h1>
            <p>{hubHeaderDescription}</p>
          </div>
          <div className="hot-articles-page__hub-header-extra">
            <strong>{formatClockText(currentTime)}</strong>
            <span>{formatDateText(currentTime)}</span>
          </div>
        </section>
        <ContentHubSwitch
          className="hot-articles-page__channel-switch"
          items={hubSwitchItems}
          activeKey={activeHubTab}
          onChange={handleHubTabChange}
        />

        {activeHubTab === 'hot' ? (
          <section className="hot-articles-page__workbench">
          <aside className="hot-articles-page__sidebar" aria-label="热门文章菜单">
            <div className="hot-articles-page__sidebar-title">
              <span>{pageKicker}</span>
              <strong>{pageTitle}</strong>
            </div>
            <ul className="hot-articles-page__menu-list">
              {menuItems.map((item) => {
                const isActive = item.key === activeMenu?.key && item.mode !== 'external';
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={`hot-articles-page__menu-item ${isActive ? 'is-active' : ''} ${item.mode === 'external' ? 'is-external' : ''}`}
                      onClick={() => handleMenuClick(item)}
                    >
                      {renderMenuIcon(item.iconKey)}
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="hot-articles-page__content">
            <header className="hot-articles-page__panel-head">
              <div className="hot-articles-page__panel-title">
                <h1>{activeMenu?.label || pageTitle}</h1>
                {activeMenu?.subtitle ? <p>{activeMenu.subtitle}</p> : null}
              </div>
              <div className="hot-articles-page__panel-actions">
                <button
                  type="button"
                  className={`hot-articles-page__refresh ${refreshing ? 'is-refreshing' : ''}`}
                  onClick={handleRefresh}
                  disabled={refreshing || loading || isPageDisabled}
                >
                  <span className="hot-articles-page__refresh-icon" aria-hidden="true" />
                  {refreshing ? '刷新中' : '刷新'}
                </button>
              </div>
            </header>
            {!isPageDisabled && visiblePresets.length > 0 && (
              <div className="hot-articles-page__preset-switch" role="tablist" aria-label="分类与标签筛选">
                {visiblePresets.map((item) => {
                  const isActive = activePreset?.key === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`hot-articles-page__preset-chip ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActivePresetKey(item.key)}
                    >
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isPageDisabled && (
              <div className="hot-articles-page__state">
                热门文章页面当前已关闭，请在后台「热门文章配置」中开启。
              </div>
            )}

            {!isPageDisabled && error && (
              <div className="hot-articles-page__state hot-articles-page__state--error">{error}</div>
            )}

            {!isPageDisabled && !error && loading && (
              <section className="hot-articles-page__list">{renderSkeletonRows(activeMenu?.mode === 'latest')}</section>
            )}

            {!isPageDisabled && !error && !loading && articleList.length === 0 && (
              <div className="hot-articles-page__state">暂无文章数据</div>
            )}

            {!isPageDisabled && !error && !loading && articleList.length > 0 && (
              <section className="hot-articles-page__list">
                {articleList.map((item, index) => {
                  const title = String(item?.name || '').trim() || `文章 ${index + 1}`;
                  const desc = String(item?.description || '').trim();
                  const link = String(item?.link || '').trim();
                  const thumb = String(item?.thumbnail || '').trim();
                  const authorName = String(item?.authorName || '').trim() || '匿名作者';
                  const authorAvatar = String(item?.authorAvatar || '').trim();
                  const viewText = formatCompactCount(item?.viewCount);
                  const commentText = formatCompactCount(item?.commentCount);
                  const authorColorToken = resolveAuthorColorToken(authorName);
                  const heatLabel = resolveHeatLabel(item?.viewCount, item?.commentCount);
                  const isLatestMenu = activeMenu?.mode === 'latest';
                  return (
                    <article
                      key={`${item.id || title}-${index}`}
                      className={`hot-articles-page__row hot-articles-page__row--animated ${isLatestMenu ? 'hot-articles-page__row--latest' : ''}`.trim()}
                      style={{ '--row-index': index } as React.CSSProperties}
                    >
                      <div className={`hot-articles-page__rank-badge ${index < 3 ? `is-top-${index + 1}` : ''}`}>
                        {index + 1}
                      </div>
                      <a
                        className="hot-articles-page__thumb"
                        href={link || '#'}
                        target={linkTarget}
                        rel={linkRel}
                      >
                        {thumb ? (
                          <img src={thumb} alt={title} loading="lazy" decoding="async" />
                        ) : (
                          <span className="hot-articles-page__thumb-empty">NO IMAGE</span>
                        )}
                      </a>
                      <div className="hot-articles-page__info">
                        <div className="hot-articles-page__title-row">
                          <h2>
                            <a href={link || '#'} target={linkTarget} rel={linkRel}>
                              {title}
                            </a>
                            {index < 3 ? (
                              <span className="hot-articles-page__top-update">TOP{index + 1}</span>
                            ) : null}
                          </h2>
                          <div className="hot-articles-page__title-tags">
                            {heatLabel ? <span className="hot-articles-page__title-heat">{heatLabel}</span> : null}
                          </div>
                        </div>
                        <p>{desc || '暂无摘要'}</p>
                        <div className="hot-articles-page__meta">
                          <div className="hot-articles-page__author-chip">
                            {authorAvatar ? (
                              <img src={authorAvatar} alt={authorName} loading="lazy" decoding="async" />
                            ) : (
                              <span className={`hot-articles-page__author-fallback ${authorColorToken}`}>
                                {authorName.slice(0, 1)}
                              </span>
                            )}
                            <strong>{authorName}</strong>
                          </div>
                          {item?.date ? <span>{item.date}</span> : null}
                          {viewText ? <span>阅读 {viewText}</span> : null}
                          {commentText ? <span>评论 {commentText}</span> : null}
                          {item?.isNew ? <em>NEW</em> : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </main>
          </section>
        ) : (
          <section className="hot-articles-page__hub-panel" aria-label="内容中心主内容区">
            {(activatedHubPanels.rankings || activeHubTab === 'rankings') && (
              <div className={`hot-articles-page__hub-tab-panel ${activeHubTab === 'rankings' ? 'is-active' : ''}`}>
                <RankingsPage embedded />
              </div>
            )}
            {(activatedHubPanels['daily-hot'] || activeHubTab === 'daily-hot') && (
              <div className={`hot-articles-page__hub-tab-panel ${activeHubTab === 'daily-hot' ? 'is-active' : ''}`}>
                <DailyHotPage embedded />
              </div>
            )}
            {(activatedHubPanels['daily-new'] || activeHubTab === 'daily-new') && (
              <div className={`hot-articles-page__hub-tab-panel ${activeHubTab === 'daily-new' ? 'is-active' : ''}`}>
                <DailyNewPage embedded />
              </div>
            )}
          </section>
        )}
      </div>
      {!bootCompleted && activeHubTab === 'hot' && <HotPagePreloader title={pageTitle} />}
    </div>
  );
};

export default HotArticlesPage;
