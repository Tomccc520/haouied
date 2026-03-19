/**
 * @file pages/Articles/ArticleDetail.tsx
 * @description 文章详情页组件 - 沉浸式阅读设计
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArticleDetail, getArticles, recordArticleView } from '../../services/articleService';
import { ArticleDetail as ArticleDetailType } from '../../types/article';
import api from '../../services/api';
import { unwrapApiResponse } from '../../utils/apiResponse';
import SEO from '../../components/SEO';
import { useLicense, FEATURES } from '../../hooks/useLicense';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import ArticleComments from './ArticleComments';
import './ArticleDetail.css';

const formatDate = (value: string | number | null): string => {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * 规范化文章详情宽度模式，兼容后台配置异常值
 */
const normalizeArticleDetailLayoutWidthMode = (mode: unknown): 'contained' | 'wide' | 'fluid' => {
  const value = String(mode || '').trim();
  if (value === 'wide' || value === 'fluid') return value;
  return 'contained';
};

/**
 * 规范化文章详情标题区对齐方式
 */
const normalizeArticleDetailHeaderAlign = (align: unknown): 'center' | 'left' => {
  return String(align || '').trim() === 'left' ? 'left' : 'center';
};

/**
 * 规范化文章正文最大宽度，避免配置异常导致页面溢出
 */
const normalizeArticleDetailMaxWidth = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 880;
  return Math.max(680, Math.min(1600, parsed));
};

interface ArticleSidebarModuleConfig {
  key: string;
  name: string;
  enabled: boolean;
  sort: number;
}

interface ArticleSidebarHotWebsiteItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

interface ArticleSidebarLatestArticleItem {
  id: number;
  slug: string;
  title: string;
  publishedAt: number | null;
}

type ArticleDetailTabKey = 'intro' | 'info' | 'related' | 'faq';

interface ArticleDetailTabItem {
  key: ArticleDetailTabKey;
  label: string;
}

const DEFAULT_ARTICLE_SIDEBAR_MODULES: ArticleSidebarModuleConfig[] = [
  { key: 'latest_articles', name: '最新文章', enabled: true, sort: 1 },
  { key: 'hot_websites', name: '热门网址', enabled: true, sort: 2 },
  { key: 'article_tags', name: '文章标签', enabled: true, sort: 3 },
];

const ARTICLE_DETAIL_TABS: ArticleDetailTabItem[] = [
  { key: 'intro', label: '产品介绍' },
  { key: 'info', label: '产品信息' },
  { key: 'related', label: '关联网址' },
  { key: 'faq', label: '常见问题' },
];

/**
 * 规范化文章详情页侧栏模块，确保旧配置下仍有完整模块。
 */
const normalizeArticleSidebarModules = (modules: unknown): ArticleSidebarModuleConfig[] => {
  const list = Array.isArray(modules) ? modules : [];
  const defaultMap = new Map(DEFAULT_ARTICLE_SIDEBAR_MODULES.map(item => [item.key, item]));
  const keySet = new Set<string>();
  const normalized = list
    .filter(item => String((item as any)?.key || '').trim())
    .map(item => {
      const key = String((item as any)?.key || '').trim();
      keySet.add(key);
      const defaultItem = defaultMap.get(key);
      return {
        key,
        name: String((item as any)?.name || defaultItem?.name || key),
        enabled: (item as any)?.enabled !== false,
        sort: Number.isFinite(Number((item as any)?.sort)) ? Number((item as any).sort) : 0,
      };
    });
  DEFAULT_ARTICLE_SIDEBAR_MODULES.forEach(item => {
    if (!keySet.has(item.key)) normalized.push({ ...item });
  });
  return normalized
    .sort((a, b) => a.sort - b.sort)
    .map((item, index) => ({ ...item, sort: index + 1 }));
};

/**
 * 判断文章详情侧栏某个模块是否开启。
 */
const isArticleSidebarModuleEnabled = (modules: ArticleSidebarModuleConfig[], moduleKey: string): boolean => {
  return modules.some(module => module.key === moduleKey && module.enabled);
};

