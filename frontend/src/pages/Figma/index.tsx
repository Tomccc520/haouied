/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 *
 * @file pages/Figma/index.tsx
 * @description Figma 插件收录页
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import useDetailLayoutWidthMode from '../../hooks/useDetailLayoutWidthMode';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import {
  FigmaCategoryMeta,
  FigmaListItem,
  FigmaTagMeta,
  getFigmaCategories,
  getFigmaList,
  getFigmaTags,
} from '../../services/figmaService';
import { getFullImageUrl } from '../../utils/urlUtils';
import './index.css';

interface FigmaCardStatItem {
  key: 'user' | 'like' | 'view';
  title: string;
  value: string;
}

type FigmaSortBy = 'latest' | 'hot' | 'users' | 'likes';

const FIGMA_SORT_OPTIONS: Array<{ value: FigmaSortBy; label: string }> = [
  { value: 'latest', label: '最新收录' },
  { value: 'hot', label: '最热浏览' },
  { value: 'users', label: '最多使用' },
  { value: 'likes', label: '最多收藏' },
];

/**
 * 规范化排序参数，避免 URL 传入异常值导致排序失效。
 */
const normalizeFigmaSortBy = (value?: string | null): FigmaSortBy => {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'hot') return 'hot';
  if (text === 'users') return 'users';
  if (text === 'likes') return 'likes';
  return 'latest';
};

/**
 * 获取排序选项文案。
 */
const getSortLabel = (value: FigmaSortBy): string => {
  const matched = FIGMA_SORT_OPTIONS.find((item) => item.value === value);
  return matched?.label || '最新收录';
};

/**
 * 格式化发布时间。
 */
