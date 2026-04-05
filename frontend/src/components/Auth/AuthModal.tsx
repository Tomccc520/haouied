/**
 * @file AuthModal.tsx
 * @description 用户认证弹窗 - 支持登录和注册
 * @copyright 版权所有 (c) 2026 UIED技术团队
 */
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.1.27
 */

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';
import userService, { LoginTwoFactorChallenge } from '../../services/userService';
import Modal from '../UI/Modal';
import publicSettingService from '../../services/publicSettingService';
import { DEFAULT_BRAND_CONFIG, type BrandConfig } from '../../config/brandConfig';
import {
  getCurrentRelativePath,
  getFrontendOrigin,
  isSocialAuthPopupPayload,
  openCenteredPopup,
  resolvePreferredWechatProvider,
} from '../../utils/socialAuth';
import './AuthModal.css';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

/**
 * 认证配置接口
 */
interface AuthConfig {
  enable_register: number;
  enable_login: number;
  enable_user_center: number;
  register_close_message: string;
  login_close_message: string;
  user_center_close_message: string;
  wechatWebsiteLogin: {
    enabled: boolean;
    appId: string;
    callbackPath: string;
  };
  wechatOfficialAccountLogin: {
    enabled: boolean;
    appId: string;
    oauthCallbackPath: string;
  };
}

/**
 * 用户登录/注册弹窗组件
 */
