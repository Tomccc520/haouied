/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 *
 * @file pages/MCP/detail.tsx
 * @description MCP 中心详情页
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import SEO from '../../components/SEO';
import WebsiteFavicon from '../../components/WebsiteFavicon';
import { useSiteInfo } from '../../hooks/useSiteInfo';
import useDetailLayoutWidthMode from '../../hooks/useDetailLayoutWidthMode';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { McpDetail, getMcpDetail } from '../../services/mcpService';
import { getFullImageUrl } from '../../utils/urlUtils';
import './detail.css';

/**
 * 格式化发布日期。
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
 * 格式化运行时展示文案。
 */
const formatRuntimeLabel = (runtime?: string): string => {
  const normalized = String(runtime || '').trim().toLowerCase();
  if (!normalized) return 'OTHER';
  return normalized.toUpperCase();
};

/**
 * 格式化协议展示文案。
 */
const formatTransportLabel = (transportType?: string): string => {
  const normalized = String(transportType || '').trim().toLowerCase();
  if (!normalized) return 'HTTP';
  if (normalized === 'stdio') return 'STDIO';
  if (normalized === 'sse') return 'SSE';
  return normalized.toUpperCase();
};

/**
 * 生成正文 HTML（支持纯文本换行）。
 */
const buildContentHtml = (content?: string): string => {
  const raw = String(content || '').trim();
  if (!raw) return '<p>暂无详细内容</p>';
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return `<p>${escaped.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
};

/**
 * 解析详情接口错误，返回更清晰的提示文案。
 */
const resolveDetailErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  const status = Number(axiosError?.response?.status || 0);
  const responseData = axiosError?.response?.data;
  const apiMessage = String(responseData?.error || responseData?.message || '').trim();
  if (status === 404) {
    return apiMessage || 'MCP 内容不存在或已下线';
  }
  if (status >= 500) {
    return apiMessage || 'MCP 详情服务暂时不可用，请稍后重试';
  }
  if (apiMessage) return apiMessage;
  return 'MCP 详情加载失败，请稍后重试';
};

/**
 * 生成来源链接列表，便于详情页展示“数据来源”。
 */
const buildSourceLinks = (detail: McpDetail | null) => {
  if (!detail) return [];
  const rows = [
    { key: 'official', label: '官网链接', url: String(detail.officialUrl || '').trim() },
    { key: 'docs', label: '文档链接', url: String(detail.docsUrl || '').trim() },
    { key: 'github', label: 'GitHub', url: String(detail.githubUrl || '').trim() },
  ];
  return rows.filter((item) => Boolean(item.url));
};

/**
 * 构建“快速接入”步骤，解决详情内容过短时的信息不足问题。
 */
const buildQuickStartSteps = (detail: McpDetail | null): string[] => {
  if (!detail) return [];
  const steps = [
    `确认 ${formatRuntimeLabel(detail.runtime)} 运行环境已安装并可执行。`,
    detail.docsUrl ? '优先查看官方文档，补齐鉴权、参数与环境变量配置。' : '准备服务地址、鉴权信息与调用参数。',
    `按 ${formatTransportLabel(detail.transportType)} 协议接入客户端并完成连通性验证。`,
  ];
  if (detail.githubUrl) {
    steps.push('可直接参考 GitHub 示例工程，先跑通 Demo 再接业务代码。');
  }
  if (detail.officialUrl) {
    steps.push('上线前建议用官网示例请求做一次冒烟检查。');
  }
  return Array.from(new Set(steps)).slice(0, 5);
};

/**
 * 基于标签与运行时推断常见使用场景。
 */
const buildSceneHints = (detail: McpDetail | null): string[] => {
  if (!detail) return [];
  const tagNames = Array.isArray(detail.tags)
    ? detail.tags.map(item => String(item?.name || '').trim()).filter(Boolean)
    : [];
  if (tagNames.length > 0) {
    return tagNames.slice(0, 4).map(name => `${name}相关业务场景`);
  }
  const runtime = String(detail.runtime || '').trim().toLowerCase();
  if (runtime === 'python') {
    return [ 'AI 工作流编排', '知识检索增强', '数据分析与自动化脚本' ];
  }
  if (runtime === 'node') {
    return [ '前端工具链扩展', '运营自动化处理', '接口聚合与中台编排' ];
  }
  if (runtime === 'go') {
    return [ '高并发服务扩展', '数据中转网关', '实时任务分发' ];
  }
  return [ '通用业务自动化', '第三方平台连接', '多工具协同编排' ];
};

/**
 * 构建能力概览字段，提升详情页可读性。
 */
const buildCapabilityRows = (detail: McpDetail | null): Array<{ label: string; value: string }> => {
  if (!detail) return [];
  return [
    { label: '传输协议', value: formatTransportLabel(detail.transportType) },
    { label: '运行时', value: formatRuntimeLabel(detail.runtime) },
    { label: '协议版本', value: String(detail.protocolVersion || '未标注').trim() || '未标注' },
    { label: '所属分类', value: String(detail.categoryName || '未分类').trim() || '未分类' },
    { label: '标签数量', value: `${Array.isArray(detail.tags) ? detail.tags.length : 0}` },
    { label: '最近更新', value: formatDateLabel(detail.updateTime || detail.publishTime || detail.createTime) },
  ];
};

/**
 * 构建 MCP 详情页“使用教程”步骤，强化可执行性。
 */
const buildUsageTutorialSteps = (detail: McpDetail | null): string[] => {
  if (!detail) return [];
  const runtime = formatRuntimeLabel(detail.runtime);
  const protocol = formatTransportLabel(detail.transportType);
  const detailPath = `/mcp/${detail.slug || detail.id}`;
  const steps = [
    `在后台 MCP 中心确认条目已发布，完善图标、摘要、分类与标签信息。`,
    `按照 ${runtime} 运行时准备服务环境，并确认 ${protocol} 协议可连通。`,
    detail.docsUrl
      ? `优先阅读官方文档并完成鉴权、参数和回调地址配置。`
      : '补齐鉴权参数、环境变量与请求示例后再接入业务端。',
    `上线后访问 ${detailPath} 做详情页可访问与内容核对。`,
    '发布后 24 小时内复查点击、浏览和外链可用性，持续迭代介绍内容。',
  ];
  return steps.slice(0, 5);
};

/**
 * 解析 MCP 详情图标对应的网址，用于后台 Favicon API 自动兜底。
 */
const resolveDetailIconWebsiteUrl = (detail: McpDetail | null): string => {
  if (!detail) return '';
  const candidates = [
    String(detail.officialUrl || '').trim(),
    String(detail.docsUrl || '').trim(),
    String(detail.githubUrl || '').trim(),
  ];
  return candidates.find(url => Boolean(url)) || '';
};

/**
 * 生成 MCP 接入命令，支持后台模板自定义。
 */
const buildAccessCommand = (detail: McpDetail | null, template: string): string => {
  if (!detail) return '';
  const transport = formatTransportLabel(detail.transportType).toLowerCase();
  const runtime = formatRuntimeLabel(detail.runtime).toLowerCase();
  const officialUrl = String(detail.officialUrl || '').trim();
  const docsUrl = String(detail.docsUrl || '').trim();
  const githubUrl = String(detail.githubUrl || '').trim();
  const targetUrl = officialUrl || docsUrl || githubUrl || '';
  const normalizedTemplate = String(template || '').trim();
  if (normalizedTemplate) {
    return normalizedTemplate
      .replaceAll('{transport}', transport || 'http')
      .replaceAll('{runtime}', runtime || 'other')
      .replaceAll('{official_url}', officialUrl)
      .replaceAll('{docs_url}', docsUrl)
      .replaceAll('{github_url}', githubUrl)
      .replaceAll('{slug}', String(detail.slug || detail.id || ''))
      .replaceAll('{name}', String(detail.name || ''));
  }
  if (targetUrl) {
    return `mcp connect --transport ${transport || 'http'} --runtime ${runtime || 'other'} --target "${targetUrl}"`;
  }
  return `mcp connect --transport ${transport || 'http'} --runtime ${runtime || 'other'} --target "${String(detail.slug || detail.id || '')}"`;
};

/**
 * 将评分值转换为星级字符串，便于详情头部快速展示。
 */
const buildRatingStars = (rating: number): string => {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  const full = Math.round(value);
  return `${'★'.repeat(full)}${'☆'.repeat(Math.max(0, 5 - full))}`;
};

const MCPDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const detailLayoutWidthMode = useDetailLayoutWidthMode();
  const { siteInfo } = useSiteInfo();
  const { data: publicSettings } = usePublicSettings();
  const mcpPageConfig = publicSettings?.mcpPage;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<McpDetail | null>(null);
  const [copyTip, setCopyTip] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMcpDetail(String(slug || ''));
        if (!data) {
          setDetail(null);
          setError('MCP 内容不存在或已下线');
          return;
        }
        setDetail(data);
      } catch (loadError) {
        setDetail(null);
        setError(resolveDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    run().catch(() => {
      setLoading(false);
      setError('MCP 详情加载失败，请稍后重试');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const seoTitle = useMemo(() => {
    if (!detail) return 'MCP 详情';
    const seed = String(detail.seoTitle || detail.name || 'MCP 详情').trim();
    return `${seed}${siteInfo?.siteName ? ` - ${siteInfo.siteName}` : ''}`;
  }, [detail, siteInfo?.siteName]);

  const seoDescription = useMemo(() => {
    if (!detail) return 'MCP 服务详情页';
    return String(detail.seoDescription || detail.summary || 'MCP 服务详情').trim();
  }, [detail]);

  const seoKeywords = useMemo(() => {
    if (!detail) return 'MCP,Model Context Protocol';
    const fromTags = Array.isArray(detail.tags) ? detail.tags.map((item) => item.name) : [];
    return String(
      detail.seoKeywords || [detail.name, 'MCP', 'Model Context Protocol', ...fromTags].filter(Boolean).join(',')
    );
  }, [detail]);

  const schemaBlocks = useMemo(() => {
    if (!detail) return [];
    const detailPath = `/mcp/${detail.slug || detail.id}`;
    const absoluteUrl = `https://hao.uied.cn${detailPath}`;
    const blocks: Record<string, any>[] = [
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
          {
            '@type': 'ListItem',
            position: 1,
            name: '首页',
            item: 'https://hao.uied.cn/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'MCP 中心',
            item: 'https://hao.uied.cn/mcp',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: detail.name,
            item: absoluteUrl,
          },
        ],
      },
    ];
    const faqSteps = buildQuickStartSteps(detail).slice(0, 3);
    if (faqSteps.length > 0) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqSteps.map((step, index) => ({
          '@type': 'Question',
          name: `如何接入 ${detail.name}（步骤 ${index + 1}）？`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: step,
          },
        })),
      });
    }
    return blocks;
  }, [detail, seoDescription]);

  const sourceLinks = useMemo(() => buildSourceLinks(detail), [detail]);
  const quickStartSteps = useMemo(() => buildQuickStartSteps(detail), [detail]);
  const usageTutorialSteps = useMemo(() => buildUsageTutorialSteps(detail), [detail]);
  const sceneHints = useMemo(() => buildSceneHints(detail), [detail]);
  const capabilityRows = useMemo(() => buildCapabilityRows(detail), [detail]);
  const isContentThin = useMemo(() => {
    const contentLength = String(detail?.content || '').trim().length;
    const summaryLength = String(detail?.summary || '').trim().length;
    return contentLength < 120 && summaryLength < 80;
  }, [detail]);
  const detailHeaderStyle = useMemo<'classic' | 'market'>(() => {
    return mcpPageConfig?.detailHeaderStyle === 'market' ? 'market' : 'classic';
  }, [mcpPageConfig?.detailHeaderStyle]);
  const detailShowRating = mcpPageConfig?.detailShowRating !== false;
  const detailRatingValue = useMemo(() => {
    const value = Number(mcpPageConfig?.detailRatingValue || 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  }, [mcpPageConfig?.detailRatingValue]);
  const detailShowCommand = mcpPageConfig?.detailShowCommand !== false;
  const detailShowVersionTag = mcpPageConfig?.detailShowVersionTag !== false;
  const accessCommand = useMemo(() => {
    return buildAccessCommand(detail, String(mcpPageConfig?.detailCommandTemplate || ''));
  }, [detail, mcpPageConfig?.detailCommandTemplate]);
  const ratingStars = useMemo(() => buildRatingStars(detailRatingValue), [detailRatingValue]);
  const protocolVersionLabel = useMemo(() => {
    return String(detail?.protocolVersion || 'v1').trim() || 'v1';
  }, [detail?.protocolVersion]);

  /**
   * 复制当前详情页链接，方便运营同学分发。
   */
  const handleCopyDetailLink = async () => {
    if (!detail) return;
    const link = `https://hao.uied.cn/mcp/${detail.slug || detail.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyTip('链接已复制');
      window.setTimeout(() => setCopyTip(''), 1800);
    } catch (copyError) {
      setCopyTip('复制失败，请手动复制地址栏');
      window.setTimeout(() => setCopyTip(''), 1800);
    }
  };

  /**
   * 复制接入命令，便于开发者快速粘贴使用。
   */
  const handleCopyAccessCommand = async () => {
    if (!accessCommand) return;
    try {
      await navigator.clipboard.writeText(accessCommand);
      setCopyTip('接入命令已复制');
      window.setTimeout(() => setCopyTip(''), 1800);
    } catch (copyError) {
      setCopyTip('命令复制失败，请手动复制');
      window.setTimeout(() => setCopyTip(''), 1800);
    }
  };

  if (loading) {
    return (
      <div className="mcp-detail-page">
        <div className="mcp-detail-page__container">
          <div className="mcp-detail-page__state">正在加载 MCP 详情...</div>
        </div>
      </div>
    );
  }

  if (!detail || error) {
    return (
      <div className="mcp-detail-page">
        <div className="mcp-detail-page__container">
          <div className="mcp-detail-page__state mcp-detail-page__state--error">{error || 'MCP 不存在'}</div>
          <div className="mcp-detail-page__state-action">
            <Link to="/mcp">返回 MCP 中心</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mcp-detail-page mcp-detail-page--header-${detailHeaderStyle} mcp-detail-page--layout-${detailLayoutWidthMode}`}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        type="article"
        url={`https://hao.uied.cn/mcp/${detail.slug || detail.id}`}
      />
      {schemaBlocks.map((block, index) => (
        <script
          key={`mcp-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      <div className="mcp-detail-page__container">
        <nav className="mcp-detail-page__breadcrumb">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/mcp">MCP 中心</Link>
          <span>/</span>
          <span>{detail.name}</span>
        </nav>

        <div className="mcp-detail-page__layout">
          <main className="mcp-detail-page__main">
            <header className="mcp-detail-page__hero">
              <div className="mcp-detail-page__hero-main">
                <WebsiteFavicon
                  websiteUrl={resolveDetailIconWebsiteUrl(detail)}
                  iconUrl={detail.iconUrl}
                  name={detail.name}
                  className="mcp-detail-page__icon"
                  size={64}
                  alt={`${detail.name} 图标`}
                />
                <div className="mcp-detail-page__hero-copy">
                  {detailHeaderStyle === 'market' ? (
                    <div className="mcp-detail-page__market-topline">
                      <span className="mcp-detail-page__market-pill mcp-detail-page__market-pill--version">
                        版本 {protocolVersionLabel}
                      </span>
                      {detailShowRating ? (
                        <span className="mcp-detail-page__market-pill mcp-detail-page__market-pill--rating">
                          评分 {detailRatingValue > 0 ? detailRatingValue.toFixed(1) : '暂无'}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <h1>{detail.name}</h1>
                  <p>{detail.summary || '暂无摘要信息'}</p>
                  <div className="mcp-detail-page__meta">
                    <span>协议：{formatTransportLabel(detail.transportType)}</span>
                    <span>运行时：{formatRuntimeLabel(detail.runtime)}</span>
                    <span>发布时间：{formatDateLabel(detail.publishTime)}</span>
                    <span>浏览：{Number(detail.viewCount || 0)}</span>
                    {detailShowVersionTag ? (
                      <span>版本：{protocolVersionLabel}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              {detailHeaderStyle === 'market' ? (
                <div className="mcp-detail-page__hero-side">
                  {detailShowRating ? (
                    <article className="mcp-detail-page__hero-stat">
                      <span className="mcp-detail-page__hero-stat-label">评分位</span>
                      <strong className="mcp-detail-page__hero-stat-value">
                        {detailRatingValue > 0 ? detailRatingValue.toFixed(1) : '暂无'}
                      </strong>
                      <span className="mcp-detail-page__hero-stat-stars">{ratingStars}</span>
                    </article>
                  ) : null}
                  <article className="mcp-detail-page__hero-stat">
                    <span className="mcp-detail-page__hero-stat-label">浏览热度</span>
                    <strong className="mcp-detail-page__hero-stat-value">{Number(detail.viewCount || 0)}</strong>
                    <span className="mcp-detail-page__hero-stat-desc">近7天持续更新</span>
                  </article>
                </div>
              ) : null}
              <div className="mcp-detail-page__hero-actions">
                {detail.officialUrl ? (
                  <a href={detail.officialUrl} target="_blank" rel="noopener noreferrer">访问官网</a>
                ) : null}
                {detail.docsUrl ? (
                  <a href={detail.docsUrl} target="_blank" rel="noopener noreferrer">文档地址</a>
                ) : null}
                {detail.githubUrl ? (
                  <a href={detail.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
                ) : null}
                <button type="button" onClick={handleCopyDetailLink}>复制链接</button>
              </div>
              {detailShowCommand ? (
                <div className="mcp-detail-page__hero-command">
                  <div className="mcp-detail-page__hero-command-head">
                    <span>接入命令</span>
                    <button type="button" onClick={handleCopyAccessCommand}>复制命令</button>
                  </div>
                  <code>{accessCommand || 'mcp connect --transport http --runtime other --target "<your-mcp-endpoint>"'}</code>
                </div>
              ) : null}
              {copyTip ? <div className="mcp-detail-page__copy-tip">{copyTip}</div> : null}
            </header>

            {detail.coverUrl ? (
              <section className="mcp-detail-page__cover">
                <img src={getFullImageUrl(detail.coverUrl)} alt={`${detail.name} 封面`} loading="lazy" />
              </section>
            ) : null}

            <section className="mcp-detail-page__intro">
              <h2>产品简介</h2>
              <p>{detail.summary || '该 MCP 条目暂未填写简介，可先参考下方使用教程与来源链接。'}</p>
              <div className="mcp-detail-page__intro-meta">
                <span>分类：{detail.categoryName || '未分类'}</span>
                <span>协议：{formatTransportLabel(detail.transportType)}</span>
                <span>运行时：{formatRuntimeLabel(detail.runtime)}</span>
              </div>
            </section>

            <section className="mcp-detail-page__content">
              <h2>详细说明</h2>
              <div
                className="mcp-detail-page__content-html"
                dangerouslySetInnerHTML={{ __html: buildContentHtml(detail.content) }}
              />
              {isContentThin ? (
                <div className="mcp-detail-page__content-tip">
                  当前条目正文较精简，可结合下方接入建议与右侧来源链接快速完成落地。
                </div>
              ) : null}
            </section>

            <section className="mcp-detail-page__guide-section">
              <h2>使用教程</h2>
              <ol className="mcp-detail-page__guide-steps">
                {usageTutorialSteps.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ol>
            </section>

            <section className="mcp-detail-page__insight-grid">
              <article className="mcp-detail-page__insight-card">
                <h3>快速接入</h3>
                <ol>
                  {quickStartSteps.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ol>
              </article>
              <article className="mcp-detail-page__insight-card">
                <h3>适用场景</h3>
                <ul>
                  {sceneHints.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="mcp-detail-page__insight-card">
                <h3>能力概览</h3>
                <ul className="mcp-detail-page__fact-list">
                  {capabilityRows.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="mcp-detail-page__tags">
              <h3>标签</h3>
              <div className="mcp-detail-page__tag-list">
                {(Array.isArray(detail.tags) ? detail.tags : []).length > 0
                  ? detail.tags.map((item) => (
                    <Link key={item.id} to={`/mcp?tag=${encodeURIComponent(item.slug)}`}>#{item.name}</Link>
                  ))
                  : <span className="mcp-detail-page__tag-empty">暂无标签</span>}
              </div>
            </section>
          </main>

          <aside className="mcp-detail-page__aside">
            <section className="mcp-detail-page__side-card">
              <h3>基础信息</h3>
              <ul className="mcp-detail-page__side-list">
                <li>
                  <span>分类</span>
                  <strong>{detail.categoryName || '未分类'}</strong>
                </li>
                <li>
                  <span>协议</span>
                  <strong>{formatTransportLabel(detail.transportType)}</strong>
                </li>
                <li>
                  <span>运行时</span>
                  <strong>{formatRuntimeLabel(detail.runtime)}</strong>
                </li>
                <li>
                  <span>发布时间</span>
                  <strong>{formatDateLabel(detail.publishTime)}</strong>
                </li>
                <li>
                  <span>浏览量</span>
                  <strong>{Number(detail.viewCount || 0)}</strong>
                </li>
              </ul>
            </section>

            <section className="mcp-detail-page__side-card">
              <h3>来源链接</h3>
              {sourceLinks.length > 0 ? (
                <div className="mcp-detail-page__source-list">
                  {sourceLinks.map((item) => (
                    <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mcp-detail-page__source-empty">暂无来源链接</div>
              )}
            </section>

            {(Array.isArray(detail.related) ? detail.related : []).length > 0 && (
              <section className="mcp-detail-page__side-card">
                <h3>相关推荐</h3>
                <div className="mcp-detail-page__related-grid">
                  {detail.related.map((item) => (
                    <article className="mcp-detail-page__related-item" key={item.id}>
                      <h4>
                        <Link to={`/mcp/${item.slug || item.id}`}>{item.name}</Link>
                      </h4>
                      <p>{item.summary || '暂无摘要'}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MCPDetailPage;
