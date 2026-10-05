/**
 * @file service/uied/seoScraper.js
 * @description SEO 信息抓取服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class SeoScraperService extends Service {
  /**
   * 判断外部站点是否属于连接层失败，避免把底层 Socket 诊断直接展示给用户。
   * @param {unknown} error 原始请求异常
   * @return {boolean} 是否为网络连接失败
   */
  isNetworkFetchError(error) {
    const message = String(error?.message || error || '');
    return /connected\s*:\s*false|status\s+-1|connect timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EAI_AGAIN|socket hang up/i.test(message);
  }

  /**
   * 将抓取异常转换为面向运营人员的简洁提示，隐藏连接池和请求头细节。
   * @param {unknown} error 原始请求异常
   * @param {string} url 请求地址
   * @return {string} 可展示的中文错误文案
   */
  formatFetchError(error, url) {
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch (parseError) {
      hostname = String(url || '').slice(0, 120);
    }

    if (this.isNetworkFetchError(error)) {
      return `目标站点 ${hostname || '外部网站'} 暂时无法连接，可能是目标站点防护、服务器网络出口或 DNS 路由导致，请稍后重试或手动填写。`;
    }

    const rawMessage = String(error?.message || error || '未知错误')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    return rawMessage || '外部站点返回了未知错误，请稍后重试。';
  }

  /**
   * 从 URL 抓取 SEO 信息
   */
  async fetch(url) {
    const { ctx } = this;

    // 确保 URL 有协议
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      // 使用 curl 获取网页内容
      const response = await ctx.curl(fullUrl, {
        timeout: 10000,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UIED-Nav/1.0; +https://fsuied.com)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        followRedirect: true,
        maxRedirects: 3,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = response.data.toString('utf-8');

      // 解析 SEO 信息
      const seoInfo = this.parseHtml(html, fullUrl);

      return seoInfo;
    } catch (error) {
      ctx.logger.error('SEO 抓取失败:', error);
      throw new Error(`抓取失败: ${this.formatFetchError(error, fullUrl)}`);
    }
  }

  /**
   * 解析 HTML 提取 SEO 信息
   */
  parseHtml(html, url) {
    const result = {
      title: '',
      description: '',
      keywords: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      favicon: '',
      h1: '',
    };

    // 提取 title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      result.title = this.decodeHtml(titleMatch[1].trim());
    }

    // 提取 meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    if (descMatch) {
      result.description = this.decodeHtml(descMatch[1].trim());
    }

    // 提取 meta keywords
    const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']keywords["']/i);
    if (keywordsMatch) {
      result.keywords = this.decodeHtml(keywordsMatch[1].trim());
    }

    // 提取 og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      result.ogTitle = this.decodeHtml(ogTitleMatch[1].trim());
    }

    // 提取 og:description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      result.ogDescription = this.decodeHtml(ogDescMatch[1].trim());
    }

    // 提取 og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      result.ogImage = this.resolveUrl(ogImageMatch[1].trim(), url);
    }

    // 提取 favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i) ||
                         html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch) {
      result.favicon = this.resolveUrl(faviconMatch[1].trim(), url);
    } else {
      // 默认 favicon 路径
      try {
        const urlObj = new URL(url);
        result.favicon = `${urlObj.origin}/favicon.ico`;
      } catch (e) {
        // ignore
      }
    }

    // 提取第一个 h1
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    if (h1Match) {
      result.h1 = this.decodeHtml(h1Match[1].trim());
    }

    return result;
  }

  /**
   * 解码 HTML 实体
   */
  decodeHtml(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  }

  /**
   * 解析相对 URL 为绝对 URL
   */
  resolveUrl(relativeUrl, baseUrl) {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    if (relativeUrl.startsWith('//')) {
      return 'https:' + relativeUrl;
    }
    try {
      const base = new URL(baseUrl);
      if (relativeUrl.startsWith('/')) {
        return base.origin + relativeUrl;
      }
      return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
      return relativeUrl;
    }
  }
}

module.exports = SeoScraperService;
