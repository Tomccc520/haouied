'use strict';

const path = require('path');
const { publicPrefix, publicUrl } = require('../extend/config');

/**
 * 标准化基础域名，自动去除末尾斜杠。
 * @param {string} rawUrl 原始域名
 * @returns {string}
 */
function normalizeBaseUrl(rawUrl = '') {
  return String(rawUrl || '').trim().replace(/\/+$/, '');
}

/**
 * 获取运行时资源域名。
 * 优先读取环境变量，避免生产环境误返回 localhost。
 * @returns {string}
 */
function resolvePublicBaseUrl() {
  const envBaseUrl = normalizeBaseUrl(process.env.UIED_PUBLIC_URL || process.env.PUBLIC_URL || '');
  if (envBaseUrl) return envBaseUrl;
  return normalizeBaseUrl(publicUrl);
}

/**
 * 判断基础域名是否为本地回环地址。
 * @param {string} baseUrl 基础域名
 * @returns {boolean}
 */
function isLoopbackBaseUrl(baseUrl = '') {
  try {
    const parsed = new URL(baseUrl);
    const host = String(parsed.hostname || '').toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0';
  } catch (_error) {
    return true;
  }
}

/**
 * 判断当前是否处于生产运行时。
 * @returns {boolean}
 */
function isProductionRuntime() {
  const env = String(process.env.EGG_SERVER_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
  if (env === 'prod' || env === 'production') return true;

  // 兼容容器里未注入 EGG_SERVER_ENV，但通过 `egg-bin dev --env=prod` 启动的场景
  const cliArgText = Array.isArray(process.argv) ? process.argv.join(' ') : '';
  const npmScript = String(process.env.npm_lifecycle_script || '');
  const commandText = `${cliArgText} ${npmScript}`.toLowerCase();
  if (commandText.includes('--env=prod')) return true;
  if (commandText.includes('"env":"prod"')) return true;
  if (commandText.includes("'env':'prod'")) return true;
  return false;
}

/**
 * 将数据库中的资源路径规范化为对外访问路径。
 * @param {string} rawPath 原始路径
 * @returns {string}
 */
function normalizeAssetPath(rawPath = '') {
  const value = String(rawPath || '').trim();
  if (!value) return '';

  // 兼容历史绝对地址（例如 http://127.0.0.1:8002/public/uploads/...）
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const host = String(parsed.hostname || '').toLowerCase();
      const pathname = String(parsed.pathname || '').trim();

      if (pathname.startsWith('/public/uploads/')) {
        return pathname;
      }
      if (pathname.startsWith('/api/uploads/')) {
        return pathname.replace('/api/uploads/', '/public/uploads/');
      }

      // 本地地址统一退化为相对路径，避免前端拿到不可访问的 localhost
      if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0') {
        return pathname || '/';
      }
    } catch (_error) {
      // ignore
    }

    // 非本地外链直接返回
    return value;
  }

  // 统一将历史路径映射为对外可访问路径
  if (value.startsWith('/public/uploads/')) {
    return value;
  }
  if (value.startsWith('/api/uploads/')) {
    return value.replace('/api/uploads/', '/public/uploads/');
  }
  if (value.includes('/public/uploads/')) {
    return value.slice(value.indexOf('/public/uploads/'));
  }
  if (value.includes('/api/uploads/')) {
    return value.slice(value.indexOf('/api/uploads/')).replace('/api/uploads/', '/public/uploads/');
  }

  // 静态资源保留 /public 前缀，走 nginx /public 反向代理
  if (value.startsWith('/public/static/') || value.startsWith('/api/static/')) {
    return value;
  }

  if (value.startsWith('/')) return value;

  return path.posix.join('/', String(publicPrefix || '/api/uploads'), value);
}

/**
 * 按基础域名拼接绝对资源地址。
 * @param {string} baseUrl 基础域名
 * @param {string} assetPath 资源路径
 * @returns {string}
 */
function buildAbsoluteUrl(baseUrl, assetPath) {
  const parsedUrl = new URL(baseUrl);
  parsedUrl.pathname = path.posix.join(parsedUrl.pathname || '/', assetPath);
  return parsedUrl.toString();
}

// 定义转换绝对路径的方法
function toAbsoluteUrl(u) {
  if (!u) {
    return '';
  }
  const value = String(u).trim();
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedAssetPath = normalizeAssetPath(value);
  const baseUrl = resolvePublicBaseUrl();

  // 未配置域名时返回相对路径
  if (!baseUrl) {
    return normalizedAssetPath;
  }

  // 本地回环域名：开发环境返回绝对地址方便本地预览；生产环境返回相对路径避免泄露 localhost
  if (isLoopbackBaseUrl(baseUrl)) {
    if (isProductionRuntime()) {
      return normalizedAssetPath;
    }
    return buildAbsoluteUrl(baseUrl, normalizedAssetPath);
  }

  return buildAbsoluteUrl(baseUrl, normalizedAssetPath);
}

/**
 * 将绝对地址还原为相对路径。
 * @param {string} u 绝对地址或相对路径
 * @returns {string}
 */
function toRelativeUrl(u) {
  if (!u) {
    return '';
  }
  const value = String(u).trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) return normalizeAssetPath(value);

  try {
    const up = new URL(value);
    const baseUrl = resolvePublicBaseUrl();
    if (baseUrl && up.toString().startsWith(baseUrl)) {
      const relative = up.toString().slice(baseUrl.length) || '/';
      return normalizeAssetPath(relative);
    }
    return normalizeAssetPath(up.pathname || value);
  } catch (_error) {
    return normalizeAssetPath(value);
  }
}


module.exports = {
  toAbsoluteUrl,
  toRelativeUrl,
};
