/**
 * @file utils/index.ts
 * @description 工具函数
 */
import { RankItem, DataType } from '../types';

// 获取图片URL
export const getImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://img.uied.cn${url}`;
};

// 处理图片加载错误
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, type: 'thumbnail' | 'avatar') => {
  const target = e.target as HTMLImageElement;
  target.onerror = null;
  target.src = type === 'thumbnail' 
    ? 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-thumbnail.jpg'
    : 'https://img.uied.cn/wp-content/themes/uied/assets/images/default-avatar.png';
};

// 获取分类样式名
export const getCategoryClassName = (item: RankItem): string => {
  if (!item.category) return '';
  return `category-${item.category.toLowerCase().replace(/\s+/g, '-')}`;
};

// 数据类型转中文
export const typeToChineseName = (type: DataType): string => {
  const typeMap: Record<DataType, string> = {
    'latest-posts': '最新文章',
    'hot-posts': '热门文章',
    'categories': '分类',
    'users': '用户',
    'circles': '圈子',
    'circle-posts': '圈子文章',
    'posts': '文章',
    'tags': '标签',
    'category-posts': '分类文章',
    'tag-posts': '标签文章'
  };
  return typeMap[type] || '数据';
}; 