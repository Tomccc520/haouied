/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file pages/Articles/ArticleDetail.tsx
 * @description 文章详情页组件 - 沉浸式阅读设计
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import {
  getArticleDetail,
  getArticles,
  getArticleInteractionStat,
  recordArticleView,
  toggleArticleLikeWithDetail,
} from '../../services/articleService';
import { ArticleDetail as ArticleDetailType, ArticleListItem } from '../../types/article';
import api from '../../services/api';
import { unwrapApiResponse } from '../../utils/apiResponse';
import { getFullImageUrl } from '../../utils/urlUtils';
import SEO from '../../components/SEO';
import { useLicense, FEATURES } from '../../hooks/useLicense';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import ArticleCard from './ArticleCard';
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
 * 从文章 HTML 正文中提取图片地址列表。
 */
const extractImageUrlsFromHtml = (html: string): string[] => {
  const content = String(html || '');
  if (!content) return [];
  const matches: string[] = [];
  const regex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let result = regex.exec(content);
  while (result) {
    const src = String(result[1] || '').trim();
    if (src) matches.push(src);
    result = regex.exec(content);
  }
  return matches;
};

/**
 * 归一化图片地址（仅保留 origin + path），用于灯箱索引匹配。
 */
const normalizeImageCompareUrl = (value: string): string => {
  const text = String(value || '').trim();
  if (!text) return '';
  const fullUrl = getFullImageUrl(text) || text;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const url = new URL(fullUrl, base);
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return fullUrl.split('?')[0].split('#')[0];
  }
};

/**
 * 从 HTML 中提取纯文本，供阅读时长估算使用。
 */
