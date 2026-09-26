/**
 * @file SEO/index.tsx
 * @description SEO组件 - 动态设置页面SEO信息
 * @copyright 版权所有 (c) 2025 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useSiteInfo } from '../../hooks/useSiteInfo';
import { DEFAULT_SITE_INFO } from '../../contexts/SiteContext';
import api from '../../services/api';

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

interface SeoPublicConfig {
  webmasterVerification?: Record<string, unknown>;
}

let seoPublicConfigCache: SeoPublicConfig | null = null;
let seoPublicConfigPromise: Promise<SeoPublicConfig> | null = null;

/**
 * 获取当前运行时站点 origin，统一去掉末尾斜杠。
 */
const getRuntimeOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return String(window.location?.origin || '').trim().replace(/\/+$/, '');
  }
  const envOrigin = String(process.env.REACT_APP_SITE_ORIGIN || '').trim();
  if (!envOrigin) return '';
  try {
    const url = new URL(envOrigin);
    return `${url.protocol}//${url.host}`;
  } catch (_error) {
    return envOrigin.replace(/\/+$/, '');
  }
};

/**
 * 将相对路径转为当前站点绝对 URL，绝对地址直接透传。
 */
const toRuntimeAbsoluteUrl = (rawValue: string, fallback: string): string => {
  const raw = String(rawValue || '').trim();
  if (!raw) return fallback;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = getRuntimeOrigin();
  if (raw.startsWith('//')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}${raw}`;
    }
    return `https:${raw}`;
  }
  if (!origin) {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${normalizedPath}`;
};

/**
 * 获取公开 SEO 配置，并使用模块级缓存避免页面切换时重复请求。
 */