const formatPublishDate = (timestamp?: number): string => {
  const value = Number(timestamp || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * 格式化统计数字，统一显示为千分位。
 */
const formatCountLabel = (value?: number): string => {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '0';
  return count.toLocaleString('zh-CN');
};

/**
 * 获取插件卡片可跳转的外链地址。
 */
const resolvePluginExternalUrl = (item: FigmaListItem): string => {
  const candidates = [
    String(item.officialUrl || '').trim(),
    String(item.docsUrl || '').trim(),
    String(item.githubUrl || '').trim(),
  ];
  return candidates.find((url) => /^https?:\/\//i.test(url)) || '';
};

/**
 * 判断是否可直接跳转外部链接。
 * - 批量扩展数据（manual_expand_*）统一走站内详情，避免外链404体验；
 * - fallback 池与可疑 ID 前缀优先走站内详情，降低“跳转即 404”的风险；
 * - 排除 icon 资源链接；
 * - 优先允许 Figma 社区 plugin 详情页直链。
 */
const isHighRiskOfficialJumpItem = (item: FigmaListItem): boolean => {
  const sourceType = String(item.sourceType || '').trim().toLowerCase();
  const pluginId = String(item.figmaPluginId || '').trim();
  /**
   * 说明：
   * - figma_fallback_pool 中存在大量批量映射条目，官方页稳定性不一致；
   * - 1140011001* 为当前数据审计识别出的高重复风险前缀，优先走站内详情承接。
   */
  if (sourceType === 'figma_fallback_pool') return true;
  if (pluginId.startsWith('1140011001')) return true;
  return false;
};

const shouldOpenOfficialUrl = (item: FigmaListItem, targetUrl: string): boolean => {
  const sourceType = String(item.sourceType || '').trim().toLowerCase();
  if (sourceType.startsWith('manual_expand_')) return false;
  if (isHighRiskOfficialJumpItem(item)) return false;
  if (!/^https?:\/\//i.test(targetUrl)) return false;
  if (/\/community\/icon\?/i.test(targetUrl)) return false;
  if (/^https?:\/\/www\.figma\.com\/community\/plugin\/\d+/i.test(targetUrl)) return true;
  return /^https?:\/\/www\.figma\.com\/community\/plugins/i.test(targetUrl);
};

/**
 * 解析插件图标地址（仅使用采集内容）。
 */
const resolvePluginIconUrl = (item: FigmaListItem): string => {
  const iconUrl = String(item.iconUrl || '').trim();
  if (iconUrl) return getFullImageUrl(iconUrl);
  const coverUrl = String(item.coverUrl || '').trim();
  if (coverUrl) return getFullImageUrl(coverUrl);
  return '';
};

/**
 * 构建插件卡片统计数据（用户量/关注量/浏览量）。
 */
const buildCardStats = (item: FigmaListItem): FigmaCardStatItem[] => {
  const rows: FigmaCardStatItem[] = [];
  const userCount = Number(item.userCount || 0);
  const likeCount = Number(item.likeCount || 0);
  const viewCount = Number(item.viewCount || 0);
  if (userCount > 0) {
    rows.push({ key: 'user', title: '用户数', value: formatCountLabel(userCount) });
  }
  if (likeCount > 0) {
    rows.push({ key: 'like', title: '关注数', value: formatCountLabel(likeCount) });
  }
  if (rows.length === 0 && viewCount > 0) {
    rows.push({ key: 'view', title: '浏览量', value: formatCountLabel(viewCount) });
  }
  return rows;
};

/**
 * 渲染卡片统计图标（纯图标 + 数值）。
 */
const renderCardStatIcon = (key: FigmaCardStatItem['key']): React.ReactElement => {
  if (key === 'user') {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="8.3" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.8 18.3c0-2.8 2.76-4.8 6.2-4.8s6.2 2 6.2 4.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }
  if (key === 'like') {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 20.1s-6.8-4.4-8.2-8a4.28 4.28 0 0 1 7.35-4.14L12 8.7l.85-.75a4.28 4.28 0 0 1 7.35 4.14c-1.4 3.6-8.2 8-8.2 8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M2.8 12c1.9-3.7 5.4-6 9.2-6s7.3 2.3 9.2 6c-1.9 3.7-5.4 6-9.2 6s-7.3-2.3-9.2-6Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};

/**
 * 渲染插件图标兜底（Figma 风格标识），用于图片缺失或加载失败场景。
 */
const renderFigmaFallbackIcon = (): React.ReactElement => {
  return (
    <span className="figma-card__fallback-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <rect x="11" y="6" width="20" height="20" rx="10" fill="#f24e1e" />
        <rect x="11" y="24" width="20" height="20" rx="10" fill="#a259ff" />
        <rect x="11" y="42" width="20" height="20" rx="10" fill="#0acf83" />
        <rect x="31" y="24" width="20" height="20" rx="10" fill="#1abcfe" />
        <rect x="31" y="6" width="20" height="20" rx="10" fill="#ff7262" />
      </svg>
    </span>
  );
};

/**
 * 解析 Figma 详情页路由路径。
 */
const resolvePluginDetailPath = (item: FigmaListItem): string => {
  const slug = String(item.slug || '').trim();
  if (slug) return `/figma/${slug}`;
  return `/figma/${item.id}`;
};

const FigmaPage: React.FC = () => {
  const navigate = useNavigate();
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const { data: publicSettings } = usePublicSettings();
  const siteInfo = publicSettings?.siteInfo;
  const figmaPageConfig = publicSettings?.figmaPage;
  const listPageSize = Math.max(6, Math.min(72, Number(figmaPageConfig?.listPageSize || 24)));
  const cardClickAction = String(figmaPageConfig?.cardClickAction || 'official_first').trim().toLowerCase() === 'detail'
    ? 'detail'
    : 'official_first';
  const cardClickNewWindow = figmaPageConfig?.cardClickNewWindow !== false;
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<FigmaListItem[]>([]);
  const [categories, setCategories] = useState<FigmaCategoryMeta[]>([]);
  const [tags, setTags] = useState<FigmaTagMeta[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: listPageSize,
    total: 0,
    totalPages: 0,
  });

  const keyword = String(searchParams.get('q') || '').trim();
  const category = String(searchParams.get('category') || '').trim();
  const tag = String(searchParams.get('tag') || '').trim();
  const sortBy = normalizeFigmaSortBy(searchParams.get('sort'));
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [isKeywordComposing, setIsKeywordComposing] = useState(false);
  const [iconErrorMap, setIconErrorMap] = useState<Record<number, boolean>>({});

  /**
   * 更新 URL 筛选参数。
   */
  const updateParams = useCallback((patch: Record<string, string | number | null | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 0) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    if (!('page' in patch)) {
      next.set('page', '1');
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  /**
   * 加载分类与标签元数据。
   */
  const loadMeta = useCallback(async () => {
    const [categoryRows, tagRows] = await Promise.all([
      getFigmaCategories(),
      getFigmaTags(),
    ]);
    setCategories(Array.isArray(categoryRows) ? categoryRows : []);
    setTags(Array.isArray(tagRows) ? tagRows : []);
  }, []);

  /**
   * 加载插件列表。
   */
  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFigmaList({
        page,
        pageSize: listPageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        tag: tag || undefined,
        sort: sortBy,
      });
      setList(Array.isArray(response.lists) ? response.lists : []);
      setIconErrorMap({});
      setPagination({
        page: Number(response.page || page),
        pageSize: Number(response.pageSize || listPageSize),
        total: Number(response.total || 0),
        totalPages: Number(response.totalPages || 0),
      });
    } catch (loadError) {
      setList([]);
      setPagination({
        page,
        pageSize: listPageSize,
        total: 0,
        totalPages: 0,
      });
      setError('Figma 插件列表加载失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category, tag, listPageSize, sortBy]);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  /**
   * 关键词输入防抖：减少频繁请求，并保持 URL 可分享。
   */
  useEffect(() => {
    if (isKeywordComposing) return undefined;
    const inputKeyword = String(keywordInput || '').trim();
    const activeKeyword = String(keyword || '').trim();
    if (inputKeyword === activeKeyword) return undefined;
    const timer = window.setTimeout(() => {
      updateParams({ q: inputKeyword || null, page: 1 });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isKeywordComposing, keyword, keywordInput, updateParams]);

  useEffect(() => {
    loadMeta().catch(() => {
      setCategories([]);
      setTags([]);
    });
  }, [loadMeta]);

  useEffect(() => {
    loadList().catch(() => {
      setError('Figma 插件列表加载失败，请稍后重试。');
      setLoading(false);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadList]);

  const activeFilterSummary = useMemo(() => {
    const chunks: string[] = [];
    if (sortBy !== 'latest') chunks.push(`排序：${getSortLabel(sortBy)}`);
    if (keyword) chunks.push(`关键词：${keyword}`);
    if (category) chunks.push(`分类：${category}`);
    if (tag) chunks.push(`标签：${tag}`);
    return chunks.join(' · ');
  }, [sortBy, keyword, category, tag]);
  const hasFilterApplied = Boolean(keyword || category || tag || sortBy !== 'latest');

  const pagerItems = useMemo(() => {
    const totalPages = Number(pagination.totalPages || 0);
    const current = Number(pagination.page || 1);
    if (totalPages <= 1) return [1];
    const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
    return Array.from(pages).filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  }, [pagination.page, pagination.totalPages]);

  const pageClassName = useMemo(() => {
    return [
      'figma-list-page',
      `figma-list-page--layout-${detailLayoutWidthMode}`,
    ].join(' ');
  }, [detailLayoutWidthMode]);

  const pageTitle = 'Figma 插件中心';
  const pageDescription = '收录常用 Figma 插件，支持按分类与标签快速筛选。';
  const visibleCategories = useMemo(() => {
    return categories.filter((item) => Number(item.itemCount || 0) > 0);
  }, [categories]);
  const heroCategoryTips = useMemo(() => visibleCategories.slice(0, 6), [visibleCategories]);
  const skeletonIndexes = useMemo(() => {
    return Array.from({ length: Math.max(8, Math.min(12, listPageSize)) }, (_, index) => index);
  }, [listPageSize]);

  /**
   * 提交关键词搜索。
   */
  const handleKeywordSearchSubmit = useCallback((event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    updateParams({ q: String(keywordInput || '').trim(), page: 1 });
  }, [keywordInput, updateParams]);

  /**
   * 清空关键词并恢复默认列表。
   */
  const handleClearKeyword = useCallback(() => {
    setKeywordInput('');
    updateParams({ q: null, page: 1 });
  }, [updateParams]);

  /**
   * 清空全部筛选项。
   */
  const handleResetFilters = useCallback(() => {
    setKeywordInput('');
    updateParams({ q: null, category: null, tag: null, sort: null, page: 1 });
  }, [updateParams]);

  /**
   * 跳转到 Figma 插件详情页。
   */
  const openPluginDetail = useCallback((item: FigmaListItem) => {
    const detailPath = resolvePluginDetailPath(item);
    const targetUrl = resolvePluginExternalUrl(item);
    if (cardClickAction === 'official_first' && shouldOpenOfficialUrl(item, targetUrl)) {
      if (cardClickNewWindow) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = targetUrl;
      }
      return;
    }
    navigate(detailPath);
  }, [cardClickAction, cardClickNewWindow, navigate]);

  /**
   * 卡片键盘无障碍：回车和空格触发打开。
   */
  const handleCardKeyOpen = useCallback((event: React.KeyboardEvent<HTMLElement>, item: FigmaListItem) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPluginDetail(item);
  }, [openPluginDetail]);

  /**
   * 仅跳转详情页（忽略卡片主点击配置），用于卡片右上角详情按钮。
   */
  const openPluginDetailOnly = useCallback((event: React.MouseEvent<HTMLElement>, item: FigmaListItem) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(resolvePluginDetailPath(item));
  }, [navigate]);

  /**
   * 切换排序方式。
   */
  const handleSortChange = useCallback((value: FigmaSortBy) => {
    updateParams({
      sort: value === 'latest' ? null : value,
      page: 1,
    });
  }, [updateParams]);

  /**
   * 记录图片加载失败，触发卡片首字母兜底。
   */
  const handleCardIconError = useCallback((itemId: number) => {
    setIconErrorMap((prev) => (prev[itemId] ? prev : { ...prev, [itemId]: true }));
  }, []);

  return (
    <div className={pageClassName}>
      <SEO
        title={`${pageTitle}${siteInfo?.siteName ? ` - ${siteInfo.siteName}` : ''}`}
        description={pageDescription}
        keywords="Figma插件,Figma社区,Figma组件,设计效率工具,插件收录,UI设计"
        url={`${window.location.origin}/figma${window.location.search || ''}`}
      />

      <div className="figma-list-page__container">
        <header className="figma-list-page__hero">
          <div className="figma-list-page__hero-ornaments" aria-hidden="true">
            <span className="figma-list-page__hero-dot figma-list-page__hero-dot--red" />
            <span className="figma-list-page__hero-dot figma-list-page__hero-dot--purple" />
            <span className="figma-list-page__hero-dot figma-list-page__hero-dot--blue" />
            <span className="figma-list-page__hero-dot figma-list-page__hero-dot--green" />
          </div>
          <div className="figma-list-page__hero-main">
            <div className="figma-list-page__hero-kicker-row">
              <div className="figma-list-page__kicker">FIGMA COMMUNITY</div>
              <div className="figma-list-page__hero-mini-tags">
                <span>Plugins</span>
                <span>Design Workflow</span>
                <span>Team Efficiency</span>
              </div>
            </div>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
            <form className="figma-list-page__hero-search" onSubmit={handleKeywordSearchSubmit}>
              <input
                type="text"
                value={keywordInput}
                placeholder="搜索插件名称、功能、关键词"
                onChange={(event) => setKeywordInput(event.target.value)}
                onCompositionStart={() => setIsKeywordComposing(true)}
                onCompositionEnd={(event) => {
                  setIsKeywordComposing(false);
                  setKeywordInput(event.currentTarget.value);
                }}
              />
              {keywordInput ? (
                <button
                  type="button"
                  className="figma-list-page__hero-search-clear"
                  onClick={handleClearKeyword}
                  aria-label="清空关键词"
                >
                  清空
                </button>
              ) : null}
              <button type="submit" className="figma-list-page__hero-search-submit">搜索</button>
            </form>
            <div className="figma-list-page__hero-hint">
              {activeFilterSummary ? `当前筛选：${activeFilterSummary}` : '当前展示全部 Figma 插件'}
            </div>
            {heroCategoryTips.length > 0 ? (
              <div className="figma-list-page__hero-category-chips">
                {heroCategoryTips.map((item) => (
                  <button
                    type="button"
                    key={`hero-category-chip-${item.id}`}
                    onClick={() => updateParams({ category: item.slug, page: 1 })}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="figma-list-page__hero-stats">
            <article>
              <strong>{formatCountLabel(pagination.total)}</strong>
              <span>插件总数</span>
            </article>
            <article>
              <strong>{formatCountLabel(visibleCategories.length)}</strong>
              <span>分类数量</span>
            </article>
            <article>
              <strong>{formatCountLabel(tags.length)}</strong>
              <span>标签数量</span>
            </article>
          </div>
        </header>

        <div className="figma-list-page__content-layout">
          <aside className="figma-list-page__filters" aria-label="Figma 插件筛选">
            <div className="figma-list-page__filters-tip">可按分类和标签组合筛选</div>
            <div className="figma-list-page__filters-head">
              <div className="figma-list-page__filters-summary">
                {activeFilterSummary ? activeFilterSummary : '当前显示全部结果'}
              </div>
              <button
                type="button"
                className="figma-list-page__clear-btn"
                onClick={handleResetFilters}
                disabled={!hasFilterApplied}
              >
                清空筛选
              </button>
            </div>

            <div className="figma-list-page__chip-group">
              <div className="figma-list-page__chip-title">分类</div>
              <div className="figma-list-page__chips">
                <button
                  type="button"
                  className={category ? '' : 'is-active'}
                  onClick={() => updateParams({ category: null })}
                >
                  全部
                </button>
                {visibleCategories.map((item) => (
                  <button
                    key={`figma-category-${item.id}`}
                    type="button"
                    className={category === item.slug ? 'is-active' : ''}
                    onClick={() => updateParams({ category: item.slug })}
                  >
                    {item.name}
                    {Number(item.itemCount || 0) > 0 ? ` (${item.itemCount})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="figma-list-page__chip-group">
              <div className="figma-list-page__chip-title">标签</div>
              <div className="figma-list-page__chips">
                <button
                  type="button"
                  className={tag ? '' : 'is-active'}
                  onClick={() => updateParams({ tag: null })}
                >
                  全部
                </button>
                {tags.slice(0, 24).map((item) => (
                  <button
                    key={`figma-tag-${item.id}`}
                    type="button"
                    className={tag === item.slug ? 'is-active' : ''}
                    onClick={() => updateParams({ tag: item.slug })}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="figma-list-page__results" aria-live="polite">
            <header className="figma-list-page__results-head">
              <div className="figma-list-page__results-meta">
                <div className="figma-list-page__results-title">Figma 插件列表</div>
                <div className="figma-list-page__results-subtitle">
                  共 {formatCountLabel(pagination.total)} 个插件
                  {activeFilterSummary ? ` · ${activeFilterSummary}` : ''}
                </div>
              </div>
              <label className="figma-list-page__sort-box">
                <span>排序</span>
                <select
                  value={sortBy}
                  onChange={(event) => handleSortChange(normalizeFigmaSortBy(event.target.value))}
                >
                  {FIGMA_SORT_OPTIONS.map((item) => (
                    <option key={`figma-sort-${item.value}`} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            </header>

            {error ? <div className="figma-list-page__state">{error}</div> : null}

            {!error && loading && list.length === 0 ? (
              <section className="figma-list-page__grid figma-list-page__grid--skeleton" aria-hidden="true">
                {skeletonIndexes.map((index) => (
                  <article key={`figma-skeleton-${index + 1}`} className="figma-card figma-card--skeleton">
                    <div className="figma-card__header">
                      <div className="figma-card__icon-wrap figma-skeleton-block" />
                      <div className="figma-card__title-wrap">
                        <div className="figma-skeleton-line figma-skeleton-line--title" />
                        <div className="figma-skeleton-line figma-skeleton-line--meta" />
                      </div>
                      <div className="figma-skeleton-dot" />
                    </div>
                    <div className="figma-skeleton-line figma-skeleton-line--summary" />
                    <div className="figma-skeleton-line figma-skeleton-line--summary-short" />
                    <div className="figma-card__stats">
                      <div className="figma-skeleton-line figma-skeleton-line--stat" />
                      <div className="figma-skeleton-line figma-skeleton-line--stat" />
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

            {!error && !loading && list.length === 0 ? (
              <div className="figma-list-page__state">当前筛选条件下暂无插件，换个关键词试试。</div>
            ) : null}

            {!error && list.length > 0 ? (
              <section className="figma-list-page__grid">
                {list.map((item) => {
                  const iconUrl = resolvePluginIconUrl(item);
                  const publishDate = formatPublishDate(item.publishTime);
                  const displayTags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
                  const cardStats = buildCardStats(item);
                  return (
                    <article
                      key={`figma-item-${item.id}`}
                      className="figma-card is-clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openPluginDetail(item)}
                      onKeyDown={(event) => handleCardKeyOpen(event, item)}
                      aria-label={`打开 Figma 插件卡片：${item.name}`}
                    >
                      <div className="figma-card__header">
                        <div className="figma-card__icon-wrap">
                          {iconUrl && !iconErrorMap[item.id] ? (
                            <img
                              src={iconUrl}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              onError={() => handleCardIconError(item.id)}
                            />
                          ) : renderFigmaFallbackIcon()}
                        </div>
                        <div className="figma-card__title-wrap">
                          <h3>{item.name}</h3>
                          <div className="figma-card__meta-line">
                            {item.categoryName ? <span>{item.categoryName}</span> : null}
                            {publishDate ? <span>{publishDate}</span> : null}
                            {Number(item.isRecommended || 0) === 1 ? <span className="figma-card__badge">推荐</span> : null}
                          </div>
                        </div>
                      </div>

                      <p className="figma-card__summary">{item.summary || '暂无简介'}</p>

                      <div className={`figma-card__tags${displayTags.length === 0 ? ' is-empty' : ''}`}>
                        {displayTags.map((tagName) => (
                          <span key={`${item.id}-${tagName}`}>{tagName}</span>
                        ))}
                      </div>

                      <div className="figma-card__footer">
                        <div className={`figma-card__stats${cardStats.length === 0 ? ' is-empty' : ''}`}>
                          {cardStats.map((stat) => (
                            <div
                              key={`${item.id}-${stat.key}`}
                              className="figma-card__stat-item"
                              title={`${stat.title}：${stat.value}`}
                              aria-label={`${stat.title}：${stat.value}`}
                            >
                              <span className={`figma-card__stat-icon figma-card__stat-icon--${stat.key}`} aria-hidden="true">
                                {renderCardStatIcon(stat.key)}
                              </span>
                              <strong className="figma-card__stat-value">{stat.value}</strong>
                              {stat.key !== 'view' ? <span className="figma-card__stat-arrow" aria-hidden="true">›</span> : null}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="figma-card__detail-btn figma-card__detail-btn--footer"
                          onClick={(event) => openPluginDetailOnly(event, item)}
                          aria-label={`查看 ${item.name} 详情`}
                          title="查看详情"
                        >
                          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <path d="M9 6h9v9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            <path d="M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : null}

            {!error && pagination.totalPages > 1 ? (
              <nav className="figma-list-page__pager" aria-label="分页导航">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: Math.max(1, pagination.page - 1) })}
                >
                  上一页
                </button>
                {pagerItems.map((item) => (
                  <button
                    type="button"
                    key={`figma-pager-${item}`}
                    className={item === pagination.page ? 'is-active' : ''}
                    onClick={() => updateParams({ page: item })}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: Math.min(pagination.totalPages, pagination.page + 1) })}
                >
                  下一页
                </button>
              </nav>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default FigmaPage;
