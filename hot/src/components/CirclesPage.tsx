/**
 * @file CirclesPage.tsx
 * @description 圈子页面组件，展示圈子列表和圈子内文章
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Tabs,
} from 'antd';
import { 
  TeamOutlined,
  EyeOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FireOutlined,
  FileImageOutlined,
  ArrowUpOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import useWordPressData, { typeToChineseName } from '../hooks/useWordPressData';
import { RankItem } from '../types';
import { getProxyImageUrl } from '../utils/imageProxy';
import './AntRankingPage.css';
import './mobile.css'; // 引入移动端样式

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 常量定义
const THROTTLE_WAIT = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟缓存过期

// 圈子选项定义
const CIRCLE_OPTIONS = [
  { key: 'chat-hall', name: '交流大厅', type: 'circle-posts' as const, id: 2 },
  { key: 'aigc', name: 'AIGC', type: 'circle-posts' as const, id: 393 },
  { key: 'midjourney', name: 'Midjourney', type: 'circle-posts' as const, id: 414 },
  { key: 'stable-diffusion', name: 'Stable Diffusion', type: 'circle-posts' as const, id: 798 },
  { key: 'ui-designers', name: 'UI设计师', type: 'circle-posts' as const, id: 239 },
  { key: 'blender', name: 'Blender', type: 'circle-posts' as const, id: 252 },
  { key: 'deepseek', name: 'DeepSeek', type: 'circle-posts' as const, id: 11493 }, // 原来的UIED圈子更名为DeepSeek
];

// 根据环境处理图片URL
const getImageUrl = (url?: string) => {
  if (!url) return '';
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

// 自定义头像组件，参考AIRealtimePage.tsx的实现
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

/**
 * 圈子页面组件
 * 
 * @returns JSX.Element
 */
