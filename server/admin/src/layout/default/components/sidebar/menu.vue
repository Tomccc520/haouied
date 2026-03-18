<template>
    <div
        class="menu flex-1 min-h-0"
        :class="themeClass"
        :style="isCollapsed ? '' : `--aside-width: ${width}px`"
    >
        <div v-if="!isCollapsed" class="menu-toolbar">
            <div class="menu-toolbar__meta">
                <span class="menu-toolbar__title">后台导航</span>
                <span class="menu-toolbar__count">{{ displayMenuCount }} 项</span>
            </div>
            <el-input
                v-model.trim="menuKeyword"
                clearable
                size="small"
                placeholder="搜索功能菜单..."
                @keydown.esc="clearMenuKeyword"
            />
        </div>
        <el-scrollbar>
            <div v-if="menuKeyword && displayRoutes.length === 0" class="menu-search-empty">
                未找到匹配功能，请换个关键词试试
            </div>
            <el-menu
                :key="menuRenderKey"
                v-bind="config"
                :default-active="activeMenu"
                :collapse="isCollapsed"
                mode="vertical"
                :unique-opened="uniqueOpened"
                :default-openeds="defaultOpenedMenus"
                @select="$emit('select')"
            >
                <menu-item
                    v-for="route in displayRoutes"
                    :key="route.path"
                    :route="route"
                    :route-path="route.path"
                    :popper-class="themeClass"
                />
            </el-menu>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { getNormalPath } from '@/utils/util'
import { isExternal } from '@/utils/validate'
import MenuItem from './menu-item.vue'
import type { RouteRecordRaw } from 'vue-router'

const props = defineProps({
    routes: {
        type: Object as PropType<RouteRecordRaw[]>
    },
    config: {
        type: Object
    },
    isCollapsed: {
        type: Boolean,
        default: false
    },
    uniqueOpened: {
        type: Boolean,
        default: false
    },
    theme: {
        type: String
    },
    width: {
        type: Number,
        default: 200
    }
})

defineEmits(['select'])

const route = useRoute()
const menuKeyword = ref('')
const activeMenu = computed<string>(() => route.meta?.activeMenu || route.path)
const themeClass = computed(() => `theme-${props.theme}`)

interface MenuCategoryDefinition {
    key: string
    label: string
    icon: string
}

/**
 * 解析菜单节点完整路径：兼容相对路径与外链路径。
 * @param path 当前节点路径
 * @param parentPath 父节点完整路径
 */
const resolveMenuNodePath = (path: string, parentPath = ''): string => {
    const normalizedPath = String(path || '').trim()
    if (!normalizedPath) return parentPath
    if (isExternal(normalizedPath)) return normalizedPath
    if (normalizedPath.startsWith('/')) return getNormalPath(normalizedPath)
    if (!parentPath) return getNormalPath(`/${normalizedPath}`)
    return getNormalPath(`${parentPath}/${normalizedPath}`)
}

/**
 * 判断单个菜单节点是否命中关键词（标题或路径）
 * @param item 菜单路由节点
 * @param keyword 搜索关键词（已转小写）
 */
const isMenuNodeMatched = (item: RouteRecordRaw, keyword: string) => {
    const title = String(item?.meta?.title || '').toLowerCase()
    const path = String(item?.path || '').toLowerCase()
    return title.includes(keyword) || path.includes(keyword)
}

/**
 * 读取菜单节点用于分组识别的文本（标题 + 路径）。
 * @param item 菜单节点
 */
const getRouteGroupText = (item: RouteRecordRaw) => {
    const title = String(item?.meta?.title || '').toLowerCase()
    const path = String(item?.path || '').toLowerCase()
    return `${title} ${path}`.trim()
}

/**
 * 根据菜单节点标题与路径做一级分组归类。
 * @param item 一级菜单节点
 */
const MENU_CATEGORY_DEFINITIONS: MenuCategoryDefinition[] = [
    { key: 'workspace', label: '工作中心', icon: 'el-icon-HomeFilled' },
    { key: 'content', label: '内容生产', icon: 'el-icon-Document' },
    { key: 'growth', label: '运营增长', icon: 'el-icon-DataLine' },
    { key: 'commercial', label: '商业交付', icon: 'el-icon-Suitcase' },
    { key: 'system', label: '系统工具', icon: 'el-icon-Setting' }
]
const MENU_SECOND_LEVEL_DEFAULT_ICON = 'el-icon-Menu'

/**
 * 读取路由元数据并确保为对象，避免直接修改原始响应式对象。
 * @param item 路由节点
 */
const getRouteMetaRecord = (item: RouteRecordRaw): Record<string, any> => {
    const rawMeta = item?.meta as Record<string, any> | undefined
    return rawMeta && typeof rawMeta === 'object' ? { ...rawMeta } : {}
}

