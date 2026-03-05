/**
 * @file AntRankingPage.tsx
 * @description 最新文章页面组件
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  List, 
  Typography, 
  Tag, 
  Space, 
  Empty,
  Skeleton,
  Card,
  Tooltip,
  Button,
  message,
  Spin,
} from 'antd';
import { 
  FileTextOutlined,
  EyeOutlined,
  UserOutlined,
  FileImageOutlined,
  ArrowUpOutlined,
  FireOutlined,
} from '@ant-design/icons';
import useWordPressData from '../hooks/useWordPressData';
import { RankItem } from '../types';
import { getProxyImageUrl } from '../utils/imageProxy';
import './AntRankingPage.css';
import './mobile.css';

const { Text, Title } = Typography;

// 常量定义
const THROTTLE_WAIT = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟缓存过期

// 数据缓存
const dataCache: Record<string, { data: RankItem[]; expiresAt: number }> = {};

// 根据环境处理图片URL
const getImageUrl = (url?: string) => {
  if (!url) return undefined;
  // 生产环境直接使用原始URL
  if (process.env.NODE_ENV === 'production') {
    return url;
  }
  // 开发环境使用代理
  return getProxyImageUrl(url);
};

// 统一的图片错误处理函数
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, type: 'avatar' | 'thumbnail' = 'thumbnail') => {
  const img = e.currentTarget;
  
  if (img.dataset.errorHandled) {
    return;
  }
  
  img.dataset.errorHandled = 'true';
  
  img.src = type === 'avatar' 
    ? 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-avatar.png'
    : 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-thumbnail.jpg';
  
  const container = img.parentElement;
  if (container) {
    if (container.classList.contains('thumbnail-container')) {
      container.classList.add('thumbnail-error');
    } else if (container.classList.contains('author-avatar') || img.classList.contains('author-avatar')) {
      if (img.classList.contains('author-avatar')) {
        img.classList.add('avatar-error');
      } else {
        container.classList.add('avatar-error');
      }
    }
  }
};

// 自定义头像组件优化
const CustomAvatar: React.FC<{ src?: string; size?: 'small' | 'default' | 'large'; className?: string }> = ({ 
  src, 
  size = 'default',
  className = ''
}) => {
  const sizeMap = {
    small: '24px',
    default: '32px',
    large: '40px'
  };
  
  const avatarSize = sizeMap[size];
  
  return (
    <div 
      className={`custom-avatar ${className}`} 
      style={{ 
        width: avatarSize, 
        height: avatarSize, 
        borderRadius: '50%', 
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {src ? (
        <img 
          src={src} 
          alt="用户头像" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => handleImageError(e, 'avatar')}
        />
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="64 64 896 896" focusable="false" data-icon="user" 
            width="100%" height="100%" fill="var(--text-light)" aria-hidden="true">
            <path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

const AntRankingPage: React.FC = () => {
  // 状态管理
  const [isRequesting, setIsRequesting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [localData, setLocalData] = useState<RankItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  // 添加回到顶部状态
  const [showBackTop, setShowBackTop] = useState(false);

  // 使用WordPress数据hook获取文章
  const {
    data,
    isLoading: apiLoading,
    isTransitioning: apiTransitioning,
    error,
    total,
    totalPages,
    page,
    setPage,
    refresh,
  } = useWordPressData({
    type: 'latest-posts',
    perPage: 50,
    orderBy: 'date',
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setLocalData(data);
    }
  }, [data]);

  // 监听滚动，控制回到顶部按钮的显示
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 回到顶部功能
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 优化的节流刷新函数
  const throttledRefresh = React.useCallback(() => {
    if (!isRequesting) {
      setIsRequesting(true);
      
      return new Promise<void>((resolve, reject) => {
        try {
          const randomDelay = Math.random() * 1000 + 500;
          setTimeout(() => {
            refresh();
            setTimeout(() => {
              setIsRequesting(false);
              setRetryCount(0);
              resolve();
            }, 1000);
          }, randomDelay);
        } catch (error) {
          reject(error);
        }
      }).catch((error) => {
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          setTimeout(() => {
            throttledRefresh();
          }, delay);
        } else {
          setIsRequesting(false);
          message.error('数据加载失败，请稍后再试');
        }
      });
    }
    
    return Promise.resolve();
  }, [refresh, isRequesting, retryCount]);

  // 自动刷新数据
  useEffect(() => {
    const timer = setInterval(() => {
      throttledRefresh();
    }, 1800000); // 每30分钟刷新一次，与API缓存过期时间一致

    return () => clearInterval(timer);
  }, [throttledRefresh]);

  // 渲染列表项
  const renderPostItem = (item: RankItem, index: number) => {
    const thumbnail = item.thumbnail ? getImageUrl(item.thumbnail) : '';

    return (
      <div className="ranking-list-item" key={item.id}>
        <div className={`rank-number-container rank-number-${index < 3 ? index + 1 : 'other'}`}>
          <span className="rank-number">{index + 1}</span>
        </div>

        <div className="thumbnail-container">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={item.name || '文章缩略图'}
                onError={(e) => handleImageError(e, 'thumbnail')}
                loading="lazy" 
                decoding="async"
              />
            ) : (
              <div className="thumbnail-placeholder">
                <svg viewBox="64 64 896 896" focusable="false" data-icon="file-image" 
                  width="3rem" height="3rem" fill="currentColor" aria-hidden="true">
                  <path d="M553.1 509.1l-77.8 99.2-41.1-52.4a8 8 0 00-12.6 0l-99.8 127.2a7.98 7.98 0 006.3 12.9H696c6.7 0 10.4-7.7 6.3-12.9l-136.5-174a8.1 8.1 0 00-12.7 0zM360 442a40 40 0 1080 0 40 40 0 10-80 0z"></path>
                  <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"></path>
                </svg>
              </div>
            )}
          </a>
        </div>
        
        <div className="item-content">
          <div className="item-title">
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              {item.name}
              {item.isNew && <Tag color="red" style={{ marginLeft: '0.5rem' }}>新</Tag>}
            </a>
          </div>
          
          <div className="article-tags">
            <span className="item-tag primary">
              最新文章
            </span>
            <span className={`item-tag rank-tag rank-number-${index + 1}`}>
              实时更新 No.{index + 1}
            </span>
          </div>
          
          {item.description && (
            <div className="item-description">
              {item.description}
            </div>
          )}
          
          <div className="item-info">
            {item.authorName && (
              <Tooltip title={`作者: ${item.authorName}`}>
                <span className="item-author">
                  <CustomAvatar 
                    src={item.authorAvatar ? getImageUrl(item.authorAvatar) : undefined} 
                    size="small"
                    className="author-avatar"
                  />
                  <span>{item.authorName}</span>
                </span>
              </Tooltip>
            )}
            
            <span className="item-date">
              {item.timeAgo ? `${item.timeAgo}前` : item.date}
            </span>
            
            {item.viewCount !== undefined && (
              <Tooltip title="浏览量">
                <span className="item-views">
                  <EyeOutlined />
                  {item.viewCount}
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        
        <div className="score-container">
          <div className="score-value">
            <FireOutlined className="score-icon" />
            {Math.floor(item.score || 0)}
            <span className="score-decimal">.{Math.floor(((item.score || 0) % 1) * 10)}</span>
          </div>
          <div className="score-label">热度</div>
        </div>
      </div>
    );
  };

  // 骨架屏加载
  const loadingSkeleton = (
    <div className="ranking-list-loading">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="ranking-list-item loading">
          <div className="rank-number-container">
            <Skeleton.Avatar active size="small" shape="circle" />
          </div>
          <div className="item-content">
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="ranking-page">
      <Helmet>
        <title>最新文章 - UIED热榜</title>
        <meta name="description" content="实时更新的最新文章，包括UI设计、前端开发等最新内容" />
      </Helmet>

      <div className="ranking-container fade-in">
        <div className="ranking-tabs">
          <div className="ranking-header">
            <div className="title-left">
              <FileTextOutlined className="title-icon" />
              <span className="title-text">最新文章</span>
            </div>
            <div className="current-time">
              <div className="time-display">
                <span className="time-text">
                  {currentTime.toLocaleTimeString('zh-CN', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <span className="date-text">
                {currentTime.toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short'
                })}
              </span>
            </div>
          </div>

          <div className={`ranking-list ${fadeIn ? 'fade-in' : ''}`}>
            {error ? (
              <Empty
                description="加载失败，请稍后重试"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : apiLoading || showLoading ? (
              loadingSkeleton
            ) : (
              <div className="ranking-list">
                {localData.map((item, index) => renderPostItem(item, index))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 回到顶部按钮 */}
      {showBackTop && (
        <Button
          className="back-to-top-btn"
          type="primary"
          shape="circle"
          icon={<ArrowUpOutlined />}
          onClick={scrollToTop}
          size="large"
        />
      )}
    </div>
  );
};

export default AntRankingPage; 