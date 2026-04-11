/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-06
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useAppearanceConfig } from '../../hooks/usePublicSettings';
import {
  parseSocialAuthResultParams,
  resolveSocialProviderLabel,
  saveSocialBindResult,
  SOCIAL_AUTH_MESSAGE_TYPE,
  type SocialAuthPopupPayload,
} from '../../utils/socialAuth';
import './SocialCallback.css';

/**
 * 规范化回跳路径，避免第三方参数污染站内跳转
 */
const normalizeRedirectPath = (value: string): string => {
  const text = String(value || '').trim();
  if (!text.startsWith('/')) {
    return '/profile';
  }
  return text;
};

/**
 * 微信登录/绑定回调页
 */
const SocialAuthCallbackPage: React.FC = () => {
  useAppearanceConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const { acceptExternalAuthToken } = useUser();
  const [statusText, setStatusText] = useState('正在处理授权结果...');
  const [isError, setIsError] = useState(false);

  const resultParams = useMemo(
    () => parseSocialAuthResultParams(location.search, location.hash),
    [location.hash, location.search]
  );
  const providerLabel = useMemo(
    () => resolveSocialProviderLabel(String(resultParams.get('social_provider') || '').trim()),
    [resultParams]
  );

  useEffect(() => {
    let closed = false;

    /**
     * 统一构建当前回调的消息载荷
     */
    const buildPayload = (): SocialAuthPopupPayload => {
      const provider = String(resultParams.get('social_provider') || 'wechat').trim() || 'wechat';
      const redirect = normalizeRedirectPath(String(resultParams.get('redirect') || '/profile'));
      const token = String(resultParams.get('social_token') || '').trim();
      const bindSuccess = String(resultParams.get('social_bind_success') || '') === '1';
      const bindError = String(resultParams.get('social_bind_error') || '').trim();
      const loginError = String(resultParams.get('social_error') || '').trim();
      const action = bindSuccess || bindError ? 'bind' : 'login';
      const success = action === 'bind' ? bindSuccess : Boolean(token && !loginError);
      const message = bindError || loginError || (success ? '' : `${providerLabel}授权失败，请稍后重试`);
      return {
        type: SOCIAL_AUTH_MESSAGE_TYPE,
        action,
        success,
        provider,
        token,
        message,
        redirect,
      };
    };

    /**
     * 处理授权回调结果：弹窗回传或整页回跳
     */
    const consumeAuthResult = async () => {
      const payload = buildPayload();
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, window.location.origin);
        setStatusText(payload.success ? '授权完成，正在返回来源窗口...' : (payload.message || '授权失败，正在关闭窗口...'));
        setIsError(!payload.success);
        window.setTimeout(() => {
          window.close();
        }, 120);
        return;
      }

      if (payload.action === 'bind') {
        saveSocialBindResult({
          success: payload.success,
          provider: payload.provider,
          message: payload.message || (payload.success ? `${providerLabel}绑定成功` : `${providerLabel}绑定失败`),
        });
        setIsError(!payload.success);
        setStatusText(payload.message || (payload.success ? `${providerLabel}绑定成功，正在返回账号安全页...` : `${providerLabel}绑定失败，正在返回账号安全页...`));
        window.setTimeout(() => {
          if (!closed) {
            navigate(payload.redirect || '/profile/security', { replace: true });
          }
        }, 480);
        return;
      }

      if (!payload.success || !payload.token) {
        setIsError(true);
        setStatusText(payload.message || `${providerLabel}登录失败，请返回重试`);
        window.setTimeout(() => {
          if (!closed) {
            navigate(payload.redirect || '/', { replace: true });
          }
        }, 1200);
        return;
      }

      try {
        await acceptExternalAuthToken(payload.token);
        setIsError(false);
        setStatusText(`${providerLabel}登录成功，正在返回当前页面...`);
        if (!closed) {
          navigate(payload.redirect || '/', { replace: true });
        }
      } catch (error: any) {
        setIsError(true);
        setStatusText(error?.message || `${providerLabel}登录失败，请重新发起授权`);
      }
    };

    consumeAuthResult().catch((error: any) => {
      setIsError(true);
      setStatusText(error?.message || `${providerLabel}授权处理失败，请稍后重试`);
    });

    return () => {
      closed = true;
    };
  }, [acceptExternalAuthToken, navigate, providerLabel, resultParams]);

  return (
    <div className="social-callback-page">
      <div className="social-callback-card">
        <div className={`social-callback-badge ${isError ? 'is-error' : ''}`}>
          {isError ? '授权失败' : `${providerLabel}授权`}
        </div>
        <h1 className="social-callback-title">正在同步登录结果</h1>
        <p className="social-callback-desc">{statusText}</p>
      </div>
    </div>
  );
};

export default SocialAuthCallbackPage;
