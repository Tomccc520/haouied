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
  FigmaRecommendPayload,
  FigmaTagMeta,
  getFigmaCategories,
  getFigmaList,
  getFigmaTags,
  submitFigmaRecommendation,
} from '../../services/figmaService';
import { getFullImageUrl } from '../../utils/urlUtils';
import './index.css';

interface FigmaCardStatItem {
  key: 'user' | 'like' | 'view';
  title: string;
  value: string;
}

interface FigmaRecommendFormState {
  pluginName: string;
  officialUrl: string;
  summary: string;
  categoryId: string;
  submitterName: string;
  submitterEmail: string;
  submitterWechat: string;
  submitNote: string;
}

interface FigmaRecommendFeedback {
  type: 'success' | 'error';
  message: string;
}

type FigmaSortBy = 'latest' | 'hot' | 'users' | 'likes';

const FIGMA_SORT_OPTIONS: Array<{ value: FigmaSortBy; label: string }> = [
  { value: 'latest', label: '最新收录' },
  { value: 'hot', label: '最热浏览' },
  { value: 'users', label: '最多使用' },
  { value: 'likes', label: '最多收藏' },
];

const DEFAULT_RECOMMEND_FORM: FigmaRecommendFormState = {
  pluginName: '',
  officialUrl: '',
  summary: '',
  categoryId: '',
  submitterName: '',
  submitterEmail: '',
  submitterWechat: '',
  submitNote: '',
};

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
 * 校验推荐链接是否为 Figma 社区插件详情地址。
 */
