/**
 * @file Search/index.tsx
 * @description 全站搜索页面 - 支持AI智能搜索、搜索历史、筛选、分页
 * @version 4.2.0
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.03.02
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HeroBanner from '../../components/HeroBanner';
import AdBanner from '../../components/AdBanner';
import ToolCard from '../../components/ToolCard';
import AISearchSidebar from '../../components/AISearchSidebar';
import api from '../../services/api';
import searchService from '../../services/searchService';
import { useFrontendConfig } from '../../hooks/useFrontendConfig';
import { usePermalinkConfig, generateWebsiteUrl } from '../../hooks/usePermalinkConfig';
import { getArrowConfigByWebsiteClickMode, appendRefParamToUrl } from '../../utils/clickMode';
import { unwrapApiResponse } from '../../utils/apiResponse';
import { debugLog } from '../../utils/debugHelper';
import './index.css';

const bgImage = '/bg.jpg';
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;
const PAGE_SIZE = 40;
const HOT_SEARCH_TAGS = ['AI绘画', 'ChatGPT', 'Figma', '免费工具', 'UI设计', 'Midjourney', '字体', '图标库', 'SVG'];
const MAX_SEMANTIC_KEYWORDS = 4;
const MAX_AI_REWRITE_KEYWORDS = 8;
const CATEGORY_CHIP_COLLAPSE_COUNT = 10;
const TAG_CHIP_COLLAPSE_COUNT = 14;

/**
 * AI 搜索语义扩展词典：把用户常见表达扩展到更可命中的站内关键词。
 */
const SEMANTIC_SYNONYM_MAP: Record<string, string[]> = {
  ai: ['人工智能', 'AI工具', '智能助手'],
  chatgpt: ['大模型', 'AI问答', 'AI助手'],
  写作: ['文案', '内容生成', '文章生成'],
  绘画: ['图像生成', 'AI绘图', '设计灵感'],
  设计: ['UI设计', 'UX设计', '视觉设计'],
  图标: ['icon', '图标库', 'svg图标'],
  字体: ['字体下载', '字库', '排版'],
  建站: ['网站搭建', '站点工具', '网页制作'],
  视频: ['视频生成', '视频剪辑', '短视频'],
  办公: ['效率工具', '协作工具', '自动化办公'],
  原型: ['交互原型', '产品设计', 'axure'],
  代码: ['编程工具', '开发工具', '代码生成'],
  搜索: ['资源发现', '导航站', '工具合集'],
};

// 搜索结果接口
interface SearchResult {
  id: string;
  articleId?: number;
  name: string;
  description: string;
  url: string;
  slug?: string;
  iconUrl?: string;
  category?: string;
  tags: string[];
  weightTags?: string[];
  isNew?: boolean;
  isHot?: boolean;
  isFeatured?: boolean;
  source?: string;
  isAiResult?: boolean;
  contentType?: 'website' | 'article';
  publishedAt?: number;
}

interface BackendSearchItem {
  id?: string | number;
  articleId?: string | number;
  name?: string;
  title?: string;
  description?: string;
  excerpt?: string;
  url?: string;
  slug?: string;
  iconUrl?: string;
  coverImage?: string;
  category?: { name?: string } | string;
  tags?: string[] | string;
  weightTags?: string[] | string;
  isNew?: boolean;
  isHot?: boolean;
  isFeatured?: boolean;
  contentType?: 'website' | 'article' | string;
  publishedAt?: number | string;
}

/**
 * 规范化文本，统一用于搜索相关性计算与去重键生成。
 */
const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();

/**
 * 规范化分类筛选键，保证 URL 参数与本地筛选比对稳定。
 */
const normalizeCategoryFilterKey = (value: unknown): string => {
  return normalizeText(value).replace(/\s+/g, '-');
};

/**
 * 规范化标签筛选键，保证 URL 参数与本地筛选比对稳定。
 */
const normalizeTagFilterKey = (value: unknown): string => {
  return normalizeText(value).replace(/\s+/g, '-');
};

/**
 * 解析文章详情页路径，兼容 slug / id 两种路由参数。
 */
const resolveArticlePath = (item: BackendSearchItem): string => {
  const slug = String(item.slug || '').trim();
  const articleId = Number(item.articleId ?? item.id ?? 0);
  const identifier = slug || (articleId > 0 ? String(articleId) : String(item.id || '').trim());
  if (!identifier) return '/articles';
  return `/article/${encodeURIComponent(identifier)}`;
};

/**
 * 统一格式化搜索结果时间字段，文章结果用于展示发布时间。
 */
const formatSearchResultDate = (value: unknown): string => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const timestamp = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 拆分搜索词为语义 token（兼容中英文与符号分隔）。
 */
const tokenizeSearchQuery = (query: string): string[] => {
  return String(query || '')
    .split(/[、，,\s/+|:;；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

/**
 * 生成语义扩展关键词列表，供 AI 搜索做“多关键词并行检索”兜底增强。
 */
const buildSemanticExpansionKeywords = (query: string): string[] => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const seeds = [ ...tokenizeSearchQuery(query), normalizedQuery ];
  const candidateMap = new Map<string, number>();

  /**
   * 写入扩展候选词并记录权重，后续按权重排序。
   */
  const pushCandidate = (rawKeyword: unknown, weight: number) => {
    const keyword = String(rawKeyword || '').trim();
    const normalizedKeyword = normalizeText(keyword);
    if (!keyword || keyword.length < 2) return;
    if (!normalizedKeyword || normalizedKeyword === normalizedQuery) return;
    if (normalizedKeyword.includes(normalizedQuery)) return;
    const prevWeight = Number(candidateMap.get(keyword) || 0);
    candidateMap.set(keyword, Math.max(prevWeight, weight));
  };

  seeds.forEach((seed, index) => {
    const normalizedSeed = normalizeText(seed);
    if (!normalizedSeed) return;
    const aliases = SEMANTIC_SYNONYM_MAP[normalizedSeed] || [];
    aliases.forEach((alias) => pushCandidate(alias, 100 - index * 8));

    Object.entries(SEMANTIC_SYNONYM_MAP).forEach(([ key, values ]) => {
      if (!normalizedSeed.includes(key) && !key.includes(normalizedSeed)) return;
      values.forEach((alias) => pushCandidate(alias, 90 - index * 6));
    });
  });

  return Array.from(candidateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ keyword ]) => keyword)
    .slice(0, MAX_SEMANTIC_KEYWORDS);
};

/**
 * 生成 AI 改写推荐词，帮助用户把“模糊需求”快速改成可命中的检索表达。
 */
const buildAiRewriteSuggestions = (
  query: string,
  semanticKeywords: string[],
  relatedKeywords: string[],
): string[] => {
  const rawQuery = String(query || '').trim();
  const normalizedQuery = normalizeText(rawQuery);
  if (!normalizedQuery) return [];

  const uniqueMap = new Map<string, number>();

  /**
   * 写入候选改写词并附加权重，后续按权重排序。
   */
  const pushSuggestion = (rawKeyword: unknown, weight: number) => {
    const keyword = String(rawKeyword || '').trim();
    const normalizedKeyword = normalizeText(keyword);
    if (!keyword || keyword.length < 2) return;
    if (!normalizedKeyword || normalizedKeyword === normalizedQuery) return;
    const prevWeight = Number(uniqueMap.get(keyword) || 0);
    uniqueMap.set(keyword, Math.max(prevWeight, weight));
  };

  semanticKeywords.forEach((keyword, index) => {
    pushSuggestion(keyword, 100 - index * 8);
  });

  const suffixTemplates = [ '免费', '中文', '开源', '替代', '合集' ];
  suffixTemplates.forEach((suffix, index) => {
    pushSuggestion(`${rawQuery} ${suffix}`, 86 - index * 6);
  });

  const prefixTemplates = [ '适合新手的', '高效率', '高质量' ];
  prefixTemplates.forEach((prefix, index) => {
    pushSuggestion(`${prefix}${rawQuery}`, 62 - index * 5);
  });

  relatedKeywords.slice(0, 4).forEach((keyword, index) => {
    pushSuggestion(keyword, 56 - index * 4);
  });

  return Array.from(uniqueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ keyword ]) => keyword)
    .slice(0, MAX_AI_REWRITE_KEYWORDS);
};

/**
 * 构建搜索结果去重键，优先使用 URL，其次 ID/名称。
 */
const buildResultUniqueKey = (item: SearchResult): string => {
  const normalizedUrl = normalizeText(item.url).replace(/\/+$/g, '');
  if (normalizedUrl) return `url:${normalizedUrl}`;
  const normalizedId = normalizeText(item.id);
  if (normalizedId) return `id:${normalizedId}`;
  return `name:${normalizeText(item.name)}`;
};

/**
 * 计算搜索项与查询词的相关性分数，分值越高代表越相关。
 */
const calculateRelevanceScore = (item: SearchResult, query: string): number => {
  const q = normalizeText(query);
  if (!q) return 0;

  const name = normalizeText(item.name);
  const description = normalizeText(item.description);
  const category = normalizeText(item.category || '');
  const url = normalizeText(item.url);
  const tags = Array.isArray(item.tags) ? item.tags.map(tag => normalizeText(tag)) : [];

  let score = 0;

  if (name === q) score += 900;
  else if (name.startsWith(q)) score += 620;
  else if (name.includes(q)) score += 380;

  if (tags.some(tag => tag === q)) score += 300;
  else if (tags.some(tag => tag.startsWith(q))) score += 220;
  else if (tags.some(tag => tag.includes(q))) score += 140;

  if (category === q) score += 200;
  else if (category.includes(q)) score += 120;

  if (description.includes(q)) score += 110;
  if (url.includes(q)) score += 80;

  if (item.isFeatured) score += 40;
  if (item.isHot) score += 24;
  if (item.isNew) score += 16;

  if (item.source === 'ai') score += 12;

  return score;
};

/**
 * 对结果集执行去重并按相关性排序，保证普通搜索与 AI 增强结果顺序稳定。
 */
