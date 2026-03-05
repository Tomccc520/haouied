/**
 * @file DesignResourcesPage.tsx
 * @description 设计素材页面组件，展示最新设计素材和资源
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  List, 
  Avatar, 
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
  Radio,
} from 'antd';
import { 
  AppstoreOutlined, // 使用AppstoreOutlined作为主图标
  EyeOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FireOutlined,
  FileImageOutlined,
  SketchOutlined,
  BgColorsOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import throttle from 'lodash/throttle';
import useWordPressData from '../hooks/useWordPressData';
import { RankItem } from '../types';
import { getProxyImageUrl } from '../utils/imageProxy';
import './AntRankingPage.css';
import './mobile.css'; // 引入移动端样式
import wordPressApi from '../services/wordpress-api';

const { Text, Title } = Typography;

// 常量定义
const THROTTLE_WAIT = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟缓存过期

// 定义素材分类选项
const RESOURCE_OPTIONS = [
  { key: 'all', name: '全部素材', type: 'category', id: 4 }, // 保留全部素材选项
  { key: 'portfolio', name: '作品集', type: 'category', id: 392 },
  { key: 'card', name: '卡片式', type: 'category', id: 171 },
  { key: 'big-data', name: '可视化', type: 'category', id: 65 },
  { key: 'dashboard', name: '后台', type: 'category', id: 67 },
  { key: 'icon', name: '图标', type: 'category', id: 45 },
  { key: 'ar', name: '增强现实', type: 'category', id: 791 },
  { key: 'app', name: '应用', type: 'category', id: 44 },
  { key: 'watch', name: '手表', type: 'category', id: 66 },
  { key: 'web', name: '网页', type: 'category', id: 75 },
  { key: 'design-system', name: '设计系统/组件', type: 'category', id: 261 },
  { key: '3d-icon', name: '3D/图标', type: 'category', id: 203 },
  { key: 'font', name: '字体', type: 'category', id: 319 },
  { key: 'ps-plugin', name: 'PS插件', type: 'category', id: 11013 },
  { key: 'sketch-plugin', name: 'Sketch插件', type: 'category', id: 344 },
  { key: 'mockup', name: '样机', type: 'category', id: 210 },
];

/**
 * 素材分类说明:
 * - all: 所有设计素材 (分类ID: 4)
 * - portfolio: 作品集/Portfolio (分类ID: 392)
 * - card: 卡片式/Card (分类ID: 171)
 * - big-data: 可视化/Big-data (分类ID: 65)
 * - dashboard: 后台/Dashboard (分类ID: 67)
 * - icon: 图标/Icon (分类ID: 45)
 * - ar: 增强现实/AR (分类ID: 791)
 * - app: 应用/App (分类ID: 44)
 * - watch: 手表/Watch (分类ID: 66)
 * - web: 网页/Web (分类ID: 75)
 * - design-system: 设计系统/组件 (分类ID: 261)
 * - 3d-icon: 3D/图标 (分类ID: 203)
 * - font: 字体/Font (分类ID: 319)
 * - ps-plugin: PS插件 (分类ID: 11013)
 * - sketch-plugin: Sketch插件 (分类ID: 344)
 * - mockup: 样机 (分类ID: 210)
 */

// 数据缓存 - 修改为函数组件内部使用，避免多个实例共享缓存
const dataCache: Record<string, { data: RankItem[]; expiresAt: number }> = {};

// 清除缓存的函数
const clearCache = () => {
  Object.keys(dataCache).forEach(key => {
    delete dataCache[key];
  });
};

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

// 根据素材类型获取对应的分类ID
const getResourceCategoryId = (resourceKey: string): number | undefined => {
  const resourceOption = RESOURCE_OPTIONS.find(option => option.key === resourceKey);
  return resourceOption?.id;
};

