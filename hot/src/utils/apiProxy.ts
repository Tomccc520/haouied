/**
 * @file apiProxy.ts
 * @description API代理工具，用于解决CORS问题
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @license MIT
 * @version 1.0.0
 */

import axios from 'axios';

// API代理服务器配置
const API_PROXY_CONFIG = {
  // 开发环境下使用代理服务
  DEV_PROXY: 'https://corsproxy.io/?',
  // 备用代理服务
  BACKUP_PROXY: 'https://api.allorigins.win/raw?url=',
  // 第三备用
  THIRD_PROXY: 'https://cors.eu.org/'
};

// JSONP代理
const JSONP_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * 获取API代理URL
 * @param originalUrl 原始API URL
 * @returns 代理后的URL
 */
export const getProxyApiUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';

  try {
    // 1. 确保URL是有效的
    const trimmedUrl = originalUrl.trim();
    
    // 2. 检查环境并使用适当的代理
    if (process.env.NODE_ENV === 'development') {
      return `${API_PROXY_CONFIG.DEV_PROXY}${encodeURIComponent(trimmedUrl)}`;
    }
    
    // 生产环境直接返回原始URL（应该由服务器处理CORS）
    return trimmedUrl;
  } catch (error) {
    console.error('API代理URL生成失败:', error);
    // 如果URL处理失败，返回原始URL
    return originalUrl;
  }
};

/**
 * 使用代理发送GET请求
 * @param url 目标URL
 * @returns Promise包含响应数据
 */
export const proxyGet = async <T>(url: string): Promise<T> => {
  try {
    // 使用代理URL
    const proxyUrl = getProxyApiUrl(url);
    
    // 发送请求
    const response = await axios.get(proxyUrl);
    return response.data;
  } catch (error) {
    // 如果主代理失败，尝试备用代理
    try {
      console.log('主代理失败，尝试备用代理');
      const backupUrl = `${API_PROXY_CONFIG.BACKUP_PROXY}${encodeURIComponent(url)}`;
      const response = await axios.get(backupUrl);
      return response.data;
    } catch (fallbackError) {
      // 如果备用代理也失败，尝试第三备用代理
      try {
        console.log('备用代理失败，尝试第三备用代理');
        const thirdUrl = `${API_PROXY_CONFIG.THIRD_PROXY}${url}`;
        const response = await axios.get(thirdUrl);
        return response.data;
      } catch (thirdError) {
        console.error('所有API代理请求都失败:', thirdError);
        throw thirdError;
      }
    }
  }
};

/**
 * 使用JSONP代理获取数据
 * 当其他方法都失败时使用
 * @param url 目标URL
 * @returns Promise包含响应数据
 */
export const jsonpProxyGet = async <T>(url: string): Promise<T> => {
  try {
    const jsonpUrl = `${JSONP_PROXY}${encodeURIComponent(url)}`;
    const response = await axios.get(jsonpUrl);
    // JSONP代理会将内容包装在contents字段中
    if (response.data && response.data.contents) {
      // 尝试解析JSON
      return JSON.parse(response.data.contents);
    }
    return response.data;
  } catch (error) {
    console.error('JSONP代理请求失败:', error);
    throw error;
  }
};

export default {
  proxyGet,
  jsonpProxyGet,
  getProxyApiUrl
}; 