const dedupeAndSortResults = (results: SearchResult[], query: string): SearchResult[] => {
  const uniqueMap = new Map<string, SearchResult>();
  results.forEach((item) => {
    const uniqueKey = buildResultUniqueKey(item);
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, item);
      return;
    }

    const current = uniqueMap.get(uniqueKey) as SearchResult;
    const currentScore = calculateRelevanceScore(current, query);
    const incomingScore = calculateRelevanceScore(item, query);
    if (incomingScore > currentScore) {
      uniqueMap.set(uniqueKey, item);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => {
    const scoreDiff = calculateRelevanceScore(b, query) - calculateRelevanceScore(a, query);
    if (scoreDiff !== 0) return scoreDiff;
    const hotDiff = Number(Boolean(b.isHot)) - Number(Boolean(a.isHot));
    if (hotDiff !== 0) return hotDiff;
    const featuredDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
    if (featuredDiff !== 0) return featuredDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN');
  });
};

/**
 * 统一解析后端标签字段，兼容 string / string[] 两种结构。
 */
const normalizeTags = (tags: BackendSearchItem['tags']): string[] => {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * 统一解析站点权重标签字段，兼容 string / string[] 两种结构。
 */
const normalizeWeightTags = (weightTags: BackendSearchItem['weightTags']): string[] => {
  if (Array.isArray(weightTags)) {
    return weightTags.map(tag => String(tag || '').trim()).filter(Boolean);
  }
  if (typeof weightTags === 'string') {
    return weightTags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * 将后端搜索结果转换为前端统一结构。
 */
const mapBackendSearchItem = (
  item: BackendSearchItem,
  source: string,
  isAiResult: boolean = false
): SearchResult => {
  const contentType = String(item.contentType || '').trim().toLowerCase() === 'article' ? 'article' : 'website';
  const normalizedId = item.id !== undefined && item.id !== null ? String(item.id) : '';
  const rawArticleIdText = String(item.articleId ?? item.id ?? '').trim();
  const normalizedArticleIdText = rawArticleIdText.replace(/^article-/i, '').trim();
  const articleIdBase = normalizedArticleIdText || normalizedId.replace(/^article-/i, '').trim() || '0';
  const articleIdValue = Number(articleIdBase || 0);
  const categoryName = typeof item.category === 'string'
    ? item.category
    : item.category?.name || '';
  const articleName = String(item.title || item.name || '').trim();
  const websiteName = String(item.name || item.title || '').trim();
  const articleDescription = String(item.excerpt || item.description || '').trim();
  const websiteDescription = String(item.description || item.excerpt || '').trim();
  const articlePath = resolveArticlePath(item);
  const normalizedPublishedAt = Number(item.publishedAt || 0);

  return {
    id: contentType === 'article'
      ? (`article-${articleIdBase}`)
      : normalizedId,
    articleId: Number.isFinite(articleIdValue) ? articleIdValue : 0,
    name: contentType === 'article' ? articleName : websiteName,
    description: contentType === 'article' ? articleDescription : websiteDescription,
    url: contentType === 'article'
      ? (String(item.url || '').trim() || articlePath)
      : String(item.url || '').trim(),
    slug: item.slug,
    iconUrl: contentType === 'article'
      ? (item.coverImage || item.iconUrl || '')
      : item.iconUrl,
    category: categoryName,
    tags: contentType === 'article' ? [] : normalizeTags(item.tags),
    weightTags: contentType === 'article' ? [] : normalizeWeightTags(item.weightTags),
    isNew: contentType === 'article' ? false : Boolean(item.isNew),
    isHot: contentType === 'article' ? false : Boolean(item.isHot),
    isFeatured: contentType === 'article' ? false : Boolean(item.isFeatured),
    source,
    isAiResult,
    contentType,
    publishedAt: Number.isFinite(normalizedPublishedAt) ? normalizedPublishedAt : 0,
  };
};

/**
 * 标准化每页数量，避免后台配置异常导致前端分页异常
 */
const normalizeResultPageSize = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return PAGE_SIZE;
  return Math.max(10, Math.min(100, parsed));
};

/**
 * 标准化搜索建议防抖时长，保障配置值在合理范围内。
 */
const normalizeDebounceDelay = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return 300;
  return Math.max(100, Math.min(2000, parsed));
};

/**
 * 提取接口错误文案，避免搜索失败时页面无感知。
 */
const extractApiErrorMessage = (error: unknown): string => {
  const responseData = (error as any)?.response?.data;
  const message = responseData?.message || responseData?.error || (error as any)?.message;
  const normalized = String(message || '').trim();
  return normalized || '搜索接口请求失败，请稍后重试';
};

// AI 思考步骤
const AI_THINKING_STEPS = [
  { text: '理解搜索意图', icon: '🧠', color: '#6366F1' },
  { text: '分析关键词语义', icon: '📝', color: '#8B5CF6' },
  { text: '匹配相关资源', icon: '🔍', color: '#A855F7' },
  { text: '智能排序结果', icon: '⚡', color: '#D946EF' },
  { text: '生成推荐', icon: '✨', color: '#EC4899' }
];

// Framer Motion 动画配置
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      staggerChildren: 0.12
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.25 }
  }
};

const stepVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const }
  }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const
    }
  }
};

const spinnerVariants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear' as const
    }
  }
};

const progressVariants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: 'easeOut' as const }
  })
};

