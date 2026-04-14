'use strict';

const path = require('path');

const DEFAULT_UPLOADS_RELATIVE_DIR = path.join('app', 'public', 'uploads');
const PUBLIC_UPLOAD_PREFIX = '/public/uploads';

/**
 * 规范化目录路径，去除末尾分隔符，避免后续拼接出现重复斜杠。
 * @param {string} targetPath 目录路径
 * @returns {string}
 */
function normalizeDirPath(targetPath = '') {
  return String(targetPath || '').trim().replace(/[\\/]+$/, '');
}

/**
 * 将上传目录配置统一解析为绝对路径。
 * 兼容传入「父目录」或「.../uploads」两种写法，最终都归一到 uploads 目录。
 * @param {string} baseDir 项目根目录
 * @param {string} configuredPath 配置路径（可为空）
 * @returns {string}
 */
function resolveUploadsAbsoluteDirByInput(baseDir = '', configuredPath = '') {
  const root = normalizeDirPath(baseDir);
  const configured = String(configuredPath || '').trim();
  let absolutePath = configured
    ? (path.isAbsolute(configured) ? configured : path.resolve(root, configured))
    : path.resolve(root, DEFAULT_UPLOADS_RELATIVE_DIR);
  if (path.basename(absolutePath).toLowerCase() !== 'uploads') {
    absolutePath = path.join(absolutePath, 'uploads');
  }
  return normalizeDirPath(path.resolve(absolutePath));
}

/**
 * 从 Egg App 上下文解析 uploads 根目录。
 * @param {import('egg').Application} app Egg 应用实例
 * @returns {string}
 */
function resolveUploadsAbsoluteDir(app) {
  const baseDir = app?.baseDir || process.cwd();
  const configuredPath = app?.config?.uiedUploadsAbsDir || process.env.UIED_UPLOADS_ABS_DIR || '';
  return resolveUploadsAbsoluteDirByInput(baseDir, configuredPath);
}

/**
 * 获取公开 URI 前缀（固定为 /public/uploads）。
 * @returns {string}
 */
function getPublicUploadPrefix() {
  return PUBLIC_UPLOAD_PREFIX;
}

/**
 * 按段拼接公开上传 URI。
 * @param {...string} segments URI 片段
 * @returns {string}
 */
function buildPublicUploadUri(...segments) {
  const normalizedSegments = [];
  segments.forEach(rawSegment => {
    const values = Array.isArray(rawSegment) ? rawSegment : [rawSegment];
    values.forEach(segment => {
      const value = String(segment || '').trim();
      if (!value) return;
      normalizedSegments.push(value.replace(/\\/g, '/'));
    });
  });
  return path.posix.join(PUBLIC_UPLOAD_PREFIX, ...normalizedSegments);
}

/**
 * 解析 uploads 子路径对应的绝对目录。
 * @param {import('egg').Application} app Egg 应用实例
 * @param {...string} segments 子路径片段
 * @returns {string}
 */
function resolveUploadsSubPath(app, ...segments) {
  const base = resolveUploadsAbsoluteDir(app);
  return path.resolve(base, ...segments);
}

/**
 * 将 /public/uploads URI 解析为服务端绝对路径，并给出安全校验结果。
 * @param {import('egg').Application} app Egg 应用实例
 * @param {string} uri 上传资源 URI
 * @returns {{relativeUri:string,relativePath:string,absolutePath:string,uploadsRoot:string,safe:boolean}}
 */
function resolveUploadUriToAbsolutePath(app, uri = '') {
  const uploadsRoot = resolveUploadsAbsoluteDir(app);
  const normalizedUri = path.posix.normalize(String(uri || '').trim().replace(/\\/g, '/'));
  const isPrefixMatch = normalizedUri === PUBLIC_UPLOAD_PREFIX
    || normalizedUri.startsWith(`${PUBLIC_UPLOAD_PREFIX}/`);
  if (!isPrefixMatch) {
    return {
      relativeUri: normalizedUri,
      relativePath: '',
      absolutePath: '',
      uploadsRoot,
      safe: false,
    };
  }
  const relativePath = normalizedUri
    .slice(PUBLIC_UPLOAD_PREFIX.length)
    .replace(/^\/+/, '');
  const absolutePath = path.resolve(uploadsRoot, relativePath);
  const safe = absolutePath === uploadsRoot
    || absolutePath.startsWith(`${uploadsRoot}${path.sep}`);
  return {
    relativeUri: normalizedUri,
    relativePath,
    absolutePath,
    uploadsRoot,
    safe,
  };
}

module.exports = {
  DEFAULT_UPLOADS_RELATIVE_DIR,
  getPublicUploadPrefix,
  buildPublicUploadUri,
  resolveUploadsAbsoluteDirByInput,
  resolveUploadsAbsoluteDir,
  resolveUploadsSubPath,
  resolveUploadUriToAbsolutePath,
};
