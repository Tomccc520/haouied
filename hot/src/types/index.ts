/**
 * @file types/index.ts
 * @description 类型定义文件
 */

// WordPress数据获取参数类型
export interface UseWordPressDataParams {
  type: 'posts' | 'users' | 'categories';
  perPage?: number;
  page?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  category?: number;
  search?: string;
  include?: number[];
  exclude?: number[];
}

// 用户元数据类型
export interface UserMeta {
  post_count?: number;
  comment_count?: number;
  view_count?: number;
}

// 用户类型
export interface User {
  id: number;
  name: string;
  url: string;
  description?: string;
  avatar_urls: {
    [key: string]: string;
  };
  meta?: UserMeta;
}

// WordPress文章类型
export interface Post {
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  link: string;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  comment_count: number;
  _embedded?: {
    author?: {
      id: number;
      name: string;
      avatar_urls: {
        [key: string]: string;
      };
    }[];
    'wp:featuredmedia'?: {
      source_url: string;
    }[];
  };
}

// WordPress分类类型
export interface Category {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  parent: number;
  rank?: number; // 排名
}

// WordPress标签类型
export interface Tag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  rank?: number; // 排名
}

// 数据类型
export type DataType = 'latest-posts' | 'hot-posts' | 'categories' | 'users' | 'circles' | 'circle-posts' | 'posts' | 'tags' | 'category-posts' | 'tag-posts';

// 排名项类型
export interface RankItem {
  id: number;
  name: string;
  link: string;
  score?: number;
  category?: string;
  description?: string;
  thumbnail?: string;
  featured_image?: string;
  authorName?: string;
  authorAvatar?: string;
  date?: string;
  timeAgo?: string;
  viewCount?: number;
  count?: number;
  isNew?: boolean;
  
  // 设计素材专用属性
  downloadCount?: number;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
    count?: number;
  }>;
  
  // 圈子文章附加字段
  title?: string;
  content?: string;
  excerpt?: string;
  author?: {
    id: string;
    name: string;
    avatar: string;
    url: string;
  };
  attachment?: {
    image: Array<{
      id: number;
      title: string;
      thumb: string;
      full: string;
      thumb_webp: string;
      width: number;
      height: number;
    }>;
    video: any[];
    file: any[];
  };
  comment_count?: number | string;
  view_count?: string | number;
  like_count?: string | number;
  sticky?: number;
  type?: string;
  visibility?: string;
  time_ago?: string;
  topic_id?: number;
}

// 排名标签类型
export interface RankTab {
  key: string;
  title: string;
  icon?: React.ReactNode;
  description?: string;
  category?: string;
  dataType: string;
  subFilters?: Array<{
    key: string;
    label: string;
  }>;
}

// Lodash throttle 设置类型
export interface ThrottleSettings {
  leading?: boolean;
  trailing?: boolean;
} 