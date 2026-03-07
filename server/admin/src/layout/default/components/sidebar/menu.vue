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
 * 展示菜单（未搜索时显示全部，搜索时显示过滤后的树）
 */
const displayRoutes = computed<RouteRecordRaw[]>(() => {
    const routeList = (props.routes || []) as RouteRecordRaw[]
    const keyword = String(menuKeyword.value || '').trim()
    return filterMenuTree(routeList, keyword)
})

/**
 * 计算可见叶子菜单数量，用于顶部状态展示。
 * @param list 当前菜单树
 */
const countVisibleLeafMenus = (list: RouteRecordRaw[] = []): number => {
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