const AuthModal: React.FC<AuthModalProps> = ({ 
  visible, 
  onClose, 
  initialMode = 'login' 
}) => {
  const {
    login,
    verifyLoginTwoFactor,
    acceptExternalAuthToken,
    register,
    error: authError,
    clearError,
    loading,
  } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<LoginTwoFactorChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [sendingTwoFactorCode, setSendingTwoFactorCode] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [socialMessage, setSocialMessage] = useState('');
  const socialPopupRef = useRef<Window | null>(null);
  
  // 认证配置状态
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    enable_register: 1,
    enable_login: 1,
    enable_user_center: 1,
    register_close_message: '',
    login_close_message: '',
    user_center_close_message: '',
    wechatWebsiteLogin: {
      enabled: false,
      appId: '',
      callbackPath: '/api/auth/wechat/open-platform/callback',
    },
    wechatOfficialAccountLogin: {
      enabled: false,
      appId: '',
      oauthCallbackPath: '/api/auth/wechat/official-account/login/callback',
    },
  });
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '', // 注册时可选
  });

  // 本地错误状态（表单验证）
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载认证配置
  useEffect(() => {
    const loadAuthConfig = async () => {
      try {
        const settings = await publicSettingService.getPublicSettings();
        const nextConfig = settings.authConfig || {};
        setAuthConfig({
          enable_register: nextConfig.enable_register === 0 ? 0 : 1,
          enable_login: nextConfig.enable_login === 0 ? 0 : 1,
          enable_user_center: nextConfig.enable_user_center === 0 ? 0 : 1,
          register_close_message: String(nextConfig.register_close_message || ''),
          login_close_message: String(nextConfig.login_close_message || ''),
          user_center_close_message: String(nextConfig.user_center_close_message || ''),
          wechatWebsiteLogin: {
            enabled: nextConfig?.wechatWebsiteLogin?.enabled === true,
            appId: String(nextConfig?.wechatWebsiteLogin?.appId || ''),
            callbackPath: String(nextConfig?.wechatWebsiteLogin?.callbackPath || '/api/auth/wechat/open-platform/callback'),
          },
          wechatOfficialAccountLogin: {
            enabled: nextConfig?.wechatOfficialAccountLogin?.enabled === true,
            appId: String(nextConfig?.wechatOfficialAccountLogin?.appId || ''),
            oauthCallbackPath: String(
              nextConfig?.wechatOfficialAccountLogin?.oauthCallbackPath
              || '/api/auth/wechat/official-account/login/callback'
            ),
          },
        });
        setBrandConfig(settings.brand || DEFAULT_BRAND_CONFIG);
      } catch (error) {
        console.error('加载认证配置失败:', error);
        // 使用默认配置（允许登录和注册）
      }
    };
    loadAuthConfig();
  }, []);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setFormData({ username: '', password: '', confirmPassword: '', nickname: '' });
      setTwoFactorChallenge(null);
      setTwoFactorCode('');
      setSocialSubmitting(false);
      setSocialMessage('');
      setErrors({});
      clearError();
    }
  }, [visible, initialMode, clearError]);

  useEffect(() => {
    if (!visible) return;

    /**
     * 监听微信登录弹窗回传结果，并写入站内登录态
     */
    const handleSocialResultMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isSocialAuthPopupPayload(event.data) || event.data.action !== 'login') return;
      socialPopupRef.current?.close();
      socialPopupRef.current = null;
      if (!event.data.success || !event.data.token) {
        setSocialSubmitting(false);
        setSocialMessage(event.data.message || '微信登录失败，请稍后重试');
        return;
      }
      try {
        await acceptExternalAuthToken(event.data.token);
        setSocialSubmitting(false);
        setSocialMessage('');
        onClose();
      } catch (error: any) {
        setSocialSubmitting(false);
        setSocialMessage(error?.message || '微信登录失败，请稍后重试');
      }
    };

    window.addEventListener('message', handleSocialResultMessage);
    return () => {
      window.removeEventListener('message', handleSocialResultMessage);
    };
  }, [acceptExternalAuthToken, onClose, visible]);

  useEffect(() => {
    if (!socialSubmitting || !socialPopupRef.current) return;
    const timer = window.setInterval(() => {
      if (socialPopupRef.current && socialPopupRef.current.closed) {
        socialPopupRef.current = null;
        setSocialSubmitting(false);
        setSocialMessage(prev => prev || '微信授权窗口已关闭，请重新发起登录');
      }
    }, 400);
    return () => {
      window.clearInterval(timer);
    };
  }, [socialSubmitting]);

  /**
   * 校验表单输入
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (twoFactorChallenge) {
      if (!twoFactorCode.trim()) {
        newErrors.twoFactorCode = '请输入验证码';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名/账号';
    }
    if (!formData.password) {
      newErrors.password = '请输入密码';
    }
    if (mode === 'register') {
      if (formData.password.length < 6) {
        newErrors.password = '密码长度至少6位';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '两次密码输入不一致';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 提交表单数据
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 检查个人中心总开关
    if (authConfig.enable_user_center === 0) {
      alert(authConfig.user_center_close_message || '个人中心功能暂时关闭');
      return;
    }

    // 检查登录开关
    if (mode === 'login' && authConfig.enable_login === 0) {
      alert(authConfig.login_close_message || '系统维护中，暂时无法登录');
      return;
    }

    // 检查注册开关
    if (mode === 'register' && authConfig.enable_register === 0) {
      alert(authConfig.register_close_message || '注册功能暂时关闭');
      return;
    }

    try {
      if (mode === 'login') {
        if (twoFactorChallenge) {
          await verifyLoginTwoFactor({
            challengeToken: twoFactorChallenge.challengeToken,
            code: twoFactorCode.trim(),
          });
        } else {
          const result = await login({
            username: formData.username,
            account: formData.username,
            password: formData.password,
          });
          if (result?.need2fa && result.challenge) {
            setTwoFactorChallenge(result.challenge);
            setTwoFactorCode('');
            setErrors({});
            return;
          }
        }
      } else {
        await register({
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          nickname: formData.nickname || undefined,
        });
      }
      // 成功后关闭弹窗
      onClose();
    } catch (err) {
      // 错误由 Context 处理并存储在 authError 中
    }
  };

  /**
   * 处理输入框变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * 切换登录/注册模式
   */
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setTwoFactorChallenge(null);
    setTwoFactorCode('');
    setSocialSubmitting(false);
    setSocialMessage('');
    setErrors({});
    clearError();
  };

  /**
   * 重新发送登录 2FA 验证码
   */
  const handleResendTwoFactorCode = async () => {
    if (!twoFactorChallenge?.challengeToken) return;
    setSendingTwoFactorCode(true);
    try {
      await userService.sendLoginTwoFactorCode(twoFactorChallenge.challengeToken);
    } catch (error) {
      // 具体错误由全局拦截统一处理
    } finally {
      setSendingTwoFactorCode(false);
    }
  };

  /**
   * 发起微信登录（PC 扫码 / 微信内网页授权）
   */
  const handleWechatLogin = async () => {
    if (authConfig.enable_user_center === 0) {
      setSocialMessage(authConfig.user_center_close_message || '个人中心功能暂时关闭');
      return;
    }
    if (authConfig.enable_login === 0) {
      setSocialMessage(authConfig.login_close_message || '系统维护中，暂时无法登录');
      return;
    }
    const provider = resolvePreferredWechatProvider(authConfig);
    if (!provider) {
      setSocialMessage('管理员暂未开启微信登录');
      return;
    }
    setSocialSubmitting(true);
    setSocialMessage('');
    clearError();
    try {
      const result = await userService.getSocialLoginState({
        provider,
        origin: getFrontendOrigin(),
        redirect: getCurrentRelativePath(),
      });
      const authUrl = String(result?.authUrl || '').trim();
      if (!authUrl) {
        throw new Error('微信授权地址生成失败');
      }
      if (provider === 'wechatOfficialAccount') {
        window.location.href = authUrl;
        return;
      }
      const popup = openCenteredPopup(authUrl, '微信登录', 540, 720);
      if (!popup) {
        window.location.href = authUrl;
        return;
      }
      socialPopupRef.current = popup;
      popup.focus?.();
    } catch (error: any) {
      setSocialSubmitting(false);
      setSocialMessage(error?.message || '微信登录启动失败，请稍后重试');
    }
  };

  const availableWechatProvider = resolvePreferredWechatProvider(authConfig);
  const showWechatLogin = mode === 'login'
    && !twoFactorChallenge
    && Boolean(availableWechatProvider);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      width={400}
      title=""
      closable={false} // 禁用默认头部
      className="auth-modal"
    >
      <div className="auth-modal-content">
        <button className="auth-close-btn" onClick={onClose}>×</button>
        
        <div className="auth-header">
          <div className="auth-logo">{brandConfig.authLogoText}</div>
          <h2 className="auth-title">
            {mode === 'login' ? brandConfig.authLoginTitle : brandConfig.authRegisterTitle}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' ? brandConfig.authLoginSubtitle : brandConfig.authRegisterSubtitle}
          </p>
        </div>

        <div className="auth-switch-wrapper">
          <div className="auth-switch-simple">
            <button 
              className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              登录
            </button>
            <div className="auth-switch-divider"></div>
            <button 
              className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              注册
            </button>
          </div>
        </div>

        {authError && (
          <div className="auth-global-error">
            {authError.message}
          </div>
        )}
        {!authError && socialMessage && (
          <div className="auth-global-error">
            {socialMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!twoFactorChallenge ? (
            <>
              <div className="form-item">
                <label className="form-label">账号</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="username"
                    className={`form-input ${errors.username ? 'error' : ''}`}
                    placeholder="用户名 / 手机号 / 邮箱"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.username && <span className="form-error-msg">{errors.username}</span>}
              </div>

              {mode === 'register' && (
                <div className="form-item">
                  <label className="form-label">昵称 (选填)</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="nickname"
                      className="form-input"
                      placeholder="怎么称呼您"
                      value={formData.nickname}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              <div className="form-item">
                <label className="form-label">密码</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.password && <span className="form-error-msg">{errors.password}</span>}
              </div>

              {mode === 'register' && (
                <div className="form-item">
                  <label className="form-label">确认密码</label>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      name="confirmPassword"
                      className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                      placeholder="请再次输入密码"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.confirmPassword && <span className="form-error-msg">{errors.confirmPassword}</span>}
                </div>
              )}
            </>
          ) : (
            <div className="form-item">
              <label className="form-label">二次验证验证码</label>
              <div className="auth-global-error" style={{ marginBottom: 12 }}>
                已向 {twoFactorChallenge.maskedAccount || '安全账号'} 发送验证码，请输入后完成登录。
              </div>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="twoFactorCode"
                  className={`form-input ${errors.twoFactorCode ? 'error' : ''}`}
                  placeholder="请输入 6 位验证码"
                  value={twoFactorCode}
                  onChange={e => {
                    setTwoFactorCode(e.target.value);
                    if (errors.twoFactorCode) {
                      setErrors(prev => ({ ...prev, twoFactorCode: '' }));
                    }
                  }}
                />
              </div>
              {errors.twoFactorCode && <span className="form-error-msg">{errors.twoFactorCode}</span>}
              <div className="auth-footer" style={{ marginTop: 10 }}>
                <span className="auth-link" onClick={handleResendTwoFactorCode}>
                  {sendingTwoFactorCode ? '发送中...' : '重新发送验证码'}
                </span>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading || socialSubmitting}
          >
            {loading ? '处理中...' : (twoFactorChallenge ? '提交验证码' : (mode === 'login' ? '立即登录' : '立即注册'))}
          </button>
        </form>

        {showWechatLogin && (
          <div className="auth-social-section">
            <div className="auth-social-divider">
              <span>或使用微信继续</span>
            </div>
            <button
              type="button"
              className="auth-social-btn auth-social-btn--wechat"
              onClick={handleWechatLogin}
              disabled={loading || socialSubmitting}
            >
              <span className="auth-social-btn__icon" aria-hidden="true">微</span>
              <span>{socialSubmitting ? '正在打开微信授权...' : '微信登录'}</span>
            </button>
          </div>
        )}

        {!twoFactorChallenge && (
        <div className="auth-footer">
          {mode === 'login' ? (
            <>
              还没有账号？
              <span className="auth-link" onClick={() => switchMode('register')}>
                立即注册
              </span>
            </>
          ) : (
            <>
              已有账号？
              <span className="auth-link" onClick={() => switchMode('login')}>
                立即登录
              </span>
            </>
          )}
        </div>
        )}
      </div>
    </Modal>
  );
};

export default AuthModal;
