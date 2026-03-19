<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-19
-->
<template>
    <div class="uied-sidebar-config-page">
        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="sidebar-config-header">
                    <div>
                        <h2 class="sidebar-config-title">侧边栏配置</h2>
                        <p class="sidebar-config-desc">
                            统一管理文章详情与网址详情侧边栏，采用同一套命名与交互：启用侧栏、侧栏吸顶、吸顶偏移、链接新开窗口、模块顺序。
                        </p>
                    </div>
                </div>
            </template>

            <el-tabs v-model="activeTab" class="sidebar-config-tabs">
                <el-tab-pane label="文章详情侧栏" name="article" />
                <el-tab-pane label="网址详情侧栏" name="website" />
            </el-tabs>

            <div v-show="activeTab === 'article'" class="sidebar-config-section">
                <el-form :model="articleConfig" label-width="150px" class="max-w-[860px]">
                    <el-form-item label="启用侧栏">
                        <el-switch v-model="articleConfig.detailSidebarEnabled" />
                    </el-form-item>

                    <el-form-item label="侧栏吸顶">
                        <el-switch
                            v-model="articleConfig.detailSidebarSticky"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="吸顶偏移">
                        <el-input-number
                            v-model="articleConfig.detailSidebarTopOffset"
                            :min="0"
                            :max="240"
                            :disabled="
                                !articleConfig.detailSidebarEnabled ||
                                !articleConfig.detailSidebarSticky
                            "
                        />
                        <span class="ml-2 text-xs text-[#909399]">px</span>
                    </el-form-item>

                    <el-form-item label="链接新开窗口">
                        <el-switch
                            v-model="articleConfig.detailSidebarLinksNewWindow"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="最新文章标题">
                        <el-input
                            v-model="articleConfig.detailSidebarLatestArticlesTitle"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="最新文章数量">
                        <el-input-number
                            v-model="articleConfig.detailSidebarLatestArticlesCount"
                            :min="1"
                            :max="20"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="热门网址标题">
                        <el-input
                            v-model="articleConfig.detailSidebarHotWebsitesTitle"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="热门网址数量">
                        <el-input-number
                            v-model="articleConfig.detailSidebarHotWebsitesCount"
                            :min="1"
                            :max="20"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-form-item label="标签标题">
                        <el-input
                            v-model="articleConfig.detailSidebarTagsTitle"
                            :disabled="!articleConfig.detailSidebarEnabled"
                        />
                    </el-form-item>

                    <el-divider content-position="left">模块顺序与开关</el-divider>
                    <div class="config-table-wrap">
                        <el-table
                            :data="articleConfig.detailSidebarModules"
                            row-key="key"
                            border
                            size="small"
                            style="width: 100%"
                        >
                            <el-table-column label="排序" width="68" align="center">
                                <template #default="{ $index }">
                                    <span>{{ $index + 1 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="模块名称" prop="name" min-width="140" />
                            <el-table-column label="模块标识" prop="key" min-width="140" />
                            <el-table-column label="说明" min-width="220">
                                <template #default="{ row }">
                                    <span>{{ getArticleSidebarModuleDesc(row.key) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="启用" width="88" align="center">
                                <template #default="{ row }">
                                    <el-switch
                                        v-model="row.enabled"
                                        :disabled="!articleConfig.detailSidebarEnabled"
                                    />
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="120" align="center">
                                <template #default="{ $index }">
                                    <div class="sort-actions">
                                        <el-button
                                            type="primary"
                                            link
                                            :disabled="
                                                $index === 0 ||
                                                !articleConfig.detailSidebarEnabled
                                            "
                                            @click="moveItemUp(articleConfig.detailSidebarModules, $index)"
                                        >
                                            上移
                                        </el-button>
                                        <el-button
                                            type="primary"
                                            link
                                            :disabled="
                                                $index ===
                                                    articleConfig.detailSidebarModules.length - 1 ||
                                                !articleConfig.detailSidebarEnabled
                                            "
                                            @click="
                                                moveItemDown(articleConfig.detailSidebarModules, $index)
                                            "
                                        >
                                            下移
                                        </el-button>
                                    </div>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>

                    <el-form-item>
                        <el-button
                            type="primary"
                            :loading="savingArticle"
                            @click="handleSaveArticleSidebar"
                        >
                            保存文章侧栏配置
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>

            <div v-show="activeTab === 'website'" class="sidebar-config-section">
                <el-form :model="detailConfig" label-width="150px" class="max-w-[860px]">
                    <el-form-item label="启用侧栏">
                        <el-switch v-model="detailConfig.enabled" />
                    </el-form-item>

                    <el-form-item label="侧栏吸顶">
                        <el-switch v-model="detailConfig.sidebarSticky" :disabled="!detailConfig.enabled" />
                    </el-form-item>

                    <el-form-item label="吸顶偏移">
                        <el-input-number
                            v-model="detailConfig.sidebarTopOffset"
                            :min="0"
                            :max="240"
                            :disabled="!detailConfig.enabled || !detailConfig.sidebarSticky"
                        />
                        <span class="ml-2 text-xs text-[#909399]">px</span>
                    </el-form-item>

                    <el-form-item label="链接新开窗口">
                        <el-switch v-model="detailConfig.sidebarLinksNewWindow" :disabled="!detailConfig.enabled" />
                    </el-form-item>

                    <el-form-item label="相关推荐标题">
                        <el-input
                            v-model="detailConfig.relatedTitle"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('related')"
                        />
                    </el-form-item>

                    <el-form-item label="相关推荐数量">
                        <el-input-number
                            v-model="detailConfig.relatedCount"
                            :min="1"
                            :max="20"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('related')"
                        />
                    </el-form-item>

                    <el-form-item label="热门网址标题">
                        <el-input
                            v-model="detailConfig.hotWebsitesTitle"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('hot_websites')"
                        />
                    </el-form-item>

                    <el-form-item label="热门网址数量">
                        <el-input-number
                            v-model="detailConfig.hotWebsitesCount"
                            :min="1"
                            :max="20"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('hot_websites')"
                        />
                    </el-form-item>

                    <el-form-item label="推荐文章标题">
                        <el-input
                            v-model="detailConfig.articlesTitle"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('articles')"
                        />
                    </el-form-item>

                    <el-form-item label="推荐文章数量">
                        <el-input-number
                            v-model="detailConfig.articlesCount"
                            :min="1"
                            :max="20"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('articles')"
                        />
                    </el-form-item>

                    <el-form-item label="标签标题">
                        <el-input
                            v-model="detailConfig.tagsTitle"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('tags')"
                        />
                    </el-form-item>

                    <el-form-item label="分类标题">
                        <el-input
                            v-model="detailConfig.categoryTitle"
                            :disabled="!detailConfig.enabled || !isWebsiteSidebarModuleEnabled('category')"
                        />
                    </el-form-item>

                    <el-divider content-position="left">模块顺序与开关</el-divider>
                    <div class="config-table-wrap">
                        <el-table
                            :data="detailConfig.sidebarModules"
                            row-key="key"
                            border
                            size="small"
                            style="width: 100%"
                        >
                            <el-table-column label="排序" width="68" align="center">
                                <template #default="{ $index }">
                                    <span>{{ $index + 1 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="模块名称" prop="name" min-width="140" />
                            <el-table-column label="模块标识" prop="key" min-width="140" />
                            <el-table-column label="说明" min-width="220">
                                <template #default="{ row }">
                                    <span>{{ getWebsiteSidebarModuleDesc(row.key) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="启用" width="88" align="center">
                                <template #default="{ row }">
                                    <el-switch v-model="row.enabled" :disabled="!detailConfig.enabled" />
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="120" align="center">
                                <template #default="{ $index }">
                                    <div class="sort-actions">
                                        <el-button
                                            type="primary"
                                            link
                                            :disabled="$index === 0 || !detailConfig.enabled"
                                            @click="moveItemUp(detailConfig.sidebarModules, $index)"
                                        >
                                            上移
                                        </el-button>
                                        <el-button
                                            type="primary"
                                            link
                                            :disabled="
                                                $index === detailConfig.sidebarModules.length - 1 ||
                                                !detailConfig.enabled
                                            "
                                            @click="moveItemDown(detailConfig.sidebarModules, $index)"
                                        >
                                            下移
                                        </el-button>
                                    </div>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>

                    <el-form-item>
                        <el-button
                            type="primary"
                            :loading="savingWebsite"
                            @click="handleSaveWebsiteSidebar"
                        >
                            保存网址侧栏配置
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedSidebarConfig">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-19
 */
import { onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import {
    uiedArticleConfig,
    uiedSaveArticleConfig,
    uiedSettingGet,
    uiedSettingSave
} from '@/api/uied'

interface SidebarModuleItem {
    key: string
    name: string
    enabled: boolean
    sort: number
}

const ARTICLE_SIDEBAR_DEFAULT_MODULES: SidebarModuleItem[] = [
    { key: 'latest_articles', name: '最新文章', enabled: true, sort: 1 },
    { key: 'hot_websites', name: '热门网址', enabled: true, sort: 2 },
    { key: 'article_tags', name: '文章标签', enabled: true, sort: 3 }
]

const WEBSITE_SIDEBAR_DEFAULT_MODULES: SidebarModuleItem[] = [
    { key: 'info', name: '网站信息', enabled: true, sort: 1 },
    { key: 'category', name: '分类', enabled: true, sort: 2 },
    { key: 'related', name: '相关推荐', enabled: true, sort: 3 },
    { key: 'hot_websites', name: '热门网址', enabled: true, sort: 4 },
    { key: 'articles', name: '推荐文章', enabled: true, sort: 5 },
    { key: 'tags', name: '标签', enabled: true, sort: 6 },
    { key: 'qrcode', name: '二维码', enabled: false, sort: 7 },
    { key: 'ad', name: '广告位', enabled: false, sort: 8 }
]

const activeTab = ref<'article' | 'website'>('article')
const savingArticle = ref(false)
const savingWebsite = ref(false)

const articleConfig = reactive<Record<string, any>>({
    enabled: true,
    homeSectionEnabled: true,
    homeSectionTitle: '设计文章',
    homeSectionSubtitle: '汇聚优质设计文章，分享前沿设计趋势与实战经验',
    homeSectionLimit: 12,
    listPageTitle: '设计专栏',
    listPageDescription: '汇聚优质设计文章，分享前沿设计趋势、实战技巧与行业洞察',
    listPageCoverImage: '',
    detailLayoutWidthMode: 'contained',
    detailContentMaxWidth: 880,
    detailHeaderAlign: 'center',
    detailSidebarEnabled: true,
    detailSidebarSticky: true,
    detailSidebarTopOffset: 16,
    detailSidebarLinksNewWindow: false,
    detailSidebarLatestArticlesTitle: '最新文章',
    detailSidebarLatestArticlesCount: 6,
    detailSidebarHotWebsitesTitle: '热门网址',
    detailSidebarHotWebsitesCount: 6,
    detailSidebarTagsTitle: '文章标签',
    detailSidebarModules: ARTICLE_SIDEBAR_DEFAULT_MODULES.map((item) => ({ ...item })),
    commentsEnabled: true,
    topicsEnabled: true
})

const detailConfig = reactive<Record<string, any>>({
    enabled: true,
    relatedTitle: '你可能还喜欢',
    relatedCount: 6,
    relatedMode: 'same_category',
    manualWebsiteIds: '',
    hotWebsitesTitle: '热门网址',
    hotWebsitesCount: 6,
    articlesTitle: '推荐文章',
    articlesCount: 5,
    tagsTitle: '深入探索',
    tagSource: 'website',
    manualTags: '',
    categoryTitle: '相关分类',
    sidebarSticky: true,
    sidebarTopOffset: 16,
    sidebarLinksNewWindow: false,
    sidebarAdSlotKey: 'website_detail_sidebar',
    sidebarModules: WEBSITE_SIDEBAR_DEFAULT_MODULES.map((item) => ({ ...item }))
})

/**
 * 规范化模块顺序，保证 sort 字段稳定递增。
 */
const normalizeSidebarModules = (list: unknown): SidebarModuleItem[] => {
    const rows = Array.isArray(list) ? (list as SidebarModuleItem[]) : []
    return rows
        .filter((item) => String(item?.key || '').trim())
        .map((item, index) => ({
            key: String(item.key || '').trim(),
            name: String(item.name || item.key || '').trim() || String(item.key || ''),
            enabled: item.enabled !== false,
            sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : index + 1
        }))
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: index + 1 }))
}

/**
 * 合并默认模块，确保旧配置升级后仍保留新增模块。
 */
const mergeModulesWithDefaults = (
    list: unknown,
    defaults: SidebarModuleItem[]
): SidebarModuleItem[] => {
    const normalizedList = normalizeSidebarModules(list)
    const keySet = new Set(normalizedList.map((item) => item.key))
    const merged = [ ...normalizedList ]
    defaults.forEach((item) => {
        if (!keySet.has(item.key)) {
            merged.push({ ...item })
        }
    })
    return normalizeSidebarModules(merged)
}

/**
 * 通用上移操作（用于模块顺序调整）。
 */
const moveItemUp = (list: SidebarModuleItem[], index: number) => {
    if (!Array.isArray(list) || index <= 0) return
    const temp = list[index]
    list[index] = list[index - 1]
    list[index - 1] = temp
    const normalized = normalizeSidebarModules(list)
    normalized.forEach((item, idx) => {
        list[idx] = item
    })
}

/**
 * 通用下移操作（用于模块顺序调整）。
 */
const moveItemDown = (list: SidebarModuleItem[], index: number) => {
    if (!Array.isArray(list) || index < 0 || index >= list.length - 1) return
    const temp = list[index]
    list[index] = list[index + 1]
    list[index + 1] = temp
    const normalized = normalizeSidebarModules(list)
    normalized.forEach((item, idx) => {
        list[idx] = item
    })
}

/**
 * 获取文章侧栏模块说明文案。
 */
const getArticleSidebarModuleDesc = (key: string): string => {
    const map: Record<string, string> = {
        latest_articles: '展示最近发布的文章列表',
        hot_websites: '展示热门网址推荐列表',
        article_tags: '展示当前文章的标签集合'
    }
    return map[String(key || '')] || '自定义模块'
}

/**
 * 获取网址侧栏模块说明文案。
 */
const getWebsiteSidebarModuleDesc = (key: string): string => {
    const map: Record<string, string> = {
        info: '网站信息区块（名称/链接/基础信息）',
        category: '分类与父分类引导区块',
        related: '相关推荐网站列表',
        hot_websites: '热门网址推荐列表',
        articles: '文章推荐列表',
        tags: '标签聚合区块',
        qrcode: '二维码区块（预留）',
        ad: '广告位区块'
    }
    return map[String(key || '')] || '自定义模块'
}

/**
 * 判断网址侧栏模块是否开启（用于控制标题与数量输入框可编辑状态）。
 */
const isWebsiteSidebarModuleEnabled = (moduleKey: string): boolean => {
    const list = Array.isArray(detailConfig.sidebarModules)
        ? (detailConfig.sidebarModules as SidebarModuleItem[])
        : []
    const target = list.find((item) => String(item?.key || '') === String(moduleKey || ''))
    return target ? target.enabled !== false : true
}

/**
 * 读取文章侧栏配置（包含完整 articleConfig，避免局部保存覆盖其他字段）。
 */
const loadArticleSidebarConfig = async () => {
    const data = await uiedArticleConfig()
    Object.assign(articleConfig, {
        ...articleConfig,
        ...(data || {})
    })
    articleConfig.detailSidebarModules = mergeModulesWithDefaults(
        articleConfig.detailSidebarModules,
        ARTICLE_SIDEBAR_DEFAULT_MODULES
    )
}

/**
 * 读取网址侧栏配置（基于 detailPageConfig 全量对象，保证保存时不丢字段）。
 */
const loadWebsiteSidebarConfig = async () => {
    const data = await uiedSettingGet({ key: 'detailPageConfig' })
    Object.assign(detailConfig, {
        ...detailConfig,
        ...(data || {})
    })
    detailConfig.sidebarModules = mergeModulesWithDefaults(
        detailConfig.sidebarModules,
        WEBSITE_SIDEBAR_DEFAULT_MODULES
    )
}

/**
 * 保存文章侧栏配置。
 */
const handleSaveArticleSidebar = async () => {
    savingArticle.value = true
    try {
        articleConfig.detailSidebarModules = mergeModulesWithDefaults(
            articleConfig.detailSidebarModules,
            ARTICLE_SIDEBAR_DEFAULT_MODULES
        )
        await uiedSaveArticleConfig({ ...articleConfig })
        feedback.msgSuccess('文章侧栏配置保存成功')
        await loadArticleSidebarConfig()
    } finally {
        savingArticle.value = false
    }
}

/**
 * 保存网址侧栏配置。
 */
const handleSaveWebsiteSidebar = async () => {
    savingWebsite.value = true
    try {
        detailConfig.sidebarModules = mergeModulesWithDefaults(
            detailConfig.sidebarModules,
            WEBSITE_SIDEBAR_DEFAULT_MODULES
        )
        await uiedSettingSave({ detailPageConfig: { ...detailConfig } })
        feedback.msgSuccess('网址侧栏配置保存成功')
        await loadWebsiteSidebarConfig()
    } finally {
        savingWebsite.value = false
    }
}

/**
 * 页面初始化：并行加载文章侧栏与网址侧栏配置。
 */
const initializePage = async () => {
    await Promise.all([loadArticleSidebarConfig(), loadWebsiteSidebarConfig()])
}

onMounted(() => {
    initializePage()
})
</script>

<style scoped>
.sidebar-config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sidebar-config-title {
    margin: 0;
    font-size: 18px;
    color: var(--el-text-color-primary);
}

.sidebar-config-desc {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    line-height: 1.7;
}

.sidebar-config-tabs {
    margin-bottom: 12px;
}

.sidebar-config-section {
    animation: fadeInSection 0.18s ease;
}

.config-table-wrap {
    margin-bottom: 12px;
}

.sort-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

@keyframes fadeInSection {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
