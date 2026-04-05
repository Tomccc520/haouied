/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */
/**
 * @file utils/adminShortcut.ts
 * @description 前台管理员快捷入口工具：用于空态时生成后台配置跳转链接
 */

const ADMIN_TOKEN_STORAGE_KEY = 'like_admin_token';
const ADMIN_PREVIEW_QUERY_KEY = 'adminShortcut';

/**
 * 判断当前前台是否允许显示“去后台配置”快捷入口。
 * 规则：
 * 1. 本地开发环境默认显示，便于联调
 * 2. 生产环境要求同域已存在后台登录态
 * 3. 允许通过 ?adminShortcut=1 强制预览
 */
export const canShowAdminShortcut = (): boolean => {
  if (typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const forced = String(searchParams.get(ADMIN_PREVIEW_QUERY_KEY) || '').trim();
  if (forced === '1' || forced === 'true') return true;

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return Boolean(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY));
};

/**
 * 生成后台管理页完整地址。
 * 说明：
 * 1. 本地开发默认指向 5173 管理端
 * 2. 生产环境默认指向同域 /admin
 */
export const resolveAdminShortcutUrl = (adminPath = ''): string => {
  const normalizedPath = String(adminPath || '').trim().startsWith('/')
    ? String(adminPath || '').trim()
    : `/${String(adminPath || '').trim()}`;

  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:5173${normalizedPath}`;
  }

  if (typeof window === 'undefined') {
    return `/admin${normalizedPath}`;
  }

  return `${window.location.origin}/admin${normalizedPath}`;
};
