/**
 * @file notFoundSeo.ts
 * @description 不存在页面统一 SEO 元信息
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.10.05
 */

export const NOT_FOUND_SEO_TITLE = '页面不存在 - UIED AI工具导航';
export const NOT_FOUND_SEO_DESCRIPTION = '访问的页面不存在或已删除，请返回首页继续浏览 UIED AI工具导航。';
export const NOT_FOUND_SEO_KEYWORDS = '页面不存在,404,UIED AI工具导航';
export const NOT_FOUND_HEADING = '页面不存在';

/**
 * 将当前路由转换为不存在页面的自指向 canonical，去除查询参数避免重复 URL。
 * @param pathname 当前路由路径
 * @param origin 当前站点 origin，可选
 * @returns 自指向 canonical 地址
 */
export const buildNotFoundCanonical = (pathname: string, origin = ''): string => {
  const normalizedPath = String(pathname || '/').trim() || '/';
  const safePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  const normalizedOrigin = String(origin || '').trim().replace(/\/+$/, '');
  return normalizedOrigin ? `${normalizedOrigin}${safePath}` : safePath;
};
