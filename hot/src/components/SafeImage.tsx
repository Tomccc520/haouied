/**
 * @file SafeImage.tsx
 * @description 安全图片组件，处理图片跨域问题并提供降级显示
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React, { useState } from 'react';
import { getSafeImageUrl } from '../services/api';

/**
 * 安全图片组件
 * 处理图片跨域问题并提供降级显示
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.src - 图片URL
 * @param {string} props.alt - 图片替代文本
 * @param {string} props.className - CSS类名
 * @param {Object} props.style - 内联样式
 * @param {string} props.fallbackSrc - 降级图片URL
 * @param {string} props.width - 图片宽度
 * @param {string} props.height - 图片高度
 * @returns {React.ReactElement} 图片组件
 */
const SafeImage: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
  width?: string | number;
  height?: string | number;
  onLoad?: () => void;
  onClick?: () => void;
}> = ({
  src,
  alt = '图片',
  className = '',
  style = {},
  fallbackSrc = '/placeholder-image.png',
  width,
  height,
  onLoad,
  onClick
}) => {
  // 图片加载错误状态
  const [hasError, setHasError] = useState(false);
  
  // 处理图片加载错误
  const handleError = () => {
    setHasError(true);
  };
  
  // 获取安全的图片URL
  const safeImageUrl = hasError ? fallbackSrc : getSafeImageUrl(src);
  
  return (
    <img
      src={safeImageUrl}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      onError={handleError}
      onLoad={onLoad}
      onClick={onClick}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

export default SafeImage; 