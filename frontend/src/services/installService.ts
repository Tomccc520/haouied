/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
 *
 * @file installService.ts
 * @description 安装向导服务：安装状态、环境检测、初始化执行
 */

import api from './api';
import { unwrapApiResponse } from '../utils/apiResponse';

/**
 * 安装状态响应
 */
export interface InstallStatus {
  installed: boolean;
  adminCount: number;
  installState: Record<string, unknown> | null;
  wizardVersion: string;
  now: number;
}

/**
 * 环境检查项
 */
export interface InstallEnvCheckItem {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  value: string;
  message: string;
}

/**
 * 环境检测响应
 */
export interface InstallEnvResult {
  checks: InstallEnvCheckItem[];
  passCount: number;
  warnCount: number;
  failCount: number;
  canInstall: boolean;
  checkedAt: number;
}

/**
 * 安装初始化参数
 */
export interface InstallInitializePayload {
  siteName: string;
  siteTitle: string;
  siteDescription?: string;
  siteKeywords?: string;
  adminUsername: string;
  adminPassword: string;
  adminNickname?: string;
  adminEmail?: string;
}

/**
 * 安装初始化结果
 */
export interface InstallInitializeResult {
  installed: boolean;
  completedAt: number;
  admin: {
    id: number;
    username: string;
    nickname: string;
    roleId: number;
    created: boolean;
  };
  site: {
    siteName: string;
    siteTitle: string;
  };
  menu: {
    commercialLicenseMenuId: number;
    deliveryCenterMenuId: number;
  };
}

/**
 * 获取安装状态
 */
export const getInstallStatus = async (): Promise<InstallStatus> => {
  const response = await api.get('/install/status');
  return unwrapApiResponse<InstallStatus>(response.data, {
    installed: false,
    adminCount: 0,
    installState: null,
    wizardVersion: '',
    now: 0,
  });
};

/**
 * 获取环境检测结果
 */
export const getInstallEnvCheck = async (): Promise<InstallEnvResult> => {
  const response = await api.get('/install/env-check');
  return unwrapApiResponse<InstallEnvResult>(response.data, {
    checks: [],
    passCount: 0,
    warnCount: 0,
    failCount: 0,
    canInstall: false,
    checkedAt: 0,
  });
};

/**
 * 执行安装初始化
 */
export const runInstallInitialize = async (
  payload: InstallInitializePayload
): Promise<InstallInitializeResult> => {
  const response = await api.post('/install/initialize', payload);
  return unwrapApiResponse<InstallInitializeResult>(response.data, {
    installed: false,
    completedAt: 0,
    admin: {
      id: 0,
      username: '',
      nickname: '',
      roleId: 0,
      created: false,
    },
    site: {
      siteName: '',
      siteTitle: '',
    },
    menu: {
      commercialLicenseMenuId: 0,
      deliveryCenterMenuId: 0,
    },
  });
};

