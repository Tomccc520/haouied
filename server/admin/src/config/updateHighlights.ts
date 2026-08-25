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

export const CURRENT_ADMIN_UPDATE_VERSION = 'v1.1.4'

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
        id: 'delivery-docker-production',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: 'Docker 标准部署',
        description:
            '新增 Egg.js 生产镜像与宝塔一键部署脚本，依赖只在构建镜像时安装，容器重启不再重复 npm install，并自动备份静态文件与容器信息。',
        routePath: '/uied/delivery-init',
        badgePaths: ['/uied/delivery-init'],
        actionText: '查看交付自检'
    },
    {
        id: 'delivery-version-governance',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'delivery',
        title: '版本一致性治理',
        description:
            '新增仓库级 VERSION 唯一版本源，发布体检会同步核对前台、后台、后端、锁文件、部署文档和更新记录，避免客户包版本串线。',
        routePath: '/uied/update-log',
        badgePaths: ['/uied/update-log'],
        actionText: '查看本版记录'
    },
    {
        id: 'seo-incremental-push',
        version: CURRENT_ADMIN_UPDATE_VERSION,
        group: 'operation',
        title: 'SEO 增量推送',
        description:
            '站长平台自动任务使用“最新水位 + 历史回填水位”双游标，优先处理新更新并分批补齐全部历史 URL；平台失败不推进游标。',
        routePath: '/system-setting/base-config/seo-center-config',
        routeQuery: {
            tab: 'autoTask'
        },
        badgePaths: ['/system-setting/base-config/seo-center-config'],
        actionText: '前往 SEO 自动任务'
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
