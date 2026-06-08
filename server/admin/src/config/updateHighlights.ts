/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-13
 */
import type { LocationQueryRaw } from 'vue-router'

export interface AdminUpdateHighlightItem {
    id: string
    version: string
    group: 'delivery' | 'site' | 'operation' | 'content'
    title: string
    description: string
    routePath: string
    routeQuery?: LocationQueryRaw
    badgePaths: string[]
    actionText?: string
}

export const CURRENT_ADMIN_UPDATE_VERSION = 'v1.1.3'

export const ADMIN_UPDATE_GROUP_LABELS: Record<AdminUpdateHighlightItem['group'], string> = {
    delivery: '交付与授权',
    site: '站点与外观',
    operation: '运营与商业化',
    content: '内容与素材'
}

/**
 * 当前版本后台重点能力清单：
 * 1. 用于侧边栏 NEW 标签
 * 2. 用于工作台 / 后台更新记录页快速跳转
 */
export const ADMIN_UPDATE_HIGHLIGHTS: AdminUpdateHighlightItem[] = [
    {
        id: 'delivery-release-doctor',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: '交付发布自检',
        description:
            '交付初始化向导新增发布自检面板，可检查授权、数据库、上传目录、基础配置与发布文件，减少客户部署排障成本。',
        routePath: '/uied/delivery-init',
        badgePaths: ['/uied/delivery-init'],
        actionText: '前往交付自检'
    },
    {
        id: 'license-center',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: '授权中心',
        description: '新增正式交付所需的授权激活、授权状态查看与后台受限放行入口。',
        routePath: '/uied/license-center',
        badgePaths: ['/uied/license-center'],
        actionText: '前往授权中心'
    },
    {
        id: 'upgrade-center',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: '升级中心',
        description: '支持升级包校验、升级执行与交付升级流程管理，便于售卖版后续升级。',
        routePath: '/system-setting/upgrade-center',
        badgePaths: ['/system-setting/upgrade-center'],
        actionText: '前往升级中心'
    },
    {
        id: 'site-branding',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'site',
        title: '头部品牌显示',
        description: '站点设置新增头部品牌显示模式，可切换图标+文案、仅文案、仅图标。',
        routePath: '/system-setting/base-config/setting',
        routeQuery: {
            tab: 'siteInfo'
        },
        badgePaths: ['/system-setting/base-config/setting'],
        actionText: '前往站点设置'
    },
    {
        id: 'submission-service',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'operation',
        title: '投稿服务配置',
        description: '支持基础收录免费 / 付费模式切换，并统一配置价格、关闭态文案与流程说明。',
        routePath: '/system-setting/base-config/setting',
        routeQuery: {
            tab: 'submissionService'
        },
        badgePaths: ['/system-setting/base-config/setting'],
        actionText: '前往投稿设置'
    },
    {
        id: 'ai-provider-config',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'operation',
        title: 'AI 助手管理',
        description: '增强多模型提供商配置、详情查看与运营配置联动能力。',
        routePath: '/system-setting/base-config/aiConfig',
        badgePaths: ['/system-setting/base-config/aiConfig'],
        actionText: '前往 AI 配置'
    },
    {
        id: 'setting-backup',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: '配置导入导出',
        description: '后台“备份”入口统一收口为配置快照导入导出，减少误解与误操作。',
        routePath: '/setting/system/setting-backup',
        badgePaths: ['/setting/system/setting-backup'],
        actionText: '前往配置导入导出'
    }
]

export const ADMIN_UPDATE_HIGHLIGHT_COUNT = ADMIN_UPDATE_HIGHLIGHTS.length

/**
 * 规范化菜单路径，避免尾部斜杠或空值影响 NEW 命中判断。
 * @param routePath 菜单路径
 */
export const normalizeAdminUpdateRoutePath = (routePath: string): string => {
    const rawPath = String(routePath || '').trim()
    if (!rawPath) return ''
    if (rawPath === '/') return rawPath
    return rawPath.replace(/\/+$/, '')
}

/**
 * 判断某个菜单路径是否需要显示本版 NEW 标识。
 * @param routePath 菜单完整路径
 */
export const isAdminUpdateRoutePath = (routePath: string): boolean => {
    const normalizedPath = normalizeAdminUpdateRoutePath(routePath)
    if (!normalizedPath) return false
    return ADMIN_UPDATE_HIGHLIGHTS.some((item) =>
        item.badgePaths.some((path) => normalizeAdminUpdateRoutePath(path) === normalizedPath)
    )
}
