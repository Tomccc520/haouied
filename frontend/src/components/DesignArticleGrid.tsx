/**
 * @file DesignArticleGrid.tsx
 * @description 组件设计文章网格组件，展示设计文章，一行6个网格布局，支持子分类切换
 * @copyright 版权所有 (c) 2025 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.4.0 - 集成 WordPress 组件配置控制
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './DesignArticleGrid.css';

// 导入 WordPress 组件配置 Hook
import { useWordPressWidgets } from '../hooks/useWordPressWidgets';

// 导入 WordPress 分类 Hook
import { useWordPressCategories } from '../hooks/useWordPressCategories';

// 导入 WordPress 标签 Hook
import { useWordPressTags } from '../hooks/useWordPressTags';
import { debugLog } from '../utils/debugHelper';
import { getArticles } from '../services/articleService';
import type { ArticleListItem } from '../types/article';
import AdminShortcutHint from './AdminShortcutHint';
import { getFullImageUrl } from '../utils/urlUtils';
import { buildPlaceholderImage } from '../utils/placeholderImages';
import api from '../services/api';
import { unwrapApiList } from '../utils/apiResponse';

// 导入RankItem类型
interface RankItem {
  id: string;
  name: string;
  description?: string;
  link: string;
  thumbnail?: string;
  date?: string;
  authorName?: string;
  authorAvatar?: string;
  viewCount?: number;
  score?: number;
  timeAgo?: string;
  isNew?: boolean;
  isHot?: boolean;
  isFeatured?: boolean;
  category?: string;
  subCategory?: string;
  tags?: string[];
}

interface ArticleBadge {
  key: string;
  text: string;
  tone: 'featured' | 'hot' | 'new';
}

/**
 * 根据后端运营字段生成文章卡片角标，保证官方/热门/新收录能被前端明确消费。
 * @param article 文章卡片数据
 * @returns 角标列表
 */
export const resolveArticleBadges = (article: Pick<RankItem, 'isFeatured' | 'isHot' | 'isNew'>): ArticleBadge[] => {
  const badges: ArticleBadge[] = [];
  if (article.isFeatured) badges.push({ key: 'featured', text: '官方', tone: 'featured' });
  if (article.isHot) badges.push({ key: 'hot', text: '热', tone: 'hot' });
  if (article.isNew) badges.push({ key: 'new', text: '新', tone: 'new' });
  return badges;
};

// 子分类选项接口
interface TagOption {
  key: string;
  name: string;
  type: 'category' | 'tag';  // 支持分类和标签两种类型
  id: number;
  description?: string;
}

interface SessionCachePayload<T> {
  data: T;
  expiresAt: number;
}

// 默认标签选项（作为备用）- 都是分类类型
const DEFAULT_TAG_OPTIONS: TagOption[] = [
  { key: 'UI', name: 'UI', type: 'category', id: 334 },
  { key: 'UX', name: 'UX', type: 'category', id: 337 },
  { key: 'product', name: '产品', type: 'category', id: 336 },
  { key: 'graphic', name: '平面', type: 'category', id: 335 },
  { key: '3d', name: '三维', type: 'category', id: 1031 },
  { key: 'tips', name: '设计干货', type: 'category', id: 307 },
  { key: 'inspiration', name: '设计灵感', type: 'category', id: 1861 },
  { key: 'Font', name: '字体', type: 'category', id: 319 },
  { key: 'AIGC', name: 'AIGC', type: 'category', id: 417 },
];

// 常量定义
const CACHE_EXPIRE_TIME = 10 * 60 * 1000; // 10分钟缓存过期
const wordpressArticlePendingRequests = new Map<string, Promise<Record<string, unknown>[]>>();
const DEFAULT_ARTICLE_THUMBNAIL = buildPlaceholderImage({
  eyebrow: 'UIED',
  title: '设计文章',
  subtitle: '默认封面',
  width: 960,
  height: 540,
  palette: {
    backgroundStart: '#EFF6FF',
    backgroundEnd: '#F8FAFC',
    accent: '#2563EB',
  },
});

/**
 * 构建 WordPress 代理请求键，确保参数顺序不同也能命中同一进行中请求。
 * @param params 请求参数
 * @returns 稳定请求键
 */
function buildWordPressArticleRequestKey(params: Record<string, string | number>): string {
  return Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}

/**
 * 合并相同的 WordPress 文章代理请求，避免多个运营区块同时加载时重复访问后端。
 * @param params 请求参数
 * @returns 标准化文章原始列表
 */
async function fetchWordPressProxyArticles(
  params: Record<string, string | number>
): Promise<Record<string, unknown>[]> {
  const requestKey = buildWordPressArticleRequestKey(params);
  const pendingRequest = wordpressArticlePendingRequests.get(requestKey);
  if (pendingRequest) return pendingRequest;

  const requestPromise = api.get('/wordpress/posts', { params })
    .then(response => unwrapApiList<Record<string, unknown>>(response?.data));
  wordpressArticlePendingRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    if (wordpressArticlePendingRequests.get(requestKey) === requestPromise) {
      wordpressArticlePendingRequests.delete(requestKey);
    }
  }
}

