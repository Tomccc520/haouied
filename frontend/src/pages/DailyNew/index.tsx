/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 */
/**
 * @file DailyNew/index.tsx
 * @description 每日上新网址页面（日报时间线版）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import ContentHubSwitch from '../../components/ContentHubSwitch';
import WebsiteFavicon from '../../components/WebsiteFavicon';
import { useFrontendConfig } from '../../hooks/useFrontendConfig';
import { useDetailLayoutWidthMode } from '../../hooks/useDetailLayoutWidthMode';
import { usePermalinkConfig, generateWebsiteUrl } from '../../hooks/usePermalinkConfig';
import { appendRefParamToUrl } from '../../utils/clickMode';
import { recordWebsiteClick } from '../../services/api';
import {
  getDailyNewWebsites,
  getDailyNewDisplayConfig,
  type DailyNewWebsiteItem,
  type DailyNewDisplayConfig,
} from '../../services/dailyNewService';
import './index.css';

const PAGE_SIZE = 30;
const DEFAULT_DAY_RANGE = 7;
const BASE_DAY_OPTIONS = [
  { value: 1, label: '今天' },
  { value: 3, label: '近3天' },
  { value: 7, label: '近7天' },
];

interface DailyNewDayGroup {
  key: string;
  label: string;
  items: DailyNewWebsiteItem[];
}

interface DailyNewPageProps {
  embedded?: boolean;
}

/**
 * 解析站点上新时间（优先 latestAt）。
 */
const resolveItemDate = (item: DailyNewWebsiteItem): Date | null => {
  const raw = String(item.latestAt || item.updatedAt || item.createdAt || '');
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 统一格式化分组日期文案。
 */
const formatGroupDateLabel = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = [ '周日', '周一', '周二', '周三', '周四', '周五', '周六' ];
  return `${yyyy}-${mm}-${dd} ${weekdays[date.getDay()]}`;
};

/**
 * 格式化行内时间（HH:mm）。
 */
const formatItemTime = (date: Date | null): string => {
  if (!date) return '--:--';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * 构建按天分组的日报结构（按时间倒序）。
 */
const buildDayGroups = (items: DailyNewWebsiteItem[]): DailyNewDayGroup[] => {
  const map = new Map<string, DailyNewWebsiteItem[]>();
  items.forEach((item) => {
    const date = resolveItemDate(item);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(item);
  });

  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([ key, rows ]) => {
      const sortedRows = [ ...rows ].sort((left, right) => {
        const leftDate = resolveItemDate(left)?.getTime() || 0;
        const rightDate = resolveItemDate(right)?.getTime() || 0;
        return rightDate - leftDate;
      });
      const firstDate = resolveItemDate(sortedRows[0]);
      return {
        key,
        label: firstDate ? formatGroupDateLabel(firstDate) : key,
        items: sortedRows,
      };
    });
};

/**
 * 统计今天新增数量。
 */
const countTodayItems = (items: DailyNewWebsiteItem[]): number => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  return items.filter((item) => {
    const date = resolveItemDate(item);
    return !!date && date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
  }).length;
};

/**
 * 提取行状态标签（用于运营快速识别）。
 */
const getEntryStatusLabel = (item: DailyNewWebsiteItem): string => {
  if (item.isFeatured) return '推荐';
  if (item.isHot) return '热门';
  if (item.isNew) return '新收录';
  return '';
};

