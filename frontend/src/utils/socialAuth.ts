/**
 * 第三方登录消息类型
 */
export const SOCIAL_AUTH_MESSAGE_TYPE = 'uied-social-auth-result';
export const SOCIAL_AUTH_BIND_RESULT_KEY = 'uied-social-bind-result';

export type SocialAuthPopupAction = 'login' | 'bind';
export type WechatSocialProvider = 'wechatWebsite' | 'wechatOfficialAccount';

export interface SocialAuthPopupPayload {
  type: typeof SOCIAL_AUTH_MESSAGE_TYPE;
  action: SocialAuthPopupAction;
  success: boolean;
  provider: string;
  token?: string;
  message?: string;
  redirect?: string;
}

export interface SocialAuthBindResultPayload {
  success: boolean;
  provider: string;
  message?: string;
}

export interface WechatSocialAuthConfigLike {
  wechatWebsiteLogin?: {
    enabled?: boolean;
  };
  wechatOfficialAccountLogin?: {
    enabled?: boolean;
  };
}

/**
 * 判断是否处于微信内置浏览器
 */
export const isWechatBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /micromessenger/i.test(String(navigator.userAgent || ''));
};

/**
 * 根据当前环境与后台开关选择微信登录提供方
 */
export const resolvePreferredWechatProvider = (
  authConfig?: WechatSocialAuthConfigLike | null
): WechatSocialProvider | '' => {
  const websiteEnabled = authConfig?.wechatWebsiteLogin?.enabled === true;
  const officialEnabled = authConfig?.wechatOfficialAccountLogin?.enabled === true;
  const insideWechat = isWechatBrowser();
  if (insideWechat && officialEnabled) {
    return 'wechatOfficialAccount';
  }
  if (websiteEnabled) {
    return 'wechatWebsite';
  }
  if (insideWechat && officialEnabled) {
    return 'wechatOfficialAccount';
  }
  return '';
};

/**
 * 获取当前前端来源域名
 */
export const getFrontendOrigin = (): string => {
  if (typeof window === 'undefined') return '';
  return String(window.location.origin || '').trim();
};

/**
 * 获取当前前端相对路径（用于登录后回跳）
 */
export const getCurrentRelativePath = (): string => {
  if (typeof window === 'undefined') return '/';
  const { pathname, search, hash } = window.location;
  return `${pathname || '/'}${search || ''}${hash || ''}` || '/';
};

/**
 * 居中打开弹窗
 */
export const openCenteredPopup = (
  url: string,
  title = '微信登录',
  width = 560,
  height = 720
): Window | null => {
  if (typeof window === 'undefined') return null;
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || window.screen.width;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || window.screen.height;
  const left = dualScreenLeft + Math.max(0, (viewportWidth - width) / 2);
  const top = dualScreenTop + Math.max(0, (viewportHeight - height) / 2);
  const features = [
    `width=${Math.round(width)}`,
    `height=${Math.round(height)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'resizable=yes',
    'scrollbars=yes',
    'noopener=no',
    'noreferrer=no',
  ].join(',');
  return window.open(url, title, features);
};

/**
 * 判断是否为第三方登录结果消息
 */
export const isSocialAuthPopupPayload = (payload: unknown): payload is SocialAuthPopupPayload => {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return record.type === SOCIAL_AUTH_MESSAGE_TYPE
    && (record.action === 'login' || record.action === 'bind');
};

/**
 * 解析回调页 hash/search 参数
 */
export const parseSocialAuthResultParams = (
  searchText = '',
  hashText = ''
): URLSearchParams => {
  const searchParams = new URLSearchParams(String(searchText || '').replace(/^\?/, ''));
  const hashParams = new URLSearchParams(String(hashText || '').replace(/^#/, ''));
  hashParams.forEach((value, key) => {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  });
  return searchParams;
};

/**
 * 持久化微信绑定结果，供整页回跳后个人中心读取
 */
export const saveSocialBindResult = (payload: SocialAuthBindResultPayload) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SOCIAL_AUTH_BIND_RESULT_KEY, JSON.stringify(payload || {}));
};

/**
 * 读取并消费微信绑定结果
 */
export const consumeSocialBindResult = (): SocialAuthBindResultPayload | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(SOCIAL_AUTH_BIND_RESULT_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(SOCIAL_AUTH_BIND_RESULT_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      success: parsed.success === true,
      provider: String(parsed.provider || ''),
      message: String(parsed.message || '').trim(),
    };
  } catch (_error) {
    return null;
  }
};
