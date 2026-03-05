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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import HotMotionHero from './HotMotionHero';
import './index.css';

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
  subtitle: string;
  externalUrl?: string;
  query?: HotArticleListParams;
}

const WEEKDAY_TEXT = [ '周日', '周一', '周二', '周三', '周四', '周五', '周六' ];
const MENU_ICON_PATH_MAP: Record<WorkbenchIconKey, string> = {
  latest: 'M4 5.5h16M4 10.5h16M4 15.5h12',
  hot: 'M12 3l2.4 4.9L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.6-.1L12 3z',
  ai: 'M8 4h8l2 2v8l-2 2H8l-2-2V6l2-2zm0 4h8M8 12h4',
  product: 'M4 7l8-3 8 3-8 3-8-3zm2 4l6 3 6-3m-12 4l6 3 6-3',
  design: 'M4 16l4-4m3-3l5-5 2 2-5 5m-2 2l-3 1 1-3',
  resource: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 4h7',
  author: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0',
  circle: 'M12 3a9 9 0 100 18 9 9 0 000-18zm-4 7h8m-8 4h8',
  extra: 'M6 12h12M12 6v12',
  home: 'M4 10l8-6 8 6v9h-5v-5H9v5H4v-9z',
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
 * 组装左侧菜单（优先使用后台 workbenchMenuItems，自动补未使用预设）。
 */
const buildRuntimeMenuItems = (
  config: HotArticlesDisplayConfig | null,
  presets: HotArticleFilterPreset[],
): RuntimeMenuItem[] => {
  const presetMap = new Map<string, HotArticleFilterPreset>(presets.map((item) => [ item.key, item ]));
  const usedPresetKeySet = new Set<string>();
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

    if (item.mode === 'preset') {
      if (item.presetKey) usedPresetKeySet.add(item.presetKey);
      const presetQuery = resolvePresetQuery(item.presetKey, presetMap, item.fallbackType, item.fallbackId);
      return {
        key: item.key,
        label: item.label,
        mode: item.mode,
        iconKey: item.iconKey || 'extra',
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
        subtitle,
        externalUrl: item.externalUrl || 'https://www.uied.cn',
      };
    }

    return {
      key: item.key,
      label: item.label,
      mode: item.mode,
      iconKey: item.iconKey || 'extra',
      subtitle,
      query: queryBase,
    };
  });

  const extraPresetItems = presets
    .filter((item) => item.enabled !== false && item.type !== 'all' && !usedPresetKeySet.has(item.key))
    .sort((a, b) => a.sort - b.sort)
    .map<RuntimeMenuItem>((item) => ({
      key: `preset-${item.key}`,
      label: item.name,
      mode: 'preset',
      iconKey: 'extra',
      subtitle: item.description || '来自后台筛选预设',
      query: {
        source: config?.apiSourceMode || 'auto',
        orderBy: config?.defaultOrderBy || 'date',
        order: config?.defaultOrder || 'desc',
        categoryId: item.type === 'category' ? item.id : undefined,
        tagId: item.type === 'tag' ? item.id : undefined,
      },
    }));

  if (!extraPresetItems.length) return list;
  const homeItem = list.find((item) => item.mode === 'external');
  const regularItems = list.filter((item) => item.mode !== 'external');
  return homeItem ? [ ...regularItems, ...extraPresetItems, homeItem ] : [ ...regularItems, ...extraPresetItems ];
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
  const path = MENU_ICON_PATH_MAP[iconKey] || MENU_ICON_PATH_MAP.extra;
  return (
    <span className="hot-articles-page__menu-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d={path} />
      </svg>
    </span>
  );
};

/**
 * 热门文章页面组件。
 */
