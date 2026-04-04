import { createRouter, createWebHistory, RouterView, type RouteRecordRaw } from 'vue-router'
import { markRaw } from 'vue'
import { MenuEnum } from '@/enums/appEnums'
import { isExternal } from '@/utils/validate'
import { constantRoutes, INDEX_ROUTE_NAME, LAYOUT } from './routes'
import useUserStore from '@/stores/modules/user'

// 匹配views里面所有的.vue文件，动态引入
const modules = import.meta.glob('/src/views/**/*.vue')
const ROUTER_VIEW_RAW = markRaw(RouterView)

/**
 * 统一内容中心历史菜单路由，避免“热门文章/榜单/每日热榜”在侧边栏重复出现。
 */
function normalizeContentHubLegacyRoute(route: any) {
    const next = { ...(route || {}) }
    const rawPath = String(next.paths || '').trim().replace(/^\/+/, '')
    if (!rawPath) return next

    /**
     * 统一新入口：支持“content-hub-config”历史写法，最终都落到基础配置下的内容中心页。
     */
    if (rawPath === 'content-hub-config') {
        next.paths = 'system-setting/base-config/content-hub'
        next.selected = '/system-setting/base-config/setting'
        return next
    }

    /**
     * 旧入口（每日热榜）兼容并隐藏，避免后台侧边栏重复展示。
     */
    if (rawPath === 'uied/dailyHot' || rawPath.startsWith('uied/dailyHot/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'dailyHot' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }
    if (rawPath === 'daily-hot' || rawPath.startsWith('daily-hot/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'dailyHot' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    /**
     * 旧入口（榜单系统）兼容并隐藏。
     */
    if (rawPath === 'uied/rankBoard' || rawPath.startsWith('uied/rankBoard/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'rankings' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }
    if (rawPath === 'rank-board' || rawPath.startsWith('rank-board/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'rankings' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    /**
     * 旧入口（热门文章）兼容并隐藏。
     */
    if (rawPath === 'system-setting/base-config/hot-articles' || rawPath.startsWith('system-setting/base-config/hot-articles/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'hot' })
        next.menuName = next.menuName || '内容中心配置'
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }
    if (rawPath === 'hot-articles-config' || rawPath.startsWith('hot-articles-config/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'hot' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    if (rawPath === 'settings/hot-articles-config') {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'hot' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    if (rawPath === 'settings/daily-hot-config' || rawPath.startsWith('settings/daily-hot-config/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'dailyHot' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    if (rawPath === 'settings/rank-board-config' || rawPath.startsWith('settings/rank-board-config/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'rankings' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    if (rawPath === 'settings/daily-new-config' || rawPath.startsWith('settings/daily-new-config/')) {
        next.paths = 'system-setting/base-config/content-hub'
        next.params = JSON.stringify({ tab: 'dailyNew' })
        next.isShow = 0
        next.selected = '/system-setting/base-config/content-hub'
        return next
    }

    return next
}

/**
 * 规范化菜单路径，便于做黑名单过滤。
 * @param path 菜单路径
 */
function normalizeMenuPath(path: unknown) {
    return String(path || '').trim().replace(/^\/+/, '').toLowerCase()
}

/**
 * 产品裁剪规则：
 * 1) 屏蔽“用户等级”管理页（/user-center/level）
 * 2) 屏蔽“交付工具/交付初始化”相关菜单
 * 说明：仅影响后台导航与动态路由注入，不会破坏现有后端接口能力。
 * @param route 菜单路由节点
 */
function isMenuRouteBlocked(route: any) {
    const path = normalizeMenuPath(route?.paths)
    const perms = String(route?.perms || '').trim().toLowerCase()
    const blockedPaths = new Set([
        'user-center/level',
        'delivery-center',
        'delivery-tools',
        'uied/delivery-init',
        'delivery-init'
    ])
    const blockedPerms = new Set([
        'user:level:list',
        'uied:delivery:init:index'
    ])
    return blockedPaths.has(path) || blockedPerms.has(perms)
}

//
export function getModulesKey() {
    return Object.keys(modules).map((item) => item.replace('/src/views/', '').replace('.vue', ''))
}

// 过滤路由所需要的数据
export function filterAsyncRoutes(routes: any[], firstRoute = true) {
    const result: RouteRecordRaw[] = []
    routes.forEach((route) => {
        const normalizedRoute = normalizeContentHubLegacyRoute(route)
        if (isMenuRouteBlocked(normalizedRoute)) {
            return
        }
        const routeRecord = createRouteRecord(normalizedRoute, firstRoute)
        if (normalizedRoute.children != null && normalizedRoute.children && normalizedRoute.children.length) {
            routeRecord.children = filterAsyncRoutes(normalizedRoute.children, false)
        }
        result.push(routeRecord)
    })
    return result
}

// 创建一条路由记录
export function createRouteRecord(route: any, firstRoute: boolean): RouteRecordRaw {
    const normalizedRoute = route
    //@ts-ignore
    const routeRecord: RouteRecordRaw = {
        path: isExternal(normalizedRoute.paths)
            ? normalizedRoute.paths
            : firstRoute
                ? `/${normalizedRoute.paths}`
                : normalizedRoute.paths,
        name: Symbol(normalizedRoute.paths),
        meta: {
            hidden: !normalizedRoute.isShow,
            keepAlive: !!normalizedRoute.isCache,
            title: normalizedRoute.menuName,
            perms: normalizedRoute.perms,
            query: normalizedRoute.params,
            icon: normalizedRoute.menuIcon,
            type: normalizedRoute.menuType,
            activeMenu: normalizedRoute.selected
        }
    }
    switch (normalizedRoute.menuType) {
        case MenuEnum.CATALOGUE:
            routeRecord.component = firstRoute ? markRaw(LAYOUT as any) : ROUTER_VIEW_RAW
            if (!normalizedRoute.children) {
                routeRecord.component = ROUTER_VIEW_RAW
            }
            break
        case MenuEnum.MENU:
            routeRecord.component = loadRouteView(normalizedRoute.component)
            break
    }
    return routeRecord
}

// 动态加载组件
export function loadRouteView(component: string) {
    try {
        const key = Object.keys(modules).find((key) => {
            return key.includes(`${component}.vue`)
        })
        if (key) {
            return modules[key]
        }
        throw Error(`找不到组件${component}，请确保组件路径正确`)
    } catch (error) {
        console.error(error)
        return ROUTER_VIEW_RAW
    }
}

// 找到第一个有效的路由
export function findFirstValidRoute(routes: RouteRecordRaw[]): string | undefined {
    for (const route of routes) {
        if (route.meta?.type == MenuEnum.MENU && !route.meta?.hidden && !isExternal(route.path)) {
            return route.name as string
        }
        if (route.children) {
            const name = findFirstValidRoute(route.children)
            if (name) {
                return name
            }
        }
    }
}
//通过权限字符查询路由路径
export function getRoutePath(perms: string) {
    const routerObj = useRouter() || router
    return routerObj.getRoutes().find((item) => item.meta?.perms == perms)?.path || ''
}

// 重置路由
export function resetRouter() {
    router.removeRoute(INDEX_ROUTE_NAME)
    const { routes } = useUserStore()
    routes.forEach((route) => {
        const name = route.name
        if (name && router.hasRoute(name)) {
            router.removeRoute(name)
        }
    })
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: constantRoutes
})

export default router