/**
 * 深拷贝菜单路由节点，并补齐二级图标默认值，统一视觉风格。
 * @param item 路由节点
 * @param depth 当前树深度（分组根节点为1）
 */
const cloneRouteForMenu = (item: RouteRecordRaw, depth = 1): RouteRecordRaw => {
    const metaRecord = getRouteMetaRecord(item)
    if (depth >= 2 && !String(metaRecord.icon || '').trim()) {
        metaRecord.icon = MENU_SECOND_LEVEL_DEFAULT_ICON
    }

    const nextChildren = Array.isArray(item.children)
        ? (item.children as RouteRecordRaw[])
            .filter((child) => !child?.meta?.hidden)
            .map((child) => cloneRouteForMenu(child, depth + 1))
        : []

    return {
        ...item,
        meta: metaRecord,
        children: nextChildren
    } as RouteRecordRaw
}

/**
 * 根据菜单节点标题与路径进行业务归类。
 * @param item 一级菜单节点
 */
const classifyTopLevelRoute = (item: RouteRecordRaw): string => {
    const text = getRouteGroupText(item)

    if (text.includes('工作台') || text.includes('workbench')) {
        return 'workspace'
    }

    if (
        text.includes('运营') ||
        text.includes('banner') ||
        text.includes('专题') ||
        text.includes('榜单') ||
        text.includes('热榜') ||
        text.includes('推荐') ||
        text.includes('seo') ||
        text.includes('推送') ||
        text.includes('sitemap') ||
        text.includes('robots') ||
        text.includes('重定向') ||
        text.includes('检测') ||
        text.includes('站长')
    ) {
        return 'growth'
    }

    if (
        text.includes('商业') ||
        text.includes('license') ||
        text.includes('授权') ||
        text.includes('交付') ||
        text.includes('install')
    ) {
        return 'commercial'
    }

    if (
        text.includes('系统') ||
        text.includes('权限') ||
        text.includes('角色') ||
        text.includes('菜单') ||
        text.includes('配置') ||
        text.includes('setting') ||
        text.includes('admin') ||
        text.includes('monitor') ||
        text.includes('日志')
    ) {
        return 'system'
    }

    return 'content'
}

/**
 * 递归过滤菜单树：父节点命中或子节点命中时保留
 * @param list 原菜单列表
 * @param keyword 搜索关键词
 */
const filterMenuTree = (list: RouteRecordRaw[] = [], keyword: string): RouteRecordRaw[] => {
    if (!keyword) return list
    const lowerKeyword = keyword.toLowerCase()
    return list.reduce<RouteRecordRaw[]>((acc, item) => {
        if (!item || item.meta?.hidden) return acc
        const children = Array.isArray(item.children) ? item.children : []
        const filteredChildren = filterMenuTree(children as RouteRecordRaw[], lowerKeyword)
        const selfMatched = isMenuNodeMatched(item, lowerKeyword)
        if (!selfMatched && filteredChildren.length === 0) return acc
        acc.push({
            ...item,
            children: filteredChildren
        } as RouteRecordRaw)
        return acc
    }, [])
}

/**
 * 构建结构化菜单：先按业务分类生成一级目录，再挂载原菜单为二级/三级。
 * @param list 原始菜单
 */
const buildStructuredRoutes = (list: RouteRecordRaw[] = []): RouteRecordRaw[] => {
    const rootBuckets = new Map<string, RouteRecordRaw>()

    MENU_CATEGORY_DEFINITIONS.forEach((definition, index) => {
        rootBuckets.set(definition.key, {
            path: `/menu-group-${definition.key}`,
            name: `menu_group_${definition.key}_${index}`,
            meta: {
                title: definition.label,
                icon: definition.icon
            },
            children: []
        } as RouteRecordRaw)
    })

    list
        .filter((item) => item && !item.meta?.hidden)
        .forEach((item) => {
            const groupKey = classifyTopLevelRoute(item)
            const bucket = rootBuckets.get(groupKey)
            if (!bucket) return
            const children = Array.isArray(bucket.children) ? bucket.children : []
            children.push(cloneRouteForMenu(item, 2))
            bucket.children = children
        })

    return MENU_CATEGORY_DEFINITIONS
        .map((definition) => rootBuckets.get(definition.key))
        .filter((item): item is RouteRecordRaw => Boolean(item))
        .filter((item) => Array.isArray(item.children) && item.children.length > 0)
}

/**
 * 展示菜单（先结构化分组，再按关键词过滤）
 */
const displayRoutes = computed<RouteRecordRaw[]>(() => {
    const routeList = (props.routes || []) as RouteRecordRaw[]
    const structuredRoutes = buildStructuredRoutes(routeList)
    const keyword = String(menuKeyword.value || '').trim()
    return filterMenuTree(structuredRoutes, keyword)
})

/**
 * 计算可见叶子菜单数量，用于顶部状态展示。
 * @param list 当前菜单树
 */
