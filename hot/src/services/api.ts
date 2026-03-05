/**
 * @file api.ts
 * @description API服务模块，处理与WordPress REST API的通信和跨域解决方案
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.0
 */
import axios from 'axios';

/**
 * WordPress REST API基础URL配置
 * 使用代理方式解决跨域问题
 * @version 1.1.0
 * @author UIED技术团队 (https://fsuied.com)
 */
// 判断环境，开发环境使用代理，生产环境直接访问
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE = isDevelopment ? 'https://www.uied.cn' : '';
const API_BASE_URL = `${API_BASE}/wp-json/wp/v2`;

/**
 * 创建axios实例
 * 配置基础URL和超时时间，以及跨域处理
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': isDevelopment ? 'http://localhost:3000' : 'https://hot.uied.cn'
  },
  withCredentials: true, // 跨域请求是否携带cookies
});

// 请求拦截器
api.interceptors.request.use(config => {
  // 如果有需要，在这里添加认证头或其他处理
  return config;
}, error => {
  return Promise.reject(error);
});

// 响应拦截器
api.interceptors.response.use(response => {
  return response;
}, error => {
  console.error('API请求错误:', error.message);
  // 为了UI更友好，可以返回一个带有错误信息的对象，而不是抛出错误
  return Promise.reject(error);
});

/**
 * 获取热门文章
 * 根据评论数排序获取最热门的文章
 * 
 * @param perPage 每页显示的文章数量，默认为10
 * @returns 热门文章列表
 */
export const getHotPosts = async (perPage = 10) => {
  try {
    // 这里我们按评论数排序，获取UIED网站的热门文章
    const response = await api.get('/posts', {
      params: {
        per_page: perPage,
        orderby: 'comment_count',
        order: 'desc',
        _embed: true, // 包含特色图片和作者信息
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取热门文章失败:', error);
    // 返回空数组，防止UI崩溃
    return [];
  }
};

/**
 * 获取热门用户
 * 从WordPress获取最活跃的用户
 * 注意：可能需要在UIED网站上安装自定义API插件
 * 
 * @param perPage 每页显示的用户数量，默认为10
 * @returns 热门用户列表
 */
export const getHotUsers = async (perPage = 10) => {
  try {
    // WordPress默认API可能不提供用户排名功能
    // 需要在UIED网站创建一个自定义端点
    const response = await api.get('/users', { // 可能需要改为自定义端点，如'/custom/hot-users'
      params: {
        per_page: perPage,
        orderby: 'registered', // 临时使用注册时间排序，理想情况应按发文数排序
        order: 'desc',
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取热门用户失败:', error);
    // 返回空数组
    return [];
  }
};

/**
 * 获取热门圈子/分类
 * 获取UIED网站中文章数最多的分类
 * 
 * @param perPage 每页显示的分类数量，默认为10
 * @returns 热门分类列表
 */
export const getHotCategories = async (perPage = 10) => {
  try {
    // 获取文章数最多的分类
    const response = await api.get('/categories', {
      params: {
        per_page: perPage,
        orderby: 'count', // 按文章数量排序
        order: 'desc',
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取热门分类失败:', error);
    // 返回空数组
    return [];
  }
};

/**
 * 获取热门标签
 * 获取文章数最多的标签列表
 * 
 * @param perPage 每页显示的标签数量，默认为10
 * @returns 热门标签列表
 */
export const getHotTags = async (perPage = 10) => {
  try {
    // 获取文章数最多的标签
    const response = await api.get('/tags', {
      params: {
        per_page: perPage,
        orderby: 'count', // 按文章数量排序
        order: 'desc',
        hide_empty: true, // 只显示有文章的标签
      }
    });
    return response.data;
  } catch (error) {
    console.error('获取热门标签失败:', error);
    return [];
  }
};

/**
 * 获取站点信息
 * 用于动态获取网站标题、描述等信息
 * 
 * @returns 站点基本信息
 */
export const getSiteInfo = async () => {
  try {
    // 使用基础URL，不带wp/v2路径
    const baseUrl = isDevelopment ? '' : 'https://www.uied.cn';
    const response = await axios.get(`${baseUrl}/wp-json`);
    return response.data;
  } catch (error) {
    console.error('获取站点信息失败:', error);
    // 返回基础信息避免UI错误
    return {
      name: 'UIED热榜',
      description: '发现最热门的内容和用户',
      url: 'https://www.uied.cn'
    };
  }
};

/**
 * 获取主菜单
 * 获取WordPress网站的主导航菜单
 * 注意：需要使用WP API Menus插件或其他提供菜单API的插件
 * 
 * @returns 主菜单数据
 */
export const getMainMenu = async () => {
  try {
    // 使用基础URL
    const baseUrl = isDevelopment ? '' : 'https://www.uied.cn';
    // 这里假设安装了WP API Menus插件
    const response = await axios.get(`${baseUrl}/wp-json/menus/v1/menus/main-menu`);
    return response.data;
  } catch (error) {
    console.error('获取主菜单失败:', error);
    // 返回空数组而不是抛出错误，确保UI不会崩溃
    return {items: []};
  }
};

/**
 * 获取安全的图片URL
 * 处理图片的跨域问题
 * 
 * @param url 原始图片URL
 * @returns 处理后的安全URL
 */
export const getSafeImageUrl = (url?: string) => {
  if (!url) return '';
  
  // 清理URL中的所有参数
  let cleanUrl = url;
  if (cleanUrl.includes('?')) {
    cleanUrl = cleanUrl.split('?')[0];
  }
  
  // 使用https
  let safeUrl = cleanUrl.replace(/^http:\/\//i, 'https://');
  
  // 开发环境下使用代理
  if (isDevelopment && safeUrl.startsWith('https://www.uied.cn')) {
    safeUrl = safeUrl.replace('https://www.uied.cn', '');
  }
  
  // 开发环境下使用代理处理图片域名
  if (isDevelopment && safeUrl.startsWith('https://img.uied.cn')) {
    safeUrl = safeUrl.replace('https://img.uied.cn', '/img');
  }
  
  return safeUrl;
};

export default api; 