// 清除所有设计文章缓存
const clearDesignArticlesCache = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('design-articles-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    debugLog.dev('DesignArticleGrid: 已清除缓存', keysToRemove.length, '个');
  } catch (e) {
    debugLog.warn('清除缓存失败', e);
  }
};

// 全局缓存 - 组件级别，持久化到sessionStorage
/**
 * 从会话缓存中读取并校验过期时间。
 */
function getFromSessionStorage<T>(key: string): T | null {
  try {
    const storedData = sessionStorage.getItem(key);
    if (storedData) {
      const parsed = JSON.parse(storedData) as SessionCachePayload<T>;
      const { data, expiresAt } = parsed;
      if (expiresAt > Date.now()) {
        return data;
      } else {
        // 缓存过期，清除
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {
    debugLog.warn('从SessionStorage获取缓存失败', e);
  }
  return null;
}

/**
 * 保存数据到会话缓存，并附带过期时间。
 */
function saveToSessionStorage<T>(key: string, data: T) {
  try {
    const cacheData: SessionCachePayload<T> = {
      data,
      expiresAt: Date.now() + CACHE_EXPIRE_TIME
    };
    sessionStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    debugLog.warn('保存到SessionStorage失败', e);
  }
}

// 根据环境处理图片URL
const getImageUrl = (url?: string) => {
  if (!url) return undefined;
  return getFullImageUrl(url) || url;
};

// 统一的图片错误处理函数
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = e.currentTarget;
  
  if (img.dataset.errorHandled) {
    return;
  }
  
  img.dataset.errorHandled = 'true';
  img.src = DEFAULT_ARTICLE_THUMBNAIL;
  
  const container = img.parentElement;
  if (container && container.classList.contains('article-image-container')) {
    container.classList.add('image-error');
  }
};

// 案例数据 - 用于样式调试
const generateMockData = (count: number): RankItem[] => {
  const mockArticles = [
    {
      id: 'mock-1',
      name: '2024年最受欢迎的UI设计趋势',
      description: '探索2024年最热门的UI设计趋势，包括新拟态、玻璃形态和动态交互设计',
      link: 'https://www.uied.cn/article/ui-trends-2024',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'Trend',
        title: '2024 UI 设计趋势',
        subtitle: '新拟态、玻璃形态与动态交互',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#DBEAFE', backgroundEnd: '#F8FBFF', accent: '#2563EB' },
      }),
      date: '2024-01-15',
      timeAgo: '2天前',
      isHot: true
    },
    {
      id: 'mock-2', 
      name: 'Figma插件推荐：提升设计效率的10个神器',
      description: '精选10个必备Figma插件，让你的设计工作效率翻倍',
      link: 'https://www.uied.cn/article/figma-plugins-2024',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'Figma',
        title: 'Figma 插件推荐',
        subtitle: '提升设计效率的 10 个神器',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#EDE9FE', backgroundEnd: '#F8FAFC', accent: '#7C3AED' },
      }),
      date: '2024-01-14',
      timeAgo: '3天前',
      isFeatured: true
    },
    {
      id: 'mock-3',
      name: '移动端设计规范：iOS vs Android差异对比',
      description: '深度解析iOS和Android设计规范的差异，帮你做出更好的移动端设计',
      link: 'https://www.uied.cn/article/mobile-design-guidelines',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'Mobile',
        title: '移动端设计规范',
        subtitle: 'iOS 与 Android 差异对比',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#E0F2FE', backgroundEnd: '#F8FAFC', accent: '#0284C7' },
      }),
      date: '2024-01-13',
      timeAgo: '4天前',
      isNew: true
    },
    {
      id: 'mock-4',
      name: '色彩心理学在UI设计中的应用',
      description: '了解色彩对用户心理的影响，掌握色彩搭配的黄金法则',
      link: 'https://www.uied.cn/article/color-psychology-ui',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'Color',
        title: '色彩心理学',
        subtitle: 'UI 设计中的应用方法',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#FCE7F3', backgroundEnd: '#FFF7ED', accent: '#DB2777' },
      }),
      date: '2024-01-12',
      timeAgo: '5天前'
    },
    {
      id: 'mock-5',
      name: '2024年网页设计灵感：30个优秀案例分析',
      description: '精选30个2024年优秀网页设计案例，分析设计亮点和创意思路',
      link: 'https://www.uied.cn/article/web-design-inspiration-2024',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'Web',
        title: '网页设计灵感',
        subtitle: '30 个优秀案例分析',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#E0E7FF', backgroundEnd: '#EEF2FF', accent: '#4F46E5' },
      }),
      date: '2024-01-11',
      timeAgo: '6天前'
    },
    {
      id: 'mock-6',
      name: 'AI设计工具大盘点：设计师的智能助手',
      description: '盘点最新AI设计工具，探索人工智能如何改变设计行业',
      link: 'https://www.uied.cn/article/ai-design-tools-2024',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'AI',
        title: 'AI 设计工具',
        subtitle: '设计师的智能助手',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#F3E8FF', backgroundEnd: '#FAF5FF', accent: '#8B5CF6' },
      }),
      date: '2024-01-10',
      timeAgo: '1周前'
    },
    {
      id: 'mock-7',
      name: '用户体验设计的5个核心原则',
      description: '深入理解UX设计的基本原则，打造更好的用户体验',
      link: 'https://www.uied.cn/article/ux-design-principles',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'UX',
        title: 'UX 核心原则',
        subtitle: '打造更好的用户体验',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#DCFCE7', backgroundEnd: '#F0FDF4', accent: '#059669' },
      }),
      date: '2024-01-09',
      timeAgo: '1周前'
    },
    {
      id: 'mock-8',
      name: '设计系统构建指南：从零到一的完整流程',
      description: '学习如何构建一套完整的设计系统，提升团队协作效率',
      link: 'https://www.uied.cn/article/design-system-guide',
      thumbnail: buildPlaceholderImage({
        eyebrow: 'System',
        title: '设计系统构建指南',
        subtitle: '从零到一的完整流程',
        width: 960,
        height: 540,
        palette: { backgroundStart: '#FEF3C7', backgroundEnd: '#FFFBEB', accent: '#D97706' },
      }),
      date: '2024-01-08',
      timeAgo: '1周前'
    }
  ];
  
  return mockArticles.slice(0, count);
};

