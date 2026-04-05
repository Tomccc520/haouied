/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 */
/**
 * @file index.tsx
 * @description 404 页面组件
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import { resolveSeoRedirect } from '../../services/seoRedirectService';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import './index.css';

/**
 * 404 页面组件：统一站点风格，提供清晰回退路径。
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: publicSettings } = usePublicSettings();
  const brandConfig = publicSettings.brand;
  const autoRedirectSeconds = Math.max(3, Number(brandConfig.notFoundAutoRedirectSeconds || 10));
  const [countdown, setCountdown] = useState<number>(autoRedirectSeconds);
  const [resolvingRedirect, setResolvingRedirect] = useState<boolean>(true);

  useEffect(() => {
    setCountdown(autoRedirectSeconds);
  }, [autoRedirectSeconds, location.pathname, location.search]);

  useEffect(() => {
    let active = true;

    /**
     * 尝试解析后台运营短链规则，命中后直接跳转目标地址。
     */
    const resolveRedirect = async () => {
      const pathname = String(location.pathname || '').trim();
      if (!pathname || pathname === '/' || pathname.startsWith('/api/')) {
        if (active) setResolvingRedirect(false);
        return;
      }

      const result = await resolveSeoRedirect(pathname, location.search || '');
      if (!active) return;

      if (result.matched && result.targetUrl) {
        const currentPath = `${window.location.pathname}${window.location.search || ''}`;
        const currentOrigin = window.location.origin;
        const normalizedCurrentUrl = `${currentOrigin}${currentPath}`;
        const normalizedTargetUrl = (() => {
          try {
            return new URL(result.targetUrl, currentOrigin).toString();
          } catch (_error) {
            return String(result.targetUrl || '').trim();
          }
        })();
        if (normalizedTargetUrl !== normalizedCurrentUrl && result.targetUrl !== currentPath) {
          window.location.replace(result.targetUrl);
          return;
        }
      }

      setResolvingRedirect(false);
    };

    setResolvingRedirect(true);
    resolveRedirect();

    return () => {
      active = false;
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (resolvingRedirect) {
      return;
    }
    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, navigate, resolvingRedirect]);

  /**
   * 拼接倒计时文案，便于统一管理。
   */
  const redirectText = useMemo(() => (
    resolvingRedirect ? '正在检查运营短链...' : `${countdown}s 后自动回到首页`
  ), [countdown, resolvingRedirect]);
  const seoUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/404`;
  }, []);

  /**
   * 判断快捷入口是否为外链。
   */
  const isExternalLink = (value: string): boolean => /^(https?:)?\/\//i.test(String(value || '').trim());

  return (
    <>
      <SEO
        title={brandConfig.notFoundSeoTitle}
        description={brandConfig.notFoundSeoDescription}
        keywords={brandConfig.notFoundSeoKeywords}
        url={seoUrl}
        noindex={true}
      />
      <div className="not-found-page">
        <section className="not-found-card" aria-label="404 错误页">
          <div className="not-found-card__code-wrap">
            <span className="not-found-card__code">404</span>
            <span className="not-found-card__code-sub">PAGE NOT FOUND</span>
          </div>
          <div className="not-found-card__content">
            <h1>{brandConfig.notFoundTitle}</h1>
            <p className="not-found-card__desc">{brandConfig.notFoundDescription}</p>
            <p className="not-found-card__redirect">{redirectText}</p>
            <div className="not-found-card__actions">
              <Link to="/" className="not-found-card__btn not-found-card__btn--primary">
                返回首页
              </Link>
              <button type="button" className="not-found-card__btn" onClick={() => window.history.back()}>
                返回上页
              </button>
            </div>
            <div className="not-found-card__quick-links">
              {brandConfig.notFoundQuickLinks.map((item) => (
                isExternalLink(item.to) ? (
                  <a
                    key={`${item.label}-${item.to}`}
                    href={item.to}
                    className="not-found-card__quick-link"
                    target={item.newWindow ? '_blank' : '_self'}
                    rel={item.newWindow ? 'noopener noreferrer' : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={`${item.label}-${item.to}`}
                    to={item.to}
                    className="not-found-card__quick-link"
                    target={item.newWindow ? '_blank' : undefined}
                    rel={item.newWindow ? 'noopener noreferrer' : undefined}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default NotFoundPage;
