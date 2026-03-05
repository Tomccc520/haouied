import axios from 'axios';

/**
 * UIED WordPress API服务
 * 专门用于从UIED网站获取数据并进行处理
 * 
 * 注意：以下自定义API端点都在WordPress子主题的functions.php中定义
 * 路径：wp-content/themes/uied-child/functions.php
 * 
 * 自定义端点包括：
 * - /wp-json/uied/v1/hot-posts - 获取热门文章
 * - /wp-json/uied/v1/hot-categories - 获取热门分类
 * - /wp-json/uied/v1/hot-tags - 获取热门标签
 * - /wp-json/uied/v1/hot-users - 获取活跃用户
 * - /wp-json/uied/v1/latest-posts - 获取最新文章
 * - /wp-json/uied/v1/category-posts/{id} - 获取分类文章
 * 
 * @version 1.0.0
 * @author UIED技术团队 (https://fsuied.com)
 */

// 缓存管理
interface CacheData {
  data: any;
  timestamp: number;
  params: string;
  type: string; // 添加类型标识
}

const cache: Record<string, CacheData> = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存时间

// 生成缓存键
const generateCacheKey = (type: string, params: any): string => {
  return `${type}_${JSON.stringify(params)}`;
};

// 检查缓存是否有效
const isCacheValid = (key: string, params: string, type: string): boolean => {
  if (!cache[key]) return false;
  
  const now = Date.now();
  const isValid = cache[key].timestamp + CACHE_DURATION > now && 
                 cache[key].params === params &&
                 cache[key].type === type;
                 
  if (isValid) {
    console.log(`使用缓存数据: ${key}，类型: ${type}，剩余有效期: ${
      Math.round((cache[key].timestamp + CACHE_DURATION - Date.now()) / 60000)
    } 分钟`);
  }
  
  return isValid;
};

// 从缓存获取数据
const getFromCache = (key: string): any => {
  return cache[key]?.data;
};

// 设置缓存
const setCache = (key: string, data: any, params: string, type: string): void => {
  console.log(`设置缓存: ${key}, 类型: ${type}, 过期时间: 30分钟后`);
  cache[key] = {
    data,
    timestamp: Date.now(),
    params,
    type
  };
  
  // 清理同类型的过期缓存
  Object.keys(cache).forEach(cacheKey => {
    if (cache[cacheKey].type === type && cache[cacheKey].timestamp + CACHE_DURATION < Date.now()) {
      console.log(`清理过期缓存: ${cacheKey}`);
      delete cache[cacheKey];
    }
  });
};

// API URLs
const isDev = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDev ? 'https://www.uied.cn/wp-json/wp/v2' : 'https://www.uied.cn/wp-json/wp/v2';
const UIED_API_URL = isDev ? 'https://www.uied.cn/wp-json/uied/v1' : 'https://www.uied.cn/wp-json/uied/v1';
const SITE_INFO_URL = isDev ? 'https://www.uied.cn/wp-json' : 'https://www.uied.cn/wp-json';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 增加到30秒
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
  }
});

// 创建自定义API axios实例
const uiedApi = axios.create({
  baseURL: UIED_API_URL,
  timeout: 30000,  // 增加到30秒
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
  }
});

// 添加重试机制
const retryDelay = (retryNumber = 0): number => {
  const delays = [1000, 2000, 3000, 5000];
  return delays[retryNumber] || delays[delays.length - 1];
};

const retryRequest = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0 || (error.response && error.response.status !== 408 && error.code !== 'ECONNABORTED')) {
      throw error;
    }
    console.log(`请求失败，${retries}秒后重试...`);
    await new Promise(resolve => setTimeout(resolve, retryDelay(3 - retries)));
    return retryRequest(fn, retries - 1);
  }
};

