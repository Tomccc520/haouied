/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 *
 * @file pages/Figma/detail.tsx
 * @description Figma 插件详情页
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import SEO from '../../components/SEO';
import useDetailLayoutWidthMode from '../../hooks/useDetailLayoutWidthMode';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { FigmaDetail, FigmaListItem, getFigmaDetail } from '../../services/figmaService';
import { getFullImageUrl } from '../../utils/urlUtils';
import './detail.css';

/**
 * 格式化日期，统一为 yyyy-mm-dd。
 */
const formatDateLabel = (timestamp?: number): string => {
  const value = Number(timestamp || 0);
  if (!Number.isFinite(value) || value <= 0) return '未标注';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '未标注';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * 格式化统计数据，使用千分位。
 */
const formatCountLabel = (value?: number): string => {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '0';
  return count.toLocaleString('zh-CN');
};

/**
 * 处理详情正文：支持纯文本自动转段落。
 */
const buildContentHtml = (content?: string): string => {
  const raw = String(content || '').trim();
  if (!raw) return '<p>暂无详细内容，建议先查看官方文档链接。</p>';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return `<p>${escaped.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
};

/**
 * 统一解析详情页错误提示，避免用户看到技术报错。
 */
const resolveDetailErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  const status = Number(axiosError?.response?.status || 0);
  const data = axiosError?.response?.data;
  const message = String(data?.error || data?.message || '').trim();
  if (status === 404) return message || 'Figma 插件不存在或已下线';
  if (status >= 500) return message || 'Figma 插件详情服务暂时不可用，请稍后重试';
  if (message) return message;
  return 'Figma 插件详情加载失败，请稍后重试';
};

/**
 * 解析关联插件详情路由。
 */
const resolvePluginDetailPath = (item: Pick<FigmaListItem, 'id' | 'slug'>): string => {
  const slug = String(item.slug || '').trim();
  if (slug) return `/figma/${slug}`;
  return `/figma/${item.id}`;
};

/**
 * 解析插件图标地址（仅使用采集数据字段）。
 */
const resolvePluginIconUrl = (item: Pick<FigmaListItem, 'iconUrl' | 'coverUrl'>): string => {
  const iconUrl = String(item.iconUrl || '').trim();
  if (iconUrl) return getFullImageUrl(iconUrl);
  const coverUrl = String(item.coverUrl || '').trim();
  if (coverUrl) return getFullImageUrl(coverUrl);
  return '';
};

/**
 * 渲染详情页图标兜底（Figma 风格标识）。
 */
const renderFigmaFallbackIcon = (): React.ReactElement => {
  return (
    <span className="figma-detail-page__fallback-icon" aria-hidden="true">
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

const FigmaDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const { data: publicSettings } = usePublicSettings();
  const siteInfo = publicSettings?.siteInfo;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FigmaDetail | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const value = await getFigmaDetail(String(idOrSlug || '').trim());
        if (!value) {
          setDetail(null);
          setError('Figma 插件不存在或已下线');
          return;
        }
        setDetail(value);
      } catch (loadError) {
        setDetail(null);
        setError(resolveDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    run().catch(() => {
      setLoading(false);
      setError('Figma 插件详情加载失败，请稍后重试');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idOrSlug]);

  const contentHtml = useMemo(() => buildContentHtml(detail?.content || detail?.summary), [detail?.content, detail?.summary]);
  const detailIconUrl = useMemo(() => resolvePluginIconUrl(detail || {}), [detail]);

  const seoTitle = useMemo(() => {
    if (!detail) return 'Figma 插件详情';
    const seed = String(detail.seoTitle || detail.name || 'Figma 插件详情').trim();
    return `${seed}${siteInfo?.siteName ? ` - ${siteInfo.siteName}` : ''}`;
  }, [detail, siteInfo?.siteName]);

  const seoDescription = useMemo(() => {
    if (!detail) return 'Figma 插件详情页';
    return String(detail.seoDescription || detail.summary || 'Figma 插件详情').trim();
  }, [detail]);

  const seoKeywords = useMemo(() => {
    if (!detail) return 'Figma插件,Figma社区,设计工具';
    const tagKeywords = Array.isArray(detail.tags) ? detail.tags.map(item => item.name) : [];
    return String(
      detail.seoKeywords || [detail.name, 'Figma 插件', '设计效率工具', ...tagKeywords].filter(Boolean).join(',')
    );
  }, [detail]);

  const schemaBlocks = useMemo(() => {
    if (!detail) return [];
    const detailPath = resolvePluginDetailPath(detail);
    const absoluteUrl = `${window.location.origin}${detailPath}`;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: detail.name,
        description: seoDescription,
        url: absoluteUrl,
        inLanguage: 'zh-CN',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: `${window.location.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Figma 插件中心', item: `${window.location.origin}/figma` },
          { '@type': 'ListItem', position: 3, name: detail.name, item: absoluteUrl },
        ],
      },
    ];
  }, [detail, seoDescription]);

  const pageClassName = useMemo(() => {
    return [
      'figma-detail-page',
      `figma-detail-page--layout-${detailLayoutWidthMode}`,
    ].join(' ');
  }, [detailLayoutWidthMode]);

  return (
    <div className={pageClassName}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        url={window.location.href}
      />
      {schemaBlocks.map((item, index) => (
        <script
          key={`figma-detail-schema-${index + 1}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <div className="figma-detail-page__container">
        <nav className="figma-detail-page__breadcrumb" aria-label="面包屑导航">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/figma">Figma 插件中心</Link>
          {detail?.name ? (
            <>
              <span>/</span>
              <span>{detail.name}</span>
            </>
          ) : null}
        </nav>

        {loading ? <div className="figma-detail-page__state">正在加载 Figma 插件详情...</div> : null}
        {!loading && error ? (
          <div className="figma-detail-page__state figma-detail-page__state--error">
            <p>{error}</p>
            <Link to="/figma">返回 Figma 插件中心</Link>
          </div>
        ) : null}

        {!loading && !error && detail ? (
          <section className="figma-detail-page__layout">
            <main className="figma-detail-page__main">
              <header className="figma-detail-page__hero">
                <div className="figma-detail-page__hero-main">
                  <div className="figma-detail-page__icon-wrap">
                    {detailIconUrl ? (
                      <img src={detailIconUrl} alt={detail.name} loading="lazy" />
                    ) : (
                      renderFigmaFallbackIcon()
                    )}
                  </div>
                  <div className="figma-detail-page__hero-copy">
                    <h1>{detail.name}</h1>
                    <p>{detail.summary || '暂无简介'}</p>
                    <div className="figma-detail-page__meta">
                      {detail.categoryName ? <span>{detail.categoryName}</span> : null}
                      <span>收录时间：{formatDateLabel(detail.publishTime || detail.createTime)}</span>
                      <span>更新：{formatDateLabel(detail.updateTime || detail.publishTime)}</span>
                      <span>浏览：{formatCountLabel(detail.viewCount)}</span>
                      <span>使用：{formatCountLabel(detail.userCount)}</span>
                      <span>关注：{formatCountLabel(detail.likeCount)}</span>
                    </div>
                  </div>
                </div>

              </header>

              {detail.coverUrl ? (
                <section className="figma-detail-page__cover">
                  <img src={getFullImageUrl(detail.coverUrl)} alt={detail.name} loading="lazy" />
                </section>
              ) : null}

              <article className="figma-detail-page__content">
                <h2>插件介绍</h2>
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              </article>

              {Array.isArray(detail.related) && detail.related.length > 0 ? (
                <section className="figma-detail-page__related">
                  <div className="figma-detail-page__section-head">
                    <h3>相关推荐</h3>
                    <Link to="/figma">查看更多</Link>
                  </div>
                  <div className="figma-detail-page__related-grid">
                    {detail.related.slice(0, 6).map(item => {
                      const relatedIconUrl = resolvePluginIconUrl(item);
                      return (
                      <Link
                        key={`figma-related-${item.id}`}
                        to={resolvePluginDetailPath(item)}
                        className="figma-detail-page__related-card"
                      >
                        <div className="figma-detail-page__related-icon">
                          {relatedIconUrl ? (
                            <img src={relatedIconUrl} alt={item.name} loading="lazy" />
                          ) : (
                            renderFigmaFallbackIcon()
                          )}
                        </div>
                        <div className="figma-detail-page__related-copy">
                          <strong>{item.name}</strong>
                          <span>{item.categoryName || '未分类'}</span>
                        </div>
                      </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </main>

            <aside className="figma-detail-page__aside">
              <section className="figma-detail-page__panel">
                <h3>基础信息</h3>
                <ul>
                  <li>
                    <span>分类</span>
                    <strong>{detail.categoryName || '未分类'}</strong>
                  </li>
                  <li>
                    <span>插件标识</span>
                    <strong>{detail.slug || detail.figmaPluginId || detail.id}</strong>
                  </li>
                  <li>
                    <span>作者</span>
                    <strong>{detail.authorName || '社区作者'}</strong>
                  </li>
                </ul>
              </section>

              <section className="figma-detail-page__panel">
                <h3>标签</h3>
                {Array.isArray(detail.tags) && detail.tags.length > 0 ? (
                  <div className="figma-detail-page__tags">
                    {detail.tags.map(item => (
                      <Link key={`figma-detail-tag-${item.id}`} to={`/figma?tag=${item.slug}`}>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="figma-detail-page__empty">暂无标签</div>
                )}
              </section>
            </aside>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default FigmaDetailPage;