const fetchSeoPublicConfig = async (): Promise<SeoPublicConfig> => {
  if (seoPublicConfigCache) {
    return seoPublicConfigCache;
  }
  if (seoPublicConfigPromise) {
    return seoPublicConfigPromise;
  }
  seoPublicConfigPromise = api
    .get('/seo/public-config', {
      params: {
        _t: Date.now(),
      },
    })
    .then((response) => {
      const data = response?.data;
      const normalized = (data && typeof data === 'object') ? (data as SeoPublicConfig) : {};
      seoPublicConfigCache = normalized;
      return normalized;
    })
    .catch(() => {
      const fallback: SeoPublicConfig = {};
      seoPublicConfigCache = fallback;
      return fallback;
    })
    .finally(() => {
      seoPublicConfigPromise = null;
    });
  return seoPublicConfigPromise;
};

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noindex = false,
  canonical
}) => {
  const { siteInfo } = useSiteInfo();
  const [seoPublicConfig, setSeoPublicConfig] = useState<SeoPublicConfig | null>(seoPublicConfigCache);

  /**
   * 组件首次挂载时获取公开 SEO 配置，用于注入站长验证标签。
   */
  useEffect(() => {
    let active = true;
    fetchSeoPublicConfig().then((config) => {
      if (!active) return;
      setSeoPublicConfig(config);
    });
    return () => {
      active = false;
    };
  }, []);
  const siteName = String(siteInfo?.siteName || DEFAULT_SITE_INFO.siteName).trim() || DEFAULT_SITE_INFO.siteName;
  const siteTitle = String(siteInfo?.siteTitle || DEFAULT_SITE_INFO.siteTitle).trim() || DEFAULT_SITE_INFO.siteTitle;
  const titleSuffix = siteTitle || siteName;
  const defaultTitle = titleSuffix;
  const defaultDescription = String(
    siteInfo?.description ||
      (siteInfo as { siteDescription?: string } | undefined)?.siteDescription ||
      DEFAULT_SITE_INFO.description
  ).trim() || DEFAULT_SITE_INFO.description;
  const defaultKeywords = String(
    siteInfo?.keywords ||
      (siteInfo as { siteKeywords?: string } | undefined)?.siteKeywords ||
      DEFAULT_SITE_INFO.keywords
  ).trim() || DEFAULT_SITE_INFO.keywords;

  /**
   * 计算页面最终标题，优先使用页面标题并自动补站点名后缀。
   */
  const fullTitle = (() => {
    const resolvedTitle = String(title || defaultTitle).trim() || defaultTitle;
    if (!resolvedTitle || resolvedTitle === titleSuffix || resolvedTitle.includes(titleSuffix)) {
      return resolvedTitle || titleSuffix;
    }
    if (siteName && resolvedTitle.includes(siteName)) {
      return resolvedTitle;
    }
    return `${resolvedTitle} - ${titleSuffix}`;
  })();
  const resolvedDescription = String(description || defaultDescription).trim() || defaultDescription;
  const resolvedKeywords = String(keywords || defaultKeywords).trim() || defaultKeywords;
  const defaultShareImage = (() => {
    const origin = getRuntimeOrigin();
    // 使用仓库内确定存在的品牌图标作为默认分享图，避免社交抓取器命中 404。
    return origin ? `${origin}/logo512.png` : '/logo512.png';
  })();
  const resolvedImage = toRuntimeAbsoluteUrl(String(image || defaultShareImage), defaultShareImage);
  const defaultCanonicalUrl = (() => {
    const origin = getRuntimeOrigin();
    if (!origin) return '/';
    const path = typeof window === 'undefined'
      ? '/'
      : String(window.location?.pathname || '/');
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  })();
  const resolvedUrl = (() => {
    if (!url) return defaultCanonicalUrl;
    return toRuntimeAbsoluteUrl(String(url), defaultCanonicalUrl);
  })();
  const canonicalHref = (() => {
    if (canonical === undefined) return defaultCanonicalUrl;
    if (canonical === false) return false;
    return toRuntimeAbsoluteUrl(String(canonical || ''), defaultCanonicalUrl);
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
    updateMetaTag('og:image', resolvedImage, 'property');
    updateMetaTag('og:url', resolvedUrl, 'property');
    updateMetaTag('og:site_name', siteName, 'property');

    // 更新Twitter标签（使用 name 属性，避免被部分抓取器忽略）
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', resolvedDescription);
    updateMetaTag('twitter:image', resolvedImage);
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

    /**
     * 更新站长验证标签；未配置值时删除旧标签，避免后台清空后前端残留。
     */
    const updateVerificationMeta = (metaName: string, tokenValue: string) => {
      const selector = `meta[name="${metaName}"]`;
      const existing = document.querySelector(selector) as HTMLMetaElement | null;
      const normalizedToken = String(tokenValue || '').trim();
      if (!normalizedToken) {
        if (existing?.parentNode) {
          existing.parentNode.removeChild(existing);
        }
        return;
      }
      if (!existing) {
        const created = document.createElement('meta');
        created.setAttribute('name', metaName);
        created.setAttribute('content', normalizedToken);
        document.head.appendChild(created);
        return;
      }
      existing.setAttribute('content', normalizedToken);
    };

    const verification = (
      seoPublicConfig?.webmasterVerification &&
      typeof seoPublicConfig.webmasterVerification === 'object'
    ) ? seoPublicConfig.webmasterVerification : {};

    updateVerificationMeta('baidu-site-verification', String(verification.baidu || ''));
    updateVerificationMeta('google-site-verification', String(verification.google || ''));
    updateVerificationMeta('msvalidate.01', String(verification.bing || ''));
    updateVerificationMeta('sogou_site_verification', String(verification.sogou || ''));
    updateVerificationMeta('360-site-verification', String(verification.so360 || ''));

  }, [
    fullTitle,
    resolvedDescription,
    resolvedKeywords,
    resolvedImage,
    resolvedUrl,
    type,
    noindex,
    canonicalHref,
    defaultCanonicalUrl,
    siteName,
    seoPublicConfig,
  ]);

  return null; // 该组件不渲染任何内容
};

export default SEO; 
