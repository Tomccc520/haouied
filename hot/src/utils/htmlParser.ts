/**
 * @file htmlParser.ts
 * @description HTML解析工具，用于从88sheji.cn网站提取产品数据
 * @copyright 版权所有 (c) 2024 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import { RankItem } from '../types';
import { load } from 'cheerio';

/**
 * 从HTML中提取产品数据
 * @param html HTML内容
 * @param category 分类名称
 * @returns 提取的产品列表
 */
export const extractProductsFromHTML = (html: string, category: string): RankItem[] => {
  try {
    console.log(`开始解析HTML内容，分类: ${category}`);
    
    // 检查HTML是否为空或无效
    if (!html || html.trim().length < 100) {
      console.error('HTML内容无效或为空');
      return [];
    }
    
    // 检查是否是我们自己应用的HTML (一个简单的特征检测)
    if (html.includes('<title>UIED热榜') && html.includes('每日更新AI资讯')) {
      console.error('检测到循环代理问题：收到的是我们自己的应用HTML，而不是目标网站');
      console.error('HTML内容片段:', html.substring(0, 500));
      
      // 尝试找出更多线索
      if (html.includes('<meta name="keywords"')) {
        const metaMatch = html.match(/<meta name="keywords"[^>]*content="([^"]*)"[^>]*>/);
        if (metaMatch) {
          console.error('Keywords元标签:', metaMatch[1]);
        }
      }
      
      return [];
    }
    
    // 保存HTML用于离线调试
    if (process.env.NODE_ENV === 'development') {
      try {
        // 在开发者控制台中使用
        (window as any).__lastHtmlResponse = html;
        console.log('HTML已保存到window.__lastHtmlResponse，可在控制台查看');
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 加载HTML内容
    const $ = load(html);
    const products: RankItem[] = [];
    
    // 调试信息
    console.log(`页面标题: ${$('title').text()}`);
    console.log(`找到工具项数量: ${$('.item-card').length}`);
    console.log(`找到列表项数量: ${$('.article-item').length}`);
    console.log(`尝试其他选择器: ${$('.tool-card').length}, ${$('.tool-list-item').length}, ${$('.site-card').length}`);
    console.log(`内容区域: ${$('.content-area').length}, ${$('#main').length}, ${$('#content').length}`);
    
    // 更多的调试信息
    console.log(`内部结构检查: ${$('.main-content article').length} 篇文章`);
    console.log(`列表容器: ${$('.article-list').length}, ${$('.post-list').length}, ${$('.site-list').length}`);
    console.log(`常用推荐元素: ${$('.products-card').length}, ${$('.products-list').length}, ${$('.sites-list').length}`);
    
    // 特殊处理changyongtuijian页面
    if (category === 'changyongtuijian') {
      console.log('处理常用推荐页面');
      
      // 检查是否有产品卡片列表
      const productCards = $('.products-card, .product-card, .site-card');
      if (productCards.length > 0) {
        console.log(`找到产品卡片: ${productCards.length}个`);
        
        productCards.each((index, element) => {
          try {
            const $el = $(element);
            
            // 提取名称
            const name = $el.find('.title, h3, .name').first().text().trim() || 
                         $el.find('a').first().text().trim();
            
            // 提取链接
            const linkEl = $el.find('a').first();
            const link = linkEl.attr('href');
            
            // 提取图片
            const imgEl = $el.find('img').first();
            const thumbnail = imgEl.attr('src') || imgEl.attr('data-src');
            
            // 提取描述
            const description = $el.find('.desc, .description, p').first().text().trim();
            
            // 生成ID
            const id = 100000 + index;
            
            // 生成随机评分和浏览量
            const score = 9.5 - (index * 0.1) + (Math.random() * 0.4 - 0.2);
            const viewCount = 8000 - (index * 500) + Math.floor(Math.random() * 1000);
            
            if (name) {
              products.push({
                id,
                name,
                link: link && link.startsWith('http') ? link : `https://www.88sheji.cn${link || ''}`,
                thumbnail: thumbnail && thumbnail.startsWith('http') ? thumbnail : `https://www.88sheji.cn${thumbnail || ''}`,
                description,
                score,
                viewCount,
                authorName: '设计导航',
                category: getCategoryName(category),
                timeAgo: generateRandomTimeAgo()
              });
            }
          } catch (err) {
            console.error('解析产品卡片出错:', err);
          }
        });
        
        if (products.length > 0) {
          console.log(`成功从常用推荐页面提取${products.length}个产品`);
          return products;
        }
      }
    }
    
    // 尝试多种选择器，以适应不同页面结构
    const selectors = [
      '.item-card', 
      '.article-item', 
      '.tool-card', 
      '.site-card',
      '.site-item',
      '.tool-list-item',
      '.list-card',
      '.post-card',
      '.post',
      'article',
      '.item',
      '.list-item',
      '.favorite-item',
      '.collection-item',
      '.card',
      '.main-content .post',
      '.article-list > li',
      '.post-list > li',
      '.site-list > li',
      '.content-area article',
      '.products-list > li',
      '.products-list .product-item',
      '.sites-list > li',
      '.sites-list .site-item'
    ];
    
    // 遍历各种可能的选择器
    let itemSelector = '';
    for (const selector of selectors) {
      const count = $(selector).length;
      if (count > 0) {
        itemSelector = selector;
        console.log(`使用选择器: ${selector}, 找到项目: ${count}个`);
        break;
      }
    }
    
    // 如果没有找到匹配的选择器，尝试查找内容区域后再查找项目
    if (!itemSelector) {
      console.warn('未找到直接匹配的选择器，尝试查找内容区域');
      
      const contentSelectors = ['.content', '#content', '.main-content', '#main', 'main', '.content-area', '.site-content'];
      
      for (const contentSelector of contentSelectors) {
        if ($(contentSelector).length > 0) {
          console.log(`找到内容区域: ${contentSelector}`);
          
          // 在内容区域内查找项目
          for (const selector of selectors) {
            const items = $(contentSelector).find(selector);
            if (items.length > 0) {
              itemSelector = `${contentSelector} ${selector}`;
              console.log(`在内容区域内找到项目: ${itemSelector}, 数量: ${items.length}个`);
              break;
            }
          }
          
          if (itemSelector) break;
        }
      }
    }
    
    // 如果仍然没有找到，尝试使用通用选择器
    if (!itemSelector) {
      console.warn('未找到匹配的选择器，尝试使用通用选择器');
      // 使用通用选择器作为后备
      itemSelector = '.card, .item, article, .list-item, .post, .site-item, li:has(h2), li:has(h3), div:has(h2):has(a), div:has(h3):has(a), div.product-item, li.product-item, div:has(img):has(a), li:has(img):has(a)';
    }
    
    // 使用选定的选择器解析列表项
    $(itemSelector).each((index, element) => {
      try {
        const $el = $(element);
        
        // 尝试提取ID（可能从href或data属性）
        const rawId = $el.attr('id') || 
                  $el.attr('data-id') || 
                  $el.attr('data-post-id') ||
                  $el.find('a').first().attr('href')?.split('/').pop() || 
                  `item-${category}-${index}`;
        
        // 确保ID是数字类型
        const id = Number(rawId.replace(/\D/g, '')) || (10000 + index);
        
        // 尝试提取名称，尝试多个选择器
        const nameSelectors = [
          '.item-title', 'h3', 'h2', '.title', '.name', 
          '.item-name', '.card-title', '.tool-name',
          'h3 a', 'h2 a', '.title a', '.post-title',
          '.entry-title', '.heading'
        ];
        
        let name = '';
        for (const selector of nameSelectors) {
          const foundName = $el.find(selector).first().text().trim();
          if (foundName) {
            name = foundName;
            break;
          }
        }
        
        // 如果还是没找到名称，尝试直接从第一个heading中提取
        if (!name) {
          name = $el.find('h1, h2, h3, h4, .title, .heading').first().text().trim();
        }
        
        // 如果仍然没有名称，使用占位符
        if (!name) {
          name = `AI${getCategoryName(category)}工具${index + 1}号`;
        }
        
        // 尝试提取链接
        const linkSelectors = [
          'a.item-link', 'a.title-link', '.item-title a', 'h3 a', 'h2 a', 
          'a', '.title a', '.card-title a', '.post-title a', '.entry-title a'
        ];
        let link = '';
        
        for (const selector of linkSelectors) {
          const href = $el.find(selector).first().attr('href');
          if (href) {
            link = href.startsWith('http') ? href : `https://www.88sheji.cn${href}`;
            break;
          }
        }
        
        // 如果元素本身是链接，则直接提取
        if (!link && $el.is('a')) {
          const href = $el.attr('href');
          if (href) {
            link = href.startsWith('http') ? href : `https://www.88sheji.cn${href}`;
          }
        }
        
        // 如果仍然没有链接，生成一个虚拟链接
        if (!link) {
          link = `https://www.88sheji.cn/favorites/${category}/${id}`;
        }
        
        // 尝试提取缩略图
        const thumbnailSelectors = [
          '.thumbnail img', '.item-image img', '.item-thumbnail img',
          '.card-image img', '.tool-image img', 'img.thumbnail', 'img',
          '.featured-image img', '.post-thumbnail img', '.entry-image img',
          '.image img', '.card-img img', '.featured img'
        ];
        
        let thumbnail = '';
        for (const selector of thumbnailSelectors) {
          const src = $el.find(selector).first().attr('src') || 
                    $el.find(selector).first().attr('data-src') ||
                    $el.find(selector).first().attr('data-lazy-src');
          if (src) {
            thumbnail = src.startsWith('http') ? src : `https://www.88sheji.cn${src}`;
            break;
          }
        }
        
        // 尝试提取描述
        const descSelectors = [
          '.item-description', '.description', '.excerpt', '.item-excerpt',
          '.card-description', '.tool-description', '.summary', 'p',
          '.entry-summary', '.post-excerpt', '.card-text', '.intro',
          '.content p', '.entry-content p'
        ];
        
        let description = '';
        for (const selector of descSelectors) {
          const desc = $el.find(selector).first().text().trim();
          if (desc && desc.length > 10) { // 只采用较长的描述
            description = desc;
            break;
          }
        }
        
        // 尝试提取评分或热度
        const scoreSelectors = [
          '.score', '.rating', '.heat', '.popularity',
          '.item-score', '.item-rating', '.stars', '.tool-score',
          '.hot-score', '.rank-score', '.upvotes', '.likes'
        ];
        
        let scoreText = '';
        for (const selector of scoreSelectors) {
          const text = $el.find(selector).first().text().trim();
          if (text) {
            scoreText = text;
            break;
          }
        }
        
        // 将评分文本转换为数字
        let score = 0;
        if (scoreText) {
          // 尝试从文本中提取数字
          const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
          if (scoreMatch) {
            score = parseFloat(scoreMatch[1]);
          }
        }
        
        // 如果评分未能提取，生成随机热度(模拟数据)
        if (!score) {
          // 生成8.5到9.8之间的随机数
          score = 8.5 + Math.random() * 1.3;
        }
        
        // 根据索引降低后面项目的分数，模拟排序效果
        score = Math.max(8.0, score - (index * 0.05));
        
        // 为前3个项目增加额外分数
        if (index < 3) {
          score += (3 - index) * 0.2;
        }
        
        // 尝试提取查看次数
        const viewCountSelectors = [
          '.views', '.view-count', '.item-views', '.popularity',
          '.eye-icon + span', '.views-count', '.tool-views',
          '.view-num', '.post-views', '.hit-count'
        ];
        
        let viewCount = 0;
        for (const selector of viewCountSelectors) {
          const viewText = $el.find(selector).first().text().trim();
          if (viewText) {
            const viewMatch = viewText.match(/(\d+)/);
            if (viewMatch) {
              viewCount = parseInt(viewMatch[1], 10);
            }
            break;
          }
        }
        
        // 如果查看次数未能提取，生成随机数
        if (!viewCount) {
          // 生成500到10000之间的随机数，且靠前的项目浏览量更高
          const baseView = 10000 - (index * 500);
          viewCount = Math.max(500, Math.floor(baseView + Math.random() * 2000));
        }
        
        // 尝试提取作者信息
        const authorNameSelectors = [
          '.author-name', '.author', '.item-author', '.by-author',
          '.post-author', '.creator', '.tool-author', '.entry-author',
          '.meta-author', '.posted-by'
        ];
        
        let authorName = '';
        for (const selector of authorNameSelectors) {
          const author = $el.find(selector).first().text().trim();
          if (author) {
            authorName = author;
            break;
          }
        }
        
        // 如果没有作者信息，使用默认作者
        if (!authorName) {
          authorName = '设计导航';
        }
        
        // 尝试提取作者头像
        const authorAvatarSelectors = [
          '.author-avatar img', '.avatar img', '.author img',
          'img.avatar', '.user-avatar img', '.author-image img'
        ];
        
        let authorAvatar = '';
        for (const selector of authorAvatarSelectors) {
          const src = $el.find(selector).first().attr('src') || 
                    $el.find(selector).first().attr('data-src');
          if (src) {
            authorAvatar = src.startsWith('http') ? src : `https://www.88sheji.cn${src}`;
            break;
          }
        }
        
        // 尝试提取日期或发布时间
        const dateSelectors = [
          '.date', '.item-date', '.publish-date', '.time',
          '.post-date', '.published', '.tool-date', '.entry-date',
          '.meta-date', '.posted-on', '.timestamp'
        ];
        
        let date = '';
        for (const selector of dateSelectors) {
          const dateText = $el.find(selector).first().text().trim();
          if (dateText) {
            date = dateText;
            break;
          }
        }
        
        // 尝试提取标签
        const tagSelectors = [
          '.tags', '.item-tags', '.categories', '.item-categories',
          '.tool-tags', '.post-tags', '.tag-list', '.entry-tags',
          '.post-categories', '.meta-tags'
        ];
        
        let tagsText = '';
        for (const selector of tagSelectors) {
          const text = $el.find(selector).text().trim();
          if (text) {
            tagsText = text;
            break;
          }
        }
        
        // 构建产品对象并添加到结果中
        if (name) {
          products.push({
            id: id,
            name: name,
            link: link,
            thumbnail: thumbnail,
            description: description,
            score: score,
            viewCount: viewCount,
            authorName: authorName,
            authorAvatar: authorAvatar,
            date: date,
            category,
            timeAgo: generateRandomTimeAgo()
          });
        }
      } catch (itemError) {
        console.error(`解析项目时出错:`, itemError);
      }
    });
    
    console.log(`成功解析 ${products.length} 个产品`);
    
    // 如果解析结果为空，生成模拟数据
    if (products.length === 0) {
      console.warn(`解析结果为空，生成模拟数据`);
      return generateMockData(category, 10);
    }
    
    return products;
  } catch (error) {
    console.error('解析HTML失败:', error);
    // 出错时返回模拟数据
    return generateMockData(category, 10);
  }
};

/**
 * 从HTML中提取分类数据
 * @param html HTML内容
 * @returns 提取的分类列表
 */
export const extractCategoriesFromHTML = (html: string): { key: string; name: string }[] => {
  try {
    // 加载HTML内容
    const $ = load(html);
    const categories: { key: string; name: string }[] = [];
    
    // 首先添加全部选项
    categories.push({ key: 'all', name: '全部' });
    
    // 尝试多种选择器，以适应不同页面结构
    const navSelectors = [
      '.nav-menu', 
      '.main-menu', 
      '.category-menu', 
      '.navbar-nav',
      '#primary-menu',
      '.header-nav',
      '.main-navigation'
    ];
    
    // 遍历各种可能的选择器
    let navSelector = '';
    for (const selector of navSelectors) {
      if ($(selector).length > 0) {
        navSelector = selector;
        console.log(`使用导航选择器: ${selector}`);
        break;
      }
    }
    
    if (navSelector) {
      // 尝试从导航菜单中提取分类
      $(navSelector).find('a').each((index, element) => {
        const $el = $(element);
        const href = $el.attr('href');
        const name = $el.text().trim();
        
        // 跳过空链接和非分类链接
        if (!href || !name || href === '#' || href === '/') {
          return;
        }
        
        // 从URL中提取key
        const key = href.split('/').filter(Boolean).pop() || '';
        if (key && key !== 'index.html' && key !== 'index.php') {
          categories.push({ key, name });
        }
      });
    }
    
    // 如果未能从导航菜单中提取到分类，尝试其他方法
    if (categories.length <= 1) {
      console.warn('未从导航菜单中找到分类，尝试其他选择器');
      
      // 尝试从标签或分类列表中提取
      const catSelectors = [
        '.categories-list a', 
        '.tag-list a', 
        '.category-list a',
        '.sidebar-categories a',
        '.tag-cloud a',
        '.widget_categories a'
      ];
      
      for (const selector of catSelectors) {
        const $cats = $(selector);
        
        if ($cats.length > 0) {
          $cats.each((index, element) => {
            const $el = $(element);
            const href = $el.attr('href');
            const name = $el.text().trim();
            
            if (!href || !name) {
              return;
            }
            
            // 从URL中提取key
            const key = href.split('/').filter(Boolean).pop() || '';
            if (key && !categories.some(cat => cat.key === key)) {
              categories.push({ key, name });
            }
          });
          
          if (categories.length > 1) {
            break;
          }
        }
      }
    }
    
    // 如果仍然没有提取到分类，返回默认分类
    if (categories.length <= 1) {
      console.warn('未能提取分类，返回默认分类');
      return [
        { key: 'all', name: '全部' },
        { key: 'ai', name: 'AI工具' },
        { key: 'aigc', name: 'AIGC' },
        { key: 'ai-xiezuo', name: 'AI写作' },
        { key: 'ai-huihua', name: 'AI绘画' },
        { key: 'ai-sheji', name: 'AI设计' },
        { key: 'ai-yingshi', name: '影视创作' }
      ];
    }
    
    console.log(`成功提取 ${categories.length} 个分类`);
    return categories;
  } catch (error) {
    console.error('解析分类失败:', error);
    // 出错时返回默认分类
    return [
      { key: 'all', name: '全部' },
      { key: 'ai', name: 'AI工具' },
      { key: 'aigc', name: 'AIGC' },
      { key: 'ai-xiezuo', name: 'AI写作' },
      { key: 'ai-huihua', name: 'AI绘画' },
      { key: 'ai-sheji', name: 'AI设计' },
      { key: 'ai-yingshi', name: '影视创作' }
    ];
  }
};

/**
 * 生成模拟数据(当数据获取失败时使用)
 * @param category 分类
 * @param count 数量
 * @returns 
 */
export const generateMockData = (category: string, count: number): RankItem[] => {
  const mockProducts: RankItem[] = [];
  
  // 根据分类生成不同的模拟数据
  const categoryName = getCategoryName(category);
  
  // 为不同分类生成不同ID范围的基数
  // 使用分类名的hashCode作为基数，确保同一分类生成相同范围的ID，不同分类生成不同范围的ID
  const categoryHashCode = getStringHashCode(category);
  const idBase = 100000 + (categoryHashCode % 900000); // 生成10万到100万之间的ID基数
  
  // 模拟AI产品名称前缀
  const productPrefixes = [
    'AI助手', 'AI大师', '智能', '神经', '深度', '超级',
    'GPT', 'Genius', 'Pro', 'Smart', 'Magic', 'Auto',
    'Brain', 'Mind', 'Copilot', 'Bot', 'Agent', 'Helper',
    'Claude', 'Midjourney', 'Stable', 'DALL-E', 'LLaMA', 'Anthropic',
    '文心一言', '通义千问', '讯飞星火', '百度', '阿里', '腾讯',
    '智谱', 'DeepSeek', '书生', '360', '网易', '新华',
    '清华', '北大', '人大', '复旦', '浙大', '中科院'
  ];
  
  // 模拟AI产品名称后缀(根据分类)
  const productSuffixes: Record<string, string[]> = {
    'ai': ['助手', '工具箱', '大师', '专家', '平台', '中心'],
    'aigc': ['生成器', '创造者', '画廊', '工厂', '实验室', '工作室'],
    'ai-xiezuo': ['写作助手', '文本生成器', '编辑器', '写作大师', '内容创作', '文案助手'],
    'ai-huihua': ['绘画工具', '画师', '图像生成', '创意画板', '艺术大师', '设计师'],
    'ai-sheji': ['设计助手', '界面生成', '设计模板', '创意工具', '设计师', 'UI生成器'],
    'ai-yingshi': ['视频助手', '剪辑师', '导演', '编辑器', '特效大师', '视频制作'],
    'hot': ['热门工具', '推荐助手', '流行应用', '热门平台'],
    'text': ['文本处理', '写作助手', '文案生成器', '内容创作'],
    'draw': ['绘画工具', '创作平台', '图像生成器', '插画大师'],
    'image': ['图像处理', '照片编辑', '图片增强', '视觉优化'],
    'video': ['视频编辑', '剪辑大师', '影像处理', '视频制作'],
    'audio': ['音频处理', '语音助手', '音效生成', '音频转写'],
    'office': ['办公助手', '效率工具', '自动化平台', '文档处理'],
    'design': ['设计工具', 'UI生成器', '创意设计', '界面设计'],
    'dev': ['编程助手', '代码生成', '开发加速', '调试工具'],
    'learn': ['学习平台', '教育助手', '知识库', '培训系统'],
    'platform': ['服务平台', '综合中心', '技术平台', '应用中心'],
    'ecommerce': ['电商助手', '营销工具', '销售平台', '运营系统']
  };
  
  const defaultSuffixes = ['助手', '工具箱', '大师', '专家', '平台', '中心'];
  
  // 根据分类选择后缀数组
  const suffixes = productSuffixes[category] || defaultSuffixes;
  
  // 模拟描述前缀
  const descPrefixes = [
    '一款强大的', '专业的', '高效的', '智能化的', '革命性的', '创新的',
    '领先的', '用户友好的', '直观的', '先进的', '便捷的', '全能的'
  ];
  
  // 模拟描述中部(根据分类)
  const descMiddles: Record<string, string[]> = {
    'ai': ['AI工具', '人工智能应用', '智能助手', 'AI平台', '智能解决方案'],
    'aigc': ['内容生成工具', 'AI创意平台', '生成式AI应用', 'AIGC解决方案'],
    'ai-xiezuo': ['AI写作工具', '内容创作助手', '文案生成器', '自动写作系统'],
    'ai-huihua': ['AI绘画工具', '图像生成器', '创意画板', 'AI艺术创作平台'],
    'ai-sheji': ['AI设计工具', '界面生成器', 'UI/UX助手', '设计自动化平台'],
    'ai-yingshi': ['视频创作工具', '影视编辑助手', '剪辑自动化工具', '影视制作平台'],
    'hot': ['热门AI工具', '流行AI应用', '热门推荐平台', '明星AI产品'],
    'text': ['文本处理工具', 'AI写作系统', '文案生成助手', '智能内容创作'],
    'draw': ['AI绘画工具', '智能绘图系统', '创意画板', '图像生成平台'],
    'image': ['图像处理工具', '照片编辑系统', '图片增强应用', '视觉处理平台'],
    'video': ['视频编辑工具', '视频制作系统', '影像处理应用', '剪辑自动化平台'],
    'audio': ['音频处理工具', '语音转换系统', '音效生成应用', '声音优化平台'],
    'office': ['办公自动化工具', '文档处理系统', '效率提升应用', '智能办公平台'],
    'design': ['设计工具', 'UI/UX生成器', '创意设计系统', '设计自动化平台'],
    'dev': ['开发辅助工具', '编程自动化系统', '代码生成应用', '智能开发平台'],
    'learn': ['在线学习平台', '知识管理系统', '教育科技应用', '智能学习助手'],
    'platform': ['综合AI平台', '技术服务中心', '一站式AI解决方案', '智能应用中心'],
    'ecommerce': ['电商工具', '营销自动化系统', '销售辅助应用', '智能运营平台']
  };
  
  const defaultMiddles = ['AI工具', '人工智能应用', '智能助手', 'AI平台'];
  
  // 根据分类选择描述中部词组
  const middles = descMiddles[category] || defaultMiddles;
  
  // 模拟描述后缀
  const descSuffixes = [
    '，为用户提供高效的解决方案。',
    '，让工作效率提升10倍。',
    '，简化复杂的任务流程。',
    '，适合各类专业人士使用。',
    '，支持多语言，功能强大。',
    '，界面友好，易于上手。'
  ];
  
  // 模拟常见AI产品标签
  const commonTags = [
    { id: 1, name: 'AI', slug: 'ai' },
    { id: 2, name: 'GPT', slug: 'gpt' },
    { id: 3, name: '神经网络', slug: 'neural-network' },
    { id: 4, name: '机器学习', slug: 'machine-learning' },
    { id: 5, name: '深度学习', slug: 'deep-learning' },
    { id: 6, name: 'NLP', slug: 'nlp' }
  ];
  
  // 分类特定标签
  const categoryTags: Record<string, {id: number; name: string; slug: string}[]> = {
    'ai': [
      { id: 7, name: '智能助手', slug: 'assistant' },
      { id: 8, name: '工具', slug: 'tool' },
      { id: 9, name: '平台', slug: 'platform' }
    ],
    'aigc': [
      { id: 10, name: '内容生成', slug: 'content-generation' },
      { id: 11, name: '创意', slug: 'creative' },
      { id: 12, name: '生成式AI', slug: 'generative-ai' }
    ],
    'ai-xiezuo': [
      { id: 13, name: '写作', slug: 'writing' },
      { id: 14, name: '内容', slug: 'content' },
      { id: 15, name: '文案', slug: 'copywriting' }
    ],
    'ai-huihua': [
      { id: 16, name: '绘画', slug: 'painting' },
      { id: 17, name: '图像', slug: 'image' },
      { id: 18, name: '艺术', slug: 'art' }
    ],
    'ai-sheji': [
      { id: 19, name: '设计', slug: 'design' },
      { id: 20, name: 'UI', slug: 'ui' },
      { id: 21, name: '模板', slug: 'template' }
    ],
    'ai-yingshi': [
      { id: 22, name: '视频', slug: 'video' },
      { id: 23, name: '编辑', slug: 'editing' },
      { id: 24, name: '影视', slug: 'film' }
    ]
  };
  
  const defaultCatTags = [
    { id: 25, name: '工具', slug: 'tool' },
    { id: 26, name: '应用', slug: 'app' }
  ];
  
  // 根据分类选择特定标签
  const catTags = categoryTags[category] || defaultCatTags;
  
  // 生成指定数量的模拟数据
  for (let i = 0; i < count; i++) {
    // 生成确定的ID（基于分类和索引）
    const id = idBase + i;
    
    // 选择一个前缀和后缀组合生成产品名称
    const prefix = productPrefixes[Math.floor(Math.random() * productPrefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const name = `${prefix}${suffix}`;
    
    // 生成描述
    const descPrefix = descPrefixes[Math.floor(Math.random() * descPrefixes.length)];
    const descMiddle = middles[Math.floor(Math.random() * middles.length)];
    const descSuffix = descSuffixes[Math.floor(Math.random() * descSuffixes.length)];
    const description = `${descPrefix}${descMiddle}${descSuffix}`;
    
    // 生成评分 - 确保前面的排名得分更高
    const baseScore = 9.8 - (i * 0.1);
    const randomOffset = Math.random() * 0.2 - 0.1; // -0.1到0.1之间的随机浮动
    const score = Math.min(9.9, Math.max(8.5, baseScore + randomOffset));
    
    // 生成浏览量 - 确保前面的排名浏览量更高
    const baseViewCount = 9000 - (i * 600);
    const randomViewOffset = Math.floor(Math.random() * 800) - 400; // -400到400之间的随机浮动
    const viewCount = Math.max(1000, baseViewCount + randomViewOffset);
    
    // 生成时间标签
    const timeAgo = generateRandomTimeAgo();
    
    // 创建产品对象
    const product: RankItem = {
      id,
      name,
      description,
      score,
      viewCount,
      category: categoryName,
      timeAgo,
      // 生成固定的链接，避免每次刷新都变
      link: `https://fsuied.com/ai-product/${category}/${id}`,
      // 基于ID生成确定性的缩略图
      thumbnail: `https://img.uied.cn/ai-images/${id % 20 + 1}.jpg`,
      // 基于ID选择确定性的作者
      authorName: ['UIED团队', '设计导航', 'AI研究员', '技术专家', '行业专栏'][id % 5],
      // 基于作者名生成确定性的头像
      authorAvatar: `https://img.uied.cn/avatars/avatar-${id % 10 + 1}.png`
    };
    
    mockProducts.push(product);
  }
  
  return mockProducts;
};

/**
 * 获取字符串的简单哈希码
 * @param str 输入字符串
 * @returns 哈希码
 */
const getStringHashCode = (str: string): number => {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash); // 确保返回正数
};

/**
 * 根据分类key获取分类名称
 */
const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'ai': 'AI工具',
    'aigc': 'AIGC',
    'ai-xiezuo': 'AI写作',
    'ai-huihua': 'AI绘画',
    'ai-sheji': 'AI设计',
    'ai-yingshi': '影视创作',
    'design': '设计工具',
    'code': '开发工具',
    'material': '素材资源',
    'social': '社交创作',
    'hot': '热门推荐',
    'text': 'AI文本工具',
    'draw': 'AI绘画工具',
    'image': 'AI图片工具',
    'video': 'AI视频工具',
    'audio': 'AI音频工具',
    'office': 'AI办公工具',
    'dev': 'AI开发工具',
    'learn': 'AI学习平台',
    'platform': 'AI平台网站',
    'ecommerce': 'AI电商工具'
  };
  
  return categoryMap[category] || 'AI工具';
};

/**
 * 生成随机时间段
 */
const generateRandomTimeAgo = (): string => {
  const units = ['分钟', '小时', '天', '周', '个月'];
  const unit = units[Math.floor(Math.random() * 3)]; // 偏向于更近的时间单位
  
  let value: number;
  switch (unit) {
    case '分钟':
      value = Math.floor(5 + Math.random() * 55);
      break;
    case '小时':
      value = Math.floor(1 + Math.random() * 23);
      break;
    case '天':
      value = Math.floor(1 + Math.random() * 6);
      break;
    case '周':
      value = Math.floor(1 + Math.random() * 3);
      break;
    case '个月':
      value = Math.floor(1 + Math.random() * 5);
      break;
    default:
      value = Math.floor(1 + Math.random() * 10);
  }
  
  return `${value}${unit}`;
}; 