// 添加请求拦截器
api.interceptors.request.use(
  config => {
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    console.log('发送请求:', config.url);
    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

uiedApi.interceptors.request.use(
  config => {
    console.log('发送自定义API请求:', config.url);
    return config;
  },
  error => {
    console.error('自定义API请求错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  response => {
    console.log('收到响应:', response.config.url);
    return response;
  },
  error => {
    console.error('API请求失败:', error.message);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    return Promise.reject(error);
  }
);

uiedApi.interceptors.response.use(
  response => {
    console.log('收到自定义API响应:', response.config.url);
    return response;
  },
  error => {
    console.error('自定义API请求失败:', error.message);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    return Promise.reject(error);
  }
);

interface GetPostsParams {
  page: number;
  perPage: number;
  categoryId?: number;
  period?: 'all' | 'daily' | 'weekly' | 'monthly';
}

// 处理图片URL，与AntRankingPage.tsx中的getProxyImageUrl保持一致
const processImageUrl = (url: string | undefined): string => {
  if (!url || url.trim() === '') {
    // 返回默认缩略图
    return 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-thumbnail.jpg';
  }
  
  // 清理URL中的参数 - 移除问号后的所有内容
  let cleanUrl = url;
  if (cleanUrl.includes('?')) {
    cleanUrl = cleanUrl.split('?')[0];
  }
  
  // 如果是相对URL，添加CDN域名
  if (cleanUrl.startsWith('/')) {
    return `https://img.uied.cn${cleanUrl}`;
  }
  
  // 如果是完整的uied.cn域名URL，替换为CDN域名
  if (cleanUrl.includes('uied.cn') && !cleanUrl.includes('img.uied.cn')) {
    cleanUrl = cleanUrl.replace(/https?:\/\/(www\.)?uied\.cn/, 'https://img.uied.cn');
  }
  
  // 过滤一些无效的URL格式
  if (cleanUrl === 'false' || cleanUrl === 'null' || cleanUrl === 'undefined') {
    return 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-thumbnail.jpg';
  }

  // 其他情况直接返回处理后的URL
  return cleanUrl;
};

// 处理头像URL
const processAvatarUrl = (avatarUrl: string | undefined): string => {
  if (!avatarUrl) return 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-avatar.png';
  return processImageUrl(avatarUrl);
};

// 导出统一的 API 服务对象
export const wordPressApi = {
  getSiteInfo: async () => {
    try {
      // 使用配置好的SITE_INFO_URL
      const response = await axios.get(SITE_INFO_URL, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      });
      console.log('获取站点信息成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('获取站点信息失败:', error);
      // 返回默认值避免UI错误
      return {
        name: 'UIED热榜',
        description: '发现最热门的内容和用户',
        url: 'https://www.uied.cn'
      };
    }
  },

  getHotPosts: async (params: { 
    page?: number; 
    per_page?: number;
    period?: 'all' | 'daily' | 'weekly' | 'monthly';
    category_id?: number;
    tag_id?: number; // 添加tag_id参数
  }) => {
    const url = `${UIED_API_URL}/hot-posts`;
    const cacheKey = `hot-posts-${JSON.stringify(params)}`;
    const paramsString = JSON.stringify(params);
    
    if (isCacheValid(cacheKey, paramsString, 'hot-posts')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用热门文章API:', url, '\n', params);
      const response = await retryRequest(() => axios.get(url, { 
        params,
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      }));
      
      // 处理返回数据中的图片URL
      const processedData = {
        ...response.data,
        items: response.data.items?.map((item: any) => ({
          ...item,
          thumbnail: processImageUrl(item.thumbnail),
          author_avatar: processAvatarUrl(item.author_avatar)
        })) || []
      };
      
      setCache(cacheKey, processedData, paramsString, 'hot-posts');
      return processedData;
    } catch (error) {
      console.error('获取热门文章失败:', error);
      return { items: [], total: 0, totalPages: 0 };
    }
  },

  getCategoryPosts: async (categoryId: number, page = 1, perPage = 10, orderBy = 'date') => {
    try {
      console.log('调用分类文章API:', `${UIED_API_URL}/category-posts/${categoryId}`, {
        per_page: perPage,
        page: page,
        orderby: orderBy
      });
      const response = await uiedApi.get(`/category-posts/${categoryId}`, {
        params: {
          per_page: perPage,
          page: page,
          orderby: orderBy
        }
      });
      console.log('分类文章API响应:', response);
      
      // 返回正确的数据结构 { data: [...], total: x, totalPages: y }
      return {
        data: response.data.items || [],
        total: parseInt(response.data.total || '0'),
        totalPages: parseInt(response.data.totalPages || '0'),
        categoryInfo: response.data.categoryInfo || null
      };
    } catch (error) {
      console.error(`获取分类${categoryId}的文章失败:`, error);
      return { data: [], total: 0, totalPages: 0, categoryInfo: null };
    }
  },

  getHotUsers: async ({ page, perPage }: Omit<GetPostsParams, 'categoryId' | 'period'>) => {
    const cacheKey = generateCacheKey('users', { page, perPage });
    const paramsString = JSON.stringify({ page, perPage });
    
    if (isCacheValid(cacheKey, paramsString, 'users')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用热门用户API:', `${UIED_API_URL}/hot-users`, {
        page,
        per_page: perPage
      });
      const response = await uiedApi.get('/hot-users', { 
        params: {
          page,
          per_page: perPage
        } 
      });
      console.log('热门用户API响应:', response);
      
      const result = {
        data: response.data.items || [],
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1
      };
      
      setCache(cacheKey, result, paramsString, 'users');
      return result;
    } catch (error) {
      console.error('获取活跃用户失败:', error);
      return { data: [], total: 0, totalPages: 0 };
    }
  },

  getHotCategories: async ({ page, perPage }: Omit<GetPostsParams, 'categoryId' | 'period'>) => {
    const cacheKey = generateCacheKey('categories', { page, perPage });
    const paramsString = JSON.stringify({ page, perPage });
    
    if (isCacheValid(cacheKey, paramsString, 'categories')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用热门分类API:', `${UIED_API_URL}/hot-categories`, {
        page,
        per_page: perPage
      });
      
      const response = await retryRequest(() => axios.get(`${UIED_API_URL}/hot-categories`, { 
        params: {
          page,
          per_page: perPage
        },
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      }));
      
      console.log('热门分类API响应:', response);
      
      const result = {
        data: response.data.items || [],
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1
      };
      
      setCache(cacheKey, result, paramsString, 'categories');
      return result;
    } catch (error) {
      console.error('获取热门分类失败:', error);
      return { data: [], total: 0, totalPages: 0 };
    }
  },

  getHotTags: async (params: { page?: number; perPage?: number }) => {
    const url = `${UIED_API_URL}/hot-tags`;
    const cacheKey = `hot-tags-${JSON.stringify(params)}`;
    const paramsString = JSON.stringify(params);
    
    if (isCacheValid(cacheKey, paramsString, 'hot-tags')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用热门标签API:', url);
      const response = await retryRequest(() => axios.get(url, { params }));
      const cacheData = { ...response.data };
      
      setCache(cacheKey, cacheData, paramsString, 'hot-tags');
      
      return cacheData;
    } catch (error) {
      console.error('获取热门标签失败:', error);
      throw error;
    }
  },

  // 新增标签文章API
  getTagPosts: async (tagId: number, page = 1, perPage = 30) => {
    const url = `${UIED_API_URL}/tag-posts/${tagId}`;
    const cacheKey = `tag-posts-${tagId}-${page}-${perPage}`;
    const paramsString = JSON.stringify({ page, per_page: perPage });
    
    if (isCacheValid(cacheKey, paramsString, 'tag-posts')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log(`调用标签文章API: ${url}`, { page, per_page: perPage });
      const response = await retryRequest(() => axios.get(url, { 
        params: { 
          page,
          per_page: perPage
        } 
      }));
      
      const cacheData = { ...response.data };
      setCache(cacheKey, cacheData, paramsString, 'tag-posts');
      
      return cacheData;
    } catch (error) {
      console.error(`获取标签ID=${tagId}的文章失败:`, error);
      throw error;
    }
  },

  searchContent: async (keyword: string, perPage = 10) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/search`, {
        params: {
          search: keyword,
          per_page: perPage,
          _embed: true,
        }
      });
  
      const results = response.data;
      const rankItems = results.map((item: any, index: number) => ({
        id: item.id,
        name: item.title || '未命名内容',
        description: item.excerpt || '',
        link: item.link || '#',
        count: 0,
        rank: index + 1,
        category: item.type || '内容',
        date: new Date().toLocaleDateString('zh-CN'),
      }));
  
      return {
        items: rankItems,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0')
      };
    } catch (error) {
      console.error('搜索内容失败:', error);
      throw error;
    }
  },

  getLatestPosts: async (params: { 
    page?: number; 
    per_page?: number;
    category_id?: number;
    tag_id?: number;
  }) => {
    // 根据参数决定使用哪个API端点
    let url = `${UIED_API_URL}/latest-posts`;
    let cacheType = 'latest-posts';
    
    // 如果存在分类ID，则使用分类文章API
    if (params.category_id) {
      url = `${UIED_API_URL}/category-posts/${params.category_id}`;
      cacheType = 'category-posts';
      console.log(`检测到分类ID=${params.category_id}，使用分类API: ${url}`);
    } else {
      console.log('未检测到分类ID，使用普通最新文章API');
    }
    
    const cacheKey = `${cacheType}-${JSON.stringify(params)}`;
    const paramsString = JSON.stringify(params);
    
    // 增强日志 - 详细显示请求参数
    console.log('【请求参数详情】', {
      url: url,
      params: params,
      category_id: params.category_id,
      有效性: params.category_id ? '有效' : '无效',
      cacheType: cacheType
    });
    
    if (isCacheValid(cacheKey, paramsString, cacheType)) {
      console.log('使用缓存(已跳过)', cacheKey);
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用API:', url, '\n', params);
      
      const response = await retryRequest(() => axios.get(url, { 
        params,
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      }));
      
      // 处理返回数据中的图片URL
      const processedData = {
        ...response.data,
        items: response.data.items?.map((item: any) => ({
          ...item,
          thumbnail: processImageUrl(item.thumbnail),
          authorAvatar: processAvatarUrl(item.authorAvatar)
        })) || []
      };
      
      setCache(cacheKey, processedData, paramsString, cacheType);
      return processedData;
    } catch (error) {
      console.error('获取最新文章失败:', error);
      return { items: [], total: 0, totalPages: 0 };
    }
  },

  // 清除API缓存的函数
  clearApiCache: (type?: string): number => {
    let count = 0;
    
    // 如果指定了类型，只清除该类型的缓存
    if (type) {
      Object.keys(cache).forEach(key => {
        if (cache[key].type === type) {
          delete cache[key];
          count++;
        }
      });
      console.log(`已清除 ${type} 类型的缓存，共 ${count} 条`);
    } 
    // 否则清除所有缓存
    else {
      count = Object.keys(cache).length;
      Object.keys(cache).forEach(key => {
        delete cache[key];
      });
      console.log(`已清除所有缓存，共 ${count} 条`);
    }
    
    return count;
  },

  clearCache: (type?: string): number => {
    // 直接调用clearApiCache函数
    return wordPressApi.clearApiCache(type);
  },

  // 添加或更新获取热门圈子的函数
  getHotCircles: async (params: { 
    page?: number; 
    per_page?: number; 
  }) => {
    // 直接使用指定的API路径，不添加任何参数
    const url = `${UIED_API_URL}/circle`;
    const cacheKey = `hot-circles-${JSON.stringify(params)}`;
    const paramsString = JSON.stringify(params);
    
    if (isCacheValid(cacheKey, paramsString, 'circles')) {
      return getFromCache(cacheKey);
    }
    
    try {
      console.log('调用圈子API:', url);
      const response = await retryRequest(() => axios.get(url, { 
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      }));
      
      // 获取返回的数据
      const circlesData = response.data || {};
      
      // 调试日志 - 显示API返回结构
      console.log('圈子API返回数据结构:', circlesData);
      
      // 直接使用返回的数据
      const processedData = {
        items: Array.isArray(circlesData) ? circlesData : (circlesData.items || []),
        total: Array.isArray(circlesData) ? circlesData.length : (circlesData.total || 0),
        totalPages: Array.isArray(circlesData) ? 1 : (circlesData.totalPages || 1),
        page: 1,
        perPage: Array.isArray(circlesData) ? circlesData.length : 20
      };
      
      setCache(cacheKey, processedData, paramsString, 'circles');
      return processedData;
    } catch (error) {
      console.error('获取圈子数据失败:', error);
      // 返回友好的错误提示
      return { 
        items: [], 
        total: 0, 
        totalPages: 0,
        error: '获取圈子列表失败，请稍后再试' 
      };
    }
  },

  // 添加或更新获取圈子文章的函数
  getCirclePosts: async (circleId: number, page = 1, perPage = 30) => {
    // 修改为使用circle-tags端点
    const url = `${UIED_API_URL}/circle-tags/${circleId}`;
    const cacheKey = `circle-posts-${circleId}-${page}-${perPage}`;
    const paramsString = JSON.stringify({ page, per_page: perPage });
    
    console.log(`调用圈子文章API: ${url} [circleId=${circleId}]`);
    
    if (isCacheValid(cacheKey, paramsString, 'circle-posts')) {
      console.log(`使用缓存的圈子文章数据: circleId=${circleId}`);
      return getFromCache(cacheKey);
    }
    
    try {
      console.log(`开始请求圈子文章: ${url}`, { page, per_page: perPage });
      const response = await retryRequest(() => axios.get(url, { 
        params: { 
          page,
          per_page: perPage
        },
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': isDev ? 'http://localhost:3000' : 'https://hot.uied.cn'
        }
      }));
      
      // 处理返回数据
      const items = response.data.items || [];
      console.log(`圈子文章API返回数据项数量: ${items.length}`);
      
      // 调试日志 - 显示API返回的数据结构
      if (items.length > 0) {
        console.log('圈子文章API返回第一条数据字段:', Object.keys(items[0]));
        console.log('圈子文章API第一条数据示例:', {
          id: items[0].topic_id,
          标题: items[0].title,
          内容长度: items[0].content?.length || 0,
          作者: items[0].author?.name,
          图片: items[0].attachment?.image?.[0]?.thumb ? '有图片' : '无图片'
        });
      } else {
        console.log('圈子文章API返回数据: 无数据');
      }
      
      // 处理每个文章项 - 保留原始字段，只处理图片URL
      const processedItems = items.map((item: any) => {
        // 深拷贝，避免修改原始对象
        const processedItem = { ...item };
        
        // 处理作者头像
        if (processedItem.author && processedItem.author.avatar) {
          processedItem.author.avatar = processImageUrl(processedItem.author.avatar);
        }
        
        // 处理文章缩略图
        if (processedItem.attachment && processedItem.attachment.image && processedItem.attachment.image.length > 0) {
          processedItem.attachment.image.forEach((img: any) => {
            if (img.thumb) {
              img.thumb = processImageUrl(img.thumb);
            }
            if (img.full) {
              img.full = processImageUrl(img.full);
            }
          });
        }
        
        // 为了兼容性，设置id字段为topic_id
        if (processedItem.topic_id && !processedItem.id) {
          processedItem.id = processedItem.topic_id;
        }
        
        return processedItem;
      });
      
      const processedData = {
        ...response.data,
        items: processedItems
      };
      
      console.log('圈子文章数据处理完成，缓存数据');
      setCache(cacheKey, processedData, paramsString, 'circle-posts');
      return processedData;
    } catch (error) {
      console.error(`获取圈子ID=${circleId}的文章失败:`, error);
      return { items: [], total: 0, totalPages: 0, circleInfo: null };
    }
  }
};

// 删除重复的独立函数导出
export default {
  getSiteInfo: wordPressApi.getSiteInfo,
  // 使用适配器模式适配参数并调用自定义API
  getHotPosts: wordPressApi.getHotPosts,
  getCategoryPosts: wordPressApi.getCategoryPosts,
  // 使用适配器模式适配参数并调用自定义API
  getHotCategories: (perPage = 10) => wordPressApi.getHotCategories({ 
    page: 1, 
    perPage 
  }),
  // 使用适配器模式适配参数并调用自定义API
  getHotTags: (perPage = 10) => wordPressApi.getHotTags({ 
    page: 1, 
    perPage 
  }),
  // 使用适配器模式适配参数并调用自定义API
  getActiveUsers: (perPage = 10) => wordPressApi.getHotUsers({ 
    page: 1, 
    perPage 
  }),
  searchContent: wordPressApi.searchContent,
  getLatestPosts: wordPressApi.getLatestPosts,
  // 新增标签文章API
  getTagPosts: wordPressApi.getTagPosts,
  // 添加clearCache方法到默认导出
  clearCache: wordPressApi.clearCache,
  // 圈子API - 适配参数
  getHotCircles: (perPage = 20) => wordPressApi.getHotCircles({
    page: 1,
    per_page: perPage
  }),
  // 添加或更新获取圈子文章的函数
  getCirclePosts: wordPressApi.getCirclePosts
}; 