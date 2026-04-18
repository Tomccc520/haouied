/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.2.13
 * 
 * @file urlUtils.ts
 * @description 统一的 URL 处理工具 - 处理 API 地址和图片路径
 */

// 默认端口配置
const DEFAULT_API_PORT = '8002';
const LOCAL_API_BASE = `http://localhost:${DEFAULT_API_PORT}/api`;
const SAME_ORIGIN_API_BASE = '/api';

/**
 * 本地环境主机名集合。
 */
const LOCAL_HOST_SET = new Set([ 'localhost', '127.0.0.1', '0.0.0.0', '::1' ]);

/**
 * 判断主机名是否为本地地址。
 */
const isLocalHostname = (hostname: string): boolean => {
  return LOCAL_HOST_SET.has(String(hostname || '').trim().toLowerCase());
};

/**
 * 统一规范 API 基址，保证绝对地址场景自动补全 /api。
 */
const normalizeApiBase = (rawBase: string): string => {
  const normalized = String(rawBase || '').trim().replace(/\/+$/, '');
  if (!normalized) return '';
  if (/^https?:\/\/[^/]+$/i.test(normalized)) {
    return `${normalized}/api`;
  }
  return normalized;
};

/**
 * 判断是否为可直接返回的 data URI。
 */
const isDataUrl = (value: string): boolean => {
  return /^data:/i.test(String(value || '').trim());
};

/**
 * 判断字符串是否为 http/https 绝对地址。
 */
const isHttpAbsoluteUrl = (value: string): boolean => {
  return /^https?:\/\//i.test(String(value || '').trim());
};

/**
 * 解析 URL 的主机名，解析失败时返回空字符串。
 */
const resolveHostnameFromUrl = (value: string): string => {
  try {
    return new URL(String(value || '').trim()).hostname.toLowerCase();
  } catch (_error) {
    return '';
  }
};

/**
 * 获取当前后端基址对应的主机名（用于判断是否同站历史地址）。
 */
const resolveBackendHostname = (): string => {
  const backendBase = String(getBackendBaseUrl() || '').trim();
  if (!backendBase) return '';

  // 绝对地址：直接解析主机
  if (isHttpAbsoluteUrl(backendBase)) {
    return resolveHostnameFromUrl(backendBase);
  }

  // 相对地址场景（如 /api）：回退为当前页面主机
  if (typeof window !== 'undefined') {
    return String(window.location.hostname || '').trim().toLowerCase();
  }
  return '';
};

/**
 * 判断“包含 uploads 路径的绝对地址”是否应改写到当前后端域名。
 * 仅对本地地址或同站历史地址生效，避免误改写外部 CDN 图（如 img.uied.cn）。
 */
const shouldRewriteAbsoluteUploadUrl = (rawUrl: string): boolean => {
  const hostname = resolveHostnameFromUrl(rawUrl);
  if (!hostname) return false;
  if (isLocalHostname(hostname)) return true;

  const backendHostname = resolveBackendHostname();
  if (!backendHostname) return false;
  return hostname === backendHostname;
};

/**
 * 从绝对地址或相对地址中提取上传资源路径，并保留原始 uploads/public/api 前缀。
 */
const extractUploadPath = (rawUrl: string): string => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  const matchers = [
    /\/uploads\/.+$/i,
    /\/public\/uploads\/.+$/i,
    /\/api\/uploads\/.+$/i,
  ];

  for (const matcher of matchers) {
    const matchedPath = value.match(matcher)?.[0];
    if (matchedPath) return matchedPath;
  }

  return '';
};

/**
 * 获取 API 基础地址
 * 统一优先使用 CRA 环境变量（REACT_APP_API_URL）
 * 
 * @returns API 基础地址
 */
export const getApiBaseUrl = (): string => {
  const craEnv = String(process.env.REACT_APP_API_URL || '').trim();
  const legacyEnv = String(process.env.VITE_API_URL || '').trim();
  const envCandidate = craEnv || legacyEnv;
  const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const runtimeIsLocal = isLocalHostname(runtimeHost);

  /**
   * 优先读取环境变量，但生产站点禁止回落到 localhost/127.0.0.1，
   * 防止打包时误把本机地址写进产物导致线上 CORS 全量失败。
   */
  if (envCandidate) {
    const normalizedEnvBase = normalizeApiBase(envCandidate);
    if (/^https?:\/\//i.test(normalizedEnvBase)) {
      try {
        const parsed = new URL(normalizedEnvBase);
        if (isLocalHostname(parsed.hostname) && !runtimeIsLocal) {
          return SAME_ORIGIN_API_BASE;
        }
      } catch (error) {
        console.warn('解析 API 地址失败，使用原始配置:', error);
      }
    }
    return normalizedEnvBase;
  }

  return runtimeIsLocal ? LOCAL_API_BASE : SAME_ORIGIN_API_BASE;
};

