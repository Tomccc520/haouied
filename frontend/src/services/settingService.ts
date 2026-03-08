/**
 * @file settingService.ts
 * @description 前端用户界面组件
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import api from './api';
import { unwrapApiList, unwrapApiResponse } from '../utils/apiResponse';

/**
 * 生成防缓存参数，避免 CDN/浏览器返回旧配置。
 */
const buildNoCacheParams = () => ({ _t: Date.now() });

// 导航菜单类型
export interface NavMenuItem {
  id: string;
  text: string;
  link: string | null;
  external: boolean;
  label: string | null;
  labelType: string | null;
  icon: string | null;
  parentId: string | null;
  order: number;
  visible: boolean;
  children?: NavMenuItem[];
}

// 页脚链接类型
export interface FooterLink {
  id: string;
  text: string;
  url: string;
  external: boolean;
  order: number;
  visible: boolean;
}

// 页脚分组类型
export interface FooterGroup {
  id: string;
  title: string;
  order: number;
  visible: boolean;
  links: FooterLink[];
}

// 页脚关于区域配置类型
export interface FooterAboutConfig {
  aboutTitle: string;
  aboutDescription: string;
  mobileDescription: string;
  showSubmitButton: boolean;
  submitButtonText: string;
  submitButtonUrl: string;
  submitButtonNewWindow: boolean;
  showChangelogButton: boolean;
  changelogButtonText: string;
  changelogButtonUrl: string;
  changelogButtonNewWindow: boolean;
}

// 友情链接类型
export interface FriendLink {
  id: string;
  name: string;
  url: string;
  order: number;
  visible: boolean;
}

export const settingService = {
  // 获取导航菜单（树形结构）
  getNavMenus: async (): Promise<NavMenuItem[]> => {
    const response = await api.get('/settings/nav-menus', { params: buildNoCacheParams() });
    return unwrapApiList<NavMenuItem>(response.data);
  },

  // 获取页脚分组（含链接）
  getFooterGroups: async (): Promise<FooterGroup[]> => {
    const response = await api.get('/settings/footer-groups', { params: buildNoCacheParams() });
    return unwrapApiList<FooterGroup>(response.data);
  },

  // 获取页脚关于区域配置
  getFooterAboutConfig: async (): Promise<FooterAboutConfig> => {
    const response = await api.get('/settings/footer-about-config', { params: buildNoCacheParams() });
    const fallback: FooterAboutConfig = {
      aboutTitle: 'UIED设计导航',
      aboutDescription: 'UIED设计导航汇集优质设计工具与资源，涵盖UI/UX设计、平面设计、AI设计工具、三维设计等多个领域。提供Figma、Sketch、Adobe等专业设计软件资源，包含设计灵感、素材库、配色工具、字体资源、图标库等。为设计师提供一站式设计工具导航服务，助力提升设计效率与创作灵感。',
      mobileDescription: 'UIED设计导航汇集优质设计工具与资源，为设计师提供一站式工具导航服务',
      showSubmitButton: true,
      submitButtonText: '提交网站',
      submitButtonUrl: '/submit',
      submitButtonNewWindow: true,
      showChangelogButton: true,
      changelogButtonText: '更新记录',
      changelogButtonUrl: '/changelog',
      changelogButtonNewWindow: true,
    };
    return unwrapApiResponse<FooterAboutConfig>(response.data, fallback);
  },

  // 获取友情链接
  getFriendLinks: async (): Promise<FriendLink[]> => {
    const response = await api.get('/settings/friend-links', { params: buildNoCacheParams() });
    return unwrapApiList<FriendLink>(response.data);
  },
};

export default settingService;
