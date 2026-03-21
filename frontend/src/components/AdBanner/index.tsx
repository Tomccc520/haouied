/**
 * @file AdBanner/index.tsx
 * @description 广告 Banner 组件 - 支持多种位置和样式，支持图片和 HTML 代码两种类型
 */

import React, { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useBanners, Banner } from '../../hooks/useBanners';
import api from '../../services/api';
import { unwrapApiResponse } from '../../utils/apiResponse';
import './index.css';

interface AdBannerProps {
  pageSlug?: string;
  position?:
    | 'top'
    | 'page_banner'
    | 'sidebar'
    | 'bottom'
    | 'popup'
    | 'home'
    | 'footer'
    | 'global_strip'
    | 'detail'
    | 'detail_top'
    | 'detail_inline'
    | 'detail_bottom'
    | 'detail_sidebar'
    | 'website_detail_sidebar';
  limit?: number;
  className?: string;
  commercialSlotKey?: string;
  commercialSlotType?: string;
  commercialScopeType?: string;
  commercialScopeValue?: string;
}

interface CommercialPlacement {
  id: number;
  slotKey: string;
  slotType: string;
  scopeType: string;
  scopeValue: string;
  sponsorName: string;
  sponsorTitle: string;
  targetUrl: string;
  imageUrl: string;
  textContent: string;
  badgeText: string;
  positionIndex: number;
  startTime: number;
  endTime: number;
}

type DisplayBanner = Banner & { badgeText?: string };

/**
 * 规范化广告位标识，避免大小写/空值导致请求与样式分支不一致。
 */
const normalizeAdPosition = (position?: string): string => {
  const value = String(position || '').trim().toLowerCase();
  return value || 'top';
};

/**
 * 计算广告查询位置：
 * - `global_strip`/`footer` 使用独立位置，避免与 `home` 混淆；
 * - 其他位置沿用原值，交给后端兼容映射处理。
 */
const resolveBannerRequestPosition = (position?: string): string => {
  const normalized = normalizeAdPosition(position);
  if (normalized === 'global_strip') return 'global_strip';
  if (normalized === 'footer') return 'footer';
  return normalized;
};

/**
 * 计算前端渲染样式分组（顶部/侧栏/底部）。
 */
const resolveBannerRenderVariant = (
  position?: string
): 'top' | 'sidebar' | 'bottom' | 'page_grid' => {
  const normalized = normalizeAdPosition(position);
  if (normalized === 'page_banner') return 'page_grid';
  if ([ 'sidebar', 'detail_sidebar', 'website_detail_sidebar' ].includes(normalized)) return 'sidebar';
  if ([ 'bottom', 'footer', 'detail_bottom' ].includes(normalized)) return 'bottom';
  return 'top';
};

