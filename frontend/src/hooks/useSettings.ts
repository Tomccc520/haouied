/**
 * @file useSettings.ts
 * @description 前端用户界面组件
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import {
  settingService,
  NavMenuItem,
  FooterGroup,
  FooterAboutConfig,
  FriendLink
} from '../services/settingService';
import { debugLog } from '../utils/debugHelper';

// 导航菜单 Hook
export const useNavMenus = () => {
  const [menus, setMenus] = useState<NavMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const data = await settingService.getNavMenus();
        // 只返回可见的菜单
        const visibleMenus = data.filter(menu => menu.visible);
        setMenus(visibleMenus);
        setError(null);
      } catch (err) {
        setError(err as Error);
        debugLog.error('Failed to fetch nav menus:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, []);

  return { menus, loading, error };
};

// 页脚分组 Hook
export const useFooterGroups = () => {
  const [groups, setGroups] = useState<FooterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const data = await settingService.getFooterGroups();
        // 只返回可见的分组和链接
        const visibleGroups = data
          .filter(group => group.visible)
          .map(group => ({
            ...group,
            links: group.links.filter(link => link.visible)
          }));
        setGroups(visibleGroups);
        setError(null);
      } catch (err) {
        setError(err as Error);
        debugLog.error('Failed to fetch footer groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return { groups, loading, error };
};

// 页脚关于区域配置 Hook
export const useFooterAboutConfig = () => {
  const [config, setConfig] = useState<FooterAboutConfig>({
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await settingService.getFooterAboutConfig();
        setConfig(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        debugLog.error('Failed to fetch footer about config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};

// 友情链接 Hook
export const useFriendLinks = () => {
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setLoading(true);
        const data = await settingService.getFriendLinks();
        setLinks(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        debugLog.error('Failed to fetch friend links:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  return { links, loading, error };
};
