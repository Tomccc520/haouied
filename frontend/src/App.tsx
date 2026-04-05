/**
 * @file App.tsx
 * @description 前端用户界面组件
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

// Context
import { SiteProvider } from './contexts/SiteContext';
import { UserProvider } from './contexts/UserContext';

// 页面组件
import HomePage from './pages/Home';
import CategoryPage from './pages/Category';
import TagPage from './pages/Tag';
import SitePage from './pages/Site';
import SearchPage from './pages/Search';
import ProfilePage from './pages/Profile';
import SubmitPage from './pages/Submit';
import ChangelogPage from './pages/Changelog';
import HotArticlesPage from './pages/HotArticles';
import WebsiteComparePage from './pages/WebsiteCompare';
import MCPListPage from './pages/MCP';
import MCPDetailPage from './pages/MCP/detail';
import FigmaPage from './pages/Figma';
import FigmaDetailPage from './pages/Figma/detail';
import NotFoundPage from './pages/NotFound';
import WebsiteDetail from './pages/WebsiteDetail';
import InstallPage from './pages/Install';
import SocialAuthCallbackPage from './pages/Auth/SocialCallback';
import Layout from './components/layout/Layout';
import DynamicPage from './components/DynamicPage';
import { FIXED_DYNAMIC_ROUTES, ROOT_NAV_SLUG, isFixedDynamicNavSlug } from './config/navModel';
import { useFrontendConfig } from './hooks/useFrontendConfig';
import { useAppearanceConfig } from './hooks/usePublicSettings';

// @pro-feature-start: articles
import { ArticleList, ArticleDetail } from './pages/Articles';
// @pro-feature-end: articles
import './App.css';

// 动态页面路由组件
const DynamicPageRoute: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <DynamicPage slug={slug || ''} />;
};

/**
 * 固定导航 slug 的动态页面路由组件。
 */
const FixedDynamicPageRoute: React.FC<{ slug: string }> = ({ slug }) => {
  return <DynamicPage slug={slug} />;
};

/**
 * 根路径入口路由：
 * 支持后台把某个页面配置为首页（保留根路径 / 渲染对应页面），未配置时走默认固定首页。
 */
const RootEntryRoute: React.FC = () => {
  const { config, loading } = useFrontendConfig();
  const homePageSlug = String(config?.homepageConfig?.homePageSlug || '').trim();
  const normalizedHomePageSlug = homePageSlug.toLowerCase();
  if (loading) {
    return null;
  }
  if (homePageSlug) {
    if (isFixedDynamicNavSlug(normalizedHomePageSlug)) {
      return <FixedDynamicPageRoute slug={normalizedHomePageSlug} />;
    }
    return <DynamicPage slug={normalizedHomePageSlug} />;
  }
  return <FixedDynamicPageRoute slug={ROOT_NAV_SLUG} />;
};

/**
 * 旧频道路由兼容跳转：
 * /p/rankings /p/daily-hot /p/daily-new 统一跳转到 /p/hot?tab=xxx
 */
const LegacyContentHubRedirect: React.FC<{ tab: 'hot' | 'rankings' | 'daily-hot' | 'daily-new' }> = ({ tab }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  params.set('tab', tab);
  const query = params.toString();
  return <Navigate to={`/p/hot${query ? `?${query}` : ''}`} replace />;
};

/**
 * 前台主业务路由（站点首页、搜索、详情等）
 */
const MainRouteTree: React.FC = () => {
  /**
   * 根路由进入时同步应用后台外观配置。
   * 这里必须在前台全局挂载一次，保证主字体、主题色等变量真正写入到 :root。
   */
  useAppearanceConfig();

  return (
    <SiteProvider>
      <UserProvider>
        <Layout>
          <Routes>
            {/* 固定页面路由 - 统一走动态页模型 */}
            {FIXED_DYNAMIC_ROUTES.map((routeItem) => (
              <Route
                key={`fixed-dynamic-${routeItem.path}-${routeItem.slug}`}
                path={routeItem.path}
                element={
                  routeItem.path === '/'
                    ? <RootEntryRoute />
                    : <FixedDynamicPageRoute slug={routeItem.slug} />
                }
              />
            ))}
            <Route path="/home" element={<HomePage />} />
            <Route path="/category" element={<CategoryPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/p/category" element={<CategoryPage />} />
            <Route path="/p/categories" element={<CategoryPage />} />
            <Route path="/p/category/:slug" element={<CategoryPage />} />
            <Route path="/p/categories/:slug" element={<CategoryPage />} />
            <Route path="/tag" element={<TagPage />} />
            <Route path="/tag/:slug" element={<TagPage />} />
            <Route path="/tags" element={<TagPage />} />
            <Route path="/tags/:slug" element={<TagPage />} />
            <Route path="/p/tag" element={<TagPage />} />
            <Route path="/p/tags" element={<TagPage />} />
            <Route path="/p/tag/:slug" element={<TagPage />} />
            <Route path="/p/tags/:slug" element={<TagPage />} />
            <Route path="/site/:id" element={<SitePage />} />
            <Route path="/website/:idOrSlug" element={<WebsiteDetail />} />
            <Route path="/vs/:leftIdOrSlug/:rightIdOrSlug" element={<WebsiteComparePage />} />
            <Route path="/vs/:pair" element={<WebsiteComparePage />} />
            <Route path="/mcp" element={<MCPListPage />} />
            <Route path="/mcp/:slug" element={<MCPDetailPage />} />
            <Route path="/figma" element={<FigmaPage />} />
            <Route path="/figma/:idOrSlug" element={<FigmaDetailPage />} />

            {/* @pro-feature-start: articles */}
            <Route path="/articles" element={<ArticleList />} />
            <Route path="/article/:slug" element={<ArticleDetail />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            {/* @pro-feature-end: articles */}

            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            {/* 内容中心旧路由兼容：统一汇聚到 /p/hot 单页内切换 */}
            <Route path="/p/daily-hot" element={<LegacyContentHubRedirect tab="daily-hot" />} />
            <Route path="/daily-hot" element={<LegacyContentHubRedirect tab="daily-hot" />} />
            <Route path="/p/daily-new" element={<LegacyContentHubRedirect tab="daily-new" />} />
            <Route path="/daily-new" element={<LegacyContentHubRedirect tab="daily-new" />} />
            <Route path="/p/rankings" element={<LegacyContentHubRedirect tab="rankings" />} />
            <Route path="/rankings" element={<LegacyContentHubRedirect tab="rankings" />} />
            <Route path="/p/hot" element={<HotArticlesPage />} />
            <Route path="/hot" element={<HotArticlesPage />} />

            {/* 动态页面路由 - 后台新建的页面通过 /p/xxx 访问 */}
            <Route path="/p/:slug" element={<DynamicPageRoute />} />

            {/* 404页面 - 必须放在最后 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </UserProvider>
    </SiteProvider>
  );
};

/**
 * 应用路由分发器：
 * /install 走独立安装向导，不加载主布局和站点上下文，避免未安装环境下的依赖干扰。
 */
const AppRouteSwitch: React.FC = () => {
  const location = useLocation();
  const isInstallRoute = location.pathname === '/install' || location.pathname.startsWith('/install/');
  const isSocialCallbackRoute = location.pathname === '/auth/social-callback';
  if (isInstallRoute) {
    return <InstallPage />;
  }
  if (isSocialCallbackRoute) {
    return (
      <UserProvider>
        <SocialAuthCallbackPage />
      </UserProvider>
    );
  }
  return <MainRouteTree />;
};

function App() {
  return (
    <Router>
      <AppRouteSwitch />
    </Router>
  );
}

export default App;