/**
 * 统一将本地文章列表项转换为网格卡片数据。
 */
const mapLocalArticleToRankItem = (article: ArticleListItem): RankItem => {
  const articleId = Number(article?.id || 0);
  const slug = String(article?.slug || '').trim();
  const safeId = articleId > 0 ? articleId : Date.now();
  return {
    id: `local-${safeId}`,
    name: String(article?.title || '未命名文章').trim() || '未命名文章',
    description: String(article?.excerpt || '').trim(),
    link: `/article/${slug || safeId}`,
    thumbnail: String(article?.coverImage || '').trim(),
    date: String(article?.publishedAt || article?.createdAt || ''),
    authorName: String(article?.author || '').trim(),
    viewCount: Number(article?.viewCount || 0),
    category: String(article?.category || '').trim(),
    tags: Array.isArray(article?.tags) ? article.tags.map((item) => String(item?.name || '').trim()).filter(Boolean) : [],
  };
};

/**
 * 从代理文章数据中提取封面图地址，兼容不同字段命名与 WordPress 嵌套结构。
 */
const resolveProxyThumbnail = (row: Record<string, unknown>): string => {
  /**
   * 将任意值转换为可用文本 URL，空值返回空字符串。
   */
  const toUrlText = (value: unknown): string => String(value || '').trim();

  const directCandidates: unknown[] = [
    row?.thumbnail,
    row?.coverImage,
    row?.cover,
    row?.image,
    row?.featuredImage,
    row?.featured_image,
    row?.featuredMediaUrl,
    row?.featured_media_url,
    row?.postThumbnail,
    row?.post_thumbnail,
  ];

  for (const candidate of directCandidates) {
    const urlText = toUrlText(candidate);
    if (urlText) return urlText;
  }

  const featuredMedia = row?.featuredMedia;
  if (featuredMedia && typeof featuredMedia === 'object' && !Array.isArray(featuredMedia)) {
    const mediaObject = featuredMedia as Record<string, unknown>;
    const sourceUrl = toUrlText(mediaObject.source_url || mediaObject.url || mediaObject.thumbnail);
    if (sourceUrl) return sourceUrl;

    const sizes = mediaObject.sizes;
    if (sizes && typeof sizes === 'object' && !Array.isArray(sizes)) {
      const sizeMap = sizes as Record<string, unknown>;
      for (const key of [ 'large', 'medium_large', 'medium', 'thumbnail' ]) {
        const sizeItem = sizeMap[key];
        if (sizeItem && typeof sizeItem === 'object' && !Array.isArray(sizeItem)) {
          const sizeUrl = toUrlText((sizeItem as Record<string, unknown>).source_url || (sizeItem as Record<string, unknown>).url);
          if (sizeUrl) return sizeUrl;
        }
      }
    }
  }

  const embedded = row?._embedded;
  if (embedded && typeof embedded === 'object' && !Array.isArray(embedded)) {
    const embeddedMap = embedded as Record<string, unknown>;
    const featuredMediaList = embeddedMap['wp:featuredmedia'];
    if (Array.isArray(featuredMediaList) && featuredMediaList.length > 0) {
      const firstMedia = featuredMediaList[0];
      if (firstMedia && typeof firstMedia === 'object' && !Array.isArray(firstMedia)) {
        const embeddedUrl = toUrlText((firstMedia as Record<string, unknown>).source_url || (firstMedia as Record<string, unknown>).url);
        if (embeddedUrl) return embeddedUrl;
      }
    }
  }

  return '';
};

/**
 * 将后端 WordPress 代理接口返回的文章统一映射为网格卡片数据。
 */
