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

interface MenuCategoryRule {
    key: string
    keywords: string[]
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
 * 读取菜单节点用于分组识别的文本（标题 + 路径 + 权限标识）。
 * @param item 菜单节点
 */
const getRouteGroupText = (item: RouteRecordRaw) => {
    const title = String(item?.meta?.title || '').toLowerCase()
    const path = String(item?.path || '').toLowerCase()
    const perms = String(item?.meta?.perms || '').toLowerCase()
    return `${title} ${path} ${perms}`.trim()
}

/**
 * 一级菜单分组定义：按业务域拆分，控制每组信息密度，避免导航拥挤。
 */
const MENU_CATEGORY_DEFINITIONS: MenuCategoryDefinition[] = [
    { key: 'workspace', label: '工作中心', icon: 'el-icon-HomeFilled' },
    { key: 'website', label: '网址管理', icon: 'el-icon-Link' },
    { key: 'article', label: '文章管理', icon: 'el-icon-Reading' },
    { key: 'frontend', label: '前端配置', icon: 'el-icon-Monitor' },
    { key: 'operation', label: '运营增长', icon: 'el-icon-DataAnalysis' },
    { key: 'seo', label: 'SEO管理', icon: 'el-icon-DataLine' },
    { key: 'ai', label: 'AI助手', icon: 'el-icon-MagicStick' },
    { key: 'license', label: '商业授权', icon: 'el-icon-Key' },
    { key: 'delivery', label: '交付中心', icon: 'el-icon-Suitcase' },
    { key: 'data', label: '数据中心', icon: 'el-icon-TrendCharts' },
    { key: 'system', label: '系统管理', icon: 'el-icon-Setting' }
]

/**
 * 菜单分组命中规则：按顺序匹配，命中后立即归类。
 */
const MENU_CATEGORY_RULES: MenuCategoryRule[] = [
    { key: 'workspace', keywords: ['工作台', 'workbench', '/workbench'] },
    {
        key: 'ai',
        keywords: ['ai助手', 'ai配置', 'ai模型', 'aiconfig', '/ai', '/uied/aiconfig', 'uied:ai:']
    },
    {
        key: 'seo',
        keywords: [
            'seo',
            'sitemap',
            'robots',
            '重定向',
            '失效',
            '站长',
            '/seo',
            'uied:seo:'
        ]
    },
    {
        key: 'license',
        keywords: ['商业授权', '许可证', 'license', '授权', '/license', 'uied:license:']
    },
    {
        key: 'delivery',
        keywords: ['交付', '安装向导', 'delivery', 'install', '/delivery', '/install']
    },
    {
        key: 'website',
        keywords: [
            '网址',
            '网站',
            '分类',
            '标签',
            '页面',
            '/website',
            '/category',
            '/tag',
            '/page',
            'uied:website:',
            'uied:category:',
            'uied:tag:',
            'uied:page:'
        ]
    },
    {
        key: 'frontend',
        keywords: [
            '前端配置',
            '导航菜单',
            '素材中心',
            '图标库',
            '社交媒体',
            '页脚',
            '友情链接',
            '/navmenu',
            '/social',
            '/footer',
            '/friend',
            '/svg',
            '/material',
            'uied:navmenu:',
            'uied:social:',
            'uied:footer:',
            'uied:friend:',
            'uied:svg:'
        ]
    },
    {
        key: 'article',
        keywords: [
            '文章',
            '评论',
            'wordpress',
            '/article',
            '/comment',
            '/wordpress',
            'uied:article:',
            'uied:comment:'
        ]
    },
    {
        key: 'operation',
        keywords: [
            '运营',
            '热门',
            '推荐',
            '榜单',
            '热榜',
            '投稿',
            '专题',
            'banner',
            'daily',
            'rank',
            'contribution',
            'slot',
            '/hot',
            '/banner',
            '/rank',
            '/topic',
            '/contribution',
            '/submission',
            '/daily',
            'uied:rank',
            'uied:banner',
            'uied:hot',
            'uied:topic',
            'uied:contribution:'
        ]
    },
    {
        key: 'data',
        keywords: [
            '统计',
            '日志',
            '数据',
            'monitor',
            'operationlog',
            '/statistics',
            '/operation-log',
            'uied:statistics:',
            'uied:log:'
        ]
    }
]
const MENU_SECOND_LEVEL_GROUP_ICON: Record<string, string> = {
    workspace: 'el-icon-HomeFilled',
    website: 'el-icon-Link',
    article: 'el-icon-Reading',
    frontend: 'el-icon-Monitor',
    operation: 'el-icon-DataAnalysis',
    seo: 'el-icon-DataLine',
    ai: 'el-icon-MagicStick',
    license: 'el-icon-Key',
    delivery: 'el-icon-Suitcase',
    data: 'el-icon-TrendCharts',
    system: 'el-icon-Setting'
}
const MENU_SECOND_LEVEL_ICON_ALIAS: Record<string, string> = {
    工作台: 'el-icon-HomeFilled',
    网站管理: 'el-icon-Link',
    网址管理: 'el-icon-Link',
    分类管理: 'el-icon-Files',
    标签管理: 'el-icon-Collection',
    页面管理: 'el-icon-Document',
    文章管理: 'el-icon-Reading',
    评论管理: 'el-icon-ChatDotRound',
    前端配置: 'el-icon-Monitor',
    SEO中心: 'el-icon-DataLine',
    SEO设置: 'el-icon-DataLine',
    榜单系统: 'el-icon-Histogram',
    热门推荐: 'el-icon-Star',
    专题工厂: 'el-icon-Management',
    投稿管理: 'el-icon-EditPen',
    导航菜单: 'el-icon-Menu',
    商业授权: 'el-icon-Key',
    交付中心: 'el-icon-Suitcase',
    安装向导: 'el-icon-Tools',
    系统设置: 'el-icon-Setting',
    站点设置: 'el-icon-Setting',
    内容中心配置: 'el-icon-DataAnalysis',
    AI助手管理: 'el-icon-MagicStick',
    AI配置管理: 'el-icon-MagicStick',
    许可证中心: 'el-icon-Key',
    交付初始化: 'el-icon-Suitcase',
    权限管理: 'el-icon-Lock',
    角色管理: 'el-icon-UserFilled',
    菜单管理: 'el-icon-Menu',
    素材中心: 'el-icon-PictureFilled',
    友情链接: 'el-icon-Link',
    社交媒体: 'el-icon-Share',
    页脚配置: 'el-icon-Document',
    内容投稿: 'el-icon-EditPen'
}

/**
 * 二级菜单排序权重：同组内按业务优先级固定排序，避免每次刷新顺序变化。
 */
const MENU_SECOND_LEVEL_ORDER_ALIAS: Record<string, number> = {
    'workspace:工作台': 10,

    'website:网站管理': 10,
    'website:网址管理': 10,
    'website:分类管理': 20,
    'website:标签管理': 30,
    'website:页面管理': 40,

    'article:文章管理': 10,
    'article:评论管理': 20,
    'article:文章分类': 30,
    'article:文章标签': 40,
    'article:文章专题': 50,

    'frontend:前端配置': 10,
    'frontend:导航菜单': 20,
    'frontend:素材中心': 30,
    'frontend:社交媒体': 40,
    'frontend:页脚配置': 50,
    'frontend:友情链接': 60,

    'operation:热门推荐': 10,
    'operation:内容中心配置': 15,
    'operation:榜单系统': 30,
    'operation:专题工厂': 40,
    'operation:投稿管理': 50,
    'operation:商业位体系': 60,
    'operation:数据统计': 70,

    'seo:SEO中心': 10,
    'seo:SEO设置': 20,

    'ai:AI助手管理': 10,
    'ai:AI配置管理': 20,
    'ai:AI配置': 30,
    'ai:AI助手': 40,

    'license:商业授权': 10,
    'license:许可证中心': 20,

    'delivery:交付中心': 10,
    'delivery:交付初始化': 20,
    'delivery:安装向导': 30,

    'data:数据统计': 10,
    'data:操作日志': 20,

    'system:系统设置': 10,
    'system:权限管理': 20,
    'system:角色管理': 30,
    'system:菜单管理': 40,
    'system:管理员': 50
}

/**
 * 判断文本是否包含任一关键字（已统一为小写匹配）。
 * @param source 待匹配文本
 * @param keywords 关键字列表
 */
const hasAnyKeyword = (source: string, keywords: string[]) =>
    keywords.some((keyword) => source.includes(String(keyword || '').toLowerCase()))

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
        metaRecord.icon = 'el-icon-Menu'
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
 * 根据菜单节点标题与路径进行业务归类（细分版）。
 * @param item 一级菜单节点
 */
const classifyTopLevelRoute = (item: RouteRecordRaw): string => {
    const text = getRouteGroupText(item)
    for (const rule of MENU_CATEGORY_RULES) {
        if (hasAnyKeyword(text, rule.keywords)) {
            return rule.key
        }
    }

    return 'system'
}

/**
 * 根据二级菜单标题与分组选择对应图标。
 * @param title 二级菜单标题
 * @param groupKey 一级分组键
 */
const resolveSecondLevelIcon = (title: string, groupKey: string): string => {
    const rawTitle = String(title || '').trim()
    if (rawTitle && MENU_SECOND_LEVEL_ICON_ALIAS[rawTitle]) {
        return MENU_SECOND_LEVEL_ICON_ALIAS[rawTitle]
    }
    return MENU_SECOND_LEVEL_GROUP_ICON[groupKey] || 'el-icon-Menu'
}

/**
 * 计算二级菜单排序权重：先按业务映射，再按标题兜底稳定排序。
 * @param item 二级菜单节点
 * @param groupKey 一级分组键
 */
const resolveSecondLevelSortOrder = (item: RouteRecordRaw, groupKey: string): number => {
    const title = String(item?.meta?.title || '').trim()
    const groupTitleKey = `${groupKey}:${title}`
    if (MENU_SECOND_LEVEL_ORDER_ALIAS[groupTitleKey] !== undefined) {
        return MENU_SECOND_LEVEL_ORDER_ALIAS[groupTitleKey]
    }
    return 9999
}

/**
 * 对同一一级分组下的二级菜单进行稳定排序。
 * @param list 二级菜单列表
 * @param groupKey 一级分组键
 */
const sortSecondLevelRoutes = (list: RouteRecordRaw[], groupKey: string): RouteRecordRaw[] => {
    return [...list].sort((a, b) => {
        const aOrder = resolveSecondLevelSortOrder(a, groupKey)
        const bOrder = resolveSecondLevelSortOrder(b, groupKey)
        if (aOrder !== bOrder) return aOrder - bOrder
        const aTitle = String(a?.meta?.title || '')
        const bTitle = String(b?.meta?.title || '')
        return aTitle.localeCompare(bTitle, 'zh-Hans-CN')
    })
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
 * 构建结构化菜单：按业务分类生成一级目录，二级保留模块，三级保留功能入口。
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
            const groupNode = cloneRouteForMenu(item, 2)
            const groupNodeMeta = getRouteMetaRecord(groupNode)
            groupNodeMeta.icon = resolveSecondLevelIcon(String(groupNodeMeta.title || ''), groupKey)
            const normalizedGroupNode = {
                ...groupNode,
                meta: groupNodeMeta
            } as RouteRecordRaw

            const seenPathSet = new Set(children.map((row: any) => String(row?.path || '').trim()))
            const path = String(normalizedGroupNode?.path || '').trim()
            if (path && !seenPathSet.has(path)) {
                seenPathSet.add(path)
                children.push(normalizedGroupNode)
            } else if (!path) {
                const fallbackPath = resolveMenuNodePath(String(item.path || ''), '')
                if (!fallbackPath || seenPathSet.has(fallbackPath)) return
                normalizedGroupNode.path = fallbackPath
                seenPathSet.add(fallbackPath)
                children.push(normalizedGroupNode)
            }

            bucket.children = children
        })

    MENU_CATEGORY_DEFINITIONS.forEach((definition) => {
        const bucket = rootBuckets.get(definition.key)
        if (!bucket || !Array.isArray(bucket.children)) return
        bucket.children = sortSecondLevelRoutes(
            bucket.children as RouteRecordRaw[],
            definition.key
        )
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
