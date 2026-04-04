/**
 * 权限控制
 */

import NProgress from 'nprogress'
import router, { findFirstValidRoute } from './router'
import 'nprogress/nprogress.css'
import { isExternal } from './utils/validate'
import useUserStore from './stores/modules/user'
import { INDEX_ROUTE, INDEX_ROUTE_NAME } from './router/routes'
import { PageEnum } from './enums/pageEnum'
import useTabsStore from './stores/modules/multipleTabs'
import { clearAuthInfo } from './utils/auth'
import feedback from './utils/feedback'
import config from './config'
import { uiedLicenseInfo } from '@/api/uied'

// NProgress配置
NProgress.configure({ showSpinner: false })

const loginPath = PageEnum.LOGIN
const defaultPath = PageEnum.INDEX
const licenseCenterPath = '/uied/license-center'
const activationCheckCacheMs = 5000
let lastActivationCheckedAt = 0
let lastActivationState = false
let lastLicenseStatus = ''
let lastLicenseNote = ''
let activationCheckPending: Promise<boolean> | null = null
let lastActivationNoticeAt = 0
// 免登录白名单
const whiteList: string[] = [PageEnum.LOGIN, PageEnum.ERROR_403]

/**
 * 检查当前后台实例是否已激活有效 Pro/Enterprise 授权。
 * 为避免频繁请求，增加短时间缓存与并发复用。
 */
async function ensurePaidLicenseActivated(force = false): Promise<boolean> {
    const now = Date.now()
    if (!force && now - lastActivationCheckedAt < activationCheckCacheMs) {
        return lastActivationState
    }
    if (activationCheckPending) {
        return activationCheckPending
    }
    activationCheckPending = (async () => {
        try {
            const data = await uiedLicenseInfo()
            const activated = data?.isPaidEdition === true && data?.isActive === true
            lastLicenseStatus = String(data?.status || '').trim().toLowerCase()
            lastLicenseNote = String(data?.note || '').trim()
            lastActivationState = activated
            lastActivationCheckedAt = Date.now()
            return activated
        } catch (_error) {
            /**
             * 授权态查询失败时不在路由守卫中阻断，交由接口层统一报错与跳转。
             */
            return true
        } finally {
            activationCheckPending = null
        }
    })()
    return activationCheckPending
}

/**
 * 判断当前路径是否允许在“未激活”状态下访问。
 */
function isActivationAllowedPath(path: string): boolean {
    const normalizedPath = String(path || '').trim()
    if (!normalizedPath) return false
    return (
        normalizedPath === loginPath
        || normalizedPath === PageEnum.ERROR_403
        || normalizedPath === licenseCenterPath
        || normalizedPath.startsWith('/uied/commercial-license/license-center')
    )
}

/**
 * 构建“未激活/已禁用”提示文案，统一引导到 fsuied 官网客服处理。
 */
function buildActivationRedirectNotice(): string {
    if (lastLicenseStatus === 'inactive') {
        if (lastLicenseNote) {
            return `当前授权已被禁用：${lastLicenseNote}。请前往 fsuied.com 联系客服处理后再重新激活。`
        }
        return '当前授权已被禁用。请前往 fsuied.com 联系客服处理后再重新激活。'
    }
    return '当前未激活有效 Pro/Enterprise 授权，请先在授权中心激活；如需协助请前往 fsuied.com 联系客服。'
}

/**
 * 触发未激活跳转时的提醒（节流，避免快速切换菜单重复弹出）。
 */
function notifyActivationRedirect() {
    const now = Date.now()
    if (now - lastActivationNoticeAt < 1500) return
    lastActivationNoticeAt = now
    feedback.msgWarning(buildActivationRedirectNotice())
}

router.beforeEach(async (to, from, next) => {
    // 开始 Progress Bar
    NProgress.start()
    document.title = to.meta.title ?? config.title
    const userStore = useUserStore()
    const tabsStore = useTabsStore()
    if (whiteList.includes(to.path)) {
        // 在免登录白名单，直接进入
        next()
    } else if (userStore.token) {
        // 获取用户信息
        const hasGetUserInfo = Object.keys(userStore.userInfo).length !== 0
        if (hasGetUserInfo) {
            if (to.path === loginPath) {
                next({ path: defaultPath })
            } else {
                const activated = await ensurePaidLicenseActivated()
                if (!activated && !isActivationAllowedPath(to.path)) {
                    notifyActivationRedirect()
                    next({ path: licenseCenterPath, query: { redirect: to.fullPath } })
                    return
                }
                next()
            }
        } else {
            try {
                await userStore.getUserInfo()
                await userStore.getMenu()
                const routes = userStore.routes
                // 找到第一个有效路由
                const routeName = findFirstValidRoute(routes)
                // 没有有效路由跳转到403页面
                if (!routeName) {
                    clearAuthInfo()
                    next(PageEnum.ERROR_403)
                    return
                }
                tabsStore.setRouteName(routeName!)
                INDEX_ROUTE.redirect = { name: routeName }

                // 动态添加index路由
                router.addRoute(INDEX_ROUTE)
                routes.forEach((route: any) => {
                    // https 则不插入
                    if (isExternal(route.path)) {
                        return
                    }
                    if (!route.children) {
                        router.addRoute(INDEX_ROUTE_NAME, route)
                        return
                    }
                    // 动态添加可访问路由表
                    router.addRoute(route)
                })
                const activated = await ensurePaidLicenseActivated(true)
                if (!activated && !isActivationAllowedPath(to.path)) {
                    notifyActivationRedirect()
                    next({ path: licenseCenterPath, query: { redirect: to.fullPath } })
                    return
                }
                next({ ...to, replace: true })
            } catch (err) {
                clearAuthInfo()
                next({ path: loginPath, query: { redirect: to.fullPath } })
            }
        }
    } else {
        next({ path: loginPath, query: { redirect: to.fullPath } })
    }
})

router.afterEach(() => {
    NProgress.done()
})