// AI 思考动画组件
const AIThinkingAnimation: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const progress = ((currentStep + 1) / AI_THINKING_STEPS.length) * 100;
  
  return (
    <motion.div
      className="ai-thinking-container-v2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* 头部 */}
      <motion.div className="ai-thinking-header-v2">
        <motion.div 
          className="ai-brain-icon"
          variants={pulseVariants}
          animate="pulse"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#brain-gradient)" fillOpacity="0.15"/>
            <path d="M12 6v6l4 2" stroke="url(#brain-gradient)" strokeWidth="2" strokeLinecap="round"/>
            <defs>
              <linearGradient id="brain-gradient" x1="2" y1="2" x2="22" y2="22">
                <stop stopColor="#6366F1"/>
                <stop offset="1" stopColor="#EC4899"/>
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
        <div className="ai-thinking-title-v2">
          <span className="title-text">AI 正在思考</span>
          <motion.span 
            className="thinking-dots"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ...
          </motion.span>
        </div>
      </motion.div>

      {/* 步骤列表 */}
      <div className="ai-thinking-steps-v2">
        {AI_THINKING_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          
          return (
            <motion.div
              key={index}
              className={`ai-step-v2 ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              variants={stepVariants}
              style={{ 
                '--step-color': step.color,
                borderColor: isActive ? step.color : 'transparent'
              } as React.CSSProperties}
            >
              <motion.div 
                className="step-icon-wrapper"
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
              >
                <span className="step-emoji">{step.icon}</span>
              </motion.div>
              
              <span className="step-label">{step.text}</span>
              
              <div className="step-status">
                {isActive && (
                  <motion.div 
                    className="step-spinner"
                    variants={spinnerVariants}
                    animate="spin"
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </motion.div>
                )}
                {isDone && (
                  <motion.div 
                    className="step-check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 进度条 */}
      <div className="ai-progress-wrapper">
        <div className="ai-progress-track">
          <motion.div 
            className="ai-progress-fill"
            variants={progressVariants}
            initial="initial"
            animate="animate"
            custom={progress}
          />
        </div>
        <span className="ai-progress-text">{Math.round(progress)}%</span>
      </div>

      {/* 底部提示 */}
      <motion.p 
        className="ai-thinking-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.5 }}
      >
        正在从 {'>'}2000 个资源中智能匹配...
      </motion.p>
    </motion.div>
  );
};

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [totalWebsites, setTotalWebsites] = useState(0);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // 筛选状态
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [tagExpanded, setTagExpanded] = useState(false);
  const [showResultFilters, setShowResultFilters] = useState(false);
  
  // AI 搜索状态
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiThinkingStep, setAiThinkingStep] = useState(0);
  const [showThinking, setShowThinking] = useState(false);
  
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // 搜索建议
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  /**
   * 搜索建议防抖定时器引用，避免频繁触发后端接口。
   */
  const suggestionDebounceTimerRef = useRef<number | null>(null);
  /**
   * 输入框失焦延时定时器，保证下拉项点击时不被提前关闭。
   */
  const searchBlurTimerRef = useRef<number | null>(null);
  
  // 相关搜索
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [hotSearchTags, setHotSearchTags] = useState<string[]>(HOT_SEARCH_TAGS);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiEnhancedCount, setAiEnhancedCount] = useState(0);
  const [aiExpandedKeywords, setAiExpandedKeywords] = useState<string[]>([]);
  /**
   * 搜索请求序列号，避免异步返回乱序覆盖当前结果。
   */
  const searchRequestSeqRef = useRef(0);
  /**
   * 记录最近一次执行的 URL 查询参数，避免仅切换来源筛选时重复请求搜索接口。
   */
  const lastUrlSearchRef = useRef<{ query: string; ai: boolean } | null>(null);
  /**
   * 搜索结果内存缓存（普通检索 / AI 检索 / 默认推荐），提升重复检索响应速度。
   */
  const searchResultCacheRef = useRef<Map<string, SearchResult[]>>(new Map());
  
  // 获取前端配置（跳转弹窗自定义文案）
  const { config: frontendConfig } = useFrontendConfig();
  const { config: permalinkConfig } = usePermalinkConfig();
  const showDirectArrow = frontendConfig?.pageGlobalConfig?.showDirectArrow ?? false;
  const websiteClickMode = frontendConfig?.pageGlobalConfig?.websiteClickMode ?? 'detail';
  const directArrowNewWindow = frontendConfig?.pageGlobalConfig?.directArrowNewWindow ?? true;
  const detailPageNewWindow = frontendConfig?.pageGlobalConfig?.detailPageNewWindow ?? false;
  const searchConfig = frontendConfig?.searchConfig;
  const searchEnabled = searchConfig?.enabled !== false;
  const aiSearchEnabled = searchEnabled && searchConfig?.aiSearchEnabled !== false;
  const resultPageSize = Math.max(40, normalizeResultPageSize(searchConfig?.resultsPerPage));
  const suggestionDebounceDelay = normalizeDebounceDelay(searchConfig?.debounceDelay);
  const searchInputPlaceholder = String(searchConfig?.placeholder || '').trim() || '搜索网站或文章...';
  const aiSearchButtonText = String(searchConfig?.aiSearchBtnText || 'AI 搜索').trim() || 'AI 搜索';
  const { isDirectMode, arrowLabel, arrowIsExternal } = getArrowConfigByWebsiteClickMode(websiteClickMode);

  /**
   * 生成搜索缓存键，保证不同模式与分页配置互不污染。
   */
  const buildSearchCacheKey = useCallback((mode: 'default' | 'keyword' | 'ai' | 'enhanced', query: string): string => {
    const normalizedQuery = normalizeText(query || '');
    return `${mode}:${normalizedQuery}:size-${resultPageSize}`;
  }, [resultPageSize]);

  /**
   * 将结果写入缓存（做一次浅拷贝，避免后续引用修改污染缓存）。
   */
  const setSearchCache = useCallback((cacheKey: string, rows: SearchResult[]) => {
    searchResultCacheRef.current.set(cacheKey, [ ...rows ]);
  }, []);

  /**
   * 读取缓存结果（读取时同样浅拷贝，确保列表状态独立）。
   */
  const getSearchCache = useCallback((cacheKey: string): SearchResult[] | null => {
    const rows = searchResultCacheRef.current.get(cacheKey);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [ ...rows ];
  }, []);

  /**
   * 搜索配置变更后清空缓存，避免旧规则结果污染新配置体验。
   */
  useEffect(() => {
    searchResultCacheRef.current.clear();
  }, [aiSearchEnabled, resultPageSize, searchEnabled]);

  /**
   * 上报网站点击，失败时静默处理，不阻断页面跳转。
   */
  const reportWebsiteClick = useCallback((websiteId: string) => {
    void api.post(`/websites/${websiteId}/click`).catch(() => {});
  }, []);

  // 直达箭头点击回调
  const handleDirectVisit = useCallback((tool: SearchResult, _event: React.MouseEvent) => {
    reportWebsiteClick(tool.id);
    if (isDirectMode) {
      const detailUrl = generateWebsiteUrl(permalinkConfig, { id: tool?.id, slug: tool?.slug });
      if (detailPageNewWindow) {
        window.open(detailUrl, '_blank');
      } else {
        navigate(detailUrl);
      }
      return;
    }
    const url = tool?.url;
    if (url) {
      const directUrl = appendRefParamToUrl(url, frontendConfig?.pageGlobalConfig);
      if (directArrowNewWindow) {
        window.open(directUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = directUrl;
      }
    }
  }, [isDirectMode, permalinkConfig, detailPageNewWindow, navigate, directArrowNewWindow, frontendConfig?.pageGlobalConfig, reportWebsiteClick]);
  
  // AI 侧边栏状态
  const [showAiSidebar, setShowAiSidebar] = useState(false);

  // AI 思考动画
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (aiLoading && showThinking) {
      interval = setInterval(() => {
        setAiThinkingStep(prev => (prev + 1) % AI_THINKING_STEPS.length);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [aiLoading, showThinking]);

  // 加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        debugLog.error('加载搜索历史失败', e);
      }
    }
  }, []);

  // 保存搜索历史
  const saveSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(h => h !== query)].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 清除搜索历史
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    setShowHistory(false);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  // 获取总网站数量
  const fetchTotalCount = useCallback(async () => {
    try {
      const response = await api.get('/websites', { params: { pageSize: 1 } });
      const data = unwrapApiResponse<{ pagination?: { total?: number } }>(response.data, {});
      if (data.pagination?.total) {
        setTotalWebsites(data.pagination.total);
      }
    } catch (error) {
      debugLog.error('获取网站总数失败:', error);
    }
  }, []);

  /**
   * 关闭失焦延时定时器，避免搜索下拉状态错乱。
   */
  const clearSearchBlurTimer = useCallback(() => {
    if (searchBlurTimerRef.current) {
      window.clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, []);

  /**
   * 生成本地快速建议（历史 + 热门标签），用于接口未命中时兜底。
   */
  const buildLocalSuggestions = useCallback((query: string, limit: number = 8): string[] => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    return Array.from(new Set([ ...searchHistory, ...hotSearchTags ]))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .filter(item => normalizeText(item).includes(normalizedQuery))
      .filter(item => normalizeText(item) !== normalizedQuery)
      .slice(0, limit);
  }, [hotSearchTags, searchHistory]);

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (!searchEnabled) {
      setSuggestions(buildLocalSuggestions(query, 8));
      return;
    }

    try {
      const response = await searchService.getSuggestions(query);
      const websiteSuggestions = Array.isArray(response?.websites)
        ? response.websites.map((item: any) => String(item?.name || '').trim()).filter(Boolean)
        : [];
      const categorySuggestions = Array.isArray(response?.categories)
        ? response.categories.map((item: any) => String(item?.name || '').trim()).filter(Boolean)
        : [];
      const articleSuggestions = Array.isArray(response?.articles)
        ? response.articles.map((item: any) => String(item?.name || '').trim()).filter(Boolean)
        : [];
      const localSuggestions = buildLocalSuggestions(query, 8);
      const merged = Array.from(new Set([
        ...websiteSuggestions,
        ...categorySuggestions,
        ...articleSuggestions,
        ...localSuggestions,
      ]))
        .filter(item => item !== query)
        .slice(0, 8);
      setSuggestions(merged);
    } catch (error) {
      debugLog.error('获取搜索建议失败:', error);
      setSuggestions(buildLocalSuggestions(query, 5));
    }
  }, [buildLocalSuggestions, searchEnabled]);

  /**
   * 基于当前搜索结果提取“相关搜索”关键词，并按出现频次与结果排名加权。
   */
  const generateRelatedKeywords = useCallback((results: SearchResult[], query: string) => {
    const normalizedQuery = normalizeText(query);
    const scoreMap = new Map<string, number>();

    /**
     * 写入候选关键词并累计分值。
     */
    const pushKeyword = (rawKeyword: unknown, score: number) => {
      const keyword = String(rawKeyword || '').trim();
      const lowerKeyword = normalizeText(keyword);
      if (!keyword || keyword.length < 2) return;
      if (lowerKeyword === normalizedQuery) return;
      if (lowerKeyword.includes(normalizedQuery) || normalizedQuery.includes(lowerKeyword)) return;
      scoreMap.set(keyword, Number(scoreMap.get(keyword) || 0) + score);
    };

    results.slice(0, 80).forEach((item, index) => {
      const rankWeight = Math.max(1, 16 - index);
      (item.tags || []).forEach(tag => pushKeyword(tag, rankWeight + 4));
      pushKeyword(item.category, rankWeight + 2);

      const titleTokens = String(item.name || '')
        .split(/[、，,\s/|]+/)
        .map(token => token.trim())
        .filter(token => token.length >= 2 && token.length <= 12);
      titleTokens.slice(0, 3).forEach(token => pushKeyword(token, rankWeight));
    });

    const sortedKeywords = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ keyword ]) => keyword)
      .slice(0, 10);
    setRelatedKeywords(sortedKeywords);
  }, []);

  /**
   * 执行语义扩展关键词检索：把“AI 语义”转成可命中的多关键词并行查询。
   */
  const runSemanticKeywordSearch = useCallback(async (
    query: string,
    options?: { limit?: number; excludeKeywords?: string[] }
  ): Promise<{ keywords: string[]; results: SearchResult[] }> => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return { keywords: [], results: [] };

    const excludeSet = new Set(
      (options?.excludeKeywords || []).map(keyword => normalizeText(keyword)).filter(Boolean)
    );
    const semanticKeywords = buildSemanticExpansionKeywords(query).filter((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return normalizedKeyword && normalizedKeyword !== normalizedQuery && !excludeSet.has(normalizedKeyword);
    });
    if (!semanticKeywords.length) return { keywords: [], results: [] };

    const queryLimit = Math.max(10, Math.min(Number(options?.limit || resultPageSize), 60));
    const payloadList = await Promise.all(
      semanticKeywords.map(async (keyword) => {
        try {
          const payload = await searchService.globalSearch({
            keyword,
            page: 1,
            pageSize: queryLimit,
            type: 'all',
          });
          return {
            keyword,
            rows: Array.isArray(payload?.lists)
              ? payload.lists.map(item => mapBackendSearchItem(item, 'semantic'))
              : [],
          };
        } catch (error) {
          debugLog.warn(`语义扩展词检索失败: ${keyword}`, error);
          return { keyword, rows: [] };
        }
      })
    );

    const mergedRows: SearchResult[] = [];
    const hitKeywords: string[] = [];
    payloadList.forEach((item) => {
      if (!Array.isArray(item.rows) || item.rows.length === 0) return;
      hitKeywords.push(item.keyword);
      mergedRows.push(...item.rows);
    });

    return {
      keywords: hitKeywords,
      results: dedupeAndSortResults(mergedRows, query),
    };
  }, [resultPageSize]);

  /**
   * 并行执行 AI 增强搜索，并把新增结果合并到当前普通搜索结果中。
   */
  const runAiEnhancement = useCallback(async (query: string, baseResults: SearchResult[], requestSeq: number) => {
    if (!aiSearchEnabled) return;

    setAiEnhancing(true);
    setAiEnhancedCount(0);
    setAiExpandedKeywords([]);
    const cacheKey = buildSearchCacheKey('enhanced', query);
    const cachedRows = getSearchCache(cacheKey);
    if (cachedRows) {
      if (requestSeq !== searchRequestSeqRef.current) return;
      const mergedRows = dedupeAndSortResults([ ...baseResults, ...cachedRows ], query);
      const increasedCount = Math.max(0, mergedRows.length - baseResults.length);
      const cachedSemanticKeywords = buildSemanticExpansionKeywords(query).slice(0, MAX_SEMANTIC_KEYWORDS);
      setAllResults(mergedRows);
      setSearchResults(mergedRows.slice(0, resultPageSize));
      setTotalResults(mergedRows.length);
      setHasMore(mergedRows.length > resultPageSize);
      setAiEnhancedCount(increasedCount);
      setAiExpandedKeywords(cachedSemanticKeywords);
      generateRelatedKeywords(mergedRows, query);
      setAiEnhancing(false);
      return;
    }

    try {
      const payload = await searchService.aiSearch(query, Math.max(resultPageSize * 2, 40));
      if (requestSeq !== searchRequestSeqRef.current) return;

      const aiRawResults = Array.isArray(payload?.results) ? payload.results : [];
      const aiMappedResults = aiRawResults.map(item => mapBackendSearchItem(item, 'ai', true));
      let semanticRows: SearchResult[] = [];
      let semanticKeywords: string[] = [];

      /**
       * AI 返回数量偏少时自动补一次语义扩展检索，提升“关键词覆盖”能力。
       */
      if (aiMappedResults.length < Math.max(10, Math.floor(resultPageSize / 2))) {
        const semanticResult = await runSemanticKeywordSearch(query, {
          limit: Math.max(resultPageSize, 24),
        });
        semanticRows = semanticResult.results;
        semanticKeywords = semanticResult.keywords;
      }

      const enhancedRows = dedupeAndSortResults([ ...aiMappedResults, ...semanticRows ], query);
      setSearchCache(cacheKey, enhancedRows);
      const merged = dedupeAndSortResults([ ...baseResults, ...enhancedRows ], query);
      const increasedCount = Math.max(0, merged.length - baseResults.length);

      setAllResults(merged);
      setSearchResults(merged.slice(0, resultPageSize));
      setTotalResults(merged.length);
      setHasMore(merged.length > resultPageSize);
      setAiEnhancedCount(increasedCount);
      setAiExpandedKeywords(semanticKeywords.slice(0, MAX_SEMANTIC_KEYWORDS));
      generateRelatedKeywords(merged, query);
    } catch (error) {
      debugLog.warn('AI 增强搜索失败，保留普通搜索结果:', error);
      if (requestSeq !== searchRequestSeqRef.current) return;
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
    } finally {
      if (requestSeq === searchRequestSeqRef.current) {
        setAiEnhancing(false);
      }
    }
  }, [aiSearchEnabled, buildSearchCacheKey, generateRelatedKeywords, getSearchCache, resultPageSize, runSemanticKeywordSearch, setSearchCache]);

  // 默认搜索
  const performDefaultSearch = useCallback(async () => {
    searchRequestSeqRef.current += 1;
    if (!searchEnabled) {
      setIsAiMode(false);
      setAllResults([]);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      setCurrentPage(1);
      setRelatedKeywords([]);
      setAiMessage('站内搜索功能已关闭');
      setSearchErrorMessage('');
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
      return;
    }

    setLoading(true);
    setIsAiMode(false);
    setSearchErrorMessage('');
    setAiEnhancing(false);
    setAiEnhancedCount(0);
    setAiExpandedKeywords([]);
    const cacheKey = buildSearchCacheKey('default', '__hot__');
    const cachedRows = getSearchCache(cacheKey);
    if (cachedRows) {
      setAllResults(cachedRows);
      setSearchResults(cachedRows.slice(0, resultPageSize));
      setTotalResults(cachedRows.length);
      setHasMore(cachedRows.length > resultPageSize);
      setCurrentPage(1);
      setRelatedKeywords([]);
      setAiMessage('');
      setSearchErrorMessage('');
      setLoading(false);
      return;
    }

    try {
      /**
       * 默认态展示热门站点，避免空搜索页无内容
       */
      const response = await api.get('/websites/hot/list', {
        params: { limit: Math.max(resultPageSize * 2, 24) },
      });
      const raw = unwrapApiResponse<BackendSearchItem[] | { websites?: BackendSearchItem[] }>(response.data, []);
      const list = Array.isArray(raw) ? raw : (raw?.websites || []);
      const mapped = (Array.isArray(list) ? list : []).map(item => mapBackendSearchItem(item, 'hot'));
      const uniqueResults = dedupeAndSortResults(mapped, '');
      setSearchCache(cacheKey, uniqueResults);

      setAllResults(uniqueResults);
      setSearchResults(uniqueResults.slice(0, resultPageSize));
      setTotalResults(uniqueResults.length);
      setHasMore(uniqueResults.length > resultPageSize);
      setCurrentPage(1);
      setRelatedKeywords([]);
      setAiMessage('');
      setSearchErrorMessage('');
    } catch (error) {
      setAllResults([]);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      setSearchErrorMessage(extractApiErrorMessage(error));
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [buildSearchCacheKey, getSearchCache, resultPageSize, searchEnabled, setSearchCache]);

  /**
   * 执行普通搜索（统一走后端 /api/search 契约）
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      performDefaultSearch();
      return;
    }

    if (!searchEnabled) {
      setIsAiMode(false);
      setAllResults([]);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      setCurrentPage(1);
      setAiMessage('站内搜索功能已关闭');
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
      return;
    }

    const requestSeq = searchRequestSeqRef.current + 1;
    searchRequestSeqRef.current = requestSeq;
    setLoading(true);
    setIsAiMode(false);
    setSearchErrorMessage('');
    setAiEnhancing(false);
    setAiEnhancedCount(0);
    setAiExpandedKeywords([]);
    saveSearchHistory(query);
    const cacheKey = buildSearchCacheKey('keyword', query);
    const cachedRows = getSearchCache(cacheKey);
    if (cachedRows) {
      if (requestSeq !== searchRequestSeqRef.current) return;
      setAllResults(cachedRows);
      setSearchResults(cachedRows.slice(0, resultPageSize));
      setTotalResults(cachedRows.length);
      setHasMore(cachedRows.length > resultPageSize);
      setCurrentPage(1);
      generateRelatedKeywords(cachedRows, query);
      setAiMessage('');
      setSearchErrorMessage('');
      setLoading(false);
      if (query.trim() && aiSearchEnabled) {
        runAiEnhancement(query, cachedRows, requestSeq);
      }
      return;
    }

    try {
      const payload = await searchService.globalSearch({
        keyword: query,
        page: 1,
        pageSize: Math.max(resultPageSize * 4, 80),
        type: 'all',
      });
      const list = Array.isArray(payload?.lists) ? payload.lists : [];
      const mapped = list.map(item => mapBackendSearchItem(item, String(item?.source || 'global')));
      const uniqueResults = dedupeAndSortResults(mapped, query);
      setSearchCache(cacheKey, uniqueResults);

      if (requestSeq !== searchRequestSeqRef.current) return;

      setAllResults(uniqueResults);
      setSearchResults(uniqueResults.slice(0, resultPageSize));
      setTotalResults(uniqueResults.length);
      setHasMore(uniqueResults.length > resultPageSize);
      setCurrentPage(1);
      generateRelatedKeywords(uniqueResults, query);
      setAiMessage('');
      setSearchErrorMessage('');

      /**
       * 普通搜索完成后并行补充 AI 推荐，避免用户等待主结果。
       */
      if (query.trim() && aiSearchEnabled) {
        runAiEnhancement(query, uniqueResults, requestSeq);
      }
    } catch (error) {
      debugLog.error('普通搜索失败:', error);
      if (requestSeq !== searchRequestSeqRef.current) return;
      setAllResults([]);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      setAiMessage(extractApiErrorMessage(error));
      setSearchErrorMessage(extractApiErrorMessage(error));
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
    } finally {
      if (requestSeq === searchRequestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [aiSearchEnabled, buildSearchCacheKey, generateRelatedKeywords, getSearchCache, performDefaultSearch, resultPageSize, runAiEnhancement, saveSearchHistory, searchEnabled, setSearchCache]);

  /**
   * 执行 AI 搜索（统一走后端 /api/ai-search 契约）
   */
  const performAiSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    if (!searchEnabled) {
      setIsAiMode(false);
      setAiMessage('站内搜索功能已关闭');
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
      return;
    }

    if (!aiSearchEnabled) {
      setIsAiMode(false);
      setAiMessage('AI 搜索功能已关闭');
      setAiEnhancing(false);
      setAiEnhancedCount(0);
      setAiExpandedKeywords([]);
      return;
    }

    const requestSeq = searchRequestSeqRef.current + 1;
    searchRequestSeqRef.current = requestSeq;
    setAiLoading(true);
    setIsAiMode(true);
    setShowThinking(true);
    setAiThinkingStep(0);
    setAiMessage('');
    setSearchErrorMessage('');
    setAiEnhancing(false);
    setAiEnhancedCount(0);
    setAiExpandedKeywords([]);
    saveSearchHistory(query);
    const cacheKey = buildSearchCacheKey('ai', query);
    const cachedRows = getSearchCache(cacheKey);
    if (cachedRows) {
      if (requestSeq !== searchRequestSeqRef.current) return;
      setShowThinking(false);
      const cachedSemanticKeywords = buildSemanticExpansionKeywords(query).slice(0, MAX_SEMANTIC_KEYWORDS);
      setAllResults(cachedRows);
      setSearchResults(cachedRows.slice(0, resultPageSize));
      setTotalResults(cachedRows.length);
      setHasMore(cachedRows.length > resultPageSize);
      setCurrentPage(1);
      setAiMessage(`AI 智能推荐找到 ${cachedRows.length} 个结果（缓存）`);
      setSearchErrorMessage('');
      setAiExpandedKeywords(cachedSemanticKeywords);
      generateRelatedKeywords(cachedRows, query);
      setAiLoading(false);
      return;
    }

    try {
      const payload = await searchService.aiSearch(query, Math.max(resultPageSize * 4, 80));
      if (requestSeq !== searchRequestSeqRef.current) return;
      setShowThinking(false);

      if (Array.isArray(payload.results) && payload.results.length > 0) {
        const mappedResults = payload.results.map(item => mapBackendSearchItem(item, 'ai', true));
        let results = dedupeAndSortResults(mappedResults, query);
        let semanticKeywords: string[] = [];
        let semanticRows: SearchResult[] = [];

        /**
         * 当 AI 结果较少时，自动补充关键词检索结果，降低“命中太少”体感。
         */
        if (results.length < Math.max(8, Math.floor(resultPageSize / 2))) {
          const semanticResult = await runSemanticKeywordSearch(query, {
            limit: Math.max(resultPageSize * 2, 60),
          });
          semanticKeywords = semanticResult.keywords;
          semanticRows = semanticResult.results;
          results = dedupeAndSortResults([ ...results, ...semanticRows ], query);

          try {
            const keywordPayload = await searchService.globalSearch({
              keyword: query,
              page: 1,
              pageSize: Math.max(resultPageSize * 2, 60),
              type: 'all',
            });
            const keywordRows = Array.isArray(keywordPayload?.lists)
              ? keywordPayload.lists.map(item => mapBackendSearchItem(item, String(item?.source || 'global')))
              : [];
            results = dedupeAndSortResults([ ...results, ...keywordRows ], query);
          } catch (mergeError) {
            debugLog.warn('AI 搜索补充关键词结果失败:', mergeError);
          }
        }
        setSearchCache(cacheKey, results);

        setAllResults(results);
        setSearchResults(results.slice(0, resultPageSize));
        setTotalResults(results.length);
        setHasMore(results.length > resultPageSize);
        setCurrentPage(1);

        // 显示 AI 的推荐理由
        const modeText = payload.mode === 'ai' ? 'AI 智能推荐' : '关键词匹配';
        const reasonText = payload.reason ? ` - ${payload.reason}` : '';
        const semanticText = semanticKeywords.length > 0 ? ` · 语义扩展 ${semanticKeywords.join(' / ')}` : '';
        setAiMessage(`${modeText}找到 ${results.length} 个结果${reasonText}${semanticText}`);
        setSearchErrorMessage('');
        setAiExpandedKeywords(semanticKeywords.slice(0, MAX_SEMANTIC_KEYWORDS));

        generateRelatedKeywords(results, query);
      } else {
        const semanticResult = await runSemanticKeywordSearch(query, {
          limit: Math.max(resultPageSize * 2, 60),
        });
        if (semanticResult.results.length > 0) {
          const rows = dedupeAndSortResults(semanticResult.results, query);
          setSearchCache(cacheKey, rows);
          setAllResults(rows);
          setSearchResults(rows.slice(0, resultPageSize));
          setTotalResults(rows.length);
          setHasMore(rows.length > resultPageSize);
          setCurrentPage(1);
          setAiExpandedKeywords(semanticResult.keywords.slice(0, MAX_SEMANTIC_KEYWORDS));
          setAiMessage(`AI 语义扩展已返回 ${rows.length} 个结果 · ${semanticResult.keywords.join(' / ')}`);
          setSearchErrorMessage('');
          generateRelatedKeywords(rows, query);
        } else {
          setAllResults([]);
          setSearchResults([]);
          setTotalResults(0);
          setHasMore(false);
          setAiMessage('AI 未找到相关结果，请尝试其他描述');
          setSearchErrorMessage('');
          setAiExpandedKeywords([]);
        }
      }
    } catch (error: unknown) {
      debugLog.error('AI 搜索失败:', error);
      if (requestSeq !== searchRequestSeqRef.current) return;
      setShowThinking(false);
      setAiMessage('AI 搜索暂时不可用，已切换到普通搜索');
      setIsAiMode(false);
      setAiExpandedKeywords([]);
      performSearch(query);
    } finally {
      if (requestSeq === searchRequestSeqRef.current) {
        setAiLoading(false);
      }
    }
  }, [aiSearchEnabled, buildSearchCacheKey, generateRelatedKeywords, getSearchCache, performSearch, resultPageSize, runSemanticKeywordSearch, saveSearchHistory, searchEnabled, setSearchCache]);

  // 来源筛选后的结果
  const sourceFilteredResults = useMemo(() => {
    if (sourceFilter === 'all') return allResults;
    return allResults.filter(r => r.source === sourceFilter);
  }, [allResults, sourceFilter]);

  /**
   * 计算分类分布（基于来源筛选后的结果）。
   */
  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, { key: string; label: string; count: number }>();
    sourceFilteredResults.forEach((item) => {
      const categoryLabel = String(item.category || '').trim();
      if (!categoryLabel) return;
      const categoryKey = normalizeCategoryFilterKey(categoryLabel);
      if (!categoryKey) return;
      const current = categoryMap.get(categoryKey);
      if (current) {
        current.count += 1;
        return;
      }
      categoryMap.set(categoryKey, {
        key: categoryKey,
        label: categoryLabel,
        count: 1,
      });
    });
    return Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'))
      .slice(0, 14);
  }, [sourceFilteredResults]);

  // 来源 + 分类筛选后的结果
  const categoryFilteredResults = useMemo(() => {
    if (categoryFilter === 'all') return sourceFilteredResults;
    return sourceFilteredResults.filter((item) => {
      return normalizeCategoryFilterKey(item.category) === categoryFilter;
    });
  }, [categoryFilter, sourceFilteredResults]);

  /**
   * 计算标签分布（基于来源 + 分类筛选后的结果）。
   */
  const tagBreakdown = useMemo(() => {
    const tagMap = new Map<string, { key: string; label: string; count: number }>();
    categoryFilteredResults.forEach((item) => {
      if (!Array.isArray(item.tags)) return;
      item.tags.forEach((rawTag) => {
        const tagLabel = String(rawTag || '').trim();
        if (!tagLabel) return;
        const tagKey = normalizeTagFilterKey(tagLabel);
        if (!tagKey) return;
        const current = tagMap.get(tagKey);
        if (current) {
          current.count += 1;
          return;
        }
        tagMap.set(tagKey, {
          key: tagKey,
          label: tagLabel,
          count: 1,
        });
      });
    });
    return Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'))
      .slice(0, 18);
  }, [categoryFilteredResults]);

  /**
   * 分类筛选默认折叠展示，避免标签过多导致区域过高；当前已选项始终保留可见。
   */
  const visibleCategoryBreakdown = useMemo(() => {
    if (categoryExpanded || categoryBreakdown.length <= CATEGORY_CHIP_COLLAPSE_COUNT) {
      return categoryBreakdown;
    }
    if (categoryFilter === 'all') {
      return categoryBreakdown.slice(0, CATEGORY_CHIP_COLLAPSE_COUNT);
    }
    const selected = categoryBreakdown.find(item => item.key === categoryFilter);
    if (!selected) {
      return categoryBreakdown.slice(0, CATEGORY_CHIP_COLLAPSE_COUNT);
    }
    const topItems = categoryBreakdown.slice(0, CATEGORY_CHIP_COLLAPSE_COUNT - 1);
    if (topItems.some(item => item.key === selected.key)) {
      return categoryBreakdown.slice(0, CATEGORY_CHIP_COLLAPSE_COUNT);
    }
    return [ ...topItems, selected ];
  }, [categoryBreakdown, categoryExpanded, categoryFilter]);

  /**
   * 标签筛选默认折叠展示，避免标签过密；当前已选项始终保留可见。
   */
  const visibleTagBreakdown = useMemo(() => {
    if (tagExpanded || tagBreakdown.length <= TAG_CHIP_COLLAPSE_COUNT) {
      return tagBreakdown;
    }
    if (tagFilter === 'all') {
      return tagBreakdown.slice(0, TAG_CHIP_COLLAPSE_COUNT);
    }
    const selected = tagBreakdown.find(item => item.key === tagFilter);
    if (!selected) {
      return tagBreakdown.slice(0, TAG_CHIP_COLLAPSE_COUNT);
    }
    const topItems = tagBreakdown.slice(0, TAG_CHIP_COLLAPSE_COUNT - 1);
    if (topItems.some(item => item.key === selected.key)) {
      return tagBreakdown.slice(0, TAG_CHIP_COLLAPSE_COUNT);
    }
    return [ ...topItems, selected ];
  }, [tagBreakdown, tagExpanded, tagFilter]);

  // 来源 + 分类 + 标签筛选后的结果
  const filteredResults = useMemo(() => {
    if (tagFilter === 'all') return categoryFilteredResults;
    return categoryFilteredResults.filter((item) => {
      return Array.isArray(item.tags)
        && item.tags.some((tag) => normalizeTagFilterKey(tag) === tagFilter);
    });
  }, [categoryFilteredResults, tagFilter]);

  /**
   * 动态计算来源筛选项，避免后端来源键变化时筛选器失效
   */
  const sourceFilterOptions = useMemo(() => {
    const entries = Array.from(
      new Set(
        allResults
          .map(item => String(item.source || '').trim())
          .filter(Boolean)
      )
    );
    const options = [ { value: 'all', label: '全部来源' } ];
    const labelMap: Record<string, string> = {
      ai: 'AI 推荐',
      global: '关键词检索',
      hot: '热门推荐',
    };
    entries.forEach((sourceKey) => {
      options.push({
        value: sourceKey,
        label: labelMap[sourceKey] || sourceKey,
      });
    });
    return options;
  }, [allResults]);

  /**
   * 当前是否存在激活筛选项（来源/分类/标签）。
   */
  const hasActiveSearchFilter = sourceFilter !== 'all' || categoryFilter !== 'all' || tagFilter !== 'all';

  /**
   * 获取当前来源筛选显示文案，用于“当前筛选”摘要区。
   */
  const activeSourceFilterLabel = useMemo(() => {
    return sourceFilterOptions.find(option => option.value === sourceFilter)?.label || sourceFilter;
  }, [sourceFilter, sourceFilterOptions]);

  /**
   * 获取当前分类筛选显示文案，优先从分类分布中取真实标签名。
   */
  const activeCategoryFilterLabel = useMemo(() => {
    if (categoryFilter === 'all') return '';
    return categoryBreakdown.find(item => item.key === categoryFilter)?.label || categoryFilter;
  }, [categoryBreakdown, categoryFilter]);

  /**
   * 获取当前标签筛选显示文案，优先从标签分布中取真实标签名。
   */
  const activeTagFilterLabel = useMemo(() => {
    if (tagFilter === 'all') return '';
    return tagBreakdown.find(item => item.key === tagFilter)?.label || tagFilter;
  }, [tagBreakdown, tagFilter]);

  /**
   * 当前激活的筛选项数量，用于结果区筛选按钮提示。
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== 'all') count += 1;
    if (categoryFilter !== 'all') count += 1;
    if (tagFilter !== 'all') count += 1;
    return count;
  }, [categoryFilter, sourceFilter, tagFilter]);

  /**
   * 计算来源分布，用于展示“当前结果构成”并支持一键切换来源。
   */
  const sourceBreakdown = useMemo(() => {
    const sourceCountMap = new Map<string, number>();
    allResults.forEach((item) => {
      const sourceKey = String(item.source || '').trim();
      if (!sourceKey) return;
      sourceCountMap.set(sourceKey, Number(sourceCountMap.get(sourceKey) || 0) + 1);
    });

    return sourceFilterOptions
      .filter(option => option.value !== 'all')
      .map(option => ({
        ...option,
        count: Number(sourceCountMap.get(option.value) || 0),
      }))
      .filter(option => option.count > 0);
  }, [allResults, sourceFilterOptions]);

  /**
   * AI 快速改写推荐：结合语义扩展词、相关词与常见后缀模板生成可执行检索词。
   */
  const aiRewriteSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return buildAiRewriteSuggestions(searchQuery, aiExpandedKeywords, relatedKeywords);
  }, [aiExpandedKeywords, relatedKeywords, searchQuery]);

  /**
   * 统一计算搜索下拉展示模式，避免历史与建议同时出现。
   */
  const dropdownMode = useMemo<'history' | 'suggestions' | null>(() => {
    if (!isSearchInputFocused) return null;
    if (showSuggestions && suggestions.length > 0) return 'suggestions';
    if (showHistory && searchHistory.length > 0) return 'history';
    return null;
  }, [isSearchInputFocused, searchHistory.length, showHistory, showSuggestions, suggestions.length]);

  /**
   * 当来源筛选项变化时，兜底纠正失效的筛选值
   */
  useEffect(() => {
    const valid = sourceFilterOptions.some(option => option.value === sourceFilter);
    if (!valid) {
      setSourceFilter('all');
    }
  }, [sourceFilter, sourceFilterOptions]);

  /**
   * 当分类筛选项失效时自动回退到“全部分类”。
   */
  useEffect(() => {
    if (categoryFilter === 'all') return;
    const valid = categoryBreakdown.some((item) => item.key === categoryFilter);
    if (!valid) {
      setCategoryFilter('all');
    }
  }, [categoryBreakdown, categoryFilter]);

  /**
   * 当标签筛选项失效时自动回退到“全部标签”。
   */
  useEffect(() => {
    if (tagFilter === 'all') return;
    const valid = tagBreakdown.some((item) => item.key === tagFilter);
    if (!valid) {
      setTagFilter('all');
    }
  }, [tagBreakdown, tagFilter]);

  // 应用筛选和分页
  useEffect(() => {
    const start = 0;
    const end = currentPage * resultPageSize;
    setSearchResults(filteredResults.slice(start, end));
    setTotalResults(filteredResults.length);
    setHasMore(filteredResults.length > end);
  }, [currentPage, filteredResults, resultPageSize]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading]);

  /**
   * 加载热门搜索关键词（用于搜索建议和 Hero 热门标签）
   */
  useEffect(() => {
    const run = async () => {
      if (!searchEnabled) {
        setHotSearchTags(HOT_SEARCH_TAGS);
        return;
      }
      try {
        const hotList = await searchService.getHotSearches();
        const normalized = (Array.isArray(hotList) ? hotList : [])
          .map(item => String(item || '').trim())
          .filter(Boolean);
        setHotSearchTags(normalized.length > 0 ? normalized.slice(0, 12) : HOT_SEARCH_TAGS);
      } catch (error) {
        debugLog.warn('加载热门搜索失败，回退默认标签:', error);
        setHotSearchTags(HOT_SEARCH_TAGS);
      }
    };
    run();
  }, [searchEnabled]);

  /**
   * 从 URL 解析搜索参数（支持 `?ai=1` 直达 AI 搜索）
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    const isAiQuery = params.get('ai') === '1';
    const source = params.get('source') || 'all';
    const category = normalizeCategoryFilterKey(params.get('category') || 'all') || 'all';
    const tag = normalizeTagFilterKey(params.get('tag') || 'all') || 'all';
    const nextAiMode = isAiQuery && aiSearchEnabled;

    setSearchQuery(query);
    setSourceFilter(source);
    setCategoryFilter(category);
    setTagFilter(tag);

    const shouldRunSearch = (
      !lastUrlSearchRef.current ||
      lastUrlSearchRef.current.query !== query ||
      lastUrlSearchRef.current.ai !== nextAiMode
    );
    if (shouldRunSearch) {
      if (query) {
        if (nextAiMode) {
          performAiSearch(query);
        } else {
          performSearch(query);
        }
      } else {
        performDefaultSearch();
      }
      lastUrlSearchRef.current = { query, ai: nextAiMode };
    }
  }, [aiSearchEnabled, location.search, performAiSearch, performDefaultSearch, performSearch]);

  /**
   * 站点总量属于全局信息，页面初次渲染时获取一次即可。
   */
  useEffect(() => {
    fetchTotalCount();
  }, [fetchTotalCount]);

  /**
   * 搜索词或来源变化时重置“更多/收起”状态，避免旧状态影响新结果集阅读。
   */
  useEffect(() => {
    setCategoryExpanded(false);
    setTagExpanded(false);
  }, [searchQuery, sourceFilter]);

  /**
   * 无检索词时关闭结果区筛选面板，避免默认推荐场景视觉冗余。
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowResultFilters(false);
    }
  }, [searchQuery]);

  /**
   * 筛选浮层展开时监听外部点击与 ESC，保持“点击即关”的轻交互。
   */
  useEffect(() => {
    if (!showResultFilters) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (!filterPopoverRef.current) return;
      if (filterPopoverRef.current.contains(event.target as Node)) return;
      setShowResultFilters(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowResultFilters(false);
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showResultFilters]);

  // 处理搜索 - 使用普通关键词搜索
  const handleSearch = useCallback((value: string) => {
    const newQuery = value.trim();
    clearSearchBlurTimer();
    setIsSearchInputFocused(false);
    setShowSuggestions(false);
    setShowHistory(false);
    
    if (newQuery) {
      const params = new URLSearchParams();
      params.set('q', newQuery);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (tagFilter !== 'all') params.set('tag', tagFilter);
      const newUrl = `/search?${params.toString()}`;
      const currentUrl = location.pathname + location.search;
      
      if (newUrl !== currentUrl) {
        navigate(newUrl);
      } else {
        // URL 相同，直接触发普通搜索
        performSearch(newQuery);
      }
    } else {
      navigate('/search');
    }
  }, [categoryFilter, clearSearchBlurTimer, sourceFilter, tagFilter, location.pathname, location.search, navigate, performSearch]);

  /**
   * 在“关键词搜索 / AI 搜索”之间切换，并同步 URL 参数，便于刷新后保持模式。
   */
  const handleSearchModeSwitch = useCallback((mode: 'keyword' | 'ai') => {
    const normalizedQuery = String(searchQuery || '').trim();
    if (!normalizedQuery) return;

    const params = new URLSearchParams(location.search);
    params.set('q', normalizedQuery);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    else params.delete('source');
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    else params.delete('category');
    if (tagFilter !== 'all') params.set('tag', tagFilter);
    else params.delete('tag');

    if (mode === 'ai' && aiSearchEnabled) params.set('ai', '1');
    else params.delete('ai');

    const nextSearch = params.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    const currentUrl = `${location.pathname}${location.search}`;
    if (nextUrl !== currentUrl) {
      navigate(nextUrl);
      return;
    }

    if (mode === 'ai' && aiSearchEnabled) {
      performAiSearch(normalizedQuery);
      return;
    }
    performSearch(normalizedQuery);
  }, [aiSearchEnabled, categoryFilter, location.pathname, location.search, navigate, performAiSearch, performSearch, searchQuery, sourceFilter, tagFilter]);

  // 处理搜索输入变化
  const handleSearchChange = useCallback((value: string) => {
    const trimmedValue = value.trim();
    setSearchQuery(value);
    setShowHistory(trimmedValue.length === 0 && isSearchInputFocused && searchHistory.length > 0);
    setShowSuggestions(false);

    if (suggestionDebounceTimerRef.current) {
      window.clearTimeout(suggestionDebounceTimerRef.current);
      suggestionDebounceTimerRef.current = null;
    }

    if (trimmedValue.length === 0) {
      setSuggestions([]);
      return;
    }

    if (trimmedValue.length < 2) {
      const localSuggestions = buildLocalSuggestions(trimmedValue, 6);
      setSuggestions(localSuggestions);
      setShowSuggestions(localSuggestions.length > 0);
      setShowHistory(false);
      return;
    }

    setShowSuggestions(true);
    setShowHistory(false);
    suggestionDebounceTimerRef.current = window.setTimeout(() => {
      fetchSuggestions(trimmedValue);
    }, suggestionDebounceDelay);
  }, [buildLocalSuggestions, fetchSuggestions, isSearchInputFocused, searchHistory.length, suggestionDebounceDelay]);

  /**
   * 搜索输入框聚焦时展示历史或建议，提高二次检索效率。
   */
  const handleSearchInputFocus = useCallback(() => {
    clearSearchBlurTimer();
    setIsSearchInputFocused(true);

    const trimmedValue = searchQuery.trim();
    if (trimmedValue.length >= 2) {
      setShowSuggestions(true);
      setShowHistory(false);
      void fetchSuggestions(trimmedValue);
      return;
    }

    if (trimmedValue.length > 0) {
      const localSuggestions = buildLocalSuggestions(trimmedValue, 6);
      setSuggestions(localSuggestions);
      setShowSuggestions(localSuggestions.length > 0);
      setShowHistory(false);
      return;
    }

    setShowSuggestions(false);
    setShowHistory(searchHistory.length > 0);
  }, [buildLocalSuggestions, clearSearchBlurTimer, fetchSuggestions, searchHistory.length, searchQuery]);

  /**
   * 搜索输入框失焦时延迟关闭下拉，确保可点击下拉项。
   */
  const handleSearchInputBlur = useCallback(() => {
    clearSearchBlurTimer();
    searchBlurTimerRef.current = window.setTimeout(() => {
      setIsSearchInputFocused(false);
      setShowSuggestions(false);
      setShowHistory(false);
    }, 140);
  }, [clearSearchBlurTimer]);

  /**
   * 处理下拉面板的鼠标按下事件，防止 input blur 导致下拉瞬间关闭。
   */
  const handleDropdownMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearSearchBlurTimer();
  }, [clearSearchBlurTimer]);

  /**
   * 组件卸载时清理搜索建议/失焦定时器，避免内存泄漏。
   */
  useEffect(() => {
    return () => {
      if (suggestionDebounceTimerRef.current) {
        window.clearTimeout(suggestionDebounceTimerRef.current);
      }
      clearSearchBlurTimer();
    };
  }, [clearSearchBlurTimer]);

  // 处理热门标签点击
  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    handleSearch(tag);
  };

  /**
   * 执行 AI 改写词检索：写入 URL 并强制使用 ai=1，保持刷新后状态一致。
   * @param keyword 改写关键词
   */
  const handleAiRewriteSearch = useCallback((keyword: string) => {
    const normalizedKeyword = String(keyword || '').trim();
    if (!normalizedKeyword) return;
    clearSearchBlurTimer();
    setSearchQuery(normalizedKeyword);
    const params = new URLSearchParams(location.search);
    params.set('q', normalizedKeyword);
    params.set('ai', '1');
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    else params.delete('source');
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    else params.delete('category');
    if (tagFilter !== 'all') params.set('tag', tagFilter);
    else params.delete('tag');
    navigate(`${location.pathname}?${params.toString()}`);
  }, [categoryFilter, clearSearchBlurTimer, location.pathname, location.search, navigate, sourceFilter, tagFilter]);

  /**
   * 处理来源筛选变化，并同步 URL 参数，便于刷新后保持筛选状态。
   */
  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);
    if (source === 'all') params.delete('source');
    else params.set('source', source);
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  };

  /**
   * 处理分类筛选切换，并同步 URL 参数，保证刷新后筛选状态不丢失。
   */
  const handleCategoryChange = useCallback((category: string) => {
    const nextCategory = String(category || 'all').trim() || 'all';
    setCategoryFilter(nextCategory);
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);
    if (nextCategory === 'all') params.delete('category');
    else params.set('category', nextCategory);
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  /**
   * 处理标签筛选切换，并同步 URL 参数，保证刷新后筛选状态不丢失。
   */
  const handleTagFilterChange = useCallback((tag: string) => {
    const nextTag = String(tag || 'all').trim() || 'all';
    setTagFilter(nextTag);
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);
    if (nextTag === 'all') params.delete('tag');
    else params.set('tag', nextTag);
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  /**
   * 一键清空来源/分类/标签筛选并同步 URL 参数。
   */
  const handleResetSearchFilters = useCallback(() => {
    setSourceFilter('all');
    setCategoryFilter('all');
    setTagFilter('all');
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);
    params.delete('source');
    params.delete('category');
    params.delete('tag');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  // 处理网站点击
  const handleWebsiteClick = (website: SearchResult) => {
    reportWebsiteClick(website.id);
    if (isDirectMode) {
      const directUrl = appendRefParamToUrl(website.url, frontendConfig?.pageGlobalConfig);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const detailUrl = generateWebsiteUrl(permalinkConfig, { id: website.id, slug: website.slug });
    if (detailPageNewWindow) {
      window.open(detailUrl, '_blank');
    } else {
      navigate(detailUrl);
    }
  };

  const isLoading = loading || aiLoading;
  /**
   * 空状态推荐词：优先相关搜索，其次热门词与历史词，去重后用于快速二次检索。
   */
  const emptySuggestionKeywords = useMemo(() => {
    const source = [ ...relatedKeywords, ...hotSearchTags, ...searchHistory ]
      .map(item => String(item || '').trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const normalizedQuery = normalizeText(searchQuery);
    const result: string[] = [];
    source.forEach((item) => {
      const lower = normalizeText(item);
      if (!lower) return;
      if (lower === normalizedQuery) return;
      if (seen.has(lower)) return;
      seen.add(lower);
      result.push(item);
    });
    return result.slice(0, 10);
  }, [relatedKeywords, hotSearchTags, searchHistory, searchQuery]);

  /**
   * 构建关键词悬停预览文案，用于“相关搜索/推荐词”的 hover preview。
   */
  const buildKeywordPreviewText = useCallback((keyword: string): string => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return '点击检索该关键词';
    const matched = allResults.filter((item) => {
      const name = normalizeText(item.name);
      const category = normalizeText(item.category || '');
      const description = normalizeText(item.description);
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => normalizeText(tag)) : [];
      return (
        name.includes(normalizedKeyword) ||
        category.includes(normalizedKeyword) ||
        description.includes(normalizedKeyword) ||
        tags.some((tag) => tag.includes(normalizedKeyword))
      );
    });
    if (matched.length === 0) return '点击检索该关键词';
    const examples = matched
      .slice(0, 3)
      .map((item) => String(item.name || '').trim())
      .filter(Boolean)
      .join(' / ');
    return examples ? `匹配 ${matched.length} 条：${examples}` : `匹配 ${matched.length} 条结果`;
  }, [allResults]);

  return (
    <div className="search-page" style={{ '--bg-image': `url(${bgImage})` } as React.CSSProperties}>
      <AdBanner
        pageSlug="search"
        position="global_strip"
        limit={1}
        className="search-page__top-banner"
      />
      <div className="search-hero-zone">
        <HeroBanner
          pageType="search"
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearch}
          onSearchFocus={handleSearchInputFocus}
          onSearchBlur={handleSearchInputBlur}
          hotTags={hotSearchTags}
          onTagClick={handleTagClick}
          searchPlaceholder={searchInputPlaceholder}
          searchPageType="all"
          showStats={true}
          customTitle="全站搜索"
          customDescription={`收录 ${totalWebsites.toLocaleString()} 个优质网站资源`}
          aiSearchEnabled={aiSearchEnabled}
          aiSearchBtnText={aiSearchButtonText}
        />
        {dropdownMode && (
          <div className="search-dropdown-wrapper">
            <div
              className="search-dropdown"
              ref={searchDropdownRef}
              onMouseDown={handleDropdownMouseDown}
            >
              <div className="dropdown-header">
                <span>{dropdownMode === 'history' ? '搜索历史' : '搜索建议'}</span>
                {dropdownMode === 'history' && (
                  <button onClick={clearSearchHistory}>清除</button>
                )}
              </div>
              {dropdownMode === 'history' && searchHistory.map((historyKeyword, index) => (
                <button
                  type="button"
                  key={`history-${index}`}
                  className="dropdown-item"
                  onClick={() => {
                    setSearchQuery(historyKeyword);
                    handleSearch(historyKeyword);
                  }}
                >
                  <span className="history-icon">🕐</span>
                  {historyKeyword}
                </button>
              ))}
              {dropdownMode === 'suggestions' && suggestions.map((suggestion, index) => (
                <button
                  type="button"
                  key={`suggestion-${index}`}
                  className="dropdown-item"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    handleSearch(suggestion);
                  }}
                >
                  <span className="suggestion-icon">🔍</span>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="search-content">
        {/* 搜索状态聚合区：标题、模式、筛选入口、AI提示统一放在同一个卡片内 */}
        <div className="search-unified-panel">
          <div className="search-header">
            <div className="search-stats-info">
              {!searchEnabled ? (
                <>
                  <h2>站内搜索已关闭</h2>
                  <p>请在后台「站点设置 - 搜索配置」中开启后使用。</p>
                </>
              ) : searchQuery ? (
                <>
                  <h2>"{searchQuery}" 的搜索结果</h2>
                  <p>
                    {isAiMode && <span className="ai-badge-inline">AI</span>}
                    找到 <strong>{totalResults}</strong> 个相关资源
                  </p>
                </>
              ) : (
                <>
                  <h2>热门推荐</h2>
                  <p>为您精选 <strong>{totalResults}</strong> 个优质资源</p>
                </>
              )}
            </div>

            <div className="search-actions">
              {/* AI 搜索按钮 */}
              {aiSearchEnabled && (
                <button
                  className={`ai-search-toggle ${showAiSidebar ? 'active' : ''}`}
                  onClick={() => setShowAiSidebar(!showAiSidebar)}
                  title="AI 智能搜索"
                >
                  <span className="ai-toggle-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="10" x="3" y="11" rx="2"/>
                      <circle cx="12" cy="5" r="2"/>
                      <path d="M12 7v4"/>
                      <line x1="8" x2="8" y1="16" y2="16"/>
                      <line x1="16" x2="16" y1="16" y2="16"/>
                    </svg>
                  </span>
                  <span className="ai-toggle-text">{aiSearchButtonText}</span>
                </button>
              )}

              {searchQuery && (
                <div className="search-mode-switch">
                  <button
                    type="button"
                    className={`search-mode-btn ${!isAiMode ? 'active' : ''}`}
                    onClick={() => handleSearchModeSwitch('keyword')}
                  >
                    关键词
                  </button>
                  {aiSearchEnabled && (
                    <button
                      type="button"
                      className={`search-mode-btn ${isAiMode ? 'active' : ''}`}
                      onClick={() => handleSearchModeSwitch('ai')}
                    >
                      AI 语义
                    </button>
                  )}
                </div>
              )}

              {searchQuery && (
                <div className="search-filter-anchor" ref={filterPopoverRef}>
                  <div className="search-result-toolbar">
                    <button
                      type="button"
                      className={`search-filter-icon-btn ${showResultFilters ? 'active' : ''}`}
                      onClick={() => setShowResultFilters(prev => !prev)}
                      title="筛选"
                      aria-label="筛选"
                      aria-expanded={showResultFilters}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
                    </button>
                  </div>

                  {showResultFilters && (
                    <div className="search-filter-popover">
                      <div className="search-filter-popover__head">
                        <span className="search-filter-popover__title">筛选</span>
                        <div className="search-filter-popover__head-actions">
                          {hasActiveSearchFilter && (
                            <button
                              type="button"
                              className="search-clear-filters-btn"
                              onClick={handleResetSearchFilters}
                            >
                              清空筛选
                            </button>
                          )}
                          <button
                            type="button"
                            className="search-filter-popover__collapse"
                            onClick={() => setShowResultFilters(false)}
                          >
                            收起
                          </button>
                        </div>
                      </div>

                      {hasActiveSearchFilter && (
                        <div className="search-filter-popover__active">
                          {sourceFilter !== 'all' && (
                            <button
                              type="button"
                              className="search-active-filter-chip"
                              onClick={() => handleSourceChange('all')}
                            >
                              <span>来源：{activeSourceFilterLabel}</span>
                              <strong>×</strong>
                            </button>
                          )}
                          {categoryFilter !== 'all' && (
                            <button
                              type="button"
                              className="search-active-filter-chip"
                              onClick={() => handleCategoryChange('all')}
                            >
                              <span>分类：{activeCategoryFilterLabel}</span>
                              <strong>×</strong>
                            </button>
                          )}
                          {tagFilter !== 'all' && (
                            <button
                              type="button"
                              className="search-active-filter-chip"
                              onClick={() => handleTagFilterChange('all')}
                            >
                              <span>标签：{activeTagFilterLabel}</span>
                              <strong>×</strong>
                            </button>
                          )}
                        </div>
                      )}

                      <div className="search-result-filters">
                        <div className="search-result-filter-group">
                          <div className="search-filter-block__head">
                            <span className="search-result-filter-group__label">来源</span>
                          </div>
                          <div className="search-source-overview">
                            <button
                              type="button"
                              className={`search-source-chip ${sourceFilter === 'all' ? 'active' : ''}`}
                              onClick={() => handleSourceChange('all')}
                            >
                              <span>全部来源</span>
                              <strong>{allResults.length}</strong>
                            </button>
                            {sourceBreakdown.map((sourceItem) => (
                              <button
                                key={sourceItem.value}
                                type="button"
                                className={`search-source-chip ${sourceFilter === sourceItem.value ? 'active' : ''}`}
                                onClick={() => handleSourceChange(sourceItem.value)}
                              >
                                <span>{sourceItem.label}</span>
                                <strong>{sourceItem.count}</strong>
                              </button>
                            ))}
                          </div>
                        </div>

                        {categoryBreakdown.length > 0 && (
                          <div className="search-result-filter-group">
                            <div className="search-filter-block__head">
                              <span className="search-result-filter-group__label">分类</span>
                              <div className="search-filter-block__actions">
                                {categoryFilter !== 'all' && (
                                  <button
                                    type="button"
                                    className="search-filter-action-btn"
                                    onClick={() => handleCategoryChange('all')}
                                  >
                                    清除
                                  </button>
                                )}
                                {categoryBreakdown.length > CATEGORY_CHIP_COLLAPSE_COUNT && (
                                  <button
                                    type="button"
                                    className="search-filter-action-btn"
                                    onClick={() => setCategoryExpanded(prev => !prev)}
                                  >
                                    {categoryExpanded
                                      ? '收起'
                                      : `更多 ${Math.max(0, categoryBreakdown.length - visibleCategoryBreakdown.length)}`}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="search-category-overview__chips">
                              <button
                                type="button"
                                className={`search-category-chip ${categoryFilter === 'all' ? 'active' : ''}`}
                                onClick={() => handleCategoryChange('all')}
                              >
                                <span>全部分类</span>
                                <strong>{sourceFilteredResults.length}</strong>
                              </button>
                              {visibleCategoryBreakdown.map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  className={`search-category-chip ${categoryFilter === item.key ? 'active' : ''}`}
                                  onClick={() => handleCategoryChange(item.key)}
                                >
                                  <span>{item.label}</span>
                                  <strong>{item.count}</strong>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {tagBreakdown.length > 0 && (
                          <div className="search-result-filter-group">
                            <div className="search-filter-block__head">
                              <span className="search-result-filter-group__label">标签</span>
                              <div className="search-filter-block__actions">
                                {tagFilter !== 'all' && (
                                  <button
                                    type="button"
                                    className="search-filter-action-btn"
                                    onClick={() => handleTagFilterChange('all')}
                                  >
                                    清除
                                  </button>
                                )}
                                {tagBreakdown.length > TAG_CHIP_COLLAPSE_COUNT && (
                                  <button
                                    type="button"
                                    className="search-filter-action-btn"
                                    onClick={() => setTagExpanded(prev => !prev)}
                                  >
                                    {tagExpanded
                                      ? '收起'
                                      : `更多 ${Math.max(0, tagBreakdown.length - visibleTagBreakdown.length)}`}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="search-tag-overview__chips">
                              <button
                                type="button"
                                className={`search-tag-chip ${tagFilter === 'all' ? 'active' : ''}`}
                                onClick={() => handleTagFilterChange('all')}
                              >
                                <span>全部标签</span>
                                <strong>{categoryFilteredResults.length}</strong>
                              </button>
                              {visibleTagBreakdown.map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  className={`search-tag-chip ${tagFilter === item.key ? 'active' : ''}`}
                                  onClick={() => handleTagFilterChange(item.key)}
                                >
                                  <span>{item.label}</span>
                                  <strong>{item.count}</strong>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!showThinking && searchQuery && (
            <div className="search-unified-panel__meta">
              {isAiMode ? (
                <span className="search-unified-panel__hint">{aiMessage || 'AI 正在整理语义结果'}</span>
              ) : aiSearchEnabled ? (
                <span className="search-unified-panel__hint">
                  {aiEnhancing
                    ? 'AI 正在补充更多高相关结果...'
                    : aiEnhancedCount > 0
                      ? `AI 已补充 ${aiEnhancedCount} 条相关结果`
                      : '已完成关键词搜索，可切换 AI 搜索获得语义推荐'}
                </span>
              ) : null}
            </div>
          )}

          {!showThinking && aiExpandedKeywords.length > 0 && searchQuery && (
            <div className="search-unified-panel__tags">
              <span className="search-unified-panel__label">扩展词</span>
              <div className="search-semantic-tags">
                {aiExpandedKeywords.map((keyword, index) => (
                  <button
                    key={`${keyword}-${index}`}
                    type="button"
                    className="search-semantic-tag"
                    onClick={() => handleTagClick(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showThinking && aiRewriteSuggestions.length > 0 && searchQuery && aiSearchEnabled && (
            <div className="search-unified-panel__tags">
              <span className="search-unified-panel__label">改写推荐</span>
              <div className="search-ai-rewrite-tags">
                {aiRewriteSuggestions.map((keyword, index) => (
                  <button
                    key={`${keyword}-${index}`}
                    type="button"
                    className="search-ai-rewrite-tag"
                    onClick={() => handleAiRewriteSearch(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 思考过程动画 - Framer Motion 版本 */}
        <AnimatePresence mode="wait">
          {showThinking && aiLoading && (
            <AIThinkingAnimation currentStep={aiThinkingStep} />
          )}
        </AnimatePresence>

        {/* 搜索结果 */}
        <div className="search-results">
          {isLoading && currentPage === 1 && !showThinking ? (
            <div className="search-loading">
              <div className="loading"></div>
              <p>搜索中...</p>
            </div>
          ) : !showThinking && searchResults.length > 0 ? (
            <>
              {searchResults.map((result) => (
                result.contentType === 'article' ? (
                  <Link
                    key={`${result.contentType}-${result.id}`}
                    to={result.url || '/articles'}
                    className="search-article-card"
                  >
                    {result.iconUrl ? (
                      <div className="search-article-card__cover">
                        <img src={result.iconUrl} alt={result.name} loading="lazy" />
                      </div>
                    ) : (
                      <div className="search-article-card__cover search-article-card__cover--placeholder">
                        <span>{String(result.name || '文').slice(0, 1)}</span>
                      </div>
                    )}
                    <div className="search-article-card__content">
                      <div className="search-article-card__meta">
                        <span className="search-article-card__badge">文章</span>
                        {formatSearchResultDate(result.publishedAt) && (
                          <span className="search-article-card__date">
                            {formatSearchResultDate(result.publishedAt)}
                          </span>
                        )}
                        {result.category && (
                          <span className="search-article-card__category">{result.category}</span>
                        )}
                      </div>
                      <h3 className="search-article-card__title" title={result.name}>{result.name}</h3>
                      <p className="search-article-card__desc">{result.description || '暂无摘要'}</p>
                    </div>
                  </Link>
                ) : (
                  <ToolCard
                    key={`${result.contentType || 'website'}-${result.id}`}
                    tool={{
                      id: result.id,
                      name: result.name,
                      description: result.description,
                      url: result.url,
                      icon: result.iconUrl || '',
                      category: result.category || '',
                      tags: result.tags,
                      weightTags: result.weightTags || [],
                      isNew: result.isNew,
                      isHot: result.isHot,
                      isFeatured: result.isFeatured,
                    }}
                    onClick={() => handleWebsiteClick(result)}
                    showDirectArrow={showDirectArrow}
                    onDirectVisit={handleDirectVisit}
                    arrowLabel={arrowLabel}
                    arrowIsExternal={arrowIsExternal}
                    directArrowNewWindow={directArrowNewWindow}
                  />
                )
              ))}
            </>
          ) : !showThinking && !isLoading ? (
            <div className="search-empty">
              <div className="search-empty-icon-wrap">
                <div className="search-empty-icon">🔍</div>
                <span className="search-empty-icon-ring" />
              </div>
              <h3 className="search-empty-title">
                {searchQuery ? `没有找到“${searchQuery}”相关结果` : '未找到相关结果'}
              </h3>
              <p className="search-empty-description">
                {searchErrorMessage || '建议缩短关键词、替换同义词，或切换 AI 搜索进行语义匹配。'}
              </p>
              <div className="search-empty-actions">
                <button className="search-empty-action-btn" onClick={() => handleSearch('')}>
                  清空重搜
                </button>
                {aiSearchEnabled && searchQuery && (
                  <button
                    className="search-empty-action-btn search-empty-action-btn--primary"
                    onClick={() => performAiSearch(searchQuery)}
                  >
                    用 AI 语义搜索
                  </button>
                )}
              </div>
              {emptySuggestionKeywords.length > 0 && (
                <div className="search-empty-suggestions">
                  <div className="search-empty-suggestions__label">你可以试试：</div>
                  <div className="search-empty-suggestions__tags">
                    {emptySuggestionKeywords.map((keyword, index) => {
                      const preview = buildKeywordPreviewText(keyword);
                      return (
                        <button
                          key={`${keyword}-${index}`}
                          className="search-empty-suggestion-tag hover-preview-chip"
                          title={preview}
                          data-preview={preview}
                          onClick={() => handleTagClick(keyword)}
                        >
                          {keyword}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 加载更多 */}
        {hasMore && !isLoading && !showThinking && (
          <div className="load-more-wrapper">
            <button className="load-more-btn" onClick={loadMore}>
              加载更多 ({searchResults.length}/{totalResults})
            </button>
          </div>
        )}

        {/* 相关搜索 */}
        {relatedKeywords.length > 0 && searchQuery && !isLoading && !showThinking && (
          <div className="related-search">
            <h4>相关搜索</h4>
            <div className="related-tags">
              {relatedKeywords.map((keyword, i) => {
                const preview = buildKeywordPreviewText(keyword);
                return (
                  <button
                    key={i}
                    className="related-tag hover-preview-chip"
                    title={preview}
                    data-preview={preview}
                    onClick={() => handleTagClick(keyword)}
                  >
                    {keyword}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI 搜索侧边栏 */}
      <AISearchSidebar
        visible={showAiSidebar}
        onClose={() => setShowAiSidebar(false)}
        enabled={aiSearchEnabled}
        onWebsiteClick={(website) => handleWebsiteClick({
          id: website.id,
          name: website.name,
          description: website.description,
          url: website.url,
          iconUrl: website.iconUrl,
          tags: [],
        })}
      />
    </div>
  );
};

export default SearchPage;