const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasFeature } = useLicense();
  const { data: publicSettings } = usePublicSettings();
  
  const [article, setArticle] = useState<ArticleDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [sidebarLatestArticles, setSidebarLatestArticles] = useState<ArticleSidebarLatestArticleItem[]>([]);
  const [sidebarLatestArticlesLoading, setSidebarLatestArticlesLoading] = useState(false);
  const [sidebarHotWebsites, setSidebarHotWebsites] = useState<ArticleSidebarHotWebsiteItem[]>([]);
  const [sidebarHotWebsitesLoading, setSidebarHotWebsitesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ArticleDetailTabKey>('intro');
  const [likeCount, setLikeCount] = useState(0);
  const commentsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await getArticleDetail(slug);
        setArticle(data);
      } catch (err) {
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 404) {
          setError('文章不存在或已被删除');
        } else {
          setError('加载文章失败，请检查网络');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  /**
   * 文章切换时重置标签页，并初始化本地点赞计数。
   */
  useEffect(() => {
    setActiveTab('intro');
    if (!article?.id) {
      setLikeCount(0);
      return;
    }
    const stored = Number(localStorage.getItem(`article_like_${article.id}`) || 0);
    setLikeCount(Number.isFinite(stored) && stored > 0 ? stored : 0);
  }, [article?.id]);

  // 记录阅读量
  useEffect(() => {
    if (!article?.id) return;
    const key = `viewed_article_${article.id}`;
    if (sessionStorage.getItem(key)) return;
    
    const timer = setTimeout(() => {
      recordArticleView(article.id).catch(() => {});
      sessionStorage.setItem(key, '1');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [article?.id]);

  /**
   * 监听滚动进度，提供阅读进度条反馈
   */
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(100, (scrollTop / maxScroll) * 100));
      setReadingProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * 复制文章当前链接，方便转发分享
   */
  const handleCopyArticleLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      window.alert('文章链接已复制');
    } catch (copyError) {
      window.alert('复制失败，请手动复制地址栏链接');
    }
  };

  /**
   * 滚动到评论区，提升互动效率。
   */
  const handleFocusComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * 本地点赞反馈（演示态，不写后端）。
   */
  const handleToggleLike = () => {
    if (!article?.id) return;
    const nextValue = likeCount > 0 ? 0 : 1;
    setLikeCount(nextValue);
    localStorage.setItem(`article_like_${article.id}`, String(nextValue));
  };

  const relatedWebsites = useMemo(
    () => (Array.isArray(article?.relatedWebsites) ? article?.relatedWebsites || [] : []),
    [article?.relatedWebsites]
  );

  /**
   * 组装“常见问题”演示内容，确保缺省时也有稳定展示。
   */
  const faqList = useMemo(() => {
    if (!article) return [];
    return [
      {
        question: `这篇《${article.title}》适合谁阅读？`,
        answer: `建议 ${article.category} 从业者优先阅读，也适合想快速了解该主题的新用户。`,
      },
      {
        question: '如何判断内容是否仍然有效？',
        answer: '可结合发布时间、文中链接可用性和相关工具更新日志交叉确认。',
      },
      {
        question: '文中提到的网站如何继续筛选？',
        answer: '可先看“关联网址”分组，再按点击量和描述信息做二次筛选。',
      },
    ];
  }, [article]);

  const articleSetting = publicSettings?.article;
  const detailLayoutWidthMode = normalizeArticleDetailLayoutWidthMode(articleSetting?.detailLayoutWidthMode);
  const detailHeaderAlign = normalizeArticleDetailHeaderAlign(articleSetting?.detailHeaderAlign);
  const detailMaxWidth = normalizeArticleDetailMaxWidth(articleSetting?.detailContentMaxWidth);
  const detailSidebarEnabled = articleSetting?.detailSidebarEnabled !== false;
  const detailSidebarSticky = articleSetting?.detailSidebarSticky !== false;
  const detailSidebarTopOffset = Number.isFinite(Number(articleSetting?.detailSidebarTopOffset))
    ? Math.max(0, Math.min(240, Number(articleSetting?.detailSidebarTopOffset)))
    : 16;
  const detailSidebarLinksNewWindow = articleSetting?.detailSidebarLinksNewWindow === true;
  const detailSidebarLatestArticlesTitle = String(articleSetting?.detailSidebarLatestArticlesTitle || '最新文章');
  const detailSidebarLatestArticlesCount = Number.isFinite(Number(articleSetting?.detailSidebarLatestArticlesCount))
    ? Math.max(1, Math.min(20, Number(articleSetting?.detailSidebarLatestArticlesCount)))
    : 6;
  const detailSidebarHotWebsitesTitle = String(articleSetting?.detailSidebarHotWebsitesTitle || '热门网址');
  const detailSidebarHotWebsitesCount = Number.isFinite(Number(articleSetting?.detailSidebarHotWebsitesCount))
    ? Math.max(1, Math.min(20, Number(articleSetting?.detailSidebarHotWebsitesCount)))
    : 6;
  const detailSidebarTagsTitle = String(articleSetting?.detailSidebarTagsTitle || '文章标签');
  const detailSidebarModules = normalizeArticleSidebarModules(articleSetting?.detailSidebarModules);
  const detailSidebarLinkTarget = detailSidebarLinksNewWindow ? '_blank' : undefined;
  const detailSidebarLinkRel = detailSidebarLinksNewWindow ? 'noopener noreferrer' : undefined;
  const latestArticlesModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'latest_articles');
  const hotWebsitesModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'hot_websites');
  const articleTagsModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'article_tags');
  const shouldRenderSidebar = detailSidebarEnabled && (
    latestArticlesModuleEnabled
    || hotWebsitesModuleEnabled
    || articleTagsModuleEnabled
  );

  /**
   * 拉取文章详情页侧栏“最新文章”数据。
   */
  useEffect(() => {
    const fetchSidebarLatestArticles = async () => {
      if (!detailSidebarEnabled || !latestArticlesModuleEnabled) {
        setSidebarLatestArticles([]);
        return;
      }
      try {
        setSidebarLatestArticlesLoading(true);
        const result = await getArticles({
          page: 1,
          pageSize: Math.max(detailSidebarLatestArticlesCount + 3, 8),
        });
        const lists = Array.isArray(result?.data) ? result.data : [];
        setSidebarLatestArticles(
          lists
            .filter(item => String(item?.id || '') !== String(article?.id || ''))
            .slice(0, detailSidebarLatestArticlesCount)
            .map(item => ({
              id: Number(item.id || 0),
              slug: String(item.slug || item.id || ''),
              title: String(item.title || ''),
              publishedAt: Number.isFinite(Number(item.publishedAt)) ? Number(item.publishedAt) : null,
            }))
        );
      } catch (fetchError) {
        setSidebarLatestArticles([]);
      } finally {
        setSidebarLatestArticlesLoading(false);
      }
    };
    fetchSidebarLatestArticles();
  }, [detailSidebarEnabled, latestArticlesModuleEnabled, detailSidebarLatestArticlesCount, article?.id]);

  /**
   * 拉取文章详情页侧栏“热门网址”数据。
   */
  useEffect(() => {
    const fetchSidebarHotWebsites = async () => {
      if (!detailSidebarEnabled || !hotWebsitesModuleEnabled) {
        setSidebarHotWebsites([]);
        return;
      }
      try {
        setSidebarHotWebsitesLoading(true);
        const response = await api.get('/websites/hot/list', {
          params: { limit: detailSidebarHotWebsitesCount },
        });
        const payload = unwrapApiResponse<any>(response.data, []);
        const list = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.websites) ? payload.websites : []);
        setSidebarHotWebsites(
          list
            .filter((item: any) => item && (item.id || item.slug))
            .map((item: any) => ({
              id: String(item.id || ''),
              name: String(item.name || ''),
              slug: String(item.slug || item.id || ''),
              description: String(item.description || ''),
            }))
            .slice(0, detailSidebarHotWebsitesCount)
        );
      } catch (fetchError) {
        setSidebarHotWebsites([]);
      } finally {
        setSidebarHotWebsitesLoading(false);
      }
    };
    fetchSidebarHotWebsites();
  }, [detailSidebarEnabled, hotWebsitesModuleEnabled, detailSidebarHotWebsitesCount]);

  if (loading) return <div className="detail-loading"><div className="spinner" /></div>;
  
  if (error || !article) {
    return (
      <div className="detail-error">
        <h2>{error || '文章不存在'}</h2>
        <button onClick={() => navigate('/articles')} className="back-btn">返回文章列表</button>
      </div>
    );
  }

  return (
    <article
      className={`article-detail-page article-detail-page--layout-${detailLayoutWidthMode} article-detail-page--header-${detailHeaderAlign} ${shouldRenderSidebar ? 'article-detail-page--has-sidebar' : ''}`}
      style={{ '--article-detail-max-width': `${detailMaxWidth}px` } as React.CSSProperties}
    >
      <div className="detail-reading-progress" aria-hidden="true">
        <div
          className="detail-reading-progress__bar"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      <SEO
        title={article.seoTitle || article.title}
        description={article.seoDescription || article.excerpt}
        keywords={article.tags.map(t => t.name).join(',')}
        image={article.coverImage}
        type="article"
      />

      {/* 沉浸式头部背景 */}
      <div className="detail-hero-bg"></div>

      <div className={`detail-container ${shouldRenderSidebar ? 'detail-container--with-sidebar' : ''}`}>
        <div className={`article-detail-layout ${shouldRenderSidebar ? 'article-detail-layout--with-sidebar' : ''}`}>
          <div className="article-detail-main">
            {/* 导航面包屑 */}
            <nav className="detail-nav">
              <Link to="/articles">文章列表</Link>
              <span className="separator">/</span>
              <span className="current">{article.category}</span>
            </nav>

            {/* 文章头部信息 */}
            <header className="detail-header">
              <div className="detail-meta-tags">
                <span className="category-badge">{article.category}</span>
                <time className="publish-date">{formatDate(article.publishedAt)}</time>
              </div>

              <h1 className="detail-title">{article.title}</h1>

              <div className="detail-author-bar">
                <div className="author-info">
                  <div className="author-avatar">
                    {article.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="author-text">
                    <span className="author-name">{article.author}</span>
                    <span className="read-count">{article.viewCount} 次阅读</span>
                  </div>
                </div>
              </div>

              <div className="detail-header-actions">
                <button type="button" className="detail-header-action" onClick={() => navigate('/articles')}>
                  返回列表
                </button>
                <button type="button" className="detail-header-action detail-header-action--primary" onClick={handleCopyArticleLink}>
                  复制链接
                </button>
              </div>
            </header>

            <section className="detail-product-layout">
              <aside className="detail-action-rail">
                <button type="button" className="detail-action-pill" onClick={handleFocusComments}>
                  <span className="detail-action-pill__count">0</span>
                  <span className="detail-action-pill__glyph">评</span>
                  <span className="detail-action-pill__label">点评</span>
                </button>
                <button type="button" className="detail-action-pill" onClick={handleToggleLike}>
                  <span className="detail-action-pill__count">{likeCount}</span>
                  <span className="detail-action-pill__glyph">赞</span>
                  <span className="detail-action-pill__label">点赞</span>
                </button>
                <button type="button" className="detail-action-pill detail-action-pill--hot">
                  <span className="detail-action-pill__count">{article.viewCount}</span>
                  <span className="detail-action-pill__glyph">热</span>
                  <span className="detail-action-pill__label">热度</span>
                </button>
                <button type="button" className="detail-action-pill" onClick={() => setActiveTab('related')}>
                  <span className="detail-action-pill__count">{relatedWebsites.length}</span>
                  <span className="detail-action-pill__glyph">链</span>
                  <span className="detail-action-pill__label">关联网址</span>
                </button>
                <button type="button" className="detail-action-pill" onClick={handleCopyArticleLink}>
                  <span className="detail-action-pill__count">1</span>
                  <span className="detail-action-pill__glyph">享</span>
                  <span className="detail-action-pill__label">分享</span>
                </button>
              </aside>

              <div className="detail-product-main">
                <div className="detail-tabs">
                  {ARTICLE_DETAIL_TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`detail-tab ${activeTab === tab.key ? 'is-active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="detail-panel">
                  {activeTab === 'intro' && (
                    <div>
                      {/* 封面图 */}
                      {article.coverImage && (
                        <figure className="detail-cover">
                          <img src={article.coverImage} alt={article.title} />
                        </figure>
                      )}
                      {/* 正文区域 */}
                      <div className="detail-content-wrapper">
                        <div
                          className="detail-content typography"
                          dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'info' && (
                    <div className="detail-meta-grid">
                      <div className="detail-meta-card">
                        <h4>基础信息</h4>
                        <p><strong>所属分类：</strong>{article.category}</p>
                        <p><strong>作者：</strong>{article.author}</p>
                        <p><strong>发布时间：</strong>{formatDate(article.publishedAt) || '-'}</p>
                        <p><strong>阅读热度：</strong>{article.viewCount}</p>
                      </div>
                      <div className="detail-meta-card">
                        <h4>内容摘要</h4>
                        <p>{article.excerpt || '暂无摘要'}</p>
                      </div>
                      {article.tags.length > 0 && (
                        <div className="detail-meta-card">
                          <h4>文章标签</h4>
                          <div className="detail-tags">
                            {article.tags.map(tag => (
                              <Link key={tag.id} to={`/articles?tag=${tag.slug}`} className="tag-chip">
                                # {tag.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'related' && (
                    <div className="detail-related-list">
                      {relatedWebsites.length > 0 ? relatedWebsites.map(site => (
                        <a
                          key={`related-${site.id}`}
                          href={site.url || `/website/${site.slug || site.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-related-item"
                        >
                          <div className="detail-related-item__name">{site.name}</div>
                          <div className="detail-related-item__desc">{site.description || site.url}</div>
                        </a>
                      )) : (
                        <div className="article-sidebar-empty">暂无关联网址</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'faq' && (
                    <div className="detail-faq-list">
                      {faqList.map((item, index) => (
                        <div key={`faq-${index}`} className="detail-faq-item">
                          <h4>{item.question}</h4>
                          <p>{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 评论区 */}
            {hasFeature(FEATURES.ARTICLE_COMMENTS) && articleSetting?.commentsEnabled !== false && (
              <section ref={commentsRef} className="detail-comments">
                <h3>评论互动</h3>
                <ArticleComments articleId={String(article.id)} />
              </section>
            )}
          </div>

          {shouldRenderSidebar && (
            <aside
              className={`article-detail-sidebar ${detailSidebarSticky ? 'is-sticky' : ''}`}
              style={detailSidebarSticky ? { top: `calc(var(--header-height) + ${detailSidebarTopOffset}px)` } : undefined}
            >
              {detailSidebarModules.filter(module => module.enabled).map(module => {
                if (module.key === 'latest_articles') {
                  return (
                    <section key={module.key} className="article-sidebar-section">
                      <h3 className="article-sidebar-title">{detailSidebarLatestArticlesTitle}</h3>
                      {sidebarLatestArticlesLoading ? (
                        <div className="article-sidebar-empty">加载中...</div>
                      ) : sidebarLatestArticles.length > 0 ? (
                        <div className="article-sidebar-list">
                          {sidebarLatestArticles.map(item => (
                            <Link
                              key={`latest-${item.id}`}
                              to={`/article/${item.slug || item.id}`}
                              className="article-sidebar-card"
                              target={detailSidebarLinkTarget}
                              rel={detailSidebarLinkRel}
                            >
                              <div className="article-sidebar-card__title">{item.title}</div>
                              <div className="article-sidebar-card__meta">{formatDate(item.publishedAt)}</div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="article-sidebar-empty">暂无最新文章</div>
                      )}
                    </section>
                  );
                }
                if (module.key === 'hot_websites') {
                  return (
                    <section key={module.key} className="article-sidebar-section">
                      <h3 className="article-sidebar-title">{detailSidebarHotWebsitesTitle}</h3>
                      {sidebarHotWebsitesLoading ? (
                        <div className="article-sidebar-empty">加载中...</div>
                      ) : sidebarHotWebsites.length > 0 ? (
                        <div className="article-sidebar-list">
                          {sidebarHotWebsites.map(site => (
                            <Link
                              key={`hot-${site.id}`}
                              to={`/website/${site.slug || site.id}`}
                              className="article-sidebar-card"
                              target={detailSidebarLinkTarget}
                              rel={detailSidebarLinkRel}
                            >
                              <div className="article-sidebar-card__title">{site.name}</div>
                              {site.description && (
                                <div className="article-sidebar-card__desc">{site.description}</div>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="article-sidebar-empty">暂无热门网址</div>
                      )}
                    </section>
                  );
                }
                if (module.key === 'article_tags') {
                  return (
                    <section key={module.key} className="article-sidebar-section">
                      <h3 className="article-sidebar-title">{detailSidebarTagsTitle}</h3>
                      {article.tags.length > 0 ? (
                        <div className="article-sidebar-tags">
                          {article.tags.map(tag => (
                            <Link
                              key={`tag-${tag.id}`}
                              to={`/articles?tag=${tag.slug}`}
                              className="article-sidebar-tag"
                              target={detailSidebarLinkTarget}
                              rel={detailSidebarLinkRel}
                            >
                              # {tag.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="article-sidebar-empty">暂无标签</div>
                      )}
                    </section>
                  );
                }
                return null;
              })}
            </aside>
          )}
        </div>
      </div>
    </article>
  );
};

export default ArticleDetail;
