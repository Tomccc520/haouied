/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 *
 * @file pages/MCP/index.tsx
 * @description MCP 中心列表页
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import WebsiteFavicon from '../../components/WebsiteFavicon';
import {
  McpCategoryMeta,
  McpListItem,
  McpTagMeta,
  getMcpCategories,
  getMcpList,
  getMcpTags,
} from '../../services/mcpService';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import './index.css';

/**
 * 格式化协议显示文案。
 */
const formatTransport = (value?: string): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'HTTP';
  if (normalized === 'stdio') return 'STDIO';
  if (normalized === 'sse') return 'SSE';
  return normalized.toUpperCase();
};

/**
 * 格式化时间标签。
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
 * 解析 MCP 卡片用于拉取 favicon 的网址。
 */
const resolveCardIconWebsiteUrl = (item: McpListItem): string => {
  const candidates = [
    String(item.officialUrl || '').trim(),
    String(item.docsUrl || '').trim(),
    String(item.githubUrl || '').trim(),
  ];
  return candidates.find(url => Boolean(url)) || '';
};

const MCPListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: publicSettings } = usePublicSettings();
  const siteInfo = publicSettings?.siteInfo;
  const mcpPageConfig = publicSettings?.mcpPage;
  const pageSize = Math.max(6, Math.min(48, Number(mcpPageConfig?.listPageSize || 12)));
  const tagFilterLimit = Math.max(5, Math.min(60, Number(mcpPageConfig?.tagFilterLimit || 20)));
  const isPageEnabled = mcpPageConfig?.enabled !== false;
  const isHeroEnabled = mcpPageConfig?.heroEnabled !== false;
  const showHeroStats = mcpPageConfig?.showHeroStats !== false;
  const showOfficialLink = mcpPageConfig?.showOfficialLink !== false;
  const showTagFilter = mcpPageConfig?.showTagFilter !== false;
  const showCategoryCount = mcpPageConfig?.showCategoryCount !== false;
  const heroStyle = String(mcpPageConfig?.heroStyle || 'glass').trim().toLowerCase() === 'solid' ? 'solid' : 'glass';
  const visualPreset = String(mcpPageConfig?.visualPreset || 'minimal').trim().toLowerCase() === 'tech' ? 'tech' : 'minimal';
  const cardStyle = String(mcpPageConfig?.cardStyle || 'elevated').trim().toLowerCase() === 'outline' ? 'outline' : 'elevated';
  const density = String(mcpPageConfig?.density || 'comfortable').trim().toLowerCase() === 'compact' ? 'compact' : 'comfortable';
  const backgroundMode = useMemo(() => {
    const mode = String(mcpPageConfig?.backgroundMode || 'mesh').trim().toLowerCase();
    if (mode === 'plain') return 'plain';
    if (mode === 'grid') return 'grid';
    return 'mesh';
  }, [mcpPageConfig?.backgroundMode]);
  const accentColor = String(mcpPageConfig?.accentColor || '#2563eb').trim() || '#2563eb';
  const pageBackgroundColor = String(mcpPageConfig?.pageBackgroundColor || '#f2f6ff').trim() || '#f2f6ff';
  const heroBackgroundColor = String(mcpPageConfig?.heroBackgroundColor || '#eef4ff').trim() || '#eef4ff';
  const heroCoverImage = String(mcpPageConfig?.heroCoverImage || '').trim();
  const cardBorderColor = String(mcpPageConfig?.cardBorderColor || '#dbe4ff').trim() || '#dbe4ff';
  const cardRadius = Math.max(10, Math.min(28, Number(mcpPageConfig?.cardRadius || 16)));
  const cardShadowEnabled = mcpPageConfig?.cardShadowEnabled === true;
  const resolvedKicker = String(mcpPageConfig?.pageKicker || 'MCP HUB').trim() || 'MCP HUB';
  const resolvedBaseTitle = String(mcpPageConfig?.pageTitle || 'MCP 中心').trim() || 'MCP 中心';
  const resolvedBaseDescription = String(
    mcpPageConfig?.pageDescription || '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。'
  ).trim() || '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。';
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<McpListItem[]>([]);
  const [categories, setCategories] = useState<McpCategoryMeta[]>([]);
  const [tags, setTags] = useState<McpTagMeta[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  });

  const keyword = String(searchParams.get('q') || '').trim();
  const category = String(searchParams.get('category') || '').trim();
  const tag = String(searchParams.get('tag') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);

  /**
   * 更新 URL 查询参数。
   */
  const updateParams = (patch: Record<string, string | number | null | undefined>) => {
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
  };

  /**
   * 拉取分类与标签元数据。
   */
  const loadMeta = useCallback(async () => {
    const [categoryRows, tagRows] = await Promise.all([
      getMcpCategories(),
      getMcpTags(),
    ]);
    setCategories(Array.isArray(categoryRows) ? categoryRows : []);
    setTags(Array.isArray(tagRows) ? tagRows : []);
  }, []);

  /**
   * 拉取 MCP 列表数据。
   */
  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMcpList({
        page,
        pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        tag: tag || undefined,
      });
      setList(Array.isArray(response.lists) ? response.lists : []);
      setPagination({
        page: Number(response.page || page),
        pageSize: Number(response.pageSize || pageSize),
        total: Number(response.total || 0),
        totalPages: Number(response.totalPages || 0),
      });
    } catch (loadError) {
      setList([]);
      setError('MCP 列表加载失败，请稍后重试');
      setPagination({
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, category, tag]);

  useEffect(() => {
    loadMeta().catch(() => {
      setCategories([]);
      setTags([]);
    });
  }, [loadMeta]);

  useEffect(() => {
    loadList().catch(() => {
      setError('MCP 列表加载失败，请稍后重试');
      setLoading(false);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadList]);

  const pageTitle = useMemo(() => {
    if (category) return `${category} · ${resolvedBaseTitle}`;
    if (tag) return `#${tag} · ${resolvedBaseTitle}`;
    return resolvedBaseTitle;
  }, [category, tag, resolvedBaseTitle]);

  const pageDescription = useMemo(() => {
    if (keyword) {
      return `在 ${resolvedBaseTitle} 中搜索“${keyword}”的结果，覆盖协议类型、运行时、推荐度与发布时间信息。`;
    }
    return resolvedBaseDescription;
  }, [keyword, resolvedBaseDescription, resolvedBaseTitle]);

  const pagerItems = useMemo(() => {
    const totalPages = Number(pagination.totalPages || 0);
    const current = Number(pagination.page || 1);
    if (totalPages <= 1) return [1];
    const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
    return Array.from(pages).filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  }, [pagination.page, pagination.totalPages]);

  const pageClassName = useMemo(() => {
    return [
      'mcp-list-page',
      `mcp-list-page--hero-${heroStyle}`,
      `mcp-list-page--visual-${visualPreset}`,
      `mcp-list-page--card-${cardStyle}`,
      `mcp-list-page--density-${density}`,
      `mcp-list-page--bg-${backgroundMode}`,
      cardShadowEnabled ? 'mcp-list-page--shadow-on' : 'mcp-list-page--shadow-off',
    ].join(' ');
  }, [heroStyle, visualPreset, cardStyle, density, backgroundMode, cardShadowEnabled]);

  /**
   * 写入 MCP 页面的主题变量，支持后台实时切换视觉样式。
   */
  const pageStyleVars = useMemo(() => {
    const heroCoverValue = heroCoverImage ? `url("${heroCoverImage}")` : 'none';
    return {
      '--mcp-accent': accentColor,
      '--mcp-page-bg': pageBackgroundColor,
      '--mcp-hero-bg': heroBackgroundColor,
      '--mcp-card-border': cardBorderColor,
      '--mcp-card-radius': `${cardRadius}px`,
      '--mcp-hero-cover': heroCoverValue,
    } as React.CSSProperties;
  }, [accentColor, pageBackgroundColor, heroBackgroundColor, cardBorderColor, cardRadius, heroCoverImage]);

  const activeFilterSummary = useMemo(() => {
    const chunks: string[] = [];
    if (keyword) chunks.push(`关键词：${keyword}`);
    if (category) chunks.push(`分类：${category}`);
    if (tag) chunks.push(`标签：${tag}`);
    return chunks.join(' · ');
  }, [keyword, category, tag]);

  const currentRecommendedCount = useMemo(() => {
    return list.reduce((count, item) => count + (Number(item.isRecommended || 0) === 1 ? 1 : 0), 0);
  }, [list]);

  /**
   * 跳转到 MCP 详情页（整卡点击入口）。
   */
  const openMcpDetail = useCallback((item: McpListItem) => {
    const target = String(item.slug || item.id || '').trim();
    if (!target) return;
    navigate(`/mcp/${target}`);
  }, [navigate]);

  /**
   * 键盘无障碍支持：回车/空格打开详情。
   */
  const handleCardKeyboardOpen = useCallback((event: React.KeyboardEvent<HTMLElement>, item: McpListItem) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openMcpDetail(item);
  }, [openMcpDetail]);

  return (
    <div className={pageClassName} style={pageStyleVars}>
      <SEO
        title={`${pageTitle}${siteInfo?.siteName ? ` - ${siteInfo.siteName}` : ''}`}
        description={pageDescription}
        keywords={`MCP,Model Context Protocol,${keyword || ''},${category || ''},${tag || ''}`.replace(/,+/g, ',')}
        url={`https://hao.uied.cn/mcp${window.location.search || ''}`}
      />

      <div className="mcp-list-page__container">
        {isPageEnabled ? null : (
          <div className="mcp-list-page__state">
            MCP 页面暂未启用，请在后台「内容中心配置 到 MCP中心」开启后查看。
          </div>
        )}

        {isPageEnabled && isHeroEnabled ? (
          <header className="mcp-list-page__hero">
            <span className="mcp-list-page__hero-glow mcp-list-page__hero-glow--one" aria-hidden="true" />
            <span className="mcp-list-page__hero-glow mcp-list-page__hero-glow--two" aria-hidden="true" />
            <div className="mcp-list-page__hero-main">
              <div>
                <div className="mcp-list-page__hero-kicker">{resolvedKicker}</div>
                <h1>{pageTitle}</h1>
                <p>{pageDescription}</p>
                <div className="mcp-list-page__hero-meta">
                  {activeFilterSummary ? (
                    <span className="mcp-list-page__hero-filter-chip">当前筛选：{activeFilterSummary}</span>
                  ) : (
                    <span>当前展示全部 MCP 条目</span>
                  )}
                </div>
              </div>
            </div>
            {showHeroStats ? (
              <div className="mcp-list-page__hero-stats">
                <article>
                  <strong>{pagination.total}</strong>
                  <span>收录总数</span>
                </article>
                <article>
                  <strong>{categories.length}</strong>
                  <span>分类数量</span>
                </article>
                <article>
                  <strong>{tags.length}</strong>
                  <span>标签数量</span>
                </article>
                <article>
                  <strong>{currentRecommendedCount}</strong>
                  <span>本页推荐</span>
                </article>
              </div>
            ) : null}
          </header>
        ) : null}

        <div className="mcp-list-page__body">
          <section id="mcp-filters" className="mcp-list-page__filters" aria-label="MCP筛选器">
            <div className="mcp-list-page__search-row">
              <input
                value={keyword}
                placeholder="搜索 MCP 名称、摘要、标识"
                onChange={(event) => updateParams({ q: event.target.value })}
              />
            </div>
            <div className="mcp-list-page__chips-block">
              <div className="mcp-list-page__chips-title">分类筛选</div>
              {categories.length > 0 ? (
                <div className="mcp-list-page__chips">
                  <button
                    className={!category ? 'is-active' : ''}
                    onClick={() => updateParams({ category: null })}
                  >
                    全部分类
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      className={category === item.slug ? 'is-active' : ''}
                      onClick={() => updateParams({ category: category === item.slug ? null : item.slug })}
                    >
                      {item.name}
                      {showCategoryCount && Number(item.itemCount || 0) > 0 ? ` (${item.itemCount})` : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mcp-list-page__chips-empty">暂无分类，请在后台 MCP 中心创建分类</div>
              )}
            </div>
            {showTagFilter ? (
              <div className="mcp-list-page__chips-block">
                <div className="mcp-list-page__chips-title">标签筛选</div>
                {tags.length > 0 ? (
                  <div className="mcp-list-page__chips mcp-list-page__chips--tags">
                    <button
                      className={!tag ? 'is-active' : ''}
                      onClick={() => updateParams({ tag: null })}
                    >
                      全部标签
                    </button>
                    {tags.slice(0, tagFilterLimit).map((item) => (
                      <button
                        key={item.id}
                        className={tag === item.slug ? 'is-active' : ''}
                        onClick={() => updateParams({ tag: tag === item.slug ? null : item.slug })}
                      >
                        #{item.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mcp-list-page__chips-empty">暂无标签，请在后台 MCP 中心创建标签</div>
                )}
              </div>
            ) : null}
          </section>

          <section className="mcp-list-page__results" aria-label="MCP 结果列表">
            {isPageEnabled ? (
              <header className="mcp-list-page__results-head">
                <div className="mcp-list-page__results-title">共 {pagination.total} 个 MCP 条目</div>
                <div className="mcp-list-page__results-subtitle">
                  {activeFilterSummary ? `筛选中：${activeFilterSummary}` : '当前为全部结果'}
                </div>
              </header>
            ) : null}

            {!isPageEnabled ? null : loading ? (
              <div className="mcp-list-page__state">正在加载 MCP 数据...</div>
            ) : error ? (
              <div className="mcp-list-page__state mcp-list-page__state--error">{error}</div>
            ) : list.length === 0 ? (
              <div className="mcp-list-page__state">暂无符合条件的 MCP 条目</div>
            ) : (
              <section className="mcp-list-page__grid">
                {list.map((item) => (
                  <article
                    className="mcp-list-card mcp-list-card--clickable"
                    key={item.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openMcpDetail(item)}
                    onKeyDown={(event) => handleCardKeyboardOpen(event, item)}
                    aria-label={`查看 ${item.name} 的 MCP 详情`}
                  >
                    <div className="mcp-list-card__head">
                      <div className="mcp-list-card__title-wrap">
                        <WebsiteFavicon
                          websiteUrl={resolveCardIconWebsiteUrl(item)}
                          iconUrl={item.iconUrl}
                          name={item.name}
                          className="mcp-list-card__icon"
                          size={40}
                          alt={`${item.name} 图标`}
                        />
                        <div>
                          <h2 title={item.name}>{item.name}</h2>
                          <div className="mcp-list-card__slug">/{item.slug}</div>
                        </div>
                      </div>
                      {Number(item.isRecommended || 0) === 1 && (
                        <span className="mcp-list-card__badge">推荐</span>
                      )}
                    </div>
                    <p className="mcp-list-card__summary">{item.summary || '暂无摘要'}</p>
                    <div className="mcp-list-card__meta">
                      <span>{formatTransport(item.transportType)}</span>
                      <span>{String(item.runtime || 'other').toUpperCase()}</span>
                      {item.categoryName ? <span>{item.categoryName}</span> : null}
                      {Array.isArray(item.tags) ? (
                        item.tags.slice(0, 2).map((itemTag, itemTagIndex) => (
                          <span key={`${item.id}-tag-${itemTagIndex}`}>#{itemTag}</span>
                        ))
                      ) : null}
                      {formatPublishDate(item.publishTime) ? <span>{formatPublishDate(item.publishTime)}</span> : null}
                    </div>
                    <div className="mcp-list-card__actions">
                      {showOfficialLink ? (
                        item.officialUrl ? (
                          <a
                            href={item.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            官网
                          </a>
                        ) : (
                          <span className="mcp-list-card__link-muted">无官网链接</span>
                        )
                      ) : null}
                      <Link to={`/mcp/${item.slug || item.id}`} onClick={(event) => event.stopPropagation()}>
                        查看详情
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {isPageEnabled && pagination.totalPages > 1 && (
              <nav className="mcp-list-page__pager" aria-label="MCP列表分页">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => updateParams({ page: Math.max(1, pagination.page - 1) })}
                >
                  上一页
                </button>
                {pagerItems.map((item) => (
                  <button
                    key={item}
                    className={item === pagination.page ? 'is-active' : ''}
                    onClick={() => updateParams({ page: item })}
                  >
                    {item}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateParams({ page: Math.min(pagination.totalPages, pagination.page + 1) })}
                >
                  下一页
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MCPListPage;
