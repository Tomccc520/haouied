<template>
    <template v-if="shouldRenderRoute">
        <app-link v-if="!hasShowChild" :to="`${routePath}?${queryStr}`">
            <el-menu-item :index="routePath">
                <icon
                    class="menu-item-icon"
                    :size="16"
                    v-if="routeMeta?.icon"
                    :name="routeMeta?.icon"
                />
                <span class="menu-item-title">{{ displayTitle }}</span>
                <span
                    v-if="routeBadgeText"
                    class="menu-item-badge"
                    :class="`menu-item-badge--${routeBadgeMode}`"
                >
                    {{ routeBadgeText }}
                </span>
            </el-menu-item>
        </app-link>
        <el-sub-menu
            v-else
            :index="routePath"
            :popper-class="subMenuPopperClass"
            :teleported="enableHoverFlyout"
            :show-timeout="subMenuShowTimeout"
            :hide-timeout="subMenuHideTimeout"
            :popper-offset="8"
        >
            <template #title>
                <icon
                    class="menu-item-icon"
                    :size="16"
                    v-if="routeMeta?.icon"
                    :name="routeMeta?.icon"
                />
                <span class="menu-item-title">{{ displayTitle }}</span>
                <span
                    v-if="routeBadgeText"
                    class="menu-item-badge"
                    :class="`menu-item-badge--${routeBadgeMode}`"
                >
                    {{ routeBadgeText }}
                </span>
            </template>
            <menu-item
                v-for="item in visibleChildren"
                :key="resolvePath(item.path)"
                :route="item"
                :route-path="resolvePath(item.path)"
                :popper-class="popperClass"
                :depth="nextDepth"
            />
        </el-sub-menu>
    </template>
</template>

<script lang="ts" setup>
import { getNormalPath, objectToQuery } from '@/utils/util'
import { isExternal } from '@/utils/validate'
import type { RouteRecordRaw } from 'vue-router'
import { MenuEnum } from '@/enums/appEnums'
import { isAdminUpdateRoutePath } from '@/config/updateHighlights'
interface Props {
    route: RouteRecordRaw
    routePath: string
    popperClass: string
    depth?: number
}

const props = defineProps<Props>()

/**
 * 二级菜单四字简称映射表：可按业务持续补充，避免直接截断造成语义不清。
 */
const SECOND_LEVEL_TITLE_ALIAS: Record<string, string> = {
    工作台: '工作中心',
    网站管理: '网址管理',
    网址管理: '网址管理',
    分类管理: '分类管理',
    标签管理: '标签管理',
    页面管理: '页面管理',
    文章管理: '文章管理',
    评论管理: '评论管理',
    前端配置: '前端配置',
    SEO中心: '搜索优化',
    SEO设置: '搜索优化',
    站点设置: '站点设置',
    系统设置: '系统设置',
    权限管理: '权限管理',
    角色管理: '角色管理',
    菜单管理: '菜单管理',
    素材中心: '素材中心',
    商业授权: '商业授权',
    授权中心: '授权中心',
    许可证中心: '授权中心',
    交付中心: '交付中心',
    AI助手管理: 'AI助手',
    AI配置管理: 'AI配置',
    热门推荐: '热门推荐',
    榜单系统: '榜单系统',
    专题工厂: '专题工厂',
    投稿管理: '投稿管理',
    导航菜单: '导航菜单',
    MCP中心: 'MCP中心',
    MCP列表: 'MCP列表',
    MCP分类: 'MCP分类',
    MCP标签: 'MCP标签',
    发布MCP: '发布MCP',
    资源管理: '资源管理',
    发布管理: '发布管理'
}

/**
 * 规范化菜单标题为四字风格（仅用于二级菜单展示）。
 * @param title 原始标题
 */
const normalizeSecondLevelTitle = (title: string): string => {
    const rawTitle = String(title || '').trim()
    if (!rawTitle) return ''
    const alias = SECOND_LEVEL_TITLE_ALIAS[rawTitle]
    if (alias) return alias
    const cleanTitle = rawTitle.replace(/\s+/g, '')
    const chars = Array.from(cleanTitle)
    if (chars.length <= 4) return cleanTitle
    return chars.slice(0, 4).join('')
}

/**
 * 可见子菜单列表：统一过滤隐藏路由，避免空目录渲染成可点击菜单项。
 */
const visibleChildren = computed<RouteRecordRaw[]>(() => {
    const children: RouteRecordRaw[] = props.route.children ?? []
    return children.filter((item) => !item.meta?.hidden)
})

const hasShowChild = computed(() => {
    if (menuDepth.value >= 3) return false
    return visibleChildren.value.length > 0
})

const menuDepth = computed(() => Math.max(1, Number(props.depth || 1)))
const nextDepth = computed(() => menuDepth.value + 1)

/**
 * 启用悬浮弹层菜单：
 * - 一级分类保持原交互（点击展开）
 * - 二级菜单改为悬浮弹层
 * - 三级菜单强制收敛为叶子节点，避免四级继续展开
 */
const enableHoverFlyout = computed(() => menuDepth.value >= 2)

/**
 * 计算子菜单弹层类名，便于区分普通子菜单与悬浮子菜单样式。
 */
const subMenuPopperClass = computed(() => {
    const classNames = [String(props.popperClass || '').trim()]
    if (enableHoverFlyout.value) {
        classNames.push('menu-flyout-popper')
    }
    return classNames.filter(Boolean).join(' ')
})

