import React, { useState } from 'react';
import './PostItem.css';
import fallbackImg from '../assets/img-placeholder.png.js'; // 更正导入路径，从JS文件导入

function PostItem({ post, isLatest, rank }) {
  const [imageError, setImageError] = useState(false);

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`post-item ${isLatest ? 'latest-item' : ''}`}>
      {rank && <div className="rank">{rank}</div>}
      <div className="post-content">
        <div className="thumbnail-container">
          {post.thumbnail_url && !imageError ? (
            <img 
              src={post.thumbnail_url} 
              alt={post.title} 
              onError={handleImageError}
            />
          ) : (
            // 使用备用图片或者替代内容
            <div className="thumbnail-error">
              {fallbackImg ? (
                <img src={fallbackImg} alt="图片无法加载" />
              ) : (
                "暂无图片"
              )}
            </div>
          )}
        </div>
        <div className="text-content">
          <h3 className="title" dangerouslySetInnerHTML={{ __html: post.title }}></h3>
          <div className="post-meta">
            {post.author && <span className="author">{post.author}</span>}
            <span className="views">{post.views} 次阅读</span>
            <span className="date">{post.date}</span>
          </div>
          {post.excerpt && (
            <div className="excerpt" dangerouslySetInnerHTML={{ __html: post.excerpt }}></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostItem; 