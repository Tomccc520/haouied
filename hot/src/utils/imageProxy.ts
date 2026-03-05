/**
 * 图片代理工具
 * 用于处理图片URL，确保图片能够正常加载
 */

// 图片代理服务器配置
const IMAGE_PROXY_CONFIG = {
  // 可以根据需要配置不同的代理服务
  WORDPRESS: 'https://images.weserv.nl/',
  // 备用代理服务
  FALLBACK: 'https://wsrv.nl/',
};

/**
 * 处理图片URL，确保能够通过HTTPS访问
 * @param url 原始图片URL
 * @returns 处理后的URL
 */
export const ensureHttps = (url: string): string => {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
};

/**
 * 清除图片URL中的所有参数，包括imageMogr2和其他CDN参数
 * @param url 原始图片URL
 * @returns 清理后的URL
 */
export const cleanImageUrl = (url: string): string => {
  if (!url) return '';
  
  // 首先处理问号后面的所有参数
  if (url.includes('?')) {
    url = url.split('?')[0];
  }
  
  // 再处理可能的散列标记
  if (url.includes('#')) {
    url = url.split('#')[0];
  }
  
  return url;
};

/**
 * 获取图片代理URL
 * @param originalUrl 原始图片URL
 * @param options 代理选项
 * @returns 代理后的URL
 */
export const getProxyImageUrl = (originalUrl: string, options: {
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  quality?: number;
} = {}): string => {
  if (!originalUrl) return '';

  try {
    // 1. 确保URL是HTTPS并清除所有参数
    const cleanUrl = cleanImageUrl(ensureHttps(originalUrl));
    
    // 2. 构建代理URL
    const proxyUrl = new URL(IMAGE_PROXY_CONFIG.WORDPRESS);
    
    // 3. 添加原始URL参数
    proxyUrl.searchParams.set('url', cleanUrl);
    
    // 4. 添加其他选项
    if (options.width) {
      proxyUrl.searchParams.set('w', options.width.toString());
    }
    if (options.height) {
      proxyUrl.searchParams.set('h', options.height.toString());
    }
    if (options.fit) {
      proxyUrl.searchParams.set('fit', options.fit);
    }
    if (options.quality) {
      proxyUrl.searchParams.set('q', options.quality.toString());
    } else {
      // 默认使用更高的质量
      proxyUrl.searchParams.set('q', '90');
    }
    
    // 5. 添加默认参数
    proxyUrl.searchParams.set('output', 'webp'); // 使用WebP格式
    proxyUrl.searchParams.set('default', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDEzLjg1IDE2IDEwLjUgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4='); // 默认图片
    
    return proxyUrl.toString();
  } catch (error) {
    console.error('图片代理URL生成失败:', error);
    // 如果URL处理失败，返回原始URL
    return originalUrl;
  }
};

/**
 * 获取缩略图URL
 * @param thumbnailUrl 原始缩略图URL
 * @param size 尺寸选项 'small' | 'medium' | 'large'
 * @returns 处理后的缩略图URL
 */
export const getThumbnailProxyUrl = (thumbnailUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  if (!thumbnailUrl) return '';
  
  // 定义不同尺寸的宽高配置 - 增加尺寸以获得更清晰的图片
  const sizeConfig = {
    small: { width: 225, height: 300 },
    medium: { width: 450, height: 600 },
    large: { width: 900, height: 1200 }
  };
  
  // 先清理URL，移除所有参数
  const cleanUrl = cleanImageUrl(thumbnailUrl);
  
  // 使用图片代理服务处理缩略图，增加质量参数
  return getProxyImageUrl(cleanUrl, {
    width: sizeConfig[size].width,
    height: sizeConfig[size].height,
    fit: 'inside', // 保持原始比例
    quality: 95 // 高质量
  });
};

/**
 * 获取头像URL
 * @param avatarUrl 原始头像URL
 * @returns 处理后的头像URL
 */
export const getAvatarProxyUrl = (avatarUrl: string): string => {
  if (!avatarUrl) return '';
  
  // 先清理URL，移除所有参数
  const cleanUrl = cleanImageUrl(avatarUrl);
  
  // 使用图片代理服务处理头像
  return getProxyImageUrl(cleanUrl, {
    width: 80, // 增加尺寸以获得更清晰的头像
    height: 80,
    fit: 'cover', // 裁剪以填满指定尺寸
    quality: 95 // 高质量
  });
};

export default {
  getProxyImageUrl,
  getAvatarProxyUrl,
  getThumbnailProxyUrl
}; 