/**
 * 获取后端基础地址（不含 /api）
 */
export const getBackendBaseUrl = (): string => {
  return getApiBaseUrl().replace('/api', '');
};

/**
 * 获取完整的图片 URL
 * 处理相对路径和错误的端口，统一指向后端服务器
 * 
 * @param url - 图片 URL（可能是相对路径或完整 URL）
 * @returns 完整的图片 URL
 */
export const getFullImageUrl = (url: string): string => {
  if (!url) return '';
  if (isDataUrl(url)) return url;
  
  const backendBase = getBackendBaseUrl();
  const normalizedUrl = String(url || '').trim();
  const uploadPath = extractUploadPath(normalizedUrl);
  
  // 如果是相对路径，添加后端服务器地址
  if (normalizedUrl.startsWith('/uploads/')
    || normalizedUrl.startsWith('/public/uploads/')
    || normalizedUrl.startsWith('/api/uploads/')) {
    return `${backendBase}${normalizedUrl}`;
  }
  
  /**
   * 仅当是“本地/同站历史地址”时，才把 uploads 绝对地址改写到当前后端域名。
   * 外部站点（例如 img.uied.cn）即便包含 /uploads/ 也必须保持原始地址，
   * 否则会被错误改写为本站地址，触发 404 后回退成统一占位图。
   */
  if (uploadPath) {
    if (!isHttpAbsoluteUrl(normalizedUrl)) {
      return `${backendBase}${uploadPath}`;
    }
    if (shouldRewriteAbsoluteUploadUrl(normalizedUrl)) {
      return `${backendBase}${uploadPath}`;
    }
    return normalizedUrl;
  }
  
  // 如果已经是完整的外部 URL，直接返回
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  
  // 其他情况，添加后端地址
  return `${backendBase}${normalizedUrl.startsWith('/') ? '' : '/'}${normalizedUrl}`;
};

/**
 * 处理内容中的图片路径
 * 将内容中的相对路径或错误端口的图片路径替换为正确的后端地址
 * 
 * @param content - HTML 或 Markdown 内容
 * @returns 处理后的内容
 */
export const processContentImageUrls = (content: string): string => {
  if (!content) return '';
  
  const backendBase = getBackendBaseUrl();
  
  return content
    // 替换历史 localhost / 127.0.0.1 图片地址
    .replace(/src="https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/uploads\//g, `src="${backendBase}/uploads/`)
    .replace(/src="https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/public\/uploads\//g, `src="${backendBase}/public/uploads/`)
    .replace(/src="https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/api\/uploads\//g, `src="${backendBase}/api/uploads/`)
    .replace(/src='https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/uploads\//g, `src='${backendBase}/uploads/`)
    .replace(/src='https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/public\/uploads\//g, `src='${backendBase}/public/uploads/`)
    .replace(/src='https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\/api\/uploads\//g, `src='${backendBase}/api/uploads/`)
    // 替换相对路径
    .replace(/src="\/uploads\//g, `src="${backendBase}/uploads/`)
    .replace(/src="\/public\/uploads\//g, `src="${backendBase}/public/uploads/`)
    .replace(/src="\/api\/uploads\//g, `src="${backendBase}/api/uploads/`)
    .replace(/src='\/uploads\//g, `src='${backendBase}/uploads/`)
    .replace(/src='\/public\/uploads\//g, `src='${backendBase}/public/uploads/`)
    .replace(/src='\/api\/uploads\//g, `src='${backendBase}/api/uploads/`);
};

/**
 * URL 工具对象导出，便于默认导入场景复用。
 */
const urlUtils = {
  getApiBaseUrl,
  getBackendBaseUrl,
  getFullImageUrl,
  processContentImageUrls,
};

export default urlUtils;
