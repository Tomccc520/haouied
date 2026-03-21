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
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import './index.css';

const AUTO_REDIRECT_SECONDS = 10;

/**
 * 404 常用快捷入口。
 */
const QUICK_LINKS = [
  { label: 'AI导航', to: '/ai' },
  { label: 'UI导航', to: '/uiux' },
  { label: '平面导航', to: '/design' },
  { label: 'MCP中心', to: '/mcp' },
  { label: 'Figma频道', to: '/figma' },
  { label: '热门内容', to: '/p/hot' },
];

/**
 * 404 页面组件：统一站点风格，提供清晰回退路径。
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number>(AUTO_REDIRECT_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, navigate]);

  /**
   * 拼接倒计时文案，便于统一管理。
   */
  const redirectText = useMemo(() => `${countdown}s 后自动回到首页`, [countdown]);

  return (
    <>
      <SEO
        title="页面未找到"
        description="访问的页面不存在或已迁移，请返回首页继续浏览 UIED 导航。"
        keywords="404,页面未找到,导航站"
        url="https://hao.uied.cn/404"
        noindex={true}
      />
      <div className="not-found-page">
        <section className="not-found-card" aria-label="404 错误页">
          <div className="not-found-card__code-wrap">
            <span className="not-found-card__code">404</span>
            <span className="not-found-card__code-sub">PAGE NOT FOUND</span>
          </div>
          <div className="not-found-card__content">
            <h1>页面不存在或已迁移</h1>
            <p className="not-found-card__desc">
              你访问的链接可能已经下线、改名或暂未开放。你可以返回首页，或直接进入常用入口继续浏览。
            </p>
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
              {QUICK_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="not-found-card__quick-link">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default NotFoundPage;