const mapProxyArticleToRankItem = (row: Record<string, unknown>): RankItem => {
  const rawId = String(row?.id || '').trim();
  const fallbackId = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = String(row?.name || row?.title || '未命名文章').trim() || '未命名文章';
  const link = String(row?.link || row?.url || '#').trim() || '#';
  const thumbnail = resolveProxyThumbnail(row);
  const date = String(row?.date || row?.publishedAt || row?.createdAt || '').trim();
  const viewCount = Number.parseInt(String(row?.viewCount || row?.views || 0), 10);
  const score = Number.parseFloat(String(row?.score || 0));

  return {
    id: rawId || fallbackId,
    name: title,
    description: String(row?.description || row?.excerpt || '').trim(),
    link,
    thumbnail,
    date,
    authorName: String(row?.authorName || row?.author || '').trim(),
    authorAvatar: String(row?.authorAvatar || '').trim(),
    viewCount: Number.isFinite(viewCount) && viewCount > 0 ? viewCount : 0,
    score: Number.isFinite(score) && score > 0 ? score : undefined,
    isNew: row?.isNew === true,
    isHot: row?.isHot === true,
    isFeatured: row?.isFeatured === true,
  };
};

interface DesignArticleGridProps {
  title?: string;
  limit?: number;
  useMock?: boolean; // 是否使用模拟数据
  enableSubCategories?: boolean; // 是否启用子分类切换
  defaultSubCategory?: string; // 默认选中的子分类
  showMoreButton?: boolean; // 是否显示查看更多按钮
  moreButtonLink?: string; // 查看更多按钮链接
  pageSlug?: string; // 页面标识，用于获取组件配置
  position?: string; // 组件位置，用于获取组件配置
  emptyAdminPath?: string; // 空态时的后台配置路径
  emptyAdminActionText?: string; // 空态时的后台按钮文案
}

