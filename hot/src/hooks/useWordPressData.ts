import { useState, useEffect, useCallback, useRef } from 'react';
import { wordPressApi } from '../services/wordpress-api';
import { RankItem } from '../types';

/**
 * 数据类型定义
 */
export type DataType = 'posts' | 'users' | 'categories' | 'tags' | 'latest-posts' | 'category-posts' | 'tag-posts' | 'circles' | 'circle-posts';

/**
 * 将数据类型转换为中文名称
 */
export const typeToChineseName = (type: DataType): string => {
  switch (type) {
    case 'posts': return '热门文章';
    case 'users': return '优秀作者';
    case 'categories': return '分类';
    case 'tags': return '标签';
    case 'latest-posts': return '最新文章';
    case 'category-posts': return '分类文章';
    case 'tag-posts': return '标签文章';
    case 'circles': return '圈子';
    case 'circle-posts': return '圈子文章';
    default: return '数据';
  }
};

/**
 * 分页数据接口
 */
interface PaginatedData<T> {
  items: T[];
  total: number;
  totalPages: number;
}

/**
 * Hook参数接口
 */
interface UseWordPressDataParams {
  type: DataType;
  perPage?: number;
  categoryId?: number;
  tagId?: number;
  period?: 'all' | 'daily' | 'weekly' | 'monthly';
  orderBy?: string;
}

/**
 * Hook返回值接口
 */
interface UseWordPressDataResult {
  data: RankItem[];
  isLoading: boolean;
  isTransitioning: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  refresh: () => void;
  categoryInfo?: {
    id: number;
    name: string;
    description: string;
    count: number;
  };
}

// 为每种数据类型创建独立的缓存对象
const cacheMap: Record<DataType, Record<string, any>> = {
  'posts': {},
  'users': {},
  'categories': {},
  'tags': {},
  'latest-posts': {},
  'category-posts': {},
  'tag-posts': {},
  'circles': {},
  'circle-posts': {}
};

// 缓存有效期 (2分钟)
const CACHE_DURATION = 2 * 60 * 1000;

// 请求超时时间 (10秒)
const REQUEST_TIMEOUT = 10000;

/**
 * 格式化响应数据
 */
const formatResponseData = (items: any[]): RankItem[] => {
  if (!Array.isArray(items)) {
    console.error('格式化数据错误：items不是数组', items);
    return [];
  }
  
  return items.map((item, index) => {
    // 首先尝试判断是否为圈子文章结构
    const isCirclePost = item.topic_id !== undefined;
    
    // 创建基础项
    const formattedItem: RankItem = {
      id: item.id || item.topic_id || 0, // 优先使用id，其次使用topic_id
      name: item.name || item.title?.rendered || item.title || '未命名',
      link: item.link || '#',
      thumbnail: item.thumbnail || item.featured_media_url || '',
      authorName: item.authorName || item.author_name || '佚名',
      authorAvatar: item.authorAvatar || item.author_avatar || '',
      category: item.category || item.category_name || '',
      date: item.date,
      viewCount: item.viewCount || item.view_count || 0,
      like_count: item.like_count || 0,
      comment_count: item.comment_count || 0,
      score: item.score || item.hot_score || item.viewCount || item.view_count || 0,
      isNew: item.isNew || false,
      description: item.description || item.excerpt?.rendered || item.excerpt || '',
      timeAgo: item.timeAgo || item.time_ago || '',
      count: item.count || 0
    };
    
    // 对圈子文章的特殊处理
    if (isCirclePost) {
      formattedItem.topic_id = item.topic_id;
      formattedItem.title = item.title;
      formattedItem.content = item.content;
      formattedItem.excerpt = item.excerpt;
      
      // 处理附件
      if (item.attachment) {
        formattedItem.attachment = item.attachment;
        
        // 如果有缩略图，设置到thumbnail字段
        if (item.attachment.image && item.attachment.image.length > 0) {
          formattedItem.thumbnail = item.attachment.image[0].thumb;
        }
      }
      
      // 处理作者
      if (item.author && typeof item.author === 'object') {
        formattedItem.author = item.author;
        formattedItem.authorName = item.author.name;
        formattedItem.authorAvatar = item.author.avatar;
      }
      
      // 处理其他字段
      formattedItem.view_count = item.view_count;
      formattedItem.comment_count = item.comment_count;
      formattedItem.time_ago = item.time_ago;
      formattedItem.sticky = item.sticky;
      formattedItem.type = item.type;
    }
    
    // 打印每项处理结果的日志
    if (index === 0) {
      console.log('格式化数据项示例:', {
        原始ID: item.id || item.topic_id,
        处理后ID: formattedItem.id,
        标题: formattedItem.name || formattedItem.title,
        类型: isCirclePost ? '圈子文章' : '普通项',
        字段: Object.keys(formattedItem)
      });
    }
    
    return formattedItem;
  });
};