const DailyNewPage: React.FC<DailyNewPageProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const { config: frontendConfig } = useFrontendConfig();
  const { config: permalinkConfig } = usePermalinkConfig();
  const pageGlobal = frontendConfig.pageGlobalConfig;
  const [displayConfig, setDisplayConfig] = useState<DailyNewDisplayConfig | null>(null);
  const [days, setDays] = useState<number>(DEFAULT_DAY_RANGE);
  const defaultDaysInitialized = useRef(false);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<DailyNewWebsiteItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [since, setSince] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeDayGroupKey, setActiveDayGroupKey] = useState<string>('');
  const dayGroupRefMap = useRef<Record<string, HTMLElement | null>>({});

  const pageKicker = String(
    displayConfig?.pageKicker || frontendConfig.homepageConfig.dailyNewPageKicker || 'Daily Fresh',
  ).trim() || 'Daily Fresh';
  const pageTitle = String(
    displayConfig?.pageTitle || frontendConfig.homepageConfig.dailyNewPageTitle || '每日上新网址',
  ).trim() || '每日上新网址';
  const pageDescription = String(
    displayConfig?.pageDescription
      || frontendConfig.homepageConfig.dailyNewPageDescription
      || '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
  ).trim() || '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。';

  /**
   * 每日上新默认固定近 7 天，避免运营配置差异导致前台默认范围不一致。
   */
  const defaultDays = DEFAULT_DAY_RANGE;

  const dayOptions = useMemo(() => {
    const exists = BASE_DAY_OPTIONS.some((item) => item.value === defaultDays);
    if (exists) return BASE_DAY_OPTIONS;
    return [ ...BASE_DAY_OPTIONS, { value: defaultDays, label: `近${defaultDays}天` } ].sort(
      (a, b) => a.value - b.value,
    );
  }, [defaultDays]);

  /**
   * 加载每日上新公开展示配置（含页面文案）。
   */
  const loadDisplayConfig = useCallback(async () => {
    try {
      const config = await getDailyNewDisplayConfig();
      setDisplayConfig(config);
    } catch (requestError) {
      console.error('获取每日上新展示配置失败:', requestError);
    }
  }, []);

  /**
   * 初始化默认天数（仅首次生效，避免配置加载后覆盖用户选择）。
   */
  useEffect(() => {
    if (defaultDaysInitialized.current) return;
    setDays(defaultDays);
    defaultDaysInitialized.current = true;
  }, [defaultDays]);

  useEffect(() => {
    loadDisplayConfig();
  }, [loadDisplayConfig]);

  /**
   * 拉取日报列表；append=true 时按分页追加。
   */
  const fetchDailyNewList = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);
      setError('');
      try {
        const result = await getDailyNewWebsites({
          days,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [ ...prev, ...(result.list || []) ] : result.list || []));
        setTotal(Number(result.total || 0));
        setHasMore(result.hasMore === true);
        setSince(String(result.since || ''));
        setPage(Number(result.page || nextPage));
      } catch (requestError) {
        console.error('获取每日上新失败:', requestError);
        setError('加载失败，请稍后重试');
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    fetchDailyNewList(1, false);
  }, [fetchDailyNewList]);

  /**
   * 切换统计天数并重置当前分组选择，保持左右分栏交互一致。
   * @param nextDays 目标天数
   */
  const handleChangeDays = useCallback((nextDays: number) => {
    setDays(nextDays);
    setActiveDayGroupKey('');
  }, []);

  /**
   * 上报网站点击，失败时静默处理，不阻断页面跳转。
   */
  const reportWebsiteClick = useCallback((websiteId: string) => {
    recordWebsiteClick(websiteId);
  }, []);

  /**
   * 根据全局点击模式处理行点击。
   */
  const handleWebsiteClick = (item: DailyNewWebsiteItem) => {
    reportWebsiteClick(item.id);
    const detailUrl = generateWebsiteUrl(permalinkConfig, {
      id: item.id,
      slug: item.slug,
    });
    if (pageGlobal.websiteClickMode === 'direct') {
      const directUrl = appendRefParamToUrl(item.url, pageGlobal);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (pageGlobal.detailPageNewWindow) {
      window.open(detailUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(detailUrl);
    window.scrollTo(0, 0);
  };

  /**
   * 直接访问外站。
   */
  const handleDirectVisit = (item: DailyNewWebsiteItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    reportWebsiteClick(item.id);
    const target = pageGlobal.directArrowNewWindow !== false ? '_blank' : '_self';
    const directUrl = appendRefParamToUrl(item.url, pageGlobal);
    window.open(directUrl, target, 'noopener,noreferrer');
  };

  const metrics = useMemo(() => {
    const todayAdded = countTodayItems(items);
    const latestReleaseAt = items[0] ? resolveItemDate(items[0]) : null;
    return {
      total,
      todayAdded,
      latestReleaseAt: latestReleaseAt ? latestReleaseAt.toLocaleString('zh-CN') : '--',
      rangeLabel: dayOptions.find((item) => item.value === days)?.label || `近${days}天`,
    };
  }, [dayOptions, days, items, total]);

  const dayGroups = useMemo(() => buildDayGroups(items), [items]);

  /**
   * 同步默认选中的日期分组，用于左侧导航高亮。
   */
  useEffect(() => {
    if (!dayGroups.length) {
      setActiveDayGroupKey('');
      return;
    }
    setActiveDayGroupKey((prev) => {
      if (prev && dayGroups.some((group) => group.key === prev)) return prev;
      return dayGroups[0].key;
    });
  }, [dayGroups]);

  /**
   * 注册日期分组节点，供左侧快速定位滚动使用。
   * @param groupKey 分组键
   * @param node DOM 节点
   */
  const registerDayGroupNode = useCallback((groupKey: string, node: HTMLElement | null) => {
    if (!groupKey) return;
    dayGroupRefMap.current[groupKey] = node;
  }, []);

  /**
   * 从左侧导航跳转到对应日期分组。
   * @param groupKey 分组键
   */
  const handleJumpToDayGroup = useCallback((groupKey: string) => {
    if (!groupKey) return;
    setActiveDayGroupKey(groupKey);
    const targetNode = dayGroupRefMap.current[groupKey];
    if (!targetNode) return;
    targetNode.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <div className={`daily-new-page daily-new-page--layout-${detailLayoutWidthMode} ${embedded ? 'daily-new-page--embedded' : ''}`.trim()}>
      {!embedded && (
        <SEO
          title={pageTitle}
          description={pageDescription}
          keywords="每日上新,新网址,设计资源,AI工具"
        />
      )}

      <header className="daily-new-page__hero">
        <div className="daily-new-page__hero-main">
          <p className="daily-new-page__kicker">{pageKicker}</p>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
          <div className="daily-new-page__hero-actions">
            <span className="daily-new-page__hero-tip">左侧切换时间范围，右侧查看上新详情</span>
            {!embedded && (
              <Link className="daily-new-page__back-link" to="/">
                返回首页
              </Link>
            )}
          </div>
        </div>
        <div className="daily-new-page__hero-stats">
          <div className="daily-new-page__stat">
            <span className="daily-new-page__stat-label">{metrics.rangeLabel}上新</span>
            <strong>{metrics.total}</strong>
          </div>
          <div className="daily-new-page__stat">
            <span className="daily-new-page__stat-label">今日新增</span>
            <strong>{metrics.todayAdded}</strong>
          </div>
          <div className="daily-new-page__stat">
            <span className="daily-new-page__stat-label">最新上线时间</span>
            <strong>{metrics.latestReleaseAt}</strong>
          </div>
        </div>
      </header>

      {!embedded && (
        <section className="daily-new-page__channel-switch">
          <ContentHubSwitch />
        </section>
      )}

      <section className="daily-new-page__content">
        <div className="daily-new-page__workspace">
          <aside className="daily-new-page__sidebar" aria-label="每日上新筛选导航">
            <section className="daily-new-page__sidebar-section">
              <h2>时间范围</h2>
              <p>按运营节奏快速切换收录窗口。</p>
              <div className="daily-new-page__toolbar-group">
                {dayOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`daily-new-page__day-btn ${days === option.value ? 'is-active' : ''}`}
                    onClick={() => handleChangeDays(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="daily-new-page__sidebar-section">
              <h2>日期导航</h2>
              <p>点击左侧日期，右侧快速定位当天上新列表。</p>
              <div className="daily-new-page__day-nav">
                {dayGroups.map((group) => (
                  <button
                    key={`nav-${group.key}`}
                    type="button"
                    className={`daily-new-page__day-nav-btn ${activeDayGroupKey === group.key ? 'is-active' : ''}`}
                    onClick={() => handleJumpToDayGroup(group.key)}
                  >
                    <span>{group.label}</span>
                    <strong>{group.items.length}</strong>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="daily-new-page__main" aria-label="每日上新内容区">
            <div className="daily-new-page__meta">
              <span>共 {total} 个新网址</span>
              <span>·</span>
              <span>{dayOptions.find((item) => item.value === days)?.label || `近${days}天`}</span>
              <span>·</span>
              <span>数据源：网址管理最新发布时间</span>
              <span>·</span>
              <span>统计起点 {since ? since.slice(0, 10) : '--'}</span>
            </div>

            {error && <div className="daily-new-page__error">{error}</div>}

            {!loading && items.length === 0 && !error && (
              <div className="daily-new-page__empty">
                <h3>暂无上新内容</h3>
                <p>当前时间范围内暂未收录新网址，可切换到近 7 天再试。</p>
              </div>
            )}

            <div className="daily-new-page__timeline">
              {dayGroups.map((group) => (
                <section
                  key={group.key}
                  className="daily-new-page__day-group"
                  ref={(node) => registerDayGroupNode(group.key, node)}
                >
                  <header className="daily-new-page__day-header">
                    <h2>{group.label}</h2>
                    <span>{group.items.length} 个</span>
                  </header>
                  <div className="daily-new-page__entry-list">
                    {group.items.map((item) => {
                      const date = resolveItemDate(item);
                      const statusLabel = getEntryStatusLabel(item);
                      const showTags = (item.tags || []).slice(0, 2).filter(Boolean);
                      const categoryLabel = String(item.category || '').trim() || '未分类';
                      const publishText = date
                        ? date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '--';
                      return (
                        <article
                          key={`${group.key}-${item.id}-${item.latestAt || item.updatedAt || item.createdAt || ''}`}
                          className="daily-new-page__entry"
                          onClick={() => handleWebsiteClick(item)}
                        >
                          <div className="daily-new-page__entry-time">
                            <span>{formatItemTime(date)}</span>
                            <span className="daily-new-page__entry-release">新上线</span>
                          </div>
                          <div className="daily-new-page__entry-main">
                            <div className="daily-new-page__entry-title-row">
                              <WebsiteFavicon
                                iconUrl={item.iconUrl}
                                websiteUrl={item.url}
                                name={item.name}
                                size={40}
                              />
                              <h3>{item.name}</h3>
                              {statusLabel && (
                                <span className="daily-new-page__entry-status">{statusLabel}</span>
                              )}
                            </div>
                            <p>{item.description || '暂无描述'}</p>
                            <div className="daily-new-page__entry-meta">
                              <span>{categoryLabel}</span>
                              <span>更新于 {publishText}</span>
                            </div>
                            {showTags.length > 0 && (
                              <div className="daily-new-page__entry-tags">
                                {showTags.map((tag, tagIndex) => (
                                  <span
                                    key={`${item.id}-tag-${tagIndex}`}
                                    className="daily-new-page__entry-tag"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="daily-new-page__entry-actions">
                            <button
                              type="button"
                              className="daily-new-page__action-btn daily-new-page__action-btn--primary"
                              onClick={(event) => handleDirectVisit(item, event)}
                            >
                              访问原站
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {loading && (
              <div className="daily-new-page__loading">
                <span className="daily-new-page__loading-dot" />
                {items.length > 0 ? '正在加载更多上新...' : '正在同步最新上线产品...'}
              </div>
            )}

            {!loading && hasMore && (
              <div className="daily-new-page__load-more">
                <button type="button" onClick={() => fetchDailyNewList(page + 1, true)}>
                  查看更多
                </button>
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
};

export default DailyNewPage;
