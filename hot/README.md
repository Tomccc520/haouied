# UIED热榜

这是一个基于React的应用，用于展示UIED WordPress网站(https://www.uied.cn)的热门内容、用户和话题的排行榜。该应用可以部署为WordPress网站的子域名，提供直观的热榜功能。

**版本**: 1.0.0  
**开发**: [UIED技术团队](https://fsuied.com)

## 功能特点

- **热门文章排行榜**: 展示最受欢迎的文章，根据评论数和浏览量排名
- **活跃用户排行榜**: 展示最活跃的社区用户，根据发布文章数和交互频率排名
- **热门圈子排行榜**: 展示最受欢迎的分类/圈子，根据文章数和活跃度排名
- **热门标签排行榜**: 展示最常用的标签，发现热门话题
- **动态WordPress集成**: 可自动获取WordPress站点信息和导航菜单
- **响应式设计**: 适配各种屏幕尺寸，提供移动端和桌面端的良好体验

## 技术栈

- React 18
- TypeScript
- React Router v6（路由管理）
- Material-UI（UI组件库）
- Axios（API请求）

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

## 配置WordPress REST API

要使此应用正常工作，您需要配置您的WordPress网站提供必要的API端点：

1. 确保WordPress REST API已启用（默认情况下WordPress 4.7+已启用）
2. 应用已配置为使用 https://www.uied.cn 的API端点
3. 对于自定义数据（如热门用户和菜单），建议安装以下WordPress插件：
   - WP API Menus: 提供菜单API端点
   - Custom REST API: 用于创建自定义端点获取热门用户数据

## 部署到子域名

1. 运行`npm run build`生成静态文件
2. 将生成的`build`目录中的文件上传到您的Web服务器
3. 配置Web服务器，将子域名（如`hot.uied.cn`）指向上传的文件目录
4. 确保配置了适当的CORS设置，允许热榜应用与主WordPress网站之间的通信

## 自定义

- 修改`src/styles/theme.ts`文件自定义应用的主题颜色和样式
- 在`src/components`目录中修改各个组件以适应您的需求
- 如需更改API端点，请编辑`src/services/api.ts`文件

## 跨域图片处理方案

为解决WordPress媒体图片的跨域(CORS)问题，本项目采用了以下方案：

### 1. 图片加载属性设置

在`AntRankingPage.tsx`中，为图片元素添加以下属性：

```jsx
<img 
  src={getProxyImageUrl(item.thumbnail)} 
  alt={item.name || '文章缩略图'}
  onError={handleImageError}
  loading="lazy" 
  decoding="async"
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
/>
```

关键属性说明：
- `crossOrigin="anonymous"` - 使CORS请求不携带凭证
- `referrerPolicy="no-referrer"` - 不发送Referer头，避免来源检查
- `loading="lazy"` - 实现图片懒加载，提高性能
- `decoding="async"` - 异步解码图片，不阻塞主线程

### 2. 错误处理机制

当图片加载失败时，使用`handleImageError`函数提供优雅降级：
- 显示SVG图标作为替代内容
- 应用适合分类的背景颜色
- 显示友好的错误提示

### 3. CSS样式优化

```css
.thumbnail-container {
  width: 6rem;
  height: 4.5rem;
  background-color: var(--secondary-color);
  /* 其他样式 */
}

.thumbnail-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-error {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  /* 其他样式 */
}
```

### 4. 服务器端设置

确保WordPress媒体服务器(img.uied.cn)配置了正确的CORS响应头：
```
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, HEAD
Access-Control-Expose-Headers: Authorization, x-cos-request-id
Access-Control-Max-Age: 3000
```

## API端点说明

应用使用以下WordPress REST API端点：

- `/wp-json`: 获取站点基本信息
- `/wp-json/wp/v2/posts`: 获取文章数据
- `/wp-json/wp/v2/users`: 获取用户数据
- `/wp-json/wp/v2/categories`: 获取分类数据
- `/wp-json/wp/v2/tags`: 获取标签数据
- `/wp-json/menus/v1/menus/main-menu`: 获取导航菜单（需安装WP API Menus插件）

## 更新日志

### 1.0.0 (2025-03-08)
- 初始版本发布
- 实现热门文章、用户、圈子和标签排行榜
- 添加动态WordPress数据获取功能
- 响应式UI设计

## 许可证

MIT许可证

# UIED WordPress热榜API

这个文件夹包含UIED.cn网站的WordPress子主题API，主要提供热榜数据接口，用于前端React应用消费。

## 文件说明

- `functions.php` - WordPress子主题的主要函数文件，包含所有自定义API端点定义

## API端点说明

所有API端点都使用自定义命名空间 `uied/v1`，完整的API基础URL为：`https://www.uied.cn/wp-json/uied/v1`

### 热门文章API

- 端点: `/hot-posts`
- 方法: GET
- 参数:
  - `per_page`: 每页数量，默认10
  - `page`: 页码，默认1
  - `category_id`: 可选的分类ID筛选

### 热门用户API

- 端点: `/hot-users`
- 方法: GET
- 参数:
  - `per_page`: 每页数量，默认10
  - `page`: 页码，默认1

### 热门分类API

- 端点: `/hot-categories`
- 方法: GET
- 参数:
  - `per_page`: 每页数量，默认10

### 热门标签API

- 端点: `/hot-tags`
- 方法: GET
- 参数:
  - `per_page`: 每页数量，默认10

### 最新文章API

- 端点: `/latest-posts`
- 方法: GET
- 参数:
  - `per_page`: 每页数量，默认10
  - `page`: 页码，默认1

### 分类文章API

- 端点: `/category-posts/{id}`
- 方法: GET
- 参数:
  - `id`: 分类ID（必填，路径参数）
  - `per_page`: 每页数量，默认10
  - `page`: 页码，默认1
  - `orderby`: 排序字段，默认'date'

## 前端集成

这些API端点被前端React应用（wordpress-hotlist）通过以下文件消费：

- `src/services/wordpress-api.ts` - API调用服务
- `src/hooks/useWordPressData.ts` - React Hook用于数据获取

## 安装说明

1. 将`functions.php`文件放置在WordPress主题目录下的子主题文件夹中：`wp-content/themes/uied-child/`
2. 确保子主题已经激活
3. 测试API是否可用：访问 `https://www.uied.cn/wp-json/uied/v1/hot-posts`

## 注意事项

- 部分API数据（如浏览量、点赞数）使用随机数模拟，实际应用中应修改为从真实数据源获取
- API返回的数据结构统一为：`{items: [], total: 0, totalPages: 0, page: 1, perPage: 10}` 