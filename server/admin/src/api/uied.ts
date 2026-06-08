/**
 * @file api/uied.ts
 * @description UIED 业务 API 接口
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

import request from '@/utils/request'

// ==================== 分类管理 ====================

// 分类列表（分页）
export function uiedCategoryList(params?: any) {
    return request.get({ url: '/uied/category/list', params })
}

// 分类列表（全部）
export function uiedCategoryAll(params?: any) {
    return request.get({ url: '/uied/category/all', params })
}

// 分类详情
export function uiedCategoryDetail(params: any) {
    return request.get({ url: '/uied/category/detail', params })
}

// 添加分类
export function uiedCategoryAdd(params: any) {
    return request.post({ url: '/uied/category/add', params })
}

// 编辑分类
export function uiedCategoryEdit(params: any) {
    return request.post({ url: '/uied/category/edit', params })
}

// 删除分类
export function uiedCategoryDelete(params: any) {
    return request.post({ url: '/uied/category/del', params })
}

// 分类排序
export function uiedCategorySort(params: any) {
    return request.post({ url: '/uied/category/sort', params })
}

// ==================== 网站管理 ====================

// 网站列表
export function uiedWebsiteList(params?: any) {
    return request.get({ url: '/uied/website/list', params })
}

// 网站详情
export function uiedWebsiteDetail(params: any) {
    return request.get({ url: '/uied/website/detail', params })
}

// 添加网站
export function uiedWebsiteAdd(params: any) {
    return request.post({ url: '/uied/website/add', params })
}

// 编辑网站
export function uiedWebsiteEdit(params: any) {
    return request.post({ url: '/uied/website/edit', params })
}

// 校验网址是否重复
export function uiedWebsiteCheckDuplicateUrl(params: any) {
    return request.get({ url: '/uied/website/checkDuplicateUrl', params })
}

// 批量导入网址
export function uiedWebsiteBatchImport(params: any) {
    /**
     * 批量导入可能触发 SEO 抓取与 AI 生成，单次耗时较长。
     * 这里单独放宽超时，避免“后端已成功但前端 10s 超时报错”。
     */
    return request.post(
        {
            url: '/uied/website/batchImport',
            params,
            timeout: 5 * 60 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// 批量 AI 生成网站详情正文
export function uiedWebsiteBatchGenerateDetailContent(params: any) {
    /**
     * 批量 AI 生成正文会按网站逐条调用模型接口，耗时受模型响应影响较大。
     * 单独放宽请求超时，降低误报超时风险。
     */
    return request.post(
        {
            url: '/uied/website/batchGenerateDetailContent',
            params,
            timeout: 5 * 60 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// 批量处理网站权重标签
export function uiedWebsiteBatchWeightTags(params: any) {
    return request.post({ url: '/uied/website/batchWeightTags', params })
}

// 批量移动网站分类/标签
export function uiedWebsiteBatchMove(params: any) {
    return request.post({ url: '/uied/website/batchMove', params })
}

// 删除网站
export function uiedWebsiteDelete(params: any) {
    return request.post({ url: '/uied/website/del', params })
}

// 批量删除网站
export function uiedWebsiteBatchDelete(params: any) {
    return request.post({ url: '/uied/website/batchDel', params })
}

// 恢复网站
export function uiedWebsiteRestore(params: any) {
    return request.post({ url: '/uied/website/restore', params })
}

// 批量恢复网站
export function uiedWebsiteBatchRestore(params: any) {
    return request.post({ url: '/uied/website/batchRestore', params })
}

// 彻底删除网站
export function uiedWebsiteRealDelete(params: any) {
    return request.post({ url: '/uied/website/realDelete', params })
}

// 批量彻底删除网站
export function uiedWebsiteBatchRealDelete(params: any) {
    return request.post({ url: '/uied/website/batchRealDelete', params })
}

// 一键清空网站回收站（支持筛选条件）
export function uiedWebsiteRecycleClear(params?: any) {
    return request.post({ url: '/uied/website/recycle/clear', params: params || {} })
}

// 网站点击统计
export function uiedWebsiteClick(params: any) {
    return request.post({ url: '/uied/website/click', params })
}

// 网站搜索
export function uiedWebsiteSearch(params?: any) {
    return request.get({ url: '/uied/website/search', params })
}

// ==================== MCP中心 ====================

// MCP列表
export function uiedMcpList(params?: any) {
    return request.get({ url: '/uied/mcp/list', params })
}

// MCP详情
export function uiedMcpDetail(params: any) {
    return request.get({ url: '/uied/mcp/detail', params })
}

// 添加MCP
export function uiedMcpAdd(params: any) {
    return request.post({ url: '/uied/mcp/add', params })
}

// 编辑MCP
export function uiedMcpEdit(params: any) {
    return request.post({ url: '/uied/mcp/edit', params })
}

// 删除MCP
export function uiedMcpDelete(params: any) {
    return request.post({ url: '/uied/mcp/del', params })
}

// MCP分类列表
export function uiedMcpCategoryList(params?: any) {
    return request.get({ url: '/uied/mcp/category/list', params })
}

// MCP分类全量
export function uiedMcpCategoryAll(params?: any) {
    return request.get({ url: '/uied/mcp/category/all', params })
}

// 添加MCP分类
export function uiedMcpCategoryAdd(params: any) {
    return request.post({ url: '/uied/mcp/category/add', params })
}

// 编辑MCP分类
export function uiedMcpCategoryEdit(params: any) {
    return request.post({ url: '/uied/mcp/category/edit', params })
}

// 删除MCP分类
export function uiedMcpCategoryDelete(params: any) {
    return request.post({ url: '/uied/mcp/category/del', params })
}

// MCP标签列表
export function uiedMcpTagList(params?: any) {
    return request.get({ url: '/uied/mcp/tag/list', params })
}

// MCP标签全量
export function uiedMcpTagAll(params?: any) {
    return request.get({ url: '/uied/mcp/tag/all', params })
}

// 添加MCP标签
export function uiedMcpTagAdd(params: any) {
    return request.post({ url: '/uied/mcp/tag/add', params })
}

// 编辑MCP标签
export function uiedMcpTagEdit(params: any) {
    return request.post({ url: '/uied/mcp/tag/edit', params })
}

// 删除MCP标签
export function uiedMcpTagDelete(params: any) {
    return request.post({ url: '/uied/mcp/tag/del', params })
}

// ==================== Figma插件中心 ====================

// Figma插件列表
export function uiedFigmaList(params?: any) {
    return request.get({ url: '/uied/figma/list', params })
}

// Figma插件详情
export function uiedFigmaDetail(params: any) {
    return request.get({ url: '/uied/figma/detail', params })
}

// 添加Figma插件
export function uiedFigmaAdd(params: any) {
    return request.post({ url: '/uied/figma/add', params })
}

// 编辑Figma插件
export function uiedFigmaEdit(params: any) {
    return request.post({ url: '/uied/figma/edit', params })
}

// 删除Figma插件
export function uiedFigmaDelete(params: any) {
    return request.post({ url: '/uied/figma/del', params })
}

// Figma插件分类列表
export function uiedFigmaCategoryList(params?: any) {
    return request.get({ url: '/uied/figma/category/list', params })
}

// Figma插件分类全量
export function uiedFigmaCategoryAll(params?: any) {
    return request.get({ url: '/uied/figma/category/all', params })
}

// 初始化Figma官方分类
export function uiedFigmaCategoryInitOfficial(params?: any) {
    return request.post({ url: '/uied/figma/category/initOfficial', params: params || {} })
}

// 添加Figma插件分类
export function uiedFigmaCategoryAdd(params: any) {
    return request.post({ url: '/uied/figma/category/add', params })
}

// 编辑Figma插件分类
export function uiedFigmaCategoryEdit(params: any) {
    return request.post({ url: '/uied/figma/category/edit', params })
}

// 删除Figma插件分类
export function uiedFigmaCategoryDelete(params: any) {
    return request.post({ url: '/uied/figma/category/del', params })
}

// Figma插件标签列表
export function uiedFigmaTagList(params?: any) {
    return request.get({ url: '/uied/figma/tag/list', params })
}

// Figma插件标签全量
export function uiedFigmaTagAll(params?: any) {
    return request.get({ url: '/uied/figma/tag/all', params })
}

// 添加Figma插件标签
export function uiedFigmaTagAdd(params: any) {
    return request.post({ url: '/uied/figma/tag/add', params })
}

// 编辑Figma插件标签
export function uiedFigmaTagEdit(params: any) {
    return request.post({ url: '/uied/figma/tag/edit', params })
}

// 删除Figma插件标签
export function uiedFigmaTagDelete(params: any) {
    return request.post({ url: '/uied/figma/tag/del', params })
}

// 批量为无标签插件自动补全标签
export function uiedFigmaTagAutoFill(params?: any) {
    return request.post(
        {
            url: '/uied/figma/tag/autoTagMissing',
            params: params || {},
            timeout: 3 * 60 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// 批量补全 Figma 插件“用户量/关注量”
export function uiedFigmaRefreshMissingStats(params?: any) {
    return request.post(
        {
            url: '/uied/figma/stats/refreshMissing',
            params: params || {},
            timeout: 4 * 60 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// 从 Figma 官方社区采集插件
export function uiedFigmaImportOfficial(params: any) {
    return request.post(
        {
            url: '/uied/figma/importOfficial',
            params,
            timeout: 3 * 60 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// Figma插件推荐审核列表
export function uiedFigmaRecommendList(params?: any) {
    return request.get({ url: '/uied/figma/recommend/list', params })
}

// Figma插件推荐审核详情
export function uiedFigmaRecommendDetail(params: any) {
    return request.get({ url: '/uied/figma/recommend/detail', params })
}

// Figma插件推荐审核通过
export function uiedFigmaRecommendApprove(params: any) {
    return request.post({ url: '/uied/figma/recommend/approve', params })
}

// Figma插件推荐审核拒绝
export function uiedFigmaRecommendReject(params: any) {
    return request.post({ url: '/uied/figma/recommend/reject', params })
}

// 删除Figma插件推荐记录
export function uiedFigmaRecommendDelete(params: any) {
    return request.post({ url: '/uied/figma/recommend/del', params })
}

// 网站标签（全部）
export function uiedWebsiteTagAll() {
    return request.get({ url: '/uied/websiteTag/all' })
}

// 刷新/获取网站预览截图（前台公开接口，后台编辑页复用）
export function uiedWebsitePreviewSnapshot(websiteId: number | string, params?: any) {
    return request.get({ url: `/websites/${websiteId}/preview-snapshot`, params })
}

// ==================== 页面管理 ====================

// 页面列表（分页）
export function uiedPageList(params?: any) {
    return request.get({ url: '/uied/page/list', params })
}

// 页面列表（全部）
export function uiedPageAll(params?: any) {
    return request.get({ url: '/uied/page/all', params })
}

// 页面详情
export function uiedPageDetail(params: any) {
    return request.get({ url: '/uied/page/detail', params })
}

// 添加页面
export function uiedPageAdd(params: any) {
    return request.post({ url: '/uied/page/add', params })
}

// 编辑页面
export function uiedPageEdit(params: any) {
    return request.post({ url: '/uied/page/edit', params })
}

// 删除页面
export function uiedPageDelete(params: any) {
    return request.post({ url: '/uied/page/del', params })
}

// 获取页面分类
export function uiedPageCategories(params: any) {
    return request.get({ url: '/uied/page/categories', params })
}

// 更新页面分类
export function uiedPageUpdateCategories(params: any) {
    return request.post({ url: '/uied/page/updateCategories', params })
}

// ==================== 热门推荐 ====================

// 热门推荐列表
export function uiedHotRecommendationList(params?: any) {
    return request.get({ url: '/uied/hotRecommendation/list', params })
}

// 热门推荐详情
export function uiedHotRecommendationDetail(params: any) {
    return request.get({ url: '/uied/hotRecommendation/detail', params })
}

// 添加热门推荐
export function uiedHotRecommendationAdd(params: any) {
    return request.post({ url: '/uied/hotRecommendation/add', params })
}

// 编辑热门推荐
export function uiedHotRecommendationEdit(params: any) {
    return request.post({ url: '/uied/hotRecommendation/edit', params })
}

// 删除热门推荐
export function uiedHotRecommendationDelete(params: any) {
    return request.post({ url: '/uied/hotRecommendation/del', params })
}

// ==================== 站点设置 ====================

// 获取设置
export function uiedSettingGet(params?: any) {
    return request.get({ url: '/uied/setting/get', params })
}

// 保存设置
export function uiedSettingSave(params: any) {
    return request.post({ url: '/uied/setting/save', params })
}

// ==================== SEO 中心 ====================

// 获取 SEO 中心总览
export function uiedSeoCenterOverview() {
    return request.get({ url: '/uied/setting/get/seoCenter/overview' })
}

// 获取 SEO 中心配置
export function uiedSeoCenterConfigGet() {
    return request.get({ url: '/uied/setting/get/seoCenter/config' })
}

// 保存 SEO 中心配置
export function uiedSeoCenterConfigSave(params: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/config', params })
}

// 预览 robots.txt
export function uiedSeoCenterRobotsPreview(params?: any) {
    return request.get({ url: '/uied/setting/get/seoCenter/robots/preview', params })
}

// 预览基础 sitemap.xml
export function uiedSeoCenterSitemapBasicPreview(params?: any) {
    return request.get({ url: '/uied/setting/get/seoCenter/sitemap/basic/preview', params })
}

// 预览进阶 sitemap 索引
export function uiedSeoCenterSitemapAdvancedPreview(params?: any) {
    return request.get({ url: '/uied/setting/get/seoCenter/sitemap/advanced/preview', params })
}

// 预览进阶 sitemap 子文件
export function uiedSeoCenterSitemapAdvancedFilePreview(params: any) {
    return request.get({ url: '/uied/setting/get/seoCenter/sitemap/advanced/file', params })
}

// 获取 404 日志
export function uiedSeoCenterLogs404() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/404' })
}

// 获取失效 URL 日志
export function uiedSeoCenterLogsInvalid() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/invalid' })
}

// 获取进阶链接检测日志
export function uiedSeoCenterLogsLinkDetector() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/link-detector' })
}

// 获取图片优化日志
export function uiedSeoCenterLogsImageOptimization() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/image-optimization' })
}

// 获取站长推送日志
export function uiedSeoCenterLogsPush() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/push' })
}

// 获取自动任务日志
export function uiedSeoCenterLogsAutoTask() {
    return request.get({ url: '/uied/setting/get/seoCenter/logs/auto-task' })
}

// 获取自动任务状态
export function uiedSeoCenterAutoTaskStatus() {
    return request.get({ url: '/uied/setting/get/seoCenter/auto-task/status' })
}

// 清空日志
export function uiedSeoCenterLogsClear(params: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/logs/clear', params })
}

// 执行失效 URL 扫描
export function uiedSeoCenterScanInvalid(params?: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/scan/invalid', params })
}

// 执行进阶链接检测
export function uiedSeoCenterScanLinkDetector(params?: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/scan/link-detector', params })
}

// 执行图片优化检测
export function uiedSeoCenterScanImageOptimization(params?: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/scan/image-optimization', params })
}

// 获取内部链接建议
export function uiedSeoCenterInternalLinks(params?: any) {
    return request.get({ url: '/uied/setting/get/seoCenter/internal-links', params })
}

// 执行站长平台推送
export function uiedSeoCenterPushPlatform(params: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/push/platform', params })
}

// 执行自动任务
export function uiedSeoCenterAutoTaskRun(params?: any) {
    return request.post({ url: '/uied/setting/save/seoCenter/auto-task/run', params })
}

// 获取站点信息
export function uiedSiteInfo() {
    return request.get({ url: '/uied/setting/siteInfo' })
}

// 保存站点信息
export function uiedSaveSiteInfo(params: any) {
    return request.post({ url: '/uied/setting/saveSiteInfo', params })
}

// 导出后台设置备份
export function uiedSettingBackupExport() {
    return request.get({ url: '/uied/setting/backup/export' })
}

// 导入后台设置备份
export function uiedSettingBackupImport(params: any) {
    return request.post({ url: '/uied/setting/backup/import', params })
}

// 获取公开设置
export function uiedPublicSettings() {
    return request.get({ url: '/uied/setting/public' })
}

// 获取热门文章（Hot）配置
export function uiedHotArticlesConfigGet() {
    return request.get({ url: '/uied/setting/get', params: { key: 'hotArticlesConfig' } })
}

// 保存热门文章（Hot）配置
export function uiedHotArticlesConfigSave(params: any) {
    return request.post({ url: '/uied/setting/save', params: { hotArticlesConfig: params } })
}

// 获取注册/登录/个人中心配置
export function uiedSettingAuthConfigGet() {
    return request.get({ url: '/uied/setting/auth-config' })
}

// 保存注册/登录/个人中心配置
export function uiedSettingAuthConfigUpdate(params: any) {
    return request.post({ url: '/uied/setting/auth-config/update', params })
}

// 获取交付初始化模板目录
export function uiedDeliveryProfileList() {
    return request.get({ url: '/uied/delivery/profile/list' })
}

// 获取交付初始化模板目录管理数据
export function uiedDeliveryProfileManageList() {
    return request.get({ url: '/uied/delivery/profile/manage/list' })
}

// 保存交付初始化模板目录
export function uiedDeliveryProfileSave(params: any) {
    return request.post({ url: '/uied/delivery/profile/save', params })
}

// 交付初始化预览（不落库）
export function uiedDeliveryInitPreview(params?: any) {
    return request.get({ url: '/uied/delivery/init/preview', params })
}

// 执行交付初始化导入
export function uiedDeliveryInitExecute(params: any) {
    return request.post({ url: '/uied/delivery/init/execute', params })
}

// 获取交付发布自检结果
export function uiedDeliveryInitDoctor() {
    return request.get({ url: '/uied/delivery/init/doctor' })
}

// 导出客户交付包
export function uiedDeliveryPackageExport(params?: any) {
    return request.get({ url: '/uied/delivery/package/export', params })
}

// ==================== 升级中心 ====================

// 获取升级中心概览
export function uiedUpgradeOverview() {
    return request.get({ url: '/uied/upgrade/overview' })
}

// 获取升级中心配置
export function uiedUpgradeConfigGet() {
    return request.get({ url: '/uied/upgrade/config/get' })
}

// 保存升级中心配置
export function uiedUpgradeConfigSave(params: any) {
    return request.post({ url: '/uied/upgrade/config/save', params })
}

// 获取服务器升级包列表
export function uiedUpgradeBundleList() {
    return request.get({ url: '/uied/upgrade/bundle/list' })
}

// 获取升级任务列表
export function uiedUpgradeTaskList(params?: any) {
    return request.get({ url: '/uied/upgrade/task/list', params })
}

// 获取升级任务详情
export function uiedUpgradeTaskDetail(params: any) {
    return request.get({ url: '/uied/upgrade/task/detail', params })
}

// 获取升级任务日志
export function uiedUpgradeTaskLog(params: any) {
    return request.get({ url: '/uied/upgrade/task/log', params })
}

// 发起升级任务
export function uiedUpgradeStart(params: any) {
    return request.post({ url: '/uied/upgrade/start', params })
}

// 获取许可证信息
export function uiedLicenseInfo() {
    return request.get({ url: '/uied/license/info' })
}

// 按授权码激活许可证
export function uiedActivateLicenseByKey(params: any) {
    return request.post({ url: '/uied/license/activate', params })
}

// 保存许可证信息
export function uiedSaveLicenseInfo(params: any) {
    return request.post({ url: '/uied/license/save', params })
}

// 获取功能开关列表
export function uiedFeatureList() {
    return request.get({ url: '/uied/feature/list' })
}

// 保存功能开关
export function uiedSaveFeature(params: any) {
    return request.post({ url: '/uied/feature/save', params })
}

// 获取商业版模式配置
export function uiedCommercialModeGet() {
    return request.get({ url: '/uied/commercial/mode/get' })
}

// 保存商业版模式配置
export function uiedCommercialModeSave(params: any) {
    return request.post({ url: '/uied/commercial/mode/save', params })
}

// 获取商业版总览
export function uiedCommercialOverview() {
    return request.get({ url: '/uied/commercial/overview' })
}

// 获取文章公开配置
export function uiedArticleConfig() {
    return request.get({ url: '/uied/setting/articleConfig' })
}

// 保存文章公开配置
export function uiedSaveArticleConfig(params: any) {
    return request.post({ url: '/uied/setting/saveArticleConfig', params })
}

// 获取文章专题配置
export function uiedArticleTopicsConfig() {
    return request.get({ url: '/uied/setting/articleTopicsConfig' })
}

// 保存文章专题配置
export function uiedSaveArticleTopicsConfig(params: any) {
    return request.post({ url: '/uied/setting/saveArticleTopicsConfig', params })
}

// ==================== 导航菜单 ====================

export function uiedNavMenuList(params?: any) {
    return request.get({ url: '/uied/navMenu/list', params })
}

export function uiedNavMenuAll() {
    return request.get({ url: '/uied/navMenu/all' })
}

export function uiedNavMenuDetail(params: any) {
    return request.get({ url: '/uied/navMenu/detail', params })
}

export function uiedNavMenuAdd(params: any) {
    return request.post({ url: '/uied/navMenu/add', params })
}

export function uiedNavMenuEdit(params: any) {
    return request.post({ url: '/uied/navMenu/edit', params })
}

export function uiedNavMenuDelete(params: any) {
    return request.post({ url: '/uied/navMenu/del', params })
}

export function uiedNavMenuSort(params: any) {
    return request.post({ url: '/uied/navMenu/sort', params })
}

// ==================== 友情链接 ====================

export function uiedFriendLinkList(params?: any) {
    return request.get({ url: '/uied/friendLink/list', params })
}

export function uiedFriendLinkDetail(params: any) {
    return request.get({ url: '/uied/friendLink/detail', params })
}

export function uiedFriendLinkAdd(params: any) {
    return request.post({ url: '/uied/friendLink/add', params })
}

export function uiedFriendLinkEdit(params: any) {
    return request.post({ url: '/uied/friendLink/edit', params })
}

export function uiedFriendLinkDelete(params: any) {
    return request.post({ url: '/uied/friendLink/del', params })
}

// ==================== 页脚设置 ====================

export function uiedFooterGroupList(params?: any) {
    return request.get({ url: '/uied/footer/groupList', params })
}

export function uiedFooterGroupAll() {
    return request.get({ url: '/uied/footer/groupAll' })
}

export function uiedFooterGroupAdd(params: any) {
    return request.post({ url: '/uied/footer/groupAdd', params })
}

export function uiedFooterGroupEdit(params: any) {
    return request.post({ url: '/uied/footer/groupEdit', params })
}

export function uiedFooterGroupDelete(params: any) {
    return request.post({ url: '/uied/footer/groupDel', params })
}

export function uiedFooterLinkList(params?: any) {
    return request.get({ url: '/uied/footer/linkList', params })
}

export function uiedFooterLinkAdd(params: any) {
    return request.post({ url: '/uied/footer/linkAdd', params })
}

export function uiedFooterLinkEdit(params: any) {
    return request.post({ url: '/uied/footer/linkEdit', params })
}

export function uiedFooterLinkDelete(params: any) {
    return request.post({ url: '/uied/footer/linkDel', params })
}

export function uiedFooterAboutConfigGet() {
    return request.get({ url: '/uied/setting/get', params: { key: 'footerAboutConfig' } })
}

export function uiedFooterAboutConfigSave(params: any) {
    return request.post({ url: '/uied/setting/save', params: { footerAboutConfig: params } })
}

// ==================== 社交媒体 ====================

export function uiedSocialMediaGroupList(params?: any) {
    return request.get({ url: '/uied/socialMedia/groupList', params })
}

export function uiedSocialMediaGroupAll() {
    return request.get({ url: '/uied/socialMedia/groupAll' })
}

export function uiedSocialMediaGroupAdd(params: any) {
    return request.post({ url: '/uied/socialMedia/groupAdd', params })
}

export function uiedSocialMediaGroupEdit(params: any) {
    return request.post({ url: '/uied/socialMedia/groupEdit', params })
}

export function uiedSocialMediaGroupDelete(params: any) {
    return request.post({ url: '/uied/socialMedia/groupDel', params })
}

export function uiedSocialMediaItemList(params?: any) {
    return request.get({ url: '/uied/socialMedia/itemList', params })
}

export function uiedSocialMediaItemAdd(params: any) {
    return request.post({ url: '/uied/socialMedia/itemAdd', params })
}

export function uiedSocialMediaItemEdit(params: any) {
    return request.post({ url: '/uied/socialMedia/itemEdit', params })
}

export function uiedSocialMediaItemDelete(params: any) {
    return request.post({ url: '/uied/socialMedia/itemDel', params })
}

// ==================== 广告管理 ====================

export function uiedBannerList(params?: any) {
    return request.get({ url: '/uied/banner/list', params })
}

export function uiedBannerDetail(params: any) {
    return request.get({ url: '/uied/banner/detail', params })
}

export function uiedBannerAdd(params: any) {
    return request.post({ url: '/uied/banner/add', params })
}

export function uiedBannerEdit(params: any) {
    return request.post({ url: '/uied/banner/edit', params })
}

export function uiedBannerDelete(params: any) {
    return request.post({ url: '/uied/banner/del', params })
}

// ==================== Favicon API ====================

export function uiedFaviconApiList(params?: any) {
    return request.get({ url: '/uied/faviconApi/list', params })
}

export function uiedFaviconApiDetail(params: any) {
    return request.get({ url: '/uied/faviconApi/detail', params })
}

export function uiedFaviconApiAdd(params: any) {
    return request.post({ url: '/uied/faviconApi/add', params })
}

export function uiedFaviconApiEdit(params: any) {
    return request.post({ url: '/uied/faviconApi/edit', params })
}

export function uiedFaviconApiDelete(params: any) {
    return request.post({ url: '/uied/faviconApi/del', params })
}

export function uiedFaviconApiSetDefault(params: any) {
    return request.post({ url: '/uied/faviconApi/setDefault', params })
}

// ==================== 文章标签管理 ====================

// 文章标签列表（分页）
export function uiedArticleTagList(params?: any) {
    return request.get({ url: '/uied/articleTag/list', params })
}

// 文章标签列表（全部）
export function uiedArticleTagAll() {
    return request.get({ url: '/uied/articleTag/all' })
}

// 添加文章标签
export function uiedArticleTagAdd(params: any) {
    return request.post({ url: '/uied/articleTag/add', params })
}

// 编辑文章标签
export function uiedArticleTagEdit(params: any) {
    return request.post({ url: '/uied/articleTag/edit', params })
}

// 删除文章标签
export function uiedArticleTagDelete(params: any) {
    return request.post({ url: '/uied/articleTag/del', params })
}

// ==================== 文章分类管理 ====================

// 文章分类列表（分页）
export function uiedArticleCategoryList(params?: any) {
    return request.get({ url: '/uied/articleCategory/list', params })
}

// 文章分类列表（全部）
export function uiedArticleCategoryAll() {
    return request.get({ url: '/uied/articleCategory/all' })
}

// 添加文章分类
export function uiedArticleCategoryAdd(params: any) {
    return request.post({ url: '/uied/articleCategory/add', params })
}

// 编辑文章分类
export function uiedArticleCategoryEdit(params: any) {
    return request.post({ url: '/uied/articleCategory/edit', params })
}

// 删除文章分类
export function uiedArticleCategoryDelete(params: any) {
    return request.post({ url: '/uied/articleCategory/del', params })
}

// ==================== 文章批量操作 ====================

// 文章批量状态更新
export function uiedArticleBatchStatus(params: any) {
    return request.post({ url: '/uied/article/batchStatus', params })
}

// 文章批量移动分类/标签
export function uiedArticleBatchMove(params: any) {
    return request.post({ url: '/uied/article/batchMove', params })
}

// 一键清空文章回收站（支持筛选条件）
export function uiedArticleRecycleClear(params?: any) {
    return request.post({ url: '/uied/article/recycle/clear', params: params || {} })
}

// ==================== 评论管理 ====================

// 评论列表
export function uiedCommentList(params?: any) {
    return request.get({ url: '/uied/comment/list', params })
}

// 评论审核通过
export function uiedCommentApprove(params: any) {
    return request.post({ url: '/uied/comment/approve', params })
}

// 评论审核拒绝
export function uiedCommentReject(params: any) {
    return request.post({ url: '/uied/comment/reject', params })
}

// 删除评论
export function uiedCommentDelete(params: any) {
    return request.post({ url: '/uied/comment/del', params })
}

// 待审核评论数量
export function uiedCommentPendingCount() {
    return request.get({ url: '/uied/comment/pendingCount' })
}

// 评论统计
export function uiedCommentStats() {
    return request.get({ url: '/uied/comment/stats' })
}

// ==================== AI 配置管理 ====================

// AI 配置列表
export function uiedAiConfigList() {
    return request.get({ url: '/uied/aiConfig/list' })
}

// AI 配置详情
export function uiedAiConfigDetail(params: any) {
    return request.get({ url: '/uied/aiConfig/get', params })
}

// 添加 AI 配置
export function uiedAiConfigAdd(params: any) {
    return request.post({ url: '/uied/aiConfig/add', params })
}

// 编辑 AI 配置
export function uiedAiConfigEdit(params: any) {
    return request.post({ url: '/uied/aiConfig/edit', params })
}

// 删除 AI 配置
export function uiedAiConfigDelete(params: any) {
    return request.post({ url: '/uied/aiConfig/del', params })
}

// 测试 AI 连接
export function uiedAiConfigTest(params: any) {
    return request.post({ url: '/uied/aiConfig/test', params })
}

// 拉取 AI 可用模型列表（优先远程接口，失败回退预设）
export function uiedAiConfigModels(params: any) {
    return request.post(
        {
            url: '/uied/aiConfig/models',
            params,
            timeout: 30 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// ==================== AI 批量生成 ====================

// 批量生成网站信息
export function uiedAiConfigBatchGenerate(params: any) {
    return request.post({ url: '/uied/aiConfig/batchGenerate', params })
}

// 确认批量生成结果
export function uiedAiConfigBatchConfirm(params: any) {
    return request.post({ url: '/uied/aiConfig/batchConfirm', params })
}

// AI 生成网站详情内容
export function uiedAiGenerateDetailContent(params: any) {
    return request.post({ url: '/uied/aiConfig/generateDetailContent', params })
}

// ==================== AI 使用日志 ====================

// AI 使用日志列表
export function uiedAiUsageLogList(params?: any) {
    return request.get({ url: '/uied/aiUsageLog/list', params })
}

// AI 使用统计
export function uiedAiUsageLogStats() {
    return request.get({ url: '/uied/aiUsageLog/stats' })
}

// ==================== AI 导入配置 ====================

// 获取批量导入 AI 配置（文章/网址）
export function uiedAiImportConfigGet() {
    return request.get({ url: '/uied/aiConfig/importConfig' })
}

// 保存批量导入 AI 配置（文章/网址）
export function uiedAiImportConfigSave(params: any) {
    return request.post({ url: '/uied/aiConfig/saveImportConfig', params })
}

// 获取导入模板库（文章/网址预设）
export function uiedAiImportTemplatePresetsGet() {
    return request.get({ url: '/uied/aiConfig/importTemplatePresets' })
}

// 保存导入模板库（文章/网址预设）
export function uiedAiImportTemplatePresetsSave(params: any) {
    return request.post({ url: '/uied/aiConfig/saveImportTemplatePresets', params })
}

// ==================== AI 功能开关 ====================

// 获取 AI 功能开关
export function uiedAiFeatureToggle() {
    return request.get({ url: '/uied/aiConfig/featureToggle' })
}

// 保存 AI 功能开关
export function uiedAiSaveFeatureToggle(params: any) {
    return request.post({ url: '/uied/aiConfig/saveFeatureToggle', params })
}

// AI 对话（用于编辑器 AI 功能）
export function uiedAiChat(params: any) {
    return request.post(
        {
            url: '/uied/aiConfig/chat',
            params,
            timeout: 90 * 1000
        },
        {
            ignoreCancelToken: true
        }
    )
}

// ==================== SEO 抓取 ====================

// 抓取网站 SEO 信息（含 favicon）
export function uiedSeoScraperFetch(params: any) {
    return request.post({ url: '/uied/seoScraper/fetch', params })
}

// ==================== WordPress 标签/组件配置 ====================

// WordPress 标签列表
export function uiedWordpressTagList(params?: any) {
    return request.get({ url: '/uied/wordpress/tags', params })
}

// WordPress 分类列表
export function uiedWordpressCategoryList(params?: any) {
    return request.get({ url: '/uied/wordpress/categories', params })
}

// 新增 WordPress 分类
export function uiedWordpressCategoryAdd(params: any) {
    return request.post({ url: '/uied/wordpress/categories/add', params })
}

// 编辑 WordPress 分类
export function uiedWordpressCategoryEdit(params: any) {
    return request.post({ url: '/uied/wordpress/categories/edit', params })
}

// 删除 WordPress 分类
export function uiedWordpressCategoryDel(params: any) {
    return request.post({ url: '/uied/wordpress/categories/del', params })
}

// 新增 WordPress 标签
export function uiedWordpressTagAdd(params: any) {
    return request.post({ url: '/uied/wordpress/tags/add', params })
}

// 编辑 WordPress 标签
export function uiedWordpressTagEdit(params: any) {
    return request.post({ url: '/uied/wordpress/tags/edit', params })
}

// 删除 WordPress 标签
export function uiedWordpressTagDel(params: any) {
    return request.post({ url: '/uied/wordpress/tags/del', params })
}

// WordPress 组件列表
export function uiedWordpressWidgetList(params?: any) {
    return request.get({ url: '/uied/wordpress/widgets', params })
}

// 新增 WordPress 组件
export function uiedWordpressWidgetAdd(params: any) {
    return request.post({ url: '/uied/wordpress/widgets/add', params })
}

// 编辑 WordPress 组件
export function uiedWordpressWidgetEdit(params: any) {
    return request.post({ url: '/uied/wordpress/widgets/edit', params })
}

// 删除 WordPress 组件
export function uiedWordpressWidgetDel(params: any) {
    return request.post({ url: '/uied/wordpress/widgets/del', params })
}

// ==================== 每日热榜 ====================

// 获取每日热榜配置
export function uiedDailyHotConfigGet() {
    return request.get({ url: '/uied/dailyHot/config/get' })
}

// 保存每日热榜配置
export function uiedDailyHotConfigSave(params: any) {
    return request.post({ url: '/uied/dailyHot/config/save', params })
}

// 获取热榜平台列表
export function uiedDailyHotPlatforms(params?: any) {
    return request.get({ url: '/uied/dailyHot/platforms', params })
}

// 获取热榜平台配置列表（持久化）
export function uiedDailyHotPlatformConfigList(params?: any) {
    return request.get({ url: '/uied/dailyHot/platformConfig/list', params })
}

// 保存热榜平台配置（支持批量）
export function uiedDailyHotPlatformConfigSave(params: any) {
    return request.post({ url: '/uied/dailyHot/platformConfig/save', params })
}

// 删除热榜平台配置
export function uiedDailyHotPlatformConfigDel(params: any) {
    return request.post({ url: '/uied/dailyHot/platformConfig/del', params })
}

// 获取每日热榜后台字段草案
export function uiedDailyHotSchema() {
    return request.get({ url: '/uied/dailyHot/schema' })
}

// 获取今日热榜聚合数据
export function uiedDailyHotList(params?: any) {
    return request.get({ url: '/uied/dailyHot/list', params })
}

// 刷新今日热榜缓存
export function uiedDailyHotRefresh(params?: any) {
    return request.get({ url: '/uied/dailyHot/refresh', params })
}

// ==================== 榜单系统 ====================

// 获取榜单配置列表
export function uiedRankBoardConfigList(params?: any) {
    return request.get({ url: '/uied/rankBoard/config/list', params })
}

// 保存榜单配置
export function uiedRankBoardConfigSave(params: any) {
    return request.post({ url: '/uied/rankBoard/config/save', params })
}

// 获取榜单聚合结果
export function uiedRankBoardList(params?: any) {
    return request.get({ url: '/uied/rankBoard/list', params })
}

// 预览单个榜单
export function uiedRankBoardPreview(params?: any) {
    return request.get({ url: '/uied/rankBoard/preview', params })
}

// 获取榜单字段草案
export function uiedRankBoardSchema() {
    return request.get({ url: '/uied/rankBoard/schema' })
}

// ==================== 专题页工厂 ====================

// 专题模板列表
export function uiedTopicFactoryTemplateList(params?: any) {
    return request.get({ url: '/uied/topicFactory/template/list', params })
}

// 专题模板详情
export function uiedTopicFactoryTemplateDetail(params?: any) {
    return request.get({ url: '/uied/topicFactory/template/detail', params })
}

// 保存专题模板
export function uiedTopicFactoryTemplateSave(params: any) {
    return request.post({ url: '/uied/topicFactory/template/save', params })
}

// 删除专题模板
export function uiedTopicFactoryTemplateDel(params: any) {
    return request.post({ url: '/uied/topicFactory/template/del', params })
}

// 预览专题创建结果
export function uiedTopicFactoryPreview(params?: any) {
    return request.get({ url: '/uied/topicFactory/preview', params })
}

// 一键创建专题页
export function uiedTopicFactoryCreate(params: any) {
    return request.post({ url: '/uied/topicFactory/createFromTemplate', params })
}

// 获取专题页工厂字段草案
export function uiedTopicFactorySchema() {
    return request.get({ url: '/uied/topicFactory/schema' })
}

// ==================== 投稿激励闭环 ====================

// 获取投稿激励设置
export function uiedContributionSettingsGet() {
    return request.get({ url: '/uied/contribution/settings/get' })
}

// 保存投稿激励设置
export function uiedContributionSettingsSave(params: any) {
    return request.post({ url: '/uied/contribution/settings/save', params })
}

// 获取勋章列表
export function uiedContributionBadgeList(params?: any) {
    return request.get({ url: '/uied/contribution/badge/list', params })
}

// 保存勋章
export function uiedContributionBadgeSave(params: any) {
    return request.post({ url: '/uied/contribution/badge/save', params })
}

// 删除勋章
export function uiedContributionBadgeDel(params: any) {
    return request.post({ url: '/uied/contribution/badge/del', params })
}

// 获取推荐位列表
export function uiedContributionFeaturedList(params?: any) {
    return request.get({ url: '/uied/contribution/featured/list', params })
}

// 保存推荐位
export function uiedContributionFeaturedSave(params: any) {
    return request.post({ url: '/uied/contribution/featured/save', params })
}

// 删除推荐位
export function uiedContributionFeaturedDel(params: any) {
    return request.post({ url: '/uied/contribution/featured/del', params })
}

// 获取激励用户列表
export function uiedContributionUserList(params?: any) {
    return request.get({ url: '/uied/contribution/user/list', params })
}

// 获取激励用户详情
export function uiedContributionUserDetail(params: any) {
    return request.get({ url: '/uied/contribution/user/detail', params })
}

// 获取积分日志
export function uiedContributionLogList(params?: any) {
    return request.get({ url: '/uied/contribution/log/list', params })
}

// 获取排行榜
export function uiedContributionLeaderboard(params?: any) {
    return request.get({ url: '/uied/contribution/leaderboard', params })
}

// 获取字段草案
export function uiedContributionSchema() {
    return request.get({ url: '/uied/contribution/schema' })
}

// ==================== 商业位体系 ====================

// 广告位配置列表
export function uiedCommercialSlotList(params?: any) {
    return request.get({ url: '/uied/commercialSlot/slot/list', params })
}

// 保存广告位配置
export function uiedCommercialSlotSave(params: any) {
    return request.post({ url: '/uied/commercialSlot/slot/save', params })
}

// 删除广告位配置
export function uiedCommercialSlotDel(params: any) {
    return request.post({ url: '/uied/commercialSlot/slot/del', params })
}

// 投放记录列表
export function uiedCommercialBookingList(params?: any) {
    return request.get({ url: '/uied/commercialSlot/booking/list', params })
}

// 保存投放记录
export function uiedCommercialBookingSave(params: any) {
    return request.post({ url: '/uied/commercialSlot/booking/save', params })
}

// 删除投放记录
export function uiedCommercialBookingDel(params: any) {
    return request.post({ url: '/uied/commercialSlot/booking/del', params })
}

// 字段草案
export function uiedCommercialSlotSchema() {
    return request.get({ url: '/uied/commercialSlot/schema' })
}