/**
 * WordPress数据获取Hook
 */
export default function useWordPressData({
  type,
  perPage = 10,
  categoryId,
  tagId,
  period = 'all',
  orderBy = 'date'
}: UseWordPressDataParams): UseWordPressDataResult {
  // 状态管理
  const [data, setData] = useState<RankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  
  // 使用ref跟踪当前数据类型，用于避免过时的状态更新
  const currentTypeRef = useRef<DataType>(type);
  const lastTypeRef = useRef<DataType | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 生成缓存键
  const generateCacheKey = useCallback((params: any): string => {
    return JSON.stringify(params);
  }, []);
  
  // 清理指定类型的过期缓存
  const cleanExpiredCache = useCallback((dataType: DataType) => {
    const typeCache = cacheMap[dataType];
    const now = Date.now();
    
    // 使用 Object.keys 替代 Map.entries
    Object.keys(typeCache).forEach(key => {
      if (typeCache[key].timestamp + CACHE_DURATION < now) {
        delete typeCache[key];
      }
    });
  }, []);
  
  // 彻底清除所有缓存
  const clearAllCache = useCallback(() => {
    Object.keys(cacheMap).forEach(key => {
      cacheMap[key as DataType] = {};
    });
    console.log("已清除所有缓存");
  }, []);
  
  // 重置所有状态
  const resetState = useCallback(() => {
    setData([]);
    setError(null);
    setCategoryInfo(null);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
  }, []);
  
  // 清理超时定时器
  const clearTimeoutTimer = useCallback(() => {
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }, []);
  
  // 数据获取函数
  const fetchData = useCallback(async (forceRefresh = false) => {
    // 清理之前的超时定时器
    clearTimeoutTimer();
    
    // 更新当前类型引用
    currentTypeRef.current = type;
    
    // 如果类型发生变化，重置状态
    if (lastTypeRef.current !== type) {
      resetState();
      lastTypeRef.current = type;
    }
    
    // 构建缓存参数
    const cacheParams = { categoryId, tagId, period, perPage };
    const cacheKey = generateCacheKey(cacheParams);
    
    // 获取当前类型的缓存
    const typeCache = cacheMap[type];
    const cachedData = !forceRefresh && typeCache[cacheKey];
    const now = Date.now();
    
    // 尝试从缓存获取数据
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`[${type}] 使用缓存数据`, { cacheKey, params: cacheParams });
      
      // 检查当前类型是否匹配，防止过时更新
      if (currentTypeRef.current === type) {
        setData(cachedData.data);
        setTotal(cachedData.total);
        setTotalPages(cachedData.totalPages);
        if (cachedData.categoryInfo) {
          setCategoryInfo(cachedData.categoryInfo);
        }
        setIsLoading(false);
        
        // 使用超短延迟结束过渡状态，确保UI平滑
        setTimeout(() => {
          if (currentTypeRef.current === type) {
            setIsTransitioning(false);
          }
        }, 100);
        
        setError(null);
      }
      return;
    }
    
    // 显示加载状态
    if (currentTypeRef.current === type) {
      setIsLoading(true);
      setIsTransitioning(true);
    }
    
    console.log(`[${type}] 开始获取数据`, { params: cacheParams, 强制刷新: forceRefresh });
    
    // 设置请求超时
    const timeoutTimer = setTimeout(() => {
      if (currentTypeRef.current === type) {
        console.error(`[${type}] 请求超时`);
        setError(`获取${typeToChineseName(type)}超时，请检查网络连接`);
        setIsLoading(false);
        setIsTransitioning(false);
      }
    }, REQUEST_TIMEOUT);
    
    requestTimeoutRef.current = timeoutTimer;
    
    try {
      const maxItems = Math.min(perPage, 100);
      let response;
      
      // 根据不同类型获取数据
      switch (type) {
        case 'posts':
          response = await wordPressApi.getHotPosts({
            page: 1,
            per_page: maxItems,
            period,
            category_id: categoryId,
            tag_id: tagId
          });
          break;
        case 'users':
          response = await wordPressApi.getHotUsers({ page: 1, perPage: maxItems });
          break;
        case 'categories':
          response = await wordPressApi.getHotCategories({ page: 1, perPage: maxItems });
          break;
        case 'tags':
          response = await wordPressApi.getHotTags({ page: 1, perPage: maxItems });
          break;
        case 'latest-posts':
          response = await wordPressApi.getLatestPosts({
            page: 1,
            per_page: maxItems,
            category_id: categoryId,
            tag_id: tagId
          });
          break;
        case 'category-posts':
          if (!categoryId) {
            throw new Error('分类文章查询需要categoryId参数');
          }
          response = await wordPressApi.getCategoryPosts(categoryId, 1, maxItems, orderBy);
          break;
        case 'tag-posts':
          if (!tagId) {
            throw new Error('标签文章查询需要tagId参数');
          }
          response = await wordPressApi.getTagPosts(tagId, 1, maxItems);
          break;
        case 'circles':
          response = await wordPressApi.getHotCircles({ page: 1, per_page: maxItems });
          break;
        case 'circle-posts':
          if (!categoryId) {
            throw new Error('圈子文章查询需要categoryId参数');
          }
          response = await wordPressApi.getCirclePosts(categoryId, 1, maxItems);
          break;
        default:
          throw new Error(`不支持的数据类型: ${type}`);
      }
      
      // 清除超时定时器
      clearTimeoutTimer();
      
      // 验证响应数据
      if (!response) {
        throw new Error(`[${type}] 未收到响应数据`);
      }
      
      if (!response.data && !response.items) {
        throw new Error(`[${type}] 返回数据格式不正确`);
      }
      
      // 提取并格式化数据项
      const items = response.items || response.data;
      
      if (!Array.isArray(items)) {
        throw new Error(`[${type}] 返回的数据项不是数组`);
      }
      
      const formattedData = formatResponseData(items);
      
      console.log(`[${type}] 数据获取成功`, { 
        数据数量: formattedData.length,
        总数: response.total || 0
      });
      
      // 创建缓存条目
      const cacheEntry = {
        data: formattedData,
        total: response.total || formattedData.length,
        totalPages: response.totalPages || 1,
        timestamp: now,
        categoryInfo: response.categoryInfo
      };
      
      // 更新缓存
      typeCache[cacheKey] = cacheEntry;
      
      // 清理过期缓存
      cleanExpiredCache(type);
      
      // 确保当前类型没有改变再更新状态
      if (currentTypeRef.current === type) {
        setData(formattedData);
        setTotal(response.total || formattedData.length);
        setTotalPages(response.totalPages || 1);
        if (response.categoryInfo) {
          setCategoryInfo(response.categoryInfo);
        }
        setError(null);
      }
    } catch (error: any) {
      // 清除超时定时器
      clearTimeoutTimer();
      
      console.error(`[${type}] 数据获取错误:`, error);
      
      // 只有在当前类型匹配时才更新错误状态
      if (currentTypeRef.current === type) {
        setError(`获取${typeToChineseName(type)}失败: ${error.message}`);
        setData([]);
        setTotal(0);
        setTotalPages(0);
      }
    } finally {
      // 确保当前类型没有改变再更新加载状态
      if (currentTypeRef.current === type) {
        setIsLoading(false);
        
        // 使用超短延迟确保过渡状态有效
        setTimeout(() => {
          if (currentTypeRef.current === type) {
            setIsTransitioning(false);
          }
        }, 200);
      }
    }
  }, [type, categoryId, tagId, period, perPage, orderBy, generateCacheKey, cleanExpiredCache, resetState, clearTimeoutTimer]);
  
  // 类型改变时的处理
  useEffect(() => {
    console.log(`[切换] 数据类型改变: ${type}`, { categoryId, period });
    
    // 立即更新引用的类型
    currentTypeRef.current = type;
    
    // 立即重置状态
    resetState();
    setIsTransitioning(true);
    
    // 确保DOM更新后再获取数据
    const timer = setTimeout(() => {
      if (currentTypeRef.current === type) {
        fetchData(false);
      }
    }, 10);
    
    return () => {
      clearTimeout(timer);
      clearTimeoutTimer();
    };
  }, [type, fetchData, resetState, clearTimeoutTimer]);
  
  // 刷新数据
  const refresh = useCallback(() => {
    console.log(`[刷新] 手动刷新: ${type}`);
    
    // 删除当前类型的特定缓存
    const cacheKey = generateCacheKey({ categoryId, tagId, period, perPage });
    delete cacheMap[type][cacheKey];
    
    // 重新获取数据
    fetchData(true);
  }, [type, categoryId, tagId, period, perPage, generateCacheKey, fetchData]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimeoutTimer();
    };
  }, [clearTimeoutTimer]);
  
  // 返回结果
  return {
    data,
    isLoading,
    isTransitioning,
    error,
    total,
    totalPages,
    page,
    setPage,
    refresh,
    categoryInfo
  };
}

interface WordPressResponse {
  id: number;
  title?: {
    rendered: string;
  };
  name?: string;
  link: string;
  featured_media_url?: string;
  avatar_urls?: {
    [key: string]: string;
  };
  category_name?: string;
  _embedded?: {
    author?: Array<{
      name: string;
      avatar_urls: {
        [key: string]: string;
      };
    }>;
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
  date: string;
  registered_date?: string;
  excerpt?: {
    rendered: string;
  };
  description?: string;
  post_views_count?: string;
  view_count?: string;
  like_count?: string;
  comment_count?: string;
  favorite_count?: string;
  hot_score?: string;
  previous_rank?: number;
  rank_change?: number;
  count?: number;
}