/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-25
 */

import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import api from '../../services/api';
import { unwrapApiResponse } from '../../utils/apiResponse';
import { debugLog } from '../../utils/debugHelper';

interface CommercialPlacementItem {
  id: number;
  sponsorName?: string;
  sponsorTitle?: string;
  targetUrl?: string;
  imageUrl?: string;
  textContent?: string;
  badgeText?: string;
}

interface BannerFallbackItem {
  id: string | number;
  title?: string;
  description?: string;
  linkUrl?: string;
  imageUrl?: string;
}

interface DetailCommercialSlotProps {
  slotKey?: string;
  className?: string;
}

/**
 * 将详情页 slotKey 映射到 Banner 的 position。
 */
const resolveBannerPositionBySlotKey = (slotKey: string): string => {
  const key = String(slotKey || '').trim().toLowerCase();
  if (!key) return 'detail_top';
  if (key === 'website_detail_sidebar' || key === 'detail_sidebar') return 'website_detail_sidebar';
  if (key === 'detail_inline') return 'detail_inline';
  if (key === 'detail_bottom') return 'detail_bottom';
  if (key === 'detail_top') return 'detail_top';
  return key;
};

/**
 * 将 Banner 响应转换为详情页广告位统一结构。
 */
const mapBannerToPlacement = (item: BannerFallbackItem | null): CommercialPlacementItem | null => {
  if (!item) return null;
  return {
    id: Number(item.id || 0),
    sponsorTitle: String(item.title || '').trim() || '推荐内容',
    sponsorName: '',
    targetUrl: String(item.linkUrl || '').trim(),
    imageUrl: String(item.imageUrl || '').trim(),
    textContent: String(item.description || '').trim(),
    badgeText: '广告',
  };
};

/**
 * 详情页商业位插槽组件
 * 根据 slotKey 从商业位体系读取当前生效投放，失败时静默隐藏。
 */
const DetailCommercialSlot: React.FC<DetailCommercialSlotProps> = ({ slotKey, className }) => {
  const [item, setItem] = useState<CommercialPlacementItem | null>(null);
  const imageUrl = String(item?.imageUrl || '').trim();
  const targetUrl = String(item?.targetUrl || '').trim();

  useEffect(() => {
    const fetchPlacement = async () => {
      const key = String(slotKey || '').trim();
      if (!key) {
        setItem(null);
        return;
      }
      try {
        const res = await api.get('/commercial/placements', {
          params: { slotKey: key, limit: 1 },
        });
        const payload = unwrapApiResponse<{ list?: CommercialPlacementItem[] } | CommercialPlacementItem[]>(
          res.data,
          { list: [] }
        );
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.list) ? payload.list : []);
        if (list[0]) {
          setItem(list[0]);
          return;
        }
      } catch (error) {
        /**
         * 商业位在未授权版本返回 403 属于预期行为，静默降级不输出告警。
         */
        const status = Number((error as AxiosError)?.response?.status || 0);
        if (status !== 403) {
          debugLog.warn(`获取详情页商业位失败（${key}）:`, error);
        }
      }

      /**
       * 兼容回退：若商业位无投放或未启用，则读取 Banner 广告位配置。
       */
      try {
        const position = resolveBannerPositionBySlotKey(key);
        /**
         * 兼容老广告位命名：detail_top/detail_inline/detail_bottom -> detail，
         * website_detail_sidebar -> sidebar。
         */
        const fallbackPositions = [ position ];
        if ([ 'detail_top', 'detail_inline', 'detail_bottom' ].includes(position)) {
          fallbackPositions.push('detail');
        }
        if (position === 'website_detail_sidebar' || position === 'detail_sidebar') {
          fallbackPositions.push('sidebar');
        }
        let bannerHit: BannerFallbackItem | null = null;
        for (const currentPosition of Array.from(new Set(fallbackPositions))) {
          const res = await api.get('/banners/active', {
            params: {
              pageSlug: 'website-detail',
              position: currentPosition,
              limit: 1,
            },
          });
          const bannerList = unwrapApiResponse<BannerFallbackItem[]>(res.data, []);
          if (Array.isArray(bannerList) && bannerList[0]) {
            bannerHit = bannerList[0];
            break;
          }
        }
        setItem(mapBannerToPlacement(bannerHit));
      } catch (fallbackError) {
        debugLog.warn(`获取详情页 Banner 广告位失败（${key}）:`, fallbackError);
        setItem(null);
      }
    };
    fetchPlacement();
  }, [slotKey]);

  if (!item) return null;

  return (
    <section className={['detail-commercial-slot', className || ''].filter(Boolean).join(' ')}>
      <a
        href={targetUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-commercial-slot__link"
      >
        <div className="detail-commercial-slot__content">
          <div className="detail-commercial-slot__meta">
            <span className="detail-commercial-slot__badge">
              {item.badgeText || '推荐'}
            </span>
            <div className="detail-commercial-slot__title">
              {item.sponsorTitle || item.sponsorName || '推荐内容'}
            </div>
            {item.textContent && (
              <div className="detail-commercial-slot__desc">{item.textContent}</div>
            )}
          </div>
          {imageUrl && (
            <div className="detail-commercial-slot__image">
              <img src={imageUrl} alt={item.sponsorTitle || '广告位'} loading="lazy" />
            </div>
          )}
        </div>
      </a>
    </section>
  );
};

export default DetailCommercialSlot;
