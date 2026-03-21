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
import { useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import WebsiteFavicon from '../../components/WebsiteFavicon';
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
import './index.css';

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

const FigmaPage: React.FC = () => {
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const { data: publicSettings } = usePublicSettings();
  const siteInfo = publicSettings?.siteInfo;
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<FigmaListItem[]>([]);
  const [categories, setCategories] = useState<FigmaCategoryMeta[]>([]);
  const [tags, setTags] = useState<FigmaTagMeta[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 24,
    total: 0,
    totalPages: 0,
  });

  const keyword = String(searchParams.get('q') || '').trim();
  const category = String(searchParams.get('category') || '').trim();
  const tag = String(searchParams.get('tag') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const [keywordInput, setKeywordInput] = useState(keyword);

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
        pageSize: 24,
        keyword: keyword || undefined,
        category: category || undefined,
        tag: tag || undefined,
      });
      setList(Array.isArray(response.lists) ? response.lists : []);
      setPagination({
        page: Number(response.page || page),
        pageSize: Number(response.pageSize || 24),
        total: Number(response.total || 0),
        totalPages: Number(response.totalPages || 0),
      });
    } catch (loadError) {
      setList([]);
      setPagination({
        page,
        pageSize: 24,
        total: 0,
        totalPages: 0,
      });
      setError('Figma 插件列表加载失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category, tag]);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

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
    if (keyword) chunks.push(`关键词：${keyword}`);
    if (category) chunks.push(`分类：${category}`);
    if (tag) chunks.push(`标签：${tag}`);
    return chunks.join(' · ');
  }, [keyword, category, tag]);

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

  /**
   * 提交关键词搜索。
   */
  const handleKeywordSearchSubmit = useCallback((event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    updateParams({ q: String(keywordInput || '').trim(), page: 1 });
  }, [keywordInput, updateParams]);

  /**
   * 清空全部筛选项。
   */
  const handleResetFilters = useCallback(() => {
    setKeywordInput('');
    updateParams({ q: null, category: null, tag: null, page: 1 });
  }, [updateParams]);

  /**
   * 打开 Figma 插件外链。
   */
  const openPluginExternal = useCallback((item: FigmaListItem) => {
    const target = resolvePluginExternalUrl(item);
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
  }, []);

  /**
   * 卡片键盘无障碍：回车和空格触发打开。
   */
  const handleCardKeyOpen = useCallback((event: React.KeyboardEvent<HTMLElement>, item: FigmaListItem) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPluginExternal(item);
  }, [openPluginExternal]);

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
          <div className="figma-list-page__hero-main">
            <div className="figma-list-page__kicker">FIGMA COMMUNITY</div>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
            <form className="figma-list-page__hero-search" onSubmit={handleKeywordSearchSubmit}>
              <input
                type="text"
                value={keywordInput}
                placeholder="搜索插件名称、功能、关键词"
                onChange={(event) => setKeywordInput(event.target.value)}
              />
              <button type="submit">搜索</button>
            </form>
            <div className="figma-list-page__hero-hint">
              {activeFilterSummary ? `当前筛选：${activeFilterSummary}` : '当前展示全部 Figma 插件'}
            </div>
          </div>
          <div className="figma-list-page__hero-stats">
            <article>
              <strong>{formatCountLabel(pagination.total)}</strong>
              <span>插件总数</span>
            </article>
            <article>
              <strong>{formatCountLabel(categories.length)}</strong>
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
                disabled={!activeFilterSummary}
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
                {categories.map((item) => (
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
              <div className="figma-list-page__results-title">Figma 插件列表</div>
              <div className="figma-list-page__results-subtitle">
                共 {formatCountLabel(pagination.total)} 个插件
                {activeFilterSummary ? ` · ${activeFilterSummary}` : ''}
              </div>
            </header>

            {error ? <div className="figma-list-page__state">{error}</div> : null}

            {!error && !loading && list.length === 0 ? (
              <div className="figma-list-page__state">当前筛选条件下暂无插件，换个关键词试试。</div>
            ) : null}

            {!error && list.length > 0 ? (
              <section className="figma-list-page__grid">
                {list.map((item) => {
                  const targetUrl = resolvePluginExternalUrl(item);
                  const publishDate = formatPublishDate(item.publishTime);
                  const displayTags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
                  return (
                    <article
                      key={`figma-item-${item.id}`}
                      className={`figma-card ${targetUrl ? 'is-clickable' : ''}`}
                      role={targetUrl ? 'button' : undefined}
                      tabIndex={targetUrl ? 0 : -1}
                      onClick={() => openPluginExternal(item)}
                      onKeyDown={(event) => handleCardKeyOpen(event, item)}
                      aria-label={targetUrl ? `打开 Figma 官方插件：${item.name}` : item.name}
                    >
                      <div className="figma-card__header">
                        <div className="figma-card__icon-wrap">
                          <WebsiteFavicon
                            websiteUrl={targetUrl || String(item.officialUrl || '').trim()}
                            iconUrl={item.iconUrl || item.coverUrl}
                            name={item.name}
                            size={48}
                            alt={item.name}
                          />
                        </div>
                        <div className="figma-card__title-wrap">
                          <h3>{item.name}</h3>
                          <div className="figma-card__meta-line">
                            {item.categoryName ? <span>{item.categoryName}</span> : null}
                            {publishDate ? <span>{publishDate}</span> : null}
                            {Number(item.userCount || 0) > 0 ? <span>{formatCountLabel(item.userCount)} users</span> : null}
                            {Number(item.likeCount || 0) > 0 ? <span>{formatCountLabel(item.likeCount)} 关注</span> : null}
                            {Number(item.viewCount || 0) > 0 ? <span>{formatCountLabel(item.viewCount)} 浏览</span> : null}
                          </div>
                        </div>
                        {Number(item.isRecommended || 0) === 1 ? <span className="figma-card__badge">推荐</span> : null}
                      </div>

                      <p className="figma-card__summary">{item.summary || '暂无简介'}</p>

                      {displayTags.length > 0 ? (
                        <div className="figma-card__tags">
                          {displayTags.map((tagName) => (
                            <span key={`${item.id}-${tagName}`}>{tagName}</span>
                          ))}
                        </div>
                      ) : null}
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
