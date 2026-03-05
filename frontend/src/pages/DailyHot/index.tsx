/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-04
 */
/**
 * @file DailyHot/index.tsx
 * @description 每日热榜页面（卡片式）
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SEO from '../../components/SEO';
import ContentHubSwitch from '../../components/ContentHubSwitch';
import { useDetailLayoutWidthMode } from '../../hooks/useDetailLayoutWidthMode';
import {
  getDailyHot,
  getDailyHotDisplayConfig,
  getDailyHotPlatforms,
} from '../../services/dailyHotService';
import type {
  DailyHotDisplayConfig,
  DailyHotItem,
  DailyHotPlatform,
} from '../../types/dailyHot';
import './index.css';

interface DailyHotSection {
  platform: DailyHotPlatform;
  items: DailyHotItem[];
}

interface DailyHotPageProps {
  embedded?: boolean;
}

/**
 * 读取平台对应的热榜列表（兼容 platformTitle / displayName 两种键名）
 * @param hotMap 平台热榜字典
 * @param platform 平台信息
 * @returns 热榜列表
 */
function getPlatformItems(
  hotMap: Record<string, DailyHotItem[]>,
  platform: DailyHotPlatform
): DailyHotItem[] {
  const byTitle = hotMap[platform.platformTitle];
  if (Array.isArray(byTitle)) return byTitle;
  const displayName = String(platform.displayName || '').trim();
  const byDisplayName = displayName ? hotMap[displayName] : undefined;
  if (Array.isArray(byDisplayName)) return byDisplayName;
  return [];
}

/**
 * 基于后台“默认平台（每行一个）”配置确定页面展示平台顺序
 * @param platformList 平台列表
 * @param displayConfig 展示配置
 * @returns 有序平台列表
 */
function resolvePagePlatforms(
  platformList: DailyHotPlatform[],
  displayConfig: DailyHotDisplayConfig | null
): DailyHotPlatform[] {
  const enabledPlatforms = platformList
    .filter((item) => item.isEnabled !== false)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  if (enabledPlatforms.length === 0) {
    return [];
  }

  const configuredTitles = Array.isArray(displayConfig?.defaultPlatforms)
    ? (displayConfig?.defaultPlatforms || []).map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  if (configuredTitles.length === 0) {
    return enabledPlatforms;
  }

  const platformMap = new Map(enabledPlatforms.map((item) => [item.platformTitle, item]));
  const displayNameMap = new Map(enabledPlatforms.map((item) => [String(item.displayName || '').trim(), item]));
  const ordered: DailyHotPlatform[] = [];

  configuredTitles.forEach((title) => {
    const matched = platformMap.get(title) || displayNameMap.get(title);
    if (!matched) return;
    if (ordered.some((item) => item.platformTitle === matched.platformTitle)) return;
    ordered.push(matched);
  });

  enabledPlatforms.forEach((item) => {
    if (ordered.some((row) => row.platformTitle === item.platformTitle)) return;
    ordered.push(item);
  });

  return ordered;
}

/**
 * 按指定大小切分数组（用于分批请求聚合接口，避免 URL 过长）
 * @param list 原数组
 * @param size 分块大小
 * @returns 分块结果
 */
function chunkArray<T>(list: T[], size: number): T[][] {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 10;
  const chunks: T[][] = [];
  for (let index = 0; index < list.length; index += safeSize) {
    chunks.push(list.slice(index, index + safeSize));
  }
  return chunks;
}

/**
 * 当平台配置接口不可用时，基于后台默认平台配置构造最小可展示平台列表
 * @param displayConfig 展示配置
 * @returns 回退平台列表
 */
function buildFallbackPlatformsFromConfig(
  displayConfig: DailyHotDisplayConfig | null
): DailyHotPlatform[] {
  const titles = Array.isArray(displayConfig?.defaultPlatforms)
    ? (displayConfig?.defaultPlatforms || []).map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const source = titles.length > 0 ? titles : ['哔哩哔哩', '知乎', '微博'];
  return source.map((title, index) => ({
    platformTitle: title,
    displayName: title,
    isEnabled: true,
    sort: (index + 1) * 10,
  }));
}

/**
 * 生成平台简称（用于图标缺省占位）
 * @param platform 平台
 * @returns 平台简称
 */
function getPlatformInitial(platform: DailyHotPlatform): string {
  return String(platform.displayName || platform.platformTitle || '?').slice(0, 1);
}

/**
 * 每日热榜页面组件（卡片式）
 */