/**
 * 统一子菜单弹层出现延迟：悬浮菜单使用更快的响应，降低操作阻力。
 */
const subMenuShowTimeout = computed(() => (enableHoverFlyout.value ? 80 : 300))

/**
 * 统一子菜单弹层隐藏延迟：略微延后，避免鼠标移动时误收起。
 */
const subMenuHideTimeout = computed(() => (enableHoverFlyout.value ? 120 : 300))

const routeMeta = computed(() => {
    return props.route.meta
})

/**
 * 仅目录类型菜单需要至少一个可见子节点；否则视为空目录并隐藏。
 */
const shouldRenderRoute = computed(() => {
    if (props.route.meta?.hidden) return false
    const isCatalogue = routeMeta.value?.type === MenuEnum.CATALOGUE
    if (isCatalogue && !hasShowChild.value) return false
    return true
})

/**
 * 菜单显示标题：
 * - 一级业务分类保持原文
 * - 二级菜单统一四字简称
 * - 三级功能入口保持原文，避免语义丢失
 */
const displayTitle = computed(() => {
    const rawTitle = String(routeMeta.value?.title || '')
    if (menuDepth.value === 2) {
        return normalizeSecondLevelTitle(rawTitle)
    }
    return rawTitle
})

/**
 * 解析菜单完整路径：兼容绝对路径、外链与多级子菜单递归场景。
 * @param path 当前子节点路径
 * @param basePath 父级完整路径
 */
const resolvePath = (path: string, basePath = props.routePath) => {
    if (isExternal(path)) {
        return path
    }
    if (String(path || '').startsWith('/')) {
        return getNormalPath(path)
    }
    const newPath = getNormalPath(`${basePath}/${path}`)
    return newPath
}

/**
 * 递归判断当前菜单或其子菜单是否命中本版更新。
 * @param route 当前菜单节点
 * @param fullPath 当前菜单完整路径
 */
const hasUpdateHighlight = (route: RouteRecordRaw, fullPath: string): boolean => {
    if (isAdminUpdateRoutePath(fullPath)) return true
    const children: RouteRecordRaw[] = Array.isArray(route.children) ? route.children : []
    return children
        .filter((item) => !item.meta?.hidden)
        .some((item) => hasUpdateHighlight(item, resolvePath(String(item.path || ''), fullPath)))
}

/**
 * 当前菜单是否命中本版更新。
 */
const hasRouteUpdateHighlight = computed(() => hasUpdateHighlight(props.route, props.routePath))

/**
 * 当前菜单标签模式：
 * - 一级菜单显示轻量“新”标签，便于快速感知本版变化入口
 * - 中间目录仅显示轻量圆点，避免层层重复占位
 * - 叶子菜单显示精简“新”标签，定位到具体功能入口
 */
const routeBadgeMode = computed(() => {
    if (!hasRouteUpdateHighlight.value) return 'none'
    if (menuDepth.value === 1) return 'top'
    return hasShowChild.value ? 'dot' : 'pill'
})

/**
 * 当前菜单标签文案：
 * - 一级菜单与叶子入口显示“新”
 * - 中间目录仅保留圆点提示
 */
const routeBadgeText = computed(() => {
    if (!hasRouteUpdateHighlight.value) return ''
    if (menuDepth.value === 1) return '新'
    return hasShowChild.value ? '' : '新'
})

const queryStr = computed<string>(() => {
    const query = props.route.meta?.query as string
    try {
        const queryObj = JSON.parse(query)
        return objectToQuery(queryObj)
    } catch (error) {
        // console.log(error)

        return query
    }
})
</script>
<style lang="scss" scoped>
.el-menu-item,
.el-sub-menu__title {
    .menu-item-title {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .menu-item-badge {
        margin-left: 8px;
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transform: translateY(-1px);
        &--top {
            min-width: 20px;
            height: 18px;
            padding: 0 6px;
            border-radius: 999px;
            font-size: 10px;
            line-height: 1;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #2563eb;
            background: rgba(239, 246, 255, 0.92);
            border: 1px solid rgba(37, 99, 235, 0.14);
        }
        &--pill {
            min-width: 18px;
            height: 18px;
            padding: 0 6px;
            border-radius: 999px;
            font-size: 10px;
            line-height: 1;
            font-weight: 600;
            color: #1d4ed8;
            background: rgba(37, 99, 235, 0.1);
            border: 1px solid rgba(37, 99, 235, 0.14);
        }
        &--dot {
            width: 8px;
            height: 8px;
            margin-right: 2px;
            border-radius: 999px;
            background: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.16);
        }
    }
    .menu-item-icon {
        margin-right: 10px;
        width: var(--el-menu-icon-width);
        text-align: center;
        vertical-align: middle;
        color: var(--admin-sidebar-icon-default-color);
        transition: color 0.2s ease;
    }
    &:hover .menu-item-icon {
        color: var(--admin-sidebar-icon-active-color);
    }
}

.el-menu-item.is-active,
.el-sub-menu.is-active > .el-sub-menu__title {
    .menu-item-icon {
        color: var(--admin-sidebar-icon-active-color);
    }
}

:deep(.menu-flyout-popper.el-menu--popup) {
    min-width: 210px;
    border-radius: 10px;
    padding: 6px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
}

:deep(.menu-flyout-popper.el-menu--popup .el-menu-item),
:deep(.menu-flyout-popper.el-menu--popup .el-sub-menu__title) {
    margin-left: 0;
}

:deep(.el-menu--collapse .menu-item-badge) {
    display: none;
}
</style>
