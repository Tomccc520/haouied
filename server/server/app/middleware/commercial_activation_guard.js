/**
 * @file middleware/commercial_activation_guard.js
 * @description 商业版安装激活守卫：未激活付费授权码时，拦截后台业务接口
 * @author UIED技术团队
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @createDate 2026-03-24
 */

'use strict';

const { reqAdminIdKey = 'admin_id' } = require('../extend/config');

const ACTIVATION_ALLOWLIST = new Set([
  /**
   * 登录相关接口必须放行：
   * 1. 兼容“会话残留 admin_id”场景，避免登录接口被误拦截
   * 2. 确保未激活状态下仍可重新登录并进入授权中心处理
   */
  'system:login',
  'system:login:captcha',
  'common:index:config',
  'system:admin:self',
  'system:menu:route',
  'system:logout',
  'uied:license:info',
  'uied:license:activate',
  'uied:license:save',
  'uied:license:verify',
  'uied:license:public-status',
  'uied:commercial:mode:get',
  'uied:commercial:overview',
  'uied:feature:list',
  'uied:feature:check',
]);

const ADMIN_BUSINESS_API_PREFIXES = [
  '/api/system/',
  '/api/setting/',
  '/api/common/',
  '/api/monitor/',
  '/api/gen/',
  '/api/uied/',
  '/api/user/',
  '/api/article/',
  '/api/channel/',
  '/api/decorate/',
];

/**
 * 规范化请求路径为权限标识（与 auth 中间件保持一致）
 */
function normalizeAuthKey(path = '') {
  let clean = String(path || '').split('?')[0].replace(/\\/g, '/');
  clean = clean.replace(/\/+/g, '/').replace(/\/+$/, '');
  clean = clean.replace(/^\/(?:api|dev-api|prod-api)(?:\/v\d+)?/, '');
  clean = clean.replace(/^\/+/, '');
  return clean ? clean.replace(/\//g, ':') : '';
}

module.exports = options => {
  /**
   * 商业版安装激活中间件
   * 规则：
   * 1. 仅处理后台登录态下的后台业务接口
   * 2. 允许授权中心必需接口直通
   * 3. 未激活有效 Pro/Enterprise 授权码时，统一拦截
   */
  return async function commercialActivationGuard(ctx, next) {
    void options;
    const appConfig = ctx.app.config || {};
    const activationRequired = appConfig.uiedRequirePaidLicenseActivation !== false;
    if (!activationRequired) {
      await next();
      return;
    }

    const requestPath = String(ctx.request.path || '');
    const isAdminBusinessRequest = ADMIN_BUSINESS_API_PREFIXES.some(prefix => requestPath.startsWith(prefix));
    if (!isAdminBusinessRequest) {
      await next();
      return;
    }

    /**
     * 仅拦截后台登录态请求，避免影响前台公开接口。
     */
    const adminId = Number(ctx.session?.[reqAdminIdKey] || 0);
    if (!adminId) {
      await next();
      return;
    }

    const authKey = normalizeAuthKey(requestPath);
    if (ACTIVATION_ALLOWLIST.has(authKey)) {
      await next();
      return;
    }

    try {
      const licenseInfo = await ctx.service.uied.licenseCenter.getLicenseInfo();
      const activated = licenseInfo?.isPaidEdition === true && licenseInfo?.isActive === true;
      if (activated) {
        await next();
        return;
      }

      const licenseStatus = String(licenseInfo?.status || '').trim().toLowerCase();
      const licenseNote = String(licenseInfo?.note || '').trim();
      let message = '请先在授权中心激活有效的 Pro/Enterprise 授权码后再继续操作；如需协助请前往 fsuied.com 联系客服';
      if (licenseStatus === 'inactive') {
        message = licenseNote
          ? `当前授权已被禁用：${licenseNote}，请前往 fsuied.com 联系客服处理后重新激活授权码`
          : '当前授权已被禁用，请前往 fsuied.com 联系客服处理后重新激活授权码';
      } else if (licenseStatus === 'domain_not_authorized') {
        message = '当前域名未在授权白名单，请先在 fsuied.com 绑定该域名后重新激活授权码';
      } else if (licenseStatus === 'domain_limit_exceeded') {
        message = '当前授权域名额度已超限，请在 fsuied.com 申请改绑后重新激活授权码';
      }

      ctx.status = 402;
      ctx.body = {
        code: 402,
        message,
        data: {
          activationRequired: true,
          licenseStatus,
          licenseNote,
          effectiveEdition: String(licenseInfo?.effectiveEdition || 'free'),
        },
      };
    } catch (error) {
      ctx.logger.error('[commercialActivationGuard] 激活校验失败:', error);
      ctx.status = 402;
      ctx.body = {
        code: 402,
        message: '授权状态校验失败，请先完成授权激活',
        data: { activationRequired: true },
      };
    }
  };
};
