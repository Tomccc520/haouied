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
  url = 'https://hao.uied.cn',
  type = 'website',
  noindex = false,
  canonical
}) => {
  const { siteInfo } = useSiteInfo();
  const siteName = String(siteInfo?.siteName || 'UIED设计导航').trim() || 'UIED设计导航';
  const defaultTitle = String(siteInfo?.siteTitle || siteName).trim() || siteName;
  const defaultDescription = String(
    siteInfo?.description ||
      'UIED设计导航是专业的设计师导航网站，精选优质UI/UX设计工具、平面设计资源、AI设计工具，为设计师提供一站式设计资源导航服务。'
  ).trim();
  const defaultKeywords = String(
    siteInfo?.keywords || '设计导航,UI设计工具,UX设计,平面设计,AI设计,设计资源,设计师工具,Figma,Sketch,设计灵感,UIED'
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

  useEffect(() => {
    // 更新页面标题
    document.title = fullTitle;

    // 更新或创建meta标签的通用函数
    const updateMetaTag = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
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
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', resolvedDescription, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:site_name', siteName, true);

    // 更新Twitter标签
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', fullTitle, true);
    updateMetaTag('twitter:description', resolvedDescription, true);
    updateMetaTag('twitter:image', image, true);

    // 更新 canonical 链接（支持按页面关闭 canonical）
    const canonicalHref = canonical === undefined ? url : canonical;
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
      node.setAttribute('href', String(canonicalHref || url));
    }

  }, [fullTitle, resolvedDescription, resolvedKeywords, image, url, type, noindex, canonical, siteName]);

  return null; // 该组件不渲染任何内容
};

export default SEO; 
