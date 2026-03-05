/**
 * @file Layout.tsx
 * @description 布局组件，提供页面的基础框架结构
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.3.0
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AdBanner from '../AdBanner';
import DailyHotFixedEntry from './DailyHotFixedEntry';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 根据当前路径推断页面标识，用于广告位按 pageSlug 定向投放。
 */
const resolvePageSlugByPathname = (pathname: string, search = ''): string => {
  const normalized = String(pathname || '').trim().toLowerCase();
  const searchParams = new URLSearchParams(String(search || ''));
  const hotTab = String(searchParams.get('tab') || '').trim().toLowerCase();
  if (!normalized || normalized === '/' || normalized === '/home') return 'home';
  if (normalized.startsWith('/website/')) return 'website-detail';
  if (normalized === '/daily-hot' || normalized === '/p/daily-hot') return 'daily-hot';
  if (normalized === '/daily-new' || normalized === '/p/daily-new') return 'daily-new';
  if (normalized === '/hot' || normalized === '/p/hot') {
    if (hotTab === 'daily-hot') return 'daily-hot';
    if (hotTab === 'daily-new') return 'daily-new';
    if (hotTab === 'rankings') return 'rankings';
    return 'hot-articles';
  }
  if (normalized === '/rankings' || normalized === '/p/rankings') return 'rankings';
  if (
    normalized === '/category'
    || normalized === '/categories'
    || normalized === '/p/category'
    || normalized === '/p/categories'
    || normalized.startsWith('/p/category/')
    || normalized.startsWith('/p/categories/')
    || normalized.startsWith('/category/')
    || normalized.startsWith('/categories/')
  ) return 'category';
  if (
    normalized === '/tag'
    || normalized === '/tags'
    || normalized === '/p/tag'
    || normalized === '/p/tags'
    || normalized.startsWith('/p/tag/')
    || normalized.startsWith('/p/tags/')
    || normalized.startsWith('/tag/')
    || normalized.startsWith('/tags/')
  ) return 'tag';
  if (normalized.startsWith('/articles')) return 'articles';
  if (normalized.startsWith('/article/')) return 'article-detail';
  if (normalized.startsWith('/p/')) {
    const [ , p, slug ] = normalized.split('/');
    if (p === 'p' && slug) return slug;
  }
  const firstSegment = normalized.split('/').filter(Boolean)[0];
  return firstSegment || 'all';
};

/**
 * 布局组件
 * 提供统一的页面框架，包含导航栏、主内容区域和页脚
 * 
 * @version 1.3.0
 * @author UIED技术团队 (https://fsuied.com)
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPageSlug = resolvePageSlugByPathname(location.pathname, location.search);

  return (
    <div className="layout">
      {/* 顶部导航栏 */}
      <Navbar />
      
      {/* 主内容区域 */}
      <main className="layout-main">
        <AdBanner
          pageSlug={currentPageSlug}
          position="global_strip"
          limit={1}
          className="layout-global-strip-banner"
        />
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      <AdBanner
        pageSlug={currentPageSlug}
        position="footer"
        limit={3}
        className="layout-footer-banner"
      />
      
      {/* 页脚 */}
      <Footer />

      {/* 每日热榜固定入口（受后台显示位置配置控制） */}
      <DailyHotFixedEntry />
    </div>
  );
};

export default Layout; 
