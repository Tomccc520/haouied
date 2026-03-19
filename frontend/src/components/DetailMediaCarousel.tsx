/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-19
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './DetailMediaCarousel.css';

export interface DetailMediaCarouselProps {
  images: string[];
  title: string;
  label?: string;
  badges?: string[];
  className?: string;
  onMainClick?: (index: number) => void;
  onMainImageError?: (index: number) => void;
}

/**
 * 详情页通用幻灯片组件（文章/网址共用）
 */
const DetailMediaCarousel: React.FC<DetailMediaCarouselProps> = ({
  images,
  title,
  label = '内容预览',
  badges = [],
  className = '',
  onMainClick,
  onMainImageError,
}) => {
  /**
   * 规范化图片列表：去空、去重，保证轮播稳定。
   */
  const normalizedImages = useMemo(() => {
    const rows = Array.isArray(images) ? images : [];
    const cleaned = rows.map((item) => String(item || '').trim()).filter(Boolean);
    return Array.from(new Set(cleaned));
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * 图片列表变化时重置当前索引，避免越界。
   */
  useEffect(() => {
    if (normalizedImages.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0 || prev >= normalizedImages.length) return 0;
      return prev;
    });
  }, [normalizedImages]);

  if (normalizedImages.length === 0) return null;

  const currentImage = normalizedImages[activeIndex] || normalizedImages[0];

  /**
   * 点击主预览图时回调给上层页面（用于灯箱等扩展能力）。
   */
  const handleMainClick = () => {
    if (typeof onMainClick === 'function') {
      onMainClick(activeIndex);
    }
  };

  /**
   * 主图加载失败时向上抛出，便于上层做兜底切换。
   */
  const handleMainImageError = () => {
    if (typeof onMainImageError === 'function') {
      onMainImageError(activeIndex);
    }
  };

  return (
    <div className={`detail-media-carousel ${className}`.trim()}>
      <div className="detail-media-carousel__card">
        <button
          type="button"
          className="detail-media-carousel__frame"
          onClick={handleMainClick}
          aria-label={`查看 ${title} 预览图`}
        >
          <div className="detail-media-carousel__toolbar">
            <div className="detail-media-carousel__dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="detail-media-carousel__label">{label}</div>
            <div className="detail-media-carousel__badges">
              {badges.map((badge, index) => (
                <span key={`${badge}-${index}`} className="detail-media-carousel__badge">
                  {badge}
                </span>
              ))}
              <span className="detail-media-carousel__badge detail-media-carousel__badge--muted">
                {normalizedImages.length} 张图
              </span>
            </div>
          </div>
          <div className="detail-media-carousel__viewport">
            <img
              src={currentImage}
              alt={`${title} 预览`}
              loading="lazy"
              onError={handleMainImageError}
            />
          </div>
        </button>

        {normalizedImages.length > 1 && (
          <div className="detail-media-carousel__thumb-slider">
            <Swiper
              modules={[Navigation]}
              navigation
              spaceBetween={10}
              slidesPerView={3.2}
              breakpoints={{
                768: { slidesPerView: 3.2 },
                1024: { slidesPerView: 4.2 },
              }}
              className="detail-media-carousel__swiper"
            >
              {normalizedImages.map((url, index) => (
                <SwiperSlide key={`${url}-${index}`}>
                  <button
                    type="button"
                    className={`detail-media-carousel__thumb ${activeIndex === index ? 'is-active' : ''}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`查看第 ${index + 1} 张预览图`}
                  >
                    <img src={url} alt={`预览图 ${index + 1}`} loading="lazy" />
                    <span className="detail-media-carousel__thumb-index">{index + 1}</span>
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailMediaCarousel;
