/**
 * @file App.tsx
 * @description 前端用户界面组件
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

// Context
import { SiteProvider } from './contexts/SiteContext';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/layout/Layout';
import { FIXED_DYNAMIC_ROUTES, ROOT_NAV_SLUG, isFixedDynamicNavSlug } from './config/navModel';
import { useFrontendConfig } from './hooks/useFrontendConfig';
import { useAppearanceConfig } from './hooks/usePublicSettings';
import './App.css';

// 页面组件按路由拆包，避免低频页面进入首屏主包。
const HomePage = lazy(() => import('./pages/Home'));
const CategoryPage = lazy(() => import('./pages/Category'));
const TagPage = lazy(() => import('./pages/Tag'));
const SitePage = lazy(() => import('./pages/Site'));
const SearchPage = lazy(() => import('./pages/Search'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const SubmitPage = lazy(() => import('./pages/Submit'));
const ChangelogPage = lazy(() => import('./pages/Changelog'));
const HotArticlesPage = lazy(() => import('./pages/HotArticles'));
const WebsiteComparePage = lazy(() => import('./pages/WebsiteCompare'));
const MCPListPage = lazy(() => import('./pages/MCP'));
const MCPDetailPage = lazy(() => import('./pages/MCP/detail'));
const FigmaPage = lazy(() => import('./pages/Figma'));
const FigmaDetailPage = lazy(() => import('./pages/Figma/detail'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));
const WebsiteDetail = lazy(() => import('./pages/WebsiteDetail'));
const InstallPage = lazy(() => import('./pages/Install'));
const SocialAuthCallbackPage = lazy(() => import('./pages/Auth/SocialCallback'));
const DynamicPage = lazy(() => import('./components/DynamicPage'));

// @pro-feature-start: articles
const ArticleList = lazy(() => import('./pages/Articles').then(module => ({ default: module.ArticleList })));
const ArticleDetail = lazy(() => import('./pages/Articles').then(module => ({ default: module.ArticleDetail })));
// @pro-feature-end: articles

/**
 * 路由异步资源加载占位，保持页面切换时有稳定的可访问反馈。
 */
const RouteLoadingFallback: React.FC = () => (
  <div className="route-loading" role="status" aria-live="polite">
    <span className="route-loading__spinner" aria-hidden="true" />
    <span>页面加载中</span>
  </div>
);

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
    return <RouteLoadingFallback />;
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
            <Route path="/profile/:tab" element={<ProfilePage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/submit/services" element={<SubmitPage />} />
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
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppRouteSwitch />
      </Suspense>
    </Router>
  );
}

export default App;