const DesignResourcesPage: React.FC = () => {
  // 状态管理
  const [isRequesting, setIsRequesting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [localData, setLocalData] = useState<RankItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  // 当前选中的素材类型，默认为'all'（全部素材）
  const [currentResource, setCurrentResource] = useState<string>('all');

  // 使用WordPress数据hook获取文章
  const currentOption = RESOURCE_OPTIONS.find(resource => resource.key === currentResource);
  
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
    // 根据当前选项类型选择不同的API类型
    type: currentOption?.type === 'tag' ? 'tag-posts' : 'latest-posts',
    perPage: 50,
    // 根据当前选项类型设置不同的参数
    categoryId: currentOption?.type === 'category' ? currentOption.id : undefined,
    tagId: currentOption?.type === 'tag' ? currentOption.id : undefined,
    orderBy: 'date', // 按日期排序
  });

  // 数据更新时同步到本地
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('更新本地数据，数据条数:', data.length);
      setLocalData(data);
    } else if (data && Array.isArray(data) && data.length === 0) {
      console.log('警告：API返回了空数组');
      // 如果返回空数组，可能是API问题，不清空现有数据
      // 也可以在此处添加错误提示
    }
  }, [data]);

  // 组件初始化时清除缓存
  useEffect(() => {
    console.log('组件加载，清除缓存');
    clearCache();
    // 只在组件挂载时运行一次
  }, []);

  // 素材类型变化时的处理
  useEffect(() => {
    console.log('当前选择的素材类型:', currentResource, '对应的ID:', getResourceCategoryId(currentResource));
    
    // 清除API缓存和组件本地缓存
    wordPressApi.clearCache('category-posts');
    wordPressApi.clearCache('latest-posts');
    console.log('已清除API缓存 (category-posts, latest-posts)');
    
    setIsLoading(true);
    
    const categoryId = getResourceCategoryId(currentResource);
    console.log('即将发送请求:', {
      type: categoryId ? 'category-posts' : 'latest-posts',
      参数: {
        page: 1,
        per_page: 20,
        category_id: categoryId
      }
    });
    
    // 添加主动刷新，确保数据被加载
    refresh();
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentResource, refresh]); // 添加refresh到依赖数组

  // 刷新数据的节流函数
  const throttledRefresh = useCallback(
    throttle(() => {
      // 清除API缓存和本地缓存
      wordPressApi.clearCache('category-posts');
      wordPressApi.clearCache('latest-posts');
      console.log('手动刷新：已清除API缓存 (category-posts, latest-posts)');
      
      setIsLoading(true);
      
      const categoryId = getResourceCategoryId(currentResource);
      console.log('即将发送刷新请求:', {
        type: categoryId ? 'category-posts' : 'latest-posts',
        参数: {
          page: 1,
          per_page: 20,
          category_id: categoryId
        }
      });
      
      // 主动调用refresh函数重新获取数据
      refresh();
      
      // 设置超时以恢复UI状态
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }, 1000),
    [currentResource, refresh] // 添加refresh到依赖数组
  );

  // 自动刷新数据
  useEffect(() => {
    const timer = setInterval(() => {
      throttledRefresh();
    }, 1800000); // 每30分钟刷新一次，与API缓存过期时间一致
    
    return () => clearInterval(timer);
  }, [throttledRefresh]);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 处理素材类型变化
  const handleResourceChange = (e: any) => {
    const newResource = e.target.value;
    setCurrentResource(newResource);
  };

  // SEO配置
  const pageTitle = '设计素材资源 - UIED热榜';
  const pageDescription = '优质设计素材资源集合，包括图标、UI套件、样机模板、字体、插画和设计模板等';

  // 渲染列表项
  const renderResourceItem = (item: RankItem, index: number) => {
    const thumbnail = item.thumbnail ? getImageUrl(item.thumbnail) : '';

    // 检查是否为免费资源 (添加类型安全检查)
    const isFree = item.tags && Array.isArray(item.tags) && 
      item.tags.some((tag: {slug: string, name: string}) => 
        tag.slug === 'free' || tag.name.includes('免费')
      );

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
                alt={item.name || '素材缩略图'}
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
              {isFree && <Tag color="green" style={{ marginLeft: '0.5rem' }}>免费</Tag>}
            </a>
          </div>
          
          <div className="article-tags">
            <span className="item-tag primary category-resource">
              {currentOption?.name}
            </span>
            <span className={`item-tag rank-tag rank-number-${index + 1}`}>
              素材资源 No.{index + 1}
            </span>
            {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
              <span className="item-tag">
                {item.tags[0].name}
              </span>
            )}
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
            
            {typeof item.downloadCount === 'number' && (
              <Tooltip title="下载量">
                <span className="item-downloads">
                  <DownloadOutlined />
                  {item.downloadCount}
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
          <div className="score-container">
            <Skeleton.Avatar active size="small" shape="square" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="ranking-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>

      <div className="ranking-container fade-in">
        <div className="ranking-tabs">
          <div className="ranking-header design-resources-header">
            <div className="title-left">
              <AppstoreOutlined className="title-icon" />
              <span className="title-text">设计素材</span>
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

          {/* 素材类型筛选组件 */}
          <div className="tag-filter-container">
            <span className="filter-label">筛选：</span>
            <Radio.Group 
              value={currentResource} 
              onChange={handleResourceChange}
              optionType="button" 
              buttonStyle="solid"
              className="tag-radio-group"
            >
              {RESOURCE_OPTIONS.map(resource => (
                <Radio.Button key={resource.key} value={resource.key}>
                  {resource.name}
                </Radio.Button>
              ))}
            </Radio.Group>
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
                {localData.map((item, index) => renderResourceItem(item, index))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignResourcesPage; 