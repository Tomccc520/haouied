/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
/**
 * @file middleware/seo_rewrite.js
 * @description SEO 链接改写与 404 监测中间件
 */

'use strict';

module.exports = () => {
  /**
   * 规范化协议头，兼容多级代理场景。
   * @param {string} value 协议文本
   * @return {string} 规范化协议
   */
  const normalizeProtocol = value => {
    const protocol = String(value || '').split(',')[0].trim().toLowerCase();
    if (protocol === 'https') return 'https';
    return 'http';
  };

  /**
   * 判断 404 是否需要记录（过滤静态资源噪音）。
   * @param {string} path 请求路径
   * @return {boolean} 判断结果
   */
  const shouldRecord404 = path => {
    const pathname = String(path || '').trim();
    if (!pathname) return false;
    if (pathname.startsWith('/public/')) return false;
    if (pathname.startsWith('/uploads/')) return false;
    if (pathname.startsWith('/socket.io/')) return false;
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|map)$/i.test(pathname)) return false;
    return true;
  };

  /**
   * SEO 中间件主流程。
   */
  return async function seoRewrite(ctx, next) {
    const seoService = ctx.service?.uied?.seoCenter;
    if (!seoService) {
      await next();
      return;
    }

    const path = String(ctx.path || '/').trim() || '/';
    let config = null;

    let nextCalled = false;
    try {
      // 仅在非 API 场景尝试改写与重定向，避免影响管理端与公开 API。
      if (!seoService.shouldSkipRewrite(path) && !path.startsWith('/api/')) {
        config = await seoService.getConfigCached();

        // 1) 业务重定向规则（手工维护）
        const redirectMatch = seoService.matchRedirectRule(path, String(ctx.querystring || ''), config);
        if (redirectMatch?.matched && redirectMatch.targetUrl) {
          ctx.status = Number(redirectMatch.statusCode || 301);
          ctx.redirect(redirectMatch.targetUrl);
          return;
        }

        // 2) 链接改写规则（HTTPS/路径/跟踪参数）
        const rewriteResult = seoService.rewriteRequestUrl(
          {
            protocol: normalizeProtocol(ctx.get('x-forwarded-proto') || ctx.protocol),
            host: String(ctx.host || '').trim(),
            path,
            query: ctx.query || {},
          },
          config
        );

        if (rewriteResult?.shouldRedirect && rewriteResult.targetUrl) {
          ctx.status = Number(rewriteResult.statusCode || 301);
          ctx.redirect(rewriteResult.targetUrl);
          return;
        }
      }

      await next();
      nextCalled = true;

      // 3) 404 监测
      if (Number(ctx.status || 200) === 404 && shouldRecord404(path)) {
        if (!config) {
          config = await seoService.getConfigCached();
        }
        if (config?.monitoring?.enable404Monitor !== false) {
          await seoService.record404Log({
            path,
            referer: String(ctx.get('referer') || '').trim(),
            userAgent: String(ctx.get('user-agent') || '').trim(),
            source: 'middleware',
            ip: String(ctx.ip || '').trim(),
          });
        }
      }
    } catch (error) {
      ctx.logger.warn('[seo_rewrite] 中间件执行异常，已降级放行: %s', error?.message || error);
      if (!nextCalled) {
        await next();
      }
    }
  };
};