const DesignArticleGrid: React.FC<DesignArticleGridProps> = ({ 
  title = "设计文章",
  limit = 8, // 默认显示8个文章（超过一行，提供更丰富的内容）
  useMock = false, // 恢复使用接口数据
  enableSubCategories = false, // 默认不启用子分类切换
  defaultSubCategory = 'UI', // 默认选择UI分类
  showMoreButton = false, // 默认不显示查看更多按钮
  moreButtonLink = '/articles', // 默认查看更多按钮链接
  pageSlug, // 页面标识
  position = 'main', // 组件位置
  emptyAdminPath = '',
  emptyAdminActionText = '去后台配置文章模块',
}) => {
  // 获取 WordPress 组件配置
  const { getWidgetByPosition } = useWordPressWidgets({
    pageSlug,
    enabled: !!pageSlug
  });
  
  // 从组件配置中获取设置
  const widgetConfig = getWidgetByPosition(position);
  /**
   * 当页面存在显式组件配置且已关闭时，不再回退到默认展示，避免“后台关闭前台仍显示”。
   */
  const isWidgetExplicitlyHidden = Boolean(pageSlug && widgetConfig && widgetConfig.visible === false);
  /**
   * 解析后台配置的展示模式：tabs=分类切换，fixed=固定分类/标签。
   */
  const widgetDisplayMode = useMemo<'fixed' | 'tabs'>(() => {
    if (!widgetConfig) {
      return enableSubCategories ? 'tabs' : 'fixed';
    }
    if (widgetConfig.enableSubCategories === true) return 'tabs';
    if (widgetConfig.enableSubCategories === false) return 'fixed';
    const mode = String(widgetConfig?.meta?.displayMode || '').trim().toLowerCase();
    if (mode === 'tabs') return 'tabs';
    if (mode === 'fixed') return 'fixed';
    return enableSubCategories ? 'tabs' : 'fixed';
  }, [widgetConfig, enableSubCategories]);

  /**
   * 解析文章来源：api=外部 WordPress 源，local=本站后台文章源。
   */
  const widgetArticleSource = useMemo<'api' | 'local'>(() => {
    if (!widgetConfig) return 'api';
    const directSource = String(widgetConfig.articleSource || '').trim().toLowerCase();
    if (directSource === 'local') return 'local';
    const metaSource = String(widgetConfig?.meta?.articleSource || '').trim().toLowerCase();
    return metaSource === 'local' ? 'local' : 'api';
  }, [widgetConfig]);

  /**
   * 固定模式下的来源类型（分类/标签）。
   */
  const widgetFixedFilterType = useMemo<'category' | 'tag'>(() => {
    if (!widgetConfig) return 'category';
    const directType = String(widgetConfig.fixedFilterType || '').trim().toLowerCase();
    if (directType === 'tag') return 'tag';
    const metaType = String(widgetConfig?.meta?.fixedFilterType || '').trim().toLowerCase();
    return metaType === 'tag' ? 'tag' : 'category';
  }, [widgetConfig]);

  /**
   * 固定模式下的来源 ID。
   */
  const widgetFixedFilterId = useMemo(() => {
    const directId = Number.parseInt(String(widgetConfig?.fixedFilterId || 0), 10);
    if (Number.isFinite(directId) && directId > 0) return directId;
    const metaId = Number.parseInt(String(widgetConfig?.meta?.fixedFilterId || 0), 10);
    return Number.isFinite(metaId) && metaId > 0 ? metaId : 0;
  }, [widgetConfig]);
  const effectiveEnableSubCategories = widgetArticleSource === 'api' && widgetDisplayMode === 'tabs';
  
  // 使用组件配置覆盖默认值
  const effectiveTitle = widgetConfig?.title || title;
  const effectiveLimit = widgetConfig?.limit || limit;
  const effectiveShowMoreLink = widgetConfig?.showMoreLink || moreButtonLink;
  const effectiveShowMoreButton = widgetConfig?.showMoreLink ? true : showMoreButton;
  
  // 调试日志 - 仅在开发环境输出
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && widgetConfig) {
      debugLog.dev('[DesignArticleGrid] 使用配置:', {
        pageSlug,
        articleSource: widgetArticleSource,
        categoryIds: widgetConfig?.categoryIds,
        tagIds: widgetConfig?.tagIds,
      });
    }
  }, [pageSlug, widgetConfig, widgetArticleSource]);
  
  // 获取后台配置的所有分类（用于支持新增的分类）
  const { categories: backendCategories } = useWordPressCategories({});
  
  // 获取后台配置的所有标签（用于支持标签）
  const { tags: backendTags } = useWordPressTags({});
  
  // 根据组件配置筛选要显示的分类和标签
  const TAG_OPTIONS = useMemo(() => {
    const configuredOptions: TagOption[] = [];
    
    // 处理分类ID
    if (widgetConfig?.categoryIds && widgetConfig.categoryIds.length > 0) {
      for (const catId of widgetConfig.categoryIds) {
        // 先从默认配置中查找
        const defaultOpt = DEFAULT_TAG_OPTIONS.find(opt => opt.id === catId && opt.type === 'category');
        if (defaultOpt) {
          configuredOptions.push(defaultOpt);
          continue;
        }
        
        // 如果默认配置中没有，从后台配置中查找
        const backendCat = backendCategories.find(cat => cat.wpCategoryId === catId);
        if (backendCat) {
          configuredOptions.push({
            key: backendCat.slug || `cat-${catId}`,
            name: backendCat.displayName,
            type: 'category',
            id: catId,
          });
        }
      }
    }
    
    // 处理标签ID
    if (widgetConfig?.tagIds && widgetConfig.tagIds.length > 0) {
      for (const tagId of widgetConfig.tagIds) {
        // 从后台配置中查找标签
        const backendTag = backendTags.find(tag => tag.wpTagId === tagId);
        if (backendTag) {
          configuredOptions.push({
            key: backendTag.slug || `tag-${tagId}`,
            name: backendTag.displayName,
            type: 'tag',
            id: tagId,
          });
        } else {
          // 如果后台没有配置，直接使用ID创建
          configuredOptions.push({
            key: `tag-${tagId}`,
            name: `标签${tagId}`,
            type: 'tag',
            id: tagId,
          });
        }
      }
    }
    
    if (configuredOptions.length > 0) {
      debugLog.dev('[DesignArticleGrid] 使用组件配置:', configuredOptions.map(c => `${c.name}(${c.type})`));
      return configuredOptions;
    }
    
    // 否则使用所有默认分类
    return DEFAULT_TAG_OPTIONS;
  }, [widgetConfig?.categoryIds, widgetConfig?.tagIds, backendCategories, backendTags]);
  /**
   * 固定模式下优先选中的分类/标签。
   */
  const fixedTagOption = useMemo(() => {
    if (effectiveEnableSubCategories || TAG_OPTIONS.length === 0) return null;
    if (widgetFixedFilterId > 0) {
      const matched = TAG_OPTIONS.find(
        (option) => option.type === widgetFixedFilterType && option.id === widgetFixedFilterId,
      );
      if (matched) return matched;
    }
    const sameType = TAG_OPTIONS.find((option) => option.type === widgetFixedFilterType);
    return sameType || TAG_OPTIONS[0] || null;
  }, [effectiveEnableSubCategories, TAG_OPTIONS, widgetFixedFilterType, widgetFixedFilterId]);
  const widgetCategoryIdsKey = useMemo(
    () => (widgetConfig?.categoryIds || []).join(','),
    [widgetConfig?.categoryIds]
  );
  
  // 当前选中的子分类 - 初始为空，等待TAG_OPTIONS加载后设置
  const [activeTag, setActiveTag] = useState<string>('');
  
  // 当TAG_OPTIONS加载完成后，设置默认选中的分类
  useEffect(() => {
    if (widgetArticleSource === 'local') return;
    if (TAG_OPTIONS.length === 0) return;
    if (!effectiveEnableSubCategories) {
      const fixedKey = fixedTagOption?.key || TAG_OPTIONS[0]?.key || '';
      if (fixedKey && fixedKey !== activeTag) {
        debugLog.dev('[DesignArticleGrid] 固定模式设置分类:', fixedKey);
        setActiveTag(fixedKey);
      }
      return;
    }
    if (activeTag && TAG_OPTIONS.some((opt) => opt.key === activeTag)) {
      return;
    }
    // 尝试找到匹配defaultSubCategory的选项
    const matchingOption = TAG_OPTIONS.find(opt => 
      opt.name === defaultSubCategory || 
      opt.key === defaultSubCategory ||
      opt.name.includes(defaultSubCategory)
    );
    const defaultKey = matchingOption?.key || TAG_OPTIONS[0].key;
    debugLog.dev('[DesignArticleGrid] 设置默认分类:', defaultKey, 'TAG_OPTIONS:', TAG_OPTIONS.map(t => t.key));
    setActiveTag(defaultKey);
  }, [TAG_OPTIONS, activeTag, defaultSubCategory, effectiveEnableSubCategories, fixedTagOption, widgetArticleSource]);
  
  // 状态管理
  const [articles, setArticles] = useState<RankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // 使用useRef跟踪加载状态，避免重复请求
  const isLoadingRef = useRef(false);
  // 请求序号：用于忽略过期请求响应，避免“旧请求覆盖新状态”
  const requestSeqRef = useRef(0);
  
  // 使用useRef存储组件是否已挂载 - 每次渲染时重置为true
  const isMountedRef = useRef(true);
  
  // 组件挂载时重置isMountedRef
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // 获取当前选中项的ID和类型
  const getCurrentOption = useCallback(() => {
    if (!effectiveEnableSubCategories && fixedTagOption) {
      return fixedTagOption;
    }
    // 如果activeTag为空，使用第一个选项
    if (!activeTag && TAG_OPTIONS.length > 0) {
      return TAG_OPTIONS[0];
    }
    const activeOption = TAG_OPTIONS.find(option => option.key === activeTag);
    return activeOption || TAG_OPTIONS[0] || { id: 334, type: 'category' as const, key: 'UI', name: 'UI' };
  }, [activeTag, TAG_OPTIONS, effectiveEnableSubCategories, fixedTagOption]);

  // 获取文章数据
  const fetchArticles = useCallback(async (forceRefresh = false) => {
    /**
     * 不再使用“加载中直接跳过”策略：
     * tab 切换时允许并发发起新请求，通过 requestSeq 只保留最后一次结果，
     * 解决慢网速下“点击第二个 tab 无响应/被旧请求覆盖”的问题。
     */
    const requestSeq = ++requestSeqRef.current;
    const fetchLimit = effectiveLimit;

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    isLoadingRef.current = true;

    /**
     * 本地文章模式：读取站内文章列表，不再依赖 WordPress 分类/标签。
     */
    if (widgetArticleSource === 'local') {
      const cacheKey = `design-articles-local-${fetchLimit}`;
      try {
        if (!forceRefresh) {
          const cachedData = getFromSessionStorage<RankItem[]>(cacheKey);
          if (cachedData) {
            debugLog.dev('DesignArticleGrid: 使用本地文章缓存:', cachedData.length, '条');
            if (isMountedRef.current && requestSeq === requestSeqRef.current) {
              setArticles(cachedData);
              setIsLoading(false);
              setError(null);
            }
            return;
          }
        }

        const response = await getArticles({
          page: 1,
          pageSize: fetchLimit,
        });
        const normalizedRows = Array.isArray(response?.data)
          ? response.data.map((item) => mapLocalArticleToRankItem(item)).filter((item) => !!item.name)
          : [];

        if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;

        if (normalizedRows.length > 0) {
          saveToSessionStorage(cacheKey, normalizedRows);
          setArticles(normalizedRows);
          setError(null);
          setRetryCount(0);
          return;
        }

        setArticles([]);
        setError('暂无本地文章数据');
      } catch (err) {
        debugLog.error('DesignArticleGrid: 获取本地文章失败:', err);
        if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;
        const fallbackData = getFromSessionStorage<RankItem[]>(cacheKey);
        if (fallbackData && fallbackData.length > 0) {
          setArticles(fallbackData);
          setError('获取最新数据失败，显示缓存数据');
        } else {
          setArticles([]);
          setError('本地文章读取失败，请稍后重试');
        }
        setRetryCount((prev) => prev + 1);
      } finally {
        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          setIsLoading(false);
        }
        if (requestSeq === requestSeqRef.current) {
          isLoadingRef.current = false;
        }
      }
      return;
    }

    const currentOption = getCurrentOption();
    debugLog.dev('DesignArticleGrid: 开始获取文章，来源:', widgetArticleSource, '类型:', currentOption.type, 'ID:', currentOption.id, '当前标签:', activeTag, '强制刷新:', forceRefresh, '数量限制:', fetchLimit);

    // 创建缓存键 - 包含类型信息
    const cacheKey = `design-articles-${currentOption.type}-${currentOption.id}-${fetchLimit}`;

    // 如果不是强制刷新，首先尝试从sessionStorage获取缓存
    if (!forceRefresh) {
      const cachedData = getFromSessionStorage<RankItem[]>(cacheKey);
      if (cachedData) {
        debugLog.dev('DesignArticleGrid: 使用缓存数据:', cachedData.length, '条');
        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          setArticles(cachedData);
          setIsLoading(false);
          setError(null);
        }
        if (requestSeq === requestSeqRef.current) {
          isLoadingRef.current = false;
        }
        return;
      }
    }

    try {
      debugLog.dev('DesignArticleGrid: 调用API获取数据，参数:', {
        source: widgetArticleSource,
        type: currentOption.type,
        id: currentOption.id,
        page: 1,
        perPage: fetchLimit,
        orderBy: 'date',
        order: 'desc',
        useMock
      });

      let response: RankItem[];

      // 如果使用模拟数据，直接返回案例数据
      if (useMock) {
        debugLog.dev('DesignArticleGrid: 使用案例数据进行样式调试');
        response = generateMockData(fetchLimit);
      } else {
        /**
         * API 模式统一通过本站后端代理拉取内容，避免前端直连第三方源站导致：
         * 1) CORS/证书问题
         * 2) 无法走后台配置的 WordPress 源
         * 3) 图片字段结构不一致
         */
        const params: Record<string, string | number> = {
          source: 'auto',
          page: 1,
          perPage: fetchLimit,
          orderBy: 'date',
          order: 'desc',
        };
        if (currentOption.type === 'tag') {
          params.tagId = currentOption.id;
        } else {
          params.categoryId = currentOption.id;
        }

        const proxyRows = await fetchWordPressProxyArticles(params);
        response = proxyRows
          .map((item) => mapProxyArticleToRankItem(item))
          .filter((item) => Boolean(item.name));
      }

      debugLog.dev('DesignArticleGrid: 返回数据:', response);

      // 组件可能已卸载，检查挂载状态
      if (!isMountedRef.current || requestSeq !== requestSeqRef.current) {
        debugLog.dev('DesignArticleGrid: 组件已卸载，停止处理');
        return;
      }

      if (Array.isArray(response) && response.length > 0) {
        debugLog.dev('DesignArticleGrid: 成功获取', response.length, '条文章');
        // 保存到sessionStorage
        saveToSessionStorage(cacheKey, response);

        // 更新状态
        setArticles(response);
        setError(null);
        setRetryCount(0);
      } else {
        debugLog.warn('DesignArticleGrid: 未找到文章数据或数据格式错误');
        setArticles([]);
        setError('暂无该分类的文章数据');
      }
    } catch (err) {
      debugLog.error('DesignArticleGrid: 获取设计文章失败:', err);

      // 组件可能已卸载，检查挂载状态
      if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;

      // 尝试从sessionStorage获取任何类别的缓存数据作为后备
      let foundFallback = false;
      for (const option of TAG_OPTIONS) {
        const fallbackCacheKey = `design-articles-${option.type}-${option.id}-${fetchLimit}`;
        const fallbackData = getFromSessionStorage<RankItem[]>(fallbackCacheKey);
        if (fallbackData && fallbackData.length > 0) {
          debugLog.dev('DesignArticleGrid: 使用后备缓存数据:', option.name);
          setArticles(fallbackData);
          setError('获取最新数据失败，显示缓存数据');
          foundFallback = true;
          break;
        }
      }

      // 如果仍然没有数据，显示错误
      if (!foundFallback) {
        debugLog.dev('DesignArticleGrid: 无可用数据');
        setArticles([]);
        setError('暂时无法连接到服务器');
      }

      setRetryCount(prev => prev + 1);
    } finally {
      if (isMountedRef.current && requestSeq === requestSeqRef.current) {
        setIsLoading(false);
      }
      if (requestSeq === requestSeqRef.current) {
        isLoadingRef.current = false;
      }
    }
  }, [effectiveLimit, useMock, getCurrentOption, activeTag, TAG_OPTIONS, widgetArticleSource]);

  // 处理子分类切换
  const handleTagChange = useCallback((tagKey: string) => {
    if (!effectiveEnableSubCategories) {
      return;
    }
    // 如果是当前选中的标签，忽略
    if (tagKey === activeTag) {
      return;
    }
    
    debugLog.dev('DesignArticleGrid: 切换分类', tagKey);
    
    // 先检查缓存是否存在，如果有缓存就不显示loading
    const targetOption = TAG_OPTIONS.find(opt => opt.key === tagKey);
    if (targetOption) {
      const cacheKey = `design-articles-${targetOption.type}-${targetOption.id}-${effectiveLimit}`;
      const cachedData = getFromSessionStorage<RankItem[]>(cacheKey);
      if (cachedData) {
        // 有缓存，直接切换，不显示loading
        setActiveTag(tagKey);
        setArticles(cachedData);
        setError(null);
        setIsLoading(false);
        return;
      }
    }
    
    // 没有缓存，切换标签后由 activeTag 监听逻辑触发请求
    setActiveTag(tagKey);
    setError(null);
    setIsLoading(true);
  }, [activeTag, TAG_OPTIONS, effectiveLimit, effectiveEnableSubCategories]);

  // 重试加载数据
  const handleRetry = useCallback(() => {
    if (isLoadingRef.current) return;
    setRetryCount(0);
    fetchArticles(true); // 强制刷新
  }, [fetchArticles]);

  // 组件挂载时获取数据 - 本地源直接拉取，API 源等待 activeTag 就绪
  useEffect(() => {
    if (widgetArticleSource === 'local') {
      debugLog.dev('DesignArticleGrid: 本地文章模式，获取初始数据');
      fetchArticles();
      return;
    }
    if (activeTag) {
      debugLog.dev('DesignArticleGrid: activeTag已设置，获取初始数据', activeTag);
      fetchArticles();
    }
  }, [activeTag, fetchArticles, widgetArticleSource]);

  // 当组件配置变化时，清除缓存并重新获取数据
  useEffect(() => {
    if (widgetConfig) {
      debugLog.dev('DesignArticleGrid: 组件配置变化，清除缓存并重新获取数据', widgetConfig);
      clearDesignArticlesCache();
      // 延迟获取数据，确保缓存已清除
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchArticles(true);
        }
      }, 100);
    }
  }, [widgetConfig, widgetConfig?.id, widgetCategoryIdsKey, widgetConfig?.limit, fetchArticles]);

  // 渲染文章卡片 - 优化鼠标移入效果
  const renderArticles = () => {
    // 橙色色阶，前三名使用不同颜色，后面统一灰色
    const rankColors = [
      '#FF6B00', // 第1名 - 深橙色
      '#FF7E1F', // 第2名 - 中橙色
      '#FF913E', // 第3名 - 浅橙色
      '#9E9E9E', // 第4名及以后 - 灰色
      '#9E9E9E', // 第5名及以后 - 灰色
      '#9E9E9E', // 第6名及以后 - 灰色
      '#9E9E9E', // 第7名及以后 - 灰色
      '#9E9E9E'  // 第8名及以后 - 灰色
    ];
    
    return articles.slice(0, effectiveLimit).map((article, index) => {
      const badges = resolveArticleBadges(article);
      return (
        <motion.div
          key={article.id}
          className="article-card"
          onClick={() => window.open(article.link, '_blank', 'noopener,noreferrer')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            delay: index * 0.05, // 减少延迟时间
            ease: "easeOut"
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="article-image-container">
            {badges.length > 0 ? (
              <div className="article-badge-list" aria-label="文章运营标识">
                {badges.map((badge) => (
                  <span key={badge.key} className={`article-badge is-${badge.tone}`}>
                    {badge.text}
                  </span>
                ))}
              </div>
            ) : null}
            {article.thumbnail ? (
              <motion.img
                alt={article.name || '文章图片'}
                src={article.thumbnail ? getImageUrl(article.thumbnail) : undefined}
                className="article-image"
                onError={handleImageError}
                loading="lazy"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
              />
            ) : (
              <div className="article-image-placeholder"></div>
            )}
          </div>
          <div className="article-content">
            <h3 className="article-title" title={article.name}>
              <motion.span
                className="article-rank"
                style={{
                  backgroundColor: index < rankColors.length ? rankColors[index] : '#9E9E9E'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.05 + 0.1,
                  type: "spring",
                  stiffness: 200
                }}
              >
                No.{index + 1}
              </motion.span>
              <span className="article-title-text">{article.name}</span>
            </h3>
          </div>
        </motion.div>
      );
    });
  };

  // 骨架屏加载中
  const renderSkeleton = () => {
    return Array(effectiveLimit).fill(null).map((_, index) => (
      <motion.div 
        key={`skeleton-${index}`} 
        className="article-card skeleton"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          delay: index * 0.05,
          ease: "easeOut"
        }}
      >
        <div className="skeleton-image"></div>
        <div className="skeleton-content">
          <div className="skeleton-title"></div>
        </div>
      </motion.div>
    ));
  };

  if (isWidgetExplicitlyHidden) {
    return null;
  }

  return (
    <div className="design-article-grid-container">
      <motion.div 
        className="section-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div 
          className="section-title"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span>{effectiveTitle}</span>
        </motion.div>
        {/* 查看更多按钮 */}
        {effectiveShowMoreButton && (
          <motion.a 
            href={effectiveShowMoreLink} 
            className="view-more-btn desktop-only" 
            target="_blank" 
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            // 移除鼠标悬停动效
          >
            查看更多 {'>'}
          </motion.a>
        )}
      </motion.div>
      
      {/* 子分类切换标签 - 只有在启用时才显示 */}
      {effectiveEnableSubCategories && (
        <motion.div 
          className="article-subcategories"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="subcategory-tabs">
            {TAG_OPTIONS.map((tag, index) => (
              <motion.button
                key={tag.key}
                className={`subcategory-tab ${activeTag === tag.key ? 'active' : ''} ${isLoadingRef.current ? 'disabled' : ''}`}
                onClick={() => handleTagChange(tag.key)}
                title={tag.description}
                disabled={isLoadingRef.current} // 加载中时禁用切换
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: 0.4 + index * 0.03,
                  ease: "easeOut"
                }}
                // 移除鼠标悬停动效
              >
                <span className="tab-name">{tag.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
      
      {error && !isLoading ? (
        <div className="empty-container">
          <div className="empty-content">
            <p>{error}</p>
            {retryCount < 5 && (
              <button 
                className="retry-button" 
                onClick={handleRetry}
                disabled={isLoadingRef.current}
              >
                重试
              </button>
            )}
            <AdminShortcutHint
              adminPath={emptyAdminPath}
              actionText={emptyAdminActionText}
            />
          </div>
        </div>
      ) : (
        <div className="article-grid">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="skeleton-grid"
              >
                {renderSkeleton()}
              </motion.div>
            ) : (
              <motion.div
                key={`articles-${activeTag}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="articles-grid"
              >
                {renderArticles()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 移动端底部的查看更多按钮 */}
      {effectiveShowMoreButton && (
        <div className="mobile-view-more">
          <a
            href={effectiveShowMoreLink}
            className="mobile-view-more-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="查看更多设计文章"
          >
            查看更多
          </a>
        </div>
      )}
    </div>
  );
};

export default DesignArticleGrid;
