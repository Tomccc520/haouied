/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
/**
 * @file pages/Articles/ArticleCard.tsx
 * @description 文章卡片组件（轻量阅读版）
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArticleListItem } from '../../types/article';
import './ArticleCard.css';

interface ArticleCardProps {
  article: ArticleListItem;
}

/**
 * 格式化文章发布时间，统一列表卡片日期展示。
 */
const formatDate = (dateValue: string | number | null): string => {
  if (!dateValue) return '';
  const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const articleLink = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
  const articleAuthor = String(article.author || 'UIED').trim();
  const primaryTagName = article.tags?.[0]?.name || '';

  return (
    <Link to={articleLink} className="article-card">
      <div className="card-cover-wrapper">
        {article.coverImage ? (
          <img
            src={article.coverImage}
            alt={article.title}
            className="card-cover-img"
            loading="lazy"
          />
        ) : (
          <div className="card-cover-placeholder">
            <span>{article.title.charAt(0)}</span>
          </div>
        )}
        <span className="card-category-badge">{article.category}</span>
      </div>

      <div className="card-content">
        <div className="card-meta-top">
          <span className="card-date">{formatDate(article.publishedAt) || '-'}</span>
          {primaryTagName && (
            <span className="card-main-tag">#{primaryTagName}</span>
          )}
        </div>

        <h3 className="card-title" title={article.title}>
          {article.title}
        </h3>
        
        <p className="card-excerpt">
          {article.excerpt || '暂无摘要'}
        </p>

        <div className="card-footer">
          <div className="card-author">
            <div className="author-avatar-mini">
              {(articleAuthor.charAt(0) || 'U').toUpperCase()}
            </div>
            <span className="author-name">{articleAuthor}</span>
          </div>

          <div className="card-stats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{Number(article.viewCount || 0).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
