/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
/**
 * @file index.tsx
 * @description 404 Block 页面组件
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import './index.css';

const AUTO_REDIRECT_SECONDS = 12;

/**
 * 404 快捷入口配置。
 */
const QUICK_LINKS = [
  { label: 'AI 工具', to: '/ai' },
  { label: '设计资源', to: '/design' },
  { label: '字体灵感', to: '/font' },
  { label: '热门文章', to: '/p/hot' },
  { label: '每日热榜', to: '/p/hot?tab=daily-hot' },
  { label: '每日上新', to: '/p/hot?tab=daily-new' },
];

/**
 * 404 Block 页面组件。
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
   * 拼接倒计时文案，便于后续多语言切换。
   */
  const redirectText = useMemo(() => {
    return `${countdown}s 后自动回到首页`;
  }, [countdown]);

  return (
    <>
      <SEO
        title="页面未找到"
        description="访问的页面不存在或已迁移，请返回首页继续浏览 UIED 导航。"
        keywords="404,页面未找到,导航站"
        url="https://hao.uied.cn/404"
        noindex={true}
      />

      <div className="not-found-block-page">
        <section className="not-found-block" aria-label="404 错误页">
          <div className="not-found-block__code-wrap">
            <span className="not-found-block__code">404</span>
            <span className="not-found-block__line" />
          </div>

          <div className="not-found-block__content">
            <p className="not-found-block__kicker">PAGE NOT FOUND</p>
            <h1>页面不存在或已迁移</h1>
            <p className="not-found-block__desc">
              你访问的链接可能已变更，或者该资源已下线。可以返回首页，或从下面的常用入口继续浏览。
            </p>
            <p className="not-found-block__redirect">{redirectText}</p>

            <div className="not-found-block__actions">
              <Link to="/" className="not-found-block__btn not-found-block__btn--primary">
                返回首页
              </Link>
              <button type="button" className="not-found-block__btn" onClick={() => window.history.back()}>
                返回上页
              </button>
            </div>

            <div className="not-found-block__quick-links">
              {QUICK_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="not-found-block__quick-link">
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
