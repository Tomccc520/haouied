import { useState, useEffect } from 'react';
import { 
  getHotPosts, 
  getHotUsers, 
  getHotCategories, 
  getHotTags 
} from '../services/api';
import { Post, User, Category, Tag, RankItem } from '../types';

/**
 * 将WordPress文章转换为通用RankItem格式
 * 增强版本，包含更多详细信息
 * 
 * @param posts WordPress文章数组
 * @returns 格式化的RankItem数组
 */
const postsToRankItems = (posts: Post[]): RankItem[] => {
  return posts.map((post, index) => {
    // 获取作者信息
    const author = post._embedded?.author?.[0];
    // 获取特色图片
    const thumbnail = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    
    // 创建随机的统计数据（实际项目中应该从真实数据源获取）
    const viewCount = Math.floor(Math.random() * 10000) + 500;
    const likeCount = Math.floor(Math.random() * 300) + 10;
    const favoriteCount = Math.floor(Math.random() * 200) + 5;
    const shareCount = Math.floor(Math.random() * 50) + 1;
    
    // 随机生成上次排名
    const previousRank = Math.floor(Math.random() * 15) + 1;
    const rankChange = previousRank - (index + 1);
    const period = Math.floor(Math.random() * 10) + 1;

    return {
      id: post.id,
      name: post.title.rendered,
      // 移除HTML标签
      description: post.excerpt.rendered.replace(/<\/?[^>]+(>|$)/g, ""),
      link: post.link,
      count: post.comment_count,
      rank: index + 1,
      thumbnail: thumbnail,
      
      // 作者信息
      authorId: author?.id,
      authorName: author?.name,
      authorAvatar: author?.avatar_urls['96'],
      authorUrl: `/author/${author?.id}`,
      
      // 分类信息 - 实际实现时应从数据中获取
      category: '文章',
      categoryId: post.categories[0],
      
      // 日期信息
      date: new Date(post.date).toLocaleDateString('zh-CN'),
      
      // 详细统计
      viewCount,
      commentCount: post.comment_count,
      likeCount,
      favoriteCount,
      shareCount,
      previousRank,
      rankChange,
      period,
      score: 90 - index * 2 // 示例评分
    };
  });
};

/**
 * 将WordPress用户转换为通用RankItem格式
 * 增强版本，包含更多详细信息
 * 
 * @param users WordPress用户数组
 * @returns 格式化的RankItem数组
 */
const usersToRankItems = (users: User[]): RankItem[] => {
  return users.map((user, index) => {
    // 创建随机的统计数据
    const postCount = user.meta?.post_count || Math.floor(Math.random() * 100) + 1;
    const commentCount = user.meta?.comment_count || Math.floor(Math.random() * 500) + 10;
    const viewCount = Math.floor(Math.random() * 20000) + 1000;
    const likeCount = Math.floor(Math.random() * 800) + 50;
    const favoriteCount = Math.floor(Math.random() * 200) + 10;
    
    // 随机生成上次排名
    const previousRank = Math.floor(Math.random() * 15) + 1;
    const rankChange = previousRank - (index + 1);
    const period = Math.floor(Math.random() * 12) + 1;

    return {
      id: user.id,
      name: user.name,
      description: user.description,
      link: user.url,
      count: postCount, // 使用发帖数作为主要计数
      rank: index + 1,
      thumbnail: user.avatar_urls['96'], // 使用头像作为缩略图
      
      // 作者相关信息
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar_urls['96'],
      authorUrl: user.url,
      
      // 分类信息
      category: '用户',
      
      // 日期信息 - 注册日期，实际应从数据中获取
      date: new Date().toLocaleDateString('zh-CN'),
      
      // 详细统计
      viewCount,
      commentCount,
      likeCount,
      favoriteCount,
      previousRank,
      rankChange,
      period,
      score: 85 - index * 1.5 // 示例评分
    };
  });
};

/**
 * 将WordPress分类转换为通用RankItem格式
 * 增强版本，包含更多详细信息
 * 
 * @param categories WordPress分类数组
 * @returns 格式化的RankItem数组
 */
const categoriesToRankItems = (categories: Category[]): RankItem[] => {
  return categories.map((category, index) => {
    // 创建随机的统计数据
    const viewCount = Math.floor(Math.random() * 30000) + 2000;
    const commentCount = Math.floor(Math.random() * 1000) + 100;
    const likeCount = Math.floor(Math.random() * 500) + 30;
    const favoriteCount = Math.floor(Math.random() * 300) + 20;
    
    // 随机生成上次排名
    const previousRank = Math.floor(Math.random() * 15) + 1;
    const rankChange = previousRank - (index + 1);
    const period = Math.floor(Math.random() * 8) + 1;

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      link: category.link,
      count: category.count,
      rank: index + 1,
      
      // 分类信息
      category: '圈子',
      categoryId: category.id,
      
      // 日期信息 - 最近更新日期
      date: new Date().toLocaleDateString('zh-CN'),
      
      // 详细统计
      viewCount,
      commentCount,
      likeCount,
      favoriteCount,
      previousRank,
      rankChange,
      period,
      score: 80 - index * 1.8 // 示例评分
    };
  });
};

/**
 * 将WordPress标签转换为通用RankItem格式
 * 增强版本，包含更多详细信息
 * 
 * @param tags WordPress标签数组
 * @returns 格式化的RankItem数组
 */
const tagsToRankItems = (tags: Tag[]): RankItem[] => {
  return tags.map((tag, index) => {
    // 创建随机的统计数据
    const viewCount = Math.floor(Math.random() * 15000) + 1000;
    const commentCount = Math.floor(Math.random() * 800) + 50;
    const likeCount = Math.floor(Math.random() * 400) + 20;
    const favoriteCount = Math.floor(Math.random() * 200) + 10;
    
    // 随机生成上次排名
    const previousRank = Math.floor(Math.random() * 15) + 1;
    const rankChange = previousRank - (index + 1);
    const period = Math.floor(Math.random() * 6) + 1;

    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      link: tag.link,
      count: tag.count,
      rank: index + 1,
      
      // 分类信息
      category: '标签',
      
      // 日期信息
      date: new Date().toLocaleDateString('zh-CN'),
      
      // 详细统计
      viewCount,
      commentCount,
      likeCount,
      favoriteCount,
      previousRank,
      rankChange,
      period,
      score: 75 - index * 1.5 // 示例评分
    };
  });
};

/**
 * 自定义Hook，获取排行榜数据
 * 根据指定类型获取相应的排行榜数据
 * 
 * @version 1.0.0
 * @author UIED技术团队 (https://fsuied.com)
 * 
 * @param type 数据类型：'posts'、'users'、'categories'或'tags'
 * @param limit 数据条数限制
 * @returns 包含数据、加载状态和错误信息的对象
 */
export const useRankData = (type: 'posts' | 'users' | 'categories' | 'tags', limit = 10) => {
  const [data, setData] = useState<RankItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let result: RankItem[] = [];
        
        switch (type) {
          case 'posts':
            const posts = await getHotPosts(limit);
            result = postsToRankItems(posts);
            break;
          case 'users':
            const users = await getHotUsers(limit);
            result = usersToRankItems(users);
            break;
          case 'categories':
            const categories = await getHotCategories(limit);
            result = categoriesToRankItems(categories);
            break;
          case 'tags':
            const tags = await getHotTags(limit);
            result = tagsToRankItems(tags);
            break;
        }
        
        setData(result);
      } catch (err) {
        setError(`获取${type}数据失败: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type, limit]);

  return { data, isLoading, error };
};

export default useRankData; 