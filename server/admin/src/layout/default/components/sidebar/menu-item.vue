<template>
    <template v-if="!route.meta?.hidden">
        <app-link v-if="!hasShowChild" :to="`${routePath}?${queryStr}`">
            <el-menu-item :index="routePath">
                <icon
                    class="menu-item-icon"
                    :size="16"
                    v-if="routeMeta?.icon"
                    :name="routeMeta?.icon"
                />
                <template #title>
                    <span>{{ displayTitle }}</span>
                </template>
            </el-menu-item>
        </app-link>
        <el-sub-menu v-else :index="routePath" :popper-class="popperClass">
            <template #title>
                <icon
                    class="menu-item-icon"
                    :size="16"
                    v-if="routeMeta?.icon"
                    :name="routeMeta?.icon"
                />
                <span>{{ displayTitle }}</span>
            </template>
            <menu-item
                v-for="item in route?.children"
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
    交付中心: '交付中心',
    AI助手管理: 'AI助手',
    AI配置管理: 'AI配置',
    热门推荐: '热门推荐',
    榜单系统: '榜单系统',
    专题工厂: '专题工厂',
    投稿管理: '投稿管理',
    导航菜单: '导航菜单'
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

const hasShowChild = computed(() => {
    const children: RouteRecordRaw[] = props.route.children ?? []
    return !!children.filter((item) => !item.meta?.hidden).length
})

const menuDepth = computed(() => Math.max(1, Number(props.depth || 1)))
const nextDepth = computed(() => menuDepth.value + 1)

const routeMeta = computed(() => {
    return props.route.meta
})

/**
 * 菜单显示标题：
 * - 一级业务分类保持原文
 * - 二级菜单统一四字简称
 * - 三级及以下保持原文，避免信息损失
 */
const displayTitle = computed(() => {
    const rawTitle = String(routeMeta.value?.title || '')
    if (menuDepth.value === 2) {
        return normalizeSecondLevelTitle(rawTitle)
    }
    return rawTitle
})

const resolvePath = (path: string) => {
    if (isExternal(path)) {
        return path
    }
    if (String(path || '').startsWith('/')) {
        return getNormalPath(path)
    }
    const newPath = getNormalPath(`${props.routePath}/${path}`)
    return newPath
}
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
</style>