const AdBanner: React.FC<AdBannerProps> = ({
  pageSlug,
  position = 'top',
  limit = 5,
  className = '',
  commercialSlotKey,
  commercialSlotType,
  commercialScopeType,
  commercialScopeValue,
}) => {
  const [commercialPlacements, setCommercialPlacements] = useState<CommercialPlacement[]>([]);
  const [commercialLoading, setCommercialLoading] = useState(false);
  const htmlContainerRef = useRef<HTMLDivElement>(null);
  const normalizedPosition = normalizeAdPosition(position);
  const requestPosition = resolveBannerRequestPosition(position);
  const renderVariant = resolveBannerRenderVariant(position);
  const enableCommercial =
    Boolean(commercialSlotKey) ||
    Boolean(commercialSlotType) ||
    Boolean(commercialScopeType) ||
    Boolean(commercialScopeValue);
  /**
   * 将商业位 slotKey 注入为样式类名，便于按运营位做精细化样式覆盖（如 global_strip）
   */
  const commercialSlotClassName = commercialSlotKey
    ? `ad-banner--slot-${String(commercialSlotKey).trim().replace(/[^a-zA-Z0-9_-]/g, '-')}`
    : '';
  const positionClassName = `ad-banner--position-${normalizedPosition.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  /**
   * 全局横条广告位默认不按 pageSlug 过滤，避免搜索页等频道出现“已配置但空白”的误判。
   */
  const effectivePageSlug = normalizedPosition === 'global_strip' ? undefined : pageSlug;

  const { banners: backendBanners, loading: backendLoading, recordClick: recordBackendClick } = useBanners({
    pageSlug: effectivePageSlug,
    position: requestPosition,
    limit,
  });

  useEffect(() => {
    if (!enableCommercial) {
      setCommercialPlacements([]);
      setCommercialLoading(false);
      return;
    }

    const fetchPlacements = async () => {
      setCommercialLoading(true);
      try {
        const params: Record<string, string | number> = {};
        if (commercialSlotKey) params.slotKey = commercialSlotKey;
        if (commercialSlotType) params.slotType = commercialSlotType;
        if (commercialScopeType) params.scopeType = commercialScopeType;
        if (commercialScopeValue) params.scopeValue = commercialScopeValue;
        if (limit) params.limit = limit;

        const res = await api.get('/commercial/placements', { params });
        const payload = unwrapApiResponse<{ list?: CommercialPlacement[] }>(res.data, { list: [] });
        setCommercialPlacements(Array.isArray(payload.list) ? payload.list : []);
      } catch (error) {
        /**
         * 商业位在未授权版本返回 403 属于预期行为，静默降级不刷错误日志。
         */
        const status = Number((error as AxiosError)?.response?.status || 0);
        if (status !== 403) {
          console.error('获取商业位投放失败:', error);
        }
        setCommercialPlacements([]);
      } finally {
        setCommercialLoading(false);
      }
    };

    fetchPlacements();
  }, [
    enableCommercial,
    commercialSlotKey,
    commercialSlotType,
    commercialScopeType,
    commercialScopeValue,
    limit,
  ]);

  const commercialBanners: DisplayBanner[] = commercialPlacements.map(item => ({
    id: String(item.id),
    title: item.sponsorTitle || item.sponsorName || '赞助推荐',
    description: item.textContent || '',
    imageUrl: item.imageUrl || '',
    linkUrl: item.targetUrl || '',
    linkTarget: '_blank',
    contentType: item.imageUrl ? 'image' : 'text',
    pageSlug,
    position: requestPosition || 'top',
    order: item.positionIndex || 0,
    visible: true,
    clickCount: 0,
    badgeText: item.badgeText || '',
  }));
  const useCommercialData = enableCommercial && commercialBanners.length > 0;
  const effectiveBanners: DisplayBanner[] = useCommercialData ? commercialBanners : backendBanners;

  // 处理 HTML 代码类型的广告
  useEffect(() => {
    if (!htmlContainerRef.current || effectiveBanners.length === 0) return;

    const htmlBanners = effectiveBanners.filter(b => b.contentType === 'html' && b.htmlContent);
    if (htmlBanners.length === 0) return;

    // 清空容器
    htmlContainerRef.current.innerHTML = '';

    // 插入 HTML 内容
    htmlBanners.forEach(banner => {
      const wrapper = document.createElement('div');
      wrapper.className = 'html-banner-wrapper';
      wrapper.innerHTML = banner.htmlContent || '';
      
      // 记录点击（如果 HTML 中有链接）
      wrapper.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'A' || target.closest('a')) {
          recordBackendClick(banner.id);
        }
      });

      htmlContainerRef.current?.appendChild(wrapper);
    });

    // 执行 HTML 中的脚本
    const scripts = htmlContainerRef.current.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [effectiveBanners, recordBackendClick]);

  const handleClick = (banner: DisplayBanner) => {
    if (!useCommercialData) {
      recordBackendClick(banner.id);
    }
    if (banner.linkUrl) {
      window.open(banner.linkUrl, banner.linkTarget || '_blank');
    }
  };

  if (enableCommercial && commercialLoading) {
    return null;
  }

  if (backendLoading && !useCommercialData) {
    return null;
  }

  // 分离图片类型和 HTML 类型的广告
  const imageBanners = effectiveBanners.filter(b => b.contentType === 'image' || !b.contentType);
  const validImageBanners = imageBanners.filter(b => String(b.imageUrl || '').trim().length > 0);
  const htmlBanners = effectiveBanners.filter(b => b.contentType === 'html');
  const textBanners = effectiveBanners.filter(b => b.contentType === 'text');
  const pageGridImageBanners = validImageBanners.slice(0, 4);
  const pageGridTextBanners = textBanners.slice(0, 4);

  if (effectiveBanners.length === 0) {
    return null;
  }

  /**
   * 页面 Banner：固定为四卡网格样式，给频道页“热门推荐上方”使用。
   */
  if (renderVariant === 'page_grid') {
    return (
      <div className={`ad-banner ad-banner-page-grid ${positionClassName} ${commercialSlotClassName} ${className}`.trim()}>
        {htmlBanners.length > 0 && (
          <div ref={htmlContainerRef} className="html-banner-container" />
        )}

        {pageGridImageBanners.length > 0 && (
          <div className="page-banner-grid">
            {pageGridImageBanners.map((banner) => (
              <div
                key={banner.id}
                className="page-banner-grid__item"
                onClick={() => handleClick(banner)}
              >
                <img src={banner.imageUrl} alt={banner.title} />
                <div className="page-banner-grid__content">
                  {banner.title && <div className="page-banner-grid__title">{banner.title}</div>}
                  {banner.description && <div className="page-banner-grid__desc">{banner.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {pageGridImageBanners.length === 0 && pageGridTextBanners.length > 0 && (
          <div className="page-banner-grid page-banner-grid--text">
            {pageGridTextBanners.map((banner, index) => (
              <div
                key={banner.id}
                className="page-banner-grid__item page-banner-grid__item--text"
                data-gradient-index={index % 4}
                onClick={() => handleClick(banner)}
              >
                <div className="page-banner-grid__text-title">
                  {banner.title}
                  {banner.badgeText && <span className="page-banner-grid__text-badge">{banner.badgeText}</span>}
                </div>
                {banner.description && <div className="page-banner-grid__text-desc">{banner.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 顶部横幅样式
  if (renderVariant === 'top') {
    return (
      <div className={`ad-banner ad-banner-top ${positionClassName} ${commercialSlotClassName} ${className}`.trim()}>
        {/* HTML 代码类型广告 */}
        {htmlBanners.length > 0 && (
          <div ref={htmlContainerRef} className="html-banner-container" />
        )}
        
        {/* 图片类型广告 */}
        {validImageBanners.length === 1 ? (
          <div className="banner-single" onClick={() => handleClick(validImageBanners[0])}>
            <img src={validImageBanners[0].imageUrl} alt={validImageBanners[0].title} />
            {validImageBanners[0].title && <div className="banner-title">{validImageBanners[0].title}</div>}
          </div>
        ) : validImageBanners.length > 1 ? (
          <div className="banner-carousel">
            {validImageBanners.map((banner, index) => (
              <div
                key={banner.id}
                className="banner-item"
                onClick={() => handleClick(banner)}
                style={{ animationDelay: `${index * 5}s` }}
              >
                <img src={banner.imageUrl} alt={banner.title} />
              </div>
            ))}
          </div>
        ) : null}

        {validImageBanners.length === 0 && textBanners.length > 0 && (
          <div className="banner-text-list">
            {textBanners.map(banner => (
              <div
                key={banner.id}
                className="banner-text-item"
                onClick={() => handleClick(banner)}
              >
                <div className="banner-text-title">
                  {banner.title}
                  {banner.badgeText && <span className="banner-text-badge">{banner.badgeText}</span>}
                </div>
                {banner.description && <div className="banner-text-desc">{banner.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 侧边栏样式
  if (renderVariant === 'sidebar') {
    return (
      <div className={`ad-banner ad-banner-sidebar ${positionClassName} ${commercialSlotClassName} ${className}`.trim()}>
        {/* HTML 代码类型广告 */}
        {htmlBanners.length > 0 && (
          <div ref={htmlContainerRef} className="html-banner-container" />
        )}
        
        {/* 图片类型广告 */}
        {validImageBanners.map(banner => (
          <div
            key={banner.id}
            className="sidebar-banner-item"
            onClick={() => handleClick(banner)}
          >
            <img src={banner.imageUrl} alt={banner.title} />
            {banner.title && <div className="banner-title">{banner.title}</div>}
            {banner.description && <div className="banner-desc">{banner.description}</div>}
          </div>
        ))}

        {validImageBanners.length === 0 && textBanners.length > 0 && (
          <div className="banner-text-list">
            {textBanners.map(banner => (
              <div
                key={banner.id}
                className="banner-text-item"
                onClick={() => handleClick(banner)}
              >
                <div className="banner-text-title">
                  {banner.title}
                  {banner.badgeText && <span className="banner-text-badge">{banner.badgeText}</span>}
                </div>
                {banner.description && <div className="banner-text-desc">{banner.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 底部样式
  if (renderVariant === 'bottom') {
    return (
    <div className={`ad-banner ad-banner-bottom ${positionClassName} ${commercialSlotClassName} ${className}`.trim()}>
        {/* HTML 代码类型广告 */}
        {htmlBanners.length > 0 && (
          <div ref={htmlContainerRef} className="html-banner-container" />
        )}
        
        {/* 图片类型广告 */}
        {validImageBanners.length > 0 && (
          <div className="bottom-banner-grid">
            {validImageBanners.map(banner => (
              <div
                key={banner.id}
                className="bottom-banner-item"
                onClick={() => handleClick(banner)}
              >
                <img src={banner.imageUrl} alt={banner.title} />
              </div>
            ))}
          </div>
        )}

        {validImageBanners.length === 0 && textBanners.length > 0 && (
          <div className="banner-text-list">
            {textBanners.map(banner => (
              <div
                key={banner.id}
                className="banner-text-item"
                onClick={() => handleClick(banner)}
              >
                <div className="banner-text-title">
                  {banner.title}
                  {banner.badgeText && <span className="banner-text-badge">{banner.badgeText}</span>}
                </div>
                {banner.description && <div className="banner-text-desc">{banner.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AdBanner;
