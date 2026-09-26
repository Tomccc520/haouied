/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */
/**
 * @file config/brandConfig.ts
 * @description 品牌与默认内容配置 - 用于安装页、404、登录弹窗、首页兜底内容和更新记录页的统一默认值
 */

export type BrandRepoIconKey = 'github' | 'gitee' | 'csdn' | 'uied';

export interface BrandQuickLinkItem {
  label: string;
  to: string;
  newWindow: boolean;
}

export interface BrandBannerCard {
  id: string;
  title: string;
  description: string;
  link: string;
  badge: string;
  color: string;
  newWindow: boolean;
}

export interface BrandCarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  newWindow: boolean;
}

export interface BrandRepoLinkItem {
  name: string;
  url: string;
  iconKey: BrandRepoIconKey;
}

export interface BrandPlatformLinkItem {
  name: string;
  url: string;
}

export interface BrandConfig {
  brandName: string;
  officialSiteUrl: string;
  buyUrl: string;
  supportUrl: string;
  supportLabel: string;
  supportQq: string;
  supportQqGroup: string;
  installPageTitle: string;
  installPageDescription: string;
  installSiteName: string;
  installSiteTitle: string;
  installSiteDescription: string;
  installSiteKeywords: string;
  installAdminNickname: string;
  authLogoText: string;
  authLoginTitle: string;
  authLoginSubtitle: string;
  authRegisterTitle: string;
  authRegisterSubtitle: string;
  notFoundTitle: string;
  notFoundDescription: string;
  notFoundSeoTitle: string;
  notFoundSeoDescription: string;
  notFoundSeoKeywords: string;
  notFoundAutoRedirectSeconds: number;
  notFoundQuickLinks: BrandQuickLinkItem[];
  homeFallbackBannerCards: BrandBannerCard[];
  homeFallbackCarouselSlides: BrandCarouselSlide[];
  changelogAuthorName: string;
  changelogAuthorUrl: string;
  changelogAuthorDescription: string;
  changelogBuyButtonText: string;
  changelogRepoLinks: BrandRepoLinkItem[];
  changelogPlatformLinks: BrandPlatformLinkItem[];
}

/**
 * 售卖版品牌与默认内容配置。
 */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brandName: 'UIED导航系统',
  officialSiteUrl: 'https://fsuied.com',
  buyUrl: 'https://fsuied.com/products/10',
  supportUrl: 'https://fsuied.com',
  supportLabel: '前往官网咨询',
  supportQq: '403479454',
  supportQqGroup: '1082794860',
  installPageTitle: '安装向导',
  installPageDescription: '开源版无需授权码：先做环境与数据库测试，再初始化站点与管理员',
  installSiteName: 'UIED导航系统',
  installSiteTitle: 'UIED导航系统 - 高质量资源导航',
  installSiteDescription: '基于 UIED-NAV 构建的可运营网址导航系统。',
  installSiteKeywords: 'UIED,导航系统,网址导航,AI导航',
  installAdminNickname: '系统管理员',
  authLogoText: 'UIED',
  authLoginTitle: '欢迎回来',
  authLoginSubtitle: '登录以体验更多精彩功能',
  authRegisterTitle: '加入 UIED',
  authRegisterSubtitle: '开启您的设计探索之旅',
  notFoundTitle: '页面不存在或已迁移',
  notFoundDescription: '你访问的链接可能已经下线、改名或暂未开放。你可以返回首页，或直接进入常用入口继续浏览。',
  notFoundSeoTitle: '页面未找到',
  notFoundSeoDescription: '访问的页面不存在或已迁移，请返回首页继续浏览 UIED 导航。',
  notFoundSeoKeywords: '404,页面未找到,导航站',
  notFoundAutoRedirectSeconds: 10,
  notFoundQuickLinks: [
    { label: 'AI导航', to: '/ai', newWindow: false },
    { label: 'UI导航', to: '/uiux', newWindow: false },
    { label: '平面导航', to: '/design', newWindow: false },
    { label: 'MCP中心', to: '/mcp', newWindow: false },
    { label: 'Figma频道', to: '/figma', newWindow: false },
    { label: '热门内容', to: '/p/hot', newWindow: false },
  ],
  homeFallbackBannerCards: [],
  homeFallbackCarouselSlides: [],
  changelogAuthorName: 'Tomda',
  changelogAuthorUrl: 'https://tomda.top/',
  changelogAuthorDescription: '开发（AI协助）并记录 UIED-NAV 的开发历程和功能更新。公众号：Tomda',
  changelogBuyButtonText: '获取商业服务与部署支持',
  changelogRepoLinks: [
    { name: 'GitHub 仓库', url: 'https://github.com/Tomccc520/haouied', iconKey: 'github' },
    { name: 'Gitee 仓库', url: 'https://gitee.com/tomdac/haouied', iconKey: 'gitee' },
    { name: 'CSDN 博客', url: 'https://blog.csdn.net/Tomdac?spm=1000.2115.3001.5343', iconKey: 'csdn' },
    { name: 'UIED技术团队', url: 'https://fsuied.com/', iconKey: 'uied' },
  ],
  changelogPlatformLinks: [
    { name: 'AI学习平台', url: 'https://www.uied.cn/' },
    { name: 'AI免费工具', url: 'https://uiedtool.com' },
    { name: 'AI资讯热榜', url: 'https://hot.uied.cn' },
    { name: 'AI工具导航', url: 'https://hao.uied.cn/ai' },
    { name: 'AI交流群', url: 'https://ai.feishu.cn/wiki/CUuaw5ooxiHAkckgtRkcn6rnnVQ?from=from_copylink' },
    { name: 'AI知识库', url: 'https://ai.feishu.cn/wiki/ZjddwTFpWivK6ukwBoDc5DoHnVt?from=from_copylink' },
  ],
};