const extractPlainTextFromHtml = (html: string): string => {
  const source = String(html || '').trim();
  if (!source) return '';
  if (typeof window === 'undefined') {
    return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/html');
    return String(doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch (error) {
    return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

/**
 * 估算阅读时长：
 * - 中文按约 520 字/分钟
 * - 非中文按约 220 词/分钟
 */
const estimateArticleReadingMinutes = (html: string): number => {
  const text = extractPlainTextFromHtml(html);
  if (!text) return 1;
  const cjkMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
  const cjkCount = cjkMatches.length;
  const latinWords = text
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const cjkMinutes = cjkCount / 520;
  const latinMinutes = latinWords / 220;
  return Math.max(1, Math.ceil(cjkMinutes + latinMinutes));
};

interface DetailActionRailIconProps {
  className?: string;
}

/**
 * 文章详情操作栏：评论图标
 */
const DetailRailCommentIcon: React.FC<DetailActionRailIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 文章详情操作栏：点赞图标
 */
const DetailRailLikeIcon: React.FC<DetailActionRailIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7 10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10V5.8c0-1-.8-1.8-1.8-1.8a2 2 0 0 0-1.8 1.1L9 10H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h9.2a2 2 0 0 0 1.9-1.4L18 12.5a2 2 0 0 0-1.9-2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 文章详情操作栏：热度图标
 */
const DetailRailTrendingIcon: React.FC<DetailActionRailIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M3 17l6-6 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 7h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 文章详情操作栏：关联网址图标
 */
const DetailRailLinkIcon: React.FC<DetailActionRailIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 规范化文章详情宽度模式，兼容后台配置异常值
 */
const normalizeArticleDetailLayoutWidthMode = (mode: unknown): 'contained' | 'wide' | 'fluid' => {
  const value = String(mode || '').trim();
  if (value === 'wide' || value === 'fluid') return value;
  return 'contained';
};

/**
 * 规范化文章详情标题区对齐方式。
 */
const normalizeArticleDetailHeaderAlign = (align: unknown): 'center' | 'left' => {
  return String(align || '').trim() === 'left' ? 'left' : 'center';
};

/**
 * 规范化文章正文最大宽度，避免配置异常导致页面溢出
 */
const normalizeArticleDetailMaxWidth = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 980;
  return Math.max(720, Math.min(1320, parsed));
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

type ArticleRecommendItem = ArticleListItem;

interface ArticleTocItem {
  id: string;
  text: string;
  level: 2 | 3;
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
  { key: 'intro', label: '正文' },
  { key: 'info', label: '文章信息' },
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

interface ArticleActionFeedbackState {
  text: string;
  type: 'success' | 'error';
}

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
  const [recommendArticles, setRecommendArticles] = useState<ArticleRecommendItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [previousArticle, setPreviousArticle] = useState<ArticleRecommendItem | null>(null);
  const [nextArticle, setNextArticle] = useState<ArticleRecommendItem | null>(null);
  const [activeTocId, setActiveTocId] = useState('');
  const [activeTab, setActiveTab] = useState<ArticleDetailTabKey>('intro');
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ArticleActionFeedbackState | null>(null);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [imageLightboxIndex, setImageLightboxIndex] = useState(0);
  const commentsRef = useRef<HTMLElement | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const articleLikeCountRaw = Number((article as any)?.likeCount || 0);

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
   * 文章切换时重置标签页，并按详情接口初始化点赞状态。
   */
  useEffect(() => {
    setActiveTab('intro');
    if (!article?.id) {
      setLikeCount(0);
      setIsLiked(false);
      return;
    }
    if (Number.isFinite(articleLikeCountRaw) && articleLikeCountRaw >= 0) {
      setLikeCount(articleLikeCountRaw);
    } else {
      setLikeCount(0);
    }
    setIsLiked(false);
  }, [article?.id, articleLikeCountRaw]);

  /**
   * 读取真实互动状态（点赞总数 + 当前用户点赞态），避免仅凭详情默认值展示。
   */
  useEffect(() => {
    if (!article?.id) return;
    let cancelled = false;
    const fetchInteraction = async () => {
      try {
        const stat = await getArticleInteractionStat(article.id);
        if (cancelled) return;
        setLikeCount(Math.max(0, Number(stat.likeCount || 0)));
        setIsLiked(stat.isLike === true);
      } catch (error) {
        if (cancelled) return;
      }
    };
    fetchInteraction();
    return () => {
      cancelled = true;
    };
  }, [article?.id]);

  /**
   * 清理轻提示计时器，避免组件卸载后状态更新。
   */
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, []);

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
   * 展示文章交互轻提示，统一点赞等操作反馈。
   */
  const showActionFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ text, type });
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setActionFeedback(null);
      feedbackTimerRef.current = null;
    }, 1800);
  };

  /**
   * 滚动到评论区，提升互动效率。
   */
  const handleFocusComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * 点赞切换：调用后端接口并回写最新点赞数。
   */
  const handleToggleLike = async () => {
    if (!article?.id || isLikeSubmitting) return;
    try {
      setIsLikeSubmitting(true);
      const result = await toggleArticleLikeWithDetail(article.id);
      setLikeCount(Math.max(0, Number(result.likeCount || 0)));
      setIsLiked(result.liked === true);
      showActionFeedback(result.liked ? '已点赞' : '已取消点赞');
    } catch (toggleError) {
      const axiosError = toggleError as AxiosError<{ message?: string }>;
      const message = String(
        axiosError.response?.data?.message
        || (toggleError as any)?.message
        || ''
      ).trim();
      const rawCode = Number(
        (axiosError.response?.data as any)?.code
        ?? (toggleError as any)?.code
        ?? 0
      );
      const needLogin = rawCode === 1001 || /未登录|登录|请先登录/i.test(message);
      if (needLogin) {
        showActionFeedback('请先登录后再点赞', 'error');
        window.dispatchEvent(
          new CustomEvent('uied:open-auth-modal', {
            detail: { mode: 'login' },
          })
        );
      } else {
        showActionFeedback(message || '点赞失败，请稍后重试', 'error');
      }
    } finally {
      setIsLikeSubmitting(false);
    }
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
  const detailVisualStyle = [ 'editorial', 'product' ].includes(String(articleSetting?.detailVisualStyle || '').trim())
    ? (String(articleSetting?.detailVisualStyle || '').trim() as 'editorial' | 'product')
    : 'editorial';
  const detailActionRailStyle = [ 'rail', 'toolbar' ].includes(String(articleSetting?.detailActionRailStyle || '').trim())
    ? (String(articleSetting?.detailActionRailStyle || '').trim() as 'rail' | 'toolbar')
    : 'rail';
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
  /**
   * 预处理正文：为 h2/h3 注入稳定锚点，并生成文章目录。
   */
  const { normalizedContentHtml, articleToc } = useMemo(() => {
    const raw = String(article?.content || '');
    if (!raw) {
      return {
        normalizedContentHtml: '',
        articleToc: [] as ArticleTocItem[],
      };
    }
    if (typeof window === 'undefined') {
      return {
        normalizedContentHtml: raw,
        articleToc: [] as ArticleTocItem[],
      };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="article-root">${raw}</div>`, 'text/html');
    const root = doc.querySelector('#article-root');
    if (!root) {
      return {
        normalizedContentHtml: raw,
        articleToc: [] as ArticleTocItem[],
      };
    }
    const headingRows = Array.from(root.querySelectorAll('h2, h3'));
    const tocRows: ArticleTocItem[] = [];
    let fallbackIndex = 1;
    headingRows.forEach((heading) => {
      const text = String(heading.textContent || '').trim();
      if (!text) return;
      const headingLevel = heading.tagName === 'H3' ? 3 : 2;
      const baseId = String(heading.getAttribute('id') || '').trim();
      const nextId = baseId || `article-toc-${fallbackIndex++}`;
      heading.setAttribute('id', nextId);
      tocRows.push({
        id: nextId,
        text,
        level: headingLevel,
      });
    });
    return {
      normalizedContentHtml: root.innerHTML,
      articleToc: tocRows.slice(0, 80),
    };
  }, [article?.content]);
  const readingMinutes = useMemo(
    () => estimateArticleReadingMinutes(String(article?.content || '')),
    [article?.content]
  );
  /**
   * 文章图集：封面图 + 正文图片（去重后用于幻灯片展示）。
   */
  const articleGalleryImages = useMemo(() => {
    if (!article) return [];
    const rows: string[] = [];
    if (article.coverImage) {
      rows.push(getFullImageUrl(article.coverImage));
    }
    extractImageUrlsFromHtml(String(article.content || '')).forEach((url) => {
      rows.push(getFullImageUrl(url));
    });
    return Array.from(
      new Set(rows.map((item) => String(item || '').trim()).filter(Boolean))
    );
  }, [article]);
  const articleGalleryComparableUrls = useMemo(
    () => articleGalleryImages.map((item) => normalizeImageCompareUrl(item)),
    [articleGalleryImages]
  );
  /**
   * 生成文章图片灯箱数据，统一正文图与封面图的预览描述。
   */
  const articleGallerySlides = useMemo(
    () => articleGalleryImages.map((src, index) => ({
      src,
      alt: `${article?.title || '文章'} 图片 ${index + 1}`,
    })),
    [article?.title, articleGalleryImages]
  );
  const latestArticlesModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'latest_articles');
  const hotWebsitesModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'hot_websites');
  const articleTagsModuleEnabled = isArticleSidebarModuleEnabled(detailSidebarModules, 'article_tags');
  const shouldRenderSidebar = detailSidebarEnabled && (
    latestArticlesModuleEnabled
    || hotWebsitesModuleEnabled
    || articleTagsModuleEnabled
  );

  /**
   * 文章目录滚动高亮：根据当前视口位置自动切换目录激活项。
   */
  useEffect(() => {
    if (!articleToc.length) {
      setActiveTocId('');
      return;
    }
    const resolveActiveToc = () => {
      let currentId = articleToc[0]?.id || '';
      const triggerOffset = 132;
      for (const item of articleToc) {
        const heading = document.getElementById(item.id);
        if (!heading) continue;
        if (heading.getBoundingClientRect().top - triggerOffset <= 0) {
          currentId = item.id;
          continue;
        }
        break;
      }
      const reachedBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6;
      if (reachedBottom) {
        currentId = articleToc[articleToc.length - 1]?.id || currentId;
      }
      setActiveTocId((prev) => (prev === currentId ? prev : currentId));
    };
    resolveActiveToc();
    window.addEventListener('scroll', resolveActiveToc, { passive: true });
    window.addEventListener('resize', resolveActiveToc);
    return () => {
      window.removeEventListener('scroll', resolveActiveToc);
      window.removeEventListener('resize', resolveActiveToc);
    };
  }, [articleToc]);

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

  /**
   * 拉取“上一篇/下一篇 + 相关推荐”数据。
   */
  useEffect(() => {
    const fetchRecommendArticles = async () => {
      if (!article?.id) {
        setRecommendArticles([]);
        setPreviousArticle(null);
        setNextArticle(null);
        return;
      }
      try {
        setRecommendLoading(true);
        const [categoryResult, latestResult] = await Promise.all([
          getArticles({
            page: 1,
            pageSize: 36,
            category: article.category,
          }),
          getArticles({
            page: 1,
            pageSize: 20,
          }),
        ]);
        const categoryRows = Array.isArray(categoryResult?.data) ? categoryResult.data : [];
        const mergedRows = [
          ...categoryRows,
          ...(Array.isArray(latestResult?.data) ? latestResult.data : []),
        ];
        const currentTagSet = new Set(
          (Array.isArray(article.tags) ? article.tags : [])
            .map((tag) => String(tag?.slug || tag?.name || '').trim().toLowerCase())
            .filter(Boolean)
        );
        const calcTagMatchedCount = (item: any): number => {
          const tags = Array.isArray(item?.tags) ? item.tags : [];
          if (!tags.length || !currentTagSet.size) return 0;
          return tags.reduce((count: number, tag: any) => {
            const key = String(tag?.slug || tag?.name || '').trim().toLowerCase();
            if (!key) return count;
            return currentTagSet.has(key) ? count + 1 : count;
          }, 0);
        };
        const uniqueMap = new Map<string, ArticleRecommendItem>();
        mergedRows.forEach((item) => {
          const id = Number(item?.id || 0);
          if (!id) return;
          const mapKey = String(id);
          if (uniqueMap.has(mapKey)) return;
          uniqueMap.set(mapKey, {
            id,
            slug: String(item?.slug || id),
            title: String(item?.title || ''),
            excerpt: String(item?.excerpt || ''),
            coverImage: String(item?.coverImage || ''),
            author: String(item?.author || 'UIED'),
            publishedAt: Number.isFinite(Number(item?.publishedAt)) ? Number(item?.publishedAt) : null,
            createdAt: Number.isFinite(Number(item?.createdAt)) ? Number(item?.createdAt) : null,
            updatedAt: Number.isFinite(Number(item?.updatedAt)) ? Number(item?.updatedAt) : null,
            viewCount: Number(item?.viewCount || 0),
            category: String(item?.category || ''),
            tags: Array.isArray(item?.tags) ? item.tags : [],
          });
        });
        const normalized = Array.from(uniqueMap.values())
          .map((item) => {
            const source = mergedRows.find((row: any) => Number(row?.id || 0) === item.id);
            const publishedAt = Number(item.publishedAt || 0);
            const score = (
              (item.category === article.category ? 1000 : 0)
              + calcTagMatchedCount(source) * 120
              + Math.min(90, Math.floor(publishedAt / 86400))
            );
            return {
              ...item,
              _score: score,
            };
          })
          .sort((a, b) => {
            if (b._score !== a._score) return b._score - a._score;
            return Number(b.publishedAt || 0) - Number(a.publishedAt || 0);
          });
        const categorySequence = categoryRows
          .map((item) => ({
            id: Number(item?.id || 0),
            slug: String(item?.slug || item?.id || ''),
            title: String(item?.title || ''),
            excerpt: String(item?.excerpt || ''),
            coverImage: String(item?.coverImage || ''),
            author: String(item?.author || 'UIED'),
            publishedAt: Number.isFinite(Number(item?.publishedAt)) ? Number(item?.publishedAt) : null,
            createdAt: Number.isFinite(Number(item?.createdAt)) ? Number(item?.createdAt) : null,
            updatedAt: Number.isFinite(Number(item?.updatedAt)) ? Number(item?.updatedAt) : null,
            viewCount: Number(item?.viewCount || 0),
            category: String(item?.category || ''),
            tags: Array.isArray(item?.tags) ? item.tags : [],
          }))
          .filter((item) => item.id > 0);
        const currentIndex = categorySequence.findIndex((item) => String(item.id) === String(article.id));
        const prev = currentIndex > 0 ? categorySequence[currentIndex - 1] : null;
        const next = currentIndex >= 0 && currentIndex < categorySequence.length - 1 ? categorySequence[currentIndex + 1] : null;
        setPreviousArticle(prev && prev.id !== article.id ? prev : null);
        setNextArticle(next && next.id !== article.id ? next : null);
        setRecommendArticles(
          normalized
            .filter((item) => String(item.id) !== String(article.id))
            .map(({ _score, ...rest }) => rest)
            .slice(0, 4)
        );
      } catch (fetchError) {
        setRecommendArticles([]);
        setPreviousArticle(null);
        setNextArticle(null);
      } finally {
        setRecommendLoading(false);
      }
    };
    fetchRecommendArticles();
  }, [article?.id, article?.category, article?.tags]);

  /**
   * 切换文章时关闭灯箱并重置索引，避免旧状态串场。
   */
  useEffect(() => {
    setImageLightboxOpen(false);
    setImageLightboxIndex(0);
  }, [article?.id]);

  /**
   * 根据点击图片定位灯箱索引并打开预览。
   */
  const openImageLightboxByUrl = (imageUrl: string) => {
    if (articleGalleryImages.length === 0) return;
    const normalized = normalizeImageCompareUrl(imageUrl);
    let matchedIndex = articleGalleryComparableUrls.findIndex((item) => item === normalized);
    if (matchedIndex < 0) {
      matchedIndex = articleGalleryImages.findIndex((item) => item === getFullImageUrl(imageUrl));
    }
    setImageLightboxIndex(matchedIndex >= 0 ? matchedIndex : 0);
    setImageLightboxOpen(true);
  };

  /**
   * 正文图片点击委托：仅拦截 img 点击，其他内容保持默认交互。
   */
  const handleArticleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const imageElement = target.closest('img');
    if (!(imageElement instanceof HTMLImageElement)) return;
    const src = String(
      imageElement.getAttribute('src')
      || imageElement.currentSrc
      || imageElement.src
      || ''
    ).trim();
    if (!src) return;
    event.preventDefault();
    openImageLightboxByUrl(src);
  };

  /**
   * 点击文章目录后滚动到对应标题，预留顶部空间避免被导航遮挡。
   */
  const handleTocNavigate = (headingId: string) => {
    const target = document.getElementById(String(headingId || '').trim());
    if (!target) return;
    setActiveTocId(String(headingId || '').trim());
    const topOffset = 96;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  };

  if (loading) return <div className="detail-loading"><div className="spinner" /></div>;
  
  if (error || !article) {
    return (
      <div className="detail-error">
        <h2>{error || '文章不存在'}</h2>
        <button onClick={() => navigate('/articles')} className="back-btn">返回文章列表</button>
      </div>
    );
  }

  /**
   * 渲染文章详情侧栏模块（按后台排序与启用状态输出）
   */
  const renderSidebarModules = () => {
    return detailSidebarModules.filter(module => module.enabled).map(module => {
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
    });
  };

  return (
    <article
      className={`article-detail-page article-detail-page--layout-${detailLayoutWidthMode} article-detail-page--header-${detailHeaderAlign} article-detail-page--visual-${detailVisualStyle} article-detail-page--rail-${detailActionRailStyle} ${shouldRenderSidebar ? 'article-detail-page--has-sidebar' : ''}`}
      style={{ '--article-detail-max-width': `${detailMaxWidth}px` } as React.CSSProperties}
    >
      <div className="detail-reading-progress" aria-hidden="true">
        <div
          className="detail-reading-progress__bar"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      {actionFeedback && (
        <div className={`detail-action-feedback is-${actionFeedback.type}`} role="status" aria-live="polite">
          {actionFeedback.text}
        </div>
      )}
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
            <span className="detail-meta-divider" aria-hidden="true">·</span>
            <span className="detail-meta-pill">{readingMinutes} 分钟阅读</span>
            {article.updatedAt ? (
              <>
                <span className="detail-meta-divider" aria-hidden="true">·</span>
                <span className="detail-meta-pill">更新于 {formatDate(article.updatedAt)}</span>
              </>
            ) : null}
          </div>

          <h1 className="detail-title">{article.title}</h1>
          {article.excerpt && (
            <p className="detail-subtitle">{article.excerpt}</p>
          )}
        </header>

        <div className={`article-detail-layout ${shouldRenderSidebar ? 'article-detail-layout--with-sidebar' : ''}`}>
          <div className="article-detail-main">
            <section className="detail-product-layout">
              <aside className="detail-left-rail">
                <div className="detail-left-rail__inner">
                  <div className="detail-action-rail">
                    <button
                      type="button"
                      className="detail-action-pill"
                      onClick={handleFocusComments}
                      data-tip="查看评论"
                      aria-label="查看评论"
                    >
                      <span className="detail-action-pill__glyph" aria-hidden="true">
                        <DetailRailCommentIcon className="detail-action-pill__icon" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`detail-action-pill detail-action-pill--like ${isLiked ? 'is-active' : ''}`}
                      onClick={handleToggleLike}
                      data-tip={`${isLiked ? '已点赞' : '点赞'} ${Math.max(0, likeCount)}`}
                      aria-label={`${isLiked ? '取消点赞' : '点赞'}，当前 ${Math.max(0, likeCount)} 人点赞`}
                      disabled={isLikeSubmitting}
                    >
                      <span className="detail-action-pill__glyph" aria-hidden="true">
                        <DetailRailLikeIcon className="detail-action-pill__icon" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="detail-action-pill detail-action-pill--hot"
                      data-tip={`阅读 ${article.viewCount}`}
                      aria-label={`阅读 ${article.viewCount}`}
                    >
                      <span className="detail-action-pill__glyph" aria-hidden="true">
                        <DetailRailTrendingIcon className="detail-action-pill__icon" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="detail-action-pill"
                      onClick={() => setActiveTab('related')}
                      data-tip={`关联网址 ${relatedWebsites.length}`}
                      aria-label={`关联网址 ${relatedWebsites.length}`}
                    >
                      <span className="detail-action-pill__glyph" aria-hidden="true">
                        <DetailRailLinkIcon className="detail-action-pill__icon" />
                      </span>
                    </button>
                  </div>
                  {articleToc.length > 0 && activeTab === 'intro' && (
                    <nav className="detail-left-toc" aria-label="文章目录">
                      <div className="detail-left-toc__header">
                        <span className="detail-left-toc__eyebrow">目录</span>
                      </div>
                      <div className="detail-left-toc__list">
                        {articleToc.map((item) => (
                          <button
                            key={`left-toc-${item.id}`}
                            type="button"
                            className={`detail-left-toc__item level-${item.level} ${activeTocId === item.id ? 'is-active' : ''}`}
                            onClick={() => handleTocNavigate(item.id)}
                            title={item.text}
                            data-tip={item.text}
                            aria-label={`跳转到：${item.text}`}
                          >
                            <span className="detail-left-toc__bar" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </nav>
                  )}
                </div>
              </aside>

              <div className="detail-product-main">
                <div className="detail-content-meta">
                  <div className="author-info">
                    <div className="author-avatar">
                      {article.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-text">
                      <span className="author-name">{article.author}</span>
                      <span className="read-count">{article.viewCount} 次阅读</span>
                    </div>
                  </div>
                  <div className="detail-content-meta__actions">
                    <button type="button" className="detail-header-action" onClick={() => navigate('/articles')}>
                      返回列表
                    </button>
                  </div>
                </div>

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
                    <article className="detail-reading-shell">
                      {articleToc.length > 0 && (
                        <nav
                          className="detail-inline-toc detail-inline-toc--mobile-only"
                          aria-label="文章目录"
                        >
                          <div className="detail-inline-toc__header">
                            <span className="detail-inline-toc__eyebrow">目录</span>
                            <span className="detail-inline-toc__count">{articleToc.length} 节</span>
                          </div>
                          <div className="detail-inline-toc__list">
                            {articleToc.map((item) => (
                              <button
                                key={`inline-toc-${item.id}`}
                                type="button"
                                className={`detail-inline-toc__item level-${item.level} ${activeTocId === item.id ? 'is-active' : ''}`}
                                onClick={() => handleTocNavigate(item.id)}
                                title={item.text}
                              >
                                {item.text}
                              </button>
                            ))}
                          </div>
                        </nav>
                      )}
                      {article.coverImage && (
                        <figure className="detail-cover">
                          <img src={getFullImageUrl(article.coverImage)} alt={article.title} loading="lazy" />
                        </figure>
                      )}
                      {/* 正文区域 */}
                      <div className="detail-content-wrapper">
                        <div
                          className="detail-content detail-content--interactive typography"
                          onClick={handleArticleContentClick}
                          dangerouslySetInnerHTML={{ __html: normalizedContentHtml || article.content }}
                        />
                      </div>
                    </article>
                  )}

                  {activeTab === 'info' && (
                    <div className="detail-editorial-panel">
                      <section className="detail-editorial-section">
                        <span className="detail-editorial-section__label">文章概览</span>
                        <p className="detail-editorial-summary">{article.excerpt || '暂无摘要'}</p>
                      </section>

                      <section className="detail-editorial-section">
                        <span className="detail-editorial-section__label">基础信息</span>
                        <dl className="detail-editorial-facts">
                          <div className="detail-editorial-fact">
                            <dt>所属分类</dt>
                            <dd>{article.category || '-'}</dd>
                          </div>
                          <div className="detail-editorial-fact">
                            <dt>作者</dt>
                            <dd>{article.author || '-'}</dd>
                          </div>
                          <div className="detail-editorial-fact">
                            <dt>发布时间</dt>
                            <dd>{formatDate(article.publishedAt) || '-'}</dd>
                          </div>
                          <div className="detail-editorial-fact">
                            <dt>阅读热度</dt>
                            <dd>{article.viewCount}</dd>
                          </div>
                        </dl>
                      </section>

                      {article.tags.length > 0 && (
                        <section className="detail-editorial-section">
                          <span className="detail-editorial-section__label">文章标签</span>
                          <div className="detail-tags detail-tags--editorial">
                            {article.tags.map(tag => (
                              <Link key={tag.id} to={`/articles?tag=${tag.slug}`} className="tag-chip">
                                # {tag.name}
                              </Link>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}

                  {activeTab === 'related' && (
                    <div className="detail-editorial-panel">
                      <section className="detail-editorial-section">
                        <span className="detail-editorial-section__label">关联网址</span>
                        <p className="detail-editorial-lead">文中提到的工具与站点，建议按需继续延伸查看。</p>
                        {relatedWebsites.length > 0 ? (
                          <div className="detail-editorial-link-list">
                            {relatedWebsites.map(site => (
                              <a
                                key={`related-${site.id}`}
                                href={site.url || `/website/${site.slug || site.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="detail-editorial-link"
                              >
                                <div className="detail-editorial-link__title">{site.name}</div>
                                <div className="detail-editorial-link__desc">{site.description || site.url}</div>
                                <div className="detail-editorial-link__meta">{site.url || `查看 ${site.name}`}</div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="article-sidebar-empty">暂无关联网址</div>
                        )}
                      </section>
                    </div>
                  )}

                  {activeTab === 'faq' && (
                    <div className="detail-editorial-panel">
                      <section className="detail-editorial-section">
                        <span className="detail-editorial-section__label">常见问题</span>
                        <div className="detail-editorial-faq-list">
                          {faqList.map((item, index) => (
                            <article key={`faq-${index}`} className="detail-editorial-faq-item">
                              <span className="detail-editorial-faq-item__index">{String(index + 1).padStart(2, '0')}</span>
                              <div className="detail-editorial-faq-item__body">
                                <h4>{item.question}</h4>
                                <p>{item.answer}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
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

            <section className="detail-next-prev">
              <h3 className="detail-next-prev__title">继续阅读</h3>
              <div className="detail-next-prev__grid">
                <div className={`detail-next-prev__item ${!previousArticle ? 'is-disabled' : ''}`}>
                  <span className="detail-next-prev__label">上一篇</span>
                  {previousArticle ? (
                    <Link to={`/article/${previousArticle.slug || previousArticle.id}`} className="detail-next-prev__link">
                      {previousArticle.title}
                    </Link>
                  ) : (
                    <span className="detail-next-prev__empty">暂无</span>
                  )}
                </div>
                <div className={`detail-next-prev__item ${!nextArticle ? 'is-disabled' : ''}`}>
                  <span className="detail-next-prev__label">下一篇</span>
                  {nextArticle ? (
                    <Link to={`/article/${nextArticle.slug || nextArticle.id}`} className="detail-next-prev__link">
                      {nextArticle.title}
                    </Link>
                  ) : (
                    <span className="detail-next-prev__empty">暂无</span>
                  )}
                </div>
              </div>
            </section>

            <section className="detail-recommend-articles">
              <h3 className="detail-recommend-articles__title">相关推荐</h3>
              {recommendLoading ? (
                <div className="detail-recommend-articles__empty">加载中...</div>
              ) : recommendArticles.length > 0 ? (
                <div className="detail-recommend-articles__grid">
                  {recommendArticles.map((item) => (
                    <div key={`recommend-${item.id}`} className="detail-recommend-articles__item">
                      <ArticleCard article={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="detail-recommend-articles__empty">暂无推荐文章</div>
              )}
            </section>
          </div>
          {shouldRenderSidebar && (
            <aside
              className={`article-detail-sidebar ${detailSidebarSticky ? 'is-sticky' : ''}`}
              style={detailSidebarSticky ? { top: `calc(var(--header-height) + ${detailSidebarTopOffset}px)` } : undefined}
            >
              {renderSidebarModules()}
            </aside>
          )}
        </div>
      </div>
      <Lightbox
        open={imageLightboxOpen}
        close={() => setImageLightboxOpen(false)}
        slides={articleGallerySlides}
        index={imageLightboxIndex}
        plugins={[Zoom]}
        carousel={{ finite: articleGallerySlides.length <= 1 }}
        zoom={{
          maxZoomPixelRatio: 2.5,
          zoomInMultiplier: 1.8,
          scrollToZoom: true,
        }}
        on={{
          view: ({ index }) => setImageLightboxIndex(index),
        }}
        controller={{
          closeOnBackdropClick: true,
        }}
      />
    </article>
  );
};

export default ArticleDetail;