const isValidFigmaPluginUrl = (value: string): boolean => {
  const text = String(value || '').trim();
  if (!/^https?:\/\//i.test(text)) return false;
  return /figma\.com\/community\/plugin\/\d+/i.test(text);
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
 * 说明：仅校验链接格式，是否跳转由后台 figmaPageConfig.cardClickAction 决定。
 */
const shouldOpenOfficialUrl = (_item: FigmaListItem, targetUrl: string): boolean => {
  return /^https?:\/\//i.test(String(targetUrl || '').trim());
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
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);
  const [recommendSubmitting, setRecommendSubmitting] = useState(false);
  const [recommendFeedback, setRecommendFeedback] = useState<FigmaRecommendFeedback | null>(null);
  const [recommendForm, setRecommendForm] = useState<FigmaRecommendFormState>(DEFAULT_RECOMMEND_FORM);

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
  const recommendedCountInCurrentPage = useMemo(() => {
    return list.reduce((total, item) => {
      return total + (Number(item.isRecommended || 0) === 1 ? 1 : 0);
    }, 0);
  }, [list]);
  const heroStatItems = useMemo(() => {
    return [
      {
        key: 'total',
        label: '插件总数',
        value: formatCountLabel(pagination.total),
        desc: '累计收录',
        highlight: false,
      },
      {
        key: 'recommended',
        label: '推荐插件',
        value: formatCountLabel(recommendedCountInCurrentPage),
        desc: '当前页推荐',
        highlight: true,
      },
      {
        key: 'category',
        label: '分类数量',
        value: formatCountLabel(visibleCategories.length),
        desc: '可筛选分类',
        highlight: false,
      },
      {
        key: 'tag',
        label: '标签数量',
        value: formatCountLabel(tags.length),
        desc: '检索标签',
        highlight: false,
      },
    ];
  }, [pagination.total, recommendedCountInCurrentPage, visibleCategories.length, tags.length]);
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

  /**
   * 打开推荐插件弹窗，并清空上次反馈提示。
   */
  const handleOpenRecommendModal = useCallback(() => {
    setRecommendFeedback(null);
    setRecommendModalOpen(true);
  }, []);

  /**
   * 关闭推荐插件弹窗，保留已输入内容方便继续修改。
   */
  const handleCloseRecommendModal = useCallback(() => {
    if (recommendSubmitting) return;
    setRecommendModalOpen(false);
  }, [recommendSubmitting]);

  /**
   * 更新推荐表单字段。
   */
  const updateRecommendFormField = useCallback(
    (key: keyof FigmaRecommendFormState, value: string) => {
      setRecommendForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /**
   * 提交推荐插件到后台审核队列。
   */
  const handleSubmitRecommendation = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recommendSubmitting) return;

    const pluginName = String(recommendForm.pluginName || '').trim();
    const officialUrl = String(recommendForm.officialUrl || '').trim();
    if (!pluginName) {
      setRecommendFeedback({ type: 'error', message: '请先填写插件名称。' });
      return;
    }
    if (!isValidFigmaPluginUrl(officialUrl)) {
      setRecommendFeedback({ type: 'error', message: '请填写有效的 Figma 插件详情链接。' });
      return;
    }

    const payload: FigmaRecommendPayload = {
      pluginName,
      officialUrl,
      summary: String(recommendForm.summary || '').trim() || undefined,
      categoryId: Number(recommendForm.categoryId || 0) > 0 ? Number(recommendForm.categoryId) : undefined,
      submitterName: String(recommendForm.submitterName || '').trim() || undefined,
      submitterEmail: String(recommendForm.submitterEmail || '').trim() || undefined,
      submitterWechat: String(recommendForm.submitterWechat || '').trim() || undefined,
      submitNote: String(recommendForm.submitNote || '').trim() || undefined,
    };

    setRecommendSubmitting(true);
    setRecommendFeedback(null);
    try {
      const result = await submitFigmaRecommendation(payload);
      setRecommendFeedback({
        type: 'success',
        message: result?.message || '推荐已提交，等待后台审核。',
      });
      setRecommendForm(DEFAULT_RECOMMEND_FORM);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').trim()
        || '提交失败，请稍后重试。';
      setRecommendFeedback({ type: 'error', message });
    } finally {
      setRecommendSubmitting(false);
    }
  }, [recommendForm, recommendSubmitting]);

  return (
    <div className={pageClassName}>
      <SEO
        title={pageTitle}
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
              <div className="figma-list-page__hero-kicker-actions">
                <div className="figma-list-page__hero-mini-tags">
                  <span>Plugins</span>
                  <span>Design Workflow</span>
                  <span>Team Efficiency</span>
                </div>
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
          <div className="figma-list-page__hero-stats" aria-label="Figma 插件统计">
            <div className="figma-list-page__hero-stats-head">
              <strong>数据概览</strong>
              <span>推荐插件已强化标记</span>
            </div>
            <div className="figma-list-page__hero-stats-grid">
              {heroStatItems.map((item) => (
                <article key={`hero-stat-${item.key}`} className={item.highlight ? 'is-highlight' : ''}>
                  <span className="figma-list-page__hero-stats-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <span className="figma-list-page__hero-stats-desc">{item.desc}</span>
                </article>
              ))}
            </div>
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
              <div className="figma-list-page__results-actions">
                <button
                  type="button"
                  className="figma-list-page__recommend-entry-btn"
                  onClick={handleOpenRecommendModal}
                >
                  推荐 Figma 插件
                </button>
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
              </div>
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
                  const isRecommended = Number(item.isRecommended || 0) === 1;
                  return (
                    <article
                      key={`figma-item-${item.id}`}
                      className={`figma-card is-clickable${isRecommended ? ' is-recommended' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPluginDetail(item)}
                      onKeyDown={(event) => handleCardKeyOpen(event, item)}
                      aria-label={`打开 Figma 插件卡片：${item.name}`}
                    >
                      {isRecommended ? <span className="figma-card__recommend-ribbon">推荐插件</span> : null}
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
                            {isRecommended ? <span className="figma-card__badge">推荐</span> : null}
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

        {recommendModalOpen ? (
          <div className="figma-recommend-modal" role="dialog" aria-modal="true" aria-labelledby="figma-recommend-title">
            <button
              type="button"
              className="figma-recommend-modal__mask"
              onClick={handleCloseRecommendModal}
              aria-label="关闭推荐插件弹窗"
            />
            <div className="figma-recommend-modal__panel">
              <div className="figma-recommend-modal__header">
                <div>
                  <h2 id="figma-recommend-title">推荐 Figma 插件</h2>
                  <p>提交后会进入后台审核，通过后自动收录到插件中心。</p>
                </div>
                <button
                  type="button"
                  className="figma-recommend-modal__close"
                  onClick={handleCloseRecommendModal}
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>

              <form className="figma-recommend-modal__form" onSubmit={handleSubmitRecommendation}>
                <label>
                  <span>插件名称 *</span>
                  <input
                    type="text"
                    value={recommendForm.pluginName}
                    onChange={(event) => updateRecommendFormField('pluginName', event.target.value)}
                    placeholder="例如：Autoflow"
                    maxLength={120}
                  />
                </label>
                <label>
                  <span>官方链接 *</span>
                  <input
                    type="url"
                    value={recommendForm.officialUrl}
                    onChange={(event) => updateRecommendFormField('officialUrl', event.target.value)}
                    placeholder="https://www.figma.com/community/plugin/..."
                    maxLength={300}
                  />
                </label>
                <label>
                  <span>推荐分类</span>
                  <select
                    value={recommendForm.categoryId}
                    onChange={(event) => updateRecommendFormField('categoryId', event.target.value)}
                  >
                    <option value="">不指定</option>
                    {categories.map((item) => (
                      <option key={`recommend-category-${item.id}`} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>插件简介</span>
                  <textarea
                    value={recommendForm.summary}
                    onChange={(event) => updateRecommendFormField('summary', event.target.value)}
                    placeholder="简要说明插件的核心用途（可选）"
                    rows={3}
                    maxLength={500}
                  />
                </label>
                <div className="figma-recommend-modal__row">
                  <label>
                    <span>推荐人</span>
                    <input
                      type="text"
                      value={recommendForm.submitterName}
                      onChange={(event) => updateRecommendFormField('submitterName', event.target.value)}
                      placeholder="昵称（可选）"
                      maxLength={60}
                    />
                  </label>
                  <label>
                    <span>联系邮箱</span>
                    <input
                      type="email"
                      value={recommendForm.submitterEmail}
                      onChange={(event) => updateRecommendFormField('submitterEmail', event.target.value)}
                      placeholder="用于审核反馈（可选）"
                      maxLength={100}
                    />
                  </label>
                </div>
                <label>
                  <span>微信/备注</span>
                  <input
                    type="text"
                    value={recommendForm.submitterWechat}
                    onChange={(event) => updateRecommendFormField('submitterWechat', event.target.value)}
                    placeholder="微信号（可选）"
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>补充说明</span>
                  <textarea
                    value={recommendForm.submitNote}
                    onChange={(event) => updateRecommendFormField('submitNote', event.target.value)}
                    placeholder="可选：比如适用场景、是否中文友好等"
                    rows={2}
                    maxLength={300}
                  />
                </label>

                {recommendFeedback ? (
                  <div className={`figma-recommend-modal__feedback is-${recommendFeedback.type}`}>
                    {recommendFeedback.message}
                  </div>
                ) : null}

                <div className="figma-recommend-modal__actions">
                  <button type="button" className="figma-recommend-modal__btn" onClick={handleCloseRecommendModal}>
                    取消
                  </button>
                  <button type="submit" className="figma-recommend-modal__btn is-primary" disabled={recommendSubmitting}>
                    {recommendSubmitting ? '提交中...' : '提交推荐'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FigmaPage;