function countVisibleLeafMenus(list: RouteRecordRaw[] = []): number {
    return list.reduce((count, item) => {
        if (!item || item.meta?.hidden) return count
        const children = Array.isArray(item.children)
            ? (item.children as RouteRecordRaw[]).filter((child) => !child.meta?.hidden)
            : []
        if (!children.length) return count + 1
        return count + countVisibleLeafMenus(children)
    }, 0)
}

/**
 * 收集搜索命中时需要默认展开的父级菜单路径。
 * @param list 过滤后的菜单树
 * @param parentPath 父级路径
 */
const collectOpenedMenuPaths = (
    list: RouteRecordRaw[] = [],
    parentPath = ''
): string[] => {
    const pathSet = new Set<string>()
    list.forEach((item) => {
        if (!item || item.meta?.hidden) return
        const currentPath = resolveMenuNodePath(String(item.path || ''), parentPath)
        const children = Array.isArray(item.children)
            ? (item.children as RouteRecordRaw[]).filter((child) => !child.meta?.hidden)
            : []
        if (children.length > 0 && currentPath) {
            pathSet.add(currentPath)
            collectOpenedMenuPaths(children, currentPath).forEach((path) => pathSet.add(path))
        }
    })
    return Array.from(pathSet)
}

/**
 * 清空菜单关键词输入（支持 ESC 快捷键）。
 */
const clearMenuKeyword = () => {
    menuKeyword.value = ''
}

/**
 * 顶部菜单数量统计。
 */
const displayMenuCount = computed(() => countVisibleLeafMenus(displayRoutes.value))

/**
 * 搜索态自动展开父菜单，减少二次点击层级。
 */
const defaultOpenedMenus = computed<string[]>(() => {
    if (props.isCollapsed) return []
    const keyword = String(menuKeyword.value || '').trim()
    if (!keyword) return []
    return collectOpenedMenuPaths(displayRoutes.value)
})

/**
 * 搜索关键词变化时重建菜单实例，确保 default-openeds 立即生效。
 */
const menuRenderKey = computed(() => {
    const keyword = String(menuKeyword.value || '').trim()
    return keyword ? `menu-search-${keyword}` : 'menu-default'
})
</script>

<style lang="scss" scoped>
.menu {
    .menu-toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 10px 10px 8px;
        border-bottom: 1px solid var(--admin-sidebar-border-color);
        background: var(--admin-sidebar-toolbar-bg);
        backdrop-filter: blur(10px);
        .menu-toolbar__meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .menu-toolbar__title {
            font-size: 12px;
            font-weight: 600;
            color: var(--el-text-color-secondary);
            letter-spacing: 0.4px;
        }
        .menu-toolbar__count {
            padding: 0 8px;
            line-height: 20px;
            font-size: 12px;
            border-radius: 999px;
            background: var(--admin-sidebar-count-bg);
            color: var(--admin-sidebar-count-color);
        }
        :deep(.el-input__wrapper) {
            border-radius: var(--admin-sidebar-item-radius);
        }
    }
    .menu-search-empty {
        margin: 10px 10px 0;
        padding: 10px 12px;
        border-radius: var(--admin-sidebar-item-radius);
        font-size: 12px;
        color: var(--admin-sidebar-search-empty-color);
        background: var(--admin-sidebar-search-empty-bg);
        border: 1px dashed var(--admin-sidebar-search-empty-border-color);
    }
    :deep(.el-scrollbar__view) {
        min-height: 100%;
    }
    :deep(.el-menu) {
        padding: 8px;
    }
    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
        height: var(--admin-sidebar-item-height);
        line-height: var(--admin-sidebar-item-height);
        margin-bottom: 2px;
        border-radius: var(--admin-sidebar-item-radius);
        border-right: 2px solid transparent;
        transition: color 0.2s ease, background-color 0.2s ease;
    }
    :deep(.el-menu-item.is-active),
    :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
        font-weight: 600;
    }
    :deep(.el-sub-menu .el-menu-item) {
        margin-left: 6px;
    }
    :deep(.el-menu-item:focus-visible),
    :deep(.el-sub-menu__title:focus-visible) {
        outline: 2px solid var(--admin-sidebar-focus-ring-color);
        outline-offset: 1px;
    }
    &.theme-light {
        :deep(.el-menu) {
            .el-menu-item {
                border-color: transparent;
            }
            .el-menu-item:hover,
            .el-sub-menu__title:hover {
                color: var(--admin-sidebar-hover-text-color);
                background: var(--admin-sidebar-item-hover-bg);
            }
        }
    }
    .el-menu {
        border-right: none;
        &:not(.el-menu--collapse) {
            width: var(--aside-width);
        }
    }
    :deep(.el-menu--collapse) {
        .el-menu-item,
        .el-sub-menu__title {
            margin-left: 0;
            margin-right: 0;
            justify-content: center;
        }
    }
}
</style>
