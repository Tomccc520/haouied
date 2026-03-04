/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-25
 */

import React from 'react';
import AdBanner from '../../components/AdBanner';

interface DetailCommercialSlotProps {
  slotKey?: string;
  className?: string;
}

type DetailBannerPosition =
  | 'detail_top'
  | 'detail_inline'
  | 'detail_bottom'
  | 'detail_sidebar'
  | 'website_detail_sidebar';

/**
 * 将详情页 slotKey 映射到 Banner 的 position。
 */
const resolveBannerPositionBySlotKey = (slotKey: string): DetailBannerPosition => {
  const key = String(slotKey || '').trim().toLowerCase();
  if (!key) return 'detail_top';
  if (key === 'detall_top') return 'detail_top';
  if (key === 'detall_inline') return 'detail_inline';
  if (key === 'detall_bottom') return 'detail_bottom';
  if (key === 'detall_sidebar') return 'detail_sidebar';
  if (key === 'website_detail_sidebar' || key === 'detail_sidebar') return 'website_detail_sidebar';
  if (key === 'detail_inline') return 'detail_inline';
  if (key === 'detail_bottom') return 'detail_bottom';
  if (key === 'detail_top') return 'detail_top';
  return 'detail_top';
};

/**
 * 详情页商业位插槽组件
 * 与首页统一复用 AdBanner 渲染链，支持图片/文本/HTML 代码广告。
 */
const DetailCommercialSlot: React.FC<DetailCommercialSlotProps> = ({ slotKey, className }) => {
  const normalizedSlotKey = String(slotKey || '').trim();
  if (!normalizedSlotKey) return null;
  const position = resolveBannerPositionBySlotKey(normalizedSlotKey);
  return (
    <AdBanner
      pageSlug="website-detail"
      position={position}
      limit={1}
      commercialSlotKey={normalizedSlotKey}
      className={['detail-commercial-slot', className || ''].filter(Boolean).join(' ')}
    />
  );
};

export default DetailCommercialSlot;