const HotArticlesPage: React.FC = () => {
  const [displayConfig, setDisplayConfig] = useState<HotArticlesDisplayConfig | null>(null);
  const [activeMenuKey, setActiveMenuKey] = useState<string>('');
  const [articleList, setArticleList] = useState<HotArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  /**
   * 生效筛选项（按后台排序，自动过滤禁用项）。
   */
  const enabledPresets = useMemo<HotArticleFilterPreset[]>(() => {
    const rows = Array.isArray(displayConfig?.filterPresets) ? displayConfig?.filterPresets || [] : [];
    const list = rows.filter((item) => item?.enabled !== false).sort((a, b) => a.sort - b.sort);
    if (list.length > 0) return list;
    return [ { key: 'all', name: '全部', type: 'all', id: 0, enabled: true, sort: 10 } ];
  }, [displayConfig?.filterPresets]);

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

  const isPageDisabled = displayConfig?.enabled === false;
  const pageTitle = String(displayConfig?.pageTitle || '热门文章').trim() || '热门文章';
  const pageDescription = String(displayConfig?.pageDescription || '聚合国内外AI精选内容，探索AI技术前沿与应用').trim();
  const pageKicker = String(displayConfig?.pageKicker || 'HOT ARTICLES').trim() || 'HOT ARTICLES';
  const heroTagline = String(displayConfig?.heroTagline || pageDescription).trim() || pageDescription;
  const linkTarget = displayConfig?.linksNewWindow !== false ? '_blank' : undefined;
  const linkRel = displayConfig?.linksNewWindow !== false ? 'noopener noreferrer' : undefined;

  /**
   * 拉取热门文章公开配置。
   */
  const fetchConfig = useCallback(async (forceRefresh = false) => {
    const config = await getHotArticlesDisplayConfig(forceRefresh);
    setDisplayConfig(config);
    return config;
  }, []);

  /**
   * 按菜单项拉取文章列表。
   */
  const requestArticleList = useCallback(
    async (menuItem: RuntimeMenuItem, config: HotArticlesDisplayConfig, forceRefresh = false): Promise<HotArticleItem[]> => {
      const params: HotArticleListParams = {
        page: 1,
        perPage: Number(config.pageSize || 24),
        source: config.apiSourceMode || 'auto',
        orderBy: config.defaultOrderBy || 'date',
        order: config.defaultOrder || 'desc',
        ...menuItem.query,
      };
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
   * 菜单切换后加载内容。
   */
  useEffect(() => {
    if (!displayConfig || isPageDisabled || !activeMenu || activeMenu.mode === 'external') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    requestArticleList(activeMenu, displayConfig)
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
  }, [activeMenu, displayConfig, isPageDisabled, requestArticleList]);

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
      const rows = await requestArticleList(activeMenu, latestConfig, true);
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
  const renderSkeletonRows = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <article key={`skeleton-${index}`} className="hot-articles-page__row hot-articles-page__row--skeleton">
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
    <div className="hot-articles-page">
      <SEO title={pageTitle} description={pageDescription} url="https://hao.uied.cn/p/hot" />
      <div className="hot-articles-page__shell">
        {displayConfig?.motionEnabled !== false ? (
          <HotMotionHero description={heroTagline} />
        ) : null}

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
                <div className="hot-articles-page__time-block">
                  <strong>{formatClockText(currentTime)}</strong>
                  <span>{formatDateText(currentTime)}</span>
                </div>
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

            {isPageDisabled && (
              <div className="hot-articles-page__state">
                热门文章页面当前已关闭，请在后台「热门文章配置」中开启。
              </div>
            )}

            {!isPageDisabled && error && (
              <div className="hot-articles-page__state hot-articles-page__state--error">{error}</div>
            )}

            {!isPageDisabled && !error && loading && (
              <section className="hot-articles-page__list">{renderSkeletonRows()}</section>
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
                  return (
                    <article key={`${item.id || title}-${index}`} className="hot-articles-page__row">
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
                        <h2>
                          <a href={link || '#'} target={linkTarget} rel={linkRel}>
                            {title}
                          </a>
                        </h2>
                        <p>{desc || '暂无摘要'}</p>
                        <div className="hot-articles-page__meta">
                          {item?.authorName ? <span>{item.authorName}</span> : null}
                          {item?.date ? <span>{item.date}</span> : null}
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
      </div>
    </div>
  );
};

export default HotArticlesPage;