const CirclesPage: React.FC = () => {
  // 状态定义
  const [activeCircle, setActiveCircle] = useState<typeof CIRCLE_OPTIONS[0]>(CIRCLE_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [initialized, setInitialized] = useState(false); // 初始化状态标志
  
  // 获取圈子数据
  const {
    data: circleData,
    isLoading: circleLoading,
    error: circleError,
    total: circleTotal,
    refresh: refreshCircles,
  } = useWordPressData({
    type: activeCircle.type,
    categoryId: activeCircle.id !== 0 ? activeCircle.id : undefined,
    perPage: 50,
  });
  
  // 数据加载完成后的调试日志
  useEffect(() => {
    if (!circleLoading && circleData.length > 0) {
      console.log(`加载了${activeCircle.name}数据:`, circleData.length, '条');
      if (circleData[0].attachment || circleData[0].author) {
        console.log('第一条数据示例:', {
          标题: circleData[0].title || circleData[0].name,
          作者: circleData[0].author?.name || circleData[0].authorName,
          图片: circleData[0].attachment?.image?.[0]?.thumb || '无图片',
          日期: circleData[0].date,
          时间: circleData[0].time_ago || circleData[0].timeAgo
        });
      }
    }
  }, [circleLoading, circleData, activeCircle.name]);
  
  // 初始化组件
  useEffect(() => {
    // 组件首次挂载时，确保激活第一个选项
    if (!initialized) {
      // 默认选择UIED圈子，而不是"全部圈子"
      const defaultCircle = CIRCLE_OPTIONS.find(option => option.key === 'uied-circle') || CIRCLE_OPTIONS[0];
      setActiveCircle(defaultCircle);
      setInitialized(true);
      
      // 显示加载状态
      setShowLoading(true);
      
      // 初始加载后的效果
      setTimeout(() => {
        setShowLoading(false);
        setFadeIn(true);
      }, 500);
      
      // 控制台输出API端点信息，便于调试
      console.log('圈子列表API: https://uied.cn/wp-json/uied/v1/circle');
      console.log('圈子文章API: https://uied.cn/wp-json/uied/v1/circle-tags/11493');
    }
  }, [initialized]);
  
  // 处理滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 监听标签变化并触发数据刷新
  useEffect(() => {
    // 当标签变化时触发刷新
    setShowLoading(true);
    setFadeIn(false);
    
    // 短暂延迟后刷新数据
    setTimeout(() => {
      // 刷新前记录当前选中的圈子
      const currentCircleId = activeCircle.id;
      
      refreshCircles();
      
      // 延迟恢复UI状态
      setTimeout(() => {
        // 确保仍然是同一个圈子才应用UI更新
        if (currentCircleId === activeCircle.id) {
          setShowLoading(false);
          setFadeIn(true);
        }
      }, 300);
    }, 100);
  }, [activeCircle.type, activeCircle.id, refreshCircles]);
  
  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // 处理圈子切换事件
  const handleCircleChange = (circle: typeof CIRCLE_OPTIONS[0]) => {
    if (circle.key === activeCircle.key) {
      // 如果点击当前选中的圈子，则刷新数据
      message.info(`刷新${circle.name}数据`);
      refreshCircles();
      return;
    }
    
    // 设置过渡状态
    setIsTransitioning(true);
    setFadeIn(false);
    
    // 切换圈子
    setActiveCircle(circle);
    
    // 滚动到顶部
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // 渲染圈子标签
  const renderCircleTabs = () => {
    return (
      <div className="filter-container tag-filter-container">
        <span className="filter-label">筛选：</span>
        <Radio.Group 
          value={activeCircle.key} 
          onChange={(e) => {
            const selected = CIRCLE_OPTIONS.find(option => option.key === e.target.value);
            if (selected) handleCircleChange(selected);
          }}
          className="filter-radio-group tag-radio-group"
          optionType="button"
          buttonStyle="solid"
        >
          {CIRCLE_OPTIONS.map(option => (
            <Radio.Button key={option.key} value={option.key}>
              {option.name}
            </Radio.Button>
          ))}
        </Radio.Group>
      </div>
    );
  };
  
  // 渲染圈子项
  const renderCircleItem = (item: RankItem, index: number) => {
    // 检查是否为圈子文章或圈子本身
    const isCirclePost = activeCircle.id !== 0;
    const postLabel = isCirclePost ? '文章' : '圈子';
    
    console.log('渲染圈子项', {
      类型: isCirclePost ? '圈子文章' : '圈子',
      id: item.id || item.topic_id,
      标题: item.title || item.name,
      数据: item
    });
    
    // 创建一个保存处理后数据的对象
    let itemData = {
      id: item.id || item.topic_id || 0,
      title: '',
      description: '',
      thumbnail: '',
      authorName: '',
      authorAvatar: '',
      authorUrl: '',
      date: '',
      timeAgo: '',
      viewCount: 0,
      commentCount: 0,
      link: item.link || '#',
      type: item.type || '',
      sticky: item.sticky === 1
    };
    
    // 处理圈子文章数据
    if (isCirclePost) {
      // 处理标题和内容 - 圈子文章API返回的结构
      itemData.title = item.title || '';
      itemData.description = item.excerpt || item.content || '';
      
      // 移除HTML标签
      if (itemData.description) {
        itemData.description = itemData.description.replace(/<\/?[^>]+(>|$)/g, '');
      }
      
      // 处理缩略图 - 优先使用attachment中的图片
      if (item.attachment && item.attachment.image && item.attachment.image.length > 0) {
        itemData.thumbnail = item.attachment.image[0].thumb || '';
      }
      
      // 处理作者信息
      if (item.author) {
        itemData.authorName = item.author.name || '';
        itemData.authorAvatar = item.author.avatar || '';
        itemData.authorUrl = item.author.url || '';
      }
      
      // 处理日期和时间前信息
      itemData.date = item.date || '';
      itemData.timeAgo = item.time_ago || '';
      
      // 处理统计信息
      itemData.viewCount = typeof item.view_count === 'string' ? parseInt(item.view_count) : (item.view_count || 0);
      itemData.commentCount = typeof item.comment_count === 'string' ? parseInt(item.comment_count) : (item.comment_count || 0);
    } else {
      // 圈子列表数据处理 - 兼容不同的API响应格式
      itemData.title = item.name || item.title || '';
      itemData.description = item.description || item.excerpt || item.content || '';
      
      // 移除HTML标签
      if (itemData.description) {
        itemData.description = itemData.description.replace(/<\/?[^>]+(>|$)/g, '');
        // 限制描述长度
        if (itemData.description.length > 100) {
          itemData.description = itemData.description.substring(0, 100) + '...';
        }
      }
      
      itemData.thumbnail = item.thumbnail || item.featured_image || '';
      itemData.authorName = item.authorName || (item.author && typeof item.author === 'object' ? item.author.name : '');
      itemData.authorAvatar = item.authorAvatar || (item.author && typeof item.author === 'object' ? item.author.avatar : '');
      itemData.viewCount = typeof item.viewCount === 'string' ? parseInt(item.viewCount) : (typeof item.view_count === 'string' ? parseInt(item.view_count) : (item.viewCount || item.view_count || 0));
      itemData.commentCount = typeof item.count === 'string' ? parseInt(item.count) : (typeof item.comment_count === 'string' ? parseInt(item.comment_count) : (item.count || item.comment_count || 0));
      
      // 处理日期
      itemData.date = item.date || new Date().toISOString().split('T')[0];
    }
    
    // 创建缩略图URL (确保使用CDN或代理，防止CORS问题)
    const thumbUrl = itemData.thumbnail ? getImageUrl(itemData.thumbnail) : '';
    
    return (
      <div className="ranking-list-item" key={itemData.id}>
        <div className={`rank-number-container rank-number-${index < 3 ? index + 1 : 'other'}`}>
          <span className="rank-number">{index + 1}</span>
        </div>

        <div className="thumbnail-container">
          <a href={itemData.link} target="_blank" rel="noopener noreferrer">
            {thumbUrl ? (
              <img 
                src={thumbUrl} 
                alt={itemData.title || `${postLabel}缩略图`}
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
            <a href={itemData.link} target="_blank" rel="noopener noreferrer">
              {itemData.title}
              {itemData.sticky && <Tag color="red" style={{ marginLeft: '0.5rem' }}>置顶</Tag>}
              {item.isNew && <Tag color="green" style={{ marginLeft: '0.5rem' }}>新</Tag>}
            </a>
          </div>
          
          <div className="article-tags">
            <span className="item-tag primary category-aigc">
              {isCirclePost ? activeCircle.name : '圈子'}
            </span>
            <span className={`item-tag rank-tag rank-number-${index + 1}`}>
              {isCirclePost ? '圈子文章' : '圈子'} No.{index + 1}
            </span>
            {itemData.type && (
              <span className="item-tag">
                {itemData.type === 'say' ? '说说' : itemData.type}
              </span>
            )}
          </div>
          
          {itemData.description && (
            <div className="item-description">
              {itemData.description}
            </div>
          )}
          
          <div className="item-info">
            {itemData.authorName && (
              <Tooltip title={`作者: ${itemData.authorName}`}>
                <span className="item-author">
                  <CustomAvatar 
                    src={itemData.authorAvatar ? getImageUrl(itemData.authorAvatar) : undefined} 
                    size="small"
                    className="author-avatar"
                  />
                  <span>{itemData.authorName}</span>
                </span>
              </Tooltip>
            )}
            
            <span className="item-date">
              {itemData.timeAgo ? itemData.timeAgo : itemData.date}
            </span>
            
            {itemData.viewCount > 0 && (
              <Tooltip title="浏览量">
                <span className="item-views">
                  <EyeOutlined />
                  {itemData.viewCount}
                </span>
              </Tooltip>
            )}
            
            {isCirclePost && itemData.commentCount !== undefined && (
              <Tooltip title="评论数">
                <span className="item-views">
                  <MessageOutlined />
                  {itemData.commentCount}
                </span>
              </Tooltip>
            )}
            
            {!isCirclePost && itemData.commentCount > 0 && (
              <Tooltip title="文章数">
                <span className="item-views">
                  <FileImageOutlined />
                  {itemData.commentCount}
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        
        <div className="score-container">
          <div className="score-value">
            <FireOutlined className="score-icon" />
            {isCirclePost 
              ? Math.floor(itemData.viewCount / 10) 
              : Math.floor(item.score || itemData.commentCount || 0)}
            <span className="score-decimal">.{Math.floor(Math.random() * 9) + 1}</span>
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
  
  // 渲染主内容
  const renderContent = () => {
    // 处理错误状态
    if (circleError) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <p className="error-message">{circleError}</p>
              <p className="error-tip">API端点可能不可用，请检查服务器状态或配置</p>
            </div>
          }
        >
          <Button type="primary" onClick={refreshCircles}>重试</Button>
        </Empty>
      );
    }
    
    // 处理初始加载状态
    if ((circleLoading || showLoading) && circleData.length === 0) {
      return loadingSkeleton;
    }
    
    // 处理空数据状态
    if (!circleLoading && circleData.length === 0) {
      return (
        <Empty 
          description={
            <span>
              暂无{activeCircle.id === 0 ? '圈子' : '文章'}数据
              {activeCircle.id !== 0 && `（圈子ID: ${activeCircle.id}）`}
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={refreshCircles}>刷新</Button>
        </Empty>
      );
    }
    
    // 渲染数据列表
    return (
      <div className={`ranking-list ${fadeIn ? 'fade-in' : ''}`}>
        {circleData.map((item, index) => renderCircleItem(item, index))}
        
        {/* 显示加载提示 */}
        {circleLoading && circleData.length > 0 && (
          <div className="loading-more">
            <Spin size="small" /> <span>加载更多...</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="ranking-page">
      <Helmet>
        <title>UIED圈子 | 分享你的想法</title>
        <meta name="description" content="UIED圈子专区，分享设计、AIGC、前端等相关内容和想法" />
        <meta name="keywords" content="UIED,圈子,设计,AIGC,前端开发,社区" />
      </Helmet>
      
      <div className="ranking-container fade-in">
        <div className="ranking-tabs">
          <div className="ranking-header">
            <div className="title-left">
              <ReadOutlined className="title-icon" />
              <span className="title-text">学习圈子</span>
            </div>
            <div className="current-time">
              <span className="date-text">
                {activeCircle.id === 0 
                  ? '发现有趣的圈子和创意' 
                  : `${activeCircle.name}圈子内容`}
              </span>
            </div>
          </div>
          
          {renderCircleTabs()}
          
          <div className="content-wrapper">
            {renderContent()}
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

export default CirclesPage; 