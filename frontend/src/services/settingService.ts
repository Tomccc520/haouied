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
  showServiceButton: boolean;
  serviceButtonText: string;
  serviceButtonUrl: string;
  serviceButtonNewWindow: boolean;
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
      submitButtonText: '网站收录',
      submitButtonUrl: '/submit',
      submitButtonNewWindow: false,
      showServiceButton: true,
      serviceButtonText: '收录与增值服务',
      serviceButtonUrl: '/submit/services',
      serviceButtonNewWindow: false,
      showChangelogButton: true,
      changelogButtonText: '更新记录',
      changelogButtonUrl: '/changelog',
      changelogButtonNewWindow: true,
    };
    const data = unwrapApiResponse<Partial<FooterAboutConfig>>(response.data, fallback);
    const normalizeText = (value: unknown, fallbackValue: string) => {
      const text = String(value ?? '').trim();
      return text || fallbackValue;
    };
    const normalizeBoolean = (value: unknown, fallbackValue: boolean) => {
      if (value === undefined || value === null || value === '') return fallbackValue;
      if (typeof value === 'boolean') return value;
      const text = String(value).trim().toLowerCase();
      if ([ '1', 'true', 'yes', 'on' ].includes(text)) return true;
      if ([ '0', 'false', 'no', 'off' ].includes(text)) return false;
      return fallbackValue;
    };
    return {
      ...fallback,
      ...data,
      aboutTitle: normalizeText(data.aboutTitle, fallback.aboutTitle),
      aboutDescription: normalizeText(data.aboutDescription, fallback.aboutDescription),
      mobileDescription: normalizeText(data.mobileDescription, fallback.mobileDescription),
      showSubmitButton: normalizeBoolean(data.showSubmitButton, fallback.showSubmitButton),
      submitButtonText: normalizeText(data.submitButtonText, fallback.submitButtonText),
      submitButtonUrl: normalizeText(data.submitButtonUrl, fallback.submitButtonUrl),
      submitButtonNewWindow: normalizeBoolean(data.submitButtonNewWindow, fallback.submitButtonNewWindow),
      showServiceButton: normalizeBoolean(data.showServiceButton, fallback.showServiceButton),
      serviceButtonText: normalizeText(data.serviceButtonText, fallback.serviceButtonText),
      serviceButtonUrl: normalizeText(data.serviceButtonUrl, fallback.serviceButtonUrl),
      serviceButtonNewWindow: normalizeBoolean(data.serviceButtonNewWindow, fallback.serviceButtonNewWindow),
      showChangelogButton: normalizeBoolean(data.showChangelogButton, fallback.showChangelogButton),
      changelogButtonText: normalizeText(data.changelogButtonText, fallback.changelogButtonText),
      changelogButtonUrl: normalizeText(data.changelogButtonUrl, fallback.changelogButtonUrl),
      changelogButtonNewWindow: normalizeBoolean(data.changelogButtonNewWindow, fallback.changelogButtonNewWindow),
    };
  },

  // 获取友情链接
  getFriendLinks: async (): Promise<FriendLink[]> => {
    const response = await api.get('/settings/friend-links', { params: buildNoCacheParams() });
    return unwrapApiList<FriendLink>(response.data);
  },
};

export default settingService;
