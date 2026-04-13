<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-13
 */
-->
<template>
    <div class="admin-update-log-page">
        <el-card class="admin-update-log-page__hero !border-none" shadow="never">
            <div class="admin-update-log-page__hero-top">
                <div>
                    <div class="admin-update-log-page__eyebrow">后台更新记录</div>
                    <h1 class="admin-update-log-page__title">v{{ currentVersion }} 本版新增能力</h1>
                    <p class="admin-update-log-page__desc">
                        这里集中列出本版后台新增功能，并提供一键跳转。建议只保留当前主售卖版本重点项，
                        下一版发布时同步替换，避免 NEW 标签长期堆积。
                    </p>
                </div>
                <div class="admin-update-log-page__hero-side">
                    <div class="admin-update-log-page__hero-badge">本版 {{ highlightCount }} 项</div>
                    <div class="admin-update-log-page__hero-tip">当前仅标记本版重点能力</div>
                </div>
            </div>
        </el-card>

        <div class="admin-update-log-page__groups">
            <el-card
                v-for="group in groupedHighlights"
                :key="group.key"
                class="admin-update-log-page__group !border-none"
                shadow="never"
            >
                <template #header>
                    <div class="admin-update-log-page__group-header">
                        <div>
                            <div class="admin-update-log-page__group-title">{{ group.label }}</div>
                            <div class="admin-update-log-page__group-subtitle">
                                {{ group.items.length }} 项可直接跳转
                            </div>
                        </div>
                    </div>
                </template>

                <div class="admin-update-log-page__grid">
                    <div
                        v-for="item in group.items"
                        :key="item.id"
                        class="admin-update-log-page__item"
                    >
                        <div class="admin-update-log-page__item-head">
                            <div class="admin-update-log-page__item-title-row">
                                <h3 class="admin-update-log-page__item-title">{{ item.title }}</h3>
                                <span class="admin-update-log-page__item-badge">新</span>
                            </div>
                            <div class="admin-update-log-page__item-path">
                                {{ buildDisplayPath(item.routePath, item.routeQuery) }}
                            </div>
                        </div>
                        <p class="admin-update-log-page__item-desc">{{ item.description }}</p>
                        <div class="admin-update-log-page__item-actions">
                            <el-button type="primary" plain @click="jumpToHighlight(item)">
                                {{ item.actionText || '立即前往' }}
                            </el-button>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-13
 */
import {
    ADMIN_UPDATE_GROUP_LABELS,
    ADMIN_UPDATE_HIGHLIGHTS,
    ADMIN_UPDATE_HIGHLIGHT_COUNT,
    CURRENT_ADMIN_UPDATE_VERSION,
    type AdminUpdateHighlightItem
} from '@/config/updateHighlights'
import type { LocationQueryRaw } from 'vue-router'

const router = useRouter()

const currentVersion = CURRENT_ADMIN_UPDATE_VERSION
const highlightCount = ADMIN_UPDATE_HIGHLIGHT_COUNT

/**
 * 按业务分组整理后台更新项，便于快速查看当前版本重点。
 */
const groupedHighlights = computed(() => {
    const groupOrder = Object.keys(ADMIN_UPDATE_GROUP_LABELS) as AdminUpdateHighlightItem['group'][]
    return groupOrder
        .map((key) => ({
            key,
            label: ADMIN_UPDATE_GROUP_LABELS[key],
            items: ADMIN_UPDATE_HIGHLIGHTS.filter((item) => item.group === key)
        }))
        .filter((group) => group.items.length > 0)
})

/**
 * 构建可阅读的目标地址：用于在卡片中展示当前功能跳转位置。
 * @param routePath 目标路由路径
 * @param routeQuery 目标查询参数
 */
const buildDisplayPath = (routePath: string, routeQuery?: LocationQueryRaw) => {
    const queryEntries = Object.entries(routeQuery || {})
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(([key, value]) => `${key}=${value}`)
    return queryEntries.length > 0 ? `${routePath}?${queryEntries.join('&')}` : routePath
}

/**
 * 跳转到对应新增功能页。
 * @param item 当前更新项
 */
const jumpToHighlight = (item: AdminUpdateHighlightItem) => {
    router.push({
        path: item.routePath,
        query: item.routeQuery || {}
    })
}
</script>

<style lang="scss" scoped>
.admin-update-log-page {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &__hero {
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
    }

    &__hero-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
    }

    &__eyebrow {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: var(--el-color-primary);
    }

    &__title {
        margin: 0;
        font-size: 28px;
        line-height: 1.2;
        color: #111827;
    }

    &__desc {
        max-width: 760px;
        margin: 12px 0 0;
        font-size: 14px;
        line-height: 1.8;
        color: #4b5563;
    }

    &__hero-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        min-width: 160px;
    }

    &__hero-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.10);
        border: 1px solid rgba(37, 99, 235, 0.14);
    }

    &__hero-tip {
        font-size: 12px;
        color: #6b7280;
    }

    &__groups {
        display: grid;
        gap: 16px;
    }

    &__group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    &__group-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
    }

    &__group-subtitle {
        margin-top: 4px;
        font-size: 12px;
        color: #6b7280;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
    }

    &__item {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 196px;
        padding: 18px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
    }

    &__item-head {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__item-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    &__item-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
    }

    &__item-badge {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.10);
        border: 1px solid rgba(37, 99, 235, 0.14);
    }

    &__item-path {
        font-size: 12px;
        line-height: 1.6;
        color: #2563eb;
        word-break: break-all;
    }

    &__item-desc {
        flex: 1;
        margin: 0;
        font-size: 13px;
        line-height: 1.8;
        color: #4b5563;
    }

    &__item-actions {
        display: flex;
        justify-content: flex-start;
    }
}

@media (max-width: 768px) {
    .admin-update-log-page {
        &__hero-top {
            flex-direction: column;
        }

        &__hero-side {
            align-items: flex-start;
        }

        &__title {
            font-size: 24px;
        }
    }
}
</style>
