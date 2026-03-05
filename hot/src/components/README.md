# 跨域解决方案

## 概述

本项目使用了以下技术解决本地开发环境中的跨域问题：

1. Create React App 的代理功能
2. http-proxy-middleware 中间件
3. 自定义API服务和图片组件

## 代理配置

代理配置在 `src/setupProxy.js` 文件中，包含了以下代理规则：

- `/wp-json` - WordPress REST API代理
- `/wp-content` - 主站图片资源代理
- `/img` - img子域名图片资源代理
- `/static` - 静态资源代理

## API服务

API服务在 `src/services/api.ts` 文件中，根据环境自动使用正确的URL：

```typescript
// 判断环境，开发环境使用代理，生产环境直接访问
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE = isDevelopment ? '' : 'https://www.uied.cn';
const API_BASE_URL = `${API_BASE}/wp-json/wp/v2`;
```

## 安全图片组件

使用 `SafeImage` 组件来处理图片跨域问题：

```jsx
import SafeImage from './SafeImage';

// 使用方式
<SafeImage
  src="https://img.uied.cn/path/to/image.jpg"
  alt="图片描述"
  className="my-image"
  fallbackSrc="/default-image.png"
/>
```

## 在组件中使用

修改任何使用图片的组件，用 `SafeImage` 替换 `<img>` 标签：

```jsx
// 之前
<img 
  src={item.thumbnailUrl} 
  alt={item.name}
  onError={handleImageError} 
/>

// 之后
<SafeImage 
  src={item.thumbnailUrl} 
  alt={item.name}
  fallbackSrc="/default-image.png"
/>
```

同时，确保API请求使用 `api.ts` 中的方法：

```jsx
import { getHotPosts, getHotUsers, getHotCategories } from '../services/api';

// 在组件中使用
useEffect(() => {
  const fetchData = async () => {
    const posts = await getHotPosts(10);
    setData(posts);
  };
  
  fetchData();
}, []);
```

## 生产环境

在生产环境部署时，代理配置会被忽略，API请求将直接访问目标服务器。确保服务器端设置了正确的CORS头信息。 