const DailyHotPage: React.FC<DailyHotPageProps> = ({ embedded = false }) => {
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const [displayConfig, setDisplayConfig] = useState<DailyHotDisplayConfig | null>(null);
  const [platforms, setPlatforms] = useState<DailyHotPlatform[]>([]);
  const [sections, setSections] = useState<DailyHotSection[]>([]);
  const [activePlatformTab, setActivePlatformTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const pageTitle = useMemo(() => {
    const label = String(displayConfig?.displayLabel || '').trim();
    return label || '每日热榜';
  }, [displayConfig?.displayLabel]);

  const openInNewTab = displayConfig?.displayOpenInNewTab === true;
  const linkTarget = openInNewTab ? '_blank' : undefined;
  const linkRel = openInNewTab ? 'noopener noreferrer' : undefined;
  const isPageDisabled = displayConfig?.enabled === false;

  const sectionPlatforms = useMemo(
    () => resolvePagePlatforms(platforms, displayConfig),
    [platforms, displayConfig]
  );

  const defaultPlatformTitleSet = useMemo(() => {
    const titles = Array.isArray(displayConfig?.defaultPlatforms)
      ? (displayConfig?.defaultPlatforms || []).map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    return new Set(titles);
  }, [displayConfig]);

  /**
   * 判断平台是否属于后台默认展示平台
   * @param platform 平台
   * @returns 是否默认平台
   */
  const isDefaultPlatform = useCallback((platform: DailyHotPlatform) => {
    const displayName = String(platform.displayName || '').trim();
    return (
      defaultPlatformTitleSet.has(platform.platformTitle)
      || (displayName ? defaultPlatformTitleSet.has(displayName) : false)
    );
  }, [defaultPlatformTitleSet]);

  const visibleSections = useMemo(() => {
    if (activePlatformTab === 'all') return sections;
    return sections.filter((section) => section.platform.platformTitle === activePlatformTab);
  }, [sections, activePlatformTab]);

  const totalVisibleItems = useMemo(
    () => visibleSections.reduce((sum, section) => sum + section.items.length, 0),
    [visibleSections]
  );

  /**
   * 拉取每日热榜页面数据（配置 + 平台 + 聚合内容）
   * @param forceRefresh 是否强制刷新
   */
  const fetchPageData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const config = await getDailyHotDisplayConfig(forceRefresh);
      setDisplayConfig(config);
      if (config?.enabled === false) {
        setPlatforms([]);
        setSections([]);
        setLastUpdated('');
        setError('热榜页当前已在后台关闭展示，可在“网站详情页配置”里重新开启。');
        return;
      }

      let platformRows: DailyHotPlatform[] = [];
      try {
        platformRows = await getDailyHotPlatforms(forceRefresh);
      } catch (platformError) {
        console.warn('获取热榜平台配置失败，回退默认平台列表:', platformError);
      }

      const nextPlatforms = (platformRows.length > 0
        ? platformRows
        : buildFallbackPlatformsFromConfig(config))
        .filter((item) => item.isEnabled !== false)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      setPlatforms(nextPlatforms);

      const targetPlatforms = resolvePagePlatforms(nextPlatforms, config);
      if (targetPlatforms.length === 0) {
        setSections([]);
        setError('暂无可展示的平台，请在后台启用平台并配置默认平台列表。');
        return;
      }

      const defaultLimit = Number(config?.defaultLimit || 10);
      const limit = Number.isFinite(defaultLimit) && defaultLimit > 0
        ? Math.min(defaultLimit, 30)
        : 10;

      const configuredMaxPlatforms = Number(config?.maxPlatforms || 12);
      const requestBatchSize = Number.isFinite(configuredMaxPlatforms) && configuredMaxPlatforms > 0
        ? Math.min(Math.max(configuredMaxPlatforms, 1), 20)
        : 12;
      const requestChunks = chunkArray(targetPlatforms, requestBatchSize);
      const hotMap: Record<string, DailyHotItem[]> = {};

      const chunkResults = await Promise.allSettled(
        requestChunks.map((chunkPlatforms) => getDailyHot({
          titles: chunkPlatforms.map((item) => item.platformTitle).join(','),
          platformLimit: chunkPlatforms.length,
          limit,
          refresh: forceRefresh ? 1 : undefined,
        }))
      );
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          Object.assign(hotMap, result.value);
          return;
        }
        console.warn('批量聚合热榜分片失败，稍后将尝试平台级回退请求:', result.reason);
      });

      let nextSections = targetPlatforms.map((platform) => ({
        platform,
        items: getPlatformItems(hotMap, platform),
      }));

      /**
       * 聚合接口偶发返回全空时，降级按平台逐个请求，避免页面“全空”
       */
      const totalItemCount = nextSections.reduce((sum, section) => sum + section.items.length, 0);
      if (totalItemCount === 0 && targetPlatforms.length > 0) {
        const fallbackRows = await Promise.all(targetPlatforms.map(async (platform) => {
          try {
            const singleMap = await getDailyHot({
              title: platform.platformTitle,
              limit,
              refresh: forceRefresh ? 1 : undefined,
            });
            return {
              platform,
              items: getPlatformItems(singleMap, platform),
            };
          } catch (fallbackError) {
            console.warn(`平台热榜回退请求失败: ${platform.platformTitle}`, fallbackError);
            return {
              platform,
              items: [],
            };
          }
        }));
        nextSections = fallbackRows;
      }

      setSections(nextSections);
      if (nextSections.every((section) => section.items.length === 0)) {
        setError('热榜源暂时无数据（或接口限流），可稍后刷新重试。');
      }

      setLastUpdated(
        new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (fetchError) {
      console.error('加载每日热榜页面失败:', fetchError);
      setError('热榜数据加载失败，请稍后重试');
      setSections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * 初始化加载每日热榜页面
   */
  useEffect(() => {
    fetchPageData(false);
  }, [fetchPageData]);

  /**
   * 平台标签切换（支持“全部”与单平台）
   * @param platformTitle 平台标题
   */
  const handlePlatformTabChange = useCallback((platformTitle: string) => {
    setActivePlatformTab(platformTitle);
  }, []);

  /**
   * 当平台列表更新时，保持当前激活标签有效
   */
  useEffect(() => {
    if (!sections.length) {
      setActivePlatformTab('all');
      return;
    }
    setActivePlatformTab((prev) => {
      if (prev === 'all') return 'all';
      return sections.some((section) => section.platform.platformTitle === prev) ? prev : 'all';
    });
  }, [sections]);

  /**
   * 获取平台卡片更新时间文案（优先使用源数据时间字段）
   * @param section 平台区块
   * @returns 时间文案
   */
  const getSectionUpdatedLabel = useCallback((section: DailyHotSection): string => {
    const sourceTime = section.items.find((item) => String(item.timestamp || '').trim())?.timestamp;
    if (sourceTime) return String(sourceTime);
    return lastUpdated ? `页面刷新于 ${lastUpdated}` : '';
  }, [lastUpdated]);

  return (
    <div className={`daily-hot-page daily-hot-page--layout-${detailLayoutWidthMode} ${embedded ? 'daily-hot-page--embedded' : ''}`.trim()}>
      {!embedded && (
        <SEO
          title={pageTitle}
          description="聚合多平台今日热榜内容，支持后台配置默认平台、排序与展示策略。"
          keywords="每日热榜,今日热榜,全网热榜,热点聚合,UIED设计导航"
          url="https://hao.uied.cn/p/hot?tab=daily-hot"
          type="website"
        />
      )}

      <div className="daily-hot-page__container">
        <header className="daily-hot-page__hero">
          <div className="daily-hot-page__hero-content">
            <div className="daily-hot-page__eyebrow">全网热点速览</div>
            <h1 className="daily-hot-page__title">{pageTitle}</h1>
            <p className="daily-hot-page__desc">
              保持卡片式阅读体验，按平台快速切换热点内容；支持后台配置默认平台与排序，适配运营入口分发。
            </p>
            <div className="daily-hot-page__meta">
              <span className="daily-hot-page__meta-chip">平台数 {sectionPlatforms.length}</span>
              <span className="daily-hot-page__meta-chip">当前展示 {visibleSections.length} 个平台</span>
              <span className="daily-hot-page__meta-chip">热点条目 {totalVisibleItems} 条</span>
              {lastUpdated && <span className="daily-hot-page__meta-chip">更新于 {lastUpdated}</span>}
            </div>
          </div>
          <button
            type="button"
            className={`daily-hot-page__refresh ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => fetchPageData(true)}
            disabled={refreshing}
          >
            {refreshing ? '刷新中...' : '刷新热榜'}
          </button>
        </header>

        {!embedded && (
          <section className="daily-hot-page__channel-switch">
            <ContentHubSwitch />
          </section>
        )}

        <section className="daily-hot-page__platform-filter" aria-label="平台筛选">
          <div className="daily-hot-page__platform-filter-head">
            <h2>平台筛选</h2>
            <p>点击平台标签切换内容；默认平台优先展示。</p>
          </div>
          <div className="daily-hot-page__platform-chip-list">
            <button
              type="button"
              className={`daily-hot-page__platform-chip daily-hot-page__platform-chip--all ${activePlatformTab === 'all' ? 'is-active' : ''}`}
              onClick={() => handlePlatformTabChange('all')}
            >
              <span className="daily-hot-page__platform-chip-fallback">全</span>
              <span className="daily-hot-page__platform-chip-text">全部平台</span>
            </button>
            {sectionPlatforms.map((platform) => (
              <button
                key={platform.platformTitle}
                type="button"
                className={`daily-hot-page__platform-chip ${isDefaultPlatform(platform) ? 'is-default' : ''} ${activePlatformTab === platform.platformTitle ? 'is-active' : ''}`}
                onClick={() => handlePlatformTabChange(platform.platformTitle)}
              >
                {platform.icon ? (
                  <img
                    src={platform.icon}
                    alt={platform.displayName || platform.platformTitle}
                    loading="lazy"
                  />
                ) : (
                  <span className="daily-hot-page__platform-chip-fallback">{getPlatformInitial(platform)}</span>
                )}
                <span className="daily-hot-page__platform-chip-text">{platform.displayName || platform.platformTitle}</span>
                {isDefaultPlatform(platform) && (
                  <span className="daily-hot-page__platform-chip-badge">默认</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="daily-hot-page__state">热榜加载中...</div>
        ) : error ? (
          <div className="daily-hot-page__state daily-hot-page__state--error">
            <div className="daily-hot-page__error-title">{isPageDisabled ? '页面已关闭' : '加载失败'}</div>
            <div className="daily-hot-page__error-message">{error}</div>
            {!isPageDisabled && (
              <button
                type="button"
                className="daily-hot-page__retry"
                onClick={() => fetchPageData(true)}
              >
                重新加载
              </button>
            )}
          </div>
        ) : (
          <section
            className={`daily-hot-page__cards ${activePlatformTab === 'all' ? 'daily-hot-page__cards--all' : 'daily-hot-page__cards--single'}`}
            aria-label="热榜卡片列表"
          >
            {visibleSections.map((section) => (
              <article key={section.platform.platformTitle} className="daily-hot-page__card">
                <header className="daily-hot-page__card-head">
                  <div className="daily-hot-page__card-head-main">
                    <div className="daily-hot-page__card-logo">
                      {section.platform.icon ? (
                        <img
                          src={section.platform.icon}
                          alt={section.platform.displayName || section.platform.platformTitle}
                          loading="lazy"
                        />
                      ) : (
                        <span>{getPlatformInitial(section.platform)}</span>
                      )}
                    </div>
                    <div className="daily-hot-page__card-title-wrap">
                      <h3>
                        {section.platform.displayName || section.platform.platformTitle}
                        {isDefaultPlatform(section.platform) && (
                          <span className="daily-hot-page__card-title-badge">默认平台</span>
                        )}
                      </h3>
                      <p>
                        {section.items.length > 0 ? `已聚合 ${section.items.length} 条热点` : '当前平台暂无热点数据'}
                        {getSectionUpdatedLabel(section) ? ` · ${getSectionUpdatedLabel(section)}` : ''}
                      </p>
                    </div>
                  </div>
                  {section.platform.url && (
                    <a
                      href={section.platform.url}
                      target={linkTarget}
                      rel={linkRel}
                      className="daily-hot-page__platform-source-link"
                    >
                      访问平台
                    </a>
                  )}
                </header>

                {section.items.length > 0 ? (
                  <ol className="daily-hot-page__item-list">
                    {section.items.map((item, index) => (
                      <li key={`${section.platform.platformTitle}-${item.url}-${index}`} className="daily-hot-page__item-row">
                        <a
                          href={item.url}
                          target={linkTarget}
                          rel={linkRel}
                          className={`daily-hot-page__item ${index === 0 ? 'is-featured' : ''}`}
                        >
                          <div className={`daily-hot-page__rank ${index < 3 ? `is-top-${index + 1}` : ''}`}>
                            {index + 1}
                          </div>
                          <div className="daily-hot-page__item-main">
                            <div className="daily-hot-page__item-title">{item.title}</div>
                            <div className="daily-hot-page__item-meta">
                              {item.hotValue !== undefined && item.hotValue !== null && String(item.hotValue) !== '' && (
                                <span className="daily-hot-page__item-hot">热度 {item.hotValue}</span>
                              )}
                              {item.timestamp && (
                                <span className="daily-hot-page__item-time">{item.timestamp}</span>
                              )}
                            </div>
                            {item.desc && (
                              <div className="daily-hot-page__item-desc">{item.desc}</div>
                            )}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="daily-hot-page__empty">该平台暂时没有可展示数据，稍后刷新试试。</div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default DailyHotPage;
