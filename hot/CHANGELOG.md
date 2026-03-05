# UIED 热榜更新日志

本文档记录 UIED 热榜组件的更新历史和 bug 修复记录。

## [1.0.1] - 2024-03-xx

### Bug 修复
- 🐛 修复了 `selectedCategoryId` 类型不匹配问题
  - 将 `null` 类型改为 `undefined`
  - 影响文件：`AntRankingPage.tsx`
  - 相关函数：`handleTabChange`, `handleBackToCategories`
- 🐛 修复了分类文章加载失败的问题
  - 添加了默认分类 ID
  - 优化了分类切换逻辑

### 功能优化
- ⚡️ 优化了数据加载和缓存逻辑
  - 使用 `useMemo` 优化 `currentCategoryId` 计算
  - 优化了 `currentDataType` 的确定逻辑
- 🔄 改进了状态管理
  - 优化了 `handleSubFilterChange` 函数
  - 添加了更多的状态检查

### 待解决问题
- [ ] 需要优化图片加载失败时的处理
- [ ] 考虑添加更多的错误重试机制
- [ ] 可能需要优化缓存策略
- [ ] 考虑添加更多的加载状态反馈

## [1.0.0] - 2024-03-xx

### 初始功能
- ✨ 实现基础的热榜展示功能
- 📱 支持响应式布局
- 🎨 实现了自定义主题和样式
- 🔄 支持数据刷新和缓存
- 📊 支持多种数据展示模式

### 主要功能
- 最新文章展示
- 热门分类浏览
- 热门文章排行
- 设计素材分类
- 活跃作者榜单

### 已知问题
- [ ] 需要优化首次加载速度
- [ ] 需要完善错误处理机制
- [ ] 可能需要添加更多的自定义选项

## Bug 跟踪记录

### 已修复
1. [2024-03-xx] TypeScript 类型错误
   - 问题：`selectedCategoryId` 使用 `null` 导致类型不匹配
   - 状态：✅ 已修复
   - 解决方案：将类型改为 `number | undefined`

2. [2024-03-xx] 分类文章加载失败
   - 问题：分类切换时未正确传递 categoryId
   - 状态：✅ 已修复
   - 解决方案：优化了分类 ID 的处理逻辑

### 待修复
1. 图片加载优化
   - 问题：部分图片加载失败时的处理不够优雅
   - 优先级：中
   - 建议：添加更好的占位图和重试机制

2. 缓存策略优化
   - 问题：当前缓存策略可能需要进一步优化
   - 优先级：低
   - 建议：考虑使用更复杂的缓存机制

## 开发注意事项

### 类型定义
- 使用 `undefined` 而不是 `null` 作为可选值
- 确保所有状态都有正确的类型定义
- 使用 TypeScript 的严格模式

### 状态管理
- 使用 `useMemo` 和 `useCallback` 优化性能
- 注意状态更新的顺序和依赖关系
- 避免不必要的状态更新

### 数据处理
- 注意数据加载的错误处理
- 实现适当的重试机制
- 优化数据缓存策略

### UI/UX
- 确保良好的加载状态展示
- 提供清晰的错误反馈
- 保持响应式布局的一致性

## 后续计划

### 短期目标
- [ ] 完善错误处理机制
- [ ] 优化图片加载体验
- [ ] 改进缓存策略

### 中期目标
- [ ] 添加更多的自定义选项
- [ ] 优化性能和加载速度
- [ ] 增加更多的数据展示方式

### 长期目标
- [ ] 支持更多的数据源
- [ ] 添加更多的交互功能
- [ ] 提供更多的主题选项

## [1.0.2] - 2024-03-xx

### Bug 修复
- 🐛 修复 QQ 头像跨域访问问题
  - 问题：访问 QQ 头像时出现 CORS 错误
  - 解决方案：通过 Nginx 代理转发请求
  - 影响文件：`nginx.conf`

### Nginx 配置参考
```nginx
# QQ头像代理配置
location /qqavatar/ {
    proxy_pass https://thirdqq.qlogo.cn/;
    proxy_set_header Host thirdqq.qlogo.cn;
    proxy_set_header Referer https://thirdqq.qlogo.cn;
    proxy_set_header User-Agent $http_user_agent;
    
    # 添加跨域头
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, OPTIONS';
    add_header Access-Control-Allow-Headers '*';
    
    # 缓存配置
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    proxy_cache_valid 200 304 7d;
    expires 7d;
    
    # 错误处理
    proxy_intercept_errors on;
    error_page 404 500 502 503 504 = @fallback;
}

# 头像加载失败后的降级处理
location @fallback {
    return 302 /assets/images/default-avatar.png;
}
```

## [1.0.3] - 2024-03-11

### 安全性改进
- 🔒 增强了 API 安全性
  - 添加了 `uied_simple_rate_limit` 函数实现请求限制
  - 每个 IP 每分钟最多 100 次请求
  - 使用 WordPress 缓存系统存储请求计数
  - 添加了 Referer 检查机制
    - 仅允许指定域名的请求访问
    - 支持多域名白名单配置
    - 可通过 `UIED_ALLOWED_DOMAINS` 常量配置
- 🛡️ 优化了数据缓存策略
  - 热门文章: 15分钟缓存
  - 最新文章: 5分钟缓存
  - 用户数据: 30分钟缓存
  - 分类数据: 1小时缓存
- 🔐 添加了安全响应头
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
- 🧹 增强了数据过滤
  - 使用 wp_strip_all_tags 清理 HTML
  - 使用 strip_shortcodes 移除短代码
  - 使用正则表达式安全提取图片 URL

