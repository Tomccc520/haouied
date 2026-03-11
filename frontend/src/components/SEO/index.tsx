/**
 * @file SEO/index.tsx
 * @description SEO组件 - 动态设置页面SEO信息
 * @copyright 版权所有 (c) 2025 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { useSiteInfo } from '../../hooks/useSiteInfo';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  canonical?: string | false;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image = 'https://hao.uied.cn/og-image.jpg',
  url,
  type = 'website',
  noindex = false,
  canonical
}) => {
  const { siteInfo } = useSiteInfo();
  const siteName = String(siteInfo?.siteName || 'UIED设计导航').trim() || 'UIED设计导航';
  const defaultTitle = String(siteInfo?.siteTitle || siteName).trim() || siteName;
  const defaultDescription = String(
    siteInfo?.description ||
      (siteInfo as { siteDescription?: string } | undefined)?.siteDescription ||
      '发现优质设计与 AI 工具资源'
  ).trim();
  const defaultKeywords = String(
    siteInfo?.keywords ||
      (siteInfo as { siteKeywords?: string } | undefined)?.siteKeywords ||
      'UIED,AI工具导航,设计导航'
  ).trim();

  /**
   * 计算页面最终标题，优先使用页面标题并自动补站点名后缀。
   */
  const fullTitle = (() => {
    const resolvedTitle = String(title || defaultTitle).trim() || defaultTitle;
    if (!resolvedTitle || resolvedTitle === siteName || resolvedTitle.includes(siteName)) {
      return resolvedTitle || siteName;
    }
    return `${resolvedTitle} - ${siteName}`;
  })();
  const resolvedDescription = String(description || defaultDescription).trim() || defaultDescription;
  const resolvedKeywords = String(keywords || defaultKeywords).trim() || defaultKeywords;
  const defaultCanonicalUrl = (() => {
    if (typeof window === 'undefined') {
      return 'https://hao.uied.cn/';
    }
    return `${window.location.origin}${window.location.pathname}`;
  })();
  const resolvedUrl = (() => {
    if (!url) return defaultCanonicalUrl;
    const raw = String(url).trim();
    if (!raw) return defaultCanonicalUrl;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (typeof window === 'undefined') return `https://hao.uied.cn${raw.startsWith('/') ? raw : `/${raw}`}`;
    try {
      return new URL(raw, window.location.origin).toString();
    } catch (_error) {
      return defaultCanonicalUrl;
    }
  })();
  const canonicalHref = (() => {
    if (canonical === undefined) return defaultCanonicalUrl;
    if (canonical === false) return false;
    const raw = String(canonical || '').trim();
    if (!raw) return defaultCanonicalUrl;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (typeof window === 'undefined') return `https://hao.uied.cn${raw.startsWith('/') ? raw : `/${raw}`}`;
    try {
      return new URL(raw, window.location.origin).toString();
    } catch (_error) {
      return defaultCanonicalUrl;
    }
  })();

  useEffect(() => {
    // 更新页面标题
    document.title = fullTitle;

    // 更新或创建meta标签的通用函数
    const updateMetaTag = (name: string, content: string, mode: 'name' | 'property' = 'name') => {
      const selector = mode === 'property' ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (mode === 'property') {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 更新基本SEO标签
    updateMetaTag('description', resolvedDescription);
    updateMetaTag('keywords', resolvedKeywords);
    updateMetaTag('robots', noindex ? 'noindex,nofollow' : 'index,follow');

    // 更新Open Graph标签
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:title', fullTitle, 'property');
    updateMetaTag('og:description', resolvedDescription, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', resolvedUrl, 'property');
    updateMetaTag('og:site_name', siteName, 'property');

    // 更新Twitter标签（使用 name 属性，避免被部分抓取器忽略）
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', resolvedDescription);
    updateMetaTag('twitter:image', image);
    updateMetaTag('twitter:url', resolvedUrl);

    // 更新 canonical 链接（支持按页面关闭 canonical）
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalHref === false) {
      if (canonicalLink?.parentNode) {
        canonicalLink.parentNode.removeChild(canonicalLink);
      }
    } else {
      let node = canonicalLink;
      if (!node) {
        node = document.createElement('link');
        node.setAttribute('rel', 'canonical');
        document.head.appendChild(node);
      }
      node.setAttribute('href', String(canonicalHref || defaultCanonicalUrl));
    }

  }, [fullTitle, resolvedDescription, resolvedKeywords, image, resolvedUrl, type, noindex, canonicalHref, defaultCanonicalUrl, siteName]);

  return null; // 该组件不渲染任何内容
};

export default SEO; 
