/**
 * @file App.tsx
 * @description 应用主组件，设置路由和基础布局结构
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.5.0
 */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline, Box, ThemeProvider, createTheme } from '@mui/material';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AntRankingPage from './components/AntRankingPage';
import AIRealtimePage from './components/AIRealtimePage';
import DesignRealtimePage from './components/DesignRealtimePage';
import DesignResourcesPage from './components/DesignResourcesPage';
import HotArticlesPage from './components/HotArticlesPage';
import TopAuthorsPage from './components/TopAuthorsPage';
import CirclesPage from './components/CirclesPage';
import SideMenu from './components/SideMenu';
import RankingHeader from './components/RankingHeader';
import NotFoundPage from './components/NotFoundPage';
import { HelmetProvider } from 'react-helmet-async';
import AIProductRankingPage from './components/AIProductRankingPage';
import './App.css';

// 创建主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#0066ff',
      light: '#e6f2ff',
      dark: '#0052cc',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Lexend',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// 百度统计PV上报组件
const BaiduAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // 确保_hmt存在
    if (window._hmt) {
      // 发送页面浏览
      window._hmt.push(['_trackPageview', location.pathname + location.search]);
    }
  }, [location]);

  return null;
};

// 内容包装器组件
const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="main-layout">
      {/* 侧边菜单容器 */}
      <div className="side-menu-container">
        <SideMenu />
      </div>

      {/* 主内容区域 */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

// AppContent组件 - 包含所有需要使用location的逻辑
const AppContent = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const headerItems = [
    { label: '热门榜单', path: '/', active: currentPath === '/' || currentPath === '/latest' || currentPath === '/hot' },
    { label: 'AI实时文章', path: '/ai-realtime', active: currentPath === '/ai-realtime' },
    { label: 'AI产品榜单', path: '/ai-products', active: currentPath === '/ai-products' },
    { label: '优秀作者', path: '/top-authors', active: currentPath === '/top-authors' },
  ];

  return (
    <>
      {/* 添加百度统计组件 */}
      <BaiduAnalytics />
      
      {/* 导航栏固定在顶部 - 作为最高级元素 */}
      <Navbar />
      
      {/* 主内容区域容器 - 适应固定导航栏的高度 */}
      <div className="app-content">
        {/* 标题组件 - 现在位于路由内容之外，成为独立的顶级元素 */}
        <div className="header-container">
          <RankingHeader />
        </div>
        
        {/* 路由内容区域 */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            position: 'relative',
            zIndex: 1,
            padding: '0',
            margin: '0',
          }}
        >
          <Routes>
            {/* 使用AntRankingPage作为首页 */}
            <Route path="/" element={
              <ContentWrapper><AntRankingPage /></ContentWrapper>
            } />
            {/* 为了兼容旧链接，保留/ant-ranking路径 */}
            <Route path="/ant-ranking" element={
              <ContentWrapper><AntRankingPage /></ContentWrapper>
            } />
            {/* 添加热门文章页面路由 */}
            <Route path="/hot-articles" element={
              <ContentWrapper><HotArticlesPage /></ContentWrapper>
            } />
            {/* 添加AI实时文章页面路由 */}
            <Route path="/ai-realtime" element={
              <ContentWrapper><AIRealtimePage /></ContentWrapper>
            } />
            {/* 添加设计实时文章页面路由 */}
            <Route path="/design-realtime" element={
              <ContentWrapper><DesignRealtimePage /></ContentWrapper>
            } />
            {/* 添加优秀作者页面路由 */}
            <Route path="/top-authors" element={
              <ContentWrapper><TopAuthorsPage /></ContentWrapper>
            } />
            {/* 添加圈子页面路由 */}
            <Route path="/circles" element={
              <ContentWrapper><CirclesPage /></ContentWrapper>
            } />
            {/* 添加设计素材页面路由 */}
            <Route path="/design-resources" element={
              <ContentWrapper><DesignResourcesPage /></ContentWrapper>
            } />
            {/* 新增AI产品榜单路由 */}
            <Route path="/ai-products" element={
              <ContentWrapper><AIProductRankingPage /></ContentWrapper>
            } />
            
            {/* 添加404页面路由 - 这必须放在所有其他路由之后 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />
      </div>
    </>
  );
};

/**
 * 应用主组件
 * 设置路由和基础布局结构
 * 
 * @version 1.5.0
 * @author UIED技术团队 (https://fsuied.com)
 */
function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

// 为了TypeScript支持window._hmt
declare global {
  interface Window {
    _hmt: any[];
  }
}

export default App;
