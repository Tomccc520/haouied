/**
 * @file TopAuthorsPage.tsx
 * @description 优秀作者页面组件，展示活跃度和贡献度最高的作者
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Statistic,
  Avatar
} from 'antd';
import { 
  UserOutlined,
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CrownOutlined
} from '@ant-design/icons';
import useWordPressData from '../hooks/useWordPressData';
import { User, UseWordPressDataParams, RankItem } from '../types';
import { getProxyImageUrl } from '../utils/imageProxy';
import './TopAuthorsPage.css';
import './mobile.css';

const { Text, Title } = Typography;

// 常量定义
const THROTTLE_WAIT = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30分钟自动刷新

// 根据环境处理图片URL
const getImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (process.env.NODE_ENV === 'production') {
    return url;
  }
  return getProxyImageUrl(url);
};

// 统一的图片错误处理函数
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = e.currentTarget;
  
  if (img.dataset.errorHandled) {
    return;
  }
  
  img.dataset.errorHandled = 'true';
  img.src = 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-avatar.png';
  
  const container = img.parentElement;
  if (container && container.classList.contains('topauthors-avatar')) {
    container.classList.add('avatar-error');
  }
};

// 将RankItem转换为User
const convertRankItemToUser = (item: RankItem): User => {
  return {
    id: item.id,
    name: item.name,
    url: item.link,
    description: item.description,
    avatar_urls: {
      '24': item.authorAvatar || '',
      '48': item.authorAvatar || '',
      '96': item.authorAvatar || ''
    },
    meta: {
      post_count: item.count || 0,
      comment_count: 0, // 暂时没有评论数据，设为0
      view_count: item.viewCount || 0
    }
  };
};

const TopAuthorsPage: React.FC = () => {
  // ref用于跟踪组件是否已卸载
  const isMounted = useRef(true);
  // ref用于防止重复请求
  const isRequestingRef = useRef(false);
  // ref用于跟踪自动刷新定时器
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 状态管理
  const [retryCount, setRetryCount] = useState(0);
  const [localData, setLocalData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBackTop, setShowBackTop] = useState(false);

  // 使用WordPress数据hook获取作者数据
  const params: UseWordPressDataParams = {
    type: 'users',
    perPage: 50,
    orderBy: 'post_count',
    orderDirection: 'desc'
  };

  const {
    data,
    isLoading: apiLoading,
    error,
    refresh,
  } = useWordPressData(params);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 数据处理
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // 将RankItem数组转换为User数组
      const users = (data as RankItem[]).map(convertRankItemToUser);
      
      // 使用综合算法对作者进行排序
      const sortedUsers = sortAuthorsByQuality(users);
      
      setLocalData(sortedUsers);
      setIsLoading(false);
    }
  }, [data]);

  /**
   * 作者质量排序算法
   * 
   * 注: 目前仅基于文章数量和浏览量进行排序
   * 未来计划：
   * 1. 通过扩展WordPress API获取评论数和更多统计数据
   * 2. 添加时间衰减因子，使最近活跃的作者排名更高
   * 3. 考虑文章质量（平均浏览量、点赞率等）
   */
  const sortAuthorsByQuality = (authors: User[]): User[] => {
    return [...authors].sort((a, b) => {
      // 主要排序依据：文章数量
      const postCountDiff = (b.meta?.post_count || 0) - (a.meta?.post_count || 0);
      if (postCountDiff !== 0) return postCountDiff;
      
      // 次要排序依据：浏览量
      return (b.meta?.view_count || 0) - (a.meta?.view_count || 0);
    });
  };

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

  // 优化的刷新函数
  const handleRefresh = useCallback(() => {
    if (isRequestingRef.current || !isMounted.current) {
      return Promise.resolve();
    }
    
    isRequestingRef.current = true;
    setIsLoading(true);
    
    try {
      refresh();
      
      // 设置一个延迟来解除请求锁定状态
      setTimeout(() => {
        if (isMounted.current) {
          isRequestingRef.current = false;
          setRetryCount(0);
        }
      }, THROTTLE_WAIT);
      
      return Promise.resolve();
    } catch (error) {
      console.error('刷新数据出错:', error);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        
        setTimeout(() => {
          if (isMounted.current) {
            isRequestingRef.current = false;
            handleRefresh();
          }
        }, delay);
      } else {
        if (isMounted.current) {
          isRequestingRef.current = false;
          setIsLoading(false);
          message.error('数据加载失败，请稍后再试');
        }
      }
      
      return Promise.reject(error);
    }
  }, [refresh, retryCount]);

  // 首次加载数据
  useEffect(() => {
    // 只在首次挂载时加载数据
    handleRefresh();
    
    // 设置自动刷新间隔
    timerRef.current = setInterval(() => {
      if (isMounted.current && !isRequestingRef.current) {
        handleRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);  // 空依赖数组确保只在挂载时执行一次

  // 渲染作者卡片
  const renderAuthorCard = (author: User, index: number) => {
    const avatarUrl = author.avatar_urls['96'] ? getImageUrl(author.avatar_urls['96']) : undefined;
    const rankClass = index < 3 ? `topauthors-rank-number-${index + 1}` : '';

    return (
      <div className="topauthors-card" key={author.id}>
        <div className={`topauthors-rank-number-container ${rankClass}`}>
          <span className="topauthors-rank-number">{index + 1}</span>
        </div>

        <div className="topauthors-avatar-container">
          <a href={author.url} target="_blank" rel="noopener noreferrer">
            <img 
              src={avatarUrl || 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-avatar.png'}
              alt={author.name}
              className="topauthors-avatar"
              onError={handleImageError}
            />
          </a>
        </div>
        
        <div className="topauthors-content">
          <div className="topauthors-user-title">
            <a href={author.url} target="_blank" rel="noopener noreferrer">
              {author.name}
            </a>
            {index < 3 && (
              <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'orange'}>
                <TrophyOutlined /> {index === 0 ? '金牌作者' : index === 1 ? '银牌作者' : '铜牌作者'}
              </Tag>
            )}
          </div>
          
          {author.description && (
            <div className="topauthors-description">
              {author.description}
            </div>
          )}
          
          <div className="topauthors-stats">
            <Tooltip title="文章数">
              <span className="topauthors-stat-item">
                <FileTextOutlined />
                {author.meta?.post_count || 0}
              </span>
            </Tooltip>
            <Tooltip title="评论数">
              <span className="topauthors-stat-item">
                <MessageOutlined />
                {author.meta?.comment_count || 0}
              </span>
            </Tooltip>
            <Tooltip title="总浏览量">
              <span className="topauthors-stat-item">
                <EyeOutlined />
                {author.meta?.view_count || 0}
              </span>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  // 骨架屏加载
  const loadingSkeleton = (
    <div className="topauthors-loading">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="topauthors-card topauthors-card-loading">
          <div className="topauthors-rank-number-container">
            <Skeleton.Avatar active size="small" shape="circle" />
          </div>
          <div className="topauthors-avatar-container">
            <Skeleton.Avatar active size={96} shape="circle" />
          </div>
          <div className="topauthors-content">
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="topauthors-page">
      <Helmet>
        <title>优秀作者 - UIED热榜</title>
        <meta name="description" content="UIED社区最活跃的优秀作者，包括UI设计、前端开发等领域的专业贡献者" />
      </Helmet>

      <div className="topauthors-container topauthors-fade-in">
        <div className="topauthors-content">
          <div className="topauthors-header">
            <div className="topauthors-title-left">
              <CrownOutlined className="topauthors-title-icon" />
              <span className="topauthors-title-text">优秀作者</span>
            </div>
            <div className="topauthors-current-time">
              <div className="topauthors-time-display">
                <span className="topauthors-time-text">
                  {currentTime.toLocaleTimeString('zh-CN', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <span className="topauthors-date-text">
                {currentTime.toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short'
                })}
              </span>
            </div>
          </div>

          <div className={`topauthors-list ${fadeIn ? 'topauthors-fade-in' : ''}`}>
            {error ? (
              <Empty
                description="加载失败，请稍后重试"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : isLoading || apiLoading ? (
              loadingSkeleton
            ) : (
              <div className="topauthors-grid">
                {localData.map((author, index) => renderAuthorCard(author, index))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showBackTop && (
        <Button
          className="topauthors-back-to-top"
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

export default TopAuthorsPage; 