### 待优化项目
- [ ] 考虑添加 nonce 验证
- [x] 实现 API 访问来源限制
- [ ] 添加用户权限检查机制
- [ ] 实现 API 调用日志记录

### 配置说明
```php
// 配置允许访问的域名白名单
define('UIED_ALLOWED_DOMAINS', [
    'hot.uied.cn',              // 热榜正式域名
    'uied.cn',                  // 主站域名
    'localhost:3000'            // 开发环境
]);

// Referer 检查函数示例
function uied_check_referer() {
    // 获取请求来源
    $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    if (empty($referer)) {
        return new WP_Error(
            'invalid_referer',
            '未授权的访问来源',
            array('status' => 403)
        );
    }

    // 检查是否来自允许的域名
    $allowed = false;
    foreach (UIED_ALLOWED_DOMAINS as $domain) {
        if (strpos($referer, $domain) !== false) {
            $allowed = true;
            break;
        }
    }

    if (!$allowed) {
        return new WP_Error(
            'invalid_referer',
            '未授权的访问来源',
            array('status' => 403)
        );
    }

    return true;
}
```

### Bug 修复
- 🐛 修复了 `selectedCategoryId` 类型不匹配问题
  - 将 `null` 类型改为 `undefined`
  - 影响文件：`AntRankingPage.tsx`
  - 相关函数：`handleTabChange`, `handleBackToCategories`
- 🐛 修复了分类文章加载失败的问题
  - 添加了默认分类 ID
  - 优化了分类切换逻辑

### 功能优化
- ⚡️ 优化了数据加载和缓存逻辑
  - 使用 `useMemo` 优化 `currentCategoryId` 计算
  - 优化了 `currentDataType` 的确定逻辑
- 🔄 改进了状态管理
  - 优化了 `handleSubFilterChange` 函数
  - 添加了更多的状态检查

### 待解决问题
- [ ] 需要优化图片加载失败时的处理
- [ ] 考虑添加更多的错误重试机制
- [ ] 可能需要优化缓存策略
- [ ] 考虑添加更多的加载状态反馈

### 初始功能
- ✨ 实现基础的热榜展示功能
- 📱 支持响应式布局
- 🎨 实现了自定义主题和样式
- 🔄 支持数据刷新和缓存
- 📊 支持多种数据展示模式

### 主要功能
- 最新文章展示
- 热门分类浏览
- 热门文章排行
- 设计素材分类
- 活跃作者榜单

### 已知问题
- [ ] 需要优化首次加载速度
- [ ] 需要完善错误处理机制
- [ ] 可能需要添加更多的自定义选项

### 已修复
1. [2024-03-xx] TypeScript 类型错误
   - 问题：`selectedCategoryId` 使用 `null` 导致类型不匹配
   - 状态：✅ 已修复
   - 解决方案：将类型改为 `number | undefined`

2. [2024-03-xx] 分类文章加载失败
   - 问题：分类切换时未正确传递 categoryId
   - 状态：✅ 已修复
   - 解决方案：优化了分类 ID 的处理逻辑

### 待修复
1. 图片加载优化
   - 问题：部分图片加载失败时的处理不够优雅
   - 优先级：中
   - 建议：添加更好的占位图和重试机制

2. 缓存策略优化
   - 问题：当前缓存策略可能需要进一步优化
   - 优先级：低
   - 建议：考虑使用更复杂的缓存机制

### 待解决问题
- [ ] 需要优化首次加载速度
- [ ] 需要完善错误处理机制
- [ ] 可能需要添加更多的自定义选项

### 待优化项目
- [ ] 考虑添加 nonce 验证
- [ ] 实现 API 访问来源限制
- [ ] 添加用户权限检查机制
- [ ] 实现 API 调用日志记录

### 安全性改进
- 🔒 增强了 API 安全性
  - 添加了 `uied_simple_rate_limit` 函数实现请求限制
  - 每个 IP 每分钟最多 100 次请求
  - 使用 WordPress 缓存系统存储请求计数
  - 添加了 Referer 检查机制
    - 仅允许指定域名的请求访问
    - 支持多域名白名单配置
    - 可通过 `UIED_ALLOWED_DOMAINS` 常量配置
- 🛡️ 优化了数据缓存策略
  - 热门文章: 15分钟缓存
  - 最新文章: 5分钟缓存
  - 用户数据: 30分钟缓存
  - 分类数据: 1小时缓存
- 🔐 添加了安全响应头
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
- 🧹 增强了数据过滤
  - 使用 wp_strip_all_tags 清理 HTML
  - 使用 strip_shortcodes 移除短代码
  - 使用正则表达式安全提取图片 URL

### 待优化项目
- [ ] 考虑添加 nonce 验证
- [ ] 实现 API 访问来源限制
- [ ] 添加用户权限检查机制
- [ ] 实现 API 调用日志记录

### 配置说明
```php
// 配置允许访问的域名白名单
define('UIED_ALLOWED_DOMAINS', [
    'hot.uied.cn',              // 热榜正式域名
    'uied.cn',                  // 主站域名
    'localhost:3000'            // 开发环境
]);

// Referer 检查函数示例
function uied_check_referer() {
    // 获取请求来源
    $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    if (empty($referer)) {
        return new WP_Error(
            'invalid_referer',
            '未授权的访问来源',
            array('status' => 403)
        );
    }

    // 检查是否来自允许的域名
    $allowed = false;
    foreach (UIED_ALLOWED_DOMAINS as $domain) {
        if (strpos($referer, $domain) !== false) {
            $allowed = true;
            break;
        }
    }

    if (!$allowed) {
        return new WP_Error(
            'invalid_referer',
            '未授权的访问来源',
            array('status' => 403)
        );
    }

    return true;
}
```
```